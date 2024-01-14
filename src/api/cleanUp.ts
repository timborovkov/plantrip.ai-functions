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

export default router;
