import { useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  RefreshCcw,
  ShieldAlert,
  UserCheck,
} from 'lucide-react'
import { Badge, Modal, PageHeader, type Tone } from '../components/ui'
import { ownerName } from '../lib/mock'
import { cn } from '../lib/utils'
import { useStore } from '../store/useStore'
import type { OccurrenceSeverity, OccurrenceStatus, OperationalOccurrence } from '../lib/types'

const statusMeta: Record<OccurrenceStatus, { label: string; tone: Tone }> = {
  OPEN: { label: 'Aberta', tone: 'bad' },
  WAITING_PHOTO: { label: 'Aguardando foto', tone: 'warn' },
  WAITING_SUPERVISOR: { label: 'Aguardando lider', tone: 'warn' },
  IN_TREATMENT: { label: 'Em tratativa', tone: 'primary' },
  BLOCKING_FLOW: { label: 'Bloqueando fluxo', tone: 'bad' },
  WAITING_EXTERNAL: { label: 'Aguardando externo', tone: 'info' },
  RESOLVED: { label: 'Resolvida', tone: 'ok' },
  REJECTED: { label: 'Rejeitada', tone: 'neutral' },
  REOPENED: { label: 'Reaberta', tone: 'bad' },
  CANCELLED: { label: 'Cancelada', tone: 'neutral' },
}

const severityMeta: Record<OccurrenceSeverity, { label: string; tone: Tone }> = {
  LOW: { label: 'Baixa', tone: 'neutral' },
  MEDIUM: { label: 'Media', tone: 'warn' },
  HIGH: { label: 'Alta', tone: 'bad' },
  CRITICAL: { label: 'Critica', tone: 'bad' },
}

const flowLabel: Record<string, string> = {
  receber: 'Recebimento',
  guardar: 'Put-away',
  separar: 'Picking',
  conferir: 'Conferencia',
  carregar: 'Carregamento',
  contar: 'Inventario',
  abastecer: 'Reabastecimento',
}

type DecisionAction = 'ressalva' | 'encerrar' | null
const DEMO_NOW = Date.parse('2026-06-26T10:30:00-03:00')

export default function Ocorrencias() {
  const {
    ocorrenciasOperacionais,
    eventosOperacionais,
    assumirOcorrencia,
    liberarComRessalva,
    solicitarFotoOcorrencia,
    pedirRecontagemOcorrencia,
    encerrarOcorrencia,
    toast,
  } = useStore()
  const [status, setStatus] = useState<'todos' | OccurrenceStatus>('todos')
  const [selectedId, setSelectedId] = useState(ocorrenciasOperacionais[0]?.id ?? '')
  const [decision, setDecision] = useState<DecisionAction>(null)
  const [motivo, setMotivo] = useState('')

  const filtered = useMemo(
    () =>
      ocorrenciasOperacionais
        .filter((item) => (status === 'todos' ? true : item.status === status))
        .sort((a, b) => severityRank(b.severity) - severityRank(a.severity)),
    [ocorrenciasOperacionais, status],
  )
  const selected = ocorrenciasOperacionais.find((item) => item.id === selectedId) ?? filtered[0]
  const events = selected
    ? eventosOperacionais
        .filter((event) => event.objectId === selected.id || event.payload?.taskId === selected.sourceTaskId)
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    : []

  const openDecision = (action: DecisionAction) => {
    setDecision(action)
    setMotivo('')
  }

  const submitDecision = () => {
    if (!selected || !decision) return
    if (!motivo.trim()) {
      toast({ tipo: 'erro', titulo: 'Motivo obrigatorio', texto: 'Registre o motivo para manter auditoria.' })
      return
    }
    if (decision === 'ressalva') {
      liberarComRessalva(selected.id, motivo)
      toast({ tipo: 'sucesso', titulo: 'Liberado com ressalva', texto: selected.id })
    }
    if (decision === 'encerrar') {
      encerrarOcorrencia(selected.id, motivo)
      toast({ tipo: 'sucesso', titulo: 'Ocorrencia encerrada', texto: selected.id })
    }
    setDecision(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ocorrencias"
        subtitle="Fila central do lider: bloqueios, evidencias, SLA e decisoes operacionais"
      >
        <Badge tone="bad" dot>
          {ocorrenciasOperacionais.filter((item) => item.status !== 'RESOLVED').length} abertas
        </Badge>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Bloqueando fluxo" value={ocorrenciasOperacionais.filter((o) => o.blocksFlow && o.status !== 'RESOLVED').length} tone="bad" />
        <KpiCard label="Aguardando lider" value={ocorrenciasOperacionais.filter((o) => o.status === 'WAITING_SUPERVISOR').length} tone="warn" />
        <KpiCard label="Com evidencia" value={ocorrenciasOperacionais.filter((o) => o.evidence.length > 0).length} tone="info" />
        <KpiCard label="Resolvidas" value={ocorrenciasOperacionais.filter((o) => o.status === 'RESOLVED').length} tone="ok" />
      </div>

      <div className="flex flex-wrap gap-2">
        {(['todos', 'BLOCKING_FLOW', 'WAITING_SUPERVISOR', 'WAITING_PHOTO', 'IN_TREATMENT', 'RESOLVED'] as const).map((item) => (
          <button
            key={item}
            className={cn(
              'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              status === item ? 'border-primary bg-primary-50 text-primary' : 'border-line bg-surface text-ink-soft hover:bg-surface-sub',
            )}
            onClick={() => setStatus(item)}
          >
            {item === 'todos' ? 'Todas' : statusMeta[item].label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-3">
          {filtered.map((occurrence) => (
            <OccurrenceCard
              key={occurrence.id}
              occurrence={occurrence}
              selected={selected?.id === occurrence.id}
              onSelect={() => setSelectedId(occurrence.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="card p-8 text-center text-sm text-ink-muted">
              Nenhuma ocorrencia neste filtro.
            </div>
          )}
        </div>

        {selected && (
          <aside className="card overflow-hidden self-start">
            <div className="border-b border-line p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="mono text-xs font-semibold text-ink-muted">{selected.id}</p>
                  <h2 className="mt-1 text-lg font-semibold text-brand">{selected.title}</h2>
                </div>
                <Badge tone={statusMeta[selected.status].tone} dot>{statusMeta[selected.status].label}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{selected.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone={severityMeta[selected.severity].tone}>{severityMeta[selected.severity].label}</Badge>
                <Badge tone="neutral">{flowLabel[selected.sourceFlow]}</Badge>
                <Badge tone={selected.blocksFlow ? 'bad' : 'neutral'}>{selected.blocksFlow ? 'Bloqueia OS' : 'Nao bloqueia'}</Badge>
                <Badge tone={selected.blocksStock ? 'bad' : 'neutral'}>{selected.blocksStock ? 'Bloqueia saldo' : 'Saldo livre'}</Badge>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Objeto operacional</h3>
                <div className="mt-3 grid gap-2 text-sm">
                  <InfoRow label="Owner" value={ownerName(selected.ownerId)} />
                  <InfoRow label="Tarefa" value={selected.sourceTaskId} mono />
                  <InfoRow label="Documento" value={selected.sourceDocumentId ?? '-'} mono />
                  <InfoRow label="Local" value={selected.locationId ?? '-'} mono />
                  <InfoRow label="SKU/Unidade" value={selected.productId ?? selected.handlingUnitId ?? '-'} mono />
                  <InfoRow label="Responsavel" value={selected.assignedTo ?? 'Nao assumida'} />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Acoes do lider</h3>
                <div className="mt-3 grid gap-2">
                  <ActionButton
                    icon={<UserCheck className="h-4 w-4" />}
                    label="Assumir ocorrencia"
                    onClick={() => {
                      assumirOcorrencia(selected.id)
                      toast({ tipo: 'info', titulo: 'Ocorrencia assumida', texto: selected.id })
                    }}
                  />
                  <ActionButton
                    icon={<Camera className="h-4 w-4" />}
                    label="Pedir foto"
                    onClick={() => {
                      solicitarFotoOcorrencia(selected.id)
                      toast({ tipo: 'aviso', titulo: 'Foto solicitada', texto: selected.id })
                    }}
                  />
                  <ActionButton
                    icon={<RefreshCcw className="h-4 w-4" />}
                    label="Pedir recontagem"
                    onClick={() => {
                      pedirRecontagemOcorrencia(selected.id)
                      toast({ tipo: 'info', titulo: 'Recontagem criada', texto: selected.id })
                    }}
                  />
                  <ActionButton
                    icon={<ShieldAlert className="h-4 w-4" />}
                    label="Liberar com ressalva"
                    danger
                    onClick={() => openDecision('ressalva')}
                  />
                  <ActionButton
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="Encerrar ocorrencia"
                    onClick={() => openDecision('encerrar')}
                  />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Evidencias</h3>
                <div className="mt-3 space-y-2">
                  {selected.evidence.length > 0 ? (
                    selected.evidence.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface-sub px-3 py-2">
                        <Camera className="h-4 w-4 text-primary" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-brand">{item.label}</p>
                          <p className="text-xs text-ink-muted">{formatDate(item.capturedAt)} · {item.deviceId}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-dashed border-line p-3 text-sm text-ink-muted">
                      Sem evidencia anexada.
                    </p>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Historico</h3>
                <div className="mt-3 space-y-3">
                  {events.map((event) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm font-medium text-brand">{event.message}</p>
                        <p className="text-xs text-ink-muted">{event.eventType} · {formatDate(event.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        )}
      </div>

      <Modal
        open={!!decision}
        onClose={() => setDecision(null)}
        title={decision === 'ressalva' ? 'Liberar com ressalva' : 'Encerrar ocorrencia'}
        subtitle={selected?.id}
        footer={
          <>
            <button className="btn-outline" onClick={() => setDecision(null)}>Cancelar</button>
            <button className={cn('btn-primary', decision === 'ressalva' && 'bg-bad hover:bg-bad/90')} onClick={submitDecision}>
              Confirmar
            </button>
          </>
        }
      >
        <label className="label">Motivo obrigatorio</label>
        <textarea
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          className="input min-h-28 resize-none"
          placeholder="Explique a decisao do lider. Este texto entra na timeline auditavel."
        />
      </Modal>
    </div>
  )
}

function OccurrenceCard({
  occurrence,
  selected,
  onSelect,
}: {
  occurrence: OperationalOccurrence
  selected: boolean
  onSelect: () => void
}) {
  const overdue = Date.parse(occurrence.dueAt) < DEMO_NOW && occurrence.status !== 'RESOLVED'
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full rounded-lg border bg-surface p-4 text-left shadow-soft transition-colors',
        selected ? 'border-primary ring-2 ring-primary/10' : 'border-line hover:border-primary/40',
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono text-xs font-semibold text-ink-muted">{occurrence.id}</span>
            <Badge tone={severityMeta[occurrence.severity].tone}>{severityMeta[occurrence.severity].label}</Badge>
            <Badge tone={statusMeta[occurrence.status].tone} dot>{statusMeta[occurrence.status].label}</Badge>
          </div>
          <h3 className="mt-2 text-base font-semibold text-brand">{occurrence.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{occurrence.description}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 text-xs text-ink-muted md:items-end">
          <span className="inline-flex items-center gap-1.5">
            <Clock className={cn('h-3.5 w-3.5', overdue && 'text-bad')} />
            <span className={overdue ? 'font-semibold text-bad' : ''}>{formatDate(occurrence.dueAt)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {occurrence.sourceTaskId}
          </span>
        </div>
      </div>
    </button>
  )
}

function KpiCard({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        <Badge tone={tone}><AlertTriangle className="h-3 w-3" /></Badge>
      </div>
      <p className="mt-3 text-2xl font-semibold text-brand">{value}</p>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-sub px-3 py-2">
      <span className="text-ink-muted">{label}</span>
      <span className={cn('text-right font-medium text-brand', mono && 'mono text-xs')}>{value}</span>
    </div>
  )
}

function ActionButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
        danger ? 'border-bad/30 bg-bad-50 text-bad hover:bg-bad-50/80' : 'border-line bg-surface hover:bg-surface-sub text-ink-soft',
      )}
    >
      <span className="inline-flex items-center gap-2">{icon}{label}</span>
      {danger ? <Lock className="h-4 w-4" /> : null}
    </button>
  )
}

function severityRank(severity: OccurrenceSeverity) {
  return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[severity]
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
