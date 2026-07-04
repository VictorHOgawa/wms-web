import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Plus, Trash2, Wand2, CheckCircle2, Users, Package } from 'lucide-react'
import { isConnected, wmsApi, type WmsApontamentoDTO, type WmsApontamentoItemDTO } from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader } from '../components/ui'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
function fmt(iso: string): string {
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}

type LinhaEdit = { categoria: 'MAO_DE_OBRA' | 'INSUMO'; recurso: string; quantidade: string; unidade: string; horas: string; custoUnitario: string; sugerido?: boolean }
const linhaVazia = (): LinhaEdit => ({ categoria: 'INSUMO', recurso: '', quantidade: '', unidade: 'un', horas: '', custoUnitario: '', sugerido: false })

/**
 * Apontamento de mão de obra + insumos (decisão 34): registra o que foi
 * consumido numa carga (viagem/CTE) e a quem se atribui. O custo apontado soma
 * no CTE (a cobrança vive no TMS). Sugestões automáticas entram para validação.
 */
export default function Apontamento() {
  const conectado = isConnected()
  const [lista, setLista] = useState<WmsApontamentoDTO[]>([])
  const [loading, setLoading] = useState(conectado)

  const carregar = async () => {
    try { setLista(await wmsApi.apontamentos()) } catch { /* mantém */ } finally { setLoading(false) }
  }
  useEffect(() => { if (conectado) carregar() /* eslint-disable-next-line */ }, [conectado])

  const validar = async (id: string) => {
    try { await wmsApi.validarApontamento(id, {}); await carregar() } catch { /* ignora */ }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Apontamento (insumos & mão de obra)" subtitle="Registra o consumo por carga e parceiro — o custo apontado soma no CTE (cobrança no TMS)">
        {conectado ? <Badge tone="ok">{lista.length} apontamento(s)</Badge> : <Badge tone="warn">modo demo — conecte ao WMS</Badge>}
      </PageHeader>

      {conectado && <NovoApontamento onSaved={carregar} />}

      <div className="space-y-2">
        {lista.map((a) => (
          <div key={a.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="mono font-medium text-brand">{a.chave}</span>
              <Badge tone={a.validado ? 'ok' : 'warn'} dot>{a.validado ? 'Validado' : 'Aguarda validação'}</Badge>
              <span className="text-sm font-semibold text-ink">{brl(a.custoTotalBRL)}</span>
              <span className="text-xs text-ink-muted">{a.itens.length} item(ns)</span>
              <span className="ml-auto text-xs text-ink-muted mono">{fmt(a.createdAt)}</span>
              {!a.validado && <button className="btn-primary text-xs" onClick={() => validar(a.id)}><CheckCircle2 className="h-4 w-4" /> Validar</button>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {a.itens.map((it, i) => <ItemChip key={i} it={it} />)}
            </div>
          </div>
        ))}
      </div>

      {lista.length === 0 && (
        <div className="card">
          <EmptyState icon={<ClipboardList className="h-6 w-6" />} title={conectado ? (loading ? 'Carregando…' : 'Nenhum apontamento') : 'Sem conexão'} text="Registre o consumo de uma carga acima." />
        </div>
      )}
    </div>
  )
}

function ItemChip({ it }: { it: WmsApontamentoItemDTO }) {
  const Icon = it.categoria === 'MAO_DE_OBRA' ? Users : Package
  return (
    <span className="inline-flex items-center gap-1 text-[11px] rounded-md border border-line bg-surface-sub px-1.5 py-0.5 text-ink-soft">
      <Icon className="h-3 w-3 text-ink-muted" />
      {it.recurso}: {it.quantidade}{it.unidade !== 'un' ? ` ${it.unidade}` : ''}{it.horas ? ` · ${it.horas}h` : ''}
      {it.custoBRL > 0 ? ` · ${brl(it.custoBRL)}` : ''}
      {it.sugerido && <span className="text-warn">·sug.</span>}
    </span>
  )
}

function NovoApontamento({ onSaved }: { onSaved: () => void }) {
  const [chave, setChave] = useState('')
  const [nPallets, setNPallets] = useState('')
  const [linhas, setLinhas] = useState<LinhaEdit[]>([linhaVazia()])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const set = (i: number, patch: Partial<LinhaEdit>) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const total = useMemo(() => linhas.reduce((s, l) => {
    const q = Number(l.quantidade) || 0, cu = Number(l.custoUnitario) || 0
    return s + Math.round(q * cu * 100) / 100
  }, 0), [linhas])

  const sugerir = async () => {
    setErr(null)
    try {
      const s = await wmsApi.sugestaoApontamento(Number(nPallets) || 0)
      setLinhas(s.itens.map((it) => ({ categoria: it.categoria as 'MAO_DE_OBRA' | 'INSUMO', recurso: it.recurso, quantidade: String(it.quantidade), unidade: it.unidade, horas: it.horas ? String(it.horas) : '', custoUnitario: '', sugerido: true })))
    } catch (e) { setErr(e instanceof Error ? e.message : 'Falha na sugestão.') }
  }

  const salvar = async () => {
    const itens = linhas.filter((l) => l.recurso.trim()).map((l) => ({
      categoria: l.categoria, recurso: l.recurso.trim(), quantidade: Number(l.quantidade) || 0, unidade: l.unidade,
      horas: l.horas ? Number(l.horas) : null, custoUnitario: l.custoUnitario ? Number(l.custoUnitario) : null, sugerido: l.sugerido,
    }))
    if (!chave.trim() || itens.length === 0) return
    setBusy(true); setErr(null)
    try { await wmsApi.registrarApontamento({ chave: chave.trim(), itens }); setChave(''); setLinhas([linhaVazia()]); onSaved() }
    catch (e) { setErr(e instanceof Error ? e.message : 'Falha ao registrar.') }
    finally { setBusy(false) }
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] items-end">
        <div>
          <label className="text-xs font-medium text-ink-muted">Chave da carga (viagem/CTE)</label>
          <input value={chave} onChange={(e) => setChave(e.target.value)} placeholder="ex.: CTE-2026-1234" className="mt-1 w-full rounded-xl border border-line bg-surface-sub px-3 py-2 text-sm outline-none mono" />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Nº de pallets (p/ sugestão)</label>
          <input type="number" value={nPallets} onChange={(e) => setNPallets(e.target.value)} placeholder="30" className="mt-1 w-full rounded-xl border border-line bg-surface-sub px-3 py-2 text-sm outline-none" />
        </div>
        <button className="btn-outline" onClick={sugerir} disabled={!nPallets}><Wand2 className="h-4 w-4" /> Sugerir</button>
      </div>

      <div className="space-y-2">
        {linhas.map((l, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[130px_1fr_80px_90px_90px_100px_auto] items-center">
            <select value={l.categoria} onChange={(e) => set(i, { categoria: e.target.value as 'MAO_DE_OBRA' | 'INSUMO' })} className="rounded-lg border border-line bg-surface-sub px-2 py-1.5 text-xs outline-none">
              <option value="INSUMO">Insumo</option>
              <option value="MAO_DE_OBRA">Mão de obra</option>
            </select>
            <input value={l.recurso} onChange={(e) => set(i, { recurso: e.target.value })} placeholder="recurso (ex.: Stretch, Conferente)" className="rounded-lg border border-line bg-surface-sub px-2 py-1.5 text-xs outline-none" />
            <input type="number" value={l.quantidade} onChange={(e) => set(i, { quantidade: e.target.value })} placeholder="qtd" className="rounded-lg border border-line bg-surface-sub px-2 py-1.5 text-xs outline-none" />
            <input value={l.unidade} onChange={(e) => set(i, { unidade: e.target.value })} placeholder="un" className="rounded-lg border border-line bg-surface-sub px-2 py-1.5 text-xs outline-none" />
            <input type="number" value={l.horas} onChange={(e) => set(i, { horas: e.target.value })} placeholder="horas" className="rounded-lg border border-line bg-surface-sub px-2 py-1.5 text-xs outline-none" />
            <input type="number" value={l.custoUnitario} onChange={(e) => set(i, { custoUnitario: e.target.value })} placeholder="R$/un" className="rounded-lg border border-line bg-surface-sub px-2 py-1.5 text-xs outline-none" />
            <button className="btn-ghost p-1.5 text-bad" onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))} title="Remover"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button className="btn-ghost text-xs" onClick={() => setLinhas((ls) => [...ls, linhaVazia()])}><Plus className="h-4 w-4" /> Adicionar linha</button>
      </div>

      {err && <div className="text-xs text-bad">{err}</div>}
      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="text-sm text-ink-soft">Custo estimado: <b className="text-ink">{brl(total)}</b> <span className="text-xs text-ink-muted">(soma no CTE)</span></span>
        <button className="btn-primary" disabled={busy || !chave.trim() || linhas.every((l) => !l.recurso.trim())} onClick={salvar}>
          <ClipboardList className="h-4 w-4" /> Registrar apontamento
        </button>
      </div>
    </div>
  )
}
