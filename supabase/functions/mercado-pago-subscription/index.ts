import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const MP_SUBSCRIPTION_TOKEN = Deno.env.get("MERCADO_PAGO_SUBSCRIPTION_TOKEN") || Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")
const MP_CHECKOUT_TOKEN = Deno.env.get("MERCADO_PAGO_CHECKOUT_TOKEN") || Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")

serve(async (req) => {
  // CORS handling
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    })
  }

  try {
    const { paymentType, external_reference, email } = await req.json()

    // Determine which token and which endpoint to use
    let accessToken = MP_CHECKOUT_TOKEN
    let endpoint = "https://api.mercadopago.com/preapproval"
    let body: any = {}

    if (paymentType === "native_subscription") {
      accessToken = MP_SUBSCRIPTION_TOKEN
      endpoint = "https://api.mercadopago.com/preapproval"
      body = {
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
      }
    } else if (paymentType === "card_recurring") {
      accessToken = MP_CHECKOUT_TOKEN
      endpoint = "https://api.mercadopago.com/preapproval"
      body = {
        reason: "Assinatura Premium (Recorrente) - Treino Físico",
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
      }
    } else if (paymentType === "card_one_time" || paymentType === "pix_one_time") {
      accessToken = MP_CHECKOUT_TOKEN
      endpoint = "https://api.mercadopago.com/checkout/preferences"
      body = {
        items: [
          {
            title: "Plano Premium (1 Mês) - Treino Físico",
            quantity: 1,
            unit_price: 29.90,
            currency_id: "BRL",
          }
        ],
        external_reference: external_reference,
        payer: {
          email: email,
        },
        back_urls: {
          success: "https://treinofisico.netlify.app/perfil",
          failure: "https://treinofisico.netlify.app/perfil",
          pending: "https://treinofisico.netlify.app/perfil",
        },
        auto_return: "approved",
      }

      if (paymentType === "pix_one_time") {
        body.payment_methods = {
          excluded_payment_types: [
            { id: "credit_card" },
            { id: "debit_card" },
            { id: "ticket" }
          ],
          installments: 1
        }
      } else {
        body.payment_methods = {
          excluded_payment_types: [
            { id: "ticket" },
            { id: "bank_transfer" } // Pix is usually bank_transfer
          ]
        }
      }
    } else {
      throw new Error("Tipo de pagamento inválido")
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    console.log(`Mercado Pago (${paymentType}) Response:`, JSON.stringify(data, null, 2))

    if (!response.ok) {
      throw new Error(data.message || "Erro na comunicação com Mercado Pago")
    }

    return new Response(JSON.stringify({
      id: data.id,
      init_point: data.init_point
    }), {
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
