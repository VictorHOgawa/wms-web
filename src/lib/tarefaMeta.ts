import type { Tarefa, TipoTarefa } from './types'

export const TIPO_TAREFA_LABEL: Record<TipoTarefa, string> = {
  recebimento: 'Recebimento',
  putaway: 'Putaway',
  picking: 'Picking',
  packing: 'Packing',
  carregamento: 'Carregamento',
  reabastecimento: 'Reabastecimento',
  contagem: 'Contagem',
  recontagem: 'Recontagem',
  divergencia: 'Divergência',
  'cross-docking': 'Cross-docking',
}

export const STATUS_TAREFA_LABEL: Record<Tarefa['status'], string> = {
  'a-fazer': 'A fazer',
  fazendo: 'Fazendo',
  feito: 'Feito',
  problema: 'Problemas',
}

export function tipoTarefaLabel(tipo: TipoTarefa) {
  return TIPO_TAREFA_LABEL[tipo]
}

export function statusTarefaLabel(status: Tarefa['status']) {
  return STATUS_TAREFA_LABEL[status]
}
