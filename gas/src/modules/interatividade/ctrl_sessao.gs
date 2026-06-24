/**
 * @file modules/interatividade/ctrl_sessao.gs
 * @layer modules/interatividade
 * @description Controller de Sessões Interativas (host interno) e portal público.
 *
 * Endpoints internos (host): ctrl_sessao_*
 * Endpoints públicos (participantes): ctrl_sessao_publica_*
 * Endpoints de templates: ctrl_sessao_listarTemplates, criarTemplate, etc.
 *
 * @depends sessao_interativa_repository.gs, templates_repository.gs,
 *          acesso_service.gs, gas_response.gs
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
    var atualizada = SessaoInterativaRepository.atualizarSessao(ctx.orgId, id, { status: 'ativa', atividadeAtual: 0 });
    var linkParticipante = ScriptApp.getService().getUrl() + '?secao=sessao&codigo=' + atualizada.codigo;
    return { sessao: atualizada, linkParticipante: linkParticipante };
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

    var atividade = (sessao.atividades||[])[atividadeIdx] || {};
    var contagem  = {};
    var palavras  = [];
    var ideias    = [];
    var perguntas = [];

    respostas.forEach(function(r) {
      var resp = r.resposta;
      if (atividade.tipo === 'quiz' || atividade.tipo === 'enquete') {
        contagem[resp] = (contagem[resp] || 0) + 1;
      } else if (atividade.tipo === 'votacao') {
        try {
          var votos = JSON.parse(resp);
          Object.keys(votos).forEach(function(op) {
            contagem[op] = (contagem[op] || 0) + (Number(votos[op]) || 0);
          });
        } catch(e) {}
      } else if (atividade.tipo === 'nuvem') {
        palavras.push({ palavra: resp, participante: r.apelido || r.participanteNome });
      } else if (atividade.tipo === 'brainstorm') {
        ideias.push({ texto: resp, participante: r.apelido || r.participanteNome, timestamp: r.timestamp });
      } else if (atividade.tipo === 'qa') {
        perguntas.push({ texto: resp, participante: r.apelido || r.participanteNome, timestamp: r.timestamp });
      }
    });

    return {
      sessao:            { id: sessao.id, titulo: sessao.titulo, status: sessao.status,
                           atividadeAtual: sessao.atividadeAtual, codigo: sessao.codigo,
                           gamificacao: sessao.gamificacao || { habilitada: false } },
      atividadeAtual:    atividade,
      indiceAtual:       atividadeIdx,
      totalAtividades:   (sessao.atividades||[]).length,
      totalRespostas:    respostas.length,
      totalParticipantes: totalParticipantes,
      contagem:          contagem,
      palavras:          palavras,
      ideias:            ideias,
      perguntas:         perguntas
    };
  }, 'ctrl_sessao_resultados');
}

// ── Ranking ──────────────────────────────────────────────────────────────────

function ctrl_sessao_ranking(sessaoId) {
  return GasResponse.wrap(function() {
    var ctx = _ctxSessao();
    var orgId = ctx.orgId;
    var respostas = SessaoInterativaRepository.buscarRespostas(orgId, sessaoId, null);

    var mapa = {};
    respostas.forEach(function(r) {
      var pid = r.participanteId;
      if (!mapa[pid]) {
        mapa[pid] = {
          participanteId: pid,
          nome:           r.participanteNome || 'Anônimo',
          avatar:         r.avatar || '',
          apelido:        r.apelido || '',
          pontos:         0,
          acertos:        0,
          total:          0
        };
      }
      mapa[pid].pontos  += Number(r.pontos_ganhos) || 0;
      mapa[pid].total   += 1;
      if (r.correta === true) mapa[pid].acertos += 1;
    });

    var ranking = Object.values(mapa).sort(function(a, b) {
      return b.pontos - a.pontos || b.acertos - a.acertos;
    }).map(function(p, i) {
      return Object.assign({ pos: i + 1 }, p);
    });

    return { ranking: ranking };
  }, 'ctrl_sessao_ranking');
}

// ── Templates ────────────────────────────────────────────────────────────────

function ctrl_sessao_listarTemplates(filtros) {
  return GasResponse.wrap(function() {
    var ctx = _ctxSessao();
    return TemplatesInteratividadeRepository.listarTemplates(ctx.orgId, filtros || {}, ctx.email);
  }, 'ctrl_sessao_listarTemplates');
}

function ctrl_sessao_criarTemplate(dados) {
  return GasResponse.wrap(function() {
    var ctx = _ctxSessao();
    // Se sessaoId fornecido, copiar atividades da sessão como template
    if (dados && dados.sessaoId) {
      var sessao = SessaoInterativaRepository.buscarSessaoPorId(ctx.orgId, dados.sessaoId);
      if (!sessao) throw new Error('Sessão não encontrada.');
      dados = Object.assign({}, dados, {
        atividades:     sessao.atividades || [],
        modoIdentidade: dados.modoIdentidade || sessao.modoIdentidade || 'escolha',
        gamificacao:    dados.gamificacao || sessao.gamificacao || { habilitada: false, pontosPorAcerto: 10, bonusVelocidade: false }
      });
      delete dados.sessaoId;
    }
    var tpl = TemplatesInteratividadeRepository.criarTemplate(ctx.orgId, dados, ctx.email);
    AuditoriaService.registrar('TEMPLATE_CRIADO', 'interatividade', { id: tpl.id, titulo: tpl.titulo });
    return tpl;
  }, 'ctrl_sessao_criarTemplate');
}

function ctrl_sessao_atualizarTemplate(id, campos) {
  return GasResponse.wrap(function() {
    var ctx = _ctxSessao();
    var tpl = TemplatesInteratividadeRepository.atualizarTemplate(ctx.orgId, id, campos || {}, ctx.email, ctx.papel);
    AuditoriaService.registrar('TEMPLATE_ATUALIZADO', 'interatividade', { id: id });
    return tpl;
  }, 'ctrl_sessao_atualizarTemplate');
}

function ctrl_sessao_excluirTemplate(id) {
  return GasResponse.wrap(function() {
    var ctx = _ctxSessao();
    var r = TemplatesInteratividadeRepository.excluirTemplate(ctx.orgId, id, ctx.email, ctx.papel);
    AuditoriaService.registrar('TEMPLATE_EXCLUIDO', 'interatividade', { id: id });
    return r;
  }, 'ctrl_sessao_excluirTemplate');
}

function ctrl_sessao_criarDeTemplate(templateId, dados) {
  return GasResponse.wrap(function() {
    var ctx = _ctxSessao();
    var tpl = TemplatesInteratividadeRepository.buscarPorId(ctx.orgId, templateId);
    if (!tpl) throw new Error('Template não encontrado: ' + templateId);
    dados = dados || {};
    var sessaoData = {
      titulo:         dados.titulo || tpl.titulo,
      descricao:      dados.descricao || tpl.descricao || '',
      atividades:     JSON.parse(JSON.stringify(tpl.atividades || [])),
      modoIdentidade: dados.modoIdentidade || tpl.modoIdentidade || 'escolha',
      gamificacao:    dados.gamificacao    || tpl.gamificacao    || { habilitada: false, pontosPorAcerto: 10, bonusVelocidade: false },
      templateId:     templateId,
      acaoId:         dados.acaoId    || null,
      reuniaoId:      dados.reuniaoId || null
    };
    var sessao = SessaoInterativaRepository.criarSessao(ctx.orgId, sessaoData, ctx.email);
    var url = ScriptApp.getService().getUrl() + '?secao=sessao&codigo=' + sessao.codigo;
    return { sessao: sessao, urlParticipante: url };
  }, 'ctrl_sessao_criarDeTemplate');
}

// ── Público: participante (sem autenticação interna) ─────────────────────────

function ctrl_sessao_publica_entrar(codigo, nomeParticipante, avatar, apelido) {
  return GasResponse.wrap(function() {
    var orgId  = getOrgConfig().orgId;
    var sessao = SessaoInterativaRepository.buscarSessaoPorCodigo(orgId, codigo);
    if (!sessao) throw new Error('Sessão não encontrada ou não está ativa.');
    var atividadeIdx = sessao.atividadeAtual >= 0 ? sessao.atividadeAtual : 0;
    var atividade    = (sessao.atividades || [])[atividadeIdx] || null;
    var gamificacao  = sessao.gamificacao || { habilitada: false };
    return {
      sessaoId:          sessao.id,
      titulo:            sessao.titulo,
      atividadeAtual:    sessao.atividadeAtual,
      atividade:         atividade,
      totalAtividades:   (sessao.atividades||[]).length,
      status:            sessao.status,
      modoIdentidade:    sessao.modoIdentidade || 'escolha',
      gamificacaoHabilitada: gamificacao.habilitada || false
    };
  }, 'ctrl_sessao_publica_entrar');
}

function ctrl_sessao_publica_responder(sessaoId, atividadeIdx, participanteId, participanteNome, resposta, avatar, apelido, tempoResposta) {
  return GasResponse.wrap(function() {
    var orgId  = getOrgConfig().orgId;
    var sessao = SessaoInterativaRepository.buscarSessaoPorId(orgId, sessaoId);
    if (!sessao || sessao.status !== 'ativa') throw new Error('Sessão não está ativa.');

    var atividade   = (sessao.atividades || [])[atividadeIdx] || {};
    var gamificacao = sessao.gamificacao || { habilitada: false, pontosPorAcerto: 10, bonusVelocidade: false };
    var correta     = null;
    var pontosGanhos = 0;

    if (atividade.tipo === 'quiz' && atividade.gabarito) {
      correta = (resposta === atividade.gabarito);
      if (correta) {
        pontosGanhos = Number(atividade.pontos) || Number(gamificacao.pontosPorAcerto) || 10;
        // Bônus de velocidade: até +50% se respondeu na primeira metade do timer
        if (gamificacao.bonusVelocidade && atividade.tempo > 0 && tempoResposta != null) {
          var metade = atividade.tempo / 2;
          if (Number(tempoResposta) <= metade) {
            pontosGanhos = Math.round(pontosGanhos * 1.5);
          }
        }
      }
    }

    var resp = SessaoInterativaRepository.registrarResposta(orgId, {
      sessaoId:         sessaoId,
      atividadeIdx:     atividadeIdx,
      participanteId:   participanteId,
      participanteNome: participanteNome || 'Participante',
      resposta:         resposta,
      avatar:           avatar || '',
      apelido:          apelido || '',
      correta:          correta,
      pontos_ganhos:    pontosGanhos,
      tempo_resposta:   tempoResposta != null ? Number(tempoResposta) : null
    });

    return { resposta: resp, correta: correta, pontos_ganhos: pontosGanhos,
             gabarito: atividade.gabarito || null };
  }, 'ctrl_sessao_publica_responder');
}

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
    TemplatesInteratividadeRepository.prepararIndice();
    return { ok: true };
  }, 'fase_sessao_prepararIndice');
}
