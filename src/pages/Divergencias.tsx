import { useEffect, useMemo, useState } from 'react'
import { PackageX, User, Lock, LockOpen, MessageSquarePlus, Paperclip, BellRing } from 'lucide-react'
import { isConnected, wmsApi, type WmsDivergenceDTO } from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader, type Tone } from '../components/ui'
import { num } from '../lib/utils'

const TIPO_TONE: Record<string, Tone> = {
  FALTA: 'warn',
  SOBRA: 'info',
  AVARIA: 'bad',
  VENCIDO: 'bad',
  TROCA: 'neutral',
}
const STATUS_META: Record<string, { l: string; tone: Tone }> = {
  ABERTA: { l: 'Aberta', tone: 'warn' },
  EM_TRATAMENTO: { l: 'Em tratamento', tone: 'info' },
  RESOLVIDA: { l: 'Resolvida', tone: 'ok' },
}
const TRATATIVAS = [
  { v: 'devolve', l: 'Devolve ao cliente' },
  { v: 'entrega-assim-mesmo', l: 'Entrega assim mesmo' },
  { v: 'aguarda-complementar', l: 'Aguarda complementar' },
]
const FILTROS = [
  { v: '', l: 'Todas' },
  { v: 'ABERTA', l: 'Abertas' },
  { v: 'EM_TRATAMENTO', l: 'Em tratamento' },
  { v: 'RESOLVIDA', l: 'Resolvidas' },
]

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function Divergencias() {
  const conectado = isConnected()
  const [divs, setDivs] = useState<WmsDivergenceDTO[]>([])
  const [filtro, setFiltro] = useState('')
  const [aberta, setAberta] = useState<string | null>(null)
  const [loading, setLoading] = useState(conectado)

  const carregar = async () => {
    try {
      setDivs(await wmsApi.divergences())
    } catch {
      /* mantém */
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (!conectado) return
    let vivo = true
    ;(async () => {
      try {
        const d = await wmsApi.divergences()
        if (vivo) setDivs(d)
      } catch {
        /* vazio */
      } finally {
        if (vivo) setLoading(false)
      }
    })()
    return () => {
      vivo = false
    }
  }, [conectado])

  const lista = useMemo(() => (filtro ? divs.filter((d) => d.status === filtro) : divs), [divs, filtro])
  const nSegregadas = useMemo(() => divs.filter((d) => d.segregado).length, [divs])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Divergências de Recebimento"
        subtitle="Ocorrências tipificadas da conferência — segregadas e notificadas ao comercial; só saem por alçada, sem travar o chão"
      >
        {conectado ? (
          <>
            <Badge tone="ok">{num(lista.length)} ocorrências · WMS</Badge>
            {nSegregadas > 0 && <Badge tone="warn" dot>{num(nSegregadas)} segregada(s)</Badge>}
          </>
        ) : (
          <Badge tone="warn">modo demo — conecte ao WMS para ver</Badge>
        )}
      </PageHeader>

      <div className="card p-3 flex flex-wrap items-center gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f.v}
            onClick={() => setFiltro(f.v)}
            className={`chip cursor-pointer transition-colors ${filtro === f.v ? 'bg-primary text-white' : 'bg-slate-100 text-ink-soft hover:bg-slate-200'}`}
          >
            {f.l}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {lista.map((d) => {
          const st = STATUS_META[d.status] ?? { l: d.status, tone: 'neutral' as Tone }
          const expandida = aberta === d.id
          return (
            <div key={d.id} className="card overflow-hidden">
              <button
                className="w-full px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-left hover:bg-surface-sub/50"
                onClick={() => setAberta(expandida ? null : d.id)}
              >
                <Badge tone={st.tone} dot>{st.l}</Badge>
                <Badge tone={TIPO_TONE[d.tipo] ?? 'neutral'}>{d.tipo}</Badge>
                {d.segregado ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-warn"><Lock className="h-3.5 w-3.5" /> Segregada</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-ok"><LockOpen className="h-3.5 w-3.5" /> Liberada</span>
                )}
                <span className="mono text-xs text-brand">{d.skuCode ?? d.itemKey ?? '—'}</span>
                <span className="mono text-xs text-ink-soft">
                  {num(d.esperada)} → <span className="font-medium text-ink">{num(d.conferida)}</span>{' '}
                  <span className={d.divergencia < 0 ? 'text-warn' : 'text-info'}>({d.divergencia > 0 ? '+' : ''}{d.divergencia})</span>
                </span>
                {d.notificadoComercialEm && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted"><BellRing className="h-3 w-3" /> comercial notificado</span>
                )}
                {(d.notas?.length ?? 0) > 0 && (
                  <span className="text-[11px] text-ink-muted">{d.notas!.length} nota(s)</span>
                )}
                <span className="ml-auto text-xs text-ink-muted mono">{fmtDateTime(d.createdAt)}</span>
              </button>

              {expandida && <DetalheDivergencia d={d} onChange={carregar} />}
            </div>
          )
        })}
      </div>

      {lista.length === 0 && (
        <div className="card">
          <EmptyState
            icon={<PackageX className="h-6 w-6" />}
            title={conectado ? (loading ? 'Carregando…' : 'Nenhuma divergência') : 'Sem conexão com o WMS'}
            text={
              conectado
                ? 'As ocorrências aparecem aqui quando o operador confere uma carga e a quantidade não bate.'
                : 'Entre com credenciais reais do Hub para ver as ocorrências.'
            }
          />
        </div>
      )}
    </div>
  )
}

/** Painel "drive": responsável, tratativa, timeline de notas, adicionar nota e liberar por alçada. */
function DetalheDivergencia({ d, onChange }: { d: WmsDivergenceDTO; onChange: () => Promise<void> }) {
  const [nota, setNota] = useState('')
  const [anexoNome, setAnexoNome] = useState('')
  const [tratativa, setTratativa] = useState(d.tratativa ?? '')
  const [busy, setBusy] = useState(false)

  const addNota = async () => {
    if (!nota.trim() && !anexoNome.trim()) return
    setBusy(true)
    try {
      await wmsApi.addDivergenceNote(d.id, {
        texto: nota.trim() || undefined,
        anexo: anexoNome.trim() ? { nome: anexoNome.trim(), url: '' } : undefined,
      })
      setNota('')
      setAnexoNome('')
      await onChange()
    } finally {
      setBusy(false)
    }
  }

  const liberar = async () => {
    setBusy(true)
    try {
      await wmsApi.liberarDivergence(d.id, { tratativa: tratativa || undefined })
      await onChange()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-t border-line bg-surface-sub/40 p-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="text-xs text-ink-soft flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-ink-muted" /> Responsável do chão: <b className="text-ink">{d.responsavel ?? '—'}</b>
        </div>
        {d.liberadoPor && (
          <div className="text-xs text-ink-soft">
            Liberada por <b className="text-ink">{d.liberadoPor}</b> {d.liberadoEm ? `· ${fmtDateTime(d.liberadoEm)}` : ''}
          </div>
        )}
      </div>

      {/* timeline de notas */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted mb-1">Histórico</div>
        {(d.notas?.length ?? 0) === 0 ? (
          <p className="text-xs text-ink-muted">Sem notas ainda. Registre e-mails, prints, decisões — é o drive da ocorrência.</p>
        ) : (
          <ul className="space-y-1.5">
            {d.notas!.map((n, i) => (
              <li key={i} className="text-xs text-ink-soft border-l-2 border-line pl-2">
                <span className="text-ink-muted mono">{fmtDateTime(n.quando)}</span> · <b className="text-ink">{n.quem}</b>
                {n.texto ? <> — {n.texto}</> : null}
                {n.anexo?.nome ? <span className="inline-flex items-center gap-1 ml-1 text-brand"><Paperclip className="h-3 w-3" />{n.anexo.nome}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* adicionar nota */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Nova nota (ex.: falei com a Camila da Electrolux, pode seguir até dia 17)"
          className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none"
        />
        <input
          value={anexoNome}
          onChange={(e) => setAnexoNome(e.target.value)}
          placeholder="anexo (nome)"
          className="sm:w-40 rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none"
        />
        <button className="btn-outline text-sm" disabled={busy || (!nota.trim() && !anexoNome.trim())} onClick={addNota}>
          <MessageSquarePlus className="h-4 w-4" /> Adicionar
        </button>
      </div>

      {/* liberar por alçada */}
      {d.segregado ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <span className="text-xs text-ink-soft">Liberar segregação (alçada):</span>
          <select
            value={tratativa}
            onChange={(e) => setTratativa(e.target.value)}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs outline-none"
          >
            <option value="">— escolha a tratativa —</option>
            {TRATATIVAS.map((t) => (
              <option key={t.v} value={t.v}>{t.l}</option>
            ))}
          </select>
          <button className="btn-primary text-sm" disabled={busy || !tratativa} onClick={liberar}>
            <LockOpen className="h-4 w-4" /> Liberar e resolver
          </button>
        </div>
      ) : (
        <div className="border-t border-line pt-3 text-xs text-ok">
          Ocorrência liberada{d.tratativa ? ` — ${TRATATIVAS.find((t) => t.v === d.tratativa)?.l ?? d.tratativa}` : ''}.
        </div>
      )}
    </div>
  )
}
