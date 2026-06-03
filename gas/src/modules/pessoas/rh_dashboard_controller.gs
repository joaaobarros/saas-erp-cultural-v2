/**
 * @file rh_dashboard_controller.gs
 * @layer Controller
 * @description Dashboard analítico de RH: Folha (custo total/vínculo/projeção),
 *              Ponto (heatmap banco de horas + calendário individual),
 *              Turnover (tendência 12 meses).
 * @depends ponto_engine.gs, pessoas_engine.gs, colaborador_repository.gs, acesso_service.gs
 */

/* ─────────────────────────────────────────────────────────────
   ctrl_rh_dashboard_folha
   Retorna: resumo de custo mensal estimado por vínculo,
            array 12 meses (headcount + custo total estimado),
            breakdown por setor, projeção anual.
   RBAC: gestor / coordenador / financeiro / admin / superadmin
   ───────────────────────────────────────────────────────────── */
function ctrl_rh_dashboard_folha(params) {
  return GasResponse.wrap(function () {
    var _rhEmail  = getEmailSessao();
    var _rhAcesso = AcessoService.verificar(_rhEmail);
    if (!_rhAcesso || _rhAcesso.status !== 'ativo') throw new Error('Acesso negado.');
    var _rhPapel  = (_rhAcesso.registro && _rhAcesso.registro.papel) || 'colaborador';
    if (['gestor','coordenador','financeiro','admin','superadmin'].indexOf(_rhPapel) === -1)
      throw new Error('Sem permissão.');
    var orgId = getOrgConfig().orgId;
    params = params || {};

    // 1. Buscar todos os colaboradores ativos
    var todos = ColaboradorRepository.listar(orgId) || [];
    var ativos = todos.filter(function(c) { return c.status === 'ativo'; });

    // Parâmetros padrão de custo CLT (encargos oficiais de PontoEngine)
    var paramsBase = {
      salarioBruto:   0,
      reajusteAcordo: 0,
      nMeses:         1,
      vtPorPasse:     5.40,
      vtQtdPorDia:    2,
      vaDiario:       27.01,
      vaDescontoMes:  0,
      vrDiario:       0,
      vrDesconto:     0,
      psIndividual:   0,
      psNDependentes: 0,
      psValorDep:     0,
      psDescPct:      30,
      diasUteis:      22
    };

    // 2. Calcular custo estimado por colaborador
    var totalMes   = 0;
    var breakdown  = {}; // { vinculo: { qtd, custoTotal } }
    var porSetor   = {}; // { setor: { qtd, custoTotal } }
    var itensFolha = [];

    ativos.forEach(function(c) {
      var salario  = c.salarioBruto || c.salario || 0;
      var vinculo  = c.vinculo || 'outros';
      var setor    = c.setor   || 'Sem setor';
      var custo    = 0;

      if (vinculo === 'clt' && salario > 0) {
        try {
          var p = JSON.parse(JSON.stringify(paramsBase));
          p.salarioBruto = salario;
          var r = PontoEngine.calcularCustoCLT(orgId, p);
          custo = (r && r.custoMensal) ? r.custoMensal : salario;
        } catch(e) {
          custo = salario * 1.7; // multiplicador conservador se engine falhar
        }
      } else if (vinculo === 'pj' && salario > 0) {
        custo = salario; // PJ: sem encargos patronais
      } else if (vinculo === 'bolsista' && salario > 0) {
        custo = salario * 1.08; // bolsista: INSS +8%
      } else if (salario > 0) {
        custo = salario;
      }

      totalMes += custo;

      if (!breakdown[vinculo]) breakdown[vinculo] = { qtd: 0, custoTotal: 0, label: _labelVinculo(vinculo) };
      breakdown[vinculo].qtd++;
      breakdown[vinculo].custoTotal += custo;

      if (!porSetor[setor]) porSetor[setor] = { qtd: 0, custoTotal: 0 };
      porSetor[setor].qtd++;
      porSetor[setor].custoTotal += custo;

      itensFolha.push({
        id: c.id, nome: c.nome, vinculo: vinculo, setor: setor,
        salarioBruto: _R(salario), custoTotal: _R(custo),
        multiplicador: salario > 0 ? _R(custo / salario) : 0
      });
    });

    // 3. Comparativo 12 meses (headcount real + custo estimado pelo headcount)
    var hoje = new Date();
    var historico12m = [];
    for (var i = 11; i >= 0; i--) {
      var d     = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      var ano   = d.getFullYear();
      var mes   = d.getMonth() + 1;
      var label = _MESES_ABREV[mes - 1] + '/' + String(ano).slice(2);

      // Headcount real naquele período (aproximado: colaboradores ativos + ingresso/saída)
      var hc    = ativos.length; // simplificação: headcount atual
      var custo = _R(totalMes);  // custo mês atual (simplificação para meses históricos sem dados de ponto)

      historico12m.push({ ano: ano, mes: mes, label: label, headcount: hc, custoTotal: custo });
    }

    // 4. Projeção anual (meses restantes × custo médio mensal)
    var mesesRestantes = 12 - (hoje.getMonth() + 1);
    var projecaoAnual  = _R(totalMes * 12);
    var projecaoMeses  = _R(totalMes * mesesRestantes);

    // 5. Montar resposta
    return {
      resumo: {
        totalMensal:     _R(totalMes),
        totalAtivos:     ativos.length,
        custoMedio:      ativos.length > 0 ? _R(totalMes / ativos.length) : 0,
        projecaoAnual:   projecaoAnual,
        projecaoRestante: projecaoMeses,
        mesesRestantes:  mesesRestantes
      },
      breakdown:  _objToArr(breakdown),
      porSetor:   _objToArr(porSetor),
      historico12m: historico12m,
      itens:      itensFolha.sort(function(a,b){ return b.custoTotal - a.custoTotal; })
    };
  }, 'ctrl_rh_dashboard_folha');
}

/* ─────────────────────────────────────────────────────────────
   ctrl_rh_dashboard_ponto
   Modo 'heatmap': heatmap banco de horas (todos × 6 meses)
   Modo 'calendario': espelho mensal de um colaborador (grid dia)
   RBAC: gestor / rh / admin / superadmin
   ───────────────────────────────────────────────────────────── */
function ctrl_rh_dashboard_ponto(params) {
  return GasResponse.wrap(function () {
    var _pEmail  = getEmailSessao();
    var _pAcesso = AcessoService.verificar(_pEmail);
    if (!_pAcesso || _pAcesso.status !== 'ativo') throw new Error('Acesso negado.');
    var _pPapel  = (_pAcesso.registro && _pAcesso.registro.papel) || 'colaborador';
    if (['gestor','rh','admin','superadmin'].indexOf(_pPapel) === -1) throw new Error('Sem permissão.');
    var orgId = getOrgConfig().orgId;
    params = params || {};
    var modo  = params.modo || 'heatmap';

    if (modo === 'calendario') {
      // Calendário individual: dia a dia de um colaborador no mês
      var idColab = params.colaboradorId;
      if (!idColab) throw new Error('colaboradorId obrigatório para modo calendario');
      var ano = parseInt(params.ano) || new Date().getFullYear();
      var mes = parseInt(params.mes) || (new Date().getMonth() + 1);

      var mensal    = PontoEngine.calcularMensal(orgId, idColab, ano, mes);
      var colab     = ColaboradorRepository.buscarPorId(idColab, orgId) || {};
      var diasDoMes = _ultimoDia(ano, mes);
      var dias      = [];

      for (var d = 1; d <= diasDoMes; d++) {
        var dataStr = ano + '-' + _pad(mes) + '-' + _pad(d);
        var diaDaSemana = new Date(ano, mes - 1, d).getDay(); // 0=Dom
        var reg   = (mensal && mensal.registrosPorDia && mensal.registrosPorDia[dataStr]) || null;
        var horas = reg ? (reg.horasRegulares || 0) : 0;
        dias.push({
          data:          dataStr,
          dia:           d,
          diaSemana:     diaDaSemana,
          fimSemana:     diaDaSemana === 0 || diaDaSemana === 6,
          horasTrabalhadas: _R(horas),
          temRegistro:   !!reg,
          status:        _statusDia(d, diaDaSemana, horas, !!reg)
        });
      }

      return {
        modo:     'calendario',
        colaborador: { id: colab.id, nome: colab.nome || idColab },
        ano:      ano,
        mes:      mes,
        resumo:   mensal ? {
          totalHoras:  _R(mensal.totalHorasRegulares || 0),
          diasPresente: mensal.diasComRegistro || 0,
          bancoHoras:  _R(mensal.saldoBancoHoras || 0)
        } : null,
        dias:     dias
      };
    }

    // Modo heatmap: todos os colaboradores × últimos 6 meses
    var hoje   = new Date();
    var meses  = [];
    for (var i = 5; i >= 0; i--) {
      var dd = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push({ ano: dd.getFullYear(), mes: dd.getMonth() + 1, label: _MESES_ABREV[dd.getMonth()] + '/' + String(dd.getFullYear()).slice(2) });
    }

    var todos   = ColaboradorRepository.listar(orgId) || [];
    var ativos  = todos.filter(function(c) { return c.status === 'ativo'; }).slice(0, 30); // máx 30 para performance
    var linhas  = [];
    var maxBH   = 0;

    ativos.forEach(function(c) {
      var celulas = meses.map(function(m) {
        var bh = 0;
        try {
          var r = PontoEngine.calcularMensal(orgId, c.id, m.ano, m.mes);
          bh = (r && r.saldoBancoHoras) ? r.saldoBancoHoras : 0;
        } catch(e) { bh = 0; }
        if (Math.abs(bh) > maxBH) maxBH = Math.abs(bh);
        return { bh: _R(bh), nivel: _nivelBH(bh) };
      });
      linhas.push({ id: c.id, nome: c.nome, vinculo: c.vinculo, celulas: celulas });
    });

    return {
      modo:    'heatmap',
      meses:   meses.map(function(m){ return m.label; }),
      linhas:  linhas,
      maxBH:   _R(maxBH),
      limiteAlerta: 40 // horas
    };
  }, 'ctrl_rh_dashboard_ponto');
}

/* ─────────────────────────────────────────────────────────────
   ctrl_rh_dashboard_turnover
   Retorna: tendência de turnover nos últimos 12 meses
   RBAC: gestor / rh / admin / superadmin
   ───────────────────────────────────────────────────────────── */
function ctrl_rh_dashboard_turnover(params) {
  return GasResponse.wrap(function () {
    var _tEmail  = getEmailSessao();
    var _tAcesso = AcessoService.verificar(_tEmail);
    if (!_tAcesso || _tAcesso.status !== 'ativo') throw new Error('Acesso negado.');
    var _tPapel  = (_tAcesso.registro && _tAcesso.registro.papel) || 'colaborador';
    if (['gestor','rh','admin','superadmin'].indexOf(_tPapel) === -1) throw new Error('Sem permissão.');
    var orgId = getOrgConfig().orgId;
    params = params || {};

    var hoje  = new Date();
    var meses = [];
    for (var i = 11; i >= 0; i--) {
      var dd  = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      var ano = dd.getFullYear();
      var mes = dd.getMonth() + 1;
      var label = _MESES_ABREV[mes - 1] + '/' + String(ano).slice(2);

      var d = { ano: ano, mes: mes, label: label, total: 0, entradas: 0, saidas: 0, taxaTurnover: 0 };
      try {
        var r = PontoEngine.calcularIndicadoresTurnover(orgId, ano, mes);
        if (r) {
          d.total       = r.total       || 0;
          d.entradas    = r.entradas    || 0;
          d.saidas      = r.saidas      || 0;
          d.taxaTurnover= r.taxaTurnover|| 0;
        }
      } catch(e) { /* sem dados para o mês */ }
      meses.push(d);
    }

    // Médias e tendência
    var comDados = meses.filter(function(m){ return m.total > 0; });
    var mediaTurnover = comDados.length > 0
      ? _R(comDados.reduce(function(s,m){ return s + m.taxaTurnover; }, 0) / comDados.length)
      : 0;

    var ultimoHc = meses.length > 0 ? meses[meses.length - 1].total : 0;

    return {
      meses:          meses,
      mediaTurnover:  mediaTurnover,
      headcountAtual: ultimoHc,
      altoRisco:      mediaTurnover > 15,
      labels:         meses.map(function(m){ return m.label; }),
      entradas:       meses.map(function(m){ return m.entradas; }),
      saidas:         meses.map(function(m){ return m.saidas; }),
      headcounts:     meses.map(function(m){ return m.total; }),
      taxas:          meses.map(function(m){ return m.taxaTurnover; })
    };
  }, 'ctrl_rh_dashboard_turnover');
}

// ─── Helpers privados ──────────────────────────────────────────
var _MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function _R(v) { return Math.round((v || 0) * 100) / 100; }
function _pad(n) { return String(n).padStart(2, '0'); }
function _ultimoDia(ano, mes) { return new Date(ano, mes, 0).getDate(); }

function _labelVinculo(v) {
  return { clt:'CLT', pj:'PJ', bolsista:'Bolsista', estagio:'Estágio', voluntario:'Voluntário', temporario:'Temporário' }[v] || v;
}

function _objToArr(obj) {
  return Object.keys(obj).map(function(k) {
    return Object.assign({ chave: k }, obj[k]);
  }).sort(function(a,b){ return b.custoTotal - a.custoTotal; });
}

function _nivelBH(bh) {
  if (bh >= 40)  return 'critico';   // vermelho
  if (bh >= 20)  return 'alto';      // laranja
  if (bh >= 8)   return 'medio';     // amarelo
  if (bh >= 0)   return 'ok';        // verde claro
  return 'negativo';                  // cinza (banco negativo)
}

function _statusDia(dia, diaSemana, horas, temRegistro) {
  if (diaSemana === 0 || diaSemana === 6) return 'fimSemana';
  if (!temRegistro) return 'ausente';
  if (horas >= 7.5) return 'presente';
  if (horas > 0)    return 'parcial';
  return 'ausente';
}
