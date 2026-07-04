import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mobileMockSource = readFileSync(new URL('../../wms-mobile/src/data/mock.ts', import.meta.url), 'utf8')
const sharedDataSource = readFileSync(new URL('../../wms-shared-demo/data.ts', import.meta.url), 'utf8')
const flowSource = readFileSync(new URL('../../wms-mobile/src/screens/FlowScreen.tsx', import.meta.url), 'utf8')
const successSource = readFileSync(new URL('../../wms-mobile/src/screens/SuccessScreen.tsx', import.meta.url), 'utf8')

assert.ok(
  sharedDataSource.includes('T-EXP-CONF-4421'),
  'mobile deve receber tarefa de conferencia de expedicao',
)

assert.ok(
  sharedDataSource.includes('T-EXP-CAR-4421'),
  'mobile deve receber tarefa de carregamento de expedicao',
)

assert.ok(
  sharedDataSource.includes("origem: 'montagem'"),
  'tarefa mobile de conferencia deve saber que veio da montagem',
)

assert.ok(
  sharedDataSource.includes("esperado: 'VOL-77121-1'"),
  'mobile deve bipar volume individual, nao apenas pallet',
)

assert.ok(
  sharedDataSource.includes("tipoEventoFinal: 'expedicao.checklist_embarque'"),
  'finalizacao do carregamento deve emitir evento de checklist de embarque',
)

assert.ok(
  mobileMockSource.includes('expedicao: item.expedicao'),
  'mobile deve carregar o contexto de expedicao vindo do shared',
)

assert.ok(
  flowSource.includes('criarRequisicaoBipagemExpedicao'),
  'FlowScreen deve criar requisicao compartilhada quando o APP bipa volume',
)

assert.ok(
  successSource.includes('Sync WEB pendente'),
  'SuccessScreen deve deixar claro que o evento do APP sera sincronizado com o WEB',
)
