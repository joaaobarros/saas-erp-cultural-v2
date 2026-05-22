# Modelo de Domínio — ERP Cultural SaaS v2

> Fonte canônica de entidades, FSMs e bounded contexts.  
> Toda decisão de código deve ser validada contra este documento.

---

## Entidade Base (herança obrigatória)

```javascript
{
  orgId:        string,   // isolamento de tenant — OBRIGATÓRIO em toda entidade
  id:           string,   // UUID gerado pelo sistema
  criadoEm:     string,   // ISO 8601
  atualizadoEm: string,   // ISO 8601
  criadoPor:    string,   // email do autor
  versao:       number    // optimistic locking simples (incrementa a cada write)
}
```

---

## Ação (núcleo real)

```javascript
Acao = {
  // base
  orgId, id, nome, tipo, descricao,
  status,        // FSM: planejada | em_producao | em_execucao | concluida | arquivada | cancelada
  responsavel,   // email do responsável principal
  dataInicio, dataFim, periodoExecucao,

  // localização
  localExecucao: 'sede' | 'territorio' | 'itinerante' | 'virtual',
  enderecoTerritorio: { logradouro, bairro, cidade, referencia, coordenadas: { lat, lng } },

  // orçamento próprio
  orcamento: {
    totalAprovado, totalExecutado, saldo,
    linhas: [{ rubricaId, descricao, aprovado, executado }]
  },

  // ligação à prestação de contas
  metaContrato:   contratoId,
  linhaIndicador: indicadorId,

  // visibilidade pública (Portal)
  visibilidadePublica: boolean,
  descricaoPublica:    string,

  // campos personalizados por org
  camposCustom: {}
}
```

**FSM de Ação:**
```
planejada → em_producao → em_execucao → concluida → arquivada
qualquer  → cancelada
```

---

## Colaborador (domínio unificado — substitui Funcionário + RH)

```javascript
Colaborador = {
  orgId, id, nome,
  emailInstitucional, emailPessoal, cpf, telefone,
  status: 'ativo' | 'inativo' | 'afastado' | 'desligado',

  vinculos: [{
    tipo: 'clt' | 'pj' | 'bolsista' | 'professor' | 'voluntario' | 'estagiario',
    dataInicio, dataFim,
    cargo, enquadramento, salarioBase,
    encargos: { inss, fgts, pis, sistemaS, sat, beneficios, provisoes },
    status: 'ativo' | 'encerrado'
  }],

  funcoes: [{
    tipo: 'coordenador' | 'tecnico' | 'comunicacao' | 'financeiro' | 'rh' | 'infraestrutura',
    setor, ativo, inicio, fim
  }],

  pccs:        { nivel, classe, referencia },
  competencias: [{ tipo, descricao, nivel }],

  // escalas (gerenciadas pelo PessoasEngine)
  // ferias (gerenciadas pelo PessoasEngine)
}
```

---

## Desambiguação de "Solicitação"

| Termo legado | Novo termo | Engine | Contexto |
|--------------|-----------|--------|---------|
| Solicitação de reserva (booking) | `SolicitacaoEspaco` | `SolicitacaoEspacoEngine` | Espaços |
| Solicitação interna (pedido de recursos) | `Demanda` | `DemandaEngine` | Demandas Internas |
| Pauta Externa (cessão) | `CessaoPauta` | `CessaoPautaEngine` | Portal Externo |

---

## Ativo (Patrimônio/Equipamento — Fase 1.4)

```javascript
Ativo = {
  // base
  orgId, id, criadoEm, atualizadoEm, criadoPor, versao,

  // identificação
  nome,         // "Câmera Sony A7", "Projetor Epson EB-X51"
  codigo,       // número de tombamento/patrimônio: "PAT-001"
  categoria,    // 'audiovisual' | 'informatica' | 'mobiliario' | 'infraestrutura' | 'outro'
  descricao,    // número de série, características técnicas, observações

  // estado atual
  status,       // FSM: disponivel | reservado | em_uso | manutencao | baixado
  localizacao,  // onde está agora: "Sala de Mídia", "Auditório"
  responsavel,  // email de quem está usando (preenchido ao ir para em_uso)
  acaoId,       // ID da ação que está usando (se aplicável)

  // dados patrimoniais
  valorAquisicao, // valor em R$
  dataAquisicao,  // ISO date
  fornecedor,
  notaFiscal,
  vidaUtilAnos,   // vida útil estimada em anos

  // manutenção
  proximaManutencao, // ISO date da próxima manutenção preventiva
  ultimaManutencao,  // ISO date da última manutenção realizada
}
```

**Fonte de verdade**: `ESPACOS.Ativos` (Sheet canônica — tabular, visível à equipe)
**Histórico de movimentações**: `ESPACOS.MovimentacoesAtivos` (append-only)
**Baixas formais**: `ESPACOS.BaixasAtivos` (append-only)
**Registros de manutenção**: `ESPACOS.Manutencoes` (append-only)

---

## Tarefa (persistência canônica — Fase 1.1)

```javascript
Tarefa = {
  // base
  orgId, id, criadoEm, atualizadoEm, criadoPor, versao,

  // dados operacionais
  titulo, descricao,
  status,        // FSM: pendente | em_andamento | bloqueada | concluida | cancelada
  prioridade,    // baixa | media | alta | critica
  responsavel,   // email
  executores,    // emails
  setor,

  // contexto e vínculos
  modulo, tipo,
  prazo, concluidoEm,
  acaoId, processoId,
  origem, origemId,

  // rastreabilidade
  historico: [{ data, ator, campo, de, para, comentario }],
  comentarios: [{ id, autor, texto, data }],
  metadados: {}
}
```

**Fonte de verdade**: `tarefas.json`  
**Índice operacional**: `PESSOAL.Tarefas` somente para leitura/consulta rápida.

---

## FSMs por Domínio

### Reserva de Espaço
```
pendente → confirmado → em_uso → concluido
pendente → cancelado
confirmado → cancelado
```

### Ativo (Equipamento/Patrimônio)
```
disponivel → reservado → em_uso → manutencao → disponivel
qualquer   → baixado
```

### Protocolo de Chave
```
aberto → devolvido
aberto → atrasado → devolvido
```

### Habilitação de Agente
```
inscrito → habilitado | inabilitado
habilitado → inativo
```

### Tarefa
```
pendente → em_andamento → concluida
pendente | em_andamento → bloqueada → em_andamento
qualquer → cancelada
```

### Reunião
```
agendada → confirmada → em_andamento → encerrada → ata_pendente → aprovada → arquivada
qualquer → cancelada
```

### Contrato
```
rascunho → ativo → encerrado
ativo → suspenso → ativo | encerrado
qualquer → cancelado
```

### Demanda Interna
```
rascunho → submetida → em_analise → aprovada → em_execucao → concluida
qualquer → cancelada | rejeitada
```

### Colaborador
```
ativo → afastado → ativo
ativo | afastado → desligado
```

### Proposta Orçamentária
```
rascunho → revisao → submetida → aprovada | rejeitada
qualquer → cancelada
```

### Remanejamento Orçamentário
```
rascunho
  → aguardando_responsavel_origem
  → aguardando_responsavel_destino
  → aguardando_financeiro
  → aprovado → efetivado
qualquer → rejeitado | cancelado
```

### CessaoPauta (Portal Externo)
```
recebida → em_analise → aprovada | recusada → notificada
```

---

## Fontes Canônicas por Domínio

| Domínio | Fonte Canônica (escrita) | Índice (leitura rápida) |
|---------|--------------------------|------------------------|
| Ações | `acoes.json` | `ACOES.Acoes` (Sheet) |
| Colaboradores | `colaboradores.json` | `EQUIPES.Funcionarios` (Sheet) |
| Tarefas | `tarefas.json` | `PESSOAL.Tarefas` (Sheet) |
| Reuniões | `reunioes.json` | `REUNIOES.Reunioes` (Sheet) |
| Demandas | `demandas.json` | `PESSOAL.Demandas` (Sheet) |
| CessaoPauta | `pauta_externa.json` | — |
| Reservas | `ESPACOS.Reservas` (Sheet canônica) | — |
| Chaves | `ESPACOS.Chaves` (Sheet canônica) | — |
| Contratos | `RELATORIOS.Contratos` (Sheet canônica) | — |
| Ativos | `ESPACOS.Ativos` (Sheet canônica) | — |
| Habilitações | `ACOES.Habilitacoes` (Sheet canônica) | — |
| Agentes Culturais | `agentes_culturais.json` | — |
| Fontes de Recurso | `fontes_recurso.json` | — |
| Contratados | `contratados_registry.json` | — |

**Regra**: JSON é fonte de verdade quando o dado tem estrutura hierárquica ou arrays nested.
Sheet é canônica quando o dado é tabular simples e precisa de visibilidade humana direta.

---

## Bounded Contexts e Comunicação

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTEXTOS INTERNOS                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ PROGRAMAÇÃO  │  │   ESPAÇOS    │  │   GOVERNANÇA       │   │
│  │ Habilitações │  │ Reservas     │  │ Reuniões           │   │
│  │ CessãoPauta  │  │ Chaves       │  │ Encaminhamentos    │   │
│  │ Calendário   │  │ Ativos/Infra │  │ Decisões           │   │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬──────────┘   │
│         └─────────┬───────┘─────────────────────┘              │
│                   │                                             │
│          ┌────────▼─────────┐   ← NÚCLEO INTEGRADOR           │
│          │   ACTION ENGINE  │                                  │
│          │  Ação + Recursos │                                  │
│          │  + Orçamento     │                                  │
│          └────────┬─────────┘                                  │
│       ┌───────────┼──────────────────┐                         │
│  ┌────▼─────┐  ┌──▼─────────┐  ┌────▼──────────────┐          │
│  │ PESSOAS  │  │ FINANCEIRO │  │  COMUNICAÇÃO      │          │
│  │Colaborad.│  │ Contratos  │  │ Demandas Comun.   │          │
│  │Vínculos  │  │ Rubricas   │  │ Calendário RECE   │          │
│  │RH/Escalas│  │ Pagamentos │  │ Entregas          │          │
│  └──────────┘  └────────────┘  └───────────────────┘          │
│                                                                 │
│  ┌──────────────────────┐  ┌────────────────────────────┐     │
│  │   INTELIGÊNCIA       │  │   DEMANDAS INTERNAS        │     │
│  │ Métricas/KPIs        │  │ Pedidos de recursos        │     │
│  │ Escuta Institucional │  │ Fluxo de aprovação         │     │
│  │ Dashboard            │  │ Processos admin-financeiros│     │
│  └──────────────────────┘  └────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    CONTEXTO EXTERNO                             │
│  Portal Externo: CessãoPauta, Inscrições, Agenda Pública       │
│  (sem autenticação, rate limiting + CSRF)                       │
└─────────────────────────────────────────────────────────────────┘
```

**Regra de fronteira**: comunicação entre contextos ocorre EXCLUSIVAMENTE via:
1. `SystemEvents.emit()` (assíncrono, via EventHandlerRegistry)
2. `IntegracaoOrquestrador` (síncrono, para consequências críticas)
3. `AcoesRecursos` (vínculo fraco — leitura bidirecional)
