/**
 * Costanti per gli indici delle colonne dei fogli di calcolo.
 * Questo file centralizza la definizione degli indici per migliorare la manutenibilità.
 */

const COL_BOOKING = {
  ID: 0,
  CLIENT_ID: 1,
  CLIENT_NAME: 2,
  ISO_START: 3,
  SERVICE: 4,
  DURATION: 5,
  STATUS: 6,
  BARBER_ID: 7,
  ISO_TIME_PRENOTATION: 8,
  CANCELLATION_REASON: 9,
  REMINDER_SENT: 10
};

const COL_CLIENT = {
  ID: 0,
  NAME: 1,
  SURNAME: 2,
  PHONE: 3,
  EMAIL: 4,
  CUT_TIME: 5, // Default cut time for the client
  REGISTRATION_DATE: 6,
  LAST_BOOKING_DATE: 7,
  TOTAL_BOOKINGS: 8,
  // Note: Weekly and Weekly_Day_Time were previously inferred at different indices.
  // Assuming CUT_TIME is at index 5 based on core.js appendRow.
  // If Weekly and Weekly_Day_Time are still used, their indices need to be confirmed.
};

const COL_BARBER = {
  ID: 0,
  NAME: 1,
  CALENDAR_ID: 2,
  EMAIL: 3,
  PHONE: 4,
  IS_ACTIVE: 5,
  PHOTO_URL: 6,
  PASSWORD: 7
};

const COL_SERVICE = {
  ID: 0,
  NAME: 1,
  DURATION: 2,
  PRICE: 3,
  IMAGE_URL: 4,
  IS_ACTIVE: 5
};

const COL_WEEKLY_BOOKING = {
  ID: 0, CLIENT_ID: 1, CLIENT_NAME: 2, DAY_NAME: 3, ISO_START: 4, SERVICE: 5, DURATION: 6, STATUS: 7, BARBER_ID: 8, EVENT_ID: 9, START_DATE: 10
};

const COL_WORKING_HOURS = {
  BARBER_ID: 0, DAY: 1, OPEN_AM: 2, CLOSE_AM: 3, OPEN_PM: 4, CLOSE_PM: 5, 
  VISIBILITY_ALL: 7, VISIBILITY_NEXT: 7, VISIBILITY_PREVIEW: 7,
  HOLIDAY_NAME: 9,   // Colonna J
  HOLIDAY_ACTIVE: 10, // Colonna K
  HOLIDAY_DATE_CUR: 11, // Colonna L
  HOLIDAY_DATE_NEXT: 12 // Colonna M
};

/**
 * Verifica se l'email è un indirizzo reale del cliente (non un dominio tecnico).
 */
function isValidClientEmail(email) {
  if (!email) return false;
  const e = email.toLowerCase();
  return e.includes('@') && !e.includes('@barber.it') && !e.includes('@whatsapp.com');
}