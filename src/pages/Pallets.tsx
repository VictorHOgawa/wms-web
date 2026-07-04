import { useEffect, useMemo, useState } from 'react'
import { Layers, Plus, ScanLine, Lock, Truck } from 'lucide-react'
import { isConnected, wmsApi, type WmsPalletDTO, type WmsEtiquetaIdentidadeDTO } from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader, type Tone } from '../components/ui'
import { num } from '../lib/utils'

const STATUS_TONE: Record<string, Tone> = { ABERTO: 'info', FECHADO: 'ok' }

function fmt(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

/**
 * Montagem de pallet (decisão 29): bipa o pallet → bipa os volumes (etiquetas
 * identitárias) → fecha com o destino roteirizado (segregação). Pallet misto é
 * normal. É a visão de torre; no chão o coletor faz o mesmo por bipagem.
 */
export default function Pallets() {
  const conectado = isConnected()
  const [pallets, setPallets] = useState<WmsPalletDTO[]>([])
  const [aberto, setAberto] = useState<string | null>(null)
  const [loading, setLoading] = useState(conectado)
  const [msg, setMsg] = useState<string | null>(null)

  const carregar = async () => {
    try { setPallets(await wmsApi.pallets()) } catch { /* mantém */ } finally { setLoading(false) }
  }
  useEffect(() => { if (conectado) carregar() /* eslint-disable-next-line */ }, [conectado])

  const abrir = async () => {
    setMsg(null)
    try { await wmsApi.abrirPallet({}); await carregar() }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Falha ao abrir pallet.') }
  }

  const emMontagem = useMemo(() => pallets.filter((p) => p.status === 'ABERTO').length, [pallets])

  return (
    <div className="space-y-6">
      <PageHeader title="Montagem de pallets" subtitle="Bipa o pallet → bipa os volumes → fecha com o destino roteirizado (pallet misto é normal)">
        {conectado ? (
          <>
            <Badge tone="ok">{num(pallets.length)} pallets · WMS</Badge>
            {emMontagem > 0 && <Badge tone="info" dot>{num(emMontagem)} em montagem</Badge>}
            <button className="btn-primary" onClick={abrir}><Plus className="h-4 w-4" /> Abrir pallet</button>
          </>
        ) : (
          <Badge tone="warn">modo demo — conecte ao WMS</Badge>
        )}
      </PageHeader>

      {msg && <div className="card p-3 text-sm text-bad">{msg}</div>}

      <div className="space-y-2">
        {pallets.map((p) => (
          <div key={p.id} className="card overflow-hidden">
            <button
              className="w-full px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-left hover:bg-surface-sub/50"
              onClick={() => setAberto(aberto === p.id ? null : p.id)}
            >
              <Layers className="h-4 w-4 text-ink-muted" />
              <span className="mono font-medium text-brand">{p.codigo}</span>
              <Badge tone={STATUS_TONE[p.status] ?? 'neutral'} dot>{p.status === 'ABERTO' ? 'Em montagem' : 'Fechado'}</Badge>
              <span className="text-xs text-ink-soft">{num(p.nVolumes)} volume(s)</span>
              {p.destino && <span className="inline-flex items-center gap-1 text-xs text-ink-soft"><Truck className="h-3.5 w-3.5" /> {p.destino}</span>}
              <span className="ml-auto text-xs text-ink-muted mono">{fmt(p.createdAt)}</span>
            </button>
            {aberto === p.id && <DetalhePallet pallet={p} onChange={carregar} />}
          </div>
        ))}
      </div>

      {pallets.length === 0 && (
        <div className="card">
          <EmptyState
            icon={<Layers className="h-6 w-6" />}
            title={conectado ? (loading ? 'Carregando…' : 'Nenhum pallet') : 'Sem conexão com o WMS'}
            text={conectado ? 'Clique em "Abrir pallet" e bipe os volumes (etiquetas de caixa mestre) para montar.' : 'Entre com credenciais reais do Hub.'}
          />
        </div>
      )}
    </div>
  )
}

function DetalhePallet({ pallet, onChange }: { pallet: WmsPalletDTO; onChange: () => Promise<void> }) {
  const [volumes, setVolumes] = useState<WmsEtiquetaIdentidadeDTO[]>([])
  const [codigo, setCodigo] = useState('')
  const [destino, setDestino] = useState(pallet.destino ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const carregarVolumes = async () => {
    try { setVolumes(await wmsApi.palletVolumes(pallet.id)) } catch { /* vazio */ }
  }
  useEffect(() => { carregarVolumes() /* eslint-disable-next-line */ }, [pallet.id, pallet.nVolumes])

  const bipar = async () => {
    if (!codigo.trim()) return
    setBusy(true); setErr(null)
    try { await wmsApi.addVolumePallet(pallet.id, codigo.trim()); setCodigo(''); await carregarVolumes(); await onChange() }
    catch (e) { setErr(e instanceof Error ? e.message : 'Falha ao bipar volume.') }
    finally { setBusy(false) }
  }
  const fechar = async () => {
    setBusy(true); setErr(null)
    try { await wmsApi.fecharPallet(pallet.id, { destino: destino.trim() || undefined }); await onChange() }
    catch (e) { setErr(e instanceof Error ? e.message : 'Falha ao fechar.') }
    finally { setBusy(false) }
  }

  return (
    <div className="border-t border-line bg-surface-sub/40 p-4 space-y-3">
      {volumes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {volumes.map((v) => (
            <span key={v.id} className="mono text-[11px] rounded-md border border-line bg-surface px-1.5 py-0.5 text-ink-soft" title={v.skuCode}>
              {v.codigo}<span className="text-ink-muted"> · {v.tipoVolume === 'CAIXA' ? 'cx' : 'un'}</span>
            </span>
          ))}
        </div>
      )}

      {pallet.status === 'ABERTO' ? (
        <>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 flex-1">
              <ScanLine className="h-4 w-4 text-ink-muted" />
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') bipar() }}
                placeholder="Bipe/cole o código do volume (etiqueta)"
                className="bg-transparent outline-none flex-1 text-sm mono"
              />
            </div>
            <button className="btn-outline" disabled={busy || !codigo.trim()} onClick={bipar}>Bipar volume</button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 border-t border-line pt-3">
            <input
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              placeholder="Destino roteirizado (ex.: Cascavel)"
              className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none"
            />
            <button className="btn-primary" disabled={busy || pallet.nVolumes === 0} onClick={fechar}>
              <Lock className="h-4 w-4" /> Fechar e segregar
            </button>
          </div>
        </>
      ) : (
        <div className="text-xs text-ok">Pallet fechado{pallet.destino ? ` → ${pallet.destino}` : ''} · {fmt(pallet.fechadoEm)}{pallet.fechadoPor ? ` por ${pallet.fechadoPor}` : ''}.</div>
      )}

      {err && <div className="text-xs text-bad">{err}</div>}
    </div>
  )
}
