"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { formatCurrency } from "@/lib/utils"
import type { VoucherWithType } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function MeusVouchersPage() {
  const { user } = useAuth()
  const [vouchers, setVouchers] = useState<VoucherWithType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMyVouchers() {
      if (!user) return

      const { data, error } = await supabase
        .from("vouchers")
        .select("*, voucher_types(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching vouchers:", error)
      } else {
        setVouchers((data as VoucherWithType[]) || [])
      }
      setLoading(false)
    }

    fetchMyVouchers()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground text-lg">Carregando seus vouchers...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Meus Vouchers</h1>
        <p className="text-muted-foreground mt-1">
          Todos os vouchers que você comprou.
        </p>
      </div>

      {vouchers.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <p className="text-muted-foreground text-lg">
            Você ainda não comprou nenhum voucher.
          </p>
          <Link href="/vouchers">
            <Button>Ver Vouchers Disponíveis</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vouchers.map((v) => (
            <Card key={v.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{v.voucher_types.name}</CardTitle>
                  <Badge variant={v.status === "active" ? "success" : "destructive"}>
                    {v.status === "active" ? "ATIVO" : "USADO"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(v.voucher_types.value)}
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {v.code}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Comprado em: {new Date(v.created_at).toLocaleString("pt-BR")}
                </p>
                {v.status === "used" && v.used_at && (
                  <p className="text-xs text-muted-foreground">
                    Usado em: {new Date(v.used_at).toLocaleString("pt-BR")}
                  </p>
                )}
                <Link href={`/voucher/${v.code}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Ver QR Code
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
