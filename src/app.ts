import "dotenv/config";
import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";

import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";

import * as middlewares from "./middlewares";
import api from "./api";
import MessageResponse from "./interfaces/MessageResponse";

import { LooseAuthProp } from "@clerk/clerk-sdk-node";

const app = express();

declare global {
  namespace Express {
    interface Request extends LooseAuthProp {}
  }
}

app.use(morgan("dev"));
app.use(helmet());
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: "https://c7b7896ca049fb9d0793f2e7ac2bcd64@o4506530520694784.ingest.sentry.io/4506530535768064",
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),
      new ProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
  });

  // The request handler must be the first middleware on the app
  app.use(Sentry.Handlers.requestHandler());

  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());
}

app.get<{}, MessageResponse>("/", (req, res) => {
  res.json({
    message: "🦄🌈✨👋🌎🌍🌏✨🌈🦄",
  });
});

app.use("/api/v1", api);

if (process.env.NODE_ENV === "production") {
  app.use(Sentry.Handlers.errorHandler());
}
app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
