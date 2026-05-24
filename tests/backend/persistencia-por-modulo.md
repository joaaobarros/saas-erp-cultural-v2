# Auditoria de Persistência por Módulo

**Data**: 2026-05-24  
**Metodologia**: Inspeção dos controllers + engines por módulo  
**Padrão esperado**: `GasResponse.wrap` + `DataLayer`/repositório + `AuditoriaService` + `SystemEvents`

---

## Sumário Executivo

| Status | Módulos |
|--------|---------|
| ✅ Persistência completa | Ações, Reservas, Contratos, Escuta, Pessoas/RH, Solicitações |
| ⚠️ Persistência parcial | Tarefas (FSM não confirmado), Almoxarifado (sem binding GAS) |
| ❌ Gap crítico | Almoxarifado (ctrl_almox_salvar_item sem binding — novos itens não chegam ao backend) |
| ❓ Não verificado | Reuniões, Voluntários, Acervo, Estratégia, RECE |

---

## ✅ Módulo: Ações

### Leitura
- `ctrl_acoes_listar` → `AcaoRepository.listar(orgId, filtros)` com cache AppCache(120s) ✅
- `ctrl_acoes_obter` → `AcaoRepository.buscarPorId(orgId, id)` ✅
- `ctrl_acoes_metricas` → `AcaoEngine.obterMetricas(orgId)` com cache AppCache(120s) ✅
- `ctrl_acoes_painel` → `AcaoEngine.obterPainelIntegrado(acaoId, orgId)` ✅

### Escrita
- `ctrl_acoes_salvar` → `AcaoEngine.salvar(dados, email, orgId)` → invalida cache ✅
- `ctrl_acoes_mudar_status` → `AcaoEngine.mudarStatus(...)` → FSM + SystemEvents + Orquestrador + invalida cache ✅
- `ctrl_acoes_excluir` → `AcaoEngine.excluir(...)` + invalida cache ✅

### Padrões verificados
- GasResponse.wrap: ✅ todas as funções
- AcessoService.verificar: ✅ via _assertPodeEscrever / _assertPodeMudarStatus
- AuditoriaService: ✅ no engine (linha 326 acao_engine.gs)
- SystemEvents: ✅ no engine
- Cache invalidation: ✅ `AppCache.remove()` após escrita
- CQRS: ✅ leitura com cache diferenciado de escrita

**Veredicto**: ✅ REFERÊNCIA — padrão mais completo do sistema

---

## ✅ Módulo: Reservas de Espaço

### Leitura
- `ctrl_reservas_listar` → `ReservaEngine.listar(filtros, orgId)` — colaborador filtra por próprias reservas ✅
- `ctrl_reservas_metricas` → `ReservaEngine.metricas(orgId)` ✅
- `ctrl_reservas_verificar_disponibilidade` → `ReservaEngine.verificarDisponibilidade(...)` ✅

### Escrita
- `ctrl_reservas_criar` → `ReservaEngine.criar(dados, email, orgId)` → AuditoriaService + SystemEvents ✅
- `ctrl_reservas_confirmar` → `ReservaEngine.mudarStatus(id, 'confirmada', ...)` → FsmGuardian + Auditoria ✅
- `ctrl_reservas_iniciar` → `ReservaEngine.mudarStatus(id, 'em_uso', ...)` ✅
- `ctrl_reservas_concluir` → `ReservaEngine.mudarStatus(id, 'concluido', ...)` ✅
- `ctrl_reservas_bloquear` → `ReservaEngine.criarBloqueio(...)` — cancela conflitantes com Auditoria ✅

### Gap identificado
- `ctrl_reservas_confirmar` → salva com status='confirmada' mas **NÃO chama** `IntegracaoOrquestrador.onReservaConfirmada()` — tarefa de preparação de espaço nunca criada

**Veredicto**: ✅ Persistência correta | ⚠️ Automação desconectada (ver eventos-automacoes.md)

---

## ✅ Módulo: Contratos Financeiros (28 endpoints)

### Leitura completa verificada
- Listar contratos, metas, rubricas, pessoal, indicadores, aditivos, remanejamentos ✅
- Bindings GAS.contratos, GAS.metas, GAS.rubricas, etc. ✅

### Escrita
- Todos passam por `ContratosEngine.mudarStatus` → `FsmGuardian.validarTransicao` ✅
- `AuditoriaService.registrar` e `SystemEvents.emit` ✅
- `OrcamentoGuard` verificado antes de salvar rubricas ✅

### Padrões verificados
- GasResponse.wrap: ✅
- FsmGuardian: ✅ no engine
- AuditoriaService: ✅ no engine
- SystemEvents: ✅ no engine
- OrcamentoGuard: ✅

**Veredicto**: ✅ COMPLETO

---

## ✅ Módulo: Pessoas / RH (49+ endpoints)

### Funções verificadas
- `ctrl_pessoas_salvar` → `PessoasEngine.salvar(dados, email, orgId)` ✅
- `ctrl_pessoas_mudar_status` → `PessoasEngine.mudarStatus(id, novoStatus, ...)` → FsmGuardian ✅
- `ctrl_pessoas_registrar_desligamento` → engine com lógica específica ✅
- `ctrl_rh_solicitar_ferias` / `ctrl_rh_aprovar_ferias` → engine com FSM férias ✅
- `ctrl_rh_registrar_afastamento` → engine com FSM afastamento ✅
- `ctrl_pccs_salvar`, `ctrl_pccs_salvarCargo` → engine PCCS ✅

### Gaps identificados
- `ctrl_pessoas_obter` — **SEM binding GAS.pessoas.obter** (GAP-05 crítico — ver gas-namespace-map.md)
- `ctrl_pessoas_registrar_desligamento` — **SEM binding GAS.pessoas.registrarDesligamento** (GAP-06)
- `ctrl_rh_solicitar_ajuste_ferias` — **SEM binding GAS.rh.solicitarAjuste** (GAP-07)
- `ctrl_pessoas_autocomplete` — **SEM binding** (GAP-08)
- `ctrl_pessoas_por_funcao` — **SEM binding** (GAP-08)

**Veredicto**: ✅ Backend funcional | ❌ 5 funções sem acesso via frontend

---

## ✅ Módulo: Escuta Institucional

### Persistência verificada
- `ctrl_escuta_salvar` → `EscutaEngine.criarPesquisa` (novo) ou `EscutaRepository.salvarPesquisa` (atualizar) ✅
- `ctrl_escuta_mudar_status` → `EscutaEngine.ativarPesquisa` / `encerrarPesquisa` → FsmGuardian + Auditoria ✅
- `ctrl_escuta_registrar_resposta` → `EscutaEngine.registrarResposta(orgId, pesquisaId, email, respostas, anonima)` ✅
- `ctrl_escuta_excluir` → `EscutaRepository.excluirPesquisa` + `AuditoriaService.registrar` ✅
- `ctrl_escuta_resultados` → `EscutaEngine.calcularResultados` ✅

### Dados persistidos
- Pesquisas: JSON Drive via EscutaRepository ✅
- Respostas: JSON Drive (anônimas suportadas) ✅
- Auditoria: AuditoriaService.registrar em todas as escritas ✅

**Veredicto**: ✅ COMPLETO — melhor módulo de escuta organizacional do sistema

---

## ✅ Módulo: Solicitações / Contratações

### Persistência verificada
- `ctrl_contratacoes_salvar` → SolicitacaoEngine com FSM + Auditoria + SystemEvents ✅
- `ctrl_contratacoes_submeter` / `aprovar` / `rejeitar` → transições FSM completas ✅
- Fornecedores: CRUD completo ✅
- Habilitações: CRUD completo ✅

**Veredicto**: ✅ COMPLETO

---

## ❌ Módulo: Almoxarifado — GAP CRÍTICO

### Escrita não acessível
- `ctrl_almox_salvar_item` existe em `chaves_controller.gs:143` — backend funcional ✅
- **SEM binding `GAS.almox.salvarItem`** → frontend não pode criar novos itens ❌
- Workaround: usuário pode listar, emprestar, devolver — mas **não cadastrar** ✅

### Leitura — completa
- `GAS.almox.listarItens`, `listarEmprestimos`, `metricas`, `solicitar`, `aprovar`, `retirar`, `devolver`, `cancelar` ✅

### Impacto
- Novo item de almoxarifado = impossível via UI → requer acesso direto à planilha ❌

**Veredicto**: ❌ GAP CRÍTICO — cadastro bloqueado no frontend (ver gas-namespace-map.md GAP-01)

---

## ⚠️ Módulo: Ativos — 3 funções sem binding

### Backend funcional
- `ctrl_ativos_concluir_manutencao` → sem `GAS.ativos.concluirManutencao` ❌
- `ctrl_ativos_registrar_uso` → sem `GAS.ativos.registrarUso` ❌
- `ctrl_ativos_categorias` → sem `GAS.ativos.categorias` ❌

### Leitura — completa
- `GAS.ativos.listar`, `obter`, `salvar`, `metricas`, `status`, `manutencao`, `devolver`, `baixar` ✅

**Veredicto**: ⚠️ Backend correto | ❌ 3 operações inacessíveis via frontend

---

## 📊 Ponto Eletrônico — 14 endpoints completos

**Verificado anteriormente (tests/README.md)**:  
Todos os 14 endpoints de ponto têm binding GAS.ponto correspondente ✅

---

## Módulos Não Verificados em Detalhe

| Módulo | Controller | Engine | Status |
|--------|-----------|--------|--------|
| Reuniões | reuniao_controller.gs | reuniao_engine? | ❓ Não auditado |
| Balcão/RECE | balcao_controller.gs | balcao_engine? | ❓ Não auditado |
| Voluntários | voluntario_controller.gs | voluntario_engine? | ❓ Não auditado |
| Acervo | acervo_controller.gs | acervo_engine? | ❓ Não auditado |
| Estratégia | estrategia_controller.gs | estrategia_engine? | ❓ Não auditado |
| Público | publico_controller.gs | publico_engine? | ❓ Não auditado |
| Mapa Ação | mapa_acao_controller.gs | — | ❓ Não auditado |
| Agentes | agentes_controller.gs | agente_engine.gs | ✅ FSM confirmado |

---

## Padrão Canônico de Controller (referência)

```javascript
// ✅ Padrão ideal verificado no sistema
function ctrl_modulo_salvar(dados) {
  return GasResponse.wrap(function() {
    // 1. Autenticação
    var email = getEmailSessao();
    var orgId = getOrgConfig().orgId;
    _assertPodeEscrever(email);  // RBAC
    
    // 2. Delegação ao engine (engine faz FSM + Auditoria + SystemEvents)
    var resultado = ModuloEngine.salvar(dados, email, orgId);
    if (!resultado.ok) throw new Error(resultado.erro);
    
    // 3. Cache invalidation (se aplicável)
    AppCache.remove(_CACHE_KEY);
    
    return resultado;
  }, 'ctrl_modulo_salvar');
}
```

## Antipadrões detectados

1. **Controller chama FSM diretamente** (baixo risco): `ctrl_escuta_mudar_status` para estados cancelada/arquivada
2. **Controller sem delegação a engine** (médio risco): alguns controllers de Financeiro chamam repositórios diretamente sem passar por engine

---

## Status da Auditoria

- [x] Ações — verificado completamente
- [x] Reservas — verificado completamente
- [x] Contratos — verificado completamente  
- [x] Escuta — verificado completamente
- [x] Pessoas/RH — verificado completamente
- [x] Solicitações — verificado completamente
- [x] Almoxarifado — gap crítico documentado
- [x] Ativos — gaps documentados
- [x] Ponto — verificado (ver README)
- [ ] Reuniões — não auditado
- [ ] Voluntários, Acervo, Estratégia, RECE — não auditados
