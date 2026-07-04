import { useState } from 'react'
import { Zap, Hand, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, Modal, PageHeader, ScanInput } from '../components/ui'
import OrdemServicoPanel from '../components/OrdemServicoPanel'
import { cn } from '../lib/utils'

interface ReabRow {
  id: string
  sku: string
  desc: string
  enderecoPicking: string
  pulmao: string
  nivel: number
  minimo: number
  qtde: number
  gatilho: 'automatico' | 'sob-demanda'
}

const SEED: ReabRow[] = [
  { id: 'R-9005', sku: 'SKU-10243', desc: 'Cabo USB-C 2m', enderecoPicking: 'A-13-01-1', pulmao: 'PUL-A-22', nivel: 12, minimo: 50, qtde: 144, gatilho: 'sob-demanda' },
  { id: 'R-9008', sku: 'SKU-10241', desc: 'Fone Bluetooth Pulse X', enderecoPicking: 'A-12-03-2', pulmao: 'PUL-A-18', nivel: 84, minimo: 100, qtde: 120, gatilho: 'automatico' },
  { id: 'R-9011', sku: 'SKU-20055', desc: 'Sérum Vitamina C 30ml', enderecoPicking: 'B-04-12-3', pulmao: 'PUL-B-09', nivel: 22, minimo: 60, qtde: 180, gatilho: 'automatico' },
]

export default function Reabastecimento() {
  const { toast } = useStore()
  const [rows, setRows] = useState<(ReabRow & { feito?: boolean })[]>(SEED)
  const [exec, setExec] = useState<ReabRow | null>(null)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reabastecimento (Replenishment)"
        subtitle="Endereço de picking abaixo do mínimo → tarefa gerada → move do pulmão para picking"
      >
        <Badge tone="accent" dot>{rows.filter((r) => !r.feito).length} reabastecimentos</Badge>
      </PageHeader>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary-50 text-primary grid place-items-center"><Zap className="h-4 w-4" /></div>
          <div>
            <p className="font-medium text-brand">Automático</p>
            <p className="text-sm text-ink-muted">Disparado por nível mínimo no endereço de picking.</p>
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-accent-50 text-accent grid place-items-center"><Hand className="h-4 w-4" /></div>
          <div>
            <p className="font-medium text-brand">Sob demanda</p>
            <p className="text-sm text-ink-muted">Disparado por picking parcial. Bom WMS faz <em>interleaving</em>.</p>
          </div>
        </div>
      </div>

      <div className="card p-4 flex items-start gap-3 bg-info-50/40 border-info/10">
        <Zap className="h-5 w-5 text-info shrink-0 mt-0.5" />
        <p className="text-sm text-ink-soft">
          O reabastecimento mantém o endereço de picking acima do mínimo. A OS move saldo do pulmão para
          o picking com bipagem de origem e destino, gerando movimento interno de estoque.
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Tarefa</th>
              <th className="th">SKU</th>
              <th className="th">Nível atual</th>
              <th className="th">Movimentação</th>
              <th className="th">Gatilho</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="row-hover">
                <td className="td mono font-medium text-brand">{r.id}</td>
                <td className="td">
                  <div className="mono text-xs">{r.sku}</div>
                  <div className="text-xs text-ink-muted">{r.desc}</div>
                </td>
                <td className="td">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 rounded-full bg-slate-100 overflow-hidden">
                      <div className={cn('h-full rounded-full', r.nivel < r.minimo ? 'bg-bad' : 'bg-ok')} style={{ width: `${Math.min(100, (r.nivel / r.minimo) * 100)}%` }} />
                    </div>
                    <span className="mono text-xs text-ink-soft">{r.nivel}/{r.minimo}</span>
                  </div>
                </td>
                <td className="td">
                  <span className="inline-flex items-center gap-1.5 mono text-xs">
                    {r.pulmao} <ArrowRight className="h-3 w-3 text-ink-muted" /> <span className="text-primary font-medium">{r.enderecoPicking}</span>
                  </span>
                  <span className="text-xs text-ink-muted ml-1">· {r.qtde} un</span>
                </td>
                <td className="td">
                  <Badge tone={r.gatilho === 'automatico' ? 'primary' : 'accent'}>
                    {r.gatilho === 'automatico' ? 'Automático' : 'Sob demanda'}
                  </Badge>
                </td>
                <td className="td text-right">
                  {r.feito ? (
                    <Badge tone="ok" dot>Concluído</Badge>
                  ) : (
                    <button onClick={() => setExec(r)} className="btn-outline py-1.5 px-3 text-xs">Executar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <OrdemServicoPanel
        title="OS de reabastecimento"
        subtitle="Crie reposições automáticas ou sob demanda para operadores executarem no app."
        tipos={['reabastecimento']}
      />

      {exec && (
        <ReabExec
          row={exec}
          onClose={() => setExec(null)}
          onConcluir={() => {
            setRows((rs) => rs.map((x) => (x.id === exec.id ? { ...x, feito: true } : x)))
            toast({ tipo: 'sucesso', titulo: 'Picking reabastecido', texto: `${exec.sku} → ${exec.enderecoPicking}` })
            setExec(null)
          }}
        />
      )}
    </div>
  )
}

function ReabExec({ row, onClose, onConcluir }: { row: ReabRow; onClose: () => void; onConcluir: () => void }) {
  const [origem, setOrigem] = useState(false)
  const [destino, setDestino] = useState(false)
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Executar reabastecimento"
      subtitle={`${row.desc} · ${row.qtde} un`}
      footer={
        <>
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={onConcluir} disabled={!origem || !destino} className="btn-primary">Confirmar</button>
        </>
      }
    >
      <div className="space-y-4">
        {!origem ? (
          <ScanInput expected={row.pulmao} label="1 · Bipe o endereço de origem (pulmão)" onValid={() => setOrigem(true)} />
        ) : (
          <div className="flex items-center gap-2 text-sm text-ok rounded-xl bg-ok-50 px-3 py-2"><CheckCircle2 className="h-4 w-4" /> Origem <span className="mono">{row.pulmao}</span></div>
        )}
        {origem &&
          (!destino ? (
            <ScanInput expected={row.enderecoPicking} label="2 · Bipe o endereço de destino (picking)" onValid={() => setDestino(true)} />
          ) : (
            <div className="flex items-center gap-2 text-sm text-ok rounded-xl bg-ok-50 px-3 py-2"><CheckCircle2 className="h-4 w-4" /> Destino <span className="mono">{row.enderecoPicking}</span></div>
          ))}
      </div>
    </Modal>
  )
}
