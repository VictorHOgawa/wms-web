# Divergencia Etiquetagem Devolucao Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align `/etiquetagem` and `/montagem` with the approved physical flow: sobra de etiqueta means product shortage sent to Administrativo, and falta de etiqueta means extra physical product that receives a red `DEVOLUCAO` label and goes to an exclusive return pallet.

**Architecture:** Move divergence rules into small pure TypeScript helpers, persist divergence records in the Zustand store, then consume those records in `Etiquetagem.tsx` and `Montagem.tsx`. Normal pallets are calculated from valid applied labels; return pallets are calculated from generated `DEVOLUCAO` labels and get a different A4 preview.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Zustand, Tailwind, node built-in `assert` tests executed with `node --test`.

## Global Constraints

- Do not revert existing local changes in `src/pages/Etiquetagem.tsx`, `src/pages/Montagem.tsx`, `src/store/useStore.ts`, or `tests/`.
- Keep the current demo/mock style; no backend integration is required in this plan.
- Use the existing route/page structure. The relevant screens are `/etiquetagem` and `/montagem`.
- Use Portuguese operational labels in UI: `Sobrou etiqueta`, `Faltou etiqueta`, `DEVOLUCAO`, `Administrativo`, `Pallet de devolucao`.
- For `sobrou-etiqueta`, generate no red labels and exclude the surplus expected labels from normal pallet mounting.
- For `faltou-etiqueta`, generate red labels titled `DEVOLUCAO` and route them only to return pallets.
- A normal A4 has the footer options: `[ ] Aguardando para envio`, `[ ] Segue para destinatario`, `[ ] Devolucao`.
- A return A4 has a large `DEVOLUCAO` footer and must not show the normal footer as the primary action.

---

## File Structure

- Create `src/lib/divergenciaEtiquetagem.ts`
  - Owns divergence types, UI metadata, label-generation decision rules, and label partition helpers.
- Create `tests/divergenciaEtiquetagem.test.ts`
  - Verifies the domain rules without React.
- Modify `src/store/useStore.ts`
  - Adds persisted mock state for labeling divergences and an action to register them.
- Modify `src/pages/Etiquetagem.tsx`
  - Uses store-backed divergence records instead of local-only state.
  - Changes `faltou-etiqueta` generated labels to title `DEVOLUCAO`.
  - Stops generating red labels for `sobrou-etiqueta`.
- Create `src/lib/montagemDivergencia.ts`
  - Splits normal labels from return labels before pallet planning.
- Create `tests/montagemDivergencia.test.ts`
  - Verifies that product-shortage labels are excluded and return labels stay separate.
- Modify `src/pages/Montagem.tsx`
  - Plans normal pallets from valid labels only.
  - Plans return pallets separately from `DEVOLUCAO` labels.
  - Renders normal A4 and return A4 with different footer treatments.

---

### Task 1: Extract Divergence Domain Rules

**Files:**
- Create: `src/lib/divergenciaEtiquetagem.ts`
- Test: `tests/divergenciaEtiquetagem.test.ts`

**Interfaces:**
- Produces:
  - `TipoDivergenciaEtiqueta = 'faltou-etiqueta' | 'sobrou-etiqueta'`
  - `DestinoDivergenciaEtiqueta = 'administrativo' | 'devolucao'`
  - `RegistroDivergenciaEtiqueta`
  - `ItemDivergenciaEtiqueta`
  - `EtiquetaDivergente`
  - `tipoDivergenciaMeta`
  - `deveGerarEtiquetaDivergente(tipo: TipoDivergenciaEtiqueta): boolean`
  - `destinoDaDivergencia(tipo: TipoDivergenciaEtiqueta): DestinoDivergenciaEtiqueta`
  - `tituloEtiquetaDivergente(tipo: TipoDivergenciaEtiqueta): 'DEVOLUCAO' | null`
  - `selecionarEtiquetasCanceladasPorSobra(etiquetas: EtiquetaVolume[], itens: ItemDivergenciaEtiqueta[]): string[]`
- Consumes:
  - `EtiquetaVolume` from `src/lib/etiquetas.ts`
  - `Tone` from `src/components/ui` only if keeping metadata tones centralized; otherwise keep tone mapping in pages to avoid UI dependency in lib.

- [ ] **Step 1: Write the failing domain test**

Create `tests/divergenciaEtiquetagem.test.ts`:

```ts
import assert from 'node:assert/strict'
import {
  destinoDaDivergencia,
  deveGerarEtiquetaDivergente,
  selecionarEtiquetasCanceladasPorSobra,
  tituloEtiquetaDivergente,
  type ItemDivergenciaEtiqueta,
} from '../src/lib/divergenciaEtiquetagem.ts'
import type { EtiquetaVolume } from '../src/lib/etiquetas.ts'

const etiqueta = (id: string, skuCodigo: string): EtiquetaVolume => ({
  id,
  viagemId: 'VIA-1',
  recebimentoId: 'REC-1',
  skuCodigo,
  descricao: `Produto ${skuCodigo}`,
  tipoEmbalagem: 'unidade',
  quantidadeNoVolume: 1,
  sequencia: '1/1',
  sequenciaSku: '1/1',
  emissaoIso: '2026-06-29T10:00:00.000Z',
  origemDestino: 'GRU/RIO',
  embarcador: 'Fornecedor',
  nf: 'NF-1',
  cte: 'CTE-1',
  kg: '1 kg',
  kgValor: 1,
  destinatario: 'Destinatario',
  endereco: 'Rua Teste',
})

assert.equal(
  destinoDaDivergencia('sobrou-etiqueta'),
  'administrativo',
  'sobrou etiqueta significa produto a menos e segue para tratativa administrativa',
)

assert.equal(
  deveGerarEtiquetaDivergente('sobrou-etiqueta'),
  false,
  'sobrou etiqueta nao deve gerar etiqueta vermelha porque nao existe volume fisico excedente',
)

assert.equal(
  destinoDaDivergencia('faltou-etiqueta'),
  'devolucao',
  'faltou etiqueta significa produto fisico excedente e segue para devolucao',
)

assert.equal(
  tituloEtiquetaDivergente('faltou-etiqueta'),
  'DEVOLUCAO',
  'a etiqueta vermelha de item fisico excedente deve ter titulo DEVOLUCAO',
)

const itens: ItemDivergenciaEtiqueta[] = [
  { skuCodigo: 'SKU-A', descricao: 'Produto A', quantidade: 2 },
]

assert.deepEqual(
  selecionarEtiquetasCanceladasPorSobra(
    [etiqueta('ETQ-1', 'SKU-A'), etiqueta('ETQ-2', 'SKU-B'), etiqueta('ETQ-3', 'SKU-A')],
    itens,
  ),
  ['ETQ-1', 'ETQ-3'],
  'deve cancelar a quantidade informada de etiquetas sobrando para o SKU selecionado',
)
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test tests/divergenciaEtiquetagem.test.ts
```

Expected: FAIL because `src/lib/divergenciaEtiquetagem.ts` does not exist.

- [ ] **Step 3: Implement the domain helper**

Create `src/lib/divergenciaEtiquetagem.ts`:

```ts
import type { EtiquetaVolume } from './etiquetas'

export type TipoDivergenciaEtiqueta = 'faltou-etiqueta' | 'sobrou-etiqueta'
export type DestinoDivergenciaEtiqueta = 'administrativo' | 'devolucao'

export interface ItemDivergenciaEtiqueta {
  skuCodigo: string
  descricao: string
  quantidade: number
}

export interface EtiquetaDivergente extends EtiquetaVolume {
  divergenciaId: string
  tipoDivergencia: TipoDivergenciaEtiqueta
  tituloDivergencia: 'DEVOLUCAO'
  instrucao: string
}

export interface RegistroDivergenciaEtiqueta {
  id: string
  viagemId: string
  recebimentoId: string
  usuario: string
  quandoIso: string
  tipo: TipoDivergenciaEtiqueta
  itens: ItemDivergenciaEtiqueta[]
  etiquetasCanceladasIds: string[]
  etiquetasGeradas: EtiquetaDivergente[]
  envioAdministrativo: {
    status: 'enviado-mock'
    destino: 'Administrativo / Tratativa fiscal'
    recebimentoId: string
    documento: string
    fornecedor: string
    owner: string
  }
}

export const tipoDivergenciaMeta = {
  'sobrou-etiqueta': {
    label: 'Sobrou etiqueta',
    destino: 'administrativo',
    instrucao:
      'Produto a menos: registrar a sobra de etiqueta, enviar ao administrativo e seguir com a carga valida.',
  },
  'faltou-etiqueta': {
    label: 'Faltou etiqueta',
    destino: 'devolucao',
    instrucao:
      'Produto excedente: aplicar etiqueta DEVOLUCAO e separar em pallet exclusivo de devolucao.',
  },
} as const satisfies Record<
  TipoDivergenciaEtiqueta,
  { label: string; destino: DestinoDivergenciaEtiqueta; instrucao: string }
>

export function destinoDaDivergencia(tipo: TipoDivergenciaEtiqueta): DestinoDivergenciaEtiqueta {
  return tipoDivergenciaMeta[tipo].destino
}

export function deveGerarEtiquetaDivergente(tipo: TipoDivergenciaEtiqueta) {
  return destinoDaDivergencia(tipo) === 'devolucao'
}

export function tituloEtiquetaDivergente(tipo: TipoDivergenciaEtiqueta) {
  return deveGerarEtiquetaDivergente(tipo) ? 'DEVOLUCAO' : null
}

export function selecionarEtiquetasCanceladasPorSobra(
  etiquetas: EtiquetaVolume[],
  itens: ItemDivergenciaEtiqueta[],
) {
  const canceladas: string[] = []

  itens.forEach((item) => {
    const candidatas = etiquetas
      .filter((etiqueta) => etiqueta.skuCodigo === item.skuCodigo)
      .filter((etiqueta) => !canceladas.includes(etiqueta.id))
      .slice(0, item.quantidade)

    canceladas.push(...candidatas.map((etiqueta) => etiqueta.id))
  })

  return canceladas
}
```

- [ ] **Step 4: Run the domain test**

Run:

```bash
node --test tests/divergenciaEtiquetagem.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/divergenciaEtiquetagem.ts tests/divergenciaEtiquetagem.test.ts
git commit -m "feat: add etiquetagem divergence rules"
```

---

### Task 2: Persist Labeling Divergences in the Store

**Files:**
- Modify: `src/store/useStore.ts`

**Interfaces:**
- Consumes:
  - `RegistroDivergenciaEtiqueta` from `src/lib/divergenciaEtiquetagem.ts`
- Produces:
  - Store state `divergenciasEtiquetagem: RegistroDivergenciaEtiqueta[]`
  - Store action `registrarDivergenciaEtiquetagem(registro: RegistroDivergenciaEtiqueta): void`

- [ ] **Step 1: Add store state and action types**

In `src/store/useStore.ts`, add the import:

```ts
import type { RegistroDivergenciaEtiqueta } from '../lib/divergenciaEtiquetagem'
```

Add to `interface State`:

```ts
  divergenciasEtiquetagem: RegistroDivergenciaEtiqueta[]
  registrarDivergenciaEtiquetagem: (registro: RegistroDivergenciaEtiqueta) => void
```

- [ ] **Step 2: Add initial state and action implementation**

Inside `create<State>((set, get) => ({ ... }))`, add initial state near other data arrays:

```ts
  divergenciasEtiquetagem: [],
```

Add the action near receiving/operational actions:

```ts
  registrarDivergenciaEtiquetagem: (registro) =>
    set((s) => ({
      divergenciasEtiquetagem: [registro, ...s.divergenciasEtiquetagem],
    })),
```

- [ ] **Step 3: Build to verify type integration**

Run:

```bash
npm run build
```

Expected: PASS with TypeScript build and Vite build complete.

- [ ] **Step 4: Commit**

```bash
git add src/store/useStore.ts
git commit -m "feat: persist etiquetagem divergences"
```

---

### Task 3: Update Etiquetagem Divergence Behavior

**Files:**
- Modify: `src/pages/Etiquetagem.tsx`
- Modify: `src/lib/divergenciaEtiquetagem.ts` if UI needs one extra helper while implementing.

**Interfaces:**
- Consumes:
  - Store state/action from Task 2.
  - Domain helpers from Task 1.
- Produces:
  - `sobrou-etiqueta`: administrative record with cancelled label ids and zero generated red labels.
  - `faltou-etiqueta`: generated red labels titled `DEVOLUCAO`.

- [ ] **Step 1: Replace local divergence types/imports**

In `src/pages/Etiquetagem.tsx`, remove local definitions for:

```ts
type TipoDivergenciaEtiqueta = 'faltou-etiqueta' | 'sobrou-etiqueta'
interface ItemDivergenciaEtiqueta { ... }
interface EtiquetaDivergente extends EtiquetaVolume { ... }
interface RegistroDivergenciaEtiqueta { ... }
```

Import them from the new lib:

```ts
import {
  deveGerarEtiquetaDivergente,
  selecionarEtiquetasCanceladasPorSobra,
  tipoDivergenciaMeta,
  tituloEtiquetaDivergente,
  type EtiquetaDivergente,
  type ItemDivergenciaEtiqueta,
  type RegistroDivergenciaEtiqueta,
  type TipoDivergenciaEtiqueta,
} from '../lib/divergenciaEtiquetagem'
```

Keep the local `Record<TipoDivergenciaEtiqueta, { tone: Tone }>` if needed for badge colors:

```ts
const tipoDivergenciaTone: Record<TipoDivergenciaEtiqueta, Tone> = {
  'faltou-etiqueta': 'bad',
  'sobrou-etiqueta': 'warn',
}
```

- [ ] **Step 2: Use store-backed divergence history**

Change the store selection:

```ts
const {
  recebimentos,
  ownerId,
  toast,
  skusControle,
  usuario,
  zplPrinterConfig,
  divergenciasEtiquetagem,
  registrarDivergenciaEtiquetagem,
} = useStore()
```

Remove:

```ts
const [historicoDivergencias, setHistoricoDivergencias] = useState<Record<string, RegistroDivergenciaEtiqueta[]>>({})
```

Replace selected divergences with:

```ts
const divergenciasSelecionadas = selecionada
  ? divergenciasEtiquetagem.filter((registro) => registro.viagemId === selecionada.viagem.id)
  : []
```

- [ ] **Step 3: Make divergent label generation return only DEVOLUCAO labels**

In `calcularEtiquetasDivergentes`, return `[]` unless `deveGerarEtiquetaDivergente(tipo)` is true:

```ts
  if (!row.recebimento || !deveGerarEtiquetaDivergente(tipo)) return []
```

Set the label title and instruction:

```ts
        tituloDivergencia: tituloEtiquetaDivergente(tipo) ?? 'DEVOLUCAO',
        instrucao: tipoDivergenciaMeta[tipo].instrucao,
```

In `EtiquetaDivergenteCard`, replace the current `DIVERGENTE` title with:

```tsx
<p className="text-center text-[13px] font-black uppercase leading-none tracking-normal">
  {etiqueta.tituloDivergencia}
</p>
```

- [ ] **Step 4: Register cancelled labels for `sobrou-etiqueta`**

Inside `confirmarDivergencia`, compute cancelled labels from the currently calculated normal labels:

```ts
const etiquetasCanceladasIds = input.tipo === 'sobrou-etiqueta'
  ? selecionarEtiquetasCanceladasPorSobra(
      calcularEtiquetas(row.viagem, row.recebimento, emissaoAtualIso(row, historicoReemissao[row.viagem.id] ?? [])),
      itens,
    )
  : []
```

Include it in the record:

```ts
      etiquetasCanceladasIds,
```

Replace local `setHistoricoDivergencias` with:

```ts
registrarDivergenciaEtiquetagem(registro)
```

Change the toast text so `sobrou-etiqueta` does not claim red labels were generated:

```ts
texto: input.tipo === 'sobrou-etiqueta'
  ? `${tipoDivergenciaMeta[input.tipo].label} · ${etiquetasCanceladasIds.length} etiqueta(s) removida(s) da montagem e envio ao administrativo.`
  : `${tipoDivergenciaMeta[input.tipo].label} · ${etiquetasGeradas.length} etiqueta(s) DEVOLUCAO gerada(s).`,
```

- [ ] **Step 5: Update modal copy**

In the divergence type help text, replace the generic mock text with:

```tsx
<p className="mt-1.5 text-xs text-ink-muted">
  Sobrou etiqueta: produto veio a menos e segue ao administrativo. Faltou etiqueta: produto fisico excedente, gera DEVOLUCAO e vai para pallet separado.
</p>
```

Change the confirm button label to:

```tsx
{tipo === 'faltou-etiqueta' ? 'Enviar e gerar DEVOLUCAO' : 'Enviar ao administrativo'}
```

- [ ] **Step 6: Build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Etiquetagem.tsx src/lib/divergenciaEtiquetagem.ts
git commit -m "feat: align etiquetagem divergence flow"
```

---

### Task 4: Add Mounting Partition Helpers

**Files:**
- Create: `src/lib/montagemDivergencia.ts`
- Test: `tests/montagemDivergencia.test.ts`

**Interfaces:**
- Consumes:
  - `RegistroDivergenciaEtiqueta`, `EtiquetaDivergente` from `src/lib/divergenciaEtiquetagem.ts`
  - `EtiquetaVolume` from `src/lib/etiquetas.ts`
- Produces:
  - `separarEtiquetasParaMontagem(etiquetas: EtiquetaVolume[], divergencias: RegistroDivergenciaEtiqueta[]): { normais: EtiquetaVolume[]; devolucao: EtiquetaDivergente[] }`

- [ ] **Step 1: Write the failing test**

Create `tests/montagemDivergencia.test.ts`:

```ts
import assert from 'node:assert/strict'
import { separarEtiquetasParaMontagem } from '../src/lib/montagemDivergencia.ts'
import type { EtiquetaVolume } from '../src/lib/etiquetas.ts'
import type { RegistroDivergenciaEtiqueta, EtiquetaDivergente } from '../src/lib/divergenciaEtiquetagem.ts'

const etiqueta = (id: string, skuCodigo = 'SKU-A'): EtiquetaVolume => ({
  id,
  viagemId: 'VIA-1',
  recebimentoId: 'REC-1',
  skuCodigo,
  descricao: `Produto ${skuCodigo}`,
  tipoEmbalagem: 'unidade',
  quantidadeNoVolume: 1,
  sequencia: '1/1',
  sequenciaSku: '1/1',
  emissaoIso: '2026-06-29T10:00:00.000Z',
  origemDestino: 'GRU/RIO',
  embarcador: 'Fornecedor',
  nf: 'NF-1',
  cte: 'CTE-1',
  kg: '1 kg',
  kgValor: 1,
  destinatario: 'Destinatario',
  endereco: 'Rua Teste',
})

const devolucao: EtiquetaDivergente = {
  ...etiqueta('DEV-1', 'SKU-DEV'),
  divergenciaId: 'DIV-2',
  tipoDivergencia: 'faltou-etiqueta',
  tituloDivergencia: 'DEVOLUCAO',
  instrucao: 'Produto excedente: aplicar etiqueta DEVOLUCAO.',
}

const registroBase = {
  viagemId: 'VIA-1',
  recebimentoId: 'REC-1',
  usuario: 'Teste',
  quandoIso: '2026-06-29T10:00:00.000Z',
  itens: [],
  envioAdministrativo: {
    status: 'enviado-mock',
    destino: 'Administrativo / Tratativa fiscal',
    recebimentoId: 'REC-1',
    documento: 'NF-1',
    fornecedor: 'Fornecedor',
    owner: 'Owner',
  },
} satisfies Omit<RegistroDivergenciaEtiqueta, 'id' | 'tipo' | 'etiquetasCanceladasIds' | 'etiquetasGeradas'>

const resultado = separarEtiquetasParaMontagem(
  [etiqueta('ETQ-1'), etiqueta('ETQ-2'), etiqueta('ETQ-3')],
  [
    {
      ...registroBase,
      id: 'DIV-1',
      tipo: 'sobrou-etiqueta',
      etiquetasCanceladasIds: ['ETQ-2'],
      etiquetasGeradas: [],
    },
    {
      ...registroBase,
      id: 'DIV-2',
      tipo: 'faltou-etiqueta',
      etiquetasCanceladasIds: [],
      etiquetasGeradas: [devolucao],
    },
  ],
)

assert.deepEqual(
  resultado.normais.map((item) => item.id),
  ['ETQ-1', 'ETQ-3'],
  'montagem normal deve excluir etiquetas sobrando por produto a menos',
)

assert.deepEqual(
  resultado.devolucao.map((item) => item.id),
  ['DEV-1'],
  'montagem deve manter etiquetas DEVOLUCAO em lista separada',
)
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test tests/montagemDivergencia.test.ts
```

Expected: FAIL because `src/lib/montagemDivergencia.ts` does not exist.

- [ ] **Step 3: Implement the partition helper**

Create `src/lib/montagemDivergencia.ts`:

```ts
import type { EtiquetaVolume } from './etiquetas'
import type { EtiquetaDivergente, RegistroDivergenciaEtiqueta } from './divergenciaEtiquetagem'

export function separarEtiquetasParaMontagem(
  etiquetas: EtiquetaVolume[],
  divergencias: RegistroDivergenciaEtiqueta[],
): { normais: EtiquetaVolume[]; devolucao: EtiquetaDivergente[] } {
  const canceladas = new Set(divergencias.flatMap((registro) => registro.etiquetasCanceladasIds))

  return {
    normais: etiquetas.filter((etiqueta) => !canceladas.has(etiqueta.id)),
    devolucao: divergencias.flatMap((registro) => registro.etiquetasGeradas),
  }
}
```

- [ ] **Step 4: Run helper tests**

Run:

```bash
node --test tests/montagemDivergencia.test.ts
node --test tests/divergenciaEtiquetagem.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/montagemDivergencia.ts tests/montagemDivergencia.test.ts
git commit -m "feat: split mounting labels by divergence"
```

---

### Task 5: Route Normal and Return Pallets in Montagem

**Files:**
- Modify: `src/pages/Montagem.tsx`

**Interfaces:**
- Consumes:
  - `divergenciasEtiquetagem` from store.
  - `separarEtiquetasParaMontagem` from Task 4.
- Produces:
  - Normal pallets from `normais`.
  - Return pallets from `devolucao`.
  - `PalletPlanejado` extended with `tipo: 'normal' | 'devolucao'`.

- [ ] **Step 1: Extend pallet type**

In `PalletPlanejado`, add:

```ts
  tipo: 'normal' | 'devolucao'
```

Update `criarPallet` signature:

```ts
function criarPallet(
  seed: string,
  index: number,
  volumes: VolumeMontagem[],
  tipo: PalletPlanejado['tipo'] = 'normal',
): PalletPlanejado {
```

Return the field:

```ts
    tipo,
```

Update callers:

```ts
criarPallet(recebimentoId.replace('REC-', ''), index, bucketOrdenado, 'normal')
```

- [ ] **Step 2: Read store divergences in Montagem**

Change store selection:

```ts
const { recebimentos, ownerId, skusControle, toast, divergenciasEtiquetagem } = useStore()
```

Import:

```ts
import { separarEtiquetasParaMontagem } from '../lib/montagemDivergencia'
import type { EtiquetaDivergente } from '../lib/divergenciaEtiquetagem'
```

- [ ] **Step 3: Split labels before creating volumes**

Change `volumesDaViagem` signature:

```ts
function volumesDaViagem(
  row: ViagemComRecebimento,
  skusControle: SkuControle[],
  divergencias: RegistroDivergenciaEtiqueta[],
): { normais: VolumeMontagem[]; devolucao: VolumeMontagem[] } {
```

Inside it, calculate base labels and split:

```ts
const etiquetasBase = calcularEtiquetas(row.viagem, row.recebimento, emissaoAutomaticaIso(row))
const { normais, devolucao } = separarEtiquetasParaMontagem(etiquetasBase, divergencias)
const mapear = (etiqueta: EtiquetaVolume | EtiquetaDivergente): VolumeMontagem => {
  const cadastro = cadastroDoVolume(row, etiqueta, skusControle)
  const cubagemM3 = cubagemDaEtiqueta(etiqueta, cadastro)
  return {
    etiqueta,
    cadastro,
    pesoKg: etiqueta.kgValor,
    cubagemM3,
    fatorCritico: Math.max(etiqueta.kgValor / LIMITE_PESO_KG, cubagemM3 / LIMITE_CUBAGEM_M3),
  }
}

return {
  normais: normais.map(mapear),
  devolucao: devolucao.map(mapear),
}
```

- [ ] **Step 4: Extend row model**

Update `RowMontagem`:

```ts
  volumes: VolumeMontagem[]
  volumesDevolucao: VolumeMontagem[]
  pallets: PalletPlanejado[]
  palletsDevolucao: PalletPlanejado[]
```

Update `prepararRow` signature and body:

```ts
function prepararRow(
  row: ViagemComRecebimento,
  skusControle: SkuControle[],
  divergenciasEtiquetagem: RegistroDivergenciaEtiqueta[],
): RowMontagem {
  const divergenciasDaViagem = divergenciasEtiquetagem.filter((registro) => registro.viagemId === row.viagem.id)
  const volumesSeparados = volumesDaViagem(row, skusControle, divergenciasDaViagem)
  const volumes = volumesSeparados.normais
  const volumesDevolucao = volumesSeparados.devolucao
  const bloqueio = motivoBloqueioMontagem(row, volumes, skusControle)
  const totalPesoKg = volumes.reduce((total, volume) => total + volume.pesoKg, 0)
  const totalCubagemM3 = volumes.reduce((total, volume) => total + volume.cubagemM3, 0)

  return {
    row,
    bloqueio,
    volumes,
    volumesDevolucao,
    pallets: !bloqueio && row.recebimento ? planejarPallets(volumes, row.recebimento.id) : [],
    palletsDevolucao: !bloqueio && row.recebimento && volumesDevolucao.length
      ? planejarPalletsDevolucao(volumesDevolucao, row.recebimento.id)
      : [],
    totalPesoKg,
    totalCubagemM3,
  }
}
```

Add helper:

```ts
function planejarPalletsDevolucao(volumes: VolumeMontagem[], recebimentoId: string) {
  return planejarPallets(volumes, `${recebimentoId}-DEV`).map((pallet, index) => ({
    ...pallet,
    id: `DEV-${recebimentoId.replace('REC-', '')}-${String(index + 1).padStart(2, '0')}`,
    tipo: 'devolucao' as const,
  }))
}
```

Update `planejamentosAutomaticos` dependency and call:

```ts
const planejamentosAutomaticos = useMemo(
  () => rows.map((row) => prepararRow(row, skusControle, divergenciasEtiquetagem)),
  [rows, skusControle, divergenciasEtiquetagem],
)
```

- [ ] **Step 5: Include return pallets in print requests**

Update `criarRequisicoesImpressao` to include both arrays:

```ts
const palletsParaImpressao = [...item.pallets, ...item.palletsDevolucao]

return palletsParaImpressao.map((pallet, index) => ({
  id: `PRINT-${item.row.recebimento!.id.replace('REC-', '')}-${String(index + 1).padStart(2, '0')}`,
  recebimentoId: item.row.recebimento!.id,
  viagemId: item.row.viagem.id,
  palletId: pallet.id,
  criadaEmIso,
  status: 'solicitada',
  tipo: pallet.tipo,
  cte: item.row.viagem.cte,
  nf: item.row.viagem.nf,
  skus: pallet.skus.map((sku) => ({
    skuCodigo: sku.skuCodigo,
    descricao: sku.descricao,
    volumes: sku.volumes,
    unidades: sku.unidades,
  })),
  volumes: pallet.volumes.length,
  unidades: quantidadeUnidadesPallet(pallet),
  pesoKg: pallet.pesoKg,
  cubagemM3: pallet.cubagemM3,
}))
```

Add to `RequisicaoImpressaoPallet`:

```ts
  tipo: 'normal' | 'devolucao'
```

- [ ] **Step 6: Build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Montagem.tsx
git commit -m "feat: route devolucao pallets in montagem"
```

---

### Task 6: Render Normal and Return A4s

**Files:**
- Modify: `src/pages/Montagem.tsx`

**Interfaces:**
- Consumes:
  - `RequisicaoImpressaoPallet.tipo`
- Produces:
  - Normal A4 footer with three checkbox options.
  - Return A4 footer with large `DEVOLUCAO`.

- [ ] **Step 1: Add normal A4 footer**

Inside `A4PrintPreview`, after the SKU table and before the final metadata row, render:

```tsx
{requisicao.tipo === 'normal' && (
  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-300 pt-3 text-[12px] font-black uppercase text-slate-700">
    <span>[ ] Aguardando para envio</span>
    <span>[ ] Segue para destinatario</span>
    <span>[ ] Devolucao</span>
  </div>
)}
```

- [ ] **Step 2: Add return A4 footer**

In the same place, render:

```tsx
{requisicao.tipo === 'devolucao' && (
  <div className="mt-3 border-t-4 border-red-700 pt-2 text-center">
    <p className="text-[34px] font-black uppercase leading-none text-red-700">DEVOLUCAO</p>
    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
      Pallet exclusivo para produto excedente sem etiqueta documental original.
    </p>
  </div>
)}
```

- [ ] **Step 3: Visually mark return pallets in cards**

In `PalletCard`, add a badge beside the pallet id:

```tsx
{pallet.tipo === 'devolucao' && <Badge tone="bad">Devolucao</Badge>}
```

Change the subtitle for return pallets:

```tsx
<p className="mt-1 text-sm text-ink-muted">
  {pallet.tipo === 'devolucao' ? 'Pallet exclusivo de devolucao' : `${pallet.volumes.length.toLocaleString('pt-BR')} etiqueta(s) · ${pallet.skus.length.toLocaleString('pt-BR')} SKU(s)`}
</p>
```

- [ ] **Step 4: Render return pallet section separately**

In the detail panel where normal `item.pallets.map(...)` is rendered, keep normal pallets first and add:

```tsx
{item.palletsDevolucao.length > 0 && (
  <div className="mt-5 rounded-xl border border-bad/25 bg-bad-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 className="text-sm font-semibold text-bad">Pallets de devolucao</h3>
        <p className="mt-1 text-sm text-bad">
          Produtos fisicos excedentes gerados por falta de etiqueta.
        </p>
      </div>
      <Badge tone="bad">{item.palletsDevolucao.length.toLocaleString('pt-BR')} pallet(s)</Badge>
    </div>
    <div className="mt-4 space-y-4">
      {item.palletsDevolucao.map((pallet, index) => (
        <PalletCard
          key={pallet.id}
          pallet={pallet}
          index={index}
          total={item.palletsDevolucao.length}
          reorderDisabled
          onMove={() => undefined}
        />
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 5: Build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Montagem.tsx
git commit -m "feat: render devolucao pallet print sheets"
```

---

### Task 7: Final Verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes:
  - All tasks above.
- Produces:
  - Confirmed behavior in tests and build.

- [ ] **Step 1: Run all local tests**

Run:

```bash
node --test tests/divergenciaEtiquetagem.test.ts
node --test tests/montagemDivergencia.test.ts
node --test tests/montagemSelection.test.ts
node --test tests/palletPlanner.test.ts
```

Expected: all PASS.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Manual browser smoke test**

Run:

```bash
npm run dev
```

Open the Vite URL and verify:

- `/etiquetagem`: selecting `Sobrou etiqueta` records Administrativo handling and does not show a red generated label.
- `/etiquetagem`: selecting `Faltou etiqueta` generates a red label titled `DEVOLUCAO`.
- `/montagem`: normal pallets do not include cancelled labels from `Sobrou etiqueta`.
- `/montagem`: `Faltou etiqueta` labels appear in a separate `Pallets de devolucao` section.
- Normal A4 preview has the three checkbox options.
- Return A4 preview shows large `DEVOLUCAO`.

- [ ] **Step 4: Check git status**

Run:

```bash
git status --short
```

Expected: only intentional files are modified or untracked.

- [ ] **Step 5: Commit final verification note if needed**

If any small copy/test adjustment was needed during verification:

```bash
git add src tests docs
git commit -m "test: verify etiquetagem devolucao flow"
```

---

## Self-Review

- Spec coverage:
  - Sobrou etiqueta -> Administrativo and no red label: Task 1 and Task 3.
  - Sobrou etiqueta excluded from normal mounting: Task 4 and Task 5.
  - Faltou etiqueta -> red `DEVOLUCAO` label: Task 1 and Task 3.
  - Faltou etiqueta -> exclusive return pallet: Task 4 and Task 5.
  - Normal A4 footer checkboxes: Task 6.
  - Return A4 large `DEVOLUCAO`: Task 6.
- Placeholder scan:
  - No placeholder markers or vague "later" items are present.
- Type consistency:
  - `RegistroDivergenciaEtiqueta`, `EtiquetaDivergente`, and `TipoDivergenciaEtiqueta` are defined in Task 1 and reused consistently.
  - `RequisicaoImpressaoPallet.tipo` and `PalletPlanejado.tipo` both use `'normal' | 'devolucao'`.
