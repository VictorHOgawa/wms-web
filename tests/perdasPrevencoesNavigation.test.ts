import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const navSource = readFileSync(new URL('../src/components/nav.ts', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

const outboundIndex = navSource.indexOf("group: 'Outbound'")
const ppIndex = navSource.indexOf("group: 'P&P'")
const operacaoIndex = navSource.indexOf("to: '/tarefas'")
const ppRoutes = [
  ['/perdas-prevencoes/cockpit', 'Cockpit'],
  ['/perdas-prevencoes/importacoes', 'Cobrancas / Importacoes'],
  ['/perdas-prevencoes/casos', 'Casos de Indenizacao'],
  ['/perdas-prevencoes/divergencias', 'Divergencias Operacionais'],
  ['/perdas-prevencoes/financeiro', 'Financeiro / Debitos'],
  ['/perdas-prevencoes/aprovacoes', 'Aprovacoes'],
  ['/perdas-prevencoes/relatorios', 'Relatorios P&P'],
  ['/perdas-prevencoes/configuracoes', 'Configuracoes P&P'],
]

assert.ok(outboundIndex >= 0, 'o menu deve manter o grupo Outbound')
assert.ok(ppIndex > outboundIndex, 'o grupo P&P deve ficar depois de Outbound')
assert.ok(operacaoIndex > ppIndex, 'o grupo P&P deve ficar antes de Operacao')
assert.equal(
  (navSource.match(/group: 'P&P'/g) ?? []).length,
  ppRoutes.length,
  'o modulo P&P deve ter uma aba de menu para cada area funcional',
)

for (const [route, label] of ppRoutes) {
  assert.ok(navSource.includes(`to: '${route}'`), `o menu P&P deve apontar para ${route}`)
  assert.ok(navSource.includes(`label: '${label}'`), `o menu P&P deve conter a aba ${label}`)
  assert.ok(appSource.includes(`path="${route}"`), `App deve registrar a rota ${route}`)
}

assert.ok(
  appSource.includes("import PerdasPrevencoes from './pages/PerdasPrevencoes'"),
  'App deve importar a pagina de Perdas e Prevencoes',
)
assert.ok(
  appSource.includes('path="/perdas-prevencoes" element={<Navigate to="/perdas-prevencoes/cockpit" replace />}'),
  'a raiz do modulo P&P deve redirecionar para o Cockpit',
)
