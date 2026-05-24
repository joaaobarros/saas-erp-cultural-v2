# Comparativo V1 vs V2 — Modais

**Data**: 2026-05-24  
**Arquivos analisados**:
- V1: `sistema-gestao-cultural-ccbj/legacy/html/modais/modal_config.html`
- V1: `sistema-gestao-cultural-ccbj/legacy/Index.html` (CSS + animações)
- V2: `gas/src/frontend/index.html` (linhas 6900-6950 — `_abrirModalSimples`, `_abrirModalConfirmar`)
- V2: `gas/src/frontend/index.html` (linhas 16-100 — CSS :root)

---

## Correção de Achado C01

> ⚠️ **C01 era falso positivo**: A análise anterior (tests/README.md) classificou `--surface2` como "variável não definida" causando header transparente. **Está incorreto**: `--surface2: #f8fafc` está definido no `:root` (linha 35). O header do `_abrirModalConfirmar` é `#f8fafc` — cor opaca correta.

**C01 foi reclassificado de 🔴 CRÍTICO para ✅ OK** (ver atualização em README.md).

---

## Tabela Comparativa — Dimensões UX

| Dimensão | V1 | V2 | Veredicto |
|----------|----|----|-----------|
| **Overlay background** | `bg-slate-900/50` (Tailwind 50%) | `rgba(0,0,0,.5)` (50%) | 🟡 Equivalente |
| **Overlay blur** | `backdrop-blur-sm` ✅ | Ausente ❌ | **V1 Superior** |
| **Box background** | `bg-white` (#fff) | `var(--surface)` (#fff) | ✅ Equivalente |
| **Box border-radius** | `rounded-3xl` (24px) | `border-radius:12px` | **V1 Superior** (mais suave) |
| **Box shadow** | `shadow-2xl` | `0 20px 60px rgba(0,0,0,.25)` | 🟡 Equivalente |
| **Animação entrada** | `animate-fadeIn 0.3s` ✅ | Ausente ❌ | **V1 Superior** |
| **Tipografia header** | `font-black uppercase tracking-tighter` | `font-weight:700` (normal case) | **V1 Superior** (mais hierarquia) |
| **Inputs** | `bg-slate-50 border-none rounded-2xl focus:ring-purple-500` | `form-control` padronizado | V1 polido / V2 consistente |
| **Botão primário** | `bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl` | `.btn-primary` flat | V1 impacto visual / V2 sistemático |
| **Botão cancelar** | `hover:bg-slate-100 rounded-2xl` | `.btn-ghost` | ✅ V2 mais sistemático |
| **Densidade** | `max-w-md` fixo (448px) | `max-width:560px` | V2 mais espaçoso |
| **Design tokens** | Tailwind inline | CSS variables `:root` | **V2 mais sustentável** |
| **Responsividade** | `p-4` container | `width:95%` | 🟡 Equivalente |

---

## Código Comparado — Overlay

### V1 (Tailwind classes)
```html
<div id="modalConfig" 
     class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 
            flex items-center justify-center p-4">
  <div class="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
    <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
      <h3 class="text-lg font-black text-slate-800 uppercase tracking-tighter">CONFIGURAR</h3>
    </div>
```

### V2 (JS dinâmico — `_abrirModalSimples`)
```javascript
overlay.style.cssText = 
  'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;' +
  'display:flex;align-items:center;justify-content:center;';
box.style.cssText = 
  'background:var(--surface);border-radius:12px;max-width:560px;' +
  'width:95%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.25);';
// ❌ SEM: backdrop-filter:blur | animation | rounded-3xl
```

---

## Código Comparado — Animação

### V1
```css
/* Index.html linha 80 */
.animate-fadeIn { animation: fadeIn 0.3s ease-in-out; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* Aplicado ao modal: class="... animate-fadeIn" */
```

### V2
```javascript
// _abrirModalSimples — nenhuma animação adicionada
var box = document.createElement('div');
box.style.cssText = 'background:var(--surface);...';
// ❌ Nenhuma classe animate-fadeIn; nenhuma transition
// Resultado: modal aparece instantaneamente (corte abrupto)
```

> V2 TEM `@keyframes fadeIn` definido na linha 338 (`from opacity:0 translateY(6px)`),  
> mas a função `_abrirModalSimples` **nunca aplica** a animação ao `box`.

---

## Código Comparado — Inputs

### V1
```html
<input type="text" 
       class="w-full bg-slate-50 border-none rounded-2xl p-3 text-sm 
              focus:ring-2 focus:ring-purple-500 transition-all" 
       placeholder="Ex: Teatro Marcus Miranda">
```

### V2
```html
<input type="text" class="form-input" id="nome-campo">
<!-- form-input padronizado via DS — consistente entre módulos ✅ -->
```

---

## Código Comparado — Botões

### V1
```html
<!-- Cancelar -->
<button class="flex-1 py-3 text-sm font-bold text-slate-500 
               hover:bg-slate-100 rounded-2xl transition-all">CANCELAR</button>
<!-- Salvar -->
<button class="flex-1 py-3 text-sm font-bold text-white 
               bg-gradient-to-r from-purple-600 to-indigo-600 
               hover:from-purple-700 hover:to-indigo-700 
               rounded-2xl shadow-lg shadow-purple-200 transition-all">SALVAR ALTERAÇÕES</button>
```

### V2
```html
<button class="btn btn-perigo" id="btn-confirmar-acao">Confirmar</button>
<button class="btn btn-ghost">Cancelar</button>
<!-- Systematic DS classes — consistentes em todos os módulos ✅ -->
```

---

## Veredicto Final — Por Dimensão

### 🏆 V1 Superior em:
1. **Animação de entrada** — `fadeIn 0.3s ease` (V2 não tem, apesar de `@keyframes` estar definido)
2. **Overlay backdrop-blur** — `backdrop-blur-sm` (V2 usa rgba sem blur)
3. **Border-radius** — `rounded-3xl` (24px) vs `12px` → V1 mais orgânico e sofisticado
4. **Hierarquia tipográfica** — `font-black uppercase tracking-tighter` → presença visual mais forte
5. **Botões com gradiente** → mais impacto visual no CTA principal

### 🏆 V2 Superior em:
1. **Design tokens** — `var(--surface)`, `var(--border)` → sustentável e manutenível
2. **Sistema de classes** — `.btn-primary`, `.btn-ghost`, `.form-control` → consistência entre módulos
3. **Flexibilidade de largura** — `max-width:560px; width:95%` → responsivo por padrão
4. **Tema único** — qualquer mudança em `:root` afeta todos os modais simultaneamente
5. **Separação de responsabilidades** — JS gera estrutura, CSS estiliza

---

## Padrão Canônico Recomendado (Híbrido)

O sistema V2 deve manter sua base sistemática e acrescentar os pontos onde V1 é superior:

```javascript
// _abrirModalSimples — VERSÃO CANÔNICA CORRIGIDA
function _abrirModalSimples(html, selectId, selectVal) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-simples';
  overlay.style.cssText = [
    'position:fixed;inset:0;',
    'background:rgba(15,23,42,.65);',          // V2 atual ✅
    'backdrop-filter:blur(4px);',               // ← de V1 (ADIÇÃO)
    '-webkit-backdrop-filter:blur(4px);',        // ← compat Safari
    'z-index:9999;display:flex;',
    'align-items:center;justify-content:center;'
  ].join('');
  
  var box = document.createElement('div');
  box.className = 'modal-box-animar';           // ← classe para animação
  box.style.cssText = [
    'background:var(--surface);',              // ✅ opaco
    'border-radius:16px;',                      // ← ligeiramente maior (V1 era 24px)
    'max-width:560px;width:95%;',
    'max-height:90vh;overflow-y:auto;',
    'box-shadow:0 20px 60px rgba(0,0,0,.25);'
  ].join('');
  
  box.innerHTML = html;
  overlay.appendChild(box);
  overlay.addEventListener('click', function(e){ 
    if (e.target === overlay) overlay.remove(); 
  });
  document.body.appendChild(overlay);
  // ...
}
```

```css
/* CSS a adicionar — animação de entrada */
@keyframes modalEntrar {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.modal-box-animar {
  animation: modalEntrar 0.25s ease forwards;
}
```

---

## Impacto Operacional por Perfil

| Perfil | V1 | V2 atual | Com canônico |
|--------|----|---------|----|
| Gestor impaciente | Abre modal com fluidez (fadeIn) | Corte abrupto — sensação de tela quebrada | Fluido novamente |
| Coordenador visual | Blur no fundo = foco no modal | Fundo estático distrai | Blur devolvido |
| Usuário mobile | `max-w-md` pode cortar em 375px | `width:95%` melhor no mobile | 95% mantido ✅ |
| Admin em modo escuro | Sem dark mode V1 | Design tokens prontos para dark | Pronto quando implementado |

---

## Status
- [x] V1 modal_config.html analisado
- [x] V2 _abrirModalSimples / _abrirModalConfirmar analisados
- [x] Tabela comparativa completa
- [x] Padrão canônico definido
- [x] C01 revisado (falso positivo — --surface2 está definido)
- [ ] Padrão canônico aplicado no index.html (ITERAÇÃO 6)
