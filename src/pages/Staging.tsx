import { useEffect, useMemo, useState } from 'react'
import { PackagePlus, ArrowRight, MapPin } from 'lucide-react'
import {
  isConnected,
  wmsApi,
  type WmsOwnerLiteDTO,
  type WmsSkuLiteDTO,
  type WmsAddressLiteDTO,
  type WmsStockPositionDTO,
} from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader } from '../components/ui'
import { num } from '../lib/utils'

export default function Staging() {
  const conectado = isConnected()
  const [owners, setOwners] = useState<WmsOwnerLiteDTO[]>([])
  const [skus, setSkus] = useState<WmsSkuLiteDTO[]>([])
  const [addresses, setAddresses] = useState<WmsAddressLiteDTO[]>([])
  const [positions, setPositions] = useState<WmsStockPositionDTO[]>([])
  const [ownerId, setOwnerId] = useState('')
  const [skuCode, setSkuCode] = useState('')
  const [qtd, setQtd] = useState('')
  const [stagingAddr, setStagingAddr] = useState('')
  const [destino, setDestino] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(conectado)

  const refetch = async () => setPositions(await wmsApi.stockPositions())
  useEffect(() => {
    if (!conectado) return
    let vivo = true
    ;(async () => {
      try {
        const [ow, sk, ad, ps] = await Promise.all([wmsApi.owners(), wmsApi.skus(), wmsApi.addresses(), wmsApi.stockPositions()])
        if (!vivo) return
        setOwners(ow)
        setSkus(sk)
        setAddresses(ad)
        setPositions(ps)
      } catch {
        /* vazio */
      } finally {
        if (vivo) setLoading(false)
      }
    })()
    return () => { vivo = false }
  }, [conectado])

  const stagingAddrs = useMemo(() => addresses.filter((a) => a.type === 'RECEBIMENTO' && !a.blocked), [addresses])
  const destAddrs = useMemo(() => addresses.filter((a) => (a.type === 'PICKING' || a.type === 'PULMAO') && !a.blocked), [addresses])
  const emStaging = useMemo(() => positions.filter((p) => p.addressType === 'RECEBIMENTO'), [positions])
  const skusOwner = useMemo(() => skus.filter((s) => !ownerId || s.ownerId === ownerId), [skus, ownerId])
  const qtdN = Number(qtd) || 0
  const podeEntrar = !!ownerId && !!skuCode && qtdN > 0

  const entrar = async () => {
    setMsg(null)
    try {
      await wmsApi.entradaStaging({ ownerId, skuCode, quantidade: qtdN, addressCode: stagingAddr || undefined })
      await refetch()
      setMsg(`Entrada registrada: ${qtdN} un de ${skuCode} no staging.`)
      setQtd('')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Falha na entrada.')
    }
  }

  const guardar = async (posId: string) => {
    const destAddressCode = destino[posId]
    if (!destAddressCode) return
    setMsg(null)
    try {
      await wmsApi.guardarPosicao({ fromPositionId: posId, destAddressCode })
      await refetch()
      setMsg(`Guardado em ${destAddressCode}.`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Falha ao guardar.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Entrada & Staging" subtitle="Recebido → staging → guardar (putaway). Fecha o inbound com estoque real.">
        {conectado ? <Badge tone="ok">{num(emStaging.length)} em staging · WMS</Badge> : <Badge tone="warn">modo demo — conecte ao WMS</Badge>}
      </PageHeader>

      {conectado && (
        <div className="card p-4 space-y-3">
          <p className="text-sm font-semibold text-brand">Entrada de mercadoria (staging)</p>
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
              <input list="stg-skus" value={skuCode} onChange={(e) => setSkuCode(e.target.value)} placeholder="código do SKU" className="mt-1 w-full rounded-xl border border-line bg-surface-sub px-3 py-2 text-sm outline-none mono" />
              <datalist id="stg-skus">{skusOwner.map((s) => <option key={s.id} value={s.code}>{s.description}</option>)}</datalist>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-muted">Qtd. recebida</label>
              <input type="number" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="0" className="mt-1 w-full rounded-xl border border-line bg-surface-sub px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-muted">Endereço staging</label>
              <select value={stagingAddr} onChange={(e) => setStagingAddr(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-surface-sub px-3 py-2 text-sm outline-none">
                <option value="">auto (1º de recebimento)</option>
                {stagingAddrs.map((a) => <option key={a.id} value={a.code}>{a.code}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            {msg && <p className="text-xs text-ink-soft">{msg}</p>}
            <button className="btn-primary ml-auto" disabled={!podeEntrar} onClick={entrar}>
              <PackagePlus className="h-4 w-4" /> Registrar entrada
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-line bg-surface-sub">
          <p className="text-sm font-semibold text-brand">Em staging — pronto para guardar</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">SKU</th>
                <th className="th">Staging</th>
                <th className="th text-right">Qtde</th>
                <th className="th">Guardar em</th>
              </tr>
            </thead>
            <tbody>
              {emStaging.map((p) => (
                <tr key={p.id} className="row-hover">
                  <td className="td">
                    <div className="mono font-medium text-brand">{p.skuCode}</div>
                    <div className="text-xs text-ink-muted">{p.skuDescription}</div>
                  </td>
                  <td className="td">
                    <span className="inline-flex items-center gap-1.5 mono text-xs text-ink-soft">
                      <MapPin className="h-3.5 w-3.5 text-ink-muted" />{p.addressCode}
                    </span>
                  </td>
                  <td className="td text-right mono font-medium text-brand">{num(p.quantity)}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <select
                        value={destino[p.id] ?? ''}
                        onChange={(e) => setDestino((d) => ({ ...d, [p.id]: e.target.value }))}
                        className="rounded-lg border border-line bg-surface-sub px-2 py-1 text-xs outline-none"
                      >
                        <option value="">— endereço destino —</option>
                        {destAddrs.map((a) => <option key={a.id} value={a.code}>{a.code} ({a.type})</option>)}
                      </select>
                      <button className="btn-primary py-1 text-xs" disabled={!destino[p.id]} onClick={() => guardar(p.id)}>
                        <ArrowRight className="h-3.5 w-3.5" /> Guardar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {emStaging.length === 0 && (
          <EmptyState
            icon={<PackagePlus className="h-6 w-6" />}
            title={conectado ? (loading ? 'Carregando…' : 'Nada em staging') : 'Sem conexão com o WMS'}
            text={conectado ? 'Registre uma entrada acima; ela aparece aqui para ser guardada num endereço.' : 'Entre com credenciais reais do Hub.'}
          />
        )}
      </div>
    </div>
  )
}
