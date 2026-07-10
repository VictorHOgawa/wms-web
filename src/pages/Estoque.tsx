import { useEffect, useMemo, useState } from 'react'
import { Search, Boxes, Filter } from 'lucide-react'
import { useStore } from '../store/useStore'
import { ownerColor, ownerName } from '../lib/mock'
import { isConnected, wmsApi, type WmsAddressLiteDTO, type WmsMovementDTO, type WmsStockPositionDTO } from '../lib/wmsApi'
import { Badge, EmptyState, Modal, PageHeader, type Tone } from '../components/ui'
import { cn, diasValidade, fmtDate, num } from '../lib/utils'
import type { PosicaoEstoque, StatusEstoque } from '../lib/types'

/** Posição + tipo do endereço (staging×picking×pulmão — achado da validação 08/07). */
type PosRow = PosicaoEstoque & { tipoEndereco?: string | null }

const STATUS_MAP: Record<string, StatusEstoque> = {
  DISPONIVEL: 'disponivel',
  QUARENTENA: 'quarentena',
  AVARIA: 'avaria',
  QUALIDADE: 'qualidade',
  RESERVADO: 'reservado',
}

/** Converte a posição do backend WMS para o shape que a tela já usa. */
function mapPos(p: WmsStockPositionDTO): PosRow {
  return {
    id: p.id,
    skuCodigo: p.skuCode,
    descricao: p.skuDescription,
    endereco: p.addressCode,
    curva: (p.curve as PosicaoEstoque['curva']) ?? 'C',
    lote: p.lote,
    validade: p.validade,
    ownerId: p.ownerId,
    quantidade: p.quantity,
    status: STATUS_MAP[p.status] ?? 'disponivel',
    tipoEndereco: p.addressType ?? null,
  }
}

const MOV_LABEL: Record<string, string> = {
  PUTAWAY: 'Guardado',
  REPLEN: 'Abastecido',
  COUNT_ADJUST_UP: 'Ajuste contagem (+)',
  COUNT_ADJUST_DOWN: 'Ajuste contagem (−)',
}

const statusMeta: Record<StatusEstoque, { l: string; tone: Tone }> = {
  disponivel: { l: 'Disponível', tone: 'ok' },
  quarentena: { l: 'Quarentena', tone: 'warn' },
  avaria: { l: 'Avaria', tone: 'bad' },
  qualidade: { l: 'Em qualidade', tone: 'info' },
  reservado: { l: 'Reservado', tone: 'primary' },
}

const FILTROS: { id: StatusEstoque | 'todos'; l: string }[] = [
  { id: 'todos', l: 'Todos' },
  { id: 'disponivel', l: 'Disponível' },
  { id: 'reservado', l: 'Reservado' },
  { id: 'quarentena', l: 'Quarentena' },
  { id: 'qualidade', l: 'Qualidade' },
  { id: 'avaria', l: 'Avaria' },
]

export default function Estoque() {
  const { ownerId, perfil, toast } = useStore()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<StatusEstoque | 'todos'>('todos')
  const [rows, setRows] = useState<PosRow[]>([])
  const [det, setDet] = useState<PosRow | null>(null)
  const [movs, setMovs] = useState<WmsMovementDTO[]>([])
  const [enderecos, setEnderecos] = useState<WmsAddressLiteDTO[]>([])
  const conectado = isConnected()

  // Posições/movimentos/endereços vivos do WMS (10/07: sem semente mock — a
  // tela nasce vazia e carrega o real; o login já exige conexão).
  useEffect(() => {
    if (!conectado) return
    let vivo = true
    ;(async () => {
      try {
        const [pos, mv, ends] = await Promise.all([
          wmsApi.stockPositions(),
          wmsApi.movements(200),
          wmsApi.addresses().catch(() => [] as WmsAddressLiteDTO[]),
        ])
        if (!vivo) return
        setRows(pos.map(mapPos))
        setMovs(mv)
        setEnderecos(ends)
      } catch {
        /* falhou: tela fica vazia (estado honesto) */
      }
    })()
    return () => {
      vivo = false
    }
  }, [conectado])

  // Ocupação dos endereços de armazenagem (vagas × capacidade) — 10/07.
  const ocupacao = useMemo(
    () => enderecos.filter((e) => e.type === 'PICKING' || e.type === 'PULMAO'),
    [enderecos],
  )

  const lista = useMemo(() => {
    return rows.filter((p) => {
      if (perfil === '3pl' && ownerId !== 'own-all' && p.ownerId !== ownerId) return false
      if (filtro !== 'todos' && p.status !== filtro) return false
      const q = busca.toLowerCase()
      return (
        !q ||
        p.skuCodigo.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q) ||
        p.endereco.toLowerCase().includes(q) ||
        (p.lote ?? '').toLowerCase().includes(q)
      )
    })
  }, [rows, busca, filtro, ownerId, perfil])

  const totalUn = lista.reduce((s, p) => s + p.quantidade, 0)

  const atualizarStatus = (status: StatusEstoque, titulo: string, texto: string) => {
    if (!det) return
    const next = { ...det, status }
    setRows((atual) => atual.map((p) => (p.id === det.id ? next : p)))
    setDet(null)
    toast({ tipo: status === 'avaria' || status === 'quarentena' ? 'aviso' : 'sucesso', titulo, texto })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Estoque"
        subtitle="Posições por endereço, lote e validade · controle FEFO, status e bloqueios"
      >
        <Badge tone="neutral">{num(lista.length)} posições · {num(totalUn)} un</Badge>
        {conectado && <Badge tone="ok">dados reais · WMS</Badge>}
      </PageHeader>

      {/* Ocupação dos endereços de armazenagem: vagas usadas × capacidade. */}
      {ocupacao.length > 0 && (
        <div className="card p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
            Ocupação dos endereços (vagas de palete)
          </p>
          <div className="flex flex-wrap gap-2">
            {ocupacao.map((e) => (
              <span
                key={e.id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs mono',
                  e.cheio
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : (e.vagasOcupadas ?? 0) > 0
                      ? 'border-line bg-surface-sub text-ink-soft'
                      : 'border-line text-ink-muted',
                )}
                title={`${e.type === 'PULMAO' ? 'Pulmão' : 'Picking'} · ${num(e.volumesOcupados ?? 0)} volumes`}
              >
                {e.code} {e.vagasOcupadas ?? 0}/{e.capacidadePaletes ?? '∞'}
                {e.cheio && ' · cheio'}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card p-3 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-sub px-3 py-2 flex-1">
          <Search className="h-4 w-4 text-ink-muted" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar SKU, descrição, endereço ou lote…"
            className="bg-transparent outline-none flex-1 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="h-4 w-4 text-ink-muted shrink-0" />
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={cn(
                'chip whitespace-nowrap transition-colors cursor-pointer',
                filtro === f.id ? 'bg-primary text-white' : 'bg-slate-100 text-ink-soft hover:bg-slate-200',
              )}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">SKU</th>
                <th className="th">Descrição</th>
                <th className="th">Endereço</th>
                <th className="th">Curva</th>
                <th className="th">Lote / Validade</th>
                {perfil === '3pl' && <th className="th">Owner</th>}
                <th className="th text-right">Qtde</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const dias = diasValidade(p.validade)
                return (
                  <tr key={p.id} className="row-hover cursor-pointer" onClick={() => setDet(p)}>
                    <td className="td mono font-medium text-brand">{p.skuCodigo}</td>
                    <td className="td text-ink">{p.descricao}</td>
                    <td className="td mono">
                      {p.endereco}
                      {p.tipoEndereco ? (
                        <span
                          className={cn(
                            'chip ml-1.5 text-[10px]',
                            p.tipoEndereco === 'RECEBIMENTO'
                              ? 'bg-amber-50 text-amber-700'
                              : p.tipoEndereco === 'PICKING'
                                ? 'bg-primary-50 text-primary'
                                : 'bg-slate-100 text-ink-soft',
                          )}
                          title={p.tipoEndereco === 'RECEBIMENTO' ? 'Staging (endereço de recebimento) — aguardando guarda' : undefined}
                        >
                          {p.tipoEndereco === 'RECEBIMENTO' ? 'staging' : p.tipoEndereco.toLowerCase()}
                        </span>
                      ) : null}
                    </td>
                    <td className="td">
                      <span className={cn('chip', p.curva === 'A' ? 'bg-primary-50 text-primary' : p.curva === 'B' ? 'bg-info-50 text-info' : 'bg-slate-100 text-ink-soft')}>
                        Curva {p.curva}
                      </span>
                    </td>
                    <td className="td">
                      {p.lote ? (
                        <div>
                          <span className="mono text-xs">{p.lote}</span>
                          <div className={cn('text-[11px]', dias !== null && dias < 7 ? 'text-bad font-medium' : 'text-ink-muted')}>
                            {fmtDate(p.validade)}
                            {dias !== null && dias < 30 && ` · ${dias}d`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    {perfil === '3pl' && (
                      <td className="td">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: ownerColor(p.ownerId) }} />
                          <span className="text-xs">{ownerName(p.ownerId)}</span>
                        </span>
                      </td>
                    )}
                    <td className="td text-right mono font-medium text-brand">{num(p.quantidade)}</td>
                    <td className="td">
                      <Badge tone={statusMeta[p.status].tone}>{statusMeta[p.status].l}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && (
          <EmptyState icon={<Boxes className="h-6 w-6" />} title="Nenhuma posição encontrada" text="Ajuste a busca ou os filtros de status." />
        )}
      </div>

      <Modal
        open={!!det}
        onClose={() => setDet(null)}
        title={det?.skuCodigo ?? ''}
        subtitle={det?.descricao}
        size="md"
        footer={
          det && (
            <>
              <button className="btn-outline" onClick={() => atualizarStatus('reservado', 'Saldo reservado', `${det.skuCodigo} bloqueado para onda/pedido`)}>
                Reservar saldo
              </button>
              <button className="btn-outline text-warn border-warn/30 hover:bg-warn-50" onClick={() => atualizarStatus('quarentena', 'Lote em quarentena', `${det.endereco} isolado para análise`)}>
                Quarentena
              </button>
              <button className="btn-primary" onClick={() => atualizarStatus('disponivel', 'Saldo liberado', `${det.skuCodigo} voltou para disponível`)}>
                Liberar
              </button>
            </>
          )
        }
      >
        {det && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Endereço', det.endereco],
                ['Quantidade', `${num(det.quantidade)} un`],
                ['Curva ABC', `Curva ${det.curva}`],
                ['Cliente/Owner', ownerName(det.ownerId)],
                ['Lote', det.lote ?? '—'],
                ['Validade', fmtDate(det.validade)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-surface-sub p-3">
                  <p className="text-xs text-ink-muted">{k}</p>
                  <p className="text-sm font-medium text-brand mono">{v}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line p-3">
              <span className="text-sm text-ink-soft">Status atual</span>
              <Badge tone={statusMeta[det.status].tone}>{statusMeta[det.status].l}</Badge>
            </div>
            <div className="rounded-xl bg-primary-50 border border-primary/10 p-3 text-xs text-primary">
              Ações desta tela são de supervisão: reserva, liberação e bloqueio operacional. Movimentação física e bipagem continuam no mobile.
            </div>
            <div className="rounded-xl border border-line divide-y divide-line">
              <p className="px-3 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wide">
                Rastreabilidade {conectado && <span className="text-ok">· movimentos reais</span>}
              </p>
              {(() => {
                const reais: [string, string][] = movs
                  .filter(
                    (m) =>
                      m.skuCode === det.skuCodigo &&
                      (m.fromAddressCode === det.endereco || m.toAddressCode === det.endereco),
                  )
                  .slice(0, 8)
                  .map((m) => [
                    MOV_LABEL[m.type] ?? m.type,
                    `${new Date(m.createdAt).toLocaleString('pt-BR')} · ${m.fromAddressCode ?? '—'}→${m.toAddressCode ?? '—'} · ${m.quantity}un`,
                  ])
                const linhas: [string, string][] = conectado
                  ? reais.length
                    ? reais
                    : [['—', 'Sem movimentos registrados para esta posição']]
                  : [
                      ['Recebido', '29/05 07:48 · Doca 03 · Op. Carlos M.'],
                      ['Endereçado', '29/05 08:12 · A-12 · Op. Demo'],
                      ['Última contagem', '28/05 · acuracidade 100%'],
                    ]
                return linhas.map(([k, v], i) => (
                  <div key={`${k}-${i}`} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-ink-soft">{k}</span>
                    <span className="text-xs text-ink-muted mono">{v}</span>
                  </div>
                ))
              })()}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
