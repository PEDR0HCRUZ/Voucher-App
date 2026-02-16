import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getCurrentUser } from "@/lib/auth"

// GET /api/validar?code=XXXX - Check voucher status
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const code = request.nextUrl.searchParams.get("code")

  if (!code) {
    return NextResponse.json(
      { error: "Código é obrigatório" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("vouchers")
    .select("*, voucher_types(*)")
    .eq("code", code.toUpperCase())
    .single()

  if (error || !data) {
    return NextResponse.json(
      { valid: false, error: "Voucher não encontrado" },
      { status: 404 }
    )
  }

  return NextResponse.json({
    valid: data.status === "active",
    voucher: {
      id: data.id,
      code: data.code,
      status: data.status,
      used_at: data.used_at,
      voucher_type: {
        name: data.voucher_types.name,
        value: data.voucher_types.value,
        description: data.voucher_types.description,
      },
    },
  })
}

// POST /api/validar - Mark voucher as used
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    if (user.role !== "validador") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        { error: "Código é obrigatório" },
        { status: 400 }
      )
    }

    // Find voucher
    const { data: voucher, error: findError } = await supabase
      .from("vouchers")
      .select("*, voucher_types(*)")
      .eq("code", code.toUpperCase())
      .single()

    if (findError || !voucher) {
      return NextResponse.json(
        { error: "Voucher não encontrado" },
        { status: 404 }
      )
    }

    if (voucher.status === "used") {
      return NextResponse.json(
        { error: "Voucher já foi utilizado", used_at: voucher.used_at },
        { status: 409 }
      )
    }

    // Mark as used with validated_by
    const { error: updateError } = await supabase
      .from("vouchers")
      .update({
        status: "used",
        used_at: new Date().toISOString(),
        validated_by: user.id,
      })
      .eq("id", voucher.id)

    if (updateError) {
      console.error("Error updating voucher:", updateError)
      return NextResponse.json(
        { error: "Erro ao confirmar uso do voucher" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Voucher marcado como usado",
      voucher_type: {
        name: voucher.voucher_types.name,
        value: voucher.voucher_types.value,
      },
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
