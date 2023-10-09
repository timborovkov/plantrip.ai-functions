import "dotenv/config";
import {
  AuthObject,
  ClerkExpressWithAuth,
  LooseAuthProp,
  WithAuthProp,
} from "@clerk/clerk-sdk-node";
import express, { Request, Response } from "express";

const router = express.Router();

declare global {
  namespace Express {
    interface Request extends LooseAuthProp {}
  }
}

router.get<{}, AuthObject>(
  "/",
  ClerkExpressWithAuth({
    // audience: "https://plantrip.ai",
    // strict: true,
  }),
  (req: WithAuthProp<Request>, res: Response) => {
    res.json(req.auth);
  }
);

export default router;
