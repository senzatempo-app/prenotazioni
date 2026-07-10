/**
 * Progetto: Barber Booking System - Zero-Gap Logic
 * File Core: Gestione API e caricamento dati base.
 */

// Sostituisci con l'ID reale del tuo foglio per evitare errori in modalità Web App
const SPREADSHEET_ID = "1sZ-2g0KM9wNKmA23i9CipwA526F2wxPSMwmOdCihd20";
// Cache dell'oggetto Spreadsheet per evitare chiamate multiple a openById
var _SS_INSTANCE = null;
function getSs() {
  if (!_SS_INSTANCE) _SS_INSTANCE = SpreadsheetApp.openById(SPREADSHEET_ID);
  return _SS_INSTANCE;
}

// Cache globale per ridurre le letture del foglio durante una singola esecuzione
var _GLOBAL_CACHE = { settings: null, barbers: null, services: null };

/**
 * Recupera tutti i dati iniziali in un'unica chiamata.
 */
function getAppInitData(identifier, targetBarberId, isFullLoad = false) {
  const settings = getSettings();
  const barbers = getBarbersList();
  const services = getServices();
  const workingHours = getWorkingHours();
  
  // Verifica se l'utente che ha effettuato l'accesso è un barbiere
  let isBarber = false;
  let loggedBarberId = null;

  if (identifier) {
    for (const id in barbers) {
      if (barbers[id].email && barbers[id].email.toLowerCase() === identifier.toLowerCase()) {
        isBarber = true;
        loggedBarberId = id;
        break;
      }
    }
  }

  const result = { settings, barbers, services, workingHours, isBarber };
  
  if (isBarber) {
    // Se l'utente è un barbiere, carica tutti i dati della dashboard
    result.clients = getClientsList();
    result.weeklyBookings = getWeeklyBookingsList();
    result.allBarbers = getBarbersList(true); // Recupera tutti i barbieri per la gestione
    result.services = getServices(true); // Recupera tutti i servizi (anche inattivi) per l'admin
    result.barberAppointments = getBarberAppointments(targetBarberId || loggedBarberId); // Carica gli appuntamenti del barbiere target
    result.italianHolidays = getItalianHolidaysStatus(); // Carica sempre le festività per la dashboard
  }

  // Carica sempre gli appuntamenti personali dell'utente (sia che sia cliente o barbiere)
  if (identifier) {
    result.userBookings = getUserBookings(identifier);
  }

  return result;
}

/**
 * Gestisce le richieste API POST.
 */
function doPost(e) {
  try {
    _GLOBAL_CACHE.settings = null;
    _GLOBAL_CACHE.barbers = null;
    _GLOBAL_CACHE.services = null;

    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const p = Array.isArray(request.params) ? request.params : [];
    let result;

    switch (action) {
      case 'getSettings': result = getSettings(); break;
      case 'getBarbersList': result = getBarbersList(); break;
      case 'getAppInitData': result = getAppInitData(p[0], p[1]); break;
      case 'getServices': result = getServices(); break;
      case 'getWorkingHours': result = getWorkingHours(); break;
      case 'getAvailableSlots': result = getAvailableSlots(p[0], p[1], p[2]); break;
      case 'processBooking': result = processBooking(p[0], p[1], p[2], p[3], p[4], p[5]); break;
      case 'getUserBookings': result = getUserBookings(p[0]); break;
      case 'registerOrUpdateUser': result = registerOrUpdateUser(p[0]); break;
      case 'updateClientData': result = updateClientData(p[0], p[1]); break;
      case 'requestCancellation': result = requestCancellation(p[0], p[1], p[2]); break;
      case 'cancelAppointment': result = cancelAppointment(p[0]); break;
      case 'verifyBarberPassword': result = verifyBarberPassword(p[0], p[1]); break;
      case 'updateAppointment': result = updateAppointment(p[0], p[1], p[2], p[3], p[4], p[5]); break;
      case 'getWeeklyConflictsPreview': result = getWeeklyConflictsPreview(p[0], p[1], p[2], p[3], p[4], p[5]); break;
      case 'updateIndisponibilita': result = updateIndisponibilita(p[0], p[1], p[2], p[3], p[4]); break;
      case 'saveWeeklyAppointment': result = saveWeeklyAppointment(p[0], p[1], p[2], p[3], p[4], p[5], p[6]); break;
      case 'manageCustomHoliday': result = manageCustomHoliday(p[0], p[1]); break;
      case 'getItalianHolidaysStatus': result = getItalianHolidaysStatus(); break;
      case 'toggleHolidayClosure': result = toggleHolidayClosure(p[0], p[1], p[2], p[3]); break;
      case 'saveIndisponibilitaRange': result = saveIndisponibilitaRange(p[0], p[1], p[2], p[3], p[4], p[5], p[6]); break; // Corretto in bookings.js
      case 'removeWeeklyAppointment': result = removeWeeklyAppointment(p[0]); break;
      case 'getBarberAppointments': result = getBarberAppointments(p[0]); break;
      case 'getWeeklyBookingsList': result = getWeeklyBookingsList(); break;
      case 'getClientsList': result = getClientsList(); break;
      case 'deleteClient': result = deleteClient(p[0]); break;
      case 'getClientConfig': result = getClientConfig(p[0]); break; // Azione aggiunta per coerenza
      case 'handleCancellationDecision': result = handleCancellationDecision(p[0], p[1]); break;
      case 'saveWorkingHoursAndSettings': result = saveWorkingHoursAndSettings(p[0]); break;
      case 'manageService': result = manageService(p[0], p[1]); break;
      case 'saveGlobalSettings': result = saveGlobalSettings(p[0], p[1]); break;
      default: throw new Error('Azione non valida');
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Recupera la durata di default per il servizio "Taglio" dal foglio Services.
 */
function getDefaultCutTime() {
  const services = getServices();
  const taglio = services.find(s => s && s.name && s.name.toLowerCase() === "taglio");
  return taglio ? taglio.duration : 30; // Fallback a 30 se il servizio non viene trovato
}

function doGet(e) {
  return ContentService.createTextOutput("API: Online.").setMimeType(ContentService.MimeType.TEXT);
}
