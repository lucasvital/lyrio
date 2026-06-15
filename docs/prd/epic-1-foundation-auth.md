# Epic 1 — Foundation & Auth

**Goal:** Estabelecer toda a fundação técnica — projeto Next.js, autenticação, banco de dados, CI/CD e deploy na Vercel — entregando já um incremento implantável: um dashboard "shell" protegido por login e uma rota de health-check verificável em produção.

**Status:** Planning · **Source PRD:** `docs/prd.md`

---

## Story 1.1 Project Scaffolding & Health Check

As a developer,
I want a Next.js (App Router, TypeScript) project scaffolded and deployable to Vercel,
so that we have a verified foundation to build on.

### Acceptance Criteria
1. Projeto Next.js (App Router + TypeScript) criado na raiz do repositório, com lint e typecheck configurados.
2. Rota `/api/health` retorna `200` com status do app e timestamp.
3. Página inicial pública renderiza um "canary" simples confirmando o build.
4. Deploy na Vercel funcional; a rota de health responde em produção.
5. README com instruções de setup local e variáveis de ambiente necessárias.

---

## Story 1.2 Database Setup & Schema Baseline

As a developer,
I want a Postgres database connected with a baseline schema and migrations,
so that we can persist synced data reliably.

### Acceptance Criteria
1. Conexão Postgres configurada via env var, server-side apenas.
2. Ferramenta de migração configurada (ORM a definir pelo @architect).
3. Migração inicial cria tabelas-base e tabela de controle de sync (cursores/checkpoints).
4. Script de migração roda em ambiente local e em produção (Vercel).
5. Teste de integração valida conexão e execução de uma query simples.

---

## Story 1.3 Authentication with Auth.js

As a user,
I want to log in and out securely,
so that only authorized people access the dashboard.

### Acceptance Criteria
1. Auth.js (NextAuth) configurado com ao menos um provedor (Google e/ou e-mail).
2. Sessão persistida com cookie httpOnly e expiração configurável.
3. Login bem-sucedido redireciona ao dashboard; logout encerra a sessão.
4. Credenciais/segredos em env vars, nunca expostos ao cliente.
5. Testes cobrem fluxo de login, logout e expiração de sessão.

---

## Story 1.4 Protected App Shell & Navigation

As a user,
I want a protected dashboard shell with navigation,
so that I have a consistent place to access all analytics views.

### Acceptance Criteria
1. Middleware/guard redireciona usuários não autenticados para `/login`.
2. Layout com navegação lateral (Visão Geral, PostHog, RevenueCat, Unificado, Configurações) — telas podem ser placeholders.
3. Filtro global de período presente no layout (sem dados reais ainda).
4. Layout responsivo e acessível (WCAG AA básico).
5. Deploy na Vercel com o shell protegido funcionando em produção.
