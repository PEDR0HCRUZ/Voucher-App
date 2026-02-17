import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getCurrentUser } from "@/lib/auth"
import {
  createCustomer,
  findCustomerByCpf,
  createPixPayment,
  createCreditCardPayment,
  getPixQrCode,
} from "@/lib/asaas"
import { createVoucherForPayment } from "@/lib/create-voucher"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    if (user.role !== "cliente") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const body = await request.json()
    const { voucher_type_id, billing_type, cpf, name, email } = body

    if (!voucher_type_id || !billing_type || !cpf) {
      return NextResponse.json(
        { error: "Campos obrigatórios: voucher_type_id, billing_type, cpf" },
        { status: 400 }
      )
    }

    // Get voucher type to know the price
    const { data: voucherType, error: vtError } = await supabase
      .from("voucher_types")
      .select("id, name, value")
      .eq("id", voucher_type_id)
      .single()

    if (vtError || !voucherType) {
      return NextResponse.json(
        { error: "Tipo de voucher não encontrado" },
        { status: 404 }
      )
    }

    // Create or find Asaas customer
    let customer = await findCustomerByCpf(cpf.replace(/\D/g, ""))
    if (!customer) {
      customer = await createCustomer({
        name: name || user.name,
        cpfCnpj: cpf.replace(/\D/g, ""),
        email: email || user.email,
      })
    }

    // Create local payment record first
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        voucher_type_id,
        billing_type,
        value: voucherType.value,
        status: "PENDING",
        asaas_customer_id: customer.id,
      })
      .select("id")
      .single()

    if (paymentError || !payment) {
      console.error("Error creating payment:", paymentError)
      return NextResponse.json(
        { error: "Erro ao criar pagamento" },
        { status: 500 }
      )
    }

    const description = `Voucher - ${voucherType.name}`

    if (billing_type === "PIX") {
      // Create PIX payment on Asaas
      const asaasPayment = await createPixPayment({
        customer: customer.id,
        value: Number(voucherType.value),
        description,
        externalReference: payment.id,
      })

      // Get QR Code
      const qrCode = await getPixQrCode(asaasPayment.id)

      // Update local payment with Asaas data
      await supabase
        .from("payments")
        .update({
          asaas_payment_id: asaasPayment.id,
          status: "AWAITING_PAYMENT",
          pix_encoded_image: qrCode.encodedImage,
          pix_payload: qrCode.payload,
          pix_expiration_date: qrCode.expirationDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id)

      return NextResponse.json({
        paymentId: payment.id,
        status: "AWAITING_PAYMENT",
        pix: {
          encodedImage: qrCode.encodedImage,
          payload: qrCode.payload,
          expirationDate: qrCode.expirationDate,
        },
      })
    } else if (billing_type === "CREDIT_CARD") {
      const { creditCard, creditCardHolderInfo } = body

      if (!creditCard || !creditCardHolderInfo) {
        return NextResponse.json(
          { error: "Dados do cartão são obrigatórios" },
          { status: 400 }
        )
      }

      // Get remote IP for fraud detection
      const remoteIp =
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        "127.0.0.1"

      const asaasPayment = await createCreditCardPayment({
        customer: customer.id,
        value: Number(voucherType.value),
        description,
        externalReference: payment.id,
        creditCard,
        creditCardHolderInfo,
        remoteIp,
      })

      // Credit card is captured immediately
      const isConfirmed =
        asaasPayment.status === "CONFIRMED" ||
        asaasPayment.status === "RECEIVED"

      // Update local payment
      await supabase
        .from("payments")
        .update({
          asaas_payment_id: asaasPayment.id,
          status: isConfirmed ? "CONFIRMED" : "FAILED",
          credit_card_token: asaasPayment.creditCardToken || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id)

      if (isConfirmed) {
        // Create voucher immediately
        const voucher = await createVoucherForPayment(
          payment.id,
          user.id,
          voucher_type_id
        )

        return NextResponse.json({
          paymentId: payment.id,
          status: "CONFIRMED",
          voucher_code: voucher.code,
        })
      } else {
        return NextResponse.json(
          { error: "Pagamento não aprovado", status: asaasPayment.status },
          { status: 402 }
        )
      }
    } else {
      return NextResponse.json(
        { error: "billing_type deve ser PIX ou CREDIT_CARD" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Payment error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar pagamento",
      },
      { status: 500 }
    )
  }
}
