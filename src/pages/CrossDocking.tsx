import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapPin, PackageCheck, RefreshCw, Timer, Warehouse } from 'lucide-react'
import { isConnected, wmsApi, type WmsCargaPisoDTO } from '../lib/wmsApi'
import { useStore } from '../store/useStore'
import { Badge, EmptyState, PageHeader } from '../components/ui'
import { num } from '../lib/utils'

/**
 * CROSS DOCKING — painel de TRIAGEM DO PISO por destino (REAL; substituiu o
 * demo em 09/07). Agrupa as cargas em piso pelo município-fim do CT-e, mostra
 * os pallets montados de cada carga (com o relógio próprio de free time) e
 * permite guardar por pallet direto daqui. A MONTAGEM do pallet é feita no
 * coletor (card "Montar pallet": bipa o pallet → bipa os volumes → fecha com
 * destino).
 */
export default function CrossDocking() {
  const conectado = isConnected()
  const toast = useStore((s) => s.toast)
  const [cargas, setCargas] = useState<WmsCargaPisoDTO[]>([])
  const [loading, setLoading] = useState(conectado)
  const [busy, setBusy] = useState<string | null>(null)

  const carregar = useCallback(() => {
    if (!conectado) return
    setLoading(true)
    wmsApi
      .cargasEmPiso()
      .then(setCargas)
      .catch(() => {
        /* mantém */
      })
      .finally(() => setLoading(false))
  }, [conectado])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Agrupa por destino (município-fim do CT-e). Sem destino → "A definir".
  const grupos = useMemo(() => {
    const m = new Map<string, WmsCargaPisoDTO[]>()
    for (const c of cargas) {
      const k = c.destino ?? 'Destino a definir'
      m.set(k, [...(m.get(k) ?? []), c])
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [cargas])

  const totalPallets = useMemo(
    () => cargas.reduce((s, c) => s + (c.pallets?.length ?? 0), 0),
    [cargas],
  )

  const guardarPallet = async (c: WmsCargaPisoDTO, palletCodigo: string) => {
    setBusy(`${c.floorStockId}:${palletCodigo}`)
    try {
      const r = await wmsApi.transferirArmazenagem(c.floorStockId, { palletCodigo })
      toast({
        tipo: 'sucesso',
        titulo: `Pallet ${palletCodigo} guardado (staging ${r.enderecoStaging})`,
        texto: r.status === 'GUARDADA' ? 'Era o último — a carga saiu do piso.' : undefined,
      })
      carregar()
    } catch (e) {
      toast({ tipo: 'erro', titulo: 'Falha ao guardar o pallet', texto: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(null)
    }
  }

  if (!conectado) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cross Docking — triagem por destino" subtitle="Conecte ao WMS para ver o piso real agrupado por destino">
          <Badge tone="warn">modo demo — conecte ao WMS</Badge>
        </PageHeader>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cross Docking — triagem por destino"
        subtitle="Cargas no piso agrupadas pelo destino do CT-e; pallets montados no coletor aparecem em cada carga (montagem: app → Montar pallet)"
      >
        <div className="flex items-center gap-2">
          <Badge tone={cargas.length ? 'warn' : 'ok'}>{num(cargas.length)} carga(s) no piso</Badge>
          <Badge tone="neutral">{num(totalPallets)} pallet(s)</Badge>
          <button type="button" onClick={carregar} className="btn-ghost" title="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </PageHeader>

      {grupos.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<PackageCheck className="h-6 w-6" />}
            title={loading ? 'Carregando…' : 'Piso vazio'}
            text="Cargas recebidas em piso aparecem aqui, agrupadas pelo destino."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
          {grupos.map(([destino, lista]) => (
            <div key={destino} className="card overflow-hidden">
              <div className="border-b border-line px-4 py-2.5 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand" />
                <span className="font-semibold text-sm">{destino}</span>
                <span className="ml-auto text-xs text-ink-muted">{lista.length} carga(s)</span>
              </div>
              <div className="divide-y divide-line">
                {lista.map((c) => (
                  <div key={c.floorStockId} className="px-4 py-3 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="mono text-brand text-xs">{c.docType} {c.docNumero ?? c.fiscalDocumentId.slice(0, 8)}</span>
                      <span className="text-xs text-ink-muted">{c.unidade ?? '—'}</span>
                      <span className="ml-auto inline-flex items-center gap-1 text-xs">
                        <Timer className="h-3 w-3 text-ink-muted" />
                        {c.estourou
                          ? <Badge tone="bad">estourou ({c.horasNoPiso}h)</Badge>
                          : <span className="text-ink-soft">{c.horasNoPiso}h / {c.freeTimeHoras}h</span>}
                      </span>
                    </div>
                    {(c.pallets?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {c.pallets!.map((p) => (
                          <span
                            key={p.codigo}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                              p.guardado
                                ? 'border-emerald-300 text-emerald-700'
                                : p.estourou
                                  ? 'border-red-300 text-red-700'
                                  : 'border-line text-ink-soft'
                            }`}
                          >
                            <span className="mono">{p.codigo}</span> · {p.volumes}v · {p.horasNoPiso}h
                            {p.guardado ? (
                              ' ✓'
                            ) : p.estourou && c.status === 'AGUARDANDO' ? (
                              <button
                                onClick={() => guardarPallet(c, p.codigo)}
                                disabled={busy !== null}
                                className="ml-1 inline-flex items-center gap-1 rounded border border-red-300 px-1.5 py-0.5 hover:border-red-500 disabled:opacity-50"
                              >
                                <Warehouse className="h-3 w-3" />
                                {busy === `${c.floorStockId}:${p.codigo}` ? '…' : 'guardar'}
                              </button>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-ink-muted">sem pallet montado — monte no coletor (Montar pallet)</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
