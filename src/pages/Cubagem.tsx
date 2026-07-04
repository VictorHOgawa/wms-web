import { useEffect, useState } from 'react'
import { Scale, AlertTriangle, Search, BellRing } from 'lucide-react'
import { isConnected, wmsApi, type WmsCubagemGatilhoDTO, type WmsCubagemDTO } from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader } from '../components/ui'

const m3 = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) + ' m³'
function fmt(iso: string): string {
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}

/**
 * Duas cubagens (decisão 24): compara a cubagem da NOTA (declarada pelo cliente)
 * com a CALCULADA (real, por caixa mestre). Quando a calculada supera a nota, o
 * WMS aciona o gatilho de custo extra que o comercial/TMS cobra. O WMS só
 * fornece a cubagem e o gatilho — a cobrança (CTE complementar) vive no TMS.
 */
export default function Cubagem() {
  const conectado = isConnected()
  const [gatilhos, setGatilhos] = useState<WmsCubagemGatilhoDTO[]>([])
  const [docId, setDocId] = useState('')
  const [calc, setCalc] = useState<WmsCubagemDTO | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(conectado)

  const carregar = async () => {
    try { setGatilhos(await wmsApi.cubagemGatilhos()) } catch { /* mantém */ } finally { setLoading(false) }
  }
  useEffect(() => { if (conectado) carregar() /* eslint-disable-next-line */ }, [conectado])

  const comparar = async () => {
    setMsg(null); setCalc(null)
    if (!docId.trim()) return
    try { setCalc(await wmsApi.cubagem(docId.trim())) }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Documento não encontrado.') }
  }
  const registrar = async () => {
    if (!docId.trim()) return
    try { await wmsApi.registrarGatilhoCubagem(docId.trim()); await carregar() }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Falha ao registrar.') }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Cubagem & custo extra" subtitle="Nota (declarada) × calculada (caixa mestre) — divergência aciona o gatilho de cobrança adicional">
        {conectado ? <Badge tone="ok">{gatilhos.length} gatilho(s)</Badge> : <Badge tone="warn">modo demo — conecte ao WMS</Badge>}
      </PageHeader>

      {conectado && (
        <div className="card p-4 space-y-3">
          <label className="text-xs font-medium text-ink-muted">Comparar cubagem de um documento (fiscalDocumentId)</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-sub px-3 py-2 flex-1">
              <Search className="h-4 w-4 text-ink-muted" />
              <input value={docId} onChange={(e) => setDocId(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') comparar() }} placeholder="id do documento importado" className="bg-transparent outline-none flex-1 text-sm mono" />
            </div>
            <button className="btn-outline" onClick={comparar} disabled={!docId.trim()}>Comparar</button>
          </div>
          {msg && <div className="text-sm text-bad">{msg}</div>}
          {calc && (
            <div className="rounded-xl border border-line bg-surface-sub p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                <span>Nota: <b className="text-ink">{calc.notaInformada ? m3(calc.notaM3) : '—'}</b></span>
                <span>Calculada: <b className="text-ink">{m3(calc.calculadaM3)}</b></span>
                <span>Divergência: <b className={calc.divergenciaM3 > 0 ? 'text-warn' : 'text-ink'}>{m3(calc.divergenciaM3)} ({calc.divergenciaPct > 0 ? '+' : ''}{calc.divergenciaPct}%)</b></span>
              </div>
              {calc.itensSemSku > 0 && (
                <div className="text-xs text-warn flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {calc.itensSemSku} item(ns) sem SKU parametrizado — cubagem calculada parcial.</div>
              )}
              {calc.gatilhoCustoExtra ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-warn font-medium">Divergência relevante — cabe custo extra.</span>
                  <button className="btn-primary text-sm" onClick={registrar}><BellRing className="h-4 w-4" /> Registrar gatilho</button>
                </div>
              ) : (
                <div className="text-sm text-ink-soft">{calc.notaInformada ? 'Sem divergência relevante.' : 'Nota sem cubagem declarada — informe a NF-e completa para comparar.'}</div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-muted">Gatilhos de custo extra (worklist do comercial)</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Documento</th>
                <th className="th text-right">Nota</th>
                <th className="th text-right">Calculada</th>
                <th className="th text-right">Divergência</th>
                <th className="th">Quando</th>
              </tr>
            </thead>
            <tbody>
              {gatilhos.map((g) => (
                <tr key={g.id} className="row-hover">
                  <td className="td mono text-xs text-brand">{g.fiscalDocumentId.slice(0, 8)}…</td>
                  <td className="td text-right mono text-xs">{m3(g.notaM3)}</td>
                  <td className="td text-right mono text-xs">{m3(g.calculadaM3)}</td>
                  <td className="td text-right mono text-xs text-warn">{m3(g.divergenciaM3)} (+{g.divergenciaPct}%)</td>
                  <td className="td text-xs text-ink-muted mono">{fmt(g.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {gatilhos.length === 0 && (
          <EmptyState icon={<Scale className="h-6 w-6" />} title={conectado ? (loading ? 'Carregando…' : 'Nenhum gatilho') : 'Sem conexão'} text="Compare a cubagem de um documento acima; se a calculada superar a nota, registre o gatilho." />
        )}
      </div>
    </div>
  )
}
