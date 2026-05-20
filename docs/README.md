# ERP Cultural SaaS v2 — Documentação

> **Status do projeto**: Fase 0 em andamento  
> **Referência de progresso**: [`../PROGRESS.md`](../PROGRESS.md)  
> **Plano de reconstrução completo**: [`../../Saas-ERP-cultural-main/docs/01_architecture/plano_reconstrucao.md`](../../Saas-ERP-cultural-main/docs/01_architecture/plano_reconstrucao.md)

---

## O que é este projeto

Reconstrução greenfield do ERP Cultural do CCBJ como plataforma SaaS modular.

O sistema legado (`Saas-ERP-cultural-main/`) serve exclusivamente como:
- Fonte de conhecimento de domínio
- Fonte de regras de negócio
- Fonte de fluxos operacionais descobertos
- Referência de utilitários testados

O novo sistema (`saas-v2/`) nasce com:
- Arquitetura limpa em camadas (Interface → Controller → Engine → Repository → Persistence)
- `orgId` em toda entidade (multi-tenancy real)
- FSMs registradas no FsmGuardian (zero transições arbitrárias)
- Single source of truth por domínio (zero dual-systems)
- EventBus reativo com handlers reais (não apenas log)
- ConfigService unificado (zero hardcodes de organização)

---

## Estrutura de Diretórios

```
saas-v2/
├── PROGRESS.md                        ← marcadores de evolução por fase
├── gas/
│   ├── appsscript.json                ← novo projeto GAS
│   ├── .clasp.json                    ← Script ID do deployment CCBJ
│   └── src/
│       ├── core/                      ← infraestrutura cross-cutting
│       │   ├── config.gs              ← getOrgConfig() com orgId
│       │   ├── config_service.gs      ← SistemaConfigService (facade unificado)
│       │   ├── setup.gs               ← schema de abas + verificarTodasAbas()
│       │   ├── utils.gs               ← utilitários + ABA_PARA_MODULO canônico
│       │   ├── logger.gs              ← Logger centralizado
│       │   ├── auth_session.gs        ← sessão e autenticação
│       │   ├── data_layer.gs          ← lerJSON/salvarJSON/modifyJSON (Drive)
│       │   ├── event_bus_backend.gs   ← SystemEvents.emit/getRecentes
│       │   ├── events_constants.gs    ← SystemEventTypes (70+ tipos)
│       │   ├── notification_engine.gs ← envio de emails/notificações
│       │   └── services/
│       │       ├── fsm_guardian.gs    ← árbitro único de FSMs
│       │       ├── data_gateway.gs    ← abstração Google Sheets
│       │       ├── auditoria_service.gs
│       │       ├── auditoria_store.gs
│       │       ├── cache_service.gs
│       │       ├── permissoes_service.gs
│       │       ├── usuarios_service.gs
│       │       ├── ia_service.gs
│       │       └── metrics_engine.gs
│       ├── repositories/
│       │   └── i_repository.gs        ← interface IRepository (contrato)
│       ├── engines/
│       │   ├── integracao_orquestrador.gs ← coordena consequências entre domínios
│       │   ├── event_handler_registry.gs  ← despacha handlers por tipo de evento
│       │   └── alertas_engine.gs          ← sistema de alertas centralizado
│       ├── controllers/
│       │   └── router.gs              ← doGet() roteamento interno/portal
│       ├── modules/                   ← organizados por bounded context
│       │   ├── admin/
│       │   ├── acoes/
│       │   ├── espacos/
│       │   ├── pessoas/
│       │   ├── financeiro/
│       │   ├── comunicacao/
│       │   ├── governanca/
│       │   ├── tarefas/
│       │   ├── inteligencia/
│       │   └── demandas/
│       ├── portal/                    ← contexto público (sem autenticação)
│       └── shared/
│           └── response.gs            ← GasResponse.wrap()
└── docs/
    ├── README.md                      ← este arquivo
    ├── architecture/
    │   ├── domain_model.md            ← bounded contexts, entidades, FSMs
    │   ├── layers.md                  ← arquitetura em camadas
    │   ├── persistence.md             ← estratégia de persistência
    │   ├── events.md                  ← modelo de eventos
    │   ├── multi_tenancy.md           ← estratégia multi-tenant
    │   ├── permissions.md             ← RBAC e permissões
    │   └── ux_architecture.md         ← arquitetura de UX
    ├── modules/
    │   └── (um .md por bounded context)
    └── decisions/
        └── (ADRs — Architecture Decision Records)
```

---

## Bounded Contexts (9 domínios)

| Contexto | Responsabilidade | Engine Principal |
|----------|-----------------|-----------------|
| **Ações** | Núcleo integrador — ciclo completo de atividades culturais | ActionEngine |
| **Espaços** | Reservas, chaves, ativos, almoxarifado | ReservaEngine, ChaveEngine, AtivosEngine |
| **Programação** | Habilitações, cessão de pauta, calendário | HabilitacoesEngine, CessaoPautaEngine |
| **Governança** | Reuniões, encaminhamentos, decisões | ReunioesEngine |
| **Pessoas** | Colaboradores, RH, escalas, contratados | PessoasEngine |
| **Financeiro** | Contratos, rubricas, pagamentos, CODIP | ContratosEngine, OrcamentoEngine |
| **Comunicação** | Demandas criativas, entregas, agenda RECE | ComunicacaoEngine |
| **Demandas Internas** | Pedidos de recursos, aprovações, processos | DemandaEngine |
| **Inteligência** | Métricas, KPIs, escuta, dashboards | MetricsEngine, EscutaEngine |
| **Portal Externo** | Cessão de pauta pública, inscrições, aprovações | CessaoPautaEngine (público) |

---

## Princípios de Dependência

```
Interface (doGet/doPost)
  ↓
Controllers (extrair email, validar permissão, deserializar)
  ↓
Engines (validar regras, orquestrar FSM, chamar repositório, emitir eventos)
  ↓
Repositories (persistir com orgId, sync índice)
  ↓
DataGateway/DataLayer (Google Sheets / Drive JSON)
```

**Nenhuma seta pode apontar upstream.**  
EventBus, AuditoriaService e FsmGuardian são cross-cutting (acessíveis por engines, nunca por interfaces).

---

## Referências Essenciais

- [Plano de Reconstrução](../../Saas-ERP-cultural-main/docs/01_architecture/plano_reconstrucao.md)
- [Manifesto](../../Saas-ERP-cultural-main/docs/00_vision/manifesto.md)
- [Princípios Estruturais](../../Saas-ERP-cultural-main/docs/00_vision/principles.md)
- [Glossário Ontológico](../../Saas-ERP-cultural-main/docs/00_vision/glossary.md)
- [Visão do Produto](../../Saas-ERP-cultural-main/docs/visao_produto.md)
