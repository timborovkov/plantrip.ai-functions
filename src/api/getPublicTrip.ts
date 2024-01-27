import prisma from "../utils/prisma";
import express, { Request, Response } from "express";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const tripID = parseInt(req.query.id as string);
    if (tripID) {
      // Get user's trips and plans
      const trips = await prisma.trip.findMany({
        where: {
          id: tripID,
          isPublic: true,
          hidden: false,
        },
        select: {
          id: true,
          title: true,
          plan: {
            select: {
              summary: true,
              destination: true,
              planDestination: {
                select: {
                  image: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!trips) {
        res.status(200).json({
          response: "ok",
          trips: [],
        });
        return;
      }

      res.status(200).json({
        response: "ok",
        trips: [...trips],
      });
    } else {
      // Get user's trips and plans
      const trips = await prisma.trip.findMany({
        where: {
          isPublic: true,
          hidden: false,
        },
        select: {
          id: true,
          title: true,
          plan: {
            select: {
              summary: true,
              destination: true,
              planDestination: {
                select: {
                  image: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!trips) {
        res.status(200).json({
          response: "ok",
          trips: [],
        });
        return;
      }

      res.status(200).json({
        response: "ok",
        trips: [...trips],
      });
    }
  } catch (error) {
    throw error;
  }
});

export default router;
