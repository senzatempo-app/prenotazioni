/**
 * Gestione Orari e Servizi - Dashboard Admin
 */

let currentAdminTab = 'hours'; // Default tab for the admin section
let currentAdminWorkingBarberId = null; // Barbiere visualizzato nella tab orari
let initialWorkingHoursState = null; // Stato iniziale per il controllo modifiche

function renderBarberWorkingHoursPage(skipPush = false, isSilent = false) {
    window.scrollTo(0, 0);
    if (!skipPush) pushView('working-hours');
    const workingHours = cachedAppData.workingHours;
    const settings = cachedAppData.settings;
    const allBarbers = cachedAppData.allBarbers || cachedAppData.barbers;

    // Identifichiamo il barbiere loggato (per permessi e default)
    const barberEntries = Object.entries(allBarbers);
    const loggedInEntry = barberEntries.find(([id, b]) => b.email.toLowerCase() === userData.email.toLowerCase());
    const loggedInBarberId = loggedInEntry ? loggedInEntry[0] : 'barber_1';
    const isOwner = loggedInBarberId === 'barber_1';

    if (!currentAdminWorkingBarberId) currentAdminWorkingBarberId = loggedInBarberId;
    const displayedBarber = allBarbers[currentAdminWorkingBarberId];

    const animClass = isSilent ? '' : 'fade-in';

    appContainer.innerHTML = `
        <div id="barber-working-hours-screen" class="full-screen">
            <div class="fixed-header">
                <button onclick="handleBackFromWorkingHours();" class="header-back-btn">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <h2>ORARI E SERVIZI</h2>
            </div>
            <div class="home-content">
                <div class="booking-container">
                    <!-- Tabs -->
                    <div style="display: flex; gap: 10px; margin-bottom: 20px; background: #eee; padding: 5px;" class="admin-tabs-container">
                        <button id="tab-hours" onclick="switchAdminTab('hours')" style="flex:1; border:none; padding:10px; background:#8A9A5B; color:white; font-weight:700; transition: all 0.3s;" class="admin-tab-btn">Orari</button>
                        <button id="tab-services" onclick="switchAdminTab('services')" style="flex:1; border:none; padding:10px; background:transparent; color:#666; font-weight:700; transition: all 0.3s;" class="admin-tab-btn">Servizi</button>
                    </div>

                    <!-- Section Orari -->
                    <div id="admin-section-hours" class="${animClass}">
                        <!-- Navigazione Barbiere (Solo Titolare) -->
                        <div class="barber-display-header" style="background: white; border-radius: 20px; margin-bottom: 15px; padding: 10px 15px; border: 1px solid #eee;">
                            <div style="text-align: center; flex: 1;">
                                <div style="font-size: 0.7em; color: #999; text-transform: uppercase; font-weight: 700;">I tuoi orari</div>
                                <div style="font-weight: 800; color: #1a1a1a;">${displayedBarber.nome}</div>
                            </div>
                        </div>

                        <div class="booking-card" style="padding: 15px;">
                            <div class="card-title">Orari di Apertura</div>
                            <div style="overflow-x: auto; width: 100%;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">
                                    <thead><tr style="border-bottom: 1px solid #eee;"><th style="text-align:left; padding:10px 0;">Giorno</th><th style="text-align:center; padding:8px; white-space: normal;">Mattina</th><th style="text-align:center; padding:8px; white-space: normal;">Pomeriggio</th></tr></thead>
                                    <tbody id="hours-table-body"></tbody>
                                </table>
                            </div>

                            <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                                <label style="font-size: 0.9em; font-weight: 600; color: #333; display: block; margin-bottom: 12px; text-transform: uppercase;">Appuntamenti disponibili:</label>
                                <div id="global-visibility-warning" style="font-size: 0.7em; color: #8A9A5B; margin-bottom: 8px; font-weight: 700;">(IMPOSTAZIONE GLOBALE PER TUTTI)</div>
                                <div style="display: flex; flex-direction: column; gap: 15px;">
                                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                                        <span style="font-size: 0.9em; font-weight: 600; color: #333;">Mostra tutti gli orari liberi</span>
                                        <label class="switch-btn">
                                            <input type="checkbox" id="vis-all" onchange="saveAdminHours(null)" ${workingHours._visibility[0] === true || workingHours._visibility[0] === "TRUE" ? 'checked' : ''}>
                                            <span class="slider"></span>
                                        </label>
                                    </div>
                                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                                        <span style="font-size: 0.9em; font-weight: 600; color: #333;">Solo il prossimo slot (dalle aperture)</span>
                                        <label class="switch-btn">
                                            <input type="checkbox" id="vis-next" onchange="saveAdminHours(null)" ${workingHours._visibility[1] === true || workingHours._visibility[1] === "TRUE" ? 'checked' : ''}>
                                            <span class="slider"></span>
                                        </label>
                                    </div>
                                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                                        <span style="font-size: 0.9em; font-weight: 600; color: #333;">Solo l'ultimo slot (dalle chiusure)</span>
                                        <label class="switch-btn">
                                            <input type="checkbox" id="vis-preview" onchange="saveAdminHours(null)" ${workingHours._visibility[2] === true || workingHours._visibility[2] === "TRUE" ? 'checked' : ''}>
                                            <span class="slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="holiday-suggestions" class="booking-card ${animClass} hidden" style="animation-delay: 0.2s; margin-top: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 15px;">
                                <div class="card-title" style="margin: 0;">Chiusure per festività</div>
                                <button onclick="showHolidayEditor()" style="background: #8A9A5B; color: white; border: none; padding: 6px 12px; border-radius: 20px; font-weight: 700; font-size: 0.85em; cursor: pointer;">+ RICORRENZA</button>
                            </div>
                            <div id="holidays-list" style="display: flex; flex-direction: column; gap: 8px; width: 100%;"></div>
                        </div>
                    </div>

                    <!-- Section Servizi -->
                    <div id="admin-section-services" class="${animClass} hidden">
                        <button onclick="showServiceEditor()" style="width:100%; margin-bottom:15px; background:#8A9A5B; color:white; border:none; padding:15px; border-radius:30px; font-weight:700;">+ AGGIUNGI SERVIZIO</button>
                        <div id="admin-services-list" style="display:flex; flex-direction:column; gap:8px;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    populateHoursAdmin();
    populateServicesAdmin();
    renderItalianHolidays();
    switchAdminTab(currentAdminTab); // Activate the last active tab

    // Salva lo stato iniziale degli orari e visibilità per evitare salvataggi inutili all'uscita
    setTimeout(() => {
        initialWorkingHoursState = getCurrentHoursState();
    }, 100);
}

/**
 * Cattura lo stato attuale degli orari e della visibilità nel DOM per il confronto
 */
function getCurrentHoursState() {
    const days = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
    const hData = days.map(d => ({
        oA: document.querySelector(`[data-d="${d}"][data-p="oA"]`)?.value.trim() || "",
        cA: document.querySelector(`[data-d="${d}"][data-p="cA"]`)?.value.trim() || "",
        oP: document.querySelector(`[data-d="${d}"][data-p="oP"]`)?.value.trim() || "",
        cP: document.querySelector(`[data-d="${d}"][data-p="cP"]`)?.value.trim() || ""
    }));
    const visibility = [
        document.getElementById('vis-all')?.checked,
        document.getElementById('vis-next')?.checked,
        document.getElementById('vis-preview')?.checked
    ];
    return JSON.stringify({ hData, visibility, barberId: currentAdminWorkingBarberId });
}

function switchAdminTab(type) {
    const isH = type === 'hours';
    const hBtn = document.getElementById('tab-hours');
    const sBtn = document.getElementById('tab-services');
    
    currentAdminTab = type; // Update global variable
    hBtn.style.backgroundColor = isH ? '#8A9A5B' : 'transparent';
    hBtn.style.color = isH ? 'white' : '#666';
    sBtn.style.backgroundColor = !isH ? '#8A9A5B' : 'transparent';
    sBtn.style.color = !isH ? 'white' : '#666';

    document.getElementById('admin-section-hours').classList.toggle('hidden', !isH);
    document.getElementById('admin-section-services').classList.toggle('hidden', isH);
}

function populateHoursAdmin() {
    const days = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
    const bId = currentAdminWorkingBarberId;
    const wh = cachedAppData.workingHours[bId] || [];
    
    document.getElementById('hours-table-body').innerHTML = days.map(d => {
        // Nella nuova struttura bId è index 0, Giorno è index 1, Orari index 2-5
        const config = wh.find(r => r[1] && r[1].toLowerCase() === d) || [bId, d, "", "", "", ""];
        return `
            <tr style="border-bottom: 1px solid #f4f4f4;">
                <td style="padding:10px 0; font-weight:700; text-transform:capitalize;">${d.substring(0,3)}</td>
                <td><div style="display:flex; gap:5px; justify-content:center;"><input type="text" class="h-inp" data-d="${d}" data-p="oA" value="${config[2] || ''}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)" style="width:60px; padding:8px 4px; font-size:0.85em; text-align:center; border:1px solid #ddd; background:#f9f9f9;"><input type="text" class="h-inp" data-d="${d}" data-p="cA" value="${config[3] || ''}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)" style="width:60px; padding:8px 4px; font-size:0.85em; text-align:center; border:1px solid #ddd; background:#f9f9f9;"></div></td>
                <td><div style="display:flex; gap:5px; justify-content:center;"><input type="text" class="h-inp" data-d="${d}" data-p="oP" value="${config[4] || ''}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)" style="width:60px; padding:8px 4px; font-size:0.85em; text-align:center; border:1px solid #ddd; background:#f9f9f9;"><input type="text" class="h-inp" data-d="${d}" data-p="cP" value="${config[5] || ''}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)" style="width:60px; padding:8px 4px; font-size:0.85em; text-align:center; border:1px solid #ddd; background:#f9f9f9;"></div></td>
            </tr>`;
    }).join('');
}

/**
 * Attiva o disattiva un servizio direttamente dalla lista
 */
function toggleServiceActive(name, isChecked) {
    const svc = cachedAppData.services.find(s => s.name === name);
    if (!svc) return;

    google.script.run.withSuccessHandler(res => {
        if (res && res.status === "OK") {
            svc.isActive = isChecked;
            populateServicesAdmin(); // Aggiorna immediatamente la UI
            refreshDashboardData(true); // Aggiorna la cache silenziosamente
        } else {
            showCustomAlert("Errore", "Impossibile aggiornare lo stato: " + (res.message || "Errore sconosciuto"));
            renderBarberWorkingHoursPage(); // Forza il refresh per ripristinare la UI
        }
    })
    .withFailureHandler(err => {
        showCustomAlert("Errore di Rete", "Errore durante l'aggiornamento: " + err);
        renderBarberWorkingHoursPage();
    })
    .manageService('edit', { ...svc, oldName: name, isActive: isChecked });
}

function populateServicesAdmin() {
    document.getElementById('admin-services-list').innerHTML = cachedAppData.services.map(s => `
        <div class="booking-card" style="flex-direction:row; justify-content:space-between; align-items:center; padding:15px 20px; margin-bottom:0; flex-wrap: wrap; gap: 10px;">
            <div style="display:flex; align-items:center; gap:15px; flex: 1; min-width: 200px;">
                <label class="switch-btn">
                    <input type="checkbox" onchange="toggleServiceActive('${s.name}', this.checked)" ${s.isActive ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
                <div style="width:55px; height:55px; border-radius:10px; background-image:url('${s.imageUrl}'); background-size:cover; background-position:center; background-color:#f0f0f0; flex-shrink: 0;"></div>
                <div style="min-width: 0;"><div style="font-weight:700; font-size:1em; word-break: break-word;">${s.name.replace(/_/g,' ')}</div><div style="font-size:0.85em; color:#666;">${s.duration} min • ${s.price || 0}€</div></div>
            </div>
            <div style="display:flex; gap:8px; flex-shrink: 0;">
                <button onclick="showServiceEditor('${s.name}')" style="border:none; background:none; padding:5px; cursor:pointer; display:flex;" title="Modifica servizio">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button onclick="deleteAdminService('${s.name}')" style="border:none; background:none; padding:5px; cursor:pointer; display:flex;" title="Elimina servizio">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        </div>`).join('');
}

function saveAdminHours(btn = null) {
    const currentState = getCurrentHoursState();
    
    // Se il salvataggio è automatico (btn è null) e non ci sono modifiche, usciamo senza chiamare il server
    if (btn === null && (initialWorkingHoursState === currentState || initialWorkingHoursState === null)) {
        return;
    }

    const original = btn ? btn.innerText : ""; 
    if (btn) { btn.innerText = "Salva..."; btn.disabled = true; }

    const days = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
    const hData = days.map(d => ({
        day: d,
        openAM: document.querySelector(`[data-d="${d}"][data-p="oA"]`).value.trim(),
        closeAM: document.querySelector(`[data-d="${d}"][data-p="cA"]`).value.trim(),
        openPM: document.querySelector(`[data-d="${d}"][data-p="oP"]`).value.trim(),
        closePM: document.querySelector(`[data-d="${d}"][data-p="cP"]`).value.trim()
    }));
    const payload = {
        targetBarberId: currentAdminWorkingBarberId,
        workingHours: hData,
        visibility: { 
            isAllTime: document.getElementById('vis-all').checked, 
            isNextTime: document.getElementById('vis-next').checked, 
            isPreviewTime: document.getElementById('vis-preview').checked 
        },
        settings: {}
    };
    google.script.run
    .withSuccessHandler(res => {
        if (btn) {
            btn.innerText = original; btn.disabled = false;
            if(res && res.status === "OK") showCustomAlert("Salvataggio effettuato", "Impostazioni aggiornate.", () => refreshDashboardData(true));
            else showCustomAlert("Errore", res.message || "Errore durante il salvataggio.");
        } else if(res && res.status === "OK") {
            initialWorkingHoursState = currentState; // Aggiorna lo stato di riferimento dopo il successo
            refreshDashboardData(true);
        }
    })
    .withFailureHandler(err => {
        if (btn) {
            btn.innerText = original; btn.disabled = false;
            showCustomAlert("Errore di Sistema", "Impossibile salvare: " + err);
        } else {
            console.error("Auto-save error:", err);
        }
    })
    .saveWorkingHoursAndSettings(payload);
}

function showServiceEditor(oldName = null) {
    const svc = oldName ? cachedAppData.services.find(s => s.name === oldName) : { name:"", duration:"", price:"", imageUrl:"", isActive:true };
    const contentHtml = `
        <div style="display:flex; flex-direction:column; gap:12px; width:100%; text-align: left;">
            <div>
                <label class="detail-label">Nome Servizio</label>
                <input type="text" id="ed-svc-name" value="${svc.name}" placeholder="Es. Taglio">
            </div>
            <div>
                <label class="detail-label">Durata (min)</label>
                <input type="number" id="ed-svc-dur" value="${svc.duration}" placeholder="Es. 30">
            </div>
            <div>
                <label class="detail-label">Prezzo (€)</label>
                <input type="number" id="ed-svc-price" value="${svc.price ?? ''}" placeholder="Es. 20">
            </div>
            <div>
                <label class="detail-label">URL Immagine</label>
                <input type="text" id="ed-svc-img" value="${svc.imageUrl}" placeholder="http://...">
            </div>
        </div>`;
    const actionsHtml = `
        <button class="popup-action-secondary" onclick="(() => { 
            closeAllPopupsAndRedirect();
        })()">Annulla</button>
        <button id="saveSvcAdminBtn" class="popup-action-main" style="color:#8A9A5B;">Salva</button>
    `;
    const overlay = createPopup('service-editor-popup', oldName ? 'Modifica Servizio' : 'Nuovo Servizio', contentHtml, actionsHtml);

    document.getElementById('saveSvcAdminBtn').onclick = () => {
        const btn = document.getElementById('saveSvcAdminBtn');
        const data = {
            oldName: oldName,
            name: document.getElementById('ed-svc-name').value.trim(),
            duration: document.getElementById('ed-svc-dur').value,
            price: document.getElementById('ed-svc-price').value,
            imageUrl: document.getElementById('ed-svc-img').value.trim(),
            isActive: svc.isActive // Mantiene lo stato attuale selezionato in lista
        };
        if(!data.name || !data.duration) { showCustomAlert("Errore", "Nome e durata obbligatori."); return; }
        btn.innerText = "Salva..."; btn.disabled = true;
        google.script.run
        .withSuccessHandler(res => {
            if(res && res.status === "OK") {
                showCustomAlert("Salvato", "Servizio salvato con successo.", () => {
                    // Aggiornamento locale istantaneo della cache
                    const newSvc = { 
                        name: data.name, 
                        duration: parseInt(data.duration) || 0, 
                        price: parseFloat(data.price) || 0, 
                        imageUrl: data.imageUrl, 
                        isActive: data.isActive 
                    };
                    if (oldName) {
                        const idx = cachedAppData.services.findIndex(s => s.name === oldName);
                        if (idx !== -1) cachedAppData.services[idx] = newSvc;
                    } else {
                        cachedAppData.services.push(newSvc);
                    }
                    // Chiudi tutti i popup e aggiorna la lista dei servizi e la dashboard
                    closeAllPopupsAndRedirect(() => { populateServicesAdmin(); refreshDashboardData(true); });
                });
            }
            else showCustomAlert("Errore", res);
        }).manageService(oldName ? 'edit' : 'add', data);
    };
}

function deleteAdminService(name) {
    const contentHtml = `<p>Sei sicuro di voler eliminare il servizio <strong>${name.replace(/_/g, ' ')}</strong>?</p>`;
    const actionsHtml = `
        <button class="popup-action-secondary" onclick="closeAllPopupsAndRedirect()">Annulla</button>
        <button id="confirmDeleteBtn" class="popup-action-danger">Elimina</button>
    `;
    createPopup('delete-service-popup', 'Elimina Servizio', contentHtml, actionsHtml);

    document.getElementById('confirmDeleteBtn').onclick = () => {
        const btn = document.getElementById('confirmDeleteBtn');
        showButtonSpinner(btn);

        google.script.run
        .withSuccessHandler(res => {
            if(res === "OK") {
                showCustomAlert("Eliminato", "Servizio rimosso.", () => { 
                    // Rimozione locale istantanea
                    cachedAppData.services = cachedAppData.services.filter(s => s.name !== name);
                    // Chiudi tutti i popup e aggiorna la lista dei servizi e la dashboard
                    closeAllPopupsAndRedirect(() => { populateServicesAdmin(); refreshDashboardData(true); });
                });
            } else {
                hideButtonSpinner(btn);
                showCustomAlert("Errore", res);
            }
        })
        .withFailureHandler(err => {
            btn.innerText = "ELIMINA"; btn.disabled = false;
            showCustomAlert("Errore di Rete", err);
        })
        .manageService('delete', { name: name });
    };
}

/**
 * Gestione Festività
 */
const STANDARD_HOLIDAYS = [
  "Capodanno", "Epifania", "Liberazione", "Festa del Lavoro", 
  "Festa della Repubblica", "Ferragosto", "Ognissanti", 
  "Immacolata", "Natale", "S. Stefano", "Pasqua", "Lunedì dell'Angelo"
];

function renderItalianHolidays() {
    const list = cachedAppData.italianHolidays;
    if (!list || list.length === 0) return;
    const container = document.getElementById('holidays-list');
    if (!container) return;
    document.getElementById('holiday-suggestions').classList.remove('hidden');
    container.innerHTML = list.map(h => {
        const isStandard = STANDARD_HOLIDAYS.includes(h.name);
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; background: #fff; border: 1px solid #eee; border-radius: 15px;">
                <div style="text-align: left; flex: 1; min-width: 0;">
                    <div style="font-weight: 700; font-size: 0.9em;">${h.name}</div>
                    <div style="font-size: 0.75em; color: #888;">${h.display}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
                    ${!isStandard ? `
                        <button onclick="showHolidayEditor('${h.name.replace(/'/g, "\\'")}')" style="border:none; background:none; padding:5px; cursor:pointer; display:flex;" title="Modifica">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button onclick="deleteCustomHoliday('${h.name.replace(/'/g, "\\'")}')" style="border:none; background:none; padding:5px; color:#dc3545; cursor:pointer; display:flex;" title="Elimina">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    ` : ''}
                    <label class="switch-btn">
                        <input type="checkbox" onchange="handleHolidayToggle('${h.iso}', '${h.name.replace(/'/g, "\\'")}', this)" ${h.isClosed ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>`;
    }).join('');
}

function handleHolidayToggle(iso, name, el, force = false) {
    const shouldClose = el.checked;
    google.script.run.withSuccessHandler(res => {
        if (res.status === "OK") {
            // Aggiorna lo stato in memoria per coerenza
            if (cachedAppData.italianHolidays) {
                const holiday = cachedAppData.italianHolidays.find(h => h.iso === iso && h.name === name);
                if (holiday) holiday.isClosed = shouldClose;
            }
            refreshDashboardData(true);
        } else if (res.status === "CONFLICT") {
            el.checked = !shouldClose; // Revert visivo se l'utente non conferma
            showIndispoConflictPopup(res.conflicts, () => {
                el.checked = shouldClose; // Ripristina lo stato desiderato
                handleHolidayToggle(iso, name, el, true); // Riprova con force=true
            });
        } else {
            el.checked = !shouldClose;
            showCustomAlert("Errore", res.message);
        }
    }).toggleHolidayClosure(iso, name, shouldClose, force);
}

function showHolidayEditor(oldName = null) {
    let holidayName = "";
    let holidayDateVal = "";
    
    if (oldName) {
        const match = oldName.match(/(.*?)\s*\((\d{1,2})\/(\d{1,2})\)/);
        if (match) {
            holidayName = match[1].trim();
            const day = match[2].padStart(2, '0');
            const month = match[3].padStart(2, '0');
            const currentYear = new Date().getFullYear();
            holidayDateVal = `${currentYear}-${month}-${day}`;
        } else {
            holidayName = oldName;
        }
    }
    
    const contentHtml = `
        <div style="display:flex; flex-direction:column; gap:12px; width:100%; text-align: left;">
            <div>
                <label class="detail-label">Descrizione / Nome</label>
                <input type="text" id="ed-holiday-name" value="${holidayName}" placeholder="Es. Festa del paese">
            </div>
            <div>
                <label class="detail-label">Data della ricorrenza</label>
                <input type="date" id="ed-holiday-date" value="${holidayDateVal}">
            </div>
        </div>`;
    const actionsHtml = `
        <button class="popup-action-secondary" onclick="closeAllPopupsAndRedirect(renderBarberWorkingHoursPage, true)">Annulla</button>
        <button id="saveHolidayAdminBtn" class="popup-action-main" style="color:#8A9A5B;">Salva</button>
    `;
    const overlay = createPopup('holiday-editor-popup', oldName ? 'Modifica Ricorrenza' : 'Nuova Ricorrenza', contentHtml, actionsHtml);
    
    document.getElementById('saveHolidayAdminBtn').onclick = () => {
        const btn = document.getElementById('saveHolidayAdminBtn');
        const nameVal = document.getElementById('ed-holiday-name').value.trim();
        const dateInputVal = document.getElementById('ed-holiday-date').value;
        
        if (!nameVal || !dateInputVal) {
            showCustomAlert("Errore", "Nome e data sono obbligatori.");
            return;
        }
        
        const dateParts = dateInputVal.split('-');
        if (dateParts.length !== 3) {
            showCustomAlert("Errore", "Data non valida.");
            return;
        }
        const dateStr = `${dateParts[2]}/${dateParts[1]}`;
        
        btn.innerText = "Salva...";
        btn.disabled = true;
        
        google.script.run
        .withSuccessHandler(res => {
            if (res && res.status === "OK") {
                showCustomAlert("Salvato", "Ricorrenza salvata con successo.", () => { // Chiudi tutti i popup e aggiorna
                    cachedAppData.italianHolidays = res.holidays;
                    renderItalianHolidays();
                    closeAllPopupsAndRedirect(refreshDashboardData, true);
                });
            } else {
                showCustomAlert("Errore", res.message || "Errore durante il salvataggio.");
            }
        })
        .withFailureHandler(err => {
            btn.innerText = "Salva";
            btn.disabled = false;
            showCustomAlert("Errore di Rete", err);
        })
        .manageCustomHoliday(oldName ? 'edit' : 'add', { oldName, name: nameVal, dateStr });
    };
}

function deleteCustomHoliday(name) {
    const contentHtml = `<p>Sei sicuro di voler eliminare la ricorrenza <strong>${name}</strong>?</p>`;
    const actionsHtml = `
        <button class="popup-action-secondary" onclick="closeAllPopupsAndRedirect()">Annulla</button>
        <button id="confirmDelHolidayBtn" class="popup-action-danger">Elimina</button>
    `;
    createPopup('delete-holiday-popup', 'Elimina Ricorrenza', contentHtml, actionsHtml);

    document.getElementById('confirmDelHolidayBtn').onclick = () => {
        const btn = document.getElementById('confirmDelHolidayBtn');
        showButtonSpinner(btn);

        google.script.run
        .withSuccessHandler(res => {
            if (res && res.status === "OK") {
                showCustomAlert("Eliminato", "Ricorrenza rimossa.", () => { // Chiudi tutti i popup e aggiorna
                    cachedAppData.italianHolidays = res.holidays;
                    renderItalianHolidays();
                    closeAllPopupsAndRedirect(refreshDashboardData, true);
                });
            } else {
                hideButtonSpinner(btn);
                showCustomAlert("Errore", res.message || "Errore durante l'eliminazione.");
            }
        })
        .withFailureHandler(err => {
            btn.innerText = "Elimina";
            btn.disabled = false;
            showCustomAlert("Errore di Rete", err);
        })
        .manageCustomHoliday('delete', { name });
    };
}

/**
 * Gestisce il ritorno alla dashboard salvando i dati
 */
function handleBackFromWorkingHours() {
    // Avvia il salvataggio in background
    saveAdminHours(null);
    // Torna alla dashboard immediatamente per UX reattiva
    renderBarberDashboardPage();
}