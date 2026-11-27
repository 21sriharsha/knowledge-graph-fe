/**
 * Typed outcome of a backend call (X01-FR-5). Isomorphic: route handlers serialise it to the browser
 * and client code narrows on `kind`.
 */
import { z } from "zod";

export type ApiFailureKind =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "unavailable";

export type FieldViolation = { field: string; message: string };

export type ApiFailure = {
  ok: false;
  kind: ApiFailureKind;
  status: number;
  code?: string;
  message: string;
  requestId?: string;
  violations: FieldViolation[];
};

export type ApiSuccess<T> = { ok: true; data: T; requestId?: string };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

/** Shape of `ApiError` from the backend's GlobalExceptionHandler (not yet declared in the spec, BG-9). */
const apiErrorBody = z
  .object({
    status: z.number().optional(),
    code: z.string().optional(),
    message: z.string().optional(),
    requestId: z.string().nullish(),
    violations: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
  })
  .passthrough();

const DEFAULT_MESSAGES: Record<ApiFailureKind, string> = {
  unauthenticated: "Please sign in to continue.",
  forbidden: "You don't have access to this.",
  not_found: "We couldn't find that.",
  conflict: "That change conflicts with the current state.",
  validation: "Some fields need attention.",
  unavailable: "The service is unavailable right now. Please try again.",
};

export function kindForStatus(status: number): ApiFailureKind {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 400 || status === 422) return "validation";
  return "unavailable";
}

export function toFailure(status: number, body: unknown, requestId?: string): ApiFailure {
  const kind = kindForStatus(status);
  const parsed = apiErrorBody.safeParse(body);
  const err = parsed.success ? parsed.data : {};
  // Only surface backend messages for client errors; 5xx messages may leak internals.
  const message = status < 500 && err.message ? err.message : DEFAULT_MESSAGES[kind];
  return {
    ok: false,
    kind,
    status,
    code: err.code,
    message,
    requestId: err.requestId ?? requestId,
    violations: err.violations ?? [],
  };
}

export function unavailable(message = DEFAULT_MESSAGES.unavailable, requestId?: string): ApiFailure {
  return { ok: false, kind: "unavailable", status: 503, message, requestId, violations: [] };
}

export function unauthenticated(): ApiFailure {
  return { ok: false, kind: "unauthenticated", status: 401, message: DEFAULT_MESSAGES.unauthenticated, violations: [] };
}

/** HTTP status a route handler should answer with for a given result. */
export function httpStatusOf(result: ApiResult<unknown>): number {
  return result.ok ? 200 : result.status;
}
