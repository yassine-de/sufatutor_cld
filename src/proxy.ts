import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultLocale, hasLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { redirectWithCookies, updateSession } from "@/lib/supabase/proxy";

// Parent area: needs a signed-in user. Everything else (landing page, login) is public.
const PROTECTED = ["/profiles", "/account", "/learn", "/dashboard", "/admin"];

// Cookie wins, then Accept-Language, then the default (Arabic).
function pickLocale(request: NextRequest): Locale {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie && hasLocale(cookie)) return cookie;

  const header = request.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase().split("-")[0];
    if (hasLocale(tag)) return tag;
  }
  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segment = pathname.split("/")[1];

  if (!hasLocale(segment)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${pickLocale(request)}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const { response, signedIn } = await updateSession(request);
  const rest = pathname.slice(segment.length + 1) || "/";

  if (!signedIn && PROTECTED.some((p) => rest === p || rest.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = `/${segment}/login`;
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return redirectWithCookies(url, response);
  }
  if (signedIn && rest === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = `/${segment}/profiles`;
    url.search = "";
    return redirectWithCookies(url, response);
  }
  return response;
}

export const config = {
  // Skip Next internals and files with an extension (icons, images, ...).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
