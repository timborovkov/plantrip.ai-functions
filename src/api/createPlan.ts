import "dotenv/config";
import express, { Request, Response } from "express";

import { createOrUpdateDestination } from "../utils/destination/createOrUpdateDestination";
import addActivitiesToDestination from "../utils/destination/addActivitiesToDestination";
import addHotelsToDestination from "../utils/destination/addHotelsToDestination";
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

const tripTypes = [
  "luxury",
  "romantic",
  "general",
  "adventure",
  "family",
  "solo",
  "business",
  "backpacking",
  "cultural",
  "food",
  "beach",
  "nature",
  "sports",
  "budget",
];

const durationTypes = [
  "1 day",
  "2 days",
  "3 days",
  "4 days",
  "5 days",
  "6 days",
  "7 days",
  "8 days",
  "9 days",
  "10 days",
  "2 weeks",
  "3 weeks",
  "1 month",
];

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

    if (!tripTypes.includes(tripType) || !durationTypes.includes(duration)) {
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
        throw new Error("Failed to create/get destination");
      }

      // Add activities and hotels to destination
      const theActivities = await addActivitiesToDestination(
        destinationPlace,
        theDestination
      );
      const theHotels = await addHotelsToDestination(
        destinationPlace,
        theDestination
      );
      if (!theActivities || !theHotels) {
        throw new Error("Failed to create/get activities and hotels");
      }

      // Aggregate all properties in to a single array of strings
      const properties = [];
      if (tripType && tripType !== "") {
        properties.push(`Trip Type: ${tripType}`);
      }
      if (destination && destination !== "") {
        properties.push(`Destination: ${destination}`);
      }
      if (duration && duration !== "") {
        properties.push(`Duration: ${duration}`);
      }
      if (tripBudget && tripBudget !== "") {
        properties.push(`Trip Budget: ${tripBudget}`);
      }
      if (accommodationBooking && accommodationBooking !== "") {
        properties.push(`Booked Acommodation: ${accommodationBooking}`);
      }
      if (travelersCount !== 1) {
        properties.push(`Travelers Count: ${travelersCount}`);
      }
      if (specialRequests && specialRequests !== "") {
        properties.push(`Special Requests: ${specialRequests}`);
      }

      // Generate the plan content using the LLM
      const planOutline = await getPlanOutline({
        properties,
        destination,
        theActivities,
      });
      const planSummary = await getPlanSummaryUsingOutline({
        planOutline: planOutline,
      });
      const getDayByDayPlan = await getDayByDayPlanUsingOutline({
        planOutline,
        durationInDays: tripDurationDays,
        properties,
      });

      // Create everything in the database
      await prisma.plan.update({
        where: {
          id: newPlan.id,
        },
        data: {
          generated: true,
          content: planOutline,
          summary: planSummary,
          PlanDay: {
            create: getDayByDayPlan.map((day, i) => {
              const dayNumber = i + 1;
              const sections = day.map((part) => ({
                title: part.title,
                planDaySectionDetails: {
                  create: part.sections.map((a) => ({
                    content: a,
                  })),
                },
              }));
              return {
                day: dayNumber,
                PlanDaySections: {
                  create: sections,
                },
              };
            }),
          },
        },
      });

      // Plan generation fully complete
      console.log(
        "Plan generation fully complete! 🎉 \n Plan ID: " + newPlan.id
      );
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
