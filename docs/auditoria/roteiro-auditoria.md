# AUDITORIA ERP Cultural SaaS v2 — Roteiro Vivo
> Deploy atual: s151 (pendente push) fix/feat: Reservas — performance paralela, lista=hoje, form modal, mapa race condition, espaços com badge andar, buscarPorId no backend · s150 @1095 (feat: Estúdio de Análises Series Builder — múltiplas séries com filtros independentes, merge multi-coluna, Widget Editor com filtros de data/setor por widget) · s149 @1094 (feat: Quadros mind map evoluído — toolbar, colapsar/expandir, arraste manual, setas fine-tune) · s148 @1094 (feat: Biblioteca dc-icon 156 SVG + logos institucionais + web component) · s147 @1092 (fix: flyout lápis/marcador/pincel expandido fora da toolbar) · s146 @1091 (fix crítico: AnaliseEstudioUI IIFE crash — todos botões restaurados; Dashboard: sidebar lateral, dados ao vivo, filtros setor+datas) · s145 @1087 (Estúdio de Análises v6: filtro de período, 22 sugestões, catálogo 35 datasets, fix definitivo onclick) · s144 @1083 (SVG Medidor/Radar/Combinado; fix onclick sugestões por índice) · s143 @1079 (Estúdio de Análises v5: Dashboard modernizado — drag & drop, 7 tipos widget, templates, sugestões, aba Análises removida) · s142 @1073 · s141 @1072 · s140 @1071 · s139 @1070 · s138 @1069 · s137 @1066 · s136 @1065 · s135 @1063 · s134 @1054 · s133 @1053 · s132 @1052 · s131 @1051 · s130 @1050 · s129 @1049 · s128 @1048 · s127 @1045 · s126 @1044 · s125 @1037 · s118 @1036
> Claude dirige a auditoria — não perguntar qual módulo seguir.

---

### Estado atual: s151 — fix/feat Reservas de Espaço (performance + UX + bugs)

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1095 | s150 | **AnaliseEstudioUI** (index.html): Series Builder — modo `series` com toggle `Manual/CSV | Séries` no painel de dados do editor. Cada análise salva `{modoEditor, series:[{dsId,label,cor,filtros:{de,ate,setor}}]}`. `_gerarComSeries` faz fetch paralelo de todas as séries via `GAS.analise.importarDados`; `_mergeSeriesResult` une rótulos e monta matriz `[dimensão, s1, s2, …]`. `_abrirModalSerie` modal com select de dataset (optgroups por módulo, sem Cruzamentos), rótulo, swatch de cor e filtros por série. `visualizarAnalise` detecta `modoEditor==='series'` e faz fetch paralelo antes de renderizar. Fix backend: `ctrl_analise_widget_dados` passa `setor` ao filtro. **Widget Editor**: filtros `de`/`ate`/`setor` por widget — `_weConfirmar` persiste em `w.filtros`; `_dashCarregarWidgetPreview` aplica filtros ao buscar dados ao vivo. |

### Estado anterior: s147–s149 — Quadros mind map + dc-icon + fix flyout

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1094 | s149 | **QuadrosUI** (index.html): mapa mental evoluído — toolbar dedicada (adicionar filho/irmão, editar, colapsar/expandir, centralizar, remover), arraste manual de nodos com offsets `dx/dy`, setas de ajuste fino, estado `collapsed` retrocompatível. |
| @1094 | s148 | **dc-icon** (icons.html): biblioteca 156 SVG (Lucide ISC + Tabler MIT) + 6 logos institucionais vetorizados; web component `<dc-icon>`; integração no banner + sidebar footer. |
| @1092 | s147 | **QuadrosUI** (index.html): flyout do grupo de desenho (lápis/marcador/pincel) cortado pelo `overflow-y:auto` do `ftb`. Fix: flyout appendado ao `wrap`; posição via `getBoundingClientRect`. |

### Estado anterior: s146 — fix crítico AnaliseEstudioUI + Dashboard Builder melhorado

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1091 | s146 | **fix crítico**: `_dashSetFiltroSetor` e `_dashSetFiltroDatas` referenciadas no return da IIFE AnaliseEstudioUI mas não implementadas → ReferenceError que crashava o bloco `<script>` inteiro impedindo `App.iniciar()` → todos os botões de todos os módulos (inclusive Quadros) ficavam quebrados. Funções implementadas. **Dashboard Builder** (index.html): sidebar lateral `.db-widget-sidebar` (position:fixed, slide-in from right) substitui modal central no editor; `_weCancelarSidebar`; `_dashCarregarWidgetPreview` carrega dados ao vivo ao adicionar widget; `.db-filtro-bar` com filtros de setor (`_dashSetFiltroSetor`) + datas custom (`_dashSetFiltroDatas`). Backend: `analise_controller.gs` aceita `params.setor` e aplica `_analise_filtrar_por_setor`. |
| @1087 | s145 | **AnaliseEstudioUI** (index.html): barra `.db-periodo-bar` com 5 presets de filtro de período (Tudo/30d/3m/6m/Ano) — `_dashSetFiltroTempo` + `_dashRecarregarWidgets` passam `de`/`ate` a todos widgets dinâmicos. `_dashSugestoes()` expandida para 22 sugestões cobrindo todos módulos (Ações, Público, Pessoas, Tarefas, Reuniões, Financeiro, Espaços, Comunicação, Cruzamentos). `_CATALOGO_LOCAL` expandido para 35 datasets (sincronizado com backend). Fix definitivo onclick: `_dashSugArr` + `_dashAddSugestaoByIdx`. |
| @1085 | s144c | **AnaliseEstudioUI** (index.html): `_CATALOGO_LOCAL` expandido — 7 datasets de backend (`ativos_status`, `tarefas_prioridade`, `contratos_status`, `contratos_fonte`, `presencas_acao`, `balcao_tipo`, `balcao_setor`) adicionados com módulo e label corretos; comentários de seção no catálogo. |
| @1083 | s144 | **AnaliseEstudioUI** (index.html): `_svgMedidor` (gauge semicircular SVG, arco -210°→30°, KPI central), `_svgRadar` (teia de aranha SVG, polígonos regulares por categoria), `_svgCombinado` (barras + linha sobreposta, 2 séries); fix onclick sugestões: `_dashSugArr` indexado, `_dashAddSugestaoByIdx(i)` substitui `JSON.stringify` inline — elimina risco de injeção. Quadros v6 / regra de vínculos / 7 novos datasets backends (s144/s144b). |
| @1079 | s143 | **AnaliseEstudioUI** (index.html): Dashboard Builder v5 — drag & drop HTML5 para reordenar widgets (`_dashDragStart/Over/Drop/End`); 7 tipos de widget (+Texto, Imagem, Forma SVG); 8 formas geométricas vetoriais (`_renderFormaWidget`); 6 tamanhos de coluna (+3/4); galeria modernizada (hero section + cards `db-card2` com preview de blocos coloridos); 7 templates pré-prontos (`_DB_TEMPLATES`); 8 sugestões do sistema com datasets reais clicáveis; Widget Editor redesenhado com `db-tipo-grid`; aba "Análises" removida — módulo foca exclusivamente em dashboards. |
| @1073 | s142 | **AnaliseEstudioUI** + **analise_controller.gs**: Dashboard Builder completo — aba "Dashboards" na galeria; 4 tipos de widget (Gráfico, KPI Card, Tabela, Separador); grid flexível 5 tamanhos; Widget Editor Modal com dataset optgroups + agregação + cor; Dashboard View com dados ao vivo em paralelo; visibilidade + compartilhamento por pessoa/setor/cargo; backend `ANALISE_DASHBOARD_ITEMS`; **fix [object Object]**: `_compTipoChange` e `_dashCompTipoChg` extraem `s.nome||s.id` dos objetos `boot.setores`. |
| @1072 | s141 | **QuadrosUI** (index.html): conector inteligente com snap a 4 âncoras por forma + etiqueta editável por duplo clique; 8 novas figuras (triângulo, hexágono, pentágono, estrela, callout, marcador, pincel, conector); estilo de linha (sólida/tracejada/pontilhada) na barra inferior; 14 templates em 4 categorias; vincular tarefa (busca GAS.tarefas), vincular pessoa (modal manual), dados do sistema (quadro/ação/reunião/tarefas/indicador como widget). |
| @1071 | s140 | **AnaliseEstudioUI** + **analise_controller.gs**: cruzamento livre de qualquer par de datasets via "Cruzar com…"; modo Ao vivo (re-busca ao abrir); Meu Painel com pin e localStorage; picker visibilidade (Privada/Compartilhada/Pública) com destinatários por pessoa/setor/cargo; `donoEmail` gravado no backend; `_analise_podeVer()` filtra por email/setor/cargo; proteção de edição por não-dono. |

### Estado anterior: s139 — Quadros v4: bugs corrigidos + templates + pan

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1070 | s139 | **QuadrosUI** (index.html): Bug 1 CORRIGIDO — `_drawShape` movida ao escopo externo do IIFE (apresentação deixou de crashar). Bug 2 CORRIGIDO — `_resizeObserver` com `disconnect()` em `_limparEventosGlobais` (null.zoom ao abrir em Ações/Reuniões). Bug 3 CORRIGIDO — pan ao arrastar canvas vazio (select + nenhum hit → `isPanning`). Abas de categoria removidas da listagem (só Todos + Vinculados). 8 templates internos via botão "widgets" na toolbar: Mapa Mental, Brainstorm, Kanban, SWOT, Fluxograma, Design Thinking, Cronograma, 5W2H. Shape `diamond` adicionada. Frame aceita `frameFill`/`frameColor`; rect/circle aceitam `fill`. |

### Estado anterior: s138 — Estúdio de Análises v2

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1069 | s138 | **AnaliseEstudioUI**: catálogo 27 datasets, 9 tipos gráfico (incl. Empilhadas, Donut, Funil), cruzamento multi-módulo, stats strip, ajustes avançados, sugestão de tipo. |

### Estado anterior: s137 — Quadros v3: toolbar flutuante moderna, sem Miro/Napkin

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1066 | s137 | **QuadrosUI** (index.html): toolbar flutuante estilo Excalidraw (painel vertical ícones, barra cores+espessura, zoom). Miro/Napkin removidos; tipo sempre interno. `_setTool` corrigido: classe `.ativa` em todos 11 botões (antes 8 — sticky/frame/table excluídos). Bug crítico: `_renderQuadrosReuniao` usava `_CATS` privado do QuadrosUI (TypeError); corrigido com `_QDRO_CAT_LBL` local. Modal simplificado: sem Tipo/URL/Napkin; Categoria só em modo edição. |

### Estado anterior: s136 — Estúdio de Análises Visuais no BI

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1065 | s136 | **AnaliseEstudioUI** (index.html): nova aba "Análises" no BI. Galeria com miniatura SVG. Editor de tabela multi-série. 6 tipos SVG: Barras, Barras Horizontal, Linha, Area, Pizza, Dispersão. Import CSV + import ERP (operacional/financeiro/estoque). Visualizador fullscreen. **analise_controller.gs** novo: listar/salvar/excluir/importar_dados em PropertiesService. GAS.analise namespace. |
| @1063 | s135 | **QuadrosUI** (index.html): Napkin + Miro, ferramentas canvas, apresentação, cross-module sem quebra de fluxo. |
| @1061 | s135 | **QuadrosUI** (index.html): campos `tipo/urlExterna/napkinPrompt/categoria` no form. Miro: URL share → live-embed automático. Napkin: URL via `app.napkin.ai/?text=...` do prompt. 12 categorias visuais dinâmicas por tipo (`_CATS_BY_TIPO`). Overlay iframe `#qdro-ext-overlay` z-index:1500. Ferramentas: Sticky Note (7 cores, drop-shadow, word-wrap, paleta), Frame/Slide (borda tracejada roxa, label via `_modalInput`), Tabela (grid configurável). Borracha: closest-point-on-bbox + preview círculo vermelho. Apresentação: `apresentarCanvas()` dark overlay pan/zoom/ESC + `apresentarExterno()` iframe fullscreen. Integração Ações: aba "Quadros" no painel, `_novoQuadroAcao` abre `#qdro-modal` (z-index:1100) sobre painel (z-index:1000) sem fechar. Integração Reuniões: aba "Quadros" no modal, `_novoQuadroReuniao` abre `#qdro-modal` sobre modal sem fechar. `QuadrosUI.setAfterSaveCb()` exposto — callback pós-save atualiza lista da aba correta sem navegar. |

### Estado anterior: s134 — Sessões Interativas v3: templates, gamificação, wizard, votação, ranking, timer, identidade

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1054 | s134 | **templates_repository.gs** (novo): 4 templates sistema + CRUD org. **ctrl_sessao.gs**: `listarTemplates`, `criarTemplate`, `atualizarTemplate`, `excluirTemplate`, `criarDeTemplate`, `ranking`; `publica_entrar` retorna modoIdentidade+gamificacaoHabilitada; `publica_responder` calcula correta+pontos+bônus velocidade. **sessao_interativa_repository.gs**: schema estendido (gamificacao/modoIdentidade/templateId; resposta ganha avatar/apelido/correta/pontos_ganhos/tempo_resposta). **setup.gs** registra TemplatesInteratividadeRepository. **index.html**: wizard 3 passos (galeria → config → builder), ranking ao vivo, timer countdown, "Salvar como Template". **portal_sessao_participante.html**: reescrita completa com tela de identidade, 30 avatares emoji, tipo votação, feedback quiz, tela ranking. |

### Estado anterior: s133 — Sessões Interativas v2: UI portal redesenhado, nuvem visual, barras, projeção, QR real

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1053 | s133 | **Portal participante** redesenho completo. **ctrl_sessao.gs**: correções de ativar/resultados. **Painel host**: QR code real (qrcode.js). **SessaoUI**: reescrita com nuvem de palavras visual, gráficos de barras, modo projeção (fullscreen). |

### Estado anterior: s132 — BI heat: CEP como chave de precisão, query logradouro+bairro+cidade

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1052 | s132 | **_biGeocodificar** nunca usa CEP na query — logradouro+bairro+cidade+UF+Brasil sempre. **geoKey = cep:XXXXXXXX** separado do bairroKey; geocodificado com logradouro+bairro+cidade → precisão por rua. **geo6:cep:*** substitui geo3:cep:* (CEP-puro). Heat usa geoKey || bairroKey (per-CEP > bairro). |
### Estado anterior: s131 — BI heat: mesma base de coordenadas que bairros/cidades

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1051 | s131 | **Frontend** (index.html, _addHeatOverlay): 
.geoKey \|\| r.bairroKey → 
.bairroKey \|\| r.geoKey — mesma prioridade de _renderBairros. **Backend** (i_demografico_controller.gs): geoKey do registro passa a ser airroKey quando disponível. Heat, bairros e cidades usam a mesma fonte de coordenadas. |

### Estado anterior: s130 — BI heat overlay: reverte query logradouro+número (coordenadas erradas)

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1050 | s130 | **Revertida query logradouro+número** (`bi_demografico_controller.gs`): query `Logradouro, N - CEP, Brasil` de s128 fazia o Maps resolver nomes genéricos ("Rua A", "Rua Dois") em outros estados — heat overlay aparecia no Goiás e na Bahia. Voltou para CEP puro (`NNNNN-NNN, Brasil`). Cache bumped: `end:*` usa `geo5:` (purga `geo3:end:*` e `geo4:end:*`). |

### Estado anterior: s129 — BI Demográfico: sem limite de geocodificações + erros não cacheados

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1049 | s129 | **Sem cap** (`bi_demografico_controller.gs`): removida `_BI_GEO_MAX_NOVOS` e todos os seus checks — todos os CEPs/endereços são geocodificados em cada chamada sem limitação. **Erros não cacheados**: `{erro: true}` não é gravado no cache; o endereço é retentado na próxima chamada (antes ficava permanentemente invisível no mapa). |

### Estado anterior: s128 @1048 — BI Demográfico: geocodificação com CEP + logradouro + número

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1048 | s128 | **Query com endereço completo** (`bi_demografico_controller.gs`): `_biGeocodificar` agora usa `Logradouro, N - NNNNN-NNN, Brasil` quando CEP + logradouro + número estão todos disponíveis. Antes usava só CEP, posicionando o pino no centro da face de quadra (erro de ~50–200 m). Cache bumped seletivamente: `end:*` passa de `geo3:` para `geo4:` (bust apenas dos endereços precisos; bairros/CEP mantêm `geo3:`). Purga de `geo3:end:*` adicionada ao passo de limpeza do `modifyJSON`. |

### Estado anterior: s127 @1045 — Pessoas/RH: endereço histórico backend + campos readonly + BI geocodificador CEP puro + máscara CEP

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1045 | s127 | **Histórico de endereço silencioso** (`pessoas_engine.gs`, `colaborador_repository.gs`): `salvar()` detecta mudança de endereço comparando com snapshot `antes`; arquiva endereço anterior em `enderecoHistorico[]` com `dataInicio`/`dataFim`. `enderecoHistorico` adicionado a `_CAMPOS_PROTEGIDOS`. **Campos readonly** (`index.html`): logradouro/bairro/cidade/UF readonly por padrão; botão "Editar manualmente" visível apenas para `rh`/`admin`/`superadmin`. **Geocodificador CEP puro** (`bi_demografico_controller.gs`): query era `"Rua L, 61659-170, Brasil"` — geocodificador ignorava CEP e resolvia nome de rua em ponto errado (7 quarteirões). Corrigido para `"61659-170, Brasil"` (CEP identifica face de quadra no BRA). Cache key `geo3:` substitui `geo:` e `geo2:`; purga das entradas legadas. **Máscara CEP** (`index.html`): `mascaraCepValor()`/`mascaraCepInput()` globais em `#rh-pf-cep` e `#p-cep`. |

### Estado anterior: s126 @1044 — Infraestrutura: Patrimônio e Estoque deixam de ser aba duplicada

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1044 | s126 | **Bug `abrirTab` em `EspacosUI`** (`index.html`): linha `var painelKey = tab === 'ativos' ? 'estoque' : tab` redirecionava o painel do botão "Patrimônio" para `esp-tab-estoque` (o mesmo painel do botão "Estoque"), tornando as duas abas idênticas. Corrigido para `var painelKey = tab` (sem alias). Lazy-load correspondente corrigido de `EstoqueUI.abrirSubTab('patrimonio')` para `AtivosUI.carregar()`. Resultado: "Patrimônio" exibe `esp-tab-ativos` (`AtivosUI` — bens/tombamento/localização) e "Estoque" exibe `esp-tab-estoque` (`EstoqueUI` — almoxarifado/saldo/movimentações). |

### Estado anterior: s118 @1036 — Dashboard: 3 bugs silenciosos corrigidos

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1036 | s118 | **NaN% no Estratégico** (`index.html`): código antigo fazia `Math.round((kpis.taxaOcupacaoEspacos||0)*100)+'%'` — objeto KPI multiplicado por 100 = NaN. Corrigido: variáveis `pctOcup/pctPrazo/pctExec` extraem `.percentual` do sub-objeto; `taxaConclusaoPrazo` → `taxaConclusaoNoPrazo`; NPS usa `.media` (null → '—'). **'Erro ao carregar' no Operacional** (`dashboard_controller.gs`): `MetricsEngine.obterDashboard()` legado lia a planilha por índice de coluna hardcoded (16 colunas vs 26+ no schema atual), retornando erro. Substituído por cálculo direto no JSON já carregado: `top5Salas`, `top5Setores`, `ultimos6Meses` por agrupamento de `r.sala`/`r.setor`/`r.data`. **Insight de execução orçamentária nunca disparava** (`dashboard_controller.gs`): condição `m.kpis.execucaoOrcamentaria < 0.3` comparava objeto com número (NaN < 0.3 = false sempre). Corrigido para `.execucaoOrcamentaria.percentual < 30`. |

### Estado anterior: s113 @1031 — Datas Comemorativas: causa raiz real do "Cannot read properties of undefined (reading 'map')" corrigida

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1031 | s113 | O fix de s112 desmascarou o erro real: ao abrir Administração → Cadastros Base → Datas Comemorativas, aparecia "Erro ao carregar: Cannot read properties of undefined (reading 'map')". Causa raiz: em `config_admin_service.gs`, `var _DATAS_COMEMORATIVAS_DEFAULT` (array das 34 datas pré-cadastradas) estava declarada **depois** do `return {...}` que expõe a API do módulo — como é um `var` de escopo do IIFE (não function declaration hoisted por inteiro), a atribuição nunca executava porque o `return` já tinha encerrado a função; a var ficava `undefined` para sempre e `_mergeComDefaults()` quebrava em `.map(...)`. Bug pré-existente desde a fase s90/s93, sempre mascarado como "lista vazia" até o fix de s112 expor a mensagem real. Reproduzido isoladamente em Node (carregando o arquivo real com stubs dos deps) para confirmar a causa antes de corrigir. Fix: array movido para antes do `return`. Revalidado em Node: `listarDatasComemorativas()`/`getDatasComemorativas()` retornam as 34 datas. |

### Estado atual (fase anterior): s112 @1030 — Admin: Acessos Pendentes preso em loading + erro real de Datas Comemorativas mascarado

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1030 | s112 | Usuário reportou print do painel Administração: "Acessos Pendentes" travado em "Carregando solicitações…" e aba "Datas Comemorativas" exibindo "Nenhuma data cadastrada" (deveria sempre mostrar as 30 datas pré-cadastradas via `_mergeComDefaults`, fase s93). Causa #1: `_carregarPendentes()` só executava dentro de `IdentidadeAdmin.carregar()` (aba "Identidade Visual"), mas o card de pendentes é renderizado fora do sistema de abas — corrigido expondo `IdentidadeAdmin.carregarPendentes()` e chamando direto em `AdminCadastrosUI.aoAbrir()`. Causa #2: `DatasComemorativasAdmin.carregar()` tratava `r.ok===false` como lista vazia sem nunca mostrar `r.error.message` — como o backend sempre retorna os 30 defaults, uma lista vazia só pode vir de exceção capturada por `GasResponse.wrap` (ex. `_assertAdmin` negando acesso); agora a mensagem de erro real é exibida. Causa raiz definitiva encontrada e corrigida em s113 @1031. |

### Estado atual (fase anterior): s111 @1029 — Auditoria de adaptabilidade mobile: TaskHub, RH/Perfil, classes CSS órfãs

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1027 | s111 | Meu Perfil: cabeçalho fixo + cards em carrossel horizontal (swipe) em mobile. TaskHub (form "Nova Tarefa"): grids `minmax()` que somavam >540px colapsam para 1 coluna (`.tf-form-grid`). RH/Perfil (grids de endereço CEP/Logradouro/Número/UF): colunas fixas colapsam para 1 coluna (`.rh-endereco-grid`, 3 pontos). Classes CSS órfãs sem nenhuma definição em todo o arquivo corrigidas: `.table-wrap` (6 usos) e `.data-table` (4 usos, painéis admin/Observabilidade) — mesmo padrão de bug já visto em s109. |
| @1028 | s111 | Ajuste pós-feedback: @1027 redesenhou visualmente o cabeçalho/ações do Meu Perfil mobile além do pedido (avatar 56px, botão sem texto, barra de ações fixa, cards com scroll interno). Revertido para o visual original — mantido só `position:sticky` no cabeçalho. |
| @1029 | s111 | Ajuste 2 pós-feedback: @1028 ainda fazia cada card virar sua própria página de swipe (via `display:contents`). Usuário pediu apenas 2 colunas de swipe — "Dados Profissionais" e "Dados Pessoais" (2ª coluna com os cards empilhados verticalmente dentro dela). `.perfil-col-edit` volta a ser bloco normal e passa a ser, ela mesma, o 2º item do swipe horizontal. |

### Estado atual (fase anterior): s110 @1026 — Auditoria Visual: mismatch JSON↔Sheet, rollback quebrado, bug do 4º argumento

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1026 | s110 | Ver `AUD-01`/`AUD-02`/`AUD-03`/`AUD-04` abaixo (seção Admin). Resumo: `ctrl_auditoria_listar/rollback/detectar_suspeitos` reescritos para ler do `AuditoriaStore` (JSON) em vez da aba "Auditoria" (Sheet, sempre vazia); `_persistir()` passa a extrair `antes`/`depois`; mapa de rollback corrigido (`reservas` removido por apontar a arquivo órfão); bug do 4º argumento (`email`) descartado em `AuditoriaService.registrar()` corrigido em 6 arquivos; snapshots antes/depois adicionados em `pessoas_engine.gs` e `tarefa_engine.gs`; gaps reais de cobertura corrigidos em `HoleriteRepository.marcarPago` e `AfdLayoutRepository`. |

### Estado atual (fase anterior): s109 @1025 — Observabilidade: FSM espúria (férias/colaborador/tarefas/reservas) + tabela "Uso por Módulo" sem CSS

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1025 | s109 | `pessoas_engine.gs`: `_transitarColaborador`/`_transitarFerias` ganham guarda de idempotência (no-op se já no status alvo) — elimina `ativo→ativo` e `ferias→ferias` geradas por `concluirFerias`/`aprovarFerias`. `reserva_engine.gs`: mesma guarda em `mudarStatus` — elimina `confirmado→confirmado` por duplo-clique. `tarefa_engine.gs`: `_TRANSICOES_TAREFA` passa a aceitar `pendente→concluida` e `bloqueada→concluida`, alinhando a FSM ao botão "Concluir" que a UI já exibia para qualquer tarefa ativa. `index.html`: tabela "Uso por Módulo" trocou classes órfãs `table-lista`/`table-responsive` (sem CSS definido) por `tabela`/`table-wrap` (padrão estilizado do resto do sistema) + larguras de coluna explícitas. |

### Estado atual (fase anterior): s108 @1024 — Pessoas/RH vínculo 3 vias + labels setor

| Deploy | Fase | O que foi implementado |
| --- | --- | --- |
| @1024 | s108 | `index.html`: `_badgeSetor` sem ícone e sem repetição por estouro de paleta; `RhUI.aoAbrir` resiliente; lista de colaboradores mostra erro visível; edição busca ficha completa via `GAS.pessoas.obter`; sync front usa `_usuariosAtivos`. `acesso_service.gs`: aprovação de primeiro acesso cria/atualiza ficha RH pelo e-mail com nome completo e setor; Usuários/Permissões sincroniza/cria ficha RH. `pessoas_controller.gs`: Form colaborador sincroniza usuário por e-mail; Meu Perfil sincroniza `nomeApelido`. |

## REGRAS DE ENCERRAMENTO DE FASE

> **Git ANTES do deploy.** Nunca deploar código sem commit.

```
1. Atualizar PROGRESS.md + roteiro-auditoria.md   ← PRIMEIRO
2. git add <código + docs>
3. git commit -m "fix/feat: Fase X.Y — ..."
4. clasp push
5. clasp deploy --deploymentId AKfycbzVKQ8fEMBZquOytumFLsb3dIx3DuIZh1cFYe4ywFCoMUXSFewuhZCpy-V8fjLkbe_j
6. Smoke test no browser
7. git push
```

### Checklist de auditoria antes do deploy
```
[ ] Zero prompt()/confirm()/alert() — usar _modalInput()/_abrirModalConfirmar()/Toast.erro()
[ ] GAS.* namespace — todos os ctrl_* têm binding; editar despacha para atualizar
[ ] CSS — zero classes sem definição correspondente
[ ] IDs de DOM — regex de sanitização idêntica em todos os pontos
[ ] FsmGuardian.transitar() — chamado antes de toda atualizarStatus*()
[ ] Modais — background:var(--surface) opaco; overlay ≥ rgba(0,0,0,.4)
[ ] BtnGuard.auditar() — retorna "✅ todos protegidos"
[ ] Datas — toda data visível passa por fmtDataPtBR(); sem ISO cru
```

---

## RASTREADOR DE TESTES REAIS

> Antes de pedir ao usuário para testar algo, verificar esta tabela.
> **Legenda:** ✅ testado | 🔲 pendente | ⚠️ bug confirmado | ❌ não funciona

### Módulo 01 — Home
| Item | Status | Sessão |
|---|---|---|
| Tela inicial carrega | ✅ | 2026-05-31 |
| Banner de boas-vindas, espaços, setores, módulos, status | ✅ | 2026-05-31 |
| Acessos rápidos (Nova Ação, Infraestrutura, Financeiro) | ✅ fixos | 2026-05-31 |

### Módulo 02 — Sidebar
| Item | Status | Sessão |
|---|---|---|
| Menu carrega sem erro | ✅ | 2026-05-31 |
| Menu extenso sem agrupamento | ⚠️ SIDEBAR-01 | 2026-05-31 |

### Módulo 03 — Tarefas
| Item | Status | Sessão |
|---|---|---|
| View carrega, filtros e métricas | ✅ | 2026-05-31 |
| Formulário Nova Tarefa | ✅ (campos básicos) | 2026-05-31 |
| Responsável texto livre | ⚠️ TAR-02 | 2026-05-31 |
| Sem campo acaoId | ⚠️ TAR-03 | 2026-05-31 |

### Módulo 04 — Pessoas / Colaboradores
| Item | Status | Sessão |
|---|---|---|
| Lista de colaboradores | ✅ PES-01 CORRIGIDO — lerJSON alias adicionado | 2026-06-01 |
| Formulário de colaborador | 🔲 | — |

### Módulo 05 — Afastamentos e Ocorrências
| Item | Status | Sessão |
|---|---|---|
| Testes completos | 🔲 | — |

### Módulo 06 — PCCS e Cargos
| Item | Status | Sessão |
|---|---|---|
| PCCS acessível em RH/DP | ✅ | 2026-05-31 |
| Estrutura de abas (11 abas, 3 linhas) | ⚠️ ESTR-02 | 2026-05-31 |

### Módulo 07 — Holerite
| Item | Status | Sessão |
|---|---|---|
| Acessível no menu | ✅ | 2026-05-31 |
| Testes completos | 🔲 | — |

### Módulo 08 — Encargos
| Item | Status | Sessão |
|---|---|---|
| Tabelas INSS/IRRF exibem dados atuais | ✅ | 2026-05-31 |
| Botão "Aplicar tabela oficial" travado em loading eterno | ✅ CORRIGIDO — `aplicarOficial(done)` chama `done()` após abrir modal | 2026-06-14 |

### Módulo 37 — Ponto Eletrônico
| Item | Status | Sessão |
|---|---|---|
| View carrega com abas | ✅ | 2026-05-31 |
| Sub-abas Custo CLT e Rescisão deslocadas | ✅ CORRIGIDO @PON-01 | 2026-06-08 |
| Importação AFD — 0 batidas confirmadas (layout posições erradas) | ✅ CORRIGIDO @707 | 2026-06-09 |
| reverterImportacao não removia brutos (bloqueava re-importação) | ✅ CORRIGIDO @707 | 2026-06-09 |

### Módulo 09 — Infraestrutura / Reservas
| Item | Status | Sessão |
|---|---|---|
| View carrega sem erro | ✅ | 2026-05-31 |
| Métricas nível-1 e nível-2 com MetricsToggle | ✅ | 2026-05-31 |
| Modo Lista, Agenda, Diagrama, Mapa | ✅ | 2026-05-31 |
| Formulário Nova Reserva | ✅ | 2026-05-31 |
| Modal Lote (4 sub-modos) | ✅ CORRIGIDO s17 F51 | 2026-06-03 |
| FSM completo (Pendente→Confirmada→Habilitada→Em uso→Concluída) | ✅ | 2026-05-31 |
| Config → Espaços, Itens, Horários, Mapa | ✅ | 2026-05-31 |
| Filtro data default = hoje | ✅ ESP-02 CORRIGIDO s16 | 2026-06-01 |

### Módulo 09 — Infraestrutura / Aprovações
| Item | Status | Sessão |
|---|---|---|
| 4 abas carregam | ✅ | 2026-05-31 |
| Sem badge de contador por aba | ⚠️ APR-01 | 2026-05-31 |

### Módulo 09 — Infraestrutura / Chaves
| Item | Status | Sessão |
|---|---|---|
| View carrega, métricas, lista de protocolos | ✅ | 2026-05-31 |
| Formulário Nova Retirada (setor/sala/responsável selects) | ✅ CORRIGIDO F60+61 @476 | 2026-06-03 |
| Devolução — modal inline | ✅ CHV-03 CORRIGIDO s16 @387 | 2026-06-01 |

### Módulo 09 — Infraestrutura / Empréstimos
| Item | Status | Sessão |
|---|---|---|
| View carrega, métricas, lista vazia | ✅ | 2026-05-31 |
| Formulário Solicitar Empréstimo (setor select) | ✅ EMP-03 CORRIGIDO F58+59 @474 | 2026-06-03 |

### Módulo 13 — Ações Culturais / Lista e Kanban
| Item | Status | Sessão |
|---|---|---|
| Kanban carrega, métricas, filtros | ✅ | 2026-05-31 |
| Formulário Nova Ação (form-control/form-label) | ✅ ACO-12/17/18/19/20 CORRIGIDOS s17 | 2026-06-03 |
| Modal Editar Ação | ✅ | 2026-05-31 |
| Botão Editar (caminho direto) | ✅ ACO-05 CORRIGIDO | 2026-06-01 |
| Card exibe "nm" quando responsável sem @ | ✅ ACO-02 CORRIGIDO s16 @387 | 2026-06-01 |
| Setor não auto-preenchido em Nova Ação | ✅ ACO-03 CORRIGIDO s16 @387 | 2026-06-01 |

### Módulo 13/14 — Painel da Ação (abas internas)
| Item | Status | Sessão |
|---|---|---|
| Painel abre na aba Visão Geral | ✅ | 2026-05-31 |
| Aba Tarefas, Reservas, Contratos, Equipe | ✅ estado vazio | 2026-06-01 |
| Aba Financeiro (3 cards R$ 0,00) | ✅ | 2026-06-01 |
| Aba Contratações (carrega; botão "+ Nova Contratação") | ✅ ACO-07r CORRIGIDO s17 F50 | 2026-06-01 |
| Aba Mapa do Evento | ✅ 2 mapas listados | 2026-06-01 |
| Transições de status — Visão Geral | ✅ | 2026-06-01 |

### Módulo 21 — Contratações
| Item | Status | Sessão |
|---|---|---|
| View carrega com MÉTRICAS e 3 abas | ✅ | 2026-06-01 |
| Formulário "+ Nova" — 7 seções | ✅ | 2026-06-01 |
| Vínculo Financeiro — META e RUBRICA | ✅ CORRIGIDO s16 Fase 8 | 2026-06-01 |
| Setor Solicitante → select | ✅ CON-01 CORRIGIDO s17 F49 | 2026-06-03 |
| Nº Esboço → gerado automaticamente | ✅ CON-02 CORRIGIDO s17 F49 | 2026-06-03 |
| Salvar rascunho | ✅ CON-08 CORRIGIDO | 2026-06-01 |
| FSM e painel de detalhe | 🔲 | — |
| Aba Fornecedores | ✅ CON-05 CORRIGIDO | 2026-06-01 |
| Aba Habilitações → Pregões | ✅ CON-06/07 CORRIGIDOS s17 F52 | 2026-06-03 |

### Módulo 35 — Reuniões
| Item | Status | Sessão |
|---|---|---|
| View carrega (6 cards, 2 abas, toolbar) | ✅ | 2026-05-31 |
| Modal "Nova Reunião" — 5 abas mapeadas | ✅ | 2026-05-31 |
| FSM completo | 🔲 sem dados | — |
| Fluxo criação → encerrar → ata | 🔲 pendente | — |

### Módulo 43 — Admin
| Item | Status | Sessão |
|---|---|---|
| View principal | ✅ | sessão anterior |
| Aba Espaços, Setores, Categ.Itens, Módulos, Usuários | ✅ | 2026-05-31 |
| Aba Turnos → movida para Infraestrutura Config | ✅ ADM-08 CORRIGIDO s17 @446 | 2026-06-03 |
| Aba Features (toggles) | ✅ ADM-10 CORRIGIDO s16 Fase 6 | 2026-06-01 |
| Aba Provisionamento (wizard) | ✅ ADM-11 CORRIGIDO s17 F63 @490 | 2026-06-03 |
| Aba Banco de Dados → oculta não-SuperAdmin | ✅ ADM-04 CORRIGIDO s17 F63 @490 | 2026-06-03 |
| Aba Identidade Visual | ✅ | 2026-06-03 |
| Tab bar com scroll sinalizado | ✅ ADM-07 CORRIGIDO s17 F44 @430 | 2026-06-02 |
| Botão "Visualizar Cadastro" | ❌ ADM-12 — página em branco | 2026-05-31 |

### Módulo 38 — Meu Centro / TaskHub
| Item | Status | Sessão |
|---|---|---|
| View carrega, 3 abas | ✅ | 2026-05-31 |
| Meu Dia, Meu Time, Produtividade — estados vazios | ✅ | 2026-05-31 |
| Meu Dia com dados reais | 🔲 pendente | — |

### Módulo 32 — Pulse / Escuta
| Item | Status | Sessão |
|---|---|---|
| Pulse FAB — submissão | ✅ CORRIGIDO (PUL-01/02) | 2026-05-31 |
| Pulse — anti-spam | ✅ PUL-03 CORRIGIDO s17 @426 | 2026-06-02 |
| Pulse — turnos por ConfigService | ✅ PUL-04 CORRIGIDO s17 @424 | 2026-06-02 |
| Pulse — monitoramento | ✅ PUL-05 CORRIGIDO @424 · PUL-06 apenas contagem @426 | 2026-06-02 |
| Aba Painel — loading infinito | ✅ ESC-04 CORRIGIDO s16 F13 | 2026-06-01 |
| Modal "+ Nova Pesquisa" (expandido) | ✅ ESC-15 CORRIGIDO s17 F65 @507 | 2026-06-04 |
| Guia contextual in-app | ✅ ESC-12 CORRIGIDO s17 F64 @505 | 2026-06-04 |
| Aba Alertas — card explicativo | ✅ ESC-10 CORRIGIDO s17 F63 @490 | 2026-06-03 |
| Perfil Analítico removido | ✅ ESC-08 CORRIGIDO s17 F56 @460 | 2026-06-03 |
| Pulse — clima por setor vazio | ✅ PUL-07 CORRIGIDO @631 | 2026-06-06 |
| Pulse — aprovação por catálogo Admin/Setores | ✅ PUL-08 CORRIGIDO @633 | 2026-06-06 |

### Módulo 16 — Financeiro
| Item | Status | Sessão |
|---|---|---|
| View carrega com 4 abas (Contratos, Remanejamentos, Aditivos, Exportações) | ✅ | 2026-06-01 |
| MÉTRICAS com MetricsToggle | ✅ | 2026-06-01 |
| Painel do contrato (5 abas) | ✅ | 2026-06-01 |
| Histórico — Ver diff + Restaurar versão | ✅ FIN-12 CORRIGIDO @637 | 2026-06-06 |
| FSM do contrato — botões Suspender/Encerrar | ✅ FIN-14 CORRIGIDO s16 F17 | 2026-06-01 |
| FIN-07 — label renomeado "Total Previsto Ativo" | ✅ CORRIGIDO s17 F62 @480 | 2026-06-03 |
| Setor na Rubrica (nível correto) | ✅ FIN-19 CORRIGIDO @631 — `setor` preservado no mapeamento de `memoriaCalculo` em `adicionarRubrica` | 2026-06-06 |
| Flags de operação configuráveis | ✅ FIN-20 CORRIGIDO @631 — checkbox `voucher_uber` no form; badge no card; `flags` em `dados` | 2026-06-06 |

### Módulo 22/23 — Comunicação (RECE + Balcão)
| Item | Status | Sessão |
|---|---|---|
| View RECE carrega (5 cards, lista, filtros) | ✅ | 2026-06-01 |
| FSM sem passo revisão Comunicação | ⚠️ RECE-04 | 2026-06-01 |
| Botão "+ Novo Registro RECE" (arquiteturalmente incorreto) | ❌ RECE-16 | 2026-06-01 |
| Sem modo Agenda | ❌ RECE-17 | 2026-06-01 |
| View Balcão carrega (6 cards, formulário) | ✅ | 2026-06-01 |
| Aprovação final do material entregue | ❌ BAL-16 ausente no FSM | 2026-06-01 |

### Módulo 24 — Agentes Culturais
| Item | Status | Sessão |
|---|---|---|
| Sync Admin→sidebar | ✅ AGN-01 CORRIGIDO s16 Fase 6 | 2026-06-01 |
| View carrega | 🔲 pendente verificação | — |

### Módulo 25 — Acervo Digital
| Item | Status | Sessão |
|---|---|---|
| View carrega | ✅ | 2026-05-31 |
| Galeria, select ação, campo nome | ✅ ACV-01/07/08/11 CORRIGIDOS s16 F7/14 | 2026-06-01 |
| Stats MetricsToggle, filtros DS, botão refresh | ✅ ACV-03/04/05 CORRIGIDOS s17 | 2026-06-02 |
| Fluxo de salvamento | 🔲 | — |

### Módulo 34 — Reserva de Veículo
| Item | Status | Sessão |
|---|---|---|
| View carrega (Lista + Agenda + MetricsToggle) | ✅ | 2026-05-31 |
| Datas ISO→pt-BR, nome no card | ✅ CAR-05 CORRIGIDO @474 | 2026-06-01 |
| Sidebar "Reserva de Veículo" | ✅ CAR-02 CORRIGIDO s17 F42 @428 | 2026-06-02 |
| FSM — botões Concluir / Cancelar | ✅ | 2026-05-31 |
| Modal detalhes, passageiros, paradas, CAR-12/14 | ✅ CAR-08/09/10 CORRIGIDOS @637+@638 | 2026-06-06 |

**Legenda:** ✅ confirmado · 🔲 pendente · ⚠️ problema · ❌ não funciona / arquiteturalmente errado

---

## HISTÓRICO COMPACTO DE IMPLEMENTAÇÕES

| Deploy | Fase | Resumo |
|---|---|---|
| pendente | s88 — Indicadores+Ações | `contratos_engine`: `_gerarTrimestres` soma realizado; `recalcularRealizadoDeAcoes`; `listarParaVinculo`. `contratos_controller`: `ctrl_contratos_para_vinculo` + `ctrl_contratos_recalcular_realizado`. `acao_engine`: campos `vinculo{}` + `quantitativoRealizado`; `_recalcularVinculo` nos fluxos salvar/cancelar. `integracao_orquestrador`: `onAcaoConcluida` recalcula indicador. `index.html`: campos mensais 62px; badges % coloridos; grade com trimestres em DOM real-time; checkbox vinculação Ação→Indicador com cascata; `_recalcularInd` + funções _vinculo expostos nos returns dos IIFEs. |
| pendente | RH+ENC | (1) `resumoFeriasPorPeriodo`: `saldoOficial` calculado sem acordos (usa datas oficiais); rescisão usa `p.saldoOficial`. (2) `EncargosUI.aplicarOficial(done)`: `done()` chamado após abrir modal — desbloqueia botão "Aplicar tabela oficial" |
| @638 | CAR-09+CAR-10 | CAR-09: passageiros internos (select+tags) / externos (texto); backend passageirosInternos/Externos. CAR-10: paradas dinâmicas no form; rota.paradas[]; modal Saída→Paradas→Chegada com ícones dinâmicos |
| @637 | CAR-08+FIN-12 | CAR-08: linha "Setor Solicitante" no modal carro-det-overlay. FIN-12: histórico com diff modal + restauração de versão (backup automático antes de restaurar) |
| @584 | 79 | ctrl_reservas_criar: auto-cria SolicitacaoMaterial com reservaId (best-effort). Frontend: listarItens(estoque) no form de reserva; label "Materiais necessários"; toast com SOL-XXXX |
| @581 | 77 | TextFinder no DataGateway; cache em _getSheet; ESTOQUE key definitiva no repositório; schema Tipo+Tombado; devolverSolicitacao; ctrl_*_dashboard (4 módulos) |
| @579 | 76 | Compras/Aquisições migrado de Financeiro → Contratações; planilha MASTER→FINANCEIRO.SolicitacoesCompra; tab reposicionada |
| @566 | 75.1 | `migracao_estoque_v1.gs` (inspecionar + importar V1→V2). Dead code removido |
| @564 | 75 | `previsao_estoque_engine.gs` (taxaConsumo/cobertura/previsão). Sub-aba Pipeline. Alertas de estoque |
| @563 | 74 | `EstoqueUI` IIFE ~500 linhas. Tab Estoque em Infraestrutura com 5 sub-abas. `GAS.estoque` (15 bindings) |
| @561 | 73 | Backend Estoque: repositórios, engine, 15 ctrl_estoque_*. `fase73_estoque_prepararIndice()` |
| @550 | MAPA-MULTI | Multi-select nos mapas: Shift+click, rubber-band, Ctrl+C/V, Delete, Space+drag, grupo resize/rotate |
| @538 | ESP-FORM | `reservas-form-card` movido para fora de `res-modo-lista` — form visível em qualquer aba |
| @533 | PERM-01 | Agentes/Voluntários adicionados a `_MODULOS`/`_MATRIZ` em `permissoes_v2_engine.gs` |
| @519 | ESP-LOTE | Lote sincroniza form principal; `_atualizarDisponibilidadeSalas()` com optgroups |
| @518 | ESP/MAPA | Horário de espaço herdado do config global; viewBox +30px; paridade ferramentas mapa |
| @512 | CON-10 | Portal do Contratado: token + email automático ao fornecedor com link |
| @510 | SIM | `SimulacaoUI` IIFE + `simulacao_service.gs` + Ferramentas no Admin |
| @507 | ESC-15 | Modal "Nova Pesquisa" expandido (metodologia, periodicidade, participantes, canal) |
| @505 | ESC-12 | Guia contextual in-app na view Escuta |
| @490 | F63 | Wizard, Banco de Dados oculto, Alertas Escuta com card explicativo |
| @480 | F62 | FIN-07 renomeado; FIN-13 corrigido; ESC-11: saturação por dimensão |
| @476 | F60+61 | CHV/EMP/ACO: selects de espaço/responsável/setor |
| @474 | F58+59 | Setor→select em Chaves/Empréstimos/Ações; Tipo→select em Reservas |
| @466 | F57 | form-control/form-label em Ações; datepicker RECE contextualizado |
| @464 | F69 | Auto-confirmação reservas sem responsável; horário padrão do config |
| @460 | F56 | ESC-08 Perfil Analítico removido |
| @458 | F55 | `view-title`/`view-subtitle` em 7 módulos; ACO-27: cores FSM padronizadas |
| @456 | F54 | ACO-28: modal encerramento (público + realizações + comprovações) |
| @454 | F53 | DS global: botões/abas/cabeçalhos unificados |
| @446 | F51 | Lote ESP-13/15; Turnos → Infraestrutura; Config.Sistema consolidada |
| @430 | F44 | Tab bar nav (prev/next + fade); template de ata; SIS-11: nome no greeting |
| @428 | F42/43 | CAR-02; ACV: MetricsToggle, refresh, sem emojis |
| @426 | PUL | PUL-03/05/06: colaboradorId sempre persiste; monitoramento por contagem |
| @387 | F19-22 | ACO-02/03; CHV-03; ESP-02 corrigidos |
| @383 | F12-17 | FIN-17 cálculo benefícios; ESC-04/05; ACV-07/08/11; CAR-15; FIN-14 |
| @380 | F6-11 | AGN-01/ADM-10; ACV-01; CON-03/04; MAP-01/02/03; SIS-14 |
| @369 | F1-5 | ACO-16; CON-05/08; PES-01; lerJSON alias; APR-04 |

---

## BUGS ATIVOS

> Apenas não corrigidos. Bugs com ~~risco~~ foram removidos desta lista.

| ID | Módulo | Problema | Grav. |
|---|---|---|---|
| ~~HOME-01~~ | Home | ✅ CORRIGIDO — stats de sistema (espaços/setores/módulos/status) exibidas apenas para superadmin/admin; demais papéis veem cards contextuais | — |
| ~~HOME-02~~ | Home | ✅ CORRIGIDO — acesso rápido por papel: gestor/coordenador (Centro/Aprovações/Reuniões/Relatórios); colaborador (Centro/Tarefas/Reservar/Reuniões); admin (Nova Ação/Infraestrutura/Financeiro/Relatórios) | — |
| ~~HOME-03~~ | Home | ✅ CORRIGIDO — cards contextuais async: tarefas abertas, encaminhamentos pendentes, urgentes/vencidos, aprovações (gestor) ou alertas (colaborador); todos clicáveis navegando para a view correta | — |
| ~~HOME-04~~ | Home | ✅ CORRIGIDO — widget "Aniversariantes da Semana" exibido na home para todos exceto admin/superadmin; reutiliza `ctrl_taskhub_aniversariantes()` | — |
| SIDEBAR-01 | Sidebar | Menu muito extenso sem agrupamento semântico | 🟡 |
| ~~SIDEBAR-02~~ | Sidebar | ✅ CORRIGIDO @590 — Balcão removido do sidebar; cross-nav "Balcão" em view-comunicacao e "RECE" em view-balcao | — |
| ~~SIDEBAR-03~~ | Sidebar | ✅ VERIFICADO @648 — inativos ocultos para usuários comuns; superadmin vê com opacity .5 + tag "inativo"; badge começa `oculto` — nunca exibido sem dados reais | — |
| ~~SIDEBAR-04~~ | Sidebar | ✅ CORRIGIDO @614 — seção MEMÓRIA consolidada: 4 itens (Agentes, Acervo, Voluntários, Parcerias) → 1 item "Memória Institucional" com tab-bar interna; sidebar total ~17 itens | — |
| ~~SIDEBAR-05~~ | Sidebar | ✅ CORRIGIDO @590 — Meu Centro movido para posição #2 (após Início) | — |
| TAR-01 | Tarefas | Formulário com campos insuficientes | 🟡 |
| ~~TAR-02~~ | Tarefas | ✅ VERIFICADO @648 — `tf-responsavel` é `<select>` populado por `_carregarSelectUsuariosHelper` em `aoAbrir()`; nunca foi texto livre na v2 | — |
| ~~TAR-03~~ | Tarefas | ✅ CORRIGIDO @654 — form ganha campos Prazo + Vínculo (select tipo: Ação/Reserva/Contrato; select ID dinâmico carregado por `atualizarVinculo()` com cache). `criar()` passa `acaoId`/`reservaId`/`contratoId` ao backend. Engine + repository recebem os dois novos campos (`reservaId`, `contratoId`). Lista exibe badges de vínculo (Ação/Reserva/Contrato) e prazo. Header migrado para `view-header` DS. | — |
| ~~TAR-04~~ | Tarefas | ✅ CORRIGIDO — `TarefaEngine.verificarPrazos()` + trigger diário 08:00 (`criarTriggerVerificacaoPrazos()`); `TASK_DELAYED` notifica responsável por e-mail (uma vez por tarefa, via `atrasoNotificadoEm`); `TAREFA_CRIADA` notifica responsável ao ser atribuído por outra pessoa | — |
| TAR-05 | Tarefas | Sem alertas para vencimento | 🟡 |
| ~~TAR-06~~ | Tarefas | ✅ CORRIGIDO @1025 — FSM `_TRANSICOES_TAREFA` não permitia `pendente→concluida` nem `bloqueada→concluida`, mas o botão "Concluir" da UI era exibido para qualquer tarefa ativa; usuário via "Erro ao concluir tarefa." ao clicar. FSM ampliada para refletir o comportamento real da UI | — |
| ~~OBS-01~~ | Observabilidade | ✅ CORRIGIDO @1025 — tabela "Uso por Módulo" usava classes CSS órfãs `table-lista`/`table-responsive` (sem nenhuma regra em todo o projeto), renderizando sem padding/alinhamento/zebra; trocada para `tabela`/`table-wrap` (padrão usado em todo o resto do sistema) + larguras de coluna explícitas | — |
| ~~OBS-02~~ | Observabilidade | ✅ CORRIGIDO @1025 — hotspots `colaborador_status` (100% falha, 9/9) e `reservas` (100% falha, 1/1) no ranking de módulos eram causados por violações FSM espúrias (`ativo→ativo`, `ferias→ferias`, `confirmado→confirmado`) geradas por chamadas idempotentes sem guarda — não havia bug de runtime nesses domínios. Ver `PES-17`/`ESP-31` | — |
| ~~PES-17~~ | Pessoas — Férias | ✅ CORRIGIDO @1025 — `concluirFerias`(linha 548)/`aprovarFerias`(linha 509) chamavam `mudarStatus` do colaborador sem checar status atual; conclusão automática de férias vencidas (`autoConcluirFeriasVencidas`, ator `sistema`) gerava `ativo→ativo` quando o colaborador nunca havia sido movido para `ferias` (data de início futura). `_transitarColaborador`/`_transitarFerias` agora são no-op idempotente quando `atual === novoStatus` | — |
| ~~AUD-01~~ | Admin — Auditoria Visual | ✅ CORRIGIDO @1026 — tela sempre mostrava "Nenhum registro encontrado": `ctrl_auditoria_listar`/`ctrl_auditoria_rollback`/`ctrl_auditoria_detectar_suspeitos` liam de uma aba "Auditoria" na planilha MASTER que nunca recebia dados; os 200+ eventos de `AuditoriaService.registrar()` sempre foram gravados em `auditoria_operacional.json` via `AuditoriaStore`. As 3 funções foram reescritas para ler do `AuditoriaStore` | — |
| ~~AUD-02~~ | Admin — Auditoria Visual | ✅ CORRIGIDO @1026 — rollback sempre falhava com "sem dados before/after": `AuditoriaService._persistir()` não extraía `antes`/`depois` do payload (só `registrarMutacaoCritica` capturava). Corrigido para extrair `dados.antes/depois` ou `dados.before/after`. Mapa de módulos (`MODULO_JSON_CANONICO`) corrigido: `reservas` removido por apontar a um `reservas.json` órfão (módulo real usa Sheets via `DataGateway`) — rollback "funcionava" mas não tinha efeito real; módulos fora do mapa agora retornam erro claro em vez de falso sucesso | — |
| ~~AUD-03~~ | Sistema — Auditoria | ✅ CORRIGIDO @1026 — bug sistêmico: 6 arquivos chamavam `AuditoriaService.registrar(tipo, modulo, dados, email)` com 4 argumentos, mas a função só aceitava 3 — o e-mail do ator era descartado silenciosamente, perdendo rastreabilidade de "quem fez" mesmo em eventos já auditados. `registrar()` agora aceita o 4º parâmetro como fallback | — |
| AUD-04 | Admin — Auditoria Visual | Rollback com snapshot antes/depois real só existe em `pessoas` (colaboradores) e `tarefas`; os outros 8 módulos de `MODULO_JSON_CANONICO` (reuniões, comunicação, ações, contratos, agentes, acervo, voluntários, parcerias) têm a infraestrutura pronta mas precisam do mesmo padrão nos engines para o botão "Desfazer" aparecer | 🟡 |
| PFANTASMA | Admin | "Perfis Fantasma" solicitado mas não implementado | 🔴 |
| PREVIEW-01 | Admin | Preview de Primeiro Acesso com comportamento incerto | 🟡 |
| PES-02 | Pessoas | Email não integrado com base de usuários | 🔴 |
| PES-03 | Pessoas | Setor não integrado com base de setores | 🟡 |
| PES-04 | Pessoas | Cálculo de salário total incorreto | 🔴 |
| PES-05 | Pessoas/Financeiro | Dados salariais duplicados em 2 módulos | 🔴 |
| PES-06 | Pessoas | Fluxo de cadastro invertido (deveria ser PCCS→Financeiro→Pessoa) | 🔴 |
| PES-07 | Pessoas | Sem histórico completo do colaborador | 🔴 |
| PES-08 | Pessoas | Sem campo de número de registro | 🟡 |
| PES-09 | Pessoas | Sem número de registro do colaborador | 🟡 |
| PES-10 | Pessoas — Férias | Sem cálculo de período aquisitivo | 🔴 |
| PES-11 | Pessoas — Férias | Sem cálculo de período concessivo | 🔴 |
| PES-12 | Pessoas — Férias | Sem fluxo de solicitação/aprovação de férias | 🔴 |
| PES-13 | Pessoas — Férias | Sem suporte a acordo de férias | 🔴 |
| PES-14 | Pessoas — Férias | Sem débito de dias do banco | 🔴 |
| PES-15 | Pessoas — Férias | Sem controle de sigilo por papel | 🔴 |
| PES-16 | Pessoas | Campo "data de nascimento" não confirmado | 🔴 |
| AFT-02 | Afastamentos | Sem campo para anexar documentos | 🔴 |
| AFT-03 | Afastamentos | Sem registro a partir do card do colaborador | 🟡 |
| AFT-04 | Afastamentos | Sem métricas gerais | 🟡 |
| AFT-05 | Afastamentos | Sem alertas inteligentes por CID/recorrência | 🔴 |
| AFT-06 | Afastamentos | Campo CID como texto livre | 🔴 |
| AFT-07 | Afastamentos | Sem controle de sigilo | 🔴 |
| AFT-08 | Afastamentos | Sem tipo "Dayoff de Aniversário" | 🟡 |
| OCO-02 | Ocorrências | Sem acompanhamento inteligente / contador no card | 🟡 |
| OCO-03 | Ocorrências | Sem indicador de saúde profissional | 🟡 |
| ~~ESTR-01~~ | Pessoas/RH | ✅ CORRIGIDO @590 — `pessoas` e `ponto` removidos do sidebar; `rh` renomeado "Pessoas / RH"; cross-nav Fichas/Ponto em view-rh | — |
| ESTR-02 | Sistema | Layout de abas inconsistente entre módulos | 🟡 |
| ~~PON-01~~ | Ponto | ✅ CORRIGIDO — Abas "Custo CLT" e "Rescisão" removidas do módulo Ponto (pertencem ao RH/DP via RhUI) | — |
| PON-03 | Ponto | Sem exportação AFD | 🔴 |
| PON-04 | Ponto | Sem vínculo com escala | 🔴 |
| ESC-01 | Escalas | Escalas simples — sem escala completa por colaborador | 🔴 |
| ESC-02 | Escalas | Sem workflow de troca de escala | 🔴 |
| ESC-03 | Escalas | Trocas de escala não geram tarefas | 🟡 |
| SIS-01 | SISTEMA | `prompt()`/`confirm()` nativos — CORRIGIDO @591 | ✅ |
| SIS-06 | Sistema | Dois padrões de filter bar: `filter-bar` e `toolbar` | 🟡 |
| SIS-07 | Sistema | Duas variáveis de cor para stat-cards intercambiáveis | 🔵 |
| SIS-08 | Sistema | Jargão técnico na UI (SLA, FSM, webhook, endpoint) | 🟡 |
| ~~SIS-10~~ | Sistema | ✅ CORRIGIDO @594+@617 — @594: rece/run/bl modais; @617: carro-modal, cd-meta-modal, cd-pes-modal, cd-indr-modal | — |
| SIS-12 | Sistema | Nome social sem prioridade absoluta sobre nome registrado | 🔴 |
| SIS-13 | Sistema | Campo "responsável" texto livre — CORRIGIDO @596 (5 campos → select) | ✅ |
| ESP-03 | Infraestrutura — Lista | Filtros inconsistentes entre modos | 🟡 |
| ESP-05 | Infraestrutura — Reserva | Sem vínculo com Ação Cultural | 🔴 |
| ESP-06 | Infraestrutura — Reserva | Sem suporte a espaço externo | 🔴 |
| ESP-07 | Infraestrutura — Reserva | "Tipo de Ação" comportamento incorreto (dual) | 🔴 |
| ESP-09a | Infraestrutura — Reserva | Catálogo de itens vazio — itens precisam ser cadastrados | 🟡 |
| ESP-09b | Infraestrutura — Reserva | Itens fixos do espaço ausentes do formulário | 🔴 |
| ESP-11 | Infraestrutura — Diagrama | Apenas 9 dos 17 espaços no Diagrama | 🟡 |
| ESP-12 | Infraestrutura — Dados | "Espaço de Feiras" sem capacidade definida | 🟡 |
| ESP-17 | Infraestrutura — Formulário | Desabilitar datas passadas no datepicker (UI feedback) | 🟡 |
| ESP-18 | Infraestrutura — Config Itens | Aba "Itens" mostra apenas categorias, não itens individuais | 🔴 |
| ESP-19 | Infraestrutura — Espaços | Três conjuntos divergentes (36 / 17 / 9 espaços) | 🔴 |
| ESP-23 | Infraestrutura — Card | Card sem itens solicitados, itens fixos, vínculos com Ação | 🔴 |
| ESP-24 | Infraestrutura — Agenda | Lentidão ao carregar | 🟡 |
| ESP-27 | Infraestrutura — Performance | Transições FSM com latência perceptível | 🟡 |
| ESP-28 | Infraestrutura — Pós-evento | Sem formulário de pós-evento ao "Concluir" | 🔴 |
| ESP-28b | Infraestrutura — Pós-evento | Edição posterior e histórico de alterações ausentes | 🔴 |
| ESP-29 | Infraestrutura — Horário Local | UX validação visual dinâmica conforme espaço selecionado | 🟡 |
| ~~ESP-30~~ | Infraestrutura — Reserva | ✅ IMPLEMENTADO @1019 — vínculo manual (opcional) com Google Calendar: botão "Vincular ao Calendar" no detalhe da reserva; usuário escolhe convidar todos os envolvidos (`responsavel`/`coResponsavel`/`criadoPor`) ou selecionar específicos + e-mails extras; sincroniza ao editar, remove ao cancelar. | — |
| ~~ESP-31~~ | Infraestrutura — Reserva | ✅ CORRIGIDO @1025 — `reserva_engine.gs.mudarStatus` chamava `FsmGuardian.assertValida` sem checar se a reserva já estava no status alvo, gerando `confirmado→confirmado` em duplo-clique/reenvio da ação "Confirmar"; agora retorna no-op idempotente quando `reserva.status === novoStatus` | — |
| ~~ADM-01~~ | Admin | ✅ CORRIGIDO @861 — `_carregarPendentes()` recebe error callback; DOM atualizado com mensagem de erro em vez de "⏳ Carregando…" eterno | — |
| ADM-02 | Admin | Permissões por módulo sem granularidade por funcionalidade | 🔴 |
| ADM-03 | Admin | Campo Setor no modal "Editar usuário" | 🟡 |
| ADM-05 | Admin | UI de Administração truncada — revisão de layout necessária | 🟡 |
| ADM-06 | Admin | Aba Permissões (Aprovações) e Aba Usuários (Admin) com designs diferentes | 🟡 |
| ADM-08 | Admin | Turnos e Config.Sistema devem ser unificados | 🟡 |
| ADM-09 | Admin | Categ.Itens deve migrar para Estoque | 🟡 |
| ADM-12 | Admin | Botão "Visualizar Cadastro" leva para página em branco | 🟡 |
| ~~APR-01~~ | Aprovações | ✅ CORRIGIDO @588 — badge adicionado à aba Reservas; `_atualizarBadgeReservas` criada; `carregar()` e `atualizarBadge()` atualizados | — |
| ~~APR-02~~ | Aprovações | ✅ CORRIGIDO — `aprovacoes` usa `modulo:null` no menu; acesso não depende de ESPACOS | — |
| APR-03 | Aprovações | Aba Permissões ausente como centralização de acessos | 🟡 |
| ~~APR-06~~ | Aprovações | ✅ CORRIGIDO — `view-header/view-title/view-subtitle` já em uso | — |
| ~~CHV-07~~ | Chaves — Retirada | ✅ CORRIGIDO @650 — adicionado `<input type="time" id="chv-hora-dev">` ao lado do date; `salvar()` combina data+hora como `YYYY-MM-DDTHH:MM`; `abrirForm()` reseta hora; display existente usa `.substring(0,10)` — retrocompatível | — |
| CHV-08 | Chaves — Retirada | Sem auto-preenchimento por papel do usuário | 🔴 |
| EMP-01 | Empréstimos | Desvinculado do fluxo de reserva | 🔴 |
| EMP-02 | Empréstimos — Externo | Sem suporte a empréstimos externos | 🔴 |
| EMP-04 | Empréstimos — Externo | Sem campo de CPF do responsável | 🔴 |
| EMP-05 | Empréstimos — Externo | Sem geração de termo de empréstimo | 🔴 |
| EMP-06 | Empréstimos — Externo | Sem cadastro prévio de solicitante externo | 🔴 |
| EMP-07 | Empréstimos — Externo | Sem histórico de empréstimos por solicitante | 🟡 |
| ACO-13 | Ações — Criação | Sem campo de vínculo com contrato/fonte na criação | 🟡 |
| ~~ACO-14~~ | Ações — Formulário | ✅ VERIFICADO @648 — `acao-responsavel` é `<select>` populado por `_carregarSelectUsuariosHelper` em `abrirFormulario()`; nunca foi texto livre na v2 | — |
| ACO-23 | Ações × RECE | Sem vínculo entre Ações e Agenda RECE | 🔴 |
| ACO-24 | Ações × Alertas | Sem alertas automáticos no ciclo de vida da ação | 🔴 |
| ACO-25 | Ações — Painel | Sem aba "Comunicação" (9ª aba: RECE + Balcão contextualizados) | 🔴 |
| ACO-26 | Ações — Painel | Regra arquitetural violada: sub-abas navegam para fora das Ações | 🔴 |
| ~~ACO-27~~ | Ações — Painel | ✅ IMPLEMENTADO @1019 — vínculo manual (opcional) com Google Calendar (evento de dia-todo `dataInicio`→`dataFim`): botão na aba Geral; convida todos os envolvidos (`responsavel`/`equipe`) ou específicos + e-mails extras; remove o evento ao cancelar a ação. | — |
| RECE-01 | RECE | Sem botão "Publicar no RECE" no painel da Ação | 🔴 |
| RECE-02 | RECE | Sem `acaoId` no modelo do evento RECE | 🔴 |
| RECE-03 | RECE | Campos específicos ausentes (categorias, artista, público-alvo, etc.) | 🔴 |
| RECE-04 | RECE | Sem fluxo de auditoria pela Comunicação no FSM | 🔴 |
| RECE-05 | RECE | Sem pré-condição de materiais de divulgação | 🔴 |
| RECE-06 | RECE | Sem integração com IA | 🔴 |
| RECE-07 | RECE | Sem suporte a materiais múltiplos de divulgação | 🟡 |
| RECE-08 | RECE × Balcão | Sem geração automática de demandas no Balcão | 🟡 |
| RECE-09 | RECE × IA | Sem histórico de revisões IA | 🟡 |
| RECE-10 | RECE × Agenda | Sem exportação/preview no formato do formulário externo | 🟡 |
| RECE-11 | RECE × Agenda | Sem confirmação de publicação externa | 🟡 |
| RECE-12 | RECE × Agenda | Integração via API (futuro) | 🔵 |
| RECE-16 | RECE — Arquitetura | Botão "+ Novo Registro RECE" arquiteturalmente incorreto | 🔴 |
| RECE-17 | RECE — Visualização | Sem modo de visualização Agenda | 🔴 |
| BAL-01 | Balcão — Arquitetura | Balcão separado do módulo Comunicação | 🔴 |
| BAL-03 | Balcão | Sem filtro de data | 🟡 |
| BAL-04 | Balcão | Sem filtro por Ação Cultural | 🔴 |
| BAL-09 | Balcão — Modal | Campo "Título" desnecessário com ação vinculada | 🔴 |
| BAL-10 | Balcão — Modal | Campo "Release" ausente | 🔴 |
| BAL-11 | Balcão — Modal | "Descrição" vs "Release" não diferenciados | 🔴 |
| ~~BAL-13~~ | Balcão — Versões | ✅ VERIFICADO @648 — toggle usa `btn-ghost`; submit usa `btn-primary`; padrão correto (toggle expande, primary envia) | — |
| ~~BAL-15~~ | Balcão — Lista | ✅ CORRIGIDO @651 — empty state: sem dados → ícone `support_agent` + texto orientado + CTA "Nova Demanda"; com filtros sem resultado → ícone `filter_list_off` + botão "Limpar filtros" (via `limparFiltros()`). | — |
| BAL-16 | Balcão — FSM | Sem etapa de aprovação final do material | 🔴 |
| BAL-18 | Balcão — Modal | Layout visual deficiente | 🔴 |
| FIN-06 | Financeiro | Integração Financeiro↔RH inexistente — mudança arquitetural grande (fase futura) | 🔴 |
| ~~FIN-09~~ | Financeiro | ✅ CORRIGIDO @635 — aba "Fontes de Recurso" adicionada à view-financeiro; `FontesRecursoUI` → `FontesUI` corrigido | — |
| ~~FIN-11~~ | Financeiro | ✅ CORRIGIDO @635 — aba "Execução" no painel do contrato: Previsto × Comprometido × Executado × Saldo × barra de progresso por rubrica | — |
| ~~FIN-12~~ | Financeiro | ✅ CORRIGIDO @637 — histórico com botão "Ver diff" por versão; modal compara snapshot × estado atual em 7 campos; botão "Restaurar esta versão" com confirmação + backup automático antes de restaurar | — |
| FIN-15 | Financeiro | Ícone `manage_accounts` ambíguo no card do contrato | 🔵 |
| ~~FIN-18~~ | Financeiro — Rubricas | ✅ CORRIGIDO @631 — coberto por FIN-20 (flag `voucher_uber` implementado no form da rubrica) | — |
| ~~FIN-19~~ | Financeiro — Rubricas | ✅ CORRIGIDO @631 — `setor` adicionado ao mapeamento de `memoriaCalculo` em `contrato_repository.gs/adicionarRubrica` | — |
| ~~FIN-20~~ | Financeiro — Rubricas | ✅ CORRIGIDO @631 — checkbox `voucher_uber` no form da rubrica; badge no card; campo `flags` persistido | — |
| ~~CON-09~~ | Contratações | ✅ CORRIGIDO @631 — campo "Atividade" nas parcelas vira select com atividades da meta selecionada; `_atvOptions` reseta ao trocar contrato/form | — |
| REU-09 | Reuniões — Ata | Aprovação single-approver; desejado: coletiva por participante | 🔴 |
| REU-10 | Reuniões — Ata | Sem auxílio de IA (geração de rascunho, revisão, extração encaminhamentos) | 🔴 |
| REU-12 | Meu Centro | Sem botão "+ Tarefa Rápida" no inbox | 🟡 |
| ~~REU-13~~ | Reuniões | ✅ CORRIGIDO @650 — `NotificationEngine.enviarNotificacaoEncaminhamento(enc, reuniao)` adicionado; template `encaminhamento_atribuido` com assunto + corpo; chamado em `adicionarEncaminhamento` com try/catch silencioso | — |
| ~~REU-14~~ | Reuniões | ✅ CORRIGIDO @1014 — `FsmGuardian.transitar()` (método inexistente) → `FsmGuardian.assertValida(dominio, estadoAtual, novoStatus, id, email)` em `mudarStatus`, `submeterAtaParaAprovacao`, `aprovarAta` (`reuniao_engine.gs`). Causava erro no console e travava as transições de status. | — |
| ~~REU-15~~ | Reuniões | ✅ CORRIGIDO @1014 — botões presos em "Salvando…/Adicionando…" para sempre: `salvar`, `mudarStatus`, `salvarAta`, `submeterAta`, `aprovarAta`, `adicionarEncaminhamento`, `concluirEnc` não recebiam/chamavam o `done` exigido por `BtnGuard.wrap(idOuEl, label, fn)` — corrigido para aceitar `done` e chamá-lo em todo caminho (sucesso, erro, validação). | — |
| ~~REU-16~~ | Reuniões | ✅ CORRIGIDO @1014 — perda de dados de pauta/presença ao adicionar encaminhamento: `salvar()` não enviava `pauta`/`presentes`/`ausentesJustificados` ao backend, e o reload pós-encaminhamento (`abrirDetalhe`) sobrescrevia o que só existia no DOM. Resolvido com auto-salvamento contínuo (ver REU-17) + `adicionarEncaminhamento` agora re-renderiza a lista a partir da resposta do servidor em vez de recarregar a reunião inteira. | — |
| ~~REU-17~~ | Reuniões | ✅ IMPLEMENTADO @1014 — auto-salvamento: debounce de 1.5s após qualquer edição em Dados/Pauta/Presença/Ata persiste no servidor (`ctrl_reunioes_autosalvar` → `ReuniaoEngine.autoSalvar`, sem versionar a ata a cada chamada); cria o rascunho automaticamente na primeira edição válida (título+data) se a reunião ainda não existir; indicador "Salvo automaticamente às HH:MM:SS" no rodapé do modal. Rede de segurança contra queda de energia/internet. | — |
| ~~REU-18~~ | Reuniões | ✅ UX @1014 — abas "Ata" e "Encaminhamentos" do modal mescladas em uma única aba ("Ata & Encaminhamentos"), eliminando a necessidade de alternar abas durante a reunião. | — |
| ~~REU-19~~ | Reuniões | ✅ IMPLEMENTADO @1018 — integração com Google Calendar: ao mudar status para "agendada", cria evento (`CalendarApp.getDefaultCalendar()`, mesmo padrão de `rece_engine.gs`) com convocador + presentes + ausentes justificados como guests (convite por e-mail); `atualizar`/`autoSalvar` sincronizam título/horário/local enquanto "agendada"/"em_andamento"; cancelamento exclui o evento. Escopo `calendar` adicionado a `appsscript.json` — **requer reautorização manual do app pelo responsável pelo deploy** (não automatizável via clasp). Ícone `event_available` no card da lista indica reunião sincronizada. | — |
| ~~REU-20~~ | Reuniões | ✅ IMPLEMENTADO @1018 — links e anexos na reunião: aba Dados ganha seção "Links" (URL livre) e "Anexos" (upload para Drive via `ReuniaoEngine.uploadAnexo`, pasta `CCBJ_Reunioes_Anexos`, limite 8MB, mesmo padrão base64→Drive de `rece_engine.gs/uploadImagem`); ambos persistidos via `salvar`/`autoSalvar` (`links[]`/`anexos[]` no schema). | — |
| ESC-09 | Sistema Global | Sem área de perfil editável pelo usuário (nome social, pronomes, foto) | 🔴 |
| ESC-13 | Escuta | Subtítulo com siglas sem explicação (SIS-08) | 🟡 |
| ESC-14 | Escuta | Contradição nos Marcadores Metodológicos | 🟡 |
| ESC-17 | Escuta | Pesquisas não-anônimas permitem override pelo respondente | 🟡 |
| ~~ACV-02~~ | Acervo | ✅ VERIFICADO @648 — botão Cancelar usa `btn btn-ghost`; sem cor rosa/pink no HTML gerado | — |
| ACV-10 | Acervo | Formulário com estilos 100% inline | 🟡 |
| CAR-01 | Reserva de Veículo | Módulo nunca testado completamente na auditoria | 🔴 |
| ~~CAR-03~~ | Veículo — Métricas | ✅ VERIFICADO @643 — `_renderMetricas` já tem cards Recusadas + Canceladas; backend `ctrl_carro_dados` já retorna ambos os contadores | — |
| ~~CAR-04~~ | Veículo — Formulário | ✅ VERIFICADO @643 — `GAS.acoes.listar` binding correto + fallback 6s já presente; select funciona mesmo com lentidão da GAS | — |
| ~~CAR-06~~ | Veículo | ✅ CORRIGIDO @644 — `ctrl_carro_dados` enriquece lista com `solicitanteNome` via `AcessoService.listarUsuarios()` (bulk map); frontend usa `rc.solicitanteNome` com `title` exibindo email | — |
| ~~CAR-07~~ | Veículo | ✅ CORRIGIDO @644 — aprovador exibe `rc.aprovadorNome` com texto "Aprovado por:" em vez de "Aprov: email-prefix" | — |
| ~~CAR-08~~ | Veículo — Modal | ✅ CORRIGIDO @637 — linha "Setor Solicitante" dedicada adicionada ao modal `carro-det-overlay`; `_verDetalhesAgenda` popula `carro-det-setor` separado do nome do solicitante | — |
| ~~CAR-09~~ | Veículo | ✅ CORRIGIDO @638 — passageiros separados em internos (select colaboradores + chip tags) e externos (texto livre); backend: `passageirosInternos[]`, `passageirosExternos[]` | — |
| ~~CAR-10~~ | Veículo | ✅ CORRIGIDO @638 — seção "Paradas intermediárias" dinâmica no form; `rota.paradas[]` persistido; modal de detalhes renderiza Saída → Paradas → Chegada com ícones dinâmicos | — |
| ~~CAR-11~~ | Veículo | ✅ CORRIGIDO @641 — agenda: dias passados não-clicáveis (opacidade reduzida, sem onclick); `_abrirFormularioDia` guarda contra datas passadas + Toast; `_onDataChange` atualiza `min` nos inputs de hora quando data = hoje | — |
| CAR-12 | Veículo — Feature | Motorista configurável — não implementado | 🔴 |
| CAR-13 | Veículo | Sem suporte a solicitação de voucher Uber | 🔴 |
| CAR-14 | Veículo — Feature | Frota configurável — não implementado | 🔴 |
| ~~CAR-15~~ | Veículo | ✅ IMPLEMENTADO @1019 — vínculo manual (opcional) com Google Calendar: botão no detalhe da reserva; convida todos os envolvidos (`solicitante`/`passageiros`/`passageirosInternos`) ou específicos + e-mails extras; remove o evento ao cancelar. | — |
| ~~HUB-01~~ | Meu Centro | ✅ VERIFICADO @641 — aba Produtividade já tinha MetricsToggle.wrap(); abas Meu Dia/Meu Time não têm stats panel | — |
| ~~HUB-02~~ | Meu Centro | ✅ VERIFICADO @641 — estado vazio usa Material Symbol `celebration`, não emoji literal; sem emoji unicode no HTML | — |
| ~~HUB-03~~ | Meu Centro | ✅ CORRIGIDO @656 — bug crítico: `readJSON('solicitacoes_reserva.json')` substituído por `SolicitacaoReservaRepository.listarPorStatus('pendente', orgId)` (entidade usa Sheet, não JSON). `.includes()` → `.indexOf()` (ES5). | — |
| ~~HUB-04~~ | Meu Centro | ✅ CORRIGIDO @643 — empty state do Meu Time com orientação: explica o que fazer (criar tarefas / encaminhamentos) | — |
| ~~HUB-05~~ | Meu Centro | ✅ CORRIGIDO @643 — unidade '(h)' movida para o label; valor de dias sem unidade embutida | — |
| ~~HUB-06~~ | Meu Centro | ✅ VERIFICADO @641 — label sidebar "Meu Centro", view-title "Meu Centro de Controle"; "TaskHub" só em IDs internos | — |
| ~~HUB-07~~ | Meu Centro | ✅ CORRIGIDO @656 — chaves com devolução atrasada (`status='atrasado'`, `responsavel=email`) adicionadas como 6ª fonte de agregação; tipo `chave` com ícone `key`; click navega para Espaços. | — |
| ~~HUB-08~~ | Meu Centro | ✅ CORRIGIDO @656 — botão "Nova Tarefa" adicionado no header do tab Meu Dia; navega para view-tarefas onde o form de criação está disponível. | — |
| ~~HUB-09~~ | Meu Centro — Meu Time | ✅ CORRIGIDO @643 — backend enriquece com nome via `AcessoService.listarUsuarios()` (map bulk); frontend exibe `p.nome` com `title` mostrando email | — |
| ~~HUB-10~~ | Meu Centro | ✅ CORRIGIDO @648 — `.th-item`: padding `10px 14px` → `12px 16px`, margem `6px` → `8px`, transition → `var(--fast)`; ícone 30×30 → 32×32; CSS `.th-prod-*` morto removido (nunca usado — `_prodCard` usa `stat-card`) | — |
| ~~HUB-11~~ | Meu Centro | ✅ CORRIGIDO @657 — `_renderItem` enriquecido: metadados por tipo (tarefa→status+prioridade+prazo; encaminhamento→reuniaoTitulo; demanda→tipoDemanda+SLA%; aprovacao→solicitante; chave→salaId+prazo). Bug colateral corrigido: extras das demandas usavam chave `tipo` que sobrescrevia o `tipo` externo em `_itemCaixa`; renomeado para `tipoDemanda`/`statusDemanda`. | — |
| ~~HUB-12~~ | Meu Centro | ✅ CORRIGIDO @657 — campo `dataNascimento` adicionado ao `ColaboradorRepository` (_HEADERS + _serializarIndice). Form de Pessoas ganha input `pf-nascimento`. `ctrl_taskhub_aniversariantes()` retorna colaboradores com aniversário nos próximos 7 dias. Seção exibida abaixo das pendências no Meu Dia com cards coloridos (hoje=cor accent). | — |
| ~~HUB-13~~ | Meu Centro | ✅ CORRIGIDO — `PessoasEngine.registrarDayoffAniversario()`: valida janela 7 dias + uso único no ano + cria afastamento `dayoff_aniversario` auto-aprovado (ativo). `ctrl_rh_solicitar_dayoff_aniversario()` sem restrição de papel. `carregarAniversariantes()` exibe botão "Solicitar Day-off" no card do próprio aniversário. `AfastamentosUI._TIPO_LABEL` + select ganham a opção. | — |

---

## HANDOFF ATUAL — SESSÃO 123 (2026-06-26)

### Estado atual: Fix/feat — Reservas de Espaço — pendente deploy

### O que foi feito nesta sessão (s151)
| Arquivo | O que foi implementado |
|---|---|
| index.html | **EspacosUI.aoAbrir**: 3 chamadas de métricas (reservas+chaves+ativos) paralelizadas (antes seriais aninhadas) |
| index.html | **ReservasUI.carregar**: `metricas` e `listar` paralelizados após `concluirAtrasadas` |
| index.html | **EspacosUI.abrirTab('reservas')**: inicializa `res-filtro-data` = hoje na primeira abertura |
| index.html | **_renderLista**: filtro por dia exato (`===`) em vez de `>=`; `_limparFiltros` restaura para hoje |
| index.html | **posPassado**: botão pós-evento só exibido quando hora de término já passou (fix: não mostrava para eventos futuros do dia) |
| index.html | **Form reservas**: convertido de `<div class="card">` para `<div class="modal-overlay oculto">` com modal-box/header/body; backdrop fecha; `abrirForm/fecharForm` usam classList |
| index.html | **Identificação de espaços**: nome em negrito + badge de nível (Térreo/1º Andar…); `_espacosDetalhes` + `_nivelBadge()` |
| mapa_ui.html | **Race condition níveis**: `lerNiveisMapa` callback re-renderiza espaços se `_statusMap` já foi populado |
| reservas_controller.gs | **buscarPorId**: `ctrl_reservas_confirmar/atualizar/cancelar/vincular_calendar/desvincular_calendar` — substituem `ReservaEngine.listar({})` (O(N)) por `ReservaRepository.buscarPorId` (O(1) por ID) |

### Smoke test esperado
- Abrir Espaços → aba Reservas abre exibindo apenas as reservas de hoje, em ordem cronológica, sem esperar 3 chamadas seriais.
- "Nova Reserva" → formulário abre como modal sobre a página, não inline; ESC ou clique fora fecha.
- Reservas da lista mostram espaço em negrito com badge de andar (Térreo, 1º Andar etc).
- Mapa → mudar de nível → espaços do nível correto aparecem imediatamente, sem mostrar espaços de outros andares.
- Console F12: zero TypeError; zero undefined.

---

## HANDOFF ANTERIOR — SESSÃO 122 (2026-06-25)

### Estado atual: Feat — Quadros: mapa mental evoluído — Deploy @1094

### O que foi feito nesta sessão (s149)
| Deploy | O que foi implementado |
|---|---|
| @1094 | **QuadrosUI** (index.html): `_iniciarMindMap` evoluído com toolbar dedicada (adicionar filho/irmão, editar, colapsar/expandir, centralizar, remover), arraste manual de nodos com persistência em `mmNodes[].dx/dy`, colapso persistente em `mmNodes[].collapsed`, clique no badge para recolher/expandir, setas para ajuste fino, `Shift+setas` para ajuste maior e `Ctrl+0` para centralizar. Snapshot segue retrocompatível via `snapshot.mmNodes`. |

### Smoke test esperado
- Quadros → criar/abrir quadro com categoria "Mindmap" → editor abre em modo mapa mental, não canvas livre.
- Toolbar do mapa aparece no topo esquerdo; botões de adicionar filho/irmão, editar, colapsar, centralizar e remover funcionam.
- Tab cria filho; Enter cria irmão; F2/duplo clique edita; Del remove; Esc desseleciona.
- Arrastar um nodo muda sua posição; setas ajustam fino; salvar → reabrir preserva posição.
- Criar filhos em um nodo → clicar no badge recolhe/expande; salvar → reabrir preserva colapso.
- Ctrl+0 centraliza o mapa; scroll aplica zoom; arrastar fundo faz pan.

---

## HANDOFF ANTERIOR — SESSÃO 121 (2026-06-25)

### Estado atual: Feat — Quadros v6: Mapa Mental + grupo de ferramentas + Vincular Pessoa — Deploy @1081

### O que foi feito nesta sessão (s144)
| Deploy | O que foi implementado |
|---|---|
| @1081 | **QuadrosUI** (index.html): `_iniciarMindMap` — engine dedicada para quadros `categoria=mindmap`; nodos em árvore horizontal bezier, auto-layout alternado L/R, Tab/Enter/Del/F2/Esc/scroll/pan. Grupo de ferramentas de desenho em botão único com flyout (lápis/marcador/pincel). `_inserirPessoa` corrigida: busca em `boot.pessoas` + `<select>` de `boot.setores`, nunca campo livre. Regra de vínculo em CLAUDE.md. **analise_controller.gs**: 7 novos datasets (`ativos_status`, `tarefas_prioridade`, `contratos_status`, `contratos_fonte`, `presencas_acao`, `balcao_tipo`, `balcao_setor`); filtro de data aplicado a mais datasets. **AnaliseEstudioUI**: 4 novos tipos de gráfico SVG (Medidor/gauge, Radar/teia, Combinado/barras+linha, Dispersão/scatter); catálogo 12 tipos com dicas; `_dashFiltroTempo`. |

### Smoke test esperado
- Quadros → criar quadro com categoria "Mindmap" → editar → mapa mental abre (não canvas livre).
- Root "Ideia Central" ao centro; Tab cria filho; Enter cria irmão; duplo-clique edita inline; Del remove.
- Connectors bezier curvos; cores alternadas por ramo; pan (arrastar) + zoom (scroll).
- Salvar → reabrir → nodos preservados.
- Quadro livre → barra lateral de ferramentas → botão "Ferramentas de Desenho" com ▼ → clicar → flyout com Lápis/Marcador/Pincel; selecionar Marcador → ícone do botão muda para `edit`.
- Botão "Vincular Pessoa" → modal com busca de colaboradores (não inputs livres) → digitar nome → dropdown filtra lista → clicar → cargo auto-preenchido.

---

## HANDOFF ANTERIOR — SESSÃO 120 (2026-06-25)

### Estado atual: Feat — Estúdio de Análises v5: Dashboard Builder modernizado — Deploy @1079

### O que foi feito nesta sessão (s143)
| Deploy | O que foi implementado |
|---|---|
| @1079 | **AnaliseEstudioUI** (index.html): Drag & drop HTML5 para reordenação de widgets; 3 novos tipos: Texto, Imagem, Forma SVG (8 geometrias); `_renderFormaWidget` com SVG puro; 6 tamanhos (+3/4); galeria hero com gradiente; cards `db-card2` com preview de blocos coloridos; 7 templates pré-prontos; 8 sugestões do sistema clicáveis (`_dashAddSugestao`); Widget Editor com `db-tipo-grid`; toolbar sticky; aba "Análises" removida. |

---

## HANDOFF ANTERIOR — SESSÃO 119 (2026-06-25)

### Estado atual: Feat — Estúdio de Análises v4: Dashboard Builder — Deploy @1073

### O que foi feito nesta sessão (s142)
| Deploy | O que foi implementado |
|---|---|
| @1073 | **AnaliseEstudioUI** + **analise_controller.gs**: Dashboard Builder completo (aba Dashboards, 4 tipos de widget, grid 5 tamanhos, Widget Editor Modal, Dashboard View ao vivo, visibilidade + compartilhamento). Fix [object Object] em setores/cargos nos painéis de compartilhamento. |

---

## HANDOFF ANTERIOR — SESSÃO 118 (2026-06-25)

### Estado atual: Feat — Quadros v5: conector inteligente, figuras, templates, dados do sistema — Deploy @1072

### O que foi feito nesta sessão (s141)
| Deploy | O que foi implementado |
|---|---|
| @1072 | **QuadrosUI**: conector com snap a âncoras; 8 novas figuras; estilo de linha; 14 templates em 4 categorias; vincular tarefa/pessoa; widgets de dados do sistema. |

### Pendente para smoke test
- Quadros → novo quadro → testar conector (arrastar entre dois retângulos, verificar snap nos 4 pontos de ancoragem).
- Templates → verificar Golden Circle, OKR, Business Model Canvas, Retrospectiva, Jornada do Colaborador.
- Toolbar → verificar Marcador e Pincel (opacidade e largura variável).
- Estilo de linha → criar linha/seta e alternar sólida/tracejada/pontilhada.
- Vincular Tarefa → botão tarefa → buscar e inserir card de tarefa.
- Dados do Sistema → escolher Ação e inserir widget.

---

## HANDOFF ANTERIOR — SESSÃO 116 (2026-06-23)

### Estado atual: Feat — Mapa por cidade + categorias de rubrica Rouanet + aba Conformidade — Deploy @1034

### O que foi feito nesta sessão (s116)
| Deploy | O que foi implementado |
|---|---|
| @1034 | Mapa "Cidades" no BI Demográfico (3º modo, ao lado de Calor/Bairros). Campo novo `categoriaRouanet` nas rubricas do Financeiro (separado do `categoria` custeio/investimento usado pelo SALIC). Nova aba "Conformidade" no Dashboard com `ContratosEngine.conformidadeRouanet()` comparando execução real por categoria Rouanet contra os limites de `config_org.json`. Ver detalhe completo em PROGRESS.md s116. |

### Pendente para smoke test
- BI Demográfico → mapa → botão "Cidades": bolhas aparecem corretamente.
- Financeiro → editar/criar Item de Despesa: campo "Categoria Lei Rouanet" aparece e salva.
- Dashboard → aba "Conformidade": contratos Lei Rouanet aparecem com barras por categoria; contratos sem rubrica classificada mostram tudo em "não classificado".

---

## HANDOFF ANTERIOR — SESSÃO 115 (2026-06-23)

### Estado atual: Feat — Dashboard: aba "Alertas" operacionais — Deploy @1033

### O que foi feito nesta sessão (s115)
| Deploy | O que foi implementado |
|---|---|
| @1033 | Usuário pediu para aprofundar o estudo de métricas cross-módulo (custo/horas por Ação foram dados como exemplo, não limite) antes de estruturar o "Centro de Controle". Catalogadas métricas reais (com file:line) em 3 eixos: monitoramento operacional, decisão estratégica (visão "Ação 360°", já viável via `acaoId`), e prestação de contas (achado crítico: limites Lei Rouanet configurados mas nunca verificados contra execução real — rubricas não têm a categoria necessária para isso, fora de escopo). Investigação também corrigiu uma suposição errada: o painel de exportações institucionais (CODIP/SALIC/SNIIC/PNAB) **já existe** (`ExportacoesUI` em Financeiro + Público), não havia gap ali. Implementada a trilha confirmada como gap real: aba "Alertas" no Dashboard (`DashboardUI`) com 4 indicadores já calculados nos módulos de origem — banco de horas excedente, férias pendentes, ativos em manutenção, empréstimos de almoxarifado atrasados. Novo `ctrl_dashboard_alertas` + novo método `PontoRepository.listarBancoHorasExcedente()` (único código novo de agregação; os outros 3 reaproveitam `metricas()`/`listarFerias()` já existentes). |

### Pendente para smoke test
- Dashboard → aba "Alertas": 4 cards carregam sem erro no console.
- Card "Banco de Horas Excedente" reflete corretamente colaboradores com saldo (positivo ou negativo) acima de 120h (config padrão).
- Card "Férias Pendentes" bate com a lista real em RH → Férias.

---

## HANDOFF ANTERIOR — SESSÃO 114 (2026-06-22)

### Estado atual: Feat/Cleanup — Dashboard: aba BI Estoque + remoção do módulo RELATORIOS órfão — Deploy @1032

### O que foi feito nesta sessão (s114)
| Deploy | O que foi implementado |
|---|---|
| @1032 | Usuário reportou item "Relatórios" do menu lateral sempre "inativo". Investigação revelou que `ModulosRegistryService` (`modules/admin/modulos_registry_service.gs:18`) já havia removido `RELATORIOS` do catálogo canônico de módulos deliberadamente ("não existe view correspondente; exportações ficam em Financeiro"), mas o item de menu, atalhos da Home, matrizes de permissão (frontend + `permissoes_v2_engine.gs`), entradas do Manual e do wizard de setup nunca foram limpos — ficaram órfãos, permanentemente inacessíveis. Removidas todas as referências mortas a `RELATORIOS` (módulo de menu/RBAC — não confundir com a planilha de dados `SHEET_ID_RELATORIOS`/CODIP, que segue intacta). Corrigido também `manual.html`: as entradas de ajuda "Relatórios" e "BI Demográfico" estavam gated por `modulo:'RELATORIOS'` (logo inacessíveis) — passaram para `modulo:null`. Adicionada nova aba "BI Estoque" ao dashboard cross-módulo já existente (`DashboardUI`/`ctrl_dashboard_estoque`), reaproveitando `EstoqueEngine.metricas()` sem duplicar cálculo — cobre o único gap real de dados (itens críticos, valor em estoque, permanentes, solicitações pendentes) que as abas Operacional/Financeiro/Estratégico/Demográfico não tinham. |

### Pendente para smoke test
- Sidebar: confirmar que "Relatórios" não aparece mais (nem para superadmin com tag "inativo").
- Dashboard (`BI — Central de Inteligência`): nova aba "BI Estoque" carrega métricas sem erro no console.
- Manual: abrir artigos "Relatórios" e "BI Demográfico" e confirmar que abrem normalmente (antes ficavam ocultos por módulo inativo).
- Wizard de setup de nova organização: passo 5 (Módulos) não deve mais oferecer "Relatórios" como opção.

---

## HANDOFF ANTERIOR — SESSÃO 107 (2026-06-17)

### Estado atual: Feat — Reuniões com ciclo/lote, Calendar explícito e tarefas imediatas — Deploy @1023

### O que foi feito nesta sessão (s107)
| Deploy | O que foi implementado |
|---|---|
| @1023 | Reuniões: botão "Criar Ciclo" com modal de lote por período+dias da semana e/ou datas avulsas; backend `ctrl_reunioes_criar_lote`/`ReuniaoEngine.criarLote` com limite 60 e bloqueio de duplicadas. Calendar em Reuniões ficou explícito nos cards e no modal: "Calendar"/"Vincular ao Calendar" e "Desvincular"; backend `ctrl_reunioes_vincular_calendar`/`desvincular_calendar`. Encaminhamentos agora criam tarefa imediatamente ao serem adicionados e gravam `tarefaId` real; encerramento continua como rede de segurança para encaminhamentos legados. |

### Nota de descoberta UI — Calendar em outros módulos
- Reservas de Espaço: botão no modal de Detalhes da Reserva.
- Reservas de Veículo: botão no modal de Detalhes da Reserva de Veículo.
- Ações: botão no painel da Ação.

### Pendente para smoke test
- Criar ciclo pequeno com 2 datas; verificar cards gerados.
- Vincular/desvincular Calendar em uma reunião.
- Adicionar encaminhamento e confirmar surgimento da tarefa no Meu Centro/Minhas Tarefas.

---

## HANDOFF ANTERIOR — SESSÃO 106 (2026-06-17)

### Estado atual: Feat/Fix — Reuniões estruturadas + correção do web app — Deploy @1022

### O que foi feito nesta sessão (s106)
| Deploy | O que foi implementado |
|---|---|
| @1022 | Reuniões: pauta em acordeão com discussão/decisão, vínculo pauta↔encaminhamento, botão "Gerar Ata Completa", nova aba "Atas" com cards e compartilhamento direto. Encaminhamentos: dashboard global, filtros por texto/status/responsável, observações e conclusão com observação final opcional. Backend: `listarEncaminhamentosGestao`, `metricasEncaminhamentos`, `adicionarObservacaoEncaminhamento`. Bugfix: `_criarTarefasDeEncaminhamentos` usa `TarefaEngine.criar(...)` e grava `tarefaId` real; TaskHub passa `{reuniaoId, encId}` ao marcar encaminhamento; "Minhas Tarefas" filtra estritamente tarefas pessoais mesmo para admin/gestor/superadmin. Operação: corrigido erro publicado "Nenhum arquivo HTML com o nome frontend/index foi encontrado" com `clasp push` e atualização do deployment fixo para `@1022`; `.clasp.json` da raiz alinhado para `rootDir: ./gas/src`. |

### Verificação feita
- Parse sintático do `<script>` principal de `gas/src/frontend/index.html` via `node` passou (`scripts checked 1`).
- `clasp push` concluiu com 181 arquivos.
- `clasp deployments --json` confirmou o deployment fixo `AKfycbzVKQ8fEMBZquOytumFLsb3dIx3DuIZh1cFYe4ywFCoMUXSFewuhZCpy-V8fjLkbe_j` em `versionNumber: 1022`.

### Pendente para a próxima sessão
- Smoke test no browser do módulo Reuniões: abrir lista, aba Encaminhamentos, concluir com observação, adicionar observação avulsa, abrir aba Atas e compartilhar uma ata.
- Se o link antigo ainda mostrar erro, confirmar se o navegador está usando o deployment fixo atualizado ou o deployment avulso `@1020`.

---

## HANDOFF ANTERIOR — SESSÃO 102 (2026-06-17) → SESSÃO 105

> Nota: as sessões 103 (fix Reuniões + auto-salvamento, @1014) e 104 (Calendar em Reuniões + links/anexos, @1018) não tiveram este roteiro atualizado — ver `PROGRESS.md` para o detalhe dessas duas fases. Handoff retomado a partir desta sessão (105).

### Estado atual: Feat — vínculo MANUAL (opcional) com Google Calendar em Reservas de Espaço, Reservas de Veículo e Ações — Deploy @1019

### O que foi feito nesta sessão (s105)
| Deploy | O que foi implementado |
|---|---|
| @1019 | Novo `shared/calendar_service.gs` (genérico, suporta evento de dia-todo). `ReservaEngine`/`ReservaCarroEngine`/`AcaoEngine` ganham `vincularCalendar`/`desvincularCalendar` — acionados manualmente pelo usuário via botão no detalhe/painel (nunca automático). Usuário escolhe convidar todos os envolvidos cadastrados ou pessoas específicas (checkboxes), podendo adicionar e-mails extras em texto livre. Evento removido automaticamente ao cancelar o registro; sincronizado (Espaço) ao editar data/horário/sala enquanto vinculado. `index.html`: modal global `_abrirModalVincularCalendar()` + botões nos 3 módulos. |

### Limitação técnica assumida nesta sessão
`executeAs: USER_DEPLOYING` (mesma restrição já documentada em Reuniões/s104): toda integração de Calendar opera na conta de deploy, não na do usuário logado. Por isso não há autosugestão via Google Contacts para "outras pessoas" — apenas e-mail digitado livremente.

### Pendente para a próxima sessão
- Executar `fase2_reservas_prepararIndice()` no GAS Editor uma vez (acrescenta colunas `GoogleEventId`/`CalendarConvidados` à aba `ESPACOS.Reservas` já existente).
- Testar manualmente no browser: vincular uma reserva de espaço, uma de veículo e uma ação ao Calendar (modo "todos" e modo "específicos" + e-mail extra), confirmar convite recebido, editar a reserva vinculada e confirmar que o evento é atualizado, cancelar e confirmar que o evento é removido.

---

## HANDOFF ANTERIOR — SESSÃO 102 (2026-06-17) → SESSÃO 103

### Estado atual: Fix Meu Perfil — autocriação de ficha de colaborador para qualquer usuário aprovado — Deploy @1008

### O que foi feito nesta sessão (s102)
| Deploy | O que foi implementado |
|---|---|
| @1008 | **Backend only** (`pessoas_controller.gs`): `ctrl_pessoas_meu_perfil_ler/salvar` exigiam ficha pré-existente em `ColaboradorRepository` — voluntários/contratados/admins aprovados (`AcessoService` status `'ativo'`) sem ficha de RH caíam em erro ao abrir "Meu Perfil". Nova `_obterOuCriarColaboradorMeuPerfil(ctx)` cria ficha mínima na hora (nome/setor herdados de `usuarios_acesso.json`; cargo/tipoVinculo em branco para RH completar) quando não existir, registrando `AuditoriaService('COLABORADOR_AUTO_CRIADO', ...)`. |

### Pendente para a próxima sessão
- Testar manualmente no browser logando como usuário sem ficha de colaborador prévia (ex.: voluntário recém-aprovado) e confirmar que "Meu Perfil" abre e salva sem erro.

---

## HANDOFF ANTERIOR — SESSÃO 100 (2026-06-16) → SESSÃO 101

### Estado atual: UX — Pulse FAB: ring de sonar + escala com ritmo — Deploy @1006

### O que foi feito nesta sessão (s100)
| Deploy | O que foi implementado |
|---|---|
| @1006 | **Frontend only** (`index.html`): `@keyframes fabPulseGlow` — ring sonar via `box-shadow` spread 0px→22px com cor primária fading `.65→0`; escala pico 1.11 em 18%; pausa de descanso 68%–100%; duração 2.4s→3.5s. `@keyframes dc-pulse-icon` — `translateY(-2px)` adicionado no pico para ícone "flutuar". |

---

## HANDOFF ANTERIOR — SESSÃO 99 (2026-06-16) → SESSÃO 100

### Estado atual: Fix badge setor — paleta expandida + atribuição sequencial — Deploy @1005

### O que foi feito nesta sessão (s99)
| Deploy | O que foi implementado |
|---|---|
| @1005 | **Frontend only** (`index.html`): `_SETOR_PALETA` expandida de 10 → 14 cores; atribuição sequencial (`_setorCorNext++`) em vez de hash — garante cores únicas para ≤ 14 setores na mesma view; bug `!_setorCorIdx[id]` quando hash era 0 (falsy) corrigido para `=== undefined`. |

---

## HANDOFF ANTERIOR — SESSÃO 91 (2026-06-16) → SESSÃO 92

### Estado atual: Reserva de Veículo — Editar Rota aprimorado com mapa, paradas e TSP — Deploy @988 (pendente)

### O que foi feito nesta sessão (s93)
| Deploy | O que foi implementado |
|---|---|
| @988 | **Frontend only** (`index.html`): painel "Editar Rota" do modal de detalhes completamente reescrito para aprovadores em PENDENTE/APROVADA. (1) Local de chegada com botão picker de mapa Leaflet (contexto `det-chegada`). (2) Paradas intermediárias: lista dinâmica add/remove, picker de mapa por parada (contexto `det-parada`), campo "Tempo de espera (min)" step=5 por parada. (3) Botão "Rota eficiente": geocodifica paradas sem coord via `ctrl_carro_geocode`, reordena com nearest-neighbor TSP a partir da `localSaida`. (4) Botão "Salvar rota" envia `{localChegada, coordChegada, paradas:[{local,lat,lng,tempoParadaMin}]}`. Novas variáveis de estado: `_mapaContexto` ('form'/'det-chegada'/'det-parada'), `_editRotaParadas`, `_editRotaChegada`, `_editRotaOrigem`. `confirmarMapaPicker` estendido com desvio por contexto. `reserva_carro_repository.gs`: schema comment atualizado com `tempoParadaMin`. |

---

## HANDOFF ANTERIOR — SESSÃO 90 (2026-06-16) → SESSÃO 91

### Estado atual: Datas Comemorativas — painel admin com CRUD, motions e home dinâmica — Deploy @980

### O que foi feito nesta sessão (s90)
| Deploy | O que foi implementado |
|---|---|
| @980 | **Backend**: `_DATAS_COMEMORATIVAS_DEFAULT` (10 datas pré-populadas) em `config_admin_service.gs`; funções `getDatasComemorativas` (público), `listarDatasComemorativas` (admin), `salvarDataComemorativa`, `excluirDataComemorativa` com seed automático do JSON `datas_comemorativas.json`; retorno IIFE atualizado. `admin_controller.gs`: 4 novos controllers (`ctrl_home_datasComemorativas`, `ctrl_admin_listar/salvar/excluirDataComemorativa`). **Frontend**: tab "Datas Comemorativas" em Administração; `DatasComemorativasAdmin` IIFE — lista agrupada por mês, mini-preview strip colorido, modal com preview ao vivo, seletor de motion, emoji, restauração de inativas; `GAS.admin.*DataComemorativa` + `GAS.home.datasComemorativas`; `_DC_MOTION_CLS` mapeia motion→CSS; home carrega do servidor assincronamente; CSS `dc-custom`. |

---

## HANDOFF ANTERIOR — SESSÃO 87 (2026-06-15) → SESSÃO 88

### Estado atual: Financeiro/Contratos/Execução — hierarquia orçamentária com agrupamentos + filtros — Deploy @973 (pendente clasp)

### O que foi feito nesta sessão (s87)
| Deploy | O que foi implementado |
|---|---|
| @973 | **Frontend only**: tab Execução de `ContratosDetailUI` totalmente reescrita. Barra de agrupamento (Meta/Atividade/Setor/Rubrica). Filtros: meta, setor, custeio/investimento. `carregarExecucao` simplificada (usa `_obj` já disponível). `_execCollect` coleta todas as rubricas com contexto meta/atividade. `_execHtml_Meta`: hierarquia colapsável Meta › Atividade › Rubrica com subtotais em cada nível. `_execHtml_Grupo`: agrupamento genérico por atividade ou setor. `_execHtml_Flat`: view plana (rubrica) com breadcrumb. Todos os views: Previsto / Comprometido / Executado / Saldo + barra % semafórica. |

---

## HANDOFF ANTERIOR — SESSÃO 86 (2026-06-15) → SESSÃO 87

### Estado atual: Financeiro/Contratos — DnD atividades + Setor na Rubrica + Barras orçamentárias — Deploy @972

### O que foi feito nesta sessão (s86)
| Deploy | O que foi implementado |
|---|---|
| @972 | **Backend**: `reordenarAtividades` em `contratos_engine.gs`; `ctrl_contratos_reordenar_atividades` em `contratos_controller.gs`. **Frontend**: DnD de atividades dentro de metas; campo Setor migrado da memória de cálculo para o nível da rubrica (form + render + salvar); barras de progresso utilizado/disponível (OrcamentoGuard: totalComprometido+totalExecutado) em rubrica, atividade e meta; coluna Setor removida da tabela de memória de cálculo; nota "não-restritiva" no modal _verMemoria. |

---

## HANDOFF ANTERIOR — SESSÃO 84 (2026-06-15) → SESSÃO 85

### Estado atual: Badge setor cobre 34 pontos — Deploy @962 (s83e já incluiu tudo)

### O que foi feito nesta sessão (s84)
| Deploy | O que foi implementado |
|---|---|
| docs only | Correção de escopo: commit 211bc25 (s83e) já tinha todos os 34 `_badgeSetor` mas docs descreviam só "Admin + PontoUI individual". PROGRESS.md e roteiro-auditoria.md atualizados. Código GAS inalterado, deploy permanece @962. |

---

## HANDOFF ANTERIOR — SESSÃO 83e (2026-06-15) → SESSÃO 84

### Estado atual: Badge setor em Admin aprovação + PontoUI individual · Deploy @962

### O que foi feito nesta sessão (s83e)
| Deploy | O que foi implementado |
|---|---|
| @962 | `IdentidadeAdmin` modal aprovação: `setorDesejado` como `_badgeSetor`. `PontoUI` header "Individual": badge do setor filtrado. |

---

## HANDOFF ANTERIOR — SESSÃO 83d (2026-06-15) → SESSÃO 84

### Estado atual: Setor como badge visual em Ponto/RH/BI · Deploy @961

### O que foi feito nesta sessão (s83d)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @961 | UX — Setor como badge visual (PontoUI, RhUI, BiDemograficoUI) | Todas as ocorrências de `_labelSetor` substituídas por `_badgeSetor` em: PontoUI métricas/header/desvios/tabela; RhUI lista equipe/painel/histórico/alertas férias/rescisão/custo; BiDemograficoUI drill-down. Novo `mesNomeFiltro` inclui badge setor no título do relatório. |

---

## HANDOFF ANTERIOR — SESSÃO 83c (2026-06-15) → SESSÃO 84

### Estado atual: Férias por Período — cards colapsáveis · Deploy @960

### O que foi feito nesta sessão (s83c)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @960 | UX — Férias por Período: substituída tabela por cards colapsáveis | `carregarFeriasUnificado` modo colaborador: cada período agora é um card colorido colapsável igual ao painel do colaborador. Header: nº período + badge + Solicitar. Expand: grid datas, desc status, barra gozados/saldo, cards OFICIAL (azul) e ACORDO INTERNO (roxo) com botões de ação. Vencido+acordo→banner roxo; Vencido+sem cobertura→banner vermelho CLT art.137. Removida função `carregarPeriodosFerias` duplicada (morta, usava SC/SL obsoletos). |

### Pendentes / próxima ação
- (Pendente s75) Executar `criarTriggerAutoConcluirFerias()` no GAS Editor se ainda não executado.

---

## HANDOFF ANTERIOR — SESSÃO 83b (2026-06-15) → SESSÃO 84

### Estado atual: Sincronização git — UX Home comemorativa + nomeApelido

### O que foi feito nesta sessão (s83b — sync)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| já deployado | Sync — UX Home comemorativa + nomeApelido | `boot_service.gs`: `usuarioNomeApelido` e `usuarioDN` no bootstrap. `taskhub_controller.gs`: aniversariantes retorna `nomeApelido` + `setorLabel`; `contexto_pessoal` usa nomeApelido na saudação. `index.html`: `_DATAS_COMEMORATIVAS` (10 datas: Ano Novo, Abolição CE, Fortaleza, Namorados, Ceará, Independência, Crianças, Finados, Natal, Réveillon); animações temáticas `_lancarParticulas(tipo)` (neve, fogos, corações, estrelas, ouro, verde_amarelo); `_lancarConfetes()` no aniversário; banner contextual usa `nomeApelido` para personalização. |

### Pendentes / próxima ação
- (Pendente s75) Executar `criarTriggerAutoConcluirFerias()` no GAS Editor se ainda não executado.

---

## HANDOFF ANTERIOR — SESSÃO 83 (2026-06-15) → SESSÃO 84

### Estado atual: BI unificado — Dashboard como Central de Inteligência · Deploy @959

### O que foi feito nesta sessão (s83)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @959 | Feat — BI unificado: Dashboard → "BI — Central de Inteligência" | `index.html`: (1) Header do Dashboard renomeado; tab-bar com 5 abas: BI Operacional, BI Financeiro, BI Estratégico, BI Demográfico, Insights IA. (2) `#view-bi-demografico` retirado do Router (class="view" → style="display:none"); `#dash-tab-demografico` vazio recebe conteúdo via JS DOM-move na primeira abertura. (3) `DashboardUI`: `_montarDemografico()` move DOM do BI para dentro do Dashboard; tab demografico delega ao `BiDemograficoUI`; `atualizar()` inclui tab demografico; `_statCard()` recebe onclick para navegação. (4) Cards clicáveis: Tarefas→taskhub, Reservas→espacos, Balcão→balcao, Alertas→home, Contratos→financeiro, KPIs→módulos correspondentes, Riscos/Clima→estrategia/escuta. (5) `BiDemograficoUI`: `_drilldownData+_drilldownSeq` para memoização; `_drillDown(key,label)` e `_abrirDrillDownModal(label,regs)` — modal com tabela por contexto (equipe: Nome/Setor/Cargo+Vínculo/Admissão; beneficiários: Pessoa/Ação/Data); `_renderBarras`, `_renderFaixaEtaria`, `_renderCargo`, `_renderTempoAtuacao` com rows clicáveis e hover. (6) `_MODULOS_MENU`: `bi-demografico` removido como item separado. (7) `Router.registrar('bi-demografico')`: redireciona para dashboard + aba demográfico. |

### Pendentes / próxima ação
- (Pendente s75) Executar `criarTriggerAutoConcluirFerias()` no GAS Editor se ainda não executado.

---

## HANDOFF ANTERIOR — SESSÃO 82b (2026-06-15) → SESSÃO 83

### Estado atual: Fix Férias — período vencido com retorno acordado · Deploy @956

### O que foi feito nesta sessão (s82b)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @956 | Fix — Vencido com retorno acordado: saldo não incorre em pagamento em dobro | Painel colaborador `_renderPer`: `temAcordoRetorno = p.ferias.some(f.acordo.diasEfetivosGozados > 0)`; override de `cfg.desc` + cor do saldo (roxo em vez de vermelho); barra mostra "X dias de retorno acordados — sem incidência de dobro". `carregarFeriasUnificado` expand: `diasRetorno` para férias oficiais com retorno antecipado; `diasSemCoberta = saldo - diasAcordados`; alerta vermelho só se `diasSemCoberta > 0`; banner roxo se saldo inteiramente coberto por acordo. |

### Pendentes / próxima ação
- (Pendente s75) Executar `criarTriggerAutoConcluirFerias()` no GAS Editor se ainda não executado.

---

## HANDOFF ANTERIOR — SESSÃO 82 (2026-06-15) → SESSÃO 83

### Estado atual: Aniversariantes corrigido + Banner boas-vindas contextual · Deploy @955

### O que foi feito nesta sessão (s82)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @955 | Fix — Aniversariantes: bug diff data | `ctrl_taskhub_aniversariantes`: comparação de diff usa `hoje0` (meia-noite); `ehHoje` via comparação dia/mês direta. Aniversariantes do dia eram excluídos por `diff < 0`. |
| @955 | Feat — ctrl_taskhub_contexto_pessoal | Nova função backend detecta: aniversário hoje, primeiro acesso (admissão/cadastro ≤ 7 dias), retorno de férias (dataFim ontem ou hoje), retorno de afastamento (dataFim ontem ou hoje). |
| @955 | Feat — Banner home personalizado | `_renderizarHome` chama `contextoPessoal` e aplica classe + ícone + texto específico. Admin: `_renderHomeAdmin` agora também exibe aniversariantes. CSS: 3 variantes de gradiente. |

### Checklist de auditoria — s82
```
[x] prompt()/confirm()/alert() — nenhum novo
[x] GAS.* namespace — GAS.taskhub.contextoPessoal adicionado corretamente
[x] CSS — .banner-aniversario/.banner-boas-vindas/.banner-retorno definidos no :root
[x] IDs de DOM — não alterados
[x] FsmGuardian — não tocado
[x] Modais — não tocado
[x] BtnGuard — não tocado
[x] Datas — comparações ISO no backend; sem datas ISO visíveis ao usuário
```

### Pendentes / próxima ação
- (Pendente s75) Executar `criarTriggerAutoConcluirFerias()` no GAS Editor se ainda não executado.
- (Pendente s74) Executar `fase_colaboracao_provisionar()` no GAS Editor se planilha COLABORACAO ainda não existir.

---

## HANDOFF ANTERIOR — SESSÃO 81 (2026-06-15) → SESSÃO 82

### Estado atual: UX Férias refinado · Deploy @950

### O que foi feito nesta sessão (s81)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @950 | UX — Férias sem colaborador → lista do mês atual | `carregarFeriasUnificado` modo sem colaborador: filtro `ini ≤ anoMes && fim ≥ anoMes`; cabeçalho "Férias em curso em [Mês Ano]"; ordenação por início asc. |
| @950 | UX — Expand rows com cards ricos OFICIAL vs ACORDO | Substituída sub-tabela por cards com borda colorida: ACORDO INTERNO (roxo #7c3aed) com nota "não incide pagamento em dobro"; OFICIAL (azul #1d4ed8) com inset roxo se há acordo vinculado. |
| @950 | UX — Banner de alerta em período vencido com saldo > 0 | Quando `p.status === 'vencido' && p.saldo > 0`: banner vermelho "X dias não cobertos — sujeitos a pagamento em dobro (CLT art. 137)" + nota verde com total de dias cobertos por acordos. |

### Checklist de auditoria — s81
```
[x] prompt()/confirm()/alert() — nenhum novo
[x] GAS.* namespace — sem novos bindings (só frontend)
[x] CSS — sem novas classes; estilos inline nos cards
[x] IDs de DOM — rh-per-exp-N não alterado
[x] FsmGuardian — não tocado
[x] Modais — não tocado
[x] BtnGuard — não tocado; botões de ação já protegidos em _acoesFeriasBtns
[x] Datas — _fmtData() usado em todas as datas dos cards
```

### Pendentes / próxima ação
- (Pendente s75) Executar `criarTriggerAutoConcluirFerias()` no GAS Editor se ainda não executado.
- (Pendente s74) Executar `fase_colaboracao_provisionar()` no GAS Editor se planilha COLABORACAO ainda não existir.

---

## HANDOFF ANTERIOR — SESSÃO 75b (2026-06-15) → SESSÃO 76

### Estado atual: bugs de férias corrigidos · Deploy @940

### O que foi feito nesta sessão (s75 + s75b)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @938 | Fix — Bug crítico `hoje` undefined em `resumoFeriasPorPeriodo` | `pessoas_engine.gs`: variável `hoje` não estava definida na função `resumoFeriasPorPeriodo` — causava `ReferenceError` para qualquer colaborador com férias `aprovado`, derrubando toda a seção "Períodos Aquisitivos e Concessivos". Corrigido declarando `hoje` localmente. |
| @938 | Fix — Lista de férias ordenada da mais recente para a mais antiga | `index.html/carregarFerias`: `.sort()` por `dataInicio` desc antes de renderizar. |
| @938 | Feat — Botão "Concluir" direto para férias aprovadas (sem obrigar Acordo) | `index.html`: botão Concluir em férias `aprovado`; handlers `concluirFerias` + `_confirmarConcluirFerias` no módulo RhUI. |
| @938 | Fix — Setor exibido com label legível na calculadora de rescisão | `index.html/_aoSelecionarColabRescisao`: `_labelSetor(c.setor)` em vez de slug cru. |
| @938 | Feat — Auto-conclusão de férias 12h após fim do período | `event_handler_registry.gs`: `autoConcluirFeriasVencidas()` + `criarTriggerAutoConcluirFerias()`. `pessoas_engine.gs`: `autoConcluirFeriasVencidas()` + `_listarOrgIds()`. Trigger diário 12:00. |
| @938 | Feat — Notificações por email no fluxo de férias | `pessoas_engine.gs`: helpers `_emailsRH`, `_enviarEmailFerias`, `_notificarRHFeriasSolicitadas`, `_notificarColaboradorFeriasAprovadas`, `_notificarMudancaFerias`. Chamados em: `solicitarFerias` (→ RH), `aprovarFerias` (→ colaborador), `cancelarFerias` (→ ambos), `editarFerias` (→ ambos). |
| @938 | Feat — Edição de datas de férias pendentes | `pessoas_engine.gs/editarFerias`: valida status=pendente + início futuro, atualiza datas, notifica. `pessoas_controller.gs/ctrl_rh_editar_ferias`. `index.html`: GAS binding, botão Editar para pendentes, modal `abrirFormEditarFerias` + `_enviarEdicaoFerias`. |
| @940 | Fix — Período matching corrigido para janelas concessivas disjuntas | `pessoas_engine.gs/resumoFeriasPorPeriodo`: filtro mudado de `(aquisitivoInicio..concessivoFim)` → `(concessivoInicio..concessivoFim)`. Bug causava dupla/tripla contagem: Felix 21d (Period 2) aparecia como 60d, 9d (Period 3) como 47d. Fallback `p.numero===1` cobre férias antecipadas no período inicial sem janela concessiva. |
| @940 | Fix — alertasFeriasAtivos usa saldo real | `pessoas_engine.gs/alertasFeriasAtivos`: substituído `calcularPeriodosAquisitivos` (saldo sempre 30d) por `resumoFeriasPorPeriodo` para usar dias gozados reais por colaborador. |
| @940 | Feat — Botão "Solicitar" na tabela de Períodos | `index.html/carregarPeriodosFerias`: coluna Ação com botão "Solicitar" para períodos `em_concessao` ou `vencido` com saldo > 0; pré-preenche colaborador no modal de solicitação. |
| pendente | Feat — Cancelamento restrito a férias não iniciadas | `pessoas_engine.gs/cancelarFerias`: bloqueia se `dataInicio ≤ hoje`. Frontend: botão Cancelar visível para `pendente` e `aprovado` apenas se `dataInicio > hoje`. |

### Checklist de auditoria — s75
```
[x] prompt()/confirm()/alert() — nenhum; _abrirModalConfirmarRh + Toast usados
[x] GAS.* namespace — GAS.rh.editarFerias adicionado + GAS.rh.concluirFerias já existia
[x] CSS — sem novas classes; modal usa var(--surface) e var(--surface2) padrão
[x] IDs de DOM — rh-fer-edit-ini/fim/obs novos, únicos no modal dinâmico
[x] FsmGuardian — cancelarFerias usa _transitarFerias com FSM
[x] Modais — abrirFormEditarFerias usa _abrirModalRh com background padrão
[x] BtnGuard — rh-btn-salvar-edit-fer e rh-btn-conf-conc-fer protegidos
[x] Datas — _fmtDataEmail(iso) em emails; fmtDataPtBR no frontend
[x] Pós-deploy: executar criarTriggerAutoConcluirFerias() uma vez no GAS Editor
```

### Pendentes / próxima ação
- **Pós-deploy obrigatório**: executar `criarTriggerAutoConcluirFerias()` no GAS Editor → verificar trigger criado.
- (Pendente s74) Executar `fase_colaboracao_provisionar()` no GAS Editor se planilha COLABORACAO ainda não existir.
- (Pendente s73) Testar drag-and-drop de níveis no mapa.
- (Pendente) Sobrepor mapas: botão "Sobrepor referência" em `MapaAcaoEditorUI`.

---

## HANDOFF ANTERIOR — SESSÃO 74 (2026-06-15) → SESSÃO 75

### Estado atual: ~264 bugs registrados · Deploy pendente (s74)

### O que foi feito nesta sessão (s74)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| concluído | Infra — Planilha COLABORACAO dedicada para TLDraw/DocSharing | `setup.gs`: `PROP_SHEETS.COLABORACAO='SHEET_ID_COLABORACAO'`; `SCHEMA_ABAS.COLABORACAO=['Quadros','DocumentosCompartilhados']`; `'Quadros'` removido de ACOES; `'DocumentosCompartilhados'` removido de MASTER; função `fase_colaboracao_provisionar()` cria planilha, prepara abas e migra índices com dedup por id/token. `quadros_repository.gs`: 3× SHEET_ID_ACOES → SHEET_ID_COLABORACAO. `document_sharing_service.gs`: 3× SHEET_ID_MASTER → SHEET_ID_COLABORACAO. Drive JSON canônico intacto. |

### Pendentes / próxima ação
- **Pós-deploy obrigatório**: executar `fase_colaboracao_provisionar()` uma vez no GAS Editor → verificar `{ok:true, quadrosMigrados:N, documentosMigrados:N}`.
- Confirmar que SHEET_ID_COLABORACAO está em PropertiesService (Admin → PropertiesService do GAS Editor).

---

## HANDOFF ANTERIOR — SESSÃO 73 (2026-06-14) → SESSÃO 74

### Estado atual: ~264 bugs registrados · Deploy @926 (GAS)

### O que foi feito nesta sessão (s73)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @926 | Feat — Drag-and-drop para reordenar níveis no modal "Gerenciar Níveis do Mapa" | `index.html / InfraConfigMapaUI`: nova função `_initNiveisDragDrop(overlay)`. Cada `<tr>` tem `draggable="true"` e coluna de alça `⠿`. Event delegation no `<tbody>` captura `dragstart`/`dragend`/`dragover`/`dragleave`/`drop`. No `drop`: `_sincronizarInputs()` → reordena `overlay._niveisEdit` → `_reRenderTbody()`. Flag `tbody._dragInited` evita listener duplicado em re-aberturas. Linhas de `_modalNivelAdicionar` também têm `draggable="true"` + alça e são cobertas pela delegation. |

### Checklist de auditoria — s73
```
[x] prompt()/confirm()/alert() — zero; sem novos diálogos nativos
[x] GAS.* namespace — sem novos controllers; mudança é só frontend
[x] CSS — sem classes novas; estilos inline
[x] IDs de DOM — cfg-nivel-row-{i} regenerados corretamente após _reRenderTbody
[x] FsmGuardian — sem transições de status
[x] Modais — sem novos modais
[x] BtnGuard — sem novos botões assíncronos
[x] Datas — sem datas novas
```

### Pendentes / próxima ação
- Testar drag-and-drop: Admin → Config → Mapa → "Gerenciar Níveis" → arrastar linha pelo ⠿ → verificar reordenação visual + cor de highlight; Salvar → confirmar que ordem foi persistida.
- (Pendente de sessão anterior) Sobrepor mapas: botão "Sobrepor referência" em `MapaAcaoEditorUI` para carregar outro mapa como ghost layer.
- (Pendente) Clipboard cross-map: promover `_clipboard` para nível de módulo + indicador no listview.

---

## HANDOFF ANTERIOR — SESSÃO 72 (2026-06-14) → SESSÃO 73

### Estado atual: ~264 bugs registrados · Deploy @925 (GAS)

### O que foi feito nesta sessão (s72)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @925 | Feat — HUD de dimensões em tempo real nos editores de mapa | `mapa_acao_editor.html`: `_showDimHud`/`_hideDimHud`; chamados em `_onMouseMove` durante `resize` (rect/polígono + círculo) e `multi-resize` (bbox do grupo); `_hideDimHud` em `_onMouseUp` e `_voltar`. `mapa_editor.html`: novo parâmetro `escala` em `abrir()`; `_showDimHud` após resize na mousemove; `_hideDimHud` em `fechar()` e `mouseup`. `index.html / InfraConfigMapaUI`: `_showDimHud` após `_resizeInline`; `_hideDimHud` em mouseup; `getEscala()` exposto no return; `EspacosUI._editarMapa` passa `InfraConfigMapaUI.getEscala()` ao abrir `MapaEditorUI`. HUD: `position:fixed`, `pointer-events:none`, fundo escuro semitransparente, texto branco 11px, z-index 99999. Não aparece sem escala configurada; some no mouseup. |

### Checklist de auditoria — s72
```
[x] prompt()/confirm()/alert() — zero; sem modais novos
[x] GAS.* namespace — sem novos controllers; mudança é só frontend
[x] CSS — sem classes novas; HUD usa cssText inline
[x] IDs de DOM — _dim-hud (único, reutilizado entre editores que nunca estão abertos ao mesmo tempo)
[x] FsmGuardian — sem transições de status
[x] Modais — sem novos modais
[x] BtnGuard — sem novos botões assíncronos
[x] Datas — sem datas novas
```

---

## HANDOFF ANTERIOR — SESSÃO 71 (2026-06-14) → SESSÃO 72

### Estado atual: ~264 bugs registrados · Deploy @888 (GAS)

### O que foi feito nesta sessão (s71)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @888 | Feat — Aba Documentos RH | `colaborador_repository.gs`: `documentos_rh.json` com `listarDocumentos/salvarDocumento/excluirDocumento`. `pessoas_engine.gs`: wraps com validação e auditoria. `pessoas_controller.gs`: 3 controllers RBAC. `index.html`: HTML da aba substituído; `carregarDocumentos()` em `setTab`; modal `_abrirModalSimples` para add/edit; `_abrirModalConfirmar` para exclusão; `GAS.rh` bindings. |

### Checklist de auditoria — s71
```
[x] prompt()/confirm()/alert() — zero; exclusão usa _abrirModalConfirmar
[x] GAS.* namespace — listarDocumentos/salvarDocumento/excluirDocumento adicionados em GAS.rh
[x] CSS — sem classes novas; usa form-control, form-label, tabela, btn já definidos
[x] IDs de DOM — rh-doc-filtro-colab, rh-doc-filtro-tipo, rh-doc-lista, rh-doc-btn-add; rh-doc-f-* dentro do modal (dinâmico)
[x] FsmGuardian — sem transições de status
[x] Modais — box usa background via _abrirModalSimples (var(--surface)); overlay rgba(15,23,42,.70)
[x] BtnGuard — rh-doc-btn-add tem data-bg-skip="1"; rh-doc-btn-salvar protegido com BtnGuard.wrap
[x] Datas — dataDocumento e validade exibidos com fmtDataPtBR()
```

### Pendentes / próxima ação
- Testar aba Documentos: Pessoas/RH → Documentos → adicionar documento → lista exibe → editar → excluir.
- Confirmar que filtro por colaborador + tipo filtra corretamente.
- Verificar BtnGuard.auditar() no console.

---

## HANDOFF ANTERIOR — SESSÃO 70 (2026-06-13) → SESSÃO 71

### Estado atual: ~264 bugs registrados · Deploy @871 (GAS)

### O que foi feito nesta sessão (s70)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @871 | Fix primeiro_acesso dropdown — fallback JS + ctrl_acesso_getSetores | `acesso_service.gs`: `ctrl_acesso_getSetores()` sem verificação de auth (setores são dados públicos da org). `primeiro_acesso.html`: `window.addEventListener('load')` — se `<select id="setor">` tiver apenas o placeholder, busca setores via `google.script.run.ctrl_acesso_getSetores()` e popula dinamicamente. Cobre todos os cenários onde o template server-side falha (orgId mismatch, Drive permission, "Execute as: User"). |
| @866 | Perf — AppCache em reservas e reservas-de-carros | `reservas_controller.gs` + `reserva_carro_controller.gs`: AppCache 60-120s em listar/metricas/dados; invalidação em todos os write paths. |
| @865 | Fix getSetores() — fallback para dados sem orgId | `config_service.gs → getSetores()`: tenta sem filtro de orgId antes de cair no `_defaultSetores()`. |
| @863 | Perf — AppCache em 5 módulos + boot TTL 300s | boot TTL 60s → 300s; pessoas/tarefas/balcao/financeiro: AppCache 60–120s. |
| @861 | Auditoria de bugs — 4 correções | rh-ev-setor-anterior display; ADM-01 erro pendentes; datas Ocorrências e Habilitações. |

### Checklist de auditoria — s70
```
[x] prompt()/confirm()/alert() — zero ocorrências
[x] GAS.* namespace — ctrl_acesso_getSetores adicionado sem auth
[x] CSS — sem classes novas
[x] IDs de DOM — sem novos IDs
[x] FsmGuardian — sem novas transições
[x] Modais — sem novos modais
[x] BtnGuard — sem novos botões assíncronos
[x] Datas — sem novas datas
```

### Pendentes / próxima ação
- Testar com usuário real de primeiro acesso (@871): abrir sistema → dropdown de setor deve exibir opções (do servidor ou fallback JS).
- Se dropwdown carregar corretamente → marcar PREVIEW-01 como CORRIGIDO.
- Testar RH → Novo Evento → Mudança de Setor → campo "Setor Anterior" legível.
- Testar Admin → Acessos Pendentes: mensagem de erro se backend falhar.

---

## HANDOFF ANTERIOR — SESSÃO 69 (2026-06-13) → SESSÃO 70

### Estado atual: ~266 bugs registrados · Deploy @834 (GAS)

### O que foi feito nesta sessão (s69)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @834 | UX — setor legível em todos os módulos | Helper global `_labelSetor(id)` adicionado — consulta `App.getBoot().setores` por `id`/`nome`, retorna `label\|\|nome` ou o id como fallback. Aplicado em: tabela equipe RH, modal detalhes colaborador, cabeçalho período Ponto/Métricas, tabela "Por Setor" Ponto, card Risco CLT, tabela individual Ponto, tabela usuários Admin, seção "Dados Profissionais" Meu Perfil. |
| @833 | BI Demográfico — fix Personas: carregamento eterno + setor slug cru | `gerarPersonas(done)` declara parâmetro `done`; `_setorLabel(ms)` no card de Personas. |
| @832 | BI Demográfico — reconstrução SCD completa por período | `_enriquecerComHistorico(regs, ateYM)` + `_renderizar`/`gerarPersonas` passam `regH`. |
| @831 | BI Demográfico — fix carregamento eterno + leitura de histórico SCD | `atualizar(done)`/`_carregar(onDone)` com callback; BI controller lê histórico SCD. |

### Checklist de auditoria — s69
```
[x] prompt()/confirm()/alert() — sem novas ocorrências
[x] GAS.* namespace — sem novos endpoints
[x] CSS — sem classes novas
[x] IDs de DOM — sem novos IDs
[x] FsmGuardian — sem novas transições
[x] Modais — sem novos modais
[x] BtnGuard — gerarPersonas(done) e atualizar(done) chamam done() corretamente
[x] Datas — sem novas datas na UI
```

### Pendentes / próxima ação
- **Testar no browser (@834)**: RH → lista equipe → coluna Setor deve exibir label legível (ex. "Escola de Cultura e Artes", não slug). Ponto → Métricas RH → tabela "Por Setor" → labels legíveis.
- **Testar no browser (@833)**: BI Demográfico → Gerar Personas → botão liberado após gerar; setor no card exibe label legível.

---

## HANDOFF ANTERIOR — SESSÃO 68 (2026-06-12) → SESSÃO 69

### Estado anterior: ~266 bugs registrados · Deploy @830 (GAS)

### O que foi feito nesta sessão (s68)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @830 | Infraestrutura — Reserva de Veículo: disponibilidade por data + geocodificação + bloqueio buffer aprovação | **Backend**: `escala_carro_engine.gs` — (1) `calcularTempoRota` retorna `origemResolvida`/`destinoResolvido` extraídos de `legs[0].start_address` / `legs[last].end_address` da resposta Maps API — endereço geocodificado real, não a abreviação informada. (2) Buffer de retorno: descrição agora inclui locais (`"Retorno: Pinacoteca → CCBJ (44 min + 5 min buffer)"`). (3) `proximoHorario` usa `baseMins=0` para datas futuras (antes usava hora atual → mostrava 21:14 para datas do dia seguinte). `reserva_carro_engine.gs` — `aprovar()` chama `EscalaCarroEngine.calcularDisponibilidade` antes de `aprovarAtomico`; se `horaSaida` não cair em janela livre (considerando buffer de retorno), aprovação bloqueada com mensagem clara + próximo horário. **Frontend**: `index.html` — (1) Cabeçalho painel disponibilidade exibe data (`fmtDataPtBR`). (2) `calcularRota()`: ao receber resultado, atualiza campos `carro-f-local-saida`/`carro-f-local-chegada` com endereço resolvido — elimina ambiguidade de abreviações no payload salvo. (3) `debouncePreviewMapa()` + `onchange` de `carro-f-saida` disparam `_atualizarDisponibilidade()` — painel recalcula buffer ao mudar local de saída ou hora. (4) Aviso inline vermelho quando horaSaida está em janela bloqueada; rótulo "Saída mínima (c/ retorno)" quando há blocos de buffer. (5) `_atualizarDisponibilidade` exposta no objeto público. |

### Checklist de auditoria — s68
```
[x] prompt()/confirm()/alert() — sem novas ocorrências
[x] GAS.* namespace — sem novos endpoints; bindings existentes inalterados
[x] CSS — sem classes novas
[x] IDs de DOM — carro-disp-data-label adicionado; consistente
[x] FsmGuardian — aprovar() mantém assertValida; novo check é PRÉ-FSM, não substitui
[x] Modais — sem novos modais
[x] BtnGuard — sem novos botões assíncronos; _atualizarDisponibilidade não tem BtnGuard (correto: é silencioso)
[x] Datas — carro-disp-data-label usa fmtDataPtBR(); sem ISO cru
```

---

## HANDOFF ANTERIOR — SESSÃO 67 (2026-06-12) → SESSÃO 68

### Estado anterior: ~266 bugs registrados · Deploy @828 (GAS)

### O que foi feito nesta sessão (s67)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @829 | UX — Erradicação de prompt()/confirm()/alert() | Proibição formal adicionada ao CLAUDE.md. `_modalInput(opts, cb)` e `_abrirModalConfirmar` atualizados (suporte a `cbCancelar`). 45 ocorrências substituídas em `index.html`, `terreno_editor.html`, `mapa_acao_editor.html`. `alert()` em `primeiro_acesso.html` e `portal_aprovacao.html` → display inline de erro. Zero diálogos nativos em código ativo. |
| @828 | Infraestrutura — Fase 22 completa: reserva de carro complexificada | **Backend (22a)**: 5 novos arquivos GAS. `veiculos_repository.gs`: frota multi-veículo, `id:'default'` auto-criado. `escala_carro_repository.gs`: disponibilidade por tipo (semanal com diasSemana[]+vigência ou específica por data). `escala_carro_engine.gs`: `podAprovarCarro(email)` centralizado; `calcularDisponibilidade()` com subtração de intervalos + buffer Maps API; `calcularTempoRota()` com waypoints; CRUD escalas + veículos. `escala_carro_controller.gs`: 9 novos endpoints. `acesso_service.gs`: `setoresGerenciados[]`. `reserva_carro_repository.gs`: schema enriquecido, `aprovarAtomico` com lock. `reserva_carro_engine.gs`: `editarRota()`. **Frontend (22b)**: seletor veículo, paradas com map picker, hora estimada, painel disponibilidade, aba Escala, modal detalhes com Editar Rota. |

### Checklist de auditoria — s67
```
[x] prompt()/confirm() — _removerEscala usa confirm() que retorna boolean (sem null)
[x] GAS.* namespace — 10 novos bindings
[x] Modais — background opaco em todos os novos overlays
[x] BtnGuard — calcularRota, _salvarEscala, _salvarVeiculo, _confirmarEditarRota usam BtnGuard.wrap
[x] Datas — fmtDataPtBR() em _renderEscala
```

---

## HANDOFF ANTERIOR — SESSÃO 66 (2026-06-12) → SESSÃO 67

### Estado anterior: ~266 bugs registrados · Deploy @821 (GAS)

### O que foi feito nesta sessão (s66)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @821 | RH — Histórico temporal demográfico (PcD, pai/mãe, gênero, raça/cor, sexualidade) | **Arquitetura SCD (Slowly Changing Dimension)** aplicada a todos os campos demográficos quantificáveis. **Backend** (`pessoas_controller.gs`): `_registrarDemografia` generalizado — indicador automático para grupos sem booleano (genero/racaCor/sexualidade); `ctrl_pessoas_salvar` e `ctrl_pessoas_meu_perfil_salvar` agora registram `pcdHistorico`, `paiMaeHistorico`, `generoHistorico`, `racaCorHistorico`, `sexualidadeHistorico` (arrays `{...dados, dataInicio, dataFim}`); campos genero/racaCor/sexualidade auto-constroem objeto demografia quando frontend envia só o campo plano. **Backend** (`colaborador_repository.gs`): `_CAMPOS_PROTEGIDOS` agora protege os 5 arrays de histórico (não mais os campos planos pcd/paiMae). **Migração**: `fase1_colaboradores_migrarHistoricosDemograficos()` semeia histórico a partir de campos planos legados (datas padrão 2020-01-01), idempotente. **Frontend** (`index.html`): campos "Vigente desde" (opcional) adicionados em ambos os formulários (Meu Perfil e Ficha RH) para pcd-detalhes, pai-mae-detalhes e identidade (gênero/raça/sexualidade); populate lê da entrada vigente (`dataFim===null`) do histórico com fallback para campos planos legados; save envia `pcdDemografia`, `paiMaeDemografia`, `generoDemografia`, `racaCorDemografia`, `sexualidadeDemografia` com `dataInicio` explícito. |

### Checklist de auditoria — s66
```
[x] prompt()/confirm() — não usados nesta fase
[x] GAS.* namespace — GAS.perfil.salvar e GAS.pessoas.salvar já existem; sem novos bindings
[x] CSS — sem classes novas; date inputs usam form-input existente
[x] IDs de DOM — novos IDs: p-pcd-data-inicio, p-pm-data-inicio, p-identidade-data-inicio, rh-pf-pcd-data-inicio, rh-pf-pm-data-inicio, rh-pf-identidade-data-inicio
[x] FsmGuardian — sem transições de status nesta fase
[x] Modais — sem novos modais
[x] Datas — campos type=date (ISO interno); vigente-desde é opcional (vazio = hoje no backend)
[x] BtnGuard — sem novos botões assíncronos; botões existentes já protegidos
```

### Pendentes / próxima ação
- **Migração obrigatória**: rodar `fase1_colaboradores_migrarHistoricosDemograficos()` no GAS Editor → deve retornar `{ok:true, seeded:N, ignored:M}`
- **Testar no browser (@825)**: Meu Perfil → Saúde → "PcD = Sim" → preencher detalhes → salvar → confirmar persiste; reabrir → dados preenchidos; Ficha RH → mesmo fluxo
- **Pendente anterior**: Deduplificação João Paulo — `recuperar_diagnosticar_duplicatas()` → `recuperar_deduplicar_joao_paulo(id)`

---

## HANDOFF ANTERIOR — SESSÃO 65 (2026-06-12) → SESSÃO 66

### Estado anterior: ~266 bugs registrados · Deploy @820 (GAS)

### O que foi feito nesta sessão (s65)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @820 | RH — Férias: saldo correto, acordo melhorado, edição inline na modal do colaborador | **Backend** (`pessoas_engine.gs`): `solicitarFerias` agora calcula e persiste `totalDias` na criação; normaliza aliases `dataInicio`/`dataFim`. `resumoFeriasPorPeriodo` robustecido: conta férias `aprovado` cujo `dataFim <= hoje` além das `concluido`; status normalizado (minúsculas + strip acentos). **Frontend** (`index.html`): (1) Períodos Aquisitivos ordenados por data decrescente (mais recente no topo). (2) Accord modal reescrito — recebe datas originais aprovadas e `totalDias`; pré-preenche datas; mostra card de referência com período aprovado; saldo = `totalDias aprovado − diasGozados`. (3) Sistema de **modal secundário** empilhado: `_abrirModalRhSecundario` (z-index 10000) / `_fecharModalSecundario` / `_recarregarDetFerias` / `_recarregarDetEventos`. (4) **Inline Férias**: "Solicitar férias" na modal do colaborador abre form em modal secundário; ao salvar → fecha secundário + atualiza só o painel de férias da modal. (5) **Inline Eventos**: "Adicionar evento" abre mini-form completo (todos os tipos: reajuste, promoção, mudança cargo, carga, advertência, outro) em modal secundário; ao salvar → atualiza só o painel de histórico. (6) Fix "? dias": calcula a partir das datas quando `totalDias` ausente. |
| @819 | RH — Campo pai/mãe em Meu Perfil e Ficha Colaborador | Sessão anterior. |
| @818 | RH — Campo PcD em Meu Perfil e Ficha Colaborador | Sessão anterior. |

### Checklist de auditoria — s65
```
[x] prompt()/confirm() — não usados
[x] GAS.* namespace — GAS.rh.listarFerias e GAS.rh.historico usados em _recarregarDet*
[x] CSS — rh-modal-secundario usa rh-modal-overlay existente; sem classes novas órfãs
[x] IDs de DOM — rh-fer-sec-* e rh-ev-sec-* usam prefixo próprio; sem colisão
[x] FsmGuardian — sem transições de status (solicitarFerias = status 'pendente', sem FSM)
[x] Modais — modal secundário usa background:var(--surface) opaco; overlay rgba(0,0,0,.5)
[x] Datas — campos de data usam type=date (ISO interno); exibição via fmtDataPtBR
[x] BtnGuard — _enviarFeriasSec e _salvarEventoSec protegidos com BtnGuard.wrap
```

### Pendentes / próxima ação
- **Deduplificação obrigatória**: rodar `recuperar_diagnosticar_duplicatas()` no GAS Editor → anotar o ID da cópia espúria de João Paulo → rodar `recuperar_deduplicar_joao_paulo(idDuplicado)`. Isso corrigirá o GOZADO = 0d nos Períodos Aquisitivos.
- **Testar no browser (@820)**: RH → Férias → card Períodos → período mais recente no topo; Acordo → datas pré-preenchidas do período aprovado, saldo correto; RH → Equipe → ver colaborador → "Solicitar férias" → abre modal secundário (modal do colaborador não fecha) → salvar → painel atualiza; "Adicionar evento" → idem.
- **Testar no browser (@819)**: Meu Perfil → Saúde → "É pai/mãe? = Sim" → painel expande → salvar → persiste; Ficha RH → mesmo fluxo
- **Pós-deploy @790 (obrigatório p/ professores)**: Ficha RH → marcar como "Apuração semanal" + rodar `ctrl_ponto_recalcular_bh_todos`

---

## HANDOFF ANTERIOR — SESSÃO 64 (2026-06-12) → SESSÃO 65

### Estado anterior: ~266 bugs registrados · Deploy @819 (GAS)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @819 | RH — Campo pai/mãe em Meu Perfil e Ficha Colaborador | **Backend**: 3 campos em `_CAMPOS_PROTEGIDOS` + `_PERFIL_CAMPOS_EDITAVEIS`: `ePaiMae`, `papelParental`, `numFilhos`. **Frontend**: bloco condicional na seção Saúde de ambos os forms. Toggle `_togglePaiMae` exposto em `PerfilUI` e `RhUI`. |
| @818 | RH — Campo PcD em Meu Perfil e Ficha Colaborador | **Backend**: 4 campos `pcd`, `pcdTipos`, `pcdSuporte`, `pcdSuporteDescricao`. Bloco condicional com tipos LBI/Lei de Cotas. |
| @816 | BI Demográfico — geocodificação precisa + toggle mapa de bairros | Fase anterior. |

---

## HANDOFF ANTERIOR — SESSÃO 63 (2026-06-12) → SESSÃO 64

### Estado atual: ~266 bugs registrados · Deploy @816 (GAS)

### O que foi feito nesta sessão (s63)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @816 | BI Demográfico — geocodificação precisa + toggle mapa de bairros | **Backend**: `_biGeocodificar` refatorada — aceita `{logradouro,numero,bairro,cidade,uf,cep}`, query usa endereço completo quando disponível (rua precisa vs. centróide de bairro). Para colaboradores com CEP+logradouro: `geoKey = end:<cep>:<logradouro>` (precisão de rua); só CEP: `cep:<cep>`; fallback: `bairro|cidade`. `bairroKey` (sempre bairro-nível) adicionado ao microdado de equipe e beneficiários. **Frontend**: toggle "Calor / Bairros" no card de mapa; modo Bairros agrega por `bairroKey`, exibe círculo por bairro com tamanho proporcional à contagem e tooltip com nome+cidade+quantidade; escala de cor verde→amarelo→laranja→vermelho; estado preservado ao trocar filtros. |
| @803 | RH — fix 3 bugs críticos de exclusão/recuperação de colaborador | Fase anterior. |

### Checklist de auditoria — s63
```
[x] prompt()/confirm() — não usados
[x] GAS.* namespace — BiDemograficoUI.setModoMapa exposto; botões data-bg-skip="1"
[x] CSS — sem classes novas
[x] IDs de DOM — bi-dem-modo-calor / bi-dem-modo-bairros (novos, consistentes)
[x] FsmGuardian — sem transições de status
[x] Modais — sem modais novos
[x] Datas — sem datas em UI
[x] BtnGuard — botões de modo com data-bg-skip="1" (navegação pura, correto)
```

### Pendentes / próxima ação
- **Testar no browser (@816)**: BI Demográfico → Carregar Mapa → toggle "Bairros" → círculos aparecem por bairro com tooltip; toggle "Calor" volta ao heatmap; filtros de setor/período atualizam o mapa

---

## HANDOFF ANTERIOR — SESSÃO 62 (2026-06-11) → SESSÃO 63

### Estado atual: ~266 bugs registrados · Deploy @803 (GAS)

### O que foi feito nesta sessão (s62)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @803 | RH — fix 3 bugs críticos de exclusão/recuperação de colaborador | **Bug 1 — auto-exclusão**: `ctrl_pessoas_excluir` bloqueava hard-delete do próprio registro (erro explícito antes de qualquer operação). **Bug 2 — recuperação pós-delete**: `recuperar_colaborador_aplicar` fazia `buscarPorId` → recebia null → retornava erro; agora tenta também por email e, se não encontrar, RECRIA o registro via `ColaboradorRepository.salvar` (insert). **Bug 3 — busca no histórico**: `recuperar_colaborador_historico` usava `indexOf('jpbarros')` no email institucional `joao.barros@idm.org.br` — nunca casava; corrigido para `indexOf('joao.barros')`. **Nova** `recuperar_diagnosticar_estado()`: mostra estado real de `colaboradores.json` (matches por email/nome, duplicatas, registros em `usuarios_acesso.json`). **Nova** `recuperar_colaborador_do_acesso()`: caminho de recuperação sem histórico Drive — cria registro mínimo de `usuarios_acesso.json` (campos RH completados manualmente depois); idempotente. |
| @802 | BI Demográfico — UI redesenhada | Fase anterior. |

### Checklist de auditoria — s62
```
[x] prompt()/confirm() — não usados
[x] GAS.* namespace — sem mudanças no frontend
[x] CSS — sem mudanças de CSS
[x] IDs de DOM — sem mudanças de DOM
[x] FsmGuardian — sem transições de status nesta fase
[x] Modais — sem modais novos
[x] Datas — sem datas em UI
[x] BtnGuard — sem botões novos
```

### Pendentes / próxima ação
- **Executar protocolo de recuperação acima no GAS Editor**
- **Testar no browser**: RH → Equipe → "João Paulo" deve aparecer na lista; Meu Perfil → dados presentes (recarregar após deploy para limpar cache de sessão)
- **Testar no browser (@797 — BI Demográfico)**: navegar em BI Demográfico → KPIs carregam; barras de gênero/sexualidade/raça/faixa etária aparecem
- **Testar no browser (@796 — Ficha RH)**: CPF na ficha; gênero Cis/Trans; vínculo Terceirizado
- **Pós-deploy @790 (obrigatório p/ professores)**: Ficha RH → marcar como "Apuração semanal" + rodar `ctrl_ponto_recalcular_bh_todos`

---

## HANDOFF ANTERIOR — SESSÃO 61 (2026-06-11) → SESSÃO 62

### Estado atual: ~266 bugs registrados · Deploy @797 (GAS)

### O que foi feito nesta sessão (s61)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @797 | BI Demográfico — Painel de análise de perfil | **Backend**: `bi_demografico_controller.gs` (já existia) — `ctrl_bi_demografico_equipe` (microdados anonimizados, geocodificação Maps API + cache `bi_geo_cache.json`) e `ctrl_bi_demografico_beneficiarios` (inscrições Público, CEP→bairro ViaCEP + geocodificação). **Frontend**: view `#view-bi-demografico`; tabs Equipe/Beneficiários; filtros (período/ano, setor/ação, vínculo CLT/PJ/Estagiário/Terceirizado, status); KPI strip MetricsToggle; 4 cards demográficos com barras coloridas por categoria (Gênero, Sexualidade, Raça/Cor, Faixa Etária); grid Setor+Território (toggle Bairros/Cidades); mapa de calor Leaflet+leaflet-heat (OpenStreetMap; fallback círculos); análise de Personas (perfil predominante, jovens <30, sênior 40+). `GAS.biDemografico.equipe/beneficiarios`. Menu RELATORIOS. |

### Checklist de auditoria — s61
```
[x] prompt()/confirm() — não usados
[x] GAS.* namespace — GAS.biDemografico.equipe + beneficiarios mapeados
[x] CSS — classes usadas: filter-bar, select-sm, tab-btn, tab-ativa, card, stat-card, stats-strip, muted-text — todas existentes
[x] IDs de DOM — bi-dem-* fixos, sem sanitização regex
[x] FsmGuardian — sem transições de status (BI é somente leitura)
[x] Modais — nenhum modal novo
[x] Datas — período exibido como ano (string "2025"); sem ISO cru em UI
[x] BtnGuard — atualizar/mapa/personas com BtnGuard.wrap; botões sync com data-bg-skip="1"
```

### Pendentes / próxima ação
- **Testar no browser (@797 — BI Demográfico)**: navegar em BI Demográfico → KPIs carregam; barras de gênero/sexualidade/raça/faixa etária aparecem; filtro por setor filtra os gráficos; Carregar Mapa → mapa Leaflet aparece com heat layer; tab Beneficiários → dados de inscrições; Gerar Personas → 3 personas aparecem
- **Testar no browser (@796 — Ficha RH)**: CPF na ficha; gênero Cis/Trans; vínculo Terceirizado
- **Pós-deploy @790 (obrigatório p/ professores)**: Ficha RH → marcar como "Apuração semanal" + rodar `ctrl_ponto_recalcular_bh_todos`
- **Próximo bug de auditoria:** AFT-02 (anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 60 (2026-06-11) → SESSÃO 61

### Estado atual: ~266 bugs registrados · Deploy @795 (GAS)

### O que foi feito nesta sessão (s60)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @789 | Ponto — UX/UI Espelho + Métricas RH | **Espelho**: troca de mês reseta período p/ "Mês selecionado" (`_pintarBotoesPeriodo` extraído — antes o botão de período ficava aceso indevidamente); período agregado desabilita o seletor de mês (tooltip) e cards ganham sufixo do período + nota sobre a tabela diária; fallback de erro no consolidado. **Métricas RH**: mês com `onchange` + cache por mês (`_metrCacheMes`, troca instantânea); Atualizar = força recálculo; Evolução auto-carrega em background (botão removido); setor preservado na troca de mês. **Painel Riscos CLT**: cards por colaborador com datas das ocorrências (backend retorna `jornadasLongasDatas`/`semIntervaloDatas` em `ctrl_ponto_metricas_rh`). **Tabela individual**: chips Com registro/Risco CLT/Todos (default Com registro), badge "Sem registro", ordenação riscos primeiro. **Gráficos**: fontes/alturas maiores + tooltips. ⚠️ `index.html` desta fase foi commitado em f560d3e (@787) por sessão paralela; @789 entrega o backend. |

| @790 | Ponto — Apuração semanal + meta do mês | Novo `regimeApuracao` (diario/semanal) no colaborador (select na Ficha RH). **JornadaEngine**: regime semanal zera extras/faltantes diários e fecha BH por semana ISO (chave idempotente `sem:<segunda>`); `agruparSemanas` exportado; `calcularJornadasLote(…, mapaRegime)`; `processarDia` usa carga real do colaborador; `atualizarBHDosLotes`/`recalcularBHCompleto` semanais; guard em `ponto_engine._calcularEAtualizarBH`. **Espelho**: card "Meta do mês · N% atingido" (`metaMensalMin`), subtotais por semana na tabela (saldo ± / em andamento), badge "Apuração semanal". **Métricas/Tendências/Consolidado**: meta semanal = carga×dias/7; extras de semanais = deltas positivos das semanas fechadas; corrigido extras com 40h global p/ cargas parciais. **Filtro de profissional**: "como deseja ser chamado (Nome Completo)", ordenado pelo exibido; idem tabela individual e cards de risco. ⚠️ Pós-deploy: marcar professores como Semanal + rodar `ctrl_ponto_recalcular_bh_todos` no GAS Editor. |

| @793 | RH — Histórico de Eventos estruturado | **Bug RH-HIST-01 CORRIGIDO**: frontend enviava `tipoEvento`, engine exigia `dados.tipo` — registro de evento sempre falhava ("tipo e idColaborador são obrigatórios"), inclusive o auto-evento de carga do `salvarColab` (erro engolido). Engine normaliza os dois nomes. **Campos por tipo** (`_EV_CAMPOS`): Promoção → novo cargo+salário; Reajuste → salário; Mudança de Cargo → cargo; Alt. Carga → h/semana; Admissão → data; demais só descrição. Hints "Atual: …" da ficha; campo Data do Evento. **Ficha atualizada automaticamente** (`_aplicarEfeitosEvento`): grava `salarioBruto`/`cargo`/`horasSemanais`/`dataAdmissao` + valores anteriores no evento (audit `FICHA_ATUALIZADA_POR_EVENTO_RH`); flag `semEfeitos` p/ chamadores que já salvaram a ficha. **Timeline**: chips "anterior → novo" (Histórico + modal detalhe), labels pt-BR (`_EV_TIPO_LABEL`). **Privacidade**: `reajuste` vira tipo sensível; campos salariais removidos p/ gestor/colaborador em `listarHistoricoFiltrado`. |

| @795 | RH — Advertências: sequência + gravidade | Evento Advertência ganhou **Nível** (verbal → 1ª/2ª/3ª escrita; após a 3ª: demissão) e **Gravidade** (leve/moderada/grave/gravíssima) — validados no backend (`registrarEvento`); justificativa obrigatória. **Painel de alerta no form** (`_pintarAlertaAdv`): resumo das advertências anteriores (contagem por nível + última data), próximo passo da sequência (pré-seleciona o nível), aviso vermelho quando 3ª escrita já aplicada (medida prevista: demissão); GRAVE → antecipação de etapas; GRAVÍSSIMA → desligamento direto (justa causa) + botão atalho p/ modal de desligamento. **Toasts** pós-registro (3ª escrita / gravíssima). **Timeline**: chips Nível (⚠ na 3ª) + Gravidade colorida. **Modal detalhe**: banner disciplinar (total + próximo passo). Advertências antigas sem nível contam como verbal. *(Commit inclui selects demográficos de sessão paralela.)* |

| @796 | RH — demografia do painel + CPF | Vínculo "Terceirizado"; gênero Cis/Trans (Mulher/Homem Cis, Mulher/Homem Trans, Travesti, Não-binárie) com proteção a valores legados; rótulos "Gay / Lésbica" e "Preta/Parda (Negro)"; campo CPF na Ficha RH (11 dígitos, máscara, não apaga quando vazio; restrito a rh/admin via `_NIVEL_ESCRITA`; fora de `_PERFIL_CAMPOS_EDITAVEIS`); Meu Perfil exibe CPF mascarado read-only. Inclui também (sessão paralela): advertências com nível/gravidade. |

### Checklist de auditoria — s60
```
[x] prompt()/confirm() — não usados
[x] GAS.* namespace — nenhum endpoint novo; metricasRh/tendenciasRh já mapeados; registrarEvento/listarCargos já mapeados (@793)
[x] CSS — zero classes novas (btn-primario, btn-ghost, stat-card, muted-text existentes; @793 usa form-group/form-input/form-label existentes)
[x] IDs de DOM — ponto-dd-* inalterado; @793: rh-ev-wrap-*/rh-ev-hint-* estáticos, ids fixos
[x] FsmGuardian — sem transições de status (eventos RH não alteram status; desligamento continua via registrarDesligamento)
[x] Modais — nenhum modal novo
[x] Datas — datas de risco formatadas via fmtDataPtBR (_ddmm); @793 usa _fmtData (DD/MM/AAAA) nos hints e chips; backend ISO interno
[x] BtnGuard — chips e selects com data-bg-skip; Atualizar com BtnGuard.wrap(force); @793: rh-btn-salvar-evento já tinha BtnGuard.wrap
```

### Pendentes / próxima ação
- **Testar no browser (@795 — Advertências)**: Novo Evento → Tipo Advertência mostra Nível + Gravidade + painel de alerta com histórico disciplinar; com colaborador sem advertências o nível pré-seleciona "Verbal"; registrar advertência → reabrir form para o mesmo colaborador → painel mostra contagem e próximo passo; Gravidade "Gravíssima" → aviso vermelho + botão "Registrar desligamento" abre o modal; modal de detalhe do colaborador exibe banner disciplinar
- **Testar no browser (@793 — Histórico RH)**: Novo Evento → trocar Tipo mostra campos específicos com "Atual: …"; Reajuste sem salário bloqueia; registrar Promoção atualiza cargo/salário na ficha (conferir no modal de detalhe) e timeline mostra chips "anterior → novo"; auto-evento de carga ao mudar h/semana na Ficha RH agora aparece no histórico
- **Pós-deploy @790 (obrigatório p/ professores)**: Ficha RH → marcar colaboradores 20h de escala variável como "Apuração semanal"; depois rodar `ctrl_ponto_recalcular_bh_todos` no GAS Editor (limpa deltas diários antigos do BH)
- **Testar no browser (Espelho semanal)**: selecionar professor marcado como semanal → card "Meta do mês"; subtotais de semana na tabela com saldo; badge "Apuração semanal"; dias longos sem extras diários
- **Testar no browser (Ficha RH)**: select "Apuração de jornada" salva e recarrega corretamente
- **Testar no browser (Métricas RH)**: trocar mês → recarrega sozinho; voltar a mês anterior → instantâneo (cache); painel "Riscos CLT identificados" com datas; chips filtram a tabela; drill-down preenche após evolução carregar
- **Testar no browser (Espelho)**: ativar "Ano vigente" → seletor de mês desabilita; voltar "Mês selecionado" → reabilita; trocar mês → botões de período resetam
- **Próximo bug de auditoria:** AFT-02 (anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 58 (2026-06-10) → SESSÃO 59

### Estado atual: ~265 bugs registrados · Deploy @780 (GAS)

### O que foi feito nesta sessão (s58)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @775 | Telefone — máscara + WPP + Toast | Máscara global event delegation; WPP checkbox em 9 campos; `Toast.sucesso`/`Toast.erro` no Meu Perfil save. |
| @780 | RH — fix foto apagada + filtro Todos | `ColaboradorRepository.salvar`: merge `Object.keys(prev)` antes de `lista[idx]=dados` — preserva `fotoPerfil` e campos não enviados; `PessoasEngine.listar`: `incluirDesligado:true` do frontend impede `excluirDesligado` automático no filtro "Todos". |
| @781 | Notificações — bloquear email desligados | Guard `_isDesligado(email)` em 4 engines (`notification_engine`, `solicitacao_reserva`, `reserva_carro`, `rece`). Email externo (null do buscarPorEmail) não é bloqueado. |

### Pendentes / próxima ação
- **Testar filtro Todos RH**: selecionar "Todos" → Geovana (desligada) deve aparecer
- **Testar foto persistência**: editar ficha RH → salvar → abrir Meu Perfil → foto ainda presente
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 57 (2026-06-10) → SESSÃO 58

### Estado atual: ~265 bugs registrados · Deploy @778 (GAS)

### O que foi feito nesta sessão (s57)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @778 | Ponto — Métricas RH (fix + evolução + drill-down) | Fix `r.dados`→`r.data` (bug `undefined` em totalAtivos); filtro de setor client-side; `ctrl_ponto_tendencias_rh` (6 meses por colaborador); 3 gráficos de barras CSS no botão Evolução; drill-down inline por colaborador. |

### Pendentes / próxima ação
- **Testar Métricas RH**: clicar Atualizar → cards com números reais; filtro setor; botão Evolução → 3 gráficos; clicar colaborador → mini-gráficos
- **Testar aprovar férias**: não deve mais mostrar "Erro. Erro." — deve aprovar corretamente
- **Verificar coluna Colaborador nas Férias**: deve exibir nome, não ID
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 56 (2026-06-10) → SESSÃO 57

### Estado atual: ~265 bugs registrados · Deploy @777 (GAS)

### O que foi feito nesta sessão (s56)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @777 | Férias — fix crítico FsmGuardian + nome + timezone | `FsmGuardian.validarTransicao` → `assertValida` (método inexistente causava TypeError em toda transição); `listarFerias` enriquece com `nomeColaborador`; `calcularPeriodosAquisitivos` timezone-safe; Toast mostra erro real. |

### Pendentes / próxima ação
- **Testar aprovar férias**: não deve mais mostrar "Erro. Erro." — deve aprovar corretamente
- **Verificar coluna Colaborador**: deve exibir nome, não ID `col_1780...`
- **Verificar períodos aquisitivos**: se `dataAdmissao` de João Paulo estiver incorreta (ex: 2026-05-31), corrigir na Ficha RH para a data real de admissão
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 55 (2026-06-10) → SESSÃO 56

### Estado atual: ~265 bugs registrados · Deploy @774 (GAS)

### O que foi feito nesta sessão (s55)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @774 | Telefone — máscara + WPP + Toast | Máscara `(00) 00000-0000` global via event delegation; indicador WPP (checkbox verde) em 9 campos de telefone; `Toast.sucesso`/`Toast.erro` substituem `_mostrarMsg` no save do Meu Perfil; `telefoneWpp` em `_PERFIL_CAMPOS_EDITAVEIS`. |

### Pendentes / próxima ação
- **Testar telefones**: digitar número em qualquer campo tel → máscara aplica; marcar WPP → salvar → reabrir → checkbox deve estar marcado
- **Testar Toast Meu Perfil**: salvar → Toast verde "Perfil atualizado com sucesso!" deve aparecer (canto inferior), não mensagem no topo do form

---

## HANDOFF ANTERIOR — SESSÃO 54 (2026-06-10) → SESSÃO 55

### Estado atual: ~265 bugs registrados · Deploy @773 (GAS)

### O que foi feito nesta sessão (s54)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @771 | Ponto — fix Métricas RH | `PontoUI.setTab()` não incluía `'metricas'` no array de abas — `#ponto-tab-metricas` iniciava `oculto` e nunca era revelado. Adicionado `'metricas'` à lista. Bug: aba clicável mas conteúdo sempre em branco. |

### Pendentes / próxima ação
- **Testar Métricas RH**: clicar na aba → deve exibir resumo + tabela por setor + tabela individual
- **Testar Meu Perfil**: abrir, editar apelido/foto → salvar → sidebar deve exibir novo nome imediatamente
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 53 (2026-06-09) → SESSÃO 54

### Estado atual: ~265 bugs registrados · Deploy @759 (GAS)

### O que foi feito nesta sessão (s53)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @759 | Perfil Pessoal — sync 3-vias | `ctrl_pessoas_meu_perfil_salvar` propaga nomeApelido/pronomes/telefone/emailPessoal/fotoPerfil para `usuarios_acesso.json`; `ctrl_acesso_editarPapel` propaga setor para `colaboradores.json`; `PerfilUI.salvar()` atualiza sidebar-user-name, topbar-email e header da view em sessão. |

### Pendentes / próxima ação
- **Testar Meu Perfil**: abrir, editar apelido/foto → salvar → sidebar deve exibir novo nome imediatamente
- **Testar sync RH → Perfil**: RH abre ficha de colaborador, preenche campos (genero, telefone) → usuário abre Meu Perfil → deve ver os dados preenchidos
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 52 (2026-06-09) → SESSÃO 53

### Estado atual: ~265 bugs registrados · Deploy @757 (GAS)

### O que foi feito nesta sessão (s52)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @757 | RH — Desligamento + Períodos Aquisitivos + Acordo de Férias | (1) Botão "Desligar" no modal verColab (com/sem rescisão). (2) Painel de Períodos Aquisitivos/Concessivos na aba Férias. (3) Botão "Acordo" para férias aprovadas — registra período efetivo + saldo remanescente. |

### Pendentes / próxima ação
- **Testar no sistema**: (1) RH → Equipe → ver colaborador → botão Desligar; (2) RH → Férias → card Períodos Aquisitivos → selecionar colaborador; (3) Aprovação de férias → botão Acordo
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 51 (2026-06-09) → SESSÃO 52

### Estado atual: ~265 bugs registrados · Deploy @729 (GAS)

### O que foi feito nesta sessão (s51)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @727 | RH — BcbService + tabelas 2026 | Catálogo de encargos 2026, BcbService para busca de taxa SELIC/CDI via API BCB, atualização automática da SM via BCB API. |
| @729 | Fix Ponto — espelho vazio após reimportação (2ª causa) | Causa raiz: sessão antiga (pendente por timeout do batch fix anterior) ainda detinha os 19k brutos em `ponto_bruto.json`; qualquer reimportação do mesmo arquivo detectava todos NSRs como "duplicado" → 0 normalizados → 0 jornadas → espelho vazio. Fixes: (1) `cancelarImportacao` agora chama `PontoRepository.reverterImportacao` antes de remover brutos — limpa normalizados órfãos que a versão pré-batch pôde ter gravado parcialmente antes do timeout; (2) `GAS.ponto.reverterImportacao` adicionado ao namespace frontend; (3) Aba Sessões ganha coluna "Ação" com botão "Cancelar" (pendentes) e "Reverter" (confirmadas) via `_abrirModalConfirmar`. |

### Pendentes / próxima ação
- **Ação imediata no sistema**: (1) Módulo Ponto → aba Sessões → clicar "Cancelar" na sessão pendente antiga; (2) Reimportar arquivo AFD; (3) Confirmar importação; (4) Verificar espelho em Abril/2024 para ADRIELLY
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 50 (2026-06-09) → SESSÃO 51

### Estado atual: ~265 bugs registrados · Deploy @725 (GAS)

### O que foi feito nesta sessão (s50)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @725 | Fix Ponto — batch import AFD (timeout 19k batidas) | Root-cause real do espelho vazio: `confirmarImportacao` chamava `PontoRepository.salvarRegistro()` individualmente para cada batida (19.471 registros). Cada chamada faz lock+lê JSON+escreve → custo O(N²) → timeout de 6 min do GAS antes de terminar → arquivos vazios → espelho "Ausente". Fix: `PontoRepository.salvarLote()`, `JornadaRepository.salvarLote()`, `JornadaEngine.calcularJornadasLote()` (calcula tipos E/I/R/S em memória in-place). `confirmarImportacao` reescrito: monta array em memória → 1 modifyJSON para normalizados + 1 modifyJSON para jornadas. `ctrl_ponto_reprocessar_jornadas` também reescrito para batch. |

### Pendentes / próxima ação
- **Pós-deploy obrigatório**: (1) reverter sessões existentes no painel Sessões; (2) reimportar arquivo AFD; (3) navegar para **Abril/2024** no espelho (dados do arquivo importado)
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 48 (2026-06-09) → SESSÃO 49

### Estado atual: ~265 bugs registrados · Deploy @712 (GAS)

### O que foi feito nesta sessão (s48)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @707 | Fix AFD — posições layout + reverterImportacao | Layout `iDClass-BioProx-v1`: `datetimeOriginal` 25→24 chars; tipo-3 `pis` posInicio 35→34, `hash` 47→46; tipo-5 `acao` 35→34, `pis` 36→35 comp 11→12. `reverterImportacao` chama `PontoBrutoRepository.reverterSessao()` para remover brutos (re-importação não marcava mais como duplicado). |
| @708 | AFD — auto-criação colaboradores + aba Vínculos | `confirmarImportacao`: cria stubs `COL-*` de PIS tipo-5 não cadastrados; tenta auto-link por nome fuzzy contra `usuarios_acesso.json`; processa batidas `sem_cadastro` após criar stubs; retorna `autoCriados`. `_resolverColabId`: resolve email→colabId via `emailInstitucional`. `ctrl_ponto_listar_sem_vinculo` + `ctrl_ponto_vincular_colaborador`. Frontend: aba "Vínculos" com tabela select+botão; `_renderAfdPasso3` exibe 6 stats incluindo "Cadastrados". |

### Pendentes / próxima ação
- **Executar no GAS Editor (obrigatório pós-deploy):**
  1. `AfdLayoutRepository.prepararIndice()` — aplica upsert do layout com posições corrigidas
  2. Reverter sessões ruins (`ctrl_ponto_reverter_importacao`) e reimportar o AFD
- **Próximo bug de auditoria:** AFT-02 (campo para anexar documentos em afastamentos) ou PON-03 (exportação AFD)

---

## HANDOFF ANTERIOR — SESSÃO 47 (2026-06-09) → SESSÃO 48

### Estado atual: ~265 bugs registrados · Deploy @706 (GAS) · Firebase live

### O que foi feito nesta sessão (s47)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @706 | HUB-13 — Workflow de day-off de aniversário | `PessoasEngine.registrarDayoffAniversario()`: valida janela 7 dias + uso único/ano + cria afastamento `dayoff_aniversario` auto-aprovado. `ctrl_rh_solicitar_dayoff_aniversario()` acessível a qualquer colaborador. `carregarAniversariantes()`: botão "Solicitar Day-off" no card próprio (email vs boot). `_solicitarDayoff()` + `_executarDayoff()` no TaskHubUI. `AfastamentosUI` ganha tipo + select. `ctrl_taskhub_aniversariantes` passa `email`. |

### Pendentes / próxima ação
- **Executar no GAS Editor (se ainda não feito):**
  1. `AfdLayoutRepository.prepararIndice()` — aplica correção posInicio do nome AFD
  2. `criarTriggerVerificacaoPrazos()` — trigger diário 08:00 para TAR-04

---

## HANDOFF ANTERIOR — SESSÃO 46 (2026-06-08) → SESSÃO 47

### Estado atual: ~267 bugs registrados · Deploy @705

### O que foi feito nesta sessão (s46)

Fix: nome de colaboradores cortado na primeira letra no preview AFD.

| Arquivo | Mudança |
|---|---|
| `afd_layout_repository.gs` | Tipo-5: `nome` posInicio 48→47, `pis` comprimento 12→11, `cnpjSeq` 98→97, `hash` 113→112 |
| `afd_layout_repository.gs` | `prepararIndice`: insert → upsert (corrige ambientes já com layout instalado) |

**Ação necessária**: executar `AfdLayoutRepository.prepararIndice()` no GAS Editor para aplicar a correção no `afd_layouts.json`.

### Próxima sessão

1. Executar `AfdLayoutRepository.prepararIndice()` no GAS Editor
2. Reimportar o arquivo AFD e confirmar que os nomes aparecem completos

---

## HANDOFF ATUAL — SESSÃO 48 (2026-06-09) → SESSÃO 49

### Estado atual: Deploy @754 (GAS) — controller pessoas_controller.gs adicionado

### O que foi feito nesta sessão (s48)

Perfil Pessoal: nova view `view-perfil` + módulo `PerfilUI` + avatar global propagado pelo sistema.

| Arquivo | Mudança |
|---|---|
| `pessoas_controller.gs` | `ctrl_pessoas_meu_perfil_ler()` e `ctrl_pessoas_meu_perfil_salvar(dados)` com whitelist de campos editáveis |
| `index.html` | `GAS.perfil.{ler,salvar}` no namespace. Menu: "Meu Perfil" após "Meu Centro". `view-perfil`: card somente leitura (dados RH) + coluna editável (apelido, pronomes, contato, emergência, endereço, diversidade, saúde+restrições). Foto: Canvas resize max 200×200 JPEG base64. `setAvatarGlobal(url)`: atualiza sidebar-avatar e topbar-avatar. Boot carrega foto silenciosamente (setTimeout 2s). Sidebar avatar clicável → Meu Perfil. `_renderEquipe` com mini-avatares via `_avatarMini(c)`. |

### Próxima sessão

1. Testar Meu Perfil: navegar → form carrega → editar → salvar → reabrir → dados persistem
2. Testar upload de foto: clicar no avatar → selecionar imagem → foto aparece → salvar → recarregar página → foto persiste no sidebar/topbar
3. Testar lista RH: Pessoas/RH → aba Equipe → avatares aparecem por colaborador

---

## HANDOFF ANTERIOR — SESSÃO 47b (2026-06-09) → SESSÃO 48

### Estado anterior: Deploy @750 (GAS)

### O que foi feito nesta sessão (s47b)

Ponto: informe de atualização do espelho (último dia com batida) + remoção do seletor de carga do espelho + filtro de período nos cards.

| Arquivo | Mudança |
|---|---|
| `index.html` | `_ultimaBatida` calculada ao carregar espelho; `_renderStatsStrip` exibe "Atualizado até DD/MM/AAAA" abaixo dos cards; seletor de carga removido do filtro do espelho. |

### HANDOFF ANTERIOR — SESSÃO 47 (2026-06-09) → SESSÃO 47b

### Estado anterior: Deploy @747

RH: novos campos de diversidade, saúde e contatos no form de colaborador. Correções no módulo Pessoas/RH (bugs 1–8 da lista): scroll automático ao editar, barra de filtro, correção duplicatas ao editar, botão excluir (só RH/Superadmin), N° registro auto-gerado, PIS/NIS, busca de CEP via ViaCEP, ordenação setor+nome.

| Arquivo | Mudança |
|---|---|
| `pessoas_controller.gs` | `ctrl_pessoas_excluir(id)`: hard delete, restrito a `rh` e `superadmin` |
| `index.html` | Form RH: Gênero (select), Orientação Sexual (select), Raça/Cor IBGE (select), Telefone, Contato de Emergência (grid 3 cols), Tipo Sanguíneo, Alergias, Restrições Alimentares (checkboxes c/ detalhe condicional), Observações Pessoais. `abrirFormColab` popula tudo; `salvarColab` persiste tudo. Busca CEP onblur via ViaCEP. Barra de filtro equipe. Scroll automático ao abrir form de edição. |

### Próxima sessão

1. Testar form completo no browser: abrir colaborador, editar, salvar — verificar novos campos persistem
2. Testar busca CEP: preencher CEP → logradouro/bairro/cidade/UF auto-preenchidos
3. Testar exclusão: admin não consegue excluir; RH consegue

---

## HANDOFF ATUAL — SESSÃO 47 (2026-06-09) → SESSÃO 48

### Estado atual: Deploy @754 (GAS)

### O que foi feito nesta sessão (s47)

Ponto: banco de horas automático na importação + alertas CLT + aba de Métricas RH.

| Arquivo | Mudança |
|---|---|
| `ponto_repository.gs` | `creditarDiaBH(orgId, colaboradorId, data, deltaMin)` — idempotente via `diasProcessados`; `resetarBancoHoras(orgId, colaboradorId)` |
| `jornada_engine.gs` | `atualizarBHDosLotes(orgId, jornadasLote)` — credita BH para cada jornada do lote; `recalcularBHCompleto(orgId, colaboradorId)` — zera e reconstrói desde histórico completo |
| `afd_parser_engine.gs` | `confirmarImportacao` chama `JornadaEngine.atualizarBHDosLotes` após `JornadaRepository.salvarLote` |
| `ponto_controller.gs` | `ctrl_ponto_reprocessar_jornadas` chama `atualizarBHDosLotes`; `ctrl_ponto_recalcular_bh_todos` (admin) chama `recalcularBHCompleto` por colaborador; `ctrl_ponto_metricas_rh(params)` retorna `{periodo, resumo, porSetor, individual}` com flags CLT (jornadas > 10h, intervalo intrajornada, BH excessivo > 40h, extras > 200h/mês) |
| `alertas_engine.gs` | 3 novos TIPOS: `PONTO_CARGA_SEMANAL`, `PONTO_CARGA_MENSAL`, `PONTO_BANCO_HORAS_EXCESSIVO`; função `_verificarCargaPonto` com emissão deduplicada por `entidadeId`; helpers `_pad2`, `_toHM`, `_isoWeek`, `_inicioSemana`, `_fimSemana`, `_somarMinutosPorDias`, `_ultimoDiaStr` |
| `index.html` | GAS bindings: `metricasRh`, `recalcularBhTodos`; tab "Métricas RH" no tab-bar do Ponto & RH; div `ponto-tab-metricas`; PontoUI: `carregarMetricasRh`, `_toHM`, `_metCard` expostos no return |

### Próxima sessão

1. Testar aba Métricas RH no browser — verificar cards resumo, tabela por setor, tabela individual
2. Reimportar AFD e verificar se Banco de Horas = valor correto (não mais 0h00)
3. Verificar alertas automáticos: rodar `AlertasEngine.verificarTodosAutomaticos()` no GAS Editor e confirmar logs dos 3 novos tipos

---

## HANDOFF ANTERIOR — SESSÃO 46b (2026-06-09) → SESSÃO 47

### Estado atual: Deploy @748 (GAS)

### O que foi feito nesta sessão (s46)

Ponto: consolidado como filtro nos cards + carga no form de colaborador + nomes com apelido no filtro.

| Arquivo | Mudança |
|---|---|
| `ponto_controller.gs` | `ctrl_ponto_listar_colaboradores` retorna `nomeApelido` |
| `index.html` | Bloco consolidado pós-tabela removido; `ponto-periodo-filter` com 4 pills (Este mês / Ano vigente / Últ. 12 meses / Desde admissão) altera `ponto-stats-strip`; `_setPeriodo`, `_renderStatsStrip`, `_carregarConsolidado` refatorados. Campo "Carga horária semanal" no form de colaborador (rh-pf-carga + botões 20h/30h/40h + custom); `salvarColab` inclui `horasSemanais` e registra evento `alteracao_carga` quando muda. Select de colaboradores exibe "Apelido (Nome)" quando apelido preenchido. Seletor de carga removido do espelho (deploy @748): botões 20h/30h/40h, `_setCarga`, `_setCargaCustom`, `_salvarCargaHoraria`, `_renderCargaBotoes` excluídos. |

### Próxima sessão

1. Testar filtro de período no browser — verificar pills ativo, cards atualizam
2. Testar carga no form colaborador — salvar + verificar evento no histórico
3. Verificar nome com apelido no dropdown do espelho

---

## HANDOFF ATUAL — SESSÃO 62 (2026-06-11)

### Estado atual: Deploy @802

### O que foi feito nesta sessão

BI Demográfico — UI redesenhada: ícones corrigidos (material-icons-round→ms), cabeçalhos de cards com faixa colorida por categoria, semântica de ícones melhorada, `modulo:'PESSOAS'` no menu.

| Arquivo | Mudança |
|---|---|
| `index.html` | View `#view-bi-demografico`: `view-titulo`/`view-subtitulo` no cabeçalho; `ms ms-sm` em todos os ícones; 4 cards (gênero, sexualidade, raça, faixa etária) + setor + território com `border-bottom:3px solid` colorido + gradiente de fundo; ícones: `people`, `volunteer_activism`, `groups`, `person`, `account_tree`, `location_city`, `travel_explore`, `psychology`; KPI placeholder "Carregando métricas…" |
| `PROGRESS.md` | Fase @802 documentada |
| `docs/auditoria/roteiro-auditoria.md` | Header + HANDOFF atualizados |

### Checklist da sessão
- [x] `ms` em todos os ícones da view BI — zero `material-icons-round`
- [x] GAS.biDemografico.equipe + .beneficiarios — bindings existem
- [x] modulo:'PESSOAS' no menu — módulo ativo sem necessidade de ativação manual
- [x] BtnGuard em: bi-dem-btn-atualizar, bi-dem-btn-mapa, bi-dem-btn-personas
- [x] data-bg-skip="1" em botões de navegação/filtro
- [x] MetricsToggle.init chamado em _renderKpis após popular #bi-dem-kpis

### Próxima sessão

1. Testar BI Demográfico no browser: abrir módulo → KPIs carregam → 4 cards renderizam → filtros funcionam → mapa abre (Carregar Mapa) → Personas geradas
2. Testar tab Beneficiários → ajusta título, oculta filtros vinculo/status, recarrega dados
3. Verificar console F12 — zero TypeError/undefined

---

## HANDOFF ANTERIOR — SESSÃO 48 (2026-06-11)

### Estado atual: Deploy @787

### O que foi feito nesta sessão

RH — fix desligamento (GAS.rh binding ausente) + PIS backfill automático via confirmação AFD.

| Arquivo | Mudança |
|---|---|
| `index.html` | `GAS.rh.registrarDesligamento` adicionado ao namespace `GAS.rh` — apontava para `undefined`, causando falha silenciosa em todo clique no botão "Confirmar Desligamento" |
| `afd_parser_engine.gs` | `confirmarImportacao`: nova Etapa 1b — backfill PIS nos colaboradores matchados sem PIS; 1 único `modifyJSON`; não sobrescreve quem já tem; retorna `pisBackfilled` |
| `index.html` | Resultado AFD exibe linha verde "PIS pré-preenchido em N ficha(s)" quando `pisBackfilled > 0` |

### Próxima sessão

1. Testar desligamento: Equipe → clicar no colaborador → botão Desligar → confirmar → status muda para "desligado"
2. Reimportar AFD → verificar mensagem de PIS pré-preenchido na tela de resultado
3. Verificar campo PIS nas fichas dos colaboradores matchados por nome

---

## HANDOFF ANTERIOR — SESSÃO 47 (2026-06-10)

### O que foi feito nesta sessão

RH — Visibilidade de status: desligados ocultos + avatar overlay + bloqueio de tarefas + auto-retorno. Deploy @761.

| Arquivo | Mudança |
|---|---|
| `colaborador_repository.gs` | `listar()`: suporte a flag `excluirDesligado` — filtra fora colaboradores com `status:'desligado'` |
| `pessoas_engine.gs` | `listar()`: aplica `excluirDesligado:true` por padrão quando nenhum filtro de status é passado |
| `pessoas_engine.gs` | `verificarAutoRetornoFerias()`: reverte status para `ativo` usando `acordo.periodoGozadoFim` ou `fim` da solicitação |
| `pessoas_engine.gs` | `verificarAutoRetornoAfastamento()`: encerra afastamentos com `dataFim` vencida via `encerrarAfastamento` |
| `alertas_engine.gs` | `verificarTodosAutomaticos()`: chama ambas as funções de auto-retorno a cada ciclo de 30 min |
| `tarefa_engine.gs` | `_validarTarefa()`: bloqueia atribuição de tarefas a colaboradores em `ferias`, `afastado` ou `desligado` |
| `index.html` | `_avatarMini(c)`: overlay 🏖️/🌿 com `position:absolute` para ferias/afastado |

### Próxima sessão

1. Verificar no browser: colaboradores desligados não aparecem em nenhuma lista
2. Testar avatar overlay — ferias deve mostrar 🏖️, afastado deve mostrar 🌿
3. Testar bloqueio de tarefas — tentar atribuir a colaborador em férias → deve dar erro
4. Verificar Meu Perfil carrega e salva (fix @764)

---

## HANDOFF ANTERIOR — SESSÃO 46b (2026-06-10) — fix carregar eternamente

Deploy @764. Detectado: fix anterior adicionava 3ª chamada Drive API (`lerJSON('usuarios_acesso.json')`) dentro de `ctrl_pessoas_meu_perfil_ler`. Corrigido com `ctx.registroAcesso` (zero Drive extra). Callback de erro do `PerfilUI.carregar()` agora exibe mensagem visível.

| Arquivo | Mudança |
|---|---|
| `pessoas_controller.gs` | `_ctxPessoas()` expõe `registroAcesso`; `ctrl_pessoas_meu_perfil_ler` usa `ctx.registroAcesso` em vez de nova `lerJSON` |
| `index.html` | `PerfilUI.carregar()` — callbacks de falha atualizam `#perfil-dados-pro` com msg de erro |

---

## HANDOFF ANTERIOR — SESSÃO 46 (2026-06-10)

### O que foi feito nesta sessão

Meu Perfil — fix sync 3-vias + select pronomes. Deploy @760.

| Arquivo | Mudança |
|---|---|
| `pessoas_controller.gs` | `ctrl_pessoas_meu_perfil_salvar`: `ColaboradorRepository.atualizar` → `.salvar` (método inexistente → save sempre falhava) |
| `pessoas_controller.gs` | `ctrl_pessoas_meu_perfil_ler`: merge de `nomeApelido`, `pronomes`, `telefone`, `emailPessoal`, `fotoPerfil` de `usuarios_acesso.json` quando ausentes no colaborador |
| `index.html` | `p-pronomes` e `rh-pf-pronomes`: texto livre → select (ele/dele · ela/dela · elu/delu · outro) + campo condicional para pronomes personalizados |
| `index.html` | `PerfilUI._preencher`: detecta valor predefinido vs "outro"; `PerfilUI.salvar`: coleta valor correto do select; `_togglePronoumesOutro` exportado |
| `index.html` | `RhUI.abrirFormColab`, `salvarColab`, `_preencherDeUsuario`: mesma lógica para o select RH; `_toggleRhPronoumesOutro` exportado |

---

## HANDOFF ANTERIOR — SESSÃO 45 (2026-06-08) → SESSÃO 46

### Estado atual: ~267 bugs registrados · Deploy @704 (GAS)

### O que foi feito nesta sessão (s45)

Fuzzy name matching + aceitar AFD sem cadastro.

| Arquivo | Mudança |
|---|---|
| `afd_parser_engine.gs` | `_normalizarNome`, `_construirMapaNomes`, `_buscarColabPorNome` (75% palavras); `gerarPreview` + `iniciarImportacao`: fallback nome; `sem_cadastro` salvo como bruto; `confirmarImportacao`: só `valido` vira normalizado, retorna `semCadastro` |
| `index.html` | 6 stats; botão sempre ativo; coluna matchBy na tabela; passo-3 mostra Pendentes |

### Próxima sessão

1. Testar com arquivo real: verificar se names match funciona para colaboradores cadastrados
2. Criar funcionalidade de "vincular pendentes" — listar brutos sem_cadastro e associar a colaborador
3. Preencher campo PIS nos colaboradores do sistema para evitar dependência de name matching

---

## HANDOFF ANTERIOR — SESSÃO 44 (2026-06-08) → SESSÃO 45

### Estado atual: ~267 bugs registrados · Deploy @703 (GAS)

### O que foi feito nesta sessão (s44)

Preview AFD enriquecido com nome e status de cadastro.

| Arquivo | Mudança |
|---|---|
| `afd_parser_engine.gs` | `gerarPreview`: passe-0 coleta PIS→nome de registros cadastro; `nomeAfd` em cada batida da amostra; `colaboradoresAfd[]` (distintos, máx. 100) + `totalColabAfd` |
| `index.html` | `_renderAfdPasso2`: seção "Pessoas no arquivo" com ✓/✗ cadastro; batidas com coluna Nome; aviso "Nenhuma batida válida" quando validos=0 |

### Próxima sessão deve começar por

1. Testar preview AFD: verificar se nomes aparecem e se a seção de colaboradores está correta
2. Se todos são "Não cadastrado": orientar usuário a preencher campo PIS nos colaboradores do sistema

---

## HANDOFF ANTERIOR — SESSÃO 43 (2026-06-08) → SESSÃO 44

### Estado atual: ~267 bugs registrados · Deploy @701 (GAS) + fix pendente

### O que foi feito nesta sessão (s43)

3 bugs corrigidos no módulo Ponto — sem novo deploy ainda (pendente clasp push).

| Bug | Arquivo | Correção |
|---|---|---|
| PON-01: abas CLT/Rescisão no Ponto | `index.html` | Botões de tab removidos; divs custo/rescisão removidas; setTab array atualizado |
| Folga hardcoded Sáb/Dom | `jornada_engine.gs` | `(dow===0\|\|dow===6)` → lê `parametros_rh.dias_folga[]` (configurável); sem config = nenhum dia é folga automático |
| Loading eterno AFD 1MB | `afd_parser_engine.gs` | `nsrJaExiste` chamava readJSON N vezes por batida → pre-loading único de NSRs em mapa; fix aplicado em `gerarPreview` e `iniciarImportacao` |

### Próxima sessão deve começar por

1. `clasp push` + `clasp deploy` com deploymentId fixo
2. Testar: aba Ponto → sem tabs CLT/Rescisão; espelho de jun/2026 sem Sáb/Dom marcados como Folga; importar AFD grande sem loading eterno
3. Para habilitar folga por config: adicionar `dias_folga: [0, 6]` em `parametros_rh.json` (0=Dom, 6=Sáb) se necessário

---

## HANDOFF ANTERIOR — SESSÃO 42 (2026-06-08) → SESSÃO 43

### Estado atual: ~270 bugs registrados · Deploy @695 (GAS) · Firebase live

### O que foi feito nesta sessão (s42)

Motor flexível de Ponto/AFD — backend completo (Fases 1-4). Zero alterações em index.html.

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @695 | Auditoria + Modelagem (F1+F2) | Auditoria completa do módulo Ponto: 6 bugs identificados (parser formato errado, tipo perdido, jornada frágil, sem duplicatas, sem prévia, bypass de repositório). Modelagem das 3 camadas: `afd_layout_repository.gs` (NOVO, layout iDClass Bio Prox v1 pré-seeded com posições exatas dos campos), `ponto_bruto_repository.gs` (NOVO, sessões de importação reversíveis + registros brutos), `ponto_repository.gs` migrado para `ponto_normalizado.json` com `nsrJaExiste()`/`reverterImportacao()`/`atualizarTipo()`, `setup.gs` com 4 novos `prepararIndice()` + abas PontoBruto/PontoImportacoes/Jornadas no SCHEMA_ABAS. |
| @695 | AfdParserEngine (F3) | `afd_parser_engine.gs` (NOVO): parser flexível em 2 etapas. Etapa 1 `iniciarImportacao()`: lê layout → parseia linha por linha → cria sessão pendente → salva brutos com status (valido/duplicado/pis_nao_encontrado/cadastro/erro). Etapa 2 `confirmarImportacao()`: cria normalizados → aciona JornadaEngine automaticamente. + `cancelarImportacao()` / `reverterImportacao()` / `gerarPreview()`. 10 novos endpoints no `ponto_controller.gs` (layouts, importação, sessões). |
| @695 | JornadaEngine (F4) | `jornada_engine.gs` (NOVO) + `jornada_repository.gs` (NOVO): algoritmo de derivação E/I/R/S por posição ordinal (posição 0=E, última=S, ímpar=I, par=R). `processarDia()` detecta inconsistências (fora_de_ordem/batidas_simultaneas/intervalo_curto), classifica jornada (completa/incompleta/inconsistente). `calcularEspelho()` monta espelho mensal com dias folga/ausente inferidos. Reprocessamento idempotente. Atualiza `tipo` nos normalizados após derivação. 4 novos endpoints (processar_jornada, processar_periodo, espelho_mensal, obter_jornada). |

### Próxima sessão deve começar por

1. `clasp push` + executar no GAS Editor: `AfdLayoutRepository.prepararIndice()`, `PontoBrutoRepository.prepararIndice()`, `JornadaRepository.prepararIndice()`
2. Fase 5 — UI do fluxo de importação: modal upload → prévia → confirmar → espelho
3. Fase 7 — Exportações configuráveis (Excel/CSV/TXT por template de layout)

---

## HANDOFF ANTERIOR — SESSÃO 41 (2026-06-08) → SESSÃO 42

### Estado atual: ~270 bugs registrados · Deploy @695 (GAS) · Firebase live

### O que foi feito nesta sessão (s41)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @694 | TAR-04 — Gatilhos automáticos de tarefas | `TarefaEngine.verificarPrazos(orgId)`: lista atrasadas, marca `atrasoNotificadoEm` (notificação única), emite `TASK_DELAYED`. Handler `TASK_DELAYED`: e-mail ao responsável. Handler `TAREFA_CRIADA`: e-mail ao responsável quando atribuído por outra pessoa. `verificarPrazosTarefas()` + `criarTriggerVerificacaoPrazos()` (diário 08:00). `ctrl_tarefas_verificar_prazos()` para admin. |
| @694 | Fix: Gestão de tarefas — cards expandíveis + modal de exclusão | Cards da sub-tab Gestão com painel expandível: detalhe (prazo/prioridade/vínculo), botões Concluir / Próximo Status / Excluir. `confirm()` nativo substituído por `_abrirModalConfirmar()` em toda exclusão de tarefa. `_pendExcluirDeGestao` flag para recarregar gestão após exclusão. `_confirmarExcluir()` exposto no return do IIFE. |
| @694 | Fix: Tarefas — visibilidade, auto-criação e gestão | Auto-task removida de RESERVATION_CREATED / KEY_PROTOCOL_DELAYED / ITEM_NOT_RETURNED. Gestor vê apenas tarefas do seu setor + próprias. `ctrl_tarefas_gestao` agrupa por setor/responsável. Sub-tab "Gestão" com barra de progresso e dois modos. Responsável obrigatório na criação. |
| @689 | Fix: exclusão de tarefas | Botão "Excluir" no painel expansível de cada tarefa (cor error, alinhado à direita). `GAS.tarefas.excluir` mapeado para `ctrl_tarefas_excluir`. `confirm()` antes de deletar; lista recarregada após sucesso. |
| @688 | Fix: Tarefas como 4ª aba do Meu Centro | `#th-tab-tarefas` criada dentro de `#view-taskhub` com todo o conteúdo do formulário Nova Tarefa + lista expandível. `TaskHubUI.setTab()` ampliado para 4 abas; botão ativo por `data-tab`; chama `TarefasUI.aoAbrir()` ao ativar. `abrirItem('tarefa',...)` → `setTab('tarefas', null)` em vez de Router.navegar. Entrada `tarefas` removida do `_MODULOS_MENU`. `Router.registrar('tarefas', ...)` redireciona para taskhub+aba (compatibilidade cross-nav). Botões "Tarefas" no header e "Nova Tarefa" no meuDia removidos. `#view-tarefas` mantido vazio como stub. |
| @677 | HOME-01/02/03/04 — Home contextual por papel | `_renderizarHome()` bifurcada em `_renderHomeAdmin()` (stats de sistema para superadmin/admin) e `_renderHomeContextual()` (cards async de tarefas/encaminhamentos/urgentes/aprovações via `ctrl_taskhub_minha_caixa()`; acesso rápido por papel; widget "Aniversariantes da Semana" via `ctrl_taskhub_aniversariantes()`). Novo `#home-aniversariantes` no HTML. |
| @676 | Fix: Tarefas + Meu Centro + cards expandíveis | Tarefas movida para PRINCIPAL no sidebar (após Meu Centro); botão "Tarefas" no header do Meu Centro; TarefasUI com cards click-to-expand; borda colorida por prioridade; atrasadas em vermelho; títulos auto-criados sem ID bruto da reserva. |
| @675 | Arq: multi-tenant + remoção de hardcodes institucionais | `SHEET_ID_INSTITUICOES` no hub central; `OrgRegistryService._indexarCentral()`; seeds CCBJ movidos para `setupInicialCCBJ()`; `config.gs` sem defaults hardcoded; `?secao=public_config` endpoint; `public/index.html` dinâmico. |

### Pendentes / próxima ação
- **URGENTE após deploy: executar `setarMapaTemplateCCBJ()` no GAS Editor** — garante que o mapa do CCBJ continue aparecendo.
- **Executar no GAS Editor (uma vez, após deploy):**
  1. `criarTriggerVerificacaoPrazos()` — instala trigger diário 08:00 para TAR-04
  2. `fase9_prepararIndice()` — registra CCBJ no hub com todos os Sheet IDs
  3. `fase73_estoque_prepararIndice()` — cria abas ESTOQUE + seed dep-01/dep-02
  4. `fase78_inspecionar_ativos_v1()` → `fase78_migrar_ativos_para_estoque()`
- **Próximo bug de auditoria:** HUB-13 (dayoff de aniversário)

---

## HANDOFF ANTERIOR — SESSÃO 38 (2026-06-07) → SESSÃO 39

### Estado anterior: ~270 bugs registrados · Deploy @673 (GAS) · Firebase live

### O que foi feito nesta sessão (s38)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @673 | Fix: botões externos — `ScriptApp.getService().getUrl()` | 4 links que abriam `googleusercontent.com` em vez do URL `/exec` de produção corrigidos. Causa raiz: dentro do iframe GAS, `window.location.href` e URLs relativas resolvem para o host do iframe. Solução: `template.serviceUrl = ScriptApp.getService().getUrl()` no `_renderAppInterno` de `router.gs`; `index.html` usa `<?= serviceUrl ?>` nos 4 pontos: botão "Visualizar Cadastro" (Admin), link "Abrir Wizard de Setup", link "Portal Público" (Agentes), hint do checklist de provisionamento. |

### Pendentes / próxima ação
- **Executar no GAS Editor (nesta ordem) — pendentes de sessões anteriores:**
  1. `fase73_estoque_prepararIndice()` — cria abas **ESTOQUE** (não MASTER) + seed dep-01/dep-02
  2. `fase78_inspecionar_ativos_v1()` — confirmar campos ESPACOS.Ativos
  3. `fase78_migrar_ativos_para_estoque()` — migrar bens patrimoniais
- **Próximos bugs de auditoria:** TAR-04 (gatilhos automáticos), HUB-13 (dayoff aniversário)

---

## HANDOFF ANTERIOR — SESSÃO 37 (2026-06-06) → SESSÃO 38

### Estado anterior: ~270 bugs registrados · Deploy @668 (GAS) · Firebase live

### O que foi feito nesta sessão (s37)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @668 | Docs: manual.html — auditoria lote 2 (13 seções) | **estrategia**: eixos→horizonte (curto/médio/longo prazo), KPIs e riscos auto-calculados, form sem campo eixo. **reservas-carro**: campos reais (setor, passageiros, localização com mapa). **ponto**: registro ponto removido do gate feat.editar — disponível a todos. **rh**: PCC→PCCS (Plano de Cargos, Carreiras e Salários), todas as 10 abas documentadas. **contratacoes**: FSM real (rascunho/submetida/devolvida/aprovada_gestor/aguard_cotacoes/cotacoes_recebidas/aprovada_financeiro/em_instrucao/em_execucao/concluida/rejeitada/cancelada) + tipos (serviço/compra/bolsa). **escuta-lgpd**: CORRETO sem alteração. **financeiro**: Rubricas→Fontes de Recurso, add Aditivos+Exportações, remove bloco gerar_holerite morto (feature PESSOAS, não FINANCEIRO). **comunicacao**: CORRETO sem alteração. **voluntarios**: campos reais (nome/email/telefone/competências), aba Alocações documentada, convite por email. **agentes**: campos reais (tipo/CPF/nomeArtístico/áreas/linguagens), removido "links de portfólio" (não existe no form). **relatorios**: sem view dedicada — exports distribuídos por módulo (CODIP/Financeiro/Ponto/Escuta/Estoque). **admin**: add abas Cadastros Base (Features, Identidade Visual, Banco de Dados, Ferramentas/Provisionamento). **fix**: badges Vermelho/Amarelo no manual tinham cores indistinguíveis — CSS corrigido. |

### Pendentes / próxima ação
- **Executar no GAS Editor (nesta ordem) — pendentes de sessões anteriores:**
  1. `fase73_estoque_prepararIndice()` — cria abas **ESTOQUE** (não MASTER) + seed dep-01/dep-02
  2. `fase78_inspecionar_ativos_v1()` — confirmar campos ESPACOS.Ativos
  3. `fase78_migrar_ativos_para_estoque()` — migrar bens patrimoniais
- **Próximos bugs de auditoria:** TAR-04 (gatilhos automáticos), HUB-13 (dayoff aniversário)

---

## HANDOFF ANTERIOR — SESSÃO 36 (2026-06-06) → SESSÃO 37

### Estado anterior: ~270 bugs registrados · Deploy @658 (GAS) · Firebase live

### O que foi feito nesta sessão (s36)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @661 | Docs: manual.html | Seções `taskhub`, `tarefas`, `balcao`, `pessoas`, `reunioes` reescritas para refletir a implementação real (3 abas TaskHub, 6 fontes Meu Dia, grupos prioridade, aniversariantes, prazo/vínculo em Tarefas, Balcão como canal de comunicação com SLA + versões, dataNascimento em Pessoas, encaminhamentos em Reuniões). |
| @662 | Docs: manual.html (correções pós-investigação) | Meu Time: aba visível para todos; conteúdo bloqueado no backend para gestor/coordenador/admin/superadmin; "coordenador" adicionado ao texto. Aprovações Meu Dia: habilitador removido — apenas gestor/admin/superadmin recebem esse item no controller. |
| @663 | Fix: manual sidebar — item ativo com texto invisível | `.manual-nav-item.ativo` usava `--sidebar-active` (transparente, feito para sidebar escura) + `color:#fff` → texto branco sumia no fundo claro. Corrigido: `background: var(--color-primary-lt)` + `color: var(--color-primary)`. |
| @667 | Fix: manual sidebar — incompatível com sidebar do sistema | `_GRUPOS` reestruturado (PRINCIPAL/GESTÃO/OPERACIONAL/VOLUNTARIADO/SISTEMA). Labels alinhados ao `_MODULOS_MENU`: Infraestrutura, Pessoas/RH-Configurações, Escuta, Financeiro, Comunicação, Ações, Público. Rota 'rh' → seção 'pessoas'. |
| @665 | Fix: manual — divergências passo a passo | (1) Ações: FSM corrigido (Planejada/Em Produção/Em execução/Concluída/Arquivada); Rascunho/Em análise/Aprovada removidos. (2) Aprovações: tabs reais (Reservas/Acessos/Carros/Permissões); Ações culturais e 48h removidos. (3) Público: certificado é explícito, não automático; frequência mínima 75% documentada. |

### Pendentes / próxima ação
- **Executar no GAS Editor (nesta ordem) — pendentes de sessões anteriores:**
  1. `fase73_estoque_prepararIndice()` — cria abas **ESTOQUE** (não MASTER) + seed dep-01/dep-02
  2. `fase78_inspecionar_ativos_v1()` — confirmar campos ESPACOS.Ativos
  3. `fase78_migrar_ativos_para_estoque()` — migrar bens patrimoniais
- **Próximos bugs de auditoria:** TAR-04 (gatilhos automáticos), HUB-13 (dayoff aniversário)

---

## HANDOFF ATUAL — SESSÃO 49f (2026-06-13) → SESSÃO 50

### Estado: Deploy @857 · Fix badge setor no histórico

### O que foi feito (s49f)
| Deploy | Fase | O que foi implementado |
|---|---|---|
| @857 | Fix | `_evMudancas`: `ev.novoSetor` gera badge `_labelSetor(setorAnterior) → _labelSetor(novoSetor)`. |

---

## HANDOFF ANTERIOR — SESSÃO 49e (2026-06-13) → SESSÃO 49f

### Estado: Deploy @854 · Fix admissão requer salário

### O que foi feito (s49e)
| Deploy | Fase | O que foi implementado |
|---|---|---|
| @854 | Fix | `admissao:['admissao','cargo','setor','salario']`; backend: `alteraSalario` ativado em admissão. |

---

## HANDOFF ANTERIOR — SESSÃO 49d (2026-06-13) → SESSÃO 49e

### Estado: Deploy @851 · Fix atualizarEvento + admissão requer setor

### O que foi feito nesta sessão (s49d)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @851 | Fix | `atualizarEvento` adicionado ao return de `PessoasEngine`. `_EV_CAMPOS.admissao` inclui `'setor'`; backend: `alteraSetor` ativado em admissão. |

---

## HANDOFF ANTERIOR — SESSÃO 49c (2026-06-13) → SESSÃO 49d

### Estado: Deploy @850 · RH — Permissões de escrita restritas a superadmin/rh

### O que foi feito nesta sessão (s49c)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @850 | RH Permissões | `_podeEscreverRh()` global. `aoAbrir()` oculta 9 botões estáticos. Renders dinâmicas: Histórico (editar+excluir evento), PCCS (editar plano, editar/excluir cargo, Novo Cargo), Avaliações (excluir), Folha (Marcar Pago × 2). |

### Checklist de auditoria — Deploy @850
```
[x] prompt()/confirm() — não usados
[x] GAS.* — sem novos bindings
[x] CSS — sem alterações CSS
[x] IDs de DOM — sem novos IDs
[x] FsmGuardian — não aplicável
[x] Modais — não aplicável
[x] BtnGuard — botões ocultos, não removidos do DOM (BtnGuard não quebra)
[x] Datas — não aplicável
```

### Pendentes / próxima ação
- Testar como colaborador (papel != rh/superadmin): nenhum botão de escrita deve aparecer nas abas Histórico, PCCS, Avaliações, Folha, Encargos.

---

## HANDOFF ANTERIOR — SESSÃO 49b (2026-06-13) → SESSÃO 49c

### Estado: Deploy @849 · RH Histórico — Edição de eventos por superadmin/rh

### O que foi feito nesta sessão (s49b)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @848 | RH Edição Histórico | `atualizarEvento` em `pessoas_engine.gs` (mescla segura de campos permitidos, sem re-aplicar efeitos na ficha). `ctrl_rh_atualizar_evento` restrito a superadmin/rh. `GAS.rh.atualizarEvento` binding. `editarEvento(id)` em RhUI: carrega do `_historicoCache`, pré-preenche form, bloqueia select de colaborador, muda botão para "Salvar alterações", exibe aviso amarelo. `fecharFormEvento` restaura estado. Timeline mostra botão editar apenas para superadmin/rh e tag "(editado)" quando `editadoPor` presente. |

### Checklist de auditoria — Deploy @848
```
[x] prompt()/confirm() — não usados
[x] GAS.* — GAS.rh.atualizarEvento adicionado
[x] CSS — sem alterações CSS
[x] IDs de DOM — rh-ev-aviso-edicao adicionado; rh-btn-edit-ev-{id} gerado dinamicamente
[x] FsmGuardian — não aplicável
[x] Modais — aviso amarelo com background opaco (#fff8e1) — correto
[x] BtnGuard — rh-btn-salvar-evento já coberto; rh-btn-edit-ev-{id} é data-bg-skip implícito (abre form, não async)
[x] Datas — sem datas novas exibidas
```

### Pendentes / próxima ação
- Testar edição: clicar no lápis em um evento → form abre pré-preenchido → alterar descrição → "Salvar alterações" → timeline mostra "(editado)".
- Confirmar que colaborador sem papel superadmin/rh NÃO vê o botão editar.

---

## HANDOFF ATUAL — SESSÃO 56 (2026-06-16) → SESSÃO 57

### Estado: Deploy @993 · Fix: Datas Comemorativas sempre mostra todas as pré-cadastradas + toggle on/off

### O que foi feito nesta sessão (s94b)
| Deploy | Fase | O que foi implementado |
|---|---|---|
| @993 | s94b Datas Comemorativas merge+toggle | `_mergeComDefaults`: defaults sempre aparecem no admin; toggle `toggle_on`/`toggle_off` substitui excluir/restaurar; `toggleDataComemorativa` no backend. |

### Pendentes / próxima ação
- Testar: Admin → Datas Comemorativas → lista deve mostrar todas as 35 datas pré-cadastradas; clicar toggle desativa/ativa
- Bugs auditoria pendentes: TAR-04, HUB-13, FIN-06

---

## HANDOFF ANTERIOR — SESSÃO 55b (2026-06-16) → SESSÃO 56

### Estado: Deploy @979 · Fix: tooltip bairros sem rótulo epicentro (s89b)

### O que foi feito nesta sessão (s89b)
| Deploy | Fase | O que foi implementado |
|---|---|---|
| @979 | Fix tooltip epicentro | `_tooltipBairro`: parâmetro `epicentro` removido; linha `★ epicentro` excluída; duas chamadas `.bindTooltip` simplificadas. Diferenciação visual por cor âmbar permanece. |

### Pendentes / próxima ação
- Testar: Mapa Bairros → tooltip dos bairros do GBJ não exibe mais rótulo; cor âmbar permanece
- Bugs auditoria pendentes: TAR-04, HUB-13, FIN-06

---

## HANDOFF ANTERIOR — SESSÃO 55 (2026-06-16) → SESSÃO 55b

### Estado: Deploy @978 · UX: BI Demográfico — mapa calor visível, bairros frios, epicentro, pais/mães por gênero, restrições expandíveis

### O que foi feito nesta sessão (s85)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @963 | UX BI Demográfico — 5 melhorias visuais | `_renderCalor`: `radius:45`, `minOpacity:0.55`, gradiente começa em `0.0` (pontos sempre visíveis mesmo com endereços esparsos). `_renderBairros`: paleta fria (azul `#1e40af→#bfdbfe`) substitui cores quentes; constante `_EPICENTRO` — bairros Bom Jardim, Canindezinho, Siqueira, Granja Lisboa, Granja Portugal recebem cor âmbar `#f59e0b` com tooltip "★ epicentro" e borda `#92400e`. `_renderFamilias`: dois cards lado a lado "Pais" (bordas azuis) / "Mães" (bordas rosas) usando `r.genero.includes('homem'/'mulher')`; "Outro gênero" listado separadamente. `_renderRestricoes`: cards expandíveis por tipo com ícone Material, badge de contagem, lista de pessoas por tipo com campo "Obs:" quando `restricoesOutro` preenchido. |

### Checklist de auditoria
```
[x] prompt()/confirm()/alert() — nenhum nativo introduzido
[x] GAS.* namespace — sem novos ctrl_*; apenas front-end
[x] CSS — sem classes novas sem definição (styles inline)
[x] FsmGuardian — não aplicável (renderização de UI apenas)
[x] Modais — não alterados
[x] Datas — sem alterações de formato
[x] BtnGuard — botões do mapa já usavam BtnGuard; sem novos botões
```

### Pendentes / próxima ação
- Testar no browser: BI Demográfico → Carregar Mapa → mapa de calor mostra pontos visíveis mesmo com poucos registros
- Mapa Bairros → bairros do Grande Bom Jardim aparecem em âmbar/dourado, demais em azul
- Painel Pais/Mães → mostra dois cards distintos com listas
- Restrições → cada tipo expande ao clicar; lista nomes + observações
- Bugs auditoria pendentes: TAR-04, HUB-13, FIN-06

---

## HANDOFF ANTERIOR — SESSÃO 54 (2026-06-15) → SESSÃO 55

### Estado: Deploy @941 · Feat: Férias — ordem invertida, dropdown compartilhado, exclusão superadmin

### O que foi feito nesta sessão (s54)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @941 | Feat: Férias UX + exclusão superadmin | Tabelas do painel de Férias reordenadas: "Períodos Aquisitivos e Concessivos" sobe para topo, "Férias" desce para baixo. Dropdown `rh-per-colab` agora compartilhado — `onchange` dispara `carregarPeriodosFerias()` + `carregarFerias()`; `carregarFerias()` lê o colaborador selecionado e passa para `GAS.rh.listarFerias(colabId)`. Opção vazia agora é "Todos os colaboradores" (mostra todos sem filtro). Exclusão de registro: `excluirFerias` adicionado em `colaborador_repository.gs` (remove do JSON), `pessoas_engine.gs` (valida existência + auditoria `FERIAS_EXCLUIDA`) e `pessoas_controller.gs` (guarda exclusiva: `nivel !== 'superadmin'` lança erro). Frontend: botão `delete_forever` renderizado na linha apenas quando `usuarioPapel === 'superadmin'`; usa `_abrirModalConfirmar` (sem `confirm()` nativo); `GAS.rh.excluirFerias` e `RhUI.excluirFerias` expostos. |

### Checklist de auditoria
```
[x] prompt()/confirm()/alert() — exclusão usa _abrirModalConfirmar; zero nativos
[x] GAS.* namespace — GAS.rh.excluirFerias adicionado
[x] FsmGuardian — não aplicável nesta alteração
[x] Modais — usa _abrirModalConfirmar padrão do sistema
[x] Datas — sem alterações de formato
[x] BtnGuard — botão delete usa id válido (rh-btn-del-fer-{id})
```

### Pendentes / próxima ação
- Testar no browser: RH → Férias → selecionar colaborador → ambas as tabelas filtram; selecionar "Todos os colaboradores" → ambas voltam ao geral
- Testar exclusão como superadmin: botão delete_forever aparece → modal confirma → registro sumiu → Toast sucesso
- Bugs auditoria pendentes: TAR-04, HUB-13, FIN-06

---

## HANDOFF ANTERIOR — SESSÃO 53 (2026-06-14) → SESSÃO 54

### Estado: Deploy @910 · Fix: FsmGuardian.validarTransicao inexistente → assertValida em 6 engines

### O que foi feito nesta sessão (s53)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @910 | Fix: FsmGuardian.validarTransicao | Método `validarTransicao` nunca existiu em `FsmGuardian` — API real é `assertValida`. Erro "FsmGuardian.validarTransicao is not a function" aparecia ao encerrar contrato e em transições de status de remanejamento, aditivo, fonte de recurso, contratado e solicitação. Corrigido em 6 arquivos: `contratos_engine.gs`, `remanejamento_engine.gs`, `aditivo_engine.gs`, `fonte_recurso_engine.gs`, `contratado_engine.gs`, `solicitacao_engine.gs`. |

### Checklist de auditoria
```
[x] prompt()/confirm()/alert() — não usados nesta sessão
[x] GAS.* namespace — sem alterações de frontend
[x] FsmGuardian.assertValida — chamado corretamente em todos os 6 engines afetados
[x] Datas — sem alterações de frontend
```

### Pendentes / próxima ação
- Testar no browser: Financeiro → Contratos → "Encerrar Contrato" → preencher motivo → botão Encerrar → sem erro "FsmGuardian.validarTransicao is not a function"
- Idem: mudar status de Remanejamento, Aditivo, Fonte de Recurso
- Bugs auditoria pendentes: TAR-04, HUB-13, FIN-06

---

## HANDOFF ANTERIOR — SESSÃO 52d (2026-06-14) → SESSÃO 53

### Estado: Deploy @909 · Fix: provisões Financeiro recomputadas ao ler + rescisão sem benefícios

### O que foi feito nesta sessão (s52d)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @909 | Fix: provisões Financeiro | `contratos_engine.buscarPorId` recomputa itens de pessoal com `calcularCustoPessoal` ao ler — elimina valores cacheados da fórmula antiga (férias=salary×4/3/12 + 13°=salary/12 + inssDecimo); provisões exibirão R$1.479,28 correto |
| @909 | Fix: rescisão sem benefícios | Custo mensal no break-even: salário + encargos + provisões (VT/VA/PS zerados na chamada); benefícios excluídos de qualquer cálculo da rescisão |

### Pendentes / próxima ação
- Testar no browser: (1) Financeiro → Pessoal → provisões devem ser R$1.479,28 e custo mensal ~R$13.249; (2) Rescisão → custo mensal deve ser salário+encargos+provisões (sem benefícios)
- Verificar se custo mensal Financeiro/Pessoal bate com planilha após recomputa (diferença residual pode estar em valores de benefícios diferentes)

---

## HANDOFF ANTERIOR — SESSÃO 52c (2026-06-14) → SESSÃO 52d

### Estado: Deploy @903 · Fix: custo mensal rescisão com benefícios reais

### O que foi feito nesta sessão (s52c)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @903 | Fix: custo mensal com benefícios | `_aoSelecionarColabRescisao`: substituiu `salario×1,55` por chamada real a `GAS.contratos.calcularPessoal` com VT/VA/PS do colaborador; breakdown exibe salário + encargos + provisões + benefícios; nota explica que benefícios contam no break-even mas não entram na rescisão |

### Pendentes / próxima ação
- Testar no browser: selecionar colaborador → custo mensal deve bater com valor da planilha (~R$13.530,85 para salário R$8.103,38 com benefícios reais)

---

## HANDOFF ANTERIOR — SESSÃO 53 (2026-06-15) → SESSÃO 54

### Estado: Deploy @943 · UX: tabela unificada de férias + painel colaborador redesenhado

### O que foi feito nesta sessão (s53)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @943 | UX Férias unificada | Aba RH/Férias: dois cards fundidos em um; tabela de períodos com linhas expansíveis por chevron; registros de férias na sub-tabela; helpers `_urgenciaFeriasInfo`, `_acoesFeriasBtns`, `_tipoBadgeFer`, `_acordoHtml`, `_togglePeriodoFerias` |
| @943 | UX Painel colaborador | Seção Férias com cards coloridos por status (borda esquerda), expand/collapse, max 4 + "Ver mais", terminologia clara (Prazo legal expirado / Disponível para gozo / Realizada), `_detFerToggle`, `_detFerVerMais` |

### Pendentes / próxima ação
- Testar no browser: (1) Aba RH → Férias → selecionar colaborador → períodos com chevron; clicar no período → sub-tabela de férias; (2) Painel colaborador → Férias → cards coloridos por status, collapse/expand, "Ver mais"; (3) Botão "Solicitar" na row de período → form com banner de janela concessiva + datas restringidas; (4) Botão "Acordo" só aparece em férias aprovadas; (5) Quadros → criar/listar com reuniaoId e colaboradores

---

## HANDOFF ATUAL — SESSÃO 146 (2026-06-25) → PRÓXIMA

### Estado: Deploy @1089 · feat — Dashboard Builder: sidebar lateral, dados ao vivo no editor, filtros interativos

### O que foi feito nesta sessão (s146)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @1089 | CSS `.db-widget-sidebar` | Painel lateral `position:fixed` 360px, slide-in from right, `.db-sidebar-hdr/body/footer`; `.db-filtro-bar` com grupos, separadores, label |
| @1089 | `_abrirWidgetEditor` refatorado | Formulário separado em `formHtml`; sidebar usada preferencialmente (injetada em `#db-widget-sidebar`); fallback para `_abrirModalSimples` se sidebar não existir no DOM |
| @1089 | `_renderDashboardEditor` | Cria `#db-widget-sidebar` em `document.body` se não existir; sidebar persiste durante toda a sessão do editor |
| @1089 | `_weCancelarSidebar` (nova) | Fecha sidebar sem destruir canvas; registrada no `return` público |
| @1089 | `_weConfirmar` | Fecha sidebar OU modal conforme qual está aberto |
| @1089 | `_weSetCor` | Selector corrigido: busca em `#db-sidebar-body` antes de `.modal-simples` |
| @1089 | `_weSelDs` | Selector corrigido: `#db-sidebar-body [id^="we-modal-"]` como primário |
| @1089 | `_dashCarregarWidgetPreview` (nova) | Carrega GAS imediatamente ao adicionar/configurar widget com `dsId`; atualiza body do card no canvas do editor com dados reais ou spinner/erro |
| @1089 | `_dashAddSugestaoByIdx` | Chama `_dashCarregarWidgetPreview` após push — preview automático |
| @1089 | `_dashAdicionarWidget` | Chama `_dashCarregarWidgetPreview` após confirmar widget no editor |
| @1089 | `_dashEditarWidget` | Chama `_dashCarregarWidgetPreview` após confirmar — dados atualizados no canvas |
| @1089 | `_renderDashboardView` filtroBar | Barra expandida: presets de período + inputs De/Até (date) + select Setor — 3 grupos com separadores visuais |
| @1089 | `_dashSetFiltroDatas` (nova) | Inputs De/Até sobrescrevem presets; dispara `_dashRecarregarWidgets` |
| @1089 | `_dashSetFiltroSetor` (nova) | Select de setor dispara `_dashRecarregarWidgets` |
| @1089 | `_dashRecarregarWidgets` | Passa `setor` em `fParams`; aplica filtro client-side (row[0] match) antes de renderizar |
| @1089 | Backend `ctrl_analise_importar_dados` | Aceita `params.setor` em `_analise_filtro_global` |
| @1089 | Backend `_analise_filtrar_por_setor` (nova) | Filtra lista por campo setor quando `_analise_filtro_global.setor` está setado |
| @1089 | Backend `_ds_pessoas_cargo/vinculo` | Aplicam `_analise_filtrar_por_setor` antes de agrupar |

### Pendentes / próxima ação
- Testar no browser: (1) Dashboard Builder → Novo dashboard → clicar sugestão → confirmar que sidebar abre à direita com formulário; (2) Selecionar dataset no widget → confirmar preview ao vivo no canvas; (3) Abrir dashboard existente → barra de filtros com 3 grupos (período / data / setor); (4) Aplicar filtro de setor → widgets recarregam; (5) Inputs De/Até → botões preset desmarcam

---

## HANDOFF ANTERIOR — SESSÃO 138 (2026-06-25) → SESSÃO 139

### Estado: Deploy @1069 · feat — Estúdio de Análises v2: catálogo 27 datasets, 9 tipos gráfico, cruzamento multi-módulo

### O que foi feito nesta sessão (s138)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @1069 | Backend analise_controller | `ctrl_analise_catalogo`, `ctrl_analise_cruzar`, 27 datasets cobrindo todos os módulos, funções de cruzamento `_cruzar_pessoas_tarefas`, `_cruzar_reservas_tarefas`, `_cruzar_acoes_publico_mes`, `_cruzar_custom` |
| @1069 | AnaliseEstudioUI v2 | Catálogo modal com busca; 9 tipos gráfico (+ barras_emp, rosca, funil); stats strip (total/média/máx/mín); ajustes avançados (rótulos, grade, formato, linha ref); botão "Sugerir tipo"; dica contextual por tipo |
| @1069 | CSS analise | `.analise-catalogo-*`, `.analise-stats-strip`, `.analise-stat-item`, `.analise-ajustes-panel` |
| @1069 | GAS namespace | `GAS.analise.cruzar` adicionado |
| @1069 | fix QuadrosUI | `_resizeObserver` com `disconnect()` no cleanup — previne memory leak |
| @1069 | fix QuadrosUI | panning no canvas: click em área vazia ativa `isPanning`, cursor `grabbing` |

---

## HANDOFF ANTERIOR — SESSÃO 95 (2026-06-16) → SESSÃO 96

### Estado: Deploy @994 · UX/Fix — Financeiro/Contratos: CANCELADO na FSM, cores por setor, ordenamento, bug rubrica, feedback Execução

### O que foi feito nesta sessão (s95)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @994 | Backend FSM | `STATUS_CONTRATO.CANCELADO`; Ativo/Suspenso→Cancelado; `excluir()` aceita Encerrado ou Cancelado; bug filtro lowercase corrigido |
| @994 | UI Contratos | Botão Cancelar (vermelho) separado de Encerrar (âmbar); Excluir disponível só para terminais; `abrirModalStatus` unificado |
| @994 | Badge setor | Paleta 10 cores por hash do id do setor; sem ícone apartment; `.exec-agrup.ativa` com cor primária |
| @994 | Ordenamento | Lista contratos, rubricas PT e pessoal ordenados alfabeticamente |
| @994 | Bug rubrica | `editarRub` usa `catalogoItemId` para match; `salvarRubrica` persiste `catalogoItemId` |

### Pendentes / próxima ação
- Testar no browser: (1) Suspender → Cancelar contrato; (2) Excluir aparece após Cancelar/Encerrar; (3) Badge setor com cores diferentes por setor; (4) Botões Meta/Atividade/Setor/Rubrica ficam destacados ao clicar; (5) Editar rubrica preserva nome

---

## HANDOFF — SESSÃO 152b (2026-06-26) → PRÓXIMA SESSÃO

### Estado: Deploy pendente · feat: ReservasUI autocomplete de Ações + DB v2 Fase 1

### O que foi feito nesta sessão (s152b)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| pendente | feat: autocomplete ações | `ReservasUI`: `_carregarAcoesCache`, `_filtrarAcoes`, `_selecionarAcao`, `_fecharDropdownAcoes` — vinculação de ação via cadastro, não texto livre |

### Pendentes / próxima ação
- Executar `clasp push && clasp deploy` para publicar
- Smoke test: autocomplete de ações no formulário de reserva
- Implementar **Fase 2 do Dashboard Builder** — Widget Editor com painel de campos

---

## HANDOFF ANTERIOR — SESSÃO 152 (2026-06-26) → 152b

### Estado: Deploy @1105 · feat: Dashboard Builder v2 Fase 1 — novo modelo de dados

### O que foi feito nesta sessão (s152)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| pendente | feat: _CAMPO_CATALOGO | Frontend: catálogo tipado com todos 35 datasets — cada dsId mapeia para `{label, modulo, campos:[{id,label,tipo,formato}]}`. Base para Widget Editor v2. |
| pendente | feat: backend v2 params | `ctrl_analise_importar_dados` e `ctrl_analise_widget_dados` aceitam `filtros[]`, `ordenacao`, `limite`, `dimensoes[]`, `metricas[]`. Backward compat total. |
| pendente | feat: helpers GAS | `_analise_extrairFiltroGlobal`, `_analise_filtrarLinhasPos`, `_analise_ordenarLinhas` em `analise_controller.gs`. |
| pendente | feat: render normalizado | `_normColunas()` e `_campoCatalogoGet()` adicionados. KPI, tabela e gráfico no `_renderWidgetBody` passam por `_normColunas`. |
| pendente | feat: pipeline v2 | `_dashCarregarWidgetPreview` e `_dashRecarregarWidgets` detectam `w.filtros` como array (v2) vs objeto (legado) e roteiam corretamente. Filtro de setor client-side removido (server-side). |

### Pendentes / próxima ação
- Executar `clasp push && clasp deploy` para publicar Fase 1
- Confirmar smoke test: dashboards existentes ainda renderizam (backward compat)
- Implementar **Fase 2** — Widget Editor com painel de campos (dimensões/métricas drag-and-drop)

---

## HANDOFF ANTERIOR — SESSÃO 148 (2026-06-25) → PRÓXIMA SESSÃO

### Estado: Deploy pendente · feat: Biblioteca SVG dc-icon + logos institucionais

### O que foi feito nesta sessão (s148)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| pendente | feat: dc-icon | `gas/src/shared/icons.html`: sprite sheet com 156 símbolos SVG (150 gerais + 6 logos); web component `<dc-icon>` + `dcIcon()` + `dcLogo()` globais |
| pendente | feat: logos inst | IDM sun/wordmark, CCBJ mark/wordmark, Secult 60 anos, Ceará Governo do Estado vetorizados em `assets/icons/institucional/` |
| pendente | feat: integração | `index.html`: include icons no head; banner usa `<dc-icon name="teatro">`; sidebar footer com IDM sun + CCBJ mark; DatasComemorativasAdmin aceita nomes dc-icon |
| pendente | feat: assets | 150+ SVGs baixados (Lucide ISC + Tabler MIT) em `/assets/icons/`; índice semântico em `assets/icons/index.js` |

### Pendentes / próxima ação
- Executar `clasp push && clasp deploy` para publicar
- Verificar no browser: (1) Banner com ícone teatro SVG; (2) Sidebar footer com logos IDM + CCBJ; (3) `<dc-icon>` renderizando em telas de admin
- Criar SVGs custom para ícones sem equivalente: dança, circo, maracatu, cordel, xilogravura, rabeca, fogos de artifício

---

## HANDOFF ANTERIOR — SESSÃO 52b (2026-06-14) → SESSÃO 52c

### Estado: Deploy @902 · Fix: aviso férias vencidas + ícones MS

### O que foi feito nesta sessão (s52b)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @902 | Fix: aviso férias | Mensagem do campo "Férias vencidas" só aparece quando há períodos com prazo legal vencido; sem jargão "API"/"Período N"; usa Material Symbols `warning`/`report`/`error`/`info` em vez de emoji |
| @902 | Fix: ícones férias | `_urgenciaFeriasInfo` e `URGENCIA_CFG` substituídos — campo `ms` com nome do ícone MS; render com `<span class="ms ms-sm">` inline |
| @902 | Fix: resultado rescisão | Label "Férias Vencidas" sem emoji; badge "pago em dobro" com ícone MS `warning` |

### Pendentes / próxima ação
- Testar no browser: (1) Selecionar colaborador com férias vencidas → aviso aparece com ícone MS e mensagem clara; (2) Colaborador sem férias vencidas → campo sem aviso; (3) Tabela de períodos → coluna Urgência com ícones MS

---

## HANDOFF ANTERIOR — SESSÃO 52 (2026-06-14) → SESSÃO 52b

### Estado: Deploy @900 · Folha: Rescisão movida para sub-painel + PS breakdown verColab/holerite

### O que foi feito nesta sessão (s52)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @900 | Feat: Rescisão → sub-painel Folha | Aba "Rescisão" removida do nav principal RH; conteúdo (`rh-folha-painel-rescisao`) movido para dentro da aba Folha; novo botão "Rescisão" no sub-nav; `setSubAbaFolha('rescisao')` popula select; `setTab('rescisao')` redireciona para Folha→Rescisão |
| @900 | Feat: PS breakdown verColab | Card Plano de Saúde exibe 3 linhas: total do plano, desconto do funcionário (k×`_descPSPercCache`), custo empresa (k−l); `_descPSPercCache` carregado de EncargosEngine em `aoAbrir()` |
| @900 | Feat: PS breakdown holerite | `holerite_engine.gs` expõe `psBruto`, `psDescEmpregado`, `psEmpresa`; modal holerite exibe breakdown PS (total → desc. funcionário → custo empresa) |

### Pendentes / próxima ação
- Testar no browser: (1) Folha → Rescisão — sub-painel abre, select colaboradores popula; (2) verColab CLT com PS — ver 3 linhas do plano de saúde; (3) Abrir holerite — seção Benefícios exibe breakdown PS

---

## HANDOFF ANTERIOR — SESSÃO 51b (2026-06-14) → SESSÃO 52

### Estado: Deploy @891 · Pessoal: controle orçamentário real via histórico salarial + auto-vínculo + guard de saldo

### O que foi feito nesta sessão (s51b)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @891 | Feat: timeline salarial | `contratos_engine._timelineSalarial()` — reconstrói linha do tempo de salários do colaborador usando eventos `reajuste`/`promocao`/`desligamento` do `historico_rh.json`; corretamente clampada à vigência do contrato e ao período ativo (admissão → desligamento) |
| @891 | Feat: custo real histórico | `_calcularCustoRealColaborador()` — percorre segmentos da timeline, chama `calcularCustoPessoal` por segmento com meses fracionários, retorna `{custoTotal, meses, segmentos[]}` |
| @891 | Feat: auto-vínculo por cargo | `autoVincularPessoal(idContrato, idMeta, orgId)` — match automático colaborador ↔ item de pessoal por cargo (case-insensitive), respeitando período ativo vs. vigência; salva com `ContratoRepository.adicionarPessoal`; exposto via `ctrl_contratos_auto_vincular_pessoal` |
| @891 | Feat: painel orçamentário | `painelOrcamentoPessoal(idContrato, orgId)` — agrega previsto × realizado × saldo × desvio% por item e total; alerta `ok`/`atencao`/`critico`/`folga`; exposto via `ctrl_contratos_pessoal_orcamento` |
| @891 | Feat: guard de saldo | `_assertSaldoPessoalVinculo()` — chamado em `salvarPessoal` quando `idColaborador` presente; bloqueia se `totalRealizado > totalPrevisto` |
| @891 | Feat: UI orçamento | Card "Controle Orçamentário de Pessoal" abaixo da lista de pessoal: stats (previsto/realizado/saldo/%), tabela por item com badge colaborador + desvio colorido + tooltip com períodos salariais; banner ⛔ quando saldo negativo |
| @891 | Feat: botão Vincular Auto | Botão "Vincular Automaticamente" na barra da aba Pessoal → chama `autoVincularPessoal` com BtnGuard → recarrega lista + painel |
| @891 | Fix: vínculo persistido no salvar | `salvarPessoal` (JS) agora inclui `idColaborador`+`nomeColaborador` lidos do select; `abrirPesModal` restaura o colaborador selecionado ao editar item existente |

### Pendentes / próxima ação
- Testar no browser: (1) vincular automaticamente → verificar painel; (2) editar item com vínculo → colaborador pré-selecionado; (3) tentar vínculo com custo > previsto → deve bloquear com mensagem

---

## HANDOFF ANTERIOR — SESSÃO 51 (2026-06-14) → SESSÃO 51b

### Estado: Deploy @880 · Pessoal: fórmula CLT corrigida + benefícios no perfil + importar colaborador

### O que foi feito nesta sessão (s51)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @880 | Fix: fórmula CLT | `contratos_engine.calcularCustoPessoal()` reescrito: (1) `_getAliquotasEncargos()` lê alíquotas dinâmicas do EncargosEngine sem hardcode; (2) SAT/RAT antes ausente — agora incluído; (3) Sistema S corrigido 6,6%→5,66% dinâmico; (4) Férias: `sal×(1+1/3)/12` (era apenas 1/3); (5) 13°: `sal/12` + inssDecimo separado; (6) resultado bate com planilha de referência (13.489,42/mês vs 12.994,14 antigo) |
| @880 | Feat: benefícios no perfil CLT | `verColab()` exibe seção "Benefícios" para vínculos CLT com cards de VA, VT e Plano de Saúde — desconto de alimentação deduzido; total de benefícios patronais calculado |
| @880 | Feat: importar colaborador no contrato | Modal Pessoal do contrato tem select "Importar de colaborador" que lista todos os colaboradores via `GAS.pessoas.autocomplete()`; ao selecionar, `importarBeneficiosColab()` preenche salário, cargo, VA, VT, desconto VA e plano de saúde via `GAS.pessoas.obter(id)` + recalcula |
| @880 | Fix: labels dinâmicos | Etiqueta de encargos mostra % real calculado (ex: "IV — Encargos (35,7%)"); total mostra "Custo Total (N meses)" com N do campo; breakdown de provisões exibido abaixo do total |

### Pendentes / próxima ação
- Gestão orçamentária de pessoal: contrato deve comparar custo real de colaboradores no período com o montante previsto, gerando alertas de ultrapassagem

---

## HANDOFF ANTERIOR — SESSÃO 50 (2026-06-13) → SESSÃO 51

### Estado: Deploy @863 · Performance — AppCache em 5 módulos + boot TTL 300s

### O que foi feito nesta sessão (s50)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @863 | Perf: boot TTL | `boot_service.gs` TTL 60s → 300s — cold boot a cada 5 min |
| @863 | Perf: Pessoas | AppCache 120s em `ctrl_pessoas_listar` (admin/rh/gestor) e `ctrl_pessoas_metricas`; invalidação em salvar/excluir/mudar_status/desligar |
| @863 | Perf: Tarefas | AppCache 60s em `ctrl_tarefas_listar` (por email) e `ctrl_tarefas_metricas`; invalidação em criar/salvar/mudar_status/excluir |
| @863 | Perf: Balcão | AppCache 60s em `ctrl_balcao_listar` e `ctrl_balcao_metricas`; invalidação em todas as escritas |
| @863 | Perf: Financeiro | AppCache 120s em listar/metricas de fontes, remanejamentos e aditivos; `_invalidarCachesFinanceiro()` em todos os write paths |

### Contexto: data_layer._jsonCache e AcessoService.verificar cache já implementados em sessão anterior (@46b5091)

### Pendentes / próxima ação
- Retomar auditoria de bugs: TAR-04, HUB-13 ou outros abertos

---

## HANDOFF ANTERIOR — SESSÃO 49 (2026-06-13) → SESSÃO 49b

### Estado: Deploy @847 · RH Histórico — Mudança de Setor + cargo na Admissão + ordenação por data

### O que foi feito nesta sessão (s49)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @835 | RH Histórico | Novo tipo `mudanca_setor`: select de setores no form principal e modal secundário; `_EV_CAMPOS`, `_EV_TIPO_LABEL`, `_evSecAtualizarCampos`, `salvarEvento`, `_salvarEventoSec` atualizados; backend `_aplicarEfeitosEvento` atualiza `c.setor` e audita `setorAnterior`/`novoSetor`. |
| @835 | RH Admissão | `admissao:['admissao','cargo']` — campo cargo exibido ao admitir; backend aceita `novoCargo` em eventos de admissão. |
| @835 | RH Ordenação | Histórico ordenado por `ev.data` desc em 3 pontos: `carregarHistorico`, `_recarregarDetEventos`, modal de ficha. |

### Checklist de auditoria — Deploy @835
```
[x] prompt()/confirm() — não usados; sem alert/confirm nativos
[x] GAS.* namespace — sem novos bindings necessários (registrarEvento já existia)
[x] CSS — sem alterações CSS
[x] IDs de DOM — rh-ev-wrap-setor / rh-ev-setor / rh-ev-hint-setor / rh-ev-sec-wrap-setor / rh-ev-sec-setor adicionados consistentemente
[x] FsmGuardian — não aplicável (histórico não tem FSM)
[x] Modais — não aplicável
[x] BtnGuard — sem botões novos; BtnGuard.wrap já cobre rh-btn-salvar-evento e rh-btn-ev-sec-salvar
[x] Datas — ordenação usa string ISO diretamente (localeCompare); sem datas exibidas sem formato
```

### Pendentes / próxima ação
- Testar no browser: selecionar tipo "Mudança de Setor" → select de setores aparece → registrar → ficha do colaborador tem setor atualizado.
- Testar Admissão: campo Cargo aparece → preencher → ficha atualiza.
- Verificar que o histórico exibe do mais recente ao mais antigo pela data do evento.

---

## HANDOFF ANTERIOR — SESSÃO 48 (2026-06-13) → SESSÃO 49

### Estado: Deploy @832 · BI Demográfico — reconstrução SCD por período (todos os campos demográficos)

### O que foi feito nesta sessão (s48)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @832 | BI Demográfico SCD | `_enriquecerComHistorico(regs, ateYM)` — sobrepõe campos planos (genero, racaCor, sexualidade, pcd, pcdTipos, ePaiMae, numFilhos) com valores point-in-time a partir dos arrays SCD. Helpers `_demografiaEmData(historico, campo, ateYM)` e `_entryEmData(historico, ateYM)` para leitura SCD. `_renderizar` e `gerarPersonas` passam `regH` (enriquecido) — todo gráfico e KPI reflete o período filtrado, não os valores atuais. |

### Checklist de auditoria — Deploy @832
```
[x] prompt()/confirm() — não usados
[x] GAS.* namespace — sem novos bindings (só lógica interna BiDemograficoUI)
[x] CSS — sem alterações CSS
[x] IDs de DOM — sem novos IDs
[x] FsmGuardian — não aplicável
[x] Modais — não aplicável
[x] BtnGuard — não aplicável (nenhum botão novo)
[x] Datas — não aplicável (lógica interna de comparação ISO)
```

### Pendentes / próxima ação
- Testar no browser: selecionar período anterior (ex: 2023-01 a 2023-12) e verificar se gráficos de gênero/raça/sexualidade mostram valores históricos distintos dos atuais para colaboradores com histórico de mudança.

---

## HANDOFF ANTERIOR — SESSÃO 47 (2026-06-13) → SESSÃO 48

### Estado: Deploy @831 · BI Demográfico — fix carregamento eterno + SCD PcD/Família no microdado

### O que foi feito nesta sessão (s47)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @831 | BI Demográfico fix | `atualizar(done)` declara parâmetro `done`; `_carregar(onDone)` chama `onDone()` nos 3 ramos (sucesso/erro servidor/erro rede). Backend: `_slimHistorico` no controller + 5 arrays SCD nos microdados (`generoHistorico`, `racaCorHistorico`, `sexualidadeHistorico`, `pcdHistorico`, `paiMaeHistorico`). Labels normalizados via `_biLabel`, filtros mês/ano separados, mapa Nominatim, mediana, cargo histórico, restrições alimentares, pais/mães, PcD. |

### Checklist de auditoria — Deploy @831
```
[x] prompt()/confirm() — não usados
[x] GAS.* namespace — GAS.biDemografico.equipe + .beneficiarios (já existentes)
[x] CSS — sem alterações novas
[x] IDs de DOM — novos IDs bi-dem-* documentados
[x] FsmGuardian — não aplicável
[x] Modais — não aplicável
[x] BtnGuard — done() propagado em iniciarMapa() — carregamento eterno corrigido
[x] Datas — fmtDataPtBR() em toda data exibida; sem ISO cru
```

### Pendentes / próxima ação
- Continuado na sessão 48 (SCD completo)

---

## HANDOFF ANTERIOR — SESSÃO 37 (2026-06-08) → SESSÃO 38 [ATUALIZADO]

### Estado: Deploy @700 · Motor AFD Flexível Fase 5 concluída

### O que foi feito nesta sessão (s37)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @699 | Motor AFD Fases 2-4 (backend) | `afd_layout_repository.gs`, `ponto_bruto_repository.gs`, `afd_parser_engine.gs`, `jornada_repository.gs`, `jornada_engine.gs` (NOVOS). `ponto_repository.gs` + `ponto_controller.gs` + `setup.gs` (MOD). 14 endpoints novos. |
| @700 | Fase 5 — UI importação AFD | `index.html`: 8 novos bindings GAS.ponto; aba "AFD"+"Sessões"; wizard modal 3 passos (arquivo→prévia→resultado); `carregarEspelho` migrado para `espelhoMensal` + tabela dia-a-dia; `carregarSessoes()`. |
| @701 | Ponto — planilha dedicada | `SHEET_ID_PONTO` adicionado a `PROP_SHEETS`; `PONTO: ['Ponto','PontoBruto','PontoImportacoes','Jornadas']` em `SCHEMA_ABAS`; abas removidas de `EQUIPES`; `ABA_PARA_MODULO.PONTO` em `utils.gs`; `ponto_repository`, `ponto_bruto_repository`, `jornada_repository` migrados de `SHEET_ID_EQUIPES` → `SHEET_ID_PONTO` com nomes de aba simplificados. |

### Checklist de auditoria — Fase 5
```
[x] prompt()/confirm() — não usados na Fase 5
[x] GAS.* namespace — 8 novos bindings adicionados (previewAfd, iniciarImportacao, confirmarImportacao, cancelarImportacao, listarLayouts, listarSessoes, espelhoMensal, processarJornada)
[x] CSS — zero classes novas; usa apenas classes existentes do DS
[x] IDs de DOM — modal-importar-afd, modal-afd-box, afd-file-input, afd-layout-sel, afd-nome-arquivo, btn-afd-preview, btn-afd-confirmar — todos únicos
[x] FsmGuardian — não há transições de status na Fase 5
[x] Modais — background:var(--surface); overlay rgba(0,0,0,.52)
[x] BtnGuard — btn-importar-afd, btn-afd-preview, btn-afd-confirmar têm BtnGuard.wrap; navegação pura com data-bg-skip="1"
[x] Datas — fmtDataPtBR() em todas as datas visíveis (espelho + amostra + sessões)
```

### Pendentes / próxima ação
- **Executar no GAS Editor (antes de testar AFD):**
  1. `AfdLayoutRepository.prepararIndice()` — seed layout iDClass
  2. `PontoBrutoRepository.prepararIndice()` — cria abas PontoBruto + PontoImportacoes
  3. `JornadaRepository.prepararIndice()` — cria aba Jornadas
- **Próximas fases AFD:** Fase 6 (editor visual layouts) + Fase 7 (exportações configuráveis)
- **Bugs auditoria pendentes:** TAR-04 (gatilhos automáticos), HUB-13 (dayoff aniversário), FIN-06 (integração Financeiro↔RH)

---

## HANDOFF ANTERIOR — SESSÃO 35 (2026-06-06) → SESSÃO 36

### Estado anterior: ~270 bugs registrados · Deploy @650 (GAS) · Firebase live

### O que foi feito nesta sessão (s35)

| Deploy | Fase | O que foi implementado |
|---|---|---|
| @637 | CAR-08 (auditoria) | Linha dedicada "Setor Solicitante" no modal `carro-det-overlay`; `_verDetalhesAgenda` popula setor separado. |
| @637 | FIN-12 (auditoria) | Histórico com "Ver diff" + restauração de versão (diff modal 7 campos + backup automático + `ContratosEngine.restaurarVersao`). |
| @873 | Manual + Busca IA | `manual.html`: 7 seções reescritas + seção `bi-demografico` criada. Motor de busca 3 camadas: NFD normalize + score ranking + sinônimos + IA Groq→OpenRouter failover silencioso. `manual_controller.gs`: novo `ctrl_manual_buscar_ia`. `index.html`: `GAS.manual.buscarIA`. |
| @638 | CAR-09 (auditoria) | Passageiros separados: internos (select colaboradores + chip tags `_passInternosData`) e externos (texto livre); `passageirosInternos/Externos` no backend; legado `passageiros[]` preservado. |
| @638 | CAR-10 (auditoria) | Paradas intermediárias dinâmicas no form; `rota.paradas[]` persistido; modal de detalhes: ícones dinâmicos Saída→Paradas→Chegada. |
| @641 | CAR-11 (auditoria) | Agenda: dias passados não-clicáveis (sem onclick, opacidade .55, background surface2); `_abrirFormularioDia` guarda com Toast para datas passadas; `_onDataChange` atualiza `min` nos inputs de hora quando data = hoje. |
| @643 | HUB-04/05/09 (auditoria) | HUB-04: empty state Meu Time orientado com CTA. HUB-05: unidade '(h)' movida para label. HUB-09: backend enriquece com nome via `AcessoService.listarUsuarios()` (bulk map); frontend exibe `p.nome` com tooltip email. HUB-01/02/06 verificados e confirmados corretos. |
| @644 | CAR-06/07 (auditoria) | `ctrl_carro_dados` enriquece lista com `solicitanteNome` + `aprovadorNome` via bulk map; frontend: card exibe nome (email no title); aprovador: "Aprovado por: Nome" em vez de "Aprov: prefix". CAR-03/04 verificados corretos. |
| @648 | HUB-10 (auditoria) | `.th-item`: padding alinhado com DS (`12px 16px`), margem `8px`, transition → `var(--fast)`, ícone 32×32; CSS morto `.th-prod-*` removido. |
| @650 | CHV-07 + REU-13 (auditoria) | CHV-07: input hora adicionado ao form de chaves; salvar combina data+hora. REU-13: `NotificationEngine.enviarNotificacaoEncaminhamento` + template; chamado em `adicionarEncaminhamento`. Verificados corretos: TAR-02/ACO-14/ACV-02/BAL-13/SIDEBAR-03. |
| @645 | Feature: click-to-reserve | Agenda: slot vazio → form (hora calculada por Y). Diagrama: área vazia → form (espaço+hora por X). Mapa: clique em `disponivel` → form direto (sem painel lateral). |

### Pendentes / próxima ação
- **Executar no GAS Editor (nesta ordem) — pendentes de sessões anteriores:**
  1. `fase73_estoque_prepararIndice()` — cria abas **ESTOQUE** (não MASTER) + seed dep-01/dep-02
  2. `fase78_inspecionar_ativos_v1()` — confirmar campos ESPACOS.Ativos
  3. `fase78_migrar_ativos_para_estoque()` — migrar bens patrimoniais
- **Próximos bugs de auditoria:** TAR-04 (gatilhos automáticos), HUB-13 (dayoff aniversário)

### Bugs ativos importantes (não corrigidos)
- **FIN-06** (Integração Financeiro↔RH — mudança arquitetural grande, avaliar escopo)
- **CAR-12/13/14** (motorista configurável, voucher Uber, frota — features não implementadas)
- **HUB-11/12/13** (Meu Centro: modelo heterogêneo, aniversariantes, dayoff)
