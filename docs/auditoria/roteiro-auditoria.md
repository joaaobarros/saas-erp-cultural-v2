# AUDITORIA ERP Cultural SaaS v2 — Roteiro Vivo
> Deploy atual: @717 · ~265 bugs registrados (ver tabela abaixo para ativos)
> Claude dirige a auditoria — não perguntar qual módulo seguir.

---

## REGRAS DE ENCERRAMENTO DE FASE

> **Git ANTES do deploy.** Nunca deploar código sem commit.

```
1. Atualizar PROGRESS.md + roteiro-auditoria.md   ← PRIMEIRO
2. git add <código + docs>
3. git commit -m "fix/feat: Fase X.Y — ..."
4. clasp push
5. clasp deploy --deploymentId AKfycbzVKQ8fEMBZquOytumFLsb3dIx3DuIZh1cFYe4ywFCoMUXSFewuhZCpy-V8fjLkbe_j
6. Smoke test no browser
7. git push
```

### Checklist de auditoria antes do deploy
```
[ ] prompt()/confirm() — _raw separado, null-check antes do fallback
[ ] GAS.* namespace — todos os ctrl_* têm binding; editar despacha para atualizar
[ ] CSS — zero classes sem definição correspondente
[ ] IDs de DOM — regex de sanitização idêntica em todos os pontos
[ ] FsmGuardian.transitar() — chamado antes de toda atualizarStatus*()
[ ] Modais — background:var(--surface) opaco; overlay ≥ rgba(0,0,0,.4)
[ ] BtnGuard.auditar() — retorna "✅ todos protegidos"
[ ] Datas — toda data visível passa por fmtDataPtBR(); sem ISO cru
```

---

## RASTREADOR DE TESTES REAIS

> Antes de pedir ao usuário para testar algo, verificar esta tabela.
> **Legenda:** ✅ testado | 🔲 pendente | ⚠️ bug confirmado | ❌ não funciona

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
| Lista de colaboradores | ✅ PES-01 CORRIGIDO — lerJSON alias adicionado | 2026-06-01 |
| Formulário de colaborador | 🔲 | — |

### Módulo 05 — Afastamentos e Ocorrências
| Item | Status | Sessão |
|---|---|---|
| Testes completos | 🔲 | — |

### Módulo 06 — PCCS e Cargos
| Item | Status | Sessão |
|---|---|---|
| PCCS acessível em RH/DP | ✅ | 2026-05-31 |
| Estrutura de abas (11 abas, 3 linhas) | ⚠️ ESTR-02 | 2026-05-31 |

### Módulo 07 — Holerite
| Item | Status | Sessão |
|---|---|---|
| Acessível no menu | ✅ | 2026-05-31 |
| Testes completos | 🔲 | — |

### Módulo 08 — Encargos
| Item | Status | Sessão |
|---|---|---|
| Tabelas INSS/IRRF exibem dados atuais | ✅ | 2026-05-31 |

### Módulo 37 — Ponto Eletrônico
| Item | Status | Sessão |
|---|---|---|
| View carrega com abas | ✅ | 2026-05-31 |
| Sub-abas Custo CLT e Rescisão deslocadas | ✅ CORRIGIDO @PON-01 | 2026-06-08 |
| Importação AFD — 0 batidas confirmadas (layout posições erradas) | ✅ CORRIGIDO @707 | 2026-06-09 |
| reverterImportacao não removia brutos (bloqueava re-importação) | ✅ CORRIGIDO @707 | 2026-06-09 |

### Módulo 09 — Infraestrutura / Reservas
| Item | Status | Sessão |
|---|---|---|
| View carrega sem erro | ✅ | 2026-05-31 |
| Métricas nível-1 e nível-2 com MetricsToggle | ✅ | 2026-05-31 |
| Modo Lista, Agenda, Diagrama, Mapa | ✅ | 2026-05-31 |
| Formulário Nova Reserva | ✅ | 2026-05-31 |
| Modal Lote (4 sub-modos) | ✅ CORRIGIDO s17 F51 | 2026-06-03 |
| FSM completo (Pendente→Confirmada→Habilitada→Em uso→Concluída) | ✅ | 2026-05-31 |
| Config → Espaços, Itens, Horários, Mapa | ✅ | 2026-05-31 |
| Filtro data default = hoje | ✅ ESP-02 CORRIGIDO s16 | 2026-06-01 |

### Módulo 09 — Infraestrutura / Aprovações
| Item | Status | Sessão |
|---|---|---|
| 4 abas carregam | ✅ | 2026-05-31 |
| Sem badge de contador por aba | ⚠️ APR-01 | 2026-05-31 |

### Módulo 09 — Infraestrutura / Chaves
| Item | Status | Sessão |
|---|---|---|
| View carrega, métricas, lista de protocolos | ✅ | 2026-05-31 |
| Formulário Nova Retirada (setor/sala/responsável selects) | ✅ CORRIGIDO F60+61 @476 | 2026-06-03 |
| Devolução — modal inline | ✅ CHV-03 CORRIGIDO s16 @387 | 2026-06-01 |

### Módulo 09 — Infraestrutura / Empréstimos
| Item | Status | Sessão |
|---|---|---|
| View carrega, métricas, lista vazia | ✅ | 2026-05-31 |
| Formulário Solicitar Empréstimo (setor select) | ✅ EMP-03 CORRIGIDO F58+59 @474 | 2026-06-03 |

### Módulo 13 — Ações Culturais / Lista e Kanban
| Item | Status | Sessão |
|---|---|---|
| Kanban carrega, métricas, filtros | ✅ | 2026-05-31 |
| Formulário Nova Ação (form-control/form-label) | ✅ ACO-12/17/18/19/20 CORRIGIDOS s17 | 2026-06-03 |
| Modal Editar Ação | ✅ | 2026-05-31 |
| Botão Editar (caminho direto) | ✅ ACO-05 CORRIGIDO | 2026-06-01 |
| Card exibe "nm" quando responsável sem @ | ✅ ACO-02 CORRIGIDO s16 @387 | 2026-06-01 |
| Setor não auto-preenchido em Nova Ação | ✅ ACO-03 CORRIGIDO s16 @387 | 2026-06-01 |

### Módulo 13/14 — Painel da Ação (abas internas)
| Item | Status | Sessão |
|---|---|---|
| Painel abre na aba Visão Geral | ✅ | 2026-05-31 |
| Aba Tarefas, Reservas, Contratos, Equipe | ✅ estado vazio | 2026-06-01 |
| Aba Financeiro (3 cards R$ 0,00) | ✅ | 2026-06-01 |
| Aba Contratações (carrega; botão "+ Nova Contratação") | ✅ ACO-07r CORRIGIDO s17 F50 | 2026-06-01 |
| Aba Mapa do Evento | ✅ 2 mapas listados | 2026-06-01 |
| Transições de status — Visão Geral | ✅ | 2026-06-01 |

### Módulo 21 — Contratações
| Item | Status | Sessão |
|---|---|---|
| View carrega com MÉTRICAS e 3 abas | ✅ | 2026-06-01 |
| Formulário "+ Nova" — 7 seções | ✅ | 2026-06-01 |
| Vínculo Financeiro — META e RUBRICA | ✅ CORRIGIDO s16 Fase 8 | 2026-06-01 |
| Setor Solicitante → select | ✅ CON-01 CORRIGIDO s17 F49 | 2026-06-03 |
| Nº Esboço → gerado automaticamente | ✅ CON-02 CORRIGIDO s17 F49 | 2026-06-03 |
| Salvar rascunho | ✅ CON-08 CORRIGIDO | 2026-06-01 |
| FSM e painel de detalhe | 🔲 | — |
| Aba Fornecedores | ✅ CON-05 CORRIGIDO | 2026-06-01 |
| Aba Habilitações → Pregões | ✅ CON-06/07 CORRIGIDOS s17 F52 | 2026-06-03 |

### Módulo 35 — Reuniões
| Item | Status | Sessão |
|---|---|---|
| View carrega (6 cards, 2 abas, toolbar) | ✅ | 2026-05-31 |
| Modal "Nova Reunião" — 5 abas mapeadas | ✅ | 2026-05-31 |
| FSM completo | 🔲 sem dados | — |
| Fluxo criação → encerrar → ata | 🔲 pendente | — |

### Módulo 43 — Admin
| Item | Status | Sessão |
|---|---|---|
| View principal | ✅ | sessão anterior |
| Aba Espaços, Setores, Categ.Itens, Módulos, Usuários | ✅ | 2026-05-31 |
| Aba Turnos → movida para Infraestrutura Config | ✅ ADM-08 CORRIGIDO s17 @446 | 2026-06-03 |
| Aba Features (toggles) | ✅ ADM-10 CORRIGIDO s16 Fase 6 | 2026-06-01 |
| Aba Provisionamento (wizard) | ✅ ADM-11 CORRIGIDO s17 F63 @490 | 2026-06-03 |
| Aba Banco de Dados → oculta não-SuperAdmin | ✅ ADM-04 CORRIGIDO s17 F63 @490 | 2026-06-03 |
| Aba Identidade Visual | ✅ | 2026-06-03 |
| Tab bar com scroll sinalizado | ✅ ADM-07 CORRIGIDO s17 F44 @430 | 2026-06-02 |
| Botão "Visualizar Cadastro" | ❌ ADM-12 — página em branco | 2026-05-31 |

### Módulo 38 — Meu Centro / TaskHub
| Item | Status | Sessão |
|---|---|---|
| View carrega, 3 abas | ✅ | 2026-05-31 |
| Meu Dia, Meu Time, Produtividade — estados vazios | ✅ | 2026-05-31 |
| Meu Dia com dados reais | 🔲 pendente | — |

### Módulo 32 — Pulse / Escuta
| Item | Status | Sessão |
|---|---|---|
| Pulse FAB — submissão | ✅ CORRIGIDO (PUL-01/02) | 2026-05-31 |
| Pulse — anti-spam | ✅ PUL-03 CORRIGIDO s17 @426 | 2026-06-02 |
| Pulse — turnos por ConfigService | ✅ PUL-04 CORRIGIDO s17 @424 | 2026-06-02 |
| Pulse — monitoramento | ✅ PUL-05 CORRIGIDO @424 · PUL-06 apenas contagem @426 | 2026-06-02 |
| Aba Painel — loading infinito | ✅ ESC-04 CORRIGIDO s16 F13 | 2026-06-01 |
| Modal "+ Nova Pesquisa" (expandido) | ✅ ESC-15 CORRIGIDO s17 F65 @507 | 2026-06-04 |
| Guia contextual in-app | ✅ ESC-12 CORRIGIDO s17 F64 @505 | 2026-06-04 |
| Aba Alertas — card explicativo | ✅ ESC-10 CORRIGIDO s17 F63 @490 | 2026-06-03 |
| Perfil Analítico removido | ✅ ESC-08 CORRIGIDO s17 F56 @460 | 2026-06-03 |
| Pulse — clima por setor vazio | ✅ PUL-07 CORRIGIDO @631 | 2026-06-06 |
| Pulse — aprovação por catálogo Admin/Setores | ✅ PUL-08 CORRIGIDO @633 | 2026-06-06 |

### Módulo 16 — Financeiro
| Item | Status | Sessão |
|---|---|---|
| View carrega com 4 abas (Contratos, Remanejamentos, Aditivos, Exportações) | ✅ | 2026-06-01 |
| MÉTRICAS com MetricsToggle | ✅ | 2026-06-01 |
| Painel do contrato (5 abas) | ✅ | 2026-06-01 |
| Histórico — Ver diff + Restaurar versão | ✅ FIN-12 CORRIGIDO @637 | 2026-06-06 |
| FSM do contrato — botões Suspender/Encerrar | ✅ FIN-14 CORRIGIDO s16 F17 | 2026-06-01 |
| FIN-07 — label renomeado "Total Previsto Ativo" | ✅ CORRIGIDO s17 F62 @480 | 2026-06-03 |
| Setor na Rubrica (nível correto) | ✅ FIN-19 CORRIGIDO @631 — `setor` preservado no mapeamento de `memoriaCalculo` em `adicionarRubrica` | 2026-06-06 |
| Flags de operação configuráveis | ✅ FIN-20 CORRIGIDO @631 — checkbox `voucher_uber` no form; badge no card; `flags` em `dados` | 2026-06-06 |

### Módulo 22/23 — Comunicação (RECE + Balcão)
| Item | Status | Sessão |
|---|---|---|
| View RECE carrega (5 cards, lista, filtros) | ✅ | 2026-06-01 |
| FSM sem passo revisão Comunicação | ⚠️ RECE-04 | 2026-06-01 |
| Botão "+ Novo Registro RECE" (arquiteturalmente incorreto) | ❌ RECE-16 | 2026-06-01 |
| Sem modo Agenda | ❌ RECE-17 | 2026-06-01 |
| View Balcão carrega (6 cards, formulário) | ✅ | 2026-06-01 |
| Aprovação final do material entregue | ❌ BAL-16 ausente no FSM | 2026-06-01 |

### Módulo 24 — Agentes Culturais
| Item | Status | Sessão |
|---|---|---|
| Sync Admin→sidebar | ✅ AGN-01 CORRIGIDO s16 Fase 6 | 2026-06-01 |
| View carrega | 🔲 pendente verificação | — |

### Módulo 25 — Acervo Digital
| Item | Status | Sessão |
|---|---|---|
| View carrega | ✅ | 2026-05-31 |
| Galeria, select ação, campo nome | ✅ ACV-01/07/08/11 CORRIGIDOS s16 F7/14 | 2026-06-01 |
| Stats MetricsToggle, filtros DS, botão refresh | ✅ ACV-03/04/05 CORRIGIDOS s17 | 2026-06-02 |
| Fluxo de salvamento | 🔲 | — |

### Módulo 34 — Reserva de Veículo
| Item | Status | Sessão |
|---|---|---|
| View carrega (Lista + Agenda + MetricsToggle) | ✅ | 2026-05-31 |
| Datas ISO→pt-BR, nome no card | ✅ CAR-05 CORRIGIDO @474 | 2026-06-01 |
| Sidebar "Reserva de Veículo" | ✅ CAR-02 CORRIGIDO s17 F42 @428 | 2026-06-02 |
| FSM — botões Concluir / Cancelar | ✅ | 2026-05-31 |
| Modal detalhes, passageiros, paradas, CAR-12/14 | ✅ CAR-08/09/10 CORRIGIDOS @637+@638 | 2026-06-06 |

**Legenda:** ✅ confirmado · 🔲 pendente · ⚠️ problema · ❌ não funciona / arquiteturalmente errado

---

## HISTÓRICO COMPACTO DE IMPLEMENTAÇÕES

| Deploy | Fase | Resumo |
|---|---|---|
| @638 | CAR-09+CAR-10 | CAR-09: passageiros internos (select+tags) / externos (texto); backend passageirosInternos/Externos. CAR-10: paradas dinâmicas no form; rota.paradas[]; modal Saída→Paradas→Chegada com ícones dinâmicos |
| @637 | CAR-08+FIN-12 | CAR-08: linha "Setor Solicitante" no modal carro-det-overlay. FIN-12: histórico com diff modal + restauração de versão (backup automático antes de restaurar) |
| @584 | 79 | ctrl_reservas_criar: auto-cria SolicitacaoMaterial com reservaId (best-effort). Frontend: listarItens(estoque) no form de reserva; label "Materiais necessários"; toast com SOL-XXXX |
| @581 | 77 | TextFinder no DataGateway; cache em _getSheet; ESTOQUE key definitiva no repositório; schema Tipo+Tombado; devolverSolicitacao; ctrl_*_dashboard (4 módulos) |
| @579 | 76 | Compras/Aquisições migrado de Financeiro → Contratações; planilha MASTER→FINANCEIRO.SolicitacoesCompra; tab reposicionada |
| @566 | 75.1 | `migracao_estoque_v1.gs` (inspecionar + importar V1→V2). Dead code removido |
| @564 | 75 | `previsao_estoque_engine.gs` (taxaConsumo/cobertura/previsão). Sub-aba Pipeline. Alertas de estoque |
| @563 | 74 | `EstoqueUI` IIFE ~500 linhas. Tab Estoque em Infraestrutura com 5 sub-abas. `GAS.estoque` (15 bindings) |
| @561 | 73 | Backend Estoque: repositórios, engine, 15 ctrl_estoque_*. `fase73_estoque_prepararIndice()` |
| @550 | MAPA-MULTI | Multi-select nos mapas: Shift+click, rubber-band, Ctrl+C/V, Delete, Space+drag, grupo resize/rotate |
| @538 | ESP-FORM | `reservas-form-card` movido para fora de `res-modo-lista` — form visível em qualquer aba |
| @533 | PERM-01 | Agentes/Voluntários adicionados a `_MODULOS`/`_MATRIZ` em `permissoes_v2_engine.gs` |
| @519 | ESP-LOTE | Lote sincroniza form principal; `_atualizarDisponibilidadeSalas()` com optgroups |
| @518 | ESP/MAPA | Horário de espaço herdado do config global; viewBox +30px; paridade ferramentas mapa |
| @512 | CON-10 | Portal do Contratado: token + email automático ao fornecedor com link |
| @510 | SIM | `SimulacaoUI` IIFE + `simulacao_service.gs` + Ferramentas no Admin |
| @507 | ESC-15 | Modal "Nova Pesquisa" expandido (metodologia, periodicidade, participantes, canal) |
| @505 | ESC-12 | Guia contextual in-app na view Escuta |
| @490 | F63 | Wizard, Banco de Dados oculto, Alertas Escuta com card explicativo |
| @480 | F62 | FIN-07 renomeado; FIN-13 corrigido; ESC-11: saturação por dimensão |
| @476 | F60+61 | CHV/EMP/ACO: selects de espaço/responsável/setor |
| @474 | F58+59 | Setor→select em Chaves/Empréstimos/Ações; Tipo→select em Reservas |
| @466 | F57 | form-control/form-label em Ações; datepicker RECE contextualizado |
| @464 | F69 | Auto-confirmação reservas sem responsável; horário padrão do config |
| @460 | F56 | ESC-08 Perfil Analítico removido |
| @458 | F55 | `view-title`/`view-subtitle` em 7 módulos; ACO-27: cores FSM padronizadas |
| @456 | F54 | ACO-28: modal encerramento (público + realizações + comprovações) |
| @454 | F53 | DS global: botões/abas/cabeçalhos unificados |
| @446 | F51 | Lote ESP-13/15; Turnos → Infraestrutura; Config.Sistema consolidada |
| @430 | F44 | Tab bar nav (prev/next + fade); template de ata; SIS-11: nome no greeting |
| @428 | F42/43 | CAR-02; ACV: MetricsToggle, refresh, sem emojis |
| @426 | PUL | PUL-03/05/06: colaboradorId sempre persiste; monitoramento por contagem |
| @387 | F19-22 | ACO-02/03; CHV-03; ESP-02 corrigidos |
| @383 | F12-17 | FIN-17 cálculo benefícios; ESC-04/05; ACV-07/08/11; CAR-15; FIN-14 |
| @380 | F6-11 | AGN-01/ADM-10; ACV-01; CON-03/04; MAP-01/02/03; SIS-14 |
| @369 | F1-5 | ACO-16; CON-05/08; PES-01; lerJSON alias; APR-04 |

---

## BUGS ATIVOS

> Apenas não corrigidos. Bugs com ~~risco~~ foram removidos desta lista.

| ID | Módulo | Problema | Grav. |
|---|---|---|---|
| ~~HOME-01~~ | Home | ✅ CORRIGIDO — stats de sistema (espaços/setores/módulos/status) exibidas apenas para superadmin/admin; demais papéis veem cards contextuais | — |
| ~~HOME-02~~ | Home | ✅ CORRIGIDO — acesso rápido por papel: gestor/coordenador (Centro/Aprovações/Reuniões/Relatórios); colaborador (Centro/Tarefas/Reservar/Reuniões); admin (Nova Ação/Infraestrutura/Financeiro/Relatórios) | — |
| ~~HOME-03~~ | Home | ✅ CORRIGIDO — cards contextuais async: tarefas abertas, encaminhamentos pendentes, urgentes/vencidos, aprovações (gestor) ou alertas (colaborador); todos clicáveis navegando para a view correta | — |
| ~~HOME-04~~ | Home | ✅ CORRIGIDO — widget "Aniversariantes da Semana" exibido na home para todos exceto admin/superadmin; reutiliza `ctrl_taskhub_aniversariantes()` | — |
| SIDEBAR-01 | Sidebar | Menu muito extenso sem agrupamento semântico | 🟡 |
| ~~SIDEBAR-02~~ | Sidebar | ✅ CORRIGIDO @590 — Balcão removido do sidebar; cross-nav "Balcão" em view-comunicacao e "RECE" em view-balcao | — |
| ~~SIDEBAR-03~~ | Sidebar | ✅ VERIFICADO @648 — inativos ocultos para usuários comuns; superadmin vê com opacity .5 + tag "inativo"; badge começa `oculto` — nunca exibido sem dados reais | — |
| ~~SIDEBAR-04~~ | Sidebar | ✅ CORRIGIDO @614 — seção MEMÓRIA consolidada: 4 itens (Agentes, Acervo, Voluntários, Parcerias) → 1 item "Memória Institucional" com tab-bar interna; sidebar total ~17 itens | — |
| ~~SIDEBAR-05~~ | Sidebar | ✅ CORRIGIDO @590 — Meu Centro movido para posição #2 (após Início) | — |
| TAR-01 | Tarefas | Formulário com campos insuficientes | 🟡 |
| ~~TAR-02~~ | Tarefas | ✅ VERIFICADO @648 — `tf-responsavel` é `<select>` populado por `_carregarSelectUsuariosHelper` em `aoAbrir()`; nunca foi texto livre na v2 | — |
| ~~TAR-03~~ | Tarefas | ✅ CORRIGIDO @654 — form ganha campos Prazo + Vínculo (select tipo: Ação/Reserva/Contrato; select ID dinâmico carregado por `atualizarVinculo()` com cache). `criar()` passa `acaoId`/`reservaId`/`contratoId` ao backend. Engine + repository recebem os dois novos campos (`reservaId`, `contratoId`). Lista exibe badges de vínculo (Ação/Reserva/Contrato) e prazo. Header migrado para `view-header` DS. | — |
| ~~TAR-04~~ | Tarefas | ✅ CORRIGIDO — `TarefaEngine.verificarPrazos()` + trigger diário 08:00 (`criarTriggerVerificacaoPrazos()`); `TASK_DELAYED` notifica responsável por e-mail (uma vez por tarefa, via `atrasoNotificadoEm`); `TAREFA_CRIADA` notifica responsável ao ser atribuído por outra pessoa | — |
| TAR-05 | Tarefas | Sem alertas para vencimento | 🟡 |
| PFANTASMA | Admin | "Perfis Fantasma" solicitado mas não implementado | 🔴 |
| PREVIEW-01 | Admin | Preview de Primeiro Acesso com comportamento incerto | 🟡 |
| PES-02 | Pessoas | Email não integrado com base de usuários | 🔴 |
| PES-03 | Pessoas | Setor não integrado com base de setores | 🟡 |
| PES-04 | Pessoas | Cálculo de salário total incorreto | 🔴 |
| PES-05 | Pessoas/Financeiro | Dados salariais duplicados em 2 módulos | 🔴 |
| PES-06 | Pessoas | Fluxo de cadastro invertido (deveria ser PCCS→Financeiro→Pessoa) | 🔴 |
| PES-07 | Pessoas | Sem histórico completo do colaborador | 🔴 |
| PES-08 | Pessoas | Sem campo de número de registro | 🟡 |
| PES-09 | Pessoas | Sem número de registro do colaborador | 🟡 |
| PES-10 | Pessoas — Férias | Sem cálculo de período aquisitivo | 🔴 |
| PES-11 | Pessoas — Férias | Sem cálculo de período concessivo | 🔴 |
| PES-12 | Pessoas — Férias | Sem fluxo de solicitação/aprovação de férias | 🔴 |
| PES-13 | Pessoas — Férias | Sem suporte a acordo de férias | 🔴 |
| PES-14 | Pessoas — Férias | Sem débito de dias do banco | 🔴 |
| PES-15 | Pessoas — Férias | Sem controle de sigilo por papel | 🔴 |
| PES-16 | Pessoas | Campo "data de nascimento" não confirmado | 🔴 |
| AFT-02 | Afastamentos | Sem campo para anexar documentos | 🔴 |
| AFT-03 | Afastamentos | Sem registro a partir do card do colaborador | 🟡 |
| AFT-04 | Afastamentos | Sem métricas gerais | 🟡 |
| AFT-05 | Afastamentos | Sem alertas inteligentes por CID/recorrência | 🔴 |
| AFT-06 | Afastamentos | Campo CID como texto livre | 🔴 |
| AFT-07 | Afastamentos | Sem controle de sigilo | 🔴 |
| AFT-08 | Afastamentos | Sem tipo "Dayoff de Aniversário" | 🟡 |
| OCO-02 | Ocorrências | Sem acompanhamento inteligente / contador no card | 🟡 |
| OCO-03 | Ocorrências | Sem indicador de saúde profissional | 🟡 |
| ~~ESTR-01~~ | Pessoas/RH | ✅ CORRIGIDO @590 — `pessoas` e `ponto` removidos do sidebar; `rh` renomeado "Pessoas / RH"; cross-nav Fichas/Ponto em view-rh | — |
| ESTR-02 | Sistema | Layout de abas inconsistente entre módulos | 🟡 |
| ~~PON-01~~ | Ponto | ✅ CORRIGIDO — Abas "Custo CLT" e "Rescisão" removidas do módulo Ponto (pertencem ao RH/DP via RhUI) | — |
| PON-03 | Ponto | Sem exportação AFD | 🔴 |
| PON-04 | Ponto | Sem vínculo com escala | 🔴 |
| ESC-01 | Escalas | Escalas simples — sem escala completa por colaborador | 🔴 |
| ESC-02 | Escalas | Sem workflow de troca de escala | 🔴 |
| ESC-03 | Escalas | Trocas de escala não geram tarefas | 🟡 |
| SIS-01 | SISTEMA | `prompt()`/`confirm()` nativos — CORRIGIDO @591 | ✅ |
| SIS-06 | Sistema | Dois padrões de filter bar: `filter-bar` e `toolbar` | 🟡 |
| SIS-07 | Sistema | Duas variáveis de cor para stat-cards intercambiáveis | 🔵 |
| SIS-08 | Sistema | Jargão técnico na UI (SLA, FSM, webhook, endpoint) | 🟡 |
| ~~SIS-10~~ | Sistema | ✅ CORRIGIDO @594+@617 — @594: rece/run/bl modais; @617: carro-modal, cd-meta-modal, cd-pes-modal, cd-indr-modal | — |
| SIS-12 | Sistema | Nome social sem prioridade absoluta sobre nome registrado | 🔴 |
| SIS-13 | Sistema | Campo "responsável" texto livre — CORRIGIDO @596 (5 campos → select) | ✅ |
| ESP-03 | Infraestrutura — Lista | Filtros inconsistentes entre modos | 🟡 |
| ESP-05 | Infraestrutura — Reserva | Sem vínculo com Ação Cultural | 🔴 |
| ESP-06 | Infraestrutura — Reserva | Sem suporte a espaço externo | 🔴 |
| ESP-07 | Infraestrutura — Reserva | "Tipo de Ação" comportamento incorreto (dual) | 🔴 |
| ESP-09a | Infraestrutura — Reserva | Catálogo de itens vazio — itens precisam ser cadastrados | 🟡 |
| ESP-09b | Infraestrutura — Reserva | Itens fixos do espaço ausentes do formulário | 🔴 |
| ESP-11 | Infraestrutura — Diagrama | Apenas 9 dos 17 espaços no Diagrama | 🟡 |
| ESP-12 | Infraestrutura — Dados | "Espaço de Feiras" sem capacidade definida | 🟡 |
| ESP-17 | Infraestrutura — Formulário | Desabilitar datas passadas no datepicker (UI feedback) | 🟡 |
| ESP-18 | Infraestrutura — Config Itens | Aba "Itens" mostra apenas categorias, não itens individuais | 🔴 |
| ESP-19 | Infraestrutura — Espaços | Três conjuntos divergentes (36 / 17 / 9 espaços) | 🔴 |
| ESP-23 | Infraestrutura — Card | Card sem itens solicitados, itens fixos, vínculos com Ação | 🔴 |
| ESP-24 | Infraestrutura — Agenda | Lentidão ao carregar | 🟡 |
| ESP-27 | Infraestrutura — Performance | Transições FSM com latência perceptível | 🟡 |
| ESP-28 | Infraestrutura — Pós-evento | Sem formulário de pós-evento ao "Concluir" | 🔴 |
| ESP-28b | Infraestrutura — Pós-evento | Edição posterior e histórico de alterações ausentes | 🔴 |
| ESP-29 | Infraestrutura — Horário Local | UX validação visual dinâmica conforme espaço selecionado | 🟡 |
| ADM-01 | Admin | "Acessos Pendentes" — carregando sem concluir | 🟡 |
| ADM-02 | Admin | Permissões por módulo sem granularidade por funcionalidade | 🔴 |
| ADM-03 | Admin | Campo Setor no modal "Editar usuário" | 🟡 |
| ADM-05 | Admin | UI de Administração truncada — revisão de layout necessária | 🟡 |
| ADM-06 | Admin | Aba Permissões (Aprovações) e Aba Usuários (Admin) com designs diferentes | 🟡 |
| ADM-08 | Admin | Turnos e Config.Sistema devem ser unificados | 🟡 |
| ADM-09 | Admin | Categ.Itens deve migrar para Estoque | 🟡 |
| ADM-12 | Admin | Botão "Visualizar Cadastro" leva para página em branco | 🟡 |
| ~~APR-01~~ | Aprovações | ✅ CORRIGIDO @588 — badge adicionado à aba Reservas; `_atualizarBadgeReservas` criada; `carregar()` e `atualizarBadge()` atualizados | — |
| ~~APR-02~~ | Aprovações | ✅ CORRIGIDO — `aprovacoes` usa `modulo:null` no menu; acesso não depende de ESPACOS | — |
| APR-03 | Aprovações | Aba Permissões ausente como centralização de acessos | 🟡 |
| ~~APR-06~~ | Aprovações | ✅ CORRIGIDO — `view-header/view-title/view-subtitle` já em uso | — |
| ~~CHV-07~~ | Chaves — Retirada | ✅ CORRIGIDO @650 — adicionado `<input type="time" id="chv-hora-dev">` ao lado do date; `salvar()` combina data+hora como `YYYY-MM-DDTHH:MM`; `abrirForm()` reseta hora; display existente usa `.substring(0,10)` — retrocompatível | — |
| CHV-08 | Chaves — Retirada | Sem auto-preenchimento por papel do usuário | 🔴 |
| EMP-01 | Empréstimos | Desvinculado do fluxo de reserva | 🔴 |
| EMP-02 | Empréstimos — Externo | Sem suporte a empréstimos externos | 🔴 |
| EMP-04 | Empréstimos — Externo | Sem campo de CPF do responsável | 🔴 |
| EMP-05 | Empréstimos — Externo | Sem geração de termo de empréstimo | 🔴 |
| EMP-06 | Empréstimos — Externo | Sem cadastro prévio de solicitante externo | 🔴 |
| EMP-07 | Empréstimos — Externo | Sem histórico de empréstimos por solicitante | 🟡 |
| ACO-13 | Ações — Criação | Sem campo de vínculo com contrato/fonte na criação | 🟡 |
| ~~ACO-14~~ | Ações — Formulário | ✅ VERIFICADO @648 — `acao-responsavel` é `<select>` populado por `_carregarSelectUsuariosHelper` em `abrirFormulario()`; nunca foi texto livre na v2 | — |
| ACO-23 | Ações × RECE | Sem vínculo entre Ações e Agenda RECE | 🔴 |
| ACO-24 | Ações × Alertas | Sem alertas automáticos no ciclo de vida da ação | 🔴 |
| ACO-25 | Ações — Painel | Sem aba "Comunicação" (9ª aba: RECE + Balcão contextualizados) | 🔴 |
| ACO-26 | Ações — Painel | Regra arquitetural violada: sub-abas navegam para fora das Ações | 🔴 |
| RECE-01 | RECE | Sem botão "Publicar no RECE" no painel da Ação | 🔴 |
| RECE-02 | RECE | Sem `acaoId` no modelo do evento RECE | 🔴 |
| RECE-03 | RECE | Campos específicos ausentes (categorias, artista, público-alvo, etc.) | 🔴 |
| RECE-04 | RECE | Sem fluxo de auditoria pela Comunicação no FSM | 🔴 |
| RECE-05 | RECE | Sem pré-condição de materiais de divulgação | 🔴 |
| RECE-06 | RECE | Sem integração com IA | 🔴 |
| RECE-07 | RECE | Sem suporte a materiais múltiplos de divulgação | 🟡 |
| RECE-08 | RECE × Balcão | Sem geração automática de demandas no Balcão | 🟡 |
| RECE-09 | RECE × IA | Sem histórico de revisões IA | 🟡 |
| RECE-10 | RECE × Agenda | Sem exportação/preview no formato do formulário externo | 🟡 |
| RECE-11 | RECE × Agenda | Sem confirmação de publicação externa | 🟡 |
| RECE-12 | RECE × Agenda | Integração via API (futuro) | 🔵 |
| RECE-16 | RECE — Arquitetura | Botão "+ Novo Registro RECE" arquiteturalmente incorreto | 🔴 |
| RECE-17 | RECE — Visualização | Sem modo de visualização Agenda | 🔴 |
| BAL-01 | Balcão — Arquitetura | Balcão separado do módulo Comunicação | 🔴 |
| BAL-03 | Balcão | Sem filtro de data | 🟡 |
| BAL-04 | Balcão | Sem filtro por Ação Cultural | 🔴 |
| BAL-09 | Balcão — Modal | Campo "Título" desnecessário com ação vinculada | 🔴 |
| BAL-10 | Balcão — Modal | Campo "Release" ausente | 🔴 |
| BAL-11 | Balcão — Modal | "Descrição" vs "Release" não diferenciados | 🔴 |
| ~~BAL-13~~ | Balcão — Versões | ✅ VERIFICADO @648 — toggle usa `btn-ghost`; submit usa `btn-primary`; padrão correto (toggle expande, primary envia) | — |
| ~~BAL-15~~ | Balcão — Lista | ✅ CORRIGIDO @651 — empty state: sem dados → ícone `support_agent` + texto orientado + CTA "Nova Demanda"; com filtros sem resultado → ícone `filter_list_off` + botão "Limpar filtros" (via `limparFiltros()`). | — |
| BAL-16 | Balcão — FSM | Sem etapa de aprovação final do material | 🔴 |
| BAL-18 | Balcão — Modal | Layout visual deficiente | 🔴 |
| FIN-06 | Financeiro | Integração Financeiro↔RH inexistente — mudança arquitetural grande (fase futura) | 🔴 |
| ~~FIN-09~~ | Financeiro | ✅ CORRIGIDO @635 — aba "Fontes de Recurso" adicionada à view-financeiro; `FontesRecursoUI` → `FontesUI` corrigido | — |
| ~~FIN-11~~ | Financeiro | ✅ CORRIGIDO @635 — aba "Execução" no painel do contrato: Previsto × Comprometido × Executado × Saldo × barra de progresso por rubrica | — |
| ~~FIN-12~~ | Financeiro | ✅ CORRIGIDO @637 — histórico com botão "Ver diff" por versão; modal compara snapshot × estado atual em 7 campos; botão "Restaurar esta versão" com confirmação + backup automático antes de restaurar | — |
| FIN-15 | Financeiro | Ícone `manage_accounts` ambíguo no card do contrato | 🔵 |
| ~~FIN-18~~ | Financeiro — Rubricas | ✅ CORRIGIDO @631 — coberto por FIN-20 (flag `voucher_uber` implementado no form da rubrica) | — |
| ~~FIN-19~~ | Financeiro — Rubricas | ✅ CORRIGIDO @631 — `setor` adicionado ao mapeamento de `memoriaCalculo` em `contrato_repository.gs/adicionarRubrica` | — |
| ~~FIN-20~~ | Financeiro — Rubricas | ✅ CORRIGIDO @631 — checkbox `voucher_uber` no form da rubrica; badge no card; campo `flags` persistido | — |
| ~~CON-09~~ | Contratações | ✅ CORRIGIDO @631 — campo "Atividade" nas parcelas vira select com atividades da meta selecionada; `_atvOptions` reseta ao trocar contrato/form | — |
| REU-09 | Reuniões — Ata | Aprovação single-approver; desejado: coletiva por participante | 🔴 |
| REU-10 | Reuniões — Ata | Sem auxílio de IA (geração de rascunho, revisão, extração encaminhamentos) | 🔴 |
| REU-12 | Meu Centro | Sem botão "+ Tarefa Rápida" no inbox | 🟡 |
| ~~REU-13~~ | Reuniões | ✅ CORRIGIDO @650 — `NotificationEngine.enviarNotificacaoEncaminhamento(enc, reuniao)` adicionado; template `encaminhamento_atribuido` com assunto + corpo; chamado em `adicionarEncaminhamento` com try/catch silencioso | — |
| ESC-09 | Sistema Global | Sem área de perfil editável pelo usuário (nome social, pronomes, foto) | 🔴 |
| ESC-13 | Escuta | Subtítulo com siglas sem explicação (SIS-08) | 🟡 |
| ESC-14 | Escuta | Contradição nos Marcadores Metodológicos | 🟡 |
| ESC-17 | Escuta | Pesquisas não-anônimas permitem override pelo respondente | 🟡 |
| ~~ACV-02~~ | Acervo | ✅ VERIFICADO @648 — botão Cancelar usa `btn btn-ghost`; sem cor rosa/pink no HTML gerado | — |
| ACV-10 | Acervo | Formulário com estilos 100% inline | 🟡 |
| CAR-01 | Reserva de Veículo | Módulo nunca testado completamente na auditoria | 🔴 |
| ~~CAR-03~~ | Veículo — Métricas | ✅ VERIFICADO @643 — `_renderMetricas` já tem cards Recusadas + Canceladas; backend `ctrl_carro_dados` já retorna ambos os contadores | — |
| ~~CAR-04~~ | Veículo — Formulário | ✅ VERIFICADO @643 — `GAS.acoes.listar` binding correto + fallback 6s já presente; select funciona mesmo com lentidão da GAS | — |
| ~~CAR-06~~ | Veículo | ✅ CORRIGIDO @644 — `ctrl_carro_dados` enriquece lista com `solicitanteNome` via `AcessoService.listarUsuarios()` (bulk map); frontend usa `rc.solicitanteNome` com `title` exibindo email | — |
| ~~CAR-07~~ | Veículo | ✅ CORRIGIDO @644 — aprovador exibe `rc.aprovadorNome` com texto "Aprovado por:" em vez de "Aprov: email-prefix" | — |
| ~~CAR-08~~ | Veículo — Modal | ✅ CORRIGIDO @637 — linha "Setor Solicitante" dedicada adicionada ao modal `carro-det-overlay`; `_verDetalhesAgenda` popula `carro-det-setor` separado do nome do solicitante | — |
| ~~CAR-09~~ | Veículo | ✅ CORRIGIDO @638 — passageiros separados em internos (select colaboradores + chip tags) e externos (texto livre); backend: `passageirosInternos[]`, `passageirosExternos[]` | — |
| ~~CAR-10~~ | Veículo | ✅ CORRIGIDO @638 — seção "Paradas intermediárias" dinâmica no form; `rota.paradas[]` persistido; modal de detalhes renderiza Saída → Paradas → Chegada com ícones dinâmicos | — |
| ~~CAR-11~~ | Veículo | ✅ CORRIGIDO @641 — agenda: dias passados não-clicáveis (opacidade reduzida, sem onclick); `_abrirFormularioDia` guarda contra datas passadas + Toast; `_onDataChange` atualiza `min` nos inputs de hora quando data = hoje | — |
| CAR-12 | Veículo — Feature | Motorista configurável — não implementado | 🔴 |
| CAR-13 | Veículo | Sem suporte a solicitação de voucher Uber | 🔴 |
| CAR-14 | Veículo — Feature | Frota configurável — não implementado | 🔴 |
| ~~HUB-01~~ | Meu Centro | ✅ VERIFICADO @641 — aba Produtividade já tinha MetricsToggle.wrap(); abas Meu Dia/Meu Time não têm stats panel | — |
| ~~HUB-02~~ | Meu Centro | ✅ VERIFICADO @641 — estado vazio usa Material Symbol `celebration`, não emoji literal; sem emoji unicode no HTML | — |
| ~~HUB-03~~ | Meu Centro | ✅ CORRIGIDO @656 — bug crítico: `readJSON('solicitacoes_reserva.json')` substituído por `SolicitacaoReservaRepository.listarPorStatus('pendente', orgId)` (entidade usa Sheet, não JSON). `.includes()` → `.indexOf()` (ES5). | — |
| ~~HUB-04~~ | Meu Centro | ✅ CORRIGIDO @643 — empty state do Meu Time com orientação: explica o que fazer (criar tarefas / encaminhamentos) | — |
| ~~HUB-05~~ | Meu Centro | ✅ CORRIGIDO @643 — unidade '(h)' movida para o label; valor de dias sem unidade embutida | — |
| ~~HUB-06~~ | Meu Centro | ✅ VERIFICADO @641 — label sidebar "Meu Centro", view-title "Meu Centro de Controle"; "TaskHub" só em IDs internos | — |
| ~~HUB-07~~ | Meu Centro | ✅ CORRIGIDO @656 — chaves com devolução atrasada (`status='atrasado'`, `responsavel=email`) adicionadas como 6ª fonte de agregação; tipo `chave` com ícone `key`; click navega para Espaços. | — |
| ~~HUB-08~~ | Meu Centro | ✅ CORRIGIDO @656 — botão "Nova Tarefa" adicionado no header do tab Meu Dia; navega para view-tarefas onde o form de criação está disponível. | — |
| ~~HUB-09~~ | Meu Centro — Meu Time | ✅ CORRIGIDO @643 — backend enriquece com nome via `AcessoService.listarUsuarios()` (map bulk); frontend exibe `p.nome` com `title` mostrando email | — |
| ~~HUB-10~~ | Meu Centro | ✅ CORRIGIDO @648 — `.th-item`: padding `10px 14px` → `12px 16px`, margem `6px` → `8px`, transition → `var(--fast)`; ícone 30×30 → 32×32; CSS `.th-prod-*` morto removido (nunca usado — `_prodCard` usa `stat-card`) | — |
| ~~HUB-11~~ | Meu Centro | ✅ CORRIGIDO @657 — `_renderItem` enriquecido: metadados por tipo (tarefa→status+prioridade+prazo; encaminhamento→reuniaoTitulo; demanda→tipoDemanda+SLA%; aprovacao→solicitante; chave→salaId+prazo). Bug colateral corrigido: extras das demandas usavam chave `tipo` que sobrescrevia o `tipo` externo em `_itemCaixa`; renomeado para `tipoDemanda`/`statusDemanda`. | — |
| ~~HUB-12~~ | Meu Centro | ✅ CORRIGIDO @657 — campo `dataNascimento` adicionado ao `ColaboradorRepository` (_HEADERS + _serializarIndice). Form de Pessoas ganha input `pf-nascimento`. `ctrl_taskhub_aniversariantes()` retorna colaboradores com aniversário nos próximos 7 dias. Seção exibida abaixo das pendências no Meu Dia com cards coloridos (hoje=cor accent). | — |
| ~~HUB-13~~ | Meu Centro | ✅ CORRIGIDO — `PessoasEngine.registrarDayoffAniversario()`: valida janela 7 dias + uso único no ano + cria afastamento `dayoff_aniversario` auto-aprovado (ativo). `ctrl_rh_solicitar_dayoff_aniversario()` sem restrição de papel. `carregarAniversariantes()` exibe botão "Solicitar Day-off" no card do próprio aniversário. `AfastamentosUI._TIPO_LABEL` + select ganham a opção. | — |

---

## HANDOFF ATUAL — SESSÃO 48 (2026-06-09) → SESSÃO 49

### Estado atual: ~265 bugs registrados · Deploy @712 (GAS)

### O que foi feito nesta sessão (s48)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @707 | Fix AFD — posições layout + reverterImportacao | Layout `iDClass-BioProx-v1`: `datetimeOriginal` 25→24 chars; tipo-3 `pis` posInicio 35→34, `hash` 47→46; tipo-5 `acao` 35→34, `pis` 36→35 comp 11→12. `reverterImportacao` chama `PontoBrutoRepository.reverterSessao()` para remover brutos (re-importação não marcava mais como duplicado). |
| @708 | AFD — auto-criação colaboradores + aba Vínculos | `confirmarImportacao`: cria stubs `COL-*` de PIS tipo-5 não cadastrados; tenta auto-link por nome fuzzy contra `usuarios_acesso.json`; processa batidas `sem_cadastro` após criar stubs; retorna `autoCriados`. `_resolverColabId`: resolve email→colabId via `emailInstitucional`. `ctrl_ponto_listar_sem_vinculo` + `ctrl_ponto_vincular_colaborador`. Frontend: aba "Vínculos" com tabela select+botão; `_renderAfdPasso3` exibe 6 stats incluindo "Cadastrados". |

### Pendentes / próxima ação
- **Executar no GAS Editor (obrigatório pós-deploy):**
  1. `AfdLayoutRepository.prepararIndice()` — aplica upsert do layout com posições corrigidas
  2. Reverter sessões ruins (`ctrl_ponto_reverter_importacao`) e reimportar o AFD
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 47 (2026-06-09) → SESSÃO 48

### Estado atual: ~265 bugs registrados · Deploy @706 (GAS) · Firebase live

### O que foi feito nesta sessão (s47)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @706 | HUB-13 — Workflow de day-off de aniversário | `PessoasEngine.registrarDayoffAniversario()`: valida janela 7 dias + uso único/ano + cria afastamento `dayoff_aniversario` auto-aprovado. `ctrl_rh_solicitar_dayoff_aniversario()` acessível a qualquer colaborador. `carregarAniversariantes()`: botão "Solicitar Day-off" no card próprio (email vs boot). `_solicitarDayoff()` + `_executarDayoff()` no TaskHubUI. `AfastamentosUI` ganha tipo + select. `ctrl_taskhub_aniversariantes` passa `email`. |

### Pendentes / próxima ação
- **Executar no GAS Editor (se ainda não feito):**
  1. `AfdLayoutRepository.prepararIndice()` — aplica correção posInicio do nome AFD
  2. `criarTriggerVerificacaoPrazos()` — trigger diário 08:00 para TAR-04

---

## HANDOFF ANTERIOR — SESSÃO 46 (2026-06-08) → SESSÃO 47

### Estado atual: ~267 bugs registrados · Deploy @705

### O que foi feito nesta sessão (s46)

Fix: nome de colaboradores cortado na primeira letra no preview AFD.

| Arquivo | Mudança |
|---|---|
| `afd_layout_repository.gs` | Tipo-5: `nome` posInicio 48→47, `pis` comprimento 12→11, `cnpjSeq` 98→97, `hash` 113→112 |
| `afd_layout_repository.gs` | `prepararIndice`: insert → upsert (corrige ambientes já com layout instalado) |

**Ação necessária**: executar `AfdLayoutRepository.prepararIndice()` no GAS Editor para aplicar a correção no `afd_layouts.json`.

### Próxima sessão

1. Executar `AfdLayoutRepository.prepararIndice()` no GAS Editor
2. Reimportar o arquivo AFD e confirmar que os nomes aparecem completos

---

## HANDOFF ANTERIOR — SESSÃO 45 (2026-06-08) → SESSÃO 46

### Estado atual: ~267 bugs registrados · Deploy @704 (GAS)

### O que foi feito nesta sessão (s45)

Fuzzy name matching + aceitar AFD sem cadastro.

| Arquivo | Mudança |
|---|---|
| `afd_parser_engine.gs` | `_normalizarNome`, `_construirMapaNomes`, `_buscarColabPorNome` (75% palavras); `gerarPreview` + `iniciarImportacao`: fallback nome; `sem_cadastro` salvo como bruto; `confirmarImportacao`: só `valido` vira normalizado, retorna `semCadastro` |
| `index.html` | 6 stats; botão sempre ativo; coluna matchBy na tabela; passo-3 mostra Pendentes |

### Próxima sessão

1. Testar com arquivo real: verificar se names match funciona para colaboradores cadastrados
2. Criar funcionalidade de "vincular pendentes" — listar brutos sem_cadastro e associar a colaborador
3. Preencher campo PIS nos colaboradores do sistema para evitar dependência de name matching

---

## HANDOFF ANTERIOR — SESSÃO 44 (2026-06-08) → SESSÃO 45

### Estado atual: ~267 bugs registrados · Deploy @703 (GAS)

### O que foi feito nesta sessão (s44)

Preview AFD enriquecido com nome e status de cadastro.

| Arquivo | Mudança |
|---|---|
| `afd_parser_engine.gs` | `gerarPreview`: passe-0 coleta PIS→nome de registros cadastro; `nomeAfd` em cada batida da amostra; `colaboradoresAfd[]` (distintos, máx. 100) + `totalColabAfd` |
| `index.html` | `_renderAfdPasso2`: seção "Pessoas no arquivo" com ✓/✗ cadastro; batidas com coluna Nome; aviso "Nenhuma batida válida" quando validos=0 |

### Próxima sessão deve começar por

1. Testar preview AFD: verificar se nomes aparecem e se a seção de colaboradores está correta
2. Se todos são "Não cadastrado": orientar usuário a preencher campo PIS nos colaboradores do sistema

---

## HANDOFF ANTERIOR — SESSÃO 43 (2026-06-08) → SESSÃO 44

### Estado atual: ~267 bugs registrados · Deploy @701 (GAS) + fix pendente

### O que foi feito nesta sessão (s43)

3 bugs corrigidos no módulo Ponto — sem novo deploy ainda (pendente clasp push).

| Bug | Arquivo | Correção |
|---|---|---|
| PON-01: abas CLT/Rescisão no Ponto | `index.html` | Botões de tab removidos; divs custo/rescisão removidas; setTab array atualizado |
| Folga hardcoded Sáb/Dom | `jornada_engine.gs` | `(dow===0\|\|dow===6)` → lê `parametros_rh.dias_folga[]` (configurável); sem config = nenhum dia é folga automático |
| Loading eterno AFD 1MB | `afd_parser_engine.gs` | `nsrJaExiste` chamava readJSON N vezes por batida → pre-loading único de NSRs em mapa; fix aplicado em `gerarPreview` e `iniciarImportacao` |

### Próxima sessão deve começar por

1. `clasp push` + `clasp deploy` com deploymentId fixo
2. Testar: aba Ponto → sem tabs CLT/Rescisão; espelho de jun/2026 sem Sáb/Dom marcados como Folga; importar AFD grande sem loading eterno
3. Para habilitar folga por config: adicionar `dias_folga: [0, 6]` em `parametros_rh.json` (0=Dom, 6=Sáb) se necessário

---

## HANDOFF ANTERIOR — SESSÃO 42 (2026-06-08) → SESSÃO 43

### Estado atual: ~270 bugs registrados · Deploy @695 (GAS) · Firebase live

### O que foi feito nesta sessão (s42)

Motor flexível de Ponto/AFD — backend completo (Fases 1-4). Zero alterações em index.html.

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @695 | Auditoria + Modelagem (F1+F2) | Auditoria completa do módulo Ponto: 6 bugs identificados (parser formato errado, tipo perdido, jornada frágil, sem duplicatas, sem prévia, bypass de repositório). Modelagem das 3 camadas: `afd_layout_repository.gs` (NOVO, layout iDClass Bio Prox v1 pré-seeded com posições exatas dos campos), `ponto_bruto_repository.gs` (NOVO, sessões de importação reversíveis + registros brutos), `ponto_repository.gs` migrado para `ponto_normalizado.json` com `nsrJaExiste()`/`reverterImportacao()`/`atualizarTipo()`, `setup.gs` com 4 novos `prepararIndice()` + abas PontoBruto/PontoImportacoes/Jornadas no SCHEMA_ABAS. |
| @695 | AfdParserEngine (F3) | `afd_parser_engine.gs` (NOVO): parser flexível em 2 etapas. Etapa 1 `iniciarImportacao()`: lê layout → parseia linha por linha → cria sessão pendente → salva brutos com status (valido/duplicado/pis_nao_encontrado/cadastro/erro). Etapa 2 `confirmarImportacao()`: cria normalizados → aciona JornadaEngine automaticamente. + `cancelarImportacao()` / `reverterImportacao()` / `gerarPreview()`. 10 novos endpoints no `ponto_controller.gs` (layouts, importação, sessões). |
| @695 | JornadaEngine (F4) | `jornada_engine.gs` (NOVO) + `jornada_repository.gs` (NOVO): algoritmo de derivação E/I/R/S por posição ordinal (posição 0=E, última=S, ímpar=I, par=R). `processarDia()` detecta inconsistências (fora_de_ordem/batidas_simultaneas/intervalo_curto), classifica jornada (completa/incompleta/inconsistente). `calcularEspelho()` monta espelho mensal com dias folga/ausente inferidos. Reprocessamento idempotente. Atualiza `tipo` nos normalizados após derivação. 4 novos endpoints (processar_jornada, processar_periodo, espelho_mensal, obter_jornada). |

### Próxima sessão deve começar por

1. `clasp push` + executar no GAS Editor: `AfdLayoutRepository.prepararIndice()`, `PontoBrutoRepository.prepararIndice()`, `JornadaRepository.prepararIndice()`
2. Fase 5 — UI do fluxo de importação: modal upload → prévia → confirmar → espelho
3. Fase 7 — Exportações configuráveis (Excel/CSV/TXT por template de layout)

---

## HANDOFF ANTERIOR — SESSÃO 41 (2026-06-08) → SESSÃO 42

### Estado atual: ~270 bugs registrados · Deploy @695 (GAS) · Firebase live

### O que foi feito nesta sessão (s41)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @694 | TAR-04 — Gatilhos automáticos de tarefas | `TarefaEngine.verificarPrazos(orgId)`: lista atrasadas, marca `atrasoNotificadoEm` (notificação única), emite `TASK_DELAYED`. Handler `TASK_DELAYED`: e-mail ao responsável. Handler `TAREFA_CRIADA`: e-mail ao responsável quando atribuído por outra pessoa. `verificarPrazosTarefas()` + `criarTriggerVerificacaoPrazos()` (diário 08:00). `ctrl_tarefas_verificar_prazos()` para admin. |
| @694 | Fix: Gestão de tarefas — cards expandíveis + modal de exclusão | Cards da sub-tab Gestão com painel expandível: detalhe (prazo/prioridade/vínculo), botões Concluir / Próximo Status / Excluir. `confirm()` nativo substituído por `_abrirModalConfirmar()` em toda exclusão de tarefa. `_pendExcluirDeGestao` flag para recarregar gestão após exclusão. `_confirmarExcluir()` exposto no return do IIFE. |
| @694 | Fix: Tarefas — visibilidade, auto-criação e gestão | Auto-task removida de RESERVATION_CREATED / KEY_PROTOCOL_DELAYED / ITEM_NOT_RETURNED. Gestor vê apenas tarefas do seu setor + próprias. `ctrl_tarefas_gestao` agrupa por setor/responsável. Sub-tab "Gestão" com barra de progresso e dois modos. Responsável obrigatório na criação. |
| @689 | Fix: exclusão de tarefas | Botão "Excluir" no painel expansível de cada tarefa (cor error, alinhado à direita). `GAS.tarefas.excluir` mapeado para `ctrl_tarefas_excluir`. `confirm()` antes de deletar; lista recarregada após sucesso. |
| @688 | Fix: Tarefas como 4ª aba do Meu Centro | `#th-tab-tarefas` criada dentro de `#view-taskhub` com todo o conteúdo do formulário Nova Tarefa + lista expandível. `TaskHubUI.setTab()` ampliado para 4 abas; botão ativo por `data-tab`; chama `TarefasUI.aoAbrir()` ao ativar. `abrirItem('tarefa',...)` → `setTab('tarefas', null)` em vez de Router.navegar. Entrada `tarefas` removida do `_MODULOS_MENU`. `Router.registrar('tarefas', ...)` redireciona para taskhub+aba (compatibilidade cross-nav). Botões "Tarefas" no header e "Nova Tarefa" no meuDia removidos. `#view-tarefas` mantido vazio como stub. |
| @677 | HOME-01/02/03/04 — Home contextual por papel | `_renderizarHome()` bifurcada em `_renderHomeAdmin()` (stats de sistema para superadmin/admin) e `_renderHomeContextual()` (cards async de tarefas/encaminhamentos/urgentes/aprovações via `ctrl_taskhub_minha_caixa()`; acesso rápido por papel; widget "Aniversariantes da Semana" via `ctrl_taskhub_aniversariantes()`). Novo `#home-aniversariantes` no HTML. |
| @676 | Fix: Tarefas + Meu Centro + cards expandíveis | Tarefas movida para PRINCIPAL no sidebar (após Meu Centro); botão "Tarefas" no header do Meu Centro; TarefasUI com cards click-to-expand; borda colorida por prioridade; atrasadas em vermelho; títulos auto-criados sem ID bruto da reserva. |
| @675 | Arq: multi-tenant + remoção de hardcodes institucionais | `SHEET_ID_INSTITUICOES` no hub central; `OrgRegistryService._indexarCentral()`; seeds CCBJ movidos para `setupInicialCCBJ()`; `config.gs` sem defaults hardcoded; `?secao=public_config` endpoint; `public/index.html` dinâmico. |

### Pendentes / próxima ação
- **URGENTE após deploy: executar `setarMapaTemplateCCBJ()` no GAS Editor** — garante que o mapa do CCBJ continue aparecendo.
- **Executar no GAS Editor (uma vez, após deploy):**
  1. `criarTriggerVerificacaoPrazos()` — instala trigger diário 08:00 para TAR-04
  2. `fase9_prepararIndice()` — registra CCBJ no hub com todos os Sheet IDs
  3. `fase73_estoque_prepararIndice()` — cria abas ESTOQUE + seed dep-01/dep-02
  4. `fase78_inspecionar_ativos_v1()` → `fase78_migrar_ativos_para_estoque()`
- **Próximo bug de auditoria:** HUB-13 (dayoff de aniversário)

---

## HANDOFF ANTERIOR — SESSÃO 38 (2026-06-07) → SESSÃO 39

### Estado anterior: ~270 bugs registrados · Deploy @673 (GAS) · Firebase live

### O que foi feito nesta sessão (s38)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @673 | Fix: botões externos — `ScriptApp.getService().getUrl()` | 4 links que abriam `googleusercontent.com` em vez do URL `/exec` de produção corrigidos. Causa raiz: dentro do iframe GAS, `window.location.href` e URLs relativas resolvem para o host do iframe. Solução: `template.serviceUrl = ScriptApp.getService().getUrl()` no `_renderAppInterno` de `router.gs`; `index.html` usa `<?= serviceUrl ?>` nos 4 pontos: botão "Visualizar Cadastro" (Admin), link "Abrir Wizard de Setup", link "Portal Público" (Agentes), hint do checklist de provisionamento. |

### Pendentes / próxima ação
- **Executar no GAS Editor (nesta ordem) — pendentes de sessões anteriores:**
  1. `fase73_estoque_prepararIndice()` — cria abas **ESTOQUE** (não MASTER) + seed dep-01/dep-02
  2. `fase78_inspecionar_ativos_v1()` — confirmar campos ESPACOS.Ativos
  3. `fase78_migrar_ativos_para_estoque()` — migrar bens patrimoniais
- **Próximos bugs de auditoria:** TAR-04 (gatilhos automáticos), HUB-13 (dayoff aniversário)

---

## HANDOFF ANTERIOR — SESSÃO 37 (2026-06-06) → SESSÃO 38

### Estado anterior: ~270 bugs registrados · Deploy @668 (GAS) · Firebase live

### O que foi feito nesta sessão (s37)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @668 | Docs: manual.html — auditoria lote 2 (13 seções) | **estrategia**: eixos→horizonte (curto/médio/longo prazo), KPIs e riscos auto-calculados, form sem campo eixo. **reservas-carro**: campos reais (setor, passageiros, localização com mapa). **ponto**: registro ponto removido do gate feat.editar — disponível a todos. **rh**: PCC→PCCS (Plano de Cargos, Carreiras e Salários), todas as 10 abas documentadas. **contratacoes**: FSM real (rascunho/submetida/devolvida/aprovada_gestor/aguard_cotacoes/cotacoes_recebidas/aprovada_financeiro/em_instrucao/em_execucao/concluida/rejeitada/cancelada) + tipos (serviço/compra/bolsa). **escuta-lgpd**: CORRETO sem alteração. **financeiro**: Rubricas→Fontes de Recurso, add Aditivos+Exportações, remove bloco gerar_holerite morto (feature PESSOAS, não FINANCEIRO). **comunicacao**: CORRETO sem alteração. **voluntarios**: campos reais (nome/email/telefone/competências), aba Alocações documentada, convite por email. **agentes**: campos reais (tipo/CPF/nomeArtístico/áreas/linguagens), removido "links de portfólio" (não existe no form). **relatorios**: sem view dedicada — exports distribuídos por módulo (CODIP/Financeiro/Ponto/Escuta/Estoque). **admin**: add abas Cadastros Base (Features, Identidade Visual, Banco de Dados, Ferramentas/Provisionamento). **fix**: badges Vermelho/Amarelo no manual tinham cores indistinguíveis — CSS corrigido. |

### Pendentes / próxima ação
- **Executar no GAS Editor (nesta ordem) — pendentes de sessões anteriores:**
  1. `fase73_estoque_prepararIndice()` — cria abas **ESTOQUE** (não MASTER) + seed dep-01/dep-02
  2. `fase78_inspecionar_ativos_v1()` — confirmar campos ESPACOS.Ativos
  3. `fase78_migrar_ativos_para_estoque()` — migrar bens patrimoniais
- **Próximos bugs de auditoria:** TAR-04 (gatilhos automáticos), HUB-13 (dayoff aniversário)

---

## HANDOFF ANTERIOR — SESSÃO 36 (2026-06-06) → SESSÃO 37

### Estado anterior: ~270 bugs registrados · Deploy @658 (GAS) · Firebase live

### O que foi feito nesta sessão (s36)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @661 | Docs: manual.html | Seções `taskhub`, `tarefas`, `balcao`, `pessoas`, `reunioes` reescritas para refletir a implementação real (3 abas TaskHub, 6 fontes Meu Dia, grupos prioridade, aniversariantes, prazo/vínculo em Tarefas, Balcão como canal de comunicação com SLA + versões, dataNascimento em Pessoas, encaminhamentos em Reuniões). |
| @662 | Docs: manual.html (correções pós-investigação) | Meu Time: aba visível para todos; conteúdo bloqueado no backend para gestor/coordenador/admin/superadmin; "coordenador" adicionado ao texto. Aprovações Meu Dia: habilitador removido — apenas gestor/admin/superadmin recebem esse item no controller. |
| @663 | Fix: manual sidebar — item ativo com texto invisível | `.manual-nav-item.ativo` usava `--sidebar-active` (transparente, feito para sidebar escura) + `color:#fff` → texto branco sumia no fundo claro. Corrigido: `background: var(--color-primary-lt)` + `color: var(--color-primary)`. |
| @667 | Fix: manual sidebar — incompatível com sidebar do sistema | `_GRUPOS` reestruturado (PRINCIPAL/GESTÃO/OPERACIONAL/VOLUNTARIADO/SISTEMA). Labels alinhados ao `_MODULOS_MENU`: Infraestrutura, Pessoas/RH-Configurações, Escuta, Financeiro, Comunicação, Ações, Público. Rota 'rh' → seção 'pessoas'. |
| @665 | Fix: manual — divergências passo a passo | (1) Ações: FSM corrigido (Planejada/Em Produção/Em execução/Concluída/Arquivada); Rascunho/Em análise/Aprovada removidos. (2) Aprovações: tabs reais (Reservas/Acessos/Carros/Permissões); Ações culturais e 48h removidos. (3) Público: certificado é explícito, não automático; frequência mínima 75% documentada. |

### Pendentes / próxima ação
- **Executar no GAS Editor (nesta ordem) — pendentes de sessões anteriores:**
  1. `fase73_estoque_prepararIndice()` — cria abas **ESTOQUE** (não MASTER) + seed dep-01/dep-02
  2. `fase78_inspecionar_ativos_v1()` — confirmar campos ESPACOS.Ativos
  3. `fase78_migrar_ativos_para_estoque()` — migrar bens patrimoniais
- **Próximos bugs de auditoria:** TAR-04 (gatilhos automáticos), HUB-13 (dayoff aniversário)

---

## HANDOFF ATUAL — SESSÃO 37 (2026-06-08) → SESSÃO 38 [ATUALIZADO]

### Estado: Deploy @700 · Motor AFD Flexível Fase 5 concluída

### O que foi feito nesta sessão (s37)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @699 | Motor AFD Fases 2-4 (backend) | `afd_layout_repository.gs`, `ponto_bruto_repository.gs`, `afd_parser_engine.gs`, `jornada_repository.gs`, `jornada_engine.gs` (NOVOS). `ponto_repository.gs` + `ponto_controller.gs` + `setup.gs` (MOD). 14 endpoints novos. |
| @700 | Fase 5 — UI importação AFD | `index.html`: 8 novos bindings GAS.ponto; aba "AFD"+"Sessões"; wizard modal 3 passos (arquivo→prévia→resultado); `carregarEspelho` migrado para `espelhoMensal` + tabela dia-a-dia; `carregarSessoes()`. |
| @701 | Ponto — planilha dedicada | `SHEET_ID_PONTO` adicionado a `PROP_SHEETS`; `PONTO: ['Ponto','PontoBruto','PontoImportacoes','Jornadas']` em `SCHEMA_ABAS`; abas removidas de `EQUIPES`; `ABA_PARA_MODULO.PONTO` em `utils.gs`; `ponto_repository`, `ponto_bruto_repository`, `jornada_repository` migrados de `SHEET_ID_EQUIPES` → `SHEET_ID_PONTO` com nomes de aba simplificados. |

### Checklist de auditoria — Fase 5
```
[x] prompt()/confirm() — não usados na Fase 5
[x] GAS.* namespace — 8 novos bindings adicionados (previewAfd, iniciarImportacao, confirmarImportacao, cancelarImportacao, listarLayouts, listarSessoes, espelhoMensal, processarJornada)
[x] CSS — zero classes novas; usa apenas classes existentes do DS
[x] IDs de DOM — modal-importar-afd, modal-afd-box, afd-file-input, afd-layout-sel, afd-nome-arquivo, btn-afd-preview, btn-afd-confirmar — todos únicos
[x] FsmGuardian — não há transições de status na Fase 5
[x] Modais — background:var(--surface); overlay rgba(0,0,0,.52)
[x] BtnGuard — btn-importar-afd, btn-afd-preview, btn-afd-confirmar têm BtnGuard.wrap; navegação pura com data-bg-skip="1"
[x] Datas — fmtDataPtBR() em todas as datas visíveis (espelho + amostra + sessões)
```

### Pendentes / próxima ação
- **Executar no GAS Editor (antes de testar AFD):**
  1. `AfdLayoutRepository.prepararIndice()` — seed layout iDClass
  2. `PontoBrutoRepository.prepararIndice()` — cria abas PontoBruto + PontoImportacoes
  3. `JornadaRepository.prepararIndice()` — cria aba Jornadas
- **Próximas fases AFD:** Fase 6 (editor visual layouts) + Fase 7 (exportações configuráveis)
- **Bugs auditoria pendentes:** TAR-04 (gatilhos automáticos), HUB-13 (dayoff aniversário), FIN-06 (integração Financeiro↔RH)

---

## HANDOFF ANTERIOR — SESSÃO 35 (2026-06-06) → SESSÃO 36

### Estado anterior: ~270 bugs registrados · Deploy @650 (GAS) · Firebase live

### O que foi feito nesta sessão (s35)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @637 | CAR-08 (auditoria) | Linha dedicada "Setor Solicitante" no modal `carro-det-overlay`; `_verDetalhesAgenda` popula setor separado. |
| @637 | FIN-12 (auditoria) | Histórico com "Ver diff" + restauração de versão (diff modal 7 campos + backup automático + `ContratosEngine.restaurarVersao`). |
| @638 | CAR-09 (auditoria) | Passageiros separados: internos (select colaboradores + chip tags `_passInternosData`) e externos (texto livre); `passageirosInternos/Externos` no backend; legado `passageiros[]` preservado. |
| @638 | CAR-10 (auditoria) | Paradas intermediárias dinâmicas no form; `rota.paradas[]` persistido; modal de detalhes: ícones dinâmicos Saída→Paradas→Chegada. |
| @641 | CAR-11 (auditoria) | Agenda: dias passados não-clicáveis (sem onclick, opacidade .55, background surface2); `_abrirFormularioDia` guarda com Toast para datas passadas; `_onDataChange` atualiza `min` nos inputs de hora quando data = hoje. |
| @643 | HUB-04/05/09 (auditoria) | HUB-04: empty state Meu Time orientado com CTA. HUB-05: unidade '(h)' movida para label. HUB-09: backend enriquece com nome via `AcessoService.listarUsuarios()` (bulk map); frontend exibe `p.nome` com tooltip email. HUB-01/02/06 verificados e confirmados corretos. |
| @644 | CAR-06/07 (auditoria) | `ctrl_carro_dados` enriquece lista com `solicitanteNome` + `aprovadorNome` via bulk map; frontend: card exibe nome (email no title); aprovador: "Aprovado por: Nome" em vez de "Aprov: prefix". CAR-03/04 verificados corretos. |
| @648 | HUB-10 (auditoria) | `.th-item`: padding alinhado com DS (`12px 16px`), margem `8px`, transition → `var(--fast)`, ícone 32×32; CSS morto `.th-prod-*` removido. |
| @650 | CHV-07 + REU-13 (auditoria) | CHV-07: input hora adicionado ao form de chaves; salvar combina data+hora. REU-13: `NotificationEngine.enviarNotificacaoEncaminhamento` + template; chamado em `adicionarEncaminhamento`. Verificados corretos: TAR-02/ACO-14/ACV-02/BAL-13/SIDEBAR-03. |
| @645 | Feature: click-to-reserve | Agenda: slot vazio → form (hora calculada por Y). Diagrama: área vazia → form (espaço+hora por X). Mapa: clique em `disponivel` → form direto (sem painel lateral). |

### Pendentes / próxima ação
- **Executar no GAS Editor (nesta ordem) — pendentes de sessões anteriores:**
  1. `fase73_estoque_prepararIndice()` — cria abas **ESTOQUE** (não MASTER) + seed dep-01/dep-02
  2. `fase78_inspecionar_ativos_v1()` — confirmar campos ESPACOS.Ativos
  3. `fase78_migrar_ativos_para_estoque()` — migrar bens patrimoniais
- **Próximos bugs de auditoria:** TAR-04 (gatilhos automáticos), HUB-13 (dayoff aniversário)

### Bugs ativos importantes (não corrigidos)
- **FIN-06** (Integração Financeiro↔RH — mudança arquitetural grande, avaliar escopo)
- **CAR-12/13/14** (motorista configurável, voucher Uber, frota — features não implementadas)
- **HUB-11/12/13** (Meu Centro: modelo heterogêneo, aniversariantes, dayoff)
