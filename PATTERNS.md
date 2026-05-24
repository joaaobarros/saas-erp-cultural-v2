# PATTERNS.md — Padrões Obrigatórios para Próximas Fases
> Documento de referência para garantir que novas fases de implementação sigam as regras de negócio, fluxo do sistema e convenções de UI/UX já estabelecidas.
> **Ler antes de iniciar qualquer nova fase.** Complementa `CLAUDE.md` com detalhes de implementação concreta.

---

## 📌 ÍNDICE

1. [Arquitetura de Módulo — Backend](#1-arquitetura-de-módulo--backend)
2. [Arquitetura de Módulo — Frontend](#2-arquitetura-de-módulo--frontend)
3. [RBAC — Controle de Acesso por Papel](#3-rbac--controle-de-acesso-por-papel)
4. [FSM — Máquina de Estados](#4-fsm--máquina-de-estados)
5. [Auditoria e Eventos](#5-auditoria-e-eventos)
6. [Portais e Links de Aprovação](#6-portais-e-links-de-aprovação)
7. [UI/UX — Convenções Visuais](#7-uiux--convenções-visuais)
8. [Modais](#8-modais)
9. [BtnGuard — Proteção de Botões](#9-btnguard--proteção-de-botões)
10. [prompt() / confirm() — Anti-padrão proibido](#10-prompt--confirm--anti-padrão-proibido)
11. [CSS — Classes e Variáveis Padronizadas](#11-css--classes-e-variáveis-padronizadas)
12. [Checklist de Nova Fase](#12-checklist-de-nova-fase)
13. [Exemplos de Referência](#13-exemplos-de-referência)

---

## 1. Arquitetura de Módulo — Backend

### Estrutura de arquivos por módulo

```
gas/src/modules/<nome>/
  <nome>_repository.gs   ← persistência JSON / Sheets
  <nome>_engine.gs       ← regras de negócio, FSM
  <nome>_controller.gs   ← exposição pública ctrl_*
```

### Repository — padrão obrigatório

```javascript
/**
 * @file <nome>_repository.gs
 * @layer Repository
 * @description CRUD para <Entidade> no JSON do Drive.
 * @depends DataGateway, Logger
 */
var NomeRepository = (function () {
  var _MODULO = 'nome_modulo';      // mesma chave de ABA_PARA_MODULO

  function prepararIndice() { /* garante aba/arquivo JSON */ }
  function listar(orgId) { return DataGateway.lerTodos(orgId, _MODULO); }
  function buscarPorId(orgId, id) { return DataGateway.lerPorId(orgId, _MODULO, id); }
  function salvar(orgId, obj) { return DataGateway.salvar(orgId, _MODULO, obj); }
  function remover(orgId, id) { return DataGateway.remover(orgId, _MODULO, id); }

  return { prepararIndice, listar, buscarPorId, salvar, remover };
})();
```

**Obrigatório**: Registrar `NomeRepository.prepararIndice()` em `setup.gs → inicializarSistema()`.

```javascript
// Em setup.gs, dentro de inicializarSistema():
if (typeof NomeRepository !== 'undefined' &&
    typeof NomeRepository.prepararIndice === 'function') {
  try { NomeRepository.prepararIndice(); } catch(e) {
    Logger.warn('setup', 'inicializarSistema', 'NomeRepository.prepararIndice: ' + e.message);
  }
}
```

### Engine — padrão obrigatório

```javascript
/**
 * @file <nome>_engine.gs
 * @layer Engine
 * @description Regras de negócio para <Entidade>.
 * @depends NomeRepository, FsmGuardian, SystemEvents, AuditoriaService
 */
var NomeEngine = (function () {

  function criar(orgId, dados, autorEmail) {
    var obj = {
      id:        gerarId(),
      status:    'rascunho',
      criadoPor: autorEmail,
      criadoEm:  new Date().toISOString(),
      // campos de domínio...
    };
    NomeRepository.salvar(orgId, obj);
    AuditoriaService.registrar('NOME_CRIADO', 'nome_modulo',
      { id: obj.id, por: autorEmail });
    SystemEvents.emit(EventosDoSistema.NOME_CRIADO, { orgId: orgId, id: obj.id });
    return obj;
  }

  function transitar(orgId, id, novoStatus, autorEmail, extras) {
    var obj = NomeRepository.buscarPorId(orgId, id);
    if (!obj) throw new Error('Entidade não encontrada: ' + id);
    // FsmGuardian SEMPRE antes de qualquer mudança de status
    FsmGuardian.assertValida('nome_tipo', obj.status, novoStatus, id, autorEmail);
    obj.status       = novoStatus;
    obj.atualizadoEm = new Date().toISOString();
    if (extras) Object.assign(obj, extras);
    NomeRepository.salvar(orgId, obj);
    AuditoriaService.registrar('NOME_STATUS_' + novoStatus.toUpperCase(), 'nome_modulo',
      { id: id, statusAnterior: obj.status, statusNovo: novoStatus, por: autorEmail });
    SystemEvents.emit(EventosDoSistema.NOME_ATUALIZADO, { orgId, id, status: novoStatus });
    return obj;
  }

  return { criar, transitar };
})();
```

### Controller — padrão obrigatório

```javascript
/**
 * @file <nome>_controller.gs
 * @layer Controller
 * @description Endpoints públicos do módulo <Nome>.
 * @depends NomeEngine, NomeRepository, AcessoService, GasResponse
 */

// Papéis com acesso ao módulo (ajustar por módulo)
var _PAPEIS_NOME = ['admin', 'superadmin', 'nome_gestor'];

function _ctxNome() {
  var email = Session.getActiveUser().getEmail();
  var acesso = AcessoService.verificar(email);
  if (!acesso || !acesso.orgId) throw new Error('Acesso não autorizado.');
  return { email: email, orgId: acesso.orgId, nivel: acesso.nivel };
}

function _nivelNome(email) {
  var a = AcessoService.verificar(email);
  return a ? a.nivel : null;
}

// ── LISTAR ────────────────────────────────────────────────────────
function ctrl_nome_listar(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctxNome();
    if (_PAPEIS_NOME.indexOf(_nivelNome(ctx.email)) === -1)
      throw new Error('Sem permissão para listar.');
    var lista = NomeRepository.listar(ctx.orgId);
    // aplicar filtros opcionais...
    return lista;
  }, 'ctrl_nome_listar');
}

// ── SALVAR (criar ou atualizar) ───────────────────────────────────
function ctrl_nome_salvar(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxNome();
    if (_PAPEIS_NOME.indexOf(_nivelNome(ctx.email)) === -1)
      throw new Error('Sem permissão para salvar.');
    if (!dados) throw new Error('Dados obrigatórios.');
    if (dados.id) {
      return NomeEngine.atualizar(ctx.orgId, dados, ctx.email);
    } else {
      return NomeEngine.criar(ctx.orgId, dados, ctx.email);
    }
  }, 'ctrl_nome_salvar');
}

// ── REMOVER ───────────────────────────────────────────────────────
function ctrl_nome_remover(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxNome();
    if (['admin', 'superadmin'].indexOf(_nivelNome(ctx.email)) === -1)
      throw new Error('Apenas administradores podem remover.');
    if (!dados || !dados.id) throw new Error('ID obrigatório.');
    NomeRepository.remover(ctx.orgId, dados.id);
    AuditoriaService.registrar('NOME_REMOVIDO', 'nome_modulo',
      { id: dados.id, por: ctx.email });
    return { removido: true };
  }, 'ctrl_nome_remover');
}

// ── MÉTRICAS ──────────────────────────────────────────────────────
function ctrl_nome_metricas() {
  return GasResponse.wrap(function () {
    var ctx = _ctxNome();
    var lista = NomeRepository.listar(ctx.orgId);
    return {
      total:   lista.length,
      ativos:  lista.filter(function(x) { return x.status === 'ativo'; }).length,
      // outros campos numéricos...
    };
  }, 'ctrl_nome_metricas');
}
```

---

## 2. Arquitetura de Módulo — Frontend

### Estrutura IIFE obrigatória

```javascript
var NomeUI = (function () {
  // ── Estado privado ────────────────────────────────────────────
  var _carregado   = false;
  var _lista       = [];
  var _editandoId  = null;

  // ── Inicialização (chamada pelo Router na primeira abertura) ──
  function aoAbrir() {
    _renderEstrutura();
    if (!_carregado) carregar();
  }

  // ── Render da estrutura estática ──────────────────────────────
  function _renderEstrutura() {
    var el = document.getElementById('mod-nome');
    if (!el) return;
    el.innerHTML = [
      '<div class="mod-header">',
      '  <h2>Título do Módulo</h2>',
      '  <button id="btn-nome-novo" class="btn-primario" onclick="NomeUI.abrirModal()">+ Novo</button>',
      '</div>',
      '<div id="nome-stats" class="stats-strip"></div>',
      '<div id="nome-lista" class="lista-container"></div>'
    ].join('');
  }

  // ── Carregar dados do backend ─────────────────────────────────
  function carregar() {
    var el = document.getElementById('nome-lista');
    if (el) el.innerHTML = '<p class="muted-text">⏳ Carregando…</p>';

    GAS.nome.listar({}, function (resp) {
      _carregado = true;
      if (!resp || !resp.ok) {
        if (el) el.innerHTML = '<p class="muted-text">Erro ao carregar dados.</p>';
        return;
      }
      _lista = resp.data || [];
      _renderLista();
      _carregarMetricas();
    }, function (e) {
      if (el) el.innerHTML = '<p class="muted-text">Erro: ' + (e.message || e) + '</p>';
    });
  }

  // ── Render da lista ───────────────────────────────────────────
  function _renderLista() {
    var el = document.getElementById('nome-lista');
    if (!el) return;
    if (!_lista.length) {
      el.innerHTML = '<div class="empty-state"><p>Nenhum registro encontrado.</p></div>';
      return;
    }
    el.innerHTML = _lista.map(function (item) {
      return [
        '<div class="item-card" id="nome-item-' + item.id + '">',
        '  <span class="badge-' + _badgeCor(item.status) + '">' + item.status + '</span>',
        '  <strong>' + _esc(item.nome) + '</strong>',
        '  <div class="item-acoes">',
        '    <button data-bg-skip="1" onclick="NomeUI.abrirModal(' + JSON.stringify(item.id).replace(/"/g,"'") + ')">Editar</button>',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');
  }

  // ── Métricas ──────────────────────────────────────────────────
  function _carregarMetricas() {
    GAS.nome.metricas({}, function (resp) {
      if (!resp || !resp.ok) return;
      var m  = resp.data;
      var el = document.getElementById('nome-stats');
      if (!el) return;
      el.innerHTML = [
        '<div class="stat-card"><div class="stat-valor">' + (m.total || 0) + '</div><div class="stat-label">Total</div></div>',
        '<div class="stat-card"><div class="stat-valor">' + (m.ativos || 0) + '</div><div class="stat-label">Ativos</div></div>'
      ].join('');
      if (typeof MetricsToggle !== 'undefined') MetricsToggle.init('nome-stats');
    });
  }

  // ── Modal de criação/edição ───────────────────────────────────
  function abrirModal(id) {
    _editandoId = id || null;
    // usar _abrirModalSimples ou construção manual — ver seção 8
    var box = _criarOverlay();
    box.innerHTML = _htmlFormulario();
    if (id) _preencherFormulario(id);
  }

  // ── Salvar via backend ────────────────────────────────────────
  function salvar() {
    var dados = _lerFormulario();
    if (!dados) return; // validação interna retornou false
    if (_editandoId) dados.id = _editandoId;

    BtnGuard.wrap('btn-nome-salvar', _editandoId ? 'Salvando…' : 'Criando…', function (done) {
      GAS.nome.salvar(dados, function (resp) {
        done();
        if (!resp || !resp.ok) { alert(resp && resp.error ? resp.error.message : 'Erro.'); return; }
        _fecharModal();
        _carregado = false;
        carregar();
      }, function (e) { done(); alert(e.message || 'Erro inesperado.'); });
    });
  }

  // ── Utilitários ───────────────────────────────────────────────
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _badgeCor(status) {
    var m = { ativo:'success', inativo:'muted', pendente:'warning',
               aprovado:'primary', recusado:'danger', rascunho:'secondary' };
    return m[status] || 'secondary';
  }

  // ── API pública ───────────────────────────────────────────────
  return { aoAbrir, carregar, abrirModal, salvar };
})();
```

### Registro no Router e Menu

```javascript
// Dentro do bloco de inicialização do App (linha ~350 de index.html)
Router.registrar('nome', 'Título do Módulo', NomeUI.aoAbrir);

// Em App._MODULOS_MENU (ou equivalente de sidebar)
{ id: 'nome', label: 'Título do Módulo', icone: '📋', papeis: ['admin', 'nome_gestor'] }
```

### Namespace GAS — binding obrigatório

```javascript
// Em index.html, na seção GAS.* (linha ~5678+)
GAS.nome = {
  listar:    function(p,ok,err){ google.script.run.withSuccessHandler(ok).withFailureHandler(err).ctrl_nome_listar(p); },
  salvar:    function(p,ok,err){ google.script.run.withSuccessHandler(ok).withFailureHandler(err).ctrl_nome_salvar(p); },
  remover:   function(p,ok,err){ google.script.run.withSuccessHandler(ok).withFailureHandler(err).ctrl_nome_remover(p); },
  metricas:  function(p,ok,err){ google.script.run.withSuccessHandler(ok).withFailureHandler(err).ctrl_nome_metricas(p); }
};
```

> **Regra crítica**: Toda função `ctrl_*` exposta no backend **deve** ter entrada correspondente no `GAS.*`.  
> Toda entrada no `GAS.*` **deve** ter a função `ctrl_*` implementada no backend.  
> Verificar consistência antes de qualquer deploy.

---

## 3. RBAC — Controle de Acesso por Papel

### Hierarquia de papéis (do menor ao maior)

```
leitura_publica < usuario < colaborador < gestor < financeiro < admin < superadmin
```

### Papéis por tipo de operação (convenção)

| Operação | Papéis mínimos |
|----------|---------------|
| Listar / visualizar | `usuario`, `colaborador`, `gestor`, `financeiro`, `admin`, `superadmin` |
| Criar / editar | `gestor` específico do módulo, `admin`, `superadmin` |
| Aprovar / transitar status crítico | `financeiro`, `admin`, `superadmin` |
| Remover / excluir permanentemente | `admin`, `superadmin` |
| Reenviar tokens / links de portal | `financeiro`, `admin`, `superadmin` |
| Configurações de org | `superadmin` |

### Verificação de acesso — boilerplate

```javascript
// Em todo controller:
function _ctxNome() {
  var email  = Session.getActiveUser().getEmail();
  var acesso = AcessoService.verificar(email);
  if (!acesso || !acesso.orgId) throw new Error('Acesso não autorizado.');
  return { email: email, orgId: acesso.orgId, nivel: acesso.nivel };
}

// Verificação dentro do GasResponse.wrap():
var ctx   = _ctxNome();
var nivel = _nivelNome(ctx.email);
if (_PAPEIS_NOME.indexOf(nivel) === -1)
  throw new Error('Sem permissão.');
```

> **Nunca** confiar em dados do cliente para determinar papel. Sempre verificar no backend via `AcessoService.verificar()`.

---

## 4. FSM — Máquina de Estados

### Definir transições no fsm_guardian.gs

Antes de criar um novo módulo com status rastreável, registrar as transições válidas:

```javascript
// Em fsm_guardian.gs — FSM_REGRAS:
'nome_tipo': {
  rascunho:    ['submetido'],
  submetido:   ['em_analise', 'cancelado'],
  em_analise:  ['aprovado', 'recusado'],
  aprovado:    ['encerrado'],
  recusado:    ['rascunho'],   // retrabalho permitido
  cancelado:   [],             // terminal
  encerrado:   []              // terminal
}
```

### Chamar FsmGuardian ANTES de qualquer mudança de status

```javascript
// ❌ ERRADO — muda status sem validar
obj.status = novoStatus;

// ✅ CORRETO — valida antes, depois muda
FsmGuardian.assertValida('nome_tipo', obj.status, novoStatus, obj.id, autorEmail);
obj.status = novoStatus;
```

### Checklist FSM por módulo

- [ ] Enum de status documentado no domain_model.md
- [ ] Transições registradas em `fsm_guardian.gs → FSM_REGRAS`
- [ ] Toda função de engine que muda status chama `FsmGuardian.assertValida()`
- [ ] Evento `SystemEvents.emit()` após cada transição
- [ ] Auditoria `AuditoriaService.registrar()` após cada transição
- [ ] Badge de status no frontend usa `_badgeCor(status)` com mapa correto

---

## 5. Auditoria e Eventos

### Eventos do sistema — convenção de nomes

```javascript
// Em events_constants.gs — adicionar ao EventosDoSistema:
NOME_CRIADO:            'nome.criado',
NOME_ATUALIZADO:        'nome.atualizado',
NOME_STATUS_APROVADO:   'nome.status.aprovado',
NOME_REMOVIDO:          'nome.removido'
```

### Padrão de evento

```javascript
// Emitir após toda operação de escrita bem-sucedida:
SystemEvents.emit(EventosDoSistema.NOME_CRIADO, {
  orgId:     orgId,
  id:        obj.id,
  numero:    obj.numero,
  por:       autorEmail,
  timestamp: new Date().toISOString()
});
```

### Padrão de auditoria

```javascript
// Registrar antes de retornar do engine:
AuditoriaService.registrar(
  'NOME_CRIADO',      // evento string — ALL_CAPS
  'nome_modulo',      // módulo — snake_case
  {                   // dados relevantes para rastreabilidade
    id:        obj.id,
    numero:    obj.numero,
    status:    obj.status,
    por:       autorEmail
  }
);
```

---

## 6. Portais e Links de Aprovação

### Fluxo de aprovação por email (TokenService)

```
1. Engine gera token: TokenService.gerar(orgId, tipo, id, email, ttlDias)
2. Token salvo em obj.tokenPortal + obj.tokenExpiracao
3. Email enviado com link: URL?secao=token_acao&token=TOKEN&acao=ACAO
4. Portal lê parâmetros em router.gs (server-side)
5. router.gs chama TokenService.validar() → encontra entidade → executa ação
```

### Fluxo de aprovação manual (portal_aprovacao.html)

```
1. Admin/gestor acessa: URL?secao=aprovacao&id=SOL-xxx
2. portal_aprovacao.html carrega ctrl_portal_getInfoAprovacao({id})
3. Mostra informações da entidade + botões Aprovar/Recusar
4. Decisão chama ctrl_portal_registrarAprovacao({id, decisao, motivo})
5. Controller chama Engine.aprovar() ou Engine.recusar() com FsmGuardian
```

### Novos portais — padrão obrigatório

```html
<!-- Em portal_novoportal.html -->
<script>
  var params    = <?= JSON.stringify(params) ?>;
  var orgConfig = <?= JSON.stringify(orgConfig) ?>;

  // 1. Carregar via backend real — NUNCA setTimeout/hardcoded
  google.script.run
    .withSuccessHandler(function(resp) { /* render */ })
    .withFailureHandler(function(e)    { /* mostrar erro */ })
    .ctrl_portal_nomeFuncao({ param: params.param });

  // 2. Ações via BtnGuard
  BtnGuard.wrap('btn-id', 'Processando…', function(done) {
    google.script.run
      .withSuccessHandler(function(r) { done(); /* resultado */ })
      .withFailureHandler(function(e) { done(); /* erro */ })
      .ctrl_portal_acaoFuncao({ id: params.id, dados: ... });
  });
</script>
```

> **Nunca** usar `setTimeout` para simular respostas em portais. Portais devem sempre fazer chamadas reais ao backend.

---

## 7. UI/UX — Convenções Visuais

### Estrutura padrão de view de módulo

```
┌─────────────────────────────────────────────────────┐
│  [Título do Módulo]              [+ Novo]  [Filtros] │  ← mod-header
├─────────────────────────────────────────────────────┤
│  [Stat 1]  [Stat 2]  [Stat 3]  [Stat 4]             │  ← stats-strip (MetricsToggle)
├─────────────────────────────────────────────────────┤
│  [Tab A]  [Tab B]  [Tab C]                          │  ← tab-bar (se houver abas)
├─────────────────────────────────────────────────────┤
│  Lista de itens / tabela / cards                    │  ← lista-container
└─────────────────────────────────────────────────────┘
```

### MetricsToggle — obrigatório para stats

```javascript
// Após renderizar o stats-strip:
if (typeof MetricsToggle !== 'undefined') MetricsToggle.init('id-do-stats');
```

> Exceção: `#home-stats` não usa MetricsToggle.

### Tab bar — estrutura e classes obrigatórias

```html
<div class="tab-bar">
  <button class="tab-btn tab-ativa" onclick="NomeUI.abrirTab('tab1')">Tab 1</button>
  <button class="tab-btn"          onclick="NomeUI.abrirTab('tab2')">Tab 2</button>
</div>
<div id="nome-tab-tab1" class="tab-content"></div>
<div id="nome-tab-tab2" class="tab-content oculto"></div>
```

```javascript
function abrirTab(id) {
  document.querySelectorAll('.tab-btn').forEach(function(b) {
    b.classList.toggle('tab-ativa', b.onclick.toString().includes("'" + id + "'"));
  });
  document.querySelectorAll('[id^="nome-tab-"]').forEach(function(el) {
    el.classList.toggle('oculto', el.id !== 'nome-tab-' + id);
  });
}
```

### Estados visuais padrão

| Estado | Classe / padrão |
|--------|----------------|
| Carregando | `<p class="muted-text">⏳ Carregando…</p>` |
| Lista vazia | `<div class="empty-state"><p>Nenhum registro.</p></div>` |
| Erro | `<p class="muted-text">Erro ao carregar dados.</p>` |
| Badge de status | `<span class="badge-success">ativo</span>` (ver tabela abaixo) |

### Mapa de cores de badge

| Status | Classe |
|--------|--------|
| ativo, aprovado, concluído, vigente | `badge-success` |
| pendente, em_analise, submetido | `badge-warning` |
| rascunho, inativo, suspenso | `badge-secondary` |
| recusado, cancelado, expirado, vencido | `badge-danger` |
| informativo, publicado | `badge-primary` |
| destaque, especial | `badge-accent` |
| genérico/neutro | `badge-info` |
| sem cor especial | `badge-muted` |

---

## 8. Modais

### Padrão de overlay + caixa

```javascript
function _abrirModal(conteudoHtml, largura) {
  largura = largura || '560px';
  var overlay = document.createElement('div');
  overlay.id = 'modal-nome-overlay';
  overlay.style.cssText = [
    'position:fixed;inset:0;z-index:1000;',
    'display:flex;align-items:center;justify-content:center;',
    'background:rgba(0,0,0,.52);'         // ← overlay SEMPRE escuro
  ].join('');

  var box = document.createElement('div');
  box.style.cssText = [
    'background:var(--surface);',         // ← caixa SEMPRE opaca
    'border-radius:12px;',
    'padding:28px 32px;',
    'width:90%;max-width:' + largura + ';',
    'max-height:85vh;overflow-y:auto;',
    'box-shadow:0 20px 60px rgba(0,0,0,.25);'
  ].join('');

  box.innerHTML = conteudoHtml;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // Fechar ao clicar fora
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) _fecharModal();
  });
}

function _fecharModal() {
  var el = document.getElementById('modal-nome-overlay');
  if (el) el.remove();
}
```

### Regras absolutas para modais

- `background:var(--surface)` na **caixa** — nunca `var(--surface1)` (variável não definida = transparente)
- `background:rgba(0,0,0,.52)` no **overlay** — nunca abaixo de `.4` de opacidade
- Fechar com ESC: `document.addEventListener('keydown', function(e){ if(e.key==='Escape') _fecharModal(); })`
- Fechar ao clicar fora: `if (e.target === overlay) _fecharModal();`
- Todo botão assíncrono dentro do modal deve usar `BtnGuard.wrap()`

---

## 9. BtnGuard — Proteção de Botões

### Uso obrigatório

```javascript
// ✅ Toda ação assíncrona:
BtnGuard.wrap('btn-salvar', 'Salvando…', function (done) {
  GAS.nome.salvar(dados, function (resp) {
    done();
    // tratar sucesso
  }, function (e) {
    done();
    // tratar erro
  });
});

// ✅ Botão de navegação pura (não assíncrono):
<button data-bg-skip="1" onclick="NomeUI.abrirTab('aba')">Tab</button>

// ❌ PROIBIDO — chamar google.script.run diretamente sem BtnGuard:
document.getElementById('btn').onclick = function() {
  google.script.run.ctrl_nome_salvar(dados);
};
```

### Verificação de cobertura

```javascript
// Executar no console F12 após cada módulo implementado:
BtnGuard.auditar()  // deve retornar "✅ todos protegidos"
```

### Template HTML — include obrigatório

```html
<head>
  <?!= include('shared/btnguard'); ?>
  <!-- ... -->
</head>
```

---

## 10. prompt() / confirm() — Anti-padrão proibido

### Padrão obrigatório

```javascript
// ✅ CORRETO:
var _raw = prompt('Digite o valor:');
if (_raw === null) return;         // usuário cancelou
var valor = _raw.trim() || '';     // só agora o fallback

// ✅ CORRETO (confirm):
var _conf = confirm('Confirmar ação?');
if (!_conf) return;
```

### Anti-padrão proibido

```javascript
// ❌ ERRADO — || '' consome o null; if nunca executa:
var valor = prompt('Digite:') || '';
if (valor === null) return;         // ← NUNCA chega aqui

// ❌ ERRADO — mesmo problema:
if (confirm('Tem certeza?') || false) { ... }
```

---

## 11. CSS — Classes e Variáveis Padronizadas

### Variáveis CSS do `:root` (todas definidas em index.html)

```css
--primary    : #1a237e   /* azul escuro */
--accent     : #f50057   /* rosa/vermelho */
--surface    : #ffffff   /* fundo de card/modal — SEMPRE opaco */
--surface-bg : #f5f5f5   /* fundo da página */
--text       : #212121
--text2      : #616161
--border     : #e0e0e0
--success    : #2e7d32
--warning    : #f57f17
--danger     : #c62828
--info       : #01579b
```

> **Atenção**: `--surface1` **não existe** no `:root`. Usar `var(--surface)` nos modais.

### Classes de badge — todas definidas

```css
.badge-primary   { background:#e8eaf6; color:#1a237e; }
.badge-success   { background:#e8f5e9; color:#2e7d32; }
.badge-warning   { background:#fff8e1; color:#f57f17; }
.badge-danger    { background:#ffebee; color:#c62828; }
.badge-info      { background:#e1f5fe; color:#01579b; }
.badge-secondary { background:#f5f5f5; color:#616161; }
.badge-accent    { background:#fce4ec; color:#c2185b; }
.badge-muted     { background:#eeeeee; color:#9e9e9e; }
```

### Classes de estrutura — todas definidas

```css
.mod-header       /* header do módulo com título e ações */
.btn-primario     /* botão principal (azul) */
.stats-strip      /* faixa de métricas */
.stat-card        /* card individual de métrica */
.stat-valor       /* número da métrica */
.stat-label       /* legenda da métrica */
.tab-bar          /* barra de abas */
.tab-btn          /* botão de aba */
.tab-ativa        /* aba selecionada */
.tab-content      /* conteúdo de aba */
.lista-container  /* container da lista */
.item-card        /* card de item da lista */
.empty-state      /* estado de lista vazia */
.muted-text       /* texto secundário/loading */
.oculto           /* display:none */
.form-group       /* grupo de campo de formulário */
.form-label       /* label do campo */
.form-control     /* input/select/textarea */
```

> **Antes de usar qualquer classe**, verificar se está definida no `<style>` de `index.html`. Classes inexistentes não geram erro, mas o layout quebra silenciosamente.

---

## 12. Checklist de Nova Fase

### Backend

```
[ ] Criado <nome>_repository.gs com prepararIndice(), listar(), buscarPorId(), salvar(), remover()
[ ] Criado <nome>_engine.gs com toda lógica de negócio
[ ] Criado <nome>_controller.gs com GasResponse.wrap() em toda função pública
[ ] Toda ctrl_* tem RBAC via AcessoService.verificar()
[ ] Toda escrita tem AuditoriaService.registrar()
[ ] Toda transição de status tem FsmGuardian.assertValida() ANTES da mudança
[ ] Toda transição de status tem SystemEvents.emit() APÓS a mudança
[ ] FSM_REGRAS atualizado em fsm_guardian.gs
[ ] EventosDoSistema atualizado em events_constants.gs
[ ] NomeRepository.prepararIndice() registrado em setup.gs → inicializarSistema()
[ ] Função fase_XX_prepararIndice() global criada para execução manual no GAS Editor
```

### Frontend

```
[ ] Namespace GAS.nome.* definido em index.html (listar, salvar, remover, metricas)
[ ] Toda entrada GAS.* tem ctrl_* correspondente no backend
[ ] Toda ctrl_* do backend tem GAS.* correspondente no frontend
[ ] NomeUI = (function(){...})() com aoAbrir(), carregar(), abrirModal(), salvar()
[ ] Router.registrar('nome', 'Título', NomeUI.aoAbrir) adicionado
[ ] Entrada no App._MODULOS_MENU com papeis corretos
[ ] aoAbrir() não recarrega se _carregado = true
[ ] Stats-strip com MetricsToggle.init()
[ ] Todos os botões assíncronos com BtnGuard.wrap()
[ ] Botões de navegação com data-bg-skip="1"
[ ] Todos os modais com background:var(--surface) e overlay rgba(0,0,0,.52)
[ ] Nenhuma chamada google.script.run direta (sempre via GAS.*)
[ ] Nenhuma classe CSS usada sem definição correspondente
[ ] prompt()/confirm() com _raw separado e null-check antes do fallback
[ ] JSON.stringify(id).replace(/"/g,"'") em onclick com IDs string
```

### Testes e Deploy

```
[ ] clasp push bem-sucedido (sem erros de sintaxe)
[ ] clasp deploy com deploymentId fixo
[ ] BtnGuard.auditar() retorna "✅ todos protegidos"
[ ] Console F12 sem TypeError / undefined
[ ] CRUD completo funcional (criar, listar, editar, remover)
[ ] Transições de status funcionando (badge atualiza, Sheet persiste)
[ ] PROGRESS.md atualizado (checkboxes, "RETOMANDO AGORA?", Log)
[ ] git commit com mensagem "feat: Fase X.Y — ..."
```

---

## 13. Exemplos de Referência

### Módulos bem implementados para usar como base

| Módulo | Arquivo Backend | Arquivo Frontend (linha) | Complexidade |
|--------|----------------|--------------------------|--------------|
| **Contratos** | `modules/contratacoes/contratacoes_controller.gs` | `index.html:~6988` (ContratosDetailUI) | Alta (5 abas, FSM, tokens) |
| **Fontes de Recurso** | `modules/financeiro/financeiro_controller.gs` | `index.html` (FontesUI) | Média |
| **Reservas** | `modules/reservas/reservas_controller.gs` | `index.html` (ReservasUI) | Média (portal de aprovação) |
| **Alertas** | `modules/alertas/alertas_engine.gs` | `index.html` (AlertasUI) | Simples (read-only) |

### Portal bem implementado para usar como base

- **portal_aprovacao.html** — lê `params.id`, chama backend real, BtnGuard nas ações, estados: carregando / inválido / ação / resultado

### FSM bem definida para usar como referência

- **SolicitacaoReserva**: `submetida → em_analise → aprovada/recusada`
- **Contratacao**: `rascunho → submetida → em_analise → aprovada/recusada → encerrada`

---

> **Versão**: 2026-05-24 — gerado após auditoria completa do sistema (Fases 1–12.1)  
> **Próximas fases planejadas**: 11.2 Escuta Institucional, 11.3 Dashboards Reais, 11.4 RH Avançado, 12.2+
