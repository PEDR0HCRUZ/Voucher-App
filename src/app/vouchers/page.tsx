"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { VoucherType } from "@/lib/database.types"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

const EMOJI_MAP: Record<string, string> = {
  "Almoço Executivo": "🍽️",
  "Café & Lanche": "☕",
  "Jantar Premium": "🌟",
}

export default function VouchersPage() {
  const router = useRouter()
  const [voucherTypes, setVoucherTypes] = useState<VoucherType[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)

  useEffect(() => {
    async function fetchVoucherTypes() {
      const { data, error } = await supabase
        .from("voucher_types")
        .select("*")
        .order("value", { ascending: true })

      if (error) {
        console.error("Error fetching voucher types:", error)
      } else {
        setVoucherTypes(data || [])
      }
      setLoading(false)
    }

    fetchVoucherTypes()
  }, [])

  async function handleBuy(voucherTypeId: string) {
    setBuying(voucherTypeId)
    try {
      const response = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucher_type_id: voucherTypeId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao gerar voucher")
      }

      router.push(`/voucher/${data.code}`)
    } catch (error) {
      console.error("Error buying voucher:", error)
      alert("Erro ao gerar voucher. Tente novamente.")
    } finally {
      setBuying(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground text-lg">Carregando vouchers...</div>
      </div>
    )
  }

  if (voucherTypes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground text-lg">Nenhum voucher disponível.</p>
        <p className="text-sm text-muted-foreground">
          Execute o script SQL no Supabase para criar os vouchers mock.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Vouchers Disponíveis</h1>
        <p className="text-muted-foreground mt-1">
          Escolha um voucher e gere o seu código instantaneamente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {voucherTypes.map((vt) => (
          <Card key={vt.id} className="flex flex-col">
            <CardHeader>
              <div className="text-4xl mb-2">{EMOJI_MAP[vt.name] || "🎫"}</div>
              <CardTitle className="text-xl">{vt.name}</CardTitle>
              <CardDescription>{vt.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(vt.value)}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleBuy(vt.id)}
                disabled={buying === vt.id}
              >
                {buying === vt.id ? "Gerando..." : "Comprar"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
