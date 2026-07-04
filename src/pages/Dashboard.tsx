import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ClipboardCheck,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  PackageCheck,
  Tags,
  Warehouse,
  Shuffle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  FLUXO_DIA,
  OCUPACAO_ZONAS,
  ORDENS_EXECUCAO_SEMANA,
  STATUS_PEDIDOS,
  VIAGENS_ETIQUETAGEM,
} from '../lib/mock'
import { useStore } from '../store/useStore'
import { Badge, PageHeader, Progress, type Tone } from '../components/ui'
import { cn } from '../lib/utils'
import { calcularEtiquetas, emissaoAutomaticaIso, type ViagemComRecebimento } from '../lib/etiquetas'
import { skusPendentesDoRecebimento } from '../lib/skuControle'
import { useMemo, type ReactNode } from 'react'
import type { TipoTarefa } from '../lib/types'

const tipoTarefaLabel: Record<TipoTarefa, { l: string; tone: Tone }> = {
  recebimento: { l: 'Receb.', tone: 'info' },
  putaway: { l: 'Putaway', tone: 'info' },
  picking: { l: 'Picking', tone: 'primary' },
  packing: { l: 'Packing', tone: 'accent' },
  carregamento: { l: 'Carga', tone: 'info' },
  reabastecimento: { l: 'Reabast.', tone: 'accent' },
  contagem: { l: 'Contagem', tone: 'neutral' },
  recontagem: { l: 'Recont.', tone: 'warn' },
  divergencia: { l: 'Diverg.', tone: 'bad' },
  'cross-docking': { l: 'Cross-dock', tone: 'warn' },
}

function Kpi({
  icon,
  label,
  value,
  suffix,
  delta,
  tone = 'primary',
}: {
  icon: ReactNode
  label: string
  value: string
  suffix?: string
  delta?: { v: string; up: boolean; good: boolean }
  tone?: string
}) {
  const tones: Record<string, string> = {
    primary: 'bg-primary-50 text-primary',
    ok: 'bg-ok-50 text-ok',
    accent: 'bg-accent-50 text-accent',
    warn: 'bg-warn-50 text-warn',
    info: 'bg-info-50 text-info',
  }
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className={cn('h-9 w-9 rounded-xl grid place-items-center', tones[tone])}>{icon}</div>
        {delta && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              delta.good ? 'text-ok' : 'text-bad',
            )}
          >
            {delta.up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {delta.v}
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-semibold text-brand tracking-tight mono">
          {value}
          {suffix && <span className="text-base text-ink-muted font-normal ml-0.5">{suffix}</span>}
        </div>
        <div className="text-xs text-ink-muted mt-0.5">{label}</div>
      </div>
    </div>
  )
}

function ChartCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-brand text-sm">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e5e9f0',
  boxShadow: '0 10px 30px -10px rgba(10,19,30,0.25)',
  fontSize: 12,
}

function formatarNumero(valor: number) {
  return valor.toLocaleString('pt-BR')
}

function formatarPercentual(valor: number) {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

export default function Dashboard() {
  const { tarefas, usuario, ownerId, recebimentos, estoque, pedidos, skusControle } = useStore()
  const recebimentosFiltrados = useMemo(
    () => recebimentos.filter((rec) => ownerId === 'own-all' || rec.ownerId === ownerId),
    [ownerId, recebimentos],
  )
  const recebimentoPorId = useMemo(
    () => new Map(recebimentos.map((rec) => [rec.id, rec])),
    [recebimentos],
  )
  const pedidoPorId = useMemo(
    () => new Map(pedidos.map((pedido) => [pedido.id, pedido])),
    [pedidos],
  )
  const tarefasFiltradas = useMemo(
    () =>
      tarefas.filter((tarefa) => {
        if (ownerId === 'own-all') return true
        if (tarefa.referenciaTipo === 'recebimento' && tarefa.referenciaId) {
          return recebimentoPorId.get(tarefa.referenciaId)?.ownerId === ownerId
        }
        if (tarefa.referenciaTipo === 'pedido' && tarefa.referenciaId) {
          return pedidoPorId.get(tarefa.referenciaId)?.ownerId === ownerId
        }
        return true
      }),
    [ownerId, pedidoPorId, recebimentoPorId, tarefas],
  )
  const estoqueFiltrado = useMemo(
    () => estoque.filter((posicao) => ownerId === 'own-all' || posicao.ownerId === ownerId),
    [ownerId, estoque],
  )
  const viagensProntas = useMemo<ViagemComRecebimento[]>(
    () =>
      VIAGENS_ETIQUETAGEM.map((viagem) => ({
        viagem,
        recebimento: recebimentoPorId.get(viagem.recebimentoId) ?? null,
      })).filter((row) => {
        if (!row.recebimento) return false
        if (ownerId !== 'own-all' && row.recebimento.ownerId !== ownerId) return false
        if (skusPendentesDoRecebimento(row.recebimento, skusControle).length > 0) return false
        if (row.viagem.documentoStatus !== 'aprovado') return false
        if (row.viagem.ordemExecucaoAtual < 4) return false
        if (row.recebimento.status === 'divergencia' || row.recebimento.itens.some((item) => item.ocorrencia)) return false
        return true
      }),
    [ownerId, recebimentoPorId, skusControle],
  )
  const taxaOrdemExecucao = recebimentosFiltrados.length
    ? (recebimentosFiltrados.filter((rec) => (rec.ordemExecucaoAtual ?? 0) > 0).length / recebimentosFiltrados.length) * 100
    : 0
  const etiquetasEmitidas = viagensProntas.reduce((total, row) => {
    if (!row.recebimento) return total
    return total + calcularEtiquetas(row.viagem, row.recebimento, emissaoAutomaticaIso(row)).length
  }, 0)
  const palletsNoEstoque = estoqueFiltrado.filter((posicao) => posicao.quantidade > 0).length
  const palletsEnderecados = tarefasFiltradas.filter((tarefa) => tarefa.tipo === 'putaway' && tarefa.status === 'feito').length
  const palletsCrossDocking = tarefasFiltradas.filter(
    (tarefa) => tarefa.tipo === 'cross-docking' && tarefa.status !== 'feito',
  ).length
  const fila = tarefas.filter((t) => t.status !== 'feito').slice(0, 6)

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bom dia, ${usuario.split(' ')[0] || 'Operador'}`}
        subtitle="Visão operacional do centro de distribuição · 29 mai 2026, 08:42"
      >
        <Link to="/recebimento" className="btn-outline">
          <Truck className="h-4 w-4" /> Recebimentos
        </Link>
        <Link to="/expedicao" className="btn-primary">
          <PackageCheck className="h-4 w-4" /> Expedição
        </Link>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi icon={<ClipboardCheck className="h-5 w-5" />} label="Operações com ordem de execução" value={formatarPercentual(taxaOrdemExecucao)} suffix="%" tone="ok" />
        <Kpi icon={<Tags className="h-5 w-5" />} label="Etiquetas emitidas" value={formatarNumero(etiquetasEmitidas)} tone="accent" />
        <Kpi icon={<Warehouse className="h-5 w-5" />} label="Pallets no estoque" value={formatarNumero(palletsNoEstoque)} tone="primary" />
        <Kpi icon={<PackageCheck className="h-5 w-5" />} label="Pallets endereçados no armazém" value={formatarNumero(palletsEnderecados)} tone="info" />
        <Kpi icon={<Shuffle className="h-5 w-5" />} label="Pallets em cross-docking" value={formatarNumero(palletsCrossDocking)} tone="warn" />
      </div>

      {/* charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartCard
            title="Fluxo recebido vs. expedido (hoje)"
            action={<Badge tone="primary" dot>Tempo real</Badge>}
          >
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={FLUXO_DIA} margin={{ left: -20, right: 4 }}>
                <defs>
                  <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" name="Recebido" dataKey="recebido" stroke="#2563eb" strokeWidth={2.5} fill="url(#gRec)" />
                <Area type="monotone" name="Expedido" dataKey="expedido" stroke="#f97316" strokeWidth={2.5} fill="url(#gExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Status dos pedidos">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={STATUS_PEDIDOS}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={2}
              >
                {STATUS_PEDIDOS.map((s) => (
                  <Cell key={s.name} fill={s.cor} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <ChartCard title="Ordens concluídas na semana">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ORDENS_EXECUCAO_SEMANA} margin={{ left: -20, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f6f8fb' }} />
              <Line type="monotone" dataKey="meta" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} dot={false} name="Meta" />
              <Bar dataKey="ordens" fill="#2563eb" radius={[6, 6, 0, 0]} name="Realizado" barSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ocupação por zona">
          <div className="space-y-3.5 pt-1">
            {OCUPACAO_ZONAS.map((z) => (
              <div key={z.zona}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-ink-soft">{z.zona}</span>
                  <span className="mono font-medium text-brand">{z.ocupacao}%</span>
                </div>
                <Progress value={z.ocupacao} tone={z.ocupacao > 90 ? 'bad' : z.ocupacao > 80 ? 'warn' : 'ok'} />
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Fila de tarefas ativa"
          action={
            <Link to="/tarefas" className="text-xs font-medium text-primary hover:underline">
              Ver todas
            </Link>
          }
        >
          <div className="space-y-2">
            {fila.map((t) => {
              const meta = tipoTarefaLabel[t.tipo]
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-line p-2.5 row-hover">
                  <Badge tone={meta.tone}>{meta.l}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink-soft truncate">{t.descricao}</p>
                    <p className="text-xs text-ink-muted mono">
                      {t.origem} → {t.destino}
                    </p>
                  </div>
                  {t.prioridade === 'alta' && <span className="h-2 w-2 rounded-full bg-bad" title="Prioridade alta" />}
                </div>
              )
            })}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
