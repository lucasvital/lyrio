# Atribuição mobile (UTM) + comissões por influencer

Dashboard temporário para **auditar de onde veio cada cliente** e **calcular a comissão
devida por influencer**. Construído em cima do dashboard existente (Next.js + Neon
Postgres), reusando as integrações de RevenueCat e PostHog.

## Por que existe

No mobile a atribuição por UTM é inconsistente: muitas vezes o `utm_source` não chega,
ou chega com nomes de propriedade diferentes dependendo do evento/SDK. Então o fluxo é:

1. **Automático** — extraímos o melhor sinal de first-touch de cada usuário a partir dos
   eventos do PostHog (UTMs, referrer, URL, payload de `install_attributed` /
   `Deep Link Opened`) e o **cupom** (evento `courtesy_applied` → propriedade
   `coupon_code`).
2. **Manual** — para quem não tem sinal, o auditor abre a linha na aba **Atribuição**,
   vê data + URL + referrer de origem e escolhe o influencer (ou digita a origem).

Regra de resolução da origem (a primeira que casar vence):

1. Influencer atribuído manualmente
2. Cupom → influencer (cupons cadastrados por influencer)
3. Origem livre (texto manual)
4. `utm_source` / sinal automático
5. Sem origem (precisa de auditoria)

## Chaves de API (somente leitura)

Reuse as mesmas variáveis do dashboard — de preferência com chaves **read-only / consulta**:

- **RevenueCat:** Project settings → API keys → crie uma _Secret key (v2)_ só de leitura →
  `REVENUECAT_API_KEY` (+ `REVENUECAT_PROJECT_ID`).
- **PostHog:** Settings → Personal API Keys → escopo _Query Read_ + _Project Read_ →
  `POSTHOG_API_KEY` (+ `POSTHOG_PROJECT_ID`).

Veja `.env.local.example` para a lista completa.

## Banco de dados

Usa o mesmo Postgres do dashboard (Neon free serve). Duas tabelas novas:

- `influencer` — parceiros, cupons e taxa de comissão.
- `user_attribution` — sinais automáticos de first-touch + override manual por usuário.

Criadas automaticamente por `ensureSchema()` no primeiro sync (ou botão **Initialize
database** em Configurações). Migração drizzle equivalente: `0002_mobile_attribution.sql`.

## Como rodar

1. Configure as env vars e faça deploy (ou rode `npm run dev`).
2. Em **Configurações**, rode os syncs nesta ordem:
   **PostHog → RevenueCat → Attribution** (o último cruza os dois).
   - O sync agendado (`.github/workflows/sync.yml`, de hora em hora) já faz os três.
3. Cadastre os influencers na aba **Influencers** (nome, cupons, % de comissão).
4. Na aba **Atribuição**:
   - filtre por **pagantes** (padrão) ou inclua não-pagantes;
   - use **"Só sem origem"** para focar no que falta auditar;
   - busque por email / id / cupom;
   - abra a linha para ver os sinais de origem e atribuir manualmente.
5. Na aba **Influencers**, veja **vendas, receita e comissão** por parceiro
   (comissão = receita atribuída × taxa).

## Notas

- O sync de atribuição faz uma varredura única sobre os eventos espelhados do PostHog;
  re-rodar só atualiza os campos automáticos — **a atribuição manual nunca é sobrescrita**.
- Clientes de cupom cortesia podem ter receita R$ 0 no RevenueCat; ainda assim contam como
  venda atribuída (aparecem como "grátis" na contagem do influencer).
- É um painel de auditoria interna: mantenha as chaves como read-only.
