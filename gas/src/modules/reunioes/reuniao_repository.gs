/**
 * @file modules/reunioes/reuniao_repository.gs
 * @layer modules/reunioes
 * @description Repositório canônico de Reuniões Institucionais — Fase 10.
 *
 * Fonte de verdade: reunioes.json
 * Índice auxiliar:  REUNIOES.Reunioes (Sheet)
 *
 * Schema de uma Reunião:
 *   id, orgId, titulo, tipo (ordinaria|extraordinaria|comite|workshop),
 *   local, dataHora, duracao (min), convocadoPor,
 *   pauta[{ id, texto, discussao, decisao }] (itens legados em string puro são
 *     normalizados para este formato na leitura pelo frontend — sem migração),
 *   presentes[], ausentesJustificados[], ausentesNaoJustificados[],
 *   status (rascunho|agendada|em_andamento|encerrada|cancelada),
 *   ata { rascunho, textoFinal, aprovadaEm, aprovadaPor, versoes[] },
 *   encaminhamentos[{ id, texto, responsavel, prazo, status, concluidoEm, pautaId }]
 *     (pautaId null = encaminhamento geral, não vinculado a um item específico),
 *   links[{ label, url }], anexos[{ nome, url, mimeType }],
 *   acaoVinculadaId, googleEventId (sincronizado ao Calendar a partir de "agendada"),
 *   criadoEm, atualizadoEm, criadoPor, versao
 *
 * @depends core/data_layer.gs, core/services/data_gateway.gs, core/utils.gs
 */

var ReuniaoRepository = (function () {

  var _ARQUIVO    = 'reunioes.json';
  var _SHEET_KEY  = 'SHEET_ID_REUNIOES';
  var _ABA        = 'Reunioes';
  var _HEADERS    = [
    'ID', 'OrgId', 'Titulo', 'Tipo', 'Status', 'Local', 'DataHora',
    'ConvocadoPor', 'AcaoVinculada', 'NumPresentes', 'NumEncaminhamentos',
    'CriadoEm', 'AtualizadoEm', 'CriadoPor', 'Versao'
  ];

  function _orgIdPadrao(orgId) { return orgId || getOrgConfig().orgId; }

  function _garantirCabecalho() {
    try {
      var aba = _getSheet(_SHEET_KEY, _ABA);
      var atual = aba.getLastRow() > 0
        ? aba.getRange(1, 1, 1, Math.max(aba.getLastColumn(), _HEADERS.length)).getValues()[0]
        : [];
      var vazio = atual.every(function(v) { return !v; });
      if (vazio || String(atual[0] || '').trim() !== 'ID') {
        aba.getRange(1, 1, 1, _HEADERS.length).setValues([_HEADERS]);
        aba.setFrozenRows(1);
      }
    } catch(e) { Logger.warn('reuniao_repository', '_garantirCabecalho', e.message); }
  }

  function _serializar(r) {
    return [
      r.id || '', r.orgId || '', r.titulo || '', r.tipo || '', r.status || '',
      r.local || '', r.dataHora || '', r.convocadoPor || '', r.acaoVinculadaId || '',
      (r.presentes || []).length, (r.encaminhamentos || []).length,
      r.criadoEm || '', r.atualizadoEm || '', r.criadoPor || '', r.versao || 1
    ];
  }

  function _indexar(orgId, reuniao) {
    try {
      _garantirCabecalho();
      var linha = _serializar(reuniao);
      var ok = DataGateway.atualizarLinhaPorColuna(_SHEET_KEY, _ABA, 0, reuniao.id, linha);
      if (!ok) DataGateway.salvarLinha(_SHEET_KEY, _ABA, linha);
    } catch(e) { Logger.warn('reuniao_repository', '_indexar', e.message); }
  }

  var _base = criarJsonRepository(_ARQUIVO, _indexar);

  // ─── LEITURA ──────────────────────────────────────────────────────────────

  function listar(orgId, filtros) {
    orgId = _orgIdPadrao(orgId);
    filtros = filtros || {};
    var lista = _base.listar(orgId, filtros);
    if (filtros.acaoVinculadaId) {
      lista = lista.filter(function(r) { return r.acaoVinculadaId === filtros.acaoVinculadaId; });
    }
    if (filtros.convocadoPor) {
      lista = lista.filter(function(r) { return r.convocadoPor === filtros.convocadoPor; });
    }
    if (filtros.responsavelEncaminhamento) {
      lista = lista.filter(function(r) {
        return (r.encaminhamentos || []).some(function(e) {
          return e.responsavel === filtros.responsavelEncaminhamento;
        });
      });
    }
    return lista.sort(function(a, b) {
      return new Date(b.dataHora || b.criadoEm) - new Date(a.dataHora || a.criadoEm);
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
    var total  = lista.length;
    var encPendentes = 0;
    var encVencidos  = 0;
    lista.forEach(function(r) {
      (r.encaminhamentos || []).forEach(function(e) {
        if (e.status !== 'concluido' && e.status !== 'cancelado') {
          encPendentes++;
          if (e.prazo && new Date(e.prazo) < hoje) encVencidos++;
        }
      });
    });
    var porStatus = {};
    lista.forEach(function(r) { porStatus[r.status] = (porStatus[r.status] || 0) + 1; });
    return {
      total:              total,
      rascunho:           porStatus.rascunho   || 0,
      agendada:           porStatus.agendada   || 0,
      em_andamento:       porStatus.em_andamento || 0,
      encerrada:          porStatus.encerrada  || 0,
      cancelada:          porStatus.cancelada  || 0,
      encaminhamentosPendentes: encPendentes,
      encaminhamentosVencidos:  encVencidos
    };
  }

  function listarEncaminhamentosPendentes(orgId, responsavel) {
    orgId = _orgIdPadrao(orgId);
    var lista  = _base.listar(orgId, {});
    var hoje   = new Date();
    var resultado = [];
    lista.forEach(function(r) {
      (r.encaminhamentos || []).forEach(function(e) {
        if (e.status === 'concluido' || e.status === 'cancelado') return;
        if (responsavel && e.responsavel !== responsavel) return;
        resultado.push({
          encId:         e.id,
          texto:         e.texto,
          responsavel:   e.responsavel,
          prazo:         e.prazo,
          vencido:       e.prazo ? new Date(e.prazo) < hoje : false,
          reuniaoId:     r.id,
          reuniaoTitulo: r.titulo,
          reuniaoData:   r.dataHora,
          status:        e.status || 'pendente'
        });
      });
    });
    return resultado.sort(function(a, b) {
      if (a.vencido !== b.vencido) return a.vencido ? -1 : 1;
      if (!a.prazo) return 1;
      if (!b.prazo) return -1;
      return new Date(a.prazo) - new Date(b.prazo);
    });
  }

  // ─── ESCRITA ──────────────────────────────────────────────────────────────

  function proximoId(orgId) {
    orgId = _orgIdPadrao(orgId);
    var lista = _base.listar(orgId, {});
    var nums  = lista.map(function(r) {
      var m = String(r.id || '').match(/RUN-(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    });
    var proximo = (nums.length > 0 ? Math.max.apply(null, nums) : 0) + 1;
    return 'RUN-' + String(proximo).padStart(3, '0');
  }

  function salvar(orgId, reuniao, email) {
    orgId = _orgIdPadrao(orgId);
    var agora_ = agora();
    if (!reuniao.id) {
      reuniao.id        = proximoId(orgId);
      reuniao.orgId     = orgId;
      reuniao.criadoEm  = agora_;
      reuniao.criadoPor = email || '';
      reuniao.versao    = 1;
    } else {
      reuniao.versao = (reuniao.versao || 1) + 1;
    }
    reuniao.atualizadoEm = agora_;
    if (!reuniao.encaminhamentos) reuniao.encaminhamentos = [];
    if (!reuniao.presentes)       reuniao.presentes = [];
    if (!reuniao.pauta)           reuniao.pauta = [];
    if (!reuniao.ata)             reuniao.ata = { rascunho: '', textoFinal: '', versoes: [] };
    _base.salvar(orgId, reuniao);
    return reuniao;
  }

  function atualizarEncaminhamento(orgId, reuniaoId, encId, dados, email) {
    orgId = _orgIdPadrao(orgId);
    var reuniao = _base.buscarPorId(orgId, reuniaoId);
    if (!reuniao) throw new Error('Reunião não encontrada: ' + reuniaoId);

    var enc = (reuniao.encaminhamentos || []).find(function(e) { return e.id === encId; });
    if (!enc) throw new Error('Encaminhamento não encontrado: ' + encId);

    Object.assign(enc, dados);
    if (dados.status === 'concluido' && !enc.concluidoEm) {
      enc.concluidoEm    = agora();
      enc.concluidoPor   = email || '';
    }
    reuniao.atualizadoEm = agora();
    reuniao.versao       = (reuniao.versao || 1) + 1;
    _base.salvar(orgId, reuniao);
    return reuniao;
  }

  function excluir(orgId, id, email) {
    orgId = _orgIdPadrao(orgId);
    return _base.excluir(orgId, id);
  }

  function prepararIndice() {
    try {
      _garantirCabecalho();
      Logger.info('reuniao_repository', 'prepararIndice', 'Índice REUNIOES.Reunioes OK.');
      return { ok: true };
    } catch(e) {
      Logger.error('reuniao_repository', 'prepararIndice', e.message);
      return { ok: false, erro: e.message };
    }
  }

  return {
    listar:                      listar,
    buscarPorId:                 buscarPorId,
    metricas:                    metricas,
    listarEncaminhamentosPendentes: listarEncaminhamentosPendentes,
    proximoId:                   proximoId,
    salvar:                      salvar,
    atualizarEncaminhamento:     atualizarEncaminhamento,
    excluir:                     excluir,
    prepararIndice:              prepararIndice
  };

})();
