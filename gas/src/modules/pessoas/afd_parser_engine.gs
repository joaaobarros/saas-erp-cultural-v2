/**
 * @file afd_parser_engine.gs
 * @layer engine
 * @description Motor flexível de parse de arquivos AFD de relógio de ponto.
 *
 *   Fluxo de importação em 2 etapas (evita gravações irreversíveis sem revisão):
 *
 *     Etapa 1 — iniciarImportacao()
 *       Parse do arquivo → cria sessão pendente → salva registros brutos
 *       com status (valido / duplicado / pis_nao_encontrado / erro / cadastro).
 *       Nenhum registro normalizado é criado ainda.
 *       Retorna resumo para o usuário revisar antes de confirmar.
 *
 *     Etapa 2 — confirmarImportacao()
 *       Converte brutos com status 'valido' em registros normalizados
 *       em ponto_normalizado.json. Confirma a sessão.
 *
 *   Etapas de cancelamento/reversão:
 *     cancelarImportacao()  — cancela sessão PENDENTE (remove brutos)
 *     reverterImportacao()  — reverte sessão CONFIRMADA (marca normalizados
 *                             como 'revertido', preserva brutos para auditoria)
 *
 *   Também oferece gerarPreview() — parseia sem escrever nada, útil para
 *   validar o arquivo antes de iniciar o processo formal.
 *
 * @depends afd_layout_repository.gs, ponto_bruto_repository.gs, ponto_repository.gs
 */

var AfdParserEngine = (function() {

  // ─── Extração de campos por posição ─────────────────────────────────────────

  /**
   * Extrai e converte um único campo de uma linha segundo a definição do layout.
   * posInicio < 0 indica offset a partir do fim da linha (ex: -4 = últimos 4 chars).
   */
  function _extrairCampo(linha, campo) {
    if (campo.posInicio === null || campo.posInicio === undefined) return null;

    var inicio = campo.posInicio < 0
      ? Math.max(0, linha.length + campo.posInicio)
      : campo.posInicio;

    if (inicio >= linha.length) return null;

    var fim = Math.min(inicio + campo.comprimento, linha.length);
    return _converterTipo(linha.substring(inicio, fim), campo.tipo);
  }

  function _converterTipo(valor, tipo) {
    if (valor === null || valor === undefined) return valor;
    switch (tipo) {
      case 'inteiro':       return parseInt(valor, 10) || 0;
      case 'string_trim':   return valor.trim();
      case 'string_digits': return valor.replace(/\D/g, '');
      case 'datetime_iso':  return valor.trim();
      default:              return valor;
    }
  }

  // ─── Parse de uma linha segundo o layout ────────────────────────────────────

  function _parsearLinha(linha, layout) {
    if (!linha || !linha.trim()) return null;

    // Extrai campos comuns: nsr, tipoRegistro, datetimeOriginal
    var comuns = {};
    (layout.camposComuns || []).forEach(function(campo) {
      comuns[campo.nome] = _extrairCampo(linha, campo);
    });

    var tipo     = String(comuns.tipoRegistro || '');
    var infoTipo = (layout.tiposRegistro || {})[tipo];

    if (!infoTipo) {
      return { nsr: comuns.nsr, tipoRegistro: tipo, ignorado: true, motivo: 'Tipo desconhecido: ' + tipo };
    }
    if (infoTipo.ignorar) {
      return { nsr: comuns.nsr, tipoRegistro: tipo, ignorado: true };
    }

    // Extrai campos específicos do tipo
    var especificos = {};
    var camposTipo  = (layout.camposPorTipo || {})[tipo] || [];
    camposTipo.forEach(function(campo) {
      especificos[campo.nome] = _extrairCampo(linha, campo);
    });

    var resultado = Object.assign({}, comuns, especificos, {
      ignorado:      false,
      tipoRegistro:  tipo,
      linhaOriginal: linha,
      esBatida:      !!(infoTipo.tipoBatida),
      esCadastro:    !!(infoTipo.tipoCadastro)
    });

    // Deriva data (YYYY-MM-DD) e hora (HH:MM) do datetimeOriginal ISO 8601
    if (resultado.datetimeOriginal && resultado.datetimeOriginal.length >= 16) {
      resultado.data = resultado.datetimeOriginal.substring(0, 10);
      resultado.hora = resultado.datetimeOriginal.substring(11, 16);
    }

    return resultado;
  }

  // ─── Mapa PIS → colaboradorId ────────────────────────────────────────────────
  //
  // O iDClass armazena PIS com 12 posições (com zero à esquerda).
  // colaboradores.json pode ter PIS com 11 dígitos (sem zero extra).
  // Indexamos ambas as formas para absorver a variação.

  function _construirMapaPIS(orgId) {
    var mapa = {};
    try {
      var colabs = lerJSON('colaboradores.json') || [];
      colabs.filter(function(c){ return c.orgId === orgId && c.pis; }).forEach(function(c) {
        var pis = String(c.pis).replace(/\D/g, '');
        mapa[pis] = c.id;
        // Versão com zero adicional (11 → 12)
        if (pis.length === 11) mapa['0' + pis] = c.id;
        // Versão sem zero inicial (12 → 11)
        if (pis.length === 12 && pis.charAt(0) === '0') mapa[pis.substring(1)] = c.id;
      });
    } catch(e) {
      Logger.warn('afd_parser_engine', '_construirMapaPIS', e.message);
    }
    return mapa;
  }

  function _normalizarPIS(pis) {
    return pis ? String(pis).replace(/\D/g, '') : '';
  }

  // ─── Resolução de layout ─────────────────────────────────────────────────────

  function _resolverLayout(orgId, layoutId, conteudo) {
    if (!layoutId) {
      layoutId = AfdLayoutRepository.detectarLayout(orgId, conteudo);
    }
    if (!layoutId) throw new Error(
      'Formato do arquivo não reconhecido automaticamente. Selecione o layout manualmente.'
    );
    var layout = AfdLayoutRepository.obter(layoutId);
    if (!layout) throw new Error('Layout não encontrado: ' + layoutId);
    return layout;
  }

  // ─── Preview puro (sem escrita) ──────────────────────────────────────────────

  /**
   * Parseia o arquivo e retorna um resumo sem escrever nada no banco de dados.
   * Ideal para validar o arquivo antes de iniciar a importação.
   *
   * @param {string}  orgId
   * @param {string}  conteudo   — conteúdo do arquivo TXT
   * @param {string}  [layoutId] — auto-detectado se omitido
   * @returns {{ ok, layoutId, layoutNome, resumo, amostraBatidas[], amostraCadastros[], erros[] }}
   */
  function gerarPreview(orgId, conteudo, layoutId) {
    var layout  = _resolverLayout(orgId, layoutId, conteudo);
    var linhas  = conteudo.split(/\r?\n/);
    var mapaPIS = _construirMapaPIS(orgId);

    // Pre-carrega todos os NSRs existentes (1 leitura) para lookup O(1) por linha
    var nsrsExistentes = {};
    try {
      var _brutos = PontoBrutoRepository.listarBrutoPorPeriodo(orgId, '1900-01-01', '2999-12-31');
      _brutos.forEach(function(b){ if (b.nsr) nsrsExistentes[String(b.nsr)] = true; });
    } catch(_) {}

    var resumo = {
      totalLinhas:        linhas.length,
      batidas:            0,
      cadastros:          0,
      ignoradas:          0,
      erros:              0,
      pisNaoEncontrados:  0,
      duplicados:         0
    };

    var amostraBatidas   = [];
    var amostraCadastros = [];
    var erros            = [];

    linhas.forEach(function(linha, idx) {
      if (!linha || !linha.trim()) { resumo.ignoradas++; return; }

      var parsed;
      try {
        parsed = _parsearLinha(linha, layout);
      } catch(e) {
        resumo.erros++;
        erros.push({ linhaNumero: idx + 1, motivo: 'Erro de parse: ' + e.message });
        return;
      }

      if (!parsed || parsed.ignorado) { resumo.ignoradas++; return; }

      if (parsed.esBatida) {
        resumo.batidas++;
        var pisNorm = _normalizarPIS(parsed.pis);
        var colabId = pisNorm ? (mapaPIS[pisNorm] || null) : null;
        var isDup   = !!nsrsExistentes[String(parsed.nsr)];

        if (!colabId) resumo.pisNaoEncontrados++;
        if (isDup)    resumo.duplicados++;

        if (amostraBatidas.length < 50) {
          amostraBatidas.push({
            nsr:          parsed.nsr,
            data:         parsed.data,
            hora:         parsed.hora,
            pis:          pisNorm,
            colabId:      colabId,
            duplicado:    isDup,
            semColaborador: !colabId
          });
        }
      } else if (parsed.esCadastro) {
        resumo.cadastros++;
        if (amostraCadastros.length < 20) {
          amostraCadastros.push({
            nsr:  parsed.nsr,
            pis:  _normalizarPIS(parsed.pis),
            nome: parsed.nome ? parsed.nome.trim() : '',
            acao: parsed.acao || ''
          });
        }
      }
    });

    return {
      ok:               true,
      layoutId:         layout.id,
      layoutNome:       layout.nome,
      resumo:           resumo,
      amostraBatidas:   amostraBatidas,
      amostraCadastros: amostraCadastros,
      erros:            erros
    };
  }

  // ─── Importação Etapa 1 — Parse + Brutos ────────────────────────────────────

  /**
   * Parseia o arquivo, cria sessão pendente e salva registros brutos.
   * NÃO cria registros normalizados — aguarda confirmarImportacao().
   *
   * @param {string} orgId
   * @param {string} conteudo     — conteúdo do arquivo TXT
   * @param {string} [layoutId]   — auto-detectado se omitido
   * @param {string} [nomeArquivo]
   * @param {string} emailAdmin
   * @returns {{ ok, sessaoId, layoutId, resumo }}
   */
  function iniciarImportacao(orgId, conteudo, layoutId, nomeArquivo, emailAdmin) {
    var layout  = _resolverLayout(orgId, layoutId, conteudo);
    var linhas  = conteudo.split(/\r?\n/);
    var mapaPIS = _construirMapaPIS(orgId);

    // Pre-carrega todos os NSRs existentes (1 leitura) para lookup O(1) por linha
    var nsrsExistentes = {};
    try {
      var _brutos = PontoBrutoRepository.listarBrutoPorPeriodo(orgId, '1900-01-01', '2999-12-31');
      _brutos.forEach(function(b){ if (b.nsr) nsrsExistentes[String(b.nsr)] = true; });
    } catch(_) {}

    // Cria sessão como pendente
    var sessaoId = PontoBrutoRepository.criarSessao(orgId, {
      layoutId:     layout.id,
      nomeArquivo:  nomeArquivo || '',
      totalLinhas:  linhas.length,
      importadoPor: emailAdmin || ''
    });

    var lote = [];
    var resumo = {
      totalLinhas:        linhas.length,
      batidas:            0,
      cadastros:          0,
      ignoradas:          0,
      erros:              0,
      duplicados:         0,
      pisNaoEncontrados:  0,
      detalheErros:       []
    };

    linhas.forEach(function(linha, idx) {
      if (!linha || !linha.trim()) { resumo.ignoradas++; return; }

      var parsed;
      try {
        parsed = _parsearLinha(linha, layout);
      } catch(e) {
        resumo.erros++;
        var motErr = 'Erro de parse: ' + e.message;
        resumo.detalheErros.push({ linhaNumero: idx + 1, motivo: motErr });
        lote.push({
          nsr:           null,
          tipoRegistro:  '?',
          linhaOriginal: linha,
          linhaNumero:   idx + 1,
          layoutId:      layout.id,
          status:        'erro',
          motivo:        motErr
        });
        return;
      }

      if (!parsed || parsed.ignorado) { resumo.ignoradas++; return; }

      if (parsed.esBatida) {
        resumo.batidas++;
        var pisNorm = _normalizarPIS(parsed.pis);
        var colabId = pisNorm ? (mapaPIS[pisNorm] || null) : null;
        var status  = 'valido';
        var motivo  = '';

        if (!colabId) {
          status = 'pis_nao_encontrado';
          motivo = 'PIS ' + pisNorm + ' não vinculado a nenhum colaborador';
          resumo.pisNaoEncontrados++;
          resumo.detalheErros.push({ linhaNumero: idx + 1, nsr: parsed.nsr, motivo: motivo });
        } else if (!!nsrsExistentes[String(parsed.nsr)]) {
          status = 'duplicado';
          motivo = 'NSR ' + parsed.nsr + ' já existe em importação anterior';
          resumo.duplicados++;
        }

        lote.push({
          nsr:              parsed.nsr,
          tipoRegistro:     parsed.tipoRegistro,
          datetimeOriginal: parsed.datetimeOriginal || '',
          data:             parsed.data  || '',
          hora:             parsed.hora  || '',
          pis:              pisNorm,
          colaboradorId:    colabId,
          hash:             parsed.hash  || '',
          linhaOriginal:    linha,
          linhaNumero:      idx + 1,
          layoutId:         layout.id,
          status:           status,
          motivo:           motivo
        });

      } else if (parsed.esCadastro) {
        resumo.cadastros++;
        lote.push({
          nsr:              parsed.nsr,
          tipoRegistro:     parsed.tipoRegistro,
          datetimeOriginal: parsed.datetimeOriginal || '',
          data:             parsed.data  || '',
          hora:             parsed.hora  || '',
          pis:              _normalizarPIS(parsed.pis),
          nomeEquipamento:  parsed.nome ? parsed.nome.trim() : '',
          acaoEquipamento:  parsed.acao || '',
          linhaOriginal:    linha,
          linhaNumero:      idx + 1,
          layoutId:         layout.id,
          status:           'cadastro'   // registros tipo 5 — não viram normalizados
        });
      }
    });

    // Persiste lote de brutos na sessão
    PontoBrutoRepository.salvarLoteBruto(orgId, sessaoId, lote);

    // Atualiza contadores da sessão
    PontoBrutoRepository.atualizarSessao(orgId, sessaoId, {
      registrosBrutos:    lote.length,
      registrosIgnorados: resumo.ignoradas,
      erros:              resumo.erros + resumo.duplicados + resumo.pisNaoEncontrados,
      detalheErros:       resumo.detalheErros
    });

    AuditoriaService.registrar('PONTO_IMPORTACAO_INICIADA', 'ponto', {
      sessaoId:  sessaoId,
      layoutId:  layout.id,
      arquivo:   nomeArquivo || '',
      batidas:   resumo.batidas,
      erros:     resumo.erros + resumo.duplicados + resumo.pisNaoEncontrados
    }, emailAdmin || '');

    return { ok: true, sessaoId: sessaoId, layoutId: layout.id, resumo: resumo };
  }

  // ─── Importação Etapa 2 — Confirmar (criar normalizados) ────────────────────

  /**
   * Converte registros brutos com status 'valido' em registros normalizados.
   * Só processa batidas (tipo 3); registros de cadastro (tipo 5) ficam apenas no bruto.
   *
   * @param {string} orgId
   * @param {string} sessaoId
   * @param {string} emailAdmin
   * @returns {{ ok, importados, duplicados, pisNaoEncontrados, cadastros, erros }}
   */
  function confirmarImportacao(orgId, sessaoId, emailAdmin) {
    var sessao = PontoBrutoRepository.obterSessao(orgId, sessaoId);
    if (!sessao) throw new Error('Sessão não encontrada: ' + sessaoId);
    if (sessao.status !== 'pendente') {
      throw new Error('Sessão não está pendente (status atual: ' + sessao.status + ').');
    }

    var layout  = AfdLayoutRepository.obter(sessao.layoutId);
    var brutos  = PontoBrutoRepository.listarBrutoPorSessao(orgId, sessaoId);
    var validos = brutos.filter(function(b){ return b.status === 'valido'; });

    var importados = 0, erros = 0;

    validos.forEach(function(b) {
      try {
        PontoRepository.salvarRegistro(orgId, {
          colaboradorId:    b.colaboradorId,
          pis:              b.pis,
          data:             b.data,
          hora:             b.hora,
          datetimeOriginal: b.datetimeOriginal,
          tipo:             'E',           // tipo E/S/I/R derivado pelo JornadaEngine (Fase 4)
          tipoEvento:       'batida',
          nsr:              b.nsr,
          importacaoId:     sessaoId,
          brutoId:          b.id,
          equipamento:      layout ? layout.nome : '',
          hash:             b.hash || '',
          origem:           'afd_import',
          status:           'ativo'
        });
        importados++;
      } catch(e) {
        erros++;
        Logger.warn('afd_parser_engine', 'confirmarImportacao', 'NSR ' + b.nsr + ': ' + e.message);
      }
    });

    PontoBrutoRepository.concluirSessao(orgId, sessaoId, {
      registrosBrutos: importados,
      erros:           erros
    });

    AuditoriaService.registrar('PONTO_IMPORTACAO_CONFIRMADA', 'ponto', {
      sessaoId:   sessaoId,
      importados: importados,
      erros:      erros
    }, emailAdmin || '');

    // Dispara reconstrução automática de jornadas para todos os dias importados.
    // Erro aqui não cancela a confirmação — jornadas podem ser reprocessadas manualmente.
    var resultadoJornadas = { processadas: 0, erros: 0 };
    try {
      if (typeof JornadaEngine !== 'undefined') {
        resultadoJornadas = JornadaEngine.processarImportacao(orgId, sessaoId);
      }
    } catch(e) {
      Logger.warn('afd_parser_engine', 'confirmarImportacao', 'JornadaEngine: ' + e.message);
    }

    return {
      ok:               true,
      importados:       importados,
      erros:            erros,
      duplicados:       brutos.filter(function(b){ return b.status === 'duplicado'; }).length,
      pisNaoEncontrados:brutos.filter(function(b){ return b.status === 'pis_nao_encontrado'; }).length,
      cadastros:        brutos.filter(function(b){ return b.status === 'cadastro'; }).length,
      jornadasProcessadas: resultadoJornadas.processadas,
      jornadasErros:       resultadoJornadas.erros
    };
  }

  // ─── Cancelar sessão pendente ────────────────────────────────────────────────

  /**
   * Cancela uma sessão PENDENTE antes de confirmar.
   * Remove os registros brutos e marca a sessão como 'cancelada'.
   * (Operação segura: nenhum normalizado foi criado ainda.)
   */
  function cancelarImportacao(orgId, sessaoId, emailAdmin) {
    var sessao = PontoBrutoRepository.obterSessao(orgId, sessaoId);
    if (!sessao) throw new Error('Sessão não encontrada: ' + sessaoId);
    if (sessao.status !== 'pendente') {
      throw new Error(
        'Só é possível cancelar sessões pendentes. ' +
        'Para sessões confirmadas use reverterImportacao().'
      );
    }
    PontoBrutoRepository.reverterSessao(orgId, sessaoId, emailAdmin);
    PontoBrutoRepository.atualizarSessao(orgId, sessaoId, { status: 'cancelada' });
    AuditoriaService.registrar('PONTO_IMPORTACAO_CANCELADA', 'ponto',
      { sessaoId: sessaoId }, emailAdmin || '');
    return { ok: true, sessaoId: sessaoId };
  }

  // ─── Reverter sessão confirmada ──────────────────────────────────────────────

  /**
   * Reverte uma sessão CONFIRMADA.
   * Marca os registros normalizados como 'revertido' (não os exclui — preserva histórico).
   * Os registros brutos são mantidos para auditoria.
   */
  function reverterImportacao(orgId, sessaoId, emailAdmin) {
    var sessao = PontoBrutoRepository.obterSessao(orgId, sessaoId);
    if (!sessao) throw new Error('Sessão não encontrada: ' + sessaoId);
    if (sessao.status !== 'confirmada') {
      throw new Error('Só é possível reverter sessões confirmadas.');
    }
    var revertidos = PontoRepository.reverterImportacao(orgId, sessaoId);
    PontoBrutoRepository.atualizarSessao(orgId, sessaoId, {
      status:       'revertida',
      revertidoPor: emailAdmin,
      revertidoEm:  new Date().toISOString()
    });
    AuditoriaService.registrar('PONTO_IMPORTACAO_REVERTIDA', 'ponto', {
      sessaoId:   sessaoId,
      revertidos: revertidos
    }, emailAdmin || '');
    return { ok: true, sessaoId: sessaoId, revertidos: revertidos };
  }

  return {
    gerarPreview:          gerarPreview,
    iniciarImportacao:     iniciarImportacao,
    confirmarImportacao:   confirmarImportacao,
    cancelarImportacao:    cancelarImportacao,
    reverterImportacao:    reverterImportacao
  };

})();
