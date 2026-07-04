# P&P Perdas e Prevencoes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a navigable P&P module in the WMS frontend with a Perdas e Prevencoes page, internal tabs, mock operational data, and tests for route/menu/content.

**Architecture:** Add one focused page component, wire it into the existing route table, and add one NAV item in a new P&P group positioned after Outbound and before Operacao. Keep all demo data inside the page for this first UI validation, avoiding store changes and backend assumptions.

**Tech Stack:** React 19, React Router, TypeScript, Vite, Tailwind CSS, lucide-react, existing `Badge`, `PageHeader`, `Tabs`, and `Tab` components.

## Global Constraints

- Do not display personal names cited during meetings; use role/process labels only.
- The central concept is `Caso de Indenizacao`.
- The sidebar group must be `P&P`, positioned between `Outbound` and `Operacao`.
- The sidebar item must be `Perdas e Prevencoes`.
- First delivery uses mock data only.

---

### Task 1: Navigation Contract

**Files:**
- Test: `tests/perdasPrevencoesNavigation.test.ts`
- Modify: `src/components/nav.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces route `/perdas-prevencoes`.
- Produces NAV item `{ to: '/perdas-prevencoes', label: 'Perdas e Prevencoes', group: 'P&P' }`.

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const navSource = readFileSync(new URL('../src/components/nav.ts', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

const outboundIndex = navSource.indexOf("group: 'Outbound'")
const ppIndex = navSource.indexOf("group: 'P&P'")
const operacaoIndex = navSource.indexOf("group: 'Operacao'")

assert.ok(outboundIndex >= 0, 'o menu deve manter o grupo Outbound')
assert.ok(ppIndex > outboundIndex, 'o grupo P&P deve ficar depois de Outbound')
assert.ok(operacaoIndex > ppIndex, 'o grupo P&P deve ficar antes de Operacao')
assert.ok(navSource.includes("to: '/perdas-prevencoes'"), 'o menu deve apontar para /perdas-prevencoes')
assert.ok(navSource.includes("label: 'Perdas e Prevencoes'"), 'o item do menu deve se chamar Perdas e Prevencoes')
assert.ok(appSource.includes("import PerdasPrevencoes from './pages/PerdasPrevencoes'"), 'App deve importar a pagina')
assert.ok(appSource.includes('path="/perdas-prevencoes"'), 'App deve registrar a rota P&P')
assert.ok(appSource.includes('<PerdasPrevencoes />'), 'App deve renderizar a pagina P&P na rota')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types tests/perdasPrevencoesNavigation.test.ts`
Expected: FAIL because the route/menu item are absent.

- [ ] **Step 3: Add minimal navigation and route wiring**

Add `ShieldCheck` to `src/components/nav.ts` imports, add the NAV item after Expedicao, import `PerdasPrevencoes` in `src/App.tsx`, and add the route inside the authenticated shell.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types tests/perdasPrevencoesNavigation.test.ts`
Expected: PASS.

### Task 2: P&P Page Content

**Files:**
- Test: `tests/perdasPrevencoesContent.test.ts`
- Create: `src/pages/PerdasPrevencoes.tsx`

**Interfaces:**
- Produces page title `Perdas e Prevencoes`.
- Produces tabs: `Cockpit`, `Cobrancas / Importacoes`, `Casos de Indenizacao`, `Divergencias Operacionais`, `Financeiro / Debitos`, `Aprovacoes`, `Relatorios`, `Configuracoes`.

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const pageSource = readFileSync(new URL('../src/pages/PerdasPrevencoes.tsx', import.meta.url), 'utf8')

for (const label of [
  'Perdas e Prevencoes',
  'Cockpit',
  'Cobrancas / Importacoes',
  'Casos de Indenizacao',
  'Divergencias Operacionais',
  'Financeiro / Debitos',
  'Aprovacoes',
  'Relatorios',
  'Configuracoes',
  'Caso de Indenizacao',
]) {
  assert.ok(pageSource.includes(label), `a pagina deve conter a secao ${label}`)
}

assert.equal(/Maiara/i.test(pageSource), false, 'a interface nao deve exibir nomes pessoais citados em reuniao')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types tests/perdasPrevencoesContent.test.ts`
Expected: FAIL because `src/pages/PerdasPrevencoes.tsx` does not exist.

- [ ] **Step 3: Implement the page**

Create a React component with internal tabs, Cockpit cards, ranking by base, import summary, case list/detail, operational divergences, financial queue, approvals queue, reports and config tables. Use existing UI primitives and Tailwind classes.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types tests/perdasPrevencoesContent.test.ts`
Expected: PASS.

### Task 3: Full Verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes all tasks above.

- [ ] **Step 1: Run targeted tests**

Run: `node --experimental-strip-types tests/perdasPrevencoesNavigation.test.ts; node --experimental-strip-types tests/perdasPrevencoesContent.test.ts`
Expected: PASS.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: exit code 0.
