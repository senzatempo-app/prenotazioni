/**
 * Logica e Rendering per l'Elenco e la Creazione di Appuntamenti Settimanali (Fissi)
 */

function renderBarberWeeklyAppointmentsListPage(skipPush = false) {
    window.scrollTo(0, 0);
    if (!skipPush) pushView('weekly-list');
    appContainer.innerHTML = `
        <div id="barber-weekly-list-screen" class="full-screen">
            <div class="fixed-header">
                <button onclick="renderBarberDashboardPage();" class="header-back-btn">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <h2>APPUNTAMENTI SETTIMANALI</h2>
            </div>
            <div class="home-content">
                <div class="booking-container">
                    <button onclick="renderBarberWeeklyAppointmentPage()" style="width:100%; margin-bottom: 20px; padding:15px; border-radius:30px; background:#8A9A5B; color:white; border:none; display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 700; font-size: 0.9em; pointer-events: auto;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        AGGIUNGI APPUNTAMENTO SETTIMANALE
                    </button>
                    
                    <div id="weekly-list-container" class="fade-in" style="display: flex; flex-direction: column; gap: 6px;">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    const listContainer = document.getElementById('weekly-list-container');
    if (listContainer) renderWeeklyAppointmentsCards();
}

function renderWeeklyAppointmentsCards() {
    const container = document.getElementById('weekly-list-container');
    const weekly = cachedAppData.weeklyBookings || [];

    if (weekly.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; margin-top:30px;">Nessun appuntamento fisso impostato.</p>';
        return;
    }

    const daysOrder = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
    
    weekly.sort((a, b) => {
        const dayIdxA = daysOrder.indexOf(a.dayName);
        const dayIdxB = daysOrder.indexOf(b.dayName);
        if (dayIdxA !== dayIdxB) return dayIdxA - dayIdxB;
        return a.time.localeCompare(b.time);
    });

    let html = '';
    let lastDay = '';

    weekly.forEach(w => {
        const dayName = w.dayName;
        const timeStr = w.time;
        const barberName = cachedAppData.barbers[w.barberId]?.nome || "N/D";
        const serviceLabel = w.service ? w.service.replace(/_/g, ' ') : "Taglio";

        if (dayName.toLowerCase() !== lastDay) {
            html += `<div style="padding: 15px 5px 5px; font-size: 0.85em; font-weight: 700; color: #3498db; text-transform: uppercase; letter-spacing: 0.5px;">${dayName}</div>`;
            lastDay = dayName.toLowerCase();
        }

        html += `
            <div class="booking-card" style="flex-direction: row; justify-content: space-between; align-items: center; padding: 10px 15px; margin-bottom: 0; border-left: 5px solid #3498db; position: relative;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="font-weight: 800; font-size: 1.1em; color: #1a1a1a; min-width: 50px;">${timeStr}</div>
                    <div style="display: flex; flex-direction: column;">
                        <div style="font-weight: 700; color: #333; font-size: 0.95em;">${w.clientName}</div>
                        <div style="font-size: 0.8em; color: #666;">${serviceLabel} - Barbiere: ${barberName}</div>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <div style="font-size: 0.7em; color: #3498db; font-weight: 700; text-transform: uppercase;">Weekly</div>
                    <button onclick="confirmRemoveWeekly('${w.id}', '${w.clientName}')" style="border:none; background:none; padding:5px; color:#dc3545; cursor:pointer; display:flex;" title="Rimuovi ricorrenza">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

let weeklyAppState = {
    client: null, service: null, day: null, slot: null, allSlots: null,
    allClients: []
};

function renderBarberWeeklyAppointmentPage(skipPush = false) {
    window.scrollTo(0, 0);
    if (!skipPush) pushView('weekly-add');
    weeklyAppState = { 
        client: null, service: null, day: null, slot: null, allSlots: null, 
        allClients: (typeof cachedAppData !== 'undefined' && cachedAppData) ? (cachedAppData.clients || []) : [] 
    };

    appContainer.innerHTML = `
        <div id="barber-weekly-appointment-screen" class="full-screen">
            <div class="fixed-header">
                <button onclick="renderBarberWeeklyAppointmentsListPage();" class="header-back-btn">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <h2>APPUNTAMENTO SETTIMANALE</h2>
            </div>
            <div class="home-content">
                <div class="booking-container">
                    <div class="booking-card fade-in">
                        <div class="card-title" id="weekly-client-card-title">1. Seleziona Cliente</div>
                        <div id="weekly-client-area" style="width: 100%;">
                            <div id="weekly-search-container" style="display: flex; gap: 10px; width: 100%; align-items: center;">
                                <input type="text" id="weeklyClientSearch" placeholder="Cerca cliente (nome o tel...)" oninput="filterWeeklyClients(this.value)" style="flex-grow: 1; margin: 0; height: 45px;">
                                <button id="weekly-btn-new-client-plus" onclick="showWeeklyNewClientForm()" style="width: 45px; height: 45px; padding: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #ccc; border-radius: 50%; color: #8A9A5B; background: white;" title="1. Nuovo Cliente">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                </button>
                            </div>

                            <div id="weekly-clients-dropdown" class="services-scroll" style="display:none; width: 100%; max-height: 200px; flex-direction: column; background: #fff; border: 1px solid #eee; margin-top: 5px; border-radius: 10px; overflow-y: auto; user-select: none;"></div>
                            
                            <div id="weekly-client-badge" class="hidden" style="margin-top: 10px; padding: 10px; background: rgba(138, 154, 91, 0.1); border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
                                <span id="weekly-client-text" style="font-weight: 700; color: #8A9A5B;"></span>
                                <button onclick="resetWeeklyClientSelection()" style="border:none; padding: 5px; color: #dc3545;">Rimuovi</button>
                            </div>

                            <div id="weekly-new-client-fields" class="hidden" style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px; width: 100%;">
                                <p id="weekly-new-client-error" style="color: #dc3545; text-align: center; margin-bottom: 5px; display: none; font-size: 0.9em;"></p>
                                <input type="text" id="weekly-newC-nome" placeholder="Nome">
                                <input type="text" id="weekly-newC-cognome" placeholder="Cognome">
                                <input type="tel" id="weekly-newC-tel" placeholder="Telefono">
                                <input type="email" id="weekly-newC-email" placeholder="Email">
                                <div style="display: flex; width: 100%; margin-top: 15px;">
                                    <button onclick="resetWeeklyClientSelection()" style="flex: 1; border: none; background: transparent; color: #666; font-size: 0.9em; font-weight: 600; text-transform: uppercase; cursor: pointer;">Annulla</button>
                                    <button onclick="confirmWeeklyNewClientData(this)" style="flex: 1; background: transparent; color: #8A9A5B; border: none; font-weight: 700; text-transform: uppercase; cursor: pointer;">Salva</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="weekly-step-service" class="booking-card fade-in hidden">
                        <div class="card-title">2. Scegli il servizio</div>
                        <div id="weekly-services-grid" class="services-scroll"></div>
                    </div>
                    <div id="weekly-step-day" class="booking-card fade-in hidden">
                        <div class="card-title">3. Scegli il giorno della settimana</div>
                        <div id="weekly-days-row" class="days-scroll"></div>
                    </div>
                    <div id="weekly-step-slots" class="booking-card fade-in hidden">
                        <div class="card-title">4. Seleziona l'orario fisso</div>
                        <div id="weekly-barbers-columns" class="barbers-grid"></div>
                    </div>
                </div>
            </div>
            <div class="cta-container fade-in">
                <button id="weekly-confirm-btn" class="confirm hidden" style="width:100%; max-width:400px; padding:18px; border-radius:35px; border:none; background:#8A9A5B; color:white; pointer-events: auto;" onclick="handleWeeklyFinalSave()">
                    Salva
                </button>
            </div>
        </div>
    `;

    const svcContainer = document.getElementById('weekly-services-grid');
    svcContainer.innerHTML = cachedAppData.services.map(s => `
        <div class="service-card" onclick="selectWeeklyService(this, '${s.name}', ${s.duration})" style="background-image: url('${s.imageUrl}')">
            <div class="service-name">${s.name.replace(/_/g, ' ')}</div>
        </div>`).join('');

    generateWeeklyDayPills();
}

function filterWeeklyClients(val) {
    const dropdown = document.getElementById('weekly-clients-dropdown');
    if (val.length < 2) { dropdown.style.display = 'none'; return; }
    
    const filtered = weeklyAppState.allClients.filter(c => 
        (c.nome + " " + c.cognome + " " + c.telefono).toLowerCase().includes(val.toLowerCase())
    ).slice(0, 10);

    if (filtered.length === 0) { dropdown.style.display = 'none'; return; }

    dropdown.innerHTML = filtered.map(c => `
        <div style="padding: 12px; border-bottom: 1px solid #eee; cursor:pointer;" onclick="selectWeeklyClient('${c.email}', '${c.nome}', '${c.cognome}', '${c.telefono}')">
            <strong>${c.nome} ${c.cognome}</strong><br>
            <span style="font-size:0.8em; color:#666;">${c.telefono} - ${c.email}</span>
        </div>
    `).join('');
    dropdown.style.display = 'flex';
}

function selectWeeklyClient(email, nome, cognome, telefono) {
    const client = weeklyAppState.allClients.find(c => normalizePhone(c.telefono) === normalizePhone(telefono));
    weeklyAppState.client = { email, nome, cognome, telefono, cutTime: client ? client.cutTime : 30 };
    document.getElementById('weekly-client-text').innerText = `${nome} ${cognome}`;
    document.getElementById('weekly-client-badge').classList.remove('hidden');
    document.getElementById('weekly-search-container').classList.add('hidden');
    document.getElementById('weekly-clients-dropdown').style.display = 'none';
    document.getElementById('weekly-new-client-fields').classList.add('hidden');
    document.getElementById('weekly-client-card-title').innerText = "1. Seleziona Cliente";
    document.getElementById('weekly-step-service').classList.remove('hidden');
}

function showWeeklyNewClientForm() {
    document.getElementById('weekly-new-client-fields').classList.remove('hidden');
    document.getElementById('weekly-search-container').classList.add('hidden');
    document.getElementById('weekly-client-card-title').innerText = "Nuovo Cliente";
}

function confirmWeeklyNewClientData(btn) {
    const n = document.getElementById('weekly-newC-nome').value.trim();
    const c = document.getElementById('weekly-newC-cognome').value.trim();
    const t = document.getElementById('weekly-newC-tel').value.trim();
    const e = document.getElementById('weekly-newC-email').value.trim();
    const errorEl = document.getElementById('weekly-new-client-error');
    if (!n || !c || !t || !e) {
        if (errorEl) {
            errorEl.innerText = "Tutti i campi (Nome, Cognome, Telefono, Email) sono obbligatori.";
            errorEl.style.display = 'block';
        }
        return;
    }

    showButtonSpinner(btn);
    const clientData = { nome: capitalizeFirst(n), cognome: capitalizeFirst(c), email: e, telefono: t };

    google.script.run
        .withSuccessHandler(serverUser => {
            hideButtonSpinner(btn);
            // Aggiungi il nuovo cliente alla cache locale per la ricerca futura
            weeklyAppState.allClients.push(serverUser);
            selectWeeklyClient(serverUser.email, serverUser.nome, serverUser.cognome, serverUser.telefono);
            // Svuota i campi dopo il successo
            document.getElementById('weekly-newC-nome').value = '';
            document.getElementById('weekly-newC-cognome').value = '';
            document.getElementById('weekly-newC-tel').value = '';
            document.getElementById('weekly-newC-email').value = '';
        })
        .withFailureHandler(err => {
            hideButtonSpinner(btn);
            if (errorEl) {
                errorEl.innerText = err;
                errorEl.style.display = 'block';
            }
        })
        .registerOrUpdateUser(clientData);
}

function resetWeeklyClientSelection() {
    renderBarberWeeklyAppointmentPage();
}

function selectWeeklyService(el, name, duration) {
    document.querySelectorAll('#weekly-services-grid .service-card').forEach(p => p.classList.remove('active'));
    el.classList.add('active');

    // Centra la card orizzontalmente nello scroll dello schermo
    el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

    weeklyAppState.service = { name, duration };
    document.getElementById('weekly-step-day').classList.remove('hidden');
}

function generateWeeklyDayPills() {
    const container = document.getElementById('weekly-days-row');
    const days = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    container.innerHTML = days.map(d => `
        <div class="day-pill" onclick="selectWeeklyDay(this, '${d}')">
            <span class="day-name">${d.substring(0,3)}</span>
        </div>`).join('');
}

function selectWeeklyDay(el, day) {
    document.querySelectorAll('#weekly-days-row .day-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    weeklyAppState.day = day;
    refreshWeeklySlots();
}

function refreshWeeklySlots() {
    const container = document.getElementById('weekly-barbers-columns');
    document.getElementById('weekly-step-slots').classList.remove('hidden');
    
    const services = cachedAppData.services || [];
    const sStandard = services.find(s => s.name.toLowerCase() === "taglio");
    
    // Rinominiamo per evitare SyntaxError: Identifier 'baseDuration' has already been declared
    const weeklyBaseDuration = sStandard ? sStandard.duration : 30;
    const slotStep = (weeklyBaseDuration % 10 === 0) ? 10 : 15;

    // Generiamo tutti gli orari dalle 08:00 alle 20:00 in base allo step calcolato
    const startTime = 8 * 60; // 08:00
    const endTime = 20 * 60;  // 20:00
    const slots = [];
    for (let t = startTime; t <= endTime; t += slotStep) {
        const h = Math.floor(t / 60);
        const m = t % 60;
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }

    const targetDay = weeklyAppState.day.toLowerCase();
    const effectiveDuration = weeklyAppState.service.duration;

    // Helper per convertire l'orario HH:mm in minuti totali da mezzanotte
    const toMin = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    let html = '';
    for (const bId in cachedAppData.barbers) {
        const barber = cachedAppData.barbers[bId];
        
        // Identifichiamo gli intervalli occupati usando il nuovo array weeklyBookings
        const occupiedIntervals = (cachedAppData.weeklyBookings || [])
            .filter(w => w.barberId === bId && w.dayName.toLowerCase() === targetDay)
            .map(w => {
                const start = toMin(w.time);
                return { start: start, end: start + (parseInt(w.duration, 10) || weeklyBaseDuration) };
            });

        const slotsHtml = slots.map(s => {
            const sStart = toMin(s);
            const sEnd = sStart + effectiveDuration;
            const isOccupied = occupiedIntervals.some(occ => sStart < occ.end && sEnd > occ.start);

            if (isOccupied) {
                return `<div class="time-slot occupied" style="opacity: 0.3; pointer-events: none; background: #f0f0f0; color: #999; border: 1px dashed #ccc;">${s}</div>`;
            }
            return `<div class="time-slot" onclick="selectWeeklySlot(this, '${s}', '${bId}')">${s}</div>`;
        }).join('');

        html += `
            <div class="barber-col">
                <div class="barber-info-header">
                    <img src="${barber.foto || ''}" class="barber-photo" style="width:50px; height:50px;">
                    <div class="barber-name-header" style="font-size:0.85em;">${barber.nome}</div>
                </div>
                ${slotsHtml}
            </div>`;
    }
    container.innerHTML = html;
}

function selectWeeklySlot(el, time, barberId) {
    document.querySelectorAll('#weekly-barbers-columns .time-slot').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    weeklyAppState.slot = { time, barberId };
    document.getElementById('weekly-confirm-btn').classList.remove('hidden');
}

function handleWeeklyFinalSave() {
    const btn = document.getElementById('weekly-confirm-btn');
    if (btn) showButtonSpinner(btn);

    // Step 1: Controlliamo se ci sono conflitti nelle prossime 4 settimane
    google.script.run
      .withFailureHandler(err => {
          console.error("Errore controllo conflitti:", err);
          if (btn) hideButtonSpinner(btn);
          showCustomAlert("Errore di Sistema", "Impossibile verificare la disponibilità: " + err);
      })
      .withSuccessHandler(res => {
          // Non nascondiamo lo spinner qui se procediamo al salvataggio,
          // altrimenti lo nascondiamo prima di mostrare il popup dei conflitti.
          if (res.conflicts && res.conflicts.length > 0) {
              if (btn) hideButtonSpinner(btn);
              showWeeklyConflictResolutionPopup(res.conflicts);
          } else {
              executeWeeklySave([]);
          }
      })
      .getWeeklyConflictsPreview(
          weeklyAppState.slot.barberId,
          weeklyAppState.day, 
          weeklyAppState.slot.time, 
          weeklyAppState.service.duration,
          weeklyAppState.service.name,
          weeklyAppState.client.telefono
      );
}

function showWeeklyConflictResolutionPopup(conflicts) {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.id = 'weekly-conflict-overlay';
    
    const validSuggestions = conflicts.filter(c => c.suggestion);
    
    let html = `
        <div class="appointment-detail-popup fade-in" style="max-width: 450px; text-align: center; padding: 25px;">
            <h3 style="margin-bottom: 10px;">Conflitto Date Fisse</h3>
            <p style="font-size: 0.9em; color: #666; margin-bottom: 20px; line-height: 1.4;">
                Alcune date delle prossime 4 settimane sono già occupate.<br>Vuoi recuperarle con questi orari suggeriti?
            </p>
            <div style="max-height: 250px; overflow-y: auto; margin-bottom: 25px; display: flex; flex-direction: column; gap: 10px;">
    `;
    
    conflicts.forEach((c, i) => {
        if (c.suggestion) {
            html += `
                <div style="padding: 12px; background: #f9f9f9; border: 1px solid #eee; border-radius: 15px; display: flex; justify-content: space-between; align-items: center; text-align: left;">
                    <div>
                        <div style="font-size: 0.75em; color: #888; text-transform: uppercase; font-weight: 700;">${c.date}</div>
                        <div style="font-weight: 700; color: #333;">Suggerito: ${c.suggestion.time}</div>
                    </div>
                    <input type="checkbox" class="suggestion-checkbox" data-idx="${i}" checked style="width: 22px; height: 22px; accent-color: #8A9A5B; cursor: pointer; flex-shrink: 0;">
                </div> 
            `;
        } else {
            html += `
                <div style="padding: 12px; background: #fff5f5; border: 1px solid #feb2b2; border-radius: 15px; text-align: left;">
                    <div style="font-size: 0.75em; color: #c53030; text-transform: uppercase; font-weight: 700;">${c.date}</div>
                    <div style="font-size: 0.85em; color: #c53030;">Nessun orario alternativo trovato.</div>
                </div>
            `;
        }
    });
    
    html += `
            </div>
            <div class="popup-actions" style="display: flex; width: 100%; align-items: center;">
                <button onclick="document.getElementById('weekly-conflict-overlay').remove()" style="flex: 1; background: transparent; border: none; color: #666; font-size: 0.9em; font-weight: 600; cursor: pointer; text-transform: uppercase;">Annulla</button>
                <button id="confirmAllWeekly" style="flex: 1; background: transparent; color: #8A9A5B; border: none; padding: 12px; font-weight: 700; cursor: pointer; text-transform: uppercase;">CONFERMA</button>
            </div>
        </div>
    `;
    
    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    document.getElementById('confirmAllWeekly').onclick = () => {
        const btn = document.getElementById('confirmAllWeekly');
        showButtonSpinner(btn);
        const selectedSuggestions = [];
        document.querySelectorAll('.suggestion-checkbox:checked').forEach(cb => {
            selectedSuggestions.push(conflicts[parseInt(cb.dataset.idx)].suggestion);
        });
        executeWeeklySave(selectedSuggestions);
    };
}

function executeWeeklySave(acceptedSuggestions) {
    google.script.run
      .withFailureHandler(err => {
          console.error("Errore salvataggio fisso:", err);
          showCustomAlert("Errore di Sistema", "Impossibile salvare l'appuntamento: " + err);
          // Nascondi lo spinner del pulsante di conferma se esiste ancora
          const confirmBtn = document.getElementById('weekly-confirm-btn');
          if (confirmBtn) hideButtonSpinner(confirmBtn);
      })
      .withSuccessHandler((res) => {
        if (res && res.status === "OK") {
          // Chiudiamo il popup dei conflitti prima di mostrare la schermata di successo.
          const conflictPopup = document.getElementById('weekly-conflict-overlay');
          if (conflictPopup) conflictPopup.remove();

          let firstDateHtml = "";
          if (res.firstDate) {
            firstDateHtml = `<p style="margin: 0; color: #666; font-weight: 600; font-size: 1em; text-align: center;">${res.firstDate}</p>`;
          }

          appContainer.innerHTML = `
            <div class="full-screen" style="justify-content: center;">
                <div class="success-container">
                    <div style="margin-bottom: 20px; color: #8A9A5B;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                    <h2 style="margin-bottom: 20px;">Appuntamento Fisso Salvato!</h2>
                    <p style="margin-bottom: 10px;">Per: ${weeklyAppState.client.nome} ${weeklyAppState.client.cognome}</p>
                    <p style="margin-bottom: 2px;">Ogni ${weeklyAppState.day} alle ore ${weeklyAppState.slot.time}</p>
                    ${firstDateHtml}
                    
                    ${res.updatedWeekly ? (cachedAppData.weeklyBookings = res.updatedWeekly, '') : ''}
                    ${res.updatedAppointments ? (cachedBarberAppointments = res.updatedAppointments, '') : ''}

                    <p style="font-size:0.9em; color:#666; margin-top:20px;">Il cliente riceverà una mail di conferma.</p>
                    <button onclick="renderBarberWeeklyAppointmentsListPage()" style="background: transparent; color: #8A9A5B; border: none; font-weight: 700; text-transform: uppercase; margin-top: 30px; width: 100%; cursor: pointer; padding: 15px;">Chiudi</button>
                </div>
            </div>`;
        } else {
          showCustomAlert("Errore", (res && res.message) ? res.message : "Errore sconosciuto durante il salvataggio.");
          // Nascondi lo spinner del pulsante di conferma se esiste ancora
          const confirmBtn = document.getElementById('weekly-confirm-btn');
          if (confirmBtn) hideButtonSpinner(confirmBtn);
        }
      })
      .saveWeeklyAppointment(
          weeklyAppState.client.telefono, // Usiamo il telefono come identificativo certo
          weeklyAppState.day, 
          weeklyAppState.slot.time, 
          weeklyAppState.slot.barberId, 
          weeklyAppState.service.duration,
          weeklyAppState.service.name,
          acceptedSuggestions
      );
}

/**
 * Crea un appuntamento standard per una settimana saltata accettando il suggerimento.
 */
function acceptWeeklySuggestion(index, conflictDataJson) {
    const conflict = JSON.parse(decodeURIComponent(conflictDataJson));
    const btn = document.getElementById(`suggest-btn-${index}`);
    const originalText = btn.innerText;
    
    btn.innerText = "...";
    btn.disabled = true;

    google.script.run
        .withSuccessHandler(res => {
            if (res.status === "OK") {
                btn.innerText = "Fatto ✅";
                btn.style.background = "#28a745";
                refreshDashboardData(true);
            } else {
                btn.innerText = "Errore";
                showCustomAlert("Errore", res.message || "Impossibile creare l'appuntamento.");
            }
        })
        .processBooking(weeklyAppState.client, conflict.suggestion.iso, weeklyAppState.service.name, weeklyAppState.service.duration, weeklyAppState.slot.barberId);
}

function confirmRemoveWeekly(bookingId, fullName) {
    const overlay = document.createElement('div');
    overlay.id = 'remove-weekly-overlay';
    overlay.className = 'popup-overlay';
    
    overlay.innerHTML = `
        <div class="booking-card fade-in" style="width: 90%; max-width: 600px; background: white; padding: 25px; align-items: center; text-align: center; border: none; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
            <h2 style="margin-bottom: 10px; font-size: 1.2em; width: 100%;">Cancella Appuntamento</h2>
            <p style="margin-bottom: 20px; color: #666; font-size: 0.95em; line-height: 1.4;">Vuoi cancellare l'appuntamento fisso per <strong>${fullName}</strong>? L'azione è irreversibile.</p>
            <div class="popup-actions" style="display: flex; width: 100%; margin-top: 10px;">
                <button id="cancel-weekly-remove-btn" style="flex: 1; border: none; background: transparent; color: #666; font-size: 0.9em; font-weight: 600; cursor: pointer; text-transform: uppercase;">Annulla</button>
                <button id="confirmRemoveBtn" style="flex: 1; background: transparent; color: #dc3545; padding: 12px; font-weight: 700; border: none; cursor: pointer; text-transform: uppercase;">Elimina</button>
            </div>
        </div>
    `;
    
    openPopup(overlay); // Usa la funzione helper per gestire lo stack e la cronologia
    
    document.getElementById('cancel-weekly-remove-btn').onclick = () => closeAllPopupsAndRedirect();

    document.getElementById('confirmRemoveBtn').onclick = () => {
        const btn = document.getElementById('confirmRemoveBtn');
        showButtonSpinner(btn);
        
        google.script.run.withSuccessHandler(res => {
            if (res && res.status === "OK") {
                if (res.updatedWeekly) cachedAppData.weeklyBookings = res.updatedWeekly;
                if (res.updatedAppointments) cachedBarberAppointments = res.updatedAppointments;
                closeAllPopupsAndRedirect(renderBarberWeeklyAppointmentsListPage, true);
            } else {
                hideButtonSpinner(btn);
                showCustomAlert("Errore", res.message || "Impossibile cancellare l'appuntamento.");
            }
        }).removeWeeklyAppointment(bookingId);
    };
}