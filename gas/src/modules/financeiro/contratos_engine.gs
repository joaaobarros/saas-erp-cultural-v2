/**
 * @file modules/financeiro/contratos_engine.gs
 * @layer modules/financeiro
 * @description Engine de Contratos — regras de negócio, FSM e cálculos financeiros.
 *
 * FSM de status do contrato:
 *   Ativo     → Suspenso, Encerrado
 *   Suspenso  → Ativo, Encerrado
 *   Encerrado → [] (terminal)
 *
 * RESPONSABILIDADES DESTE ENGINE:
 *   - Validações de negócio (vigência, valores, obrigações)
 *   - Transições de status via FSM com auditoria e evento
 *   - Cálculo de totais, saldos e métricas financeiras
 *   - Orquestração de metas, rubricas e indicadores
 *   - Emissão de eventos para IntegracaoOrquestrador
 *
 * @depends modules/financeiro/contrato_repository.gs (ContratoRepository)
 *          core/services/fsm_guardian.gs (FsmGuardian)
 *          core/services/auditoria_service.gs (AuditoriaService)
 *          core/event_bus_backend.gs (SystemEvents)
 *          core/events_constants.gs (SystemEventTypes)
 *          core/config.gs (getOrgConfig)
 *          core/logger.gs (Logger)
 */

// ── Constantes de domínio ─────────────────────────────────────────────

var STATUS_CONTRATO = Object.freeze({
  ATIVO:     'Ativo',
  SUSPENSO:  'Suspenso',
  ENCERRADO: 'Encerrado'
});

var TIPO_META = Object.freeze({
  CONTRATUAL:     'CONTRATUAL',
  COMPLEMENTAR:   'COMPLEMENTAR',
  INSTITUCIONAL:  'INSTITUCIONAL'
});

var TIPO_INDICADOR = Object.freeze({
  CONTRATUAL:   'CONTRATUAL',
  GERENCIAL:    'GERENCIAL',
  COMPLEMENTAR: 'COMPLEMENTAR'
});

// ── FSM ───────────────────────────────────────────────────────────────

var _TRANSICOES_CONTRATO = {
  'Ativo':     ['Suspenso', 'Encerrado'],
  'Suspenso':  ['Ativo', 'Encerrado'],
  'Encerrado': []
};

if (typeof FsmGuardian !== 'undefined') {
  try { FsmGuardian.registrar('contratos', _TRANSICOES_CONTRATO); } catch (_) {}
}

// ── Engine ────────────────────────────────────────────────────────────

var ContratosEngine = (function () {

  function _orgId() { return getOrgConfig().orgId; }

  function _audit(evento, dados) {
    try {
      if (typeof AuditoriaService !== 'undefined')
        AuditoriaService.registrar(evento, 'financeiro', dados || {});
    } catch (_) {}
  }

  function _emit(tipo, payload) {
    try {
      if (typeof SystemEvents !== 'undefined')
        SystemEvents.emit(tipo, payload || {});
    } catch (_) {}
  }

  // ──────────────────────────────────────────────────────────────────
  // CONTRATOS
  // ──────────────────────────────────────────────────────────────────

  /**
   * Lista contratos com filtros opcionais.
   */
  function listar(filtros, orgId) {
    return ContratoRepository.listar(orgId || _orgId(), filtros || {});
  }

  /**
   * Busca contrato por ID.
   */
  function buscarPorId(id, orgId) {
    return ContratoRepository.buscarPorId(orgId || _orgId(), id);
  }

  /**
   * Cria ou atualiza contrato.
   * Valida campos obrigatórios e emite evento.
   */
  function salvar(dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    dados = dados || {};

    if (!dados.nome || !String(dados.nome).trim())
      throw new Error('Nome do contrato é obrigatório.');
    if (!dados.fonteRecurso || !String(dados.fonteRecurso).trim())
      throw new Error('Fonte de recurso é obrigatória.');

    // Garantir status válido
    var statusValidos = Object.values(STATUS_CONTRATO);
    if (dados.status && statusValidos.indexOf(dados.status) === -1) {
      throw new Error('Status inválido: ' + dados.status + '. Válidos: ' + statusValidos.join(', '));
    }

    var resultado = ContratoRepository.salvar(orgId, dados);
    var evTipo = resultado.isNovo
      ? (SystemEventTypes ? SystemEventTypes.CONTRACT_CREATED   : 'CONTRACT_CREATED')
      : (SystemEventTypes ? SystemEventTypes.CONTRACT_UPDATED   : 'CONTRACT_UPDATED');

    _audit(resultado.isNovo ? 'CONTRATO_CRIADO' : 'CONTRATO_ATUALIZADO', {
      id: resultado.id, nome: dados.nome, operador: emailOperador || ''
    });
    _emit(evTipo, { entidade: 'contrato', entidadeId: resultado.id, usuario: emailOperador || '', orgId: orgId });

    return resultado.id;
  }

  /**
   * Remove contrato. Apenas se estiver encerrado (para preservar histórico).
   */
  function excluir(id, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var c = ContratoRepository.buscarPorId(orgId, id);
    if (!c) throw new Error('Contrato não encontrado: ' + id);
    if (c.status !== STATUS_CONTRATO.ENCERRADO)
      throw new Error('Contrato deve estar ENCERRADO antes de ser excluído. Status atual: ' + c.status);

    var ok = ContratoRepository.excluir(orgId, id);
    _audit('CONTRATO_EXCLUIDO', { id: id, operador: emailOperador || '' });
    return { ok: ok };
  }

  /**
   * Aplica transição de status via FSM.
   * @param {string} id
   * @param {string} novoStatus — um dos STATUS_CONTRATO.*
   * @param {string} emailOperador
   */
  function aplicarTransicao(id, novoStatus, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var c = ContratoRepository.buscarPorId(orgId, id);
    if (!c) throw new Error('Contrato não encontrado: ' + id);

    var atual = c.status || STATUS_CONTRATO.ATIVO;

    if (typeof FsmGuardian !== 'undefined') {
      FsmGuardian.validarTransicao('contratos', atual, novoStatus);
    } else {
      var perm = _TRANSICOES_CONTRATO[atual] || [];
      if (perm.indexOf(novoStatus) === -1)
        throw new Error('Transição inválida: "' + atual + '" → "' + novoStatus + '". Permitidas: [' + perm.join(', ') + ']');
    }

    c.status = novoStatus;
    ContratoRepository.salvar(orgId, c);

    var evTipo = novoStatus === STATUS_CONTRATO.ENCERRADO
      ? (SystemEventTypes ? SystemEventTypes.CONTRACT_EXPIRED  : 'CONTRACT_EXPIRED')
      : (SystemEventTypes ? SystemEventTypes.CONTRACT_UPDATED  : 'CONTRACT_UPDATED');

    _audit('CONTRATO_STATUS_' + novoStatus.toUpperCase(), {
      id: id, de: atual, para: novoStatus, operador: emailOperador || ''
    });
    _emit(evTipo, { entidade: 'contrato', entidadeId: id, de: atual, para: novoStatus, usuario: emailOperador || '', orgId: orgId });

    return { id: id, statusAnterior: atual, statusNovo: novoStatus };
  }

  /**
   * Retorna métricas financeiras da coleção de contratos.
   */
  function obterMetricas(orgId) {
    orgId = orgId || _orgId();
    var lista = ContratoRepository.listar(orgId);
    var totalAtivos      = 0;
    var valorAtivos      = 0;
    var valorTotal       = 0;
    var porFonte         = {};

    lista.forEach(function (c) {
      valorTotal += c.valorTotal || 0;
      if (c.status === STATUS_CONTRATO.ATIVO) {
        totalAtivos++;
        valorAtivos += c.valorTotal || 0;
      }
      var f = c.fonteRecurso || 'Não informado';
      porFonte[f] = (porFonte[f] || 0) + (c.valorTotal || 0);
    });

    return {
      total:        lista.length,
      ativos:       totalAtivos,
      suspensos:    lista.filter(function (c) { return c.status === STATUS_CONTRATO.SUSPENSO; }).length,
      encerrados:   lista.filter(function (c) { return c.status === STATUS_CONTRATO.ENCERRADO; }).length,
      valorTotal:   valorTotal,
      valorAtivos:  valorAtivos,
      porFonte:     porFonte,
      geradoEm:     new Date().toISOString()
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // METAS
  // ──────────────────────────────────────────────────────────────────

  function salvarMeta(idContrato, dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!idContrato) throw new Error('idContrato é obrigatório.');
    if (!dados || !dados.titulo) throw new Error('Título da meta é obrigatório.');

    var c = ContratoRepository.buscarPorId(orgId, idContrato);
    if (!c) throw new Error('Contrato não encontrado: ' + idContrato);
    if (c.status === STATUS_CONTRATO.ENCERRADO)
      throw new Error('Não é possível alterar metas de um contrato encerrado.');

    var idMeta = ContratoRepository.adicionarMeta(orgId, idContrato, dados);
    _audit('CONTRATO_META_SALVA', { idContrato: idContrato, idMeta: idMeta, operador: emailOperador || '' });
    return idMeta;
  }

  function excluirMeta(idContrato, idMeta, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var ok = ContratoRepository.removerMeta(orgId, idContrato, idMeta);
    _audit('CONTRATO_META_EXCLUIDA', { idContrato: idContrato, idMeta: idMeta, operador: emailOperador || '' });
    return { ok: ok };
  }

  // ──────────────────────────────────────────────────────────────────
  // RUBRICAS
  // ──────────────────────────────────────────────────────────────────

  function salvarRubrica(idContrato, idMeta, dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!idContrato || !idMeta) throw new Error('idContrato e idMeta são obrigatórios.');
    if (!dados || !dados.nome)  throw new Error('Nome da rubrica é obrigatório.');

    var mem = Array.isArray(dados.memoriaCalculo) ? dados.memoriaCalculo : [];
    if (!mem.length) throw new Error('Memória de cálculo é obrigatória (ao menos 1 item).');

    var idRubrica = ContratoRepository.adicionarRubrica(orgId, idContrato, idMeta, dados);
    _audit('CONTRATO_RUBRICA_SALVA', {
      idContrato: idContrato, idMeta: idMeta, idRubrica: idRubrica, operador: emailOperador || ''
    });
    return idRubrica;
  }

  function excluirRubrica(idContrato, idMeta, idRubrica, emailOperador, orgId) {
    orgId = orgId || _orgId();
    var ok = ContratoRepository.removerRubrica(orgId, idContrato, idMeta, idRubrica);
    _audit('CONTRATO_RUBRICA_EXCLUIDA', {
      idContrato: idContrato, idMeta: idMeta, idRubrica: idRubrica, operador: emailOperador || ''
    });
    return { ok: ok };
  }

  // ──────────────────────────────────────────────────────────────────
  // INDICADORES
  // ──────────────────────────────────────────────────────────────────

  function salvarIndicador(idContrato, idMeta, dados, emailOperador, orgId) {
    orgId = orgId || _orgId();
    if (!idContrato || !idMeta) throw new Error('idContrato e idMeta são obrigatórios.');
    if (!dados || !dados.nome)  throw new Error('Nome do indicador é obrigatório.');

    var idInd = ContratoRepository.adicionarIndicador(orgId, idContrato, idMeta, dados);
    _audit('CONTRATO_INDICADOR_SALVO', {
      idContrato: idContrato, idMeta: idMeta, idIndicador: idInd, operador: emailOperador || ''
    });
    return idInd;
  }

  // ──────────────────────────────────────────────────────────────────
  // ANÁLISE
  // ──────────────────────────────────────────────────────────────────

  /**
   * Retorna resumo analítico de um contrato específico.
   */
  function analisarContrato(id, orgId) {
    orgId = orgId || _orgId();
    var c = ContratoRepository.buscarPorId(orgId, id);
    if (!c) throw new Error('Contrato não encontrado: ' + id);

    var metas = c.metas || [];
    var totalRubricas = 0;
    var totalMetas    = metas.length;
    var valorMetas    = 0;

    metas.forEach(function (m) {
      var rubs = m.rubricas || [];
      totalRubricas += rubs.length;
      var vm = rubs.reduce(function (s, r) { return s + (r.valorTotal || 0); }, 0);
      m.valorMeta = vm;
      valorMetas += vm;
    });

    // Verificar vigência
    var hoje = new Date().toISOString().slice(0, 10);
    var vencido = c.vigenciaFim && c.vigenciaFim < hoje && c.status === STATUS_CONTRATO.ATIVO;

    return {
      id:            c.id,
      nome:          c.nome,
      status:        c.status,
      valorContrato: c.valorTotal || 0,
      valorMetas:    valorMetas,
      divergencia:   Math.abs((c.valorTotal || 0) - valorMetas) > 0.01,
      totalMetas:    totalMetas,
      totalRubricas: totalRubricas,
      vencido:       vencido,
      vigenciaFim:   c.vigenciaFim || '',
      fonteRecurso:  c.fonteRecurso || '',
      geradoEm:      new Date().toISOString()
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // MIGRAÇÃO
  // ──────────────────────────────────────────────────────────────────

  function migrarSheetParaJson(orgId) {
    return ContratoRepository.migrarSheetParaJson(orgId || _orgId());
  }

  // ──────────────────────────────────────────────────────────────────
  // API PÚBLICA
  // ──────────────────────────────────────────────────────────────────

  return {
    // Constantes
    STATUS_CONTRATO: STATUS_CONTRATO,
    TIPO_META:       TIPO_META,
    TIPO_INDICADOR:  TIPO_INDICADOR,

    // Contratos
    listar:            listar,
    buscarPorId:       buscarPorId,
    salvar:            salvar,
    excluir:           excluir,
    aplicarTransicao:  aplicarTransicao,
    obterMetricas:     obterMetricas,
    analisarContrato:  analisarContrato,

    // Metas
    salvarMeta:        salvarMeta,
    excluirMeta:       excluirMeta,

    // Rubricas
    salvarRubrica:     salvarRubrica,
    excluirRubrica:    excluirRubrica,

    // Indicadores
    salvarIndicador:   salvarIndicador,

    // Migração
    migrarSheetParaJson: migrarSheetParaJson
  };

})();
