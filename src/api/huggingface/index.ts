import "dotenv/config";
import express, { Request, Response } from "express";
import { HfInference } from "@huggingface/inference";

const router = express.Router();

const hf = new HfInference(process.env.HUGGINGFACE_WRITE_TOKEN ?? "", {
  use_cache: true,
  use_gpu: false,
  wait_for_model: true,
});

// http://localhost:3300/api/v1/huggingface
router.get("/", async (req: Request, res: Response) => {
  try {
    const results = await hf.textGeneration({
      model: "gpt2",
      inputs:
        "What should I do in Paris for 5 days in September with my family?",
    });

    res.status(200).json({
      done: true,
      results,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      response: "Internal server error",
    });
  }
});

export default router;
