/**
 * Logica e Rendering della pagina "Aggiungi Appuntamento" per il barbiere.
 */

let addAppState = {
    client: null, // {nome, cognome, email, telefono}
    service: null,
    day: null,
    slot: null,
    allSlots: null,
    allClients: []
};

function renderBarberAddAppointmentPage(skipPush = false) {
    window.scrollTo(0, 0);
    if (!skipPush) pushView('add-appointment');
    // Reset dello stato locale
    addAppState = { 
        client: null, 
        service: null, 
        day: null, 
        slot: null, 
        allSlots: null, 
        allClients: (typeof cachedAppData !== 'undefined' && cachedAppData) ? (cachedAppData.clients || []) : [] 
    };

    appContainer.innerHTML = `
        <div id="barber-add-appointment-screen" class="full-screen">
            <div class="fixed-header">
                <button onclick="renderBarberDashboardPage();" class="header-back-btn">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <h2>AGGIUNGI APPUNTAMENTO</h2>
            </div>
            <div class="home-content">
                <div class="booking-container">
                    
                    <!-- 1. SELEZIONE CLIENTE -->
                    <div class="booking-card fade-in">
                        <div class="card-title" id="add-client-card-title">1. Seleziona Cliente</div>
                        <div id="client-selection-area" style="width: 100%;">
                            <div id="search-container" style="display: flex; gap: 10px; width: 100%; align-items: center;">
                                <input type="text" id="clientSearch" placeholder="Cerca cliente (nome o tel...)" oninput="filterDashboardClients(this.value)" style="flex-grow: 1; margin: 0; height: 45px;">
                                <button id="btn-new-client-plus" onclick="showNewClientForm()" style="width: 45px; height: 45px; padding: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #ccc; border-radius: 50%; color: #8A9A5B; background: white;" title="Nuovo Cliente">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                </button>
                            </div>

                            <div id="clients-dropdown" class="services-scroll" style="display:none; width: 100%; max-height: 200px; flex-direction: column; background: #fff; border: 1px solid #eee; margin-top: 5px; border-radius: 10px; overflow-y: auto; user-select: none;"></div>
                            
                            <div id="selected-client-badge" class="hidden" style="margin-top: 10px; padding: 10px; background: rgba(138, 154, 91, 0.1); border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
                                <span id="client-info-text" style="font-weight: 700; color: #8A9A5B;"></span>
                                <button onclick="resetClientSelection()" style="border:none; padding: 5px; color: #dc3545;">Rimuovi</button>
                            </div>

                            <div id="new-client-fields" class="hidden" style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px; width: 100%;">
                                <p id="new-client-error" style="color: #dc3545; text-align: center; margin-bottom: 5px; display: none; font-size: 0.9em;"></p>
                                <input type="text" id="newC-nome" placeholder="Nome">
                                <input type="text" id="newC-cognome" placeholder="Cognome">
                                <input type="tel" id="newC-tel" placeholder="Telefono">
                                <input type="email" id="newC-email" placeholder="Email">
                                <div style="display: flex; width: 100%; margin-top: 15px;">
                                    <button onclick="resetClientSelection()" style="flex: 1; border: none; background: transparent; color: #666; font-size: 0.9em; font-weight: 600; text-transform: uppercase; cursor: pointer;">Annulla</button>
                                    <button id="confirm-new-client-btn" onclick="confirmNewClientData(this)" style="flex: 1; background: transparent; color: #8A9A5B; border: none; font-weight: 700; text-transform: uppercase; cursor: pointer;">Salva</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 2. SCELTA SERVIZIO -->
                    <div id="add-step-service" class="booking-card fade-in hidden">
                        <div class="card-title">2. Scegli il servizio</div>
                        <div id="add-services-grid" class="services-scroll"></div>
                    </div>

                    <!-- 3. SCELTA GIORNO -->
                    <div id="add-step-day" class="booking-card fade-in hidden">
                        <div class="card-title">3. Scegli il giorno</div>
                        <div id="add-month-label" style="font-size: 1.1em; font-weight: 700; color: #1a1a1a; margin-bottom: 15px;"></div>
                        <div id="add-days-row" class="days-scroll"></div>
                    </div>

                    <!-- 4. SCELTA ORARIO -->
                    <div id="add-step-slots" class="booking-card fade-in hidden">
                        <div class="card-title">4. Seleziona l'orario</div>
                        <div id="add-barbers-columns" class="barbers-grid"></div>
                    </div>

                </div>
            </div>

            <div class="cta-container fade-in">
                <button id="add-confirm-btn" class="confirm hidden" style="width:100%; max-width:400px; padding:18px; border-radius:35px; border:none; background:#8A9A5B; color:white; pointer-events: auto;" onclick="handleDashboardFinalBooking()">
                    Conferma
                </button>
            </div>
        </div>
    `;

    // Inizializza Servizi
    const svcContainer = document.getElementById('add-services-grid');
    svcContainer.innerHTML = cachedAppData.services.map(s => {
        const formattedName = s.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `<div class="service-card" onclick="selectServiceForAdd(this, '${s.name}', ${s.duration})" style="background-image: url('${s.imageUrl}')">
                    <div class="service-name">${formattedName}</div>
                </div>`;
    }).join('');

    // Genera giorni (clonando logica di prenotation.js)
    generateAddDayPills();
}

/**
 * Gestione Selezione Cliente
 */
function filterDashboardClients(val) {
    const dropdown = document.getElementById('clients-dropdown');
    if (val.length < 2) { dropdown.style.display = 'none'; return; }
    
    const filtered = addAppState.allClients.filter(c => 
        (c.nome + " " + c.cognome + " " + c.telefono).toLowerCase().includes(val.toLowerCase())
    ).slice(0, 10);

    if (filtered.length === 0) { dropdown.style.display = 'none'; return; }

    dropdown.innerHTML = filtered.map(c => `
        <div style="padding: 12px; border-bottom: 1px solid #eee; cursor:pointer;" onclick="selectExistingClient('${c.email}', '${c.nome}', '${c.cognome}', '${c.telefono}')">
            <strong>${c.nome} ${c.cognome}</strong><br>
            <span style="font-size:0.8em; color:#666;">${c.telefono} - ${c.email}</span>
        </div>
    `).join('');
    dropdown.style.display = 'flex';
}

function selectExistingClient(email, nome, cognome, telefono) {
    addAppState.client = { email, nome, cognome, telefono };
    document.getElementById('client-info-text').innerText = `${nome} ${cognome}`;
    document.getElementById('selected-client-badge').classList.remove('hidden');
    document.getElementById('search-container').classList.add('hidden');
    document.getElementById('clients-dropdown').style.display = 'none';
    // Nascondi il form di inserimento nuovo cliente e ripristina il titolo
    document.getElementById('new-client-fields').classList.add('hidden');
    document.getElementById('add-client-card-title').innerText = "1. Seleziona Cliente";
    
    document.getElementById('add-step-service').classList.remove('hidden');
}

function resetClientSelection() {
    addAppState.client = null;
    addAppState.service = null;
    addAppState.day = null;
    addAppState.slot = null;
    addAppState.allSlots = null;

    document.getElementById('selected-client-badge').classList.add('hidden');
    document.getElementById('search-container').classList.remove('hidden');
    document.getElementById('clientSearch').value = "";
    document.getElementById('new-client-fields').classList.add('hidden');
    document.getElementById('add-client-card-title').innerText = "1. Seleziona Cliente";
    
    // Nascondi tutti i passaggi successivi e il tasto conferma
    document.getElementById('add-step-service').classList.add('hidden');
    document.getElementById('add-step-day').classList.add('hidden');
    document.getElementById('add-step-slots').classList.add('hidden');
    document.getElementById('add-confirm-btn').classList.add('hidden');

    // Rimuovi selezioni grafiche
    document.querySelectorAll('#add-services-grid .service-card').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('#add-days-row .day-pill').forEach(p => p.classList.remove('active'));
}

function showNewClientForm() {
    // Se si decide di inserire un nuovo cliente, resettiamo le selezioni precedenti di servizio/slot
    addAppState.service = null;
    addAppState.day = null;
    addAppState.slot = null;
    addAppState.allSlots = null;

    document.getElementById('add-step-service').classList.add('hidden');
    document.getElementById('add-step-day').classList.add('hidden');
    document.getElementById('add-step-slots').classList.add('hidden');
    document.getElementById('add-confirm-btn').classList.add('hidden');

    document.querySelectorAll('#add-services-grid .service-card').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('#add-days-row .day-pill').forEach(p => p.classList.remove('active'));

    document.getElementById('new-client-fields').classList.remove('hidden');
    document.getElementById('search-container').classList.add('hidden');
    document.getElementById('add-client-card-title').innerText = "1. Nuovo Cliente";
}

function confirmNewClientData(btn) {
    const n = document.getElementById('newC-nome').value.trim();
    const c = document.getElementById('newC-cognome').value.trim();
    const t = document.getElementById('newC-tel').value.trim();
    const e = document.getElementById('newC-email').value.trim();
    const errorEl = document.getElementById('new-client-error');

    if (!n || !c || !t || !e) {
        if (errorEl) {
            errorEl.innerText = "Tutti i campi (Nome, Cognome, Telefono, Email) sono obbligatori.";
            errorEl.style.display = 'block';
        }
        return;
    }

    if (errorEl) errorEl.style.display = 'none';
    showButtonSpinner(btn);

    const clientData = { nome: capitalizeFirst(n), cognome: capitalizeFirst(c), email: e, telefono: t };

    google.script.run
        .withSuccessHandler(serverUser => {
            hideButtonSpinner(btn);
            // Aggiungi il nuovo cliente alla cache locale per la ricerca futura
            addAppState.allClients.push(serverUser);
            selectExistingClient(serverUser.email, serverUser.nome, serverUser.cognome, serverUser.telefono);
            // Svuota i campi dopo il successo
            document.getElementById('newC-nome').value = '';
            document.getElementById('newC-cognome').value = '';
            document.getElementById('newC-tel').value = '';
            document.getElementById('newC-email').value = '';
        })
        .withFailureHandler(err => {
            hideButtonSpinner(btn);
            const errorEl = document.getElementById('new-client-error');
            if (errorEl) {
                errorEl.innerText = err;
                errorEl.style.display = 'block';
            }
        })
        .registerOrUpdateUser(clientData);
}

/**
 * Logica Selezione Appuntamento (Replicata)
 */
function generateAddDayPills() {
    const container = document.getElementById('add-days-row');
    const monthLabel = document.getElementById('add-month-label');
    
    const availableDates = getBookingDays(cachedAppData.settings, cachedAppData.workingHours);

    if (availableDates.length > 0) {
        monthLabel.innerText = getMonthLabel(availableDates[0]);
    }

    container.innerHTML = availableDates.map(d => getDayPillHtml(d, 'selectDayForAdd')).join('');
}

function selectServiceForAdd(el, name, duration) {
    document.querySelectorAll('#add-services-grid .service-card').forEach(p => p.classList.remove('active'));
    el.classList.add('active');

    // Centra la card orizzontalmente nello scroll dello schermo
    el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

    addAppState.slot = null; // Reset dello slot selezionato
    document.getElementById('add-confirm-btn').classList.add('hidden'); // Nascondi il bottone di prenotazione

    // Se un giorno è già selezionato, mostriamo lo spinner nella card orari
    if (addAppState.day) {
        document.getElementById('add-step-slots').classList.remove('hidden');
        document.getElementById('add-barbers-columns').innerHTML = '<div class="spinner" style="margin: 50px auto;"></div>';
    } else {
        document.getElementById('add-step-slots').classList.add('hidden');
    }

    addAppState.service = { name, duration };
    addAppState.allSlots = null; // Svuota la cache degli slot del vecchio servizio
    document.getElementById('add-step-day').classList.remove('hidden');
    refreshSlotsForAdd(); // Chiamiamo refreshSlotsForAdd per caricare tutti gli slot per il servizio
}

function selectDayForAdd(el, isoDate) {
    document.querySelectorAll('#add-days-row .day-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    addAppState.day = isoDate;
    document.getElementById('add-step-slots').classList.remove('hidden'); // Mostra la card degli orari
    document.getElementById('add-confirm-btn').classList.add('hidden'); // Nascondi il bottone di prenotazione
    addAppState.slot = null; // Reset dello slot selezionato
    if (addAppState.allSlots) {
        renderBarberColumnsForAdd(); // Filtra gli slot già caricati
    } else {
        const container = document.getElementById('add-barbers-columns');
        container.innerHTML = '<div class="spinner" style="margin: 50px auto;"></div>';
    }
}

function refreshSlotsForAdd() {
    const container = document.getElementById('add-barbers-columns');
    const card = document.getElementById('add-step-slots');

    // Se abbiamo già caricato tutti gli slot per questo servizio, non chiamiamo il server di nuovo
    // e procediamo direttamente al rendering degli slot per il giorno selezionato.
    if (addAppState.allSlots && addAppState.day) {
        renderBarberColumnsForAdd();
        return;
    }

    // Sicurezza: se manca il servizio, non possiamo caricare gli slot
    if (!addAppState.service) {
        if (card) card.classList.add('hidden');
        document.getElementById('add-confirm-btn').classList.add('hidden');
        return;
    }

    if (addAppState.day) {
        card.classList.remove('hidden');
        container.innerHTML = '<div class="spinner" style="margin: 50px auto;"></div>';
    }

    // Effettua una chiamata al backend per ottenere gli slot disponibili
    google.script.run
        .withSuccessHandler(res => {
            // Memorizziamo tutti gli slot per il servizio selezionato
            addAppState.allSlots = Array.isArray(res) ? res : (res && res.slots ? res.slots : []);
            
            // Se un giorno è già stato selezionato, renderizziamo subito le colonne
            if (addAppState.day) renderBarberColumnsForAdd();
        })
        .withFailureHandler(err => {
            console.error("Errore caricamento slot:", err);
            if (addAppState.day) {
                container.innerHTML = `<p style="text-align:center; color:#dc3545;">Errore caricamento orari: ${err}</p>`;
            }
        })
        .getAvailableSlots(addAppState.service.duration, addAppState.service.name, addAppState.client.email); // Non passiamo il giorno, vogliamo tutti gli slot
}

function renderBarberColumnsForAdd() {
    const container = document.getElementById('add-barbers-columns');
    container.innerHTML = getBarberColumnsHtml(
        addAppState.allSlots, 
        addAppState.day, 
        cachedAppData.barbers, 
        'selectSlotForAdd'
    );
}

function selectSlotForAdd(el, iso, barberId, formatted, time, barberName) {
    document.querySelectorAll('#add-barbers-columns .time-slot').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    addAppState.slot = { iso, barberId, formatted, time, barberName };
    document.getElementById('add-confirm-btn').classList.remove('hidden');
}

function handleDashboardFinalBooking() {
    // Controllo sicurezza: verifichiamo che tutti i dati siano pronti
    if (!addAppState.client || !addAppState.slot || !addAppState.service) {
        showCustomAlert("Dati Incompleti", "Assicurati di aver selezionato cliente, servizio e orario.");
        return;
    }

    const btn = document.getElementById('add-confirm-btn');
    showButtonSpinner(btn);

    google.script.run // showCustomAlert is now global
      .withFailureHandler(err => {
        console.error("Errore aggiunta appuntamento:", err);
        hideButtonSpinner(btn);
        showCustomAlert("Errore di Rete", "Impossibile salvare l'appuntamento: " + err);
      })
      .withSuccessHandler((res) => {
        if (res && res.status === "OK") {
          refreshDashboardData(true); // Aggiorna tutto in background mentre l'utente legge
          appContainer.innerHTML = `
            <div class="success-container">
              <div style="margin-bottom: 20px; color: #8A9A5B;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <h2 style="margin-bottom: 20px;">Appuntamento Inserito!</h2>
              <p style="margin-bottom: 10px;">Per: ${addAppState.client.nome} ${addAppState.client.cognome}</p>
              <p style="margin-bottom: 2px;">${addAppState.slot.formatted}</p>
              <p style="margin-bottom: 2px;">Ore ${addAppState.slot.time}</p>
              <p style="font-size: 0.9em; color: #666; margin-bottom: 10px;">Barbiere: ${addAppState.slot.barberName}</p>
              <button onclick="renderBarberDashboardPage()" style="background: transparent; color: #8A9A5B; border: none; font-weight: 700; text-transform: uppercase; margin-top: 30px; width: 100%; cursor: pointer; padding: 15px;">Chiudi</button>
            </div>`;
        } else {
          hideButtonSpinner(btn);
          showCustomAlert("Errore", res.message || "Impossibile completare la prenotazione.");
        }
      }).processBooking(addAppState.client, addAppState.slot.iso, addAppState.service.name, addAppState.service.duration, addAppState.slot.barberId);
}
