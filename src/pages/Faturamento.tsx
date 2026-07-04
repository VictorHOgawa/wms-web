import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Receipt, Download, Warehouse, ArrowLeftRight, ScanLine, Sparkles } from 'lucide-react'
import { FATURAS, ownerColor, ownerName } from '../lib/mock'
import { Badge, PageHeader } from '../components/ui'
import { brl } from '../lib/utils'
import { useStore } from '../store/useStore'

export default function Faturamento() {
  const toast = useStore((s) => s.toast)
  const total = FATURAS.reduce((s, f) => s + f.total, 0)
  const chart = FATURAS.map((f) => ({ nome: ownerName(f.ownerId).split(' ')[0], total: f.total, cor: ownerColor(f.ownerId) }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faturamento de Serviços (3PL)"
        subtitle="Cobrança por serviço logístico — relatórios por cliente são entregáveis contratuais"
      >
        <button
          className="btn-primary"
          onClick={() =>
            toast({
              tipo: 'sucesso',
              titulo: 'Pacote de faturamento preparado',
              texto: 'A demo gerou um pacote visual por owner para apresentação comercial.',
            })
          }
        >
          <Download className="h-4 w-4" /> Exportar fatura
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: 'Faturamento do mês', v: brl(total), icon: Receipt, tone: 'bg-primary-50 text-primary' },
          { l: 'Armazenagem', v: brl(FATURAS.reduce((s, f) => s + f.armazenagem, 0)), icon: Warehouse, tone: 'bg-info-50 text-info' },
          { l: 'Movimentação', v: brl(FATURAS.reduce((s, f) => s + f.movimentacaoEntrada + f.movimentacaoSaida, 0)), icon: ArrowLeftRight, tone: 'bg-accent-50 text-accent' },
          { l: 'Picking + VAS', v: brl(FATURAS.reduce((s, f) => s + f.pickingLinhas + f.vas, 0)), icon: ScanLine, tone: 'bg-ok-50 text-ok' },
        ].map((c) => (
          <div key={c.l} className="card p-4">
            <div className={`h-9 w-9 rounded-xl grid place-items-center ${c.tone}`}><c.icon className="h-4 w-4" /></div>
            <div className="text-xl font-semibold text-brand mono mt-3">{c.v}</div>
            <div className="text-xs text-ink-muted mt-0.5">{c.l}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-1">
          <h3 className="font-semibold text-brand text-sm mb-4">Faturamento por cliente</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chart} layout="vertical" margin={{ left: 10, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} width={70} />
              <Tooltip formatter={(v) => brl(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #e5e9f0', fontSize: 12 }} />
              <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={22}>
                {chart.map((c) => <Cell key={c.nome} fill={c.cor} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card overflow-hidden lg:col-span-2">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Cliente</th>
                <th className="th text-right">Armazenagem</th>
                <th className="th text-right">Mov. entrada</th>
                <th className="th text-right">Mov. saída</th>
                <th className="th text-right">Picking</th>
                <th className="th text-right">VAS</th>
                <th className="th text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {FATURAS.map((f) => (
                <tr key={f.ownerId} className="row-hover">
                  <td className="td">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: ownerColor(f.ownerId) }} />
                      <span className="font-medium text-brand">{ownerName(f.ownerId)}</span>
                    </span>
                    <div className="text-xs text-ink-muted ml-4.5 mt-0.5">{f.paletesDia} paletes·dia</div>
                  </td>
                  <td className="td text-right mono">{brl(f.armazenagem)}</td>
                  <td className="td text-right mono">{brl(f.movimentacaoEntrada)}</td>
                  <td className="td text-right mono">{brl(f.movimentacaoSaida)}</td>
                  <td className="td text-right mono">{brl(f.pickingLinhas)}</td>
                  <td className="td text-right mono">{f.vas ? brl(f.vas) : '—'}</td>
                  <td className="td text-right mono font-semibold text-brand">{brl(f.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-sub">
                <td className="td font-semibold text-brand">Total geral</td>
                <td className="td" colSpan={5}></td>
                <td className="td text-right mono font-semibold text-primary">{brl(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="card p-4 flex items-start gap-3 bg-info-50/40 border-info/10">
        <Sparkles className="h-5 w-5 text-info shrink-0 mt-0.5" />
        <p className="text-sm text-ink-soft">
          Serviços de valor agregado (VAS) — etiquetagem, kitting e conferência especial — são medidos por evento e
          entram na fatura mensal de cada owner. <Badge tone="info" className="ml-1">Entregável contratual</Badge>
        </p>
      </div>
    </div>
  )
}
