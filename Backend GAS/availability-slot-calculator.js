/**
 * Verifica se un dato slot temporale è disponibile per un barbiere.
 * @param {string} slotIso - L'orario di inizio in formato ISO.
 * @param {number} duration - La durata in minuti.
 * @param {string} barberId - L'ID del barbiere.
 * @returns {boolean} True se lo slot è libero, altrimenti false.
 */
function checkSlotAvailability(slotIso, duration, barberId) {
  const start = new Date(slotIso);
  const end = new Date(start.getTime() + duration * 60000);

  const sheet = getSs().getSheetByName('Bookings');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const bStatus = (row[COL_BOOKING.STATUS] || "").toLowerCase();
    if (row[COL_BOOKING.BARBER_ID] == barberId && ['confermato', 'richiesta cancellazione', 'weekly', 'indisponibile'].includes(bStatus)) {
      const bStart = parseItalianDateString(row[COL_BOOKING.ISO_START]);
      const bEnd = new Date(bStart.getTime() + (parseInt(row[COL_BOOKING.DURATION], 10) || 0) * 60000);
      if (start < bEnd && end > bStart) return false; // Conflitto trovato
    }
  }
  return true; // Nessun conflitto
}

/**
 * Calcolatore di Disponibilità (Zero-Gap Logic)
 * Isola la logica complessa per il calcolo degli slot disponibili.
 */

/**
 * Restituisce una mappa di tutti gli slot disponibili per ogni servizio attivo.
 */
function getAllAvailableSlots(clientEmail) {
  const services = getServices();
  const result = {};
  
  // Eseguiamo il calcolo per ogni servizio attivo
  services.forEach(s => {
    result[s.name] = getAvailableSlots(s.duration, s.name, clientEmail);
  });
  
  return result;
}

/**
 * Calcola e restituisce tutti gli slot disponibili per un dato servizio.
 * Questa è la funzione principale della logica "Zero-Gap".
 */
function getAvailableSlots(serviceDuration, serviceName, clientEmail, customWindow = null, context = 'client') {
  const now = new Date();
  const settings = getSettings();
  const bookingWindow = parseInt(customWindow || settings.BOOKING_WINDOW_DAYS, 10) || 10;
  
  // Gestione del giorno di inizio prenotazioni (es. da oggi, da domani, dalla prossima settimana)
  let minBookingDays = parseInt(settings.MIN_BOOKINGS_DAYS, 10);
  if (isNaN(minBookingDays)) {
    if (settings.MIN_BOOKINGS_DAYS === 'next_week') {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 for Sunday, 1 for Monday
      let daysUntilMonday = (dayOfWeek === 0) ? 1 : (7 - dayOfWeek + 1) % 7;
      if (daysUntilMonday === 0) daysUntilMonday = 7; // If today is Monday, next Monday is 7 days away
      minBookingDays = daysUntilMonday;
    } else {
      minBookingDays = 0; // Default a oggi se valore sconosciuto
    }
  }

  // Calcolo della durata effettiva del servizio in base al profilo del cliente
  let effectiveDuration = parseInt(serviceDuration, 10);
  const services = getServices();
  const sStandard = services.find(s => s.name.toLowerCase() === "taglio");
  const clientConfig = getClientConfig(clientEmail);

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

  const isCalendarEnabled = settings.GOOGLE_CALENDAR_INTEGRATION === true || settings.GOOGLE_CALENDAR_INTEGRATION === "TRUE";

  // Logica per il limite di prenotazioni future del cliente.
  // Viene applicata solo se la richiesta proviene dall'app del cliente (context === 'client').
  const maxFutureBookings = parseInt(settings.MAX_FUTURE_BOOKINGS, 10);

  if (context === 'client' && clientEmail && maxFutureBookings > 0) {
    const clientSheet = getSs().getSheetByName('Clients');
    const clientsData = clientSheet.getDataRange().getValues();
    const clientRow = clientsData.find(row => row[COL_CLIENT.EMAIL] && row[COL_CLIENT.EMAIL].toString().toLowerCase() === clientEmail.toLowerCase());
    const clientId = clientRow ? clientRow[COL_CLIENT.ID] : null;

    if (clientId) {
      let futureBookingsCount = 0;
      const bookingsData = getSs().getSheetByName('Bookings').getDataRange().getValues();
      for (let i = 1; i < bookingsData.length; i++) {
        const row = bookingsData[i];
        const status = (row[COL_BOOKING.STATUS] || "").toLowerCase();
        const bookingClientId = row[COL_BOOKING.CLIENT_ID];
        const bookingStart = parseItalianDateString(row[COL_BOOKING.ISO_START]);
        
        // Contiamo solo gli appuntamenti standard futuri del cliente (non 'weekly' o 'cancellato')
        if (bookingClientId === clientId && bookingStart > now && (status === 'confermato' || status === 'richiesta cancellazione')) {
          futureBookingsCount++;
        }
      }

      // Se il cliente ha raggiunto il limite, non mostriamo alcun slot disponibile.
      if (futureBookingsCount >= maxFutureBookings) {
        return []; // Restituisce un array vuoto, bloccando la visualizzazione di qualsiasi slot.
      }
    }
  }

  const BARBIERI = getBarbersList();
  const barberIds = Object.keys(BARBIERI);
  if (barberIds.length === 0) return [];
  
  let timeZone = Session.getScriptTimeZone();
  if (isCalendarEnabled) {
    const firstBarber = BARBIERI[barberIds[0]];
    if (firstBarber) timeZone = getCalendarTimeZone(firstBarber.calendarId);
  }

  const hoursData = getWorkingHours(); // Usa gli orari strutturati

  const sheetBookings = getSs().getSheetByName('Bookings');
  const rawBookings = sheetBookings.getDataRange().getValues();
  
  // Liste per impegni reali (da bloccare) ed esclusioni (per regole Weekly)
  const sheetEventsList = [];
  const exclusions = new Set();

  for (let i = 1; i < rawBookings.length; i++) {
    const row = rawBookings[i];
    const bStatus = (row[COL_BOOKING.STATUS] || "").toString().trim().toLowerCase();
    const bIso = row[COL_BOOKING.ISO_START];
    const bBarberId = (row[COL_BOOKING.BARBER_ID] || "").toString().trim();

    if (bIso && bBarberId) {
      const isoKey = (bIso instanceof Date) ? bIso.toISOString() : bIso.toString();
      
      const bId = (row[COL_BOOKING.ID] || "").toString();
      // Solo gli appuntamenti attivi o le eccezioni manuali (BK_EXC_) bloccano la regola Weekly
      if (bStatus !== 'cancellato' || bId.startsWith("BK_EXC_")) {
        exclusions.add(bBarberId + "_" + isoKey);
      }

      // Se lo stato è attivo, aggiungiamo agli impegni per il calcolo degli slot occupati
      if (bStatus === 'confermato' || bStatus === 'richiesta cancellazione' || bStatus === 'weekly' || bStatus === 'indisponibile') {
        sheetEventsList.push({ // Qui new Date() è corretto perché bIso è già un ISO string
          start: parseItalianDateString(isoKey).getTime(),
          end: parseItalianDateString(isoKey).getTime() + (parseInt(row[COL_BOOKING.DURATION], 10) || 0) * 60000,
          barberId: bBarberId
        });
      }
    }
  }

  // Auto-conferma richieste di cancellazione scadute prima di calcolare la disponibilità
  syncExpiredCancellationRequests(sheetBookings, rawBookings, now.getTime());

  const daysOfWeekNames = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

  const visibility = hoursData._visibility || [true, false, false]; 
  let isAllTime = visibility[0] === true || visibility[0] === "TRUE";
  let isNextTime = visibility[1] === true || visibility[1] === "TRUE";
  let isPreviewTime = visibility[2] === true || visibility[2] === "TRUE";

  // Se nessun criterio di visibilità è selezionato, mostriamo tutto per default
  if (!isAllTime && !isNextTime && !isPreviewTime) isAllTime = true;

  const foundSlots = [];

  for (let d = minBookingDays; d < minBookingDays + bookingWindow; d++) {
    let targetDate = new Date();
    targetDate.setDate(now.getDate() + d);
    targetDate.setHours(0,0,0,0);

    const dayOfWeek = daysOfWeekNames[targetDate.getDay()];
    
    for (const id in BARBIERI) {
        const barber = BARBIERI[id];
        const barberHours = hoursData[id] || []; // Questo ora accede correttamente alla struttura dell'oggetto
        const config = barberHours.find(row => row[1] && row[1].toLowerCase() === dayOfWeek);
        
        if (!config) continue;

        const shiftsToProcess = [];
        const openAMTime = parseTimeString(config[2]);
        const closeAMTime = parseTimeString(config[3]);
        const openPMTime = parseTimeString(config[4]);
        const closePMTime = parseTimeString(config[5]);

        // Costruzione dei turni (AM, PM o Continuato)
        if (openAMTime && closeAMTime) {
          shiftsToProcess.push({ start: openAMTime, end: closeAMTime });
        }
        if (openPMTime && closePMTime) {
          shiftsToProcess.push({ start: openPMTime, end: closePMTime });
        } else if (openAMTime && closePMTime && !closeAMTime) {
          // Caso orario continuato (es. 09:00 - 18:00 senza pausa)
          shiftsToProcess[0] = { start: openAMTime, end: closePMTime };
        }

        for (const shift of shiftsToProcess) {
          let shiftStart = new Date(targetDate);
          shiftStart.setHours(shift.start.hours, shift.start.minutes, 0, 0);
          let shiftEnd = new Date(targetDate);
          shiftEnd.setHours(shift.end.hours, shift.end.minutes, 0, 0);
          
          if (shiftStart >= shiftEnd) continue;
          if (d === 0 && shiftStart < now) {
            // Se è oggi, partiamo da 'adesso' + buffer 10min, arrotondato ai 5 per pulizia visiva iniziale
            shiftStart = new Date(now.getTime() + 10 * 60000);
            shiftStart.setMinutes(Math.ceil(shiftStart.getMinutes() / 5) * 5, 0, 0);
            if (shiftStart >= shiftEnd) continue;
          }

        // Filtra gli eventi (appuntamenti e indisponibilità) per il barbiere e il turno corrente.
        let events = sheetEventsList
          .filter(b => b.barberId.toString().trim() === id.toString().trim() && b.start < shiftEnd.getTime() && b.end > shiftStart.getTime())
          .map(e => ({ start: new Date(e.start).getTime(), end: new Date(e.end).getTime() }));

        // Ordiniamo gli eventi per orario di inizio
        events.sort((a, b) => a.start - b.start);

        let tempSlots = [];
        let pointer = new Date(shiftStart);

        // Logica Zero-Gap & Indipendenza Barbieri: 
        // Ogni barbiere genera i propri slot partendo dalla propria apertura o fine impegno.
        const durMs = effectiveDuration * 60000;
        while (pointer.getTime() + durMs <= shiftEnd.getTime()) {
          const potEnd = new Date(pointer.getTime() + durMs); 
          const overlapEvent = events.find(ev => pointer.getTime() < ev.end && potEnd.getTime() > ev.start);

          if (!overlapEvent) {
            tempSlots.push({
              formatted: formatDateItalian(pointer, timeZone, true, false),
              time: Utilities.formatDate(pointer, timeZone, "HH:mm"),
              dateKey: Utilities.formatDate(pointer, timeZone, "yyyy-MM-dd"),
              iso: pointer.toISOString(),
              duration: effectiveDuration,
              barberId: id,
              barberName: barber.nome,
              clientEmail: clientEmail, // Aggiunto per la verifica lato server
              serviceName: serviceName // Aggiunto per la verifica lato server
            });
            // Tiling: Avanziamo ESATTAMENTE della durata del servizio per il prossimo slot di QUESTO barbiere
            pointer = new Date(pointer.getTime() + durMs); 
          } else {
            // Zero-Gap: Se c'è un impegno, il prossimo slot disponibile per questo barbiere
            // inizia esattamente quando finisce l'impegno attuale.
            pointer = new Date(overlapEvent.end);
          }
        }

        // Applichiamo la logica di visualizzazione (All, Next o Preview)
        if (isAllTime) {
          foundSlots.push(...tempSlots);
        } else {
          if (isNextTime && tempSlots.length > 0) foundSlots.push(tempSlots[0]);
          if (isPreviewTime && tempSlots.length > 0) {
            // Evitiamo di duplicare se Next e Preview coincidono (unico slot disponibile)
            if (!(isNextTime && tempSlots.length === 1)) {
              foundSlots.push(tempSlots[tempSlots.length - 1]);
            }
          }
        }
      }
    }
  }
  return foundSlots;
}