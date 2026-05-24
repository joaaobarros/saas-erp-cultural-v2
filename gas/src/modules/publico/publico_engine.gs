/**
 * @file modules/publico/publico_engine.gs
 * @layer modules/publico
 * @description Engine de Público — inscrições, presença, pesquisa e certificados.
 *
 * Regras de negócio:
 *   - Capacidade por Ação controlada pelo campo publicoPrevisto da AcaoRepository
 *   - Lista de espera automática quando capacidade atingida
 *   - Frequência mínima configurável (padrão 75%) para emissão de certificado
 *   - Pesquisa disparada 3 dias após Ação concluída (via evento ACTION_COMPLETED)
 *   - Cancelamento promove automaticamente o primeiro da lista de espera
 *
 * FSM de inscrição:
 *   inscrito → confirmado → presente → certificado
 *           → lista_espera → inscrito (quando vaga abre)
 *           → cancelado (a qualquer momento)
 *
 * @depends publico_repository.gs, acao_repository.gs, consentimento_service.gs,
 *          core/services/auditoria_service.gs, core/events_constants.gs,
 *          core/utils.gs, core/logger.gs
 */

var PublicoEngine = (function () {

  var FREQ_MINIMA_PADRAO = 75; // % para certificado

  // ─── Inscrições ───────────────────────────────────────────────────────────

  /**
   * Inscreve participante em uma Ação.
   * Vai para lista de espera se capacidade atingida.
   *
   * @param {string} acaoId
   * @param {string} orgId
   * @param {Object} dados — { nome, email, telefone, idade, cep, ocupacao, comoSoube }
   * @param {string} [consentimentoId]
   * @returns {Object} inscricao criada
   */
  function inscrever(acaoId, orgId, dados, consentimentoId) {
    dados = dados || {};
    if (!acaoId) throw new Error('acaoId obrigatório.');
    if (!dados.nome || !dados.email) throw new Error('nome e email são obrigatórios.');

    var acao = AcaoRepository.buscarPorId(orgId, acaoId);
    if (!acao) throw new Error('Ação não encontrada: ' + acaoId);
    if (acao.status !== 'em_execucao' && acao.status !== 'planejada' && acao.status !== 'aprovada') {
      throw new Error('Ação não está disponível para inscrições (status: ' + acao.status + ').');
    }

    var emailNorm = dados.email.toLowerCase().trim();

    // Verificar duplicata
    var existente = PublicoRepository.Inscricoes.listar(orgId, { acaoId: acaoId, email: emailNorm })
      .filter(function(i) { return i.status !== 'cancelado'; });
    if (existente.length) throw new Error('Este e-mail já está inscrito nesta ação.');

    var capacidade    = acao.publicoPrevisto || 0;
    var totalAtivos   = PublicoRepository.Inscricoes.contarAtivos(orgId, acaoId);
    var listaEspera   = capacidade > 0 && totalAtivos >= capacidade;

    var id = gerarId('INS');
    var inscricao = {
      id:                 id,
      orgId:              orgId,
      acaoId:             acaoId,
      acaoNome:           acao.nome || '',
      nome:               dados.nome.trim(),
      email:              emailNorm,
      telefone:           dados.telefone || '',
      idade:              dados.idade    || null,
      cep:                dados.cep      || '',
      ocupacao:           dados.ocupacao || '',
      comoSoube:          dados.comoSoube || '',
      status:             listaEspera ? 'lista_espera' : 'inscrito',
      protocolo:          id,
      consentimentoId:    consentimentoId || '',
      canceladoEm:        null,
      motivoCancelamento: ''
    };

    var resultado = PublicoRepository.Inscricoes.salvar(orgId, inscricao);

    AuditoriaService.registrar(
      listaEspera ? 'INSCRICAO_LISTA_ESPERA' : 'INSCRICAO_CRIADA',
      'publico', { acaoId: acaoId, email: emailNorm, id: id }
    );

    _enviarConfirmacaoInscricao(resultado, acao);

    Logger.info('publico_engine', 'inscrever',
      (listaEspera ? 'Lista espera' : 'Inscricao') + ': ' + id + ' / ' + emailNorm);
    return resultado;
  }

  /**
   * Confirma inscrição (inscrito → confirmado).
   */
  function confirmarInscricao(id, orgId) {
    var ins = _buscarOuFalhar(id, orgId);
    if (ins.status !== 'inscrito') throw new Error('Inscrição não está no status "inscrito".');

    ins.status       = 'confirmado';
    ins.confirmadoEm = new Date().toISOString();
    var resultado = PublicoRepository.Inscricoes.salvar(orgId, ins);
    AuditoriaService.registrar('INSCRICAO_CONFIRMADA', 'publico', { id: id });
    return resultado;
  }

  /**
   * Cancela inscrição e promove próximo da lista de espera.
   */
  function cancelarInscricao(id, orgId, motivo) {
    var ins = _buscarOuFalhar(id, orgId);
    if (ins.status === 'cancelado') throw new Error('Inscrição já está cancelada.');

    var statusAnterior       = ins.status;
    ins.status               = 'cancelado';
    ins.canceladoEm          = new Date().toISOString();
    ins.motivoCancelamento   = motivo || '';
    PublicoRepository.Inscricoes.salvar(orgId, ins);

    AuditoriaService.registrar('INSCRICAO_CANCELADA', 'publico',
      { id: id, motivo: motivo, statusAnterior: statusAnterior });

    // Promover primeiro da lista de espera se havia vaga ativa
    if (statusAnterior === 'inscrito' || statusAnterior === 'confirmado') {
      _promoverListaEspera(ins.acaoId, orgId);
    }
    return true;
  }

  // ─── Presença ─────────────────────────────────────────────────────────────

  /**
   * Registra presença de um participante numa sessão.
   *
   * @param {Object} dados — { acaoId, inscricaoId, sessaoId, sessaoNome, presente }
   * @param {string} orgId
   * @param {string} userId — quem registrou
   */
  function registrarPresenca(dados, orgId, userId) {
    dados = dados || {};
    if (!dados.acaoId || !dados.inscricaoId)
      throw new Error('acaoId e inscricaoId são obrigatórios.');

    var ins = _buscarOuFalhar(dados.inscricaoId, orgId);
    if (ins.status === 'cancelado') throw new Error('Inscrição cancelada — não é possível registrar presença.');

    var presenca = {
      id:            gerarId('PRE'),
      orgId:         orgId,
      acaoId:        dados.acaoId,
      inscricaoId:   dados.inscricaoId,
      sessaoId:      dados.sessaoId   || 'sessao-unica',
      sessaoNome:    dados.sessaoNome || 'Sessão Única',
      presente:      dados.presente !== false,
      checkInEm:     new Date().toISOString(),
      registradoPor: userId || 'sistema'
    };

    var resultado = PublicoRepository.Presencas.salvar(orgId, presenca);

    // Atualizar status da inscrição para "presente" se confirmado/inscrito
    if (dados.presente !== false && (ins.status === 'inscrito' || ins.status === 'confirmado')) {
      ins.status = 'presente';
      PublicoRepository.Inscricoes.salvar(orgId, ins);
    }

    AuditoriaService.registrar('PRESENCA_REGISTRADA', 'publico',
      { inscricaoId: dados.inscricaoId, sessaoId: dados.sessaoId, presente: dados.presente });
    return resultado;
  }

  // ─── Pesquisa de satisfação ───────────────────────────────────────────────

  /**
   * Registra resposta de pesquisa de satisfação.
   *
   * @param {Object} dados — { acaoId, inscricaoId, nota (1-10), recomendaria, comentario }
   * @param {string} orgId
   */
  function registrarPesquisa(dados, orgId) {
    dados = dados || {};
    if (!dados.acaoId || !dados.nota) throw new Error('acaoId e nota são obrigatórios.');

    var nota = parseInt(dados.nota);
    if (isNaN(nota) || nota < 1 || nota > 10) throw new Error('Nota deve ser entre 1 e 10.');

    if (dados.inscricaoId) {
      var jaRespondeu = PublicoRepository.Pesquisas.jaRespondeu(orgId, dados.inscricaoId);
      if (jaRespondeu) throw new Error('Esta inscrição já respondeu a pesquisa.');
    }

    var pesquisa = {
      id:           gerarId('PES'),
      orgId:        orgId,
      acaoId:       dados.acaoId,
      inscricaoId:  dados.inscricaoId || '',
      email:        (dados.email || '').toLowerCase().trim(),
      nota:         nota,
      recomendaria: dados.recomendaria !== false,
      comentario:   dados.comentario || ''
    };

    var resultado = PublicoRepository.Pesquisas.salvar(orgId, pesquisa);
    AuditoriaService.registrar('PESQUISA_REGISTRADA', 'publico',
      { acaoId: dados.acaoId, nota: nota });
    return resultado;
  }

  // ─── Certificados ─────────────────────────────────────────────────────────

  /**
   * Gera certificado de conclusão para um participante.
   * Requer frequência >= freqMinima (padrão: 75%).
   *
   * @param {string} inscricaoId
   * @param {string} orgId
   * @param {number} [totalSessoes] — se omitido usa 1 sessão (evento pontual)
   * @returns {Object} certificado
   */
  function gerarCertificado(inscricaoId, orgId, totalSessoes) {
    var ins = _buscarOuFalhar(inscricaoId, orgId);

    if (PublicoRepository.Certificados.jaGerou(orgId, inscricaoId)) {
      throw new Error('Certificado já emitido para esta inscrição.');
    }

    totalSessoes = totalSessoes || 1;
    var frequencia = PublicoRepository.Presencas.calcularFrequencia(orgId, inscricaoId, totalSessoes);

    // Frequência mínima configurável
    var org      = getOrgConfig();
    var freqMin  = (org.freqMinCertificado != null) ? org.freqMinCertificado : FREQ_MINIMA_PADRAO;

    if (frequencia < freqMin && totalSessoes > 1) {
      throw new Error(
        'Frequência insuficiente para certificado: ' + frequencia +
        '% (mínimo: ' + freqMin + '%).'
      );
    }

    var acao = AcaoRepository.buscarPorId(orgId, ins.acaoId);

    var certificado = {
      id:           gerarId('CER'),
      orgId:        orgId,
      acaoId:       ins.acaoId,
      acaoNome:     ins.acaoNome || (acao ? acao.nome : ''),
      inscricaoId:  inscricaoId,
      nome:         ins.nome,
      email:        ins.email,
      frequencia:   frequencia,
      urlDoc:       ''
    };

    var resultado = PublicoRepository.Certificados.salvar(orgId, certificado);

    // Atualizar status da inscrição
    ins.status = 'certificado';
    PublicoRepository.Inscricoes.salvar(orgId, ins);

    AuditoriaService.registrar('CERTIFICADO_GERADO', 'publico',
      { inscricaoId: inscricaoId, frequencia: frequencia });
    _enviarEmailCertificado(resultado);
    return resultado;
  }

  // ─── Capacidade ──────────────────────────────────────────────────────────

  function obterCapacidade(acaoId, orgId) {
    var acao      = AcaoRepository.buscarPorId(orgId, acaoId);
    var capacidade = acao ? (acao.publicoPrevisto || 0) : 0;
    var ativos     = PublicoRepository.Inscricoes.contarAtivos(orgId, acaoId);
    var espera     = PublicoRepository.Inscricoes.contarListaEspera(orgId, acaoId);
    return {
      capacidade:   capacidade,
      inscritos:    ativos,
      vagas:        capacidade > 0 ? Math.max(0, capacidade - ativos) : null,
      listaEspera:  espera,
      disponivel:   capacidade === 0 || ativos < capacidade
    };
  }

  // ─── Métricas ─────────────────────────────────────────────────────────────

  function obterMetricas(orgId) {
    var inscricoes   = PublicoRepository.Inscricoes.listar(orgId, {});
    var presencas    = PublicoRepository.Presencas.listar(orgId, {});
    var certificados = PublicoRepository.Certificados.listar(orgId, {});
    var nps          = PublicoRepository.Pesquisas.calcularNPS(orgId, null);

    var statusCounts = {};
    inscricoes.forEach(function(i) {
      statusCounts[i.status] = (statusCounts[i.status] || 0) + 1;
    });

    return {
      totalInscricoes:   inscricoes.length,
      inscritos:         statusCounts['inscrito']     || 0,
      confirmados:       statusCounts['confirmado']   || 0,
      listaEspera:       statusCounts['lista_espera'] || 0,
      presentes:         statusCounts['presente']     || 0,
      cancelados:        statusCounts['cancelado']    || 0,
      certificados:      certificados.length,
      registrosPresenca: presencas.length,
      nps:               nps
    };
  }

  // ─── Dados para CODIP ─────────────────────────────────────────────────────

  /**
   * Retorna dados de público para exportação CODIP.
   * Filtra inscrições reais (não canceladas) por mês/ano.
   *
   * @param {string} orgId
   * @param {number} mes — 1-12
   * @param {number} ano — ex: 2024
   */
  function obterDadosCODIP(orgId, mes, ano) {
    var inscricoes = PublicoRepository.Inscricoes.listar(orgId, {})
      .filter(function(i) {
        if (i.status === 'cancelado') return false;
        var d = new Date(i.criadoEm);
        return (!mes || d.getMonth() + 1 === mes) && (!ano || d.getFullYear() === ano);
      });

    // Agregar por ação
    var porAcao = {};
    inscricoes.forEach(function(i) {
      if (!porAcao[i.acaoId]) {
        porAcao[i.acaoId] = { acaoId: i.acaoId, acaoNome: i.acaoNome, total: 0, faixas: {} };
      }
      porAcao[i.acaoId].total++;
      var faixa = _faixaEtaria(i.idade);
      porAcao[i.acaoId].faixas[faixa] = (porAcao[i.acaoId].faixas[faixa] || 0) + 1;
    });

    return Object.values(porAcao);
  }

  // ─── Privados ─────────────────────────────────────────────────────────────

  function _buscarOuFalhar(id, orgId) {
    var ins = PublicoRepository.Inscricoes.buscarPorId(orgId, id);
    if (!ins) throw new Error('Inscrição não encontrada: ' + id);
    return ins;
  }

  function _promoverListaEspera(acaoId, orgId) {
    try {
      var proximo = PublicoRepository.Inscricoes.primeiroNaEspera(orgId, acaoId);
      if (!proximo) return;

      proximo.status = 'inscrito';
      PublicoRepository.Inscricoes.salvar(orgId, proximo);

      AuditoriaService.registrar('INSCRICAO_PROMOVIDA_ESPERA', 'publico',
        { id: proximo.id, acaoId: acaoId });

      try {
        var acao = AcaoRepository.buscarPorId(orgId, acaoId);
        var nomeAcao = acao ? acao.nome : acaoId;
        GmailApp.sendEmail(
          proximo.email,
          'Vaga disponível! — ' + nomeAcao,
          'Olá ' + proximo.nome + ',\n\nUma vaga ficou disponível na ação "' + nomeAcao +
          '".\nSua inscrição foi confirmada automaticamente.\n\nProtocolo: ' + proximo.id +
          '\n\n— CCBJ'
        );
      } catch(_) {}
    } catch(e) {
      Logger.warn('publico_engine', '_promoverListaEspera', e.message);
    }
  }

  function _enviarConfirmacaoInscricao(ins, acao) {
    try {
      var nomeAcao = acao ? acao.nome : ins.acaoId;
      var listaEspera = ins.status === 'lista_espera';
      var assunto = listaEspera
        ? 'Lista de espera — ' + nomeAcao
        : 'Inscrição confirmada — ' + nomeAcao;
      var corpo = 'Olá ' + ins.nome + ',\n\n' +
        (listaEspera
          ? 'Você foi adicionado(a) à lista de espera para "' + nomeAcao + '".\nAvisaremos caso uma vaga seja liberada.'
          : 'Sua inscrição em "' + nomeAcao + '" foi recebida com sucesso!') +
        '\n\nProtocolo: ' + ins.protocolo +
        '\n\n— CCBJ';
      GmailApp.sendEmail(ins.email, assunto, corpo);
    } catch(e) {
      Logger.warn('publico_engine', '_enviarConfirmacaoInscricao', e.message);
    }
  }

  function _enviarEmailCertificado(cert) {
    try {
      GmailApp.sendEmail(
        cert.email,
        'Certificado de participação — ' + cert.acaoNome,
        'Olá ' + cert.nome + ',\n\nParabéns! Você concluiu "' + cert.acaoNome +
        '" com ' + cert.frequencia + '% de frequência.\n' +
        'Seu certificado foi gerado.\n\n— CCBJ'
      );
    } catch(e) {
      Logger.warn('publico_engine', '_enviarEmailCertificado', e.message);
    }
  }

  function _faixaEtaria(idade) {
    if (!idade) return 'nao_informado';
    var n = parseInt(idade);
    if (isNaN(n)) return 'nao_informado';
    if (n < 12)  return 'crianca';
    if (n < 18)  return 'adolescente';
    if (n < 30)  return 'jovem';
    if (n < 60)  return 'adulto';
    return 'idoso';
  }

  // ─── API pública ──────────────────────────────────────────────────────────

  return {
    inscrever:          inscrever,
    confirmarInscricao: confirmarInscricao,
    cancelarInscricao:  cancelarInscricao,
    registrarPresenca:  registrarPresenca,
    registrarPesquisa:  registrarPesquisa,
    gerarCertificado:   gerarCertificado,
    obterCapacidade:    obterCapacidade,
    obterMetricas:      obterMetricas,
    obterDadosCODIP:    obterDadosCODIP
  };

})();
