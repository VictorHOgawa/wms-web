import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const num = (v: number) => v.toLocaleString('pt-BR')

export const fmtDate = (iso: string | null) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** dias até a validade (FEFO) — base fixa 2026-05-29 (data do projeto) */
export const diasValidade = (iso: string | null) => {
  if (!iso) return null
  const base = new Date('2026-05-29')
  const v = new Date(iso)
  return Math.round((v.getTime() - base.getTime()) / 86400000)
}
