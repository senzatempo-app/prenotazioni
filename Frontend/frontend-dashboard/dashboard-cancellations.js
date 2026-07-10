/**
 * Logica e Rendering della pagina "Richieste Cancellazione" per il barbiere.
 */
function renderBarberCancellationsPage(skipPush = false) {
    window.scrollTo(0, 0);
    if (!skipPush) pushView('cancellations');
    appContainer.innerHTML = `
        <div id="barber-cancellations-screen" class="full-screen">
            <div class="fixed-header">
                <button onclick="saveDashboardScroll(); renderBarberDashboardPage();" class="header-back-btn">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <h2>RICHIESTE CANCELLAZIONE</h2>
            </div>
            <div class="home-content">
                <div class="booking-container">
                    <div id="cancellations-list-container" class="fade-in" style="display: flex; flex-direction: column; gap: 15px;">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Usiamo gli appuntamenti già caricati nella dashboard per filtrare quelli in "Richiesta Cancellazione"
    if (cachedBarberAppointments) {
        renderCancellationsList(cachedBarberAppointments);
    } else {
        google.script.run.withSuccessHandler(apps => {
            renderCancellationsList(apps);
        }).getBarberAppointments(currentDisplayedBarberId);
    }
}

function renderCancellationsList(appointments) {
    const container = document.getElementById('cancellations-list-container');
    const pending = appointments.filter(a => a.status === 'Richiesta cancellazione');

    if (pending.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; margin-top: 50px;">
                <div style="color: #8A9A5B; margin-bottom: 15px;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <p style="color: #666;">Non ci sono richieste di cancellazione in sospeso.</p>
            </div>`;
        return;
    }

    let html = '';
    let lastDate = '';

    pending.forEach(a => {
        const startDate = new Date(a.start);
        const dateStr = startDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
        const timeStr = startDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

        if (dateStr !== lastDate) {
            html += `<div style="padding: 15px 5px 5px; font-size: 0.85em; font-weight: 700; color: #dc3545; text-transform: uppercase; letter-spacing: 0.5px;">${dateStr}</div>`;
            lastDate = dateStr;
        }

        html += `
            <div class="booking-card" style="padding: 10px 15px; border-left: 5px solid #dc3545; margin-bottom: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="font-weight: 800; font-size: 1.1em; color: #1a1a1a; min-width: 50px;">${timeStr}</div>
                        <div>
                            <div style="font-weight: 700; color: #333; font-size: 0.95em;">${a.clientName}</div>
                            <div style="font-size: 0.8em; color: #666;">${a.service}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <a href="https://wa.me/${a.clientPhone.toString().replace(/\D/g, '')}" target="_blank" style="color: #25D366; display: flex; align-items: center; text-decoration: none; justify-content: flex-end;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </a>
                    </div>
                </div>
                ${a.cancelReason ? `
                    <div>
                        <strong style="font-style: normal; color: #1a1a1a; display: block;">Motivazione cliente:</strong>
                        <span style="font-style: normal;">${a.cancelReason}</span>
                    </div> 
                ` : ''}
                <div style="display: flex; gap: 8px; width: 100%;">
                    <button onclick="processBarberDecision('${a.id}', 'reject', this)" style="flex: 1; background: transparent; border: none; color: #666; font-size: 0.75em; padding: 10px; font-weight: 700; text-transform: uppercase;">Rifiuta</button>
                    <button onclick="processBarberDecision('${a.id}', 'approve', this)" style="flex: 1; background: transparent; color: #dc3545; border: none; font-size: 0.75em; padding: 10px; font-weight: 700; text-transform: uppercase;">Conferma Cancellazione</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function processBarberDecision(bookingId, decision, btn) {
    showButtonSpinner(btn);

    google.script.run
        .withSuccessHandler(res => {
            if (res && res.status === "OK") {
                const cancellationsContainer = document.getElementById('cancellations-list-container');
                // Se siamo nella pagina delle cancellazioni, aggiorniamo la lista.
                if (cancellationsContainer) {
                    if (decision === 'approve') {
                        cachedBarberAppointments = cachedBarberAppointments.filter(a => a.id !== bookingId);
                    } else { // 'reject'
                        const app = cachedBarberAppointments.find(a => a.id === bookingId);
                        if (app) app.status = 'Confermato';
                    }
                    renderCancellationsList(cachedBarberAppointments);
                } else {
                    // Altrimenti (es. dal popup della home),
                    // Chiudiamo tutti i popup e aggiorniamo la dashboard in background.
                    closeAllPopupsAndRedirect(() => refreshDashboardData(true));
                }

            } else { // Errore dal backend
                hideButtonSpinner(btn);
                showCustomAlert("Errore", res.message || "Impossibile completare l'operazione.");
            }
        })
        .withFailureHandler(err => {
            hideButtonSpinner(btn);
            showCustomAlert("Errore di Sistema", "Impossibile comunicare con il server: " + err);
        })
        .handleCancellationDecision(bookingId, decision);
}