import assert from 'node:assert/strict'
import {
  aplicarOrdemManualPallets,
  removerRequisicoesDoRecebimento,
  reordenarIdsPallets,
  selecionarMontagemPorClique,
} from '../src/lib/montagemSelection.ts'

const planejamentos = [
  { row: { viagem: { id: 'VIA-1' }, recebimento: { id: 'REC-1' } } },
  { row: { viagem: { id: 'VIA-2' }, recebimento: { id: 'REC-2' } } },
]

assert.equal(
  selecionarMontagemPorClique(planejamentos, ''),
  null,
  'nao deve selecionar uma montagem automaticamente antes do clique no recebimento',
)

assert.equal(
  selecionarMontagemPorClique(planejamentos, 'REC-2'),
  planejamentos[1],
  'deve selecionar a montagem vinculada ao recebimento/descarga clicado',
)

assert.equal(
  selecionarMontagemPorClique(planejamentos, 'REC-INEXISTENTE'),
  null,
  'deve limpar o detalhe quando o recebimento selecionado nao esta no filtro atual',
)

const requisicoes = {
  'REC-1': [{ id: 'PRINT-1' }],
  'REC-2': [{ id: 'PRINT-2' }],
}

assert.deepEqual(
  removerRequisicoesDoRecebimento(requisicoes, 'REC-1'),
  { 'REC-2': [{ id: 'PRINT-2' }] },
  'deve remover somente as requisicoes do recebimento reiniciado',
)

assert.notEqual(
  removerRequisicoesDoRecebimento(requisicoes, 'REC-1'),
  requisicoes,
  'deve retornar um novo objeto para atualizar o estado da tela',
)

const pallets = [{ id: 'PAL-1' }, { id: 'PAL-2' }, { id: 'PAL-3' }]

assert.deepEqual(
  reordenarIdsPallets(['PAL-1', 'PAL-2', 'PAL-3'], 'PAL-3', 'up'),
  ['PAL-1', 'PAL-3', 'PAL-2'],
  'deve mover o pallet uma posicao para cima na ordem manual',
)

assert.deepEqual(
  reordenarIdsPallets(['PAL-1', 'PAL-2', 'PAL-3'], 'PAL-1', 'down'),
  ['PAL-2', 'PAL-1', 'PAL-3'],
  'deve mover o pallet uma posicao para baixo na ordem manual',
)

assert.deepEqual(
  aplicarOrdemManualPallets(pallets, ['PAL-3', 'PAL-1']).map((pallet) => pallet.id),
  ['PAL-3', 'PAL-1', 'PAL-2'],
  'deve aplicar a ordem manual e manter pallets novos no fim',
)
