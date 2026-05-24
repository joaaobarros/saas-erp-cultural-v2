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
   * Gera XML de prestação de contas SALIC completo a partir de um contrato.
   * Inclui Proponente, Projeto, Plano de Aplicação (metas→atividades→rubricas),
   * Pessoal da Equipe e Resumo financeiro.
   *
   * @param {string} orgId
   * @param {string} contratoId — ID do contrato (aceita também projetoId como alias)
   * @returns {string} XML como string
   */
  function gerarSALIC(orgId, contratoId) {
    var org = getOrgConfig();
    orgId   = orgId || org.orgId;

    // Carregar contrato completo
    var contrato = null;
    try {
      var resp = ContratoRepository.obter(orgId, contratoId);
      contrato = resp && resp.id ? resp : null;
    } catch(_) {}

    var nomeOrg = org.nome || org.titulo || '';
    var cnpj    = org.cnpj || '';
    var agora_  = _fmtData(new Date().toISOString());

    var x = '<?xml version="1.0" encoding="UTF-8"?>\n';
    x += '<PrestacaoContas xmlns="http://www.cultura.gov.br/salic/v1" versao="1.0">\n\n';

    // ── Proponente ──────────────────────────────────────────────────────────
    x += '  <Proponente>\n';
    x += '    <CNPJ>'       + _esc(cnpj)                          + '</CNPJ>\n';
    x += '    <Nome>'       + _esc(nomeOrg)                       + '</Nome>\n';
    x += '    <Municipio>'  + _esc(org.municipio || 'Fortaleza')  + '</Municipio>\n';
    x += '    <UF>'         + _esc(org.uf || 'CE')                + '</UF>\n';
    x += '    <Email>'      + _esc(org.email || '')               + '</Email>\n';
    x += '    <Telefone>'   + _esc(org.telefone || '')            + '</Telefone>\n';
    x += '  </Proponente>\n\n';

    // ── Projeto ─────────────────────────────────────────────────────────────
    if (contrato) {
      x += '  <Projeto>\n';
      x += '    <NumeroPronac>'   + _esc(contrato.pronac || contratoId)          + '</NumeroPronac>\n';
      x += '    <NumeroContrato>' + _esc(contrato.numero || '')                  + '</NumeroContrato>\n';
      x += '    <NomeProjeto>'    + _esc(contrato.nome || '')                    + '</NomeProjeto>\n';
      x += '    <Objeto>'         + _esc(contrato.objeto || contrato.descricao || '') + '</Objeto>\n';
      x += '    <Modalidade>'     + _esc(contrato.modalidade || 'lei_rouanet')   + '</Modalidade>\n';
      x += '    <VigenciaInicio>' + _esc(contrato.vigenciaInicio || '')          + '</VigenciaInicio>\n';
      x += '    <VigenciaFim>'    + _esc(contrato.vigenciaFim || '')             + '</VigenciaFim>\n';
      x += '    <ValorAprovado>'  + _num(contrato.valorTotal)                    + '</ValorAprovado>\n';
      x += '    <Contrapartida>'  + _num(contrato.contrapartida)                 + '</Contrapartida>\n';
      x += '    <OrgaoFinanciador>' + _esc(contrato.orgaoFinanciador || '')      + '</OrgaoFinanciador>\n';
      x += '  </Projeto>\n\n';

      // ── Plano de Aplicação (metas → atividades → rubricas) ────────────────
      var metas = contrato.metas || [];
      if (metas.length) {
        x += '  <PlanoAplicacao>\n';
        metas.forEach(function(meta, mi) {
          x += '    <Meta numero="' + _esc(meta.numero || (mi + 1)) + '">\n';
          x += '      <Titulo>'     + _esc(meta.titulo || '')    + '</Titulo>\n';
          x += '      <TipoMeta>'   + _esc(meta.tipoMeta || '')  + '</TipoMeta>\n';
          x += '      <Eixo>'       + _esc(meta.eixo || '')      + '</Eixo>\n';

          var atividades = meta.atividades || [];
          atividades.forEach(function(atv, ai) {
            x += '      <Atividade numero="' + _esc(atv.numero || (ai + 1)) + '">\n';
            x += '        <Descricao>'  + _esc(atv.descricao || '')  + '</Descricao>\n';
            x += '        <Resultado>'  + _esc(atv.resultado || '')   + '</Resultado>\n';
            x += '        <Produto>'    + _esc(atv.produto || '')     + '</Produto>\n';
            x += '        <QtdPrevista>'+ _num(atv.qtdPrevistaProduto)+ '</QtdPrevista>\n';

            var rubricas = atv.rubricas || [];
            rubricas.forEach(function(rub) {
              x += '        <ItemDespesa>\n';
              x += '          <CodigoSeplag>'   + _esc(rub.codigoSeplag || '')  + '</CodigoSeplag>\n';
              x += '          <ItemAnexoIX>'    + _esc(rub.itemAnexoIX || '')   + '</ItemAnexoIX>\n';
              x += '          <Descricao>'      + _esc(rub.nome || '')          + '</Descricao>\n';
              x += '          <Categoria>'      + _esc(rub.categoria || '')     + '</Categoria>\n';
              x += '          <QtdMeses>'       + _num(rub.qtdMeses)            + '</QtdMeses>\n';
              x += '          <CustoMensal>'    + _num(rub.custoMensal)         + '</CustoMensal>\n';
              x += '          <ValorTotal>'     + _num(rub.valorTotal)          + '</ValorTotal>\n';

              var mem = rub.memoriaCalculo || [];
              if (mem.length) {
                x += '          <MemoriaCalculo>\n';
                mem.forEach(function(m) {
                  x += '            <Linha>\n';
                  x += '              <Descricao>'    + _esc(m.descricao || '')    + '</Descricao>\n';
                  x += '              <Qtd>'          + _num(m.qtd)                + '</Qtd>\n';
                  x += '              <Metrica>'      + _esc(m.metrica || '')      + '</Metrica>\n';
                  x += '              <ValorUnitario>'+ _num(m.valorUnitario || m.valor) + '</ValorUnitario>\n';
                  x += '              <Subtotal>'     + _num(m.subtotal)           + '</Subtotal>\n';
                  x += '            </Linha>\n';
                });
                x += '          </MemoriaCalculo>\n';
              }
              x += '        </ItemDespesa>\n';
            });
            x += '      </Atividade>\n';
          });
          x += '    </Meta>\n';
        });
        x += '  </PlanoAplicacao>\n\n';
      }

      // ── Pessoal da Equipe ─────────────────────────────────────────────────
      var todosPessoal = [];
      metas.forEach(function(m) { (m.pessoal || []).forEach(function(p) { todosPessoal.push(p); }); });
      if (todosPessoal.length) {
        x += '  <PessoalEquipe>\n';
        todosPessoal.forEach(function(p) {
          x += '    <Pessoa>\n';
          x += '      <Cargo>'         + _esc(p.cargo || '')          + '</Cargo>\n';
          x += '      <Nome>'          + _esc(p.nome || '')           + '</Nome>\n';
          x += '      <Enquadramento>' + _esc(p.enquadramento || '')  + '</Enquadramento>\n';
          x += '      <VinculoFunc>'   + _esc(p.vincFunc || '')       + '</VinculoFunc>\n';
          x += '      <Quantidade>'    + _num(p.qtd || 1)             + '</Quantidade>\n';
          x += '      <QtdMeses>'      + _num(p.qtdMeses)             + '</QtdMeses>\n';
          x += '      <SalarioMensal>' + _num(p.salarioAtual)         + '</SalarioMensal>\n';
          x += '      <CustoMensal>'   + _num(p.custoMensal)          + '</CustoMensal>\n';
          x += '      <CustoTotal>'    + _num(p.custoTotal)           + '</CustoTotal>\n';
          x += '    </Pessoa>\n';
        });
        x += '  </PessoalEquipe>\n\n';
      }

      // ── Resumo financeiro ────────────────────────────────────────────────
      var totPessoal = 0, totCusteio = 0, totInvest = 0;
      metas.forEach(function(m) {
        totPessoal += Number(m.pessoalTotal || 0);
        totCusteio += Number(m.custeioTotal || 0);
        totInvest  += Number(m.investimentoTotal || 0);
      });
      x += '  <Resumo>\n';
      x += '    <TotalPessoal>'     + _num(totPessoal)                        + '</TotalPessoal>\n';
      x += '    <TotalCusteio>'     + _num(totCusteio)                        + '</TotalCusteio>\n';
      x += '    <TotalInvestimento>'+ _num(totInvest)                         + '</TotalInvestimento>\n';
      x += '    <TotalGeral>'       + _num(totPessoal + totCusteio + totInvest) + '</TotalGeral>\n';
      x += '    <Contrapartida>'    + _num(contrato.contrapartida)             + '</Contrapartida>\n';
      x += '  </Resumo>\n\n';

    } else {
      // Contrato não encontrado — gerar envelope mínimo
      x += '  <!-- AVISO: contrato ' + _esc(contratoId) + ' nao encontrado -->\n';
    }

    x += '  <DataGeracao>' + agora_ + '</DataGeracao>\n';
    x += '</PrestacaoContas>';
    return x;
  }

  function _num(v) { return String(parseFloat(v) || 0); }

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

  // ─── PNAB (Política Nacional Aldir Blanc — Lei 14.399/2022) ─────────────────

  /**
   * Gera os 4 CSVs de prestação de contas PNAB para um ano de referência.
   *
   * Retorna:
   *   { espacos, agentes, acoes, financeiro }  — cada um é um CSV com BOM UTF-8
   *
   * Fontes de dados:
   *   Espaços       → ReservaRepository (espaços com atividade no ano)
   *   Agentes       → AgenteCulturalRepository
   *   Ações         → AcaoRepository + PublicoEngine (público por ação)
   *   Financeiro    → ContratoRepository (valorTotal, contrapartida, execução)
   *
   * @param {string} orgId
   * @param {number} ano — ex: 2025
   * @returns {{ espacos:string, agentes:string, acoes:string, financeiro:string, meta:Object }}
   */
  function gerarPNAB(orgId, ano) {
    var org = getOrgConfig();
    orgId   = orgId || org.orgId;
    ano     = ano   || new Date().getFullYear();
    var anoN = Number(ano);

    function _dentroDoPeriodo(iso) {
      if (!iso) return false;
      try { return new Date(iso).getFullYear() === anoN; } catch(_) { return false; }
    }

    // ── 1. Espaços Artístico-Culturais ─────────────────────────────────────
    var listaEspacos = [];
    try {
      var reservas = ReservaRepository.listar(orgId, {});
      var espacosVistos = {};
      reservas.forEach(function(r) {
        if (!_dentroDoPeriodo(r.dataInicio || r.criadoEm)) return;
        var key = r.espacoId || r.espacoNome || '';
        if (key && !espacosVistos[key]) {
          espacosVistos[key] = true;
          listaEspacos.push({
            nome_espaco:  r.espacoNome || r.espacoId || '',
            tipo_espaco:  r.tipoEspaco || '',
            municipio:    org.municipio || '',
            uf:           org.uf || '',
            capacidade:   r.capacidade || '',
            total_eventos: 1
          });
        } else if (key && espacosVistos[key]) {
          var e = listaEspacos.filter(function(e2){ return e2.nome_espaco === (r.espacoNome||r.espacoId); })[0];
          if (e) e.total_eventos++;
        }
      });
    } catch(_) {}

    // ── 2. Agentes Culturais ────────────────────────────────────────────────
    var listaAgentes = [];
    try {
      AgenteCulturalRepository.listar(orgId, {}).forEach(function(a) {
        listaAgentes.push({
          nome:              a.nome || '',
          nome_artistico:    a.nomeArtistico || '',
          tipo:              a.tipo === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física',
          cpf_cnpj:          a.cpfCnpj || '',
          email:             a.email || '',
          areas_artisticas:  (a.areasArtisticas || []).join(', '),
          linguagens:        (a.linguagens || []).join(', '),
          municipio:         org.municipio || '',
          uf:                org.uf || '',
          status:            a.status || ''
        });
      });
    } catch(_) {}

    // ── 3. Ações Culturais Realizadas ───────────────────────────────────────
    var listaAcoes = [];
    try {
      var publicoPorAcao = {};
      try {
        var dadosCODIP = PublicoEngine.obterDadosCODIP(orgId, null, anoN);
        dadosCODIP.forEach(function(d) { publicoPorAcao[d.acaoId] = d.total || 0; });
      } catch(_) {}

      AcaoRepository.listar(orgId, {}).filter(function(a) {
        return _dentroDoPeriodo(a.dataInicio || a.criadoEm) && a.status !== 'cancelada';
      }).forEach(function(a) {
        listaAcoes.push({
          nome_acao:          a.nome || '',
          tipo_atividade:     a.tipo || '',
          linguagem:          a.linguagem || '',
          data_inicio:        _fmtData(a.dataInicio),
          data_fim:           _fmtData(a.dataFim || a.dataInicio),
          espaco:             a.espacoNome || '',
          publico_previsto:   a.publicoPrevisto || 0,
          publico_realizado:  publicoPorAcao[a.id] || 0,
          entrada_gratuita:   (a.entradaGratuita !== false) ? 'S' : 'N',
          setor:              a.setor || '',
          responsavel:        a.responsavel || '',
          fonte_financiamento: a.fonteFinanciamento || '',
          status:             a.status || ''
        });
      });
    } catch(_) {}

    // ── 4. Execução Financeira ───────────────────────────────────────────────
    var listaFinanceiro = [];
    try {
      ContratoRepository.listar(orgId, {}).filter(function(c) {
        var ini = c.vigenciaInicio || ''; var fim = c.vigenciaFim || '';
        return (!ini || new Date(ini).getFullYear() <= anoN) &&
               (!fim || new Date(fim).getFullYear() >= anoN);
      }).forEach(function(c) {
        listaFinanceiro.push({
          contrato:           c.nome || '',
          numero:             c.numero || '',
          modalidade:         c.modalidade || '',
          orgao_financiador:  c.orgaoFinanciador || '',
          vigencia_inicio:    _fmtData(c.vigenciaInicio),
          vigencia_fim:       _fmtData(c.vigenciaFim),
          valor_aprovado:     _num(c.valorTotal),
          contrapartida:      _num(c.contrapartida),
          valor_realizado:    _num(c.valorRealizado || 0),
          saldo:              _num((Number(c.valorTotal)||0) - (Number(c.valorRealizado)||0)),
          status:             c.status || ''
        });
      });
    } catch(_) {}

    return {
      espacos:    gerarCSV(listaEspacos.length  ? listaEspacos  : [{ aviso: 'sem dados para o ano ' + anoN }]),
      agentes:    gerarCSV(listaAgentes.length  ? listaAgentes  : [{ aviso: 'sem dados cadastrados' }]),
      acoes:      gerarCSV(listaAcoes.length    ? listaAcoes    : [{ aviso: 'sem acoes para o ano ' + anoN }]),
      financeiro: gerarCSV(listaFinanceiro.length ? listaFinanceiro : [{ aviso: 'sem contratos no periodo' }]),
      meta: {
        orgId:        orgId,
        orgNome:      org.nome || org.titulo || '',
        municipio:    org.municipio || '',
        uf:           org.uf || '',
        ano:          anoN,
        totalEspacos: listaEspacos.length,
        totalAgentes: listaAgentes.length,
        totalAcoes:   listaAcoes.length,
        totalContratos: listaFinanceiro.length
      }
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
    gerarPNAB:    gerarPNAB,
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
 * Gera XML SALIC de um contrato Lei Rouanet.
 * @param {Object} params — { contratoId } (aceita projetoId como alias)
 */
function ctrl_exportacao_salic(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var id = params.contratoId || params.projetoId;
    if (!id) throw new Error('contratoId obrigatório.');
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['admin', 'gestor', 'financeiro', 'superadmin']);
    var xml = ExportacaoEngine.gerarSALIC(orgId, id);
    var nomeArq = 'SALIC_' + String(id).replace(/[^a-zA-Z0-9_-]/g, '_') + '.xml';
    return { xml: xml, nomeArquivo: nomeArq };
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
 * Gera os 4 CSVs PNAB (Aldir Blanc) para o ano informado.
 * @param {Object} params — { ano }
 */
function ctrl_exportacao_pnab(params) {
  return GasResponse.wrap(function() {
    params = params || {};
    var orgId = getOrgConfig().orgId;
    AcessoService.verificar(['admin', 'gestor', 'financeiro', 'superadmin']);
    var ano = params.ano ? parseInt(params.ano) : new Date().getFullYear();
    return ExportacaoEngine.gerarPNAB(orgId, ano);
  }, 'ctrl_exportacao_pnab');
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
