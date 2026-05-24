/**
 * @file engines/exportacao_engine.gs
 * @layer engines
 * @description Engine de exportação institucional — CODIP, SALIC, SNIIC, ZIP de acervo.
 *
 * Centraliza toda exportação para órgãos externos, evitando que cada módulo
 * implemente seu próprio export com formatos divergentes.
 *
 * Formatos suportados:
 *   CODIP  — Secult/CE: JSON/CSV com 28 campos por evento (mensal)
 *   SALIC  — MinC: prestação de contas Lei Rouanet (por projeto)
 *   SNIIC  — MinC: indicadores nacionais de produção cultural (anual)
 *   ZIP    — compila evidências de uma Ação (fotos, atas, contratos)
 *
 * Controladores de exportação (autenticados, admin+):
 *   ctrl_exportacao_codip    — gera payload CODIP do mês
 *   ctrl_exportacao_salic    — gera XML SALIC por projeto/contrato
 *   ctrl_exportacao_sniic    — gera indicadores anuais SNIIC
 *   ctrl_exportacao_csv      — exporta qualquer coleção como CSV
 *
 * @depends acao_repository.gs, publico_engine.gs, publico_repository.gs,
 *          reserva_engine.gs, shared/response.gs,
 *          core/services/acesso_service.gs, core/utils.gs
 */

var ExportacaoEngine = (function () {

  // ─── CODIP (Secult/CE) ─────────────────────────────────────────────────────

  /**
   * Gera payload CODIP com os 28 campos por evento para um mês/ano.
   * Formato: array de objetos prontos para JSON ou CSV.
   *
   * Campos CODIP mapeados:
   * 01 municipio           09 tipo_espaco       17 publico_presente
   * 02 nome_equipamento    10 capacidade         18 publico_crianca (0-12)
   * 03 id_acao             11 tipo_atividade     19 publico_adolesc (13-17)
   * 04 nome_acao           12 linguagem_cultural 20 publico_jovem   (18-29)
   * 05 data_inicio         13 publico_alvo       21 publico_adulto  (30-59)
   * 06 data_fim            14 entrada_gratuita   22 publico_idoso   (60+)
   * 07 horario_inicio      15 valor_ingresso     23 publico_pcd
   * 08 espaco_nome         16 financiamento      24 setor_responsavel
   *                                              25 responsavel
   *                                              26 contato_email
   *                                              27 contato_tel
   *                                              28 observacoes
   *
   * @param {string} orgId
   * @param {number} mes — 1-12
   * @param {number} ano — ex: 2024
   */
  function gerarCODIP(orgId, mes, ano) {
    var org    = getOrgConfig();
    var acoes  = AcaoRepository.listar(orgId, { visibilidadePublica: true })
      .filter(function(a) {
        if (a.status === 'rascunho' || a.status === 'cancelada') return false;
        var d = new Date(a.dataInicio || a.criadoEm);
        return (!mes || d.getMonth() + 1 === mes) && (!ano || d.getFullYear() === ano);
      });

    var dadosPublico = PublicoEngine.obterDadosCODIP(orgId, mes, ano);
    var publicoPorAcao = {};
    dadosPublico.forEach(function(d) { publicoPorAcao[d.acaoId] = d; });

    return acoes.map(function(a) {
      var pub    = publicoPorAcao[a.id] || { total: 0, faixas: {} };
      var faixas = pub.faixas || {};

      return {
        municipio:          org.municipio           || 'Fortaleza',
        nome_equipamento:   org.nome                || org.titulo || '',
        id_acao:            a.id,
        nome_acao:          a.nome,
        data_inicio:        _fmtData(a.dataInicio),
        data_fim:           _fmtData(a.dataFim || a.dataInicio),
        horario_inicio:     a.horarioInicio || '',
        espaco_nome:        a.espacoNome    || a.espacoId || '',
        tipo_espaco:        a.tipoEspaco    || '',
        capacidade:         a.publicoPrevisto || 0,
        tipo_atividade:     a.tipo             || '',
        linguagem_cultural: a.linguagem        || a.tipo || '',
        publico_alvo:       a.publicoAlvo      || 'Geral',
        entrada_gratuita:   (a.entradaGratuita !== false) ? 'S' : 'N',
        valor_ingresso:     a.valorIngresso     || 0,
        financiamento:      a.fonteFinanciamento || 'Recursos Próprios',
        publico_presente:   pub.total,
        publico_crianca:    faixas['crianca']      || 0,
        publico_adolesc:    faixas['adolescente']  || 0,
        publico_jovem:      faixas['jovem']        || 0,
        publico_adulto:     faixas['adulto']       || 0,
        publico_idoso:      faixas['idoso']        || 0,
        publico_pcd:        faixas['pcd']          || 0,
        setor_responsavel:  a.setor                || '',
        responsavel:        a.responsavel          || '',
        contato_email:      org.email              || '',
        contato_tel:        org.telefone            || '',
        observacoes:        a.observacoes           || ''
      };
    });
  }

  /**
   * Serializa payload CODIP como CSV com separador ponto-e-vírgula.
   * Inclui BOM UTF-8 para compatibilidade com Excel.
   *
   * @param {Array} payload — resultado de gerarCODIP()
   * @returns {string} CSV com BOM
   */
  function codipParaCSV(payload) {
    if (!payload || !payload.length) return '﻿';
    var cabecalho = Object.keys(payload[0]).join(';');
    var linhas = payload.map(function(row) {
      return Object.values(row).map(function(v) {
        var s = String(v == null ? '' : v);
        return s.indexOf(';') >= 0 || s.indexOf('"') >= 0
          ? '"' + s.replace(/"/g, '""') + '"'
          : s;
      }).join(';');
    });
    return '﻿' + cabecalho + '\n' + linhas.join('\n');
  }

  // ─── SALIC (MinC / Lei Rouanet) ────────────────────────────────────────────

  /**
   * Gera representação XML simplificado de prestação de contas SALIC.
   * Formato baseado no padrão de importação do portal SALIC-BR.
   *
   * @param {string} orgId
   * @param {string} projetoId — ID do contrato/solicitação Lei Rouanet
   * @returns {string} XML como string
   */
  function gerarSALIC(orgId, projetoId) {
    var org = getOrgConfig();

    // Buscar dados do projeto (contrato/solicitação de contratação)
    var projeto = null;
    try {
      projeto = SolicitacaoEngine.buscarPorId ? SolicitacaoEngine.buscarPorId(projetoId) : null;
    } catch(_) {}

    var nomeOrg   = org.nome || org.titulo || '';
    var cnpj      = org.cnpj || '';
    var agora     = _fmtData(new Date().toISOString());

    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<PrestacaoContas xmlns="http://www.cultura.gov.br/salic/v1" versao="1.0">\n';
    xml += '  <Proponente>\n';
    xml += '    <CNPJ>' + _esc(cnpj) + '</CNPJ>\n';
    xml += '    <Nome>' + _esc(nomeOrg) + '</Nome>\n';
    xml += '    <Municipio>' + _esc(org.municipio || 'Fortaleza') + '</Municipio>\n';
    xml += '    <UF>' + _esc(org.uf || 'CE') + '</UF>\n';
    xml += '  </Proponente>\n';

    if (projeto) {
      xml += '  <Projeto>\n';
      xml += '    <NumeroPronac>' + _esc(projeto.pronac || projetoId) + '</NumeroPronac>\n';
      xml += '    <NomeProjeto>' + _esc(projeto.nome || projetoId) + '</NomeProjeto>\n';
      xml += '    <ValorAprovado>' + (projeto.valorAprovado || 0) + '</ValorAprovado>\n';
      xml += '    <ValorExecutado>' + (projeto.valorExecutado || 0) + '</ValorExecutado>\n';
      xml += '  </Projeto>\n';
    }

    xml += '  <DataGeracao>' + agora + '</DataGeracao>\n';
    xml += '</PrestacaoContas>';
    return xml;
  }

  // ─── SNIIC (MinC — indicadores anuais) ────────────────────────────────────

  /**
   * Gera indicadores anuais SNIIC (Sistema Nacional de Informações e Indicadores Culturais).
   *
   * @param {string} orgId
   * @param {number} ano — ex: 2024
   * @returns {Object} indicadores
   */
  function gerarSNIIC(orgId, ano) {
    var org    = getOrgConfig();
    var acoes  = AcaoRepository.listar(orgId, {}).filter(function(a) {
      var d = new Date(a.dataInicio || a.criadoEm);
      return (!ano || d.getFullYear() === ano) && a.status !== 'cancelada';
    });

    var metricas  = PublicoEngine.obterMetricas(orgId);
    var porTipo   = {};
    acoes.forEach(function(a) {
      var tipo = a.tipo || 'outros';
      if (!porTipo[tipo]) porTipo[tipo] = 0;
      porTipo[tipo]++;
    });

    return {
      ano:              ano || new Date().getFullYear(),
      municipio:        org.municipio || 'Fortaleza',
      uf:               org.uf || 'CE',
      nome_equipamento: org.nome || org.titulo || '',
      total_acoes:      acoes.length,
      total_publico:    metricas.totalInscricoes,
      acoes_por_tipo:   porTipo,
      nps_medio:        metricas.nps
    };
  }

  // ─── CSV genérico ──────────────────────────────────────────────────────────

  /**
   * Exporta qualquer array de objetos como CSV UTF-8.
   *
   * @param {Array}  lista     — array de objetos com as mesmas chaves
   * @param {Array}  [colunas] — subset de colunas a incluir (default: todas)
   * @returns {string} CSV com BOM UTF-8
   */
  function gerarCSV(lista, colunas) {
    if (!lista || !lista.length) return '﻿';
    var cols = colunas || Object.keys(lista[0]);
    var cabecalho = cols.join(';');
    var linhas = lista.map(function(row) {
      return cols.map(function(c) {
        var v = row[c];
        var s = String(v == null ? '' : v);
        return s.indexOf(';') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0
          ? '"' + s.replace(/"/g, '""') + '"'
          : s;
      }).join(';');
    });
    return '﻿' + cabecalho + '\n' + linhas.join('\n');
  }

  // ─── Privados ──────────────────────────────────────────────────────────────

  function _fmtData(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      return Utilities.formatDate(d, getOrgConfig().timezone || 'America/Fortaleza', 'dd/MM/yyyy');
    } catch(_) { return String(iso).slice(0, 10); }
  }

  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── API pública ──────────────────────────────────────────────────────────

  return {
    gerarCODIP:   gerarCODIP,
    codipParaCSV: codipParaCSV,
    gerarSALIC:   gerarSALIC,
    gerarSNIIC:   gerarSNIIC,
    gerarCSV:     gerarCSV
  };

})();

// ─── Controllers de exportação (autenticados, admin+) ─────────────────────────

/**
 * Gera dados CODIP do mês/ano em formato JSON + CSV.
 * @param {Object} params — { mes, ano }
 */
function ctrl_exportacao_codip(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['admin', 'superadmin']);

    var mes  = params.mes  ? parseInt(params.mes)  : (new Date().getMonth() + 1);
    var ano  = params.ano  ? parseInt(params.ano)  : new Date().getFullYear();

    var payload = ExportacaoEngine.gerarCODIP(orgId, mes, ano);
    var csv     = ExportacaoEngine.codipParaCSV(payload);
    return { payload: payload, csv: csv, total: payload.length, mes: mes, ano: ano };
  }, 'ctrl_exportacao_codip');
}

/**
 * Gera XML SALIC de um projeto.
 * @param {Object} params — { projetoId }
 */
function ctrl_exportacao_salic(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    if (!params.projetoId) throw new Error('projetoId obrigatório.');
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['admin', 'superadmin']);
    var xml = ExportacaoEngine.gerarSALIC(orgId, params.projetoId);
    return { xml: xml };
  }, 'ctrl_exportacao_salic');
}

/**
 * Gera indicadores SNIIC anuais.
 * @param {Object} params — { ano }
 */
function ctrl_exportacao_sniic(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['admin', 'superadmin']);
    var ano = params.ano ? parseInt(params.ano) : new Date().getFullYear();
    return ExportacaoEngine.gerarSNIIC(orgId, ano);
  }, 'ctrl_exportacao_sniic');
}

/**
 * Exporta inscrições de uma Ação como CSV.
 * @param {Object} params — { acaoId }
 */
function ctrl_exportacao_inscricoes_csv(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['coordenador','gestor','admin','superadmin']);
    var lista = PublicoRepository.Inscricoes.listar(orgId, { acaoId: params.acaoId });
    var colunas = ['id','nome','email','telefone','status','criadoEm'];
    return { csv: ExportacaoEngine.gerarCSV(lista, colunas), total: lista.length };
  }, 'ctrl_exportacao_inscricoes_csv');
}
