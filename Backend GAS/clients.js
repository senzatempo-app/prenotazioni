
/**
 * Gestione Anagrafica Clienti.
 * Contiene tutta la logica per creare, leggere, aggiornare ed eliminare i clienti.
 */

/**
 * Registra o aggiorna un utente usando il numero di telefono come chiave primaria.
 */
function registerOrUpdateUser(clientData) {
  // Impedisce la registrazione se email o telefono appartengono allo staff
  const barbers = getBarbersList(true); // Carichiamo tutti i barbieri
  const email = (clientData.email || "").toLowerCase();
  const normPhone = normalizePhone(clientData.telefono);

  for (const id in barbers) {
    const b = barbers[id];
    if ((b.email && b.email.toLowerCase() === email) || (b.telefono && normalizePhone(b.telefono) === normPhone)) {
      throw new Error("Queste credenziali sono riservate allo staff. Accedi dal portale gestionale.");
    }
  }

  const sheet = getSs().getSheetByName('Clients');
  const data = sheet.getDataRange().getValues();
  const defaultCutTime = getDefaultCutTime();

  let rowByPhone = -1;
  let rowByEmail = -1;

  for (let i = 1; i < data.length; i++) { // Using COL_CLIENT constants
    if (normalizePhone(data[i][COL_CLIENT.PHONE]) === normPhone) rowByPhone = i + 1;
    if (data[i][COL_CLIENT.EMAIL].toString().toLowerCase() === email) rowByEmail = i + 1;
  }

  // 1. Controllo se telefono ed email appartengono a due persone diverse (Conflitto)
  if (rowByPhone !== -1 && rowByEmail !== -1 && rowByPhone !== rowByEmail) {
    throw new Error("Il numero di telefono e l'email appartengono a due profili diversi.");
  }

  const targetRowIndex = rowByPhone !== -1 ? rowByPhone - 1 : (rowByEmail !== -1 ? rowByEmail - 1 : -1);

  if (targetRowIndex !== -1) {
    // Utente esistente trovato (login)
    const existingRow = data[targetRowIndex];
    return { id: existingRow[COL_CLIENT.ID], nome: existingRow[COL_CLIENT.NAME], cognome: existingRow[COL_CLIENT.SURNAME], telefono: existingRow[COL_CLIENT.PHONE], email: existingRow[COL_CLIENT.EMAIL], cutTime: existingRow[COL_CLIENT.CUT_TIME] || defaultCutTime };
  } else {
    // Nuovo cliente
    const newId = "CL_" + Date.now();
    const regDate = new Date();
    // Client_ID, Name, Surname, Phone, Email, Cut_Time, Registration_Date, Last_Booking_Date, Total_Bookings
    sheet.appendRow([newId, capitalizeFirst(clientData.nome), capitalizeFirst(clientData.cognome), normPhone, clientData.email, defaultCutTime, regDate, "", 0]);
    return { ...clientData, telefono: normPhone, nome: capitalizeFirst(clientData.nome), cognome: capitalizeFirst(clientData.cognome), id: newId, cutTime: defaultCutTime };
  }
}

/**
 * Aggiorna i dati del cliente.
 */
function updateClientData(oldIdentifier, updatedData) {
  const sheet = getSs().getSheetByName('Clients');
  const data = sheet.getDataRange().getValues();

  const newEmail = (updatedData.email || "").toLowerCase();
  const newPhone = normalizePhone(updatedData.telefono);

  // Verifica che non si stiano usando credenziali dello staff
  const barbers = getBarbersList(true);
  for (const id in barbers) {
    const b = barbers[id];
    if ((b.email && b.email.toLowerCase() === newEmail) || (b.telefono && normalizePhone(b.telefono) === newPhone)) {
      return { status: "ERROR", message: "Queste credenziali sono riservate allo staff." };
    }
  }

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][COL_CLIENT.ID] === updatedData.id || data[i][COL_CLIENT.EMAIL].toString().toLowerCase() === oldIdentifier.toLowerCase() || normalizePhone(data[i][COL_CLIENT.PHONE]) === normalizePhone(oldIdentifier)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex > 0) { // Using COL_CLIENT constants
    const currentId = data[rowIndex - 1][COL_CLIENT.ID];

    // Verifica che i nuovi dati non entrino in rotta di collisione con altri utenti
    for (let i = 1; i < data.length; i++) {
      if (data[i][COL_CLIENT.ID] === currentId) continue;

      const otherEmail = (data[i][COL_CLIENT.EMAIL] || "").toString().toLowerCase();
      const otherPhone = normalizePhone(data[i][COL_CLIENT.PHONE]);

      if (otherEmail === newEmail) return { status: "ERROR", message: "Questa email è già utilizzata da un altro cliente." };
      if (otherPhone === newPhone) return { status: "ERROR", message: "Questo numero di telefono è già utilizzato da un altro cliente." };
    }

    sheet.getRange(rowIndex, COL_CLIENT.NAME + 1).setValue(capitalizeFirst(updatedData.nome));
    sheet.getRange(rowIndex, COL_CLIENT.SURNAME + 1).setValue(capitalizeFirst(updatedData.cognome));
    sheet.getRange(rowIndex, COL_CLIENT.PHONE + 1).setValue(newPhone);
    sheet.getRange(rowIndex, COL_CLIENT.EMAIL + 1).setValue(newEmail);
    sheet.getRange(rowIndex, COL_CLIENT.CUT_TIME + 1).setValue(updatedData.cutTime); // CutTime is a number, no toUpperCase
    return { status: "OK" };
  }
  return { status: "ERROR", message: "Cliente non trovato" };
}

/**
 * Recupera la configurazione specifica di un cliente (es. tempo di taglio).
 */
function getClientConfig(identifier) {
  const defaultCutTime = getDefaultCutTime();
  if (!identifier) return { cutTime: defaultCutTime };
  const sheet = getSs().getSheetByName('Clients');
  const data = sheet.getDataRange().getValues();
  const search = identifier.includes('@') ? identifier.toLowerCase() : normalizePhone(identifier); // Using COL_CLIENT constants

  for (let i = 1; i < data.length; i++) {
    const rowEmail = (data[i][COL_CLIENT.EMAIL] || "").toString().toLowerCase();
    const rowPhone = normalizePhone(data[i][COL_CLIENT.PHONE]);
    if (rowEmail === search || rowPhone === search) {
      return { // Using COL_CLIENT constants
        id: data[i][COL_CLIENT.ID],
        cutTime: parseInt(data[i][COL_CLIENT.CUT_TIME], 10) || defaultCutTime
      };
    }
  }
  return { cutTime: defaultCutTime };
}

/**
 * Aggiorna le statistiche del cliente dopo una prenotazione.
 */
function updateClientStats(clientId, bookingDate) {
  const sheet = getSs().getSheetByName('Clients');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) { // Using COL_CLIENT constants
    if (data[i][COL_CLIENT.ID] === clientId) {
      // Aggiorna data ultima visita
      sheet.getRange(i + 1, COL_CLIENT.LAST_BOOKING_DATE + 1).setValue(bookingDate);
      // Incrementa contatore prenotazioni totali
      const currentTotal = parseInt(data[i][COL_CLIENT.TOTAL_BOOKINGS], 10) || 0;
      sheet.getRange(i + 1, COL_CLIENT.TOTAL_BOOKINGS + 1).setValue(currentTotal + 1);
      break;
    }
  }
}

/**
 * Recupera la lista completa dei clienti per la dashboard.
 */
function getClientsList() {
  const sheet = getSs().getSheetByName('Clients');
  const data = sheet.getDataRange().getValues();
  const clients = [];
  for (let i = 1; i < data.length; i++) { // Using COL_CLIENT constants
    if (data[i][COL_CLIENT.NAME]) {
      clients.push({
        id: data[i][COL_CLIENT.ID],
        nome: data[i][COL_CLIENT.NAME],
        cognome: data[i][COL_CLIENT.SURNAME] || "",
        telefono: data[i][COL_CLIENT.PHONE] || "",
        email: data[i][COL_CLIENT.EMAIL] || "",
        cutTime: parseInt(data[i][COL_CLIENT.CUT_TIME], 10) || 30
      });
    }
  }
  return clients.sort((a, b) => {
    const fullA = (a.nome + " " + a.cognome).toLowerCase();
    const fullB = (b.nome + " " + b.cognome).toLowerCase();
    return fullA.localeCompare(fullB);
  });
}

/**
 * Elimina un cliente dal database.
 */
function deleteClient(clientId) {
  const sheet = getSs().getSheetByName('Clients');
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex((row, index) => index > 0 && row[COL_CLIENT.ID] === clientId);

  if (rowIndex !== -1) {
    sheet.deleteRow(rowIndex + 1);
    return { status: "OK" };
  }
  return { status: "ERROR", message: "Cliente non trovato" };
}
