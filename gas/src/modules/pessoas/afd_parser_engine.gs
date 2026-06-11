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

  // ─── Correspondência por nome (fallback ao PIS) ──────────────────────────────

  var _PARTICULAS = { 'DE':1,'DA':1,'DO':1,'DOS':1,'DAS':1,'E':1,'EM':1,'A':1 };

  function _normalizarNome(nome) {
    if (!nome) return '';
    var s = nome.toUpperCase()
      .replace(/[ÁÀÂÃÄ]/g,'A').replace(/[ÉÈÊË]/g,'E')
      .replace(/[ÍÌÎÏ]/g,'I').replace(/[ÓÒÔÕÖ]/g,'O')
      .replace(/[ÚÙÛÜ]/g,'U').replace(/Ç/g,'C').replace(/Ñ/g,'N')
      .replace(/[^A-Z\s]/g,'');
    return s.split(/\s+/)
      .filter(function(w){ return w.length > 1 && !_PARTICULAS[w]; })
      .sort()   // ordena para tornar comparação independente de ordem
      .join(' ').trim();
  }

  function _construirMapaNomes(orgId) {
    var mapa = {};
    try {
      var colabs = lerJSON('colaboradores.json') || [];
      colabs.filter(function(c){ return c.orgId === orgId && c.nome; }).forEach(function(c) {
        var norm = _normalizarNome(c.nome);
        if (norm) mapa[norm] = c.id;
      });
    } catch(e) {
      Logger.warn('afd_parser_engine', '_construirMapaNomes', e.message);
    }
    return mapa;
  }

  /**
   * Tenta encontrar um colabId pelo nome do AFD contra os nomes do sistema.
   * Usa correspondência por palavras significativas (≥ 75% das palavras menores
   * presentes nas palavras maiores), independente de ordem, acentuação ou partículas.
   * @returns {string|null} colabId ou null se não encontrado
   */
  function _buscarColabPorNome(afdNome, mapaNomes) {
    if (!afdNome || !mapaNomes) return null;
    var normAfd = _normalizarNome(afdNome);
    if (!normAfd) return null;

    // Correspondência exata normalizada
    if (mapaNomes[normAfd]) return mapaNomes[normAfd];

    // Correspondência parcial: palavras do nome menor presentes no maior
    var wordsAfd = normAfd.split(' ');
    var melhor = null, melhorScore = 0;
    Object.keys(mapaNomes).forEach(function(normSis) {
      var wordsSis = normSis.split(' ');
      var menor = wordsAfd.length <= wordsSis.length ? wordsAfd : wordsSis;
      var maior = wordsAfd.length <= wordsSis.length ? wordsSis : wordsAfd;
      var comuns = menor.filter(function(w){ return maior.indexOf(w) >= 0; });
      var score = comuns.length / menor.length;
      if (score >= 0.75 && score > melhorScore) {
        melhorScore = score;
        melhor = mapaNomes[normSis];
      }
    });
    return melhor;
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
    var layout     = _resolverLayout(orgId, layoutId, conteudo);
    var linhas     = conteudo.split(/\r?\n/);
    var mapaPIS    = _construirMapaPIS(orgId);
    var mapaNomes  = _construirMapaNomes(orgId);

    // Pre-carrega todos os NSRs existentes (1 leitura) para lookup O(1) por linha
    var nsrsExistentes = {};
    try {
      var _brutos = PontoBrutoRepository.listarBrutoPorPeriodo(orgId, '1900-01-01', '2999-12-31');
      _brutos.forEach(function(b){ if (b.nsr) nsrsExistentes[String(b.nsr)] = true; });
    } catch(_) {}

    // Passo 0: varredura para construir mapa PIS → nome do próprio arquivo AFD
    var mapaAFDNomes = {};
    linhas.forEach(function(linha) {
      if (!linha || !linha.trim()) return;
      try {
        var p = _parsearLinha(linha, layout);
        if (p && !p.ignorado && p.esCadastro && p.pis) {
          var pn = _normalizarPIS(p.pis);
          if (pn && p.nome) mapaAFDNomes[pn] = p.nome.trim();
        }
      } catch(_) {}
    });

    var resumo = {
      totalLinhas:       linhas.length,
      batidas:           0,
      cadastros:         0,
      ignoradas:         0,
      erros:             0,
      validosPIS:        0,
      validosNome:       0,
      semCadastro:       0,
      duplicados:        0
    };

    var amostraBatidas   = [];
    var amostraCadastros = [];
    var erros            = [];
    var pisNoArquivo     = {};

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
        var pisNorm  = _normalizarPIS(parsed.pis);
        var afdNome  = pisNorm ? (mapaAFDNomes[pisNorm] || null) : null;
        var colabId  = pisNorm ? (mapaPIS[pisNorm] || null) : null;
        var matchBy  = colabId ? 'pis' : null;

        // Fallback: correspondência por nome quando PIS não casa
        if (!colabId && afdNome) {
          colabId = _buscarColabPorNome(afdNome, mapaNomes);
          if (colabId) matchBy = 'nome';
        }

        var isDup = !!nsrsExistentes[String(parsed.nsr)];

        if      (isDup)          resumo.duplicados++;
        else if (matchBy==='pis') resumo.validosPIS++;
        else if (matchBy==='nome') resumo.validosNome++;
        else                     resumo.semCadastro++;

        if (pisNorm && !pisNoArquivo[pisNorm]) {
          pisNoArquivo[pisNorm] = {
            pis:      pisNorm,
            nome:     afdNome,
            colabId:  colabId,
            matchBy:  matchBy
          };
        }

        if (amostraBatidas.length < 50) {
          amostraBatidas.push({
            nsr:     parsed.nsr,
            data:    parsed.data,
            hora:    parsed.hora,
            pis:     pisNorm,
            nomeAfd: afdNome,
            colabId: colabId,
            matchBy: matchBy,
            duplicado:     isDup,
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

    var colaboradoresAfd = Object.keys(pisNoArquivo).slice(0, 100).map(function(pis) {
      return pisNoArquivo[pis];
    });

    return {
      ok:               true,
      layoutId:         layout.id,
      layoutNome:       layout.nome,
      resumo:           resumo,
      amostraBatidas:   amostraBatidas,
      amostraCadastros: amostraCadastros,
      colaboradoresAfd: colaboradoresAfd,
      totalColabAfd:    Object.keys(pisNoArquivo).length,
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
    var layout    = _resolverLayout(orgId, layoutId, conteudo);
    var linhas    = conteudo.split(/\r?\n/);
    var mapaPIS   = _construirMapaPIS(orgId);
    var mapaNomes = _construirMapaNomes(orgId);

    // Pre-carrega todos os NSRs existentes (1 leitura) para lookup O(1) por linha
    var nsrsExistentes = {};
    try {
      var _brutos = PontoBrutoRepository.listarBrutoPorPeriodo(orgId, '1900-01-01', '2999-12-31');
      _brutos.forEach(function(b){ if (b.nsr) nsrsExistentes[String(b.nsr)] = true; });
    } catch(_) {}

    // Passo 0: mapa PIS → nome do próprio arquivo AFD
    var mapaAFDNomes = {};
    linhas.forEach(function(linha) {
      if (!linha || !linha.trim()) return;
      try {
        var p = _parsearLinha(linha, layout);
        if (p && !p.ignorado && p.esCadastro && p.pis) {
          var pn = _normalizarPIS(p.pis);
          if (pn && p.nome) mapaAFDNomes[pn] = p.nome.trim();
        }
      } catch(_) {}
    });

    // Cria sessão como pendente
    var sessaoId = PontoBrutoRepository.criarSessao(orgId, {
      layoutId:     layout.id,
      nomeArquivo:  nomeArquivo || '',
      totalLinhas:  linhas.length,
      importadoPor: emailAdmin || ''
    });

    var lote = [];
    var resumo = {
      totalLinhas:    linhas.length,
      batidas:        0,
      cadastros:      0,
      ignoradas:      0,
      erros:          0,
      validosPIS:     0,
      validosNome:    0,
      semCadastro:    0,
      duplicados:     0,
      detalheErros:   []
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
          nsr: null, tipoRegistro: '?', linhaOriginal: linha,
          linhaNumero: idx + 1, layoutId: layout.id, status: 'erro', motivo: motErr
        });
        return;
      }

      if (!parsed || parsed.ignorado) { resumo.ignoradas++; return; }

      if (parsed.esBatida) {
        resumo.batidas++;
        var pisNorm = _normalizarPIS(parsed.pis);
        var afdNome = pisNorm ? (mapaAFDNomes[pisNorm] || null) : null;
        var colabId = pisNorm ? (mapaPIS[pisNorm] || null) : null;
        var matchBy = colabId ? 'pis' : null;

        // Fallback: correspondência por nome quando PIS não casa
        if (!colabId && afdNome) {
          colabId = _buscarColabPorNome(afdNome, mapaNomes);
          if (colabId) matchBy = 'nome';
        }

        var status = 'valido', motivo = '';
        if (!!nsrsExistentes[String(parsed.nsr)]) {
          status = 'duplicado';
          motivo = 'NSR ' + parsed.nsr + ' já existe';
          resumo.duplicados++;
        } else if (!colabId) {
          // Aceita o bruto sem colaborador; fica pendente para vinculação futura
          status = 'sem_cadastro';
          motivo = (afdNome || pisNorm) + ' não encontrado no sistema';
          resumo.semCadastro++;
        } else if (matchBy === 'nome') {
          resumo.validosNome++;
        } else {
          resumo.validosPIS++;
        }

        lote.push({
          nsr:              parsed.nsr,
          tipoRegistro:     parsed.tipoRegistro,
          datetimeOriginal: parsed.datetimeOriginal || '',
          data:             parsed.data  || '',
          hora:             parsed.hora  || '',
          pis:              pisNorm,
          nomeAfd:          afdNome || '',
          colaboradorId:    colabId,
          matchBy:          matchBy || '',
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
          status:           'cadastro'
        });
      }
    });

    PontoBrutoRepository.salvarLoteBruto(orgId, sessaoId, lote);

    var totalNaoValidos = resumo.erros + resumo.duplicados + resumo.semCadastro;
    PontoBrutoRepository.atualizarSessao(orgId, sessaoId, {
      registrosBrutos:    lote.length,
      registrosIgnorados: resumo.ignoradas,
      erros:              totalNaoValidos,
      detalheErros:       resumo.detalheErros
    });

    AuditoriaService.registrar('PONTO_IMPORTACAO_INICIADA', 'ponto', {
      sessaoId:    sessaoId,
      layoutId:    layout.id,
      arquivo:     nomeArquivo || '',
      batidas:     resumo.batidas,
      validosPIS:  resumo.validosPIS,
      validosNome: resumo.validosNome,
      semCadastro: resumo.semCadastro
    }, emailAdmin || '');

    return { ok: true, sessaoId: sessaoId, layoutId: layout.id, resumo: resumo };
  }

  // ─── Importação Etapa 2 — Confirmar (criar normalizados) ────────────────────

  /**
   * Converte registros brutos com status 'valido' ou 'sem_cadastro' em registros
   * normalizados. Quando a sessão contém brutos de cadastro (tipo 5) com PIS não
   * encontrado em colaboradores.json, cria stubs de colaborador automaticamente
   * antes de confirmar — permitindo importar arquivos AFD de sistemas sem nenhum
   * colaborador pré-cadastrado.
   *
   * @param {string} orgId
   * @param {string} sessaoId
   * @param {string} emailAdmin
   * @returns {{ ok, importados, autoCriados, semCadastro, duplicados, cadastros, erros }}
   */
  function confirmarImportacao(orgId, sessaoId, emailAdmin) {
    var sessao = PontoBrutoRepository.obterSessao(orgId, sessaoId);
    if (!sessao) throw new Error('Sessão não encontrada: ' + sessaoId);
    if (sessao.status !== 'pendente') {
      throw new Error('Sessão não está pendente (status atual: ' + sessao.status + ').');
    }

    var layout = AfdLayoutRepository.obter(sessao.layoutId);
    var brutos = PontoBrutoRepository.listarBrutoPorSessao(orgId, sessaoId);

    // ── Etapa 0: recarregar mapa PIS → colabId (inclui colaboradores já existentes) ──
    var mapaPIS = _construirMapaPIS(orgId);

    // ── Etapa 1: auto-criar colaboradores stubs a partir dos brutos de cadastro (tipo 5) ──
    // Agrupa por PIS único para evitar duplicatas quando o mesmo colaborador tem
    // múltiplas linhas de cadastro no arquivo (inclusão + alterações).
    var pisParaCriar = {};
    brutos.filter(function(b){ return b.status === 'cadastro' && b.pis; })
      .forEach(function(b) {
        var pis = String(b.pis).replace(/\D/g, '');
        // Só cria se ainda não existe no sistema (em nenhuma variante de 11/12 dígitos)
        if (!mapaPIS[pis] && !pisParaCriar[pis]) {
          pisParaCriar[pis] = (b.nomeEquipamento || '').trim();
        }
      });

    // Mapa nome normalizado → email dos usuários do sistema (para auto-vínculo)
    var mapaUsuariosNome = {};
    try {
      var usuarios = lerJSON('usuarios_acesso.json') || [];
      usuarios.filter(function(u){ return u.status === 'ativo' && u.nome && u.email; })
        .forEach(function(u) {
          var norm = _normalizarNome(u.nome);
          if (norm) mapaUsuariosNome[norm] = u.email;
        });
    } catch(_) {}

    var autoCriados = 0;
    var agora = new Date().toISOString();
    Object.keys(pisParaCriar).forEach(function(pis) {
      try {
        var nomeAfd = pisParaCriar[pis] || '';
        // Tenta auto-vincular ao usuário do sistema pelo nome
        var emailVinculo = _buscarColabPorNome(nomeAfd, mapaUsuariosNome) || null;

        var id = gerarId('COL');
        modifyJSON('colaboradores.json', function(lista) {
          if (!Array.isArray(lista)) lista = [];
          lista.push({
            id:                  id,
            orgId:               orgId,
            nome:                nomeAfd || 'Colaborador ' + pis,
            pis:                 pis,
            emailInstitucional:  emailVinculo || '',
            status:              'ativo',
            ativo:               true,
            origem:              'afd_import',
            vinculoAutomatico:   !!emailVinculo,
            importacaoId:        sessaoId,
            criadoEm:            agora,
            atualizadoEm:        agora
          });
          return lista;
        });
        // Atualiza o mapa local com o stub recém-criado
        mapaPIS[pis] = id;
        if (pis.length === 11) mapaPIS['0' + pis] = id;
        if (pis.length === 12 && pis.charAt(0) === '0') mapaPIS[pis.substring(1)] = id;
        autoCriados++;
      } catch(e) {
        Logger.warn('afd_parser_engine', 'confirmarImportacao', 'Erro ao criar stub PIS ' + pis + ': ' + e.message);
      }
    });

    // ── Etapa 1b: Backfill PIS nos colaboradores sem PIS ─────────────────────────
    // Para colaboradores matchados (por nome ou PIS) que ainda não têm o campo pis
    // preenchido na ficha, grava o PIS lido do AFD — permitindo edição posterior pelo RH.
    var pisBackfill = {};
    brutos.forEach(function(b) {
      if (b.colaboradorId && b.pis && !pisBackfill[b.colaboradorId]) {
        pisBackfill[b.colaboradorId] = String(b.pis).replace(/\D/g, '');
      }
    });
    var pisBackfilledCount = 0;
    if (Object.keys(pisBackfill).length > 0) {
      try {
        var agora = new Date().toISOString();
        modifyJSON('colaboradores.json', function(lista) {
          if (!Array.isArray(lista)) return lista;
          lista.forEach(function(c) {
            if (c.orgId === orgId && pisBackfill[c.id] && !c.pis) {
              c.pis = pisBackfill[c.id];
              c.atualizadoEm = agora;
              pisBackfilledCount++;
            }
          });
          return lista;
        });
      } catch(e) {
        Logger.warn('afd_parser_engine', 'confirmarImportacao', 'Backfill PIS: ' + e.message);
      }
    }

    // ── Etapa 2: montar lote de normalizados ─────────────────────────────────────
    // 'valido' → colaboradorId já resolvido em iniciarImportacao
    // 'sem_cadastro' → tenta resolver agora com o mapa atualizado (inclui stubs)
    // BATCH: toda escrita feita em 1 único modifyJSON (evita timeout para ~20k batidas)
    var paraConfirmar = brutos.filter(function(b){
      return b.status === 'valido' || b.status === 'sem_cadastro';
    });

    var semCadastroFinal = 0;
    var normalizadosLote = [];

    paraConfirmar.forEach(function(b) {
      var colabId = b.colaboradorId;
      if (!colabId && b.pis) {
        colabId = mapaPIS[String(b.pis).replace(/\D/g, '')] || null;
      }
      if (!colabId) {
        // Permanece sem vínculo mesmo após criação de stubs — PIS não aparecia
        // em nenhuma linha de cadastro (tipo 5) do arquivo
        semCadastroFinal++;
        return;
      }
      normalizadosLote.push({
        id:               gerarId('PONTO'),
        colaboradorId:    colabId,
        pis:              b.pis,
        data:             b.data,
        hora:             b.hora,
        datetimeOriginal: b.datetimeOriginal,
        tipo:             'E',    // tipo derivado in-place por calcularJornadasLote antes do save
        tipoEvento:       'batida',
        nsr:              b.nsr,
        importacaoId:     sessaoId,
        brutoId:          b.id,
        equipamento:      layout ? layout.nome : '',
        hash:             b.hash || '',
        origem:           'afd_import',
        status:           'ativo'
      });
    });

    // Calcula jornadas em memória: deriva tipos E/I/R/S e monta objetos jornada.
    // Atualiza campo `tipo` nos registros in-place — eliminando atualizarTipo individual.
    var jornadasLote = [];
    try {
      jornadasLote = JornadaEngine.calcularJornadasLote(orgId, normalizadosLote);
    } catch(e) {
      Logger.warn('afd_parser_engine', 'confirmarImportacao', 'calcularJornadasLote: ' + e.message);
    }

    // Salva todos os normalizados em 1 operação — evita N × modifyJSON individual
    var importados = 0, erros = 0;
    if (normalizadosLote.length > 0) {
      try {
        PontoRepository.salvarLote(orgId, normalizadosLote);
        importados = normalizadosLote.length;
      } catch(e) {
        erros = normalizadosLote.length;
        Logger.warn('afd_parser_engine', 'confirmarImportacao', 'salvarLote normalizados: ' + e.message);
      }
    }

    PontoBrutoRepository.concluirSessao(orgId, sessaoId, {
      registrosBrutos: importados,
      erros:           erros
    });

    AuditoriaService.registrar('PONTO_IMPORTACAO_CONFIRMADA', 'ponto', {
      sessaoId:    sessaoId,
      importados:  importados,
      autoCriados: autoCriados,
      erros:       erros
    }, emailAdmin || '');

    // Salva todas as jornadas em 1 operação
    var resultadoJornadas = { processadas: 0, erros: 0 };
    if (jornadasLote.length > 0) {
      try {
        JornadaRepository.salvarLote(orgId, jornadasLote);
        resultadoJornadas.processadas = jornadasLote.length;
      } catch(e) {
        resultadoJornadas.erros++;
        Logger.warn('afd_parser_engine', 'confirmarImportacao', 'salvarLote jornadas: ' + e.message);
      }
      // Acumula extras/faltantes no banco de horas (idempotente por data)
      try {
        JornadaEngine.atualizarBHDosLotes(orgId, jornadasLote);
      } catch(e) {
        Logger.warn('afd_parser_engine', 'confirmarImportacao', 'atualizarBH: ' + e.message);
      }
    }

    return {
      ok:               true,
      importados:       importados,
      autoCriados:      autoCriados,
      pisBackfilled:    pisBackfilledCount,
      erros:            erros,
      semCadastro:      semCadastroFinal,
      duplicados:       brutos.filter(function(b){ return b.status === 'duplicado'; }).length,
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
    // Remove normalizados órfãos que possam ter sido gravados antes de um timeout
    // no confirmarImportacao antigo (antes do batch fix). Seguro rodar mesmo quando
    // nenhum normalizado existe para essa sessão.
    try {
      PontoRepository.reverterImportacao(orgId, sessaoId);
    } catch(_) {}
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
    // Marca normalizados como 'revertido' no ponto_normalizado.json
    var revertidos = PontoRepository.reverterImportacao(orgId, sessaoId);
    // Remove brutos do ponto_bruto.json — necessário para que re-importação
    // do mesmo arquivo não classifique todos os NSRs como 'duplicado'
    PontoBrutoRepository.reverterSessao(orgId, sessaoId, emailAdmin);
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
