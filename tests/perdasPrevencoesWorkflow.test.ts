import assert from 'node:assert/strict'
import {
  aprovarCasoPp,
  decidirCasoPp,
  enviarCasoPpParaFinanceiro,
  importarCobrancaPpCsv,
  montarDossiePp,
} from '../src/lib/perdasPrevencoesWorkflow.ts'
import { trackingEncomendaDemo } from '../src/lib/trackingEncomenda.ts'

const csv = [
  'cte,nf,pedido,sku,volume,pallet,valorNf,valorReclamado',
  'CTE-789,NF-456,PED-123,SKU-123,VOL-123-1,PAL-001,980,980',
  'CTE-789,NF-456,PED-123,SKU-123,VOL-123-1,PAL-001,980,980',
  'CTE-999,NF-999,PED-999,SKU-999,VOL-999-1,PAL-999,120,120',
].join('\n')

const csvClienteMinimo = [
  'cte,nf,pedido,valorReclamado,motivoCliente',
  'CTE-789,NF-456,PED-123,980,Extravio informado pelo cliente',
].join('\n')

const importacao = importarCobrancaPpCsv({
  arquivoNome: 'carta-1236.csv',
  clientePagador: 'Petlog',
  numeroDocumento: 'Carta 1236',
  tipoDocumento: 'carta-debito',
  vencimento: '2026-07-05',
  conteudo: csv,
})

assert.equal(importacao.cobranca.status, 'importada_com_divergencia')
assert.equal(importacao.cobranca.itens.length, 3)
assert.equal(importacao.cobranca.itens[0].statusLeitura, 'encontrado')
assert.equal(importacao.cobranca.itens[1].statusLeitura, 'duplicado')
assert.equal(importacao.cobranca.itens[2].statusLeitura, 'nao_encontrado')
assert.equal(importacao.caso.status, 'aguardando_analise')

const dossie = montarDossiePp({
  caso: importacao.caso,
  cobranca: importacao.cobranca,
  tracking: trackingEncomendaDemo,
  agora: '2026-06-20T12:00:00-03:00',
})

assert.equal(dossie.itens[0].tracking.status, 'local_incorreto_risco_sla')
assert.equal(dossie.itens[0].sugestaoDecisao, 'aguardar_evidencia')
assert.equal(dossie.itens[0].responsavelProvavel, 'CD Curitiba')
assert.equal(dossie.resumo.itensSemEvidencia, 1)
assert.equal(dossie.resumo.valorSugerido, 0)
assert.equal(
  dossie.itens[0].tracking.geraIndenizacaoAutomatica,
  false,
  'carga localizada em local errado com risco de SLA nao deve gerar indenizacao automatica',
)

assert.throws(
  () => enviarCasoPpParaFinanceiro(importacao.caso),
  /Caso precisa estar aprovado/,
  'financeiro so recebe processo decidido e aprovado',
)

const decidido = decidirCasoPp({
  caso: importacao.caso,
  decisao: 'parcial',
  valorAprovado: 980,
  responsavelFinanceiro: 'CD Curitiba',
  justificativa: 'Carga localizada fora do ponto esperado em janela de destino.',
})

assert.equal(decidido.status, 'aguardando_aprovacao')
assert.equal(decidido.valorAcatado, 980)

const aprovado = aprovarCasoPp({
  caso: decidido,
  aprovador: 'Aprovador de alcada',
  justificativa: 'Valor dentro da regra de alçada para tratativa parcial.',
})

assert.equal(aprovado.status, 'aprovado')
assert.equal(aprovado.aprovacoes.length, 1)

const financeiro = enviarCasoPpParaFinanceiro(aprovado)

assert.equal(financeiro.status, 'pendente_lancamento')
assert.equal(financeiro.valorAprovado, 980)
assert.equal(financeiro.debitoContra, 'CD Curitiba')

const importacaoMinima = importarCobrancaPpCsv({
  arquivoNome: 'carta-cliente-minima.csv',
  clientePagador: 'Petlog',
  numeroDocumento: 'Carta cliente minima',
  tipoDocumento: 'carta-debito',
  vencimento: '2026-07-05',
  conteudo: csvClienteMinimo,
})

assert.equal(
  importacaoMinima.cobranca.itens[0].statusLeitura,
  'encontrado',
  'planilha do cliente com CTE/NF/pedido deve ser enriquecida automaticamente pelo WMS',
)
assert.equal(importacaoMinima.cobranca.itens[0].sku, 'SKU-123')
assert.equal(importacaoMinima.cobranca.itens[0].volume, 'VOL-123-1')
assert.equal(importacaoMinima.cobranca.itens[0].pallet, 'PAL-001')
assert.equal(importacaoMinima.cobranca.itens[0].valorNf, 980)
assert.equal(importacaoMinima.cobranca.itens[0].motivoCliente, 'Extravio informado pelo cliente')

const dossieMinimo = montarDossiePp({
  caso: importacaoMinima.caso,
  cobranca: importacaoMinima.cobranca,
  tracking: trackingEncomendaDemo,
  agora: '2026-06-20T12:00:00-03:00',
})

assert.equal(dossieMinimo.resumo.totalItens, 1)
assert.equal(dossieMinimo.resumo.itensSemEvidencia, 0)
assert.equal(dossieMinimo.itens[0].fontesAutomaticas.includes('WMS/checklists'), true)
assert.equal(dossieMinimo.itens[0].fontesAutomaticas.includes('Fiscal/NF'), true)
assert.equal(
  dossieMinimo.itens[0].diagnosticoOperacional,
  'Carga localizada fora do ponto esperado; corrigir ou tratar SLA antes de indenizar.',
)
