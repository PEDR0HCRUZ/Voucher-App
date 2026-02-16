import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { supabase } from "@/lib/supabase"
import { getCurrentUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    if (user.role !== "cliente") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const body = await request.json()
    const { voucher_type_id } = body

    if (!voucher_type_id) {
      return NextResponse.json(
        { error: "voucher_type_id é obrigatório" },
        { status: 400 }
      )
    }

    // Verify voucher type exists
    const { data: voucherType, error: typeError } = await supabase
      .from("voucher_types")
      .select("id")
      .eq("id", voucher_type_id)
      .single()

    if (typeError || !voucherType) {
      return NextResponse.json(
        { error: "Tipo de voucher não encontrado" },
        { status: 404 }
      )
    }

    // Generate unique code (10 chars, uppercase friendly)
    const code = nanoid(10).toUpperCase()

    // Insert voucher with user_id
    const { data: voucher, error: insertError } = await supabase
      .from("vouchers")
      .insert({
        code,
        voucher_type_id,
        user_id: user.id,
        status: "active",
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting voucher:", insertError)
      return NextResponse.json(
        { error: "Erro ao criar voucher" },
        { status: 500 }
      )
    }

    return NextResponse.json({ id: voucher.id, code: voucher.code }, { status: 201 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
