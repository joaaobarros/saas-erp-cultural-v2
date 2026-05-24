/**
 * @file modules/financeiro/contrato_repository.gs
 * @layer modules/financeiro
 * @description Repositório canônico de Contratos.
 *
 * Fonte de verdade: contratos.json (Drive)
 *   Estrutura nested — metas, atividades, pessoal, rubricas e indicadores
 *   embutidos dentro do contrato.
 *
 * Schema completo do contrato (Plano de Trabalho CCBJ):
 *   {
 *     id, orgId, nome, numero, descricao,
 *     vigenciaInicio, vigenciaFim, status, qtdMeses,
 *     valorTotal,        -- SUM(metas[].subtotal)
 *     fonteRecurso, contrapartida, modalidade, obsFinanceiro, acaoId,
 *     criadoEm, atualizadoEm, criadoPor, versao,
 *     indicadoresGestao: [Indicador GESTÃO — vinculados ao contrato],
 *     metas: [{
 *       id, numero, titulo, descricao, tipoMeta,
 *       eixo, acaoContratual, periodo,
 *       pessoalTotal,     -- SUM(pessoal[].custoTotal)  calculado
 *       custeioTotal,     -- SUM(atividades[].custeioTotal) calculado
 *       investimentoTotal, subtotal,   -- calculados
 *       atividades: [{
 *         id, numero, descricao, resultado, produto, qtdPrevistaProduto, qtdMeses,
 *         custeioTotal, investimentoTotal, total,   -- calculados
 *         rubricas: [{
 *           id, categoria (custeio|investimento), nome, codigoSeplag, itemAnexoIX,
 *           qtdMeses, custoMensal, valorTotal,      -- calculados
 *           memoriaCalculo: [{ id, descricao, qtd, metrica, valorUnitario, subtotal, obs }]
 *         }]
 *       }],
 *       pessoal: [{
 *         id, cargo, nome, enquadramento, vincFunc, qtd, qtdMeses,
 *         salarioAtual, reajuste, totalSalario,
 *         inssPatronal, sistemaS, fgts, pis, totalEncargos,
 *         valeTransporte, descontoVT, alimentacao, descontoAlimentacao,
 *         planoSaude, descontoPlano, totalBeneficios,
 *         ferias, decimoTerceiro, fgtsRescisao, totalProvisoes,
 *         custoMensal, custoTotal
 *       }],
 *       indicadores: [{
 *         id, tipoIndicador (RESULTADOS), numeroGlobal, numeroPorMeta,
 *         nome, tipoMetrica, peso, unidade, periodicidade, formula,
 *         meses: [{ mes, meta, realizado }],
 *         trimestres: [{ trimestre, periodoLabel, meta, realizado }],
 *         metaTotal
 *       }]
 *     }]
 *   }
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

  // ── Somatório ascendente ──────────────────────────────────────────

  function _somarMemoria(memoriaCalculo) {
    return (memoriaCalculo || []).reduce(function (s, i) {
      return s + (Number(i.subtotal) || (Number(i.qtd || 0) * Number(i.valorUnitario || i.valor || 0)));
    }, 0);
  }

  function _somarRubricas(rubricas) {
    return (rubricas || []).reduce(function (s, r) { return s + (Number(r.valorTotal) || 0); }, 0);
  }

  function _calcularAtividade(atv) {
    var rubs = atv.rubricas || [];
    var custeio = rubs.filter(function (r) { return r.categoria === 'custeio'; });
    var invest  = rubs.filter(function (r) { return r.categoria === 'investimento'; });
    var custeioTotal     = _somarRubricas(custeio);
    var investimentoTotal = _somarRubricas(invest);
    atv.custeioTotal      = custeioTotal;
    atv.investimentoTotal = investimentoTotal;
    atv.total             = custeioTotal + investimentoTotal;
    return atv;
  }

  function _calcularMeta(meta) {
    var atividades = (meta.atividades || []).map(_calcularAtividade);
    meta.atividades = atividades;

    var custeioTotal      = atividades.reduce(function (s, a) { return s + (a.custeioTotal || 0); }, 0);
    var investimentoTotal = atividades.reduce(function (s, a) { return s + (a.investimentoTotal || 0); }, 0);

    // pessoal
    var pessoalTotal = (meta.pessoal || []).reduce(function (s, p) { return s + (Number(p.custoTotal) || 0); }, 0);

    // backward compat: rubricas legadas diretamente na meta (sem atividade)
    var legado = _somarRubricas(meta.rubricas);

    meta.pessoalTotal     = pessoalTotal;
    meta.custeioTotal     = custeioTotal;
    meta.investimentoTotal = investimentoTotal;
    meta.subtotal         = pessoalTotal + custeioTotal + investimentoTotal + legado;
    // valorMeta mantido por compatibilidade
    meta.valorMeta        = meta.subtotal;
    return meta;
  }

  function _somarMetas(metas) {
    return (metas || []).reduce(function (s, m) {
      // Se a meta já foi calculada com subtotal, usa; senão cai no legado
      return s + (Number(m.subtotal) || Number(m.valorMeta) || _somarRubricas(m.rubricas));
    }, 0);
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
   * Metas, rubricas e indicadores são preservados se já existirem.
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
      if (!dados.indicadoresGestao) dados.indicadoresGestao = [];
    } else {
      dados.versao = (dados.versao || 0) + 1;
    }
    dados.atualizadoEm = agr;

    // Calcular qtdMeses a partir das vigências
    if (dados.vigenciaInicio && dados.vigenciaFim) {
      try {
        var dIni = new Date(dados.vigenciaInicio);
        var dFim = new Date(dados.vigenciaFim);
        var meses = (dFim.getFullYear() - dIni.getFullYear()) * 12 +
                    (dFim.getMonth() - dIni.getMonth()) + 1;
        dados.qtdMeses = meses > 0 ? meses : 1;
      } catch (_) {}
    }

    // Calcular valorTotal a partir das metas
    if (Array.isArray(dados.metas) && dados.metas.length) {
      dados.valorTotal = _somarMetas(dados.metas);
    }

    modifyJSON(_ARQUIVO, function (lista) {
      var idx = -1;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === dados.id) { idx = i; break; }
      }
      if (idx >= 0) {
        if (!dados.metas && lista[idx].metas) dados.metas = lista[idx].metas;
        if (!dados.indicadoresGestao && lista[idx].indicadoresGestao)
          dados.indicadoresGestao = lista[idx].indicadoresGestao;
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
    if (!dadosMeta.atividades)  dadosMeta.atividades  = [];
    if (!dadosMeta.pessoal)     dadosMeta.pessoal     = [];
    if (!dadosMeta.indicadores) dadosMeta.indicadores = [];
    if (!dadosMeta.rubricas)    dadosMeta.rubricas    = []; // backward compat

    modifyJSON(_ARQUIVO, function (lista) {
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === idContrato && (lista[i].orgId === orgId || !lista[i].orgId)) {
          var metas = lista[i].metas || [];
          var mIdx  = -1;
          for (var m = 0; m < metas.length; m++) {
            if (metas[m].id === idMeta) { mIdx = m; break; }
          }
          // Ao atualizar, preservar arrays filhos se não enviados
          if (mIdx >= 0) {
            var existente = metas[mIdx];
            if (!dadosMeta.atividades.length  && existente.atividades)  dadosMeta.atividades  = existente.atividades;
            if (!dadosMeta.pessoal.length     && existente.pessoal)     dadosMeta.pessoal     = existente.pessoal;
            if (!dadosMeta.indicadores.length && existente.indicadores) dadosMeta.indicadores = existente.indicadores;
            if (!dadosMeta.rubricas.length    && existente.rubricas)    dadosMeta.rubricas    = existente.rubricas;
            metas[mIdx] = dadosMeta;
          } else {
            metas.push(dadosMeta);
          }
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

  // ── Atividades ────────────────────────────────────────────────────

  function adicionarAtividade(orgId, idContrato, idMeta, dadosAtv) {
    orgId = _orgId(orgId);
    var idAtv = dadosAtv.id || gerarId('atv');
    dadosAtv.id       = idAtv;
    dadosAtv.criadoEm = dadosAtv.criadoEm || new Date().toISOString();
    if (!dadosAtv.rubricas) dadosAtv.rubricas = [];

    modifyJSON(_ARQUIVO, function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        if (c.id === idContrato && (c.orgId === orgId || !c.orgId)) {
          var metas = c.metas || [];
          for (var m = 0; m < metas.length; m++) {
            if (metas[m].id === idMeta) {
              var atvs = metas[m].atividades || [];
              var aIdx = -1;
              for (var a = 0; a < atvs.length; a++) {
                if (atvs[a].id === idAtv) { aIdx = a; break; }
              }
              if (aIdx >= 0) {
                // preservar rubricas existentes se não enviadas
                if (!dadosAtv.rubricas.length && atvs[aIdx].rubricas)
                  dadosAtv.rubricas = atvs[aIdx].rubricas;
                atvs[aIdx] = dadosAtv;
              } else {
                atvs.push(dadosAtv);
              }
              metas[m].atividades = atvs;
              _calcularMeta(metas[m]);
              c.metas       = metas;
              c.atualizadoEm = new Date().toISOString();
              c.valorTotal  = _somarMetas(metas);
              _indexar(orgId, c);
              break;
            }
          }
          break;
        }
      }
      return lista;
    });
    return idAtv;
  }

  function removerAtividade(orgId, idContrato, idMeta, idAtividade) {
    orgId = _orgId(orgId);
    modifyJSON(_ARQUIVO, function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        if (c.id === idContrato && (c.orgId === orgId || !c.orgId)) {
          var metas = c.metas || [];
          for (var m = 0; m < metas.length; m++) {
            if (metas[m].id === idMeta) {
              metas[m].atividades = (metas[m].atividades || [])
                .filter(function (a) { return a.id !== idAtividade; });
              _calcularMeta(metas[m]);
              c.metas       = metas;
              c.atualizadoEm = new Date().toISOString();
              c.valorTotal  = _somarMetas(metas);
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

  // ── Pessoal (Folha de Pagamento) ──────────────────────────────────

  function adicionarPessoal(orgId, idContrato, idMeta, dadosPes) {
    orgId = _orgId(orgId);
    var idPes = dadosPes.id || gerarId('pes');
    dadosPes.id       = idPes;
    dadosPes.criadoEm = dadosPes.criadoEm || new Date().toISOString();

    modifyJSON(_ARQUIVO, function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        if (c.id === idContrato && (c.orgId === orgId || !c.orgId)) {
          var metas = c.metas || [];
          for (var m = 0; m < metas.length; m++) {
            if (metas[m].id === idMeta) {
              var pessoal = metas[m].pessoal || [];
              var pIdx = -1;
              for (var p = 0; p < pessoal.length; p++) {
                if (pessoal[p].id === idPes) { pIdx = p; break; }
              }
              if (pIdx >= 0) pessoal[pIdx] = dadosPes; else pessoal.push(dadosPes);
              metas[m].pessoal = pessoal;
              _calcularMeta(metas[m]);
              c.metas       = metas;
              c.atualizadoEm = new Date().toISOString();
              c.valorTotal  = _somarMetas(metas);
              _indexar(orgId, c);
              break;
            }
          }
          break;
        }
      }
      return lista;
    });
    return idPes;
  }

  function removerPessoal(orgId, idContrato, idMeta, idPessoal) {
    orgId = _orgId(orgId);
    modifyJSON(_ARQUIVO, function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        if (c.id === idContrato && (c.orgId === orgId || !c.orgId)) {
          var metas = c.metas || [];
          for (var m = 0; m < metas.length; m++) {
            if (metas[m].id === idMeta) {
              metas[m].pessoal = (metas[m].pessoal || [])
                .filter(function (p) { return p.id !== idPessoal; });
              _calcularMeta(metas[m]);
              c.metas       = metas;
              c.atualizadoEm = new Date().toISOString();
              c.valorTotal  = _somarMetas(metas);
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

  // ── Rubricas (Item de Despesa) ────────────────────────────────────

  /**
   * Adiciona ou atualiza uma rubrica.
   * @param {string}  orgId
   * @param {string}  idContrato
   * @param {string}  idMeta
   * @param {string|null} idAtividade — se null, rubrica vai direto na meta (backward compat)
   * @param {object}  dadosRubrica   — inclui categoria ('custeio'|'investimento')
   */
  function adicionarRubrica(orgId, idContrato, idMeta, idAtividade, dadosRubrica) {
    // Backward compat: assinatura antiga era (orgId, idContrato, idMeta, dadosRubrica)
    if (typeof idAtividade === 'object' && idAtividade !== null) {
      dadosRubrica = idAtividade;
      idAtividade  = null;
    }

    orgId = _orgId(orgId);
    var idRubrica = dadosRubrica.id || gerarId('rub');
    dadosRubrica.id = idRubrica;

    // Normalizar e validar memória de cálculo
    var mem = Array.isArray(dadosRubrica.memoriaCalculo) ? dadosRubrica.memoriaCalculo : [];
    dadosRubrica.memoriaCalculo = mem.map(function (item) {
      var qtd         = Number(item.qtd)          || 0;
      var valorUnit   = Number(item.valorUnitario || item.valor) || 0;
      return {
        id:          item.id || gerarId('mem'),
        descricao:   String(item.descricao || '').trim(),
        qtd:         qtd,
        metrica:     String(item.metrica || item.tipo || 'UN').trim(),
        valorUnitario: valorUnit,
        subtotal:    qtd * valorUnit,
        obs:         String(item.obs || '').trim()
      };
    });

    dadosRubrica.valorTotal = dadosRubrica.memoriaCalculo.reduce(function (s, i) {
      return s + i.subtotal;
    }, 0);
    if (dadosRubrica.qtdMeses) {
      dadosRubrica.custoMensal = dadosRubrica.qtdMeses > 0
        ? dadosRubrica.valorTotal / dadosRubrica.qtdMeses : 0;
    }

    modifyJSON(_ARQUIVO, function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        if (c.id === idContrato && (c.orgId === orgId || !c.orgId)) {
          var metas = c.metas || [];
          for (var m = 0; m < metas.length; m++) {
            if (metas[m].id !== idMeta) continue;

            if (idAtividade) {
              // Nova estrutura: rubrica dentro de uma atividade
              var atvs = metas[m].atividades || [];
              for (var a = 0; a < atvs.length; a++) {
                if (atvs[a].id !== idAtividade) continue;
                var rubs = atvs[a].rubricas || [];
                var rIdx = -1;
                for (var r = 0; r < rubs.length; r++) {
                  if (rubs[r].id === idRubrica) { rIdx = r; break; }
                }
                if (rIdx >= 0) rubs[rIdx] = dadosRubrica; else rubs.push(dadosRubrica);
                atvs[a].rubricas = rubs;
                break;
              }
              metas[m].atividades = atvs;
            } else {
              // Backward compat: rubrica diretamente na meta
              var rubsMeta = metas[m].rubricas || [];
              var rIdxM = -1;
              for (var rm = 0; rm < rubsMeta.length; rm++) {
                if (rubsMeta[rm].id === idRubrica) { rIdxM = rm; break; }
              }
              if (rIdxM >= 0) rubsMeta[rIdxM] = dadosRubrica; else rubsMeta.push(dadosRubrica);
              metas[m].rubricas = rubsMeta;
            }

            _calcularMeta(metas[m]);
            c.metas       = metas;
            c.atualizadoEm = new Date().toISOString();
            c.valorTotal  = _somarMetas(metas);
            _indexar(orgId, c);
            break;
          }
          break;
        }
      }
      return lista;
    });
    return idRubrica;
  }

  function removerRubrica(orgId, idContrato, idMeta, idAtividade, idRubrica) {
    // Backward compat
    if (!idRubrica) {
      idRubrica  = idAtividade;
      idAtividade = null;
    }

    orgId = _orgId(orgId);
    modifyJSON(_ARQUIVO, function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        if (c.id === idContrato && (c.orgId === orgId || !c.orgId)) {
          var metas = c.metas || [];
          for (var m = 0; m < metas.length; m++) {
            if (metas[m].id !== idMeta) continue;

            if (idAtividade) {
              var atvs = metas[m].atividades || [];
              for (var a = 0; a < atvs.length; a++) {
                if (atvs[a].id !== idAtividade) continue;
                atvs[a].rubricas = (atvs[a].rubricas || [])
                  .filter(function (r) { return r.id !== idRubrica; });
                break;
              }
              metas[m].atividades = atvs;
            } else {
              metas[m].rubricas = (metas[m].rubricas || [])
                .filter(function (r) { return r.id !== idRubrica; });
            }

            _calcularMeta(metas[m]);
            c.metas       = metas;
            c.atualizadoEm = new Date().toISOString();
            c.valorTotal  = _somarMetas(metas);
            _indexar(orgId, c);
            break;
          }
          break;
        }
      }
      return lista;
    });
    return true;
  }

  // ── Indicadores RESULTADOS (por Meta) ────────────────────────────

  function adicionarIndicador(orgId, idContrato, idMeta, dadosInd) {
    orgId = _orgId(orgId);
    var idInd = dadosInd.id || gerarId('ind');
    dadosInd.id = idInd;

    // meses: array de { mes, meta, realizado } — gerado pelo engine com base na vigência
    if (!Array.isArray(dadosInd.meses)) dadosInd.meses = [];

    // trimestres: calculados somente-leitura
    if (!Array.isArray(dadosInd.trimestres)) dadosInd.trimestres = [];

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
              if (iIdx >= 0) inds[iIdx] = dadosInd; else inds.push(dadosInd);
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

  /**
   * Atualiza a meta (ou realizado) de um mês específico de um indicador RESULTADOS.
   * Campo: 'meta' | 'realizado'
   */
  function atualizarMetaMes(orgId, idContrato, idMeta, idIndicador, mes, campo, valor) {
    orgId = _orgId(orgId);
    campo = campo === 'realizado' ? 'realizado' : 'meta';

    modifyJSON(_ARQUIVO, function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        if (c.id !== idContrato || (c.orgId && c.orgId !== orgId)) continue;
        var metas = c.metas || [];
        for (var m = 0; m < metas.length; m++) {
          if (metas[m].id !== idMeta) continue;
          var inds = metas[m].indicadores || [];
          for (var n = 0; n < inds.length; n++) {
            if (inds[n].id !== idIndicador) continue;
            var mesArr = inds[n].meses || [];
            var encontrou = false;
            for (var k = 0; k < mesArr.length; k++) {
              if (mesArr[k].mes === mes) {
                mesArr[k][campo] = Number(valor) || valor;
                encontrou = true;
                break;
              }
            }
            if (!encontrou) {
              var entry = { mes: mes, meta: 0, realizado: null };
              entry[campo] = Number(valor) || valor;
              mesArr.push(entry);
            }
            // Recalcular metaTotal
            inds[n].meses = mesArr;
            inds[n].metaTotal = mesArr.reduce(function (s, x) { return s + (Number(x.meta) || 0); }, 0);
            break;
          }
          metas[m].indicadores = inds;
          c.metas = metas;
          c.atualizadoEm = new Date().toISOString();
          break;
        }
        break;
      }
      return lista;
    });
    return true;
  }

  // ── Indicadores GESTÃO (por Contrato) ────────────────────────────

  function adicionarIndicadorGestao(orgId, idContrato, dadosInd) {
    orgId = _orgId(orgId);
    var idInd = dadosInd.id || gerarId('indg');
    dadosInd.id           = idInd;
    dadosInd.tipoIndicador = 'GESTAO';
    if (!Array.isArray(dadosInd.metasGestao)) dadosInd.metasGestao = [];

    modifyJSON(_ARQUIVO, function (lista) {
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === idContrato && (lista[i].orgId === orgId || !lista[i].orgId)) {
          var indsG = lista[i].indicadoresGestao || [];
          var gIdx = -1;
          for (var n = 0; n < indsG.length; n++) {
            if (indsG[n].id === idInd) { gIdx = n; break; }
          }
          if (gIdx >= 0) indsG[gIdx] = dadosInd; else indsG.push(dadosInd);
          lista[i].indicadoresGestao = indsG;
          lista[i].atualizadoEm      = new Date().toISOString();
          _indexar(orgId, lista[i]);
          break;
        }
      }
      return lista;
    });
    return idInd;
  }

  function removerIndicadorGestao(orgId, idContrato, idIndicador) {
    orgId = _orgId(orgId);
    modifyJSON(_ARQUIVO, function (lista) {
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === idContrato && (lista[i].orgId === orgId || !lista[i].orgId)) {
          lista[i].indicadoresGestao = (lista[i].indicadoresGestao || [])
            .filter(function (g) { return g.id !== idIndicador; });
          lista[i].atualizadoEm = new Date().toISOString();
          _indexar(orgId, lista[i]);
          break;
        }
      }
      return lista;
    });
    return true;
  }

  /**
   * Atualiza a meta (ou realizado) de um período de um indicador GESTÃO.
   * Campo: 'meta' | 'realizado'
   */
  function atualizarMetaGestao(orgId, idContrato, idIndicador, periodo, campo, valor) {
    orgId = _orgId(orgId);
    campo = campo === 'realizado' ? 'realizado' : 'meta';

    modifyJSON(_ARQUIVO, function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        if (c.id !== idContrato || (c.orgId && c.orgId !== orgId)) continue;
        var indsG = c.indicadoresGestao || [];
        for (var n = 0; n < indsG.length; n++) {
          if (indsG[n].id !== idIndicador) continue;
          var arr = indsG[n].metasGestao || [];
          var encontrou = false;
          for (var k = 0; k < arr.length; k++) {
            if (arr[k].periodo === periodo) {
              arr[k][campo] = valor;
              encontrou = true;
              break;
            }
          }
          if (!encontrou) {
            var entry = { periodo: periodo, meta: '', realizado: null };
            entry[campo] = valor;
            arr.push(entry);
          }
          indsG[n].metasGestao = arr;
          break;
        }
        c.indicadoresGestao = indsG;
        c.atualizadoEm = new Date().toISOString();
        break;
      }
      return lista;
    });
    return true;
  }

  // ── Modificação transacional ──────────────────────────────────────

  /**
   * Modifica um contrato via callback transacional.
   * @param {string} orgId
   * @param {string} idContrato
   * @param {function} fn — recebe o contrato e retorna o contrato modificado
   */
  function modificarContrato(orgId, idContrato, fn) {
    modifyJSON(_ARQUIVO, function(lista) {
      if (!Array.isArray(lista)) lista = [];
      var idx = -1;
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].id === idContrato && (lista[i].orgId === orgId || !lista[i].orgId)) {
          idx = i; break;
        }
      }
      if (idx < 0) throw new Error('Contrato não encontrado: ' + idContrato);
      lista[idx] = fn(lista[idx]);
      lista[idx].atualizadoEm = typeof agora === 'function' ? agora() : new Date().toISOString();
      return lista;
    });
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

  function migrarSheetParaJson(orgId) {
    orgId = _orgId(orgId);
    var importados = 0;
    var ignorados  = 0;

    var aba = null;
    try { aba = DataGateway.obterAba(_SHEET_KEY, _ABA); } catch (e) {}
    if (!aba) {
      try { aba = DataGateway.obterAba('SHEET_ID_FINANCEIRO', 'Contratos'); } catch (e) {}
    }

    if (!aba || aba.getLastRow() < 2) {
      return { ok: true, importados: 0, ignorados: 0, mensagem: 'Aba de contratos não encontrada ou vazia.' };
    }

    var rows = aba.getDataRange().getValues();
    var headers = rows[0].map(function (h) { return String(h || '').trim().toLowerCase(); });
    function col(nome, fallback) {
      var idx = headers.indexOf(nome.toLowerCase());
      return idx >= 0 ? idx : fallback;
    }

    var cId    = col('id',          0);
    var cNome  = col('nome',        1);
    var cNum   = col('numero',      2);
    var cDesc  = col('descricao',   3);
    var cVigI  = col('vigenciaini', 4);
    var cVigF  = col('vigenciafim', 5);
    var cStat  = col('status',      6);
    var cValor = col('valortotal',  7);
    var cFonte = col('fonterecurso', 8);

    for (var i = 1; i < rows.length; i++) {
      var r   = rows[i];
      var idL = String(r[cId] || '').trim();
      if (!idL) continue;

      var existente = buscarPorId(orgId, idL);
      if (existente) { ignorados++; continue; }

      var contrato = {
        id:               idL,
        orgId:            orgId,
        nome:             String(r[cNome]  || ''),
        numero:           String(r[cNum]   || ''),
        descricao:        String(r[cDesc]  || ''),
        vigenciaInicio:   String(r[cVigI]  || ''),
        vigenciaFim:      String(r[cVigF]  || ''),
        status:           String(r[cStat]  || 'Ativo'),
        valorTotal:       Number(r[cValor]) || 0,
        fonteRecurso:     String(r[cFonte] || ''),
        metas:            [],
        indicadoresGestao: [],
        criadoEm:         new Date().toISOString(),
        atualizadoEm:     new Date().toISOString(),
        versao:           1,
        origem:           'migracao_sheet'
      };
      salvar(orgId, contrato);
      importados++;
    }

    return {
      ok: true,
      importados: importados,
      ignorados:  ignorados,
      mensagem:   'Migração concluída: ' + importados + ' importados, ' + ignorados + ' já existiam.'
    };
  }

  // ── API pública ───────────────────────────────────────────────────

  return {
    // Contratos
    listar:            listar,
    buscarPorId:       buscarPorId,
    salvar:            salvar,
    excluir:           excluir,

    // Metas
    adicionarMeta:     adicionarMeta,
    removerMeta:       removerMeta,

    // Atividades
    adicionarAtividade: adicionarAtividade,
    removerAtividade:   removerAtividade,

    // Pessoal
    adicionarPessoal:  adicionarPessoal,
    removerPessoal:    removerPessoal,

    // Rubricas
    adicionarRubrica:  adicionarRubrica,
    removerRubrica:    removerRubrica,

    // Indicadores RESULTADOS
    adicionarIndicador:   adicionarIndicador,
    atualizarMetaMes:     atualizarMetaMes,

    // Indicadores GESTÃO
    adicionarIndicadorGestao: adicionarIndicadorGestao,
    removerIndicadorGestao:   removerIndicadorGestao,
    atualizarMetaGestao:      atualizarMetaGestao,

    // Modificação transacional
    modificarContrato: modificarContrato,

    // Manutenção
    garantirCabecalhoIndice: _garantirCabecalhoIndice,
    protegerIndice:          protegerIndice,
    migrarSheetParaJson:     migrarSheetParaJson,

    // Helpers exportados para engine
    _calcularMeta:   _calcularMeta,
    _somarMetas:     _somarMetas
  };

})();
