import "dotenv/config";
import express, { Request, Response } from "express";
import prisma from "../utils/prisma";
import openai from "../utils/openai";
import { createOrUpdateDestination } from "../utils/createOrUpdateDestination";
import { parsePlanItemsFromHTML } from "../utils/parsePlanItemsFromHTML";
import { generateHTMLTable } from "../utils/generateHtmlTable";

const router = express.Router();

type TravelPlanResponseData = {
  response?: string;
  html?: string;
  tripId?: number;
  planId?: number;
  destinationId?: number;
  summary?: string;
};

type TravelPlanRequest = {
  destination: string;
  duration: string;
  tripType: string;
  destinationPlace: string;
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

router.get<{}, TravelPlanResponseData>(
  "/",
  async (req: Request, res: Response) => {
    // Verify API key
    const apiKey = process.env.API_KEY ?? "";
    const key = req.headers.authorization;
    if ((key === undefined && key === undefined) || key !== apiKey) {
      res.status(401).json({ error: "not signed in" });
      return;
    }

    // Verify request body
    const {
      destination,
      duration,
      tripType,
      destinationPlace,
    }: TravelPlanRequest = req.body;
    if (!destination || !duration || !tripType || !destinationPlace) {
      res.status(400).json({ response: "Missing required parameters" });
      return;
    }

    if (!tripTypes.includes(tripType) || !durationTypes.includes(duration)) {
      res.status(400).json({ response: "Invalid required parameters" });
      return;
    }

    // Convert destinationPlace in to object
    const googlePlace: google.maps.GeocoderResult =
      JSON.parse(destinationPlace);

    // Get adittional request parameters
    const tripBudget = req.body.tripBudget ?? "";
    const accommodationBooking = req.body.accommodationBooking ?? "";
    const travelersCount = req.body.travelersCount ?? 1;
    const specialRequests = req.body.specialRequests ?? "";

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
        planId: existingPlan.id,
      });
      // Handle destination
      await createOrUpdateDestination(destination, googlePlace, existingPlan);
    } else {
      // Create new plan
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

        // Create a trip instance
        const trip = await prisma.trip.create({
          data: {
            title: `${tripType} trip to ${destination} for ${duration}`,
            notes: "",
            userId: null,
            planId: newPlan.id,
          },
        });

        // Return response
        res.status(200).json({
          response: "ok",
          tripId: trip.id,
          planId: newPlan.id,
        });

        // Create an empty array to store the properties
        const properties = [];

        // Add properties to the array if they are not empty
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

        // Combine the properties into the final prompt
        const prompt = `Plan a ${properties.join(
          ", "
        )} trip. Provide a day-by-day itinerary of activities, attractions, hotel, dining and lunch options. Include information about museums, parks, and local events. Put the notes and hotel recommendation at the end.`;

        // Get trip plan
        const apiResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo", // Model maximum tokens: 4097
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0, // randomness
          max_tokens: 3597,
        });

        const responseText =
          apiResponse.choices[0].message?.content?.trim() ||
          "No recommendations found.";

        // Get summary
        const apiSummaryResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo", // Model maximum tokens: 4097
          messages: [
            {
              role: "system",
              content: responseText,
            },
            {
              role: "user",
              content:
                "Write a summary of the trip, 3-4 sentences. Make it sound like a human writen promotional text.",
            },
          ],
          temperature: 0.1, // randomness
          max_tokens: 500,
        });

        const summaryResponseText =
          apiSummaryResponse.choices[0].message?.content?.trim() ||
          "No summary found.";

        // Update plan in the database
        await prisma.plan.update({
          where: {
            id: newPlan.id,
          },
          data: {
            destination: destination,
            duration: duration,
            type: tripType,
            content: responseText,
            summary: summaryResponseText,
            tripBudget: tripBudget,
            accommodationBooking: accommodationBooking,
            travelersCount: travelersCount,
            specialRequests: specialRequests,
          },
        });

        // Parse data in to plan items
        const planHTML = generateHTMLTable(responseText);
        const planData = parsePlanItemsFromHTML(planHTML);
        for (const dayData of planData) {
          const { day, sections } = dayData;

          // Create PlanDay
          await prisma.planDay.create({
            data: {
              day: parseInt(day.split(" ")[1]), // Extract day number from "Day X" string
              planId: newPlan.id,
              PlanDaySections: {
                create: sections.map((sectionData) => {
                  const sectionDetails = sectionData.sections.map(
                    (content) => ({
                      content,
                    })
                  );

                  return {
                    title: sectionData.title,
                    planDaySectionDetails: {
                      create: sectionDetails,
                    },
                  };
                }),
              },
            },
          });
        }

        // Handle destination
        await createOrUpdateDestination(destination, googlePlace, newPlan);
      } catch (error) {
        console.error("Something went wrong", error);
        res.status(500).json({ response: "Error querying AI engine" });
      }
    }
  }
);

export default router;
