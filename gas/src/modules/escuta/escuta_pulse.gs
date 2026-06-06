/**
 * @file escuta_pulse.gs
 * @layer engine
 * @description Motor do Sistema Pulse de Escuta Contínua — adapta a v1 à arquitetura v2.
 *
 *   O sistema pulse coleta 1 pergunta por vez, de forma não-invasiva (widget flutuante),
 *   de maneira contínua e adaptativa:
 *   - Respeita turnos (manhã/tarde/noite) e progresso temporal
 *   - Controla limite por dia e intervalo anti-spam por colaborador
 *   - Prioriza dimensões menos cobertas no período (distribuição justa)
 *   - Controle de saturação: quando uma dimensão atinge sua cota, para de ser perguntada
 *   - Banco de 24 perguntas padrão com pesos (NR-1 peso=1.5)
 *   - Inversão para dimensões negativas (demanda/carga)
 *   - Dashboard de clima a partir das respostas pulse (paralelo às pesquisas formais)
 *
 * @depends escuta_repository.gs, auditoria_service.gs
 */

var EscutaPulseEngine = (function() {

  // ─── Sistema de turnos ──────────────────────────────────────────────────────

  function _getTurnosNumericos() {
    try {
      var ts = SistemaConfigService.getTurnos();
      if (Array.isArray(ts) && ts.length) {
        return ts.map(function(t) {
          var ip = (t.ini || t.inicio || '08:00').split(':').map(Number);
          var fp = (t.fim || '12:00').split(':').map(Number);
          return { nome: t.id || t.label || 'turno',
                   inicio: ip[0] + (ip[1] || 0) / 60,
                   fim:    fp[0] + (fp[1] || 0) / 60 };
        });
      }
    } catch(e) {}
    return [
      { nome: 'manha', inicio: 8, fim: 12 },
      { nome: 'tarde', inicio: 12, fim: 17 },
      { nome: 'noite', inicio: 17, fim: 21.5 }
    ];
  }

  // ─── Configurações padrão ───────────────────────────────────────────────────

  var DEFAULTS = {
    LIMITE_DIA:              3,    // máx. perguntas pulse por dia por colaborador
    ANTI_SPAM_HORAS:         4,    // intervalo mínimo entre perguntas (horas)
    CONFIANCA_MINIMA:        0.15, // 15%: mínimo para conclusões
    CONFIANCA_REPRESENTATIVA: 0.35, // 35%: amostra representativa
    META_FACTOR:             0.25, // meta = total × fator
    META_MIN:                10,
    META_MAX:                25,
    GRUPO_MINIMO:            5     // mín. respostas para calcular indicadores
  };

  // ─── Banco de 24 perguntas padrão ───────────────────────────────────────────
  //   8 dimensões × 3 perguntas cada
  //   tipoTempo: 'instantanea' | 'acumulativa' (≥50% turno) | 'final' (≥75% turno)
  //   Dimensões invertidas (nota alta = situação negativa): demanda

  var BANCO_PERGUNTAS = [
    // VIGOR (UWES)
    { id: 'V01', dimensao: 'vigor', texto: 'Meu nível de energia está elevado agora.',
      tipo: 'escala', tipoTempo: 'instantanea', peso: 1.0, ativa: true },
    { id: 'V02', dimensao: 'vigor', texto: 'Você se sente revigorado(a) para as atividades?',
      tipo: 'emoji',  tipoTempo: 'acumulativa', peso: 0.9, ativa: true },
    { id: 'V03', dimensao: 'vigor', texto: 'Chego ao final do expediente ainda com energia.',
      tipo: 'escala', tipoTempo: 'final',       peso: 1.1, ativa: true },
    // DEDICAÇÃO (UWES)
    { id: 'D01', dimensao: 'dedicacao', texto: 'Você se sente entusiasmado(a) com seu trabalho?',
      tipo: 'escala', tipoTempo: 'instantanea', peso: 1.0, ativa: true },
    { id: 'D02', dimensao: 'dedicacao', texto: 'Seu trabalho está fazendo sentido pra você hoje?',
      tipo: 'emoji',  tipoTempo: 'acumulativa', peso: 0.9, ativa: true },
    { id: 'D03', dimensao: 'dedicacao', texto: 'Você terminou o dia sentindo orgulho do que fez?',
      tipo: 'escala', tipoTempo: 'final',       peso: 1.0, ativa: true },
    // ABSORÇÃO (UWES)
    { id: 'AB01', dimensao: 'absorcao', texto: 'Você conseguiu se concentrar bem nas tarefas hoje?',
      tipo: 'escala', tipoTempo: 'final',       peso: 1.0, ativa: true },
    { id: 'AB02', dimensao: 'absorcao', texto: 'O tempo passou rápido enquanto você trabalhava?',
      tipo: 'emoji',  tipoTempo: 'acumulativa', peso: 0.9, ativa: true },
    { id: 'AB03', dimensao: 'absorcao', texto: 'Você ficou tão envolvido(a) no trabalho que perdeu a noção do tempo?',
      tipo: 'escala', tipoTempo: 'final',       peso: 1.0, ativa: true },
    // DEMANDA — invertida (nota alta = mais pressão = pior)
    { id: 'DM01', dimensao: 'demanda', texto: 'Minha carga de trabalho está pesada neste momento.',
      tipo: 'escala', tipoTempo: 'instantanea', peso: 1.0, ativa: true },
    { id: 'DM02', dimensao: 'demanda', texto: 'Você está conseguindo concluir suas tarefas no tempo disponível?',
      tipo: 'emoji',  tipoTempo: 'acumulativa', peso: 0.9, ativa: true },
    { id: 'DM03', dimensao: 'demanda', texto: 'A carga de trabalho hoje foi pesada, no geral.',
      tipo: 'escala', tipoTempo: 'final',       peso: 1.1, ativa: true },
    // CONTROLE (JDC)
    { id: 'CT01', dimensao: 'controle', texto: 'Você tem autonomia para organizar suas tarefas hoje?',
      tipo: 'escala', tipoTempo: 'instantanea', peso: 1.0, ativa: true },
    { id: 'CT02', dimensao: 'controle', texto: 'Você se sente capaz de influenciar o seu ritmo de trabalho?',
      tipo: 'emoji',  tipoTempo: 'acumulativa', peso: 0.9, ativa: true },
    { id: 'CT03', dimensao: 'controle', texto: 'Hoje você pôde tomar decisões independentes no seu trabalho?',
      tipo: 'escala', tipoTempo: 'final',       peso: 1.0, ativa: true },
    // COLABORAÇÃO (CVF)
    { id: 'CL01', dimensao: 'colaboracao', texto: 'Você se sente apoiado(a) pela sua equipe hoje?',
      tipo: 'escala', tipoTempo: 'instantanea', peso: 1.0, ativa: true },
    { id: 'CL02', dimensao: 'colaboracao', texto: 'Quando precisou de ajuda, conseguiu obtê-la?',
      tipo: 'emoji',  tipoTempo: 'acumulativa', peso: 0.9, ativa: true },
    { id: 'CL03', dimensao: 'colaboracao', texto: 'O clima de cooperação na minha equipe foi bom hoje.',
      tipo: 'escala', tipoTempo: 'final',       peso: 1.1, ativa: true },
    // INOVAÇÃO (CVF)
    { id: 'IN01', dimensao: 'inovacao', texto: 'Você se sentiu livre para propor novas ideias hoje?',
      tipo: 'escala', tipoTempo: 'acumulativa', peso: 1.0, ativa: true },
    { id: 'IN02', dimensao: 'inovacao', texto: 'O ambiente estimulou sua criatividade hoje?',
      tipo: 'emoji',  tipoTempo: 'acumulativa', peso: 0.9, ativa: true },
    { id: 'IN03', dimensao: 'inovacao', texto: 'Você se sente encorajado(a) a experimentar novas formas de trabalhar?',
      tipo: 'escala', tipoTempo: 'final',       peso: 1.0, ativa: true },
    // SEGURANÇA PSICOLÓGICA (NR-1) — peso maior: compliance regulatório
    { id: 'SP01', dimensao: 'seguranca', texto: 'Você se sente seguro(a) para expressar sua opinião no trabalho?',
      tipo: 'escala', tipoTempo: 'acumulativa', peso: 1.5, ativa: true },
    { id: 'SP02', dimensao: 'seguranca', texto: 'Me sinto emocionalmente bem no ambiente de trabalho.',
      tipo: 'escala', tipoTempo: 'acumulativa', peso: 1.5, ativa: true },
    { id: 'SP03', dimensao: 'seguranca', texto: 'Você se sente psicologicamente seguro(a) no ambiente de trabalho?',
      tipo: 'escala', tipoTempo: 'final',       peso: 1.3, ativa: true }
  ];

  var DIMENSOES_INVERTIDAS = ['demanda'];

  // ─── Config da organização ──────────────────────────────────────────────────

  function _lerConfigPulse() {
    try {
      var cfg = getOrgConfig();
      var ec  = (cfg && cfg.escutaConfig) ? cfg.escutaConfig : {};
      return {
        limiteDia:     (ec.limiteDia     > 0) ? ec.limiteDia     : DEFAULTS.LIMITE_DIA,
        antiSpamHoras: (ec.antiSpamHoras > 0) ? ec.antiSpamHoras : DEFAULTS.ANTI_SPAM_HORAS
      };
    } catch(e) {
      return { limiteDia: DEFAULTS.LIMITE_DIA, antiSpamHoras: DEFAULTS.ANTI_SPAM_HORAS };
    }
  }

  // ─── Sistema temporal ───────────────────────────────────────────────────────

  function _turnoAtual() {
    var agora  = new Date();
    var hora   = agora.getHours() + agora.getMinutes() / 60;
    var turnos = _getTurnosNumericos();
    for (var i = 0; i < turnos.length; i++) {
      var t = turnos[i];
      if (hora >= t.inicio && hora < t.fim) return t;
    }
    return turnos[0]; // fallback: primeiro turno
  }

  function _progressoTurno() {
    var agora  = new Date();
    var hora   = agora.getHours() + agora.getMinutes() / 60;
    var turno  = _turnoAtual();
    var prog  = (hora - turno.inicio) / (turno.fim - turno.inicio);
    return Math.max(0, Math.min(1, prog));
  }

  function _perguntaValidaTemporalmente(tipoTempo) {
    var prog = _progressoTurno();
    if (tipoTempo === 'instantanea') return true;
    if (tipoTempo === 'acumulativa') return prog >= 0.50;
    if (tipoTempo === 'final')       return prog >= 0.75;
    return false;
  }

  function _momentoPropicio() {
    var prog = _progressoTurno();
    return prog >= 0.10 && prog <= 0.95; // evita início e fim do turno
  }

  // ─── Helpers de data ────────────────────────────────────────────────────────

  function _periodoAtual() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function _dataHoje() {
    var d = new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  // ─── Saturação ──────────────────────────────────────────────────────────────

  function _metaDimensao(orgId) {
    var total = 20; // fallback
    try {
      // Usa AcessoService (usuarios_acesso.json) — fonte canônica de todos os usuários ativos,
      // independente de terem registro formal em EQUIPES.Funcionarios.
      var ativos = AcessoService.listarUsuarios()
        .filter(function(u){ return u.status === 'ativo'; });
      if (ativos.length > 0) total = ativos.length;
    } catch(e) {}
    return Math.max(DEFAULTS.META_MIN,
           Math.min(DEFAULTS.META_MAX, Math.round(total * DEFAULTS.META_FACTOR)));
  }

  function _dimensaoSaturada(orgId, dimensaoId) {
    var periodo = _periodoAtual();
    var lista   = EscutaRepository.listarSaturacao(orgId, periodo);
    var reg     = lista.find(function(s){ return s.dimensao === dimensaoId; });
    if (!reg) return false;
    return (reg.coletados || 0) >= _metaDimensao(orgId);
  }

  // ─── Seleção de pergunta pulse ───────────────────────────────────────────────

  /**
   * Seleciona a próxima pergunta pulse para o colaborador.
   * Aplica filtros sequenciais:
   * 1. Momento propício no turno (evita início/fim)?
   * 2. Colaborador ainda não atingiu limite do dia (3)?
   * 3. Anti-spam: intervalo ≥ 4h desde última resposta?
   * 4. Dimensão não saturada no período?
   * 5. Pergunta não respondida nas últimas 48h?
   * 6. Pergunta válida temporalmente (instantânea/acumulativa/final)?
   * → Prioriza dimensão com menor cobertura no período
   *
   * @param {string} orgId
   * @param {string} colaboradorId — email ou ID do colaborador
   * @returns {{ ok, pergunta|null, motivo, turno, progresso }}
   */
  function obterPerguntaPulse(orgId, colaboradorId) {
    try {
      if (!_momentoPropicio()) {
        return { ok: true, pergunta: null, motivo: 'momento_impropicio' };
      }

      var hoje    = _dataHoje();
      var periodo = _periodoAtual();
      var agora   = new Date();

      var cfgPulse = _lerConfigPulse();

      var todasRespostas  = EscutaRepository.listarPulseRespostas(orgId, periodo);
      var respostasColab  = todasRespostas.filter(function(r) {
        return r.colaboradorId === colaboradorId;
      });
      var respostasHoje = respostasColab.filter(function(r) {
        return (r.criadoEm || '').startsWith(hoje);
      });

      // Limite diário (usa config da org)
      if (respostasHoje.length >= cfgPulse.limiteDia) {
        return { ok: true, pergunta: null, motivo: 'limite_dia' };
      }

      // Anti-spam — usa respostasColab (não respostasHoje) para cobrir a virada de meia-noite:
      // se a última resposta foi às 23h50 de ontem, a janela de 4h deve continuar bloqueando hoje.
      if (respostasColab.length > 0) {
        var ultima = respostasColab.slice().sort(function(a, b) {
          return new Date(b.criadoEm) - new Date(a.criadoEm);
        })[0];
        var diffH = (agora - new Date(ultima.criadoEm)) / 3600000;
        if (diffH < cfgPulse.antiSpamHoras) {
          return { ok: true, pergunta: null, motivo: 'anti_spam' };
        }
      }

      // IDs já respondidos nas últimas 48h
      var idsRespondidos = {};
      respostasColab.filter(function(r) {
        return (agora - new Date(r.criadoEm)) < 172800000; // 48h
      }).forEach(function(r) { idsRespondidos[r.perguntaId] = true; });

      // Filtra perguntas candidatas
      var candidatas = BANCO_PERGUNTAS.filter(function(p) {
        return p.ativa &&
          !idsRespondidos[p.id] &&
          !_dimensaoSaturada(orgId, p.dimensao) &&
          _perguntaValidaTemporalmente(p.tipoTempo);
      });

      if (!candidatas.length) {
        return { ok: true, pergunta: null, motivo: 'sem_perguntas' };
      }

      // Conta respostas por dimensão no período para priorizar menos coberta
      var coberturaD = {};
      todasRespostas.forEach(function(r) {
        coberturaD[r.dimensao] = (coberturaD[r.dimensao] || 0) + 1;
      });

      // Ordena por menor cobertura da dimensão (fairness entre dimensões)
      candidatas.sort(function(a, b) {
        return (coberturaD[a.dimensao] || 0) - (coberturaD[b.dimensao] || 0);
      });

      var pergunta = candidatas[0];

      // Registra impressão (sem PII — sem colaboradorId)
      try {
        EscutaRepository.salvarPulseImpressao(orgId, {
          perguntaId: pergunta.id,
          dimensao:   pergunta.dimensao,
          turno:      _turnoAtual().nome,
          periodo:    periodo
        });
      } catch(e) { /* não crítico */ }

      return {
        ok:       true,
        pergunta: pergunta,
        turno:    _turnoAtual().nome,
        progresso: _progressoTurno()
      };
    } catch(e) {
      return { ok: false, msg: e.message };
    }
  }

  // ─── Registrar resposta pulse ───────────────────────────────────────────────

  /**
   * Persiste uma resposta do sistema pulse.
   * Usa modifyJSON que já tem LockService interno.
   * Incrementa saturação da dimensão.
   *
   * @param {string} orgId
   * @param {string} colaboradorId
   * @param {Object} dados — { perguntaId, resposta(1-5), dimensao, tipo, tipoTempo, anonima }
   */
  function registrarRespostaPulse(orgId, colaboradorId, dados) {
    var pergunta = BANCO_PERGUNTAS.find(function(p){ return p.id === dados.perguntaId; });
    if (!pergunta) throw new Error('Pergunta pulse não encontrada: ' + dados.perguntaId);

    var anonima  = dados.anonima !== false;
    var turno    = _turnoAtual();
    var periodo  = _periodoAtual();

    var registro = {
      orgId:         orgId,
      // colaboradorId sempre armazenado para anti-spam e monitoramento operacional;
      // o flag anonima controla apenas a exibição nos relatórios de gestão
      colaboradorId: colaboradorId,
      perguntaId:    dados.perguntaId,
      dimensao:      pergunta.dimensao,
      resposta:      Number(dados.resposta),
      tipo:          pergunta.tipo,
      tipoTempo:     pergunta.tipoTempo,
      turno:         turno.nome,
      progressoTurno: _progressoTurno().toFixed(3),
      periodo:       periodo,
      anonima:       anonima
    };

    var id = EscutaRepository.salvarPulseResposta(orgId, registro);

    // Incrementa saturação da dimensão
    try {
      EscutaRepository.incrementarSaturacao(orgId, pergunta.dimensao, periodo);
    } catch(e) { /* não crítico */ }

    AuditoriaService.registrar('ESCUTA_PULSE_RESPOSTA', 'escuta',
      { perguntaId: dados.perguntaId, dimensao: pergunta.dimensao }, colaboradorId);

    return { ok: true, id: id };
  }

  // ─── Dashboard a partir dos dados pulse ─────────────────────────────────────

  /**
   * Calcula indicadores de clima a partir das respostas pulse do período.
   * Usa o mesmo algoritmo de inversão e pesos do engine principal.
   * Pode coexistir com os resultados de pesquisas formais.
   *
   * @param {string} orgId
   * @param {string} [periodo] — YYYY-MM; default: período atual
   * @returns {{ ok, indicadores, confianca, saturacao, tendencia, totalParticipantes, porSetor }}
   */
  function obterDashboardPulse(orgId, periodo) {
    try {
      var p        = periodo || _periodoAtual();
      var respostas = EscutaRepository.listarPulseRespostas(orgId, p);

      var indicadores  = _calcIndicadores(orgId, respostas);
      var participantes = _contarParticipantes(respostas);
      var confianca    = _calcConfianca(orgId, participantes);
      var saturacao    = _calcStatusSaturacao(orgId, p);
      var tendencia    = _calcTendencia(orgId, p);
      var porSetor     = _calcPorSetor(orgId, respostas);

      return {
        ok:               true,
        periodo:          p,
        indicadores:      indicadores,
        confianca:        confianca,
        totalParticipantes: participantes,
        saturacao:        saturacao,
        tendencia:        tendencia,
        porSetor:         porSetor,
        bloqueado:        !confianca.suficiente
      };
    } catch(e) {
      return { ok: false, msg: e.message };
    }
  }

  // ─── Cálculos internos ──────────────────────────────────────────────────────

  /**
   * Agrupa respostas pulse por setor do colaborador.
   * Carrega colaboradores uma única vez e constrói mapa id/email→setor.
   * Setores com menos que GRUPO_MINIMO participantes são retornados com
   * indicadores:null (protegido) para preservar anonimato.
   */
  function _calcPorSetor(orgId, respostas) {
    var mapa = {};           // email → setorId
    var totalPorSetor = {};  // setorId → total de usuários ativos
    var labelPorSetor = {};  // setorId → label do catálogo Admin/Setores

    // Carrega catálogo de setores para exibir label correto
    try {
      SistemaConfigService.getSetores().forEach(function(s) {
        var id = (s.id || '').trim();
        if (id) labelPorSetor[id] = s.label || s.nome || id;
      });
    } catch(e) { /* continua sem labels — exibe id bruto */ }

    try {
      // u.setor deve conter o id de um setor do catálogo Admin/Setores
      AcessoService.listarUsuarios()
        .filter(function(u) { return u.status === 'ativo'; })
        .forEach(function(u) {
          var email   = (u.email || '').toLowerCase().trim();
          var setorId = (u.setor || '').trim();
          if (!email || !setorId) return;
          mapa[email] = setorId;
          totalPorSetor[setorId] = (totalPorSetor[setorId] || 0) + 1;
        });
    } catch(e) { return []; }

    // Agrupa respostas e participantes únicos por setorId
    var grupos = {};
    respostas.forEach(function(r) {
      if (!r.colaboradorId) return;
      var cid     = (r.colaboradorId || '').toLowerCase();
      var setorId = mapa[cid] || mapa[r.colaboradorId] || null;
      if (!setorId) return;
      if (!grupos[setorId]) grupos[setorId] = { respostas: [], participantes: {} };
      grupos[setorId].respostas.push(r);
      grupos[setorId].participantes[r.colaboradorId] = true;
    });

    return Object.keys(grupos).map(function(setorId) {
      var g     = grupos[setorId];
      var nPart = Object.keys(g.participantes).length;
      var total = totalPorSetor[setorId] || null;
      var label = labelPorSetor[setorId] || setorId; // label do catálogo ou id bruto
      if (nPart < DEFAULTS.GRUPO_MINIMO) {
        return { setor: label, participantes: nPart, totalAtivos: total,
                 indicadores: null, climaGeral: null, protegido: true };
      }
      var ind = _calcIndicadores(orgId, g.respostas);
      return { setor: label, participantes: nPart, totalAtivos: total,
               indicadores: ind, climaGeral: ind._climaGeral || null, protegido: false };
    }).sort(function(a, b) { return b.participantes - a.participantes; });
  }

  function _calcIndicadores(orgId, respostas) {
    var PESOS = {
      vigor: 1.0, dedicacao: 1.0, absorcao: 1.0,
      demanda: 1.2, controle: 1.0, colaboracao: 1.0,
      inovacao: 1.0, seguranca: 1.5
    };

    var porDimensao = {};
    BANCO_PERGUNTAS.forEach(function(p) {
      if (!porDimensao[p.dimensao]) porDimensao[p.dimensao] = { somaPonderada: 0, somaPesos: 0, n: 0 };
    });

    respostas.forEach(function(r) {
      if (!r.dimensao || porDimensao[r.dimensao] === undefined) return;
      var val  = Number(r.resposta);
      if (isNaN(val) || val < 1 || val > 5) return;

      // Aplica inversão para dimensões negativas
      if (DIMENSOES_INVERTIDAS.indexOf(r.dimensao) >= 0) val = 6 - val;

      // Busca peso da pergunta específica
      var pergRef = BANCO_PERGUNTAS.find(function(p){ return p.id === r.perguntaId; });
      var peso    = pergRef ? pergRef.peso : 1.0;

      porDimensao[r.dimensao].somaPonderada += val * peso;
      porDimensao[r.dimensao].somaPesos     += peso;
      porDimensao[r.dimensao].n++;
    });

    var resultado = {};
    Object.keys(porDimensao).forEach(function(dim) {
      var entry = porDimensao[dim];
      var media = entry.somaPesos > 0
        ? Math.round((entry.somaPonderada / entry.somaPesos) * 10) / 10 : null;
      resultado[dim] = {
        media:  media,
        n:      entry.n,
        nivel:  _nivelClimatico(media)
      };
    });

    // Clima geral (dimensões positivas)
    var geralVals = ['vigor','dedicacao','absorcao','controle','colaboracao','inovacao','seguranca']
      .map(function(d) { return resultado[d] ? resultado[d].media : null; })
      .filter(function(v) { return v !== null; });

    resultado._climaGeral = {
      media: geralVals.length > 0
        ? Math.round((geralVals.reduce(function(s,v){return s+v;},0) / geralVals.length) * 10) / 10
        : null,
      nivel: geralVals.length > 0 ? _nivelClimatico(geralVals.reduce(function(s,v){return s+v;},0) / geralVals.length) : 'sem_dados'
    };

    return resultado;
  }

  function _contarParticipantes(respostas) {
    var ids = {};
    respostas.forEach(function(r) {
      if (r.colaboradorId) ids[r.colaboradorId] = true;
    });
    return Object.keys(ids).length;
  }

  function _calcConfianca(orgId, participantes) {
    var total = 20;
    try {
      var ativos = AcessoService.listarUsuarios()
        .filter(function(u){ return u.status === 'ativo'; });
      if (ativos.length > 0) total = ativos.length;
    } catch(e) {}
    var taxa = total > 0 ? participantes / total : 0;
    return {
      taxa:               parseFloat(taxa.toFixed(3)),
      participantes:      participantes,
      total:              total,
      percentual:         Math.round(taxa * 100),
      suficiente:         taxa >= DEFAULTS.CONFIANCA_MINIMA,
      representativa:     taxa >= DEFAULTS.CONFIANCA_REPRESENTATIVA
    };
  }

  function _calcStatusSaturacao(orgId, periodo) {
    var meta  = _metaDimensao(orgId);
    var lista = EscutaRepository.listarSaturacao(orgId, periodo);
    var dims  = ['vigor','dedicacao','absorcao','demanda','controle','colaboracao','inovacao','seguranca'];
    return dims.map(function(d) {
      var reg = lista.find(function(s){ return s.dimensao === d; });
      var col = reg ? (reg.coletados || 0) : 0;
      return { dimensao: d, coletados: col, meta: meta, saturado: col >= meta,
               pct: Math.min(100, Math.round((col / meta) * 100)) };
    });
  }

  function _calcTendencia(orgId, periodoAtual) {
    var periodos = [];
    var d = new Date(periodoAtual + '-01');
    for (var i = 0; i < 3; i++) {
      periodos.unshift(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
      d.setMonth(d.getMonth() - 1);
    }
    return periodos.map(function(per) {
      var resp = EscutaRepository.listarPulseRespostas(orgId, per);
      var ind  = _calcIndicadores(orgId, resp);
      return { periodo: per, climaGeral: ind._climaGeral.media, n: resp.length };
    });
  }

  function _nivelClimatico(score) {
    if (score === null || score === undefined) return 'sem_dados';
    if (score >= 4.5) return 'excelente';
    if (score >= 3.5) return 'bom';
    if (score >= 2.5) return 'regular';
    if (score >= 1.5) return 'baixo';
    return 'critico';
  }

  // ─── Catálogo de perguntas (para exibição) ───────────────────────────────────

  /**
   * Retorna o catálogo de perguntas pulse.
   * Se orgId for fornecido, cruza com pulse_respostas.json e pulse_impressoes.json
   * para enriquecer cada pergunta com: impressoes, respostas, taxaEngajamento, ultimaUsadaEm.
   * @param {string} [orgId]
   */
  function obterCatalogoPerguntas(orgId) {
    var respostas  = orgId ? EscutaRepository.listarPulseRespostas(orgId)  : [];
    var impressoes = orgId ? EscutaRepository.listarPulseImpressoes(orgId) : [];

    return BANCO_PERGUNTAS.map(function(p) {
      var nResp = 0, nImp = 0, ultimaUsadaEm = null;
      if (orgId) {
        respostas.forEach(function(r) {
          if (r.perguntaId !== p.id) return;
          nResp++;
          if (!ultimaUsadaEm || r.criadoEm > ultimaUsadaEm) ultimaUsadaEm = r.criadoEm;
        });
        impressoes.forEach(function(i) { if (i.perguntaId === p.id) nImp++; });
      }
      return {
        id: p.id, dimensao: p.dimensao, texto: p.texto,
        tipo: p.tipo, tipoTempo: p.tipoTempo, peso: p.peso, ativa: p.ativa,
        impressoes:      nImp,
        respostas:       nResp,
        taxaEngajamento: nImp > 0 ? parseFloat((nResp / nImp).toFixed(3)) : null,
        ultimaUsadaEm:   ultimaUsadaEm
      };
    });
  }

  // ─── API pública ─────────────────────────────────────────────────────────────

  return {
    obterPerguntaPulse:   obterPerguntaPulse,
    registrarRespostaPulse: registrarRespostaPulse,
    obterDashboardPulse:  obterDashboardPulse,
    obterCatalogoPerguntas: obterCatalogoPerguntas
  };
})();
