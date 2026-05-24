# FSM — Transições de Status por Entidade

**Data**: 2026-05-24  
**Arquivos analisados**:
- `gas/src/modules/acoes/acao_engine.gs`
- `gas/src/modules/espacos/reserva_engine.gs`
- `gas/src/modules/financeiro/contratos_engine.gs`
- `gas/src/modules/contratacoes/solicitacao_engine.gs`
- `gas/src/modules/pessoas/pessoas_engine.gs`
- `gas/src/modules/escuta/escuta_engine.gs`
- `gas/src/modules/agentes/agente_engine.gs`
- `gas/src/modules/parcerias/parceria_engine.gs`

---

## Padrão Correto — Como deve funcionar

```javascript
// 1. Engine registra transições no init
FsmGuardian.registrar('tipo_entidade', { de: para, ... });

// 2. Engine valida antes de toda mudança de status
FsmGuardian.assertValida('tipo_entidade', statusAtual, novoStatus, contexto);
// ou FsmGuardian.transitar() / FsmGuardian.validarTransicao()

// 3. Engine persiste + emite evento
AuditoriaService.registrar(evento, modulo, dados);
SystemEvents.emit(tipo, payload);

// 4. Controller delega completamente ao engine — não chama FSM diretamente
```

---

## ✅ Ações Institucionais — FSM Completo

```
planejada → em_producao → em_execucao → concluida
   ↑─────── cancelada (qualquer estado)
```

**Arquivo**: `gas/src/modules/acoes/acao_engine.gs`

- `FsmGuardian.registrar('acoes', _TRANSICOES)` — linha 65 ✅
- `FsmGuardian.assertValida('acoes', acao.status, novoStatus, ...)` — linha 168 ✅
- `AuditoriaService.registrar(...)` — linha 326 ✅
- `SystemEvents.emit(tipoEvento, ...)` — linha 184 ✅
- `IntegracaoOrquestrador.onAcaoConcluida(...)` — linha 192 ✅ (único módulo que chama o orquestrador)
- `IntegracaoOrquestrador.onAcaoIniciada(...)` — linha 196 ✅

**Veredicto**: ✅ COMPLETO — padrão exemplar

---

## ✅ Reservas de Espaço — FSM Completo

```
pendente → confirmada → em_uso → concluida
   ↓           ↓
cancelada   cancelada
```

**Arquivo**: `gas/src/modules/espacos/reserva_engine.gs`

- `FsmGuardian.registrar('reservas', _TRANSICOES_RESERVA)` ✅
- `FsmGuardian.assertValida('reservas', reserva.status, novoStatus, id, autor)` — linha 382 ✅
- `AuditoriaService.registrar('RESERVA_CRIADA', ...)` — linha 264 ✅
- `AuditoriaService.registrar('RESERVA_STATUS_ALTERADO', ...)` — linha 386 ✅
- `SystemEvents.emit(SystemEventTypes.RESERVATION_CREATED, ...)` — linha 275 ✅
- `SystemEvents.emit(SystemEventTypes.RESERVATION_CANCELLED, ...)` — linha 396 ✅

**Gap detectado**: `IntegracaoOrquestrador.onReservaConfirmada()` **NUNCA é chamado** — está definido no orquestrador mas nenhum engine o invoca. Reserva confirmada não gera tarefa de preparação.

**Veredicto**: ✅ FSM correto | ⚠️ Orquestrador desconectado da reserva

---

## ✅ Contratos Financeiros — FSM Completo

```
rascunho → ativo → suspenso → encerrado/cancelado
```

**Arquivo**: `gas/src/modules/financeiro/contratos_engine.gs`

- `FsmGuardian.registrar('contratos', _TRANSICOES_CONTRATO)` — linha 84 ✅
- `FsmGuardian.validarTransicao('contratos', atual, novoStatus)` — linha 266 ✅
- `AuditoriaService.registrar(evento, 'financeiro', dados)` — linha 96 ✅
- `SystemEvents.emit(tipo, payload)` — linha 103 ✅

**Veredicto**: ✅ COMPLETO

---

## ✅ Solicitações de Contratação — FSM Completo

```
rascunho → submetida → análise → aprovada → habilitação_pendente → habilitado
   ↓                                ↓
cancelada                        inabilitado
```

**Arquivo**: `gas/src/modules/contratacoes/solicitacao_engine.gs`

- `FsmGuardian.registrar('solicitacao_status', _TRANSICOES_SOLICITACAO)` — linha 82 ✅
- `FsmGuardian.validarTransicao('solicitacao_status', atual, novoStatus)` — linha 121 ✅
- `AuditoriaService.registrar(evento, 'contratacoes', dados)` — linha 96 ✅
- `SystemEvents.emit(tipo, payload)` — linha 103 ✅

**Veredicto**: ✅ COMPLETO

---

## ✅ Colaboradores / RH — FSM Multi-entidade

```
colaborador:  vinculado → ativo → afastado → desligado
férias:       solicitada → aprovada → em_gozo → concluida / recusada / cancelada
afastamento:  ativo → encerrado / cancelado
```

**Arquivo**: `gas/src/modules/pessoas/pessoas_engine.gs`

- `FsmGuardian.registrar('colaborador_status', ...)` — linha 114 ✅
- `FsmGuardian.registrar('ferias_status', ...)` — linha 115 ✅
- `FsmGuardian.registrar('afastamento_status', ...)` — linha 116 ✅
- `FsmGuardian.validarTransicao('colaborador_status', atual, novoStatus)` — linha 142 ✅
- `FsmGuardian.validarTransicao('ferias_status', atual, novoStatus)` — linha 155 ✅
- `FsmGuardian.validarTransicao('afastamento_status', atual, novoStatus)` — linha 579 ✅

**Veredicto**: ✅ COMPLETO

---

## ✅ Escuta Institucional — FSM Com Tratamento Especial

```
rascunho → ativa → encerrada
   ↓        ↓
cancelada  cancelada
    ↓
arquivada
```

**Arquivo**: `gas/src/modules/escuta/escuta_engine.gs`

- `FsmGuardian.registrar('escuta', FSM)` — linha 106 ✅
- `FsmGuardian.transitar('escuta', ...)` em `ativarPesquisa` — linha 146 ✅
- `FsmGuardian.transitar('escuta', ...)` em `encerrarPesquisa` — linha 162 ✅
- `AuditoriaService.registrar('ESCUTA_ATIVADA', ...)` — linha 155 ✅
- `AuditoriaService.registrar('ESCUTA_ENCERRADA', ...)` — linha 173 ✅

**Atenção — Padrão misto no controller**:
Em `ctrl_escuta_mudar_status` (escuta_controller.gs), para os status `cancelada` e `arquivada`, o controller chama diretamente `FsmGuardian.transitar()` sem delegar ao engine. Para `ativa` e `encerrada`, delega ao engine. É um desvio menor do padrão mas funcionalmente correto.

**Veredicto**: ✅ FSM correto | ⚠️ Controller bypass para cancelada/arquivada (baixo risco)

---

## ✅ Agentes Culturais — FSM Completo

**Arquivo**: `gas/src/modules/agentes/agente_engine.gs`

- `FsmGuardian.registrar(_TIPO, _FSM)` — linha 36 ✅
- `FsmGuardian.transitar(_TIPO, agente.status, novoStatus, ...)` — linha 151 ✅

**Veredicto**: ✅ COMPLETO

---

## ✅ Parcerias — FSM Completo

**Arquivo**: `gas/src/modules/parcerias/parceria_engine.gs`

- `FsmGuardian.registrar(_TIPO, _FSM)` — linha 27 ✅
- `FsmGuardian.transitar(_TIPO, parceria.status, novoStatus, ...)` — linha 90 ✅

**Veredicto**: ✅ COMPLETO

---

## ⚠️ Tarefas — FSM Ausente no Controller, Parcial no Engine

**Arquivo**: `gas/src/modules/tarefas/tarefa_engine.gs`

- `FsmGuardian`: 5 ocorrências no engine — precisa verificação detalhada
- Controller (`tarefas_controller.gs`): **0 ocorrências** de FSM — todo controle delegado ao engine ✅ (correto)

**Não verificado em detalhe**: precisa confirmar que todas as transições de tarefa (pendente → em_andamento → concluida/cancelada) passam por FsmGuardian no engine.

**Veredicto**: ⚠️ Provavelmente correto mas não confirmado integralmente

---

## 🟠 Módulos SEM FSM identificado

| Módulo | Engine | Status FSM |
|--------|--------|-----------|
| Reuniões | reuniao_engine? | ❓ Não verificado |
| Balcão | balcao_engine? | ❓ Não verificado |
| Almoxarifado | chaves_engine? | ❓ Não verificado — empréstimos têm estados |
| Ativos | ativos_engine? | ❓ Não verificado — manutenção/ativo/baixado |
| Voluntários | voluntario_engine? | ❓ Não verificado |
| Estratégia | estrategia_engine? | ❓ Não verificado |
| RECE/Comunicação | rece_engine? | ❓ Não verificado |
| Acervo | acervo_engine? | ❓ Não verificado |

---

## Resumo de Status

| Entidade | FSM | Auditoria | Eventos | Orquestrador |
|----------|-----|-----------|---------|-------------|
| Ações | ✅ | ✅ | ✅ | ✅ |
| Reservas | ✅ | ✅ | ✅ | ❌ (not called) |
| Contratos | ✅ | ✅ | ✅ | ❌ (N/A) |
| Solicitações | ✅ | ✅ | ✅ | ❌ (N/A) |
| Colaboradores | ✅ | ⚠️ (engine) | ❓ | ❌ (N/A) |
| Férias | ✅ | ⚠️ (engine) | ❓ | ❌ (N/A) |
| Escuta | ✅ | ✅ | ✅ (parcial) | ❌ (N/A) |
| Agentes | ✅ | ❓ | ❓ | ❌ (N/A) |
| Parcerias | ✅ | ❓ | ❓ | ❌ (N/A) |
| Tarefas | ⚠️ | ❓ | ❓ | ❌ (N/A) |
| Reuniões | ❓ | ❓ | ❓ | ❌ (N/A) |
| Almox./Ativos | ❓ | ❓ | ❓ | ❌ (N/A) |

---

## Conclusão

- **Padrão geral**: ✅ FSMs são implementadas nos engines, não nos controllers — padrão correto
- **GasResponse.wrap**: 100% dos controllers auditados ✅
- **Gap principal**: `IntegracaoOrquestrador.onReservaConfirmada` **nunca é invocado** — gap orquestração, não gap FSM
- **Melhoria possível**: Tarefas e módulos secundários precisam de verificação FSM
