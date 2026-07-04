import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'
import { BarChart3, Download, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { PageHeader } from '../components/ui'
import { cn } from '../lib/utils'
import { useStore } from '../store/useStore'

const KPI_TABLE = [
  { k: 'Acuracidade de inventário', m: 'Estoque sistêmico vs. físico', v: '99,4%', meta: '99,0%', d: 0.3, good: true },
  { k: 'Produtividade por operador', m: 'Linhas/hora, pedidos/hora', v: '142 l/h', meta: '130 l/h', d: 8, good: true },
  { k: 'OTIF', m: 'On Time In Full', v: '97,8%', meta: '97,0%', d: 1.2, good: true },
  { k: 'Taxa de ocupação', m: 'Uso dos endereços/espaço', v: '81%', meta: '85%', d: -4, good: false },
  { k: 'Tempo de ciclo de pedido', m: 'Do corte ao despacho', v: '3,1h', meta: '3,5h', d: -0.4, good: true },
  { k: 'Taxa de divergência', m: 'Erros recebimento/expedição', v: '0,6%', meta: '1,0%', d: -0.4, good: true },
  { k: 'Dock-to-stock', m: 'Recebimento até disponível', v: '2,4h', meta: '3,0h', d: -0.6, good: true },
]

const TREND = [
  { mes: 'Dez', otif: 95.1, acuracidade: 98.2 },
  { mes: 'Jan', otif: 95.8, acuracidade: 98.6 },
  { mes: 'Fev', otif: 96.4, acuracidade: 98.9 },
  { mes: 'Mar', otif: 96.9, acuracidade: 99.1 },
  { mes: 'Abr', otif: 97.3, acuracidade: 99.2 },
  { mes: 'Mai', otif: 97.8, acuracidade: 99.4 },
]
const RADAR = [
  { eixo: 'Recebimento', v: 92 },
  { eixo: 'Putaway', v: 88 },
  { eixo: 'Picking', v: 95 },
  { eixo: 'Packing', v: 90 },
  { eixo: 'Expedição', v: 86 },
  { eixo: 'Inventário', v: 99 },
]

export default function Relatorios() {
  const toast = useStore((s) => s.toast)
  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios & KPIs" subtitle="Indicadores operacionais consolidados do centro de distribuição">
        <button
          className="btn-outline"
          onClick={() =>
            toast({
              tipo: 'info',
              titulo: 'Relatório executivo preparado',
              texto: 'A apresentação comercial já pode mostrar um PDF consolidado de KPIs.',
            })
          }
        >
          <Download className="h-4 w-4" /> Exportar PDF
        </button>
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-brand text-sm mb-4">Evolução — OTIF & Acuracidade (6 meses)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={TREND} margin={{ left: -16, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[94, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e9f0', fontSize: 12 }} />
              <Line type="monotone" dataKey="otif" name="OTIF %" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="acuracidade" name="Acuracidade %" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-brand text-sm mb-4">Saúde por etapa</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={RADAR} outerRadius={90}>
              <PolarGrid stroke="#e5e9f0" />
              <PolarAngleAxis dataKey="eixo" tick={{ fontSize: 10, fill: '#64748b' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="v" stroke="#2563eb" fill="#2563eb" fillOpacity={0.18} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-ink-muted" />
          <h3 className="font-semibold text-brand text-sm">Quadro de indicadores</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">KPI</th>
              <th className="th">O que mede</th>
              <th className="th text-right">Atual</th>
              <th className="th text-right">Meta</th>
              <th className="th text-right">Variação</th>
            </tr>
          </thead>
          <tbody>
            {KPI_TABLE.map((r) => (
              <tr key={r.k} className="row-hover">
                <td className="td font-medium text-brand">{r.k}</td>
                <td className="td text-ink-muted">{r.m}</td>
                <td className="td text-right mono font-semibold text-brand">{r.v}</td>
                <td className="td text-right mono text-ink-muted">{r.meta}</td>
                <td className="td text-right">
                  <span className={cn('inline-flex items-center gap-0.5 font-medium', r.good ? 'text-ok' : 'text-bad')}>
                    {r.d > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {Math.abs(r.d)}{typeof r.d === 'number' && r.k.includes('%') ? 'pp' : ''}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
