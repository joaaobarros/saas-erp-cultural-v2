/**
 * @file modules/financeiro/contrato_repository.gs
 * @layer modules/financeiro
 * @description Repositório canônico de Contratos.
 *
 * Fonte de verdade: contratos.json (Drive)
 *   Estrutura nested — metas, rubricas e indicadores embutidos dentro do contrato.
 *   Isso elimina joins entre Sheets, permite persistência atômica e facilita
 *   exportação para CODIP/SALIC.
 *
 * Índice auxiliar: FINANCEIRO.Contratos (Sheet — somente leitura operacional)
 *
 * Schema do contrato (ver docs/architecture/domain_model.md):
 *   { id, orgId, nome, numero, descricao, vigenciaInicio, vigenciaFim,
 *     status, valorTotal, valorRealizado, fonteRecurso, contrapartida,
 *     modalidade, obsFinanceiro, acaoId, criadoEm, atualizadoEm, criadoPor,
 *     versao, metas: [{ id, numero, titulo, descricao, tipoMeta,
 *       rubricas: [{ id, nome, obs, memoriaCalculo:[], valorTotal }],
 *       indicadores: [{ id, ano, nome, numero, tipoIndicador, meses:[] }] }] }
 *
 * REGRA: nenhum outro módulo lê/escreve contratos.json diretamente.
 *
 * @depends core/data_layer.gs (readJSON, modifyJSON)
 *          core/services/data_gateway.gs (DataGateway)
 *          core/utils.gs (gerarId, agora)
 *          core/logger.gs (Logger)
 *          core/config.gs (getOrgConfig)
 */

var ContratoRepository = (function () {

  var _ARQUIVO = 'contratos.json';
  var _SHEET_KEY = 'SHEET_ID_FINANCEIRO';
  var _ABA = 'Contratos';

  var _HEADERS = [
    'ID', 'OrgId', 'Nome', 'Numero', 'Status', 'FonteRecurso',
    'ValorTotal', 'ValorRealizado', 'VigenciaInicio', 'VigenciaFim',
    'Modalidade', 'AcaoId', 'NumMetas', 'CriadoEm', 'AtualizadoEm', 'Versao'
  ];

  // ── Helpers internos ──────────────────────────────────────────────

  function _orgId(orgId) {
    return orgId || getOrgConfig().orgId;
  }

  // ── Índice Sheet ──────────────────────────────────────────────────

  function _garantirCabecalhoIndice() {
    try {
      var aba = DataGateway.obterAba(_SHEET_KEY, _ABA);
      if (!aba) return;
      var atual = aba.getLastRow() > 0
        ? aba.getRange(1, 1, 1, Math.max(aba.getLastColumn(), _HEADERS.length)).getValues()[0]
        : [];
      var vazio = atual.every(function (v) { return !v; });
      if (vazio || String(atual[0] || '').trim() !== 'ID') {
        aba.getRange(1, 1, 1, _HEADERS.length).setValues([_HEADERS]);
        aba.setFrozenRows(1);
      }
    } catch (e) {
      Logger.warn('contrato_repository', '_garantirCabecalhoIndice', e.message);
    }
  }

  function _calcularValorRealizado(contrato) {
    // TODO Fase 4: calcular a partir dos pagamentos registrados
    return contrato.valorRealizado || 0;
  }

  function _serializarIndice(c) {
    return [
      c.id                  || '',
      c.orgId               || '',
      c.nome                || '',
      c.numero              || '',
      c.status              || '',
      c.fonteRecurso        || '',
      c.valorTotal          || 0,
      _calcularValorRealizado(c),
      c.vigenciaInicio      || '',
      c.vigenciaFim         || '',
      c.modalidade          || '',
      c.acaoId              || '',
      Array.isArray(c.metas) ? c.metas.length : 0,
      c.criadoEm            || '',
      c.atualizadoEm        || '',
      c.versao              || 1
    ];
  }

  function _indexar(orgId, contrato) {
    try {
      _garantirCabecalhoIndice();
      var linha = _serializarIndice(contrato);
      var atualizado = DataGateway.atualizarLinhaPorColuna(
        _SHEET_KEY, _ABA, 0, contrato.id, linha
      );
      if (!atualizado) DataGateway.salvarLinha(_SHEET_KEY, _ABA, linha);
    } catch (e) {
      Logger.warn('contrato_repository', '_indexar', 'Falha índice: ' + e.message);
    }
  }

  function _removerDoIndice(id) {
    try {
      DataGateway.removerLinhaPorColuna(_SHEET_KEY, _ABA, 0, id);
    } catch (e) {
      Logger.warn('contrato_repository', '_removerDoIndice', e.message);
    }
  }

  // ── Contratos (CRUD raiz) ─────────────────────────────────────────

  function listar(orgId, filtros) {
    orgId   = _orgId(orgId);
    filtros = filtros || {};
    var todos = readJSON(_ARQUIVO) || [];
    return todos
      .filter(function (c) {
        if (c.orgId && c.orgId !== orgId) return false;
        if (filtros.status && c.status !== filtros.status) return false;
        if (filtros.fonteRecurso && c.fonteRecurso !== filtros.fonteRecurso) return false;
        if (filtros.acaoId && c.acaoId !== filtros.acaoId) return false;
        return true;
      })
      .sort(function (a, b) {
        return String(b.atualizadoEm || '').localeCompare(String(a.atualizadoEm || ''));
      });
  }

  function buscarPorId(orgId, id) {
    orgId = _orgId(orgId);
    var todos = readJSON(_ARQUIVO) || [];
    for (var i = 0; i < todos.length; i++) {
      if (todos[i].id === id && (todos[i].orgId === orgId || !todos[i].orgId)) {
        return todos[i];
      }
    }
    return null;
  }

  /**
   * Cria ou atualiza um contrato (documento raiz).
   * Metas, rubricas e indicadores são preservados se já existirem e não forem
   * passados no payload (merge seguro).
   */
  function salvar(orgId, dados) {
    orgId = _orgId(orgId);
    dados = dados || {};
    dados.orgId = orgId;

    var agr    = agora ? agora() : new Date().toISOString();
    var isNovo = !dados.id;

    if (isNovo) {
      dados.id        = gerarId('ctr');
      dados.criadoEm  = agr;
      dados.versao    = 1;
      if (!dados.status) dados.status = 'Ativo';
      if (!dados.metas)  dados.metas  = [];
    } else {
      dados.versao = (dados.versao || 0) + 1;
    }
    dados.atualizadoEm = agr;

    // Calcular valorTotal a partir das rubricas se não informado explicitamente
    if (!dados.valorTotal && Array.isArray(dados.metas) && dados.metas.length) {
      dados.valorTotal = _somarMetas(dados.metas);
    }

    modifyJSON(_ARQUIVO, function (lista) {
      var idx = -1;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === dados.id) { idx = i; break; }
      }
      if (idx >= 0) {
        // Merge: preserva metas existentes se não passadas
        if (!dados.metas && lista[idx].metas) {
          dados.metas = lista[idx].metas;
        }
        lista[idx] = dados;
      } else {
        lista.push(dados);
      }
      return lista;
    });

    _indexar(orgId, dados);
    return { id: dados.id, isNovo: isNovo };
  }

  function excluir(orgId, id) {
    orgId = _orgId(orgId);
    var removido = false;
    modifyJSON(_ARQUIVO, function (lista) {
      var nova = lista.filter(function (c) {
        if (c.id === id && (c.orgId === orgId || !c.orgId)) {
          removido = true;
          return false;
        }
        return true;
      });
      return nova;
    });
    if (removido) _removerDoIndice(id);
    return removido;
  }

  // ── Metas ─────────────────────────────────────────────────────────

  function adicionarMeta(orgId, idContrato, dadosMeta) {
    orgId = _orgId(orgId);
    var idMeta = dadosMeta.id || gerarId('meta');
    dadosMeta.id        = idMeta;
    dadosMeta.criadoEm  = dadosMeta.criadoEm  || new Date().toISOString();
    if (!dadosMeta.rubricas)    dadosMeta.rubricas    = [];
    if (!dadosMeta.indicadores) dadosMeta.indicadores = [];

    modifyJSON(_ARQUIVO, function (lista) {
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === idContrato && (lista[i].orgId === orgId || !lista[i].orgId)) {
          var metas = lista[i].metas || [];
          var mIdx  = -1;
          for (var m = 0; m < metas.length; m++) {
            if (metas[m].id === idMeta) { mIdx = m; break; }
          }
          if (mIdx >= 0) metas[mIdx] = dadosMeta;
          else           metas.push(dadosMeta);
          lista[i].metas        = metas;
          lista[i].atualizadoEm = new Date().toISOString();
          lista[i].valorTotal   = _somarMetas(metas);
          _indexar(orgId, lista[i]);
          break;
        }
      }
      return lista;
    });
    return idMeta;
  }

  function removerMeta(orgId, idContrato, idMeta) {
    orgId = _orgId(orgId);
    modifyJSON(_ARQUIVO, function (lista) {
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === idContrato && (lista[i].orgId === orgId || !lista[i].orgId)) {
          lista[i].metas = (lista[i].metas || []).filter(function (m) { return m.id !== idMeta; });
          lista[i].atualizadoEm = new Date().toISOString();
          lista[i].valorTotal   = _somarMetas(lista[i].metas);
          _indexar(orgId, lista[i]);
          break;
        }
      }
      return lista;
    });
    return true;
  }

  // ── Rubricas ──────────────────────────────────────────────────────

  function adicionarRubrica(orgId, idContrato, idMeta, dadosRubrica) {
    orgId = _orgId(orgId);
    var idRubrica = dadosRubrica.id || gerarId('rub');
    dadosRubrica.id = idRubrica;

    // Normalizar e validar memória de cálculo
    var mem = Array.isArray(dadosRubrica.memoriaCalculo) ? dadosRubrica.memoriaCalculo : [];
    dadosRubrica.memoriaCalculo = mem.map(function (item) {
      var qtd    = Number(item.qtd)   || 0;
      var valor  = Number(item.valor) || 0;
      return {
        descricao: String(item.descricao || '').trim(),
        tipo:      String(item.tipo      || 'unitario').trim(),
        qtd:       qtd,
        valor:     valor,
        subtotal:  qtd * valor,
        obs:       String(item.obs || '').trim()
      };
    });
    dadosRubrica.valorTotal = dadosRubrica.memoriaCalculo.reduce(function (s, i) {
      return s + i.subtotal;
    }, 0);

    modifyJSON(_ARQUIVO, function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        if (c.id === idContrato && (c.orgId === orgId || !c.orgId)) {
          var metas = c.metas || [];
          for (var m = 0; m < metas.length; m++) {
            if (metas[m].id === idMeta) {
              var rubs = metas[m].rubricas || [];
              var rIdx = -1;
              for (var r = 0; r < rubs.length; r++) {
                if (rubs[r].id === idRubrica) { rIdx = r; break; }
              }
              if (rIdx >= 0) rubs[rIdx] = dadosRubrica;
              else           rubs.push(dadosRubrica);
              metas[m].rubricas    = rubs;
              metas[m].valorMeta   = _somarRubricas(rubs);
              c.metas              = metas;
              c.atualizadoEm       = new Date().toISOString();
              c.valorTotal         = _somarMetas(metas);
              _indexar(orgId, c);
              break;
            }
          }
          break;
        }
      }
      return lista;
    });
    return idRubrica;
  }

  function removerRubrica(orgId, idContrato, idMeta, idRubrica) {
    orgId = _orgId(orgId);
    modifyJSON(_ARQUIVO, function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        if (c.id === idContrato && (c.orgId === orgId || !c.orgId)) {
          var metas = c.metas || [];
          for (var m = 0; m < metas.length; m++) {
            if (metas[m].id === idMeta) {
              metas[m].rubricas = (metas[m].rubricas || []).filter(function (r) {
                return r.id !== idRubrica;
              });
              metas[m].valorMeta = _somarRubricas(metas[m].rubricas);
              c.metas      = metas;
              c.atualizadoEm = new Date().toISOString();
              c.valorTotal   = _somarMetas(metas);
              _indexar(orgId, c);
              break;
            }
          }
          break;
        }
      }
      return lista;
    });
    return true;
  }

  // ── Indicadores ───────────────────────────────────────────────────

  function adicionarIndicador(orgId, idContrato, idMeta, dadosInd) {
    orgId = _orgId(orgId);
    var idInd = dadosInd.id || gerarId('ind');
    dadosInd.id = idInd;
    var mesesArr = Array.isArray(dadosInd.meses) ? dadosInd.meses : [];
    while (mesesArr.length < 12) mesesArr.push(0);
    dadosInd.meses = mesesArr;

    modifyJSON(_ARQUIVO, function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        if (c.id === idContrato && (c.orgId === orgId || !c.orgId)) {
          var metas = c.metas || [];
          for (var m = 0; m < metas.length; m++) {
            if (metas[m].id === idMeta) {
              var inds = metas[m].indicadores || [];
              var iIdx = -1;
              for (var n = 0; n < inds.length; n++) {
                if (inds[n].id === idInd) { iIdx = n; break; }
              }
              if (iIdx >= 0) inds[iIdx] = dadosInd;
              else           inds.push(dadosInd);
              metas[m].indicadores = inds;
              c.metas = metas;
              c.atualizadoEm = new Date().toISOString();
              _indexar(orgId, c);
              break;
            }
          }
          break;
        }
      }
      return lista;
    });
    return idInd;
  }

  // ── Cálculos ──────────────────────────────────────────────────────

  function _somarRubricas(rubricas) {
    return (rubricas || []).reduce(function (s, r) { return s + (r.valorTotal || 0); }, 0);
  }

  function _somarMetas(metas) {
    return (metas || []).reduce(function (s, m) {
      return s + (m.valorMeta || _somarRubricas(m.rubricas));
    }, 0);
  }

  // ── Manutenção do índice ──────────────────────────────────────────

  function protegerIndice() {
    try {
      _garantirCabecalhoIndice();
      var aba = DataGateway.obterAba(_SHEET_KEY, _ABA);
      if (!aba) return { ok: false, mensagem: 'Aba FINANCEIRO.Contratos não localizada.' };
      var protecoes = aba.getProtections(SpreadsheetApp.ProtectionType.SHEET);
      var existente = protecoes.some(function (p) {
        return p.getDescription && p.getDescription() === 'Indice read-only: contratos.json fonte canonica';
      });
      if (!existente) {
        var p = aba.protect().setDescription('Indice read-only: contratos.json fonte canonica');
        p.setWarningOnly(true);
      }
      return { ok: true, mensagem: 'Índice FINANCEIRO.Contratos marcado como somente leitura operacional.' };
    } catch (e) {
      Logger.warn('contrato_repository', 'protegerIndice', e.message);
      return { ok: false, mensagem: e.message };
    }
  }

  /**
   * Migração: lê a aba FINANCEIRO.Contratos (ou Contratos legada) e insere
   * em contratos.json. Idempotente — ignora IDs já existentes.
   * Os campos de metas/rubricas não são migrados neste passo (ficam como []).
   */
  function migrarSheetParaJson(orgId) {
    orgId = _orgId(orgId);
    var importados = 0;
    var ignorados  = 0;

    // Tentar ler da aba FINANCEIRO.Contratos ou Contratos legada
    var aba = null;
    try { aba = DataGateway.obterAba(_SHEET_KEY, _ABA); } catch (e) {}
    if (!aba) {
      try { aba = DataGateway.obterAba('SHEET_ID_FINANCEIRO', 'Contratos'); } catch (e) {}
    }

    if (!aba || aba.getLastRow() < 2) {
      return { ok: true, importados: 0, ignorados: 0, mensagem: 'Aba de contratos não encontrada ou vazia — nada a migrar.' };
    }

    var rows = aba.getDataRange().getValues();
    // Tentar identificar colunas pelo cabeçalho
    var headers = rows[0].map(function (h) { return String(h || '').trim().toLowerCase(); });
    function col(nome, fallback) {
      var idx = headers.indexOf(nome.toLowerCase());
      return idx >= 0 ? idx : fallback;
    }

    var cId    = col('id',         0);
    var cNome  = col('nome',       1);
    var cNum   = col('numero',     2);
    var cDesc  = col('descricao',  3);
    var cVigI  = col('vigenciaini', 4);
    var cVigF  = col('vigenciafim', 5);
    var cStat  = col('status',     6);
    var cValor = col('valortotal', 7);
    var cFonte = col('fonterecurso', 8);

    for (var i = 1; i < rows.length; i++) {
      var r   = rows[i];
      var idL = String(r[cId] || '').trim();
      if (!idL) continue;

      var existente = buscarPorId(orgId, idL);
      if (existente) { ignorados++; continue; }

      var contrato = {
        id:             idL,
        orgId:          orgId,
        nome:           String(r[cNome]  || ''),
        numero:         String(r[cNum]   || ''),
        descricao:      String(r[cDesc]  || ''),
        vigenciaInicio: String(r[cVigI]  || ''),
        vigenciaFim:    String(r[cVigF]  || ''),
        status:         String(r[cStat]  || 'Ativo'),
        valorTotal:     Number(r[cValor]) || 0,
        fonteRecurso:   String(r[cFonte] || ''),
        metas:          [],
        criadoEm:       new Date().toISOString(),
        atualizadoEm:   new Date().toISOString(),
        versao:         1,
        origem:         'migracao_sheet'
      };
      salvar(orgId, contrato);
      importados++;
    }

    return {
      ok: true,
      importados: importados,
      ignorados:  ignorados,
      mensagem:   'Migração concluída: ' + importados + ' importados, ' + ignorados + ' já existiam. ' +
                  'ATENÇÃO: metas, rubricas e indicadores NÃO foram migrados neste passo — adicione manualmente ou via script dedicado.'
    };
  }

  // ── API pública ───────────────────────────────────────────────────

  return {
    // Contratos
    listar:           listar,
    buscarPorId:      buscarPorId,
    salvar:           salvar,
    excluir:          excluir,

    // Metas
    adicionarMeta:    adicionarMeta,
    removerMeta:      removerMeta,

    // Rubricas
    adicionarRubrica: adicionarRubrica,
    removerRubrica:   removerRubrica,

    // Indicadores
    adicionarIndicador: adicionarIndicador,

    // Manutenção
    garantirCabecalhoIndice: _garantirCabecalhoIndice,
    protegerIndice:          protegerIndice,
    migrarSheetParaJson:     migrarSheetParaJson
  };

})();
