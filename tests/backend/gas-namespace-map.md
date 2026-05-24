# Mapa GAS.* vs ctrl_* — Análise de Cobertura

**Data**: 2026-05-24  
**Arquivo analisado**: `gas/src/frontend/index.html` (linha 6392–6890)  
**Metodologia**: grep de `function ctrl_*` em todos os controllers + grep de `GAS.*` no index.html

---

## Resumo de Cobertura

| Status | Quantidade |
|--------|-----------|
| ✅ ctrl_* com binding GAS.* correto | ~145 |
| ❌ ctrl_* SEM binding GAS.* | **8** |
| ⚠️ GAS.* aponta para ctrl_* diferente (alias) | 6 (intencionais) |
| 🚫 google.script.run direto fora do GAS.* | 0 confirmados |

---

## Gaps Identificados — ctrl_* SEM Binding GAS.*

### ❌ GAP-01 — `ctrl_almox_salvar_item`
**Arquivo**: `gas/src/modules/espacos/chaves_controller.gs:143`  
**Impacto**: Impossível cadastrar novo item no almoxarifado via frontend  
**Risco**: Gestão de estoque incompleta — itens só podem ser listados, não criados  
**GAS.almox tem**: listarItens, listarEmprestimos, metricas, solicitar, aprovar, retirar, devolver, cancelar  
**Falta**: `salvarItem: function(d,cb,err) { ... ctrl_almox_salvar_item(d) }`  
**Prioridade**: 🔴 CRÍTICO

### ❌ GAP-02 — `ctrl_ativos_concluir_manutencao`
**Arquivo**: `gas/src/modules/espacos/ativos_controller.gs:203`  
**Impacto**: Manutenção de ativo não pode ser concluída via UI — botão existe no frontend mas chama função JS local `_concluirManutencao` que provavelmente não conecta ao backend  
**GAS.ativos tem**: listar, obter, salvar, metricas, status, manutencao, devolver, baixar  
**Falta**: `concluirManutencao: function(id,cb,err) { ... ctrl_ativos_concluir_manutencao(id) }`  
**Prioridade**: 🟠 ALTO

### ❌ GAP-03 — `ctrl_ativos_registrar_uso`
**Arquivo**: `gas/src/modules/espacos/ativos_controller.gs:154`  
**Impacto**: Registro de uso de ativo (empréstimo interno) não acessível via frontend  
**Falta**: `registrarUso: function(d,cb,err) { ... ctrl_ativos_registrar_uso(d) }`  
**Prioridade**: 🟠 ALTO

### ❌ GAP-04 — `ctrl_ativos_categorias`
**Arquivo**: `gas/src/modules/espacos/ativos_controller.gs:96`  
**Impacto**: Selector de categorias no formulário de ativo provavelmente usa lista estática ou dados do bootstrap  
**Falta**: `categorias: function(cb,err) { ... ctrl_ativos_categorias() }`  
**Prioridade**: 🟡 MÉDIO

### ❌ GAP-05 — `ctrl_pessoas_obter`
**Arquivo**: `gas/src/modules/pessoas/pessoas_controller.gs:84`  
**Impacto**: Não é possível buscar um colaborador individualmente pelo ID via API frontend — abertura de form de edição pode depender de dados já carregados na lista  
**GAS.pessoas tem**: listar, salvar, metricas, meuNivel, mudarStatus, listarAfastamentos, salvarAfastamento...  
**Falta**: `obter: function(id,cb,err) { ... ctrl_pessoas_obter(id) }`  
**Prioridade**: 🔴 CRÍTICO

### ❌ GAP-06 — `ctrl_pessoas_registrar_desligamento`
**Arquivo**: `gas/src/modules/pessoas/pessoas_controller.gs:184`  
**Impacto**: Processo de desligamento de colaborador não acessível via UI — workaround via mudarStatus pode pular lógica de desligamento (cálculos, auditoria)  
**Falta**: `registrarDesligamento: function(d,cb,err) { ... ctrl_pessoas_registrar_desligamento(d) }`  
**Prioridade**: 🟠 ALTO

### ❌ GAP-07 — `ctrl_rh_solicitar_ajuste_ferias`
**Arquivo**: `gas/src/modules/pessoas/pessoas_controller.gs:262`  
**Impacto**: Solicitação de ajuste de férias não acessível via frontend  
**GAS.rh.ferias tem**: listarFerias, saldoFerias, solicitarFerias, aprovarFerias, recusarFerias, cancelarFerias, concluirFerias, reenviarFerias  
**Falta**: `solicitarAjuste: function(id,obs,cb,err) { ... ctrl_rh_solicitar_ajuste_ferias(id,obs) }`  
**Prioridade**: 🟠 ALTO

### ❌ GAP-08 — `ctrl_pessoas_autocomplete` e `ctrl_pessoas_por_funcao`
**Arquivo**: `gas/src/modules/pessoas/pessoas_controller.gs:119,141`  
**Impacto**: Seleção de colaboradores em outros módulos (tarefas, reservas, ações) pode depender de lista carregada no bootstrap em vez de busca dedicada — problema de escalabilidade com +50 colaboradores  
**Falta**:
```javascript
autocomplete: function(cb,err) { ... ctrl_pessoas_autocomplete() },
porFuncao:    function(fn,cb,err) { ... ctrl_pessoas_por_funcao(fn) }
```
**Prioridade**: 🟡 MÉDIO

---

## Aliases Intencionais (não são gaps)

| GAS.* | Aponta para | Motivo |
|-------|------------|--------|
| `GAS.acoes.atualizar` | `ctrl_acoes_salvar` | Controller de salvar lida com criar e atualizar via presença de `id` |
| `GAS.contratos.atualizar` | `ctrl_contratos_salvar` | Idem |
| `GAS.remanejamentos.atualizar` | `ctrl_remanejamento_salvar` | Idem |
| `GAS.fontesRecurso.atualizar` | `ctrl_fonte_recurso_salvar` | Idem |
| `GAS.aditivos.atualizar` | `ctrl_aditivo_salvar` | Idem |
| `GAS.exportacao.salicContrato` | `ctrl_exportacao_salic` | Alias de conveniência |

---

## Padrão GAS.* — Verificações de Segurança

### ✅ Uso correto do withFailureHandler
Todos os bindings usam o padrão:
```javascript
google.script.run
  .withSuccessHandler(cb)
  .withFailureHandler(err||GAS._err)
  .ctrl_modulo_funcao(params)
```

### ✅ Handler de erro global
```javascript
_err: function(e) { Toast.erro('Erro de comunicação: ' + (e.message || e)); }
```
Garante que erros não crasham silenciosamente.

### ✅ Fallback de parâmetros
A maioria usa `f||{}` para evitar `undefined` como parâmetro:
```javascript
listar: function(f,cb,err) { 
  google.script.run...ctrl_acoes_listar(f||{});
}
```

### ⚠️ AVISO: `ctrl_catalogo_remover` sem binding GAS
`ctrl_catalogo_remover` existe em `itens_despesa_service.gs:290` mas sem binding `GAS.catalogoSeplag.remover`.
GAS.catalogoSeplag tem: listar, adicionar, alterarAtivo, atualizar — mas não remover.
**Impacto baixo**: remoção de item do catálogo SEPLAG pode ser intencional apenas pelo admin.

---

## Ações Corretivas Necessárias

Adicionar ao bloco `GAS.*` no `index.html` (linhas ~6682-6891):

```javascript
// ── GAP-01: Almoxarifado — salvar item ──
// Dentro de GAS.almox, adicionar:
salvarItem: function(d,cb,err) { google.script.run.withSuccessHandler(cb).withFailureHandler(err||GAS._err).ctrl_almox_salvar_item(d); },

// ── GAP-02: Ativos — concluir manutenção ──
// Dentro de GAS.ativos, adicionar:
concluirManutencao: function(id,cb,err) { google.script.run.withSuccessHandler(cb).withFailureHandler(err||GAS._err).ctrl_ativos_concluir_manutencao(id); },

// ── GAP-03: Ativos — registrar uso ──
registrarUso: function(d,cb,err) { google.script.run.withSuccessHandler(cb).withFailureHandler(err||GAS._err).ctrl_ativos_registrar_uso(d); },

// ── GAP-04: Ativos — categorias ──
categorias: function(cb,err) { google.script.run.withSuccessHandler(cb).withFailureHandler(err||GAS._err).ctrl_ativos_categorias(); },

// ── GAP-05: Pessoas — obter individual ──
// Dentro de GAS.pessoas, adicionar:
obter: function(id,cb,err) { google.script.run.withSuccessHandler(cb).withFailureHandler(err||GAS._err).ctrl_pessoas_obter(id); },

// ── GAP-06: Pessoas — registrar desligamento ──
registrarDesligamento: function(d,cb,err) { google.script.run.withSuccessHandler(cb).withFailureHandler(err||GAS._err).ctrl_pessoas_registrar_desligamento(d); },

// ── GAP-07: RH — solicitar ajuste de férias ──
// Dentro de GAS.rh, adicionar:
solicitarAjuste: function(id,obs,cb,err) { google.script.run.withSuccessHandler(cb).withFailureHandler(err||GAS._err).ctrl_rh_solicitar_ajuste_ferias(id,obs||''); },

// ── GAP-08: Pessoas — autocomplete e por função ──
autocomplete: function(cb,err) { google.script.run.withSuccessHandler(cb).withFailureHandler(err||GAS._err).ctrl_pessoas_autocomplete(); },
porFuncao:    function(fn,cb,err) { google.script.run.withSuccessHandler(cb).withFailureHandler(err||GAS._err).ctrl_pessoas_por_funcao(fn); }
```

---

## Status da Auditoria

- [x] Mapeamento completo de GAS.* (6392–6890)
- [x] Identificação de todos os ctrl_* em todos os controllers
- [x] Cruzamento de cobertura
- [x] Identificação de 8 gaps com impacto e prioridade
- [ ] Correção no index.html (ITERAÇÃO 6)
