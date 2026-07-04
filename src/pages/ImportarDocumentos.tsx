import { useEffect, useRef, useState } from 'react'
import { FileUp, FileCheck2, AlertTriangle, Package } from 'lucide-react'
import {
  isConnected,
  wmsApi,
  type BusinessUnitLiteDTO,
  type WmsImportacaoXmlDTO,
} from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader } from '../components/ui'
import { num } from '../lib/utils'

/**
 * Importação AVULSA de documentos (decisões 21/39/40): quando a carga não vem
 * de uma viagem do TMS, o XML da NF-e sobe por aqui. O backend persiste o
 * documento completo (itens/SKU + cubagem da nota) e o FloorStock nasce no
 * upload, no CD escolhido — o XML não traz o destino físico.
 */
export default function ImportarDocumentos() {
  const conectado = isConnected()
  const [cds, setCds] = useState<BusinessUnitLiteDTO[]>([])
  const [businessUnitId, setBusinessUnitId] = useState('')
  const [arquivo, setArquivo] = useState<{ nome: string; xml: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [importados, setImportados] = useState<WmsImportacaoXmlDTO[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!conectado) return
    let vivo = true
    ;(async () => {
      try {
        const bus = await wmsApi.businessUnits()
        if (vivo) setCds(bus)
      } catch {
        /* sem CDs — o backend também aceita branchId */
      }
    })()
    return () => { vivo = false }
  }, [conectado])

  const escolherArquivo = (file: File | null) => {
    setErro(null)
    if (!file) { setArquivo(null); return }
    const reader = new FileReader()
    reader.onload = () => setArquivo({ nome: file.name, xml: String(reader.result ?? '') })
    reader.onerror = () => setErro('Não foi possível ler o arquivo.')
    reader.readAsText(file)
  }

  const importar = async () => {
    if (!arquivo || !businessUnitId) return
    setEnviando(true)
    setErro(null)
    try {
      const r = await wmsApi.importarXml({ xml: arquivo.xml, businessUnitId })
      setImportados((prev) => [r, ...prev])
      setArquivo(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao importar o XML.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar documentos"
        subtitle="Entrada avulsa (sem viagem): o XML da NF-e sobe aqui e a carga nasce no piso do CD escolhido"
      >
        {conectado
          ? <Badge tone="ok" dot>WMS conectado</Badge>
          : <Badge tone="warn">modo demo — conecte ao WMS</Badge>}
      </PageHeader>

      {conectado && (
        <div className="card p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-ink-muted">CD de destino *</label>
              <select
                value={businessUnitId}
                onChange={(e) => setBusinessUnitId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-surface-sub px-3 py-2 text-sm outline-none"
              >
                <option value="">— selecione o CD —</option>
                {cds.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.code?.trim() ? ` (${c.code.trim()})` : ''}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-ink-muted">O XML não traz o destino físico — é escolhido aqui.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-muted">XML da NF-e *</label>
              <input
                ref={fileRef}
                type="file"
                accept=".xml,text/xml"
                onChange={(e) => escolherArquivo(e.target.files?.[0] ?? null)}
                className="mt-1 w-full rounded-xl border border-line bg-surface-sub px-3 py-1.5 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary"
              />
              {arquivo && <p className="mt-1 text-[11px] text-ink-soft mono">{arquivo.nome}</p>}
            </div>
            <div className="flex items-end">
              <button className="btn-primary w-full" disabled={!arquivo || !businessUnitId || enviando} onClick={importar}>
                <FileUp className="h-4 w-4" /> {enviando ? 'Importando…' : 'Importar XML'}
              </button>
            </div>
          </div>

          {erro && (
            <div className="rounded-xl border border-bad/30 bg-bad-50 p-3 text-sm text-bad flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {erro}
            </div>
          )}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">NF-e</th>
                <th className="th">Emitente → Destinatário</th>
                <th className="th text-right">Itens (SKU)</th>
                <th className="th text-right">SKUs novos</th>
                <th className="th text-right">Volumes declarados</th>
                <th className="th">Piso</th>
              </tr>
            </thead>
            <tbody>
              {importados.map((d) => (
                <tr key={d.fiscalDocumentId} className="row-hover">
                  <td className="td">
                    <div className="mono font-medium text-brand">{d.numero ?? '—'}</div>
                    <div className="text-[11px] text-ink-muted mono">{d.chaveAcesso}</div>
                  </td>
                  <td className="td text-xs text-ink-soft">{d.emitente ?? '—'} → {d.destinatario ?? '—'}</td>
                  <td className="td text-right mono">{num(d.produtos)}</td>
                  <td className="td text-right">
                    {d.skusPreCadastrados > 0
                      ? <Badge tone="warn">{num(d.skusPreCadastrados)} pré-cadastrado(s)</Badge>
                      : <span className="mono text-xs text-ink-muted">0</span>}
                  </td>
                  <td className="td text-right mono">{num(d.volumesDeclarados)}</td>
                  <td className="td">
                    <Badge tone="ok" dot><span className="inline-flex items-center gap-1"><FileCheck2 className="h-3 w-3" /> no piso (AGUARDANDO)</span></Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {importados.length === 0 && (
          <EmptyState
            icon={<Package className="h-6 w-6" />}
            title={conectado ? 'Nenhum documento importado nesta sessão' : 'Sem conexão com o WMS'}
            text={conectado
              ? 'Escolha o CD, selecione o XML da NF-e e importe: o documento entra com itens (SKU) + cubagem da nota, e a carga nasce no piso.'
              : 'Entre com credenciais reais do Hub para importar documentos.'}
          />
        )}
      </div>
    </div>
  )
}
