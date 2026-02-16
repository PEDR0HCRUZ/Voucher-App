"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QrScanner } from "@/components/qr-scanner"

type ValidationResult = {
  valid: boolean
  voucher?: {
    id: string
    code: string
    status: string
    used_at: string | null
    voucher_type: {
      name: string
      value: number
      description: string
    }
  }
  error?: string
}

export default function ValidarPage() {
  const [code, setCode] = useState("")
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function validateCode(codeToValidate: string) {
    const trimmed = codeToValidate.trim().toUpperCase()
    if (!trimmed) return

    setCode(trimmed)
    setLoading(true)
    setResult(null)
    setConfirmed(false)

    try {
      const response = await fetch(`/api/validar?code=${encodeURIComponent(trimmed)}`)
      const data = await response.json()

      if (!response.ok) {
        setResult({ valid: false, error: data.error || "Voucher não encontrado" })
      } else {
        setResult(data)
      }
    } catch {
      setResult({ valid: false, error: "Erro ao validar. Tente novamente." })
    } finally {
      setLoading(false)
    }
  }

  async function confirmUse() {
    if (!result?.voucher?.code) return

    setConfirming(true)

    try {
      const response = await fetch("/api/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: result.voucher.code }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || "Erro ao confirmar uso")
      } else {
        setConfirmed(true)
        // Update local state to reflect used status
        setResult((prev) =>
          prev && prev.voucher
            ? {
                ...prev,
                valid: false,
                voucher: {
                  ...prev.voucher,
                  status: "used",
                  used_at: new Date().toISOString(),
                },
              }
            : prev
        )
      }
    } catch {
      alert("Erro ao confirmar uso. Tente novamente.")
    } finally {
      setConfirming(false)
    }
  }

  function reset() {
    setCode("")
    setResult(null)
    setConfirmed(false)
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold">Validar Voucher</h1>
        <p className="text-muted-foreground mt-1">
          Digite o código ou escaneie o QR Code para validar.
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">Código do Voucher</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Manual input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              validateCode(code)
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Digite o código..."
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono text-lg tracking-wider"
              maxLength={20}
            />
            <Button type="submit" disabled={loading || !code.trim()}>
              {loading ? "..." : "Validar"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* QR Scanner */}
          <QrScanner onScan={(scannedCode) => validateCode(scannedCode)} />
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            {result.valid && result.voucher?.status === "active" && !confirmed ? (
              <div className="flex flex-col items-center gap-4">
                <div className="text-6xl">&#10004;</div>
                <p className="text-2xl font-bold text-green-600">VALIDO</p>
                <div className="text-center space-y-1">
                  <p className="text-lg font-semibold">{result.voucher.voucher_type.name}</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(result.voucher.voucher_type.value)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {result.voucher.voucher_type.description}
                  </p>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={confirmUse}
                  disabled={confirming}
                >
                  {confirming ? "Confirmando..." : "Confirmar Uso"}
                </Button>
              </div>
            ) : result.voucher?.status === "used" || confirmed ? (
              <div className="flex flex-col items-center gap-4">
                <div className="text-6xl">&#10060;</div>
                <p className="text-2xl font-bold text-red-600">
                  {confirmed ? "VOUCHER UTILIZADO" : "JA UTILIZADO"}
                </p>
                {result.voucher && (
                  <div className="text-center space-y-1">
                    <p className="text-lg font-semibold">{result.voucher.voucher_type.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Usado em:{" "}
                      {result.voucher.used_at
                        ? new Date(result.voucher.used_at).toLocaleString("pt-BR")
                        : "agora"}
                    </p>
                  </div>
                )}
                {confirmed && (
                  <p className="text-sm text-green-600 font-medium">
                    Uso confirmado com sucesso!
                  </p>
                )}
                <Button variant="outline" className="w-full" onClick={reset}>
                  Validar Outro
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="text-6xl">&#10060;</div>
                <p className="text-2xl font-bold text-red-600">INVALIDO</p>
                <p className="text-muted-foreground">
                  {result.error || "Voucher não encontrado no sistema."}
                </p>
                <Button variant="outline" className="w-full" onClick={reset}>
                  Tentar Novamente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
