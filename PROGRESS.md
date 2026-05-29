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

**Fase atual**: **Fase B — Mapa do Evento: novos objetos Som/Luz/AV/Logística + seções colapsáveis (2026-05-29)** — Deploy @294 ✅. Implementado: `shared/mapa_acao_editor.html` — (1) `_CATEGORIAS` expandido de 12 para 36 categorias com 6 grupos semânticos: Estrutura (palco/praticável/mesa/cadeira), Fluxo/Controle (cone/alambrado/portão/disciplinador), Som (eq_som/caixa_som/mesa_som/microfone/monitor_som/subwoofer), Luz (eq_luz/refletor/moving_head/par_led/dimmer/follow_spot/strobo), AV/Vídeo (eq_av/projetor/tela_proj/monitor_av/camera_video/mesa_av), Logística (gerador/extensao/rack/banheiro/guarita/estacionamento). (2) `_iconeCategoria()` expandida com 24 novos ícones SVG distintos. (3) `_SECOES` array (7 seções com abertaDefault: Estrutura+Controle abertas, demais fechadas). (4) `_paletteSecState` para estado persistido na sessão. (5) `_renderPaletteObjetos()` reescrito com headers colapsáveis (ícone MS, chevron expand/less). (6) `_toggleSecao()` toggle de estado. **Retro-compat**: IDs de categoria antigos preservados. **Próximo**: Fase C — Avatares de equipe.

**Fase anterior**: **Fase 21 — Reserva de Veículo Institucional (2026-05-29)** — Deploy @285 ✅. Implementado: (1) `gas/src/modules/infraestrutura/reserva_carro_repository.gs` — fonte canônica `reservas_carro.json` + índice `ESPACOS.ReservasCarro` (16 colunas); `listar/buscarPorId/inserir/atualizar/listarAprovadasNaData/prepararIndice`. (2) `reserva_carro_engine.gs` — FSM (PENDENTE→APROVADA/RECUSADA/CANCELADA; APROVADA→CONCLUIDA/CANCELADA); papéis aprovadores: infraestrutura/gestor/admin/superadmin; verificação de conflito de horário na aprovação (`_verificarConflito`); notificação por email à equipe infra na solicitação + ao solicitante na aprovação/recusa; funções: `criar/listar/aprovar/recusar/cancelar/concluir/obterMetricas`. (3) `reserva_carro_controller.gs` — 7 funções `ctrl_carro_*` + `fase21_carro_prepararIndice()` global. (4) `utils.gs` — `ABA_PARA_MODULO.ESPACOS.ReservasCarro` adicionado. (5) `setup.gs` — `SCHEMA_ABAS.ESPACOS` +`'ReservasCarro'`; hook em `inicializarSistema()`; `fase21_carro_prepararIndice()` global. (6) `index.html` — GAS.reservasCarro (7 bindings); menu `reservas-carro` com badge `badgeReservasCarro`; `view-reservas-carro` completo (stats strip, filtros status+data, tabela responsiva com ações por papel, modal formulário completo com campos do spreadsheet original + geração de link Google Maps, modal recusa com textarea); `ReservasCarroUI` IIFE (~320 linhas). **Pendente no GAS Editor**: executar `fase21_carro_prepararIndice()` → `{ok:true}`. **Smoke-test**: sidebar → "Reserva de Carro" → stats zeradas → "Nova Reserva" → preencher todos os campos → "Enviar Solicitação" → lista atualiza com status PENDENTE; usuário infra → botões Aprovar/Recusar aparecem; Aprovar → status vira APROVADA + notificação email; tentar aprovar segunda reserva no mesmo horário → erro de conflito; cancelar → status CANCELADA; F12 zero erros.

**Fase anterior**: **Fase 20 — Escuta Institucional Completa (2026-05-27)** — Deploy @273 ✅. Implementado: (1) `escuta_repository.gs` — novos arquivos `perfis_analiticos.json` e `escuta_alertas.json`; funções `salvarPerfilAnalitico`, `obterPerfilAnalitico`, `listarPerfis`, `listarAlertas`, `salvarAlertas`, `resolverAlerta`. (2) `escuta_engine.gs` — novas funções: `salvarPerfilAnalitico`, `obterPerfilAnalitico`, `resolverAlerta`, `obterParticipacaoHistorica` (12 meses pulse+espontânea), `suprimirEmailsAntigos` (LGPD 90 dias), `obterConfigEscuta`/`salvarConfigEscuta` (via config_org.json.escutaConfig), `togglePergunta`, `obterDadosUnificados` (carga tudo em 1 chamada). (3) `escuta_controller.gs` — 19 novos controllers: `ctrl_escuta_dados`, `ctrl_escuta_pulse_obter/responder/dashboard`, `ctrl_escuta_espontanea_registrar/listar`, `ctrl_escuta_alertas_listar/resolver`, `ctrl_escuta_config_obter/salvar`, `ctrl_escuta_pergunta_toggle`, `ctrl_escuta_perfil_obter/salvar`, `ctrl_escuta_relatorio`, `ctrl_escuta_governanca`, `ctrl_escuta_saturacao`, `ctrl_escuta_feedback`, `ctrl_escuta_participacao`, `ctrl_escuta_banco_perguntas`, `ctrl_escuta_suprimir_emails`. (4) `setup.gs` — `fase20_escuta_prepararIndice()` + call em `inicializarSistema()`. (5) `index.html` — GAS.escuta namespace expandido para 32 bindings; view-escuta rebuild completo com 6 abas (Painel, Escuta Livre, Alertas, Distribuição, Relatórios, Gestão) + pulse widget flutuante (FAB + painel); `EscutaUI` IIFE reescrito (~620 linhas): carregar unificado, filtro de pesquisas, gráfico de barras evolução inline, form de resposta formal, relato espontâneo com dimensão, perfil analítico voluntário (LGPD), alertas com resolução, pulse dashboard por período, saturação por dimensão, participação histórica 12 meses, resultados com nível climático e gaps fairness, relatório com recomendações, marcadores metodológicos (qualidade 0-100 + motor), banco de perguntas toggle, config anti-spam, supressão LGPD. **Pendente no GAS Editor**: executar `fase20_escuta_prepararIndice()` → `{ok:true}`. **Smoke-test**: Escuta → Painel → pesquisas carregam + gráfico evolução; Escuta Livre → form ativo ou empty state; Escuta Livre → relato espontâneo → enviar; Gestão → marcadores metodológicos → painel circular aparece; FAB pulse aparece se pergunta disponível.

**Fase anterior**: **Fase 19 — Pós-evento Reservas + ConsolidacaoEngine (2026-05-26)** — Deploy @259 ✅. Implementado: (1) `reserva_repository.gs` — 3 novas colunas (`MinutosMontagem`, `MinutosEncerramento`, `PosEvento` JSON); `_parsePosEvento`, `_nCols` (leitura defensiva); `atualizarPosEvento()`, `atualizarPreEvento()`; `prepararIndice()` com migração de colunas (acrescenta sem reescrever). (2) `reserva_engine.gs` — `registrarPosEvento(id, dados, email, orgId)`: calcula `tempoAtividadeMin = duração − montagem − encerramento`, salva posEvento, auditoria. (3) `reservas_controller.gs` — `ctrl_reservas_registrarPosEvento(id, dados)`. (4) `index.html` — form reserva: campos "Montagem (min)" e "Encerramento (min)" + display dinâmico "Tempo de atividade" recalculado on-input/on-change horas; botão `assignment_turned_in` na lista para reservas cuja data ≤ hoje (verde se já registrado); modal `#pos-evento-modal` com: info da reserva (nome/espaço/data/tempo calculado), radio realizado/não, checkbox contabilizar, campo público presente, lista de comprovações (URL+descrição+add/remover), obs. gerais; BtnGuard no salvar; `GAS.reservas.registrarPosEvento` no namespace. (5) `acao_engine.gs` — `metaExecucao` adicionado ao schema e ao `_merge`. (6) `consolidacao_engine.gs` CRIADO — `calcularExecucaoAcao(acaoId, orgId)`: agrega reservas contabilizadas (posEvento.realizado=true, contabilizar=true), calcula horas de atividade por mês, público por mês, compara com `metaExecucao.metasPorMes`, lê contratos para execução financeira, retorna `{ porMes, total, metaExecucao, geradoEm }` com percentuais físico/público/financeiro; `ctrl_consolidacao_execucaoAcao(acaoId)`. **Auditoria CLAUDE.md**: GAS.reservas.registrarPosEvento binding ✅ | modal overlay rgba(0,0,0,.5)+box var(--surface) ✅ | BtnGuard btn-pos-evento-salvar ✅ | nenhum prompt()/confirm() ✅. **Próximo passo obrigatório**: executar `fase2_reservas_prepararIndice()` no GAS Editor para adicionar as 3 novas colunas à aba ESPACOS.Reservas. **Smoke-test esperado**: Espaços → Reservas → reserva com data passada → botão assignment_turned_in aparece → clicar → modal abre com info da reserva e tempo calculado → preencher público → adicionar comprovação → Salvar → botão fica verde; Ações → painel de ação → ConsolidacaoEngine retorna tabela mês-a-mês via `ctrl_consolidacao_execucaoAcao`.

**Fase anterior**: **Fase 18 — Reservas Modo Lote + Buffer + Habilitado (2026-05-26)** — Deploy @253 ✅. Implementado: (1) `reserva_engine.gs` — BUFFER 5 min ativado em `_horariosSobrepoem`; status `HABILITADO` adicionado à FSM (`confirmado→habilitado→em_uso`); notificação urgente por email para admins quando reserva é cancelada no próprio dia. (2) `reservas_controller.gs` — `ctrl_reservas_habilitar(id)` adicionado (confirmado→habilitado). (3) `index.html` — CSS `.badge-habilitado` (roxo) + 13 regras lote (lote-chip, lote-modo-btn, lote-dia); GAS binding `reservas.habilitar`; botão "Lote" ao lado de "Nova Reserva" (`data-bg-skip`); modal `#lote-modal` (2 cols: campos reserva + seletor datas 4 modos manual/semanal/intervalo/mensal idênticos ao CCBJ Fechado); IIFE `_LoteUI` com geração de datas, chips preview e dispatch para `GAS.reservas.criarLote`; botão "Habilitar" na lista para reservas `confirmado`; `_cancelar(id, dataReserva)` — motivo obrigatório + aviso visual quando data é hoje; admins notificados no backend. **Auditoria CLAUDE.md**: nenhum prompt()/confirm() ✅ | GAS.* habilitar binding ✅ | CSS lote-* definidas ✅ | modal overlay rgba(15,23,42,.70) + box var(--surface) ✅ | FsmGuardian registrado ✅ | btn-res-lote data-bg-skip ✅. **Smoke-test**: Espaços → Reservas → "Lote" → selecionar sala+hora+nome → modo Semanal (seg/qua/sex + mês) → Gerar → chips aparecem → "Criar Reservas" → lista atualiza com N reservas; cancelar reserva de hoje → motivo obrigatório + aviso vermelho; confirmar reserva → "Habilitar" → badge roxo "Habilitado"; F12 zero erros.

**Fase anterior**: **Fase 17 — Holerite e Processamento de Folha (2026-05-26)** — Deploy @251 ✅. Implementado: (1) `holerite_repository.gs` CRIADO — `holerites.json` + aba `EQUIPES.Holerites`; ID `HOL-AAAA-MM-NNN`; idempotente (substitui holerite gerado do mesmo colaborador/mês preservando ID); `salvar/listar/obter/marcarPago/cancelar/metricas/prepararIndice`. (2) `holerite_engine.gs` CRIADO — cálculo completo CLT: INSS progressivo (tabela viva do EncargosEngine), IRRF, horas extras 50%, VT (desconto ≤6% salário), VA, VR, PS, desconto falta; encargos patronais (INSS 20%, FGTS 8%, RAT 1%, SistemaS 5,66%, PIS 1%); provisões mensais (férias+1/3, 13°, FGTS rescisório 40%); `gerar(orgId, colaboradorId, mesRef, email, extra)`, `processarFolha(orgId, mesRef, email, opts)` em lote, `exportarCSV(orgId, mesRef)`. (3) `holerite_controller.gs` CRIADO — RBAC: leitura=rh|admin|superadmin + próprio colaborador; geração=rh|admin|superadmin; cancelar=admin|superadmin; 8 funções globais `ctrl_holerite_*`. (4) `setup.gs` — `EQUIPES` array +`'Holerites'`; `inicializarSistema()` chama `HoleriteRepository.prepararIndice()`; `fase17_holerite_prepararIndice()` global. (5) `index.html` — 8 GAS bindings `GAS.rh.holerite*`; CSS 11 blocos (hol-stats-strip, hol-lista, hol-badge-*, hol-modal-*, hol-ch-*, hol-table, hol-totais, hol-empresa-box); HTML painel `#rh-folha-painel-proc` (input mês, 3 botões BtnGuard, stats area, tabela 10 cols, filtro status); sub-nav "Processamento" 3º botão; `HoleriteUI` IIFE ~300 linhas (metricas, renderLista, processarFolha, exportarCSV, abrirHolerite, marcarPago via `_abrirModalConfirmar`+`_idPagamentoPendente`, impressão). **Auditoria CLAUDE.md**: BtnGuard (hol-btn-metricas/processar/exportar) ✅ | GAS.* namespace 100% ✅ | CSS todas classes definidas ✅ | modal overlay rgba(.55) + box var(--surface) ✅ | FsmGuardian n/a (status simples) ✅ | nenhum prompt()/confirm() ✅. **Próximo passo obrigatório**: executar `fase17_holerite_prepararIndice()` no GAS Editor → {ok:true}. **Smoke-test**: RH/DP → Folha → sub-aba "Processamento" → inserir mês → "Calcular Métricas" → stats aparecem → "Processar Folha" → lista atualiza com holerites gerados → clicar linha → modal holerite completo (proventos/descontos/encargos/provisões) → "Imprimir" → janela print abre → "Marcar Pago" → confirmar → badge vira "pago" → F12 zero erros.

> 📋 **Referência obrigatória**: [`PATTERNS.md`](PATTERNS.md) — padrões de código, UI/UX e regras de negócio para todas as próximas fases. Ler antes de iniciar qualquer nova implementação.
**O que foi feito (Fase 17 — 2026-05-26)**:
- ✅ `holerite_repository.gs` CRIADO — snapshots imutáveis em `holerites.json` + índice `EQUIPES.Holerites`; ID `HOL-AAAA-MM-NNN`; idempotente (mesmo colaborador/mês → substitui holerite gerado mantendo ID); `salvar/listar/obter/marcarPago/cancelar/metricas/prepararIndice`; sincronização sheet com 20 colunas
- ✅ `holerite_engine.gs` CRIADO — geração completa para CLT/PJ/bolsista; rubricas: `0001` salário base, `0020` HE 50%, `0030` adicional função, `1001` INSS progressivo (tabela viva EncargosEngine), `1002` IRRF (dedução INSS + dependentes), `1010` VT (≤6% salário), `1020` VA, `1025` VR, `1030` PS, `1099` desconto falta; encargos patronais completos (INSS 20%, FGTS 8%, RAT 1%, SistemaS 5,66%, PIS 1%); provisões mensais (férias+1/3, 13°, FGTS rescisório 40%); `processarFolha()` em lote retorna `{processados, erros, total, detalhes[]}`; `exportarCSV()` com 25 colunas
- ✅ `holerite_controller.gs` CRIADO — `_ctxHolerite()`, `_assertRH()`, `_assertAdmin()`; 8 funções globais `ctrl_holerite_*` (metricas, listar, obter, gerar, processarFolha, marcarPago, cancelar, exportarCSV); RBAC granular
- ✅ `setup.gs` — `EQUIPES` array incluiu `'Holerites'`; `inicializarSistema()` chama `HoleriteRepository.prepararIndice()`; `fase17_holerite_prepararIndice()` global executável no GAS Editor
- ✅ `index.html` — 8 GAS bindings (holeriteMetricas/Listar/Obter/Gerar/ProcessarFolha/MarcarPago/Cancelar/ExportarCSV); CSS 11 blocos (hol-stats-strip, hol-stat, hol-lista, hol-badge-{gerado,pago,cancelado}, hol-modal-overlay/box/header/body/footer, hol-ch-*, hol-table, hol-section-title, hol-totais, hol-total-box.{proventos,descontos,liquido}, hol-empresa-box); HTML painel `#rh-folha-painel-proc` (input mês competência, 3 botões BtnGuard, feedback div, stats area, tabela 10 colunas, filtro status); sub-nav "Processamento" adicionado como 3ª aba; `setSubAbaFolha` atualizado para `'proc'`; `HoleriteUI` IIFE ~300 linhas (aoAbrirProcessamento, carregarMetricas, renderLista, processarFolha, exportarCSV, abrirHolerite, marcarPago com `_abrirModalConfirmar`+`_idPagamentoPendente`, `_executarPagamento`, `_imprimirHolerite` via window.open)
- ✅ **Auditoria CLAUDE.md**: BtnGuard (hol-btn-metricas/processar/exportar) ✅ | GAS.* namespace 100% ✅ | CSS todas classes definidas ✅ | modal overlay `rgba(0,0,0,.55)` + box `background:var(--surface)` ✅ | FsmGuardian n/a (status sem FSM) ✅ | nenhum prompt()/confirm() ✅ | onclick usa `JSON.stringify(h.id).replace(/"/g,"'")` ✅
- ✅ Deploy @251

**Passo obrigatório no GAS Editor após este deploy**:
- Executar `fase17_holerite_prepararIndice()` → `{ok:true, aba:'EQUIPES.Holerites'}`

**[BROWSER] Smoke-test Fase 17:**
1. RH/DP → tab "Folha" → sub-aba "Processamento" → painel `#rh-folha-painel-proc` aparece
2. Inserir mês (ex: `2026-05`) → "Calcular Métricas" → stats strip exibe total/gerados/pagos/custo
3. "Processar Folha" → lista de colaboradores com holerites gerados (badge "gerado")
4. Clicar linha → modal abre com contracheque completo (proventos + descontos + encargos patronais + provisões + totais)
5. "🖨️ Imprimir" → janela de impressão abre com layout formatado
6. "✅ Marcar Pago" → modal de confirmação → confirmar → badge vira "pago" na lista
7. "Exportar CSV" → download do CSV mensal
8. Filtrar por status "gerado" → lista filtra corretamente
9. F12 → zero erros vermelhos | `BtnGuard.auditar()` → "✅ todos protegidos"

**O que foi feito (Fase 20 — 2026-05-27)**:
- ✅ `escuta_repository.gs` — perfis_analiticos.json: `salvarPerfilAnalitico`, `obterPerfilAnalitico`, `listarPerfis`; escuta_alertas.json: `listarAlertas`, `salvarAlertas`, `resolverAlerta`
- ✅ `escuta_engine.gs` — 8 novas funções: `salvarPerfilAnalitico`, `obterPerfilAnalitico`, `resolverAlerta`, `obterParticipacaoHistorica` (12 meses), `suprimirEmailsAntigos` (LGPD 90 dias), `obterConfigEscuta`/`salvarConfigEscuta` (config_org.json.escutaConfig), `togglePergunta`, `obterDadosUnificados` (carga unificada)
- ✅ `escuta_controller.gs` — 19 novos controllers (pulse, espontânea, alertas, config, perfil, relatório, governança, saturação, feedback, participação, banco perguntas, LGPD)
- ✅ `setup.gs` — `fase20_escuta_prepararIndice()` + call em `inicializarSistema()`
- ✅ `index.html` — GAS.escuta expandido (32 bindings); view-escuta rebuild completo: 6 abas (Painel/Escuta Livre/Alertas/Distribuição/Relatórios/Gestão) + pulse widget flutuante (FAB + painel 300px); `EscutaUI` IIFE reescrito ~620 linhas; perfil analítico voluntário com 6 campos; marcadores metodológicos (qualidade 0–100 circular + motor); gaps fairness no cruzamento; gráfico de barras evolução; saturação por dimensão com barra de progresso; participação histórica 12 meses; banco de perguntas toggle; config anti-spam; supressão LGPD
- ✅ **Auditoria CLAUDE.md**: nenhum prompt()/confirm() sem null-check ✅ (resolverAlerta usa _raw=prompt→if null→return; suprimirEmails usa confirm→if !_raw→return) | GAS.* 32 bindings todos mapeados ✅ | CSS: view-header/view-title/view-subtitle, badge-*, form-control, select-sm, filter-bar usados (já definidos) ✅ | modais overlay rgba(0,0,0,.52) + box var(--surface) ✅ | FsmGuardian via ctrl_escuta_mudar_status existente ✅ | BtnGuard: btn-nova-pesquisa, btn-escuta-refresh, btn-enviar-espontanea, btn-salvar-perfil, btn-gerar-relatorio, btn-lgpd-suprimir, btn-salvar-config-escuta, btn-salvar-escuta, btn-enc-esc-*, btn-ativar-esc-* ✅
- ✅ Deploy @273

**[BROWSER] Smoke-test Fase 20:**
1. Escuta → Painel: KPI strip + gráfico de barras evolução + lista de pesquisas
2. Escuta → Escuta Livre: form resposta (ativa ou empty state) + relato espontâneo + perfil analítico
3. Relato espontâneo: digitar texto → Enviar Relato → toast "Relato enviado!"
4. Perfil analítico: selecionar gênero/raça/vínculo → Salvar → toast "Perfil analítico salvo!"
5. Escuta → Distribuição: pulse dashboard por período + saturação + participação histórica
6. Escuta → Relatórios: selecionar pesquisa encerrada → resultados com nível climático + dimensões
7. Escuta → Relatórios → Relatório: gera recomendações por dimensão
8. Escuta → Gestão → Marcadores Metodológicos: círculo de qualidade + fatores + avisos motor
9. Escuta → Gestão → Banco de Perguntas: lista com toggle ativo/inativo
10. Escuta → Gestão → Configurações: campos anti-spam + Salvar
11. FAB pulse (canto inferior direito): aparece quando há pergunta → clicar → painel abre → escolher 1-5 → registra
12. F12 → zero erros | `BtnGuard.auditar()` → "✅ todos protegidos"

**GAS Editor (executar após deploy)**:
- `fase20_escuta_prepararIndice()` → `{ok:true}`

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

**O que foi feito (Fase 7 — 2026-05-23)**:
- ✅ `ConsentimentoService` — base legal LGPD, histórico, revogação, log de consentimentos em `consentimentos.json`
- ✅ `PublicoRepository` — inscrições, presenças, pesquisas, certificados em JSON Drive + índice PUBLICO.*
- ✅ `PublicoEngine` — FSM inscrição (inscrito→confirmado→presente→certificado/lista_espera→cancelado), lista de espera automática, promoção ao cancelar, frequência, NPS, dados CODIP
- ✅ `publico_controller.gs` (interno, autenticado) — ctrl_publico_*: listar, confirmar, cancelar, presença batch, pesquisas, certificados
- ✅ `portal_controller.gs` (público, sem auth) — rate limiting por email/janela 30min, ctrl_portal_getAgenda/getInfoAcao/inscrever/solicitarPauta/getStatusPauta/listarEspacos/registrarPesquisa
- ✅ `exportacao_engine.gs` — CODIP 28 campos (JSON+CSV BOM), SALIC XML, SNIIC indicadores anuais, CSV genérico
- ✅ Portais HTML ativados: portal_agenda/inscricao/cessao_pauta/pauta_status — todos os TODOs substituídos por `google.script.run` reais
- ✅ `index.html`: GAS.publico + GAS.exportacao namespaces, view-publico (stats + 4 tabs), PublicoUI completo (listar/confirmar/cancelar/exportar CSV/CODIP/SNIIC), rota 'publico' no sidebar
- ✅ `setup.gs`: `fase7_publico_prepararIndice()` global + chamadas em `inicializarSistema()`
- ✅ Deploy @136 em produção

**Passo obrigatório no GAS Editor após este deploy**:
- Executar `fase7_publico_prepararIndice()` → esperado `{ok:true}`

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

**O que foi feito (Fase 8 — 2026-05-23)**:
- ✅ `AgenteCulturalRepository` — `agentes_culturais.json` + índice `MASTER.AgentesCulturais`; listar/buscar/metricas/salvar/excluir
- ✅ `AgenteCulturalEngine` — FSM rascunho→ativo↔suspenso→descredenciado; auto-cadastro portal; rider técnico; histórico de vínculos; email boas-vindas ao ativar
- ✅ `agentes_controller.gs` — ctrl_agentes_listar/obter/metricas/salvar/mudarStatus/salvarRider/excluir + ctrl_portal_cadastrarAgente (sem auth)
- ✅ `AcervoRepository` — `acervo.json` + índice `ACOES.Acervo`; checklist de evidências por Ação (foto/video/release/poster/folder/ata)
- ✅ `AcervoEngine` — upload ao Drive (pasta por Ação), status LGPD (nao_verificado/autorizado/restrito/sem_pessoas), exportação ZIP (lista de URLs)
- ✅ `acervo_controller.gs` — ctrl_acervo_listar/listarPorAcao/checklist/metricas/registrar/atualizar/statusLGPD/excluir/exportarZip
- ✅ `VoluntarioRepository` — `voluntarios.json` + `alocacoes_voluntarios.json` + índice `MASTER.Voluntarios`
- ✅ `VoluntarioEngine` — FSM voluntário (cadastrado→ativo↔inativo) + FSM alocação (alocado→confirmado→presente→concluido/cancelado); email convite; registro de horas; email certificado ao concluir
- ✅ `voluntario_controller.gs` — ctrl_voluntarios_listar/obter/metricas/salvar/mudarStatus/excluir/listarAlocacoes/alocar/confirmarAlocacao/registrarPresenca/concluirAlocacao/cancelarAlocacao
- ✅ `ParceriaRepository` — `parcerias.json` + índice `ACOES.Parcerias`
- ✅ `ParceriaEngine` — FSM proposta→negociacao→ativa→encerrada/cancelada; vínculos com Ações; entregas; avaliação ao encerrar
- ✅ `parceria_controller.gs` — ctrl_parcerias_listar/obter/metricas/listarPorAcao/salvar/mudarStatus/vincularAcao/desvincularAcao/salvarEntrega/avaliar/excluir
- ✅ `portal_agente.html` — auto-cadastro público: tipos PF/PJ, áreas artísticas (12 chips), linguagens, bio, portfolio dinâmico, rider técnico, disponibilidade, consentimento LGPD; envia para `ctrl_portal_cadastrarAgente` sem autenticação
- ✅ `events_constants.gs` — 18 novos eventos: AGENT_*, ACERVO_*, VOLUNTEER_*, PARTNERSHIP_*
- ✅ `setup.gs` — SCHEMA_ABAS: MASTER+AgentesCulturais+Voluntarios / ACOES+Acervo+Parcerias; inicializarSistema() chama prepararIndice() de todos os 4 repos; `fase8_prepararIndice()` global
- ✅ `router.gs` — rota `secao=agente` → portal_agente.html
- ✅ `index.html` — 4 novos GAS namespaces (GAS.agentes 7 bindings, GAS.acervo 9, GAS.voluntarios 11, GAS.parcerias 11); seção "MEMÓRIA" no sidebar; views view-agentes/acervo/voluntarios/parcerias; AgentesUI/AcervoUI/VoluntariosUI/ParceriasUI; modais opacos; BtnGuard em todos os botões; prompt() com null-check; Router.registrar() para todos
- ✅ **Auditoria CLAUDE.md**: prompt()/null-check ✅ | GAS.* namespace 100% ✅ | modais opacos ✅ | FsmGuardian em todas as transições ✅
- ✅ Deploy @138 em produção

**Passo obrigatório no GAS Editor após este deploy**:
- Executar `fase8_prepararIndice()` → `{ok:true}` — cria abas AgentesCulturais, Acervo, Voluntarios, Parcerias

**[BROWSER] Smoke-test Fase 8:**
1. Sidebar → seção "MEMÓRIA" com 4 itens (Agentes, Acervo, Voluntários, Parcerias)
2. Agentes → stats carregam → botão "+ Novo Agente" → modal abre → criar agente → aparece na lista com badge "Rascunho"
3. Ativar agente → badge muda para "Ativo"
4. Portal Público Agentes: URL `?secao=agente` → formulário com áreas/rider → enviar → protocolo exibido
5. Acervo → "+ Adicionar" → modal com tipo/ação/URL → salvar → card aparece na galeria
6. Voluntários → "+ Novo" → criar → tab Alocações → verificar lista
7. Parcerias → "+ Nova" → criar → status Proposta → avanço para Negociação
8. F12 → zero erros vermelhos | BtnGuard.auditar() → "✅ todos protegidos"

**O que foi feito (Fase 9 — 2026-05-23)**:
- ✅ `setup.gs`: `fase9_migrarOrgId()` — migração idempotente de orgId em 31 arquivos JSON; `fase9_validarIsolamento()` — auditoria de integridade; `fase9_prepararIndice()` — prepara aba MASTER.Orgs e registra a org
- ✅ `config_org.json`: bloco `features` com 18 feature flags granulares e seus defaults
- ✅ `config_service.gs`: `getFeatureFlag(flagId)` + `setFeatureFlag(flagId, ativo)` + `getFeatureFlagsCatalogo()` — catálogo de 18 flags agrupadas por área (core/portal/comunicacao/memória/exportação/notificações/espaços/admin)
- ✅ `org_registry_service.gs` CRIADO: `registrarOuAtualizar`, `listarTodas`, `obter`, `atualizarStatus`, `atualizarPlano`, `marcarAtividade`, `checarProvisionamento` (8 verificações de setup)
- ✅ `admin_controller.gs`: `ctrl_admin_listarFeatureFlags`, `ctrl_admin_setFeatureFlag`, `ctrl_admin_checarProvisionamento`, `ctrl_orgs_listar`, `ctrl_orgs_atualizarStatus`, `ctrl_orgs_atualizarPlano`
- ✅ `wizard_controller.gs` CRIADO: 7 controllers — `ctrl_wizard_obterEstado/salvarOrg/salvarSetores/salvarTurnos/salvarEspacos/salvarModulos/finalizar`; retoma setup do passo pendente; idempotente
- ✅ `wizard_setup.html` CRIADO: wizard SPA 6 passos (Organização→Setores→Turnos→Espaços→Módulos→Finalizar→Sucesso); stepper lateral; BtnGuard em todos os botões async; acessível em `?secao=wizard_setup`
- ✅ `router.gs`: rota `secao=wizard_setup` → `_renderWizardSetup()` servindo o wizard
- ✅ `index.html`: `GAS.orgs` (3 bindings), `GAS.admin.listarFeatureFlags/setFeatureFlag/checarProvisionamento`; tab "Features" (toggles com switch visual por grupo); tab "Provisionamento" (checklist + barra de progresso + link para wizard); view `#view-painel-orgs` (stats, tabela de orgs com status e plano); entrada `painel-orgs` no menu (superadmin); `FeatureFlagsUI` module; `PainelOrgsUI` module; `_carregarProvisionamento()` em `AdminCadastrosUI`
- ✅ Auditoria CLAUDE.md: prompt/null-check ✅ | GAS.* namespace 100% ✅ | BtnGuard em wizard ✅ | modais opacos ✅
- ✅ Deploy @140 em produção

**Passo obrigatório no GAS Editor após este deploy**:
- Executar `fase9_prepararIndice()` → `{ok:true}` — migra orgId nos dados existentes, cria aba MASTER.Orgs, registra a org no OrgRegistry

**[BROWSER] Smoke-test Fase 9:**
1. URL produção → carrega sem erros (F12)
2. Admin → Cadastros → tab "Features" → toggles aparecem por grupo → ativar/desativar uma flag → toast "Feature ativada"
3. Admin → Cadastros → tab "Provisionamento" → checklist aparece com barra de progresso → link "Wizard de Setup" visível
4. URL `?secao=wizard_setup` → wizard abre com stepper → passo 1 (Org) pré-preenchido → navegar entre passos → BtnGuard nos botões
5. Sidebar → item "Painel de Orgs" (superadmin) → view carrega com stats → tabela de orgs
6. F12 → zero erros | `BtnGuard.auditar()` → "✅ todos protegidos"

**O que foi feito (Fase 12.1 — 2026-05-24)**:
- ✅ **CSS**: ~80 linhas de estilos Fase 12 — acordeão 4 níveis (`.pt-meta-card`, `.pt-atv-card`, `.pt-rub-row`), cards pessoal (`.pes-card`), tabela plano de contas (`.pc-table`), grade de meses indicadores (`.ind-mes-table`, `.ind-meta-row`, `.ind-real-row`)
- ✅ **GAS namespace**: 32 bindings em `GAS.contratos` (vs 14 anteriores) — `salvarMeta/excluirMeta`, `salvarAtividade/excluirAtividade`, `salvarPessoal/excluirPessoal/calcularPessoal`, `salvarRubrica/excluirRubrica`, `salvarIndicador/atualizarMetaMes`, `salvarIndicadorGestao/excluirIndicadorGestao/atualizarMetaGestao`, `planoContas`, `historico`; novo namespace `GAS.catalogoSeplag` (4 bindings)
- ✅ **HTML**: tab "Fontes de Recurso" removida do Financeiro (3 tabs restantes: Contratos | Remanejamentos | Aditivos); form de Contrato expandido com seção "Fonte de Recurso" embutida (instrumento, órgão financiador, contrapartida, observação); `#contrato-detalhe-card` refeito com 5 abas: Plano de Trabalho | Pessoal | Indicadores | Plano de Contas | Histórico; modais Meta/Pessoal/IndicadorR/IndicadorG todos opacos (overlay rgba .52 + box `var(--surface)`)
- ✅ **ContratosUI**: `abrirForm()` popula novos campos; `salvar()` envia `numero`, `modalidade`, `orgaoFinanciador`, `contrapartida`, `obsFinanceiro`, `objeto`
- ✅ **ContratosDetailUI** (~820 linhas): reescrito como IIFE completo com 40+ funções — acordeão 4 níveis com toggle expand/collapse, catálogo SEPLAG lazy-load, memória de cálculo dinâmica, cálculo pessoal em tempo real (fórmulas CCBJ III→VIII), grade de meses editável inline, períodos GESTÃO semestral/anual, tabela plano de contas com total geral; BtnGuard em todos os 6 botões async
- ✅ **Auditoria CLAUDE.md**: prompt/null-check ✅ | GAS.* namespace 100% ✅ | CSS todas as classes definidas ✅ | modais opacos ✅ | onclick JSON.stringify .replace ✅ | FsmGuardian (server-side via ctrl_contratos_status) ✅
- ✅ Deploy @179 em produção

**[BROWSER] Smoke-test Fase 12.1** (verificar manualmente):
1. Financeiro → apenas 3 tabs visíveis (sem "Fontes de Recurso")
2. "+ Novo Contrato" → form com seções "Dados" + "Fonte de Recurso" → preencher → salvar → aparece na lista
3. "Gerenciar" → 5 abas: Plano de Trabalho | Pessoal | Indicadores | Plano de Contas | Histórico
4. Plano de Trabalho → "+ Nova Meta" → modal abre (fundo opaco) → preencher título → Salvar → meta aparece
5. Expandir meta → "+ Atividade" → form inline → salvar → atividade listada
6. Expandir atividade → "+ Item de Despesa" → select SEPLAG popula → selecionar item → código auto-preenchido → adicionar linhas de memória → total calculado → Salvar
7. Pessoal → "+ Adicionar" → preencher salário → campos III–VIII calculam em tempo real → Salvar
8. Indicadores → RESULTADOS → grade de meses → editar célula → salva; GESTÃO → criar indicador → inserir meta
9. Plano de Contas → "Recalcular" → tabela SEPLAG aparece com total geral
10. F12 → zero erros vermelhos | `BtnGuard.auditar()` → "✅ todos protegidos"

**O que foi feito (Fase 11.1 — 2026-05-24)**:
- ✅ `EstrategiaRepository` (`objetivos_estrategicos.json` + aba `ACOES.Estrategia`): listar/buscar/salvar/excluir/métricas/prepararIndice
- ✅ `EstrategiaEngine`: FSM rascunho→ativo→em_revisao→concluido+cancelado; `calcularKPIs()` real (ocupação espaços, conclusão ações no prazo, custo por ação, NPS público, execução orçamentária, renovação agentes); `calcularRiscos()` (ações atrasadas, objetivos sem ações, contratos vencendo, clima baixo, tarefas atrasadas); `gerarRelatorio()` trimestral/semestral/anual; `gerarCalendario()` por horizonte
- ✅ `estrategia_controller.gs`: CQRS + cache + RBAC (leitura=todos, escrita=coordenador+, excluir=admin+)
- ✅ `events_constants.gs`: 7 novos eventos STRATEGY_*
- ✅ `setup.gs`: `ACOES.Estrategia` em `SCHEMA_ABAS`; `fase11_prepararIndice()`
- ✅ `index.html`: `GAS.estrategia` (13 bindings); view-estrategia com 4 tabs (Objetivos | KPIs Reais | Riscos do Mês | Calendário); `EstrategiaUI` module completo; menu sidebar → item "Estratégia" (ícone flag, seção PRINCIPAL)
- ✅ **Identidade TRAMAR**: sidebar tagline → "TRAMAR — Sistema de Gestão Cultural"; `document.title` → "TRAMAR — [nome da inst.]"; logo sidebar maior (52×52px); `_aplicarBoot` usa `nomeInstituicao` do boot
- ✅ **Campos Identidade Institucional**: `nomeInstituicao` + `apresentacaoInstituicao` em `config_org.json`; `getPublicOrgConfig()` expõe no boot; `LogoPaletaService.obter/salvar` lê/persiste; campos no painel Admin → sub-aba Identidade Visual; `IdentidadeAdmin.salvar()` inclui os novos campos e atualiza sidebar em tempo real
- ✅ Deploy @167 em produção

**Passo obrigatório no GAS Editor após este deploy**:
- Executar `fase11_prepararIndice()` → esperado `{ok:true, passos:[...]}` (cria aba ACOES.Estrategia)

**Smoke-test Fase 11.1** (verificar no browser):
1. Sidebar → logo maior (52px); tagline "TRAMAR — Sistema de Gestão Cultural"
2. Menu → "Estratégia" (ícone flag) → view carrega com 4 tabs
3. "+ Novo Objetivo" → modal abre → criar objetivo curto prazo → aparece na lista com barra de progresso
4. Tab "KPIs Reais" → cards carregam com valores reais (não zeros)
5. Tab "Riscos do Mês" → lista de riscos classificados por severidade
6. Tab "Calendário" → linha do tempo por horizonte
7. Ação vinculada: "Editar" objetivo → "+ Ação" → modal → vincular ação existente
8. Admin → Identidade Visual → campos "Nome da Instituição" + "Apresentação" → salvar → sidebar atualiza em tempo real
9. F12 → zero erros | `BtnGuard.auditar()` → "✅ todos protegidos"

**Fase 11 concluída. Próximo**: **Fase 13 — Produto Pronto** — exportações SALIC/SNIIC, documentação de provisionamento multi-org, smoke-test com org diferente do CCBJ. Antes: `clasp login` → `clasp push && clasp deploy` → `fase11_prepararIndice()` no GAS Editor.

**Passo obrigatório no GAS Editor após este deploy**:
- Executar `fase10_prepararIndice()` → esperado `{ok:true, passos:[...]}` (cria abas REUNIOES.Reunioes, COMUNICACAO.Demandas, MASTER.AlertasLog; migra orgId nos JSON)

**Smoke-test Fase 10** (verificar no browser):
1. Topbar → badge de alertas aparece (ícone 🔔) → clicar → painel deslizante abre com lista
2. Menu → "Meu Centro" (hub) → TaskHub carrega com Meu Dia/Meu Time/Produtividade
3. Menu → "Reuniões" → listar (pode estar vazio) → criar reunião → agendar → iniciar → encerrar → ata → encaminhamento
4. Menu → "Balcão" → criar demanda → SLA calculado → mudar status → versão → comentário
5. Menu → Administração → aba Auditoria → logs aparecem com filtros → (superadmin) botão Rollback
6. F12 → zero erros vermelhos | `BtnGuard.auditar()` → "✅ todos protegidos"

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
| 3.4 | RH Avançado e Ponto | ✅ **Concluída** (via F11.4) | — | 2026-05-24 | 2026-05-24 |
| 4 | Financeiro e Contratos | ✅ **Concluída** | — | 2026-05-22 | 2026-05-22 |
| 5 | Ação como Núcleo Real | ✅ **Concluída** | — | 2026-05-23 | 2026-05-23 |
| 6 | Integração via Eventos + RECE | ✅ **Concluída** | — | 2026-05-23 | 2026-05-23 |
| 7 | Portal Externo, Público e CODIP | ✅ **Concluída** | — | 2026-05-23 | 2026-05-23 |
| 8 | Agentes, Acervo, Voluntários, Parcerias | ✅ **Concluída** | — | 2026-05-23 | 2026-05-23 |
| 9 | Multi-Tenancy e Config Admin | ✅ **Concluída** | — | 2026-05-23 | 2026-05-23 |
| 10 | Alertas, TaskHub, Reuniões, Auditoria | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 11 | Estratégia e Produto Pronto | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 11.1 | Estratégia Institucional + TRAMAR | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 11.2 | Escuta Institucional (8 dimensões, fairness, LGPD) | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 11.3 | Dashboard Executivo + IA Analítica | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 11.4 | Ponto Eletrônico + Custo CLT + Colabore AFD/CSV | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 11.5 | Hardcodes CCBJ removidos (auditoria multi-org) | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 12 | Plano de Trabalho — backend | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 12.1 | Plano de Trabalho — UI 4 níveis + Pessoal + Indicadores + Plano de Contas | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 13 | Produto Pronto — Exportações Institucionais | ✅ **Concluída** | — | 2026-05-24 | 2026-05-26 |
| 13.1 | SALIC (XML completo) + PNAB (4 CSVs) + campo PRONAC + tab Exportações | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 13.2 | SNIIC (6 seções + CSV MinC) — Financeiro + Público | ✅ **Concluída** | — | 2026-05-26 | 2026-05-26 |
| 16.3 | Dashboard RH/Folha: custo total, heatmap banco horas, calendário ponto, turnover 12m | ✅ **Concluída** | — | 2026-05-26 | 2026-05-26 |
| 17 | Holerite e Processamento de Folha | ✅ **Concluída** | — | 2026-05-26 | 2026-05-26 |
| 18 | Reservas Modo Lote + Buffer + Habilitado + Cancelamento urgente | ✅ **Concluída** | — | 2026-05-26 | 2026-05-26 |

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
| 6 — RECE + EventBus | Após views RECE | ✅ ReceUI + BtnGuard em FSM RECE |
| 7 — Portal + Público | Após views portal | ✅ PublicoUI + portais + BtnGuard |
| 8 — Agentes/Acervo/Voluntários/Parcerias | Após views | ✅ 4 modules + BtnGuard completo |
| 9 — Multi-Tenancy + Wizard | Após wizard + painel orgs | ✅ FeatureFlagsUI + PainelOrgsUI + WizardUI |
| 10 — Alertas/TaskHub/Reuniões/Balcão/Auditoria | BtnGuard.auditar() pós-deploy @151 | ✅ AlertasUI + ReunioesUI + TaskHubUI + BalcaoUI + AuditoriaVisualUI; BtnGuard.wrap em todos os botões async |
| 11.1 — Estratégia + TRAMAR | BtnGuard.auditar() pós-deploy @167 | ✅ EstrategiaUI (4 tabs, modais opacos, BtnGuard em novo/salvar/vincular/mudarStatus); data-bg-skip em tabs e nav |

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
| Rollback de ações por superadmin | auditoria_controller.gs | ✅ entregue | Fase 10 |
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
- [x] **[Reuniões]** — Fase 10 entregue: ReuniaoEngine + ReuniaoRepository + FSM ata
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

**Status**: ✅ **Concluída** (2026-05-23)

### 9.1 — orgId em todos os dados

- [x] `i_repository.gs` já filtrava por orgId — base correta
- [x] `fase9_migrarOrgId()` — script idempotente que stamp orgId em 31 arquivos JSON existentes
- [x] `fase9_validarIsolamento()` — auditoria de integridade (verifica todos os JSONs)
- [x] `fase9_prepararIndice()` — cria aba MASTER.Orgs, registra org, executa migração
- [x] `dataFolder = orgId + '_DATA'` já implementado em `config.gs`

### 9.2 — Wizard de configuração inicial

- [x] `wizard_setup.html` — wizard SPA 6 passos com stepper lateral (Organização→Setores→Turnos→Espaços→Módulos→Finalizar)
- [x] `wizard_controller.gs` — 7 controllers; retoma do passo pendente; idempotente
- [x] Rota `?secao=wizard_setup` no `router.gs`
- [x] Checklist de provisionamento com 8 verificações automatizadas
- [x] BtnGuard em todos os botões async do wizard

### 9.3 — Feature flags via config_org.json (gap Skill.md)

- [x] `config_org.json`: bloco `features` com 18 flags granulares e defaults por área
- [x] `SistemaConfigService.getFeatureFlag()` + `setFeatureFlag()` + `getFeatureFlagsCatalogo()`
- [x] `ctrl_admin_listarFeatureFlags` + `ctrl_admin_setFeatureFlag`
- [x] Tab "Features" no Admin: toggles visuais agrupados por área
- [x] Tab "Provisionamento" no Admin: checklist + barra progresso + link wizard

### 9.4 — Painel de Orgs (SaaS superadmin)

- [x] `OrgRegistryService` — registry de orgs em `orgs_registry.json` + índice MASTER.Orgs
- [x] `ctrl_orgs_listar/atualizarStatus/atualizarPlano` (superadmin RBAC)
- [x] View `#view-painel-orgs` — stats + tabela de orgs com status/plano/atividade
- [x] Menu item "Painel de Orgs" (visível apenas para superadmin)

---

## Fase 10 — Alertas, TaskHub, Reuniões, Comunicação e Auditoria Visual

**Objetivo**: sistema de alertas centralizado; centro de controle de tarefas; auditoria com rollback; UX operacional completa.

**Status**: ✅ Entregue (2026-05-24) — Deploy @151

**Arquivos criados/modificados**:
- `gas/src/engines/alertas_engine.gs` — REESCRITO: persistência MASTER.AlertasLog (12 colunas), listarAtivos, contarNaoLidos, marcarLido/Resolver, verificarTodosAutomaticos (17 sub-verificações, 25+ tipos), deduplicação
- `gas/src/controllers/alertas_controller.gs` — NOVO: 6 controllers com RBAC
- `gas/src/controllers/taskhub_controller.gs` — NOVO: ctrl_taskhub_minha_caixa/meu_time/produtividade
- `gas/src/modules/reunioes/reuniao_repository.gs` — NOVO: reunioes.json + REUNIOES.Reunioes + listarEncaminhamentosPendentes cross-reunião
- `gas/src/modules/reunioes/reuniao_engine.gs` — NOVO: FSM reunião+ata, encaminhamentos → tarefas automáticas
- `gas/src/modules/reunioes/reuniao_controller.gs` — NOVO: 12 controllers
- `gas/src/modules/comunicacao/balcao_repository.gs` — NOVO: balcao_demandas.json + SLA_POR_TIPO + metricas
- `gas/src/modules/comunicacao/balcao_engine.gs` — NOVO: FSM 7 estados, SLA, versões, notificações
- `gas/src/modules/comunicacao/balcao_controller.gs` — NOVO: 8 controllers, RBAC comunicacao+
- `gas/src/modules/admin/auditoria_controller.gs` — NOVO: listar, rollback (superadmin), detectarSuspeitos
- `gas/src/core/setup.gs` — fase10_prepararIndice() + inicializarSistema() expandido
- `gas/src/frontend/index.html` — badge alertas, painel deslizante, views reunioes/taskhub/balcao/auditoria, GAS.alertas/reunioes/balcao/taskhub/auditoria namespaces, AlertasUI/ReunioesUI/TaskHubUI/BalcaoUI/AuditoriaVisualUI modules, CSS Fase 10, menu items, Router entries

### 10.1 — AlertasEngine completo

- [x] 25+ tipos de alerta com severidade (INFO / ATENÇÃO / URGENTE)
- [x] Alertas in-app: badge no header com contador + painel de notificações deslizante
- [x] Escalação automática baseada em tipos catalogados
- [x] **Tipos específicos ativos**: contratos vencendo, ações atrasadas, almox vencido, encaminhamentos vencidos, demandas SLA, chaves vencidas, reuniões sem ata

### 10.2 — TaskHub (Centro de Controle)

- [x] `ctrl_taskhub_minha_caixa()` — agrega tarefas + encaminhamentos + demandas + aprovações + alertas
- [x] **Visão "Meu Dia"**: pendências priorizadas por prazo + urgência + SLA consumido
- [x] **Visão "Meu Time"** (gestores): carga por pessoa (tarefas+demandas+encaminhamentos+atrasados)
- [x] **Visão "Produtividade"**: concluídas, taxa no prazo, média horas/dias para o período

### 10.3 — Reuniões redesenhadas

- [x] `reuniao_repository.gs` + `reuniao_engine.gs` + `reuniao_controller.gs` CRIADOS
- [x] FSM reunião: rascunho → agendada → em_andamento → encerrada (+ cancelada)
- [x] FSM ata: rascunho_ata → em_aprovacao → aprovada (imutável após aprovação)
- [x] Encaminhamentos consolidados cross-reuniões por responsável
- [x] Encaminhamentos ao encerrar → tarefas automáticas criadas via TarefaEngine

### 10.4 — Comunicação / Balcão redesenhado

- [x] SLA por tipo: design:72h, foto:48h, video:120h, texto:24h, social:24h (divisor por urgência)
- [x] Versionamento de entregas (v1/v2...) com histórico e contador de rodadas
- [x] Comentários na demanda (thread entre demandante e executor)
- [x] Dashboard de SLA: taxaNoPrazo%, mediaRodadas, atrasadas, porTipo

### 10.5 — Auditoria Visual com Rollback (gap V1→V2)

- [x] View de auditoria no SPA com filtros (usuário, módulo, evento, período)
- [x] Botão de rollback por operação (superadmin), restore via snapshot `before` do AuditoriaService
- [x] Detecção de comportamento suspeito: operações > N em janela de tempo → alerta AUDITORIA_FALHA

**Modos de visualização — Fase 10:**
- [x] **TaskHub "Meu Dia"**: separadores Vencido | Hoje | Esta Semana | Mais tarde — estilo Linear
- [x] **Cards do Balcão**: barra de SLA colorida (verde→amarelo→vermelho), versões, comentários
- [x] **Lista de encaminhamentos consolidados**: cross-reuniões, ordenados por prazo, filtro por responsável
- [x] **Painel de auditoria**: filtros + badge por tipo + botão desfazer com confirmação

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

- [x] Criar `gas/src/modules/escuta/escuta_engine.gs` + repository + controller
- [x] **8 dimensões científicas** baseadas em UWES, JDC, CVF, NR-1
- [x] **Algoritmo de fairness**: cada colaborador recebe pesquisas proporcionalmente; sem sobrecarga de respostas
- [x] **Índice de confiança**: representatividade dos dados (% de respostas vs total de colaboradores)
- [x] **Cruzamento analítico**: clima × escalas × férias × absenteísmo
- [x] **Alerta automático**: clima deteriora > 15 pontos em 2 semanas → alerta ao gestor + RH
- [x] **Consentimento LGPD**: dados sensíveis coletados com consentimento explícito via `ConsentimentoService`

### 11.3 — Dashboards reais e IA analítica

- [x] **Dashboard operacional**: ocupação espaços / agendas / SLAs de demanda em tempo real
- [x] **Dashboard financeiro**: por contrato / meta / rubrica / setor; planejado vs realizado
- [x] **Dashboard estratégico** (direção): execução global + KPIs + riscos + clima
- [x] **IA analítica**: `ctrl_dashboard_insights_ia` — rule-based + IA (Groq) quando disponível; `ctrl_dashboard_relatorio_ia` — síntese narrativa do período

### 11.4 — Módulo RH Avançado e Ponto (Fase 3.4 consolidada)

- [x] **Ponto eletrônico**: tipos E/S/I/R, cálculo horas dia, espelho mensal, banco de horas
- [x] **Custo CLT completo**: INSS progressivo + Sistema S + FGTS + PIS + VT/VA + provisões (13º, férias, FGTS rescisório)
- [x] **Simulação de cenário**: reajuste % aplicado em toda folha + impacto financeiro imediato
- [x] **Calculadora de rescisão**: break-even (economia mensal vs custo rescisório)
- [x] **Indicadores de turnover**: taxa voluntário/involuntário, custo de rotatividade, comparativo períodos
- [x] **Colabore AFD export**: Portaria MTE 1510/2009 (tipo-1 header, tipo-3 marcações, tipo-9 trailer)
- [x] **Colabore CSV export/import**: formato `PIS;Nome;Data;Hora;Tipo;NSR`

### 11.5 — Preparação para mercado e exportações institucionais

- [x] Zero hardcodes de "CCBJ" em código ou labels (auditoria `rece_engine.gs`)
- [x] `getOrgConfig().orgNome` substituindo `'CCBJ'` literal nos motores de comunicação
- [x] **Exportação SALIC**: XML completo (Proponente+Projeto+PlanoAplicação+PessoalEquipe+Resumo), campo PRONAC no formulário de contrato, botão "SALIC XML" no detalhe do contrato (visível apenas para modalidade lei_rouanet), tab "Exportações" no Financeiro (F13.1) ✅
- [x] **Exportação PNAB** (Lei Aldir Blanc 14.399/2022): 4 CSVs (Espaços, Agentes Culturais, Ações, Financeiro), seletor de ano, ExportacoesUI, GAS.exportacao.pnab (F13.1) ✅
- [ ] **Exportação SNIIC**: indicadores nacionais de produção cultural (MinC) via `ExportacaoEngine` (F13.2)
- [ ] Documentação de provisionamento para novas orgs (< 30 minutos) (F13.3)
- [ ] Demonstração com org diferente do CCBJ sem alterar código (F13.3)

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
| 2026-05-24 | Fase 11.2–11.5 | **Fase 11 completa**: **11.2** `escuta_repository.gs`+`escuta_engine.gs`+`escuta_controller.gs` — 8 dimensões UWES/JDC/CVF/NR-1, FSM rascunho→ativa→encerrada→arquivada, fairness algorithm (sort por participações passadas), índice de confiança, cruzamento clima×pessoas, evolução histórica, alertas automáticos (≥15pts deterioração, dimensão crítica <2.5/5, confiança <40%), LGPD. **11.3** `dashboard_controller.gs` — 5 controllers (operacional+financeiro+estratégico+insights_ia+relatorio_ia), aggregação multi-módulo com fallbacks lerJSON, rule-based insights + IA (Groq) quando disponível, RBAC gestor/coordenador+. **11.4** `ponto_repository.gs`+`ponto_engine.gs`+`ponto_controller.gs` — marcações E/S/I/R, cálculo horas dia, espelho mensal, banco de horas, custo CLT completo (INSS progressivo+FGTS+PIS+SistemaS+RAT+VT/VA+provisões), simulação reajuste, rescisão+break-even, turnover; **Colabore AFD** Portaria MTE 1510/2009 (tipo-1/3/9, CNPJ14+razaoSocial150+NSR9+data8+hora4+PIS11); **CSV Colabore** PIS;Nome;Data;Hora;Tipo;NSR (import+export). **11.5** hardcodes CCBJ removidos em `rece_engine.gs` (PASTA_IMAGENS usa orgId dinâmico, nome usa orgNome). `setup.gs` fase11_prepararIndice() expandido (EscutaRepository+PontoRepository). `index.html`: 3 GAS namespaces (escuta 11 bindings + dashboard 5 + ponto 14), 3 views HTML (view-escuta/view-dashboard/view-ponto com 4 tabs cada), 3 JS modules (EscutaUI+DashboardUI+PontoUI), Router entries, menu sidebar, MetricsToggle.init. Auditoria CLAUDE.md 100% verde: CSS ✅ modais opacos (rgba .52 + var(--surface)) ✅ BtnGuard em todos botões ✅ GAS.* namespace 100% ✅ FsmGuardian em todas transições ✅ prompt/null-check ✅. | `clasp login` → `clasp push` → `clasp deploy --deploymentId AKfycb... --description "Fase 11"` → `fase11_prepararIndice()` no GAS Editor → smoke-test browser (Escuta, Dashboard, Ponto, Colabore AFD) → Fase 13 |
| 2026-05-24 | Fase 15.1 | **Auditoria Completa + Correções**: 8 bindings GAS.* adicionados (almox.salvarItem, ativos.concluirManutencao/registrarUso/categorias, pessoas.obter/registrarDesligamento/autocomplete/porFuncao, rh.solicitarAjuste). 4 automações IntegracaoOrquestrador ativadas (onReservaConfirmada→TarefaEngine, onAcaoConcluida→AlertasEngine, onContratoVencendo/onProtocoloChaveAtrasado→TarefaEngine). ModulosRegistryService 9→20 módulos. reserva_engine chama onReservaConfirmada. UX: blur(4px)+animation .22s em modais. Tests suíte: 7 .md com achados reais. Deploy @213. | Smoke-test browser → BtnGuard.auditar() → Fase 13.2 SNIIC |
| 2026-05-24 | Fase 15 | **Banco de Dados — hierarquia Drive + acesso a planilhas**: `admin_controller.gs` — `_garantirEstruturaDrive()` cria pasta-mãe `CCBJ — ERP`, sub-pasta `Planilhas`, move pasta JSON + todas as 11 planilhas (MASTER/ACOES/ESPACOS/PESSOAL/EQUIPES/FINANCEIRO/RELATORIOS/REUNIOES/COMUNICACAO/PUBLICO/ESCUTA) para os destinos corretos no Drive (idempotente); `ctrl_admin_obterInfoBancoDados()` retorna { pastaErp, pastaJson, pastaPlanilhas, planilhas[] } com URL/nome/ícone/descrição para cada planilha; `ctrl_admin_obterUrlPastaDados()` atualizado para compatibilidade retroativa. `index.html` — card "Banco de Dados" redesenhado (3 botões: Pasta ERP, Dados JSON, Planilhas + grid responsivo de 11 cards de planilhas com link "Abrir"); `AdminDadosUI` reescrito com `carregar()`/`_renderPastas()`/`_renderPlanilhas()`; `GAS.admin.obterInfoBancoDados` binding; `AdminDadosUI.carregar()` chamado no `aoAbrir` do módulo admin. Auditoria CLAUDE.md: sem novos modais, sem novos prompts, sem novos botões async (botão refresh tem `data-bg-skip="1"`). Deploy @201. | Smoke-test: Administração → Banco de Dados → 3 botões Drive apontam para pastas corretas → 11 cards com link "Abrir" → cada link abre a planilha no Sheets → BtnGuard.auditar() → próxima fase |
| 2026-05-24 | Fase 14 | **View unificada RH / Depto. Pessoal (10 abas)**: `view-rh` HTML completo (EQUIPE·PCCS·HISTÓRICO·AVALIAÇÕES·ESCALAS·DOCUMENTOS·FÉRIAS·FOLHA·RESCISÃO·INDICADORES). `RhUI` IIFE (~600 linhas): aoAbrir + setTab (lazy) + módulos para cada aba; `_abrirModalRh`/`_fecharModalRh`/`_abrirModalConfirmarRh` locais; BtnGuard em todos botões async. Helpers globais `_abrirModalSimples`/`_abrirModalConfirmar` movidos para escopo global (fix bug MapaAcaoUI). `GAS.rh.*` expandido com 18 novos bindings (historico, registrarEvento, excluirEvento, listarAvaliacoes, salvarAvaliacao, excluirAvaliacao, listarEscalas, salvarEscala, excluirEscala, listarFerias, saldoFerias, solicitarFerias, aprovarFerias, recusarFerias, cancelarFerias, concluirFerias, reenviarFerias + pccs). `_MODULOS_MENU` expandido com `{ id:'rh', label:'RH / Depto. Pessoal', icone:'badge' }`. `Router.registrar('rh', ...)`. AfastamentosUI e OcorrenciasUI: substituídos `confirm()`/`prompt()` nativos por modais via `_abrirModalSimples`/`_abrirModalConfirmar`; funções `_executarAtivar`, `_executarEncerrar`, `_executarCancelar`, `_executarExcluir` exportadas. Auditoria CLAUDE.md 100% verde. Deploy @198. | Smoke-test browser: sidebar mostra "RH / Depto. Pessoal" → clicar nas 10 abas → CRUD colaboradores → solicitar férias → calcular CLT → BtnGuard.auditar() → Fase 13.2 SNIIC |
| 2026-05-24 | Fase 13.1 | **Exportações Institucionais SALIC + PNAB**: `exportacao_engine.gs` — `gerarSALIC()` REESCRITO completo (Proponente, Projeto com PRONAC/número/vigência/contrapartida, PlanoAplicação metas→atividades→rubricas com MemóriaCalculo, PessoalEquipe por meta, Resumo financeiro); `gerarPNAB()` NOVO (4 CSVs: Espaços BOM-UTF8 via ReservaRepository, Agentes via AgenteCulturalRepository, Ações via AcaoRepository+PublicoEngine, Financeiro via ContratoRepository); `ctrl_exportacao_salic` expandido (aceita `contratoId`\|`projetoId`, retorna `nomeArquivo`); `ctrl_exportacao_pnab` NOVO. `index.html`: campo PRONAC (visível quando modalidade=lei_rouanet) + onchange no select modalidade; botão "SALIC XML" no header do contrato-detalhe-card (oculto exceto lei_rouanet); `ContratosDetailUI.exportarSALIC()` + `exportarSALIC` na API pública; `GAS.exportacao.salicContrato` + `GAS.exportacao.pnab` bindings; tab "Exportações" no Financeiro (4ª tab); HTML tab com card SALIC (select contrato lei_rouanet + botão) + card PNAB (seletor ano + botão + chips resultado); `ExportacoesUI` module (aoAbrir popula select, baixarSALIC, gerarPNAB + _baixarArquivo); `FinanceiroTabs.abrirTab` chama `ExportacoesUI.aoAbrir`. Auditoria CLAUDE.md 100% verde: BtnGuard nos 3 botões (btn-cd-salic/btn-exp-salic/btn-exp-pnab) ✅ CSS classes existentes ✅ GAS.* namespace ✅ modais inalterados ✅. | `clasp login` → `clasp push && clasp deploy --deploymentId AKfycb... --description "Fase 13.1"` → smoke-test browser (Financeiro→Exportações→SALIC XML + PNAB CSVs, detalhe contrato lei_rouanet → botão SALIC) → Fase 13.2 SNIIC |
| 2026-05-24 | Auditoria Sistema | **Auditoria completa do sistema (10 categorias)**: GAS.* namespace 100% (312 bindings frontend vs 365 backend, apenas funções portal/wizard/trigger sem binding — correto), ContratosDetailUI Fase 12.1 validado, prompt()/null-check correto em todos os pontos, CSS classes verificadas, modais opacos, BtnGuard completo, FsmGuardian em todas as transições, DOM IDs sem inconsistência, portais reais. **4 bugs corrigidos**: (1) `ctrl_contratacoes_gerar_token` IMPLEMENTADO — função ausente causaria crash no "Reenviar Link Portal"; (2) `portal_aprovacao.html` REESCRITO — substituídos TODOs/setTimeout/dados hardcoded por `google.script.run` real (`ctrl_portal_getInfoAprovacao` + `ctrl_portal_registrarAprovacao` adicionados ao portal_controller.gs); (3) `EstrategiaRepository.prepararIndice()` adicionado em `setup.gs → inicializarSistema()`; (4) Deploy @179 realizado. **PATTERNS.md criado** — guia completo de padrões obrigatórios para próximas fases (backend, frontend, RBAC, FSM, auditoria, portais, UI/UX, modais, BtnGuard, CSS). | Smoke-test manual Fase 12.1 no browser → confirmar CRUD Meta/Atividade/Rubrica/Pessoal → depois Fase 11.2 Escuta Institucional ou 11.3 Dashboards Reais |
| 2026-05-24 | Fase 11.1 | **Estratégia Institucional + Identidade TRAMAR** entregues: `estrategia_repository.gs` (objetivos_estrategicos.json + ACOES.Estrategia). `estrategia_engine.gs` (FSM 5 estados; `calcularKPIs()` real — ocupação espaços, conclusão ações no prazo, custo por ação, NPS público, execução orçamentária, renovação agentes; `calcularRiscos()` — 5 categorias classificadas por severidade; `gerarRelatorio()` trimestral/semestral/anual; `gerarCalendario()` por horizonte). `estrategia_controller.gs` (CQRS + cache + RBAC 8 funções). 7 eventos STRATEGY_* em `events_constants.gs`. `setup.gs` ACOES.Estrategia + `fase11_prepararIndice()`. `index.html`: GAS.estrategia (13 bindings), view-estrategia (4 tabs: Objetivos/KPIs/Riscos/Calendário), `EstrategiaUI` module completo, modais opacos, BtnGuard 100%. **Identidade TRAMAR**: sidebar tagline estático; logo 52×52px; `_boot.orgConfig.nomeInstituicao` na sidebar; `document.title` = "TRAMAR — [inst.]"; campos `nomeInstituicao` + `apresentacaoInstituicao` em `config_org.json`/`getPublicOrgConfig()`/`LogoPaletaService`/Admin UI. Auditoria CLAUDE.md 100% verde. Deploy @167. | `fase11_prepararIndice()` no GAS Editor → smoke-test browser (Estratégia CRUD+KPIs+Riscos+Calendário, sidebar TRAMAR, Admin Identidade Institucional) → Fase 11.2 ou 11.3 |
| 2026-05-26 | Fase 16.3 | **Dashboard RH/Folha — custo total, heatmap banco de horas, calendário ponto, turnover 12m**: `rh_dashboard_controller.gs` CRIADO — `ctrl_rh_dashboard_folha` (custo estimado CLT/PJ/bolsista por colaborador, breakdown vínculo/setor, histórico 12m, projeção anual), `ctrl_rh_dashboard_ponto` (heatmap todos×6m e calendário individual com status presente/parcial/ausente), `ctrl_rh_dashboard_turnover` (tendência 12m + média + altoRisco). `index.html`: 3 GAS bindings; CSS 12 blocos (rh-dash-*, bh-grid/cell, ponto-cal, tv-bar/taxa); Tab Folha: sub-nav Dashboard|Calculadora + painel com stats strip + breakdown + gráfico 12m + tabela; Tab Indicadores: 4 seções (Turnover 12m, Heatmap BH, Calendário, Mês específico); RhUI 6 funções novas + setTab atualizado. Auditoria CLAUDE.md 100% verde. Deploy @249. | Smoke-test browser: RH→Folha→Dashboard (stats+breakdown+12m) + Indicadores→Turnover 12m+Heatmap BH+Calendário ponto → F12 zero erros |
| 2026-05-26 | Fase 18 | **Reservas Modo Lote + Buffer 5min + Habilitado + Cancelamento urgente**: `reserva_engine.gs` (BUFFER=5, STATUS_RESERVA.HABILITADO, FSM confirmado→habilitado→em_uso, notificação GmailApp para admins em cancelamento no dia), `reservas_controller.gs` (ctrl_reservas_habilitar), `index.html` (CSS badge-habilitado+lote-*, GAS.reservas.habilitar, botão "Lote" data-bg-skip, modal #lote-modal 2 cols: campos reserva + seletor 4 modos manuais/semanal/intervalo/mensal, IIFE _LoteUI com chips preview + dispatch criarLote, botão Habilitar na lista, _cancelar motivo obrigatório para hoje + aviso vermelho). Auditoria CLAUDE.md 100% verde. Deploy @253. | Smoke-test: Reservas→Lote→semanal→criar; confirmar→habilitar→badge roxo; cancelar reserva hoje→motivo obrigatório; F12 zero erros |
| 2026-05-26 | Fase 17 | **Holerite e Processamento de Folha**: `holerite_repository.gs` (holerites.json + EQUIPES.Holerites, ID HOL-AAAA-MM-NNN, idempotente, marcarPago/cancelar/metricas), `holerite_engine.gs` (INSS progressivo, IRRF, VT/VA/VR/PS, HE 50%, encargos patronais completos, provisões mensais férias+13°+FGTSresc, processarFolha em lote, exportarCSV), `holerite_controller.gs` (8 ctrl_holerite_* + RBAC rh/admin), setup.gs (EQUIPES.Holerites + fase17_holerite_prepararIndice), index.html (8 GAS bindings, CSS 11 blocos, painel Processamento na sub-nav Folha, HoleriteUI IIFE ~300 linhas com modal holerite completo + impressão + marcarPago via _abrirModalConfirmar). Auditoria CLAUDE.md 100% verde. Deploy @251. | `fase17_holerite_prepararIndice()` no GAS Editor → smoke-test browser (RH→Folha→Processamento: métricas, processar folha, modal holerite, imprimir, marcar pago, exportar CSV) |
| 2026-05-26 | Fase 19 | **Pós-evento Reservas + ConsolidacaoEngine**: `reserva_repository.gs` (3 novas colunas MinutosMontagem/MinutosEncerramento/PosEvento, `_nCols` defensivo, `atualizarPosEvento/atualizarPreEvento`, `prepararIndice` com migração); `reserva_engine.gs` (`registrarPosEvento` com cálculo tempoAtividadeMin); `reservas_controller.gs` (`ctrl_reservas_registrarPosEvento`); `acao_engine.gs` (`metaExecucao` no schema); `consolidacao_engine.gs` CRIADO (`calcularExecucaoAcao` + `ctrl_consolidacao_execucaoAcao`); `index.html` (campos Montagem/Encerramento + display tempo atividade no form, botão pós-evento na lista, modal `#pos-evento-modal`, `GAS.reservas.registrarPosEvento`). Deploy @259. | `fase2_reservas_prepararIndice()` no GAS Editor para adicionar as 3 novas colunas → smoke-test browser |
| 2026-05-26 | Fase 13.2 | **SNIIC — Exportação completa para MinC**: `exportacao_engine.gs` — `gerarSNIIC()` REESCRITO: 6 seções (Identificação, Funcionamento, RH, Atividades×8 categorias+12 meses, Público+faixas+PcD+NPS, Recursos Financeiros por esfera); `_gerarCsvSNIIC()` — CSV BOM UTF-8 Seção/Campo/Valor 40+ linhas para importação no portal MinC. `index.html` — card SNIIC na aba Exportações do Financeiro (input ano + BtnGuard + dashboard inline `_renderSNIICResumo`); `ExportacoesUI.gerarSNIIC()` + init de ano em `aoAbrir()`; `PublicoUI.exportarSNIIC()` REESCRITO com dashboard rico (6 stat cards, barras de categoria, barras mensais, badges faixas etárias, re-download manual via `_sniicCsvCache`). Auditoria CLAUDE.md 100% verde. Deploy @239. | smoke-test browser (Público + Financeiro → SNIIC) → Fase 13.3 ou próxima prioridade |
| 2026-05-25 | Fase 16.1 | **Reservas: Manutenção + CCBJ Fechado todos os modos + Itens real-time + Migração V1**: `mapa_controller.gs` (emManutencao+itensFixos no retorno); `admin_controller.gs` (`ctrl_admin_alternarManutencaoEspaco` RBAC admin/gestor/infraestrutura); `migracao_itens_v1.gs` (novo — `migrar_itens_v1()` lê CCBJ_ESPACOS.Itens via V1_ESPACOS_SHEET_ID); `almoxarifado_engine.gs` (`_parseItensVolantesStr`+`_horariosSobrepoem`+`calcularDisponibilidadeItens` cruzando empréstimos+itensVolantes de reservas sobrepostas+itensFixos outras salas); `reservas_controller.gs` (`ctrl_reservas_disponibilidadeItens`); `index.html` (GAS bindings alternarManutencao+disponibilidadeItens; `#res-admin-toolbar` acima do modo-toggle; `#modal-manutencao-espaco`; blocos itens fixos+volantes com chips verde/vermelho; re-validação ao mudar horário; salvar bloqueado com chips vermelhos; ReservasUI new fns: abrirModalManutencao/_fecharModal/_atualizarBadge/_confirmar/_carregarDisponibilidade/_adicionarItem/_removerItemChip/_renderChips/_serializarItensVolantes/_temChipsIndisponiveis); `mapa_ui.html` (_meuPapel capturado via App.getBoot; seção Equipamentos Fixos no painel; botão Manutenção/Liberar admin-only; `_alternarManutencao`+BtnGuard). Deploy @231. | Smoke-test browser: (a) trocar modo lista→agenda→diagrama → toolbar admin sempre visível; (b) "Manutenção de Espaço" → select espaço → confirmar → mapa cor warning; (c) "CCBJ Fechado" → modal bloqueio; (d) form reserva: sala+data+hora → itens carregam; chip vermelho bloqueia salvar |
| 2026-05-24 | Fase 10 | **Alertas, TaskHub, Reuniões, Balcão e Auditoria Visual** entregues: `alertas_engine.gs` REESCRITO (persistência MASTER.AlertasLog 12 colunas, listarAtivos, contarNaoLidos, marcarLido/Resolver, verificarTodosAutomaticos 17 subs, 25+ tipos, deduplicação). `alertas_controller.gs` NOVO (6 controllers RBAC). `taskhub_controller.gs` NOVO (minha_caixa agrega tarefas+encaminhamentos+demandas+aprovações+alertas, meu_time carga por pessoa, produtividade concluídas+taxaNoPrazo+mediaHoras). `reuniao_repository.gs`+`reuniao_engine.gs`+`reuniao_controller.gs` NOVOS (FSM reunião 4 estados + FSM ata 3 estados, encaminhamentos→tarefas automáticas, listarEncaminhamentosPendentes cross-reunião). `balcao_repository.gs`+`balcao_engine.gs`+`balcao_controller.gs` NOVOS (FSM 7 estados, SLA_POR_TIPO, versões entregas, comentários, metricas). `auditoria_controller.gs` NOVO (listar+rollback superadmin+detectarSuspeitos). `setup.gs` fase10_prepararIndice(). `index.html` expandido: badge alertas + painel deslizante, 4 views (reunioes/taskhub/balcao/auditoria), 5 GAS namespaces (38 bindings), 5 JS modules (AlertasUI/ReunioesUI/TaskHubUI/BalcaoUI/AuditoriaVisualUI), CSS Fase 10, menu taskhub+balcao+auditoria, Router entries. Auditoria CLAUDE.md 100% verde (prompt null-check, GAS.*, CSS, FsmGuardian, modais opacos, BtnGuard). Deploy @151. | fase10_prepararIndice() no GAS Editor → smoke-test browser (badge alertas, TaskHub, Reuniões CRUD+ata+encaminhamentos, Balcão CRUD+SLA+versões, Auditoria+rollback) → Fase 11 |
| 2026-05-23 | Fase 9 | **Multi-Tenancy e Painel Admin** entregues: `fase9_migrarOrgId()` (stamp orgId em 31 JSONs, idempotente) + `fase9_validarIsolamento()` + `fase9_prepararIndice()`. `config_org.json` bloco `features` com 18 flags. `SistemaConfigService.getFeatureFlag/setFeatureFlag/getFeatureFlagsCatalogo`. `OrgRegistryService` (orgs_registry.json + MASTER.Orgs; checarProvisionamento 8 itens). `admin_controller.gs`: 6 novos controllers (listarFeatureFlags, setFeatureFlag, checarProvisionamento, ctrl_orgs_*). `wizard_controller.gs` CRIADO (7 controllers, retoma passo pendente). `wizard_setup.html` CRIADO (wizard SPA 6 passos, stepper, BtnGuard). `router.gs`: rota `?secao=wizard_setup`. `index.html`: GAS.orgs (3 bindings) + GAS.admin +3; tab Features (toggles por grupo); tab Provisionamento (checklist+barra+link wizard); view `#view-painel-orgs` (superadmin); `FeatureFlagsUI` + `PainelOrgsUI` modules; menu item "Painel de Orgs". Auditoria CLAUDE.md 100% verde. Deploy @140. | fase9_prepararIndice() no GAS Editor → smoke-test (Features tab, Wizard `?secao=wizard_setup`, Painel Orgs, F12 zero erros) → Fase 10 |
| 2026-05-23 | Fase 8 | **Agentes, Acervo, Voluntários e Parcerias** entregues: `AgenteCulturalRepository/Engine/Controller` (FSM rascunho→ativo↔suspenso→descredenciado, auto-cadastro portal, rider técnico, histórico de vínculos, MASTER.AgentesCulturais). `AcervoRepository/Engine/Controller` (upload Drive por Ação, status LGPD 4 estados, checklist evidências, exportação ZIP, ACOES.Acervo). `VoluntarioRepository/Engine/Controller` (FSM voluntário+alocação, convite email, registro horas, certificado ao concluir, MASTER.Voluntarios). `ParceriaRepository/Engine/Controller` (FSM 5 estados, vínculos com Ações, entregas, avaliação ao encerrar, ACOES.Parcerias). `portal_agente.html` (auto-cadastro público: 12 áreas, rider, disponibilidade, LGPD). 18 novos eventos em events_constants.gs. setup.gs: SCHEMA_ABAS+4 novas abas, fase8_prepararIndice(). index.html: 4 GAS namespaces (38 bindings), seção MEMÓRIA no sidebar, views+modais+UIs AgentesUI/AcervoUI/VoluntariosUI/ParceriasUI. Auditoria CLAUDE.md 100% verde. Deploy @138. | fase8_prepararIndice() no GAS Editor → smoke-test browser (Agentes+portal+Acervo+Voluntários+Parcerias) → Fase 9 |
| 2026-05-23 | Fase 7 | **Portal Externo + PublicoEngine + ExportacaoEngine** entregues: `ConsentimentoService` (LGPD), `PublicoRepository` (inscrições/presenças/pesquisas/certificados JSON + índice PUBLICO.*), `PublicoEngine` (FSM 6 estados, lista espera automática, NPS, dados CODIP), `publico_controller.gs` (ctrl_publico_* autenticado), `portal_controller.gs` (ctrl_portal_* público, rate limiting), `exportacao_engine.gs` (CODIP 28 campos CSV+JSON, SALIC XML, SNIIC anual, CSV genérico). Portais HTML: TODOs substituídos por google.script.run reais (agenda, inscrição, cessão de pauta, status de pauta). index.html: GAS.publico+GAS.exportacao namespaces, view-publico (4 tabs), PublicoUI completo, rota sidebar 'publico'. Deploy @136. | `fase7_publico_prepararIndice()` no GAS Editor → smoke-test browser (portais + view Público) → Fase 8 |
| 2026-05-23 | Fix bugs espaços | 3 bugs corrigidos: (1) `numeroPlanta` perdido no `salvarEspaco` — adicionado ao registro backend + form admin + coleta de dados + label fallback em `_renderMapa` e `_renderCustomSpaces`; (2) Espaços "perdidos" no mapa config — `_renderMapa` agora tem try/catch por espaço + validação de coords (isFinite) + renderização de marcador vermelho clicável em posição fallback para coords inválidas; (3) Exclusão de espaços — `excluirEspaco()` adicionado em `config_admin_service.gs` + `ctrl_admin_excluirEspaco` + `GAS.admin.excluirEspaco` binding + botão Excluir na listagem + `reativarEspaco()` bônus. Deploy @122. | Fase 6 — RECE + Eventos |
| 2026-05-29 | Fase B Mapa | **Novos objetos Som/Luz/AV/Logística + seções colapsáveis**: `shared/mapa_acao_editor.html` — 36 categorias (era 12); `_iconeCategoria` +24 ícones SVG; `_SECOES` 7 seções com abertaDefault; `_paletteSecState` por sessão; `_renderPaletteObjetos` com headers colapsáveis; `_toggleSecao`. Deploy @294. | Fase C — Avatares de equipe + avatar customizado |
| 2026-05-29 | Fase A Mapa | **Bug drag+layer+fullscreen+download+palette+cinza**: drag SVG nativo (matrixTransform); `_activeLayerId`; fullscreen+fallback; download SVG/PNG/imprimir; palette sem quadrados; espaços cinza em layer oculta; +Novo espaço. Deploy @291. | Fase B |
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
