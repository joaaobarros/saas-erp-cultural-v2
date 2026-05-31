# AUDITORIA ERP Cultural SaaS v2 — Roteiro Vivo
> Diagnóstico técnico-funcional construído em tempo real, módulo por módulo, via confirmação direta.
> **Nunca assumir — sempre confirmar.**
> Atualizado progressivamente a cada sessão.

---

## COMO ESTE DOCUMENTO FUNCIONA

1. **Exploração → Pergunta → Confirmação → Registro**
2. Cada módulo tem uma seção com: o que o código diz, o que ainda precisa ser confirmado, e o que foi efetivamente validado
3. Nenhuma conclusão é final até ser confirmada pelo usuário testando no sistema real
4. O plano de melhorias só é construído depois que cada módulo for compreendido

**Legenda de status:**
- 🔲 `PENDENTE` — ainda não auditado
- 🔍 `EM ANÁLISE` — perguntas formuladas, aguardando resposta
- ✅ `CONFIRMADO` — comportamento validado pelo usuário
- ⚠️ `PROBLEMA CONFIRMADO` — issue validado e documentado
- ❌ `DESCARTADO` — hipótese negada pelo usuário

---

## ÍNDICE DE MÓDULOS — SEQUÊNCIA DE AUDITORIA

| # | Módulo | Área | Status |
|---|---|---|---|
| 01 | [Home / Dashboard inicial](#mod-01) | Navegação | ⚠️ PROBLEMA CONFIRMADO |
| 02 | [Sidebar e navegação global](#mod-02) | Navegação | ⚠️ PROBLEMA CONFIRMADO |
| — | **[Admin — Perfis Fantasma](#pfantasma)** | Admin | 🔍 PENDENTE IMPLEMENTAÇÃO |
| — | **[Admin — Preview Primeiro Acesso](#primeiropreview)** | Admin | 🔍 PENDENTE IMPLEMENTAÇÃO |
| 03 | [Tarefas](#mod-03) | Gestão | ⚠️ PROBLEMA CONFIRMADO |
| 04 | [Pessoas / RH — Colaboradores](#mod-04) | RH | ⚠️ PROBLEMA CONFIRMADO |
| 05 | [Pessoas / RH — Afastamentos e Ocorrências](#mod-05) | RH | ⚠️ PROBLEMA CONFIRMADO |
| 06 | [Pessoas / RH — PCCS e Cargos](#mod-06) | RH | 🔍 EM ANÁLISE |
| 07 | [Pessoas / RH — Holerite e Folha](#mod-07) | RH | ✅ CONFIRMADO (bloqueado por PES-01) |
| 08 | [Pessoas / RH — Encargos](#mod-08) | RH | ✅ CONFIRMADO |
| 37 | [Ponto Eletrônico](#mod-37) | RH | ⚠️ PROBLEMA CONFIRMADO |
| 09 | [Espaços — Reservas](#mod-09) | Infraestrutura | 🔲 PENDENTE |
| 10 | [Espaços — Chaves](#mod-10) | Infraestrutura | 🔲 PENDENTE |
| 11 | [Espaços — Patrimônio / Ativos](#mod-11) | Infraestrutura | 🔲 PENDENTE |
| 12 | [Espaços — Almoxarifado](#mod-12) | Infraestrutura | 🔲 PENDENTE |
| 13 | [Ações Culturais — Lista/Kanban](#mod-13) | Cultural | 🔲 PENDENTE |
| 14 | [Ações Culturais — Painel da Ação](#mod-14) | Cultural | 🔲 PENDENTE |
| 15 | [Ações Culturais — Mapa do Evento](#mod-15) | Cultural | 🔲 PENDENTE |
| 16 | [Financeiro — Contratos](#mod-16) | Financeiro | 🔲 PENDENTE |
| 17 | [Financeiro — Plano de Trabalho (Metas/Rubricas)](#mod-17) | Financeiro | 🔲 PENDENTE |
| 18 | [Financeiro — Fontes de Recurso](#mod-18) | Financeiro | 🔲 PENDENTE |
| 19 | [Financeiro — Remanejamentos](#mod-19) | Financeiro | 🔲 PENDENTE |
| 20 | [Financeiro — Aditivos](#mod-20) | Financeiro | 🔲 PENDENTE |
| 21 | [Contratações](#mod-21) | Financeiro | 🔲 PENDENTE |
| 22 | [Comunicação — RECE](#mod-22) | Cultural | 🔲 PENDENTE |
| 23 | [Comunicação — Balcão de Demandas](#mod-23) | Cultural | 🔲 PENDENTE |
| 24 | [Agentes Culturais](#mod-24) | Cultural | 🔲 PENDENTE |
| 25 | [Acervo](#mod-25) | Cultural | 🔲 PENDENTE |
| 26 | [Voluntários](#mod-26) | Cultural | 🔲 PENDENTE |
| 27 | [Parcerias](#mod-27) | Cultural | 🔲 PENDENTE |
| 28 | [Público — Inscrições e Presenças](#mod-28) | Cultural | 🔲 PENDENTE |
| 29 | [Público — Pesquisas e Certificados](#mod-29) | Cultural | 🔲 PENDENTE |
| 30 | [Estratégia — Objetivos e KPIs](#mod-30) | Gestão | 🔲 PENDENTE |
| 31 | [Estratégia — Riscos e Calendário](#mod-31) | Gestão | 🔲 PENDENTE |
| 32 | [Escuta Institucional — Pesquisas e Pulse](#mod-32) | Gestão | 🔲 PENDENTE |
| 33 | [Escuta Institucional — Relatórios e Governança](#mod-33) | Gestão | 🔲 PENDENTE |
| 34 | [Reserva de Veículo](#mod-34) | Infraestrutura | 🔲 PENDENTE |
| 35 | [Reuniões](#mod-35) | Gestão | 🔲 PENDENTE |
| 36 | [Aprovações](#mod-36) | Governança | 🔲 PENDENTE |
| 37 | [Ponto Eletrônico](#mod-37) | RH | 🔲 PENDENTE |
| 38 | [Taskhub — Meu Centro](#mod-38) | Pessoal | 🔲 PENDENTE |
| 39 | [Alertas](#mod-39) | Sistema | 🔲 PENDENTE |
| 40 | [Auditoria do Sistema](#mod-40) | Sistema | 🔲 PENDENTE |
| 41 | [Dashboard Executivo](#mod-41) | Gestão | 🔲 PENDENTE |
| 42 | [Admin — Espaços e Turnos](#mod-42) | Admin | 🔲 PENDENTE |
| 43 | [Admin — Setores, Usuários e Módulos](#mod-43) | Admin | 🔲 PENDENTE |
| 44 | [Admin — Identidade Visual](#mod-44) | Admin | 🔲 PENDENTE |
| 45 | [Admin — Provisionamento e Feature Flags](#mod-45) | Admin | 🔲 PENDENTE |
| 46 | [Portais Públicos](#mod-46) | Público | 🔲 PENDENTE |
| 47 | [Wizard de Setup](#mod-47) | Admin | 🔲 PENDENTE |
| 48 | [Painel de Orgs (Superadmin)](#mod-48) | SaaS | 🔲 PENDENTE |
| 49 | [Sistema de Métricas (Superadmin)](#mod-49) | SaaS | 🔲 PENDENTE |

---

## MÓDULOS EM ANÁLISE

---

<a name="mod-01"></a>
## Módulo 01 — Home / Dashboard Inicial
**Status:** 🔍 EM ANÁLISE

### O que o código diz
- View padrão ao abrir o sistema (`Router.navegar('home')`)
- `#home-stats` é o único stats-grid isento do MetricsToggle (sempre expandido por design)
- Carrega dados via `getBootstrap()` que retorna: papel, email, espaços, paleta, logo, título
- Sidebar exibe nome da org, logo, nome do usuário e papel

### Perguntas para o usuário

> **Pergunta 1:** Ao abrir o sistema agora, o que aparece na tela inicial (Home)? Há algum painel de resumo, KPIs, atividade recente ou a tela está essencialmente vazia com apenas o menu lateral?

> **Pergunta 2:** O nome da organização e o logo aparecem corretamente na sidebar? A paleta de cores do sistema está aplicada?

> **Pergunta 3:** Existe algum widget ou informação útil no Home que você usa no dia a dia, ou ele é apenas uma tela de entrada sem conteúdo?

### Comportamento confirmado ✅
- Home exibe: banner de boas-vindas, espaços cadastrados, setores ativos, módulos ativos, status do sistema, acesso rápido (nova ação, infraestrutura, financeiro)

### Problemas confirmados ⚠️
- **HOME-01**: As informações exibidas (espaços, setores, módulos, status) só são úteis para administradores. Colaboradores e outros papéis veem dados que não são relevantes para o seu dia a dia.
- **HOME-02**: Os "acessos rápidos" (nova ação, infraestrutura, financeiro) são fixos — não se adaptam ao papel do usuário. Um colaborador sem acesso a financeiro vê o atalho mesmo assim.
- **HOME-03**: Home não exibe informações contextuais para o usuário logado (suas tarefas, reservas do dia, aprovações pendentes para o papel).

---

<a name="mod-02"></a>
## Módulo 02 — Sidebar e Navegação Global
**Status:** ✅ CONFIRMADO (parcial)

### O que o código diz
- Sidebar com largura 272px (normal) / 64px (recolhida)
- 18+ itens de menu visíveis (variando por papel do usuário)
- Toggle de recolher no botão `#sidebar-toggle`
- Backdrop em mobile
- Alguns itens têm badge de contador (ex: aprovações, alertas)

### Comportamento confirmado ✅
- Menu extenso, difícil de navegar — confirmado pelo usuário

### Problemas confirmados ⚠️
- **SIDEBAR-01**: Menu muito extenso sem agrupamento semântico. Todos os módulos ficam no mesmo nível visual, tornando difícil encontrar o item desejado rapidamente.

### Perguntas ainda abertas para aprofundamento
*(reservado para próxima rodada)*

---

<a name="mod-03"></a>
## Módulo 03 — Tarefas
**Status:** ⚠️ PROBLEMA CONFIRMADO

### O que o código diz
- View com stats-grid e lista de tarefas
- FSM: `pendente → em_andamento → bloqueada → concluida / cancelada`
- CRUD: criar, listar, mudar status, métricas
- Filtros por status e prioridade

### Comportamento confirmado ✅
- Lista com filtros e métricas no topo — funciona

### Problemas confirmados ⚠️
- **TAR-01**: Formulário de criação tem apenas **título, prioridade e responsável** — campos muito básicos
- **TAR-02**: Campo de responsável é texto livre — email não é puxado da lista de pessoas cadastradas no RH. Risco de erro de digitação e inconsistência de dados (responsável digitado diferente do colaborador real)
- **TAR-03**: Tarefas não se vinculam a Ações, Reservas, Contratos ou qualquer outro módulo do sistema. São entidades isoladas, sem integração com fluxos operacionais
- **TAR-04**: Sem gatilhos automáticos — criação de reserva não gera tarefa, contrato expirando não gera tarefa, etc.
- **TAR-05**: Sem alertas (email, notificação interna ou agenda) para vencimento ou prazo de tarefa
- **TAR-06**: Módulo subutilizado como consequência — tarefas deveriam ser o resultado de eventos do sistema, não apenas registro manual avulso

---

<a name="mod-04"></a>
## Módulo 04 — Pessoas / RH — Colaboradores
**Status:** ⚠️ PROBLEMA CONFIRMADO

### O que o código diz
- 3 abas: Colaboradores | Afastamentos | Ocorrências
- Formulário com: nome, email institucional, setor, cargo (PCCS), vínculo, admissão, salário base, benefícios
- Campo `#pf-salario-total` (read-only, calculado): `base + alim + saude + vt - descAlim`

### Comportamento confirmado ✅
- 3 abas existem: Colaboradores | Afastamentos | Ocorrências

### Problemas confirmados ⚠️

- **PES-01**: **ERRO CRÍTICO** — Base de colaboradores cadastrados não aparece na listagem. Cadastro/carregamento com erro — módulo principal está quebrado.
- **PES-02**: Email do colaborador não é puxado da base de usuários do sistema (campo texto livre). Risco de inconsistência.
- **PES-03**: Setor não é puxado da base de setores cadastrados no Admin (campo não integrado).
- **PES-04**: Cálculo de salário total **incorreto** — campo existe e atualiza, mas fórmula está errada.
- **PES-05**: **Duplicidade estrutural** — informações salariais/financeiras do colaborador existem em 2 lugares: módulo Pessoas e módulo Financeiro (Plano de Trabalho > Pessoal). Gera dubiedade e inconsistência.
- **PES-06**: Fluxo de cadastro invertido — hoje começa pela pessoa. O fluxo correto deveria ser: **PCCS → Financeiro (vaga/rubrica) → Pessoa**. O sistema não suporta esse fluxo unificado.
- **PES-07**: Não é possível atualizar um colaborador com eventos de sua jornada diretamente do card (férias, advertências, afastamentos, documentos, promoções, mudanças salariais, mudanças de setor). Cada tipo está em aba separada sem vínculo visual ao histórico do colaborador.
- **PES-08**: Não há visão de **histórico completo** do colaborador (linha do tempo: admissão → mudanças → eventos → desligamento).
- **PES-09**: Não há campo de **número de registro** do colaborador (necessário para folha e documentação). Deveria ser gerado automaticamente mas permitir edição manual para colaboradores pré-existentes.
- **PES-10**: Sem cálculo de **período aquisitivo** — o sistema não controla os 12 meses trabalhados necessários para gerar direito a férias (CLT). Risco legal.
- **PES-11**: Sem cálculo de **período concessivo** — o sistema não alerta quando os 12 meses subsequentes ao período aquisitivo estão vencendo (prazo legal para concessão). Risco legal.
- **PES-12**: Sem fluxo de **solicitação de férias com aprovação** — colaborador não consegue solicitar férias pelo sistema; gestor/RH não recebe solicitação para aprovar ou recusar com registro formal.
- **PES-13**: Sem suporte a **acordo de férias** — quando colaborador recebe férias mas não goza todos os dias, o saldo restante não é registrado. Não há "banco de dias de férias" por colaborador.
- **PES-14**: Sem **ferramenta de débito de dias** — o sistema não desconta dias gozados fracionados do banco, não atualiza saldo, não mostra histórico de uso dos dias acordados.
- **PES-15**: Sem **controle de sigilo** nas informações de acordos e histórico individual — férias, acordos e eventos sensíveis devem ser visíveis apenas para: RH, grupo de diretores/coordenadores e pessoas específicas conforme demanda (não para todos os usuários do sistema).

### Regra de negócio capturada — Férias
> Fluxo esperado para férias:
> 1. Sistema calcula período aquisitivo (12 meses trabalhados) → alerta RH quando vencido
> 2. Sistema controla período concessivo (12 meses para concessão) → alerta quando prazo se aproxima
> 3. Colaborador solicita férias pelo sistema → RH/gestor aprova ou recusa com registro
> 4. Se acordo: colaborador recebe N dias mas goza X dias → saldo (N-X) entra no banco de dias
> 5. Débito do banco: a cada gozo fracionado, sistema desconta e registra no histórico
> 6. Histórico individual completo: somente RH + diretores/coordenadores + pessoas autorizadas

### Regra de negócio capturada
> "O cadastro deveria ser unificado, aproveitando-se as informações para todo o sistema, vinculando PCCS, financeiro e só depois à pessoa."
> — Fluxo ideal: PCCS define o cargo → Financeiro aloca a rubrica/vaga → Pessoa é vinculada ao cargo e rubrica.

---

<a name="mod-05"></a>
## Módulo 05 — Pessoas / RH — Afastamentos e Ocorrências
**Status:** ⚠️ PROBLEMA CONFIRMADO

### O que o código diz
- Afastamentos: FSM `rascunho → ativo → encerrado`; tipos configuráveis via config_org.json
- Ocorrências: registro simples por colaborador sem FSM
- Ambos ficam em abas dentro de Pessoas

### Comportamento confirmado ✅
- Não testável enquanto PES-01 (erro ao carregar colaboradores) não for resolvido

### Problemas confirmados ⚠️

**AFASTAMENTOS:**
- **AFT-01**: Dependência bloqueada por PES-01 — impossível testar sem colaboradores cadastrados
- **AFT-02**: Sem campo para **anexar documentos** (atestados, laudos, CIDs) ao afastamento
- **AFT-03**: Afastamento não pode ser registrado **a partir do card do colaborador** — fluxo desconexo
- **AFT-04**: Sem **métricas gerais** de afastamentos para tomada de decisão (por período, tipo, CID, setor)
- **AFT-05**: Sem **alertas inteligentes** — mesmo CID recorrente, alta frequência de afastamentos, tempo crítico
- **AFT-06**: Campo de descrição genérico — deveria ter campo específico para **CID oficial** (lista com busca, não texto livre)
- **AFT-07**: Informações de afastamento precisam ser **sigilosas** (RH + diretores/coordenadores autorizados)

**OCORRÊNCIAS:**
- **OCO-01**: Dependência bloqueada por PES-01
- **OCO-02**: Sem **acompanhamento inteligente** — visualização rápida de quantidade e tipo por colaborador
- **OCO-03**: Sem **indicador de saúde profissional** — padrão de ocorrências não gera status de risco

### Regras de negócio capturadas
> Afastamentos: CID oficial (lista com busca), documentos anexados, registro possível a partir do card do colaborador, alertas por padrão (recorrência/gravidade), sigilo restrito.
> Ocorrências: contador visível no card do colaborador, indicador de saúde profissional, histórico cronológico.

---

<a name="mod-06"></a>
## Módulo 06 — Pessoas / RH — PCCS e Cargos
**Status:** 🔍 EM ANÁLISE

### O que o código diz
- PCCS hierárquico: PCCS → Cargos → Tabela (nível/classe/referência/salário)
- 131 cargos no seed inicial (PCCS IDM 2025)
- Localizado dentro de "RH / Depto. Pessoal" (item separado no menu)

### Comportamento confirmado ✅
- PCCS está acessível dentro de "RH / Depto. Pessoal"

### Observação estrutural confirmada
> Usuário sugere **unificar "Pessoas" e "RH / Depto. Pessoal"** em um único módulo coeso, evitando dois itens no menu com responsabilidades sobrepostas.

---

<a name="mod-09"></a>
## Módulo 09 — Espaços — Reservas
**Status:** 🔲 PENDENTE

### O que o código diz
- 3 modos de visualização: Lista | Agenda (semanal) | Diagrama Gantt (7h–22h, 2880px)
- FSM: `pendente → confirmado → habilitado → em_uso → concluido / cancelado`
- Modo lote com 4 sub-modos: manual / semanal / intervalo / mensal
- Buffer de 5 minutos entre reservas
- Pós-evento: botão para registrar realização e comprovações

### Perguntas a fazer (próxima rodada)
*(reservado)*

---

<a name="mod-13"></a>
## Módulo 13 — Ações Culturais — Lista/Kanban
**Status:** 🔲 PENDENTE

### O que o código diz
- Kanban 4 colunas (planejada / em_produção / em_execução / concluída)
- Toggle Lista / Kanban
- Métricas por status e tipo
- RBAC: leitura=todos; escrita=coordenador+; excluir=admin

### Perguntas a fazer (próxima rodada)
*(reservado)*

---

<a name="mod-16"></a>
## Módulo 16 — Financeiro — Contratos
**Status:** 🔲 PENDENTE

### O que o código diz
- 4 abas: Contratos | Fontes de Recurso | Remanejamentos | Aditivos
- ContratosDetailUI: 5 níveis de hierarquia (contrato > meta > atividade > rubricas > indicadores)
- Histórico de versões (snapshot a cada save)
- Memória de Cálculo por rubrica (com tipos: Unidade, Hora técnica, Parcela, etc.)
- FSM: `rascunho → vigente → encerrado / cancelado`

### Perguntas a fazer (próxima rodada)
*(reservado)*

---

<a name="mod-32"></a>
## Módulo 32 — Escuta Institucional — Pesquisas e Pulse
**Status:** 🔲 PENDENTE

### O que o código diz
- 6 abas: Painel | Escuta Livre | Alertas | Distribuição | Relatórios | Gestão
- FAB pulse flutuante (canto inferior direito) — aparece quando há pergunta ativa
- Pulse: resposta 1-5 por dimensão (vigor, dedicação, demanda, absorção, segurança)
- Escuta espontânea: relato livre com dimensão
- Perfil analítico voluntário (LGPD)
- Supressão de emails após 90 dias

### Perguntas a fazer (próxima rodada)
*(reservado)*

---

<a name="mod-36"></a>
## Módulo 36 — Aprovações
**Status:** 🔲 PENDENTE

### O que o código diz
- Cobre: Reservas de espaço, Primeiros acessos, Reservas de veículo
- Badge de pendentes deveria aparecer no menu (mas pode estar bugado)
- Superadmin pode estar sem acesso por restrição RBAC no código

### Perguntas a fazer (próxima rodada)
*(reservado)*

---

<a name="mod-37"></a>
## Módulo 37 — Ponto Eletrônico
**Status:** ⚠️ PROBLEMA CONFIRMADO

### O que o código diz
- GAS namespace: `registrar, excluir, listar, horasDia, mensal, bancoHoras, custoCLT, simularReajuste, calcularRescisao, turnover, exportarAFD, exportarCSVColabore, importarAFD, importarCSVColabore`
- View `#view-ponto` no HTML

### Comportamento confirmado ✅
- Aparece na sidebar e parece funcional
- Encargos (tabelas INSS/IRRF) funcionam e mostram dados atuais ✅

### Problemas confirmados ⚠️
- **PON-01**: Sub-abas de **Custo CLT** e **Rescisão** estão dentro de Ponto mas não têm relação direta com registro de ponto — pertencem a Depto. Pessoal (e possivelmente já existem lá, gerando duplicidade)
- **PON-02**: Ponto deve manter **apenas 3 subáreas**: Ponto (registro), Espelho de Ponto (relatório) e AFD (exportação)
- **PON-03**: Sem **exportação no modelo AFD** — importação existe mas exportação no formato oficial está faltando
- **PON-04**: Sem **vínculo com Escala** — o ponto não sabe qual é a escala do colaborador, logo não consegue calcular faltas, horas extras ou banco de horas corretamente

### Regras de negócio capturadas — Escalas (módulo complexo)
> O módulo de Escalas (em Depto. Pessoal) precisa ser significativamente mais robusto:
> 1. Cada gestor de setor deve poder **construir sua escala** organizando colaboradores, modelos de escala e horários
> 2. Colaboradores devem poder **solicitar troca de escala** entre si — workflow: solicitante pede → colaborador solicitado aceita → gestor confirma
> 3. Trocas de escala aprovadas devem **gerar tarefas** (entrar no módulo de Tarefas como pendências)
> 4. Ponto deve consumir a escala para calcular conformidade, faltas e horas extras automaticamente

---

<a name="mod-35"></a>
## Módulo 35 — Reuniões
**Status:** 🔲 PENDENTE

### O que o código diz
- Backend completo: reuniao_repository.gs, reuniao_engine.gs, reuniao_controller.gs
- FSM: `agendada → confirmada → em_andamento → encerrada → ata_pendente → aprovada → arquivada / cancelada`
- View `#view-reunioes` referenciada
- Completude da UI incerta

### Perguntas a fazer (próxima rodada)
*(reservado)*

---

<a name="mod-41"></a>
## Módulo 41 — Dashboard Executivo
**Status:** 🔲 PENDENTE

### O que o código diz
- 3 dashboards: operacional, financeiro, estratégico
- Integração com IaService (Claude API) para insights e relatórios
- GAS.dashboard namespace: `operacional(), financeiro(), estrategico(), insightsIA(), relatorioIA()`
- Completude e qualidade dos dados retornados incerta

### Perguntas a fazer (próxima rodada)
*(reservado)*

---

---

## PROBLEMAS CONFIRMADOS

| # | ID | Módulo | Problema | Gravidade |
|---|---|---|---|---|
| 1 | HOME-01 | Home | Informações exibidas (espaços/setores/módulos/status) só são úteis para admin — todos os papéis veem | 🟡 Média |
| 2 | HOME-02 | Home | Acessos rápidos fixos — não se adaptam ao papel do usuário logado | 🟡 Média |
| 3 | HOME-03 | Home | Não exibe informações contextuais do usuário (suas tarefas, reservas do dia, aprovações pendentes) | 🔴 Alta |
| 4 | SIDEBAR-01 | Sidebar | Menu muito extenso sem agrupamento semântico; todos os módulos no mesmo nível | 🔴 Alta |
| 5 | TAR-01 | Tarefas | Formulário com apenas título, prioridade e responsável — campos insuficientes | 🟡 Média |
| 6 | TAR-02 | Tarefas | Responsável é texto livre — não puxado da lista de pessoas do RH (risco de inconsistência) | 🔴 Alta |
| 7 | TAR-03 | Tarefas | Tarefas não se vinculam a Ações, Reservas, Contratos ou outros módulos — entidade isolada | 🔴 Alta |
| 8 | TAR-04 | Tarefas | Sem gatilhos automáticos — eventos do sistema não geram tarefas | 🔴 Alta |
| 9 | TAR-05 | Tarefas | Sem alertas (email, notificação interna, agenda) para vencimento | 🟡 Média |
| 10 | PFANTASMA | Admin | "Perfis Fantasma" (simular papel de usuário) solicitado mas não implementado | 🔴 Alta |
| 11 | PREVIEW-01 | Admin | Preview de Primeiro Acesso solicitado mas comportamento/completude incertos | 🟡 Média |
| 12 | PES-01 | Pessoas | **ERRO CRÍTICO** — Lista de colaboradores não carrega (módulo quebrado) | 🔴 Crítico |
| 13 | PES-02 | Pessoas | Email do colaborador não integrado com base de usuários | 🔴 Alta |
| 14 | PES-03 | Pessoas | Setor não integrado com base de setores do Admin | 🟡 Média |
| 15 | PES-04 | Pessoas | Cálculo de salário total incorreto | 🔴 Alta |
| 16 | PES-05 | Pessoas / Financeiro | Dados salariais duplicados em 2 módulos — dubiedade e inconsistência | 🔴 Alta |
| 17 | PES-06 | Pessoas | Fluxo de cadastro invertido — deveria ser PCCS → Financeiro → Pessoa | 🔴 Alta |
| 18 | PES-07 | Pessoas | Impossível atualizar colaborador com eventos (férias, promoção, etc.) do próprio card | 🔴 Alta |
| 19 | PES-08 | Pessoas | Sem histórico completo do colaborador (linha do tempo) | 🔴 Alta |
| 20 | PES-09 | Pessoas | Sem campo de número de registro do colaborador | 🟡 Média |
| 21 | PES-10 | Pessoas — Férias | Sem cálculo de **período aquisitivo** (12 meses trabalhados para gerar direito) | 🔴 Alta |
| 22 | PES-11 | Pessoas — Férias | Sem cálculo de **período concessivo** (12 meses seguintes para concessão obrigatória) | 🔴 Alta |
| 23 | PES-12 | Pessoas — Férias | Sem fluxo de **solicitação de férias com aprovação**: colaborador solicita → gestor/RH aprova | 🔴 Alta |
| 24 | PES-13 | Pessoas — Férias | Sem suporte a **acordo de férias** — colaborador que não gozou todos os dias não tem "banco de dias" registrado | 🔴 Alta |
| 25 | PES-14 | Pessoas — Férias | Sem **débito de dias** do banco: sistema não desconta dias gozados fracionados nem registra saldo atualizado | 🔴 Alta |
| 26 | PES-15 | Pessoas — Férias | Informações de acordos e histórico de férias sem **controle de sigilo** por papel (RH, diretores, coordenadores, pessoas específicas) | 🔴 Alta |
| 27 | AFT-02 | Afastamentos | Sem campo para anexar documentos (atestados, laudos) ao afastamento | 🔴 Alta |
| 28 | AFT-03 | Afastamentos | Afastamento não pode ser registrado a partir do card do colaborador | 🟡 Média |
| 29 | AFT-04 | Afastamentos | Sem métricas gerais de afastamentos para gestão | 🟡 Média |
| 30 | AFT-05 | Afastamentos | Sem alertas inteligentes por CID/recorrência/frequência | 🔴 Alta |
| 31 | AFT-06 | Afastamentos | Campo CID como texto livre — deveria ser lista oficial com busca | 🔴 Alta |
| 32 | AFT-07 | Afastamentos | Sem controle de sigilo (acesso restrito a RH + autorizados) | 🔴 Alta |
| 33 | OCO-02 | Ocorrências | Sem acompanhamento inteligente / contador no card do colaborador | 🟡 Média |
| 34 | OCO-03 | Ocorrências | Sem indicador de saúde profissional baseado em padrão de ocorrências | 🟡 Média |
| 35 | ESTR-01 | Pessoas/RH | "Pessoas" e "RH/Depto. Pessoal" são dois itens de menu separados com responsabilidades sobrepostas — devem ser unificados | 🔴 Alta |
| 36 | PON-01 | Ponto | Sub-abas Custo CLT e Rescisão dentro de Ponto sem relação com registro de ponto; pertencem ao Depto. Pessoal | 🟡 Média |
| 37 | PON-03 | Ponto | Falta exportação no modelo AFD (importação existe, exportação não) | 🔴 Alta |
| 38 | PON-04 | Ponto | Sem vínculo com Escala — ponto não sabe a escala do colaborador, logo faltas/HE calculados incorretamente | 🔴 Alta |
| 39 | ESC-01 | Escalas | Escalas simples — gestor de setor não consegue montar escala completa com cada colaborador, modelo e horário | 🔴 Alta |
| 40 | ESC-02 | Escalas | Sem workflow de troca de escala entre colaboradores (solicitante → solicitado → gestor confirma) | 🔴 Alta |
| 41 | ESC-03 | Escalas | Trocas de escala não geram tarefas no módulo de Tarefas | 🟡 Média |

---

## MELHORIAS CONFIRMADAS
*(preenchido progressivamente durante os testes)*

| # | Módulo | Melhoria | Prioridade | Confirmado em |
|---|---|---|---|---|
| — | — | — | — | — |

---

## REGRAS DE NEGÓCIO CONFIRMADAS
*(preenchido progressivamente durante os testes)*

| # | Módulo | Regra | Confirmado em |
|---|---|---|---|
| — | — | — | — |

---

## HIPÓTESES DESCARTADAS
*(preenchido progressivamente durante os testes)*

| # | Hipótese original | Por que foi descartada | Data |
|---|---|---|---|
| — | — | — | — |

---

## LOG DE SESSÕES

| Data | Módulos cobertos | Descobertas principais |
|---|---|---|
| 2026-05-31 | Estruturação inicial | Roteiro criado; análise de código mapeou 49 módulos/subáreas a auditar |
| 2026-05-31 | Home + Sidebar | Home: informações admin-only (espaços/setores/módulos/status) + acessos rápidos fixos. Sidebar: muito extensa, sem agrupamento — dificulta navegação. |
| 2026-05-31 | Sidebar (aprofundamento) + Tarefas | Sidebar: superadmin vê todos os itens (Reuniões, Ponto, Balcão, Dashboard). "Perfis Fantasma" e preview de Primeiro Acesso foram solicitados mas não implementados. Tarefas: email de responsável sem autocomplete, sem vínculos com módulos, sem gatilhos ou alertas. |
| 2026-05-31 | Pessoas/RH — Colaboradores | ERRO CRÍTICO: lista não carrega. Email/setor não integrados. Cálculo de salário errado. Dados duplicados entre Pessoas e Financeiro. Fluxo de cadastro invertido (deveria ser PCCS→Financeiro→Pessoa). Sem histórico de colaborador. Sem número de registro. |
| 2026-05-31 | Pessoas — Férias, Afastamentos, Ocorrências | Férias: sem período aquisitivo/concessivo, sem fluxo solicitação/aprovação, sem banco de dias, sem sigilo. Afastamentos: sem docs anexados, sem CID oficial, sem alertas inteligentes, sem sigilo. Ocorrências: sem contador no card, sem indicador profissional. Estrutural: Pessoas + RH/DP devem ser unificados. |
| 2026-05-31 | Holerite, Encargos, Ponto, Escalas | Holerite: acessível mas bloqueado por PES-01. Encargos: ✅ funcional. Ponto: sub-abas erradas (Custo CLT/Rescisão pertencem ao DP), sem exportação AFD, sem vínculo com escala. Escalas: estrutura insuficiente — gestor precisa montar escala completa; falta workflow de troca com aprovação e geração de tarefas. |

---

## LOCALIZAÇÃO DO ARQUIVO

- **Plano local (Claude Code):** `/home/jpbarros/.claude/plans/prompt-auditoria-mighty-hejlsberg.md`
- **No projeto (versionado):** `docs/auditoria/roteiro-auditoria.md`

O arquivo em `docs/auditoria/` é a cópia rastreada pelo git — fonte de verdade para qualquer ambiente.
Após cada sessão: copiar o conteúdo atualizado para `docs/auditoria/roteiro-auditoria.md` e fazer commit.

---

*Este documento é a fonte única de verdade da auditoria. Atualizar a cada sessão de análise.*
