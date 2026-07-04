import assert from 'node:assert/strict'
import {
  avaliarTrackingEncomenda,
  trackingEncomendaDemo,
} from '../src/lib/trackingEncomenda.ts'

const unidade = trackingEncomendaDemo.unidades[0]
const plano = trackingEncomendaDemo.plano.filter((item) => item.unitId === unidade.id)
const eventos = trackingEncomendaDemo.eventos.filter((item) => item.unitId === unidade.id)

const emSaoPauloNoDia18 = avaliarTrackingEncomenda({
  unidade,
  plano,
  eventos,
  agora: '2026-06-18T12:00:00-03:00',
})

assert.equal(
  emSaoPauloNoDia18.status,
  'no_prazo',
  'pallet previsto para Sao Paulo em 18/06 deve estar no prazo quando localizado em Sao Paulo',
)
assert.equal(emSaoPauloNoDia18.localEsperado?.nome, 'CD Sao Paulo')
assert.equal(emSaoPauloNoDia18.localAtual?.nome, 'CD Sao Paulo')

const aindaEmSaoPauloNoDia20 = avaliarTrackingEncomenda({
  unidade,
  plano,
  eventos,
  agora: '2026-06-20T12:00:00-03:00',
})

assert.equal(
  aindaEmSaoPauloNoDia20.status,
  'local_incorreto_risco_sla',
  'pallet ainda em Sao Paulo em 20/06, quando deveria estar em Curitiba, deve gerar risco de SLA',
)
assert.equal(aindaEmSaoPauloNoDia20.localEsperado?.nome, 'CD Curitiba')
assert.equal(aindaEmSaoPauloNoDia20.proximaAcao, 'abrir_ocorrencia_sla_cliente')

const cobradoComoExtravio = avaliarTrackingEncomenda({
  unidade,
  plano,
  eventos,
  agora: '2026-06-20T12:00:00-03:00',
  reclamacaoCliente: 'extravio',
})

assert.equal(
  cobradoComoExtravio.status,
  'cobranca_contestavel_carga_localizada',
  'cobranca de extravio deve ser contestavel quando existe localizacao confirmada',
)
assert.equal(cobradoComoExtravio.geraIndenizacaoAutomatica, false)
