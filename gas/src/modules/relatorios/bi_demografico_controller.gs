/**
 * @file modules/relatorios/bi_demografico_controller.gs
 * @layer modules/relatorios
 * @description BI Demográfico — lado de leitura (CQRS, Skill.md §7.3).
 *              Entrega microdados ANONIMIZADOS (sem nome, email, CPF ou id)
 *              de Equipe (colaboradores) e Beneficiários (inscrições do Público),
 *              prontos para agregação/cross-filter no frontend, mais a
 *              geocodificação de bairros/cidades para o mapa de calor.
 *
 *              Visão sobre dados existentes — NÃO cria entidade, aba ou planilha.
 *              Único artefato novo: bi_geo_cache.json (cache de geocodificação
 *              no Drive, mesmo padrão de modulos_config.json).
 *
 *              Geocodificação:
 *                - CEP → bairro/cidade/uf via ViaCEP (UrlFetchApp)
 *                - bairro+cidade → lat/lng via Maps.newGeocoder()
 *                - Cache persistente; máx. _BI_GEO_MAX_NOVOS lookups por chamada
 *                  (as chaves restantes completam nas chamadas seguintes)
 *
 * @depends modules/pessoas/colaborador_repository.gs (ColaboradorRepository)
 *          modules/publico/publico_repository.gs (PublicoRepository)
 *          core/services/acesso_service.gs (AcessoService)
 *          core/config_service.gs (SistemaConfigService)
 *          shared/response.gs (GasResponse)
 *          core/data_layer.gs, core/auth_session.gs, core/config.gs
 */

var _BI_GEO_ARQUIVO   = 'bi_geo_cache.json';
var _BI_GEO_MAX_NOVOS = 30;
var _BI_PAPEIS        = ['superadmin', 'admin', 'rh', 'gestor'];

// ── Helpers privados ─────────────────────────────────────────────────

function _ctxBiDemografico() {
  var email  = getEmailSessao();
  var acesso = AcessoService.verificar(email);
  if (!acesso || acesso.status !== 'ativo') throw new Error('Acesso negado.');
  var papel = (acesso.registro && acesso.registro.papel ? acesso.registro.papel : 'colaborador').toLowerCase();
  if (_BI_PAPEIS.indexOf(papel) === -1)
    throw new Error('Apenas gestão, RH ou administração podem acessar o BI Demográfico.');
  return { email: email, papel: papel, orgId: getOrgConfig().orgId };
}

function _biGeoCacheLer() {
  var dados = lerJSON(_BI_GEO_ARQUIVO);
  // arquivo nasce como [] no data_layer; cache usa objeto chave→valor
  return (dados && !Array.isArray(dados) && typeof dados === 'object') ? dados : {};
}

function _biGeoCacheGravar(novos) {
  if (!novos || !Object.keys(novos).length) return;
  modifyJSON(_BI_GEO_ARQUIVO, function (atual) {
    var mapa = (atual && !Array.isArray(atual) && typeof atual === 'object') ? atual : {};
    Object.keys(novos).forEach(function (k) { mapa[k] = novos[k]; });
    return mapa;
  });
}

function _biNormalizar(txt) {
  return String(txt || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function _biTitleCase(txt) {
  return String(txt || '').trim().toLowerCase().replace(/(^|\s)\S/g, function (c) {
    return c.toUpperCase();
  });
}

/** Consulta ViaCEP. Retorna {bairro,cidade,uf} ou {erro:true}. */
function _biViaCep(cep) {
  var limpo = String(cep || '').replace(/\D/g, '');
  if (limpo.length !== 8) return { erro: true };
  try {
    var resp = UrlFetchApp.fetch('https://viacep.com.br/ws/' + limpo + '/json/', {
      muteHttpExceptions: true, followRedirects: true
    });
    if (resp.getResponseCode() !== 200) return { erro: true };
    var json = JSON.parse(resp.getContentText() || '{}');
    if (json.erro) return { erro: true };
    return {
      bairro: json.bairro     || '',
      cidade: json.localidade || '',
      uf:     json.uf         || ''
    };
  } catch (e) {
    Logger.warn('bi_demografico', '_biViaCep', 'CEP ' + limpo + ': ' + e.message);
    return { erro: true };
  }
}

/**
 * Geocodifica via Maps usando o endereço completo disponível.
 * info: { logradouro?, numero?, bairro, cidade, uf, cep? }
 * Retorna {lat,lng} ou {erro:true}.
 */
function _biGeocodificar(info) {
  var partes = [];
  if (info.logradouro && info.numero) partes.push(info.logradouro + ', ' + info.numero);
  else if (info.logradouro)           partes.push(info.logradouro);
  if (info.bairro) partes.push(info.bairro);
  if (info.cidade) partes.push(info.cidade);
  partes.push(info.uf || 'CE');
  if (info.cep && info.cep.length === 8)
    partes.push(info.cep.slice(0, 5) + '-' + info.cep.slice(5));
  partes.push('Brasil');
  var query = partes.filter(function (p) { return !!String(p || '').trim(); }).join(', ');
  try {
    var r = Maps.newGeocoder().setRegion('br').setLanguage('pt-BR').geocode(query);
    if (r && r.status === 'OK' && r.results && r.results.length) {
      var loc = r.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
  } catch (e) {
    Logger.warn('bi_demografico', '_biGeocodificar', query + ': ' + e.message);
  }
  return { erro: true };
}

/** Hash curto e não reversível do email — permite contar pessoas únicas sem expor identidade. */
function _biHashPessoa(email) {
  var norm = String(email || '').toLowerCase().trim();
  if (!norm) return '';
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, norm, Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < 5; i++) {
    var b = (bytes[i] + 256) % 256;
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hex;
}

function _biIdade(dataNascimento) {
  var iso = String(dataNascimento || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  var p = iso.split('-');
  var nasc = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  var hoje = new Date();
  var idade = hoje.getFullYear() - nasc.getFullYear();
  var m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return (idade >= 0 && idade < 120) ? idade : null;
}

/**
 * Resolve lat/lng para um conjunto de locais {chave: {bairro,cidade,uf}}.
 * Usa/alimenta o cache persistente. Retorna { geo: {chave:{lat,lng}}, pendentes: n }.
 */
function _biResolverGeo(locais) {
  var cache     = _biGeoCacheLer();
  var novos     = {};
  var geo       = {};
  var pendentes = 0;
  var consultas = 0;

  Object.keys(locais).forEach(function (chave) {
    var cacheKey = 'geo:' + chave;
    var hit = cache[cacheKey] || novos[cacheKey];
    if (!hit) {
      if (consultas >= _BI_GEO_MAX_NOVOS) { pendentes++; return; }
      consultas++;
      var l = locais[chave];
      hit = _biGeocodificar(l);
      hit.em = new Date().toISOString();
      novos[cacheKey] = hit;
    }
    if (hit && !hit.erro) geo[chave] = { lat: hit.lat, lng: hit.lng };
  });

  _biGeoCacheGravar(novos);
  return { geo: geo, pendentes: pendentes };
}

// ── Controllers (somente leitura) ────────────────────────────────────

/**
 * Microdados anonimizados da Equipe (colaboradores, inclusive desligados —
 * o recorte por período/status é feito no frontend).
 */
function ctrl_bi_demografico_equipe() {
  return GasResponse.wrap(function () {
    var ctx    = _ctxBiDemografico();
    var todos  = ColaboradorRepository.listar(ctx.orgId, {});

    // Mapa idColaborador → data de desligamento (vem do histórico oficial)
    var desligamentos = {};
    ColaboradorRepository.listarHistorico({ orgId: ctx.orgId, tipo: 'desligamento' })
      .forEach(function (h) {
        if (h.idColaborador && !desligamentos[h.idColaborador])
          desligamentos[h.idColaborador] = String(h.dataDesligamento || h.criadoEm || '').slice(0, 10);
      });

    // Extrai apenas os campos BI-relevantes de um array SCD (remove dados sensíveis extras)
    function _slimHistorico(arr, campos) {
      if (!Array.isArray(arr)) return [];
      return arr.map(function(e) {
        var out = { dataInicio: String(e.dataInicio || '').slice(0, 10), dataFim: e.dataFim ? String(e.dataFim).slice(0, 10) : null };
        campos.forEach(function(c) { if (e[c] !== undefined) out[c] = e[c]; });
        return out;
      });
    }

    // Histórico de cargo por colaborador — permite reconstruir cargo em qualquer período
    var todosEventos = ColaboradorRepository.listarHistorico({ orgId: ctx.orgId });
    var eventosCargoMap = {};
    todosEventos.forEach(function (ev) {
      if ((ev.tipo === 'promocao' || ev.tipo === 'mudanca_cargo') && ev.novoCargo && ev.cargoAnterior) {
        if (!eventosCargoMap[ev.idColaborador]) eventosCargoMap[ev.idColaborador] = [];
        eventosCargoMap[ev.idColaborador].push({
          data:          String(ev.criadoEm || ev.data || '').slice(0, 10),
          cargoNovo:     ev.novoCargo,
          cargoAnterior: ev.cargoAnterior
        });
      }
    });
    // Ordena cada lista DESC (mais recente primeiro) — facilita rollback no frontend
    Object.keys(eventosCargoMap).forEach(function (id) {
      eventosCargoMap[id].sort(function (a, b) { return b.data.localeCompare(a.data); });
    });

    var locais    = {};
    var registros = todos.map(function (c) {
      var end        = c.endereco || {};
      var bairro     = _biTitleCase(end.bairro);
      var cidade     = _biTitleCase(end.cidade);
      var uf         = String(end.uf || '').toUpperCase();
      var logradouro = _biTitleCase(end.logradouro);
      var numero     = String(end.numero || '').trim();
      var cep        = String(end.cep || '').replace(/\D/g, '');

      // Chave de bairro — sempre registrada; usada pela view de bairros
      var bairroKey = '';
      if (bairro && cidade) {
        bairroKey = _biNormalizar(bairro) + '|' + _biNormalizar(cidade);
        locais[bairroKey] = { bairro: bairro, cidade: cidade, uf: uf };
      }
      var cidKey = '';
      if (cidade) {
        cidKey = '|' + _biNormalizar(cidade);
        locais[cidKey] = { bairro: '', cidade: cidade, uf: uf };
      }
      // Chave precisa — usa endereço completo quando disponível para melhor geocodificação
      var geoKey = '';
      if (cep.length === 8 && logradouro) {
        geoKey = 'end:' + cep + ':' + _biNormalizar(logradouro);
        locais[geoKey] = { logradouro: logradouro, numero: numero, bairro: bairro, cidade: cidade, uf: uf, cep: cep };
      } else if (cep.length === 8 && bairro) {
        geoKey = 'cep:' + cep;
        locais[geoKey] = { bairro: bairro, cidade: cidade, uf: uf, cep: cep };
      } else {
        geoKey = bairroKey;
      }
      // nomeDisplay: primeiro nome + inicial do sobrenome — identificação leve para planejamento de eventos
      var nomePartes = String(c.nome || '').trim().split(/\s+/);
      var nomeDisplay = nomePartes.length > 1
        ? nomePartes[0] + ' ' + nomePartes[nomePartes.length - 1].charAt(0) + '.'
        : nomePartes[0] || '';

      // PcD e Família — preferir entrada vigente no histórico SCD; fallback campos planos (legado)
      var _vigPcd = (function() { var h = c.pcdHistorico; if (!Array.isArray(h)) return null; for (var _i = h.length - 1; _i >= 0; _i--) { if (!h[_i].dataFim) return h[_i]; } return null; })();
      var _vigPm  = (function() { var h = c.paiMaeHistorico; if (!Array.isArray(h)) return null; for (var _i = h.length - 1; _i >= 0; _i--) { if (!h[_i].dataFim) return h[_i]; } return null; })();

      return {
        setor:                 c.setor       || '',
        cargo:                 c.cargo       || '',
        tipoVinculo:           c.tipoVinculo || '',
        status:                c.status      || 'ativo',
        genero:                c.genero      || '',
        sexualidade:           c.sexualidade || '',
        racaCor:               c.racaCor || c.raca || '',
        pronomes:              c.pronomes    || '',
        idade:                 _biIdade(c.dataNascimento),
        bairro:                bairro,
        cidade:                cidade,
        uf:                    uf,
        geoKey:                geoKey,
        bairroKey:             bairroKey,
        cidadeKey:             cidKey,
        horasSemanais:         c.horasSemanais || null,
        dataAdmissao:          String(c.dataAdmissao || '').slice(0, 10),
        dataDesligamento:      desligamentos[c.id] || '',
        // campos operacionais (eventos / inclusão)
        nomeDisplay:           nomeDisplay,
        restricoesAlimentares: Array.isArray(c.restricoesAlimentares) ? c.restricoesAlimentares : [],
        restricoesOutro:       c.restricoesOutro || '',
        pcd:                   (_vigPcd || c).pcd || '',
        pcdTipos:              Array.isArray((_vigPcd || c).pcdTipos) ? (_vigPcd || c).pcdTipos : [],
        ePaiMae:               (_vigPm  || c).ePaiMae || '',
        numFilhos:             (_vigPm  || c).numFilhos != null ? (_vigPm  || c).numFilhos : null,
        // histórico de cargo para reconstrução temporal no frontend
        eventosCargo:          eventosCargoMap[c.id] || [],
        // arrays SCD para reconstrução demográfica por período no frontend
        generoHistorico:       _slimHistorico(c.generoHistorico,      ['genero', 'pronomes']),
        racaCorHistorico:      _slimHistorico(c.racaCorHistorico,      ['racaCor']),
        sexualidadeHistorico:  _slimHistorico(c.sexualidadeHistorico,  ['sexualidade']),
        pcdHistorico:          _slimHistorico(c.pcdHistorico,          ['pcd', 'pcdTipos']),
        paiMaeHistorico:       _slimHistorico(c.paiMaeHistorico,       ['ePaiMae', 'numFilhos'])
      };
    });

    var setores = [];
    try { setores = SistemaConfigService.getSetores(); } catch (_) {}

    var resGeo = _biResolverGeo(locais);
    return {
      registros:    registros,
      geo:          resGeo.geo,
      geoPendentes: resGeo.pendentes,
      setores:      setores,
      geradoEm:     new Date().toISOString()
    };
  }, 'ctrl_bi_demografico_equipe');
}

/**
 * Microdados anonimizados dos Beneficiários (inscrições do módulo Público).
 * Bairro/cidade derivados do CEP via ViaCEP (com cache persistente).
 */
function ctrl_bi_demografico_beneficiarios() {
  return GasResponse.wrap(function () {
    var ctx        = _ctxBiDemografico();
    var inscricoes = PublicoRepository.Inscricoes.listar(ctx.orgId, {});
    var cache        = _biGeoCacheLer();
    var novosCep     = {};
    var consultas    = 0;
    var cepPendentes = 0;

    var locais    = {};
    var registros = inscricoes.map(function (i) {
      var cepLimpo = String(i.cep || '').replace(/\D/g, '');
      var endCep   = null;
      if (cepLimpo.length === 8) {
        var cacheKey = 'cep:' + cepLimpo;
        endCep = cache[cacheKey] || novosCep[cacheKey];
        if (!endCep) {
          if (consultas < _BI_GEO_MAX_NOVOS) {
            consultas++;
            endCep = _biViaCep(cepLimpo);
            endCep.em = new Date().toISOString();
            novosCep[cacheKey] = endCep;
          } else {
            cepPendentes++;
          }
        }
      }
      var bairro = (endCep && !endCep.erro) ? _biTitleCase(endCep.bairro) : '';
      var cidade = (endCep && !endCep.erro) ? _biTitleCase(endCep.cidade) : '';
      var uf     = (endCep && !endCep.erro) ? endCep.uf : '';
      var geoKey = '';
      var bairroKey = '';
      if (bairro && cidade) {
        geoKey = _biNormalizar(bairro) + '|' + _biNormalizar(cidade);
        bairroKey = geoKey;
        locais[geoKey] = { bairro: bairro, cidade: cidade, uf: uf };
      }
      var cidKey = '';
      if (cidade) {
        cidKey = '|' + _biNormalizar(cidade);
        locais[cidKey] = { bairro: '', cidade: cidade, uf: uf };
      }
      var idade = (i.idade !== null && i.idade !== '' && !isNaN(Number(i.idade)))
        ? Math.max(0, Math.min(119, Math.round(Number(i.idade)))) : null;
      return {
        pessoa:    _biHashPessoa(i.email),
        acaoId:    i.acaoId   || '',
        acaoNome:  i.acaoNome || '',
        status:    i.status   || '',
        idade:     idade,
        ocupacao:  _biTitleCase(i.ocupacao),
        comoSoube: i.comoSoube || '',
        bairro:    bairro,
        cidade:    cidade,
        uf:        uf,
        geoKey:    geoKey,
        bairroKey: bairroKey,
        cidadeKey: cidKey,
        criadoEm:  String(i.criadoEm || '').slice(0, 10)
      };
    });

    _biGeoCacheGravar(novosCep);

    var resGeo = _biResolverGeo(locais);
    return {
      registros:    registros,
      geo:          resGeo.geo,
      geoPendentes: resGeo.pendentes + cepPendentes,
      geradoEm:     new Date().toISOString()
    };
  }, 'ctrl_bi_demografico_beneficiarios');
}
