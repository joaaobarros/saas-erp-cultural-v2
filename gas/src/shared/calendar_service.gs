/**
 * @file shared/calendar_service.gs
 * @layer shared
 * @description Serviço genérico de integração com Google Calendar.
 *   Usado pela vinculação manual de Reservas de Espaço, Reservas de Veículo
 *   e Ações ao Calendar (vínculo opcional, acionado pelo usuário — nunca automático).
 *
 *   Evento é criado no calendário da conta que publicou o app
 *   (executeAs: USER_DEPLOYING — mesmo padrão já usado em Reuniões/reuniao_engine.gs).
 *
 * @depends CalendarApp (scope calendar em appsscript.json), core/logger.gs
 */

var CalendarService = (function () {

  function _emailsValidos(lista) {
    return (lista || [])
      .filter(function (e) { return e && String(e).indexOf('@') !== -1; })
      .map(function (e) { return String(e).trim().toLowerCase(); })
      .filter(function (e, i, arr) { return arr.indexOf(e) === i; });
  }

  /**
   * Cria um evento no Calendar. Use diaTodo:true para entidades sem horário
   * (ex.: Ações, que têm apenas dataInicio/dataFim) — nesse caso `fim` é
   * exclusivo, conforme a API do CalendarApp.createAllDayEvent.
   * @param {Object} params — { titulo, descricao?, local?, inicio: Date, fim: Date,
   *                            convidados: string[], diaTodo?: boolean }
   * @returns {{ eventoId: string, convidados: string[] }}
   * @throws Error se a criação falhar — o chamador decide se propaga ao usuário.
   */
  function criarEvento(params) {
    var convidados = _emailsValidos(params.convidados);
    var opcoes = {
      location:    params.local || '',
      description: params.descricao || '',
      guests:      convidados.join(','),
      sendInvites: true
    };
    var evento = params.diaTodo
      ? CalendarApp.getDefaultCalendar().createAllDayEvent(params.titulo, params.inicio, params.fim, opcoes)
      : CalendarApp.getDefaultCalendar().createEvent(params.titulo, params.inicio, params.fim, opcoes);
    return { eventoId: evento.getId(), convidados: convidados };
  }

  /**
   * Atualiza um evento existente (título, horário, local, convidados adicionais).
   * Nunca remove convidados já presentes — apenas adiciona os que faltam.
   * @param {string} eventoId
   * @param {Object} params — { titulo?, descricao?, local?, inicio?, fim?, convidados?: string[], diaTodo?: boolean }
   * @returns {GoogleAppsScript.Calendar.CalendarEvent|null}
   */
  function atualizarEvento(eventoId, params) {
    var evento = CalendarApp.getDefaultCalendar().getEventById(eventoId);
    if (!evento) return null;
    if (params.titulo) evento.setTitle(params.titulo);
    if (params.inicio && params.fim) {
      if (params.diaTodo) evento.setAllDayDates(params.inicio, params.fim);
      else                evento.setTime(params.inicio, params.fim);
    }
    if (params.local !== undefined) evento.setLocation(params.local || '');
    if (params.descricao !== undefined) evento.setDescription(params.descricao || '');
    if (Array.isArray(params.convidados)) {
      var atuais = evento.getGuestList().map(function (g) { return g.getEmail(); });
      _emailsValidos(params.convidados).forEach(function (e) {
        if (atuais.indexOf(e) === -1) evento.addGuest(e);
      });
    }
    return evento;
  }

  /**
   * Exclui um evento do Calendar.
   * @param {string} eventoId
   * @returns {boolean} true se o evento existia e foi excluído (ou já não existia)
   */
  function excluirEvento(eventoId) {
    var evento = CalendarApp.getDefaultCalendar().getEventById(eventoId);
    if (evento) evento.deleteEvent();
    return true;
  }

  return {
    criarEvento:     criarEvento,
    atualizarEvento: atualizarEvento,
    excluirEvento:   excluirEvento
  };

})();
