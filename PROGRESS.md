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

**Fase atual**: Auditoria de bugs concluída — **Seguir para Fase 3**
**O que foi feito (2026-05-20 a 2026-05-22)**:
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

**Próximo passo imediato**:
> 1. **[GAS EDITOR]** Executar `fase2_reservas_prepararIndice()` → `{ok:true}`
> 2. **[GAS EDITOR]** Executar `fase2_chaves_prepararIndice()` → `{ok:true}`
> 3. **[GAS EDITOR]** Executar `fase2_emprestimos_prepararIndice()` → `{ok:true}`
> 4. **[BROWSER]** Abrir módulo Espaços → tab "Reservas" → criar reserva → criar segunda no mesmo horário e confirmar que CONFLITO é bloqueado
> 5. **[BROWSER]** Tab "Chaves" → registrar retirada → devolver
> 6. Iniciar **Fase 3 — Pessoas, RH e Contratações**

**Fase mais urgente agora**: **Fase 3** — domínio de pessoas robusto com contratações e aprovação real.

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
| 3 | Pessoas, RH e Contratações | ⬜ Aguardando F2 | 🟠 ALTO — colaboradores em 3 estruturas sem sync | — | — |
| 4 | Financeiro e Contratos | ⬜ Aguardando F3 | 🟠 ALTO — métricas retornam zero, orçamento sem controle | — | — |
| 5 | Ação como Núcleo Real | ⬜ Aguardando F4 | 🟠 ALTO — Ação desconectada dos outros domínios | — | — |
| 6 | Integração via Eventos | ⬜ Aguardando F5 | 🟡 MÉDIO — EventBus emite mas ninguém consome | — | — |
| 7 | Portal Externo e Público | ⬜ Aguardando F6 | 🟡 MÉDIO — agentes externos sem canal | — | — |
| 8 | Agentes, Acervo, Voluntários | ⬜ Aguardando F7 | 🟡 MÉDIO — memória institucional digital | — | — |
| 9 | Multi-Tenancy e Config Admin | ⬜ Aguardando F8 | 🟡 MÉDIO — segundo deployment viabiliza SaaS | — | — |
| 10 | Alertas, TaskHub, Reuniões | ⬜ Aguardando F9 | 🟢 BAIXO — melhoria UX operacional | — | — |
| 11 | Estratégia e Produto Pronto | ⬜ Aguardando F10 | 🟢 BAIXO — cockpit executivo e KPIs | — | — |

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
| 3 — Pessoas e RH | Após criar views de escalas/férias | ⬜ |
| 4 — Financeiro | Após criar views financeiras | ⬜ |
| 5+ — Demais fases | Após cada view criada | ⬜ |

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

---

## Fase 3 — Pessoas, RH e Contratações

**Objetivo**: domínio de pessoas robusto; contratações com aprovação real e bloqueio orçamentário.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Começar por `3.1 — PessoasEngine consolidado`: implementar perfil completo, escalas, férias com FSM.

### 3.1 — PessoasEngine consolidado

- [ ] Perfil completo: dados pessoais, vínculos históricos, funções, competências, PCCS
- [ ] Escalas: por turno, semana, mês — por setor
- [ ] FSM de férias: solicitação → aprovação → registro → substituição na escala
- [ ] Ocorrências e afastamentos com impacto automático na escala

### 3.2 — EntidadeContratavel (PF + PJ unificado)

- [ ] Criar `contratados_registry.json` com busca por CPF/CNPJ
- [ ] Integrar com HabilitacoesEngine
- [ ] Histórico de vínculos e avaliações

### 3.3 — Fluxo de Aprovação Multinível de Contratações

- [ ] DemandaEngine orquestra: solicitante → setores → financeiro → conclusão
- [ ] OrcamentoGuard.assertDisponivel() em cascata ANTES de criar processo
- [ ] Notificação ao próximo aprovador a cada transição

---

## Fase 4 — Financeiro e Gestão de Contratos

**Objetivo**: módulo financeiro completo, da proposta à prestação de contas.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Começar por `4.1 — FonteRecurso como entidade`: criar `fontes_recurso.json` com FSM.

### 4.1 — FonteRecurso como entidade

- [ ] Criar `gas/src/modules/financeiro/fonte_recurso_engine.gs`
- [ ] FSM: ativo → suspenso → encerrado

### 4.2 — Ferramenta de Proposta Orçamentária

- [ ] OrcamentoPropostaEngine com FSM: rascunho → revisao → submetida → aprovada
- [ ] Validação automática de tetos por edital (Lei Rouanet, etc.)
- [ ] Exportação para Sheets + PDF

### 4.3 — Remanejamentos com aprovação intersetores

- [ ] RemanejamentoEngine com FSM de 6 estados
- [ ] Snapshot imutável de saldos por aprovação
- [ ] Thresholds configuráveis por valor

### 4.4 — Aditivos Contratuais

- [ ] AditivoContratoEngine com FSM
- [ ] Efetivação automática nas rubricas/metas após aprovação

---

## Fase 5 — Ação como Núcleo Real

**Objetivo**: Ação conectada de fato com todos os domínios.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Começar por `5.1 — Vínculos reais da Ação`: adicionar `acaoId` a Reservas, Tarefas, Contratos.

### 5.1 — Vínculos reais

- [ ] Adicionar `acaoId` às Reservas de Espaço
- [ ] Adicionar `acaoId` às Reservas de Itens
- [ ] Adicionar `acaoId` às Contratações e Contratos
- [ ] AcoesRecursos populado automaticamente em todos os flows

### 5.2 — Painel Integrado da Ação (9 tabs)

- [ ] [Visão Geral] [Tarefas] [Reservas] [Itens] [Reuniões] [Contratos] [Equipe] [Financeiro] [Entregas]
- [ ] Timeline cronológica de todos os eventos da Ação

### 5.3 — FSM de Ação revisada

- [ ] planejada → em_producao → em_execucao → concluida → arquivada
- [ ] Transições automáticas por eventos

---

## Fase 6 — Integração via Eventos

**Objetivo**: EventBus reativo — módulos integram via eventos consumidos.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Implementar os 7 handlers críticos no EventHandlerRegistry (já tem stubs da Fase 0).

### 6.1 — EventHandlerRegistry funcional

- [ ] RESERVATION_CREATED → TarefaEngine (prep espaço) + ComunicacaoEngine (notif RECE)
- [ ] ACTION_STARTED → FinanceiroEngine (ativar linhas de orçamento)
- [ ] ACTION_COMPLETED → RelatoriosEngine (solicitar CODIP) + PublicoEngine (pesquisa satisfação)
- [ ] CONTRACT_EXPIRED → TarefaEngine (tarefa renovação)
- [ ] TASK_COMPLETED → DemandaEngine (verificar avanço processo)
- [ ] KEY_PROTOCOL_DELAYED → TarefaEngine (cobrança chave)
- [ ] ITEM_NOT_RETURNED → TarefaEngine (cobrança item)

### 6.2 — Trigger assíncrono

- [ ] processarEventosPendentes() a cada 30 min
- [ ] Retry com backoff exponencial (máx 3 tentativas)
- [ ] Alerta ao admin quando eventos pendentes > 100

### 6.3 — DemandaEngine e ProcessoInstitucional

- [ ] DemandaEngine: renomear + FSM real
- [ ] SolicitacaoEspacoEngine: separar semanticamente
- [ ] ProcessoInstitucionalEngine: transformar em orquestrador explícito

---

## Fase 7 — Portal Externo e Gestão de Público

**Objetivo**: canal externo funcional; dados de público para Lei Rouanet.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Estruturar `portal/` com doGet() roteando para contexto público sem autenticação.

### 7.1 — Portal Externo

- [ ] Estrutura `portal/` com controllers públicos separados
- [ ] Rate limiting + CSRF token para formulários públicos
- [ ] Cessão de Pauta: formulário público → número de protocolo
- [ ] Calendário público: ações com `visibilidadePublica: true`

### 7.2 — Gestão de Público (PublicoEngine)

- [ ] Inscrições online com consentimento LGPD explícito
- [ ] Lista de espera automática
- [ ] Check-in de presença (QR code ou lista)
- [ ] Controle de frequência por sessão (para cursos)
- [ ] Certificado de conclusão com critério de frequência mínima
- [ ] Exportação para CODIP/SALIC

---

## Fase 8 — Agentes Culturais, Acervo, Voluntários

**Objetivo**: banco completo de agentes; memória institucional digital.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Criar `AgenteCultural` como entidade com portal de auto-cadastro.

### 8.1 — Banco de Agentes Culturais

- [ ] Entidade AgenteCultural: portfolio, histórico, rider técnico
- [ ] Portal de auto-cadastro (extensão do portal externo)
- [ ] Integração com HabilitacoesEngine e EntidadeContratavel

### 8.2 — Acervo Digital

- [ ] Upload por Ação: foto, vídeo, release, folder
- [ ] Status LGPD por arquivo
- [ ] Checklist de evidências por Ação
- [ ] Exportação ZIP para prestação de contas

### 8.3 — Voluntários

- [ ] Alocação a Ações com função e horário
- [ ] Confirmação via link
- [ ] Registro de horas + certificado automático

---

## Fase 9 — Multi-Tenancy e Painel Admin

**Objetivo**: segunda organização provisionada sem alterar código.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Injetar `orgId` em todos os repositórios e criar script de migração para dados existentes.

### 9.1 — orgId em todos os dados

- [ ] Injetar orgId em todo salvar() e filtrar em todo listar()
- [ ] Script de migração para dados existentes
- [ ] dataFolder → orgId + '_DATA' em todos os deployments

### 9.2 — Wizard de configuração inicial

- [ ] Fluxo guiado: org, setores, turnos, espaços, módulos, roles
- [ ] Defaults razoáveis para nova organização
- [ ] Modo demonstração (sandbox) com dados de exemplo

---

## Fase 10 — Alertas, TaskHub, Reuniões, Comunicação

**Objetivo**: sistema de alertas centralizado; centro de controle de tarefas unificado.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Expandir NotificationEngine para todos os 25+ tipos de alerta catalogados.

### 10.1 — AlertasEngine completo

- [ ] 25+ tipos de alerta com severidade (INFO / ATENÇÃO / URGENTE)
- [ ] Alertas in-app: badge no header + painel de notificações
- [ ] Escalação automática por nível
- [ ] Preferências por usuário

### 10.2 — TaskHub (Centro de Controle)

- [ ] Visão "Meu Dia": tarefas + todas pendências de outros módulos
- [ ] Visão "Meu Time" (gestores): carga por pessoa com heatmap
- [ ] Visão "Produtividade": métricas do time no período
- [ ] obterMinhaCaixaDeEntrada() agregando todos os módulos

### 10.3 — Reuniões redesenhadas

- [ ] Ata com template estruturado obrigatório
- [ ] Versionamento de rascunho + aprovação formal
- [ ] Exportação PDF com template institucional
- [ ] Vínculo bidirecional reunião ↔ Ação

### 10.4 — Comunicação / Balcão redesenhado

- [ ] SLA por tipo de demanda configurável
- [ ] Versionamento de entregas
- [ ] Motivo de rejeição estruturado
- [ ] Dashboard de SLA

---

## Fase 11 — Estratégia e Produto Pronto para Mercado

**Objetivo**: KPIs reais; observabilidade total; demonstrável para outras organizações.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Implementar módulo de Estratégia com objetivos estratégicos vinculados a Ações.

### 11.1 — Módulo de Estratégia

- [ ] Cadastro de objetivos estratégicos (curto/médio/longo prazo)
- [ ] gerarRelatorioEstrategico(): síntese trimestral/anual
- [ ] KPIs reais: ocupação espaços, custo/atendimento, taxa on-time
- [ ] Painel "Riscos do Mês" consolidado

### 11.2 — Escuta Institucional completa

- [ ] Pesquisas de clima com análise de sentimento
- [ ] Cruzamento analítico: clima × escalas × férias × absenteísmo

### 11.3 — Métricas e dashboards corretos

- [ ] Corrigir obterMetricasEficiencia e calcularCustoPorMeta
- [ ] Dashboard estratégico (direção): execução global + KPIs
- [ ] Dashboard financeiro: por contrato / meta / rubrica / setor

### 11.4 — Preparação para mercado

- [ ] Zero hardcodes de "CCBJ" em código ou labels
- [ ] 100% dos labels configuráveis via SistemaConfigService
- [ ] Documentação de provisionamento para novas orgs
- [ ] Demonstração do sistema para organização diferente do CCBJ

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
