import "dotenv/config";
import express, { Request, Response } from "express";
import { HfInference } from "@huggingface/inference";

const router = express.Router();

const hf = new HfInference(process.env.HUGGINGFACE_WRITE_TOKEN ?? "");

router.get("/", async (req: Request, res: Response) => {
  try {
    await hf.textGeneration({
      model: "gpt2",
      inputs: "The answer to the universe is",
    });

    for await (const output of hf.textGenerationStream({
      model: "google/flan-t5-xxl",
      inputs: 'repeat "one two three four"',
      parameters: { max_new_tokens: 250 },
    })) {
      console.log(output.token.text, output.generated_text);
    }

    res.status(200).json({
      done: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      response: "Internal server error",
    });
  }
});

export default router;
