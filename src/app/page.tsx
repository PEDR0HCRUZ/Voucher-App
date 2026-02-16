import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

export default async function Home() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  } else if (user.role === "validador") {
    redirect("/validar")
  } else {
    redirect("/vouchers")
  }
}
