# CLAUDE.md — ERP Cultural SaaS v2
> Instruções obrigatórias para o Claude Code neste projeto.
> Lidas automaticamente a cada sessão. NUNCA ignorar.

---

## 📐 SKILL.MD — LEITURA OBRIGATÓRIA PARA DECISÕES ARQUITETURAIS

**Arquivo**: [`Skill.md`](Skill.md)

Ler `Skill.md` **antes de qualquer decisão arquitetural**, incluindo:

- Criar um novo módulo, engine, repositório ou serviço
- Refatorar código existente
- Escolher padrões de persistência, cache ou eventos
- Definir como módulos se comunicam entre si
- Planejar evolução do sistema (novas fases)
- Avaliar trade-offs de performance, observabilidade ou resiliência

### Por que ler Skill.md

O documento disseca a arquitetura de platform engineering da Atlassian (Jira, Confluence, Bitbucket em escala global) e mapeia cada padrão diretamente para o sistema CCBJ na **seção 7**. Os padrões já implementados e os gaps identificados estão listados lá.

### Padrões do Skill.md já presentes neste projeto

| Padrão | Onde está no v2 |
|--------|----------------|
| **Control Plane central** | `utils.gs → ABA_PARA_MODULO` + `DataGateway` |
| **Auth Sidecar** | `AcessoService.verificar()` chamado em todos os controllers |
| **Audit Logging** | `AuditoriaService.registrar()` em toda escrita |
| **Status rastreável** | FSMs via `FsmGuardian` + `SystemEvents.emit()` |
| **Lock com retry** | `data_layer.gs → modifyJSON()` com `LockService` |
| **Async-first** | `EventHandlerRegistry` + fila de eventos pendentes |
| **Self-service** | Portal público sem intervenção de admin |
| **Idempotência** | `gerarId()` + scripts de migração idempotentes |
| **Observabilidade** | `Logger` estruturado + `AuditoriaStore` |

### Gaps identificados no Skill.md para aplicar nas próximas fases

- **Cache por namespace** com invalidação seletiva (Fase 6+)
- **Logs em JSON estruturado** com contexto rico (Fase 6+)
- **Alertas por threshold** (Fase 10 — AlertasEngine já tem catálogo)
- **Feature flags via config_org.json** — habilitar módulos sem deploy
- **CQRS explícito** — separar `ctrl_*_listar` (leitura) de `ctrl_*_salvar` (escrita) com cache diferenciado
- **Snapshot de estado** antes de operações críticas (rollback robusto — Fase 4+)

> Antes de implementar qualquer um dos itens acima, ler a seção correspondente no `Skill.md` para usar o padrão de forma consistente com a arquitetura planejada.

---

## 🧪 AUDITORIA DE BUGS — OBRIGATÓRIA ANTES DE QUALQUER DEPLOY

> Diretriz adicionada após sessão de auditoria (2026-05-22) que identificou 5 bugs ativos no sistema.

Antes de executar `clasp push` / `clasp deploy` em **qualquer entrega ou fase**, o Claude DEVE realizar sistematicamente:

### A. Revisão de chamadas `prompt()` / `confirm()`

Toda chamada a `prompt()` ou `confirm()` deve:
1. Capturar o valor em variável separada: `var _raw = prompt('...');`
2. Checar `null` **antes** de qualquer fallback: `if (_raw === null) return;`
3. Só então aplicar fallback: `var val = _raw || '';`

> **Anti-padrão proibido**: `var x = prompt('...') || ''; if (x === null) return;`  
> O `|| ''` consome o `null` antes da checagem — o `if` nunca executa.

### B. Revisão de namespace `GAS.*` no frontend

Todo controller backend (`ctrl_*`) que tem contraparte no frontend **deve** ter entrada correspondente no objeto `GAS.*` em `index.html`. Checar especialmente:
- Operações de **atualizar/editar** (frequentemente omitidas)
- Que `salvar()` despacha para `criar` OU `atualizar` conforme `id` presente

### C. Revisão de CSS — classes usadas vs. definidas

Buscar no HTML todas as classes `badge-*`, `form-*` usadas e confirmar que existem regras CSS correspondentes no `<style>`.

### D. Revisão de IDs de DOM — consistência entre criação e busca

Quando um elemento é criado com ID derivado de dados (ex.: email sanitizado), a sanitização (`replace()`) deve usar **exatamente o mesmo padrão regex** em todos os lugares que geram ou buscam esse ID.

### E. Revisão de FSM — FsmGuardian em toda transição de status

Toda função que chama `*.atualizarStatus*()` ou equivalente **deve** chamar `FsmGuardian.transitar()` **antes**, com os parâmetros corretos de `(tipo, statusAtual, statusNovo, contexto)`. Verificar em especial funções `verificarAtrasos()`.

### F. Revisão de Modais — fundo NUNCA transparente

Todo modal criado no sistema (estático no HTML ou gerado dinamicamente via JS) deve ter fundo **opaco**. Regras:

1. **Caixa do modal** → `background: var(--surface)` ou `background: #ffffff`. **NUNCA** `var(--surface1)` sem antes confirmar que `--surface1` está definido no `:root`.
2. **Overlay/backdrop** → `background: rgba(0,0,0,.5)` ou mais escuro. Nunca abaixo de `.4` de opacidade.
3. **Ao criar qualquer novo modal** verificar visualmente que o conteúdo ao fundo **não aparece** através da caixa do modal.
4. **Variáveis CSS não definidas** resolvem como `transparent` silenciosamente — conferir sempre no `:root` se a variável existe antes de usá-la.

> **Anti-padrão proibido**: `background: var(--surface1)` quando `--surface1` não está declarado no `:root`. Use `var(--surface)` que está sempre definido.

> **Padrão correto para `_abrirModalSimples` e congêneres**:
> ```javascript
> box.style.cssText = 'background:var(--surface);border-radius:12px;...;box-shadow:0 20px 60px rgba(0,0,0,.25);';
> ```

### G. Revisão de Datas — formato pt-BR obrigatório em toda UI

Toda data exibida ao usuário **deve** usar o formato pt-BR (`DD/MM/AAAA`). **Nunca** exibir ISO cru (`AAAA-MM-DD`) em texto visível.

**Frontend (index.html):**
- Usar `fmtDataPtBR(valor)` — converte `YYYY-MM-DD` → `DD/MM/YYYY` (definida em `index.html:8722`)
- Para data + hora: `fmtDataPtBR(d.slice(0,10)) + ' ' + d.slice(11,16)`
- `toLocaleDateString` sempre com locale explícito `'pt-BR'` — nunca sem argumento ou com `'pt'`

**Backend (GAS):**
- Usar `formatarData(iso)` de `core/utils.gs` — retorna `dd/MM/yyyy HH:mm` via `Utilities.formatDate`
- `Utilities.formatDate(d, getOrgConfig().timezone, 'dd/MM/yyyy')` — **nunca** timezone hardcoded `'America/Fortaleza'`
- Campos de persistência/comparação interna continuam em ISO (`YYYY-MM-DD`) — a regra vale apenas para **output de UI**

> **Anti-padrão proibido**: `escaparHtml(obj.data||'—')` quando `obj.data` é ISO. Sempre passar por `fmtDataPtBR()` antes de renderizar.

### Checklist de auditoria (executar antes de cada deploy)

```
[ ] prompt()/confirm() — _raw separado, null-check antes do fallback
[ ] GAS.* namespace — todos os ctrl_* têm binding; editar despacha para atualizar
[ ] CSS — zero classes usadas sem definição correspondente no <style>
[ ] IDs de DOM — regex de sanitização idêntica em todos os pontos de uso
[ ] FsmGuardian.transitar() — chamado antes de toda atualizarStatus*()
[ ] Modais — caixa com background:var(--surface) opaco; overlay ≥ rgba(0,0,0,.4)
[ ] onclick em HTML — JSON.stringify(id) usa .replace(/"/g,"'") para IDs string
[ ] BtnGuard.auditar() — retorna "✅ todos protegidos"
[ ] Console F12 — zero TypeError / undefined
[ ] Datas — toda data visível ao usuário passa por fmtDataPtBR() ou formatarData(); sem ISO cru; sem timezone hardcoded
```

---

## 🔴 REGRAS ABSOLUTAS — APLICAM-SE A TODO CÓDIGO PRODUZIDO

### 1. DEPLOY OBRIGATÓRIO a cada fase ou correção

Após qualquer alteração em `gas/src/`, executar **sempre**:

```bash
cd gas
clasp push
clasp deploy \
  --deploymentId "AKfycbzVKQ8fEMBZquOytumFLsb3dIx3DuIZh1cFYe4ywFCoMUXSFewuhZCpy-V8fjLkbe_j" \
  --description "Fase X.Y — descrição"
```

**URL de produção** (verificar após cada deploy):
```
https://script.google.com/a/macros/idm.org.br/s/AKfycbzVKQ8fEMBZquOytumFLsb3dIx3DuIZh1cFYe4ywFCoMUXSFewuhZCpy-V8fjLkbe_j/exec
```

> ⚠️ **NUNCA** criar novo deployment. Usar sempre o `deploymentId` acima para manter a URL estável.

---

### 2. TESTES OBRIGATÓRIOS antes de encerrar qualquer fase

#### 2a. Testes no browser (simulação virtual obrigatória)

Antes de declarar uma fase concluída, simular mentalmente — e descrever explicitamente — o comportamento esperado no browser para cada operação implementada:

| Passo | O que verificar |
|-------|----------------|
| Abrir URL de produção | Página carrega sem erro 500; sidebar aparece |
| Navegar ao módulo | Clique no menu → view carrega → sem erros no console (F12) |
| Criar registro | Preencher formulário → Salvar → aparece na lista |
| Listar registros | Dados retornam; métricas batem com a lista |
| Editar registro | Abrir form com dados preenchidos → salvar → lista atualiza |
| Transição de status | Botão de mudança de status → badge atualiza → Sheet/JSON atualiza |
| Recarregar | F5 → estado persistido; nenhuma duplicação |
| Console F12 | Zero erros vermelhos; zero `TypeError`; zero `undefined` |

> Quando o Claude não pode abrir o browser diretamente, deve:
> 1. Descrever passo a passo o que **espera** ver em cada etapa
> 2. Apontar explicitamente os pontos de risco (ex.: IDs que podem não existir, callbacks que podem falhar)
> 3. Informar ao usuário quais passos precisam ser confirmados manualmente

#### 2b. Testes de backend (GAS Editor)

Antes de qualquer deploy, verificar no GAS Editor:

| Função | Resultado esperado |
|--------|-------------------|
| `fase1_*_prepararIndice()` | `{ok: true}` |
| `fase1_*_migrar*()` | `{importados: N, ignorados: 0}` |
| `ctrl_*_metricas()` | objeto com campos numéricos válidos |
| `ctrl_*_listar({})` | array (pode ser vazio, mas não erro) |

#### 2c. BtnGuard — auditoria obrigatória

Todo template HTML criado ou modificado deve:
1. Ter `<?!= include('shared/btnguard'); ?>` no `<head>`
2. Usar `BtnGuard.wrap(idOuElemento, 'Mensagem…', fn)` em TODO botão assíncrono
3. Marcar botões de navegação pura com `data-bg-skip="1"`
4. Nunca passar `null` como primeiro argumento de `BtnGuard.wrap()` — passar sempre um ID string ou elemento DOM

Ao final de cada fase, rodar no console do browser:
```javascript
BtnGuard.auditar()  // deve retornar "✅ todos protegidos"
```

---

### 3. PADRÕES DE CÓDIGO obrigatórios

#### Backend (Google Apps Script)
- Toda nova entidade → repositório + engine + controller (`ctrl_*`)
- Toda função de controller → `GasResponse.wrap(fn, 'nome_funcao')`
- Toda escrita → `AuditoriaService.registrar(evento, modulo, dados)`
- Toda transição de status → `FsmGuardian` + `SystemEvents.emit()`
- Toda nova fase → `fase1_*_prepararIndice()` global executável no GAS Editor
- `setup.gs / inicializarSistema()` → incluir chamada ao `prepararIndice()` de cada novo repositório
- **Datas em output de UI** → `formatarData(iso)` (`core/utils.gs`) ou `Utilities.formatDate(d, getOrgConfig().timezone, 'dd/MM/yyyy')`; **nunca** `'America/Fortaleza'` hardcoded

#### Frontend (index.html)
- Toda chamada GAS → via namespace `GAS.*` (nunca `google.script.run` direto)
- Todo módulo → `var NomeUI = (function() { ... return { aoAbrir, carregar, ... }; })();`
- Toda rota → `Router.registrar(id, label, fn)` + `App._MODULOS_MENU`
- `aoAbrir()` → carregar dados apenas na primeira vez (`if (!_carregado) carregar()`)
- **Datas em output de UI** → sempre `fmtDataPtBR(valor)` (definida em `index.html:8722`); `toLocaleDateString` sempre com `'pt-BR'`; nunca ISO cru em texto visível

#### Documentação
- Toda nova entidade → documentar schema em `docs/architecture/domain_model.md`
- Todo arquivo novo → header JSDoc com `@file`, `@layer`, `@description`, `@depends`
- PROGRESS.md → atualizar seção "⚡ RETOMANDO AGORA?" + log de sessão ao final de cada fase

---

### 4. SEQUÊNCIA OBRIGATÓRIA ao final de cada fase

```
1. clasp push
2. clasp deploy --deploymentId AKfycb... --description "Fase X.Y — ..."
3. [Descrever] simulação do smoke-test no browser
4. Atualizar PROGRESS.md:
   - Marcar checkboxes como [x]
   - Atualizar "⚡ RETOMANDO AGORA?" com próximo passo
   - Adicionar linha no "Log de Sessões"
   - Atualizar checklist BtnGuard
5. git add -A && git commit -m "feat: Fase X.Y — ..."
```

---

### 5. REFERÊNCIAS RÁPIDAS

| O que | Onde |
|-------|------|
| **URL de produção** | `https://script.google.com/a/macros/idm.org.br/s/AKfycbzVKQ8fEMBZquOytumFLsb3dIx3DuIZh1cFYe4ywFCoMUXSFewuhZCpy-V8fjLkbe_j/exec` |
| **DeploymentId** | `AKfycbzVKQ8fEMBZquOytumFLsb3dIx3DuIZh1cFYe4ywFCoMUXSFewuhZCpy-V8fjLkbe_j` |
| Progresso do projeto | `PROGRESS.md` |
| Modelo de domínio | `docs/architecture/domain_model.md` |
| Padrão de repositório | `gas/src/repositories/i_repository.gs` |
| Padrão de resposta GAS | `gas/src/shared/response.gs` (GasResponse.wrap) |
| FSM | `gas/src/core/services/fsm_guardian.gs` |
| Auditoria | `gas/src/core/services/auditoria_service.gs` |
| Eventos | `gas/src/core/events_constants.gs` |
| BtnGuard | `gas/src/shared/btnguard.html` |
