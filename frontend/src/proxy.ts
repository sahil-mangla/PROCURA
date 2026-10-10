import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: sends signed-out visitors to /login before rendering.
// The backend still authenticates every API call, and getCurrentUser() redirects on 401.
export function proxy(request: NextRequest) {
  if (request.cookies.has("procura_token")) return NextResponse.next();
  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|bg/).*)"],
};
