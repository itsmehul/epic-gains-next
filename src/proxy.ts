import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const protectedPrefixes = [
  "/workflows",
  "/workouts",
  "/integrations",
  "/skills",
  "/agent",
  "/achievements",
  "/friends",
  "/u",
  "/oauth/consent",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/workflows",
    "/workflows/:path*",
    "/workouts",
    "/workouts/:path*",
    "/integrations",
    "/integrations/:path*",
    "/skills",
    "/skills/:path*",
    "/agent",
    "/agent/:path*",
    "/achievements",
    "/achievements/:path*",
    "/friends",
    "/friends/:path*",
    "/u/:path*",
    "/oauth/consent",
  ],
};
