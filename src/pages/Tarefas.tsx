import { useState } from 'react'
import { Repeat, ArrowRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, PageHeader, Tab, Tabs, type Tone } from '../components/ui'
import type { StatusTarefa, TipoTarefa } from '../lib/types'

const tipoMeta: Record<TipoTarefa, { l: string; tone: Tone }> = {
  recebimento: { l: 'Recebimento', tone: 'info' },
  putaway: { l: 'Putaway', tone: 'info' },
  picking: { l: 'Picking', tone: 'primary' },
  packing: { l: 'Packing', tone: 'accent' },
  carregamento: { l: 'Carregamento', tone: 'info' },
  reabastecimento: { l: 'Reabastecimento', tone: 'accent' },
  contagem: { l: 'Contagem', tone: 'neutral' },
  recontagem: { l: 'Recontagem', tone: 'warn' },
  divergencia: { l: 'Divergência', tone: 'bad' },
  'cross-docking': { l: 'Cross-docking', tone: 'warn' },
}
const statusMeta: Record<StatusTarefa, { l: string; tone: Tone }> = {
  'a-fazer': { l: 'A fazer', tone: 'neutral' },
  fazendo: { l: 'Fazendo', tone: 'primary' },
  feito: { l: 'Feito', tone: 'ok' },
  problema: { l: 'Problema', tone: 'bad' },
}
const prioMeta = { alta: 'bad', media: 'warn', baixa: 'neutral' } as const

export default function Tarefas() {
  const { tarefas, assumirTarefa, concluirTarefa, toast } = useStore()
  const [aba, setAba] = useState<'todos' | TipoTarefa>('todos')
  const lista = [...tarefas]
    .filter((t) => (aba === 'todos' ? true : t.tipo === aba))
    .sort((a, b) => {
      const ord = { alta: 0, media: 1, baixa: 2 }
      return ord[a.prioridade] - ord[b.prioridade]
    })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fila de Tarefas & Interleaving"
        subtitle="Fila única priorizada — o sistema decide a próxima tarefa por operador (DEMO — dados de exemplo)"
      >
        <Badge tone="primary" dot>{tarefas.filter((t) => t.status !== 'feito').length} na fila</Badge>
      </PageHeader>

      <div className="card p-4 flex items-start gap-3 bg-accent-50/40 border-accent/10">
        <Repeat className="h-5 w-5 text-accent shrink-0 mt-0.5" />
        <p className="text-sm text-ink-soft">
          <span className="font-medium text-brand">Interleaving:</span> ao terminar um putaway perto da doca, o sistema
          encaixa um picking no caminho de volta — elimina deslocamento vazio e aumenta a produtividade.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 pt-1">
          <Tabs value={aba} onChange={(v) => setAba(v as 'todos' | TipoTarefa)}>
            <Tab id="todos">Todas</Tab>
            <Tab id="recebimento">Recebimento</Tab>
            <Tab id="putaway">Putaway</Tab>
            <Tab id="picking">Picking</Tab>
            <Tab id="packing">Packing</Tab>
            <Tab id="reabastecimento">Reabastecimento</Tab>
            <Tab id="contagem">Contagem</Tab>
            <Tab id="carregamento">Carregamento</Tab>
            <Tab id="cross-docking">Cross-docking</Tab>
          </Tabs>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Tarefa</th>
              <th className="th">Tipo</th>
              <th className="th">Prioridade</th>
              <th className="th">Rota</th>
              <th className="th">Operador</th>
              <th className="th">SLA</th>
              <th className="th">Status</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((t) => (
              <tr key={t.id} className="row-hover">
                <td className="td mono font-medium text-brand">{t.id}</td>
                <td className="td"><Badge tone={tipoMeta[t.tipo].tone}>{tipoMeta[t.tipo].l}</Badge></td>
                <td className="td"><Badge tone={prioMeta[t.prioridade]}>{t.prioridade}</Badge></td>
                <td className="td">
                  <span className="inline-flex items-center gap-1.5 mono text-xs">
                    {t.origem} <ArrowRight className="h-3 w-3 text-ink-muted" /> {t.destino}
                  </span>
                </td>
                <td className="td">{t.operador ?? <span className="text-ink-muted">—</span>}</td>
                <td className="td mono text-xs">{t.sla ?? '—'}</td>
                <td className="td">
                  <Badge tone={statusMeta[t.status].tone} dot>{statusMeta[t.status].l}</Badge>
                </td>
                <td className="td text-right">
                  {t.status === 'a-fazer' && (
                    <button onClick={() => { assumirTarefa(t.id, 'Operador Demo'); toast({ tipo: 'info', titulo: 'Tarefa atribuída', texto: t.id }) }} className="btn-outline py-1.5 px-3 text-xs">Assumir</button>
                  )}
                  {(t.status === 'fazendo' || t.status === 'problema') && (
                    <button onClick={() => { concluirTarefa(t.id); toast({ tipo: 'sucesso', titulo: 'Tarefa concluída', texto: t.id }) }} className="btn-primary py-1.5 px-3 text-xs">Concluir</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
