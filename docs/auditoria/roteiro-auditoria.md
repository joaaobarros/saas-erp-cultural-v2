# AUDITORIA ERP Cultural SaaS v2 — Roteiro Vivo
> Deploy atual: @897 · Feat: BSF/DescontoPS/EncFerias editáveis via RH → Encargos (não mais hardcode em config_org.json)
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
[ ] Zero prompt()/confirm()/alert() — usar _modalInput()/_abrirModalConfirmar()/Toast.erro()
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
| ~~ADM-01~~ | Admin | ✅ CORRIGIDO @861 — `_carregarPendentes()` recebe error callback; DOM atualizado com mensagem de erro em vez de "⏳ Carregando…" eterno | — |
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

## HANDOFF ATUAL — SESSÃO 71 (2026-06-14) → SESSÃO 72

### Estado atual: ~264 bugs registrados · Deploy @888 (GAS)

### O que foi feito nesta sessão (s71)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @888 | Feat — Aba Documentos RH | `colaborador_repository.gs`: `documentos_rh.json` com `listarDocumentos/salvarDocumento/excluirDocumento`. `pessoas_engine.gs`: wraps com validação e auditoria. `pessoas_controller.gs`: 3 controllers RBAC. `index.html`: HTML da aba substituído; `carregarDocumentos()` em `setTab`; modal `_abrirModalSimples` para add/edit; `_abrirModalConfirmar` para exclusão; `GAS.rh` bindings. |

### Checklist de auditoria — s71
```
[x] prompt()/confirm()/alert() — zero; exclusão usa _abrirModalConfirmar
[x] GAS.* namespace — listarDocumentos/salvarDocumento/excluirDocumento adicionados em GAS.rh
[x] CSS — sem classes novas; usa form-control, form-label, tabela, btn já definidos
[x] IDs de DOM — rh-doc-filtro-colab, rh-doc-filtro-tipo, rh-doc-lista, rh-doc-btn-add; rh-doc-f-* dentro do modal (dinâmico)
[x] FsmGuardian — sem transições de status
[x] Modais — box usa background via _abrirModalSimples (var(--surface)); overlay rgba(15,23,42,.70)
[x] BtnGuard — rh-doc-btn-add tem data-bg-skip="1"; rh-doc-btn-salvar protegido com BtnGuard.wrap
[x] Datas — dataDocumento e validade exibidos com fmtDataPtBR()
```

### Pendentes / próxima ação
- Testar aba Documentos: Pessoas/RH → Documentos → adicionar documento → lista exibe → editar → excluir.
- Confirmar que filtro por colaborador + tipo filtra corretamente.
- Verificar BtnGuard.auditar() no console.

---

## HANDOFF ANTERIOR — SESSÃO 70 (2026-06-13) → SESSÃO 71

### Estado atual: ~264 bugs registrados · Deploy @871 (GAS)

### O que foi feito nesta sessão (s70)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @871 | Fix primeiro_acesso dropdown — fallback JS + ctrl_acesso_getSetores | `acesso_service.gs`: `ctrl_acesso_getSetores()` sem verificação de auth (setores são dados públicos da org). `primeiro_acesso.html`: `window.addEventListener('load')` — se `<select id="setor">` tiver apenas o placeholder, busca setores via `google.script.run.ctrl_acesso_getSetores()` e popula dinamicamente. Cobre todos os cenários onde o template server-side falha (orgId mismatch, Drive permission, "Execute as: User"). |
| @866 | Perf — AppCache em reservas e reservas-de-carros | `reservas_controller.gs` + `reserva_carro_controller.gs`: AppCache 60-120s em listar/metricas/dados; invalidação em todos os write paths. |
| @865 | Fix getSetores() — fallback para dados sem orgId | `config_service.gs → getSetores()`: tenta sem filtro de orgId antes de cair no `_defaultSetores()`. |
| @863 | Perf — AppCache em 5 módulos + boot TTL 300s | boot TTL 60s → 300s; pessoas/tarefas/balcao/financeiro: AppCache 60–120s. |
| @861 | Auditoria de bugs — 4 correções | rh-ev-setor-anterior display; ADM-01 erro pendentes; datas Ocorrências e Habilitações. |

### Checklist de auditoria — s70
```
[x] prompt()/confirm()/alert() — zero ocorrências
[x] GAS.* namespace — ctrl_acesso_getSetores adicionado sem auth
[x] CSS — sem classes novas
[x] IDs de DOM — sem novos IDs
[x] FsmGuardian — sem novas transições
[x] Modais — sem novos modais
[x] BtnGuard — sem novos botões assíncronos
[x] Datas — sem novas datas
```

### Pendentes / próxima ação
- Testar com usuário real de primeiro acesso (@871): abrir sistema → dropdown de setor deve exibir opções (do servidor ou fallback JS).
- Se dropwdown carregar corretamente → marcar PREVIEW-01 como CORRIGIDO.
- Testar RH → Novo Evento → Mudança de Setor → campo "Setor Anterior" legível.
- Testar Admin → Acessos Pendentes: mensagem de erro se backend falhar.

---

## HANDOFF ANTERIOR — SESSÃO 69 (2026-06-13) → SESSÃO 70

### Estado atual: ~266 bugs registrados · Deploy @834 (GAS)

### O que foi feito nesta sessão (s69)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @834 | UX — setor legível em todos os módulos | Helper global `_labelSetor(id)` adicionado — consulta `App.getBoot().setores` por `id`/`nome`, retorna `label\|\|nome` ou o id como fallback. Aplicado em: tabela equipe RH, modal detalhes colaborador, cabeçalho período Ponto/Métricas, tabela "Por Setor" Ponto, card Risco CLT, tabela individual Ponto, tabela usuários Admin, seção "Dados Profissionais" Meu Perfil. |
| @833 | BI Demográfico — fix Personas: carregamento eterno + setor slug cru | `gerarPersonas(done)` declara parâmetro `done`; `_setorLabel(ms)` no card de Personas. |
| @832 | BI Demográfico — reconstrução SCD completa por período | `_enriquecerComHistorico(regs, ateYM)` + `_renderizar`/`gerarPersonas` passam `regH`. |
| @831 | BI Demográfico — fix carregamento eterno + leitura de histórico SCD | `atualizar(done)`/`_carregar(onDone)` com callback; BI controller lê histórico SCD. |

### Checklist de auditoria — s69
```
[x] prompt()/confirm()/alert() — sem novas ocorrências
[x] GAS.* namespace — sem novos endpoints
[x] CSS — sem classes novas
[x] IDs de DOM — sem novos IDs
[x] FsmGuardian — sem novas transições
[x] Modais — sem novos modais
[x] BtnGuard — gerarPersonas(done) e atualizar(done) chamam done() corretamente
[x] Datas — sem novas datas na UI
```

### Pendentes / próxima ação
- **Testar no browser (@834)**: RH → lista equipe → coluna Setor deve exibir label legível (ex. "Escola de Cultura e Artes", não slug). Ponto → Métricas RH → tabela "Por Setor" → labels legíveis.
- **Testar no browser (@833)**: BI Demográfico → Gerar Personas → botão liberado após gerar; setor no card exibe label legível.

---

## HANDOFF ANTERIOR — SESSÃO 68 (2026-06-12) → SESSÃO 69

### Estado anterior: ~266 bugs registrados · Deploy @830 (GAS)

### O que foi feito nesta sessão (s68)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @830 | Infraestrutura — Reserva de Veículo: disponibilidade por data + geocodificação + bloqueio buffer aprovação | **Backend**: `escala_carro_engine.gs` — (1) `calcularTempoRota` retorna `origemResolvida`/`destinoResolvido` extraídos de `legs[0].start_address` / `legs[last].end_address` da resposta Maps API — endereço geocodificado real, não a abreviação informada. (2) Buffer de retorno: descrição agora inclui locais (`"Retorno: Pinacoteca → CCBJ (44 min + 5 min buffer)"`). (3) `proximoHorario` usa `baseMins=0` para datas futuras (antes usava hora atual → mostrava 21:14 para datas do dia seguinte). `reserva_carro_engine.gs` — `aprovar()` chama `EscalaCarroEngine.calcularDisponibilidade` antes de `aprovarAtomico`; se `horaSaida` não cair em janela livre (considerando buffer de retorno), aprovação bloqueada com mensagem clara + próximo horário. **Frontend**: `index.html` — (1) Cabeçalho painel disponibilidade exibe data (`fmtDataPtBR`). (2) `calcularRota()`: ao receber resultado, atualiza campos `carro-f-local-saida`/`carro-f-local-chegada` com endereço resolvido — elimina ambiguidade de abreviações no payload salvo. (3) `debouncePreviewMapa()` + `onchange` de `carro-f-saida` disparam `_atualizarDisponibilidade()` — painel recalcula buffer ao mudar local de saída ou hora. (4) Aviso inline vermelho quando horaSaida está em janela bloqueada; rótulo "Saída mínima (c/ retorno)" quando há blocos de buffer. (5) `_atualizarDisponibilidade` exposta no objeto público. |

### Checklist de auditoria — s68
```
[x] prompt()/confirm()/alert() — sem novas ocorrências
[x] GAS.* namespace — sem novos endpoints; bindings existentes inalterados
[x] CSS — sem classes novas
[x] IDs de DOM — carro-disp-data-label adicionado; consistente
[x] FsmGuardian — aprovar() mantém assertValida; novo check é PRÉ-FSM, não substitui
[x] Modais — sem novos modais
[x] BtnGuard — sem novos botões assíncronos; _atualizarDisponibilidade não tem BtnGuard (correto: é silencioso)
[x] Datas — carro-disp-data-label usa fmtDataPtBR(); sem ISO cru
```

---

## HANDOFF ANTERIOR — SESSÃO 67 (2026-06-12) → SESSÃO 68

### Estado anterior: ~266 bugs registrados · Deploy @828 (GAS)

### O que foi feito nesta sessão (s67)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @829 | UX — Erradicação de prompt()/confirm()/alert() | Proibição formal adicionada ao CLAUDE.md. `_modalInput(opts, cb)` e `_abrirModalConfirmar` atualizados (suporte a `cbCancelar`). 45 ocorrências substituídas em `index.html`, `terreno_editor.html`, `mapa_acao_editor.html`. `alert()` em `primeiro_acesso.html` e `portal_aprovacao.html` → display inline de erro. Zero diálogos nativos em código ativo. |
| @828 | Infraestrutura — Fase 22 completa: reserva de carro complexificada | **Backend (22a)**: 5 novos arquivos GAS. `veiculos_repository.gs`: frota multi-veículo, `id:'default'` auto-criado. `escala_carro_repository.gs`: disponibilidade por tipo (semanal com diasSemana[]+vigência ou específica por data). `escala_carro_engine.gs`: `podAprovarCarro(email)` centralizado; `calcularDisponibilidade()` com subtração de intervalos + buffer Maps API; `calcularTempoRota()` com waypoints; CRUD escalas + veículos. `escala_carro_controller.gs`: 9 novos endpoints. `acesso_service.gs`: `setoresGerenciados[]`. `reserva_carro_repository.gs`: schema enriquecido, `aprovarAtomico` com lock. `reserva_carro_engine.gs`: `editarRota()`. **Frontend (22b)**: seletor veículo, paradas com map picker, hora estimada, painel disponibilidade, aba Escala, modal detalhes com Editar Rota. |

### Checklist de auditoria — s67
```
[x] prompt()/confirm() — _removerEscala usa confirm() que retorna boolean (sem null)
[x] GAS.* namespace — 10 novos bindings
[x] Modais — background opaco em todos os novos overlays
[x] BtnGuard — calcularRota, _salvarEscala, _salvarVeiculo, _confirmarEditarRota usam BtnGuard.wrap
[x] Datas — fmtDataPtBR() em _renderEscala
```

---

## HANDOFF ANTERIOR — SESSÃO 66 (2026-06-12) → SESSÃO 67

### Estado anterior: ~266 bugs registrados · Deploy @821 (GAS)

### O que foi feito nesta sessão (s66)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @821 | RH — Histórico temporal demográfico (PcD, pai/mãe, gênero, raça/cor, sexualidade) | **Arquitetura SCD (Slowly Changing Dimension)** aplicada a todos os campos demográficos quantificáveis. **Backend** (`pessoas_controller.gs`): `_registrarDemografia` generalizado — indicador automático para grupos sem booleano (genero/racaCor/sexualidade); `ctrl_pessoas_salvar` e `ctrl_pessoas_meu_perfil_salvar` agora registram `pcdHistorico`, `paiMaeHistorico`, `generoHistorico`, `racaCorHistorico`, `sexualidadeHistorico` (arrays `{...dados, dataInicio, dataFim}`); campos genero/racaCor/sexualidade auto-constroem objeto demografia quando frontend envia só o campo plano. **Backend** (`colaborador_repository.gs`): `_CAMPOS_PROTEGIDOS` agora protege os 5 arrays de histórico (não mais os campos planos pcd/paiMae). **Migração**: `fase1_colaboradores_migrarHistoricosDemograficos()` semeia histórico a partir de campos planos legados (datas padrão 2020-01-01), idempotente. **Frontend** (`index.html`): campos "Vigente desde" (opcional) adicionados em ambos os formulários (Meu Perfil e Ficha RH) para pcd-detalhes, pai-mae-detalhes e identidade (gênero/raça/sexualidade); populate lê da entrada vigente (`dataFim===null`) do histórico com fallback para campos planos legados; save envia `pcdDemografia`, `paiMaeDemografia`, `generoDemografia`, `racaCorDemografia`, `sexualidadeDemografia` com `dataInicio` explícito. |

### Checklist de auditoria — s66
```
[x] prompt()/confirm() — não usados nesta fase
[x] GAS.* namespace — GAS.perfil.salvar e GAS.pessoas.salvar já existem; sem novos bindings
[x] CSS — sem classes novas; date inputs usam form-input existente
[x] IDs de DOM — novos IDs: p-pcd-data-inicio, p-pm-data-inicio, p-identidade-data-inicio, rh-pf-pcd-data-inicio, rh-pf-pm-data-inicio, rh-pf-identidade-data-inicio
[x] FsmGuardian — sem transições de status nesta fase
[x] Modais — sem novos modais
[x] Datas — campos type=date (ISO interno); vigente-desde é opcional (vazio = hoje no backend)
[x] BtnGuard — sem novos botões assíncronos; botões existentes já protegidos
```

### Pendentes / próxima ação
- **Migração obrigatória**: rodar `fase1_colaboradores_migrarHistoricosDemograficos()` no GAS Editor → deve retornar `{ok:true, seeded:N, ignored:M}`
- **Testar no browser (@825)**: Meu Perfil → Saúde → "PcD = Sim" → preencher detalhes → salvar → confirmar persiste; reabrir → dados preenchidos; Ficha RH → mesmo fluxo
- **Pendente anterior**: Deduplificação João Paulo — `recuperar_diagnosticar_duplicatas()` → `recuperar_deduplicar_joao_paulo(id)`

---

## HANDOFF ANTERIOR — SESSÃO 65 (2026-06-12) → SESSÃO 66

### Estado anterior: ~266 bugs registrados · Deploy @820 (GAS)

### O que foi feito nesta sessão (s65)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @820 | RH — Férias: saldo correto, acordo melhorado, edição inline na modal do colaborador | **Backend** (`pessoas_engine.gs`): `solicitarFerias` agora calcula e persiste `totalDias` na criação; normaliza aliases `dataInicio`/`dataFim`. `resumoFeriasPorPeriodo` robustecido: conta férias `aprovado` cujo `dataFim <= hoje` além das `concluido`; status normalizado (minúsculas + strip acentos). **Frontend** (`index.html`): (1) Períodos Aquisitivos ordenados por data decrescente (mais recente no topo). (2) Accord modal reescrito — recebe datas originais aprovadas e `totalDias`; pré-preenche datas; mostra card de referência com período aprovado; saldo = `totalDias aprovado − diasGozados`. (3) Sistema de **modal secundário** empilhado: `_abrirModalRhSecundario` (z-index 10000) / `_fecharModalSecundario` / `_recarregarDetFerias` / `_recarregarDetEventos`. (4) **Inline Férias**: "Solicitar férias" na modal do colaborador abre form em modal secundário; ao salvar → fecha secundário + atualiza só o painel de férias da modal. (5) **Inline Eventos**: "Adicionar evento" abre mini-form completo (todos os tipos: reajuste, promoção, mudança cargo, carga, advertência, outro) em modal secundário; ao salvar → atualiza só o painel de histórico. (6) Fix "? dias": calcula a partir das datas quando `totalDias` ausente. |
| @819 | RH — Campo pai/mãe em Meu Perfil e Ficha Colaborador | Sessão anterior. |
| @818 | RH — Campo PcD em Meu Perfil e Ficha Colaborador | Sessão anterior. |

### Checklist de auditoria — s65
```
[x] prompt()/confirm() — não usados
[x] GAS.* namespace — GAS.rh.listarFerias e GAS.rh.historico usados em _recarregarDet*
[x] CSS — rh-modal-secundario usa rh-modal-overlay existente; sem classes novas órfãs
[x] IDs de DOM — rh-fer-sec-* e rh-ev-sec-* usam prefixo próprio; sem colisão
[x] FsmGuardian — sem transições de status (solicitarFerias = status 'pendente', sem FSM)
[x] Modais — modal secundário usa background:var(--surface) opaco; overlay rgba(0,0,0,.5)
[x] Datas — campos de data usam type=date (ISO interno); exibição via fmtDataPtBR
[x] BtnGuard — _enviarFeriasSec e _salvarEventoSec protegidos com BtnGuard.wrap
```

### Pendentes / próxima ação
- **Deduplificação obrigatória**: rodar `recuperar_diagnosticar_duplicatas()` no GAS Editor → anotar o ID da cópia espúria de João Paulo → rodar `recuperar_deduplicar_joao_paulo(idDuplicado)`. Isso corrigirá o GOZADO = 0d nos Períodos Aquisitivos.
- **Testar no browser (@820)**: RH → Férias → card Períodos → período mais recente no topo; Acordo → datas pré-preenchidas do período aprovado, saldo correto; RH → Equipe → ver colaborador → "Solicitar férias" → abre modal secundário (modal do colaborador não fecha) → salvar → painel atualiza; "Adicionar evento" → idem.
- **Testar no browser (@819)**: Meu Perfil → Saúde → "É pai/mãe? = Sim" → painel expande → salvar → persiste; Ficha RH → mesmo fluxo
- **Pós-deploy @790 (obrigatório p/ professores)**: Ficha RH → marcar como "Apuração semanal" + rodar `ctrl_ponto_recalcular_bh_todos`

---

## HANDOFF ANTERIOR — SESSÃO 64 (2026-06-12) → SESSÃO 65

### Estado anterior: ~266 bugs registrados · Deploy @819 (GAS)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @819 | RH — Campo pai/mãe em Meu Perfil e Ficha Colaborador | **Backend**: 3 campos em `_CAMPOS_PROTEGIDOS` + `_PERFIL_CAMPOS_EDITAVEIS`: `ePaiMae`, `papelParental`, `numFilhos`. **Frontend**: bloco condicional na seção Saúde de ambos os forms. Toggle `_togglePaiMae` exposto em `PerfilUI` e `RhUI`. |
| @818 | RH — Campo PcD em Meu Perfil e Ficha Colaborador | **Backend**: 4 campos `pcd`, `pcdTipos`, `pcdSuporte`, `pcdSuporteDescricao`. Bloco condicional com tipos LBI/Lei de Cotas. |
| @816 | BI Demográfico — geocodificação precisa + toggle mapa de bairros | Fase anterior. |

---

## HANDOFF ANTERIOR — SESSÃO 63 (2026-06-12) → SESSÃO 64

### Estado atual: ~266 bugs registrados · Deploy @816 (GAS)

### O que foi feito nesta sessão (s63)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @816 | BI Demográfico — geocodificação precisa + toggle mapa de bairros | **Backend**: `_biGeocodificar` refatorada — aceita `{logradouro,numero,bairro,cidade,uf,cep}`, query usa endereço completo quando disponível (rua precisa vs. centróide de bairro). Para colaboradores com CEP+logradouro: `geoKey = end:<cep>:<logradouro>` (precisão de rua); só CEP: `cep:<cep>`; fallback: `bairro|cidade`. `bairroKey` (sempre bairro-nível) adicionado ao microdado de equipe e beneficiários. **Frontend**: toggle "Calor / Bairros" no card de mapa; modo Bairros agrega por `bairroKey`, exibe círculo por bairro com tamanho proporcional à contagem e tooltip com nome+cidade+quantidade; escala de cor verde→amarelo→laranja→vermelho; estado preservado ao trocar filtros. |
| @803 | RH — fix 3 bugs críticos de exclusão/recuperação de colaborador | Fase anterior. |

### Checklist de auditoria — s63
```
[x] prompt()/confirm() — não usados
[x] GAS.* namespace — BiDemograficoUI.setModoMapa exposto; botões data-bg-skip="1"
[x] CSS — sem classes novas
[x] IDs de DOM — bi-dem-modo-calor / bi-dem-modo-bairros (novos, consistentes)
[x] FsmGuardian — sem transições de status
[x] Modais — sem modais novos
[x] Datas — sem datas em UI
[x] BtnGuard — botões de modo com data-bg-skip="1" (navegação pura, correto)
```

### Pendentes / próxima ação
- **Testar no browser (@816)**: BI Demográfico → Carregar Mapa → toggle "Bairros" → círculos aparecem por bairro com tooltip; toggle "Calor" volta ao heatmap; filtros de setor/período atualizam o mapa

---

## HANDOFF ANTERIOR — SESSÃO 62 (2026-06-11) → SESSÃO 63

### Estado atual: ~266 bugs registrados · Deploy @803 (GAS)

### O que foi feito nesta sessão (s62)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @803 | RH — fix 3 bugs críticos de exclusão/recuperação de colaborador | **Bug 1 — auto-exclusão**: `ctrl_pessoas_excluir` bloqueava hard-delete do próprio registro (erro explícito antes de qualquer operação). **Bug 2 — recuperação pós-delete**: `recuperar_colaborador_aplicar` fazia `buscarPorId` → recebia null → retornava erro; agora tenta também por email e, se não encontrar, RECRIA o registro via `ColaboradorRepository.salvar` (insert). **Bug 3 — busca no histórico**: `recuperar_colaborador_historico` usava `indexOf('jpbarros')` no email institucional `joao.barros@idm.org.br` — nunca casava; corrigido para `indexOf('joao.barros')`. **Nova** `recuperar_diagnosticar_estado()`: mostra estado real de `colaboradores.json` (matches por email/nome, duplicatas, registros em `usuarios_acesso.json`). **Nova** `recuperar_colaborador_do_acesso()`: caminho de recuperação sem histórico Drive — cria registro mínimo de `usuarios_acesso.json` (campos RH completados manualmente depois); idempotente. |
| @802 | BI Demográfico — UI redesenhada | Fase anterior. |

### Checklist de auditoria — s62
```
[x] prompt()/confirm() — não usados
[x] GAS.* namespace — sem mudanças no frontend
[x] CSS — sem mudanças de CSS
[x] IDs de DOM — sem mudanças de DOM
[x] FsmGuardian — sem transições de status nesta fase
[x] Modais — sem modais novos
[x] Datas — sem datas em UI
[x] BtnGuard — sem botões novos
```

### Pendentes / próxima ação
- **Executar protocolo de recuperação acima no GAS Editor**
- **Testar no browser**: RH → Equipe → "João Paulo" deve aparecer na lista; Meu Perfil → dados presentes (recarregar após deploy para limpar cache de sessão)
- **Testar no browser (@797 — BI Demográfico)**: navegar em BI Demográfico → KPIs carregam; barras de gênero/sexualidade/raça/faixa etária aparecem
- **Testar no browser (@796 — Ficha RH)**: CPF na ficha; gênero Cis/Trans; vínculo Terceirizado
- **Pós-deploy @790 (obrigatório p/ professores)**: Ficha RH → marcar como "Apuração semanal" + rodar `ctrl_ponto_recalcular_bh_todos`

---

## HANDOFF ANTERIOR — SESSÃO 61 (2026-06-11) → SESSÃO 62

### Estado atual: ~266 bugs registrados · Deploy @797 (GAS)

### O que foi feito nesta sessão (s61)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @797 | BI Demográfico — Painel de análise de perfil | **Backend**: `bi_demografico_controller.gs` (já existia) — `ctrl_bi_demografico_equipe` (microdados anonimizados, geocodificação Maps API + cache `bi_geo_cache.json`) e `ctrl_bi_demografico_beneficiarios` (inscrições Público, CEP→bairro ViaCEP + geocodificação). **Frontend**: view `#view-bi-demografico`; tabs Equipe/Beneficiários; filtros (período/ano, setor/ação, vínculo CLT/PJ/Estagiário/Terceirizado, status); KPI strip MetricsToggle; 4 cards demográficos com barras coloridas por categoria (Gênero, Sexualidade, Raça/Cor, Faixa Etária); grid Setor+Território (toggle Bairros/Cidades); mapa de calor Leaflet+leaflet-heat (OpenStreetMap; fallback círculos); análise de Personas (perfil predominante, jovens <30, sênior 40+). `GAS.biDemografico.equipe/beneficiarios`. Menu RELATORIOS. |

### Checklist de auditoria — s61
```
[x] prompt()/confirm() — não usados
[x] GAS.* namespace — GAS.biDemografico.equipe + beneficiarios mapeados
[x] CSS — classes usadas: filter-bar, select-sm, tab-btn, tab-ativa, card, stat-card, stats-strip, muted-text — todas existentes
[x] IDs de DOM — bi-dem-* fixos, sem sanitização regex
[x] FsmGuardian — sem transições de status (BI é somente leitura)
[x] Modais — nenhum modal novo
[x] Datas — período exibido como ano (string "2025"); sem ISO cru em UI
[x] BtnGuard — atualizar/mapa/personas com BtnGuard.wrap; botões sync com data-bg-skip="1"
```

### Pendentes / próxima ação
- **Testar no browser (@797 — BI Demográfico)**: navegar em BI Demográfico → KPIs carregam; barras de gênero/sexualidade/raça/faixa etária aparecem; filtro por setor filtra os gráficos; Carregar Mapa → mapa Leaflet aparece com heat layer; tab Beneficiários → dados de inscrições; Gerar Personas → 3 personas aparecem
- **Testar no browser (@796 — Ficha RH)**: CPF na ficha; gênero Cis/Trans; vínculo Terceirizado
- **Pós-deploy @790 (obrigatório p/ professores)**: Ficha RH → marcar como "Apuração semanal" + rodar `ctrl_ponto_recalcular_bh_todos`
- **Próximo bug de auditoria:** AFT-02 (anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 60 (2026-06-11) → SESSÃO 61

### Estado atual: ~266 bugs registrados · Deploy @795 (GAS)

### O que foi feito nesta sessão (s60)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @789 | Ponto — UX/UI Espelho + Métricas RH | **Espelho**: troca de mês reseta período p/ "Mês selecionado" (`_pintarBotoesPeriodo` extraído — antes o botão de período ficava aceso indevidamente); período agregado desabilita o seletor de mês (tooltip) e cards ganham sufixo do período + nota sobre a tabela diária; fallback de erro no consolidado. **Métricas RH**: mês com `onchange` + cache por mês (`_metrCacheMes`, troca instantânea); Atualizar = força recálculo; Evolução auto-carrega em background (botão removido); setor preservado na troca de mês. **Painel Riscos CLT**: cards por colaborador com datas das ocorrências (backend retorna `jornadasLongasDatas`/`semIntervaloDatas` em `ctrl_ponto_metricas_rh`). **Tabela individual**: chips Com registro/Risco CLT/Todos (default Com registro), badge "Sem registro", ordenação riscos primeiro. **Gráficos**: fontes/alturas maiores + tooltips. ⚠️ `index.html` desta fase foi commitado em f560d3e (@787) por sessão paralela; @789 entrega o backend. |

| @790 | Ponto — Apuração semanal + meta do mês | Novo `regimeApuracao` (diario/semanal) no colaborador (select na Ficha RH). **JornadaEngine**: regime semanal zera extras/faltantes diários e fecha BH por semana ISO (chave idempotente `sem:<segunda>`); `agruparSemanas` exportado; `calcularJornadasLote(…, mapaRegime)`; `processarDia` usa carga real do colaborador; `atualizarBHDosLotes`/`recalcularBHCompleto` semanais; guard em `ponto_engine._calcularEAtualizarBH`. **Espelho**: card "Meta do mês · N% atingido" (`metaMensalMin`), subtotais por semana na tabela (saldo ± / em andamento), badge "Apuração semanal". **Métricas/Tendências/Consolidado**: meta semanal = carga×dias/7; extras de semanais = deltas positivos das semanas fechadas; corrigido extras com 40h global p/ cargas parciais. **Filtro de profissional**: "como deseja ser chamado (Nome Completo)", ordenado pelo exibido; idem tabela individual e cards de risco. ⚠️ Pós-deploy: marcar professores como Semanal + rodar `ctrl_ponto_recalcular_bh_todos` no GAS Editor. |

| @793 | RH — Histórico de Eventos estruturado | **Bug RH-HIST-01 CORRIGIDO**: frontend enviava `tipoEvento`, engine exigia `dados.tipo` — registro de evento sempre falhava ("tipo e idColaborador são obrigatórios"), inclusive o auto-evento de carga do `salvarColab` (erro engolido). Engine normaliza os dois nomes. **Campos por tipo** (`_EV_CAMPOS`): Promoção → novo cargo+salário; Reajuste → salário; Mudança de Cargo → cargo; Alt. Carga → h/semana; Admissão → data; demais só descrição. Hints "Atual: …" da ficha; campo Data do Evento. **Ficha atualizada automaticamente** (`_aplicarEfeitosEvento`): grava `salarioBruto`/`cargo`/`horasSemanais`/`dataAdmissao` + valores anteriores no evento (audit `FICHA_ATUALIZADA_POR_EVENTO_RH`); flag `semEfeitos` p/ chamadores que já salvaram a ficha. **Timeline**: chips "anterior → novo" (Histórico + modal detalhe), labels pt-BR (`_EV_TIPO_LABEL`). **Privacidade**: `reajuste` vira tipo sensível; campos salariais removidos p/ gestor/colaborador em `listarHistoricoFiltrado`. |

| @795 | RH — Advertências: sequência + gravidade | Evento Advertência ganhou **Nível** (verbal → 1ª/2ª/3ª escrita; após a 3ª: demissão) e **Gravidade** (leve/moderada/grave/gravíssima) — validados no backend (`registrarEvento`); justificativa obrigatória. **Painel de alerta no form** (`_pintarAlertaAdv`): resumo das advertências anteriores (contagem por nível + última data), próximo passo da sequência (pré-seleciona o nível), aviso vermelho quando 3ª escrita já aplicada (medida prevista: demissão); GRAVE → antecipação de etapas; GRAVÍSSIMA → desligamento direto (justa causa) + botão atalho p/ modal de desligamento. **Toasts** pós-registro (3ª escrita / gravíssima). **Timeline**: chips Nível (⚠ na 3ª) + Gravidade colorida. **Modal detalhe**: banner disciplinar (total + próximo passo). Advertências antigas sem nível contam como verbal. *(Commit inclui selects demográficos de sessão paralela.)* |

| @796 | RH — demografia do painel + CPF | Vínculo "Terceirizado"; gênero Cis/Trans (Mulher/Homem Cis, Mulher/Homem Trans, Travesti, Não-binárie) com proteção a valores legados; rótulos "Gay / Lésbica" e "Preta/Parda (Negro)"; campo CPF na Ficha RH (11 dígitos, máscara, não apaga quando vazio; restrito a rh/admin via `_NIVEL_ESCRITA`; fora de `_PERFIL_CAMPOS_EDITAVEIS`); Meu Perfil exibe CPF mascarado read-only. Inclui também (sessão paralela): advertências com nível/gravidade. |

### Checklist de auditoria — s60
```
[x] prompt()/confirm() — não usados
[x] GAS.* namespace — nenhum endpoint novo; metricasRh/tendenciasRh já mapeados; registrarEvento/listarCargos já mapeados (@793)
[x] CSS — zero classes novas (btn-primario, btn-ghost, stat-card, muted-text existentes; @793 usa form-group/form-input/form-label existentes)
[x] IDs de DOM — ponto-dd-* inalterado; @793: rh-ev-wrap-*/rh-ev-hint-* estáticos, ids fixos
[x] FsmGuardian — sem transições de status (eventos RH não alteram status; desligamento continua via registrarDesligamento)
[x] Modais — nenhum modal novo
[x] Datas — datas de risco formatadas via fmtDataPtBR (_ddmm); @793 usa _fmtData (DD/MM/AAAA) nos hints e chips; backend ISO interno
[x] BtnGuard — chips e selects com data-bg-skip; Atualizar com BtnGuard.wrap(force); @793: rh-btn-salvar-evento já tinha BtnGuard.wrap
```

### Pendentes / próxima ação
- **Testar no browser (@795 — Advertências)**: Novo Evento → Tipo Advertência mostra Nível + Gravidade + painel de alerta com histórico disciplinar; com colaborador sem advertências o nível pré-seleciona "Verbal"; registrar advertência → reabrir form para o mesmo colaborador → painel mostra contagem e próximo passo; Gravidade "Gravíssima" → aviso vermelho + botão "Registrar desligamento" abre o modal; modal de detalhe do colaborador exibe banner disciplinar
- **Testar no browser (@793 — Histórico RH)**: Novo Evento → trocar Tipo mostra campos específicos com "Atual: …"; Reajuste sem salário bloqueia; registrar Promoção atualiza cargo/salário na ficha (conferir no modal de detalhe) e timeline mostra chips "anterior → novo"; auto-evento de carga ao mudar h/semana na Ficha RH agora aparece no histórico
- **Pós-deploy @790 (obrigatório p/ professores)**: Ficha RH → marcar colaboradores 20h de escala variável como "Apuração semanal"; depois rodar `ctrl_ponto_recalcular_bh_todos` no GAS Editor (limpa deltas diários antigos do BH)
- **Testar no browser (Espelho semanal)**: selecionar professor marcado como semanal → card "Meta do mês"; subtotais de semana na tabela com saldo; badge "Apuração semanal"; dias longos sem extras diários
- **Testar no browser (Ficha RH)**: select "Apuração de jornada" salva e recarrega corretamente
- **Testar no browser (Métricas RH)**: trocar mês → recarrega sozinho; voltar a mês anterior → instantâneo (cache); painel "Riscos CLT identificados" com datas; chips filtram a tabela; drill-down preenche após evolução carregar
- **Testar no browser (Espelho)**: ativar "Ano vigente" → seletor de mês desabilita; voltar "Mês selecionado" → reabilita; trocar mês → botões de período resetam
- **Próximo bug de auditoria:** AFT-02 (anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 58 (2026-06-10) → SESSÃO 59

### Estado atual: ~265 bugs registrados · Deploy @780 (GAS)

### O que foi feito nesta sessão (s58)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @775 | Telefone — máscara + WPP + Toast | Máscara global event delegation; WPP checkbox em 9 campos; `Toast.sucesso`/`Toast.erro` no Meu Perfil save. |
| @780 | RH — fix foto apagada + filtro Todos | `ColaboradorRepository.salvar`: merge `Object.keys(prev)` antes de `lista[idx]=dados` — preserva `fotoPerfil` e campos não enviados; `PessoasEngine.listar`: `incluirDesligado:true` do frontend impede `excluirDesligado` automático no filtro "Todos". |
| @781 | Notificações — bloquear email desligados | Guard `_isDesligado(email)` em 4 engines (`notification_engine`, `solicitacao_reserva`, `reserva_carro`, `rece`). Email externo (null do buscarPorEmail) não é bloqueado. |

### Pendentes / próxima ação
- **Testar filtro Todos RH**: selecionar "Todos" → Geovana (desligada) deve aparecer
- **Testar foto persistência**: editar ficha RH → salvar → abrir Meu Perfil → foto ainda presente
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 57 (2026-06-10) → SESSÃO 58

### Estado atual: ~265 bugs registrados · Deploy @778 (GAS)

### O que foi feito nesta sessão (s57)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @778 | Ponto — Métricas RH (fix + evolução + drill-down) | Fix `r.dados`→`r.data` (bug `undefined` em totalAtivos); filtro de setor client-side; `ctrl_ponto_tendencias_rh` (6 meses por colaborador); 3 gráficos de barras CSS no botão Evolução; drill-down inline por colaborador. |

### Pendentes / próxima ação
- **Testar Métricas RH**: clicar Atualizar → cards com números reais; filtro setor; botão Evolução → 3 gráficos; clicar colaborador → mini-gráficos
- **Testar aprovar férias**: não deve mais mostrar "Erro. Erro." — deve aprovar corretamente
- **Verificar coluna Colaborador nas Férias**: deve exibir nome, não ID
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 56 (2026-06-10) → SESSÃO 57

### Estado atual: ~265 bugs registrados · Deploy @777 (GAS)

### O que foi feito nesta sessão (s56)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @777 | Férias — fix crítico FsmGuardian + nome + timezone | `FsmGuardian.validarTransicao` → `assertValida` (método inexistente causava TypeError em toda transição); `listarFerias` enriquece com `nomeColaborador`; `calcularPeriodosAquisitivos` timezone-safe; Toast mostra erro real. |

### Pendentes / próxima ação
- **Testar aprovar férias**: não deve mais mostrar "Erro. Erro." — deve aprovar corretamente
- **Verificar coluna Colaborador**: deve exibir nome, não ID `col_1780...`
- **Verificar períodos aquisitivos**: se `dataAdmissao` de João Paulo estiver incorreta (ex: 2026-05-31), corrigir na Ficha RH para a data real de admissão
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 55 (2026-06-10) → SESSÃO 56

### Estado atual: ~265 bugs registrados · Deploy @774 (GAS)

### O que foi feito nesta sessão (s55)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @774 | Telefone — máscara + WPP + Toast | Máscara `(00) 00000-0000` global via event delegation; indicador WPP (checkbox verde) em 9 campos de telefone; `Toast.sucesso`/`Toast.erro` substituem `_mostrarMsg` no save do Meu Perfil; `telefoneWpp` em `_PERFIL_CAMPOS_EDITAVEIS`. |

### Pendentes / próxima ação
- **Testar telefones**: digitar número em qualquer campo tel → máscara aplica; marcar WPP → salvar → reabrir → checkbox deve estar marcado
- **Testar Toast Meu Perfil**: salvar → Toast verde "Perfil atualizado com sucesso!" deve aparecer (canto inferior), não mensagem no topo do form

---

## HANDOFF ANTERIOR — SESSÃO 54 (2026-06-10) → SESSÃO 55

### Estado atual: ~265 bugs registrados · Deploy @773 (GAS)

### O que foi feito nesta sessão (s54)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @771 | Ponto — fix Métricas RH | `PontoUI.setTab()` não incluía `'metricas'` no array de abas — `#ponto-tab-metricas` iniciava `oculto` e nunca era revelado. Adicionado `'metricas'` à lista. Bug: aba clicável mas conteúdo sempre em branco. |

### Pendentes / próxima ação
- **Testar Métricas RH**: clicar na aba → deve exibir resumo + tabela por setor + tabela individual
- **Testar Meu Perfil**: abrir, editar apelido/foto → salvar → sidebar deve exibir novo nome imediatamente
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 53 (2026-06-09) → SESSÃO 54

### Estado atual: ~265 bugs registrados · Deploy @759 (GAS)

### O que foi feito nesta sessão (s53)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @759 | Perfil Pessoal — sync 3-vias | `ctrl_pessoas_meu_perfil_salvar` propaga nomeApelido/pronomes/telefone/emailPessoal/fotoPerfil para `usuarios_acesso.json`; `ctrl_acesso_editarPapel` propaga setor para `colaboradores.json`; `PerfilUI.salvar()` atualiza sidebar-user-name, topbar-email e header da view em sessão. |

### Pendentes / próxima ação
- **Testar Meu Perfil**: abrir, editar apelido/foto → salvar → sidebar deve exibir novo nome imediatamente
- **Testar sync RH → Perfil**: RH abre ficha de colaborador, preenche campos (genero, telefone) → usuário abre Meu Perfil → deve ver os dados preenchidos
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 52 (2026-06-09) → SESSÃO 53

### Estado atual: ~265 bugs registrados · Deploy @757 (GAS)

### O que foi feito nesta sessão (s52)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @757 | RH — Desligamento + Períodos Aquisitivos + Acordo de Férias | (1) Botão "Desligar" no modal verColab (com/sem rescisão). (2) Painel de Períodos Aquisitivos/Concessivos na aba Férias. (3) Botão "Acordo" para férias aprovadas — registra período efetivo + saldo remanescente. |

### Pendentes / próxima ação
- **Testar no sistema**: (1) RH → Equipe → ver colaborador → botão Desligar; (2) RH → Férias → card Períodos Aquisitivos → selecionar colaborador; (3) Aprovação de férias → botão Acordo
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 51 (2026-06-09) → SESSÃO 52

### Estado atual: ~265 bugs registrados · Deploy @729 (GAS)

### O que foi feito nesta sessão (s51)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @727 | RH — BcbService + tabelas 2026 | Catálogo de encargos 2026, BcbService para busca de taxa SELIC/CDI via API BCB, atualização automática da SM via BCB API. |
| @729 | Fix Ponto — espelho vazio após reimportação (2ª causa) | Causa raiz: sessão antiga (pendente por timeout do batch fix anterior) ainda detinha os 19k brutos em `ponto_bruto.json`; qualquer reimportação do mesmo arquivo detectava todos NSRs como "duplicado" → 0 normalizados → 0 jornadas → espelho vazio. Fixes: (1) `cancelarImportacao` agora chama `PontoRepository.reverterImportacao` antes de remover brutos — limpa normalizados órfãos que a versão pré-batch pôde ter gravado parcialmente antes do timeout; (2) `GAS.ponto.reverterImportacao` adicionado ao namespace frontend; (3) Aba Sessões ganha coluna "Ação" com botão "Cancelar" (pendentes) e "Reverter" (confirmadas) via `_abrirModalConfirmar`. |

### Pendentes / próxima ação
- **Ação imediata no sistema**: (1) Módulo Ponto → aba Sessões → clicar "Cancelar" na sessão pendente antiga; (2) Reimportar arquivo AFD; (3) Confirmar importação; (4) Verificar espelho em Abril/2024 para ADRIELLY
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 50 (2026-06-09) → SESSÃO 51

### Estado atual: ~265 bugs registrados · Deploy @725 (GAS)

### O que foi feito nesta sessão (s50)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @725 | Fix Ponto — batch import AFD (timeout 19k batidas) | Root-cause real do espelho vazio: `confirmarImportacao` chamava `PontoRepository.salvarRegistro()` individualmente para cada batida (19.471 registros). Cada chamada faz lock+lê JSON+escreve → custo O(N²) → timeout de 6 min do GAS antes de terminar → arquivos vazios → espelho "Ausente". Fix: `PontoRepository.salvarLote()`, `JornadaRepository.salvarLote()`, `JornadaEngine.calcularJornadasLote()` (calcula tipos E/I/R/S em memória in-place). `confirmarImportacao` reescrito: monta array em memória → 1 modifyJSON para normalizados + 1 modifyJSON para jornadas. `ctrl_ponto_reprocessar_jornadas` também reescrito para batch. |

### Pendentes / próxima ação
- **Pós-deploy obrigatório**: (1) reverter sessões existentes no painel Sessões; (2) reimportar arquivo AFD; (3) navegar para **Abril/2024** no espelho (dados do arquivo importado)
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 48 (2026-06-09) → SESSÃO 49

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

## HANDOFF ATUAL — SESSÃO 48 (2026-06-09) → SESSÃO 49

### Estado atual: Deploy @754 (GAS) — controller pessoas_controller.gs adicionado

### O que foi feito nesta sessão (s48)

Perfil Pessoal: nova view `view-perfil` + módulo `PerfilUI` + avatar global propagado pelo sistema.

| Arquivo | Mudança |
|---|---|
| `pessoas_controller.gs` | `ctrl_pessoas_meu_perfil_ler()` e `ctrl_pessoas_meu_perfil_salvar(dados)` com whitelist de campos editáveis |
| `index.html` | `GAS.perfil.{ler,salvar}` no namespace. Menu: "Meu Perfil" após "Meu Centro". `view-perfil`: card somente leitura (dados RH) + coluna editável (apelido, pronomes, contato, emergência, endereço, diversidade, saúde+restrições). Foto: Canvas resize max 200×200 JPEG base64. `setAvatarGlobal(url)`: atualiza sidebar-avatar e topbar-avatar. Boot carrega foto silenciosamente (setTimeout 2s). Sidebar avatar clicável → Meu Perfil. `_renderEquipe` com mini-avatares via `_avatarMini(c)`. |

### Próxima sessão

1. Testar Meu Perfil: navegar → form carrega → editar → salvar → reabrir → dados persistem
2. Testar upload de foto: clicar no avatar → selecionar imagem → foto aparece → salvar → recarregar página → foto persiste no sidebar/topbar
3. Testar lista RH: Pessoas/RH → aba Equipe → avatares aparecem por colaborador

---

## HANDOFF ANTERIOR — SESSÃO 47b (2026-06-09) → SESSÃO 48

### Estado anterior: Deploy @750 (GAS)

### O que foi feito nesta sessão (s47b)

Ponto: informe de atualização do espelho (último dia com batida) + remoção do seletor de carga do espelho + filtro de período nos cards.

| Arquivo | Mudança |
|---|---|
| `index.html` | `_ultimaBatida` calculada ao carregar espelho; `_renderStatsStrip` exibe "Atualizado até DD/MM/AAAA" abaixo dos cards; seletor de carga removido do filtro do espelho. |

### HANDOFF ANTERIOR — SESSÃO 47 (2026-06-09) → SESSÃO 47b

### Estado anterior: Deploy @747

RH: novos campos de diversidade, saúde e contatos no form de colaborador. Correções no módulo Pessoas/RH (bugs 1–8 da lista): scroll automático ao editar, barra de filtro, correção duplicatas ao editar, botão excluir (só RH/Superadmin), N° registro auto-gerado, PIS/NIS, busca de CEP via ViaCEP, ordenação setor+nome.

| Arquivo | Mudança |
|---|---|
| `pessoas_controller.gs` | `ctrl_pessoas_excluir(id)`: hard delete, restrito a `rh` e `superadmin` |
| `index.html` | Form RH: Gênero (select), Orientação Sexual (select), Raça/Cor IBGE (select), Telefone, Contato de Emergência (grid 3 cols), Tipo Sanguíneo, Alergias, Restrições Alimentares (checkboxes c/ detalhe condicional), Observações Pessoais. `abrirFormColab` popula tudo; `salvarColab` persiste tudo. Busca CEP onblur via ViaCEP. Barra de filtro equipe. Scroll automático ao abrir form de edição. |

### Próxima sessão

1. Testar form completo no browser: abrir colaborador, editar, salvar — verificar novos campos persistem
2. Testar busca CEP: preencher CEP → logradouro/bairro/cidade/UF auto-preenchidos
3. Testar exclusão: admin não consegue excluir; RH consegue

---

## HANDOFF ATUAL — SESSÃO 47 (2026-06-09) → SESSÃO 48

### Estado atual: Deploy @754 (GAS)

### O que foi feito nesta sessão (s47)

Ponto: banco de horas automático na importação + alertas CLT + aba de Métricas RH.

| Arquivo | Mudança |
|---|---|
| `ponto_repository.gs` | `creditarDiaBH(orgId, colaboradorId, data, deltaMin)` — idempotente via `diasProcessados`; `resetarBancoHoras(orgId, colaboradorId)` |
| `jornada_engine.gs` | `atualizarBHDosLotes(orgId, jornadasLote)` — credita BH para cada jornada do lote; `recalcularBHCompleto(orgId, colaboradorId)` — zera e reconstrói desde histórico completo |
| `afd_parser_engine.gs` | `confirmarImportacao` chama `JornadaEngine.atualizarBHDosLotes` após `JornadaRepository.salvarLote` |
| `ponto_controller.gs` | `ctrl_ponto_reprocessar_jornadas` chama `atualizarBHDosLotes`; `ctrl_ponto_recalcular_bh_todos` (admin) chama `recalcularBHCompleto` por colaborador; `ctrl_ponto_metricas_rh(params)` retorna `{periodo, resumo, porSetor, individual}` com flags CLT (jornadas > 10h, intervalo intrajornada, BH excessivo > 40h, extras > 200h/mês) |
| `alertas_engine.gs` | 3 novos TIPOS: `PONTO_CARGA_SEMANAL`, `PONTO_CARGA_MENSAL`, `PONTO_BANCO_HORAS_EXCESSIVO`; função `_verificarCargaPonto` com emissão deduplicada por `entidadeId`; helpers `_pad2`, `_toHM`, `_isoWeek`, `_inicioSemana`, `_fimSemana`, `_somarMinutosPorDias`, `_ultimoDiaStr` |
| `index.html` | GAS bindings: `metricasRh`, `recalcularBhTodos`; tab "Métricas RH" no tab-bar do Ponto & RH; div `ponto-tab-metricas`; PontoUI: `carregarMetricasRh`, `_toHM`, `_metCard` expostos no return |

### Próxima sessão

1. Testar aba Métricas RH no browser — verificar cards resumo, tabela por setor, tabela individual
2. Reimportar AFD e verificar se Banco de Horas = valor correto (não mais 0h00)
3. Verificar alertas automáticos: rodar `AlertasEngine.verificarTodosAutomaticos()` no GAS Editor e confirmar logs dos 3 novos tipos

---

## HANDOFF ANTERIOR — SESSÃO 46b (2026-06-09) → SESSÃO 47

### Estado atual: Deploy @748 (GAS)

### O que foi feito nesta sessão (s46)

Ponto: consolidado como filtro nos cards + carga no form de colaborador + nomes com apelido no filtro.

| Arquivo | Mudança |
|---|---|
| `ponto_controller.gs` | `ctrl_ponto_listar_colaboradores` retorna `nomeApelido` |
| `index.html` | Bloco consolidado pós-tabela removido; `ponto-periodo-filter` com 4 pills (Este mês / Ano vigente / Últ. 12 meses / Desde admissão) altera `ponto-stats-strip`; `_setPeriodo`, `_renderStatsStrip`, `_carregarConsolidado` refatorados. Campo "Carga horária semanal" no form de colaborador (rh-pf-carga + botões 20h/30h/40h + custom); `salvarColab` inclui `horasSemanais` e registra evento `alteracao_carga` quando muda. Select de colaboradores exibe "Apelido (Nome)" quando apelido preenchido. Seletor de carga removido do espelho (deploy @748): botões 20h/30h/40h, `_setCarga`, `_setCargaCustom`, `_salvarCargaHoraria`, `_renderCargaBotoes` excluídos. |

### Próxima sessão

1. Testar filtro de período no browser — verificar pills ativo, cards atualizam
2. Testar carga no form colaborador — salvar + verificar evento no histórico
3. Verificar nome com apelido no dropdown do espelho

---

## HANDOFF ATUAL — SESSÃO 62 (2026-06-11)

### Estado atual: Deploy @802

### O que foi feito nesta sessão

BI Demográfico — UI redesenhada: ícones corrigidos (material-icons-round→ms), cabeçalhos de cards com faixa colorida por categoria, semântica de ícones melhorada, `modulo:'PESSOAS'` no menu.

| Arquivo | Mudança |
|---|---|
| `index.html` | View `#view-bi-demografico`: `view-titulo`/`view-subtitulo` no cabeçalho; `ms ms-sm` em todos os ícones; 4 cards (gênero, sexualidade, raça, faixa etária) + setor + território com `border-bottom:3px solid` colorido + gradiente de fundo; ícones: `people`, `volunteer_activism`, `groups`, `person`, `account_tree`, `location_city`, `travel_explore`, `psychology`; KPI placeholder "Carregando métricas…" |
| `PROGRESS.md` | Fase @802 documentada |
| `docs/auditoria/roteiro-auditoria.md` | Header + HANDOFF atualizados |

### Checklist da sessão
- [x] `ms` em todos os ícones da view BI — zero `material-icons-round`
- [x] GAS.biDemografico.equipe + .beneficiarios — bindings existem
- [x] modulo:'PESSOAS' no menu — módulo ativo sem necessidade de ativação manual
- [x] BtnGuard em: bi-dem-btn-atualizar, bi-dem-btn-mapa, bi-dem-btn-personas
- [x] data-bg-skip="1" em botões de navegação/filtro
- [x] MetricsToggle.init chamado em _renderKpis após popular #bi-dem-kpis

### Próxima sessão

1. Testar BI Demográfico no browser: abrir módulo → KPIs carregam → 4 cards renderizam → filtros funcionam → mapa abre (Carregar Mapa) → Personas geradas
2. Testar tab Beneficiários → ajusta título, oculta filtros vinculo/status, recarrega dados
3. Verificar console F12 — zero TypeError/undefined

---

## HANDOFF ANTERIOR — SESSÃO 48 (2026-06-11)

### Estado atual: Deploy @787

### O que foi feito nesta sessão

RH — fix desligamento (GAS.rh binding ausente) + PIS backfill automático via confirmação AFD.

| Arquivo | Mudança |
|---|---|
| `index.html` | `GAS.rh.registrarDesligamento` adicionado ao namespace `GAS.rh` — apontava para `undefined`, causando falha silenciosa em todo clique no botão "Confirmar Desligamento" |
| `afd_parser_engine.gs` | `confirmarImportacao`: nova Etapa 1b — backfill PIS nos colaboradores matchados sem PIS; 1 único `modifyJSON`; não sobrescreve quem já tem; retorna `pisBackfilled` |
| `index.html` | Resultado AFD exibe linha verde "PIS pré-preenchido em N ficha(s)" quando `pisBackfilled > 0` |

### Próxima sessão

1. Testar desligamento: Equipe → clicar no colaborador → botão Desligar → confirmar → status muda para "desligado"
2. Reimportar AFD → verificar mensagem de PIS pré-preenchido na tela de resultado
3. Verificar campo PIS nas fichas dos colaboradores matchados por nome

---

## HANDOFF ANTERIOR — SESSÃO 47 (2026-06-10)

### O que foi feito nesta sessão

RH — Visibilidade de status: desligados ocultos + avatar overlay + bloqueio de tarefas + auto-retorno. Deploy @761.

| Arquivo | Mudança |
|---|---|
| `colaborador_repository.gs` | `listar()`: suporte a flag `excluirDesligado` — filtra fora colaboradores com `status:'desligado'` |
| `pessoas_engine.gs` | `listar()`: aplica `excluirDesligado:true` por padrão quando nenhum filtro de status é passado |
| `pessoas_engine.gs` | `verificarAutoRetornoFerias()`: reverte status para `ativo` usando `acordo.periodoGozadoFim` ou `fim` da solicitação |
| `pessoas_engine.gs` | `verificarAutoRetornoAfastamento()`: encerra afastamentos com `dataFim` vencida via `encerrarAfastamento` |
| `alertas_engine.gs` | `verificarTodosAutomaticos()`: chama ambas as funções de auto-retorno a cada ciclo de 30 min |
| `tarefa_engine.gs` | `_validarTarefa()`: bloqueia atribuição de tarefas a colaboradores em `ferias`, `afastado` ou `desligado` |
| `index.html` | `_avatarMini(c)`: overlay 🏖️/🌿 com `position:absolute` para ferias/afastado |

### Próxima sessão

1. Verificar no browser: colaboradores desligados não aparecem em nenhuma lista
2. Testar avatar overlay — ferias deve mostrar 🏖️, afastado deve mostrar 🌿
3. Testar bloqueio de tarefas — tentar atribuir a colaborador em férias → deve dar erro
4. Verificar Meu Perfil carrega e salva (fix @764)

---

## HANDOFF ANTERIOR — SESSÃO 46b (2026-06-10) — fix carregar eternamente

Deploy @764. Detectado: fix anterior adicionava 3ª chamada Drive API (`lerJSON('usuarios_acesso.json')`) dentro de `ctrl_pessoas_meu_perfil_ler`. Corrigido com `ctx.registroAcesso` (zero Drive extra). Callback de erro do `PerfilUI.carregar()` agora exibe mensagem visível.

| Arquivo | Mudança |
|---|---|
| `pessoas_controller.gs` | `_ctxPessoas()` expõe `registroAcesso`; `ctrl_pessoas_meu_perfil_ler` usa `ctx.registroAcesso` em vez de nova `lerJSON` |
| `index.html` | `PerfilUI.carregar()` — callbacks de falha atualizam `#perfil-dados-pro` com msg de erro |

---

## HANDOFF ANTERIOR — SESSÃO 46 (2026-06-10)

### O que foi feito nesta sessão

Meu Perfil — fix sync 3-vias + select pronomes. Deploy @760.

| Arquivo | Mudança |
|---|---|
| `pessoas_controller.gs` | `ctrl_pessoas_meu_perfil_salvar`: `ColaboradorRepository.atualizar` → `.salvar` (método inexistente → save sempre falhava) |
| `pessoas_controller.gs` | `ctrl_pessoas_meu_perfil_ler`: merge de `nomeApelido`, `pronomes`, `telefone`, `emailPessoal`, `fotoPerfil` de `usuarios_acesso.json` quando ausentes no colaborador |
| `index.html` | `p-pronomes` e `rh-pf-pronomes`: texto livre → select (ele/dele · ela/dela · elu/delu · outro) + campo condicional para pronomes personalizados |
| `index.html` | `PerfilUI._preencher`: detecta valor predefinido vs "outro"; `PerfilUI.salvar`: coleta valor correto do select; `_togglePronoumesOutro` exportado |
| `index.html` | `RhUI.abrirFormColab`, `salvarColab`, `_preencherDeUsuario`: mesma lógica para o select RH; `_toggleRhPronoumesOutro` exportado |

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

## HANDOFF ATUAL — SESSÃO 49f (2026-06-13) → SESSÃO 50

### Estado: Deploy @857 · Fix badge setor no histórico

### O que foi feito (s49f)
| Deploy | Fase | O que foi implementado |
|---|---|---|
| @857 | Fix | `_evMudancas`: `ev.novoSetor` gera badge `_labelSetor(setorAnterior) → _labelSetor(novoSetor)`. |

---

## HANDOFF ANTERIOR — SESSÃO 49e (2026-06-13) → SESSÃO 49f

### Estado: Deploy @854 · Fix admissão requer salário

### O que foi feito (s49e)
| Deploy | Fase | O que foi implementado |
|---|---|---|
| @854 | Fix | `admissao:['admissao','cargo','setor','salario']`; backend: `alteraSalario` ativado em admissão. |

---

## HANDOFF ANTERIOR — SESSÃO 49d (2026-06-13) → SESSÃO 49e

### Estado: Deploy @851 · Fix atualizarEvento + admissão requer setor

### O que foi feito nesta sessão (s49d)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @851 | Fix | `atualizarEvento` adicionado ao return de `PessoasEngine`. `_EV_CAMPOS.admissao` inclui `'setor'`; backend: `alteraSetor` ativado em admissão. |

---

## HANDOFF ANTERIOR — SESSÃO 49c (2026-06-13) → SESSÃO 49d

### Estado: Deploy @850 · RH — Permissões de escrita restritas a superadmin/rh

### O que foi feito nesta sessão (s49c)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @850 | RH Permissões | `_podeEscreverRh()` global. `aoAbrir()` oculta 9 botões estáticos. Renders dinâmicas: Histórico (editar+excluir evento), PCCS (editar plano, editar/excluir cargo, Novo Cargo), Avaliações (excluir), Folha (Marcar Pago × 2). |

### Checklist de auditoria — Deploy @850
```
[x] prompt()/confirm() — não usados
[x] GAS.* — sem novos bindings
[x] CSS — sem alterações CSS
[x] IDs de DOM — sem novos IDs
[x] FsmGuardian — não aplicável
[x] Modais — não aplicável
[x] BtnGuard — botões ocultos, não removidos do DOM (BtnGuard não quebra)
[x] Datas — não aplicável
```

### Pendentes / próxima ação
- Testar como colaborador (papel != rh/superadmin): nenhum botão de escrita deve aparecer nas abas Histórico, PCCS, Avaliações, Folha, Encargos.

---

## HANDOFF ANTERIOR — SESSÃO 49b (2026-06-13) → SESSÃO 49c

### Estado: Deploy @849 · RH Histórico — Edição de eventos por superadmin/rh

### O que foi feito nesta sessão (s49b)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @848 | RH Edição Histórico | `atualizarEvento` em `pessoas_engine.gs` (mescla segura de campos permitidos, sem re-aplicar efeitos na ficha). `ctrl_rh_atualizar_evento` restrito a superadmin/rh. `GAS.rh.atualizarEvento` binding. `editarEvento(id)` em RhUI: carrega do `_historicoCache`, pré-preenche form, bloqueia select de colaborador, muda botão para "Salvar alterações", exibe aviso amarelo. `fecharFormEvento` restaura estado. Timeline mostra botão editar apenas para superadmin/rh e tag "(editado)" quando `editadoPor` presente. |

### Checklist de auditoria — Deploy @848
```
[x] prompt()/confirm() — não usados
[x] GAS.* — GAS.rh.atualizarEvento adicionado
[x] CSS — sem alterações CSS
[x] IDs de DOM — rh-ev-aviso-edicao adicionado; rh-btn-edit-ev-{id} gerado dinamicamente
[x] FsmGuardian — não aplicável
[x] Modais — aviso amarelo com background opaco (#fff8e1) — correto
[x] BtnGuard — rh-btn-salvar-evento já coberto; rh-btn-edit-ev-{id} é data-bg-skip implícito (abre form, não async)
[x] Datas — sem datas novas exibidas
```

### Pendentes / próxima ação
- Testar edição: clicar no lápis em um evento → form abre pré-preenchido → alterar descrição → "Salvar alterações" → timeline mostra "(editado)".
- Confirmar que colaborador sem papel superadmin/rh NÃO vê o botão editar.

---

## HANDOFF ATUAL — SESSÃO 52 (2026-06-14) → SESSÃO 53

### Estado: Deploy @900 · Folha: Rescisão movida para sub-painel + PS breakdown verColab/holerite

### O que foi feito nesta sessão (s52)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @900 | Feat: Rescisão → sub-painel Folha | Aba "Rescisão" removida do nav principal RH; conteúdo (`rh-folha-painel-rescisao`) movido para dentro da aba Folha; novo botão "Rescisão" no sub-nav; `setSubAbaFolha('rescisao')` popula select; `setTab('rescisao')` redireciona para Folha→Rescisão |
| @900 | Feat: PS breakdown verColab | Card Plano de Saúde exibe 3 linhas: total do plano, desconto do funcionário (k×`_descPSPercCache`), custo empresa (k−l); `_descPSPercCache` carregado de EncargosEngine em `aoAbrir()` |
| @900 | Feat: PS breakdown holerite | `holerite_engine.gs` expõe `psBruto`, `psDescEmpregado`, `psEmpresa`; modal holerite exibe breakdown PS (total → desc. funcionário → custo empresa) |

### Pendentes / próxima ação
- Testar no browser: (1) Folha → Rescisão — sub-painel abre, select colaboradores popula; (2) verColab CLT com PS — ver 3 linhas do plano de saúde; (3) Abrir holerite — seção Benefícios exibe breakdown PS

---

## HANDOFF ANTERIOR — SESSÃO 51b (2026-06-14) → SESSÃO 52

### Estado: Deploy @891 · Pessoal: controle orçamentário real via histórico salarial + auto-vínculo + guard de saldo

### O que foi feito nesta sessão (s51b)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @891 | Feat: timeline salarial | `contratos_engine._timelineSalarial()` — reconstrói linha do tempo de salários do colaborador usando eventos `reajuste`/`promocao`/`desligamento` do `historico_rh.json`; corretamente clampada à vigência do contrato e ao período ativo (admissão → desligamento) |
| @891 | Feat: custo real histórico | `_calcularCustoRealColaborador()` — percorre segmentos da timeline, chama `calcularCustoPessoal` por segmento com meses fracionários, retorna `{custoTotal, meses, segmentos[]}` |
| @891 | Feat: auto-vínculo por cargo | `autoVincularPessoal(idContrato, idMeta, orgId)` — match automático colaborador ↔ item de pessoal por cargo (case-insensitive), respeitando período ativo vs. vigência; salva com `ContratoRepository.adicionarPessoal`; exposto via `ctrl_contratos_auto_vincular_pessoal` |
| @891 | Feat: painel orçamentário | `painelOrcamentoPessoal(idContrato, orgId)` — agrega previsto × realizado × saldo × desvio% por item e total; alerta `ok`/`atencao`/`critico`/`folga`; exposto via `ctrl_contratos_pessoal_orcamento` |
| @891 | Feat: guard de saldo | `_assertSaldoPessoalVinculo()` — chamado em `salvarPessoal` quando `idColaborador` presente; bloqueia se `totalRealizado > totalPrevisto` |
| @891 | Feat: UI orçamento | Card "Controle Orçamentário de Pessoal" abaixo da lista de pessoal: stats (previsto/realizado/saldo/%), tabela por item com badge colaborador + desvio colorido + tooltip com períodos salariais; banner ⛔ quando saldo negativo |
| @891 | Feat: botão Vincular Auto | Botão "Vincular Automaticamente" na barra da aba Pessoal → chama `autoVincularPessoal` com BtnGuard → recarrega lista + painel |
| @891 | Fix: vínculo persistido no salvar | `salvarPessoal` (JS) agora inclui `idColaborador`+`nomeColaborador` lidos do select; `abrirPesModal` restaura o colaborador selecionado ao editar item existente |

### Pendentes / próxima ação
- Testar no browser: (1) vincular automaticamente → verificar painel; (2) editar item com vínculo → colaborador pré-selecionado; (3) tentar vínculo com custo > previsto → deve bloquear com mensagem

---

## HANDOFF ANTERIOR — SESSÃO 51 (2026-06-14) → SESSÃO 51b

### Estado: Deploy @880 · Pessoal: fórmula CLT corrigida + benefícios no perfil + importar colaborador

### O que foi feito nesta sessão (s51)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @880 | Fix: fórmula CLT | `contratos_engine.calcularCustoPessoal()` reescrito: (1) `_getAliquotasEncargos()` lê alíquotas dinâmicas do EncargosEngine sem hardcode; (2) SAT/RAT antes ausente — agora incluído; (3) Sistema S corrigido 6,6%→5,66% dinâmico; (4) Férias: `sal×(1+1/3)/12` (era apenas 1/3); (5) 13°: `sal/12` + inssDecimo separado; (6) resultado bate com planilha de referência (13.489,42/mês vs 12.994,14 antigo) |
| @880 | Feat: benefícios no perfil CLT | `verColab()` exibe seção "Benefícios" para vínculos CLT com cards de VA, VT e Plano de Saúde — desconto de alimentação deduzido; total de benefícios patronais calculado |
| @880 | Feat: importar colaborador no contrato | Modal Pessoal do contrato tem select "Importar de colaborador" que lista todos os colaboradores via `GAS.pessoas.autocomplete()`; ao selecionar, `importarBeneficiosColab()` preenche salário, cargo, VA, VT, desconto VA e plano de saúde via `GAS.pessoas.obter(id)` + recalcula |
| @880 | Fix: labels dinâmicos | Etiqueta de encargos mostra % real calculado (ex: "IV — Encargos (35,7%)"); total mostra "Custo Total (N meses)" com N do campo; breakdown de provisões exibido abaixo do total |

### Pendentes / próxima ação
- Gestão orçamentária de pessoal: contrato deve comparar custo real de colaboradores no período com o montante previsto, gerando alertas de ultrapassagem

---

## HANDOFF ANTERIOR — SESSÃO 50 (2026-06-13) → SESSÃO 51

### Estado: Deploy @863 · Performance — AppCache em 5 módulos + boot TTL 300s

### O que foi feito nesta sessão (s50)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @863 | Perf: boot TTL | `boot_service.gs` TTL 60s → 300s — cold boot a cada 5 min |
| @863 | Perf: Pessoas | AppCache 120s em `ctrl_pessoas_listar` (admin/rh/gestor) e `ctrl_pessoas_metricas`; invalidação em salvar/excluir/mudar_status/desligar |
| @863 | Perf: Tarefas | AppCache 60s em `ctrl_tarefas_listar` (por email) e `ctrl_tarefas_metricas`; invalidação em criar/salvar/mudar_status/excluir |
| @863 | Perf: Balcão | AppCache 60s em `ctrl_balcao_listar` e `ctrl_balcao_metricas`; invalidação em todas as escritas |
| @863 | Perf: Financeiro | AppCache 120s em listar/metricas de fontes, remanejamentos e aditivos; `_invalidarCachesFinanceiro()` em todos os write paths |

### Contexto: data_layer._jsonCache e AcessoService.verificar cache já implementados em sessão anterior (@46b5091)

### Pendentes / próxima ação
- Retomar auditoria de bugs: TAR-04, HUB-13 ou outros abertos

---

## HANDOFF ANTERIOR — SESSÃO 49 (2026-06-13) → SESSÃO 49b

### Estado: Deploy @847 · RH Histórico — Mudança de Setor + cargo na Admissão + ordenação por data

### O que foi feito nesta sessão (s49)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @835 | RH Histórico | Novo tipo `mudanca_setor`: select de setores no form principal e modal secundário; `_EV_CAMPOS`, `_EV_TIPO_LABEL`, `_evSecAtualizarCampos`, `salvarEvento`, `_salvarEventoSec` atualizados; backend `_aplicarEfeitosEvento` atualiza `c.setor` e audita `setorAnterior`/`novoSetor`. |
| @835 | RH Admissão | `admissao:['admissao','cargo']` — campo cargo exibido ao admitir; backend aceita `novoCargo` em eventos de admissão. |
| @835 | RH Ordenação | Histórico ordenado por `ev.data` desc em 3 pontos: `carregarHistorico`, `_recarregarDetEventos`, modal de ficha. |

### Checklist de auditoria — Deploy @835
```
[x] prompt()/confirm() — não usados; sem alert/confirm nativos
[x] GAS.* namespace — sem novos bindings necessários (registrarEvento já existia)
[x] CSS — sem alterações CSS
[x] IDs de DOM — rh-ev-wrap-setor / rh-ev-setor / rh-ev-hint-setor / rh-ev-sec-wrap-setor / rh-ev-sec-setor adicionados consistentemente
[x] FsmGuardian — não aplicável (histórico não tem FSM)
[x] Modais — não aplicável
[x] BtnGuard — sem botões novos; BtnGuard.wrap já cobre rh-btn-salvar-evento e rh-btn-ev-sec-salvar
[x] Datas — ordenação usa string ISO diretamente (localeCompare); sem datas exibidas sem formato
```

### Pendentes / próxima ação
- Testar no browser: selecionar tipo "Mudança de Setor" → select de setores aparece → registrar → ficha do colaborador tem setor atualizado.
- Testar Admissão: campo Cargo aparece → preencher → ficha atualiza.
- Verificar que o histórico exibe do mais recente ao mais antigo pela data do evento.

---

## HANDOFF ANTERIOR — SESSÃO 48 (2026-06-13) → SESSÃO 49

### Estado: Deploy @832 · BI Demográfico — reconstrução SCD por período (todos os campos demográficos)

### O que foi feito nesta sessão (s48)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @832 | BI Demográfico SCD | `_enriquecerComHistorico(regs, ateYM)` — sobrepõe campos planos (genero, racaCor, sexualidade, pcd, pcdTipos, ePaiMae, numFilhos) com valores point-in-time a partir dos arrays SCD. Helpers `_demografiaEmData(historico, campo, ateYM)` e `_entryEmData(historico, ateYM)` para leitura SCD. `_renderizar` e `gerarPersonas` passam `regH` (enriquecido) — todo gráfico e KPI reflete o período filtrado, não os valores atuais. |

### Checklist de auditoria — Deploy @832
```
[x] prompt()/confirm() — não usados
[x] GAS.* namespace — sem novos bindings (só lógica interna BiDemograficoUI)
[x] CSS — sem alterações CSS
[x] IDs de DOM — sem novos IDs
[x] FsmGuardian — não aplicável
[x] Modais — não aplicável
[x] BtnGuard — não aplicável (nenhum botão novo)
[x] Datas — não aplicável (lógica interna de comparação ISO)
```

### Pendentes / próxima ação
- Testar no browser: selecionar período anterior (ex: 2023-01 a 2023-12) e verificar se gráficos de gênero/raça/sexualidade mostram valores históricos distintos dos atuais para colaboradores com histórico de mudança.

---

## HANDOFF ANTERIOR — SESSÃO 47 (2026-06-13) → SESSÃO 48

### Estado: Deploy @831 · BI Demográfico — fix carregamento eterno + SCD PcD/Família no microdado

### O que foi feito nesta sessão (s47)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @831 | BI Demográfico fix | `atualizar(done)` declara parâmetro `done`; `_carregar(onDone)` chama `onDone()` nos 3 ramos (sucesso/erro servidor/erro rede). Backend: `_slimHistorico` no controller + 5 arrays SCD nos microdados (`generoHistorico`, `racaCorHistorico`, `sexualidadeHistorico`, `pcdHistorico`, `paiMaeHistorico`). Labels normalizados via `_biLabel`, filtros mês/ano separados, mapa Nominatim, mediana, cargo histórico, restrições alimentares, pais/mães, PcD. |

### Checklist de auditoria — Deploy @831
```
[x] prompt()/confirm() — não usados
[x] GAS.* namespace — GAS.biDemografico.equipe + .beneficiarios (já existentes)
[x] CSS — sem alterações novas
[x] IDs de DOM — novos IDs bi-dem-* documentados
[x] FsmGuardian — não aplicável
[x] Modais — não aplicável
[x] BtnGuard — done() propagado em iniciarMapa() — carregamento eterno corrigido
[x] Datas — fmtDataPtBR() em toda data exibida; sem ISO cru
```

### Pendentes / próxima ação
- Continuado na sessão 48 (SCD completo)

---

## HANDOFF ANTERIOR — SESSÃO 37 (2026-06-08) → SESSÃO 38 [ATUALIZADO]

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
| @873 | Manual + Busca IA | `manual.html`: 7 seções reescritas + seção `bi-demografico` criada. Motor de busca 3 camadas: NFD normalize + score ranking + sinônimos + IA Groq→OpenRouter failover silencioso. `manual_controller.gs`: novo `ctrl_manual_buscar_ia`. `index.html`: `GAS.manual.buscarIA`. |
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
