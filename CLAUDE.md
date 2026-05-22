# CLAUDE.md — ERP Cultural SaaS v2
> Instruções obrigatórias para o Claude Code neste projeto.
> Lidas automaticamente a cada sessão. NUNCA ignorar.

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

#### Frontend (index.html)
- Toda chamada GAS → via namespace `GAS.*` (nunca `google.script.run` direto)
- Todo módulo → `var NomeUI = (function() { ... return { aoAbrir, carregar, ... }; })();`
- Toda rota → `Router.registrar(id, label, fn)` + `App._MODULOS_MENU`
- `aoAbrir()` → carregar dados apenas na primeira vez (`if (!_carregado) carregar()`)

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
