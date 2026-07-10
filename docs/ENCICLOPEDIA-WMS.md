# Enciclopédia WMS — fonte única

> **Este é O documento do WMS.** Estado atual, certezas de negócio, o que é real,
> o que ainda é mock (e como sair), pendências. Substituiu, em 10/07/2026, todas as
> anotações espalhadas (pasta `plano-de-acao-wms/` e avulsos na raiz do workspace —
> apagados a pedido do dono). **Regra de manutenção: mudou o sistema, atualiza AQUI.**
>
> Última atualização: **10/07/2026** (fim do dia — plano de 6 fases entregue).

---

## 1. O sistema em um parágrafo

O WMS da Integra opera o armazém dentro do fluxo de viagem do TMS: a programação de
viagem gera Ordens de Serviço (O.S) por parada, e o armazém executa as suas —
separação, carregamento com bipagem, recebimento em piso, conferência, guarda —
pela **torre de controle** (gestor, web) e pelo **coletor** (operador, celular).
Cross-docking (carga passa pelo piso e reembarca) é o coração; armazenagem
(endereçar, guardar, separar, contar) funciona por cima do mesmo motor.

### Mapa dos repositórios

| Peça | Repo | Porta | Papel |
|---|---|---|---|
| API (monolito TMS+WMS) | `adapta-api` (branch `development`) | 3333 | Toda a regra de negócio |
| Identidade | `adapta-hub` | 3334 | Login → token do spoke |
| Torre de controle | `wms-frontend` (branch `main`) | 5173 | Gestor do armazém |
| Admin & cadastros | `wms-admin-business` (branch `main`) | 5174 | Estrutura física, SKUs, regras |
| Coletor | `storage-app` (branch `master`) | Expo | Operador de chão |
| TMS | `integra-web-v2` (branch `development`) | 3000 | Programação/viagem/GR/sino |

Código WMS na api: `src/modules/wms/` (service/controller) +
`src/modules/service-orders/` (blueprint de O.S, handlers de armazém em
`event-handlers/handlers/armazem/`).

---

## 2. O fluxo da viagem, ponta a ponta (tudo REAL e validado)

Validado pelo dono em 08–09/07 (viagens VGM-2026-2008/2010) e revalidado via
navegador em 09–10/07.

1. **Programação** (TMS, builder com "Destino das cargas" CD × Direto) → gate de
   **GR** (pesquisa/nível/iscas travam; previsão de isca destrava) → aprovação →
   **gerar viagem** (O.S por parada: Coleta, Recebimento em Piso, Separação,
   Carregamento, Fiscal, Frete + Manifesto por trecho).
2. **Separação** (torre): lista de separação + **romaneio POR PARADA imprimível**;
   ou **"Separar por FEFO"** (sku+quantidade → motor escolhe posições por validade,
   uma O.S por posição).
3. **Carregamento** (coletor): **bipagem etiqueta a etiqueta ANTES do checklist**;
   etiquetas podem ser **emitidas na hora**; zero bipes exige **autorização de
   supervisor** aprovada pela torre (card na Expedição).
4. **Expedição confirma** (torre) → **trava fiscal destrava** (dependência
   BLOCKING Carregamento→Fiscal) + **aviso no sino do TMS** para operador/
   coordenador ("inicie a emissão dos documentos") + carimbo
   `expedicaoConfirmadaEm` na viagem. *A emissão automática em si ainda não
   existe (ver §6).*
5. **Recebimento no CD destino** (coletor): pré-aviso com doca → confirmar chegada
   → **bipar os pallets que desceram** (cada um ganha relógio próprio de free
   time) → **conferência documental sim/não por CT-e** ("não" abre divergência
   DOCUMENTAL sem travar a baixa).
6. **Conferência física = bipagem** (coletor): etiqueta → **pallet fechado expande
   o conteúdo** → código de barras; o **confronto carga×descarga fecha sozinho**;
   divergências (FALTA/SOBRA/…) caem no kanban da torre.
7. **Piso / free time** (torre): cargas e **pallets individuais** com cronômetro
   (24h default; por contrato, ex.: Electrolux 7d); estouro → chip vermelho →
   **transferir para armazenagem** (por carga ou por pallet).
8. **Guarda dirigida** (coletor): a tarefa vem com **endereço sugerido**
   (consolidação → pulmão vago → onde couber); endereço cheio **barra** com
   sugestão alternativa. **Capacidade de endereço vale de verdade** (vagas de
   palete + peso).
9. **Armazenagem**: putaway/picking/contagem/abastecimento mutam estoque real
   (`WmsStockPosition` + `WmsStockMovement`); triagem por destino (montar pallet
   por cidade/UF); ocupação por endereço visível no Estoque da torre.

---

## 3. Certezas (decisões de negócio travadas)

### Da reunião com o Alex (09/07) — todas implementadas
- **A1** Bipagem antes do checklist no carregamento + emitir etiqueta na hora.
- **A2/Q3** Carregar sem nenhuma bipagem exige autorização de supervisor (fila na
  torre, card da Expedição).
- **A3** Expedição trava a emissão e dispara o gatilho ao confirmar (v1 = trava +
  aviso; emissão real é frente futura).
- **A4** Romaneio por parada de entrega, imprimível (pallet→volumes→NFs).
- **A5/Q1** Conferência documental sim/não por CT-e no receber; "não" NÃO bloqueia
  a baixa — vira divergência DOCUMENTAL.
- **A6** Produto novo (gate de SKU) não trava — "Pular por agora"; pendência fica
  registrada.
- **A7/Q2** Conferência física é bipagem; **bipar pallet fechado confere todo o
  conteúdo**.
- **A8** A bipagem da torre morreu — o confronto fecha na conferência do coletor.
- **A9** Piso/free time/guarda são **POR PALLET** (relógio individual via bipagem
  na chegada).

### Do dono (10/07) — todas implementadas, exceto onde indicado
- **Janela das paradas de CD = opção A**: expediente (abre/fecha) no cadastro da
  unidade/CD vira a janela automaticamente (no dia previsto de chegada; nunca
  sobrescreve janela digitada).
- **Expedição confirmada = status + aviso** (sem "lado fiscal/lado WMS"): carimbo
  na viagem + notificação no sino; emissão automática fica para a frente fiscal.
- **Fim do modo demo**: torre e admin só entram com credencial real; dashboards
  100% reais; logout desloga de verdade.
- **App com sync offline**: fila de ações persistida + cache de tarefas.
- **Retirada por FEFO** + ocupação de endereços na torre.
- **RBAC = opção A** (pendurar nas roles do sistema, com defaults) — decidido,
  **ainda não implementado**, sem prioridade.
- **Adiados por decisão**: carga conjugada (desenho pronto), impressora ZPL
  física, foto subindo na ocorrência.
- Divergência que falhar ao ser registrada **nunca some em silêncio** (log alto +
  aviso na mensagem do evento); armazém sempre resolvido pelo contexto da O.S
  (unidade→filial — nunca "o primeiro do banco").

### Outras regras vivas
- Free time: default 24h; por contrato via `freeTimeHoras` (generalidade).
- Etiqueta de volume genérica **CARGA-VOLUME** para CT-e sem espelho de NF.
- Ordem de embarque por rota: **último a entregar sobe primeiro** (app e torre).
- Capacidade de endereço: cada posição com saldo = 1 vaga de palete; consolidar o
  MESMO SKU/cliente não consome vaga nova; peso = quantidade × peso do SKU.
- Banco grava **UTC**; a api roda com `TZ=UTC` nos scripts de start (**nunca
  remover** — o fuso já mordeu uma vez na leitura).
- **Parametrização é dado, não código** (princípio do admin): conferência cega,
  estratégia de picking, free time etc. são chaves/valores que a operação lê —
  a escala está em quais chaves se liga, não em versões do sistema.
- **Permissão por AÇÃO, não por tela** (ex.: `quarentena.liberar`) — princípio a
  seguir quando o RBAC (§6.1) for implementado.
- **UX do coletor**: operador tem pouco tempo e baixa leitura — cor + ícone +
  número grande, uma instrução por tela, botões gigantes, scan-to-confirm em
  todo passo crítico; exceção se resolve dentro do fluxo.

---

## 4. O que é REAL hoje (por peça)

- **API**: todo o fluxo do §2; etiquetas (preview/emissão, inclusive por
  documento); pallets (abrir/bipar/fechar/guardar); cargas em piso com destino e
  pallets; autorizações; divergências + confronto; putaway dirigido + gate de
  capacidade; separação FEFO; expediente→janela; notificação de expedição;
  checklists aplicáveis por fluxo/cliente; generalidades; parâmetros.
- **Torre**: TODAS as telas dos grupos *Fluxo da viagem*, *Piso & Estoque*,
  *Etiquetas & Docs* e *Qualidade & Gestão* são reais, além do Dashboard. O grupo
  **Demonstração** é vitrine (ver §5).
- **Admin**: estrutura física (armazéns/zonas/endereços/docas), produtos, insumos,
  checklists, parâmetros (valores), generalidades — tudo grava no backend. Painel
  100% real. Grupo **Demonstração** é vitrine (ver §5).
- **Coletor**: 100% plugado (tarefas, bipagem multi, etiquetas na hora, montar
  pallet, autorização, ocorrência, checklists, guarda com sugestão) + offline
  (fila persistida, cache, banners). Modo teste só em desenvolvimento.
- **TMS (toques do WMS)**: aba Execução da viagem (O.S com cadeado/destrava),
  sino de notificações, fila de Validações do GR com alocação de iscas,
  expediente do CD no cadastro da unidade.

---

## 5. O que ainda é MOCK — e o caminho para sair

> Regra vigente: mock existe apenas **rotulado** (grupo "Demonstração"). Nenhuma
> tela real cai mais em dado falso; o Painel/Dashboard não mostram número de
> mentira.

### Torre (`wms-frontend`, grupo Demonstração — 11 telas)

| Tela | O que é | Base para sair do mock | Recomendação |
|---|---|---|---|
| Endereçamento (putaway) | fila visual fake | O motor REAL já existe (sugestão+capacidade); falta só listar as O.S TMSGUARDAR com sugerido/executado | Fácil de virar real — próximo incremento natural |
| Planta 3D / Montagem 3D | grade procedural | Gerar do cadastro real de endereços (rua/coluna/nível já existem no schema) | Manter vitrine até a fase de armazenagem plena |
| Controle SKU | CRUD em memória | Admin→Produtos já é o cadastro real | **Candidata a remover** (duplica o admin) |
| Ocorrências / Tarefas | fila fake de operador | A fila real é o coletor (decisão de 06/07) | **Candidatas a remover** |
| Relatórios & KPIs | estático | Dashboard real já cobre o essencial; relatórios exigem agregações novas | Manter vitrine |
| Faturamento 3PL | estático | Depende da unidade de cobrança do free time (contrato) — pergunta aberta | Manter vitrine |
| Perdas & Prevenções / Transição / Integrações / Configurações | estáticos | Sem backend desenhado | Manter vitrine |
| Rotas fora do menu `/etiquetagem` `/picking` `/coletor` `/tarefas` | duplicatas mock de telas reais | — | **Remover já** (as reais são /etiquetar, /separacao e o coletor) |

### Admin (`wms-admin-business`, grupo Demonstração — 6 telas)

| Tela | O que é | Base para sair do mock | Recomendação |
|---|---|---|---|
| Usuários / Perfis & Permissões | RBAC de fachada (só navegador) | **Decisão tomada: RBAC opção A** — pendurar nas roles do sistema (adapta-api) e aposentar estas telas | Sai junto com a task de RBAC |
| Reason Codes | lista local | Model pequeno quando o fluxo de ajuste precisar | Manter vitrine |
| Fornecedores / Transportadoras | listas locais | Cadastro é do TMS (BusinessPartner) | **Candidatas a remover** |
| Migração de Dados | teatro completo (lotes/IA/validações em memória) | Serve de especificação visual do onboarding | Manter vitrine (é a spec) |

### Coletor (`storage-app`)
Sem tela mock. Resta **dead code** em `src/data/mock.ts` (arrays demo não usados) —
limpar num passe de higiene. `FLUXOS`/`UNIDADES` (cores/ícones) e os motivos de
ocorrência são config de UI legítima (motivos podem virar cadastro depois).

---

## 6. Pendências abertas

**Validação do dono (guia no Anexo A):** free time + guarda dirigida; sino do TMS;
isca na fila de Validações; expediente→janela; app no celular incl. offline.

**Fila de desenvolvimento (sem prioridade definida, exceto onde dito):**
1. **RBAC opção A** — permissões WMS nas roles do sistema (defaults: aprovar
   carregamento sem bipagem, liberar divergência, transferir/guardar) + aposentar
   telas demo do admin. ⚠️ lembrar o fail-open do sistema: usuário com 0 roles vê
   tudo; role vazia bloqueia tudo.
2. **Emissão fiscal automática** — consumir o gatilho `expedicao.confirmada` para
   emitir CT-e/manifesto/CIOT (frente fiscal/Gabriel). Hoje: trava + aviso.
3. **Carga conjugada** — desenho pronto (entidade TripOperacao, rateio por
   operação); espera as respostas: rateio kg×% e quem informa; CT-e/CIOT próprios
   da subcontratada; transportador como parceiro; segregação física × documental.
4. **Armazenagem seguinte**: tela real de putaway (fila das guardas), planta 3D a
   partir dos endereços reais, inventário cíclico, estratégia de picking com
   efeito real (hoje FEFO existe no despacho; o rótulo FIFO/WAVE do relatório não
   muda nada).
5. **Higiene**: remover duplicatas mock da torre e telas candidatas (§5); limpar
   dead code do mock.ts do app; 2 erros de lint pré-existentes em `Separacao.tsx`
   (padrão antigo de setState em effect).
6. **Hardware/futuro**: impressora ZPL física; foto da ocorrência subindo (hoje só
   texto).
7. **Rebuild do dev client** do app (entrou módulo nativo do AsyncStorage) — sem
   isso a fila offline não sobrevive a fechar o app (funciona em memória).

**Dados/ambiente:** PUL-01 está com 2 posições numa capacidade 1 (estouro
histórico de antes da trava — dado honesto, não bug). O fixture
`exemplo-nfe-validacao.xml` mudou para `adapta-api/prisma/fixtures/`.

---

## 7. Ambiente — como rodar e gotchas

- **Subir**: api `yarn start` (usa `TZ=UTC` — não remover); torre/admin `yarn dev`;
  TMS `yarn dev`; app `npx expo start` (dev client; QR no terminal — celular na
  mesma rede Wi-Fi, ou `--tunnel`; `w` abre no navegador para teste rápido).
- **Banco local**: postgres `localhost:5432/adapta_api`. Migrations: sempre
  `npx prisma migrate dev` no LOCAL (nunca contra produção). Com a api rodando no
  Windows, rodar `npx prisma generate` manualmente depois do migrate (o client
  fica preso/stale).
- **Endereços demo do CD Curitiba**: PCK-A-01/02/03, PUL-01/02/03, REC-01
  (staging), SEP-DEMO-PCK-01.
- **Typecheck da api**: `NODE_OPTIONS=--max-old-space-size=8192 npx tsc -p
  tsconfig.build.json --noEmit`.
- **Commitlint**: título minúsculo, ≤100 caracteres.
- Mudou handler/blueprint/listener na api → **reiniciar a api** (o processo roda
  build compilado).

---

## Anexo A — Guia de validação pendente (10/07)

### A1. Free time + guarda dirigida (torre + coletor)
| # | Ação | Esperado |
|---|---|---|
| 1 | Torre → Free time (piso) | ~44 cargas estouradas (chip vermelho) |
| 2 | Guardar um pallet de uma carga | Toast; tarefa de guarda no coletor |
| 3 | Coletor → Guardar | Endereço **sugerido** na tarefa |
| 4 | Bipar endereço cheio (PCK-A-01) | Barra: "está cheio (1/1 paletes). Sugestão: …" |
| 5 | Bipar o sugerido | Conclui |
| 6 | Torre → Estoque | Régua de ocupação reflete |

### A2. Sino do TMS
| # | Ação | Esperado |
|---|---|---|
| 1 | TMS → sino | "Expedição confirmada — viagem VGM-2026-2010" |
| 2 | Clicar | Vai ao detalhe da viagem |

### A3. Isca na fila de Validações do GR
| # | Ação | Esperado |
|---|---|---|
| 1 | Programação nova com carga de valor alto → Validar GR | Trava: "Iscas insuficientes" |
| 2 | GR → Validações → selecionar | Bloco "Iscas previstas" embaixo da divergência |
| 3 | Adicionar previsão → Revalidar GR | Destrava sem sair da tela |

### A4. Expediente do CD → janela
| # | Ação | Esperado |
|---|---|---|
| 1 | TMS → Empresa → editar unidade do CD | Bloco "Expediente do CD" (abre/fecha) |
| 2 | 07:00–19:00 → salvar → reabrir | Mantém |
| 3 | Programação com parada no CD + data prevista | Parada do CD nasce com a janela preenchida |
| 4 | Janela digitada à mão em outra parada | Não é sobrescrita |

### A5. App no celular (inclui offline)
| # | Ação | Esperado |
|---|---|---|
| 1 | Pull-to-refresh na Home | Atualiza |
| 2 | Montar pallet | Abrir → bipar volumes → fechar com destino |
| 3 | Emitir etiquetas da carga | Códigos na hora |
| 4 | Produto novo → "Pular por agora" | Segue |
| 5 | Modo avião no meio da tarefa → concluir | "Guardar para enviar depois?" → banner azul na Home |
| 6 | Home offline | Banner "Sem conexão — mostrando tarefas de HH:mm" |
| 7 | Rede de volta + puxar | Sincroniza sozinho |

---

## Linhagem

Consolidou e substituiu (10/07/2026): `plano-de-acao-wms/` inteira — ESTADO-E-
PROGRESSO-WMS, VISAO-GERAL-PONTA-A-PONTA, DECISOES-POS-APRESENTACAO-ALEX,
PLANO-DEV-DECISOES-ALEX, GUIA-VALIDACAO-COMPLETA (§10 com a rodada Playwright),
DESENHO-CARGA-CONJUGADA, GUIA-VALIDACAO-5-PONTOS, 00-LEIA-ME + 21 docs históricos
em `arquivo/`. Mapa visual de capacidades (artifact):
https://claude.ai/code/artifact/2b8990e0-440d-49e1-81e4-ae5d6372e74b
