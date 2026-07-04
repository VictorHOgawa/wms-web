# P&P - Perdas e Prevencoes Design

## Objetivo

Adicionar ao frontend WMS um modulo navegavel de P&P entre os grupos Outbound e Operacao. A primeira entrega valida a estrutura operacional do modulo com dados mockados, sem depender de backend.

## Regras de produto

- Nao exibir nomes pessoais citados em reuniao; usar papeis como Analista, Responsavel e Aprovador.
- O centro do modulo e o Caso de Indenizacao.
- Tudo deve apontar para o caso: cobranca do cliente, itens/pedidos, dossie operacional, decisao, aprovacao, financeiro e relatorios.
- A primeira tela deve responder: o que precisa ser resolvido agora?
- O modulo deve ser uma aba do menu lateral chamada Perdas e Prevencoes dentro do grupo P&P.

## Estrutura funcional

1. Cockpit: fila inicial com casos novos, cobrancas importadas, itens sem evidencia, casos aguardando analise, casos aguardando aprovacao, casos enviados ao financeiro, pagamentos pendentes, descontos pendentes, SLA vencido e ranking de bases com mais problema.
2. Cobrancas / Importacoes: entrada de cartas, boletos e NDs, com status de leitura por pedido: encontrado, nao encontrado, duplicado e divergente.
3. Casos de Indenizacao: lista de casos e ficha do caso selecionado, com resumo, itens, dossie, decisao, anexos e historico.
4. Divergencias Operacionais: conexao com o WMS/operacao para falta, sobra, avaria, extravio, recusa/devolucao, checklists, ultima bipagem, rota, base/CD/parceiro e evidencia operacional.
5. Financeiro / Debitos: acompanhamento de pagamento, aprovacao financeira, desconto contra base/parceiro e divergencia entre carta e soma dos pedidos.
6. Aprovacoes: fila para abonos, valores acima de alcada, decisoes parciais, excecoes, pagamento sem evidencia e casos sem cobranca de base/parceiro.
7. Relatorios: indicadores de valor cobrado, pago, acatado, contestado, abonado, debito por base/rota, motivo recorrente, SLA e pendencias por responsavel.
8. Configuracoes: motivos, bases, rotas, clientes, SLA, alcadas, tipos de documento e parametros de importacao.

## UX

A pagina usa abas internas para evitar multiplicar rotas nesta primeira entrega. O Cockpit aparece por padrao e destaca prioridades em cards compactos, ranking de bases e fila de trabalho. As demais abas mostram quadros/tabelas resumidas para validar nomenclatura e fluxo.

## Fora de escopo desta entrega

- Upload real de planilhas.
- Persistencia em backend.
- Automacao real de debito financeiro.
- Integracao real com dados operacionais do WMS.
