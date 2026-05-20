# PROGRESS — ERP Cultural SaaS v2
> **Propósito**: marcador de evolução persistente do projeto. Atualizar a cada sessão de trabalho.
> Permite retomar exatamente de onde paramos sem perda de contexto.

---

## ⚡ RETOMANDO AGORA? LEIA ISTO PRIMEIRO

**Fase atual**: Fase 0 — Fundação Técnica — **FALTA APENAS O DEPLOY**
**O que foi feito (2026-05-20, sessões 4 e 5)**:
- ✅ Saneamento 0.9: zero hardcodes de org em `.gs`
- ✅ AcessoService + `primeiro_acesso.html` + router atualizado
- ✅ `USER_DEPLOYING` mantido (correto para Workspace + access:DOMAIN)
- ✅ `inicializarSistema()`: registra superadmin automaticamente
- ✅ Logomarca + paleta de cores: `LogoPaletaService`, `SistemaConfigService.getLogoUrl/getPaleta`, `Identidade` JS, admin UI
- ✅ **Paleta padrão → ROXO CCBJ** (`#7c3aed`/`#4c1d95`/`#f59e0b`) em `config_org.json`, `config_service.gs`, `index.html` `:root`
- ✅ **BtnGuard v2** (`shared/btnguard.html`): `wrap`, `travar`, `liberar`, `auditar`; `include()` em `router.gs`
- ✅ Todos os botões assíncronos protegidos: `index.html`, `primeiro_acesso.html`, todos os portais

**Próximo passo imediato** — APENAS DEPLOY (fazer no editor GAS):
> 1. **[CLASP]** Terminal: `cd /home/jpbarros/ccbj-clean/saas-erp-cultural-v2/gas && clasp login --no-localhost && clasp push`
> 2. **[GAS EDITOR]** Abrir o script → executar `inicializarSistema()` (cria planilhas + registra superadmin)
> 3. **[GAS EDITOR]** Executar `verificarTodasAbas()` → confirmar 100%
> 4. **[GAS EDITOR]** Definir Properties: `ORG_NOME`, `ORG_NOME_COMPLETO`, `ORG_DOMINIO`, `ADMIN_EMAIL`
> 5. **[BROWSER]** Abrir webapp → `BtnGuard.auditar()` no console → confirmar "✅ todos protegidos"

**Com Fase 0 concluída → iniciar imediatamente**: **Fase 1** — TarefaRepository com tarefas.json canônico.

**Fase mais urgente após Fase 0**: **Fase 1** — Eliminar dual-systems.
Enquanto os dual-systems existirem, o sistema está em risco de corrupção silenciosa de dados.

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
| 0 | Fundação Técnica | 🟡 **EM ANDAMENTO** | — | 2026-05-20 | — |
| 1 | Persistência Canônica | ⬜ Aguardando F0 | 🔴 CRÍTICO — risk de corrupção de dados | — | — |
| 2 | Espaços e Almoxarifado | ⬜ Aguardando F1 | 🔴 CRÍTICO — conflitos de reserva possíveis | — | — |
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

**Última sessão**: 2026-05-20 — Criação do ambiente, estrutura de diretórios e arquivos core.

**Critério de saída**:
- [ ] **[PENDENTE — DEPLOY]** `verificarTodasAbas()` retorna 100%
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
- [ ] **[PENDENTE — FAZER NO GAS]** Executar `inicializarSistema()` + confirmar `verificarTodasAbas() = 100%`

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
| 0 — Frontend shell + portais | `BtnGuard.auditar()` pós-deploy | ⏳ Aguardando deploy |
| 1 — Persistência Canônica | Após criar views de tarefas/colaboradores | ⬜ |
| 2 — Espaços e Almoxarifado | Após criar views de reservas/chaves | ⬜ |
| 3 — Pessoas e RH | Após criar views de escalas/férias | ⬜ |
| 4 — Financeiro | Após criar views financeiras | ⬜ |
| 5+ — Demais fases | Após cada view criada | ⬜ |

---

## Fase 1 — Persistência Canônica

**Objetivo**: cada domínio com UMA fonte de verdade. Zero dual-systems.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Começar por `1.1 — Tarefas`: criar `TarefaRepository` com `tarefas.json` como canônico e `PESSOAL.Tarefas` como índice.

### 1.1 — Tarefas (canônico: tarefas.json)

- [ ] Criar `gas/src/modules/tarefas/tarefa_repository.gs`
- [ ] Criar `gas/src/modules/tarefas/tarefa_engine.gs` — refatorado com orgId
- [ ] Script de migração: Sheet → JSON
- [ ] Marcar Sheet como read-only para escrita direta

### 1.2 — Colaboradores (fusão Equipes + RH)

- [ ] Criar `gas/src/modules/pessoas/colaborador_repository.gs`
- [ ] Criar `gas/src/modules/pessoas/pessoas_engine.gs` — fusão EquipesEngine + RHEngine
- [ ] Script de migração: fundir funcionarios.json + EQUIPES.Funcionarios

### 1.3 — Contratações

- [ ] Criar `gas/src/modules/financeiro/contratacoes_repository.gs`
- [ ] Script de migração: Sheet → JSON canônico

### 1.4 — Ativos e Almoxarifado

- [ ] Criar `gas/src/modules/espacos/ativos_engine.gs` — FSM: disponivel→reservado→em_uso→manutencao→baixado
- [ ] Criar `gas/src/modules/espacos/almoxarifado_engine.gs`
- [ ] Deprecar `almoxarifado.json` legado

---

## Fase 2 — Espaços e Almoxarifado com Bloqueio Real

**Objetivo**: reservas sem sobreposição possível. Conflito é impossível por design.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Começar por `2.1`: garantir que `assertSemConflito()` é chamado em TODOS os paths de criação de reserva, incluindo dentro do mesmo `LockService`.

### 2.1 — Reservas de Espaço com conflito garantido

- [ ] Criar `gas/src/modules/espacos/reserva_engine.gs` — assertSemConflito em todos os paths
- [ ] Criar `gas/src/modules/espacos/reserva_repository.gs`
- [ ] Implementar verificação de horário de funcionamento do espaço
- [ ] Implementar verificação de bloqueio de datas (feriados, manutenção)

### 2.2 — Sistema de Empréstimo de Itens

- [ ] Criar `gas/src/modules/espacos/almoxarifado_engine.gs` — FSM: solicitado→aprovado→retirado→devolvido
- [ ] Criar `gas/src/modules/espacos/reservas_itens_repository.gs`
- [ ] Implementar `assertItemDisponivel()` com lock de escrita
- [ ] Alertas de atraso via EventHandlerRegistry

### 2.3 — Protocolo de Chaves

- [ ] Criar `gas/src/modules/espacos/chave_engine.gs` — refatorado com orgId
- [ ] Integrar responsável por turno automático via SistemaConfigService

### 2.4 — Configuração de Espaço Expandida

- [ ] UI admin: horários de funcionamento por dia/espaço
- [ ] UI admin: responsáveis por turno
- [ ] UI admin: bloqueios pontuais de data

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

---

## Referências Rápidas

| O que procurar | Onde fica |
|----------------|-----------|
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
