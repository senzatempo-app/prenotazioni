/**
 * Sincronizza il campo "Al Giorno" con "Dal Giorno" se è vuoto o precedente.
 */
function syncIndispoEndDate() {
    const startDateInput = document.getElementById('indispo-date');
    const endDateInput = document.getElementById('indispo-date-end');
    if (endDateInput.value === '' || formatDateToIso(endDateInput.value) < formatDateToIso(startDateInput.value)) {
        endDateInput.value = startDateInput.value;
    }
}

function toggleIndispoAllDay(checked) {
    const s = document.getElementById('indispo-start');
    const e = document.getElementById('indispo-end');
    if (checked) { s.value = "00:00"; e.value = "23:59"; s.disabled = true; e.disabled = true; }
    else { s.value = "09:00"; e.value = "10:00"; s.disabled = false; e.disabled = false; }
}

function handleSaveIndispo(force = false) {
    const date = document.getElementById('indispo-date').value;
    const dateEnd = document.getElementById('indispo-date-end').value || date;
    const start = document.getElementById('indispo-start').value;
    const end = document.getElementById('indispo-end').value;
    const note = document.getElementById('indispo-note').value.trim();
    const btn = document.getElementById('saveIndispoBtn');
    
    // Assicuriamoci che 'settings' sia sempre disponibile, recuperandolo dalla cache se necessario.
    const settings = cachedAppData.settings;

    if (!date || !start || !end) { showCustomAlert("Attenzione", "Compila tutti i campi orari."); return; }
    
    const startDateIso = formatDateToIso(date);
    const endDateIso = formatDateToIso(dateEnd);

    showButtonSpinner(btn);
    google.script.run
        .withSuccessHandler(res => {
            if (res.status === "OK") {
                // Aggiorna i dati e, solo dopo il successo, torna alla lista degli impegni
                // per mostrare subito il nuovo impegno.
                refreshDashboardData(false, () => {
                    renderPersonalCommitmentsListPage();
                });
            } else if (res.status === "CONFLICT") {
                hideButtonSpinner(btn);
                showIndispoConflictPopup(res.conflicts, () => handleSaveIndispo(true));
            } else {
                showCustomAlert("Errore", res.message);
                hideButtonSpinner(btn);
            }
        })
        .withFailureHandler(err => {
            hideButtonSpinner(btn);
            showCustomAlert("Errore di rete", err);
        })
        .saveIndisponibilitaRange(currentDisplayedBarberId, startDateIso, endDateIso, start.trim(), end.trim(), note, force);
}

/**
 * Renderizza la pagina con l'elenco degli impegni personali futuri.
 */
function renderPersonalCommitmentsListPage(skipPush = false) {
    window.scrollTo(0, 0);
    if (!skipPush) pushView('personal-commitments-list');

    appContainer.innerHTML = `
        <div id="personal-commitments-list-screen" class="full-screen">
            <div class="fixed-header">
                <button onclick="renderBarberDashboardPage();" class="header-back-btn">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <h2>IMPEGNI PERSONALI</h2>
            </div>
            <div class="home-content">
                <div class="booking-container">
                    <button id="add-commitment-btn" onclick="showNewCommitmentForm()" style="width:100%; margin-bottom: 20px; padding:15px; border-radius:30px; background:#8A9A5B; color:white; border:none; display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 700; font-size: 0.9em; pointer-events: auto;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        NUOVO IMPEGNO
                    </button>
                    
                    <div id="new-commitment-card" class="booking-card hidden" style="margin-bottom: 20px;">
                        <div class="card-title">Nuovo Impegno Personale</div>
                        <p style="font-size: 0.82em; color: #666; margin-bottom: 20px;">Segna il tempo come occupato (es. ferie, pausa o commissioni).</p>
                        
                        <div style="display: flex; flex-direction: column; gap: 15px; width: 100%;">
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <div>
                                    <label class="detail-label">Dal Giorno</label>
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <input type="text" id="indispo-date" class="date-mask" value="${formatDateToItalian(new Date().toISOString().split('T')[0])}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this); syncIndispoEndDate();" oninput="handleMaskInput(this, 'date')" placeholder="--/--/----" style="flex-grow: 1;">
                                        <div style="position: relative; width: 45px; height: 45px; flex-shrink: 0;">
                                            <input type="date" id="indispo-date-picker" value="${new Date().toISOString().split('T')[0]}" style="position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; z-index: 2;" onchange="syncPickerToMask(this, 'indispo-date'); syncIndispoEndDate();">
                                            <button type="button" style="width: 100%; height: 100%; padding: 0; display: flex; align-items: center; justify-content: center; border: 1px solid #ccc; background: white; border-radius: 8px; color: #8A9A5B; position: absolute; top:0; left:0; z-index: 1;" onclick="this.previousElementSibling.showPicker()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label class="detail-label">Al Giorno</label>
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <input type="text" id="indispo-date-end" class="date-mask" value="${formatDateToItalian(new Date().toISOString().split('T')[0])}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)" oninput="handleMaskInput(this, 'date')" placeholder="--/--/----" style="flex-grow: 1;">
                                        <div style="position: relative; width: 45px; height: 45px; flex-shrink: 0;">
                                            <input type="date" id="indispo-date-end-picker" value="${new Date().toISOString().split('T')[0]}" style="position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; z-index: 2;" onchange="syncPickerToMask(this, 'indispo-date-end')">
                                            <button type="button" style="width: 100%; height: 100%; padding: 0; display: flex; align-items: center; justify-content: center; border: 1px solid #ccc; background: white; border-radius: 8px; color: #8A9A5B; position: absolute; top:0; left:0; z-index: 1;" onclick="this.previousElementSibling.showPicker()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: #f9f9f9; border-radius: 12px; border: 1px solid #eee;">
                                <span style="font-size: 0.85em; font-weight: 700; color: #555;">Tutto il giorno</span>
                                <label class="switch-btn">
                                    <input type="checkbox" id="indispo-all-day" onchange="toggleIndispoAllDay(this.checked)">
                                    <span class="slider"></span>
                                </label>
                            </div>

                            <div style="display: flex; gap: 10px;">
                                <div style="flex: 1;">
                                    <label class="detail-label">Dalle ore</label>
                                    <input type="text" id="indispo-start" class="h-inp" value="09:00" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)" oninput="handleMaskInput(this, 'time')" placeholder="--:--">
                                </div>
                                <div style="flex: 1;">
                                    <label class="detail-label">Alle ore</label>
                                    <input type="text" id="indispo-end" class="h-inp" value="10:00" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)" oninput="handleMaskInput(this, 'time')" placeholder="--:--">
                                </div>
                            </div>
                            <div>
                                <label class="detail-label">Nota (es. Pranzo, Commissioni)</label>
                                <input type="text" id="indispo-note" placeholder="Descrizione opzionale">
                            </div>
                            <div style="display: flex; width: 100%; margin-top: 15px;">
                                <button onclick="hideNewCommitmentForm()" style="flex: 1; border: none; background: transparent; color: #666; font-size: 0.9em; font-weight: 600; text-transform: uppercase; cursor: pointer;">Annulla</button>
                                <button id="saveIndispoBtn" onclick="handleSaveIndispo()" style="flex: 1; background: transparent; color: #8A9A5B; border: none; font-weight: 700; text-transform: uppercase; cursor: pointer;">Salva</button>
                            </div>
                        </div>
                    </div>

                    <div id="commitments-list-container" class="fade-in" style="display: flex; flex-direction: column; gap: 8px;">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Estrai i nomi delle festività dalla cache per filtrare gli impegni
    const holidayNames = (cachedAppData.italianHolidays || []).map(h => h.name.toLowerCase());

    const commitments = (cachedBarberAppointments || [])
        .filter(a => a.status.toLowerCase() === 'indisponibile' && 
                      new Date(a.start) >= new Date() &&
                      !holidayNames.includes(a.service.toLowerCase())) // Esclude le festività
        .sort((a, b) => new Date(a.start) - new Date(b.start));

    const container = document.getElementById('commitments-list-container');
    if (commitments.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; margin-top:30px;">Nessun impegno personale futuro.</p>';
        return;
    }

    let html = '';
    let lastDate = '';

    commitments.forEach(c => {
        const startDate = new Date(c.start);
        const endDate = new Date(c.end);
        const dateStr = startDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
        const timeStr = `${startDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;

        if (dateStr !== lastDate) {
            html += `<div style="padding: 15px 5px 5px; font-size: 0.85em; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.5px;">${dateStr}</div>`;
            lastDate = dateStr;
        }

        html += `
            <div class="booking-card" style="flex-direction: row; justify-content: space-between; align-items: center; padding: 10px 15px; margin-bottom: 0; border-left: 5px solid #999;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="font-weight: 800; font-size: 1.1em; color: #1a1a1a; min-width: 50px;">${timeStr.split(' - ')[0]}</div>
                    <div style="display: flex; flex-direction: column;">
                        <div style="font-weight: 700; color: #333; font-size: 0.95em;">${c.service}</div>
                        <div style="font-size: 0.8em; color: #666;">${timeStr}</div>
                    </div>
                </div>
                <button onclick="confirmCancelStandardAppointment('${c.id}', '${c.service}', '${dateStr} ${timeStr}', 'personal-commitments-list')" style="border:none; background:none; padding:5px; color:#dc3545; cursor:pointer; display:flex;" title="Elimina impegno">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        `;
    });

    container.innerHTML = html;
}

function showNewCommitmentForm() {
    document.getElementById('new-commitment-card').classList.remove('hidden');
    document.getElementById('add-commitment-btn').classList.add('hidden');
}

function hideNewCommitmentForm() {
    document.getElementById('new-commitment-card').classList.add('hidden');
    document.getElementById('add-commitment-btn').classList.remove('hidden');
}