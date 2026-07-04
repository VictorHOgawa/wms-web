import type { PosicaoEstoque, StatusEstoque } from './types'

/* ------------------------------------------------------------------ *
 * Layout 3D do armazém (planta gerada a partir dos endereços mock).
 *
 * Endereço canônico: RUA-COLUNA-NÍVEL-POSIÇÃO  (ex.: A-12-03-2)
 *   RUA      → corredor (A, B, C, D)
 *   COLUNA   → módulo/estante ao longo do corredor
 *   NÍVEL    → altura na prateleira
 *   POSIÇÃO  → apartamento dentro do nível (profundidade)
 * ------------------------------------------------------------------ */

export const RUAS = ['A', 'B', 'C', 'D'] as const
export type Rua = (typeof RUAS)[number]

export const COLS = 6 // colunas por rua
export const LEVELS = 4 // níveis por coluna

// dimensões em "metros" de cena
export const COL_W = 1.4 // largura de cada coluna (eixo X)
export const LEVEL_H = 1.0 // altura de cada nível (eixo Y)
export const RACK_DEPTH = 1.2 // profundidade da estante (eixo Z)
export const AISLE = 2.2 // largura do corredor entre ruas
export const RUA_SPAN = RACK_DEPTH + AISLE // passo entre ruas no eixo Z

export interface Slot {
  key: string // identificador interno único
  label: string // endereço canônico exibido (RUA-CC-NN-1)
  rua: Rua
  ruaIdx: number
  colIdx: number // 0..COLS-1
  levelIdx: number // 0..LEVELS-1
  x: number
  y: number
  z: number
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Posição no espaço 3D de uma (rua, coluna, nível). Centraliza a planta na origem. */
function position(ruaIdx: number, colIdx: number, levelIdx: number) {
  const totalX = (COLS - 1) * COL_W
  const totalZ = (RUAS.length - 1) * RUA_SPAN
  return {
    x: colIdx * COL_W - totalX / 2,
    y: levelIdx * LEVEL_H + LEVEL_H / 2 + 0.15,
    z: ruaIdx * RUA_SPAN - totalZ / 2,
  }
}

/** Gera todas as posições (slots) da planta. */
export function buildSlots(): Slot[] {
  const slots: Slot[] = []
  RUAS.forEach((rua, ruaIdx) => {
    for (let colIdx = 0; colIdx < COLS; colIdx++) {
      for (let levelIdx = 0; levelIdx < LEVELS; levelIdx++) {
        const { x, y, z } = position(ruaIdx, colIdx, levelIdx)
        slots.push({
          key: `${rua}-${colIdx}-${levelIdx}`,
          label: `${rua}-${pad2(colIdx + 1)}-${pad2(levelIdx + 1)}-1`,
          rua,
          ruaIdx,
          colIdx,
          levelIdx,
          x,
          y,
          z,
        })
      }
    }
  })
  return slots
}

/** Converte um endereço (real ou alvo) para a chave de slot da planta, com clamp. */
export function addressToKey(endereco: string): string {
  const [rua, colStr, nivelStr] = endereco.split('-')
  const ruaIdx = Math.max(0, RUAS.indexOf(rua as Rua))
  const realRua = RUAS[ruaIdx]
  const col = parseInt(colStr ?? '1', 10) || 1
  const nivel = parseInt(nivelStr ?? '1', 10) || 1
  const colIdx = (col - 1) % COLS
  const levelIdx = (nivel - 1) % LEVELS
  return `${realRua}-${colIdx}-${levelIdx}`
}

export const STATUS_INFO: Record<
  StatusEstoque | 'vazia',
  { label: string; color: string }
> = {
  disponivel: { label: 'Disponível', color: '#00a88e' },
  reservado: { label: 'Reservado', color: '#7c3aed' },
  quarentena: { label: 'Quarentena', color: '#d97706' },
  qualidade: { label: 'Em qualidade', color: '#2563eb' },
  avaria: { label: 'Avaria', color: '#dc2626' },
  vazia: { label: 'Livre', color: '#cbd5e1' },
}

export interface Ocupacao {
  porKey: Map<string, PosicaoEstoque>
  keyDoItem: Map<string, string>
}

/**
 * Distribui o estoque mock pelos slots da planta de forma determinística.
 * Mantém o endereço-alvo quando livre; senão, escorrega para o próximo slot
 * livre da mesma rua (e, em último caso, qualquer rua).
 */
export function buildOcupacao(estoque: PosicaoEstoque[], slots: Slot[]): Ocupacao {
  const porKey = new Map<string, PosicaoEstoque>()
  const keyDoItem = new Map<string, string>()
  const slotsPorRua = new Map<Rua, Slot[]>()
  RUAS.forEach((r) => slotsPorRua.set(r, slots.filter((s) => s.rua === r)))

  for (const item of estoque) {
    const desejado = addressToKey(item.endereco)
    let alvo = desejado
    if (porKey.has(alvo)) {
      const rua = (desejado.split('-')[0] as Rua) ?? 'A'
      const candidato =
        slotsPorRua.get(rua)?.find((s) => !porKey.has(s.key)) ??
        slots.find((s) => !porKey.has(s.key))
      if (candidato) alvo = candidato.key
    }
    porKey.set(alvo, item)
    keyDoItem.set(item.id, alvo)
  }
  return { porKey, keyDoItem }
}

/** Encontra o slot livre mais próximo de um alvo (mesma rua tem prioridade). */
export function slotLivreProximo(
  alvoKey: string,
  slots: Slot[],
  ocupados: Map<string, PosicaoEstoque>,
): Slot | null {
  const alvo = slots.find((s) => s.key === alvoKey)
  if (!alvo) return null
  const livres = slots.filter((s) => !ocupados.has(s.key))
  if (livres.length === 0) return null
  livres.sort((a, b) => {
    const da = dist(a, alvo)
    const db = dist(b, alvo)
    return da - db
  })
  return livres[0]
}

function dist(a: Slot, b: Slot) {
  const dr = a.ruaIdx === b.ruaIdx ? 0 : 100 // penaliza trocar de rua
  return (
    dr +
    Math.abs(a.colIdx - b.colIdx) +
    Math.abs(a.levelIdx - b.levelIdx)
  )
}
