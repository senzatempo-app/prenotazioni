/**
 * Gestore Notifiche Email
 * Centralizza la creazione e l'invio di tutte le email del sistema.
 */

/**
 * Funzione interna per inviare email, gestendo errori comuni.
 * @private
 */
function _sendEmail(emailData) {
  try {
    MailApp.sendEmail(emailData);
  } catch (e) {
    console.warn(`Email non inviata a ${emailData.to}: ${e.message}`);
  }
}

/**
 * Controlla se le notifiche email sono abilitate nelle impostazioni.
 * @private
 */
function _isEmailEnabled(settings) {
  return settings.EMAIL_NOTIFICATION === true || settings.EMAIL_NOTIFICATION === "TRUE";
}

/**
 * Invia l'email di conferma prenotazione al cliente.
 */
function sendBookingConfirmationEmail(settings, clientData, bookingStart, serviceName, barber) {
  if (!_isEmailEnabled(settings) || !isValidClientEmail(clientData.email)) return;

  const mailTz = Session.getScriptTimeZone();
  const fullDate = formatDateItalian(bookingStart, mailTz, true, true);
  const subject = settings.EMAIL_CONFIRM_SUBJECT || "Conferma Appuntamento";
  const bodyTemplate = settings.EMAIL_CONFIRM_BODY || "";
  
  let body = bodyTemplate
    .replace(/\${clientName}/g, clientData.nome)
    .replace(/\${fullDate}/g, fullDate)
    .replace(/\${serviceName}/g, serviceName.replace(/_/g, ' '))
    .replace(/\${barberName}/g, barber.nome);

  _sendEmail({ to: clientData.email, subject: subject, htmlBody: body + getSalonContactFooter(settings) });
}

/**
 * Invia l'email di notifica al barbiere per una nuova prenotazione.
 */
function sendBarberBookingNotification(settings, barber, clientData, serviceName, start) {
  const enabled = settings.BARBER_BOOKING_NOTIFICATION === true || settings.BARBER_BOOKING_NOTIFICATION === "TRUE";
  if (!enabled || !barber || !isValidClientEmail(barber.email)) return;

  const mailTz = Session.getScriptTimeZone();
  const fullDate = formatDateItalian(start, mailTz, true, true);
  const subject = settings.BARBER_BOOKING_NOTIFICATION_SUBJECT || `Nuova prenotazione - ${serviceName || 'appuntamento'}`;
  const bodyTemplate = settings.BARBER_BOOKING_NOTIFICATION_BODY || "";

  const body = bodyTemplate
    .replace(/\$\{clientName\}/g, clientData.nome || '')
    .replace(/\$\{clientSurname\}/g, clientData.cognome || '')
    .replace(/\$\{clientPhone\}/g, clientData.telefono || 'N/D')
    .replace(/\$\{clientEmail\}/g, clientData.email || 'N/D')
    .replace(/\$\{fullDate\}/g, fullDate)
    .replace(/\$\{serviceName\}/g, (serviceName || '').replace(/_/g, ' '))
    .replace(/\$\{barberName\}/g, barber.nome || 'barbiere')
    .replace(/\$\{businessName\}/g, settings.BUSINESS_NAME || 'Il salone');

  _sendEmail({ to: barber.email, subject: subject, htmlBody: body + getSalonContactFooter(settings) });
}

/**
 * Invia l'email di cancellazione appuntamento al cliente.
 */
function sendCancellationEmail(settings, clientEmail, clientName, bookingStart, serviceName, barberName) {
  if (!_isEmailEnabled(settings) || !isValidClientEmail(clientEmail)) return;

  const fullDate = formatDateItalian(bookingStart, Session.getScriptTimeZone(), true, true);
  const subject = settings.EMAIL_CANCEL_SUBJECT || "Annullamento Appuntamento";
  const bodyTemplate = settings.EMAIL_CANCEL_BODY || "";
  let body = bodyTemplate
    .replace(/\${clientName}/g, clientName.split(' ')[0])
    .replace(/\${fullDate}/g, fullDate)
    .replace(/\${serviceName}/g, serviceName.replace(/_/g, ' '))
    .replace(/\${barberName}/g, barberName);

  _sendEmail({ to: clientEmail, subject: subject, htmlBody: body + getSalonContactFooter(settings) });
}

/**
 * Invia l'email di modifica appuntamento al cliente.
 */
function sendModificationEmail(settings, clientEmail, clientName, oldStart, newStart, serviceName, barberName) {
  if (!_isEmailEnabled(settings) || !isValidClientEmail(clientEmail)) return;

  const oldFullDate = formatDateItalian(oldStart, Session.getScriptTimeZone(), true, true);
  const newFullDate = formatDateItalian(newStart, Session.getScriptTimeZone(), true, true);
  const subject = settings.EMAIL_MODIFIED_SUBJECT || "Modifica Appuntamento";
  const bodyTemplate = settings.EMAIL_MODIFIED_BODY || "";
  
  const body = bodyTemplate
    .replace(/\${clientName}/g, clientName.split(' ')[0])
    .replace(/\${oldFullDate}/g, oldFullDate)
    .replace(/\${newFullDate}/g, newFullDate)
    .replace(/\${serviceName}/g, serviceName.replace(/_/g, ' '))
    .replace(/\${barberName}/g, barberName);
    
  _sendEmail({ to: clientEmail, subject: subject, htmlBody: body + getSalonContactFooter(settings) });
}

/**
 * Invia l'email di richiesta cancellazione al barbiere.
 */
function sendCancellationRequestToBarber(settings, barber, bookingData, reason) {
  if (!barber || !isValidClientEmail(barber.email)) return;

  const start = new Date(bookingData[COL_BOOKING.ISO_START]);
  const fullDate = formatDateItalian(start, Session.getScriptTimeZone(), true, true);
  let subject = settings.EMAIL_BARBER_CANCEL_REQ_SUBJECT || "Richiesta di Annullamento";
  const bodyTemplate = settings.EMAIL_BARBER_CANCEL_REQ_BODY || "";
  const replacements = {
    '${clientName}': bookingData[COL_BOOKING.CLIENT_NAME],
    '${fullDate}': fullDate,
    '${serviceName}': bookingData[COL_BOOKING.SERVICE].replace(/_/g, ' '),
    '${barberName}': barber.nome,
    '${reason}': reason,
  };
  let body = bodyTemplate;
  Object.keys(replacements).forEach(key => {
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    body = body.replace(regex, replacements[key]);
    subject = subject.replace(regex, replacements[key]);
  });

  _sendEmail({ to: barber.email, subject: subject, htmlBody: body + getSalonContactFooter(settings) });
}

/**
 * Invia l'email di promemoria al cliente.
 */
function sendReminderEmail(settings, clientEmail, clientName, bookingStart, serviceName, barberName) {
  if (!_isEmailEnabled(settings) || !isValidClientEmail(clientEmail)) return;
  
  const fullDate = formatDateItalian(bookingStart, Session.getScriptTimeZone(), true, true);
  const subject = settings.EMAIL_REMINDER_SUBJECT || "Promemoria Appuntamento";
  const bodyTemplate = settings.EMAIL_REMINDER_BODY || "";
  let body = bodyTemplate
    .replace(/\${clientName}/g, clientName.split(' ')[0])
    .replace(/\${fullDate}/g, fullDate)
    .replace(/\${serviceName}/g, serviceName.replace(/_/g, ' '))
    .replace(/\${barberName}/g, barberName);

  _sendEmail({ to: clientEmail, subject: subject, htmlBody: body + getSalonContactFooter(settings) });
}

/**
 * Funzione principale eseguita dal trigger a tempo per inviare i promemoria.
 * Sostituisce la vecchia `sendReminderEmails` che non veniva trovata.
 */
function checkAndSendReminders() {
  const settings = getSettings();
  if (!_isEmailEnabled(settings)) {
    console.log("Invio promemoria disabilitato dalle impostazioni globali.");
    return;
  }

  const sheet = getSs().getSheetByName('Bookings');
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  const reminderHours = parseInt(settings.REMINDER_NOTIFICATION_TIME, 10) || 24;
  const triggerIntervalHours = 6; // L'intervallo del tuo trigger

  const barbers = getBarbersList();
  const clientsSheet = getSs().getSheetByName('Clients');
  const clientsData = clientsSheet.getDataRange().getValues();
  const clientsMap = new Map(clientsData.slice(1).map(r => [r[COL_CLIENT.ID], r]));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = (row[COL_BOOKING.STATUS] || "").toLowerCase();
    const reminderSent = row[COL_BOOKING.REMINDER_SENT];
    const start = new Date(row[COL_BOOKING.ISO_START]);

    // Controlla solo appuntamenti confermati o settimanali, futuri e per cui non è stato inviato un promemoria
    if ((status === 'confermato' || status === 'weekly' || status === 'richiesta cancellazione') && !reminderSent && start > now) {
      const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Invia se l'appuntamento è nella finestra temporale corretta
      // (es. tra 24 e 18 ore prima, se il trigger è ogni 6 ore)
      if (hoursUntil <= reminderHours && hoursUntil > (reminderHours - triggerIntervalHours)) {
        const clientId = row[COL_BOOKING.CLIENT_ID];
        const clientInfo = clientsMap.get(clientId);
        const barberInfo = barbers[row[COL_BOOKING.BARBER_ID]];

        if (clientInfo && barberInfo && isValidClientEmail(clientInfo[COL_CLIENT.EMAIL])) {
          console.log(`Invio promemoria per appuntamento ${row[COL_BOOKING.ID]} a ${clientInfo[COL_CLIENT.EMAIL]}`);
          sendReminderEmail(
            settings,
            clientInfo[COL_CLIENT.EMAIL],
            row[COL_BOOKING.CLIENT_NAME],
            start,
            row[COL_BOOKING.SERVICE],
            barberInfo.nome
          );
          // Segna il promemoria come inviato nel foglio di calcolo
          sheet.getRange(i + 1, COL_BOOKING.REMINDER_SENT + 1).setValue(new Date().toISOString());
        }
      }
    }
  }
}

/**
 * Invia l'email di conferma per un appuntamento settimanale.
 */
function sendWeeklyConfirmationEmail(settings, clientEmail, clientName, dayName, timeStr, serviceName, barberName, firstOccurrence) {
    if (!_isEmailEnabled(settings) || !isValidClientEmail(clientEmail)) return;

    const subject = settings.EMAIL_WEEKLY_CONFIRM_SUBJECT || "";
    const bodyTemplate = settings.EMAIL_WEEKLY_CONFIRM_BODY || "";
    const replacements = { '${clientName}': clientName.split(' ')[0], '${dayName}': dayName, '${timeStr}': timeStr, '${serviceName}': serviceName.replace(/_/g, ' '), '${barberName}': barberName, '${firstDate}': firstOccurrence, '${emailFooter}': getSalonContactFooter(settings) };
    let body = bodyTemplate;
    let finalSubject = subject;
    Object.keys(replacements).forEach(key => {
        const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        body = body.replace(regex, replacements[key]);
        finalSubject = finalSubject.replace(regex, replacements[key]);
    });
    _sendEmail({ to: clientEmail, subject: finalSubject, htmlBody: body });
}

/**
 * Invia l'email di cancellazione per un'intera serie di appuntamenti settimanali.
 */
function sendWeeklyCancellationEmail(settings, clientEmail, clientName, dayName, timeStr, serviceName, barberName) {
    if (!_isEmailEnabled(settings) || !isValidClientEmail(clientEmail)) return;

    let subject = settings.EMAIL_WEEKLY_CANCEL_SUBJECT || "Cancellazione Appuntamento Fisso";
    const bodyTemplate = settings.EMAIL_WEEKLY_CANCEL_BODY || "";
    const replacements = {
        '${clientName}': clientName.split(' ')[0],
        '${dayName}': capitalizeFirst(dayName),
        '${timeStr}': timeStr,
        '${serviceName}': serviceName.replace(/_/g, ' '),
        '${barberName}': barberName,
    };
    let body = bodyTemplate;
    Object.keys(replacements).forEach(key => {
        const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        body = body.replace(regex, replacements[key]);
        subject = subject.replace(regex, replacements[key]);
    });
    _sendEmail({ to: clientEmail, subject: subject, htmlBody: body + getSalonContactFooter(settings) });
}

/**
 * Invia l'email di riconferma quando una richiesta di cancellazione viene rifiutata.
 */
function sendReconfirmationEmail(settings, clientEmail, clientName, bookingStart, serviceName, barberName) {
    if (!_isEmailEnabled(settings) || !isValidClientEmail(clientEmail)) return;

    const fullDate = formatDateItalian(bookingStart, Session.getScriptTimeZone(), true, true);
    const subject = settings.EMAIL_RECONFIRM_SUBJECT || "Appuntamento Riconfermato";
    const bodyTemplate = settings.EMAIL_RECONFIRM_BODY || "";
    let body = bodyTemplate.replace(/\${clientName}/g, clientName.split(' ')[0]).replace(/\${fullDate}/g, fullDate).replace(/\${serviceName}/g, serviceName.replace(/_/g, ' ')).replace(/\${barberName}/g, barberName);

    _sendEmail({ to: clientEmail, subject: subject, htmlBody: body + getSalonContactFooter(settings) });
}