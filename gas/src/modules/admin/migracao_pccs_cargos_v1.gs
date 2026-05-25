/**
 * @file migracao_pccs_cargos_v1.gs
 * @layer admin/migration
 * @description Migra os 131 cargos IDM do V1 para o PCCS ativo do V2.
 *              Idempotente: ignora cargos já existentes pelo nome (case-insensitive).
 *              Usa a tabelaSalarial do próprio plano PCCS ativo como fonte de salários;
 *              cai nos valores padrão IDM 2025 se o plano não tiver a tabela preenchida.
 *
 * @usage Executar no GAS Editor:
 *   fase16_migrarCargosPccsV1()   → importa cargos novos, ignora existentes
 *   fase16_resetarCargosPccs()    → CUIDADO: apaga todos os cargos e reimporta do zero
 *
 * @depends readJSON, writeJSON, modifyJSON (data_layer.gs)
 * @depends getOrgConfig (config_service.gs)
 * @depends AuditoriaService (auditoria_service.gs)
 */

// ── Tabela salarial padrão IDM 2025 (fallback se o plano não tiver a tabela) ──
var _MIG_SAL = {
  'FIXA_PISO':     [1747.16,1747.16,1747.16,1747.16,1747.16],
  'FIXA_A':        [1796.62,1931.37,2076.22,2231.94,2399.34],
  'FIXA_B':        [2219.82,2386.30,2565.27,2757.67,2964.50],
  'FIXA_C':        [2731.49,2936.35,3156.58,3393.32,3647.82],
  'FIXA_D':        [3350.18,3601.45,3871.55,4161.92,4474.07],
  'FIXA_E':        [4098.24,4405.61,4736.03,5091.24,5473.08],
  'FIXA_F':        [5002.76,5377.96,5781.31,6214.91,6681.03],
  'FIXA_G':        [6096.42,6553.65,7045.17,7573.56,8141.57],
  'FIXA_H':        [7418.78,7975.18,8573.32,9216.32,9907.55],
  'FIXA_I':        [9017.67,9694.00,10421.05,11202.63,12042.82],
  'FIXA_J':        [10950.94,11772.26,12655.18,13604.32,14624.65],
  'FIXA_K':        [13288.50,14285.13,15356.52,16508.26,17746.38],
  'FIXA_L':        [16114.89,17323.50,18622.76,20019.47,21520.93],
  'FIXA_M':        [19532.34,20997.27,22572.06,24264.97,26084.84],
  'FIXA_N':        [23664.46,25439.29,27347.24,29398.28,31603.15],
  'FIXA_O':        [28660.68,30810.24,33121.00,35605.08,38275.46],
  'FIXA_P':        [34701.73,37304.36,40102.19,43109.86,46343.09],
  'FIXA_Q':        [42006.11,45156.57,48543.31,52184.06,56097.86],
  'ORIENTADOR_F':  [5002.76,5377.96,5781.31,6214.91,6681.03],
  'ORIENTADOR_G':  [6096.42,6553.65,7045.17,7573.56,8141.57],
  'ORIENTADOR_H':  [7418.78,7975.18,8573.32,9216.32,9907.55],
  'ORIENTADOR_I':  [9017.67,9694.00,10421.05,11202.63,12042.82],
  'ORIENTADOR_J':  [10950.94,11772.26,12655.18,13604.32,14624.65],
  'ORIENTADOR_K':  [13288.50,14285.13,15356.52,16508.26,17746.38],
  'ORIENTADOR_L':  [16114.89,17323.50,18622.76,20019.47,21520.93],
  'ORIENTADOR_M':  [19532.34,20997.27,22572.06,24264.97,26084.84],
  'ORIENTADOR_N':  [23664.46,25439.29,27347.24,29398.28,31603.15],
  'ORIENTADOR_O':  [28660.68,30810.24,33121.00,35605.08,38275.46],
  'ORIENTADOR_P':  [34701.73,37304.36,40102.19,43109.86,46343.09],
  'ORIENTADOR_Q':  [42006.11,45156.57,48543.31,52184.06,56097.86]
};

// Mapa grupo V1 → tipo V2
var _MIG_TIPO = {
  'Gestão Estratégica': 'estrategico',
  'Gestão Tática':      'tatico',
  'Assessoramento':     'assessoramento',
  'Administrativo':     'administrativo',
  'Operacional':        'operacional'
};

/**
 * Importa cargos do V1 para o PCCS ativo do V2.
 * Idempotente: execuções repetidas não duplicam cargos.
 * @returns {{ ok, importados, ignorados, pccsId }}
 */
function fase16_migrarCargosPccsV1() {
  var orgId = getOrgConfig().orgId;
  var resultado = { ok: false, importados: 0, ignorados: 0, pccsId: null };

  modifyJSON('pccs.json', function(lista) {
    if (!Array.isArray(lista)) lista = [];

    // Encontrar plano ativo (ou qualquer plano da org)
    var pccs = lista.find(function(p) { return p.orgId === orgId && p.ativo; })
            || lista.find(function(p) { return p.orgId === orgId; });

    if (!pccs) throw new Error('Nenhum PCCS encontrado para orgId=' + orgId);

    if (!Array.isArray(pccs.cargos)) pccs.cargos = [];

    // Fonte de salários: plano ativo → fallback padrão IDM 2025
    var ts = (pccs.tabelaSalarial && typeof pccs.tabelaSalarial === 'object'
              && Object.keys(pccs.tabelaSalarial).length > 5)
             ? pccs.tabelaSalarial : _MIG_SAL;

    // Índice de nomes já existentes (case-insensitive)
    var existentes = {};
    pccs.cargos.forEach(function(c) { existentes[_normNome(c.nome)] = true; });

    _cargosV1IDM().forEach(function(v1) {
      var key = _normNome(v1.nome);
      if (existentes[key]) { resultado.ignorados++; return; }

      var salKey = v1.tipoClasse + '_' + v1.classe;
      var steps  = (ts[salKey] || _MIG_SAL[salKey] || [0,0,0,0,0]).slice();

      pccs.cargos.push({
        id:       gerarId('crg'),
        nome:     v1.nome,
        area:     v1.area,
        tipo:     _MIG_TIPO[v1.grupo] || 'operacional',
        grupo:    v1.grupo,
        descricao: v1.nome + ' — ' + v1.area,
        tabela:   steps.map(function(sal, i) {
          return {
            nivel:       v1.tipoClasse,
            classe:      v1.classe,
            referencia:  i + 1,
            salarioBase: Math.round(sal * 100) / 100
          };
        })
      });
      existentes[key] = true;
      resultado.importados++;
    });

    pccs.atualizadoEm = new Date().toISOString();
    resultado.ok     = true;
    resultado.pccsId = pccs.id;
    return lista;
  });

  AuditoriaService.registrar('PCCS_CARGOS_MIGRADOS_V1', 'admin', {
    pccsId: resultado.pccsId, importados: resultado.importados,
    ignorados: resultado.ignorados, orgId: orgId
  });
  Logger.log(JSON.stringify(resultado));
  return resultado;
}

/**
 * CUIDADO — apaga TODOS os cargos do PCCS ativo e reimporta do zero.
 * Útil para corrigir dados incorretos. Não afeta colaboradores vinculados.
 */
function fase16_resetarCargosPccs() {
  var orgId = getOrgConfig().orgId;

  modifyJSON('pccs.json', function(lista) {
    if (!Array.isArray(lista)) lista = [];
    var pccs = lista.find(function(p) { return p.orgId === orgId && p.ativo; })
            || lista.find(function(p) { return p.orgId === orgId; });
    if (!pccs) throw new Error('Nenhum PCCS encontrado para orgId=' + orgId);
    pccs.cargos = [];        // limpa
    pccs.atualizadoEm = new Date().toISOString();
    return lista;
  });

  Logger.log('fase16_resetarCargosPccs: cargos zerados — executando reimportação');
  return fase16_migrarCargosPccsV1();
}

// ── helpers ──────────────────────────────────────────────────────────────────

function _normNome(s) { return String(s || '').toLowerCase().trim(); }

/**
 * 131 cargos IDM extraídos do V1 (rh_engine.gs › _pccsCargosDefault).
 * Formato: [area, nome, classe, tipoClasse, grupo]
 */
function _cargosV1IDM() {
  var rows = [
    // ── Gestão Estratégica (13) ──────────────────────────────────────────
    ['Gestão Estratégica','Diretor Presidente','O','ORIENTADOR','Gestão Estratégica'],
    ['Gestão Estratégica','Diretor Administrativo-Financeiro','M','ORIENTADOR','Gestão Estratégica'],
    ['Gestão Estratégica','Diretor de Ação Cultural','M','ORIENTADOR','Gestão Estratégica'],
    ['Gestão Estratégica','Diretor de Formação','M','ORIENTADOR','Gestão Estratégica'],
    ['Gestão Estratégica','Superintendente','L','ORIENTADOR','Gestão Estratégica'],
    ['Gestão Estratégica','Gerente Executivo II','J','ORIENTADOR','Gestão Estratégica'],
    ['Gestão Estratégica','Gerente Executivo I','I','ORIENTADOR','Gestão Estratégica'],
    ['Gestão Estratégica','Assessor de Governança','J','ORIENTADOR','Assessoramento'],
    ['Gestão Estratégica','Assessor de Gestão Cultural e Artística','J','ORIENTADOR','Assessoramento'],
    ['Gestão Estratégica','Assessor de Gestão Executiva III','J','ORIENTADOR','Assessoramento'],
    ['Gestão Estratégica','Assessor de Gestão Executiva II','I','ORIENTADOR','Assessoramento'],
    ['Gestão Estratégica','Assessor de Gestão Executiva I','H','ORIENTADOR','Assessoramento'],
    ['Gestão Estratégica','Assessor de Diretoria','G','ORIENTADOR','Assessoramento'],
    // ── Comunicação e Marketing (12) ──────────────────────────────────────
    ['Comunicação e Marketing','Gerente de Comunicação e Marketing','I','ORIENTADOR','Gestão Tática'],
    ['Comunicação e Marketing','Coordenador de Marketing e Projetos','H','ORIENTADOR','Gestão Tática'],
    ['Comunicação e Marketing','Assessor de Marketing e Projetos','G','ORIENTADOR','Assessoramento'],
    ['Comunicação e Marketing','Analista de Marketing e Projetos','F','FIXA','Administrativo'],
    ['Comunicação e Marketing','Assistente de Marketing e Projetos','D','FIXA','Administrativo'],
    ['Comunicação e Marketing','Coordenador de Comunicação','H','ORIENTADOR','Gestão Tática'],
    ['Comunicação e Marketing','Assessor de Comunicação','G','ORIENTADOR','Assessoramento'],
    ['Comunicação e Marketing','Analista de Comunicação III','F','FIXA','Administrativo'],
    ['Comunicação e Marketing','Analista de Comunicação II','E','FIXA','Administrativo'],
    ['Comunicação e Marketing','Analista de Comunicação I','D','FIXA','Administrativo'],
    ['Comunicação e Marketing','Assistente de Comunicação','C','FIXA','Administrativo'],
    // ── Inovação e TI (8) ──────────────────────────────────────────────
    ['Inovação e TI','Gerente de Inovação e TI','J','ORIENTADOR','Gestão Tática'],
    ['Inovação e TI','Coordenador de Inovação','H','ORIENTADOR','Gestão Tática'],
    ['Inovação e TI','Assessor de Inovação','G','ORIENTADOR','Assessoramento'],
    ['Inovação e TI','Analista de Processos e Requisitos','D','FIXA','Administrativo'],
    ['Inovação e TI','Coordenador de Infraestrutura e Serviços de TI','I','ORIENTADOR','Gestão Tática'],
    ['Inovação e TI','Analista de Suporte em TI II','E','FIXA','Administrativo'],
    ['Inovação e TI','Analista de Suporte em TI I','D','FIXA','Administrativo'],
    ['Inovação e TI','Assistente de TI','C','FIXA','Administrativo'],
    // ── Monitoramento e Controle (8) ──────────────────────────────────────
    ['Monitoramento e Controle','Gerente de Monitoramento e Controle','J','ORIENTADOR','Gestão Tática'],
    ['Monitoramento e Controle','Coordenador de Monitoramento','H','ORIENTADOR','Gestão Tática'],
    ['Monitoramento e Controle','Analista de Monitoramento','D','FIXA','Administrativo'],
    ['Monitoramento e Controle','Assistente de Monitoramento','C','FIXA','Administrativo'],
    ['Monitoramento e Controle','Coordenador de Prestação de Contas','H','ORIENTADOR','Gestão Tática'],
    ['Monitoramento e Controle','Supervisor de Prestação de Contas','E','FIXA','Administrativo'],
    ['Monitoramento e Controle','Analista de Prestação de Contas','D','FIXA','Administrativo'],
    ['Monitoramento e Controle','Assistente de Prestação de Contas','C','FIXA','Administrativo'],
    // ── Administrativo Financeiro (27) ────────────────────────────────────
    ['Administrativo Financeiro','Gerente Administrativo-Financeiro','J','ORIENTADOR','Gestão Tática'],
    ['Administrativo Financeiro','Coordenador de Compras','H','ORIENTADOR','Gestão Tática'],
    ['Administrativo Financeiro','Supervisor de Compras','F','FIXA','Administrativo'],
    ['Administrativo Financeiro','Analista de Compras','D','FIXA','Administrativo'],
    ['Administrativo Financeiro','Assistente de Compras','C','FIXA','Administrativo'],
    ['Administrativo Financeiro','Coordenador de Contratos','H','ORIENTADOR','Gestão Tática'],
    ['Administrativo Financeiro','Analista de Contratos','E','FIXA','Administrativo'],
    ['Administrativo Financeiro','Coordenador de Controle Interno','H','ORIENTADOR','Gestão Tática'],
    ['Administrativo Financeiro','Analista de Controle Interno','D','FIXA','Administrativo'],
    ['Administrativo Financeiro','Assistente de Controle Interno','B','FIXA','Administrativo'],
    ['Administrativo Financeiro','Coordenador Financeiro','H','ORIENTADOR','Gestão Tática'],
    ['Administrativo Financeiro','Supervisor Financeiro','F','FIXA','Administrativo'],
    ['Administrativo Financeiro','Analista Financeiro','D','FIXA','Administrativo'],
    ['Administrativo Financeiro','Coordenador de Tesouraria','H','ORIENTADOR','Gestão Tática'],
    ['Administrativo Financeiro','Analista de Tesouraria','E','FIXA','Administrativo'],
    ['Administrativo Financeiro','Assistente de Tesouraria','D','FIXA','Administrativo'],
    ['Administrativo Financeiro','Auxiliar de Tesouraria','A','FIXA','Administrativo'],
    ['Administrativo Financeiro','Coordenador Administrativo-Financeiro','H','ORIENTADOR','Gestão Tática'],
    ['Administrativo Financeiro','Supervisor Administrativo-Financeiro','F','FIXA','Administrativo'],
    ['Administrativo Financeiro','Analista Administrativo III','E','FIXA','Administrativo'],
    ['Administrativo Financeiro','Analista Administrativo II','D','FIXA','Administrativo'],
    ['Administrativo Financeiro','Analista Administrativo I','C','FIXA','Administrativo'],
    ['Administrativo Financeiro','Secretário','D','FIXA','Administrativo'],
    ['Administrativo Financeiro','Assistente Administrativo','A','FIXA','Administrativo'],
    ['Administrativo Financeiro','Auxiliar Administrativo','PISO','FIXA','Administrativo'],
    // ── Segurança e Infraestrutura (12) ───────────────────────────────────
    ['Segurança e Infraestrutura','Gerente Segurança e Infraestrutura','I','ORIENTADOR','Gestão Tática'],
    ['Segurança e Infraestrutura','Coordenador de Infraestrutura','H','ORIENTADOR','Gestão Tática'],
    ['Segurança e Infraestrutura','Supervisor de Infraestrutura','E','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Especialista de Infraestrutura','F','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Técnico de Infraestrutura','E','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Técnico de Segurança do Trabalho','D','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Técnico de Conservação e Manutenção','C','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Assistente de Infraestrutura','D','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Assistente de Conservação e Manutenção','B','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Eletricista','B','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Auxiliar de Serviços Gerais','PISO','FIXA','Administrativo'],
    ['Segurança e Infraestrutura','Jardineiro','PISO','FIXA','Administrativo'],
    // ── Gestão de Pessoas (8) ─────────────────────────────────────────────
    ['Gestão de Pessoas','Gerente de Pessoas','I','ORIENTADOR','Gestão Tática'],
    ['Gestão de Pessoas','Coordenador de Desenvolvimento Humano','G','ORIENTADOR','Gestão Tática'],
    ['Gestão de Pessoas','Analista de Desenvolvimento Humano','D','FIXA','Administrativo'],
    ['Gestão de Pessoas','Psicóloga Organizacional','D','FIXA','Administrativo'],
    ['Gestão de Pessoas','Assistente de Desenvolvimento Humano','B','FIXA','Administrativo'],
    ['Gestão de Pessoas','Coordenador de Departamento Pessoal','G','ORIENTADOR','Gestão Tática'],
    ['Gestão de Pessoas','Supervisor de Departamento Pessoal','E','FIXA','Administrativo'],
    ['Gestão de Pessoas','Analista de Departamento Pessoal','D','FIXA','Administrativo'],
    ['Gestão de Pessoas','Assistente de Departamento Pessoal','B','FIXA','Administrativo'],
    // ── Articulação e Cidadania (10) ──────────────────────────────────────
    ['Articulação e Cidadania','Gerente de Articulação Institucional','I','ORIENTADOR','Gestão Tática'],
    ['Articulação e Cidadania','Assessor de Articulação','H','ORIENTADOR','Assessoramento'],
    ['Articulação e Cidadania','Assessor de Cidadania Cultural','H','ORIENTADOR','Assessoramento'],
    ['Articulação e Cidadania','Coordenador de Cidadania Cultural','H','ORIENTADOR','Gestão Tática'],
    ['Articulação e Cidadania','Coordenador de Direitos Humanos','H','ORIENTADOR','Gestão Tática'],
    ['Articulação e Cidadania','Supervisor de Cidadania Cultural','F','FIXA','Operacional'],
    ['Articulação e Cidadania','Assistente Social','D','FIXA','Operacional'],
    ['Articulação e Cidadania','Técnico de Cidadania Cultural','D','FIXA','Operacional'],
    ['Articulação e Cidadania','Psicólogo Social','D','FIXA','Operacional'],
    ['Articulação e Cidadania','Educador Social','C','FIXA','Operacional'],
    ['Articulação e Cidadania','Articulador Comunitário','C','FIXA','Operacional'],
    // ── Ação Cultural e Produção (9) ──────────────────────────────────────
    ['Ação Cultural e Produção','Gerente de Ação Cultural','I','ORIENTADOR','Gestão Tática'],
    ['Ação Cultural e Produção','Coordenador de Ação Cultural','H','ORIENTADOR','Gestão Tática'],
    ['Ação Cultural e Produção','Supervisor de Ação Cultural','F','FIXA','Operacional'],
    ['Ação Cultural e Produção','Assistente de Ação Cultural','C','FIXA','Operacional'],
    ['Ação Cultural e Produção','Auxiliar de Ação Cultural','A','FIXA','Operacional'],
    ['Ação Cultural e Produção','Coordenador de Produção','H','ORIENTADOR','Gestão Tática'],
    ['Ação Cultural e Produção','Supervisor de Produção','F','FIXA','Operacional'],
    ['Ação Cultural e Produção','Produtor Cultural','D','FIXA','Operacional'],
    ['Ação Cultural e Produção','Assistente de Produção','B','FIXA','Operacional'],
    // ── Áreas Técnicas (15) ───────────────────────────────────────────────
    ['Áreas Técnicas','Coordenador Técnico','H','ORIENTADOR','Gestão Tática'],
    ['Áreas Técnicas','Produtor Audiovisual','F','FIXA','Operacional'],
    ['Áreas Técnicas','Produtor de Palco','F','FIXA','Operacional'],
    ['Áreas Técnicas','Técnico de Teatro','E','FIXA','Operacional'],
    ['Áreas Técnicas','Editor de TV e Vídeo','E','FIXA','Operacional'],
    ['Áreas Técnicas','Técnico de Audiovisual','D','FIXA','Operacional'],
    ['Áreas Técnicas','Técnico de Cinema','D','FIXA','Operacional'],
    ['Áreas Técnicas','Técnico de Som','D','FIXA','Operacional'],
    ['Áreas Técnicas','Técnico de Luz','D','FIXA','Operacional'],
    ['Áreas Técnicas','Técnico de Palco','D','FIXA','Operacional'],
    ['Áreas Técnicas','Assistente de Técnica','C','FIXA','Operacional'],
    ['Áreas Técnicas','Auxiliar Técnico','B','FIXA','Operacional'],
    ['Áreas Técnicas','Planetarista','B','FIXA','Operacional'],
    ['Áreas Técnicas','Projecionista','B','FIXA','Operacional'],
    ['Áreas Técnicas','Camareiro','A','FIXA','Operacional'],
    // ── Formação e Ação Educativa (29) ────────────────────────────────────
    ['Formação e Ação Educativa','Gerente de Formação','I','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Programa de Laboratórios','I','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Pesquisa e Desenvolvimento','I','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação III','I','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação II','H','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador Pedagógico','G','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação I','F','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Artes Visuais','H','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Audiovisual II','H','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Audiovisual I','F','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Cinema','H','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação Patrimonial','G','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Cultura Digital','F','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Dança II','H','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Dança I','F','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Música II','H','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Música I','F','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Teatro II','H','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Coordenador de Formação em Teatro I','F','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Secretaria Escolar','E','FIXA','Operacional'],
    ['Formação e Ação Educativa','Supervisor Pedagógico II','F','FIXA','Operacional'],
    ['Formação e Ação Educativa','Supervisor Pedagógico I','D','FIXA','Operacional'],
    ['Formação e Ação Educativa','Analista de Formação','E','FIXA','Operacional'],
    ['Formação e Ação Educativa','Assistente de Formação','D','FIXA','Operacional'],
    ['Formação e Ação Educativa','Professor de Música','C','FIXA','Operacional'],
    ['Formação e Ação Educativa','Professor de Dança','C','FIXA','Operacional'],
    ['Formação e Ação Educativa','Professor de Teatro','C','FIXA','Operacional'],
    ['Formação e Ação Educativa','Professor de Cultura Digital','C','FIXA','Operacional'],
    ['Formação e Ação Educativa','Professor de Audiovisual','C','FIXA','Operacional'],
    ['Formação e Ação Educativa','Auxiliar Pedagógico','A','FIXA','Operacional'],
    ['Formação e Ação Educativa','Atendente Escolar','PISO','FIXA','Operacional'],
    ['Formação e Ação Educativa','Coordenador de Ação Educativa','G','ORIENTADOR','Gestão Tática'],
    ['Formação e Ação Educativa','Assessor de Ação Educativa','F','ORIENTADOR','Operacional'],
    ['Formação e Ação Educativa','Supervisor de Ação Educativa','E','FIXA','Operacional'],
    ['Formação e Ação Educativa','Mediador Cultural II','D','FIXA','Operacional'],
    ['Formação e Ação Educativa','Mediador Cultural I','C','FIXA','Operacional'],
    ['Formação e Ação Educativa','Mediador Ambiental','C','FIXA','Operacional'],
    ['Formação e Ação Educativa','Assistente de Ação Educativa','B','FIXA','Operacional'],
    // ── Operação (9) ──────────────────────────────────────────────────────
    ['Operação','Coordenador de Operação','H','ORIENTADOR','Gestão Tática'],
    ['Operação','Supervisor de Operação','E','FIXA','Operacional'],
    ['Operação','Supervisor de Bilheteria','E','FIXA','Operacional'],
    ['Operação','Recepcionista Bilíngue','D','FIXA','Operacional'],
    ['Operação','Técnico de Operação','D','FIXA','Operacional'],
    ['Operação','Assistente de Operação','C','FIXA','Operacional'],
    ['Operação','Auxiliar de Operação','A','FIXA','Operacional'],
    ['Operação','Bilheteiro','A','FIXA','Operacional'],
    ['Operação','Recepcionista','PISO','FIXA','Operacional'],
    // ── Acervo e Patrimônio (15) ──────────────────────────────────────────
    ['Acervo e Patrimônio','Gerente de Museu','J','ORIENTADOR','Gestão Tática'],
    ['Acervo e Patrimônio','Coordenador de Museu','H','ORIENTADOR','Gestão Tática'],
    ['Acervo e Patrimônio','Coordenador de Conservação e Restauro','G','ORIENTADOR','Gestão Tática'],
    ['Acervo e Patrimônio','Coordenador de Pesquisa e Acervo','H','ORIENTADOR','Gestão Tática'],
    ['Acervo e Patrimônio','Supervisor de Museu','F','FIXA','Operacional'],
    ['Acervo e Patrimônio','Supervisor de Conservação e Restauro','F','FIXA','Operacional'],
    ['Acervo e Patrimônio','Supervisor de Pesquisa e Acervo','F','FIXA','Operacional'],
    ['Acervo e Patrimônio','Bibliotecário II','F','FIXA','Operacional'],
    ['Acervo e Patrimônio','Bibliotecário I','D','FIXA','Operacional'],
    ['Acervo e Patrimônio','Restaurador','F','FIXA','Operacional'],
    ['Acervo e Patrimônio','Museólogo','G','FIXA','Operacional'],
    ['Acervo e Patrimônio','Técnico de Conservação e Restauro','D','FIXA','Operacional'],
    ['Acervo e Patrimônio','Técnico de Pesquisa e Acervo','D','FIXA','Operacional'],
    ['Acervo e Patrimônio','Assistente de Pesquisa e Acervo','C','FIXA','Operacional'],
    ['Acervo e Patrimônio','Técnico de Biblioteca','B','FIXA','Operacional'],
    ['Acervo e Patrimônio','Atendente de Biblioteca','A','FIXA','Operacional'],
    // ── Cinema e Audiovisual (5) ──────────────────────────────────────────
    ['Cinema e Audiovisual','Coordenador de Planetário','H','ORIENTADOR','Gestão Tática'],
    ['Cinema e Audiovisual','Coordenador de Audiovisual','H','ORIENTADOR','Gestão Tática'],
    ['Cinema e Audiovisual','Coordenador de Cinema','H','ORIENTADOR','Gestão Tática'],
    ['Cinema e Audiovisual','Supervisor de Cinema','F','FIXA','Operacional'],
    ['Cinema e Audiovisual','Supervisor de Teatro','F','FIXA','Operacional'],
    // ── Esporte (5) ───────────────────────────────────────────────────────
    ['Esporte','Coordenador de Esporte e Lazer','H','ORIENTADOR','Gestão Tática'],
    ['Esporte','Educador Esportivo','F','FIXA','Operacional'],
    ['Esporte','Técnico Esportivo','E','FIXA','Operacional'],
    ['Esporte','Assistente Esportivo','D','FIXA','Operacional'],
    ['Esporte','Auxiliar Esportivo','B','FIXA','Operacional'],
    // ── Gastronomia (7) ───────────────────────────────────────────────────
    ['Gastronomia','Supervisor de Cozinha','F','FIXA','Operacional'],
    ['Gastronomia','Técnico de Cozinha','E','FIXA','Operacional'],
    ['Gastronomia','Nutricionista','D','FIXA','Operacional'],
    ['Gastronomia','Assistente de Cozinha','D','FIXA','Operacional'],
    ['Gastronomia','Auxiliar de Cozinha','B','FIXA','Operacional'],
    ['Gastronomia','Horticultor','B','FIXA','Operacional'],
    ['Gastronomia','Auxiliar de Estoque','A','FIXA','Operacional']
  ];
  return rows.map(function(r) {
    return { area: r[0], nome: r[1], classe: r[2], tipoClasse: r[3], grupo: r[4] };
  });
}
