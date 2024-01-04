import "dotenv/config";
import express, { Request, Response } from "express";
import prisma from "../utils/prisma";
import addActivitiesToDestination from "../utils/destination/addActivitiesToDestination";
import addClimateDataToDestination from "../utils/destination/addClimateDataToDestination";
import addCostOfLivingToDestination from "../utils/destination/addCostOfLivingToDestination";
import addDescriptionToDestination from "../utils/destination/addDescriptionToDestination";
import addImagesToDestionation from "../utils/destination/addImagesToDestination";

const router = express.Router();

type DestinationDetailsResponse = {
  response: string;
};

router.get(
  "/",
  async (req: Request, res: Response<DestinationDetailsResponse>) => {
    try {
      // Verify API key
      const apiKey = process.env.API_KEY ?? "";
      const key = req.headers.authorization;
      if ((key === undefined && key === undefined) || key !== apiKey) {
        res.status(401).json({ response: "not signed in" });
        return;
      }

      // Verify tripid
      const { tripid } = req.query;
      const tripId = typeof tripid === "string" ? parseInt(tripid) : null;
      if (!tripId) {
        res.status(400).json({ response: "missing tripid" });
        return;
      }

      // Retrieve the plan using the trip ID
      const plan = await prisma.plan.findFirst({
        where: {
          trips: {
            some: {
              id: tripId,
            },
          },
        },
        include: {
          planDestination: {
            include: {
              DestinationImage: true,
            },
          },
        },
      });
      if (!plan) {
        res.status(500).json({
          response: "Plan not found",
        });
        return;
      }

      // Get destination
      if (!plan.planDestination) {
        res.status(500).json({
          response: "Destination not found",
        });
        return;
      }

      // Return the response
      res.status(200).json({
        response: "ok",
      });

      const destination = plan.planDestination;
      await Promise.all([
        async () => {
          await addActivitiesToDestination(
            JSON.parse(destination.google_place_results),
            destination
          );
        },
        async () => {
          await addClimateDataToDestination(destination);
        },
        async () => {
          await addCostOfLivingToDestination(destination);
        },
        async () => {
          await addDescriptionToDestination(destination);
        },
        async () => {
          await addImagesToDestionation(destination);
        },
      ]);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        response: "Internal server error",
      });
    }
  }
);

export default router;
