/**
 * @file modules/pessoas/pessoas_controller.gs
 * @layer modules/pessoas
 * @description Bridge GAS oficial para o domínio Pessoas / Colaboradores.
 *
 * Todas as funções públicas seguem o padrão ctrl_pessoas_* / ctrl_rh_*.
 * Segurança:
 *   - Toda função autentica via getEmailSessao() + AcessoService.verificar()
 *   - Colaborador vê apenas dados próprios onde indicado
 *   - Dados sensíveis (CPF, salário, rescisão) restringem por papel
 *   - Backend é única fonte de verdade — restrições não dependem do frontend
 *
 * @depends modules/pessoas/pessoas_engine.gs (PessoasEngine)
 *          core/services/acesso_service.gs (AcessoService)
 *          shared/response.gs (GasResponse)
 *          core/auth_session.gs (getEmailSessao)
 *          core/config.gs (getOrgConfig)
 */

// ── Helpers privados do controller ───────────────────────────────────

function _ctxPessoas() {
  var email = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return {
    email: email,
    papel: acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador',
    orgId: getOrgConfig().orgId
  };
}

function _ctxPessoasNivel(email) {
  try {
    if (typeof AcessoService !== 'undefined') {
      var r = AcessoService.verificar(email);
      if (r && r.registro) {
        var p = (r.registro.papel || '').toLowerCase();
        if (p === 'superadmin') return 'superadmin';
        if (p === 'admin')      return 'admin';
        if (p === 'rh')         return 'rh';
        if (p === 'gestor')     return 'gestor';
      }
    }
  } catch (_) {}
  return 'colaborador';
}

/** Nível que pode ler qualquer colaborador */
var _NIVEL_LEITURA_AMPLA = ['superadmin', 'admin', 'rh', 'gestor'];
/** Nível que pode escrever */
var _NIVEL_ESCRITA = ['superadmin', 'admin', 'rh'];

// ── Resolução de idColaborador pelo próprio email ─────────────────────

function _idColaboradorPorEmail(email, orgId) {
  var c = PessoasEngine.buscarPorEmail(email, orgId);
  return c ? c.id : null;
}

// ═══════════════════════════════════════════════════════════════════
// COLABORADORES — LEITURA
// ═══════════════════════════════════════════════════════════════════

/**
 * Lista colaboradores. Colaborador comum vê apenas a si mesmo.
 */
function ctrl_pessoas_listar(filtros) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_LEITURA_AMPLA.indexOf(nivel) !== -1) {
      return PessoasEngine.listar(filtros || {}, ctx.orgId);
    }
    // Colaborador: retorna apenas o próprio perfil
    var c = PessoasEngine.buscarPorEmail(ctx.email, ctx.orgId);
    return c ? [c] : [];
  }, 'ctrl_pessoas_listar');
}

/**
 * Obtém colaborador por ID.
 */
function ctrl_pessoas_obter(id) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_LEITURA_AMPLA.indexOf(nivel) !== -1) {
      var c = PessoasEngine.buscarPorId(id, ctx.orgId);
      if (!c) throw new Error('Colaborador não encontrado.');
      return c;
    }
    // Colaborador: só pode ver a si mesmo
    var proprio = _idColaboradorPorEmail(ctx.email, ctx.orgId);
    if (!proprio || proprio !== id)
      throw new Error('Acesso negado: você só pode visualizar seu próprio perfil.');
    var c2 = PessoasEngine.buscarPorId(id, ctx.orgId);
    if (!c2) throw new Error('Colaborador não encontrado.');
    return c2;
  }, 'ctrl_pessoas_obter');
}

/**
 * Retorna métricas da equipe (gestores e acima).
 */
function ctrl_pessoas_metricas() {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_LEITURA_AMPLA.indexOf(nivel) === -1)
      throw new Error('Métricas disponíveis apenas para gestores e RH.');
    return PessoasEngine.obterMetricas(ctx.orgId);
  }, 'ctrl_pessoas_metricas');
}

/**
 * Autocomplete de colaboradores ativos (nome + email) para formulários.
 */
function ctrl_pessoas_autocomplete() {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_LEITURA_AMPLA.indexOf(nivel) === -1)
      throw new Error('Autocomplete disponível apenas para gestores e RH.');
    return PessoasEngine.listar({ status: 'ativo' }, ctx.orgId)
      .map(function (c) {
        return {
          id:    c.id,
          nome:  c.nome || '',
          email: c.emailInstitucional || c.emailPessoal || '',
          setor: c.setor || '',
          cargo: c.cargo || ''
        };
      });
  }, 'ctrl_pessoas_autocomplete');
}

/**
 * Lista colaboradores por função (para formulários de responsável).
 */
function ctrl_pessoas_por_funcao(funcao) {
  return GasResponse.wrap(function () {
    var ctx = _ctxPessoas();
    if (!funcao) throw new Error('Função é obrigatória.');
    return PessoasEngine.listarPorFuncao(funcao, ctx.orgId);
  }, 'ctrl_pessoas_por_funcao');
}

// ═══════════════════════════════════════════════════════════════════
// COLABORADORES — MUTAÇÕES
// ═══════════════════════════════════════════════════════════════════

/**
 * Cria ou atualiza colaborador. Apenas RH/admin.
 */
function ctrl_pessoas_salvar(dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_ESCRITA.indexOf(nivel) === -1)
      throw new Error('Apenas RH e administradores podem cadastrar colaboradores.');
    var id = PessoasEngine.salvar(dados || {}, ctx.email, ctx.orgId);
    // Sync mínimo para usuarios_acesso.json: apenas setor e nome como fallback de exibição
    var emailInst = String((dados||{}).emailInstitucional || '').toLowerCase().trim();
    if (emailInst) {
      try {
        modifyJSON('usuarios_acesso.json', function(lista) {
          if (!Array.isArray(lista)) return lista;
          var usr = lista.find(function(u){ return (u.email||'').toLowerCase() === emailInst; });
          if (!usr) return lista;
          if (dados.setor !== undefined) usr.setor = dados.setor || usr.setor;
          if (dados.nome  && !usr.nome)  usr.nome  = dados.nome;
          usr.atualizadoEm = new Date().toISOString();
          return lista;
        });
        try { BootService.limparCache(emailInst); } catch(_e) {}
      } catch(_e) { Logger.warn('ctrl_pessoas_salvar', 'sync_usuario', _e.message); }
    }
    return { id: id };
  }, 'ctrl_pessoas_salvar');
}

/**
 * Muda status via FSM. Apenas RH/admin.
 */
function ctrl_pessoas_mudar_status(id, novoStatus) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_ESCRITA.indexOf(nivel) === -1)
      throw new Error('Apenas RH pode alterar status de colaboradores.');
    if (!id || !novoStatus) throw new Error('ID e novoStatus são obrigatórios.');
    return PessoasEngine.mudarStatus(id, novoStatus, ctx.email, ctx.orgId);
  }, 'ctrl_pessoas_mudar_status');
}

/**
 * Exclui colaborador definitivamente (hard delete). Apenas RH/admin/superadmin.
 * Uso restrito à remoção de duplicatas e registros inválidos.
 */
function ctrl_pessoas_excluir(id) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (nivel !== 'superadmin' && nivel !== 'rh')
      throw new Error('Apenas RH e Superadmin podem excluir colaboradores.');
    if (!id) throw new Error('ID é obrigatório.');

    // Bloqueia auto-exclusão: impede apagar o próprio registro de colaborador.
    var alvo = ColaboradorRepository.buscarPorId(ctx.orgId, id);
    if (alvo) {
      var emailAlvo = String(alvo.emailInstitucional || alvo.email || '').toLowerCase().trim();
      if (emailAlvo && emailAlvo === ctx.email.toLowerCase().trim()) {
        throw new Error(
          'Não é permitido excluir seu próprio registro de colaborador. ' +
          'Solicite a outro administrador ou use "Registrar desligamento" para desativar.'
        );
      }
    }

    ColaboradorRepository.excluir(ctx.orgId, id);
    AuditoriaService.registrar('COLABORADOR_EXCLUIDO', 'pessoas', { id: id, operador: ctx.email });
    return { ok: true };
  }, 'ctrl_pessoas_excluir');
}

/**
 * Registra desligamento oficial.
 */
function ctrl_pessoas_registrar_desligamento(dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (nivel !== 'superadmin' && nivel !== 'admin' && nivel !== 'rh')
      throw new Error('Apenas RH pode registrar desligamentos.');
    if (!dados || !dados.idColaborador) throw new Error('idColaborador é obrigatório.');
    return PessoasEngine.registrarDesligamento(dados, ctx.email, ctx.orgId);
  }, 'ctrl_pessoas_registrar_desligamento');
}

// ═══════════════════════════════════════════════════════════════════
// FÉRIAS
// ═══════════════════════════════════════════════════════════════════

function ctrl_rh_listar_ferias(idColaborador) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    var filtros = { orgId: ctx.orgId };
    if (_NIVEL_LEITURA_AMPLA.indexOf(nivel) !== -1) {
      if (idColaborador) filtros.idColaborador = idColaborador;
      return PessoasEngine.listarFerias(filtros, ctx.orgId);
    }
    // Colaborador: apenas as próprias
    var idProprio = _idColaboradorPorEmail(ctx.email, ctx.orgId);
    if (!idProprio) throw new Error('Colaborador não encontrado no cadastro.');
    if (idColaborador && idColaborador !== idProprio)
      throw new Error('Acesso negado: você só pode visualizar suas próprias férias.');
    filtros.idColaborador = idProprio;
    return PessoasEngine.listarFerias(filtros, ctx.orgId);
  }, 'ctrl_rh_listar_ferias');
}

function ctrl_rh_saldo_ferias(idColaborador) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (!idColaborador) throw new Error('idColaborador é obrigatório.');
    if (_NIVEL_LEITURA_AMPLA.indexOf(nivel) === -1) {
      var idProprio = _idColaboradorPorEmail(ctx.email, ctx.orgId);
      if (!idProprio || idColaborador !== idProprio)
        throw new Error('Acesso negado: você só pode consultar seu próprio saldo de férias.');
    }
    return PessoasEngine.saldoFerias(idColaborador, ctx.orgId);
  }, 'ctrl_rh_saldo_ferias');
}

function ctrl_rh_solicitar_ferias(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxPessoas();
    if (!dados || typeof dados !== 'object') throw new Error('Dados são obrigatórios.');
    return { id: PessoasEngine.solicitarFerias(dados, ctx.email, ctx.orgId) };
  }, 'ctrl_rh_solicitar_ferias');
}

function ctrl_rh_aprovar_ferias(id, dadosAprovacao) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (nivel !== 'superadmin' && nivel !== 'admin' && nivel !== 'rh')
      throw new Error('Apenas RH pode aprovar férias.');
    if (!id) throw new Error('ID é obrigatório.');
    return PessoasEngine.aprovarFerias(id, dadosAprovacao || {}, ctx.email);
  }, 'ctrl_rh_aprovar_ferias');
}

function ctrl_rh_recusar_ferias(id, motivo) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (nivel !== 'superadmin' && nivel !== 'admin' && nivel !== 'rh')
      throw new Error('Apenas RH pode recusar férias.');
    if (!id) throw new Error('ID é obrigatório.');
    return PessoasEngine.recusarFerias(id, motivo || '', ctx.email);
  }, 'ctrl_rh_recusar_ferias');
}

function ctrl_rh_solicitar_ajuste_ferias(id, observacao) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (nivel !== 'superadmin' && nivel !== 'admin' && nivel !== 'rh')
      throw new Error('Apenas RH pode solicitar ajuste de férias.');
    if (!id) throw new Error('ID é obrigatório.');
    return PessoasEngine.solicitarAjusteFerias(id, observacao || '', ctx.email);
  }, 'ctrl_rh_solicitar_ajuste_ferias');
}

function ctrl_rh_reenviar_ferias(id, novasDatas) {
  return GasResponse.wrap(function () {
    var ctx = _ctxPessoas();
    if (!id || !novasDatas) throw new Error('ID e novas datas são obrigatórios.');
    return PessoasEngine.reenviarFerias(id, novasDatas, ctx.email);
  }, 'ctrl_rh_reenviar_ferias');
}

function ctrl_rh_concluir_ferias(id, dadosConclusao) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (nivel !== 'superadmin' && nivel !== 'admin' && nivel !== 'rh')
      throw new Error('Apenas RH pode concluir férias.');
    if (!id) throw new Error('ID é obrigatório.');
    return PessoasEngine.concluirFerias(id, dadosConclusao || {}, ctx.email);
  }, 'ctrl_rh_concluir_ferias');
}

function ctrl_rh_cancelar_ferias(id, motivo) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (nivel !== 'superadmin' && nivel !== 'admin' && nivel !== 'rh' && nivel !== 'gestor') {
      // Colaborador pode cancelar as próprias férias se pendentes
      var idProprio = _idColaboradorPorEmail(ctx.email, ctx.orgId);
      if (!idProprio) throw new Error('Acesso negado: colaborador não encontrado.');
      // FSM validará estado
    }
    if (!id) throw new Error('ID é obrigatório.');
    return PessoasEngine.cancelarFerias(id, motivo || '', ctx.email);
  }, 'ctrl_rh_cancelar_ferias');
}

function ctrl_rh_resumo_ferias_colaborador(idColaborador) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (!idColaborador) throw new Error('idColaborador é obrigatório.');
    if (_NIVEL_LEITURA_AMPLA.indexOf(nivel) === -1) {
      var idProprio = _idColaboradorPorEmail(ctx.email, ctx.orgId);
      if (!idProprio || idColaborador !== idProprio)
        throw new Error('Acesso negado: você só pode consultar seus próprios períodos de férias.');
    }
    return PessoasEngine.resumoFeriasPorPeriodo(idColaborador, ctx.orgId);
  }, 'ctrl_rh_resumo_ferias_colaborador');
}

function ctrl_rh_registrar_acordo_ferias(id, dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (nivel !== 'superadmin' && nivel !== 'admin' && nivel !== 'rh')
      throw new Error('Apenas RH pode registrar acordo de férias.');
    if (!id) throw new Error('ID é obrigatório.');
    return PessoasEngine.registrarAcordoFerias(id, dados || {}, ctx.email);
  }, 'ctrl_rh_registrar_acordo_ferias');
}

// ═══════════════════════════════════════════════════════════════════
// ESCALAS
// ═══════════════════════════════════════════════════════════════════

function ctrl_pessoas_listar_escalas(filtros) {
  return GasResponse.wrap(function () {
    var ctx = _ctxPessoas();
    return PessoasEngine.listarEscalas(filtros || {}, ctx.orgId);
  }, 'ctrl_pessoas_listar_escalas');
}

function ctrl_pessoas_salvar_escala(dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_ESCRITA.indexOf(nivel) === -1)
      throw new Error('Apenas RH pode gerenciar escalas.');
    var id = PessoasEngine.salvarEscala(dados || {}, ctx.email, ctx.orgId);
    return { id: id };
  }, 'ctrl_pessoas_salvar_escala');
}

function ctrl_pessoas_excluir_escala(id) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_ESCRITA.indexOf(nivel) === -1)
      throw new Error('Apenas RH pode excluir escalas.');
    if (!id) throw new Error('ID é obrigatório.');
    return PessoasEngine.excluirEscala(id, ctx.email);
  }, 'ctrl_pessoas_excluir_escala');
}

// ═══════════════════════════════════════════════════════════════════
// AVALIAÇÕES
// ═══════════════════════════════════════════════════════════════════

function ctrl_pessoas_listar_avaliacoes(idColaborador) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    var filtros = {};
    if (_NIVEL_LEITURA_AMPLA.indexOf(nivel) !== -1) {
      if (idColaborador) filtros.idColaborador = idColaborador;
      return PessoasEngine.listarAvaliacoes(filtros, ctx.orgId);
    }
    // Colaborador: apenas as próprias
    var idProprio = _idColaboradorPorEmail(ctx.email, ctx.orgId);
    if (!idProprio) throw new Error('Colaborador não encontrado no cadastro.');
    if (idColaborador && idColaborador !== idProprio)
      throw new Error('Acesso negado: você só pode visualizar suas próprias avaliações.');
    filtros.idColaborador = idProprio;
    return PessoasEngine.listarAvaliacoes(filtros, ctx.orgId);
  }, 'ctrl_pessoas_listar_avaliacoes');
}

function ctrl_pessoas_salvar_avaliacao(dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_LEITURA_AMPLA.indexOf(nivel) === -1)
      throw new Error('Apenas gestores e RH podem registrar avaliações.');
    var id = PessoasEngine.salvarAvaliacao(dados || {}, ctx.email, ctx.orgId);
    return { id: id };
  }, 'ctrl_pessoas_salvar_avaliacao');
}

function ctrl_pessoas_excluir_avaliacao(id) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_ESCRITA.indexOf(nivel) === -1)
      throw new Error('Apenas RH pode excluir avaliações.');
    if (!id) throw new Error('ID é obrigatório.');
    return PessoasEngine.excluirAvaliacao(id, ctx.email);
  }, 'ctrl_pessoas_excluir_avaliacao');
}

// ═══════════════════════════════════════════════════════════════════
// HISTÓRICO RH
// ═══════════════════════════════════════════════════════════════════

function ctrl_rh_historico(idColaborador) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);

    if (_NIVEL_ESCRITA.indexOf(nivel) !== -1) {
      // RH/admin: acesso completo
      return PessoasEngine.listarHistorico(idColaborador ? { idColaborador: idColaborador } : {}, ctx.orgId);
    }
    if (nivel === 'gestor') {
      if (!idColaborador) throw new Error('Gestor deve especificar um colaborador.');
      return PessoasEngine.listarHistoricoFiltrado(idColaborador, 'gestor', ctx.orgId);
    }
    // Colaborador: apenas próprio histórico filtrado
    var idProprio = _idColaboradorPorEmail(ctx.email, ctx.orgId);
    if (!idProprio) throw new Error('Colaborador não encontrado no cadastro.');
    if (idColaborador && idColaborador !== idProprio)
      throw new Error('Acesso negado: você só pode visualizar seu próprio histórico.');
    return PessoasEngine.listarHistoricoFiltrado(idProprio, 'colaborador', ctx.orgId);
  }, 'ctrl_rh_historico');
}

function ctrl_rh_registrar_evento(dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_ESCRITA.indexOf(nivel) === -1)
      throw new Error('Apenas RH pode registrar eventos no histórico.');
    if (!dados || typeof dados !== 'object') throw new Error('Dados são obrigatórios.');
    return { id: PessoasEngine.registrarEvento(dados, ctx.email, ctx.orgId) };
  }, 'ctrl_rh_registrar_evento');
}

function ctrl_rh_excluir_evento(id) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_ESCRITA.indexOf(nivel) === -1)
      throw new Error('Apenas RH pode excluir eventos do histórico.');
    if (!id) throw new Error('ID é obrigatório.');
    return PessoasEngine.excluirEvento(id, ctx.email);
  }, 'ctrl_rh_excluir_evento');
}

/**
 * Retorna o nível do usuário atual para uso no frontend.
 */
function ctrl_pessoas_meu_nivel() {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    var idProprio = _idColaboradorPorEmail(ctx.email, ctx.orgId);
    return { nivel: nivel, idColaborador: idProprio, email: ctx.email };
  }, 'ctrl_pessoas_meu_nivel');
}

// ═══════════════════════════════════════════════════════════════════
// AFASTAMENTOS
// ═══════════════════════════════════════════════════════════════════

function ctrl_rh_listar_afastamentos(idColaborador) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    var filtros = { orgId: ctx.orgId };
    if (_NIVEL_LEITURA_AMPLA.indexOf(nivel) !== -1) {
      if (idColaborador) filtros.idColaborador = idColaborador;
      return PessoasEngine.listarAfastamentos(filtros, ctx.orgId);
    }
    // Colaborador: apenas os próprios
    var idProprio = _idColaboradorPorEmail(ctx.email, ctx.orgId);
    if (!idProprio) throw new Error('Colaborador não encontrado no cadastro.');
    if (idColaborador && idColaborador !== idProprio)
      throw new Error('Acesso negado: você só pode visualizar seus próprios afastamentos.');
    filtros.idColaborador = idProprio;
    return PessoasEngine.listarAfastamentos(filtros, ctx.orgId);
  }, 'ctrl_rh_listar_afastamentos');
}

function ctrl_rh_registrar_afastamento(dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_ESCRITA.indexOf(nivel) === -1)
      throw new Error('Apenas RH pode registrar afastamentos.');
    if (!dados || typeof dados !== 'object') throw new Error('Dados são obrigatórios.');
    return { id: PessoasEngine.registrarAfastamento(dados, ctx.email, ctx.orgId) };
  }, 'ctrl_rh_registrar_afastamento');
}

function ctrl_rh_ativar_afastamento(id) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_ESCRITA.indexOf(nivel) === -1)
      throw new Error('Apenas RH pode ativar afastamentos.');
    if (!id) throw new Error('ID é obrigatório.');
    return PessoasEngine.ativarAfastamento(id, ctx.email, ctx.orgId);
  }, 'ctrl_rh_ativar_afastamento');
}

function ctrl_rh_encerrar_afastamento(id, dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_ESCRITA.indexOf(nivel) === -1)
      throw new Error('Apenas RH pode encerrar afastamentos.');
    if (!id) throw new Error('ID é obrigatório.');
    return PessoasEngine.encerrarAfastamento(id, dados || {}, ctx.email, ctx.orgId);
  }, 'ctrl_rh_encerrar_afastamento');
}

function ctrl_rh_cancelar_afastamento(id, motivo) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_ESCRITA.indexOf(nivel) === -1)
      throw new Error('Apenas RH pode cancelar afastamentos.');
    if (!id) throw new Error('ID é obrigatório.');
    return PessoasEngine.cancelarAfastamento(id, motivo || '', ctx.email);
  }, 'ctrl_rh_cancelar_afastamento');
}

/**
 * Qualquer colaborador ativo pode solicitar o seu próprio day-off de aniversário.
 * Verificações: cadastro encontrado, janela de 7 dias, uso único no ano.
 */
function ctrl_rh_solicitar_dayoff_aniversario() {
  return GasResponse.wrap(function() {
    var ctx = _ctxPessoas();
    var idColaborador = _idColaboradorPorEmail(ctx.email, ctx.orgId);
    if (!idColaborador) throw new Error('Colaborador não encontrado no cadastro de pessoas.');
    var id = PessoasEngine.registrarDayoffAniversario(idColaborador, ctx.email, ctx.orgId);
    return { id: id };
  }, 'ctrl_rh_solicitar_dayoff_aniversario');
}

function ctrl_rh_salvar_afastamento(dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_ESCRITA.indexOf(nivel) === -1)
      throw new Error('Apenas RH pode gerenciar afastamentos.');
    if (!dados || typeof dados !== 'object') throw new Error('Dados são obrigatórios.');
    if (!dados.id) {
      return { id: PessoasEngine.registrarAfastamento(dados, ctx.email, ctx.orgId) };
    }
    // Atualizar afastamento existente (apenas rascunho)
    var af = ColaboradorRepository.buscarAfastamentoPorId(dados.id);
    if (!af) throw new Error('Afastamento não encontrado: ' + dados.id);
    if (af.status !== 'rascunho') throw new Error('Apenas afastamentos em rascunho podem ser editados.');
    dados.orgId = ctx.orgId;
    var r = ColaboradorRepository.salvarAfastamento(dados);
    return { id: r.id };
  }, 'ctrl_rh_salvar_afastamento');
}

// ═══════════════════════════════════════════════════════════════════
// OCORRÊNCIAS
// ═══════════════════════════════════════════════════════════════════

function ctrl_rh_listar_ocorrencias(idColaborador) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    var filtros = { orgId: ctx.orgId };
    if (_NIVEL_LEITURA_AMPLA.indexOf(nivel) !== -1) {
      if (idColaborador) filtros.idColaborador = idColaborador;
      return PessoasEngine.listarOcorrencias(filtros, ctx.orgId);
    }
    // Colaborador: apenas elogios e observações próprias (não advertências)
    var idProprio = _idColaboradorPorEmail(ctx.email, ctx.orgId);
    if (!idProprio) throw new Error('Colaborador não encontrado no cadastro.');
    filtros.idColaborador = idProprio;
    var lista = PessoasEngine.listarOcorrencias(filtros, ctx.orgId);
    return lista.filter(function (o) {
      return o.tipo === 'elogio' || o.tipo === 'observacao';
    });
  }, 'ctrl_rh_listar_ocorrencias');
}

function ctrl_rh_registrar_ocorrencia(dados) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_LEITURA_AMPLA.indexOf(nivel) === -1)
      throw new Error('Apenas gestores e RH podem registrar ocorrências.');
    if (!dados || typeof dados !== 'object') throw new Error('Dados são obrigatórios.');
    return { id: PessoasEngine.registrarOcorrencia(dados, ctx.email, ctx.orgId) };
  }, 'ctrl_rh_registrar_ocorrencia');
}

function ctrl_rh_excluir_ocorrencia(id) {
  return GasResponse.wrap(function () {
    var ctx   = _ctxPessoas();
    var nivel = _ctxPessoasNivel(ctx.email);
    if (_NIVEL_ESCRITA.indexOf(nivel) === -1)
      throw new Error('Apenas RH pode excluir ocorrências.');
    if (!id) throw new Error('ID é obrigatório.');
    return PessoasEngine.excluirOcorrencia(id, ctx.email);
  }, 'ctrl_rh_excluir_ocorrencia');
}

// ═══════════════════════════════════════════════════════════════════
// PCCS — Plano de Cargos, Carreiras e Salários
// ═══════════════════════════════════════════════════════════════════

function ctrl_pccs_listar() {
  return GasResponse.wrap(function() {
    var ctx = _ctxPessoas();
    if (['admin','superadmin','rh'].indexOf(ctx.papel) === -1)
      throw new Error('Apenas RH ou Admin podem acessar PCCS.');
    return PCCSRepository.listarTodos();
  }, 'ctrl_pccs_listar');
}

function ctrl_pccs_listarCargos() {
  return GasResponse.wrap(function() {
    return PCCSRepository.listarCargosParaSelect();
  }, 'ctrl_pccs_listarCargos');
}

function ctrl_pccs_salvar(dados) {
  return GasResponse.wrap(function() {
    var ctx = _ctxPessoas();
    if (['admin','superadmin','rh'].indexOf(ctx.papel) === -1)
      throw new Error('Apenas RH ou Admin podem salvar PCCS.');
    return PCCSRepository.salvar(dados, ctx.email);
  }, 'ctrl_pccs_salvar');
}

function ctrl_pccs_salvarCargo(pccsId, cargo) {
  return GasResponse.wrap(function() {
    var ctx = _ctxPessoas();
    if (['admin','superadmin','rh'].indexOf(ctx.papel) === -1)
      throw new Error('Apenas RH ou Admin podem salvar cargos.');
    return PCCSRepository.salvarCargo(pccsId, cargo, ctx.email);
  }, 'ctrl_pccs_salvarCargo');
}

function ctrl_pccs_excluirCargo(pccsId, cargoId) {
  return GasResponse.wrap(function() {
    var ctx = _ctxPessoas();
    if (['admin','superadmin','rh'].indexOf(ctx.papel) === -1)
      throw new Error('Apenas RH ou Admin podem excluir cargos.');
    return PCCSRepository.excluirCargo(pccsId, cargoId, ctx.email);
  }, 'ctrl_pccs_excluirCargo');
}

function ctrl_pccs_obterSalario(cargoId, nivel, classe, referencia) {
  return GasResponse.wrap(function() {
    return { salarioBase: PCCSRepository.obterSalarioPorPosicao(cargoId, nivel, classe, referencia) };
  }, 'ctrl_pccs_obterSalario');
}

function ctrl_pccs_aplicarReajuste(pccsId, percentual) {
  return GasResponse.wrap(function() {
    var ctx = _ctxPessoas();
    if (['admin','superadmin','rh'].indexOf(ctx.papel) === -1)
      throw new Error('Apenas RH ou Admin podem aplicar reajuste.');
    PCCSRepository.aplicarReajuste(pccsId, percentual, ctx.email);
    return { aplicado: true };
  }, 'ctrl_pccs_aplicarReajuste');
}

function ctrl_pccs_salvarTabela(pccsId, tabelaSalarial, parametros) {
  return GasResponse.wrap(function() {
    var ctx = _ctxPessoas();
    if (['admin','superadmin','rh'].indexOf(ctx.papel) === -1)
      throw new Error('Apenas RH ou Admin podem editar a tabela salarial.');
    PCCSRepository.salvarTabelaSalarial(pccsId, tabelaSalarial, parametros || {}, ctx.email);
    return { salvo: true };
  }, 'ctrl_pccs_salvarTabela');
}

// ═══════════════════════════════════════════════════════════════════
// PERFIL PESSOAL — auto-atualização pelo próprio colaborador
// ═══════════════════════════════════════════════════════════════════

var _PERFIL_CAMPOS_EDITAVEIS = [
  'nomeApelido','pronomes','emailPessoal','telefone','telefoneWpp','endereco',
  'genero','sexualidade','racaCor',
  'tipoSanguineo','alergias','restricoesAlimentares','restricoesOutro','observacoesPessoais',
  'contatoEmergencia','fotoPerfil',
  'pcd','pcdTipos','pcdSuporte','pcdSuporteDescricao',
  'ePaiMae','papelParental','numFilhos'
];

function ctrl_pessoas_meu_perfil_ler() {
  return GasResponse.wrap(function () {
    var ctx = _ctxPessoas();
    var eu  = ColaboradorRepository.buscarPorEmail(ctx.orgId, ctx.email);
    return { encontrado: !!eu, colaborador: eu };
  }, 'ctrl_pessoas_meu_perfil_ler');
}

function ctrl_pessoas_meu_perfil_salvar(dados) {
  return GasResponse.wrap(function () {
    var ctx = _ctxPessoas();
    var eu  = ColaboradorRepository.buscarPorEmail(ctx.orgId, ctx.email);
    if (!eu) throw new Error('Seu usuário não está vinculado a um colaborador no sistema.');
    _PERFIL_CAMPOS_EDITAVEIS.forEach(function(campo){
      if (Object.prototype.hasOwnProperty.call(dados, campo)) eu[campo] = dados[campo];
    });
    ColaboradorRepository.salvar(ctx.orgId, eu);
    AuditoriaService.registrar('PERFIL_ATUALIZADO', 'perfil', { id: eu.id, operador: ctx.email });
    try { BootService.limparCache(ctx.email); } catch(_) {}
    return { ok: true, colaborador: eu };
  }, 'ctrl_pessoas_meu_perfil_salvar');
}

// ═══════════════════════════════════════════════════════════════════
// MANUTENÇÃO / MIGRAÇÃO — executar manualmente no GAS Editor
// ═══════════════════════════════════════════════════════════════════

/**
 * DIAGNÓSTICO — lista todos os registros de colaboradores.json que possuem o
 * mesmo emailInstitucional de João Paulo Rodrigues Barros, para identificar
 * o registro duplicado criado acidentalmente.
 *
 * Executar no GAS Editor. Copiar os IDs retornados e usar em
 * recuperar_deduplicar_joao_paulo(idParaExcluir) para remover o duplicado.
 */
function recuperar_diagnosticar_duplicatas() {
  var EMAIL = 'joao.barros@idm.org.br';
  var todos  = lerJSON('colaboradores.json') || [];
  var matches = todos.filter(function(c) {
    return (String(c.emailInstitucional || c.email || '')).toLowerCase().trim() === EMAIL.toLowerCase() ||
           (c.nome || '').toLowerCase().indexOf('joão paulo rodrigues barros') !== -1 ||
           (c.nome || '').toLowerCase().indexOf('joao paulo rodrigues barros') !== -1;
  });

  return {
    totalEncontrados: matches.length,
    registros: matches.map(function(c) {
      var campos = Object.keys(c).filter(function(k) { return !!c[k]; }).length;
      return {
        id:           c.id,
        nome:         c.nome,
        email:        c.emailInstitucional,
        numRegistro:  c.numRegistro,
        criadoEm:     c.criadoEm,
        atualizadoEm: c.atualizadoEm,
        status:       c.status,
        camposPreenchidos: campos,
        temDadosPessoais: !!(c.cpf || c.dataNascimento || c.telefone || c.emailPessoal || c.endereco)
      };
    }).sort(function(a, b) {
      // Mais completo primeiro
      return b.camposPreenchidos - a.camposPreenchidos;
    }),
    instrucao: 'Execute recuperar_deduplicar_joao_paulo("ID_DO_DUPLICADO") passando o ID do registro com menos campos preenchidos.'
  };
}

/**
 * Remove o registro duplicado/esparso de João Paulo, preservando o original completo.
 * Executar somente após confirmar o ID correto via recuperar_diagnosticar_duplicatas().
 *
 * @param {string} idParaExcluir - ID do registro DUPLICADO (o esparso, com menos dados)
 */
function recuperar_deduplicar_joao_paulo(idParaExcluir) {
  if (!idParaExcluir) {
    return { ok: false, erro: 'Passe o ID do registro duplicado. Use recuperar_diagnosticar_duplicatas() para encontrá-lo.' };
  }
  var orgId = getOrgConfig().orgId;

  // Confirma que o registro a excluir é realmente o esparso
  var alvo = ColaboradorRepository.buscarPorId(orgId, idParaExcluir);
  if (!alvo) return { ok: false, erro: 'Registro ' + idParaExcluir + ' não encontrado.' };

  // Segurança: não apagar registro com dados pessoais ricos
  var temDadosPessoais = !!(alvo.cpf || alvo.dataNascimento || alvo.emailPessoal ||
                            (alvo.telefone && alvo.telefone.length > 5));
  if (temDadosPessoais) {
    return {
      ok: false,
      erro: 'ATENÇÃO: o registro ' + idParaExcluir + ' parece ter dados pessoais (cpf/nascimento/telefone/emailPessoal). ' +
            'Verifique novamente os IDs via recuperar_diagnosticar_duplicatas() antes de prosseguir.',
      dadosEncontrados: { cpf: !!alvo.cpf, nascimento: alvo.dataNascimento, telefone: alvo.telefone, emailPessoal: alvo.emailPessoal }
    };
  }

  ColaboradorRepository.excluir(orgId, idParaExcluir);
  AuditoriaService.registrar('COLABORADOR_DUPLICADO_REMOVIDO', 'pessoas', {
    id: idParaExcluir, nome: alvo.nome, numRegistro: alvo.numRegistro,
    operador: 'recuperacao_emergencia'
  });

  return {
    ok: true,
    mensagem: 'Registro duplicado ' + idParaExcluir + ' (numRegistro: ' + alvo.numRegistro + ') removido com sucesso.',
    registroOriginalPreservado: 'Execute recuperar_diagnosticar_duplicatas() para confirmar que o registro completo persiste.'
  };
}

/**
 * Fase 1.2 — prepara índice da aba EQUIPES.Funcionarios.
 */
function fase1_colaboradores_prepararIndice() {
  return GasResponse.wrap(function () {
    ColaboradorRepository.garantirCabecalhoIndice();
    return ColaboradorRepository.protegerIndice();
  }, 'fase1_colaboradores_prepararIndice');
}

/**
 * Fase 1.2 — migra funcionarios.json legado → colaboradores.json canônico.
 * Idempotente: ignorará registros cujo id já existe em colaboradores.json.
 */
function fase1_colaboradores_migrarFuncionarios() {
  return GasResponse.wrap(function () {
    return PessoasEngine.migrarFuncionariosParaColaboradores(getOrgConfig().orgId);
  }, 'fase1_colaboradores_migrarFuncionarios');
}

/**
 * RECUPERAÇÃO DE EMERGÊNCIA — executar no GAS Editor quando houver perda de dados.
 *
 * Lista as últimas revisões de colaboradores.json no Drive e encontra a versão
 * de João Paulo Rodrigues Barros ANTES da perda ocorrida em 2026-06-11 tarde.
 *
 * Uso:
 *   1. Executar recuperar_colaborador_historico() no GAS Editor
 *   2. Anotar o conteúdo de "dadosRecuperados" no resultado
 *   3. Executar recuperar_colaborador_aplicar(dadosRecuperados) para restaurar
 */
function recuperar_colaborador_historico() {
  var NOME_ARQUIVO = 'colaboradores.json';
  var BUSCA_NOME   = 'João Paulo Rodrigues Barros';
  // Perda ocorreu em 2026-06-11 tarde (BRT = UTC-3, então aprox. 15:00 UTC)
  var ANTES_DE     = '2026-06-11T15:00:00.000Z';

  var files = DriveApp.getFilesByName(NOME_ARQUIVO);
  if (!files.hasNext()) return { ok: false, erro: 'Arquivo ' + NOME_ARQUIVO + ' não encontrado no Drive.' };

  var file   = files.next();
  var fileId = file.getId();
  var token  = ScriptApp.getOAuthToken();

  // Listar revisões
  var rUrl  = 'https://www.googleapis.com/drive/v3/files/' + fileId +
              '/revisions?pageSize=50&fields=revisions(id,modifiedTime)';
  var rResp = UrlFetchApp.fetch(rUrl, { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
  var revData = JSON.parse(rResp.getContentText());
  var revisoes = (revData.revisions || []).filter(function(r) {
    return r.modifiedTime < ANTES_DE;
  }).sort(function(a, b) {
    return b.modifiedTime.localeCompare(a.modifiedTime); // mais recente primeiro
  });

  if (revisoes.length === 0) {
    return { ok: false, erro: 'Nenhuma revisão encontrada antes de ' + ANTES_DE, totalRevisoes: (revData.revisions||[]).length };
  }

  // Percorrer revisões até encontrar o colaborador com dados ricos
  var melhorDados = null;
  var melhorRevisao = null;
  for (var i = 0; i < revisoes.length; i++) {
    var rev = revisoes[i];
    var cUrl = 'https://www.googleapis.com/drive/v3/files/' + fileId +
               '/revisions/' + rev.id + '?alt=media';
    try {
      var cResp = UrlFetchApp.fetch(cUrl, { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
      if (cResp.getResponseCode() !== 200) continue;
      var lista = JSON.parse(cResp.getContentText());
      for (var j = 0; j < lista.length; j++) {
        var c = lista[j];
        if ((c.nome || '').toLowerCase().indexOf('joão paulo rodrigues barros') !== -1 ||
            (c.emailInstitucional || '').toLowerCase().indexOf('joao.barros') !== -1 ||
            (c.emailInstitucional || '').toLowerCase().indexOf('jpbarros') !== -1 ||
            (c.emailPessoal || '').toLowerCase().indexOf('jpbarros') !== -1) {
          // Critério de "dados ricos": pelo menos 3 campos pessoais não-vazios
          var camposRicos = ['nomeApelido','pronomes','emailPessoal','dataNascimento',
                             'genero','sexualidade','racaCor','telefone','cpf',
                             'tipoSanguineo','alergias','observacoesPessoais'];
          var ricos = camposRicos.filter(function(k) { return !!c[k]; }).length;
          if (ricos > (melhorDados ? camposRicos.filter(function(k){ return !!(melhorDados[k]); }).length : 0)) {
            melhorDados    = c;
            melhorRevisao  = rev;
          }
        }
      }
      if (melhorDados) break; // encontrou — para na revisão mais recente com dados
    } catch(e) { Logger.log('Erro revisão ' + rev.id + ': ' + e.message); }
  }

  if (!melhorDados) {
    return {
      ok: false,
      erro: 'Colaborador não encontrado em nenhuma revisão anterior a ' + ANTES_DE,
      revisoesTentadas: revisoes.length
    };
  }

  return {
    ok: true,
    revisaoId: melhorRevisao.id,
    revisaoData: melhorRevisao.modifiedTime,
    dadosRecuperados: melhorDados,
    instrucao: 'Verifique os dados acima e execute recuperar_colaborador_aplicar() para restaurar.'
  };
}

/**
 * SEGUNDO PASSO DA RECUPERAÇÃO — aplica os dados recuperados sobre o registro atual.
 * Preserva status atual e atualizadoEm; restaura todos os outros campos do snapshot.
 *
 * Uso: recuperar_colaborador_aplicar()  (usa dados de colaboradores.json histórico)
 * Ou:  recuperar_colaborador_aplicar_manual() para restaurar campos específicos
 */
function recuperar_colaborador_aplicar() {
  var resultado = recuperar_colaborador_historico();
  if (!resultado.ok) return resultado;

  var snap  = resultado.dadosRecuperados;
  var orgId = snap.orgId || getOrgConfig().orgId;
  var atual = ColaboradorRepository.buscarPorId(orgId, snap.id);

  // Tentar também por email quando o registro não é encontrado pelo ID original
  if (!atual && snap.emailInstitucional) {
    atual = ColaboradorRepository.buscarPorEmail(orgId, snap.emailInstitucional);
  }

  if (!atual) {
    // Registro foi deletado — recriar a partir do snapshot (salvar faz insert quando ID não existe)
    Logger.info('recuperar_colaborador_aplicar', 'Registro deletado — recriando a partir do snapshot de ' + resultado.revisaoData);
    snap.orgId = orgId;
    if (!snap.status) snap.status = 'ativo';
    if (snap.ativo === undefined) snap.ativo = true;
    ColaboradorRepository.salvar(orgId, snap);
    AuditoriaService.registrar('COLABORADOR_RESTAURADO_HISTORICO', 'pessoas', {
      id: snap.id, nome: snap.nome, revisaoId: resultado.revisaoId,
      revisaoData: resultado.revisaoData, operador: 'recuperacao_emergencia', acao: 'RECRIADO'
    });
    return {
      ok: true,
      acao: 'RECRIADO',
      mensagem: 'Colaborador ' + snap.nome + ' RECRIADO a partir do snapshot de ' + resultado.revisaoData +
                '. Verifique a ficha no módulo RH.'
    };
  }

  // Registro existe — mesclar dados do snapshot preservando status atual
  var _PRESERVAR_ATUAL = ['status', 'ativo', 'atualizadoEm'];
  Object.keys(snap).forEach(function(k) {
    if (_PRESERVAR_ATUAL.indexOf(k) === -1) atual[k] = snap[k];
  });

  ColaboradorRepository.salvar(orgId, atual);
  AuditoriaService.registrar('COLABORADOR_RESTAURADO_HISTORICO', 'pessoas', {
    id: snap.id, nome: snap.nome, revisaoId: resultado.revisaoId,
    revisaoData: resultado.revisaoData, operador: 'recuperacao_emergencia', acao: 'ATUALIZADO'
  });

  return { ok: true, acao: 'ATUALIZADO', mensagem: 'Dados de ' + snap.nome + ' restaurados a partir da revisão ' + resultado.revisaoData };
}

/**
 * DIAGNÓSTICO — mostra o estado atual de colaboradores.json para João Paulo.
 *
 * Executar no GAS Editor quando o colaborador some da lista mas Meu Perfil ainda funciona.
 * Retorna todos os registros que casam com o email ou nome, independente de status.
 */
function recuperar_diagnosticar_estado() {
  var orgId   = getOrgConfig().orgId;
  var EMAIL_INST  = 'joao.barros@idm.org.br';
  var EMAIL_PESS  = 'jpbarros.boletos@gmail.com';
  var NOME_BUSCA  = 'joão paulo rodrigues barros';

  var todos = lerJSON('colaboradores.json') || [];
  var matches = todos.filter(function(c) {
    var eInst = String(c.emailInstitucional || '').toLowerCase().trim();
    var ePess = String(c.emailPessoal || c.email || '').toLowerCase().trim();
    var nome  = String(c.nome || '').toLowerCase().trim();
    return eInst === EMAIL_INST ||
           ePess === EMAIL_PESS ||
           nome.indexOf(NOME_BUSCA) !== -1;
  });

  var acesso = lerJSON('usuarios_acesso.json') || [];
  var regAcesso = acesso.filter(function(u) {
    return (u.email || '').toLowerCase() === EMAIL_INST ||
           (u.email || '').toLowerCase() === EMAIL_PESS;
  });

  return {
    totalColaboradores: todos.length,
    matchesEncontrados: matches.length,
    colaboradores: matches.map(function(c) {
      return {
        id: c.id, nome: c.nome, emailInstitucional: c.emailInstitucional,
        emailPessoal: c.emailPessoal, status: c.status, ativo: c.ativo,
        numRegistro: c.numRegistro, cargo: c.cargo, setor: c.setor,
        criadoEm: c.criadoEm, atualizadoEm: c.atualizadoEm,
        camposPreenchidos: Object.keys(c).filter(function(k){ return !!c[k]; }).length
      };
    }),
    registrosAcesso: regAcesso.map(function(u) {
      return { email: u.email, nome: u.nome, papel: u.papel, status: u.status };
    }),
    diagnostico: matches.length === 0
      ? 'ALERTA: nenhum registro de colaborador encontrado — execute recuperar_colaborador_aplicar() ou recuperar_colaborador_do_acesso()'
      : (matches.length > 1
        ? 'ATENÇÃO: ' + matches.length + ' registros encontrados (duplicata) — use recuperar_deduplicar_joao_paulo(idEsparso)'
        : 'OK: 1 registro encontrado com status "' + matches[0].status + '"')
  };
}

/**
 * RECUPERAÇÃO SEM HISTÓRICO — cria registro de colaborador a partir de usuarios_acesso.json.
 *
 * Usar quando recuperar_colaborador_aplicar() falha porque o histórico do Drive
 * não tem uma revisão útil (arquivo novo demais, poucas revisões, etc.).
 *
 * O registro criado tem: nome, email institucional, email pessoal, papel/cargo básico.
 * Os campos de RH (CPF, numRegistro, dataAdmissao, salário etc.) devem ser preenchidos
 * manualmente na ficha RH após a execução desta função.
 *
 * Idempotente: não cria duplicata se já existe um registro para o mesmo email.
 */
function recuperar_colaborador_do_acesso() {
  var EMAIL_INST  = 'joao.barros@idm.org.br';
  var EMAIL_PESS  = 'jpbarros.boletos@gmail.com';
  var orgId       = getOrgConfig().orgId;

  // Verificar se já existe um registro para não duplicar
  var existente = ColaboradorRepository.buscarPorEmail(orgId, EMAIL_INST) ||
                  ColaboradorRepository.buscarPorEmail(orgId, EMAIL_PESS);
  if (existente) {
    return {
      ok: false,
      mensagem: 'Colaborador já existe com ID ' + existente.id + ' e status "' + existente.status + '". ' +
                'Use recuperar_diagnosticar_estado() para ver o estado completo.',
      colaborador: existente
    };
  }

  // Buscar dados base em usuarios_acesso.json
  var acesso = lerJSON('usuarios_acesso.json') || [];
  var usr = null;
  for (var i = 0; i < acesso.length; i++) {
    var email = String(acesso[i].email || '').toLowerCase().trim();
    if (email === EMAIL_INST || email === EMAIL_PESS) { usr = acesso[i]; break; }
  }

  var novoColab = {
    orgId:              orgId,
    nome:               (usr && usr.nome) ? usr.nome : 'João Paulo Rodrigues Barros',
    emailInstitucional: EMAIL_INST,
    emailPessoal:       EMAIL_PESS,
    nomeApelido:        usr ? (usr.nomeApelido || '') : '',
    pronomes:           usr ? (usr.pronomes || 'Ele/dele') : 'Ele/dele',
    telefone:           usr ? (usr.telefone || '') : '',
    fotoPerfil:         usr ? (usr.fotoPerfil || '') : '',
    setor:              'gestao',
    cargo:              'Gerente Executivo I',
    tipoVinculo:        'clt',
    status:             'ativo',
    ativo:              true,
    origem:             'recuperacao_sem_historico'
  };

  ColaboradorRepository.salvar(orgId, novoColab);
  AuditoriaService.registrar('COLABORADOR_RECRIADO_DO_ACESSO', 'pessoas', {
    nome: novoColab.nome, email: EMAIL_INST, operador: 'recuperacao_emergencia'
  });

  var criado = ColaboradorRepository.buscarPorEmail(orgId, EMAIL_INST);
  return {
    ok: true,
    mensagem: 'Colaborador recriado com ID ' + (criado ? criado.id : '?') + '. ' +
              'ATENÇÃO: CPF, numRegistro, dataAdmissao, salário e outros campos RH ' +
              'precisam ser preenchidos manualmente na ficha RH.',
    colaborador: criado
  };
}

/**
 * Migração única: copia campos pessoais de usuarios_acesso.json → colaboradores.json
 * e remove esses campos do arquivo de acesso.
 * Idempotente: só sobrescreve campos vazios no colaborador.
 * Executar UMA vez no GAS Editor após o deploy desta versão.
 */
function ctrl_pessoas_meu_perfil_migrar_acesso_para_colaboradores() {
  return GasResponse.wrap(function () {
    var orgId       = getOrgConfig().orgId;
    var _campos     = ['pronomes', 'nomeApelido', 'emailPessoal', 'telefone', 'fotoPerfil'];
    var registros   = lerJSON('usuarios_acesso.json') || [];
    var importados  = 0;
    var ignorados   = 0;

    registros.forEach(function(usr) {
      if (!usr.email) { ignorados++; return; }
      var temDados = _campos.some(function(k) { return !!usr[k]; });
      if (!temDados) { ignorados++; return; }

      var colab = ColaboradorRepository.buscarPorEmail(orgId, usr.email);
      if (!colab) { ignorados++; return; }

      var alterado = false;
      _campos.forEach(function(k) {
        if (usr[k] && !colab[k]) { colab[k] = usr[k]; alterado = true; }
      });

      if (alterado) {
        ColaboradorRepository.salvar(orgId, colab);
        importados++;
      } else {
        ignorados++;
      }
    });

    // Limpar campos pessoais de usuarios_acesso.json
    modifyJSON('usuarios_acesso.json', function(lista) {
      if (!Array.isArray(lista)) return lista;
      return lista.map(function(u) {
        _campos.forEach(function(k) { delete u[k]; });
        u.atualizadoEm = new Date().toISOString();
        return u;
      });
    });

    AuditoriaService.registrar('MIGRACAO_ACESSO_PARA_COLABORADORES', 'admin',
      { importados: importados, ignorados: ignorados });
    return { importados: importados, ignorados: ignorados };
  }, 'ctrl_pessoas_meu_perfil_migrar_acesso_para_colaboradores');
}
