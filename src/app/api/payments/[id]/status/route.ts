import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getCurrentUser } from "@/lib/auth"
import { getPaymentStatus } from "@/lib/asaas"
import { createVoucherForPayment } from "@/lib/create-voucher"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const paymentId = params.id

    // Get local payment record
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

    // If already confirmed/received and has voucher, return immediately
    if (
      (payment.status === "CONFIRMED" || payment.status === "RECEIVED") &&
      payment.voucher_id
    ) {
      const { data: voucher } = await supabase
        .from("vouchers")
        .select("code")
        .eq("id", payment.voucher_id)
        .single()

      return NextResponse.json({
        status: payment.status,
        voucher_code: voucher?.code || null,
      })
    }

    // If still awaiting, check Asaas for update
    if (payment.status === "AWAITING_PAYMENT" && payment.asaas_payment_id) {
      const asaasPayment = await getPaymentStatus(payment.asaas_payment_id)

      const isConfirmed =
        asaasPayment.status === "CONFIRMED" ||
        asaasPayment.status === "RECEIVED"

      if (isConfirmed) {
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
      }

      // Check if payment failed/overdue
      if (
        asaasPayment.status === "OVERDUE" ||
        asaasPayment.status === "REFUNDED" ||
        asaasPayment.status === "DELETED"
      ) {
        await supabase
          .from("payments")
          .update({
            status: "FAILED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id)

        return NextResponse.json({ status: "FAILED" })
      }
    }

    return NextResponse.json({
      status: payment.status,
      voucher_code: null,
    })
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json(
      { error: "Erro ao verificar status" },
      { status: 500 }
    )
  }
}
