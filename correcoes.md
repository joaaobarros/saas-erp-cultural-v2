# Correções e Ajustes — Sistema de Gestão Cultural
> Arquivo unificado. Fonte única de verdade para pendências, bugs e melhorias.
> Atualizado em: 2026-05-31

---

## Status geral

- [ ] 1. Aba Financeiro — múltiplas correções
- [ ] 2. Superadmin — acesso ao primeiro acesso
- [ ] 3. Permissões e Aprovações — visibilidade e alertas
- [ ] 4. Aprovações — expansão do módulo
- [ ] 5. Memória de Cálculo — novos campos
- [ ] 6. Modais "Nova Meta" / "Editar Meta" — período de execução
- [ ] 7. Modal "Adicionar Pessoal" — dropdown de cargos
- [ ] 8. Integração Financeiro ↔ RH
- [ ] 9. Cálculo automático de salários — benefícios
- [ ] BUG-UI-01. Pulse Widget — inconsistência pergunta/escala

---

## 1. Aba Financeiro

### Problemas identificados

As informações dos setores não estão persistindo após salvamento. Além disso, o comportamento de colapso e a experiência de cadastro precisam de melhorias.

### Correções

- [ ] **1.1** Corrigir renderização visual do dropdown de setores (contraste texto/fundo; `color:var(--text)` e `background:var(--surface)` explícitos no select inline de `_renderMemTabela`).
- [ ] **1.2** Garantir contraste adequado em tema claro e escuro.
- [ ] **1.3** Corrigir persistência do campo `setor` na Memória de Cálculo — backend (`contratos_engine.gs → adicionarItemMemoriaRubrica`) deve incluir o campo `setor` no objeto `novoItem`.
- [ ] **1.4** Corrigir colapso pós-save de rubrica:
  - Capturar estado de expansão antes do reload (`_captureExpandState`).
  - Restaurar após re-render (`_restoreExpandState`).
  - Fechar apenas o formulário da rubrica salva; manter meta expandida.
- [ ] **1.5** Adicionar visualização read-only da Memória de Cálculo (botão "visibility" em `_renderRubricas` → modal com tabela read-only via `_verMemoria(r)`).
- [ ] **1.6** Transformar campo "Descrição" da Memória de Cálculo em `<textarea>` com auto-expand vertical.
- [ ] **1.7** Auto-fill "Quantidade de Meses" na rubrica a partir das datas de início/fim da meta correspondente.
- [ ] **1.8** Auto-fill "Quantidade de Meses" no modal de meta a partir das datas do contrato (`_obj.vigenciaInicio` / `_obj.vigenciaFim`). Campo `#cd-meta-qtd-meses` (read-only, calculado automaticamente).
- [ ] **1.9** Drag and drop para reorganização manual de metas (HTML5 Drag API + endpoint `ctrl_contratos_reordenarMetas`).
- [ ] **1.10** Revisar lógica do card "Valor em Aberto" — verificar se `valorAtivos` do backend representa valor previsto ou saldo real; ajustar fórmula/label.

---

## 2. Acesso do Superadmin à Página de Primeiro Acesso

### Problema identificado

O usuário Superadmin é automaticamente redirecionado para dentro do sistema após login, impossibilitando a revisão da página de primeiro acesso.

### Status

> **Botão "Visualizar Primeiro Acesso" JÁ EXISTE** no painel Admin (linha ≈ 1911 do index.html):  
> `window.open(url + '?secao=primeiro_acesso_preview', '_blank')`  
> O router.gs já serve a view preview com validação de papel admin/superadmin.

### Correções

- [ ] **2.1** Verificar visibilidade do card Admin onde o botão reside para usuário superadmin.
- [ ] **2.2** Implementar "Perfis Fantasma" — botão no painel Admin "Simular como [papel]" que abre nova aba com parâmetro `?simular_papel=colaborador` (ou `gestor`, `financeiro`, etc.). Seguir padrão do `_renderPrimeiroAcessoPreview` em `router.gs`.

---

## 3. Página de Permissões e Aprovações

### Problemas identificados

- Superadmin não consegue revisar permissões e aprovações (aba pode estar restrita ao módulo ESPACOS).
- Nenhum alerta/notificação para primeiro acesso pendente.
- Lista de aprovações não atualiza automaticamente.

### Correções

- [ ] **3.1** RBAC: remover restrição `modulo:'ESPACOS'` do item de menu `aprovacoes` (linha ≈ 20199); garantir visibilidade para `admin` e `superadmin` sempre.
- [ ] **3.2** Badge/notificação no boot: após `getBootstrap()`, verificar `_boot.aprovacoesPendentes` (ou chamar `GAS.acesso.contarPendentes()`); exibir badge no menu "Aprovações".
- [ ] **3.3** Adicionar aba "Permissões" ao `tab-bar` de `#view-aprovacoes`, listando usuários com acesso pendente via `GAS.acesso.listarPendentes()` (já existe em `acesso_service.gs`).
- [ ] **3.4** Botão de refresh já existe nas abas — verificar se carregarAcessos() retorna dados corretos para superadmin.

### Arquitetura do Módulo Central de Aprovações (IMPLEMENTACAO_CORRECAO_3.md — integrado)

> **Status atual**: Aprovações já cobre Reservas de Espaço, Primeiros Acessos e Veículos via `AprovacaoReservaUI`.  
> O módulo centralizado (`AprovacoesEngine`) é planejado para fases futuras.

**Schema de Aprovação** (para `aprovacoes.json` — fase futura):
```javascript
{
  id: "aprov_<uuid>",
  tipo: "primeiro_acesso|reserva|permissao|contratacao|outro",
  status: "pendente|aprovada|rejeitada|em_analise",
  solicitanteMail: "user@org.br",
  solicitanteNome: "João Silva",
  payload: { ...tipo-específico },
  solicitadoEm: "2026-05-28T10:30:00Z",
  analisadoPor: "admin@org.br",
  analisadoEm: "2026-05-28T11:00:00Z",
  motivoRejeicao: null,
  tags: ["primeiro_acesso", "urgente"],
  processoId: null
}
```

**Fluxo FSM**: `pendente → em_analise → aprovada/rejeitada`

**Dependências**:
- ✅ `AcessoService.verificar()` — já existe
- ✅ `AuditoriaService.registrar()` — já existe
- ✅ `NotificationEngine` — já existe
- ✅ `FsmGuardian` — já existe
- ❌ `AprovacoesEngine` — a criar em fase futura

---

## 4. Ajuste Conceitual — Aba de Aprovações

### Problema identificado

A aba "Aprovações" cobre: Reservas de Espaço, Primeiros Acessos, Veículos. Não cobre ainda: permissões, RH, solicitações internas.

### Correções

- [ ] **4.1** Adicionar aba "Permissões" (cf. item 3.3).
- [ ] **4.2** (Fase futura) Criar `AprovacoesEngine` centralizado com schema unificado que suporte todos os tipos de aprovação.
- [ ] **4.3** (Fase futura) Implementar alertas proativos: email ao superadmin quando novo acesso pendente; lembrete após 48h sem resposta.

---

## 5. Memória de Cálculo — Plano de Trabalho

### Status

> Os campos **Descrição**, **Setor** e **Tipo** JÁ EXISTEM no formulário de memória de cálculo.
> - Setor: dropdown dinâmico via `App.getBoot().setores`
> - Tipo: array `_MEM_TIPOS` com 8 opções

### Correções

- [ ] **5.1** Adicionar tipo "Serviço" ao `_MEM_TIPOS` (atualmente: Unidade, Hora técnica, Parcela, Mensalidade, Diária, Kit, Litros, Km).

**Lista completa esperada:**
- Unidade, Serviço, Hora técnica, Parcela, Mensalidade, Diária, Kit, Litros, Km

---

## 6. Modais "Nova Meta" e "Editar Meta"

### Status

> Os campos **Período de Início** (`#cd-meta-inicio`) e **Período de Fim** (`#cd-meta-fim`) JÁ EXISTEM com `type="date"` no modal de meta.

### Correções

- [ ] **6.1** Adicionar campo "Duração (meses)" (`#cd-meta-qtd-meses`, read-only) calculado automaticamente das datas do contrato — cf. item 1.8.
- [ ] **6.2** Validar coerência: `cd-meta-fim >= cd-meta-inicio`.

---

## 7. Modal "Adicionar Pessoal"

### Status

> O campo "Cargo" JÁ É um `<select>` dinâmico (`#pf-cargo`) populado via `GAS.rh.listarCargos()` → `ctrl_pccs_listarCargos()`.

### Correções

- [ ] **7.1** Verificar se `_popularSelectCargo()` é chamado ao abrir o modal de pessoal. Se não, corrigir.
- [ ] **7.2** Garantir que a busca/filtro funciona no select (pelo menos via browser nativo).

---

## 8. Integração Financeiro ↔ RH

### Problema identificado

Cadastro de pessoal no Financeiro está isolado do RH. Funcionários CLT não têm vínculo automático.

### Correções

- [ ] **8.1** Investigar estrutura atual: verificar se `Financeiro.pessoal` e `RH.colaboradores` compartilham mesmo identificador (email ou CPF).
- [ ] **8.2** Criar sincronização: ao salvar funcionário CLT no Financeiro, propagar dados básicos ao RH (ou vice-versa).
- [ ] **8.3** Evitar duplicidade: verificar existência antes de criar novo colaborador.

---

## 9. Correção do Cálculo Automático de Salários

### Problema identificado

Os benefícios não estão sendo calculados corretamente no cálculo automático salarial.

### Fórmula esperada

```
salário base
+ alimentação
+ plano de saúde
+ vale transporte
- desconto alimentação
= Custo Total Mensal
```

### Campos existentes

- `#pf-alimentacao`, `#pf-saude`, `#pf-transporte`, `#pf-desc-alimentacao` (linha ≈ 2638)
- `#pf-salario-total` (resultado exibido)

### Correções

- [ ] **9.1** Verificar função `_recalcSalario()` no `PessoasUI` — confirmar que usa todos os 4 campos.
- [ ] **9.2** Corrigir se necessário para: `total = base + alim + saude + vt - descAlim`.

---

## BUG-UI-01. Pulse Widget — inconsistência pergunta/escala

**Arquivo:** `gas/src/frontend/index.html` ≈ linha 6994  
**Dimensões afetadas:** demanda, vigor, dedicacao, absorcao, seguranca (todos usam Discordo→Concordo)

### Problema

`#pulse-dimensao` é renderizado em `font-size:14px; font-weight:800` como cabeçalho principal. O texto da dimensão (ex.: "Carga de trabalho") aparece em destaque em vez da afirmação, confundindo o usuário sobre o que está sendo perguntado.

### Correção (Opção A — recomendada)

- [ ] **BUG-UI-01.1** Mover `#pulse-dimensao` para chip secundário inline no cabeçalho:

```html
<!-- ANTES -->
<p style="margin:0;font-size:9px;font-weight:800;...">Uma pergunta rápida</p>
<p id="pulse-dimensao" style="margin:5px 0 0;font-size:14px;color:#fff;font-weight:800;..."></p>

<!-- DEPOIS -->
<p style="margin:0;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:rgba(255,255,255,.8);">
  Uma pergunta rápida
  <span id="pulse-dimensao" style="font-weight:400;text-transform:none;font-size:9px;opacity:.7;margin-left:4px;"></span>
</p>
```

---

## Checklist de auditoria pré-deploy

```
[ ] prompt()/confirm() — _raw separado, null-check antes do fallback
[ ] GAS.* namespace — todos os ctrl_* têm binding
[ ] CSS — zero classes usadas sem definição
[ ] IDs de DOM — regex de sanitização idêntica
[ ] FsmGuardian.transitar() — antes de toda atualizarStatus*()
[ ] Modais — background:var(--surface) opaco; overlay ≥ rgba(0,0,0,.4)
[ ] onclick em HTML — JSON.stringify(id) usa .replace(/"/g,"'")
[ ] BtnGuard.auditar() — retorna "✅ todos protegidos"
[ ] Console F12 — zero TypeError / undefined
```
