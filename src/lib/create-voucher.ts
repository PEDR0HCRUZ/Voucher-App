import { nanoid } from "nanoid"
import { supabase } from "./supabase"

export async function createVoucherForPayment(
  paymentId: string,
  userId: string,
  voucherTypeId: string
): Promise<{ code: string; id: string }> {
  // Idempotency: check if voucher already exists for this payment
  const { data: existingPayment } = await supabase
    .from("payments")
    .select("voucher_id")
    .eq("id", paymentId)
    .single()

  if (existingPayment?.voucher_id) {
    // Voucher already created, fetch and return it
    const { data: existingVoucher } = await supabase
      .from("vouchers")
      .select("id, code")
      .eq("id", existingPayment.voucher_id)
      .single()

    if (existingVoucher) {
      return { code: existingVoucher.code, id: existingVoucher.id }
    }
  }

  // Generate unique code
  const code = nanoid(10).toUpperCase()

  // Create voucher
  const { data: voucher, error: voucherError } = await supabase
    .from("vouchers")
    .insert({
      code,
      voucher_type_id: voucherTypeId,
      user_id: userId,
      payment_id: paymentId,
      status: "active",
    })
    .select("id, code")
    .single()

  if (voucherError || !voucher) {
    console.error("Error creating voucher:", voucherError)
    throw new Error("Erro ao criar voucher")
  }

  // Link voucher to payment
  await supabase
    .from("payments")
    .update({ voucher_id: voucher.id, status: "RECEIVED" })
    .eq("id", paymentId)

  return { code: voucher.code, id: voucher.id }
}
