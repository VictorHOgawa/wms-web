import { useCallback, useEffect, useMemo, useState } from 'react'
import { Timer, AlertTriangle, PackageSearch, Warehouse } from 'lucide-react'
import { isConnected, wmsApi, type WmsCargaPisoDTO } from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader } from '../components/ui'
import { num } from '../lib/utils'

/**
 * Free time (H · decisões 12/25): cronômetro das cargas paradas no piso do
 * cross-dock + a AÇÃO da decisão 12 — estourou, o administrativo transfere a
 * carga para a armazenagem (cria staging + O.S de guarda que cai no coletor).
 * Cobrança fica para depois (unidade por contrato do cliente).
 */
export default function FreeTime() {
  const conectado = isConnected()
  const [horas, setHoras] = useState(24)
  const [cargas, setCargas] = useState<WmsCargaPisoDTO[]>([])
  const [loading, setLoading] = useState(conectado)
  const [transferindo, setTransferindo] = useState<string | null>(null)
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'bad'; texto: string } | null>(null)

  const recarregar = useCallback(() => {
    if (!conectado) return
    setLoading(true)
    wmsApi.cargasEmPiso(horas)
      .then(setCargas)
      .catch(() => { /* mantém */ })
      .finally(() => setLoading(false))
  }, [conectado, horas])

  useEffect(() => { recarregar() }, [recarregar])

  const estouradas = useMemo(() => cargas.filter((c) => c.estourou), [cargas])
  const transferiveis = useMemo(
    () => estouradas.filter((c) => c.status === 'AGUARDANDO'),
    [estouradas],
  )

  const docLabel = (c: WmsCargaPisoDTO) =>
    `${c.docType} ${c.docNumero ?? c.fiscalDocumentId.slice(0, 8)}`

  const transferir = async (c: WmsCargaPisoDTO) => {
    const ok = window.confirm(
      `Transferir esta carga para a armazenagem?\n\n` +
      `${docLabel(c)} — ${c.horasNoPiso}h no piso.\n` +
      `Será criada a posição de staging e a(s) tarefa(s) de GUARDAR no coletor. ` +
      `A carga sai do piso do cross-dock.`,
    )
    if (!ok) return
    setTransferindo(c.floorStockId)
    setAviso(null)
    try {
      const r = await wmsApi.transferirArmazenagem(c.floorStockId)
      setAviso({
        tom: 'ok',
        texto: `Transferida para armazenagem (staging ${r.enderecoStaging}): ${r.ordens
          .map((o) => `${o.code} · ${o.skuCode} × ${o.quantity}`)
          .join(' | ')} — tarefas de guardar já disponíveis no coletor.`,
      })
      recarregar()
    } catch (e) {
      setAviso({ tom: 'bad', texto: e instanceof Error ? e.message : 'Falha ao transferir.' })
    } finally {
      setTransferindo(null)
    }
  }

  /** Transfere TODAS as estouradas elegíveis (uma a uma; resume o placar no fim). */
  const transferirTodas = async () => {
    const alvo = transferiveis
    if (alvo.length === 0) return
    const ok = window.confirm(
      `Transferir ${alvo.length} carga(s) estourada(s) para a armazenagem?\n\n` +
      alvo.slice(0, 8).map((c) => `• ${docLabel(c)} (${c.horasNoPiso}h)`).join('\n') +
      (alvo.length > 8 ? `\n… e mais ${alvo.length - 8}` : ''),
    )
    if (!ok) return
    setTransferindo('__lote__')
    setAviso(null)
    let feitas = 0
    const falhas: string[] = []
    for (const c of alvo) {
      try {
        await wmsApi.transferirArmazenagem(c.floorStockId)
        feitas++
      } catch (e) {
        falhas.push(`${docLabel(c)}: ${e instanceof Error ? e.message : 'falha'}`)
      }
    }
    setAviso({
      tom: falhas.length === 0 ? 'ok' : 'bad',
      texto:
        `${feitas} de ${alvo.length} transferida(s) — tarefas de guardar no coletor.` +
        (falhas.length ? ` Falharam: ${falhas.join(' | ')}` : ''),
    })
    setTransferindo(null)
    recarregar()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Free time (cross-dock)" subtitle="Cronômetro das cargas paradas no piso; estourou o free time → transferir para armazenagem (decisão 12)">
        {conectado ? (
          estouradas.length > 0
            ? <Badge tone="bad">{num(estouradas.length)} estouradas</Badge>
            : <Badge tone="ok">{num(cargas.length)} no piso</Badge>
        ) : <Badge tone="warn">modo demo — conecte ao WMS</Badge>}
      </PageHeader>

      <div className="card p-3 flex flex-wrap items-center gap-3 text-sm">
        <Timer className="h-4 w-4 text-ink-muted" />
        <span className="text-ink-soft">Free time padrão</span>
        <input
          type="number"
          value={horas}
          min={1}
          onChange={(e) => setHoras(Math.max(1, Number(e.target.value) || 24))}
          className="w-20 rounded-lg border border-line bg-surface-sub px-2 py-1.5 text-sm outline-none"
        />
        <span className="text-ink-muted">horas — o contrato do cliente (quando definido na carga) vence este padrão</span>
        {transferiveis.length > 0 && (
          <button
            onClick={transferirTodas}
            disabled={transferindo !== null}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:border-red-400 disabled:opacity-50"
          >
            <Warehouse className="h-3.5 w-3.5" />
            {transferindo === '__lote__'
              ? 'Transferindo lote…'
              : `Transferir todas as estouradas (${transferiveis.length})`}
          </button>
        )}
      </div>

      {aviso ? (
        <div className={`card p-3 text-sm ${aviso.tom === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{aviso.texto}</div>
      ) : null}

      <div className="card overflow-hidden">
        {cargas.length === 0 ? (
          <EmptyState icon={<PackageSearch className="h-6 w-6" />} title={loading ? 'Carregando…' : 'Nenhuma carga no piso'} text="Cargas recebidas em piso (cross-dock) aparecem aqui com o cronômetro." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>
                <th className="th">Documento</th><th className="th">Unidade</th><th className="th text-right">Volumes</th>
                <th className="th text-right">No piso</th><th className="th">Free time</th><th className="th">Ação</th>
              </tr></thead>
              <tbody>
                {cargas.map((c) => (
                  <tr key={c.floorStockId} className="row-hover">
                    <td className="td mono text-xs text-brand">{docLabel(c)}</td>
                    <td className="td text-ink-soft">{c.unidade ?? '—'}</td>
                    <td className="td text-right mono">{num(c.volumes)}</td>
                    <td className="td text-right mono font-medium">{c.horasNoPiso}h</td>
                    <td className="td">
                      {c.estourou
                        ? <Badge tone="bad"><AlertTriangle className="h-3 w-3" /> estourou (+{Math.round((c.horasNoPiso - c.freeTimeHoras) * 10) / 10}h)</Badge>
                        : <Badge tone="ok" dot>restam {c.horasRestantes}h</Badge>}
                    </td>
                    <td className="td">
                      {c.estourou && c.status === 'AGUARDANDO' ? (
                        <button
                          onClick={() => transferir(c)}
                          disabled={transferindo === c.floorStockId}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-sub px-2.5 py-1.5 text-xs font-medium hover:border-brand disabled:opacity-50"
                        >
                          <Warehouse className="h-3.5 w-3.5" />
                          {transferindo === c.floorStockId ? 'Transferindo…' : 'Transferir p/ armazenagem'}
                        </button>
                      ) : c.status === 'ALOCADA' ? (
                        <span className="text-xs text-ink-muted">alocada em viagem</span>
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
