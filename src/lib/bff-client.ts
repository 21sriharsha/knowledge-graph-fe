/**
 * Browser → BFF fetch helper (ADR 0002). Browser code only ever calls same-origin `/api/bff/**`
 * route handlers; this turns their ApiResult JSON into data or a typed error for TanStack Query.
 */
import type { ApiFailure, ApiResult } from "@/lib/api/result";

export class BffError extends Error {
  readonly status: number;
  readonly kind: ApiFailure["kind"];
  readonly requestId?: string;
  readonly violations: ApiFailure["violations"];
  constructor(failure: ApiFailure) {
    super(failure.message);
    this.status = failure.status;
    this.kind = failure.kind;
    this.requestId = failure.requestId;
    this.violations = failure.violations;
  }
}

export async function bff<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  let response: Response;
  try {
    response = await fetch(path, {
      ...rest,
      headers: { Accept: "application/json", ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...rest.headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      credentials: "same-origin",
    });
  } catch {
    throw new BffError({ ok: false, kind: "unavailable", status: 503, message: "You appear to be offline.", violations: [] });
  }
  let result: ApiResult<T>;
  try {
    result = (await response.json()) as ApiResult<T>;
  } catch {
    throw new BffError({ ok: false, kind: "unavailable", status: response.status || 503, message: "Unexpected response.", violations: [] });
  }
  if (!result.ok) throw new BffError(result);
  return result.data;
}
