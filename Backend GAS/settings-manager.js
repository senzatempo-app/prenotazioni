/**
 * Gestore Impostazioni
 * Centralizza la lettura e la scrittura delle configurazioni dell'app,
 * degli orari di lavoro e delle festività.
 */

/**
 * Recupera le impostazioni globali.
 * SPOSTATO DA CORE.JS
 */
function getSettings() {
  if (_GLOBAL_CACHE.settings) return _GLOBAL_CACHE.settings;
  const sheet = getSs().getSheetByName('Settings');
  const data = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    const value = data[i][1];
    const key = data[i][2];
    if (key) settings[key] = value;
  }
  _GLOBAL_CACHE.settings = settings;
  return settings;
}

/**
 * Recupera gli orari di lavoro.
 * SPOSTATO DA CORE.JS
 */
function getWorkingHours() {
  const data = getSs().getSheetByName('Working_Hours').getDataRange().getValues();
  const hoursObj = {};
  for (let i = 1; i < data.length; i++) {
    const bId = data[i][COL_WORKING_HOURS.BARBER_ID];
    if (bId) {
      if (!hoursObj[bId]) hoursObj[bId] = [];
      hoursObj[bId].push(data[i]);
    }
  }
  hoursObj._visibility = [data[1][COL_WORKING_HOURS.VISIBILITY_ALL], data[2][COL_WORKING_HOURS.VISIBILITY_NEXT], data[3][COL_WORKING_HOURS.VISIBILITY_PREVIEW]];
  return hoursObj;
}

/**
 * Salva la configurazione degli orari di lavoro e le impostazioni di visibilità.
 * SPOSTATO DA CORE.JS
 */
function saveWorkingHoursAndSettings(data) {
  const ss = getSs();
  const barberId = data.targetBarberId;
  const sheetHours = ss.getSheetByName('Working_Hours');
  sheetHours.getDataRange().breakApart();

  for (let col = COL_WORKING_HOURS.OPEN_AM + 1; col <= COL_WORKING_HOURS.CLOSE_PM + 1; col++) {
    sheetHours.getRange(2, col, sheetHours.getMaxRows() - 1, 1).setNumberFormat('@');
  }

  const currentHoursRange = sheetHours.getDataRange();
  const currentHoursValues = currentHoursRange.getValues();

  data.workingHours.forEach(h => {
    const rowIndex = currentHoursValues.findIndex(row => row[COL_WORKING_HOURS.BARBER_ID] === barberId && row[COL_WORKING_HOURS.DAY] && row[COL_WORKING_HOURS.DAY].toLowerCase() === h.day.toLowerCase());
    if (rowIndex !== -1) {
      currentHoursValues[rowIndex][COL_WORKING_HOURS.OPEN_AM] = h.openAM;
      currentHoursValues[rowIndex][COL_WORKING_HOURS.CLOSE_AM] = h.closeAM;
      currentHoursValues[rowIndex][COL_WORKING_HOURS.OPEN_PM] = h.openPM;
      currentHoursValues[rowIndex][COL_WORKING_HOURS.CLOSE_PM] = h.closePM;
    } else {
      sheetHours.appendRow([barberId, h.day.toLowerCase(), h.openAM, h.closeAM, h.openPM, h.closePM, "", ""]);
    }
  });

  if (currentHoursValues.length > 1) currentHoursValues[1][COL_WORKING_HOURS.VISIBILITY_ALL] = data.visibility.isAllTime;
  if (currentHoursValues.length > 2) currentHoursValues[2][COL_WORKING_HOURS.VISIBILITY_NEXT] = data.visibility.isNextTime;
  if (currentHoursValues.length > 3) currentHoursValues[3][COL_WORKING_HOURS.VISIBILITY_PREVIEW] = data.visibility.isPreviewTime;

  currentHoursRange.setValues(currentHoursValues);

  const sheetSettings = ss.getSheetByName('Settings');
  const settingsData = sheetSettings.getDataRange().getValues();
  const updateSet = (key, val) => {
    const idx = settingsData.findIndex(row => row[2] === key);
    if (idx !== -1) sheetSettings.getRange(idx + 1, 2).setValue(val);
  };
  if (data.settings.bookingWindow !== undefined) updateSet('BOOKING_WINDOW_DAYS', data.settings.bookingWindow);
  if (data.settings.minBookingDays !== undefined) updateSet('MIN_BOOKINGS_DAYS', data.settings.minBookingDays);

  return { status: "OK" };
}

/**
 * Salva tutte le impostazioni e i dati dei barbieri.
 * SPOSTATO DA CORE.JS
 */
function saveGlobalSettings(settingsData, barbersArray) {
  const ss = getSs();
  const sheetSettings = ss.getSheetByName('Settings');
  const currentSettings = sheetSettings.getDataRange().getValues();

  Object.keys(settingsData).forEach(key => {
    const rowIndex = currentSettings.findIndex(row => row[2] === key);
    if (rowIndex !== -1) {
      sheetSettings.getRange(rowIndex + 1, 2).setValue(settingsData[key]);
    } else {
      sheetSettings.appendRow(["", settingsData[key], key]);
    }
  });

  const sheetBarbers = ss.getSheetByName('Barbers');
  const currentBarbersData = sheetBarbers.getDataRange().getValues();
  const isOwnerSync = barbersArray.some(b => b.id === 'barber_1');

  if (isOwnerSync) {
    const header = sheetBarbers.getRange(1, 1, 1, 8).getValues();
    sheetBarbers.clearContents();
    sheetBarbers.getRange(1, 1, 1, header[0].length).setValues(header);
    const rowsToBatch = barbersArray.map(b => [b.id, b.nome, b.calendarId, b.email, b.telefono, b.isActive, b.foto, b.password]);
    if (rowsToBatch.length > 0) {
      sheetBarbers.getRange(2, 1, rowsToBatch.length, rowsToBatch[0].length).setValues(rowsToBatch);
    }
  } else {
    barbersArray.forEach(b => {
      const rowIndex = currentBarbersData.findIndex(row => row[0] === b.id);
      if (rowIndex !== -1) {
        sheetBarbers.getRange(rowIndex + 1, 2, 1, 7).setValues([[b.nome, b.calendarId, b.email, b.telefono, b.isActive, b.foto, b.password]]);
      }
    });
  }

  return { status: "OK" };
}

/**
 * Formatta una data di festività in formato dd/MM/yyyy per la scrittura sul foglio.
 * @private
 */
function formatHolidayDateValue(value) {
  if (!value) return "";
  const parsed = value instanceof Date ? value : parseItalianDateString(value);
  if (!parsed || isNaN(parsed.getTime())) return "";
  return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

/**
 * Allinea le date delle festività all'anno corrente e al successivo.
 * Se il valore "this_year" non coincide con l'anno attuale, sposta quello del prossimo anno
 * in questa posizione e genera un nuovo valore per il successivo.
 * @private
 */
function syncHolidayYearDates(dataHours, currentYear) {
  let changed = false;
  const updatedData = dataHours.map(row => {
    if (!row[0]) return row;

    const currentDate = parseItalianDateString(row[2]);
    const nextDate = parseItalianDateString(row[3]);
    const currentYearMatches = currentDate && currentDate.getFullYear() === currentYear;
    const nextYearMatches = nextDate && nextDate.getFullYear() === currentYear + 1;

    let thisYearDate = currentYearMatches ? currentDate : null;
    let nextYearDate = nextYearMatches ? nextDate : null;

    if (!thisYearDate && nextYearDate) {
      thisYearDate = nextYearDate;
      nextYearDate = null;
    }

    if (!thisYearDate) thisYearDate = getHolidayDate(row[0], currentYear);
    if (!nextYearDate) nextYearDate = getHolidayDate(row[0], currentYear + 1);

    const normalizedThis = formatHolidayDateValue(thisYearDate);
    const normalizedNext = formatHolidayDateValue(nextYearDate);

    if ((row[2] || "") !== normalizedThis || (row[3] || "") !== normalizedNext) {
      row[2] = normalizedThis;
      row[3] = normalizedNext;
      changed = true;
    }

    return row;
  });

  return { changed, dataHours: updatedData };
}

/**
 * Funzione interna per calcolare la data di una festività.
 * @private
 */
function getHolidayDate(name, year) {
    const standard = { "Capodanno": { d: 1, m: 0 }, "Epifania": { d: 6, m: 0 }, "Liberazione": { d: 25, m: 3 }, "Festa del Lavoro": { d: 1, m: 4 }, "Festa della Repubblica": { d: 2, m: 5 }, "Ferragosto": { d: 15, m: 7 }, "Ognissanti": { d: 1, m: 10 }, "Immacolata": { d: 8, m: 11 }, "Natale": { d: 25, m: 11 }, "S. Stefano": { d: 26, m: 11 } };
    if (name === "Pasqua" || name === "Lunedì dell'Angelo") {
        const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), n = Math.floor((h + l - 7 * m + 114) / 31), p = (h + l - 7 * m + 114) % 31;
        const easter = new Date(year, n - 1, p + 1);
        if (name === "Pasqua") return easter;
        const easterMonday = new Date(easter);
        easterMonday.setDate(easter.getDate() + 1);
        return easterMonday;
    } else if (standard[name]) {
        // Creiamo la data a mezzogiorno in locale per evitare problemi di fuso orario.
        const d = standard[name].d;
        const m = standard[name].m;
        return new Date(year, m, d, 12, 0, 0, 0);
    }

    const match = name.match(/(\d{1,2})\/(\d{1,2})/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // Mese 0-based per new Date()
        return new Date(year, month, day, 12, 0, 0, 0);
    }
    return null; // Ritorna null se la festività non è riconosciuta
}

/**
 * Calcola le festività leggendo la tabella in Working_Hours.
 * SPOSTATO DA CORE.JS
 */
function getItalianHolidaysStatus() {
  const ss = getSs();
  const sheetHours = ss.getSheetByName('Working_Hours');
  const lastRow = Math.max(25, sheetHours.getLastRow());
  const rangeHolidays = sheetHours.getRange(2, 10, lastRow - 1, 4);
  let dataHours = rangeHolidays.getValues();
  const currentYear = new Date().getFullYear();
  const firstValidRow = dataHours.find(r => r[0] !== "");
  if (!firstValidRow) return [];

  const refreshed = syncHolidayYearDates(dataHours, currentYear);
  if (refreshed.changed) {
    rangeHolidays.setValues(refreshed.dataHours);
  }
  dataHours = refreshed.dataHours;

  return dataHours
    .filter(r => r[0] !== "")
    .map(row => {
      const date = parseItalianDateString(row[2]);
      return {
        name: row[0],
        iso: date ? Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd') : null,
        display: date ? date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) : "",
        isClosed: (row[1] === true || String(row[1]).toUpperCase() === "TRUE")
      };
    }).filter(h => h.iso)
    .sort((a, b) => a.iso.localeCompare(b.iso));
}

/**
 * Gestisce l'apertura o chiusura del salone per una festività.
 * SPOSTATO DA CORE.JS
 */
function toggleHolidayClosure(iso, name, shouldClose, force = false) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { status: "ERROR", message: "Sistema occupato." };
  try {
    const sheetHours = getSs().getSheetByName('Working_Hours');
    const lastRow = Math.max(25, sheetHours.getLastRow());
    const dataHours = sheetHours.getRange(2, 10, lastRow - 1, 2).getValues();
    const rowIndex = dataHours.findIndex(r => r[0] === name);
    if (rowIndex !== -1) {
      sheetHours.getRange(rowIndex + 2, 11).setValue(shouldClose);
    }

    if (shouldClose) {
      const barbers = getBarbersList();
      const allConflicts = [];
      for (const bId in barbers) {
        const res = saveIndisponibilitaRange(bId, iso, iso, "00:00", "23:59", name, force);
        if (res.status === "CONFLICT") allConflicts.push(...res.conflicts);
      }
      if (allConflicts.length > 0 && !force) return { status: "CONFLICT", conflicts: allConflicts };
    } else {
      const sheet = getSs().getSheetByName('Bookings');
      const data = sheet.getDataRange().getValues();
      for (let i = data.length - 1; i >= 1; i--) {
        let rowDate = data[i][COL_BOOKING.ISO_START] ? parseItalianDateString(data[i][COL_BOOKING.ISO_START]).toISOString().split('T')[0] : "";
        if (rowDate === iso && (data[i][COL_BOOKING.SERVICE] || "").toString() === name && (data[i][COL_BOOKING.STATUS] || "").toLowerCase() === 'indisponibile') {
          sheet.deleteRow(i + 1);
        }
      }
    }
    return { status: "OK" };
  } finally { lock.releaseLock(); }
}

/**
 * Gestisce l'aggiunta, modifica ed eliminazione di una festività personalizzata.
 * SPOSTATO DA CORE.JS
 */
function manageCustomHoliday(action, holidayData) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { status: "ERROR", message: "Sistema occupato." };
  try {
    const ss = getSs();
    const sheetHours = ss.getSheetByName('Working_Hours');
    const lastRow = Math.max(25, sheetHours.getLastRow());
    const rangeHolidays = sheetHours.getRange(2, 10, lastRow - 1, 4);
    let holidays = rangeHolidays.getValues().filter(r => r[0] !== "");

    if (action === 'add') {
      const fullName = `${holidayData.name} (${holidayData.dateStr})`;
      if (holidays.some(h => h[0] === fullName)) return { status: "ERROR", message: "Questa ricorrenza esiste già." };
      const parts = holidayData.dateStr.split('/');
      const currentYear = new Date().getFullYear();
      const dateCur = new Date(currentYear, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      const dateNext = new Date(currentYear + 1, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      holidays.push([fullName, false, formatHolidayDateValue(dateCur), formatHolidayDateValue(dateNext)]);
    } else {
        const nameToFind = action === 'edit' ? holidayData.oldName : holidayData.name;
        const idx = holidays.findIndex(h => h[0] === nameToFind);
        if (idx !== -1) {
            if ((holidays[idx][1] === true || holidays[idx][1] === "TRUE")) {
                const holidayDate = parseItalianDateString(holidays[idx][2]);
                toggleHolidayClosure(holidayDate ? Utilities.formatDate(holidayDate, Session.getScriptTimeZone(), 'yyyy-MM-dd') : '', holidays[idx][0], false);
            }
            if (action === 'edit') {
                const parts = holidayData.dateStr.split('/');
                const currentYear = new Date().getFullYear();
                holidays[idx][0] = `${holidayData.name} (${holidayData.dateStr})`;
                holidays[idx][1] = false;
                holidays[idx][2] = formatHolidayDateValue(new Date(currentYear, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)));
                holidays[idx][3] = formatHolidayDateValue(new Date(currentYear + 1, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)));
            } else { // delete
                holidays.splice(idx, 1);
            }
        }
    }

    sheetHours.getRange(2, 10, lastRow - 1, 4).clearContent();
    if (holidays.length > 0) {
      sheetHours.getRange(2, 10, holidays.length, 4).setValues(holidays);
    }
    return { status: "OK", holidays: getItalianHolidaysStatus() };
  } finally { lock.releaseLock(); }
}

/**
 * Controlla tutte le festività impostate come "chiuse" e si assicura che esista una
 * corrispondente indisponibilità nel foglio Bookings per ogni barbiere.
 * Se non esiste, la crea.
 * Imposta anche un trigger per eseguire questo controllo mensilmente.
 */
function syncHolidaysAndCreateTriggers() {
  const ss = getSs();
  const sheetHours = ss.getSheetByName('Working_Hours');
  const lastRow = Math.max(25, sheetHours.getLastRow());
  const rangeHolidays = sheetHours.getRange(2, 10, lastRow - 1, 4);
  let holidaysData = rangeHolidays.getValues();
  const currentYear = new Date().getFullYear();
  const refreshed = syncHolidayYearDates(holidaysData, currentYear);
  if (refreshed.changed) {
    rangeHolidays.setValues(refreshed.dataHours);
    holidaysData = refreshed.dataHours;
  }

  const closedHolidayEntries = [];
  refreshed.dataHours.forEach(row => {
    if (!row[0]) return;
    const isClosed = (row[1] === true || String(row[1]).toUpperCase() === "TRUE");
    if (!isClosed) return;

    const thisYearDate = parseItalianDateString(row[2]);
    if (thisYearDate) {
      closedHolidayEntries.push({
        name: row[0],
        iso: Utilities.formatDate(thisYearDate, Session.getScriptTimeZone(), 'yyyy-MM-dd')
      });
    }

    const nextYearDate = parseItalianDateString(row[3]);
    if (nextYearDate) {
      closedHolidayEntries.push({
        name: row[0],
        iso: Utilities.formatDate(nextYearDate, Session.getScriptTimeZone(), 'yyyy-MM-dd')
      });
    }
  });

  if (closedHolidayEntries.length === 0) {
    console.log("Nessuna festività chiusa da sincronizzare.");
    return { status: "OK", message: "Nessuna festività chiusa." };
  }

  const bookingsSheet = ss.getSheetByName('Bookings');
  const bookingsData = bookingsSheet.getDataRange().getValues();
  const barbers = getBarbersList(); // Prende solo i barbieri attivi

  closedHolidayEntries.forEach(holiday => {
    const holidayDateStr = holiday.iso; // Formato YYYY-MM-DD

    for (const barberId in barbers) {
      const isAlreadyBooked = bookingsData.some(row => {
        const rowDate = parseItalianDateString(row[COL_BOOKING.ISO_START]);
        if (!rowDate) return false;
        const rowDateStr = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');

        return row[COL_BOOKING.BARBER_ID] === barberId &&
               rowDateStr === holidayDateStr &&
               (row[COL_BOOKING.STATUS] || "").toLowerCase() === 'indisponibile' &&
               (row[COL_BOOKING.SERVICE] || "") === holiday.name;
      });

      if (!isAlreadyBooked) {
        console.log(`Creazione indisponibilità per ${holiday.name} (${holidayDateStr}) per il barbiere ${barberId}`);
        saveIndisponibilitaRange(barberId, holidayDateStr, holidayDateStr, "00:00", "23:59", holiday.name, true);
      }
    }
  });

  // Imposta il trigger per l'esecuzione mensile, se non esiste già
  const triggers = ScriptApp.getProjectTriggers();
  const triggerExists = triggers.some(t => t.getHandlerFunction() === 'syncHolidaysAndCreateTriggers');
  if (!triggerExists) {
    ScriptApp.newTrigger('syncHolidaysAndCreateTriggers').timeBased().onMonthDay(1).atHour(3).create();
    console.log("Trigger mensile per syncHolidays creato.");
  }

  return { status: "OK", message: "Sincronizzazione festività completata." };
}