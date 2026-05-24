# Isolamento Modular — Feature Flags + Graceful Degradation

**Data**: 2026-05-24  
**Arquivos analisados**:
- `gas/src/modules/admin/modulos_registry_service.gs`
- `gas/src/frontend/index.html` (sidebar, menu, App._MODULOS_MENU)

---

## 🔴 GAP CRÍTICO — Catálogo incompleto no ModulosRegistryService

### Catálogo declarado (9 módulos)
```javascript
var CATALOGO = [
  { id: 'ADMIN',        label: 'Administração' },
  { id: 'TAREFAS',      label: 'Tarefas' },
  { id: 'PESSOAS',      label: 'Pessoas / RH' },
  { id: 'FINANCEIRO',   label: 'Financeiro' },
  { id: 'ACOES',        label: 'Ações' },
  { id: 'ESPACOS',      label: 'Infraestrutura' },
  { id: 'REUNIOES',     label: 'Reuniões' },
  { id: 'COMUNICACAO',  label: 'Comunicação' },
  { id: 'RELATORIOS',   label: 'Relatórios' }  // ⚠️ view não existe!
];
```

### Módulos existentes NÃO no catálogo

| Módulo real | View no frontend | Falta no catálogo |
|-------------|-----------------|-------------------|
| Escuta Institucional | `view-escuta` | ❌ `ESCUTA` ausente |
| Estratégia | `view-estrategia` | ❌ `ESTRATEGIA` ausente |
| Público / Inscrições | `view-publico` | ❌ `PUBLICO` ausente |
| Ponto Eletrônico | `view-ponto` | ❌ `PONTO` ausente |
| TaskHub | `view-taskhub` | ❌ `TASKHUB` ausente |
| Balcão de Comunicação | `view-balcao` | ❌ `BALCAO` ausente |
| Dashboard Executivo | `view-dashboard` | ❌ `DASHBOARD` ausente |
| Voluntários | `view-voluntarios` | ❌ `VOLUNTARIOS` ausente |
| Agentes Culturais | `view-agentes` | ❌ `AGENTES` ausente |
| Acervo | `view-acervo` | ❌ `ACERVO` ausente |
| Auditoria | `view-auditoria` | ❌ `AUDITORIA` ausente |
| Parcerias | `view-parcerias` | ❌ `PARCERIAS` ausente |
| Sistema/Métricas | `view-sistema-metricas` | ❌ `SISTEMA_METRICAS` ausente |

### Módulo fantasma no catálogo
- `RELATORIOS` está no catálogo mas **não existe como view** no frontend
- Provavelmente deveria ser `EXPORTACOES` — exportações CODIP/SALIC/SNIIC ficam em `view-financeiro` aba Exportações

---

## 🟠 GAP ALTO — Sidebar não respeita módulos ativos

### Problema
O método `estaAtivo(id)` funciona corretamente no backend. Porém, o menu lateral no frontend
**não consulta o backend para filtrar módulos desativados**. O menu é construído a partir de
`App._MODULOS_MENU` (array estático definido no index.html) sem verificação de `modulosAtivos`
retornados pelo bootstrap.

### Como deveria funcionar
```javascript
// No bootstrap:
// BootService.obter() retorna { modulosAtivos: ['ACOES', 'FINANCEIRO', ...] }

// No frontend (App.inicializar):
var modAtivos = bootstrap.modulosAtivos || [];
App._MODULOS_MENU = App._MODULOS_MENU.filter(function(m) {
  return modAtivos.indexOf(m.id) >= 0 || m.id === 'home';
});
```

### Verificação necessária
Verificar se `BootService.obter()` já retorna `modulosAtivos` e se `App.inicializar()` já filtra o menu.
Se sim, o problema é apenas o catálogo incompleto (GAP anterior).
Se não, o isolamento modular está completamente ineficaz no frontend.

---

## ✅ Backend — estaAtivo() Implementado Corretamente

```javascript
// modulos_registry_service.gs
function estaAtivo(id) {
  var orgId = _getOrgId();
  var config = _lerConfig(orgId);
  var entrada = config.find(function(c) { return c.moduloId === String(id).toUpperCase(); });
  return entrada ? entrada.ativo !== false : true; // default: ativo
}
```

- **Lógica de default**: módulo sem configuração = ativo (correto — sem registro = habilitado)
- **Scope por org**: `orgId` da configuração atual — correto para multi-tenancy
- **Lock**: usa `modifyJSON('modulos_config.json', ...)` com lock implícito via `DataLayer` ✅
- **Auditoria**: `Logger.info` ao mudar estado ✅

---

## ✅ Backend — setAtivo() Correto

```javascript
function setAtivo(moduloId, ativo, orgId) {
  moduloId = String(moduloId).toUpperCase();
  var existe = CATALOGO.some(function(m) { return m.id === moduloId; });
  if (!existe) throw new Error('Módulo desconhecido: ' + moduloId);
  // modifyJSON com lock...
}
```

- Valida contra catálogo antes de salvar — mas o catálogo está incompleto (ver GAP acima)
- Módulos fora do catálogo (ESCUTA, ESTRATEGIA etc.) **não podem ser desativados** via superadmin

---

## Grafo de Dependências Identificado

```
ACOES ──────────► ESPACOS (criar reserva)
      ──────────► TAREFAS (criar tarefas auto [COMENTADO])
      ──────────► FINANCEIRO (vincular contrato)
      ──────────► PUBLICO (inscrições, satisfação [COMENTADO])
      ──────────► COMUNICACAO/RECE (agenda [COMENTADO])

ESPACOS ─────────► TAREFAS (tarefa setup [COMENTADO])

CONTRATOS ───────► ORCAMENTO_GUARD (validar saldo)
           ───────► EXPORTACOES (SALIC)
           ───────► PESSOAS (pessoal do contrato)

PESSOAS ─────────► PONTO (registros vinculados ao colaborador)
        ─────────► ESCUTA (seleção participantes por fairness)
        ─────────► CONTRATACOES (contratados vinculados)

ESCUTA ──────────► PESSOAS (lista colaboradores elegíveis)
       ──────────► DASHBOARD (insights de clima)

COMUNICACAO ─────► ACOES (demandas de cobertura)
            ─────► TASKHUB (pendências de demanda)

ESTRATEGIA ──────► ACOES (vincular ação a objetivo)
```

### Graceful Degradation — Avaliação

| Dependência | Se módulo de destino OFF | Comportamento atual | Correto? |
|-------------|-------------------------|--------------------|----|
| ACOES → ESPACOS | Botão "Reservar espaço" clica → erro backend | Não verificado | ❓ |
| ACOES → TAREFAS | Tarefas auto nunca foram implementadas | N/A | ⚠️ |
| ESCUTA → PESSOAS | ctrl_escuta_salvar precisa de lista de colaboradores | Pode quebrar | ❓ |
| CONTRATOS → ORCAMENTO | OrcamentoGuard é serviço interno, não módulo | Sempre ativo | ✅ |
| PESSOAS → PONTO | ctrl_ponto_* são independentes dos ctrl_pessoas_* | Funciona isolado | ✅ |

---

## Correções Necessárias (Iteração 6)

### 1. Expandir CATALOGO no ModulosRegistryService

```javascript
var CATALOGO = [
  { id: 'ADMIN',           label: 'Administração',         descricao: '...' },
  { id: 'TAREFAS',         label: 'Tarefas',               descricao: '...' },
  { id: 'PESSOAS',         label: 'Pessoas / RH',          descricao: '...' },
  { id: 'PONTO',           label: 'Ponto Eletrônico',      descricao: '...' },
  { id: 'FINANCEIRO',      label: 'Financeiro',            descricao: '...' },
  { id: 'ACOES',           label: 'Ações',                 descricao: '...' },
  { id: 'ESPACOS',         label: 'Infraestrutura',        descricao: '...' },
  { id: 'REUNIOES',        label: 'Reuniões',              descricao: '...' },
  { id: 'COMUNICACAO',     label: 'Comunicação',           descricao: '...' },
  { id: 'BALCAO',          label: 'Balcão',                descricao: '...' },
  { id: 'ESCUTA',          label: 'Escuta Institucional',  descricao: '...' },
  { id: 'ESTRATEGIA',      label: 'Estratégia',            descricao: '...' },
  { id: 'PUBLICO',         label: 'Público',               descricao: '...' },
  { id: 'VOLUNTARIOS',     label: 'Voluntários',           descricao: '...' },
  { id: 'AGENTES',         label: 'Agentes Culturais',     descricao: '...' },
  { id: 'ACERVO',          label: 'Acervo',                descricao: '...' },
  { id: 'PARCERIAS',       label: 'Parcerias',             descricao: '...' },
  { id: 'DASHBOARD',       label: 'Dashboard',             descricao: '...' },
  { id: 'TASKHUB',         label: 'TaskHub',               descricao: '...' },
  { id: 'AUDITORIA',       label: 'Auditoria',             descricao: '...' }
  // Removido: RELATORIOS (não existe como view)
];
```

### 2. Verificar filtragem do menu no frontend
Verificar em `App.inicializar()` se `modulosAtivos` do bootstrap é usado para filtrar `App._MODULOS_MENU`.
Se não, adicionar filtro.

---

## Status

- [x] ModulosRegistryService lido e analisado
- [x] Catálogo comparado com views do frontend
- [x] Gaps identificados (13 módulos faltantes no catálogo)
- [x] Graceful degradation analisada (parcialmente)
- [ ] Verificar BootService.obter() retorna modulosAtivos
- [ ] Verificar App.inicializar() filtra menu por modulosAtivos
- [ ] Correção do catálogo (ITERAÇÃO 6)
