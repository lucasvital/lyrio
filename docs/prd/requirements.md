# Requirements

## Functional

- **FR1:** Login/logout via Auth.js (OAuth Google e/ou e-mail).
- **FR2:** Rotas do dashboard protegidas; não autenticados redirecionados ao login.
- **FR3:** Gestão segura de sessão (cookie httpOnly, expiração configurável).
- **FR4:** Conectar à API do PostHog (Cloud US) e ingerir events, insights/trends, funis, retenção, persons, cohorts.
- **FR5:** Jobs de sync agendados persistem dados do PostHog em Postgres, incrementalmente.
- **FR6:** Conectar à API do RevenueCat e ingerir subscribers, entitlements, transactions, métricas de receita (MRR, ativos, churn, trials, conversão).
- **FR7:** Jobs de sync agendados persistem dados do RevenueCat em Postgres, incrementalmente.
- **FR8:** Unir usuário PostHog ↔ assinante RevenueCat por `distinct_id` ↔ `app_user_id`.
- **FR9:** Perfil de usuário unificado (comportamento + receita).
- **FR10:** Dashboards **separados** do PostHog.
- **FR11:** Dashboards **separados** do RevenueCat.
- **FR12:** Dashboards **unificados** (receita por coorte, funil ativação→assinatura, LTV por feature/canal).
- **FR13:** Filtro por intervalo de datas e segmentação básica em todos os dashboards.
- **FR14:** Visualizações: séries temporais, barras, funis, heatmaps de coorte — superiores aos apps nativos.
- **FR15:** Sync manual disparável + status/última atualização por fonte.
- **FR16:** Área de configuração de credenciais de API (server-side).

## Non Functional

- **NFR1:** Front+back na Vercel (App Router + route handlers + Vercel Cron).
- **NFR2:** Segredos/chaves em env vars, nunca expostos ao cliente.
- **NFR3:** Chamadas às APIs externas sempre server-side.
- **NFR4:** Respeitar rate limits com retry/backoff exponencial.
- **NFR5:** Carregamento inicial dos dashboards < 2s para intervalos padrão (lendo do banco).
- **NFR6:** Frequência de sync configurável (default horário).
- **NFR7:** TypeScript + testes unit + integration nos pontos críticos.
- **NFR8:** Web responsiva, WCAG AA.
- **NFR9:** Sync incremental (cursor/checkpoint).
- **NFR10:** Logs estruturados e observabilidade mínima dos jobs.
