import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { hashPassword } from "@/lib/auth"
import { generateLoginId } from "@/lib/generate-login-id"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role } = body

    // Validate fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      )
    }

    if (!["cliente", "validador"].includes(role)) {
      return NextResponse.json(
        { error: "Tipo de conta inválido" },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .single<{ id: string }>()

    if (existingUser) {
      return NextResponse.json(
        { error: "Este email já está cadastrado" },
        { status: 409 }
      )
    }

    // Generate unique login_id (retry up to 3 times on collision)
    let loginId = ""
    for (let i = 0; i < 3; i++) {
      const candidate = generateLoginId()
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("login_id", candidate)
        .single<{ id: string }>()

      if (!existing) {
        loginId = candidate
        break
      }
    }

    if (!loginId) {
      return NextResponse.json(
        { error: "Erro ao gerar ID de acesso. Tente novamente." },
        { status: 500 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Insert user
    const { error: insertError } = await supabase.from("users").insert({
      login_id: loginId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      role,
    })

    if (insertError) {
      console.error("Error inserting user:", insertError)
      return NextResponse.json(
        { error: "Erro ao criar conta: " + insertError.message, details: insertError },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        login_id: loginId,
        message: "Conta criada com sucesso! Anote seu ID de acesso.",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Erro interno: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
