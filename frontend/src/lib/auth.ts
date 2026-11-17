import "server-only";
import { cache } from "react";
import { api, unwrap } from "./api/server";

/**
 * The signed-in user, read once per request. Reads cookies, so call it only inside a Suspense
 * boundary (a page with loading.tsx, or an explicit <Suspense>). Redirects to /login on 401.
 */
export const getCurrentUser = cache(async () => {
  const client = await api();
  return unwrap(await client.GET("/auth/me"));
});
