import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Tone confirmed these secrets in the Vault:
const MP_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") // Old app
const MP_CHECKOUT_TOKEN = Deno.env.get("MERCADO_PAGO_CHECKOUT_TOKEN") // New app (Transparent Checkout)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

async function fetchFromMP(url: string) {
  // Try with Checkout Token first (New app)
  let response = await fetch(url, {
    headers: { Authorization: `Bearer ${MP_CHECKOUT_TOKEN}` },
  })

  let data = await response.json()

  // If not found or unauthorized, try with Native Access Token (Old app)
  if (!response.ok || data.status === 404 || data.status === 401) {
    console.log("Retrying with Native Access Token...")
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    })
    data = await response.json()
  }

  return { response, data }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  try {
    const body = await req.json()
    console.log("Webhook received:", JSON.stringify(body, null, 2))

    const { type, data: resourceData } = body
    const resourceId = resourceData?.id

    if (!resourceId) {
      return new Response("No resource ID found", { status: 200 })
    }

    let userId: string | null = null
    let status: string = "free"
    let mp_customer_id: string | null = null
    let mp_subscription_id: string | null = null

    // 1. Handle Subscription (Preapproval)
    if (type === "subscription" || type === "preapproval") {
      const { data: mpData } = await fetchFromMP(`https://api.mercadopago.com/preapproval/${resourceId}`)
      console.log("MP Preapproval details:", JSON.stringify(mpData, null, 2))

      userId = mpData.external_reference
      mp_subscription_id = mpData.id
      mp_customer_id = mpData.payer_id?.toString()

      if (mpData.status === "authorized") {
        status = "premium"
      }
    }

    // 2. Handle Authorized Payment (Subscription component)
    else if (type === "authorized_payment") {
      const { data: mpData } = await fetchFromMP(`https://api.mercadopago.com/v1/authorized_payments/${resourceId}`)
      console.log("MP Authorized Payment details:", JSON.stringify(mpData, null, 2))

      if (mpData.payment?.status === "approved" || mpData.status === "approved") {
        status = "premium"
        mp_subscription_id = mpData.preapproval_id

        if (mpData.external_reference) {
          userId = mpData.external_reference
        } else if (mpData.preapproval_id) {
          const { data: subData } = await fetchFromMP(`https://api.mercadopago.com/preapproval/${mpData.preapproval_id}`)
          userId = subData.external_reference
          mp_customer_id = subData.payer_id?.toString()
        }
      }
    }

    // 3. Handle Regular Payment (Checkout Transparente / Pix)
    else if (type === "payment") {
      const { data: mpData } = await fetchFromMP(`https://api.mercadopago.com/v1/payments/${resourceId}`)
      console.log("MP Payment details:", JSON.stringify(mpData, null, 2))

      userId = mpData.external_reference
      mp_customer_id = mpData.payer?.id?.toString()

      if (mpData.status === "approved") {
        status = "premium"
      }
    }

    if (userId && status === "premium") {
      console.log(`Processing premium for user ${userId}`)

      const { data: userProfile } = await supabase
        .from("usuarios")
        .select("data_vencimento")
        .eq("id", userId)
        .single()

      let baseDate = new Date()
      if (userProfile?.data_vencimento) {
        const currentVencimento = new Date(userProfile.data_vencimento)
        if (currentVencimento > baseDate) {
          baseDate = currentVencimento
        }
      }

      const newExpiration = new Date(baseDate)
      newExpiration.setDate(newExpiration.getDate() + 30)

      const { error } = await supabase
        .from("usuarios")
        .update({
          status_assinatura: "premium",
          data_vencimento: newExpiration.toISOString(),
          mp_customer_id: mp_customer_id,
          mp_subscription_id: mp_subscription_id,
        })
        .eq("id", userId)

      if (error) {
        console.error("Error updating user:", error)
        return new Response("Error updating database", { status: 500 })
      }

      console.log(`User ${userId} updated to premium until ${newExpiration.toISOString()}`)
    }

    return new Response("Webhook processed", { status: 200 })
  } catch (err) {
    console.error("Webhook error:", err)
    return new Response("Internal Server Error", { status: 500 })
  }
})
