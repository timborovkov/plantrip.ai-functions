import "dotenv/config";
import express, { Request, Response } from "express";

import { createOrUpdateDestination } from "../utils/destination/createOrUpdateDestination";
import getPlanOutline from "../utils/llmRequests/getPlanOutline";
import getPlanSummaryUsingOutline from "../utils/llmRequests/getPlanSummaryUsingOutline";
import getDayByDayPlanUsingOutline from "../utils/llmRequests/getDayByDayPlanUsingOutline";
import prisma from "../utils/prisma";
import connectPlanToDestination from "../utils/destination/connectPlanToDestination";

const router = express.Router();

type TravelPlanResponseData = {
  response: string;
  planId?: number;
};

type TravelPlanRequest = {
  destination: string;
  duration: string;
  tripType: string;
  destinationPlace: google.maps.GeocoderResult;
  tripBudget: string;
  accommodationBooking: string;
  travelersCount: number;
  specialRequests: string;
};

const durationTypesInDays = (duration: string) => {
  const durationParts = duration.split(" ");
  const value = parseInt(durationParts[0]);
  const unit = durationParts[1];

  if (unit === "day" || unit === "days") {
    return value;
  } else if (unit === "week" || unit === "weeks") {
    return value * 7;
  } else if (unit === "month" || unit === "months") {
    return value * 30;
  } else {
    return 0; // Invalid duration type
  }
};

router.post(
  "/",
  async (
    req: Request<TravelPlanRequest>,
    res: Response<TravelPlanResponseData>
  ) => {
    console.log("Received a request to generate a plan...");
    console.log("The request: ");
    console.log(JSON.stringify(req.body));

    // Verify request body
    const {
      destination,
      duration,
      tripType,
      destinationPlace,
    }: TravelPlanRequest = req.body;
    if (!destination || !duration || !tripType) {
      res.status(400).json({ response: "Missing required parameters" });
      return;
    }

    if (typeof tripType !== "string" || typeof duration !== "string") {
      res.status(400).json({ response: "Invalid required parameters" });
      return;
    }

    // Get adittional request parameters
    const tripBudget = req.body.tripBudget ?? "";
    const accommodationBooking = req.body.accommodationBooking ?? "";
    const travelersCount = req.body.travelersCount ?? 1;
    const specialRequests = req.body.specialRequests ?? "";
    const tripDurationDays = durationTypesInDays(duration);

    // Check if plan already exists in the database
    const existingPlan = await prisma.plan.findFirst({
      where: {
        destination: destination,
        duration: duration,
        type: tripType,
        tripBudget: tripBudget,
        accommodationBooking: accommodationBooking,
        travelersCount: travelersCount,
        specialRequests: specialRequests,
      },
    });

    if (existingPlan) {
      console.log("Plan already exists");
      // Send API response
      res.status(200).json({
        response: "ok",
        planId: existingPlan.id,
      });
      // Handle destination
      if (destinationPlace && !existingPlan.planDestinationId) {
        const theDestination = await createOrUpdateDestination(
          destination,
          destinationPlace
        );
        await connectPlanToDestination(theDestination, existingPlan);
      }
      return true;
    }

    // No existing plan, generate a new one
    console.log("Plan not created yet");
    try {
      // Create a plan instance
      const newPlan = await prisma.plan.create({
        data: {
          destination: destination,
          duration: duration,
          type: tripType,
          content: "",
          summary: "",
          tripBudget: tripBudget,
          accommodationBooking: accommodationBooking,
          travelersCount: travelersCount,
          specialRequests: specialRequests,
        },
      });

      // Return response from API
      console.log("New plan ID: " + newPlan.id);
      res.status(200).json({
        response: "ok",
        planId: newPlan.id,
      });

      // Connect destination to the plan
      const theDestination = await createOrUpdateDestination(
        destination,
        destinationPlace
      );
      if (!theDestination) {
        console.error("Failed to create/get destination");
        return false;
      }
      await connectPlanToDestination(theDestination, newPlan);

      // Add activities and hotels to destination
      const theActivities = theDestination.Activities;
      const theHotels = theDestination.Hotels;
      if (!theActivities || !theHotels) {
        console.error("Failed to create/get activities and hotels");
        return false;
      }

      // Aggregate all properties in to a single array of strings
      const properties = [];
      if (destination && destination !== "") {
        properties.push(`Destination: ${destination}`);
      }
      if (duration && duration !== "") {
        properties.push(`Duration: ${duration}`);
      }
      if (tripBudget && tripBudget !== "" && tripBudget !== "0 USD") {
        // Extract the numerical value from the tripBudget string
        const numericalValue = parseFloat(tripBudget.replace(/[^0-9.]/g, ""));

        // Check if the numerical value is greater than 100
        if (!isNaN(numericalValue) && numericalValue > 100) {
          properties.push(`Trip budget: ${tripBudget}`);
        }
      }
      if (accommodationBooking && accommodationBooking !== "") {
        properties.push(`Booked acommodation: ${accommodationBooking}`);
      }
      if (travelersCount !== 1) {
        properties.push(`Travelers count: ${travelersCount}`);
      }
      if (specialRequests && specialRequests !== "") {
        properties.push(`Special requests: ${specialRequests}`);
      }
      if (tripType && tripType !== "") {
        properties.push(`Trip tags: ${tripType}`);
      }

      // Generate the plan content using the LLM
      const planOutline = await getPlanOutline({
        properties,
        destination,
        theActivities,
      });
      console.log("Created plan outline");
      const planSummary = await getPlanSummaryUsingOutline({
        planOutline: planOutline,
      });
      console.log("Created plan summary");
      const getDayByDayPlan = await getDayByDayPlanUsingOutline({
        planOutline,
        durationInDays: tripDurationDays,
        properties,
      });
      console.log("Created day by day plan");

      // Create everything in the database

      // Start a transaction
      const result = await prisma.$transaction(
        async (prisma) => {
          try {
            // Step 1: Update the Plan record
            const updatedPlan = await prisma.plan.update({
              where: {
                id: newPlan.id,
              },
              data: {
                generated: true,
                content: planOutline,
                summary: planSummary,
              },
            });

            // Step 2 and 3: Create PlanDay records and their nested data
            for (const [i, day] of getDayByDayPlan.entries()) {
              const dayNumber = i + 1;

              const planDay = await prisma.planDay.create({
                data: {
                  day: dayNumber,
                  planId: updatedPlan.id, // Reference to the Plan record
                },
              });

              const planDaySections = [];
              for (let i = 0; i < day.length; i++) {
                const part = day[i];
                const planDaySectionDetails = await Promise.all(
                  part.content.map((detail) =>
                    prisma.planDaySectionDetails.create({
                      data: {
                        content: detail,
                      },
                    })
                  )
                );
                planDaySections.push({
                  title: part.title,
                  places: JSON.stringify(part.places ?? "[]"),
                  planDayId: planDay.id,
                  planDaySectionDetails: {
                    connect: planDaySectionDetails.map((a) => ({ id: a.id })),
                  },
                });
              }
              const createdSections = await Promise.all(
                planDaySections.map((section) =>
                  prisma.planDaySections.create({ data: section })
                )
              );
            }

            return updatedPlan;
          } catch (error) {
            console.error(error);
            return null;
          }
        },
        {
          maxWait: 5000, // default: 2000
          timeout: 10000, // default: 5000
        }
      );

      // Check the result
      if (result) {
        // Plan generation fully complete
        console.log(
          "Plan generation fully complete! 🎉 \n Plan ID: " + newPlan.id
        );
      } else {
        console.log("Plan save transaction failed, no data was saved.");
      }

      return true;
    } catch (error) {
      console.error(error);
      res.status(500).json({
        response: "Something went wrong",
      });
      return;
    }
  }
);

export default router;
