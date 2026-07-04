import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PackageOpen,
  Tag,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  CalendarDays,
  Search,
  UserRound,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { ownerColor, ownerName } from '../lib/mock'
import {
  ORDEM_CLASSIFICACAO_DESTINO_ENDERECAMENTO,
  ORDEM_CONFERENCIA_DOCUMENTOS,
  resumoSkusPendentes,
  skusPendentesDoRecebimento,
  skusPendentesRecebimentos,
} from '../lib/skuControle'
import { Badge, Modal, PageHeader, ScanInput, SelectField, Tab, Tabs, type Tone } from '../components/ui'
import OrdemServicoPanel from '../components/OrdemServicoPanel'
import { cn } from '../lib/utils'
import type {
  ItemRecebimento,
  Ocorrencia,
  Recebimento as Rec,
  SkuPendenteRecebimento,
  StatusRecebimento,
} from '../lib/types'

const statusMeta: Record<StatusRecebimento, { l: string; tone: Tone }> = {
  agendado: { l: 'Agendado', tone: 'neutral' },
  'na-doca': { l: 'Na doca', tone: 'info' },
  'em-conferencia': { l: 'Em conferência', tone: 'primary' },
  divergencia: { l: 'Divergência', tone: 'bad' },
  concluido: { l: 'Concluído', tone: 'ok' },
}
const vertenteLabel: Record<string, string> = {
  ecommerce: 'E-commerce',
  industria: 'Indústria',
  '3pl': '3PL',
}
type TarefasState = ReturnType<typeof useStore.getState>['tarefas']
type MapaAgendaModo = 'mensal' | 'semanal' | 'diario'

const hojeRecebimentoIso = isoLocal(new Date())
const mesAgenda = {
  prefixo: '2026-06',
  label: 'Junho/2026',
  dias: 30,
}
const semanaAgendaInicio = '2026-06-22'
const diasSemanaLabel = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

function isoLocal(data: Date) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function addDias(iso: string, dias: number) {
  const data = new Date(`${iso}T00:00:00`)
  data.setDate(data.getDate() + dias)
  return isoLocal(data)
}

function dataCurta(iso: string) {
  return new Date(`${iso}T00:00:00`)
    .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
    .replace('.', '')
}

function dataLonga(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function totalUnidades(rec: Rec) {
  return rec.itens.reduce((acc, item) => acc + item.esperado, 0)
}

function labelViagens(total: number) {
  return `${total} ${total === 1 ? 'viagem' : 'viagens'}`
}

function tarefasDoDia(recebimentos: Rec[], tarefas: TarefasState) {
  const ids = new Set(recebimentos.map((rec) => rec.id))
  return tarefas.filter((tarefa) => tarefa.referenciaTipo === 'recebimento' && tarefa.referenciaId && ids.has(tarefa.referenciaId))
}

function resumoDia(recebimentos: Rec[], tarefas: TarefasState) {
  const os = tarefasDoDia(recebimentos, tarefas)
  return {
    recebimentos: recebimentos.length,
    os: os.length,
    osAbertas: os.filter((tarefa) => tarefa.status !== 'feito').length,
    osProblema: os.filter((tarefa) => tarefa.status === 'problema').length,
    semOperador: os.filter((tarefa) => !tarefa.operador && tarefa.status !== 'feito').length,
    emExecucao: os.filter((tarefa) => tarefa.status === 'fazendo').length,
    divergencias: recebimentos.filter((rec) => rec.status === 'divergencia').length,
    skus: recebimentos.reduce((acc, rec) => acc + rec.itens.length, 0),
    unidades: recebimentos.reduce((acc, rec) => acc + totalUnidades(rec), 0),
  }
}

function classeMapaDia(recebimentos: Rec[], tarefas: TarefasState) {
  const resumo = resumoDia(recebimentos, tarefas)
  if (!resumo.recebimentos) return 'border-line bg-surface-sub hover:bg-surface'
  if (resumo.divergencias || resumo.osProblema) return 'border-bad/40 bg-bad-50 hover:bg-bad-50/80'
  if (resumo.semOperador) return 'border-warn/40 bg-warn-50 hover:bg-warn-50/80'
  if (resumo.emExecucao || recebimentos.some((rec) => rec.status === 'na-doca' || rec.status === 'em-conferencia')) return 'border-info/40 bg-info-50 hover:bg-info-50/80'
  if (resumo.os >= 3 || resumo.unidades >= 500) return 'border-accent/40 bg-accent-50 hover:bg-accent-50/80'
  return 'border-primary/25 bg-primary-50/60 hover:bg-primary-50'
}

export default function Recebimento() {
  const { recebimentos, tarefas, skusControle, conferirItem, registrarOcorrencia, concluirRecebimento, toast } =
    useStore()
  const [aba, setAba] = useState('todos')
  const [aberto, setAberto] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [operadorFiltro, setOperadorFiltro] = useState('todos')
  const [execucaoFiltro, setExecucaoFiltro] = useState('todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const operadores = useMemo(
    () =>
      [...new Set(tarefas.filter((t) => t.tipo === 'recebimento' || t.tipo === 'divergencia').map((t) => t.operador).filter(Boolean) as string[])],
    [tarefas],
  )
  const pendenciasSku = useMemo(
    () => skusPendentesRecebimentos(recebimentos, skusControle),
    [recebimentos, skusControle],
  )
  const pendenciasPorRecebimento = useMemo(() => {
    const mapa = new Map<string, SkuPendenteRecebimento[]>()
    pendenciasSku.forEach((pendencia) => {
      mapa.set(pendencia.recebimentoId, [...(mapa.get(pendencia.recebimentoId) ?? []), pendencia])
    })
    return mapa
  }, [pendenciasSku])

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return recebimentos.filter((r) => {
      const pendenciasRec = pendenciasPorRecebimento.get(r.id) ?? []
      if (aba !== 'todos' && r.status !== aba) return false
      if (dataInicio && (r.data ?? '') < dataInicio) return false
      if (dataFim && (r.data ?? '') > dataFim) return false

      const os = tarefas.filter((t) => t.referenciaTipo === 'recebimento' && t.referenciaId === r.id)
      if (operadorFiltro !== 'todos' && !os.some((t) => t.operador === operadorFiltro)) return false
      if (execucaoFiltro === 'sem-os' && os.length > 0) return false
      if (execucaoFiltro === 'sem-operador' && !os.some((t) => !t.operador)) return false
      if (execucaoFiltro === 'em-execucao' && !os.some((t) => t.status === 'fazendo')) return false
      if (execucaoFiltro === 'sku-pendente' && pendenciasRec.length === 0) return false
      if (execucaoFiltro === 'com-problema' && !os.some((t) => t.status === 'problema') && r.status !== 'divergencia' && pendenciasRec.length === 0) return false
      if (q) {
        const alvo = [
          r.id,
          r.doca,
          r.fornecedor,
          r.documento,
          ownerName(r.ownerId),
          r.responsavel ?? '',
          r.placa ?? '',
          ...r.itens.map((item) => `${item.skuCodigo} ${item.descricao}`),
        ].join(' ').toLowerCase()
        if (!alvo.includes(q)) return false
      }
      return true
    })
  }, [aba, busca, dataFim, dataInicio, execucaoFiltro, operadorFiltro, pendenciasPorRecebimento, recebimentos, tarefas])

  const rec = recebimentos.find((r) => r.id === aberto) ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recebimento (Inbound)"
        subtitle="Agendamento → Doca → Conferência cega → Tratamento de divergência → Etiquetagem"
      >
        <Badge tone="neutral">
          {recebimentos.filter((r) => (r.data ?? '') >= '2026-06-21' && r.status === 'agendado').length} previsões futuras
        </Badge>
        <Badge tone="info" dot>
          {recebimentos.filter((r) => r.status !== 'concluido').length} em andamento
        </Badge>
        <Badge tone={pendenciasSku.length ? 'bad' : 'neutral'} dot={pendenciasSku.length > 0}>
          {pendenciasSku.length} SKU sem cadastro
        </Badge>
      </PageHeader>

      {/* docas resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { l: 'Agendados', v: recebimentos.filter((r) => r.status === 'agendado').length, tone: 'neutral' },
          { l: 'Na doca', v: recebimentos.filter((r) => r.status === 'na-doca').length, tone: 'info' },
          { l: 'Em conferência', v: recebimentos.filter((r) => r.status === 'em-conferencia').length, tone: 'primary' },
          { l: 'Divergências', v: recebimentos.filter((r) => r.status === 'divergencia').length, tone: 'bad' },
          { l: 'Travados por SKU', v: pendenciasSku.length, tone: pendenciasSku.length ? 'bad' : 'neutral' },
        ].map((c) => (
          <div key={c.l} className="card p-4">
            <div className="text-2xl font-semibold text-brand mono">{c.v}</div>
            <div className="text-xs text-ink-muted mt-0.5">{c.l}</div>
          </div>
        ))}
      </div>

      <AgendaRecebimento recebimentos={recebimentos} />

      <div className="card overflow-hidden">
        <div className="px-4 pt-1">
          <Tabs value={aba} onChange={setAba}>
            <Tab id="todos">Todos</Tab>
            <Tab id="na-doca">Na doca</Tab>
            <Tab id="em-conferencia">Em conferência</Tab>
            <Tab id="divergencia">Divergências</Tab>
            <Tab id="concluido">Concluídos</Tab>
          </Tabs>
        </div>
        <div className="p-4 border-b border-line bg-surface-sub/70">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
              <Search className="h-4 w-4 text-ink-muted" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar recebimento, NF-e, fornecedor, SKU, placa..."
                className="bg-transparent outline-none flex-1 text-sm"
              />
            </div>
            <SelectField
              value={operadorFiltro}
              onChange={setOperadorFiltro}
              className="py-2"
              options={[
                { value: 'todos', label: 'Todos os colaboradores' },
                ...operadores.map((operador) => ({ value: operador, label: operador })),
              ]}
            />
            <SelectField
              value={execucaoFiltro}
              onChange={setExecucaoFiltro}
              className="py-2"
              options={[
                { value: 'todos', label: 'Todas as execuções' },
                { value: 'em-execucao', label: 'Em execução' },
                { value: 'sem-operador', label: 'Sem operador' },
                { value: 'sem-os', label: 'Sem OS vinculada' },
                { value: 'com-problema', label: 'Com divergência/problema' },
                { value: 'sku-pendente', label: 'SKU sem cadastro' },
              ]}
            />
            <input type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} className="input py-2" />
            <input type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} className="input py-2" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <Badge tone="neutral">{lista.length} registros filtrados</Badge>
            {(busca || operadorFiltro !== 'todos' || execucaoFiltro !== 'todos' || dataInicio || dataFim) && (
              <button
                className="btn-ghost py-1.5 px-2 text-xs"
                onClick={() => {
                  setBusca('')
                  setOperadorFiltro('todos')
                  setExecucaoFiltro('todos')
                  setDataInicio('')
                  setDataFim('')
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Recebimento</th>
                <th className="th">Doca</th>
                <th className="th">Fornecedor</th>
                <th className="th">Documento</th>
                <th className="th">Cliente / Owner</th>
                <th className="th">ETA</th>
                <th className="th">Execução</th>
                <th className="th">Status</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => {
                const conf = r.itens.filter((i) => i.conferido).length
                const pendenciasRec = pendenciasPorRecebimento.get(r.id) ?? []
                return (
                  <tr key={r.id} className={cn('row-hover', pendenciasRec.length && 'bg-bad-50/60')}>
                    <td className="td font-medium text-brand mono">{r.id}</td>
                    <td className="td">{r.doca}</td>
                    <td className="td">{r.fornecedor}</td>
                    <td className="td">
                      <span className="mono text-xs">{r.documento}</span>
                      <Badge tone="neutral" className="ml-2">{r.tipoDoc}</Badge>
                    </td>
                    <td className="td">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: ownerColor(r.ownerId) }} />
                        {ownerName(r.ownerId)}
                      </span>
                    </td>
                    <td className="td">
                      <p className="mono">{r.eta}</p>
                      <p className="text-[11px] text-ink-muted">{r.data ? new Date(`${r.data}T00:00:00`).toLocaleDateString('pt-BR') : 'sem data'}</p>
                    </td>
                    <td className="td">
                      {pendenciasRec.length ? (
                        <div className="space-y-1.5">
                          <Badge tone="bad">Travada na conferência de documentos</Badge>
                          <p className="text-[11px] text-bad">
                            {resumoSkusPendentes(pendenciasRec)}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-ink-soft">
                          <UserRound className="h-3.5 w-3.5 text-ink-muted" />
                          {r.responsavel ?? 'Sem responsável'}
                        </div>
                      )}
                    </td>
                    <td className="td">
                      <Badge tone={statusMeta[r.status].tone}>
                        {statusMeta[r.status].l}
                        {r.status === 'em-conferencia' && ` ${conf}/${r.itens.length}`}
                      </Badge>
                    </td>
                    <td className="td text-right">
                      <button onClick={() => setAberto(r.id)} className="btn-outline py-1.5 px-3 text-xs">
                        {pendenciasRec.length ? 'Ver bloqueio' : r.status === 'concluido' ? 'Ver' : 'Conferir'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {rec && (
        <ConferenciaModal
          rec={rec}
          pendenciasSku={pendenciasPorRecebimento.get(rec.id) ?? []}
          onClose={() => setAberto(null)}
          onConferir={(sku, q) => {
            conferirItem(rec.id, sku, q)
            toast({ tipo: 'sucesso', titulo: 'Item conferido', texto: `${sku} · ${q} un` })
          }}
          onOcorrencia={(sku, oc) => {
            registrarOcorrencia(rec.id, sku, oc)
            toast({ tipo: 'aviso', titulo: 'Ocorrência registrada', texto: `${oc.tipo} em ${sku}` })
          }}
          onConcluir={() => {
            concluirRecebimento(rec.id)
            toast({ tipo: 'sucesso', titulo: 'Recebimento concluído', texto: `${rec.id} disponível p/ putaway` })
            setAberto(null)
          }}
        />
      )}

      <OrdemServicoPanel
        title="OS de recebimento e divergências"
        subtitle="Atribua conferência cega, doca, etiquetagem e tratativas para os operadores no app."
        tipos={['recebimento', 'divergencia']}
      />
    </div>
  )
}

function AgendaRecebimento({ recebimentos }: { recebimentos: Rec[] }) {
  const { tarefas } = useStore()
  const [modoMapa, setModoMapa] = useState<MapaAgendaModo>('mensal')
  const [statusMapa, setStatusMapa] = useState<StatusRecebimento | 'todos'>('todos')
  const [dataDiaria, setDataDiaria] = useState(hojeRecebimentoIso)
  const [dataAberta, setDataAberta] = useState<string | null>(null)
  const [agendaAberta, setAgendaAberta] = useState<Rec | null>(null)

  const recebimentosOrdenados = useMemo(
    () =>
      [...recebimentos].sort((a, b) =>
        `${a.data ?? '9999-12-31'} ${a.eta}`.localeCompare(`${b.data ?? '9999-12-31'} ${b.eta}`),
      ),
    [recebimentos],
  )
  const recebimentosMapa = useMemo(
    () => recebimentosOrdenados.filter((rec) => statusMapa === 'todos' || rec.status === statusMapa),
    [recebimentosOrdenados, statusMapa],
  )
  const datasMes = Array.from({ length: mesAgenda.dias }, (_, index) => ({
    iso: `${mesAgenda.prefixo}-${String(index + 1).padStart(2, '0')}`,
    dia: index + 1,
  }))
  const datasSemana = Array.from({ length: 6 }, (_, index) => addDias(semanaAgendaInicio, index))
  const recebimentosFuturos = recebimentosOrdenados.filter((rec) => (rec.data ?? '') >= hojeRecebimentoIso && rec.status !== 'concluido')
  const recebimentosDoDia = (iso: string) => recebimentosMapa.filter((rec) => rec.data === iso)
  const resumoGeral = resumoDia(recebimentosMapa.filter((rec) => rec.data?.startsWith(mesAgenda.prefixo)), tarefas)

  return (
    <>
      <div className="card p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-2">
            <CalendarDays className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-brand">Mapa operacional de recebimento</h2>
              <p className="text-xs text-ink-muted mt-0.5">Densidade por dia, OS abertas, divergências e responsáveis.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">{mesAgenda.label}</Badge>
            <Badge tone="neutral">{recebimentosFuturos.length} previsões futuras</Badge>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[auto_220px_180px_1fr] lg:items-center">
          <div className="inline-flex rounded-xl border border-line bg-surface-sub p-1">
            <ModoMapaButton ativo={modoMapa === 'mensal'} onClick={() => setModoMapa('mensal')}>Mensal</ModoMapaButton>
            <ModoMapaButton ativo={modoMapa === 'semanal'} onClick={() => setModoMapa('semanal')}>Semanal</ModoMapaButton>
            <ModoMapaButton ativo={modoMapa === 'diario'} onClick={() => setModoMapa('diario')}>Diário</ModoMapaButton>
          </div>
          <SelectField
            value={statusMapa}
            onChange={(value) => setStatusMapa(value as StatusRecebimento | 'todos')}
            className="py-2"
            options={[
              { value: 'todos', label: 'Todos os status' },
              ...Object.entries(statusMeta).map(([status, meta]) => ({ value: status, label: meta.l })),
            ]}
          />
          <input
            type="date"
            value={dataDiaria}
            onChange={(event) => setDataDiaria(event.target.value || hojeRecebimentoIso)}
            className={cn('input py-2', modoMapa !== 'diario' && 'lg:opacity-60')}
          />
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-muted lg:justify-end">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary/60" /> agendado</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-info" /> em execução</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-warn" /> sem operador</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-bad" /> divergência</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <MapaKpi label="Recebimentos" value={resumoGeral.recebimentos} tone="primary" />
          <MapaKpi label="OS abertas" value={resumoGeral.osAbertas} tone={resumoGeral.osProblema ? 'bad' : 'info'} />
          <MapaKpi label="Sem operador" value={resumoGeral.semOperador} tone={resumoGeral.semOperador ? 'warn' : 'neutral'} />
          <MapaKpi label="Unidades previstas" value={resumoGeral.unidades.toLocaleString('pt-BR')} tone="accent" />
        </div>

        {modoMapa === 'mensal' && (
          <div className="mt-4">
            <div className="hidden xl:grid grid-cols-7 gap-2 mb-2">
              {diasSemanaLabel.map((dia, index) => (
                <div key={`${dia}-${index}`} className="text-center text-[11px] font-medium text-ink-muted">{dia}</div>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
              {datasMes.map(({ iso, dia }) => (
                <MapaDiaTile
                  key={iso}
                  iso={iso}
                  label={`${dia}`}
                  modo="mensal"
                  recebimentos={recebimentosDoDia(iso)}
                  tarefas={tarefas}
                  isHoje={iso === hojeRecebimentoIso}
                  onAbrirDia={setDataAberta}
                  onAbrirRec={setAgendaAberta}
                />
              ))}
            </div>
          </div>
        )}

        {modoMapa === 'semanal' && (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {datasSemana.map((iso) => (
              <MapaDiaTile
                key={iso}
                iso={iso}
                label={dataCurta(iso)}
                modo="semanal"
                recebimentos={recebimentosDoDia(iso)}
                tarefas={tarefas}
                isHoje={iso === hojeRecebimentoIso}
                onAbrirDia={setDataAberta}
                onAbrirRec={setAgendaAberta}
              />
            ))}
          </div>
        )}

        {modoMapa === 'diario' && (
          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)]">
            <MapaDiaTile
              iso={dataDiaria}
              label={dataLonga(dataDiaria)}
              modo="diario"
              recebimentos={recebimentosDoDia(dataDiaria)}
              tarefas={tarefas}
              isHoje={dataDiaria === hojeRecebimentoIso}
              onAbrirDia={setDataAberta}
              onAbrirRec={setAgendaAberta}
            />
            <PainelOsDia
              iso={dataDiaria}
              recebimentos={recebimentosDoDia(dataDiaria)}
              tarefas={tarefas}
              onAbrirRec={setAgendaAberta}
            />
          </div>
        )}
      </div>

      {agendaAberta && (
        <AgendaDetalheModal
          rec={agendaAberta}
          tarefas={tarefas.filter((t) => t.referenciaTipo === 'recebimento' && t.referenciaId === agendaAberta.id)}
          onClose={() => setAgendaAberta(null)}
        />
      )}

      {dataAberta && (
        <DiaAgendaModal
          iso={dataAberta}
          recebimentos={recebimentosDoDia(dataAberta)}
          tarefas={tarefas}
          onClose={() => setDataAberta(null)}
          onAbrir={(rec) => {
            setDataAberta(null)
            setAgendaAberta(rec)
          }}
        />
      )}
    </>
  )
}

function ModoMapaButton({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
        ativo ? 'bg-surface text-primary shadow-sm' : 'text-ink-muted hover:text-ink-soft',
      )}
    >
      {children}
    </button>
  )
}

function MapaKpi({ label, value, tone }: { label: string; value: number | string; tone: Tone }) {
  const toneClass: Record<Tone, string> = {
    ok: 'text-ok bg-ok-50',
    warn: 'text-warn bg-warn-50',
    bad: 'text-bad bg-bad-50',
    info: 'text-info bg-info-50',
    neutral: 'text-ink-muted bg-surface-sub',
    primary: 'text-primary bg-primary-50',
    accent: 'text-accent bg-accent-50',
  }
  return (
    <div className={cn('rounded-xl border border-line px-3 py-2', toneClass[tone])}>
      <p className="mono text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-ink-muted mt-0.5">{label}</p>
    </div>
  )
}

function MapaDiaTile({
  iso,
  label,
  modo,
  recebimentos,
  tarefas,
  isHoje,
  onAbrirDia,
  onAbrirRec,
}: {
  iso: string
  label: string
  modo: MapaAgendaModo
  recebimentos: Rec[]
  tarefas: TarefasState
  isHoje: boolean
  onAbrirDia: (iso: string) => void
  onAbrirRec: (rec: Rec) => void
}) {
  const resumo = resumoDia(recebimentos, tarefas)
  const osDia = tarefasDoDia(recebimentos, tarefas)
  const limiteRecebimentos = modo === 'mensal' ? 3 : recebimentos.length
  const limiteOs = modo === 'mensal' ? 1 : modo === 'semanal' ? 3 : 6
  const recebimentosVisiveis = recebimentos.slice(0, limiteRecebimentos)
  const listaComScroll = modo !== 'mensal' && recebimentos.length > 0
  const viagensLabel = labelViagens(resumo.recebimentos)

  return (
    <div className={cn(
      'rounded-xl border p-2.5 transition-colors flex flex-col',
      modo === 'mensal' ? 'min-h-[190px]' : modo === 'semanal' ? 'min-h-[320px]' : 'min-h-[460px]',
      classeMapaDia(recebimentos, tarefas),
      isHoje && 'ring-2 ring-primary ring-offset-2 ring-offset-surface',
    )}>
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => onAbrirDia(iso)}
          aria-label={`${label}${isHoje ? ', hoje' : ''}: ${viagensLabel}`}
        >
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={cn('font-semibold text-brand', modo === 'mensal' ? 'mono text-sm' : 'text-sm capitalize')}>{label}</span>
            {isHoje && (
              <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Hoje
              </span>
            )}
          </span>
          <p className="mt-0.5 text-[11px] font-semibold text-primary">{viagensLabel}</p>
          <p className="mt-0.5 text-[11px] text-ink-muted">{resumo.os} OS do dia</p>
        </button>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1 text-center">
        <InfoPill label="SKU" value={resumo.skus} />
        <InfoPill label="Un" value={resumo.unidades} />
        <InfoPill label="S/op" value={resumo.semOperador} alert={resumo.semOperador > 0} />
      </div>
      <HeatTicks recebimentos={recebimentos} tarefas={tarefas} />

      <div
        className={cn(
          'mt-2 flex-1 min-h-0 space-y-1.5',
          listaComScroll && 'overflow-y-auto pr-1',
          modo === 'semanal' && 'max-h-[220px]',
          modo === 'diario' && 'max-h-[350px]',
        )}
      >
        {recebimentosVisiveis.map((rec) => (
          <RecAgendaPreview
            key={rec.id}
            rec={rec}
            compact={modo === 'mensal'}
            onAbrir={() => onAbrirRec(rec)}
          />
        ))}
        {recebimentos.length > limiteRecebimentos && (
          <button type="button" className="w-full rounded-lg border border-dashed border-line bg-surface/80 px-2 py-1.5 text-xs font-semibold text-primary" onClick={() => onAbrirDia(iso)}>
            +{labelViagens(recebimentos.length - limiteRecebimentos)}
          </button>
        )}
        {!recebimentos.length && (
          <button type="button" className="w-full rounded-lg border border-dashed border-line bg-surface/60 px-2 py-5 text-center text-xs text-ink-muted" onClick={() => onAbrirDia(iso)}>
            Sem previsão
          </button>
        )}
      </div>

      <OsPreviewDia tarefas={osDia} limite={limiteOs} />

      <div className="mt-auto pt-2">
        <button type="button" className="btn-outline py-1.5 px-2 text-[11px] whitespace-nowrap" onClick={() => onAbrirDia(iso)}>
          Ver dia
        </button>
      </div>
    </div>
  )
}

function InfoPill({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className={cn('rounded-lg border px-1.5 py-1', alert ? 'border-warn/30 bg-warn-50 text-warn' : 'border-line bg-surface/75 text-ink-soft')}>
      <p className="mono text-[11px] font-semibold leading-none">{value.toLocaleString('pt-BR')}</p>
      <p className="mt-0.5 text-[9px] uppercase tracking-wide text-ink-muted">{label}</p>
    </div>
  )
}

function HeatTicks({ recebimentos, tarefas }: { recebimentos: Rec[]; tarefas: TarefasState }) {
  const resumo = resumoDia(recebimentos, tarefas)
  const nivel = resumo.recebimentos ? Math.min(5, 1 + Math.ceil((resumo.recebimentos + resumo.os + resumo.skus / 2) / 2)) : 0
  const ativo = resumo.divergencias || resumo.osProblema
    ? 'bg-bad'
    : resumo.semOperador
      ? 'bg-warn'
      : resumo.emExecucao
        ? 'bg-info'
        : resumo.os >= 3 || resumo.unidades >= 500
          ? 'bg-accent'
          : 'bg-primary'
  return (
    <div className="mt-2 flex items-center gap-1" aria-label="Densidade operacional do dia">
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={cn('h-1.5 flex-1 rounded-full', index < nivel ? ativo : 'bg-slate-200')} />
      ))}
    </div>
  )
}

function PreviewCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={cn('mt-0.5 truncate font-semibold text-brand', mono && 'mono')}>{value}</p>
    </div>
  )
}

function RecAgendaPreview({ rec, compact, onAbrir }: { rec: Rec; compact: boolean; onAbrir: () => void }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={`Ver detalhes de ${rec.fornecedor} em ${rec.doca} as ${rec.eta}`}
      className={cn(
        'w-full rounded-lg border border-line bg-surface/90 p-2 text-left transition-colors hover:border-primary/40 hover:bg-surface',
        compact ? 'space-y-2' : 'grid gap-2 sm:grid-cols-[4.5rem_5.5rem_minmax(0,1fr)_auto] sm:items-center',
      )}
      style={{ borderLeftColor: ownerColor(rec.ownerId), borderLeftWidth: 3 }}
    >
      <div className={cn(compact ? 'grid grid-cols-[4rem_minmax(0,1fr)] gap-2' : 'contents')}>
        <PreviewCell label="Horário" value={rec.eta} mono />
        <PreviewCell label="Doca" value={rec.doca} mono />
        <div className={compact ? 'col-span-2' : 'min-w-0'}>
          <PreviewCell label="Embarcador" value={rec.fornecedor} />
        </div>
      </div>
      <span className={cn('inline-flex min-h-9 items-center justify-center rounded-lg border border-primary/20 bg-primary-50 px-3 text-xs font-semibold text-primary', compact && 'w-full')}>
        Detalhes
      </span>
    </button>
  )
}

function OsPreviewDia({ tarefas, limite }: { tarefas: TarefasState; limite: number }) {
  if (!tarefas.length) return null
  const dotClass = {
    'a-fazer': 'bg-slate-400',
    fazendo: 'bg-info',
    feito: 'bg-ok',
    problema: 'bg-bad',
  }
  return (
    <div className="mt-2 rounded-lg border border-line bg-surface/75 px-2 py-1.5 space-y-1">
      {tarefas.slice(0, limite).map((tarefa) => (
        <div key={tarefa.id} className="flex items-center gap-1.5 text-[10px] text-ink-soft">
          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotClass[tarefa.status])} />
          <span className="mono shrink-0">{tarefa.id.replace('OS-', '')}</span>
          <span className="truncate">{tarefa.etapa ?? tarefa.descricao}</span>
        </div>
      ))}
      {tarefas.length > limite && (
        <button type="button" className="text-[10px] font-semibold text-primary">
          +{tarefas.length - limite} OS
        </button>
      )}
    </div>
  )
}

function PainelOsDia({
  iso,
  recebimentos,
  tarefas,
  onAbrirRec,
}: {
  iso: string
  recebimentos: Rec[]
  tarefas: TarefasState
  onAbrirRec: (rec: Rec) => void
}) {
  const osDia = tarefasDoDia(recebimentos, tarefas)
  return (
    <div className="rounded-xl border border-line bg-surface-sub p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-brand">OS do dia</p>
          <p className="text-xs text-ink-muted capitalize">{dataLonga(iso)}</p>
        </div>
        <Badge tone={osDia.length ? 'info' : 'neutral'}>{osDia.length} OS</Badge>
      </div>
      <div className="mt-3 space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {osDia.map((tarefa) => {
          const rec = recebimentos.find((item) => item.id === tarefa.referenciaId) ?? null
          return (
            <div key={tarefa.id} className="rounded-lg border border-line bg-surface p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="mono text-xs font-semibold text-brand">{tarefa.id}</span>
                <Badge tone={tarefa.status === 'problema' ? 'bad' : tarefa.status === 'feito' ? 'ok' : tarefa.status === 'fazendo' ? 'primary' : 'neutral'}>
                  {tarefa.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm font-medium text-ink-soft line-clamp-2">{tarefa.descricao}</p>
              <p className="mt-1 text-[11px] text-ink-muted">{tarefa.operador ?? 'Sem operador'} · SLA {tarefa.sla ?? rec?.eta ?? '—'}</p>
              {rec && (
                <button className="btn-outline mt-2 py-1.5 px-2 text-[11px]" onClick={() => onAbrirRec(rec)}>
                  Detalhes do recebimento
                </button>
              )}
            </div>
          )
        })}
        {!osDia.length && (
          <div className="rounded-lg border border-dashed border-line bg-surface px-3 py-8 text-center text-xs text-ink-muted">
            Nenhuma OS criada para as viagens deste dia.
          </div>
        )}
      </div>
    </div>
  )
}

function AgendaDetalheModal({
  rec,
  tarefas,
  onClose,
}: {
  rec: Rec
  tarefas: ReturnType<typeof useStore.getState>['tarefas']
  onClose: () => void
}) {
  const skusControle = useStore((s) => s.skusControle)
  const pendenciasSku = useMemo(
    () => skusPendentesDoRecebimento(rec, skusControle),
    [rec, skusControle],
  )
  const bloqueadoPorSku = pendenciasSku.length > 0
  const ordemExecucaoAtual = rec.ordemExecucaoAtual ?? 0
  const ordemExecucaoRecebimento = [
    { etapa: 'Encostar veículo' },
    { etapa: 'Conferência geral', detalhe: 'Checklist no WMS Mobile · depende de outro responsável' },
    { etapa: 'Conferência de documentos' },
    { etapa: 'Geração de etiquetas' },
    { etapa: 'Conferência física' },
    { etapa: 'Montagem de pallets' },
    { etapa: 'Classificação de destino + endereçamento' },
  ]

  return (
    <Modal
      open
      onClose={onClose}
      title={`Agenda ${rec.id}`}
      subtitle={`${rec.fornecedor} · ${rec.doca} · ${rec.documento}`}
      size="lg"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Fechar</button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-[1fr_0.9fr]">
        <div className="rounded-xl border border-line divide-y divide-line">
          {[
            ['Recebimento', rec.id],
            ['Embarcador', rec.fornecedor],
            ['Documento', `${rec.documento} · ${rec.tipoDoc}`],
            ['Cliente / owner', ownerName(rec.ownerId)],
            ['Doca', rec.doca],
            ['Responsável', rec.responsavel ?? 'Sem responsável'],
            ['Data e janela', `${rec.data ? new Date(`${rec.data}T00:00:00`).toLocaleDateString('pt-BR') : 'sem data'} · ${rec.janela ?? rec.eta}`],
            ['Placa / veículo', rec.placa ?? 'Não informada'],
            ['Ordem na doca', `${rec.ordemDoca ?? '—'}`],
            ['Ordem de execução', rec.ordemExecucaoAtual ? `${rec.ordemExecucaoAtual}/${ORDEM_CLASSIFICACAO_DESTINO_ENDERECAMENTO}` : '—'],
            ['Itens / unidades', `${rec.itens.length} SKUs · ${totalUnidades(rec).toLocaleString('pt-BR')} un`],
            ['Status', statusMeta[rec.status].l],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <span className="text-ink-muted">{k}</span>
              <span className="font-medium text-brand text-right">{v}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-line p-3">
          <p className="text-sm font-semibold text-brand">Ordem de execução</p>
          <div className="mt-3 space-y-2">
            {ordemExecucaoRecebimento.map((item, index) => {
              const parte = index + 1
              const parteBloqueada = bloqueadoPorSku && parte === ORDEM_CONFERENCIA_DOCUMENTOS
              const partePosterior = bloqueadoPorSku && parte > ORDEM_CONFERENCIA_DOCUMENTOS
              const parteAtual = parte === ordemExecucaoAtual
              const parteConcluida = parte < ordemExecucaoAtual
              return (
                <div
                  key={item.etapa}
                  className={cn(
                    'flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm',
                    parteBloqueada && 'border border-bad/30 bg-bad-50 text-bad',
                    parteAtual && !parteBloqueada && 'border border-primary/30 bg-primary-50',
                    partePosterior && 'opacity-45',
                    !parteBloqueada && !parteAtual && (parteConcluida ? 'text-brand' : 'text-ink-soft'),
                  )}
                >
                  <span
                    className={cn(
                      'h-6 w-6 rounded-lg grid place-items-center text-xs font-semibold',
                      parteBloqueada
                        ? 'bg-bad text-white'
                        : parteAtual
                          ? 'bg-primary text-white'
                          : 'bg-primary-50 text-primary',
                    )}
                  >
                    {parte}
                  </span>
                  <span>
                    <span className="font-medium text-ink-soft">{item.etapa}</span>
                    {item.detalhe && <span className="mt-0.5 block text-xs text-ink-muted">{item.detalhe}</span>}
                    {parteBloqueada && (
                      <span className="mt-0.5 block text-xs font-medium text-bad">
                        {resumoSkusPendentes(pendenciasSku)}. Configure antes de continuar.
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        {bloqueadoPorSku && (
          <div className="md:col-span-2 rounded-xl border border-bad/30 bg-bad-50 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-bad">Recebimento travado por SKU sem cadastro</p>
                <p className="mt-1 text-xs text-bad">
                  A viagem para em Conferência de documentos até configurar {pendenciasSku.map((item) => item.skuCodigo).join(', ')}.
                </p>
              </div>
              <Link to="/controle-sku" className="btn-primary bg-bad hover:bg-red-700">
                Configurar SKU
              </Link>
            </div>
          </div>
        )}
        <div className="md:col-span-2 rounded-xl border border-line overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">SKU</th>
                <th className="th">Produto</th>
                <th className="th">Previsto</th>
                <th className="th">Lote</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {rec.itens.map((item) => (
                <tr key={item.skuCodigo} className={cn('row-hover', pendenciasSku.some((pendencia) => pendencia.skuCodigo === item.skuCodigo) && 'bg-bad-50/70')}>
                  <td className="td mono font-medium text-brand">{item.skuCodigo}</td>
                  <td className="td">{item.descricao}</td>
                  <td className="td mono">{item.esperado.toLocaleString('pt-BR')}</td>
                  <td className="td mono">{item.lote ?? '—'}</td>
                  <td className="td">
                    <Badge tone={pendenciasSku.some((pendencia) => pendencia.skuCodigo === item.skuCodigo) ? 'bad' : item.ocorrencia ? 'bad' : item.conferido ? 'ok' : 'neutral'}>
                      {pendenciasSku.some((pendencia) => pendencia.skuCodigo === item.skuCodigo)
                        ? 'SKU sem cadastro'
                        : item.ocorrencia?.tipo ?? (item.conferido ? 'Conferido' : 'Pendente')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:col-span-2 rounded-xl border border-line overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">OS</th>
                <th className="th">Descrição</th>
                <th className="th">Usuário</th>
                <th className="th">Horário</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {tarefas.map((tarefa) => (
                <tr key={tarefa.id} className="row-hover">
                  <td className="td mono font-medium text-brand">{tarefa.id}</td>
                  <td className="td">{tarefa.descricao}</td>
                  <td className="td">{tarefa.operador ?? 'Sem operador'}</td>
                  <td className="td mono">{tarefa.sla ?? rec.eta}</td>
                  <td className="td"><Badge tone={tarefa.status === 'problema' ? 'bad' : tarefa.status === 'feito' ? 'ok' : tarefa.status === 'fazendo' ? 'primary' : 'neutral'}>{tarefa.status}</Badge></td>
                </tr>
              ))}
              {tarefas.length === 0 && (
                <tr><td className="td text-center text-ink-muted" colSpan={5}>Sem OS criada para este agendamento.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}

function DiaAgendaModal({
  iso,
  recebimentos,
  tarefas,
  onClose,
  onAbrir,
}: {
  iso: string
  recebimentos: Rec[]
  tarefas: TarefasState
  onClose: () => void
  onAbrir: (rec: Rec) => void
}) {
  const resumo = resumoDia(recebimentos, tarefas)
  return (
    <Modal open onClose={onClose} title={`Mapa de recebimento · ${dataCurta(iso)}`} subtitle="Fila do dia com preview operacional por viagem" size="lg">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <MapaKpi label="Recebimentos" value={resumo.recebimentos} tone="primary" />
          <MapaKpi label="OS abertas" value={resumo.osAbertas} tone={resumo.osProblema ? 'bad' : 'info'} />
          <MapaKpi label="Sem operador" value={resumo.semOperador} tone={resumo.semOperador ? 'warn' : 'neutral'} />
          <MapaKpi label="Unidades" value={resumo.unidades.toLocaleString('pt-BR')} tone="accent" />
        </div>
        {recebimentos.length === 0 && (
          <div className="rounded-xl border border-dashed border-line bg-surface-sub px-4 py-10 text-center">
            <p className="text-sm font-medium text-brand">Sem recebimentos agendados neste dia.</p>
            <p className="text-xs text-ink-muted mt-1">Use o construtor de OS quando houver previsão futura de chegada.</p>
          </div>
        )}
        {recebimentos.length > 0 && (
          <div className="rounded-xl border border-line bg-surface-sub p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-brand">{labelViagens(recebimentos.length)} no dia</p>
                <p className="text-xs text-ink-muted capitalize">{dataLonga(iso)}</p>
              </div>
              <Badge tone={recebimentos.length >= 5 ? 'primary' : 'neutral'}>{labelViagens(recebimentos.length)}</Badge>
            </div>
            <div className="mt-3 max-h-[58vh] space-y-2 overflow-y-auto pr-1">
              {recebimentos.map((rec) => (
                <RecAgendaPreview
                  key={rec.id}
                  rec={rec}
                  compact={false}
                  onAbrir={() => onAbrir(rec)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function ConferenciaModal({
  rec,
  pendenciasSku,
  onClose,
  onConferir,
  onOcorrencia,
  onConcluir,
}: {
  rec: Rec
  pendenciasSku: SkuPendenteRecebimento[]
  onClose: () => void
  onConferir: (sku: string, q: number) => void
  onOcorrencia: (sku: string, oc: Ocorrencia) => void
  onConcluir: () => void
}) {
  const [cega, setCega] = useState(true)
  const [ativo, setAtivo] = useState<ItemRecebimento | null>(null)
  const [oco, setOco] = useState<ItemRecebimento | null>(null)
  const todosConferidos = rec.itens.every((i) => i.conferido)
  const bloqueadoPorSku = pendenciasSku.length > 0
  const skusPendentes = new Set(pendenciasSku.map((pendencia) => pendencia.skuCodigo))

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="lg"
        title={`Conferência · ${rec.id}`}
        subtitle={`${rec.fornecedor} · ${rec.doca} · ${vertenteLabel[rec.vertente]}`}
        footer={
          <>
            <button onClick={onClose} className="btn-outline">Fechar</button>
            <button onClick={onConcluir} disabled={!todosConferidos || bloqueadoPorSku} className="btn-primary">
              <Tag className="h-4 w-4" /> Gerar etiqueta SSCC & disponibilizar
            </button>
          </>
        }
      >
        {bloqueadoPorSku && (
          <div className="mb-4 rounded-xl border border-bad/30 bg-bad-50 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />
                <div>
                  <p className="text-sm font-semibold text-bad">
                    Viagem travada na parte {ORDEM_CONFERENCIA_DOCUMENTOS}: Conferência de documentos
                  </p>
                  <p className="mt-1 text-xs text-bad">
                    {resumoSkusPendentes(pendenciasSku)}. Configure o SKU para liberar conferência física, etiquetas e putaway.
                  </p>
                </div>
              </div>
              <Link to="/controle-sku" className="btn-primary bg-bad hover:bg-red-700 shrink-0">
                Configurar SKU
              </Link>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl bg-surface-sub border border-line p-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            {cega ? <EyeOff className="h-4 w-4 text-primary" /> : <Eye className="h-4 w-4 text-ink-muted" />}
            <div>
              <p className="font-medium text-brand">Conferência cega</p>
              <p className="text-xs text-ink-muted">Operador conta sem ver o esperado — reduz viés e fraude.</p>
            </div>
          </div>
          <button
            onClick={() => setCega((c) => !c)}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              cega ? 'bg-primary' : 'bg-slate-300',
            )}
          >
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', cega ? 'left-[22px]' : 'left-0.5')} />
          </button>
        </div>

        <div className="space-y-2">
          {rec.itens.map((i) => {
            const ok = i.conferido && !i.ocorrencia
            const div = !!i.ocorrencia
            const skuPendente = skusPendentes.has(i.skuCodigo.toUpperCase())
            return (
              <div
                key={i.skuCodigo}
                className={cn(
                  'rounded-xl border p-3 transition-colors',
                  ok && 'border-ok/40 bg-ok-50',
                  div && 'border-bad/40 bg-bad-50',
                  skuPendente && 'border-bad/50 bg-bad-50',
                  !i.conferido && !skuPendente && 'border-line',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-surface border border-line grid place-items-center text-ink-muted">
                    <PackageOpen className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand">{i.descricao}</p>
                    <p className="text-xs text-ink-muted mono">
                      {i.skuCodigo}
                      {i.lote && ` · Lote ${i.lote}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {!cega && <p className="text-xs text-ink-muted">Esperado: <span className="mono">{i.esperado}</span></p>}
                    {i.conferido && (
                      <p className={cn('text-sm font-semibold mono', div ? 'text-bad' : 'text-ok')}>
                        {i.contado} un
                      </p>
                    )}
                  </div>
                  {!i.conferido ? (
                    skuPendente ? (
                      <Badge tone="bad">Configurar SKU</Badge>
                    ) : (
                      <button
                        onClick={() => setAtivo(i)}
                        className="btn-primary py-1.5 px-3 text-xs"
                        disabled={bloqueadoPorSku}
                      >
                        Bipar
                      </button>
                    )
                  ) : ok ? (
                    <CheckCircle2 className="h-5 w-5 text-ok" />
                  ) : (
                    <Badge tone="bad">{i.ocorrencia?.tipo}</Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Modal>

      {/* Sub-modal: bipar item */}
      {ativo && (
        <BiparModal
          item={ativo}
          cega={cega}
          onClose={() => setAtivo(null)}
          onConfirmar={(q) => {
            onConferir(ativo.skuCodigo, q)
            setAtivo(null)
          }}
          onDivergir={() => {
            setOco(ativo)
            setAtivo(null)
          }}
        />
      )}

      {/* Sub-modal: ocorrência */}
      {oco && (
        <OcorrenciaModal
          item={oco}
          onClose={() => setOco(null)}
          onSalvar={(o) => {
            onOcorrencia(oco.skuCodigo, o)
            setOco(null)
          }}
        />
      )}
    </>
  )
}

function BiparModal({
  item,
  cega,
  onClose,
  onConfirmar,
  onDivergir,
}: {
  item: ItemRecebimento
  cega: boolean
  onClose: () => void
  onConfirmar: (q: number) => void
  onDivergir: () => void
}) {
  const [bipado, setBipado] = useState(false)
  const [q, setQ] = useState('')
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Bipar produto"
      subtitle={item.descricao}
      footer={
        <>
          <button onClick={onDivergir} className="btn-outline text-bad border-bad/30 hover:bg-bad-50">
            <AlertTriangle className="h-4 w-4" /> Divergência
          </button>
          <button
            onClick={() => onConfirmar(Number(q))}
            disabled={!bipado || q === ''}
            className="btn-primary"
          >
            Confirmar
          </button>
        </>
      }
    >
      {!bipado ? (
        <ScanInput
          expected={item.skuCodigo}
          label="Bipe o código do produto"
          onValid={() => setBipado(true)}
        />
      ) : (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-sm text-ok rounded-xl bg-ok-50 px-3 py-2">
            <CheckCircle2 className="h-4 w-4" /> SKU validado: <span className="mono">{item.skuCodigo}</span>
          </div>
          {item.lote && (
            <div className="rounded-xl bg-warn-50 border border-warn/20 px-3 py-2 text-xs text-warn">
              Controle de lote/validade — Lote <span className="mono">{item.lote}</span> · venc. {item.validade}
            </div>
          )}
          <div>
            <label className="label">Quantidade contada {cega ? '(conferência cega)' : ''}</label>
            <input
              autoFocus
              type="number"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="0"
              className="input mono text-lg"
            />
          </div>
        </div>
      )}
    </Modal>
  )
}

const TIPOS_OCO = [
  { id: 'falta', l: 'Falta' },
  { id: 'sobra', l: 'Sobra' },
  { id: 'item-trocado', l: 'Item trocado' },
  { id: 'avaria', l: 'Avaria' },
] as const

function OcorrenciaModal({
  item,
  onClose,
  onSalvar,
}: {
  item: ItemRecebimento
  onClose: () => void
  onSalvar: (o: Ocorrencia) => void
}) {
  const [tipo, setTipo] = useState<Ocorrencia['tipo']>('falta')
  const [q, setQ] = useState('')
  const [obs, setObs] = useState('')
  const [foto, setFoto] = useState(false)
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Registrar ocorrência"
      subtitle={`${item.descricao} · ${item.skuCodigo}`}
      footer={
        <>
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button
            onClick={() => onSalvar({ tipo, quantidadeReal: Number(q) || 0, observacao: obs, foto })}
            disabled={q === ''}
            className="btn-accent"
          >
            Registrar e seguir
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-ink-muted">
          A exceção é tratada dentro do fluxo — o operador não abandona a tarefa.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {TIPOS_OCO.map((t) => (
            <button
              key={t.id}
              onClick={() => setTipo(t.id)}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer',
                tipo === t.id ? 'border-accent bg-accent-50 text-accent' : 'border-line text-ink-soft hover:bg-surface-sub',
              )}
            >
              {t.l}
            </button>
          ))}
        </div>
        <div>
          <label className="label">Quantidade real recebida</label>
          <input type="number" value={q} onChange={(e) => setQ(e.target.value)} className="input mono" placeholder="0" />
        </div>
        <div>
          <label className="label">Observação</label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={2}
            className="input resize-none"
            placeholder="Descreva a divergência…"
          />
        </div>
        <button
          onClick={() => setFoto((f) => !f)}
          className={cn(
            'flex items-center gap-2 w-full rounded-xl border border-dashed px-3 py-3 text-sm transition-colors',
            foto ? 'border-ok bg-ok-50 text-ok' : 'border-line text-ink-muted hover:bg-surface-sub',
          )}
        >
          {foto ? <CheckCircle2 className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {foto ? 'Foto anexada (1)' : 'Anexar foto da avaria/divergência'}
        </button>
      </div>
    </Modal>
  )
}
