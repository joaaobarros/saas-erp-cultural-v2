/**
 * @file modules/comunicacao/balcao_repository.gs
 * @layer modules/comunicacao
 * @description Repositório do Balcão de Demandas de Comunicação — Fase 10.
 *
 * Fonte de verdade: balcao_demandas.json
 * Índice auxiliar:  COMUNICACAO.Demandas (Sheet)
 *
 * Schema de uma Demanda:
 *   id, orgId, tipo (design|foto|video|texto|social|impresso|outro),
 *   titulo, descricao, urgencia (baixa|media|alta|critica),
 *   demandante, demandanteSetor, executor,
 *   status (rascunho|submetida|em_analise|em_execucao|revisao|aprovada|concluida|cancelada),
 *   slaHoras (calculado a partir do tipo), dataSubmissao, dataLimite, dataConclusao,
 *   acaoVinculadaId, arquivos[],
 *   versoes[{ id, url, nota, enviadoEm, enviadoPor, statusRevisao, motivoRejeicao }],
 *   comentarios[{ id, texto, autor, criadoEm, tipo (demandante|executor|admin) }],
 *   notaAvaliacao, motivoCancelamento,
 *   criadoEm, atualizadoEm, criadoPor, versao
 *
 * @depends core/data_layer.gs, core/services/data_gateway.gs, core/utils.gs
 */

var BalcaoRepository = (function () {

  var _ARQUIVO   = 'balcao_demandas.json';
  var _SHEET_KEY = 'SHEET_ID_COMUNICACAO';
  var _ABA       = 'Demandas';
  var _HEADERS   = [
    'ID', 'OrgId', 'Tipo', 'Titulo', 'Status', 'Urgencia',
    'Demandante', 'DemandanteSetor', 'Executor',
    'SlaHoras', 'DataSubmissao', 'DataLimite', 'NumVersoes', 'NumComentarios',
    'AcaoVinculada', 'CriadoEm', 'AtualizadoEm', 'CriadoPor', 'Versao'
  ];

  // SLA padrão por tipo (horas úteis → convertido para horas corridas)
  var SLA_POR_TIPO = {
    design:    72,   // 3 dias úteis
    foto:      48,   // 2 dias úteis
    video:     120,  // 5 dias úteis
    texto:     24,   // 1 dia útil
    social:    24,
    impresso:  72,
    outro:     72
  };

  function _orgIdPadrao(orgId) { return orgId || getOrgConfig().orgId; }

  function _garantirCabecalho() {
    try {
      var aba = _getSheet(_SHEET_KEY, _ABA);
      var atual = aba.getLastRow() > 0
        ? aba.getRange(1, 1, 1, Math.max(aba.getLastColumn(), _HEADERS.length)).getValues()[0]
        : [];
      if (atual.every(function(v){ return !v; }) || String(atual[0]||'').trim() !== 'ID') {
        aba.getRange(1, 1, 1, _HEADERS.length).setValues([_HEADERS]);
        aba.setFrozenRows(1);
      }
    } catch(e) { Logger.warn('balcao_repository', '_garantirCabecalho', e.message); }
  }

  function _serializar(d) {
    return [
      d.id || '', d.orgId || '', d.tipo || '', d.titulo || '', d.status || '', d.urgencia || '',
      d.demandante || '', d.demandanteSetor || '', d.executor || '',
      d.slaHoras || 72, d.dataSubmissao || '', d.dataLimite || '',
      (d.versoes || []).length, (d.comentarios || []).length,
      d.acaoVinculadaId || '', d.criadoEm || '', d.atualizadoEm || '',
      d.criadoPor || '', d.versao || 1
    ];
  }

  function _indexar(orgId, demanda) {
    try {
      _garantirCabecalho();
      var linha = _serializar(demanda);
      var ok = DataGateway.atualizarLinhaPorColuna(_SHEET_KEY, _ABA, 0, demanda.id, linha);
      if (!ok) DataGateway.salvarLinha(_SHEET_KEY, _ABA, linha);
    } catch(e) { Logger.warn('balcao_repository', '_indexar', e.message); }
  }

  var _base = criarJsonRepository(_ARQUIVO, _indexar);

  // ─── LEITURA ──────────────────────────────────────────────────────────────

  function listar(orgId, filtros) {
    orgId = _orgIdPadrao(orgId);
    filtros = filtros || {};
    var lista = _base.listar(orgId, filtros);
    if (filtros.demandante) lista = lista.filter(function(d) { return d.demandante === filtros.demandante; });
    if (filtros.executor)   lista = lista.filter(function(d) { return d.executor === filtros.executor; });
    if (filtros.tipo)       lista = lista.filter(function(d) { return d.tipo === filtros.tipo; });
    if (filtros.urgencia)   lista = lista.filter(function(d) { return d.urgencia === filtros.urgencia; });
    if (filtros.somenteAtrasadas) {
      var hoje = new Date();
      lista = lista.filter(function(d) {
        return d.dataLimite && new Date(d.dataLimite) < hoje &&
               d.status !== 'concluida' && d.status !== 'cancelada';
      });
    }
    return lista.sort(function(a, b) {
      return new Date(b.criadoEm) - new Date(a.criadoEm);
    });
  }

  function buscarPorId(orgId, id) {
    if (id === undefined) { id = orgId; orgId = _orgIdPadrao(); }
    return _base.buscarPorId(_orgIdPadrao(orgId), id);
  }

  function metricas(orgId) {
    orgId = _orgIdPadrao(orgId);
    var lista  = _base.listar(orgId, {});
    var hoje   = new Date();
    var porStatus = {};
    var porTipo   = {};
    var atrasadas = 0;
    var totalConcluidas = 0;
    var totalNoPrazo    = 0;
    var somaRodadas     = 0;
    lista.forEach(function(d) {
      porStatus[d.status] = (porStatus[d.status] || 0) + 1;
      porTipo[d.tipo]     = (porTipo[d.tipo] || 0) + 1;
      if (d.dataLimite && new Date(d.dataLimite) < hoje &&
          d.status !== 'concluida' && d.status !== 'cancelada') atrasadas++;
      if (d.status === 'concluida') {
        totalConcluidas++;
        if (!d.dataLimite || new Date(d.dataConclusao || hoje) <= new Date(d.dataLimite)) totalNoPrazo++;
        somaRodadas += (d.versoes || []).length;
      }
    });
    return {
      total:          lista.length,
      rascunho:       porStatus.rascunho      || 0,
      submetida:      porStatus.submetida     || 0,
      em_analise:     porStatus.em_analise    || 0,
      em_execucao:    porStatus.em_execucao   || 0,
      revisao:        porStatus.revisao       || 0,
      aprovada:       porStatus.aprovada      || 0,
      concluida:      porStatus.concluida     || 0,
      cancelada:      porStatus.cancelada     || 0,
      atrasadas:      atrasadas,
      taxaNoPrazo:    totalConcluidas > 0 ? Math.round(100 * totalNoPrazo / totalConcluidas) : 0,
      mediaRodadas:   totalConcluidas > 0 ? (somaRodadas / totalConcluidas).toFixed(1) : '0',
      porTipo:        porTipo
    };
  }

  // ─── ESCRITA ──────────────────────────────────────────────────────────────

  function proximoId(orgId) {
    orgId = _orgIdPadrao(orgId);
    var lista = _base.listar(orgId, {});
    var nums  = lista.map(function(d) {
      var m = String(d.id || '').match(/DEM-(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    });
    var prox = (nums.length > 0 ? Math.max.apply(null, nums) : 0) + 1;
    return 'DEM-' + String(prox).padStart(4, '0');
  }

  function calcularSla(tipo, urgencia) {
    var horas = SLA_POR_TIPO[tipo] || 72;
    if (urgencia === 'critica') horas = Math.round(horas / 4);
    else if (urgencia === 'alta') horas = Math.round(horas / 2);
    return horas;
  }

  function salvar(orgId, demanda, email) {
    orgId = _orgIdPadrao(orgId);
    var agora_ = agora();
    if (!demanda.id) {
      demanda.id           = proximoId(orgId);
      demanda.orgId        = orgId;
      demanda.criadoEm     = agora_;
      demanda.criadoPor    = email || '';
      demanda.versao       = 1;
      demanda.versoes      = demanda.versoes   || [];
      demanda.comentarios  = demanda.comentarios || [];
      demanda.arquivos     = demanda.arquivos  || [];
      demanda.slaHoras     = calcularSla(demanda.tipo, demanda.urgencia);
    } else {
      demanda.versao = (demanda.versao || 1) + 1;
    }
    demanda.atualizadoEm = agora_;
    _base.salvar(orgId, demanda);
    return demanda;
  }

  function adicionarComentario(orgId, id, texto, autor, tipoComentario) {
    orgId = _orgIdPadrao(orgId);
    var demanda = _base.buscarPorId(orgId, id);
    if (!demanda) throw new Error('Demanda não encontrada: ' + id);
    demanda.comentarios = demanda.comentarios || [];
    demanda.comentarios.push({
      id:       gerarId('com'),
      texto:    texto,
      autor:    autor,
      criadoEm: agora(),
      tipo:     tipoComentario || 'demandante'
    });
    demanda.atualizadoEm = agora();
    demanda.versao = (demanda.versao || 1) + 1;
    _base.salvar(orgId, demanda);
    return demanda;
  }

  function adicionarVersao(orgId, id, versaoObj, email) {
    orgId = _orgIdPadrao(orgId);
    var demanda = _base.buscarPorId(orgId, id);
    if (!demanda) throw new Error('Demanda não encontrada: ' + id);
    demanda.versoes = demanda.versoes || [];
    versaoObj.id        = gerarId('ver');
    versaoObj.enviadoEm = agora();
    versaoObj.enviadoPor = email || '';
    versaoObj.versaoNum  = demanda.versoes.length + 1;
    versaoObj.statusRevisao = versaoObj.statusRevisao || 'pendente';
    demanda.versoes.push(versaoObj);
    demanda.atualizadoEm = agora();
    demanda.versao = (demanda.versao || 1) + 1;
    _base.salvar(orgId, demanda);
    return demanda;
  }

  function excluir(orgId, id) {
    return _base.excluir(_orgIdPadrao(orgId), id);
  }

  function prepararIndice() {
    try {
      _garantirCabecalho();
      Logger.info('balcao_repository', 'prepararIndice', 'Índice COMUNICACAO.Demandas OK.');
      return { ok: true };
    } catch(e) {
      Logger.error('balcao_repository', 'prepararIndice', e.message);
      return { ok: false, erro: e.message };
    }
  }

  return {
    listar:             listar,
    buscarPorId:        buscarPorId,
    metricas:           metricas,
    proximoId:          proximoId,
    calcularSla:        calcularSla,
    salvar:             salvar,
    adicionarComentario: adicionarComentario,
    adicionarVersao:    adicionarVersao,
    excluir:            excluir,
    prepararIndice:     prepararIndice,
    SLA_POR_TIPO:       SLA_POR_TIPO
  };

})();
