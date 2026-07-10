/**
 * Gestore Dati Entità
 * Centralizza la lettura e la scrittura dei dati principali come Barbieri e Servizi.
 */

/**
 * Recupera la lista dei barbieri attivi dal foglio 'Barbers'.
 * SPOSTATO DA CORE.JS
 */
function getBarbersList(all = false) {
  if (!all && _GLOBAL_CACHE.barbers) return _GLOBAL_CACHE.barbers;
  const sheet = getSs().getSheetByName('Barbers');
  const data = sheet.getDataRange().getValues();
  const barbers = {}; // Using COL_BARBER constants
  for (let i = 1; i < data.length; i++) {
    const id = data[i][COL_BARBER.ID];
    const name = data[i][COL_BARBER.NAME];
    const calId = data[i][COL_BARBER.CALENDAR_ID] ? data[i][COL_BARBER.CALENDAR_ID].toString().trim() : "primary";
    const email = data[i][COL_BARBER.EMAIL];
    const phone = data[i][COL_BARBER.PHONE];
    const isActive = data[i][COL_BARBER.IS_ACTIVE];
    const photoUrlRaw = data[i][COL_BARBER.PHOTO_URL] || "";
    const password = data[i][COL_BARBER.PASSWORD];

    const finalPhotoUrl = getDirectDriveUrl(photoUrlRaw);

    if (name) {
      if (!all && !(isActive === true || isActive === "TRUE")) continue;
      barbers[id] = { nome: name, calendarId: calId || "primary", telefono: phone, email: email, password: password, foto: finalPhotoUrl, isActive: isActive };
    }
  }
  if (!all) _GLOBAL_CACHE.barbers = barbers;
  return barbers;
}

/**
 * Recupera la lista dei servizi.
 * SPOSTATO DA CORE.JS
 */
function getServices(all = false) {
  if (!all && _GLOBAL_CACHE.services) return _GLOBAL_CACHE.services;
  const sheet = getSs().getSheetByName('Services');
  const data = sheet.getDataRange().getValues();
  const services = []; // Using COL_SERVICE constants
  for (let i = 1; i < data.length; i++) {
    const name = data[i][COL_SERVICE.NAME];
    const isActive = (data[i][COL_SERVICE.IS_ACTIVE] === true || data[i][COL_SERVICE.IS_ACTIVE] === "TRUE");
    if (name) {
      if (!all && !isActive) continue; // Gli utenti vedono solo quelli attivi

      const finalUrl = getDirectDriveUrl(data[i][COL_SERVICE.IMAGE_URL] || "");

      services.push({ // Using COL_SERVICE constants
        name: name,
        duration: parseInt(data[i][COL_SERVICE.DURATION], 10) || 30,
        price: data[i][COL_SERVICE.PRICE] || 0,
        imageUrl: finalUrl,
        isActive: isActive
      });
    }
  }
  if (!all) _GLOBAL_CACHE.services = services;
  return services;
}

/**
 * Gestisce la lista dei servizi (Aggiungi, Modifica, Elimina).
 * SPOSTATO DA CORE.JS
 */
function manageService(action, serviceData) {
  const sheet = getSs().getSheetByName('Services');
  const data = sheet.getDataRange().getValues();

  if (action === 'add') {
    sheet.appendRow(["SVC_" + Date.now(), serviceData.name, serviceData.duration, serviceData.price, serviceData.imageUrl, true]); // Using COL_SERVICE constants
  } else if (action === 'edit') {
    const idx = data.findIndex(row => row[COL_SERVICE.NAME] === serviceData.oldName);
    if (idx !== -1) {
      // Recuperiamo la vecchia durata per la propagazione automatica
      const oldDuration = parseInt(data[idx][COL_SERVICE.DURATION], 10);
      const newDuration = parseInt(serviceData.duration, 10);

      sheet.getRange(idx + 1, COL_SERVICE.NAME + 1, 1, 3).setValues([[serviceData.name, serviceData.duration, serviceData.price]]);
      sheet.getRange(idx + 1, COL_SERVICE.IMAGE_URL + 1, 1, 2).setValues([[serviceData.imageUrl, serviceData.isActive]]);

      // Se il servizio modificato è il "Taglio" e la durata è cambiata, propaghiamo ai clienti con valore base
      if (serviceData.oldName.toLowerCase() === "taglio" && oldDuration !== newDuration) {
        propagateCutTimeChange(oldDuration, newDuration);
      }
    }
  } else if (action === 'delete') {
    const idx = data.findIndex(row => row[COL_SERVICE.NAME] === serviceData.name);
    if (idx !== -1) sheet.deleteRow(idx + 1);
  }
  return { status: "OK" };
}

/**
 * Propaga il cambio della durata di default del servizio "Taglio".
 * SPOSTATO DA CORE.JS
 */
function propagateCutTimeChange(oldDuration, newDuration) {
  const sheet = getSs().getSheetByName('Clients');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const range = sheet.getRange(2, COL_CLIENT.CUT_TIME + 1, lastRow - 1, 1);
  const currentValues = range.getValues();
  let hasChanges = false;

  const updatedValues = currentValues.map(row => {
    if (parseInt(row[0], 10) === parseInt(oldDuration, 10)) {
      hasChanges = true;
      return [parseInt(newDuration, 10)];
    }
    return [row[0]];
  });

  if (hasChanges) {
    range.setValues(updatedValues);
  }
}

/**
 * Verifica la password del barbiere.
 * SPOSTATO DA CORE.JS
 */
function verifyBarberPassword(email, password) {
  const barbers = getBarbersList();
  for (const id in barbers) {
    const barber = barbers[id];
    if (barber.email && barber.email.toLowerCase() === email.toLowerCase()) {
      return String(barber.password) === String(password);
    }
  }
  return false;
}