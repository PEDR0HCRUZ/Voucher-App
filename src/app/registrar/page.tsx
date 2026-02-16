"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function RegistrarPage() {
  const { register } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<"cliente" | "validador">("cliente")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [generatedId, setGeneratedId] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("As senhas não coincidem")
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres")
      return
    }

    setLoading(true)
    const result = await register({ name, email, password, role })

    if (result.success && result.login_id) {
      setGeneratedId(result.login_id)
    } else {
      setError(result.error || "Erro ao criar conta")
    }
    setLoading(false)
  }

  // Success screen - show login_id
  if (generatedId) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="text-5xl mb-2">&#10004;</div>
            <CardTitle className="text-2xl text-green-600">Conta Criada!</CardTitle>
            <CardDescription>
              Anote seu ID de acesso. Você vai precisar dele para entrar.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="bg-muted rounded-lg p-6 w-full text-center">
              <p className="text-sm text-muted-foreground mb-2">Seu ID de Acesso</p>
              <p className="text-4xl font-mono font-bold tracking-[0.3em] select-all">
                {generatedId}
              </p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(generatedId)}
              className="text-sm text-primary hover:underline"
            >
              Copiar ID
            </button>
          </CardContent>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button className="w-full" size="lg">
                Ir para Login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Criar Conta</CardTitle>
          <CardDescription>
            Preencha os dados para criar sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Role Selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("cliente")}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  role === "cliente"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
              >
                <div className="text-2xl mb-1">&#128176;</div>
                <div className="font-medium text-sm">Cliente</div>
                <div className="text-xs text-muted-foreground">Compra vouchers</div>
              </button>
              <button
                type="button"
                onClick={() => setRole("validador")}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  role === "validador"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
              >
                <div className="text-2xl mb-1">&#127861;</div>
                <div className="font-medium text-sm">Restaurante</div>
                <div className="text-xs text-muted-foreground">Valida vouchers</div>
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Criando..." : "Criar Conta"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
