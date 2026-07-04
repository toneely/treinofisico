# Guia de Integração Mercado Pago (Recorrência)

Este guia descreve como integrar o checkout do Mercado Pago com o sistema de assinaturas do App Treino Físico.

## 1. Fluxo de Integração

O frontend é responsável por iniciar a assinatura ou pagamento, garantindo que o `user.id` do Supabase seja enviado no campo `external_reference`. A Edge Function `mercado-pago-webhook` usará este ID para atualizar automaticamente o perfil do usuário.

## 2. Configuração do Frontend (React)

Ao criar uma assinatura ou preferência de pagamento, utilize o campo `external_reference` para passar o ID do usuário logado.

### Exemplo usando Checkout Pro (Redirecionamento)

Ao gerar a preferência no seu backend (ou via SDK se permitido):

```json
{
  "items": [ ... ],
  "payer": {
    "email": "email_do_usuario@exemplo.com"
  },
  "external_reference": "ID_DO_USUARIO_SUPABASE"
}
```

### Exemplo para Assinaturas (Preapproval)

```javascript
const subscriptionData = {
  reason: "Assinatura Premium - Treino Físico",
  external_reference: user.id, // OBRIGATÓRIO para vinculação automática
  payer_email: user.email,
  auto_recurring: {
    frequency: 1,
    frequency_type: "months",
    transaction_amount: 29.90,
    currency_id: "BRL"
  },
  back_url: "https://seu-app.com/perfil",
  status: "pending"
};
```

## 3. Webhook de Confirmação

A URL do Webhook que deve ser configurada no painel do Mercado Pago é:
`https://[SEU_PROJETO_SUPABASE].supabase.co/functions/v1/mercado-pago-webhook`

Os eventos que devem ser escutados são:
- `subscription` (preapproval)
- `authorized_payment`

## 4. Liberação Automática

A Edge Function executa os seguintes passos:
1. Recebe a notificação do Mercado Pago.
2. Busca os detalhes completos do recurso via API do MP.
3. Localiza o usuário no Supabase via `external_reference`.
4. Atualiza as colunas:
   - `status_assinatura` -> 'premium'
   - `data_vencimento` -> Calculada a partir da resposta do MP.
   - `mp_customer_id` -> ID do pagador no MP.
   - `mp_subscription_id` -> ID da assinatura no MP.
