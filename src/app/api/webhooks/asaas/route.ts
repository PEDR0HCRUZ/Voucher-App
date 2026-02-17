import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createVoucherForPayment } from "@/lib/create-voucher"

export async function POST(request: NextRequest) {
  try {
    // Verify webhook token
    const webhookToken = request.headers.get("asaas-access-token")
    if (
      process.env.ASAAS_WEBHOOK_TOKEN &&
      webhookToken !== process.env.ASAAS_WEBHOOK_TOKEN
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { event, payment: asaasPayment } = body

    console.log("Asaas webhook received:", event, asaasPayment?.id)

    // Only process payment confirmation events
    if (
      event !== "PAYMENT_CONFIRMED" &&
      event !== "PAYMENT_RECEIVED"
    ) {
      return NextResponse.json({ received: true })
    }

    if (!asaasPayment?.id) {
      return NextResponse.json({ received: true })
    }

    // Find local payment by Asaas payment ID
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("asaas_payment_id", asaasPayment.id)
      .single()

    if (!payment) {
      console.error("Payment not found for Asaas ID:", asaasPayment.id)
      return NextResponse.json({ received: true })
    }

    // Skip if already processed
    if (payment.status === "RECEIVED" || payment.status === "CONFIRMED") {
      return NextResponse.json({ received: true })
    }

    // Update payment status
    await supabase
      .from("payments")
      .update({
        status: event === "PAYMENT_RECEIVED" ? "RECEIVED" : "CONFIRMED",
        asaas_webhook_data: body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)

    // Create voucher if not already created
    if (!payment.voucher_id) {
      try {
        await createVoucherForPayment(
          payment.id,
          payment.user_id,
          payment.voucher_type_id
        )
        console.log("Voucher created via webhook for payment:", payment.id)
      } catch (err) {
        console.error("Error creating voucher via webhook:", err)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    // Always return 200 to prevent Asaas retry backoff
    return NextResponse.json({ received: true })
  }
}
