/**
 * Logica e Rendering della pagina "Agenda Appuntamenti" per il barbiere.
 */
function renderBarberAppointmentsListPage(skipPush = false) {
    window.scrollTo(0, 0);
    if (!skipPush) pushView('appointments-list');

    // Legge la preferenza memorizzata per mostrare gli appuntamenti settimanali
    const showWeekly = localStorage.getItem('dashboard_show_weekly') === 'true';

    appContainer.innerHTML = `
        <div id="barber-appointments-list-screen" class="full-screen">
            <div class="fixed-header">
                <button onclick="saveDashboardScroll(); renderBarberDashboardPage();" class="header-back-btn">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <h2>LISTA APPUNTAMENTI</h2>
            </div>
            <div class="home-content">
                <div class="booking-container">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 15px; padding: 12px 18px; background: #fff; border-radius: 20px; border: 1px solid #eee; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
                        <span style="font-size: 0.9em; font-weight: 700; color: #555;">Mostra appuntamenti fissi</span>
                        <label class="switch-btn">
                            <input type="checkbox" id="filter-weekly-checkbox" onchange="toggleWeeklyVisibility()" ${showWeekly ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>

                    <div id="appointments-list-container" class="fade-in" style="display: flex; flex-direction: column; gap: 8px;">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Usa agenda già caricata
    renderAppointmentsCards(cachedBarberAppointments);
}

function toggleWeeklyVisibility() {
    // Salva la preferenza nel localStorage quando l'utente cambia lo switch
    const showWeekly = document.getElementById('filter-weekly-checkbox')?.checked ?? false;
    localStorage.setItem('dashboard_show_weekly', showWeekly);
    renderAppointmentsCards(cachedBarberAppointments);
}

function renderAppointmentsCards(appointments) {
    const container = document.getElementById('appointments-list-container');
    if (!appointments || appointments.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; margin-top:50px;">Nessun appuntamento in programma.</p>';
        return;
    }

    // Legge la preferenza dal localStorage per coerenza
    const showWeekly = localStorage.getItem('dashboard_show_weekly') === 'true';
    let displayList = [...appointments];

    // Rimuove tutte le indisponibilità (personali e festività) dalla lista
    displayList = displayList.filter(a => a.status.toLowerCase() !== 'indisponibile');

    if (!showWeekly) {
        displayList = displayList.filter(a => a.status.toLowerCase() !== 'weekly');
    }

    if (displayList.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; margin-top:50px;">Nessun appuntamento corrispondente ai filtri.</p>';
        return;
    }

    // Ordiniamo gli appuntamenti: il più lontano nel futuro in cima (ordine decrescente)
    displayList.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

    let html = '';
    let lastDate = '';
    const now = new Date();

    displayList.forEach(appointment => {
        const startDate = new Date(appointment.start);
        const isPast = startDate < now;
        // Formattazione data per il separatore (es: lunedì 24 maggio)
        const dateStr = startDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
        // Formattazione orario hh:mm
        const timeStr = startDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

        // Inserimento del separatore se il giorno cambia
        if (dateStr !== lastDate) {
            html += `<div style="padding: 15px 5px 5px; font-size: 0.85em; font-weight: 700; color: #8A9A5B; text-transform: uppercase; letter-spacing: 0.5px;">${dateStr}</div>`;
            lastDate = dateStr;
        }

        // Gestione visiva per lo stato (Cancellazione o Settimanale)
        const isPendingCancel = appointment.status === 'Richiesta cancellazione';
        const isWeekly = appointment.status.toLowerCase() === 'weekly';
        const statusColor = isPendingCancel ? '#dc3545' : (isWeekly ? '#3498db' : '#999');
        const statusWeight = (isPendingCancel || isWeekly) ? '700' : '400';

        html += `
            <div class="booking-card" style="flex-direction: column; padding: 10px 15px; margin-bottom: 0; ${isPast ? 'opacity: 0.6; background-color: #f8f8f8;' : ''} ${isPendingCancel ? 'border-left: 5px solid #dc3545;' : ''} ${isWeekly ? 'border-left: 5px solid #3498db;' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="font-weight: 800; font-size: 1.1em; color: #1a1a1a; min-width: 50px;">${timeStr}</div>
                    <div style="display: flex; flex-direction: column;">
                        <div style="font-weight: 700; color: #333; font-size: 0.95em;">${appointment.clientName}</div>
                        <div style="font-size: 0.8em; color: #666;">${appointment.service}</div>
                    </div>
                </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <div style="text-align: right;">
                    <div style="font-size: 0.7em; color: ${statusColor}; font-weight: ${statusWeight}; text-transform: uppercase;">${appointment.status}</div>
                </div>
                <button onclick="confirmCancelStandardAppointment('${appointment.id}', '${appointment.clientName}', '${dateStr} ${timeStr}')" style="border:none; background:none; padding:5px; color:#dc3545; cursor:pointer; display:flex;" title="Elimina appuntamento">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
                </div>
                </div>
                ${isPendingCancel && appointment.cancelReason ? `
                    <div style="margin-top: 8px; padding: 8px; background: #fff5f5; border-radius: 8px; font-size: 0.8em; color: #666; border: 1px solid #feb2b2;"><strong>Motivo:</strong> ${appointment.cancelReason}</div>
                ` : ''}
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * Mostra il popup di conferma per cancellare un appuntamento standard.
 */
function confirmCancelStandardAppointment(bookingId, clientName, dateTime, sourceView = 'appointments-list') {
    const existingPopup = document.querySelector('.popup-overlay .appointment-detail-popup') || document.querySelector('.popup-overlay .booking-card');

    const confirmationHtml = `
        <h2 style="margin-bottom: 10px; font-size: 1.2em; width: 100%;">Cancella Appuntamento</h2>
        <p style="margin-bottom: 20px; color: #666; font-size: 0.95em; line-height: 1.4;">Vuoi cancellare l'appuntamento per <strong>${clientName}</strong> del <strong>${dateTime}</strong>?</p>
        <div class="popup-actions" style="display: flex; width: 100%; margin-top: 10px;">
            <button id="cancel-back-btn" style="flex: 1; border: none; background: transparent; color: #666; font-size: 0.9em; font-weight: 600; cursor: pointer; text-transform: uppercase;">Annulla</button>
            <button id="execCancelBtn" style="flex: 1; background: transparent; color: #dc3545; padding: 12px; font-weight: 700; border: none; cursor: pointer; text-transform: uppercase;">Elimina</button>
        </div>
    `;

    if (existingPopup && existingPopup.closest('#appointment-details-overlay')) {
        // Se siamo nel popup dei dettagli, navighiamo al suo interno
        const originalContent = existingPopup.innerHTML;
        existingPopup.innerHTML = confirmationHtml;

        document.getElementById('cancel-back-btn').onclick = () => {
            existingPopup.innerHTML = originalContent;
            // Dobbiamo ri-associare gli eventi persi con la sostituzione dell'HTML
            const appointment = cachedBarberAppointments.find(a => a.id === bookingId);
            if (appointment) {
                showAppointmentDetailsPopup(appointment.id, appointment.clientName, appointment.service, appointment.start, appointment.end, appointment.clientPhone, currentDisplayedBarberId, appointment.status, appointment.cancelReason);
                existingPopup.closest('.popup-overlay').remove(); // Rimuovi il vecchio e lascia che show... ne crei uno nuovo e pulito
            }
        };

    } else {
        // Se non c'è un popup di dettagli (es. dalla lista), creiamo un popup temporaneo
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.id = 'temp-cancel-overlay';
        overlay.innerHTML = `<div class="booking-card fade-in" style="width: 90%; max-width: 450px; background: white; padding: 25px; align-items: center; text-align: center; border: none; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">${confirmationHtml}</div>`;
        openPopup(overlay);

        // Al "back" del popup, torna alla pagina corretta
        const backFunction = sourceView === 'personal-commitments-list' 
            ? renderPersonalCommitmentsListPage 
            : renderBarberAppointmentsListPage;

        document.getElementById('cancel-back-btn').onclick = () => closeAllPopupsAndRedirect(backFunction, true);
    }

    document.getElementById('execCancelBtn').onclick = () => {
        const btn = document.getElementById('execCancelBtn');
        showButtonSpinner(btn);
        
        google.script.run.withSuccessHandler(res => {
            if (res.status === "OK") {
                // Verifica se l'operazione è partita dal popup dettagli nella Home
                const detailsOverlay = document.getElementById('appointment-details-overlay');
                const shouldGoToHome = !!detailsOverlay;
                // Rimuoviamo l'appuntamento dalla cache locale
                cachedBarberAppointments = cachedBarberAppointments.filter(a => a.id !== bookingId);

                // Mostra l'alert di successo dopo aver sistemato la navigazione
                showCustomAlert("Cancellato", "L'appuntamento è stato rimosso e il cliente è stato avvisato.");

                // Determina quale pagina ricaricare in base alla vista di origine passata alla funzione
                let redirectFunction = renderBarberAppointmentsListPage; // Default
                if (shouldGoToHome) {
                    redirectFunction = refreshDashboardData; // Se dal popup dettagli, aggiorna la dashboard
                } else if (sourceView === 'personal-commitments-list') {
                    redirectFunction = renderPersonalCommitmentsListPage; // Se dalla lista impegni, ricarica quella
                }
                closeAllPopupsAndRedirect(redirectFunction, true);
            } else { // Errore
                hideButtonSpinner(btn);
                showCustomAlert("Errore", res.message || "Impossibile cancellare l'appuntamento.");
            }
        }).cancelAppointment(bookingId);
    };
}