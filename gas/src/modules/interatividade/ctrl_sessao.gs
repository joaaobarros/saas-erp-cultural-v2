/**
 * @file modules/interatividade/ctrl_sessao.gs
 * @layer modules/interatividade
 * @description Controller de Sessões Interativas (host interno).
 *
 * Endpoints públicos (participantes externos): _publicSessao* abaixo.
 * Endpoints internos (host): ctrl_sessao_*.
 *
 * @depends sessao_interativa_repository.gs, acesso_service.gs, gas_response.gs
 */

function _ctxSessao() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  return { email: email, orgId: getOrgConfig().orgId,
           papel: (acesso.registro||{}).papel || 'colaborador' };
}

// ── Host: CRUD de sessões ────────────────────────────────────────────────────

function ctrl_sessao_listar(filtros) {
  return GasResponse.wrap(function() {
    var ctx = _ctxSessao();
    return SessaoInterativaRepository.listarSessoes(ctx.orgId, filtros || {});
  }, 'ctrl_sessao_listar');
}

function ctrl_sessao_criar(dados) {
  return GasResponse.wrap(function() {
    var ctx = _ctxSessao();
    var sessao = SessaoInterativaRepository.criarSessao(ctx.orgId, dados || {}, ctx.email);
    // URL pública de acesso dos participantes
    var url = ScriptApp.getService().getUrl() + '?secao=sessao&codigo=' + sessao.codigo;
    return { sessao: sessao, urlParticipante: url };
  }, 'ctrl_sessao_criar');
}

function ctrl_sessao_ativar(id) {
  return GasResponse.wrap(function() {
    var ctx = _ctxSessao();
    var sessao = SessaoInterativaRepository.buscarSessaoPorId(ctx.orgId, id);
    if (!sessao) throw new Error('Sessão não encontrada.');
    if (sessao.criadoPor !== ctx.email && !['admin','superadmin'].includes(ctx.papel)) {
      throw new Error('Sem permissão.');
    }
    return SessaoInterativaRepository.atualizarSessao(ctx.orgId, id, { status: 'ativa', atividadeAtual: 0 });
  }, 'ctrl_sessao_ativar');
}

function ctrl_sessao_avancar(id) {
  return GasResponse.wrap(function() {
    var ctx = _ctxSessao();
    var sessao = SessaoInterativaRepository.buscarSessaoPorId(ctx.orgId, id);
    if (!sessao) throw new Error('Sessão não encontrada.');
    var prox = (sessao.atividadeAtual || 0) + 1;
    var status = prox >= (sessao.atividades||[]).length ? 'encerrada' : sessao.status;
    return SessaoInterativaRepository.atualizarSessao(ctx.orgId, id,
      { atividadeAtual: prox, status: status });
  }, 'ctrl_sessao_avancar');
}

function ctrl_sessao_encerrar(id) {
  return GasResponse.wrap(function() {
    var ctx = _ctxSessao();
    return SessaoInterativaRepository.atualizarSessao(ctx.orgId, id, { status: 'encerrada' });
  }, 'ctrl_sessao_encerrar');
}

function ctrl_sessao_resultados(id) {
  return GasResponse.wrap(function() {
    var ctx    = _ctxSessao();
    var sessao = SessaoInterativaRepository.buscarSessaoPorId(ctx.orgId, id);
    if (!sessao) throw new Error('Sessão não encontrada.');
    var atividadeIdx = sessao.atividadeAtual >= 0 ? sessao.atividadeAtual : 0;
    var respostas = SessaoInterativaRepository.buscarRespostas(ctx.orgId, id, atividadeIdx);
    var totalParticipantes = SessaoInterativaRepository.contarParticipantes(ctx.orgId, id);

    // Agregar resultados da atividade atual
    var atividade = (sessao.atividades||[])[atividadeIdx] || {};
    var contagem = {};
    var palavras  = [];
    var ideias    = [];
    var perguntas = [];

    respostas.forEach(function(r) {
      var resp = r.resposta;
      if (atividade.tipo === 'quiz' || atividade.tipo === 'enquete') {
        contagem[resp] = (contagem[resp] || 0) + 1;
      } else if (atividade.tipo === 'nuvem') {
        palavras.push({ palavra: resp, participante: r.participanteNome });
      } else if (atividade.tipo === 'brainstorm') {
        ideias.push({ texto: resp, participante: r.participanteNome, timestamp: r.timestamp });
      } else if (atividade.tipo === 'qa') {
        perguntas.push({ texto: resp, participante: r.participanteNome, timestamp: r.timestamp });
      }
    });

    return {
      sessao:            { id: sessao.id, titulo: sessao.titulo, status: sessao.status,
                           atividadeAtual: sessao.atividadeAtual, codigo: sessao.codigo },
      atividadeAtual:    atividade,
      totalRespostas:    respostas.length,
      totalParticipantes: totalParticipantes,
      contagem:          contagem,
      palavras:          palavras,
      ideias:            ideias,
      perguntas:         perguntas
    };
  }, 'ctrl_sessao_resultados');
}

// ── Público: participante (sem autenticação interna) ─────────────────────────

/**
 * Valida código e retorna sessão para o participante.
 * Chamado via google.script.run pelo portal de participante.
 */
function ctrl_sessao_publica_entrar(codigo, nomeParticipante) {
  return GasResponse.wrap(function() {
    var orgId  = getOrgConfig().orgId;
    var sessao = SessaoInterativaRepository.buscarSessaoPorCodigo(orgId, codigo);
    if (!sessao) throw new Error('Sessão não encontrada ou não está ativa.');
    var atividadeIdx = sessao.atividadeAtual >= 0 ? sessao.atividadeAtual : 0;
    var atividade    = (sessao.atividades || [])[atividadeIdx] || null;
    return {
      sessaoId:        sessao.id,
      titulo:          sessao.titulo,
      atividadeAtual:  sessao.atividadeAtual,
      atividade:       atividade,
      totalAtividades: (sessao.atividades||[]).length,
      status:          sessao.status
    };
  }, 'ctrl_sessao_publica_entrar');
}

/**
 * Participante envia resposta para atividade atual.
 */
function ctrl_sessao_publica_responder(sessaoId, atividadeIdx, participanteId, participanteNome, resposta) {
  return GasResponse.wrap(function() {
    var orgId = getOrgConfig().orgId;
    var sessao = SessaoInterativaRepository.buscarSessaoPorId(orgId, sessaoId);
    if (!sessao || sessao.status !== 'ativa') throw new Error('Sessão não está ativa.');
    return SessaoInterativaRepository.registrarResposta(orgId, {
      sessaoId: sessaoId,
      atividadeIdx: atividadeIdx,
      participanteId: participanteId,
      participanteNome: participanteNome || 'Participante',
      resposta: resposta
    });
  }, 'ctrl_sessao_publica_responder');
}

/**
 * Participante faz polling para ver atividade atual.
 */
function ctrl_sessao_publica_poll(sessaoId) {
  return GasResponse.wrap(function() {
    var orgId  = getOrgConfig().orgId;
    var sessao = SessaoInterativaRepository.buscarSessaoPorId(orgId, sessaoId);
    if (!sessao) throw new Error('Sessão não encontrada.');
    var atividadeIdx = sessao.atividadeAtual >= 0 ? sessao.atividadeAtual : 0;
    var atividade    = (sessao.atividades || [])[atividadeIdx] || null;
    return {
      atividadeAtual:  sessao.atividadeAtual,
      atividade:       atividade,
      status:          sessao.status,
      totalAtividades: (sessao.atividades||[]).length
    };
  }, 'ctrl_sessao_publica_poll');
}

function fase_sessao_prepararIndice() {
  return GasResponse.wrap(function() {
    SessaoInterativaRepository.prepararIndice();
    return { ok: true };
  }, 'fase_sessao_prepararIndice');
}
