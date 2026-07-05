import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MP_NATIVE_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")
const MP_CHECKOUT_TOKEN = Deno.env.get("MERCADO_PAGO_CHECKOUT_TOKEN")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    })
  }

  try {
    const { paymentType, external_reference, email, cardToken, paymentMethodId, installments, issuerId } = await req.json()

    if (paymentType === "native_subscription") {
      // Native Subscription remains using /preapproval and the old token
      const response = await fetch("https://api.mercadopago.com/preapproval", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MP_NATIVE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Assinatura Premium (Nativa) - Treino Físico",
          external_reference: external_reference,
          payer_email: email,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: 29.90,
            currency_id: "BRL",
          },
          back_url: "https://treinofisico.netlify.app/perfil",
          status: "pending",
        }),
      })
      const data = await response.json()
      return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
    }

    // For all other types, use MP_CHECKOUT_TOKEN and /v1/payments
    let body: any = {
      transaction_amount: 29.90,
      description: "Plano Premium - Treino Físico",
      external_reference: external_reference,
      payer: {
        email: email,
      },
      installments: installments || 1,
      payment_method_id: paymentMethodId,
      token: cardToken,
      issuer_id: issuerId,
    }

    if (paymentType === "pix_one_time") {
      body.payment_method_id = "pix"
      // Pix specific payer info often required
      body.payer.first_name = "Atleta"
      body.payer.last_name = "TreinoFisico"
    }

    // Handle Customer for card_recurring
    if (paymentType === "card_recurring") {
      // 1. Check if user already has mp_customer_id
      const { data: userData } = await supabase
        .from("usuarios")
        .select("mp_customer_id")
        .eq("id", external_reference)
        .single()

      let customerId = userData?.mp_customer_id

      if (!customerId) {
        // Create Customer in MP
        const custResp = await fetch("https://api.mercadopago.com/v1/customers", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${MP_CHECKOUT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email }),
        })
        const custData = await custResp.json()
        customerId = custData.id

        // Save to Supabase
        await supabase.from("usuarios").update({ mp_customer_id: customerId }).eq("id", external_reference)
      }

      // Associate payment with customer
      body.payer.id = customerId
    }

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_CHECKOUT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    console.log(`Direct Payment (${paymentType}) Response:`, JSON.stringify(data, null, 2))

    if (!response.ok) {
      throw new Error(data.message || "Erro no processamento do pagamento")
    }

    // Extract Pix details if applicable
    let result: any = { status: data.status, id: data.id }
    if (paymentType === "pix_one_time") {
      result.qr_code = data.point_of_interaction?.transaction_data?.qr_code_base64
      result.qr_code_copy_paste = data.point_of_interaction?.transaction_data?.qr_code
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 200,
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      status: 400,
    })
  }
})
