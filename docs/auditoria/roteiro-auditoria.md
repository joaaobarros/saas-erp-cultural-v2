# AUDITORIA ERP Cultural SaaS v2 — Roteiro Vivo
> Deploy atual: @638 · ~270 bugs registrados (ver tabela abaixo para ativos)
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
| Sub-abas Custo CLT e Rescisão deslocadas | ⚠️ PON-01 | 2026-05-31 |

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
| HOME-01 | Home | Informações exibidas (espaços/setores/módulos/status) úteis apenas para admin | 🟡 |
| HOME-02 | Home | Acessos rápidos fixos — não se adaptam ao papel do usuário | 🟡 |
| HOME-03 | Home | Sem informações contextuais (tarefas, reservas do dia, aprovações pendentes) | 🔴 |
| HOME-04 | Home | Sem widget de resumo do Meu Centro | 🟡 |
| SIDEBAR-01 | Sidebar | Menu muito extenso sem agrupamento semântico | 🟡 |
| ~~SIDEBAR-02~~ | Sidebar | ✅ CORRIGIDO @590 — Balcão removido do sidebar; cross-nav "Balcão" em view-comunicacao e "RECE" em view-balcao | — |
| ~~SIDEBAR-03~~ | Sidebar | ✅ VERIFICADO @648 — inativos ocultos para usuários comuns; superadmin vê com opacity .5 + tag "inativo"; badge começa `oculto` — nunca exibido sem dados reais | — |
| ~~SIDEBAR-04~~ | Sidebar | ✅ CORRIGIDO @614 — seção MEMÓRIA consolidada: 4 itens (Agentes, Acervo, Voluntários, Parcerias) → 1 item "Memória Institucional" com tab-bar interna; sidebar total ~17 itens | — |
| ~~SIDEBAR-05~~ | Sidebar | ✅ CORRIGIDO @590 — Meu Centro movido para posição #2 (após Início) | — |
| TAR-01 | Tarefas | Formulário com campos insuficientes | 🟡 |
| ~~TAR-02~~ | Tarefas | ✅ VERIFICADO @648 — `tf-responsavel` é `<select>` populado por `_carregarSelectUsuariosHelper` em `aoAbrir()`; nunca foi texto livre na v2 | — |
| ~~TAR-03~~ | Tarefas | ✅ CORRIGIDO @654 — form ganha campos Prazo + Vínculo (select tipo: Ação/Reserva/Contrato; select ID dinâmico carregado por `atualizarVinculo()` com cache). `criar()` passa `acaoId`/`reservaId`/`contratoId` ao backend. Engine + repository recebem os dois novos campos (`reservaId`, `contratoId`). Lista exibe badges de vínculo (Ação/Reserva/Contrato) e prazo. Header migrado para `view-header` DS. | — |
| TAR-04 | Tarefas | Sem gatilhos automáticos | 🔴 |
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
| PON-01 | Ponto | Sub-abas Custo CLT e Rescisão deslocadas | 🟡 |
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
| HUB-13 | Meu Centro | Sem workflow de dayoff de aniversário | 🔴 |

---

## HANDOFF ATUAL — SESSÃO 35 (2026-06-06) → SESSÃO 36

### Estado atual: ~270 bugs registrados · Deploy @650 (GAS) · Firebase live

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
