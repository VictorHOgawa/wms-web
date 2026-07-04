import assert from 'node:assert/strict'
import {
  CARGAS_EXPEDICAO,
  MARGEM_CUBAGEM_EXPEDICAO,
  aplicarEventoMobileExpedicao,
  avaliarChecklistEmbarque,
  avaliarConferenciaExpedicao,
  calcularResumoCargaExpedicao,
  criarRequisicaoBipagemExpedicao,
  type ChecklistEmbarque,
  type VolumeExpedicao,
} from '../src/lib/expedicaoWorkflow.ts'

const volumes: VolumeExpedicao[] = [
  { id: 'VOL-1', pedidoId: 'PED-1', cte: 'CTE-10', palletId: 'PLT-1', cubagemM3: 1.2, pesoKg: 120, bipado: true },
  { id: 'VOL-2', pedidoId: 'PED-1', cte: 'CTE-10', palletId: 'PLT-1', cubagemM3: 0.8, pesoKg: 80, bipado: true },
  { id: 'VOL-3', pedidoId: 'PED-2', cte: 'CTE-11', palletId: 'PLT-2', cubagemM3: 0.5, pesoKg: 50, bipado: false },
]

const resumo = calcularResumoCargaExpedicao(volumes, { capacidadeM3: 3.2, capacidadeKg: 1200 })

assert.equal(MARGEM_CUBAGEM_EXPEDICAO, 0.2, 'deve reservar 20% da cubagem como margem operacional')
assert.equal(resumo.totalVolumes, 3, 'deve somar todos os volumes da carga')
assert.equal(resumo.totalPallets, 2, 'deve contar pallets distintos')
assert.equal(resumo.totalCtes, 2, 'deve contar CTEs distintos')
assert.equal(resumo.cubagemM3, 2.5, 'deve somar a cubagem fisica')
assert.equal(resumo.cubagemReservadaM3, 3, 'deve aplicar margem de 20% sobre a cubagem')
assert.equal(resumo.cabeNoVeiculo, true, 'deve validar capacidade com a cubagem reservada')

assert.deepEqual(
  avaliarConferenciaExpedicao(volumes).status,
  'divergente',
  'volume pendente de bipagem deve manter o problema com o armazem',
)

const checklistOk: ChecklistEmbarque = {
  placa: 'ABC-1D23',
  motorista: 'Carlos Lima',
  horario: '10:30',
  destino: 'SP-Capital',
  carga: 'ROM-3301',
  condicaoVeiculo: 'ok',
  fotoRegistrada: true,
}

assert.equal(
  avaliarChecklistEmbarque(checklistOk).proximaAcao,
  'liberar-viagem',
  'veiculo apto e checklist completo deve liberar a viagem',
)

assert.equal(
  avaliarChecklistEmbarque({ ...checklistOk, condicaoVeiculo: 'recusado' }).proximaAcao,
  'disparar-frotas',
  'veiculo recusado deve disparar prioridade maxima para frotas',
)

const cargaMontagem = CARGAS_EXPEDICAO[0]

assert.equal(
  cargaMontagem.origem.tipo,
  'montagem',
  'a carga de expedicao deve nascer da montagem aprovada no WMS',
)

assert.equal(
  cargaMontagem.destinoOperacional,
  'cross-docking',
  'carga com saida direta deve ser anexada ao fluxo de cross-docking',
)

const requisicaoBipagem = criarRequisicaoBipagemExpedicao({
  cargaId: cargaMontagem.id,
  tarefaId: cargaMontagem.tarefaConferenciaId,
  volumeId: cargaMontagem.volumes[2].id,
  operadorId: 'usr-1',
  deviceId: 'dev-1',
  resultado: 'ok',
  timestamp: '2026-06-29T10:05:00-03:00',
})

assert.equal(
  requisicaoBipagem.eventType,
  'expedicao.volume_bipado',
  'bipagem no APP deve gerar evento para o WEB consumir',
)

assert.equal(
  requisicaoBipagem.payload?.origemApp,
  'wms-mobile',
  'evento de bipagem deve identificar que veio do APP',
)

assert.equal(
  aplicarEventoMobileExpedicao(cargaMontagem, requisicaoBipagem).volumes[2].bipado,
  true,
  'WEB deve conseguir aplicar a requisicao do APP na conferencia da carga',
)
