import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const etiquetagemSource = readFileSync(new URL('../src/pages/Etiquetagem.tsx', import.meta.url), 'utf8')

assert.equal(
  etiquetagemSource.includes('Payload ZPL do lote'),
  false,
  'a tela de etiquetagem nao deve exibir o payload ZPL do lote',
)
