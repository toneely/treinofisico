import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MP_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

serve(async (req) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  try {
    const body = await req.json()
    console.log("Webhook received:", JSON.stringify(body, null, 2))

    const { type, action, data } = body
    const resourceId = data?.id

    if (!resourceId) {
      return new Response("No resource ID found", { status: 400 })
    }

    let userId: string | null = null
    let subscriptionId: string | null = null
    let customerId: string | null = null
    let expirationDate: string | null = null
    let status: string = "free"

    // 1. Handle Subscription (Preapproval)
    if (type === "subscription" || type === "preapproval") {
      const response = await fetch(`https://api.mercadopago.com/preapproval/${resourceId}`, {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
      })
      const mpData = await response.json()
      console.log("MP Preapproval details:", JSON.stringify(mpData, null, 2))

      userId = mpData.external_reference
      subscriptionId = mpData.id
      customerId = mpData.payer_id

      if (mpData.status === "authorized") {
        status = "premium"
        // Subscriptions usually have a next_payment_date or we can use auto_recurring.end_date
        expirationDate = mpData.next_payment_date || mpData.auto_recurring?.end_date
      }
    }

    // 2. Handle Authorized Payment
    else if (type === "authorized_payment") {
      const response = await fetch(`https://api.mercadopago.com/authorized_payments/${resourceId}`, {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
      })
      const mpData = await response.json()
      console.log("MP Authorized Payment details:", JSON.stringify(mpData, null, 2))

      subscriptionId = mpData.preapproval_id

      // If we don't have external_reference in authorized_payment,
      // we might need to fetch the preapproval (subscription) to get the user ID
      if (subscriptionId) {
        const subResponse = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
          headers: {
            Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          },
        })
        const subData = await subResponse.json()
        userId = subData.external_reference
        customerId = subData.payer_id
      }

      if (mpData.payment?.status === "approved" || mpData.status === "approved") {
        status = "premium"
        // Set expiration date to next month if it's a recurring payment
        const nextDate = new Date()
        nextDate.setMonth(nextDate.getMonth() + 1)
        expirationDate = nextDate.toISOString()
      }
    }

    if (userId && status === "premium") {
      console.log(`Updating user ${userId} to premium. Expiration: ${expirationDate}`)

      const { error } = await supabase
        .from("usuarios")
        .update({
          status_assinatura: status,
          data_vencimento: expirationDate,
          mp_customer_id: customerId?.toString(),
          mp_subscription_id: subscriptionId?.toString(),
        })
        .eq("id", userId)

      if (error) {
        console.error("Error updating user:", error)
        return new Response("Error updating database", { status: 500 })
      }
    } else {
      console.log("No user ID found or status not premium. Skipping update.")
    }

    return new Response("Webhook processed", { status: 200 })
  } catch (err) {
    console.error("Webhook error:", err)
    return new Response("Internal Server Error", { status: 500 })
  }
})
