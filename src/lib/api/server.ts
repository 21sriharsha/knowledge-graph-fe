import "server-only";
import createClient, { type Middleware } from "openapi-fetch";
import { context, propagation } from "@opentelemetry/api";
import { serverEnv } from "@/lib/env/server";
import { logger } from "@/lib/telemetry/logger";
import type { paths } from "./schema";
import { toFailure, unavailable, type ApiResult } from "./result";

export type BackendClient = ReturnType<typeof createClient<paths>>;

export type CallOptions = {
  /** `Authorization` header value for studio calls (Bearer token or dev Basic). */
  authorization?: string;
  /** Correlation id; a fresh one is generated when absent (X01-FR-4). */
  requestId?: string;
  kind?: "read" | "write";
};

const RETRYABLE = new Set([502, 503, 504]);

/**
 * fetch with timeout and one jittered retry for idempotent requests (X01-FR-6).
 * POST/PUT/DELETE are never retried automatically.
 */
function resilientFetch(timeoutMs: number) {
  return async (request: Request): Promise<Response> => {
    const idempotent = request.method === "GET" || request.method === "HEAD";
    const attempt = () => fetch(request.clone(), { signal: AbortSignal.timeout(timeoutMs) });
    try {
      const response = await attempt();
      if (idempotent && RETRYABLE.has(response.status)) {
        await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
        return await attempt();
      }
      return response;
    } catch (error) {
      if (!idempotent) throw error;
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
      return attempt();
    }
  };
}

function observability(requestId: string): Middleware {
  const started = new Map<string, number>();
  return {
    onRequest({ request, id }) {
      started.set(id, performance.now());
      request.headers.set("X-Request-Id", requestId);
      // W3C trace context (traceparent) for distributed tracing across to Spring (X03-FR-6).
      const carrier: Record<string, string> = {};
      propagation.inject(context.active(), carrier);
      for (const [key, value] of Object.entries(carrier)) request.headers.set(key, value);
      return request;
    },
    onResponse({ request, response, schemaPath, id }) {
      const durationMs = Math.round(performance.now() - (started.get(id) ?? performance.now()));
      started.delete(id);
      const entry = { method: request.method, route: schemaPath, status: response.status, durationMs, requestId };
      if (response.status >= 500) logger.error(entry, "backend.call");
      else if (response.status >= 400 && response.status !== 401 && response.status !== 404) logger.warn(entry, "backend.call");
      else logger.debug(entry, "backend.call");
    },
    onError({ request, schemaPath, error, id }) {
      started.delete(id);
      logger.error(
        { method: request.method, route: schemaPath, requestId, err: { message: (error as Error).message } },
        "backend.call_failed",
      );
    },
  };
}

export function backend(options: CallOptions = {}): { client: BackendClient; requestId: string } {
  const env = serverEnv();
  const requestId = options.requestId ?? crypto.randomUUID();
  const timeout = options.kind === "write" ? env.API_TIMEOUT_WRITE_MS : env.API_TIMEOUT_READ_MS;
  const client = createClient<paths>({
    baseUrl: env.API_BASE_URL,
    fetch: resilientFetch(timeout),
    headers: options.authorization ? { Authorization: options.authorization } : undefined,
    // Spring's Pageable is declared as an object param; it must serialise as page=&size=&sort= (BG-20).
    querySerializer: { object: { style: "form", explode: true }, array: { style: "form", explode: true } },
  });
  client.use(observability(requestId));
  return { client, requestId };
}

/**
 * Runs one backend call and maps it to an ApiResult. Network errors and timeouts become
 * `unavailable` (never thrown) so pages can render a consistent error state.
 */
export async function call<T>(
  requestId: string,
  run: () => Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<ApiResult<T>> {
  try {
    const { data, error, response } = await run();
    const echoed = response.headers.get("X-Request-Id") ?? requestId;
    if (response.ok) return { ok: true, data: data as T, requestId: echoed };
    return toFailure(response.status, error, echoed);
  } catch (error) {
    // Network failure, timeout or a client-side serialisation error — never swallowed silently.
    logger.error({ requestId, err: { name: (error as Error).name, message: (error as Error).message } }, "backend.call_exception");
    return unavailable(undefined, requestId);
  }
}
