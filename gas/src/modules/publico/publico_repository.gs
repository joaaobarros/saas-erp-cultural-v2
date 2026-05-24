/**
 * @file modules/publico/publico_repository.gs
 * @layer modules/publico
 * @description Repositório de Público — inscrições, presenças, pesquisas e certificados.
 *
 * Fontes de verdade:
 *   inscricoes.json   → inscrições em Ações (com suporte a lista de espera)
 *   presencas.json    → registro de presença por sessão
 *   pesquisas.json    → pesquisas de satisfação pós-evento
 *   certificados.json → certificados gerados por frequência
 *
 * Índice Sheet: PUBLICO.Inscricoes / Presencas / Pesquisas / Certificados
 *
 * @depends core/data_layer.gs, core/utils.gs, core/logger.gs
 */

var PublicoRepository = (function () {

  // ─── Constantes ──────────────────────────────────────────────────────────

  var _ARQ = {
    inscricoes:   'inscricoes.json',
    presencas:    'presencas.json',
    pesquisas:    'pesquisas.json',
    certificados: 'certificados.json'
  };

  var _SHEET_KEY = 'SHEET_ID_PUBLICO';

  var _HDR = {
    inscricoes:   ['ID','OrgId','AcaoId','AcaoNome','Nome','Email','Telefone','Idade',
                   'CEP','Ocupacao','ComoSoube','Status','Protocolo','ConsentimentoId',
                   'CriadoEm','AtualizadoEm','CanceladoEm','MotivoCancelamento'],
    presencas:    ['ID','OrgId','AcaoId','InscricaoId','SessaoId','SessaoNome',
                   'Presente','CheckInEm','RegistradoPor'],
    pesquisas:    ['ID','OrgId','AcaoId','InscricaoId','Email','Nota',
                   'Recomendaria','Comentario','CriadoEm'],
    certificados: ['ID','OrgId','AcaoId','AcaoNome','InscricaoId','Nome',
                   'Email','Frequencia','GeradoEm','UrlDoc']
  };

  // ─── Inscrições ───────────────────────────────────────────────────────────

  var Inscricoes = {

    listar: function(orgId, filtros) {
      filtros = filtros || {};
      return readJSON(_ARQ.inscricoes).filter(function(i) {
        if (i.orgId !== orgId) return false;
        if (filtros.acaoId  && i.acaoId  !== filtros.acaoId)  return false;
        if (filtros.status  && i.status  !== filtros.status)  return false;
        if (filtros.email   && i.email   !== filtros.email.toLowerCase().trim()) return false;
        return true;
      });
    },

    buscarPorId: function(orgId, id) {
      return readJSON(_ARQ.inscricoes).find(function(i) {
        return i.id === id && i.orgId === orgId;
      }) || null;
    },

    buscarPorProtocolo: function(orgId, protocolo) {
      return readJSON(_ARQ.inscricoes).find(function(i) {
        return i.protocolo === protocolo && i.orgId === orgId;
      }) || null;
    },

    contarAtivos: function(orgId, acaoId) {
      return readJSON(_ARQ.inscricoes).filter(function(i) {
        return i.orgId === orgId && i.acaoId === acaoId &&
               (i.status === 'inscrito' || i.status === 'confirmado' || i.status === 'presente');
      }).length;
    },

    contarListaEspera: function(orgId, acaoId) {
      return readJSON(_ARQ.inscricoes).filter(function(i) {
        return i.orgId === orgId && i.acaoId === acaoId && i.status === 'lista_espera';
      }).length;
    },

    primeiroNaEspera: function(orgId, acaoId) {
      var espera = readJSON(_ARQ.inscricoes)
        .filter(function(i) {
          return i.orgId === orgId && i.acaoId === acaoId && i.status === 'lista_espera';
        })
        .sort(function(a, b) { return a.criadoEm < b.criadoEm ? -1 : 1; });
      return espera.length ? espera[0] : null;
    },

    salvar: function(orgId, inscricao) {
      var agora = new Date().toISOString();
      var resultado;
      modifyJSON(_ARQ.inscricoes, function(lista) {
        var idx = lista.findIndex(function(i) { return i.id === inscricao.id && i.orgId === orgId; });
        if (idx >= 0) {
          lista[idx] = Object.assign({}, lista[idx], inscricao, { atualizadoEm: agora });
          resultado  = lista[idx];
        } else {
          resultado  = Object.assign({ criadoEm: agora, atualizadoEm: agora }, inscricao);
          lista.push(resultado);
        }
        return lista;
      });
      _indexarInscricao(resultado);
      return resultado;
    },

    excluir: function(orgId, id) {
      modifyJSON(_ARQ.inscricoes, function(lista) {
        return lista.filter(function(i) { return !(i.id === id && i.orgId === orgId); });
      });
      return true;
    }
  };

  // ─── Presenças ────────────────────────────────────────────────────────────

  var Presencas = {

    listar: function(orgId, filtros) {
      filtros = filtros || {};
      return readJSON(_ARQ.presencas).filter(function(p) {
        if (p.orgId !== orgId) return false;
        if (filtros.acaoId      && p.acaoId      !== filtros.acaoId)      return false;
        if (filtros.inscricaoId && p.inscricaoId !== filtros.inscricaoId) return false;
        if (filtros.sessaoId    && p.sessaoId    !== filtros.sessaoId)    return false;
        return true;
      });
    },

    calcularFrequencia: function(orgId, inscricaoId, totalSessoes) {
      if (!totalSessoes) return 0;
      var presentes = readJSON(_ARQ.presencas).filter(function(p) {
        return p.orgId === orgId && p.inscricaoId === inscricaoId && p.presente;
      }).length;
      return Math.round((presentes / totalSessoes) * 100);
    },

    salvar: function(orgId, presenca) {
      var agora = new Date().toISOString();
      var resultado;
      modifyJSON(_ARQ.presencas, function(lista) {
        var idx = lista.findIndex(function(p) { return p.id === presenca.id && p.orgId === orgId; });
        if (idx >= 0) {
          lista[idx] = Object.assign({}, lista[idx], presenca);
          resultado  = lista[idx];
        } else {
          resultado = Object.assign({ criadoEm: agora }, presenca);
          lista.push(resultado);
        }
        return lista;
      });
      return resultado;
    }
  };

  // ─── Pesquisas de satisfação ──────────────────────────────────────────────

  var Pesquisas = {

    listar: function(orgId, filtros) {
      filtros = filtros || {};
      return readJSON(_ARQ.pesquisas).filter(function(p) {
        if (p.orgId !== orgId) return false;
        if (filtros.acaoId && p.acaoId !== filtros.acaoId) return false;
        return true;
      });
    },

    jaRespondeu: function(orgId, inscricaoId) {
      return readJSON(_ARQ.pesquisas).some(function(p) {
        return p.orgId === orgId && p.inscricaoId === inscricaoId;
      });
    },

    salvar: function(orgId, pesquisa) {
      var agora = new Date().toISOString();
      var resultado = Object.assign({ criadoEm: agora }, pesquisa);
      modifyJSON(_ARQ.pesquisas, function(lista) {
        lista.push(resultado);
        return lista;
      });
      return resultado;
    },

    calcularNPS: function(orgId, acaoId) {
      var lista = readJSON(_ARQ.pesquisas).filter(function(p) {
        return p.orgId === orgId && (!acaoId || p.acaoId === acaoId);
      });
      if (!lista.length) return null;
      var promotores  = lista.filter(function(p) { return p.nota >= 9; }).length;
      var detratores  = lista.filter(function(p) { return p.nota <= 6; }).length;
      var total       = lista.length;
      return Math.round(((promotores - detratores) / total) * 100);
    }
  };

  // ─── Certificados ─────────────────────────────────────────────────────────

  var Certificados = {

    listar: function(orgId, filtros) {
      filtros = filtros || {};
      return readJSON(_ARQ.certificados).filter(function(c) {
        if (c.orgId !== orgId) return false;
        if (filtros.acaoId      && c.acaoId      !== filtros.acaoId)      return false;
        if (filtros.inscricaoId && c.inscricaoId !== filtros.inscricaoId) return false;
        return true;
      });
    },

    jaGerou: function(orgId, inscricaoId) {
      return readJSON(_ARQ.certificados).some(function(c) {
        return c.orgId === orgId && c.inscricaoId === inscricaoId;
      });
    },

    salvar: function(orgId, certificado) {
      var agora = new Date().toISOString();
      var resultado = Object.assign({ geradoEm: agora }, certificado);
      modifyJSON(_ARQ.certificados, function(lista) {
        lista.push(resultado);
        return lista;
      });
      return resultado;
    }
  };

  // ─── Indexadores (Sheet PUBLICO) ──────────────────────────────────────────

  function _indexarInscricao(ins) {
    try {
      var ss  = _getSheet();
      if (!ss) return;
      var aba = ss.getSheetByName('Inscricoes');
      if (!aba) return;
      var dados = [
        ins.id, ins.orgId, ins.acaoId, ins.acaoNome || '',
        ins.nome, ins.email, ins.telefone || '', ins.idade || '',
        ins.cep || '', ins.ocupacao || '', ins.comoSoube || '',
        ins.status, ins.protocolo, ins.consentimentoId || '',
        ins.criadoEm, ins.atualizadoEm,
        ins.canceladoEm || '', ins.motivoCancelamento || ''
      ];

      var ultima = aba.getLastRow();
      if (ultima > 1) {
        var ids = aba.getRange(2, 1, ultima - 1, 1).getValues().map(function(r){ return r[0]; });
        var idx = ids.indexOf(ins.id);
        if (idx >= 0) {
          aba.getRange(idx + 2, 1, 1, dados.length).setValues([dados]);
          return;
        }
      }
      aba.appendRow(dados);
    } catch(e) {
      Logger.warn('publico_repository', '_indexarInscricao', e.message);
    }
  }

  function _getSheet() {
    try {
      var id = PropertiesService.getScriptProperties().getProperty(_SHEET_KEY);
      return id ? SpreadsheetApp.openById(id) : null;
    } catch(e) { return null; }
  }

  function prepararIndice(orgId) {
    try {
      var ss = _getSheet();
      if (!ss) { Logger.warn('publico_repository','prepararIndice','Sheet PUBLICO não encontrada'); return; }
      Object.keys(_HDR).forEach(function(abaNome) {
        var nome = abaNome.charAt(0).toUpperCase() + abaNome.slice(1);
        var aba  = ss.getSheetByName(nome) || ss.insertSheet(nome);
        var hdrs = _HDR[abaNome];
        var atual = aba.getLastRow() > 0
          ? aba.getRange(1,1,1,Math.max(aba.getLastColumn(),hdrs.length)).getValues()[0]
          : [];
        if (atual.every(function(v){return !v;}) || String(atual[0]||'').trim() !== 'ID') {
          aba.getRange(1,1,1,hdrs.length).setValues([hdrs]);
          aba.setFrozenRows(1);
        }
      });
      Logger.info('publico_repository','prepararIndice','Índice PUBLICO OK');
    } catch(e) {
      Logger.error('publico_repository','prepararIndice', e.message);
    }
  }

  // ─── API pública ──────────────────────────────────────────────────────────

  return {
    Inscricoes:     Inscricoes,
    Presencas:      Presencas,
    Pesquisas:      Pesquisas,
    Certificados:   Certificados,
    prepararIndice: prepararIndice
  };

})();
