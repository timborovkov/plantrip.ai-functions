import express from "express";

import MessageResponse from "../interfaces/MessageResponse";
import createPlan from "./createPlan";
import cleanUp from "./cleanUp";

const router = express.Router();

router.get<{}, MessageResponse>("/", (req, res) => {
  res.json({
    message: "API - 👋🌎🌍🌏",
  });
});

router.use("/create-plan", createPlan);
router.use("/clean-up", cleanUp);

export default router;
