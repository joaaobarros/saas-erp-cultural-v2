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
   * Gera relatório anual SNIIC completo.
   *
   * Seções geradas:
   *   1. identificacao     — dados do equipamento cultural (config_org.json + espaços)
   *   2. funcionamento     — dias/semana, horários, meses em atividade
   *   3. recursos_humanos  — efetivos, bolsistas, voluntários, agentes culturais
   *   4. atividades        — ações por categoria SNIIC + distribuição mensal
   *   5. publico_atendido  — inscrições, presenças, faixas etárias, PcD, NPS
   *   6. recursos_financeiros — captado por esfera (federal/estadual/municipal/próprios)
   *
   * Retorna também `csv` — planilha CSV com BOM UTF-8, formato Seção/Campo/Valor,
   * pronto para upload ou importação no portal SNIIC/MinC.
   *
   * @param {string} orgId
   * @param {number} ano — ex: 2025
   * @returns {Object} { ano, identificacao, funcionamento, recursos_humanos,
   *                     atividades, publico_atendido, recursos_financeiros, csv }
   */
  function gerarSNIIC(orgId, ano) {
    var org   = getOrgConfig();
    orgId     = orgId || org.orgId;
    ano       = ano   || new Date().getFullYear();
    var anoN  = Number(ano);
    var agora = new Date();

    function _desteAno(iso) {
      if (!iso) return false;
      try { return new Date(iso).getFullYear() === anoN; } catch(_) { return false; }
    }

    // ── 1. Identificação ────────────────────────────────────────────────────
    var espacos = [];
    try { espacos = SistemaConfigService.getEspacos() || []; } catch(_) {}

    var identificacao = {
      nome_equipamento:    org.nome || org.titulo || '',
      tipo_equipamento:    org.tipoEquipamento || 'Centro Cultural',
      cnpj:                org.cnpj || '',
      logradouro:          org.logradouro || '',
      municipio:           org.municipio || 'Fortaleza',
      uf:                  org.uf || 'CE',
      cep:                 org.cep || '',
      email:               org.email || '',
      telefone:            org.telefone || '',
      site:                org.site || '',
      ano_fundacao:        org.anoFundacao || '',
      capacidade_total:    espacos.reduce(function(s, e) { return s + (Number(e.capacidade) || 0); }, 0),
      quantidade_espacos:  espacos.filter(function(e) { return e.ativo !== false; }).length
    };

    // ── 2. Funcionamento ────────────────────────────────────────────────────
    var orgCfg = {};
    try { orgCfg = SistemaConfigService.getOrgConfig ? SistemaConfigService.getOrgConfig() : {}; } catch(_) {}

    var funcionamento = {
      meses_atividade_ano: 12,
      dias_semana:         Number(orgCfg.diasSemana) || 5,
      hora_abertura:       orgCfg.horaAbertura    || '08:00',
      hora_encerramento:   orgCfg.horaEncerramento || '22:00',
      entrada_gratuita:    true
    };

    // ── 3. Recursos Humanos ─────────────────────────────────────────────────
    var colaboradores = [];
    try { colaboradores = ColaboradorRepository.listar(orgId, {}); } catch(_) {}
    var ativos = colaboradores.filter(function(c) {
      return c.status !== 'desligado' && c.status !== 'afastado';
    });

    var voluntariosTotal = 0;
    try {
      var allVol = VoluntarioRepository.listar(orgId, {});
      voluntariosTotal = allVol.filter(function(v) { return v.status === 'ativo'; }).length;
    } catch(_) {}

    var agentesAtivos = 0;
    try {
      var allAg = AgenteCulturalRepository.listar(orgId, {});
      agentesAtivos = allAg.filter(function(a) { return a.status === 'ativo'; }).length;
    } catch(_) {}

    var recursosHumanos = {
      efetivos:                ativos.filter(function(c) {
        var v = (c.vinculo || '').toLowerCase();
        return v === 'clt' || v === 'estatutario' || v === 'comissionado';
      }).length,
      terceirizados_bolsistas: ativos.filter(function(c) {
        var v = (c.vinculo || '').toLowerCase();
        return v === 'bolsista' || v === 'prestador' || v === 'terceirizado';
      }).length,
      voluntarios:             voluntariosTotal,
      agentes_culturais:       agentesAtivos,
      total_equipe:            ativos.length + voluntariosTotal
    };

    // ── 4. Atividades por categoria SNIIC ───────────────────────────────────
    var CATEGORIAS = {
      artes_cenicas:  ['teatro','dança','danca','circo','cênicas','cenicas','performance','clown','mímica','mimica'],
      artes_visuais:  ['exposição','exposicao','galeria','artes visuais','fotografia','instalação','instalacao','escultura','pintura','grafite'],
      audiovisual:    ['cinema','audiovisual','vídeo','video','filme','documentário','documentario','animação','animacao'],
      musica:         ['música','musica','show','concerto','sarau','banda','coral','forró','forro','samba','chorinho','mpb','jazz','rock','rap','hip-hop'],
      formacao:       ['curso','oficina','workshop','formação','formacao','capacitação','capacitacao','residência','residencia','aula','treinamento'],
      humanidades:    ['lançamento','lancamento','palestra','debate','literatura','poesia','seminário','seminario','congresso','fórum','forum','mesa redonda'],
      patrimonio:     ['patrimônio','patrimonio','popular','folclore','tradição','tradicao','artesanato','capoeira','maracatu','reisado','bumba','quadrilha'],
      outros:         []
    };

    var por_cat = {};
    Object.keys(CATEGORIAS).forEach(function(c) { por_cat[c] = { quantidade: 0, acoes: [] }; });

    var acoes = [];
    try {
      acoes = AcaoRepository.listar(orgId, {}).filter(function(a) {
        return _desteAno(a.dataInicio || a.criadoEm) && a.status !== 'cancelada';
      });
    } catch(_) {}

    acoes.forEach(function(a) {
      var txt = ((a.tipo || '') + ' ' + (a.linguagemCultural || '') + ' ' + (a.nome || '')).toLowerCase();
      var cat = 'outros';
      Object.keys(CATEGORIAS).forEach(function(c) {
        if (c === 'outros') return;
        if (CATEGORIAS[c].some(function(kw) { return txt.indexOf(kw) >= 0; })) cat = c;
      });
      por_cat[cat].quantidade++;
      por_cat[cat].acoes.push(a.nome);
    });

    var MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    var por_mes = MESES.map(function(label, idx) {
      var m = idx + 1;
      return {
        mes: m, label: label,
        quantidade: acoes.filter(function(a) {
          try { return new Date(a.dataInicio || a.criadoEm).getMonth() + 1 === m; } catch(_) { return false; }
        }).length
      };
    });

    // ── 5. Público Atendido ─────────────────────────────────────────────────
    var metricas = { totalInscricoes: 0, nps: null };
    try { metricas = PublicoEngine.obterMetricas(orgId) || metricas; } catch(_) {}

    var inscricoes = [];
    try {
      inscricoes = PublicoRepository.listar(orgId, {}).filter(function(i) {
        return _desteAno(i.criadoEm || i.dataInscricao);
      });
    } catch(_) {}

    var faixas = { f0_12: 0, f13_17: 0, f18_29: 0, f30_59: 0, f60mais: 0, pcd: 0 };
    inscricoes.forEach(function(i) {
      var fx = (i.faixaEtaria || '').toLowerCase();
      if (fx === 'crianca' || fx === '0-12')              faixas.f0_12++;
      else if (fx === 'adolescente' || fx === '13-17')    faixas.f13_17++;
      else if (fx === 'jovem' || fx === '18-29')          faixas.f18_29++;
      else if (fx === 'adulto' || fx === '30-59')         faixas.f30_59++;
      else if (fx === 'idoso' || fx === '60+')            faixas.f60mais++;
      if (i.pcd || i.ehPcd) faixas.pcd++;
    });

    var publicoAtendido = {
      total_inscricoes:     inscricoes.length,
      total_presencas:      inscricoes.filter(function(i) {
                              return i.status === 'presente' || i.status === 'certificado';
                            }).length,
      total_gratuito:       inscricoes.filter(function(i) {
                              return !i.valorIngresso || Number(i.valorIngresso) === 0;
                            }).length,
      total_pago:           inscricoes.filter(function(i) {
                              return Number(i.valorIngresso) > 0;
                            }).length,
      faixa_0_12:           faixas.f0_12,
      faixa_13_17:          faixas.f13_17,
      faixa_18_29:          faixas.f18_29,
      faixa_30_59:          faixas.f30_59,
      faixa_60_mais:        faixas.f60mais,
      pcd:                  faixas.pcd,
      nps_medio:            metricas.nps
    };

    // ── 6. Recursos Financeiros ─────────────────────────────────────────────
    var recursos = { total_captado: 0, federal: 0, estadual: 0, municipal: 0, proprios: 0, outros: 0 };
    try {
      ContratoRepository.listar(orgId, {})
        .filter(function(c) {
          return (c.status === 'ativo' || c.status === 'encerrado') &&
                 _desteAno(c.vigenciaInicio || c.criadoEm);
        })
        .forEach(function(c) {
          var v   = Number(c.valorTotal) || 0;
          var mod = (c.modalidade || '').toLowerCase();
          recursos.total_captado += v;
          if (mod === 'lei_rouanet' || mod === 'lei_aldir_blanc' ||
              mod === 'edital_federal' || mod.indexOf('federal') >= 0) {
            recursos.federal += v;
          } else if (mod === 'procultura' || mod === 'edital_estadual' ||
                     mod.indexOf('estadual') >= 0) {
            recursos.estadual += v;
          } else if (mod === 'edital_municipal' || mod.indexOf('municipal') >= 0) {
            recursos.municipal += v;
          } else if (mod === 'contrato_gestao' || mod.indexOf('proprio') >= 0) {
            recursos.proprios += v;
          } else {
            recursos.outros += v;
          }
        });
    } catch(_) {}

    // ── Monta resultado final ───────────────────────────────────────────────
    var resultado = {
      ano:                  anoN,
      data_geracao:         agora.toISOString(),
      sistema:              'TRAMAR — ERP Cultural SaaS v2',
      identificacao:        identificacao,
      funcionamento:        funcionamento,
      recursos_humanos:     recursosHumanos,
      atividades: {
        total:              acoes.length,
        por_categoria:      por_cat,
        por_mes:            por_mes
      },
      publico_atendido:     publicoAtendido,
      recursos_financeiros: recursos
    };

    resultado.csv = _gerarCsvSNIIC(resultado);
    return resultado;
  }

  /**
   * Converte o objeto SNIIC para CSV (Seção / Campo / Valor) com BOM UTF-8.
   */
  function _gerarCsvSNIIC(d) {
    var BOM = '﻿';
    var lin = ['"Seção","Campo","Valor"'];

    function add(s, campo, valor) {
      var v = (valor === null || valor === undefined) ? '' : String(valor);
      lin.push('"' + s + '","' + campo + '","' + v.replace(/"/g, '""') + '"');
    }

    // 1. Identificação
    var id = d.identificacao || {};
    add('1. Identificação', 'Nome do Equipamento',  id.nome_equipamento);
    add('1. Identificação', 'Tipo de Equipamento',  id.tipo_equipamento);
    add('1. Identificação', 'CNPJ',                 id.cnpj);
    add('1. Identificação', 'Município',             id.municipio);
    add('1. Identificação', 'UF',                   id.uf);
    add('1. Identificação', 'CEP',                  id.cep);
    add('1. Identificação', 'E-mail',               id.email);
    add('1. Identificação', 'Telefone',             id.telefone);
    add('1. Identificação', 'Site',                 id.site);
    add('1. Identificação', 'Ano de Fundação',      id.ano_fundacao);
    add('1. Identificação', 'Quantidade de Espaços',id.quantidade_espacos);
    add('1. Identificação', 'Capacidade Total',     id.capacidade_total);

    // 2. Funcionamento
    var fn = d.funcionamento || {};
    add('2. Funcionamento', 'Meses em Atividade/Ano', fn.meses_atividade_ano);
    add('2. Funcionamento', 'Dias por Semana',         fn.dias_semana);
    add('2. Funcionamento', 'Horário de Abertura',     fn.hora_abertura);
    add('2. Funcionamento', 'Horário de Encerramento', fn.hora_encerramento);
    add('2. Funcionamento', 'Entrada Gratuita',        fn.entrada_gratuita ? 'Sim' : 'Não');

    // 3. Recursos Humanos
    var rh = d.recursos_humanos || {};
    add('3. Recursos Humanos', 'Efetivos (CLT/Estatutários)',   rh.efetivos);
    add('3. Recursos Humanos', 'Terceirizados / Bolsistas',     rh.terceirizados_bolsistas);
    add('3. Recursos Humanos', 'Voluntários',                   rh.voluntarios);
    add('3. Recursos Humanos', 'Agentes Culturais Ativos',      rh.agentes_culturais);
    add('3. Recursos Humanos', 'Total da Equipe',               rh.total_equipe);

    // 4. Atividades por categoria
    var at  = d.atividades   || {};
    var pc  = at.por_categoria || {};
    add('4. Atividades', 'Total de Ações no Ano',                at.total);
    add('4. Atividades', 'Artes Cênicas (teatro/dança/circo)',   (pc.artes_cenicas || {}).quantidade || 0);
    add('4. Atividades', 'Artes Visuais (exposições/galerias)',  (pc.artes_visuais || {}).quantidade || 0);
    add('4. Atividades', 'Audiovisual (cinema/vídeo)',           (pc.audiovisual   || {}).quantidade || 0);
    add('4. Atividades', 'Música (shows/concertos/saraus)',      (pc.musica        || {}).quantidade || 0);
    add('4. Atividades', 'Formação (cursos/oficinas/workshops)', (pc.formacao      || {}).quantidade || 0);
    add('4. Atividades', 'Humanidades (palestras/debates/lit.)',(pc.humanidades   || {}).quantidade || 0);
    add('4. Atividades', 'Patrimônio e Diversidade',            (pc.patrimonio    || {}).quantidade || 0);
    add('4. Atividades', 'Outros',                              (pc.outros        || {}).quantidade || 0);

    // Distribuição mensal
    (at.por_mes || []).forEach(function(m) {
      add('4.1 Atividades por Mês', m.label || ('Mês ' + m.mes), m.quantidade);
    });

    // 5. Público
    var pub = d.publico_atendido || {};
    add('5. Público Atendido', 'Total de Inscrições',             pub.total_inscricoes);
    add('5. Público Atendido', 'Presenças Confirmadas',           pub.total_presencas);
    add('5. Público Atendido', 'Acesso Gratuito',                 pub.total_gratuito);
    add('5. Público Atendido', 'Acesso Pago',                     pub.total_pago);
    add('5. Público Atendido', 'Faixa 0–12 anos',                 pub.faixa_0_12);
    add('5. Público Atendido', 'Faixa 13–17 anos',                pub.faixa_13_17);
    add('5. Público Atendido', 'Faixa 18–29 anos',                pub.faixa_18_29);
    add('5. Público Atendido', 'Faixa 30–59 anos',                pub.faixa_30_59);
    add('5. Público Atendido', '60 anos ou mais',                 pub.faixa_60_mais);
    add('5. Público Atendido', 'Pessoas com Deficiência (PcD)',   pub.pcd);
    add('5. Público Atendido', 'NPS Médio',                       pub.nps_medio != null ? pub.nps_medio : '');

    // 6. Recursos
    var rf = d.recursos_financeiros || {};
    add('6. Recursos Financeiros', 'Total Captado (R$)',       rf.total_captado);
    add('6. Recursos Financeiros', 'Recursos Federais (R$)',   rf.federal);
    add('6. Recursos Financeiros', 'Recursos Estaduais (R$)',  rf.estadual);
    add('6. Recursos Financeiros', 'Recursos Municipais (R$)', rf.municipal);
    add('6. Recursos Financeiros', 'Recursos Próprios (R$)',   rf.proprios);
    add('6. Recursos Financeiros', 'Outros Recursos (R$)',     rf.outros);

    return BOM + lin.join('\r\n');
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
  function gerarPNAB(orgId, ano, contratoId) {
    var org = getOrgConfig();
    orgId   = orgId || org.orgId;

    // Se contratoId fornecido, usar o período do contrato como filtro
    var contrato      = null;
    var periodoInicio = null;
    var periodoFim    = null;
    if (contratoId) {
      try { contrato = ContratoRepository.buscarPorId(orgId, contratoId); } catch(_) {}
      if (contrato) {
        if (contrato.vigenciaInicio) periodoInicio = new Date(contrato.vigenciaInicio);
        if (contrato.vigenciaFim)    periodoFim    = new Date(contrato.vigenciaFim);
        if (!ano && periodoInicio)   ano            = periodoInicio.getFullYear();
      }
    }

    ano  = ano   || new Date().getFullYear();
    var anoN = Number(ano);

    function _dentroDoPeriodo(iso) {
      if (!iso) return false;
      try {
        var d = new Date(iso);
        if (periodoInicio && periodoFim) return d >= periodoInicio && d <= periodoFim;
        if (periodoInicio)               return d >= periodoInicio;
        return d.getFullYear() === anoN;
      } catch(_) { return false; }
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
      var _contratosFin = (contratoId && contrato)
        ? [contrato]
        : ContratoRepository.listar(orgId, {}).filter(function(c) {
            var ini = c.vigenciaInicio || ''; var fim = c.vigenciaFim || '';
            return (!ini || new Date(ini).getFullYear() <= anoN) &&
                   (!fim || new Date(fim).getFullYear() >= anoN);
          });
      _contratosFin.forEach(function(c) {
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
    var _cEmail = getEmailSessao(); var _cA = AcessoService.verificar(_cEmail);
    if (!_cA || _cA.status !== 'ativo') throw new Error('Acesso negado.');
    if (['admin','superadmin'].indexOf((_cA.registro&&_cA.registro.papel)||'') === -1) throw new Error('Sem permissão.');

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
    var _sEmail = getEmailSessao(); var _sA = AcessoService.verificar(_sEmail);
    if (!_sA || _sA.status !== 'ativo') throw new Error('Acesso negado.');
    if (['admin','gestor','financeiro','superadmin'].indexOf((_sA.registro&&_sA.registro.papel)||'') === -1) throw new Error('Sem permissão.');
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
    var _nEmail = getEmailSessao(); var _nA = AcessoService.verificar(_nEmail);
    if (!_nA || _nA.status !== 'ativo') throw new Error('Acesso negado.');
    if (['admin','superadmin'].indexOf((_nA.registro&&_nA.registro.papel)||'') === -1) throw new Error('Sem permissão.');
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
    var orgId      = getOrgConfig().orgId;
    var _bEmail = getEmailSessao(); var _bA = AcessoService.verificar(_bEmail);
    if (!_bA || _bA.status !== 'ativo') throw new Error('Acesso negado.');
    if (['admin','gestor','financeiro','superadmin'].indexOf((_bA.registro&&_bA.registro.papel)||'') === -1) throw new Error('Sem permissão.');
    var ano        = params.ano        ? parseInt(params.ano) : null;
    var contratoId = params.contratoId || null;
    return ExportacaoEngine.gerarPNAB(orgId, ano, contratoId);
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
    var _expEmail  = getEmailSessao();
    var _expAcesso = AcessoService.verificar(_expEmail);
    if (!_expAcesso || _expAcesso.status !== 'ativo') throw new Error('Acesso negado.');
    var _expPapel  = (_expAcesso.registro && _expAcesso.registro.papel) || 'colaborador';
    if (['coordenador','gestor','admin','superadmin'].indexOf(_expPapel) === -1)
      throw new Error('Sem permissão para exportar inscrições.');
    var lista = PublicoRepository.Inscricoes.listar(orgId, { acaoId: params.acaoId });
    var colunas = ['id','nome','email','telefone','status','criadoEm'];
    return { csv: ExportacaoEngine.gerarCSV(lista, colunas), total: lista.length };
  }, 'ctrl_exportacao_inscricoes_csv');
}
