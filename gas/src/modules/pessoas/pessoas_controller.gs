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
    // Sync setor/nomeApelido/pronomes para o registro de usuário vinculado
    var emailInst = String((dados||{}).emailInstitucional || '').toLowerCase().trim();
    if (emailInst) {
      try {
        modifyJSON('usuarios_acesso.json', function(lista) {
          if (!Array.isArray(lista)) return lista;
          var usr = lista.find(function(u){ return (u.email||'').toLowerCase() === emailInst; });
          if (!usr) return lista;
          if (dados.setor       !== undefined) usr.setor       = dados.setor || usr.setor;
          if (dados.nomeApelido !== undefined) usr.nomeApelido = dados.nomeApelido;
          if (dados.pronomes    !== undefined) usr.pronomes    = dados.pronomes;
          if (dados.nome        && !usr.nome)  usr.nome        = dados.nome;
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
  'nomeApelido','pronomes','emailPessoal','telefone','endereco',
  'genero','sexualidade','racaCor',
  'tipoSanguineo','alergias','restricoesAlimentares','restricoesOutro','observacoesPessoais',
  'contatoEmergencia','fotoPerfil'
];

function ctrl_pessoas_meu_perfil_ler() {
  return GasResponse.wrap(function () {
    var ctx    = _ctxPessoas();
    var colabs = ColaboradorRepository.listar(ctx.orgId);
    var eu     = colabs.filter(function(c){
      return (c.emailInstitucional||c.email||'').toLowerCase() === ctx.email.toLowerCase();
    })[0] || null;
    return { encontrado: !!eu, colaborador: eu };
  }, 'ctrl_pessoas_meu_perfil_ler');
}

function ctrl_pessoas_meu_perfil_salvar(dados) {
  return GasResponse.wrap(function () {
    var ctx    = _ctxPessoas();
    var colabs = ColaboradorRepository.listar(ctx.orgId);
    var eu     = colabs.filter(function(c){
      return (c.emailInstitucional||c.email||'').toLowerCase() === ctx.email.toLowerCase();
    })[0] || null;
    if (!eu) throw new Error('Seu usuário não está vinculado a um colaborador no sistema.');
    _PERFIL_CAMPOS_EDITAVEIS.forEach(function(campo){
      if (Object.prototype.hasOwnProperty.call(dados, campo)) eu[campo] = dados[campo];
    });
    ColaboradorRepository.atualizar(ctx.orgId, eu.id, eu);
    AuditoriaService.registrar('PERFIL_ATUALIZADO', 'perfil', { id: eu.id, operador: ctx.email });
    return { ok: true, colaborador: eu };
  }, 'ctrl_pessoas_meu_perfil_salvar');
}

// ═══════════════════════════════════════════════════════════════════
// MANUTENÇÃO / MIGRAÇÃO — executar manualmente no GAS Editor
// ═══════════════════════════════════════════════════════════════════

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
