import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getCurrentUser } from "@/lib/auth"
import { createVoucherForPayment } from "@/lib/create-voucher"

// POST /api/payments/[id]/simulate - Simulate payment confirmation (sandbox only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Only allow in sandbox mode
    if (process.env.ASAAS_SANDBOX !== "true") {
      return NextResponse.json(
        { error: "Simulação disponível apenas em sandbox" },
        { status: 403 }
      )
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const paymentId = params.id

    // Get payment
    const { data: payment, error } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .eq("user_id", user.id)
      .single()

    if (error || !payment) {
      return NextResponse.json(
        { error: "Pagamento não encontrado" },
        { status: 404 }
      )
    }

    if (payment.status === "CONFIRMED" || payment.status === "RECEIVED") {
      // Already confirmed, just return the voucher
      if (payment.voucher_id) {
        const { data: voucher } = await supabase
          .from("vouchers")
          .select("code")
          .eq("id", payment.voucher_id)
          .single()

        return NextResponse.json({
          status: "RECEIVED",
          voucher_code: voucher?.code,
        })
      }
    }

    // Simulate: update payment to RECEIVED
    await supabase
      .from("payments")
      .update({
        status: "RECEIVED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId)

    // Create voucher
    const voucher = await createVoucherForPayment(
      payment.id,
      payment.user_id,
      payment.voucher_type_id
    )

    return NextResponse.json({
      status: "RECEIVED",
      voucher_code: voucher.code,
    })
  } catch (error) {
    console.error("Simulate error:", error)
    return NextResponse.json(
      { error: "Erro ao simular pagamento" },
      { status: 500 }
    )
  }
}
