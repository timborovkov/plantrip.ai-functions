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
    const apiKey = process.env.API_KEY ?? "";
    const key = req.headers.authorization;
    if ((key === undefined && key === undefined) || key !== apiKey) {
      res.status(401).json({ error: "not signed in" });
      return;
    }
  }
);

export default router;
