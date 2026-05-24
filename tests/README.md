# Suíte de Auditoria — CCBJ ERP Cultural v2

**Data da auditoria**: 2026-05-24  
**Última atualização**: 2026-05-24 (ITERAÇÃO 6 — correções aplicadas)  
**Sistema**: SaaS ERP Cultural v2 (21.002 linhas, Fase 15)  
**Auditor**: Claude Code (análise de código + padrões institucionais)  
**Escopo**: Backend + Frontend↔Backend + UX/UI V1 vs V2 + Isolamento Modular

---

## 🔴 ACHADOS CRÍTICOS (agir imediatamente)

| ID | Severidade | Área | Descrição | Status |
|----|-----------|------|-----------|--------|
| ~~C01~~ | ~~🔴 CRÍTICO~~ | ~~Modal~~ | ~~`_abrirModalConfirmar` usa `var(--surface2)` — variável não definida~~ | ✅ FALSO POSITIVO — `--surface2:#f8fafc` está em `:root` linha 35 |
| C02 | 🔴 CRÍTICO | Integração | `IntegracaoOrquestrador` tinha 100% das automações comentadas — tarefas auto, CODIP, calendar **nunca eram criados** | ✅ **CORRIGIDO**: onReservaConfirmada→TarefaEngine, onAcaoConcluida→AlertasEngine, onContratoVencendo→TarefaEngine, onProtocoloChaveAtrasado→TarefaEngine |
| C03 | 🔴 CRÍTICO | Backend | `ctrl_almox_salvar_item` sem binding no GAS.* — almoxarifado não podia cadastrar novos itens | ✅ **CORRIGIDO**: `GAS.almox.salvarItem` adicionado |
| C04 | 🔴 CRÍTICO | Isolamento | Catálogo de módulos listava apenas 9 — ESCUTA, ESTRATEGIA, PONTO, TASKHUB, BALCAO, DASHBOARD, VOLUNTARIOS, AGENTES, ACERVO, AUDITORIA ausentes | ✅ **CORRIGIDO**: Catálogo expandido para 20 módulos |
| C05 | 🔴 CRÍTICO | Backend | `ctrl_pessoas_obter` sem binding GAS.pessoas.obter — colaborador não podia ser aberto individualmente | ✅ **CORRIGIDO**: `GAS.pessoas.obter` adicionado |

## 🟠 ACHADOS ALTOS

| ID | Severidade | Área | Descrição | Status |
|----|-----------|------|-----------|--------|
| A01 | 🟠 ALTO | Backend | `ctrl_ativos_concluir_manutencao` e `ctrl_ativos_registrar_uso` sem binding GAS.ativos | ✅ **CORRIGIDO**: GAP-02 e GAP-03 adicionados |
| A02 | 🟠 ALTO | Backend | `ctrl_pessoas_registrar_desligamento` sem binding GAS.pessoas | ✅ **CORRIGIDO**: GAP-06 adicionado |
| A03 | 🟠 ALTO | Backend | `ctrl_rh_solicitar_ajuste_ferias` sem binding GAS.rh | ✅ **CORRIGIDO**: GAP-07 adicionado |
| A04 | 🟠 ALTO | UX | Modais sem animação de entrada — sensação de corte abrupto | ✅ **CORRIGIDO**: `@keyframes modalEntrar .22s` + `backdrop-filter:blur(4px)` adicionados a `_abrirModalSimples` |
| A05 | 🟠 ALTO | Integração | EventBus emite eventos mas tarefas automáticas nunca eram criadas | ✅ **CORRIGIDO**: TarefaEngine.criarAutomatica ativado para 4 cenários |
| A06 | 🟠 ALTO | Isolamento | Menu sidebar não filtrava por módulo ativo | ✅ FALSO POSITIVO — `_reconstruirMenu` (linha 16408) já filtra corretamente por `modulosAtivos` |
| A07 | 🟠 ALTO | Backend | `ctrl_ativos_categorias` sem binding GAS.ativos | ✅ **CORRIGIDO**: GAP-04 adicionado |

## 🟡 ACHADOS MÉDIOS

| ID | Severidade | Área | Descrição | Status |
|----|-----------|------|-----------|--------|
| M01 | 🟡 MÉDIO | UX | Overlay sem `backdrop-filter:blur` | ✅ **CORRIGIDO**: blur(4px) adicionado em `_abrirModalSimples` |
| M02 | 🟡 MÉDIO | Backend | `ctrl_pessoas_autocomplete` sem binding | ✅ **CORRIGIDO**: GAP-08a adicionado |
| M03 | 🟡 MÉDIO | Backend | `ctrl_pessoas_por_funcao` sem binding | ✅ **CORRIGIDO**: GAP-08b adicionado |
| M04 | 🟡 MÉDIO | Isolamento | `RELATORIOS` no catálogo sem view correspondente | ✅ **CORRIGIDO**: removido do catálogo expandido |
| M05 | 🟡 MÉDIO | UX | Abas RH (10 abas) sem scroll horizontal no mobile | ⏳ Pendente |
| M06 | 🟡 MÉDIO | Integração | Reserva confirmada não criava tarefa de setup | ✅ **CORRIGIDO**: `reserva_engine.gs` agora chama `IntegracaoOrquestrador.onReservaConfirmada` |
| M07 | 🟡 MÉDIO | UX | Stats-grid Home com id excepcional | ✅ OK — documentado (correto por design) |

## ✅ PONTOS POSITIVOS CONFIRMADOS

| Área | O que está correto |
|------|-------------------|
| GAS.* namespace | 95%+ dos ctrl_* têm binding correto com fallback `err\|\|GAS._err` |
| Modais estáticos | `modal-overlay` com `background:rgba(15,23,42,.65)` — opacidade correta |
| `_abrirModalSimples` | `background:var(--surface)` — opaco e correto |
| FSM awareness | Maioria dos controllers de status conhece `FsmGuardian` |
| EventBus | Schema completo com status pendente/processado/erro + auditoria de integridade |
| ModulosRegistryService | `estaAtivo()` e `setAtivo()` implementados com lock + auditoria |
| Escuta | 100% dos ctrl_escuta_* têm binding GAS.escuta correspondente |
| Ponto Eletrônico | Todos os 14 endpoints de ponto têm binding GAS.ponto |
| Contratos | 28 endpoints com binding completo incluindo sub-recursos (rubricas, pessoal, indicadores) |

---

## Estrutura dos Arquivos de Teste

```
tests/
├── README.md                     ← este arquivo (resumo executivo)
├── backend/
│   ├── gas-namespace-map.md      ← mapa GAS.* vs ctrl_* com gaps
│   ├── persistencia-por-modulo.md
│   ├── fsm-transicoes.md
│   ├── eventos-automacoes.md     ← GAP CRÍTICO documentado
│   └── orcamento-guard.md
├── frontend-backend/
│   ├── ciclo-crud-por-modulo.md
│   └── filtros-busca.md
├── fluxos/
│   ├── F1-acao-cultural.md
│   ├── F2-escuta-institucional.md
│   └── ...
├── modais/
│   ├── padrao-canonico.md        ← padrão definido
│   └── inventario-modais.md
├── abas/
│   └── inventario-abas.md
├── modular/
│   ├── grafo-dependencias.md
│   └── isolamento-por-modulo.md
├── comparativo/
│   └── modais-v1-vs-v2.md
├── regressao/
│   └── regressoes-confirmadas.md
└── perfis/
    └── ...
```

---

## Legenda de Severidade

| Símbolo | Nível | Ação |
|---------|-------|------|
| 🔴 | CRÍTICO | Corrigir antes do próximo deploy |
| 🟠 | ALTO | Corrigir na próxima iteração |
| 🟡 | MÉDIO | Corrigir em sprint planejado |
| 🟢 | BAIXO | Melhoria futura |
| ✅ | OK | Confirmado correto |
| ⚠️ | AVISO | Monitorar |
