import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MP_SUBSCRIPTION_TOKEN = Deno.env.get("MERCADO_PAGO_SUBSCRIPTION_TOKEN") || Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
const MP_CHECKOUT_TOKEN = Deno.env.get("MERCADO_PAGO_CHECKOUT_TOKEN") || Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Content-Type": "application/json"
};

serve(async function (req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    let reqBody;
    try {
      reqBody = await req.json();
    } catch (e) {
      console.error("Erro ao ler JSON da requisição:", e.message);
      return new Response(JSON.stringify({ error: "Payload JSON inválido" }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    // Log detalhado conforme solicitado: "Payload recebido:" para inspecionar os dados
    console.log("Payload recebido:", JSON.stringify(reqBody));

    const paymentType = reqBody.paymentType;
    const external_reference = reqBody.external_reference;
    const email = reqBody.email;
    const transaction_amount = reqBody.transaction_amount;

    // Validação de campos vazios ou nulos
    if (!paymentType) {
      return new Response(JSON.stringify({ error: "Campo paymentType ausente ou vazio" }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    const allowedPaymentTypes = ["native_subscription", "pix_one_time", "card_one_time", "card_recurring"];
    if (!allowedPaymentTypes.includes(paymentType)) {
      return new Response(JSON.stringify({ error: `Tipo de pagamento inválido: ${paymentType}` }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    if (!external_reference) {
      return new Response(JSON.stringify({ error: "Campo external_reference ausente ou vazio" }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    if (!email) {
      return new Response(JSON.stringify({ error: "Campo email ausente ou vazio" }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    if (transaction_amount === undefined || transaction_amount === null) {
      return new Response(JSON.stringify({ error: "Campo transaction_amount ausente ou vazio" }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    const numericAmount = Number(transaction_amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return new Response(JSON.stringify({ error: "Campo transaction_amount deve ser um valor numérico válido maior que zero" }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    // Validação específica para pagamentos com cartão
    if (paymentType === "card_one_time" || paymentType === "card_recurring") {
      if (!reqBody.token) {
        return new Response(JSON.stringify({ error: "Campo token ausente ou vazio para pagamento com cartão" }), {
          headers: corsHeaders,
          status: 400,
        });
      }
      if (!reqBody.payment_method_id) {
        return new Response(JSON.stringify({ error: "Campo payment_method_id ausente ou vazio para pagamento com cartão" }), {
          headers: corsHeaders,
          status: 400,
        });
      }
    }

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
          transaction_amount: numericAmount,
          currency_id: "BRL",
        },
        back_url: "https://treinofisico.netlify.app/perfil",
        status: "pending",
      };
    } else if (paymentType === "pix_one_time") {
      endpoint = "https://api.mercadopago.com/v1/payments";
      body = {
        transaction_amount: Number(transaction_amount),
        description: "Assinatura Treino Físico Premium",
        payment_method_id: "pix",
        payer: {
          email: email
        },
        external_reference: external_reference
      };
    } else if (paymentType === "card_one_time" || paymentType === "card_recurring") {
      endpoint = "https://api.mercadopago.com/v1/payments";
      body = {
        transaction_amount: numericAmount,
        token: reqBody.token,
        description: "Plano Premium - Cartao",
        installments: reqBody.installments || 1,
        payment_method_id: reqBody.payment_method_id,
        payer: reqBody.payer || { email: email },
        external_reference: external_reference
      };
    }

    console.log("Enviando para MP:", endpoint);

    try {
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
        return new Response(JSON.stringify(data), {
          headers: corsHeaders,
          status: 400,
        });
      }

      return new Response(JSON.stringify({
        id: data.id,
        status: data.status,
        init_point: data.init_point,
        qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
        qr_code: data.point_of_interaction?.transaction_data?.qr_code
      }), {
        headers: corsHeaders,
        status: 200,
      });

    } catch (fetchErr) {
      console.error("Erro na chamada do MP:", fetchErr.message);
      return new Response(JSON.stringify({ error: `Erro na chamada do MP: ${fetchErr.message}` }), {
        headers: corsHeaders,
        status: 400,
      });
    }

  } catch (err) {
    // Imprime o erro no console interno da função conforme solicitado
    console.error("Erro na função:", err);
    return new Response(JSON.stringify({ error: err.message, details: err }), {
      headers: corsHeaders,
      status: 400,
    });
  }
});
