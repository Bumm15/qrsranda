import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";

// Routes that require an authenticated session
// Note: /api/qr/generate is intentionally excluded — it handles anon users internally
const protectedPrefixes = ["/dashboard", "/api/upload", "/api/stripe/checkout"];

// Routes that require an active Paid subscription
const paidPrefixes: string[] = [];

export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;

  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected && !req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isPaidRoute = paidPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isPaidRoute && req.auth?.user?.role !== "PAID") {
    return NextResponse.redirect(new URL("/dashboard/billing", req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Skip Next.js internals, static files and public assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
