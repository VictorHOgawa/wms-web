import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const cssSource = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

assert.match(
  cssSource,
  /\.input:is\(select\)|select\.input/,
  'selects que usam .input devem ter estilo proprio para nao cair no visual nativo antigo',
)

assert.match(
  cssSource,
  /appearance:\s*none/,
  'dropdown moderno deve remover a aparencia nativa padrao',
)

assert.match(
  cssSource,
  /background-image:\s*url\(/,
  'dropdown moderno deve renderizar uma seta propria consistente com o sistema',
)

assert.match(
  cssSource,
  /padding-right:\s*[^;]+/,
  'dropdown moderno deve reservar espaco para a seta sem sobrepor o texto',
)
