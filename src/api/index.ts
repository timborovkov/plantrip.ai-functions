import express, { Request, Response } from "express";

import MessageResponse from "../interfaces/MessageResponse";
import createPlan from "./createPlan";
import cleanUp from "./cleanUp";
import getUserTrips from "./getUserTrips";

const router = express.Router();

router.get<{}, MessageResponse>("/", (req, res) => {
  res.json({
    message: "API - 👋🌎🌍🌏",
  });
});

router.use("/create-plan", createPlan);
router.use("/clean-up", cleanUp);
router.use("/user", getUserTrips);

router.use((err: any, req: Request, res: Response, next: any) => {
  console.error(err.stack ?? err);
  res.status(401).send("Unauthenticated!");
});

export default router;
