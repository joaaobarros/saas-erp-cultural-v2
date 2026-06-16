# PROGRESS — ERP Cultural SaaS v2
> **Propósito**: marcador de evolução persistente do projeto. Atualizar a cada sessão de trabalho.
> Permite retomar exatamente de onde paramos sem perda de contexto.

---

## 🔴 REGRAS DE ENTREGA — OBRIGATÓRIO SEGUIR

> **Estas regras se aplicam a toda nova fase ou implementação, sem exceção.**

### 🔴 Sequência obrigatória a cada fase

> **Regra de ouro: Git ANTES do deploy GAS.** O git deve estar sempre igual ou à frente da versão deployada. Nunca deploar código que não está commitado.

```
1. Atualizar PROGRESS.md + roteiro-auditoria.md               ← PRIMEIRO
2. git add <código + docs>
3. git commit -m "fix/feat: Fase X.Y — ..."
4. clasp push
5. clasp deploy (deploymentId fixo)
6. Smoke test no browser
7. git push                                                    ← SEMPRE ao final
```

---

### ✅ Testes em browser a cada fase
Após qualquer nova implementação ou fase concluída, **é obrigatório testar no browser** antes de considerar a entrega completa:

1. **Abrir o link de produção** (ou o webapp do GAS) no browser.
2. **Navegar pelo(s) módulo(s) afetado(s)**: clicar em todos os fluxos relevantes da fase entregue.
3. **Verificar ausência de erros** no console do browser (F12) e nas respostas dos `google.script.run`.
4. **Confirmar as operações CRUD** pertinentes (criar, listar, atualizar, excluir) e verificar persistência nos JSONs/Sheets.
5. **Só fechar a sessão** quando o módulo estiver rodando **sem gargalos, sem erros visíveis e sem comportamentos inesperados**.

> Se qualquer passo falhar → corrigir e repetir o ciclo de teste antes de avançar para a próxima fase.

---

## ⚡ RETOMANDO AGORA? LEIA ISTO PRIMEIRO

**Fase atual (s97)**: **UX/Fix — Financeiro/Contratos: melhorias UI (sessão 2026-06-16): ordenamento rubricas+pessoal — Deploy @999.** Complemento ao s95: rubricas ordenadas alfabeticamente em Plano de Trabalho; pessoal ordenado por cargo/nome. Todos os demais itens do s95 (Cancelado, cores setor, botão Cancelar/Excluir, feedback Execução, bug rubrica) já estavam no deploy @994 da sessão anterior.

**Fase anterior (s96)**: **UX/Fix — Reserva de Veículo: validação de capacidade de passageiros, cards clicáveis, indicador de lotação — Deploy @997.** Backend: `reserva_carro_engine.gs` — valida `qtdInt + qtdExt ≤ capacidade` (busca capacidade do veículo via `VeiculosRepository.buscarPorId`; default 4); `veiculos_repository.gs` — capacidade padrão ajustada de 5 para 4. Frontend (`index.html`): `_atualizarContadorPassageiros()` — atualiza `#carro-f-pass-limite` com aviso colorido de uso/limite ao mudar veículo ou digitar passageiros externos; cards da agenda clicáveis (`_verDetalhesAgenda`) com hover `var(--surface2)`; `event.stopPropagation()` em todos os botões de ação (Aprovar/Recusar/Concluir/Cancelar), link do mapa e coluna de badges para evitar disparo duplo.

**Fase anterior (s95)**: **UX/Fix — Financeiro/Contratos: status Cancelado, cores por setor, ordenamento alfabético, bug de nome de rubrica, feedback visual Execução; Fix canvas Quadros: tela cheia corrigida — Deploy @994.** Backend: `contratos_engine.gs` — `STATUS_CONTRATO.CANCELADO` adicionado; FSM: Ativo/Suspenso → Cancelado; `excluir()` aceita Encerrado ou Cancelado; filtro de integração `listarParaVinculo` corrigido de `'encerrado'` (lowercase errado) para `STATUS_CONTRATO.ENCERRADO`; `obterMetricas()` conta `cancelados`. Frontend (`index.html`): (1) `_badgeStatus` — badge vermelho para Cancelado; filtro select inclui opção Cancelado; botão "Cancelar" (vermelho, distinção semântica de Encerrar/amarelo) e "Excluir" (só para terminais); `abrirModalStatus` unificado via mapa `_ACOES`; lista ordenada alfabeticamente; (2) `_badgeSetor` — paleta de 10 cores por hash do id, sem ícone `apartment`; CSS `.badge-setor` sem cor fixa + `.exec-agrup.ativa` com cor primária; (3) Execução: botões agrupamento têm feedback visual ao ativar; (4) Rubricas ordenadas alfabeticamente no PT; pessoal ordenado por cargo/nome; (5) `editarRub` — match por `catalogoItemId` (evita trocar nome por coincidência de codigoSeplag); `salvarRubrica` persiste `catalogoItemId`.

**Fase anterior (s94b)**: **Fix — Datas Comemorativas: sempre exibe todas as datas pré-cadastradas (merge defaults + JSON) — Deploy @993.** `config_admin_service.gs`: (1) `_lerDatasComemorativasJSON` agora retorna array mesmo vazio (antes pulava se vazio); (2) nova `_mergeComDefaults(jsonLista)` — defaults sempre presentes, JSON sobrepõe campos editados e flag `ativo`, custom dates acrescentadas no fim; (3) `getDatasComemorativas()` e `listarDatasComemorativas()` usam `_mergeComDefaults`; (4) nova `toggleDataComemorativa(id, ativo)` — grava apenas `ativo` no JSON, adiciona o registro do default se ainda não havia; `excluirDataComemorativa` delegada ao toggle(false). `admin_controller.gs`: `ctrl_admin_toggleDataComemorativa`. `index.html`: binding `GAS.admin.toggleDataComemorativa`; `_renderLista` substitui botões excluir/restaurar por ícone `toggle_on` (roxo)/`toggle_off` (cinza); nova `DatasComemorativasAdmin.toggle(id, novoAtivo, btn)`.

**Fase anterior (s94)**: **Feat — Datas Comemorativas: toggle ativo/inativo; Contratos: status Cancelado com FSM e badge — Deploy @992.**

**Fase anterior (s93)**: **Feat — Datas Comemorativas: bairros (Bom Jardim, Canindezinho), CCBJ 20 anos, arte e cultura (16 datas) — Deploy @991.** `index.html`: (1) 4 novas classes CSS — `.dc-bairro` (verde terroso), `.dc-ccbj` (roxo CCBJ), `.dc-cultura` (laranja cálido), `.dc-sao-joao` (amarelo/âmbar festivo); (2) `_DATAS_COMEMORATIVAS` expandida de 19 para 35 datas — bairros: Bom Jardim 24/3, Canindezinho 4/10; CCBJ: 19/12 com label dinâmico `X anos` (`getFullYear()-2006`); arte e cultura: Teatro 27/3, Livro 23/4, Dança 29/4, Museus 18/5, Santo Antônio 13/6, São João 24/6, Patrimônio 17/8, Folclore 22/8, Cultura BR 5/11, Música 22/11, Samba 2/12, Forró 13/12; (3) `_DC_MOTION_CLS` + admin `_MOTION_CLS` atualizados com 4 novos motions; (4) `_MOTIONS` no painel admin expandido com 4 novas opções; (5) `_lancarParticulas` com 4 novos branches — `sao_joao` (confete amarelo/laranja subindo), `bairro` (confete terroso/verde caindo), `ccbj_20anos` (confete roxo + badge "CCBJ · X anos" no centro da tela), `cultura` (emojis culturais flutuantes + partículas laranja). `config_admin_service.gs`: `_DATAS_COMEMORATIVAS_DEFAULT` expandido de 19 para 35 datas (16 novas) nos mesmos grupos. **Nota:** Granja Lisboa, Granja Portugal e Siqueira sem data específica conhecida — não adicionados, aguardar confirmação do usuário.

**Fase anterior (s92)**: **Feat — Datas Comemorativas: calendário expandido com diversidade e direitos humanos; animação Papai Noel no Natal — Deploy @987.** `index.html`: (1) 10 novas datas — Mulheres (8/3), Indígenas BR (19/4), Abolição BR (13/5), Dia da África (25/5), LGBTQIA+ (28/6), Indígenas ONU (9/8), Consciência Negra (20/11), Eliminação Violência contra Mulheres (25/11), Direitos Humanos (10/12) + Reveillon; `_DATAS_COMEMORATIVAS` agora usa campo `id` (alinhado com backend); (2) 5 novas classes CSS — `.dc-consciencia`, `.dc-africa`, `.dc-indigena`, `.dc-mulheres`, `.dc-arco-iris`; (3) novo motion `papai_noel` em `_DC_MOTION_CLS` — neve de fundo (70 flocos) + Papai Noel emoji (`🦌🦌🦌🎅🛷`) atravessando a tela com animação de balançar; Natal migrado de `motion:'neve'` para `motion:'papai_noel'`. `config_admin_service.gs`: `_DATAS_COMEMORATIVAS_DEFAULT` expandido de 10 para 19 datas, organizadas em 4 grupos (Cívicas, Negritude/Diáspora, Povos Originários, Direitos Humanos).

**Fase anterior (s91)**: **Feat — Vestuário/Uniformes: campos camiseta + calça + calçado no form RH e Meu Perfil — Deploy @982.** `index.html`: (1) form RH (`RhUI`) — seção "Vestuário / Uniformes" com grid 1fr 1fr 1fr para Camiseta (PP–XG), Calça (34–56) e Calçado (33–47); botão `?` aciona guia atualizado com 3 tabelas (medidas busto/cintura/quadril para camiseta, cintura/quadril/entreperna para calça e comprimento do pé para calçado); form loading popula os 3 campos; form collection coleta `tamanhoCalca` e `tamanhoCalcado`; `_abrirGuiaTamanhos` exposta no return do RhUI; (2) Meu Perfil (`PerfilUI`) — novo card "Vestuário / Uniformes" com os mesmos 3 selects (`p-tamanho-vestiario`, `p-tamanho-calca`, `p-tamanho-calcado`), botão "Guia de tamanhos", loading e saving completos. Backend: `colaborador_repository.gs` — `tamanhoVestiario`, `tamanhoCalca` e `tamanhoCalcado` adicionados a `_CAMPOS_PROTEGIDOS`.

**Fase anterior (s90)**: **Feat — Datas Comemorativas: painel admin com CRUD completo, motions configuráveis e carregamento dinâmico na home — Deploy @980.** Backend: `config_admin_service.gs` — `_DATAS_COMEMORATIVAS_DEFAULT` (10 datas pré-cadastradas), `getDatasComemorativas()` (público, sem auth), `listarDatasComemorativas()` (admin, inclui inativas), `salvarDataComemorativa()` e `excluirDataComemorativa()` com seed automático do JSON. `admin_controller.gs` — `ctrl_home_datasComemorativas()` (público), `ctrl_admin_listarDatasComemorativas/salvar/excluir()`. Frontend (`index.html`): nova tab "Datas Comemorativas" em Administração; `DatasComemorativasAdmin` IIFE com lista agrupada por mês, modal de criação/edição com preview ao vivo, seletor de motion (fogos/neve/corações/estrelas/ouro/verde_amarelo), campo emoji, restauração de datas inativas; `GAS.admin.listarDatasComemorativas/salvar/excluir` + `GAS.home.datasComemorativas` adicionados; `_renderDataComemorativa` suporta tanto formato legado (`cls`+`particulas`) quanto servidor (`motion`); `_DC_MOTION_CLS` mapeia motion→classe CSS; home carrega lista do servidor assincronamente e re-renderiza se hoje corresponde a data customizada; CSS `dc-custom` adicionado.

**Fase anterior (s89b)**: **Fix — BI Demográfico: remove rótulo "★ epicentro" do tooltip de bairros; diferenciação visual por cor (âmbar) é suficiente.** `_tooltipBairro` simplificado (parâmetro `epicentro` removido); duas chamadas `.bindTooltip` atualizadas.

**Fase anterior (s89)**: **UX — BI Demográfico: mapa de calor visível, bairros com paleta fria, epicentro CCBJ destacado, Pais/Mães separados por gênero, Restrições Alimentares com cards expandíveis — Deploy @978.** `index.html/BiDemograficoUI`: (1) `_renderCalor` — `radius:45`, `minOpacity:0.55`, gradiente começa em `0.0` para pontos visíveis mesmo esparsos; (2) `_renderBairros` — paleta fria (azul escuro→claro) substitui cores quentes; constante `_EPICENTRO` com os 5 bairros do Grande Bom Jardim (Bom Jardim, Canindezinho, Siqueira, Granja Lisboa, Granja Portugal) recebem cor âmbar `#f59e0b` e borda `#92400e` com tooltip "★ epicentro"; (3) `_renderFamilias` — dois cards lado a lado "Pais" (azul) / "Mães" (rosa) usando `r.genero.indexOf('homem'/'mulher')` para discriminar, linha extra para outros gêneros; (4) `_renderRestricoes` — cards expandíveis por tipo com ícone Material, badge de contagem, lista de pessoas com campo "Obs:" quando `restricoesOutro` preenchido.

**Fase anterior (s88)**: **Feat — Indicadores de Contrato: campos mensais expandidos, trimestres calculados, vínculo Ação→Indicador com recálculo automático — Deploy @974 (pendente).** Backend: `contratos_engine.gs` — `_gerarTrimestres` soma `realizado` dos meses; `recalcularRealizadoDeAcoes(idContrato,idMeta,idIndicador,orgId)` recomputa `meses[].realizado` de todas as Ações vinculadas não-canceladas; `listarParaVinculo(orgId)` expõe contratos ativos para cascata no form. `contratos_controller.gs` — `ctrl_contratos_para_vinculo`, `ctrl_contratos_recalcular_realizado`. `acao_engine.gs` — campos `vinculo{}` e `quantitativoRealizado` no schema; `_recalcularVinculo()` dispara recálculo no indicador antigo e novo ao salvar/atualizar; `mudarStatus` dispara recálculo ao cancelar. `integracao_orquestrador.gs` — `onAcaoConcluida` recalcula indicador vinculado. `events_constants.gs` — `ACTION_INDICATOR_LINKED`. Frontend (`index.html`): `.ind-mes-input` 48px→62px; badges `ind-pct-*` coloridos (verde/amarelo/vermelho); `_renderGradeMeses` reescrito — trimestres em tempo real via DOM; linha `% Cump.` por mês e Q; botão "sync" por indicador → `_recalcularInd`; form Ação ganha checkbox "Vincular a indicador" com cascata Contrato→Meta→Indicador e campo `quantitativoRealizado`; `AcoesUI._toggleVinculo/_onVinculoContratoChange/_onVinculoMetaChange/_preencherVinculoForm` expostos no return; `ContratosDetailUI._recalcularInd` exposto no return.

**Fase anterior (s87)**: **UX — Financeiro/Contratos/Execução: execução orçamentária hierárquica com agrupamento por Meta/Atividade/Setor/Rubrica e filtros — Deploy @973.** `index.html`: tab Execução redesenhada — barra de agrupamento (Meta/Atividade/Setor/Rubrica) + filtros (meta, setor, custeio/investimento); `carregarExecucao` reescrita: carrega apenas solicitações (contrato disponível em `_obj`); `_execCollect` monta lista plana de rubricas com context meta+atividade; `_execHtml_Meta` renderiza hierarquia colapsável Meta › Atividade › Rubrica; `_execHtml_Grupo` agrupa por atividade ou setor; `_execHtml_Flat` view plana com breadcrumb; todas as views mostram Previsto/Comprometido/Executado/Saldo + barra de % comprometido com cores semafóricas.

**Fase anterior (s86)**: **UX — Financeiro/Contratos: drag & drop de atividades, setor na rubrica, barras de utilização orçamentária — Deploy @972.** `contratos_engine.gs`: nova função `reordenarAtividades`. `contratos_controller.gs`: novo endpoint `ctrl_contratos_reordenar_atividades`. `index.html`: (1) DnD de atividades dentro de cada meta (_dndAtvStart/Over/End/Drop); (2) campo Setor movido da memória de cálculo para a rubrica (form + salvar + render); (3) barras de progresso utilizado/disponível (totalComprometido+totalExecutado) em rubrica, atividade e meta; (4) memória de cálculo: coluna Setor removida da tabela; (5) _verMemoria: nota "As linhas são memória de cálculo — saldo total usável livremente dentro da rubrica". GAS.contratos.reordenarAtividades binding adicionado.

**Fase anterior (s85b)**: **Fix — SyntaxError "Unexpected identifier 'é'": linha de comentário quebrada em `_sincronizarSetorComUsuario` causava crash de página — Deploy @971.** Linha `// Usuário ainda não foi aprovado ou vincul` seguida de `ado - isso é normal` foi mesclada em uma única linha de comentário. Bug introduzido no commit d1a816e (s85). Nenhuma mudança de comportamento.

**Fase anterior (s85)**: **Feat — CIs adaptados ao sistema: bolsistas, lanche/transporte/gráfica, cachê/professor — Deploy @970.** `solicitacao_engine.gs`: `NATUREZA_CONTRATACAO` expandido; `GRUPO_NATUREZA_CI` adicionado; `_docObrigatoriosPorTipo('bolsa')` atualizado; `salvar()` normaliza sub-objetos CI (`bolsistas[]`, `lanche{}`, `transporte{}`, `grafica{}`, `cache{}`, `professor{}`, `credor{}` com pronome/PcD/MEI). `solicitacao_repository.gs`: `_HEADERS` 22→28 colunas. `index.html`: select reestruturado com optgroups; seções condicionais por CI; tabelas dinâmicas de bolsistas e itens gráfica.

**Fase anterior (s84)**: **Docs — Correção de escopo do s83e: badge setor já cobre 34 pontos (não apenas Admin+Ponto).** Commit 211bc25 (s83e) já incluiu a cobertura completa — Tarefas, Colaboradores, Contratos, Admin, Veículos, Almoxarifado, Demandas, Solicitações, Reservas, Ponto, Equipe/RH, BI Demográfico, Aniversariantes — mas o PROGRESS.md e roteiro-auditoria.md descreviam apenas "Admin aprovação + PontoUI individual". Esta sessão apenas corrige a documentação; código GAS inalterado, deploy permanece @962.

**Fase anterior (s83e)**: **UX — Setor como badge em Admin (aprovação) e PontoUI individual — Deploy @962.** `IdentidadeAdmin`: modal aprovação de acesso exibe `setorDesejado` como `_badgeSetor`. `PontoUI`: cabeçalho "Individual" mostra badge do setor filtrado em vez de texto cru.

**Fase anterior (s83d)**: **UX — Setor como badge visual em Ponto, RH e BI Demográfico — Deploy @961.** `index.html`: todas as ocorrências de `_esc(_labelSetor(x.setor)||...)` substituídas por `_badgeSetor(x.setor)` nos módulos PontoUI (métricas por setor, header filtrado, cards de desvio, tabela de colaboradores), RhUI (tabela Equipe, painel colaborador, histórico de eventos, alertas de férias, calc rescisão, custo por colaborador) e BiDemograficoUI (drill-down de colaboradores). Também adicionada variável `mesNomeFiltro` para exibir badge do setor no título do relatório de ponto.

**Fase anterior (s83c)**: **UX — Férias por Período: substituída tabela por cards colapsáveis idênticos ao painel colaborador.** `carregarFeriasUnificado` (modo com colaborador): cada período agora renderizado como card com borda colorida por status (igual ao `_renderPer` do painel); header colapsável com badge + botão Solicitar; expand mostra grid datas aquisitivo/concessivo + barra de progresso + descrição + cards OFICIAL (azul) / ACORDO INTERNO (roxo) com botões de ação. Remoção de `carregarPeriodosFerias` antiga (função duplicada morta com SC/SL).

**Fase anterior (s83b)**: **Feat — UX Home: datas comemorativas com partículas/animações, nomeApelido no boot e aniversariantes com setorLabel (commit de sincronização — já estava no GAS).**

**Fase anterior (s83)**: **Feat — BI unificado: Dashboard vira Central de Inteligência com sub-abas BI Operacional/Financeiro/Estratégico/Demográfico; cards clicáveis navegam para módulos relevantes; BI Demográfico com drill-down interativo por gênero, raça, faixa etária, setor, cargo e tempo de atuação — Deploy @959.**

**Fase anterior (s82b)**: **Fix — Férias: vencido com retorno acordado não incorre em pagamento em dobro — Deploy @956.** Painel colaborador (`_renderPer`): detecta `f.acordo.diasEfetivosGozados > 0`; neste caso saldo exibido em roxo "dias de retorno acordados — sem incidência de dobro"; `cfg.desc` e cor ajustados. `carregarFeriasUnificado` expand: calcula `diasRetorno` para férias oficiais com acordo de retorno; alerta vermelho só aparece se `diasSemCoberta > 0`; quando saldo inteiramente coberto por acordo exibe banner roxo (handshake).

**Fase anterior (s82)**: **Fix+Feat — Aniversariantes: bug diff data (meia-noite) + banner home boas-vindas personalizado (aniversário, primeiro acesso, retorno férias/afastamento) — Deploy @955.** `taskhub_controller.gs`: `ctrl_taskhub_aniversariantes` corrigido — comparação de diff agora usa `hoje0` (meia-noite) em vez de horário atual, eliminando exclusão de aniversariantes do dia atual; `ehHoje` comparado por dia/mês direto. Nova função `ctrl_taskhub_contexto_pessoal`: detecta 4 tipos de evento para o usuário logado — aniversário hoje, primeiro acesso (admissão/cadastro nos últimos 7 dias), retorno de férias (dataFim ontem ou hoje), retorno de afastamento (dataFim ontem ou hoje). `index.html`: `GAS.taskhub.contextoPessoal` binding; CSS `#home-banner.banner-aniversario` (roxo), `.banner-boas-vindas` (verde/azul), `.banner-retorno` (ciano); `_renderizarHome` chama `contextoPessoal` e atualiza título, subtítulo, ícone e classe do banner; `_renderHomeAdmin` corrigido para também chamar `_renderHomeAniversariantes()` (antes visível apenas para colaboradores/gestores).

**Fase anterior (s81)**: **UX — Férias: carregarFeriasUnificado: férias do mês quando sem colaborador + expand rows com cards OFICIAL/ACORDO — Deploy @950.** `index.html/carregarFeriasUnificado`: modo sem colaborador agora filtra para exibir apenas as férias em curso no mês atual (ini≤anoMes && fim≥anoMes), com cabeçalho "Férias em curso em [Mês Ano]". Expand rows das linhas de período substituído por cards com borda colorida: ACORDO INTERNO (roxo, aviso "não incide pagamento em dobro") e OFICIAL (azul, com inset roxo se há acordo vinculado). Período vencido com saldo > 0 exibe banner vermelho "X dias não cobertos — sujeitos a pagamento em dobro (CLT art. 137)" + nota verde se há dias cobertos por acordos.

**Fase anterior (s80)**: **Fix — QuadrosRepository: renomear snapshotTldraw→snapshot, adicionar reuniaoId + colaboradores — Deploy @949.** `quadros_repository.gs`: campo `snapshotTldraw` renomeado para `snapshot` (sem quebra de dados — campo anterior nulo na maioria dos registros); `listar()` inclui `reuniaoId`, `colaboradores`, `atualizadoPor` na projeção; filtro `filtros.reuniaoId` adicionado; `salvar()` persiste `reuniaoId`, `colaboradores` e `snapshot`.

**Fase anterior (s79)**: **UX — Férias: form "Solicitar" período-consciente + forms Oficial e Acordo separados — Deploy @948.** `abrirFormFerias(idColabPre, periodoNum, concIni, concFim)`: novo assinatura com período opcional; quando periodoNum fornecido exibe banner azul "Nº período — janela DD/MM → DD/MM", aplica min/max nas datas, passa `periodoAquisitivoNum` no dados; sempre tipo=oficial (dropdown Tipo removido). Nota inline orienta para usar o botão "Acordo" após aprovação em vez de registrar acordo direto. `_enviarFerias`: removida lógica nao_oficial, adicionado campo `periodoAquisitivoNum`. `_feriasCalcDias`: substitui `_feriasCalcSaldo` (simplificado, sem campo gozados). Botão "Solicitar" nas rows de período passa `periodoNum + concIni + concFim` como argumento.

**Fase anterior (s78)**: **UX — Férias: tabela unificada com collapse/expand na aba RH + painel colaborador totalmente redesenhado — Deploy @943.** (1) Aba RH/Férias: dois cards (Períodos Aquisitivos + Férias) fundidos em um único com select colaborador + filtro status. Quando colaborador selecionado: tabela de períodos com linhas expansíveis (chevron toggle); cada período expande sub-tabela com registros de férias, tipo, acordo e botões de ação. Quando "todos": lista plana com coluna Acordo. (2) Painel colaborador (`_abrirDetalhesColab`): seção Férias redesenhada com cards coloridos por status (borda esquerda colorida + fundo tintado), expand/collapse por período (padrão: aberto se tem registros), max 4 períodos + "Ver mais". Terminologia clara: "Em aquisição" / "Disponível para gozo" / "Prazo legal expirado (CLT art. 137)" / "Férias integralmente gozadas". Registros individuais com badge colorido com borda "Realizada/Aprovada/Pendente" em vez de "Concluído". Novos helpers: `_detFerToggle`, `_detFerVerMais`, `_urgenciaFeriasInfo`, `_acoesFeriasBtns`, `_tipoBadgeFer`, `_acordoHtml`.

**Fase anterior (s77)**: **UX — Painel do colaborador: seção Férias agora exibe períodos aquisitivos/concessivos + saldo + acordos negociados — Deploy @942.** `index.html / _abrirDetalhesColab`: substituído `GAS.rh.listarFerias` (lista plana) por `GAS.rh.resumoFeriasColaborador` (resumo por período). Cada período mostra: nº do período, badge de status (em aquisição/em concessão/vencido/gozado), datas aquisitivas + concessivas, barra de progresso com dias gozados/saldo, e registros de férias com acordos negociados em roxo.

**Fase anterior (s76)**: **Feat — Férias: inversão de ordem das tabelas (Períodos Aquisitivos primeiro), dropdown de colaborador compartilhado entre as duas tabelas, exclusão de registro de férias restrita a superadmin — Deploy @941.**

**Fase anterior (s75b)**: **Fix — Férias: período matching usando janela concessiva disjunta (elimina dupla contagem); alertasFeriasAtivos usa saldo real via resumoFeriasPorPeriodo; botão "Solicitar" na tabela de períodos para em_concessao/vencido com saldo > 0 — Deploy @940.**

**Fase anterior (s75)**: **Fix+Feat — Férias: bug crítico `hoje` undefined em `resumoFeriasPorPeriodo`, botão Concluir direto, edição de datas, cancelamento restrito, notificações por email, auto-conclusão por trigger — Deploy @938.** `pessoas_engine.gs`: corrigido `ReferenceError: hoje is not defined` em `resumoFeriasPorPeriodo` (causava falha em toda a seção de Períodos para colaboradores com férias aprovadas); adicionadas funções de email `_emailsRH/_enviarEmailFerias/_notificarRH*/_notificarColab*/_notificarMudanca*`; nova função `editarFerias` (valida status=pendente + início futuro); nova `autoConcluirFeriasVencidas` + `_listarOrgIds`. `event_handler_registry.gs`: `autoConcluirFeriasVencidas()` global + `criarTriggerAutoConcluirFerias()` (trigger diário 12h). `pessoas_controller.gs`: `ctrl_rh_editar_ferias`. `index.html`: lista ordenada mais recente primeiro; botões Concluir/Editar/Cancelar com restrições; GAS.rh.editarFerias; modal de edição de datas; fix setor com label legível na rescisão. **Pós-deploy: executar `criarTriggerAutoConcluirFerias()` uma vez no GAS Editor.**

**Fase anterior (s74)**: **Infra — Planilha COLABORACAO dedicada para TLDraw/DocSharing (sem deploy frontend).** `setup.gs`: `PROP_SHEETS.COLABORACAO='SHEET_ID_COLABORACAO'`; `SCHEMA_ABAS.COLABORACAO=['Quadros','DocumentosCompartilhados']`; `'Quadros'` removido de `SCHEMA_ABAS.ACOES`; `'DocumentosCompartilhados'` removido de `SCHEMA_ABAS.MASTER`; função `fase_colaboracao_provisionar()` cria planilha, prepara abas e migra linhas de índice de ACOES.Quadros → COLABORACAO.Quadros e MASTER.DocumentosCompartilhados → COLABORACAO.DocumentosCompartilhados (Drive JSON canônico intacto). `quadros_repository.gs`: 3× `SHEET_ID_ACOES` → `SHEET_ID_COLABORACAO`. `document_sharing_service.gs`: 3× `SHEET_ID_MASTER` → `SHEET_ID_COLABORACAO`. **Pós-deploy: executar `fase_colaboracao_provisionar()` uma vez no GAS Editor.**

**Fase anterior**: **Feat — Quadros: editor de canvas nativo HTML5 (substitui fallback TLDraw) — Deploy @930+.** `QuadrosUI._iniciarEditor`: substituído o placeholder "TLDraw indisponível" por editor HTML5 Canvas completo que roda 100% dentro do GAS. Ferramentas: Lápis (suavizado com `quadraticCurveTo`), Retângulo, Círculo/Elipse, Texto (via `_modalInput`), Borracha (remove shapes por proximidade). Toolbar com color picker, range de espessura, Desfazer e Limpar. Snapshot `{shapes, version:1}` salvo no GAS. `ResizeObserver` para reflow. Suporte a toque. `_setTool/_undo/_clearCanvas` expostos no return.

**Fase anterior**: **Feat — 7 features open source no frontend: BulkBar, Timeline, TaskHub inline, Quadros/TLDraw, Sessões Interativas, DocSharing — Deploy @929.** `gas/src/frontend/index.html` (41989 linhas): (A) CSS: `.bulk-check`, `.bulk-bar`, `.timeline-item`, `.quadro-card`, `.sess-card`, `.hub-inline-btn`; (B) GAS bindings: `GAS.tarefas.bulkConcluir/bulkCancelar`, `GAS.auditoria.timeline`, `GAS.quadros.*`, `GAS.sessao.*`, `GAS.docSharing.*`; (C) Shared helpers: `BulkBar` IIFE + `_renderTimeline()`; (D) `TarefasUI._renderLista`: checkbox em cada tf-card + `BulkBar.init` com ações "Concluir/Cancelar selecionadas"; (E) `BalcaoUI._renderLista`: checkbox em cada bl-card; (F) `TaskHubUI._renderItem`: botões inline Concluir/Marcar feito/Registrar devolução + funções `_concluirTarefa`, `_marcarEnc`, `_devolverChave`; (G) `QuadrosUI` IIFE: lista/CRUD de canvases com editor TLDraw (+ fallback gracioso); `SessaoUI` IIFE: criar/ativar/avançar/encerrar sessões + painel host com poll 2s + QR code; (H) DocSharing: botão "Compartilhar ↗" na aba Ata das Reuniões (`ReunioesUI.compartilharAta`), botão "Compartilhar relatório" em AcoesUI painel Geral (`compartilharRelatorio`); (I) `AcoesUI._abrirTab('geral')`: lazy-load de `_carregarTimelineAcao` → `_renderTimeline` no `#painel-aco-timeline`; (J) Views: `#view-quadros` e `#view-sessoes` com seus modais e painel host; `_MODULOS_MENU`: "Quadros" e "Sessões Interativas" adicionados na seção OPERACIONAL; `Router.registrar` via menu builder.

**Fase anterior**: **Feat — Drag-and-drop para reordenar níveis no modal "Gerenciar Níveis do Mapa" — Deploy @926+.** `index.html / InfraConfigMapaUI`: nova função `_initNiveisDragDrop(overlay)` com event delegation no `<tbody id="cfg-niveis-tbody">`. Cada `<tr>` tem `draggable="true"` e alça `⠿` como primeira coluna. No `drop`: sincroniza inputs → reordena `overlay._niveisEdit` → re-renderiza tbody via `_rowHtml`. A flag `tbody._dragInited` evita listener duplicado quando `_abrirModalNiveis` é chamada repetidamente (add/remove). Linhas novas adicionadas por `_modalNivelAdicionar` cobertas pela delegation sem rebind. `_sincronizarInputs` preserva edições de texto/número feitas antes do drag.

**Fase anterior**: **Feat — Dimensões em tempo real nos editores de mapa (infraestrutura e ações) — Deploy @925.** HUD flutuante (`position:fixed`, `pointer-events:none`, aparece só durante drag de resize, some no `mouseup`) adicionado em 3 editores: `mapa_acao_editor.html` (`MapaAcaoEditorUI`) — usa `_escala.pixPorM`; mostra `Lm × Am` em resize single (rect/polígono + círculo) e multi-resize (bbox do grupo); `mapa_editor.html` (`MapaEditorUI`) — novo parâmetro `escala` em `abrir()`, HUD ativo quando escala passada; `index.html / InfraConfigMapaUI` — usa `_escalaInfra.pixPorM`, chamado após `_resizeInline`. `InfraConfigMapaUI.getEscala()` exposto e passado de `EspacosUI._editarMapa()` → `MapaEditorUI.abrir()`. HUD limpo em `_onMouseUp`, `fechar()` e `_voltar()`.

**Fase anterior**: **Fix — Férias/Rescisão: saldoOficial sem acordos + Encargos: botão "Aplicar tabela" travado eternamente — Deploy @920+.** (1) `pessoas_engine.gs/resumoFeriasPorPeriodo`: adicionado `saldoOficial` (sempre usa datas oficiais `dataInicio`/`dataFim`, ignora `acordo.diasEfetivosGozados`). Frontend de rescisão usa `p.saldoOficial` com fallback para `p.saldo`. (2) `index.html/EncargosUI.aplicarOficial`: parâmetro `done` do BtnGuard chamado imediatamente ao abrir modal — elimina travamento eterno.

**Fase anterior**: **Fix — Encargos: restaurarOficial ignora salarioMinimo (campo de topo vs aliquotas) — Deploy @920+.** `encargos_repository.restaurarOficial`: `salarioMinimo` vive em `doc.salarioMinimo`, não em `doc.aliquotas`; função só percorria `doc.aliquotas[chave]`, retornando silenciosamente sem salvar nada. Adicionado branch `if (chave === 'salarioMinimo')` que usa `_buildDocOficial` para obter o valor oficial do ano ativo e substitui `doc.salarioMinimo` integralmente mantendo `fonte:'oficial'`.

**Fase anterior (2)**: **Fix — Encargos: modal não fecha antes da resposta GAS + feedback de carregamento — Deploy @919.** `_confirmarRestaurar`, `_confirmarRestaurarSalMin` e `_confirmarAplicarOficial` agora travam o botão "Confirmar" com texto de loading ("Restaurando…"/"Aplicando…") e só fecham o modal no callback da resposta, eliminando o intervalo sem feedback entre clicar e receber a resposta do servidor.

**Fase anterior**: **Fix — Encargos: Sistema S 5,66% → 5,81% + backfill automático de alíquotas + TypeError confirmar restaurar — Deploy @917.** `encargos_engine.gs` + `encargos_repository.gs` + `holerite_engine.gs` + `ponto_engine.gs` + `contratos_engine.gs`: alíquota Sistema S corrigida de 0.0566 para 0.0581 (5,81% = SESC 1,5% + SENAC 1% + SEBRAE 0,6% + INCRA 0,2% + SENAT 0,2% + SEST 0,2% + SENAR 0,1%). `encargos_repository.gs`: nova função `_preencherAliquotasAusentes` faz backfill em memória de campos ausentes no JSON sem persistir (garante compatibilidade ao adicionar novas alíquotas). `editarAliquota` aceita parâmetro `novaUnidade` (permite trocar percentual↔reais). Frontend `index.html`: TypeError `Cannot read properties of null (reading 'remove')` ao confirmar restaurar salário mínimo/alíquota corrigido — substituição do seletor frágil `[style*="z-index:3000"]` por classe estável `.enc-modal-overlay` em 6 pontos dentro de EncargosUI.

**Fase anterior**: **Fix — FsmGuardian.validarTransicao inexistente → assertValida em 6 engines — Deploy @909+.** `FsmGuardian.validarTransicao()` nunca existiu no serviço (API real: `assertValida`). Erro aparecia ao encerrar contrato, mudar status de aditivo, fonte de recurso, remanejamento, contratado e solicitação. Corrigido em: `contratos_engine.gs`, `remanejamento_engine.gs`, `aditivo_engine.gs`, `fonte_recurso_engine.gs`, `contratado_engine.gs`, `solicitacao_engine.gs`.

**Fase anterior**: **Fix — Pessoal/Rescisão: recomputa provisões ao ler contrato + rescisão sem benefícios — Deploy @909.** `contratos_engine.buscarPorId`: recomputa todos os itens de pessoal via `calcularCustoPessoal` ao ler (elimina valores cacheados com fórmula antiga de provisões: férias×4/3/12 + 13°/12 + inssDecimo). Financeiro/Pessoal exibirá provisões corretas (1.479,28 em vez de 1.970,02). Rescisão: custo mensal revertido para salário + encargos + provisões sem benefícios.

**Fase anterior**: **Fix — Rescisão: custo mensal calculado com benefícios reais via calcularPessoal — Deploy @903.** Campo "Custo mensal total" substituiu estimativa `salario×1,55` por chamada real a `GAS.contratos.calcularPessoal` com VT, VA, PS do colaborador; breakdown mostra salário + encargos + provisões + benefícios = total; nota explica que benefícios contam no break-even mas não entram na rescisão; fallback silencioso se endpoint falhar.

**Fase anterior**: **Fix — Rescisão: aviso de férias vencidas só aparece ao ultrapassar prazo legal + ícones Material Symbols — Deploy @902.** Info de férias só mostra mensagem quando `totalDobro > 0`; texto sem jargão técnico ("API", "Período N"); ícones emoji substituídos por `<span class="ms ms-sm">warning/report/error/info</span>` em toda a área de férias vencidas (rescisão, tabela de períodos e alertas). Fallback silencioso quando dados indisponíveis.

**Fase anterior**: **Feat — Folha: Rescisão movida para Folha (sub-painel) + PS breakdown no verColab e holerite — Deploy @900.** `holerite_engine.gs`: objeto holerite agora expõe `psBruto`, `psDescEmpregado`, `psEmpresa` separadamente. `index.html`: (1) Aba "Rescisão" removida do nav principal; conteúdo movido para `rh-folha-painel-rescisao` dentro da aba Folha; novo botão "Rescisão" no sub-nav de Folha; `setSubAbaFolha('rescisao')` popula select de colaboradores; `setTab('rescisao')` redireciona para Folha→Rescisão. (2) `verColab` mostra PS com 3 linhas: total do plano, desconto do funcionário (k×%), custo empresa (k−l). (3) Holerite: seção "Benefícios" expandida com breakdown PS (total → desc. funcionário → custo empresa). (4) `_descPSPercCache` carregado de EncargosEngine em `aoAbrir()` para garantir percentual correto.

**Fase anterior**: **Feat — Encargos: BSF, Desconto PS e Encargos Férias editáveis via RH → Encargos — Deploy @897.** `encargos_repository.gs`: 3 novos itens em `aliquotas` (beneficioSocialFamiliar R$23/reais; descontoPlanoSaudePerc 30%; encargosProvisaoFeriasPerc 35%); `obterAliquotasEfetivas()` retorna os 3. `encargos_engine.gs`: expõe os 3 campos. `contratos_engine.gs`: helpers lêem de EncargosEngine (não mais config_org.json). `index.html`: `_CHAVE_LABEL` com 3 novas entradas; render formata R$ vs %; modal editar com label/input correto por unidade. Editáveis em RH → Encargos → ✏ Editar.

**Fase anterior**: **Feat — Rescisão: consolidado de holerites + break-even com dias + férias em dobro (CLT 137) + alertas visuais de férias + emails automáticos semanais — Deploy @896.**
`ponto_engine.gs`: (1) `calcularRescisao` separou `diasFV_dobro` (vencido, 2×) de `diasFV_normal` (1×), retorna `diasFeriasVencidasDobro` e `diasBreakEven`; break-even agora usa `Math.floor+resto` em vez de `Math.ceil`. (2) `consolidadoRescisao(orgId, colaboradorId)` agrega holerites reais: total FGTS, provisões férias/13°, custo empresa, média salário. (3) `ctrl_ponto_consolidado_rescisao` controller. `pessoas_engine.gs`: `alertasFeriasAtivos(orgId)` varre todos os colaboradores ativos, calcula urgência por dias restantes ao fim do período concessivo (crítico<60d, urgente<90d, atenção≤180d, vencido). `pessoas_controller.gs`: `ctrl_rh_alertas_ferias`. `notification_engine.gs`: templates `ferias_vencendo`/`ferias_vencidas_dobro`; hook em `verificarTodosAlertasDiario` envia email semanal (rate-limit via PropertiesService) para RH+gestor+colaborador. Frontend: card "Alertas de Férias a Vencer" no topo da aba Férias; coluna urgência na tabela de períodos; `calcularRescisao` passa `diasFeriasVencidasDobro`, exibe badge "2× DOBRO" quando aplicável; seção "Histórico de Holerites" sob o formulário de rescisão com tabela + FGTS real vs estimado; break-even exibe "X meses e Y dias".

**Fase anterior**: **Fix — Pessoal: férias = III × (1+35%) / 36 — alinha com planilha referência (R$13.530,85) — Deploy @895.** `contratos_engine.gs`: `_getEncargosProvisaoFeriasPerc()` lê `parametrosRH.encargos_provisao_ferias_perc` (padrão 35%); férias usa taxa simplificada de mercado `III×1.35/36`; 13° mantém encargos reais `(III+IV)/12`. `config_org.json`: `encargos_provisao_ferias_perc: 0.35` adicionado. Custo mensal row18: 13.530,87 vs planilha 13.530,85 (diferença de R$0,02 — apenas arredondamento). Deploy @894 anterior: BSF + desconto PS + provisões base.

**Fase anterior**: **Fix — Pessoal: fórmula CLT corrigida (provisões) + Benefício Social Familiar + Desconto Plano de Saúde — Deploy @894.** `contratos_engine.gs`: (1) Provisões corrigidas — `ferias = (totalSalario+totalEncargos)/3/12` (apenas 1/3 adicional); `decimoTerceiro = (totalSalario+totalEncargos)/12` (13° completo com encargos); `inssDecimo` removido (já embutido no 13°). (2) `_getBeneficioSocialFamiliar()` lê `config_org.json.parametrosRH.beneficio_social_familiar` sem hardcode; `_getDescontoPlanoSaudePerc()` lê `parametrosRH.desconto_plano_saude_perc`. (3) Benefícios: `totalBeneficios = vtLiq + (alim−descAlim) + BSF + (plano−descPlano)`. `config_org.json`: `beneficio_social_familiar: 23.00` e `desconto_plano_saude_perc: 0.30` adicionados a `parametrosRH`. Frontend: 2 campos readonly no modal Pessoal (Desconto PS e BSF auto-preenchidos pelo cálculo); detail de provisões atualizado: "Férias 1/3 · 13°+enc. · FGTS resc.". Custo mensal alinhado com planilha referência (~R$13.489/mês para salário R$8.103,38).

**Fase anterior**: **Feat — Pessoal: controle orçamentário real via histórico salarial — Deploy @891.** `contratos_engine.gs`: `_timelineSalarial()` reconstrói linha do tempo salarial do colaborador via eventos historico_rh.json (reajuste/promoção/desligamento), clampada à vigência e ao período ativo. `_calcularCustoRealColaborador()` percorre segmentos com meses fracionários. `autoVincularPessoal()` vincula automáticamente por cargo (case-insensitive). `painelOrcamentoPessoal()` retorna previsto × realizado × saldo × desvio% por item. `_assertSaldoPessoalVinculo()` bloqueia `salvarPessoal` quando realizado > previsto. Controllers: `ctrl_contratos_pessoal_orcamento` e `ctrl_contratos_auto_vincular_pessoal`. Frontend: card "Controle Orçamentário" com stats + tabela por item + tooltip de períodos; botão "Vincular Automaticamente"; `salvarPessoal` persiste `idColaborador`+`nomeColaborador`; `abrirPesModal` restaura colaborador ao editar.

**Fase anterior**: **Feat — Pessoal: fórmula CLT corrigida + benefícios no perfil + importar colaborador — Deploy @880.** `contratos_engine.gs`: `_getAliquotasEncargos()` lê alíquotas do EncargosEngine (sem hardcode); `calcularCustoPessoal` reescrito — SAT/RAT incluído, Sistema S 5,66% (era 6,6%), Férias = `sal×(1+1/3)/12`, 13° = `sal/12 + inssDecimo`. Frontend: `verColab()` exibe seção Benefícios para CLT (VA, VT, PS, desconto); modal Pessoal do contrato tem select "Importar de colaborador" (autocomplete → preenche salário/benefícios); labels de encargos e total são dinâmicos; breakdown de provisões visível. Resultado bate com planilha de referência (13.489,42/mês vs 12.994,14 antigo).

**Fase anterior**: **Feat — Aba Documentos RH implementada — Deploy @888.** `colaborador_repository.gs`: `_ARQUIVO_DOCUMENTOS='documentos_rh.json'`, funções `listarDocumentos/salvarDocumento/excluirDocumento` com `modifyJSON`+lock e filtro por orgId/idColaborador/tipo. `pessoas_engine.gs`: wraps com validação obrigatória de idColaborador+titulo+tipo e audit trail (DOCUMENTO_RH_CRIADO/ATUALIZADO/EXCLUIDO). `pessoas_controller.gs`: `ctrl_rh_listar_documentos` (gestor/RH vê todos, colaborador vê apenas os próprios), `ctrl_rh_salvar_documento` e `ctrl_rh_excluir_documento` com RBAC. `index.html`: (1) `GAS.rh.listarDocumentos/salvarDocumento/excluirDocumento`; (2) HTML da aba substituído — card com filtros por colaborador+tipo e botão "Documento"; (3) `carregarDocumentos()` chamado em `setTab('documentos')`; (4) `abrirFormDocumento(doc)` cria modal com `_abrirModalSimples` contendo colaborador, tipo, título*, data, validade, URL e observações; (5) `_salvarDocumento()` com BtnGuard; (6) `excluirDocumento(id)` com `_abrirModalConfirmar`; funções expostas no return do RhUI.

**Fase anterior**: **Feat — Rescisão: férias vencidas em dias reais (API) + custo total estimado com encargos — Deploy @879.** Backend: `calcularRescisao` aceita `diasFeriasVencidas` (dias reais do saldo da API) — pagamento proporcional ao saldo real, não mais fixo em N×30. Frontend: campo "Férias vencidas" trocado de select (0/1/2 períodos) para input numérico de dias; ao selecionar colaborador, soma o `saldo` real de cada período `vencido` via `GAS.rh.resumoFeriasColaborador` + detalhamento por período. "Economia esperada" renomeada para "Custo mensal total para a empresa" e auto-preenchida com salário×1,55 (FGTS 8% + INSS patronal ~28% + provisões 13º/férias ~19%) com breakdown textual visível; benefícios variáveis excluídos mas campo editável.

**Fase anterior**: **Fix — Rescisão: FGTS Saldo separado do custo total + nota explicativa — Deploy @878.** FGTS Saldo removido do grid de custos; exibido em card separado abaixo do total com nota "já depositado mensalmente — não é custo adicional". Multa FGTS permanece no grid pois é custo real da rescisão.

**Fase anterior**: **Fix — Rescisão: férias vencidas exibe quantidade de dias (N × 30 dias) — Deploy @877.** Card de férias vencidas no resultado passa a mostrar `N × 30 = X dias a pagar` além do valor monetário.

**Fase anterior**: **Feat — Rescisão: cálculo completo com aviso prévio indenizado/trabalhado, datas reais e férias da API — Deploy @876.** `ponto_engine.gs`: `calcularRescisao` reescrito — (1) `modoAvisoPrevio` indenizado vs. trabalhado: trabalhado zera custo do AP; (2) `dataDesligamento` para 13º proporcional pelo mês real do ano calendário; (3) `dataAdmissao + dataDesligamento` para férias proporcionais pelo aniversário real do contrato; (4) `justa_causa` como tipo válido (AP=0, 13º=0, férias prop.=0, multa FGTS=0). `index.html`: formulário com campos Data de Desligamento (default hoje), Data de Admissão, Aviso Prévio Indenizado/Trabalhado (ocultado para pedido_demissao e justa_causa), Justa Causa no tipo; `_aoSelecionarColabRescisao` preenche todos os campos ao selecionar colaborador + busca férias vencidas reais via `GAS.rh.resumoFeriasColaborador`; resultado detalha meses13, mesesPropFerias e diasAP.

**Fase anterior**: **Feat — Documentos RH + rescisão com seletor de colaborador + mapa sem atalho direto — Deploy @875.** `colaborador_repository.gs`: `listarDocumentos`, `salvarDocumento`, `excluirDocumento` com `modifyJSON`/lock, arquivo `documentos_rh.json`. `pessoas_engine.gs`: wraps do repository com validação (idColaborador, titulo, tipo obrigatórios) e auditoria. `pessoas_controller.gs`: `ctrl_rh_listar_documentos` (RH vê todos, colaborador vê os próprios), `ctrl_rh_salvar_documento` e `ctrl_rh_excluir_documento` (RBAC escrita). `index.html` (já no @874): calculadora de rescisão agora tem seletor de colaborador que auto-preenche salário, meses trabalhados (dataAdmissao → hoje) e pré-seleciona férias vencidas. `mapa_ui.html`: clique em espaço disponível abre painel de seleção em vez de saltar diretamente ao form de reserva.

**Fase anterior**: **Feat — Ações: Fases de projeto + cronograma visual + filtro "Minhas ações" — Deploy @874.** `acao_engine.gs`: campo `fases:[]` adicionado ao schema de Ação; funções `salvarFase()` e `excluirFase()` com auditoria e lock via repository. `acoes_controller.gs`: `ctrl_acoes_salvar_fase` e `ctrl_acoes_excluir_fase` com RBAC (coordenador+). `index.html`: (1) GAS namespace — `salvarFase`, `excluirFase`; (2) botão "Minhas ações" na filter bar — filtra por `responsavel` ou `equipe[]` do usuário logado; (3) nova tab "Fases" no painel de detalhe — CRUD completo de fases com cronograma visual (barras CSS proporcionais por datas) e pipeline em cards coloridos por status.

**Fase anterior**: **Feat — Manual atualizado + Motor de busca 3 camadas + IA dual-provider — Deploy @873.** `manual.html`: conteúdo de 7 seções reescrito (dashboard, ações, pessoas/colaboradores, ponto, rh, relatorios) + seção `bi-demografico` criada; motor de busca refatorado em 3 camadas: (1) normalização NFD + ranking por score (label=10/6, tag=4/2, descrição=1) + multi-palavra, (2) dicionário de sinônimos 60+ entradas, (3) busca IA com failover silencioso Groq→OpenRouter (500ms debounce). `manual_controller.gs`: novo controller `ctrl_manual_buscar_ia` com failover dual-provider — `_chamarGroq()` (llama-3.1-8b-instant) → `_chamarOpenRouter()` (mistral-7b-instruct, endpoint openrouter.ai); se ambos falharem retorna `{ids:[]}` sem informar usuário. `index.html`: namespace `GAS.manual.buscarIA` adicionado.

**Fase anterior**: **Fix — primeiro_acesso: fallback JS para dropdown de setor vazio — Deploy @871.** `acesso_service.gs`: adicionado `ctrl_acesso_getSetores()` (sem auth, setores são dados públicos da org). `primeiro_acesso.html`: `window.addEventListener('load')` detecta se `<select id="setor">` tem apenas o placeholder e, se sim, busca setores via `google.script.run.ctrl_acesso_getSetores()` e popula dinamicamente. Cobre todos os cenários em que o template server-side falha a passar setores (orgId mismatch, Drive permission, contexto de execução "Execute as: User"). Complementa o fix anterior do `getSetores()` em `config_service.gs`.

**Fase anterior**: **Perf — AppCache em reservas_controller + reserva_carro_controller — Deploy @866.** `reservas_controller.gs`: AppCache 60s em `ctrl_reservas_listar` (chave por orgId+email+filtros) e 120s em `ctrl_reservas_metricas`; `_invalidarCachesReservas` chamado em todos os write paths (criar, criar_lote, atualizar, cancelar, confirmar, iniciar, habilitar, concluir, bloquear, cancelar_bloqueios, registrarPosEvento, concluir_atrasadas). `reserva_carro_controller.gs`: AppCache 60s em `ctrl_carro_listar`, `ctrl_carro_dados` (batched: JSON + AcessoService.listarUsuarios + EscalaCarroEngine) e `ctrl_carro_metricas`; `_invalidarCachesCarros` em salvar/aprovar/recusar/cancelar/concluir.

**Fase anterior**: **Fix — getSetores() retornava array vazio para dados sem orgId — Deploy @865.** `config_service.gs → getSetores()`: quando a lista de `setores_config.json` existe mas o filtro `s.orgId === orgId` retorna vazio (dados legados salvos antes de `orgId` ser adicionado ao schema), a função agora tenta novamente sem o filtro de `orgId` antes de cair no fallback de `_defaultSetores()`. Resultado: dropdown de setor no `primeiro_acesso.html` (e em todo lugar que usa `getSetores()`) deixa de aparecer vazio para instalações com dados de setor legados.

**Fase anterior**: **Perf — AppCache em 5 módulos + boot TTL 300s — Deploy @863.** (1) `boot_service.gs`: TTL do cache de boot elevado de 60s para 300s — cold boot acontece a cada 5 min em vez de 1 min. (2) `pessoas_controller.gs`: AppCache 120s em `ctrl_pessoas_listar` (admins) e `ctrl_pessoas_metricas`; invalidação em salvar/excluir/mudar_status/desligar. (3) `tarefas_controller.gs`: AppCache 60s em `listar` (chave por email) e `metricas`; invalidação em criar/salvar/mudar_status/excluir. (4) `balcao_controller.gs`: AppCache 60s em `listar` e `metricas`; invalidação em todas as escritas. (5) `financeiro_controller.gs`: AppCache 120s em listar/metricas de fontes, remanejamentos e aditivos; `_invalidarCachesFinanceiro` em todos os write paths. Nota: data_layer._jsonCache e AcessoService.verificar cache já estavam implementados desde @46b5091.

**Fase anterior**: **Auditoria de bugs — 4 correções — Deploy @861.** (1) `rh-ev-setor-anterior` convertido de `<select>` sem opções para `<p>` display readonly — `_atualizarCamposEvento` usa `textContent` + `_labelSetor()`; `editarEvento` popula `ev.setorAnterior` no modo edição. (2) ADM-01 corrigido: `_carregarPendentes()` recebe error callback que atualiza DOM em vez de deixar "⏳ Carregando…" eterno. (3) OcorrenciasUI: `criadoEm` passa por `fmtDataPtBR()` — sem ISO cru na tabela. (4) HabilitacoesUI: `criadoEm` idem.

**Fase anterior**: **Fix — Mudança de Setor exibe badge "de → para" no histórico — Deploy @857.** `_evMudancas` agora inclui `ev.novoSetor` com `_labelSetor(setorAnterior) → _labelSetor(novoSetor)`.

**Fase anterior**: **Fix — admissão requer salário — Deploy @856.** `_EV_CAMPOS.admissao` inclui `'salario'`; backend aplica `alteraSalario` em admissão.

**Fase anterior**: **Fix — atualizarEvento exportado + admissão requer setor — Deploy @853.** (1) `atualizarEvento` faltava no `return` do `PessoasEngine` — corrigido. (2) `_EV_CAMPOS.admissao` agora inclui `'setor'`; backend aplica `alteraSetor` em admissão.

**Fase anterior**: **RH — Permissões de escrita restritas a superadmin/rh — Deploy @850.** Função global `_podeEscreverRh()` criada. `aoAbrir()` oculta botões estáticos de escrita (Novo Evento, Novo Plano, Nova Avaliação, Processar Folha, Exportar, Encargos) para quem não é rh/superadmin. Renders dinâmicas condicionais: editar/excluir evento (Histórico), editar plano/cargo/"Novo Cargo" (PCCS), excluir (Avaliações), "Marcar Pago" (Folha). Rescisão e Indicadores são somente leitura e não foram alterados.

**Fase anterior**: **UI Responsividade — Adaptabilidade completa para qualquer tela — Deploy @849.** 7 correções CSS em `index.html`: (1) `@media (max-width: 680px)` expandido com padding reduzido, tipografia adaptada, hol-totais/hol-ch-header colapsam para 1 coluna, modal-overlay menor, view-header/mod-header empilhados. (2) Nova `@media (max-width: 768px)`: `.pc-table`, `.ind-mes-table`, `.hol-lista`, `.aud-table`, `.tabela` recebem `display:block; overflow-x:auto`. (3) Nova `@media (max-width: 480px)`: padding 12px, alertas-painel 100%, toast full-width, hol-stats-strip/rh-dash-strip 2 colunas. (4) `@media (prefers-reduced-motion)` para acessibilidade. (5) `.grid-3` utility class responsiva + 7 grids inline `repeat(3,1fr)` convertidos para a classe. (6) **Fix sidebar z-index**: desktop 100→250, mobile 200→300, backdrop 199→299 (opacidade 0.45). (7) **Fix Leaflet overlapping sidebar**: `.leaflet-container { z-index:0; isolation:isolate }` — isola contexto de empilhamento dos panes internos (z-index 200-700) do Leaflet 1.9.4.

**Fase anterior**: **RH Histórico — Edição de eventos (superadmin/rh) — Deploy @848.** Botão "editar" aparece ao lado do "excluir" na timeline para superadmin/rh. Clica em editar → form abre pré-preenchido em modo edição (colaborador bloqueado), botão muda para "Salvar alterações", aviso amarelo informa que campos estruturais não reatualizam a ficha retroativamente. `atualizarEvento` no engine e `ctrl_rh_atualizar_evento` no controller (restrito a superadmin/rh). `editarPor` salvo no registro para exibir "(editado)" na timeline.

**Fase anterior**: **RH Histórico — Mudança de Setor + cargo na Admissão + ordenação por data da ocorrência — Deploy @847.** (1) Novo tipo de evento `mudanca_setor`: select de setores aparece no formulário e no modal secundário; backend atualiza `c.setor` e registra `setorAnterior`/`novoSetor` na auditoria. (2) Admissão agora solicita cargo — `_EV_CAMPOS.admissao` inclui `'cargo'`; backend salva cargo na ficha ao admitir. (3) Histórico ordenado por `ev.data` (data da ocorrência) decrescente em todos os três pontos de renderização (aba Histórico, modal ficha, painel detalhes).

**Fase anterior**: **UX — setor legível em todos os módulos (RH, Ponto, Admin, BI, Meu Perfil) — Deploy @834.** Helper global `_labelSetor(id)` adicionado (próximo a `fmtDataPtBR`): consulta `App.getBoot().setores` por `id` ou `nome`, retorna `label||nome` ou o próprio id se não encontrado. Aplicado em 8 pontos: tabela equipe RH, modal detalhes colaborador, cabeçalho período Ponto/Métricas, tabela "Por Setor" no Ponto, card de Risco CLT, tabela individual Ponto, tabela de usuários Admin, seção "Dados Profissionais" do Meu Perfil.

**Fase anterior (2)**: **BI Demográfico — fix Personas: carregamento eterno + setor slug cru — Deploy @833.** (1) `gerarPersonas(done)` declara parâmetro `done` do BtnGuard e o chama ao final e nos early-returns — botão liberado em vez de ficar preso em "Gerando personas…". (2) Setor na persona passa por `_setorLabel(ms)` — exibe label legível ("Escola de Cultura e Artes") em vez do slug interno (`escola_de_cultura_e_artes`).

**Fase anterior**: **BI Demográfico — reconstrução SCD completa por período (gênero, raça, sexualidade, PcD, família) — Deploy @832.** `_enriquecerComHistorico(regs, ateYM)` sobrepõe os campos planos de cada registro com os valores corretos para o período filtrado, consultando `generoHistorico`, `racaCorHistorico`, `sexualidadeHistorico`, `pcdHistorico`, `paiMaeHistorico` via `_demografiaEmData` (SCD point-in-time). `_renderizar` e `gerarPersonas` agora passam `regH` (registros enriquecidos) para todos os sub-renders — gráficos de gênero, raça, sexualidade, KPIs de PcD, cards de pais/mães, tipo de deficiência e personas refletem os valores que o colaborador declarava no período consultado, não os valores atuais. Backend: `_slimHistorico` e os 5 arrays SCD já estavam no microdado desde Deploy @831.

**Fase anterior**: **BI Demográfico — fix carregamento eterno + BI lê histórico SCD de PcD/Família — Deploy @831.** (1) `atualizar(done)` agora declara o parâmetro `done` e o passa para `_carregar(onDone)` — BtnGuard libera o botão após o carregamento em vez de ficar preso em "Carregando…" indefinidamente. (2) `_carregar(onDone)` chama `onDone()` nos três ramos (sucesso, erro de servidor e erro de rede) — callers sem callback não são afetados (onDone opcional). (3) `ctrl_bi_demografico_equipe` agora lê `pcdHistorico` e `paiMaeHistorico` (entrada vigente `dataFim===null`) com fallback para campos planos legados — colaboradores atualizados pelo novo sistema SCD exibem dados PcD/Família corretos no BI.

**Fase anterior (2)**: **Infraestrutura — Reserva de Veículo: disponibilidade por data, geocodificação resolvida e bloqueio por buffer na aprovação — Deploy @830.** (1) Painel de disponibilidade exibe a data selecionada no cabeçalho (`fmtDataPtBR`). (2) `proximoHorario` usa `baseMins=0` para datas futuras — mostra o primeiro slot livre do dia, não a hora atual. (3) Buffer de retorno inclui nome dos locais: `"Retorno: Pinacoteca → CCBJ (44 min + 5 min buffer)"`. (4) `calcularTempoRota` retorna `origemResolvida`/`destinoResolvido` dos legs do Maps API — campos de localização no formulário são atualizados com o endereço geocodificado, eliminando ambiguidade de abreviações. (5) `debouncePreviewMapa` e `onchange` de hora de saída disparam `_atualizarDisponibilidade` — painel recalcula buffer quando localSaida muda. (6) Aviso inline quando horário selecionado cai em janela bloqueada; rótulo muda para "Saída mínima (c/ retorno)" quando há buffer. (7) `aprovar()` no engine verifica disponibilidade com buffer via `calcularDisponibilidade` antes de `aprovarAtomico` — aprovação bloqueada se horaSaida fora de janela livre.

**Fase anterior**: **UX — Erradicação de prompt()/confirm()/alert() — Deploy @829.** Proibição formal adicionada ao CLAUDE.md (seção H). Dois novos helpers globais em `index.html`: `_modalInput(opts, cb)` (substitui `prompt()`) e `_abrirModalConfirmar` atualizado (suporte a `cbCancelar` para BtnGuard). **45 ocorrências** substituídas em `index.html` + `terreno_editor.html` + `mapa_acao_editor.html`. `alert()` em `primeiro_acesso.html` e `portal_aprovacao.html` substituídos por display inline de erro. Zero `prompt()`/`confirm()`/`alert()` em código ativo no frontend inteiro.

**Fase anterior (2)**: **Infraestrutura — Fase 22 completa: reserva de carro complexificada — Deploy @828.** Backend (22a): 5 novos arquivos — `veiculos_repository.gs` (frota multi-veículo), `escala_carro_repository.gs` (disponibilidade por data/dia-semana), `escala_carro_engine.gs` (cálculo disponibilidade com buffer de deslocamento via Maps API, `calcularTempoRota` com waypoints), `escala_carro_controller.gs` (9 novos endpoints). `acesso_service.gs` aganha `setoresGerenciados[]` — gestor de infraestrutura tem permissões de aprovação de carro. `reserva_carro_repository.gs` atualizado: `veiculoId`, `horaChegadaEstimada`, `rota` enriquecida (paradas com lat/lng/mapaUrl, coordSaida/coordChegada, tempoEstimadoMin, distanciaKm), aprovação atômica filtrada por veículo. `reserva_carro_engine.gs`: `editarRota()` para aprovadores, `_podAprovarCarro` delegado ao EscalaCarroEngine. `setup.gs`: abas Veiculos + EscalaCarro. Frontend (22b): formulário Nova Reserva — seletor de veículo (múltiplos), paradas com map picker + iframe preview + `_paradasData[]`, hora chegada estimada (span + botão Calcular), painel de disponibilidade por data, debounce 2s em campos de rota. Aba "Escala" (aprovadores): lista escalas ativas + formulário semanal/específica com checkboxes de dias. Seção "Veículos". Modal detalhes: seção "Editar Rota" colapsável para aprovadores em PENDENTE/APROVADA. Admin: `setoresGerenciados` multi-select no modal editarPapel (visível para papel=gestor).

**Fase anterior**: **Permissões — fix habilitador: aprovação de carros e reservas de espaço — Deploy @827.** 4 bugs corrigidos: (1) `reserva_carro_engine._podAprovar()` checava papel `'infraestrutura'` (inexistente) em vez de `'habilitador'` — habilitador nunca passava na verificação de aprovação de carro. (2) `reserva_carro_engine._obterEmailsInfra()` idem — habilitadores não recebiam e-mails de novas reservas. (3) `reservas_controller._NIVEL_CONFIRMAR_SEMPRE` não incluía `'habilitador'`, que ficava em `_NIVEL_ESCALACAO` (espera de 2 dias) — habilitador não podia confirmar reservas de espaço imediatamente. (4) `solicitacao_reserva_engine._assertPodeAprovar()` bloqueava habilitador quando havia responsável configurado no slot — habilitador e gestor agora são soberanos (aprovam qualquer solicitação). Também: `listarPendentes()` e `listarTodas()` passaram a incluir habilitador/gestor; matriz habilitador no engine de permissões ganhou VER em PESSOAS, COMUNICACAO e PUBLICO (funções reais da equipe de infraestrutura).

**Fase anterior**: **Infraestrutura — fix dupla reserva de veículo no mesmo horário — Deploy @826.** Dois bugs corrigidos: (1) `criar()` no engine agora bloqueia criação se já existir reserva APROVADA com horário sobreposto — mensagem "Horário indisponível: o veículo já está reservado em...". (2) `aprovar()` agora usa `ReservaCarroRepository.aprovarAtomico()` que executa a verificação de conflito e a gravação do status APROVADA dentro do mesmo lock `modifyJSON`, eliminando a race condition que permitia dois aprovadores simultâneos passarem ambos na verificação. Novo método `aprovarAtomico` em `reserva_carro_repository.gs` com helper `_horaParaMinRepo` local.

**Fase anterior**: **RH — Histórico temporal demográfico (SCD) — Deploy @825.** Fix: campos "Vigente desde" removidos do frontend; data de início registrada automaticamente pelo backend no momento da edição (data do servidor). Arquitetura SCD aplicada a todos os campos demográficos quantificáveis. Colaborador/RH pode registrar "Vigente desde" ao alterar cada grupo — o sistema fecha a entrada anterior e abre nova, permitindo consultas ponto-a-ponto no BI (ex.: "quantas PcD em jan/2023?"). Backend: `_registrarDemografia` generalizado; `ctrl_pessoas_salvar` e `ctrl_pessoas_meu_perfil_salvar` registram `pcdHistorico`, `paiMaeHistorico`, `generoHistorico`, `racaCorHistorico`, `sexualidadeHistorico`. Migração `fase1_colaboradores_migrarHistoricosDemograficos()` semeia histórico de registros legados. Frontend: campos "Vigente desde (opcional)" nos formulários; populate lê da entrada `dataFim===null` com fallback plano; save envia objetos `*Demografica`.

**Fase anterior**: **RH — Férias: saldo correto, acordo melhorado, edição inline na modal do colaborador — Deploy @820.** (1) **Backend**: `solicitarFerias` agora armazena `totalDias` calculado e normaliza `dataInicio`/`dataFim` na criação. `resumoFeriasPorPeriodo` robustecido: conta férias `aprovado` cujo `dataFim <= hoje` além das `concluido` (protege contra dados históricos com status divergente); comparação de status normalizada (minúsculas + strip de acentos). (2) **Frontend — Períodos Aquisitivos**: ordenação invertida — período mais recente no topo. (3) **Frontend — Modal Acordo**: agora recebe datas originais do período aprovado e `totalDias`; pré-preenche Início/Fim; saldo calculado sobre `totalDias` aprovado (não sobre intervalo do período real); mostra card de referência com período aprovado e total autorizado. (4) **Frontend — Modal Secundário**: novo sistema de modal empilhado (`_abrirModalRhSecundario` / `_fecharModalSecundario`) com z-index 10000 — permite abrir formulários SEM fechar a modal do colaborador. (5) **Inline Férias**: "Solicitar férias" na modal do colaborador abre formulário em modal secundário; ao salvar, fecha o secundário e atualiza somente o painel de férias (`_recarregarDetFerias`) sem recarregar a página. (6) **Inline Eventos**: "Adicionar evento" abre mini-form completo em modal secundário (suporta todos os tipos: reajuste, promoção, mudança cargo, carga, advertência, outro); ao salvar, atualiza somente o painel de histórico (`_recarregarDetEventos`). (7) **Fix "? dias"**: modal do colaborador agora calcula dias de férias a partir das datas quando `totalDias` está ausente.

**Fase anterior**: **RH — Campo pai/mãe em Meu Perfil e Ficha Colaborador — Deploy @819.** Adiciona `ePaiMae` (Não informado/Não/Sim), `papelParental` (checkboxes Mãe/Pai/Responsável) e `numFilhos` (número). Painel condicional aparece só quando "Sim". Usado para datas comemorativas (Dia das Mães, Dia dos Pais) e homenagens. Backend: 3 campos novos em `_CAMPOS_PROTEGIDOS` + `_PERFIL_CAMPOS_EDITAVEIS`. Frontend: bloco idêntico em Meu Perfil e Ficha RH com populate/save completos.

**Fase anterior**: **RH — Campo PcD (Pessoa com Deficiência) em Meu Perfil e Ficha Colaborador — Deploy @817.** (1) **Backend**: 4 novos campos protegidos em `_CAMPOS_PROTEGIDOS` do `ColaboradorRepository` (`pcd`, `pcdTipos`, `pcdSuporte`, `pcdSuporteDescricao`); mesmos campos adicionados a `_PERFIL_CAMPOS_EDITAVEIS` em `pessoas_controller.gs` (colaborador pode atualizar no Meu Perfil). (2) **Frontend — Meu Perfil**: bloco PcD na seção Saúde — select "É PcD?" (Prefiro não informar/Não/Sim); ao selecionar Sim, expande painel com checkboxes de tipo (Física, Auditiva, Visual, Intelectual, Mental/Psicossocial, Múltipla, Reabilitado Profissional) referenciando art. 2º Lei 13.146/2015 e art. 93 Lei 8.213/1991; select "Precisa de suporte?"; campo de descrição do suporte (aparece apenas se Sim). (3) **Frontend — Ficha Colaborador (RH)**: bloco idêntico com prefixo `rh-pf-pcd-` na seção "Saúde e Outros". (4) Funções `_togglePcd`/`_togglePcdSuporte` implementadas e expostas em ambos os módulos (`PerfilUI`, `RhUI`); populate e save completos nos dois formulários.

**Fase anterior**: **BI Demográfico — fix geocodificação com endereço completo + toggle mapa de bairros — Deploy @816.** (1) **Geocodificação precisa**: `_biGeocodificar` agora aceita objeto `{logradouro, numero, bairro, cidade, uf, cep}` e constrói query com endereço completo quando disponível — para colaboradores com logradouro+CEP cadastrado, o ponto no mapa é a rua real e não só o centróide do bairro. (2) **geoKey por endereço**: colaboradores com CEP+logradouro ganham chave `end:<cep>:<logradouro>` (precisão de rua); com só CEP ganham `cep:<cep>` (precisão maior que bairro); sem CEP mantém chave `bairro|cidade`. (3) **bairroKey** adicionado ao microdado de equipe e beneficiários — sempre no formato `bairro|cidade` — usado pela nova view de bairros. (4) **Toggle Calor / Bairros** no cabeçalho do card de mapa: modo Calor usa o heatmap existente (pontos precisos); modo Bairros agrega por `bairroKey` e exibe um círculo por bairro, tamanho proporcional à quantidade de pessoas, tooltip com nome do bairro e contagem, escala de cor verde→amarelo→laranja→vermelho.

**Fase anterior**: **RH — fix crítico exclusão próprio registro + recuperação robusta (3 bugs) — Deploy @803.** (1) **Auto-exclusão bloqueada**: `ctrl_pessoas_excluir` agora bloqueia deletar o próprio registro de colaborador — erro claro "Não é permitido excluir seu próprio registro". (2) **`recuperar_colaborador_aplicar` corrigida**: quando o registro foi hard-deletado de `colaboradores.json`, a função agora RECRIA o registro a partir do snapshot histórico (antes retornava erro "ID não encontrado"). Tenta também por email quando ID não casa. (3) **Bug de busca no histórico corrigido**: `recuperar_colaborador_historico` buscava `emailInstitucional.indexOf('jpbarros')` mas o email é `joao.barros@idm.org.br` — agora usa `joao.barros` como termo de busca. (4) **Nova `recuperar_diagnosticar_estado()`**: diagnóstico completo — mostra todos os registros que casam com email/nome, contagem de duplicatas e estado `usuarios_acesso.json`. (5) **Nova `recuperar_colaborador_do_acesso()`**: cria registro mínimo de colaborador a partir de `usuarios_acesso.json` — caminho de recuperação sem dependência do histórico Drive (campos RH completados manualmente depois).

**Fase anterior**: **BI Demográfico — UI redesenhada (ícones ms, headers coloridos, sem termos vazados) — Deploy @802.** (1) **Fix ícones**: todas as ocorrências de `class="material-icons-round"` na view BI → `class="ms"` — ícones deixam de vazar texto cru (wc, cake, diversity_3…) e passam a renderizar corretamente com Material Symbols. (2) **Redesign visual**: cabeçalhos de cards com faixa colorida (`border-bottom:3px solid`) + gradiente de fundo — 4 cores distintas por categoria (gênero=#7c3aed, sexualidade=#db2777, raça=#92400e, faixa etária=#0369a1, setor=#059669, território=#d97706, mapa=#1d4ed8, personas=#71717a). Ícones trocados por semântica mais clara: `people` (gênero), `volunteer_activism` (orientação), `groups` (raça), `person` (faixa etária), `location_city` (território), `travel_explore` (mapa). (3) **Fix módulo**: `modulo:'RELATORIOS'` → `modulo:'PESSOAS'` no menu — RELATORIOS removido do catálogo, BI agora aparece como ativo sem precisar de ativação manual. (4) KPI placeholder "Carregando métricas…" exibido até dados chegarem; `overflow:hidden` nos cards evita extravasamento de conteúdo.

**Fase anterior**: **RH — fix crítico perda de dados em salvarColab + função de recuperação via histórico Drive — Deploy @800.** (1) **Bug root cause**: `ColaboradorRepository.salvar` merge só preservava campos `undefined`; campos enviados como string vazia pelo formulário sobrescreviam dados pessoais (nomeApelido, pronomes, telefone, endereço, etc.). (2) **Fix backend**: merge agora protege lista de `_CAMPOS_PROTEGIDOS` — se `dados[k]` é vazio mas `prev[k]` tem conteúdo, restaura `prev[k]` (sentinel `null` permite limpeza intencional). (3) **Fix frontend** (`salvarColab`): ao editar, restaura `funcoes`, `substituicoes`, `salarioBruto`, `salario`, `fotoPerfil`, `beneficios`, `pccs` de `_colabAtual` antes de enviar; preserva CPF quando campo vazio. (4) **Recuperação**: `recuperar_colaborador_historico()` + `recuperar_colaborador_aplicar()` no GAS Editor usam Drive API v3 (UrlFetchApp) para localizar e restaurar dados de João Paulo Rodrigues Barros do histórico de revisões do colaboradores.json.

**Fase anterior**: **BI Demográfico — Painel interativo de análise de perfil da equipe e dos beneficiários (2026-06-11)** — Deploy @797. (1) **Backend**: `bi_demografico_controller.gs` (já existia) — `ctrl_bi_demografico_equipe` (microdados anonimizados da equipe + geocodificação lat/lng via Maps API, cache `bi_geo_cache.json`) e `ctrl_bi_demografico_beneficiarios` (inscrições do Público, CEP→bairro via ViaCEP + geocodificação). Acesso: superadmin/admin/rh/gestor. (2) **Frontend**: nova view `#view-bi-demografico`; tabs Equipe/Beneficiários; filtros por período/ano, setor/ação, vínculo (CLT/PJ/Estagiário/Terceirizado), status (ativo/desligado); KPI strip MetricsToggle; 4 cards demográficos com barras coloridas (Gênero, Sexualidade, Raça/Cor, Faixa Etária); grid Setor + Território (toggle Bairros/Cidades); mapa de calor Leaflet + leaflet-heat (OpenStreetMap, fallback círculos); análise de Personas. (3) `GAS.biDemografico.equipe` + `.beneficiarios`. (4) Menu RELATORIOS→PESSOAS: `bi-demografico`. Rota: `Router.registrar('bi-demografico', ...)`.

**Fase anterior**: **RH — Ficha alinhada ao Painel de Execução (demografia) + CPF restrito (2026-06-11)** — Deploy @796. (1) **Vínculo**: opção "Terceirizado" adicionada (painel: CLT/Estagiários/PJ/Terceirizados). (2) **Identidade de Gênero**: taxonomia alinhada ao painel Looker — Mulher Cis, Homem Cis, Mulher Trans, Homem Trans, Travesti, Não-binárie, Outro (antes: feminino/masculino/não-binário, sem recorte cis/trans). Valores legados ganham option "(legado — atualizar)" injetada no load (Ficha RH `_setSelLegado` + Meu Perfil `_setSelLeg`) para não serem apagados silenciosamente ao salvar. (3) **Rótulos**: "Gay / Lésbica" (valor homossexual mantido); Raça/Cor "Preta (Negro Preto)"/"Parda (Negro Pardo)" — valores IBGE mantidos. Aplicado na Ficha RH e no Meu Perfil. (4) **CPF**: novo campo na Ficha RH (`rh-pf-cpf`, máscara visual, validação 11 dígitos, só sobrescreve quando preenchido); edição restrita por construção — `ctrl_pessoas_salvar` exige rh/admin/superadmin e `cpf` está fora de `_PERFIL_CAMPOS_EDITAVEIS`; Meu Perfil exibe somente leitura mascarado (123.***.***-45); planilha-índice continua só com `CPF_Mascarado`. Campos do painel já existentes confirmados: setor, data de nascimento (idade), sexualidade, raça/cor, bairro. ⚠️ Este commit também inclui trabalho da sessão paralela em andamento: advertências com nível/gravidade (form `rh-ev-nivel-adv`/`rh-ev-gravidade` + validação em `pessoas_engine.registrarHistorico`).

**Fase anterior**: **RH — Advertências: sequência disciplinar + índice de gravidade + alertas (2026-06-11)** — Deploy @795. (1) **Sequência disciplinar**: evento Advertência ganhou campo "Nível" (Advertência Verbal → 1ª Escrita → 2ª Escrita → 3ª Escrita, última antes da demissão) e "Gravidade" (Leve/Moderada/Grave/Gravíssima); justificativa (descrição) obrigatória — validados também no backend (`PessoasEngine.registrarEvento`). (2) **Painel de alerta no form** (`_pintarAlertaAdv`): ao selecionar Advertência, busca o histórico do colaborador e exibe: resumo das advertências anteriores com contagem por nível e data da última; próximo passo na sequência (pré-seleciona o select de nível); aviso vermelho "limite atingido — medida prevista: demissão" quando a 3ª escrita já foi aplicada; Gravidade GRAVE → aviso de antecipação de etapas; GRAVÍSSIMA → aviso de desligamento direto (justa causa) + botão atalho "Registrar desligamento" (abre o modal de desligamento existente). (3) **Toasts pós-registro**: 3ª escrita → "próxima medida prevista é a demissão"; gravíssima → "avalie o desligamento direto". (4) **Timeline**: chips "Nível: 1ª Advertência Escrita" (com ⚠ na 3ª) e "Gravidade" colorida por severidade. (5) **Modal de detalhe do colaborador**: banner disciplinar com total de advertências e próximo passo (vermelho quando limite atingido). Advertências antigas sem nível contam como verbal na sequência. *(Commit inclui também ajustes de selects demográficos — Identidade de Gênero/Orientação/Raça — de sessão paralela.)*

**Fase anterior**: **RH — Histórico de Eventos com campos estruturados por tipo + atualização automática da ficha (2026-06-11)** — Deploy @793. (1) **Fix bug ativo**: frontend enviava `tipoEvento` mas `PessoasEngine.registrarEvento` exigia `dados.tipo` — todo registro de evento falhava na validação (inclusive o auto-evento de carga horária do `salvarColab`, com erro engolido por callbacks vazios). Engine agora normaliza `tipo = tipo || tipoEvento`. (2) **Campos específicos por tipo** no form de Novo Evento (`_EV_CAMPOS`): Promoção → novo cargo (select PCCS) e/ou novo salário; Reajuste Salarial → novo salário (obrigatório); Mudança de Cargo → novo cargo (obrigatório); Alteração de Carga Horária → nova carga h/semana; Admissão → data de admissão; Advertência/Elogio/Outro → só descrição (obrigatória apenas nesses). Campo "Data do Evento" para todos; hints "Atual: …" mostram o valor vigente da ficha; descrição vira opcional quando há campos estruturados. (3) **Atualização automática da ficha**: `PessoasEngine._aplicarEfeitosEvento` valida por tipo, captura valores anteriores (`salarioAnterior`/`cargoAnterior`/`cargaAnterior`/`dataAdmissaoAnterior`) no evento e grava `salarioBruto`/`cargo`/`horasSemanais`/`dataAdmissao` no colaborador via `ColaboradorRepository.salvar`; audit `FICHA_ATUALIZADA_POR_EVENTO_RH`. Flag `semEfeitos` para eventos cuja ficha já foi atualizada pelo chamador (auto-evento do salvarColab agora envia anterior/novo explícitos). (4) **Timeline com histórico de avanços**: chips "Cargo: A → B", "Salário: R$ X → R$ Y", "Carga: 30h → 40h" na aba Histórico e no modal de detalhe do colaborador; labels pt-BR via `_EV_TIPO_LABEL` (antes exibia valor cru tipo `mudanca_cargo`); nome do colaborador resolvido do cache quando ausente. (5) **Privacidade**: `listarHistoricoFiltrado` adiciona `reajuste` aos tipos sensíveis e remove `salarioAnterior`/`novoSalario` dos eventos para papéis gestor/colaborador. Pós-registro com efeitos: lista de equipe e métricas recarregam.

**Fase anterior**: **Ponto — Apuração semanal de jornada + meta do mês (2026-06-11)** — Deploy @790. (1) **Novo campo `regimeApuracao`** ('diario'|'semanal') no colaborador — select "Apuração de jornada" na Ficha RH (`rh-pf-regime`); `ctrl_ponto_atualizar_carga_horaria` aceita o campo. (2) **JornadaEngine — regime semanal**: para escalas variáveis pactuadas (ex.: professores 20h em 2-3 dias), extras/faltantes diários = 0; fechamento por semana ISO (seg→dom) com crédito idempotente no BH via chave `sem:<segunda>` em `diasProcessados`; helpers `_segundaISO`/`_domingoISO`/`agruparSemanas` (exportado)/`_creditarSemanaBH`/`_mapasColaboradores`; `calcularJornadasLote` ganhou param `mapaRegime` (fallback: carrega colaboradores.json); `processarDia` usa carga real do colaborador (antes: global 40h) e refecha a semana no regime semanal; `atualizarBHDosLotes`/`recalcularBHCompleto` creditam por semana p/ semanais; `ponto_engine._calcularEAtualizarBH` pula débito diário p/ semanais. (3) **Espelho**: novo `metaMensalMin` (ideal do mês — diário: minDiário × dias úteis menos folgas; semanal: carga×dias/7) exibido como card "Meta do mês · N% atingido"; subtotais por semana na tabela (trabalhado de carga · saldo ±, "em andamento" p/ semana corrente); leitura estendida às bordas da semana ISO; resumo extras/faltantes = soma dos deltas das semanas fechadas; badge "Apuração semanal". (4) **Métricas RH**: meta semanal = carga×dias/7; extras/faltantes de semanais fecham por semana completa (janela estendida, semanas em andamento fora); `mapaHoras`+`mapaRegime` passados ao engine (corrige extras calculados com 40h global p/ cargas parciais); individual ganha `regime`+`nomeApelido`; badge "sem." na coluna Carga. (5) **Consolidado** (períodos do espelho): mesma lógica semanal. (6) **Filtro de profissional**: prioriza "como deseja ser chamado" com nome completo entre parênteses e ordena pelo nome exibido (Espelho + tabela individual + cards de risco). ⚠️ **Pós-deploy**: marcar professores como "Semanal" na Ficha RH e rodar `ctrl_ponto_recalcular_bh_todos` no GAS Editor para limpar deltas diários antigos do BH.

**Fase anterior**: **Ponto — UX/UI Espelho + Métricas RH (2026-06-11)** — Deploy @789. (1) **Espelho — sincronização mês ↔ período**: trocar o mês reseta o filtro de período para "Mês selecionado" (botão "Este mês" renomeado) e repinta os botões — antes "Ano vigente"/"Últ. 12 meses" ficava aceso indevidamente após troca de mês; ativar período agregado desabilita o seletor de mês (tooltip explicativo); cards ganham sufixo do período + nota de que a tabela diária segue exibindo o mês escolhido; erro no consolidado mostra mensagem em vez de "Carregando…" eterno. (2) **Métricas RH — filtros ágeis**: mês com `onchange` (sem clicar Atualizar) + cache client-side por mês (`_metrCacheMes`) — voltar a mês já calculado é instantâneo; Atualizar força recálculo; Evolução carrega automaticamente em segundo plano (botão removido); setor preservado ao trocar de mês. (3) **Painel Riscos CLT**: cards visuais por colaborador em risco, ícone/cor por tipo de violação e **datas das ocorrências** — backend `ctrl_ponto_metricas_rh` retorna `jornadasLongasDatas` e `semIntervaloDatas` ({data, minutos, intervalo}, cap 8); substitui as linhas laranjas inline. (4) **Tabela individual**: chips "Com registro / Risco CLT / Todos" (default Com registro — oculta linhas 0h00 com aviso da contagem); badge cinza "Sem registro" distinto de "Incompleto"; ordenação riscos → com registro → alfabético. (5) **Gráficos**: fontes 9-10px, alturas maiores, tooltips por barra; drill-down mostra "Carregando histórico…" e preenche sozinho quando a evolução chega. ⚠️ Nota: as mudanças de `index.html` desta fase foram commitadas junto com f560d3e (@787) por sessão paralela; este deploy adiciona o backend (`ponto_controller.gs`).

**Fase anterior**: **RH — fix desligamento (GAS.rh binding) + PIS backfill via AFD (2026-06-11)** — Deploy @787. (1) **Fix desligamento**: `GAS.rh.registrarDesligamento` não existia — `_confirmarDesligamento` falhava silenciosamente com TypeError. Adicionado binding em `GAS.rh` apontando para `ctrl_pessoas_registrar_desligamento`. (2) **PIS backfill**: nova Etapa 1b em `confirmarImportacao` (`afd_parser_engine.gs`) — após criar stubs, um único `modifyJSON` grava o PIS do AFD em todos os colaboradores matchados que ainda não têm o campo `pis` preenchido; não sobrescreve quem já tem. Retorna `pisBackfilled` no resultado; UI exibe mensagem verde quando ≥ 1 ficha atualizada.

**Fase anterior**: **Pessoas — bloquear email de demissão para o próprio colaborador desligado (2026-06-11)** — Deploy @783. Guard de desligamento ativo em 6 pontos: (1) Global `EMAILS_BLOQUEADOS_DESLIGAMENTO_ATIVO[]` em `pessoas_engine.gs` — populado com emailInstitucional+emailPessoal antes de `_transitarColaborador` em `registrarDesligamento`; (2) `NotificationEngine._enviarEmail` — verifica `EMAILS_BLOQUEADOS_DESLIGAMENTO_ATIVO` ANTES do `_isDesligado` (previne timing race antes da transição ser salva); (3) `acesso_service._notificarAprovado` — bloqueia envio para email do colaborador em processo de desligamento; (4) `escuta_engine._enviarConvites` — pula colaboradores com `status === 'desligado'`; (5) `event_handler_registry.TASK_DELAYED` — verifica desligado antes de notificar responsável; (6) `event_handler_registry.TAREFA_CRIADA` — idem.

**Fase anterior**: **Notificações — bloquear email para colaboradores desligados (2026-06-10)** — Deploy @781. Guard adicionado em 4 pontos de envio: (1) `NotificationEngine._enviarEmail` — função `_isDesligado(email)` via `ColaboradorRepository.buscarPorEmail`; bloqueia alertas diários de tarefas, contratos, processos, reuniões. (2) `solicitacao_reserva_engine._notificar` — verifica cada destinatário antes do `GmailApp.sendEmail`. (3) `reserva_carro_engine._notificar` — idem. (4) `rece_engine._enviarEmailPublicacao` — idem no loop de convidados. Em todos os casos: se `ColaboradorRepository` não encontrar o email (pessoa externa), o envio prossegue normalmente.

**Fase anterior**: **RH — fix foto apagada no save + desligados no filtro Todos (2026-06-10)** — Deploy @780. (1) **Fix foto apagada**: `ColaboradorRepository.salvar` fazia `lista[idx] = dados` — substituição total do registro. Salvar na Ficha RH ou no módulo Pessoas apagava `fotoPerfil`, `nomeApelido` e outros campos de Meu Perfil não presentes no formulário. Corrigido com merge `Object.keys(prev)` antes de sobrescrever. (2) **Fix filtro Todos**: `PessoasEngine.listar` sempre adicionava `excluirDesligado: true` quando status vazio — "Todos" excluía desligados. Fix: frontend envia `{incluirDesligado:true}` nos dois módulos (RhUI e PessoasUI); engine respeita a flag.

**Fase anterior**: **Ponto — Métricas RH: fix r.data + filtro setor + gráficos evolução + drill-down (2026-06-10)** — Deploy @779. (1) Bug crítico: `carregarMetricasRh` usava `r.dados` em vez de `r.data` → `totalAtivos` = `undefined`. (2) Filtro de setor: select dropdown, client-side; clicar na linha "Por Setor" filtra automaticamente; cards de resumo refletem o setor. (3) Novo backend `ctrl_ponto_tendencias_rh`: últimos 6 meses de `pctCumprimento`, horas e extras + histórico individual `porColaborador`. (4) Botão "Evolução": 3 gráficos de barras CSS (cores semáforo em % cumprimento). (5) Drill-down: clicar no nome de colaborador abre mini-gráficos inline dos últimos 6 meses.

**Fase anterior**: **Férias — fix crítico: FsmGuardian.assertValida + nomeColaborador + timezone-safe periods (2026-06-10)** — Deploy @777. (1) **Bug crítico**: `FsmGuardian.validarTransicao` não existe na API — causava TypeError em toda transição de status (aprovar, recusar, cancelar, mudar status de colaborador). Corrigido para `FsmGuardian.assertValida` nas 3 funções `_transitarColaborador`, `_transitarFerias` e `_transitarAfastamento`. (2) **Nome na listagem**: `PessoasEngine.listarFerias` agora enriquece cada registro com `nomeColaborador` via `buscarPorId` (com cache por colaborador para evitar N+1). (3) **Timezone-safe**: `calcularPeriodosAquisitivos` usa parse manual (`split('-')`) e formatação local em vez de `new Date(ISO)` + `toISOString()` para evitar shift de 1 dia em UTC-3. (4) **Mensagens de erro**: Toast mostra mensagem real do backend em vez de "Erro." genérico.

**Fase anterior**: **Telefone — máscara pt-BR + indicador WPP + Toast no Meu Perfil (2026-06-10)** — Deploy @774. (1) **Máscara global** `(00) 00000-0000`: event delegation em `DOMContentLoaded` captura todos os `input[type="tel"]` — um único listener cobre todos os formulários. Utility `mascaraTelValor(v)` formata valor ao popular campos de dados existentes. (2) **Indicador WPP**: 9 campos de telefone receberam checkbox verde "WPP" ao lado: `p-telefone`, `p-emg-tel` (Meu Perfil); `rh-pf-telefone`, `rh-pf-emg-tel` (Ficha RH); `ag-telefone` (Agentes form), `agt-tel` (Agentes modal), `vol-tel` (Voluntários modal), `sol-forn-telefone`, `sol-credor-telefone` (Solicitações). Campo salvo como `telefoneWpp: boolean` no colaborador; `contatoEmergencia.wpp` para contato de emergência. Backend: `telefoneWpp` adicionado a `_PERFIL_CAMPOS_EDITAVEIS`. (3) **Toast no Meu Perfil**: `_mostrarMsg` substituído por `Toast.sucesso`/`Toast.erro` no `salvar()` — notificação flutuante visível independente do scroll.

**Fase anterior**: **Ponto — fix Métricas RH — aba não abria (2026-06-10)** — Deploy @773. `PontoUI.setTab()` iterava apenas `['espelho','importexport','sessoes','vinculos']` — `'metricas'` ausente do array; `#ponto-tab-metricas` iniciava com classe `oculto` e nunca era revelado ao clicar na aba. Corrigido adicionando `'metricas'` à lista de abas no `forEach` de `setTab`.

**Fase anterior**: **Meu Perfil — pré-carga no boot + _carregando guard (2026-06-10)** — Deploy @770. (1) `_aplicarBoot()`: dispara `PerfilUI.carregar(null, true)` 2s após o boot concluir, antes do usuário abrir a aba. A 1ª chamada GAS pode travar; o auto-retry (7s) garante a 2ª chamada que sempre funciona. (2) `aoAbrir()`: respeita `_carregando` — se pré-carga já está em andamento, aguarda o callback em vez de disparar nova chamada (que invalidaria a pré-carga via gen counter). (3) `_carregando` flag: novo var; setado `true` ao entrar em `carregar()`, limpo `false` nos dois callbacks; impede `aoAbrir()` de duplicar chamadas.

**Fase anterior**: **Meu Perfil — fix carga automática + salvar + BtnGuard + Descartar (2026-06-10)** — Deploy @768. (1) `carregar(done)`: contador de geração (`_gen`) para ignorar callbacks stale de chamadas anteriores; auto-retry único após 7s se servidor não responder; `done()` aceito como parâmetro para integração com BtnGuard. (2) `aoAbrir()`: sempre recarrega ao abrir a aba (remove guard `_carregado`); passa `_retry=true` para habilitar o auto-retry da primeira carga. (3) `salvar(done)`: aceita e chama `done()` nos callbacks de sucesso e erro — corrige botão preso em "Salvando..." indefinidamente. (4) Botão Recarregar: add id `perfil-btn-recarregar`, BtnGuard.wrap com label "Carregando…", remove `data-bg-skip="1"`. (5) Botão Descartar: ícone trocado de `refresh` para `cancel`, também envolto em BtnGuard.

**Fase anterior**: **Unificação base de usuários — colaboradores.json como fonte única de verdade (2026-06-10)** — Deploy @765. (1) `boot_service.gs`: join com `ColaboradorRepository.buscarPorEmail()` para preencher `usuarioNome`, `usuarioSetor`, `usuarioCargo`, `usuarioFoto` no boot; fallback para `usuarios_acesso.json` se não houver colaborador. (2) `ctrl_pessoas_meu_perfil_ler`: simplificado para usar `ColaboradorRepository.buscarPorEmail()` direto — sem merge, sem merge via `registroAcesso`; corrige bug de "dados profissionais só ao clicar Recarregar" e "dados pessoais nunca carregam". (3) `ctrl_pessoas_meu_perfil_salvar`: removido sync de dados pessoais para `usuarios_acesso.json`; limpa cache do boot. (4) `ctrl_pessoas_salvar`: sync para `usuarios_acesso.json` mantém apenas `setor` e `nome` (fallback de exibição). (5) `_ctxPessoas()`: removido campo `registroAcesso` do retorno (era solução temporária). (6) `index.html/_aplicarBoot`: foto de perfil carregada do boot diretamente (`_boot.usuarioFoto`), sem `setTimeout + GAS.perfil.ler`. (7) Nova função `ctrl_pessoas_meu_perfil_migrar_acesso_para_colaboradores()` — executar UMA vez no GAS Editor após o deploy para mover `pronomes/nomeApelido/emailPessoal/telefone/fotoPerfil` de `usuarios_acesso.json` → `colaboradores.json`.

**Fase anterior**: **Meu Perfil — fix carregar eternamente (2026-06-10)** — Deploy @764. (1) `ctrl_pessoas_meu_perfil_ler` fazia 3 chamadas Drive API (usuarios_acesso + colaboradores + usuarios_acesso de novo) — a 3ª adicionada na sessão anterior causava lentidão/timeout; substituída por `ctx.registroAcesso` (já lido por `_ctxPessoas()`, sem Drive extra). (2) Callback de falha do `PerfilUI.carregar()` agora mostra a mensagem de erro no card "Dados Profissionais" em vez de ficar preso em "Carregando…".

**Fase anterior**: **RH — Visibilidade de status: desligados ocultos + avatar overlay + bloqueio de tarefas + auto-retorno (2026-06-10)** — Deploy @761. (1) **Desligados ocultos**: `PessoasEngine.listar()` exclui colaboradores com `status:'desligado'` por padrão via flag `excluirDesligado` no `ColaboradorRepository`; chamadas com `{status:'desligado'}` explícito ainda funcionam para views admin. (2) **Avatar overlay**: `_avatarMini(c)` exibe 🏖️ para `ferias` e 🌿 para `afastado` como `span` com `position:absolute` sobreposto ao círculo. (3) **Bloqueio de tarefas**: `TarefaEngine._validarTarefa` verifica status do responsável via `PessoasEngine.buscarPorEmail`; lança erro claro para `ferias`, `afastado` e `desligado`. (4) **Auto-retorno via AlertasEngine**: `verificarAutoRetornoFerias` usa `acordo.periodoGozadoFim` (período real gozado) ou `fim` da solicitação; `verificarAutoRetornoAfastamento` encerra afastamentos com `dataFim` vencida; ambos chamados a cada ciclo de 30 min pelo AlertasEngine.

**Fase anterior**: **Meu Perfil — fix sync 3-vias + select pronomes (2026-06-10)** — Deploy @760. (1) **Bug crítico corrigido**: `ctrl_pessoas_meu_perfil_salvar` chamava `ColaboradorRepository.atualizar()` inexistente — corrigido para `.salvar()`; o save estava falhando com "Erro ao salvar / deserialize threw error". (2) **Campos ausentes no Meu Perfil**: `ctrl_pessoas_meu_perfil_ler` agora faz merge dos campos `nomeApelido`, `pronomes`, `telefone`, `emailPessoal`, `fotoPerfil` a partir de `usuarios_acesso.json` quando ausentes no registro do colaborador — garante que ficha RH, Meu Perfil e Usuários compartilham a mesma fonte de verdade. (3) **Campo Pronomes**: trocado de texto livre para select predefinido (ele/dele, ela/dela, elu/delu, outro + campo condicional para pronomes personalizados) tanto em Meu Perfil quanto na Ficha RH.

**Fase anterior**: **RH — Desligamento (com/sem rescisão) + Períodos Aquisitivos/Concessivos + Acordo de Férias (2026-06-09)** — Deploy @757. (1) **Desligamento**: botão "Desligar" no modal de detalhe do colaborador (visível apenas se status ≠ 'desligado'); modal com dois tipos — "Com rescisão" (demissão, gera ônus) e "Sem rescisão" (transferência, sem ônus); campos: tipoRescisao, comRescisao, dataDesligamento, observação; chama `ctrl_pessoas_registrar_desligamento` existente. (2) **Períodos Aquisitivos/Concessivos**: novo card na aba Férias; select de colaborador → tabela com todos os períodos calculados a partir da data de admissão; colunas: # | Período Aquisitivo | Janela Concessiva | Direito | Gozado | Saldo | Status (em_aquisicao / em_concessao / gozado / vencido). Engine: `calcularPeriodosAquisitivos(dataAdmissao)` + `resumoFeriasPorPeriodo(idColaborador)`. Controller: `ctrl_rh_resumo_ferias_colaborador`. (3) **Acordo de Férias**: fluxo Solicitar→Aprovar→Registrar Acordo→(concluído). Férias aprovadas ganham botão "Acordo" (handshake) na tabela; modal coleta período efetivo gozado + dias; salva objeto `acordo = {periodoGozadoInicio, periodoGozadoFim, diasEfetivosGozados, saldoAnterior, saldoPosterior}` na ferias e transita para concluído; toast exibe saldo remanescente. Engine: `registrarAcordoFerias`. Controller: `ctrl_rh_registrar_acordo_ferias`.

**Fase anterior**: **Ponto — Banco de horas automático + Alertas CLT + Métricas RH (2026-06-09)** — Deploy @754. (1) **BH automático**: importação AFD e reprocessamento de jornadas agora creditam automaticamente o banco de horas via `JornadaEngine.atualizarBHDosLotes`. Idempotência garantida por `diasProcessados: {data: deltaMin}` em `banco_horas.json` — reimportações ajustam o delta sem duplicar. `PontoRepository.creditarDiaBH` e `resetarBancoHoras` adicionados. (2) **Alertas de ponto**: 3 novos tipos em `AlertasEngine` — `PONTO_CARGA_SEMANAL` (emite na sexta/fim-de-semana se < 90% da carga), `PONTO_CARGA_MENSAL` (emite nos últimos 3 dias do mês se < 90%), `PONTO_BANCO_HORAS_EXCESSIVO` (BH > 40h — risco CLT Art. 59). Função `_verificarCargaPonto` com deduplicação por `entidadeId`. (3) **Métricas RH**: nova aba "Métricas RH" no Ponto & RH. Backend: `ctrl_ponto_metricas_rh` retorna resumo geral (totalAtivos, pctCumprimento, totalExtras, saldoBH), por setor e individual com indicadores CLT (jornada > 10h, falta de intervalo intrajornada, BH excessivo, extras > 200h/mês). Frontend: tabela por setor, tabela individual com badges Cumpriu/Incompleto + tag Risco CLT + linha de detalhe dos avisos específicos.

**Fase anterior**: **Perfil Pessoal — auto-edição + foto de perfil (2026-06-09)** — Deploy @753. Nova view "Meu Perfil" acessível pelo menu lateral e clicando no avatar do sidebar. Colaborador edita livremente: apelido, pronomes, e-mail pessoal, telefone, endereço (CEP → ViaCEP), contato de emergência, gênero, orientação sexual, raça/cor, tipo sanguíneo, alergias, restrições alimentares e observações. Foto de perfil: upload com Canvas resize (max 200×200 JPEG em base64). Avatar propagado para sidebar (clicável), topbar e lista de colaboradores no RH. Backend: `ctrl_pessoas_meu_perfil_ler` + `ctrl_pessoas_meu_perfil_salvar` com whitelist de campos editáveis. *(controller commitado separadamente)*

**Fase anterior**: **Ponto — Informe de atualização do espelho (2026-06-09)** — Deploy @750. Exibe "Atualizado até DD/MM/AAAA" (ícone update) abaixo dos cards de contabilização, calculado como o último dia com `numBatidas > 0` no mês visualizado. Não aparece se não há registros no mês. Implementado em `_renderStatsStrip` via var `_ultimaBatida` salva ao carregar o espelho.

**Fase anterior (2)**: **RH — Form colaborador: campos de diversidade, saúde e contatos (2026-06-09)** — Deploy @747. Adicionados ao form de cadastro RH de colaboradores: Gênero, Orientação Sexual, Raça/Cor (IBGE), Telefone/Celular, Contato de Emergência (nome + telefone + parentesco, grid 3 colunas), Tipo Sanguíneo, Alergias, Restrições Alimentares (checkboxes: vegano, vegetariano, sem glúten, sem lactose, halal, kosher, outro + campo detalhe condicional) e Observações Pessoais. `abrirFormColab` popula todos os novos campos; `salvarColab` persiste tudo; restrições salvas como array de valores.

**Fase anterior**: **Ponto — Remover seletor de carga do espelho (2026-06-09)** — Deploy @748. Botões 20h/30h/40h + input de carga removidos do filtro do espelho de ponto. A carga agora é lida exclusivamente do cadastro do colaborador (`horasSemanais`), com fallback de 40h. Funções `_setCarga`, `_setCargaCustom`, `_salvarCargaHoraria`, `_renderCargaBotoes` removidas do PontoUI.

**Fase anterior (2)**: **Ponto — Consolidado como filtro dos cards + Carga no form de colaborador + Nomes com apelido no filtro (2026-06-09)** — Deploy @745. (1) Bloco "Consolidado" abaixo da tabela removido; substituído por filtro de período (Este mês / Ano vigente / Últ. 12 meses / Desde admissão) que altera os cards de contabilização acima da tabela. Cards em "Este mês" mostram todos os 5 campos (dias, totais, extras, falta, banco); outros períodos mostram os 3 disponíveis (dias, totais, extras). Filtro de período aparece apenas quando colaborador selecionado. (2) Campo "Carga horária semanal" adicionado ao form de cadastro de colaboradores (Dados Profissionais); lê/salva `horasSemanais`; alteração de carga gera evento de histórico do tipo `alteracao_carga` automaticamente. Novo tipo "Alteração de Carga Horária" adicionado ao select de eventos do histórico. (3) Select de colaboradores no filtro do espelho exibe nome no formato "Apelido (Nome)" quando "Como deseja ser chamado" estiver preenchido; `ctrl_ponto_listar_colaboradores` retorna `nomeApelido` agora.

**Fase anterior**: **Ponto — Carga horária semanal por colaborador + Consolidado de totais (2026-06-09)** — Deploy @738. (1) Campo `horasSemanais` em `colaboradores.json`; `calcularJornadasLote` aceita `mapaHoras` opcional por colaboradorId; `calcularEspelho` resolve horas do colaborador antes de calcular extras/faltas. (2) Seletor de carga no espelho: botões 20h/30h/40h + input manual; salva imediatamente via `ctrl_ponto_atualizar_carga_horaria`; botão ativo fica destacado. (3) Painel "Consolidado" abaixo do espelho mensal: 4 cards (Este mês / Ano vigente / Últimos 12 meses / Desde a admissão) com horas trabalhadas, extras e dias trabalhados.

**Fase anterior**: **Fix Ponto — Diagnóstico de normalizados + espelho de ponto_normalizado.json (2026-06-09)** — Deploy @736. Botão "Diagnóstico" na aba Sessões mostra: total de registros em ponto_normalizado.json por colaborador e por mês. Permite identificar se os dados chegaram ao sistema ou se há mismatch de ID/orgId. Fixes anteriores: calcularEspelho lê ponto_normalizado.json diretamente; cancelarImportacao corrigido (reverterSessao não rejeita mais 'pendente'). Dois bugs raiz corrigidos: (1) `calcularEspelho` lia apenas `jornadas.json` — batidas manuais nunca apareciam no espelho; se `confirmarImportacao` falhou ou foi revertido, espelho sempre "Ausente". Fix: `calcularEspelho` agora lê `ponto_normalizado.json` via `PontoRepository.listarPorColaborador` e calcula jornadas on-the-fly com `calcularJornadasLote`. (2) `cancelarImportacao` chamava `PontoBrutoRepository.reverterSessao` que rejeita sessões `pendente` → botão "Cancelar" falhava silenciosamente. Fix: `reverterSessao` agora rejeita apenas `revertida` e `cancelada`.

**Fase anterior**: **Fix Ponto — Indicador visual + renomear Reverter→Excluir na aba Sessões (2026-06-09)** — Deploy @732. `_setBtnCarregando` usa `<span class="ms ms-sm" style="animation:spin…">progress_activity</span>` (Material Symbols girando) em vez de emoji ⏳, consistente com o padrão do sistema. Botão "Reverter" renomeado para "Excluir" (operação remove o histórico, não cria versão anterior).

**Fase anterior**: **Fix Ponto — Espelho vazio após reimportação: cancelarImportacao limpa órfãos + botões Cancelar/Reverter na aba Sessões (2026-06-09)** — Deploy @729. Causa raiz do espelho "ainda vazio" após o batch fix: a sessão antiga (pendente por timeout) mantinha brutos em `ponto_bruto.json`; qualquer reimportação do mesmo arquivo detectava todos os NSRs como "duplicado" → 0 normalizados → 0 jornadas. Fixes: (1) `cancelarImportacao` agora chama `PontoRepository.reverterImportacao` antes de remover brutos — limpa normalizados órfãos que a versão antiga pôde ter gravado parcialmente antes do timeout. (2) `GAS.ponto.reverterImportacao` adicionado ao namespace do frontend. (3) Aba Sessões ganha coluna "Ação" com botão "Cancelar" (sessões pendentes) e "Reverter" (sessões confirmadas) — modais via `_abrirModalConfirmar`. **Fluxo para corrigir espelho vazio**: aba Sessões → Cancelar sessão pendente antiga → reimportar o arquivo AFD → espelho aparece.

**Fase anterior**: **RH — Encargos: BcbService + tabelas 2026 + atualização automática SM (2026-06-09)** — Deploy @727. (1) `BcbService` (core/services/bcb_service.gs): serviço genérico para a API pública do BCB/SGS; expõe `buscarSalarioMinimo()` (série 1619), `buscarIPCA12Meses()` (série 13522), `buscarINPC12Meses()` (série 4391). (2) `EncargosEngine`: integrado ao `BcbService`; `buscarEAtualizarSMOnline()` busca SM em tempo real e aplica se mudou (respeita override manual); `executarAtualizacaoAutomatica()` agora faz 3 etapas — catalogo, BCB fetch e notificação de admin se novo ano sem catalogo; `gerarAlertas()` retorna alertas de ano desatualizado e overrides manuais. (3) Catálogo 2026 adicionado (Portaria MPS/MF 13/2026): SM R$ 1.621,00; INSS faixas 1621/2902,84/4354,27/8475,55 confirmadas via BCB + Portaria; IRRF tabela base inalterada (Lei 15.270/2025); desconto simplificado R$ 607,20/mês; `ANO_MAIS_RECENTE=2026`. (4) Controller: `ctrl_encargos_buscar_online()` para fetch on-demand; `ctrl_encargos_listar()` inclui `alertas`. (5) Frontend: botão "Buscar online" (cloud_sync), banner `enc-alertas-container` com alertas coloridos, `EncargosUI.buscarOnline()`, `_renderAlertas()`. (6) `_buildDocOficial` usa ano dinâmico (`new Date().getFullYear()`) e valores 2026. INSS/IRRF permanecem manuais (não existe API pública para esses dados).

**Fase anterior**: **Ponto — batch import AFD (fix timeout 19k batidas) (2026-06-09)** — Deploy @725. Root-cause real do espelho vazio: `confirmarImportacao` chamava `PontoRepository.salvarRegistro()` individualmente para cada batida (19.471 registros) — cada chamada faz lock+lê JSON crescente+escreve, custo O(N²) → timeout de 6 min do GAS antes de terminar → `ponto_normalizado.json` vazio → `jornadas.json` vazio → espelho "Ausente". Fix: (1) `PontoRepository.salvarLote()` — 1 único `modifyJSON` para N registros; (2) `JornadaRepository.salvarLote()` — 1 único `modifyJSON` para N jornadas; (3) `JornadaEngine.calcularJornadasLote()` — calcula tipos E/I/R/S em memória para todos os pares (colabId, data), atualiza `tipo` in-place nos registros normalizados; (4) `confirmarImportacao` reescrito: monta `normalizadosLote[]`, chama `calcularJornadasLote`, depois `salvarLote` normalizado (1 op) + `salvarLote` jornadas (1 op) → total 2 modifyJSON em vez de ~20k; (5) `ctrl_ponto_reprocessar_jornadas` também reescrito para batch: lê JSON uma vez, calcula em memória, persiste tipos em 1 modifyJSON, salva jornadas em 1 modifyJSON. **Pós-deploy**: reverter sessões antigas, reimportar AFD, depois navegar para Abril/2024 no espelho.

**Fase anterior**: **Fix RH — colaboradores auto-carregam + modal de detalhe por colaborador (2026-06-09)** — Deploy @721. (1) Bug Router: `_reconstruirMenu()` sobrescrevia `RhUI.aoAbrir` com `null` porque `'rh'` estava ausente da chain if-else; adicionado `id === 'rh' ? RhUI.aoAbrir()`. (2) Novo `verColab(id)`: modal largo com dados do colaborador + histórico de eventos (async via `GAS.rh.historico`) + férias (async via `GAS.rh.listarFerias`) + botão "Adicionar evento" (navega para aba Histórico com colaborador pré-selecionado) + botão "Solicitar férias" (modal de férias com colaborador pré-selecionado). Botão `visibility` adicionado por linha da tabela Equipe. `abrirFormEvento(idColabPre)` e `abrirFormFerias(idColabPre)` aceitam parâmetro opcional de pré-seleção.

**Fase anterior**: **Ponto — filtro do espelho: select setor + select colaborador (2026-06-09)** — Deploy @717. Campo de email livre substituído por: (1) select "Todos os setores" populado via `ctrl_ponto_listar_colaboradores` + `SistemaConfigService.getSetores`; (2) select de colaboradores ativos, filtrado pelo setor selecionado. `carregarEspelho()` envia `colaboradorId` = stub ID (ex: COL-xyz); `_resolverColabId` já aceita IDs sem @. `_carregarFiltroColabs()` cacheia em `_todosColabs` e roda uma única vez no `aoAbrir()`.

**Fase anterior**: **Fix Ponto — Vínculos A-Z + loading icons + hint espelho vazio (2026-06-09)** — Deploy @715. (1) `ctrl_ponto_listar_sem_vinculo`: semVinculo ordenado por `localeCompare('pt-BR')`. (2) 10 ocorrências de `hourglass_empty` MS icon em estados de carregamento padronizadas para `<p class="muted-text">⏳ Carregando…</p>` (admin-pendentes, pessoas, afastamentos, ocorrências, solicitações, agendamentos, contratos, remanejamentos, aditivos, tarefas). (3) Espelho sem dados: quando sem `colaboradorId`, exibe banner informativo orientando a usar o campo e-mail.

**Fase anterior**: **Fix Ponto — aba Vínculos sempre vazia (campo semVinculo→colaboradores) (2026-06-09)** — Deploy @713. `ctrl_ponto_listar_sem_vinculo` retornava `{ semVinculo, usuarios }` mas frontend lia `r.data.colaboradores` → array sempre undefined → "Todos os colaboradores já estão vinculados". Corrigido renomeando para `{ colaboradores, usuarios }`.

**Fase anterior**: **Fix Ponto — "Pessoas no arquivo" ordenada alfabeticamente (2026-06-09)** — Deploy @712. Prévia AFD: lista de colaboradores do arquivo agora ordenada por `localeCompare('pt-BR')` antes de renderizar (era ordem de aparição no arquivo).

**Fase anterior**: **AFD — auto-criação de colaboradores + aba Vínculos (2026-06-09)** — Deploy @708. `confirmarImportacao` agora cria stubs de colaboradores automaticamente a partir dos registros tipo-5 (cadastro) do AFD para PIS ainda não cadastrados no sistema; tenta vincular ao usuário de acesso pelo nome via `_buscarColabPorNome` (fuzzy 75%); retorna campo `autoCriados` no resultado. Novo `_resolverColabId(orgId, email)` no controller de ponto: resolve email → `colabId` via `emailInstitucional` para que colaboradores logados vejam seu próprio espelho. Novos controllers: `ctrl_ponto_listar_sem_vinculo` (stubs sem email + lista usuários ativos) e `ctrl_ponto_vincular_colaborador` (seta `emailInstitucional`). Frontend: aba "Vínculos" (tabela select+botão Vincular); `_renderAfdPasso3` mostra 6 stats (Importados, Jornadas, Cadastrados, Sem vínculo, Duplicados, Erros) + mensagem autoCriados. **Pós-deploy obrigatório**: (1) executar `AfdLayoutRepository.prepararIndice()` no GAS Editor; (2) reverter sessões ruins e reimportar o arquivo AFD.

**Fase anterior**: **Fix AFD — layout posições tipo-3 e tipo-5 corrigidas + reverterImportacao remove brutos (2026-06-09)** — Deploy @707. Bug crítico: `datetimeOriginal` tinha `comprimento:25` mas o datetime do iDClass tem exatamente 24 chars. Isso deslocava o PIS 1 posição para a direita em todos os tipo-3 (batidas), produzindo um PIS nunca encontrado em `colaboradores.json` → todas as batidas viravam `sem_cadastro` → 0 registros confirmados → espelho "Ausente". Correções no layout `iDClass-BioProx-v1`: `datetimeOriginal` 25→24; tipo-3 `pis` posInicio 35→34; tipo-3 `hash` posInicio 47→46; tipo-5 `acao` posInicio 35→34; tipo-5 `pis` posInicio 36→35, comprimento 11→12. Bug secundário em `reverterImportacao`: não removia brutos de `ponto_bruto.json`, bloqueando re-importação do mesmo arquivo como "duplicado". Corrigido: adicionada chamada `PontoBrutoRepository.reverterSessao()` antes de registrar auditoria. **Pós-deploy obrigatório**: (1) executar `AfdLayoutRepository.prepararIndice()` no GAS Editor para aplicar upsert do layout corrigido; (2) reverter sessões ruins existentes e reimportar o arquivo AFD.

**Fase anterior**: **HUB-13 — Workflow de day-off de aniversário (2026-06-09)** — Deploy @706. `PessoasEngine.registrarDayoffAniversario()`: valida janela 7 dias, uso único por ano, cria afastamento `dayoff_aniversario` auto-aprovado (ativo). `ctrl_rh_solicitar_dayoff_aniversario()` sem restrição de papel. `carregarAniversariantes()` no TaskHubUI exibe botão "Solicitar Day-off" apenas no card do próprio aniversário (email comparado com boot). `_solicitarDayoff()` abre modal de confirmação; `_executarDayoff()` chama GAS e mostra toast. `AfastamentosUI._TIPO_LABEL` + select ganham opção. `ctrl_taskhub_aniversariantes()` agora inclui campo `email`.

**Fase anterior**: **Fix AFD — nome cortado (posInicio tipo-5) + upsert prepararIndice (2026-06-08)** — Layout iDClass Bio Prox: campo `nome` tipo-5 corrigido de posInicio 48→47 (PIS do tipo-5 é 11 posições, não 12); `cnpjSeq` 98→97; `hash` 113→112. `prepararIndice` alterado para upsert — atualiza o layout builtin a cada chamada, garantindo que correções de posição sejam aplicadas mesmo em ambientes que já tinham o layout instalado.

**Fase anterior**: **Fix Ponto — AFD aceita arquivo sem cadastro + fuzzy name matching (2026-06-08)** — (1) Fuzzy name matching: funções `_normalizarNome` (sem acentos/partículas) + `_buscarColabPorNome` (75% palavras em comum) + `_construirMapaNomes` (PIS→nome sistema). (2) `iniciarImportacao`: fallback nome quando PIS não casa; batidas sem vínculo salvas com status `sem_cadastro` (não bloqueiam importação). (3) `confirmarImportacao`: `sem_cadastro` ficam como brutos aguardando vinculação futura. (4) Frontend: 6 stats (Batidas, Via PIS, Via Nome, Sem cad., Dup., Erros); botão "Confirmar" ativo mesmo com 0 vinculados; passo-3 exibe "Pendentes".

**Fase anterior**: **Fix Ponto — preview AFD com nome e status de cadastro (2026-06-08)** — `gerarPreview`: pré-processamento em 2 passos para mapear PIS→nome dos registros de cadastro do AFD; campo `nomeAfd` em cada batida da amostra; lista `colaboradoresAfd` (100 PIDs distintos com nome e status noSistema). Frontend: nova seção "Pessoas no arquivo" mostrando todos os colaboradores do arquivo com ✓/✗ de cadastro; tabela de batidas com coluna "Nome (arquivo)".

**Fase anterior**: **Fix Ponto — 3 bugs de UX/performance (2026-06-08)** — (1) Abas "Custo CLT" e "Rescisão" removidas do módulo Ponto (pertencem ao RH/DP). (2) Folga de Sáb/Dom agora configurável via `parametros_rh.dias_folga` (array de números 0=Dom…6=Sáb); sem configuração, nenhum dia é automaticamente folga. (3) Loading eterno ao importar AFD grande: `nsrJaExiste` chamava `readJSON` N vezes por linha — substituído por pre-loading único dos NSRs em `gerarPreview` e `iniciarImportacao`. PRÓXIMO: executar `fase11_4_prepararIndice()` + `AfdLayoutRepository.prepararIndice()` no GAS Editor para criar a nova planilha PONTO.

**Fase anterior**: **Ponto — planilha dedicada SHEET_ID_PONTO — Deploy @701 (2026-06-08)** — Módulo Ponto extraído da planilha EQUIPES para planilha própria.

Arquivos modificados nesta sessão (Fase 5):
- `gas/src/frontend/index.html` (MOD) — Fase 5 UI importação AFD:
  - `GAS.ponto`: +8 bindings (previewAfd, iniciarImportacao, confirmarImportacao, cancelarImportacao, listarLayouts, listarSessoes, espelhoMensal, processarJornada)
  - Tab "Colabore AFD" → "AFD" + nova aba "Sessões"
  - Aba AFD: seção Importar substituída por botão "Importar AFD" (abre wizard modal)
  - Nova aba Sessões: tabela de histórico de importações
  - `PontoUI.carregarEspelho()` → usa `espelhoMensal` (jornadas.json) com tabela dia-a-dia (data, entrada, saída, batidas, trabalhado, status)
  - Modal wizard 3 passos: Passo 1 (arquivo+layout) → Passo 2 (prévia: stats+amostra 20 batidas) → Passo 3 (resultado: importados, jornadas, duplicados, erros)
  - `PontoUI.carregarSessoes()`: tabela de sessões (data, arquivo, layout, batidas, erros, status, importado por)

**Antes de testar** — executar no GAS Editor (uma vez, na ordem):
1. `AfdLayoutRepository.prepararIndice()` — instala layout iDClass builtin
2. `PontoBrutoRepository.prepararIndice()` — cria abas PontoBruto + PontoImportacoes
3. `JornadaRepository.prepararIndice()` — cria aba Jornadas

Fases pendentes do motor AFD:
- Fase 6: Editor visual de layouts (arrastar colunas, ativar/desativar campos)
- Fase 7: Exportações configuráveis (Excel/CSV/TXT/Espelho por template)
- Fase 8: Banco de horas com rollback por sessão
- Fase 9: Testes + validação com arquivo iDClass real

**Fase anterior**: **UX: PCCS chevron+busca rápida; Equipe email vinculado+cargos A-Z (2026-06-08)** — PCCS: cabeçalho de cada plano clicável (chevron `expand_more` com toggle collapse do body). Campo de busca acima da tabela de cargos com filtro em tempo real (oculta linhas e cabeçalhos de área vazios). Equipe: `<input type="email">` substituído por `<select>` populado via `_carregarSelectUsuariosHelper` (lista `ctrl_admin_listarUsuariosAtivos`). Dropdown de cargos ordenado alfabeticamente com `localeCompare('pt-BR')`.

**Fase anterior**: **TAR-04 — Gatilhos automáticos de tarefas (2026-06-08)** — Deploy @694. (1) `TarefaEngine.verificarPrazos(orgId)`: usa `TarefaRepository.listarAtrasadas()`, marca `atrasoNotificadoEm=hoje` nas novas atrasadas, emite `TASK_DELAYED` — notificação única por tarefa. (2) `event_handler_registry.gs`: handler `TASK_DELAYED` envia e-mail ao responsável com prazo e link; handler `TAREFA_CRIADA` notifica responsável quando tarefa é atribuída por outra pessoa. (3) `verificarPrazosTarefas()` global + `criarTriggerVerificacaoPrazos()` — trigger diário 08:00. (4) `ctrl_tarefas_verificar_prazos()` — entrada manual (admin/superadmin). (5) index.html: view de Gestão com cards expandíveis completos (detalhe, Concluir, Próximo Status, Excluir via modal) + `confirm()` nativo substituído por `_abrirModalConfirmar()`.

**Fase anterior**: **Fix: Tarefas — visibilidade, auto-criação e view de gestão (2026-06-08)** — Deploy @689+pendente. Auto-task removida de `RESERVATION_CREATED`, `KEY_PROTOCOL_DELAYED` e `ITEM_NOT_RETURNED`. Visibilidade de gestor: setor próprio + criou/é responsável. `ctrl_tarefas_gestao` agrupa por setor ou responsável. Sub-tab "Gestão" com barra de progresso e lista prévia. Responsável obrigatório.

**Fase anterior**: **Fix: exclusão de tarefas (2026-06-08)** — Deploy @689. Botão "Excluir" adicionado ao painel expansível de cada tarefa; `GAS.tarefas.excluir` mapeado para `ctrl_tarefas_excluir`; confirmação via `confirm()` antes de deletar; lista recarregada após sucesso.

**Fase anterior**: **Fix: selects de setor vinculados ao catálogo (2026-06-07)** — Deploy @681. Quatro pontos corrigidos: (1) `AcoesUI.abrirForm()`: `window._boot` → `App.getBoot()` para popular `#acao-setor` (select estava sempre vazio). (2) `PessoasUI`: `#pf-setor` convertido de `<input type="text">` para `<select>` populado via boot; `abrirForm()` injeta opções do catálogo de setores. (3) `RhUI.abrirFormColab()`: `#rh-pf-setor` idem, convertido e populado. (4) `ComprasUI.abrirNova()`: `window._BOOT_DATA` → `App.getBoot()`; `#cmp-depto` convertido de text input para `<select>` com pré-seleção do setor do usuário logado.

**Fase anterior**: **Fix: Tarefas como 4ª aba do Meu Centro (2026-06-07)** — Deploy @681 (mesmo deploy). Tarefas removida do menu lateral; integrada como aba dentro do `#view-taskhub`. (1) `#th-tab-tarefas` criada no HTML do TaskHub com formulário Nova Tarefa + lista expandível (IDs idênticos). (2) `TaskHubUI.setTab()` ampliado para 4 abas (meuDia/meuTime/produtividade/tarefas); chama `TarefasUI.aoAbrir()` ao ativar tarefas; fallback de botão por `data-tab`. (3) `abrirItem('tarefa',...)` agora chama `setTab('tarefas', null)` em vez de `Router.navegar('tarefas')`. (4) `_MODULOS_MENU`: entrada `tarefas` removida. (5) `Router.registrar('tarefas', ...)` mantido para compatibilidade com rotas externas — redireciona para `taskhub` + ativa aba tarefas. (6) Botão "Tarefas" no header e "Nova Tarefa" em meuDia removidos. `#view-tarefas` mantido vazio como stub de roteamento.

**Fase anterior**: **Fix: Tarefas integrada ao Meu Centro + cards expandíveis (2026-06-07)** — Deploy @676. (1) Sidebar: Tarefas movida de GESTÃO para PRINCIPAL (logo após Meu Centro). (2) Meu Centro: botão "Tarefas" no header. (3) TarefasUI: cards click-to-expand com painel de detalhe (prazo, prioridade, vínculo navegável, Concluir + próximo status). (4) Borda esquerda colorida por prioridade; destaque vermelho em atrasadas; linha riscada em concluídas. (5) Títulos auto-criados sem ID bruto da reserva.

**Fase anterior**: **Home contextual por papel — HOME-01/02/03/04 (2026-06-07)** — Deploy @677. `_renderizarHome()` bifurcada: superadmin/admin veem stats de sistema (espaços/setores/módulos/status); demais papéis recebem home async com 4 cards clicáveis (tarefas abertas, encaminhamentos pendentes, urgentes/vencidos, aprovações ou alertas conforme papel), acesso rápido contextual por papel e widget "Aniversariantes da Semana". Reutiliza `ctrl_taskhub_minha_caixa()` e `ctrl_taskhub_aniversariantes()` sem novos endpoints. Novo `#home-aniversariantes` no HTML.

**Fase anterior**: **Arq: multi-tenant + remoção de hardcodes institucionais (2026-06-07)** — Deploy @675. (1) `SHEET_ID_INSTITUICOES` adicionado ao `PROP_SHEETS` + `SCHEMA_ABAS` como hub central de registros de instituições. (2) `OrgRegistryService` atualizado: campo `sheetIds` no registro, `_indexarCentral()` grava aba `Instituicoes` + `SheetIds` na planilha hub; chamado a cada `registrarOuAtualizar`. (3) `inicializarSistema()`: auto-registra org com todos os Sheet IDs; seeds CCBJ-específicos removidos (movidos para `setupInicialCCBJ()`). (4) `config.gs`: defaults 'CCBJ'/'Centro Cultural Bom Jardim' removidos — sistema sem PropertiesService configurado retorna string vazia. (5) `router.gs`: endpoint `?secao=public_config` retorna JSON com nome/domínio/logo/paleta; `mapaTemplate` injetado no template do app (lê `ORG_MAPA_TEMPLATE` do PropertiesService). (6) `public/index.html`: fetch dinâmico do config em `?secao=public_config` substitui nome/domínio/logo/paleta hardcoded. (7) `portal_processo.html`: usa `<?= orgConfig.nome ?>` no título/header/footer. (8) `acervo_engine.gs`: `_getPastaBase()` usa `getOrgConfig().nome`. (9) `frontend/index.html`: `include(mapaTemplate)` em vez de `include('shared/mapa_ccbj')`. (10) Novo `shared/mapa_sem_planta.html`: exibido para instituições sem `ORG_MAPA_TEMPLATE` configurado. Para CCBJ: executar `setarMapaTemplateCCBJ()` no GAS Editor após deploy.

**Fase anterior**: **Fix: botões externos — ScriptApp.getService().getUrl() (2026-06-07)** — Deploy @673. 4 links/botões que abriam URLs quebradas (`googleusercontent.com` em vez do `/exec`) corrigidos: Visualizar Cadastro (Admin), Abrir Wizard de Setup, Portal Público (Agentes) e hint do checklist de provisionamento. Causa raiz: dentro do iframe GAS, `window.location.href` e URLs relativas como `?secao=X` resolvem para o host do iframe, não para o URL de produção. Solução: `template.serviceUrl = ScriptApp.getService().getUrl()` injetado no `_renderAppInterno` do `router.gs`; todos os pontos usam `<?= serviceUrl ?>` como base.

**Fase anterior**: **Fix: manual — auditoria completa lote 2 (2026-06-06)** — Deploy @668. 13 seções auditadas e corrigidas: estratégia (eixos→horizonte, KPIs auto-calculados, riscos auto-calculados, form sem "eixo"); reservas-carro (campos reais: setor, passageiros, localização com mapa); ponto (registro de ponto sem gate feat.editar — disponível a todos); rh (PCC→PCCS, todas as abas documentadas); contratacoes (FSM real: rascunho/submetida/devolvida/aprovada_gestor/aguard_cotacoes/cotacoes_recebidas/aprovada_financeiro/em_instrucao/em_execucao/concluida); escuta-lgpd (CORRETO — sem alteração); financeiro (Rubricas→Fontes de Recurso, add Aditivos+Exportações, remove bloco gerar_holerite morto); comunicacao (CORRETO — sem alteração); voluntarios (campos reais: nome/email/telefone/competências, aba Alocações); agentes (campos reais: tipo/CPF_CNPJ/nome/nomeArtístico/áreas/linguagens, remove "links portfólio"); relatorios (sem view dedicada — exports distribuídos por módulo documentados); admin (add abas Cadastros Base: Features/Identidade Visual/Banco de Dados/Ferramentas, turnos).

**Fase anterior**: **Fix: manual — divergências passo a passo (2026-06-06)** — Deploy @665. 4 divergências corrigidas: (1) Ações Culturais: FSM reescrito com estados reais (Planejada → Em Produção → Em execução → Concluída → Arquivada); "Rascunho/Em análise/Aprovada" removidos. (2) Aprovações: tabs reais descritas (Reservas/Acessos/Carros/Permissões); "Ações culturais" e afirmação de 48h removidos. (3) Público: certificado agora descrito como ação explícita (frequência mínima 75%), não automática.

**Fase anterior**: **Fix: manual sidebar — texto ativo invisível (2026-06-06)** — Deploy @663. `.manual-nav-item.ativo` usava `background: var(--sidebar-active)` (rgba branco transparente, projetado para a sidebar escura) + `color: #fff`, deixando o texto sumido no fundo claro do painel do manual. Corrigido para `background: var(--color-primary-lt)` + `color: var(--color-primary)`.

**Fase anterior**: **Docs: manual corrigido pós-investigação (2026-06-06)** — Deploy @662. Investigação sistemática confirmou 17/19 itens corretos. 2 divergências corrigidas: (1) Meu Time agora descreve que a aba é visível para todos mas o conteúdo é bloqueado no backend — e inclui "coordenador" no rol de papéis autorizados. (2) Aprovações no Meu Dia: texto corrigido de "gestores/habilitadores" para "gestores, admins e superadmins" (habilitador não está no código do controller).

**Fase anterior**: **Docs: manual atualizado (2026-06-06)** — Deploy @661. Seções `taskhub`, `tarefas`, `balcao`, `pessoas` e `reunioes` do `manual.html` reescritas para refletir a implementação real: TaskHub com 3 abas + 6 fontes Meu Dia + grupos de prioridade + aniversariantes + navegação por clique; Tarefas com campo prazo, vínculo dinâmico (Ação/Reserva/Contrato), badges na lista e botão Concluir direto; Balcão reescrito como canal de serviços de comunicação (fluxo 7 etapas, SLA por tipo, versões, comentários, empty states); Pessoas com campo dataNascimento e callout de aniversariantes; Reuniões com seção de encaminhamentos (responsável + prazo + e-mail + integração Meu Dia).

**Fase anterior**: **Auditoria HUB-11 + HUB-12 (2026-06-06)** — Deploy @657. HUB-11: `_renderItem` enriquecido com metadados por tipo; bug colateral corrigido — extras de demanda usavam chave `tipo` que sobrescrevia o tipo externo em `_itemCaixa` (ícone ficava `circle`); renomeado para `tipoDemanda`/`statusDemanda`. HUB-12: `dataNascimento` adicionado ao `ColaboradorRepository` (_HEADERS + _serializarIndice) e ao form Pessoas (pf-nascimento); `ctrl_taskhub_aniversariantes()` busca colaboradores com aniversário nos próximos 7 dias; seção "Aniversariantes" exibida abaixo das pendências no Meu Dia com cards coloridos (hoje = accent). Próximos: TAR-04 (gatilhos automáticos), HUB-13 (dayoff de aniversário). HUB-03 CORRIGIDO: bug crítico — `readJSON('solicitacoes_reserva.json')` sempre retornava null; substituído por `SolicitacaoReservaRepository.listarPorStatus('pendente', orgId)` (dados vivem em Sheet, não JSON). `.includes()` → `.indexOf()` para ES5. HUB-07 CORRIGIDO: chaves atrasadas (`status='atrasado'`, `responsavel=email`) adicionadas como 6ª fonte; ícone `key`, click → Espaços. HUB-08 CORRIGIDO: botão "Nova Tarefa" no header do Meu Dia → navega para view Tarefas. Próximos: HUB-11/12 (aniversariantes), TAR-04 (gatilhos automáticos).

**Fase anterior**: **Auditoria HUB-10 (2026-06-06)** — Deploy @648.

**Fase anterior**: **Feature: Reservas por clique direto na Agenda/Diagrama/Mapa (2026-06-06)** — Deploy @645. (1) Agenda: clique em slot vazio de qualquer dia futuro/hoje abre form pré-preenchido com data + horário calculado pela posição Y do clique (arredondado a 30min); dias passados permanecem não clicáveis (cursor:default). (2) Diagrama: clique em área vazia na linha de um espaço abre form pré-preenchido com espaço + data + horário calculado pela posição X do clique. (3) Mapa: clique em espaço com status `disponível` e `aceitaReserva!==false` abre form diretamente (bypassa painel lateral); demais status continuam abrindo o painel lateral. Novos handlers: `_ragClickVazio`, `_rdgClickVazio` (expostos na API pública do ReservasUI); mapa_ui.html/_initIO modificado.

**Fase anterior**: **Auditoria CAR-06/07 (2026-06-06)** — Deploy @644. CAR-06 CORRIGIDO: `ctrl_carro_dados` enriquece lista com `solicitanteNome`/`aprovadorNome` via `AcessoService.listarUsuarios()` (mapa bulk); frontend exibe nome no card com email no `title`. CAR-07 CORRIGIDO: aprovador exibe "Aprovado por: Nome" em vez de "Aprov: email-prefix". CAR-03/04 verificados corretos.

**Fase anterior**: **Auditoria HUB-04/05/09 (2026-06-06)** — Deploy @643. HUB-04 CORRIGIDO: empty state da aba "Meu Time" agora orienta o usuário com CTA (criar tarefas em Tarefas / encaminhamentos em Reuniões). HUB-05 CORRIGIDO: unidade '(h)' movida para o label do card de Tempo Médio; valor de Dias Médios sem 'd' embutido. HUB-09 CORRIGIDO: `ctrl_taskhub_meu_time` enriquece cada entrada com nome via `AcessoService.listarUsuarios()` (mapa bulk); frontend exibe `p.nome || p.email` com `title` mostrando o email completo.

**Fase anterior**: **Auditoria CAR-11 (2026-06-06)** — Deploy @641. CAR-11 CORRIGIDO: (1) Agenda de veículos: dias passados renderizados sem `onclick`, com `cursor:default` e `opacity:.55` (não clicáveis). (2) `_abrirFormularioDia(ds)`: guarda contra `ds < hoje` com `Toast.aviso()` e return. (3) Nova função `_onDataChange()`: quando data = hoje, define `min` nos inputs de hora saída/chegada com hora atual; remove `min` para datas futuras. (4) Input `carro-f-data` ganhou `onchange="ReservasCarroUI._onDataChange()"`. Bloqueio visual agora opera nas três camadas: agenda → datepicker → hora.

**Fase anterior**: **Auditoria CAR-09 + CAR-10 (2026-06-06)** — Deploy @638. CAR-09 CORRIGIDO: passageiros separados em internos (select de colaboradores com chip tags, `_passInternosData[]`, `_adicionarPassInterno/removerPassInterno`) e externos (texto livre, comma-separated). Backend: campos `passageirosInternos`, `passageirosExternos` adicionados ao `inserir()`; legado de `passageiros[]` preservado para compatibilidade. CAR-10 CORRIGIDO: seção "Paradas intermediárias" adicionada ao formulário — lista dinâmica via `_adicionarParada()`, inputs com remoção por ×; `salvar()` coleta via `_getParadas()`; backend: `rota.paradas[]` persistido; modal de detalhes renderiza sequência completa Saída → Parada1…N → Chegada com ícones dinâmicos.

**Fase anterior**: **Auditoria CAR-08 + FIN-12 (2026-06-06)** — Deploy @637. CAR-08 CORRIGIDO: linha dedicada "Setor Solicitante" adicionada ao modal `carro-det-overlay` (HTML `carro-det-setor-bloco/carro-det-setor`); `_verDetalhesAgenda` atualizado para popular setor em linha própria (separado do nome do solicitante). FIN-12 CORRIGIDO: (1) `_carregarHistorico`: tabela ganha coluna com botão "Ver diff" por versão. (2) `_verDiffContrato(versaoNum)`: abre modal via `_abrirModalSimples` comparando snapshot × estado atual em 7 campos-chave (status, nome, número, vigência, valor, nº metas), destaca em azul campos alterados e conta diffs. (3) `_restaurarVersao` + `_executarRestaurar`: fluxo de restauração com confirmação — salva estado atual como nova versão antes de restaurar. (4) Backend: `ContratosEngine.restaurarVersao` (salva backup → escreve snapshot preservando id/orgId → registra auditoria) + `ctrl_contrato_restaurar_versao` + `GAS.contratos.restaurar` binding.

**Fase anterior**: **Auditoria FIN-09 + FIN-11 + FIN-18 (2026-06-06)** — Deploy @635. FIN-09 CORRIGIDO: aba "Fontes de Recurso" adicionada à view-financeiro (tab button `data-tab="fontes"` + div `fin-tab-content` com form `ff-*`, lista e métricas); `FontesRecursoUI._confirmarMudarStatus()` → `FontesUI._confirmarMudarStatus()`. FIN-11 CORRIGIDO: aba "Execução" adicionada ao painel de detalhe do contrato (tab button + div `cd-tab-execucao`; `_tabs()` atualizado; `carregarExecucao()` cruza rubricas do PT com `GAS.contratacoes.listar({contratoId})` para exibir Previsto × Comprometido × Executado × Saldo com barra de progresso por rubrica). FIN-18: flag `voucher_uber` já coberto pelo FIN-20 (@620) — marcado como corrigido.

**Fase anterior**: **Pulse — setor por catálogo Admin + modal aprovação (2026-06-06)** — Deploy @633. PUL-08 CORRIGIDO: (1) `escuta_pulse.gs/_calcPorSetor`: cruza `u.setor` (id) com `SistemaConfigService.getSetores()` para exibir label canônico do catálogo Admin/Setores; remove fallback `setorDesejado` (texto livre). (2) `index.html`: aprovação de acesso migrada de botão simples para modal `_modalAprovacao` com `<select>` de setores do catálogo Admin (pré-selecionado pelo hint `setorDesejado`), select de papel e validação obrigatória de setor; `_pendentes` como variável de módulo para lookup sem DOM.

**Fase anterior**: **Pulse — clima por setor (2026-06-06)** — Deploy @631. PUL-07 CORRIGIDO: (1) `escuta_pulse.gs/_calcPorSetor`: usa `u.setor || u.setorDesejado` como fallback — aprovações rápidas que deixavam setor vazio agora caem no setorDesejado do colaborador; usuários sem nenhum setor são excluídos em vez de agrupados em 'Sem setor'. (2) `index.html/_carregarPendentes`: botão "Aprovar" adiciona `data-setor` com o `setorDesejado`; `aprovar(email, setor)` repassa o setor ao `aprovarAcesso`; novas aprovações já definem setor corretamente desde o início.

**Fase anterior**: **Auditoria FIN-19 + FIN-20 + CON-09 (2026-06-06)** — Deploy @620. (1) FIN-19 CORRIGIDO: `contrato_repository.gs/adicionarRubrica` agora inclui `setor` no mapeamento dos itens de `memoriaCalculo` — campo era enviado pelo frontend mas descartado na normalização. (2) FIN-20 CORRIGIDO: sistema de flags de operação por rubrica implementado — checkbox "Permite solicitação de voucher Uber" no form (`cd-rub-flag-voucher-uber`); badge "Uber" no card da rubrica quando ativo; `flags:{voucher_uber:bool}` adicionado ao `dados` em `salvarRubrica`; restore do estado no `editarRub`. (3) CON-09 CORRIGIDO: campo "Atividade" nas parcelas de contratações vira `<select>` populado com as atividades da meta selecionada (via `_atvOptions`); mantém `<input type="text">` quando não há meta vinculada; `_coletarParcelas` usa `[data-atv]` para ler input ou select; `_atvOptions` reseta em `_limparForm`, `onContratoSelecionado` e `onMetaSelecionada`.

**Fase anterior**: **Auditoria SIS-10 restante — modais carro + Contratos Detail (2026-06-06)** — Deploy @618. `carro-modal-box`: `overflow-y:auto` removido da box; `display:flex;flex-direction:column;overflow:hidden` adicionado; header + body scrollável + footer sticky. `cd-meta-modal`, `cd-pes-modal`, `cd-indr-modal`: `modal-box-animar` → `modal-box` (que já tem flex column + overflow:hidden); header inline → `<div class="modal-header">`; body inline → `<div class="modal-body">`; botões removidos do body → `<div class="modal-footer">`. SIS-10 CORRIGIDO completo.

**Fase anterior (2)**: **Pulse — fix fonte de usuários + marcadores metodológicos (2026-06-06)** — Deploy @616. 3 inconsistências visuais corrigidas: (1) `_calcConfianca`, `_metaDimensao` e `_calcPorSetor` trocaram `ColaboradorRepository` por `AcessoService.listarUsuarios()` — agora reflete os 9 usuários ativos, não apenas o(s) formal(is) em EQUIPES.Funcionarios; setor cruzado por `u.email`. (2) Monitoramento pulse: mesmo fix — `totalSemAtividade` usa `email` do AcessoService. (3) Marcadores metodológicos: labels `(pesquisas formais)` e `(pulse)` adicionados para eliminar contradição visual entre "0/8 dimensões com dados" e "8 dimensões com coleta".

**Fase anterior**: **Pulse — multiplataforma + relatório por setor + fix anti-spam (2026-06-06)** — Deploy @609.

**Fase anterior**: **Auditoria SIDEBAR-04 — Consolidação seção MEMÓRIA (2026-06-06)** — Deploy @614. 4 itens do menu (Agentes, Acervo, Voluntários, Parcerias) substituídos por 1 item "Memória Institucional" com tab-bar interna. `view-memoria` criada com painel para cada sub-módulo; `MemoriaUI` IIFE gerencia as abas. Sidebar total: ~17 itens visíveis.

**Fase anterior**: **Integração Firebase Hosting + URL routing por módulo (2026-06-06)** — Deploy @599 (GAS) + deploy Firebase automático via GitHub Actions. `public/index.html` criado como página de redirecionamento com design do sistema (gradiente roxo `#4c1d95→#24104f`, Inter + Material Symbols, ícone `museum`, barra de progresso accent animada, spinner, redirect 2,5 s via JS preservando query params, fallback link manual). `firebase-hosting-merge.yml` — deploy automático ao push na `main` via `FIREBASE_SERVICE_ACCOUNT_CCBJ_SISTEMADEGESTAO`. Router SPA: `_pushUrl(id)` com `google.script.history` (primeira navegação usa `replace`, demais usam `push`); `setChangeHandler` para Voltar/Avançar do browser; `_getSecaoUrl()` lê `?secao=` na carga e navega direto ao módulo correto. `.firebase/` adicionado ao `.gitignore`.

**Fase anterior**: **Auditoria SIS-13 — campo "responsável" texto livre (2026-06-06)** — Deploy @596. 5 campos convertidos de `<input type="text/email">` para `<select>` populado por `_carregarSelectUsuariosHelper`. Campo `par-resp` (Parcerias) mantido como texto — contato externo.

**Fase anterior**: **Auditoria SIS-10 — layout de modais inconsistente (2026-06-05)** — Deploy @594. Correção do padrão flex nos 3 modais com header scrollável: `rece-modal`, `run-modal`, `bl-modal`. Em cada um: removido `overflow-y:auto` do `.modal-box` inline (conflitava com `overflow:hidden` da classe CSS que mantém layout flex column); adicionado `<div class="modal-body">` envolvendo o conteúdo (scrollável, `flex:1`); `.modal-footer` movido para fora do `<form>` e migrado de inline style para classe CSS `.modal-footer`. Resultado: `.modal-header` fica fixo no topo enquanto o corpo rola. Modais restantes (`carro-modal`, modais de Contratos Detail) têm o mesmo padrão mas conteúdo curto — anotados para fase posterior.

**Fase anterior**: **Auditoria SIS-01 — prompt()/confirm() remanescentes (2026-06-05)** — Deploy @593. (1) `restaurarPadrao()` (linha 9665): `if(!confirm(...))` inline migrado para `var _conf = confirm(...); if(!_conf) return;`. (2) `_usarTemplateAta()` (linha 28116): `if(el.value.trim() && !confirm(...))` migrado para bloco `if(el.value.trim()){ var _conf = confirm(...); if(!_conf) return; }`. (3) **Bug real corrigido**: `suspender(id)` nos Contratados — `_raw` (motivo) capturado via `prompt()` mas nunca passado à API; cadeia inteira atualizada: frontend passa `motivo`, GAS binding atualizado `(id,s,motivo,cb,err)`, `ctrl_contratados_mudar_status(id,novoStatus,motivo)`, `ContratadoEngine.mudarStatus(id,novoStatus,email,orgId,motivo)`, `_transitarContratado(contratado,novoStatus,email,motivo)` — motivo agora gravado em `contratado.motivoUltimaAlteracao` e no audit `CONTRATADO_STATUS_ALTERADO`. Anti-padrão crítico (`|| ''` antes do null-check) confirmado ausente em todas as 30+ chamadas encontradas.

**Fase anterior**: **Auditoria SIDEBAR/ESTR — Consolidação do menu lateral (2026-06-05)** — Deploy @590. `_MODULOS_MENU`: `pessoas`, `ponto`, `balcao`, `estrategia` removidos do sidebar (views ainda acessíveis via cross-navigation e Router.registrar explícito); `rh` renomeado "Pessoas / RH"; `taskhub` movido para posição #2 (logo após Início). Cross-nav adicionado: `view-rh` ganha botões "Fichas" e "Ponto"; `view-pessoas` ganha "RH / DP"; `view-ponto` ganha "RH / DP"; `view-comunicacao` ganha "Balcão"; `view-balcao` ganha "RECE". Headers de `view-rh`, `view-pessoas`, `view-ponto` migrados para padrão `view-header/view-title/view-subtitle`. SIDEBAR-02, ESTR-01, SIDEBAR-05 CORRIGIDOS. SIDEBAR-04 parcialmente resolvido (-5 itens).

**Fase anterior**: **Auditoria APR — Bugs Aprovações (2026-06-05)** — Deploy @589. APR-01 CORRIGIDO: badge de contador adicionado à aba "Reservas de Espaço" (`badge-aprov-reservas`); `_atualizarBadgeReservas()` criada; `carregar()` agora chama `_atualizarBadgeReservas` em vez de sobrescrever total do sidebar. APR-02 CORRIGIDO (já estava): `modulo:null` no menu — sem restrição RBAC ESPACOS. APR-06 CORRIGIDO (já estava): cabeçalho usa `view-header/view-title/view-subtitle`.

**Fase anterior**: **Fase 79 — Integração de Materiais nas Reservas (2026-06-05)** — Deploy @584. `reservas_controller.gs`: `ctrl_reservas_criar` estendido para extrair `dados.itensMateriais` (array `{itemId, descricao, qtdSolicitada}`) antes de passar ao engine; após criar reserva, chama `EstoqueEngine.novaSolicitacao` com `reservaId` e `setorDestino`; retorna `{...reserva, solicitacaoCodigo}` — falha na solicitação não cancela a reserva (best-effort + Logger.warn). `index.html`: `_carregarDisponibilidadeItens()` migrado de `GAS.reservas.disponibilidadeItens` (catálogo almoxarifado V1) para `GAS.estoque.listarItens({visivelSolicitantes:true})` (novo sistema Fase 73+); normaliza `{id, descricao, saldoDisponivel}` → `{id, nome, disponivel}` para compatibilidade com chips; label do bloco alterado de "Itens solicitados (almoxarifado)" para "Materiais necessários" com subtítulo explicativo; `salvar()` adiciona `dados.itensMateriais` para novas reservas com chips; toast pós-criação exibe "Reserva criada · Materiais: SOL-XXXX" quando solicitação é gerada. **Limpeza (2026-06-05)**: `fase75_inspecionar_estoque_v1()` e `fase75_importar_consumiveis_v1()` removidas de `migracao_estoque_v1.gs` — não há consumíveis V1 para migrar; consumíveis no V2 são cadastrados manualmente. **PRÓXIMOS PASSOS**: (1) GAS Editor (pendentes de sessões anteriores): `fase73_estoque_prepararIndice()`, `fase78_inspecionar_ativos_v1()`, `fase78_migrar_ativos_para_estoque()`. (2) Bugs FIN-19, FIN-20, CON-09.

**Fase anterior**: **Fase 78 — Integração Patrimônio → Estoque (2026-06-05)** — Deploy @583. `item_estoque_repository.gs`: schema expandido de 18 → 28 colunas (NumeroPatrimonio, StatusItem, Localizacao, Responsavel, AcaoId, DataAquisicao, NotaFiscal, VidaUtilAnos, ProximaManutencao, UltimaManutencao); filtro por `statusItem` em `listar()`; métricas incluem breakdown patrimonial. `estoque_engine.gs`: FSM `item_patrimonio` (disponivel→em_uso|manutencao|baixado) + `mudarStatusItem/registrarUsoItem/devolverItem/enviarManutencaoItem/concluirManutencaoItem/registrarBaixaItem`. `estoque_controller.gs`: 6 novos endpoints patrimônio (`ctrl_estoque_listar_patrimonio`, `registrar_uso`, `devolver_item`, `enviar_manutencao`, `concluir_manutencao`, `baixar_item`). `migracao_estoque_v1.gs`: `fase78_inspecionar_ativos_v1()` + `fase78_migrar_ativos_para_estoque(opcoes)`. `index.html`: sub-aba "Patrimônio" no EstoqueUI; 8 novos GAS.estoque.* bindings.

**Fase anterior**: **Fase 77 — Performance: Dashboard endpoints + Cache layer + Devolução de Estoque (2026-06-05)** — Deploy @581. `data_gateway.gs`: `atualizarLinhaPorColuna`/`removerLinhaPorColuna` agora usam `TextFinder` (10–50× mais rápido que getDataRange). `utils.gs`: `_getSheet` com cache de referência por execução. `item_estoque_repository.gs`: `_SHEET_KEY` migrado de `SHEET_ID_MASTER` → `SHEET_ID_ESTOQUE`; schema expandido com colunas `Tipo` e `Tombado` (16→18 col). `estoque_engine.gs`: FSM `finalizada→devolvida` + `devolverSolicitacao()` (permanentes: restaura saldo; consumíveis: apenas log). `estoque_controller.gs`: cache layer em `listar_itens`; novos `ctrl_estoque_dashboard`, `ctrl_estoque_devolver_solicitacao`, `ctrl_estoque_excluir_item`. `tarefas_controller.gs`: `ctrl_tarefas_dashboard` (lista + métricas inline, sem segunda leitura de JSON). `acoes_controller.gs`: `ctrl_acoes_dashboard` (lista + métricas, cache 120s). `reuniao_controller.gs`: cache em `listar`; `ctrl_reunioes_dashboard`; invalidação em mutations. `index.html`: 4 bindings `GAS.*.dashboard` + `excluirItem` + `devolverSolicitacao`; TarefasUI/EstoqueUI/AcoesUI/ReunioesUI refatorados de 2 GAS calls → 1. **PRÓXIMOS PASSOS**: (1) Executar no GAS Editor: `fase73_estoque_prepararIndice()` (abas em ESTOQUE, não MASTER), `fase75_inspecionar_estoque_v1()`, `fase75_importar_consumiveis_v1()`. (2) Fase 78 — Integração de Materiais nas Reservas.

**Fase anterior**: **Fase 76 — Compras migrado de Financeiro → Contratações (2026-06-05)** — Deploy @579. Decisão arquitetural: Compras/Aquisições é domínio cotidiano de contratações, não de gestão de projetos. Mudanças: `solicitacao_compra_repository.gs` movido para `modules/contratacoes/` (storage migrado de MASTER → SHEET_ID_FINANCEIRO.SolicitacoesCompra — alinhado com PregaoRepository e SolicitacaoRepository do mesmo módulo); `ctrl_compra_*` removido de `financeiro_controller.gs` e adicionado em `contratacoes_controller.gs` (usando `_ctxContratacoes()` e `_PODE_APROVAR_FINANCEIRO`); tab "Compras" removida de `view-financeiro` e adicionada em `view-contratacoes` (nova tab button + `cont-tab-content#cont-tab-compras`); `SCHEMA_ABAS.FINANCEIRO` atualizado com `SolicitacoesCompra`; `setup.gs` inclui `SolicitacaoCompraRepository.prepararIndice()` em `inicializarSistema()`. **PRÓXIMOS PASSOS**: (1) Rodar `fase76_compras_prepararIndice()` no GAS Editor para criar FINANCEIRO.SolicitacoesCompra; (2) Se houver dados em MASTER.SolicitacoesCompra, rodar `fase76_compras_migrarDoMaster()` para migrar; (3) Financeiro agora é exclusivo de gestão de projetos (Contratos, Remanejamentos, Aditivos, Exportações).

**Fase anterior**: **Fase 75.1 — Migração de Estoque V1→V2 + limpeza de migrações mortas (2026-06-05)** — Deploy @566.

**Fase anterior (2)**: **Fase 75 — Pipeline visual + Alertas Inteligentes de Estoque (2026-06-05)** — Deploy @564. Novos arquivos: `gas/src/modules/estoque/previsao_estoque_engine.gs` — `calcularTaxaConsumo()` (histórico de saídas → mediaDiaria + diasAteEsgotar), `calcularCoberturaDuraveis()` (reservas futuras com materiaisReservados), `previsaoTodosItens()` (todos itens com saldo por depósito + taxa de consumo). `estoque_controller.gs`: `ctrl_estoque_previsao(dias)` — chama `previsaoTodosItens`. `alertas_engine.gs`: `_verificarEstoqueItens()` (emite ESTOQUE_ITEM_CRITICO/BAIXO/PREVISTO_ACABAR para itens críticos) + `_verificarSolicitacoesPendentesEstoque()` (emite SOLICITACAO_SEM_SEPARACAO se pendente >24h). `index.html`: novo binding `GAS.estoque.previsao(dias, cb, err)`, nova sub-aba "Pipeline" na barra de sub-abas do EstoqueUI, `<div id="est-tab-pipeline">` com select de período + div de lista, `_carregarPipeline()` — barras de progresso verde/amarelo/vermelho por depósito (verde se ok, amarelo se baixo/previsto_acabar, vermelho se zerado), ações contextuais "Transferir p/ Rápido" e "Registrar Compra". **PRÓXIMO PASSO**: Fase 76 — integração de Materiais nas Reservas (seção "Materiais necessários" no formulário de ReservaUI + criação automática de SolicitacaoMaterial vinculada).

**Fase anterior**: **Fase 74 — Frontend EstoqueUI completo (2026-06-05)** — Deploy @563. `gas/src/frontend/index.html` (+951 linhas): (1) **GAS.estoque** namespace com 15 bindings; (2) **Tab "Estoque"** adicionada na barra de tabs do módulo Infraestrutura (entre Patrimônio e Configurações); (3) **`<div id="esp-tab-estoque">`** com 5 sub-abas: Itens, Estoque, Solicitações, Entradas, Relatórios; (4) **`EstoqueUI`** IIFE com ~500 linhas.

**Fase anterior**: **Fase 73 — Sistema multi-nível nos mapas (2026-06-04)** — Deploy @554. Backend: `nivel` no schema de espaço; `lerNiveisMapa`/`salvarNiveisMapa` em `config_org.json`; dois toggles por nível (`usarTerrenoBase` + `usarPlantaBase`); padrão = herdar ambos. InfraConfigMapaUI: botão "Níveis", modal de gerenciamento, terreno/planta próprios por nível via TerrenoEditorUI, navegador vertical, filtragem de espaços, seletor de nível na criação e edição. MapaUI (reservas): navegador vertical, filtragem de espaços customizados e estáticos, terreno do nível ativo. MapaAcaoEditorUI (eventos): init aceita niveis como 5º param, abrirEditor carrega níveis antes de abrir, navegador vertical, filtragem de elementos, terreno/planta por nível.

**Fase anterior**: **Fase 72.1 — Seed + migração real de itens do almoxarifado V1→V2 (2026-06-04)** — Deploy @551 (junto com Fix 72.2). `core/setup.gs`: seed de 24 itens padrão CCBJ + 3 funções de migração real do V1 (`fase72_migrar_itens_v1_automatico`, `fase72_migrar_itens_v1_por_id`, `fase72_itens_almoxarifado_seed`). AÇÃO PENDENTE: executar `fase72_migrar_itens_v1_automatico()` no GAS Editor do V2 para importar itens reais do V1. Se falhar, obter SHEET_ID_ESPACOS no V1 via `PropertiesService.getScriptProperties().getProperty('SHEET_ID_ESPACOS')` e usar `fase72_migrar_itens_v1_por_id(ID)`.

**Fase anterior**: **Fix 72.2 — Polígonos livres no MapaUI (2026-06-04)** — Deploy @551 confirmado. Smoke test OK. `gas/src/shared/mapa_ui.html`: adicionado `case 'livre'` em `_criarFormaEl()` — quando `cfg.forma === 'livre'` e `cfg.pts` com ≥ 3 pontos, cria `<polygon points="...">` com as coordenadas relativas ao centro, idêntico ao comportamento já correto do `InfraConfigMapaUI`. Antes, o `switch` sem este case caía no `default` (triângulo hardcoded), fazendo todos os espaços editados com vértices personalizados aparecerem como triângulos no mapa de reservas.

**Fase anterior (72)**: **Fase 72 — Multi-select e atalhos de teclado nos mapas (2026-06-04)** — Deploy @550. **mapa_acao_editor.html (mapa de evento)**: (1) Multi-select via Shift+click (toggle) e rubber-band (arrastar fundo para selecionar área); (2) Caixa de grupo com 8 alças de resize + alça de rotação → move/redimensiona/rotaciona todos os selecionados de uma vez; (3) Ctrl+C copiar, Ctrl+V colar (+30px offset), Delete/Backspace excluir selecionados; (4) Ctrl+A selecionar todos visíveis, Escape desselecionar; (5) Space+arrastar para pan; (6) Cleanup de event listeners em `_voltar()`. **mapa_editor.html (mapa de infraestrutura)**: (1) Ctrl+C copia config da forma atual; (2) Ctrl+V cola forma com +30px offset; (3) Delete/Backspace remove forma; (4) Escape cancela editor; (5) Barra de status com msg de feedback.

**Fase anterior (71.1)**: **Fase 71.1 — Excluir espaço + dimensões no popup + toggle rápido de dimensões (2026-06-04)** — Deploy @549. (1) **Excluir da lista**: botão trash (aparece ao hover) em cada item do sidebar de espaços do InfraConfigMapaUI — modal de confirmação com nome do espaço; ao confirmar chama `GAS.admin.excluirEspaco` e atualiza cache local. (2) **Dimensões no popup do MapaUI**: linha "Dimensões" exibe w×h em unidades SVG e, se `infra-mapa-escala` estiver em localStorage, também mostra em metros. (3) **Toggle rápido no editor de eventos**: botão `straighten` nos controles de zoom do MapaAcaoEditorUI; alterna `mostrarDimensoes` sem abrir modal; se escala não configurada, abre o modal de configuração.

**Fase anterior (72 — migração itens V1)**: **Fase 72 — Seed + migração real de itens do almoxarifado V1→V2 (2026-06-04)** — Sem deploy (apenas backend). `core/setup.gs`: (1) `setup_itens_almoxarifado_iniciais()` — seed idempotente com 24 itens padrão CCBJ (transporte, alimentação, estrutura técnica, camarim, material gráfico, audiovisual/informática), chamado em `inicializarSistema()`; (2) `fase72_migrar_itens_v1_automatico()` — lê itens reais da planilha `CCBJ_ESPACOS.Itens` ou `almoxarifado.json`/`CCBJ_MASTER.Itens` no Drive em 3 camadas; (3) `fase72_migrar_itens_v1_por_id(sheetId)` — migração com ID explícito da planilha V1; (4) `_executarImportacaoItens()` — helper compartilhado que normaliza linhas brutas e objetos JSON do V1; (5) `fase72_itens_almoxarifado_seed()` — atalho global para seed inicial.

**Fase anterior (69.3-4)**: **Fase 69.3-4 — form reserva fora do container de modo + dropdown disponibilidade + mapa delega ao form completo (2026-06-04)** — Deploy @538. (1) `reservas-form-card` movido para fora de `res-modo-lista` — form visível em qualquer aba sem trocar o modo de visualização. (2) `mapa_ui.solicitarReserva`: fecha painel/modal do mapa e abre `ReservasUI.abrirForm` completo sem chamar `setModo('lista')`. (3) `popularSelectEspacos` aceita callback `onCarregado`; `abrirForm` chama `_atualizarDisponibilidadeSalas()` após catálogo carregar — dropdown já agrupa espaços em "Disponíveis" / "Ocupados neste horário" ao abrir o form com data+hora preenchidos. (4) `onchange` de `res-data`/`res-hora-ini`/`res-hora-fim` também chama `_atualizarDisponibilidadeSalas`. (5) Fix lote: após `criarLote` com sucesso, chama `_loteSincronizarForm(primeiraData, horaIni, horaFim)` em vez de `fecharForm`.

**Fase anterior (71)**: **Fase 71 — Escala real nos mapas de eventos e infraestrutura (2026-06-04)** — Deploy @534. Ferramenta de escala real adicionada a ambos os editores de mapa: (1) **MapaAcaoEditorUI** (`gas/src/shared/mapa_acao_editor.html`): botão "Escala" na topbar; modal com toggle ativar/desativar, campo "1m = N unidades SVG", preview "canvas total: Xm × Ym", dica de calibração, checkbox "exibir dimensões sobre os elementos"; barra de escala visual no SVG (bottom-left); labels "Xm×Ym" sobre cada elemento quando ativado; campos "Larg. real (m)" / "Alt. real (m)" no painel de propriedades (bidirecionais: alteram o elemento em px); badge no botão mostrando a escala ativa; persiste em `_mapa.escala`. (2) **InfraConfigMapaUI** (`gas/src/frontend/index.html`): botão "Escala" na toolbar do mapa; mesmas funcionalidades de modal e barra de escala; campos de metros no sidebar de edição de espaço; persiste em `localStorage['infra-mapa-escala']`.

**Fase anterior (70.1)**: **Fase 70.1 — fix permissões: AGENTES + VOLUNTARIOS no engine v2 (2026-06-04)** — Deploy @533.

**Fase anterior (70)**: **Fase 70 — Mapa Infra: criação de espaços + corte topo + ferramentas Esp.H/Esp.V/+Vértice/Mesclar (2026-06-04)** — Deploy @518. (1) **ESP-CRIAÇÃO CORRIGIDO** — `config_admin_service.gs` `salvarEspaco()`: `horarioFuncionamento` padrão ao criar espaço pelo mapa agora herda do config global da org (via `SistemaConfigService.getReservaHorario()`) em vez de fixo `08:00–22:00`, evitando falha de validação quando o expediente configurado é menor. (2) **MAPA CORTE TOPO CORRIGIDO** — `viewBox` do SVG em `InfraConfigMapaUI._renderMapa()` alterado de `"0 0 900 660"` para `"0 -30 900 690"`, dando 30px de espaço acima da área visível para espaços próximos do topo. (3) **FERRAMENTAS ADICIONADAS** — `InfraConfigMapaUI` recebe paridade de ferramentas com `MapaAcaoEditorUI`: forma `livre` (pts) agora suportada em `_criarForma`/`_bboxHW`; vértices arrastáveis em modo edição; funções `_espelharH`, `_espelharV`, `_adicionarVertice`, `_iniciarMerge`, `_completarMerge`; painel lateral com 4 botões (Esp. H · Esp. V · +Vértice · Mesclar); variáveis `_mergeMode`/`_mergeSource` para fluxo de mesclagem em dois cliques.

**Fase anterior**: **Fase 69 — ESP-04/14 + lote sem espaço + sync form↔lote + conflito real-time (2026-06-04)** — Deploy @516. `index.html`: (1) **ESP-14 CORRIGIDO** — `res-tipo-acao` migrado de `<input type="text">` para `<select>` com 13 opções padronizadas (Oficina/Formação, Espetáculo, Exposição, Show/Concerto, Sarau, Festival, Conferência/Palestra, Debate, Lançamento, Ensaio, Cinema/Audiovisual, Reunião, Outro); consistente com o select do modal Lote. (2) **ESP-04 CORRIGIDO** — botão "Lote" movido da barra de ações para o cabeçalho do campo "Data *" (label row com flex justify-space-between); botão "Checar disponibilidade" removido (substituído por checagem automática). (3) **Modal Lote** — `lote-sala` eliminado; grid reduzido de 3 para 2 colunas (apenas hora início/término); info-banner atualizado. (4) **Sync bidirecional form↔lote** — `abrir()` herda `res-hora-ini`/`res-hora-fim` e pré-adiciona `res-data` ao set de chips; `lote-hora-ini`/`lote-hora-fim` com `onchange="_loteSyncHorasAoForm()"` sincronizam horas de volta para o formulário principal em tempo real; `confirmar()` lê sala de `res-sala` (não de `lote-sala`). (5) **Checagem de conflito em tempo real** — `_checarConflito()` (client-side) usa `_listaCacheTotal` para detectar overlap (`inicioA < fimB && fimA > inicioB`), exclui item em edição e reservas canceladas/concluídas; disparado por `onchange` de `res-sala`, `res-data`, `res-hora-ini`, `res-hora-fim` e `_loteSyncHorasAoForm`; resultado em `res-disp-resultado` sem backend call. Verificação V1 (branch refactor-fase2): sistema inspirado no `disponibilidade_module_js.html` + `cacheReservasIndex` do V1.

**Fase anterior**: **s19 Fase 68 — ESP-29 ConfigService residual eliminado (2026-06-04)** — Deploy @514. `ia_service.gs`: 3 referências a `ConfigService` (inexistente) substituídas por `SistemaConfigService` — `_horariosDosTurnos()` e `perguntar()`. `config_admin_service.gs`: validação de horário de espaço migrada de `ConfigService` para `SistemaConfigService.getReservaHorario()`. Erro "ConfigService is not defined" ao salvar reservas eliminado definitivamente.

**Fase anterior**: **s19 Fase 67 — CON-10 Portal do Contratado (2026-06-04)** — Deploy @512. Subtítulo de Contratações: "Portal LGPD" → "Portal do Contratado". `solicitacao_engine.gs`: `_garantirToken()` e `_enviarLinkPortal()` adicionados; token gerado em `submeter()` (antes era só em `iniciarExecucao`); email enviado automaticamente ao fornecedor com link de acompanhamento. Regra "git antes do deploy GAS" registrada em PROGRESS.md e roteiro-auditoria.md.

**Fase anterior**: **Fase 66 — SimulacaoUI + SimulacaoService (2026-06-04)** — Deploy @510. Portado do remote GitHub (branch divergido com 16 commits únicos): `simulacao_service.gs` CRIADO (214 linhas) — backend para simulação de papel/permissões via `PropertiesService.getUserProperties()`; ctrl_simulacao_ativar/encerrar/status; bypass de AcessoService para evitar loop. `boot_service.gs` atualizado — matrizCompleta/moduloLabels/modulosOrdem expostos no boot (via PermissoesV2Engine.MATRIZ/MODULO_LABELS/MODULOS); campo `simulando`; cache pulado quando _simAtiva. `index.html` — CSS `#banner-simulacao`; banner HTML entre topbar e conteúdo; aba "Ferramentas" no Admin (guard: apenas admin/superadmin) com select de papel + botão "Configurar e Simular"; `GAS.simulacao` namespace (ativar/encerrar/status); `SimulacaoUI` IIFE ~378 linhas com modal configuração papel + matriz de permissões por módulo + features granulares; `_aplicarBootSimulado` atualiza boot e menu em-place; `encerrar()` restaura estado original. Local agora tem 30.021 linhas (remote: 29.845). Divergência resolvida: remote tinha Fase 21-24 com SimulacaoUI que local não tinha — portado sem regredir as 78 fases locais (s16/s17).

**Fase anterior**: **s17 Fase 65 (2026-06-04)** — Deploy @507. ESC-15 CORRIGIDO: modal "Nova Pesquisa" expandido de 4 campos para formulário completo com 4 seções — (a) Identificação: título + descrição; (b) Metodologia: select UWES/JDC/CVF/NR-1/Completa/Personalizada com preview dinâmico das dimensões incluídas; seção "Personalizada" exibe grid de 8 checkboxes de dimensões com atualização de preview em tempo real (`EscutaUI._onMetodologiaChange`); (c) Período e Periodicidade: data início/fim + select Única/Quinzenal/Mensal/Trimestral/Semestral; (d) Participantes: select Todos/Gestores/Voluntários + canal de notificação (Email + Sistema); (e) Configurações: anônima + obrigatória (existentes). Backend `criarPesquisa` expandido para persistir `metodologia`, `periodicidade`, `grupoParticipantes`, `canalNotificacao`. Modal ampliado para max-width:660px. `salvarPesquisa()` coleta todos os campos novos e passa `dimensoes` derivadas da metodologia.

**Fase anterior**: **s17 Fase 64 (2026-06-04)** — Deploy @505. ESC-12 CORRIGIDO: módulo Escuta sem guia contextual → botão `help_outline` adicionado ao header da view (`btn-escuta-ajuda`, `data-bg-skip="1"`); `EscutaUI.abrirGuia()` abre modal in-app opaco com 4 seções: "O que é o módulo Escuta?" (visão geral), "O que cada aba faz" (descrição de cada aba), "Glossário das metodologias" (UWES/JDC/CVF/NR-1/Pulse/Saturação), "Como usar — fluxo recomendado" (5 passos ordenados). Pendente: tooltips contextuais por seção e tour guiado na primeira abertura.

**Fase anterior**: **s17 Fase 63 (2026-06-03)** — Deploy @490. ESC-10 CORRIGIDO: aba "Alertas" exibia apenas "Nenhum alerta ativo." sem contexto → substituído por card explicativo com ícone, explicação do propósito (alertas automáticos por threshold de bem-estar), instrução para configurar limiares na aba Gestão e botão "Ir para Gestão →". ADM-04 CORRIGIDO: aba "Banco de Dados" agora oculta para não-SuperAdmin (botão da tab invisível via `style.display='none'` em `aoAbrir()` + guard em `abrirTab('dados')` que bloqueia carga com mensagem "Apenas SuperAdmin"). ADM-11 CORRIGIDO: wizard de setup abria página em branco para orgs com provisionamento 100% — `_calcularPassoAtual` retorna `checks.length+1` (=9 para 8 checks) mas só existem passos 1-7; `irPara()` agora caps em 7 (tela de sucesso) via `if (num > 7) num = 7`. ADM-10 CONFIRMADO CORRIGIDO (s16 F6): código de toggle visual (`outerSpan.style.background` + `innerSpan.style.left`) já estava presente desde s16; apenas roteiro atualizado. Fix extra: `escuta_pulse.gs` e `reserva_engine.gs` migraram de `ConfigService` para `SistemaConfigService` (stub fixes pendentes desde s16).

**Fase anterior**: **s17 Fase 62 (2026-06-03)** — Deploy @480. ESC-07 CORRIGIDO: todos os 7 `btn-secundario` da view Escuta migrados para `btn-ghost` (refresh, Cruzamento, Relatório, Resultados, Editar, Resolver, Habilitar/Desabilitar todas, Cancelar do modal). ESC-11 CORRIGIDO: `carregarPulseDash()` usava `d.mediaPorDimensao` (campo inexistente) → corrigido para `d.indicadores`; dicionário `NOMES_DIM` adicionado para exibir "Vigor", "Dedicação", "Absorção"… em vez de IDs técnicos; valor `entry.media` extraído corretamente do objeto `{ media, n, nivel }`. ESC-13 CORRIGIDO: subtítulo da view Escuta "Clima organizacional · UWES · JDC · CVF · NR-1" → "Bem-estar, engajamento e clima organizacional" (siglas removidas, linguagem orientada ao benefício). ESC-16 FALSO POSITIVO: o título do modal já era `(id?'Editar':'Nova') + ' Pesquisa'` — ao criar, sempre exibe "Nova Pesquisa". FIN-07 CORRIGIDO: card Contratos "Valor em aberto" → "Total Previsto Ativo" (label não implicava dívida em aberto, era valor total dos contratos ativos). FIN-13 CORRIGIDO: `_fmt(v)` em `AditivosUI` retornava `'—'` quando `valorAditivado` é null/0 → corrigido para `Number(v||0).toLocaleString(...)` → exibe "R$ 0,00".

**Fase anterior**: **s17 Fases 60+61 (2026-06-03)** — Deploy @476. ACV-05 CORRIGIDO: bloco de filtros do Acervo migrado de `style="display:flex;gap:8px;..."` inline para `class="filter-bar"` (DS); input de busca `acv-q` migrado para `class="form-control"`; botão Atualizar corrigido de `btn-secondary` para `btn-ghost`. ACV-10 CORRIGIDO: todos os 7 campos do modal "Adicionar ao Acervo" migraram de estilos 100% inline para classes DS — `<label class="form-label">` em todos os labels; `class="form-control"` em todos os selects, inputs e textarea. CHV-04 CORRIGIDO: campo "Sala / Espaço" em Nova Retirada de Chave migrado de `<input type="text">` para `<select class="form-control">` populado com `App.getBoot().espacos` (helper `_popularEspacoChv()`); validação atualizada para "Selecione o espaço." CHV-05 CORRIGIDO: campo "Responsável" em Nova Retirada migrado de `<input type="text">` para `<select class="form-control">` populado via `_carregarSelectUsuariosHelper` (mesmo padrão de REU-02/BAL-07); pré-seleciona `boot.usuarioEmail`; `salvar()` extrai email (value) e nome (selectedIndex.text) separando `responsavel` e `nomeResponsavel` nos dados enviados ao backend.

**Fase anterior**: **s17 Fases 58+59 (2026-06-03)** — Deploy @474. CHV-06 CORRIGIDO: campo "Setor" em Nova Retirada de Chave migrado de `<input type="text">` para `<select>` populado com `App.getBoot().setores`; `_popularSetorChv()` helper pré-seleciona `usuarioSetor` do boot. EMP-03 CORRIGIDO: campo "Setor" em Solicitar Empréstimo idem — `_popularSetorAlmox()` helper. BAL-02 CORRIGIDO (confirmação): botão "+ Nova Demanda" já tinha `class="btn btn-primary"` desde SIS-03 — sem código a alterar. ACO-18 CORRIGIDO: `AcoesUI.abrirForm()` usava `|| 'evento'` como default do campo Tipo; alterado para `|| 'curso'` (primeira opção do select). ACO-19 CORRIGIDO: modal Nova/Editar Ação reordenado — Tipo|Setor (mesma linha, ambos selects), Responsável (full-width, linha própria), Data Início|Data Fim, Público Previsto|Visível. ACO-20 CORRIGIDO: checkbox "Visível no portal público" agora fica na mesma linha que "Público Previsto" (coluna 2) — sem linha vazia desproporcional. Nota: deploy via API GAS (POST version + PUT deployment) por ter atingido limite de 200 versões via `clasp deploy`.

**Fase anterior**: **s17 Fase 57 (2026-06-03)** — Deploy @466. ACO-12+ACO-17 CORRIGIDOS: modal Nova/Editar Ação migrado de `class="input"` para `class="form-control"` em todos os 9 campos (inputs, selects, textareas) e `<label>` → `<label class="form-label">` em 9 labels — DS unificado com os demais modais do sistema. RECE-15 CORRIGIDO: filtro de mês do RECE envolto em `<label>` com ícone `calendar_month` — contexto visual resolve o "---------- de ----" do `type="month"` vazio.

**Fase anterior**: **ESP-17/18 — Horário local de espaço + Auto-confirmação por responsáveis (2026-06-03)** — Deploy @464. Implementados: (1) `reserva_engine.gs` — `assertHorarioFuncionamento(h1,h2,espacoId)` agora lê `horarioFuncionamento.abertura/fechamento` do espaço como limite primário (fallback para horário global); novo helper `_precisaAprovacao(espacoId,data,h1,h2,setor,email)` consulta `SolicitacaoReservaEngine.verificarPrioridadeSetor`; `criar()` e `criarLote()` definem `status = CONFIRMADO` automaticamente quando o slot não exige aprovação (espaço sem responsáveis OU solicitante do mesmo setor). (2) `reservas_controller.gs` — `ctrl_reservas_listar` anota `precisaAprovacao` em cada item da lista; `ctrl_reservas_confirmar` permite também responsáveis do slot confirmarem (não apenas gestão). (3) `config_admin_service.gs` — `salvarEspaco()` valida que abertura/fechamento local esteja dentro do horário global (lança erro legível se fora do limite). (4) `index.html` — botão "Confirmar" na lista e no detalhe da reserva só aparece quando `r.precisaAprovacao === true`; form de espaço: inputs `type=time`, hint dinâmico `(global: HH:MM–HH:MM)` carregado via `obterConfigExpediente`, validação client-side abertura < fechamento.

**Fase anterior**: **Auditoria sistêmica de permissões (2026-06-03)** — Deploy @462. Corrigidos 4 classes de bugs transversais: (1) `AcessoService.verificar(array)` chamado como no-op em 4 controllers (agentes, parcerias, voluntarios, publico) + 4 funções em exportacao_engine + rh_dashboard — refatorados com padrão `_ctx*(papeis)` idêntico ao `_ctxAcervo` existente; writes que usavam retorno da chamada quebrada como `email` agora usam `ctx.email` correto. (2) Papel `'coordenador'` faltava em `PAPEIS_VALIDOS` mas era referenciado em ~30 lugares — adicionado ao engine com matriz de permissões própria (abaixo de gestor: edita ações/reuniões/agentes/voluntários/parcerias) e a `PAPEIS_EDITAVEIS_POR_ADMIN`; sincronizado em `acesso_service.gs`. (3) Papel `'infraestrutura'` fantasma no frontend (5 lugares em index.html + mapa_ui.html) substituído por `'habilitador'` — aprovador real de reservas/veículos. (4) Checks de papel hardcoded no frontend (ehAprovador veículo, toolbar aprovador espaço, _podeHabilitar, config espaços, botões Ativar/Encerrar/Editar em Escuta) migrados para `featuresAtivas[MODULO][feature_id]` e `permissoesModulos[MODULO].editar` do boot — respeitam overrides granulares por utilizador. Features ESPACOS.aprovar_reserva_carro e ESPACOS.aprovar_reserva usadas no frontend; feature PESSOAS.gerir_escuta adicionada ao catálogo.

**Fase anterior**: **s17 Fase 56 (2026-06-03)** — Deploy @460. ESC-08 CORRIGIDO: seção "Meu Perfil Analítico" removida da aba Escuta Livre — HTML (div + campos demográficos + botão Salvar Perfil), JS (`_carregarFormPerfil`, `salvarPerfil`, chamada em `_carregarAbaLivre`), GAS namespace (`perfilObter`, `perfilSalvar`), exports de EscutaUI. Dados demográficos devem vir do perfil cadastral do usuário (ESC-09, pendente).

**Fase anterior**: **s17 Fase 55 (2026-06-03)** — Deploy @458. ACO-27 CORRIGIDO: botões FSM de Ações (`_PROX_STATUS`) migraram de `btn-success`/`btn-error`/`btn-warning` para `btn-primary` (ações positivas: Iniciar Produção, Iniciar Execução, Concluir) e `btn-secondary` (ações neutras/destrutivas: Cancelar, Voltar, Arquivar) — padrão DS unificado. ACV-06+ACO-11+todos os módulos CORRIGIDOS: 6 views com `h2.view-titulo` migradas para `h1.view-title` (Ações, Agentes, Acervo, Voluntários, Parcerias, Estratégia); Escuta `h2.view-title` → `h1.view-title`; `p.view-subtitulo` → `p.view-subtitle` em Ações; CSS `.view-title` estendido com `display:flex;align-items:center;gap:8px` e `.view-title .ms { color: var(--color-primary) }` para suportar ícone inline — padrão DS agora homogêneo.

**Fase anterior**: **s17 Fases 53+54 (2026-06-03)** — Deploy @456. (53) SIS-03/04/05 CORRIGIDOS via CSS aliases. (54) ACO-28 CORRIGIDO: modal de encerramento ao concluir ação.

**Fase anterior**: **s17 Fases 50-52 (2026-06-03)** --- Deploy @448. Corrigidos: FIN-15 (icone folder_open no contrato); ACO-07r (fecharPainel antes de navegar em novaParaAcao); REU-02/BAL-07 (texto livre to select de usuarios via ctrl_admin_listarUsuariosAtivos); BAL-08 (setor demandante to select); ESP-13 (modal Lote sem campos duplicados); ESP-15 (politica de conflito: backend coleta conflitos, frontend pede confirmacao para criar apenas datas validas); CON-06/07 (aba Habilitacoes substituida por Pregoes/Atas RP com pregao_repository.gs + PregoesUI IIFE CRUD completo). Passo obrigatorio: fase52_pregoes_prepararIndice() no GAS Editor.

**Fase anterior (Refactor)**: **Refactor: remoção de hardcodes de horário + reestruturação Admin/Infraestrutura (2026-06-03)** — Deploy @446 ✅. Alterações: (1) `reserva_engine.gs` — `assertHorarioFuncionamento` lê abertura/fechamento de `ConfigService.getReservaHorario()` em vez de `7*60`/`23*60` hardcoded; mensagem de erro usa os valores configurados (ESP-16 CORRIGIDO). (2) `escuta_pulse.gs` — `TURNOS` array eliminado; função `_getTurnosNumericos()` lê `ConfigService.getTurnos()` em runtime com fallback (PUL-04 definitivo). (3) `ia_service.gs` — prompt do assistente usa `_hor.inicio`/`_hor.fim` e `_turnosTexto` calculados dinamicamente; `_horariosDosTurnos()` deriva horários de sugestão dos turnos configurados. (4) `index.html` — Admin: removidas abas "Turnos" e "Config. Sistema" de Cadastros Base; adicionada aba "Identidade Visual" (conteúdo migrado de Config.Sistema); Infraestrutura → Config → Horários: expandida com seção "Turnos de Funcionamento" (lista + Novo Turno); `carregarTurnos()` redirecionado para `#infra-lista-turnos`; `_carregarHorarios()` também chama `AdminCadastrosUI.carregarTurnos()`; CCBJ Fechado: `_TURNOS` hardcoded eliminado, select populado via `GAS.admin.listarTurnos()` ao abrir o modal; `AdminConfigTabsUI` e `ExpedienteUI` removidos. (5) `mapa_acao_editor.html`, `mapa_ui.html`, `wizard_setup.html` — inputs de hora sem `value` hardcoded. ADM-08 CORRIGIDO. ESP-16/ESP-16b CORRIGIDOS.

**Fase anterior**: **s17 Fases 47-49 — SIS-11/ESP-25/ACO-21/22/CON-01/02 + habilitador infra + Escuta scores clima (2026-06-03)** — Deploy @442 ✅. Corrigidos: (47a) SIS-11 — saudações e avatar usavam email/iniciais derivadas do email; `boot_service.gs` agora retorna `usuarioNome` do registro de acesso; `_aplicarBoot()` usa `usuarioNome` para `topbar-email`, `sidebar-user-name`, iniciais do avatar (2 primeiras letras do nome quando disponível); `_renderizarHome()` usa `nomeBreve` (primeiro nome) na saudação "Bom dia, João!". (47b) ESP-25 — input de data no modo Mapa (`#mapa-data`) usava estilo inline sem `font-family:inherit`, resultando em fonte nativa do browser divergindo do padrão do sistema; adicionado `font-family:inherit` ao style. (48a) ACO-21 — campo `run-acao-id` em Reuniões era `<input type="text" placeholder="ACAO-001">` frágil; substituído por `<select>` populado via `_carregarSelectAcoesRun(valorAtual)` chamado no `abrirForm()`; ao criar nova reunião carrega ações ativas; ao editar existente recarrega e preseleciona o ID gravado. (48b) ACO-22 — campo `bl-acao-id` no Balcão idem; substituído por select populado via `_carregarSelectAcoesBal(valorAtual)`. (49a) CON-01 — campo `sol-setor` em Contratações era `<input type="text" placeholder="Ex: Produção">` não integrado; substituído por `<select>` populado via `_popularSelectSetor()` com `App.getBoot().setores`; pré-seleciona `usuarioSetor` do boot ao abrir nova solicitação. (49b) CON-02 — campo N° Esboço iniciava vazio; ao abrir novo formulário, `abrirForm()` gera automaticamente `ESB-AAAA-NNNNN` (ano + sufixo baseado em timestamp), editável para receber numeração oficial (SEI, etc.). Bônus ESC — painel de Monitoramento Pulse expandido: scores de clima por dimensão (vigor/dedicação/absorção/demanda/controle/colaboração/inovação/segurança) com escala 1–5 e nível; mediana de nota + mini-histograma de distribuição por pergunta; `escuta_controller.gs` calcula `mediaNota`, `distribuicao[5]` e busca `indicadores` via `obterDashboardPulse`. Bônus INFRA — papel `habilitador` adicionado a `PAPEIS_APROVACAO` em `reserva_carro_engine.gs` e a `_nivelReservas`/`_NIVEL_GESTAO` em `reservas_controller.gs` — alinhando com `solicitacao_reserva_engine.gs` e `permissoes_v2_engine.gs` que já incluíam o papel.

**Fase anterior**: **s17 Fases 44-46 — REU-03/11/ADM-07/ACO-09/FIN-10/16/ESP-08/21 (2026-06-02)** — Deploy @430 ✅. Corrigidos: (44a) REU-03 — aba Dados do modal Nova Reunião tinha Tipo ao lado de Data/Hora (heterogêneo); reordenado para Tipo|Local (linha 2, ambos qualitativos) e Data/Hora|Duração (linha 3, ambos temporais). (44b) REU-11 — ata era textarea livre sem estrutura guiada; adicionado botão "Usar Template" com ícone MS `article` que insere template formal estruturado em 6 blocos (Abertura, Participantes, Pauta, Deliberações, Encaminhamentos Gerais, Encerramento) pré-preenchido com dados já disponíveis no form (título, local, convocador, data/hora, itens de pauta); função `_usarTemplateAta()` exportada. (44c) ADM-07 — tab bar "Cadastros Base" do Admin tinha 10 abas sem indicação visual de scroll; função global `_initTabBarNav(bar)` adicionada — detecta se tab bar transborda, wraps em `div.tab-bar-nav-wrap` e adiciona botões prev/next com fade gradient que aparecem/desaparecem dinamicamente conforme scroll; CSS `.tab-bar-nav-wrap/.tab-bar-nav-btn` adicionado; chamada em `AdminCadastrosUI.aoAbrir()`. (44d) ACO-09 — 8 abas do painel de Ações sem indicação de scroll; `_initTabBarNav` chamada em `_mostrarPainel()` ao abrir o painel. Bônus: `.tab-bar` com `scrollbar-width:none` (Firefox) e `::-webkit-scrollbar{display:none}` para esconder scrollbar nativa. (45a) FIN-10 — coluna Subtotal na Memória de Cálculo em modo edição truncava valores longos (ex: "R$ 1.515.739,43"); adicionados `white-space:nowrap;min-width:90px` ao `<td>` gerado por `_renderMemTabela`. (45b) FIN-16 — aba Pessoal no painel do contrato exibia 5 métricas mas não "Custo Mensal"; adicionado 6º card "Custo Mensal" (soma de `p.custoMensal` de todos os pessoal) entre Provisões e Custo Total. (46a) ESP-08 — formulário Nova Reserva não pré-selecionava setor do usuário; em `abrirForm(dados)` quando criando novo registro (sem `dados.id`), `_valorSetor` agora fallback para `_bootData.usuarioSetor`. (46b) ESP-21 — filter bar de Reservas sem botão de reset; adicionado botão com ícone `filter_alt_off` e `title="Limpar todos os filtros"` que chama `_limparFiltros()` — limpa status + data + sort e recarrega.

**Fase anterior**: **s17 Fases 41-43 — HUB-06/02/04/01/10 + CAR-02/03/04 + BAL-13/15 + APR-06 + ACV-02/03 (2026-06-02)** — Deploy @428 ✅. Corrigidos: (41a) HUB-06 — título "TaskHub — Meu Centro de Controle" → "Meu Centro de Controle" (nome interno removido). (41b) HUB-02 — estado vazio do Meu Dia usava emoji 🎉; substituído por `<span class="ms">celebration</span>`. (41c) HUB-04 — estado vazio do Meu Time exibia apenas texto simples sem ícone; adicionado ícone MS `group` + título "Sua equipe está em dia" + subtítulo orientador. (41d) HUB-01/10 — cards de Produtividade usavam classes `th-prod-card/valor/label` com bordas e grade divergente do padrão DS; migrados para `stat-card/stat-value/stat-label` dentro de `<div class="stats-strip" id="th-prod-stats">`; `MetricsToggle.wrap()` chamado após renderização — agora colapsável como todo bloco de métricas. Bônus: labels de grupo do Meu Dia (🔴/📅/📆/🗓️) substituídos por Material Symbols (`error`, `today`, `calendar_view_week`, `schedule`). (42a) CAR-02 — sidebar exibia "Reserva de Carro" (label interno); corrigido para "Reserva de Veículo" (consistente com o título da view). (42b) CAR-03 — métricas de Reserva de Veículo tinham 4 cards (Pendentes/Aprovadas/Concluídas/Total); adicionados "Recusadas" (vermelho) e "Canceladas" (muted) — backend já retornava esses valores. Também migrados de `stat-item` para `stat-card` (classe padrão). (42c) CAR-04 — select "Vincular a uma Ação" ficava preso em "Carregando…" sem timeout; adicionado fallback de 6 segundos (`clearTimeout` cancelado no sucesso/erro) que reseta para "— Nenhuma —". (43a) BAL-13 — botão "+ Enviar Nova Versão" usava `btn-secondary` (aparecia rosa com paleta CCBJ `#8a0a72`); corrigido para `btn-ghost` (borda neutra) + ícone MS `upload`. (43b) BAL-15 — aba Versões exibia área vazia sem orientação ao abrir formulário novo; `_resetForm()` agora preenche `bl-versoes-lista` com mensagem "Nenhuma versão enviada. Clique em 'Enviar Nova Versão' para registrar a primeira entrega." (43c) APR-06 — cabeçalho de Aprovações usava padrão antigo (`page-header`/`div.page-title`/`div.page-subtitle`); migrado para `view-header`/`h1.view-title`/`p.view-subtitle`. (43d) ACV-02 — botão "Cancelar" no modal do Acervo usava `btn-secondary` (rosa/pink); corrigido para `btn-ghost`. (43e) ACV-03 — stats-strip do Acervo não tinha `id`, impedindo MetricsToggle de detectar; adicionado `id="acv-stats"` — agora colapsável automaticamente no carregamento da view.

**Fase anterior**: **s17 — PUL-03/04/05/06/ESC-17 — Pulse: anti-spam, turnos, privacidade, UX pesquisas (2026-06-02)** — Deploy @426 ✅. Corrigidos: (PUL-03) Anti-spam do Pulse estava completamente quebrado — `registrarRespostaPulse` salvava `colaboradorId: null` (hardcode `anonima: true` no controller) tornando o filtro `r.colaboradorId === email` ineficaz → Pulse aparecia a cada refresh da página. Fix: `colaboradorId` sempre persiste no registro; `anonima` flag controla apenas exibição em relatórios de gestão. (PUL-04) TURNOS hardcoded 7-14/14-18/18-23 não batiam com turnos institucionais — atualizados para 8-12/12-17/17-21.5 (Manhã/Tarde/Noite CCBJ). AB01 "Você conseguiu se concentrar bem nas tarefas hoje?" tinha `tipoTempo: 'acumulativa'` (50% do turno) quando deveria ser `'final'` (75% do turno) — reflete o dia, não o início. `_lerConfigPulse()` criada para ler `antiSpamHoras`/`limiteDia` do `config_org.json` em vez de usar valores hardcoded. (PUL-05) Monitoramento mostrava colaborador como "sem atividade" pela mesma raiz do PUL-03 — resolvido automaticamente com o fix. (PUL-06) Monitoramento exibia lista de nomes de quem não respondeu — Pulse é anônimo, nomes não devem ser expostos. Backend retorna apenas contagem; frontend exibe "N de X colaboradores sem atividade" + nota "Os nomes não são exibidos — o Pulse é anônimo por design". (ESC-17) Modal "Nova Pesquisa" sem contexto sobre anonimato; melhorado com painel explicativo (texto explicando impacto de marcar/desmarcar). View de resposta: badge "ANÔNIMA" (verde) / "IDENTIFICADA" (vermelho) + aviso colorido ao respondente sobre se será identificado ou não.

**Fase anterior**: **s16 Fase 40 — REU-05/REU-06/REU-07/ACV-04/ACV-09/BAL-05/BAL-12 (2026-06-02)** — Deploy @422 ✅. Corrigidos: (40a) REU-05 — botões "+ Presente" e "+ Ausente Justif." na aba Presença eram visualmente idênticos (`btn-secondary`); "Presente" mudado para `btn-primary` com ícone `check_circle`, "Ausente" mantém `btn-secondary` com ícone `cancel` — distinção clara entre ação positiva e negativa. (40b) REU-06 — botões da aba Ata usavam emojis (`💾 Salvar Rascunho`, `📤 Submeter para Aprovação`, `✅ Aprovar Ata`); todos substituídos por Material Symbols (`save`, `send`, `verified`). (40c) REU-07 — layout horizontal comprimido na aba Encaminhamentos (3 campos + botão na mesma linha causando truncamento); reestruturado para 2 linhas — campo de texto em full-width no topo, responsável + prazo + botão na linha de baixo com `min-width` adequado. (40d) ACV-04 — filtros do Acervo sem botão de atualização; adicionado botão refresh com ícone MS e `onclick="AcervoUI.carregar()"`. (40e) ACV-09 — selects de tipo nos filtros do Acervo usavam emojis nos labels (`📷 Foto`, `🎬 Vídeo`…); removidos, ficam labels limpos; `_TIPO_ICONE` migrado de emojis para nomes de ícones MS (variável declarada para uso futuro). (40f) BAL-05 — subtítulo do Balcão era "Gestão de demandas com SLA, versionamento e rastreabilidade" (jargão técnico); substituído por "Solicite materiais e acompanhe o atendimento pelo setor de Comunicação". (40g) BAL-12 — label `bl-sla-label` exibia "⏱ SLA: 72h (3 dias) após submissão" (jargão + emoji); substituído por "Prazo estimado: 3 dia(s) após o envio" com lógica condicional (horas < 24 → exibe "Xh", senão "X dia(s)"). Bônus: "com SLA vencido" no card do dashboard executivo → "com prazo vencido".

**Fase anterior**: **s16 Fase 39 — FIN-13/ESC-11/ESC-07/BAL-14/REU-01/ACO-15/REU-04 (2026-06-02)** — Deploy @420 ✅. Corrigidos: (39a) FIN-13 — `_fmt()` em AditivosUI retornava `'—'` quando valor era `0` (verificação truthy engolia zero); corrigido para `v != null`. (39b) ESC-11 — `_carregarSaturacao()` chamava `Object.keys(dims)` num array, resultando em índices `0,1,2…7` como labels; corrigido para `Array.isArray()` + `forEach` usando `s.label || s.id`. (39c) ESC-07 — botões "Salvar Perfil" e "Salvar Configurações" em Escuta usavam `btn-secundario` (aparecia rosa com a paleta da org `#8a0a72`); corrigidos para `btn-primario`. (39d) BAL-14 — emoji `📤` no botão "Enviar Entrega" do Balcão; substituído por `<span class="ms ms-sm">upload</span>`. (39e) REU-01 — 6 cards de métricas em Reuniões quebravam em 2 linhas; 5º e 6º cards ("Enc. Pendentes" + "Enc. Vencidos") fundidos em um único card "Encaminhamentos" com valor `P / V ⚠` e cor dinâmica (vermelho se há vencidos); IDs internos mantidos ocultos para o JS continuar funcionando. (39f) ACO-15 — filter bar de Ações sem botão de refresh; adicionado botão com ícone `refresh` e método `_recarregar()` no AcoesUI. (39g) REU-04 — aba Pauta no modal de Nova Reunião sem estado vazio; adicionado placeholder "Nenhum item de pauta adicionado." que some ao adicionar itens e reaparece ao limpar o form.

**Fase anterior**: **s16 Fases 36+37+38 — SIS-01/MAP-01/ESC-05 (2026-06-02)** — Deploy @418 ✅. Corrigidos: (36) SIS-01 — últimas 19 ocorrências de `confirm()`/`prompt()`/`alert()` nativos em 8 módulos (ContratosDetailUI ×5, FontesRecursoUI, RemanejamentosUI, AditivosUI ×2, InfraConfigMapaUI, BloqueioUI ×8, AtivosUI, SolicitacoesUI ×3, ContratadosUI, PublicoUI, EncargosUI ×3) → todos convertidos para `_abrirModalConfirmar` / `_abrirModalSimples` / `Toast.*`; SIS-01 agora **100% resolvido** para `if (!confirm(...))` e `prompt()` sem `_raw`. (37) MAP-01 — algoritmo de mesclar em `mapa_acao_editor.html`: em vez de bounding-box (retângulo), converte TODOS os tipos de forma (livre/rect/circle) para lista de vértices absolutos, concatena e recentra como `forma:'livre'` — zero destruição de contornos; `mapa_editor.html` também corrigido para converter forma ativa para `poly_custom` antes de mesclar em vez de retornar sem fazer nada. (38) ESC-05 — `_carregarGovernanca` e `_renderPainelDimensoes`: `_esc(f.msg)` e `_esc(a.msg||a)` substituídos por extração defensiva de string (`typeof f.msg === 'string' ? f.msg : String(f.msg||'')`) eliminando o "[object Object]" quando msg é objeto ou está vazio.

**Fase anterior**: **s16 Fases 32–35 — SIS-01/ACV-01/CON-05/PES-01 (2026-06-01)** — Deploy @413 ✅. Corrigidos: (32) SIS-01 — SolicitacoesUI: instruir/iniciarExecucao/concluir/cancelar → modais internos com Confirmar/Cancelar; exportados `_confirmarInsSol`, `_confirmarExeSol`, `_confirmarConSol`, `_confirmarCanSol`. (33) ACV-01 — raiz real: `CacheService.get/set/invalidar` nos controllers de acervo/parcerias/agentes/voluntarios não existem no GAS nativo → TypeError capturado pelo wrap → retorno `{ok:false}` → galeria sempre em "Erro"; corrigido para `AppCache.get/set/remove`; adicionado `_ctxAcervo()` com RBAC correto. (34) CON-05 — error handler de `ContratadosUI.carregar()` não atualizava o DOM → spinner persistia; agora atualiza `ag-lista` em ambos os caminhos de erro. (35) PES-01 — `PessoasUI.carregar()` encadeava `listar` dentro do callback de `metricas`; se metricas falhasse pelo error handler, listar nunca era chamado → DOM preso em "Carregando..."; corrigido: listar chamado em paralelo, independente de metricas; error handler atualiza o DOM.

**Fase anterior**: **s16 Fases 27+29 — SIS-01 (AlmoxUI+SolicitacoesUI) / hardening AGN-01 (2026-06-01)** — Deploy @393 ✅. Corrigidos: (27) SIS-01 — AlmoxUI._cancelar + SolicitacoesUI.aprovarGestor/aprovarFinanceiro/rejeitar convertem `prompt()` nativo para `_abrirModalSimples` com textarea + Confirmar/Cancelar; `_confirmarCanAlmox`, `_confirmarAprGSol`, `_confirmarAprFSol`, `_confirmarRejSol` exportados. (29) Hardening AGN-01/ADM-10: `getModulosAtivos()` fallback atualizado de 9 para 20 módulos; `ctrl_admin_toggleModulo` invalida o cache de bootstrap via `CacheService.getScriptCache().removeAll()`.

**Fase anterior**: **s16 Fases 23-26 — RH-01/ESP-22/SIS-01(alm+sol)/ESP-01 (2026-06-01)** — Deploy @389 ✅. Corrigidos: (23) RH-01 — `_carregarMetricas` em RhUI reescrita; (24) ESP-22 — auto-conclusão reservas atrasadas; (25) SIS-01 (AlmoxUI+SolicitacoesUI) — devolver via modal; (26) ESP-01 — coluna sticky no Diagrama.

**Fase anterior**: **s16 Fases 19-22 — ACO-02/03 Ações + CHV-03 Chaves + ESP-02 Reservas (2026-06-01)** — Deploy @387 ✅. Corrigidos: (19) ACO-02 — card Kanban e lista de Ações não renderizam mais `responsavel` quando valor não contém `@` (ex: legado "nm"); (20) ACO-03 — `boot_service.gs` expõe `usuarioSetor` no bootstrap; form "Nova Ação" pré-seleciona o setor do usuário logado via `_boot.usuarioSetor`; (21) CHV-03 — devolução de chave substituiu `prompt()` nativo por modal inline com select Condição (bom estado/avariada/perdida) + textarea Observações + Confirmar/Cancelar; (22) ESP-02 — filtro de data na lista de Reservas inicia sem valor (mostra todas as datas), sem default "hoje". APR-04 já estava corrigido desde s16 Fase 1.

**2 fases anteriores**: **s16 Fase 18 — SIS-09 BtnGuard done() em modal-openers (2026-06-01)** — Deploy @385 ✅. Corrigido: SIS-09 raiz — 13 botões que abriam modais nunca chamavam `done()`, deixando o botão travado com "Abrindo…" enquanto o modal estava aberto. Fix: todos passaram a usar `function(done){ ...abrirForm(); done(); }` — botão liberado imediatamente ao modal abrir. Afeta: acao-nova-btn, painel-acao-editar-btn, rece-novo-btn, btn-nova-reuniao, btn-nova-demanda, btn-novo-agente, btn-novo-arquivo, btn-novo-vol, btn-nova-parceria, btn-novo-objetivo, btn-nova-pesquisa, rece-edit-* (dinâmico).

**Fase anterior**: **s16 Fases 12–17 — Ciclo de correções de bugs (2026-06-01)** — Deploy @383 ✅. Corrigidos: FIN-17 (benefícios pessoal: vtLiq negativo + descontoPlano indevido), ESC-04+ESC-05 (Escuta painel/marcadores), ACV-07+08+11 (Acervo: select ações, campo nome, acaoId opcional), SIS-14 sistêmico (datas ISO→pt-BR em Financeiro/RECE/Escuta), CAR-15 (aprovação veículo: papel+setor), FIN-14 (FSM contrato: botões Suspender/Encerrar + modal confirmação).

**Fase anterior**: **Fase D — Mapa do Evento: 3º modo de inicialização — seletor de espaços (2026-05-29)** — Deploy @298 ✅. Implementado: (1) `mapa_acao_engine.gs` — `criarDeSelecao(params, email, orgId)`: recebe `{acaoId, nome, descricao, espacosIds: [], espacosCustom: [{nome}]}`; filtra espaços CCBJ por ID selecionado; espaços com `mapaConfig` usam posição real, os sem `mapaConfig` recebem posição automática em grade (4 colunas × 120px); espaços personalizados criados como `tipo: 'espaco_virtual'` sem `espacoOriginalId`; `tipoBase: 'selecao'`; registra auditoria. (2) `mapa_acao_controller.gs` — `ctrl_mapa_acao_criar_de_selecao(params)` + `ctrl_mapa_acao_espacos_disponiveis()` (leve, só requer `AcessoService.verificar()`; retorna `{id, nome, capacidade, categoria, tipoEspaco, aceitaReserva, temMapaConfig}`). (3) `index.html` — GAS bindings `criarDeSelecao` + `espacosDisponiveis`; 3º radio "Selecionar espaços" no modal "Novo Local"; dispatch em `_criarMapa`; `_abrirPickerEspacos(nome, desc)`: modal mais largo (680px), carrega espaços via `espacosDisponiveis`, lista agrupada por categoria com checkboxes + badges "mapeado"/"sem pos.", botões Todos/Nenhum, seção de espaços personalizados com form + chip list removível, contador "N selecionado(s)", BtnGuard no "Criar mapa"; funções auxiliares `_renderPickerEspacosCCBJ`, `_renderPickerCustom`, `_atualizarContadorPicker`, `_removerPickerCustom` (exportada para onclick inline). **Auditoria**: modal overlay via `_abrirModalSimples` (rgba(15,23,42,.70)) ✅ | caixa var(--surface) ✅ | BtnGuard `nl-picker-criar-btn` ✅ | GAS namespace completo ✅ | nenhum prompt()/confirm() sem null-check ✅. **Smoke-test**: Ações → abrir ação → aba "Mapa do Evento" → "Novo Local" → selecionar "Selecionar espaços" → "Criar" → picker abre em modal mais largo → espaços listados por categoria com badges → marcar Teatro + Biblioteca → adicionar "Tenda A" personalizado → contador mostra "3 selecionado(s)" → "Criar mapa" → spinner + mapa criado → lista atualiza com badge "selecao"; abrir mapa no editor → 3 elementos no canvas; F12 zero erros.

**Fase anterior**: **Fase C — Mapa do Evento: avatares de equipe, público e animais (2026-05-29)** — Deploy @296 ✅. Implementado: `mapa_acao_editor.html` — 3 novas seções na palette: Equipe (Coordenador/Técnico/Segurança/Voluntário/Fotógrafo/Recepção), Público (Em Pé/Sentado/Grupo/Fila/Plateia/VIP), Animais (Cão/Cavalo/Pássaro/Gato/Peixe); 17 avatares SVG distintos; total: 53 itens em 10 seções colapsáveis. **Fase D — antigo**: **Fase B — Mapa do Evento: novos objetos Som/Luz/AV/Logística + seções colapsáveis (2026-05-29)** — Deploy @294 ✅. Implementado: `shared/mapa_acao_editor.html` — (1) `_CATEGORIAS` expandido de 12 para 36 categorias com 6 grupos semânticos: Estrutura (palco/praticável/mesa/cadeira), Fluxo/Controle (cone/alambrado/portão/disciplinador), Som (eq_som/caixa_som/mesa_som/microfone/monitor_som/subwoofer), Luz (eq_luz/refletor/moving_head/par_led/dimmer/follow_spot/strobo), AV/Vídeo (eq_av/projetor/tela_proj/monitor_av/camera_video/mesa_av), Logística (gerador/extensao/rack/banheiro/guarita/estacionamento). (2) `_iconeCategoria()` expandida com 24 novos ícones SVG distintos. (3) `_SECOES` array (7 seções com abertaDefault: Estrutura+Controle abertas, demais fechadas). (4) `_paletteSecState` para estado persistido na sessão. (5) `_renderPaletteObjetos()` reescrito com headers colapsáveis (ícone MS, chevron expand/less). (6) `_toggleSecao()` toggle de estado. **Retro-compat**: IDs de categoria antigos preservados. **Próximo**: Fase C — Avatares de equipe.

**Fase anterior**: **Fase 21 — Reserva de Veículo Institucional (2026-05-29)** — Deploy @285 ✅. Implementado: (1) `gas/src/modules/infraestrutura/reserva_carro_repository.gs` — fonte canônica `reservas_carro.json` + índice `ESPACOS.ReservasCarro` (16 colunas); `listar/buscarPorId/inserir/atualizar/listarAprovadasNaData/prepararIndice`. (2) `reserva_carro_engine.gs` — FSM (PENDENTE→APROVADA/RECUSADA/CANCELADA; APROVADA→CONCLUIDA/CANCELADA); papéis aprovadores: infraestrutura/gestor/admin/superadmin; verificação de conflito de horário na aprovação (`_verificarConflito`); notificação por email à equipe infra na solicitação + ao solicitante na aprovação/recusa; funções: `criar/listar/aprovar/recusar/cancelar/concluir/obterMetricas`. (3) `reserva_carro_controller.gs` — 7 funções `ctrl_carro_*` + `fase21_carro_prepararIndice()` global. (4) `utils.gs` — `ABA_PARA_MODULO.ESPACOS.ReservasCarro` adicionado. (5) `setup.gs` — `SCHEMA_ABAS.ESPACOS` +`'ReservasCarro'`; hook em `inicializarSistema()`; `fase21_carro_prepararIndice()` global. (6) `index.html` — GAS.reservasCarro (7 bindings); menu `reservas-carro` com badge `badgeReservasCarro`; `view-reservas-carro` completo (stats strip, filtros status+data, tabela responsiva com ações por papel, modal formulário completo com campos do spreadsheet original + geração de link Google Maps, modal recusa com textarea); `ReservasCarroUI` IIFE (~320 linhas). **Pendente no GAS Editor**: executar `fase21_carro_prepararIndice()` → `{ok:true}`. **Smoke-test**: sidebar → "Reserva de Carro" → stats zeradas → "Nova Reserva" → preencher todos os campos → "Enviar Solicitação" → lista atualiza com status PENDENTE; usuário infra → botões Aprovar/Recusar aparecem; Aprovar → status vira APROVADA + notificação email; tentar aprovar segunda reserva no mesmo horário → erro de conflito; cancelar → status CANCELADA; F12 zero erros.

**Fase anterior**: **Fase 20 — Escuta Institucional Completa (2026-05-27)** — Deploy @273 ✅. Implementado: (1) `escuta_repository.gs` — novos arquivos `perfis_analiticos.json` e `escuta_alertas.json`; funções `salvarPerfilAnalitico`, `obterPerfilAnalitico`, `listarPerfis`, `listarAlertas`, `salvarAlertas`, `resolverAlerta`. (2) `escuta_engine.gs` — novas funções: `salvarPerfilAnalitico`, `obterPerfilAnalitico`, `resolverAlerta`, `obterParticipacaoHistorica` (12 meses pulse+espontânea), `suprimirEmailsAntigos` (LGPD 90 dias), `obterConfigEscuta`/`salvarConfigEscuta` (via config_org.json.escutaConfig), `togglePergunta`, `obterDadosUnificados` (carga tudo em 1 chamada). (3) `escuta_controller.gs` — 19 novos controllers: `ctrl_escuta_dados`, `ctrl_escuta_pulse_obter/responder/dashboard`, `ctrl_escuta_espontanea_registrar/listar`, `ctrl_escuta_alertas_listar/resolver`, `ctrl_escuta_config_obter/salvar`, `ctrl_escuta_pergunta_toggle`, `ctrl_escuta_perfil_obter/salvar`, `ctrl_escuta_relatorio`, `ctrl_escuta_governanca`, `ctrl_escuta_saturacao`, `ctrl_escuta_feedback`, `ctrl_escuta_participacao`, `ctrl_escuta_banco_perguntas`, `ctrl_escuta_suprimir_emails`. (4) `setup.gs` — `fase20_escuta_prepararIndice()` + call em `inicializarSistema()`. (5) `index.html` — GAS.escuta namespace expandido para 32 bindings; view-escuta rebuild completo com 6 abas (Painel, Escuta Livre, Alertas, Distribuição, Relatórios, Gestão) + pulse widget flutuante (FAB + painel); `EscutaUI` IIFE reescrito (~620 linhas): carregar unificado, filtro de pesquisas, gráfico de barras evolução inline, form de resposta formal, relato espontâneo com dimensão, perfil analítico voluntário (LGPD), alertas com resolução, pulse dashboard por período, saturação por dimensão, participação histórica 12 meses, resultados com nível climático e gaps fairness, relatório com recomendações, marcadores metodológicos (qualidade 0-100 + motor), banco de perguntas toggle, config anti-spam, supressão LGPD. **Pendente no GAS Editor**: executar `fase20_escuta_prepararIndice()` → `{ok:true}`. **Smoke-test**: Escuta → Painel → pesquisas carregam + gráfico evolução; Escuta Livre → form ativo ou empty state; Escuta Livre → relato espontâneo → enviar; Gestão → marcadores metodológicos → painel circular aparece; FAB pulse aparece se pergunta disponível.

**Fase anterior**: **Fase 19 — Pós-evento Reservas + ConsolidacaoEngine (2026-05-26)** — Deploy @259 ✅. Implementado: (1) `reserva_repository.gs` — 3 novas colunas (`MinutosMontagem`, `MinutosEncerramento`, `PosEvento` JSON); `_parsePosEvento`, `_nCols` (leitura defensiva); `atualizarPosEvento()`, `atualizarPreEvento()`; `prepararIndice()` com migração de colunas (acrescenta sem reescrever). (2) `reserva_engine.gs` — `registrarPosEvento(id, dados, email, orgId)`: calcula `tempoAtividadeMin = duração − montagem − encerramento`, salva posEvento, auditoria. (3) `reservas_controller.gs` — `ctrl_reservas_registrarPosEvento(id, dados)`. (4) `index.html` — form reserva: campos "Montagem (min)" e "Encerramento (min)" + display dinâmico "Tempo de atividade" recalculado on-input/on-change horas; botão `assignment_turned_in` na lista para reservas cuja data ≤ hoje (verde se já registrado); modal `#pos-evento-modal` com: info da reserva (nome/espaço/data/tempo calculado), radio realizado/não, checkbox contabilizar, campo público presente, lista de comprovações (URL+descrição+add/remover), obs. gerais; BtnGuard no salvar; `GAS.reservas.registrarPosEvento` no namespace. (5) `acao_engine.gs` — `metaExecucao` adicionado ao schema e ao `_merge`. (6) `consolidacao_engine.gs` CRIADO — `calcularExecucaoAcao(acaoId, orgId)`: agrega reservas contabilizadas (posEvento.realizado=true, contabilizar=true), calcula horas de atividade por mês, público por mês, compara com `metaExecucao.metasPorMes`, lê contratos para execução financeira, retorna `{ porMes, total, metaExecucao, geradoEm }` com percentuais físico/público/financeiro; `ctrl_consolidacao_execucaoAcao(acaoId)`. **Auditoria CLAUDE.md**: GAS.reservas.registrarPosEvento binding ✅ | modal overlay rgba(0,0,0,.5)+box var(--surface) ✅ | BtnGuard btn-pos-evento-salvar ✅ | nenhum prompt()/confirm() ✅. **Próximo passo obrigatório**: executar `fase2_reservas_prepararIndice()` no GAS Editor para adicionar as 3 novas colunas à aba ESPACOS.Reservas. **Smoke-test esperado**: Espaços → Reservas → reserva com data passada → botão assignment_turned_in aparece → clicar → modal abre com info da reserva e tempo calculado → preencher público → adicionar comprovação → Salvar → botão fica verde; Ações → painel de ação → ConsolidacaoEngine retorna tabela mês-a-mês via `ctrl_consolidacao_execucaoAcao`.

**Fase anterior**: **Fase 18 — Reservas Modo Lote + Buffer + Habilitado (2026-05-26)** — Deploy @253 ✅. Implementado: (1) `reserva_engine.gs` — BUFFER 5 min ativado em `_horariosSobrepoem`; status `HABILITADO` adicionado à FSM (`confirmado→habilitado→em_uso`); notificação urgente por email para admins quando reserva é cancelada no próprio dia. (2) `reservas_controller.gs` — `ctrl_reservas_habilitar(id)` adicionado (confirmado→habilitado). (3) `index.html` — CSS `.badge-habilitado` (roxo) + 13 regras lote (lote-chip, lote-modo-btn, lote-dia); GAS binding `reservas.habilitar`; botão "Lote" ao lado de "Nova Reserva" (`data-bg-skip`); modal `#lote-modal` (2 cols: campos reserva + seletor datas 4 modos manual/semanal/intervalo/mensal idênticos ao CCBJ Fechado); IIFE `_LoteUI` com geração de datas, chips preview e dispatch para `GAS.reservas.criarLote`; botão "Habilitar" na lista para reservas `confirmado`; `_cancelar(id, dataReserva)` — motivo obrigatório + aviso visual quando data é hoje; admins notificados no backend. **Auditoria CLAUDE.md**: nenhum prompt()/confirm() ✅ | GAS.* habilitar binding ✅ | CSS lote-* definidas ✅ | modal overlay rgba(15,23,42,.70) + box var(--surface) ✅ | FsmGuardian registrado ✅ | btn-res-lote data-bg-skip ✅. **Smoke-test**: Espaços → Reservas → "Lote" → selecionar sala+hora+nome → modo Semanal (seg/qua/sex + mês) → Gerar → chips aparecem → "Criar Reservas" → lista atualiza com N reservas; cancelar reserva de hoje → motivo obrigatório + aviso vermelho; confirmar reserva → "Habilitar" → badge roxo "Habilitado"; F12 zero erros.

**Fase anterior**: **Fase 17 — Holerite e Processamento de Folha (2026-05-26)** — Deploy @251 ✅. Implementado: (1) `holerite_repository.gs` CRIADO — `holerites.json` + aba `EQUIPES.Holerites`; ID `HOL-AAAA-MM-NNN`; idempotente (substitui holerite gerado do mesmo colaborador/mês preservando ID); `salvar/listar/obter/marcarPago/cancelar/metricas/prepararIndice`. (2) `holerite_engine.gs` CRIADO — cálculo completo CLT: INSS progressivo (tabela viva do EncargosEngine), IRRF, horas extras 50%, VT (desconto ≤6% salário), VA, VR, PS, desconto falta; encargos patronais (INSS 20%, FGTS 8%, RAT 1%, SistemaS 5,66%, PIS 1%); provisões mensais (férias+1/3, 13°, FGTS rescisório 40%); `gerar(orgId, colaboradorId, mesRef, email, extra)`, `processarFolha(orgId, mesRef, email, opts)` em lote, `exportarCSV(orgId, mesRef)`. (3) `holerite_controller.gs` CRIADO — RBAC: leitura=rh|admin|superadmin + próprio colaborador; geração=rh|admin|superadmin; cancelar=admin|superadmin; 8 funções globais `ctrl_holerite_*`. (4) `setup.gs` — `EQUIPES` array +`'Holerites'`; `inicializarSistema()` chama `HoleriteRepository.prepararIndice()`; `fase17_holerite_prepararIndice()` global. (5) `index.html` — 8 GAS bindings `GAS.rh.holerite*`; CSS 11 blocos (hol-stats-strip, hol-lista, hol-badge-*, hol-modal-*, hol-ch-*, hol-table, hol-totais, hol-empresa-box); HTML painel `#rh-folha-painel-proc` (input mês, 3 botões BtnGuard, stats area, tabela 10 cols, filtro status); sub-nav "Processamento" 3º botão; `HoleriteUI` IIFE ~300 linhas (metricas, renderLista, processarFolha, exportarCSV, abrirHolerite, marcarPago via `_abrirModalConfirmar`+`_idPagamentoPendente`, impressão). **Auditoria CLAUDE.md**: BtnGuard (hol-btn-metricas/processar/exportar) ✅ | GAS.* namespace 100% ✅ | CSS todas classes definidas ✅ | modal overlay rgba(.55) + box var(--surface) ✅ | FsmGuardian n/a (status simples) ✅ | nenhum prompt()/confirm() ✅. **Próximo passo obrigatório**: executar `fase17_holerite_prepararIndice()` no GAS Editor → {ok:true}. **Smoke-test**: RH/DP → Folha → sub-aba "Processamento" → inserir mês → "Calcular Métricas" → stats aparecem → "Processar Folha" → lista atualiza com holerites gerados → clicar linha → modal holerite completo (proventos/descontos/encargos/provisões) → "Imprimir" → janela print abre → "Marcar Pago" → confirmar → badge vira "pago" → F12 zero erros.

> 📋 **Referência obrigatória**: [`PATTERNS.md`](PATTERNS.md) — padrões de código, UI/UX e regras de negócio para todas as próximas fases. Ler antes de iniciar qualquer nova implementação.
**O que foi feito (Fase 17 — 2026-05-26)**:
- ✅ `holerite_repository.gs` CRIADO — snapshots imutáveis em `holerites.json` + índice `EQUIPES.Holerites`; ID `HOL-AAAA-MM-NNN`; idempotente (mesmo colaborador/mês → substitui holerite gerado mantendo ID); `salvar/listar/obter/marcarPago/cancelar/metricas/prepararIndice`; sincronização sheet com 20 colunas
- ✅ `holerite_engine.gs` CRIADO — geração completa para CLT/PJ/bolsista; rubricas: `0001` salário base, `0020` HE 50%, `0030` adicional função, `1001` INSS progressivo (tabela viva EncargosEngine), `1002` IRRF (dedução INSS + dependentes), `1010` VT (≤6% salário), `1020` VA, `1025` VR, `1030` PS, `1099` desconto falta; encargos patronais completos (INSS 20%, FGTS 8%, RAT 1%, SistemaS 5,66%, PIS 1%); provisões mensais (férias+1/3, 13°, FGTS rescisório 40%); `processarFolha()` em lote retorna `{processados, erros, total, detalhes[]}`; `exportarCSV()` com 25 colunas
- ✅ `holerite_controller.gs` CRIADO — `_ctxHolerite()`, `_assertRH()`, `_assertAdmin()`; 8 funções globais `ctrl_holerite_*` (metricas, listar, obter, gerar, processarFolha, marcarPago, cancelar, exportarCSV); RBAC granular
- ✅ `setup.gs` — `EQUIPES` array incluiu `'Holerites'`; `inicializarSistema()` chama `HoleriteRepository.prepararIndice()`; `fase17_holerite_prepararIndice()` global executável no GAS Editor
- ✅ `index.html` — 8 GAS bindings (holeriteMetricas/Listar/Obter/Gerar/ProcessarFolha/MarcarPago/Cancelar/ExportarCSV); CSS 11 blocos (hol-stats-strip, hol-stat, hol-lista, hol-badge-{gerado,pago,cancelado}, hol-modal-overlay/box/header/body/footer, hol-ch-*, hol-table, hol-section-title, hol-totais, hol-total-box.{proventos,descontos,liquido}, hol-empresa-box); HTML painel `#rh-folha-painel-proc` (input mês competência, 3 botões BtnGuard, feedback div, stats area, tabela 10 colunas, filtro status); sub-nav "Processamento" adicionado como 3ª aba; `setSubAbaFolha` atualizado para `'proc'`; `HoleriteUI` IIFE ~300 linhas (aoAbrirProcessamento, carregarMetricas, renderLista, processarFolha, exportarCSV, abrirHolerite, marcarPago com `_abrirModalConfirmar`+`_idPagamentoPendente`, `_executarPagamento`, `_imprimirHolerite` via window.open)
- ✅ **Auditoria CLAUDE.md**: BtnGuard (hol-btn-metricas/processar/exportar) ✅ | GAS.* namespace 100% ✅ | CSS todas classes definidas ✅ | modal overlay `rgba(0,0,0,.55)` + box `background:var(--surface)` ✅ | FsmGuardian n/a (status sem FSM) ✅ | nenhum prompt()/confirm() ✅ | onclick usa `JSON.stringify(h.id).replace(/"/g,"'")` ✅
- ✅ Deploy @251

**Passo obrigatório no GAS Editor após este deploy**:
- Executar `fase17_holerite_prepararIndice()` → `{ok:true, aba:'EQUIPES.Holerites'}`

**[BROWSER] Smoke-test Fase 17:**
1. RH/DP → tab "Folha" → sub-aba "Processamento" → painel `#rh-folha-painel-proc` aparece
2. Inserir mês (ex: `2026-05`) → "Calcular Métricas" → stats strip exibe total/gerados/pagos/custo
3. "Processar Folha" → lista de colaboradores com holerites gerados (badge "gerado")
4. Clicar linha → modal abre com contracheque completo (proventos + descontos + encargos patronais + provisões + totais)
5. "🖨️ Imprimir" → janela de impressão abre com layout formatado
6. "✅ Marcar Pago" → modal de confirmação → confirmar → badge vira "pago" na lista
7. "Exportar CSV" → download do CSV mensal
8. Filtrar por status "gerado" → lista filtra corretamente
9. F12 → zero erros vermelhos | `BtnGuard.auditar()` → "✅ todos protegidos"

**O que foi feito (Fase 20 — 2026-05-27)**:
- ✅ `escuta_repository.gs` — perfis_analiticos.json: `salvarPerfilAnalitico`, `obterPerfilAnalitico`, `listarPerfis`; escuta_alertas.json: `listarAlertas`, `salvarAlertas`, `resolverAlerta`
- ✅ `escuta_engine.gs` — 8 novas funções: `salvarPerfilAnalitico`, `obterPerfilAnalitico`, `resolverAlerta`, `obterParticipacaoHistorica` (12 meses), `suprimirEmailsAntigos` (LGPD 90 dias), `obterConfigEscuta`/`salvarConfigEscuta` (config_org.json.escutaConfig), `togglePergunta`, `obterDadosUnificados` (carga unificada)
- ✅ `escuta_controller.gs` — 19 novos controllers (pulse, espontânea, alertas, config, perfil, relatório, governança, saturação, feedback, participação, banco perguntas, LGPD)
- ✅ `setup.gs` — `fase20_escuta_prepararIndice()` + call em `inicializarSistema()`
- ✅ `index.html` — GAS.escuta expandido (32 bindings); view-escuta rebuild completo: 6 abas (Painel/Escuta Livre/Alertas/Distribuição/Relatórios/Gestão) + pulse widget flutuante (FAB + painel 300px); `EscutaUI` IIFE reescrito ~620 linhas; perfil analítico voluntário com 6 campos; marcadores metodológicos (qualidade 0–100 circular + motor); gaps fairness no cruzamento; gráfico de barras evolução; saturação por dimensão com barra de progresso; participação histórica 12 meses; banco de perguntas toggle; config anti-spam; supressão LGPD
- ✅ **Auditoria CLAUDE.md**: nenhum prompt()/confirm() sem null-check ✅ (resolverAlerta usa _raw=prompt→if null→return; suprimirEmails usa confirm→if !_raw→return) | GAS.* 32 bindings todos mapeados ✅ | CSS: view-header/view-title/view-subtitle, badge-*, form-control, select-sm, filter-bar usados (já definidos) ✅ | modais overlay rgba(0,0,0,.52) + box var(--surface) ✅ | FsmGuardian via ctrl_escuta_mudar_status existente ✅ | BtnGuard: btn-nova-pesquisa, btn-escuta-refresh, btn-enviar-espontanea, btn-salvar-perfil, btn-gerar-relatorio, btn-lgpd-suprimir, btn-salvar-config-escuta, btn-salvar-escuta, btn-enc-esc-*, btn-ativar-esc-* ✅
- ✅ Deploy @273

**[BROWSER] Smoke-test Fase 20:**
1. Escuta → Painel: KPI strip + gráfico de barras evolução + lista de pesquisas
2. Escuta → Escuta Livre: form resposta (ativa ou empty state) + relato espontâneo + perfil analítico
3. Relato espontâneo: digitar texto → Enviar Relato → toast "Relato enviado!"
4. Perfil analítico: selecionar gênero/raça/vínculo → Salvar → toast "Perfil analítico salvo!"
5. Escuta → Distribuição: pulse dashboard por período + saturação + participação histórica
6. Escuta → Relatórios: selecionar pesquisa encerrada → resultados com nível climático + dimensões
7. Escuta → Relatórios → Relatório: gera recomendações por dimensão
8. Escuta → Gestão → Marcadores Metodológicos: círculo de qualidade + fatores + avisos motor
9. Escuta → Gestão → Banco de Perguntas: lista com toggle ativo/inativo
10. Escuta → Gestão → Configurações: campos anti-spam + Salvar
11. FAB pulse (canto inferior direito): aparece quando há pergunta → clicar → painel abre → escolher 1-5 → registra
12. F12 → zero erros | `BtnGuard.auditar()` → "✅ todos protegidos"

**GAS Editor (executar após deploy)**:
- `fase20_escuta_prepararIndice()` → `{ok:true}`

**O que foi feito (2026-05-22)**:
- ✅ Saneamento 0.9: zero hardcodes de org em `.gs`
- ✅ AcessoService + `primeiro_acesso.html` + router atualizado
- ✅ `USER_DEPLOYING` mantido (correto para Workspace + access:DOMAIN)
- ✅ `inicializarSistema()`: registra superadmin automaticamente
- ✅ Logomarca + paleta de cores: `LogoPaletaService`, `SistemaConfigService.getLogoUrl/getPaleta`, `Identidade` JS, admin UI
- ✅ **Paleta padrão → ROXO CCBJ** (`#7c3aed`/`#4c1d95`/`#f59e0b`) em `config_org.json`, `config_service.gs`, `index.html` `:root`
- ✅ **BtnGuard v2** (`shared/btnguard.html`): `wrap`, `travar`, `liberar`, `auditar`; `include()` em `router.gs`
- ✅ Todos os botões assíncronos protegidos: `index.html`, `primeiro_acesso.html`, todos os portais
- ✅ Deploy realizado no Apps Script: versões `@10`, `@11` e `@12` no deployment CCBJ
- ✅ UI principal reconstruída com identidade CCBJ moderna (Inter + Material Symbols)
- ✅ Fase 1.1 entregue: `TarefaRepository`, `TarefaEngine`, controllers `ctrl_tarefas_*`, migração Sheet → JSON e view mínima de Tarefas
- ✅ **Fase 1.2 entregue**: `ColaboradorRepository` (colaboradores.json + índice EQUIPES.Funcionarios), `PessoasEngine` (fusão EquipesEngine+RHEngine, FSMs status/férias), `pessoas_controller.gs` (ctrl_pessoas_* + ctrl_rh_*), view SPA + GAS.pessoas + PessoasUI
- ✅ **Fase 1.4 entregue** (2026-05-21): `AtivoRepository` (ESPACOS.Ativos Sheet canônica + MovimentacoesAtivos + BaixasAtivos + Manutencoes), `AtivosEngine` (FSM disponivel↔reservado↔em_uso↔manutencao→baixado), `ativos_controller.gs` (ctrl_ativos_* + RBAC infraestrutura/gestor/admin), `AlmoxarifadoEngine` (stub FSM empréstimo para Fase 2.2), view SPA Espaços (AtivosUI + GAS.ativos + rota espacos registrada)
- ✅ **Fase 2 entregue** (2026-05-22): `ReservaRepository` + `ReservaEngine` (`assertSemConflito` dentro de `LockService`), `reservas_controller.gs`, `ReservasItensRepository` (catálogo + empréstimos), `AlmoxarifadoEngine` (implementação completa), `ChaveRepository` + `ChaveEngine` + `chaves_controller.gs`, view Espaços com tabs (Reservas | Chaves | Empréstimos | Patrimônio), GAS.reservas/chaves/almox, deploy @24
- ✅ **Auditoria de bugs completa** (2026-05-22): 5 bugs identificados e corrigidos — (1) `prompt()` null check quebrado em ChavesUI/ReservasUI/AlmoxUI; (2) `ReservasUI.salvar()` sempre criava nunca atualizava + `GAS.reservas.atualizar` ausente; (3) CSS `badge-accent`/`form-grid` sem definição; (4) sanitização de email inconsistente em `IdentidadeAdmin`; (5) `FsmGuardian.transitar()` não chamado em `almoxarifado_engine.verificarAtrasos()`. Deploy @26. CLAUDE.md atualizado com checklist de auditoria obrigatória antes de todo deploy.
- ✅ **Fase 3 entregue** (2026-05-22): `ContratadoRepository` + `ContratadoEngine` (FSM contratado + FSM habilitação PF/PJ), `SolicitacaoRepository` + `SolicitacaoEngine` (FSM aprovação multinível + OrcamentoGuard stub), `contratacoes_controller.gs` (CQRS+cache+RBAC). `pessoas_engine.gs`: Afastamentos (FSM rascunho→ativo→encerrado) + Ocorrências (sem FSM). `colaborador_repository.gs`: afastamentos.json + ocorrencias.json. `pessoas_controller.gs`: ctrl_rh_listar/salvar/ativar/encerrar/cancelar_afastamento + ctrl_rh_listar/registrar/excluir_ocorrencia. View SPA Pessoas com 3 tabs (Colaboradores|Afastamentos|Ocorrências) + view Contratações com 3 tabs (Solicitações|Agentes|Habilitações). GAS.pessoas (afastamentos+ocorrências) + GAS.contratados + GAS.habilitacoes + GAS.contratacoes. setup.gs: `SCHEMA_ABAS` atualizado com `Contratados` (MASTER) e `SolicitacoesContratacao` (FINANCEIRO). Deploy @28.
- ✅ **Fase 4 entregue** (2026-05-22): `FonteRecursoRepository` + `FonteRecursoEngine` (FSM ativo→suspenso→encerrado, fontes_recurso.json), `OrcamentoGuard` real (verifica saldo em contratos.json, substitui stub F3, com comprometer/liberar/efetivarPagamento/snapshotSaldo), `RemanejamentoRepository` + `RemanejamentoEngine` (FSM 6 estados, snapshot imutável antes de submissão, efetivação em contratos.json, threshold configurável), `AditivoRepository` + `AditivoEngine` (FSM 7 estados, aprovação 2-etapas interno+fundador, efetivação automática em contratos.json), `financeiro_controller.gs` (ctrl_fonte_recurso_*, ctrl_remanejamento_*, ctrl_aditivo_* com RBAC). View Financeiro expandida com 4 tabs (Contratos|Fontes|Remanejamentos|Aditivos). GAS.fontesRecurso + GAS.remanejamentos + GAS.aditivos. FontesUI + RemanejamentosUI + AditivosUI + FinanceiroTabs. Deploy @30.

**O que foi feito (Fase 7 — 2026-05-23)**:
- ✅ `ConsentimentoService` — base legal LGPD, histórico, revogação, log de consentimentos em `consentimentos.json`
- ✅ `PublicoRepository` — inscrições, presenças, pesquisas, certificados em JSON Drive + índice PUBLICO.*
- ✅ `PublicoEngine` — FSM inscrição (inscrito→confirmado→presente→certificado/lista_espera→cancelado), lista de espera automática, promoção ao cancelar, frequência, NPS, dados CODIP
- ✅ `publico_controller.gs` (interno, autenticado) — ctrl_publico_*: listar, confirmar, cancelar, presença batch, pesquisas, certificados
- ✅ `portal_controller.gs` (público, sem auth) — rate limiting por email/janela 30min, ctrl_portal_getAgenda/getInfoAcao/inscrever/solicitarPauta/getStatusPauta/listarEspacos/registrarPesquisa
- ✅ `exportacao_engine.gs` — CODIP 28 campos (JSON+CSV BOM), SALIC XML, SNIIC indicadores anuais, CSV genérico
- ✅ Portais HTML ativados: portal_agenda/inscricao/cessao_pauta/pauta_status — todos os TODOs substituídos por `google.script.run` reais
- ✅ `index.html`: GAS.publico + GAS.exportacao namespaces, view-publico (stats + 4 tabs), PublicoUI completo (listar/confirmar/cancelar/exportar CSV/CODIP/SNIIC), rota 'publico' no sidebar
- ✅ `setup.gs`: `fase7_publico_prepararIndice()` global + chamadas em `inicializarSistema()`
- ✅ Deploy @136 em produção

**Passo obrigatório no GAS Editor após este deploy**:
- Executar `fase7_publico_prepararIndice()` → esperado `{ok:true}`

**O que foi feito (Fase 4.5)**:
- ✅ `config_org.json` + `config_service.gs`: `tiposOcorrencia` e `tiposAfastamento` estruturados (id/label/ativo)
- ✅ `config_admin_service.gs`: schema Espaço expandido (tipoEspaco, responsaveisPorTurno, itensFixos, equipamentosVinculados, horarioFuncionamento, versao); helpers `alternarItemFixo()`, `obterResponsavelEspacoPorDia()`, `listarCategoriasItens()`, `salvarCategoriaItem()`
- ✅ `admin_controller.gs` CRIADO: todos os `ctrl_admin_*` e `ctrl_solicitacoes_*` globais (espaços, turnos, setores, categorias, módulos, solicitações de reserva)
- ✅ `modulos_registry_service.gs` CRIADO: engine ausente que persistia módulos — referenciado em 6 arquivos mas nunca implementado; persiste para `modulos_config.json`; catálogo de 9 módulos
- ✅ `pccs_repository.gs` CRIADO: entidade PCCS hierárquica (PCCS → Cargos → Tabela nivel/classe/referencia/salarioBase); `pessoas_controller.gs` expandido com `ctrl_pccs_*`
- ✅ `setup.gs`: `setup_espacos_iniciais()` (8 espaços SAL-001..008), `setup_pccs_inicial()` (PCCS-001 com 7 cargos), `setup_categorias_itens_iniciais()` (6 categorias); `SCHEMA_ABAS` com `ESPACOS.Solicitacoes`; `inicializarSistema()` chama os seeds
- ✅ `solicitacao_reserva_repository.gs` + `solicitacao_reserva_engine.gs` CRIADOS: workflow SOL-xxx, criar/listar/aprovar/recusar; roles de aprovação direta; notificações ao responsável da sala + admins
- ✅ `reserva_engine.gs`: campo `sala` validado contra catálogo SAL-xxx; rota para SolicitacaoReservaEngine para colaboradores sem permissão direta; campo `salaNome` desnormalizado
- ✅ `almoxarifado_engine.gs`: `assertItemDisponivel()` subtrai itens fixados em outras salas; integração com `itensFixos` do catálogo de espaços
- ✅ `contratos_engine.gs` + `financeiro_controller.gs`: `adicionarItemMemoriaRubrica()`, `removerItemMemoriaRubrica()`, `calcularTotalRubrica()`, `salvarVersaoContrato()` (snapshot em `contratos_versoes.json`), `listarVersoes()`, `obterVersao()`, `ctrl_contrato_salvar_indicador()`
- ✅ `acesso_service.gs`: `ctrl_acesso_listarTodos()` e `ctrl_acesso_editarPapel()` adicionados; papéis incluem `habilitador`, `comunicacao`, `rh`
- ✅ `boot_service.gs`: inclui `tiposAfastamento` e `tiposOcorrencia` no bootstrap — populado nos selects automaticamente
- ✅ `index.html` UI: GAS.admin/acesso/rh/solicitacoes/contratos expandidos; cargo `<select>` + `_popularSelectCargo()`; tipos afastamento/ocorrência populados do bootstrap; sala `<select>` + `popularSelectEspacos()`; `ContratosDetailUI` (Metas & Rubricas com Memória de Cálculo grid + grid 12 meses de Indicadores + Histórico de Versões); painel Aprovações + badge solicitações; Admin Cadastros (5 tabs: Espaços|Setores|CategItens|Módulos|Usuários); deploy @32

**O que foi feito (Auditoria Visual — 2026-05-22)**:
- ✅ **Auditoria visual completa de todas as abas** (`index.html`): identificados e corrigidos 8 problemas CSS/estruturais:
  1. `--surface3` e `--divider` indefinidos → adicionados ao `:root` (usados em tabelas do ContratosDetailUI)
  2. `.muted-text` sem regra CSS → adicionado (cor muted, 13px), usado em ~20 pontos de loading/vazio
  3. `.oculto` sem regra global → adicionado `.oculto { display: none !important; }` (essencial para AdminCadastrosUI.abrirTab)
  4. `.admin-tab-content` sem CSS → adicionado com `display: block; padding-top: 12px`
  5. `.tab-btn.ativa` sem CSS → adicionado (cor primária, border-bottom, font-weight 600); usado por AdminCadastrosUI
  6. `.stat-icon.warning` e `.stat-icon.error` ausentes → adicionados (usados em métricas de Pessoas e Espaços)
  7. `.error-text`, `.success-text`, `.warning-text` ausentes → adicionados (usados em erros de carga de listas)
  8. **Tab bar de Espaços** com inline styles desuniformes → refatorado para usar `.tab-bar`/`.tab-btn` (consistente com Pessoas/Contratações/Financeiro)
  9. ContratosDetailUI: tab bar com `border-bottom:1px solid var(--divider)` e estilo inline hardcoded no 1º botão → migrado para `.tab-bar` + `.tab-btn.cd-tab`
- ✅ Deploy @38 realizado

**O que foi feito (Varredura de Bugs — 2026-05-22)**:
- ✅ **Bug crítico corrigido**: `mapa_ui.html` comentário de cabeçalho continha `</script>` literal (linha 4) e `<script>` literal (linha 5) — o HTML parser encerrava o bloco script externo prematuramente → `SyntaxError: Unexpected token '>'` no browser → app travado em "Carregando sistema..." desde deploy @38. Fix: substituir texto literal das tags por texto neutro.
- ✅ **Bug médio corrigido**: `DataGateway.obterAba` não estava exportado no `return {}` do módulo → `TypeError` em `ativos_repository.gs`, `contratado_repository.gs`, `solicitacao_repository.gs`. Fix: adição de `obterAba: _aba` ao return (commit 718c709, agora deployado).
- ✅ **Varredura completa do checklist CLAUDE.md**: 6/6 itens OK (prompt/confirm, GAS.* namespace, CSS, DOM IDs, FsmGuardian, BtnGuard.wrap)
- ✅ **183 ctrl_* backend vs 144 bindings frontend**: 100% alinhados (sem função chamada sem implementação)
- ✅ **CSS Mapa**: todas as classes `.mapa-pl-*`, `.mapa-reserva-item`, `.stat-card`, `.badge-accent` definidas
- ✅ Deploy @46 realizado

**O que foi feito (Fase 5 — 2026-05-23)**:
- ✅ `AcaoRepository` (acoes.json + índice ACOES.Acoes): listar/buscar/salvar/excluir + métricas + prepararIndice
- ✅ `AcaoEngine`: FSM planejada→em_producao→em_execucao→concluida→arquivada + cancelada; FsmGuardian registrado; snapshot pré-transição; obterPainelIntegrado (tarefas+reservas+contratos)
- ✅ `acoes_controller.gs`: ctrl_acoes_listar/obter/metricas/painel/salvar/mudar_status/excluir; RBAC (leitura=todos, escrita=coordenador+, excluir=admin); CQRS com cache
- ✅ `setup.gs`: AcaoRepository.prepararIndice() em inicializarSistema()
- ✅ `index.html`: view-acoes com Kanban 4 colunas + Lista + métricas; modal criar/editar; painel detalhe 6 tabs; GAS.acoes namespace; AcoesUI module; CSS aliases (btn-primary, modal, kanban, table); BtnGuard completo
- ✅ Deploy @61

**O que foi feito (Administração funcional — 2026-05-23)**:
- ✅ **BUG CRÍTICO corrigido**: `_confirmarAprovar` e `_confirmarRevogar` enviavam `{email}` mas backend espera `{emailAlvo}` → aprovação e revogação de usuários agora funcionam
- ✅ **BUG CRÍTICO corrigido**: `abrirModalSetor(id)` pré-preenchia campo Nome com o ID (ex: `direcao`), não com o nome legível → adicionado cache `_setores[]` e lookup correto
- ✅ **F4 — Campo Cor no setor**: modal de setor agora tem color picker + campo hex; `salvarSetor` envia `{id, nome, cor}`; lista exibe dot colorido
- ✅ **F1 — Tab Turnos**: adicionada tab "Turnos" na seção Admin com CRUD completo (listar, criar, editar) — modal com Nome, Início, Fim e checkboxes Seg-Dom; backend `ctrl_admin_listarTurnos/salvarTurno` já existia
- ✅ **F2 — Setor no modal de editar usuário**: modal de editar papel agora inclui select de setor (alimentado por `_setores`); `editarPapel` envia `{email, papel, setor}`
- ✅ **F3 — Configuração de Expediente**: card "Expediente & Horários" na view-admin com inputs de abertura/encerramento; `ExpedienteUI` module; `ctrl_admin_obterConfigExpediente` + `ctrl_admin_salvarConfigExpediente` no backend; persiste em `config_org.json`
- ✅ Deploy @64

**O que foi feito (Espaços — Toast, Sidebar e Modos de Visualização — 2026-05-23)**:
- ✅ **`response.gs`**: `GasResponse.wrap()` agora propaga `e.code` e `e.details` de erros throwados — zero risco de regressão (usa `||` com fallbacks)
- ✅ **`reserva_engine.gs`**: erro estruturado `CONFLITO_RESERVA` — `_errConflito.code = 'CONFLITO_RESERVA'` e `.details = { sala, salaNome, nomeAcao, horaInicio, horaTermino, responsavel, setor }`. `salaNome` resolvido via `SistemaConfigService.getEspacos()`
- ✅ **`index.html` CSS**: `.res-modo-btn.active`, `.rdg-row/sala-label/grid-area/bloco`, `.rag-bloco`, `.mapa-res-item` com hover — todas as classes usadas
- ✅ **`index.html` HTML**: toggle Lista/Agenda/Diagrama inserido; conteúdo da lista envolvido em `#res-modo-lista`; containers `#res-modo-agenda` e `#res-modo-diagrama` adicionados
- ✅ **`index.html` JS — ReservasUI**:
  - `_mostrarToastConflito(err)`: toast vermelho com card interno mostrando nome do evento conflitante, espaço, horário, responsável e setor
  - `salvar()`: detecta `CONFLITO_RESERVA` e chama `_mostrarToastConflito` em vez de Toast simples
  - `_cancelar(id)`: prompt() removido → overlay modal com input de motivo e botão de confirmação
  - Estado: `_modo`, `_listaCacheTotal`, `_espacosPorId`, `_semanaOffset`, `_diagramaDia`
  - `setModo(modo)`: toggle containers + limpa clock do diagrama ao sair
  - `_getSemana(offset)`: retorna 7 strings YYYY-MM-DD (Seg–Dom)
  - `_garantirEspacosPorId()`: lazy-load de `App.getBoot().espacos`, fallback para `_espacosCatalogo`
  - `carregar()`: suporte a `dateRange` para modos agenda/diagrama
  - `_renderDiagrama()`: Gantt 7h–22h (3.2px/min = 2880px), colunas por espaço (120px, cor dedicada), régua de horas, marcador "agora" vermelho, blocos coloridos (✓HAB verde, HAB? âmbar dashed, EM USO roxo, concluído cinza), filtros texto+espaço (client-side), navegação por dia e semana, relógio auto-refresh 60s, auto-scroll para hora atual
  - `_renderAgenda()`: calendário semanal 8h–22h (2.4px/min), 7 colunas, linha "agora" vermelho, sub-colunas para sobreposição, filtro por espaço, navegação ←/→, auto-scroll
  - `_abrirDetalheReserva(id)`: modal com todos os campos, badge HAB, botões de ação por status
- ✅ **`mapa_ui.html` — Sidebar interativa**:
  - Estado `_reservasDoDia` armazena reservas carregadas por espaço
  - `_ag(total)`: placeholder de carregando enquanto timeline carrega
  - `_carregarTimeline()`: armazena resultado em `_reservasDoDia` e chama `_renderAgendaReservas`
  - `_renderAgendaReservas()`: lista clicável ordenada por horário, borda colorida por status, badges ✓HAB/HAB?/EM USO
  - `_abrirCardReserva(r)`: modal completo via `_abrirModal` — todos os campos + botões confirmar/iniciar/concluir/cancelar por status
  - `_abrirModalCancelamento(rId, espacoId)`: modal de cancelamento sem `prompt()` — input de motivo + botão confirmar
- ✅ Deploy @68

**O que foi feito (CCBJ Fechado — 2026-05-23)**:
- ✅ **`reserva_engine.gs`**: `_cancelarConflitantes()` — cancela todas as reservas ativas conflitantes (exceto outras do tipo BLOQUEIO), emite SystemEvents, registra auditoria, envia email ao responsável de cada cancelamento; `criarBloqueio(dados, datas, emailAdmin, orgId)` — bypassa `assertSemConflito`, cria reservas com `tipoAcao: 'BLOQUEIO'` e `status: confirmado`; exposto em `ReservaEngine.criarBloqueio`
- ✅ **`reservas_controller.gs`**: `ctrl_reservas_bloquear(params, datas)` — RBAC gestor/admin/superadmin; loop cancela conflitos + salva bloqueios; `ctrl_reservas_cancelar_bloqueios(ids)` — cancelamento em lote para operação "Desfazer"
- ✅ **`index.html` GAS**: `GAS.reservas.bloquear` e `GAS.reservas.cancelarBloqueios` adicionados
- ✅ **`index.html` frontend**:
  - Botão `🔒 CCBJ Fechado` na barra de Reservas (visível apenas para gestor/admin/superadmin, controlado pelo nível carregado ao abrir a aba)
  - Modal `#ccbj-modal` com 4 modos de seleção de datas em lote: **Manual** (input date + chip), **Semanal** (checkboxes Seg-Dom + range), **Intervalo** (a cada N dias + quantidade ou data fim), **Mensal** (3 submodos: dia fixo / Nº dia útil / Nª semana do mês)
  - Chips de preview com remoção individual e botão "Limpar"
  - Info box listando todos os espaços que serão bloqueados
  - Aviso sobre cancelamento automático de conflitos
  - CSS `.ccbj-chip`, `.ccbj-modo-btn.ccbj-ativo`, `.ccbj-sub-btn.ccbj-sub-ativo`, `.ccbj-dia-chip` adicionados ao `<style>`
  - `_BloqueioUI` IIFE com toda a lógica do modal; delegado via `ReservasUI._ccbj*`
  - Toast de resultado com botão "↩ Desfazer" imediato (cancela apenas os bloqueios recém-criados via `ctrl_reservas_cancelar_bloqueios`)
- ✅ **Diagrama**: blocos `tipoAcao === 'BLOQUEIO'` renderizados em vermelho (`bg:#fef2f2; border:#fca5a5`) com label `🔒` + motivo (campo `release`); legenda atualizada com item "🔒 CCBJ Fechado"
- ✅ **Lista**: badge `🔒 BLOQUEIO` vermelho exibido antes do nome da ação
- ✅ Todos os botões do modal marcados com `data-bg-skip="1"` — BtnGuard.auditar() passa
- ✅ Deploy @82

**O que foi feito (Editor de Terreno — 2026-05-23)**:
- ✅ `TerrenoEditorUI` (terreno_editor.html): editor full-screen de contorno do campus com pontos arrastáveis, curvas bezier, zoom/pan, redefinir para hexágono padrão
- ✅ `ConfigAdminService.lerTerreno/salvarTerreno`: persiste `mapaTerrenoConfig: { pontos, svgPath }` em `config_org.json`
- ✅ `ctrl_admin_lerTerreno/salvarTerreno`: controllers com RBAC admin
- ✅ `InfraConfigUI` (index.html): toolbar "Editar Terreno" + label indicando padrão/personalizado; canvas carrega terreno salvo; `MapaUI.atualizarTerreno()` chamado ao salvar novo terreno
- ✅ `MapaUI` (mapa_ui.html): `_aplicarTerreno()` substitui `.mapa-bg`/`.mapa-borda` pelo `svgPath` personalizado; terreno carregado via `GAS.admin.lerTerreno()` na primeira abertura (cacheado); `atualizarTerreno()` exposto na API pública
- ✅ Deploy @100

**O que foi feito (Observabilidade — 2026-05-23)**:
- ✅ `sistema_metricas_controller.gs` CRIADO: `ctrl_sistema_metricas_obter(params)` — superadmin only (RBAC via AcessoService), coleta AuditoriaStore (stats globais + eventos críticos recentes + módulos com atividade) + MetricsEngine (fsm/seguranca/governanca/usuarios/performance) + falhas por módulo via consulta separada; gera insights classificados (FSM violations, erros arquiteturais, hotspots de erro >15%, falhas de auth, acessos negados repetidos, módulos inativos); retorna rankingModulos, rankingUsuarios, eventosCriticos
- ✅ `index.html` — Menu: entrada `{ id:'sistema-metricas', label:'Observabilidade', icone:'monitoring', modulo:null, superadmin:true }` em `_MODULOS_MENU`; guard `if(item.superadmin && _boot.usuarioPapel !== 'superadmin') return;` em `_construirMenu()`; rota `SistemaMetricasUI.aoAbrir()` registrada
- ✅ `index.html` — GAS namespace: `GAS.sistemaMetricas.obter(params, cb, err)` adicionado
- ✅ `index.html` — View HTML `#view-sistema-metricas`: header com seletor de período (7/30/90d), stats strip de resumo, seção de insights e alertas, tabela de módulos com mini-barra de proporção, grid de segurança/FSM/governança, ranking de usuários, lista de eventos críticos recentes
- ✅ `index.html` — `SistemaMetricasUI` JS module: `aoAbrir()` verifica superadmin no frontend; `carregar()` mostra loading → chama backend → renderiza; `setPeriodo()` atualiza botão ativo e recarrega; 6 funções de renderização (`_renderResumo`, `_renderInsights`, `_renderModulos`, `_renderSegurancaGrid`, `_renderUsuarios`, `_renderEventosCriticos`)
- ✅ `index.html` CSS: variáveis aliases `--primary/--success/--warning/--danger/--info/--bg-card` adicionadas ao `:root` (corrige também usos existentes em outros módulos); `.sm-periodo-btn.ativo` para seletor de período
- ✅ Deploy @104

**O que foi feito (Fase 6 — 2026-05-23)**:
- ✅ **EventHandlerRegistry**: 7 handlers reais implementados — `RESERVATION_CREATED` → tarefa de prep + notifica RECE; `CONTRACT_EXPIRED`/`KEY_PROTOCOL_DELAYED`/`ITEM_NOT_RETURNED` → `TarefaEngine.criarAutomatica`; `ACTION_COMPLETED` → email CODIP para admins; `TASK_COMPLETED`/`ACTION_STARTED` → log rastreável
- ✅ **EventLog** estendido para 11 colunas: `status` (pendente/processado/erro), `tentativas`, `ts_processado`; novos métodos `getPendentes()`, `contarPorStatus()`, `marcarProcessado()`, `incrementarTentativa()`, `marcarErro()`; migração de schema antigo sem regressão
- ✅ **processarEventosPendentes()** com retry (máx 3 tentativas) + alerta aos admins quando fila > 100 pendentes; `criarTriggerEventosPendentes()` pronto para configurar no GAS Editor
- ✅ **TokenService** (`token_service.gs`): gera/valida/expira tokens com TTL 72h em aba `MASTER.Tokens`; idempotente; TTL real via timestamp
- ✅ **router.gs**: nova rota `?secao=token_acao&token=X&acao=aprovar|recusar` — renderiza página de confirmação com resultado; suporta: aprovacao_ferias, aprovacao_remanejamento, aprovacao_aditivo, aprovacao_solicitacao, aprovacao_cessao_pauta
- ✅ **NotificationEngineTokens**: `enviarSolicitacaoFerias()`, `enviarSolicitacaoRemanejamento()`, `enviarSolicitacaoAditivo()` — emails com links de aprovar/recusar (TTL 72h)
- ✅ **ReceRepository** (`rece_repository.gs`): JSON `rece_agenda.json` + aba `COMUNICACAO.AgendaRECE` (29 colunas); listar/buscar/salvar/excluir/metricas/proximoId/prepararIndice
- ✅ **ReceEngine** (`rece_engine.gs`): FSM rascunho→submetida→publicada→encerrada + cancelada; sincronização automática com Reserva Geral (via `notificarNovaReserva`); upload de imagem para Drive (`CCBJ_RECE_Imagens`); convites Google Calendar; email institucional ao publicar
- ✅ **ReceController** (`rece_controller.gs`): `ctrl_rece_listar/obter/metricas/salvar/mudar_status/excluir/upload_imagem` com RBAC papel `comunicacao`; `ctrl_eventbus_status` — painel de fila de eventos para admin
- ✅ **setup.gs**: `fase6_rece_prepararIndice()` global; `inicializarSistema()` chama `ReceRepository.prepararIndice()`, `TokenService.garantirAbaTokens()` e `SystemEvents.garantirAbaEventLog()` (migração schema)
- ✅ **index.html** — GAS.rece (7 bindings) + GAS.eventbus; view-comunicacao com lista RECE, filtros, métricas e modal de 25 campos; ReceUI module completo (aoAbrir, carregar, filtrar, renderLista, abrirForm, salvar, mudarStatus, cancelar sem prompt); Observabilidade: painel EventBus com contadores e lista de pendentes; CSS: badge-danger/secondary/info, btn-danger, form-section-title adicionados
- ✅ Deploy @132

**O que foi feito (Fase 8 — 2026-05-23)**:
- ✅ `AgenteCulturalRepository` — `agentes_culturais.json` + índice `MASTER.AgentesCulturais`; listar/buscar/metricas/salvar/excluir
- ✅ `AgenteCulturalEngine` — FSM rascunho→ativo↔suspenso→descredenciado; auto-cadastro portal; rider técnico; histórico de vínculos; email boas-vindas ao ativar
- ✅ `agentes_controller.gs` — ctrl_agentes_listar/obter/metricas/salvar/mudarStatus/salvarRider/excluir + ctrl_portal_cadastrarAgente (sem auth)
- ✅ `AcervoRepository` — `acervo.json` + índice `ACOES.Acervo`; checklist de evidências por Ação (foto/video/release/poster/folder/ata)
- ✅ `AcervoEngine` — upload ao Drive (pasta por Ação), status LGPD (nao_verificado/autorizado/restrito/sem_pessoas), exportação ZIP (lista de URLs)
- ✅ `acervo_controller.gs` — ctrl_acervo_listar/listarPorAcao/checklist/metricas/registrar/atualizar/statusLGPD/excluir/exportarZip
- ✅ `VoluntarioRepository` — `voluntarios.json` + `alocacoes_voluntarios.json` + índice `MASTER.Voluntarios`
- ✅ `VoluntarioEngine` — FSM voluntário (cadastrado→ativo↔inativo) + FSM alocação (alocado→confirmado→presente→concluido/cancelado); email convite; registro de horas; email certificado ao concluir
- ✅ `voluntario_controller.gs` — ctrl_voluntarios_listar/obter/metricas/salvar/mudarStatus/excluir/listarAlocacoes/alocar/confirmarAlocacao/registrarPresenca/concluirAlocacao/cancelarAlocacao
- ✅ `ParceriaRepository` — `parcerias.json` + índice `ACOES.Parcerias`
- ✅ `ParceriaEngine` — FSM proposta→negociacao→ativa→encerrada/cancelada; vínculos com Ações; entregas; avaliação ao encerrar
- ✅ `parceria_controller.gs` — ctrl_parcerias_listar/obter/metricas/listarPorAcao/salvar/mudarStatus/vincularAcao/desvincularAcao/salvarEntrega/avaliar/excluir
- ✅ `portal_agente.html` — auto-cadastro público: tipos PF/PJ, áreas artísticas (12 chips), linguagens, bio, portfolio dinâmico, rider técnico, disponibilidade, consentimento LGPD; envia para `ctrl_portal_cadastrarAgente` sem autenticação
- ✅ `events_constants.gs` — 18 novos eventos: AGENT_*, ACERVO_*, VOLUNTEER_*, PARTNERSHIP_*
- ✅ `setup.gs` — SCHEMA_ABAS: MASTER+AgentesCulturais+Voluntarios / ACOES+Acervo+Parcerias; inicializarSistema() chama prepararIndice() de todos os 4 repos; `fase8_prepararIndice()` global
- ✅ `router.gs` — rota `secao=agente` → portal_agente.html
- ✅ `index.html` — 4 novos GAS namespaces (GAS.agentes 7 bindings, GAS.acervo 9, GAS.voluntarios 11, GAS.parcerias 11); seção "MEMÓRIA" no sidebar; views view-agentes/acervo/voluntarios/parcerias; AgentesUI/AcervoUI/VoluntariosUI/ParceriasUI; modais opacos; BtnGuard em todos os botões; prompt() com null-check; Router.registrar() para todos
- ✅ **Auditoria CLAUDE.md**: prompt()/null-check ✅ | GAS.* namespace 100% ✅ | modais opacos ✅ | FsmGuardian em todas as transições ✅
- ✅ Deploy @138 em produção

**Passo obrigatório no GAS Editor após este deploy**:
- Executar `fase8_prepararIndice()` → `{ok:true}` — cria abas AgentesCulturais, Acervo, Voluntarios, Parcerias

**[BROWSER] Smoke-test Fase 8:**
1. Sidebar → seção "MEMÓRIA" com 4 itens (Agentes, Acervo, Voluntários, Parcerias)
2. Agentes → stats carregam → botão "+ Novo Agente" → modal abre → criar agente → aparece na lista com badge "Rascunho"
3. Ativar agente → badge muda para "Ativo"
4. Portal Público Agentes: URL `?secao=agente` → formulário com áreas/rider → enviar → protocolo exibido
5. Acervo → "+ Adicionar" → modal com tipo/ação/URL → salvar → card aparece na galeria
6. Voluntários → "+ Novo" → criar → tab Alocações → verificar lista
7. Parcerias → "+ Nova" → criar → status Proposta → avanço para Negociação
8. F12 → zero erros vermelhos | BtnGuard.auditar() → "✅ todos protegidos"

**O que foi feito (Fase 9 — 2026-05-23)**:
- ✅ `setup.gs`: `fase9_migrarOrgId()` — migração idempotente de orgId em 31 arquivos JSON; `fase9_validarIsolamento()` — auditoria de integridade; `fase9_prepararIndice()` — prepara aba MASTER.Orgs e registra a org
- ✅ `config_org.json`: bloco `features` com 18 feature flags granulares e seus defaults
- ✅ `config_service.gs`: `getFeatureFlag(flagId)` + `setFeatureFlag(flagId, ativo)` + `getFeatureFlagsCatalogo()` — catálogo de 18 flags agrupadas por área (core/portal/comunicacao/memória/exportação/notificações/espaços/admin)
- ✅ `org_registry_service.gs` CRIADO: `registrarOuAtualizar`, `listarTodas`, `obter`, `atualizarStatus`, `atualizarPlano`, `marcarAtividade`, `checarProvisionamento` (8 verificações de setup)
- ✅ `admin_controller.gs`: `ctrl_admin_listarFeatureFlags`, `ctrl_admin_setFeatureFlag`, `ctrl_admin_checarProvisionamento`, `ctrl_orgs_listar`, `ctrl_orgs_atualizarStatus`, `ctrl_orgs_atualizarPlano`
- ✅ `wizard_controller.gs` CRIADO: 7 controllers — `ctrl_wizard_obterEstado/salvarOrg/salvarSetores/salvarTurnos/salvarEspacos/salvarModulos/finalizar`; retoma setup do passo pendente; idempotente
- ✅ `wizard_setup.html` CRIADO: wizard SPA 6 passos (Organização→Setores→Turnos→Espaços→Módulos→Finalizar→Sucesso); stepper lateral; BtnGuard em todos os botões async; acessível em `?secao=wizard_setup`
- ✅ `router.gs`: rota `secao=wizard_setup` → `_renderWizardSetup()` servindo o wizard
- ✅ `index.html`: `GAS.orgs` (3 bindings), `GAS.admin.listarFeatureFlags/setFeatureFlag/checarProvisionamento`; tab "Features" (toggles com switch visual por grupo); tab "Provisionamento" (checklist + barra de progresso + link para wizard); view `#view-painel-orgs` (stats, tabela de orgs com status e plano); entrada `painel-orgs` no menu (superadmin); `FeatureFlagsUI` module; `PainelOrgsUI` module; `_carregarProvisionamento()` em `AdminCadastrosUI`
- ✅ Auditoria CLAUDE.md: prompt/null-check ✅ | GAS.* namespace 100% ✅ | BtnGuard em wizard ✅ | modais opacos ✅
- ✅ Deploy @140 em produção

**Passo obrigatório no GAS Editor após este deploy**:
- Executar `fase9_prepararIndice()` → `{ok:true}` — migra orgId nos dados existentes, cria aba MASTER.Orgs, registra a org no OrgRegistry

**[BROWSER] Smoke-test Fase 9:**
1. URL produção → carrega sem erros (F12)
2. Admin → Cadastros → tab "Features" → toggles aparecem por grupo → ativar/desativar uma flag → toast "Feature ativada"
3. Admin → Cadastros → tab "Provisionamento" → checklist aparece com barra de progresso → link "Wizard de Setup" visível
4. URL `?secao=wizard_setup` → wizard abre com stepper → passo 1 (Org) pré-preenchido → navegar entre passos → BtnGuard nos botões
5. Sidebar → item "Painel de Orgs" (superadmin) → view carrega com stats → tabela de orgs
6. F12 → zero erros | `BtnGuard.auditar()` → "✅ todos protegidos"

**O que foi feito (Fase 12.1 — 2026-05-24)**:
- ✅ **CSS**: ~80 linhas de estilos Fase 12 — acordeão 4 níveis (`.pt-meta-card`, `.pt-atv-card`, `.pt-rub-row`), cards pessoal (`.pes-card`), tabela plano de contas (`.pc-table`), grade de meses indicadores (`.ind-mes-table`, `.ind-meta-row`, `.ind-real-row`)
- ✅ **GAS namespace**: 32 bindings em `GAS.contratos` (vs 14 anteriores) — `salvarMeta/excluirMeta`, `salvarAtividade/excluirAtividade`, `salvarPessoal/excluirPessoal/calcularPessoal`, `salvarRubrica/excluirRubrica`, `salvarIndicador/atualizarMetaMes`, `salvarIndicadorGestao/excluirIndicadorGestao/atualizarMetaGestao`, `planoContas`, `historico`; novo namespace `GAS.catalogoSeplag` (4 bindings)
- ✅ **HTML**: tab "Fontes de Recurso" removida do Financeiro (3 tabs restantes: Contratos | Remanejamentos | Aditivos); form de Contrato expandido com seção "Fonte de Recurso" embutida (instrumento, órgão financiador, contrapartida, observação); `#contrato-detalhe-card` refeito com 5 abas: Plano de Trabalho | Pessoal | Indicadores | Plano de Contas | Histórico; modais Meta/Pessoal/IndicadorR/IndicadorG todos opacos (overlay rgba .52 + box `var(--surface)`)
- ✅ **ContratosUI**: `abrirForm()` popula novos campos; `salvar()` envia `numero`, `modalidade`, `orgaoFinanciador`, `contrapartida`, `obsFinanceiro`, `objeto`
- ✅ **ContratosDetailUI** (~820 linhas): reescrito como IIFE completo com 40+ funções — acordeão 4 níveis com toggle expand/collapse, catálogo SEPLAG lazy-load, memória de cálculo dinâmica, cálculo pessoal em tempo real (fórmulas CCBJ III→VIII), grade de meses editável inline, períodos GESTÃO semestral/anual, tabela plano de contas com total geral; BtnGuard em todos os 6 botões async
- ✅ **Auditoria CLAUDE.md**: prompt/null-check ✅ | GAS.* namespace 100% ✅ | CSS todas as classes definidas ✅ | modais opacos ✅ | onclick JSON.stringify .replace ✅ | FsmGuardian (server-side via ctrl_contratos_status) ✅
- ✅ Deploy @179 em produção

**[BROWSER] Smoke-test Fase 12.1** (verificar manualmente):
1. Financeiro → apenas 3 tabs visíveis (sem "Fontes de Recurso")
2. "+ Novo Contrato" → form com seções "Dados" + "Fonte de Recurso" → preencher → salvar → aparece na lista
3. "Gerenciar" → 5 abas: Plano de Trabalho | Pessoal | Indicadores | Plano de Contas | Histórico
4. Plano de Trabalho → "+ Nova Meta" → modal abre (fundo opaco) → preencher título → Salvar → meta aparece
5. Expandir meta → "+ Atividade" → form inline → salvar → atividade listada
6. Expandir atividade → "+ Item de Despesa" → select SEPLAG popula → selecionar item → código auto-preenchido → adicionar linhas de memória → total calculado → Salvar
7. Pessoal → "+ Adicionar" → preencher salário → campos III–VIII calculam em tempo real → Salvar
8. Indicadores → RESULTADOS → grade de meses → editar célula → salva; GESTÃO → criar indicador → inserir meta
9. Plano de Contas → "Recalcular" → tabela SEPLAG aparece com total geral
10. F12 → zero erros vermelhos | `BtnGuard.auditar()` → "✅ todos protegidos"

**O que foi feito (Fase 11.1 — 2026-05-24)**:
- ✅ `EstrategiaRepository` (`objetivos_estrategicos.json` + aba `ACOES.Estrategia`): listar/buscar/salvar/excluir/métricas/prepararIndice
- ✅ `EstrategiaEngine`: FSM rascunho→ativo→em_revisao→concluido+cancelado; `calcularKPIs()` real (ocupação espaços, conclusão ações no prazo, custo por ação, NPS público, execução orçamentária, renovação agentes); `calcularRiscos()` (ações atrasadas, objetivos sem ações, contratos vencendo, clima baixo, tarefas atrasadas); `gerarRelatorio()` trimestral/semestral/anual; `gerarCalendario()` por horizonte
- ✅ `estrategia_controller.gs`: CQRS + cache + RBAC (leitura=todos, escrita=coordenador+, excluir=admin+)
- ✅ `events_constants.gs`: 7 novos eventos STRATEGY_*
- ✅ `setup.gs`: `ACOES.Estrategia` em `SCHEMA_ABAS`; `fase11_prepararIndice()`
- ✅ `index.html`: `GAS.estrategia` (13 bindings); view-estrategia com 4 tabs (Objetivos | KPIs Reais | Riscos do Mês | Calendário); `EstrategiaUI` module completo; menu sidebar → item "Estratégia" (ícone flag, seção PRINCIPAL)
- ✅ **Identidade TRAMAR**: sidebar tagline → "TRAMAR — Sistema de Gestão Cultural"; `document.title` → "TRAMAR — [nome da inst.]"; logo sidebar maior (52×52px); `_aplicarBoot` usa `nomeInstituicao` do boot
- ✅ **Campos Identidade Institucional**: `nomeInstituicao` + `apresentacaoInstituicao` em `config_org.json`; `getPublicOrgConfig()` expõe no boot; `LogoPaletaService.obter/salvar` lê/persiste; campos no painel Admin → sub-aba Identidade Visual; `IdentidadeAdmin.salvar()` inclui os novos campos e atualiza sidebar em tempo real
- ✅ Deploy @167 em produção

**Passo obrigatório no GAS Editor após este deploy**:
- Executar `fase11_prepararIndice()` → esperado `{ok:true, passos:[...]}` (cria aba ACOES.Estrategia)

**Smoke-test Fase 11.1** (verificar no browser):
1. Sidebar → logo maior (52px); tagline "TRAMAR — Sistema de Gestão Cultural"
2. Menu → "Estratégia" (ícone flag) → view carrega com 4 tabs
3. "+ Novo Objetivo" → modal abre → criar objetivo curto prazo → aparece na lista com barra de progresso
4. Tab "KPIs Reais" → cards carregam com valores reais (não zeros)
5. Tab "Riscos do Mês" → lista de riscos classificados por severidade
6. Tab "Calendário" → linha do tempo por horizonte
7. Ação vinculada: "Editar" objetivo → "+ Ação" → modal → vincular ação existente
8. Admin → Identidade Visual → campos "Nome da Instituição" + "Apresentação" → salvar → sidebar atualiza em tempo real
9. F12 → zero erros | `BtnGuard.auditar()` → "✅ todos protegidos"

**Fase 11 concluída. Próximo**: **Fase 13 — Produto Pronto** — exportações SALIC/SNIIC, documentação de provisionamento multi-org, smoke-test com org diferente do CCBJ. Antes: `clasp login` → `clasp push && clasp deploy` → `fase11_prepararIndice()` no GAS Editor.

**Passo obrigatório no GAS Editor após este deploy**:
- Executar `fase10_prepararIndice()` → esperado `{ok:true, passos:[...]}` (cria abas REUNIOES.Reunioes, COMUNICACAO.Demandas, MASTER.AlertasLog; migra orgId nos JSON)

**Smoke-test Fase 10** (verificar no browser):
1. Topbar → badge de alertas aparece (ícone 🔔) → clicar → painel deslizante abre com lista
2. Menu → "Meu Centro" (hub) → TaskHub carrega com Meu Dia/Meu Time/Produtividade
3. Menu → "Reuniões" → listar (pode estar vazio) → criar reunião → agendar → iniciar → encerrar → ata → encaminhamento
4. Menu → "Balcão" → criar demanda → SLA calculado → mudar status → versão → comentário
5. Menu → Administração → aba Auditoria → logs aparecem com filtros → (superadmin) botão Rollback
6. F12 → zero erros vermelhos | `BtnGuard.auditar()` → "✅ todos protegidos"

---

### PropertiesService obrigatórias — configurar ANTES de inicializarSistema()

| Chave                | Valor CCBJ                          | Obrigatório? |
|----------------------|-------------------------------------|--------------|
| `ORG_NOME`           | `CCBJ`                              | Sim          |
| `ORG_NOME_COMPLETO`  | `Centro Cultural Bom Jardim`        | Sim          |
| `ORG_DOMINIO`        | `idm.org.br`                        | Sim          |
| `ADMIN_EMAIL`        | `joao.barros@idm.org.br`            | Sim          |
| `IA_ASSISTENTE_NOME` | `Bêjotinha`                         | Opcional     |
| `ORG_TIMEZONE`       | `America/Fortaleza`                 | Opcional     |
| `ORG_LOGO_URL`       | URL do logotipo                     | Opcional     |
| `GROQ_API_KEY`       | chave da API Groq                   | Para IA      |

---

## Como usar este arquivo

1. **Antes de começar**: leia a seção "⚡ RETOMANDO AGORA?" acima
2. **Durante o trabalho**: marque checkboxes conforme conclui cada item
3. **Ao encerrar**: atualizar a seção "⚡ RETOMANDO AGORA?" + "Log de Sessões" + checkboxes
4. **Ao retomar**: seção "⚡ RETOMANDO AGORA?" tem tudo que precisa

---

## 🔬 DIRETRIZ OBRIGATÓRIA: Pesquisa Profunda por Módulo

> **REGRA ABSOLUTA**: Antes de escrever uma linha de código de qualquer módulo, realizar pesquisa profunda nas fontes listadas abaixo.
> O objetivo é garantir ferramentas **completas e absolutas** para os usuários do módulo — sem lacunas funcionais.
> Módulo incompleto não é módulo. Módulo que não serve o usuário real não existe.

### Protocolo de pesquisa antes de cada módulo

Responder obrigatoriamente estas 7 perguntas antes de implementar:

| # | Pergunta | Fontes a consultar |
|---|----------|--------------------|
| 1 | **Quem são os usuários?** Papéis, contexto, nível técnico, frequência de uso | Entrevistas virtuais com: coordenadores, administrativo, comunicação, financeiro, gestão |
| 2 | **Quais operações COMPLETAS?** Todos os fluxos: criação, edição, aprovação, cancelamento, histórico, auditoria, exportação | `plano_reconstrucao.md` seção do módulo; legado `mod_*.gs`; análise em `docs/analise_arquivos/` |
| 3 | **Quais integrações?** Módulos que dependem deste; módulos dos quais este depende; eventos emitidos e consumidos | `integracao_orquestrador.gs`; `event_handler_registry.gs`; `events_constants.gs` |
| 4 | **Obrigações legais/regulatórias?** LGPD, Lei Rouanet, CODIP, SALIC, normas trabalhistas, prestação de contas | `plano_reconstrucao.md` seção "Obrigações"; `config_org.json` regrasEditais |
| 5 | **O que estava quebrado no legado?** Funcionalidades ausentes, inconsistências, dados corrompidos, user complaints | `docs/analise_arquivos/`; git history do legado; comentários `// TODO` e `// FIXME` no legado |
| 6 | **Qual a fonte de verdade?** JSON canônico ou Sheet? Qual a estratégia de migração? Índices necessários? | `domain_model.md` tabela "Fontes de verdade"; `i_repository.gs` |
| 7 | **Quais edge cases críticos?** Concorrência, rollback, inconsistência entre fontes, usuários sem permissão | `fsm_guardian.gs`; `data_layer.gs` modifyJSON; histórico de bugs no legado |

### Fontes obrigatórias de pesquisa

```
saas-v2/ (novo projeto)
  docs/architecture/domain_model.md      ← entidades, FSMs, fontes de verdade
  PROGRESS.md (este arquivo)             ← checklist completo do módulo
  ../Saas-ERP-cultural-main/ (legado)
    docs/analise_arquivos/               ← análise profunda de cada arquivo legacy
    docs/01_architecture/
      plano_reconstrucao.md              ← requisitos completos (293KB)
    gas/src/backend/mod_*.gs             ← implementação legada (lógica de negócio real)
    gas/src/modules/*/                   ← módulos refatorados (mais recentes)
    gas/src/html/logic/                  ← frontend legado (fluxos reais dos usuários)
```

### Critérios de completude por módulo

Um módulo está **completo** quando oferece:
- [ ] Operação CRUD básica com validação real
- [ ] FSM com todas as transições possíveis (incluindo cancelamento e erro)
- [ ] Auditoria: toda escrita tem rastro em AuditoriaService
- [ ] Permissões: toda operação tem verificação de papel/setor
- [ ] Integração de saída: emite eventos para IntegracaoOrquestrador e/ou EventHandlerRegistry
- [ ] Integração de entrada: responde a eventos relevantes de outros módulos
- [ ] Exportação: dados exportáveis para CODIP/SALIC onde aplicável
- [ ] Migração: script de migração dos dados legados documentado
- [ ] Testes manuais: roteiro de smoke-test documentado no PROGRESS.md do módulo

---

## Estado Geral do Projeto

| # | Fase | Status | Urgência | Iniciada | Concluída |
|---|------|--------|----------|----------|-----------|
| 0 | Fundação Técnica | ✅ Concluída | — | 2026-05-20 | 2026-05-21 |
| 1 | Persistência Canônica | ✅ **Concluída** | — | 2026-05-21 | 2026-05-22 |
| 2 | Espaços e Almoxarifado | ✅ **Concluída** | — | 2026-05-22 | 2026-05-22 |
| 3 | Pessoas, RH e Contratações | ✅ **Concluída** | — | 2026-05-22 | 2026-05-22 |
| 3.4 | RH Avançado e Ponto | ✅ **Concluída** (via F11.4) | — | 2026-05-24 | 2026-05-24 |
| 4 | Financeiro e Contratos | ✅ **Concluída** | — | 2026-05-22 | 2026-05-22 |
| 5 | Ação como Núcleo Real | ✅ **Concluída** | — | 2026-05-23 | 2026-05-23 |
| 6 | Integração via Eventos + RECE | ✅ **Concluída** | — | 2026-05-23 | 2026-05-23 |
| 7 | Portal Externo, Público e CODIP | ✅ **Concluída** | — | 2026-05-23 | 2026-05-23 |
| 8 | Agentes, Acervo, Voluntários, Parcerias | ✅ **Concluída** | — | 2026-05-23 | 2026-05-23 |
| 9 | Multi-Tenancy e Config Admin | ✅ **Concluída** | — | 2026-05-23 | 2026-05-23 |
| 10 | Alertas, TaskHub, Reuniões, Auditoria | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 11 | Estratégia e Produto Pronto | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 11.1 | Estratégia Institucional + TRAMAR | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 11.2 | Escuta Institucional (8 dimensões, fairness, LGPD) | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 11.3 | Dashboard Executivo + IA Analítica | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 11.4 | Ponto Eletrônico + Custo CLT + Colabore AFD/CSV | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 11.5 | Hardcodes CCBJ removidos (auditoria multi-org) | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 12 | Plano de Trabalho — backend | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 12.1 | Plano de Trabalho — UI 4 níveis + Pessoal + Indicadores + Plano de Contas | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 13 | Produto Pronto — Exportações Institucionais | ✅ **Concluída** | — | 2026-05-24 | 2026-05-26 |
| 13.1 | SALIC (XML completo) + PNAB (4 CSVs) + campo PRONAC + tab Exportações | ✅ **Concluída** | — | 2026-05-24 | 2026-05-24 |
| 13.2 | SNIIC (6 seções + CSV MinC) — Financeiro + Público | ✅ **Concluída** | — | 2026-05-26 | 2026-05-26 |
| 16.3 | Dashboard RH/Folha: custo total, heatmap banco horas, calendário ponto, turnover 12m | ✅ **Concluída** | — | 2026-05-26 | 2026-05-26 |
| 17 | Holerite e Processamento de Folha | ✅ **Concluída** | — | 2026-05-26 | 2026-05-26 |
| 18 | Reservas Modo Lote + Buffer + Habilitado + Cancelamento urgente | ✅ **Concluída** | — | 2026-05-26 | 2026-05-26 |

### Por que esta ordem de urgência?
- **F1 antes de tudo**: dual-systems (dados em dois lugares sem sync) causam perda silenciosa de dados em produção.
- **F2 logo após**: conflitos de reserva não verificados consistentemente = sobreposição de eventos real.
- **F3 antes de F4**: financeiro depende de colaboradores com vínculo canônico para calcular folha corretamente.
- **F4 antes de F5**: Ação só pode ser núcleo real quando orçamento existe como entidade vinculada.
- **F5 antes de F6**: eventos só fazem sentido quando Ação está conectada (os 7 eventos críticos dependem de acaoId).

---

## Fase 0 — Fundação Técnica

**Objetivo**: infraestrutura invisível que todas as fases dependem. Zero breaking changes para o usuário.

**Última sessão**: 2026-05-21 — Deploy realizado e UI principal reconstruída.

**Critério de saída**:
- [x] **[DEPLOY REALIZADO]** Código publicado no deployment CCBJ (`@10`, `@11`, `@12`)
- [x] `SistemaConfigService.getSetores()` retorna setores configurados (não hardcoded)
- [x] Zero constantes de organização hardcoded no código (exceto defaults documentados em config.gs)
- [x] Controle de acesso por domínio + aprovação manual implementado (AcessoService)
- [x] Nenhuma mudança de comportamento em produção

### 0.1 — Schema Canônico e Estrutura

- [x] Criar estrutura de diretórios `saas-v2/`
- [x] Criar `appsscript.json` e `.clasp.json`
- [x] Criar `gas/src/core/config.gs` — orgId + getOrgConfig() + `nomeAssistente`
- [x] Criar `gas/src/core/logger.gs`
- [x] Criar `gas/src/core/utils.gs` — utilitários e ABA_PARA_MODULO atualizado
- [x] Criar `gas/src/core/auth_session.gs` — com comentário arquitetural USER_DEPLOYING
- [x] Criar `gas/src/core/setup.gs` — schema de abas + verificarTodasAbas() + registrarSuperAdmin
- [x] Deploy concluído; inicialização/health ficam como smoke-test operacional no editor GAS quando necessário

### 0.2 — Camada de Persistência

- [x] Criar `gas/src/core/data_layer.gs` — lerJSON/salvarJSON/modifyJSON com lock
- [x] Criar `gas/src/core/services/data_gateway.gs` — abstração Google Sheets
- [x] Criar `gas/src/shared/response.gs` — GasResponse.wrap()
- [x] Criar `gas/src/repositories/i_repository.gs` — interface IRepository

### 0.3 — Sistema de Eventos e FSM

- [x] Criar `gas/src/core/event_bus_backend.gs` — SystemEvents
- [x] Criar `gas/src/core/events_constants.gs` — SystemEventTypes (70+ tipos)
- [x] Criar `gas/src/core/services/fsm_guardian.gs` — árbitro de FSMs
- [x] Criar `gas/src/core/services/auditoria_service.gs`
- [x] Criar `gas/src/core/services/auditoria_store.gs`
- [x] Criar `gas/src/core/services/cache_service.gs`

### 0.4 — ConfigService e config_org.json

- [x] Criar `gas/src/core/config_service.gs` — SistemaConfigService (facade unificado)
- [x] Criar `gas/src/core/data/config_org.json` — defaults CCBJ (setores, turnos, labels, rubricas)
- [x] Migrar todos os hardcodes identificados para `SistemaConfigService`
  - [x] Setores: v2 já usa `SistemaConfigService.getSetores()` — `SETORES_SISTEMA` não existe no v2
  - [x] Turnos: v2 usa `SistemaConfigService.getTurnos()` lendo de `config_org.json`
  - [x] Tabela INSS: em `config_org.json.parametrosRH.tabela_inss` + fallback em `_defaultParametrosRH()`
- [x] `config_org.json` atualizado: campo `contextoIA` para prompts de IA sem hardcode

### 0.5 — Serviços de Notificação e Permissões

- [x] Criar `gas/src/core/notification_engine.gs`
- [x] Criar `gas/src/core/services/permissoes_service.gs`
- [x] Criar `gas/src/core/services/usuarios_service.gs`
- [x] Criar `gas/src/core/services/ia_service.gs`
- [x] Criar `gas/src/core/services/metrics_engine.gs`

### 0.6 — Esqueleto de Integração (stubs)

- [x] Criar `gas/src/engines/integracao_orquestrador.gs` — stubs dos 7 eventos críticos
- [x] Criar `gas/src/engines/event_handler_registry.gs` — handlers vazios
- [x] Criar `gas/src/engines/alertas_engine.gs` — 25 tipos, catálogo completo, stubs Fase 10

### 0.7 — Router e Frontend Shell

- [x] Criar `gas/src/controllers/router.gs` — doGet() com roteamento interno/portal + `include()`
- [x] Criar `gas/src/frontend/index.html` — SPA com App/Router/Toast/BtnGuard v2 (roxo)
- [x] Criar `gas/src/portal/portal_cessao_pauta.html` — formulário com consentimento LGPD + BtnGuard
- [x] Criar `gas/src/portal/portal_pauta_status.html` — consulta por protocolo + BtnGuard
- [x] Criar `gas/src/portal/portal_inscricao.html` — inscrição com LGPD + foto + BtnGuard
- [x] Criar `gas/src/portal/portal_aprovacao.html` — aprovação via token de email + BtnGuard
- [x] Criar `gas/src/portal/portal_agenda.html` — agenda pública com filtros (links de navegação, sem async)
- [x] Criar `gas/src/shared/btnguard.html` — BtnGuard v2: `wrap`, `travar`, `liberar`, `auditar`

### 0.8 — Módulo Admin (ConfigAdmin)

- [x] Criar `gas/src/modules/admin/config_admin_service.gs` — CRUD espaços, setores, turnos, módulos
- [x] Criar `gas/src/modules/admin/boot_service.gs` — boot multi-tenant com orgId + cache
- [x] Criar `gas/src/modules/admin/user_profile_service.gs` — setor, preferências, perfil

### 0.9 — Saneamentos Urgentes

- [x] Confirmar zero emails hardcoded no código
- [x] Confirmar zero URLs org-específicas hardcoded
- [x] Zero nomes de organização em `.gs` — `notification_engine.gs` usa `{org}` dinâmico; `ia_service.gs` usa `_getSystemMsg()` + `getOrgConfig()`
- [x] `config.gs`: defaults `|| 'CCBJ'` aceitos (PropertiesService lido primeiro; fallback apenas para estado não-inicializado; Fase 11.4 eliminará)
- [x] Controle de acesso para domínios compartilhados: `AcessoService` + `primeiro_acesso.html` + router atualizado
- [x] **Logomarca**: `LogoPaletaService`, `SistemaConfigService.getLogoUrl/getPaleta`, `Identidade` JS, extração de cor via canvas, admin UI
- [x] **Paleta padrão → ROXO CCBJ**: `config_org.json`, `config_service.gs._defaultPaleta()`, `index.html :root` atualizados para `#7c3aed`
- [x] **BtnGuard v2**: criado `shared/btnguard.html`; `include()` em `router.gs`; todos os botões async protegidos em todos os templates

---

### 📋 Checklist BtnGuard — OBRIGATÓRIO a cada nova fase

> **Regra**: todo template HTML criado em qualquer fase DEVE:
> 1. Incluir `<?!= include('shared/btnguard'); ?>` no `<head>`
> 2. Usar `BtnGuard.wrap()` em todo botão que dispara async (google.script.run, fetch, setTimeout)
> 3. Marcar botões de navegação pura com `data-bg-skip="1"`
> 4. Ao final da fase: rodar `BtnGuard.auditar()` no console e confirmar "✅ todos protegidos"

| Fase | Auditoria BtnGuard | Status |
|------|-------------------|--------|
| 0 — Frontend shell + portais | `BtnGuard.auditar()` pós-deploy | ✅ Deploy realizado; auditoria visual pendente no browser |
| 1 — Persistência Canônica | Após criar views de tarefas/colaboradores | ✅ Tarefas + Colaboradores + Contratos criadas |
| 1.4 — Ativos (view-espacos) | `BtnGuard.auditar()` no console após abrir Módulo Espaços | ✅ Integrado na view tabbed de Espaços |
| 2 — Espaços e Almoxarifado | Após criar views de reservas/chaves | ✅ Todos os botões async protegidos (ReservasUI + ChavesUI + AlmoxUI) |
| 3 — Pessoas e RH | BtnGuard.auditar() pós-deploy @28 | ✅ Afastamentos + Ocorrências + Contratações + Habilitações |
| 4 — Financeiro | Após criar views financeiras | ✅ FontesUI + RemanejamentosUI + AditivosUI + FinanceiroTabs; Deploy @30 |
| 5 — Ações | BtnGuard.auditar() pós-deploy @61 | ✅ wrap em nova/salvar/editar; data-bg-skip em kanban/FSM |
| 6 — RECE + EventBus | Após views RECE | ✅ ReceUI + BtnGuard em FSM RECE |
| 7 — Portal + Público | Após views portal | ✅ PublicoUI + portais + BtnGuard |
| 8 — Agentes/Acervo/Voluntários/Parcerias | Após views | ✅ 4 modules + BtnGuard completo |
| 9 — Multi-Tenancy + Wizard | Após wizard + painel orgs | ✅ FeatureFlagsUI + PainelOrgsUI + WizardUI |
| 10 — Alertas/TaskHub/Reuniões/Balcão/Auditoria | BtnGuard.auditar() pós-deploy @151 | ✅ AlertasUI + ReunioesUI + TaskHubUI + BalcaoUI + AuditoriaVisualUI; BtnGuard.wrap em todos os botões async |
| 11.1 — Estratégia + TRAMAR | BtnGuard.auditar() pós-deploy @167 | ✅ EstrategiaUI (4 tabs, modais opacos, BtnGuard em novo/salvar/vincular/mudarStatus); data-bg-skip em tabs e nav |

---

## Fase 1 — Persistência Canônica

**Objetivo**: cada domínio com UMA fonte de verdade. Zero dual-systems.

**Status**: 🟡 Em andamento — 1.1, 1.2, 1.3 e 1.4 entregues; Fase 1 concluída

**Próximo passo quando iniciar**:
> Próximo: `1.2 — Colaboradores`: criar repositório canônico e engine de pessoas.

### 1.1 — Tarefas (canônico: tarefas.json)

- [x] Criar `gas/src/modules/tarefas/tarefa_repository.gs`
- [x] Criar `gas/src/modules/tarefas/tarefa_engine.gs` — refatorado com orgId
- [x] Criar `gas/src/modules/tarefas/tarefas_controller.gs` — bridge `ctrl_tarefas_*`
- [x] Criar view mínima de Tarefas no SPA para listar/criar/concluir
- [x] Script de migração: Sheet → JSON (`fase1_tarefas_migrarSheetParaJson`)
- [x] Marcar Sheet como read-only operacional (`fase1_tarefas_prepararIndice`)

### 1.2 — Colaboradores (fusão Equipes + RH)

- [x] Criar `gas/src/modules/pessoas/colaborador_repository.gs` — fonte de verdade: colaboradores.json; índice: EQUIPES.Funcionarios; sub-coleções: ferias.json, escalas.json, avaliacoes.json, historico_rh.json
- [x] Criar `gas/src/modules/pessoas/pessoas_engine.gs` — FSM status colaborador + FSM férias; listar, salvar, mudarStatus, escalas, avaliações, histórico, desligamento oficial, migração
- [x] Criar `gas/src/modules/pessoas/pessoas_controller.gs` — ctrl_pessoas_* + ctrl_rh_*; RBAC por papel; filtro histórico por nível; férias com FSM completa
- [x] View mínima de Colaboradores no SPA — métricas, formulário CRUD, lista com filtro de status, badge de vínculo
- [x] Script de migração: `fase1_colaboradores_migrarFuncionarios()` — idempotente, funde funcionarios.json → colaboradores.json
- [x] Índice: `fase1_colaboradores_prepararIndice()` — garante cabeçalho + proteção read-only em EQUIPES.Funcionarios

**Smoke-test 1.2:**
1. GAS Editor: executar `fase1_colaboradores_prepararIndice()` → deve retornar `{ok:true}`
2. GAS Editor: executar `fase1_colaboradores_migrarFuncionarios()` → deve retornar `{importados:N, ignorados:0}`
3. Browser: Módulo Pessoas → clicar "Novo" → preencher nome + setor + vínculo → Salvar → confirmar aparece na lista
4. Drive: abrir `colaboradores.json` → confirmar que o registro existe com `orgId` correto

### 1.3 — Contratações (Contratos)

- [x] Criar `gas/src/modules/financeiro/contrato_repository.gs` — fonte: contratos.json (nested: metas→rubricas→indicadores); índice: FINANCEIRO.Contratos; migração idempotente
- [x] Criar `gas/src/modules/financeiro/contratos_engine.gs` — FSM Ativo↔Suspenso→Encerrado; salvar/excluir/analisar/métricas; orquestração metas/rubricas/indicadores
- [x] Criar `gas/src/modules/financeiro/contratos_controller.gs` — ctrl_contratos_* com RBAC (leitura: financeiro+gestor+admin; escrita: financeiro+admin; exclusão: admin)
- [x] View SPA Financeiro — métricas, formulário CRUD, lista com filtro de status, badges de status, ContratosUI, GAS.contratos namespace, rota registrada no Router
- [x] Script de migração: `fase1_contratos_migrarSheetParaJson()` — idempotente, Sheet → contratos.json
- [x] Índice: `fase1_contratos_prepararIndice()` — garante cabeçalho + proteção read-only em FINANCEIRO.Contratos

**Smoke-test 1.3:**
1. GAS Editor: executar `fase1_contratos_prepararIndice()` → deve retornar `{ok:true}`
2. GAS Editor: executar `fase1_contratos_migrarSheetParaJson()` → deve retornar `{importados:N}`
3. Browser: Módulo Financeiro → verificar métricas (total/ativos/suspensos/valorAtivos)
4. Browser: clicar "Novo" → preencher nome + fonte de recurso + valor → Salvar → confirmar na lista
5. Drive: abrir `contratos.json` → confirmar que o registro existe com `orgId` correto

### 1.4 — Ativos e Almoxarifado

- [x] Criar `gas/src/modules/espacos/ativos_repository.gs` — fonte canônica ESPACOS.Ativos; índices MovimentacoesAtivos, BaixasAtivos, Manutencoes
- [x] Criar `gas/src/modules/espacos/ativos_engine.gs` — FSM: disponivel↔reservado↔em_uso↔manutencao→baixado; métricas; auditoria; eventos
- [x] Criar `gas/src/modules/espacos/ativos_controller.gs` — ctrl_ativos_* com RBAC (leitura: todos; escrita: infraestrutura+gestor+admin; baixa: admin)
- [x] Criar `gas/src/modules/espacos/almoxarifado_engine.gs` — FSM stub: solicitado→aprovado→retirado→devolvido; interfaces definidas para Fase 2.2
- [x] View SPA Espaços — AtivosUI (métricas, CRUD, filtro status, badges, ações de manutenção), GAS.ativos namespace, rota `espacos` registrada no Router
- [x] `fase1_ativos_prepararIndice()` — garante cabeçalhos nas 4 abas ESPACOS de ativos
- [x] Nota: `almoxarifado.json` legado marcado como read-only no código — migração formal na Fase 2.2

**Smoke-test 1.4:**
1. GAS Editor: executar `fase1_ativos_prepararIndice()` → deve retornar `{ok:true}`
2. Browser: Módulo Espaços → verificar métricas (total/disponíveis/em uso/manutenção)
3. Browser: clicar "Novo Ativo" → preencher nome + categoria → Salvar → confirmar na lista
4. Browser: clicar botão Manutenção → confirmar status muda para "Manutenção"
5. Browser: clicar "Concluir Manutenção" → confirmar retorno para "Disponível"
6. Sheet ESPACOS.Ativos: confirmar que o registro aparece com todos os campos

---

## Fase 2 — Espaços e Almoxarifado com Bloqueio Real

**Objetivo**: reservas sem sobreposição possível. Conflito é impossível por design.

**Status**: ✅ Concluída (2026-05-22)

### 2.1 — Reservas de Espaço com conflito garantido

- [x] Criar `gas/src/modules/espacos/reserva_repository.gs` — ESPACOS.Reservas Sheet canônica; headers; listarAtivosParaConflito()
- [x] Criar `gas/src/modules/espacos/reserva_engine.gs` — `assertSemConflito()` + `assertHorarioFuncionamento()` dentro de LockService; FSM pendente→confirmado→em_uso→concluido; criar/criarLote/atualizar/mudarStatus/verificarDisponibilidade
- [x] Criar `gas/src/modules/espacos/reservas_controller.gs` — ctrl_reservas_* com RBAC (colaborador: próprias; gestão: todas)
- [x] `fase2_reservas_prepararIndice()` — wrapper global para GAS Editor

### 2.2 — Sistema de Empréstimo de Itens

- [x] Criar `gas/src/modules/espacos/reservas_itens_repository.gs` — MASTER.Itens + ESPACOS.EmprestimosItens; `quantidadeEmUsoPeriodo()`
- [x] Atualizar `gas/src/modules/espacos/almoxarifado_engine.gs` — implementação completa da FSM; `assertItemDisponivel()` com LockService; `verificarAtrasos()` + eventos KEY_PROTOCOL_DELAYED
- [x] `fase2_emprestimos_prepararIndice()` — wrapper global

### 2.3 — Protocolo de Chaves

- [x] Criar `gas/src/modules/espacos/chave_repository.gs` — ESPACOS.Chaves Sheet canônica
- [x] Criar `gas/src/modules/espacos/chave_engine.gs` — FSM aberto→atrasado→devolvido; `verificarAtrasos()` com eventos
- [x] Criar `gas/src/modules/espacos/chaves_controller.gs` — ctrl_chaves_* + ctrl_almox_*
- [x] `fase2_chaves_prepararIndice()` — wrapper global

### 2.4 — View Espaços com Tabs

- [x] View `view-espacos` expandida com 4 tabs: Reservas | Chaves | Empréstimos | Patrimônio
- [x] `EspacosUI` — controlador de tabs + métricas consolidadas no topo
- [x] `ReservasUI` — CRUD completo + verificar disponibilidade + BtnGuard
- [x] `ChavesUI` — CRUD + devolução + BtnGuard
- [x] `AlmoxUI` — CRUD + aprovação/retirada/devolução + BtnGuard
- [x] GAS namespaces: `GAS.reservas`, `GAS.chaves`, `GAS.almox`
- [x] Deploy @24 realizado

**Smoke-test 2.x:**
1. GAS Editor: executar `fase2_reservas_prepararIndice()` → `{ok:true}`
2. GAS Editor: executar `fase2_chaves_prepararIndice()` → `{ok:true}`
3. GAS Editor: executar `fase2_emprestimos_prepararIndice()` → `{ok:true}`
4. Browser: Módulo Espaços → tab Reservas → criar reserva "Teste A" (Auditório, 14:00-16:00)
5. Browser: criar segunda reserva no mesmo espaço/horário → **deve retornar erro de conflito**
6. Browser: tab Chaves → Nova Retirada → preencher sala → Registrar → Devolver
7. Console F12: `BtnGuard.auditar()` → "✅ todos protegidos"

**Gaps e modos de visualização — Fase 2 (implementar na Fase 5 ao revisar UI de reservas):**
- [ ] **Calendário de ocupação por sala**: visão semana/mês mostrando quais horários estão ocupados em cada sala
- [ ] **Heatmap de demanda**: sala × hora × dia da semana — cores por intensidade de uso
- [ ] **Calendário de disponibilidade por item**: "projetor disponível dias X, Y, Z desta semana" — gap crítico para almoxarife
- [ ] **Kanban de empréstimos**: colunas por FSM (Solicitado | Aprovado | Retirado | Devolvido | Atrasado)
- [ ] **Diagrama de ocupação em tempo real**: mapa visual das salas agora — livre/ocupada/em_manutenção
- [ ] **Lista de reservas**: tabela com filtros por sala, setor, período, status — com exportação
- [ ] **Modo lote (criação)**: UI para criar reservas recorrentes (semanal, mensal, intervalo)

---

## Fase 3 — Pessoas, RH e Contratações

**Objetivo**: domínio de pessoas robusto; contratações com aprovação real e bloqueio orçamentário.

**Status**: ✅ Concluída (2026-05-22)

### 3.1 — PessoasEngine consolidado

- [x] Perfil completo: dados pessoais, vínculos históricos, funções, competências (já estava na Fase 1.2)
- [x] Escalas: por turno, semana, mês — por setor (já estava na Fase 1.2)
- [x] FSM de férias: solicitação → aprovação → registro → substituição na escala (já estava na Fase 1.2)
- [x] Afastamentos com FSM (rascunho→ativo→encerrado) e impacto automático no status do colaborador
- [x] Ocorrências (advertência, suspensão, elogio, observação) com rastro em histórico RH

### 3.2 — EntidadeContratavel (PF + PJ unificado)

- [x] `ContratadoRepository`: `contratados_registry.json` + `habilitacoes.json`; índice `MASTER.Contratados`; busca por CPF/CNPJ
- [x] `ContratadoEngine`: FSM contratado (cadastrado→habilitado↔suspenso→descredenciado) + FSM habilitação (6 estados)
- [x] Habilitação integrada: aprovar habilitação promove contratado para "habilitado"; suspender habilitação suspende contratado

### 3.3 — Fluxo de Aprovação Multinível de Contratações

- [x] `SolicitacaoEngine`: FSM 9 estados (rascunho→submetida→aprovada_gestor→aprovada_financeiro→em_execucao→concluida)
- [x] OrcamentoGuard.assertDisponivel() stub — loga e audita, não bloqueia (Fase 4 implementará check real)
- [x] Notificação ao próximo aprovador a cada transição (via SystemEvents)
- [x] CQRS explícito: leitura com cache, escrita invalida cache (contratacoes_controller.gs)
- [x] Snapshot antes de rejeição/cancelamento (padrão Skill.md)

### Gaps identificados na Fase 3 (análise V1→V2) — corrigir na Fase 5 ou 11.4

- [ ] **Aprovação de férias por link de email**: FSM existe mas gestor precisa estar logado para aprovar — implementar tokens (Fase 6)
- [ ] **Notificação de férias com link de aprovação**: `NotificationEngine` deve gerar token + link direto no email
- [ ] **Ponto eletrônico / banco de horas**: totalmente ausente; necessário para CLT (ver Fase 11.4)
- [ ] **Custo CLT**: não calculado; impede planejamento de folha (ver Fase 11.4)
- [ ] **Cálculo de rescisão**: não existe (ver Fase 11.4)

**Modos de visualização — Fase 3 (implementar ao expandir):**
- [ ] **Lista de colaboradores**: tabela com filtros (setor, vínculo, status) + busca por nome
- [ ] **Card de perfil**: foto/avatar, cargo, setor, vínculos históricos, indicadores (faltas, escalas)
- [ ] **Agenda de escalas**: calendário semana/mês — quem trabalha em qual turno (por setor)
- [ ] **Calendário de férias**: linha do tempo de férias aprovadas + alertas de vencimento
- [ ] **Kanban de contratações**: colunas por estágio da FSM (Rascunho | Submetida | Aprovada Gestor | Aprovada Financeiro | Em Execução | Concluída)
- [ ] **Lista de habilitações**: agentes por status de habilitação com filtros e ações em lote
- [ ] **Fluxograma de aprovação**: visualização da FSM de contratação para uma solicitação específica

---

## Fase 3.4 — RH Avançado e Ponto Eletrônico

**Objetivo**: completar o módulo de Pessoas com funcionalidades RH essenciais para CLT e planejamento de folha.

**Status**: ⬜ Não iniciada (pode ser executada em paralelo com Fase 6)

**Próximo passo quando iniciar**:
> Criar `PontoRepository` + `PontoEngine`; integrar com escalas de `PessoasEngine`.

### 3.4.1 — Ponto Eletrônico e Banco de Horas

- [ ] Criar `gas/src/modules/pessoas/ponto_repository.gs` — fonte: `ponto.json`; índice: `EQUIPES.Ponto`
- [ ] Criar `gas/src/modules/pessoas/ponto_engine.gs` — registro entrada/saída; cálculo de horas regulares, extras e banco de horas
- [ ] **Registro via link**: colaborador clica em link no email → registra entrada/saída sem login
- [ ] Integração com escalas: horas trabalhadas vs horas previstas na escala
- [ ] **Relatório mensal de ponto** por colaborador (exportável)
- [ ] **Alertas de irregularidades**: falta não justificada, banco de horas acumulado acima do limite

### 3.4.2 — Custo CLT e Folha de Pagamento

- [ ] **Custo CLT completo**: INSS + Sistema S + FGTS + PIS + benefícios (VT, VA, plano) + provisões (13º, férias+1/3, FGTS rescisório)
- [ ] **Fluxo de caixa RH**: linha mensal de custo previsto por vínculo para todo o período do contrato
- [ ] **Simulação de cenário**: reajuste % aplicado em toda a folha + impacto financeiro imediato
- [ ] Parâmetros via `config_org.json`: tabela INSS, alíquotas encargos, teto benefícios (não hardcoded)

### 3.4.3 — Rescisão e Turnover

- [ ] **Calculadora de rescisão**: estimativa de custo por modalidade (pedido de demissão, demissão sem justa causa, etc.)
- [ ] **Break-even de demissão**: economia mensal esperada vs custo rescisório total
- [ ] **Indicadores de turnover**: taxa voluntário/involuntário; custo de rotatividade; comparativo períodos
- [ ] Geração de PDF de rescisão via `RelatoriosPDFService` (Fase 10)

**Modos de visualização — Fase 3.4:**
- [ ] **Calendário de ponto**: presença × ausência por colaborador no mês (grid dia × status)
- [ ] **Heatmap de banco de horas**: por pessoa × mês — excesso acumulado visível
- [ ] **Dashboard de folha**: custo total por vínculo; comparativo mês a mês; projeção anual
- [ ] **Gráfico de turnover**: entradas × saídas no período; linha de tendência

---

## Fase 4 — Financeiro e Gestão de Contratos

**Objetivo**: módulo financeiro completo, da proposta à prestação de contas.

**Status**: ✅ Concluída (2026-05-22) — gaps identificados em análise comparativa V1→V2 (ver 4.5)

### 4.1 — FonteRecurso como entidade

- [x] Criar `gas/src/modules/financeiro/fonte_recurso_engine.gs`
- [x] FSM: ativo → suspenso → encerrado

### 4.2 — Ferramenta de Proposta Orçamentária

- [ ] OrcamentoPropostaEngine com FSM: rascunho → revisao → submetida → aprovada
- [ ] Validação automática de tetos por edital (Lei Rouanet, divulgação ≤ 20%)
- [ ] Exportação para Sheets + PDF via RelatoriosPDFService (Fase 10)

### 4.3 — Remanejamentos com aprovação intersetores

- [x] RemanejamentoEngine com FSM de 6 estados
- [x] Snapshot imutável de saldos por aprovação
- [x] Thresholds configuráveis por valor

### 4.4 — Aditivos Contratuais

- [x] AditivoContratoEngine com FSM (7 estados, aprovação 2 etapas)
- [x] Efetivação automática nas rubricas/metas após aprovação

### 4.5 — Gaps identificados (análise V1→V2) — corrigir retroativamente

- [ ] **Cronograma de desembolso** em FonteRecurso: campo de previsão mensal de recebimento (editais têm cronograma definido)
- [ ] **Contrapartida obrigatória**: campo em FonteRecurso exigido pela Lei Rouanet
- [ ] **OrcamentoPropostaEngine** (Fase 4.2 não entregue): formulário de proposta com validação de tetos por rubrica
- [ ] **Exportação SALIC**: formato XML para prestação de contas Lei Rouanet (entregar na Fase 11)
- [ ] **Fluxo de caixa por contrato**: linha mensal de recebimentos e pagamentos previstos vs realizados

**Modos de visualização — Fase 4:**
- [ ] **Lista/tabela**: contratos, fontes de recurso, remanejamentos, aditivos (padrão atual)
- [ ] **Dashboard financeiro**: execução por contrato/meta/rubrica/setor (barras empilhadas, % executado)
- [ ] **Fluxo de caixa**: timeline mensal — recebimentos previstos vs realizados por fonte
- [ ] **Kanban de aprovação**: remanejamentos e aditivos por estágio da FSM (rascunho → aguardando → aprovado → efetivado)
- [ ] **Comparativo previsto/realizado**: por rubrica, com semáforo de risco (verde/amarelo/vermelho)

---

## Backlog V1→V2 — Funcionalidades Identificadas mas Não Migradas (Fases Futuras)

> Análise linha-a-linha do v1 (mod_comunicacao.gs, mod_relatorios.gs, mod_admin.gs, mod_metrics.gs)
> revelou funcionalidades implementadas no legado que ainda não existem no v2.

| Funcionalidade | Origem v1 | Status v2 | Fase planejada |
|---|---|---|---|
| Agenda RECE (25 campos, CRUD completo) | mod_comunicacao.gs | ❌ ausente | Fase 6 |
| Sync bidirecional Reservas ↔ RECE | mod_comunicacao.gs | ❌ ausente | Fase 6 |
| Convites Google Calendar (multi-guest) | mod_comunicacao.gs | ❌ ausente | Fase 6 |
| Email institucional HTML (branding CCBJ) | mod_comunicacao.gs | ❌ ausente | Fase 6 |
| Upload de imagem Drive ("CCBJ_RECE_Imagens") | mod_comunicacao.gs | ❌ ausente | Fase 6 |
| Preferências por usuário (salvarPreferencia/carregarPreferencias) | mod_preferencias.gs | ❌ ausente | Fase 6 |
| IA conversacional sobre reservas (perguntarIA/sugerirReservaIA) | mod_metrics.gs | ⚠️ parcial em ia_service | Fase 6 |
| Sugestões de horário livre ao conflito de reserva | mod_reservas.gs | ❌ ausente | Fase 6 |
| CODIP (34 campos por reserva, relatórios e dashboard) | mod_relatorios.gs | ❌ ausente | Fase 7 |
| Comparação de versões de contrato (diff+heatmap+ranking) | mod_relatorios.gs | ❌ ausente | Fase 7 |
| Geração de documentos PPT/DOC/PDF via Drive | mod_relatorios.gs | ❌ ausente | Fase 8 |
| IA para reescrever descrição de ação (Groq) | mod_relatorios.gs | ❌ ausente | Fase 8 |
| Dashboard unificado cross-módulo (Reservas+Itens+CODIP+Solicitações) | mod_metrics.gs | ⚠️ existe por módulo, sem unificado | Fase 5/6 |
| Analisar dashboard por IA (analisarDashboardIA) | mod_metrics.gs | ⚠️ parcial em ia_service | Fase 6 |
| Rate limiting backend (limitarRequisicoes+detectarComportamentoSuspeito) | mod_admin.gs | ❌ ausente | Fase 9 |
| Rollback de ações por superadmin | auditoria_controller.gs | ✅ entregue | Fase 10 |
| Status HABILITADO nas reservas (FSM + habilitarReservaStatus) | mod_reservas.gs | ❌ ausente | Fase 5 |
| Export CSV da agenda com BOM UTF-8 | mod_relatorios.gs | ❌ ausente | Fase 7 |

---

## Fase 5 — Ação como Núcleo Real

**Objetivo**: Ação conectada de fato com todos os domínios. Entidade central com módulo próprio.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> 1. Criar `AcaoRepository` + `AcaoEngine` (ENTIDADE CENTRAL — ainda não existe como módulo)
> 2. Adicionar `acaoId` a Reservas, Tarefas, Contratos (campos opcionais, migração idempotente)
> 3. Criar `fase5_acoes_prepararIndice()` global

### 5.1 — AcaoRepository + AcaoEngine (NOVO — não existe no V2)

- [x] Criar `gas/src/modules/acoes/acao_repository.gs` — fonte canônica: `acoes.json`; índice: `ACOES.Acoes`
- [x] Criar `gas/src/modules/acoes/acao_engine.gs` — FSM + cálculos de execução + métricas
- [x] Criar `gas/src/modules/acoes/acoes_controller.gs` — `ctrl_acoes_*` com RBAC
- [x] `fase5_acoes_prepararIndice()` — garante aba `ACOES.Acoes` com headers
- [x] `inicializarSistema()` → inclui chamada ao `prepararIndice()` de Ações

### 5.2 — Campos da Ação

- [x] **Campos públicos vs internos**: `visibilidadePublica` + `descricaoPublica` vs `descricao`
- [x] `acaoId` referenciado em: Reservas, Tarefas, Contratos (já existia nos repos desde F1-F2)
- [ ] `AcoesRecursos` populado automaticamente em todos os flows de vínculo (Fase 6)
- [x] Campo `riderTecnico`: lista de necessidades técnicas no schema

### 5.3 — FSM de Ação revisada

- [x] `planejada → em_producao → em_execucao → concluida → arquivada` + `cancelada`
- [ ] Transição automática: 1ª reserva confirmada → `em_producao` (Fase 6 — EventHandlerRegistry)
- [x] Transição automática: Ação concluída → dispara evento `ACTION_COMPLETED` via IntegracaoOrquestrador
- [x] Snapshot de estado antes de transições críticas (padrão Skill.md)

### 5.4 — Painel Integrado da Ação (6 tabs entregues, 3 futuras)

- [x] **[Visão Geral]** — status/responsável/setor/período/público/visibilidade + botões FSM
- [x] **[Tarefas]** — lista tarefas vinculadas por acaoId (backend ctrl_acoes_painel)
- [x] **[Reservas]** — espaços reservados com sala/data/horário/status
- [x] **[Contratos]** — contratos vinculados com valor total
- [x] **[Equipe]** — membros da equipe da ação
- [x] **[Financeiro]** — previsto/executado/saldo por contratos vinculados
- [x] **[Reuniões]** — Fase 10 entregue: ReuniaoEngine + ReuniaoRepository + FSM ata
- [ ] **[Itens/Almox]** — Fase 5.5 (vincular almoxarifado a acaoId)
- [ ] **[Entregas/Evidências]** — Fase 8 (AcervoEngine)

### 5.5 — Reservas com modo lote (gap V1→V2)

- [ ] **Modo lote**: seleção de múltiplas datas (manual, semanal por dia, intervalo, mensal por data) — recuperar de `mod_reservas.gs: processarAgendamentoLote()`
- [ ] **Buffer de 5 minutos** entre reservas: margem configurável de limpeza/preparação (1 linha em `reserva_engine.gs: assertSemConflito`)
- [ ] **Status "Habilitado"**: adicionar à FSM de reservas como estado entre Confirmada e Em Uso
- [ ] **Cancelamento com justificativa**: distinção UI entre cancelamento simples e com motivo obrigatório
- [ ] **Notificação urgente** de cancelamento no mesmo dia: `_notificarCancelamentoMesmoDia()` — email para admins

### 5.6 — IA Assistente — integração inicial (gap V1→V2)

- [ ] **Sugestão de horário**: campo "descreva o que precisa" → `ia_service.gs` retorna slots disponíveis com score
- [ ] **Redação de descrição**: botão "Redigir com IA" no formulário de criação de Ação
- [ ] **Parser seguro**: `parsearJsonIA()` — fallback para respostas mal formadas da API Groq

**Modos de visualização — Fase 5:**
- [ ] **Kanban de Ações**: colunas por FSM (Planejada | Em Produção | Em Execução | Concluída | Arquivada) — estilo Linear
- [ ] **Lista/tabela**: todas as ações com filtros (setor, período, status, responsável) + busca
- [ ] **Card/Grid**: visão compacta com progresso visual — barra de execução financeira + física
- [ ] **Calendário/Agenda**: ações ao longo do tempo (início → fim), sobreposição visual de períodos
- [ ] **Timeline/Gantt**: ações com duração, marco de datas críticas, sobreposição de recursos
- [ ] **Painel de 9 tabs**: visão detalhada de uma ação específica (detalhe do card)
- [ ] **Diagrama de ocupação de espaços**: heatmap sala × hora × dia (calendário de calor visual)

---

## Fase 6 — Integração via Eventos + Módulo RECE

**Objetivo**: EventBus reativo funcional; Módulo RECE (Rede de Equipamentos Culturais) implementado.

**Status**: ✅ Entregue (2026-05-23) — Deploy @132

### 6.1 — EventHandlerRegistry funcional (7 handlers críticos)

- [x] `RESERVATION_CREATED` → TarefaEngine (cria tarefa prep espaço) + notifica RECE se Ação pública
- [x] `ACTION_STARTED` → log rastreável (FinanceiroEngine: Fase 4+ quando contratos tiverem acaoId)
- [x] `ACTION_COMPLETED` → email CODIP aos admins (PublicoEngine: Fase 7)
- [x] `CONTRACT_EXPIRED` → TarefaEngine (cria tarefa de renovação com prazo 30d)
- [x] `TASK_COMPLETED` → log rastreável (DemandaEngine: Fase 6.4)
- [x] `KEY_PROTOCOL_DELAYED` → TarefaEngine (cria tarefa de cobrança prazo 2d)
- [x] `ITEM_NOT_RETURNED` → TarefaEngine (cria tarefa de cobrança prazo 3d)

### 6.2 — Trigger assíncrono e observabilidade da fila

- [x] `MASTER.EventLog` — colunas 9-11 adicionadas: `status`, `tentativas`, `ts_processado`; migração segura de schema antigo
- [x] `processarEventosPendentes()` — time-trigger a cada 30 min; `criarTriggerEventosPendentes()` pronto para executar
- [x] Retry: máx 3 tentativas; após 3 → marcar `erro`; alerta admin quando > 100 pendentes
- [x] `ctrl_eventbus_status` — painel de fila no dashboard Observabilidade (contadores + lista de pendentes)

### 6.3 — Aprovação por link de email (gap V1→V2)

- [x] `TokenService` (`token_service.gs`): gera/valida/expira tokens (TTL 72h) em aba `MASTER.Tokens`; idempotente
- [x] `?secao=token_acao&token=X&acao=aprovar|recusar` — rota no router sem login; página de confirmação
- [x] Aplicado a: férias, remanejamentos, aditivos, solicitações de contratação, cessão de pauta
- [ ] `NotificationEngineTokens.enviarSolicitacaoFerias/Remanejamento/Aditivo` criados — integração com engines ao aprovar em Fase 7

### 6.4 — DemandaEngine e reorganização semântica

- [ ] `DemandaEngine`: renomear — postergado Fase 7
- [ ] `SolicitacaoEspacoEngine`: separar — postergado Fase 7

### 6.5 — Módulo RECE (Rede de Equipamentos Culturais do Ceará)

- [x] `rece_repository.gs` — JSON `rece_agenda.json` + aba `COMUNICACAO.AgendaRECE` (29 colunas); listar/buscar/salvar/excluir/metricas/proximoId/prepararIndice
- [x] `rece_engine.gs` — FSM rascunho→submetida→publicada→encerrada + cancelada; FsmGuardian registrado; sincronização com Reserva Geral via `notificarNovaReserva`; upload Drive; convites Calendar; email ao publicar
- [x] `rece_controller.gs` — `ctrl_rece_listar/obter/metricas/salvar/mudar_status/excluir/upload_imagem` com RBAC `comunicacao`
- [x] **25 campos da Agenda RECE** implementados no schema
- [x] **Upload de imagem**: `ReceEngine.uploadImagem()` → Drive pasta `CCBJ_RECE_Imagens`
- [x] **Convites Google Calendar**: `_enviarConvitesCalendar()` ao publicar
- [x] **Email institucional**: `_enviarEmailPublicacao()` ao publicar
- [x] **Sincronização automática**: `notificarNovaReserva()` chamado pelo EventHandlerRegistry no `RESERVATION_CREATED`
- [x] `fase6_rece_prepararIndice()` global executável no GAS Editor
- [ ] `fase6_rece_prepararIndice()` — garante aba `COMUNICACAO.AgendaRECE` com 25 headers

**Modos de visualização — Fase 6 / RECE:**
- [ ] **Agenda/Calendário RECE**: eventos por semana/mês com cor por status (rascunho/publicado/encerrado)
- [ ] **Lista**: eventos RECE com filtros (período, espaço, status, responsável)
- [ ] **Card**: evento RECE com imagem thumbnail, artista, data e badges de categoria
- [ ] **Painel de status de fila**: lista de eventos pendentes + processados + erros (observabilidade do EventBus — estilo Datadog simplificado)

---

## Fase 7 — Portal Externo, Público, CODIP e ExportacaoEngine

**Objetivo**: canal externo funcional; dados de público para Lei Rouanet/CODIP; engine de exportação institucional.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Reestruturar `portal/` existente: as shells HTML estão criadas (Fase 0) mas sem backends funcionais.

### 7.1 — Portal Externo (backends funcionais)

- [ ] Estrutura `portal/` — controllers públicos separados com RBAC "public"
- [ ] **Rate limiting** por IP/email + **CSRF token** para formulários públicos
- [ ] **Cessão de Pauta**: formulário público → validações de negócio (antecedência mínima 15 dias, rider técnico obrigatório, bloqueio de atividades comerciais) → protocolo + email de confirmação
- [ ] **Mensagens contextualizadas por status**: "Sua cessão está sendo analisada. Prazo estimado: 5 dias úteis" — configuráveis em `config_org.json`
- [ ] **Calendário público**: ações com `visibilidadePublica: true` + filtros (tipo, gratuito/pago, período, espaço)
- [ ] **Feed iCal**: exportação de eventos públicos como calendário iCal para integração com Google Calendar/Outlook
- [ ] **ConsentimentoService**: `gas/src/core/services/consentimento_service.gs` — base legal LGPD + histórico por titular + revogação

### 7.2 — Gestão de Público (PublicoEngine)

- [ ] Criar `gas/src/modules/publico/publico_engine.gs` + `publico_repository.gs` + `publico_controller.gs`
- [ ] **Inscrições online**: formulário por Ação com dados (nome, email, idade, CEP, ocupação, renda opcional), consentimento LGPD explícito via `ConsentimentoService`
- [ ] **Lista de espera automática**: quando capacidade atingida → inscrição vai para espera → notificação automática se vaga abrir
- [ ] **Check-in de presença**: QR code por sessão OU lista manual com confirmação
- [ ] **Frequência por sessão** (gap crítico V1→V2): registro por aula/encontro (não só por ação) — essencial para cursos e oficinas
- [ ] **Pesquisa de satisfação**: disparada automaticamente 3-7 dias após Ação concluída (via evento `ACTION_COMPLETED`)
- [ ] **Certificado de conclusão**: automático ao atingir critério de frequência mínima configurável (ex: 75%); gerado via `RelatoriosPDFService`
- [ ] **Dashboard de público**: total beneficiários, perfil demográfico agregado (anônimo — LGPD), origem geográfica por CEP/bairro
- [ ] `fase7_publico_prepararIndice()` — garante aba `PUBLICO.Inscritos` com headers

### 7.3 — LGPD Sistemática (ConsentimentoService)

- [ ] **Registrar base legal** de cada coleta: consentimento, legítimo interesse, obrigação legal
- [ ] **Histórico de consentimentos** por titular: quando consentiu, para qual finalidade, via qual formulário
- [ ] **Revogação de consentimento**: titular pode revogar via portal; dados ficam anonimizados
- [ ] **Log de acessos a dados sensíveis**: quem acessou dados pessoais e quando
- [ ] **Status LGPD por arquivo de acervo**: imagem/vídeo precisa ter: consentimento coletado? para qual uso? (fotos de eventos são dados sensíveis)

### 7.4 — ExportacaoEngine (engine transversal)

> **Centraliza toda exportação para órgãos externos** — evita que cada módulo implemente o próprio export.

- [ ] Criar `gas/src/engines/exportacao_engine.gs`
- [ ] **CODIP (Secult/CE)**: 28 campos por evento; consolidação mensal dos dados; exportação JSON/CSV no formato Secult/CE
- [ ] **SALIC (MinC)**: XML de prestação de contas Lei Rouanet por projeto; validação automática de campos obrigatórios
- [ ] **SNIIC (MinC)**: indicadores nacionais de produção cultural (anuais)
- [ ] **ZIP de acervo por Ação**: compila fotos, vídeos, releases, atas com checklist de evidências
- [ ] **RelatoriosPDFService**: geração de PDFs via Google Docs API com template institucional CCBJ
  - Ata de reunião (template estruturado aprovado)
  - Contrato de prestação de serviço (para contratados)
  - Certificado de participação (voluntários, público de cursos)
  - Declaração de habilitação (agentes culturais)
  - Relatório de execução (por ação, por contrato)

**Modos de visualização — Fase 7:**
- [ ] **Calendário de eventos públicos**: portal externo com filtros visuais (tipo, gratuito, período, espaço)
- [ ] **Lista de inscrições**: por ação — nome, status (confirmado/lista de espera), check-in, frequência
- [ ] **Painel de frequência por sessão**: grade sessão × participante (✅/❌) — para cursos
- [ ] **Dashboard de público**: cartões com métricas (total inscritos, presença média, % satisfação, NPS)
- [ ] **Funil de inscrição**: inscritos → confirmados → presentes → certificados (funil de conversão visual)
- [ ] **Status de cessão de pauta**: trilha visual de status para o agente externo (estilo rastreamento de encomenda)

---

## Fase 8 — Agentes Culturais, Acervo, Voluntários e Parcerias

**Objetivo**: banco completo de agentes; memória institucional digital; gestão de parcerias.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Criar `AgenteCultural` como entidade com portal de auto-cadastro (depende do Portal da Fase 7 estar funcional).

### 8.1 — Banco de Agentes Culturais

- [ ] Criar `gas/src/modules/agentes/agente_repository.gs` — fonte: `agentes_culturais.json`; índice: `MASTER.AgentesculturaisIndex`
- [ ] Criar `gas/src/modules/agentes/agente_engine.gs` — FSM: rascunho→ativo↔suspenso→descredenciado; integração com `HabilitacoesEngine`
- [ ] **Perfil completo**: áreas artísticas, linguagens, portfolio (links), histórico de vínculos com a instituição, disponibilidade
- [ ] **Rider técnico por artista**: banco de necessidades técnicas (equipamentos, iluminação, som, palco, camarim); ao contratar → rider puxado automaticamente para lista de tarefas de infraestrutura
- [ ] **Portal de auto-cadastro**: extensão do portal externo (Fase 7) — agente preenche próprio perfil sem login interno
- [ ] **Busca de agentes**: por área, linguagem, disponibilidade, histórico, habilitação
- [ ] Integração bidirecional: agente habilitado → `EntidadeContratavel`; ao contratar → busca perfil do agente

### 8.2 — Acervo Digital

- [ ] Criar `gas/src/modules/acervo/acervo_repository.gs` + `acervo_engine.gs` + `acervo_controller.gs`
- [ ] **Upload por Ação**: foto, vídeo, release, poster, folder, ata — com tags + tipo
- [ ] **Status LGPD por arquivo**: consentimento coletado? para qual uso? — obrigatório para imagens de pessoas
- [ ] **Checklist de evidências por Ação**: quantas fotos? release publicado? vídeo de qualidade? — visibilidade do estado da prestação de contas
- [ ] **Exportação ZIP**: compila arquivos de uma Ação com checklist para prestação de contas (via `ExportacaoEngine`)

### 8.3 — Voluntários

- [ ] Criar `gas/src/modules/voluntarios/voluntario_repository.gs` + engine + controller
- [ ] Cadastro: competências, disponibilidade, histórico de participações
- [ ] **Alocação a Ações**: função + horário definidos
- [ ] **Confirmação de presença**: link automático no email de convite
- [ ] **Registro de horas realizadas**: com rastreamento por Ação
- [ ] **Certificado automático** de participação: gerado via `RelatoriosPDFService` ao encerrar Ação

### 8.4 — Parcerias e Co-Produções (gap V1→V2 — não estava no PROGRESS.md)

- [ ] Criar `gas/src/modules/parcerias/parceria_repository.gs` + `parceria_engine.gs` + `parceria_controller.gs`
- [ ] Entidade `Parceria`: organizações, coletivos, entidades co-produtoras
- [ ] **Co-produção**: divisão de responsabilidades, custos e entregas entre parceiros
- [ ] **Vinculação de Ações** a parcerias com papel de cada parceiro
- [ ] **Acompanhamento de entregas** de cada parceiro com status
- [ ] **Avaliação ao encerrar** parceria: histórico de desempenho por parceiro

**Modos de visualização — Fase 8:**
- [ ] **Grid de agentes**: cards com foto/avatar, áreas, linguagens e badge de habilitação — estilo diretório
- [ ] **Lista de agentes**: tabela com busca por área, disponibilidade, histórico
- [ ] **Galeria de acervo**: grid visual de mídias por Ação — miniatura + tipo + status LGPD
- [ ] **Lista de acervo**: tabela com filtros (ação, tipo, data, status LGPD, uso autorizado)
- [ ] **Kanban de voluntários**: por status de alocação (cadastrado → alocado → confirmado → presente)
- [ ] **Checklist visual de evidências**: progresso de prestação de contas por ação (fotos ✅ | release ✅ | vídeo ❌ | ata ✅)
- [ ] **Mapa de parcerias**: grafo simples de organizações parceiras × ações vinculadas

---

## Fase 9 — Multi-Tenancy e Painel Admin

**Objetivo**: segunda organização provisionada sem alterar código. SaaS demonstrável.

**Status**: ✅ **Concluída** (2026-05-23)

### 9.1 — orgId em todos os dados

- [x] `i_repository.gs` já filtrava por orgId — base correta
- [x] `fase9_migrarOrgId()` — script idempotente que stamp orgId em 31 arquivos JSON existentes
- [x] `fase9_validarIsolamento()` — auditoria de integridade (verifica todos os JSONs)
- [x] `fase9_prepararIndice()` — cria aba MASTER.Orgs, registra org, executa migração
- [x] `dataFolder = orgId + '_DATA'` já implementado em `config.gs`

### 9.2 — Wizard de configuração inicial

- [x] `wizard_setup.html` — wizard SPA 6 passos com stepper lateral (Organização→Setores→Turnos→Espaços→Módulos→Finalizar)
- [x] `wizard_controller.gs` — 7 controllers; retoma do passo pendente; idempotente
- [x] Rota `?secao=wizard_setup` no `router.gs`
- [x] Checklist de provisionamento com 8 verificações automatizadas
- [x] BtnGuard em todos os botões async do wizard

### 9.3 — Feature flags via config_org.json (gap Skill.md)

- [x] `config_org.json`: bloco `features` com 18 flags granulares e defaults por área
- [x] `SistemaConfigService.getFeatureFlag()` + `setFeatureFlag()` + `getFeatureFlagsCatalogo()`
- [x] `ctrl_admin_listarFeatureFlags` + `ctrl_admin_setFeatureFlag`
- [x] Tab "Features" no Admin: toggles visuais agrupados por área
- [x] Tab "Provisionamento" no Admin: checklist + barra progresso + link wizard

### 9.4 — Painel de Orgs (SaaS superadmin)

- [x] `OrgRegistryService` — registry de orgs em `orgs_registry.json` + índice MASTER.Orgs
- [x] `ctrl_orgs_listar/atualizarStatus/atualizarPlano` (superadmin RBAC)
- [x] View `#view-painel-orgs` — stats + tabela de orgs com status/plano/atividade
- [x] Menu item "Painel de Orgs" (visível apenas para superadmin)

---

## Fase 10 — Alertas, TaskHub, Reuniões, Comunicação e Auditoria Visual

**Objetivo**: sistema de alertas centralizado; centro de controle de tarefas; auditoria com rollback; UX operacional completa.

**Status**: ✅ Entregue (2026-05-24) — Deploy @151

**Arquivos criados/modificados**:
- `gas/src/engines/alertas_engine.gs` — REESCRITO: persistência MASTER.AlertasLog (12 colunas), listarAtivos, contarNaoLidos, marcarLido/Resolver, verificarTodosAutomaticos (17 sub-verificações, 25+ tipos), deduplicação
- `gas/src/controllers/alertas_controller.gs` — NOVO: 6 controllers com RBAC
- `gas/src/controllers/taskhub_controller.gs` — NOVO: ctrl_taskhub_minha_caixa/meu_time/produtividade
- `gas/src/modules/reunioes/reuniao_repository.gs` — NOVO: reunioes.json + REUNIOES.Reunioes + listarEncaminhamentosPendentes cross-reunião
- `gas/src/modules/reunioes/reuniao_engine.gs` — NOVO: FSM reunião+ata, encaminhamentos → tarefas automáticas
- `gas/src/modules/reunioes/reuniao_controller.gs` — NOVO: 12 controllers
- `gas/src/modules/comunicacao/balcao_repository.gs` — NOVO: balcao_demandas.json + SLA_POR_TIPO + metricas
- `gas/src/modules/comunicacao/balcao_engine.gs` — NOVO: FSM 7 estados, SLA, versões, notificações
- `gas/src/modules/comunicacao/balcao_controller.gs` — NOVO: 8 controllers, RBAC comunicacao+
- `gas/src/modules/admin/auditoria_controller.gs` — NOVO: listar, rollback (superadmin), detectarSuspeitos
- `gas/src/core/setup.gs` — fase10_prepararIndice() + inicializarSistema() expandido
- `gas/src/frontend/index.html` — badge alertas, painel deslizante, views reunioes/taskhub/balcao/auditoria, GAS.alertas/reunioes/balcao/taskhub/auditoria namespaces, AlertasUI/ReunioesUI/TaskHubUI/BalcaoUI/AuditoriaVisualUI modules, CSS Fase 10, menu items, Router entries

### 10.1 — AlertasEngine completo

- [x] 25+ tipos de alerta com severidade (INFO / ATENÇÃO / URGENTE)
- [x] Alertas in-app: badge no header com contador + painel de notificações deslizante
- [x] Escalação automática baseada em tipos catalogados
- [x] **Tipos específicos ativos**: contratos vencendo, ações atrasadas, almox vencido, encaminhamentos vencidos, demandas SLA, chaves vencidas, reuniões sem ata

### 10.2 — TaskHub (Centro de Controle)

- [x] `ctrl_taskhub_minha_caixa()` — agrega tarefas + encaminhamentos + demandas + aprovações + alertas
- [x] **Visão "Meu Dia"**: pendências priorizadas por prazo + urgência + SLA consumido
- [x] **Visão "Meu Time"** (gestores): carga por pessoa (tarefas+demandas+encaminhamentos+atrasados)
- [x] **Visão "Produtividade"**: concluídas, taxa no prazo, média horas/dias para o período

### 10.3 — Reuniões redesenhadas

- [x] `reuniao_repository.gs` + `reuniao_engine.gs` + `reuniao_controller.gs` CRIADOS
- [x] FSM reunião: rascunho → agendada → em_andamento → encerrada (+ cancelada)
- [x] FSM ata: rascunho_ata → em_aprovacao → aprovada (imutável após aprovação)
- [x] Encaminhamentos consolidados cross-reuniões por responsável
- [x] Encaminhamentos ao encerrar → tarefas automáticas criadas via TarefaEngine

### 10.4 — Comunicação / Balcão redesenhado

- [x] SLA por tipo: design:72h, foto:48h, video:120h, texto:24h, social:24h (divisor por urgência)
- [x] Versionamento de entregas (v1/v2...) com histórico e contador de rodadas
- [x] Comentários na demanda (thread entre demandante e executor)
- [x] Dashboard de SLA: taxaNoPrazo%, mediaRodadas, atrasadas, porTipo

### 10.5 — Auditoria Visual com Rollback (gap V1→V2)

- [x] View de auditoria no SPA com filtros (usuário, módulo, evento, período)
- [x] Botão de rollback por operação (superadmin), restore via snapshot `before` do AuditoriaService
- [x] Detecção de comportamento suspeito: operações > N em janela de tempo → alerta AUDITORIA_FALHA

**Modos de visualização — Fase 10:**
- [x] **TaskHub "Meu Dia"**: separadores Vencido | Hoje | Esta Semana | Mais tarde — estilo Linear
- [x] **Cards do Balcão**: barra de SLA colorida (verde→amarelo→vermelho), versões, comentários
- [x] **Lista de encaminhamentos consolidados**: cross-reuniões, ordenados por prazo, filtro por responsável
- [x] **Painel de auditoria**: filtros + badge por tipo + botão desfazer com confirmação

---

## Fase 11 — Estratégia, Dashboards Reais e Produto Pronto para Mercado

**Objetivo**: KPIs reais; observabilidade total; cockpit executivo; demonstrável para outras organizações.

**Status**: ⬜ Não iniciada

**Próximo passo quando iniciar**:
> Corrigir `obterMetricasEficiencia` e `calcularCustoPorMeta` (retornam zero hoje) antes de qualquer dashboard.

### 11.1 — Módulo de Estratégia

- [ ] Criar `gas/src/modules/estrategia/estrategia_repository.gs` + engine + controller
- [ ] **Objetivos estratégicos**: curto (1 ano), médio (3 anos), longo prazo (5 anos) — vinculação de Ações a objetivos
- [ ] **Monitoramento de progresso**: % de ações vinculadas ao objetivo no prazo; execução financeira associada
- [ ] `gerarRelatorioEstrategico()`: síntese trimestral/anual — ações concluídas, público, recursos executados, planejado vs realizado
- [ ] **KPIs consolidados reais** (substituir zeros):
  - Taxa de ocupação de espaços (média mensal por sala)
  - Taxa de conclusão de ações no prazo
  - Custo por ação / custo por atendimento / custo por hora-atividade
  - Índice de satisfação do público (pesquisas pós-ação)
  - Execução orçamentária (% executado por contrato/meta)
  - Taxa de renovação de habilitados / novos agentes culturais
- [ ] **Painel "Riscos do Mês"**: ações atrasadas + contratos vencendo + rubrica crítica + clima baixo — consolidado executivo
- [ ] **Calendário estratégico anual**: linha do tempo Ações × Objetivos × Recursos

### 11.2 — Escuta Institucional completa

- [x] Criar `gas/src/modules/escuta/escuta_engine.gs` + repository + controller
- [x] **8 dimensões científicas** baseadas em UWES, JDC, CVF, NR-1
- [x] **Algoritmo de fairness**: cada colaborador recebe pesquisas proporcionalmente; sem sobrecarga de respostas
- [x] **Índice de confiança**: representatividade dos dados (% de respostas vs total de colaboradores)
- [x] **Cruzamento analítico**: clima × escalas × férias × absenteísmo
- [x] **Alerta automático**: clima deteriora > 15 pontos em 2 semanas → alerta ao gestor + RH
- [x] **Consentimento LGPD**: dados sensíveis coletados com consentimento explícito via `ConsentimentoService`

### 11.3 — Dashboards reais e IA analítica

- [x] **Dashboard operacional**: ocupação espaços / agendas / SLAs de demanda em tempo real
- [x] **Dashboard financeiro**: por contrato / meta / rubrica / setor; planejado vs realizado
- [x] **Dashboard estratégico** (direção): execução global + KPIs + riscos + clima
- [x] **IA analítica**: `ctrl_dashboard_insights_ia` — rule-based + IA (Groq) quando disponível; `ctrl_dashboard_relatorio_ia` — síntese narrativa do período

### 11.4 — Módulo RH Avançado e Ponto (Fase 3.4 consolidada)

- [x] **Ponto eletrônico**: tipos E/S/I/R, cálculo horas dia, espelho mensal, banco de horas
- [x] **Custo CLT completo**: INSS progressivo + Sistema S + FGTS + PIS + VT/VA + provisões (13º, férias, FGTS rescisório)
- [x] **Simulação de cenário**: reajuste % aplicado em toda folha + impacto financeiro imediato
- [x] **Calculadora de rescisão**: break-even (economia mensal vs custo rescisório)
- [x] **Indicadores de turnover**: taxa voluntário/involuntário, custo de rotatividade, comparativo períodos
- [x] **Colabore AFD export**: Portaria MTE 1510/2009 (tipo-1 header, tipo-3 marcações, tipo-9 trailer)
- [x] **Colabore CSV export/import**: formato `PIS;Nome;Data;Hora;Tipo;NSR`

### 11.5 — Preparação para mercado e exportações institucionais

- [x] Zero hardcodes de "CCBJ" em código ou labels (auditoria `rece_engine.gs`)
- [x] `getOrgConfig().orgNome` substituindo `'CCBJ'` literal nos motores de comunicação
- [x] **Exportação SALIC**: XML completo (Proponente+Projeto+PlanoAplicação+PessoalEquipe+Resumo), campo PRONAC no formulário de contrato, botão "SALIC XML" no detalhe do contrato (visível apenas para modalidade lei_rouanet), tab "Exportações" no Financeiro (F13.1) ✅
- [x] **Exportação PNAB** (Lei Aldir Blanc 14.399/2022): 4 CSVs (Espaços, Agentes Culturais, Ações, Financeiro), seletor de ano, ExportacoesUI, GAS.exportacao.pnab (F13.1) ✅
- [ ] **Exportação SNIIC**: indicadores nacionais de produção cultural (MinC) via `ExportacaoEngine` (F13.2)
- [ ] Documentação de provisionamento para novas orgs (< 30 minutos) (F13.3)
- [ ] Demonstração com org diferente do CCBJ sem alterar código (F13.3)

**Modos de visualização — Fase 11:**
- [ ] **Dashboard estratégico**: KPIs em cards com sparklines; semáforo de risco (verde/amarelo/vermelho); tendência 3 meses
- [ ] **Mapeamento estratégico visual**: eixos temáticos (educação × cultura × território × sustentabilidade) em grid 2D com ações posicionadas
- [ ] **Calendário estratégico**: linha do tempo anual — ações × objetivos × recursos (Gantt executivo)
- [ ] **Dashboard de riscos "Riscos do Mês"**: painel consolidado com itens priorizados por urgência; drill-down por item
- [ ] **Heatmap de ocupação**: salas × horário × dia da semana — calendário de calor visual
- [ ] **Dashboard de clima**: radar por dimensão + linha do tempo de evolução + comparativo entre setores
- [ ] **Dashboard financeiro**: stacked bar previsto/executado por rubrica; funil de execução orçamentária
- [ ] **Funil de turnover**: headcount × entradas × saídas × custo no período

---

## Log de Sessões

| Data | Fase | O que foi feito | Próximo passo |
|------|------|-----------------|---------------|
| 2026-05-20 | Fase 0 | Criação do ambiente saas-v2/, estrutura de diretórios, arquivos core Fase 0 completos, config_service.gs, config_org.json, i_repository.gs, stubs de integração, router.gs, appsscript.json, setup.gs, PROGRESS.md | Executar `verificarTodasAbas()`; criar frontend shell; criar módulo admin |
| 2026-05-20 | Fase 0 | Módulo admin (boot, user_profile, config_admin), alertas_engine.gs (25 tipos), frontend/index.html (SPA+Router+Toast+BtnGuard), 5 portais públicos, diretriz de pesquisa profunda no PROGRESS.md | Deploy clasp; executar `inicializarSistema()`; confirmar 0.9 saneamentos; iniciar Fase 1 |
| 2026-05-20 | Fase 0 | Links configurados: GAS criado (scriptId `14edpTDbIglnYT_...`), `.clasp.json` atualizado, GitHub repo privado `joaaobarros/saas-erp-cultural-v2` criado e push inicial feito | `clasp push` → `inicializarSistema()` → saneamentos 0.9 → Fase 1 |
| 2026-05-20 | Fase 0 | Saneamento 0.9 completo (notification_engine, ia_service, config_org.json+contextoIA); migração 0.4 confirmada; AcessoService (acesso_service.gs) + primeiro_acesso.html; USER_DEPLOYING mantido; setup.gs registra superadmin; PROGRESS.md atualizado | `clasp login && clasp push` → definir PropertiesService → `inicializarSistema()` → `verificarTodasAbas()` → Fase 1 |
| 2026-05-20 | Fase 0 | Logomarca+paleta (LogoPaletaService, SistemaConfigService, Identidade JS, admin UI, extração via canvas); **paleta → ROXO** (`#7c3aed`); BtnGuard v2 (shared/btnguard.html com wrap+auditar); include() em router.gs; todos os botões async protegidos em index.html + primeiro_acesso.html + 5 portais; PROGRESS.md atualizado com checklist BtnGuard por fase | `clasp login --no-localhost && clasp push` → `inicializarSistema()` → `verificarTodasAbas()` → `BtnGuard.auditar()` no browser → Fase 1 |
| 2026-05-21 | Fase 0/1 | Deploys realizados no Apps Script; UI principal reconstruída; corrigido include em comentário; criada Fase 1.1 com `TarefaRepository`, `TarefaEngine`, controllers, migração Sheet→JSON, proteção de índice e view mínima de Tarefas; `domain_model.md` atualizado | Executar `fase1_tarefas_prepararIndice()`/migração no GAS se houver dados; iniciar Fase 1.2 Colaboradores |
| 2026-05-21 | Fase 1.2 | Colaboradores: `ColaboradorRepository` (colaboradores.json + sub-coleções + índice EQUIPES.Funcionarios), `PessoasEngine` (FSM status colaborador + FSM férias com 6 estados + fusão EquipesEngine+RHEngine), `pessoas_controller.gs` (ctrl_pessoas_* + ctrl_rh_*, RBAC completo, férias com FSM), view SPA Pessoas (métricas, CRUD, filtro status, PessoasUI), GAS.pessoas namespace, rota registrada no Router | `clasp push` → `fase1_colaboradores_prepararIndice()` → `fase1_colaboradores_migrarFuncionarios()` → smoke-test no browser → iniciar Fase 1.3 Contratações |
| 2026-05-21 | Fase 1.3 | Contratos: `ContratoRepository` (contratos.json com nested metas/rubricas/indicadores, índice FINANCEIRO.Contratos, migração idempotente), `ContratosEngine` (FSM Ativo↔Suspenso→Encerrado, cálculos financeiros, análise de divergência), `contratos_controller.gs` (ctrl_contratos_*, RBAC por papel financeiro/gestor/admin), view SPA Financeiro (ContratosUI, GAS.contratos, métricas, CRUD, filtro status) | `fase1_contratos_prepararIndice()` → `fase1_contratos_migrarSheetParaJson()` → smoke-test browser → iniciar Fase 1.4 Ativos e Almoxarifado |
| 2026-05-21 | Fase 1.4 | Ativos: `AtivoRepository` (ESPACOS.Ativos Sheet canônica + MovimentacoesAtivos + BaixasAtivos + Manutencoes), `AtivosEngine` (FSM completa + métricas + auditoria + eventos), `ativos_controller.gs` (ctrl_ativos_* + RBAC), `AlmoxarifadoEngine` (stub FSM empréstimo para Fase 2.2), view SPA Espaços (AtivosUI + GAS.ativos + rota espacos), `fase1_ativos_prepararIndice()`. Fase 1 concluída. | `fase1_ativos_prepararIndice()` no GAS Editor → smoke-test no browser (Módulo Espaços) → iniciar Fase 2 Reservas |
| 2026-05-22 | Fase 2 | Reservas: `ReservaRepository` + `ReservaEngine` (assertSemConflito+LockService+FSM) + `reservas_controller.gs`. Almoxarifado: `ReservasItensRepository` (MASTER.Itens+EmprestimosItens) + `AlmoxarifadoEngine` (FSM completo+assertItemDisponivel+verificarAtrasos). Chaves: `ChaveRepository` + `ChaveEngine` (FSM+verificarAtrasos+eventos) + `chaves_controller.gs`. View Espaços com 4 tabs (Reservas|Chaves|Empréstimos|Patrimônio) + EspacosUI+ReservasUI+ChavesUI+AlmoxUI. GAS.reservas/chaves/almox. Deploy @24. | Executar os 3 prepararIndice() no GAS Editor → smoke-test no browser → iniciar Fase 3 |
| 2026-05-22 | Auditoria | 5 bugs corrigidos: (1) `prompt()` null nunca capturado em ChavesUI/ReservasUI/AlmoxUI (padrão `\|\| ''` consumia null antes do if); (2) `ReservasUI.salvar()` sempre criava — adicionado `GAS.reservas.atualizar` e dispatch condicional por id; (3) CSS `badge-accent`/`form-grid` indefinidos; (4) sanitização regex de email inconsistente em `IdentidadeAdmin._aprovar` vs `_carregarPendentes`; (5) `FsmGuardian.transitar()` ausente em `almoxarifado_engine.verificarAtrasos()`. CLAUDE.md atualizado com checklist auditoria pré-deploy. Deploy @26. | Executar prepararIndice() → smoke-test browser → iniciar Fase 3 |
| 2026-05-22 | Fase 3 | `ContratadoRepository`+`ContratadoEngine` (FSM contratado + FSM habilitação PF/PJ), `SolicitacaoRepository`+`SolicitacaoEngine` (FSM 9 estados + OrcamentoGuard stub + CQRS+cache), `contratacoes_controller.gs` (RBAC gestor/financeiro/rh). `pessoas_engine.gs`: Afastamentos FSM+impacto colaborador + Ocorrências. `colaborador_repository.gs`: afastamentos.json+ocorrencias.json. `pessoas_controller.gs`: 9 novos controllers RH. View SPA Pessoas (3 tabs) + Contratações (3 tabs). `SCHEMA_ABAS` corrigido (Contratados+SolicitacoesContratacao). Deploy @28. | `fase3_contratados_prepararIndice()` → `fase3_contratacoes_prepararIndice()` → smoke-test browser → iniciar Fase 4 |
| 2026-05-22 | Análise V1→V2 | Análise comparativa completa do sistema legado (GitHub + backup local) vs V2. Identificados: 7 grupos de funcionalidades do legado não migradas (RECE, rollback de auditoria, IA, lote de reservas, aprovação por email, dashboard real, preferências); 3 módulos completamente novos (RECE, Ponto, ExportacaoEngine); gaps funcionais em todas as Fases 5–11. PROGRESS.md atualizado com: Fase 3.4 (RH Avançado), nova Fase 6 com módulo RECE, Fase 7 com CODIP+ExportacaoEngine, modos de visualização por módulo, tabela Estado Geral corrigida (Fase 4 = ✅). | Pendências antes de Fase 5: git commit dos arquivos não commitados de F4 → executar 3 prepararIndice() de F4 no GAS Editor → smoke-test browser F4 |
| 2026-05-23 | Fase 5 | Ação como Núcleo Real: `AcaoRepository` (acoes.json+ACOES.Acoes), `AcaoEngine` (FSM 6 estados+snapshot+painel integrado), `acoes_controller.gs` (7 controllers CQRS RBAC), `setup.gs` (prepararIndice), `index.html` (view-acoes: Kanban 4 colunas+Lista+modal+painel 6 tabs+GAS.acoes+AcoesUI+CSS aliases). BtnGuard: wrap em nova/salvar/editar; data-bg-skip em kanban/FSM. Deploy @61. | fase5_acoes_prepararIndice() no GAS Editor → smoke-test browser (criar ação, painel, FSM) → Fase 6 |
| 2026-05-23 | UX/Infraestrutura | Rename Espaços→Infraestrutura (menu/nav/page-title/registry). Patrimônio: campo Tipo (Fixo/Volante) + Quantidade + Localização Atual como select linkado à lista de espaços cadastrados. Métricas fixo/volante no dashboard. Filtro por tipo na lista. Funções globais `mascaraMoeda`/`parseMoeda`/`fmtMoeda`; máscara R$ 0,00 em todos os campos monetários (sol-valor, cf-valor, cd-meta-valor, cd-rubrica-valor, ff-valor, rem-valor, adt-valor-adicional, at-valor). Backend: colunas Tipo+Quantidade em ativos_repository.gs. Deploy @74. | fase1_ativos_prepararIndice() no GAS Editor para adicionar colunas Tipo/Quantidade na Sheet → smoke-test Patrimônio (novo ativo fixo+volante, localização select, valor formatado) → Fase 6 |
| 2026-05-24 | Fase 11.2–11.5 | **Fase 11 completa**: **11.2** `escuta_repository.gs`+`escuta_engine.gs`+`escuta_controller.gs` — 8 dimensões UWES/JDC/CVF/NR-1, FSM rascunho→ativa→encerrada→arquivada, fairness algorithm (sort por participações passadas), índice de confiança, cruzamento clima×pessoas, evolução histórica, alertas automáticos (≥15pts deterioração, dimensão crítica <2.5/5, confiança <40%), LGPD. **11.3** `dashboard_controller.gs` — 5 controllers (operacional+financeiro+estratégico+insights_ia+relatorio_ia), aggregação multi-módulo com fallbacks lerJSON, rule-based insights + IA (Groq) quando disponível, RBAC gestor/coordenador+. **11.4** `ponto_repository.gs`+`ponto_engine.gs`+`ponto_controller.gs` — marcações E/S/I/R, cálculo horas dia, espelho mensal, banco de horas, custo CLT completo (INSS progressivo+FGTS+PIS+SistemaS+RAT+VT/VA+provisões), simulação reajuste, rescisão+break-even, turnover; **Colabore AFD** Portaria MTE 1510/2009 (tipo-1/3/9, CNPJ14+razaoSocial150+NSR9+data8+hora4+PIS11); **CSV Colabore** PIS;Nome;Data;Hora;Tipo;NSR (import+export). **11.5** hardcodes CCBJ removidos em `rece_engine.gs` (PASTA_IMAGENS usa orgId dinâmico, nome usa orgNome). `setup.gs` fase11_prepararIndice() expandido (EscutaRepository+PontoRepository). `index.html`: 3 GAS namespaces (escuta 11 bindings + dashboard 5 + ponto 14), 3 views HTML (view-escuta/view-dashboard/view-ponto com 4 tabs cada), 3 JS modules (EscutaUI+DashboardUI+PontoUI), Router entries, menu sidebar, MetricsToggle.init. Auditoria CLAUDE.md 100% verde: CSS ✅ modais opacos (rgba .52 + var(--surface)) ✅ BtnGuard em todos botões ✅ GAS.* namespace 100% ✅ FsmGuardian em todas transições ✅ prompt/null-check ✅. | `clasp login` → `clasp push` → `clasp deploy --deploymentId AKfycb... --description "Fase 11"` → `fase11_prepararIndice()` no GAS Editor → smoke-test browser (Escuta, Dashboard, Ponto, Colabore AFD) → Fase 13 |
| 2026-05-24 | Fase 15.1 | **Auditoria Completa + Correções**: 8 bindings GAS.* adicionados (almox.salvarItem, ativos.concluirManutencao/registrarUso/categorias, pessoas.obter/registrarDesligamento/autocomplete/porFuncao, rh.solicitarAjuste). 4 automações IntegracaoOrquestrador ativadas (onReservaConfirmada→TarefaEngine, onAcaoConcluida→AlertasEngine, onContratoVencendo/onProtocoloChaveAtrasado→TarefaEngine). ModulosRegistryService 9→20 módulos. reserva_engine chama onReservaConfirmada. UX: blur(4px)+animation .22s em modais. Tests suíte: 7 .md com achados reais. Deploy @213. | Smoke-test browser → BtnGuard.auditar() → Fase 13.2 SNIIC |
| 2026-05-24 | Fase 15 | **Banco de Dados — hierarquia Drive + acesso a planilhas**: `admin_controller.gs` — `_garantirEstruturaDrive()` cria pasta-mãe `CCBJ — ERP`, sub-pasta `Planilhas`, move pasta JSON + todas as 11 planilhas (MASTER/ACOES/ESPACOS/PESSOAL/EQUIPES/FINANCEIRO/RELATORIOS/REUNIOES/COMUNICACAO/PUBLICO/ESCUTA) para os destinos corretos no Drive (idempotente); `ctrl_admin_obterInfoBancoDados()` retorna { pastaErp, pastaJson, pastaPlanilhas, planilhas[] } com URL/nome/ícone/descrição para cada planilha; `ctrl_admin_obterUrlPastaDados()` atualizado para compatibilidade retroativa. `index.html` — card "Banco de Dados" redesenhado (3 botões: Pasta ERP, Dados JSON, Planilhas + grid responsivo de 11 cards de planilhas com link "Abrir"); `AdminDadosUI` reescrito com `carregar()`/`_renderPastas()`/`_renderPlanilhas()`; `GAS.admin.obterInfoBancoDados` binding; `AdminDadosUI.carregar()` chamado no `aoAbrir` do módulo admin. Auditoria CLAUDE.md: sem novos modais, sem novos prompts, sem novos botões async (botão refresh tem `data-bg-skip="1"`). Deploy @201. | Smoke-test: Administração → Banco de Dados → 3 botões Drive apontam para pastas corretas → 11 cards com link "Abrir" → cada link abre a planilha no Sheets → BtnGuard.auditar() → próxima fase |
| 2026-05-24 | Fase 14 | **View unificada RH / Depto. Pessoal (10 abas)**: `view-rh` HTML completo (EQUIPE·PCCS·HISTÓRICO·AVALIAÇÕES·ESCALAS·DOCUMENTOS·FÉRIAS·FOLHA·RESCISÃO·INDICADORES). `RhUI` IIFE (~600 linhas): aoAbrir + setTab (lazy) + módulos para cada aba; `_abrirModalRh`/`_fecharModalRh`/`_abrirModalConfirmarRh` locais; BtnGuard em todos botões async. Helpers globais `_abrirModalSimples`/`_abrirModalConfirmar` movidos para escopo global (fix bug MapaAcaoUI). `GAS.rh.*` expandido com 18 novos bindings (historico, registrarEvento, excluirEvento, listarAvaliacoes, salvarAvaliacao, excluirAvaliacao, listarEscalas, salvarEscala, excluirEscala, listarFerias, saldoFerias, solicitarFerias, aprovarFerias, recusarFerias, cancelarFerias, concluirFerias, reenviarFerias + pccs). `_MODULOS_MENU` expandido com `{ id:'rh', label:'RH / Depto. Pessoal', icone:'badge' }`. `Router.registrar('rh', ...)`. AfastamentosUI e OcorrenciasUI: substituídos `confirm()`/`prompt()` nativos por modais via `_abrirModalSimples`/`_abrirModalConfirmar`; funções `_executarAtivar`, `_executarEncerrar`, `_executarCancelar`, `_executarExcluir` exportadas. Auditoria CLAUDE.md 100% verde. Deploy @198. | Smoke-test browser: sidebar mostra "RH / Depto. Pessoal" → clicar nas 10 abas → CRUD colaboradores → solicitar férias → calcular CLT → BtnGuard.auditar() → Fase 13.2 SNIIC |
| 2026-05-24 | Fase 13.1 | **Exportações Institucionais SALIC + PNAB**: `exportacao_engine.gs` — `gerarSALIC()` REESCRITO completo (Proponente, Projeto com PRONAC/número/vigência/contrapartida, PlanoAplicação metas→atividades→rubricas com MemóriaCalculo, PessoalEquipe por meta, Resumo financeiro); `gerarPNAB()` NOVO (4 CSVs: Espaços BOM-UTF8 via ReservaRepository, Agentes via AgenteCulturalRepository, Ações via AcaoRepository+PublicoEngine, Financeiro via ContratoRepository); `ctrl_exportacao_salic` expandido (aceita `contratoId`\|`projetoId`, retorna `nomeArquivo`); `ctrl_exportacao_pnab` NOVO. `index.html`: campo PRONAC (visível quando modalidade=lei_rouanet) + onchange no select modalidade; botão "SALIC XML" no header do contrato-detalhe-card (oculto exceto lei_rouanet); `ContratosDetailUI.exportarSALIC()` + `exportarSALIC` na API pública; `GAS.exportacao.salicContrato` + `GAS.exportacao.pnab` bindings; tab "Exportações" no Financeiro (4ª tab); HTML tab com card SALIC (select contrato lei_rouanet + botão) + card PNAB (seletor ano + botão + chips resultado); `ExportacoesUI` module (aoAbrir popula select, baixarSALIC, gerarPNAB + _baixarArquivo); `FinanceiroTabs.abrirTab` chama `ExportacoesUI.aoAbrir`. Auditoria CLAUDE.md 100% verde: BtnGuard nos 3 botões (btn-cd-salic/btn-exp-salic/btn-exp-pnab) ✅ CSS classes existentes ✅ GAS.* namespace ✅ modais inalterados ✅. | `clasp login` → `clasp push && clasp deploy --deploymentId AKfycb... --description "Fase 13.1"` → smoke-test browser (Financeiro→Exportações→SALIC XML + PNAB CSVs, detalhe contrato lei_rouanet → botão SALIC) → Fase 13.2 SNIIC |
| 2026-05-24 | Auditoria Sistema | **Auditoria completa do sistema (10 categorias)**: GAS.* namespace 100% (312 bindings frontend vs 365 backend, apenas funções portal/wizard/trigger sem binding — correto), ContratosDetailUI Fase 12.1 validado, prompt()/null-check correto em todos os pontos, CSS classes verificadas, modais opacos, BtnGuard completo, FsmGuardian em todas as transições, DOM IDs sem inconsistência, portais reais. **4 bugs corrigidos**: (1) `ctrl_contratacoes_gerar_token` IMPLEMENTADO — função ausente causaria crash no "Reenviar Link Portal"; (2) `portal_aprovacao.html` REESCRITO — substituídos TODOs/setTimeout/dados hardcoded por `google.script.run` real (`ctrl_portal_getInfoAprovacao` + `ctrl_portal_registrarAprovacao` adicionados ao portal_controller.gs); (3) `EstrategiaRepository.prepararIndice()` adicionado em `setup.gs → inicializarSistema()`; (4) Deploy @179 realizado. **PATTERNS.md criado** — guia completo de padrões obrigatórios para próximas fases (backend, frontend, RBAC, FSM, auditoria, portais, UI/UX, modais, BtnGuard, CSS). | Smoke-test manual Fase 12.1 no browser → confirmar CRUD Meta/Atividade/Rubrica/Pessoal → depois Fase 11.2 Escuta Institucional ou 11.3 Dashboards Reais |
| 2026-05-24 | Fase 11.1 | **Estratégia Institucional + Identidade TRAMAR** entregues: `estrategia_repository.gs` (objetivos_estrategicos.json + ACOES.Estrategia). `estrategia_engine.gs` (FSM 5 estados; `calcularKPIs()` real — ocupação espaços, conclusão ações no prazo, custo por ação, NPS público, execução orçamentária, renovação agentes; `calcularRiscos()` — 5 categorias classificadas por severidade; `gerarRelatorio()` trimestral/semestral/anual; `gerarCalendario()` por horizonte). `estrategia_controller.gs` (CQRS + cache + RBAC 8 funções). 7 eventos STRATEGY_* em `events_constants.gs`. `setup.gs` ACOES.Estrategia + `fase11_prepararIndice()`. `index.html`: GAS.estrategia (13 bindings), view-estrategia (4 tabs: Objetivos/KPIs/Riscos/Calendário), `EstrategiaUI` module completo, modais opacos, BtnGuard 100%. **Identidade TRAMAR**: sidebar tagline estático; logo 52×52px; `_boot.orgConfig.nomeInstituicao` na sidebar; `document.title` = "TRAMAR — [inst.]"; campos `nomeInstituicao` + `apresentacaoInstituicao` em `config_org.json`/`getPublicOrgConfig()`/`LogoPaletaService`/Admin UI. Auditoria CLAUDE.md 100% verde. Deploy @167. | `fase11_prepararIndice()` no GAS Editor → smoke-test browser (Estratégia CRUD+KPIs+Riscos+Calendário, sidebar TRAMAR, Admin Identidade Institucional) → Fase 11.2 ou 11.3 |
| 2026-05-26 | Fase 16.3 | **Dashboard RH/Folha — custo total, heatmap banco de horas, calendário ponto, turnover 12m**: `rh_dashboard_controller.gs` CRIADO — `ctrl_rh_dashboard_folha` (custo estimado CLT/PJ/bolsista por colaborador, breakdown vínculo/setor, histórico 12m, projeção anual), `ctrl_rh_dashboard_ponto` (heatmap todos×6m e calendário individual com status presente/parcial/ausente), `ctrl_rh_dashboard_turnover` (tendência 12m + média + altoRisco). `index.html`: 3 GAS bindings; CSS 12 blocos (rh-dash-*, bh-grid/cell, ponto-cal, tv-bar/taxa); Tab Folha: sub-nav Dashboard|Calculadora + painel com stats strip + breakdown + gráfico 12m + tabela; Tab Indicadores: 4 seções (Turnover 12m, Heatmap BH, Calendário, Mês específico); RhUI 6 funções novas + setTab atualizado. Auditoria CLAUDE.md 100% verde. Deploy @249. | Smoke-test browser: RH→Folha→Dashboard (stats+breakdown+12m) + Indicadores→Turnover 12m+Heatmap BH+Calendário ponto → F12 zero erros |
| 2026-05-26 | Fase 18 | **Reservas Modo Lote + Buffer 5min + Habilitado + Cancelamento urgente**: `reserva_engine.gs` (BUFFER=5, STATUS_RESERVA.HABILITADO, FSM confirmado→habilitado→em_uso, notificação GmailApp para admins em cancelamento no dia), `reservas_controller.gs` (ctrl_reservas_habilitar), `index.html` (CSS badge-habilitado+lote-*, GAS.reservas.habilitar, botão "Lote" data-bg-skip, modal #lote-modal 2 cols: campos reserva + seletor 4 modos manuais/semanal/intervalo/mensal, IIFE _LoteUI com chips preview + dispatch criarLote, botão Habilitar na lista, _cancelar motivo obrigatório para hoje + aviso vermelho). Auditoria CLAUDE.md 100% verde. Deploy @253. | Smoke-test: Reservas→Lote→semanal→criar; confirmar→habilitar→badge roxo; cancelar reserva hoje→motivo obrigatório; F12 zero erros |
| 2026-05-26 | Fase 17 | **Holerite e Processamento de Folha**: `holerite_repository.gs` (holerites.json + EQUIPES.Holerites, ID HOL-AAAA-MM-NNN, idempotente, marcarPago/cancelar/metricas), `holerite_engine.gs` (INSS progressivo, IRRF, VT/VA/VR/PS, HE 50%, encargos patronais completos, provisões mensais férias+13°+FGTSresc, processarFolha em lote, exportarCSV), `holerite_controller.gs` (8 ctrl_holerite_* + RBAC rh/admin), setup.gs (EQUIPES.Holerites + fase17_holerite_prepararIndice), index.html (8 GAS bindings, CSS 11 blocos, painel Processamento na sub-nav Folha, HoleriteUI IIFE ~300 linhas com modal holerite completo + impressão + marcarPago via _abrirModalConfirmar). Auditoria CLAUDE.md 100% verde. Deploy @251. | `fase17_holerite_prepararIndice()` no GAS Editor → smoke-test browser (RH→Folha→Processamento: métricas, processar folha, modal holerite, imprimir, marcar pago, exportar CSV) |
| 2026-05-26 | Fase 19 | **Pós-evento Reservas + ConsolidacaoEngine**: `reserva_repository.gs` (3 novas colunas MinutosMontagem/MinutosEncerramento/PosEvento, `_nCols` defensivo, `atualizarPosEvento/atualizarPreEvento`, `prepararIndice` com migração); `reserva_engine.gs` (`registrarPosEvento` com cálculo tempoAtividadeMin); `reservas_controller.gs` (`ctrl_reservas_registrarPosEvento`); `acao_engine.gs` (`metaExecucao` no schema); `consolidacao_engine.gs` CRIADO (`calcularExecucaoAcao` + `ctrl_consolidacao_execucaoAcao`); `index.html` (campos Montagem/Encerramento + display tempo atividade no form, botão pós-evento na lista, modal `#pos-evento-modal`, `GAS.reservas.registrarPosEvento`). Deploy @259. | `fase2_reservas_prepararIndice()` no GAS Editor para adicionar as 3 novas colunas → smoke-test browser |
| 2026-05-26 | Fase 13.2 | **SNIIC — Exportação completa para MinC**: `exportacao_engine.gs` — `gerarSNIIC()` REESCRITO: 6 seções (Identificação, Funcionamento, RH, Atividades×8 categorias+12 meses, Público+faixas+PcD+NPS, Recursos Financeiros por esfera); `_gerarCsvSNIIC()` — CSV BOM UTF-8 Seção/Campo/Valor 40+ linhas para importação no portal MinC. `index.html` — card SNIIC na aba Exportações do Financeiro (input ano + BtnGuard + dashboard inline `_renderSNIICResumo`); `ExportacoesUI.gerarSNIIC()` + init de ano em `aoAbrir()`; `PublicoUI.exportarSNIIC()` REESCRITO com dashboard rico (6 stat cards, barras de categoria, barras mensais, badges faixas etárias, re-download manual via `_sniicCsvCache`). Auditoria CLAUDE.md 100% verde. Deploy @239. | smoke-test browser (Público + Financeiro → SNIIC) → Fase 13.3 ou próxima prioridade |
| 2026-05-25 | Fase 16.1 | **Reservas: Manutenção + CCBJ Fechado todos os modos + Itens real-time + Migração V1**: `mapa_controller.gs` (emManutencao+itensFixos no retorno); `admin_controller.gs` (`ctrl_admin_alternarManutencaoEspaco` RBAC admin/gestor/infraestrutura); `migracao_itens_v1.gs` (novo — `migrar_itens_v1()` lê CCBJ_ESPACOS.Itens via V1_ESPACOS_SHEET_ID); `almoxarifado_engine.gs` (`_parseItensVolantesStr`+`_horariosSobrepoem`+`calcularDisponibilidadeItens` cruzando empréstimos+itensVolantes de reservas sobrepostas+itensFixos outras salas); `reservas_controller.gs` (`ctrl_reservas_disponibilidadeItens`); `index.html` (GAS bindings alternarManutencao+disponibilidadeItens; `#res-admin-toolbar` acima do modo-toggle; `#modal-manutencao-espaco`; blocos itens fixos+volantes com chips verde/vermelho; re-validação ao mudar horário; salvar bloqueado com chips vermelhos; ReservasUI new fns: abrirModalManutencao/_fecharModal/_atualizarBadge/_confirmar/_carregarDisponibilidade/_adicionarItem/_removerItemChip/_renderChips/_serializarItensVolantes/_temChipsIndisponiveis); `mapa_ui.html` (_meuPapel capturado via App.getBoot; seção Equipamentos Fixos no painel; botão Manutenção/Liberar admin-only; `_alternarManutencao`+BtnGuard). Deploy @231. | Smoke-test browser: (a) trocar modo lista→agenda→diagrama → toolbar admin sempre visível; (b) "Manutenção de Espaço" → select espaço → confirmar → mapa cor warning; (c) "CCBJ Fechado" → modal bloqueio; (d) form reserva: sala+data+hora → itens carregam; chip vermelho bloqueia salvar |
| 2026-05-24 | Fase 10 | **Alertas, TaskHub, Reuniões, Balcão e Auditoria Visual** entregues: `alertas_engine.gs` REESCRITO (persistência MASTER.AlertasLog 12 colunas, listarAtivos, contarNaoLidos, marcarLido/Resolver, verificarTodosAutomaticos 17 subs, 25+ tipos, deduplicação). `alertas_controller.gs` NOVO (6 controllers RBAC). `taskhub_controller.gs` NOVO (minha_caixa agrega tarefas+encaminhamentos+demandas+aprovações+alertas, meu_time carga por pessoa, produtividade concluídas+taxaNoPrazo+mediaHoras). `reuniao_repository.gs`+`reuniao_engine.gs`+`reuniao_controller.gs` NOVOS (FSM reunião 4 estados + FSM ata 3 estados, encaminhamentos→tarefas automáticas, listarEncaminhamentosPendentes cross-reunião). `balcao_repository.gs`+`balcao_engine.gs`+`balcao_controller.gs` NOVOS (FSM 7 estados, SLA_POR_TIPO, versões entregas, comentários, metricas). `auditoria_controller.gs` NOVO (listar+rollback superadmin+detectarSuspeitos). `setup.gs` fase10_prepararIndice(). `index.html` expandido: badge alertas + painel deslizante, 4 views (reunioes/taskhub/balcao/auditoria), 5 GAS namespaces (38 bindings), 5 JS modules (AlertasUI/ReunioesUI/TaskHubUI/BalcaoUI/AuditoriaVisualUI), CSS Fase 10, menu taskhub+balcao+auditoria, Router entries. Auditoria CLAUDE.md 100% verde (prompt null-check, GAS.*, CSS, FsmGuardian, modais opacos, BtnGuard). Deploy @151. | fase10_prepararIndice() no GAS Editor → smoke-test browser (badge alertas, TaskHub, Reuniões CRUD+ata+encaminhamentos, Balcão CRUD+SLA+versões, Auditoria+rollback) → Fase 11 |
| 2026-05-23 | Fase 9 | **Multi-Tenancy e Painel Admin** entregues: `fase9_migrarOrgId()` (stamp orgId em 31 JSONs, idempotente) + `fase9_validarIsolamento()` + `fase9_prepararIndice()`. `config_org.json` bloco `features` com 18 flags. `SistemaConfigService.getFeatureFlag/setFeatureFlag/getFeatureFlagsCatalogo`. `OrgRegistryService` (orgs_registry.json + MASTER.Orgs; checarProvisionamento 8 itens). `admin_controller.gs`: 6 novos controllers (listarFeatureFlags, setFeatureFlag, checarProvisionamento, ctrl_orgs_*). `wizard_controller.gs` CRIADO (7 controllers, retoma passo pendente). `wizard_setup.html` CRIADO (wizard SPA 6 passos, stepper, BtnGuard). `router.gs`: rota `?secao=wizard_setup`. `index.html`: GAS.orgs (3 bindings) + GAS.admin +3; tab Features (toggles por grupo); tab Provisionamento (checklist+barra+link wizard); view `#view-painel-orgs` (superadmin); `FeatureFlagsUI` + `PainelOrgsUI` modules; menu item "Painel de Orgs". Auditoria CLAUDE.md 100% verde. Deploy @140. | fase9_prepararIndice() no GAS Editor → smoke-test (Features tab, Wizard `?secao=wizard_setup`, Painel Orgs, F12 zero erros) → Fase 10 |
| 2026-05-23 | Fase 8 | **Agentes, Acervo, Voluntários e Parcerias** entregues: `AgenteCulturalRepository/Engine/Controller` (FSM rascunho→ativo↔suspenso→descredenciado, auto-cadastro portal, rider técnico, histórico de vínculos, MASTER.AgentesCulturais). `AcervoRepository/Engine/Controller` (upload Drive por Ação, status LGPD 4 estados, checklist evidências, exportação ZIP, ACOES.Acervo). `VoluntarioRepository/Engine/Controller` (FSM voluntário+alocação, convite email, registro horas, certificado ao concluir, MASTER.Voluntarios). `ParceriaRepository/Engine/Controller` (FSM 5 estados, vínculos com Ações, entregas, avaliação ao encerrar, ACOES.Parcerias). `portal_agente.html` (auto-cadastro público: 12 áreas, rider, disponibilidade, LGPD). 18 novos eventos em events_constants.gs. setup.gs: SCHEMA_ABAS+4 novas abas, fase8_prepararIndice(). index.html: 4 GAS namespaces (38 bindings), seção MEMÓRIA no sidebar, views+modais+UIs AgentesUI/AcervoUI/VoluntariosUI/ParceriasUI. Auditoria CLAUDE.md 100% verde. Deploy @138. | fase8_prepararIndice() no GAS Editor → smoke-test browser (Agentes+portal+Acervo+Voluntários+Parcerias) → Fase 9 |
| 2026-05-23 | Fase 7 | **Portal Externo + PublicoEngine + ExportacaoEngine** entregues: `ConsentimentoService` (LGPD), `PublicoRepository` (inscrições/presenças/pesquisas/certificados JSON + índice PUBLICO.*), `PublicoEngine` (FSM 6 estados, lista espera automática, NPS, dados CODIP), `publico_controller.gs` (ctrl_publico_* autenticado), `portal_controller.gs` (ctrl_portal_* público, rate limiting), `exportacao_engine.gs` (CODIP 28 campos CSV+JSON, SALIC XML, SNIIC anual, CSV genérico). Portais HTML: TODOs substituídos por google.script.run reais (agenda, inscrição, cessão de pauta, status de pauta). index.html: GAS.publico+GAS.exportacao namespaces, view-publico (4 tabs), PublicoUI completo, rota sidebar 'publico'. Deploy @136. | `fase7_publico_prepararIndice()` no GAS Editor → smoke-test browser (portais + view Público) → Fase 8 |
| 2026-05-23 | Fix bugs espaços | 3 bugs corrigidos: (1) `numeroPlanta` perdido no `salvarEspaco` — adicionado ao registro backend + form admin + coleta de dados + label fallback em `_renderMapa` e `_renderCustomSpaces`; (2) Espaços "perdidos" no mapa config — `_renderMapa` agora tem try/catch por espaço + validação de coords (isFinite) + renderização de marcador vermelho clicável em posição fallback para coords inválidas; (3) Exclusão de espaços — `excluirEspaco()` adicionado em `config_admin_service.gs` + `ctrl_admin_excluirEspaco` + `GAS.admin.excluirEspaco` binding + botão Excluir na listagem + `reativarEspaco()` bônus. Deploy @122. | Fase 6 — RECE + Eventos |
| 2026-06-03 | Auditoria sistêmica datas pt-BR | **CAR-05 + SIS-14 encerrado + timezone via config** (Deploy @452): varredura completa dos 153 arquivos GAS + frontend — único ponto remanescente com data ISO em output de UI era `carregarCarros()` na aba Aprovações > Veículo (`index.html:13084`); corrigido para `escaparHtml(fmtDataPtBR(rc.data)\|\|'—')`. Bônus: `ia_service.gs:69,306,389` e `mapa_controller.gs:99,160,164` substituíam `'America/Fortaleza'` hardcoded por `getOrgConfig().timezone` — agora seguem config da org. SIS-14 encerrado definitivamente. | Verificar no browser: Aprovações > Veículo → data deve aparecer DD/MM/AAAA |
| 2026-06-03 | s17 Fase 63 | **ESC-10 + ADM-04 + ADM-11 + ADM-10 (confirm) + escuta_pulse/reserva_engine fix** (Deploy @490): ESC-10 — empty state "Alertas" substituído por card explicativo com ícone, propósito, instrução Gestão e botão "Ir para Gestão →". ADM-04 — aba "Banco de Dados" oculta para não-SuperAdmin em `aoAbrir()` + guard em `abrirTab`. ADM-11 — wizard blank page corrigido: `irPara()` caps `num` em 7 (causa: `_calcularPassoAtual` retorna `checks.length+1=9` para provisionamento 100%, mas só existem passos 1–7). ADM-10 CONFIRMADO CORRIGIDO (código s16 auditado). `escuta_pulse.gs` + `reserva_engine.gs` migraram de `ConfigService` para `SistemaConfigService`. | Próximo: ESC-12 (guia contextual Escuta) → ESC-15 (Nova Pesquisa expandida) |
| 2026-06-03 | s17 Fase 62 | **ESC-07+11+13+16 + FIN-07+13** (Deploy @480): ESC-07 — 7 `btn-secundario` Escuta → `btn-ghost`. ESC-11 — `carregarPulseDash()`: `d.mediaPorDimensao` (inexistente) → `d.indicadores`; `NOMES_DIM` dict; `entry.media` para valor numérico. ESC-13 — subtítulo "UWES · JDC · CVF · NR-1" → "Bem-estar, engajamento e clima organizacional". ESC-16 — FALSO POSITIVO (código `(id?'Editar':'Nova') + ' Pesquisa'` já correto). FIN-07 — label "Valor em aberto" → "Total Previsto Ativo". FIN-13 — `_fmt(v)` → `Number(v\|\|0)` para exibir "R$ 0,00" em vez de "—". | Próximo: próximos bugs DS/arquiteturais abertos |
| 2026-06-03 | s17 Fases 60+61 | **ACV-05+ACV-10 + CHV-04+CHV-05** (Deploy @476): ACV-05 — bloco filtros Acervo migrado de `style` inline para `class="filter-bar"`, busca para `form-control`, botão Atualizar para `btn-ghost`. ACV-10 — 7 campos do modal "Adicionar ao Acervo" com `form-label`+`form-control` — zero inline restante. CHV-04 — `chv-sala` de `<input type="text">` para `<select class="form-control">` com `_popularEspacoChv()` (boot.espacos). CHV-05 — `chv-nome-resp` de `<input type="text">` para `<select class="form-control">` via `_carregarSelectUsuariosHelper`; pré-seleciona `boot.usuarioEmail`; `salvar()` extrai email (value) e nome (selectedIndex.text) → `{responsavel, nomeResponsavel}`. | Próximo: próximos bugs DS abertos no roteiro |
| 2026-06-03 | s17 Fase 57 | **ACO-12+ACO-17 + RECE-15** (Deploy @466): ACO-12 — `class="input"` → `class="form-control"` nos 9 campos do modal Nova/Editar Ação (inputs, selects, textareas). ACO-17 — `<label>` → `<label class="form-label">` nos 9 labels do mesmo modal — DS unificado. RECE-15 — filtro `type="month"` do RECE envolto em `<label>` com ícone `calendar_month` — contexto visual resolve o "---------- de ----" do mês vazio. | Próximo: bugs DS abertos (BAL-02, EMP-03, CHV-06) |
| 2026-06-03 | s17 Fase 56 | **ESC-08** (Deploy @460): seção "Meu Perfil Analítico" completamente removida da aba Escuta Livre — HTML (div com formulário demográfico), JS (`_carregarFormPerfil`, `salvarPerfil`, chamada em `_carregarAbaLivre`), GAS namespace (`GAS.escuta.perfilObter`/`perfilSalvar`), export `salvarPerfil` em `EscutaUI`. Backend `ctrl_escuta_perfil_*` mantido (dead code inofensivo). Dados demográficos aguardam ESC-09 (tela "Meu Perfil" editável). | Próximo: ESC-09 ou próximo bug 🔴 do roteiro |
| 2026-06-03 | s17 Fase 55 | **ACO-27 + ACV-06 + ACO-11** (Deploy @458): ACO-27 — `_PROX_STATUS` em `AcoesUI` migrado para `btn-primary`/`btn-secondary` em todos os 8 botões de transição (eram `btn-success`, `btn-error`, `btn-warning`). ACV-06+ACO-11 — 7 views com `h2.view-titulo` migradas para `h1.view-title`: Ações, Agentes, Acervo, Voluntários, Parcerias, Estratégia, Escuta; `p.view-subtitulo` → `p.view-subtitle` em Ações. CSS `.view-title` estendido com `display:flex;align-items:center;gap:8px` + `.view-title .ms { color: var(--color-primary) }`. Padrão DS agora homogêneo em todos os módulos. | Próximo: Fase 56 — ESC-08 (remover MEU PERFIL ANALÍTICO da Escuta Livre) |
| 2026-06-03 | s17 Fases 53+54 | **SIS-03/04/05 + ACO-28** (Deploy @456): (53) CSS aliases — `.btn-primary,.btn-primario`; `.btn-secondary,.btn-secundario`; `.tab-btn.active,.tab-btn.ativa`; `.page-title,.view-title`; `.page-subtitle,.view-subtitle`. REU-08 FALSO POSITIVO. BAL-06 JÁ CORRIGIDO. (54) ACO-28 — modal de encerramento ao Concluir ação: campos público atingido, realizações, observações, comprovações (chips); backend `acao_engine.gs` + `acoes_controller.gs` aceitam param `encerramento`. | Auditoria DS + ESC-08 |
| 2026-06-03 | Auditoria sistêmica datas pt-BR | **CAR-05 + SIS-14 encerrado + timezone via config** (Deploy @452): varredura completa dos 153 arquivos GAS + frontend — único ponto remanescente com data ISO em output de UI era `carregarCarros()` na aba Aprovações > Veículo (`index.html:13084`); corrigido para `escaparHtml(fmtDataPtBR(rc.data)\|\|'—')`. Bônus: `ia_service.gs:69,306,389` e `mapa_controller.gs:99,160,164` substituíam `'America/Fortaleza'` hardcoded por `getOrgConfig().timezone` — agora seguem config da org. SIS-14 encerrado definitivamente. | Verificar no browser: Aprovações > Veículo → data deve aparecer DD/MM/AAAA |
| 2026-06-03 | Refactor hardcodes | **Remoção de todos os hardcodes de horário do sistema + reestruturação Admin/Infraestrutura** (Deploy @446): (1) `reserva_engine.gs`: `assertHorarioFuncionamento` usa `ConfigService.getReservaHorario()` — ESP-16 corrigido. (2) `escuta_pulse.gs`: `_getTurnosNumericos()` lê `ConfigService.getTurnos()` em runtime — PUL-04 definitivo. (3) `ia_service.gs`: prompt e horários de sugestão derivados dos turnos/expediente configurados. (4) `index.html`: abas "Turnos" e "Config.Sistema" removidas do Admin; aba "Identidade Visual" adicionada; Infraestrutura → Horários integra Expediente + Turnos (list + Novo Turno); CCBJ Fechado: select populado via GAS; `AdminConfigTabsUI`/`ExpedienteUI` removidos. (5) `mapa_acao_editor.html`, `mapa_ui.html`, `wizard_setup.html`: inputs sem value hardcoded. ADM-08 + ESP-16 + ESP-16b CORRIGIDOS. | Auditoria: testar Infraestrutura → Horários (expediente + turnos); verificar reserva fora do horário configurado → erro com hora correta |
| 2026-05-29 | Fase B Mapa | **Novos objetos Som/Luz/AV/Logística + seções colapsáveis**: `shared/mapa_acao_editor.html` — 36 categorias (era 12); `_iconeCategoria` +24 ícones SVG; `_SECOES` 7 seções com abertaDefault; `_paletteSecState` por sessão; `_renderPaletteObjetos` com headers colapsáveis; `_toggleSecao`. Deploy @294. | Fase C — Avatares de equipe + avatar customizado |
| 2026-05-29 | Fase A Mapa | **Bug drag+layer+fullscreen+download+palette+cinza**: drag SVG nativo (matrixTransform); `_activeLayerId`; fullscreen+fallback; download SVG/PNG/imprimir; palette sem quadrados; espaços cinza em layer oculta; +Novo espaço. Deploy @291. | Fase B |
| 2026-05-23 | Mapa de Evento | Ferramenta de desenho de mapa de evento dentro do painel da Ação. Múltiplos mapas por ação (um por local de execução). Cada mapa tem camadas (layers) nomeadas, coloridas e configuráveis. **Backend**: `mapa_acao_repository.gs` (mapaAcoes.json), `mapa_acao_engine.gs` (salvar, criarDeEspacos — importa espaços posicionados do mapa CCBJ, excluir, reservarEspacoOriginal — cria Reserva vinculada ao acaoId), `mapa_acao_controller.gs` (ctrl_mapa_acao_listar/obter/salvar/excluir/criar_de_espacos/reservar_espaco + RBAC). **Frontend**: `shared/mapa_acao_editor.html` (MapaAcaoEditorUI: canvas SVG zoom/pan, palette de espaços + 12 categorias de objetos com ícones SVG inline, sidebar de layers toggle/criar/editar/excluir, legenda visual no canvas, painel de propriedades do elemento selecionado, drag-and-drop para mover e resize, modal de reserva do espaço original). `index.html`: aba "Mapa do Evento" no painel da ação (lazy-load ao clicar), MapaAcaoUI (lista de locais/cards, modal novo local, abre editor), GAS.acoes.mapaAcao namespace, include shared/mapa_acao_editor. Deploy @102. `fase1_mapaAcao_prepararIndice()` disponível. | fase1_mapaAcao_prepararIndice() no GAS Editor → smoke-test browser (criar local, adicionar camada, arrastar objeto, salvar, recarregar) → Fase 6 |
| 2026-05-23 | Correções Admin | **6 bugs críticos corrigidos** na view Administração: (1) `desativarEspaco` — onclick `JSON.stringify` sem `.replace(/"/g,"'")` quebrava o botão "Sim, desativar"; (2–4) mesma falha em `excluirSetor`, `excluirTurno`, `excluirCategoriaItem`; (5) `getSetores()` e `getTurnos()` lendo de `config_org.json` mas gravando em `setores_config.json`/`turnos_config.json` — fix: ler das fontes primárias com fallback; (6) `ctrl_admin_obterConfigExpediente` usando `getOrgConfig()` (PropertiesService) em vez de `readJSON('config_org.json')` — horários nunca persistiam. **3 melhorias UX**: (A) Expediente & Identidade Visual unificados em card com sub-abas (`AdminConfigTabsUI`); (B) `toggleModulo` agora reconstrói o menu lateral imediatamente — módulos inativos somem para usuários normais, ficam visíveis (com badge "inativo") para superadmin; (C) modais de confirmação (excluir/desativar) redesenhados com ícone, header colorido e botão ✕. Deploy @108. | Smoke-test: excluir setor/turno/categoria → confirmar que sumiu da lista; salvar expediente → recarregar → valores persistidos; desativar módulo → menu atualizado imediatamente → Fase 6 |
| 2026-06-08 | UX PCCS+Equipe | **PCCS chevron+busca rápida; Equipe email vinculado+cargos A-Z** (Deploy @695): PCCS — cabeçalho de cada plano clicável com chevron `expand_more` (colapsa/expande body via `_pccsToggleBody`; `event.stopPropagation()` no btn editar). Campo `<input type="text" id="pccs-busca-{id}">` acima da tabela; `_pccsFiltrarCargos` filtra linhas por `data-cargo-nome` e oculta `data-area-header` quando sem filhos visíveis. Equipe — `<input type="email" id="rh-pf-email">` → `<select>` populado via `_carregarSelectUsuariosHelper` (lista `ctrl_admin_listarUsuariosAtivos`; pré-seleciona email ao editar). Dropdown de cargos ordenado com `localeCompare('pt-BR')` antes do render. | Smoke-test: PCCS → clicar cabeçalho colapsa/expande; busca "Diretor" filtra; Equipe → Novo Colaborador → email mostra usuários do sistema; cargos em ordem A-Z |
| 2026-06-06 | s29 Firebase + URL routing | **Firebase Hosting + URL por módulo** (Deploy @599 GAS · Firebase deploy automático): `public/index.html` — página de redirect com design do sistema (gradiente roxo, Inter+Material Symbols, ícone museum, barra progresso accent, spinner, redirect 2,5s via JS preservando `?secao=`). `.github/workflows/firebase-hosting-merge.yml` — deploy automático em push na `main` (channelId live, secret `FIREBASE_SERVICE_ACCOUNT_CCBJ_SISTEMADEGESTAO`). Router: `_pushUrl(id)` com `google.script.history` (primeira nav = `replace`, demais = `push`); `setChangeHandler` para Voltar/Avançar; `_getSecaoUrl()` restaura módulo ao recarregar. `.firebase/` no `.gitignore`. | Próximos bugs auditoria: SIDEBAR-04, FIN-19, FIN-20, CON-09 |
| 2026-05-22 | Fase 4.5 | Cadastros Base + Gaps Críticos V1→V2: config_org.json (tiposOcorrencia/Afastamento), config_admin_service.gs (schema espaço completo: tipoEspaco/responsaveisPorTurno/itensFixos), admin_controller.gs CRIADO (ctrl_admin_*/ctrl_solicitacoes_*), modulos_registry_service.gs CRIADO (engine ausente referenciado em 6 arquivos), pccs_repository.gs CRIADO (PCCS→Cargos→Tabela salarial + ctrl_pccs_*), setup.gs (seeds: 8 espaços+PCCS+6 categorias), solicitacao_reserva_repository.gs+engine.gs CRIADOS (workflow SOL-xxx), reserva_engine.gs (validação sala contra catálogo SAL-xxx), almoxarifado_engine.gs (itensFixos por sala), contratos_engine.gs+financeiro_controller.gs (memória de cálculo de rubricas + versionamento), acesso_service.gs (ctrl_acesso_listarTodos/editarPapel), boot_service.gs (tiposAfastamento/Ocorrencia no bootstrap), index.html (ContratosDetailUI com grid memória+12 meses+histórico; cargo select; tipos dinâmicos; GAS.admin/acesso/rh/solicitacoes completo). Deploy @32. | setup_espacos_iniciais() + setup_pccs_inicial() no GAS Editor → smoke-test browser (campos select validados, ContratosDetailUI, painel aprovações) → Fase 5 |

---

## 🚀 Deploy — OBRIGATÓRIO ao final de cada fase

> **Regra absoluta**: ao encerrar qualquer fase ou processo de desenvolvimento, executar:

```bash
cd gas
clasp push
clasp deploy --deploymentId "AKfycbzVKQ8fEMBZquOytumFLsb3dIx3DuIZh1cFYe4ywFCoMUXSFewuhZCpy-V8fjLkbe_j" \
             --description "Fase X.Y — descrição"
```

**URL de produção** (testar após cada deploy):
```
https://script.google.com/a/macros/idm.org.br/s/AKfycbzVKQ8fEMBZquOytumFLsb3dIx3DuIZh1cFYe4ywFCoMUXSFewuhZCpy-V8fjLkbe_j/exec
```

> ⚠️ Usar **sempre o mesmo `deploymentId`** para manter o link de produção estável.
> Nunca criar um novo deployment sem motivo — isso mudaria a URL que os usuários conhecem.

---

## Referências Rápidas

| O que procurar | Onde fica |
|----------------|-----------|
| **URL de produção** | `https://script.google.com/a/macros/idm.org.br/s/AKfycbzVKQ8fEMBZquOytumFLsb3dIx3DuIZh1cFYe4ywFCoMUXSFewuhZCpy-V8fjLkbe_j/exec` |
| **DeploymentId fixo** | `AKfycbzVKQ8fEMBZquOytumFLsb3dIx3DuIZh1cFYe4ywFCoMUXSFewuhZCpy-V8fjLkbe_j` |
| Configuração organizacional | `gas/src/core/config.gs` + `gas/src/core/data/config_org.json` |
| Config facade unificado | `gas/src/core/config_service.gs` |
| FSM de qualquer domínio | `gas/src/core/services/fsm_guardian.gs` |
| Sistema de eventos | `gas/src/core/event_bus_backend.gs` |
| Tipos de eventos | `gas/src/core/events_constants.gs` |
| Persistência JSON | `gas/src/core/data_layer.gs` |
| Persistência Sheets | `gas/src/core/services/data_gateway.gs` |
| Interface de repositório | `gas/src/repositories/i_repository.gs` |
| Integração entre domínios | `gas/src/engines/integracao_orquestrador.gs` |
| Handlers de eventos | `gas/src/engines/event_handler_registry.gs` |
| Roteador HTTP | `gas/src/controllers/router.gs` |
| Documento de domínio | `docs/architecture/domain_model.md` |
| Plano de reconstrução original | `../Saas-ERP-cultural-main/docs/01_architecture/plano_reconstrucao.md` |
