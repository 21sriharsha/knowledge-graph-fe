import "server-only";
import pino from "pino";

/**
 * Structured JSON logger (X03-FR-4). Fields: timestamp, level, service, env, plus whatever the
 * caller adds (route, requestId, status, durationMs). Sensitive keys are redacted defensively even
 * though callers must not pass them in the first place (X03-FR-5).
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "kg-fe", env: process.env.APP_ENV ?? "unknown" },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: { level: (label) => ({ level: label }) },
  redact: {
    paths: [
      "authorization",
      "*.authorization",
      "cookie",
      "*.cookie",
      "token",
      "*.token",
      "accessToken",
      "*.accessToken",
      "webhookSecret",
      "*.webhookSecret",
      "password",
      "*.password",
      "email",
      "*.email",
    ],
    censor: "[redacted]",
  },
});

export type Logger = typeof logger;
