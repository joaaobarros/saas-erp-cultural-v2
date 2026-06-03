# AUDITORIA ERP Cultural SaaS v2 — Roteiro Vivo
> Diagnóstico técnico-funcional construído em tempo real, módulo por módulo, via confirmação direta.
> **Nunca assumir — sempre confirmar.**
> Atualizado progressivamente a cada sessão.

---

## MODO DE OPERAÇÃO DESTA AUDITORIA

> **Claude dirige a auditoria — não o usuário.** O usuário responde perguntas, confirma comportamentos no sistema real e corrige hipóteses. Nunca perguntar "qual módulo seguimos agora?".

### Modo de pensamento obrigatório
Esta auditoria opera em modo equivalente a **Planning / Deep Analysis / Extended Thinking**:
- Explorar lentamente, módulo a módulo, aba a aba, campo a campo
- Manter contexto acumulado entre sessões (este documento é a memória)
- Formular hipóteses e revisitá-las com novas informações
- Correlacionar descobertas entre módulos
- Construir documentação progressiva sem sobrescrever descobertas antigas
- Fazer perguntas específicas e inteligentes — uma por vez
- **Nunca implementar, corrigir ou sugerir código** durante a auditoria

### O que NÃO fazer
- Não esperar o usuário indicar próximo módulo
- Não implementar soluções antes de concluir o diagnóstico completo
- Não abrir novo chat (quebra continuidade sistêmica)
- Não inferir regras sem validar com o usuário no sistema real
- Não pular investigação por pressão de tempo

### Fases da auditoria
1. **Exploração** — navegar, observar, mapear, perguntar
2. **Aprofundamento** — módulo a módulo, fluxo a fluxo, regra a regra
3. **Consolidação** *(futura)* — arquitetura, priorização, roadmap, redesign

### Princípios de registro
- Nunca sobrescrever descobertas antigas
- Revisar hipóteses antigas quando novas informações surgirem
- Apontar inconsistências conceituais entre módulos
- Atualizar o Rastreador de Testes Reais a cada sessão

---

## PROMPT BASE DA AUDITORIA

> Este é o prompt original que gerou e orienta toda a auditoria. Deve ser relido e respeitado até o final do processo.

**Papel:** analista sênior de produto, UX, QA, arquitetura funcional e processos.

**Missão:** analisar profundamente todo o sistema e produzir um diagnóstico técnico-funcional completo com plano de melhorias. **Não programar, não corrigir, não alterar.**

**Metodologia em duas fases:**
- **Fase 1 — Exploração global:** percorrer todo o sistema sem finalizar conclusões, sem propor soluções, apenas mapear.
- **Fase 2 — Análise módulo por módulo:** aba a aba, fluxo a fluxo, funcionalidade a funcionalidade. Não avançar antes de: entender profundamente, testar tudo, fazer perguntas sobre regras de negócio, correlacionar com o restante, registrar melhorias/riscos/dependências.

**Construção contínua do plano:** cada descoberta é registrada, categorizada e associada a módulos em tempo real.

**O que analisar em cada módulo:** o que FAZ, como foi PENSADO, como as partes se conectam, gargalos, inconsistências, pontos incompletos, confusões operacionais, problemas de arquitetura/UX/fluxo/manutenção.

**Regra de ouro:** quando identificar comportamento inesperado, lógica contraditória, ausência de algo ou processo confuso — **perguntar ao usuário antes de concluir**. Perguntas devem ser inteligentes e específicas. Manter histórico e revisitar hipóteses com novas informações. O processo pode durar dias, semanas ou meses — não simplificar cedo demais.

---

## COMO ESTE DOCUMENTO FUNCIONA

1. **Exploração → Pergunta → Confirmação → Registro**
2. Cada módulo tem uma seção com: o que o código diz, o que ainda precisa ser confirmado, e o que foi efetivamente validado
3. Nenhuma conclusão é final até ser confirmada pelo usuário testando no sistema real
4. O plano de melhorias só é construído depois que cada módulo for compreendido
5. **Estrutura visual obrigatória:** a cada página ou aba auditada, registrar a estrutura visual da tela (cabeçalho, abas, grids de métricas, listas, filtros, botões de ação, cards) para comparação posterior e análise de unidade visual do sistema
6. **Unidade visual obrigatória — granularidade máxima:** a cada módulo, aba **e modal** analisado, inspecionar **cada botão, campo, label, estrutura de layout e organização de elementos** comparando com os padrões de referência (tabela em Módulo 12). Não apenas o componente como um todo — cada elemento individualmente. Registrar qualquer desvio como problema com ID próprio

---

## ⚡ RASTREADOR DE TESTES REAIS

> **Finalidade:** evitar repetição de testes já realizados em sessões anteriores. Antes de pedir ao usuário para testar algo, verificar esta tabela. Se o item já está com ✅ e data, pular.
>
> **Legenda:** ✅ testado no sistema | 🔲 pendente | ⚠️ bug confirmado | ❌ não funciona

### Módulo 01 — Home
| Item | Status | Sessão |
|---|---|---|
| Tela inicial carrega | ✅ | 2026-05-31 |
| Banner de boas-vindas, espaços, setores, módulos, status | ✅ | 2026-05-31 |
| Acessos rápidos (Nova Ação, Infraestrutura, Financeiro) | ✅ fixos | 2026-05-31 |

### Módulo 02 — Sidebar
| Item | Status | Sessão |
|---|---|---|
| Menu carrega sem erro | ✅ | 2026-05-31 |
| Menu extenso sem agrupamento | ⚠️ SIDEBAR-01 | 2026-05-31 |

### Módulo 03 — Tarefas
| Item | Status | Sessão |
|---|---|---|
| View carrega, filtros e métricas | ✅ | 2026-05-31 |
| Formulário Nova Tarefa | ✅ (campos básicos) | 2026-05-31 |
| Responsável texto livre | ⚠️ TAR-02 | 2026-05-31 |
| Sem campo acaoId | ⚠️ TAR-03 | 2026-05-31 |

### Módulo 04 — Pessoas / Colaboradores
| Item | Status | Sessão |
|---|---|---|
| Lista de colaboradores | ✅ PES-01 CORRIGIDO (provável) — lerJSON alias adicionado | 2026-06-01 |
| Formulário de colaborador | 🔲 bloqueado por PES-01 | — |

### Módulo 05 — Afastamentos e Ocorrências
| Item | Status | Sessão |
|---|---|---|
| Testes completos | 🔲 bloqueado por PES-01 | — |

### Módulo 06 — PCCS e Cargos
| Item | Status | Sessão |
|---|---|---|
| PCCS acessível em RH/DP | ✅ | 2026-05-31 |
| Estrutura de abas (11 abas, 3 linhas) | ⚠️ ESTR-02 | 2026-05-31 |

### Módulo 07 — Holerite
| Item | Status | Sessão |
|---|---|---|
| Acessível no menu | ✅ | 2026-05-31 |
| Testes completos | 🔲 bloqueado por PES-01 | — |

### Módulo 08 — Encargos
| Item | Status | Sessão |
|---|---|---|
| Tabelas INSS/IRRF exibem dados atuais | ✅ | 2026-05-31 |

### Módulo 37 — Ponto Eletrônico
| Item | Status | Sessão |
|---|---|---|
| View carrega com abas | ✅ | 2026-05-31 |
| Sub-abas Custo CLT e Rescisão deslocadas | ⚠️ PON-01 | 2026-05-31 |

### Módulo 09 — Infraestrutura / Reservas
| Item | Status | Sessão |
|---|---|---|
| View carrega sem erro | ✅ | 2026-05-31 |
| Métricas nível-1 (topo) e nível-2 (aba) com MetricsToggle | ✅ | 2026-05-31 |
| Modo Lista (filtros, estado vazio) | ✅ | 2026-05-31 |
| Modo Agenda (grade semanal, navegação) | ✅ | 2026-05-31 |
| Modo Diagrama (9 espaços, barras, filtros) | ✅ (com ESP-01) | 2026-05-31 |
| Modo Mapa (planta interativa, filtros, legenda) | ✅ | 2026-05-31 |
| Formulário Nova Reserva (campos, capacidade dinâmica, tempo calculado) | ✅ | 2026-05-31 |
| Modal Lote (4 sub-modos) | ✅ (com ESP-13, ESP-14, ESP-15) | 2026-05-31 |
| FSM completo (Pendente→Confirmada→Habilitada→Em uso→Concluída) | ✅ | 2026-05-31 |
| Config → Espaços, Itens, Horários, Mapa | ✅ | 2026-05-31 |
| Seção "ITENS SOLICITADOS" no formulário (catálogo vazio) | ✅ (com ESP-09a) | 2026-05-31 |
| Filtro data default = hoje (lista parecia vazia) | ✅ ESP-02 CORRIGIDO s16 @387 — inicia sem valor, todas as datas visíveis | 2026-06-01 |

### Módulo 09 — Infraestrutura / Aprovações
| Item | Status | Sessão |
|---|---|---|
| 4 abas carregam (Reservas, Primeiros Acessos, Veículo, Permissões) | ✅ | 2026-05-31 |
| Sem badge de contador por aba | ⚠️ APR-01 | 2026-05-31 |

### Módulo 09 — Infraestrutura / Chaves
| Item | Status | Sessão |
|---|---|---|
| View carrega, métricas, lista de protocolos | ✅ | 2026-05-31 |
| Formulário Nova Retirada (painel inline) | ✅ (com CHV-04 a CHV-08) | 2026-05-31 |
| Devolução — modal inline (condição + obs + confirmar) | ✅ CHV-03 CORRIGIDO s16 @387 | 2026-06-01 |

### Módulo 09 — Infraestrutura / Empréstimos
| Item | Status | Sessão |
|---|---|---|
| View carrega, métricas, lista vazia | ✅ | 2026-05-31 |
| Formulário Solicitar Empréstimo (catálogo vazio) | ✅ (com EMP-01 a EMP-07) | 2026-05-31 |

### Módulo 13 — Ações Culturais / Lista e Kanban
| Item | Status | Sessão |
|---|---|---|
| Kanban carrega, métricas, filtros | ✅ | 2026-05-31 |
| Toggle Lista/Kanban | ✅ | 2026-05-31 |
| Formulário Nova Ação (9 campos) | ✅ (com ACO-12, ACO-14, ACO-17 a ACO-20) | 2026-05-31 |
| Modal Editar Ação | ✅ | 2026-05-31 |
| Botão Editar (caminho direto) | ✅ ACO-05 CORRIGIDO — BtnGuard.liberar em fecharForm | 2026-06-01 |
| Botão ✕ fecha painel | ✅ ACO-16 CORRIGIDO — stopPropagation + overlay guard | 2026-06-01 |
| Card/lista exibe "nm" quando responsável sem @ | ✅ ACO-02 CORRIGIDO s16 @387 — guard `indexOf('@')>=0` | 2026-06-01 |
| Setor não auto-preenchido em Nova Ação | ✅ ACO-03 CORRIGIDO s16 @387 — `_boot.usuarioSetor` via bootstrap | 2026-06-01 |

### Módulo 13/14 — Painel da Ação (abas internas)
| Item | Status | Sessão |
|---|---|---|
| Painel abre na aba Visão Geral | ✅ | 2026-05-31 |
| Visão Geral (campos, status, descrições) | ✅ | 2026-05-31 |
| Aba Tarefas | ✅ estado vazio ("Nenhuma tarefa vinculada") | 2026-06-01 |
| Aba Reservas | ✅ estado vazio | 2026-06-01 |
| Aba Contratos | ✅ estado vazio | 2026-06-01 |
| Aba Equipe | ✅ estado vazio | 2026-06-01 |
| Aba Financeiro | ✅ 3 cards R$ 0,00, barra 0% | 2026-06-01 |
| Aba Contratações | ✅ estado vazio carrega; botão "+ Nova Contratação" | ❌ ACO-07r inoperante | 2026-06-01 |
| Aba Mapa do Evento — lista | ✅ 2 mapas listados (Espaços CCBJ + Seleção), Abrir e excluir funcionam | 2026-06-01 |
| Mapa — operação Mesclar | ✅ CORRIGIDO s16 Fase 9 | 2026-06-01 |
| Mapa — abertura (sobreposição) | ✅ CORRIGIDO s16 Fase 10 | 2026-06-01 |
| Mapa — fechamento (navegação) | ✅ CORRIGIDO s16 Fase 10 | 2026-06-01 |
| Transições de status (painel) — Visão Geral | ✅ confirmado (ACO-06, ACO-27, ACO-28) | 2026-06-01 |
| Botão Editar (caminho via botão no painel) | ✅ ACO-05 CORRIGIDO — BtnGuard.liberar adicionado em fecharForm() | 2026-06-01 |

### Módulo 21 — Contratações
| Item | Status | Sessão |
|---|---|---|
| View carrega com MÉTRICAS e 3 abas | ✅ | 2026-06-01 |
| Aba Solicitações — filtros, busca, estado vazio | ✅ | 2026-06-01 |
| Formulário "+ Nova" — 7 seções mapeadas | ✅ | 2026-06-01 |
| Seção 5 "VÍNCULO FINANCEIRO" — cascata Contrato→Meta→Rubrica | ✅ estrutura confirmada | 2026-06-01 |
| Vínculo Financeiro — META exibe ID técnico, não nome | ✅ CORRIGIDO s16 Fase 8 | 2026-06-01 |
| Vínculo Financeiro — RUBRICA não lista após selecionar meta | ✅ CORRIGIDO s16 Fase 8 | 2026-06-01 |
| Seção 7 — documentos por fase | ✅ guia confirmado | 2026-06-01 |
| Nº Esboço não é pré-preenchido automaticamente | ⚠️ CON-02 | 2026-06-01 |
| Setor Solicitante é texto livre | ⚠️ CON-01 | 2026-06-01 |
| Ação Vinculada é select (não texto livre) | ✅ | 2026-06-01 |
| Salvar rascunho | ✅ CON-08 CORRIGIDO — lerJSON alias adicionado | 2026-06-01 |
| FSM e painel de detalhe de uma solicitação | 🔲 bloqueado por CON-08 | — |
| Contratação concluída atualiza "Executado" no Financeiro | 🔲 bloqueado por CON-08 | — |
| Aba Fornecedores — spinner infinito, botões inoperantes | ⚠️ CON-05 | 2026-06-01 |
| Aba Habilitações — estado vazio; propósito não claro para o usuário | ⚠️ CON-06 | 2026-06-01 |

### Módulo 35 — Reuniões
| Item | Status | Sessão |
|---|---|---|
| View carrega sem erro | ✅ | 2026-05-31 s9 |
| MÉTRICAS (6 cards com MetricsToggle) | ✅ (com REU-01 — 6º card isolado) | 2026-05-31 s9 |
| 2 abas: Lista \| Encaminhamentos | ✅ | 2026-05-31 s9 |
| Toolbar: busca + filtro status + refresh | ✅ | 2026-05-31 s9 |
| Estado vazio "Nenhuma reunião encontrada." | ✅ | 2026-05-31 s9 |
| Modal "Nova Reunião" — aba Dados | ✅ (com REU-02, REU-03, ACO-21) | 2026-05-31 s9 |
| Modal — aba Pauta | ✅ (com REU-04) | 2026-05-31 s9 |
| Modal — aba Presença | ✅ (com REU-05) | 2026-05-31 s9 |
| Modal — aba Ata | ✅ (com REU-06) | 2026-05-31 s9 |
| Modal — aba Encaminhamentos | ✅ (com REU-07) | 2026-05-31 s9 |
| FSM completo (cards na lista, botões de ação) | 🔲 sem dados — base vazia | — |
| Fluxo de criação → agendar → iniciar → encerrar → ata | 🔲 pendente | — |
| Aba Encaminhamentos (view, não modal) | 🔲 pendente | — |
| Processo de aprovação de ata | 🔲 a confirmar com usuário | — |

### Módulo 43 — Admin
| Item | Status | Sessão |
|---|---|---|
| View principal | ✅ | sessão anterior |
| Aba Espaços — lista + botões ação | ✅ (ESP-10 confirmado: "Liberar/Bloquear reservas" por espaço) | 2026-05-31 s10 |
| Aba Setores — lista com cor identificadora | ✅ (7 setores: Ação Cultural, Escola, NArTE, Administrativo, Infraestrutura, Comunicação, Gestão) | 2026-05-31 s10 |
| ~~Aba Turnos~~ — **REMOVIDA** (movida para Infraestrutura → Config → Horários) | ✅ **CORRIGIDO** s17 @446 — ADM-08 resolvido | 2026-06-03 |
| Aba Categ. Itens — 6 categorias | ✅ (Equipamento Audiovisual, Equipamento de Informática, Mobiliário, Material Gráfico, Insumo, Outro) | 2026-05-31 s10 |
| Aba Módulos — lista com toggle ativo/inativo | ✅ (Administração, Dashboard Executivo, Tarefas, Estratégia, Pessoas/RH, Ponto Eletrônico, Escuta Institucional, Voluntários, Ações, Agentes Culturais — todos Ativos) | 2026-05-31 s10 |
| Aba Features — 3 features visíveis | ✅ CORRIGIDO s16 Fase 6 | 2026-06-01 |
| Aba Provisionamento — checklist 8/8 (100%) | ✅ mas ADM-11 (Wizard abre página vazia) | 2026-05-31 s10 |
| Aba Usuários (tabela, modal editar) | ✅ (ADM-02, ADM-03) | sessão anterior |
| Modal editar usuário — Funcionalidades Específicas | ✅ **NOVA DESCOBERTA** — seção existe com granularidade real (ADM-02 REVISADO) | 2026-05-31 s10 |
| ~~Aba Config. Sistema~~ — **REMOVIDA** | ✅ **CORRIGIDO** s17 @446 — Expediente & Horários → Infraestrutura; Identidade Visual → aba própria em Cadastros Base | 2026-06-03 |
| Aba Identidade Visual (novo, substituiu Config. Sistema) | ✅ mesmo conteúdo, agora aba direta em Cadastros Base | 2026-06-03 |
| Aba Banco de Dados | ✅ (ADM-04) + 8 planilhas + botões Drive ✅ | 2026-05-31 s10 |
| Botão "Visualizar Cadastro" em Acessos Pendentes | ❌ ADM-12 — página externa em branco | 2026-05-31 s10 |
| Tab bar com 10 abas — scroll sinalizado? | ⚠️ ADM-07 — scroll oculto sem indicação visual | 2026-05-31 s10 |
| Modal "Novo Espaço" — campos | ✅ (horário por espaço e responsáveis por período já implementados) | 2026-05-31 s10 |
| Modal "Novo Turno" — campos | ✅ (Nome, Início, Fim, Dias da semana com checkboxes) | 2026-05-31 s10 |
| Modal "Novo Setor" — campos | ✅ (Nome + Cor identificadora com seletor de cor) | 2026-05-31 s10 |

### Módulo 38 — Meu Centro / TaskHub
| Item | Status | Sessão |
|---|---|---|
| View carrega, 3 abas (Meu Dia / Meu Time / Produtividade) | ✅ | 2026-05-31 s12 |
| Meu Dia — estado vazio | ✅ (com HUB-02, HUB-03) | 2026-05-31 s12 |
| Meu Time — estado vazio | ✅ (com HUB-04) | 2026-05-31 s12 |
| Produtividade — 5 cards | ✅ (com HUB-01, HUB-05, HUB-10) | 2026-05-31 s12 |
| Meu Dia com dados reais | 🔲 pendente | — |

### Módulo 32 — Pulse / Escuta
| Item | Status | Sessão |
|---|---|---|
| Pulse FAB — aparece e exibe pergunta | ✅ | sessão anterior |
| Pulse FAB — submissão da resposta | ✅ **CORRIGIDO CONFIRMADO** | 2026-05-31 s11 |
| Pulse FAB — anti-spam respeitado (não aparece a cada refresh) | ⚠️ PUL-03 CORRIGIDO s17 @426 | 2026-06-02 |
| Pulse — pergunta temporal correta por turno | ⚠️ PUL-04 CORRIGIDO s17 @424 | 2026-06-02 |
| Pulse — monitoramento: colaborador aparecia como "sem atividade" | ⚠️ PUL-05 CORRIGIDO s17 @424 | 2026-06-02 |
| Pulse — monitoramento exibe nome de quem não respondeu | ⚠️ PUL-06 CORRIGIDO s17 @426 — só exibe contagem | 2026-06-02 |
| View de gestão Escuta (estrutura) | ✅ | sessão anterior |
| Aba Painel — carrega (loading infinito parcial) | ✅ ESC-04 CORRIGIDO s16 F13 | 2026-06-01 |
| Aba Painel — EVOLUÇÃO DO CLIMA (estado vazio) | ✅ | 2026-05-31 s11 |
| Aba Painel — PESQUISAS FORMAIS (estado vazio) | ✅ | 2026-05-31 s11 |
| Modal "+ Nova Pesquisa" — campos | ✅ com ⚠️ ESC-06, ESC-15 | 2026-05-31 s11 |
| Aba Escuta Livre — RESPONDER PESQUISA ATIVA | ✅ estado vazio com orientação | 2026-05-31 s11 |
| Aba Escuta Livre — RELATO ESPONTÂNEO | ✅ textarea + dimensão + anônimo | 2026-05-31 s11 |
| Aba Escuta Livre — MEU PERFIL ANALÍTICO | ⚠️ ESC-08 deve ser removido | 2026-05-31 s11 |
| Aba Alertas — carrega, estado vazio | ✅ estrutura (propósito não claro — ESC-10) | 2026-05-31 s11 |
| Aba Distribuição — SISTEMA PULSE MÉDIAS | ✅ estado vazio (com ⚠️ ESC-11) | 2026-05-31 s11 |
| Aba Distribuição — SATURAÇÃO POR DIMENSÃO | ⚠️ ESC-11 IDs numéricos em vez de nomes | 2026-05-31 s11 |
| Aba Distribuição — PARTICIPAÇÃO HISTÓRICA (12m) | ✅ gráfico linha mensal | 2026-05-31 s11 |
| Aba Relatórios — select pesquisa + Cruzamento + Relatório | ✅ estado vazio funcional | 2026-05-31 s11 |
| Aba Gestão — MARCADORES METODOLÓGICOS | ✅ ESC-05 CORRIGIDO s16 F13 | 2026-06-01 |
| Aba Gestão — BANCO DE PERGUNTAS PULSE | ✅ lista completa com dimensões, taxas, toggles | 2026-05-31 s11 |
| Aba Gestão — MONITORAMENTO PULSE | ✅ tabela com impressões/respostas/taxa | 2026-05-31 s11 |
| Aba Gestão — CONFIGURAÇÕES PULSE | ✅ 4 campos + Salvar (⚠️ cor errada) | 2026-05-31 s11 |
| Aba Gestão — CICLO DE FEEDBACK | ✅ estado vazio com instrução | 2026-05-31 s11 |
| Aba Gestão — LGPD SUPRESSÃO | ✅ botão vermelho operação destrutiva | 2026-05-31 s11 |

### Módulo 16 — Financeiro
| Item | Status | Sessão |
|---|---|---|
| View carrega com 4 abas (Contratos, Remanejamentos, Aditivos, Exportações) | ✅ | 2026-06-01 |
| MÉTRICAS nível-1 (Total, Ativos, Suspensos, Valor em aberto) com MetricsToggle | ✅ | 2026-06-01 |
| Aba Remanejamentos — vazia | ✅ | 2026-06-01 |
| Aba Aditivos — card "Valor Aditivado" exibe "—" | ⚠️ FIN-13 | 2026-06-01 |
| Aba Exportações (SALIC, PNAB, SNIIC) | ✅ estrutura confirmada | 2026-06-01 |
| Painel do contrato (5 abas) abre ao clicar no card | ✅ | 2026-06-01 |
| Painel — Plano de Trabalho (hierarquia Meta → Atividade → Rubrica) | ✅ | 2026-06-01 |
| Painel — Pessoal (colaborador com custo detalhado) | ✅ | 2026-06-01 |
| Painel — Indicadores (RESULTADOS e GESTÃO) | ✅ | 2026-06-01 |
| Painel — Plano de Contas (tabela SEPLAG consolidada) | ✅ | 2026-06-01 |
| Painel — Histórico (lista de versões com data/usuário, sem conteúdo) | ✅ (com FIN-12) | 2026-06-01 |
| Formulário Novo Contrato (campos mapeados) | ✅ | 2026-06-01 |
| Formulário de Rubrica com Memória de Cálculo inline | ✅ (com FIN-01, FIN-10) | 2026-06-01 |
| Modal read-only da Memória de Cálculo (ícone olho) | ✅ FIN-03 NEGADO | 2026-06-01 |
| FIN-01 (Setor não persiste na Memória de Cálculo) | ⚠️ CONFIRMADO | 2026-06-01 |
| FIN-07 (label "Valor em Aberto" ambíguo) | ⚠️ CONFIRMADO | 2026-06-01 |
| FSM do contrato — botões de transição na UI | ✅ FIN-14 CORRIGIDO s16 F17 — botões Suspender/Encerrar no card + modal de confirmação + motivo | 2026-06-01 |
| Ícone de pessoas no card | ⚠️ ~~FIN-15~~ CORRIGIDO s17 F50 — `manage_accounts` → `folder_open` no card do contrato. FIN-17 CORRIGIDO s16 F12 | 2026-06-01 |
| Modal "Editar Pessoal" — campos mapeados | ✅ confirmado via screenshot | 2026-05-31 s10 |
| FIN-01 (Setor não persiste) | ✅ CORRIGIDO commit 0e9317f — mas ver FIN-19: correção no nível errado | — |
| Setor na Rubrica (nível correto) + consolidação dupla | ⚠️ FIN-19 — decisão arquitetural s13 | 2026-05-31 s13 |
| Flags de operação configuráveis por rubrica (padrão geral) | ⚠️ FIN-20 — decisão arquitetural s13 | 2026-05-31 s13 |
| Flag específica `voucher_uber` por rubrica | ⚠️ FIN-18 — instância de FIN-20 | 2026-05-31 s13 |
| FIN-02 (colapso pós-save incorreto) | ✅ CORRIGIDO commit 0e9317f | — |
| FIN-04 (tipo Serviço ausente) | ✅ CORRIGIDO commit 0e9317f | — |
| FIN-05 (drag-and-drop de metas) | ✅ CORRIGIDO commit 0e9317f | — |
| FIN-06 (integração Financeiro↔RH) | 🔲 a confirmar | — |
| FIN-08 (contraste dropdown setores) | ✅ CORRIGIDO commit 0e9317f | — |
| Execução financeira real (pagamentos, NF, comprovantes) | 🔲 pendente | — |

### Módulo 22/23 — Comunicação (RECE + Balcão)
| Item | Status | Sessão |
|---|---|---|
| View RECE carrega (título, subtítulo, botão, filtros) | ✅ | 2026-06-01 |
| MÉTRICAS (5 cards: Total/Rascunho/Submetida/Publicada/Encerrada) | ✅ estrutura; valores "—" (sem dados) | 2026-06-01 |
| Lista resolve para "Nenhum Registro encontrado" | ✅ | 2026-06-01 |
| FSM visível: sem passo revisão Comunicação | ⚠️ RECE-04 confirmado | 2026-06-01 |
| Botão "+ Novo Registro RECE" (arquiteturalmente incorreto) | ❌ RECE-16 | 2026-06-01 |
| Datepicker quebrado "---------- de ----" | ❌ RECE-15 | 2026-06-01 |
| Sem modo Agenda | ❌ RECE-17 | 2026-06-01 |
| Balcão ausente como aba do módulo Comunicação | ❌ decisão arquitetural pendente | 2026-06-01 |
| Formulário de detalhes / edição RECE | 🔲 pendente | — |
| Unidade visual completa (classes CSS) | 🔲 pendente | — |
| Balcão de Comunicação (view e formulário) | 🔲 pendente | — |

### Módulo 23 — Balcão de Comunicação
| Item | Status | Sessão |
|---|---|---|
| View carrega (título, subtítulo, filtros, estado vazio) | ✅ | 2026-06-01 |
| MÉTRICAS (6 cards: Total/Em Execução/Em Revisão/Concluídas/Atrasadas + % No Prazo) | ✅ estrutura; todos 0 | 2026-06-01 |
| Estado vazio "Nenhuma demanda encontrada." | ✅ | 2026-06-01 |
| Cor do botão "+ Nova Demanda" vs padrão sistema | ⚠️ BAL-02 (verificar) | 2026-06-01 |
| Formulário "+ Nova Demanda" (aba Dados) | ✅ abre; campos mapeados (BAL-06 a BAL-12) | 2026-06-01 |
| Formulário — aba Versões | ✅ abre; URL + Nota + Enviar Entrega (BAL-13 a BAL-15) | 2026-06-01 |
| Formulário — aba Comentários | ✅ textarea + Enviar funcional | 2026-06-01 |
| BtnGuard ao fechar sem salvar | ✅ BAL-17 CORRIGIDO | 2026-06-01 |
| Aprovação final do material entregue | ❌ BAL-16 ausente no FSM | 2026-06-01 |
| Sem filtro de data | ⚠️ BAL-03 | 2026-06-01 |
| Sem filtro por Ação Cultural | ⚠️ BAL-04 | 2026-06-01 |
| Unidade visual completa (classes CSS) | 🔲 pendente | — |

### Módulo 24 — Agentes Culturais
| Item | Status | Sessão |
|---|---|---|
| View carrega | 🔲 pendente verificação (AGN-01 CORRIGIDO s16 Fase 6) | — |

### Módulo 25 — Acervo Digital
| Item | Status | Sessão |
|---|---|---|
| View carrega | ✅ | 2026-05-31 s14 |
| Galeria — "Carregando..." sem resolver | ✅ CORRIGIDO s16 Fase 7 | 2026-06-01 |
| Stats sem MetricsToggle | ⚠️ ACV-03 | 2026-05-31 s14 |
| Filtros inline sem classe DS | ⚠️ ACV-05 | 2026-05-31 s14 |
| Modal "Adicionar ao Acervo" — estrutura | ✅ abre | 2026-05-31 s14 |
| Modal — Select Ação vinculada vazio + campo nome + acaoId obrigatório | ✅ ACV-07 + ACV-08 + ACV-11 CORRIGIDOS s16 F14 | 2026-06-01 |
| Modal — Botão Cancelar rosa/pink | ⚠️ ACV-02 | 2026-05-31 s14 |
| Fluxo de salvamento | 🔲 bloqueado (ACV-01/07) | — |

### Módulo 34 — Reserva de Veículo
| Item | Status | Sessão |
|---|---|---|
| View carrega (Lista + Agenda + MetricsToggle) | ✅ | 2026-05-31 s13 |
| Modo Lista — card com reserva APROVADA e FSM | ✅ (CAR-05/SIS-14 CORRIGIDO s16 Fase 11; CAR-06 persiste) | 2026-06-01 |
| Modo Agenda — grade mensal com reserva plotada | ✅ | 2026-05-31 s13 |
| Modal de detalhes (agenda) | ✅ (CAR-07/SIS-14 CORRIGIDO s16 Fase 11; CAR-08 persiste) | 2026-06-01 |
| Formulário "Nova Reserva" — campos mapeados | ✅ (com CAR-04, CAR-09, CAR-10, CAR-11) | 2026-05-31 s13 |
| FSM — botões Concluir / Cancelar (card + modal) | ✅ | 2026-05-31 s13 |
| Sidebar: "Reserva de Carro" vs "Reserva de Veículo" | ⚠️ CAR-02 | 2026-05-31 s13 |
| Motorista — feature configurável, desativada por padrão | ✅ CAR-12 respondido | 2026-05-31 s13 |
| Veículos — feature configurável, desativada por padrão | ✅ CAR-14 respondido | 2026-05-31 s13 |
| Self-approval superadmin | ✅ INTENCIONAL — superadmin aprova qualquer coisa | 2026-05-31 s13 |

---

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
| 09 | [Infraestrutura — Reservas](#mod-09) | Infraestrutura | 🔲 PENDENTE |
| 10 | [Infraestrutura — Chaves](#mod-10) | Infraestrutura | 🔲 PENDENTE |
| 11 | [Infraestrutura — Patrimônio / Ativos](#mod-11) | Infraestrutura | 🔲 DIFERIDO (aguarda informação) |
| 12 | [Infraestrutura — Almoxarifado / Estoque](#mod-12) | Infraestrutura | 🔍 EM ANÁLISE |
| 13 | [Ações Culturais — Lista/Kanban](#mod-13) | Cultural | ⚠️ PROBLEMA CONFIRMADO |
| 14 | [Ações Culturais — Painel da Ação](#mod-14) | Cultural | 🔲 PENDENTE |
| 15 | [Ações Culturais — Mapa do Evento](#mod-15) | Cultural | 🔲 PENDENTE |
| 16 | [Financeiro — Contratos](#mod-16) | Financeiro | 🔲 PENDENTE |
| 17 | [Financeiro — Plano de Trabalho (Metas/Rubricas)](#mod-17) | Financeiro | 🔲 PENDENTE |
| 18 | [Financeiro — Fontes de Recurso](#mod-18) | Financeiro | 🔲 PENDENTE |
| 19 | [Financeiro — Remanejamentos](#mod-19) | Financeiro | 🔲 PENDENTE |
| 20 | [Financeiro — Aditivos](#mod-20) | Financeiro | 🔲 PENDENTE |
| 21 | [Contratações](#mod-21) | Financeiro | 🔲 PENDENTE |
| 22 | [Comunicação — RECE](#mod-22) | Cultural | 🔍 EM ANÁLISE |
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
| 34 | [Reserva de Veículo](#mod-34) | Infraestrutura | ⚠️ PROBLEMA CONFIRMADO |
| 35 | [Reuniões](#mod-35) | Gestão | ⚠️ PROBLEMA CONFIRMADO |
| 36 | [Aprovações](#mod-36) | Governança | ⚠️ PROBLEMA CONFIRMADO |
| 37 | [Ponto Eletrônico](#mod-37) | RH | 🔲 PENDENTE |
| 38 | [Taskhub — Meu Centro](#mod-38) | Pessoal | ⚠️ PROBLEMA CONFIRMADO |
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
**Status:** ⚠️ PROBLEMA CONFIRMADO (atualizado sessão 6)

### O que o código diz
- Sidebar com largura 272px (normal) / 64px (recolhida)
- Toggle de recolher no botão `#sidebar-toggle`
- Backdrop em mobile
- Alguns itens têm badge de contador (ex: aprovações, alertas)

### Estrutura real confirmada — screenshot sessão 6

**Header:** Logo + "Centro Cultural Bom Jardim" + "TRAMAR — Sistema de Gestão Cultur…" + 🔔 + ❓ + avatar

| Grupo | Itens visíveis |
|---|---|
| **GESTÃO** | RH/Depto.Pessoal · Pessoas · Ponto & RH · Escuta · Contratações · Financeiro · Meu Centro · Tarefas · Reuniões *(itens acima do scroll não visíveis — Ações, Infraestrutura, Dashboard, outros)* |
| **OPERACIONAL** | Comunicação · Balcão · Relatórios `inativo` |
| **MEMÓRIA** | Agentes `inativo` · Acervo · Voluntários `inativo` · Parcerias |
| **SISTEMA** | Administração · Auditoria · Observabilidade |

### Comportamento confirmado ✅
- Agrupamento semântico existe (4 grupos: GESTÃO / OPERACIONAL / MEMÓRIA / SISTEMA) ✅
- Itens inativos marcados com badge `inativo` ✅

### Problemas confirmados ⚠️
- **SIDEBAR-01** *(REVISADO)*: Agrupamento existe ✅. Problema residual: grupo GESTÃO muito extenso (9+ itens visíveis) — candidato a subdivisão interna.
- **SIDEBAR-02**: "Comunicação" e "Balcão" são itens separados no grupo OPERACIONAL — devem ser um único item "Comunicação" com sub-abas internas (Agenda RECE + Balcão). Ver ACO-25.
- **SIDEBAR-03**: Itens `inativo` visíveis no menu (Relatórios, Agentes, Voluntários) — módulos inativos aparecem na sidebar e podem confundir o usuário; deveriam ser ocultados ou visivelmente desabilitados com tooltip "em breve".

### Perguntas abertas
- Quais itens estão acima de "RH / Depto. Pessoal" no scroll? (Ações, Infraestrutura, Dashboard...)

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

- ~~**PES-01**~~ ✅ CORRIGIDO (provável) — causa raiz era `lerJSON` indefinida; alias adicionado em `data_layer.gs`. Confirmar no sistema.
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
## Módulo 09 — Infraestrutura — Reservas
**Status:** 🔍 EM ANÁLISE

### Navegação real
- Item de menu: **"Infraestrutura"** (view: `view-espacos`)
- Aba dentro da view: **"Reservas"** (primeira aba visível)
- Outras abas da mesma view: Chaves | Empréstimos | Patrimônio | Configurações

### O que o código diz
- 3 modos de visualização: Lista | Agenda (semanal) | Diagrama Gantt (7h–22h, 2880px)
- FSM: `pendente → confirmado → habilitado → em_uso → concluido / cancelado`
- Modo lote com 4 sub-modos: manual / semanal / intervalo / mensal (máx 60 datas)
- Buffer de 5 minutos entre reservas
- Pós-evento: realizado (boolean), público presente, comprovações (url+tipo+descrição), observações, tempo de atividade calculado
- Workflow de solicitação: papéis sem permissão direta criam solicitação → responsável/admin aprova → reserva fica como "confirmado"
- Campos do formulário: sala, data, hora início/fim, nome da ação, tipo, setor, observações, montagem (min), encerramento (min), itens solicitados, co-responsável, release
- Integração: campo `acaoId` existe no repositório — reserva pode ser vinculada a Ação Cultural

### Comportamento confirmado ✅
- Módulo carrega sem erro da aplicação — view funcional
- **Dois níveis de métricas**: (1) topo da view com indicadores gerais do módulo (Reservas ativas, Chaves em aberto, Chaves atrasadas, Ativos disponíveis); (2) dentro da aba Reservas com métricas específicas (Pendentes, Confirmadas…) — ambas com MetricsToggle
- **4 modos de visualização** (não 3): Lista | Agenda | Diagrama | Mapa — o código chama de "Gantt" internamente mas a UI exibe "Diagrama"; existe um modo "Mapa" ausente na análise de código inicial
- Filtros da aba Reservas (modo Lista): status ("Todos"), data (default = hoje), ordenação (Data/Hora), botão refresh
- Estado vazio funciona: "Nenhuma reserva encontrada com este filtro"
- Console: 102 mensagens são do Warden (extensão do browser) — não são erros da aplicação. Há **▲ 5 avisos** separados — origem não confirmada
- **Agenda** ✅: grade semanal 7 colunas (Seg–Dom), navegação < >, filtro de espaço, scroll vertical por horário
- **Diagrama** ✅ (com ESP-01): mostra 9 espaços em linhas com barras coloridas por status. Legenda: CCBJ Fechado | Confirmada (✓HAB) | Em uso | Pendente (HAB?). Filtros: busca, espaço, data.
- **Mapa** ✅: planta física interativa do CCBJ com espaços numerados; filtros de data, zona e status; legenda: Disponível / Ocupado / Em uso / Aguardando / Manutenção
- 9 espaços confirmados cadastrados: Sala de Cultura Digital, Cineclube, Multigaleria, Ação Cultural, Biblioteca, Sala de Dança, Estúdio, Biciclétário, Estacionamento

### Observação estrutural
> O filtro de data default é **hoje** — isso explica "nenhuma reserva" mesmo com métricas mostrando "3 reservas ativas" e "2 pendentes". As reservas existem mas estão em outras datas. Isso é potencialmente confuso para o usuário que abre o módulo e pensa que não há nada cadastrado.

> **Inconsistência visual entre módulos confirmada:** Infraestrutura usa abas em linha única horizontal (5 abas, limpas). RH / Depto. Pessoal usa 11 abas que **quebram em 3 linhas**, ocupando grande área da tela antes do conteúdo. O padrão de tab layout não é uniforme entre módulos — ver problema ESTR-02 abaixo.

### Comportamento confirmado ✅ — continuação
- **Lista** ✅: filtros status + data (default=hoje) + ordenação + refresh; botão "+ Nova Reserva"; estado vazio funcional. Sem filtro de espaço nem busca por nome (ver ESP-03)
- **Formulário Nova Reserva** ✅: campos Sala/Espaço (select), Data, Hora Início/Fim, Nome Ação/Evento (texto), Tipo Ação (texto livre), Setor (select), Observações, Montagem (min), Encerramento (min), Tempo de Atividade (calculado automaticamente)
- Botão "Checar disponibilidade" separado do Salvar ✅ — boa UX
- Botão "Lote" presente mas mal posicionado (ver ESP-04)
- **Sem vínculo com Ação Cultural** no formulário (ver ESP-05)
- **Sem suporte a espaço externo** (ver ESP-06)
- "Tipo de Ação" como texto livre em vez de select (ver ESP-07)
- Capacidade do espaço exibida dinamicamente ao selecionar sala ("Capacidade: 40 pessoas") ✅
- Tempo de Atividade calculado em tempo real conforme hora início/fim preenchidas ✅
- Seção "ITENS SOLICITADOS (ALMOXARIFADO)" presente no formulário ✅ — catálogo vazio (ver ESP-09a)
- Itens fixos do espaço ausentes do formulário (ver ESP-09b)
- Validação de horário passado implementada no backend — toast "Atenção: Não é possível reservar para data e horário já passados" ✅ (melhoria de UX: bloquear no datepicker — ver ESP-17)

### Regras de negócio capturadas
> **Setor:** deve ser auto-preenchido com o setor do usuário solicitante ao abrir o formulário, com possibilidade de edição manual para exceções.
> **Tipo de Ação:** comportamento duplo — se reserva vinculada a uma Ação Cultural, tipo vem automaticamente da Ação; se reserva solta, exibir dropdown com lista fixa de tipos configuráveis (não texto livre).
> **Itens do formulário (regressão v1→v2):** formulário deve permitir adicionar: (a) **itens do almoxarifado** — portáteis, disponíveis por empréstimo; (b) **itens fixos do espaço** — instalados permanentemente na sala. Ambos existiam no v1 (refactor-fase2) e controlavam disponibilidade e alocação de recursos.
> **Espaço externo:** reserva deve poder ser feita para local fora do equipamento — via seleção no mapa interativo ou por endereço completo + observações.

### Comportamento confirmado ✅ — continuação
- Select de Sala/Espaço populado com **17 espaços**, cada um com capacidade indicada (cap. N) ✅
- 4 sub-modos de Lote confirmados: Manual | Semanal | Intervalo | Mensal ✅
- Política de conflito no Lote: "se uma data tiver conflito, a operação inteira é cancelada" (atômica) — registrado como regra de negócio
- Tipo no modal Lote é select (com opções); Tipo no formulário principal é texto livre — inconsistência (ESP-14)
- Diagrama mostra 9 dos 17 espaços — os externos/abertos não aparecem (ESP-11)
- "Espaço de Feiras" com capacidade indefinida (ESP-12)

### Regra de negócio capturada — Lote
> Fluxo correto: preencher formulário principal (nome, tipo, setor, observações, itens) → clicar "Lote" → modal pergunta apenas Espaço + Hora Início/Fim + padrão/datas. As informações do evento já estão no formulário pai e não devem ser repetidas.
>
> **Política de conflito (CORRIGIDA):** o comportamento atual cancela toda a operação ao encontrar um conflito — isso é errado. O comportamento esperado é:
> 1. Verificar todas as datas antes de salvar
> 2. Exibir quais datas têm conflito (lista clara)
> 3. Perguntar ao usuário: "Deseja criar reservas apenas para as datas válidas?"
> 4. Se confirmar → criar apenas as datas sem conflito; ignorar as com conflito
> 5. Se cancelar → não criar nenhuma
> O cancelamento total é um bloqueio operacional grave — numa escala de 20+ datas semanais, um único conflito anula toda a operação.

### Regra de negócio capturada — Espaços disponíveis
> Somente espaços com flag "disponível para reserva" ativa devem aparecer no select. Espaços em manutenção, desativados ou não habilitados para reserva pública devem ser filtrados.

### Regra de negócio capturada — Horários de funcionamento
> Modelo atual: existe apenas um **horário geral de funcionamento do equipamento** (ex: 07:00–23:00) que se aplica a todos os espaços.
>
> Modelo desejado:
> 1. Cada espaço terá seu próprio horário de abertura/fechamento, **pré-preenchido com o horário geral** ao ser criado
> 2. O horário por espaço pode ser **editado individualmente** sem afetar os demais
> 3. Ao **editar o horário geral**, o sistema pergunta:
>    - "Deseja replicar para **todos** os espaços?" → sobrescreve todos
>    - "Deseja escolher para **quais** espaços aplicar?" → lista de espaços para seleção; os não selecionados mantêm seus horários manuais anteriores
> 4. Formulário, Agenda e Diagrama devem respeitar o horário **por espaço**, não o geral

### Regras de negócio capturadas — Validações obrigatórias do formulário
> **Horário:** não permitir reserva fora do horário de funcionamento registrado no sistema para aquele espaço. O backend já tem `assertHorarioFuncionamento()` com padrão 07:00–23:00, mas a validação precisa ser imposta também na UI (feedback imediato ao usuário antes de tentar salvar).
> **Passado:** não permitir reserva em data ou horário já decorrido — sistema deve bloquear datas passadas no datepicker e horários passados quando a data selecionada for hoje.
> Ambas as regras se aplicam tanto ao formulário individual quanto ao modal de Lote — datas passadas no Lote devem ser marcadas como inválidas antes mesmo de checar conflito.

### Comportamento confirmado ✅ — Config Infraestrutura
- **Config → Espaços**: lista todos os espaços com flags Reservável/Não reservável, capacidade, tipo, chaves, número interno — CRUD completo ✅
- Flag "Não reservável" existe por espaço (Administrativo, Banheiros, Biciclétário...) mas não filtra o select de Nova Reserva (ESP-10)
- Tipo "espaco_ext" existe como tag — conceito de espaço externo existe no modelo de dados
- **Config → Itens**: lista categorias de itens (não itens individuais) — Audiovisual, Informática, Mobiliário, Material Gráfico, Insumo, Outro, todos Ativos (ESP-18)
- **Infraestrutura → Config → Horários**: única fonte de verdade do horário global ✅ — ESP-16/ESP-16b CORRIGIDOS s17 @446: validação dinâmica via `ConfigService.getReservaHorario()`; Admin → Config.Sistema removida
- **Config → Mapa**: editor interativo de planta com 36 espaços posicionados; funções Editar Terreno, Importar do mapa base, Restaurar padrão ✅
- Admin → Config Sistema → Expediente & Horários: mesma configuração 08:00–21:30 duplicada (ESP-16b)

### Perguntas abertas — Bloco C (fluxo de reserva existente)
> **Pergunta 6:** *(respondida — ver comportamentos confirmados abaixo)*

### Comportamento confirmado ✅ — Lista com reservas reais
- FSM funciona na UI: Pendente → Confirmar/Cancelar/Editar; Em uso → Concluir/Editar; Cancelada → só Editar ✅
- Card exibe: nome do evento, espaço, data, horário, turno (Manhã/Tarde), tipo, email do solicitante, observações
- Exemplo real de ESP-22: reserva "jlkjçl" de 21/05/2026 ainda em status "Em uso" 10 dias depois — sem auto-conclusão, ficou presa no estado
- **FSM refletido em todos os 4 modos** ✅: Agenda (barra roxa = Em uso, laranja = Pendente), Diagrama (barra roxa na linha do espaço), Mapa (espaço colorido por status em tempo real) — consistência cross-view excelente

### Comportamento confirmado ✅ — Bloco D (fluxo completo de estados)

**Pendente → Confirmar:**
- Transição imediata — toast "Reserva confirmada." + badge verde "Confirmada" sem reload
- Após confirmação: três botões — **"Habilitar"** | **▶ Iniciar** | **Cancelar** (+ lápis)

**Confirmada → Habilitar:**
- Transição direta, sem prompt ou checklist — botão muda para "Habilitando..." durante loading
- Toast: "Reserva habilitada para entrada."
- Badge muda para **"Habilitado"** (escuro); botões: ▶ Iniciar | Cancelar | lápis
- "Habilitar" desaparece após a transição

**Confirmada → Iniciar (atalho direto):**
- Atalho confirmado como botão presente na UI (pula o passo Habilitar)

**Habilitado → Iniciar:**
- Transição direta, sem prompt — botão muda para "Iniciando..."
- Toast: "Uso iniciado."
- Badge muda para **"Em uso"** (laranja); botão único: ✓ Concluir | lápis
- Métrica do topo atualiza em tempo real (ex: 1 → 2 "Em uso agora") ✅

**Em uso → Concluir:**
- Transição direta — botão muda para "Concluindo..."
- Toast: "Uso concluído."
- Badge muda para **"Concluída"** (roxo); apenas lápis de edição restante
- Métrica atualiza (ex: 2 → 1 "Em uso agora") ✅
- **Nenhum formulário de pós-evento exibido** (ver ESP-28)

**Padrão transversal:** todas as transições têm latência perceptível (round-trip ao backend GAS); botão muda para "...ando" como feedback intermediário ✅, mas espera é suficiente para criar dúvida operacional (ver ESP-27)

### Regra de negócio capturada — Pós-evento
> Dados de pós-evento (realizado, público presente, comprovações, observações, tempo de atividade) devem:
> 1. Ser **solicitados ao clicar "Concluir"** (formulário imediato, opcional — não bloquear a conclusão)
> 2. Poder ser **adicionados ou editados a qualquer momento** após a conclusão da reserva
> 3. Registrar **histórico completo de edições**: quem alterou, quando, o que mudou
>
> O modelo de dados já suporta os campos — a lacuna é de UI e de auditoria de edições.

### Regra de negócio capturada — Empréstimos
> Dois fluxos distintos:
>
> **1. Empréstimo interno (vinculado à reserva):**
> - Ao criar uma reserva, o solicitante registra os itens necessários (almoxarifado + itens fixos do espaço)
> - Essa demanda gera automaticamente um empréstimo vinculado à reserva
> - O ciclo do empréstimo acompanha o ciclo da reserva
>
> **2. Empréstimo externo (parceiros e terceiros):**
> - Fluxo independente de reserva
> - Requer cadastro prévio do solicitante: nome, CPF, organização, contato (visibilidade restrita por papel — LGPD)
> - CPF é o identificador para rastrear histórico de empréstimos por solicitante
> - Sistema gera **termo de empréstimo** preenchido com dados do solicitante e dos itens, disponível para download para assinatura
> - Após assinatura, documento é submetido ao sistema como comprovante
> - Histórico por solicitante (CPF): todos os empréstimos anteriores, situação de devolução, pendências

### Regra de negócio capturada — Auto-confirmação
> Reservas criadas por papéis com permissão direta deveriam ser **auto-confirmadas** na criação, desde que o espaço esteja disponível e não tenha responsável configurado para o slot. Exceção: espaços COM responsável configurado (por turno/dia) exigem aprovação pelo responsável. O backend já tem `resolverResponsaveis()` e a UI de configuração de responsáveis por espaço (emails + setor prioritário + dias + turnos) está implementada em Config → Espaços ✅ — falta usar esse dado para definir o status inicial da reserva.

### Perguntas abertas — Bloco E (aprovação e abas restantes)
> **Pergunta 16:** Navegue ao módulo **"Aprovações"** — existe lá alguma solicitação de reserva pendente? Descreva o que aparece.
> **Pergunta 17:** Volte a Infraestrutura e clique na aba **"Chaves"** — o que aparece?

---

<a name="mod-13"></a>
## Módulo 13 — Ações Culturais — Lista/Kanban
**Status:** ⚠️ PROBLEMA CONFIRMADO

### O que o código diz
- Kanban 4 colunas (planejada / em_produção / em_execução / concluída)
- Toggle Lista / Kanban
- Métricas por status e tipo
- RBAC: leitura=todos; escrita=coordenador+; excluir=admin

### Estrutura visual confirmada — Kanban
- `[view-header]` `h2.view-titulo` "🎭 Ações Institucionais" + `p.view-subtitulo` "Gerencie cursos, oficinas, espetáculos e eventos…"
- Botão "+ Nova Ação" (`btn btn-primary`) + botão toggle Lista/Kanban (`btn btn-secondary`) — ambos no header
- `stats-strip` com MetricsToggle inicializado via JS: 6 cards — Total | Planejadas | Em Produção | Em Execução | Concluídas | Canceladas
- `filter-bar`: `input-busca` (nome/responsável) + `select-sm` status + `select-sm` tipo — **sem botão refresh**
- Kanban: 4 colunas com cores hardcoded por status (não via tokens de DS)
- Card: nome, tipo, badge, datas início/fim
- FAB Pulse ativo (canto inferior direito)

### Estrutura visual confirmada — Detalhe da Ação
- Header: nome + badge status + badge tipo + botão "Editar" + ✕
- **8 abas** (scrollável): **Visão Geral | Tarefas | Reservas | Contratos | Equipe | Financeiro | Contratações | Mapa do Evento**
- **Visão Geral:** Responsável, Setor, Data Início, Data Fim, Público Previsto, Portal Público (🔒 Interno / Público), Descrição Interna, Descrição Pública + seção "TRANSIÇÕES DE STATUS"
- **Tarefas:** lista de tarefas vinculadas — estado vazio "Nenhuma tarefa vinculada." ✅
- **Reservas:** lista de reservas vinculadas — estado vazio "Nenhuma reserva vinculada." ✅
- **Contratos:** lista de contratos vinculados — estado vazio "Nenhum contrato vinculado." ✅
- **Equipe:** membros da equipe — estado vazio "Sem membros de equipe registrados." ✅
- **Financeiro:** 3 cards — Previsto (R$) | Executado (R$) | Saldo (R$) + barra "Execução orçamentária 0%" ✅
- **Contratações:** label "Solicitações vinculadas a esta ação" + botão "+ Nova Contratação" + "Carregando..." (possível bug de loading)
- **Mapa do Evento:** "Locais do Evento" + botão "+ Novo Local" + lista de mapas vinculados com: nome, badge tipo (Espaços CCBJ / Seleção), descrição, N camadas × N elementos, botões Abrir | excluir ✅

### Formulário "Nova Ação" — campos mapeados (código)
| Campo | Tipo | Observação |
|---|---|---|
| Nome da Ação * | text | — |
| Tipo * | select | 10 opções predefinidas: Curso, Oficina, Espetáculo, Evento, Campanha, Laboratório, Projeto Formativo, Difusão, Atividade Territorial, Outro |
| Responsável * | text | email digitado manualmente — **não integrado com base de usuários** |
| Setor | select | populado da base de setores ✅ |
| Data Início / Data Fim | date | — |
| Público Previsto | number | — |
| Visível no portal público | checkbox | — |
| Descrição Interna | textarea | — |
| Descrição Pública | textarea | — |

> **Resposta à pergunta pendente:** não há campo de vínculo com contrato ou fonte de recurso na criação. A associação a contratos é feita depois, via aba "Contratos" no painel da ação.

### Análise de Unidade Visual — Ações vs sistema

> **Metodologia adotada:** a cada módulo ou aba auditada, verificar conformidade com os padrões de DS detectados no sistema. Registrar desvios como problemas específicos.

#### Padrões detectados no sistema (classes de referência)

| Componente | Padrão majoritário (antigo) | Padrão atual (novo) | Padrão misto (Ações e similares) |
|---|---|---|---|
| Contêiner do cabeçalho | `page-header` | `view-header` | `view-header` ✅ |
| Tag + classe do título | `div.page-title` | `h1.view-title` | `h2.view-titulo` ⚠️ |
| Classe do subtítulo | `div.page-subtitle` | `p.view-subtitle` (14px) | `p.view-subtitulo` (13px) ⚠️ |
| Botão primário de ação | `btn btn-primario` | `btn btn-primary` | `btn btn-primary` ✅ |
| Campo de formulário | `form-input` | `form-input` | `class="input"` ⚠️ |
| Barra de filtros | `filter-bar` | `toolbar` | `filter-bar` ✅ |
| Variáveis de cor nos cards | `var(--color-warning)` | `var(--warning)` | `var(--color-warning)` ⚠️ |
| Classe da aba ativa | `.ativa` ou `.active` | `.tab-ativa` | `.ativa` ✅ |

> `view-titulo` (13px, ícone colorido) e `view-title` (22px, sem ícone) são CSS distintos — h2 vs h1 têm impacto semântico e de acessibilidade.

### Seção TRANSIÇÕES DE STATUS — Visão Geral do painel (confirmado via screenshot)

| Status da Ação | Botões disponíveis | Cores |
|---|---|---|
| **Em Execução** | "Concluir" + "Cancelar" | Verde (Concluir) + Vermelho/pink (Cancelar) |

**Observações:**
- FSM em "Em Execução" expõe apenas 2 opções: avançar (Concluir) ou abortar (Cancelar) — sem opção de retroceder para "Em Produção" → já registrado como ACO-06
- Cores dos botões de transição divergem do padrão DS: "Concluir" usa verde e "Cancelar" usa vermelho/pink — enquanto o padrão do sistema é roxo (`btn-primary`) e cinza (`btn-secondary`). Os botões da seção TRANSIÇÕES DE STATUS parecem usar estilos próprios, não as classes de DS
- Campos "Responsável" = "nm" e "Setor" = "—" confirmam novamente ACO-02 e ACO-03

### Comportamento confirmado ✅
- Kanban carrega com métricas corretas (1 ação em execução)
- Detalhe da ação abre na aba Visão Geral
- Campo "Portal Público" existe com opção Interno/Público
- MetricsToggle inicializado via JS para `#acao-metricas-strip` ✅
- BtnGuard.wrap usado nos CTAs principais ✅
- data-bg-skip="1" no botão de toggle Lista/Kanban ✅

### Problemas confirmados ⚠️

- **ACO-01**: Kanban sem drag and drop — movimentação de cards entre colunas não funciona; transição de status só é possível pelo detalhe da ação
- ~~**ACO-02**~~ ✅ CORRIGIDO s16 Fase 19 — card e lista agora só exibem `responsavel.split('@')[0]` quando o valor contém `@`; valores sem `@` (como "nm") não são renderizados. Deploy @387.
- ~~**ACO-03**~~ ✅ CORRIGIDO s16 Fase 20 — `boot_service.gs` passa `usuarioSetor` no bootstrap; form Nova Ação pré-seleciona o setor do usuário logado via `_boot.usuarioSetor`. Deploy @387.
- **ACO-04**: Sem histórico de atividades no detalhe — sem linha do tempo de edições, transições de status, tarefas concluídas, reservas feitas, contratos vinculados. Sem rastreabilidade do ciclo de vida da ação
- ~~**ACO-05**~~ ✅ CORRIGIDO — `BtnGuard.liberar('painel-acao-editar-btn')` adicionado em `fecharForm()`
- **ACO-06**: Sem possibilidade de retroceder na FSM — ação em "Em Execução" só pode Concluir ou Cancelar; sem botão para voltar a "Em Produção" em caso de erro ou imprevisto
- **ACO-07** *(REVISADO — sessão 6)*: Aba "Contratações" **carrega corretamente** — estado vazio funcional ("Nenhuma contratação vinculada a esta ação.") ✅. O loading infinito anterior não se confirmou.
- **ACO-08** *(REVISADO — sessão 6)*: Botão "+ Nova Contratação" **não funciona** — nenhuma resposta ao clicar. O problema é anterior ao de abrir em nova aba: o botão está completamente inoperante.
- ~~**ACO-09**~~ ✅ CORRIGIDO s17 F44 — `_initTabBarNav` chamada em `_mostrarPainel()` ao abrir o painel de Ações; botões prev/next com fade gradient aparecem quando abas transbordam.
- **ACO-10**: Dois editores de mapa separados (`mapa_acao_editor.html` e `mapa_editor.html`) com núcleo de edição de formas duplicado e evolução assíncrona. A diferença de conteúdo é intencional: editor de Ações tem objetos de evento (Som, Luz, AV, avatares) que Infraestrutura não precisa. Porém as capacidades de core — polígono livre como tipo direto no catálogo, merge ergonômico, gestão de vértices por midpoint — devem ser idênticas em ambos. Solução: extrair o núcleo de edição de formas para componente compartilhado; cada editor configura o catálogo de objetos do seu contexto

**Problemas de unidade visual (detectados via análise de código):**

- **ACO-11**: Cabeçalho usa `h2.view-titulo` + `p.view-subtitulo` — enquanto o padrão atual das views com botão de ação é `h1.view-title` + `p.view-subtitle`. Impactos: (a) subtítulo renderiza com 1px menor (13px vs 14px); (b) `h2` é semântico incorreto para título principal de página; (c) fragmenta o catálogo de classes de cabeçalho (3 padrões coexistindo)
- **ACO-12**: Formulário "Nova Ação" usa `class="input"` em todos os campos — enquanto o restante do sistema usa `form-input` (views antigas) ou `form-control` (views novas). `.input` é uma terceira variante CSS definida mas inconsistente com o DS
- **ACO-13**: Sem campo de vínculo com contrato ou fonte de recurso na criação — associação a contratos só é possível depois, via aba interna do painel, sem feedback no fluxo de criação (o usuário não é orientado a vincular)
- **ACO-14**: Campo "Responsável" é texto livre (email digitado) — mesmo anti-padrão de TAR-02, CHV-05, PES-02. Deveria ser select/autocomplete da lista de usuários do sistema para garantir consistência e evitar erros de digitação
- **ACO-15**: Barra de filtros sem botão refresh — todas as demais views com `filter-bar` ou `toolbar` têm botão de atualização explícito (refresh); Ações não tem, forçando o usuário a navegar para atualizar os dados
- ~~**ACO-16**~~ ✅ CORRIGIDO — `stopPropagation()` no ✕ do painel + `if(event.target===this)` no overlay

### Comportamento confirmado ✅ — via screenshot (sessão 5)
- Modal "Editar Ação" renderiza corretamente quando acionado (pelo caminho acidental via ✕ — bug ACO-16): todos os 9 campos visíveis e populados com os dados da ação ✅
- Fundo do modal opaco (branco), overlay escuro ✅ — sem problema de transparência
- Botões "Cancelar" (cinza) e "Salvar" (roxo/primário) — corretos ✅
- Campo "Responsável" exibe **"nm"** — confirmação visual de ACO-02 (valor nulo não resolvido corretamente — provavelmente nome/email do usuário criador corrompido)
- Campo "Setor" vazio ("Selecionar setor...") — confirmação visual de ACO-03
- **ACO-05 REVISÃO**: o modal de edição em si funciona e carrega os dados corretamente. O bug pode ser específico ao caminho "botão Editar → BtnGuard.wrap → spinner" — ou seja, o problema está no gatilho, não no modal. Ao ser acionado pelo ✕ (sem BtnGuard), o modal abre normalmente

### Análise de Unidade Visual — Modal "Nova Ação" (confirmado via screenshot)

> **Diretriz metodológica adotada:** a cada modal identificado na auditoria, inspecionar cada botão, campo, label, estrutura de layout e organização de elementos individualmente.

#### Estrutura do modal

| Componente | Classe usada | Padrão esperado | Status |
|---|---|---|---|
| Overlay | `modal-overlay` | `modal-overlay` | ✅ |
| Caixa | `modal-box` max-width 620px | `modal-box` | ✅ |
| Cabeçalho | `modal-header` | `modal-header` | ✅ |
| Título | `h3` sem classe | sem convenção formal | ✅ aceitável |
| Botão ✕ | `modal-close` | `modal-close` | ✅ |
| Corpo | `modal-body` | `modal-body` | ✅ |
| Grid de campos | `form-grid` | `form-grid` | ✅ |
| Rodapé | `modal-footer` | `modal-footer` | ✅ |
| Fundo | branco opaco + backdrop escuro | padrão obrigatório | ✅ |

#### Campos individuais — análise elemento por elemento

| Campo | Tipo | Classe | Label classe | Placeholder | Integração | Status |
|---|---|---|---|---|---|---|
| Nome da Ação * | `<input type="text">` | `input` ⚠️ | sem `form-label` ⚠️ | "Ex: Oficina de Teatro para Jovens" ✅ | — | ⚠️ ACO-12, ACO-17 |
| Tipo * | `<select>` | `input` ⚠️ | sem `form-label` ⚠️ | default "Evento" (3ª opção na lista) ⚠️ | hardcoded ✅ | ⚠️ |
| Responsável * | `<input type="text">` | `input` ⚠️ | sem `form-label` ⚠️ | "email@org.br" | **texto livre** ❌ | ⚠️ ACO-14 |
| Setor | `<select>` | `input` ⚠️ | sem `form-label` ⚠️ | "Selecionar setor…" | **não preenche** ❌ | ⚠️ ACO-03, ACO-14b |
| Data Início | `<input type="date">` | `input` ⚠️ | sem `form-label` ⚠️ | "dd/mm/aaaa" ✅ | — | ⚠️ |
| Data Fim | `<input type="date">` | `input` ⚠️ | sem `form-label` ⚠️ | "dd/mm/aaaa" ✅ | — | ⚠️ |
| Público Previsto | `<input type="number">` | `input` ⚠️ | sem `form-label` ⚠️ | default 0 | — | ⚠️ |
| Visível no portal público | `<input type="checkbox">` | sem classe | `<label>` sem classe ⚠️ | — | — | ⚠️ |
| Descrição Interna | `<textarea>` | `input` ⚠️ | sem `form-label` ⚠️ | texto descritivo ✅ | — | ⚠️ |
| Descrição Pública | `<textarea>` | `input` ⚠️ | sem `form-label` ⚠️ | texto descritivo ✅ | — | ⚠️ |

#### Botões de rodapé

| Botão | Classe | Ícone | BtnGuard | Status |
|---|---|---|---|---|
| Cancelar | `btn btn-secondary` | sem ícone | `data-bg-skip="1"` ✅ | ✅ |
| Salvar | `btn btn-primary` id=`acao-salvar-btn` | `ms-sm save` ✅ | `BtnGuard.wrap` ✅ | ✅ |

#### Layout de campos — análise de organização

| Linha | Colunas | Campo(s) | Observação |
|---|---|---|---|
| 1 | full width | Nome da Ação * | ✅ correto — campo mais importante em destaque |
| 2 | 2 colunas | Tipo * \| Responsável * | ⚠️ Tipo (select) ao lado de Responsável (texto) — mais coerente seria Tipo \| Setor (ambos selects) |
| 3 | 2 colunas | Setor \| Data Início | ⚠️ heterogêneo — setor (select) ao lado de data |
| 4 | 2 colunas | Data Fim \| Público Previsto | ✅ razoável |
| 5 | inline | checkbox + label | ⚠️ checkbox isolado numa linha ocupa área desproporcional ao seu peso |
| 6 | full width | Descrição Interna | ✅ |
| 7 | full width | Descrição Pública | ✅ |

> **Reorganização sugerida:** Linha 2 → Tipo | Setor (ambos selects); Linha 3 → Responsável (full width, com picker); Linha 4 → Data Início | Data Fim; Linha 5 → Público Previsto | Visível no portal público (checkbox).

### Mapeamento de conexões com outros módulos (análise de código)

> Levantamento completo das conexões existentes e ausentes entre Ações e demais módulos do sistema.

#### Conexões EXISTENTES (código confirmado)

| Módulo | Direção | Tipo de vínculo | Campo no código | Qualidade |
|---|---|---|---|---|
| **Contratações** | bidirecional | `acaoId` como select populate de ações | `sol-acao-id` (select ✅) + `novaParaAcao()` + `carregarParaAcao()` | ✅ Boa |
| **Reservas** | bidirecional | `acaoId`/`acaoNome` no modelo da reserva | Card de reserva exibe link para `AcoesUI.abrirPainel()` ✅; aba Reservas do painel carrega por `acaoId` ✅ | ⚠️ Parcial — form de reserva não permite vincular (ESP-05) |
| **Tarefas** | unidirecional | Painel carrega tarefas por `acaoId` | `painel-tarefas-lista` carregado na aba ✅ | ⚠️ Parcial — form de Tarefas não tem campo `acaoId` (TAR-03) |
| **Reuniões** | unidirecional | `acaoId` como campo de texto no form da reunião | `run-acao-id` (texto livre, placeholder "ACAO-001") | ❌ Frágil — texto livre sem lookup |
| **Balcão de Comunicação** | unidirecional | `acaoId` como campo de texto no form da demanda | `bl-acao-id` (texto livre, placeholder "ACAO-001") | ❌ Frágil — texto livre sem lookup |

#### Conexões AUSENTES (gaps identificados)

| Módulo | Gap | Impacto |
|---|---|---|
| **RECE** | Modelo confirmado: Ação ≠ Evento RECE. São entidades separadas. Publicar no RECE é ato editorial deliberado — só vai o que se quer divulgar publicamente na rede regional. Falta: (a) mecanismo de publicação a partir do painel da Ação; (b) vínculo rastreável entre Ação e o evento RECE gerado; (c) definir o que acontece quando a Ação muda após a publicação | Ação executada para a rede não é rastreável; alterações na ação não sincronizam com o RECE |
| **Relatórios / Dashboard** | Dashboards usam dados agregados — não foi identificada integração direta de métricas de Ações no dashboard executivo | Dados de execução de ações não aparecem em visão estratégica |
| **Alertas** | Nenhum alerta automático gerado por ciclo de vida da ação (prazo se aproximando, ação em execução sem reserva, etc.) | Gestão reativa, não proativa |
| **Ponto / Escalas** | Equipe da ação não é cruzada com ponto e escala dos colaboradores | Não é possível saber se alguém escalado para a ação tem conflito de horário |

### Análise arquitetural — o que deve estar no formulário de criação vs. post-criação

> **Princípio de UX:** o formulário de criação captura a identidade mínima da ação. Conexões operacionais acontecem no painel após a criação.

#### O que deve FICAR no formulário de criação (e como melhorar)

| Campo | Status atual | Melhoria necessária |
|---|---|---|
| Nome, Tipo, Datas, Público, Visibilidade, Descrições | ✅ correto no form | Corrigir classes CSS (ACO-12, ACO-17) e organização de layout |
| Responsável | ❌ texto livre | Converter para select/autocomplete de usuários do sistema |
| Setor | ⚠️ select sem dado | Auto-preencher com setor do usuário logado; editável manualmente |
| **Contrato / Fonte de recurso** | ❌ ausente | **Adicionar como campo opcional** — usuário frequentemente sabe na criação a qual contrato a ação se vincula (ACO-13). Select de contratos ativos com opção de pular |

#### O que deve permanecer POST-CRIAÇÃO (painel, via abas)

| Conexão | Já existe no painel | Qualidade |
|---|---|---|
| Reservas | ✅ aba Reservas | ⚠️ form de reserva não vincula de volta |
| Tarefas | ✅ aba Tarefas | ⚠️ form de tarefa sem campo acaoId |
| Equipe | ✅ aba Equipe | ✅ |
| Financeiro | ✅ aba Financeiro | ✅ |
| Contratações | ✅ aba Contratações | ❌ ACO-07 (loading infinito) |
| Mapa do Evento | ✅ aba Mapa | ✅ |

#### O que deve ser corrigido em OUTROS módulos (não no form de Ações)

| Módulo | Problema | Solução |
|---|---|---|
| Reuniões | `run-acao-id` é texto livre | Converter para select de ações ativas |
| Balcão | `bl-acao-id` é texto livre | Converter para select de ações ativas |
| Tarefas | sem campo `acaoId` | Adicionar campo "Vinculada a Ação" no formulário de tarefa |
| Reservas | form sem campo `acaoId` | Adicionar campo "Vincular a Ação" (ESP-05) |
| RECE | sem vínculo algum | Definir modelo de integração (pergunta pendente para o usuário) |

---

<a name="mod-22"></a>
## Módulo 22 — Comunicação — RECE
**Status:** 🔍 EM ANÁLISE (decisão arquitetural registrada — testes no sistema pendentes)

### Contexto
A Agenda RECE é a interface do CCBJ com a **Rede de Espaços Culturais e Educativos** (Secult/CE). Apenas ações que se deseja **divulgar publicamente na rede regional** vão para o RECE. A publicação é um **ato editorial deliberado**, não automático.

### Modelo arquitetural confirmado (sessão 5)

> **Ação Cultural ≠ Evento RECE** — são entidades separadas. Toda ação pode existir sem ir ao RECE. O RECE recebe apenas o que a organização escolhe divulgar.

#### Fluxo de publicação no RECE (novo — v2)

```
Painel da Ação
  └── botão "Publicar no RECE"
        └── Cria rascunho de Evento RECE pré-preenchido com dados da Ação
              └── Autor completa campos específicos RECE
                    └── IA revisa e otimiza descrição pública
                          └── Enviado para Comunicação revisar
                                └── Comunicação audita: materiais ok? → Aprova ou Rejeita
                                      └── Aprovado → Publicado no RECE
```

#### FSM do Evento RECE
`rascunho → aguardando_comunicacao → aprovado_comunicacao → publicado` / `rejeitado`

- **rascunho**: criado pelo botão no painel da Ação; autor preenche campos específicos
- **aguardando_comunicacao**: autor envia para revisão — notifica Comunicação
- **aprovado_comunicacao**: Comunicação valida materiais e conteúdo
- **publicado**: evento aparece na Agenda RECE
- **rejeitado**: Comunicação devolve com parecer; volta para rascunho com observações

#### Pré-condição para envio à Comunicação
Pelo menos **1 material de divulgação** deve estar anexado: imagem/card, vídeo, matéria de imprensa, ou outro material. Sem material, o botão "Enviar para Comunicação" fica desabilitado com tooltip explicativo.

### Campos do Evento RECE (v2) — levantamento via v1

#### Campos pré-preenchidos da Ação (ao clicar "Publicar no RECE")

| Campo RECE | Fonte na Ação | Editável? |
|---|---|---|
| Título | `nome` da Ação | ✅ sim — pode ajustar para divulgação |
| Tipo / Categoria | `tipo` da Ação (mapeado para categorias RECE) | ✅ sim |
| Data Início / Fim | datas da Ação | ✅ sim |
| Espaços / Horários | reservas vinculadas à Ação | ✅ sim |
| Descrição base | `descricao_publica` da Ação | ✅ sim — ponto de partida para IA |

#### Campos específicos RECE (completados pelo autor)

| Campo | Tipo | Origem v1 | Obrigatório |
|---|---|---|---|
| Categorias | multi-select / tags (Teatro, Música, Dança, Artes Visuais…) | `receCategorias` | ✅ |
| Artista / Grupo / Curador | texto | `receArtista` | ✅ |
| Público-alvo | texto / multi-select | `recePublicoAlvo` | ✅ |
| Classificação etária | select (Livre / 10+ / 12+ / 14+ / 16+ / 18+) | `receClassificacao` | ✅ |
| Tipo de acesso | select (Gratuito / Pago / Meia / Mediante inscrição) | `receAcesso` | ✅ |
| Link de inscrição | URL (ativo apenas se acesso = "Mediante inscrição") | `receiveLinkInscricao` | condicional |
| Acessibilidades | multi-select (Libras, Audiodescrição, Rampa…) | `receAcessibilidades` | ✅ |
| Parceiros / Apoiadores | texto | `receParceiros` | — |
| **Descrição para divulgação** | textarea — **target principal da IA** | `receDescricao` | ✅ |
| **Headline** | texto curto — frase de impacto | novo v2 | ✅ |
| **Call-to-Action** | texto curto ("Venha conferir!", "Inscreva-se!") | novo v2 | — |
| Observações internas | textarea (não publicado) | `receObservacoes` | — |
| É ação em rede (outro equipamento)? | boolean | campo v1 linha 713 | — |
| Equipamento parceiro | texto (ativo se flag acima = true) | v1 implícito | condicional |

#### Materiais de divulgação (pré-condição para envio à Comunicação)

| Material | Tipo | v1 | Regra |
|---|---|---|---|
| Imagem / Card | upload (imagem) | `receImagemFile` + `receImagemUrl` | pelo menos 1 obrigatório |
| Vídeo | URL | novo v2 | — |
| Matéria de imprensa | textarea ou upload | novo v2 | — |
| Outros materiais | upload genérico | novo v2 | — |

### Integração com IA — dois modos

> **Princípio:** IA auxilia, não substitui. O autor decide o que aceitar. A Comunicação pode acionar IA novamente na revisão.

| Modo | Trigger | Input | Output |
|---|---|---|---|
| **Revisão textual** | botão "Revisar com IA" ao lado da Descrição | texto atual da descrição | sugestão de texto corrigido (gramática, fluidez, clareza) |
| **Otimização para marketing de eventos** | botão "Otimizar com IA" | descrição + tipo + público-alvo + classificação | reescrita com: headline de impacto, linguagem de marketing de eventos, call-to-action, benefícios ao público, urgência/antecipação |

> **Contexto para a IA de marketing:** técnicas de marketing de eventos incluem — foco no benefício ao público, linguagem ativa, antecipação ("não perca"), identidade do evento (o que o torna único), CTA claro, adequação ao público-alvo.

### Integração com Balcão de Comunicação

> Em v1 (`integracao_reserva_comunicacao_js.html`), ao criar uma reserva RECE o sistema automaticamente sugeria demandas no Balcão: `['design', 'materia', 'divulgacao']`.
>
> Em v2: ao clicar "Publicar no RECE" e criar o rascunho, o sistema **oferece** ao autor a criação automática de demandas vinculadas no Balcão (design do card, matéria, divulgação). A vinculação é opcional mas sugerida.

### Campos de rastreabilidade

| Campo | Descrição |
|---|---|
| `acaoId` | Referência à Ação de origem |
| `acaoNome` | Nome da Ação (desnormalizado para leitura) |
| `publicadoPor` | email de quem clicou "Publicar no RECE" |
| `aprovadoPor` | email de quem na Comunicação aprovou |
| `dataPublicacao` | timestamp de publicação |
| `historicoIA` | log das revisões IA aplicadas (texto antes/depois) |
| `versoes` | snapshot de cada salvo (auditoria de edições) |

### Integração com a plataforma Agenda RECE (confirmado — sessão 6)

**URL do sistema externo:** `https://agendarece.cultura.ce.gov.br/` (login obrigatório)
**URL pública de consulta:** `https://agenda.cultura.ce.gov.br/`

**Como funciona hoje:**
- Publicação 100% **manual** — colaborador do CCBJ acessa o site da Agenda RECE e preenche um formulário por ação
- Não existe integração automática entre o ERP e o sistema externo
- A Agenda RECE possui **API integrada com a plataforma estadual Cultura.Ce** — mas a API de submissão em lote ainda **não está disponível**
- Possibilidade de exportação em lote está prevista como funcionalidade futura no site da Agenda RECE

**Implicação arquitetural para o módulo RECE no ERP:**
- **Curto prazo:** o módulo RECE do ERP deve preparar e centralizar todos os dados necessários para preencher o formulário externo manualmente — funcionando como um "formulário de preparação" que garante que nada será esquecido
- **Médio prazo:** quando a API da Agenda RECE for liberada, o ERP poderá integrar diretamente e eliminar o passo manual
- O status `publicado` no ERP significa: "dados aprovados e prontos para envio" — não necessariamente "já no ar no site externo" (até a API estar disponível)

**Gaps adicionais identificados:**

**RECE-10** `🟡 Média` — Sem exportação/preview dos dados no formato esperado pelo formulário da Agenda RECE — atualmente o responsável precisa copiar manualmente cada campo do ERP para o formulário externo, com risco de erro e omissão. O ERP deveria oferecer uma view de "resumo para publicação" com todos os campos já organizados e prontos para transcrição (ou futura integração via API)

**RECE-11** `🟡 Média` — Sem campo de confirmação de publicação externa — quando o responsável publica manualmente no site Agenda RECE, o ERP não sabe que a publicação ocorreu. Deveria existir um passo de "confirmar publicação no RECE" (com campo de data/hora e opcional link da publicação) para fechar o ciclo e atualizar o status definitivo do evento

**RECE-12** `🔵 Futuro` — Integração via API com Agenda RECE — quando a API de submissão em lote da Agenda RECE for disponibilizada, o ERP deverá consumir esse endpoint para automatizar a publicação sem intervenção humana

### Clarificação arquitetural — papel do módulo Comunicação (confirmado sessão 6)

> **O módulo Comunicação / Agenda RECE NÃO registra nem cria entradas RECE.** Ele apenas **puxa, apresenta e lista** todas as informações atribuídas à Agenda RECE — funciona como painel de gestão e visibilidade, não como ponto de entrada.
>
> A criação de um registro RECE ocorre **exclusivamente a partir do painel da Ação**, via botão "Publicar no RECE". O módulo Comunicação é o painel onde o setor de Comunicação gerencia, revisa e aprova o que foi submetido pelas equipes de ação.

### Análise de Unidade Visual — Comunicação / Agenda RECE (sessão 6, via screenshot)

#### Estrutura confirmada no sistema
- Top bar: ≡ "Comunicação" + 🔔 + ❓ + avatar "JO"
- Título: **"Agenda RECE"** (tamanho grande — aparenta `h1.view-title`)
- Subtítulo: "Rede de Equipamentos Culturais do Ceará — Secult/CE" (aparenta `p.view-subtitle`)
- Botão principal: **"+ Novo Registro RECE"** (`btn btn-primary`, roxo)
- **MÉTRICAS** (MetricsToggle ✅): 5 cards — Total | Rascunho | Submetida | Publicada | Encerrada — valores "—" (sem dados)
- Filter bar: campo busca "Buscar por título ou artista…" + select "Todos os status" + datepicker + botão refresh
- Lista: **"Nenhum Registro encontrado"** (estado vazio resolve ✅)

#### Comparação com tabela de padrões DS

| Componente | Padrão esperado (views novas) | O que RECE usa | Status |
|---|---|---|---|
| Container cabeçalho | `view-header` | aparente `view-header` | ✅ |
| Título | `h1.view-title` (22px, sem ícone colorido) | "Agenda RECE" — parece h1 | ✅ aparente |
| Subtítulo | `p.view-subtitle` (14px) | texto adequado | ✅ aparente |
| Botão primário | `btn btn-primary` | "+ Novo Registro RECE" roxo | ✅ classe certa |
| Barra de filtros | `toolbar` (padrão RECE/novas views) | filter row inline | ✅ aparente |
| MetricsToggle | obrigatório | presente | ✅ |
| Modo de visualização | Lista + **Agenda** (necessário) | só Lista | ❌ RECE-17 |
| Botão de criação | **não deve existir aqui** | "+ Novo Registro RECE" presente | ❌ RECE-16 |
| Datepicker filtro | formato padrão | "---------- de ----" (quebrado) | ❌ RECE-15 |

### O que o código atual tem (v2)
- View `#view-comunicacao` existe no HTML (linha 5690)
- `ReceUI` com campos: título, descrição, responsável, datas, acesso, link, imagem, observações (parcial)
- FSM: `rascunho → submetida → publicada → encerrada / cancelada`
- **Sem vínculo com Ações** — `acaoId` ausente
- **Sem campos**: categorias, artista, público-alvo, classificação etária, acessibilidades, parceiros, headline, CTA, materiais múltiplos
- **Sem IA integrada**
- **Sem fluxo de auditoria pelo Comunicação** — FSM atual pula o passo de revisão

### Decisão arquitetural confirmada — Comunicação como módulo agregador (sessão 6)

> **Princípio confirmado:** RECE e Balcão de Comunicação são dois serviços do mesmo módulo — **Comunicação**. Não existem como áreas independentes.
>
> **Estrutura do módulo Comunicação:**
> - **Aba Balcão** — solicitações de elementos de comunicação ao setor (design, materiais, divulgação, outros)
> - **Aba Agenda RECE** — fluxo de publicação de ações culturais na rede regional (Secult/CE)
>
> **No painel da Ação (Action panel):**
> - As 8 abas atuais ganham uma 9ª aba: **"Comunicação"**
> - Dentro da aba Comunicação do painel existem **duas sub-áreas**:
>   1. **Agenda RECE** — fluxo de publicação desta ação na Agenda RECE (rascunho → revisão → aprovação Comunicação → confirmação de publicação externa)
>   2. **Balcão** — demandas de comunicação abertas para esta ação (design do card, matéria, divulgação, etc.)
> - Ambas as sub-áreas são contextualizadas pela ação — mostram apenas o que pertence àquela ação específica
>
> **Impacto na sidebar:**
> - O item "RECE" (se existir separado) deve ser removido da navegação principal
> - O item "Comunicação" no menu agrupa Balcão + Agenda RECE

**ACO-25** `🔴 Alta` — Painel da Ação não tem aba "Comunicação" — as 8 abas atuais (Visão Geral | Tarefas | Reservas | Contratos | Equipe | Financeiro | Contratações | Mapa do Evento) não incluem a dimensão de comunicação da ação. Falta: 9ª aba "Comunicação" com sub-áreas RECE e Balcão contextualizadas para a ação

### Gaps identificados

**RECE-01** `🔴 Alta` — Sem botão "Publicar no RECE" no painel da Ação — a única entrada é manual no módulo RECE, sem aproveitamento dos dados da Ação

**RECE-02** `🔴 Alta` — Sem `acaoId` no modelo do evento RECE — vínculo bidirecional inexistente

**RECE-03** `🔴 Alta` — Campos específicos RECE ausentes: categorias, artista, público-alvo, classificação etária, acessibilidades, parceiros, headline, CTA

**RECE-04** `🔴 Alta` — Sem fluxo de auditoria pela Comunicação antes da publicação — FSM atual não tem passo `aguardando_comunicacao`

**RECE-05** `🔴 Alta` — Sem pré-condição de materiais de divulgação — qualquer rascunho pode ser publicado sem imagem, texto ou vídeo

**RECE-06** `🔴 Alta` — Sem integração com IA para revisão textual e otimização de marketing

**RECE-07** `🟡 Média` — Sem campo para materiais múltiplos (vídeo, matéria, outros) — apenas imagem única herdada do v1

**RECE-08** `🟡 Média` — Sem geração automática de demandas no Balcão de Comunicação ao criar rascunho RECE

**RECE-09** `🟡 Média` — Sem histórico de revisões IA — usuário não sabe quais versões foram geradas ou quais foram aceitas

---

<a name="mod-16"></a>
## Módulo 16 — Financeiro — Contratos
**Status:** ⚠️ PROBLEMA CONFIRMADO (testado visualmente em 2026-06-01)

### O que o código diz
- 4 abas previstas: Contratos | Fontes de Recurso | Remanejamentos | Aditivos
- ContratosDetailUI: hierarquia contrato → meta → atividade → rubricas → memória de cálculo
- Histórico de versões (snapshot a cada save)
- Memória de Cálculo por rubrica (com tipos: Unidade, Hora técnica, Parcela, etc.)
- FSM: `rascunho → vigente → encerrado / cancelado`

### Estrutura visual confirmada — View principal (sessão 2026-06-01)

**Header:** `h1.view-title` "Financeiro" + `p.view-subtitle` "Gestão financeira, contratos, fontes de recurso e orçamento" → padrão novo correto ✅

**4 abas reais** (divergência do código):
- **Contratos** | **Remanejamentos** | **Aditivos** | **Exportações**
- A aba "Fontes de Recurso" **não existe** na UI — foi integrada como seção interna do formulário "Novo Contrato"

**MÉTRICAS** (MetricsToggle ✅): 4 cards — Total de contratos (1) | Ativos (1) | Suspensos (0) | Valor em aberto (R$ 1.671.669,07)

**Lista de Contratos:** filtro dropdown "Ativos" + "Atualizar" + "+ Novo"; card com: nome, código, valor, vigência, badge status ("Ativo"), ícone lápis (editar), ícone de pessoas (equipe — a confirmar)

**Contrato real cadastrado:** "Contrato de Gestão CCBJ — 005/2025 (25-27) — Ano II" | Ativo | R$ 1.671.669,07 | 2026-04-01 → 2027-03-31

### Aba Remanejamentos ✅
- Métricas: Total 0, Pendentes 0, Efetivados 0, Valor Efetivado R$ 0,00
- Estado vazio: "Nenhum remanejamento registrado." ✅

### Aba Aditivos ✅ (com bug)
- Métricas: Total 0, Pendentes 0, Efetivados 0, **Valor Aditivado "—"** (ver FIN-13)
- Estado vazio: "Nenhum aditivo registrado." ✅

### Aba Exportações ✅ — NÃO DOCUMENTADA ANTERIORMENTE
Três ferramentas de prestação de contas para portais federais:

| Ferramenta | O que faz |
|---|---|
| **SALIC — Lei Rouanet** | Gera XML de Prestação de Contas para o portal SALIC-BR (MinC) a partir do Plano de Trabalho do contrato Lei Rouanet. Select de contrato + botão "Gerar XML SALIC" |
| **PNAB — Política Nacional Aldir Blanc** | Gera 4 CSVs (Espaços, Agentes Culturais, Ações Realizadas, Execução Financeira) para prestação de contas da Lei Aldir Blanc (Lei nº 14.399/2022). Select de projeto + campo de ano + botão "Gerar CSVs PNAB" |
| **SNIIC — Indicadores Culturais Nacionais (MinC)** | Gera planilha CSV para o SNIIC com 6 seções: Identificação, Funcionamento, Recursos Humanos, Atividades Culturais, Público Atendido e Recursos Financeiros. Campo de ano de referência + botão "Gerar SNIIC" |

> Funcionalidade diferenciada e de alto valor para organizações culturais que prestam contas a múltiplos órgãos federais. Verificação de qualidade e completude dos arquivos gerados está pendente.

### Painel do Contrato — estrutura visual confirmada

**Header:** nome do contrato + botão ✕

**5 abas** (scrollável, última parcialmente visível): **Plano de Trabalho | Pessoal | Indicadores | Plano de Contas | Histórico**

#### Aba Plano de Trabalho ✅
Hierarquia visual confirmada:
```
Meta 01 — CONTRATUAL · Ação Cultural — R$ 1.515.739,43 [lápis] [+=] [lixeira]
  Atividade 1.1 — R$ 1.515.739,43 [+] [lixeira]
    Pessoal: R$ 0,00 | Custeio: R$ 1.515.739,43 | Investimento: R$ 0,00
    Total Meta: R$ 1.515.739,43
    Rubricas (itens de despesa):
      3.3.50.00.20 — BOLSA AUXÍLIO (5 linhas) — custeio — R$ 179.600,00 [👁] [lápis] [lixeira]
      3.3.50.00.26 — BUFFET/CAMARIM/ALIMENTAÇÃO (2 linhas) — custeio — R$ 31.050,00
      3.3.50.00.20 — CACHE (3 linhas) — custeio — R$ 291.000,00
      3.3.50.00.38 — LOCAÇÃO DE VEÍCULOS (2 linhas) — custeio — R$ 33.584,90
      3.3.50.00.37 — LOCAÇÃO DE ESTRUTURA PARA EVENTOS (4 linhas) — custeio — R$ 70.600,00
      3.3.50.39.00 — ORG. E PRODUÇÃO DE EVENTOS (9 linhas) — custeio — R$ 211.966,31
      3.3.50.00.115 — PESQUISA E CURADORIA (1 linha) — custeio — R$ 19.800,00
      3.3.50.00.115 — SERV. TEC. ESPECIALIZADOS (8 linhas) — custeio — R$ 520.191,82
Custeio Operacional — CONTRATUAL — R$ 155.929,64
Meta 02 — CONTRATUAL · NArTE — R$ 0,00
[+ Nova Meta]
```
- Ícone 👁 em cada rubrica → abre modal read-only da Memória de Cálculo ✅ (FIN-03 **NEGADO** — view existe)

#### Formulário de Rubrica (Item de Despesa) — campos mapeados
| Campo | Tipo | Observação |
|---|---|---|
| ITEM DE DESPESA (CATÁLOGO SEPLAG) * | select | Lista do catálogo SEPLAG |
| CATEGORIA | select | Custeio (default) |
| CÓDIGO SEPLAG | texto read-only | preenchido automaticamente ao selecionar o item ✅ |
| ITEM ANEXO IX | texto read-only | preenchido automaticamente ✅ |
| QTD. MESES | número | default 13 (duração do contrato) |
| VALOR TOTAL (CALCULADO) | read-only | calculado em tempo real ✅ |
| MEMÓRIA DE CÁLCULO | tabela inline | colunas: Descrição \| Setor \| Tipo \| Qtd \| Valor Unit. \| Subtotal; "+ Linha" para adicionar |

- Campo "Setor" na Memória de Cálculo aparece como dropdown "— Setor —" (sem seleção) em todas as linhas existentes → **confirma FIN-01**
- Coluna "Subtotal" na tabela em modo edição truncada — valores como "150", "10", "6" (sem valor completo) → ver FIN-10
- Modal read-only da Memória de Cálculo: mostra Descrição | Setor (sempre "—") | Tipo | Qtd | Valor Unit. | Subtotal (valores completos) — fundo branco opaco ✅, overlay escuro ✅

#### Formulário de Atividade — campos mapeados
| Campo | Tipo |
|---|---|
| DESCRIÇÃO DA ATIVIDADE * | texto |
| RESULTADO ESPERADO | texto |
| PRODUTO / ENTREGA | texto |
| QTD. PREVISTA | número — default 1 |
| QTD. DE MESES | número — default 12 |

#### Formulário Novo Contrato — campos mapeados
**DADOS DO CONTRATO:**
| Campo | Tipo | Observação |
|---|---|---|
| NOME DO CONTRATO * | texto | — |
| NÚMERO / PROCESSO | texto | — |
| MODALIDADE | select | default "Contrato de Gestão" |
| VALOR TOTAL (R$) | número | default R$ 0,00 |
| STATUS | select | default "Ativo" |
| VIGÊNCIA INÍCIO / FIM | date | — |
| OBJETO / DESCRIÇÃO | textarea | — |

**FONTE DE RECURSO** (seção interna do formulário — não aba separada):
| Campo | Tipo | Observação |
|---|---|---|
| NOME DA FONTE / INSTRUMENTO * | texto | — |
| ÓRGÃO FINANCIADOR | texto | — |
| CONTRAPARTIDA (R$) | número | default R$ 0,00 |
| OBS. FINANCEIRO | textarea | — |

> **Decisão arquitetural observada:** a Fonte de Recurso está embutida como seção do contrato, não como entidade gerenciável independente. Ver FIN-09.

#### Aba Pessoal ✅
- 5 métricas: Salário Total (R$ 8.103,38) | Encargos (R$ 2.884,80) | Benefícios (R$ 525,74) | Provisões (R$ 1.480,22) | Custo Total/13 meses (R$ 155.929,64)
- Card do colaborador: "Assessor de Gestão Executiva I" · R$ 12.994,14/mês · **R$ 155.929,64** · Custeio Operacional · CLT · 1x · 12m
  - Salário | Encargos | Benefícios | Provisões detalhados no card
  - Ícones: lápis + lixeira
- Botão "+ Adicionar Pessoal"
- Colaborador identificado apenas pelo cargo — sem vínculo com base de colaboradores do módulo Pessoas (confirma FIN-06 parcialmente)

#### Aba Indicadores ✅
Duas sub-abas: **RESULTADOS (por Meta/Mês)** | **GESTÃO (Semestral/Anual)**

**RESULTADOS:** Tabela por meta por mês com linhas "Meta" (previsto) e "Realizado" — colunas mensais + trimestrais (Q1, Q2...)
- Exemplo: "Público Beneficiado | Meta 01 — Total meta: 3500 Pessoas" — valores mensais de meta preenchidos; Realizado ainda todo zerado
- Botão "+ Novo Indicador RESULTADOS"

**GESTÃO:** Estado vazio — "Nenhum indicador GESTÃO. Clique em '+ Novo'." + Botão "+ Novo Indicador GESTÃO"

#### Aba Plano de Contas ✅
- Descrição: "Consolidado por código SEPLAG — gerado a partir do Plano de Trabalho." + botão "Recalcular"
- Tabela: Código SEPLAG | Descrição | Qtd Meses | Custo Mensal | Custo Total
- **8 linhas** consolidadas por código, com totais
- TOTAL GERAL: R$ 128.589,93/mês · **R$ 1.671.669,07** total
- Gerado automaticamente a partir do Plano de Trabalho — não editável diretamente ✅

#### Aba Histórico ✅ (com FIN-12)
- Tabela: VERSÃO | SALVO POR | DATA
- 19+ versões registradas (v10 a v19 visíveis, mais anteriores abaixo)
- Versão atual destacada em roxo (v19)
- Exemplo: v19 · joao.barros@idm.org.br · 2026-05-30T21:41
- **Apenas metadados** — sem conteúdo de cada versão, sem diff, sem reversão → FIN-12

### Problemas confirmados via teste visual ⚠️

**FIN-01** `🔴 Alta` — CONFIRMADO — Campo **Setor** na Memória de Cálculo exibe "— Setor —" (sem seleção) em todas as linhas existentes, tanto no formulário de edição quanto no modal read-only. Setor não é persistido ao salvar.

**~~FIN-03~~** `NEGADO` — ~~Sem view read-only da Memória de Cálculo~~ — View **existe**: ícone 👁 em cada rubrica abre modal com tabela de linhas da memória. Modal com fundo opaco ✅. A hipótese estava incorreta.

**FIN-07** `🟡 Média` — CONFIRMADO — Card "Valor em aberto" exibe R$ 1.671.669,07 — esse valor coincide com o valor total contratual. "Valor em aberto" sugere "ainda a pagar", mas aparenta ser o valor contratual total ativo. Label ambíguo — pode induzir à interpretação de que nada foi executado quando na verdade é o valor previsto total.

### Novos problemas identificados ⚠️

**FIN-09** `🔴 Alta` — **Fonte de Recurso sem gestão independente** — a aba "Fontes de Recurso" prevista no código não existe na UI. A fonte foi embutida como seção fixa do formulário "Novo Contrato" com campos simples (Nome, Órgão, Contrapartida, Obs.). Problemas: (a) sem CRUD independente de fontes; (b) sem múltiplas fontes por contrato — contratos comuns têm fonte principal + contrapartida + emendas; (c) sem visão consolidada de fontes de recurso por organização; (d) sem rastreabilidade de utilização de cada fonte entre contratos

**FIN-10** `🟡 Média` — **Coluna "Subtotal" truncada no modo edição da Memória de Cálculo** — a tabela inline exibe apenas os primeiros dígitos dos valores de subtotal (ex: "150" em vez de "R$ 150.000,00"). A largura da coluna é insuficiente. O modal read-only mostra os valores completos — é problema exclusivo do modo edição

**FIN-11** `🔴 Alta` — **Sem acompanhamento de execução financeira** — o módulo não tem visão de "previsto vs. executado" por nível hierárquico (contrato, meta, atividade, rubrica). A aba "Plano de Contas" mostra apenas o previsto por código SEPLAG. A aba "Indicadores" mostra público (quantidade), não financeiro. Não há onde registrar pagamentos, notas fiscais ou comprovantes de despesa. Toda execução financeira real é invisível no sistema — gap crítico para gestão e prestação de contas

**FIN-12** `🔴 Alta` — **Histórico de versões apenas com metadados** — a aba Histórico lista versões com número, usuário e timestamp, mas não mostra o conteúdo de nenhuma versão. Problemas: (a) impossível saber o que mudou entre v15 e v16; (b) sem diff comparativo entre versões; (c) sem possibilidade de reversão para versão anterior; (d) com 19 versões em poucos dias de uso, o histórico será inutilizável como ferramenta de auditoria sem acesso ao conteúdo

**FIN-13** `🟡 Média` — **Card "Valor Aditivado" exibe "—" na aba Aditivos** — os demais cards da aba (Total, Pendentes, Efetivados) exibem "0". O card financeiro exibe "—" em vez de "R$ 0,00" — inconsistência de formatação/renderização entre cards da mesma view

### Perguntas abertas
*(próxima rodada: execução financeira, FSM do contrato, ícone de pessoas no card)*

---

<a name="mod-32"></a>
## Módulo 32 — Escuta Institucional — Pesquisas e Pulse
**Status:** ⚠️ PROBLEMA CONFIRMADO

### O que o código diz
- 6 abas: Painel | Escuta Livre | Alertas | Distribuição | Relatórios | Gestão
- FAB pulse flutuante (canto inferior direito) — aparece quando há pergunta ativa
- Pulse: resposta 1-5 por dimensão (vigor, dedicação, demanda, absorção, segurança)
- Escuta espontânea: relato livre com dimensão
- Perfil analítico voluntário (LGPD)
- Supressão de emails após 90 dias

### Estrutura visual confirmada — View de gestão Escuta/Pulse (via screenshot)

- **Header:** "Escuta" (view-header padrão)
- **Seção "MARCADORES METODOLÓGICOS":** cards com categorias (ex: "Qualidade Metodológica") — painel de dimensões analíticas configuradas
- **Seção "BANCO DE PERGUNTAS PULSE":** tabela de perguntas cadastradas com colunas (texto da pergunta, tipo, data, status) — CRUD de perguntas disponíveis
- **Seção "ESCUTA PULSE":** painel de configuração/ativação das perguntas de Pulse

### Comportamento confirmado — Pulse FAB (testado em sessão anterior)
- FAB aparece no canto inferior direito ✅
- Ao clicar, exibe pergunta: **"Como você avalia sua carga de trabalho agora?"** com 5 botões emoji (😫😟😐🙂😊) ✅

### Problemas confirmados ⚠️

**PUL-01** `🔴 Alta` — ~~Botão de Pulse FAB não completa a submissão~~ **CORRIGIDO** (commits e20ba60 + b6d8098): submissão funciona; design v1 restaurado. **Testar para confirmar visualmente.**

**PUL-02** `🟡 Média` — ~~Pulse expõe terminologia técnica~~ **CORRIGIDO** (commit e20ba60).

**PUL-03** `🟡 Média` — Sem referência ao v1 para guiar redesign — o modelo de Pulse do v1 deve ser consultado como baseline de UX antes de qualquer reformulação.

---

### Estrutura visual confirmada — todas as abas (sessão 2026-05-31 s11)

**Header:** `h1` "Escuta Institucional" + subtítulo "Clima organizacional · UWES · JDC · CVF · NR-1"
- Botão refresh (ícone ↺) + "+ Nova Pesquisa" (`btn-primary` roxo) ✅
- **MÉTRICAS** (MetricsToggle ✅, colapsável): 4 cards — Pesquisas (0) | Ativas (0, verde) | Concluídas (0) | Último Clima (N/A)
- **6 abas**: Painel | Escuta Livre | Alertas | Distribuição | Relatórios | Gestão

#### Aba Painel
- **"Carregando..."** que nunca resolve → ⚠️ ESC-04
- Seção "EVOLUÇÃO DO CLIMA": "Sem histórico de pesquisas encerradas." ✅
- Seção "PESQUISAS FORMAIS": filtro dropdown "Todos os status" + "Nenhuma pesquisa encontrada." ✅

#### Modal "+ Nova Pesquisa" (via botão no header)
- Título modal: "Editar Pesquisa" (nomenclatura inconsistente — deveria ser "Nova Pesquisa" na criação)
- 4 campos: TÍTULO * | DESCRIÇÃO | INÍCIO (date) | FIM (date) | Respostas anônimas (checkbox ✅)
- Botões: Cancelar (rosa/pink ⚠️) | Salvar (roxo ✅)
- **BUG**: botão "+ Nova Pesquisa" fica preso em "Abrindo..." mesmo com modal aberto → instância de SIS-09 (ESC-06)
- Formulário extremamente minimalista: sem seleção de metodologia, sem banco de questões, sem configuração de participantes → ESC-15

#### Aba Escuta Livre
- Seção "RESPONDER PESQUISA ATIVA": mensagem orientadora quando sem pesquisa ativa ("Use a Escuta Espontânea abaixo...") ✅
- Seção "RELATO ESPONTÂNEO": textarea + Dimensão (select opcional) + Anônimo (checkbox) + "Enviar Relato" ✅
- Seção "MEU PERFIL ANALÍTICO": Gênero | Raça/Cor | Vínculo | Nível | Faixa Salarial | Tempo de Casa (todos select "—") + "Salvar Perfil" (rosa/pink ⚠️)
  - Texto: "Dados voluntários e protegidos pela LGPD." ✅
  - **Deve ser removida** — ver ESC-08 e ESC-09

#### Aba Alertas
- STATUS: select "Apenas ativos"
- "Nenhum alerta ativo." (estado vazio)
- **Propósito não documentado** nem comunicado ao usuário → ESC-10

#### Aba Distribuição
- Seção "SISTEMA PULSE — MÉDIAS POR DIMENSÃO": datepicker "maio de 2026" + "Sem respostas pulse neste período."
- Seção "SATURAÇÃO POR DIMENSÃO": barras de progresso com IDs numéricos (0, 1, 2, 3…7) em vez de nomes (**IDs internos expostos** → ESC-11)
  - Dimensões 0 e 1 com barra vermelha (1/10 cada) — indicam baixa saturação
- Seção "PARTICIPAÇÃO HISTÓRICA (12 MESES)": gráfico de linha mensal (jun/25→mai/26) + "Pulse + Espontânea por mês" ✅

#### Aba Relatórios
- Pesquisa: select "— selecionar —" + botões "Cruzamento" (roxo) + "Relatório" (roxo)
- "Selecione uma pesquisa encerrada para ver os resultados." ✅
- Simples e funcional — sem dados para testar agora

#### Aba Gestão
**Seção "MARCADORES METODOLÓGICOS":**
- Exibe **"object Object"** como nome do marcador — objeto JS não serializado (→ ESC-05)
- Subtítulo: "Qualidade baixa — revisar" — dado real mas renderização quebrada
- "✅ Motor metodológico sem avisos." — contradição com "Qualidade baixa" na mesma seção ⚠️

**Seção "BANCO DE PERGUNTAS PULSE":**
- "Perguntas do Pulse contínuo — controle quais entram na rotação automática." ✅
- Botões "Habilitar todas" / "Desabilitar todas" (roxo) ✅
- Lista de perguntas com: badge dimensão | texto | "X imp · Y resp" | % taxa | checkbox Habilitada ✅
- Dimensões confirmadas: vigor (3 perguntas) | dedicacao (3) | absorcao (3) | demanda (2+) | colaboracao (2) | inovacao (3) | seguranca (3) ✅
- Perguntas bem formuladas em linguagem orientada ao colaborador ✅
- Dados reais: vigor 7imp/1resp/14%, dedicacao 5imp/1resp/20%, demanda 5imp/0resp/0%, absorcao 1imp/0resp/0%
- Destaque laranja: "Perguntas exibidas sem nenhuma resposta no período" (demanda 5imp, absorcao 1imp) ✅

**Seção "MONITORAMENTO PULSE"**: datepicker + Atualizar (roxo)
- 4 cards: 18 IMPRESSÕES | 2 RESPOSTAS | **11% TAXA GERAL** | 2 SEM RESPOSTA ✅
- Tabela: PERGUNTA | DIMENSÃO | IMP. | RESP. | TAXA | ÚLTIMA ✅

**Seção "CONFIGURAÇÕES":**
- Máx. Perguntas/Dia: 3 | Anti-Spam (Horas): 4 | Confiança Mínima (%): 15 | Grupo Mínimo (Subgrupos): 5 ✅
- "Salvar Configurações" (rosa/pink ⚠️ cor fora do padrão DS)

**Seção "CICLO DE FEEDBACK":** "Selecione uma pesquisa nos Relatórios para ver o feedback." ✅

**Seção "LGPD — SUPRESSÃO DE DADOS":**
- "Remove e-mails identificadores de respostas pulse/espontânea com mais de 90 dias (operação irreversível)."
- "Suprimir E-mails Antigos (LGPD)" (vermelho — correto para operação destrutiva) ✅

### Regra de negócio capturada — Perfil do Usuário (sessão s11)

> **Descoberta crítica (confirmada pelo usuário):** o campo "Meu Perfil Analítico" na aba Escuta Livre é desnecessário e deve ser removido. As informações demográficas devem vir do **perfil cadastral do usuário** no sistema.
>
> **Modelo desejado — Perfil Editável do Usuário:**
> 1. Dados **somente leitura** (vêm do RH/Admin, usuário não edita): cargo, setor, vínculo empregatício, data de admissão, nível, faixa salarial
> 2. Dados **editáveis pelo próprio usuário**: nome social (prioridade sobre nome no sistema inteiro), pronomes, autodeclaração de raça/cor, foto
> 3. **Nome social tem prioridade absoluta** em toda exibição do sistema — saudações, avatar, campos de autoria, listas. Somente se não houver nome social, usar o nome registrado
> 4. Página/modal "Meu Perfil" acessível pelo avatar/menu do usuário no header
>
> **Para o módulo Escuta:** dados demográficos usados para segmentação e equidade (raça/cor, vínculo, nível, tempo de casa, gênero) devem ser **lidos diretamente do perfil cadastral** — não coletados novamente dentro do módulo. Isso elimina a redundância e garante consistência.

### Novos problemas confirmados ⚠️ (sessão s11)

**ESC-04** `🔴 Alta` — **Aba Painel com loading infinito** — seção superior da aba exibe "Carregando..." que nunca resolve. As demais seções (Evolução do Clima, Pesquisas Formais) carregam normalmente. Provável falha silenciosa em uma chamada ao backend que popula a seção superior do painel.

**ESC-05** `🔴 Alta` — **"object Object" nos Marcadores Metodológicos** — aba Gestão exibe literalmente o texto "object Object" como nome do marcador metodológico, ao lado do badge vermelho. É um objeto JavaScript sendo convertido para string sem serialização (`{}.toString() = "[object Object]"`). A renderização está chamando `.toString()` ou interpolando o objeto sem `JSON.stringify()` ou sem acessar a propriedade correta do objeto.

~~**ESC-06**~~ ✅ CORRIGIDO — `BtnGuard.liberar('btn-nova-pesquisa')` no Cancelar e overlay click.

**ESC-07** `🟡 Média` — **Botões "Salvar Configurações" e "Salvar Perfil" com cor rosa/pink** — fora do padrão DS (`btn-primary` roxo). Terceira cor não prevista no design system. Consistente com o padrão incorreto detectado em BAL-13 ("Enviar Nova Versão" rosa/pink).

**ESC-08** `🔴 Alta` — **Seção "MEU PERFIL ANALÍTICO" na aba Escuta Livre deve ser removida** — dados de equidade (gênero, raça/cor, vínculo, nível, faixa salarial, tempo de casa) não devem ser coletados dentro do módulo Escuta como formulário independente. Devem vir automaticamente do perfil cadastral do usuário no sistema (confirmado pelo usuário). A coleta fragmentada cria duplicidade, inconsistência de dados e interface desnecessariamente complexa para o colaborador.

**ESC-09** `🔴 Alta` — **Sistema sem área de perfil editável pelo próprio usuário** — não existe no sistema uma tela/modal "Meu Perfil" onde o colaborador possa cadastrar ou atualizar suas informações pessoais. Campos esperados: nome social (prioridade máxima em toda exibição), pronomes, autodeclaração raça/cor, foto. Dados vindos do RH (cargo, setor, vínculo, admissão, faixa salarial) devem ser somente leitura nessa tela. A falta desse perfil afeta: Escuta (dados demográficos), saudações (SIS-11), avatar, campos de autoria em todo o sistema.

**ESC-10** `🟡 Média` — **Aba "Alertas" sem estado vazio orientador** — propósito confirmado pelo usuário: alertas automáticos de bem-estar baseados em thresholds (ex: "vigor médio abaixo de X por N semanas → notificar gestor"). O problema é que a aba exibe apenas "Nenhum alerta ativo" sem nenhuma explicação do que são alertas, como são configurados ou o que os dispara. Enquanto não há dados suficientes para gerar alertas, a aba parece vazia e sem função. Necessário: (a) estado vazio orientador explicando o propósito ("Alertas são gerados automaticamente quando indicadores de bem-estar atingem limiares de atenção. Configure os limiares na aba Gestão."); (b) link/botão para configurar thresholds; (c) na aba Gestão, seção de configuração de thresholds por dimensão (valor mínimo, período de observação, destinatário da notificação).

**ESC-11** `🟡 Média` — **Saturação por Dimensão exibe IDs numéricos** — as barras de progresso na aba Distribuição estão rotuladas "0", "1", "2"… "7" em vez dos nomes das dimensões (vigor, dedicação, absorção, demanda, colaboração, inovação, segurança, psicológica). IDs internos expostos na interface — instância de SIS-08 e do mesmo padrão de CON-03 (IDs técnicos em vez de nomes legíveis).

**ESC-12** `🔴 Alta` — **Módulo Escuta sem documentação ou guia contextual integrado** — o módulo é metodologicamente complexo (UWES, JDC, CVF, NR-1, saturação, ciclo de feedback, marcadores metodológicos) e mesmo o administrador do sistema não compreende todas as abas. Precisa de: (a) tour guiado na primeira abertura; (b) tooltips explicativos por seção com linguagem simples; (c) glossário contextual acessível por hover/clique nas siglas e termos técnicos; (d) manual operacional in-app ("Como usar o módulo Escuta") acessível pelo botão ❓ do header.

**ESC-13** `🟡 Média` — **Subtítulo com siglas técnicas sem explicação** — "Clima organizacional · UWES · JDC · CVF · NR-1" no header do módulo usa siglas que a maioria dos usuários não conhece. Instância de SIS-08. As siglas devem ter tooltip ou ser substituídas por linguagem orientada ao benefício: "Bem-estar, engajamento e clima organizacional".

**ESC-14** `🟡 Média` — **Contradição na aba Gestão** — seção "MARCADORES METODOLÓGICOS" exibe ao mesmo tempo "Qualidade baixa — revisar" (problema) e "✅ Motor metodológico sem avisos." (tudo ok). As duas mensagens são contraditórias e geram confusão — uma avalia a qualidade dos dados coletados, a outra avalia o funcionamento do motor. Devem estar em sub-seções distintas com contexto claro.

**ESC-15** `🔴 Alta` — **Modal "Nova Pesquisa" extremamente minimalista** — apenas 4 campos (título, descrição, período, anonimato). Criar uma pesquisa formal de clima organizacional exige: (a) seleção de metodologia (UWES, JDC, CVF, NR-1 ou personalizada); (b) seleção ou edição do banco de questões; (c) configuração de participantes (quem receberá); (d) canal de notificação; (e) definição de periodicidade (única, mensal, trimestral). O formulário atual não permite criar uma pesquisa utilizável. Gap crítico para a funcionalidade central do módulo.

**ESC-16** `🟡 Média` — **Título do modal "Editar Pesquisa" na criação** — ao clicar "+ Nova Pesquisa", o modal exibe "Editar Pesquisa" como título. Deveria exibir "Nova Pesquisa" — o mesmo problema de nomenclatura inconsistente detectado em outros modais do sistema.

---

<a name="mod-43"></a>
## Módulo 43 — Admin — Setores, Usuários e Módulos
**Status:** ⚠️ PROBLEMA CONFIRMADO

### O que o código diz
- Abas: Features | Provisionamento | Usuários | Config Sistema | Banco de Dados
- Gestão de usuários, papéis, setores e permissões por módulo

### Estrutura visual confirmada — Admin (via screenshots sessão anterior)

#### View principal
- **Header:** "Administração" + subtítulo "Configurações gerais do sistema e da organização"
- **Seção "Acessos Pendentes"** → spinner de loading (ADM-01 confirmado)
- **Seção "Cadastros Base"** → 5 abas: Features | Provisionamento | Usuários | Config Sistema | Banco de Dados

#### Aba Usuários
- Tabela com colunas: Usuário | Papel | Setor | Status | Ações
- Usuários visíveis: 2 (joao.barros@idm.org.br — SuperAdmin/direção/ativo; thais.freitas@idm.org.br — Colaborador/ativo)
- Ações por linha: **Editar** + **Revogar**

#### Modal "Editar usuário"
- Header: email do usuário
- Campo **PAPEL**: dropdown (ex: RH)
- Campo **SETOR**: dropdown (ex: Gestão) — inicialmente carregava apenas "— Sem setor —" (bug corrigido na sessão)
- Seção **PERMISSÕES POR MÓDULO**: grid com módulos × 3 dimensões (VER | EDITAR | EXCLUIR)
  - Módulos listados: Ações, Espaços, Pessoas, Financeiro, Comunicação, Tarefas, Reuniões, Relatórios, Administração, Master, Público
  - Instrução: "Checkboxes marcados = acesso liberado. Valores padrão vêm do Papel; altere só o necessário. Override ativo aparece em roxo."
- Botões: **Salvar** (roxo/primário) + **Cancelar**

#### Aba Banco de Dados
- Mostra operações de banco disponíveis (migração, backup, etc.)
- Erro: **"Permissão insuficiente: Apenas Admin ou Superadmin podem executar esta operação"**
- Nota: "Funciona em segundo plano em Superadmin" — operações só funcionam para SuperAdmin

### Comportamento confirmado ✅ — Estrutura visual completa (sessão 10)

**Tab bar "Cadastros Base"** — 10 abas com scroll horizontal não sinalizado: Espaços | Setores | Turnos | Categ.Itens | Módulos | Features | Provisionamento | Usuários | Config.Sistema | Banco de Dados

**Aba Espaços:** lista todos os espaços com botões Editar / Desativar / Bloquear reservas (ou Liberar reservas conforme estado atual) / Excluir por linha. Espaços reserváveis têm "Bloquear reservas"; não-reserváveis têm "Liberar reservas". Botão `+ Novo Espaço` no topo.

**Aba Setores:** lista 7 setores com ponto de cor identificadora + Editar/Excluir. Botão `+ Novo Setor`.
- Modal "Novo Setor": Nome * + Cor identificadora (hex com seletor de cor) + Salvar/Cancelar.

**Aba Turnos:** tabela Nome | Início | Fim | Dias | Status | Ação. 3 turnos (Manhã 08:00–12:00, Tarde 12:01–17:00, Noite 17:01–21:30), todos Seg–Sáb, todos Ativos. Botão `+ Novo Turno`.
- Modal "Novo Turno": Nome * + Início * + Fim * + checkboxes por dia da semana (Dom desmarcado por padrão, Sáb desmarcado por padrão) + Salvar/Cancelar ✅

**Aba Categ.Itens:** lista 6 categorias com Editar/Excluir. Botão `+ Nova Categoria`.

**Aba Módulos:** tabela Módulo | Descrição | Status | Ação. Todos os 10+ módulos em status "Ativo" com botão "Desativar". Conceito de toggle por módulo sem deploy ✅. Ausentes visíveis na lista: Financeiro, Contratações, Infraestrutura, Comunicação/Balcão — scroll necessário para ver todos.

**Aba Features:** texto: "Ative ou desative funcionalidades sem necessidade de novo deploy. As alterações tomam efeito imediatamente." 3 grupos visíveis:
- CORE: **Assistente IA** (Respostas e sugestões da IA embutida (Bêjotinha)) — toggle ON
- PORTAL PÚBLICO: **Portal Público** (Inscrições, cessão de pauta e agenda pública) — toggle ON
- COMUNICAÇÃO: **RECE** (Agenda da Rede de Espaços Culturais) — toggle ON
- MEMÓRIA CULTURAL — (conteúdo cortado pelo scroll)

**Aba Provisionamento:** "Checklist de Provisionamento" + 2 botões (Abrir Wizard de Setup + Recarregar). Barra de progresso verde: **8 de 8 verificações (100%)**. Itens verificados ✅: PropertiesService configurado (orgId: org_1779296388866_e7qy6f) | Pasta de dados criada no Drive (org_1779296388866_e7qy6f_DATA) | Planilhas Google Sheets criadas (SHEET_ID_MASTER: OK) | SuperAdmin registrado (Pelo menos 1 superadmin).

**Aba Config.Sistema → Expediente & Horários:** Abertura do expediente 08:00 / Encerramento 21:30 + Salvar ✅

**Aba Config.Sistema → Identidade Visual:** Logo preview ✅ + "Carregar Imagem" / "Remover" + "Extrair cores do logo automaticamente" + PALETA DE CORES (Cor Primária #8a0a72, Cor de Destaque #f59e0b, Cor do Menu Lateral #500a8a) + Derivadas automáticas (Clara #c242aa, Escura #52003a, Secundária #ffdbff, Texto menu #ffffff) + "Prévia do menu lateral" ✅

**Aba Banco de Dados:** Texto explicativo sobre JSON + Sheets no Drive. 3 botões de acesso direto: Pasta ERP (CCBJ) | Dados JSON | Planilhas. Grade de atalhos para 8 planilhas com botão "Abrir": MASTER, AÇÕES, ESPAÇOS, PESSOAL, EQUIPES/RH, FINANCEIRO, RELATÓRIOS, REUNIÕES ✅

**Modal "Novo Espaço" — NOVA DESCOBERTA:**
- Nome * + Tipo de Espaço (select: Multiuso) + Zona de Uso (select: Uso Público)
- Capacidade + Possui Chaves (checkbox) + Aceita Reservas (checkbox ✅)
- **Abertura / Fechamento: 08:00 – 22:00** — campo de horário por espaço já implementado ✅ (revisita ESP-16)
- RESPONSÁVEIS POR PERÍODO: "+ Adicionar período" com texto: "Nenhum responsável configurado. Qualquer usuário poderá reservar este espaço normalmente. Reservas de outros setores nestes períodos exigirão aprovação de pelo menos um dos e-mails listados." ✅
- POSIÇÃO NO MAPA: "Definir no mapa" + área preview inline + "Sem posição definida" ✅

**Modal "Editar usuário" — seção FUNCIONALIDADES ESPECÍFICAS — NOVA DESCOBERTA:**
"Controles granulares dentro de cada módulo. Padrão vem do Papel. Override ativo = roxo."
- COMUNICAÇÃO *(módulo sem acesso)*: [ ] Publicar pesquisa (Escuta) / [ ] Enviar comunicado / e-mail em massa / [ ] Gerir fila do Balcão
- TAREFAS: [x] Ver tarefas de toda a equipe / [ ] Criar e atribuir tarefas para outros
- PESSOAS: [x] Aprovar férias / afastamento / [x] Aprovar remanejamento / [x] Ver dados salariais / [x] Gerar / cancelar holerites / [x] Lançar / editar ponto de outros
- REUNIÕES: [x] Criar / editar pautas / [x] Finalizar / arquivar reunião
- AÇÕES: [ ] Publicar na agenda pública

> **Implicação:** o sistema já vai além de VER/EDITAR/EXCLUIR por módulo — existe granularidade por funcionalidade específica. ADM-02 deve ser revisado.

### Problemas confirmados ⚠️

**ADM-01** `🟡 Média` — "Acessos Pendentes" exibe spinner sem concluir o carregamento (já registrado)

**ADM-02** `✅ CORRIGIDO 2026-06-03` *(REVISADO sessão 10 + corrigido auditoria de permissões)* — Modal "Editar usuário" TEM seção "Funcionalidades Específicas" com controles granulares por funcionalidade. **Correções aplicadas:** (a) `featuresAtivas` do boot (já contém overrides mesclados) agora consumido no frontend para gates de ação: `ReservasCarroUI.ehAprovador` usa `featuresAtivas.ESPACOS.aprovar_reserva_carro`; `ReservasUI._podeHabilitar` usa `featuresAtivas.ESPACOS.aprovar_reserva`; `EscutaUI._ehGestaoEsc` usa `featuresAtivas.PESSOAS.gerir_escuta`; InfraConfigUI usa `permissoesModulos.ESPACOS.editar`. (b) Feature `PESSOAS.gerir_escuta` adicionada ao catálogo. (c) Papel `'coordenador'` adicionado como válido com matriz própria. (d) `AcessoService.verificar(array)` corrigido em 10 lugares (era no-op silencioso). **Gap residual:** sem controle por setor/recurso; sem grupos de permissão.

**ADM-03** `🟡 Média` — Campo SETOR no modal "Editar usuário" não carregava inicialmente (dropdown mostrava apenas "— Sem setor —"), confirmando o padrão de campos não integrados com a base de setores (mesmo anti-padrão de TAR-02, CHV-06, EMP-03). Aparentemente corrigido na sessão — mas o padrão sistêmico permanece (SIS-01 adjacente).

**ADM-04** `🟡 Média` — Aba Banco de Dados visível para usuário Admin mas inacessível — exibe erro de permissão ao tentar executar operações. A aba deveria ser ocultada ou desabilitada para usuários não-SuperAdmin para evitar confusão operacional.

**ADM-05** `🟡 Média` — **UI de Administração truncada** — conteúdo visualmente cortado ou mal distribuído. O módulo precisa de revisão de layout completa. (Confirmado pelo usuário — sem screenshot; abas Features, Provisionamento e Config Sistema ainda a testar.)

**ADM-06** `🟡 Média` — **Inconsistência visual entre as duas interfaces de usuários** — Aprovações → Permissões usa design mais novo (badge chips coloridos por papel: superadmin roxo, rh laranja, habilitador teal; badge "Ativo" verde; tabela limpa e legível). Admin → Usuários usa design mais antigo (tabela densa, menos visual). As duas interfaces exibem dados de usuários e deveriam compartilhar o mesmo componente visual — Aprovações pode servir de referência de redesign para o Admin.

**ADM-07** `🟡 Média` — **Barra de abas sem sinalização de scroll** — a tab bar de "Cadastros Base" (agora 9 abas após remoção de Turnos e Config.Sistema) pode não caber na largura da tela sem scroll horizontal. Nenhum indicador visual (chevron, fade, seta, badge "+ N") sinaliza que existem abas fora da área visível — usuário pode não perceber as abas à direita. *(Corrigido parcialmente em s16 Fase 44c com `_initTabBarNav`)*

~~**ADM-08**~~ `~~🟡 Média~~` — ~~**Turnos e Config.Sistema devem ser unificados**~~ — **CORRIGIDO** s17 @446 (2026-06-03): Turnos integrado à subaba "Horários" em Infraestrutura → Config; Config.Sistema removida do Admin; Identidade Visual promovida a aba própria em Cadastros Base; todos os hardcodes de horário removidos do sistema (reserva_engine, escuta_pulse, ia_service, CCBJ Fechado) — horários lidos exclusivamente de `ConfigService.getReservaHorario()` e `ConfigService.getTurnos()`.

**ADM-09** `🟡 Média` — **Categ.Itens deve migrar para Estoque/Almoxarifado** — categorias de itens (Equipamento Audiovisual, Informática, Mobiliário, Material Gráfico, Insumo, Outro) são específicas do catálogo de estoque, não configuração geral do sistema. A aba deve ser removida do Admin e incorporada como configuração interna do módulo Estoque. Confirmado pelo usuário.

**ADM-10** `🔴 Alta` — **Toggles de Features inoperantes** — os toggles das feature flags (Assistente IA, Portal Público, RECE, etc.) não têm resposta visual ao clique: permanecem no mesmo estado antes e depois de clicar, sem animação, sem mudança de posição, sem feedback de estado. Não há nem atualização visual local — o toggle simplesmente não reage. O propósito da aba é exatamente ativar/desativar funcionalidades sem deploy — com toggles completamente inertes, a aba não cumpre função alguma. Confirmado pelo usuário (s15).

**ADM-11** `🟡 Média` — **Wizard de Setup abre página vazia** — botão "Abrir Wizard de Setup" na aba Provisionamento abre uma página sem conteúdo. O Wizard é o guia de configuração inicial do sistema; mesmo que o provisionamento já esteja em 100%, o Wizard deveria funcionar para revisão e onboarding de novos administradores. Confirmado pelo usuário.

**ADM-12** `🟡 Média` — **Botão "Visualizar Cadastro" leva para página externa em branco** — o botão na seção "Acessos Pendentes" abre uma URL externa que não exibe conteúdo. Possível endpoint de cadastro público não implementado ou URL do GAS malformada. Confirmado pelo usuário.

### Achados positivos ✅ (sessão 10)

- **Horário por espaço já implementado** — modal "Novo Espaço" tem campo "Abertura / Fechamento" por espaço. A arquitetura de horário individual existe no modelo; o gap é apenas que a validação usa valor hardcoded em vez do horário configurado por espaço (ESP-16 já registrado). Gap adicional: default do campo (22:00) diverge do expediente global (21:30) — ao criar um espaço novo, deveria pré-preencher com o horário global cadastrado.

- **Responsáveis por período já implementados no cadastro de espaço** — "Reservas de outros setores nesses períodos exigirão aprovação de pelo menos um dos e-mails listados" ✅ — lógica de auto-confirmação por responsável (ESP-26) já tem suporte na UI de cadastro.

- **Identidade visual com extração automática de cores do logo** — funcionalidade diferenciada: ao carregar o logo, sistema deriva automaticamente a paleta (primária, destaque, menu lateral) + derivadas automáticas (clara, escura, secundária, texto menu). Prévia do menu lateral aplicando as cores em tempo real ✅.

- **Aba Banco de Dados com atalhos diretos** — acesso a 8 planilhas Google Sheets + pasta Drive + pasta JSON diretamente do painel Admin. Facilita acesso operacional de emergência ao banco de dados ✅.

### Observações adicionais de arquitetura de configurações (sessão 10)

> **Estrutura atual de "Cadastros Base" — 10 abas:**
> Espaços | Setores | Turnos | Categ.Itens | Módulos | Features | Provisionamento | Usuários | Config.Sistema | Banco de Dados
>
> **Proposta de reorganização (confirmada pelo usuário):**
> - Turnos → fusionar em "Horários & Turnos" junto com Config.Sistema → Expediente & Horários
> - Categ.Itens → migrar para módulo Estoque/Almoxarifado
> - Resultado: 8 abas mais coesas na tab bar do Admin

### Rastreador de testes — Admin
| Item | Status | Sessão |
|---|---|---|
| View principal carrega | ✅ | sessão anterior |
| Aba Usuários — tabela de usuários | ✅ | sessão anterior |
| Modal Editar usuário — Papel + Setor | ✅ (ADM-03) | sessão anterior |
| Modal Editar usuário — PERMISSÕES POR MÓDULO | ✅ (ADM-02) | sessão anterior |
| Aba Banco de Dados | ✅ (ADM-04) | sessão anterior |
| Aba Features | 🔲 pendente | — |
| Aba Provisionamento | 🔲 pendente | — |
| Aba Config Sistema | 🔲 pendente | — |

---

<a name="mod-36"></a>
## Módulo 36 — Aprovações
**Status:** 🔍 EM ANÁLISE (já testado parcialmente; problemas adicionais identificados via correcoes.md)

### O que o código diz
- Cobre: Reservas de espaço, Primeiros acessos, Reservas de veículo
- Badge de pendentes deveria aparecer no menu
- Superadmin restrito por RBAC (`modulo:'ESPACOS'` — linha ≈ 20199 do index.html)

### Comportamento confirmado ✅ (sessão 2026-05-31)
- 4 abas carregam: Reservas de Espaço | Primeiros Acessos | Veículo | Permissões ✅
- Aba Reservas de Espaço: seção "Solicitações de Reserva" + filtro dropdown (Pendentes) + estado vazio ✅

### Problemas confirmados ⚠️

**APR-01** `🔴 Alta` — Sem badge de contador por aba — quando há pendências, o usuário precisa clicar em cada aba para descobrir onde estão. Nenhuma aba tem indicador numérico de itens pendentes.

**~~APR-02~~** `NEGADO` — ~~SuperAdmin não acessa Aprovações~~ — SuperAdmin acessa o módulo normalmente ✅. O item `aprovacoes` no menu não tem restrição `modulo:` — é sempre visível. Bug corrigido antes do teste visual.

**APR-03** `🟡 Média` — **REVISADO** — Aba "Permissões" existe (não ausente), mas mostra **todos os usuários ativos** (João Barros/superadmin, Thais Freitas/rh, Renan Braz/habilitador) em vez de apenas usuários com acesso pendente de aprovação. Duplica parcialmente Admin → Usuários sem agregar valor específico ao contexto de "Aprovações". Usuários em status "pendente" não aparecem (gap original confirmado).

### Estrutura visual confirmada — todas as abas (sessão 2026-05-31 s9)

**Header:** `page-header` + `div.page-title` "Aprovações" + `div.page-subtitle` → **padrão antigo** — deveria ser `view-header` + `h1.view-title` ⚠️ APR-06

**Tab bar:** 4 abas com ícones Material Symbols:
- 🏛 Reservas de Espaço | 👤 Primeiros Acessos | 🚗 Veículo | 🔒 Permissões
- **Nenhuma aba aparece visualmente como ativa** ⚠️ APR-04

**Aba Reservas de Espaço** ✅:
- Card "Solicitações de Reserva" + filtro dropdown (Pendentes/Aprovadas/Recusadas/Todas) + botão refresh
- Estado vazio: "Nenhuma solicitação." ✅

**Aba Primeiros Acessos** ✅:
- Card "Solicitações de Acesso" + botão refresh
- Estado vazio: "Nenhuma solicitação de acesso pendente." ✅

**Aba Veículo** ⚠️:
- Card "Solicitações de Veículo" + botão refresh
- Exibe **"Carregando..."** sem resolver ⚠️ APR-05

**Aba Permissões** ✅ (com ressalvas):
- Card "Gerenciar Permissões de Acesso" + botão refresh
- Tabela: Usuário | Papel | Status
- 3 usuários listados: João Barros (superadmin/Ativo) | Thais Freitas (rh/Ativo) | Renan Braz (habilitador/Ativo)
- Todos ativos — sem pendentes ⚠️ APR-03 confirmado

### Novos problemas confirmados ⚠️

~~**APR-04**~~ ✅ CORRIGIDO — `.active` → `.ativa` em `setTab()` e no HTML inicial de Aprovações.

**~~APR-05~~** `CORRIGIDO s14` — ~~Aba Veículo exibe "Carregando..." sem resolver~~ — **carrega normalmente** em s14. Problema não reproduzível. Provavelmente era transiente (loading ainda em andamento quando o screenshot foi feito em s9).

~~**APR-06**~~ ✅ CORRIGIDO s17 Fase 43 — **Cabeçalho com padrão antigo** — `page-header` + `div.page-title` + `div.page-subtitle` enquanto o padrão atual é `view-header` + `h1.view-title` + `p.view-subtitle`. Mesmo anti-padrão de SIS-03.

### Rastreador de testes — Aprovações (atualizado sessão 9)
| Item | Status | Sessão |
|---|---|---|
| 4 abas visíveis para SuperAdmin | ✅ APR-02 NEGADO | 2026-05-31 s9 |
| Tab ativa sem marcação visual | ✅ APR-04 CORRIGIDO | 2026-06-01 |
| Aba Reservas de Espaço — estado vazio | ✅ | 2026-05-31 s9 |
| Aba Primeiros Acessos — estado vazio | ✅ | 2026-05-31 s9 |
| Aba Veículo — carrega normalmente | ✅ APR-05 CORRIGIDO | 2026-05-31 s14 |
| Aba Permissões — usuários ativos (sem pendentes) | ✅ (com APR-03) | 2026-05-31 s9 |
| Fluxo de aprovação de reserva (com item real) | 🔲 pendente | — |

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

<a name="mod-21"></a>
## Módulo 21 — Contratações
**Status:** 🔍 EM ANÁLISE

### O que o código diz
- Módulo separado no menu lateral (abaixo de Financeiro)
- Backend: `solicitacao_repository.gs`, `solicitacao_engine.gs`, `solicitacao_controller.gs`
- FSM multi-nível de aprovação

### Estrutura visual confirmada — View principal (sessão 2026-06-01)

**Header:** `h1.view-title` "Contratações" + `p.view-subtitle` "Solicitações com aprovação multinível · Fornecedores · Documentos · Portal LGPD" → padrão novo ✅

> **Nota arquitetural:** o subtítulo menciona "Portal LGPD" — indica que pode existir um portal público para fornecedores com controle de dados pessoais. A confirmar.

**MÉTRICAS** (MetricsToggle ✅, colapsado quando formulário aberto): 4 cards — Pendentes de aprovação (0) | Em execução (0) | Concluídas (0) | Total (0)

**3 abas:** Solicitações | Fornecedores | Habilitações

**Aba Solicitações:**
- Campo busca: "Buscar por objeto, nº esboço, fornecedor, setor..."
- Botão refresh + "+ Nova"
- Filtros de status: **Todos** | Pendentes | Em execução | ⚠️ Atrasadas | Concluídas
  - "Atrasadas" com tratamento visual diferenciado (borda + ícone ⚠️) — provavelmente intencional para destaque
- Estado vazio (0 registros) ✅

### Formulário "Nova Solicitação de Contratação" — 7 seções mapeadas

#### Seção 1 · TIPO DE PROCESSO
| Campo | Tipo | Exemplo/Default |
|---|---|---|
| TIPO DE PROCESSO * | select | "Prestação de Serviço / Cachê / C…" (truncado) |
| NATUREZA * | select | "Cachê / Apresentação Artística" |

#### Seção 2 · IDENTIFICAÇÃO PROCESSUAL
| Campo | Tipo | Observação |
|---|---|---|
| Nº ESBOÇO / PROCESSO | texto | placeholder "Ex: ESB-2025-047" — **campo vazio, não pré-preenchido** → CON-02 |
| PROGRAMA (SE HOUVER) | texto | placeholder "Ex: Programa Cultura Viva" |
| LINK PROCESSO (SEI / DRIVE) | texto/URL | placeholder "https://..." — integração esperada com SEI ou Drive |
| AÇÃO VINCULADA | **select** | dropdown com ações cadastradas (exibiu "— Nenhuma —" e "Teste") ✅ **não é texto livre** |

> **Ação Vinculada é select** ✅ — contraste positivo com ACO-21/ACO-22 (Reuniões e Balcão usam texto livre para o mesmo campo). Contratações resolveu o problema que os outros módulos ainda têm.

#### Seção 3 · OBJETO E SETOR
| Campo | Tipo | Observação |
|---|---|---|
| OBJETO DA CONTRATAÇÃO * | textarea | placeholder descritivo |
| SETOR SOLICITANTE * | texto | placeholder "Ex: Produção" — **texto livre** → CON-01 |
| JUSTIFICATIVA | texto | placeholder "Motivo resumido" |

#### Seção 4 · FORNECEDOR / CONTRATADO
| Campo | Tipo | Observação |
|---|---|---|
| CPF OU CNPJ DO FORNECEDOR | texto + botão | busca na base de fornecedores cadastrados ✅ |
| Credor diferente do contratado | checkbox | — |

> **CPF/CNPJ com busca** ✅ — identifica o fornecedor a partir de base cadastrada, não texto livre.

#### Seção 5 · VÍNCULO FINANCEIRO ← ACHADO CRÍTICO
| Campo | Tipo | Observação |
|---|---|---|
| CONTRATO DE GESTÃO | select | "— Selecione —" |
| META | select | "— Selecione o Contrato primeiro —" (dependente do contrato) |
| RUBRICA / ITEM DE CUSTEIO | select | "— Selecione a Meta primeiro —" (dependente da meta) |

> **Cascata CONTRATO → META → RUBRICA existe no formulário** — o design intencional é que cada contratação se vincula a uma rubrica específica do Plano de Trabalho do Financeiro. Esta é a ponte entre planejamento (Financeiro) e execução (Contratações). **A confirmar:** se a cascata popula com dados reais e se o valor executado retorna ao Financeiro quando a contratação é concluída.

#### Seção 6 · CRONOGRAMA E VALOR
| Campo | Tipo | Observação |
|---|---|---|
| VALOR TOTAL (R$) * | número | default R$ 0,00 |
| QTD. PARCELAS (0 = pagamento único) | número | default 1 |
| OBS. PARCELAS | texto | placeholder "Ex: mensais a partir de..." |
| PARCELAS (tabela) | inline | colunas: # \| ATIVIDADE/EVENTO \| VALOR (R$) \| DATA PREVISTA \| 🗑️ |

> Parcelas têm apenas DATA PREVISTA — sem campo de DATA EFETIVA de pagamento no formulário inicial. A confirmar se aparece em outra fase do FSM.

#### Seção 7 · DOCUMENTOS DO PROCESSO
- Guia textual: "Documentos obrigatórios: **Contrato/Termo** (instrução) · **RPA ou NF** (instrução/execução) · **Comprovante de pagamento** (conclusão)"
- Botão "📎 Adicionar Documento"
- Botão final: "💾 Salvar Rascunho"

> **Mapeamento de documentos por fase FSM** confirmado:
> - fase instrução → Contrato/Termo
> - fase execução → RPA ou NF
> - fase conclusão → Comprovante de pagamento
>
> Este é o mecanismo de rastreio de execução financeira: o NF e o comprovante de pagamento são anexados como documentos nas fases correspondentes. Quando concluída com comprovante vinculado à rubrica, a contratação fecha o ciclo previsto→executado. A confirmar se o Financeiro exibe esses dados consolidados.

### Regra de negócio capturada — Nº Esboço
> Fluxo esperado pelo usuário:
> 1. Ao criar nova solicitação, sistema **gera automaticamente** um número interno de esboço (ex: ESB-2025-047)
> 2. Esse número identifica o processo internamente até receber numeração oficial
> 3. Quando o processo recebe número oficial (SEI, protocolo do órgão, etc.), o campo é **editado** para refletir a numeração oficial
> 4. O número de esboço deve ser preservado internamente como referência histórica — o campo edita o que é exibido, não apaga a origem

### Problemas confirmados ⚠️

**CON-01** `🟡 Média` — Campo SETOR SOLICITANTE é texto livre (placeholder "Ex: Produção") — instância do mesmo anti-padrão sistêmico de campos de setor (CHV-06, EMP-03, TAR-02, ADM-03). Deve ser dropdown com setores cadastrados

**CON-02** `🟡 Média` — Nº Esboço / Processo não é pré-preenchido automaticamente — campo inicia vazio, exigindo digitação manual. Comportamento esperado: sistema gera o número de esboço automaticamente na abertura do formulário (padrão ESB-AAAA-NNN ou similar), editável para inserir a numeração oficial posterior. Ver regra de negócio acima.

**CON-03** `🔴 Alta` — **META no Vínculo Financeiro exibe IDs técnicos internos** — ao selecionar o Contrato de Gestão, o dropdown de META carrega 3 opções com IDs do tipo `meta_1779864069321_40rkibz`, `meta_1779927383665_d91cioy`, `meta_1780177068206_ca22b03` — em vez dos nomes legíveis ("Meta 01 — Ação Cultural", "Custeio Operacional", "Meta 02 — NArTE"). O campo é praticamente inutilizável — ninguém consegue identificar qual meta selecionar sem conhecer os IDs internos. O campo deve resolver o nome da meta a partir do ID.

**CON-04** `🔴 Alta` — **RUBRICA / ITEM DE CUSTEIO não carrega após selecionar a meta** — o dropdown de Rubrica permanece vazio (apenas placeholder "— Selecione a Rubrica —") mesmo após a meta ser selecionada. A cascata está incompleta: Contrato → Meta carrega (mesmo que com IDs ilegíveis), mas Meta → Rubrica não carrega. Consequência: é **impossível vincular uma contratação a uma rubrica específica** do Plano de Trabalho. O elo entre execução (Contratações) e planejamento (Financeiro) está inoperante.

> **Impacto sobre FIN-11:** a arquitetura de execução financeira existe (Contratações referencia Financeiro via Contrato→Meta→Rubrica), mas está quebrada em dois pontos — IDs ilegíveis nas metas e dropdown de rubricas vazio. O tracking de execução financeira está não apenas ausente na visão do Financeiro (FIN-11), mas o mecanismo de entrada também está inoperante (CON-03 + CON-04).

### Regra de negócio capturada — Modelo de contratação do CCBJ

> **O CCBJ não conduz pregões licitatórios próprios.** Utiliza atas de preços pré-aprovadas ("Atas de Registro de Preços") de processos licitatórios conduzidos por órgãos externos (secretaria estadual, município, órgão central de compras).
>
> **Fluxo completo de pregão no CCBJ — 3 etapas:**
> 1. **Solicitação de abertura de pregão** — CCBJ identifica necessidade e solicita formalmente a um órgão externo que conduza o processo licitatório. O CCBJ não conduz o pregão, apenas solicita a abertura.
> 2. **Acompanhamento e cadastro** — após o órgão externo conduzir o pregão e aprovar a ata, o CCBJ registra no sistema o pregão aprovado (número, itens, preços, vigência, saldos, fornecedores vencedores).
> 3. **Utilização da ata** — CCBJ consulta o pregão cadastrado, seleciona item disponível e abre Solicitação de Contratação com dados pré-preenchidos da ata. O saldo vai sendo consumido a cada contratação.
>
> **Funcionalidade necessária — Aba "Pregões Ativos"** (substituindo "Habilitações"):
> - Cadastro de pregões vigentes (número, órgão, vigência, itens)
> - Por pregão: lista de itens com código, descrição, preço unitário, quantidade total, saldo disponível, fornecedor vencedor
> - Botão "Solicitar Contratação" a partir de um item do pregão → abre formulário de Nova Solicitação pré-preenchido com dados do pregão
> - Alerta de vencimento de ata (proximidade do prazo de vigência)
> - Controle de saldo utilizado vs. disponível por item

### Comportamento confirmado — Tentativa de salvar (s15)

**Seção 5 — Vínculo Financeiro (confirmação visual):**
- CONTRATO DE GESTÃO: selecionado ✅ ("Contrato de Gestão CCBJ - 005/2")
- META: carregou com ID técnico "meta_1779864069321_40rkibz" — CON-03 reconfirmado ⚠️
- RUBRICA: permanece em "— Selecione a Rubrica —" mesmo com meta selecionada — CON-04 reconfirmado ⚠️

**Seção 6 — Parcelas:**
- Linha de parcela tem campos: # | ATIVIDADE/EVENTO (texto livre) | VALOR (R$) | DATA PREVISTA
- Campo "Atividade" não está vinculado às atividades do Plano de Trabalho do Financeiro — texto livre sem conexão com a hierarquia Meta → Atividade → Rubrica

**Resultado ao clicar "Salvar Rascunho":**
- Toast vermelho: **"Erro: lerJSON is not defined"**
- Solicitação não é salva — módulo completamente inutilizável para escrita

### Novos problemas confirmados ⚠️

~~**CON-08**~~ ✅ CORRIGIDO — `lerJSON()` adicionada como alias de `readJSON()` em `data_layer.gs`. A função era usada em ~40 lugares mas nunca definida.

**CON-09** `🔴 Alta` — **Campo "Atividade/Evento" nas parcelas é texto livre desvinculado** — as parcelas do cronograma têm campo de atividade como input livre (placeholder "Atividade"), sem conexão com as atividades reais do Plano de Trabalho do contrato (hierarquia Meta → Atividade → Rubrica no Financeiro). O sistema não consegue rastrear qual atividade do Plano de Trabalho cada parcela financia — rompendo o vínculo execução↔planejamento. Campo deveria ser select populado das atividades da meta/rubrica selecionada no Vínculo Financeiro.

### Perguntas abertas
*(Portal LGPD no subtítulo; Contratação concluída → Financeiro — bloqueado por CON-08)*

---

<a name="mod-35"></a>
## Módulo 35 — Reuniões
**Status:** ⚠️ PROBLEMA CONFIRMADO (testado visualmente em 2026-05-31 sessão 9)

### O que o código diz
- Backend completo: reuniao_repository.gs, reuniao_engine.gs, reuniao_controller.gs
- FSM: `agendada → confirmada → em_andamento → encerrada → ata_pendente → aprovada → arquivada / cancelada`
- View `#view-reunioes` referenciada
- GAS namespace completo: listar, obter, metricas, listarEncaminhamentos, salvar, mudarStatus, salvarAta, submeterAta, aprovarAta, adicionarEncaminhamento, concluirEncaminhamento ✅

### Estrutura visual confirmada — View principal (sessão 2026-05-31 s9)

**Header:** `h1.view-title` "Reuniões" + `p.view-subtitle` "Atas, encaminhamentos e deliberações institucionais" → padrão "Nova" correto ✅

**MÉTRICAS** (MetricsToggle ✅): 6 cards — Total (0) | Agendadas (0) azul | Em Andamento (0) laranja | Encerradas (0) verde | Enc. Pendentes (0) laranja | Enc. Vencidos (0) vermelho
- 5 cards na primeira linha + **"Enc. Vencidos" isolado na segunda linha** → layout quebrando ⚠️ REU-01

**2 abas**: Lista (ativa) | Encaminhamentos ✅

**Toolbar** (padrão Nova): busca "Buscar por título…" + select "Todos os status" + botão refresh ✅

**Estado vazio**: "Nenhuma reunião encontrada." ✅ (base sem dados — todos os contadores zerados)

**Console**: ▲5 avisos + 101 issues (Warden — extensão do browser, não da aplicação) — sem TypeErrors ✅

### Estrutura visual confirmada — Modal "Nova Reunião" (5 abas — sessão 2026-05-31 s9)

**Estrutura do modal:**

| Componente | Classe/comportamento | Status |
|---|---|---|
| Overlay | fundo escuro (boa opacidade) | ✅ |
| Caixa | fundo branco opaco | ✅ |
| Título | `h2` "Nova Reunião" | ✅ |
| Botão ✕ | presente, fecha modal | ✅ |
| 5 abas internas | Dados \| Pauta \| Presença \| Ata \| Encaminhamentos | ✅ |
| Botões rodapé | Fechar (cinza) + Salvar (roxo) | ✅ |

#### Aba Dados — campos mapeados

| Campo | Tipo | Observação | Status |
|---|---|---|---|
| Título * | text full-width | label simples (sem `form-label`) | ✅ funcional |
| Tipo | select (Ordinária / Extraordinária / Comitê / Workshop) | — | ✅ |
| Data e Hora * | datetime-local | — | ✅ |
| Duração (min) | number, default 60 | — | ✅ |
| Local | text "Sala / Online" | texto livre — correto para este campo | ✅ |
| Convocado por (email) | email input livre | anti-padrão sistêmico: deveria ser autocomplete de usuários | ⚠️ REU-02 |
| Ação vinculada (ID opcional) | text "ACAO-001" (placeholder) | texto livre frágil — já registrado ACO-21 | ⚠️ ACO-21 |

**Layout de campos:**
- L1: Título * (full width) ✅
- L2: Tipo | Data e Hora * → ⚠️ Tipo (qualitativo) ao lado de Data (temporal) — mais coerente seria Tipo | Local na mesma linha → REU-03
- L3: Duração (min) | Local ✅
- L4: Convocado por (full width) ✅
- L5: Ação vinculada (full width) ✅

#### Aba Pauta ✅
- Input "Item da pauta..." + botão "+ Adicionar"
- Sem estado vazio de lista (quando lista está vazia não exibe "Nenhum item" — área em branco) ⚠️ REU-04

#### Aba Presença ✅
- Input email "email@dominio.com" + botões "+ Presente" e "+ Ausente Justif."
- Ambos os botões com aparência visual idêntica (sem distinção de cor/estilo entre Presente e Ausente) ⚠️ REU-05
- Email de responsável é texto livre (anti-padrão) ⚠️ REU-02b

#### Aba Ata ✅
- Textarea grande "Redigir ata da reunião…" ✅
- 2 botões: "💾 Salvar Rascunho" (cinza) + "🏛️ Submeter para Aprovação" (roxo)
- **Emojis nos botões** → violação do padrão DS (proibição explícita no feedback) ⚠️ REU-06
- Deveriam usar Material Symbols (`<span class="ms">save</span>` etc.)

#### Aba Encaminhamentos ✅
- 3 campos horizontais comprimidos: "Texto do encaminhamento…" | "Responsável (email truncado)" | datepicker "dd/mm/aaa…" + botão "+ Adicionar"
- Layout apertado — campos truncam (especialmente o datepicker) ⚠️ REU-07
- Campo Responsável é email livre (anti-padrão) ⚠️ REU-02c

### Gap crítico de FSM — UI incompleta vs. backend

> O backend define 7+ estados: `agendada → confirmada → em_andamento → encerrada → ata_pendente → aprovada → arquivada / cancelada`
>
> A UI exibe apenas 5 no filtro: rascunho | agendada | em_andamento | encerrada | cancelada
>
> **Estados ausentes na UI**: `confirmada`, `ata_pendente`, `aprovada`, `arquivada`
>
> **Impacto**: reuniões que atingem `ata_pendente`, `aprovada` ou `arquivada` no backend ficam invisíveis para o filtro. Os cards na lista também não têm botões de ação para esses estados — reunião encerrada não tem botão "Submeter Ata" na lista.

**REU-08** `🔴 Alta` — FSM da UI incompleto: filtro de status e botões de ação nos cards cobrem apenas 5 dos 7+ estados do backend (`confirmada`, `ata_pendente`, `aprovada`, `arquivada` ausentes). Reuniões nesses estados ficam invisíveis para o usuário na lista.

### Problemas confirmados ⚠️

**REU-01** `🟡 Média` — 6 cards de métricas quebram em 2 linhas — 5 na 1ª linha + "Enc. Vencidos" isolado na 2ª. O stats-strip não acomoda 6 itens numa linha. Solução: reduzir para 5 cards (fundir Enc. Pendentes + Enc. Vencidos num só card "Encaminhamentos" com breakdown) ou ajustar o grid.

**REU-02** `🟡 Média` — "Convocado por (email)" é texto livre — anti-padrão sistêmico recorrente (mesmo problema de TAR-02, CHV-05, ACO-14, PES-02). Deveria ser autocomplete/select de usuários do sistema.

**REU-03** `🔵 Baixa` — Layout da aba Dados: Tipo ao lado de Data e Hora. Mais coerente seria Tipo | Local (mesma natureza qualitativa); Data e Hora | Duração (mesma natureza temporal).

**REU-04** `🔵 Baixa` — Aba Pauta sem estado vazio de lista — quando nenhum item foi adicionado, a área abaixo do input fica em branco sem "Nenhum item de pauta adicionado". Padrão: todas as listas do sistema exibem mensagem de estado vazio.

**REU-05** `🟡 Média` — Aba Presença: botões "+ Presente" e "+ Ausente Justif." têm aparência visual idêntica, sem distinção de cor/estilo. Semântica oposta (presença positiva vs. ausência) deveria ser visualmente diferenciada — verde/primário para Presente, cinza/secundário para Ausente.

**REU-06** `🟡 Média` — Aba Ata: botões usam emojis (💾 Salvar Rascunho, 🏛️ Submeter para Aprovação) — violação do padrão DS. Usar Material Symbols como `<span class="ms">save</span>` e `<span class="ms">send</span>`.

**REU-07** `🟡 Média` — Aba Encaminhamentos: layout horizontal com 3 campos + botão na mesma linha — campos truncam. Layout mais adequado: campo de texto em full-width na linha 1; responsável + prazo + botão na linha 2.

**REU-08** `🔴 Alta` — FSM da lista incompleto: filtro de status e ações dos cards não cobrem `confirmada`, `ata_pendente`, `aprovada`, `arquivada` — estados definidos no backend mas invisíveis na UI.

### Regra de negócio capturada — Aprovação de Ata

> **Modelo desejado:** após redigir e submeter a ata, os **participantes da reunião** confirmam individualmente que o conteúdo está correto. A ata só é considerada aprovada quando os participantes confirmam.
>
> **Gap atual:** o sistema implementa um modelo de **aprovador único** — um botão "Aprovar Ata" em poder de uma pessoa. Isso não suporta confirmação coletiva por participante.
>
> **O que está faltando:**
> 1. Notificação automática aos participantes quando a ata é submetida
> 2. Mecanismo individual de confirmação por participante (cada um confirma separadamente)
> 3. Rastreamento de quem confirmou e quem está pendente
> 4. Regra de aprovação: todas as confirmações necessárias? Maioria? Prazo com aprovação automática?
> 5. Fluxo para quando um participante discorda — devolve para edição ou apenas registra ressalva?
> 6. Visão de "atas pendentes de minha confirmação" para cada participante (candidato: Meu Centro / TaskHub)

**REU-09** `🔴 Alta` — **Aprovação de ata é single-approver, não multi-participante** — o sistema tem um único botão "Aprovar Ata" para um único responsável. O modelo desejado é de confirmação coletiva: cada participante da reunião confirma individualmente que a ata está correta. Gap exige: notificações por participante, rastreamento de confirmações individuais, regra de fechamento automático ou manual da aprovação.

### Regra de negócio confirmada — Discordância de ata

> **Modelo: não-bloqueante com possibilidade de correção pontual**
>
> - A ata pode ser aprovada mesmo com participantes pendentes ou com ressalvas
> - Discordância é registrada formalmente como ressalva do participante
> - O redator da ata pode fazer uma **correção pontual** e renotificar especificamente o participante que discordou
> - Esse participante então reavalia e pode confirmar a versão corrigida
> - Resultado possíveis: aprovada integralmente | aprovada com ressalvas registradas | aprovada com correção aceita pelo participante específico
>
> **Gap adicional que isso revela:** o sistema precisa de rastreamento por participante com estado individual: `pendente | confirmado | discordante | confirmou_após_correção`
>
> **Trigger de notificação confirmado:** ao clicar "Submeter para Aprovação", o sistema deve **alertar automaticamente todos os participantes** para validarem a ata — sem isso, os participantes nunca sabem que há algo para confirmar.

### Integração com IA — estrutura especializada para atas (confirmado sessão 9)

> **Princípio:** IA auxilia, não substitui. O redator decide o que aceitar. Paralelo direto ao modelo de IA do módulo RECE.

#### Modos de IA para a aba Ata

| Modo | Trigger | Input | Output |
|---|---|---|---|
| **Gerar Rascunho** | botão "Gerar com IA" antes de começar a escrever | Pauta (itens cadastrados) + lista de participantes + metadados (data, hora, local, tipo, convocador) | Rascunho estruturado da ata no formato institucional |
| **Revisar Linguagem** | botão "Revisar com IA" ao lado da textarea | Texto atual da ata | Sugestão de texto com: linguagem formal, gramática correta, clareza deliberativa |
| **Extrair Encaminhamentos** | botão "Extrair Encaminhamentos" após redigir | Texto completo da ata | Lista de encaminhamentos identificados automaticamente — cada um com: texto, responsável (se mencionado), prazo (se mencionado) → população automática da aba Encaminhamentos |

#### Estrutura formal de uma ata (modelo para a IA)

```
1. ABERTURA — data, hora, local, convocador, quórum
2. PARTICIPANTES — presentes e ausentes justificados
3. VERIFICAÇÃO DE PAUTA — itens aprovados/alterados
4. DELIBERAÇÕES — por item de pauta:
   - Discussão resumida
   - Decisão tomada
   - Votação (se houver)
   - Encaminhamentos derivados
5. ENCAMINHAMENTOS GERAIS — lista consolidada
6. ENCERRAMENTO — hora, próxima reunião (se definida)
```

#### Gap adicional que isso revela

**REU-10** `🔴 Alta` — **Aba Ata sem auxílio de IA** — atualmente é apenas uma textarea em branco sem nenhuma assistência. O modelo desejado requer: (a) geração de rascunho estruturado a partir de pauta e participantes; (b) revisão de linguagem formal; (c) extração automática de encaminhamentos do texto para popular a aba Encaminhamentos sem digitação manual repetida.

**REU-11** `🟡 Média` — **Ata sem estrutura guiada** — a textarea livre não orienta o redator sobre os blocos obrigatórios de uma ata formal (abertura, deliberações por item de pauta, encaminhamentos, encerramento). Mesmo sem IA, um template pré-estruturado reduziria erros de omissão.

### Decisão arquitetural confirmada — Meu Centro como hub unificado (sessão 12)

> **Tarefas é absorvido integralmente pelo Meu Centro. O módulo "Tarefas" desaparece da sidebar.**
>
> **Meu Centro (TaskHub)** é o único ponto de entrada de trabalho pessoal do sistema — agrega em uma lista priorizada por urgência/prazo:
> - Tarefas atribuídas ao usuário (criadas por qualquer pessoa do sistema)
> - Aprovações pendentes para o papel do usuário
> - Encaminhamentos de reuniões pendentes (ReuniaoRepository)
> - Demandas de comunicação como executor (BalcaoRepository)
> - Alertas não lidos (AlertasEngine)
> - Aniversariantes do dia (+ 7 dias de antecedência para RH/gestores)
>
> **Meu Time** (aba do Meu Centro): visão gestora das tarefas de todo o setor/equipe — com criação e atribuição a outros. Usuários não-gestores também podem atribuir tarefas a outras pessoas.
>
> **Task Federation Universal:** qualquer entidade do sistema que tenha campo "responsável" atribuído gera automaticamente um item no Meu Centro daquele responsável, independentemente do módulo de origem. Ver detalhe completo na seção mod-38.

**REU-12** `🟡 Média` — **Meu Centro sem botão de criação de tarefa** — com o módulo Tarefas absorvido, toda criação e atribuição acontece no Meu Centro; header atual tem apenas "Atualizar". Ver HUB-08.

**REU-13** `🟡 Média` — **Encaminhamentos sem notificação ao responsável** — ao adicionar encaminhamento com responsável designado, esse responsável precisa receber alerta (notificação no sistema + badge no Meu Centro). O backend já agrega encaminhamentos no TaskHub — falta o trigger de notificação no momento da criação.

### Perguntas abertas
- Existe prazo padrão para participantes confirmarem a ata, com aprovação automática após o prazo?

---

<a name="mod-38"></a>
## Módulo 38 — Meu Centro / TaskHub
**Status:** ⚠️ PROBLEMA CONFIRMADO (testado visualmente em 2026-05-31 s12)

### O que o código diz
- View `#view-taskhub` referenciada; GAS namespace: `TaskHubService` (agrega tarefas, encaminhamentos, demandas de Balcão)
- 3 abas: Meu Dia | Meu Time | Produtividade
- Previsto agregar: TarefaRepository, ReuniaoRepository (encaminhamentos), BalcaoRepository, AlertasEngine

### Estrutura visual confirmada (sessão 2026-05-31 s12)

**Header:** `h1` "TaskHub — Meu Centro de Controle" + `p.view-subtitle` "Todas as suas pendências em um só lugar, priorizadas por urgência"
**Botão:** "⟳ Atualizar" (`btn-primary`) + **3 abas**: Meu Dia | Meu Time | Produtividade
**Console:** ▲5 avisos + 101 Issues (todos Warden — não da aplicação) ✅

#### Aba Meu Dia
- Estado vazio com emoji 🎉 "Tudo em dia! / Nenhuma pendência no momento."
- Sem nenhuma tarefa, aprovação ou encaminhamento listado

#### Aba Meu Time
- Estado vazio textual: "Nenhuma pessoa com tarefas ativas."
- Sem ícone, sem explicação do propósito da aba

#### Aba Produtividade
- Filtro: "Período" (select "30 dias")
- 5 cards de métricas: **Concluídas (0)** | **No Prazo (0)** | **Taxa On-Time (0%)** | **Tempo Médio (0h)** | **Dias Médios (0d)**
- Cards com borda visível e unidades embutidas no valor — formato diferente do stats-strip padrão

### Decisões arquiteturais confirmadas (s12)

> **Tarefas absorvido no Meu Centro** — módulo "Tarefas" desaparece da sidebar.
> - **Meu Dia:** inbox pessoal unificado — tarefas atribuídas a mim + aprovações que preciso dar + encaminhamentos de reuniões + demandas de Balcão + alertas não lidos + aniversariantes
> - **Meu Time:** visão gestora — tarefas das pessoas do setor com criação/atribuição; usuários não-gestores também podem atribuir tarefas a outras pessoas
> - **Produtividade:** métricas pessoais (concluídas, taxa on-time, tempo médio)
>
> **Task Federation Universal** — qualquer entidade com campo "responsável" atribuído gera item no Meu Centro do responsável:
>
> | Fonte | Campo responsável | Tipo de item gerado |
> |---|---|---|
> | Tarefas | responsável | "Fazer tarefa atribuída" |
> | Aprovações | habilitador / admin | "Aprovar/rejeitar solicitação" |
> | Encaminhamentos (Reuniões) | responsável | "Executar encaminhamento" |
> | Balcão de Comunicação | executor | "Produzir material" |
> | Ações Culturais | responsável | "Coordenar ação" |
> | Reservas | co-responsável | "Acompanhar reserva" |
> | Contratações | responsável | "Avançar processo" |
> | Empréstimos / Chaves | responsável | "Devolver no prazo" |
> | Almoxarifado | separador | "Separar e entregar" |
>
> **Navegação:** Home posição #1 (painel institucional) · Meu Centro posição #2 (inbox pessoal para todos os papéis)
>
> **Aniversariantes:**
> - Todos os usuários: aniversariantes do dia — informativo, para parabenizar
> - RH + Gestores: aniversariantes com 7 dias de antecedência → botão "Registrar dayoff" → abre Afastamentos pré-preenchido (tipo "Dayoff de Aniversário", data = aniversário do colaborador)
> - Dayoff é **benefício automático garantido** — RH apenas registra, não decide
> - Ponto: ausência tipo "Dayoff de Aniversário" gerada automaticamente na data

### Problemas confirmados ⚠️

~~**HUB-01**~~ ✅ CORRIGIDO s17 Fase 41 — Aba Produtividade sem MetricsToggle — único módulo com cards numéricos múltiplos fora do padrão obrigatório.

~~**HUB-02**~~ ✅ CORRIGIDO s17 Fase 41 — Estado vazio do Meu Dia usa emoji 🎉 — violação do padrão DS. Usar Material Symbol.

**HUB-03** `🔴 Alta` — Meu Dia não agrega pendências — propósito declarado ("todas as suas pendências em um só lugar") não cumprido. Nenhuma das fontes planejadas está integrada.

~~**HUB-04**~~ ✅ CORRIGIDO s17 Fase 41 — Aba Meu Time com estado vazio textual simples — sem ícone, sem explicação do propósito. Padrão: ícone + título + subtítulo orientador.

**HUB-05** `🔵 Baixa` — Cards de Produtividade com unidades embutidas no valor ("0h", "0d") — inconsistência com padrão do sistema.

~~**HUB-06**~~ ✅ CORRIGIDO s17 Fase 41 — "TaskHub" exposto na UI — nome interno de desenvolvimento vaza. Rótulo público: "Meu Centro de Controle" (ou apenas "Meu Centro").

**HUB-07** `🔴 Alta` — Integração de fontes não implementada — TaskHubService agrega dados no backend mas as views não exibem os itens.

**HUB-08** `🔴 Alta` — Sem botão de criação de tarefa — com Tarefas absorvido, necessário "+ Nova Tarefa" com picker de responsável (não texto livre), prioridade, prazo e vínculo com Ação/Reserva.

**HUB-09** `🔴 Alta` — Aba Meu Time subutilizada — deveria mostrar colaboradores do setor com suas tarefas agrupadas, status por pessoa e indicador de sobrecarga.

~~**HUB-10**~~ ✅ CORRIGIDO s17 Fase 41 — Cards de Produtividade com formato divergente do stats-strip padrão (borda visível, sem toggle).

**HUB-11** `🔴 Alta` — Modelo de dados heterogêneo necessário — cada item do Meu Dia precisa carregar: tipo de origem, ID da entidade, ação requerida, prazo, prioridade derivada. Clicar deve navegar diretamente à entidade no módulo de origem.

**HUB-12** `🔴 Alta` — Sem seção de aniversariantes — todos devem ver no dia; RH/gestores devem ver com 7 dias de antecedência.

**HUB-13** `🔴 Alta` — Sem workflow de dayoff automático — falta tipo "Dayoff de Aniversário" em Afastamentos + geração automática de ausência no Ponto.

**SIS-13** `🔴 Alta — BLOQUEADOR` — Campos "responsável" como texto livre inviabilizam a Task Federation Universal. Pré-condição: converter TAR-02, CHV-05, ACO-14, REU-02/b/c, EMP-03, CON-01, PES-02 para pickers de usuário.

### Rastreador de testes — Meu Centro
| Item | Status | Sessão |
|---|---|---|
| View carrega sem erro | ✅ | 2026-05-31 s12 |
| 3 abas visíveis (Meu Dia / Meu Time / Produtividade) | ✅ | 2026-05-31 s12 |
| Meu Dia — estado vazio | ✅ (com HUB-02, HUB-03) | 2026-05-31 s12 |
| Meu Time — estado vazio | ✅ (com HUB-04) | 2026-05-31 s12 |
| Produtividade — 5 cards | ✅ (com HUB-01, HUB-05, HUB-10) | 2026-05-31 s12 |
| Meu Dia com dados reais (tarefas / aprovações) | 🔲 pendente (depende de SIS-13) | — |
| Aniversariantes no Meu Dia | 🔲 pendente (depende de PES-16) | — |
| Botão criação de tarefa | 🔲 não existe ainda (HUB-08) | — |

---

<a name="mod-34"></a>
## Módulo 34 — Reserva de Veículo
**Status:** ⚠️ PROBLEMA CONFIRMADO (s13)

### O que o código diz
- View própria (`view-reservas-carro`) acessível como item separado na sidebar
- 2 modos de view: Lista | Agenda (calendário mensal)
- FSM: `PENDENTE → APROVADA / RECUSADA` → `APROVADA → CONCLUÍDA / CANCELADA`
- Aprovação obrigatória por `infraestrutura / gestor / admin / superadmin`
- Notificação por email (GmailApp) ao criar solicitação para todos os aprovadores infra
- Campos do formulário: Data, Setor (select ✅), Hora Saída, Hora Chegada, Passageiros (texto livre), Vincular a Ação, Local Saída, Local Chegada, Observação
- Botão "+" em cada célula da agenda para criação rápida por data
- **Motorista**: feature configurável — desativada por padrão; quando ativa, cadastro de N motoristas (nome + disponibilidade) + campo de seleção no formulário
- **Veículos**: feature configurável — desativada por padrão; quando ativa, cadastro de N veículos (modelo, placa, demais informações) + campo de seleção no formulário; sem veículo registrado por padrão = solicitante usa frota não especificada
- **Sem campo de veículo** — sistema assume frota de 1 veículo único

### Estrutura visual confirmada — Vista Lista
- `[view-header]` ícone `directions_car` + "Reserva de Veículo" + subtítulo ✅
- Botão "+ Nova Reserva" (`btn-primario` roxo) ✅
- Seção "MÉTRICAS" com MetricsToggle colapsável ✅ — 4 cards: Pendentes | Aprovadas | Concluídas | Total (sem Recusadas/Canceladas — CAR-03)
- Toggle modos: Lista (ativo, sublinhado) | Agenda — indicação visual de aba ativa ✅
- Filter bar: select status + date input ("dd/mm/aaaa") + refresh ✅
- Card de reserva real (APROVADA): `2026-05-29 | joao.barros@idm.org.br | badge APROVADA verde | 03:18–05:18 | A → B | Aprov: joao.barros | botões Concluir + Cancelar`

### Estrutura visual confirmada — Vista Agenda
- Grade mensal "Maio 2026" com navegação < > ✅
- 7 colunas (Seg–Dom) com "+" em cada célula para criação rápida ✅
- Reserva plotada em verde na célula do dia 29: "03:18 joao.barro" (texto truncado) ✅

### Estrutura visual confirmada — Modal de Detalhes (clique na agenda)
- Título: "Reserva de Veículo" (sem ícone)
- Badge APROVADA verde ✅
- DATA: 2026-05-29 (formato ISO — CAR-05 / SIS-14)
- HORÁRIO: 03:18 – 05:18
- SOLICITANTE: joao.barros@idm.org.br (email em vez de nome — CAR-06)
- ROTA: ícone O "A" → ícone 📍 "B" — visualização com ícones de mapa ✅
- APROVADO POR: joao.barros@idm.org.br (email em vez de nome — CAR-07)
- Botões: Concluir | Cancelar
- **Ausente no modal**: setor, passageiros, observação, ação vinculada (CAR-08)

### Estrutura visual confirmada — Modal Formulário "Nova Reserva"
- Grid 2 colunas: DATA DA VIAGEM * (datepicker) | SETOR / EQUIPE (select integrado ✅)
- HORA DE SAÍDA * | HORA DE CHEGADA *
- PASSAGEIROS: texto livre "Nomes separados por vírgula" (CAR-09)
- VINCULAR A UMA AÇÃO: select persistindo em "— Carregando ações... —" (CAR-04)
- LOCAL DE SAÍDA * | LOCAL DE CHEGADA (DESTINO) *: text input + 2 ícones sem tooltip (🌐 = geolocalização, 📍 = pin no mapa) — sem paradas intermediárias (CAR-10)
- OBSERVAÇÃO: textarea
- Botões: Cancelar | "▶ Enviar Solicitação" (`btn-primario`)

### Comportamento confirmado ✅
- Módulo carrega sem erros (console: Warden apenas) ✅
- Vista Lista com card e FSM operacional ✅
- Vista Agenda com reserva plotada ✅
- Modal de detalhes abre ao clicar na reserva ✅
- Setor é select integrado ✅ (exceção positiva vs outros módulos com texto livre)
- Vínculo com Ação Cultural no formulário ✅

### Regras de negócio capturadas
> **Passageiros**: podem ser internos (colaboradores — picker com autocomplete da base de usuários) ou externos (nome livre). O formulário atual não distingue. Confirmado pelo usuário.
> **Paradas intermediárias**: viagens com múltiplas paradas (CCBJ → Secretaria → Prefeitura → CCBJ) não são representáveis — o formulário tem apenas Local Saída e Local Chegada. Gap confirmado pelo usuário.
> **Data/hora passada**: não deve ser possível criar reserva em data ou hora já decorrida. Validação existe apenas no backend de Infraestrutura (ESP-17); no módulo de Veículo não foi implementada. Confirmado pelo usuário.
> **Voucher Uber**: além do veículo institucional, o sistema deve suportar solicitação de voucher Uber — vinculado à rubrica de transporte do setor solicitante, com aprovação do gestor responsável e/ou gestor financeiro, retorno com link do voucher enviado por email. Confirmado pelo usuário.
> **Datas no sistema**: todas as datas devem seguir o padrão pt-BR (DD/MM/AAAA) em toda a UI. Confirmado pelo usuário — SIS-14 sistêmico.

### Perguntas pendentes
- ~~**Motorista**: quem conduz o veículo?~~ **RESPONDIDO** — feature configurável, off por padrão. Quando ativada: CRUD de motoristas (nome + quantidade) + campo de seleção no formulário. Padrão: solicitante é o condutor.
- ~~**Self-approval e aprovadores**~~ **RESPONDIDO** — Superadmin aprova qualquer coisa = intencional ✅. Infra aprovada por: papel `infraestrutura` (sempre) | `gestor`/`admin` vinculados ao setor Infraestrutura | `superadmin`. Código atual não verifica setor para gestor/admin → CAR-15.
- **Frota**: quantos veículos o CCBJ tem? Sistema assume 1 único.
- **Self-approval**: joao.barros (superadmin?) aprovou a própria reserva — intencional para papéis admin ou gap de governança?

### Problemas confirmados ⚠️
Ver CAR-02 a CAR-13 e SIS-14 na tabela de problemas.

---

<a name="mod-25"></a>
## Módulo 25 — Acervo Digital
**Status:** 🔍 EM ANÁLISE (s14)

### O que o código diz
- View `#view-acervo` — item da sidebar no grupo MEMÓRIA (`modulo:'ACOES'`, sem flag `inativo`)
- Backend namespace: `GAS.acervo` — listar, listarPorAcao, checklist, metricas, registrar, atualizar, statusLGPD, excluir, exportarZip
- Galeria em grid `auto-fill minmax(200px,1fr)` — sem modo lista
- 7 tipos: Foto, Vídeo, Release, Poster, Folder, Ata, Outro
- 4 status LGPD: não_verificado, autorizado, restrito, sem_pessoas
- Formulário: Tipo, Ação vinculada* (obrigatório), URL Drive, Descrição, Tags, Status LGPD
- Salvar exige `acaoId` presente — arquivo sem ação vinculada é bloqueado com Toast.aviso

### Estrutura visual confirmada — View principal (s14)
- `[view-header]` ícone 🖼️ + `h2.view-titulo` "Acervo Digital" — padrão misto (SIS-05)
- Botão "+ Adicionar Arquivo" (`btn-primary`, roxo) ✅
- **2 stat-cards** sem MetricsToggle: "—" Arquivos | "—" Pendentes LGPD (vermelho)
- Filtros inline (sem classe DS): select "Todos os tipos" + select "Status LGPD" + input "Buscar..."
- Galeria: **"Carregando..."** — nunca resolve ⚠️ ACV-01
- Console: ▲5 avisos + 101 Issues (Warden) — sem TypeErrors ✅

### Estrutura visual confirmada — Modal "Adicionar ao Acervo" (s14)
- Overlay escuro ✅; caixa fundo branco opaco ✅
- Campos: Tipo * (📷 Foto default), Ação vinculada * (vazio — "Selecione..."), URL (Drive), Descrição, Tags, Status LGPD (⚠️ Não verificado)
- Botão Cancelar: **rosa/pink** ⚠️ ACV-02; Botão Salvar: roxo ✅
- Sem campo de nome/título próprio do arquivo ⚠️ ACV-08

### Problemas confirmados ⚠️

**~~ACV-01~~** ~~`🔴 Alta`~~ — ~~Galeria em "Carregando..." permanente~~ **CORRIGIDO s16 Fase 7**: adicionado error handler explícito em `AcervoUI.carregar()` — falha de backend agora exibe mensagem de erro no DOM em vez de silêncio. Causa raiz (backend) pode persistir — testar.

~~**ACV-02**~~ ✅ CORRIGIDO s17 Fase 43 — **Botão "Cancelar" no modal com cor rosa/pink** — instância de ESC-07/BAL-13 (terceira cor de botão não prevista no DS; deveria ser `btn-secondary` cinza).

~~**ACV-03**~~ ✅ CORRIGIDO s17 Fase 43 — **Stats-strip sem MetricsToggle** — 2 cards presentes mas sem o componente obrigatório de toggle/colapso. Instância de HUB-01.

**ACV-04** `🟡 Média` — **Sem botão refresh nos filtros** — instância de ACO-15 (Ações tem o mesmo problema).

**ACV-05** `🟡 Média` — **Filtros sem classe DS** — bloco de filtros usa apenas `style="display:flex;gap:8px;..."` inline; não usa `filter-bar` nem `toolbar`. Instância de SIS-06.

**ACV-06** `🟡 Média` — **Cabeçalho usa padrão misto** — `h2.view-titulo` (13px, ícone colorido) em vez de `h1.view-title` — instância de SIS-05/ACO-11.

**ACV-07** `🔴 Alta` — **Select "Ação vinculada" vazio no modal** — populate via `GAS.acoes.listar()` provavelmente afetado pela mesma falha de carregamento de ACV-01; usuário não consegue selecionar nenhuma ação; como `acaoId` é obrigatório para salvar, o módulo é inutilizável também para escrita.

**ACV-08** `🔴 Alta` — **Arquivo sem campo de nome/título** — o formulário não tem campo "Nome" ou "Título" para identificar o arquivo. O card na galeria exibirá apenas tipo + descrição truncada — sem identificador textual próprio.

**ACV-09** `🟡 Média` — **Emojis nos selects de tipo** — opções "📷 Foto", "🎬 Vídeo", etc. nos selects do filtro e do formulário. Padrão anti-DS (sem emojis em elementos de UI); usar labels simples ou Material Symbol fora do select.

**ACV-10** `🟡 Média` — **Formulário com estilos 100% inline** — todos os labels, inputs e selects do modal usam `style="..."` direto, sem `form-label`, `form-input`, `form-control` ou qualquer classe DS. Pior que ACO-12 (que ao menos usava `class="input"`).

### Regra de negócio capturada — Escopo do Acervo

> **Acervo é geral — dois tipos de conteúdo:**
> 1. **Ações finalísticas** — registros de ações culturais específicas (espetáculos, oficinas, eventos); devem poder ser vinculados a uma Ação Cultural
> 2. **Ações institucionais** — material da organização sem vínculo com ação específica (fotos do espaço, documentos históricos, materiais de comunicação avulsos)
>
> **Gap crítico:** o código atual exige `acaoId` obrigatório para salvar — arquivos institucionais não podem ser registrados. O campo "Ação vinculada" deve ser **opcional** com campo substituto de categorização/coleção para conteúdo institucional.

### Problemas adicionais confirmados

**ACV-11** `🔴 Alta` — **Campo "Ação vinculada" obrigatório inviabiliza conteúdo institucional** — `acaoId` é validado na função `salvar()` com `Toast.aviso('Selecione uma ação.')` quando ausente. Arquivos institucionais (fotos do espaço, documentos históricos, materiais avulsos) não podem ser registrados no acervo. O campo deve ser opcional: quando preenchido → vínculo com ação; quando vazio → conteúdo institucional com campo alternativo de categorização.

### Regra de negócio capturada — Fluxo LGPD do Acervo (s15)

> **Fluxo de verificação LGPD é feature configurável — desativada por padrão.**
>
> Comportamento padrão (feature off): campo "Status LGPD" é apenas informativo — qualquer usuário com acesso ao acervo pode preencher sem formalidade.
>
> Quando a feature é ativada em Configurações: existe um fluxo formal de verificação — responsável designado checa se as pessoas nas fotos/vídeos autorizaram o uso e atualiza o status formalmente. O mesmo padrão das features Motorista (CAR-12) e Veículos (CAR-14).
>
> **ACV-12** `🟡 Média` — Feature de verificação LGPD não está implementada no código atual além do campo informativo — quando ativada, precisará de: (a) campo de responsável designado por verificação; (b) histórico de quem verificou e quando; (c) notificação ao responsável quando novo arquivo sem verificação é adicionado.

### Perguntas abertas
- Quem tem acesso para adicionar/editar arquivos no acervo — apenas Comunicação, ou qualquer usuário?

---

<a name="mod-24"></a>
## Módulo 24 — Agentes Culturais
**Status:** ⚠️ PROBLEMA CONFIRMADO (s15 — acesso bloqueado por bug de sincronização)

### O que o Admin diz
- Descrição no Admin → Módulos: "Cadastro e gestão de agentes e produtores culturais"
- Status no Admin: **Ativo** (botão "Desativar" visível)

### Comportamento confirmado ✅ / ⚠️ (s15)
- Sidebar exibe badge **"inativo"** ao lado de "Agentes"
- Ao clicar no item da sidebar: toast "Módulo 'Agentes' está desativado." — acesso bloqueado
- Botão no header preso em **"Abrindo..."** após a tentativa (instância de SIS-09)
- Console: ▲5 avisos + 101 Issues (todos Warden) — sem TypeErrors

### Problemas confirmados ⚠️

**AGN-01** `🔴 Alta` — **Sincronização quebrada entre Admin → Módulos e estado efetivo da aplicação** — Admin registra "Agentes Culturais = Ativo" (botão "Desativar" visível), mas a sidebar exibe badge "inativo" e o clique é bloqueado com toast "Módulo 'Agentes' está desativado." Mesmo conflito observado para Voluntários (Ativo no Admin, badge inativo na sidebar). O estado configurado via Admin → Módulos não está sendo propagado corretamente para a aplicação. Relacionado a ADM-10 (toggles de Features inoperantes) — o problema de sincronização pode ser mais amplo: tanto Features quanto Módulos não aplicam o estado configurado.

### Descoberta adicional — lista completa de módulos (Admin → Aba Módulos, s15)
20 módulos visíveis, todos em status "Ativo":
`Administração | Dashboard Executivo | Tarefas | Estratégia | Pessoas/RH | Ponto Eletrônico | Escuta Institucional | Voluntários | Ações | Agentes Culturais | Público/Inscrições | Acervo | Financeiro | Parcerias | Infraestrutura | Reuniões | Comunicação | Balcão de Comunicação | TaskHub | Auditoria`

> Anteriormente documentado como "10+ módulos" — lista agora completa. Voluntários e Agentes Culturais aparecem como Ativos no Admin mas com badge "inativo" na sidebar — confirma AGN-01.

### Rastreador — Agentes Culturais
| Item | Status | Sessão |
|---|---|---|
| Sidebar badge "inativo" | ✅ AGN-01 CORRIGIDO s16 | 2026-06-01 |
| View carrega | 🔲 pendente (AGN-01 corrigido — testar) | — |
| Estrutura e campos | 🔲 pendente | — |

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

<a name="mod-12"></a>
## Módulo 12 — Infraestrutura — Almoxarifado / Estoque
**Status:** 🔍 EM ANÁLISE

### Contexto
Sistema externo **Estoque Fácil** (`estoque.ccbj.org.br`) está em uso ativo e será integrado ao ERP como módulo nativo. Análise baseada em 9 telas compartilhadas pelo usuário (sessão 2026-05-31).

### Estrutura visual do Estoque Fácil
**Sidebar:** 3 grupos — ITENS (Cadastrar novo item | Itens | Estoque) · SOLICITAÇÕES (Nova Solicitação | Solicitações em aberto | Solicitações Finalizadas | Solicitações Canceladas) · REGISTROS (Saídas | Entradas | Relatório de saída | Relatório de entrada)

**Telas identificadas:**
- `Estoque` — grade de cards por item com: código, situação, categoria, depósito, local, saldo total, valor unitário, unidade, crítico. Filtros: código, descrição, depósito, categoria, situação, crítico. Valor total geral (R$168k). Exporta PDF e planilha.
- `Itens` — mesmo conteúdo que Estoque, variação de view
- `Novo Item` — formulário: descrição*, referência, tamanho, cor, marca, situação (select), categoria (select), unidade de medida, visível para solicitantes (select), crítico (select). Painel lateral "Produtos semelhantes já cadastrados" com sugestões em tempo real
- `Nova Solicitação` — grade de cards de itens com saldo visível; painel lateral "Sua Solicitação" com: lista de itens selecionados, nome do solicitante (texto), setor destino (texto), subsetor destino (texto), botão "Enviar Solicitação"
- `Solicitações em Aberto` — duas seções: "Pendentes (Aguardando Separação)" e "Separadas (Pronto para Entrega)". Botões: "Finalizar entrega" + "Devolver"
- `Solicitações Finalizadas` — tabela: código, usuário criador, solicitante, setor, subsetor, data abertura, data finalização, **receptor**, botão Produtos
- `Solicitações Canceladas` — tabela: código, usuário criador, solicitante, setor, subsetor, data abertura, botão Ver Itens
- `Registros de Saídas` — cards por saída: solicitação#, tipo, setor, subsetor, data, criado por, solicitante, custo total, botão "Ver produtos". Filtros: código, descrição, tipo, setor, subsetor, criado por, solicitante, datas. Exporta Excel. Custo total visível (R$231k)
- `Registros de Entradas` — cards por entrada: tipo (Compra/Devolução), código solicitação, código item, descrição, unidade, quantidade, tipo compra (Caixa/Pregão/Dispensa de pregão), fornecedor, nota, custo, data, usuário. Filtros: ID solicitação, descrição, número nota, tipo, datas. Custo total visível (R$236k)
- `Relatórios Sintéticos de Saída` — tabela agrupada por Setor → Usuário com Itens Total e Custo Total. Filtros: tipo, setor, itens, datas. Exporta planilha

### Achados estruturais observados

**ESTO-01** — Sistema separado (`estoque.ccbj.org.br`), autenticação própria, identidade visual independente (roxa/branco). Precisa ser absorvido como módulo nativo do ERP com mesma identidade visual e autenticação OAuth.

**ESTO-02** — Catálogo ativo com 1.000+ itens (código 1095+ visível), distribuídos em múltiplos depósitos (Infra., Almox., TI) com locais físicos codificados (ARM01N05, E07N04…). Estrutura de localização física existe e deve ser preservada.

**ESTO-03** — FSM atual de solicitações: Nova → Pendente (aguardando separação) → Separada (pronto para entrega) → Finalizada / Cancelada. Sem etapa de aprovação. Sem distinção entre consumível e equipamento no fluxo.

**ESTO-04** — Entradas registradas como Compra (tipos: Caixa, Pregão, Dispensa de pregão) ou Devolução — com fornecedor, nota fiscal e custo. Sem workflow de solicitação de aquisição integrado ao Financeiro.

**ESTO-05** — Sem campo "Tipo" (consumível/equipamento) no cadastro de item — distinção não existe hoje no sistema. Confirmado como necessidade: consumíveis saem definitivamente; equipamentos precisam de histórico de movimentação para cálculo de depreciação. Um mesmo item pode ser tratado de forma diferente dependendo do contexto de uso.

**ESTO-06** — Sistema em uso intenso e diário: ~1.800+ solicitações, múltiplos setores ativos (Narte, Infraestrutura, Escola, Ação Cultural, Comunicação, Gestão) com subsetores.

**ESTO-08** — **GAP CONFIRMADO: consumíveis não são considerados em reservas.** O sistema atual trata toda saída de consumível como definitiva, sem reserva prévia vinculada a uma Ação ou Reserva de espaço. O comportamento correto: ao criar uma reserva de espaço ou planejar uma Ação Cultural, deve ser possível reservar consumíveis junto com equipamentos — consumíveis debitam do saldo definitivamente na data de uso; equipamentos geram empréstimo com devolução esperada. Ambos os fluxos devem coexistir na mesma solicitação.

**ESTO-07** — Necessidade de **importação em lote** do Estoque Fácil para o ERP: catálogo de itens, saldos por depósito/local, histórico de entradas e saídas, solicitações finalizadas. A migração deve ser idempotente (reexecutável sem duplicação) e não pode interromper a operação durante a transição.

### Lacunas estruturais vs. ERP atual

| O que o ERP tem | O que o Estoque Fácil adiciona |
|---|---|
| `MASTER.Itens` — 7 campos (nome, descricao, qtd, localizacao, categoria) | ~15 campos por item (referência, tamanho, cor, marca, valor unitário, crítico, visível, situação) |
| `ESPACOS.EmprestimosItens` — itens retornáveis (empréstimo com devolução) | Consumíveis com saída permanente — conceito diferente |
| `ESPACOS.Ativos` — patrimônio/equipamentos com depreciação | — |
| Sem múltiplos depósitos | Múltiplos depósitos + locais físicos por item |
| Sem workflow de solicitação de material | FSM solicitação → separação → entrega |
| Sem registro de compra com NF/fornecedor | Entradas com NF, fornecedor, tipo de compra |
| Sem relatório por setor/usuário | Relatório sintético agrupado por setor/usuário |

> **Decisão arquitetural confirmada — Catálogo Unificado de Itens:**
> Todos os itens do sistema — consumíveis, equipamentos volantes, ativos fixos de espaço, patrimônio — compartilham **uma única base de dados**. O comportamento de cada item é determinado por suas tags/tipos, não por em qual módulo está cadastrado.
>
> Tags que determinam comportamento:
> - `tipo_localizacao`: `fixo_espaco` | `volante`
> - `consumivel`: `sim` | `não`
> - `emprestavel_externo`: `sim` | `não` → todo empréstimo fora das dependências da organização exige termo assinado, **inclusive por colaboradores internos** (levar para casa = externo)
> - `tem_patrimonio`: `sim` | `não` → ativa número de patrimônio (pré-preenchido com ID gerado, editável para atribuição oficial, com histórico de edições)
> - `tem_depreciacao`: `sim` | `não` → ativa acompanhamento de depreciação
> - `tem_manutencao`: `sim` | `não` → ativa registro de manutenções, análise de periodicidade e alertas
> - `visivel_solicitantes`: `sim` | `não`
> - `critico`: `sim` | `não` → ativa alerta de estoque mínimo
> - `numero_serie`: `sim` | `não` → rastreamento individual por unidade
>
> **Impacto arquitetural:** os repositórios atuais `MASTER.Itens` (catálogo de empréstimos) e `ESPACOS.Ativos` (patrimônio) devem ser **unificados** em um único catálogo canônico. A nova planilha `ESTOQUE` substitui e absorve ambos. O comportamento por módulo (empréstimo, depreciação, solicitação, almoxarifado) é derivado das tags do item, não de tabelas separadas.
>
> Abas previstas na planilha `ESTOQUE`: `Itens` (catálogo unificado), `Tags`, `Depositos`, `SaldosPorDeposito`, `Solicitacoes`, `SolicitacaoItens`, `Entradas`, `Transferencias`, `SolicitacoesAquisicao`, `MovimentacoesItens` (append-only), `BaixasItens`.

### Regras de negócio capturadas — Aquisição

> **Fluxo de solicitação de aquisição (dois caminhos):**
>
> **Caminho 1 — Reposição de estoque (Infraestrutura → Administrativo):**
> 1. Infraestrutura identifica necessidade de reposição
> 2. Infraestrutura cria solicitação de aquisição
> 3. Administrativo analisa saldo financeiro disponível
> 4. Administrativo abre processo de aquisição/contratação
>
> **Caminho 2 — Necessidade nova (Outro setor → Infraestrutura → Administrativo):**
> 1. Qualquer setor identifica necessidade não contemplada no catálogo atual
> 2. Setor solicita ao sistema (gera demanda para Infraestrutura)
> 3. Infraestrutura analisa a demanda e, se validada, encaminha para Administrativo
> 4. Administrativo analisa saldo financeiro e abre processo de aquisição/contratação
>
> **Vínculo com Financeiro:** o processo de aquisição/contratação aberto pelo Administrativo deve gerar ou ser associado a um registro no módulo Financeiro/Contratações do ERP.

### Regras de negócio capturadas — Recebimento e automação

> **Recebimento de itens:**
> - Quem registra a entrada: Infraestrutura
> - Hoje: 100% manual, sem vínculo entre processo de compra e recebimento físico
>
> **Requisito de automação:**
> - Automatizar o máximo possível o ciclo aquisição → recebimento → entrada no estoque
> - Manter entrada manual sempre disponível (processos externos ao sistema que precisem ser cadastrados)
> - O vínculo entre processo de aquisição (Financeiro/Contratações) e entrada de itens deve ser automático quando o processo existir, e opcionalmente preenchível quando a entrada for manual
>
> **Vínculos com outros módulos a mapear:**
> - Ações Culturais: eventos consomem/emprestam itens do estoque
> - Tarefas: solicitações e recebimentos devem gerar tarefas nos fluxos pertinentes
> - Aprovações: solicitações de aquisição passam por aprovação do Administrativo
> - Outros módulos a identificar durante a análise

### Regras de negócio capturadas — Vínculo estoque × Ações e Reservas

> **Saída de itens por contexto de uso:**
> - Consumíveis: saem definitivamente — debitam do saldo sem devolução esperada
> - Equipamentos: saem como empréstimo — devolução esperada após o evento/uso
> - Um mesmo item pode ter comportamento diferente dependendo do contexto (ex.: projetor → empréstimo; papel → consumo)
> - Ambos os tipos devem poder ser solicitados juntos na mesma requisição vinculada a uma Ação ou Reserva de espaço
> - **GAP atual (ESTO-08):** consumíveis não são reservados preventivamente — sistema só registra a saída depois, sem planejamento prévio vinculado ao evento
> - **Prazo mínimo configurável:** ao vincular consumíveis a uma reserva de espaço ou Ação, o sistema deve verificar se a data da reserva respeita um prazo mínimo de antecedência configurável (ex.: 48h) — necessário para que Infraestrutura consiga checar disponibilidade e preparar os itens. Reservas fora do prazo mínimo devem exibir alerta, sem bloquear (fluxo de exceção possível com justificativa)

### Regras de negócio capturadas — Acesso e origens de solicitação

> **Quem pode solicitar:** qualquer colaborador pode criar solicitações de material. Permissão configurável via RBAC para possível restrição futura sem necessidade de mudança de código.
>
> **Três origens possíveis de solicitação:**
> 1. **Vinculada a Reserva** — solicitação criada dentro do contexto de uma reserva de espaço; itens associados ao evento/uso do espaço
> 2. **Vinculada a Ação Cultural** — solicitação criada dentro do contexto de uma Ação; itens associados à produção/execução da ação
> 3. **Livre** — solicitação avulsa, sem vínculo obrigatório; ao criar, sistema **sempre pergunta** se o usuário deseja vincular a uma Reserva ou Ação existente (campo opcional com busca). Se recusar, segue como solicitação livre.
>
> O vínculo (reservaId / acaoId) deve ser rastreável nos relatórios e no histórico de uso por evento/ação.
>
> **Prioridade na fila de separação:** critério de tempo — solicitações com data de uso/evento mais próxima aparecem primeiro na fila de Infraestrutura. Solicitações vinculadas a Reserva ou Ação herdam automaticamente a data do evento como referência de prioridade. Solicitações livres usam a data de criação como referência secundária.

### Regras de negócio capturadas — Estoque insuficiente

> Quando saldo insuficiente para atender uma solicitação: **bloqueia** a solicitação e **alerta Infraestrutura** para avaliação/providências. Não cria solicitação de aquisição automaticamente — Infraestrutura decide o próximo passo.

### Regras de negócio capturadas — Métricas inteligentes e logística

> **Objetivo geral:** pipeline logístico eficiente sem gargalos, com eficiência financeira e zero desperdício.
>
> **Métricas e alertas inteligentes:**
> - Identificação de padrões de solicitação: setor/pessoa X sempre pede item Y no dia Z da semana/mês
> - Sugestão automática de rotina de reposição baseada no padrão observado: "todo dia U repor item A antes que setor Y solicite"
> - Cálculo de duração média de consumíveis: quanto tempo um item dura por setor/usuário com base no histórico
> - Alertas de desperdício: consumo acima da média histórica para o setor/período
> - Alertas de item crítico: saldo atingindo limiar configurável antes do próximo ciclo de reposição esperado
>
> **Sistema de dois níveis de estoque (confirmado):**
> - **Estoque Rápido** — estoque de prateleira/linha de frente, próximo ao ponto de uso (ex.: depósitos por setor — "Infra.", "TI")
> - **Almoxarifado** — estoque central/bulk (depósito "Almox."), reserva estratégica
> - Lógica de pipeline: quando o Estoque Rápido atinge nível mínimo → alerta para transferência do Almoxarifado; quando o Almoxarifado atinge nível mínimo → dispara processo de aquisição
> - Regra de equilíbrio: nunca lotar o Estoque Rápido (evitar desperdício/perda) e nunca deixá-lo zerar (evitar ruptura operacional)
> - O sistema deve saber, para cada item, onde ele está: em qual depósito, em qual local físico, em qual quantidade
>
> **ESTO-11** — Necessidade de **modo "Fechado para Balanço"**: botão/toggle que suspende temporariamente toda criação de novas solicitações enquanto um inventário físico (balanço) está sendo realizado. Deve: exibir aviso claro a quem tentar solicitar ("Estoque temporariamente fechado para balanço — previsão de reabertura: [data/hora]"), registrar quem abriu e fechou o modo e em que horários, e ao reabrir reconciliar os saldos ajustados durante o balanço. Solicitações já em andamento (separadas) não devem ser afetadas.

**ESTO-09** — GAP confirmado: sistema atual (Estoque Fácil) registra depósitos mas não gerencia transferência entre eles nem alerta sobre níveis críticos por depósito. Toda movimentação entre almoxarifado e estoque rápido é manual e sem rastreabilidade automática.
>
> **ESTO-10** — GAP confirmado: sistema atual não possui motor de análise de padrões nem alertas preditivos. Toda percepção de rotina (ex.: "todo dia X o setor Y pede item Z") depende de análise manual dos relatórios.

### Diretriz de implementação — Prioridade para automação

> **Princípio geral do módulo:** automação tem prioridade sobre fluxo manual. Toda vez que o sistema puder inferir, sugerir, gerar ou executar uma ação sem intervenção humana, deve fazê-lo. O fluxo manual existe como exceção e fallback, nunca como caminho padrão. Isso se aplica a: transferências entre depósitos, ordens de reposição, priorização de fila, alertas preditivos, vínculos com reservas/ações, e registro de entradas vinculadas a processos de aquisição.

### Regras de negócio capturadas — Transferência entre depósitos

> **Dois modos coexistentes:**
> 1. **Ordem de transferência gerada pelo sistema** — quando alerta de nível mínimo é acionado, sistema cria uma ordem de transferência pendente; Infraestrutura realiza o movimento físico e confirma no sistema, que atualiza os saldos automaticamente
> 2. **Lançamento manual** — Infraestrutura realiza o movimento físico por iniciativa própria e registra diretamente, sem ordem prévia (necessário para processos ad hoc ou externos ao sistema)
>
> Ambos os modos geram o mesmo registro de movimentação com: origem, destino, item, quantidade, quem executou, data/hora. O histórico de transferências deve ser auditável.

### Regras de negócio capturadas — Registro de devolução de equipamentos

> **Modelo de registro:** campo de observações livres **obrigatoriamente acompanhado** de campos estruturados para sistematização. O objetivo é permitir análise de dados — padrões de avarias, frequência por item/solicitante, necessidade de manutenção recorrente — que texto livre não possibilita.
>
> **Princípio geral:** todo registro que precisar de observação no sistema (devolução, balanço, transferência, ajuste de saldo, recebimento de compra) deve seguir o mesmo modelo: campos estruturados + observação livre complementar. Os campos estruturados variam por contexto e precisam ser definidos por domínio.
>
> **ESTO-12** — Campos estruturados a definir com Infraestrutura para dois contextos:
> 1. **Devolução de equipamento:** condição do item, categoria de avaria, limpeza necessária, observações livres
> 2. **Recebimento de compra:** avaliação completa de todas as especificações — quantidade recebida vs. pedida, descrição correta, condição dos itens, presença e validade da nota fiscal, conformidade com fornecedor, divergências identificadas. Cada especificação como campo estruturado + observação livre complementar. Não conformidades devem gerar alerta automático para o responsável pela compra.
>    **Checklist no sistema para o receptor:** o sistema deve exibir um checklist guiado passo a passo ao receptor no momento do recebimento — orientando o que verificar, em que ordem, e impedindo a confirmação do recebimento sem que todos os itens obrigatórios tenham sido avaliados. O checklist deve ser baseado no manual operacional do módulo e configurável por tipo de item/compra.

### Regras de negócio capturadas — Número de patrimônio

> - Campo `tem_patrimonio` ativa o registro de número de patrimônio no item
> - ID pré-gerado pelo sistema (editável) para atribuição do número oficial da organização
> - Histórico de edições do campo: quem alterou, quando, valor anterior → garante rastreabilidade de tombamento
> - Patrimônio oficial pode ser diferente do ID interno do sistema

### Regras de negócio capturadas — Manutenção

> - Registro completo de histórico de manutenções por item (data, tipo, custo, fornecedor, descrição, resultado)
> - Análise inteligente de periodicidade: sistema identifica padrão histórico de manutenções e sugere intervalo esperado
> - Periodicidade manual: responsável pode definir intervalo previsto (ex.: revisão a cada 6 meses) com alertas programados automáticos
> - Suporte a previsão de orçamento: com base na periodicidade e custo histórico, sistema projeta gasto de manutenção para os próximos N meses — subsidia planejamento financeiro

### Regras de negócio capturadas — Empréstimo externo e termo

> **Definição de "externo":** qualquer empréstimo de item fora das dependências físicas da organização é tratado como externo — **inclusive colaboradores internos** que levam equipamento para casa
> - Empréstimo interno: item usado dentro da organização, sem termo obrigatório
> - Empréstimo externo: item sai fisicamente da organização → exige termo assinado (mesmo fluxo de EMP-05: geração, download, upload do documento assinado)
> - O sistema deve perguntar "o item sairá das dependências?" ao registrar o empréstimo e aplicar o fluxo correto automaticamente

### Regras de negócio capturadas — Encerramento de item: descarte, doação e perdas

> O sistema deve registrar formalmente o encerramento de um item por três vias, cada uma com campos estruturados próprios e graus distintos de responsabilização:
>
> **1. Descarte** — inutilização do item
> - Motivo estruturado: obsolescência, dano irreparável, fim de vida útil, outros
> - Responsabilização: nenhuma (processo natural) ou identificada (quem causou o dano)
>
> **2. Doação** — transferência para terceiro
> - Registro do beneficiário: nome, organização, documento
> - Autorização formal necessária (a confirmar na próxima pergunta)
>
> **3. Perda** — item não recuperável com apuração de causa
> - Subtipos estruturados com responsabilização específica:
>   - `estravio`: item não localizado — responsabilização de quem tinha a guarda
>   - `nao_devolucao`: item emprestado e não devolvido — responsabilização do tomador (vinculado ao registro de empréstimo)
>   - `dano_mau_uso`: item danificado por uso inadequado — responsabilização de quem usou
>   - `dano_acidental`: dano sem culpa identificável — registro sem responsabilização
>   - `depreciacao_obsolescencia`: encerramento por desgaste temporal — sem responsabilização
> - Perdas com responsável identificado devem gerar **notificação formal** ao responsável e ao gestor, e podem acionar fluxo de apuração
> - Histórico de perdas por pessoa/setor deve ser auditável e aparecer nos relatórios de análise

### Regras de negócio capturadas — Autorização de baixa

> Toda baixa de item (descarte, doação ou perda) requer **autorização prévia do gestor de Infraestrutura**.
>
> FSM de baixa: `solicitada → aguardando_aprovacao_gestor → aprovada → baixada` / `rejeitada`
> - Solicitante (Infraestrutura) registra a intenção de baixa com tipo e justificativa estruturada
> - Sistema notifica o gestor de Infra automaticamente
> - Gestor aprova ou rejeita com justificativa
> - Somente após aprovação o item é removido do inventário ativo
> - Rejeição devolve o item ao status anterior com registro do motivo

### Regras de negócio capturadas — Vínculo obrigatório com Contratações

> **Regra absoluta:** todo processo que envolva movimentação financeira — compra, aquisição, contratação de serviço de manutenção, qualquer outro — **obrigatoriamente passa pelo módulo de Contratações**.
>
> **Fluxo de solicitação de aquisição com formulário progressivo:**
> 1. Qualquer setor pode abrir uma solicitação de aquisição com preenchimento simplificado (necessidade, item, justificativa básica) — sem exigir conhecimento técnico ou financeiro
> 2. Infraestrutura complementa com especificações técnicas do item
> 3. Administrativo complementa com informações financeiras (rubrica, fonte de recurso, modalidade de compra) e abre formalmente o processo em Contratações
> 4. Contratações conduz o processo completo (cotação, aprovação, empenho, pagamento)
> 5. Ao receber os itens → Infraestrutura registra a entrada no estoque vinculada ao registro de Contratação correspondente
>
> O `SolicitacoesAquisicao` no estoque é o ponto de partida; o registro de Contratação é o destino. Ambos devem estar ligados por referência cruzada (id de solicitação ↔ id de contratação).

### Regras de negócio capturadas — Controle de acesso ao estoque

> **Acesso padrão a dados financeiros do estoque:** restrito a gestores, Infraestrutura e Administrativo
> **Expansão:** liberável caso a caso via configurações de permissão — por pessoa, setor ou função

### Padrões de unidade visual detectados — escopo: todo o sistema

> Mapeamento completo das classes de DS em uso em todas as views do `index.html`. Serve de referência para comparação em cada nova análise de módulo ou aba.

#### Padrão de cabeçalho — 3 variantes coexistindo

| Variante | Container | Título | Subtítulo | Views |
|---|---|---|---|---|
| **Antiga** | `page-header` | `div.page-title` (22px, div) | `div.page-subtitle` (14px) | Admin, Aprovações, Tarefas, Pessoas, Contratações, Financeiro, Infraestrutura |
| **Nova** | `view-header` | `h1.view-title` (22px, h1) | `p.view-subtitle` (14px) | Reuniões, TaskHub, Balcão, Auditoria, PainelOrgs, RECE, Escuta |
| **Mista** | `view-header` | `h2.view-titulo` (menor, h2, ícone colorido) | `p.view-subtitulo` (13px) | Ações, Agentes, Acervo, Voluntários, Parcerias, Estratégia |

#### Padrão de botão primário — 2 variantes
- `btn btn-primario` — ~40 usos, views antigas (Admin, Tarefas, Pessoas, Financeiro, Infraestrutura, Contratações)
- `btn btn-primary` — ~25 usos, views novas (Ações, Reuniões, Balcão, TaskHub, Agentes, Acervo, Estratégia)
- Ambos definidos no CSS; visualmente idênticos; fragmentação de manutenção

#### Padrão de campo de formulário — 3 variantes
- `form-input` — padrão da maioria dos formulários inline e cards
- `form-control` — aparece em alguns modais e views de detalhe
- `input` — usado apenas no modal de Ações Cultural (forma curta, 3ª variante)

#### Padrão de barra de filtros — 2 variantes
- `filter-bar` — Infraestrutura, Ações, Contratações
- `toolbar` — Reuniões, Balcão, RECE (com `style="gap:8px;"` inline)

#### Padrão de aba ativa — 3 variantes
- `.ativa` — padrão majoritário (Infraestrutura, Contratações, Financeiro, Ações painel)
- `.active` — Aprovações (aba Reservas) — inglês vs português
- `.tab-ativa` — Dashboard, Escuta, Ponto, RH — prefixado

#### Padrão de variáveis de cor nos stat-cards — 2 variantes
- `var(--color-warning)` / `var(--color-info)` / `var(--color-success)` — Ações, Financeiro painel
- `var(--warning)` / `var(--info)` / `var(--success)` — Reuniões, Balcão, RECE, Sistema-Métricas
- Ambas definidas (as curtas são aliases das longas via `:root`); intercambiáveis mas inconsistentes

---

### Decisão arquitetural — RBAC granular (escopo: todo o sistema)

> **Modelo de permissões desejável para o sistema inteiro:**
> - **Camada 1 — Permissões gerais:** definidas por papel/função (ex.: todos os gestores têm acesso a X)
> - **Camada 2 — Granularização individual/grupal:** ajustes por pessoa específica, por setor ou por função, sobrescrevendo ou complementando as permissões gerais
> - Permite liberação pontual sem alterar o papel global do usuário
> - Exemplo: colaborador sem papel de gestor pode receber acesso específico a relatórios financeiros do estoque sem virar "gestor"
>
> **SIS-02** — O sistema atual tem RBAC por papel global (`AcessoService.verificar()`) mas **não tem granularização individual/grupal por recurso**. A camada 2 precisa ser construída — provavelmente via configuração em `config_org.json` ou nova estrutura de permissões por módulo/recurso.

### Decisão arquitetural — Patrimônio como visão separada

> **Base unificada, análise separada:**
> - Patrimônio e estoque geral compartilham o mesmo catálogo de itens (mesma base de dados)
> - Patrimônio tem sua própria visão analítica, relatórios e fluxos dentro do módulo — acessível como sub-módulo distinto (aba ou seção separada)
> - A tag `tem_patrimonio: sim` é o critério de filtro que define quais itens aparecem na visão patrimonial
>
> **ESTO-13** — Módulo de Patrimônio **DIFERIDO**: usuário não possui informações suficientes sobre os processos formais patrimoniais (tombamento, inventário anual, auditoria externa) para mapear os fluxos específicos neste momento. A visão separada e a base unificada estão definidas arquiteturalmente; os fluxos próprios do patrimônio serão mapeados em sessão futura quando houver informação disponível.

### Perguntas em aberto
*(em andamento)*

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
| ~~12~~ | ~~PES-01~~ | ~~Pessoas~~ | ~~Lista de colaboradores não carrega~~ | ✅ CORRIGIDO (provável) — causa raiz era `lerJSON` indefinida; alias adicionado em `data_layer.gs`. Confirmar no sistema. |
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
| 42 | ESTR-02 | Sistema | Layout de abas inconsistente entre módulos: Infraestrutura usa linha única (5 abas); RH/DP usa 3 linhas que quebram (11 abas) — sem padrão uniforme | 🟡 Média |
| 43 | ~~RH-01~~ | RH / Depto. Pessoal | ~~MÉTRICAS tem toggle mas não expande conteúdo~~ **CORRIGIDO s16 Fase 23**: `_carregarMetricas` reescrita com estrutura `stat-icon+stat-valor+stat-label` e renderização resiliente (zeros em caso de falha). | ~~🔴 Alta~~ |
| 44 | ~~ESP-01~~ | Infraestrutura — Diagrama | ~~Coluna de nomes dos espaços não é sticky~~ **CORRIGIDO s16 Fase 26**: inline style do `.rdg-sala-label` explicitamente inclui `position:sticky;left:0;z-index:2` garantindo prevalência. | ~~🔴 Alta~~ |
| ~~45~~ | ~~ESP-02~~ | ~~Infraestrutura — Lista~~ | ~~Filtro de data padrão = hoje~~ | ✅ CORRIGIDO s16 Fase 22 — filtro inicia vazio; lista mostra todas as datas quando campo vazio. Deploy @387. |
| 46 | ESP-03 | Infraestrutura — Lista | Filtros inconsistentes entre modos: Diagrama tem filtro de espaço + campo de busca; Lista não tem filtro de espaço nem busca por nome — usuário não consegue filtrar por sala no modo Lista | 🟡 Média |
| 47 | ESP-04 | Infraestrutura — Nova Reserva | Botão "Lote" posicionado na barra de ações (junto de Cancelar/Salvar) — deveria ficar próximo ao campo "Data", pois o lote é sobre repetição de datas; posição atual é confusa e esconde a funcionalidade | 🟡 Média |
| 48 | ESP-05 | Infraestrutura — Nova Reserva | Formulário **não permite vínculo com Ação Cultural** — toda reserva fica solta, sem integração com métricas, relatórios, acompanhamento de tarefas e ações. Deveria ter campo opcional "Vincular a uma Ação" (select de ações existentes) ou permitir reserva solta como alternativa explícita | 🔴 Alta |
| 49 | ESP-06 | Infraestrutura — Nova Reserva | **Sem suporte a espaço externo** — não é possível fazer reserva de local fora do equipamento CCBJ/TRAMAR. Ideal: (1) seleção direta via mapa interativo; (2) campo de endereço completo + observações sobre o espaço externo | 🔴 Alta |
| 50 | ESP-07 | Infraestrutura — Nova Reserva | "Tipo de Ação" deve ter comportamento duplo: (1) se vinculado a uma Ação Cultural → preenchido automaticamente do campo tipo da Ação; (2) se reserva solta → dropdown fixo configurável. Texto livre atual gera inconsistência nos relatórios | 🔴 Alta |
| ~~51~~ | ~~ESP-08~~ | Infraestrutura — Nova Reserva | ~~Campo "Setor" não é auto-preenchido~~ **CORRIGIDO s17 F46**: `abrirForm(dados)` usa `_bootData.usuarioSetor` como fallback para nova reserva (sem `dados.id`). | ~~🟡 Média~~ |
| 52 | ESP-09a | Infraestrutura — Nova Reserva | Seção "ITENS SOLICITADOS (ALMOXARIFADO)" existe no formulário ✅, mas o catálogo está **vazio** ("Nenhum item no catálogo") — itens precisam ser cadastrados no módulo Almoxarifado/Configurações para que a seleção funcione | 🟡 Média |
| 52b | ESP-09b | Infraestrutura — Nova Reserva | **Itens fixos do espaço** (equipamentos instalados permanentemente: projetor, sistema de som, etc.) ainda estão ausentes do formulário — capacidade do espaço aparece (✅) mas não há campo para declarar/reservar os itens fixos da sala | 🔴 Alta |
| ~~53~~ | ~~ESP-10~~ | Infraestrutura — Select de Espaços | ~~Select mostra todos os 17 espaços incluindo não habilitados~~ **JÁ ESTAVA CORRIGIDO**: `popularSelectEspacos()` filtra `e.aceitaReserva !== false` antes de popular o select. | ~~🔴 Alta~~ |
| 54 | ESP-11 | Infraestrutura — Diagrama | Diagrama exibe apenas **9 dos 17 espaços** — os 8 externos/abertos (Praça Central, Teatro, Campinho, etc.) não aparecem no Diagrama de horários, tornando a visualização de ocupação incompleta para quem gerencia todos os espaços | 🟡 Média |
| 55 | ESP-12 | Infraestrutura — Dados | "Espaço de Feiras" tem **capacidade indefinida (cap. ?)** — dado incompleto no cadastro | 🟡 Média |
| ~~56~~ | ~~ESP-13~~ | Infraestrutura — Lote | ~~Modal Lote duplica campos~~ **CORRIGIDO s17 F51** — campos removidos do modal; confirmacao lê do form principal do formulário principal (Nome do Evento, Tipo, Setor, Observações) — fluxo correto: preencher o formulário principal → clicar Lote → modal pergunta **somente** Espaço + Hora Início/Fim + padrão de datas. Demais info já está no formulário pai | 🔴 Alta |
| 57 | ESP-14 | Infraestrutura — Inconsistência | Campo "Tipo" no modal Lote é **select** (com opções); campo "Tipo de Ação" no formulário principal é **texto livre** — mesmo dado, dois comportamentos opostos | 🔴 Alta |
| ~~58~~ | ~~ESP-15~~ | Infraestrutura — Lote | ~~Política de conflito errada~~ **CORRIGIDO s17 F51** — backend coleta conflitos; frontend oferece criação parcial: sistema cancela o lote inteiro se qualquer data tiver conflito — comportamento correto é: (1) verificar todas as datas; (2) exibir as datas em conflito; (3) perguntar "criar apenas as datas válidas?"; (4) criar somente as sem conflito se o usuário confirmar | 🔴 Alta |
| ~~59~~ | ~~ESP-16~~ | ~~Infraestrutura — Validação~~ | ~~Bug confirmado: horário configurado é 08:00–21:30 mas validação exibiu "anterior à abertura (07:00)" — sistema usa valor hardcoded (07:00) e ignora o horário global configurado em Config → Horários.~~ **CORRIGIDO** s17 @446: `assertHorarioFuncionamento` lê `ConfigService.getReservaHorario()` — zero hardcode. | ✅ |
| ~~59b~~ | ~~ESP-16b~~ | ~~Sistema — Configuração duplicada~~ | ~~Horário global em dois lugares (Infraestrutura + Admin).~~ **CORRIGIDO** s17 @446: Admin → Config.Sistema removida; única fonte é Infraestrutura → Config → Horários (inclui Expediente + Turnos). | ✅ |
| 61 | ESP-18 | Infraestrutura — Config Itens | Aba "Itens" em Configurações mostra apenas **categorias** (Audiovisual, Informática, Mobiliário…), não itens individuais — sem gestão de inventário nem vínculo com Almoxarifado. Resultado: Nova Reserva exibe "Nenhum item no catálogo" pois não há onde cadastrar os itens em si | 🔴 Alta |
| 62 | ESP-19 | Infraestrutura — Espaços | **Três conjuntos divergentes**: 36 espaços no Mapa, 17 no select de Nova Reserva, 9 no Diagrama — critério de exibição de cada visualização não está claro; espaços "Não reservável" aparecem no select (ESP-10), espaços externos ausentes do Diagrama (ESP-11) | 🔴 Alta |
| 63 | ADM-01 | Administração | "Acessos Pendentes" exibe "Carregando solicitações..." sem concluir — possível bug de carregamento ou lentidão no backend | 🟡 Média |
| 73 | APR-01 | Aprovações | Módulo carrega com 4 abas (Reservas de Espaço, Primeiros Acessos, Veículo, Permissões) mas **não indica qual aba tem itens pendentes** — quando há solicitações, o usuário precisa clicar em cada aba para descobrir onde estão. Comportamento esperado: badge de contador por aba (ex: "Primeiros Acessos ③") e destaque visual na aba com pendência | 🔴 Alta |
| ~~75~~ | ~~CHV-03~~ | ~~Chaves — Devolver~~ | ~~`prompt()` nativo~~ | ✅ CORRIGIDO s16 Fase 21 — substituído por modal inline com select Condição (bom estado/avariada/perdida) + textarea Observações + Confirmar/Cancelar. Deploy @387. |
| 76 | CHV-04 | Chaves — Nova Retirada | Campo "Sala/Espaço" é texto livre — deve ser dropdown com apenas os espaços que possuem chaves cadastradas | 🔴 Alta |
| 77 | CHV-05 | Chaves — Nova Retirada | Campo "Nome do Responsável" é texto livre — deve ser seleção de usuário do sistema com email puxado da base de usuários (autocomplete ou select) | 🔴 Alta |
| 78 | CHV-06 | Chaves — Nova Retirada | Campo "Setor" é texto livre — deve ser dropdown com setores cadastrados | 🟡 Média |
| 79 | CHV-07 | Chaves — Nova Retirada | "Previsão de Devolução" é apenas data — deve ter campo de hora opcional ativável pelo solicitante | 🟡 Média |
| 80 | CHV-08 | Chaves — Nova Retirada | Sem lógica de auto-preenchimento por papel: se solicitante for externo à Infraestrutura → "Responsável" e "Setor" preenchidos automaticamente com dados do usuário logado; se for da Infraestrutura → permitir registrar para si OU selecionar outro usuário | 🔴 Alta |
| 81 | EMP-01 | Empréstimos | Módulo está desvinculado do fluxo de reserva — deveria ser integrado: ao criar reserva, os itens solicitados geram automaticamente um empréstimo vinculado à reserva. Empréstimos autônomos devem existir apenas para solicitações externas (parceiros) | 🔴 Alta |
| 82 | EMP-02 | Empréstimos — Externo | Sem suporte a empréstimos externos (parceiros) — não há: cadastro prévio do solicitante externo, geração de termo de empréstimo, submissão de documento assinado, histórico por solicitante | 🔴 Alta |
| 83 | EMP-03 | Empréstimos — Formulário | Campo "Setor" é texto livre — deve ser dropdown com setores cadastrados | 🟡 Média |
| 84 | EMP-04 | Empréstimos — Externo | Sem campo de CPF do responsável pelo empréstimo externo — CPF é obrigatório para identificar o solicitante e rastrear histórico | 🔴 Alta |
| 85 | EMP-05 | Empréstimos — Externo | Sem geração de termo de empréstimo — sistema deve: (1) preencher modelo de termo com dados do solicitante e do empréstimo; (2) permitir baixar para assinatura; (3) aceitar upload do documento assinado como comprovante | 🔴 Alta |
| 86 | EMP-06 | Empréstimos — Externo | Sem cadastro prévio de solicitante externo — deve incluir: nome, CPF, organização, contato; visualização restrita por papel (LGPD) | 🔴 Alta |
| 87 | EMP-07 | Empréstimos — Externo | Sem histórico de empréstimos por solicitante (CPF) — ao selecionar um solicitante cadastrado, deve ser possível ver todos os empréstimos anteriores e situação atual | 🟡 Média |
| 74 | SIS-01 | **SISTEMA GLOBAL** | **Ocorrências de `prompt()` / `confirm()` nativos** — substituídos progressivamente: ✅ CHV-03 (s16 F21) · ✅ AlmoxUI._devolver (s16 F25) · ✅ SolicitacoesUI.devolver (s16 F25) · ✅ AlmoxUI._cancelar (s16 F27) · ✅ SolicitacoesUI.aprovarGestor (s16 F27) · ✅ SolicitacoesUI.aprovarFinanceiro (s16 F27) · ✅ SolicitacoesUI.rejeitar (s16 F27). Restam: SolicitacoesUI.cancelar, SolicitacoesUI.instruir/iniciarExecucao/concluir (confirm), Ativos manutenção, Aprovações recusa/papel, Agentes suspensão. | 🔴 Crítico |
| ~~64~~ | ~~ESP-20~~ | Infraestrutura — Lista | ~~Filtro de data não dispara automaticamente~~ **JÁ ESTAVA CORRIGIDO**: `res-filtro-data` já tem `onchange="ReservasUI._aplicarFiltroLista()"` — dispara em tempo real. | ~~🟡 Média~~ |
| ~~65~~ | ~~ESP-21~~ | Infraestrutura — Lista | ~~Sem botão "Redefinir filtros"~~ **CORRIGIDO s17 F46**: botão com ícone `filter_alt_off` adicionado à filter bar; `_limparFiltros()` limpa status+data+sort e recarrega. | ~~🟡 Média~~ |
| 66 | ~~ESP-22~~ | Infraestrutura — Reservas | ~~Auto-conclusão ausente~~ **CORRIGIDO s16 Fase 24**: `ctrl_reservas_concluir_atrasadas` conclui reservas `em_uso` cujo `horaTermino + 15 min` já passou; chamado silenciosamente no `_executar` do frontend ao carregar a lista. | ~~🔴 Alta~~ |
| 67 | ESP-23 | Infraestrutura — Card da Reserva | Informações do card insuficientes para uso operacional — o card deve exibir com destaque: itens solicitados do almoxarifado, itens fixos da sala, observações/equipamentos, e **vínculos com Ação Cultural e Tarefas** (caso existam) — pois é a ferramenta principal de quem habilita e monitora os espaços nos horários corretos | 🔴 Alta |
| 68 | ESP-24 | Infraestrutura — Agenda | Agenda demora para carregar as reservas — lentidão perceptível ao abrir o modo ou navegar entre semanas | 🟡 Média |
| ~~69~~ | ~~ESP-25~~ | Infraestrutura — Mapa | ~~Campo de data no modo Mapa com font-family nativa do browser~~ **CORRIGIDO s17 F47**: adicionado `font-family:inherit` ao style inline de `#mapa-data`. | ~~🟡 Média~~ |
| 60 | ESP-17 | Infraestrutura — Formulário | Validação de passado **implementada no backend** — exibe toast "Atenção: Não é possível reservar para data e horário já passados" ✅. Melhoria de UX: desabilitar datas passadas no datepicker para feedback imediato antes de tentar checar/salvar | 🟡 Média |
| ~~70~~ | ~~ESP-26~~ | Infraestrutura — Criação | ~~Reservas criadas por papéis com permissão direta sempre iniciam como "Pendente" — mesmo em espaços sem responsável configurado.~~ **CORRIGIDO @464**: `reserva_engine._precisaAprovacao()` consulta `SolicitacaoReservaEngine.verificarPrioridadeSetor`; `criar()` e `criarLote()` definem `status = CONFIRMADO` automaticamente quando espaço sem responsáveis no slot OU solicitante do mesmo setor; botão "Confirmar" só renderiza quando `r.precisaAprovacao === true`; `ctrl_reservas_confirmar` permite também responsáveis do slot confirmarem. | ✅ |
| 73 | ESP-29 | Infraestrutura — Horário Local | **Novo domínio implementado @464**: cada espaço tem seu próprio `horarioFuncionamento.abertura/fechamento` (subconjunto do horário global). `assertHorarioFuncionamento` usa o horário do espaço como limite primário (não o global). Pendência: UX de validação visual nos inputs do formulário de reserva (mostrar `min`/`max` dinamicamente conforme o espaço selecionado) | 🟡 Média |
| 71 | ESP-27 | Infraestrutura — Performance | Todas as transições de estado (Confirmar, Habilitar, Iniciar, Concluir) têm latência perceptível — round-trip ao backend GAS antes de atualizar a UI. Feedback intermediário "...ando" existe ✅ mas a espera é suficiente para criar dúvida no operador. Melhoria: feedback otimista — UI atualiza imediatamente e reverte em caso de erro | 🟡 Média |
| 72 | ESP-28 | Infraestrutura — Pós-evento | "Concluir" encerra a reserva diretamente sem exibir formulário de pós-evento — campos de realizado, público presente, comprovações, observações e tempo de atividade existem no modelo de dados (backend) mas nunca são coletados pela UI. Toda reserva é concluída sem registro do que aconteceu — elimina rastreabilidade de uso real, afeta métricas de público atendido e impede relatórios de atividade | 🔴 Alta |
| 72b | ESP-28b | Infraestrutura — Pós-evento | Dados de pós-evento devem poder ser adicionados **a qualquer momento após a conclusão** — não apenas no instante do "Concluir". Mesmo que preenchidos imediatamente, devem permitir **edição posterior a qualquer momento**. Toda edição de pós-evento deve gerar **histórico de alterações** (quem editou, quando, o que mudou) | 🔴 Alta |
| ~~88~~ | ~~ACO-11~~ | ~~Ações Culturais — Header~~ | ~~Cabeçalho usa `h2.view-titulo` + `p.view-subtitulo`~~ **CORRIGIDO s17 F55 @458**: `h1.view-title` + `p.view-subtitle`; idem em todos os módulos (Agentes, Acervo, Voluntários, Parcerias, Estratégia, Escuta). CSS `.view-title` estendido com flex+gap+icon-color. | ~~🟡 Média~~ |
| ~~89~~ | ~~ACO-12~~ | ~~Ações Culturais — Formulário~~ | ~~Modal "Nova Ação" usa `class="input"` nos campos~~ **CORRIGIDO s17 F57 @466**: todos os 9 campos migrados para `class="form-control"`. | ~~🟡 Média~~ |
| 90 | ACO-13 | Ações Culturais — Criação | Sem campo de vínculo com contrato ou fonte de recurso na criação — associação só é possível via aba interna do painel, sem orientação ao usuário no fluxo de criação | 🟡 Média |
| 91 | ACO-14 | Ações Culturais — Formulário | Campo "Responsável" é texto livre (email digitado) — mesmo anti-padrão de TAR-02 e CHV-05. Deveria ser select/autocomplete da lista de usuários | 🔴 Alta |
| ~~92~~ | ~~ACO-15~~ | ~~Ações Culturais — Filtros~~ | ~~Barra de filtros sem botão refresh~~ **CORRIGIDO s16 F39**: botão `refresh` adicionado à filter-bar + método `_recarregar()` no AcoesUI. | ~~🟡 Média~~ |
| ~~98~~ | ~~ACO-16~~ | ~~Ações Culturais — Navegação~~ | ~~**BUG**: clicar em ✕ (fechar) no painel de visualização abre o modal "Editar Ação" em vez de fechar o painel~~ | ✅ CORRIGIDO — `stopPropagation()` no ✕ + `if(event.target===this)` no overlay |
| ~~99~~ | ~~ACO-17~~ | ~~Ações Culturais — Modal~~ | ~~Labels no modal sem `class="form-label"`~~ **CORRIGIDO s17 F57 @466** junto com ACO-12. | ~~🟡 Média~~ |
| 100 | ACO-18 | Ações Culturais — Modal | Campo "Tipo" defaulta para "Evento" (3ª opção da lista, não a primeira) — sem razão declarada para esse default; deveria default para o tipo mais frequente ou para a primeira opção | 🟡 Baixa |
| 101 | ACO-19 | Ações Culturais — Modal | Layout de colunas heterogêneo: "Tipo" (select) ao lado de "Responsável" (texto livre) — mais coerente seria agrupar campos de mesmo tipo (Tipo \| Setor ambos selects; Responsável em linha própria com destaque) | 🟡 Baixa |
| 102 | ACO-20 | Ações Culturais — Modal | Checkbox "Visível no portal público" ocupa uma linha inteira sozinho — desproporcional ao seu peso; deveria ser compactado junto a outro campo de baixo peso (ex: Público Previsto) | 🟡 Baixa |
| ~~103~~ | ~~ACO-21~~ | Ações × Reuniões | ~~Campo `run-acao-id` texto livre~~ **CORRIGIDO s17 F48**: substituído por `<select>` com `_carregarSelectAcoesRun(valorAtual)` — opções de ações ativas (não canceladas/concluídas) carregadas via GAS; preseleciona ao editar reunião existente. | ~~🔴 Alta~~ |
| ~~104~~ | ~~ACO-22~~ | Ações × Balcão | ~~Campo `bl-acao-id` texto livre~~ **CORRIGIDO s17 F48**: substituído por `<select>` com `_carregarSelectAcoesBal(valorAtual)` — mesmo padrão de ACO-21. | ~~🔴 Alta~~ |
| 105 | ACO-23 | Ações × RECE | **Sem vínculo algum** entre Ações Culturais e a Agenda RECE — eventos submetidos à rede regional não são rastreados no ERP. Modelo confirmado: entidades separadas, publicação no RECE é ato editorial deliberado via botão, com auditoria obrigatória pelo setor de Comunicação e IA para revisão textual. Decisão arquitetural completa registrada no módulo RECE (abaixo) | 🔴 Alta |
| 106 | ACO-24 | Ações × Alertas | Nenhum alerta automático gerado pelo ciclo de vida da ação (prazo se aproximando, ação em execução sem reserva vinculada, ação planejada sem equipe, etc.) — gestão reativa | 🔴 Alta |
| 107 | RECE-01 | RECE | Sem botão "Publicar no RECE" no painel da Ação — entrada no RECE é apenas manual, sem aproveitamento dos dados da Ação | 🔴 Alta |
| 108 | RECE-02 | RECE | Sem `acaoId` no modelo do evento RECE — vínculo bidirecional com Ações inexistente | 🔴 Alta |
| 109 | RECE-03 | RECE | Campos específicos ausentes: categorias, artista, público-alvo, classificação etária, acessibilidades, parceiros, headline, call-to-action | 🔴 Alta |
| 110 | RECE-04 | RECE | Sem fluxo de auditoria pela Comunicação — FSM atual não tem passo `aguardando_comunicacao`; publicação direta sem revisão editorial | 🔴 Alta |
| 111 | RECE-05 | RECE | Sem pré-condição de materiais de divulgação — evento pode ser publicado sem imagem, texto ou qualquer material | 🔴 Alta |
| 112 | RECE-06 | RECE | Sem integração com IA — nem revisão textual nem otimização de marketing implementadas | 🔴 Alta |
| 113 | RECE-07 | RECE | Sem suporte a materiais múltiplos de divulgação (vídeo, matéria, outros) — apenas imagem herdada do v1 | 🟡 Média |
| 114 | RECE-08 | RECE × Balcão | Sem geração automática de demandas no Balcão de Comunicação (design/matéria/divulgação) ao criar rascunho RECE | 🟡 Média |
| 115 | RECE-09 | RECE × IA | Sem histórico de revisões IA — usuário não sabe quais versões foram geradas nem quais foram aceitas | 🟡 Média |
| 116 | RECE-10 | RECE × Agenda RECE | Sem exportação/preview no formato do formulário externo da Agenda RECE — responsável precisa copiar campo a campo manualmente para o site, com risco de erro e omissão | 🟡 Média |
| 117 | RECE-11 | RECE × Agenda RECE | Sem confirmação de publicação externa — ERP não sabe quando o evento foi efetivamente publicado no site. Falta: passo "confirmar publicação" com data/hora e link opcional | 🟡 Média |
| 118 | RECE-12 | RECE × Agenda RECE | Integração via API (futuro) — quando a API de submissão em lote da Agenda RECE for disponibilizada, o ERP deve automatizar a publicação | 🔵 Futuro |
| 119 | ACO-25 | Ações — Painel | Painel da Ação não tem aba "Comunicação" — as 8 abas atuais não incluem a dimensão de comunicação. Falta 9ª aba "Comunicação" com sub-áreas RECE + Balcão contextualizadas para a ação | 🔴 Alta |
| ~~120~~ | ~~ACO-07r~~ | Ações — Contratações | ~~Botão "+ Nova Contratação" inoperante~~ **CORRIGIDO s17 F50**: `novaParaAcao()` adicionou `AcoesUI.fecharPainel()` antes de navegar. | ~~🔴 Alta~~ |
| 121 | ~~MAP-01~~ | Mapa — Mesclar | ~~Mesclar cria bounding box destruindo contornos~~ **CORRIGIDO s16 Fase 9** (`mapa_acao_editor.html`): (1) verifica sobreposição de bounding boxes — aborta com aviso se formas não se tocam; (2) para formas `livre` concatena pts em coords absolutas e recentra; (3) para rect/circle usa bounding box (correto quando se sobrepõem). União real de polígonos (contorno externo composto) é gap futuro. | ~~🔴 Alta~~ |
| 122 | ~~MAP-02~~ | Mapa do Evento — Abertura | ~~Contratações visível no fundo do editor~~ **CORRIGIDO s16 Fase 10**: `painel-tab-mapa` agora usa `position:relative;overflow:hidden` com container `position:absolute;inset:0`; `#mae-wrap` tem `position:relative;z-index:10`. | ~~🔴 Alta~~ |
| 123 | ~~MAP-03~~ | Mapa do Evento — Fechamento | ~~Fecha editor e navega para Contratações~~ **CORRIGIDO s16 Fase 10**: `cbVoltar` em `_abrirEditor` verifica `Router.getAtual()` e navega de volta para 'acoes' se a view mudou antes de re-renderizar a lista de mapas. | ~~🔴 Alta~~ |
| ~~125~~ | ~~RECE-15~~ | ~~RECE — Filtros~~ | ~~Datepicker na filter bar exibe "---------- de ----"~~ **CORRIGIDO s17 F57 @466**: `type="month"` envolto em `<label>` com ícone `calendar_month` — contexto visual elimina a ambiguidade do empty state. | ~~🟡 Média~~ |
| 126 | RECE-16 | RECE — Arquitetura | Botão "+ Novo Registro RECE" presente no módulo Comunicação — **arquiteturalmente incorreto**: o módulo Comunicação só lista/apresenta registros RECE; criação deve ocorrer exclusivamente pelo painel da Ação via "Publicar no RECE". Botão deve ser removido desta view | 🔴 Alta |
| 127 | RECE-17 | RECE — Visualização | Sem modo de visualização "Agenda" — a view só tem lista. Precisa de modo calendário/agenda para visualizar os eventos RECE distribuídos na linha do tempo, com filtro por data e espaço | 🔴 Alta |
| 128 | SIDEBAR-02 | Sidebar | "Comunicação" e "Balcão" são itens separados no menu (grupo OPERACIONAL) — devem ser unificados como "Comunicação" com abas internas (RECE + Balcão) | 🔴 Alta |
| 129 | SIDEBAR-03 | Sidebar | Módulos inativos (Relatórios, Agentes, Voluntários) visíveis no menu com badge `inativo` — podem confundir o usuário; ocultar ou desabilitar visivelmente com tooltip "em breve" | 🟡 Média |
| 130 | BAL-01 | Balcão — Arquitetura | Balcão é item separado no menu em vez de aba dentro de "Comunicação" — ver SIDEBAR-02 e ACO-25 | 🔴 Alta |
| 131 | BAL-02 | Balcão — DS | Botão "+ Nova Demanda" aparenta cor diferente (verde-escuro) dos demais botões `btn-primary` do sistema (roxo) — possível classe ou variável CSS distinta; verificar no código | 🟡 Média |
| 132 | BAL-03 | Balcão — Filtros | Sem filtro de data no filter bar — impossível buscar demandas por período de criação ou prazo | 🟡 Média |
| 133 | BAL-04 | Balcão — Filtros | Sem filtro por "Ação Cultural" vinculada — não é possível ver todas as demandas de comunicação de uma ação específica a partir do Balcão | 🔴 Alta |
| ~~134~~ | ~~BAL-05~~ | Balcão — Linguagem | ~~Subtítulo com jargão técnico (SLA, versionamento, rastreabilidade)~~ **CORRIGIDO s16 F40**: substituído por "Solicite materiais e acompanhe o atendimento pelo setor de Comunicação". | ~~🟡 Média~~ |
| 135 | SIS-08 | Sistema Global — Linguagem | **Padrão sistêmico a auditar**: termos técnicos de infraestrutura/engenharia (SLA, FSM, versionamento, rastreabilidade, webhook, endpoint, etc.) não devem aparecer na interface do usuário. Quando necessário explicar capacidades do sistema, usar linguagem orientada ao benefício para o usuário. Esses termos podem constar no manual do sistema com as devidas explicações. Auditar subtítulos, tooltips, mensagens de erro e labels de todo o sistema | 🟡 Média |
| ~~136~~ | ~~BAL-06~~ | ~~Balcão — Modal Dados~~ | ~~Campo "Ação vinculada (ID)" usa texto livre~~ **CORRIGIDO por ACO-22 (s17 F48): campo `bl-acao-id` é select populado via `_carregarSelectAcoesBal()`** | ~~🔴 Alta~~ |
| ~~137~~ | ~~BAL-07~~ | Balcão — Modal Dados | ~~Campo "Executor (email)" texto livre~~ **CORRIGIDO s17 F50** — select de usuários (placeholder "responsavel@ccbj.org.br") — deve ser autocomplete/select da base de usuários do sistema | 🔴 Alta |
| ~~138~~ | ~~BAL-08~~ | Balcão — Modal Dados | ~~Campo "Setor demandante" texto livre~~ **CORRIGIDO s17 F50** — select de setores (placeholder "Ex: NArTE") — deve ser dropdown com setores cadastrados na base | 🔴 Alta |
| 139 | BAL-09 | Balcão — Modal Dados | Campo "Título" desnecessário quando ação vinculada — ao selecionar uma ação, o título deve ser preenchido automaticamente. Campo manual só se não houver ação vinculada | 🔴 Alta |
| 140 | BAL-10 | Balcão — Modal Dados | Campo "Release" ausente — quando ação vinculada, o release vem automaticamente da ação (dados do evento para a Comunicação). Sem ação, campo editável manualmente | 🔴 Alta |
| 141 | BAL-11 | Balcão — Modal Dados | Campo "Descrição" não diferenciado de "Release": **Descrição** = o que se pede/espera do setor de Comunicação (orientado à demanda); **Release** = informações sobre a ação/evento (orientado ao conteúdo). São campos distintos com propósitos diferentes — devem ser separados e rotulados claramente | 🔴 Alta |
| ~~142~~ | ~~BAL-12~~ | Balcão — Modal Dados | ~~"⏱ SLA: 72h (3 dias) após submissão" com jargão técnico~~ **CORRIGIDO s16 F40**: label `bl-sla-label` exibe "Prazo estimado: X dia(s) após o envio" com lógica condicional (< 24h exibe horas, senão dias). Dashboard: "com SLA vencido" → "com prazo vencido". | ~~🟡 Média~~ |
| 143 | BAL-13 | Balcão — Modal Versões | Botão "+ Enviar Nova Versão" usa cor rosa/pink — diferente do padrão `btn-primary` (roxo) e `btn-secondary` (cinza) do sistema. Terceira cor de botão não prevista no DS | ~~🟡 Média~~ |
| ~~144~~ | ~~BAL-14~~ | ~~Balcão — Modal Versões~~ | ~~Botão "🚀 Enviar Entrega" tem emoji~~ **CORRIGIDO s16 F39**: emoji `📤` substituído por `<span class="ms ms-sm">upload</span>`. | ~~🟡 Baixa~~ |
| 145 | BAL-15 | Balcão — Modal Versões | Aba "Versões" exibe "URL da Entrega" + "Nota / Observação" + "Enviar Entrega" — **estrutura correta e positiva** ✅ para rastreamento de entregas. Problema: a aba aparece vazia antes de clicar em "+ Enviar Nova Versão" sem instrução ao usuário — estado vazio deveria explicar o que fazer ("Nenhuma versão entregue ainda. Clique em '+ Enviar Nova Versão' para registrar a primeira entrega.") | ~~🟡 Baixa~~ |
| 146 | BAL-16 | Balcão — FSM | **Falta etapa de aprovação final do material**: o setor de Comunicação entrega o material (registra URL na aba Versões), mas não há passo de aprovação pelo demandante confirmando que o material está adequado. FSM correto: `nova → em_execução → entregue → aprovada_pelo_demandante → concluída` / `reprovada → revisão`. Sem essa etapa, o Balcão não fecha o ciclo de qualidade da entrega | 🔴 Alta |
| ~~147~~ | ~~BAL-17~~ | ~~Balcão — BtnGuard~~ | ~~Spinner preso ao fechar modal sem salvar~~ | ✅ CORRIGIDO — `BtnGuard.liberar('btn-nova-demanda')` adicionado em `BalcaoUI.fecharForm()` |
| 149 | BAL-18 | Balcão — Modal | Modal "Nova Demanda" com organização visual deficiente: sem margens internas adequadas entre campos, sem espaçamento entre seções, sem adaptabilidade a diferentes tamanhos de tela. Instância confirmada de SIS-10 | 🔴 Alta |
| 150 | SIS-10 | Sistema Global — Modais | **Problema sistêmico de layout de modais**: modais do sistema apresentam organização visual deficiente — sem padrão de margem interna (padding), sem espaçamento consistente entre grupos de campos, sem responsividade/adaptabilidade a diferentes resoluções. Todos os modais precisam seguir um padrão unificado de: padding interno mínimo (ex: 24px), espaçamento entre campos (ex: 16px), agrupamento visual por seção, e comportamento responsivo (scroll interno, max-height com overflow, não ultrapassar viewport). Auditar todos os modais do sistema ao corrigir | 🔴 Alta |
| ~~148~~ | ~~SIS-09~~ | ~~Sistema Global — BtnGuard~~ | ~~BUG SISTÊMICO: BtnGuard não libera lock ao cancelar modal~~ | ✅ CORRIGIDO s16 Fase 18 — raiz: `done()` nunca chamado em modal-openers. Fix: 13 botões (acao-nova-btn, painel-acao-editar-btn, rece-novo-btn, btn-nova-reuniao, btn-nova-demanda, btn-novo-agente, btn-novo-arquivo, btn-novo-vol, btn-nova-parceria, btn-novo-objetivo, btn-nova-pesquisa, rece-edit-*, acao-nova-btn vazio) passam agora `function(done){...abrirForm(); done();}` — botão liberado assim que o modal abre, sem alterar comportamento dos close/cancel handlers existentes |
| 124 | ACO-26 | Ações — Painel (sistêmico) | **REGRA ARQUITETURAL VIOLADA**: toda sub-aba, editor ou formulário aberto a partir do painel da Ação deve permanecer sobre a view Ações — nunca navegar para outra rota. O usuário deve sempre retornar ao painel da Ação ao fechar. Instâncias confirmadas: MAP-03 (editor de mapa navega para Contratações ao fechar), MAP-02 (editor abre sem isolar a camada). A raiz é o editor de mapa implementado como rota separada em vez de overlay/modal sobre o painel | 🔴 Alta |
| 158 | APR-02 | Aprovações | SuperAdmin não acessa Aprovações — restrição RBAC `modulo:'ESPACOS'` no item de menu (linha ≈ 20199). Confirmado via correcoes.md | 🔴 Alta |
| 159 | APR-03 | Aprovações | Aba "Permissões" ausente — módulo não centraliza fluxos de acesso pendente. Confirmado via correcoes.md | 🟡 Média |
| 160 | ~~FIN-01~~ | Financeiro | ~~Campo Setor não persiste~~ **CORRIGIDO** (commit 0e9317f): `contratos_engine.gs` agora inclui `setor` em `adicionarItemMemoriaRubrica`. **Testar para confirmar.** | ~~🔴 Alta~~ |
| 161 | ~~FIN-02~~ | Financeiro | ~~Colapso pós-save incorreto~~ **CORRIGIDO** (commit 0e9317f): `salvarRubrica` captura e restaura estado de expansão de metas/atividades; fecha apenas formulário da rubrica salva. **Testar para confirmar.** | ~~🟡 Média~~ |
| 162 | ~~FIN-03~~ | Financeiro | ~~Sem view read-only~~ — **JÁ ESTAVA NEGADO** (sessão 8): ícone 👁 em cada rubrica abre modal read-only ✅. Commit 0e9317f apenas consolidou via `_renderRubricas`. | ~~🟡 Média~~ |
| 163 | ~~FIN-04~~ | Financeiro | ~~Tipo "Serviço" ausente~~ **CORRIGIDO** (commit 0e9317f): `_MEM_TIPOS` agora inclui "Serviço". | ~~🟡 Baixa~~ |
| 164 | ~~FIN-05~~ | Financeiro | ~~Sem drag and drop~~ **CORRIGIDO** (commit 0e9317f): metas reordenáveis via HTML5 Drag API + `ctrl_contratos_reordenar_metas()`. **Testar para confirmar.** | ~~🟡 Média~~ |
| 165 | FIN-06 | Financeiro | Integração Financeiro↔RH inexistente — pessoal CLT gerenciado em duplicidade (confirma PES-05/PES-06) | 🔴 Alta |
| 166 | FIN-07 | Financeiro | Lógica do card "Valor em Aberto" incerta — label pode estar incorreto | 🟡 Média |
| 167 | ~~FIN-08~~ | Financeiro | ~~Contraste dropdown setores~~ **CORRIGIDO** (commit 0e9317f): `_renderMemTabela` aplica `color:var(--text)` e `background:var(--surface)` explícitos no select. | ~~🟡 Baixa~~ |
| 168 | FIN-09 | Financeiro | Fonte de Recurso sem gestão independente — embutida como seção fixa do contrato; sem múltiplas fontes por contrato, sem CRUD de fontes, sem visão consolidada | 🔴 Alta |
| ~~169~~ | ~~FIN-10~~ | Financeiro — Memória de Cálculo | ~~Coluna "Subtotal" truncada no modo edição~~ **CORRIGIDO s17 F45**: `white-space:nowrap;min-width:90px` adicionados ao `<td>` de subtotal em `_renderMemTabela`. | ~~🟡 Média~~ |
| 170 | FIN-11 | Financeiro — Execução | **Sem acompanhamento de execução financeira** — sem visão previsto vs. executado por contrato/meta/atividade/rubrica; sem registro de pagamentos, NF ou comprovantes. Gap crítico para gestão e prestação de contas | 🔴 Alta |
| 171 | FIN-12 | Financeiro — Histórico | Histórico de versões apenas com metadados (número, usuário, data) — sem conteúdo de cada versão, sem diff comparativo, sem reversão para versão anterior | 🔴 Alta |
| ~~172~~ | ~~FIN-13~~ | ~~Financeiro — Aditivos~~ | ~~Card "Valor Aditivado" exibe "—" em vez de "R$ 0,00"~~ **CORRIGIDO s16 F39**: `_fmt(v)` corrigido de verificação truthy (`v ?`) para `v != null` — zero não engole mais o placeholder. | ~~🟡 Média~~ |
| ~~173~~ | ~~CON-01~~ | Contratações — Formulário | ~~Campo SETOR SOLICITANTE texto livre~~ **CORRIGIDO s17 F49**: substituído por `<select>` populado via `_popularSelectSetor()` com `App.getBoot().setores`; pré-seleciona `usuarioSetor` do boot ao abrir nova solicitação. | ~~🟡 Média~~ |
| ~~174~~ | ~~CON-02~~ | Contratações — Formulário | ~~Nº Esboço não pré-preenchido~~ **CORRIGIDO s17 F49**: `abrirForm()` gera automaticamente `ESB-AAAA-NNNNN` (ano + timestamp mod 10000) quando campo está vazio; campo permanece editável para receber numeração oficial (SEI, etc.). | ~~🟡 Média~~ |
| 175 | ~~CON-03~~ | Contratações — Vínculo Financeiro | ~~META exibe IDs técnicos~~ **CORRIGIDO s16 Fase 8**: `onContratoSelecionado` usava `m.nome` (campo inexistente); corrigido para `m.titulo||m.nome||('Meta '+(i+1))`. | ~~🔴 Alta~~ |
| 176 | ~~CON-04~~ | Contratações — Vínculo Financeiro | ~~RUBRICA não carrega~~ **CORRIGIDO s16 Fase 8**: `onMetaSelecionada` lia `meta.rubricas` (backward compat, vazio); corrigido para coletar rubricas de `meta.atividades[*].rubricas` + `meta.rubricas`. | ~~🔴 Alta~~ |
| ~~177~~ | ~~CON-05~~ | ~~Contratações — Fornecedores~~ | ~~Aba Fornecedores presa em "Carregando..." — namespace duplicado de AgentesUI (segunda definição sobrescrevia a primeira)~~ | ✅ CORRIGIDO — primeira definição renomeada para `ContratadosUI`; todos os callers atualizados |
| ~~178~~ | ~~CON-06~~ | Contratações — Habilitações | ~~Aba "Habilitações"~~ **CORRIGIDO s17 F52** — substituída por "Pregões / Atas de Registro de Preços" (Processos de Habilitação) deve ser **substituída** pela aba "Pregões Ativos / Atas de Registro de Preços" — o CCBJ não conduz pregões próprios; utiliza atas de preços pré-aprovadas por órgãos externos. Feature "Habilitação" não tem uso. Ver regra de negócio e CON-07 | 🔴 Alta |
| ~~179~~ | ~~CON-07~~ | Contratações — Pregões | ~~Sem cadastro de Pregões/Atas~~ **CORRIGIDO s17 F52** — `pregao_repository.gs` + `PregoesUI` CRUD completo — sistema não tem onde cadastrar pregões ativos com itens, preços, vigências e saldos. Sem esse cadastro, toda contratação por pregão exige preenchimento 100% manual mesmo quando item tem preço pré-negociado em ata vigente. Ver decisão arquitetural abaixo | 🔴 Alta |
| ~~180~~ | ~~REU-01~~ | ~~Reuniões — View~~ | ~~6 cards de métricas quebram em 2 linhas~~ **CORRIGIDO s16 F39**: 5º e 6º cards ("Enc. Pendentes" + "Enc. Vencidos") fundidos em único card "Encaminhamentos" com valor `P / V ⚠` e cor dinâmica; IDs internos mantidos ocultos para JS. | ~~🟡 Média~~ |
| ~~181~~ | ~~REU-02~~ | Reuniões — Modal Dados | ~~"Convocado por (email)" texto livre~~ **CORRIGIDO s17 F50** — `<select>` via `_carregarSelectUsuariosHelper`; pré-seleciona usuário logado. | ~~🟡 Média~~ |
| ~~182~~ | ~~REU-03~~ | Reuniões — Modal Dados | ~~Layout heterogêneo: Tipo ao lado de Data/Hora~~ **CORRIGIDO s17 F44**: reordenado para Tipo\|Local (linha 2) e Data/Hora\|Duração (linha 3). | ~~🔵 Baixa~~ |
| ~~183~~ | ~~REU-04~~ | ~~Reuniões — Modal Pauta~~ | ~~Aba Pauta sem estado vazio~~ **CORRIGIDO s16 F39**: placeholder "Nenhum item de pauta adicionado." exibido quando lista vazia; desaparece ao adicionar item e reaparece ao resetar o form. | ~~🔵 Baixa~~ |
| ~~184~~ | ~~REU-05~~ | Reuniões — Modal Presença | ~~Botões com aparência idêntica~~ **CORRIGIDO s16 F40**: "Presente" → `btn-primary` + ícone `check_circle`; "Ausente" → `btn-secondary` + ícone `cancel`. | ~~🟡 Média~~ |
| ~~185~~ | ~~REU-06~~ | Reuniões — Modal Ata | ~~Botões usam emojis (💾, 📤, ✅)~~ **CORRIGIDO s16 F40**: substituídos por MS (`save`, `send`, `verified`). | ~~🟡 Média~~ |
| ~~186~~ | ~~REU-07~~ | Reuniões — Modal Encaminhamentos | ~~Layout horizontal comprimido~~ **CORRIGIDO s16 F40**: campo texto em full-width na linha 1; responsável + prazo + botão na linha 2. | ~~🟡 Média~~ |
| ~~187~~ | ~~REU-08~~ | ~~Reuniões — FSM~~ | ~~FSM da UI incompleto~~ **FALSO POSITIVO (s17 F53): backend tem exatamente 5 estados (rascunho/agendada/em_andamento/encerrada/cancelada); UI cobre todos. Estados `confirmada`/`ata_pendente`/`aprovada`/`arquivada` não existem no backend.** | ~~🔴 Alta~~ |
| 188 | REU-09 | Reuniões — Ata | Aprovação de ata é single-approver; modelo desejado é confirmação coletiva por participante — cada participante confirma individualmente que a ata está correta. Sem notificação, sem rastreamento por participante, sem regra de fechamento | 🔴 Alta |
| 189 | REU-10 | Reuniões — Ata | Aba Ata sem auxílio de IA: sem geração de rascunho estruturado (a partir de pauta + participantes), sem revisão de linguagem formal, sem extração automática de encaminhamentos do texto | 🔴 Alta |
| ~~190~~ | ~~REU-11~~ | Reuniões — Ata | ~~Ata sem estrutura guiada~~ **CORRIGIDO s17 F44**: botão "Usar Template" (ícone MS `article`) adicionado à aba Ata; `_usarTemplateAta()` insere template de 6 blocos (Abertura/Participantes/Pauta/Deliberações/Encaminhamentos/Encerramento) pré-preenchido com dados do form. | ~~🟡 Média~~ |
| 191 | REU-12 | Meu Centro | Sem botão "+ Tarefa Rápida" no inbox — usuário precisa navegar ao módulo Tarefas para criação; adicionar mini-formulário inline no Meu Centro sem unificar os módulos | 🟡 Média |
| 192 | REU-13 | Reuniões — Encaminhamentos | Encaminhamentos sem notificação ao responsável no momento da criação — backend já agrega no TaskHub; falta trigger de alerta na criação | 🟡 Média |
| ~~193~~ | ~~APR-04~~ | ~~Aprovações — Tab bar~~ | ~~Tab ativa sem indicador visual: `.active` vs `.ativa`~~ | ✅ CORRIGIDO — HTML e JS de Aprovações trocados de `.active` para `.ativa` |
| ~~194~~ | ~~APR-05~~ | Aprovações — Aba Veículo | ~~"Carregando..." sem resolver~~ **CORRIGIDO s14 — carrega normalmente** | ~~🟡 Média~~ |
| 195 | APR-06 | Aprovações — Cabeçalho | Usa padrão antigo `page-header` / `div.page-title` — deveria ser `view-header` / `h1.view-title` (instância de SIS-03) | ~~🟡 Média~~ |
| ~~196~~ | ~~SIS-11~~ | Sistema Global — Usuário | ~~Saudações e avatar usavam email/iniciais derivadas do email~~ **CORRIGIDO s17 F47**: `boot_service.gs` retorna `usuarioNome`; `_aplicarBoot()` usa nome completo em `topbar-email`/`sidebar-user-name`/iniciais avatar (2 letras do nome); `_renderizarHome()` usa primeiro nome na saudação. | ~~🟡 Média~~ |
| 197 | ADM-05 | Admin — UI Geral | UI de Administração truncada — conteúdo cortado ou mal distribuído visualmente. Módulo carece de revisão de layout completa. Abas Features, Provisionamento e Config Sistema ainda não testadas visualmente | 🟡 Média |
| 198 | ADM-06 | Admin — Inconsistência visual | Aba Permissões em Aprovações (design novo: badge chips coloridos por papel, status badge "Ativo" verde, tabela limpa) é visualmente superior à aba Usuários em Admin (design mais antigo, tabela densa). As duas interfaces exibem dados de usuários mas usam componentes e padrões visuais diferentes — deveriam compartilhar o mesmo componente de exibição de usuário | 🟡 Média |
| ~~199~~ | ~~ADM-07~~ | Admin — Tab bar | ~~Barra de 10 abas sem sinalização de scroll~~ **CORRIGIDO s17 F44**: função global `_initTabBarNav(bar)` adicionada — wraps em `div.tab-bar-nav-wrap`, adiciona botões prev/next com fade gradient que aparecem/somem dinamicamente; chamada em `AdminCadastrosUI.aoAbrir()`. | ~~🟡 Média~~ |
| 200 | ADM-08 | Admin — Arquitetura de config | Turnos e Config.Sistema (Expediente & Horários) configuram a mesma dimensão temporal e devem ser unificados numa seção "Horários & Turnos". Confirmado pelo usuário | 🟡 Média |
| 201 | ADM-09 | Admin — Arquitetura de config | Categ.Itens não pertence ao escopo de configurações gerais do sistema — deve ser removida do Admin e incorporada ao módulo Estoque/Almoxarifado como configuração interna. Confirmado pelo usuário | 🟡 Média |
| 202 | ~~ADM-10~~ | Admin — Features | ~~Toggles inoperantes~~ **CORRIGIDO s16 Fase 6**: `FeatureFlagsUI.toggle()` agora atualiza inline styles dos spans imediatamente; emojis removidos do toast. | ~~🔴 Alta~~ |
| 203 | ADM-11 | Admin — Provisionamento | Botão "Abrir Wizard de Setup" abre página em branco — Wizard deveria funcionar como revisão/onboarding mesmo com provisionamento 100% concluído. Confirmado pelo usuário | 🟡 Média |
| 204 | ADM-12 | Admin — Acessos Pendentes | Botão "Visualizar Cadastro" leva para página externa em branco — endpoint de cadastro público não implementado ou URL GAS malformada. Confirmado pelo usuário | 🟡 Média |
| ~~205~~ | ~~ESP-16c~~ | Infraestrutura — Novo Espaço | ~~Default "Abertura/Fechamento" no modal "Novo Espaço" é 08:00–22:00 enquanto Config.Sistema registra expediente global 08:00–21:30 — discrepância de 30 min.~~ **CORRIGIDO @464**: inputs agora são `type=time`; valores padrão carregados via `GAS.admin.obterConfigExpediente()` no `requestAnimationFrame`; hint dinâmico `(global: HH:MM–HH:MM)` exibido ao lado do label; `salvarEspaco()` (backend) valida que horário local não ultrapasse os limites globais, lançando erro legível. | ✅ |
| ~~206~~ | ~~FIN-14~~ | Financeiro — FSM de Contrato | **CORRIGIDO s16 F17** — botões "Suspender" e "Encerrar" adicionados no card do contrato; modal de confirmação com campo de motivo obrigatório; auditoria registrada pelo backend; ícone `manage_accounts` → `description` para clareza | ~~🔴 Alta~~ |
| 207 | FIN-15 | Financeiro — "Ícone de pessoas" | O botão com ícone `manage_accounts` no card do contrato **não é** ícone de equipe vinculada — é o botão que abre o painel de detalhes completo do contrato (Plano de Trabalho, Pessoal, Indicadores, Plano de Contas, Histórico). O ícone `manage_accounts` (pessoa com engrenagem) é ambíguo: pode sugerir "gerenciar pessoas" quando na verdade abre "gerenciar plano de trabalho". Deveria ser `description` (documento) ou `folder_open` para maior clareza | 🔵 Baixa |
| ~~209~~ | ~~FIN-16~~ | Financeiro — Pessoal (painel) | ~~Card "Custo Mensal" ausente nas métricas~~ **CORRIGIDO s17 F45**: `_renderPessoal` agora soma `p.custoMensal` em `totMensal` e exibe 6º card "Custo Mensal" entre Provisões e Custo Total. | ~~🟡 Média~~ |
| ~~210~~ | ~~FIN-17~~ | Financeiro — Pessoal (cálculo) | **CORRIGIDO s16 F12** — dois bugs em `calcularCustoPessoal`: (1) `descontoVT` não era limitado ao valor do VT → quando VT=0, `vtLiq = 0 − 486,20 = −486,20`; corrigido para `descontoVT = Math.min(sal*0.06, valeTransporte)`. (2) `descontoPlano = planoSaude * 0.30` deduzia 30% indevidamente do plano de saúde; removido. Resultado agora: R$1.191,33 ✓ | ~~🔴 Alta~~ |
| 208 | CAR-01 | Reserva de Veículo — Auditoria | **Módulo NUNCA TESTADO na auditoria** — Fase 21 implementada (commit 236f309) com: reservas de veículo institucional, modal detalhes na agenda, vínculo com Ações. APR-05 (aba Veículo em "Carregando...") pode estar relacionado a este módulo. Priorizar teste visual completo | 🔴 Alta |
| ~~211~~ | ~~ESC-04~~ | Escuta — Aba Painel | **CORRIGIDO s16 F13** — `#escuta-painel-dimensoes` agora é populado via `_renderPainelDimensoes(gov)` no callback de `GAS.escuta.dados()`; loading infinito eliminado; estado sem dados substitui o spinner | ~~🔴 Alta~~ |
| ~~212~~ | ~~ESC-05~~ | Escuta — Gestão | **CORRIGIDO s16 F13** — `_carregarGovernanca()`: `g.qualidadeMetodologica` (objeto) separado do `q` (número); `g.fatores`→`qual.detalhes`; `g.motorMetodologico`→`g.motor`; `f.nome`→`f.msg`; `f.pontos`→`f.pts`. "object Object" eliminado | ~~🔴 Alta~~ |
| ~~213~~ | ~~ESC-06~~ | ~~Escuta — BtnGuard~~ | ~~Botão "+ Nova Pesquisa" preso em "Abrindo..."~~ | ✅ CORRIGIDO — `BtnGuard.liberar('btn-nova-pesquisa')` adicionado no Cancelar e no overlay click de `abrirFormPesquisa()` |
| ~~214~~ | ~~ESC-07~~ | ~~Escuta — DS~~ | ~~Botões "Salvar Configurações" e "Salvar Perfil" com cor rosa/pink~~ **CORRIGIDO s16 F39**: `btn-secundario` → `btn-primario` em ambos os botões de save. | ~~🟡 Média~~ |
| ~~215~~ | ~~ESC-08~~ | ~~Escuta — Arquitetura~~ | ~~Seção "MEU PERFIL ANALÍTICO" na aba Escuta Livre deve ser removida~~ **CORRIGIDO s17 F56 @460**: div, formulário demográfico, `_carregarFormPerfil`, `salvarPerfil`, GAS bindings e export removidos. Dados demográficos aguardam ESC-09 (tela "Meu Perfil" global). | ~~🔴 Alta~~ |
| 216 | ESC-09 | Sistema Global — Perfil | **Sistema sem área de perfil editável pelo usuário** — não existe "Meu Perfil" onde o colaborador possa cadastrar nome social (prioridade máxima), pronomes, raça/cor, foto. Dados do RH (cargo, setor, vínculo, admissão) devem ser somente leitura nessa tela. Afeta Escuta, saudações (SIS-11), avatar e campos de autoria em todo o sistema | 🔴 Alta |
| 217 | ESC-10 | Escuta — Alertas | Aba "Alertas" com estado vazio sem orientação — propósito CONFIRMADO: alertas automáticos de bem-estar por threshold. Problema: aba parece vazia e sem função enquanto não há dados suficientes. Precisa de: (a) estado vazio orientador explicando o propósito e como configurar; (b) configuração de thresholds por dimensão na aba Gestão | 🟡 Média |
| ~~218~~ | ~~ESC-11~~ | ~~Escuta — Distribuição~~ | ~~Saturação por Dimensão exibe IDs numéricos~~ **CORRIGIDO s16 F39**: `_carregarSaturacao()` reescrito para iterar `d.dimensoes` como array com `forEach`, exibindo `s.label || s.id` em vez de índice numérico. | ~~🟡 Média~~ |
| 219 | ESC-12 | Escuta — Documentação | Módulo sem documentação ou guia contextual integrado — complexidade metodológica (UWES, JDC, CVF, NR-1, saturação, ciclo de feedback) não documentada in-app; o próprio admin não compreende todas as abas. Precisa de tour, tooltips, glossário e manual in-app | 🔴 Alta |
| 220 | ESC-13 | Escuta — DS / Linguagem | Subtítulo "Clima organizacional · UWES · JDC · CVF · NR-1" usa siglas sem explicação — instância de SIS-08; substituir por linguagem orientada ao benefício ou adicionar tooltips nas siglas | 🟡 Média |
| 221 | ESC-14 | Escuta — Gestão | Contradição na seção MARCADORES METODOLÓGICOS — "Qualidade baixa — revisar" (problema) e "✅ Motor metodológico sem avisos." (tudo ok) na mesma seção sem distinção de contexto | 🟡 Média |
| 222 | ESC-15 | Escuta — Nova Pesquisa | Modal "Nova Pesquisa" extremamente minimalista (4 campos) — sem seleção de metodologia, sem banco de questões, sem configuração de participantes, sem periodicidade; não permite criar pesquisa utilizável | 🔴 Alta |
| ~~223~~ | ~~ESC-16~~ | Escuta — Modal | ~~Título "Editar Pesquisa" ao criar nova pesquisa~~ **JÁ ESTAVA CORRIGIDO**: `abrirFormPesquisa()` usa `(id?'Editar':'Nova') + ' Pesquisa'` — quando chamada sem id, título é "Nova Pesquisa". | ~~🟡 Baixa~~ |
| 224 | SIS-12 | Sistema Global — Nome Social | Sistema não implementa prioridade de nome social — todas as exibições de nome usam email ou iniciais; nome social (quando cadastrado) deve ter prioridade absoluta sobre nome registrado em: saudações, avatar, campos de autoria, listas, relatórios | 🔴 Alta |
| 225 | HUB-01 | Meu Centro — Produtividade | Aba Produtividade tem 5 cards de métricas sem MetricsToggle — único módulo com múltiplos cards numéricos fora do padrão obrigatório | ~~🟡 Média~~ |
| 226 | HUB-02 | Meu Centro — Meu Dia | Estado vazio usa emoji 🎉 — violação do padrão DS (sem emojis; usar Material Symbol) | ~~🟡 Média~~ |
| 227 | HUB-03 | Meu Centro — Meu Dia | Meu Dia não agrega pendências dos módulos — propósito prometido ("todas as suas pendências em um só lugar") não cumprido; tarefas atribuídas, aprovações, encaminhamentos não aparecem | 🔴 Alta |
| 228 | HUB-04 | Meu Centro — Meu Time | Aba Meu Time com estado vazio textual simples sem ícone nem orientação do propósito da aba | ~~🟡 Média~~ |
| 229 | HUB-05 | Meu Centro — Produtividade | Cards com unidades embutidas no valor ("0h", "0d") — inconsistência com padrão do sistema que separa valor numérico de unidade | 🔵 Baixa |
| 230 | HUB-06 | Meu Centro | Título exibe "TaskHub" na UI — nome interno de desenvolvimento vaza para o usuário final; rótulo público deve ser apenas "Meu Centro de Controle" | ~~🟡 Média~~ |
| 231 | HUB-07 | Meu Centro | Integração de fontes não implementada — tarefas, aprovações e encaminhamentos existentes no sistema não aparecem no Meu Dia | 🔴 Alta |
| 232 | HUB-08 | Meu Centro | Sem botão de criação de tarefa — com módulo Tarefas absorvido no Meu Centro, header atual só tem "Atualizar"; necessário "+ Nova Tarefa" com picker de responsável | 🔴 Alta |
| 233 | HUB-09 | Meu Centro — Meu Time | Aba Meu Time subutilizada — exibe apenas estado vazio sem mostrar colaboradores do setor com tarefas agrupadas por pessoa | 🔴 Alta |
| 234 | HUB-10 | Meu Centro — Produtividade | Cards de Produtividade com bordas e formato diferente do stats-strip padrão do sistema — inconsistência estrutural | ~~🟡 Média~~ |
| 235 | HUB-11 | Meu Centro | Modelo de dados heterogêneo necessário — cada item do Meu Dia precisa carregar: tipo de origem, ID da entidade, ação requerida, prazo, prioridade; clicar deve navegar ao módulo de origem | 🔴 Alta |
| 236 | HUB-12 | Meu Centro — Aniversariantes | Sem seção de aniversariantes — todos devem ver aniversariantes do dia; RH/gestores devem ver com 7 dias de antecedência para registrar dayoff automático | 🔴 Alta |
| 237 | HUB-13 | Meu Centro — Dayoff | Sem workflow de dayoff de aniversário — dayoff é benefício automático garantido; falta: tipo "Dayoff de Aniversário" em Afastamentos, pré-preenchimento com data de nascimento, geração de ausência justificada no Ponto | 🔴 Alta |
| 238 | SIS-13 | Sistema Global — Task Federation | Campo "responsável" como texto livre é bloqueador arquitetural — Task Federation Universal exige campos resolúveis a partir da base de usuários; TAR-02, CHV-05, ACO-14, REU-02/b/c, EMP-03, CON-01, PES-02 inviabilizam a federação | 🔴 Alta |
| 239 | SIDEBAR-04 | Sidebar | Consolidação global necessária — ~20 itens reduzíveis para ~10–11: Tarefas→Meu Centro, Aprovações→Meu Centro, Balcão→Comunicação, RH+Pessoas+Ponto→Pessoas&RH, Agentes+Acervo+Voluntários+Parcerias→Memória Cultural, Auditoria+Observabilidade→Sistema | 🔴 Alta |
| 240 | SIDEBAR-05 | Sidebar | Meu Centro posicionado no meio do grupo GESTÃO — deve ser posição #2 na sidebar (imediatamente após Home) para todos os papéis | 🟡 Média |
| 241 | HOME-04 | Home | Home sem widget de Meu Centro — deveria exibir mini-resumo "X tarefas · Y aprovações · Z encaminhamentos" para orientar o usuário ao entrar no sistema | 🟡 Média |
| 242 | AFT-08 | Afastamentos | Sem tipo "Dayoff de Aniversário" em Afastamentos — falta: tipo específico, pré-preenchimento com data de nascimento, geração automática de ausência justificada no Ponto | 🟡 Média |
| 243 | PES-16 | Pessoas | Campo "data de nascimento" não confirmado no formulário de colaborador — necessário para funcionalidade de aniversariantes no Meu Centro (HUB-12) | 🔴 Alta |
| 244 | CAR-02 | Reserva de Veículo — Sidebar | Nomenclatura inconsistente: sidebar exibe "Reserva de Carro" enquanto a view exibe "Reserva de Veículo" — dois nomes distintos para o mesmo módulo | ~~🟡 Média~~ |
| 245 | CAR-03 | Reserva de Veículo — Métricas | Métricas incompletas — 4 cards (Pendentes, Aprovadas, Concluídas, Total) sem "Recusadas" e "Canceladas"; gestor não visualiza rapidamente o resultado das solicitações rejeitadas | ~~🟡 Média~~ |
| 246 | CAR-04 | Reserva de Veículo — Formulário | Select "Vincular a uma Ação" persiste em "— Carregando ações... —" sem timeout — possível loading infinito quando não há ações; deveria exibir "Nenhuma ação disponível" | ~~🟡 Média~~ |
| ~~247~~ | ~~CAR-05~~ | Reserva de Veículo — Datas | **CORRIGIDO 2026-06-03** — aba Aprovações > Veículo: `carregarCarros()` exibia `rc.data` cru sem formatação (`escaparHtml(rc.data\|\|'—')`); corrigido para `escaparHtml(fmtDataPtBR(rc.data)\|\|'—')` — index.html:13084 | ~~🟡 Média~~ |
| 248 | CAR-06 | Reserva de Veículo — Identidade | Card na lista exibe email do solicitante (joao.barros@idm.org.br) em vez do nome completo — instância de SIS-11 | 🟡 Média |
| 249 | CAR-07 | Reserva de Veículo — Identidade | "Aprov: joao.barros" no card — abreviatura + email em vez de "Aprovado por: João Barros" com nome completo — instância de SIS-11 | 🟡 Média |
| 250 | CAR-08 | Reserva de Veículo — Modal Detalhes | Modal de detalhes omite setor, passageiros, observação e ação vinculada — o contexto completo da viagem fica invisível; usuário vê apenas data, horário, rota e aprovador | 🔴 Alta |
| 251 | CAR-09 | Reserva de Veículo — Passageiros | Campo PASSAGEIROS como texto livre sem distinção entre internos (deveriam ter picker da base de usuários com autocomplete) e externos (nome livre). Confirmado pelo usuário como gap funcional | 🔴 Alta |
| 252 | CAR-10 | Reserva de Veículo — Rota | Sem paradas intermediárias — formulário tem apenas Local de Saída e Local de Chegada; viagens com múltiplas paradas (CCBJ → Secretaria → Prefeitura → CCBJ) não são representáveis. Confirmado pelo usuário | 🔴 Alta |
| 253 | CAR-11 | Reserva de Veículo — Validação | Formulário não bloqueia datas ou horários passados no frontend — validação apenas no backend. Usuário confirmou: reservas em datas/horários passados não devem ser permitidas. Equivalente de ESP-17 para veículo | 🔴 Alta |
| 254 | CAR-12 | Reserva de Veículo — Motorista | **Feature de motorista configurável — desativada por padrão (decisão arquitetural confirmada).** Comportamento padrão: sem motorista — solicitante é o próprio condutor. Quando a organização ativa a feature em Configurações, é possível cadastrar N motoristas (nome + disponibilidade). O formulário de reserva exibe campo de seleção de motorista **somente quando a feature está ativa**. Implementação necessária: (a) toggle "Motoristas" no Admin/Config; (b) CRUD de motoristas com nome e disponibilidade; (c) campo condicional no formulário de reserva; (d) registro do motorista no modelo de dados e no modal de detalhes | 🔴 Alta |
| ~~261~~ | ~~CAR-15~~ | Reserva de Veículo — Papéis de Aprovação | **CORRIGIDO s16 F16** — `_podAprovar()` em `reserva_carro_engine.gs` reescrita: `superadmin` e `infraestrutura` aprovam sempre; `gestor`/`admin` apenas se `setor === 'infraestrutura'` (verifica `_getRegistro(email).setor`). Gestor de outra área não pode mais aprovar | ~~🟡 Média~~ |
| 260 | CAR-14 | Reserva de Veículo — Frota | **Feature de veículos configurável — desativada por padrão (decisão arquitetural confirmada).** Comportamento padrão: sem registro de veículo — frota não especificada. Quando ativada em Configurações, é possível cadastrar N veículos com suas informações (modelo, placa, capacidade, demais dados). O formulário de reserva exibe campo de seleção de veículo **somente quando a feature está ativa**. Quando ativa, o sistema pode checar disponibilidade por veículo (conflito de datas/horas). Padrão idêntico ao CAR-12 (motorista). Implementação necessária: (a) toggle "Veículos" no Admin/Config; (b) CRUD de veículos com modelo, placa e informações; (c) campo condicional no formulário de reserva; (d) verificação de conflito por veículo ao checar disponibilidade | 🔴 Alta |
| 255 | CAR-13 | Reserva de Veículo — Voucher Uber | Sistema não suporta solicitação de voucher Uber — fluxo necessário: vínculo à rubrica de transporte do setor, aprovação do gestor responsável e/ou gestor financeiro, retorno com link do voucher por email e no sistema. Confirmado pelo usuário como funcionalidade esperada | 🔴 Alta |
| ~~256~~ | ~~SIS-14~~ | Sistema Global — Datas | **CORRIGIDO s16 F11+F15 + auditoria sistêmica 2026-06-03** — F11: Reserva de Veículo (cards + modal). F15: Financeiro (vigências + histórico), RECE (tabela), Escuta (pesquisas). `fmtDataPtBR()` aplicada sistematicamente. Auditoria 2026-06-03: (1) Aprovações > Veículo — `carregarCarros()` corrigido (CAR-05); (2) `ia_service.gs:69,306,389` + `mapa_controller.gs:99,160,164` — timezone `'America/Fortaleza'` substituído por `getOrgConfig().timezone` para seguir config da org. Varredura completa de todos os 153 arquivos: nenhuma outra ocorrência de data sem pt-BR em output de UI. | ~~🟡 Média~~ |
| 257 | FIN-18 | Financeiro — Rubricas / Voucher Uber | **Vínculo rubrica ↔ Voucher Uber deve ser flag configurável por rubrica — não hardcode.** Instância específica do padrão geral FIN-20. O fluxo CAR-13 (solicitação de voucher) exibe apenas rubricas do setor do solicitante com a flag `voucher_uber` ativa | 🔴 Alta |
| 259 | FIN-20 | Financeiro — Rubricas / Flags de Operação | **Sistema de flags de operação configuráveis por rubrica — padrão arquitetural geral.** Flags definem quais tipos de operação podem ser solicitadas contra uma rubrica específica. Devem ser criadas e gerenciadas dinamicamente (Admin → Config Financeiro ou similar) — não hardcoded. Cada rubrica pode ter zero ou mais flags. Ao iniciar qualquer solicitação no sistema, o seletor de rubrica filtra automaticamente pelas rubricas do setor do solicitante que possuem a flag correspondente ativa. Casos de uso confirmados: (1) `voucher_uber` — Voucher Uber (CAR-13 / FIN-18); (2) `contratacao` — Contratações; (3) `compra_direta` — Compras; (4) `pagamento` — Pagamentos avulsos. A lista de flags é aberta — novos tipos de operação criados no futuro não exigem alteração de código, apenas criação de nova flag e atribuição às rubricas elegíveis | 🔴 Alta |
| 262 | ~~ACV-01~~ | Acervo — View | ~~Galeria permanente Carregando~~ **CORRIGIDO s16 Fase 7**: error handler explícito adicionado em `AcervoUI.carregar()`. | ~~🔴 Alta~~ |
| ~~263~~ | ~~ACV-07~~ | Acervo — Modal | **CORRIGIDO s16 F14** — populate de ações agora tem error handler explícito; select mostra "Nenhuma ação disponível" quando falha; opção padrão "Conteúdo institucional" sempre presente | ~~🔴 Alta~~ |
| ~~264~~ | ~~ACV-08~~ | Acervo — Formulário | **CORRIGIDO s16 F14** — campo "Título / Nome do arquivo *" adicionado como primeiro campo do formulário; validação obrigatória no frontend e backend; exibido no card da galeria | ~~🔴 Alta~~ |
| 265 | ACV-02 | Acervo — DS | Botão "Cancelar" no modal com cor rosa/pink — instância de ESC-07/BAL-13; deveria ser `btn-secondary` cinza | ~~🟡 Média~~ |
| 266 | ACV-03 | Acervo — DS | Stats-strip sem MetricsToggle — 2 cards presentes mas sem componente obrigatório de toggle. Instância de HUB-01 | ~~🟡 Média~~ |
| ~~267~~ | ~~ACV-04~~ | Acervo — Filtros | ~~Sem botão refresh~~ **CORRIGIDO s16 F40**: botão com ícone MS `refresh` adicionado na filter-bar; chama `AcervoUI.carregar()`. | ~~🟡 Média~~ |
| 268 | ACV-05 | Acervo — DS | Filtros sem classe DS — apenas `style="..."` inline, sem `filter-bar` nem `toolbar`. Instância de SIS-06 | 🟡 Média |
| ~~269~~ | ~~ACV-06~~ | ~~Acervo — DS~~ | ~~Cabeçalho usa padrão misto `h2.view-titulo`~~ **CORRIGIDO s17 F55 @458** junto com ACO-11. | ~~🟡 Média~~ |
| ~~270~~ | ~~ACV-09~~ | Acervo — DS | ~~Emojis nos selects de tipo~~ **CORRIGIDO s16 F40**: emojis removidos dos labels dos selects de filtro; `_TIPO_ICONE` migrado para nomes de ícones MS. | ~~🟡 Média~~ |
| 271 | ACV-10 | Acervo — DS | Formulário com estilos 100% inline — todos os labels, inputs e selects usam `style="..."`, sem classes DS (`form-label`, `form-input`…). Pior que ACO-12 | 🟡 Média |
| ~~272~~ | ~~ACV-11~~ | Acervo — Arquitetura | **CORRIGIDO s16 F14** — `acaoId` removido como obrigatório: frontend (`salvar()`) e backend (`_validar()`) não mais bloqueiam sem `acaoId`; select padrão = "— Conteúdo institucional (sem vínculo) —"; campo `nome` agora é o campo obrigatório para identificar o arquivo | ~~🔴 Alta~~ |
| 273 | ~~AGN-01~~ | Agentes Culturais — Sincronização | ~~Sync quebrada Admin→sidebar~~ **CORRIGIDO s16 Fase 6**: `_MODULOS_MENU` usava `modulo:'MASTER'` para Agentes e Voluntários; corrigido para `modulo:'AGENTES'` e `modulo:'VOLUNTARIOS'` respectivamente. | ~~🔴 Alta~~ |
| ~~274~~ | ~~CON-08~~ | ~~Contratações — Salvar~~ | ~~"Salvar Rascunho" falha com "lerJSON is not defined"~~ | ✅ CORRIGIDO — `lerJSON()` adicionada como alias de `readJSON()` em `data_layer.gs` |
| 275 | CON-09 | Contratações — Parcelas | **Campo "Atividade/Evento" nas parcelas é texto livre desvinculado** — sem conexão com as atividades reais do Plano de Trabalho (Meta→Atividade→Rubrica); impede rastrear qual atividade cada parcela financia | 🔴 Alta |
| 258 | FIN-19 | Financeiro — Rubricas / Modelo de Dados | **Campo Setor deve migrar da Memória de Cálculo para o nível da Rubrica.** Uma mesma rubrica dentro de uma mesma meta pode ser registrada mais de uma vez, cada entrada vinculada a um setor diferente. Exemplo: Rubrica "Transporte" na Meta A → R$5.000 Setor Ação Cultural + R$3.000 Setor Comunicação. O sistema deve consolidar duplamente: (a) **total global da rubrica** (R$8.000, sem decomposição — para comparação com o orçamento do contrato); (b) **total por setor** (R$5.000 Ação Cultural / R$3.000 Comunicação — para gestão interna de custo por setor). O campo Setor na Memória de Cálculo (FIN-01, corrigido) trata de um nível errado — a granularidade correta é rubrica × setor, não item-de-memória × setor | 🔴 Alta |
| 153 | ADM-02 | Admin — Permissões | PERMISSÕES POR MÓDULO no modal de edição de usuário cobre apenas VER/EDITAR/EXCLUIR por módulo — sem granularidade por funcionalidade, setor ou recurso. V1 era mais completo. Confirmado pelo usuário | 🔴 Alta |
| 154 | ADM-03 | Admin — Usuários | Campo SETOR no modal "Editar usuário" não carregava inicialmente (dropdown vazio) — mesmo padrão sistêmico de campos não integrados com a base de setores (CHV-06, EMP-03, TAR-02, ACO-03) | 🟡 Média |
| 155 | ADM-04 | Admin — Banco de Dados | Aba "Banco de Dados" visível para Admin mas inacessível — exibe erro "Permissão insuficiente: Apenas Admin ou Superadmin podem executar esta operação". Aba deveria ser oculta para não-SuperAdmin | 🟡 Média |
| 156 | ~~PUL-01~~ | Pulse — FAB | ~~Pulse FAB não completa submissão~~ **CORRIGIDO** (commits e20ba60 + b6d8098): submissão funciona; design v1 restaurado (card branco, gradiente primary); pergunta e dimensão extraídas corretamente; feedback imediato ao clicar; tela de agradecimento com auto-close 2.5s; guard anti-duplo-clique. **Testar novamente para confirmar no browser.** | ~~🔴 Alta~~ |
| 157 | ~~PUL-02~~ | Pulse — Linguagem | ~~Terminologia técnica exposta~~ **CORRIGIDO** (commit e20ba60): sem termos técnicos — "Uma pergunta rápida" / "Suas respostas são anônimas". | ~~🟡 Média~~ |
| ~~276~~ | ~~PUL-03~~ | Pulse — Anti-spam | ~~Pulse aparece em todo refresh de página~~ **CORRIGIDO s17 @426**: `registrarRespostaPulse` salvava `colaboradorId: null` quando anônimo, tornando o filtro `r.colaboradorId === email` ineficaz. Fix: `colaboradorId` sempre persiste; `anonima` só controla exibição em relatórios. | ~~🔴 Alta~~ |
| ~~277~~ | ~~PUL-04~~ | Pulse — Turnos temporais | ~~TURNOS hardcoded~~ **CORRIGIDO s17 @424 → definitivo @446**: `escuta_pulse.gs` agora usa `_getTurnosNumericos()` que lê `ConfigService.getTurnos()` em runtime — se não configurado, fallback para defaults. AB01 `tipoTempo` corrigido de `acumulativa` → `final`. Config `antiSpamHoras`/`limiteDia` lidos de `escutaConfig`. | ✅ |
| ~~278~~ | ~~PUL-05~~ | Pulse — Monitoramento | ~~Colaborador com respostas aparecia como "sem atividade pulse no período"~~ **CORRIGIDO s17 @424**: mesma raiz do PUL-03 (colaboradorId null). Com o fix do PUL-03, `idsComAtividade` passa a encontrar as respostas corretamente. | ~~🔴 Alta~~ |
| ~~279~~ | ~~PUL-06~~ | Pulse — Privacidade | ~~Monitoramento exibia lista de nomes de quem não respondeu ao Pulse~~ **CORRIGIDO s17 @426**: backend retorna apenas contagem numérica (`totalSemAtividade`); frontend exibe "N de X colaboradores sem atividade" sem nomes. Nota explicativa "Os nomes não são exibidos — o Pulse é anônimo por design" adicionada. | ~~🔴 Alta~~ |
| 280 | ESC-17 | Escuta — Pesquisas formais | **Modal "Nova Pesquisa" sem indicação do significado do anonimato** CORRIGIDO s17 @426 — melhorado com painel explicativo; modal de preenchimento agora exibe badge "ANÔNIMA"/"IDENTIFICADA" + aviso colorido ao colaborador sobre o tipo de pesquisa. Pendente: pesquisas não-anônimas ainda permitem o respondente marcar como anônimo; definir se o campo `anonima` da pesquisa é mandatório (força todos) ou apenas default. | 🟡 Média |
| ~~151~~ | ~~ACO-27~~ | ~~Ações — FSM / DS~~ | ~~Botões de transição com cores hardcoded (`btn-success`, `btn-error`, `btn-warning`)~~ **CORRIGIDO s17 F55 @458**: `_PROX_STATUS` usa `btn-primary` (positivas: Iniciar Produção, Iniciar Execução, Concluir) e `btn-secondary` (neutras/destrutivas: Cancelar, Voltar, Arquivar). | ~~🟡 Média~~ |
| ~~152~~ | ~~ACO-28~~ | ~~Ações — FSM~~ | ~~Sem formulário de encerramento ao clicar "Concluir"~~ **CORRIGIDO s17 F54 @456 — modal de encerramento intercepta transição `em_execucao→concluida`: público atingido + realizações + observações + comprovações (chips URL/desc); backend salva `acao.encerramento` no JSON** | ~~🔴 Alta~~ |
| ~~93~~ | ~~SIS-03~~ | ~~Sistema Global — DS~~ | ~~Dois classes de botão primário coexistindo~~ **CORRIGIDO s17 F53 @454** | ~~🟡 Média~~ |
| ~~94~~ | ~~SIS-04~~ | ~~Sistema Global — DS~~ | ~~Três classes de aba ativa coexistindo~~ **CORRIGIDO s17 F53 @454** | ~~🟡 Média~~ |
| ~~95~~ | ~~SIS-05~~ | ~~Sistema Global — DS~~ | ~~Três padrões de cabeçalho de view coexistindo~~ **CORRIGIDO s17 F53 @454** | ~~🟡 Média~~ |
| 96 | SIS-06 | Sistema Global — DS | Dois padrões de barra de filtros coexistindo: `filter-bar` e `toolbar` — mesmo papel visual, dois nomes de classe | 🟡 Média |
| 97 | SIS-07 | Sistema Global — DS | Dois padrões de variáveis de cor em stat-cards: `var(--color-warning)` e `var(--warning)` (aliases entre si) — usados intercambiavelmente sem convenção definida | 🟡 Baixa |

---

## ESTRUTURA VISUAL POR MÓDULO / ABA

> Registro da anatomia de cada tela auditada — para comparação de padrões e planejamento de unidade visual.

---

### Home
- `[título] Boas-vindas`
- Stats-grid: 4 cards (espaços cadastrados, setores ativos, módulos ativos, status do sistema)
- Seção de acesso rápido: 3 atalhos fixos (Nova Ação, Infraestrutura, Financeiro)
- Sem header de view padronizado

---

### Sidebar
- Logo + nome da org (topo)
- Nome do usuário + papel (avatar)
- Lista plana de ~18 itens de menu (sem agrupamento semântico)
- Alguns itens com badge de contador (Aprovações, Alertas)
- Botão de recolher (272px ↔ 64px)

---

### Tarefas
- `[view-header] Tarefas`
- Stats-strip com MetricsToggle
- Filter bar: status select + prioridade select + botão refresh
- `+ Nova Tarefa`
- Lista de cards com badge de status + prioridade

---

### Pessoas — Colaboradores
- Módulo "Pessoas": 3 abas (Colaboradores | Afastamentos | Ocorrências) — **quebra esperada da aba principal**
- Módulo "RH / Depto. Pessoal": 11 abas quebrando em 3 linhas (sem padrão)
- Formulário: campos nome, email, setor, cargo, vínculo, admissão, salário base, benefícios, salário total (read-only)

---

### Ponto Eletrônico
- View com abas internas: Ponto | Espelho | AFD | Custo CLT | Rescisão | Banco de Horas
- Abas Custo CLT e Rescisão deslocadas (pertencem ao DP)

---

### Infraestrutura (view geral)
- `[page-header] Infraestrutura` + subtítulo "Reservas, chaves, patrimônio e almoxarifado"
- MÉTRICAS nível-1 (topo da view, colapsável via MetricsToggle): 4 cards — Reservas ativas, Chaves em aberto, Chaves atrasadas, Ativos disponíveis
- 5 abas inline: **Reservas | Chaves | Empréstimos | Patrimônio | Configurações**

---

### Infraestrutura — Aba Reservas
- MÉTRICAS nível-2 (dentro da aba, colapsável): cards de Pendentes, Confirmadas, Em uso, etc.
- 4 botões de modo de view: **Lista | Agenda | Diagrama | Mapa**
- **Modo Lista:** filter bar (status select + date input + sort select + refresh) + `+ Nova Reserva`; cards de reserva com: nome, espaço, data, horário, turno, tipo, email, observações, badge de status + botões de ação FSM
- **Modo Agenda:** grade semanal 7 colunas, navegação `< >`, filtro de espaço, scroll vertical
- **Modo Diagrama:** linhas por espaço, barras coloridas por status, filtros busca/espaço/data; label lateral não-sticky (ESP-01)
- **Modo Mapa:** planta interativa, filtros data/zona/status, legenda de cores

---

### Infraestrutura — Aba Empréstimos
- MÉTRICAS nível-2 (colapsável): 4 cards — Itens no catálogo | Pendentes/Aprovados | Em uso | Atrasados
- Lista "Empréstimos": filter dropdown (Todos) + refresh + `+ Solicitar`; estado vazio funcional ✅
- **Formulário "Solicitar Empréstimo"**: painel inline (não modal), campos: Item (select — catálogo vazio), Quantidade (number), Data de Retirada (date), Data de Devolução (date), Setor (texto livre), Observações (textarea); botões: Cancelar | Solicitar

### Infraestrutura — Aba Chaves
- MÉTRICAS nível-2 (colapsável): 4 cards — Total de protocolos | Em aberto | Atrasados | Devolvidos
- "Protocolos de Chave": filter dropdown (Em aberto / Todos / Devolvidos…) + refresh + `+ Nova Retirada`
- Cards de protocolo: nome do espaço, email, data retirada, data prevista devolução, badge status + botão "Devolver"
- **Formulário "Nova Retirada"**: painel inline (não modal overlay), abre acima da lista com botão ✕; campos: Sala/Espaço (texto* — deveria ser dropdown), Nome do Responsável (texto — deveria ser usuário do sistema), Setor (texto — deveria ser dropdown), Turno (select ✅), Previsão de Devolução (date — falta campo de hora opcional), Observações (textarea); botões: Cancelar | Registrar Retirada

---

### Aprovações
- `[page-header] Aprovações` + subtítulo "Reservas e acessos aguardando avaliação"
- 4 abas inline: **Reservas de Espaço | Primeiros Acessos | Veículo | Permissões** — sem badge de contador por aba (APR-01)
- Aba Reservas de Espaço: seção "Solicitações de Reserva" + filter dropdown (Pendentes) + refresh; lista vazia quando sem solicitações

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
| 2026-06-01 | **CORREÇÕES s16 Fases 19–22** | ACO-02 (responsável sem @ não renderizado — guard `indexOf('@')>=0`). ACO-03 (`usuarioSetor` no bootstrap → setor pré-selecionado em Nova Ação). CHV-03 (devolução: `prompt()` → modal inline com select condição + textarea obs). ESP-02 (filtro data reservas: default hoje removido → lista mostra tudo quando campo vazio). APR-04 já estava corrigido desde s16 Fase 1. Deploy @387. |
| 2026-06-01 | **CORREÇÕES s16 Fases 6–11** | AGN-01+ADM-10 (sync módulos/features — `_MODULOS_MENU` com chaves corretas + toggle com feedback visual imediato). ACV-01 (error handler em `carregar()`). CON-03+CON-04 (cascata Meta→Rubrica: `m.titulo` e `atividades[*].rubricas`). MAP-01 (merge preserva contornos `livre`, verifica sobreposição). MAP-02+MAP-03 (isolamento z-index + `cbVoltar` navega de volta para 'acoes'). SIS-14 (datas ISO→pt-BR em Reserva de Veículo via `fmtDataPtBR()`). Deploy @380. |
| 2026-06-01 | **CORREÇÕES s16 Fases 12–17** | F12/FIN-17: `calcularCustoPessoal` — `descontoVT=Math.min(sal*0.06,vt)` (elimina vtLiq negativo quando VT=0) + remoção de `descontoPlano` (30% indevido). F13/ESC-04+ESC-05: `_renderPainelDimensoes(gov)` criada; `_carregarGovernanca` corrigida (campos corretos: `qual.pontos`, `qual.detalhes`, `g.motor`). F14/ACV-07+08+11: select ações com error handler; campo `nome` adicionado; `acaoId` opcional (frontend+backend). F15/SIS-14: `fmtDataPtBR()` aplicada em vigências contratos/fontes, datas RECE, histórico de versões, datas pesquisas Escuta. F16/CAR-15: `_podAprovar()` verifica `papel+setor` para gestor/admin. F17/FIN-14: botões Suspender/Encerrar no card do contrato + modal de confirmação com motivo obrigatório. Deploy @383. |
| 2026-06-01 | **CORREÇÕES s16 Fases 1–5** | APR-04, SIS-09 parcial (BAL-17+ESC-06+ACO-05), ACO-16, CON-05 (ContratadosUI), CON-08+PES-01 (`lerJSON` alias em data_layer.gs — resolve ~40 chamadas sem definição). Deploy @369. |
| 2026-05-31 | Estruturação inicial | Roteiro criado; análise de código mapeou 49 módulos/subáreas a auditar |
| 2026-05-31 | Home + Sidebar | Home: informações admin-only (espaços/setores/módulos/status) + acessos rápidos fixos. Sidebar: muito extensa, sem agrupamento — dificulta navegação. |
| 2026-05-31 | Sidebar (aprofundamento) + Tarefas | Sidebar: superadmin vê todos os itens (Reuniões, Ponto, Balcão, Dashboard). "Perfis Fantasma" e preview de Primeiro Acesso foram solicitados mas não implementados. Tarefas: email de responsável sem autocomplete, sem vínculos com módulos, sem gatilhos ou alertas. |
| 2026-05-31 | Pessoas/RH — Colaboradores | ERRO CRÍTICO: lista não carrega. Email/setor não integrados. Cálculo de salário errado. Dados duplicados entre Pessoas e Financeiro. Fluxo de cadastro invertido (deveria ser PCCS→Financeiro→Pessoa). Sem histórico de colaborador. Sem número de registro. |
| 2026-05-31 | Pessoas — Férias, Afastamentos, Ocorrências | Férias: sem período aquisitivo/concessivo, sem fluxo solicitação/aprovação, sem banco de dias, sem sigilo. Afastamentos: sem docs anexados, sem CID oficial, sem alertas inteligentes, sem sigilo. Ocorrências: sem contador no card, sem indicador profissional. Estrutural: Pessoas + RH/DP devem ser unificados. |
| 2026-05-31 | Holerite, Encargos, Ponto, Escalas | Holerite: acessível mas bloqueado por PES-01. Encargos: ✅ funcional. Ponto: sub-abas erradas (Custo CLT/Rescisão pertencem ao DP), sem exportação AFD, sem vínculo com escala. Escalas: estrutura insuficiente — gestor precisa montar escala completa; falta workflow de troca com aprovação e geração de tarefas. |
| 2026-05-31 | Infraestrutura — Reservas (FSM completo), Aprovações (parcial), Chaves, Empréstimos (parcial) | Reservas: FSM completo testado (Pendente→Confirmada→Habilitada→Em uso→Concluída) ✅ com latência em cada transição. Pós-evento: não aparece ao concluir (ESP-28). Auto-confirmação ausente (ESP-26). Aprovações: 4 abas sem indicador de aba com pendência (APR-01). Chaves: prompt() nativo na devolução (CHV-03); formulário com campos sem integração (CHV-04 a CHV-08); bug de localização na data (CHV-01); possível bug no contador "Atrasados" (CHV-02). Empréstimos: módulo desvinculado das reservas (EMP-01); sem suporte a empréstimo externo com CPF, termo e LGPD (EMP-02 a EMP-07). 56 ocorrências de prompt()/confirm() nativos no sistema (SIS-01). Total acumulado: 87 problemas. Nova tarefa pendente: integrar sistema de estoque existente ao ERP — usuário compartilhará imagens do sistema atual. |
| 2026-05-31 | Ações Culturais (ACO-11 a ACO-24) + RECE (RECE-01 a RECE-09) | Unidade visual: 5 problemas Ações + 5 sistêmicos DS. Formulário "Nova Ação": 9 campos mapeados elemento a elemento. Bug ✕ → modal edição (ACO-16). Conexões Ações × módulos: mapa completo. RECE: decisão arquitetural completa — publicação via botão, auditoria Comunicação, pré-condição materiais, IA revisão textual + marketing de eventos, integração com Balcão, 9 campos específicos RECE levantados do v1. Total acumulado: 115 problemas. |
| 2026-06-01 | RECE (decisão de posicionamento + integração Agenda RECE) + Painel da Ação (abas internas) | RECE: publicação manual via formulário em agendarece.cultura.ce.gov.br; API Agenda RECE futura; módulo RECE vive dentro de Comunicação (junto com Balcão), não isolado; 9ª aba "Comunicação" no painel da Ação (RECE + Balcão contextualizados); 3 novos gaps RECE-10/11/12; ACO-25. Painel da Ação: todas as 8 abas testadas no sistema real — Tarefas/Reservas/Contratos/Equipe: estados vazios ✅; Financeiro: R$0,00 ✅; Contratações: carrega ✅ mas botão "+ Nova Contratação" inoperante (ACO-07r); Mapa do Evento: 2 mapas funcionais ✅. Rastreador de testes reais criado no roteiro para evitar repetição. Total acumulado: 120 problemas. |
| 2026-06-01 | Mapa do Evento (bugs) + Comunicação/RECE (view real) + Balcão (view + modal completo) + Sidebar (estrutura real) + Diretrizes metodológicas | Mapa: MAP-01 mesclar destrói contornos (ambos editores); MAP-02/03 bugs de sobreposição e navegação; ACO-26 regra arquitetural — tudo abre sobre Ações. RECE view: carrega ✅, FSM sem revisão (RECE-04 confirmado), botão criação incorreto (RECE-16), sem modo Agenda (RECE-17), datepicker quebrado (RECE-15). Sidebar: 4 grupos confirmados (GESTÃO/OPERACIONAL/MEMÓRIA/SISTEMA); Comunicação e Balcão separados (SIDEBAR-02); módulos inativos visíveis (SIDEBAR-03). Balcão: view ✅; modal "Nova Demanda" mapeado campo a campo — BAL-06 a BAL-18 (campos sem integração, FSM incompleto sem aprovação final, BtnGuard preso, layout deficiente). SIS-09 BtnGuard sistêmico, SIS-10 layout modais sistêmico, SIS-08 jargão técnico na UI. Metodologia de auditoria formalizada no roteiro: Claude dirige, não o usuário. Total acumulado: 150 problemas. |
| 2026-06-01 (sessão 7) | Painel da Ação — TRANSIÇÕES DE STATUS (gap de registro corrigido) | TRANSIÇÕES confirmadas via screenshot sessão anterior não registradas: "Em Execução" → Concluir (verde) + Cancelar (vermelho/pink). ACO-27: cores dos botões de transição divergem do DS. ACO-28: ausência de formulário de encerramento ao Concluir — equivalente de ESP-28 para Ações. Total acumulado: 152 problemas. |
| 2026-06-01 (sessão 7 — continuação) | Revisão completa de todas as imagens de sessões anteriores (110 imagens) + correcoes.md | Gaps de registro corrigidos. Admin módulo 43 documentado (ADM-02/03/04). Pulse módulo 32 complementado (PUL-01/02 com diagnóstico técnico BUG-UI-01). correcoes.md cruzado: APR-02/03, FIN-01 a FIN-08 pré-documentados antes do teste visual. PES-04/05/06 e PFANTASMA/PREVIEW-01 confirmados pelo documento. Total acumulado: 167 problemas. |
| 2026-06-01 (sessão 8) | Financeiro — Contratos (mod-16) — teste visual completo | View carrega com 4 abas (Contratos/Remanejamentos/Aditivos/Exportações — código dizia "Fontes de Recurso" mas UI substitui por "Exportações"). Aba Exportações não documentada anteriormente: 3 ferramentas de prestação de contas federais (SALIC/XML, PNAB/CSVs, SNIIC/CSV) — funcionalidade diferenciada. Painel do contrato: 5 abas (Plano de Trabalho, Pessoal, Indicadores, Plano de Contas, Histórico) — toda estrutura mapeada. FIN-01 CONFIRMADO (Setor "—" em todas as linhas da Memória de Cálculo). FIN-03 NEGADO (view read-only existe via ícone 👁). FIN-07 CONFIRMADO (Valor em aberto = valor total previsto, label ambíguo). 5 novos problemas: FIN-09 (Fonte de Recurso sem gestão independente), FIN-10 (Subtotal truncado), FIN-11 (sem execução financeira — gap crítico), FIN-12 (histórico apenas metadados, sem diff nem reversão), FIN-13 (card Valor Aditivado exibe "—"). Total acumulado: 172 problemas. |
| 2026-05-31 (sessão 9) | Reuniões (mod-35) — teste visual completo da view e modal | View carrega ✅: 6 cards métricas com MetricsToggle ✅ (REU-01: 6º card isolado em 2ª linha), 2 abas (Lista/Encaminhamentos), toolbar padrão Nova, estado vazio ✅, zero TypeErrors no console. Modal "Nova Reunião" mapeado em 5 abas: Dados (7 campos, anti-padrão texto livre em "Convocado por" — REU-02; layout — REU-03; ACO-21 confirmado), Pauta (sem estado vazio — REU-04), Presença (botões sem distinção visual — REU-05), Ata (emojis em botões — REU-06), Encaminhamentos (layout comprimido — REU-07). Gap crítico FSM: backend tem 7+ estados, UI cobre apenas 5 (REU-08). Ata: aprovação coletiva por participantes (REU-09), notificação automática (trigger), não-bloqueante com possibilidade de correção; IA para geração/revisão/extração de encaminhamentos (REU-10, REU-11). Tarefas vs Meu Centro: decisão arquitetural registrada em s9 — posteriormente revertida em s12 (Tarefas absorvido pelo Meu Centro). REU-12 atualizado. Encaminhamentos precisam de notificação (REU-13). Total acumulado: 192 problemas. |
| 2026-05-31 (sessão 9 — cont.) | Aprovações (mod-36) — teste visual completo + SIS-11 | APR-02 NEGADO: SuperAdmin acessa normalmente ✅. APR-04: tab ativa sem marcação visual — CSS não define `.tab-btn.active` (só `.ativa` e `.tab-ativa`). APR-05: aba Veículo presa em "Carregando...". APR-06: cabeçalho usa padrão antigo. APR-03 revisado: aba Permissões existe mas mostra todos os usuários ativos, não pendências. SIS-11: saudações e avatar usam email/iniciais — sistema tem nomes completos cadastrados (Permissões mostra "João Barros", "THAIS FREITAS DOS SANTOS", "RENAN BRAZ") mas não os usa em greeting, avatar e campos de autoria. Total acumulado: 196 problemas. |
| 2026-05-31 (sessão 10 — cont.) | Revisão de correções via git log + análise de código Financeiro | Git log cruzado com roteiro: **PUL-01, PUL-02 CORRIGIDOS** (commits e20ba60, b6d8098: Pulse design v1, submissão funciona, sem termos técnicos, feedback imediato). **FIN-01, FIN-02, FIN-04, FIN-05, FIN-08 CORRIGIDOS** (commit 0e9317f). FIN-03 já estava negado. **APR-02 CORRIGIDO** (restrição ESPACOS removida). **APR-03 CORRIGIDO** (aba Permissões criada, mas mostra todos usuários — parcialmente). Análise de código revelou: FIN-14 (FSM do contrato via select no form, sem botões dedicados), FIN-15 (ícone manage_accounts ambíguo), CAR-01 (módulo Reserva de Veículo — Fase 21 — nunca testado na auditoria). Total acumulado: 208 problemas. Nota: muitos itens marcados como "CORRIGIDO" precisam de teste visual para confirmar funcionamento. |
| 2026-05-31 (sessão 10) | Admin (mod-43) — todas as 10 abas + 4 modais testados visualmente | Estrutura completa do Admin mapeada: 10 abas (Espaços/Setores/Turnos/Categ.Itens/Módulos/Features/Provisionamento/Usuários/Config.Sistema/Banco de Dados). NOVOS POSITIVOS: Modal "Novo Espaço" já tem horário por espaço implementado (Abertura/Fechamento 08:00–22:00) ✅ e Responsáveis por Período ✅. Identidade Visual com extração automática de cores e derivadas ✅. Aba Banco de Dados com 8 atalhos de planilhas ✅. NOVA DESCOBERTA: seção "Funcionalidades Específicas" no modal de edição de usuário com controles granulares por funcionalidade (5 grupos: COMUNICAÇÃO, TAREFAS, PESSOAS, REUNIÕES, AÇÕES) — ADM-02 REVISADO. NOVOS BUGS confirmados: ADM-10 (toggles Features inoperantes), ADM-11 (Wizard abre página vazia), ADM-12 (Visualizar Cadastro abre página em branco). REORGANIZAÇÃO arquitetural confirmada: Turnos + Config.Sistema Expediente → unificar; Categ.Itens → migrar para Estoque (ADM-08, ADM-09). ESP-16c: default 22:00 em Novo Espaço diverge do expediente global 21:30. Total acumulado: 205 problemas. |
| 2026-05-31 (sessão 11) | Escuta Institucional (mod-32) — todas as 6 abas testadas visualmente + observações do usuário | Painel: loading infinito (ESC-04); Evolução do Clima e Pesquisas Formais com estados vazios ✅. Escuta Livre: Relato Espontâneo ✅; "MEU PERFIL ANALÍTICO" deve ser removido (ESC-08) — dados demográficos devem vir do perfil cadastral. Alertas: propósito não comunicado nem ao administrador (ESC-10) — hipótese de alertas de threshold de bem-estar a confirmar. Distribuição: Saturação por Dimensão com IDs numéricos em vez de nomes (ESC-11). Relatórios: funcional quando houver dados ✅. Gestão: "object Object" nos Marcadores Metodológicos (ESC-05); Banco de Perguntas Pulse com dimensões e taxas ✅; Monitoramento 18imp/2resp/11% taxa ✅. REGRA CRÍTICA (usuário): sistema precisa de "Meu Perfil" editável — nome social com prioridade absoluta, pronomes, raça/cor, foto (ESC-09, SIS-12). Modal "+ Nova Pesquisa" minimalista e com BtnGuard preso (ESC-15, ESC-06). Módulo complexo sem guia contextual integrado (ESC-12). Total acumulado: 224 problemas. |
| 2026-05-31 (sessão 12) | Meu Centro / TaskHub (mod-38) — estrutura completa mapeada + decisões arquiteturais globais | Estrutura: 3 abas (Meu Dia / Meu Time / Produtividade), todas em estado vazio. HUB-01 a HUB-13 registrados. DECISÕES CRÍTICAS: (1) Tarefas absorvido no Meu Centro — Meu Dia = inbox pessoal; Meu Time = visão gestora com criação/atribuição; usuários não-gestores também atribuem tarefas a outros. (2) Task Federation Universal — qualquer entidade com "responsável" gera item no Meu Centro do responsável (fontes: Tarefas, Aprovações, Encaminhamentos, Balcão, Ações, Reservas, Contratações, Empréstimos, Almoxarifado). (3) SIS-13 BLOQUEADOR: campos de responsável como texto livre inviabilizam a federação — correção é pré-condição. (4) Navegação: Home #1 (institucional) · Meu Centro #2 (pessoal). (5) Aniversariantes: todos veem no dia; RH/gestores veem com 7 dias de antecedência para registrar dayoff automático (AFT-08). (6) Consolidação global da sidebar: ~20 → ~10–11 itens (mapa completo registrado). Total acumulado: 243 problemas. |
| 2026-05-31 (sessão 14) | APR-05 resolvido + Acervo Digital (mod-25) — primeira auditoria | APR-05 CORRIGIDO: aba Veículo em Aprovações carrega normalmente (era transiente). Acervo: galeria presa em "Carregando..." (ACV-01) + modal abre mas select de ação vazio (ACV-07). Regra crítica capturada: acervo é GERAL — finalístico (vinculado a ações) + institucional (fotos do espaço, docs históricos, materiais avulsos) — mas código atual exige acaoId obrigatório, bloqueando conteúdo institucional (ACV-11). 12 novos problemas → total 272. |
| 2026-05-31 (sessão 15) | Acervo LGPD flow + Agentes Culturais (AGN-01) + Contratações FSM (bloqueado) | Acervo LGPD: feature configurável, desativada por padrão — campo informativo quando off; fluxo formal de verificação quando on (ACV-12). Agentes Culturais: sync quebrada entre Admin (módulo Ativo) e app (badge inativo + acesso bloqueado) — AGN-01; lista completa de 20 módulos no Admin documentada; Voluntários tem mesmo bug. ADM-10 refinado: toggles Features sem resposta visual alguma ao clique. Contratações: tentativa de salvar rascunho → "lerJSON is not defined" (CON-08 Crítico — módulo inutilizável para escrita); parcelas com atividade texto livre desvinculada do Plano de Trabalho (CON-09); CON-03 e CON-04 reconfirmados. 4 novos problemas → total 275. |
| 2026-05-31 (sessão 13) | Reserva de Veículo (mod-34) + decisões arquiteturais Financeiro (FIN-18/19) | Módulo Veículo auditado pela primeira vez: Lista + FSM ✅; datas ISO (SIS-14); email em vez de nome (CAR-06/07); modal omite contexto (CAR-08); passageiros sem distinção (CAR-09); sem paradas (CAR-10); sem bloqueio passado (CAR-11); sem motorista (CAR-12); voucher Uber como novo fluxo (CAR-13). Financeiro: FIN-18 — flag "aceita Voucher Uber" configurável por rubrica (não hardcode). FIN-19 — Setor deve sair da Memória de Cálculo e subir para nível de Rubrica; mesma rubrica pode ser lançada múltiplas vezes por setor diferente; consolidação dupla obrigatória (total global + total por setor); FIN-01 foi corrigido no nível errado. SIS-14 (datas pt-BR) confirmado sistêmico. 15 novos problemas → total 258. |

---

## LOCALIZAÇÃO DO ARQUIVO

- **Plano local (Claude Code):** `/home/jpbarros/.claude/plans/prompt-auditoria-mighty-hejlsberg.md`
- **No projeto (versionado):** `docs/auditoria/roteiro-auditoria.md`

O arquivo em `docs/auditoria/` é a cópia rastreada pelo git — fonte de verdade para qualquer ambiente.
Após cada sessão: copiar o conteúdo atualizado para `docs/auditoria/roteiro-auditoria.md` e fazer commit.

---

*Este documento é a fonte única de verdade da auditoria. Atualizar a cada sessão de análise.*

---

## HANDOFF — SESSÃO 17 (2026-06-02) → SESSÃO 18

### Estado atual: 280 problemas registrados · Deploy @426

### O que foi corrigido nesta sessão (s17)

| Deploy | IDs | O que foi corrigido |
|---|---|---|
| @424 | PUL-03, PUL-04, PUL-05 | **Anti-spam quebrado**: `registrarRespostaPulse` salvava `colaboradorId: null`, tornando todos os filtros de anti-spam/monitoramento cegos. Fix: `colaboradorId` sempre persistido; `anonima` flag controla apenas exibição. TURNOS atualizados para 8-12/12-17/17-21.5. AB01 `tipoTempo` `acumulativa`→`final`. `_lerConfigPulse()` lê `antiSpamHoras`/`limiteDia` do `config_org.json`. |
| @426 | PUL-06, ESC-17 | Monitoramento não expõe mais nomes de quem não respondeu — apenas contagem. Modal "Nova Pesquisa" com painel explicativo de anonimato. View de resposta com badge ANÔNIMA/IDENTIFICADA + aviso colorido ao respondente. |

### Bugs ativos importantes (não corrigidos)
- **FIN-17** (cálculo de benefícios incorreto)
- ~~**SIS-14**~~ (datas ISO) — **RESOLVIDO** 2026-06-03: auditoria sistêmica completa; único ponto remanescente era Aprovações > Veículo — corrigido
- **FIN-19** (Setor na Rubrica — nível errado)
- **FIN-20** (flags de operação configuráveis por rubrica)
- **CON-09** (campo Atividade nas parcelas — texto livre desvinculado do Plano de Trabalho)
- **ESC-17** (pesquisas não-anônimas ainda permitem override pelo respondente — decisão arquitetural pendente)

### PRÓXIMA PERGUNTA A FAZER (IMEDIATA)

> "O subtítulo de Contratações menciona 'Portal LGPD'. O que é esse portal — é uma área pública onde fornecedores podem solicitar exclusão dos seus dados do sistema, ou tem outro propósito?"

### Sequência após essa pergunta

1. **Contratações — Portal LGPD** ← PRÓXIMA
2. **Agentes Culturais** — AGN-01 corrigido; testar se view carrega agora
3. **Dashboard Executivo (mod-41)** — nunca testado
4. **Estratégia — Objetivos e KPIs (mod-30/31)** — nunca testado
5. **Voluntários** — verificar se AGN-01 fix também resolve Voluntários

### Instruções para o próximo Claude
1. Ler roteiro completo antes de qualquer pergunta
2. Verificar Rastreador de Testes Reais antes de pedir algo já testado
3. Claude dirige — não esperar direção do usuário
4. Uma pergunta por vez
5. Deploy corrente: `@426`

---

## HANDOFF — SESSÃO 16 (2026-06-01) → SESSÃO 17

### Estado atual: 275 problemas registrados · Deploy @380

### O que foi corrigido nesta sessão (s16 Fases 6–11)

| Fase | IDs | O que foi corrigido |
|---|---|---|
| 6 | AGN-01, ADM-10 | `_MODULOS_MENU` usava `modulo:'MASTER'` para Agentes/Voluntários (corrigido para `'AGENTES'`/`'VOLUNTARIOS'`); toggles de features atualizam visual imediatamente |
| 7 | ACV-01 | `AcervoUI.carregar()` agora exibe erro no DOM em vez de falhar silenciosamente |
| 8 | CON-03, CON-04 | Cascata Meta: `m.nome` → `m.titulo\|\|m.nome`; Rubrica: lê `atividades[*].rubricas` em vez de `meta.rubricas` (campo vazio) |
| 9 | MAP-01 | Merge verifica sobreposição antes de mesclar; formas `livre` concatenam pts em coords absolutas em vez de criar bounding box |
| 10 | MAP-02, MAP-03 | Container do mapa usa `position:absolute;inset:0`; `cbVoltar` navega de volta para `'acoes'` se view mudou durante o editor |
| 11 | SIS-14↗ | Datas ISO→pt-BR via `fmtDataPtBR()` em cards e modal de Reserva de Veículo (fix parcial — sistêmico pendente) |

### Bugs ativos importantes (não corrigidos)
- **FIN-17** (Benefícios R$525,74 vs R$1.191,33)
- ~~**SIS-14**~~ (datas ISO) — **RESOLVIDO** 2026-06-03: auditoria sistêmica completa (153 arquivos)
- **FIN-19** (Setor na Rubrica — nível errado)
- **FIN-20** (flags de operação configuráveis por rubrica)
- **CAR-15** (papel + setor para aprovações de infra)
- **CON-09** (campo Atividade nas parcelas — texto livre desvinculado do Plano de Trabalho)

### PRÓXIMA PERGUNTA A FAZER (IMEDIATA)

> "O subtítulo de Contratações menciona 'Portal LGPD'. O que é esse portal — é uma área pública onde fornecedores podem solicitar exclusão dos seus dados do sistema, ou tem outro propósito?"

### Sequência após essa pergunta

1. **Contratações — Portal LGPD** ← PRÓXIMA
2. **Agentes Culturais** — AGN-01 corrigido; testar se view carrega agora
3. **Dashboard Executivo (mod-41)** — nunca testado
4. **Estratégia — Objetivos e KPIs (mod-30/31)** — nunca testado
5. **Voluntários** — verificar se AGN-01 fix também resolve Voluntários

### Instruções para o próximo Claude
1. Ler roteiro completo antes de qualquer pergunta
2. Verificar Rastreador de Testes Reais antes de pedir algo já testado
3. Claude dirige — não esperar direção do usuário
4. Uma pergunta por vez
5. Deploy corrente: `@380`

---

## HANDOFF — SESSÃO 14 (2026-05-31) → SESSÃO 15

### Estado atual: 272 problemas registrados

### O que foi feito nesta sessão (s14)

**APR-05 (Aprovações → aba Veículo):**
- Carrega normalmente — problema era transiente (loading ainda em andamento quando o screenshot foi feito em s9). Problema fechado.

**Acervo Digital (mod-25) — primeira auditoria:**
- View carrega ✅; galeria presa em "Carregando..." permanente (ACV-01); métricas exibem "—"
- Console: apenas Warden (101 issues) + ▲5 avisos — sem TypeErrors
- Modal "Adicionar ao Acervo" abre ✅; select "Ação vinculada" vazio (ACV-07); botão Cancelar rosa/pink (ACV-02)
- ACV-01 a ACV-11 registrados (11 novos problemas)

**Regra crítica capturada — Escopo do Acervo:**
- Acervo é GERAL: finalístico (registros de ações culturais → vinculáveis a uma Ação) + institucional (fotos do espaço, docs históricos, materiais avulsos → sem ação)
- Código atual exige `acaoId` obrigatório → bloqueia conteúdo institucional (ACV-11 🔴)
- Campo "Ação vinculada" deve ser opcional

**Pergunta pendente (respondida pela metade):**
- Status LGPD do acervo: é campo informativo ou fluxo de aprovação? → **NÃO RESPONDIDA** — sessão encerrada antes da resposta

### PRÓXIMA PERGUNTA A FAZER (IMEDIATA)

> "O status LGPD no acervo ('não verificado / autorizado / restrito / sem pessoas') é apenas um campo informativo que qualquer um pode preencher, ou existe um **fluxo de verificação** — alguém responsável por checar se as pessoas nas fotos autorizaram o uso e atualizar o status formalmente?"

### Sequência após fechar o Acervo

1. **Acervo — LGPD flow** ← PRÓXIMA
2. **Agentes Culturais (mod-24)** — nunca testado
3. **Contratações — FSM completo + Portal LGPD** — pendente desde s6
4. **Dashboard Executivo (mod-41)** — nunca testado
5. **Estratégia — Objetivos e KPIs (mod-30/31)** — nunca testado

---

## HANDOFF — SESSÃO 13 (2026-05-31) → SESSÃO 14

### Estado atual: 261 problemas registrados

### O que foi feito nesta sessão (s13)

**Reserva de Veículo (mod-34) — primeira auditoria completa:**
- View carrega sem erros ✅; console Warden apenas ✅
- Lista: card APROVADA com FSM operacional (Concluir/Cancelar) ✅; datas ISO (SIS-14), email em vez de nome (CAR-06/07)
- Agenda: grade mensal com reserva plotada em verde ✅; "+" por célula para criação rápida ✅
- Modal de detalhes: rota visual com ícones O/📍 ✅; omite setor/passageiros/observação/ação (CAR-08)
- Formulário: setor integrado como select ✅; passageiros texto livre sem distinção interno/externo (CAR-09); sem paradas de rota (CAR-10); sem bloqueio frontend de passado (CAR-11); sem motorista (CAR-12); select de ação persiste em "Carregando" (CAR-04)
- CAR-02 a CAR-13 registrados (12 novos problemas)

**Decisões de domínio confirmadas nesta sessão:**

1. **Passageiros internos e externos** — campo PASSAGEIROS precisa suportar picker de colaboradores (internos) e nome livre (externos); atualmente é um campo de texto único sem distinção (CAR-09)

2. **Paradas intermediárias na rota** — formulário só suporta origem e destino; viagens com múltiplas paradas não são representáveis — gap funcional confirmado pelo usuário (CAR-10)

3. **Data/hora passada bloqueada** — reservas de veículo não podem ser criadas para datas ou horários já decorridos; validação só existe no backend; falta bloqueio no frontend. Confirmado pelo usuário. Equivalente de ESP-17 para veículo (CAR-11)

4. **Voucher Uber** — novo fluxo esperado além do veículo institucional: solicitação vinculada à rubrica de transporte do setor, aprovação do gestor responsável e/ou gestor financeiro, retorno com link do voucher por email e no sistema. Confirmado pelo usuário (CAR-13)

5. **SIS-14 (sistêmico)** — todas as datas do sistema devem exibir padrão pt-BR (DD/MM/AAAA), não ISO (AAAA-MM-DD). Confirmado pelo usuário. Auditoria sistêmica necessária em todos os módulos

**Novos problemas s13:** CAR-02 a CAR-15 (14), SIS-14 (1), FIN-18 (1), FIN-19 (1), FIN-20 (1) = **18 novos → total 261**

### DECISÕES ARQUITETURAIS ACUMULADAS (manter neste handoff)

1. **Task Federation Universal** — Tarefas, Aprovações, Encaminhamentos, Balcão, Ações, Reservas, Contratações, Empréstimos/Chaves, Almoxarifado geram item no Meu Centro do responsável
2. **Tarefas absorvido no Meu Centro** — módulo desaparece da sidebar
3. **Aprovações absorvido no Meu Centro** — filas admin migram para Admin
4. **Navegação: Home #1 · Meu Centro #2** para todos os papéis
5. **Aniversariantes no Meu Dia** — todos: do dia; RH/gestores: com 7 dias de antecedência; dayoff é automático
6. **SIS-13 (bloqueador crítico)** — responsável texto livre inviabiliza Task Federation; converter TAR-02, CHV-05, ACO-14, REU-02/b/c, EMP-03, CON-01, PES-02
7. **Consolidação sidebar** ~20 → ~10–11: Tarefas→Meu Centro | Aprovações→Meu Centro | Balcão→Comunicação | RH+Pessoas+Ponto→Pessoas&RH | Agentes+Acervo+Voluntários+Parcerias→Memória Cultural | Auditoria+Observabilidade→Sistema | Reserva de Veículo→aba de Infraestrutura

### PRÓXIMA PERGUNTA A FAZER (IMEDIATA)

mod-34 completamente fechado. Investigar APR-05 (aba Veículo em Aprovações presa em "Carregando...").

> "Acesse o módulo **Aprovações** e clique na aba **Veículo** — ainda aparece 'Carregando...' ou o problema mudou desde a última vez que você testou?"

### Sequência após essa pergunta

1. **Aprovações → aba Veículo** (APR-05) ← **PRÓXIMA**
2. **Acervo (mod-25)** — nunca testado
3. **Agentes Culturais (mod-24)** — nunca testado
5. **Contratações**: FSM completo + Portal LGPD
6. **Dashboard Executivo (mod-41)**
7. **Estratégia — Objetivos e KPIs (mod-30/31)**

### Instruções para o próximo Claude

1. Ler roteiro completo antes de qualquer pergunta — especialmente Rastreador de Testes Reais
2. Claude dirige a auditoria — não esperar direção do usuário
3. Uma pergunta por vez
4. Registrar achados no roteiro em tempo real
5. **FIN-17** (Benefícios R$525,74 vs R$1.191,33) — bug ativo confirmado, não corrigido
6. **PUL-01** CORRIGIDO e confirmado visualmente na s11 ✅
7. **SIS-14** (datas ISO vs pt-BR) — sistêmico; auditar cada módulo ao revisitá-lo
8. **CAR-13** (Voucher Uber) — novo fluxo confirmado; precisa análise de domínio completa
9. **APR-05** (aba Veículo "Carregando...") — investigar após resposta sobre motorista/frota
10. mod-34 FECHADO — todas as perguntas respondidas: ~~motorista~~, ~~veículos~~, ~~self-approval~~ (superadmin aprova tudo = intencional; CAR-15 registrado para papéis gestor/admin genéricos)
11. **FIN-19** — Setor sai da Memória de Cálculo e vai para nível de Rubrica; consolidação dupla (global + por setor); FIN-01 corrigido no nível errado
12. **FIN-20** — sistema de flags de operação configuráveis por rubrica (padrão geral): flags criadas dinamicamente no Admin, sem hardcode; casos confirmados: `voucher_uber`, `contratacao`, `compra_direta`, `pagamento`; FIN-18 é instância específica deste padrão
