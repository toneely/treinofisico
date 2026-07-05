import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MP_SUBSCRIPTION_TOKEN = Deno.env.get("MERCADO_PAGO_SUBSCRIPTION_TOKEN") || Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
const MP_CHECKOUT_TOKEN = Deno.env.get("MERCADO_PAGO_CHECKOUT_TOKEN") || Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const responseHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

serve(async function (req) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const reqBody = await req.json();
    console.log("Payload recebido do App:", JSON.stringify(reqBody));

    const paymentType = reqBody.paymentType;
    const external_reference = reqBody.external_reference;
    const email = reqBody.email;
    const transaction_amount = reqBody.transaction_amount || 29.90;

    let accessToken = MP_CHECKOUT_TOKEN;
    let endpoint = "";
    let body = {};

    if (paymentType === "native_subscription") {
      accessToken = MP_SUBSCRIPTION_TOKEN;
      endpoint = "https://api.mercadopago.com/preapproval";
      body = {
        reason: "Assinatura Premium (Nativa)",
        external_reference: external_reference,
        payer_email: email,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: transaction_amount,
          currency_id: "BRL",
        },
        back_url: "https://treinofisico.netlify.app/perfil",
        status: "pending",
      };
    } else if (paymentType === "pix_one_time") {
      endpoint = "https://api.mercadopago.com/v1/payments";
      body = {
        transaction_amount: transaction_amount,
        description: "Plano Premium - Pix",
        payment_method_id: "pix",
        payer: { email: email },
        external_reference: external_reference
      };
    } else if (paymentType === "card_one_time" || paymentType === "card_recurring") {
      endpoint = "https://api.mercadopago.com/v1/payments";
      body = {
        transaction_amount: transaction_amount,
        token: reqBody.token,
        description: "Plano Premium - Cartao",
        installments: reqBody.installments || 1,
        payment_method_id: reqBody.payment_method_id,
        payer: reqBody.payer || { email: email },
        external_reference: external_reference
      };
    } else {
      throw new Error("Tipo de pagamento invalido");
    }

    console.log("Enviando para MP:", endpoint, "Valor:", transaction_amount);

    const mpResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID()
      },
      body: JSON.stringify(body),
    });

    const data = await mpResponse.json();
    console.log("Resposta do MP:", JSON.stringify(data));

    if (!mpResponse.ok) {
      throw new Error(JSON.stringify(data));
    }

    return new Response(JSON.stringify({
      id: data.id,
      status: data.status,
      init_point: data.init_point,
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
      qr_code: data.point_of_interaction?.transaction_data?.qr_code
    }), {
      headers: responseHeaders,
      status: 200,
    });

  } catch (err) {
    console.error("Erro Critico na Function:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: responseHeaders,
      status: 400,
    });
  }
});
