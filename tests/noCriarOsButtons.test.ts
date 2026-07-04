import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const filesWithOperationalTaskUi = [
  'src/components/OrdemServicoPanel.tsx',
  'src/pages/CrossDocking.tsx',
  'src/pages/Inventario.tsx',
  'src/pages/Mapa3D.tsx',
  'src/pages/Picking.tsx',
  'src/pages/Putaway.tsx',
  'src/pages/Recebimento.tsx',
]

const forbiddenLabels = [
  'Criar OS',
  'Criar ordem de servico',
  'Criar ordem de serviço',
  'Criar OS futura',
  'Construtor de OS',
  'Gerar OS',
  'Gerar OS para operadores',
]

for (const file of filesWithOperationalTaskUi) {
  const source = readFileSync(join(process.cwd(), file), 'utf8')

  for (const label of forbiddenLabels) {
    assert.equal(
      source.includes(label),
      false,
      `${file} nao deve expor botao ou modal de criacao de OS: ${label}`,
    )
  }
}
