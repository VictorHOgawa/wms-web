import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Truck, PackageCheck, Warehouse, Boxes, ShieldCheck, ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Badge, PageHeader, Progress, type Tone } from '../components/ui'
import { cn } from '../lib/utils'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { isConnected, wmsApi, type WmsMovementDTO } from '../lib/wmsApi'

/**
 * Dashboard 100% REAL (decisão 10/07: fim do modo demo) — tudo aqui vem do
 * spoke. Sem fonte real, o bloco mostra o estado vazio honesto em vez de
 * número de mentira.
 */

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e5e9f0',
  boxShadow: '0 10px 30px -10px rgba(10,19,30,0.25)',
  fontSize: 12,
}

const MOV_LABEL: Record<string, { l: string; tone: Tone }> = {
  RECEIVE: { l: 'Recebido', tone: 'info' },
  PUTAWAY: { l: 'Guardado', tone: 'primary' },
  PICK: { l: 'Separado', tone: 'accent' },
  REPLEN: { l: 'Abastecido', tone: 'ok' },
  COUNT_ADJUST_UP: { l: 'Ajuste +', tone: 'warn' },
  COUNT_ADJUST_DOWN: { l: 'Ajuste −', tone: 'warn' },
}
const movLabel = (t: string) => MOV_LABEL[t] ?? { l: t, tone: 'neutral' as Tone }

const DIVERG_CORES: Record<string, string> = {
  FALTA: '#ef4444',
  SOBRA: '#f97316',
  AVARIA: '#a855f7',
  VENCIDO: '#eab308',
  TROCA: '#06b6d4',
  DOCUMENTAL: '#64748b',
}

function Kpi({
  icon,
  label,
  value,
  to,
  tone = 'primary',
}: {
  icon: ReactNode
  label: string
  value: string
  to: string
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
    <Link to={to} className="card p-4 hover:border-brand transition-colors">
      <div className={cn('h-9 w-9 rounded-xl grid place-items-center', tones[tone])}>{icon}</div>
      <div className="mt-3">
        <div className="text-2xl font-semibold text-brand tracking-tight mono">{value}</div>
        <div className="text-xs text-ink-muted mt-0.5">{label}</div>
      </div>
    </Link>
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

/** KPIs do fluxo da viagem — chegadas/embarques, piso e divergências. */
function KpisFluxo({
  kpis,
}: {
  kpis: { chegadas: number; embarques: number; piso: number; estouradas: number; diverg: number } | null
}) {
  if (!kpis) return null
  const cards = [
    { label: 'Chegadas em andamento', n: kpis.chegadas, to: '/recebimento', alerta: false },
    { label: 'Embarques em andamento', n: kpis.embarques, to: '/expedicao', alerta: false },
    {
      label: kpis.estouradas > 0 ? `Cargas no piso · ${kpis.estouradas} free time estourado` : 'Cargas no piso',
      n: kpis.piso,
      to: '/free-time',
      alerta: kpis.estouradas > 0,
    },
    { label: 'Divergências abertas', n: kpis.diverg, to: '/divergencias-recebimento', alerta: false },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Link
          key={c.label}
          to={c.to}
          className={`card p-3 hover:border-brand transition-colors ${c.alerta ? 'border-red-400' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">{c.n}</span>
            {c.alerta ? <Badge tone="bad">atenção</Badge> : <Badge tone="ok" dot>real</Badge>}
          </div>
          <div className="text-xs text-ink-muted mt-1">{c.label}</div>
        </Link>
      ))}
    </div>
  )
}

interface DashboardData {
  kpis: { chegadas: number; embarques: number; piso: number; estouradas: number; diverg: number }
  posicoes: number
  volumes: number
  palletsEmUso: number
  autorizacoesPendentes: number
  tarefasColetor: number
  movimentos: WmsMovementDTO[]
  divergPorTipo: { name: string; value: number; cor: string }[]
  estoquePorZona: { zona: string; volumes: number; posicoes: number }[]
}

export default function Dashboard() {
  const usuario = useStore((s) => s.usuario)
  const [dados, setDados] = useState<DashboardData | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!isConnected()) return
    let vivo = true
    Promise.all([
      wmsApi.warehouseOverview('Recebimento em Piso').catch(() => []),
      wmsApi.warehouseOverview('Carregamento').catch(() => []),
      wmsApi.cargasEmPiso().catch(() => []),
      wmsApi.divergences('ABERTA').catch(() => []),
      wmsApi.stockPositions().catch(() => []),
      wmsApi.pallets().catch(() => []),
      wmsApi.autorizacoes('PENDENTE').catch(() => []),
      wmsApi.warehouseTasks(['TMSGUARDAR', 'TMSABASTECER', 'TMSCONTAR', 'TMSSEPARAR']).catch(() => []),
      wmsApi.movements(300).catch(() => []),
    ]).then(([rec, car, piso, div, pos, pallets, auts, tarefas, movs]) => {
      if (!vivo) return
      const abertas = (l: { status: string }[]) =>
        l.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length

      const porTipoDiv = new Map<string, number>()
      for (const d of div as { tipo: string }[]) {
        porTipoDiv.set(d.tipo, (porTipoDiv.get(d.tipo) ?? 0) + 1)
      }

      const porZona = new Map<string, { volumes: number; posicoes: number }>()
      for (const p of pos as { addressZone: string | null; quantity: number }[]) {
        const z = p.addressZone ?? 'Sem zona'
        const cur = porZona.get(z) ?? { volumes: 0, posicoes: 0 }
        cur.volumes += p.quantity
        cur.posicoes += 1
        porZona.set(z, cur)
      }

      setDados({
        kpis: {
          chegadas: abertas(rec),
          embarques: abertas(car),
          piso: piso.length,
          estouradas: (piso as { estourou?: boolean }[]).filter((c) => c.estourou).length,
          diverg: div.length,
        },
        posicoes: pos.length,
        volumes: (pos as { quantity: number }[]).reduce((s, p) => s + p.quantity, 0),
        palletsEmUso: (pallets as { status: string }[]).filter((p) => p.status !== 'GUARDADO').length,
        autorizacoesPendentes: auts.length,
        tarefasColetor: tarefas.length,
        movimentos: movs as WmsMovementDTO[],
        divergPorTipo: [...porTipoDiv.entries()].map(([name, value]) => ({
          name,
          value,
          cor: DIVERG_CORES[name] ?? '#94a3b8',
        })),
        estoquePorZona: [...porZona.entries()]
          .map(([zona, v]) => ({ zona, ...v }))
          .sort((a, b) => b.volumes - a.volumes),
      })
      setCarregando(false)
    })
    return () => {
      vivo = false
    }
  }, [])

  // Fluxo de hoje por hora (movimentos reais: recebido × guardado × separado).
  const fluxoHoje = useMemo(() => {
    if (!dados) return []
    const hoje = new Date().toDateString()
    const porHora = new Map<number, { recebido: number; guardado: number; separado: number }>()
    for (const m of dados.movimentos) {
      const d = new Date(m.createdAt)
      if (d.toDateString() !== hoje) continue
      const h = d.getHours()
      const cur = porHora.get(h) ?? { recebido: 0, guardado: 0, separado: 0 }
      if (m.type === 'RECEIVE') cur.recebido += m.quantity
      else if (m.type === 'PUTAWAY') cur.guardado += m.quantity
      else if (m.type === 'PICK') cur.separado += m.quantity
      porHora.set(h, cur)
    }
    const horas = [...porHora.keys()].sort((a, b) => a - b)
    return horas.map((h) => ({ hora: `${String(h).padStart(2, '0')}h`, ...porHora.get(h)! }))
  }, [dados])

  const ultimosMovimentos = useMemo(() => (dados ? dados.movimentos.slice(0, 6) : []), [dados])
  const maxZona = dados?.estoquePorZona[0]?.volumes ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bom dia, ${usuario.split(' ')[0]?.split('@')[0] || 'Operador'}`}
        subtitle={`Visão operacional do centro de distribuição · ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`}
      >
        <Link to="/recebimento" className="btn-outline">
          <Truck className="h-4 w-4" /> Recebimentos
        </Link>
        <Link to="/expedicao" className="btn-primary">
          <PackageCheck className="h-4 w-4" /> Expedição
        </Link>
      </PageHeader>

      {carregando ? (
        <div className="card p-8 text-center text-sm text-ink-muted">Carregando dados do armazém…</div>
      ) : (
        <>
          <KpisFluxo kpis={dados?.kpis ?? null} />

          {/* KPIs de estoque/operacão — todos reais */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Kpi icon={<Warehouse className="h-5 w-5" />} label="Posições ocupadas" value={String(dados?.posicoes ?? 0)} to="/estoque" tone="primary" />
            <Kpi icon={<Boxes className="h-5 w-5" />} label="Volumes em estoque" value={(dados?.volumes ?? 0).toLocaleString('pt-BR')} to="/estoque" tone="info" />
            <Kpi icon={<PackageCheck className="h-5 w-5" />} label="Pallets em uso" value={String(dados?.palletsEmUso ?? 0)} to="/pallets" tone="accent" />
            <Kpi icon={<ShieldCheck className="h-5 w-5" />} label="Autorizações pendentes" value={String(dados?.autorizacoesPendentes ?? 0)} to="/expedicao" tone="warn" />
            <Kpi icon={<ListChecks className="h-5 w-5" />} label="Tarefas do coletor" value={String(dados?.tarefasColetor ?? 0)} to="/os-viagem" tone="ok" />
          </div>

          {/* Gráficos — movimentos reais */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ChartCard title="Movimentos de estoque hoje" action={<Badge tone="ok" dot>real</Badge>}>
                {fluxoHoje.length === 0 ? (
                  <p className="py-16 text-center text-xs text-ink-muted">Nenhum movimento de estoque registrado hoje.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={fluxoHoje} margin={{ left: -20, right: 4 }}>
                      <defs>
                        <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gSep" x1="0" y1="0" x2="0" y2="1">
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
                      <Area type="monotone" name="Guardado" dataKey="guardado" stroke="#0e7490" strokeWidth={2} fill="none" />
                      <Area type="monotone" name="Separado" dataKey="separado" stroke="#f97316" strokeWidth={2.5} fill="url(#gSep)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            <ChartCard title="Divergências abertas por tipo">
              {(dados?.divergPorTipo.length ?? 0) === 0 ? (
                <p className="py-16 text-center text-xs text-ink-muted">Nenhuma divergência aberta. 🎉</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={dados!.divergPorTipo} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>
                      {dados!.divergPorTipo.map((s) => (
                        <Cell key={s.name} fill={s.cor} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <ChartCard title="Estoque por zona">
              {(dados?.estoquePorZona.length ?? 0) === 0 ? (
                <p className="py-10 text-center text-xs text-ink-muted">Nenhuma posição de estoque ocupada.</p>
              ) : (
                <div className="space-y-3.5 pt-1">
                  {dados!.estoquePorZona.map((z) => (
                    <div key={z.zona}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-ink-soft">{z.zona}</span>
                        <span className="mono font-medium text-brand">
                          {z.volumes.toLocaleString('pt-BR')} vol · {z.posicoes} pos
                        </span>
                      </div>
                      <Progress value={maxZona ? (z.volumes / maxZona) * 100 : 0} tone="ok" />
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Últimos movimentos"
              action={
                <Link to="/movimentos" className="text-xs font-medium text-primary hover:underline">
                  Ver todos
                </Link>
              }
            >
              {ultimosMovimentos.length === 0 ? (
                <p className="py-10 text-center text-xs text-ink-muted">Nenhum movimento registrado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {ultimosMovimentos.map((m) => {
                    const meta = movLabel(m.type)
                    return (
                      <div key={m.id} className="flex items-center gap-3 rounded-xl border border-line p-2.5 row-hover">
                        <Badge tone={meta.tone}>{meta.l}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink-soft truncate">
                            {m.quantity}× {m.skuCode} — {m.skuDescription}
                          </p>
                          <p className="text-xs text-ink-muted mono">
                            {m.fromAddressCode ?? 'entrada'} → {m.toAddressCode ?? 'saída'}
                          </p>
                        </div>
                        <span className="text-xs text-ink-muted mono shrink-0">
                          {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
