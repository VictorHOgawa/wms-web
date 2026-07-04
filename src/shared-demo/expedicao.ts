import type {
  DemoExpeditionLoad,
  DemoExpeditionVehicleCondition,
  DemoExpeditionVolume,
  DemoOperationalEvent,
} from './types.ts'

export const MARGEM_CUBAGEM_EXPEDICAO = 0.2

export interface DemoExpeditionCapacity {
  capacidadeM3: number
  capacidadeKg: number
}

export interface DemoExpeditionSummary {
  totalVolumes: number
  totalPallets: number
  totalCtes: number
  cubagemM3: number
  cubagemReservadaM3: number
  pesoKg: number
  ocupacaoM3Percentual: number
  ocupacaoKgPercentual: number
  espacoLivreM3: number
  cabeNoVeiculo: boolean
}

export interface DemoExpeditionConference {
  status: 'conferida' | 'divergente'
  volumesBipados: number
  volumesPendentes: DemoExpeditionVolume[]
  divergencias: DemoExpeditionVolume[]
  mensagem: string
}

export interface DemoShipmentChecklist {
  placa: string
  motorista: string
  horario: string
  destino: string
  carga: string
  condicaoVeiculo: DemoExpeditionVehicleCondition
  fotoRegistrada: boolean
  observacao?: string
}

export interface DemoShipmentChecklistResult {
  status: 'incompleto' | 'aprovado' | 'recusado'
  proximaAcao: 'completar-checklist' | 'liberar-viagem' | 'disparar-frotas'
  mensagem: string
}

export interface DemoExpeditionScanRequest {
  cargaId: string
  tarefaId: string
  volumeId: string
  operadorId: string
  deviceId: string
  resultado: 'ok' | 'divergente' | 'duplicado' | 'volume-nao-esperado'
  timestamp: string
}

const round2 = (value: number) => Number(value.toFixed(2))

export function calcularResumoCargaExpedicao(
  volumes: DemoExpeditionVolume[],
  capacidade: DemoExpeditionCapacity,
): DemoExpeditionSummary {
  const cubagemM3 = round2(volumes.reduce((total, volume) => total + volume.cubagemM3, 0))
  const pesoKg = round2(volumes.reduce((total, volume) => total + volume.pesoKg, 0))
  const cubagemReservadaM3 = round2(cubagemM3 * (1 + MARGEM_CUBAGEM_EXPEDICAO))

  return {
    totalVolumes: volumes.length,
    totalPallets: new Set(volumes.map((volume) => volume.palletId)).size,
    totalCtes: new Set(volumes.map((volume) => volume.cte)).size,
    cubagemM3,
    cubagemReservadaM3,
    pesoKg,
    ocupacaoM3Percentual: round2((cubagemReservadaM3 / capacidade.capacidadeM3) * 100),
    ocupacaoKgPercentual: round2((pesoKg / capacidade.capacidadeKg) * 100),
    espacoLivreM3: round2(capacidade.capacidadeM3 - cubagemReservadaM3),
    cabeNoVeiculo: cubagemReservadaM3 <= capacidade.capacidadeM3 && pesoKg <= capacidade.capacidadeKg,
  }
}

export function avaliarConferenciaExpedicao(volumes: DemoExpeditionVolume[]): DemoExpeditionConference {
  const volumesPendentes = volumes.filter((volume) => !volume.bipado)
  const divergencias = volumes.filter((volume) => Boolean(volume.divergencia))
  const status = volumesPendentes.length || divergencias.length ? 'divergente' : 'conferida'

  return {
    status,
    volumesBipados: volumes.length - volumesPendentes.length,
    volumesPendentes,
    divergencias,
    mensagem:
      status === 'conferida'
        ? 'Itens e quantidades de acordo. Carga entra para expedicao.'
        : 'Divergencia mantida com o armazem ate regularizacao.',
  }
}

export function avaliarChecklistEmbarque(checklist: DemoShipmentChecklist): DemoShipmentChecklistResult {
  const camposObrigatorios = [
    checklist.placa,
    checklist.motorista,
    checklist.horario,
    checklist.destino,
    checklist.carga,
  ]

  if (camposObrigatorios.some((campo) => campo.trim() === '') || !checklist.fotoRegistrada) {
    return {
      status: 'incompleto',
      proximaAcao: 'completar-checklist',
      mensagem: 'Checklist precisa de placa, motorista, horario, destino, carga, condicao e foto.',
    }
  }

  if (checklist.condicaoVeiculo === 'recusado') {
    return {
      status: 'recusado',
      proximaAcao: 'disparar-frotas',
      mensagem: 'Veiculo recusado: prioridade maxima disparada para contratacao de frotas.',
    }
  }

  return {
    status: 'aprovado',
    proximaAcao: 'liberar-viagem',
    mensagem: 'Veiculo ok. Segue para viagem com comprovacoes do checklist.',
  }
}

export function criarRequisicaoBipagemExpedicao(input: DemoExpeditionScanRequest): DemoOperationalEvent {
  return {
    id: `evt-${input.tarefaId}-${input.volumeId}`.toLowerCase(),
    objectType: 'expedition_load',
    objectId: input.cargaId,
    eventType: input.resultado === 'ok' ? 'expedicao.volume_bipado' : 'expedicao.volume_divergente',
    message:
      input.resultado === 'ok'
        ? `Volume ${input.volumeId} bipado no APP.`
        : `Volume ${input.volumeId} gerou divergencia no APP: ${input.resultado}.`,
    payload: {
      origemApp: 'wms-mobile',
      tarefaId: input.tarefaId,
      volumeId: input.volumeId,
      resultado: input.resultado,
      deviceId: input.deviceId,
      syncStatus: 'SYNC_PENDING',
    },
    userId: input.operadorId,
    timestamp: input.timestamp,
  }
}

export function aplicarEventoMobileExpedicao(
  carga: DemoExpeditionLoad,
  evento: DemoOperationalEvent,
): DemoExpeditionLoad {
  if (evento.objectId !== carga.id) return carga
  const volumeId = typeof evento.payload?.volumeId === 'string' ? evento.payload.volumeId : ''
  const resultado = evento.payload?.resultado

  return {
    ...carga,
    volumes: carga.volumes.map((volume) =>
      volume.id !== volumeId
        ? volume
        : {
            ...volume,
            bipado: resultado === 'ok' ? true : volume.bipado,
            divergencia: resultado === 'ok' ? undefined : `Evento APP: ${String(resultado)}`,
          },
    ),
  }
}

export const CARGAS_EXPEDICAO: DemoExpeditionLoad[] = [
  {
    id: 'CG-4421',
    coletaId: 'COL-4421',
    romaneioId: 'ROM-3301',
    destino: 'SP-Capital',
    destinoOperacional: 'cross-docking',
    transportadora: 'Correios',
    veiculo: 'Van leve',
    placa: 'PLT-2D45',
    motorista: 'Diego Souza',
    horario: '10:30',
    doca: 'DOCA-03',
    status: 'conferencia',
    capacidadeM3: 8.5,
    capacidadeKg: 650,
    tarefaConferenciaId: 'T-EXP-CONF-4421',
    tarefaCarregamentoId: 'T-EXP-CAR-4421',
    origem: {
      tipo: 'montagem',
      montagemId: 'MNT-2041',
      recebimentoId: 'REC-2041',
      palletA4Id: 'PAL-2041-01',
      anexadoEm: '2026-06-29T09:45:00-03:00',
    },
    volumes: [
      { id: 'VOL-77119-1', pedidoId: 'PED-77119', cte: 'CTE-9001', palletId: 'PAL-2041-01', cubagemM3: 0.18, pesoKg: 0.3, bipado: true, descricao: 'Carregador Turbo 30W', staging: 'STG-XD-03' },
      { id: 'VOL-77120-1', pedidoId: 'PED-77120', cte: 'CTE-9001', palletId: 'PAL-2041-01', cubagemM3: 0.32, pesoKg: 1.2, bipado: true, descricao: 'Fone Bluetooth + cabo USB-C', staging: 'STG-XD-03' },
      { id: 'VOL-77121-1', pedidoId: 'PED-77121', cte: 'CTE-9002', palletId: 'PAL-2041-02', cubagemM3: 0.2, pesoKg: 0.4, bipado: false, descricao: 'Serum Vitamina C 30ml', staging: 'STG-XD-03' },
    ],
  },
  {
    id: 'CG-4422',
    coletaId: 'PUT-2042',
    romaneioId: 'END-2042',
    destino: 'Pulmao Verde Alimentos',
    destinoOperacional: 'enderecamento',
    transportadora: 'Movimentacao interna',
    veiculo: 'Empilhadeira',
    placa: 'INT-0001',
    motorista: 'Operador interno',
    horario: '12:40',
    doca: 'PUL-A',
    status: 'anexada-destino',
    capacidadeM3: 26,
    capacidadeKg: 3500,
    tarefaConferenciaId: 'T-END-CONF-2042',
    tarefaCarregamentoId: 'T-END-MOV-2042',
    origem: {
      tipo: 'montagem',
      montagemId: 'MNT-2042',
      recebimentoId: 'REC-2042',
      palletA4Id: 'PAL-2042-01',
      anexadoEm: '2026-06-29T10:15:00-03:00',
    },
    volumes: [
      { id: 'VOL-77122-1', pedidoId: 'PED-77122', cte: 'CTE-9010', palletId: 'PAL-2042-01', cubagemM3: 1.8, pesoKg: 8.5, bipado: false, descricao: 'Azeite Extra Virgem 500ml', staging: 'STG-END-04' },
      { id: 'VOL-77122-2', pedidoId: 'PED-77122', cte: 'CTE-9010', palletId: 'PAL-2042-01', cubagemM3: 1.6, pesoKg: 5, bipado: false, descricao: 'Grao de Bico 1kg', staging: 'STG-END-04' },
    ],
  },
]

export const DEMO_EXPEDITION_MOBILE_EVENTS: DemoOperationalEvent[] = [
  criarRequisicaoBipagemExpedicao({
    cargaId: 'CG-4421',
    tarefaId: 'T-EXP-CONF-4421',
    volumeId: 'VOL-77119-1',
    operadorId: 'usr-1',
    deviceId: 'dev-1',
    resultado: 'ok',
    timestamp: '2026-06-29T09:52:00-03:00',
  }),
  criarRequisicaoBipagemExpedicao({
    cargaId: 'CG-4421',
    tarefaId: 'T-EXP-CONF-4421',
    volumeId: 'VOL-77120-1',
    operadorId: 'usr-1',
    deviceId: 'dev-1',
    resultado: 'ok',
    timestamp: '2026-06-29T09:54:00-03:00',
  }),
]
