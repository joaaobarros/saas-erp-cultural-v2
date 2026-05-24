# Padrão Canônico de Modais — V2 ERP Cultural

**Data**: 2026-05-24  
**Baseado em**: Análise comparativa V1 vs V2 + CLAUDE.md + testes de campo  
**Status**: Definido — aplicar na ITERAÇÃO 6

---

## Regras Absolutas (CLAUDE.md)

1. **Caixa do modal**: `background:var(--surface)` ou `background:#ffffff` — NUNCA `var(--surface1)`, `var(--surface2)` nem qualquer variável não confirmada no `:root`
2. **Overlay**: `background:rgba(0,0,0,.5)` ou mais escuro — mínimo `.4` de opacidade
3. **Opacidade verificada**: `var(--surface) = #ffffff`, `var(--surface2) = #f8fafc` → ambas opacas ✅

> **Nota**: `--surface2` (#f8fafc) está corretamente definido no `:root` — pode ser usado em headers sem problema.

---

## HTML Estrutural Canônico

```html
<!-- ESTÁTICO — modal definido no HTML -->
<div id="meu-modal" class="modal-overlay" style="display:none;">
  <div class="modal-box">
    <div class="modal-header">
      <h3 class="modal-titulo">Título do Modal</h3>
      <button class="modal-fechar" onclick="fecharMeuModal()" data-bg-skip="1">
        <span class="ms">close</span>
      </button>
    </div>
    <div class="modal-corpo">
      <!-- conteúdo -->
    </div>
    <div class="modal-rodape">
      <button class="btn btn-ghost" onclick="fecharMeuModal()" data-bg-skip="1">Cancelar</button>
      <button class="btn btn-primary" id="btn-salvar-meu" 
              onclick="BtnGuard.wrap('btn-salvar-meu','Salvando…',salvarMeuModal)">
        Salvar
      </button>
    </div>
  </div>
</div>
```

---

## CSS do Padrão Canônico

```css
/* Overlay — fundo escuro com blur */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);       /* ≥ 0.4 — nunca transparente */
  backdrop-filter: blur(4px);                /* fluido, como V1 */
  -webkit-backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

/* Caixa do modal */
.modal-box {
  background: var(--surface);               /* #ffffff — sempre opaco */
  border-radius: 16px;
  max-width: 560px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  animation: modalEntrar 0.25s ease forwards;
}

/* Animação de entrada */
@keyframes modalEntrar {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--surface2);             /* #f8fafc — opaco, levemente cinza */
}

.modal-titulo {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.modal-fechar {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--muted);
  display: flex;
  align-items: center;
  transition: color 0.15s;
}

.modal-fechar:hover { color: var(--text); }

/* Corpo */
.modal-corpo {
  padding: 20px;
}

/* Rodapé */
.modal-rodape {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  justify-content: flex-end;
}
```

---

## JS Canônico — `_abrirModalSimples` (versão corrigida)

```javascript
function _abrirModalSimples(html, selectId, selectVal) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-simples';
  overlay.style.cssText = [
    'position:fixed;inset:0;',
    'background:rgba(15,23,42,.65);',
    'backdrop-filter:blur(4px);',
    '-webkit-backdrop-filter:blur(4px);',
    'z-index:9999;display:flex;',
    'align-items:center;justify-content:center;padding:16px;'
  ].join('');
  
  var box = document.createElement('div');
  box.style.cssText = [
    'background:var(--surface);',
    'border-radius:16px;',
    'max-width:560px;width:100%;',
    'max-height:90vh;overflow-y:auto;',
    'box-shadow:0 20px 60px rgba(0,0,0,.25);',
    'animation:modalEntrar .25s ease forwards;'
  ].join('');
  
  box.innerHTML = html;
  overlay.appendChild(box);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
  
  if (selectId && selectVal !== undefined) {
    var sel = document.getElementById(selectId);
    if (sel) sel.value = selectVal;
  }
  
  return overlay;  // permite fechar programaticamente
}
```

---

## Tamanhos de Modal por Complexidade

| Complexidade | max-width | Exemplo |
|-------------|-----------|---------|
| Simples (≤4 campos) | 440px | Confirmar exclusão, mudar status |
| Médio (5-8 campos) | 560px | Criar ação, registrar afastamento |
| Complexo (tabelas, abas) | 760px | Modal reunião (5 abas), contrato detalhado |
| Painel lateral (slide-in) | 680px | Sol detalhe, painel de ação |

---

## Checklist por Modal

```
[ ] background:var(--surface) na caixa — NUNCA transparente
[ ] overlay rgba(15,23,42,.65) — ≥ 0.4 opacidade
[ ] backdrop-filter:blur(4px) — fluido e focado
[ ] animation:modalEntrar .25s — sem corte abrupto
[ ] border-radius:16px mínimo (ou 12px para modais compactos)
[ ] data-bg-skip="1" em botões de fechar/cancelar
[ ] BtnGuard.wrap() no botão de salvar/confirmar
[ ] Botão fechar no header com ícone Material Symbols "close"
[ ] Fechar ao clicar no overlay externo
[ ] z-index: 9999 (ou 1000+ para sub-modais)
[ ] max-height:90vh + overflow-y:auto para conteúdo longo
```

---

## Anti-padrões Proibidos

```javascript
// ❌ PROIBIDO — variável não confirmada no :root
box.style.background = 'var(--surface3)';

// ❌ PROIBIDO — overlay semi-transparente demais
overlay.style.background = 'rgba(0,0,0,.2)';

// ❌ PROIBIDO — sem animação (aparece abruptamente)
// (não adicionar nenhuma classe ou animation)

// ❌ PROIBIDO — botão de salvar sem BtnGuard
'<button onclick="salvarAlgo()">Salvar</button>'

// ❌ PROIBIDO — google.script.run direto (deve ir via GAS.*)
google.script.run.ctrl_modulo_salvar(dados);
```

---

## Integração com BtnGuard

```html
<!-- Botão assíncrono no modal -->
<button class="btn btn-primary" 
        id="btn-salvar-acao"
        onclick="BtnGuard.wrap('btn-salvar-acao','Salvando ação…', function(){
          GAS.acoes.salvar(dadosDoForm(), 
            function(r){ Toast.sucesso('Ação salva!'); fecharModal(); listarAcoes(); },
            function(e){ Toast.erro(e.message||'Erro ao salvar'); }
          );
        })">
  Salvar
</button>
```

---

## Status
- [x] Padrão definido
- [x] Anti-padrões mapeados
- [x] CSS completo especificado
- [x] JS `_abrirModalSimples` versão corrigida documentada
- [ ] Aplicado em `_abrirModalSimples` no index.html (ITERAÇÃO 6)
- [ ] Aplicado em `_abrirModalConfirmar` no index.html (ITERAÇÃO 6)
- [ ] CSS `.modal-overlay .modal-box` adicionado no index.html (ITERAÇÃO 6)
- [ ] `@keyframes modalEntrar` adicionado no index.html (ITERAÇÃO 6)
