import assert from 'node:assert/strict'
import { separarEtiquetasParaMontagem } from '../src/lib/montagemDivergencia.ts'
import type { EtiquetaVolume } from '../src/lib/etiquetas.ts'
import type { EtiquetaDivergente, RegistroDivergenciaEtiqueta } from '../src/lib/divergenciaEtiquetagem.ts'

const etiqueta = (id: string, skuCodigo = 'SKU-A'): EtiquetaVolume => ({
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

const devolucao: EtiquetaDivergente = {
  ...etiqueta('DEV-1', 'SKU-DEV'),
  divergenciaId: 'DIV-2',
  tipoDivergencia: 'faltou-etiqueta',
  tituloDivergencia: 'DEVOLUCAO',
  instrucao: 'Produto excedente: aplicar etiqueta DEVOLUCAO.',
}

const registroBase = {
  viagemId: 'VIA-1',
  recebimentoId: 'REC-1',
  usuario: 'Teste',
  quandoIso: '2026-06-29T10:00:00.000Z',
  itens: [],
  envioAdministrativo: {
    status: 'enviado-mock',
    destino: 'Administrativo / Tratativa fiscal',
    recebimentoId: 'REC-1',
    documento: 'NF-1',
    fornecedor: 'Fornecedor',
    owner: 'Owner',
  },
} satisfies Omit<RegistroDivergenciaEtiqueta, 'id' | 'tipo' | 'etiquetasCanceladasIds' | 'etiquetasGeradas'>

const resultado = separarEtiquetasParaMontagem(
  [etiqueta('ETQ-1'), etiqueta('ETQ-2'), etiqueta('ETQ-3')],
  [
    {
      ...registroBase,
      id: 'DIV-1',
      tipo: 'sobrou-etiqueta',
      etiquetasCanceladasIds: ['ETQ-2'],
      etiquetasGeradas: [],
    },
    {
      ...registroBase,
      id: 'DIV-2',
      tipo: 'faltou-etiqueta',
      etiquetasCanceladasIds: [],
      etiquetasGeradas: [devolucao],
    },
  ],
)

assert.deepEqual(
  resultado.normais.map((item) => item.id),
  ['ETQ-1', 'ETQ-3'],
  'montagem normal deve excluir etiquetas sobrando por produto a menos',
)

assert.deepEqual(
  resultado.devolucao.map((item) => item.id),
  ['DEV-1'],
  'montagem deve manter etiquetas DEVOLUCAO em lista separada',
)
