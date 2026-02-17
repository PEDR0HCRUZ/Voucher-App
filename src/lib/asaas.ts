const ASAAS_API_KEY = process.env.ASAAS_API_KEY!
const ASAAS_BASE_URL =
  process.env.ASAAS_SANDBOX === "true"
    ? "https://sandbox.asaas.com/api/v3"
    : "https://api.asaas.com/v3"

async function asaasRequest(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${ASAAS_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
      ...options?.headers,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    console.error("Asaas API error:", data)
    throw new Error(data.errors?.[0]?.description || "Erro na API do Asaas")
  }

  return data
}

// ==================
// Customers
// ==================

export async function createCustomer(data: {
  name: string
  cpfCnpj: string
  email?: string
}) {
  return asaasRequest("/customers", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function findCustomerByCpf(cpfCnpj: string) {
  const data = await asaasRequest(
    `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`
  )
  return data.data?.[0] || null
}

// ==================
// PIX Payments
// ==================

export async function createPixPayment(data: {
  customer: string
  value: number
  description: string
  externalReference?: string
}) {
  return asaasRequest("/payments", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      billingType: "PIX",
      dueDate: new Date().toISOString().split("T")[0], // today
    }),
  })
}

export async function getPixQrCode(paymentId: string) {
  return asaasRequest(`/payments/${paymentId}/pixQrCode`)
}

// ==================
// Credit Card Payments
// ==================

export async function createCreditCardPayment(data: {
  customer: string
  value: number
  description: string
  externalReference?: string
  creditCard: {
    holderName: string
    number: string
    expiryMonth: string
    expiryYear: string
    ccv: string
  }
  creditCardHolderInfo: {
    name: string
    email: string
    cpfCnpj: string
    postalCode: string
    addressNumber: string
    phone: string
  }
  remoteIp: string
}) {
  return asaasRequest("/payments", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      billingType: "CREDIT_CARD",
      dueDate: new Date().toISOString().split("T")[0],
    }),
  })
}

// ==================
// Payment Status
// ==================

export async function getPaymentStatus(paymentId: string) {
  return asaasRequest(`/payments/${paymentId}`)
}
