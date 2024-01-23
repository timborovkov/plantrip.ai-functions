import prisma from "../utils/prisma";
import { ClerkExpressWithAuth, WithAuthProp } from "@clerk/clerk-sdk-node";
import express, { Request, Response } from "express";
import { getUserFromRequest } from "../utils/getUserFromRequest";

const router = express.Router();

router.get(
  "/",
  ClerkExpressWithAuth({}),
  async (req: WithAuthProp<Request>, res: Response) => {
    try {
      // Get User
      const { prismaUser, response } = await getUserFromRequest(req);
      if (!prismaUser) {
        res.status(401).json({ response: response ?? "Unauthorized" });
        return;
      }
      // Get user's trips and plans
      const trips = await prisma.trip.findMany({
        where: {
          userId: prismaUser.id,
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
    } catch (error) {
      throw error;
    }
  }
);

export default router;
