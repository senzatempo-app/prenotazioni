/**
 * Logica e Rendering della pagina Storico Appuntamenti per i Clienti
 */

/**
 * Recupera le prenotazioni dell'utente dal server
 */
function fetchUserBookings(skipPush = false) {
    window.scrollTo(0, 0);
    if (!skipPush) pushView('storico');

    // Se i dati sono in cache, li usiamo per renderizzare subito la pagina,
    // evitando lo spinner a schermo intero se non è il primo caricamento assoluto.
    const cachedBookings = cachedAppData && cachedAppData.userBookings;
    const cachedBookingsArray = Array.isArray(cachedBookings)
      ? cachedBookings
      : (cachedBookings && Array.isArray(cachedBookings.data) ? cachedBookings.data : []);

    if (cachedBookingsArray.length > 0) {
        renderStoricoPage(cachedBookingsArray);
        return;
    }

    // Schermata di caricamento temporanea
    appContainer.innerHTML = `<div class="loading-container"><div class="spinner"></div></div>`;
    
    google.script.run
      .withFailureHandler(err => {
        console.error("Errore fetchUserBookings:", err);
        showCustomAlert("Errore", "Impossibile caricare lo storico: " + err);
        renderHomePage();
      })
      .withSuccessHandler(res => {
        if (res && res.status === "OK") {
          renderStoricoPage(res.data || []);
        } else {
          showCustomAlert("Errore", res.message || "Impossibile caricare lo storico.");
        }
      })
      .getUserBookings(userData.email);
}

/**
 * Rendering della pagina Storico
 */
function renderStoricoPage(bookings, skipAnimation = false) {
    let listHtml = '';
    const now = Date.now();
    const limit24h = 24 * 60 * 60 * 1000; // 24 ore in millisecondi
    const normalizedBookings = Array.isArray(bookings)
      ? bookings
      : (bookings && Array.isArray(bookings.data) ? bookings.data : []);

    // Recupera l'impostazione per la visualizzazione del pulsante di cancellazione
    const isCancelButtonEnabled = cachedAppData && cachedAppData.settings && (cachedAppData.settings.CANCELLATION_BUTTON === true || cachedAppData.settings.CANCELLATION_BUTTON === "TRUE");

    if (normalizedBookings && normalizedBookings.length > 0) {
      listHtml = normalizedBookings.map((b, index) => {
        let cancelBtnHtml = '';
        const rawStatus = (b.stato || '').toString().trim();
        const statusLower = rawStatus.toLowerCase();
        const isPending = statusLower === 'richiesta cancellazione';
        const isWeekly = statusLower === 'weekly' || statusLower === 'w e e k l y' || statusLower === 'weekly ';
        const isConfirmed = statusLower === 'confermato';
        const isPast = (b.timestamp || 0) < now;
        
        // Verifichiamo se mancano più di 24 ore all'inizio dell'appuntamento
        const isCancellable = (b.timestamp - now) > limit24h;
        
        // Mostra il tasto annulla se abilitato, se l'appuntamento è 'Confermato' o 'Weekly' e se è cancellabile.
        if (isCancelButtonEnabled && (isConfirmed || isWeekly) && isCancellable) {
          cancelBtnHtml = `<button class="cancel-booking-btn" id="cancel-request-btn-${b.id}" onclick="handleCancelBooking('${b.id}', this, '${b.calendarId}')">RICHIEDI ANNULLAMENTO</button>`;
        } else if (isPending) {
          cancelBtnHtml = `<button class="cancel-booking-btn cancellation-requested" disabled>RICHIESTO ANNULLAMENTO</button>`;
        }
        
        return `
          <div class="booking-card larger-card ${skipAnimation ? '' : 'fade-in'} ${isPast ? 'past-booking' : ''}" id="booking-card-${b.id}" style="${skipAnimation ? '' : `animation-delay: ${index * 0.05}s; opacity: 0;`}">
            <div class="booking-info">
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 5px;">
                <div style="font-weight: bold; text-transform: capitalize; font-size: 1.1em;">${b.servizio.replace(/_/g, ' ')}</div>
                ${isWeekly ? `<div style="font-size: 0.75em; color: #3498db; font-weight: 700; text-transform: uppercase; background: rgba(52, 152, 219, 0.1); padding: 4px 8px; border-radius: 8px;">Settimanale</div>` : ''}
              </div>
              <div style="font-size: 1em; color: #666; margin-top: 5px;">${b.data}</div>
              <div style="font-size: 1em; color: #666;">Ore ${b.oraInizio}</div>
              <div style="font-size: 1em; color: #666;">Barbiere: ${b.barberName}</div>
            </div>
            ${cancelBtnHtml}
          </div>
        `;
      }).join('');
    } else {
      listHtml = '<p style="text-align: center; color: #999; margin-top: 40px;">Non hai ancora effettuato prenotazioni.</p>';
    }
  
    appContainer.innerHTML = `
      <div id="storico-screen" class="full-screen">
        <div class="fixed-header">
          <button onclick="renderHomePage()" class="header-back-btn">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <h2>I MIEI APPUNTAMENTI</h2>
        </div>
        <div class="home-content">
          <div class="booking-container">
            <div class="bookings-list">
              ${listHtml}
            </div>
          </div>
        </div>
      </div>
    `;
}

/**
 * Gestisce la cancellazione di un appuntamento
 */
function handleCancelBooking(eventId, buttonElement, calendarId) {
  showButtonSpinner(buttonElement);

  // Chiamata preliminare per capire se serve un motivo o si può cancellare subito
  google.script.run
    .withFailureHandler((err) => {
      console.error("Errore pre-cancellazione:", err);
      showCustomAlert("Errore", "Impossibile avviare la richiesta: " + err);
      resetCancelButton(buttonElement);
    })
    .withSuccessHandler((res) => {
      hideButtonSpinner(buttonElement); // Nascondi lo spinner prima di mostrare qualsiasi popup
      if (res && res.status === "CAN_DELETE_DIRECTLY") {
        executeCancellation(eventId, calendarId, "Cancellazione automatica", buttonElement, true);
      } else if (res && res.status === "NEED_REASON") {
        // È necessario un motivo, mostriamo il popup apposito.
        showCancellationReasonPopup(eventId, calendarId, buttonElement);
      } else if (res && res.status === "TOO_LATE") {
        showCustomAlert("Tempo Scaduto", "Spiacenti, non è più possibile annullare questo appuntamento.", () => renderHomePage());
      } else {
        // Fallback: se lo stato non è gestito, mostriamo comunque il popup del motivo.
        showCancellationReasonPopup(eventId, calendarId, buttonElement);
      }
    })
    .requestCancellation(eventId, calendarId, null); // Chiamata senza 'reason'
}

/**
 * Esegue la chiamata al server per la cancellazione o richiesta
 */
function executeCancellation(eventId, calendarId, reason, buttonElement, showSpinnerOnButton = false) {
  // Se la chiamata non proviene da un popup (es. cancellazione diretta o > 24h),
  // mostriamo lo spinner sul pulsante originale della lista.
  if (showSpinnerOnButton) showButtonSpinner(buttonElement);

  google.script.run
    .withFailureHandler((err) => {
      console.error("Errore cancellazione:", err);
      showCustomAlert("Errore", "Impossibile completare la richiesta: " + err);
      resetCancelButton(buttonElement);
    })
    .withSuccessHandler((res) => {
      if (res && (res.status === "OK" || res.status === "REQUEST_SENT" || res.status === "NEED_REASON")) {
        // La richiesta di cancellazione è andata a buon fine. Aggiorniamo solo il pulsante.
        if (cachedAppData && cachedAppData.userBookings) {
          const bookingsArray = Array.isArray(cachedAppData.userBookings.data) ? cachedAppData.userBookings.data : [];
          const b = bookingsArray.find(item => item.id === eventId);
          if (b) { b.stato = 'Richiesta cancellazione'; }
        }
        // Chiudi il popup e aggiorna la vista corrente senza animazioni
        closeAllPopupsAndRedirect(() => renderStoricoPage(cachedAppData.userBookings, true), true);
      } else if (res && res.status === "DELETED") {
        // L'appuntamento è stato cancellato direttamente (es. entro i primi 5 minuti dalla prenotazione).
        showCustomAlert("Annullato", "Appuntamento annullato con successo.", () => {
            if (cachedAppData && cachedAppData.userBookings) {
                cachedAppData.userBookings.data = cachedAppData.userBookings.data.filter(item => item.id !== eventId);
            }
            closeAllPopupsAndRedirect(() => renderStoricoPage(cachedAppData.userBookings, true), true);
            const cardToRemove = document.getElementById(`booking-card-${eventId}`);
            if (cardToRemove) {
                cardToRemove.style.transition = 'opacity 0.3s ease, transform 0.3s ease, max-height 0.3s ease';
                cardToRemove.style.opacity = '0';
                cardToRemove.style.transform = 'scale(0.95)';
                setTimeout(() => cardToRemove.remove(), 300);
            }
        });
      } else if (res && res.status === "TOO_LATE") {
        cachedAppData = null; // Forza il refresh completo dei dati alla prossima navigazione
        showCustomAlert("Tempo Scaduto", "Spiacenti, non è più possibile annullare questo appuntamento (limite 24 ore superato).", () => {
          renderHomePage();
        });
      } else if (res && res.message) {
        showCustomAlert("Errore", res.message);
        resetCancelButton(buttonElement);
      }
    }).requestCancellation(eventId, calendarId, reason);
}

/**
 * Mostra il popup personalizzato per inserire il motivo dell'annullamento
 */
function showCancellationReasonPopup(eventId, calendarId, buttonElement) {
  hideButtonSpinner(buttonElement); // Nascondi lo spinner del pulsante principale per mostrare il popup
  const contentHtml = `
    <p>Perché vuoi annullare il tuo appuntamento?</p>
    <div style="width: 100%;">
        <textarea id="cancelReasonText" placeholder="Inserisci qui il motivo" autocomplete="off"
          style="width: 100%; height: 100px; padding: 15px; border: 1px solid #dfdfdf; border-radius: 15px; font-family: inherit; font-size: 1em; resize: none; outline: none; box-sizing: border-box;"></textarea>
        <p id="reason-error-msg" style="color: #dc3545; font-size: 0.9em; margin-top: 10px; display: none;"></p>
    </div>
  `;
  const actionsHtml = `
    <button class="popup-action-secondary" id="cancel-reason-back-btn">Annulla</button>
    <button id="confirmCancelReasonBtn" class="popup-action-danger">Invia</button>
  `;
  const overlay = createPopup('cancel-reason-overlay', '<span style="color: #dc3545;">Richiesta Annullamento</span>', contentHtml, actionsHtml);

  document.getElementById('cancel-reason-back-btn').onclick = () => {
    closeAllPopupsAndRedirect(() => renderStoricoPage(cachedAppData.userBookings, true), true);
    resetCancelButton(buttonElement);
  };
  
  document.getElementById('confirmCancelReasonBtn').onclick = () => {
    const confirmBtn = document.getElementById('confirmCancelReasonBtn');
    const errorMsgEl = document.getElementById('reason-error-msg');
    const reason = document.getElementById('cancelReasonText').value.trim();
    if (!reason) {
      errorMsgEl.innerText = "Per favore, inserisci un motivo per poter inviare la richiesta.";
      errorMsgEl.style.display = 'block';
      document.getElementById('cancelReasonText').style.borderColor = '#dc3545';
      return;
    }
    showButtonSpinner(confirmBtn);
    executeCancellation(eventId, calendarId, reason, buttonElement);
  };
}

/**
 * Ripristina lo stato originale del pulsante di cancellazione
 */
function resetCancelButton(btn, isPending = false) {
  if (btn) {
    hideButtonSpinner(btn); // Prima di tutto, nascondi lo spinner se presente
    if (isPending) {
        btn.innerText = "RICHIESTO ANNULLAMENTO";
        btn.classList.add('cancellation-requested');
        btn.disabled = true;
    } else {
        btn.innerText = "RICHIEDI ANNULLAMENTO";
        btn.disabled = false;
    }
  }
}