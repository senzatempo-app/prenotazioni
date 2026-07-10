/**
 * Gestione Prenotazioni e Disponibilità (Zero-Gap Logic)
 * Versione Corretta e Ottimizzata
 */

/**
 * Riordina il foglio Bookings per data decrescente, mantenendo l'intestazione.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Il foglio da ordinare.
 */
function sortBookingsSheetByIsoStart(sheet) {
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  // Assume che la prima riga sia sempre l'intestazione
  const header = values[0];
  const dataRows = values.slice(1);

  // Ordina le righe di dati in base alla colonna ISO_START (indice 3) in ordine decrescente
  dataRows.sort((a, b) => {
    const aTime = new Date(a[COL_BOOKING.ISO_START]).getTime();
    const bTime = new Date(b[COL_BOOKING.ISO_START]).getTime();

    if (aTime === null && bTime === null) return 0;
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return bTime - aTime;
  });

  // Ricostruisce il foglio con l'intestazione e i dati ordinati
  sheet.clearContents(); // Pulisce il foglio
  sheet.getRange(1, 1, 1, header.length).setValues([header]); // Riscrive l'intestazione
  if (dataRows.length > 0) {
    sheet.getRange(2, 1, dataRows.length, dataRows[0].length).setValues(dataRows);
  }

  SpreadsheetApp.flush();
}

/**
 * Funzione interna per creare una riga di prenotazione.
 * Centralizza la logica di scrittura per appuntamenti e indisponibilità.
 * @private
 */
function _createBookingEntry(bookingData) {
  const { barberId, start, end, serviceName, clientName, clientId, clientEmail, clientPhone, status, note } = bookingData;
  const sheet = getSs().getSheetByName('Bookings');
  const duration = (end.getTime() - start.getTime()) / 60000;
  const tz = "Europe/Rome"; // Forza il fuso orario italiano per la scrittura su foglio
    const normalizedStatus = (status || '').toString().trim();
    let storedStatus = '';
    if (normalizedStatus) {
      if (normalizedStatus.toLowerCase() === 'indisponibile') {
        storedStatus = 'Indisponibile';
      } else {
        storedStatus = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1).toLowerCase();
      }
    }

  const bookingRow = [
    (storedStatus === 'Indisponibile' ? "IND_" : "BK_") + Date.now() + "_" + Math.floor(Math.random() * 1000),
    clientId, clientName, Utilities.formatDate(new Date(start), tz, "yyyy-MM-dd HH:mm"),
    storedStatus === 'Indisponibile' ? note : serviceName, duration, storedStatus, barberId, Utilities.formatDate(new Date(), tz, "dd/MM/yyyy HH:mm"), 
    "", // CANCELLATION_REASON
    "" // REMINDER_SENT
  ];
  sheet.appendRow(bookingRow);
  // La chiamata all'ordinamento è stata spostata dopo l'inserimento per garantire che il foglio sia sempre ordinato.
}

/**
 * Processa una nuova prenotazione standard.
 */
function processBooking(clientData, slotIso, serviceName, duration, barberId, suppressNotification = false) {
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(10000)) return { status: "ERROR", message: "LOCK_TIMEOUT" };
    
    const start = new Date(slotIso);
    const BARBIERI = getBarbersList();
    const barber = BARBIERI[barberId];

    if (!checkSlotAvailability(slotIso, duration, barberId)) {
      return { status: "SLOT_OCCUPIED" };
    }

    const clientSheet = getSs().getSheetByName('Clients');
    const clientsData = clientSheet.getDataRange().getValues();
    const searchEmail = (clientData.email || "").toLowerCase();
    const searchPhone = normalizePhone(clientData.telefono);
    
    const foundClient = clientsData.find(row =>
      (searchEmail && row[COL_CLIENT.EMAIL].toString().toLowerCase() === searchEmail) || 
      (searchPhone && normalizePhone(row[COL_CLIENT.PHONE]) === searchPhone)
    );
    
    let clientId = foundClient ? foundClient[COL_CLIENT.ID] : null;

    // LOGICA DURATA PERSONALIZZATA (ripristinata per coerenza)
    let effectiveDuration = parseInt(duration, 10);
    const services = getServices();
    const sStandard = services.find(s => s.name.toLowerCase() === "taglio");
    const clientConfig = getClientConfig(clientData.email || clientData.telefono);

    if (serviceName && serviceName.toLowerCase() === "taglio") {
        if (clientConfig && clientConfig.cutTime) {
            effectiveDuration = clientConfig.cutTime;
        }
    } else if (serviceName && serviceName.toLowerCase() === "taglio e barba") {
        // Se il cliente ha un tempo di taglio personalizzato, usiamo quello, altrimenti il tempo del servizio "Taglio" standard.
        const clientCutTime = (clientConfig && clientConfig.cutTime) ? clientConfig.cutTime : (sStandard ? sStandard.duration : 30);
        
        const sBeard = services.find(s => s.name.toLowerCase() === "barba");
        const beardDuration = sBeard ? sBeard.duration : 15; // Fallback a 15 min se il servizio "Barba" non esiste

        // La durata effettiva è la somma dei due.
        effectiveDuration = parseInt(clientCutTime, 10) + parseInt(beardDuration, 10);
    }
    // FINE LOGICA DURATA PERSONALIZZATA

    // Se l'ID cliente non è stato trovato (es. nuovo utente da dashboard), lo creiamo.
    // Altrimenti, lo usiamo per le statistiche.
    if (!clientId) {
      clientId = "DASH_" + Date.now();
    }

    _createBookingEntry({
      barberId: barberId,
      start: start,
      end: new Date(start.getTime() + effectiveDuration * 60000),
      serviceName: serviceName,
      clientName: `${clientData.nome} ${clientData.cognome}`,
      clientId: clientId,
      clientEmail: clientData.email,
      clientPhone: clientData.telefono,
      status: 'Confermato',
      note: serviceName
    });

    updateClientStats(clientId, start);

    // Spostato dopo l'aggiornamento delle statistiche per coerenza
    // Ora ordiniamo l'intero foglio dopo ogni inserimento.
    const sheet = getSs().getSheetByName('Bookings');
    sortBookingsSheetByIsoStart(sheet);
    const settings = getSettings();
    if (!suppressNotification) {
      sendBookingConfirmationEmail(settings, clientData, start, serviceName, barber);
      sendBarberBookingNotification(settings, barber, clientData, serviceName, start);
    }

    // Dopo aver creato l'appuntamento, recuperiamo la lista aggiornata per il cliente
    const updatedBookings = getUserBookings(clientData.email || clientData.telefono);

    return { status: "OK", updatedBookings: updatedBookings };

  } finally { lock.releaseLock(); }
}

/**
 * Recupera gli appuntamenti di un utente per la visualizzazione nel suo storico.
 */
function getUserBookings(identifier) {
  const now = new Date();
  const sheet = getSs().getSheetByName('Bookings');
  const data = sheet.getDataRange().getValues();

  syncExpiredCancellationRequests(sheet, data, now.getTime());

  const clientSheet = getSs().getSheetByName('Clients');
  const clientData = clientSheet.getDataRange().getValues();
  const services = getServices();
  const BARBIERI = getBarbersList();
  
  let searchEmail = identifier.includes('@') ? identifier.toLowerCase() : "";
  let searchPhone = !identifier.includes('@') ? normalizePhone(identifier) : "";
  
  const foundClient = clientData.find(row => 
    (searchEmail && row[COL_CLIENT.EMAIL].toString().toLowerCase() === searchEmail) || 
    (searchPhone && normalizePhone(row[COL_CLIENT.PHONE]) === searchPhone)
  );
  
  const clientId = foundClient ? foundClient[COL_CLIENT.ID] : null;
  if (!clientId) return [];

  const userBookings = [];

  for (let i = 1; i < data.length; i++) {
    const rawStatus = (data[i][COL_BOOKING.STATUS] || "").toString().trim();
    const status = rawStatus.toLowerCase();
    const validStatuses = ['confermato', 'richiesta cancellazione', 'weekly', 'w e e k l y', 'Weekly'];

    if (clientId && (data[i][COL_BOOKING.CLIENT_ID] || "").toString() === clientId.toString() && validStatuses.includes(status)) {
      const start = new Date(data[i][COL_BOOKING.ISO_START]);
      
      const serviceName = data[i][COL_BOOKING.SERVICE];
      const serviceData = services.find(s => s && s.name && s.name.toLowerCase() === serviceName.toLowerCase());
      
      userBookings.push({
        id: data[i][COL_BOOKING.ID],
        data: formatDateItalian(start, Session.getScriptTimeZone(), true, false),
        oraInizio: Utilities.formatDate(start, Session.getScriptTimeZone(), "HH:mm"), 
        servizio: data[i][COL_BOOKING.SERVICE],
        stato: rawStatus, 
        timestamp: start.getTime(), 
        barberName: BARBIERI[data[i][COL_BOOKING.BARBER_ID]]?.nome || "N/D", 
        imageUrl: serviceData ? serviceData.imageUrl : ""
      });
    }
  }

  return { status: "OK", data: userBookings.sort((a, b) => b.timestamp - a.timestamp) };
}

/**
 * Helper: Converte "Richiesta Cancellazione" in "Confermato" se l'appuntamento è passato.
 */
function syncExpiredCancellationRequests(sheet, data, nowMs) {
  let hasChanges = false;
  for (let i = 1; i < data.length; i++) {
    if ((data[i][COL_BOOKING.STATUS] || "").toLowerCase() === 'richiesta cancellazione' && new Date(data[i][COL_BOOKING.ISO_START]).getTime() < nowMs) {
      data[i][COL_BOOKING.STATUS] = 'Confermato';
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    const statusColumnValues = data.slice(1).map(row => [row[COL_BOOKING.STATUS]]);
    sheet.getRange(2, COL_BOOKING.STATUS + 1, statusColumnValues.length, 1).setValues(statusColumnValues);
  }
}

/**
 * Cancella un appuntamento.
 */
function cancelAppointment(bookingId, suppressNotification = false) {
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(10000)) return { status: "ERROR", message: "Timeout sistema." };

    const sheet = getSs().getSheetByName('Bookings');
    const data = sheet.getDataRange().getValues();
    const rowIndex = data.findIndex(row => row[COL_BOOKING.ID] === bookingId);

    if (rowIndex === -1) return { status: "ERROR", message: "Appuntamento non trovato." };

    const bData = data[rowIndex];
    sheet.deleteRow(rowIndex + 1); // Rimuove fisicamente la riga dal foglio

    const settings = getSettings(); // Carica le impostazioni
    if (!suppressNotification) {
      const clientSheet = getSs().getSheetByName('Clients');
      const clients = clientSheet.getDataRange().getValues();
      const cRow = clients.find(r => r[COL_CLIENT.ID] === bData[COL_BOOKING.CLIENT_ID]);

      if (cRow) {
        const BARBIERI = getBarbersList();
        const barberName = BARBIERI[bData[COL_BOOKING.BARBER_ID]]?.nome || "il tuo Barbiere";
        sendCancellationEmail(settings, cRow[COL_CLIENT.EMAIL], cRow[COL_CLIENT.NAME], new Date(bData[COL_BOOKING.ISO_START]), bData[COL_BOOKING.SERVICE], barberName);
      }
    }
    
    return { status: "OK", settings: settings };
  } finally { lock.releaseLock(); }
}

/**
 * Gestisce la decisione del barbiere su una richiesta di cancellazione.
 */
function handleCancellationDecision(bookingId, decision) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { status: "ERROR", message: "Sistema occupato, riprova." };

  try {
    const sheet = getSs().getSheetByName('Bookings');
    const data = sheet.getDataRange().getValues();
    const rowIndex = data.findIndex(row => row[COL_BOOKING.ID] === bookingId);

    if (rowIndex === -1) return { status: "ERROR", message: "Appuntamento non trovato." };

    const bookingData = data[rowIndex];
    const clientSheet = getSs().getSheetByName('Clients');
    const clientsData = clientSheet.getDataRange().getValues();
    const clientRow = clientsData.find(r => r[COL_CLIENT.ID] === bookingData[COL_BOOKING.CLIENT_ID]);
    const settings = getSettings();
    const BARBIERI = getBarbersList();
    const barber = BARBIERI[bookingData[COL_BOOKING.BARBER_ID]];

    if (decision === 'approve') {
      sheet.deleteRow(rowIndex + 1); // Rimuove la riga se la cancellazione è approvata
      if (clientRow) sendCancellationEmail(settings, clientRow[COL_CLIENT.EMAIL], clientRow[COL_CLIENT.NAME], new Date(bookingData[COL_BOOKING.ISO_START]), bookingData[COL_BOOKING.SERVICE], barber ? barber.nome : "N/D");
    } else { // 'reject'
      sheet.getRange(rowIndex + 1, COL_BOOKING.STATUS + 1).setValue('Confermato');
      if (clientRow) sendReconfirmationEmail(settings, clientRow[COL_CLIENT.EMAIL], clientRow[COL_CLIENT.NAME], new Date(bookingData[COL_BOOKING.ISO_START]), bookingData[COL_BOOKING.SERVICE], barber ? barber.nome : "N/D");
    }
    return { status: "OK" };
  } finally { lock.releaseLock(); }
}

/**
 * Aggiorna un appuntamento esistente (spostandolo).
 */
function updateAppointment(bookingId, newStartIso, newEndIso, serviceName, clientIdentifier, newBarberId) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { status: "ERROR", message: "Sistema occupato, riprova." };

  try {
    const sheet = getSs().getSheetByName('Bookings');
    const data = sheet.getDataRange().getValues();
    const rowIndex = data.findIndex(row => row[COL_BOOKING.ID] === bookingId);

    if (rowIndex === -1) return { status: "ERROR", message: "Appuntamento non trovato." };

    const oldBookingData = data[rowIndex];
    const oldStart = new Date(oldBookingData[COL_BOOKING.ISO_START]);

    // Verifica disponibilità nuovo slot
    const duration = (new Date(newEndIso).getTime() - new Date(newStartIso).getTime()) / 60000;
    if (!checkSlotAvailability(newStartIso, duration, newBarberId)) {
      return { status: "ERROR", message: "Il nuovo orario non è disponibile." };
    }

    const newStartDate = new Date(newStartIso);

    // Aggiorna i dati nella riga esistente
    sheet.getRange(rowIndex + 1, COL_BOOKING.ISO_START + 1).setValue(Utilities.formatDate(newStartDate, "Europe/Rome", "yyyy-MM-dd HH:mm"));
    sheet.getRange(rowIndex + 1, COL_BOOKING.BARBER_ID + 1).setValue(newBarberId);
    sheet.getRange(rowIndex + 1, COL_BOOKING.STATUS + 1).setValue('Confermato'); // Reimposta lo stato a Confermato

    // Riordina il foglio per data decrescente
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).sort({ column: COL_BOOKING.ISO_START + 1, ascending: false });

    // Invia notifica di modifica
    const settings = getSettings();
    const clientSheet = getSs().getSheetByName('Clients');
    const clientsData = clientSheet.getDataRange().getValues();
    const clientRow = clientsData.find(r => r[COL_CLIENT.ID] === oldBookingData[COL_BOOKING.CLIENT_ID]);

    if (clientRow) {
      const clientName = `${clientRow[COL_CLIENT.NAME]} ${clientRow[COL_CLIENT.SURNAME] || ''}`.trim();
      const clientEmail = clientRow[COL_CLIENT.EMAIL];
      const barbers = getBarbersList();
      const barberName = barbers[newBarberId] ? barbers[newBarberId].nome : "N/D";

      sendModificationEmail(settings, clientEmail, clientName, oldStart, newStartDate, serviceName, barberName);
    }

    return { status: "OK" };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Imposta un appuntamento settimanale.
 */
function saveWeeklyAppointment(clientIdentifier, dayName, timeStr, barberId, duration, serviceName, acceptedSuggestions = []) {
  const clientSheet = getSs().getSheetByName('Clients');
  const clientsData = clientSheet.getDataRange().getValues();
  const searchPhone = normalizePhone(clientIdentifier);
  const searchEmail = clientIdentifier.includes('@') ? clientIdentifier.toLowerCase() : "";

  const clientRow = clientsData.find(row => 
    (searchPhone && normalizePhone(row[COL_CLIENT.PHONE]) === searchPhone) || 
    (searchEmail && row[COL_CLIENT.EMAIL].toLowerCase() === searchEmail)
  );

  if (!clientRow) return { status: "Error", message: "Cliente non trovato nel database." };

  const clientId = clientRow[COL_CLIENT.ID];
  const clientName = `${clientRow[COL_CLIENT.NAME]} ${clientRow[COL_CLIENT.SURNAME] || ""}`.trim();
  const clientEmail = clientRow[COL_CLIENT.EMAIL] || "";
  const clientPhone = clientRow[COL_CLIENT.PHONE] || "";

  // LOGICA DURATA PERSONALIZZATA (come in processBooking)
  let effectiveDuration = parseInt(duration, 10);
  const services = getServices();
  const sStandard = services.find(s => s.name.toLowerCase() === "taglio");
  const clientConfig = getClientConfig(clientIdentifier);

  if (serviceName && serviceName.toLowerCase() === "taglio") {
      if (clientConfig && clientConfig.cutTime) {
          effectiveDuration = clientConfig.cutTime;
      }
  } else if (serviceName && serviceName.toLowerCase() === "taglio e barba") {
      // Se il cliente ha un tempo di taglio personalizzato, usiamo quello, altrimenti il tempo del servizio "Taglio" standard.
      const clientCutTime = (clientConfig && clientConfig.cutTime) ? clientConfig.cutTime : (sStandard ? sStandard.duration : 30);
      
      const sBeard = services.find(s => s.name.toLowerCase() === "barba");
      const beardDuration = sBeard ? sBeard.duration : 15; // Fallback a 15 min se il servizio "Barba" non esiste

      // La durata effettiva è la somma dei due.
      effectiveDuration = parseInt(clientCutTime, 10) + parseInt(beardDuration, 10);
  }
  // FINE LOGICA DURATA PERSONALIZZATA

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { status: "Error", message: "Timeout sistema." };

  try {
    if (Array.isArray(acceptedSuggestions) && acceptedSuggestions.length > 0) {
      const clientDataObj = { nome: clientRow[COL_CLIENT.NAME], cognome: clientRow[COL_CLIENT.SURNAME], email: clientEmail, telefono: clientPhone };
      acceptedSuggestions.forEach(s => {
        if (s && s.iso) {
          processBooking(clientDataObj, s.iso, serviceName, s.duration || effectiveDuration, s.barberId || barberId, false);
        }
      });
      SpreadsheetApp.flush();
    }

    const weeklySheet = getSs().getSheetByName('Weekly_Bookings');
    const weeklyBookingId = "WKL_" + Date.now();
    const firstOcc = calculateFirstValidWeeklyOccurrence(barberId, dayName, timeStr, effectiveDuration);
    
    weeklySheet.appendRow([
      weeklyBookingId, clientId, clientName, dayName.toLowerCase(), `${dayName.toLowerCase()} ${timeStr}`,
      serviceName, effectiveDuration, "Weekly", barberId, "", firstOcc ? firstOcc.iso : ""
    ]);
    SpreadsheetApp.flush();

    const generationResult = generateWeeklyInstances(weeklyBookingId, clientId, clientName, clientEmail, clientPhone, dayName, timeStr, serviceName, effectiveDuration, barberId, null, 4);
    
    // Ordina il foglio Bookings per mantenere la coerenza con gli appuntamenti standard
    const sheet = getSs().getSheetByName('Bookings');
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).sort({column: COL_BOOKING.ISO_START + 1, ascending: false});


    const settings = getSettings();
    const barbers = getBarbersList();
    const barber = barbers[barberId];
    const firstAppointmentSentence = firstOcc ? `Primo appuntamento ${firstOcc.formatted.replace(" alle ore ", " ore ")}.` : 'da definire.';
    sendWeeklyConfirmationEmail(settings, clientEmail, clientName, firstOcc ? firstOcc.formatted.split(' ')[0] : capitalizeFirst(dayName), timeStr, serviceName, barber ? barber.nome : "il tuo barbiere", firstAppointmentSentence);

    return {
      status: "OK",
      skipped: generationResult.skippedDates,
      firstDate: firstAppointmentSentence,
      updatedWeekly: getWeeklyBookingsList(),
      updatedAppointments: getBarberAppointments(barberId)
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Genera le istanze di un appuntamento settimanale nel foglio Bookings.
 */
function generateWeeklyInstances(weeklyId, clientId, clientName, clientEmail, clientPhone, dayName, timeStr, serviceName, duration, barberId, startDate, weeksToGenerate = 4) {
    const skippedDates = [];
    const now = new Date();
    const daysOfWeek = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    const targetDay = daysOfWeek.indexOf(dayName.toLowerCase());
    const time = parseTimeString(timeStr);
    const tz = Session.getScriptTimeZone();
    const generationStartDate = startDate || now;

    // Questo ciclo determina quante settimane di appuntamenti fissi vengono generate, usando il nuovo parametro.
    for (let w = 0; w < weeksToGenerate; w++) {
        let date = new Date(generationStartDate.getTime() + (w * 7 * 86400000));
        date.setDate(date.getDate() + (targetDay - date.getDay() + 7) % 7);
        const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.hours, time.minutes);
        if (start < now) continue;

        if (checkSlotAvailability(start.toISOString(), duration, barberId)) {
            _createBookingEntry({
                barberId: barberId,
                start: start,
                end: new Date(start.getTime() + duration * 60000),
                serviceName: serviceName,
                clientName: clientName,
                clientId: clientId,
                clientEmail: clientEmail,
                clientPhone: clientPhone,
                status: 'Weekly',
                note: `ID Fisso: ${weeklyId}`
            });
        } else {
            skippedDates.push(formatDateItalian(start, tz, true, true));
        }
    }
    return { skippedDates };
}

/**
 * Sincronizza e genera le istanze future degli appuntamenti settimanali.
 */
function syncWeeklyInstances() {
    const settings = getSettings();
    const refillWeeks = parseInt(settings.WEEKLY_REFILL_WEEKS, 10) || 2; // Default a 2 se non impostato

    const weeklyRules = getWeeklyBookingsList();
    if (weeklyRules.length === 0) return;

    const bookingsSheet = getSs().getSheetByName('Bookings');
    const allBookings = bookingsSheet.getDataRange().getValues();
    const clientsData = getSs().getSheetByName('Clients').getDataRange().getValues();
    const clientsMap = new Map(clientsData.slice(1).map(r => [r[COL_CLIENT.ID], r]));

    const now = new Date();
    const fourWeeksFromNow = new Date(now.getTime() + (4 * 7 * 86400000));

    weeklyRules.forEach(rule => {
        const ruleInstances = allBookings.filter(b => {
            const bookingStatus = (b[COL_BOOKING.STATUS] || '').toString().trim().toLowerCase();
            return bookingStatus === 'weekly' &&
                b[COL_BOOKING.CLIENT_ID] === rule.clientId &&
                b[COL_BOOKING.BARBER_ID] === rule.barberId;
        });

        let lastInstanceDate = new Date(0);
        if (ruleInstances.length > 0) {
            const latestTimestamp = Math.max(...ruleInstances.map(r => new Date(r[COL_BOOKING.ISO_START]).getTime()));
            lastInstanceDate = new Date(latestTimestamp);
        }

        if (lastInstanceDate < fourWeeksFromNow) {
            const clientInfo = clientsMap.get(rule.clientId);
            if (!clientInfo) return;

            const startDateForGeneration = new Date(lastInstanceDate > now ? lastInstanceDate.getTime() : now.getTime());
            startDateForGeneration.setDate(startDateForGeneration.getDate() + 1);

            generateWeeklyInstances(
                rule.id, rule.clientId, rule.clientName, clientInfo[COL_CLIENT.EMAIL], clientInfo[COL_CLIENT.PHONE],
                rule.dayName, rule.time, rule.service, rule.duration, rule.barberId,
                startDateForGeneration, refillWeeks
            );
        }
    });
}

/**
 * Recupera tutti gli appuntamenti per un barbiere specifico.
 */
function getBarberAppointments(barberId) {
  const sheet = getSs().getSheetByName('Bookings');
  const data = sheet.getDataRange().getValues();
  const settings = getSettings();
  const services = getServices();
  const clientsSheet = getSs().getSheetByName('Clients');
  const clientsData = clientsSheet.getDataRange().getValues();

  const clientLookup = new Map(clientsData.slice(1).map(r => [r[COL_CLIENT.ID], { phone: r[COL_CLIENT.PHONE] || "", email: (r[COL_CLIENT.EMAIL] || "").toLowerCase() }]));

  const barberAppointments = [];
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if ((row[COL_BOOKING.BARBER_ID] || "").toString().trim() === barberId.toString().trim()) {
      const status = (row[COL_BOOKING.STATUS] || "").toLowerCase();
      if (status !== 'cancellato') { // Carica tutto tranne ciò che è esplicitamente cancellato
        const start = parseItalianDateString(row[COL_BOOKING.ISO_START]);
        const diffDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        const isIndisponibilita = status === 'indisponibile';

        // Le indisponibilità devono comparire sempre nel calendario, anche se sono molto lontane nel tempo.
        // Manteniamo il filtro di finestra solo per appuntamenti e regole weekly.
        const isWithinWindow = isIndisponibilita || (diffDays <= historyDays && diffDays >= -(windowDays + 30));
        if (!isNaN(start.getTime())) {
          let serviceName = status === 'indisponibile' ? (row[COL_BOOKING.SERVICE] || settings.INDISPO_SERVICE_NAME || "Indisponibilità") : row[COL_BOOKING.SERVICE];
          if (typeof serviceName !== 'string') serviceName = "Servizio non definito"; // Aggiunto controllo di sicurezza
          const serviceData = services.find(s => s && s.name && s.name.toLowerCase() === serviceName.toLowerCase());
          const clientInfo = clientLookup.get(row[COL_BOOKING.CLIENT_ID]);

          barberAppointments.push({
            id: row[COL_BOOKING.ID],
            clientName: row[COL_BOOKING.CLIENT_NAME],
            service: serviceName,
            start: start.toISOString(),
            end: new Date(start.getTime() + (parseInt(row[COL_BOOKING.DURATION], 10) || 0) * 60000).toISOString(),
            status: row[COL_BOOKING.STATUS],
            imageUrl: serviceData ? serviceData.imageUrl : "",
            clientPhone: clientInfo ? clientInfo.phone : "",
            cancelReason: row[COL_BOOKING.CANCELLATION_REASON] || ""
          });
        }
      }
    }
  }
  return barberAppointments.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

/**
 * Recupera la lista delle regole degli appuntamenti fissi.
 */
function getWeeklyBookingsList() {
  const sheet = getSs().getSheetByName('Weekly_Bookings');
  const data = sheet.getDataRange().getValues();
  const weekly = [];
  for (let i = 1; i < data.length; i++) {
    weekly.push({
      id: data[i][COL_WEEKLY_BOOKING.ID],
      clientId: data[i][COL_WEEKLY_BOOKING.CLIENT_ID],
      clientName: data[i][COL_WEEKLY_BOOKING.CLIENT_NAME],
      dayName: data[i][COL_WEEKLY_BOOKING.DAY_NAME],
      time: (data[i][COL_WEEKLY_BOOKING.ISO_START] || "").split(' ')[1] || "",
      service: data[i][COL_WEEKLY_BOOKING.SERVICE],
      barberId: data[i][COL_WEEKLY_BOOKING.BARBER_ID],
      duration: data[i][COL_WEEKLY_BOOKING.DURATION],
      startDate: data[i][COL_WEEKLY_BOOKING.START_DATE]
    });
  }
  return weekly;
}

/**
 * Rimuove una regola di appuntamento settimanale e le relative istanze future.
 */
function removeWeeklyAppointment(bookingId) {
  const weeklySheet = getSs().getSheetByName('Weekly_Bookings');
  const weeklyData = weeklySheet.getDataRange().getValues();
  const rowIndex = weeklyData.findIndex(row => row[COL_WEEKLY_BOOKING.ID] === bookingId);

  if (rowIndex === -1) return { status: "Error", message: "Appuntamento non trovato o già rimosso." };
  
  const rowData = weeklyData[rowIndex];
  const clientId = rowData[COL_WEEKLY_BOOKING.CLIENT_ID];
  const clientName = rowData[COL_WEEKLY_BOOKING.CLIENT_NAME];
  const dayName = rowData[COL_WEEKLY_BOOKING.DAY_NAME];
  const timeStr = (rowData[COL_WEEKLY_BOOKING.ISO_START] || "").split(' ')[1] || "";
  const serviceName = rowData[COL_WEEKLY_BOOKING.SERVICE];
  const barberId = rowData[COL_WEEKLY_BOOKING.BARBER_ID];

  // Rimuovi le istanze future dal foglio Bookings
  const bookingsSheet = getSs().getSheetByName('Bookings');
  const bookingsData = bookingsSheet.getDataRange().getValues();
  const now = new Date();
  for (let i = bookingsData.length - 1; i >= 1; i--) {
    const bookingStatus = (bookingsData[i][COL_BOOKING.STATUS] || '').toString().trim().toLowerCase();
    if (bookingStatus === 'weekly' && 
        bookingsData[i][COL_BOOKING.CLIENT_ID] === clientId &&
        bookingsData[i][COL_BOOKING.BARBER_ID] === barberId &&
        new Date(bookingsData[i][COL_BOOKING.ISO_START]) > now) {
      bookingsSheet.deleteRow(i + 1);
    }
  }

  const clientSheet = getSs().getSheetByName('Clients');
  const clientsData = clientSheet.getDataRange().getValues();
  const clientRow = clientsData.find(r => r[COL_CLIENT.ID] === clientId);
  const clientEmail = clientRow ? clientRow[COL_CLIENT.EMAIL] : "";

  const settings = getSettings();
  const BARBIERI = getBarbersList();
  const barberName = BARBIERI[barberId] ? BARBIERI[barberId].nome : (settings.BUSINESS_NAME || "il tuo Barbiere");
  sendWeeklyCancellationEmail(settings, clientEmail, clientName, dayName, timeStr, serviceName, barberName);

  weeklySheet.deleteRow(rowIndex + 1);
  SpreadsheetApp.flush();

  return {
    status: "OK",
    updatedWeekly: getWeeklyBookingsList(),
    updatedAppointments: getBarberAppointments(barberId)
  };
}

/**
 * Crea una data locale a partire da un ISO date (yyyy-MM-dd) e un orario HH:mm.
 */
function createLocalDateFromIsoAndTime(dateIso, timeStr) {
  const [year, month, day] = dateIso.split('-').map(part => parseInt(part, 10));
  const time = parseTimeString(timeStr) || { hours: 0, minutes: 0 };
  return new Date(year, month - 1, day, time.hours, time.minutes, 0, 0);
}

/**
 * Crea una data locale a mezzanotte a partire da un ISO date (yyyy-MM-dd).
 */
function createLocalDateFromIso(dateIso) {
  const [year, month, day] = dateIso.split('-').map(part => parseInt(part, 10));
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Salva una singola indisponibilità.
 */
function saveIndisponibilita(barberId, dateIso, startTime, endTime, note) {
  const start = createLocalDateFromIsoAndTime(dateIso, startTime);
  const end = createLocalDateFromIsoAndTime(dateIso, endTime);
  const duration = (end.getTime() - start.getTime()) / 60000;

  if (duration <= 0) return;

  // Usa la nota (nome della festività) come nome cliente per chiarezza.
  const settings = getSettings(); // Carica le impostazioni
  const clientName = note || settings.INDISPO_CLIENT_NAME || "IMPEGNO PERSONALE";
  const serviceName = note || settings.INDISPO_SERVICE_NAME || "Indisponibilità";

  _createBookingEntry({
    barberId: barberId,
    start: start,
    end: end,
    serviceName: serviceName,
    clientName: clientName,
    status: 'Indisponibile',
    note: serviceName
  });
}

/**
 * Salva un'indisponibilità per un range di date.
 */
function saveIndisponibilitaRange(barberId, startDateIso, endDateIso, startTime, endTime, note, force = false) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { status: "ERROR", message: "Sistema occupato, riprova." };

  try {
    const start = createLocalDateFromIso(startDateIso);
    const end = createLocalDateFromIso(endDateIso);
    const conflicts = [];
    const bookingsSheet = getSs().getSheetByName('Bookings');
    const allBookings = bookingsSheet.getDataRange().getValues();
    const settings = getSettings();

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const currentDayIso = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
      const indispoStart = createLocalDateFromIsoAndTime(currentDayIso, startTime);
      const indispoEnd = createLocalDateFromIsoAndTime(currentDayIso, endTime);
      const duration = (indispoEnd.getTime() - indispoStart.getTime()) / 60000;

      if (duration <= 0) continue;

      const dayConflicts = allBookings.filter(row => {
        const bStatus = (row[COL_BOOKING.STATUS] || "").toLowerCase();
        if (row[COL_BOOKING.BARBER_ID] == barberId && ['confermato', 'richiesta cancellazione', 'weekly'].includes(bStatus)) {
          const bStart = parseItalianDateString(row[COL_BOOKING.ISO_START]);
          const bEnd = new Date(bStart.getTime() + (parseInt(row[COL_BOOKING.DURATION], 10) || 0) * 60000);
          return indispoStart < bEnd && indispoEnd > bStart;
        }
        return false;
      });

      if (dayConflicts.length > 0) {
        dayConflicts.forEach(c => conflicts.push({
          time: Utilities.formatDate(parseItalianDateString(c[COL_BOOKING.ISO_START]), "Europe/Rome", "HH:mm"),
          name: c[COL_BOOKING.CLIENT_NAME],
          service: c[COL_BOOKING.SERVICE]
        }));
      }
    }

    if (conflicts.length > 0 && !force) {
      return { status: "CONFLICT", conflicts: conflicts };
    }

    if (force) {
      conflicts.forEach(c => {
        const conflictBooking = allBookings.find(b => b[COL_BOOKING.CLIENT_NAME] === c.name && b[COL_BOOKING.SERVICE] === c.service);
        if (conflictBooking) cancelAppointment(conflictBooking[COL_BOOKING.ID]);
      });
    }

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const currentDayIso = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
      saveIndisponibilita(barberId, currentDayIso, startTime, endTime, note);
    }

    return { status: "OK" };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Aggiorna un'indisponibilità esistente.
 */
function updateIndisponibilita(bookingId, newStartIso, newEndIso, newNote, force = false) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { status: "ERROR", message: "Sistema occupato, riprova." };

  try {
    const sheet = getSs().getSheetByName('Bookings');
    const data = sheet.getDataRange().getValues();
    const rowIndex = data.findIndex(row => row[COL_BOOKING.ID] === bookingId);

    if (rowIndex === -1) return { status: "ERROR", message: "Impegno non trovato." };

    const barberId = data[rowIndex][COL_BOOKING.BARBER_ID];
    const newStart = new Date(newStartIso);
    const newEnd = new Date(newEndIso);

    // Verifica conflitti nel nuovo slot, escludendo l'impegno stesso
    const conflicts = data.filter((row, index) => {
      if (index === rowIndex) return false; // Escludi l'impegno che stiamo modificando
      const bStatus = (row[COL_BOOKING.STATUS] || "").toLowerCase();
      if (row[COL_BOOKING.BARBER_ID] == barberId && ['confermato', 'richiesta cancellazione', 'weekly'].includes(bStatus)) {
        const bStart = parseItalianDateString(row[COL_BOOKING.ISO_START]);
        const bEnd = new Date(bStart.getTime() + (parseInt(row[COL_BOOKING.DURATION], 10) || 0) * 60000);
        return newStart < bEnd && newEnd > bStart;
      }
      return false;
    });

    if (conflicts.length > 0 && !force) {
      return { status: "CONFLICT", conflicts: conflicts.map(c => ({ time: Utilities.formatDate(parseItalianDateString(c[COL_BOOKING.ISO_START]), "Europe/Rome", "HH:mm"), name: c[COL_BOOKING.CLIENT_NAME], service: c[COL_BOOKING.SERVICE] })) };
    }

    // Se force è true, cancella gli appuntamenti in conflitto
    if (force && conflicts.length > 0) {
      conflicts.forEach(conflictRow => {
        cancelAppointment(conflictRow[COL_BOOKING.ID], false); // false per inviare notifica al cliente
      });
    }

    // Aggiorna i dati
    sheet.getRange(rowIndex + 1, COL_BOOKING.ISO_START + 1).setValue(Utilities.formatDate(newStart, "Europe/Rome", "yyyy-MM-dd HH:mm"));
    sheet.getRange(rowIndex + 1, COL_BOOKING.DURATION + 1).setValue((newEnd.getTime() - newStart.getTime()) / 60000);
    sheet.getRange(rowIndex + 1, COL_BOOKING.SERVICE + 1).setValue(newNote);

    return { status: "OK" };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Gestisce la richiesta di cancellazione da parte di un cliente.
 */
function requestCancellation(bookingId, calendarId, reason) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { status: "ERROR", message: "Sistema occupato, riprova." };

  try {
    const sheet = getSs().getSheetByName('Bookings');
    const data = sheet.getDataRange().getValues();
    const rowIndex = data.findIndex(row => row[COL_BOOKING.ID] === bookingId);

    if (rowIndex === -1) return { status: "ERROR", message: "Appuntamento non trovato." };

    const bookingData = data[rowIndex];
    const start = new Date(bookingData[COL_BOOKING.ISO_START]);
    const now = new Date();
    const settings = getSettings();
    const autoCancelMinutes = parseInt(settings.AUTO_CANCELLATION_MINUTES, 10) || 5;

    const bookingCreationTime = parseItalianDateString(bookingData[COL_BOOKING.ISO_TIME_PRENOTATION]);
    const bookingCreationTimeMs = bookingCreationTime ? bookingCreationTime.getTime() : null;
    const canDeleteDirectly = bookingCreationTimeMs !== null && (now.getTime() - bookingCreationTimeMs) < (autoCancelMinutes * 60 * 1000);

    // Se la chiamata è senza motivo, controlliamo solo la finestra di auto-cancellazione.
    if (!reason) {
      if (canDeleteDirectly) {
        return { status: "CAN_DELETE_DIRECTLY" };
      }
      return { status: "NEED_REASON" };
    }

    // Se siamo ancora nella finestra di auto-cancellazione, cancelliamo subito.
    if (canDeleteDirectly) {
      cancelAppointment(bookingId);
      return { status: "DELETED" };
    }

    // Oltre la finestra, la richiesta va sempre in revisione del barbiere.
    sheet.getRange(rowIndex + 1, COL_BOOKING.STATUS + 1).setValue('Richiesta cancellazione');
    sheet.getRange(rowIndex + 1, COL_BOOKING.CANCELLATION_REASON + 1).setValue(reason || 'Nessun motivo specificato.');
    SpreadsheetApp.flush();

    const barber = getBarbersList()[bookingData[COL_BOOKING.BARBER_ID]];
    if (barber) sendCancellationRequestToBarber(settings, barber, bookingData, reason);

    return { status: "OK" };
  } finally { lock.releaseLock(); }
}
/**
 * Analizza le prossime settimane per trovare conflitti per un nuovo appuntamento settimanale.
 */
function getWeeklyConflictsPreview(barberId, dayName, timeStr, duration, serviceName, clientIdentifier) {
  // LOGICA DURATA PERSONALIZZATA (come in processBooking e saveWeeklyAppointment)
  let effectiveDuration = parseInt(duration, 10);
  const services = getServices();
  const sStandard = services.find(s => s.name.toLowerCase() === "taglio");
  const clientConfig = getClientConfig(clientIdentifier);

  if (serviceName && serviceName.toLowerCase() === "taglio") {
      if (clientConfig && clientConfig.cutTime) {
          effectiveDuration = clientConfig.cutTime;
      }
  } else if (serviceName && serviceName.toLowerCase() === "taglio e barba") {
      // Se il cliente ha un tempo di taglio personalizzato, usiamo quello, altrimenti il tempo del servizio "Taglio" standard.
      const clientCutTime = (clientConfig && clientConfig.cutTime) ? clientConfig.cutTime : (sStandard ? sStandard.duration : 30);
      
      const sBeard = services.find(s => s.name.toLowerCase() === "barba");
      const beardDuration = sBeard ? sBeard.duration : 15; // Fallback a 15 min se il servizio "Barba" non esiste

      // La durata effettiva è la somma dei due.
      effectiveDuration = parseInt(clientCutTime, 10) + parseInt(beardDuration, 10);
  }
  // FINE LOGICA DURATA PERSONALIZZATA

  console.log("Backend: getWeeklyConflictsPreview chiamata.");
  const conflicts = [];
  const now = new Date();
  const daysOfWeek = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const targetDay = daysOfWeek.indexOf(dayName.toLowerCase());
  const time = parseTimeString(timeStr);

  for (let w = 0; w < 4; w++) { // Allineato a 4 settimane come la generazione effettiva
    let date = new Date(now.getTime() + (w * 7 * 86400000));
    date.setDate(date.getDate() + (targetDay - date.getDay() + 7) % 7);
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.hours, time.minutes);
    if (start < now) continue;

    if (!checkSlotAvailability(start.toISOString(), effectiveDuration, barberId)) {
      // Calcola quanti giorni mancano dalla data del conflitto a oggi
      const daysFromNow = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      // Cerca slot solo per il giorno del conflitto
      const availableSlots = getAvailableSlots(effectiveDuration, serviceName, clientIdentifier, daysFromNow + 1);
      const daySlots = availableSlots.filter(s => s.dateKey === start.toISOString().split('T')[0]);
      const closestSlot = daySlots.length > 0 ? daySlots.sort((a, b) => Math.abs(new Date(a.iso).getTime() - start.getTime()) - Math.abs(new Date(b.iso).getTime() - start.getTime()))[0] : null;
      conflicts.push({ date: formatDateItalian(start, Session.getScriptTimeZone(), true, false), suggestion: closestSlot });
    }
  }
  return { conflicts: conflicts };
}

/**
 * Esegue la pulizia del foglio Bookings, rimuovendo gli appuntamenti più vecchi
 * di un determinato periodo per mantenere il foglio leggero.
 * Questa funzione può essere eseguita da un trigger a tempo (es. mensile).
 */
function cleanupOldBookings() {
  const settings = getSettings();
  // Legge i giorni di storico e aggiunge un margine di 30 giorni prima di eliminare.
  const historyDays = parseInt(settings.BOOKING_HISTORY, 10) || 90;
  const cleanupDaysThreshold = historyDays + 30; // Elimina appuntamenti più vecchi di 120 giorni (default)

  const now = new Date();
  const sheet = getSs().getSheetByName('Bookings');
  const data = sheet.getDataRange().getValues();

  // Itera all'indietro per eliminare le righe in modo sicuro senza saltare indici.
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const bookingDate = parseItalianDateString(row[COL_BOOKING.ISO_START]);

    if (bookingDate) {
      const diffDays = (now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > cleanupDaysThreshold) {
        // Elimina la riga corrispondente nel foglio di calcolo.
        // L'indice della riga è i + 1 perché l'array è 0-based mentre le righe del foglio sono 1-based.
        sheet.deleteRow(i + 1);
      }
    }
  }
  console.log("Pulizia appuntamenti vecchi completata.");
}
