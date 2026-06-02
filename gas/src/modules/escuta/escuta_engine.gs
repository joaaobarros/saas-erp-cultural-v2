/**
 * @file escuta_engine.gs
 * @layer engine
 * @description Engine de Escuta Institucional — v2.1 (aprimorado com padrões da v1)
 *   Clima organizacional com 8 dimensões científicas:
 *   UWES (vigor/dedicação/absorção), JDC (demanda/controle),
 *   CVF (colaboração/inovação) e NR-1 (segurança psicológica).
 *
 *   Aprimoramentos v2.1:
 *   [A1] Dimensões invertidas: demanda (JDC) — nota alta = situação negativa
 *   [A2] Pesos por dimensão: segurança NR-1 peso=1.5; demanda peso=1.2
 *   [A3] Nível climático por dimensão: excelente/bom/regular/baixo/crítico
 *   [A4] Dois limiares de confiança: suficiente ≥15% e representativa ≥35%
 *   [B1] Alertas específicos: burnout, apoio, liderança, sentimento negativo
 *   [B2] Escuta espontânea com análise de sentimento lexical
 *   [B3] Relatório com recomendações automáticas por dimensão
 *   [B4] Saturação por dimensão (cota proporcional ao tamanho da equipe)
 *   [C1] Painel de Governança: status, qualidade metodológica 0–100, motor metodológico
 *   [C2] Ciclo de feedback: ações tomadas com base nas escutas
 *
 * @depends escuta_repository.gs, colaborador_repository.gs, fsm_guardian.gs,
 *           auditoria_service.gs, system_events.gs, consentimento_service.gs
 */

var EscutaEngine = (function() {

  // ─── [A1] Dimensões com escala invertida (nota alta = situação negativa) ───
  //   demanda: "Tenho pouco tempo...", "Sou pressionado..." — nota 5 = sobrecarga máxima
  var DIMENSOES_INVERTIDAS = ['demanda'];

  // ─── [A2] Pesos por dimensão (risco/compliance têm peso maior) ─────────────
  var PESOS_DIMENSAO = {
    vigor:       1.0,
    dedicacao:   1.0,
    absorcao:    1.0,
    demanda:     1.2,  // JDC: indicador de carga/pressão
    controle:    1.0,
    colaboracao: 1.0,
    inovacao:    1.0,
    seguranca:   1.5   // NR-1: compliance regulatório — peso maior
  };

  // ─── Dimensões positivas para Clima Geral (excluem demanda invertida) ─────
  var DIMENSOES_CLIMA_GERAL = ['vigor','dedicacao','absorcao','controle','colaboracao','inovacao','seguranca'];

  // ─── Catálogo de dimensões ───────────────────────────────────────────────────

  var DIMENSOES = [
    // UWES — Work Engagement
    { id: 'vigor',       label: 'Vigor',                   grupo: 'UWES', invertida: false,
      descricao: 'Energia e resiliência no trabalho; disposição para se esforçar' },
    { id: 'dedicacao',   label: 'Dedicação',               grupo: 'UWES', invertida: false,
      descricao: 'Senso de significado, entusiasmo e orgulho pelo trabalho' },
    { id: 'absorcao',    label: 'Absorção',                grupo: 'UWES', invertida: false,
      descricao: 'Concentração e imersão no trabalho; tempo passa rápido' },
    // JDC — Job Demand-Control
    { id: 'demanda',     label: 'Demanda/Carga',           grupo: 'JDC',  invertida: true,
      descricao: 'Nível de exigência, pressão e sobrecarga percebida (nota alta = mais pressão = pior)' },
    { id: 'controle',    label: 'Controle/Autonomia',      grupo: 'JDC',  invertida: false,
      descricao: 'Autonomia e influência sobre as próprias tarefas' },
    // CVF — Competing Values Framework
    { id: 'colaboracao', label: 'Colaboração',             grupo: 'CVF',  invertida: false,
      descricao: 'Trabalho em equipe, apoio mútuo e coesão' },
    { id: 'inovacao',    label: 'Inovação',                grupo: 'CVF',  invertida: false,
      descricao: 'Espaço para criatividade, novas ideias e experimentação' },
    // NR-1 — Psicossocial
    { id: 'seguranca',   label: 'Segurança Psicológica',   grupo: 'NR-1', invertida: false,
      descricao: 'Segurança para expressar opiniões sem medo de represálias (NR-1)' }
  ];

  var PERGUNTAS_POR_DIMENSAO = {
    vigor:       ['Sinto-me com energia para trabalhar.', 'Quando trabalho, sinto-me forte e vigoroso(a).', 'Consigo continuar trabalhando mesmo em situações difíceis.'],
    dedicacao:   ['Fico entusiasmado(a) com o meu trabalho.', 'Meu trabalho me inspira.', 'Tenho orgulho do que faço.'],
    absorcao:    ['Quando estou trabalhando, esqueço o que está acontecendo ao redor.', 'O tempo passa rápido quando estou trabalhando.', 'Fico imerso(a) no meu trabalho.'],
    demanda:     ['Tenho pouco tempo para concluir meu trabalho.', 'Sou pressionado(a) a trabalhar muito.', 'Preciso dar conta de muitas tarefas ao mesmo tempo.'],
    controle:    ['Posso decidir como fazer meu trabalho.', 'Tenho influência sobre o meu ritmo de trabalho.', 'Posso participar das decisões que me afetam.'],
    colaboracao: ['As pessoas nesta organização trabalham bem em equipe.', 'Recebo apoio dos meus colegas quando preciso.', 'Há um bom clima de cooperação no ambiente.'],
    inovacao:    ['Ideias novas são bem-vindas nesta organização.', 'Tenho liberdade para experimentar novas formas de trabalhar.', 'A organização incentiva a criatividade.'],
    seguranca:   ['Posso expressar opiniões sem medo de consequências.', 'Erros são tratados como oportunidade de aprendizado.', 'Me sinto seguro(a) para questionar decisões.']
  };

  // Categorias de escuta espontânea
  var CATEGORIAS_ESPONTANEA = ['apoio','carga','comunicacao','conflito','lideranca','positivo','ambiente','outro'];

  // Recomendações automáticas por dimensão (para relatório)
  var RECOMENDACOES_DIMENSAO = {
    vigor:       'Investigar causas de esgotamento. Considerar redistribuição de carga e pausas programadas.',
    dedicacao:   'Fortalecer senso de propósito e reconhecimento. Revisar alinhamento entre valores pessoais e institucionais.',
    absorcao:    'Verificar se há excesso de interrupções. Promover espaços de trabalho focado (deep work).',
    demanda:     'Revisar distribuição de atividades e prioridades. Acionar protocolo de gestão de carga de trabalho.',
    controle:    'Ampliar espaços de autonomia e participação nas decisões. Revisar processos de delegação.',
    colaboracao: 'Fortalecer redes de suporte e mentoria. Promover ações de coesão de equipe.',
    inovacao:    'Criar espaços seguros para novas ideias. Revisar processos que inibem criatividade.',
    seguranca:   '⚠️ ATENÇÃO NR-1: Acionar protocolo psicossocial. Investigar barreiras à comunicação aberta e segurança psicológica.'
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

  // ─── [A3] Nível climático ───────────────────────────────────────────────────

  /**
   * Converte score 1–5 em nível qualitativo.
   * Para dimensões invertidas, o score JÁ deve estar normalizado (após inversão).
   */
  function _nivelClimatico(score) {
    if (score === null || score === undefined) return 'sem_dados';
    if (score >= 4.5) return 'excelente';
    if (score >= 3.5) return 'bom';
    if (score >= 2.5) return 'regular';
    if (score >= 1.5) return 'baixo';
    return 'critico';
  }

  // ─── CRUD de pesquisas ──────────────────────────────────────────────────────

  function criarPesquisa(orgId, dados, emailCriador) {
    var pesquisa = {
      titulo:      dados.titulo || 'Pesquisa de Clima ' + new Date().getFullYear(),
      descricao:   dados.descricao || '',
      rodada:      dados.rodada   || _proximaRodada(orgId),
      dimensoes:   dados.dimensoes || DIMENSOES.map(function(d) { return d.id; }),
      anonima:     dados.anonima !== false,   // default true
      obrigatoria: dados.obrigatoria === true, // default false
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

    // Pesquisa obrigatória convida todos os colaboradores ativos (sem fairness sampling)
    var convidados = pesquisa.obrigatoria
      ? _todosColaboradoresAtivos(orgId)
      : _selecionarConvidadosFairness(orgId, pesquisa.dimensoes);
    pesquisa.status       = 'ativa';
    pesquisa.convidados   = convidados;
    pesquisa.dataAtivacao = new Date().toISOString();
    EscutaRepository.salvarPesquisa(orgId, pesquisa);

    _enviarConvites(orgId, pesquisaId, convidados, pesquisa);
    AuditoriaService.registrar('ESCUTA_ATIVADA', 'escuta', { id: pesquisaId, totalConvidados: convidados.length, obrigatoria: !!pesquisa.obrigatoria }, emailAdmin);
    return { ok: true, totalConvidados: convidados.length };
  }

  /**
   * Retorna pesquisas obrigatórias ativas que o colaborador (email) ainda não respondeu.
   * Usado pelo gate de bloqueio pós-login.
   */
  function listarPendentesObrigatorias(orgId, email) {
    var emailNorm = String(email || '').toLowerCase().trim();
    if (!emailNorm) return [];
    return EscutaRepository.listarPesquisas(orgId).filter(function(p) {
      if (!p.obrigatoria || p.status !== 'ativa') return false;
      var jaRespondeu = EscutaRepository.listarRespostas(orgId, p.id).some(function(r) {
        return r.colaboradorId && String(r.colaboradorId).toLowerCase().trim() === emailNorm;
      });
      return !jaRespondeu;
    });
  }

  function encerrarPesquisa(orgId, pesquisaId, emailAdmin) {
    var pesquisa = EscutaRepository.buscarPesquisa(orgId, pesquisaId);
    if (!pesquisa) throw new Error('Pesquisa não encontrada');
    FsmGuardian.transitar('escuta', pesquisa.status, 'encerrada', { pesquisaId: pesquisaId });

    var resultado = calcularResultados(orgId, pesquisaId);
    pesquisa.status           = 'encerrada';
    pesquisa.dataEncerramento = new Date().toISOString();
    pesquisa.resultadoFinal   = resultado;
    EscutaRepository.salvarPesquisa(orgId, pesquisa);

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

    if (respostas._temDadosSensiveis) {
      var consentimento = ConsentimentoService.verificar(orgId, colaboradorId, 'escuta_sensivel');
      if (!consentimento.ok) throw new Error('Consentimento LGPD para dados sensíveis não registrado');
    }

    var jaRespondeu = EscutaRepository.listarRespostas(orgId, pesquisaId)
      .some(function(r) { return r.colaboradorId === colaboradorId; });
    if (jaRespondeu) throw new Error('Você já respondeu esta pesquisa');

    var registro = {
      pesquisaId:    pesquisaId,
      // Pesquisas obrigatórias sempre persistem colaboradorId para verificação do gate
      colaboradorId: (!anonima || pesquisa.obrigatoria) ? colaboradorId : null,
      respostas:     respostas,
      anonima:       anonima !== false
    };
    var id = EscutaRepository.salvarResposta(orgId, registro);

    // [B4] Incrementa saturação por dimensão respondida
    var periodo = _periodoAtual();
    Object.keys(respostas).forEach(function(dimId) {
      if (dimId !== '_temDadosSensiveis') {
        try { EscutaRepository.incrementarSaturacao(orgId, dimId, periodo); } catch(e) {}
      }
    });

    AuditoriaService.registrar('ESCUTA_RESPOSTA', 'escuta', { pesquisaId: pesquisaId }, colaboradorId);
    return { ok: true, id: id };
  }

  // ─── [B2] Escuta Espontânea ─────────────────────────────────────────────────

  /**
   * Registra relato livre de colaborador com análise de sentimento automática.
   * @param {string} orgId
   * @param {string} colaboradorId
   * @param {Object} dados - { categoria, texto, anonima }
   */
  function registrarEspontanea(orgId, colaboradorId, dados) {
    if (!dados || !dados.texto) throw new Error('Texto do relato é obrigatório');
    var categoria = CATEGORIAS_ESPONTANEA.indexOf(dados.categoria) >= 0
      ? dados.categoria : 'outro';
    var sentimento = _analisarSentimento(dados.texto);
    var anonima    = dados.anonima !== false;

    var registro = {
      orgId:         orgId,
      colaboradorId: anonima ? null : colaboradorId,
      categoria:     categoria,
      texto:         dados.texto,
      sentimento:    sentimento,
      anonima:       anonima,
      periodo:       _periodoAtual()
    };
    var id = EscutaRepository.salvarEspontanea(orgId, registro);
    AuditoriaService.registrar('ESCUTA_ESPONTANEA', 'escuta',
      { categoria: categoria, sentimento: sentimento }, colaboradorId);
    return { ok: true, id: id, sentimento: sentimento };
  }

  /**
   * Análise de sentimento lexical simples (positivo/negativo/neutro).
   */
  function _analisarSentimento(texto) {
    if (!texto) return 'neutro';
    var t   = texto.toLowerCase();
    var pos = ['bom','ótimo','ótima','excelente','feliz','satisfeito','satisfeita','positivo',
               'grato','grata','amo','adoro','maravilhoso','maravilhosa','alegre','motivado',
               'motivada','reconhecido','reconhecida','agradecido','valorizado','valorizada'];
    var neg = ['ruim','péssimo','péssima','difícil','sobrecarregado','sobrecarregada','cansado',
               'cansada','triste','frustrado','frustrada','ansioso','ansiosa','estressado',
               'estressada','injusto','injusta','problema','assédio','conflito','negativo',
               'exausto','exausta','desmotivado','desmotivada','ignorado','negligenciado'];
    var pScore = pos.filter(function(w) { return t.indexOf(w) >= 0; }).length;
    var nScore = neg.filter(function(w) { return t.indexOf(w) >= 0; }).length;
    if (pScore > nScore) return 'positivo';
    if (nScore > pScore) return 'negativo';
    return 'neutro';
  }

  /**
   * Resumo de escutas espontâneas: categorias + sentimentos.
   */
  function resumoEspontanea(orgId, periodo) {
    var p = periodo || _periodoAtual();
    var lista = EscutaRepository.listarEspontanea(orgId, p);
    var cats  = {};
    var sents = { positivo: 0, negativo: 0, neutro: 0 };
    lista.forEach(function(e) {
      if (e.categoria) cats[e.categoria] = (cats[e.categoria] || 0) + 1;
      if (sents[e.sentimento] !== undefined) sents[e.sentimento]++;
    });
    return {
      total:      lista.length,
      categorias: cats,
      sentimentos: sents,
      pctNegativo: lista.length > 0
        ? Math.round((sents.negativo / lista.length) * 100) : 0
    };
  }

  // ─── [A1+A2] Cálculo de resultados com inversão e pesos ─────────────────────

  function calcularResultados(orgId, pesquisaId) {
    var pesquisa        = EscutaRepository.buscarPesquisa(orgId, pesquisaId);
    var respostas       = EscutaRepository.listarRespostas(orgId, pesquisaId);
    var totalConvidados = (pesquisa.convidados || []).length;
    var totalRespostas  = respostas.length;

    // [A4] Dois limiares de confiança
    var indiceConfianca = totalConvidados > 0
      ? Math.round((totalRespostas / totalConvidados) * 100) : 0;
    var confiancaSuficiente     = indiceConfianca >= 15;
    var confiancaRepresentativa = indiceConfianca >= 35;

    // [A1+A2] Score por dimensão com inversão e pesos
    var scoresPorDimensao  = {};
    var nivelPorDimensao   = {};

    DIMENSOES.forEach(function(dim) {
      if (respostas.length === 0) {
        scoresPorDimensao[dim.id] = null;
        nivelPorDimensao[dim.id]  = 'sem_dados';
        return;
      }
      var soma = 0, conta = 0;
      respostas.forEach(function(r) {
        if (r.respostas && r.respostas[dim.id] != null) {
          var val = Number(r.respostas[dim.id]);
          // [A1] Aplica inversão para dimensões negativas (nota alta = situação ruim)
          if (dim.invertida) val = 6 - val;
          soma += val;
          conta++;
        }
      });
      var score = conta > 0 ? Math.round((soma / conta) * 10) / 10 : null;
      scoresPorDimensao[dim.id] = score;
      nivelPorDimensao[dim.id]  = _nivelClimatico(score);
    });

    // [A2] Média ponderada geral usando pesos por dimensão
    var somaPonderada = 0, somaPesos = 0;
    DIMENSOES.forEach(function(dim) {
      var sc = scoresPorDimensao[dim.id];
      if (sc != null) {
        var p = PESOS_DIMENSAO[dim.id] || 1.0;
        somaPonderada += sc * p;
        somaPesos     += p;
      }
    });
    var mediaPonderada = somaPesos > 0
      ? Math.round((somaPonderada / somaPesos) * 10) / 10 : null;

    // Clima geral (apenas dimensões positivas, sem demanda invertida)
    var somaGeral = 0, nGeral = 0;
    DIMENSOES_CLIMA_GERAL.forEach(function(id) {
      if (scoresPorDimensao[id] != null) { somaGeral += scoresPorDimensao[id]; nGeral++; }
    });
    var climaGeral = nGeral > 0 ? Math.round((somaGeral / nGeral) * 10) / 10 : null;

    // Dimensões extremas (ordenadas pelo score já normalizado)
    var ordenadas = DIMENSOES
      .filter(function(d) { return scoresPorDimensao[d.id] != null; })
      .sort(function(a,b) { return scoresPorDimensao[a.id] - scoresPorDimensao[b.id]; });

    var dimensaoMaisBaixa = ordenadas.length > 0 ? ordenadas[0].label : null;
    var dimensaoMaisAlta  = ordenadas.length > 0 ? ordenadas[ordenadas.length-1].label : null;

    // Distribuição por score (notas já com inversão aplicada)
    var distribuicao = { 1:0, 2:0, 3:0, 4:0, 5:0 };
    respostas.forEach(function(r) {
      if (!r.respostas) return;
      DIMENSOES.forEach(function(dim) {
        var v = r.respostas[dim.id];
        if (v == null) return;
        var n = Math.round(dim.invertida ? (6 - Number(v)) : Number(v));
        if (n >= 1 && n <= 5) distribuicao[n]++;
      });
    });

    return {
      pesquisaId:             pesquisaId,
      totalConvidados:        totalConvidados,
      totalRespostas:         totalRespostas,
      indiceConfianca:        indiceConfianca,
      confiancaSuficiente:    confiancaSuficiente,     // [A4] ≥15%
      confiancaRepresentativa: confiancaRepresentativa, // [A4] ≥35%
      mediaPonderada:         mediaPonderada,
      climaGeral:             climaGeral,
      nivelClimaGeral:        _nivelClimatico(climaGeral),
      scoresPorDimensao:      scoresPorDimensao,
      nivelPorDimensao:       nivelPorDimensao,        // [A3]
      dimensaoMaisBaixa:      dimensaoMaisBaixa,
      dimensaoMaisAlta:       dimensaoMaisAlta,
      distribuicao:           distribuicao,
      alertasGerados:         0   // preenchido por _verificarAlertas
    };
  }

  // ─── Cruzamento analítico ───────────────────────────────────────────────────

  function cruzarClimaComPessoas(orgId, pesquisaId) {
    var resultado = calcularResultados(orgId, pesquisaId);
    var respostas = EscutaRepository.listarRespostas(orgId, pesquisaId);
    var pesquisa  = EscutaRepository.buscarPesquisa(orgId, pesquisaId);

    // Clima por setor (usando colaboradorId se não anônimo)
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
            var val = Number(r.respostas[dim.id]);
            // [A1] Aplica inversão também no cruzamento
            if (dim.invertida) val = 6 - val;
            porSetor[setor].soma  += val;
            porSetor[setor].conta++;
          }
        });
      });
      // Calcula média por setor
      Object.keys(porSetor).forEach(function(s) {
        var entry = porSetor[s];
        entry.media = entry.conta > 0
          ? Math.round((entry.soma / entry.conta) * 10) / 10 : null;
        entry.nivel = _nivelClimatico(entry.media);
      });
    }

    // Absenteísmo: correlação descritiva vigor × afastamentos
    var correlacaoAbsenteismo = null;
    try {
      var afastados = lerJSON('afastamentos.json') || [];
      var idsAfastados = afastados
        .filter(function(a) { return a.orgId === orgId && a.status === 'ativo'; })
        .map(function(a) { return a.colaboradorId; });
      var mediaVigorAfastados = _mediaVigorSubgrupo(respostas, idsAfastados);
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
      resultado:             resultado,
      climaPorSetor:         porSetor,
      correlacaoAbsenteismo: correlacaoAbsenteismo
    };
  }

  // ─── [B1] Alertas automáticos enriquecidos ──────────────────────────────────

  /**
   * Verifica deterioração geral + alertas específicos por padrão clínico:
   * - BURNOUT_RISCO: demanda invertida baixa + vigor baixo
   * - APOIO_BAIXO: colaboração < 2.5
   * - LIDERANCA_BAIXA: segurança (NR-1) < 2.5 (indicador de liderança)
   * - SENTIMENTO_NEGATIVO: espontâneas negativos >60%
   * - DETERIORACAO_CLIMA: queda >15pts vs pesquisa anterior
   * - DIMENSAO_CRITICA: qualquer dimensão < 2.5
   * - BAIXO_INDICE_CONFIANCA: participação < 40%
   * - NR1_CRITICO: segurança < 2.0 (nível crítico — compliance)
   */
  function _verificarAlertas(orgId, pesquisaId, resultado) {
    var alertas = [];
    var sc      = resultado.scoresPorDimensao;

    // [B1a] Burnout: carga/pressão alta (demanda invertida baixa) + vigor baixo
    if (sc.demanda != null && sc.vigor != null) {
      if (sc.demanda < 2.5 && sc.vigor < 2.5) {
        alertas.push({
          tipo:      'BURNOUT_RISCO',
          severidade: 'URGENTE',
          mensagem:  'Padrão de carga alta + energia baixa detectado. Risco de burnout institucional.',
          dados:     { demanda: sc.demanda, vigor: sc.vigor }
        });
      }
    }

    // [B1b] Apoio/colaboração baixo
    if (sc.colaboracao != null && sc.colaboracao < 2.5) {
      alertas.push({
        tipo:      'APOIO_BAIXO',
        severidade: 'ATENÇÃO',
        mensagem:  'Indicador de colaboração/apoio mútuo abaixo do limiar crítico (' + sc.colaboracao + '/5).',
        dados:     { colaboracao: sc.colaboracao }
      });
    }

    // [B1c] Liderança/segurança psicológica baixa
    if (sc.seguranca != null && sc.seguranca < 2.5) {
      alertas.push({
        tipo:      'LIDERANCA_BAIXA',
        severidade: 'ATENÇÃO',
        mensagem:  'Segurança psicológica abaixo do limiar — pode indicar problemas de liderança (' + sc.seguranca + '/5).',
        dados:     { seguranca: sc.seguranca }
      });
    }

    // [B1d] NR-1 crítico (segurança < 2.0)
    if (sc.seguranca != null && sc.seguranca < 2.0) {
      alertas.push({
        tipo:      'NR1_CRITICO',
        severidade: 'URGENTE',
        mensagem:  'Score NR-1 em nível crítico (' + sc.seguranca + '/5). Acionar protocolo psicossocial.',
        dados:     { seguranca: sc.seguranca }
      });
    }

    // [B1e] Sentimento espontâneo negativo
    try {
      var periodo  = resultado.dataEncerramento
        ? resultado.dataEncerramento.substring(0, 7).replace('-', '-')
        : _periodoAtual();
      var resumoEsp = resumoEspontanea(orgId, periodo);
      if (resumoEsp.total >= 5 && resumoEsp.pctNegativo > 60) {
        alertas.push({
          tipo:      'SENTIMENTO_NEGATIVO',
          severidade: 'ATENÇÃO',
          mensagem:  'Maioria das escutas espontâneas com sentimento negativo (' + resumoEsp.pctNegativo + '%).',
          dados:     { total: resumoEsp.total, pctNegativo: resumoEsp.pctNegativo }
        });
      }
    } catch(e) { /* espontânea pode não estar disponível */ }

    // Deterioração geral vs pesquisa anterior
    var pesquisasAnteriores = EscutaRepository.listarPesquisas(orgId)
      .filter(function(p) { return p.status === 'encerrada' && p.id !== pesquisaId; })
      .sort(function(a,b) { return new Date(b.dataEncerramento||0) - new Date(a.dataEncerramento||0); });

    if (pesquisasAnteriores.length > 0) {
      var anterior          = pesquisasAnteriores[0];
      var resultadoAnterior = anterior.resultadoFinal;
      if (resultadoAnterior && resultadoAnterior.mediaPonderada != null && resultado.mediaPonderada != null) {
        var atual_100    = ((resultado.mediaPonderada - 1) / 4) * 100;
        var anterior_100 = ((resultadoAnterior.mediaPonderada - 1) / 4) * 100;
        var delta = atual_100 - anterior_100;
        if (delta <= -15) {
          alertas.push({
            tipo:      'DETERIORACAO_CLIMA',
            severidade: 'URGENTE',
            mensagem:  'Clima deteriorou ' + Math.abs(Math.round(delta)) + ' pontos vs. pesquisa anterior.',
            dados:     { delta: Math.round(delta), mediaPonderadaAtual: resultado.mediaPonderada,
                         mediaPonderadaAnterior: resultadoAnterior.mediaPonderada }
          });
        }
      }
      // Dimensões específicas críticas (< 2.5)
      DIMENSOES.forEach(function(dim) {
        var score = sc[dim.id];
        if (score != null && score < 2.5) {
          // burnout, apoio, liderança já foram adicionados acima — evitar duplicata
          var tiposJaAdicionados = alertas.map(function(a){ return a.tipo; });
          if (dim.id === 'seguranca' && tiposJaAdicionados.indexOf('LIDERANCA_BAIXA') >= 0) return;
          if (dim.id === 'colaboracao' && tiposJaAdicionados.indexOf('APOIO_BAIXO') >= 0) return;
          alertas.push({
            tipo:      'DIMENSAO_CRITICA',
            severidade: 'ATENÇÃO',
            mensagem:  'Dimensão "' + dim.label + '" com score crítico (' + score + '/5).',
            dimensao:  dim.id,
            dados:     { score: score, nivel: _nivelClimatico(score) }
          });
        }
      });
    }

    // Índice de confiança abaixo de 40%
    if (resultado.indiceConfianca < 40) {
      alertas.push({
        tipo:      'BAIXO_INDICE_CONFIANCA',
        severidade: 'INFO',
        mensagem:  'Participação abaixo de 40% (' + resultado.indiceConfianca + '%). Resultados menos representativos.',
        dados:     { indiceConfianca: resultado.indiceConfianca }
      });
    }

    if (alertas.length > 0) {
      try {
        SystemEvents.emit(SystemEventTypes.ESCUTA_ALERTA || 'ESCUTA_ALERTA', orgId, {
          pesquisaId: pesquisaId,
          alertas:    alertas
        });
      } catch(e) { /* eventos podem não estar disponíveis */ }
    }

    resultado.alertasGerados = alertas.length;
    return alertas;
  }

  // ─── [B3] Relatório com recomendações automáticas ───────────────────────────

  /**
   * Gera relatório completo de uma pesquisa encerrada com recomendações por dimensão.
   * @returns { ...resultado, recomendacoes[], tendencia, resumoEspontanea }
   */
  function gerarRelatorio(orgId, pesquisaId) {
    var resultado = calcularResultados(orgId, pesquisaId);
    var sc        = resultado.scoresPorDimensao;

    // Recomendações para dimensões críticas (< 2.5)
    var recomendacoes = [];
    DIMENSOES.forEach(function(dim) {
      var score = sc[dim.id];
      if (score != null && score < 2.5) {
        recomendacoes.push({
          dimensao:   dim.id,
          label:      dim.label,
          score:      score,
          nivel:      _nivelClimatico(score),
          prioridade: score < 2.0 ? 'critica' : 'alta',
          acao:       RECOMENDACOES_DIMENSAO[dim.id] || 'Investigar indicadores de ' + dim.label + '.'
        });
      }
    });
    recomendacoes.sort(function(a, b) {
      var ord = { critica: 0, alta: 1 };
      return (ord[a.prioridade] || 1) - (ord[b.prioridade] || 1);
    });

    // Tendência: últimas 4 pesquisas encerradas
    var historico = obterEvolucaoClimaHistorica(orgId, 4);

    // Resumo espontâneo do período
    var periodo   = new Date().toISOString().substring(0, 7);
    var espRes    = null;
    try { espRes = resumoEspontanea(orgId, periodo); } catch(e) {}

    return Object.assign({}, resultado, {
      geradoEm:        new Date().toISOString(),
      recomendacoes:   recomendacoes,
      tendencia:       historico,
      resumoEspontanea: espRes
    });
  }

  // ─── [B4] Saturação por dimensão ────────────────────────────────────────────

  /**
   * Retorna status de saturação por dimensão no período atual.
   * Meta = max(10, min(25, round(totalColaboradores × 0.25)))
   */
  function obterSaturacao(orgId) {
    var periodo = _periodoAtual();
    var total   = _totalColaboradores(orgId);
    var meta    = Math.max(10, Math.min(25, Math.round(total * 0.25)));
    var status  = EscutaRepository.listarSaturacao(orgId, periodo);
    return {
      periodo:  periodo,
      meta:     meta,
      total:    total,
      dimensoes: DIMENSOES.map(function(d) {
        var reg = status.find(function(s) { return s.dimensao === d.id; });
        var coletados = reg ? (reg.coletados || 0) : 0;
        return {
          id:        d.id,
          label:     d.label,
          coletados: coletados,
          meta:      meta,
          saturado:  coletados >= meta,
          pct:       Math.min(100, Math.round((coletados / meta) * 100))
        };
      })
    };
  }

  // ─── [C1] Painel de Governança ───────────────────────────────────────────────

  /**
   * Retorna painel completo de governança da escuta:
   * status operacional, qualidade metodológica 0–100, motor metodológico (avisos).
   */
  function obterGovernanca(orgId) {
    var pesquisas = EscutaRepository.listarPesquisas(orgId);
    var encerradas = pesquisas.filter(function(p) { return p.status === 'encerrada' && p.resultadoFinal; });
    var ativas     = pesquisas.filter(function(p) { return p.status === 'ativa'; });

    // Última pesquisa encerrada
    encerradas.sort(function(a,b) { return new Date(b.dataEncerramento||0) - new Date(a.dataEncerramento||0); });
    var ultima   = encerradas[0] || null;
    var resultado = ultima ? ultima.resultadoFinal : null;

    // Status operacional
    var statusSistema = _statusSistema(resultado, ativas.length > 0);

    // Qualidade metodológica
    var qualidade = _qualidadeMetodologica(resultado, orgId);

    // Motor metodológico (avisos)
    var motor = _motorMetodologico(resultado);

    // Saturação atual
    var saturacao = null;
    try { saturacao = obterSaturacao(orgId); } catch(e) {}

    // Resumo espontâneo
    var periodo  = _periodoAtual();
    var espRes   = null;
    try { espRes = resumoEspontanea(orgId, periodo); } catch(e) {}

    return {
      periodo:              periodo,
      pesquisasTotal:       pesquisas.length,
      pesquisasAtivas:      ativas.length,
      pesquisasEncerradas:  encerradas.length,
      ultimaPesquisa:       ultima ? {
        id:             ultima.id,
        titulo:         ultima.titulo,
        dataEncerramento: ultima.dataEncerramento,
        climaGeral:     resultado.climaGeral,
        nivelClimaGeral: resultado.nivelClimaGeral,
        indiceConfianca: resultado.indiceConfianca
      } : null,
      statusSistema:        statusSistema,
      qualidadeMetodologica: qualidade,
      motor:                motor,
      saturacao:            saturacao,
      resumoEspontanea:     espRes,
      geradoEm:             new Date().toISOString()
    };
  }

  /**
   * Status operacional do sistema de escuta.
   * @returns { codigo, rotulo, cor, descricao }
   */
  function _statusSistema(resultado, temAtiva) {
    if (!resultado) {
      return { codigo: 'sem_dados', rotulo: 'Sem Dados', cor: 'cinza',
               descricao: 'Nenhuma pesquisa encerrada. Execute ao menos uma rodada.' };
    }
    if (!resultado.confiancaSuficiente) {
      return { codigo: 'subamostrada', rotulo: 'Subamostrada', cor: 'cinza',
               descricao: 'Participação insuficiente (' + resultado.indiceConfianca + '%). Mínimo: 15%.' };
    }
    var temCritica = DIMENSOES.some(function(d) {
      return resultado.nivelPorDimensao && resultado.nivelPorDimensao[d.id] === 'critico';
    });
    if (temCritica) {
      return { codigo: 'critica', rotulo: 'Crítica', cor: 'vermelho',
               descricao: 'Uma ou mais dimensões em nível crítico. Ação institucional requerida.' };
    }
    var dimSemDados = DIMENSOES.filter(function(d) {
      return resultado.scoresPorDimensao && resultado.scoresPorDimensao[d.id] === null;
    }).length;
    if (dimSemDados >= 3) {
      return { codigo: 'desequilibrada', rotulo: 'Desequilibrada', cor: 'laranja',
               descricao: 'Cobertura insuficiente em ' + dimSemDados + ' dimensões.' };
    }
    return { codigo: 'confiavel', rotulo: 'Confiável', cor: 'verde',
             descricao: 'Amostra suficiente (' + resultado.indiceConfianca + '%) com cobertura equilibrada.' +
               (temAtiva ? ' Pesquisa ativa em andamento.' : '') };
  }

  /**
   * Score de qualidade metodológica 0–100.
   * Confiança (35) + cobertura dimensões (25) + saturação (20) + espontânea (20)
   */
  function _qualidadeMetodologica(resultado, orgId) {
    var pontos   = 0;
    var detalhes = [];

    // Confiança (35 pts)
    if (resultado && resultado.confiancaRepresentativa) {
      pontos += 35;
      detalhes.push({ fator: 'confianca', pts: 35, msg: 'Amostra representativa (≥35%).' });
    } else if (resultado && resultado.confiancaSuficiente) {
      pontos += 18;
      detalhes.push({ fator: 'confianca', pts: 18, msg: 'Amostra suficiente mas abaixo de 35%.' });
    } else {
      detalhes.push({ fator: 'confianca', pts: 0,  msg: 'Amostra insuficiente (<15%).' });
    }

    // Cobertura de dimensões (25 pts)
    var dimComDados = resultado
      ? DIMENSOES.filter(function(d) { return resultado.scoresPorDimensao && resultado.scoresPorDimensao[d.id] !== null; }).length
      : 0;
    var ptsDim = Math.round((dimComDados / DIMENSOES.length) * 25);
    pontos += ptsDim;
    detalhes.push({ fator: 'cobertura', pts: ptsDim,
      msg: dimComDados + '/' + DIMENSOES.length + ' dimensões com dados.' });

    // Saturação (20 pts)
    var satStatus = null;
    try { satStatus = obterSaturacao(orgId); } catch(e) {}
    var dimSat = satStatus
      ? satStatus.dimensoes.filter(function(d) { return d.coletados > 0; }).length : 0;
    var ptsSat = dimSat >= DIMENSOES.length ? 20 : dimSat >= 4 ? 10 : dimSat >= 2 ? 5 : 0;
    pontos += ptsSat;
    detalhes.push({ fator: 'saturacao', pts: ptsSat,
      msg: dimSat + ' dimensões com coleta no período.' });

    // Escuta espontânea (20 pts)
    var espRes = null;
    try { espRes = resumoEspontanea(orgId, _periodoAtual()); } catch(e) {}
    var ptsEsp = espRes && espRes.total >= 5 ? 20 : espRes && espRes.total >= 2 ? 10 : 0;
    pontos += ptsEsp;
    detalhes.push({ fator: 'espontanea', pts: ptsEsp,
      msg: (espRes ? espRes.total : 0) + ' relatos espontâneos no período.' });

    var nivel = pontos >= 80 ? 'excelente' : pontos >= 60 ? 'bom' : pontos >= 40 ? 'regular' : 'baixo';
    return { pontos: pontos, nivel: nivel, detalhes: detalhes };
  }

  /**
   * Motor metodológico: gera lista de avisos operacionais sobre o sistema.
   */
  function _motorMetodologico(resultado) {
    var mensagens = [];
    if (!resultado) {
      mensagens.push({ tipo: 'sem_dados', severidade: 'info',
        msg: 'Nenhuma pesquisa encerrada ainda. Crie e ative uma pesquisa para começar.',
        acao: 'Criar primeira pesquisa de clima.' });
      return mensagens;
    }
    if (!resultado.confiancaSuficiente) {
      mensagens.push({ tipo: 'vies_nao_resposta', severidade: 'alto',
        msg: 'Taxa de resposta de ' + resultado.indiceConfianca + '% abaixo do mínimo (15%). Indicadores podem não refletir a realidade.',
        acao: 'Divulgar a pesquisa internamente. Verificar se todos os colaboradores têm acesso.' });
    }
    var dimSemDados = DIMENSOES.filter(function(d) {
      return resultado.scoresPorDimensao && resultado.scoresPorDimensao[d.id] === null;
    });
    if (dimSemDados.length > 0) {
      mensagens.push({ tipo: 'desequilibrio_dimensao', severidade: dimSemDados.length >= 4 ? 'alto' : 'moderado',
        msg: 'Dimensões sem dados: ' + dimSemDados.map(function(d){return d.label;}).join(', ') + '.',
        acao: 'Verificar se colaboradores estão respondendo todas as dimensões.' });
    }
    if (resultado.nivelPorDimensao && resultado.nivelPorDimensao.seguranca === 'critico') {
      mensagens.push({ tipo: 'nr1_alerta', severidade: 'critico',
        msg: 'Segurança psicológica em nível crítico — obrigação NR-1 de intervenção.',
        acao: 'Acionar imediatamente protocolo de saúde ocupacional e psicossocial.' });
    }
    return mensagens;
  }

  // ─── [C2] Ciclo de feedback ──────────────────────────────────────────────────

  /**
   * Retorna as últimas ações tomadas com base nas escutas (feedback fechado ao colaborador).
   * Usa alertas resolvidos do AuditoriaService.
   */
  function obterFeedback(orgId) {
    try {
      var pesquisas = EscutaRepository.listarPesquisas(orgId)
        .filter(function(p) { return p.status === 'encerrada'; })
        .sort(function(a,b){ return new Date(b.dataEncerramento||0) - new Date(a.dataEncerramento||0); })
        .slice(0, 3);
      var feedback = pesquisas.map(function(p) {
        return {
          pesquisaId:       p.id,
          titulo:           p.titulo,
          dataEncerramento: p.dataEncerramento,
          climaGeral:       p.resultadoFinal ? p.resultadoFinal.climaGeral : null,
          nivel:            p.resultadoFinal ? p.resultadoFinal.nivelClimaGeral : null
        };
      });
      return { pesquisas: feedback };
    } catch(e) {
      return { pesquisas: [] };
    }
  }

  // ─── Helpers internos ───────────────────────────────────────────────────────

  function _selecionarConvidadosFairness(orgId, dimensoesSolicitadas) {
    var colaboradores = [];
    try {
      colaboradores = ColaboradorRepository.listar(orgId)
        .filter(function(c) { return c.status === 'ativo'; });
    } catch(e) { return []; }
    if (colaboradores.length === 0) return [];

    var participacoes = {};
    var todasRespostas = lerJSON('respostas_clima.json') || [];
    todasRespostas
      .filter(function(r) { return r.orgId === orgId; })
      .forEach(function(r) {
        if (r.colaboradorId) {
          participacoes[r.colaboradorId] = (participacoes[r.colaboradorId] || 0) + 1;
        }
      });

    var ordenados = colaboradores.slice().sort(function(a, b) {
      var pa = participacoes[a.id] || 0;
      var pb = participacoes[b.id] || 0;
      if (pa !== pb) return pa - pb;
      return new Date(a.criadoEm||0) - new Date(b.criadoEm||0);
    });
    return ordenados.map(function(c) { return c.id; });
  }

  function _todosColaboradoresAtivos(orgId) {
    try {
      return ColaboradorRepository.listar(orgId)
        .filter(function(c) { return c.status === 'ativo'; })
        .map(function(c) { return c.id; });
    } catch(e) { return []; }
  }

  function _totalColaboradores(orgId) {
    try {
      var lista = ColaboradorRepository.listar(orgId)
        .filter(function(c) { return c.status === 'ativo'; });
      return lista.length || 10;
    } catch(e) { return 10; }
  }

  function _proximaRodada(orgId) {
    return EscutaRepository.listarPesquisas(orgId).length + 1;
  }

  function _dataFimPadrao() {
    var d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  }

  function _periodoAtual() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function _enviarConvites(orgId, pesquisaId, convidados, pesquisa) {
    try {
      var orgNome = getOrgConfig().orgNome || 'sua organização';
      var link    = ScriptApp.getService().getUrl();
      var dims    = pesquisa.dimensoes || [];
      var isNR1   = dims.indexOf('seguranca') >= 0;

      // Template HTML diferenciado para pesquisas NR-1
      var assunto = isNR1
        ? '⚠️ [NR-1] Pesquisa Psicossocial Obrigatória — ' + pesquisa.titulo
        : '[Escuta Institucional] ' + pesquisa.titulo;

      convidados.forEach(function(colaboradorId) {
        var colab = ColaboradorRepository.listar(orgId)
          .find(function(c){ return c.id === colaboradorId; });
        if (!colab || !colab.email) return;

        var urlResposta = link + '#escuta';

        var corpo = 'Olá, ' + (colab.nome || colab.email.split('@')[0]) + '!\n\n';
        if (isNR1) {
          corpo += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
          corpo += 'ATENÇÃO — AVALIAÇÃO NR-1 (Riscos Psicossociais)\n';
          corpo += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
          corpo += orgNome + ' está realizando a avaliação de riscos psicossociais\n';
          corpo += 'exigida pela Norma Regulamentadora NR-1 (Portaria MTE 1.419/2024).\n\n';
          corpo += 'SUA PARTICIPAÇÃO É OBRIGATÓRIA PARA FINS DE CONFORMIDADE LEGAL.\n\n';
        } else {
          corpo += orgNome + ' iniciou uma rodada de Escuta Institucional.\n';
          corpo += 'Sua participação é fundamental para melhorarmos o ambiente de trabalho.\n\n';
        }

        corpo += '👉 Acesse: ' + urlResposta + '\n\n';
        corpo += 'Prazo: ' + (pesquisa.dataFim || 'em aberto') + '\n';
        corpo += 'Tempo estimado: 5 minutos\n\n';

        if (pesquisa.anonima) {
          corpo += '🔒 Suas respostas são completamente anônimas.\n';
          corpo += '   Nem RH nem gestores saberão sua resposta individual.\n\n';
        }

        if (isNR1) {
          corpo += '📋 O que é a NR-1?\n';
          corpo += '   A Norma Regulamentadora 1 exige que empregadores\n';
          corpo += '   identifiquem e gerenciem riscos psicossociais no trabalho\n';
          corpo += '   (sobrecarga, assédio, violência, etc.). Os dados coletados\n';
          corpo += '   são usados para elaborar o Programa de Gerenciamento de\n';
          corpo += '   Riscos (PGR) e Plano de Ação da organização.\n\n';
        }

        corpo += 'Obrigado por colaborar!\n' + orgNome;

        GmailApp.sendEmail(colab.email, assunto, corpo);
      });
      Logger.info('escuta', '_enviarConvites',
        'Convites enviados: ' + convidados.length + ' | NR-1: ' + isNR1);
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

  // ─── Consultas para frontend ─────────────────────────────────────────────────

  function obterCatalogoDimensoes() {
    return DIMENSOES.map(function(d) {
      return {
        id:        d.id,
        label:     d.label,
        grupo:     d.grupo,
        descricao: d.descricao,
        invertida: d.invertida,
        peso:      PESOS_DIMENSAO[d.id] || 1.0,
        perguntas: PERGUNTAS_POR_DIMENSAO[d.id] || []
      };
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
        pesquisaId:             p.id,
        rodada:                 p.rodada,
        dataEncerramento:       p.dataEncerramento,
        mediaPonderada:         p.resultadoFinal.mediaPonderada,
        climaGeral:             p.resultadoFinal.climaGeral,
        nivelClimaGeral:        p.resultadoFinal.nivelClimaGeral,
        indiceConfianca:        p.resultadoFinal.indiceConfianca,
        confiancaSuficiente:    p.resultadoFinal.confiancaSuficiente,
        confiancaRepresentativa: p.resultadoFinal.confiancaRepresentativa,
        dimensoes:              p.resultadoFinal.scoresPorDimensao,
        niveis:                 p.resultadoFinal.nivelPorDimensao
      };
    });
  }

  // ─── [F20] Perfil analítico ─────────────────────────────────────────────────

  /**
   * Salva ou atualiza o perfil demográfico/analítico de um colaborador.
   * Campos aceitos: genero, raca, orientacao, faixaSalarial, vinculo, nivel,
   *                 tempoDeCasa, regiao, deficiencia.
   */
  function salvarPerfilAnalitico(orgId, email, dados, emailAdmin) {
    EscutaRepository.salvarPerfilAnalitico(orgId, email, dados);
    AuditoriaService.registrar('ESCUTA_PERFIL_SALVO', 'escuta', { email: email }, emailAdmin || email);
  }

  /**
   * Obtém perfil analítico de um colaborador.
   */
  function obterPerfilAnalitico(orgId, email) {
    return EscutaRepository.obterPerfilAnalitico(orgId, email);
  }

  // ─── [F20] Resolução de alertas ─────────────────────────────────────────────

  /**
   * Resolve um alerta registrado na organização.
   * @param {string} orgId
   * @param {string} alertaId — ID do alerta
   * @param {string} acao — descrição da ação tomada
   * @param {string} emailAdmin — quem resolveu
   */
  function resolverAlerta(orgId, alertaId, acao, emailAdmin) {
    EscutaRepository.resolverAlerta(orgId, alertaId, acao, emailAdmin);
    AuditoriaService.registrar('ESCUTA_ALERTA_RESOLVIDO', 'escuta', { alertaId: alertaId, acao: acao }, emailAdmin);
    return { ok: true };
  }

  // ─── [F20] Participação histórica ───────────────────────────────────────────

  /**
   * Obtém 12 meses de participação (pulse + espontânea) para gráficos de tendência.
   * @param {string} orgId
   * @returns {Array} — [{periodo, totalPulse, totalEspontanea, totalColaboradores}]
   */
  function obterParticipacaoHistorica(orgId) {
    var resultado = [];
    var agora = new Date();
    for (var i = 11; i >= 0; i--) {
      var d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      var periodo = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      var pulse = EscutaRepository.listarPulseRespostas(orgId, periodo).length;
      var espontanea = EscutaRepository.listarEspontanea(orgId, periodo).length;
      resultado.push({ periodo: periodo, totalPulse: pulse, totalEspontanea: espontanea });
    }
    return resultado;
  }

  // ─── [F20] LGPD — supressão de e-mails antigos ──────────────────────────────

  /**
   * Remove o e-mail identificador de respostas pulse com mais de 90 dias.
   * Operação irreversível — LGPD art.16.
   * @param {string} orgId
   * @returns {{ suprimidos: number }}
   */
  function suprimirEmailsAntigos(orgId) {
    var limite = new Date();
    limite.setDate(limite.getDate() - 90);
    var suprimidos = 0;
    modifyJSON('pulse_respostas.json', function(lista) {
      if (!Array.isArray(lista)) return lista;
      lista.forEach(function(r) {
        if (r.orgId === orgId && r.email && new Date(r.criadoEm || 0) < limite) {
          delete r.email;
          r._lgpd = 'suprimido';
          suprimidos++;
        }
      });
      return lista;
    });
    modifyJSON('escuta_espontanea.json', function(lista) {
      if (!Array.isArray(lista)) return lista;
      lista.forEach(function(r) {
        if (r.orgId === orgId && r.email && new Date(r.criadoEm || 0) < limite) {
          delete r.email;
          r._lgpd = 'suprimido';
          suprimidos++;
        }
      });
      return lista;
    });
    AuditoriaService.registrar('ESCUTA_LGPD_SUPRESSAO', 'escuta', { suprimidos: suprimidos }, 'sistema');
    return { suprimidos: suprimidos };
  }

  // ─── [F20] Configuração do módulo ───────────────────────────────────────────

  var _CONFIG_DEFAULTS = {
    limiteDia:       3,       // max perguntas pulse por dia
    antiSpamHoras:   4,       // horas mínimas entre perguntas
    confiancaMin:    15,      // % mínimo para índice suficiente
    confiancaRepresentativa: 35,
    grupoMinimo:     5,       // respostas mínimas para análise de subgrupo
    metaSaturacao:   null,    // null = calcular dinâmico (25% dos colaboradores, clamp 10–25)
    notificarGestores: true,
    perguntasAtivas:  {}      // override de perguntas por perguntaId: true/false
  };

  /**
   * Obtém configuração do módulo de escuta da organização.
   * Combina defaults com config salva em config_org.json.escutaConfig.
   */
  function obterConfigEscuta(orgId) {
    var cfg = getOrgConfig();
    var salvo = (cfg && cfg.escutaConfig) ? cfg.escutaConfig : {};
    return Object.assign({}, _CONFIG_DEFAULTS, salvo);
  }

  /**
   * Salva configuração do módulo de escuta.
   * Persiste em config_org.json.escutaConfig.
   */
  function salvarConfigEscuta(orgId, config, email) {
    var cfg = getOrgConfig();
    cfg.escutaConfig = Object.assign({}, obterConfigEscuta(orgId), config);
    // Usa modifyJSON pois getOrgConfig retorna o objeto — precisamos gravar no arquivo
    modifyJSON('config_org.json', function(obj) {
      if (!obj || typeof obj !== 'object') obj = {};
      obj.escutaConfig = cfg.escutaConfig;
      return obj;
    });
    AuditoriaService.registrar('ESCUTA_CONFIG_SALVA', 'escuta', { campos: Object.keys(config) }, email);
    return { ok: true };
  }

  /**
   * Ativa ou desativa uma pergunta do catálogo pulse para esta organização.
   * Persiste o override em config_org.json.escutaPerguntas.
   */
  function togglePergunta(orgId, perguntaId, ativo, email) {
    modifyJSON('config_org.json', function(obj) {
      if (!obj || typeof obj !== 'object') obj = {};
      if (!obj.escutaPerguntas) obj.escutaPerguntas = {};
      obj.escutaPerguntas[perguntaId] = ativo;
      return obj;
    });
    AuditoriaService.registrar('ESCUTA_PERGUNTA_TOGGLE', 'escuta', { perguntaId: perguntaId, ativo: ativo }, email);
    return { ok: true };
  }

  // ─── [F20] Dashboard unificado (substitui múltiplas chamadas no frontend) ───

  /**
   * Carrega todos os dados da tela de escuta em uma única chamada GAS.
   * Inclui: métricas, governança, pulse dashboard, participação histórica.
   * @param {string} orgId
   * @returns {{ metricas, governanca, pulse, participacao }}
   */
  function obterDadosUnificados(orgId) {
    var agora = new Date();
    var periodo = agora.getFullYear() + '-' + String(agora.getMonth() + 1).padStart(2, '0');

    var metricas = EscutaRepository.metricasPesquisas(orgId);
    var evolucao = obterEvolucaoClimaHistorica(orgId, 4);
    metricas.evolucao   = evolucao;
    metricas.ultimaMedia = evolucao.length ? evolucao[evolucao.length - 1].mediaPonderada : null;

    var gov;
    try { gov = obterGovernanca(orgId); } catch(e) { gov = { ok: false, motivo: e.message }; }

    var pulseDash;
    try { pulseDash = EscutaPulseEngine.obterDashboardPulse(orgId, periodo); } catch(e) { pulseDash = null; }

    var participacao;
    try { participacao = obterParticipacaoHistorica(orgId); } catch(e) { participacao = []; }

    var alertasAtivos = EscutaRepository.listarAlertas(orgId, true);

    return {
      metricas:     metricas,
      governanca:   gov,
      pulse:        pulseDash,
      participacao: participacao,
      alertasAtivos: alertasAtivos.length
    };
  }

  // ─── API pública ──────────────────────────────────────────────────────────────

  return {
    // CRUD pesquisas
    criarPesquisa:              criarPesquisa,
    ativarPesquisa:             ativarPesquisa,
    encerrarPesquisa:           encerrarPesquisa,
    registrarResposta:          registrarResposta,
    listarPendentesObrigatorias: listarPendentesObrigatorias,
    // Análise
    calcularResultados:         calcularResultados,
    cruzarClimaComPessoas:      cruzarClimaComPessoas,
    gerarRelatorio:             gerarRelatorio,         // [B3]
    // Escuta espontânea
    registrarEspontanea:        registrarEspontanea,    // [B2]
    resumoEspontanea:           resumoEspontanea,       // [B2]
    // Saturação
    obterSaturacao:             obterSaturacao,         // [B4]
    // Governança
    obterGovernanca:            obterGovernanca,        // [C1]
    obterFeedback:              obterFeedback,          // [C2]
    // Catálogo e histórico
    obterCatalogoDimensoes:      obterCatalogoDimensoes,
    obterEvolucaoClimaHistorica: obterEvolucaoClimaHistorica,
    // [F20] Perfil analítico
    salvarPerfilAnalitico:       salvarPerfilAnalitico,
    obterPerfilAnalitico:        obterPerfilAnalitico,
    // [F20] Alertas
    resolverAlerta:              resolverAlerta,
    // [F20] Participação + LGPD
    obterParticipacaoHistorica:  obterParticipacaoHistorica,
    suprimirEmailsAntigos:       suprimirEmailsAntigos,
    // [F20] Configuração
    obterConfigEscuta:           obterConfigEscuta,
    salvarConfigEscuta:          salvarConfigEscuta,
    togglePergunta:              togglePergunta,
    // [F20] Dados unificados
    obterDadosUnificados:        obterDadosUnificados,
    // Helpers expostos
    nivelClimatico:              _nivelClimatico         // [A3] para uso externo
  };
})();
