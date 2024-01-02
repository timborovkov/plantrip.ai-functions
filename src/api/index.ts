import express from "express";

import MessageResponse from "../interfaces/MessageResponse";
import plan from "./plan";
import destinationDetails from "./destinationDetails";
import activities from "./activities";

import huggingface from "./huggingface";

const router = express.Router();

router.get<{}, MessageResponse>("/", (req, res) => {
  res.json({
    message: "API - 👋🌎🌍🌏",
  });
});

router.use("/plan", plan);
router.use("/destination-details", destinationDetails);
router.use("/activities", activities);

router.use("/huggingface", huggingface);

export default router;
