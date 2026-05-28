Segue o arquivo `.md` com as correções e ajustes solicitados para inclusão no sistema de gestão cultural:

# Correções e Ajustes — Sistema de Gestão Cultural

## 1. Página de Primeiro Acesso

### Problema identificado

As informações dos setores estão invisíveis no dropdown de seleção de setor, impossibilitando que o usuário compreenda quais opções estão disponíveis para escolha durante o primeiro acesso.

### Correção solicitada

* Corrigir renderização visual do dropdown de setores.
* Garantir contraste adequado entre texto e fundo.
* Validar funcionamento em tema claro e escuro (caso exista).
* Garantir acessibilidade mínima de leitura.

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
* demais aprovações futuras.

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

### Observação

Validar:

* incidência correta dos benefícios;
* descontos;
* reflexos no custo final;
* compatibilidade com vínculos CLT.
