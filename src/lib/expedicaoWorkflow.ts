export {
  CARGAS_EXPEDICAO,
  DEMO_EXPEDITION_MOBILE_EVENTS,
  MARGEM_CUBAGEM_EXPEDICAO,
  aplicarEventoMobileExpedicao,
  avaliarChecklistEmbarque,
  avaliarConferenciaExpedicao,
  calcularResumoCargaExpedicao,
  criarRequisicaoBipagemExpedicao,
} from '../shared-demo/expedicao.ts'

export type {
  DemoExpeditionLoad as CargaExpedicao,
  DemoExpeditionLoadStatus as StatusCargaExpedicao,
  DemoExpeditionVehicleCondition as CondicaoVeiculo,
  DemoExpeditionVolume as VolumeExpedicao,
} from '../shared-demo/types.ts'

export type {
  DemoShipmentChecklist as ChecklistEmbarque,
} from '../shared-demo/expedicao.ts'
