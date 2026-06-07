/**
 * @file modules/acervo/acervo_engine.gs
 * @layer modules/acervo
 * @description Engine de Acervo Digital.
 *
 * Responsabilidades:
 *   - Upload de arquivos ao Google Drive (pasta por Ação)
 *   - Registro de metadados + status LGPD
 *   - Checklist de evidências para prestação de contas
 *   - Exportação ZIP via DriveApp (lista de URLs para download)
 *   - Integração com ExportacaoEngine (CODIP/SALIC) para evidências
 *
 * @depends acervo_repository.gs, core/services/auditoria_service.gs,
 *          core/event_bus_backend.gs, core/events_constants.gs,
 *          core/utils.gs, core/logger.gs
 */

var AcervoEngine = (function () {

  function _getPastaBase() {
    var nome = getOrgConfig().nome || 'ORG';
    return nome + '_Acervo';
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  /**
   * Registra um arquivo no acervo.
   * Quando base64Data é fornecido, faz upload ao Drive.
   * Quando urlDrive é fornecido, apenas registra os metadados.
   *
   * @param {string} orgId
   * @param {Object} dados — { acaoId, acaoNome, tipo, descricao, tags[], statusLGPD,
   *                           base64Data, mimeType, nomeArquivo }
   * @param {string} emailUsuario
   */
  function registrar(orgId, dados, emailUsuario) {
    _validar(dados);

    var urlDrive   = dados.urlDrive   || '';
    var thumbnail  = dados.thumbnail  || '';
    var tamanho    = dados.tamanho    || 0;
    var mimeType   = dados.mimeType   || 'application/octet-stream';

    // Upload para Drive quando base64 fornecido
    if (dados.base64Data && !urlDrive) {
      var upload = _uploadDrive(orgId, dados.acaoId, dados.nomeArquivo || 'arquivo', dados.base64Data, mimeType);
      urlDrive  = upload.url;
      tamanho   = upload.tamanho;
    }

    var item = {
      id:           gerarId('ACR'),
      orgId:        orgId,
      nome:         dados.nome     || '',
      acaoId:       dados.acaoId   || '',
      acaoNome:     dados.acaoNome || '',
      tipo:         dados.tipo     || 'outro',
      descricao:    dados.descricao || '',
      tags:         dados.tags     || [],
      statusLGPD:   dados.statusLGPD || 'nao_verificado',
      autorizadoPor:'',
      urlDrive:     urlDrive,
      thumbnail:    thumbnail,
      tamanho:      tamanho,
      mimeType:     mimeType,
      criadoPor:    emailUsuario
    };

    AuditoriaService.registrar('acervo_registrado', 'acervo', {
      id: item.id, tipo: item.tipo, acaoId: item.acaoId, emailUsuario: emailUsuario
    });

    SystemEvents.emit(SystemEventTypes.ACERVO_ARQUIVO_ADICIONADO, {
      itemId: item.id, acaoId: item.acaoId, orgId: orgId,
      tipo: item.tipo, emailUsuario: emailUsuario
    });

    return AcervoRepository.salvar(item);
  }

  /**
   * Atualiza metadados de um arquivo do acervo.
   */
  function atualizar(orgId, id, dados, emailUsuario) {
    var item = AcervoRepository.buscarPorId(orgId, id);
    if (!item) throw new Error('Arquivo não encontrado: ' + id);

    item.nome       = dados.nome       !== undefined ? dados.nome : (item.nome || '');
    item.tipo       = dados.tipo       || item.tipo;
    item.acaoId     = dados.acaoId     !== undefined ? dados.acaoId : (item.acaoId || '');
    item.acaoNome   = dados.acaoNome   !== undefined ? dados.acaoNome : (item.acaoNome || '');
    item.urlDrive   = dados.urlDrive   !== undefined ? dados.urlDrive : (item.urlDrive || '');
    item.statusLGPD = dados.statusLGPD || item.statusLGPD;
    item.descricao  = dados.descricao  !== undefined ? dados.descricao : (item.descricao || '');
    item.tags       = dados.tags       || item.tags;

    AuditoriaService.registrar('acervo_atualizado', 'acervo', {
      id: id, emailUsuario: emailUsuario
    });
    return AcervoRepository.salvar(item);
  }

  /**
   * Atualiza status LGPD de um arquivo.
   */
  function atualizarStatusLGPD(orgId, id, statusLGPD, autorizadoPor, emailUsuario) {
    var item = AcervoRepository.buscarPorId(orgId, id);
    if (!item) throw new Error('Arquivo não encontrado: ' + id);
    if (AcervoRepository.STATUS_LGPD.indexOf(statusLGPD) === -1) {
      throw new Error('Status LGPD inválido: ' + statusLGPD);
    }
    item.statusLGPD   = statusLGPD;
    item.autorizadoPor = autorizadoPor || '';

    AuditoriaService.registrar('acervo_lgpd_atualizado', 'acervo', {
      id: id, statusLGPD: statusLGPD, emailUsuario: emailUsuario
    });
    return AcervoRepository.salvar(item);
  }

  /**
   * Remove arquivo do acervo (e do Drive se possível).
   */
  function excluir(orgId, id, emailUsuario) {
    var item = AcervoRepository.buscarPorId(orgId, id);
    if (!item) throw new Error('Arquivo não encontrado: ' + id);

    // Tentar remover do Drive
    if (item.urlDrive) {
      try {
        var fileId = _extrairFileId(item.urlDrive);
        if (fileId) DriveApp.getFileById(fileId).setTrashed(true);
      } catch(e) {
        Logger.warn('acervo', 'excluir', 'Não foi possível remover do Drive: ' + e.message);
      }
    }

    AuditoriaService.registrar('acervo_excluido', 'acervo', {
      id: id, emailUsuario: emailUsuario
    });
    AcervoRepository.excluir(orgId, id);
    return { excluido: id };
  }

  // ─── Checklist e Exportação ───────────────────────────────────────────────

  /**
   * Retorna checklist de evidências de uma Ação.
   */
  function checklistEvidencias(orgId, acaoId) {
    return AcervoRepository.checklistEvidencias(orgId, acaoId);
  }

  /**
   * Gera lista de URLs de arquivos de uma Ação para download em ZIP.
   * (O ZIP real deve ser gerado no cliente ou via script separado.)
   * @returns {{ urls: string[], checklist: Object }}
   */
  function prepararExportacaoZip(orgId, acaoId) {
    var arquivos = AcervoRepository.listarPorAcao(orgId, acaoId);
    var urls = arquivos
      .filter(function(a) { return a.urlDrive; })
      .map(function(a) { return { id: a.id, tipo: a.tipo, descricao: a.descricao, url: a.urlDrive }; });
    return {
      acaoId:   acaoId,
      total:    arquivos.length,
      urls:     urls,
      checklist:AcervoRepository.checklistEvidencias(orgId, acaoId)
    };
  }

  // ─── Utilitários privados ─────────────────────────────────────────────────

  function _validar(dados) {
    if (!dados.nome || !String(dados.nome).trim()) throw new Error('Título/nome do arquivo é obrigatório.');
    if (!dados.tipo || AcervoRepository.TIPOS_VALIDOS.indexOf(dados.tipo) === -1) {
      throw new Error('Tipo inválido. Use: ' + AcervoRepository.TIPOS_VALIDOS.join(', '));
    }
    // acaoId é opcional — quando vazio indica conteúdo institucional
  }

  function _uploadDrive(orgId, acaoId, nomeArquivo, base64Data, mimeType) {
    try {
      var pasta = _obterOuCriarPasta(orgId, acaoId);
      var blob  = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, nomeArquivo);
      var file  = pasta.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return {
        url:     'https://drive.google.com/file/d/' + file.getId() + '/view',
        tamanho: file.getSize()
      };
    } catch(e) {
      Logger.warn('acervo', '_uploadDrive', e.message);
      return { url: '', tamanho: 0 };
    }
  }

  function _obterOuCriarPasta(orgId, acaoId) {
    var nomePastaBase = _getPastaBase() + '_' + orgId;
    var pastasBase    = DriveApp.getFoldersByName(nomePastaBase);
    var pastaBase     = pastasBase.hasNext() ? pastasBase.next() : DriveApp.createFolder(nomePastaBase);
    var nomePastaAcao = 'Acao_' + acaoId;
    var pastasAcao    = pastaBase.getFoldersByName(nomePastaAcao);
    return pastasAcao.hasNext() ? pastasAcao.next() : pastaBase.createFolder(nomePastaAcao);
  }

  function _extrairFileId(url) {
    var m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  }

  // ─── API Pública ──────────────────────────────────────────────────────────

  return {
    registrar:            registrar,
    atualizar:            atualizar,
    atualizarStatusLGPD:  atualizarStatusLGPD,
    excluir:              excluir,
    checklistEvidencias:  checklistEvidencias,
    prepararExportacaoZip:prepararExportacaoZip
  };

})();
