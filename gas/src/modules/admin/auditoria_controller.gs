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
 * Fonte: AuditoriaStore (auditoria_operacional.json) — fonte canônica de
 * eventos persistidos por AuditoriaService.registrar() em todo o sistema.
 */
function ctrl_auditoria_listar(params) {
  return GasResponse.wrap(function() {
    var email  = getEmailSessao();
    var acesso = AcessoService.verificar(email);
    if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado');
    var papel = acesso.registro && acesso.registro.papel;
    if (!['admin','superadmin'].includes(papel)) throw new Error('Sem permissão');

    var filtros = params || {};

    try {
      var eventos = AuditoriaStore.consultar({
        modulo:   filtros.modulo   || undefined,
        usuario:  filtros.email    || undefined,
        tipo:     filtros.evento   || undefined,
        de:       filtros.desde    ? new Date(filtros.desde).toISOString()                      : undefined,
        ate:      filtros.ate      ? new Date(filtros.ate + 'T23:59:59.999Z').toISOString()      : undefined,
        limite:   filtros.limite   ? Math.min(filtros.limite, 500) : 100
      });

      var registros = eventos.map(function(ev) {
        return {
          id:        ev.id,
          evento:    ev.tipo,
          modulo:    ev.modulo,
          acao:      ev.acao,
          email:     ev.usuario,
          criadoEm:  ev.timestamp,
          categoria: ev.categoria,
          resultado: ev.resultado,
          mensagem:  ev.mensagem,
          before:    ev.antes  || null,
          after:     ev.depois || null
        };
      });

      return { registros: registros, total: registros.length };
    } catch(e) {
      Logger.error('auditoria_controller', 'ctrl_auditoria_listar', e.message);
      return { registros: [], total: 0, erro: e.message };
    }
  }, 'ctrl_auditoria_listar');
}

/**
 * Desfaz uma operação usando o snapshot `before`/`after` do log de auditoria.
 * Suporta: criação (exclui), edição (restaura before), exclusão (recria).
 * Só é possível para módulos com persistência canônica em JSON (ver MODULO_JSON_CANONICO)
 * e para eventos cujo emissor passou antes/depois ao chamar AuditoriaService.registrar().
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

    var ev = AuditoriaStore.obterPorId(registroId);
    if (!ev) throw new Error('Registro de auditoria não encontrado: ' + registroId);
    if (!ev.antes && !ev.depois) throw new Error('Registro sem dados antes/depois — rollback impossível.');

    var resultado = _executarRollback(ev.modulo, ev.tipo, ev.antes, ev.depois, email);

    AuditoriaService.registrar('ROLLBACK_EXECUTADO', 'auditoria', {
      registroId: registroId,
      evento:     ev.tipo,
      modulo:     ev.modulo,
      usuario:    email
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

    var janela    = (params && params.janelaMin) || 5; // minutos
    var limiteOps = (params && params.limiteOps) || 20;

    try {
      var agora_ = new Date();
      var desde  = new Date(agora_.getTime() - janela * 60000).toISOString();
      var eventos = AuditoriaStore.consultar({ de: desde, limite: 5000 });

      var contagemPorEmail = {};
      eventos.forEach(function(ev) {
        if (!ev.usuario) return;
        contagemPorEmail[ev.usuario] = (contagemPorEmail[ev.usuario] || 0) + 1;
      });

      var suspeitos = Object.keys(contagemPorEmail)
        .filter(function(e) { return contagemPorEmail[e] >= limiteOps; })
        .map(function(e) { return { email: e, operacoes: contagemPorEmail[e], janela: janela + ' min' }; });

      if (suspeitos.length > 0) {
        AlertasEngine.emitir('AUDITORIA_FALHA',
          suspeitos.length + ' usuário(s) com comportamento suspeito (>' + limiteOps + ' ops em ' + janela + 'min).',
          { orgId: getOrgConfig().orgId, entidade: 'sistema', entidadeId: 'auditoria_suspeita' });
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

// Mapeamento de módulo → arquivo JSON canônico.
// Inclui apenas módulos cuja fonte de verdade é comprovadamente um arquivo JSON
// (via criarJsonRepository ou readJSON/modifyJSON direto) — módulos cuja fonte
// real é uma planilha (Sheets via DataGateway, ex: reservas, ativos, estoque)
// NÃO entram aqui: escrever no JSON não afetaria o dado real e daria falso
// sucesso. Para esses, o rollback automático não é suportado.
var MODULO_JSON_CANONICO = {
  tarefas:      'tarefas.json',
  pessoas:      'colaboradores.json',
  reunioes:     'reunioes.json',
  comunicacao:  'balcao_demandas.json',
  acoes:        'acoes.json',
  contratos:    'contratos.json',
  agentes:      'agentes_culturais.json',
  acervo:       'acervo.json',
  voluntarios:  'voluntarios.json',
  parcerias:    'parcerias.json'
};

function _executarRollback(modulo, evento, before, after, email) {
  var arquivo = MODULO_JSON_CANONICO[modulo];
  if (!arquivo) {
    return 'módulo "' + modulo + '" não suportado para rollback automático ' +
      '(persistência em planilha ou sem mapeamento canônico) — reverter manualmente.';
  }

  var eventoUpper = String(evento || '').toUpperCase();

  // Criação: excluir o registro (usar after.id)
  if (eventoUpper.indexOf('_CRIADO') !== -1 || eventoUpper.indexOf('_CRIADA') !== -1 || eventoUpper.indexOf('CRIADO') === 0) {
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
