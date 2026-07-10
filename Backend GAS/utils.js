/**
 * Utility e Formattazione
 */
// Assicurati che constants.js sia incluso o le sue funzioni/variabili siano globalmente disponibili

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Utility: Converte stringa HH:mm in oggetto ore/minuti (Backend).
 */
function parseTimeString(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.toString().split(':');
  if (parts.length < 2) return null;
  return { hours: parseInt(parts[0], 10), minutes: parseInt(parts[1], 10) };
}

function formatDateItalian(date, timeZone, includeYear = true, includeTime = false) {
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  
  // Usiamo Utilities.formatDate una sola volta per estrarre i componenti necessari
  const components = Utilities.formatDate(date, timeZone, "d-M-yyyy-u").split('-');
  const d = parseInt(components[0], 10);
  const m = parseInt(components[1], 10) - 1;
  const y = components[2];
  const dayIdx = parseInt(components[3], 10) % 7;

  let res = `${days[dayIdx]} ${d} ${months[m]}`;
  if (includeYear) res += ` ${y}`;
  if (includeTime) res += ` alle ore ${Utilities.formatDate(date, timeZone, "HH:mm")}`;
  return res;
}

/**
 * Normalizza un numero di telefono per il confronto.
 * Rimuove +, 0039, 39 e caratteri non numerici.
 * SPOSTATO DA CLIENTS.JS
 */
function normalizePhone(phone) {
  if (!phone) return "";
  let cleaned = phone.toString().replace(/\D/g, "");
  if (cleaned.startsWith("0039") && cleaned.length > 10) cleaned = cleaned.substring(4);
  else if (cleaned.startsWith("39") && cleaned.length > 10) cleaned = cleaned.substring(2);
  return cleaned;
}

/**
 * Helper per capitalizzare solo la prima lettera di una stringa.
 * SPOSTATO DA CLIENTS.JS
 */
function capitalizeFirst(str) {
  if (!str) return "";
  const s = str.toString().trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Trasforma un link di Google Drive (condiviso) in un link diretto all'immagine.
 * SPOSTATO DA CORE.JS
 */
function getDirectDriveUrl(url) {
  if (!url || !url.toString().includes("drive.google.com")) return url;
  const fileId = url.toString().match(/[-\w]{25,}/);
  if (fileId) return "https://lh3.googleusercontent.com/d/" + fileId[0];
  return url;
}

/**
 * Genera il footer con le informazioni di contatto del salone.
 * SPOSTATO DA CORE.JS
 */
function getSalonContactFooter(settings) {
  const template = settings.EMAIL_FOOTER_TEMPLATE || "";
  if (!template.trim()) return "";

  return template
    .replace(/\${BUSINESS_NAME}/g, settings.BUSINESS_NAME || "").replace(/\${BUSINESS_ADDRESS}/g, settings.BUSINESS_ADDRESS || "").replace(/\${CONTACT_PHONE}/g, settings.CONTACT_PHONE || "").replace(/\${CONTACT_EMAIL}/g, settings.CONTACT_EMAIL || "");
}

/**
 * Calcola la prima occorrenza valida per un appuntamento settimanale.
 */
function calculateFirstValidWeeklyOccurrence(barberId, dayName, timeStr, duration) {
  const now = new Date();
  const daysOfWeek = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const targetDay = daysOfWeek.indexOf(dayName.toLowerCase());
  const time = parseTimeString(timeStr);

  for (let w = 0; w < 10; w++) { // Cerca nelle prossime 10 settimane
    let date = new Date(now.getTime() + (w * 7 * 86400000));
    date.setDate(date.getDate() + (targetDay - date.getDay() + 7) % 7);
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.hours, time.minutes);
    if (start > now && checkSlotAvailability(start.toISOString(), duration, barberId)) {
      return { iso: start.toISOString(), formatted: formatDateItalian(start, Session.getScriptTimeZone(), true, true) };
    }
  }
  return null;
}
/**
 * Funzione helper per interpretare correttamente una stringa di data in formato "dd/MM/yyyy HH:mm".
 * @private
 */
function parseItalianDateString(dateString) {
    if (!dateString) return null;
    if (typeof dateString !== 'string') {
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? null : d;
    }

    const parts = dateString.match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?\s*$/);
    let d;
    if (!parts) {
        d = new Date(dateString); // Fallback per formati ISO o altri formati standard
    } else {
        const day = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10) - 1; // Mese è 0-based in JS
        const year = parseInt(parts[3], 10);
        const hours = parts[4] ? parseInt(parts[4], 10) : 0;
        const minutes = parts[5] ? parseInt(parts[5], 10) : 0;
        d = new Date(year, month, day, hours, minutes, 0, 0);
    }
    return isNaN(d.getTime()) ? null : d; // Restituisce null se la data non è valida
}