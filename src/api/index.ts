import express from "express";

import MessageResponse from "../interfaces/MessageResponse";
import createPlan from "./createPlan";

const router = express.Router();

router.get<{}, MessageResponse>("/", (req, res) => {
  res.json({
    message: "API - 👋🌎🌍🌏",
  });
});

router.use("/create-plan", createPlan);

export default router;
