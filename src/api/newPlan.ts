import "dotenv/config";
import express, { Request, Response } from "express";

import { createOrUpdateDestination } from "../utils/destination/createOrUpdateDestination";
import addActivitiesToDestination from "../utils/destination/addActivitiesToDestination";
import addHotelsToDestination from "../utils/destination/addHotelsToDestination";
import getPlanOutline from "../utils/llmRequests/getPlanOutline";
import getPlanSummaryUsingOutline from "../utils/llmRequests/getPlanSummaryUsingOutline";
import getDayByDayPlanUsingOutline from "../utils/llmRequests/getDayByDayPlanUsingOutline";

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
        // Add hotels to destination
        const theHotels = await addHotelsToDestination(
          destinationPlace,
          theDestination
        );
        if (theActivities && theHotels) {
          // Build an LLM readable query
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
        }
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
