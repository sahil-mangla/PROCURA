import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "procura_token";

/** True when the token is a JWT whose `exp` has passed. Reads the payload only; the backend still verifies the signature. */
function isExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === "number" && exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

// Optimistic check only: sends signed-out visitors, and visitors whose session has expired, to /login before rendering.
// The backend still authenticates every API call, and getCurrentUser() redirects on 401.
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token && !isExpired(token)) return NextResponse.next();
  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  const response = NextResponse.redirect(url);
  // Drop a dead token so the app shell is never rendered with it and bounced on the first API call.
  if (token) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|bg/).*)"],
};

export default proxy;
