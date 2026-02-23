import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { comparePassword, createToken, setAuthCookie } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { login_id, password } = body

    if (!login_id || !password) {
      return NextResponse.json(
        { error: "Email/ID de acesso e senha são obrigatórios" },
        { status: 400 }
      )
    }

    const identifier = login_id.trim()

    // Check if it's an email (contains @) or a login_id
    const isEmail = identifier.includes("@")

    let data, error

    if (isEmail) {
      const result = await supabase
        .from("users")
        .select("id, login_id, name, email, password_hash, role")
        .eq("email", identifier.toLowerCase())
        .single()
      data = result.data
      error = result.error
    } else {
      const result = await supabase
        .from("users")
        .select("id, login_id, name, email, password_hash, role")
        .eq("login_id", identifier.toUpperCase())
        .single()
      data = result.data
      error = result.error
    }

    const user = data as { id: string; login_id: string; name: string; email: string; password_hash: string; role: string } | null

    if (error || !user) {
      return NextResponse.json(
        { error: "Email/ID ou senha incorretos" },
        { status: 401 }
      )
    }

    // Check password
    const valid = await comparePassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json(
        { error: "ID ou senha incorretos" },
        { status: 401 }
      )
    }

    // Create JWT and set cookie
    const token = await createToken({
      id: user.id,
      login_id: user.login_id,
      name: user.name,
      email: user.email,
      role: user.role as "cliente" | "validador",
    })

    setAuthCookie(token)

    return NextResponse.json({
      user: {
        id: user.id,
        login_id: user.login_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
