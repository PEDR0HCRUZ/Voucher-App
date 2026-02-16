"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import QRCode from "qrcode"
import { supabase } from "@/lib/supabase"
import type { VoucherWithType } from "@/lib/database.types"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function VoucherDetailPage() {
  const params = useParams()
  const codigo = params.codigo as string

  const [voucher, setVoucher] = useState<VoucherWithType | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const generateQR = useCallback(async (code: string) => {
    try {
      const url = await QRCode.toDataURL(code, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      })
      setQrDataUrl(url)
    } catch (err) {
      console.error("Error generating QR:", err)
    }
  }, [])

  useEffect(() => {
    async function fetchVoucher() {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*, voucher_types(*)")
        .eq("code", codigo)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setVoucher(data as VoucherWithType)
        generateQR(data.code)
      }
      setLoading(false)
    }

    fetchVoucher()
  }, [codigo, generateQR])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground text-lg">Carregando voucher...</div>
      </div>
    )
  }

  if (notFound || !voucher) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-xl font-semibold">Voucher não encontrado</p>
        <p className="text-muted-foreground">
          O código <span className="font-mono font-bold">{codigo}</span> não existe.
        </p>
        <Link href="/vouchers">
          <Button variant="outline">Voltar aos Vouchers</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{voucher.voucher_types.name}</CardTitle>
          <div className="flex justify-center gap-2 mt-2">
            <Badge variant={voucher.status === "active" ? "success" : "destructive"}>
              {voucher.status === "active" ? "ATIVO" : "USADO"}
            </Badge>
            <Badge variant="secondary">
              {formatCurrency(voucher.voucher_types.value)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg border-2 border-dashed border-muted">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code do voucher ${voucher.code}`}
                className="w-64 h-64"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-muted-foreground">
                Gerando QR Code...
              </div>
            )}
          </div>

          {/* Code */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Código do voucher</p>
            <p className="text-3xl font-mono font-bold tracking-widest select-all">
              {voucher.code}
            </p>
          </div>

          {/* Regenerate QR button */}
          <Button
            variant="outline"
            onClick={() => generateQR(voucher.code)}
            className="w-full"
          >
            Recarregar QR Code
          </Button>

          {voucher.status === "used" && voucher.used_at && (
            <p className="text-sm text-muted-foreground">
              Usado em: {new Date(voucher.used_at).toLocaleString("pt-BR")}
            </p>
          )}
        </CardContent>
      </Card>

      <Link href="/vouchers">
        <Button variant="ghost">Voltar aos Vouchers</Button>
      </Link>
    </div>
  )
}
