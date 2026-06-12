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

## 🗄️ COORDENAÇÃO COM O BANCO DE DADOS — OBRIGATÓRIA ANTES DE INICIAR QUALQUER FASE

> Toda nova entidade precisa de um lar definido **antes** de qualquer linha de código ser escrita. A ausência dessa decisão foi o que levou `ItensEstoque`, `SaldoEstoque` e `MovimentacoesEstoque` a ficarem no MASTER por meses, até a extração forçada em 2026-06-05.

### Passo 1 — Ler o mapa canônico do banco

Antes de criar qualquer repositório, aba, campo ou migração, abrir [gas/src/core/setup.gs](gas/src/core/setup.gs) e ler:

- **`PROP_SHEETS`** — quais planilhas existem e sua chave `SHEET_ID_*` em PropertiesService
- **`SCHEMA_ABAS`** — quais abas vivem em cada planilha

Esse mapa é a **fonte de verdade** da topologia de dados. Nunca criar ou mover entidades sem consultá-lo primeiro.

### Passo 2 — Decidir: nova planilha ou nova aba em planilha existente?

| Situação | Decisão correta |
|---------|----------------|
| Nova entidade que é o núcleo de um módulo autônomo | **Nova planilha** — adicionar chave em `PROP_SHEETS` + lista em `SCHEMA_ABAS` |
| Entidade auxiliar de um módulo já existente | **Nova aba** na planilha do módulo correspondente |
| Dados transversais (auditoria, eventos, config, logs) | **MASTER** |
| Dados de portal público / inscrições / pesquisas | **PUBLICO** |

> **Regra de ouro:** o MASTER é infraestrutura transversal, não domínio de negócio.
> Módulos com ciclo de vida próprio (Estoque, Financeiro, Equipes…) têm — ou devem ter — planilha dedicada.

**Topologia atual de planilhas** (conferir sempre em `setup.gs/PROP_SHEETS`):

| Chave | Conteúdo canônico |
|-------|------------------|
| `SHEET_ID_MASTER` | Configurações, logs, auditoria, agentes, voluntários, contratados |
| `SHEET_ID_ESTOQUE` | ItensEstoque, SaldoEstoque, MovimentacoesEstoque |
| `SHEET_ID_ACOES` | Ações, habilitações, acervo, parcerias, estratégia |
| `SHEET_ID_ESPACOS` | Reservas, ativos, manutenções, solicitações, veículos |
| `SHEET_ID_EQUIPES` | Funcionários, escalas, férias, holerites, ponto |
| `SHEET_ID_FINANCEIRO` | Contratos, rubricas, pagamentos, pregões |
| `SHEET_ID_REUNIOES` | Reuniões, atas, encaminhamentos |
| `SHEET_ID_COMUNICACAO` | Demandas, entregas, agenda RECE |
| `SHEET_ID_PUBLICO` | Inscrições, presenças, pesquisas, certificados |
| `SHEET_ID_ESCUTA` | Pesquisas de escuta, respostas, indicadores |
| `SHEET_ID_RELATORIOS` | CODIP, relatórios gerenciais, exportações |
| `SHEET_ID_PESSOAL` | Tarefas, demandas, processos |

### Passo 3 — Confirmar que a entidade não tem lar duplicado

Antes de criar uma nova aba ou planilha, verificar:
1. A entidade já existe em outro módulo com nome diferente?
2. O módulo destino já tem planilha própria que deve receber a nova aba?
3. É realmente uma entidade nova ou é uma visão de dados já existentes?

### Passo 4 — Atualizar `setup.gs` junto com o repositório

`PROP_SHEETS` e `SCHEMA_ABAS` são o contrato canônico. Qualquer nova planilha ou aba **deve** aparecer neles antes do primeiro `clasp push`. A função `verificarTodasAbas()` usa esse contrato para detectar inconsistências em produção.

Se for planilha nova, também:
- O repositório usa `PropertiesService.getScriptProperties().getProperty('SHEET_ID_NOVOMODULO')`
- `inicializarSistema()` em `setup.gs` chama o `prepararIndice()` do novo repositório

### Checklist de coordenação com o banco (executar antes de qualquer nova fase)

```
[ ] Li PROP_SHEETS + SCHEMA_ABAS em setup.gs — conheço a topologia atual
[ ] Defini o lar correto para cada nova entidade (nova planilha? aba existente? MASTER?)
[ ] Não adicionei abas de domínio de negócio ao MASTER
[ ] Registrei nova planilha/aba em PROP_SHEETS + SCHEMA_ABAS antes do clasp push
[ ] prepararIndice() do novo repositório está registrado em inicializarSistema()
[ ] Repositório usa a chave SHEET_ID_* correta (não SHEET_ID_MASTER por conveniência)
```

---

## 🧪 AUDITORIA DE BUGS — OBRIGATÓRIA ANTES DE QUALQUER DEPLOY

> Diretriz adicionada após sessão de auditoria (2026-05-22) que identificou 5 bugs ativos no sistema.

Antes de executar `clasp push` / `clasp deploy` em **qualquer entrega ou fase**, o Claude DEVE realizar sistematicamente:

### A. Diálogos nativos do browser — USO ABSOLUTAMENTE PROIBIDO

**`prompt()`, `confirm()` e `alert()` são PROIBIDOS em todo o sistema.** Esses diálogos nativos do browser quebram a identidade visual, bloqueiam a thread, não funcionam em iframes (como o GAS), e são substituídos por modais do próprio sistema.

#### Substitutos obrigatórios

| Nativo proibido | Substituto correto |
|---|---|
| `confirm('mensagem')` | `_abrirModalConfirmar({ titulo, mensagem, labelConfirmar, cb })` |
| `prompt('label')` | `_modalInput({ titulo, label, obrigatorio?, placeholder? }, cb)` |
| `alert('mensagem de erro')` | `Toast.erro('mensagem')` ou elemento inline de erro |
| `alert('mensagem de aviso')` | `Toast.aviso('mensagem')` |

#### Padrão correto para `_modalInput` (substituto de `prompt`)

```javascript
function recusar(id, btn) {
  _modalInput({titulo:'Recusar', label:'Motivo da recusa', obrigatorio:true}, function(_raw) {
    if (_raw === null) return;        // usuário cancelou o modal
    BtnGuard.wrap(btn, 'Recusando…', function(liberar) {
      GAS.modulo.recusar(id, _raw, function(r) { liberar(); ... });
    });
  });
}
```

#### Padrão correto para `_abrirModalConfirmar` com callback (substituto de `confirm`)

```javascript
function excluir(id) {
  _abrirModalConfirmar({
    titulo: 'Excluir Item', icone: 'delete_forever', corIcone: '#ef4444',
    mensagem: 'Excluir este item? Esta ação não pode ser desfeita.',
    labelConfirmar: 'Excluir',
    cb: function() {
      GAS.modulo.excluir(id, function(r) { ... });
    }
  });
}
```

> **Quando há BtnGuard com `done` callback que precisa ser liberado no cancelamento:**
> ```javascript
> function suprimirEmails(done) {
>   _abrirModalConfirmar({ ..., cb: function() { GAS.x.y(function(r){ done(); ... }); }, cbCancelar: function() { done(); } });
> }
> ```

> **Anti-padrão TERMINANTEMENTE PROIBIDO:**
> ```javascript
> // ❌ PROIBIDO — jamais usar em nenhum arquivo do sistema
> var x = prompt('Motivo:');
> var ok = confirm('Confirmar?');
> alert('Erro!');
> ```

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
[ ] Zero prompt()/confirm()/alert() — usar _modalInput()/_abrirModalConfirmar()/Toast.erro()
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
- **Diálogos** → **PROIBIDO** usar `prompt()`, `confirm()`, `alert()`. Sempre usar:
  - Coleta de texto → `_modalInput({titulo, label, obrigatorio?, tipo?, valorPadrao?}, cb)` (global em `index.html`)
  - Confirmação → `_abrirModalConfirmar({titulo, mensagem, labelConfirmar, icone, corIcone, cb, cbCancelar?})` (global em `index.html`)
  - Erros/avisos → `Toast.erro()` / `Toast.aviso()` / elemento inline de erro

#### Documentação
- Toda nova entidade → documentar schema em `docs/architecture/domain_model.md`
- Todo arquivo novo → header JSDoc com `@file`, `@layer`, `@description`, `@depends`
- PROGRESS.md → atualizar seção "⚡ RETOMANDO AGORA?" + log de sessão ao final de cada fase

---

### 4. SEQUÊNCIA OBRIGATÓRIA ao final de cada fase

> **Regra de ouro: Git ANTES do deploy GAS.** O git deve estar sempre igual ou à frente da versão deployada. Nunca deploar código que não está commitado.

> ⛔ **STOP ANTES DE QUALQUER COMANDO GIT OU CLASP:**
> Os passos 1 e 2 são pré-condições. Não existe `git add`, `git commit`, `clasp push` ou `clasp deploy` sem ambos os docs atualizados e staged no mesmo commit do código. O hook `pre-commit` bloqueia o commit se os docs estiverem ausentes.

```
1. Atualizar PROGRESS.md:                                     ← PRIMEIRO, ANTES DE QUALQUER GIT
   - Atualizar "⚡ RETOMANDO AGORA?" com número do deploy e resumo
2. Atualizar docs/auditoria/roteiro-auditoria.md:             ← SEGUNDO, ANTES DE QUALQUER GIT
   - Marcar bugs como CORRIGIDO nas 3 seções do roteiro
   - Atualizar seção HANDOFF da sessão atual
3. git add <código> PROGRESS.md docs/auditoria/roteiro-auditoria.md
   (tudo em um único git add — um único commit)
4. git commit -m "fix/feat: Fase X.Y — ..."
5. clasp push  (de dentro de /gas)
6. clasp deploy (deploymentId fixo)
7. [Descrever] simulação do smoke-test no browser
8. git push                                                    ← SEMPRE ao final
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
