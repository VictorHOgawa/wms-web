import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Timer, AlertTriangle, PackageSearch, Warehouse } from 'lucide-react'
import { isConnected, wmsApi, type WmsCargaPisoDTO } from '../lib/wmsApi'
import { useStore } from '../store/useStore'
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
  const toast = useStore((s) => s.toast)
  // "Free time padrão" aqui é um SIMULADOR de corte da listagem (não salva
  // configuração): digita → Aplicar → a lista recalcula quem estourou com esse
  // padrão. O padrão real continua 24h, vencido pelo contrato do cliente.
  const [horas, setHoras] = useState(24)
  const [horasDraft, setHorasDraft] = useState('24')
  const [cargas, setCargas] = useState<WmsCargaPisoDTO[]>([])
  const [loading, setLoading] = useState(conectado)
  const [transferindo, setTransferindo] = useState<string | null>(null)

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
    try {
      const r = await wmsApi.transferirArmazenagem(c.floorStockId)
      toast({
        tipo: 'sucesso',
        titulo: `Transferida para armazenagem (staging ${r.enderecoStaging})`,
        texto: `${r.ordens.map((o) => `${o.code} · ${o.skuCode} × ${o.quantity}`).join(' | ')} — tarefa de guardar no coletor.`,
      })
      recarregar()
    } catch (e) {
      toast({ tipo: 'erro', titulo: 'Falha ao transferir', texto: e instanceof Error ? e.message : undefined })
    } finally {
      setTransferindo(null)
    }
  }

  /** A9: transfere UM PALLET da carga (parcial — o resto segue no piso). */
  const transferirPallet = async (c: WmsCargaPisoDTO, palletCodigo: string) => {
    setTransferindo(`${c.floorStockId}:${palletCodigo}`)
    try {
      const r = await wmsApi.transferirArmazenagem(c.floorStockId, { palletCodigo })
      toast({
        tipo: 'sucesso',
        titulo: `Pallet ${palletCodigo} guardado (staging ${r.enderecoStaging})`,
        texto:
          r.status === 'GUARDADA'
            ? 'Era o último pallet — a carga inteira saiu do piso.'
            : `${r.palletsRestantes ?? '?'} pallet(s) da carga ainda no piso.`,
      })
      recarregar()
    } catch (e) {
      toast({ tipo: 'erro', titulo: 'Falha ao guardar o pallet', texto: e instanceof Error ? e.message : undefined })
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
    toast({
      tipo: falhas.length === 0 ? 'sucesso' : 'aviso',
      titulo: `${feitas} de ${alvo.length} transferida(s) — tarefas de guardar no coletor`,
      texto: falhas.length ? `Falharam: ${falhas.join(' | ')}` : undefined,
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
        <span className="text-ink-soft">Simular free time padrão</span>
        <input
          type="number"
          value={horasDraft}
          min={1}
          onChange={(e) => setHorasDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setHoras(Math.max(1, Number(horasDraft) || 24))
          }}
          className="w-20 rounded-lg border border-line bg-surface-sub px-2 py-1.5 text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => setHoras(Math.max(1, Number(horasDraft) || 24))}
          disabled={Math.max(1, Number(horasDraft) || 24) === horas}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-primary/40 hover:text-primary disabled:opacity-40"
        >
          Aplicar
        </button>
        <span className="text-ink-muted">
          simulação da listagem (padrão real: 24 h; o contrato do cliente vence o padrão)
        </span>
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
                  <React.Fragment key={c.floorStockId}>
                  <tr className="row-hover">
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
                  {/* A9: pallets da carga — guarda parcial por pallet */}
                  {(c.pallets?.length ?? 0) > 0 && (
                    <tr>
                      <td colSpan={6} className="td bg-surface-sub/50">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-ink-muted">Pallets:</span>
                          {c.pallets!.map((p) => (
                            <span
                              key={p.codigo}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${
                                p.guardado
                                  ? 'border-emerald-300 text-emerald-700'
                                  : p.estourou
                                    ? 'border-red-300 text-red-700'
                                    : 'border-line text-ink-soft'
                              }`}
                              title="Relógio próprio do pallet (chegada bipada no recebimento; sem bipagem, herda a da carga)"
                            >
                              <span className="mono">{p.codigo}</span> · {p.volumes} vol · {p.horasNoPiso}h
                              {p.guardado ? (
                                <span>· guardado ✓</span>
                              ) : p.estourou && c.status === 'AGUARDANDO' ? (
                                <button
                                  onClick={() => transferirPallet(c, p.codigo)}
                                  disabled={transferindo !== null}
                                  className="ml-1 rounded border border-red-300 px-1.5 py-0.5 hover:border-red-500 disabled:opacity-50"
                                >
                                  {transferindo === `${c.floorStockId}:${p.codigo}` ? 'guardando…' : 'guardar pallet'}
                                </button>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
