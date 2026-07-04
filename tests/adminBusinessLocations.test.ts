import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  ADMIN_BUSINESS_DOCAS,
  ADMIN_BUSINESS_ENDERECOS_SUGESTOES,
  ADMIN_BUSINESS_PUTAWAY,
  sugerirEnderecoPutaway,
} from '../src/lib/adminBusinessLocations.ts'

const pad2 = (value: number) => String(value).padStart(2, '0')
const enderecoAtivo = new Set<string>()

for (const rua of ['A', 'B', 'C']) {
  for (let coluna = 1; coluna <= 4; coluna++) {
    for (let nivel = 1; nivel <= 3; nivel++) {
      enderecoAtivo.add(`${rua}-${pad2(coluna)}-${pad2(nivel)}-01`)
    }
  }
}
enderecoAtivo.add('PADRAO')

const docaOperacional = new Set(
  ['DOCA-01', 'DOCA-02', 'DOCA-03', 'DOCA-04', 'Doca 01', 'Doca 02', 'Doca 03', 'Doca 04'],
)
const mockPath = fileURLToPath(new URL('../src/lib/mock.ts', import.meta.url))
const mockSource = readFileSync(mockPath, 'utf8')
const putawayPath = fileURLToPath(new URL('../src/pages/Putaway.tsx', import.meta.url))
const putawaySource = readFileSync(putawayPath, 'utf8')

assert.ok(enderecoAtivo.size > 0, 'admin-business deve expor enderecos operacionais')

for (const destino of ADMIN_BUSINESS_ENDERECOS_SUGESTOES) {
  assert.ok(
    enderecoAtivo.has(destino),
    `sugestao de putaway ${destino} deve existir como endereco ativo no admin-business`,
  )
}

for (const destino of Object.values(ADMIN_BUSINESS_PUTAWAY)) {
  assert.ok(
    enderecoAtivo.has(destino),
    `destino de putaway ${destino} deve apontar para endereco ativo do admin-business`,
  )
}

for (const doca of Object.values(ADMIN_BUSINESS_DOCAS)) {
  assert.ok(
    docaOperacional.has(doca),
    `cross-docking deve usar doca ${doca} cadastrada no admin-business`,
  )
}

assert.equal(sugerirEnderecoPutaway('SKU-10241'), ADMIN_BUSINESS_PUTAWAY.nanoPrincipal)
assert.equal(sugerirEnderecoPutaway('SKU-20056'), ADMIN_BUSINESS_PUTAWAY.bellaSecundario)
assert.equal(sugerirEnderecoPutaway('SKU-30012'), ADMIN_BUSINESS_PUTAWAY.verdeSecundario)
assert.equal(sugerirEnderecoPutaway('MP-7781'), ADMIN_BUSINESS_PUTAWAY.excecaoQualidade)

for (const legado of ['DOCA-SAI-04', 'DOCA-SAI-02']) {
  assert.equal(
    mockSource.includes(legado),
    false,
    `${legado} nao deve ser usado por putaway/cross-docking; use o catalogo do admin-business`,
  )
}

assert.equal(
  putawaySource.includes('A-15-02-1'),
  false,
  'alternativa de putaway deve sair do catalogo do admin-business',
)
