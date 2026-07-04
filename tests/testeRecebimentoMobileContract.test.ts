import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const testePageUrl = new URL('../src/pages/Teste.tsx', import.meta.url)
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const navSource = readFileSync(new URL('../src/components/nav.ts', import.meta.url), 'utf8')
const sharedDataSource = readFileSync(new URL('../../wms-shared-demo/data.ts', import.meta.url), 'utf8')
const mobileMockSource = readFileSync(new URL('../../wms-mobile/src/data/mock.ts', import.meta.url), 'utf8')
const mobileFlowSource = readFileSync(new URL('../../wms-mobile/src/screens/FlowScreen.tsx', import.meta.url), 'utf8')

assert.ok(existsSync(testePageUrl), 'wms-frontend deve ter a pagina TESTE para validar recebimento com o mobile')

const testeSource = readFileSync(testePageUrl, 'utf8')
const tarefaRecebimentoSource = sharedDataSource.slice(
  sharedDataSource.indexOf("id: 'T-9011'"),
  sharedDataSource.indexOf("id: 'T-REC-BIP-2041'"),
)

assert.ok(appSource.includes("path=\"/teste\""), 'rota /teste deve estar registrada no App')
assert.ok(navSource.includes("label: 'TESTE'"), 'aba TESTE deve aparecer na navegacao')

assert.ok(testeSource.includes('QRCodeSVG'), 'aba TESTE deve renderizar QR Code real para a doca')
assert.ok(testeSource.includes('T-9011'), 'aba TESTE deve usar a tarefa mobile de recebimento T-9011')
assert.ok(testeSource.includes('T-REC-BIP-2041'), 'aba TESTE deve mostrar a OS de bipagem posterior ao checklist')
assert.ok(testeSource.includes('DOCA-03'), 'aba TESTE deve mostrar o codigo da doca que o mobile espera')
assert.ok(testeSource.includes('ETQ-REC-2041-SKU-10241-001'), 'aba TESTE deve mostrar a etiqueta gerada em /etiquetagem')
assert.ok(testeSource.includes('Checklist de chegada'), 'aba TESTE deve incluir o checklist de entrada do recebimento')
assert.ok(testeSource.includes('Fluxo no wms-mobile'), 'aba TESTE deve explicar a sequencia para testar no celular')

assert.ok(sharedDataSource.includes("id: 'T-9011'"), 'shared-demo deve expor a tarefa T-9011 para o mobile')
assert.ok(sharedDataSource.includes("esperado: 'DOCA-03'"), 'shared-demo deve conter a doca esperada pelo mobile')
assert.ok(sharedDataSource.includes("id: 'T-REC-BIP-2041'"), 'shared-demo deve expor a tarefa de bipagem apos checklist')
assert.ok(sharedDataSource.includes("fluxo: 'bipagem'"), 'shared-demo deve separar bipagem do recebimento/checklist')
assert.ok(sharedDataSource.includes("esperado: 'ETQ-REC-2041-SKU-10241-001'"), 'shared-demo deve conter a etiqueta gerada em /etiquetagem')
assert.equal(
  tarefaRecebimentoSource.includes("Bipe o produto', esperado: 'SKU-10241'"),
  false,
  'T-9011 nao deve bipar produto; recebimento deve ser doca + checklist',
)
assert.ok(mobileMockSource.includes('DEMO_OPERATIONAL_TASKS.map'), 'mobile deve montar as tarefas a partir do shared-demo')
assert.ok(mobileMockSource.includes('recebimento: item.fluxo ==='), 'mobile deve anexar contexto de recebimento a tarefa')
assert.ok(mobileMockSource.includes('bipagem:'), 'mobile deve ter fluxo visual de Bipagem separado de Recebimento')
assert.ok(mobileFlowSource.includes("tarefa.fluxo === 'receber'"), 'FlowScreen deve tratar checklist de chegada no fluxo Recebimento')
assert.ok(mobileFlowSource.includes("passo.rotulo.toLowerCase().includes('doca')"), 'checklist de recebimento deve abrir apos ler a doca')
