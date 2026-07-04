import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const pageSource = readFileSync(new URL('../src/pages/PerdasPrevencoes.tsx', import.meta.url), 'utf8')

for (const label of [
  'Perdas e Prevencoes',
  'Esteira de decisao',
  'Cockpit',
  'Cobrancas / Importacoes',
  'Casos de Indenizacao',
  'Divergencias Operacionais',
  'Financeiro / Debitos',
  'Aprovacoes',
  'Relatorios',
  'Configuracoes',
  'Caso de Indenizacao',
  'Dossie vivo',
  'Cliente',
  'Sistema',
  'Analise humana',
  'CTE -> NFs -> pedidos/itens -> SKUs -> volumes/etiquetas -> pallets -> movimentacoes -> checklists -> evidencias -> financeiro -> decisao sugerida',
  'CTE/NF/pedido',
  'Checklist de chegada',
  'Checklist de saida',
  'Ultima bipagem',
  'Quem conferiu',
  'Placa/motorista',
  'Base/CD/parceiro provavel responsavel',
  'Resposta ao cliente',
  'Evidencia suficiente',
  'Sugestao',
  'Pre-casos operacionais',
  'Historico auditavel',
  'Financeiro recebe processo decidido',
  'Tracking leve de encomenda',
  'Plano esperado x leitura real',
  'local_incorreto_risco_sla',
  'Escolher arquivo CSV',
  'Colar planilha CSV',
  'Importar planilha',
  'Pesquisar CTE/NF/pedido',
  'Montar dossie',
  'Vincular documento financeiro',
  'Atualizar documento',
  'Lista de CTEs/documentos do caso atual',
  'Timeline completa',
  'Decidir parcial',
  'Aprovar caso',
  'Enviar ao financeiro',
  'onCteManual',
  'onBoletoOuNd',
  'Planilha minima do cliente',
  'Enriquecimento automatico WMS/fiscal',
  'Fontes puxadas automaticamente',
  'Nao indeniza automaticamente',
  'Carga localizada em armazem errado',
  'Falta de evidencia',
  'Decisao sensivel exige justificativa',
  'CTE/NF/pedido + valor reclamado',
]) {
  assert.ok(pageSource.includes(label), `a pagina deve conter a secao ${label}`)
}

assert.equal(
  /Maiara/i.test(pageSource),
  false,
  'a interface nao deve exibir nomes pessoais citados em reuniao',
)

assert.equal(
  /O sistema faz/i.test(pageSource),
  false,
  'a interface deve evitar blocos explicativos genericos',
)
