"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

type VoucherType = {
  id: string
  name: string
  value: number
  description: string
}

type PixData = {
  encodedImage: string
  payload: string
  expirationDate: string
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><p className="text-muted-foreground">Carregando...</p></div>}>
      <CheckoutContent />
    </Suspense>
  )
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const voucherTypeId = searchParams.get("type")

  const [voucherType, setVoucherType] = useState<VoucherType | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"pix" | "card">("pix")

  // Shared fields
  const [cpf, setCpf] = useState("")
  const [customerName, setCustomerName] = useState("")

  // PIX state
  const [pixData, setPixData] = useState<PixData | null>(null)
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null)
  const [pixLoading, setPixLoading] = useState(false)
  const [pixCopied, setPixCopied] = useState(false)

  // Credit card state
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpMonth, setCardExpMonth] = useState("")
  const [cardExpYear, setCardExpYear] = useState("")
  const [cardCvv, setCardCvv] = useState("")
  const [cardHolderName, setCardHolderName] = useState("")
  const [cardEmail, setCardEmail] = useState("")
  const [cardPostalCode, setCardPostalCode] = useState("")
  const [cardAddressNumber, setCardAddressNumber] = useState("")
  const [cardPhone, setCardPhone] = useState("")
  const [cardLoading, setCardLoading] = useState(false)

  // General
  const [error, setError] = useState("")
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    async function fetchVoucherType() {
      if (!voucherTypeId) return
      const { data, error } = await supabase
        .from("voucher_types")
        .select("id, name, value, description")
        .eq("id", voucherTypeId)
        .single()
      if (!error && data) {
        setVoucherType(data as VoucherType)
        setCustomerName(user?.name || "")
      }
      setLoading(false)
    }
    fetchVoucherType()
  }, [voucherTypeId, user])

  // Poll for PIX payment status
  useEffect(() => {
    if (!pixPaymentId || !polling) return

    let pollCount = 0
    const maxPolls = 120 // 10 minutes

    const interval = setInterval(async () => {
      pollCount++
      if (pollCount > maxPolls) {
        clearInterval(interval)
        setPolling(false)
        setError("Tempo de pagamento expirado. Tente novamente.")
        return
      }

      try {
        const res = await fetch(`/api/payments/${pixPaymentId}/status`)
        const data = await res.json()

        if (data.status === "CONFIRMED" || data.status === "RECEIVED") {
          clearInterval(interval)
          setPolling(false)
          if (data.voucher_code) {
            router.push(`/voucher/${data.voucher_code}`)
          }
        } else if (data.status === "FAILED") {
          clearInterval(interval)
          setPolling(false)
          setError("Pagamento falhou. Tente novamente.")
        }
      } catch {
        // ignore poll errors, will retry
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [pixPaymentId, polling, router])

  async function handlePixPayment() {
    setError("")

    if (!cpf.trim() || !customerName.trim()) {
      setError("Preencha seu nome e CPF")
      return
    }

    setPixLoading(true)

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucher_type_id: voucherTypeId,
          billing_type: "PIX",
          cpf: cpf.replace(/\D/g, ""),
          name: customerName,
          email: user?.email,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Erro ao gerar PIX")
        return
      }

      setPixData(data.pix)
      setPixPaymentId(data.paymentId)
      setPolling(true)
    } catch {
      setError("Erro ao processar pagamento")
    } finally {
      setPixLoading(false)
    }
  }

  async function handleCardPayment(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!cpf.trim() || !customerName.trim()) {
      setError("Preencha seu nome e CPF")
      return
    }

    setCardLoading(true)

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucher_type_id: voucherTypeId,
          billing_type: "CREDIT_CARD",
          cpf: cpf.replace(/\D/g, ""),
          name: customerName,
          email: cardEmail || user?.email,
          creditCard: {
            holderName: cardHolderName.toUpperCase(),
            number: cardNumber.replace(/\D/g, ""),
            expiryMonth: cardExpMonth,
            expiryYear: cardExpYear,
            ccv: cardCvv,
          },
          creditCardHolderInfo: {
            name: customerName,
            email: cardEmail || user?.email || "",
            cpfCnpj: cpf.replace(/\D/g, ""),
            postalCode: cardPostalCode.replace(/\D/g, ""),
            addressNumber: cardAddressNumber,
            phone: cardPhone.replace(/\D/g, ""),
            mobilePhone: cardPhone.replace(/\D/g, ""),
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Pagamento não aprovado")
        return
      }

      if (data.voucher_code) {
        router.push(`/voucher/${data.voucher_code}`)
      }
    } catch {
      setError("Erro ao processar pagamento")
    } finally {
      setCardLoading(false)
    }
  }

  function copyPixCode() {
    if (pixData?.payload) {
      navigator.clipboard.writeText(pixData.payload)
      setPixCopied(true)
      setTimeout(() => setPixCopied(false), 2000)
    }
  }

  if (!voucherTypeId) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Voucher não selecionado.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!voucherType) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Voucher não encontrado.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 max-w-lg mx-auto">
      {/* Order summary */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Pagamento</CardTitle>
          <CardDescription>{voucherType.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="text-3xl font-bold text-primary">
              {formatCurrency(voucherType.value)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Customer info */}
      {!pixData && (
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Seus Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="customerName">Nome completo</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment method tabs */}
      {!pixData ? (
        <Card className="w-full">
          <CardContent className="pt-6">
            <Tabs>
              <TabsList>
                <TabsTrigger active={tab === "pix"} onClick={() => setTab("pix")}>
                  PIX
                </TabsTrigger>
                <TabsTrigger active={tab === "card"} onClick={() => setTab("card")}>
                  Cartao de Credito
                </TabsTrigger>
              </TabsList>

              {tab === "pix" && (
                <TabsContent className="mt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Pague instantaneamente via PIX. O QR Code será gerado após clicar no botão.
                  </p>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handlePixPayment}
                    disabled={pixLoading}
                  >
                    {pixLoading ? "Gerando PIX..." : `Pagar ${formatCurrency(voucherType.value)} com PIX`}
                  </Button>
                </TabsContent>
              )}

              {tab === "card" && (
                <TabsContent className="mt-4">
                  <form onSubmit={handleCardPayment} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="cardNumber">Numero do cartao</Label>
                      <Input
                        id="cardNumber"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cardHolderName">Nome no cartao</Label>
                      <Input
                        id="cardHolderName"
                        value={cardHolderName}
                        onChange={(e) => setCardHolderName(e.target.value)}
                        placeholder="NOME COMO NO CARTAO"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="expMonth">Mes</Label>
                        <Input
                          id="expMonth"
                          value={cardExpMonth}
                          onChange={(e) => setCardExpMonth(e.target.value)}
                          placeholder="MM"
                          maxLength={2}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="expYear">Ano</Label>
                        <Input
                          id="expYear"
                          value={cardExpYear}
                          onChange={(e) => setCardExpYear(e.target.value)}
                          placeholder="AAAA"
                          maxLength={4}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="000"
                          maxLength={4}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cardEmail">Email</Label>
                      <Input
                        id="cardEmail"
                        type="email"
                        value={cardEmail}
                        onChange={(e) => setCardEmail(e.target.value)}
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="postalCode">CEP</Label>
                        <Input
                          id="postalCode"
                          value={cardPostalCode}
                          onChange={(e) => setCardPostalCode(e.target.value)}
                          placeholder="00000-000"
                          maxLength={9}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="addressNumber">Numero</Label>
                        <Input
                          id="addressNumber"
                          value={cardAddressNumber}
                          onChange={(e) => setCardAddressNumber(e.target.value)}
                          placeholder="123"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={cardPhone}
                        onChange={(e) => setCardPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={cardLoading}
                    >
                      {cardLoading
                        ? "Processando..."
                        : `Pagar ${formatCurrency(voucherType.value)} com Cartao`}
                    </Button>
                  </form>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        /* PIX QR Code display */
        <Card className="w-full">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-lg">Escaneie o QR Code</CardTitle>
            <CardDescription>
              Abra o app do seu banco e escaneie o código abaixo
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {/* QR Code Image */}
            <div className="bg-white p-4 rounded-lg border">
              <img
                src={`data:image/png;base64,${pixData.encodedImage}`}
                alt="PIX QR Code"
                className="w-64 h-64"
              />
            </div>

            {/* Copy paste code */}
            <div className="w-full">
              <Label className="text-xs text-muted-foreground">Ou copie o código PIX:</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={pixData.payload}
                  readOnly
                  className="text-xs font-mono"
                />
                <Button variant="outline" onClick={copyPixCode} className="shrink-0">
                  {pixCopied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              Aguardando pagamento...
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <Button variant="ghost" onClick={() => router.push("/vouchers")}>
        Voltar aos Vouchers
      </Button>
    </div>
  )
}
