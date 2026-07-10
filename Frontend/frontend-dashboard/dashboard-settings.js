/**
 * Logica e Rendering della pagina "Impostazioni" per il barbiere.
 */

let initialSettingsState = null; // Stato iniziale per il controllo modifiche
/**
 * Helper per creare il blocco HTML di un barbiere con etichette descrittive
 */
window.createBarberBlockHtml = function(id, b) {
    const isFirst = id === 'barber_1';
    return `
        <div class="settings-barber-block" data-id="${id}" style="border: 1px solid #eee; padding: 15px; border-radius: 15px; background: #fafafa; position: relative;">
            ${!isFirst ? `
                <button onclick="this.closest('.settings-barber-block').remove()" style="position: absolute; top: 10px; right: 10px; border: none; background: none; color: #dc3545; padding: 5px; cursor: pointer; display: flex;" title="Rimuovi barbiere">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            ` : ''}
            <div style="font-weight: 800; font-size: 0.85em; color: #8A9A5B; margin-bottom: 15px; text-transform: uppercase;">ID: ${id}</div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="text-align: left;">
                    <label style="font-size: 0.7em; font-weight: 700; color: #999; text-transform: uppercase; margin-bottom: 2px; display: block;">Nome</label>
                    <input type="text" class="barber-inp" data-id="${id}" data-f="nome" value="${b.nome || ''}" placeholder="Nome del barbiere">
                </div>
                <div style="text-align: left;">
                    <label style="font-size: 0.7em; font-weight: 700; color: #999; text-transform: uppercase; margin-bottom: 2px; display: block;">ID Calendario Google</label>
                    <input type="text" class="barber-inp" data-id="${id}" data-f="calendarId" value="${b.calendarId || 'primary'}" placeholder="Indirizzo email del calendario">
                </div>
                <div style="text-align: left;">
                    <label style="font-size: 0.7em; font-weight: 700; color: #999; text-transform: uppercase; margin-bottom: 2px; display: block;">Email di Login</label>
                    <input type="email" class="barber-inp" data-id="${id}" data-f="email" value="${b.email || ''}" placeholder="email@esempio.com">
                </div>
                <div style="text-align: left;">
                    <label style="font-size: 0.7em; font-weight: 700; color: #999; text-transform: uppercase; margin-bottom: 2px; display: block;">Telefono</label>
                    <input type="tel" class="barber-inp" data-id="${id}" data-f="telefono" value="${b.telefono || ''}" placeholder="Numero di telefono">
                </div>
                <div style="text-align: left;">
                    <label style="font-size: 0.7em; font-weight: 700; color: #999; text-transform: uppercase; margin-bottom: 2px; display: block;">URL Immagine Profilo</label>
                    <input type="text" class="barber-inp" data-id="${id}" data-f="foto" value="${b.foto || ''}" placeholder="Link alla foto">
                </div>
                <div style="text-align: left;">
                    <label style="font-size: 0.7em; font-weight: 700; color: #999; text-transform: uppercase; margin-bottom: 2px; display: block;">Password Dashboard</label>
                    <input type="text" class="barber-inp" data-id="${id}" data-f="password" value="${b.password || ''}" placeholder="Password di accesso">
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f0f0f0;">
                    <span style="font-size: 0.9em; font-weight: 600; color: #333;">Barbiere Attivo</span>
                    <label class="switch-btn">
                        <input type="checkbox" class="barber-inp-check" data-id="${id}" ${(b.isActive === true || b.isActive === "TRUE") ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        </div>
    `;
}

window.addNewBarberBlock = function() {
    const list = document.getElementById('settings-barbers-list');
    const newId = "barber_" + Date.now();
    const html = createBarberBlockHtml(newId, { nome: "", calendarId: "primary", email: "", telefono: "", foto: "", password: "", isActive: true });
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    list.appendChild(tempDiv.firstElementChild);
    list.lastElementChild.scrollIntoView({ behavior: 'smooth' });
}

function renderBarberSettingsPage(skipPush = false, isSilent = false) {
    window.scrollTo(0, 0);
    if (!skipPush) pushView('settings');
    const settings = cachedAppData.settings;
    const allBarbers = cachedAppData.allBarbers || cachedAppData.barbers;
    
    // Identifichiamo il barbiere loggato
    const barberEntries = Object.entries(allBarbers);
    const loggedInEntry = barberEntries.find(([id, b]) => b.email.toLowerCase() === userData.email.toLowerCase());
    const currentBarberId = loggedInEntry ? loggedInEntry[0] : null;
    const isOwner = currentBarberId === 'barber_1';

    const animClass = isSilent ? '' : 'fade-in';

    appContainer.innerHTML = `
        <div id="barber-settings-screen" class="full-screen">
            <div class="fixed-header">
                <button onclick="renderBarberDashboardPage();" class="header-back-btn">
                <button onclick="handleBackFromSettings();" class="header-back-btn">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <h2>IMPOSTAZIONI</h2>
            </div>
            <div class="home-content">
                <div class="booking-container">
                    ${isOwner ? `
                    <!-- CARD 1: DATI SALONE (Solo Titolare) -->
                    <div class="booking-card ${animClass}">
                        <div class="card-title">Dati Salone</div>
                        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
                            <div style="text-align: left; width: 100%;">
                                <label style="font-size: 0.75em; font-weight: 700; color: #666; margin-bottom: 2px; display: block; text-transform: uppercase;">Nome dell'attività</label>
                                <input type="text" id="set-BUSINESS_NAME" value="${settings.BUSINESS_NAME || ''}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)">
                            </div> 
                            <div style="text-align: left; width: 100%;">
                                <label style="font-size: 0.75em; font-weight: 700; color: #666; margin-bottom: 2px; display: block; text-transform: uppercase;">Indirizzo</label>
                                <input type="text" id="set-BUSINESS_ADDRESS" value="${settings.BUSINESS_ADDRESS || ''}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)">
                            </div>
                            <div style="text-align: left; width: 100%;">
                                <label style="font-size: 0.75em; font-weight: 700; color: #666; margin-bottom: 2px; display: block; text-transform: uppercase;">Telefono</label>
                                <input type="tel" id="set-CONTACT_PHONE" value="${settings.CONTACT_PHONE || ''}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)"> 
                            </div>
                            <div style="text-align: left; width: 100%;">
                                <label style="font-size: 0.75em; font-weight: 700; color: #666; margin-bottom: 2px; display: block; text-transform: uppercase;">Email per contatti e notifiche</label>
                                <input type="email" id="set-CONTACT_EMAIL" value="${settings.CONTACT_EMAIL || ''}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)">
                            </div> 
                        </div>
                    </div>
                    ` : ''}

                    <!-- CARD 2: DATI BARBIERI -->
                    <div class="booking-card ${animClass}" style="animation-delay: 0.1s;">
                        <div class="card-title">${isOwner ? 'Dati Barbieri' : 'Il mio Profilo'}</div>
                        <div id="settings-barbers-list" style="display: flex; flex-direction: column; gap: 20px; width: 100%; margin-bottom: 15px;">
                            ${isOwner 
                                ? Object.entries(allBarbers).map(([id, b]) => createBarberBlockHtml(id, b)).join('')
                                : createBarberBlockHtml(currentBarberId, allBarbers[currentBarberId])
                            }
                        </div>
                        ${isOwner ? `<button onclick="addNewBarberBlock()" style="width: 100%; padding: 12px; border: 2px dashed #ccc; color: #888; background: #fdfdfd; border-radius: 15px; font-size: 0.8em; font-weight: 700;">+ AGGIUNGI BARBIERE</button>` : ''}
                    </div>

                    ${isOwner ? `
                    <!-- CARD 3: APPUNTAMENTI (Solo Titolare) -->
                    <div class="booking-card ${animClass}" style="animation-delay: 0.2s;">
                        <div class="card-title">Appuntamenti</div>
                        <div style="display: flex; flex-direction: column; gap: 15px; width: 100%;">
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                                <span style="font-size: 0.9em; font-weight: 600; color: #333; line-height: 1.2;">Abilita tasto richiesta cancellazione appuntamento per i clienti</span>
                                <label class="switch-btn">
                                    <input type="checkbox" id="set-CANCELLATION_BUTTON" ${settings.CANCELLATION_BUTTON === true || settings.CANCELLATION_BUTTON === "TRUE" ? 'checked' : ''}>
                                    <span class="slider"></span>
                                </label>
                            </div>

                            <div style="text-align: left; width: 100%;">
                                <label style="font-size: 0.75em; font-weight: 700; color: #666; margin-bottom: 2px; display: block; text-transform: uppercase;">Ore massime prima dell'appuntamento per richiedere la cancellazione</label>
                                <input type="number" id="set-MIN_CANCELLATION_HOURS" value="${settings.MIN_CANCELLATION_HOURS || 24}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)">
                            </div>

                            <div style="text-align: left; width: 100%;">
                                <label style="font-size: 0.75em; font-weight: 700; color: #666; margin-bottom: 2px; display: block; text-transform: uppercase;">Minuti dopo la prenotazione per annullare autonomamente l'appuntamento</label>
                                <input type="number" id="set-AUTO_CANCELLATION_MINUTES" value="${settings.AUTO_CANCELLATION_MINUTES || 5}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)">
                            </div>

                            <div style="text-align: left; width: 100%;">
                                <label style="font-size: 0.75em; font-weight: 700; color: #666; margin-bottom: 2px; display: block; text-transform: uppercase;">Giorni futuri che il cliente ha per prenotare</label>
                                <input type="number" id="set-BOOKING_WINDOW_DAYS" value="${settings.BOOKING_WINDOW_DAYS || 15}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)">
                            </div>

                            <div style="text-align: left; width: 100%;">
                                <label style="font-size: 0.75em; font-weight: 700; color: #666; margin-bottom: 2px; display: block; text-transform: uppercase;">Disponibilità appuntamenti da:</label>
                                <select id="set-MIN_BOOKINGS_DAYS" style="width: 100%; height: 45px; border-radius: 25px; border: 1px solid #ccc; background: #fff; padding: 0 15px;">
                                    <option value="0" ${settings.MIN_BOOKINGS_DAYS == 0 ? 'selected' : ''}>Oggi</option>
                                    <option value="1" ${settings.MIN_BOOKINGS_DAYS == 1 ? 'selected' : ''}>Domani</option>
                                    <option value="2" ${settings.MIN_BOOKINGS_DAYS == 2 ? 'selected' : ''}>Dopodomani</option>
                                    <option value="next_week" ${settings.MIN_BOOKINGS_DAYS === 'next_week' ? 'selected' : ''}>Prossima settimana (Lunedì)</option>
                                </select>
                            </div>

                            <div style="text-align: left; width: 100%;">
                                <label style="font-size: 0.75em; font-weight: 700; color: #666; margin-bottom: 2px; display: block; text-transform: uppercase;">Giorni di storico appuntamenti passati visibili</label>
                                <input type="number" id="set-BOOKING_HISTORY" value="${settings.BOOKING_HISTORY || 90}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)"> 
                            </div>
                        </div>
                    </div>

                    <!-- CARD 4: NOTIFICHE (Solo Titolare) -->
                    <div class="booking-card ${animClass}" style="animation-delay: 0.3s;">
                        <div class="card-title">Notifiche</div>
                        <div style="display: flex; flex-direction: column; gap: 15px; width: 100%;">
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                                <span style="font-size: 0.9em; font-weight: 600; color: #333; line-height: 1.2;">Abilita tutte le notifiche email (conferma, cancellazione, promemoria)</span>
                                <label class="switch-btn">
                                    <input type="checkbox" id="set-EMAIL_NOTIFICATION" ${settings.EMAIL_NOTIFICATION === true || settings.EMAIL_NOTIFICATION === "TRUE" ? 'checked' : ''}>
                                    <span class="slider"></span>
                                </label>
                            </div>

                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 5px; padding-top: 5px; border-top: 1px solid #f9f9f9;">
                                <span style="font-size: 0.9em; font-weight: 600; color: #333; line-height: 1.2;">Invia una notifica email al barbiere per ogni nuova prenotazione</span>
                                <label class="switch-btn">
                                    <input type="checkbox" id="set-BARBER_BOOKING_NOTIFICATION" ${settings.BARBER_BOOKING_NOTIFICATION === true || settings.BARBER_BOOKING_NOTIFICATION === "TRUE" ? 'checked' : ''}>
                                    <span class="slider"></span>
                                </label>
                            </div>
                            
                            <div style="text-align: left; width: 100%;">
                                <label style="font-size: 0.75em; font-weight: 700; color: #666; margin-bottom: 2px; display: block; text-transform: uppercase;">Ore preavviso promemoria</label>
                                <input type="number" id="set-REMINDER_NOTIFICATION_TIME" value="${settings.REMINDER_NOTIFICATION_TIME || 24}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)"> 
                            </div>
                        </div>
                    </div>
                    ` : ''}

                </div>
            </div>
        </div>
    `;

    // Salva lo stato iniziale delle impostazioni per evitare salvataggi inutili all'uscita
    setTimeout(() => {
        initialSettingsState = getCurrentSettingsState();
    }, 100);
}

/**
 * Cattura lo stato attuale di tutte le impostazioni e dei dati dei barbieri nel DOM per il confronto.
 */
function getCurrentSettingsState() {
    const currentSettingsData = {};
    const settingsKeys = [
        'BUSINESS_NAME', 'BUSINESS_ADDRESS', 'CONTACT_PHONE', 'CONTACT_EMAIL',
        'MIN_CANCELLATION_HOURS', 'AUTO_CANCELLATION_MINUTES', 'BOOKING_WINDOW_DAYS', 
        'BOOKING_HISTORY', 'REMINDER_NOTIFICATION_TIME', 'MIN_BOOKINGS_DAYS'
    ];
    settingsKeys.forEach(key => {
        const el = document.getElementById('set-' + key);
        if (el) currentSettingsData[key] = el.value.trim();
    });

    const checkKeys = ['CANCELLATION_BUTTON', 'EMAIL_NOTIFICATION', 'BARBER_BOOKING_NOTIFICATION'];
    checkKeys.forEach(key => {
        const el = document.getElementById('set-' + key);
        if (el) currentSettingsData[key] = el.checked;
    });

    const currentBarbersArray = [];
    const barberBlocks = document.querySelectorAll('.settings-barber-block');
    barberBlocks.forEach(block => {
        const id = block.dataset.id;
        const bData = { id: id };
        const inputs = block.querySelectorAll(`.barber-inp[data-id="${id}"]`);
        inputs.forEach(inp => { bData[inp.dataset.f] = inp.value.trim(); });
        const check = block.querySelector(`.barber-inp-check[data-id="${id}"]`);
        bData.isActive = check ? check.checked : false;
        currentBarbersArray.push(bData);
    });

    return JSON.stringify({ settings: currentSettingsData, barbers: currentBarbersArray });
}

/**
 * Raccoglie tutti i dati e li invia al server.
 */
function saveAllSettings(btn = null) {
    const currentState = getCurrentSettingsState();
    
    // Se il salvataggio è automatico (btn è null) e non ci sono modifiche, usciamo senza chiamare il server
    if (btn === null && (initialSettingsState === currentState || initialSettingsState === null)) {
        return;
    }

    if (btn) showButtonSpinner(btn);

    // 1. Raccogliamo Settings
    const settingsKeys = [
        'BUSINESS_NAME', 'BUSINESS_ADDRESS', 'CONTACT_PHONE', 'CONTACT_EMAIL',
        'MIN_CANCELLATION_HOURS', 'AUTO_CANCELLATION_MINUTES', 'BOOKING_WINDOW_DAYS', 
        'BOOKING_HISTORY', 'REMINDER_NOTIFICATION_TIME', 'MIN_BOOKINGS_DAYS'
    ];
    
    const settingsData = {};
    settingsKeys.forEach(key => {
        const el = document.getElementById('set-' + key);
        if (el) settingsData[key] = el.value.trim();
    });

    // Checkboxes Settings
    const checkKeys = ['CANCELLATION_BUTTON', 'EMAIL_NOTIFICATION', 'BARBER_BOOKING_NOTIFICATION'];
    checkKeys.forEach(key => {
        const el = document.getElementById('set-' + key);
        if (el) settingsData[key] = el.checked;
    });

    // 2. Raccogliamo Barbieri
    const barbersArray = [];
    const barberBlocks = document.querySelectorAll('.settings-barber-block');
    
    barberBlocks.forEach(block => {
        const id = block.dataset.id;
        const bData = { id: id };
        const inputs = block.querySelectorAll(`.barber-inp[data-id="${id}"]`);
        bData.calendarId = 'primary'; // Valore fisso non più modificabile
        inputs.forEach(inp => {
            bData[inp.dataset.f] = inp.value.trim();
        });
        
        const check = block.querySelector(`.barber-inp-check[data-id="${id}"]`);
        bData.isActive = check ? check.checked : false;
        
        barbersArray.push(bData);
    });

    // 3. Invio al server
    google.script.run
        .withSuccessHandler(res => {
            if (res && res.status === "OK") {
                if (btn) {
                    showCustomAlert("Successo", "Tutte le impostazioni sono state salvate correttamente.", () => {
                        // Chiudi tutti i popup e reindirizza alla dashboard home, aggiornando i dati
                        closeAllPopupsAndRedirect(refreshDashboardData, true);
                    });
                } else { // Auto-save success
                    initialSettingsState = currentState; // Aggiorna lo stato di riferimento
                    refreshDashboardData(true); // Aggiorna la cache locale
                }
            } else {
                const errorMsg = (res && res.message) ? res.message : (typeof res === 'object' ? JSON.stringify(res) : res);
                if (btn) {
                    hideButtonSpinner(btn);
                    showCustomAlert("Errore", errorMsg);
                } else { // Auto-save error
                    console.error("Auto-save settings error:", errorMsg);
                }
            }
        })
        .withFailureHandler(err => {
            if (btn) {
                hideButtonSpinner(btn);
                showCustomAlert("Errore di Rete", err);
            } else { // Auto-save error
                console.error("Auto-save settings network error:", err);
                showCustomAlert("Errore di Rete", "Errore durante il salvataggio automatico delle impostazioni: " + err);
            }
        })
        .saveGlobalSettings(settingsData, barbersArray);
}

/**
 * Gestisce il ritorno alla dashboard salvando i dati delle impostazioni se modificati.
 */
function handleBackFromSettings() {
    saveAllSettings(null); // Tenta il salvataggio automatico
    renderBarberDashboardPage(); // Torna alla dashboard
}