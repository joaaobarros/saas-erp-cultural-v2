Segue o arquivo `.md` com as correções e ajustes solicitados para inclusão no sistema de gestão cultural:

# Correções e Ajustes — Sistema de Gestão Cultural

## 1. Aba Financeiro

### Problema identificado

As informações dos setores não estão persistindo após salvamento
### Correção solicitada

* Corrigir renderização visual do dropdown de setores.
* Garantir contraste adequado entre texto e fundo.
* Validar funcionamento em tema claro e escuro (caso exista).
* Garantir acessibilidade mínima de leitura.
* Corrigir persistência das informações dos setores na aba Financeiro. Atualmente, após o salvamento, os dados não permanecem registrados corretamente.
* Ajustar comportamento de colapso após salvamento de rubricas. Atualmente, ao salvar uma rubrica, toda a meta é recolhida. O comportamento esperado é:
  - fechar apenas a rubrica salva;
  - manter a meta expandida;
  - permitir continuidade do cadastro das demais rubricas sem necessidade de reabrir toda a estrutura.
* Adicionar possibilidade de expandir/visualizar a lista de Memória de Cálculo sem entrar em modo de edição. Atualmente a visualização só ocorre ao editar o item.
* Transformar os campos de Descrição da Memória de Cálculo em campos de texto longo (textarea), com expansão vertical automática conforme aumento de conteúdo.
* No cadastro de rubricas, o campo “Quantidade de Meses” deve ser automaticamente preenchido com a duração calculada da meta, considerando:
  - data de início da meta;
  - data de fim da meta.
* No cadastro da meta, o campo “Quantidade de Meses” deve ser automaticamente preenchido com a duração calculada do contrato, considerando:
  - data de início do contrato;
  - data de fim do contrato.
* Adicionar funcionalidade de drag and drop para reorganização manual das metas.
* Revisar lógica do card “Valor em Aberto”. O comportamento atual aparenta não corresponder aos valores efetivamente cadastrados. Validar:
  - fórmula utilizada;
  - origem dos dados;
  - consistência entre total previsto, executado e saldo apresentado.

---

## 2. Acesso do Superadmin à Página de Primeiro Acesso

### Problema identificado

O usuário com perfil de Superadmin é automaticamente redirecionado para dentro do sistema após login, impossibilitando a revisão e validação da página de primeiro acesso.

### Correção solicitada

Criar mecanismo que permita ao Superadmin:

* Visualizar manualmente a página de primeiro acesso.
* Simular experiência de usuário em primeiro acesso.
* Revisar fluxos de cadastro e aprovação.
* Validar layout e funcionamento da página.
* Criar perfis de usuários fantasma para visualizar como o sistema opera de acordo com cada perfil e permissões

### Sugestão técnica

Adicionar:

* botão “Visualizar Primeiro Acesso”
  ou
* parâmetro de rota administrativa de simulação.

---

## 3. Página de Permissões e Aprovações

### Problemas identificados

* Superadmin não consegue revisar permissões e aprovações corretamente.
* Nenhum alerta/notificação apareceu indicando existência de primeiro acesso pendente para aprovação.

### Correções solicitadas

* Restaurar visualização completa das permissões para Superadmin.
* Corrigir fluxo de aprovações de primeiro acesso.
* Implementar alertas/notificações administrativas para novas solicitações pendentes.
* Garantir atualização em tempo real ou recarregamento automático da lista de aprovações.

---

## 4. Ajuste Conceitual — Aba de Aprovações

### Problema identificado

A aba “Aprovações” atualmente aparenta estar restrita apenas a reservas.

### Correção solicitada

Transformar a aba “Aprovações” em módulo amplo de aprovações internas do sistema, contemplando:

* reservas;
* primeiros acessos;
* permissões;
* validações administrativas;
* solicitações internas;
* fluxos de RH;
* demais aprovações existentes e futuras.

---

## 5. Memória de Cálculo — Plano de Trabalho

### Correção solicitada

Adicionar os seguintes campos obrigatórios na memória de cálculo do Plano de Trabalho:

### Novos campos

* **Descrição**
* **Setor**

  * tipo: dropdown;
  * opções vinculadas aos setores cadastrados no sistema.
* **Tipo**

  * opções:

    * unidade
    * serviço
    * hora técnica
    * parcela
    * mensalidade
    * diária
    * kit
    * litros
    * km

---

## 6. Modais “Nova Meta” e “Editar Meta”

### Correção solicitada

Adicionar dois campos de período de execução:

* Período de início
* Período de fim

### Requisitos técnicos

* Ambos devem utilizar datepicker.
* Permitir seleção facilitada de datas.
* Validar coerência entre início e fim.

---

## 7. Modal “Adicionar Pessoal”

### Problema identificado

Cadastro de pessoal não aproveita lista de cargos já cadastrados no sistema.

### Correção solicitada

Permitir que o campo “Cargo”:

* utilize dropdown;
* seja integrado à lista de cargos previamente cadastrados;
* permita busca/filtro;
* evite duplicidade manual de cargos.

---

## 8. Integração Financeiro ↔ RH

### Problema identificado

Cadastro de pessoal no Financeiro está isolado do RH.

### Correção solicitada

Criar integração direta entre módulos Financeiro e RH.

### Regras esperadas

* Funcionários CLT devem possuir vínculo automático entre os dois módulos.
* Alterações cadastrais devem refletir simultaneamente em RH e Financeiro.
* Evitar duplicidade de cadastro.
* Garantir consistência de dados trabalhistas e financeiros.

---

## 9. Correção do Cálculo Automático de Salários

### Problema identificado

Os benefícios não estão sendo calculados corretamente no cálculo automático salarial.

### Correção solicitada

O cálculo deve considerar:

* alimentação;
* plano de saúde;
* vale transporte;
* desconto alimentação.

### Fórmula esperada

Salário total deve considerar:

```text
salário base
+ alimentação
+ plano de saúde
+ vale transporte
- desconto alimentação
```

## [BUG-UI-01] Pulse Widget — inconsistência entre pergunta e escala

**Arquivo:** `gas/src/frontend/index.html`
**Localização:** `div#pulse-widget` (aproximadamente linha 6622)

### Problema
O widget exibe perguntas da dimensão **Demanda/Carga** formuladas como afirmações
(ex.: "Tenho pouco tempo para concluir meu trabalho.") que devem ser respondidas
em escala Discordo → Concordo.

Porém, o título do widget mostra o **label da dimensão** ("Carga de trabalho") como
se fosse a pergunta, e os rótulos da escala ficam sem contexto semântico.

### Causa raiz
O elemento `<p id="pulse-dimensao">` exibe o nome da dimensão logo acima da pergunta,
e o código que popula o widget usa `_pulseAtual.pergunta` para o texto da pergunta.
O banco de perguntas (escuta_engine.gs) armazena as perguntas como **afirmações**
adequadas para escala Likert — o problema está na exibição do label da dimensão
em posição de destaque, confundindo o usuário.

### Correção

**Opção A — Recomendada:** Remover o label da dimensão do cabeçalho do widget
(ou movê-lo para um chip secundário menor), deixando apenas a afirmação como foco.

No `index.html`, localizar o bloco dentro de `#pulse-widget`:

```html
<!-- ANTES -->
<div>
  <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);">Escuta Pulse</p>
  <p id="pulse-dimensao" style="margin:2px 0 0;font-size:11px;color:var(--primary);font-weight:600;"></p>
</div>
Substituir por:

<!-- DEPOIS -->
<div>
  <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);">
    Uma pergunta rápida
    <span id="pulse-dimensao" style="font-weight:400;text-transform:none;color:var(--primary);margin-left:4px;"></span>
  </p>
</div>
E garantir que o texto da pergunta seja a afirmação completa, não o label da dimensão.
O id="pulse-pergunta" já recebe _pulseAtual.pergunta — confirmar que esse campo
contém a afirmação (ex.: "Tenho pouco tempo para concluir meu trabalho.") e não o
label da dimensão ("Carga de trabalho").

Opção B — Alternativa rápida: Trocar os rótulos da escala de "Discordo / Concordo"
para rótulos neutros que funcionem tanto para afirmações quanto para perguntas abertas:

<!-- ANTES -->
<span style="font-size:10px;color:var(--text2);">Discordo</span>
<span style="font-size:10px;color:var(--text2);">Concordo</span>

<!-- DEPOIS -->
<span style="font-size:10px;color:var(--text2);">Nunca</span>
<span style="font-size:10px;color:var(--text2);">Sempre</span>
Ou, para "Carga de trabalho" especificamente:

<span style="font-size:10px;color:var(--text2);">Leve</span>
<span style="font-size:10px;color:var(--text2);">Pesada</span>
Nota: A Opção B é paliativa. A Opção A resolve a raiz do problema para todas
as dimensões, mantendo a consistência com o modelo JDC/UWES usado no engine.

Dimensões afetadas no banco de perguntas (escuta_engine.gs)
demanda → afirmações sobre pressão/carga (escala invertida)
vigor, dedicacao, absorcao → afirmações positivas UWES
seguranca → afirmações NR-1
Todas usam escala Discordo → Concordo — a Opção A resolve todas de uma vez.

## Procedimento Obrigatório para Claude

Claude deve:

* Confirmar individualmente cada item corrigido.
* Atualizar este arquivo conforme avanço das implementações.
* Marcar como concluídos ([x]) os itens efetivamente resolvidos.
* Remover observações obsoletas quando necessário.
* Manter neste arquivo apenas pendências reais e status atualizados.
