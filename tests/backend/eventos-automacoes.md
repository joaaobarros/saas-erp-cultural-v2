# Auditoria: Eventos e Automações — EventBus + IntegracaoOrquestrador

**Data**: 2026-05-24  
**Severidade máxima**: 🔴 CRÍTICO  
**Arquivos analisados**:
- `gas/src/engines/integracao_orquestrador.gs`
- `gas/src/core/event_bus_backend.gs`
- `gas/src/engines/event_handler_registry.gs` (a verificar)

---

## 🔴 ACHADO CRÍTICO — Automações do IntegracaoOrquestrador NÃO implementadas

### Descrição
O `IntegracaoOrquestrador` é o único ponto do sistema com conhecimento cross-domínio. Ele é chamado
corretamente pelos controllers após transições de estado. **Porém**, todas as consequências reais
estão comentadas como `// Fase N: ...` e nunca foram implementadas.

### Evidência de código

```javascript
// integracao_orquestrador.gs — função onReservaConfirmada
function onReservaConfirmada(reservaId, orgId, email) {
  try {
    SystemEvents.emit(SystemEventTypes.RESERVATION_CREATED, { ... }); // ✅ emite evento
    // Fase 2: TarefaEngine.criarAutomatica('reserva_aprovada', reservaId, orgId, email); // ❌ NUNCA roda
    // Fase 5: ActionEngine.associarRecurso(acaoId, 'reserva', reservaId, orgId);          // ❌ NUNCA roda
  } catch (e) { Logger.warn(...) }
}

// função onAcaoConcluida
function onAcaoConcluida(acaoId, orgId, email) {
  try {
    SystemEvents.emit(SystemEventTypes.ACTION_COMPLETED, { ... }); // ✅ emite evento
    // Fase 6: RelatoriosEngine.solicitarPreenchimentoCODIP(acaoId, orgId); // ❌ NUNCA roda
    // Fase 7: PublicoEngine.enviarPesquisaSatisfacao(acaoId, orgId);       // ❌ NUNCA roda
  } catch (e) { Logger.warn(...) }
}
```

### Automações prometidas vs. implementadas

| Automação | Evento Emitido | Consequência Real | Status |
|-----------|---------------|-------------------|--------|
| Reserva confirmada → tarefa de setup | ✅ RESERVATION_CREATED | `TarefaEngine.criarAutomatica` | ❌ Comentado (Fase 2) |
| Ação concluída → email CODIP | ✅ ACTION_COMPLETED | `RelatoriosEngine.solicitarPreenchimentoCODIP` | ❌ Comentado (Fase 6) |
| Ação concluída → pesquisa satisfação | ✅ ACTION_COMPLETED | `PublicoEngine.enviarPesquisaSatisfacao` | ❌ Comentado (Fase 7) |
| Ação iniciada → ativar linhas orçamento | ✅ ACTION_STARTED | `FinanceiroEngine.ativarLinhasOrcamento` | ❌ Comentado (Fase 4) |
| Contrato vencendo → tarefa renovação | ✅ CONTRACT_EXPIRED | `TarefaEngine.criarAutomatica('contrato_vencendo')` | ❌ Comentado (Fase 4) |
| Tarefa concluída → avançar processo | ✅ TASK_COMPLETED | `DemandaEngine.verificarAvanco` | ❌ Comentado (Fase 6) |
| Chave atrasada → tarefa + alerta | ✅ KEY_PROTOCOL_DELAYED | `TarefaEngine.criarAutomatica('chave_atrasada')` | ❌ Comentado (Fase 2) |
| Item não devolvido → alerta | ✅ ITEM_NOT_RETURNED | `TarefaEngine.criarAutomatica` | ❌ Comentado (Fase 2) |

### Impacto institucional
- **Produtor cultural**: cria ação, reserva espaço — **nenhuma tarefa de preparação é criada** automaticamente
- **RH**: colaborador cria reserva de sala — **nenhuma notificação para responsável**
- **Gestão**: contrato vence — **nenhuma tarefa de renovação gerada**
- **Operação**: chave não devolvida — **AlertasEngine pode gerar alerta via verredura, mas TarefaEngine nunca cria a tarefa**
- **Financeiro**: ação concluída — **CODIP precisa ser gerado manualmente** pelo operador

### Verificação do EventHandlerRegistry

O sistema tem `event_handler_registry.gs` como processador assíncrono (trigger de 30min). Precisa verificar se os handlers estão registrados para processar eventos pendentes. Os eventos são persistidos no EventLog com status 'pendente', mas sem handlers registrados, ficam acumulando indefinidamente.

**Ação necessária para Iteração 6**:
1. Implementar `TarefaEngine.criarAutomatica` para os 4 casos principais
2. Descommentar e implementar `onReservaConfirmada` → criar tarefa de prep
3. Descommentar e implementar `onAcaoConcluida` → email ou toast de CODIP pendente
4. Verificar EventHandlerRegistry e registrar handlers básicos

---

## ✅ EventBus — Implementação Sólida

O `SystemEvents` (event_bus_backend.gs) está corretamente implementado:

### Schema do EventLog
```
Colunas: [id, tipo, origem, entidade, entidade_id, usuario, timestamp, contexto, status, tentativas, ts_processado]
```

### Funcionalidades verificadas
- `emit(tipo, payload)` — persiste em Sheet com status 'pendente' ✅
- `getPendentes(max)` — retorna eventos não processados ✅
- `marcarProcessado(id)` — atualiza status para 'processado' ✅
- `incrementarTentativa(id, n)` — retry até 3 vezes, depois marca 'erro' ✅
- `validarIntegridade()` — detecta payloads incompletos, timestamps inválidos ✅
- `garantirAbaEventLog()` — idempotente, cria/migra schema ✅

### Normalização de payload
Suporte a aliases (actor→usuario, module→origem, payload→contexto) com avisos de governança sem bloquear.

### Status da auditoria EventBus
- [x] Schema validado
- [x] Retry logic verificado
- [x] Integridade de payload verificada
- [x] Migração de schema antigo (8→11 colunas) verificada

---

## 🟡 Verificação Pendente — EventHandlerRegistry

**Arquivo**: `gas/src/engines/event_handler_registry.gs`  
**Status**: NÃO lido nesta iteração — verificar na Iteração 2

O EventHandlerRegistry é o processador assíncrono de eventos (trigger de 30min). Precisa verificar:
- Quais handlers estão registrados?
- Handlers de RESERVATION_CREATED, ACTION_COMPLETED existem?
- Se existem, chamam as mesmas funções comentadas no orquestrador?

---

## Recomendação

**Prioridade 1 (Iteração 6)**:
Implementar pelo menos 2 automações críticas no `IntegracaoOrquestrador`:

```javascript
// 1. Reserva confirmada → tarefa de preparação
function onReservaConfirmada(reservaId, orgId, email) {
  SystemEvents.emit(SystemEventTypes.RESERVATION_CREATED, { ... });
  
  // Implementar: criar tarefa de preparação de espaço
  try {
    TarefaEngine.criarAutomatica({
      tipo: 'reserva_preparacao',
      entidadeId: reservaId,
      orgId: orgId,
      responsavel: email,
      titulo: 'Preparar espaço para reserva',
      prazo: _calcularPrazoPreparacao(reservaId, orgId)
    });
  } catch(e) {
    Logger.warn('orquestrador', 'criarTarefaReserva', e.message);
    // Não propaga erro — tarefa automática é best-effort
  }
}

// 2. Ação concluída → notificação CODIP pendente
function onAcaoConcluida(acaoId, orgId, email) {
  SystemEvents.emit(SystemEventTypes.ACTION_COMPLETED, { ... });
  
  // Toast/alerta para gestores: CODIP precisa ser gerado
  AlertasEngine.gerarAlerta({
    tipo: 'CODIP_PENDENTE',
    modulo: 'acoes',
    entidadeId: acaoId,
    orgId: orgId,
    mensagem: 'Ação concluída — gerar exportação CODIP no módulo Financeiro'
  });
}
```
