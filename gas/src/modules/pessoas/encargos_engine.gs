/**
 * @file modules/pessoas/encargos_engine.gs
 * @layer modules/pessoas
 * @description Engine de Encargos Trabalhistas.
 *
 *   Responsabilidades:
 *   1. Catálogo de tabelas oficiais brasileiras por ano (2024, 2025, 2026…)
 *   2. Detecção automática de quando há nova tabela disponível
 *   3. Aplicação da tabela oficial via EncargosRepository (preserva manuais)
 *   4. Integração com SistemaConfigService para compatibilidade com ponto_engine
 *
 *   Fontes legais incorporadas:
 *   - INSS empregado: Portaria MPS — tabela progressiva anual
 *   - INSS patronal: Lei 8.212/91 art. 22 (20% regra geral)
 *   - FGTS: Lei 8.036/90 art. 15 (8% fixo)
 *   - PIS/PASEP: Lei 9.715/98 art. 8 (1% folha)
 *   - SAT/RAT: Lei 8.212/91 art. 22-A (1-3% por grau de risco)
 *   - IRRF: Instrução Normativa RFB 2.141/2023 + atualizações
 *   - Salário Mínimo: decretos anuais do Poder Executivo
 *
 * @depends encargos_repository.gs, core/config.gs, core/services/auditoria_service.gs
 */

var EncargosEngine = (function () {

  // ════════════════════════════════════════════════════════════════════════════
  // CATÁLOGO OFICIAL — tabelas por ano
  // Atualizar aqui a cada publicação governamental.
  // Formato por ano: { anoRef, aliquotas, salarioMinimo, tabelaINSS, tabelaIRRF,
  //                    descontoSimplificadoIRRF }
  // ════════════════════════════════════════════════════════════════════════════

  var TABELAS_OFICIAIS = {

    // ─── 2024 ──────────────────────────────────────────────────────────────────
    // Decreto 11.936/2024 (salário mínimo); Portaria MPS 1.202/2023 (INSS)
    2024: {
      anoRef: 2024,
      aliquotas: {
        inssPatronal: { chave: 'inssPatronal', label: 'INSS Patronal',      valor: 0.20,   unidade: 'percentual', descricao: 'Lei 8.212/91 art. 22' },
        fgts:         { chave: 'fgts',         label: 'FGTS',               valor: 0.08,   unidade: 'percentual', descricao: 'Lei 8.036/90 art. 15' },
        pisPasep:     { chave: 'pisPasep',      label: 'PIS/PASEP Patronal', valor: 0.01,   unidade: 'percentual', descricao: 'Lei 9.715/98 art. 8' },
        sat:          { chave: 'sat',           label: 'SAT/RAT',            valor: 0.01,   unidade: 'percentual', descricao: 'Risco leve — CNAE cultural/educacional' },
        sistemaS:     { chave: 'sistemaS',      label: 'Sistema S',          valor: 0.0566, unidade: 'percentual', descricao: 'SESC+SENAC+SEBRAE+INCRA+SENAT+SEST (3.º setor/serviços — verifique CNAE)' }
      },
      salarioMinimo: { chave: 'salarioMinimo', label: 'Salário Mínimo', valor: 1412.00, unidade: 'reais', descricao: 'Decreto 11.936/2024' },
      tabelaINSS: [
        { de: 0,       ate: 1412.00, aliquota: 0.075, descricao: 'Faixa 1' },
        { de: 1412.01, ate: 2666.68, aliquota: 0.09,  descricao: 'Faixa 2' },
        { de: 2666.69, ate: 4000.03, aliquota: 0.12,  descricao: 'Faixa 3' },
        { de: 4000.04, ate: 7786.02, aliquota: 0.14,  descricao: 'Faixa 4 (teto)' }
      ],
      tabelaIRRF: [
        { de: 0,       ate: 2259.20, aliquota: 0,     deducao: 0,      descricao: 'Isento' },
        { de: 2259.21, ate: 2826.65, aliquota: 0.075, deducao: 169.44, descricao: '7,5%' },
        { de: 2826.66, ate: 3751.05, aliquota: 0.15,  deducao: 381.44, descricao: '15%' },
        { de: 3751.06, ate: 4664.68, aliquota: 0.225, deducao: 662.77, descricao: '22,5%' },
        { de: 4664.69, ate: null,    aliquota: 0.275, deducao: 896.00, descricao: '27,5%' }
      ],
      descontoSimplificadoIRRF: { chave: 'descontoSimplificadoIRRF', label: 'Desconto Simplificado IRRF', valor: 528.00, unidade: 'reais', descricao: 'IN RFB 2.141/2023' }
    },

    // ─── 2025 ──────────────────────────────────────────────────────────────────
    // Decreto 12.302/2024 (salário mínimo R$ 1.518); Portaria MPS 1.383/2024 (INSS)
    2025: {
      anoRef: 2025,
      aliquotas: {
        inssPatronal: { chave: 'inssPatronal', label: 'INSS Patronal',      valor: 0.20,   unidade: 'percentual', descricao: 'Lei 8.212/91 art. 22' },
        fgts:         { chave: 'fgts',         label: 'FGTS',               valor: 0.08,   unidade: 'percentual', descricao: 'Lei 8.036/90 art. 15' },
        pisPasep:     { chave: 'pisPasep',      label: 'PIS/PASEP Patronal', valor: 0.01,   unidade: 'percentual', descricao: 'Lei 9.715/98 art. 8' },
        sat:          { chave: 'sat',           label: 'SAT/RAT',            valor: 0.01,   unidade: 'percentual', descricao: 'Risco leve — CNAE cultural/educacional' },
        sistemaS:     { chave: 'sistemaS',      label: 'Sistema S',          valor: 0.0566, unidade: 'percentual', descricao: 'SESC+SENAC+SEBRAE+INCRA+SENAT+SEST (3.º setor/serviços — verifique CNAE)' }
      },
      salarioMinimo: { chave: 'salarioMinimo', label: 'Salário Mínimo', valor: 1518.00, unidade: 'reais', descricao: 'Decreto 12.302/2024' },
      tabelaINSS: [
        { de: 0,       ate: 1518.00, aliquota: 0.075, descricao: 'Faixa 1' },
        { de: 1518.01, ate: 2793.88, aliquota: 0.09,  descricao: 'Faixa 2' },
        { de: 2793.89, ate: 4190.83, aliquota: 0.12,  descricao: 'Faixa 3' },
        { de: 4190.84, ate: 8157.41, aliquota: 0.14,  descricao: 'Faixa 4 (teto)' }
      ],
      tabelaIRRF: [
        { de: 0,       ate: 2259.20, aliquota: 0,     deducao: 0,      descricao: 'Isento' },
        { de: 2259.21, ate: 2826.65, aliquota: 0.075, deducao: 169.44, descricao: '7,5%' },
        { de: 2826.66, ate: 3751.05, aliquota: 0.15,  deducao: 381.44, descricao: '15%' },
        { de: 3751.06, ate: 4664.68, aliquota: 0.225, deducao: 662.77, descricao: '22,5%' },
        { de: 4664.69, ate: null,    aliquota: 0.275, deducao: 896.00, descricao: '27,5%' }
      ],
      descontoSimplificadoIRRF: { chave: 'descontoSimplificadoIRRF', label: 'Desconto Simplificado IRRF', valor: 528.00, unidade: 'reais', descricao: 'IN RFB 2.141/2023' }
    }

    // ─── 2026 — adicionar aqui quando publicado ────────────────────────────────
    // 2026: { ... }
  };

  // Ano máximo com tabela oficial no catálogo
  var ANO_MAIS_RECENTE = 2025;

  // ════════════════════════════════════════════════════════════════════════════
  // API pública
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Retorna a tabela oficial para um ano específico.
   * @param {number} ano
   * @returns {object|null}
   */
  function obterTabelaOficial(ano) {
    return TABELAS_OFICIAIS[ano] || null;
  }

  /**
   * Lista os anos disponíveis no catálogo oficial, em ordem decrescente.
   */
  function listarAnosDisponiveis() {
    return Object.keys(TABELAS_OFICIAIS)
      .map(Number)
      .sort(function(a, b) { return b - a; });
  }

  /**
   * Aplica a tabela oficial de um ano ao JSON de encargos da org.
   * Campos com override manual NÃO são sobrescritos.
   * @param {string} orgId
   * @param {number} ano — default: ANO_MAIS_RECENTE
   * @param {string} email — executor (ou 'sistema' para trigger automático)
   * @returns {object} { ok, anoAplicado, itensAtualizados, doc }
   */
  function atualizarParaAno(orgId, ano, email) {
    var anoAlvo = Number(ano) || ANO_MAIS_RECENTE;
    var tabela  = TABELAS_OFICIAIS[anoAlvo];
    if (!tabela) throw new Error('Tabela oficial não encontrada para o ano ' + anoAlvo + '. Anos disponíveis: ' + listarAnosDisponiveis().join(', '));

    var doc     = EncargosRepository.aplicarTabelaOficial(orgId, tabela, email || 'sistema');
    var hist    = (doc.historico || [])[0] || {};
    var itensN  = (hist.itens || []).length;

    Logger.info('encargos_engine', 'atualizarParaAno', 'Org ' + orgId + ' → ano ' + anoAlvo + ' (' + itensN + ' itens)');
    return { ok: true, anoAplicado: anoAlvo, itensAtualizados: itensN, doc: doc };
  }

  /**
   * Verifica se a tabela do ano corrente já está aplicada.
   * Usado pelo trigger mensal para evitar re-aplicação desnecessária.
   * @returns {{ precisaAtualizar, anoAtivo, anoDisponivel }}
   */
  function verificarNecessidadeAtualizacao(orgId) {
    var anoDisponivel = ANO_MAIS_RECENTE;
    try {
      var doc = EncargosRepository.obter(orgId);
      var anoAtivo = doc ? (doc.anoAtivo || 0) : 0;
      return {
        precisaAtualizar: anoAtivo < anoDisponivel,
        anoAtivo:         anoAtivo,
        anoDisponivel:    anoDisponivel
      };
    } catch (e) {
      return { precisaAtualizar: true, anoAtivo: 0, anoDisponivel: anoDisponivel };
    }
  }

  /**
   * Ponto de entrada do trigger automático (chamado pelo GAS ScriptApp trigger).
   * Aplica apenas se o ano disponível for mais recente que o ativo.
   * Idempotente — seguro chamar múltiplas vezes.
   */
  function executarAtualizacaoAutomatica(orgId) {
    try {
      var status = verificarNecessidadeAtualizacao(orgId);
      if (!status.precisaAtualizar) {
        Logger.info('encargos_engine', 'executarAtualizacaoAutomatica',
          'Tabela já está no ano ' + status.anoAtivo + ' — nenhuma ação necessária.');
        return { ok: true, acao: 'nenhuma', motivo: 'ja_atualizado', anoAtivo: status.anoAtivo };
      }
      var resultado = atualizarParaAno(orgId, status.anoDisponivel, 'trigger_automatico');
      return Object.assign(resultado, { acao: 'atualizado' });
    } catch (e) {
      Logger.error('encargos_engine', 'executarAtualizacaoAutomatica', e.message);
      return { ok: false, erro: e.message };
    }
  }

  /**
   * Retorna parâmetros de RH completos fundindo config_org.json com encargos.json.
   * Este método é o ponto de integração com ponto_engine._getParametrosRH().
   * Os encargos do JSON têm prioridade sobre os defaults de config_service.
   *
   * @param {string} orgId
   * @returns {object} — mesma estrutura que SistemaConfigService.getParametrosRH()
   */
  function getParametrosRHComEncargos(orgId) {
    // Base: parâmetros de RH do config_service (benefícios, horas, etc.)
    var base = {};
    try { base = SistemaConfigService.getParametrosRH() || {}; } catch (_) {}

    // Encargos efetivos (manual tem prioridade)
    var enc = {};
    try { enc = EncargosRepository.obterAliquotasEfetivas(orgId); } catch (_) {}

    // Merge: encargos sobrepõem defaults
    return Object.assign({}, base, {
      aliquota_fgts:   enc.fgts          || base.aliquota_fgts   || 0.08,
      aliquota_pis:    enc.pisPasep       || base.aliquota_pis    || 0.01,
      tabela_inss:     enc.tabelaINSS && enc.tabelaINSS.length
                         ? enc.tabelaINSS
                         : (base.tabela_inss || []),
      // Campos extras disponibilizados ao ponto_engine
      aliquota_inss_patronal: enc.inssPatronal || 0.20,
      aliquota_sat:           enc.sat          || 0.01,
      aliquota_sistema_s:     enc.sistemaS     || 0.0566,
      salario_minimo:         enc.salarioMinimo || 1518.00,
      tabela_irrf:            enc.tabelaIRRF   || [],
      desconto_simplificado_irrf: enc.descontoSimplificadoIRRF || 528.00,
      _encargos_ano_ativo:    enc.anoAtivo     || 2025
    });
  }

  // ── API pública ───────────────────────────────────────────────────────────────

  return {
    obterTabelaOficial:              obterTabelaOficial,
    listarAnosDisponiveis:           listarAnosDisponiveis,
    atualizarParaAno:                atualizarParaAno,
    verificarNecessidadeAtualizacao: verificarNecessidadeAtualizacao,
    executarAtualizacaoAutomatica:   executarAtualizacaoAutomatica,
    getParametrosRHComEncargos:      getParametrosRHComEncargos,
    ANO_MAIS_RECENTE:                ANO_MAIS_RECENTE
  };

})();
