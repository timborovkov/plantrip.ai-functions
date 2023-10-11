import express from "express";

import MessageResponse from "../interfaces/MessageResponse";
import plan from "./plan";
import destinationDetails from "./destinationDetails";

const router = express.Router();

router.get<{}, MessageResponse>("/", (req, res) => {
  res.json({
    message: "API - 👋🌎🌍🌏",
  });
});

router.use("/plan", plan);
router.use("/destination-details", destinationDetails);

export default router;
