import "dotenv/config";
import express, { Request, Response } from "express";
import prisma from "../utils/prisma";

import removeUngeneratedPlans from "../crons/removeUngeneratedPlans";
import removeTripsWithoutPlans from "../crons/removeTripsWithoutPlans";
import removeUngeneratedDestinations from "../crons/removeUngeneratedDestinations";

const router = express.Router();

router.get("/run-crons", async (req: Request, res: Response) => {
  try {
    console.log("Received a request to clean up...");

    await removeUngeneratedPlans();
    console.log("Removed ungenerated plans");
    await removeTripsWithoutPlans();
    console.log("Removed trips without plans");
    await removeUngeneratedDestinations();
    console.log("Removed ungenerated destinations");

    res.status(200).json({
      response: "Done",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      response: "Something went wrong",
    });
    return;
  }
});

router.get("/delete-trip", async (req: Request, res: Response) => {
  try {
    console.log("Deleting trip by ID");
    res.status(200).json({
      response: "Done",
    });

    const tripID = Number(req.query.tripID);
    if (!tripID) {
      console.log("No trip ID");
      return;
    }

    const tripWithPlans = await prisma.trip.findUnique({
      where: {
        id: tripID,
      },
      include: {
        plan: true,
      },
    });

    if (!tripWithPlans || !tripWithPlans.plan) {
      console.log("Trip not found");
      return;
    }

    const plansToRemove = [tripWithPlans.plan];

    if (plansToRemove.length === 0) {
      console.log("No ungenerated plans to remove.");
      return;
    }

    const planDaysToRemove = await prisma.planDay.findMany({
      where: {
        planId: { in: plansToRemove.map((a) => a.id) },
      },
      select: { id: true },
    });

    const planDaySectionsToRemove =
      planDaysToRemove.length > 0
        ? await prisma.planDaySections.findMany({
            where: {
              planDayId: { in: planDaysToRemove.map((a) => a.id) },
            },
            select: { id: true },
          })
        : [];

    const planDaySectionDetailsToRemove =
      planDaySectionsToRemove.length > 0
        ? await prisma.planDaySectionDetails.findMany({
            where: {
              planDaySectionsId: {
                in: planDaySectionsToRemove.map((a) => a.id),
              },
            },
            select: { id: true },
          })
        : [];

    await prisma.$transaction([
      prisma.planDaySectionDetails.deleteMany({
        where: { id: { in: planDaySectionDetailsToRemove.map((a) => a.id) } },
      }),
      prisma.planDaySections.deleteMany({
        where: { id: { in: planDaySectionsToRemove.map((a) => a.id) } },
      }),
      prisma.planDay.deleteMany({
        where: { id: { in: planDaysToRemove.map((a) => a.id) } },
      }),
      prisma.plan.deleteMany({
        where: { id: { in: plansToRemove.map((a) => a.id) } },
      }),
      prisma.trip.deleteMany({
        where: { id: tripID },
      }),
    ]);

    console.log("Trip " + tripID + " fully removed");
  } catch (error) {
    console.error(error);
    res.status(500).json({
      response: "Something went wrong",
    });
    return;
  }
});

export default router;
