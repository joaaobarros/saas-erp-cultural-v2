/**
 * @file escuta_repository.gs
 * @layer repository
 * @description Repositório canônico de Escuta Institucional (clima organizacional).
 *   Fontes de verdade:
 *   - pesquisas_clima.json      — pesquisas formais (rodadas periódicas)
 *   - respostas_clima.json      — respostas às pesquisas formais
 *   - escuta_espontanea.json    — relatos livres com sentimento (canal contínuo)
 *   - escuta_saturacao.json     — controle de saturação por dimensão/período
 *   - pulse_respostas.json      — respostas ao sistema pulse (1 pergunta/vez)
 *   Índice Sheet: EQUIPES.Escuta (resumo por rodada para BI/CODIP).
 * @depends data_layer.gs, i_repository.gs, data_gateway.gs
 */

var EscutaRepository = (function() {
  var ARQUIVO_PESQUISAS   = 'pesquisas_clima.json';
  var ARQUIVO_RESPOSTAS   = 'respostas_clima.json';
  var ARQUIVO_ESPONTANEA  = 'escuta_espontanea.json';
  var ARQUIVO_SATURACAO   = 'escuta_saturacao.json';
  var ARQUIVO_PULSE       = 'pulse_respostas.json';
  var ARQUIVO_PERFIS      = 'perfis_analiticos.json';
  var ARQUIVO_ALERTAS     = 'escuta_alertas.json';
  var ABA_ESCUTA          = 'EQUIPES.Escuta';
  var HEADERS_ESCUTA      = [
    'pesquisaId','rodada','dataInicio','dataFim','totalConvidados','totalRespostas',
    'indiceConfianca','mediaPonderada','dimensaoMaisBaixa','dimensaoMaisAlta',
    'alertasGerados','orgId','criadoEm'
  ];

  // ─── Pesquisas formais ──────────────────────────────────────────────────────

  function listarPesquisas(orgId) {
    var lista = lerJSON(ARQUIVO_PESQUISAS);
    if (!Array.isArray(lista)) return [];
    return lista.filter(function(p) { return p.orgId === orgId; });
  }

  function buscarPesquisa(orgId, pesquisaId) {
    return listarPesquisas(orgId).find(function(p) { return p.id === pesquisaId; }) || null;
  }

  function salvarPesquisa(orgId, dados) {
    var id    = dados.id || gerarId('ESCUTA');
    var agora = new Date().toISOString();
    modifyJSON(ARQUIVO_PESQUISAS, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = lista.findIndex(function(p) { return p.id === id; });
      var registro = Object.assign({ id: id, orgId: orgId, criadoEm: agora },
                                   dados, { id: id, orgId: orgId, atualizadoEm: agora });
      if (idx >= 0) lista[idx] = registro;
      else lista.push(registro);
      return lista;
    });
    return id;
  }

  function excluirPesquisa(orgId, pesquisaId) {
    modifyJSON(ARQUIVO_PESQUISAS, function(lista) {
      if (!Array.isArray(lista)) return lista;
      return lista.filter(function(p) { return !(p.orgId === orgId && p.id === pesquisaId); });
    });
  }

  function metricasPesquisas(orgId) {
    var lista     = listarPesquisas(orgId);
    var ativas    = lista.filter(function(p) { return p.status === 'ativa'; }).length;
    var concluidas = lista.filter(function(p) { return p.status === 'encerrada'; }).length;
    var total     = lista.length;
    return { total: total, ativas: ativas, concluidas: concluidas, rascunhos: total - ativas - concluidas };
  }

  // ─── Respostas às pesquisas formais ─────────────────────────────────────────

  function listarRespostas(orgId, pesquisaId) {
    var lista = lerJSON(ARQUIVO_RESPOSTAS);
    if (!Array.isArray(lista)) return [];
    return lista.filter(function(r) {
      return r.orgId === orgId && r.pesquisaId === pesquisaId;
    });
  }

  function listarRespostasPorColaborador(orgId, colaboradorId) {
    var lista = lerJSON(ARQUIVO_RESPOSTAS);
    if (!Array.isArray(lista)) return [];
    return lista.filter(function(r) {
      return r.orgId === orgId && r.colaboradorId === colaboradorId;
    });
  }

  function salvarResposta(orgId, dados) {
    var id    = dados.id || gerarId('RESP');
    var agora = new Date().toISOString();
    modifyJSON(ARQUIVO_RESPOSTAS, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = lista.findIndex(function(r) { return r.id === id; });
      var registro = Object.assign({}, dados, { id: id, orgId: orgId, respondidoEm: agora });
      if (idx >= 0) lista[idx] = registro;
      else lista.push(registro);
      return lista;
    });
    return id;
  }

  function contarRespostasPorPesquisa(orgId, pesquisaId) {
    return listarRespostas(orgId, pesquisaId).length;
  }

  // ─── [B2] Escuta espontânea ──────────────────────────────────────────────────

  /**
   * Lista relatos espontâneos de um período (YYYY-MM).
   * @param {string} orgId
   * @param {string} [periodo] — YYYY-MM; default: mês atual
   */
  function listarEspontanea(orgId, periodo) {
    var lista = lerJSON(ARQUIVO_ESPONTANEA);
    if (!Array.isArray(lista)) return [];
    return lista.filter(function(e) {
      return e.orgId === orgId && (!periodo || (e.periodo || '').startsWith(periodo));
    });
  }

  /**
   * Salva relato espontâneo.
   */
  function salvarEspontanea(orgId, dados) {
    var id    = dados.id || gerarId('ESP');
    var agora = new Date().toISOString();
    modifyJSON(ARQUIVO_ESPONTANEA, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var registro = Object.assign({}, dados, { id: id, orgId: orgId, criadoEm: agora });
      lista.push(registro);
      return lista;
    });
    return id;
  }

  // ─── [B4] Saturação por dimensão ────────────────────────────────────────────

  /**
   * Lista registros de saturação para um orgId e período.
   * @param {string} orgId
   * @param {string} periodo — YYYY-MM
   */
  function listarSaturacao(orgId, periodo) {
    var lista = lerJSON(ARQUIVO_SATURACAO);
    if (!Array.isArray(lista)) return [];
    return lista.filter(function(s) {
      return s.orgId === orgId && s.periodo === periodo;
    });
  }

  /**
   * Incrementa contador de respostas de uma dimensão no período.
   * Usa modifyJSON que já tem LockService internamente.
   * @param {string} orgId
   * @param {string} dimensaoId
   * @param {string} periodo — YYYY-MM
   */
  function incrementarSaturacao(orgId, dimensaoId, periodo) {
    modifyJSON(ARQUIVO_SATURACAO, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = lista.findIndex(function(s) {
        return s.orgId === orgId && s.dimensao === dimensaoId && s.periodo === periodo;
      });
      if (idx >= 0) {
        lista[idx].coletados = (lista[idx].coletados || 0) + 1;
      } else {
        lista.push({ orgId: orgId, dimensao: dimensaoId, periodo: periodo, coletados: 1 });
      }
      return lista;
    });
  }

  // ─── [E2] Pulse: respostas individuais ──────────────────────────────────────

  /**
   * Lista respostas do sistema pulse (1 pergunta/vez).
   * @param {string} orgId
   * @param {string} [periodo] — YYYY-MM para filtrar pelo período
   */
  function listarPulseRespostas(orgId, periodo) {
    var lista = lerJSON(ARQUIVO_PULSE);
    if (!Array.isArray(lista)) return [];
    return lista.filter(function(r) {
      return r.orgId === orgId && (!periodo || r.periodo === periodo);
    });
  }

  /**
   * Salva resposta pulse (pergunta individual).
   */
  function salvarPulseResposta(orgId, dados) {
    var id    = dados.id || gerarId('PLS');
    var agora = new Date().toISOString();
    modifyJSON(ARQUIVO_PULSE, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var registro = Object.assign({}, dados, { id: id, orgId: orgId, criadoEm: agora });
      lista.push(registro);
      return lista;
    });
    return id;
  }

  // ─── [F20] Perfil analítico do colaborador ─────────────────────────────────

  /**
   * Salva ou atualiza o perfil analítico (gênero, raça, vínculo, nível, etc.)
   * de um colaborador. Chave única: (orgId, email).
   */
  function salvarPerfilAnalitico(orgId, email, dados) {
    modifyJSON(ARQUIVO_PERFIS, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = lista.findIndex(function(p) { return p.orgId === orgId && p.email === email; });
      var reg = Object.assign({}, dados, { orgId: orgId, email: email, atualizadoEm: new Date().toISOString() });
      if (idx >= 0) lista[idx] = reg;
      else lista.push(reg);
      return lista;
    });
  }

  /**
   * Obtém o perfil analítico de um colaborador específico.
   */
  function obterPerfilAnalitico(orgId, email) {
    var lista = lerJSON(ARQUIVO_PERFIS);
    if (!Array.isArray(lista)) return null;
    return lista.find(function(p) { return p.orgId === orgId && p.email === email; }) || null;
  }

  /**
   * Lista todos os perfis analíticos de uma organização.
   */
  function listarPerfis(orgId) {
    var lista = lerJSON(ARQUIVO_PERFIS);
    if (!Array.isArray(lista)) return [];
    return lista.filter(function(p) { return p.orgId === orgId; });
  }

  // ─── [F20] Alertas persistidos ─────────────────────────────────────────────

  /**
   * Lista alertas (ativos e resolvidos) de uma organização.
   * @param {string} orgId
   * @param {boolean} [apenasAtivos] — se true, filtra só status='ativo'
   */
  function listarAlertas(orgId, apenasAtivos) {
    var lista = lerJSON(ARQUIVO_ALERTAS);
    if (!Array.isArray(lista)) return [];
    return lista.filter(function(a) {
      return a.orgId === orgId && (!apenasAtivos || a.status === 'ativo');
    });
  }

  /**
   * Salva um array de novos alertas (idempotente por chave orgId+tipo+periodo).
   */
  function salvarAlertas(orgId, novos) {
    if (!novos || !novos.length) return;
    modifyJSON(ARQUIVO_ALERTAS, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      novos.forEach(function(a) {
        var chave = a.tipo + '|' + (a.periodo || '');
        var existe = lista.some(function(x) { return x.orgId === orgId && (x.tipo + '|' + (x.periodo||'')) === chave; });
        if (!existe) lista.push(Object.assign({ id: gerarId('ALT'), orgId: orgId, status: 'ativo', criadoEm: new Date().toISOString() }, a));
      });
      return lista;
    });
  }

  /**
   * Resolve (fecha) um alerta específico.
   */
  function resolverAlerta(orgId, alertaId, acao, email) {
    modifyJSON(ARQUIVO_ALERTAS, function(lista) {
      if (!Array.isArray(lista)) return lista;
      var idx = lista.findIndex(function(a) { return a.orgId === orgId && a.id === alertaId; });
      if (idx >= 0) {
        lista[idx].status    = 'resolvido';
        lista[idx].acao      = acao || '';
        lista[idx].resolvidoPor  = email;
        lista[idx].resolvidoEm   = new Date().toISOString();
      }
      return lista;
    });
  }

  // ─── Índice Sheet ────────────────────────────────────────────────────────────

  function prepararIndice() {
    DataGateway.garantirAba(ABA_ESCUTA, HEADERS_ESCUTA);
    return { ok: true };
  }

  function sincronizarSheet(orgId, pesquisaId, resumo) {
    var aba = DataGateway.obterAba(ABA_ESCUTA);
    if (!aba) return;
    var dados = aba.getDataRange().getValues();
    for (var i = dados.length - 1; i >= 1; i--) {
      if (dados[i][0] === pesquisaId) aba.deleteRow(i + 1);
    }
    var pesquisa = buscarPesquisa(orgId, pesquisaId);
    if (!pesquisa) return;
    aba.appendRow([
      pesquisaId,
      pesquisa.rodada || '',
      pesquisa.dataInicio || '',
      pesquisa.dataFim    || '',
      resumo.totalConvidados   || 0,
      resumo.totalRespostas    || 0,
      resumo.indiceConfianca   || 0,
      resumo.mediaPonderada    || 0,
      resumo.dimensaoMaisBaixa || '',
      resumo.dimensaoMaisAlta  || '',
      resumo.alertasGerados    || 0,
      orgId,
      new Date().toISOString()
    ]);
  }

  return {
    // Pesquisas formais
    listarPesquisas:              listarPesquisas,
    buscarPesquisa:               buscarPesquisa,
    salvarPesquisa:               salvarPesquisa,
    excluirPesquisa:              excluirPesquisa,
    metricasPesquisas:            metricasPesquisas,
    // Respostas formais
    listarRespostas:              listarRespostas,
    listarRespostasPorColaborador: listarRespostasPorColaborador,
    salvarResposta:               salvarResposta,
    contarRespostasPorPesquisa:   contarRespostasPorPesquisa,
    // [B2] Escuta espontânea
    listarEspontanea:             listarEspontanea,
    salvarEspontanea:             salvarEspontanea,
    // [B4] Saturação
    listarSaturacao:              listarSaturacao,
    incrementarSaturacao:         incrementarSaturacao,
    // [E2] Pulse
    listarPulseRespostas:         listarPulseRespostas,
    salvarPulseResposta:          salvarPulseResposta,
    // [F20] Perfil analítico
    salvarPerfilAnalitico:        salvarPerfilAnalitico,
    obterPerfilAnalitico:         obterPerfilAnalitico,
    listarPerfis:                 listarPerfis,
    // [F20] Alertas
    listarAlertas:                listarAlertas,
    salvarAlertas:                salvarAlertas,
    resolverAlerta:               resolverAlerta,
    // Sheet
    prepararIndice:               prepararIndice,
    sincronizarSheet:             sincronizarSheet
  };
})();
