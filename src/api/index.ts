import express from "express";

import MessageResponse from "../interfaces/MessageResponse";
import emojis from "./emojis";
import protectedRoute from "./protected-route";

const router = express.Router();

router.get<{}, MessageResponse>("/", (req, res) => {
  res.json({
    message: "API - 👋🌎🌍🌏",
  });
});

router.use("/emojis", emojis);
router.use("/protected-route", protectedRoute);

export default router;
