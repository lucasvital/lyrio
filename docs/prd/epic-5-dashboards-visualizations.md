# Epic 5 — Advanced Dashboards & Visualizations

**Goal:** Elevar a qualidade das visualizações e da UX acima dos apps nativos — funis interativos, coortes, heatmaps, segmentação avançada e refinamentos de performance/usabilidade.

**Status:** Planning · **Source PRD:** `docs/prd.md` · **Depends on:** Epics 2, 3 e 4

---

## Story 5.1 Advanced Visualization Library

As a user,
I want richer interactive charts,
so that analysis is clearer and faster than native apps.

### Acceptance Criteria
1. Biblioteca de gráficos selecionada e padronizada (funil, coorte/heatmap, séries, barras).
2. Componentes reutilizáveis com tema claro/escuro.
3. Interações: hover/tooltip, zoom/seleção de período no gráfico.
4. Acessibilidade WCAG AA nos componentes de gráfico.
5. Testes de componente para os gráficos principais.

---

## Story 5.2 Advanced Segmentation & Filters

As a user,
I want advanced segmentation and global filters,
so that I can slice all dashboards consistently.

### Acceptance Criteria
1. Filtros globais (período + segmentos) persistem entre telas.
2. Segmentação por atributos combinados (comportamento + plano/assinatura).
3. Estados de filtro refletidos na URL (compartilhável).
4. Performance mantida (< 2s) com filtros aplicados.
5. Testes cobrem persistência e aplicação dos filtros.

---

## Story 5.3 Overview Command Center

As a user,
I want a combined overview screen,
so that I see the most important unified KPIs at a glance.

### Acceptance Criteria
1. Tela "Visão Geral" com KPIs combinados (produto + receita + cruzamentos-chave).
2. Cards com variação vs. período anterior.
3. Links de drill-down para as visões específicas.
4. Layout responsivo e acessível.
5. Carregamento < 2s.
