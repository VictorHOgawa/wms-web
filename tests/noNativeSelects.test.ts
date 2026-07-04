import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const filesWithDropdowns = [
  'src/components/OrdemServicoPanel.tsx',
  'src/pages/Configuracoes.tsx',
  'src/pages/ControleSKU.tsx',
  'src/pages/CrossDocking.tsx',
  'src/pages/Etiquetagem.tsx',
  'src/pages/Inventario.tsx',
  'src/pages/Recebimento.tsx',
]

for (const file of filesWithDropdowns) {
  const source = readFileSync(join(process.cwd(), file), 'utf8')

  assert.equal(
    source.includes('<select'),
    false,
    `${file} nao deve usar select nativo; use SelectField para manter o menu no visual do sistema`,
  )
}
