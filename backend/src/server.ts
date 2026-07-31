/**
 * server.ts
 * ---------------------------------------------------------------------------
 * Express + TypeScript API for "Let's Save Our Planet".
 *
 *   GET  /api/health   liveness + configuration report
 *   GET  /api/topics   the topics Planet AI is allowed to cover
 *   POST /api/ask      { question, history? } -> { answer, sources, model }
 *
 * Hardened with helmet, a strict CORS allow-list, per-IP rate limiting,
 * zod request validation and a centralised error handler.
 */

import "dotenv/config";

import cors, { type CorsOptions } from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";

import {
  AiServiceError,
  askPlanetAI,
  getModelName,
  loadKnowledgeBase,
  resolveKnowledgeDir,
} from "./ai";

/* -------------------------------------------------------------------------- */
/* Environment                                                                */
/* -------------------------------------------------------------------------- */

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const PORT = toInt(process.env.PORT, 4000);
const NODE_ENV = process.env.NODE_ENV ?? "development";
const IS_PROD = NODE_ENV === "production";
const RATE_LIMIT_WINDOW_MS = toInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
const RATE_LIMIT_MAX = toInt(process.env.RATE_LIMIT_MAX, 20);

const ALLOWED_ORIGINS = (process.env.FRONTEND_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

/* -------------------------------------------------------------------------- */
/* App                                                                        */
/* -------------------------------------------------------------------------- */

const app = express();

app.disable("x-powered-by");
if (process.env.TRUST_PROXY && process.env.TRUST_PROXY !== "0") {
  app.set("trust proxy", toInt(process.env.TRUST_PROXY, 1));
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Allow same-origin / server-to-server calls (curl, health checks, SSR).
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/$/, "");
    if (ALLOWED_ORIGINS.includes(normalized) || ALLOWED_ORIGINS.includes("*")) {
      return callback(null, true);
    }
    return callback(new HttpError(`Origin ${origin} is not allowed by CORS.`, 403, "cors_rejected"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept"],
  maxAge: 86_400,
  credentials: false,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "32kb" }));

/** Compact request log: method, path, status, duration. */
app.use((req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    console.log(
      `[api] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`
    );
  });
  next();
});

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, status = 500, code = "internal_error", details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

const chatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

const askSchema = z
  .object({
    question: z
      .string({ required_error: "`question` is required.", invalid_type_error: "`question` must be a string." })
      .trim()
      .min(3, "Ask something a little longer (3 characters minimum).")
      .max(1000, "Questions are limited to 1000 characters."),
    history: z.array(chatTurnSchema).max(20).optional(),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* Rate limiting                                                              */
/* -------------------------------------------------------------------------- */

const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "rate_limited",
      message:
        "Too many questions in a short window. Give the planet a breath and retry in a minute.",
    },
  },
});

/* -------------------------------------------------------------------------- */
/* Routes                                                                     */
/* -------------------------------------------------------------------------- */

const router = express.Router();

router.get("/health", (_req: Request, res: Response) => {
  const docs = loadKnowledgeBase();
  res.json({
    status: "ok",
    service: "lets-save-our-planet-api",
    env: NODE_ENV,
    model: getModelName(),
    geminiConfigured: Boolean((process.env.GEMINI_API_KEY ?? "").trim()),
    knowledge: { dir: resolveKnowledgeDir(), documents: docs.map((doc) => doc.file) },
    allowedOrigins: ALLOWED_ORIGINS,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

router.get("/topics", (_req: Request, res: Response) => {
  res.json({
    topics: [
      "ecology",
      "climate",
      "pollution",
      "sustainability",
      "biodiversity",
      "environment",
    ],
  });
});

router.post("/ask", apiLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const parsed = askSchema.safeParse(req.body);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return next(
      new HttpError(
        issue?.message ?? "Invalid request body.",
        400,
        "invalid_request",
        parsed.error.issues.map((entry) => ({
          path: entry.path.join("."),
          message: entry.message,
        }))
      )
    );
  }

  const controller = new AbortController();
  req.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const result = await askPlanetAI({
      question: parsed.data.question,
      history: parsed.data.history ?? [],
      signal: controller.signal,
    });

    return res.json({
      answer: result.answer,
      sources: result.sources,
      model: result.model,
      offTopic: result.offTopic,
    });
  } catch (error) {
    return next(error);
  }
});

app.use("/api", router);

app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "Let's Save Our Planet API",
    endpoints: ["GET /api/health", "GET /api/topics", "POST /api/ask"],
  });
});

app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new HttpError(`Route ${req.method} ${req.originalUrl} does not exist.`, 404, "not_found"));
});

/* -------------------------------------------------------------------------- */
/* Error handler                                                              */
/* -------------------------------------------------------------------------- */

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  let status = 500;
  let code = "internal_error";
  let message = "Something went wrong on our side.";
  let details: unknown;

  if (error instanceof HttpError) {
    status = error.status;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof AiServiceError) {
    status = error.status;
    code = error.code;
    message = error.message;
  } else if (error instanceof SyntaxError && "body" in error) {
    status = 400;
    code = "invalid_json";
    message = "The request body is not valid JSON.";
  } else if (error instanceof Error && !IS_PROD) {
    message = error.message;
  }

  if (status >= 500) console.error("[api] error:", error);
  if (status === 499) return res.end();

  return res.status(status).json({
    error: { code, message, ...(details ? { details } : {}) },
  });
});

/* -------------------------------------------------------------------------- */
/* Boot                                                                       */
/* -------------------------------------------------------------------------- */

const server = app.listen(PORT, () => {
  loadKnowledgeBase(true);
  console.log(`\n  Let's Save Our Planet API`);
  console.log(`  -> http://localhost:${PORT}/api/health`);
  console.log(`  -> model: ${getModelName()}`);
  console.log(`  -> CORS:  ${ALLOWED_ORIGINS.join(", ")}`);
  if (!(process.env.GEMINI_API_KEY ?? "").trim()) {
    console.warn("  !! GEMINI_API_KEY is empty - POST /api/ask will return 503.");
  }
  console.log("");
});

const shutdown = (signal: string) => {
  console.log(`\n[api] ${signal} received, shutting down.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export default app;
