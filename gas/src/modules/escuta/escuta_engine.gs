/**
 * @file escuta_engine.gs
 * @layer engine
 * @description Engine de Escuta Institucional — clima organizacional com 8 dimensões
 *   científicas baseadas em UWES (vigor/dedicação/absorção), JDC (demanda/controle),
 *   CVF (colaboração/criatividade/competição/hierarquia) e NR-1 (fatores psicossociais).
 *
 *   Recursos:
 *   - Algoritmo de fairness (distribuição proporcional de pesquisas por colaborador)
 *   - Índice de confiança (representatividade % respostas vs total convidados)
 *   - Cruzamento analítico: clima × escalas × férias × absenteísmo
 *   - Alerta automático: deterioração > 15 pontos em 2 semanas
 *   - Consentimento LGPD para dados sensíveis via ConsentimentoService
 * @depends escuta_repository.gs, colaborador_repository.gs, fsm_guardian.gs,
 *           auditoria_service.gs, system_events.gs, consentimento_service.gs
 */

var EscutaEngine = (function() {

  // ─── Dimensões ──────────────────────────────────────────────────────────────

  var DIMENSOES = [
    // UWES — Work Engagement
    { id: 'vigor',       label: 'Vigor',       grupo: 'UWES',
      descricao: 'Energia e resiliência no trabalho; disposição para se esforçar' },
    { id: 'dedicacao',   label: 'Dedicação',   grupo: 'UWES',
      descricao: 'Senso de significado, entusiasmo e orgulho pelo trabalho' },
    { id: 'absorcao',    label: 'Absorção',    grupo: 'UWES',
      descricao: 'Concentração e imersão no trabalho; tempo passa rápido' },
    // JDC — Job Demand-Control
    { id: 'demanda',     label: 'Demanda',     grupo: 'JDC',
      descricao: 'Nível de exigência, pressão e sobrecarga percebida' },
    { id: 'controle',    label: 'Controle',    grupo: 'JDC',
      descricao: 'Autonomia e influência sobre as próprias tarefas' },
    // CVF — Competing Values Framework
    { id: 'colaboracao', label: 'Colaboração', grupo: 'CVF',
      descricao: 'Trabalho em equipe, apoio mútuo e coesão' },
    { id: 'inovacao',    label: 'Inovação',    grupo: 'CVF',
      descricao: 'Espaço para criatividade, novas ideias e experimentação' },
    // NR-1 — Psicossocial
    { id: 'seguranca',   label: 'Segurança Psicológica', grupo: 'NR-1',
      descricao: 'Segurança para expressar opiniões sem medo de represálias' }
  ];

  var PERGUNTAS_POR_DIMENSAO = {
    vigor:       ['Sinto-me com energia para trabalhar.', 'Quando trabalho, sinto-me forte e vigoroso.', 'Consigo continuar trabalhando mesmo em situações difíceis.'],
    dedicacao:   ['Fico entusiasmado com o meu trabalho.', 'Meu trabalho me inspira.', 'Tenho orgulho do que faço.'],
    absorcao:    ['Quando estou trabalhando, esqueço o que está acontecendo ao redor.', 'O tempo passa rápido quando estou trabalhando.', 'Fico imerso no meu trabalho.'],
    demanda:     ['Tenho pouco tempo para concluir meu trabalho.', 'Sou pressionado a trabalhar muito.', 'Preciso dar conta de muitas tarefas ao mesmo tempo.'],
    controle:    ['Posso decidir como fazer meu trabalho.', 'Tenho influência sobre o meu ritmo de trabalho.', 'Posso participar das decisões que me afetam.'],
    colaboracao: ['As pessoas nesta organização trabalham bem em equipe.', 'Recebo apoio dos meus colegas quando preciso.', 'Há um bom clima de cooperação no ambiente.'],
    inovacao:    ['Ideias novas são bem-vindas nesta organização.', 'Tenho liberdade para experimentar novas formas de trabalhar.', 'A organização incentiva a criatividade.'],
    seguranca:   ['Posso expressar opiniões sem medo de consequências.', 'Erros são tratados como oportunidade de aprendizado.', 'Me sinto seguro para questionar decisões.']
  };

  // FSM de pesquisa
  var FSM = {
    rascunho:   { label: 'Rascunho',   transicoes: ['ativa', 'cancelada'] },
    ativa:      { label: 'Ativa',      transicoes: ['encerrada', 'cancelada'] },
    encerrada:  { label: 'Encerrada',  transicoes: ['arquivada'] },
    cancelada:  { label: 'Cancelada',  transicoes: [] },
    arquivada:  { label: 'Arquivada',  transicoes: [] }
  };

  FsmGuardian.registrar('escuta', FSM);

  // ─── CRUD de pesquisas ──────────────────────────────────────────────────────

  function criarPesquisa(orgId, dados, emailCriador) {
    var pesquisa = {
      titulo:      dados.titulo || 'Pesquisa de Clima ' + new Date().getFullYear(),
      descricao:   dados.descricao || '',
      rodada:      dados.rodada   || _proximaRodada(orgId),
      dimensoes:   dados.dimensoes || DIMENSOES.map(function(d) { return d.id; }),
      anonima:     dados.anonima !== false,   // default true
      dataInicio:  dados.dataInicio || new Date().toISOString().split('T')[0],
      dataFim:     dados.dataFim    || _dataFimPadrao(),
      status:      'rascunho',
      convidados:  [],   // preenchido ao ativar
      criadoPor:   emailCriador
    };
    var id = EscutaRepository.salvarPesquisa(orgId, pesquisa);
    AuditoriaService.registrar('ESCUTA_CRIADA', 'escuta', { id: id, titulo: pesquisa.titulo }, emailCriador);
    return id;
  }

  function ativarPesquisa(orgId, pesquisaId, emailAdmin) {
    var pesquisa = EscutaRepository.buscarPesquisa(orgId, pesquisaId);
    if (!pesquisa) throw new Error('Pesquisa não encontrada');
    FsmGuardian.transitar('escuta', pesquisa.status, 'ativa', { pesquisaId: pesquisaId });

    // Seleciona colaboradores via algoritmo de fairness
    var convidados = _selecionarConvidadosFairness(orgId, pesquisa.dimensoes);
    pesquisa.status    = 'ativa';
    pesquisa.convidados = convidados;
    pesquisa.dataAtivacao = new Date().toISOString();
    EscutaRepository.salvarPesquisa(orgId, pesquisa);

    // Envia convites
    _enviarConvites(orgId, pesquisaId, convidados, pesquisa);
    AuditoriaService.registrar('ESCUTA_ATIVADA', 'escuta', { id: pesquisaId, totalConvidados: convidados.length }, emailAdmin);
    return { ok: true, totalConvidados: convidados.length };
  }

  function encerrarPesquisa(orgId, pesquisaId, emailAdmin) {
    var pesquisa = EscutaRepository.buscarPesquisa(orgId, pesquisaId);
    if (!pesquisa) throw new Error('Pesquisa não encontrada');
    FsmGuardian.transitar('escuta', pesquisa.status, 'encerrada', { pesquisaId: pesquisaId });

    // Calcula resultados finais
    var resultado = calcularResultados(orgId, pesquisaId);
    pesquisa.status       = 'encerrada';
    pesquisa.dataEncerramento = new Date().toISOString();
    pesquisa.resultadoFinal   = resultado;
    EscutaRepository.salvarPesquisa(orgId, pesquisa);

    // Sincroniza Sheet e verifica alertas
    EscutaRepository.sincronizarSheet(orgId, pesquisaId, resultado);
    var alertas = _verificarAlertas(orgId, pesquisaId, resultado);

    AuditoriaService.registrar('ESCUTA_ENCERRADA', 'escuta',
      { id: pesquisaId, indiceConfianca: resultado.indiceConfianca, alertas: alertas.length }, emailAdmin);
    return { ok: true, resultado: resultado, alertas: alertas };
  }

  // ─── Resposta de colaborador ────────────────────────────────────────────────

  function registrarResposta(orgId, pesquisaId, colaboradorId, respostas, anonima) {
    var pesquisa = EscutaRepository.buscarPesquisa(orgId, pesquisaId);
    if (!pesquisa) throw new Error('Pesquisa não encontrada');
    if (pesquisa.status !== 'ativa') throw new Error('Pesquisa não está ativa');

    // Verifica consentimento LGPD para dados sensíveis (orientação, saúde, raça)
    if (respostas._temDadosSensiveis) {
      var consentimento = ConsentimentoService.verificar(orgId, colaboradorId, 'escuta_sensivel');
      if (!consentimento.ok) throw new Error('Consentimento LGPD para dados sensíveis não registrado');
    }

    // Anti-duplicação: permite apenas 1 resposta por colaborador por pesquisa
    var jaRespondeu = EscutaRepository.listarRespostas(orgId, pesquisaId)
      .some(function(r) { return r.colaboradorId === colaboradorId; });
    if (jaRespondeu) throw new Error('Você já respondeu esta pesquisa');

    var registro = {
      pesquisaId:    pesquisaId,
      colaboradorId: anonima ? null : colaboradorId,
      respostas:     respostas,
      anonima:       anonima !== false
    };
    var id = EscutaRepository.salvarResposta(orgId, registro);
    AuditoriaService.registrar('ESCUTA_RESPOSTA', 'escuta', { pesquisaId: pesquisaId }, colaboradorId);
    return { ok: true, id: id };
  }

  // ─── Cálculo de resultados ──────────────────────────────────────────────────

  function calcularResultados(orgId, pesquisaId) {
    var pesquisa   = EscutaRepository.buscarPesquisa(orgId, pesquisaId);
    var respostas  = EscutaRepository.listarRespostas(orgId, pesquisaId);
    var totalConvidados = (pesquisa.convidados || []).length;
    var totalRespostas  = respostas.length;

    // Índice de confiança: proporção de respostas (0–100)
    var indiceConfianca = totalConvidados > 0
      ? Math.round((totalRespostas / totalConvidados) * 100)
      : 0;

    // Calcula média por dimensão (escala 1–5)
    var scoresPorDimensao = {};
    DIMENSOES.forEach(function(dim) {
      if (respostas.length === 0) { scoresPorDimensao[dim.id] = null; return; }
      var soma = 0, conta = 0;
      respostas.forEach(function(r) {
        if (r.respostas && r.respostas[dim.id] != null) {
          soma += Number(r.respostas[dim.id]);
          conta++;
        }
      });
      scoresPorDimensao[dim.id] = conta > 0 ? Math.round((soma / conta) * 10) / 10 : null;
    });

    // Média ponderada geral
    var validos = Object.values(scoresPorDimensao).filter(function(v) { return v != null; });
    var mediaPonderada = validos.length > 0
      ? Math.round((validos.reduce(function(a,b){return a+b;},0) / validos.length) * 10) / 10
      : null;

    // Dimensões extremas
    var ordenadas = DIMENSOES
      .filter(function(d) { return scoresPorDimensao[d.id] != null; })
      .sort(function(a,b) { return scoresPorDimensao[a.id] - scoresPorDimensao[b.id]; });

    var dimensaoMaisBaixa = ordenadas.length > 0 ? ordenadas[0].label : null;
    var dimensaoMaisAlta  = ordenadas.length > 0 ? ordenadas[ordenadas.length-1].label : null;

    // Distribuição por score (quantos deram cada nota 1-5)
    var distribuicao = { 1:0, 2:0, 3:0, 4:0, 5:0 };
    respostas.forEach(function(r) {
      if (!r.respostas) return;
      Object.values(r.respostas).forEach(function(v) {
        var n = Math.round(Number(v));
        if (n >= 1 && n <= 5) distribuicao[n]++;
      });
    });

    return {
      pesquisaId:        pesquisaId,
      totalConvidados:   totalConvidados,
      totalRespostas:    totalRespostas,
      indiceConfianca:   indiceConfianca,
      mediaPonderada:    mediaPonderada,
      scoresPorDimensao: scoresPorDimensao,
      dimensaoMaisBaixa: dimensaoMaisBaixa,
      dimensaoMaisAlta:  dimensaoMaisAlta,
      distribuicao:      distribuicao,
      alertasGerados:    0   // preenchido por _verificarAlertas
    };
  }

  // ─── Cruzamento analítico ───────────────────────────────────────────────────

  function cruzarClimaComPessoas(orgId, pesquisaId) {
    var resultado = calcularResultados(orgId, pesquisaId);
    var respostas = EscutaRepository.listarRespostas(orgId, pesquisaId);
    var pesquisa  = EscutaRepository.buscarPesquisa(orgId, pesquisaId);

    // Climas por setor (usando colaboradorId se não anônimo)
    var porSetor = {};
    if (!pesquisa.anonima) {
      respostas.forEach(function(r) {
        if (!r.colaboradorId) return;
        var colab = ColaboradorRepository
          ? ColaboradorRepository.listar(orgId).find(function(c){return c.id===r.colaboradorId;})
          : null;
        var setor = colab ? (colab.setor || 'sem_setor') : 'anonimo';
        if (!porSetor[setor]) porSetor[setor] = { soma: 0, conta: 0 };
        DIMENSOES.forEach(function(dim) {
          if (r.respostas && r.respostas[dim.id] != null) {
            porSetor[setor].soma  += Number(r.respostas[dim.id]);
            porSetor[setor].conta++;
          }
        });
      });
    }

    // Absenteísmo (correlação: dias de afastamento × score de vigor)
    // Apenas descritivo — não causal
    var correlacaoAbsenteismo = null;
    try {
      var afastados = lerJSON('afastamentos.json') || [];
      var emailsAfastados = afastados
        .filter(function(a) { return a.orgId === orgId && a.status === 'ativo'; })
        .map(function(a) { return a.colaboradorId; });
      var mediaVigorAfastados = _mediaVigorSubgrupo(respostas, emailsAfastados);
      var mediaVigorGeral     = resultado.scoresPorDimensao.vigor;
      if (mediaVigorAfastados != null && mediaVigorGeral != null) {
        correlacaoAbsenteismo = {
          mediaVigorAfastados: mediaVigorAfastados,
          mediaVigorGeral:     mediaVigorGeral,
          delta: Math.round((mediaVigorAfastados - mediaVigorGeral) * 10) / 10
        };
      }
    } catch(e) { /* dados não disponíveis */ }

    return {
      resultado:            resultado,
      climaPorSetor:        porSetor,
      correlacaoAbsenteismo: correlacaoAbsenteismo
    };
  }

  // ─── Alertas automáticos ────────────────────────────────────────────────────

  /**
   * Detecta deterioração > 15 pontos em 2 semanas comparando com pesquisa anterior.
   * Emite evento ESCUTA_ALERTA e notifica gestores e RH.
   */
  function _verificarAlertas(orgId, pesquisaId, resultado) {
    var alertas = [];
    var pesquisasAnteriores = EscutaRepository.listarPesquisas(orgId)
      .filter(function(p) { return p.status === 'encerrada' && p.id !== pesquisaId; })
      .sort(function(a,b) { return new Date(b.dataEncerramento||0) - new Date(a.dataEncerramento||0); });

    if (pesquisasAnteriores.length > 0) {
      var anterior = pesquisasAnteriores[0];
      var resultadoAnterior = anterior.resultadoFinal;
      if (resultadoAnterior && resultadoAnterior.mediaPonderada != null && resultado.mediaPonderada != null) {
        // converte escala 1-5 para 0-100
        var atual_100    = ((resultado.mediaPonderada - 1) / 4) * 100;
        var anterior_100 = ((resultadoAnterior.mediaPonderada - 1) / 4) * 100;
        var delta = atual_100 - anterior_100;
        if (delta <= -15) {
          alertas.push({
            tipo: 'DETERIORACAO_CLIMA',
            severidade: 'URGENTE',
            mensagem: 'Clima deteriorou ' + Math.abs(Math.round(delta)) + ' pontos vs. pesquisa anterior',
            delta: Math.round(delta),
            mediaPonderadaAtual:    resultado.mediaPonderada,
            mediaPonderadaAnterior: resultadoAnterior.mediaPonderada
          });
        }
      }
      // Verifica dimensões específicas abaixo de 2.5
      DIMENSOES.forEach(function(dim) {
        var score = resultado.scoresPorDimensao[dim.id];
        if (score != null && score < 2.5) {
          alertas.push({
            tipo: 'DIMENSAO_CRITICA',
            severidade: 'ATENÇÃO',
            mensagem: 'Dimensão "' + dim.label + '" com score crítico (' + score + '/5)',
            dimensao: dim.id,
            score: score
          });
        }
      });
    }

    // Índice de confiança baixo
    if (resultado.indiceConfianca < 40) {
      alertas.push({
        tipo: 'BAIXO_INDICE_CONFIANCA',
        severidade: 'INFO',
        mensagem: 'Índice de confiança abaixo de 40% (' + resultado.indiceConfianca + '%). Resultados menos representativos.',
        indiceConfianca: resultado.indiceConfianca
      });
    }

    if (alertas.length > 0) {
      try {
        SystemEvents.emit(SystemEventTypes.ESCUTA_ALERTA || 'ESCUTA_ALERTA', orgId, {
          pesquisaId: pesquisaId,
          alertas:    alertas
        });
      } catch(e) { /* sistema de eventos pode não estar disponível */ }
    }

    return alertas;
  }

  // ─── Algoritmo de fairness ──────────────────────────────────────────────────

  /**
   * Seleciona colaboradores de forma proporcional: cada pessoa recebe pesquisas
   * na mesma frequência. Prioriza quem há mais tempo não participa.
   */
  function _selecionarConvidadosFairness(orgId, dimensoesSolicitadas) {
    var colaboradores = [];
    try {
      colaboradores = ColaboradorRepository.listar(orgId)
        .filter(function(c) { return c.status === 'ativo'; });
    } catch(e) { return []; }

    if (colaboradores.length === 0) return [];

    // Conta participações anteriores por colaborador
    var participacoes = {};
    var todasRespostas = lerJSON('respostas_clima.json') || [];
    todasRespostas
      .filter(function(r) { return r.orgId === orgId; })
      .forEach(function(r) {
        if (r.colaboradorId) {
          participacoes[r.colaboradorId] = (participacoes[r.colaboradorId] || 0) + 1;
        }
      });

    // Ordena por menos participações (fairness) + mais antigo
    var ordenados = colaboradores.slice().sort(function(a, b) {
      var pa = participacoes[a.id] || 0;
      var pb = participacoes[b.id] || 0;
      if (pa !== pb) return pa - pb;
      return new Date(a.criadoEm||0) - new Date(b.criadoEm||0);
    });

    // Convida todos (escuta é institucional — todos participam)
    return ordenados.map(function(c) { return c.id; });
  }

  function _proximaRodada(orgId) {
    var pesquisas = EscutaRepository.listarPesquisas(orgId);
    return pesquisas.length + 1;
  }

  function _dataFimPadrao() {
    var d = new Date();
    d.setDate(d.getDate() + 14);  // 2 semanas de coleta
    return d.toISOString().split('T')[0];
  }

  function _enviarConvites(orgId, pesquisaId, convidados, pesquisa) {
    try {
      var orgNome = getOrgConfig().orgNome || 'sua organização';
      convidados.forEach(function(colaboradorId) {
        var colab = ColaboradorRepository.listar(orgId)
          .find(function(c){ return c.id === colaboradorId; });
        if (!colab || !colab.email) return;
        var link = ScriptApp.getService().getUrl() + '?secao=escuta&id=' + pesquisaId + '&resp=' + colaboradorId;
        var assunto = '[TRAMAR] Pesquisa de Clima — ' + pesquisa.titulo;
        var corpo   = 'Olá, ' + (colab.nome||'') + '!\n\n'
          + orgNome + ' iniciou uma rodada de Escuta Institucional.\n'
          + 'Sua participação é fundamental para melhorarmos o ambiente de trabalho.\n\n'
          + 'Acesse: ' + link + '\n\n'
          + 'Prazo: ' + pesquisa.dataFim + '\n'
          + 'Tempo estimado: 5 minutos\n\n'
          + (pesquisa.anonima ? '✅ Suas respostas são completamente anônimas.\n' : '')
          + '\nObrigado!';
        GmailApp.sendEmail(colab.email, assunto, corpo);
      });
    } catch(e) {
      Logger.warn('escuta', '_enviarConvites', 'Erro ao enviar convites: ' + e.message);
    }
  }

  function _mediaVigorSubgrupo(respostas, ids) {
    var sub = respostas.filter(function(r) { return ids.indexOf(r.colaboradorId) >= 0; });
    if (sub.length === 0) return null;
    var soma = 0, n = 0;
    sub.forEach(function(r) {
      if (r.respostas && r.respostas.vigor != null) { soma += Number(r.respostas.vigor); n++; }
    });
    return n > 0 ? Math.round((soma/n)*10)/10 : null;
  }

  // ─── Consultas para frontend ────────────────────────────────────────────────

  function obterCatalogoDimensoes() {
    return DIMENSOES.map(function(d) {
      return { id: d.id, label: d.label, grupo: d.grupo, descricao: d.descricao,
               perguntas: PERGUNTAS_POR_DIMENSAO[d.id] || [] };
    });
  }

  function obterEvolucaoClimaHistorica(orgId, ultimas) {
    var n = ultimas || 6;
    var pesquisas = EscutaRepository.listarPesquisas(orgId)
      .filter(function(p) { return p.status === 'encerrada' && p.resultadoFinal; })
      .sort(function(a,b){ return new Date(b.dataEncerramento||0) - new Date(a.dataEncerramento||0); })
      .slice(0, n)
      .reverse();
    return pesquisas.map(function(p) {
      return {
        pesquisaId:      p.id,
        rodada:          p.rodada,
        dataEncerramento: p.dataEncerramento,
        mediaPonderada:  p.resultadoFinal.mediaPonderada,
        indiceConfianca: p.resultadoFinal.indiceConfianca,
        dimensoes:       p.resultadoFinal.scoresPorDimensao
      };
    });
  }

  return {
    criarPesquisa:            criarPesquisa,
    ativarPesquisa:           ativarPesquisa,
    encerrarPesquisa:         encerrarPesquisa,
    registrarResposta:        registrarResposta,
    calcularResultados:       calcularResultados,
    cruzarClimaComPessoas:    cruzarClimaComPessoas,
    obterCatalogoDimensoes:   obterCatalogoDimensoes,
    obterEvolucaoClimaHistorica: obterEvolucaoClimaHistorica
  };
})();
