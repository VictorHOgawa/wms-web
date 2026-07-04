import { useEffect, useMemo, useState } from 'react'
import { Tags, AlertTriangle, Printer } from 'lucide-react'
import {
  isConnected,
  wmsApi,
  type WmsOwnerLiteDTO,
  type WmsSkuLiteDTO,
  type WmsEtiquetaPreviewDTO,
  type WmsEtiquetaLoteDTO,
  type WmsEtiquetaIdentidadeDTO,
  type WmsEtiquetasDocPreviewDTO,
} from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader, type Tone } from '../components/ui'
import { num } from '../lib/utils'

const TIPOS = [
  { v: 'QR_CODE', l: 'QR Code' },
  { v: 'CODIGO_BARRAS', l: 'Código de barras' },
  { v: 'PADRAO', l: 'Padrão' },
]
const TIPO_TONE: Record<string, Tone> = { QR_CODE: 'primary', CODIGO_BARRAS: 'info', PADRAO: 'neutral' }

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function Etiquetar() {
  const conectado = isConnected()
  const [owners, setOwners] = useState<WmsOwnerLiteDTO[]>([])
  const [skus, setSkus] = useState<WmsSkuLiteDTO[]>([])
  const [lotes, setLotes] = useState<WmsEtiquetaLoteDTO[]>([])
  const [ownerId, setOwnerId] = useState('')
  const [skuCode, setSkuCode] = useState('')
  const [qtd, setQtd] = useState('')
  const [tipo, setTipo] = useState('QR_CODE')
  const [preview, setPreview] = useState<WmsEtiquetaPreviewDTO | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [identidades, setIdentidades] = useState<WmsEtiquetaIdentidadeDTO[]>([])
  const [loading, setLoading] = useState(conectado)

  const refetch = async () => setLotes(await wmsApi.etiquetas())
  useEffect(() => {
    if (!conectado) return
    let vivo = true
    ;(async () => {
      try {
        const [ow, sk, lt] = await Promise.all([wmsApi.owners(), wmsApi.skus(), wmsApi.etiquetas()])
        if (!vivo) return
        setOwners(ow)
        setSkus(sk)
        setLotes(lt)
      } catch {
        /* vazio */
      } finally {
        if (vivo) setLoading(false)
      }
    })()
    return () => { vivo = false }
  }, [conectado])

  const skusOwner = useMemo(() => skus.filter((s) => !ownerId || s.ownerId === ownerId), [skus, ownerId])
  const qtdN = Number(qtd) || 0

  // Prévia (backend): calcula nº de etiquetas por caixa-mestre e sinaliza SKU novo.
  useEffect(() => {
    if (!conectado || !ownerId || !skuCode || qtdN <= 0) { setPreview(null); return }
    let vivo = true
    ;(async () => {
      try {
        const p = await wmsApi.etiquetaPreview(ownerId, skuCode, qtdN)
        if (vivo) setPreview(p)
      } catch {
        if (vivo) setPreview(null)
      }
    })()
    return () => { vivo = false }
  }, [conectado, ownerId, skuCode, qtdN])

  const emitir = async () => {
    setMsg(null)
    try {
      const lote = await wmsApi.emitEtiqueta({ ownerId, skuCode, quantidadeUnidades: qtdN, tipo })
      await refetch()
      setMsg(`Lote emitido: ${lote.nEtiquetas} etiqueta(s) identitária(s) para ${lote.skuCode}.`)
      try { setIdentidades(await wmsApi.loteIdentidades(lote.id)) } catch { setIdentidades([]) }
      setQtd('')
      setPreview(null)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Falha ao emitir.')
    }
  }

  const podeEmitir = !!ownerId && !!skuCode && qtdN > 0 && !!preview && !preview.bloqueado

  return (
    <div className="space-y-6">
      <PageHeader title="Etiquetagem (caixa-mestre)" subtitle="1 etiqueta por caixa mestre + 1 por unidade solta — corrige a contagem por volume">
        {conectado ? <Badge tone="ok">{num(lotes.length)} lotes · WMS</Badge> : <Badge tone="warn">modo demo — conecte ao WMS</Badge>}
      </PageHeader>

      {conectado && <EtiquetarDaNota onEmitted={refetch} />}

      {conectado && (
        <div className="card p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-ink-muted">Cliente</label>
              <select value={ownerId} onChange={(e) => { setOwnerId(e.target.value); setSkuCode('') }} className="mt-1 w-full rounded-xl border border-line bg-surface-sub px-3 py-2 text-sm outline-none">
                <option value="">— selecione —</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-muted">SKU</label>
              <input list="skus-list" value={skuCode} onChange={(e) => setSkuCode(e.target.value)} placeholder="código do SKU" className="mt-1 w-full rounded-xl border border-line bg-surface-sub px-3 py-2 text-sm outline-none mono" />
              <datalist id="skus-list">
                {skusOwner.map((s) => <option key={s.id} value={s.code}>{s.description}</option>)}
              </datalist>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-muted">Qtd. recebida (unidades)</label>
              <input type="number" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="62" className="mt-1 w-full rounded-xl border border-line bg-surface-sub px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-muted">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-surface-sub px-3 py-2 text-sm outline-none">
                {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
          </div>

          {/* prévia do cálculo */}
          {preview && (
            preview.bloqueado ? (
              <div className="rounded-xl border border-bad/30 bg-bad-50 p-3 text-sm text-bad flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {preview.motivo}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded-xl border border-primary-100 bg-primary-50 p-3 text-sm text-primary flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span><b>{num(preview.caixas ?? 0)}</b> caixas mestre (× {preview.unitsPerBox})</span>
                  <span>+ <b>{num(preview.unidadesSoltas ?? 0)}</b> unidades soltas</span>
                  <span>= <b className="text-base">{num(preview.nEtiquetas ?? 0)}</b> etiquetas</span>
                  <span className="text-ink-muted">({num(preview.quantidadeUnidades ?? 0)} un no total)</span>
                </div>
                {preview.cubagem && (
                  <div className="rounded-xl border border-line bg-surface-sub p-3 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
                    {preview.cubagem.cubagemCalculadaM3 != null ? (
                      <span>
                        Cubagem calculada:{' '}
                        <b className="text-ink">{preview.cubagem.cubagemCalculadaM3.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} m³</b>{' '}
                        <span className="text-ink-muted">
                          ({num(preview.cubagem.caixasParaCubagem)} caixas × {preview.cubagem.volumeCaixaM3 ?? 0} m³
                          {preview.cubagem.volumeCaixaDerivado ? ', vol. derivado das dimensões' : ''})
                        </span>
                      </span>
                    ) : (
                      <span className="text-warn">Informe o volume (ou as dimensões) da caixa mestre no cadastro do SKU para calcular a cubagem.</span>
                    )}
                    <span className="text-ink-muted">· cubagem da nota: — (chega com a ingestão de documentos)</span>
                  </div>
                )}
              </div>
            )
          )}

          <div className="flex items-center justify-between">
            {msg && <p className="text-xs text-ink-soft">{msg}</p>}
            <button className="btn-primary ml-auto" disabled={!podeEmitir} onClick={emitir}>
              <Printer className="h-4 w-4" /> Emitir lote de etiquetas
            </button>
          </div>

          {identidades.length > 0 && (
            <div className="rounded-xl border border-line bg-surface-sub p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted mb-1.5">
                Identidades geradas ({num(identidades.length)}) — 1 código único por volume · use na Montagem de Pallets
              </p>
              <div className="flex flex-wrap gap-1.5">
                {identidades.map((v) => (
                  <span key={v.id} className="mono text-[11px] rounded-md border border-line bg-surface px-1.5 py-0.5 text-ink-soft">
                    {v.codigo}<span className="text-ink-muted"> · {v.tipoVolume === 'CAIXA' ? 'cx' : 'un'}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">SKU</th>
                <th className="th text-right">Qtd un</th>
                <th className="th text-right">Caixas + soltas</th>
                <th className="th text-right">Etiquetas</th>
                <th className="th">Tipo</th>
                <th className="th">Quando</th>
              </tr>
            </thead>
            <tbody>
              {lotes.map((l) => (
                <tr key={l.id} className="row-hover">
                  <td className="td">
                    <div className="mono font-medium text-brand">{l.skuCode}</div>
                    <div className="text-xs text-ink-muted">{l.skuDescription}</div>
                  </td>
                  <td className="td text-right mono text-xs">{num(l.quantidadeUnidades)}</td>
                  <td className="td text-right mono text-xs">{num(l.caixas)} + {num(l.unidadesSoltas)}</td>
                  <td className="td text-right mono font-medium text-brand">{num(l.nEtiquetas)}</td>
                  <td className="td"><Badge tone={TIPO_TONE[l.tipo] ?? 'neutral'}>{l.tipo}</Badge></td>
                  <td className="td text-xs text-ink-muted mono">{fmtDateTime(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lotes.length === 0 && (
          <EmptyState
            icon={<Tags className="h-6 w-6" />}
            title={conectado ? (loading ? 'Carregando…' : 'Nenhum lote emitido') : 'Sem conexão com o WMS'}
            text={conectado ? 'Emita um lote acima: o sistema calcula o nº correto de etiquetas pela caixa-mestre do SKU.' : 'Entre com credenciais reais do Hub para etiquetar.'}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Etiquetar "da nota" (decisão 21/32): informa o documento importado e o sistema
 * calcula as etiquetas por SKU com QUANTIDADE AUTOMÁTICA (sem digitar), emitindo
 * todos os SKUs de uma vez. SKU pendente/não cadastrado fica bloqueado.
 */
function EtiquetarDaNota({ onEmitted }: { onEmitted: () => void }) {
  const [docId, setDocId] = useState('')
  const [prev, setPrev] = useState<WmsEtiquetasDocPreviewDTO | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const carregar = async () => {
    setMsg(null); setPrev(null)
    if (!docId.trim()) return
    try { setPrev(await wmsApi.etiquetasPreviewDoc(docId.trim())) }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Documento não encontrado.') }
  }
  const emitir = async () => {
    if (!docId.trim()) return
    setBusy(true); setMsg(null)
    try {
      const r = await wmsApi.emitEtiquetasDoc(docId.trim(), {})
      setMsg(`${r.lotes} lote(s) emitido(s)${r.ignoradosBloqueados ? ` · ${r.ignoradosBloqueados} SKU(s) bloqueado(s) ignorado(s)` : ''}.`)
      await carregar(); onEmitted()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Falha ao emitir.') }
    finally { setBusy(false) }
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <label className="text-xs font-medium text-ink-muted">Etiquetar da nota — quantidade automática (fiscalDocumentId)</label>
          <input value={docId} onChange={(e) => setDocId(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') carregar() }} placeholder="id do documento importado" className="mt-1 w-full rounded-xl border border-line bg-surface-sub px-3 py-2 text-sm outline-none mono" />
        </div>
        <button className="btn-outline self-end" onClick={carregar} disabled={!docId.trim()}>Carregar</button>
      </div>
      {msg && <div className="text-sm text-ink-soft">{msg}</div>}
      {prev && (
        <>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead><tr>
                <th className="th">SKU</th><th className="th text-right">Qtd (un)</th><th className="th text-right">Etiquetas</th><th className="th">Status</th>
              </tr></thead>
              <tbody>
                {prev.linhas.map((l) => (
                  <tr key={l.skuCode} className="row-hover">
                    <td className="td mono text-xs text-brand">{l.skuCode}<span className="block text-ink-muted">{l.descricao}</span></td>
                    <td className="td text-right mono">{num(l.quantidadeUnidades)}</td>
                    <td className="td text-right mono font-medium">{l.bloqueado ? '—' : num(l.nEtiquetas)}</td>
                    <td className="td">{l.bloqueado ? <Badge tone="warn">{l.motivo}</Badge> : <Badge tone="ok" dot>ok</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-soft">Total: <b className="text-ink">{num(prev.totalEtiquetas)}</b> etiqueta(s){prev.temBloqueio ? ' · há SKU bloqueado (resolva na conferência)' : ''}</span>
            <button className="btn-primary" disabled={busy || prev.totalEtiquetas === 0} onClick={emitir}>
              <Printer className="h-4 w-4" /> Emitir todas da nota
            </button>
          </div>
        </>
      )}
    </div>
  )
}
