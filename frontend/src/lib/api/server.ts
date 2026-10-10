import "server-only";
import createClient from "openapi-fetch";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { paths } from "./schema";
import type { Problem } from "./types";

/** httpOnly cookie holding the backend's JWT. The browser never reads it; only server code does. */
export const SESSION_COOKIE = "procura_token";

const baseUrl = process.env.API_URL ?? "http://localhost:4010";

/** A typed client for the backend, authenticated as the current user. Server-only. */
export async function api() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return createClient<paths>({
    baseUrl,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

/** A client with no user token, for logging in. */
export function anonymousApi() {
  return createClient<paths>({ baseUrl });
}

export class ApiError extends Error {
  constructor(public problem: Problem) {
    super(problem.detail ?? problem.title);
  }
}

/** Turns a missing or error response into a problem with a stable shape, even if the server sent none. */
export function toProblem(error: unknown, response: Response): Problem {
  if (error && typeof error === "object" && "code" in error) return error as Problem;
  return {
    type: "about:blank",
    title: response.statusText || "The server could not complete the request",
    status: response.status,
    code: response.status === 401 ? "UNAUTHENTICATED" : response.status === 403 ? "FORBIDDEN" : response.status === 404 ? "NOT_FOUND" : "INTERNAL_ERROR",
  };
}

/**
 * For page loads: returns the data, sends the user to login on 401, shows the 404 page on 404,
 * and throws anything else to the nearest error boundary.
 */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  const { data, error, response } = result;
  if (response.ok && data !== undefined) return data;
  if (response.status === 401) redirect("/login");
  if (response.status === 404) notFound();
  throw new ApiError(toProblem(error, response));
}
