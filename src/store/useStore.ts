import { create } from 'zustand'
import { disconnect as wmsDisconnect, isConnected as wmsIsConnected } from '../lib/wmsApi'
import {
  CONFIGURACAO_PALLETS,
  CONTAGENS,
  empresaSkuName,
  ESTOQUE,
  EVENTOS_OPERACIONAIS,
  OCORRENCIAS_OPERACIONAIS,
  PEDIDOS,
  RECEBIMENTOS,
  ROMANEIOS,
  SKU_CONTROLE,
  SKU_CONTROLE_HISTORICO,
  TAREFAS,
} from '../lib/mock'
import { ORDEM_CLASSIFICACAO_DESTINO_ENDERECAMENTO } from '../lib/skuControle'
import { DEFAULT_ZPL_PRINTER_CONFIG, normalizarZplPrinterConfig } from '../lib/printerConfig'
import type { RegistroDivergenciaEtiqueta } from '../lib/divergenciaEtiquetagem'
import type {
  ConfiguracaoPallets,
  ContagemItem,
  Ocorrencia,
  OperationalEvent,
  OperationalOccurrence,
  OccurrenceStatus,
  Pedido,
  PosicaoEstoque,
  Recebimento,
  Romaneio,
  SkuControle,
  SkuControleHistorico,
  SkuControleInput,
  Tarefa,
  Vertente,
} from '../lib/types'
import type { ZplPrinterConfig } from '../lib/zpl'

export interface Toast {
  id: number
  tipo: 'sucesso' | 'erro' | 'info' | 'aviso'
  titulo: string
  texto?: string
}

interface State {
  // sessão
  autenticado: boolean
  usuario: string
  perfil: Vertente
  cdId: string
  ownerId: string
  // dados
  recebimentos: Recebimento[]
  estoque: PosicaoEstoque[]
  tarefas: Tarefa[]
  pedidos: Pedido[]
  contagens: ContagemItem[]
  romaneios: Romaneio[]
  skusControle: SkuControle[]
  skuControleHistorico: SkuControleHistorico[]
  ocorrenciasOperacionais: OperationalOccurrence[]
  eventosOperacionais: OperationalEvent[]
  divergenciasEtiquetagem: RegistroDivergenciaEtiqueta[]
  configuracaoPallets: ConfiguracaoPallets
  zplPrinterConfig: ZplPrinterConfig
  toasts: Toast[]

  // ações de sessão
  login: (perfil: Vertente, usuario: string) => void
  logout: () => void
  setCd: (id: string) => void
  setOwner: (id: string) => void

  // toasts
  toast: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void

  // recebimento
  conferirItem: (recId: string, sku: string, contado: number) => void
  registrarOcorrencia: (recId: string, sku: string, oc: Ocorrencia) => void
  concluirRecebimento: (recId: string) => void

  // tarefas
  criarTarefa: (input: Omit<Tarefa, 'id' | 'status'> & { status?: Tarefa['status'] }) => string
  assumirTarefa: (id: string, operador: string) => void
  concluirTarefa: (id: string) => void
  reportarProblemaTarefa: (id: string, problema: string) => void
  alterarStatusTarefa: (id: string, status: Tarefa['status']) => void

  // ocorrências
  assumirOcorrencia: (id: string) => void
  alterarStatusOcorrencia: (id: string, status: OccurrenceStatus, message: string) => void
  liberarComRessalva: (id: string, motivo: string) => void
  solicitarFotoOcorrencia: (id: string) => void
  pedirRecontagemOcorrencia: (id: string) => void
  encerrarOcorrencia: (id: string, motivo: string) => void
  registrarDivergenciaEtiquetagem: (registro: RegistroDivergenciaEtiqueta) => void

  // contagem
  registrarContagem: (id: string, valor: number) => void
  recontar: (id: string, valor: number) => void
  aprovarAjuste: (id: string) => void

  // pedido / packing
  conferirVolume: (pedidoId: string, sku: string) => void
  expedirPedido: (pedidoId: string) => void

  // controle SKU
  criarSkuControle: (input: SkuControleInput) => string
  atualizarSkuControle: (id: string, input: SkuControleInput) => boolean

  // configuração operacional
  atualizarConfiguracaoPallets: (input: Pick<ConfiguracaoPallets, 'total' | 'minimoLivre'>) => void
  atualizarZplPrinterConfig: (input: ZplPrinterConfig) => void
}

let toastSeq = 1
let tarefaSeq = 9800
let eventoSeq = 9800
let skuControleSeq = 2000
let skuControleHistoricoSeq = 2000

const novoEvento = (
  objectId: string,
  eventType: string,
  message: string,
  userId: string,
): OperationalEvent => ({
  id: `evt-${++eventoSeq}`,
  objectType: 'occurrence',
  objectId,
  eventType,
  message,
  userId,
  timestamp: new Date().toISOString(),
})

const skuControleCampos = [
  ['ownerId', 'Owner'],
  ['empresaId', 'Empresa'],
  ['codigo', 'Código'],
  ['descricao', 'Descrição'],
  ['tipo', 'Tipo'],
  ['skuUnidadeConteudo', 'SKU unidade conteúdo'],
  ['unidadesPorCaixa', 'Unidades por caixa'],
  ['comprimentoCm', 'Comprimento'],
  ['larguraCm', 'Largura'],
  ['alturaCm', 'Altura'],
  ['cubagemM3', 'Cubagem'],
] as const satisfies readonly [keyof SkuControleInput, string][]

const normalizarValorSkuControle = (valor: SkuControleInput[keyof SkuControleInput]) =>
  valor === null || valor === undefined ? '' : String(valor)

const formatarValorSkuControle = (
  campo: keyof SkuControleInput,
  valor: SkuControleInput[keyof SkuControleInput],
) => {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (campo === 'empresaId') return empresaSkuName(String(valor))
  if (campo === 'tipo') return valor === 'caixa-matriz' ? 'Caixa matriz' : 'Unidade'
  if (campo === 'cubagemM3' && typeof valor === 'number') {
    return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 6 })} m³`
  }
  if (
    (campo === 'comprimentoCm' || campo === 'larguraCm' || campo === 'alturaCm') &&
    typeof valor === 'number'
  ) {
    return `${valor.toLocaleString('pt-BR')} cm`
  }
  return String(valor)
}

const novoHistoricoSku = (
  sku: SkuControle,
  acao: SkuControleHistorico['acao'],
  usuario: string,
  quando: string,
  resumo: string,
  alteracoes: SkuControleHistorico['alteracoes'],
): SkuControleHistorico => ({
  id: `sku-hist-${++skuControleHistoricoSeq}`,
  skuId: sku.id,
  skuCodigo: sku.codigo,
  acao,
  usuario,
  quando,
  resumo,
  alteracoes,
})

// Sessão de UI persistida: o refresh NÃO pode deslogar a torre (a conexão real
// com o spoke já persiste em localStorage — `wms.session` do wmsApi; aqui é o
// flag de UI que faltava persistir).
const AUTH_KEY = 'wms.ui.auth'
interface AuthSnapshot {
  usuario: string
  perfil: State['perfil']
  ownerId: string
}
const savedAuth: AuthSnapshot | null = (() => {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) ?? 'null')
  } catch {
    return null
  }
})()

export const useStore = create<State>((set, get) => ({
  // Sessão de UI só vale acompanhada da sessão real do spoke (decisão 10/07:
  // sem modo demo — "logado vendo mock" deixou de existir).
  autenticado: !!savedAuth && wmsIsConnected(),
  usuario: savedAuth?.usuario ?? '',
  perfil: savedAuth?.perfil ?? 'ecommerce',
  cdId: 'cd-sp',
  ownerId: savedAuth?.ownerId ?? 'own-all',

  recebimentos: structuredClone(RECEBIMENTOS),
  estoque: structuredClone(ESTOQUE),
  tarefas: structuredClone(TAREFAS),
  pedidos: structuredClone(PEDIDOS),
  contagens: structuredClone(CONTAGENS),
  romaneios: structuredClone(ROMANEIOS),
  skusControle: structuredClone(SKU_CONTROLE),
  skuControleHistorico: structuredClone(SKU_CONTROLE_HISTORICO),
  ocorrenciasOperacionais: structuredClone(OCORRENCIAS_OPERACIONAIS),
  eventosOperacionais: structuredClone(EVENTOS_OPERACIONAIS),
  divergenciasEtiquetagem: [],
  configuracaoPallets: structuredClone(CONFIGURACAO_PALLETS),
  zplPrinterConfig: structuredClone(DEFAULT_ZPL_PRINTER_CONFIG),
  toasts: [],

  login: (perfil, usuario) => {
    const ownerId = perfil === '3pl' ? 'own-all' : 'own-nano'
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify({ usuario, perfil, ownerId }))
    } catch { /* storage indisponível: segue só em memória */ }
    set({ autenticado: true, perfil, usuario, ownerId })
  },
  logout: () => {
    try {
      localStorage.removeItem(AUTH_KEY)
    } catch { /* ignore */ }
    // Deslogar desloga de verdade: derruba também a sessão do spoke.
    wmsDisconnect()
    set({ autenticado: false, usuario: '' })
  },
  setCd: (id) => set({ cdId: id }),
  setOwner: (id) => set({ ownerId: id }),

  toast: (t) => {
    const id = toastSeq++
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => get().dismiss(id), 4200)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  conferirItem: (recId, sku, contado) =>
    set((s) => ({
      recebimentos: s.recebimentos.map((r) =>
        r.id !== recId
          ? r
          : {
              ...r,
              status: 'em-conferencia',
              itens: r.itens.map((i) =>
                i.skuCodigo === sku ? { ...i, contado, conferido: true } : i,
              ),
            },
      ),
    })),

  registrarOcorrencia: (recId, sku, oc) =>
    set((s) => ({
      recebimentos: s.recebimentos.map((r) =>
        r.id !== recId
          ? r
          : {
              ...r,
              status: 'divergencia',
              itens: r.itens.map((i) =>
                i.skuCodigo === sku
                  ? { ...i, contado: oc.quantidadeReal, conferido: true, ocorrencia: oc }
                  : i,
              ),
            },
      ),
    })),

  concluirRecebimento: (recId) =>
    set((s) => ({
      recebimentos: s.recebimentos.map((r) =>
        r.id === recId
          ? {
              ...r,
              status: 'concluido',
              ordemExecucaoAtual: ORDEM_CLASSIFICACAO_DESTINO_ENDERECAMENTO,
            }
          : r,
      ),
    })),

  criarTarefa: (input) => {
    const id = `OS-${++tarefaSeq}`
    set((s) => ({
      tarefas: [
        ...s.tarefas,
        {
          ...input,
          id,
          status: input.status ?? 'a-fazer',
        },
      ],
    }))
    return id
  },

  assumirTarefa: (id, operador) =>
    set((s) => ({
      tarefas: s.tarefas.map((t) =>
        t.id === id ? { ...t, operador, status: 'fazendo', problema: undefined } : t,
      ),
    })),

  concluirTarefa: (id) =>
    set((s) => ({
      tarefas: s.tarefas.map((t) => (t.id === id ? { ...t, status: 'feito', problema: undefined } : t)),
    })),

  reportarProblemaTarefa: (id, problema) =>
    set((s) => ({
      tarefas: s.tarefas.map((t) => (t.id === id ? { ...t, status: 'problema', problema } : t)),
    })),

  alterarStatusTarefa: (id, status) =>
    set((s) => ({
      tarefas: s.tarefas.map((t) => (t.id === id ? { ...t, status } : t)),
    })),

  assumirOcorrencia: (id) =>
    set((s) => ({
      ocorrenciasOperacionais: s.ocorrenciasOperacionais.map((o) =>
        o.id === id ? { ...o, status: 'IN_TREATMENT', assignedTo: s.usuario || 'Supervisor demo' } : o,
      ),
      eventosOperacionais: [
        ...s.eventosOperacionais,
        novoEvento(id, 'occurrence.assigned', `Ocorrência assumida por ${s.usuario || 'Supervisor demo'}.`, s.usuario || 'supervisor-demo'),
      ],
    })),

  alterarStatusOcorrencia: (id, status, message) =>
    set((s) => ({
      ocorrenciasOperacionais: s.ocorrenciasOperacionais.map((o) => (o.id === id ? { ...o, status } : o)),
      eventosOperacionais: [
        ...s.eventosOperacionais,
        novoEvento(id, `occurrence.${status.toLowerCase()}`, message, s.usuario || 'supervisor-demo'),
      ],
    })),

  liberarComRessalva: (id, motivo) =>
    set((s) => {
      const occ = s.ocorrenciasOperacionais.find((o) => o.id === id)
      return {
        ocorrenciasOperacionais: s.ocorrenciasOperacionais.map((o) =>
          o.id === id
            ? {
                ...o,
                status: 'RESOLVED',
                blocksFlow: false,
                resolvedAt: new Date().toISOString(),
                resolutionCode: 'LIBERADO_COM_RESSALVA',
              }
            : o,
        ),
        tarefas: occ
          ? s.tarefas.map((t) =>
              t.id === occ.sourceTaskId ? { ...t, status: 'a-fazer', problema: undefined } : t,
            )
          : s.tarefas,
        eventosOperacionais: [
          ...s.eventosOperacionais,
          novoEvento(id, 'occurrence.released_with_reservation', `Liberado com ressalva: ${motivo}`, s.usuario || 'supervisor-demo'),
        ],
      }
    }),

  solicitarFotoOcorrencia: (id) =>
    set((s) => ({
      ocorrenciasOperacionais: s.ocorrenciasOperacionais.map((o) =>
        o.id === id ? { ...o, status: 'WAITING_PHOTO' } : o,
      ),
      eventosOperacionais: [
        ...s.eventosOperacionais,
        novoEvento(id, 'occurrence.photo_requested', 'Líder solicitou nova evidência fotográfica.', s.usuario || 'supervisor-demo'),
      ],
    })),

  pedirRecontagemOcorrencia: (id) =>
    set((s) => {
      const occ = s.ocorrenciasOperacionais.find((o) => o.id === id)
      const tarefaId = occ ? `OS-${++tarefaSeq}` : null
      const novaTarefa: Tarefa | null =
        occ && tarefaId
          ? {
              id: tarefaId,
              tipo: 'recontagem',
              prioridade: occ.severity === 'CRITICAL' || occ.severity === 'HIGH' ? 'alta' : 'media',
              operador: null,
              status: 'a-fazer',
              origem: occ.locationId ?? 'Endereco',
              destino: 'Aprovacao',
              sku: occ.productId ?? 'SKU',
              descricao: `Recontagem derivada da ocorrência ${occ.id}`,
              quantidade: 0,
              sla: '30 min',
              etapa: 'Recontagem por ocorrência',
              referenciaTipo: 'contagem',
              referenciaId: occ.id,
            }
          : null
      return {
        ocorrenciasOperacionais: s.ocorrenciasOperacionais.map((o) =>
          o.id === id ? { ...o, status: 'WAITING_SUPERVISOR' } : o,
        ),
        tarefas: novaTarefa ? [...s.tarefas, novaTarefa] : s.tarefas,
        eventosOperacionais: [
          ...s.eventosOperacionais,
          novoEvento(id, 'occurrence.recount_requested', `Recontagem solicitada${tarefaId ? `: ${tarefaId}` : ''}.`, s.usuario || 'supervisor-demo'),
        ],
      }
    }),

  encerrarOcorrencia: (id, motivo) =>
    set((s) => ({
      ocorrenciasOperacionais: s.ocorrenciasOperacionais.map((o) =>
        o.id === id
          ? {
              ...o,
              status: 'RESOLVED',
              blocksFlow: false,
              resolvedAt: new Date().toISOString(),
              resolutionCode: 'ENCERRADA',
            }
          : o,
      ),
      eventosOperacionais: [
        ...s.eventosOperacionais,
        novoEvento(id, 'occurrence.closed', `Ocorrência encerrada: ${motivo}`, s.usuario || 'supervisor-demo'),
      ],
    })),

  registrarDivergenciaEtiquetagem: (registro) =>
    set((s) => ({
      divergenciasEtiquetagem: [registro, ...s.divergenciasEtiquetagem],
    })),

  registrarContagem: (id, valor) =>
    set((s) => ({
      contagens: s.contagens.map((c) =>
        c.id !== id
          ? c
          : {
              ...c,
              contado: valor,
              status: valor === c.sistemico ? 'ok' : 'divergente',
            },
      ),
    })),

  recontar: (id, valor) =>
    set((s) => ({
      contagens: s.contagens.map((c) =>
        c.id !== id
          ? c
          : {
              ...c,
              recontagem: valor,
              status: valor === c.sistemico ? 'ok' : 'aguardando-aprovacao',
            },
      ),
    })),

  aprovarAjuste: (id) =>
    set((s) => ({
      contagens: s.contagens.map((c) => (c.id === id ? { ...c, status: 'ajustado' } : c)),
    })),

  conferirVolume: (pedidoId, sku) =>
    set((s) => ({
      pedidos: s.pedidos.map((p) =>
        p.id !== pedidoId
          ? p
          : {
              ...p,
              itens: p.itens.map((i) =>
                i.skuCodigo === sku
                  ? { ...i, conferido: Math.min(i.conferido + 1, i.quantidade) }
                  : i,
              ),
            },
      ),
    })),

  expedirPedido: (pedidoId) =>
    set((s) => ({
      pedidos: s.pedidos.map((p) =>
        p.id === pedidoId ? { ...p, status: 'expedido' } : p,
      ),
    })),

  criarSkuControle: (input) => {
    const usuario = get().usuario || 'Supervisor demo'
    const agora = new Date().toISOString()
    const id = `sku-ctrl-${++skuControleSeq}`
    const sku: SkuControle = {
      ...input,
      id,
      criadoPor: usuario,
      criadoEm: agora,
      atualizadoPor: usuario,
      atualizadoEm: agora,
    }
    const historico = novoHistoricoSku(
      sku,
      'criacao',
      usuario,
      agora,
      'SKU cadastrado manualmente.',
      skuControleCampos.map(([campo, label]) => ({
        campo: label,
        antes: '—',
        depois: formatarValorSkuControle(campo, sku[campo]),
      })),
    )

    set((s) => ({
      skusControle: [sku, ...s.skusControle],
      skuControleHistorico: [historico, ...s.skuControleHistorico],
    }))

    return id
  },

  atualizarSkuControle: (id, input) => {
    const atual = get().skusControle.find((sku) => sku.id === id)
    if (!atual) return false

    const alteracoes = skuControleCampos.flatMap(([campo, label]) => {
      const antes = atual[campo]
      const depois = input[campo]
      if (normalizarValorSkuControle(antes) === normalizarValorSkuControle(depois)) return []
      return [
        {
          campo: label,
          antes: formatarValorSkuControle(campo, antes),
          depois: formatarValorSkuControle(campo, depois),
        },
      ]
    })

    if (alteracoes.length === 0) return false

    const usuario = get().usuario || 'Supervisor demo'
    const agora = new Date().toISOString()
    const proximo: SkuControle = {
      ...atual,
      ...input,
      atualizadoPor: usuario,
      atualizadoEm: agora,
    }
    const historico = novoHistoricoSku(
      proximo,
      'edicao',
      usuario,
      agora,
      `${proximo.codigo} atualizado manualmente.`,
      alteracoes,
    )

    set((s) => ({
      skusControle: s.skusControle.map((sku) => (sku.id === id ? proximo : sku)),
      skuControleHistorico: [historico, ...s.skuControleHistorico],
    }))

    return true
  },

  atualizarConfiguracaoPallets: (input) => {
    const totalInput = Number.isFinite(input.total) ? input.total : 1
    const minimoInput = Number.isFinite(input.minimoLivre) ? input.minimoLivre : 0
    const total = Math.max(1, Math.floor(totalInput))
    const minimoLivre = Math.max(0, Math.min(total, Math.floor(minimoInput)))
    set((s) => ({
      configuracaoPallets: {
        total,
        minimoLivre,
        atualizadoPor: s.usuario || 'Supervisor demo',
        atualizadoEm: new Date().toISOString(),
      },
    }))
  },

  atualizarZplPrinterConfig: (input) => {
    set({ zplPrinterConfig: normalizarZplPrinterConfig(input) })
  },
}))
