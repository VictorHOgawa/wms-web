import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const expedicaoSource = readFileSync(new URL('../src/pages/Expedicao.tsx', import.meta.url), 'utf8')

assert.ok(
  expedicaoSource.includes('Ordem de separacao'),
  'a tela de expedicao deve destacar a ordem de separacao',
)

assert.ok(
  expedicaoSource.includes('Conferencia por volume'),
  'a tela de expedicao deve exigir conferencia individual por volume',
)

assert.ok(
  expedicaoSource.includes('Veiculo recusado'),
  'a tela de expedicao deve tratar veiculo recusado',
)

assert.ok(
  expedicaoSource.includes('disparado para o frotas'),
  'o simulador deve deixar claro que a prioridade foi disparada para frotas',
)

assert.ok(
  expedicaoSource.includes('20% de margem'),
  'a tela de expedicao deve mostrar a margem de cubagem usada no planejamento da carga',
)

assert.ok(
  expedicaoSource.includes('Montagem aprovada'),
  'a tela de expedicao deve mostrar que a carga nasceu da montagem aprovada',
)

assert.equal(
  expedicaoSource.includes('Programacao e externa'),
  false,
  'a tela de expedicao nao deve tratar a carga como programacao externa',
)
