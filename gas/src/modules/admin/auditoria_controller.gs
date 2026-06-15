/**
 * @file modules/admin/auditoria_controller.gs
 * @layer modules/admin
 * @description Auditoria Visual com Rollback — Fase 10.
 *
 * Permite visualizar o log de auditoria com filtros e desfazer operações
 * usando os snapshots before/after registrados pelo AuditoriaService.
 *
 * RBAC: listar = admin+; rollback = superadmin
 *
 * @depends auditoria_service.gs, acesso_service.gs, gas_response.gs
 */

/**
 * Retorna timeline de eventos de auditoria para uma entidade específica.
 * Usado pelo componente _renderTimeline no frontend (Twenty CRM pattern).
 * @param {string} modulo — módulo de origem (ex: 'acoes', 'contratos')
 * @param {string} entidadeId — ID da entidade
 * @param {number} [limite] — máximo de eventos (default 50)
 */
function ctrl_auditoria_timeline(modulo, entidadeId, limite) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
    if (!entidadeId) throw new Error('entidadeId obrigatório.');

    var eventos = AuditoriaStore.consultar({
      entidadeId: String(entidadeId),
      modulo:     modulo || undefined,
      limite:     parseInt(limite) || 50
    });

    var ICONES = {
      criar: 'add_circle', atualizar: 'edit', excluir: 'delete', concluir: 'check_circle',
      cancelar: 'cancel', aprovar: 'thumb_up', recusar: 'thumb_down', status: 'swap_horiz',
      comentar: 'chat_bubble', vincular: 'link', anexar: 'attach_file'
    };
    var CORES = {
      CRITICO: '#ef4444', OPERACIONAL: '#3b82f6', sucesso: '#10b981', falha: '#ef4444'
    };

    var timeline = eventos.map(function(ev) {
      var icone = ICONES[ev.acao] || 'history';
      var cor   = ev.resultado === 'falha' ? CORES.falha
                : ev.categoria === 'CRITICO' ? CORES.CRITICO
                : CORES.OPERACIONAL;
      return {
        id:        ev.id,
        timestamp: ev.timestamp,
        tipo:      ev.tipo,
        acao:      ev.acao,
        modulo:    ev.modulo,
        usuario:   ev.usuario,
        mensagem:  ev.mensagem,
        resultado: ev.resultado,
        categoria: ev.categoria,
        icone:     icone,
        cor:       cor
      };
    });

    return { timeline: timeline, total: timeline.length };
  }, 'ctrl_auditoria_timeline');
}

/**
 * Lista log de auditoria com filtros.
 */
function ctrl_auditoria_listar(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var papel = acesso.registro && acesso.registro.papel;
    if (!['admin','superadmin'].includes(papel)) throw new Error('Sem permissão');

    var filtros = params || {};
    var orgId   = getOrgConfig().orgId;

    try {
      var props   = PropertiesService.getScriptProperties();
      var sheetId = props.getProperty('SHEET_ID_MASTER');
      if (!sheetId) return { registros: [], total: 0 };

      var ss  = SpreadsheetApp.openById(sheetId);
      var aba = ss.getSheetByName('Auditoria');
      if (!aba || aba.getLastRow() < 2) return { registros: [], total: 0 };

      var linhas = aba.getRange(2, 1, aba.getLastRow() - 1, 10).getValues();
      var registros = [];
      linhas.forEach(function(l) {
        var reg = {
          id:        l[0] || '',
          evento:    l[1] || '',
          modulo:    l[2] || '',
          email:     l[3] || '',
          criadoEm:  l[4] || '',
          orgId:     l[5] || '',
          before:    l[6] ? _tryParse(l[6]) : null,
          after:     l[7] ? _tryParse(l[7]) : null,
          ip:        l[8] || '',
          sessaoId:  l[9] || ''
        };
        if (!reg.id) return;
        if (orgId && reg.orgId && reg.orgId !== orgId) return;
        if (filtros.modulo    && reg.modulo  !== filtros.modulo)  return;
        if (filtros.email     && reg.email   !== filtros.email)   return;
        if (filtros.evento    && reg.evento  !== filtros.evento)  return;
        if (filtros.desde     && new Date(reg.criadoEm) < new Date(filtros.desde)) return;
        if (filtros.ate       && new Date(reg.criadoEm) > new Date(filtros.ate))   return;
        registros.push(reg);
      });

      // Mais recente primeiro; limitar retorno
      registros.sort(function(a, b) { return new Date(b.criadoEm) - new Date(a.criadoEm); });
      var limite = filtros.limite ? Math.min(filtros.limite, 500) : 100;
      return { registros: registros.slice(0, limite), total: registros.length };
    } catch(e) {
      Logger.error('auditoria_controller', 'ctrl_auditoria_listar', e.message);
      return { registros: [], total: 0, erro: e.message };
    }
  }, 'ctrl_auditoria_listar');
}

/**
 * Desfaz uma operação usando o snapshot `before` do log de auditoria.
 * Suporta: criação (exclui), edição (restaura before), exclusão (recria).
 */
function ctrl_auditoria_rollback(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var papel = acesso.registro && acesso.registro.papel;
    if (papel !== 'superadmin') throw new Error('Apenas superadmin pode fazer rollback.');

    var registroId = params && params.registroId;
    if (!registroId) throw new Error('registroId obrigatório');

    var orgId = getOrgConfig().orgId;
    var props = PropertiesService.getScriptProperties();
    var sheetId = props.getProperty('SHEET_ID_MASTER');
    if (!sheetId) throw new Error('Planilha MASTER não encontrada.');

    var ss     = SpreadsheetApp.openById(sheetId);
    var aba    = ss.getSheetByName('Auditoria');
    if (!aba || aba.getLastRow() < 2) throw new Error('Log de auditoria vazio.');

    var ids    = aba.getRange(2, 1, aba.getLastRow() - 1, 1).getValues();
    var numLinha = -1;
    for (var i = 0; i < ids.length; i++) {
      if (ids[i][0] === registroId) { numLinha = i + 2; break; }
    }
    if (numLinha === -1) throw new Error('Registro de auditoria não encontrado: ' + registroId);

    var linha   = aba.getRange(numLinha, 1, 1, 10).getValues()[0];
    var evento  = linha[1];
    var modulo  = linha[2];
    var before  = linha[6] ? _tryParse(linha[6]) : null;
    var after   = linha[7] ? _tryParse(linha[7]) : null;

    if (!before && !after) throw new Error('Registro sem dados before/after — rollback impossível.');

    var resultado = _executarRollback(modulo, evento, before, after, orgId, email);

    AuditoriaService.registrar('ROLLBACK_EXECUTADO', 'auditoria', {
      registroId: registroId,
      evento:     evento,
      modulo:     modulo,
      email:      email
    });

    return { ok: true, mensagem: 'Rollback executado: ' + resultado };
  }, 'ctrl_auditoria_rollback');
}

/**
 * Detecta operações suspeitas (muitas ações em curto intervalo).
 */
function ctrl_auditoria_detectar_suspeitos(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var papel = acesso.registro && acesso.registro.papel;
    if (!['admin','superadmin'].includes(papel)) throw new Error('Sem permissão');

    var orgId     = getOrgConfig().orgId;
    var janela    = (params && params.janelaMin) || 5; // minutos
    var limiteOps = (params && params.limiteOps) || 20;

    try {
      var props   = PropertiesService.getScriptProperties();
      var sheetId = props.getProperty('SHEET_ID_MASTER');
      if (!sheetId) return { suspeitos: [] };

      var ss     = SpreadsheetApp.openById(sheetId);
      var aba    = ss.getSheetByName('Auditoria');
      if (!aba || aba.getLastRow() < 2) return { suspeitos: [] };

      var linhas  = aba.getRange(2, 1, aba.getLastRow() - 1, 6).getValues();
      var agora_  = new Date();
      var desde   = new Date(agora_.getTime() - janela * 60000);
      var contagemPorEmail = {};

      linhas.forEach(function(l) {
        var emailL = l[3];
        var ts     = l[4];
        if (!emailL || !ts) return;
        if (l[5] && l[5] !== orgId) return;
        if (new Date(ts) >= desde) {
          contagemPorEmail[emailL] = (contagemPorEmail[emailL] || 0) + 1;
        }
      });

      var suspeitos = Object.keys(contagemPorEmail)
        .filter(function(e) { return contagemPorEmail[e] >= limiteOps; })
        .map(function(e) { return { email: e, operacoes: contagemPorEmail[e], janela: janela + ' min' }; });

      if (suspeitos.length > 0) {
        AlertasEngine.emitir('AUDITORIA_FALHA',
          suspeitos.length + ' usuário(s) com comportamento suspeito (>' + limiteOps + ' ops em ' + janela + 'min).',
          { orgId: orgId, entidade: 'sistema', entidadeId: 'auditoria_suspeita' });
      }

      return { suspeitos: suspeitos, janela: janela, limite: limiteOps };
    } catch(e) {
      return { suspeitos: [], erro: e.message };
    }
  }, 'ctrl_auditoria_detectar_suspeitos');
}

// ─── Helpers privados ─────────────────────────────────────────────────────────

function _tryParse(str) {
  try { return JSON.parse(str); } catch(e) { return str; }
}

function _executarRollback(modulo, evento, before, after, orgId, email) {
  // Mapeamento de módulo → arquivo JSON canônico
  var MODULO_JSON = {
    tarefas:      'tarefas.json',
    pessoas:      'colaboradores.json',
    reunioes:     'reunioes.json',
    comunicacao:  'balcao_demandas.json',
    acoes:        'acoes.json',
    reservas:     'reservas.json',
    contratos:    'contratos.json',
    agentes:      'agentes_culturais.json',
    acervo:       'acervo.json',
    voluntarios:  'voluntarios.json',
    parcerias:    'parcerias.json'
  };

  var arquivo = MODULO_JSON[modulo];
  if (!arquivo) return 'módulo "' + modulo + '" sem rollback automático.';

  // Criação: excluir o registro (usar after.id)
  if (evento.indexOf('_CRIADO') !== -1 || evento.indexOf('_CRIADA') !== -1) {
    var idAlvo = after && (after.id || after.ID);
    if (!idAlvo) return 'ID não encontrado para exclusão.';
    modifyJSON(arquivo, function(lista) {
      if (!Array.isArray(lista)) return lista;
      return lista.filter(function(r) { return r.id !== idAlvo; });
    });
    return 'Registro ' + idAlvo + ' excluído (rollback de criação).';
  }

  // Edição ou deleção: restaurar estado `before`
  if (before && before.id) {
    modifyJSON(arquivo, function(lista) {
      if (!Array.isArray(lista)) return lista;
      var idx = lista.findIndex ? lista.findIndex(function(r) { return r.id === before.id; })
                                : (function() { for (var i = 0; i < lista.length; i++) { if (lista[i].id === before.id) return i; } return -1; })();
      if (idx === -1) {
        lista.push(before); // era uma deleção — recriar
      } else {
        lista[idx] = Object.assign({}, lista[idx], before,
          { _rollbackEm: agora(), _rollbackPor: email });
      }
      return lista;
    });
    return 'Registro ' + before.id + ' restaurado para estado anterior.';
  }

  return 'Rollback não aplicável para este evento/módulo.';
}
