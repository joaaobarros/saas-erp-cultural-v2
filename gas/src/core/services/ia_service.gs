/**
 * @file core/services/ia_service.gs
 * @layer core/services
 * @description Serviço central de Inteligência Artificial (Groq/llama).
 *
 * Ponto único de acesso a todos os recursos de IA do sistema:
 *   - chamar      — chamada direta à API Groq (prompt livre)
 *   - parsearJson — extração de JSON da resposta da IA
 *   - perguntar   — Q&A contextual com dados do sistema (salas, reservas, itens)
 *   - gerarRelatorio  — análise de reservas com filtros
 *   - analisarDashboard — insights executivos a partir de métricas
 *   - sugerirReservaComDados — sugestão de reserva com verificação de conflito
 *   - reescreverDescricaoAcao — reescrita institucional via IA (CODIP)
 *   - mapearGraficos — mapeamento de gráficos a seções de relatório via IA
 *
 * @depends core/utils.gs (_getSheet, obterEmailUsuario),
 *          modules/reservas/* (obterReservas, obterMapaSalas, possuiConflitoReserva),
 *          PropertiesService (GROQ_API_KEY), UrlFetchApp, Utilities
 */

var IAService = (function () {

  var _GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
  var _GROQ_MODEL = 'llama-3.1-8b-instant';

  /**
   * Constrói a mensagem de sistema da IA a partir da configuração organizacional.
   * NUNCA hardcode o nome ou descrição da org aqui — lê de getOrgConfig() + config_org.json.
   */
  function _getSystemMsg() {
    var org    = getOrgConfig();
    var ctx    = {};
    try { ctx = (SistemaConfigService.getOrg() || {}); } catch(_) {}
    // Tenta ler contextoIA de config_org.json via SistemaConfigService
    var ctxIA  = {};
    try {
      var cfgOrg = readJSON('config_org.json');
      if (cfgOrg && cfgOrg.contextoIA) ctxIA = cfgOrg.contextoIA;
    } catch(_) {}

    var descOrg = ctxIA.descricao
      ? org.nomeCompleto + ', ' + ctxIA.descricao
      : org.nomeCompleto;
    var espacos  = ctxIA.espacosDisponiveis || 'espaços internos da organização';
    var programacao = ctxIA.programacao || 'atividades culturais e formativas';
    var setores  = ctxIA.setores || 'setores institucionais da organização';

    return 'Você é ' + org.nomeAssistente + ', um especialista em gestão de espaços de ' + descOrg + '. ' +
      'Seus espaços incluem ' + espacos + '. ' +
      'A programação envolve ' + programacao + '. ' +
      'Há ' + setores + '. ' +
      'O sistema registra reservas internas de espaços pelos setores institucionais, ' +
      'com controle de itens do almoxarifado. ' +
      'Responda sempre em português, de forma clara, objetiva e estruturada. ' +
      'Use markdown simples (negrito, listas) quando ajudar na leitura.';
  }

  // ── Helpers privados ─────────────────────────────────────────────

  function _apiKey() {
    return PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY');
  }

  function _adicionar1Hora(hora) {
    var parts = hora.split(':').map(Number);
    var d = new Date();
    d.setHours(parts[0]);
    d.setMinutes((parts[1] || 0) + 60);
    return Utilities.formatDate(d, getOrgConfig().timezone, 'HH:mm');
  }

  function _horariosDosTurnos() {
    try {
      var ts = ConfigService.getTurnos();
      if (Array.isArray(ts) && ts.length) {
        var h = [];
        ts.forEach(function(t) {
          var ini = t.ini || t.inicio;
          if (ini) h.push(ini);
        });
        if (h.length) return h;
      }
    } catch(e) {}
    return ['08:00', '10:00', '14:00', '16:00', '18:00'];
  }

  function _encontrarMelhorAgenda(dados, salas, reservas) {
    var horarios = _horariosDosTurnos();
    var resultados = [];
    var datas = (dados.datasLote && dados.datasLote.length) ? dados.datasLote : [dados.data];
    salas.forEach(function(sala) {
      datas.forEach(function(data) {
        horarios.forEach(function(inicio) {
          var fim = _adicionar1Hora(inicio);
          var conflito = possuiConflitoReserva({
            espacoId: sala.id, data: data, inicio: inicio, fim: fim,
            reservaIgnoradaId: null, usuarioSolicitante: 'ia_service'
          });
          if (!conflito || !conflito.conflito) {
            resultados.push({ salaId: sala.id, salaNome: sala.nome, data: data, inicio: inicio, fim: fim });
          }
        });
      });
    });
    resultados.sort(function(a, b) { return a.inicio.localeCompare(b.inicio); });
    return resultados.slice(0, 8);
  }

  // ── API pública ──────────────────────────────────────────────────

  /**
   * Chamada direta à API Groq com prompt livre.
   * @param {string} prompt
   * @returns {{ ok: boolean, texto: string }}
   */
  function chamar(prompt) {
    var apiKey = _apiKey();
    if (!apiKey) return { ok: false, texto: 'Chave GROQ_API_KEY não configurada nas propriedades do script.' };

    var payload = {
      model:       _GROQ_MODEL,
      messages:    [{ role: 'system', content: _getSystemMsg() }, { role: 'user', content: prompt }],
      max_tokens:  2048,
      temperature: 0.4
    };
    try {
      var response = UrlFetchApp.fetch(_GROQ_URL, {
        method: 'post', contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + apiKey },
        payload: JSON.stringify(payload), muteHttpExceptions: true
      });
      var json = JSON.parse(response.getContentText());
      if (json.error)                       return { ok: false, texto: 'Erro da API: ' + json.error.message };
      if (json.choices && json.choices[0])  return { ok: true,  texto: json.choices[0].message.content };
      return { ok: false, texto: 'Resposta inesperada da API.' };
    } catch (e) {
      return { ok: false, texto: 'Erro ao chamar a API: ' + e.message };
    }
  }

  /**
   * Extrai o primeiro objeto JSON de uma string de resposta da IA.
   * @param {string} resposta
   * @returns {Object|null}
   */
  function parsearJson(resposta) {
    try {
      if (!resposta) return null;
      var inicio = resposta.indexOf('{');
      var fim    = resposta.lastIndexOf('}');
      if (inicio === -1 || fim === -1) return null;
      return JSON.parse(resposta.substring(inicio, fim + 1));
    } catch (e) {
      console.warn('IAService.parsearJson: ' + resposta);
      return null;
    }
  }

  /**
   * Gera relatório analítico de reservas com base em filtros.
   * @param {{ tipo: string, periodo: string, usuario: string }} filtros
   */
  function gerarRelatorio(filtros) {
    try {
      var reservasBruto = obterReservas();
      if (!reservasBruto || reservasBruto.length === 0)
        return { ok: false, texto: 'Não há reservas no sistema para analisar.' };

      var salaMap  = obterMapaSalas();
      var reservas = reservasBruto.map(function(r) {
        return { id: r[0], data: r[1], inicio: r[2], termino: r[3],
          sala: salaMap[String(r[4]).trim()] || r[4], turno: r[5],
          acao: r[6], tipo: r[7], responsavel: r[8], setor: r[9],
          itens: r[12], status: r[13] };
      });

      var hoje = new Date();
      var filtradas = reservas.filter(function(r) {
        if (!r.data) return true;
        var p = String(r.data).split('/');
        if (p.length !== 3) return true;
        var d = new Date(p[2], p[1] - 1, p[0]);
        if (filtros.periodo === 'hoje')   return d.toDateString() === hoje.toDateString();
        if (filtros.periodo === '7dias')  { var lim = new Date(hoje); lim.setDate(hoje.getDate() + 7);  return d >= hoje && d <= lim; }
        if (filtros.periodo === '30dias') { var lim2 = new Date(hoje); lim2.setDate(hoje.getDate() + 30); return d >= hoje && d <= lim2; }
        return true;
      });

      var emailAtivo = obterEmailUsuario('');
      var amostra = (filtros.usuario === 'minhas'
        ? filtradas.filter(function(r) { return String(r.responsavel).toLowerCase().includes(emailAtivo.toLowerCase()); })
        : filtradas).slice(0, 60);

      if (amostra.length === 0) return { ok: false, texto: 'Nenhuma reserva encontrada com os filtros aplicados.' };

      var instrucoes = {
        uso:        'Analise o padrão de uso dos espaços: quais salas são mais usadas, em quais turnos, por quais setores. Identifique subutilização e picos.',
        conflitos:  'Identifique APENAS reservas com sobreposição real de horário na MESMA sala na MESMA data.',
        itens:      'Analise o uso dos itens e equipamentos: quais são mais solicitados, por quais setores.',
        otimizacao: 'Sugira melhorias operacionais concretas para ' + getOrgConfig().nome + ' com base nos dados.'
      };

      var prompt = (instrucoes[filtros.tipo] || instrucoes.uso) +
        '\n\nREGRAS:\n- Use SOMENTE os dados abaixo\n' +
        '- Seja específico com nomes, horários e números reais dos dados\n' +
        '- Formato: título em negrito, lista de insights, conclusão com recomendações práticas\n' +
        '- Máximo 500 palavras\n\nDADOS (' + amostra.length + ' reservas):\n' +
        JSON.stringify(amostra);

      return chamar(prompt);
    } catch (e) {
      return { ok: false, texto: 'Erro interno: ' + e.message };
    }
  }

  /**
   * Responde pergunta em linguagem natural com contexto completo do sistema.
   * @param {string} pergunta
   */
  function perguntar(pergunta) {
    try {
      var salaMap      = obterMapaSalas();
      var reservasBruto = obterReservas();
      var reservas = (reservasBruto || []).slice(0, 60).map(function(r) {
        return { data: r[1], inicio: r[2], termino: r[3],
          sala: salaMap[String(r[4] || '').trim()] || r[4],
          turno: r[5], acao: r[6], responsavel: r[8], setor: r[9],
          itens: r[12], status: r[13] };
      });

      var configSheet = _getSheet('Configuracoes');
      var salas = configSheet && configSheet.getLastRow() > 1
        ? configSheet.getRange(2, 1, configSheet.getLastRow() - 1, 3).getValues()
            .map(function(s) { return { id: String(s[0]).trim(), nome: String(s[1]).trim(), capacidade: Number(s[2]) || 0 }; })
        : [];

      var itensSheet = _getSheet('Itens');
      var itens = itensSheet && itensSheet.getLastRow() > 1
        ? itensSheet.getRange(2, 1, itensSheet.getLastRow() - 1, 4).getValues()
            .map(function(i) { return { nome: i[1], categoria: i[2], qtdDisponivel: i[3] }; })
        : [];

      var setoresSheet = _getSheet('Listas');
      var setores = setoresSheet && setoresSheet.getLastRow() > 1
        ? setoresSheet.getRange(2, 1, setoresSheet.getLastRow() - 1, 1).getValues()
            .map(function(s) { return String(s[0]).trim(); }).filter(Boolean)
        : [];

      var perguntaFinal = pergunta;
      try {
        var parsed = JSON.parse(pergunta);
        if (Array.isArray(parsed)) {
          perguntaFinal = parsed.map(function(m) { return m.role + ': ' + m.content; }).join('\n');
        }
      } catch(e) {}

      var reservasTexto = reservas
        .map(function(r) { return r.data + ' | ' + r.inicio + '-' + r.termino + ' | ' + r.sala + ' | ' + r.acao; })
        .join('\n');

      var emailAtivo = obterEmailUsuario('');

      var _org = getOrgConfig();
      var _hor = ConfigService.getReservaHorario();
      var _turnosTexto = (function() {
        var ts = ConfigService.getTurnos();
        if (!Array.isArray(ts) || !ts.length) return '"manhã" = abertura–meio-dia | "tarde" = meio-dia–fim tarde | "noite" = fim tarde–encerramento';
        return ts.map(function(t) { return '"' + (t.label||t.id) + '" = ' + (t.ini||t.inicio||'?') + '–' + (t.fim||'?'); }).join(' | ');
      })();
      var prompt =
        'Você é ' + _org.nomeAssistente + ', assistente de gestão de espaços de ' + _org.nomeCompleto + '.\n\n' +
        'REGRA ABSOLUTA — APRESENTAÇÃO:\n' +
        '- NUNCA se apresente. NUNCA diga "Olá", "Oi", "Sou ' + _org.nomeAssistente + '". Já fomos apresentados.\n' +
        '- Responda DIRETAMENTE ao que foi pedido, sem saudações de qualquer tipo.\n\n' +
        'REGRA ABSOLUTA — PROATIVIDADE:\n' +
        '- Só sugira reserva quando o usuário EXPLICITAMENTE pedir para criar, agendar, reservar ou marcar algo.\n' +
        '- Consultas, dúvidas, análises e perguntas genéricas NÃO geram JSON de reserva — responda apenas em texto.\n' +
        '- Quando o usuário não pedir reserva, NUNCA inclua o bloco JSON na resposta.\n' +
        '- Não faça mais de UMA pergunta por resposta.\n\n' +
        'PERMISSÃO PARA CRIAR CONTEÚDO:\n' +
        '- Você PODE inventar nomes de ações, releases técnicos, descrições, público-alvo, categorias e observações coerentes com o contexto.\n' +
        '- Sempre deixe claro que são sugestões revisáveis.\n\n' +
        'REGRAS DE AGENDAMENTO:\n' +
        '- Nunca usar ID de sala na resposta textual — use sempre o nome real.\n' +
        '- Nunca sugerir horários já ocupados. Verifique os conflitos antes de sugerir.\n' +
        '- Se houver conflito, sugira alternativa de sala ou horário imediatamente.\n' +
        '- Horários permitidos: ' + _hor.inicio + ' às ' + _hor.fim + '.\n\n' +
        'INTERPRETAÇÃO DE TERMOS:\n' +
        '- ' + _turnosTexto + '\n' +
        '- "qualquer dia" = primeiro disponível a partir de hoje\n' +
        '- "semana" = próximos 7 dias\n' +
        '- reunião → público estimado: 5–15 | oficina → 15–40 | evento → 40+\n\n' +
        'JSON (apenas quando reserva foi solicitada):\n' +
        '{\n  "modoLote": false,\n  "modoRece": false,\n  "datasLote": [],\n' +
        '  "sugestao": {\n    "nomeAcao": "",\n    "salaId": "",\n    "salaNome": "",\n' +
        '    "data": "",\n    "horaInicio": "",\n    "horaTermino": "",\n    "turno": "",\n' +
        '    "setor": "",\n    "itens": [],\n    "release": "",\n    "observacoes": "",\n' +
        '    "receDados": {\n      "categorias": "",\n      "publicoAlvo": "",\n' +
        '      "classificacao": "Livre",\n      "acesso": "Gratuito",\n      "descricao": "",\n' +
        '      "acessibilidades": "",\n      "parceiros": "",\n      "artista": ""\n    }\n  }\n}\n\n' +
        'REGRAS CRÍTICAS DO JSON:\n' +
        '- JSON deve ser válido e sem comentários.\n' +
        '- Nunca coloque texto após o bloco JSON.\n' +
        '- Se não for criar reserva, não inclua JSON.\n\n' +
        'CONTEXTO DO SISTEMA:\n' +
        '- Data de hoje: ' + Utilities.formatDate(new Date(), getOrgConfig().timezone, 'dd/MM/yyyy') + '\n' +
        '- Email do usuário: ' + emailAtivo + '\n\n' +
        'HISTÓRICO / MENSAGEM:\n' + perguntaFinal + '\n\n' +
        'SALAS DISPONÍVEIS:\n' + JSON.stringify(salas) + '\n\n' +
        'RESERVAS ATIVAS (' + reservas.length + ' registros):\n' + reservasTexto + '\n\n' +
        'ITENS DO ALMOXARIFADO:\n' + JSON.stringify(itens) + '\n\n' +
        'SETORES INSTITUCIONAIS:\n' + setores.join(', ');

      return chamar(prompt);
    } catch (e) {
      return { ok: false, texto: 'Erro interno: ' + e.message };
    }
  }

  /**
   * Analisa métricas de dashboard e retorna insights executivos.
   * @param {Object} metricas
   */
  function analisarDashboard(metricas) {
    try {
      if (!metricas) return { ok: false, texto: 'Nenhuma métrica fornecida.' };
      var prompt =
        'Analise as métricas de uso de ' + getOrgConfig().nomeCompleto + ' e gere um resumo executivo com insights e recomendações.\n\n' +
        'MÉTRICAS:\n' +
        '- Total de reservas: ' + metricas.total + '\n' +
        '- Confirmadas: ' + metricas.confirmadas + ' | Canceladas: ' + metricas.canceladas + ' (' + metricas.taxaCancelamento + '%)\n' +
        '- Top 5 espaços: ' + JSON.stringify(metricas.top5Salas) + '\n' +
        '- Top 5 setores: ' + JSON.stringify(metricas.top5Setores) + '\n' +
        '- Distribuição por turno: ' + JSON.stringify(metricas.porTurno) + '\n' +
        '- Itens mais solicitados: ' + JSON.stringify(metricas.topItens) + '\n' +
        '- Horários de pico: ' + JSON.stringify(metricas.horasPico) + '\n' +
        '- Dias mais movimentados: ' + JSON.stringify(metricas.diasSemana) + '\n\n' +
        'Gere:\n1. **Resumo executivo** (2-3 frases)\n2. **Pontos de atenção** (problemas identificados)\n' +
        '3. **Oportunidades** (melhorias sugeridas)\n4. **Recomendação prioritária**\n\n' +
        'IMPORTANTE:\nMáximo 400 palavras. Use apenas markdown — sem blocos de código JSON.';
      return chamar(prompt);
    } catch (e) {
      return { ok: false, texto: 'Erro: ' + e.message };
    }
  }

  /**
   * Sugere reserva com base em descrição textual, com verificação de conflito e alternativas.
   * @param {string} descricao
   */
  function sugerirReservaComDados(descricao) {
    try {
      var configSheet = _getSheet('Configuracoes');
      var salas = configSheet && configSheet.getLastRow() > 1
        ? configSheet.getRange(2, 1, configSheet.getLastRow() - 1, 3).getValues()
            .map(function(s) { return { id: String(s[0]).trim(), nome: String(s[1]).trim(), capacidade: s[2] }; })
            .filter(function(s) { return s.id && s.nome; })
        : [];

      var itensSheet = _getSheet('Itens');
      var itens = itensSheet && itensSheet.getLastRow() > 1
        ? itensSheet.getRange(2, 1, itensSheet.getLastRow() - 1, 4).getValues()
            .map(function(i) { return { nome: String(i[1]).trim(), categoria: String(i[2]).trim(), qtd: Number(i[3]) }; })
            .filter(function(i) { return i.nome && i.qtd > 0; })
        : [];

      var setoresSheet = _getSheet('Listas');
      var setores = setoresSheet && setoresSheet.getLastRow() > 1
        ? setoresSheet.getRange(2, 1, setoresSheet.getLastRow() - 1, 1).getValues()
            .map(function(s) { return String(s[0]).trim(); }).filter(Boolean)
        : [];

      var hoje  = new Date();
      var limite = new Date(hoje);
      limite.setDate(hoje.getDate() + 14);
      var reservasBruto = obterReservas();
      var ocupacoes = (reservasBruto || [])
        .filter(function(r) { return r[13] !== STATUS_RESERVA.CANCELADA; })
        .map(function(r) { return { data: r[1], inicio: r[2], termino: r[3], sala: r[4] }; })
        .filter(function(r) {
          try {
            var p = String(r.data).split('/');
            if (p.length !== 3) return false;
            var d = new Date(p[2], p[1] - 1, p[0]);
            return d >= hoje && d <= limite;
          } catch(e) { return false; }
        });

      var hoje_str = Utilities.formatDate(hoje, getOrgConfig().timezone, 'dd/MM/yyyy');

      var _org2 = getOrgConfig();
      var prompt =
        'Você é um assistente de agendamento de ' + _org2.nomeCompleto + ' (' + _org2.nome + ').\n\n' +
        'PEDIDO: ' + descricao + '\n\n' +
        'Retorne SOMENTE JSON válido:\n' +
        '{\n  "viavel": true,\n  "motivo": "",\n  "modoLote": false,\n  "modoRece": false,\n  "datasLote": [],\n' +
        '  "sugestao": {\n    "nomeAcao": "",\n    "salaId": "",\n    "salaNome": "",\n' +
        '    "data": "DD/MM/YYYY",\n    "horaInicio": "HH:MM",\n    "horaTermino": "HH:MM",\n' +
        '    "turno": "",\n    "itens": [],\n    "justificativa": "",\n    "observacoes": ""\n  }\n}\n\n' +
        'REGRAS:\n' +
        '- É PROIBIDO sugerir horários ocupados\n' +
        '- Sempre evitar conflito com ocupações\n' +
        '- Se houver conflito, escolha outra sala ou horário\n' +
        '- Data >= ' + hoje_str + '\n\n' +
        'IMPORTANTE:\n- Quando retornar JSON, ele deve ser válido e sem comentários\n' +
        '- Não usar texto antes ou depois do JSON\n\n' +
        'SALAS: ' + JSON.stringify(salas) + '\n' +
        'OCUPAÇÕES: ' + JSON.stringify(ocupacoes) + '\n' +
        'ITENS: ' + JSON.stringify(itens) + '\n' +
        'SETORES: ' + setores.join(', ');

      var resultado = chamar(prompt);
      if (!resultado.ok) return { ok: false, texto: resultado.texto };

      var dados = parsearJson(resultado.texto || '');
      if (!dados) {
        return { ok: false, texto: 'Resposta inválida! A IA retornou um formato que não foi possível processar. Tente reformular o pedido de forma mais simples.' };
      }

      if (dados.sugestao && dados.sugestao.salaId) {
        var salaEncontrada = null;
        for (var i = 0; i < salas.length; i++) {
          if (String(salas[i].id) === String(dados.sugestao.salaId)) { salaEncontrada = salas[i]; break; }
        }
        dados.sugestao.salaNome = salaEncontrada ? salaEncontrada.nome : 'Sala não identificada';
      }

      var s = dados.sugestao;
      if (s && s.salaId && s.data && s.horaInicio && s.horaTermino) {
        var conflito = possuiConflitoReserva({
          espacoId: s.salaId, data: s.data, inicio: s.horaInicio, fim: s.horaTermino,
          reservaIgnoradaId: null, usuarioSolicitante: 'ia_service'
        });
        if (conflito && conflito.conflito) {
          var alternativas = _encontrarMelhorAgenda(
            { data: s.data, datasLote: dados.datasLote || [] }, salas, ocupacoes
          );
          if (alternativas && alternativas.length > 0) {
            return { ok: true, dados: { viavel: false, motivo: 'A opção solicitada está ocupada', alternativas: alternativas, sugestaoOriginal: dados.sugestao } };
          }
          return { ok: true, dados: { viavel: false, motivo: 'Sem nenhuma alternativa disponível' } };
        }
      }

      return { ok: true, dados: dados };
    } catch (e) {
      return { ok: false, texto: 'Erro interno: ' + e.message };
    }
  }

  /**
   * Reescreve descrição de ação para uso em relatório institucional (CODIP).
   * @param {string} texto
   * @param {string} setor
   */
  function reescreverDescricaoAcao(texto, setor) {
    var s = String(setor || '').toLowerCase();
    var foco = '';
    if (/ação cultural|acao cultural|difus|apresentação|contação de histórias/.test(s))
      foco = 'com foco em Difusão e Fruição Cultural';
    else if (/narte|cidadania|direitos|campanha|articulação comunitária/.test(s))
      foco = 'com foco em Cidadania Cultural e Direitos Humanos';
    else if (/escola|formação|formacao|curso/.test(s))
      foco = 'com foco em Formação e Conhecimento em Arte e Cultura';

    var prompt =
      'Reescreva o texto abaixo para uso em relatório institucional ' + foco + '.\n\n' +
      'REGRAS:\n' +
      '- Escrita impessoal, sem uso de primeira pessoa ou sujeito institucional\n' +
      '- Proibição de verbos no presente (ex: "é", "visa", "promove", "busca", "oferece")\n' +
      '- Priorizar estrutura nominal (substantivos, locuções nominais)\n' +
      '- Ausência de marcação temporal explícita\n' +
      '- Descrição atemporal, concisa e técnica\n' +
      '- Foco em proposta conceitual, abordagem, relação com o público e linguagem\n' +
      '- Estrutura preferencialmente nominal ou abstrata, sem indicação de agente\n' +
      '- Substituição de verbos por substantivos ou advérbios sempre que possível\n' +
      '- Conversão de ações em qualificações nominais, com uso de particípio passado quando necessário\n' +
      '- Eliminação de conectivos explicativos e redundâncias\n' +
      '- Parágrafo único, contínuo, sem tópicos\n' +
      '- Máximo de 600 caracteres\n' +
      '- Não utilizar markdown na resposta\n' +
      '- Responder apenas com o texto reescrito, sem aspas ou comentários\n\n' +
      'TEXTO ORIGINAL:\n' + String(texto || '').trim();

    return chamar(prompt);
  }

  /**
   * Mapeia gráficos a seções de relatório usando IA (fallback para mapeamento local).
   * @param {Array} secoes
   * @param {Array} graficos
   */
  function mapearGraficos(secoes, graficos) {
    try {
      var prompt =
        '\nAssocie gráficos às seções de um relatório.\nSEÇÕES:\n' +
        JSON.stringify(secoes.map(function(s, i) { return { i: i, titulo: s.titulo }; })) +
        '\nGRÁFICOS:\n' +
        JSON.stringify(graficos.map(function(g, i) { return { i: i, titulo: g.titulo || 'Gráfico' }; })) +
        '\nResponda SOMENTE JSON no formato:\n{"0": [0], "1": [1], "2": []}';
      var resposta = chamar(prompt);
      return JSON.parse(resposta);
    } catch (e) {
      // fallback: mapeamento local por palavras-chave
      var mapa = {};
      secoes.forEach(function(secao, i) {
        var titulo = String(secao.titulo || '').toLowerCase();
        if (/dados|uso|horário|grafico|gráfico|estat/i.test(titulo)) mapa[i] = graficos.slice(0, 2);
      });
      return mapa;
    }
  }

  return {
    chamar:                  chamar,
    parsearJson:             parsearJson,
    gerarRelatorio:          gerarRelatorio,
    perguntar:               perguntar,
    analisarDashboard:       analisarDashboard,
    sugerirReservaComDados:  sugerirReservaComDados,
    reescreverDescricaoAcao: reescreverDescricaoAcao,
    mapearGraficos:          mapearGraficos
  };

})();
