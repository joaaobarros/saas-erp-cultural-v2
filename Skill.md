# 🏗️ SKILL: Arquiteturas de Platform Engineering — Dissecando o Vídeo da Atlassian

> **Fonte:** ["I was laid off by Atlassian" — Vasilios Syrakis](https://youtu.be/55pTFVoclvE)  
> **Contexto:** Engenheiro Sênior com 8 anos na Atlassian expõe, em 38 minutos, a arquitetura completa de edge infrastructure construída internamente para Jira, Confluence e Bitbucket — antes de ser demitido em março/2026 num corte de 10% (≈1.600 pessoas) motivado por IA.  
> **Alcance:** +1,1 milhão de visualizações em 8 dias. Nenhum segredo foi vazado: apenas arquiteturas, padrões open-source, decisões técnicas e lições aprendidas.

---

## Índice

1. [Visão Geral — O que o Vídeo Ensina](#1-visão-geral)
2. [Arquitetura 1 — Open Service Broker (Self-Service Infrastructure)](#2-open-service-broker)
3. [Arquitetura 2 — Control Plane + Envoy Proxy (Sovereign)](#3-control-plane--envoy-proxy)
4. [Arquitetura 3 — Infrastructure as Code com Packer + SaltStack](#4-infrastructure-as-code)
5. [Arquitetura 4 — Sidecar Services (Auth, Logging, Rate Limit)](#5-sidecar-services)
6. [Padrões Transversais Identificados](#6-padrões-transversais)
7. [Mapeamento para o Sistema CCBJ](#7-mapeamento-para-o-sistema-ccbj)
8. [Roadmap de Evolução Inspirado nas Arquiteturas](#8-roadmap-de-evolução)
9. [Glossário Técnico](#9-glossário-técnico)

---

## 1. Visão Geral

O vídeo não é sobre tecnologia por si só — é sobre **como grandes sistemas crescem de forma sustentável**. A mensagem central é:

> _"Quanto mais cedo você torna a infraestrutura um produto de autoatendimento, menos dependência de equipes centralizadas seu time de produto terá."_

### O problema original (antes da solução)

| Situação Antes                                                     | Situação Depois                                                  |
| ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Desenvolvedor precisa de load balancer → abre ticket → espera dias | Desenvolvedor acessa API → load balancer provisionado em minutos |
| Configuração manual por equipe de infra                            | Configuração via código, reproduzível e auditável                |
| Load balancers enterprise caros e inflexíveis                      | Envoy Proxy open-source gerenciado dinamicamente                 |
| Serviços de auth/logging construídos por cada equipe               | Serviços compartilhados via sidecar, transparentes ao backend    |

### Escala da solução construída

```
~2.000 proxy servers
× 13 regiões AWS
× Jira + Confluence + Bitbucket
= Milhões de requests roteados por segundo
```

---

## 2. Open Service Broker

### O que é

Uma **API de autoatendimento** que permite que qualquer desenvolvedor interno provisione load balancers sem envolver a equipe de infraestrutura.

### Stack utilizada

```
Frontend Dev → [Open Service Broker API] → [Fila Assíncrona] → [Workers] → [Infraestrutura]
```

| Componente            | Tecnologia           | Papel                                          |
| --------------------- | -------------------- | ---------------------------------------------- |
| API Gateway           | **FastAPI** (Python) | Recebe pedidos de provisionamento              |
| Fila de tarefas       | **Amazon SQS**       | Desacopla requisição do processamento          |
| Estado / Rastreamento | **DynamoDB**         | Persiste status de cada provisionamento        |
| Workers               | Serviços background  | Consomem SQS e executam o provisionamento real |

### Fluxo completo

```
1. Dev submete request → POST /provision/load-balancer
2. API valida e cria job → grava no DynamoDB com status PENDING
3. Job publicado na fila SQS
4. Worker consome SQS → executa provisionamento real
5. Worker atualiza DynamoDB → status: ACTIVE
6. Dev consulta GET /status/{job_id} → ACTIVE
```

### Princípios arquiteturais

- **Desacoplamento**: requisição (síncrona) vs. processamento (assíncrono)
- **Idempotência**: reenviar o mesmo request não duplica o recurso
- **Observabilidade**: cada passo é rastreado com status explícito
- **Self-service**: sem dependência de humanos no caminho crítico

---

## 3. Control Plane + Envoy Proxy

### O problema que resolve

Load balancers enterprise (F5, AWS ALB em escala) custam caro e reconfigurá-los requer downtime ou intervenção manual. Com 2.000 proxies em 13 regiões, qualquer mudança de configuração seria um pesadelo operacional.

### A solução: Envoy + Sovereign

```
[Control Plane: Sovereign] ──xDS──► [Envoy Proxy #1]
                           ──xDS──► [Envoy Proxy #2]
                           ──xDS──► [Envoy Proxy #N] (até 2.000)
```

### Camadas da arquitetura

```
┌─────────────────────────────────────────────────────┐
│                  CONTROL PLANE                      │
│         Sovereign (open-source, Atlassian)          │
│  - Armazena configuração canônica                   │
│  - Converte dados de plataforma em config Envoy     │
│  - Distribui via protocolo xDS                      │
└───────────────────────┬─────────────────────────────┘
                        │ xDS Protocol (gRPC/REST)
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
   [Envoy #1]     [Envoy #2]    [Envoy #N]
   DATA PLANE     DATA PLANE    DATA PLANE
   - Roteamento   - TLS         - Rate limit
   - Auth         - Logging     - Health check
```

### Protocolo xDS — como funciona

xDS (Discovery Service) é o protocolo usado pelo Envoy para receber configuração dinamicamente:

| Serviço xDS                  | O que configura                         |
| ---------------------------- | --------------------------------------- |
| **LDS** (Listener Discovery) | Portas e protocolos a escutar           |
| **RDS** (Route Discovery)    | Regras de roteamento de requests        |
| **CDS** (Cluster Discovery)  | Backends/upstreams disponíveis          |
| **EDS** (Endpoint Discovery) | IPs/ports individuais de cada instância |

> **Resultado**: Mudar configuração de 2.000 proxies sem downtime, em segundos.

### Sovereign — o que é

- Servidor de controle JSON open-source criado por Syrakis
- Abstrai a complexidade do xDS para devs internos
- Traduz configuração de alto nível → config Envoy de baixo nível
- **Open-source**: disponível em `developer.atlassian.com/platform/sovereign`

### Padrão Control Plane / Data Plane

```
Control Plane = "o cérebro" → decide COMO rotear
Data Plane    = "os músculos" → executa o roteamento real
```

Este padrão é usado em:

- Kubernetes (API Server = control plane, kubelets = data plane)
- Service meshes (Istio, Linkerd)
- CDNs (origem = control, edge = data)

---

## 4. Infrastructure as Code

### O problema

Com 2.000 servidores em 13 regiões AWS, como garantir que cada servidor nasce configurado corretamente, sem depender de configuração manual?

### A solução: Packer + SaltStack

```
[Código de Config] → Packer → [AMI "dourada"] → AWS → [Instância pronta em segundos]
                              ↑
                         SaltStack aplica
                         configurações no
                         momento do build
```

| Ferramenta           | Papel                                 | Analogia                           |
| -------------------- | ------------------------------------- | ---------------------------------- |
| **HashiCorp Packer** | Cria imagens de máquina (AMIs)        | "Molde" de um servidor ideal       |
| **SaltStack**        | Configura o que está dentro da imagem | "Receita" do servidor              |
| **AWS AMI**          | Imagem imutável para deployment       | "Foto" do servidor no estado certo |

### Pipeline de infraestrutura

```
1. Engenheiro modifica SaltStack state
2. Packer inicia build da AMI
3. SaltStack aplica configurações (instala Envoy, certificados, etc.)
4. AMI "dourada" é criada e publicada
5. Auto Scaling Groups atualizam para a nova AMI
6. Servidores antigos são substituídos gradualmente (rolling deploy)
```

### Princípios

- **Infraestrutura Imutável**: servidores não são modificados — são substituídos
- **Reprodutibilidade**: qualquer região produz o mesmo resultado
- **Código como fonte da verdade**: a AMI é um artefato do processo de CI/CD
- **Escala horizontal**: adicionar uma região = rodar o mesmo pipeline em novo target

---

## 5. Sidecar Services

### O problema

Cada equipe de produto (Jira, Confluence, Bitbucket) precisaria implementar:

- Autenticação e autorização
- Log de acessos
- Rate limiting
- Proteção contra DDoS

Isso levaria a: código duplicado, divergências de implementação e dívida técnica gigante.

### A solução: Sidecar Pattern

```
┌─────────────────────────────────────┐
│           POD / Instância           │
│  ┌──────────────┐ ┌──────────────┐  │
│  │   Backend    │ │   Sidecar    │  │
│  │   (Jira,     │◄│  (Auth +     │  │
│  │  Confluence) │ │  Logging +   │  │
│  │              │ │  RateLimit)  │  │
│  └──────────────┘ └──────────────┘  │
└─────────────────────────────────────┘
         ▲
    Request entra aqui
    (Sidecar intercepta primeiro)
```

### Sidecars construídos por Syrakis

| Sidecar           | Linguagem | Função                                              |
| ----------------- | --------- | --------------------------------------------------- |
| **Auth Sidecar**  | **Rust**  | Valida tokens, verifica identidade antes do backend |
| **Access Logger** | —         | Registra todos os acessos com contexto de usuário   |
| **Rate Limiter**  | —         | Controla volume de requests por cliente/endpoint    |

### Por que Rust para o Auth Sidecar?

- **Performance**: zero overhead de GC, latência previsível
- **Segurança de memória**: sem buffer overflows por design
- **Adequado para hot path**: auth é executado em CADA request

### Benefícios do padrão Sidecar

1. **Transparência**: backend não sabe que o sidecar existe
2. **Reusabilidade**: um sidecar serve dezenas de backends
3. **Evolução independente**: atualizar auth não exige deploy dos backends
4. **Linguagem agnóstica**: backend em Java, sidecar em Rust — sem problema

---

## 6. Padrões Transversais Identificados

### 6.1 Platform Engineering

```
Developer Experience (DevEx) como produto interno:
- Abstrair complexidade de infraestrutura
- Criar "golden paths" (caminhos aprovados e simplificados)
- Reduzir cognitive load dos times de produto
```

### 6.2 Separação de Concerns em camadas

```
Camada          │ Responsabilidade
────────────────┼──────────────────────────────
Edge / Proxy    │ Roteamento, Auth, Rate Limit, Logging
Control Plane   │ Configuração e orquestração
Data Plane      │ Execução e processamento de tráfego
Application     │ Lógica de negócio pura (sem infra concerns)
Infrastructure  │ Provisionamento e configuração de servidores
```

### 6.3 Async-First

```
Toda operação que pode demorar → vai para fila
Toda operação crítica → resposta síncrona com confirmação
```

| Decisão                      | Motivo                              |
| ---------------------------- | ----------------------------------- |
| Provisionamento via SQS      | Evita timeout de request do usuário |
| Status tracking via DynamoDB | Permite polling sem manter conexão  |
| Workers independentes        | Escalam separado da API             |

### 6.4 Observabilidade como fundação

Cada componente foi construído com:

- **Logging estruturado**: toda ação tem contexto (quem, o quê, quando)
- **Status rastreável**: cada job/provisioning tem estado auditável
- **Auditoria de acessos**: quem acessou o quê e quando

### 6.5 Evolução Incremental (não Big Bang)

```
V1: Infraestrutura manual → script + API simples
V2: API + fila + workers → Open Service Broker
V3: Envoy + control plane → Sovereign
V4: Sidecars → Auth/Logging/RateLimit compartilhados
```

> **Lição**: Cada versão resolveu o problema do momento. Não tentaram construir tudo de uma vez.

---

## 7. Mapeamento para o Sistema CCBJ

O sistema `sistema-gestao-cultural-ccbj` já implementa vários desses padrões naturalmente, adaptados ao contexto Google Apps Script + Google Sheets. Veja onde há paralelos e onde há oportunidades:

### 7.1 Paralelos já existentes no CCBJ

| Padrão do Vídeo                        | Equivalente no CCBJ                                       | Arquivo                          |
| -------------------------------------- | --------------------------------------------------------- | -------------------------------- |
| **Self-service**                       | Usuários provisionam reservas sem admin                   | `Código.js:obterDadosIniciais()` |
| **Control Plane (config central)**     | `_getSheet()` com mapa central de planilhas               | `Código.js:15-48`                |
| **Auth Sidecar**                       | `verificarPermissao()` chamado antes de qualquer operação | `Código.js:verificarPermissao()` |
| **Rate Limiting**                      | `limitarRequisicoes()` via CacheService                   | `Código.js:limitarRequisicoes()` |
| **Audit Logging**                      | `registrarLog()` em todas as operações críticas           | `Código.js:registrarLog()`       |
| **Access Logging**                     | `registrarAcesso()` + `LogAcessos` sheet                  | `Código.js:registrarAcesso()`    |
| **Lock com Retry**                     | `obterLockComRetry()` com backoff exponencial             | `utils.gs:409-426`               |
| **Índices para performance**           | `criarIndiceAdmins/Salas/Itens()`                         | `utils.gs:515-613`               |
| **Status tracking**                    | Status de reserva (CONFIRMADO/CANCELADO/HABILITADO)       | `Código.js:313`                  |
| **Rollback**                           | `rollbackAcaoPorIndice()` com restauração de estado       | `Código.js:1266-1350`            |
| **Detecção de comportamento suspeito** | `detectarComportamentoSuspeito()`                         | `Código.js:1241`                 |
| **Infraestrutura Imutável (dados)**    | IDs gerados com `gerarId()` — nunca reutilizados          | `Código.js:gerarId()`            |

### 7.2 Arquitetura atual do CCBJ (mapeada)

```
┌─────────────────────────────────────────────────────────────┐
│                      CAMADA DE BORDA                        │
│   verificarPermissao() + limitarRequisicoes()               │
│   + detectarComportamentoSuspeito()                         │
│   (equivalente ao Sidecar Auth + Rate Limiter)              │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                  CAMADA DE LÓGICA                           │
│   Código.js: processarAgendamentoLote(), salvarEdicao()     │
│   verificarConflitoEspaco(), obterMetricasDashboard()       │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│             CAMADA DE ACESSO A DADOS                        │
│   _getSheet() + mapa central de planilhas                   │
│   (equivalente ao Control Plane configurando o Data Plane)  │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                  CAMADA DE DADOS                            │
│   Google Sheets: MASTER / ESPACOS / COMUNICACAO / RELATORIOS│
│   (equivalente ao DynamoDB + banco de estado)               │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Oportunidades de evolução identificadas

| Gap Atual                                                | Padrão do Vídeo                               | Implementação Sugerida                                                         |
| -------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------ |
| Cache expira em 60s, sem invalidação seletiva por módulo | Sovereign: configuração dinâmica sem downtime | Cache por namespace + invalidação por tipo de dado                             |
| Logs estruturados como array plano                       | Logging estruturado com contexto rico         | Adicionar `{ acao, tipo, alvo, timestamp, emailUsuario, metadados }` como JSON |
| Métricas só no dashboard, sem alertas                    | Observabilidade proativa                      | Threshold + alerta por email quando métricas críticas atingidas                |
| Sincronização RECE → Geral é manual                      | Sovereign: config propagada automaticamente   | Trigger bidirecional automático via log de mudanças                            |
| Rollback limitado ao último log                          | Versionamento de estado                       | Snapshot de estado antes de cada operação crítica                              |
| Rate limit por usuário, não por endpoint                 | Rate limit granular (por rota)                | `limitarRequisicoes(chave_endpoint + email, ...)`                              |
| Sem separação entre leitura e escrita                    | CQRS (Command-Query)                          | Funções `obter*()` vs `processar*()/salvar*()` com cache diferenciado          |

---

## 8. Roadmap de Evolução

Inspirado diretamente nos princípios do vídeo, aqui está um roadmap de evolução para o sistema CCBJ, do estado atual ao estado desejado:

### Fase 1 — Fundação (já implementado ✅)

```
✅ Central Sheet Mapping (_getSheet)
✅ Auth middleware (verificarPermissao)
✅ Rate limiting por usuário
✅ Audit logging (registrarLog)
✅ Access logging (registrarAcesso)
✅ Lock com retry e backoff exponencial
✅ Índices de performance (criarIndice*)
✅ Rollback básico
✅ Detecção de comportamento suspeito
```

### Fase 2 — Self-Service Robusto 🔄

```
[ ] Notificações proativas (email automático em mudanças de status)
[ ] API de status: endpoint para consultar estado de qualquer operação
[ ] Formulário self-service para novos espaços (sem admin direto na planilha)
[ ] Dashboard de solicitações com fluxo de aprovação visual
[ ] Webhook/trigger automático ao criar reserva RECE vinculada
```

### Fase 3 — Observabilidade Avançada 📊

```
[ ] Logs em formato JSON estruturado (para análise programática)
[ ] Alertas por threshold (ex: >5 cancelamentos/dia em sala → alerta)
[ ] Health check das planilhas (detecção de dados corrompidos/ausentes)
[ ] Relatório de anomalias (padrões de uso fora do normal)
[ ] Rastreabilidade completa: reserva → edições → cancelamento → rollback
```

### Fase 4 — Control Plane Interno 🧠

```
[ ] Configuração dinâmica de regras de negócio via sheet (sem deploy)
    Ex: "horário máximo de reserva = 21:30" → parametrizado em Configuracoes
[ ] Feature flags via planilha (habilitar/desabilitar funcionalidades remotamente)
[ ] Multi-tenant: suporte a múltiplos centros culturais com mesma codebase
[ ] Ambiente de staging: planilhas de teste separadas das de produção
```

### Fase 5 — Plataforma Completa 🚀

```
[ ] API REST externa (Clasp → Google Cloud Functions)
[ ] Módulo de relatórios com export automatizado (PDF/CSV via Drive)
[ ] Integração com Google Calendar para bloqueio automático de agenda
[ ] Painel de métricas em tempo real (Google Data Studio / Looker)
[ ] Mobile-first: PWA sobre o Apps Script
```

---

## 9. Glossário Técnico

| Termo                        | Definição                                                                         | Relevância para CCBJ                                                      |
| ---------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Platform Engineering**     | Construção de plataformas internas que aumentam a produtividade de outras equipes | CCBJ é uma plataforma interna para gestão cultural                        |
| **Self-Service**             | Usuário resolve sua necessidade sem acionar equipe técnica                        | Reservas, cancelamentos e consultas sem necessidade de admin              |
| **Control Plane**            | Componente que gerencia COMO o sistema funciona (configuração, roteamento)        | `_getSheet()` é o control plane do acesso a dados                         |
| **Data Plane**               | Componente que executa o trabalho real (processa requests)                        | Funções de negócio (`processarAgendamento`, `salvarEdicao`)               |
| **Sidecar Pattern**          | Serviço auxiliar que roda junto ao serviço principal sem modificá-lo              | `verificarPermissao()` antes de cada operação = sidecar de auth           |
| **xDS Protocol**             | Protocolo do Envoy para distribuição dinâmica de configuração                     | Não aplicável diretamente, mas o padrão de config central é equivalente   |
| **Envoy Proxy**              | Proxy L7 open-source de alta performance com controle dinâmico                    | Não usado, mas o padrão de proxy/borda é implementado via GAS             |
| **Sovereign**                | Control plane open-source para Envoy criado pela Atlassian                        | Referência para um possível "CCBJ Config Manager"                         |
| **Immutable Infrastructure** | Servidores nunca são modificados — são substituídos                               | IDs gerados por `gerarId()` são imutáveis e únicos                        |
| **HashiCorp Packer**         | Ferramenta para criar imagens de máquina (AMIs)                                   | Analogia: `appsscript.json` como definição imutável do ambiente           |
| **SaltStack**                | Ferramenta de gerenciamento de configuração de servidores                         | Analogia: `.clasp.json` + scripts de deploy como config do ambiente       |
| **CQRS**                     | Command Query Responsibility Segregation — separar leitura de escrita             | `obter*()` vs `processar*()/salvar*()` no CCBJ                            |
| **Async-First**              | Operações demoradas são desacopladas via fila                                     | Potencial: operações de relatório como jobs assíncronos                   |
| **Backoff Exponencial**      | Aumentar o tempo de espera progressivamente em retentativas                       | Já implementado em `obterLockComRetry()`                                  |
| **Idempotência**             | Executar a mesma operação múltiplas vezes produz o mesmo resultado                | `gerarId()` garante unicidade; verificação de conflito previne duplicatas |
| **Feature Flag**             | Configuração que habilita/desabilita funcionalidade sem deploy                    | Oportunidade: coluna na sheet `Configuracoes` para flags de features      |
| **Golden Path**              | Caminho recomendado e simplificado para realizar uma tarefa                       | O formulário de reservas é o golden path do CCBJ                          |

---

## Referências e Fontes

- 📹 [I was laid off by Atlassian — YouTube](https://youtu.be/55pTFVoclvE) — Vasilios Syrakis, Mai/2026
- 🔧 [Sovereign — Atlassian Developer](https://developer.atlassian.com/platform/sovereign/) — Control plane open-source para Envoy
- 📖 [Atlassian: How we migrated Bitbucket to Envoy](https://www.atlassian.com/blog/atlassian-engineering/how-we-migrated-bitbucket-cloud-to-envoy-proxy)
- 🌐 [xDS Protocol — Envoy Docs](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/dynamic_configuration)
- 📰 [Greek Engineer Laid Off by Atlassian — GreekReporter](https://greekreporter.com/2026/05/19/greek-engineer-laid-off-atlassian-reveals-infrastructure-software-giant/)
- 🔍 [Platform Engineering — Atlassian](https://www.atlassian.com/developer-experience/platform-engineering)

---

_Skill gerada em 2026-05-22 para o projeto `sistema-gestao-cultural-ccbj` do CCBJ._  
_Atualizar conforme o sistema evolui e novos padrões forem incorporados._
