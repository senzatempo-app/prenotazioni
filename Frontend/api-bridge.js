/**
 * Bridge per comunicare con Google Apps Script da server esterni
 * Sostituisce google.script.run emulando lo stesso comportamento.
 */
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw-IDTbs_z6z1FFbb28L_Nb6sumWYab2SfY13yF1mv10-e31lW7hQC4f9-Z1G9mMeQ_/exec";

// Attiviamo il bridge solo se l'URL è stato configurato correttamente.

if (GAS_WEB_APP_URL && GAS_WEB_APP_URL.includes("script.google.com") && !GAS_WEB_APP_URL.includes("IL_TUO_ID_UNICO")) {
  window.google = {
    script: {
      run: {
        withSuccessHandler: function (callback) {
          const runner = Object.assign({}, this);
          runner._successHandler = callback;
          return runner;
        },
        withFailureHandler: function (callback) {
          const runner = Object.assign({}, this);
          runner._failureHandler = callback;
          return runner;
        }
      }
    }
  };

  // Array completo di tutte le azioni supportate dal backend (doPost)
  // Mantenuto aggiornato con la struttura attuale dei file del backend.
  const actions = [
    // core.js
    'getAppInitData', 'getDefaultCutTime',
    // data-manager.js
    'getBarbersList', 'getServices', 'manageService', 'verifyBarberPassword',
    // settings-manager.js
    'getSettings', 'getWorkingHours', 'saveWorkingHoursAndSettings', 'saveGlobalSettings', 'getItalianHolidaysStatus', 'toggleHolidayClosure', 'manageCustomHoliday',
    // clients.js
    'registerOrUpdateUser', 'updateClientData', 'getClientConfig', 'getClientsList', 'deleteClient',
    // bookings.js
    'processBooking', 'getUserBookings', 'cancelAppointment', 'updateAppointment', 'handleCancellationDecision', 'saveIndisponibilita', 'updateIndisponibilita', 'saveIndisponibilitaRange', 'saveWeeklyAppointment', 'removeWeeklyAppointment', 'getWeeklyBookingsList', 'getBarberAppointments', 'requestCancellation', 'getWeeklyConflictsPreview',
    // availability-slot-calculator.js
    'getAvailableSlots'
  ];

  actions.forEach(action => {
    window.google.script.run[action] = async function (...args) {
      const success = this._successHandler;
      const failure = this._failureHandler;

      console.log(`[Bridge] Chiamata: ${action}`, args);

      try {
        // Determiniamo il contesto di esecuzione per scegliere il metodo giusto di connessione
        const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        const isNetlify = window.location.hostname.includes("netlify.app");
        const timestamp = Date.now();

        let fetchUrl;
        if (isLocal) {
          // In locale usiamo un altro proxy pubblico per evitare problemi di CORS. Questi servizi possono essere instabili.
          // NOTA: I proxy pubblici sono instabili. Se questo non funziona, considera un proxy locale.
          fetchUrl = 'https://cors.sh/' + GAS_WEB_APP_URL + (GAS_WEB_APP_URL.includes('?') ? '&' : '?') + "t=" + timestamp;
        } else if (isNetlify) {
          // Su Netlify usiamo il proxy interno /api
          fetchUrl = "/api?t=" + timestamp;
        } else {
          // Su GitHub Pages il proxy /api non esiste, quindi chiamiamo direttamente Apps Script
          fetchUrl = GAS_WEB_APP_URL + (GAS_WEB_APP_URL.includes('?') ? '&' : '?') + "t=" + timestamp;
        }

         console.log(`[Bridge] Sending request for action: ${action}`);

        const response = await fetch(fetchUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: action, params: args })
        });

        if (!response.ok) {
          throw new Error(`Errore HTTP: ${response.status}`);
        }

        const text = await response.text();
        let result;
        try {
          result = JSON.parse(text);
        } catch (e) {
          throw new Error("Risposta non JSON: " + text.substring(0, 50));
        }

        if (result.status === 'success') {
          if (success) success(result.data);
        } else {
          if (failure) failure(result.message);
        }
      } catch (error) {
        console.error("API Bridge Error:", error);
        if (failure) failure(error);
      }
    };
  });
  console.log("Bridge API: Attivo. `window.google.script.run` populated.");
} else {
  console.error("Bridge API: Inattivo. GAS_WEB_APP_URL non configurato correttamente o contiene 'IL_TUO_ID_UNICO'.");
  console.log("GAS_WEB_APP_URL:", GAS_WEB_APP_URL);
  // Fallback per evitare ReferenceError in sviluppo se il bridge non è attivo
  window.google.script.run = new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'withSuccessHandler' || prop === 'withFailureHandler') {
        return (handler) => {
          target[`_${prop}`] = handler;
          return target;
        };
      }
      return (...args) => {
        console.error(`Mock API: Chiamata a ${String(prop)} con argomenti:`, args);
        if (target._withFailureHandler) {
          target._withFailureHandler(new Error(`Mock API: Funzione ${String(prop)} non implementata.`));
        }
      };
    }
  });
}