import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { filtrarSkusControlePorEmpresa } from '../src/lib/skuControle.ts'
import type { SkuControle } from '../src/lib/types.ts'

const skuBase: Omit<SkuControle, 'id' | 'empresaId' | 'codigo' | 'descricao'> = {
  ownerId: 'own-nano',
  tipo: 'unidade',
  skuUnidadeConteudo: null,
  unidadesPorCaixa: null,
  comprimentoCm: 10,
  larguraCm: 10,
  alturaCm: 10,
  cubagemM3: 0.001,
  criadoPor: 'Teste',
  criadoEm: '2026-06-30T00:00:00.000Z',
  atualizadoPor: 'Teste',
  atualizadoEm: '2026-06-30T00:00:00.000Z',
}

const skus: SkuControle[] = [
  {
    ...skuBase,
    id: 'sku-eletrolux',
    empresaId: 'emp-eletrolux',
    codigo: 'SKU-ELX-001',
    descricao: 'Liquidificador EletroLux',
  },
  {
    ...skuBase,
    id: 'sku-magazine',
    empresaId: 'emp-magazine-luiza',
    codigo: 'SKU-ML-001',
    descricao: 'Fritadeira MagazineLuiza',
  },
]

const mockSource = readFileSync(new URL('../src/lib/mock.ts', import.meta.url), 'utf8')

assert.match(
  mockSource,
  /EMPRESAS_SKU[\s\S]*emp-eletrolux[\s\S]*EletroLux/,
  'controle SKU deve expor a empresa EletroLux para cadastro e filtro',
)

assert.match(
  mockSource,
  /EMPRESAS_SKU[\s\S]*emp-magazine-luiza[\s\S]*MagazineLuiza/,
  'controle SKU deve expor a empresa MagazineLuiza para cadastro e filtro',
)

assert.deepEqual(
  filtrarSkusControlePorEmpresa(skus, 'emp-eletrolux').map((sku) => sku.codigo),
  ['SKU-ELX-001'],
  'filtro por empresa deve retornar apenas SKUs da empresa selecionada',
)

assert.deepEqual(
  filtrarSkusControlePorEmpresa(skus, 'emp-todas').map((sku) => sku.codigo),
  ['SKU-ELX-001', 'SKU-ML-001'],
  'opcao todas deve manter a visualizacao completa de SKUs',
)

const controleSkuSource = readFileSync(new URL('../src/pages/ControleSKU.tsx', import.meta.url), 'utf8')

assert.match(
  controleSkuSource,
  /empresaFiltro/,
  'ControleSKU deve ter um estado dedicado para filtro de visualizacao por empresa',
)

assert.match(
  controleSkuSource,
  /alterarEmpresa/,
  'ControleSKU deve ter um fluxo dedicado para alterar empresa no cadastro',
)
