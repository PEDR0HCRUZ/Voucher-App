import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production-min-32-chars"
)
const COOKIE_NAME = "voucher_auth"

const PUBLIC_ROUTES = ["/login", "/registrar", "/api/auth"]

// Routes that require specific roles
const CLIENTE_ROUTES = ["/vouchers", "/voucher", "/meus-vouchers"]
const VALIDADOR_ROUTES = ["/validar"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Allow static files and API routes that don't need auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  ) {
    return NextResponse.next()
  }

  // Get token from cookie
  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const role = payload.role as string

    // Check role-based access
    const isClienteRoute = CLIENTE_ROUTES.some((r) => pathname.startsWith(r))
    const isValidadorRoute = VALIDADOR_ROUTES.some((r) => pathname.startsWith(r))

    if (isClienteRoute && role !== "cliente") {
      return NextResponse.redirect(new URL("/validar", request.url))
    }

    if (isValidadorRoute && role !== "validador") {
      return NextResponse.redirect(new URL("/vouchers", request.url))
    }

    return NextResponse.next()
  } catch {
    // Invalid/expired token
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.delete(COOKIE_NAME)
    return response
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
