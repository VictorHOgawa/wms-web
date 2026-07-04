import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const montagemSource = readFileSync(new URL('../src/pages/Montagem.tsx', import.meta.url), 'utf8')

assert.equal(
  montagemSource.includes('Exemplos de pallets 3D'),
  false,
  'a tela de montagem nao deve exibir a secao de exemplos de pallets 3D',
)

assert.ok(
  montagemSource.includes('Destino do A4'),
  'a aprovacao da montagem deve abrir escolha de destino do A4',
)

assert.ok(
  montagemSource.includes('Data de entrada no staging'),
  'o A4 de cross-docking deve solicitar data de entrada no staging',
)

assert.ok(
  montagemSource.includes('Cliente no A4'),
  'o A4 de cross-docking deve exibir o cliente',
)
