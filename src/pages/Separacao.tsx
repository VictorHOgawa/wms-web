import { useEffect, useMemo, useState } from 'react'
import { ScanLine, PackageSearch, ArrowRight, Send, Workflow, CheckCircle2, Clock, Circle, Lock, FileText } from 'lucide-react'
import {
  isConnected,
  wmsApi,
  type WmsSeparacaoDTO,
  type WmsStockPositionDTO,
  type WarehouseOverviewDTO,
} from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader, type Tone } from '../components/ui'
import { num } from '../lib/utils'

const STATUS_TONE: Record<string, Tone> = { AVAILABLE: 'info', COMPLETED: 'ok', DONE: 'ok' }
const ESTRATEGIAS = ['FIFO', 'FEFO', 'BATCH', 'ZONE', 'WAVE']

/**
 * Separação / Picking (Fluxo 6): a torre despacha uma separação a partir de uma
 * posição de picking (o coletor executa e baixa o estoque). Enquanto o picking
 * não nasce automático da viagem, o supervisor gera manualmente (decisão 21).
 */
export default function Separacao() {
  const conectado = isConnected()
  const [posicoes, setPosicoes] = useState<WmsStockPositionDTO[]>([])
  const [seps, setSeps] = useState<WmsSeparacaoDTO[]>([])
  const [osViagem, setOsViagem] = useState<WarehouseOverviewDTO[]>([])
  const [estrategiaDefault, setEstrategiaDefault] = useState('FIFO')
  const [loading, setLoading] = useState(conectado)
  const [msg, setMsg] = useState<string | null>(null)

  const carregar = async () => {
    try {
      const [pos, sp, ov] = await Promise.all([
        wmsApi.stockPositions(),
        wmsApi.separacoes(),
        wmsApi.warehouseOverview('Separação').catch(() => [] as WarehouseOverviewDTO[]),
      ])
      setPosicoes(pos)
      setSeps(sp)
      setOsViagem(ov)
    } catch { /* mantém */ } finally { setLoading(false) }
  }
  useEffect(() => {
    if (!conectado) return
    carregar()
    // Estratégia default vem do PARÂMETRO do admin (estrategia_picking), não de
    // um select solto (decisão do plano de 06/07).
    wmsApi
      .paramValues()
      .then((ps) => {
        const p = ps.find((x) => x.chave === 'estrategia_picking' && typeof x.valor === 'string')
        if (p && ESTRATEGIAS.includes(String(p.valor))) setEstrategiaDefault(String(p.valor))
      })
      .catch(() => { /* default FIFO */ })
    // eslint-disable-next-line
  }, [conectado])

  const pickables = useMemo(
    () => posicoes.filter((p) => p.addressType === 'PICKING' && p.status === 'DISPONIVEL' && p.quantity > 0),
    [posicoes],
  )

  const gerar = async (pos: WmsStockPositionDTO, qtd: number) => {
    setMsg(null)
    try {
      const r = await wmsApi.gerarSeparacao({ positionId: pos.id, quantity: qtd })
      setMsg(`Separação ${r.code} gerada — ${qtd} un de ${pos.skuCode}. Cai no coletor.`)
      await carregar()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Falha ao gerar separação.') }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Separação (picking)" subtitle="Despacha a separação de uma posição de picking; o coletor executa e baixa o estoque">
        {conectado ? <Badge tone="ok">{num(seps.length)} separações · WMS</Badge> : <Badge tone="warn">modo demo — conecte ao WMS</Badge>}
      </PageHeader>

      {msg && <div className="card p-3 text-sm text-ink-soft">{msg}</div>}

      {/* Separações que NASCEM DA VIAGEM (O.S do blueprint): lista + romaneio. */}
      {conectado && osViagem.filter((o) => o.status !== 'CANCELLED').length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Separações da viagem
          </div>
          <div className="divide-y divide-line">
            {osViagem
              .filter((o) => o.status !== 'CANCELLED')
              .map((os) => (
                <SeparacaoViagem
                  key={os.serviceOrderId}
                  os={os}
                  estrategiaDefault={estrategiaDefault}
                  onDone={(m) => { setMsg(m); void carregar() }}
                />
              ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Posições de picking disponíveis
          </div>
          {pickables.length === 0 ? (
            <EmptyState icon={<PackageSearch className="h-6 w-6" />} title={loading ? 'Carregando…' : 'Nenhuma posição de picking'} text="Guarde estoque em endereços de PICKING para separar." />
          ) : (
            <ul>
              {pickables.map((p) => <LinhaPosicao key={p.id} pos={p} onGerar={gerar} />)}
            </ul>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Separações despachadas
          </div>
          {seps.length === 0 ? (
            <EmptyState icon={<ScanLine className="h-6 w-6" />} title="Nenhuma separação" text="Gere uma separação à esquerda; ela cai no coletor do operador." />
          ) : (
            <table className="w-full text-sm">
              <thead><tr>
                <th className="th">O.S</th><th className="th">SKU</th><th className="th text-right">Qtd</th><th className="th">Status</th>
              </tr></thead>
              <tbody>
                {seps.map((s) => (
                  <tr key={s.eventId} className="row-hover">
                    <td className="td mono text-xs text-brand">{s.code}</td>
                    <td className="td mono text-xs">{s.skuCode ?? '—'}<span className="block text-ink-muted">{s.fromAddressCode}</span></td>
                    <td className="td text-right mono">{num(s.quantidade)}{s.separado != null ? ` → ${num(s.separado)}` : ''}</td>
                    <td className="td">
                      <Badge tone={STATUS_TONE[s.status] ?? 'neutral'} dot>{s.status === 'AVAILABLE' ? 'no coletor' : 'concluída'}</Badge>
                      {s.parcial ? <Badge tone="warn">parcial</Badge> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

/** O.S "Separação" da viagem: lista de separação (estratégia) + romaneio. */
function SeparacaoViagem({
  os,
  estrategiaDefault,
  onDone,
}: {
  os: WarehouseOverviewDTO
  estrategiaDefault: string
  onDone: (msg: string) => void
}) {
  const [estrategia, setEstrategia] = useState(estrategiaDefault)
  const [busy, setBusy] = useState(false)
  useEffect(() => setEstrategia(estrategiaDefault), [estrategiaDefault])

  const lista = os.eventos.find((e) => e.code === 'RELATLISTASEPARA')
  const romaneio = os.eventos.find((e) => e.code === 'ROMANEIODOCUMENTO')
  const romaneioItens = Array.isArray((romaneio?.data as { itens?: unknown[] } | null)?.itens)
    ? ((romaneio!.data as { itens: unknown[] }).itens.length)
    : null

  const exec = async (eventId: string, data: Record<string, unknown>, rotulo: string) => {
    setBusy(true)
    try {
      await wmsApi.executeOsEvent(os.serviceOrderId, eventId, data)
      onDone(`✓ ${rotulo} concluído (${os.code}).`)
    } catch (e) {
      onDone(e instanceof Error ? e.message : `Falha em ${rotulo}.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <Workflow className="h-4 w-4 text-brand" />
      <div className="min-w-[180px]">
        <div className="font-medium">
          {os.documentos.length
            ? os.documentos.map((d) => `${d.tipo ?? 'DOC'} ${d.numero ?? '—'}`).join(' · ')
            : 'Carga da viagem'}
        </div>
        <div className="text-xs text-ink-muted">
          {os.trip ? `viagem ${os.trip.code} · ` : ''}
          <span className="mono">{os.code}</span>
        </div>
      </div>

      {/* passos */}
      <span className="inline-flex items-center gap-1.5">
        {lista?.status === 'COMPLETED' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : lista?.status === 'AVAILABLE' ? <Clock className="h-4 w-4 text-amber-500" /> : <Circle className="h-4 w-4 text-ink-muted/40" />}
        Lista
      </span>
      <span className="inline-flex items-center gap-1.5">
        {romaneio?.status === 'COMPLETED' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : romaneio?.status === 'AVAILABLE' ? <Clock className="h-4 w-4 text-amber-500" /> : <Circle className="h-4 w-4 text-ink-muted/40" />}
        Romaneio{romaneioItens != null ? ` (${romaneioItens} doc)` : ''}
      </span>

      {os.bloqueada && (
        <Badge tone="warn"><Lock className="h-3 w-3" /> aguardando{os.bloqueadaPor ? `: ${os.bloqueadaPor}` : ''}</Badge>
      )}

      <div className="ml-auto flex items-center gap-2">
        {lista?.status === 'AVAILABLE' && (
          <>
            <select
              value={estrategia}
              onChange={(e) => setEstrategia(e.target.value)}
              className="rounded-lg border border-line bg-surface-sub px-2 py-1.5 text-xs outline-none"
              title="Estratégia de picking (default vem do parâmetro do admin)"
            >
              {ESTRATEGIAS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              className="btn-primary text-xs disabled:opacity-50"
              disabled={busy || os.bloqueada}
              onClick={() => exec(lista.eventId, { reportGeneratedAt: new Date().toISOString(), estrategiaPicking: estrategia }, 'Lista de separação')}
            >
              Gerar lista
            </button>
          </>
        )}
        {romaneio?.status === 'AVAILABLE' && (
          <button
            className="btn-primary text-xs disabled:opacity-50"
            disabled={busy || os.bloqueada}
            onClick={() => exec(romaneio.eventId, {}, 'Romaneio')}
          >
            <FileText className="h-3.5 w-3.5 inline -mt-0.5 mr-1" />
            Gerar romaneio
          </button>
        )}
        {romaneio?.status === 'COMPLETED' && (
          <button
            className="btn-outline text-xs"
            title="Um romaneio por parada de entrega (decisão A4) — abre a versão de impressão"
            onClick={() => imprimirRomaneios(os, romaneio.data)}
          >
            <FileText className="h-3.5 w-3.5 inline -mt-0.5 mr-1" />
            Ver romaneio
          </button>
        )}
        {os.status === 'COMPLETED' && <Badge tone="ok">concluída</Badge>}
      </div>
    </div>
  )
}

/**
 * A4: visão IMPRIMÍVEL do romaneio — um por parada de entrega, detalhado
 * (documento → NFs → volumes). Abre em janela própria e chama a impressão.
 */
function imprimirRomaneios(os: WarehouseOverviewDTO, data: Record<string, unknown> | null) {
  interface RomaneioNfe { numero: string | null; volumes: number }
  interface RomaneioDoc { tipo: string | null; numero: string | null; weightKg: number | null; volumeM3: number | null; nfes: RomaneioNfe[] }
  interface Romaneio { romaneio: string; sequence: number | null; destino: string | null; documentos: RomaneioDoc[]; totalDocumentos: number; pesoTotalKg: number; volumeTotalM3: number }
  const romaneios = (data?.romaneios as Romaneio[] | undefined) ?? []
  const esc = (v: unknown) => String(v ?? '—').replace(/</g, '&lt;')
  const corpo = romaneios.length
    ? romaneios
        .map(
          (r) => `
    <section>
      <h2>Romaneio ${esc(r.romaneio)} — parada ${esc(r.sequence)}${r.destino ? ` · ${esc(r.destino)}` : ''}</h2>
      <table>
        <thead><tr><th>Documento</th><th>NFs (volumes)</th><th>Peso (kg)</th><th>Volume (m³)</th></tr></thead>
        <tbody>
          ${r.documentos
            .map(
              (d) => `<tr>
                <td>${esc(d.tipo)} ${esc(d.numero)}</td>
                <td>${d.nfes.length ? d.nfes.map((n) => `NF ${esc(n.numero)} (${n.volumes} vol)`).join(', ') : '—'}</td>
                <td>${d.weightKg ?? '—'}</td>
                <td>${d.volumeM3 ?? '—'}</td>
              </tr>`,
            )
            .join('')}
        </tbody>
      </table>
      <p class="tot">${r.totalDocumentos} documento(s) · ${r.pesoTotalKg} kg · ${r.volumeTotalM3} m³</p>
    </section>`,
        )
        .join('')
    : '<p>Romaneio antigo (antes da decisão A4) — sem detalhamento por parada.</p>'
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Romaneio — ${esc(os.trip?.code ?? os.code)}</title>
    <style>
      body{font-family:system-ui,sans-serif;margin:24px;color:#111}
      h1{font-size:18px;margin:0 0 4px} .sub{color:#555;font-size:12px;margin-bottom:16px}
      h2{font-size:14px;margin:18px 0 6px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #ccc;padding:4px 8px;text-align:left}
      th{background:#f3f4f6} .tot{font-size:11px;color:#555}
      @media print{button{display:none}}
    </style></head><body>
    <h1>Romaneio de carga — viagem ${esc(os.trip?.code ?? '')}</h1>
    <div class="sub">O.S ${esc(os.code)} · CD ${esc(os.cd?.name)} · um romaneio por parada de entrega</div>
    ${corpo}
    <button onclick="window.print()">Imprimir</button>
  </body></html>`
  const w = window.open('', '_blank', 'width=900,height=700')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}

function LinhaPosicao({ pos, onGerar }: { pos: WmsStockPositionDTO; onGerar: (p: WmsStockPositionDTO, qtd: number) => void }) {
  const [qtd, setQtd] = useState('')
  const n = Number(qtd) || 0
  return (
    <li className="px-4 py-2.5 border-b border-line flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex-1 min-w-[160px]">
        <div className="mono text-sm text-brand">{pos.skuCode}</div>
        <div className="text-[11px] text-ink-muted">{pos.addressCode} · {num(pos.quantity)} {pos.unit} disp.</div>
      </div>
      <ArrowRight className="h-4 w-4 text-ink-muted" />
      <input
        type="number"
        value={qtd}
        onChange={(e) => setQtd(e.target.value)}
        placeholder="qtd"
        className="w-20 rounded-lg border border-line bg-surface-sub px-2 py-1.5 text-sm outline-none"
      />
      <button className="btn-primary text-xs" disabled={n <= 0 || n > pos.quantity} onClick={() => onGerar(pos, n)}>
        <Send className="h-4 w-4" /> Separar
      </button>
    </li>
  )
}
