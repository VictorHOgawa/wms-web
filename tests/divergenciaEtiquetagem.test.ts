import assert from 'node:assert/strict'
import {
  destinoDaDivergencia,
  deveGerarEtiquetaDivergente,
  selecionarEtiquetasCanceladasPorSobra,
  tituloEtiquetaDivergente,
  type ItemDivergenciaEtiqueta,
} from '../src/lib/divergenciaEtiquetagem.ts'
import type { EtiquetaVolume } from '../src/lib/etiquetas.ts'

const etiqueta = (id: string, skuCodigo: string): EtiquetaVolume => ({
  id,
  viagemId: 'VIA-1',
  recebimentoId: 'REC-1',
  skuCodigo,
  descricao: `Produto ${skuCodigo}`,
  tipoEmbalagem: 'unidade',
  quantidadeNoVolume: 1,
  sequencia: '1/1',
  sequenciaSku: '1/1',
  emissaoIso: '2026-06-29T10:00:00.000Z',
  origemDestino: 'GRU/RIO',
  embarcador: 'Fornecedor',
  nf: 'NF-1',
  cte: 'CTE-1',
  kg: '1 kg',
  kgValor: 1,
  destinatario: 'Destinatario',
  endereco: 'Rua Teste',
})

assert.equal(
  destinoDaDivergencia('sobrou-etiqueta'),
  'administrativo',
  'sobrou etiqueta significa produto a menos e segue para tratativa administrativa',
)

assert.equal(
  deveGerarEtiquetaDivergente('sobrou-etiqueta'),
  false,
  'sobrou etiqueta nao deve gerar etiqueta vermelha porque nao existe volume fisico excedente',
)

assert.equal(
  destinoDaDivergencia('faltou-etiqueta'),
  'devolucao',
  'faltou etiqueta significa produto fisico excedente e segue para devolucao',
)

assert.equal(
  tituloEtiquetaDivergente('faltou-etiqueta'),
  'DEVOLUCAO',
  'a etiqueta vermelha de item fisico excedente deve ter titulo DEVOLUCAO',
)

const itens: ItemDivergenciaEtiqueta[] = [
  { skuCodigo: 'SKU-A', descricao: 'Produto A', quantidade: 2 },
]

assert.deepEqual(
  selecionarEtiquetasCanceladasPorSobra(
    [etiqueta('ETQ-1', 'SKU-A'), etiqueta('ETQ-2', 'SKU-B'), etiqueta('ETQ-3', 'SKU-A')],
    itens,
  ),
  ['ETQ-1', 'ETQ-3'],
  'deve cancelar a quantidade informada de etiquetas sobrando para o SKU selecionado',
)
