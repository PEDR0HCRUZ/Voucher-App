"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function Navbar() {
  const { user, loading, logout } = useAuth()

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            href={user ? (user.role === "validador" ? "/validar" : "/vouchers") : "/login"}
            className="text-xl font-bold text-primary"
          >
            Voucher App
          </Link>

          {loading ? (
            <div className="text-sm text-muted-foreground">...</div>
          ) : user ? (
            <div className="flex items-center gap-3">
              {/* Role-based links */}
              {user.role === "cliente" ? (
                <>
                  <Link
                    href="/vouchers"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Vouchers
                  </Link>
                  <Link
                    href="/meus-vouchers"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Meus Vouchers
                  </Link>
                </>
              ) : (
                <Link
                  href="/validar"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Validar
                </Link>
              )}

              {/* User info */}
              <div className="flex items-center gap-2 ml-2 pl-3 border-l">
                <span className="text-sm font-medium hidden sm:inline">
                  {user.name.split(" ")[0]}
                </span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {user.login_id}
                </Badge>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Sair
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Entrar
                </Button>
              </Link>
              <Link href="/registrar">
                <Button size="sm">Cadastrar</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
