# IMPLEMENTAÇÃO — Correção #3: Permissões e Aprovações

> **Status**: Em Andamento  
> **Prioridade**: 🔴 ALTA  
> **Branch**: `feat/correcoes-3-permissoes-aprovacoes`  
> **Data Início**: 2026-05-28

---

## 📋 PROBLEMAS IDENTIFICADOS

### Problema 1: Superadmin não consegue revisar permissões e aprovações corretamente
**Causa**: Página de permissões está restrita apenas ao módulo de reservas. Não há visão ampla de todas as aprovações do sistema.

### Problema 2: Nenhum alerta/notificação para primeiro acesso pendente
**Causa**: Sistema atual não emite notificações sobre solicitações de acesso em primeiro acesso. Admin não recebe alertas automáticos.

### Problema 3: Aba "Aprovações" é muito restrictiva
**Causa**: Aba atual aparenta estar vinculada apenas a reservas. Não contempla outros tipos de aprovação.

---

## 🎯 SOLUÇÃO ARQUITETURAL

### Fase 1️⃣: Criação do Módulo Central de Aprovações

**Objetivo**: Criar um hub centralizado para TODAS as aprovações do sistema.

**Arquivos a Criar**:
1. `gas/src/modules/aprovacoes/aprovacoes_engine.gs` — Lógica central de aprovações
2. `gas/src/modules/aprovacoes/aprovacoes_repository.gs` — Persistência de aprovações
3. `gas/src/modules/aprovacoes/aprovacoes_controller.gs` — Endpoints REST/GAS
4. `gas/src/modules/aprovacoes/aprovacoes_fsm.gs` — Máquina de estados para fluxos

**Schema de Aprovação** (aprovacoes.json):
```javascript
{
  id: "aprov_<uuid>",
  tipo: "primeiro_acesso|reserva|permissao|contratacao|outro",
  status: "pendente|aprovada|rejeitada|em_analise",
  
  // Dados do solicitante
  solicitanteMail: "user@org.br",
  solicitanteNome: "João Silva",
  
  // Dados da solicitação
  payload: { ...tipo-específico },
  
  // Histórico
  solicitadoEm: "2026-05-28T10:30:00Z",
  analisadoPor: "admin@org.br",
  analisadoEm: "2026-05-28T11:00:00Z",
  motivoRejeicao: null,
  
  // Tags para busca/filtro
  tags: ["primeiro_acesso", "urgente"],
  
  // Vinculações
  processoId: null,
  tarefaId: null,
  vinculado_a: []
}
```

### Fase 2️⃣: Ampliação de Notificações

**Objetivo**: Implementar alertas proativos para Superadmin.

**Fluxos a Implementar**:
- Quando: usuário solicita primeiro acesso → EMAIL ao Superadmin
- Quando: solicitação fica > 48h em pendência → LEMBRETE ao Superadmin
- Quando: reserva rejeitada automaticamente → NOTIFICAÇÃO ao solicitante
- Quando: aprovação concluída → EMAIL ao usuário

**Usar**: `NotificationEngine` (já existe em `core/notification_engine.gs`)

### Fase 3️⃣: Interface de Aprovações Unificada

**Objetivo**: Criar aba única "Aprovações" que mostra:
- ✅ Primeiros acessos pendentes
- ✅ Reservas aguardando aprovação
- ✅ Permissões solicitadas
- ✅ Solicitações de contratação
- ✅ Outras aprovações futuras

**Layout esperado**:
```
┌─────────────────────────────────────────┐
│ 📋 APROVAÇÕES (15 pendentes)            │
├─────────────────────────────────────────┤
│ 🔍 Filtrar por: [Tipo ▼] [Status ▼]   │
├─────────────────────────────────────────┤
│ ☑ Tipo          | Solicitante | Data   │
│ ──────────────────────────────────────  │
│ ⏳ Primeiro Acesso | João Silva | 28 ago │
│ ⏳ Permissão RH   | Maria Jose | 27 ago │
│ ⏳ Reserva Sala   | Pedro Neto | 26 ago │
│                                        │
│ [← Anterior] 1 de 3 [Próximo →]       │
└─────────────────────────────────────────┘
```

### Fase 4️⃣: Auditoria & Rastreabilidade Completa

**Objetivo**: Cada aprovação deixa rastro auditável.

**Usar**: `AuditoriaService.registrar()` para cada ação:
- Solicitação criada
- Análise iniciada
- Aprovada/Rejeitada
- Motivo registrado

---

## 🔄 FLUXO DE PRIMEIRO ACESSO (exemplo)

```
1. Usuário do domínio acessa sistema
   ↓
2. AcessoService.verificar(email) → status='pendente_aprovacao'
   ↓
3. Frontend mostra tela de "Solicitar Acesso"
   ↓
4. Usuário preenche: nome + setor → clica "Solicitar"
   ↓
5. ctrl_acesso_solicitar() cria registro em usuarios_acesso.json
   ↓
6. AprovacoesEngine.criar({ tipo: 'primeiro_acesso', ... })
   ↓
7. NotificationEngine.enviar() → EMAIL ao Superadmin
   │  "Nova solicitação de acesso: João Silva (TI)"
   │  "Clique aqui para aprovar: [...link...]"
   ↓
8. Superadmin clica no link OU acessa aba "Aprovações"
   ↓
9. Interface mostra: [✅ Aprovar] [❌ Rejeitar]
   ↓
10. Superadmin clica "Aprovar"
    ↓
11. AprovacoesEngine.aprovar() → status = 'aprovada'
    ↓
12. AcessoService.status[email] = 'ativo'
    ↓
13. NotificationEngine.enviar() → EMAIL ao usuário
    │  "Seu acesso foi liberado! Papel: colaborador | Setor: TI"
    ↓
14. Usuário recarrega a página → acessa SPA normalmente
```

---

## 📂 ESTRUTURA DE ARQUIVOS

```
gas/src/modules/aprovacoes/
├── aprovacoes_engine.gs          (lógica central)
├── aprovacoes_repository.gs      (persistência)
├── aprovacoes_controller.gs      (endpoints)
├── aprovacoes_fsm.gs             (máquina de estados)
└── aprovacoes_tipos.gs           (schema por tipo)

gas/src/core/services/
├── acesso_service.gs             (MODIFICADO: emitir eventos)
└── [...existing...]

gas/src/frontend/
├── index.html                    (MODIFICADO: aba Aprovações)
└── [...existing...]
```

---

## 📍 DEPENDÊNCIAS

✅ `AcessoService.verificar()` — já existe  
✅ `AuditoriaService.registrar()` — já existe  
✅ `NotificationEngine` — já existe  
✅ `FsmGuardian` — já existe  
✅ `SystemEventTypes` — já existe  
❌ `AprovacoesEngine` — **A CRIAR**  

---

## 🛠️ PRÓXIMOS PASSOS

- [ ] **Fase 1a**: Criar `aprovacoes_engine.gs` com FSM
- [ ] **Fase 1b**: Criar `aprovacoes_repository.gs`
- [ ] **Fase 1c**: Criar `aprovacoes_controller.gs` com endpoints
- [ ] **Fase 2**: Integrar com `AcessoService`
- [ ] **Fase 3**: Criar interface HTML no frontend
- [ ] **Fase 4**: Testes end-to-end
- [ ] **Fase 5**: Deploy + validação

---

## 📝 NOTAS IMPORTANTES

1. **Superadmin acesso ao primeiro acesso**: Adicionar botão "Visualizar como Novo Usuário" no admin panel
2. **Notificações**: Usar email + possível banner no sistema
3. **FSM**: Respeitar ordem de estados: `pendente → em_analise → aprovada/rejeitada`
4. **Auditoria**: Registrar TUDO — quem, quando, por que
5. **Idempotência**: Múltiplas chamadas de aprovação não duplicam registros

---

**Criado em**: 2026-05-28  
**Próxima Revisão**: após implementação da Fase 1
