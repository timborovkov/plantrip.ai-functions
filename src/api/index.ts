import express from "express";

import MessageResponse from "../interfaces/MessageResponse";
import destinationDetails from "./destinationDetails";
import createPlan from "./createPlan";

const router = express.Router();

router.get<{}, MessageResponse>("/", (req, res) => {
  res.json({
    message: "API - 👋🌎🌍🌏",
  });
});

router.use("/destination-details", destinationDetails);
router.use("/createPlan", createPlan);

export default router;
