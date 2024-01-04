import "dotenv/config";
import express, { Request, Response } from "express";
import prisma from "../utils/prisma";
import openai from "../utils/openai";
import { createOrUpdateDestination } from "../utils/destination/createOrUpdateDestination";
import addActivitiesToDestination from "../utils/destination/addActivitiesToDestination";

const router = express.Router();

type TravelPlanResponseData = {
  response: string;
  tripId?: number;
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

    try {
      /*
        Steps:
        1. Data gathering
            1.1 Get activities and sights for the requested destination
            1.2 Get possible hotels for the requested destination
            1.3 Get restaurants and places to eat for the requested destination
        2. Combine all of the results in a LLM readable text format
        3. Send the results and plan query to the LLM engine to get an outline of the trip
        4. Loop through trip days
            3.1 Provide the LLM with the "outline" fetched in the previous step
            3.2 Gather all of the days in to a single response
        5. Get a summary of the trip from the LLM based on the fully generated plan
        */

      const theDestination = await createOrUpdateDestination(
        destination,
        destinationPlace
      );
      if (theDestination) {
        // Add activities to destination
        const theActivities = await addActivitiesToDestination(
          destinationPlace,
          theDestination
        );
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({
        response: "Error",
      });
      return;
    }

    res.status(200).json({
      response: "Done",
    });
  }
);

export default router;
