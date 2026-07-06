import { useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Barcode,
  FileCheck2,
  Package,
  Plus,
  Printer,
  Search,
  Send,
  Tags,
  Trash2,
  Truck,
  Weight,
} from 'lucide-react'
import { Badge, EmptyState, Modal, PageHeader, SelectField, Tab, Tabs, type Tone } from '../components/ui'
import { VIAGENS_ETIQUETAGEM, ownerName } from '../lib/mock'
import { resumoSkusPendentes, skusPendentesDoRecebimento } from '../lib/skuControle'
import { cn } from '../lib/utils'
import { useStore } from '../store/useStore'
import {
  deveGerarEtiquetaDivergente,
  selecionarEtiquetasCanceladasPorSobra,
  tipoDivergenciaMeta as tipoDivergenciaRegras,
  tituloEtiquetaDivergente,
  type EtiquetaDivergente,
  type ItemDivergenciaEtiqueta,
  type RegistroDivergenciaEtiqueta,
  type TipoDivergenciaEtiqueta,
} from '../lib/divergenciaEtiquetagem'
import {
  calcularEtiquetas,
  configDoSku,
  descricaoSkuRecebimento,
  emissaoAutomaticaIso,
  emissaoAtualIso,
  formatarData,
  formatarDataHora,
  formatarKg,
  gerarEtiquetaId,
  isoLocal,
  resumoSkus,
  type EtiquetaVolume,
  type ResumoSku,
  type ViagemComRecebimento,
} from '../lib/etiquetas'
import type {
  SkuControle,
  StatusDocumentoEtiquetagem,
} from '../lib/types'

type AbaEtiquetagem = 'prontas' | 'bloqueadas' | 'todas'

interface HistoricoReemissaoEtiqueta {
  id: string
  viagemId: string
  usuario: string
  quandoIso: string
  motivo: string
  etiquetas: number
}

interface DivergenciaEtiquetaInput {
  tipo: TipoDivergenciaEtiqueta
  itens: Array<{ skuCodigo: string; quantidade: number }>
}

const documentoMeta: Record<StatusDocumentoEtiquetagem, { label: string; tone: Tone }> = {
  aguardando: { label: 'Aguardando documento', tone: 'warn' },
  aprovado: { label: 'Documento aprovado', tone: 'ok' },
  bloqueado: { label: 'Documento bloqueado', tone: 'bad' },
}

const tipoDivergenciaMeta: Record<TipoDivergenciaEtiqueta, { label: string; tone: Tone; instrucao: string }> = {
  'faltou-etiqueta': {
    label: tipoDivergenciaRegras['faltou-etiqueta'].label,
    tone: 'bad',
    instrucao: 'Fixar esta etiqueta no item divergente e manter o volume em tratativa até validação administrativa.',
  },
  'sobrou-etiqueta': {
    label: tipoDivergenciaRegras['sobrou-etiqueta'].label,
    tone: 'warn',
    instrucao: 'Anexar esta etiqueta ao conjunto excedente e separar fisicamente para conferência do administrativo.',
  },
}

function motivoBloqueio(row: ViagemComRecebimento, skusControle: SkuControle[]) {
  if (!row.recebimento) return 'Recebimento não encontrado'
  const pendenciasSku = skusPendentesDoRecebimento(row.recebimento, skusControle)
  if (pendenciasSku.length) {
    return `${resumoSkusPendentes(pendenciasSku)}. Viagem travada na Conferência de documentos.`
  }
  if (row.viagem.documentoStatus === 'bloqueado') return 'Conferência documental bloqueada'
  if (row.viagem.documentoStatus !== 'aprovado') return 'Conferência documental pendente'
  if (row.viagem.ordemExecucaoAtual < 4) return `Ordem na parte ${row.viagem.ordemExecucaoAtual}`
  if (row.recebimento.status === 'divergencia' || row.recebimento.itens.some((item) => item.ocorrencia)) {
    return 'Divergência aberta no recebimento'
  }
  return null
}

function calcularEtiquetasDivergentes(
  row: ViagemComRecebimento,
  itens: ItemDivergenciaEtiqueta[],
  registroId: string,
  tipo: TipoDivergenciaEtiqueta,
  emissaoIso: string,
) {
  if (!row.recebimento || !deveGerarEtiquetaDivergente(tipo)) return []
  const totalEtiquetas = itens.reduce((total, item) => total + item.quantidade, 0)
  let sequenciaGlobal = 0

  return itens.flatMap((item) => {
    const config = configDoSku(row.viagem, item.skuCodigo)
    return Array.from({ length: item.quantidade }, (_, index): EtiquetaDivergente => {
      sequenciaGlobal += 1
      const id = `DV${gerarEtiquetaId(`${registroId}-${item.skuCodigo}-${index}`, sequenciaGlobal)}`
      return {
        id,
        divergenciaId: registroId,
        tipoDivergencia: tipo,
        tituloDivergencia: tituloEtiquetaDivergente(tipo) ?? 'DEVOLUCAO',
        instrucao: tipoDivergenciaRegras[tipo].instrucao,
        viagemId: row.viagem.id,
        recebimentoId: row.recebimento!.id,
        skuCodigo: item.skuCodigo,
        descricao: item.descricao,
        tipoEmbalagem: config?.tipoEmbalagem ?? 'unidade',
        quantidadeNoVolume: 1,
        sequencia: `${sequenciaGlobal}/${totalEtiquetas}`,
        sequenciaSku: `${index + 1}/${item.quantidade}`,
        emissaoIso,
        origemDestino: `${row.viagem.origemSigla}/${row.viagem.destinoSigla}`,
        embarcador: row.viagem.embarcador,
        nf: row.viagem.nf,
        cte: row.viagem.cte,
        kg: formatarKg(config?.pesoUnitarioKg ?? 0),
        kgValor: config?.pesoUnitarioKg ?? 0,
        destinatario: row.viagem.destinatario,
        endereco: row.viagem.endereco,
      }
    })
  })
}

export default function Etiquetagem() {
  const {
    recebimentos,
    ownerId,
    toast,
    skusControle,
    usuario,
    divergenciasEtiquetagem,
    registrarDivergenciaEtiquetagem,
  } = useStore()
  const [aba, setAba] = useState<AbaEtiquetagem>('prontas')
  const [busca, setBusca] = useState('')
  const [selecionadaId, setSelecionadaId] = useState('')
  const [historicoReemissao, setHistoricoReemissao] = useState<Record<string, HistoricoReemissaoEtiqueta[]>>({})
  const [reemissaoAberta, setReemissaoAberta] = useState<ViagemComRecebimento | null>(null)
  const [divergenciaAberta, setDivergenciaAberta] = useState<ViagemComRecebimento | null>(null)
  const hojeIso = isoLocal()

  const rows = useMemo<ViagemComRecebimento[]>(() => {
    return VIAGENS_ETIQUETAGEM.map((viagem) => ({
      viagem,
      recebimento: recebimentos.find((rec) => rec.id === viagem.recebimentoId) ?? null,
    })).filter((row) => ownerId === 'own-all' || row.recebimento?.ownerId === ownerId)
  }, [ownerId, recebimentos])

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return rows.filter((row) => {
      const bloqueio = motivoBloqueio(row, skusControle)
      if (aba === 'prontas' && bloqueio) return false
      if (aba === 'bloqueadas' && !bloqueio) return false
      if (q) {
        const alvo = [
          row.viagem.id,
          row.viagem.ordemServicoId,
          row.viagem.cte,
          row.viagem.nf,
          row.viagem.destinatario,
          row.viagem.endereco,
          row.recebimento?.id ?? '',
          row.recebimento?.fornecedor ?? '',
          row.recebimento ? ownerName(row.recebimento.ownerId) : '',
          ...(row.recebimento?.itens.map((item) => `${item.skuCodigo} ${item.descricao}`) ?? []),
        ].join(' ').toLowerCase()
        if (!alvo.includes(q)) return false
      }
      return true
    })
  }, [aba, busca, rows, skusControle])

  const selecionada = filtradas.find((row) => row.viagem.id === selecionadaId) ?? filtradas[0] ?? rows[0] ?? null
  const historicoSelecionado = selecionada ? historicoReemissao[selecionada.viagem.id] ?? [] : []
  const divergenciasSelecionadas = selecionada
    ? divergenciasEtiquetagem.filter((registro) => registro.viagemId === selecionada.viagem.id)
    : []
  const emissaoSelecionada = selecionada ? emissaoAtualIso(selecionada, historicoSelecionado) : `${hojeIso}T00:00:00.000`
  const etiquetas = useMemo(
    () =>
      selecionada?.recebimento
        ? calcularEtiquetas(selecionada.viagem, selecionada.recebimento, emissaoSelecionada)
        : [],
    [emissaoSelecionada, selecionada],
  )
  const itens = useMemo(
    () =>
      selecionada?.recebimento
        ? resumoSkus(selecionada.viagem, selecionada.recebimento)
        : [],
    [selecionada],
  )

  const prontas = rows.filter((row) => !motivoBloqueio(row, skusControle))
  const bloqueadas = rows.length - prontas.length
  const totalEtiquetasProntas = prontas.reduce((total, row) => {
    if (!row.recebimento) return total
    return total + calcularEtiquetas(row.viagem, row.recebimento, hojeIso).length
  }, 0)
  const skusCaixa = prontas.reduce(
    (total, row) => total + row.viagem.itens.filter((item) => item.tipoEmbalagem === 'caixa-matriz').length,
    0,
  )

  const confirmarReemissao = (row: ViagemComRecebimento, motivo: string) => {
    const bloqueio = motivoBloqueio(row, skusControle)
    if (bloqueio) {
      toast({ tipo: 'aviso', titulo: 'Viagem bloqueada para etiquetagem', texto: bloqueio })
      return
    }
    const totalEtiquetas = row.recebimento
      ? calcularEtiquetas(row.viagem, row.recebimento, emissaoAtualIso(row, historicoReemissao[row.viagem.id] ?? [])).length
      : 0
    const registro: HistoricoReemissaoEtiqueta = {
      id: `RE-${row.viagem.id}-${Date.now()}`,
      viagemId: row.viagem.id,
      usuario: usuario || 'Supervisor demo',
      quandoIso: new Date().toISOString(),
      motivo: motivo.trim(),
      etiquetas: totalEtiquetas,
    }
    setHistoricoReemissao((atual) => ({
      ...atual,
      [row.viagem.id]: [registro, ...(atual[row.viagem.id] ?? [])],
    }))
    toast({
      tipo: 'sucesso',
      titulo: 'Re-emissão registrada',
      texto: `${row.viagem.id} · ${totalEtiquetas} etiquetas enviadas para impressão`,
    })
    setReemissaoAberta(null)
  }

  const confirmarDivergencia = (row: ViagemComRecebimento, input: DivergenciaEtiquetaInput) => {
    if (!row.recebimento) {
      toast({ tipo: 'erro', titulo: 'Recebimento não encontrado', texto: 'Não é possível enviar divergência sem recebimento vinculado.' })
      return
    }
    const itens: ItemDivergenciaEtiqueta[] = input.itens.map((item) => ({
      skuCodigo: item.skuCodigo,
      descricao: descricaoSkuRecebimento(row.recebimento!, item.skuCodigo),
      quantidade: item.quantidade,
    }))
    const quandoIso = new Date().toISOString()
    const registroId = `DIV-${row.viagem.id}-${Date.now()}`
    const etiquetasGeradas = calcularEtiquetasDivergentes(row, itens, registroId, input.tipo, quandoIso)
    const etiquetasCanceladasIds =
      input.tipo === 'sobrou-etiqueta'
        ? selecionarEtiquetasCanceladasPorSobra(
            calcularEtiquetas(
              row.viagem,
              row.recebimento,
              emissaoAtualIso(row, historicoReemissao[row.viagem.id] ?? []),
            ),
            itens,
          )
        : []
    const registro: RegistroDivergenciaEtiqueta = {
      id: registroId,
      viagemId: row.viagem.id,
      recebimentoId: row.recebimento.id,
      usuario: usuario || 'Supervisor demo',
      quandoIso,
      tipo: input.tipo,
      itens,
      etiquetasCanceladasIds,
      etiquetasGeradas,
      envioAdministrativo: {
        status: 'enviado-mock',
        destino: 'Administrativo / Tratativa fiscal',
        recebimentoId: row.recebimento.id,
        documento: row.recebimento.documento,
        fornecedor: row.recebimento.fornecedor,
        owner: ownerName(row.recebimento.ownerId),
      },
    }

    registrarDivergenciaEtiquetagem(registro)
    toast({
      tipo: 'aviso',
      titulo: 'Divergência enviada ao administrativo',
      texto: `${tipoDivergenciaMeta[input.tipo].label} · ${etiquetasGeradas.length} etiqueta(s) divergente(s) gerada(s)`,
    })
    setDivergenciaAberta(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Etiquetagem"
        subtitle="Viagens com conferência documental aprovada na parte 4 da ordem de execução. (DEMO — dados de exemplo)"
      >
        <Badge tone="ok" dot>{prontas.length} emitidas automaticamente</Badge>
        <Badge tone={bloqueadas ? 'warn' : 'neutral'}>{bloqueadas} bloqueadas</Badge>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard icon={<Truck className="h-5 w-5" />} label="Viagens mapeadas" value={rows.length} tone="primary" />
        <KpiCard icon={<Tags className="h-5 w-5" />} label="Etiquetas emitidas" value={totalEtiquetasProntas} tone="accent" />
        <KpiCard icon={<Package className="h-5 w-5" />} label="SKUs caixa matriz" value={skusCaixa} tone="info" />
        <KpiCard icon={<AlertTriangle className="h-5 w-5" />} label="Pendências" value={bloqueadas} tone={bloqueadas ? 'warn' : 'neutral'} />
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 pt-1">
          <Tabs value={aba} onChange={(value) => setAba(value as AbaEtiquetagem)}>
            <Tab id="prontas">Prontas</Tab>
            <Tab id="bloqueadas">Bloqueadas</Tab>
            <Tab id="todas">Todas</Tab>
          </Tabs>
        </div>

        <div className="border-b border-line bg-surface-sub/70 p-4">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
            <Search className="h-4 w-4 text-ink-muted" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar viagem, OS, CT-e, NF, SKU, destinatário..."
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[0.9fr_1.35fr]">
          <div className="space-y-3">
            {filtradas.map((row) => (
              <ViagemCard
                key={row.viagem.id}
                row={row}
                selecionada={selecionada?.viagem.id === row.viagem.id}
                reemissoes={historicoReemissao[row.viagem.id]?.length ?? 0}
                etiquetas={row.recebimento ? calcularEtiquetas(row.viagem, row.recebimento, hojeIso).length : 0}
                skusControle={skusControle}
                onClick={() => setSelecionadaId(row.viagem.id)}
              />
            ))}
            {filtradas.length === 0 && (
              <EmptyState
                icon={<Tags className="h-6 w-6" />}
                title="Nenhuma viagem encontrada"
                text="Ajuste o filtro ou a busca para localizar a ordem de execução."
              />
            )}
          </div>

          {selecionada ? (
            <PainelEtiquetas
              row={selecionada}
              etiquetas={etiquetas}
              itens={itens}
              historico={historicoSelecionado}
              divergencias={divergenciasSelecionadas}
              emissaoAutomaticaIso={emissaoAutomaticaIso(selecionada)}
              emissaoAtualIso={emissaoSelecionada}
              skusControle={skusControle}
              onReemitir={() => setReemissaoAberta(selecionada)}
              onDivergencia={() => setDivergenciaAberta(selecionada)}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-line bg-surface-sub">
              <EmptyState
                icon={<Tags className="h-6 w-6" />}
                title="Selecione uma viagem"
                text="As etiquetas aparecem quando houver recebimento vinculado à OS."
              />
            </div>
          )}
        </div>
      </div>

      {reemissaoAberta && (
        <ReemissaoModal
          row={reemissaoAberta}
          etiquetas={
            reemissaoAberta.recebimento
              ? calcularEtiquetas(
                  reemissaoAberta.viagem,
                  reemissaoAberta.recebimento,
                  emissaoAtualIso(reemissaoAberta, historicoReemissao[reemissaoAberta.viagem.id] ?? []),
                ).length
              : 0
          }
          onClose={() => setReemissaoAberta(null)}
          onConfirmar={(motivo) => confirmarReemissao(reemissaoAberta, motivo)}
        />
      )}

      {divergenciaAberta && (
        <DivergenciaEtiquetaModal
          row={divergenciaAberta}
          onClose={() => setDivergenciaAberta(null)}
          onConfirmar={(input) => confirmarDivergencia(divergenciaAberta, input)}
        />
      )}
    </div>
  )
}

function ViagemCard({
  row,
  selecionada,
  reemissoes,
  etiquetas,
  skusControle,
  onClick,
}: {
  row: ViagemComRecebimento
  selecionada: boolean
  reemissoes: number
  etiquetas: number
  skusControle: SkuControle[]
  onClick: () => void
}) {
  const bloqueio = motivoBloqueio(row, skusControle)
  const doc = documentoMeta[row.viagem.documentoStatus]

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border bg-surface p-4 text-left transition hover:border-primary/40 hover:shadow-md',
        selecionada ? 'border-primary ring-2 ring-primary/10' : 'border-line',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mono text-sm font-semibold text-brand">{row.viagem.id}</p>
          <p className="mt-1 truncate text-xs text-ink-muted">
            {row.viagem.ordemServicoId} · {row.recebimento?.id ?? 'sem recebimento'}
          </p>
        </div>
        <Badge tone={bloqueio ? 'warn' : reemissoes ? 'primary' : 'ok'} dot>
          {bloqueio ? 'Bloqueada' : reemissoes ? 'Reemitida' : 'Emitida auto'}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniInfo label="Parte" value={`${row.viagem.ordemExecucaoAtual}/7`} />
        <MiniInfo label="Volumes" value={etiquetas.toLocaleString('pt-BR')} />
        <MiniInfo label="Rota" value={`${row.viagem.origemSigla}/${row.viagem.destinoSigla}`} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={doc.tone}>{doc.label}</Badge>
        {row.recebimento && <Badge tone="neutral">{ownerName(row.recebimento.ownerId)}</Badge>}
      </div>
      {bloqueio && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-warn-50 px-3 py-2 text-xs text-warn">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{bloqueio}</span>
        </div>
      )}
    </button>
  )
}

function PainelEtiquetas({
  row,
  etiquetas,
  itens,
  historico,
  divergencias,
  emissaoAutomaticaIso,
  emissaoAtualIso,
  skusControle,
  onReemitir,
  onDivergencia,
}: {
  row: ViagemComRecebimento
  etiquetas: EtiquetaVolume[]
  itens: ResumoSku[]
  historico: HistoricoReemissaoEtiqueta[]
  divergencias: RegistroDivergenciaEtiqueta[]
  emissaoAutomaticaIso: string
  emissaoAtualIso: string
  skusControle: SkuControle[]
  onReemitir: () => void
  onDivergencia: () => void
}) {
  const bloqueio = motivoBloqueio(row, skusControle)
  const recebimento = row.recebimento
  const pendenciasSku = recebimento ? skusPendentesDoRecebimento(recebimento, skusControle) : []
  const codigosPendentes = new Set(pendenciasSku.map((pendencia) => pendencia.skuCodigo))
  const etiquetasDivergentes = divergencias.flatMap((registro) => registro.etiquetasGeradas)
  const eventosHistorico = bloqueio
    ? []
    : [
        {
          id: `${row.viagem.id}-auto`,
          tipo: 'Emissão automática',
          usuario: 'Sistema WMS',
          quandoIso: emissaoAutomaticaIso,
          motivo: 'OS chegou à parte 4 com conferência documental aprovada.',
          etiquetas: etiquetas.length,
        },
        ...historico.map((item) => ({ ...item, tipo: 'Re-emissão' })),
        ...divergencias.map((item) => ({
          id: item.id,
          tipo: 'Divergência etiqueta',
          usuario: item.usuario,
          quandoIso: item.quandoIso,
          motivo: `${tipoDivergenciaMeta[item.tipo].label} enviado ao administrativo mock (${item.envioAdministrativo.destino}).`,
          etiquetas: item.etiquetasGeradas.length,
        })),
      ]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-brand">{row.viagem.id}</h2>
              <Badge tone={bloqueio ? 'warn' : historico.length ? 'primary' : 'ok'} dot>
                {bloqueio
                  ? 'Bloqueada'
                  : historico.length
                    ? `${historico.length} re-emissão${historico.length > 1 ? 'ões' : ''}`
                    : 'Emitida automaticamente'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {row.viagem.embarcador} · {row.viagem.origemSigla}/{row.viagem.destinoSigla} · {row.viagem.nf}
            </p>
            {!bloqueio && (
              <p className="mt-1 text-xs text-ink-muted">
                Última emissão: <span className="mono text-ink-soft">{formatarDataHora(emissaoAtualIso)}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onDivergencia}
              disabled={!recebimento || row.viagem.documentoStatus !== 'aprovado'}
              className="btn-outline border-bad/30 text-bad hover:bg-bad-50"
            >
              <AlertTriangle className="h-4 w-4" /> Divergência
            </button>
            <button onClick={onReemitir} disabled={!!bloqueio} className="btn-primary">
              <Printer className="h-4 w-4" /> Re-emissão
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Detail icon={<FileCheck2 className="h-4 w-4" />} label="CTE" value={row.viagem.cte} mono />
          <Detail icon={<FileCheck2 className="h-4 w-4" />} label="NF" value={row.viagem.nf} mono />
          <Detail icon={<Truck className="h-4 w-4" />} label="Recebimento" value={recebimento?.id ?? '—'} mono />
          <Detail icon={<Weight className="h-4 w-4" />} label="Etiquetas" value={etiquetas.length.toLocaleString('pt-BR')} mono />
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4">
          {[
            ['1', 'Encostar veículo'],
            ['2', 'Conferência geral'],
            ['3', 'Conferência de documentos'],
            ['4', 'Geração de etiquetas'],
          ].map(([numero, label]) => (
            <div
              key={numero}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm',
                Number(numero) <= row.viagem.ordemExecucaoAtual
                  ? 'border-ok/30 bg-ok-50 text-ok'
                  : 'border-line bg-surface-sub text-ink-muted',
              )}
            >
              <span className="mono text-xs font-semibold">Parte {numero}</span>
              <p className="mt-0.5 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {bloqueio && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-warn/20 bg-warn-50 px-3 py-2 text-sm text-warn">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{bloqueio}</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-line bg-surface overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-brand">SKUs e cálculo de volumes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px]">
            <thead>
              <tr>
                <th className="th">SKU</th>
                <th className="th">Embalagem</th>
                <th className="th text-right">Qtd base</th>
                <th className="th text-right">Volumes</th>
                <th className="th text-right">KG total</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((rowSku) => (
                <tr
                  key={rowSku.item.skuCodigo}
                  className={cn('row-hover', codigosPendentes.has(rowSku.item.skuCodigo.toUpperCase()) && 'bg-bad-50/70')}
                >
                  <td className="td">
                    <p className="font-medium text-brand">{rowSku.item.descricao}</p>
                    <p className="mono text-xs text-ink-muted">{rowSku.item.skuCodigo}</p>
                  </td>
                  <td className="td">
                    {rowSku.config ? (
                      <Badge tone={rowSku.config.tipoEmbalagem === 'caixa-matriz' ? 'primary' : 'neutral'}>
                        {rowSku.config.tipoEmbalagem === 'caixa-matriz'
                          ? `Caixa matriz · ${rowSku.config.unidadesPorVolume} un`
                          : 'Unidade'}
                      </Badge>
                    ) : (
                      <Badge tone="bad">Cadastro incompleto</Badge>
                    )}
                  </td>
                  <td className="td text-right mono">{rowSku.quantidadeBase.toLocaleString('pt-BR')}</td>
                  <td className="td text-right mono">{rowSku.volumesCalculados.toLocaleString('pt-BR')}</td>
                  <td className="td text-right mono">{rowSku.kgTotal}</td>
                  <td className="td">
                    {codigosPendentes.has(rowSku.item.skuCodigo.toUpperCase()) ? (
                      <Badge tone="bad">SKU sem cadastro mestre</Badge>
                    ) : rowSku.divergenteDocumento ? (
                      <Badge tone="warn">Diverge do documento</Badge>
                    ) : rowSku.config ? (
                      <Badge tone="ok">Calculado</Badge>
                    ) : (
                      <Badge tone="bad">Bloqueia emissão</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-brand">Histórico de emissão</h3>
        </div>
        {eventosHistorico.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr>
                  <th className="th">Evento</th>
                  <th className="th">Usuário</th>
                  <th className="th">Quando</th>
                  <th className="th text-right">Etiquetas</th>
                  <th className="th">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {eventosHistorico.map((evento) => (
                  <tr key={evento.id} className="row-hover">
                    <td className="td"><Badge tone={evento.tipo === 'Re-emissão' ? 'primary' : 'ok'}>{evento.tipo}</Badge></td>
                    <td className="td">{evento.usuario}</td>
                    <td className="td mono text-xs">{formatarDataHora(evento.quandoIso)}</td>
                    <td className="td text-right mono">{evento.etiquetas.toLocaleString('pt-BR')}</td>
                    <td className="td">{evento.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-ink-muted">
            A viagem ainda não chegou à parte 4 aprovada, então não há emissão automática registrada.
          </div>
        )}
      </div>

      <div className="rounded-xl border border-line bg-surface overflow-hidden">
        <div className="flex flex-col gap-1 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-brand">Divergências de etiquetagem enviadas ao administrativo</h3>
          <Badge tone={divergencias.length ? 'bad' : 'neutral'}>{divergencias.length ? 'Envio mock registrado' : 'Sem divergência'}</Badge>
        </div>
        {divergencias.length > 0 ? (
          <div className="space-y-3 p-4">
            {divergencias.map((registro) => (
              <div key={registro.id} className="rounded-xl border border-bad/20 bg-bad-50/50 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={tipoDivergenciaMeta[registro.tipo].tone}>{tipoDivergenciaMeta[registro.tipo].label}</Badge>
                      <span className="mono text-xs font-semibold text-brand">{registro.id}</span>
                      <Badge tone="info">Administrativo mock</Badge>
                    </div>
                    <p className="mt-2 text-sm text-ink-soft">
                      Enviado para {registro.envioAdministrativo.destino} com recebimento {registro.recebimentoId}, documento {registro.envioAdministrativo.documento}, fornecedor {registro.envioAdministrativo.fornecedor} e owner {registro.envioAdministrativo.owner}.
                    </p>
                  </div>
                  <div className="text-left text-xs text-ink-muted sm:text-right">
                    <p>{formatarDataHora(registro.quandoIso)}</p>
                    <p>{registro.usuario}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {registro.itens.map((item) => (
                    <div key={`${registro.id}-${item.skuCodigo}`} className="rounded-lg border border-bad/20 bg-white px-3 py-2">
                      <p className="mono text-xs font-semibold text-brand">{item.skuCodigo}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">{item.descricao}</p>
                      <p className="mt-1 text-xs font-semibold text-bad">{item.quantidade} etiqueta(s) divergente(s)</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-ink-muted">
            Quando o operador registrar falta ou sobra de etiqueta, a ocorrência fica listada aqui como enviada ao administrativo.
          </div>
        )}
      </div>

      <div className="rounded-xl border border-line bg-surface overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-brand">Etiquetas geradas por volume</h3>
          <Badge tone={bloqueio ? 'neutral' : historico.length ? 'primary' : 'ok'}>
            {bloqueio ? 'Não emitidas' : historico.length ? 'Reemitidas' : 'Emitidas automaticamente'}
          </Badge>
        </div>
        <div className="max-h-[560px] overflow-y-auto bg-surface-sub p-4">
          {etiquetas.length > 0 ? (
            <div className="flex flex-wrap items-start gap-5 overflow-x-auto pb-2">
              {etiquetas.map((etiqueta) => (
                <EtiquetaPreviewCard key={etiqueta.id} etiqueta={etiqueta} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Barcode className="h-6 w-6" />}
              title="Sem etiquetas calculadas"
              text="A viagem precisa ter recebimento e configuração de embalagem por SKU."
            />
          )}
        </div>
      </div>

      {etiquetasDivergentes.length > 0 && (
        <div className="rounded-xl border border-bad/25 bg-surface overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-bad/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-bad">Etiquetas divergentes geradas automaticamente</h3>
              <p className="mt-1 text-xs text-ink-muted">
                O operador deve aplicar estas etiquetas apenas nos itens separados como divergentes.
              </p>
            </div>
            <Badge tone="bad">DEVOLUCAO</Badge>
          </div>
          <div className="border-b border-bad/20 bg-bad-50 px-4 py-3 text-sm text-bad">
            Coloque a etiqueta vermelha no SKU indicado e mantenha o item fisicamente apartado até a baixa da tratativa administrativa.
          </div>
          <div className="max-h-[560px] overflow-y-auto bg-surface-sub p-4">
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {etiquetasDivergentes.map((etiqueta) => (
                <EtiquetaDivergenteCard key={etiqueta.id} etiqueta={etiqueta} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReemissaoModal({
  row,
  etiquetas,
  onClose,
  onConfirmar,
}: {
  row: ViagemComRecebimento
  etiquetas: number
  onClose: () => void
  onConfirmar: (motivo: string) => void
}) {
  const [motivo, setMotivo] = useState('')
  const motivoLimpo = motivo.trim()
  const podeConfirmar = motivoLimpo.length > 0

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={`Re-emissão · ${row.viagem.id}`}
      subtitle={`${row.viagem.ordemServicoId} · ${row.viagem.cte}`}
      footer={
        <>
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button
            disabled={!podeConfirmar}
            onClick={() => onConfirmar(motivoLimpo)}
            className="btn-primary"
          >
            <Printer className="h-4 w-4" /> Confirmar re-emissão
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-sub px-3 py-2.5">
          <div className="grid gap-2 sm:grid-cols-3">
            <MiniInfo label="Etiquetas" value={etiquetas.toLocaleString('pt-BR')} />
            <MiniInfo label="NF" value={row.viagem.nf} />
            <MiniInfo label="Rota" value={`${row.viagem.origemSigla}/${row.viagem.destinoSigla}`} />
          </div>
        </div>

        <div>
          <label htmlFor="motivo-reemissao" className="label">Motivo da re-emissão</label>
          <textarea
            id="motivo-reemissao"
            autoFocus
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            className="input min-h-28 resize-y"
            placeholder="Ex.: etiqueta danificada no volume 12 durante movimentação para staging."
          />
          <p className={cn('mt-1.5 text-xs', podeConfirmar ? 'text-ink-muted' : 'text-bad')}>
            O motivo é obrigatório e será registrado com usuário, data e hora no histórico da viagem.
          </p>
        </div>
      </div>
    </Modal>
  )
}

function DivergenciaEtiquetaModal({
  row,
  onClose,
  onConfirmar,
}: {
  row: ViagemComRecebimento
  onClose: () => void
  onConfirmar: (input: DivergenciaEtiquetaInput) => void
}) {
  const recebimento = row.recebimento
  const skuOptions = recebimento?.itens ?? []
  const [tipo, setTipo] = useState<TipoDivergenciaEtiqueta>('faltou-etiqueta')
  const [itens, setItens] = useState<Array<{ id: string; skuCodigo: string; quantidade: string }>>([
    { id: 'linha-1', skuCodigo: skuOptions[0]?.skuCodigo ?? '', quantidade: '1' },
  ])

  const itensValidos = itens
    .map((item) => ({
      skuCodigo: item.skuCodigo.trim().toUpperCase(),
      quantidade: Number(item.quantidade),
    }))
    .filter((item) => item.skuCodigo && Number.isInteger(item.quantidade) && item.quantidade > 0)
  const podeConfirmar = !!recebimento && itensValidos.length > 0 && itensValidos.length === itens.length

  const atualizarItem = (id: string, patch: Partial<{ skuCodigo: string; quantidade: string }>) => {
    setItens((atual) => atual.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const adicionarItem = () => {
    setItens((atual) => [
      ...atual,
      { id: `linha-${Date.now()}`, skuCodigo: skuOptions[0]?.skuCodigo ?? '', quantidade: '1' },
    ])
  }

  const removerItem = (id: string) => {
    setItens((atual) => atual.filter((item) => item.id !== id))
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Divergência de etiqueta · ${row.viagem.id}`}
      subtitle={`${row.viagem.ordemServicoId} · ${row.viagem.cte}`}
      footer={
        <>
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button
            disabled={!podeConfirmar}
            onClick={() => onConfirmar({ tipo, itens: itensValidos })}
            className="btn-primary"
          >
            <Send className="h-4 w-4" /> {tipo === 'faltou-etiqueta' ? 'Enviar e gerar DEVOLUCAO' : 'Enviar ao administrativo'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-sub px-3 py-2.5">
          <div className="grid gap-2 sm:grid-cols-4">
            <MiniInfo label="Recebimento" value={recebimento?.id ?? '—'} />
            <MiniInfo label="Documento" value={recebimento?.documento ?? row.viagem.nf} />
            <MiniInfo label="Fornecedor" value={recebimento?.fornecedor ?? row.viagem.embarcador} />
            <MiniInfo label="Destino mock" value="Administrativo" />
          </div>
        </div>

        <div>
          <label htmlFor="tipo-divergencia-etiqueta" className="label">Tipo de divergência</label>
          <SelectField
            id="tipo-divergencia-etiqueta"
            value={tipo}
            onChange={(value) => setTipo(value as TipoDivergenciaEtiqueta)}
            options={[
              { value: 'faltou-etiqueta', label: 'Faltou etiqueta' },
              { value: 'sobrou-etiqueta', label: 'Sobrou etiqueta' },
            ]}
          />
          <p className="mt-1.5 text-xs text-ink-muted">
            O envio para o administrativo ainda é mockado: o registro fica salvo nesta tela com os dados do recebimento e os SKUs informados.
          </p>
        </div>

        <div className="rounded-xl border border-line overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-sub px-3 py-2">
            <p className="text-sm font-semibold text-brand">SKUs e quantidade de etiquetas</p>
            <button type="button" onClick={adicionarItem} className="btn-outline px-3 py-2 text-xs">
              <Plus className="h-3.5 w-3.5" /> Adicionar SKU
            </button>
          </div>
          <div className="space-y-3 p-3">
            {itens.map((item, index) => (
              <div key={item.id} className="grid gap-2 sm:grid-cols-[1fr_120px_40px]">
                <div>
                  <label htmlFor={`sku-divergente-${item.id}`} className="label">SKU</label>
                  <SelectField
                    id={`sku-divergente-${item.id}`}
                    value={item.skuCodigo}
                    onChange={(value) => atualizarItem(item.id, { skuCodigo: value })}
                    className="input mono"
                    options={skuOptions.map((sku) => ({
                      value: sku.skuCodigo,
                      label: `${sku.skuCodigo} · ${sku.descricao}`,
                    }))}
                  />
                </div>
                <div>
                  <label htmlFor={`qtd-divergente-${item.id}`} className="label">Quantidade</label>
                  <input
                    id={`qtd-divergente-${item.id}`}
                    type="number"
                    min={1}
                    step={1}
                    value={item.quantidade}
                    onChange={(event) => atualizarItem(item.id, { quantidade: event.target.value })}
                    className="input mono"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removerItem(item.id)}
                    disabled={itens.length === 1}
                    className="btn-outline h-11 w-full p-0 text-bad"
                    aria-label={`Remover SKU ${index + 1}`}
                    title="Remover SKU"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-bad/20 bg-bad-50 px-3 py-2.5 text-sm text-bad">
          Ao confirmar, o sistema registra a ocorrência mockada para o administrativo e gera etiquetas com faixa vermelha e título DIVERGENTE.
        </div>
      </div>
    </Modal>
  )
}

const CODE_128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
]

function code128Bars(value: string) {
  const normalized = value.replace(/[^\x20-\x7f]/g, ' ').slice(0, 48)
  const dataCodes = Array.from(normalized, (char) => char.charCodeAt(0) - 32)
  const checksum = (104 + dataCodes.reduce((sum, code, index) => sum + code * (index + 1), 0)) % 103
  const codes = [104, ...dataCodes, checksum, 106]
  let cursor = 10
  const bars: Array<{ x: number; width: number }> = []

  codes.forEach((code) => {
    const pattern = CODE_128_PATTERNS[code]
    Array.from(pattern).forEach((unit, index) => {
      const width = Number(unit)
      if (index % 2 === 0) bars.push({ x: cursor, width })
      cursor += width
    })
  })

  return { bars, width: cursor + 10 }
}

function CodigoBarras128({ value, className }: { value: string; className?: string }) {
  const { bars, width } = code128Bars(value)

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} 52`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Código de barras ${value}`}
      shapeRendering="crispEdges"
    >
      <rect width={width} height="52" fill="#fff" />
      {bars.map((bar, index) => (
        <rect key={`${bar.x}-${index}`} x={bar.x} y="0" width={bar.width} height="52" fill="#111827" />
      ))}
    </svg>
  )
}

function CodigoBarras128Vertical({ value, className }: { value: string; className?: string }) {
  const { bars, width } = code128Bars(value)

  return (
    <svg
      className={className}
      viewBox={`0 0 52 ${width}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Codigo de barras ${value}`}
      shapeRendering="crispEdges"
    >
      <rect width="52" height={width} fill="#fff" />
      {bars.map((bar, index) => (
        <rect key={`${bar.x}-${index}`} x="0" y={bar.x} width="52" height={bar.width} fill="#050505" />
      ))}
    </svg>
  )
}

function codigoPrincipalEtiqueta(id: string) {
  const numerico = id.replace(/\D/g, '')
  if (numerico.length >= 5) return numerico.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return id
}

function EtiquetaPreviewCard({ etiqueta }: { etiqueta: EtiquetaVolume }) {
  return (
    <div className="h-[4.8cm] w-[8.4cm] shrink-0 overflow-visible">
      <div className="origin-top-left scale-[1.2]">
        <EtiquetaCard etiqueta={etiqueta} />
      </div>
    </div>
  )
}

function EtiquetaCard({ etiqueta }: { etiqueta: EtiquetaVolume }) {
  const [origem = '', destino = ''] = etiqueta.origemDestino.split('/')
  const codigoPrincipal = codigoPrincipalEtiqueta(etiqueta.id)

  return (
    <div className="h-[4cm] w-[7cm] overflow-hidden rounded-[1px] border border-neutral-950 bg-white text-neutral-950 shadow-sm">
      <div className="grid h-full grid-cols-[16mm_1fr_12mm]">
        <div className="relative h-full border-r border-slate-950 bg-white">
          <CodigoBarras128Vertical
            value={etiqueta.id}
            className="absolute left-[1.2mm] top-[5mm] h-[28mm] w-[13mm]"
          />
          <span className="mono absolute bottom-[1mm] left-[1mm] right-[1mm] truncate text-center text-[6.5px] font-semibold leading-none">
            {etiqueta.id}
          </span>
        </div>

        <div className="min-w-0 px-[1.2mm] py-[0.8mm]">
          <div className="flex items-start justify-between gap-[1mm]">
            <span className="mono truncate text-[6.2px] font-bold leading-none">{etiqueta.nf}</span>
            <span className="mono shrink-0 text-[6.8px] font-black leading-none">{formatarData(etiqueta.emissaoIso)}</span>
          </div>

          <div className="mt-[0.9mm] flex items-end justify-between gap-[1mm]">
            <span className="mono text-[23px] font-black leading-[0.82] tracking-normal">D-{destino}</span>
            <span className="mono text-[23px] font-black leading-[0.82] tracking-normal">O-{origem}</span>
          </div>

          <div className="mt-[1.1mm] flex items-start justify-between gap-[1.2mm]">
            <p className="truncate text-[6.5px] font-black uppercase leading-none">{etiqueta.embarcador}</p>
            <p className="shrink-0 text-[5.7px] font-semibold leading-none">Reimpressao: N</p>
          </div>

          <div className="mt-[1mm] flex items-end justify-between gap-[1mm]">
            <span className="mono truncate text-[17px] font-black leading-[0.88]">{codigoPrincipal}</span>
            <span className="mono shrink-0 text-[13px] font-black leading-[0.9]">{etiqueta.sequencia}</span>
          </div>

          <div className="mt-[1.1mm] grid grid-cols-[1fr_13mm] gap-[1mm] border-t border-neutral-950 pt-[0.7mm]">
            <div className="min-w-0">
              <p className="mono truncate text-[6.8px] font-bold leading-none">{etiqueta.cte}</p>
              <p className="mt-[0.4mm] truncate text-[5.8px] font-bold leading-none">{etiqueta.skuCodigo}</p>
            </div>
            <div className="text-right">
              <p className="text-[5.7px] font-semibold leading-none">Kg.Calc.</p>
              <p className="mono mt-[0.2mm] text-[6.8px] font-bold leading-none">{etiqueta.kg.replace(/\s?kg$/, '')}</p>
            </div>
          </div>

          <div className="mt-[0.5mm] min-w-0 border-t border-neutral-950 pt-[0.7mm]">
            <p className="truncate text-[7.2px] font-black uppercase leading-none">{etiqueta.destinatario}</p>
            <p className="mt-[0.6mm] line-clamp-2 text-[6.4px] font-semibold uppercase leading-[1.05]">{etiqueta.endereco}</p>
            <p className="mono mt-[0.5mm] truncate text-[5.8px] font-bold leading-none">
              {etiqueta.skuCodigo} - {etiqueta.quantidadeNoVolume} un - {etiqueta.sequenciaSku}
            </p>
          </div>
        </div>

        <div className="relative h-full overflow-hidden bg-[#1d2f91] text-white">
          <div className="absolute left-1/2 top-[7mm] z-10 flex -translate-x-1/2 items-center gap-[0.6mm]">
            <span className="block h-[1.7mm] w-[3.2mm] -skew-x-12 bg-[#00d6bd]" />
            <span className="block h-[1.7mm] w-[3.2mm] skew-x-12 bg-[#00b8d9]" />
          </div>
          <div className="absolute left-1/2 top-1/2 z-10 h-[8mm] w-[35mm] -translate-x-1/2 -translate-y-1/2 rotate-90 text-center">
            <span className="block text-[13px] font-black italic leading-[0.9] tracking-normal text-white">INTEGRA</span>
            <span className="block text-[4.6px] font-bold uppercase leading-none tracking-normal text-white/90">LOGISTICA</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function EtiquetaDivergenteCard({ etiqueta }: { etiqueta: EtiquetaDivergente }) {
  const meta = tipoDivergenciaMeta[etiqueta.tipoDivergencia]

  return (
    <div className="h-[4cm] w-[7cm] overflow-hidden rounded-[2px] border border-bad bg-white text-slate-950 shadow-sm">
      <div className="grid h-full grid-cols-[13mm_1fr_10mm]">
        <div className="relative h-full border-r border-bad bg-white">
          <CodigoBarras128
            value={etiqueta.id}
            className="absolute bottom-[5.5mm] left-[2mm] h-[10mm] w-[30mm] origin-bottom-left -rotate-90"
          />
          <span className="mono absolute bottom-[1mm] left-[1mm] right-[1mm] truncate text-center text-[7px] font-semibold leading-none">
            {etiqueta.id}
          </span>
        </div>

        <div className="min-w-0 px-[1.5mm] py-[1.2mm]">
          <div className="flex items-start justify-between gap-[1mm]">
            <span className="mono truncate text-[7px] font-semibold leading-none">{etiqueta.recebimentoId}</span>
            <span className="mono shrink-0 text-[7px] font-semibold leading-none">{formatarData(etiqueta.emissaoIso)}</span>
          </div>

          <div className="mt-[1mm] bg-bad px-[1mm] py-[0.8mm] text-white">
            <p className="text-center text-[13px] font-black uppercase leading-none tracking-normal">{etiqueta.tituloDivergencia}</p>
          </div>

          <div className="mt-[1mm] flex items-start justify-between gap-[1mm] border-b border-bad pb-[0.8mm]">
            <div className="min-w-0">
              <p className="mono truncate text-[11px] font-black leading-none">{etiqueta.skuCodigo}</p>
              <p className="mt-[0.5mm] truncate text-[7px] font-semibold uppercase leading-none">{meta.label}</p>
            </div>
            <span className="mono shrink-0 text-[10px] font-black leading-none">{etiqueta.sequencia}</span>
          </div>

          <div className="mt-[1mm] min-w-0">
            <p className="truncate text-[8px] font-black uppercase leading-none">{etiqueta.descricao}</p>
            <p className="mt-[0.8mm] line-clamp-2 text-[6.5px] font-semibold uppercase leading-[1.08]">
              {etiqueta.instrucao}
            </p>
            <p className="mono mt-[0.8mm] truncate text-[7px] font-bold leading-none">
              {etiqueta.quantidadeNoVolume} un · {etiqueta.sequenciaSku} · {etiqueta.divergenciaId}
            </p>
          </div>
        </div>

        <div className="grid h-full place-items-center bg-bad text-white">
          <div className="flex -rotate-90 items-center gap-[1mm] whitespace-nowrap">
            <span className="text-[9px] font-black uppercase tracking-normal">APARTAR</span>
            <span className="text-[6px] font-semibold uppercase tracking-normal">ADM</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: Tone }) {
  const toneClass: Record<Tone, string> = {
    ok: 'bg-ok-50 text-ok',
    warn: 'bg-warn-50 text-warn',
    bad: 'bg-bad-50 text-bad',
    info: 'bg-info-50 text-info',
    neutral: 'bg-slate-100 text-ink-soft',
    primary: 'bg-primary-50 text-primary',
    accent: 'bg-accent-50 text-accent',
  }
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-ink-muted">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-brand mono">{value.toLocaleString('pt-BR')}</p>
        </div>
        <span className={cn('grid h-10 w-10 place-items-center rounded-xl', toneClass[tone])}>{icon}</span>
      </div>
    </div>
  )
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-sub px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mono mt-0.5 truncate text-xs font-semibold text-brand">{value}</p>
    </div>
  )
}

function Detail({ icon, label, value, mono }: { icon: ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface-sub px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-ink-muted">
        {icon}
        <span>{label}</span>
      </div>
      <p className={cn('mt-1 truncate text-sm font-semibold text-brand', mono && 'mono text-xs')}>{value}</p>
    </div>
  )
}
