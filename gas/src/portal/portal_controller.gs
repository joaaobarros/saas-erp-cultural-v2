/**
 * @file portal/portal_controller.gs
 * @layer portal
 * @description Controllers PÚBLICOS do portal externo (sem autenticação).
 *
 * SEGURANÇA:
 *   - Sem AcessoService.verificar() — endpoints públicos
 *   - Rate limiting por chave de ação + janela de 30 min (CacheService)
 *   - Validação rígida de entrada em todo endpoint de escrita
 *   - Dados retornados minimizados (sem campos internos/sensíveis)
 *
 * Endpoints disponíveis:
 *   ctrl_portal_getAgenda          — lista eventos com visibilidadePublica:true
 *   ctrl_portal_getInfoAcao        — info pública + capacidade de uma Ação
 *   ctrl_portal_inscrever          — inscrição em Ação (com consentimento LGPD)
 *   ctrl_portal_solicitarPauta     — solicitação de cessão de pauta
 *   ctrl_portal_getStatusPauta     — consulta pública de status por protocolo+email
 *   ctrl_portal_listarEspacos      — espaços com aceitaReserva:true
 *   ctrl_portal_registrarPesquisa  — pesquisa de satisfação pós-evento
 *
 * @depends publico_engine.gs, publico_repository.gs,
 *          consentimento_service.gs, solicitacao_reserva_engine.gs,
 *          acao_repository.gs, core/services/admin_controller.gs,
 *          shared/response.gs, core/logger.gs
 */

// ─── Rate limiting ────────────────────────────────────────────────────────────

/**
 * Verifica e incrementa contador de rate limit.
 * Janela: 30 min. Limites por tipo de operação.
 */
function _portalRateLimit(chave, limite) {
  try {
    var cache  = CacheService.getScriptCache();
    var key    = 'rl_portal_' + chave + '_' + Math.floor(Date.now() / 1800000);
    var count  = parseInt(cache.get(key) || '0');
    if (count >= limite) return false;
    cache.put(key, String(count + 1), 1800);
    return true;
  } catch(e) {
    return true; // falha silenciosa: não bloquear por erro de cache
  }
}

function _portalRateLimitEmail(email, operacao, limite) {
  var chave = operacao + '_' + email.replace(/[^a-z0-9]/gi, '').slice(0, 20);
  return _portalRateLimit(chave, limite);
}

// ─── Agenda pública ──────────────────────────────────────────────────────────

/**
 * Retorna ações com visibilidadePublica:true.
 * @param {Object} filtros — { tipo, dataInicio, dataFim, espacoId }
 */
function ctrl_portal_getAgenda(filtros) {
  return GasResponse.wrap(function() {
    filtros = filtros || {};
    var orgId = getOrgConfig().orgId;

    var cached = CacheService.get('portal_agenda_' + JSON.stringify(filtros));
    if (cached) return JSON.parse(cached);

    var acoes = AcaoRepository.listar(orgId, { visibilidadePublica: true })
      .filter(function(a) {
        if (a.status === 'cancelada' || a.status === 'rascunho') return false;
        if (filtros.tipo && a.tipo !== filtros.tipo) return false;
        if (filtros.dataInicio && a.dataFim   < filtros.dataInicio) return false;
        if (filtros.dataFim    && a.dataInicio > filtros.dataFim)   return false;
        return true;
      })
      .map(function(a) {
        var cap = PublicoEngine.obterCapacidade(a.id, orgId);
        return {
          id:             a.id,
          nome:           a.nome,
          tipo:           a.tipo,
          status:         a.status,
          dataInicio:     a.dataInicio,
          dataFim:        a.dataFim,
          responsavel:    a.responsavel,
          setor:          a.setor,
          vagas:          cap.vagas,
          disponivel:     cap.disponivel
        };
      });

    CacheService.set('portal_agenda_' + JSON.stringify(filtros), JSON.stringify(acoes), 300);
    return acoes;
  }, 'ctrl_portal_getAgenda');
}

// ─── Info de uma Ação pública ─────────────────────────────────────────────────

/**
 * Retorna informações públicas de uma Ação + capacidade.
 * @param {string} acaoId
 */
function ctrl_portal_getInfoAcao(acaoId) {
  return GasResponse.wrap(function() {
    if (!acaoId) throw new Error('acaoId obrigatório.');
    var orgId = getOrgConfig().orgId;
    var acao  = AcaoRepository.buscarPorId(orgId, acaoId);
    if (!acao || !acao.visibilidadePublica) throw new Error('Ação não disponível.');

    var cap = PublicoEngine.obterCapacidade(acaoId, orgId);
    return {
      id:          acao.id,
      nome:        acao.nome,
      tipo:        acao.tipo,
      status:      acao.status,
      dataInicio:  acao.dataInicio,
      dataFim:     acao.dataFim,
      responsavel: acao.responsavel,
      setor:       acao.setor,
      vagas:       cap.vagas,
      disponivel:  cap.disponivel,
      listaEspera: cap.listaEspera > 0
    };
  }, 'ctrl_portal_getInfoAcao');
}

// ─── Inscrição ────────────────────────────────────────────────────────────────

/**
 * Realiza inscrição em uma Ação (com registro de consentimento LGPD).
 * @param {Object} dados — { acaoId, nome, email, telefone, idade, cep, ocupacao, comoSoube, consentimento }
 */
function ctrl_portal_inscrever(dados) {
  return GasResponse.wrap(function() {
    dados = dados || {};
    if (!dados.email) throw new Error('E-mail obrigatório.');
    if (!dados.acaoId) throw new Error('acaoId obrigatório.');

    var email = dados.email.toLowerCase().trim();

    if (!_portalRateLimitEmail(email, 'inscricao', 3)) {
      throw new Error('Muitas tentativas. Tente novamente em 30 minutos.');
    }

    if (!dados.consentimento) {
      throw new Error('Consentimento LGPD obrigatório para inscrição.');
    }

    var orgId = getOrgConfig().orgId;

    // Registrar consentimento LGPD
    var consentimentoId = ConsentimentoService.registrar({
      email:      email,
      finalidade: ConsentimentoService.FINALIDADES.INSCRICAO_ACAO,
      baseLegal:  ConsentimentoService.BASES_LEGAIS.CONSENTIMENTO,
      origem:     'portal_inscricao',
      orgId:      orgId,
      extras:     { acaoId: dados.acaoId }
    });

    var resultado = PublicoEngine.inscrever(dados.acaoId, orgId, dados, consentimentoId);

    return {
      protocolo:   resultado.protocolo,
      status:      resultado.status,
      mensagem:    resultado.status === 'lista_espera'
        ? 'Você está na lista de espera. Avisaremos por e-mail caso uma vaga abra.'
        : 'Inscrição realizada! Você receberá confirmação por e-mail.'
    };
  }, 'ctrl_portal_inscrever');
}

// ─── Cessão de Pauta ─────────────────────────────────────────────────────────

/**
 * Submete solicitação de cessão de pauta.
 * @param {Object} dados — { nome, email, telefone, entidade, tipoAtividade, espacoId,
 *                           dataDesejada, horarioInicio, horarioFim, descricao,
 *                           publicoEsperado, consentimento }
 */
function ctrl_portal_solicitarPauta(dados) {
  return GasResponse.wrap(function() {
    dados = dados || {};
    if (!dados.email) throw new Error('E-mail obrigatório.');
    if (!dados.nome)  throw new Error('Nome obrigatório.');
    if (!dados.espacoId || !dados.dataDesejada)
      throw new Error('Espaço e data desejada são obrigatórios.');

    var email = dados.email.toLowerCase().trim();

    if (!_portalRateLimitEmail(email, 'cessao', 2)) {
      throw new Error('Muitas tentativas. Tente novamente em 30 minutos.');
    }

    if (!dados.consentimento) {
      throw new Error('Consentimento LGPD obrigatório.');
    }

    var orgId = getOrgConfig().orgId;

    // Validar antecedência mínima (15 dias)
    var dataDesejada = new Date(dados.dataDesejada);
    var hoje         = new Date();
    var diffDias     = Math.floor((dataDesejada - hoje) / 86400000);
    if (diffDias < 15) {
      throw new Error('A cessão deve ser solicitada com no mínimo 15 dias de antecedência.');
    }

    // Registrar consentimento
    ConsentimentoService.registrar({
      email:      email,
      finalidade: ConsentimentoService.FINALIDADES.CESSAO_PAUTA,
      baseLegal:  ConsentimentoService.BASES_LEGAIS.CONSENTIMENTO,
      origem:     'portal_cessao',
      orgId:      orgId
    });

    // Criar solicitação de reserva via engine existente
    var dadosSolicitacao = {
      solicitanteNome:     dados.nome,
      solicitanteEmail:    email,
      solicitanteTelefone: dados.telefone || '',
      entidade:            dados.entidade || '',
      tipoAtividade:       dados.tipoAtividade || 'cessao_pauta',
      espacoId:            dados.espacoId,
      dataDesejada:        dados.dataDesejada,
      horarioInicio:       dados.horarioInicio || '',
      horarioFim:          dados.horarioFim    || '',
      descricao:           dados.descricao     || '',
      publicoEsperado:     dados.publicoEsperado || 0,
      origem:              'portal_externo'
    };

    var solicitacao = SolicitacaoReservaEngine.criar(dadosSolicitacao, orgId, 'portal');

    return {
      protocolo: solicitacao.id,
      mensagem:  'Solicitação enviada com sucesso! Protocolo: ' + solicitacao.id +
                 '. Você receberá uma resposta no e-mail informado em até 5 dias úteis.'
    };
  }, 'ctrl_portal_solicitarPauta');
}

// ─── Status de cessão de pauta ────────────────────────────────────────────────

/**
 * Consulta pública de status de cessão de pauta.
 * @param {Object} dados — { protocolo, email }
 */
function ctrl_portal_getStatusPauta(dados) {
  return GasResponse.wrap(function() {
    dados = dados || {};
    if (!dados.protocolo || !dados.email)
      throw new Error('Protocolo e e-mail são obrigatórios.');

    var email = dados.email.toLowerCase().trim();

    if (!_portalRateLimitEmail(email, 'status_pauta', 10)) {
      throw new Error('Muitas consultas. Tente novamente em 30 minutos.');
    }

    var orgId = getOrgConfig().orgId;
    var sol   = SolicitacaoReservaRepository.buscarPorId(dados.protocolo, orgId);

    if (!sol || sol.solicitanteEmail !== email) {
      throw new Error('Solicitação não encontrada para este e-mail.');
    }

    var MSG_STATUS = {
      'submetida':          'Sua solicitação está sendo analisada. Prazo estimado: 5 dias úteis.',
      'em_analise':         'Sua solicitação está em análise pela equipe.',
      'aprovada':           'Sua solicitação foi aprovada! Em breve entraremos em contato.',
      'recusada':           'Sua solicitação foi recusada. Motivo: ' + (sol.motivoRecusa || 'não informado') + '.',
      'cancelada':          'Sua solicitação foi cancelada.',
      'aguardando_pagamento': 'Aguardando confirmação de pagamento/documentação.'
    };

    return {
      protocolo:   sol.id,
      status:      sol.status,
      mensagem:    MSG_STATUS[sol.status] || 'Status: ' + sol.status,
      criadoEm:    sol.criadoEm,
      espacoId:    sol.espacoId,
      dataDesejada: sol.dataDesejada
    };
  }, 'ctrl_portal_getStatusPauta');
}

// ─── Espaços públicos ─────────────────────────────────────────────────────────

/**
 * Lista espaços disponíveis para cessão de pauta.
 */
function ctrl_portal_listarEspacos() {
  return GasResponse.wrap(function() {
    var cached = CacheService.get('portal_espacos');
    if (cached) return JSON.parse(cached);

    var espacos = (SistemaConfigService.getEspacos ? SistemaConfigService.getEspacos() : [])
      .filter(function(e) { return e.aceitaReserva && e.ativo !== false; })
      .map(function(e) {
        return {
          id:          e.id,
          nome:        e.nome,
          tipoEspaco:  e.tipoEspaco,
          capacidade:  e.capacidade
        };
      });

    CacheService.set('portal_espacos', JSON.stringify(espacos), 600);
    return espacos;
  }, 'ctrl_portal_listarEspacos');
}

// ─── Pesquisa de satisfação (pública, pós-evento) ─────────────────────────────

/**
 * Registra pesquisa de satisfação via portal.
 * @param {Object} dados — { acaoId, inscricaoId, email, nota, recomendaria, comentario }
 */
function ctrl_portal_registrarPesquisa(dados) {
  return GasResponse.wrap(function() {
    dados = dados || {};
    if (!dados.acaoId) throw new Error('acaoId obrigatório.');
    if (!dados.nota)   throw new Error('Nota obrigatória.');

    var email = (dados.email || '').toLowerCase().trim();
    if (email && !_portalRateLimitEmail(email, 'pesquisa', 5)) {
      throw new Error('Muitas tentativas. Tente novamente em 30 minutos.');
    }

    var orgId = getOrgConfig().orgId;
    PublicoEngine.registrarPesquisa(dados, orgId);
    return { mensagem: 'Obrigado pelo seu feedback!' };
  }, 'ctrl_portal_registrarPesquisa');
}
