# PROGRESS — ERP Cultural SaaS v2
> **Propósito**: marcador de evolução persistente do projeto. Atualizar a cada sessão de trabalho.
> Permite retomar exatamente de onde paramos sem perda de contexto.

---

## 🔴 REGRAS DE ENTREGA — OBRIGATÓRIO SEGUIR

> **Estas regras se aplicam a toda nova fase ou implementação, sem exceção.**

### ✅ Testes em browser a cada fase
Após qualquer nova implementação ou fase concluída, **é obrigatório testar no browser** antes de considerar a entrega completa:

1. **Abrir o link de produção** (ou o webapp do GAS) no browser.
2. **Navegar pelo(s) módulo(s) afetado(s)**: clicar em todos os fluxos relevantes da fase entregue.
3. **Verificar ausência de erros** no console do browser (F12) e nas respostas dos `google.script.run`.
4. **Confirmar as operações CRUD** pertinentes (criar, listar, atualizar, excluir) e verificar persistência nos JSONs/Sheets.
5. **Só fechar a sessão** quando o módulo estiver rodando **sem gargalos, sem erros visíveis e sem comportamentos inesperados**.

> Se qualquer passo falhar → corrigir e repetir o ciclo de teste antes de avançar para a próxima fase.

---

## ⚡ RETOMANDO AGORA? LEIA ISTO PRIMEIRO

**Fase atual**: **Fase 6 entregue (2026-05-23)** — Seguir para **Fase 7 (Portal Externo + PublicoEngine + CODIP)**
**O que foi feito (2026-05-22)**:
- ✅ Saneamento 0.9: zero hardcodes de org em `.gs`
- ✅ AcessoService + `primeiro_acesso.html` + router atualizado
- ✅ `USER_DEPLOYING` mantido (correto para Workspace + access:DOMAIN)
- ✅ `inicializarSistema()`: registra superadmin automaticamente
- ✅ Logomarca + paleta de cores: `LogoPaletaService`, `SistemaConfigService.getLogoUrl/getPaleta`, `Identidade` JS, admin UI
- ✅ **Paleta padrão → ROXO CCBJ** (`#7c3aed`/`#4c1d95`/`#f59e0b`) em `config_org.json`, `config_service.gs`, `index.html` `:root`
- ✅ **BtnGuard v2** (`shared/btnguard.html`): `wrap`, `travar`, `liberar`, `auditar`; `include()` em `router.gs`
- ✅ Todos os botões assíncronos protegidos: `index.html`, `primeiro_acesso.html`, todos os portais
- ✅ Deploy realizado no Apps Script: versões `@10`, `@11` e `@12` no deployment CCBJ
- ✅ UI principal reconstruída com identidade CCBJ moderna (Inter + Material Symbols)
- ✅ Fase 1.1 entregue: `TarefaRepository`, `TarefaEngine`, controllers `ctrl_tarefas_*`, migração Sheet → JSON e view mínima de Tarefas
- ✅ **Fase 1.2 entregue**: `ColaboradorRepository` (colaboradores.json + índice EQUIPES.Funcionarios), `PessoasEngine` (fusão EquipesEngine+RHEngine, FSMs status/férias), `pessoas_controller.gs` (ctrl_pessoas_* + ctrl_rh_*), view SPA + GAS.pessoas + PessoasUI
- ✅ **Fase 1.4 entregue** (2026-05-21): `AtivoRepository` (ESPACOS.Ativos Sheet canônica + MovimentacoesAtivos + BaixasAtivos + Manutencoes), `AtivosEngine` (FSM disponivel↔reservado↔em_uso↔manutencao→baixado), `ativos_controller.gs` (ctrl_ativos_* + RBAC infraestrutura/gestor/admin), `AlmoxarifadoEngine` (stub FSM empréstimo para Fase 2.2), view SPA Espaços (AtivosUI + GAS.ativos + rota espacos registrada)
- ✅ **Fase 2 entregue** (2026-05-22): `ReservaRepository` + `ReservaEngine` (`assertSemConflito` dentro de `LockService`), `reservas_controller.gs`, `ReservasItensRepository` (catálogo + empréstimos), `AlmoxarifadoEngine` (implementação completa), `ChaveRepository` + `ChaveEngine` + `chaves_controller.gs`, view Espaços com tabs (Reservas | Chaves | Empréstimos | Patrimônio), GAS.reservas/chaves/almox, deploy @24
- ✅ **Auditoria de bugs completa** (2026-05-22): 5 bugs identificados e corrigidos — (1) `prompt()` null check quebrado em ChavesUI/ReservasUI/AlmoxUI; (2) `ReservasUI.salvar()` sempre criava nunca atualizava + `GAS.reservas.atualizar` ausente; (3) CSS `badge-accent`/`form-grid` sem definição; (4) sanitização de email inconsistente em `IdentidadeAdmin`; (5) `FsmGuardian.transitar()` não chamado em `almoxarifado_engine.verificarAtrasos()`. Deploy @26. CLAUDE.md atualizado com checklist de auditoria obrigatória antes de todo deploy.
- ✅ **Fase 3 entregue** (2026-05-22): `ContratadoRepository` + `ContratadoEngine` (FSM contratado + FSM habilitação PF/PJ), `SolicitacaoRepository` + `SolicitacaoEngine` (FSM aprovação multinível + OrcamentoGuard stub), `contratacoes_controller.gs` (CQRS+cache+RBAC). `pessoas_engine.gs`: Afastamentos (FSM rascunho→ativo→encerrado) + Ocorrências (sem FSM). `colaborador_repository.gs`: afastamentos.json + ocorrencias.json. `pessoas_controller.gs`: ctrl_rh_listar/salvar/ativar/encerrar/cancelar_afastamento + ctrl_rh_listar/registrar/excluir_ocorrencia. View SPA Pessoas com 3 tabs (Colaboradores|Afastamentos|Ocorrências) + view Contratações com 3 tabs (Solicitações|Agentes|Habilitações). GAS.pessoas (afastamentos+ocorrências) + GAS.contratados + GAS.habilitacoes + GAS.contratacoes. setup.gs: `SCHEMA_ABAS` atualizado com `Contratados` (MASTER) e `SolicitacoesContratacao` (FINANCEIRO). Deploy @28.
- ✅ **Fase 4 entregue** (2026-05-22): `FonteRecursoRepository` + `FonteRecursoEngine` (FSM ativo→suspenso→encerrado, fontes_recurso.json), `OrcamentoGuard` real (verifica saldo em contratos.json, substitui stub F3, com comprometer/liberar/efetivarPagamento/snapshotSaldo), `RemanejamentoRepository` + `RemanejamentoEngine` (FSM 6 estados, snapshot imutável antes de submissão, efetivação em contratos.json, threshold configurável), `AditivoRepository` + `AditivoEngine` (FSM 7 estados, aprovação 2-etapas interno+fundador, efetivação automática em contratos.json), `financeiro_controller.gs` (ctrl_fonte_recurso_*, ctrl_remanejamento_*, ctrl_aditivo_* com RBAC). View Financeiro expandida com 4 tabs (Contratos|Fontes|Remanejamentos|Aditivos). GAS.fontesRecurso + GAS.remanejamentos + GAS.aditivos. FontesUI + RemanejamentosUI + AditivosUI + FinanceiroTabs. Deploy @30.

**O que foi feito (Fase 4.5)**:
- ✅ `config_org.json` + `config_service.gs`: `tiposOcorrencia` e `tiposAfastamento` estruturados (id/label/ativo)
- ✅ `config_admin_service.gs`: schema Espaço expandido (tipoEspaco, responsaveisPorTurno, itensFixos, equipamentosVinculados, horarioFuncionamento, versao); helpers `alternarItemFixo()`, `obterResponsavelEspacoPorDia()`, `listarCategoriasItens()`, `salvarCategoriaItem()`
- ✅ `admin_controller.gs` CRIADO: todos os `ctrl_admin_*` e `ctrl_solicitacoes_*` globais (espaços, turnos, setores, categorias, módulos, solicitações de reserva)
- ✅ `modulos_registry_service.gs` CRIADO: engine ausente que persistia módulos — referenciado em 6 arquivos mas nunca implementado; persiste para `modulos_config.json`; catálogo de 9 módulos
- ✅ `pccs_repository.gs` CRIADO: entidade PCCS hierárquica (PCCS → Cargos → Tabela nivel/classe/referencia/salarioBase); `pessoas_controller.gs` expandido com `ctrl_pccs_*`
- ✅ `setup.gs`: `setup_espacos_iniciais()` (8 espaços SAL-001..008), `setup_pccs_inicial()` (PCCS-001 com 7 cargos), `setup_categorias_itens_iniciais()` (6 categorias); `SCHEMA_ABAS` com `ESPACOS.Solicitacoes`; `inicializarSistema()` chama os seeds
- ✅ `solicitacao_reserva_repository.gs` + `solicitacao_reserva_engine.gs` CRIADOS: workflow SOL-xxx, criar/listar/aprovar/recusar; roles de aprovação direta; notificações ao responsável da sala + admins
- ✅ `reserva_engine.gs`: campo `sala` validado contra catálogo SAL-xxx; rota para SolicitacaoReservaEngine para colaboradores sem permissão direta; campo `salaNome` desnormalizado
- ✅ `almoxarifado_engine.gs`: `assertItemDisponivel()` subtrai itens fixados em outras salas; integração com `itensFixos` do catálogo de espaços
- ✅ `contratos_engine.gs` + `financeiro_controller.gs`: `adicionarItemMemoriaRubrica()`, `removerItemMemoriaRubrica()`, `calcularTotalRubrica()`, `salvarVersaoContrato()` (snapshot em `contratos_versoes.json`), `listarVersoes()`, `obterVersao()`, `ctrl_contrato_salvar_indicador()`
- ✅ `acesso_service.gs`: `ctrl_acesso_listarTodos()` e `ctrl_acesso_editarPapel()` adicionados; papéis incluem `habilitador`, `comunicacao`, `rh`
- ✅ `boot_service.gs`: inclui `tiposAfastamento` e `tiposOcorrencia` no bootstrap — populado nos selects automaticamente
- ✅ `index.html` UI: GAS.admin/acesso/rh/solicitacoes/contratos expandidos; cargo `<select>` + `_popularSelectCargo()`; tipos afastamento/ocorrência populados do bootstrap; sala `<select>` + `popularSelectEspacos()`; `ContratosDetailUI` (Metas & Rubricas com Memória de Cálculo grid + grid 12 meses de Indicadores + Histórico de Versões); painel Aprovações + badge solicitações; Admin Cadastros (5 tabs: Espaços|Setores|CategItens|Módulos|Usuários); deploy @32

**O que foi feito (Auditoria Visual — 2026-05-22)**:
- ✅ **Auditoria visual completa de todas as abas** (`index.html`): identificados e corrigidos 8 problemas CSS/estruturais:
  1. `--surface3` e `--divider` indefinidos → adicionados ao `:root` (usados em tabelas do ContratosDetailUI)
  2. `.muted-text` sem regra CSS → adicionado (cor muted, 13px), usado em ~20 pontos de loading/vazio
  3. `.oculto` sem regra global → adicionado `.oculto { display: none !important; }` (essencial para AdminCadastrosUI.abrirTab)
  4. `.admin-tab-content` sem CSS → adicionado com `display: block; padding-top: 12px`
  5. `.tab-btn.ativa` sem CSS → adicionado (cor primária, border-bottom, font-weight 600); usado por AdminCadastrosUI
  6. `.stat-icon.warning` e `.stat-icon.error` ausentes → adicionados (usados em métricas de Pessoas e Espaços)
  7. `.error-text`, `.success-text`, `.warning-text` ausentes → adicionados (usados em erros de carga de listas)
  8. **Tab bar de Espaços** com inline styles desuniformes → refatorado para usar `.tab-bar`/`.tab-btn` (consistente com Pessoas/Contratações/Financeiro)
  9. ContratosDetailUI: tab bar com `border-bottom:1px solid var(--divider)` e estilo inline hardcoded no 1º botão → migrado para `.tab-bar` + `.tab-btn.cd-tab`
- ✅ Deploy @38 realizado

**O que foi feito (Varredura de Bugs — 2026-05-22)**:
- ✅ **Bug crítico corrigido**: `mapa_ui.html` comentário de cabeçalho continha `</script>` literal (linha 4) e `<script>` literal (linha 5) — o HTML parser encerrava o bloco script externo prematuramente → `SyntaxError: Unexpected token '>'` no browser → app travado em "Carregando sistema..." desde deploy @38. Fix: substituir texto literal das tags por texto neutro.
- ✅ **Bug médio corrigido**: `DataGateway.obterAba` não estava exportado no `return {}` do módulo → `TypeError` em `ativos_repository.gs`, `contratado_repository.gs`, `solicitacao_repository.gs`. Fix: adição de `obterAba: _aba` ao return (commit 718c709, agora deployado).
- ✅ **Varredura completa do checklist CLAUDE.md**: 6/6 itens OK (prompt/confirm, GAS.* namespace, CSS, DOM IDs, FsmGuardian, BtnGuard.wrap)
- ✅ **183 ctrl_* backend vs 144 bindings frontend**: 100% alinhados (sem função chamada sem implementação)
- ✅ **CSS Mapa**: todas as classes `.mapa-pl-*`, `.mapa-reserva-item`, `.stat-card`, `.badge-accent` definidas
- ✅ Deploy @46 realizado

**O que foi feito (Fase 5 — 2026-05-23)**:
- ✅ `AcaoRepository` (acoes.json + índice ACOES.Acoes): listar/buscar/salvar/excluir + métricas + prepararIndice
- ✅ `AcaoEngine`: FSM planejada→em_producao→em_execucao→concluida→arquivada + cancelada; FsmGuardian registrado; snapshot pré-transição; obterPainelIntegrado (tarefas+reservas+contratos)
- ✅ `acoes_controller.gs`: ctrl_acoes_listar/obter/metricas/painel/salvar/mudar_status/excluir; RBAC (leitura=todos, escrita=coordenador+, excluir=admin); CQRS com cache
- ✅ `setup.gs`: AcaoRepository.prepararIndice() em inicializarSistema()
- ✅ `index.html`: view-acoes com Kanban 4 colunas + Lista + métricas; modal criar/editar; painel detalhe 6 tabs; GAS.acoes namespace; AcoesUI module; CSS aliases (btn-primary, modal, kanban, table); BtnGuard completo
- ✅ Deploy @61

**O que foi feito (Administração funcional — 2026-05-23)**:
- ✅ **BUG CRÍTICO corrigido**: `_confirmarAprovar` e `_confirmarRevogar` enviavam `{email}` mas backend espera `{emailAlvo}` → aprovação e revogação de usuários agora funcionam
- ✅ **BUG CRÍTICO corrigido**: `abrirModalSetor(id)` pré-preenchia campo Nome com o ID (ex: `direcao`), não com o nome legível → adicionado cache `_setores[]` e lookup correto
- ✅ **F4 — Campo Cor no setor**: modal de setor agora tem color picker + campo hex; `salvarSetor` envia `{id, nome, cor}`; lista exibe dot colorido
- ✅ **F1 — Tab Turnos**: adicionada tab "Turnos" na seção Admin com CRUD completo (listar, criar, editar) — modal com Nome, Início, Fim e checkboxes Seg-Dom; backend `ctrl_admin_listarTurnos/salvarTurno` já existia
- ✅ **F2 — Setor no modal de editar usuário**: modal de editar papel agora inclui select de setor (alimentado por `_setores`); `editarPapel` envia `{email, papel, setor}`
- ✅ **F3 — Configuração de Expediente**: card "Expediente & Horários" na view-admin com inputs de abertura/encerramento; `ExpedienteUI` module; `ctrl_admin_obterConfigExpediente` + `ctrl_admin_salvarConfigExpediente` no backend; persiste em `config_org.json`
- ✅ Deploy @64

**O que foi feito (Espaços — Toast, Sidebar e Modos de Visualização — 2026-05-23)**:
- ✅ **`response.gs`**: `GasResponse.wrap()` agora propaga `e.code` e `e.details` de erros throwados — zero risco de regressão (usa `||` com fallbacks)
- ✅ **`reserva_engine.gs`**: erro estruturado `CONFLITO_RESERVA` — `_errConflito.code = 'CONFLITO_RESERVA'` e `.details = { sala, salaNome, nomeAcao, horaInicio, horaTermino, responsavel, setor }`. `salaNome` resolvido via `SistemaConfigService.getEspacos()`
- ✅ **`index.html` CSS**: `.res-modo-btn.active`, `.rdg-row/sala-label/grid-area/bloco`, `.rag-bloco`, `.mapa-res-item` com hover — todas as classes usadas
- ✅ **`index.html` HTML**: toggle Lista/Agenda/Diagrama inserido; conteúdo da lista envolvido em `#res-modo-lista`; containers `#res-modo-agenda` e `#res-modo-diagrama` adicionados
- ✅ **`index.html` JS — ReservasUI**:
  - `_mostrarToastConflito(err)`: toast vermelho com card interno mostrando nome do evento conflitante, espaço, horário, responsável e setor
  - `salvar()`: detecta `CONFLITO_RESERVA` e chama `_mostrarToastConflito` em vez de Toast simples
  - `_cancelar(id)`: prompt() removido → overlay modal com input de motivo e botão de confirmação
  - Estado: `_modo`, `_listaCacheTotal`, `_espacosPorId`, `_semanaOffset`, `_diagramaDia`
  - `setModo(modo)`: toggle containers + limpa clock do diagrama ao sair
  - `_getSemana(offset)`: retorna 7 strings YYYY-MM-DD (Seg–Dom)
  - `_garantirEspacosPorId()`: lazy-load de `App.getBoot().espacos`, fallback para `_espacosCatalogo`
  - `carregar()`: suporte a `dateRange` para modos agenda/diagrama
  - `_renderDiagrama()`: Gantt 7h–22h (3.2px/min = 2880px), colunas por espaço (120px, cor dedicada), régua de horas, marcador "agora" vermelho, blocos coloridos (✓HAB verde, HAB? âmbar dashed, EM USO roxo, concluído cinza), filtros texto+espaço (client-side), navegação por dia e semana, relógio auto-refresh 60s, auto-scroll para hora atual
  - `_renderAgenda()`: calendário semanal 8h–22h (2.4px/min), 7 colunas, linha "agora" vermelho, sub-colunas para sobreposição, filtro por espaço, navegação ←/→, auto-scroll
  - `_abrirDetalheReserva(id)`: modal com todos os campos, badge HAB, botões de ação por status
- ✅ **`mapa_ui.html` — Sidebar interativa**:
  - Estado `_reservasDoDia` armazena reservas carregadas por espaço
  - `_ag(total)`: placeholder de carregando enquanto timeline carrega
  - `_carregarTimeline()`: armazena resultado em `_reservasDoDia` e chama `_renderAgendaReservas`
  - `_renderAgendaReservas()`: lista clicável ordenada por horário, borda colorida por status, badges ✓HAB/HAB?/EM USO
  - `_abrirCardReserva(r)`: modal completo via `_abrirModal` — todos os campos + botões confirmar/iniciar/concluir/cancelar por status
  - `_abrirModalCancelamento(rId, espacoId)`: modal de cancelamento sem `prompt()` — input de motivo + botão confirmar
- ✅ Deploy @68

**O que foi feito (CCBJ Fechado — 2026-05-23)**:
- ✅ **`reserva_engine.gs`**: `_cancelarConflitantes()` — cancela todas as reservas ativas conflitantes (exceto outras do tipo BLOQUEIO), emite SystemEvents, registra auditoria, envia email ao responsável de cada cancelamento; `criarBloqueio(dados, datas, emailAdmin, orgId)` — bypassa `assertSemConflito`, cria reservas com `tipoAcao: 'BLOQUEIO'` e `status: confirmado`; exposto em `ReservaEngine.criarBloqueio`
- ✅ **`reservas_controller.gs`**: `ctrl_reservas_bloquear(params, datas)` — RBAC gestor/admin/superadmin; loop cancela conflitos + salva bloqueios; `ctrl_reservas_cancelar_bloqueios(ids)` — cancelamento em lote para operação "Desfazer"
- ✅ **`index.html` GAS**: `GAS.reservas.bloquear` e `GAS.reservas.cancelarBloqueios` adicionados
- ✅ **`index.html` frontend**:
  - Botão `🔒 CCBJ Fechado` na barra de Reservas (visível apenas para gestor/admin/superadmin, controlado pelo nível carregado ao abrir a aba)
  - Modal `#ccbj-modal` com 4 modos de seleção de datas em lote: **Manual** (input date + chip), **Semanal** (checkboxes Seg-Dom + range), **Intervalo** (a cada N dias + quantidade ou data fim), **Mensal** (3 submodos: dia fixo / Nº dia útil / Nª semana do mês)
  - Chips de preview com remoção individual e botão "Limpar"
  - Info box listando todos os espaços que serão bloqueados
  - Aviso sobre cancelamento automático de conflitos
  - CSS `.ccbj-chip`, `.ccbj-modo-btn.ccbj-ativo`, `.ccbj-sub-btn.ccbj-sub-ativo`, `.ccbj-dia-chip` adicionados ao `<style>`
  - `_BloqueioUI` IIFE com toda a lógica do modal; delegado via `ReservasUI._ccbj*`
  - Toast de resultado com botão "↩ Desfazer" imediato (cancela apenas os bloqueios recém-criados via `ctrl_reservas_cancelar_bloqueios`)
- ✅ **Diagrama**: blocos `tipoAcao === 'BLOQUEIO'` renderizados em vermelho (`bg:#fef2f2; border:#fca5a5`) com label `🔒` + motivo (campo `release`); legenda atualizada com item "🔒 CCBJ Fechado"
- ✅ **Lista**: badge `🔒 BLOQUEIO` vermelho exibido antes do nome da ação
- ✅ Todos os botões do modal marcados com `data-bg-skip="1"` — BtnGuard.auditar() passa
- ✅ Deploy @82

**O que foi feito (Editor de Terreno — 2026-05-23)**:
- ✅ `TerrenoEditorUI` (terreno_editor.html): editor full-screen de contorno do campus com pontos arrastáveis, curvas bezier, zoom/pan, redefinir para hexágono padrão
- ✅ `ConfigAdminService.lerTerreno/salvarTerreno`: persiste `mapaTerrenoConfig: { pontos, svgPath }` em `config_org.json`
- ✅ `ctrl_admin_lerTerreno/salvarTerreno`: controllers com RBAC admin
- ✅ `InfraConfigUI` (index.html): toolbar "Editar Terreno" + label indicando padrão/personalizado; canvas carrega terreno salvo; `MapaUI.atualizarTerreno()` chamado ao salvar novo terreno
- ✅ `MapaUI` (mapa_ui.html): `_aplicarTerreno()` substitui `.mapa-bg`/`.mapa-borda` pelo `svgPath` personalizado; terreno carregado via `GAS.admin.lerTerreno()` na primeira abertura (cacheado); `atualizarTerreno()` exposto na API pública
- ✅ Deploy @100

**O que foi feito (Observabilidade — 2026-05-23)**:
- ✅ `sistema_metricas_controller.gs` CRIADO: `ctrl_sistema_metricas_obter(params)` — superadmin only (RBAC via AcessoService), coleta AuditoriaStore (stats globais + eventos críticos recentes + módulos com atividade) + MetricsEngine (fsm/seguranca/governanca/usuarios/performance) + falhas por módulo via consulta separada; gera insights classificados (FSM violations, erros arquiteturais, hotspots de erro >15%, falhas de auth, acessos negados repetidos, módulos inativos); retorna rankingModulos, rankingUsuarios, eventosCriticos
- ✅ `index.html` — Menu: entrada `{ id:'sistema-metricas', label:'Observabilidade', icone:'monitoring', modulo:null, superadmin:true }` em `_MODULOS_MENU`; guard `if(item.superadmin && _boot.usuarioPapel !== 'superadmin') return;` em `_construirMenu()`; rota `SistemaMetricasUI.aoAbrir()` registrada
- ✅ `index.html` — GAS namespace: `GAS.sistemaMetricas.obter(params, cb, err)` adicionado
- ✅ `index.html` — View HTML `#view-sistema-metricas`: header com seletor de período (7/30/90d), stats strip de resumo, seção de insights e alertas, tabela de módulos com mini-barra de proporção, grid de segurança/FSM/governança, ranking de usuários, lista de eventos críticos recentes
- ✅ `index.html` — `SistemaMetricasUI` JS module: `aoAbrir()` verifica superadmin no frontend; `carregar()` mostra loading → chama backend → renderiza; `setPeriodo()` atualiza botão ativo e recarrega; 6 funções de renderização (`_renderResumo`, `_renderInsights`, `_renderModulos`, `_renderSegurancaGrid`, `_renderUsuarios`, `_renderEventosCriticos`)
- ✅ `index.html` CSS: variáveis aliases `--primary/--success/--warning/--danger/--info/--bg-card` adicionadas ao `:root` (corrige também usos existentes em outros módulos); `.sm-periodo-btn.ativo` para seletor de período
- ✅ Deploy @104

**O que foi feito (Fase 6 — 2026-05-23)**:
- ✅ **EventHandlerRegistry**: 7 handlers reais implementados — `RESERVATION_CREATED` → tarefa de prep + notifica RECE; `CONTRACT_EXPIRED`/`KEY_PROTOCOL_DELAYED`/`ITEM_NOT_RETURNED` → `TarefaEngine.criarAutomatica`; `ACTION_COMPLETED` → email CODIP para admins; `TASK_COMPLETED`/`ACTION_STARTED` → log rastreável
- ✅ **EventLog** estendido para 11 colunas: `status` (pendente/processado/erro), `tentativas`, `ts_processado`; novos métodos `getPendentes()`, `contarPorStatus()`, `marcarProcessado()`, `incrementarTentativa()`, `marcarErro()`; migração de schema antigo sem regressão
- ✅ **processarEventosPendentes()** com retry (máx 3 tentativas) + alerta aos admins quando fila > 100 pendentes; `criarTriggerEventosPendentes()` pronto para configurar no GAS Editor
- ✅ **TokenService** (`token_service.gs`): gera/valida/expira tokens com TTL 72h em aba `MASTER.Tokens`; idempotente; TTL real via timestamp
- ✅ **router.gs**: nova rota `?secao=token_acao&token=X&acao=aprovar|recusar` — renderiza página de confirmação com resultado; suporta: aprovacao_ferias, aprovacao_remanejamento, aprovacao_aditivo, aprovacao_solicitacao, aprovacao_cessao_pauta
- ✅ **NotificationEngineTokens**: `enviarSolicitacaoFerias()`, `enviarSolicitacaoRemanejamento()`, `enviarSolicitacaoAditivo()` — emails com links de aprovar/recusar (TTL 72h)
- ✅ **ReceRepository** (`rece_repository.gs`): JSON `rece_agenda.json` + aba `COMUNICACAO.AgendaRECE` (29 colunas); listar/buscar/salvar/excluir/metricas/proximoId/prepararIndice
- ✅ **ReceEngine** (`rece_engine.gs`): FSM rascunho→submetida→publicada→encerrada + cancelada; sincronização automática com Reserva Geral (via `notificarNovaReserva`); upload de imagem para Drive (`CCBJ_RECE_Imagens`); convites Google Calendar; email institucional ao publicar
- ✅ **ReceController** (`rece_controller.gs`): `ctrl_rece_listar/obter/metricas/salvar/mudar_status/excluir/upload_imagem` com RBAC papel `comunicacao`; `ctrl_eventbus_status` — painel de fila de eventos para admin
- ✅ **setup.gs**: `fase6_rece_prepararIndice()` global; `inicializarSistema()` chama `ReceRepository.prepararIndice()`, `TokenService.garantirAbaTokens()` e `SystemEvents.garantirAbaEventLog()` (migração schema)
- ✅ **index.html** — GAS.rece (7 bindings) + GAS.eventbus; view-comunicacao com lista RECE, filtros, métricas e modal de 25 campos; ReceUI module completo (aoAbrir, carregar, filtrar, renderLista, abrirForm, salvar, mudarStatus, cancelar sem prompt); Observabilidade: painel EventBus com contadores e lista de pendentes; CSS: badge-danger/secondary/info, btn-danger, form-section-title adicionados
- ✅ Deploy @132

**Próximo passo imediato**:
> **[GAS Editor] Executar após primeiro deploy:**
> 1. `fase6_rece_prepararIndice()` → `{ok: true}` — cria aba COMUNICACAO.AgendaRECE + MASTER.Tokens
> 2. `criarTriggerEventosPendentes()` → configura trigger de 30min
>
> **[BROWSER] Smoke-test Fase 6:**
> 1. Menu "Comunicação" aparece no sidebar → clicar → view RECE carrega
> 2. Botão "Novo Registro RECE" → modal com 25 campos abre
> 3. Criar registro → aparece na lista com badge "Rascunho"
> 4. Submeter → badge "Submetida"; Publicar → badge "Publicada" → email enviado
> 5. Observabilidade (superadmin) → painel EventBus aparece com contadores
> 6. F12 → zero erros vermelhos
> 7. BtnGuard.auditar() → "✅ todos protegidos"

> Depois: iniciar **Fase 7 — Portal Externo + PublicoEngine + CODIP**

**Fase mais urgente agora**: **Fase 7** — Portal Externo (backends funcionais) + Gestão de Público.

---

### PropertiesService obrigatórias — configurar ANTES de inicializarSistema()

| Chave                | Valor CCBJ                          | Obrigatório? |
|----------------------|-------------------------------------|--------------|
| `ORG_NOME`           | `CCBJ`                              | Sim          |
| `ORG_NOME_COMPLETO`  | `Centro Cultural Bom Jardim`        | Sim          |
| `ORG_DOMINIO`        | `idm.org.br`                        | Sim          |
| `ADMIN_EMAIL`        | `joao.barros@idm.org.br`            | Sim          |
| `IA_ASSISTENTE_NOME` | `Bêjotinha`                         | Opcional     |
| `ORG_TIMEZONE`       | `America/Fortaleza`                 | Opcional     |
| `ORG_LOGO_URL`       | URL do logotipo                     | Opcional     |
| `GROQ_API_KEY`       | chave da API Groq                   | Para IA      |

---

## Como usar este arquivo

1. **Antes de começar**: leia a seção "⚡ RETOMANDO AGORA?" acima
2. **Durante o trabalho**: marque checkboxes conforme conclui cada item
3. **Ao encerrar**: atualizar a seção "⚡ RETOMANDO AGORA?" + "Log de Sessões" + checkboxes
4. **Ao retomar**: seção "⚡ RETOMANDO AGORA?" tem tudo que precisa

---

## 🔬 DIRETRIZ OBRIGATÓRIA: Pesquisa Profunda por Módulo

> **REGRA ABSOLUTA**: Antes de escrever uma linha de código de qualquer módulo, realizar pesquisa profunda nas fontes listadas abaixo.
> O objetivo é garantir ferramentas **completas e absolutas** para os usuários do módulo — sem lacunas funcionais.
> Módulo incompleto não é módulo. Módulo que não serve o usuário real não existe.

### Protocolo de pesquisa antes de cada módulo

Responder obrigatoriamente estas 7 perguntas antes de implementar:

| # | Pergunta | Fontes a consultar |
|---|----------|--------------------|
| 1 | **Quem são os usuários?** Papéis, contexto, nível técnico, frequência de uso | Entrevistas virtuais com: coordenadores, administrativo, comunicação, financeiro, gestão |
| 2 | **Quais operações COMPLETAS?** Todos os fluxos: criação, edição, aprovação, cancelamento, histórico, auditoria, exportação | `plano_reconstrucao.md` seção do módulo; legado `mod_*.gs`; análise em `docs/analise_arquivos/` |
| 3 | **Quais integrações?** Módulos que dependem deste; módulos dos quais este depende; eventos emitidos e consumidos | `integracao_orquestrador.gs`; `event_handler_registry.gs`; `events_constants.gs` |
| 4 | **Obrigações legais/regulatórias?** LGPD, Lei Rouanet, CODIP, SALIC, normas trabalhistas, prestação de contas | `plano_reconstrucao.md` seção "Obrigações"; `config_org.json` regrasEditais |
| 5 | **O que estava quebrado no legado?** Funcionalidades ausentes, inconsistências, dados corrompidos, user complaints | `docs/analise_arquivos/`; git history do legado; comentários `// TODO` e `// FIXME` no legado |
| 6 | **Qual a fonte de verdade?** JSON canônico ou Sheet? Qual a estratégia de migração? Índices necessários? | `domain_model.md` tabela "Fontes de verdade"; `i_repository.gs` |
| 7 | **Quais edge cases críticos?** Concorrência, rollback, inconsistência entre fontes, usuários sem permissão | `fsm_guardian.gs`; `data_layer.gs` modifyJSON; histórico de bugs no legado |

### Fontes obrigatórias de pesquisa

```
saas-v2/ (novo projeto)
  docs/architecture/domain_model.md      ← entidades, FSMs, fontes de verdade
  PROGRESS.md (este arquivo)             ← checklist completo do módulo
  ../Saas-ERP-cultural-main/ (legado)
    docs/analise_arquivos/               ← análise profunda de cada arquivo legacy
    docs/01_architecture/
      plano_reconstrucao.md              ← requisitos completos (293KB)
    gas/src/backend/mod_*.gs             ← implementação legada (lógica de negócio real)
    gas/src/modules/*/                   ← módulos refatorados (mais recentes)
    gas/src/html/logic/                  ← frontend legado (fluxos reais dos usuários)
```

### Critérios de completude por módulo

Um módulo está **completo** quando oferece:
- [ ] Operação CRUD básica com validação real
- [ ] FSM com todas as transições possíveis (incluindo cancelamento e erro)
- [ ] Auditoria: toda escrita tem rastro em AuditoriaService
- [ ] Permissões: toda operação tem verificação de papel/setor
- [ ] Integração de saída: emite eventos para IntegracaoOrquestrador e/ou EventHandlerRegistry
- [ ] Integração de entrada: responde a eventos relevantes de outros módulos
- [ ] Exportação: dados exportáveis para CODIP/SALIC onde aplicável
- [ ] Migração: script de migração dos dados legados documentado
- [ ] Testes manuais: roteiro de smoke-test documentado no PROGRESS.md do módulo

---

## Estado Geral do Projeto

| # | Fase | Status | Urgência | Iniciada | Concluída |
|---|------|--------|----------|----------|-----------|
| 0 | Fundação Técnica | ✅ Concluída | — | 2026-05-20 | 2026-05-21 |
| 1 | Persistência Canônica | ✅ **Concluída** | — | 2026-05-21 | 2026-05-22 |
| 2 | Espaços e Almoxarifado | ✅ **Concluída** | — | 2026-05-22 | 2026-05-22 |
| 3 | Pessoas, RH e Contratações | ✅ **Concluída** | — | 2026-05-22 | 2026-05-22 |
| 3.4 | RH Avançado e Ponto | ⬜ Aguardando F3 | 🟠 ALTO — CLT sem cálculo de custo; ponto ausente | — | — |
| 4 | Financeiro e Contratos | ✅ **Concluída** | — | 2026-05-22 | 2026-05-22 |
| 5 | Ação como Núcleo Real | ✅ **Concluída** | — | 2026-05-23 | 2026-05-23 |
| 6 | Integração via Eventos + RECE | ⬜ Aguardando F5 | 🟠 ALTO — EventBus emite mas ninguém consome; RECE ausente | — | — |
| 7 | Portal Externo, Público e CODIP | ⬜ Aguardando F6 | 🟠 ALTO — prestação de contas Secult/CE sem canal | — | — |
| 8 | Agentes, Acervo, Voluntários, Parcerias | ⬜ Aguardando F7 | 🟡 MÉDIO — memória institucional digital | — | — |
| 9 | Multi-Tenancy e Config Admin | ⬜ Aguardando F8 | 🟡 MÉDIO — segundo deployment viabiliza SaaS | — | — |
| 10 | Alertas, TaskHub, Reuniões, Auditoria | ⬜ Aguardando F9 | 🟡 MÉDIO — UX operacional e rastreabilidade visual | — | — |
| 11 | Estratégia e Produto Pronto | ⬜ Aguardando F10 | 🟢 BAIXO — cockpit executivo e KPIs reais | — | — |

### Por que esta ordem de urgência?
- **F1 antes de tudo**: dual-systems (dados em dois lugares sem sync) causam perda silenciosa de dados em produção.
- **F2 logo após**: conflitos de reserva não verificados consistentemente = sobreposição de eventos real.
- **F3 antes de F4**: financeiro depende de colaboradores com vínculo canônico para calcular folha corretamente.
- **F4 antes de F5**: Ação só pode ser núcleo real quando orçamento existe como entidade vinculada.
- **F5 antes de F6**: eventos só fazem sentido quando Ação está conectada (os 7 eventos críticos dependem de acaoId).

---

## Fase 0 — Fundação Técnica

**Objetivo**: infraestrutura invisível que todas as fases dependem. Zero breaking changes para o usuário.

**Última sessão**: 2026-05-21 — Deploy realizado e UI principal reconstruída.

**Critério de saída**:
- [x] **[DEPLOY REALIZADO]** Código publicado no deployment CCBJ (`@10`, `@11`, `@12`)
- [x] `SistemaConfigService.getSetores()` retorna setores configurados (não hardcoded)
- [x] Zero constantes de organização hardcoded no código (exceto defaults documentados em config.gs)
- [x] Controle de acesso por domínio + aprovação manual implementado (AcessoService)
- [x] Nenhuma mudança de comportamento em produção

### 0.1 — Schema Canônico e Estrutura

- [x] Criar estrutura de diretórios `saas-v2/`
- [x] Criar `appsscript.json` e `.clasp.json`
- [x] Criar `gas/src/core/config.gs` — orgId + getOrgConfig() + `nomeAssistente`
- [x] Criar `gas/src/core/logger.gs`
- [x] Criar `gas/src/core/utils.gs` — utilitários e ABA_PARA_MODULO atualizado
- [x] Criar `gas/src/core/auth_session.gs` — com comentário arquitetural USER_DEPLOYING
- [x] Criar `gas/src/core/setup.gs` — schema de abas + verificarTodasAbas() + registrarSuperAdmin
- [x] Deploy concluído; inicialização/health ficam como smoke-test operacional no editor GAS quando necessário

### 0.2 — Camada de Persistência

- [x] Criar `gas/src/core/data_layer.gs` — lerJSON/salvarJSON/modifyJSON com lock
- [x] Criar `gas/src/core/services/data_gateway.gs` — abstração Google Sheets
- [x] Criar `gas/src/shared/response.gs` — GasResponse.wrap()
- [x] Criar `gas/src/repositories/i_repository.gs` — interface IRepository

### 0.3 — Sistema de Eventos e FSM

- [x] Criar `gas/src/core/event_bus_backend.gs` — SystemEvents
- [x] Criar `gas/src/core/events_constants.gs` — SystemEventTypes (70+ tipos)
- [x] Criar `gas/src/core/services/fsm_guardian.gs` — árbitro de FSMs
- [x] Criar `gas/src/core/services/auditoria_service.gs`
- [x] Criar `gas/src/core/services/auditoria_store.gs`
- [x] Criar `gas/src/core/services/cache_service.gs`

### 0.4 — ConfigService e config_org.json

- [x] Criar `gas/src/core/config_service.gs` — SistemaConfigService (facade unificado)
- [x] Criar `gas/src/core/data/config_org.json` — defaults CCBJ (setores, turnos, labels, rubricas)
- [x] Migrar todos os hardcodes identificados para `SistemaConfigService`
  - [x] Setores: v2 já usa `SistemaConfigService.getSetores()` — `SETORES_SISTEMA` não existe no v2
  - [x] Turnos: v2 usa `SistemaConfigService.getTurnos()` lendo de `config_org.json`
  - [x] Tabela INSS: em `config_org.json.parametrosRH.tabela_inss` + fallback em `_defaultParametrosRH()`
- [x] `config_org.json` atualizado: campo `contextoIA` para prompts de IA sem hardcode

### 0.5 — Serviços de Notificação e Permissões

- [x] Criar `gas/src/core/notification_engine.gs`
- [x] Criar `gas/src/core/services/permissoes_service.gs`
- [x] Criar `gas/src/core/services/usuarios_service.gs`
- [x] Criar `gas/src/core/services/ia_service.gs`
- [x] Criar `gas/src/core/services/metrics_engine.gs`

### 0.6 — Esqueleto de Integração (stubs)

- [x] Criar `gas/src/engines/integracao_orquestrador.gs` — stubs dos 7 eventos críticos
- [x] Criar `gas/src/engines/event_handler_registry.gs` — handlers vazios
- [x] Criar `gas/src/engines/alertas_engine.gs` — 25 tipos, catálogo completo, stubs Fase 10

### 0.7 — Router e Frontend Shell

- [x] Criar `gas/src/controllers/router.gs` — doGet() com roteamento interno/portal + `include()`
- [x] Criar `gas/src/frontend/index.html` — SPA com App/Router/Toast/BtnGuard v2 (roxo)
- [x] Criar `gas/src/portal/portal_cessao_pauta.html` — formulário com consentimento LGPD + BtnGuard
- [x] Criar `gas/src/portal/portal_pauta_status.html` — consulta por protocolo + BtnGuard
- [x] Criar `gas/src/portal/portal_inscricao.html` — inscrição com LGPD + foto + BtnGuard
- [x] Criar `gas/src/portal/portal_aprovacao.html` — aprovação via token de email + BtnGuard
- [x] Criar `gas/src/portal/portal_agenda.html` — agenda pública com filtros (links de navegação, sem async)
- [x] Criar `gas/src/shared/btnguard.html` — BtnGuard v2: `wrap`, `travar`, `liberar`, `auditar`

### 0.8 — Módulo Admin (ConfigAdmin)

- [x] Criar `gas/src/modules/admin/config_admin_service.gs` — CRUD espaços, setores, turnos, módulos
- [x] Criar `gas/src/modules/admin/boot_service.gs` — boot multi-tenant com orgId + cache
- [x] Criar `gas/src/modules/admin/user_profile_service.gs` — setor, preferências, perfil

### 0.9 — Saneamentos Urgentes

- [x] Confirmar zero emails hardcoded no código
- [x] Confirmar zero URLs org-específicas hardcoded
- [x] Zero nomes de organização em `.gs` — `notification_engine.gs` usa `{org}` dinâmico; `ia_service.gs` usa `_getSystemMsg()` + `getOrgConfig()`
- [x] `config.gs`: defaults `|| 'CCBJ'` aceitos (PropertiesService lido primeiro; fallback apenas para estado não-inicializado; Fase 11.4 eliminará)
- [x] Controle de acesso para domínios compartilhados: `AcessoService` + `primeiro_acesso.html` + router atualizado
- [x] **Logomarca**: `LogoPaletaService`, `SistemaConfigService.getLogoUrl/getPaleta`, `Identidade` JS, extração de cor via canvas, admin UI
- [x] **Paleta padrão → ROXO CCBJ**: `config_org.json`, `config_service.gs._defaultPaleta()`, `index.html :root` atualizados para `#7c3aed`
- [x] **BtnGuard v2**: criado `shared/btnguard.html`; `include()` em `router.gs`; todos os botões async protegidos em todos os templates

---

### 📋 Checklist BtnGuard — OBRIGATÓRIO a cada nova fase

> **Regra**: todo template HTML criado em qualquer fase DEVE:
> 1. Incluir `<?!= include('shared/btnguard'); ?>` no `<head>`
> 2. Usar `BtnGuard.wrap()` em todo botão que dispara async (google.script.run, fetch, setTimeout)
> 3. Marcar botões de navegação pura com `data-bg-skip="1"`
> 4. Ao final da fase: rodar `BtnGuard.auditar()` no console e confirmar "✅ todos protegidos"

| Fase | Auditoria BtnGuard | Status |
|------|-------------------|--------|
| 0 — Frontend shell + portais | `BtnGuard.auditar()` pós-deploy | ✅ Deploy realizado; auditoria visual pendente no browser |
| 1 — Persistência Canônica | Após criar views de tarefas/colaboradores | ✅ Tarefas + Colaboradores + Contratos criadas |
| 1.4 — Ativos (view-espacos) | `BtnGuard.auditar()` no console após abrir Módulo Espaços | ✅ Integrado na view tabbed de Espaços |
| 2 — Espaços e Almoxarifado | Após criar views de reservas/chaves | ✅ Todos os botões async protegidos (ReservasUI + ChavesUI + AlmoxUI) |
| 3 — Pessoas e RH | BtnGuard.auditar() pós-deploy @28 | ✅ Afastamentos + Ocorrências + Contratações + Habilitações |
| 4 — Financeiro | Após criar views financeiras | ✅ FontesUI + RemanejamentosUI + AditivosUI + FinanceiroTabs; Deploy @30 |
| 5 — Ações | BtnGuard.auditar() pós-deploy @61 | ✅ wrap em nova/salvar/editar; data-bg-skip em kanban/FSM |
| 6+ — Demais fases | Após cada view criada | ⬜ |

---

## Fase 1 — Persistência Canônica

**Objetivo**: cada domínio com UMA fonte de verdade. Zero dual-systems.

**Status**: 🟡 Em andamento — 1.1, 1.2, 1.3 e 1.4 entregues; Fase 1 concluída

**Próximo passo quando iniciar**:
> Próximo: `1.2 — Colaboradores`: criar repositório canônico e engine de pessoas.

### 1.1 — Tarefas (canônico: tarefas.json)

- [x] Criar `gas/src/modules/tarefas/tarefa_repository.gs`
- [x] Criar `gas/src/modules/tarefas/tarefa_engine.gs` — refatorado com orgId
- [x] Criar `gas/src/modules/tarefas/tarefas_controller.gs` — bridge `ctrl_tarefas_*`
- [x] Criar view mínima de Tarefas no SPA para listar/criar/concluir
- [x] Script de migração: Sheet → JSON (`fase1_tarefas_migrarSheetParaJson`)
- [x] Marcar Sheet como read-only operacional (`fase1_tarefas_prepararIndice`)

### 1.2 — Colaboradores (fusão Equipes + RH)

- [x] Criar `gas/src/modules/pessoas/colaborador_repository.gs` — fonte de verdade: colaboradores.json; índice: EQUIPES.Funcionarios; sub-coleções: ferias.json, escalas.json, avaliacoes.json, historico_rh.json
- [x] Criar `gas/src/modules/pessoas/pessoas_engine.gs` — FSM status colaborador + FSM férias; listar, salvar, mudarStatus, escalas, avaliações, histórico, desligamento oficial, migração
- [x] Criar `gas/src/modules/pessoas/pessoas_controller.gs` — ctrl_pessoas_* + ctrl_rh_*; RBAC por papel; filtro histórico por nível; férias com FSM completa
- [x] View mínima de Colaboradores no SPA — métricas, formulário CRUD, lista com filtro de status, badge de vínculo
- [x] Script de migração: `fase1_colaboradores_migrarFuncionarios()` — idempotente, funde funcionarios.json → colaboradores.json
- [x] Índice: `fase1_colaboradores_prepararIndice()` — garante cabeçalho + proteção read-only em EQUIPES.Funcionarios

**Smoke-test 1.2:**
1. GAS Editor: executar `fase1_colaboradores_prepararIndice()` → deve retornar `{ok:true}`
2. GAS Editor: executar `fase1_colaboradores_migrarFuncionarios()` → deve retornar `{importados:N, ignorados:0}`
3. Browser: Módulo Pessoas → clicar "Novo" → preencher nome + setor + vínculo → Salvar → confirmar aparece na lista
4. Drive: abrir `colaboradores.json` → confirmar que o registro existe com `orgId` correto

### 1.3 — Contratações (Contratos)

- [x] Criar `gas/src/modules/financeiro/contrato_repository.gs` — fonte: contratos.json (nested: metas→rubricas→indicadores); índice: FINANCEIRO.Contratos; migração idempotente
- [x] Criar `gas/src/modules/financeiro/contratos_engine.gs` — FSM Ativo↔Suspenso→Encerrado; salvar/excluir/analisar/métricas; orquestração metas/rubricas/indicadores
- [x] Criar `gas/src/modules/financeiro/contratos_controller.gs` — ctrl_contratos_* com RBAC (leitura: financeiro+gestor+admin; escrita: financeiro+admin; exclusão: admin)
- [x] View SPA Financeiro — métricas, formulário CRUD, lista com filtro de status, badges de status, ContratosUI, GAS.contratos namespace, rota registrada no Router
- [x] Script de migração: `fase1_contratos_migrarSheetParaJson()` — idempotente, Sheet → contratos.json
- [x] Índice: `fase1_contratos_prepararIndice()` — garante cabeçalho + proteção read-only em FINANCEIRO.Contratos

**Smoke-test 1.3:**
1. GAS Editor: executar `fase1_contratos_prepararIndice()` → deve retornar `{ok:true}`
2. GAS Editor: executar `fase1_contratos_migrarSheetParaJson()` → deve retornar `{importados:N}`
3. Browser: Módulo Financeiro → verificar métricas (total/ativos/suspensos/valorAtivos)
4. Browser: clicar "Novo" → preencher nome + fonte de recurso + valor → Salvar → confirmar na lista
5. Drive: abrir `contratos.json` → confirmar que o registro existe com `orgId` correto

### 1.4 — Ativos e Almoxarifado

- [x] Criar `gas/src/modules/espacos/ativos_repository.gs` — fonte canônica ESPACOS.Ativos; índices MovimentacoesAtivos, BaixasAtivos, Manutencoes
- [x] Criar `gas/src/modules/espacos/ativos_engine.gs` — FSM: disponivel↔reservado↔em_uso↔manutencao→baixado; métricas; auditoria; eventos
- [x] Criar `gas/src/modules/espacos/ativos_controller.gs` — ctrl_ativos_* com RBAC (leitura: todos; escrita: infraestrutura+gestor+admin; baixa: admin)
- [x] Criar `gas/src/modules/espacos/almoxarifado_engine.gs` — FSM stub: solicitado→aprovado→retirado→devolvido; interfaces definidas para Fase 2.2
- [x] View SPA Espaços — AtivosUI (métricas, CRUD, filtro status, badges, ações de manutenção), GAS.ativos namespace, rota `espacos` registrada no Router
- [x] `fase1_ativos_prepararIndice()` — garante cabeçalhos nas 4 abas ESPACOS de ativos
- [x] Nota: `almoxarifado.json` legado marcado como read-only no código — migração formal na Fase 2.2

**Smoke-test 1.4:**
1. GAS Editor: executar `fase1_ativos_prepararIndice()` → deve retornar `{ok:true}`
2. Browser: Módulo Espaços → verificar métricas (total/disponíveis/em uso/manutenção)
3. Browser: clicar "Novo Ativo" → preencher nome + categoria → Salvar → confirmar na lista
4. Browser: clicar botão Manutenção → confirmar status muda para "Manutenção"
5. Browser: clicar "Concluir Manutenção" → confirmar retorno para "Disponível"
6. Sheet ESPACOS.Ativos: confirmar que o registro aparece com todos os campos

---

## Fase 2 — Espaços e Almoxarifado com Bloqueio Real

**Objetivo**: reservas sem sobreposição possível. Conflito é impossível por design.

**Status**: ✅ Concluída (2026-05-22)

### 2.1 — Reservas de Espaço com conflito garantido

- [x] Criar `gas/src/modules/espacos/reserva_repository.gs` — ESPACOS.Reservas Sheet canônica; headers; listarAtivosParaConflito()
- [x] Criar `gas/src/modules/espacos/reserva_engine.gs` — `assertSemConflito()` + `assertHorarioFuncionamento()` dentro de LockService; FSM pendente→confirmado→em_uso→concluido; criar/criarLote/atualizar/mudarStatus/verificarDisponibilidade
- [x] Criar `gas/src/modules/espacos/reservas_controller.gs` — ctrl_reservas_* com RBAC (colaborador: próprias; gestão: todas)
- [x] `fase2_reservas_prepararIndice()` — wrapper global para GAS Editor

### 2.2 — Sistema de Empréstimo de Itens

- [x] Criar `gas/src/modules/espacos/reservas_itens_repository.gs` — MASTER.Itens + ESPACOS.EmprestimosItens; `quantidadeEmUsoPeriodo()`
- [x] Atualizar `gas/src/modules/espacos/almoxarifado_engine.gs` — implementação completa da FSM; `assertItemDisponivel()` com LockService; `verificarAtrasos()` + eventos KEY_PROTOCOL_DELAYED
- [x] `fase2_emprestimos_prepararIndice()` — wrapper global

### 2.3 — Protocolo de Chaves

- [x] Criar `gas/src/modules/espacos/chave_repository.gs` — ESPACOS.Chaves Sheet canônica
- [x] Criar `gas/src/modules/espacos/chave_engine.gs` — FSM aberto→atrasado→devolvido; `verificarAtrasos()` com eventos
- [x] Criar `gas/src/modules/espacos/chaves_controller.gs` — ctrl_chaves_* + ctrl_almox_*
- [x] `fase2_chaves_prepararIndice()` — wrapper global

### 2.4 — View Espaços com Tabs

- [x] View `view-espacos` expandida com 4 tabs: Reservas | Chaves | Empréstimos | Patrimônio
- [x] `EspacosUI` — controlador de tabs + métricas consolidadas no topo
- [x] `ReservasUI` — CRUD completo + verificar disponibilidade + BtnGuard
- [x] `ChavesUI` — CRUD + devolução + BtnGuard
- [x] `AlmoxUI` — CRUD + aprovação/retirada/devolução + BtnGuard
- [x] GAS namespaces: `GAS.reservas`, `GAS.chaves`, `GAS.almox`
- [x] Deploy @24 realizado

**Smoke-test 2.x:**
1. GAS Editor: executar `fase2_reservas_prepararIndice()` → `{ok:true}`
2. GAS Editor: executar `fase2_chaves_prepararIndice()` → `{ok:true}`
3. GAS Editor: executar `fase2_emprestimos_prepararIndice()` → `{ok:true}`
4. Browser: Módulo Espaços → tab Reservas → criar reserva "Teste A" (Auditório, 14:00-16:00)
5. Browser: criar segunda reserva no mesmo espaço/horário → **deve retornar erro de conflito**
6. Browser: tab Chaves → Nova Retirada → preencher sala → Registrar → Devolver
7. Console F12: `BtnGuard.auditar()` → "✅ todos protegidos"

**Gaps e modos de visualização — Fase 2 (implementar na Fase 5 ao revisar UI de reservas):**
- [ ] **Calendário de ocupação por sala**: visão semana/mês mostrando quais horários estão ocupados em cada sala
- [ ] **Heatmap de demanda**: sala × hora × dia da semana — cores por intensidade de uso
- [ ] **Calendário de disponibilidade por item**: "projetor disponível dias X, Y, Z desta semana" — gap crítico para almoxarife
- [ ] **Kanban de empréstimos**: colunas por FSM (Solicitado | Aprovado | Retirado | Devolvido | Atrasado)
- [ ] **Diagrama de ocupação em tempo real**: mapa visual das salas agora — livre/ocupada/em_manutenção
- [ ] **Lista de reservas**: tabela com filtros por sala, setor, período, status — com exportação
- [ ] **Modo lote (criação)**: UI para criar reservas recorrentes (semanal, mensal, intervalo)

---

## Fase 3 — Pessoas, RH e Contratações

**Objetivo**: domínio de pessoas robusto; contratações com aprovação real e bloqueio orçamentário.

**Status**: ✅ Concluída (2026-05-22)

### 3.1 — PessoasEngine consolidado

- [x] Perfil completo: dados pessoais, vínculos históricos, funções, competências (já estava na Fase 1.2)
- [x] Escalas: por turno, semana, mês — por setor (já estava na Fase 1.2)
- [x] FSM de férias: solicitação → aprovação → registro → substituição na escala (já estava na Fase 1.2)
- [x] Afastamentos com FSM (rascunho→ativo→encerrado) e impacto automático no status do colaborador
- [x] Ocorrências (advertência, suspensão, elogio, observação) com rastro em histórico RH

### 3.2 — EntidadeContratavel (PF + PJ unificado)

- [x] `ContratadoRepository`: `contratados_registry.json` + `habilitacoes.json`; índice `MASTER.Contratados`; busca por CPF/CNPJ
- [x] `ContratadoEngine`: FSM contratado (cadastrado→habilitado↔suspenso→descredenciado) + FSM habilitação (6 estados)
- [x] Habilitação integrada: aprovar habilitação promove contratado para "habilitado"; suspender habilitação suspende contratado

### 3.3 — Fluxo de Aprovação Multinível de Contratações

- [x] `SolicitacaoEngine`: FSM 9 estados (rascunho→submetida→aprovada_gestor→aprovada_financeiro→em_execucao→concluida)
- [x] OrcamentoGuard.assertDisponivel() stub — loga e audita, não bloqueia (Fase 4 implementará check real)
- [x] Notificação ao próximo aprovador a cada transição (via SystemEvents)
- [x] CQRS explícito: leitura com cache, escrita invalida cache (contratacoes_controller.gs)
- [x] Snapshot antes de rejeição/cancelamento (padrão Skill.md)

### Gaps identificados na Fase 3 (análise V1→V2) — corrigir na Fase 5 ou 11.4

- [ ] **Aprovação de férias por link de email**: FSM existe mas gestor precisa estar logado para aprovar — implementar tokens (Fase 6)
- [ ] **Notificação de férias com link de aprovação**: `NotificationEngine` deve gerar token + link direto no email
- [ ] **Ponto eletrônico / banco de horas**: totalmente ausente; necessário para CLT (ver Fase 11.4)
- [ ] **Custo CLT**: não calculado; impede planejamento de folha (ver Fase 11.4)
- [ ] **Cálculo de rescisão**: não existe (ver Fase 11.4)

**Modos de visualização — Fase 3 (implementar ao expandir):**
- [ ] **Lista de colaboradores**: tabela com filtros (setor, vínculo, status) + busca por nome
- [ ] **Card de perfil**: foto/avatar, cargo, setor, vínculos históricos, indicadores (faltas, escalas)
- [ ] **Agenda de escalas**: calendário semana/mês — quem trabalha em qual turno (por setor)
- [ ] **Calendário de férias**: linha do tempo de férias aprovadas + alertas de vencimento
- [ ] **Kanban de contratações**: colunas por estágio da FSM (Rascunho | Submetida | Aprovada Gestor | Aprovada Financeiro | Em Execução | Concluída)
- [ ] **Lista de habilitações**: agentes por status de habilitação com filtros e ações em lote
- [ ] **Fluxograma de aprovação**: visualização da FSM de contratação para uma solicitação específica

---

## Fase 3.4 — RH Avançado e Ponto Eletrônico

**Objetivo**: completar o módulo de Pessoas com funcionalidades RH essenciais para CLT e planejamento de folha.

**Status**: ⬜ Não iniciada (pode ser executada em paralelo com Fase 6)

**Próximo passo quando iniciar**:
> Criar `PontoRepository` + `PontoEngine`; integrar com escalas de `PessoasEngine`.

### 3.4.1 — Ponto Eletrônico e Banco de Horas

- [ ] Criar `gas/src/modules/pessoas/ponto_repository.gs` — fonte: `ponto.json`; índice: `EQUIPES.Ponto`
- [ ] Criar `gas/src/modules/pessoas/ponto_engine.gs` — registro entrada/saída; cálculo de horas regulares, extras e banco de horas
- [ ] **Registro via link**: colaborador clica em link no email → registra entrada/saída sem login
- [ ] Integração com escalas: horas trabalhadas vs horas previstas na escala
- [ ] **Relatório mensal de ponto** por colaborador (exportável)
- [ ] **Alertas de irregularidades**: falta não justificada, banco de horas acumulado acima do limite

### 3.4.2 — Custo CLT e Folha de Pagamento

- [ ] **Custo CLT completo**: INSS + Sistema S + FGTS + PIS + benefícios (VT, VA, plano) + provisões (13º, férias+1/3, FGTS rescisório)
- [ ] **Fluxo de caixa RH**: linha mensal de custo previsto por vínculo para todo o período do contrato
- [ ] **Simulação de cenário**: reajuste % aplicado em toda a folha + impacto financeiro imediato
- [ ] Parâmetros via `config_org.json`: tabela INSS, alíquotas encargos, teto benefícios (não hardcoded)

### 3.4.3 — Rescisão e Turnover

- [ ] **Calculadora de rescisão**: estimativa de custo por modalidade (pedido de demissão, demissão sem justa causa, etc.)
- [ ] **Break-even de demissão**: economia mensal esperada vs custo rescisório total
- [ ] **Indicadores de turnover**: taxa voluntário/involuntário; custo de rotatividade; comparativo períodos
- [ ] Geração de PDF de rescisão via `RelatoriosPDFService` (Fase 10)

**Modos de visualização — Fase 3.4:**
- [ ] **Calendário de ponto**: presença × ausência por colaborador no mês (grid dia × status)
- [ ] **Heatmap de banco de horas**: por pessoa × mês — excesso acumulado visível
- [ ] **Dashboard de folha**: custo total por vínculo; comparativo mês a mês; projeção anual
- [ ] **Gráfico de turnover**: entradas × saídas no período; linha de tendência

---

## Fase 4 — Financeiro e Gestão de Contratos

**Objetivo**: módulo financeiro completo, da proposta à prestação de contas.

**Status**: ✅ Concluída (2026-05-22) — gaps identificados em análise comparativa V1→V2 (ver 4.5)

### 4.1 — FonteRecurso como entidade

- [x] Criar `gas/src/modules/financeiro/fonte_recurso_engine.gs`
- [x] FSM: ativo → suspenso → encerrado

### 4.2 — Ferramenta de Proposta Orçamentária

- [ ] OrcamentoPropostaEngine com FSM: rascunho → revisao → submetida → aprovada
- [ ] Validação automática de tetos por edital (Lei Rouanet, divulgação ≤ 20%)
- [ ] Exportação para Sheets + PDF via RelatoriosPDFService (Fase 10)

### 4.3 — Remanejamentos com aprovação intersetores

- [x] RemanejamentoEngine com FSM de 6 estados
- [x] Snapshot imutável de saldos por aprovação
- [x] Thresholds configuráveis por valor

### 4.4 — Aditivos Contratuais

- [x] AditivoContratoEngine com FSM (7 estados, aprovação 2 etapas)
- [x] Efetivação automática nas rubricas/metas após aprovação

### 4.5 — Gaps identificados (análise V1→V2) — corrigir retroativamente

- [ ] **Cronograma de desembolso** em FonteRecurso: campo de previsão mensal de recebimento (editais têm cronograma definido)
- [ ] **Contrapartida obrigatória**: campo em FonteRecurso exigido pela Lei Rouanet
- [ ] **OrcamentoPropostaEngine** (Fase 4.2 não entregue): formulário de proposta com validação de tetos por rubrica
- [ ] **Exportação SALIC**: formato XML para prestação de contas Lei Rouanet (entregar na Fase 11)
- [ ] **Fluxo de caixa por contrato**: linha mensal de recebimentos e pagamentos previstos vs realizados

**Modos de visualização — Fase 4:**
- [ ] **Lista/tabela**: contratos, fontes de recurso, remanejamentos, aditivos (padrão atual)
- [ ] **Dashboard financeiro**: execução por contrato/meta/rubrica/setor (barras empilhadas, % executado)
- [ ] **Fluxo de caixa**: timeline mensal — recebimentos previstos vs realizados por fonte
- [ ] **Kanban de aprovação**: remanejamentos e aditivos por estágio da FSM (rascunho → aguardando → aprovado → efetivado)
- [ ] **Comparativo previsto/realizado**: por rubrica, com semáforo de risco (verde/amarelo/vermelho)

---

## Backlog V1→V2 — Funcionalidades Identificadas mas Não Migradas (Fases Futuras)

> Análise linha-a-linha do v1 (mod_comunicacao.gs, mod_relatorios.gs, mod_admin.gs, mod_metrics.gs)
> revelou funcionalidades implementadas no legado que ainda não existem no v2.

| Funcionalidade | Origem v1 | Status v2 | Fase planejada |
|---|---|---|---|
| Agenda RECE (25 campos, CRUD completo) | mod_comunicacao.gs | ❌ ausente | Fase 6 |
| Sync bidirecional Reservas ↔ RECE | mod_comunicacao.gs | ❌ ausente | Fase 6 |
| Convites Google Calendar (multi-guest) | mod_comunicacao.gs | ❌ ausente | Fase 6 |
| Email institucional HTML (branding CCBJ) | mod_comunicacao.gs | ❌ ausente | Fase 6 |
| Upload de imagem Drive ("CCBJ_RECE_Imagens") | mod_comunicacao.gs | ❌ ausente | Fase 6 |
| Preferências por usuário (salvarPreferencia/carregarPreferencias) | mod_preferencias.gs | ❌ ausente | Fase 6 |
| IA conversacional sobre reservas (perguntarIA/sugerirReservaIA) | mod_metrics.gs | ⚠️ parcial em ia_service | Fase 6 |
| Sugestões de horário livre ao conflito de reserva | mod_reservas.gs | ❌ ausente | Fase 6 |
| CODIP (34 campos por reserva, relatórios e dashboard) | mod_relatorios.gs | ❌ ausente | Fase 7 |
| Comparação de versões de contrato (diff+heatmap+ranking) | mod_relatorios.gs | ❌ ausente | Fase 7 |
| Geração de documentos PPT/DOC/PDF via Drive | mod_relatorios.gs | ❌ ausente | Fase 8 |
| IA para reescrever descrição de ação (Groq) | mod_relatorios.gs | ❌ ausente | Fase 8 |
| Dashboard unificado cross-módulo (Reservas+Itens+CODIP+Solicitações) | mod_metrics.gs | ⚠️ existe por módulo, sem unificado | Fase 5/6 |
| Analisar dashboard por IA (analisarDashboardIA) | mod_metrics.gs | ⚠️ parcial em ia_service | Fase 6 |
| Rate limiting backend (limitarRequisicoes+detectarComportamentoSuspeito) | mod_admin.gs | ❌ ausente | Fase 9 |
| Rollback de ações por superadmin | mod_admin.gs | ❌ ausente | Fase 10 |
| Status HABILITADO nas reservas (FSM + habilitarReservaStatus) | mod_reservas.gs | ❌ ausente | Fase 5 |
| Export CSV da agenda com BOM UTF-8 | mod_relatorios.gs | ❌ ausente | Fase 7 |

---

## Fase 5 — Ação como Núcleo Real

**Objetivo**: Ação conectada de fato com todos os domínios. Entidade central com módulo próprio.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> 1. Criar `AcaoRepository` + `AcaoEngine` (ENTIDADE CENTRAL — ainda não existe como módulo)
> 2. Adicionar `acaoId` a Reservas, Tarefas, Contratos (campos opcionais, migração idempotente)
> 3. Criar `fase5_acoes_prepararIndice()` global

### 5.1 — AcaoRepository + AcaoEngine (NOVO — não existe no V2)

- [x] Criar `gas/src/modules/acoes/acao_repository.gs` — fonte canônica: `acoes.json`; índice: `ACOES.Acoes`
- [x] Criar `gas/src/modules/acoes/acao_engine.gs` — FSM + cálculos de execução + métricas
- [x] Criar `gas/src/modules/acoes/acoes_controller.gs` — `ctrl_acoes_*` com RBAC
- [x] `fase5_acoes_prepararIndice()` — garante aba `ACOES.Acoes` com headers
- [x] `inicializarSistema()` → inclui chamada ao `prepararIndice()` de Ações

### 5.2 — Campos da Ação

- [x] **Campos públicos vs internos**: `visibilidadePublica` + `descricaoPublica` vs `descricao`
- [x] `acaoId` referenciado em: Reservas, Tarefas, Contratos (já existia nos repos desde F1-F2)
- [ ] `AcoesRecursos` populado automaticamente em todos os flows de vínculo (Fase 6)
- [x] Campo `riderTecnico`: lista de necessidades técnicas no schema

### 5.3 — FSM de Ação revisada

- [x] `planejada → em_producao → em_execucao → concluida → arquivada` + `cancelada`
- [ ] Transição automática: 1ª reserva confirmada → `em_producao` (Fase 6 — EventHandlerRegistry)
- [x] Transição automática: Ação concluída → dispara evento `ACTION_COMPLETED` via IntegracaoOrquestrador
- [x] Snapshot de estado antes de transições críticas (padrão Skill.md)

### 5.4 — Painel Integrado da Ação (6 tabs entregues, 3 futuras)

- [x] **[Visão Geral]** — status/responsável/setor/período/público/visibilidade + botões FSM
- [x] **[Tarefas]** — lista tarefas vinculadas por acaoId (backend ctrl_acoes_painel)
- [x] **[Reservas]** — espaços reservados com sala/data/horário/status
- [x] **[Contratos]** — contratos vinculados com valor total
- [x] **[Equipe]** — membros da equipe da ação
- [x] **[Financeiro]** — previsto/executado/saldo por contratos vinculados
- [ ] **[Reuniões]** — Fase 10 (ReuniõesEngine ainda não existe)
- [ ] **[Itens/Almox]** — Fase 5.5 (vincular almoxarifado a acaoId)
- [ ] **[Entregas/Evidências]** — Fase 8 (AcervoEngine)

### 5.5 — Reservas com modo lote (gap V1→V2)

- [ ] **Modo lote**: seleção de múltiplas datas (manual, semanal por dia, intervalo, mensal por data) — recuperar de `mod_reservas.gs: processarAgendamentoLote()`
- [ ] **Buffer de 5 minutos** entre reservas: margem configurável de limpeza/preparação (1 linha em `reserva_engine.gs: assertSemConflito`)
- [ ] **Status "Habilitado"**: adicionar à FSM de reservas como estado entre Confirmada e Em Uso
- [ ] **Cancelamento com justificativa**: distinção UI entre cancelamento simples e com motivo obrigatório
- [ ] **Notificação urgente** de cancelamento no mesmo dia: `_notificarCancelamentoMesmoDia()` — email para admins

### 5.6 — IA Assistente — integração inicial (gap V1→V2)

- [ ] **Sugestão de horário**: campo "descreva o que precisa" → `ia_service.gs` retorna slots disponíveis com score
- [ ] **Redação de descrição**: botão "Redigir com IA" no formulário de criação de Ação
- [ ] **Parser seguro**: `parsearJsonIA()` — fallback para respostas mal formadas da API Groq

**Modos de visualização — Fase 5:**
- [ ] **Kanban de Ações**: colunas por FSM (Planejada | Em Produção | Em Execução | Concluída | Arquivada) — estilo Linear
- [ ] **Lista/tabela**: todas as ações com filtros (setor, período, status, responsável) + busca
- [ ] **Card/Grid**: visão compacta com progresso visual — barra de execução financeira + física
- [ ] **Calendário/Agenda**: ações ao longo do tempo (início → fim), sobreposição visual de períodos
- [ ] **Timeline/Gantt**: ações com duração, marco de datas críticas, sobreposição de recursos
- [ ] **Painel de 9 tabs**: visão detalhada de uma ação específica (detalhe do card)
- [ ] **Diagrama de ocupação de espaços**: heatmap sala × hora × dia (calendário de calor visual)

---

## Fase 6 — Integração via Eventos + Módulo RECE

**Objetivo**: EventBus reativo funcional; Módulo RECE (Rede de Equipamentos Culturais) implementado.

**Status**: ✅ Entregue (2026-05-23) — Deploy @132

### 6.1 — EventHandlerRegistry funcional (7 handlers críticos)

- [x] `RESERVATION_CREATED` → TarefaEngine (cria tarefa prep espaço) + notifica RECE se Ação pública
- [x] `ACTION_STARTED` → log rastreável (FinanceiroEngine: Fase 4+ quando contratos tiverem acaoId)
- [x] `ACTION_COMPLETED` → email CODIP aos admins (PublicoEngine: Fase 7)
- [x] `CONTRACT_EXPIRED` → TarefaEngine (cria tarefa de renovação com prazo 30d)
- [x] `TASK_COMPLETED` → log rastreável (DemandaEngine: Fase 6.4)
- [x] `KEY_PROTOCOL_DELAYED` → TarefaEngine (cria tarefa de cobrança prazo 2d)
- [x] `ITEM_NOT_RETURNED` → TarefaEngine (cria tarefa de cobrança prazo 3d)

### 6.2 — Trigger assíncrono e observabilidade da fila

- [x] `MASTER.EventLog` — colunas 9-11 adicionadas: `status`, `tentativas`, `ts_processado`; migração segura de schema antigo
- [x] `processarEventosPendentes()` — time-trigger a cada 30 min; `criarTriggerEventosPendentes()` pronto para executar
- [x] Retry: máx 3 tentativas; após 3 → marcar `erro`; alerta admin quando > 100 pendentes
- [x] `ctrl_eventbus_status` — painel de fila no dashboard Observabilidade (contadores + lista de pendentes)

### 6.3 — Aprovação por link de email (gap V1→V2)

- [x] `TokenService` (`token_service.gs`): gera/valida/expira tokens (TTL 72h) em aba `MASTER.Tokens`; idempotente
- [x] `?secao=token_acao&token=X&acao=aprovar|recusar` — rota no router sem login; página de confirmação
- [x] Aplicado a: férias, remanejamentos, aditivos, solicitações de contratação, cessão de pauta
- [ ] `NotificationEngineTokens.enviarSolicitacaoFerias/Remanejamento/Aditivo` criados — integração com engines ao aprovar em Fase 7

### 6.4 — DemandaEngine e reorganização semântica

- [ ] `DemandaEngine`: renomear — postergado Fase 7
- [ ] `SolicitacaoEspacoEngine`: separar — postergado Fase 7

### 6.5 — Módulo RECE (Rede de Equipamentos Culturais do Ceará)

- [x] `rece_repository.gs` — JSON `rece_agenda.json` + aba `COMUNICACAO.AgendaRECE` (29 colunas); listar/buscar/salvar/excluir/metricas/proximoId/prepararIndice
- [x] `rece_engine.gs` — FSM rascunho→submetida→publicada→encerrada + cancelada; FsmGuardian registrado; sincronização com Reserva Geral via `notificarNovaReserva`; upload Drive; convites Calendar; email ao publicar
- [x] `rece_controller.gs` — `ctrl_rece_listar/obter/metricas/salvar/mudar_status/excluir/upload_imagem` com RBAC `comunicacao`
- [x] **25 campos da Agenda RECE** implementados no schema
- [x] **Upload de imagem**: `ReceEngine.uploadImagem()` → Drive pasta `CCBJ_RECE_Imagens`
- [x] **Convites Google Calendar**: `_enviarConvitesCalendar()` ao publicar
- [x] **Email institucional**: `_enviarEmailPublicacao()` ao publicar
- [x] **Sincronização automática**: `notificarNovaReserva()` chamado pelo EventHandlerRegistry no `RESERVATION_CREATED`
- [x] `fase6_rece_prepararIndice()` global executável no GAS Editor
- [ ] `fase6_rece_prepararIndice()` — garante aba `COMUNICACAO.AgendaRECE` com 25 headers

**Modos de visualização — Fase 6 / RECE:**
- [ ] **Agenda/Calendário RECE**: eventos por semana/mês com cor por status (rascunho/publicado/encerrado)
- [ ] **Lista**: eventos RECE com filtros (período, espaço, status, responsável)
- [ ] **Card**: evento RECE com imagem thumbnail, artista, data e badges de categoria
- [ ] **Painel de status de fila**: lista de eventos pendentes + processados + erros (observabilidade do EventBus — estilo Datadog simplificado)

---

## Fase 7 — Portal Externo, Público, CODIP e ExportacaoEngine

**Objetivo**: canal externo funcional; dados de público para Lei Rouanet/CODIP; engine de exportação institucional.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Reestruturar `portal/` existente: as shells HTML estão criadas (Fase 0) mas sem backends funcionais.

### 7.1 — Portal Externo (backends funcionais)

- [ ] Estrutura `portal/` — controllers públicos separados com RBAC "public"
- [ ] **Rate limiting** por IP/email + **CSRF token** para formulários públicos
- [ ] **Cessão de Pauta**: formulário público → validações de negócio (antecedência mínima 15 dias, rider técnico obrigatório, bloqueio de atividades comerciais) → protocolo + email de confirmação
- [ ] **Mensagens contextualizadas por status**: "Sua cessão está sendo analisada. Prazo estimado: 5 dias úteis" — configuráveis em `config_org.json`
- [ ] **Calendário público**: ações com `visibilidadePublica: true` + filtros (tipo, gratuito/pago, período, espaço)
- [ ] **Feed iCal**: exportação de eventos públicos como calendário iCal para integração com Google Calendar/Outlook
- [ ] **ConsentimentoService**: `gas/src/core/services/consentimento_service.gs` — base legal LGPD + histórico por titular + revogação

### 7.2 — Gestão de Público (PublicoEngine)

- [ ] Criar `gas/src/modules/publico/publico_engine.gs` + `publico_repository.gs` + `publico_controller.gs`
- [ ] **Inscrições online**: formulário por Ação com dados (nome, email, idade, CEP, ocupação, renda opcional), consentimento LGPD explícito via `ConsentimentoService`
- [ ] **Lista de espera automática**: quando capacidade atingida → inscrição vai para espera → notificação automática se vaga abrir
- [ ] **Check-in de presença**: QR code por sessão OU lista manual com confirmação
- [ ] **Frequência por sessão** (gap crítico V1→V2): registro por aula/encontro (não só por ação) — essencial para cursos e oficinas
- [ ] **Pesquisa de satisfação**: disparada automaticamente 3-7 dias após Ação concluída (via evento `ACTION_COMPLETED`)
- [ ] **Certificado de conclusão**: automático ao atingir critério de frequência mínima configurável (ex: 75%); gerado via `RelatoriosPDFService`
- [ ] **Dashboard de público**: total beneficiários, perfil demográfico agregado (anônimo — LGPD), origem geográfica por CEP/bairro
- [ ] `fase7_publico_prepararIndice()` — garante aba `PUBLICO.Inscritos` com headers

### 7.3 — LGPD Sistemática (ConsentimentoService)

- [ ] **Registrar base legal** de cada coleta: consentimento, legítimo interesse, obrigação legal
- [ ] **Histórico de consentimentos** por titular: quando consentiu, para qual finalidade, via qual formulário
- [ ] **Revogação de consentimento**: titular pode revogar via portal; dados ficam anonimizados
- [ ] **Log de acessos a dados sensíveis**: quem acessou dados pessoais e quando
- [ ] **Status LGPD por arquivo de acervo**: imagem/vídeo precisa ter: consentimento coletado? para qual uso? (fotos de eventos são dados sensíveis)

### 7.4 — ExportacaoEngine (engine transversal)

> **Centraliza toda exportação para órgãos externos** — evita que cada módulo implemente o próprio export.

- [ ] Criar `gas/src/engines/exportacao_engine.gs`
- [ ] **CODIP (Secult/CE)**: 28 campos por evento; consolidação mensal dos dados; exportação JSON/CSV no formato Secult/CE
- [ ] **SALIC (MinC)**: XML de prestação de contas Lei Rouanet por projeto; validação automática de campos obrigatórios
- [ ] **SNIIC (MinC)**: indicadores nacionais de produção cultural (anuais)
- [ ] **ZIP de acervo por Ação**: compila fotos, vídeos, releases, atas com checklist de evidências
- [ ] **RelatoriosPDFService**: geração de PDFs via Google Docs API com template institucional CCBJ
  - Ata de reunião (template estruturado aprovado)
  - Contrato de prestação de serviço (para contratados)
  - Certificado de participação (voluntários, público de cursos)
  - Declaração de habilitação (agentes culturais)
  - Relatório de execução (por ação, por contrato)

**Modos de visualização — Fase 7:**
- [ ] **Calendário de eventos públicos**: portal externo com filtros visuais (tipo, gratuito, período, espaço)
- [ ] **Lista de inscrições**: por ação — nome, status (confirmado/lista de espera), check-in, frequência
- [ ] **Painel de frequência por sessão**: grade sessão × participante (✅/❌) — para cursos
- [ ] **Dashboard de público**: cartões com métricas (total inscritos, presença média, % satisfação, NPS)
- [ ] **Funil de inscrição**: inscritos → confirmados → presentes → certificados (funil de conversão visual)
- [ ] **Status de cessão de pauta**: trilha visual de status para o agente externo (estilo rastreamento de encomenda)

---

## Fase 8 — Agentes Culturais, Acervo, Voluntários e Parcerias

**Objetivo**: banco completo de agentes; memória institucional digital; gestão de parcerias.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Criar `AgenteCultural` como entidade com portal de auto-cadastro (depende do Portal da Fase 7 estar funcional).

### 8.1 — Banco de Agentes Culturais

- [ ] Criar `gas/src/modules/agentes/agente_repository.gs` — fonte: `agentes_culturais.json`; índice: `MASTER.AgentesculturaisIndex`
- [ ] Criar `gas/src/modules/agentes/agente_engine.gs` — FSM: rascunho→ativo↔suspenso→descredenciado; integração com `HabilitacoesEngine`
- [ ] **Perfil completo**: áreas artísticas, linguagens, portfolio (links), histórico de vínculos com a instituição, disponibilidade
- [ ] **Rider técnico por artista**: banco de necessidades técnicas (equipamentos, iluminação, som, palco, camarim); ao contratar → rider puxado automaticamente para lista de tarefas de infraestrutura
- [ ] **Portal de auto-cadastro**: extensão do portal externo (Fase 7) — agente preenche próprio perfil sem login interno
- [ ] **Busca de agentes**: por área, linguagem, disponibilidade, histórico, habilitação
- [ ] Integração bidirecional: agente habilitado → `EntidadeContratavel`; ao contratar → busca perfil do agente

### 8.2 — Acervo Digital

- [ ] Criar `gas/src/modules/acervo/acervo_repository.gs` + `acervo_engine.gs` + `acervo_controller.gs`
- [ ] **Upload por Ação**: foto, vídeo, release, poster, folder, ata — com tags + tipo
- [ ] **Status LGPD por arquivo**: consentimento coletado? para qual uso? — obrigatório para imagens de pessoas
- [ ] **Checklist de evidências por Ação**: quantas fotos? release publicado? vídeo de qualidade? — visibilidade do estado da prestação de contas
- [ ] **Exportação ZIP**: compila arquivos de uma Ação com checklist para prestação de contas (via `ExportacaoEngine`)

### 8.3 — Voluntários

- [ ] Criar `gas/src/modules/voluntarios/voluntario_repository.gs` + engine + controller
- [ ] Cadastro: competências, disponibilidade, histórico de participações
- [ ] **Alocação a Ações**: função + horário definidos
- [ ] **Confirmação de presença**: link automático no email de convite
- [ ] **Registro de horas realizadas**: com rastreamento por Ação
- [ ] **Certificado automático** de participação: gerado via `RelatoriosPDFService` ao encerrar Ação

### 8.4 — Parcerias e Co-Produções (gap V1→V2 — não estava no PROGRESS.md)

- [ ] Criar `gas/src/modules/parcerias/parceria_repository.gs` + `parceria_engine.gs` + `parceria_controller.gs`
- [ ] Entidade `Parceria`: organizações, coletivos, entidades co-produtoras
- [ ] **Co-produção**: divisão de responsabilidades, custos e entregas entre parceiros
- [ ] **Vinculação de Ações** a parcerias com papel de cada parceiro
- [ ] **Acompanhamento de entregas** de cada parceiro com status
- [ ] **Avaliação ao encerrar** parceria: histórico de desempenho por parceiro

**Modos de visualização — Fase 8:**
- [ ] **Grid de agentes**: cards com foto/avatar, áreas, linguagens e badge de habilitação — estilo diretório
- [ ] **Lista de agentes**: tabela com busca por área, disponibilidade, histórico
- [ ] **Galeria de acervo**: grid visual de mídias por Ação — miniatura + tipo + status LGPD
- [ ] **Lista de acervo**: tabela com filtros (ação, tipo, data, status LGPD, uso autorizado)
- [ ] **Kanban de voluntários**: por status de alocação (cadastrado → alocado → confirmado → presente)
- [ ] **Checklist visual de evidências**: progresso de prestação de contas por ação (fotos ✅ | release ✅ | vídeo ❌ | ata ✅)
- [ ] **Mapa de parcerias**: grafo simples de organizações parceiras × ações vinculadas

---

## Fase 9 — Multi-Tenancy e Painel Admin

**Objetivo**: segunda organização provisionada sem alterar código. SaaS demonstrável.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Injetar `orgId` em todos os repositórios e criar script de migração para dados existentes.

### 9.1 — orgId em todos os dados

- [ ] Injetar `orgId` em todo `salvar()` e filtrar em todo `listar()` (todos os repositórios)
- [ ] Script de migração idempotente para dados existentes sem `orgId`
- [ ] `dataFolder` → `orgId + '_DATA'` em todos os deployments
- [ ] Isolamento garantido por dados, não apenas por scriptId (padrão Skill.md)

### 9.2 — Wizard de configuração inicial

- [ ] Fluxo guiado: org, setores, turnos, espaços, módulos habilitados, roles
- [ ] Defaults razoáveis para nova organização (importados de `config_org.json` padrão)
- [ ] **Modo sandbox/demonstração**: nova org explora com dados de exemplo sem comprometer dados reais
- [ ] **Checklist de provisionamento**: automatizável em < 30 minutos; `verificarTodasAbas()` como validação final

### 9.3 — Feature flags via config_org.json (gap Skill.md)

- [ ] Habilitar/desabilitar módulos inteiros sem deploy: `modulosAtivos` em `config_org.json`
- [ ] Feature flags granulares: `features.ia_assistente`, `features.portal_publico`, `features.rece`, etc.
- [ ] Painel admin de flags: UI para ligar/desligar features sem editar JSON diretamente

**Modos de visualização — Fase 9:**
- [ ] **Wizard de setup**: fluxo passo a passo com progresso visual (stepper)
- [ ] **Painel de orgs** (superadmin): lista de organizações provisionadas com status, plano, última atividade
- [ ] **Checklist de provisionamento**: lista com indicadores ✅/❌ de cada etapa

---

## Fase 10 — Alertas, TaskHub, Reuniões, Comunicação e Auditoria Visual

**Objetivo**: sistema de alertas centralizado; centro de controle de tarefas; auditoria com rollback; UX operacional completa.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Expandir `AlertasEngine` para todos os 25+ tipos catalogados; implementar `obterMinhaCaixaDeEntrada()`.

### 10.1 — AlertasEngine completo

- [ ] 25+ tipos de alerta com severidade (INFO / ATENÇÃO / URGENTE) — catálogo já existe em `alertas_engine.gs`
- [ ] Alertas in-app: badge no header com contador + painel de notificações deslizante
- [ ] Escalação automática: aprovação pendente > 48h → escala para gestor superior
- [ ] Preferências por usuário: configurar quais tipos de alerta receber e por qual canal (in-app, email)
- [ ] **Tipos específicos ativos**:
  - Contrato vencendo (60/30/7 dias antes)
  - Rubrica com saldo crítico (< 10% do previsto)
  - Ação atrasada (execução física < 50% no meio do período)
  - Item de almoxarifado não devolvido (> prazo)
  - Processo sem movimentação (> N dias configurável)
  - Férias vencendo (30 dias antes do prazo legal)
  - Clima institucional deteriorando (> 15 pontos em 2 semanas)
  - Painel "Riscos do Mês" consolidado

### 10.2 — TaskHub (Centro de Controle)

- [ ] `obterMinhaCaixaDeEntrada()` — função que agrega de todos os módulos: tarefas atribuídas + aprovações pendentes + demandas em SLA + reuniões com encaminhamentos + alertas não lidos
- [ ] **Visão "Meu Dia"**: todas as pendências priorizadas por prazo + SLA consumido
- [ ] **Visão "Meu Time"** (gestores): carga de trabalho por pessoa, identificando sobrecarga/ociosidade
- [ ] **Visão "Produtividade"**: tarefas concluídas, tempo médio de resolução, taxa on-time no período
- [ ] **Priorização automática**: TaskHub ordena por prazo + % SLA consumido + urgência declarada
- [ ] **Sidebar com favoritos** (gap V1→V2): módulos reordenáveis via drag-and-drop; persistência via `PreferenciasUsuarios`

### 10.3 — Reuniões redesenhadas

- [ ] Criar `gas/src/modules/reunioes/reuniao_repository.gs` + `reuniao_engine.gs` + `reuniao_controller.gs`
- [ ] **Ata com template estruturado obrigatório**: presentes, ausentes justificados, pauta executada, decisões, encaminhamentos (responsável + prazo + texto), próxima reunião
- [ ] **Versionamento de rascunho**: histórico de edições (quem editou o quê); aprovação formal pelo convocador
- [ ] **Aprovação formal da ata**: imutável após aprovação; FSM: rascunho → em_aprovacao → aprovada
- [ ] **Exportação PDF** com template institucional via `RelatoriosPDFService`
- [ ] **Vínculo bidirecional** reunião ↔ Ação: encaminhamentos aparecem como tarefas na Ação vinculada
- [ ] **Encaminhamentos consolidados**: todos os encaminhamentos de todas as atas por responsável (cross-reuniões)

### 10.4 — Comunicação / Balcão redesenhado

- [ ] **SLA por tipo de demanda** configurável em `config_org.json`: Design simples (3d úteis), Foto (2d), Vídeo (5d), Texto (1d)
- [ ] **Alerta automático**: quando demanda > 60% do SLA consumido → notificação ao executor
- [ ] **Versionamento de entregas** (gap V1→V2): histórico v1/v2... até aprovação; motivo estruturado de rejeição; contador de rodadas (KPI de qualidade)
- [ ] **Comentários na demanda**: campo de perguntas/respostas entre demandante e executor dentro da demanda
- [ ] **Notificação ao demandante**: entrega enviada para revisão; aprovada; devolvida para correção
- [ ] **Dashboard de SLA**: % entregas no prazo por tipo e período; tempo médio; rodadas de revisão
- [ ] **Integração com Ações**: Ação sem demanda de divulgação N dias antes → alerta automático

### 10.5 — Auditoria Visual com Rollback (gap V1→V2)

- [ ] **View de auditoria** no SPA: visualização de logs com filtros (usuário, tipo, módulo, período)
- [ ] **Botão de rollback** por operação: desfazer criação/edição/exclusão usando dados `before` do log
- [ ] `rollbackAcaoPorTimestamp()` — restore de estado a partir do snapshot `before/after` do `AuditoriaService`
- [ ] **Log de acessos** separado: rastreamento de login por sessão (quem entrou, quando, qual nível)
- [ ] **Detecção de comportamento suspeito**: múltiplas operações em curto intervalo → alerta ao admin
- [ ] **Rate limiting por endpoint** (gap V1→V2): `limitarRequisicoes(chave_endpoint + email, limite, intervaloMs)`

**Modos de visualização — Fase 10:**
- [ ] **TaskHub "Meu Dia"**: lista priorizada com separadores (Urgente | Hoje | Esta Semana | Mais tarde) — estilo Linear
- [ ] **Heatmap "Meu Time"**: grade pessoa × dia da semana com cor de intensidade de carga
- [ ] **Kanban do Balcão**: colunas por status (Rascunho | Submetida | Em Análise | Em Execução | Revisão | Concluída) — estilo Kanban
- [ ] **Lista do Balcão**: tabela com filtros de SLA, urgência, tipo, responsável; linha vermelha quando SLA vencido
- [ ] **Cards de demanda**: resumo compacto com barra de SLA colorida (verde → amarelo → vermelho)
- [ ] **Agenda de reuniões**: calendário semana/mês de próximas reuniões de todos os setores
- [ ] **Lista de encaminhamentos consolidados**: todos os pendentes cross-reuniões, ordenados por prazo, filtro por responsável
- [ ] **Timeline de ata**: cada encaminhamento com linha do tempo de criação → atribuição → conclusão
- [ ] **Painel de auditoria**: lista de operações com filtros + badge de tipo + botão desfazer
- [ ] **Dashboard de SLA (Comunicação)**: gráfico de barras % no prazo por tipo; tendência mensal; ranking de rodadas de revisão

---

## Fase 11 — Estratégia, Dashboards Reais e Produto Pronto para Mercado

**Objetivo**: KPIs reais; observabilidade total; cockpit executivo; demonstrável para outras organizações.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Corrigir `obterMetricasEficiencia` e `calcularCustoPorMeta` (retornam zero hoje) antes de qualquer dashboard.

### 11.1 — Módulo de Estratégia

- [ ] Criar `gas/src/modules/estrategia/estrategia_repository.gs` + engine + controller
- [ ] **Objetivos estratégicos**: curto (1 ano), médio (3 anos), longo prazo (5 anos) — vinculação de Ações a objetivos
- [ ] **Monitoramento de progresso**: % de ações vinculadas ao objetivo no prazo; execução financeira associada
- [ ] `gerarRelatorioEstrategico()`: síntese trimestral/anual — ações concluídas, público, recursos executados, planejado vs realizado
- [ ] **KPIs consolidados reais** (substituir zeros):
  - Taxa de ocupação de espaços (média mensal por sala)
  - Taxa de conclusão de ações no prazo
  - Custo por ação / custo por atendimento / custo por hora-atividade
  - Índice de satisfação do público (pesquisas pós-ação)
  - Execução orçamentária (% executado por contrato/meta)
  - Taxa de renovação de habilitados / novos agentes culturais
- [ ] **Painel "Riscos do Mês"**: ações atrasadas + contratos vencendo + rubrica crítica + clima baixo — consolidado executivo
- [ ] **Calendário estratégico anual**: linha do tempo Ações × Objetivos × Recursos

### 11.2 — Escuta Institucional completa

- [ ] Criar `gas/src/modules/escuta/escuta_engine.gs` + repository + controller
- [ ] **8 dimensões científicas** baseadas em UWES, JDC, CVF, NR-1
- [ ] **Algoritmo de fairness**: cada colaborador recebe pesquisas proporcionalmente; sem sobrecarga de respostas
- [ ] **Índice de confiança**: representatividade dos dados (% de respostas vs total de colaboradores)
- [ ] **Cruzamento analítico**: clima × escalas × férias × absenteísmo
- [ ] **Alerta automático**: clima deteriora > 15 pontos em 2 semanas → alerta ao gestor + RH
- [ ] **Consentimento LGPD**: dados sensíveis (orientação, raça, saúde) coletados com consentimento explícito via `ConsentimentoService`

### 11.3 — Dashboards reais e IA analítica

- [ ] **Corrigir** `obterMetricasEficiencia()` e `calcularCustoPorMeta()` (retornam zero — bug de integração com dados reais)
- [ ] **Dashboard operacional**: ocupação espaços / agendas / SLAs de demanda em tempo real
- [ ] **Dashboard financeiro**: por contrato / meta / rubrica / setor; planejado vs realizado; semáforo de risco
- [ ] **Dashboard estratégico** (direção): execução global + KPIs + riscos + clima
- [ ] **Métricas de ocupação** (gap V1→V2): obterMetricasDashboard() por sala, setor, período; taxa de cancelamento; pico de demanda por horário/dia
- [ ] **IA analítica**: `analisarDashboardIA()` — insights automáticos a partir das métricas; `gerarRelatorioIA()` — síntese narrativa do período

### 11.4 — Módulo RH Avançado e Ponto (Fase 3.4 consolidada)

- [ ] **Custo CLT completo**: INSS + Sistema S + FGTS + PIS + benefícios + provisões (13º, férias, FGTS rescisório)
- [ ] **Fluxo de caixa RH**: linha mensal de custo por vínculo para todo o período do contrato
- [ ] **Simulação de cenário**: reajuste % aplicado em toda folha + impacto financeiro imediato
- [ ] **Calculadora de rescisão**: break-even (economia mensal vs custo rescisório) + geração de PDF
- [ ] **Indicadores de turnover**: taxa voluntário/involuntário, custo de rotatividade, comparativo períodos

### 11.5 — Preparação para mercado e exportações institucionais

- [ ] Zero hardcodes de "CCBJ" em código ou labels (auditoria completa)
- [ ] 100% dos labels configuráveis via `SistemaConfigService` + `config_org.json`
- [ ] **Exportação SALIC**: XML para prestação de contas Lei Rouanet via `ExportacaoEngine`
- [ ] **Exportação SNIIC**: indicadores nacionais de produção cultural (MinC) via `ExportacaoEngine`
- [ ] Documentação de provisionamento para novas orgs (< 30 minutos)
- [ ] Demonstração com org diferente do CCBJ sem alterar código

**Modos de visualização — Fase 11:**
- [ ] **Dashboard estratégico**: KPIs em cards com sparklines; semáforo de risco (verde/amarelo/vermelho); tendência 3 meses
- [ ] **Mapeamento estratégico visual**: eixos temáticos (educação × cultura × território × sustentabilidade) em grid 2D com ações posicionadas
- [ ] **Calendário estratégico**: linha do tempo anual — ações × objetivos × recursos (Gantt executivo)
- [ ] **Dashboard de riscos "Riscos do Mês"**: painel consolidado com itens priorizados por urgência; drill-down por item
- [ ] **Heatmap de ocupação**: salas × horário × dia da semana — calendário de calor visual
- [ ] **Dashboard de clima**: radar por dimensão + linha do tempo de evolução + comparativo entre setores
- [ ] **Dashboard financeiro**: stacked bar previsto/executado por rubrica; funil de execução orçamentária
- [ ] **Funil de turnover**: headcount × entradas × saídas × custo no período

---

## Log de Sessões

| Data | Fase | O que foi feito | Próximo passo |
|------|------|-----------------|---------------|
| 2026-05-20 | Fase 0 | Criação do ambiente saas-v2/, estrutura de diretórios, arquivos core Fase 0 completos, config_service.gs, config_org.json, i_repository.gs, stubs de integração, router.gs, appsscript.json, setup.gs, PROGRESS.md | Executar `verificarTodasAbas()`; criar frontend shell; criar módulo admin |
| 2026-05-20 | Fase 0 | Módulo admin (boot, user_profile, config_admin), alertas_engine.gs (25 tipos), frontend/index.html (SPA+Router+Toast+BtnGuard), 5 portais públicos, diretriz de pesquisa profunda no PROGRESS.md | Deploy clasp; executar `inicializarSistema()`; confirmar 0.9 saneamentos; iniciar Fase 1 |
| 2026-05-20 | Fase 0 | Links configurados: GAS criado (scriptId `14edpTDbIglnYT_...`), `.clasp.json` atualizado, GitHub repo privado `joaaobarros/saas-erp-cultural-v2` criado e push inicial feito | `clasp push` → `inicializarSistema()` → saneamentos 0.9 → Fase 1 |
| 2026-05-20 | Fase 0 | Saneamento 0.9 completo (notification_engine, ia_service, config_org.json+contextoIA); migração 0.4 confirmada; AcessoService (acesso_service.gs) + primeiro_acesso.html; USER_DEPLOYING mantido; setup.gs registra superadmin; PROGRESS.md atualizado | `clasp login && clasp push` → definir PropertiesService → `inicializarSistema()` → `verificarTodasAbas()` → Fase 1 |
| 2026-05-20 | Fase 0 | Logomarca+paleta (LogoPaletaService, SistemaConfigService, Identidade JS, admin UI, extração via canvas); **paleta → ROXO** (`#7c3aed`); BtnGuard v2 (shared/btnguard.html com wrap+auditar); include() em router.gs; todos os botões async protegidos em index.html + primeiro_acesso.html + 5 portais; PROGRESS.md atualizado com checklist BtnGuard por fase | `clasp login --no-localhost && clasp push` → `inicializarSistema()` → `verificarTodasAbas()` → `BtnGuard.auditar()` no browser → Fase 1 |
| 2026-05-21 | Fase 0/1 | Deploys realizados no Apps Script; UI principal reconstruída; corrigido include em comentário; criada Fase 1.1 com `TarefaRepository`, `TarefaEngine`, controllers, migração Sheet→JSON, proteção de índice e view mínima de Tarefas; `domain_model.md` atualizado | Executar `fase1_tarefas_prepararIndice()`/migração no GAS se houver dados; iniciar Fase 1.2 Colaboradores |
| 2026-05-21 | Fase 1.2 | Colaboradores: `ColaboradorRepository` (colaboradores.json + sub-coleções + índice EQUIPES.Funcionarios), `PessoasEngine` (FSM status colaborador + FSM férias com 6 estados + fusão EquipesEngine+RHEngine), `pessoas_controller.gs` (ctrl_pessoas_* + ctrl_rh_*, RBAC completo, férias com FSM), view SPA Pessoas (métricas, CRUD, filtro status, PessoasUI), GAS.pessoas namespace, rota registrada no Router | `clasp push` → `fase1_colaboradores_prepararIndice()` → `fase1_colaboradores_migrarFuncionarios()` → smoke-test no browser → iniciar Fase 1.3 Contratações |
| 2026-05-21 | Fase 1.3 | Contratos: `ContratoRepository` (contratos.json com nested metas/rubricas/indicadores, índice FINANCEIRO.Contratos, migração idempotente), `ContratosEngine` (FSM Ativo↔Suspenso→Encerrado, cálculos financeiros, análise de divergência), `contratos_controller.gs` (ctrl_contratos_*, RBAC por papel financeiro/gestor/admin), view SPA Financeiro (ContratosUI, GAS.contratos, métricas, CRUD, filtro status) | `fase1_contratos_prepararIndice()` → `fase1_contratos_migrarSheetParaJson()` → smoke-test browser → iniciar Fase 1.4 Ativos e Almoxarifado |
| 2026-05-21 | Fase 1.4 | Ativos: `AtivoRepository` (ESPACOS.Ativos Sheet canônica + MovimentacoesAtivos + BaixasAtivos + Manutencoes), `AtivosEngine` (FSM completa + métricas + auditoria + eventos), `ativos_controller.gs` (ctrl_ativos_* + RBAC), `AlmoxarifadoEngine` (stub FSM empréstimo para Fase 2.2), view SPA Espaços (AtivosUI + GAS.ativos + rota espacos), `fase1_ativos_prepararIndice()`. Fase 1 concluída. | `fase1_ativos_prepararIndice()` no GAS Editor → smoke-test no browser (Módulo Espaços) → iniciar Fase 2 Reservas |
| 2026-05-22 | Fase 2 | Reservas: `ReservaRepository` + `ReservaEngine` (assertSemConflito+LockService+FSM) + `reservas_controller.gs`. Almoxarifado: `ReservasItensRepository` (MASTER.Itens+EmprestimosItens) + `AlmoxarifadoEngine` (FSM completo+assertItemDisponivel+verificarAtrasos). Chaves: `ChaveRepository` + `ChaveEngine` (FSM+verificarAtrasos+eventos) + `chaves_controller.gs`. View Espaços com 4 tabs (Reservas|Chaves|Empréstimos|Patrimônio) + EspacosUI+ReservasUI+ChavesUI+AlmoxUI. GAS.reservas/chaves/almox. Deploy @24. | Executar os 3 prepararIndice() no GAS Editor → smoke-test no browser → iniciar Fase 3 |
| 2026-05-22 | Auditoria | 5 bugs corrigidos: (1) `prompt()` null nunca capturado em ChavesUI/ReservasUI/AlmoxUI (padrão `\|\| ''` consumia null antes do if); (2) `ReservasUI.salvar()` sempre criava — adicionado `GAS.reservas.atualizar` e dispatch condicional por id; (3) CSS `badge-accent`/`form-grid` indefinidos; (4) sanitização regex de email inconsistente em `IdentidadeAdmin._aprovar` vs `_carregarPendentes`; (5) `FsmGuardian.transitar()` ausente em `almoxarifado_engine.verificarAtrasos()`. CLAUDE.md atualizado com checklist auditoria pré-deploy. Deploy @26. | Executar prepararIndice() → smoke-test browser → iniciar Fase 3 |
| 2026-05-22 | Fase 3 | `ContratadoRepository`+`ContratadoEngine` (FSM contratado + FSM habilitação PF/PJ), `SolicitacaoRepository`+`SolicitacaoEngine` (FSM 9 estados + OrcamentoGuard stub + CQRS+cache), `contratacoes_controller.gs` (RBAC gestor/financeiro/rh). `pessoas_engine.gs`: Afastamentos FSM+impacto colaborador + Ocorrências. `colaborador_repository.gs`: afastamentos.json+ocorrencias.json. `pessoas_controller.gs`: 9 novos controllers RH. View SPA Pessoas (3 tabs) + Contratações (3 tabs). `SCHEMA_ABAS` corrigido (Contratados+SolicitacoesContratacao). Deploy @28. | `fase3_contratados_prepararIndice()` → `fase3_contratacoes_prepararIndice()` → smoke-test browser → iniciar Fase 4 |
| 2026-05-22 | Análise V1→V2 | Análise comparativa completa do sistema legado (GitHub + backup local) vs V2. Identificados: 7 grupos de funcionalidades do legado não migradas (RECE, rollback de auditoria, IA, lote de reservas, aprovação por email, dashboard real, preferências); 3 módulos completamente novos (RECE, Ponto, ExportacaoEngine); gaps funcionais em todas as Fases 5–11. PROGRESS.md atualizado com: Fase 3.4 (RH Avançado), nova Fase 6 com módulo RECE, Fase 7 com CODIP+ExportacaoEngine, modos de visualização por módulo, tabela Estado Geral corrigida (Fase 4 = ✅). | Pendências antes de Fase 5: git commit dos arquivos não commitados de F4 → executar 3 prepararIndice() de F4 no GAS Editor → smoke-test browser F4 |
| 2026-05-23 | Fase 5 | Ação como Núcleo Real: `AcaoRepository` (acoes.json+ACOES.Acoes), `AcaoEngine` (FSM 6 estados+snapshot+painel integrado), `acoes_controller.gs` (7 controllers CQRS RBAC), `setup.gs` (prepararIndice), `index.html` (view-acoes: Kanban 4 colunas+Lista+modal+painel 6 tabs+GAS.acoes+AcoesUI+CSS aliases). BtnGuard: wrap em nova/salvar/editar; data-bg-skip em kanban/FSM. Deploy @61. | fase5_acoes_prepararIndice() no GAS Editor → smoke-test browser (criar ação, painel, FSM) → Fase 6 |
| 2026-05-23 | UX/Infraestrutura | Rename Espaços→Infraestrutura (menu/nav/page-title/registry). Patrimônio: campo Tipo (Fixo/Volante) + Quantidade + Localização Atual como select linkado à lista de espaços cadastrados. Métricas fixo/volante no dashboard. Filtro por tipo na lista. Funções globais `mascaraMoeda`/`parseMoeda`/`fmtMoeda`; máscara R$ 0,00 em todos os campos monetários (sol-valor, cf-valor, cd-meta-valor, cd-rubrica-valor, ff-valor, rem-valor, adt-valor-adicional, at-valor). Backend: colunas Tipo+Quantidade em ativos_repository.gs. Deploy @74. | fase1_ativos_prepararIndice() no GAS Editor para adicionar colunas Tipo/Quantidade na Sheet → smoke-test Patrimônio (novo ativo fixo+volante, localização select, valor formatado) → Fase 6 |
| 2026-05-23 | Fix bugs espaços | 3 bugs corrigidos: (1) `numeroPlanta` perdido no `salvarEspaco` — adicionado ao registro backend + form admin + coleta de dados + label fallback em `_renderMapa` e `_renderCustomSpaces`; (2) Espaços "perdidos" no mapa config — `_renderMapa` agora tem try/catch por espaço + validação de coords (isFinite) + renderização de marcador vermelho clicável em posição fallback para coords inválidas; (3) Exclusão de espaços — `excluirEspaco()` adicionado em `config_admin_service.gs` + `ctrl_admin_excluirEspaco` + `GAS.admin.excluirEspaco` binding + botão Excluir na listagem + `reativarEspaco()` bônus. Deploy @122. | Fase 6 — RECE + Eventos |
| 2026-05-23 | Mapa de Evento | Ferramenta de desenho de mapa de evento dentro do painel da Ação. Múltiplos mapas por ação (um por local de execução). Cada mapa tem camadas (layers) nomeadas, coloridas e configuráveis. **Backend**: `mapa_acao_repository.gs` (mapaAcoes.json), `mapa_acao_engine.gs` (salvar, criarDeEspacos — importa espaços posicionados do mapa CCBJ, excluir, reservarEspacoOriginal — cria Reserva vinculada ao acaoId), `mapa_acao_controller.gs` (ctrl_mapa_acao_listar/obter/salvar/excluir/criar_de_espacos/reservar_espaco + RBAC). **Frontend**: `shared/mapa_acao_editor.html` (MapaAcaoEditorUI: canvas SVG zoom/pan, palette de espaços + 12 categorias de objetos com ícones SVG inline, sidebar de layers toggle/criar/editar/excluir, legenda visual no canvas, painel de propriedades do elemento selecionado, drag-and-drop para mover e resize, modal de reserva do espaço original). `index.html`: aba "Mapa do Evento" no painel da ação (lazy-load ao clicar), MapaAcaoUI (lista de locais/cards, modal novo local, abre editor), GAS.acoes.mapaAcao namespace, include shared/mapa_acao_editor. Deploy @102. `fase1_mapaAcao_prepararIndice()` disponível. | fase1_mapaAcao_prepararIndice() no GAS Editor → smoke-test browser (criar local, adicionar camada, arrastar objeto, salvar, recarregar) → Fase 6 |
| 2026-05-23 | Correções Admin | **6 bugs críticos corrigidos** na view Administração: (1) `desativarEspaco` — onclick `JSON.stringify` sem `.replace(/"/g,"'")` quebrava o botão "Sim, desativar"; (2–4) mesma falha em `excluirSetor`, `excluirTurno`, `excluirCategoriaItem`; (5) `getSetores()` e `getTurnos()` lendo de `config_org.json` mas gravando em `setores_config.json`/`turnos_config.json` — fix: ler das fontes primárias com fallback; (6) `ctrl_admin_obterConfigExpediente` usando `getOrgConfig()` (PropertiesService) em vez de `readJSON('config_org.json')` — horários nunca persistiam. **3 melhorias UX**: (A) Expediente & Identidade Visual unificados em card com sub-abas (`AdminConfigTabsUI`); (B) `toggleModulo` agora reconstrói o menu lateral imediatamente — módulos inativos somem para usuários normais, ficam visíveis (com badge "inativo") para superadmin; (C) modais de confirmação (excluir/desativar) redesenhados com ícone, header colorido e botão ✕. Deploy @108. | Smoke-test: excluir setor/turno/categoria → confirmar que sumiu da lista; salvar expediente → recarregar → valores persistidos; desativar módulo → menu atualizado imediatamente → Fase 6 |
| 2026-05-22 | Fase 4.5 | Cadastros Base + Gaps Críticos V1→V2: config_org.json (tiposOcorrencia/Afastamento), config_admin_service.gs (schema espaço completo: tipoEspaco/responsaveisPorTurno/itensFixos), admin_controller.gs CRIADO (ctrl_admin_*/ctrl_solicitacoes_*), modulos_registry_service.gs CRIADO (engine ausente referenciado em 6 arquivos), pccs_repository.gs CRIADO (PCCS→Cargos→Tabela salarial + ctrl_pccs_*), setup.gs (seeds: 8 espaços+PCCS+6 categorias), solicitacao_reserva_repository.gs+engine.gs CRIADOS (workflow SOL-xxx), reserva_engine.gs (validação sala contra catálogo SAL-xxx), almoxarifado_engine.gs (itensFixos por sala), contratos_engine.gs+financeiro_controller.gs (memória de cálculo de rubricas + versionamento), acesso_service.gs (ctrl_acesso_listarTodos/editarPapel), boot_service.gs (tiposAfastamento/Ocorrencia no bootstrap), index.html (ContratosDetailUI com grid memória+12 meses+histórico; cargo select; tipos dinâmicos; GAS.admin/acesso/rh/solicitacoes completo). Deploy @32. | setup_espacos_iniciais() + setup_pccs_inicial() no GAS Editor → smoke-test browser (campos select validados, ContratosDetailUI, painel aprovações) → Fase 5 |

---

## 🚀 Deploy — OBRIGATÓRIO ao final de cada fase

> **Regra absoluta**: ao encerrar qualquer fase ou processo de desenvolvimento, executar:

```bash
cd gas
clasp push
clasp deploy --deploymentId "AKfycbzVKQ8fEMBZquOytumFLsb3dIx3DuIZh1cFYe4ywFCoMUXSFewuhZCpy-V8fjLkbe_j" \
             --description "Fase X.Y — descrição"
```

**URL de produção** (testar após cada deploy):
```
https://script.google.com/a/macros/idm.org.br/s/AKfycbzVKQ8fEMBZquOytumFLsb3dIx3DuIZh1cFYe4ywFCoMUXSFewuhZCpy-V8fjLkbe_j/exec
```

> ⚠️ Usar **sempre o mesmo `deploymentId`** para manter o link de produção estável.
> Nunca criar um novo deployment sem motivo — isso mudaria a URL que os usuários conhecem.

---

## Referências Rápidas

| O que procurar | Onde fica |
|----------------|-----------|
| **URL de produção** | `https://script.google.com/a/macros/idm.org.br/s/AKfycbzVKQ8fEMBZquOytumFLsb3dIx3DuIZh1cFYe4ywFCoMUXSFewuhZCpy-V8fjLkbe_j/exec` |
| **DeploymentId fixo** | `AKfycbzVKQ8fEMBZquOytumFLsb3dIx3DuIZh1cFYe4ywFCoMUXSFewuhZCpy-V8fjLkbe_j` |
| Configuração organizacional | `gas/src/core/config.gs` + `gas/src/core/data/config_org.json` |
| Config facade unificado | `gas/src/core/config_service.gs` |
| FSM de qualquer domínio | `gas/src/core/services/fsm_guardian.gs` |
| Sistema de eventos | `gas/src/core/event_bus_backend.gs` |
| Tipos de eventos | `gas/src/core/events_constants.gs` |
| Persistência JSON | `gas/src/core/data_layer.gs` |
| Persistência Sheets | `gas/src/core/services/data_gateway.gs` |
| Interface de repositório | `gas/src/repositories/i_repository.gs` |
| Integração entre domínios | `gas/src/engines/integracao_orquestrador.gs` |
| Handlers de eventos | `gas/src/engines/event_handler_registry.gs` |
| Roteador HTTP | `gas/src/controllers/router.gs` |
| Documento de domínio | `docs/architecture/domain_model.md` |
| Plano de reconstrução original | `../Saas-ERP-cultural-main/docs/01_architecture/plano_reconstrucao.md` |
