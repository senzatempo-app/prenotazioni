/**
 * Funzioni di utilità comuni per il frontend.
 * Centralizza logiche riutilizzabili per migliorare la manutenibilità.
 * Stili per lo spinner dei pulsanti.
 * Vengono iniettati una sola volta per essere disponibili globalmente.
 */
const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = `
    .btn-spinner {
        width: 24px;
        height: 24px;
        border: 3px solid currentColor;
        border-bottom-color: transparent;
        border-radius: 50%;
        display: inline-block;
        box-sizing: border-box;
        animation: rotation 1s linear infinite;
    }
    @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
`;
document.head.appendChild(spinnerStyle);

let openPopupStack = [];
let isClosingPopup = false; // Flag per evitare loop con popstate

window.addEventListener('popstate', (event) => {
    // Se stiamo già chiudendo un popup programmaticamente, ignoriamo questo evento.
    if (isClosingPopup) { isClosingPopup = false; return; }
    if (openPopupStack.length > 0 && event.state && event.state.popup) {
        // Non preveniamo l'evento, ma chiudiamo il popup.
        // La navigazione indietro rimuoverà lo stato {popup: true} che abbiamo aggiunto.
        closeTopPopup();
    } else if (event.state && typeof handleViewChange === 'function') {
    // Se c'è un popup aperto e l'utente naviga indietro (es. con gesture), chiudiamo il popup
    if (openPopupStack.length > 0) {
        closeAllPopupsAndRedirect();
        // Preveniamo che la navigazione della vista venga eseguita,
        // perché l'intento era chiudere il popup.
        // Spingiamo di nuovo lo stato della vista corrente per mantenere la coerenza della cronologia.
        const currentView = history.state?.view || 'home';
        const currentParams = history.state?.params;
        if (typeof pushView === 'function') {
            // Usiamo un piccolo timeout per assicurarci che il popstate sia completato
            setTimeout(() => {
                // Questo ripristina lo stato della cronologia a quello che era prima del "back"
                // senza aggiungere una nuova entry.
                history.pushState({ view: currentView, params: currentParams }, '', `#${currentView}`);
            }, 0);
        }
        return;
    }

        // Gestiamo la navigazione tra le viste solo se non ci sono popup
        // e se la funzione handleViewChange è definita.
        handleViewChange(event.state.view, true, event.state.params);
    }
});

function openPopup(overlay) {
    document.body.appendChild(overlay);
    document.body.classList.add('body-popup-open');
    // Aggiungiamo uno stato alla cronologia per "catturare" il tasto "indietro".
    history.pushState({ popup: true }, '');
    openPopupStack.push(overlay.id);

    // Focus trapping
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const popup = overlay.querySelector('.popup-content, .appointment-detail-popup, .booking-card');
    if (popup) {
        const focusableContent = popup.querySelectorAll(focusableElements);
        const firstFocusableElement = focusableContent[0];
        const lastFocusableElement = focusableContent[focusableContent.length - 1];

        document.addEventListener('keydown', function trapTabKey(e) {
            if (e.key !== 'Tab') return;
            if (e.shiftKey) { // shift + tab
                if (document.activeElement === firstFocusableElement) {
                    lastFocusableElement.focus(); e.preventDefault();
                }
            } else { // tab
                if (document.activeElement === lastFocusableElement) {
                    firstFocusableElement.focus(); e.preventDefault();
                }
            }
        });
        // Evitiamo di mettere automaticamente il focus su input/textarea altrimenti
        // sui dispositivi mobili si apre la tastiera. Se il primo elemento focalizzabile
        // è un input/select/textarea, invece di focalizzarlo puntiamo il focus sul
        // contenitore del popup per abilitare il focus trapping senza aprire la tastiera.
        if (firstFocusableElement) {
            const tag = firstFocusableElement.tagName.toLowerCase();
            const isFormField = (tag === 'input' || tag === 'textarea' || tag === 'select');
            if (!isFormField) {
                firstFocusableElement.focus();
            } else {
                // assegniamo tabindex al popup e focalizziamo il popup stesso
                if (!popup.hasAttribute('tabindex')) popup.setAttribute('tabindex', '-1');
                popup.focus();
            }
        }
    }
}

/**
 * Chiude tutti i popup attualmente aperti e, opzionalmente, reindirizza a una pagina specifica.
 * Questa funzione dovrebbe essere chiamata dopo un'operazione di successo all'interno di un popup.
 * Assicura che tutti gli overlay dei popup vengano rimossi e che la cronologia del browser venga resettata
 * allo stato della pagina di destinazione.
 * @param {function} [targetPageRenderFunction] - La funzione da chiamare per renderizzare la pagina di destinazione (es. renderBarberDashboardPage).
 * @param {boolean} [isSilent=true] - Passato alla funzione di rendering, tipicamente per evitare animazioni o ricaricamenti completi se i dati sono in cache.
 */
function closeAllPopupsAndRedirect(targetPageRenderFunction = null, isSilent = false) {
    isClosingPopup = true; // Imposta il flag prima di modificare la cronologia
    // Contiamo quanti popup dobbiamo chiudere PRIMA di rimuoverli dal DOM.
    const popupsToCloseCount = openPopupStack.length;

    // Rimuovi tutti gli overlay dei popup dal DOM
    openPopupStack.forEach(popupId => {
        document.getElementById(popupId)?.remove();
    });
    document.body.classList.remove('body-popup-open');
    // Svuota lo stack
    openPopupStack = [];

    if (!targetPageRenderFunction) {
        // Se non c'è una funzione di redirect, torniamo indietro nella cronologia
        // di un numero di passi pari ai popup che erano aperti.
        if (popupsToCloseCount > 0) history.go(-popupsToCloseCount);
    } else {
        // Se c'è una funzione di redirect, la eseguiamo.
        // Il primo argomento `true` è per `skipPush`, per evitare loop nella cronologia.
        targetPageRenderFunction(true, isSilent);
    }
}

function closeTopPopup() {
    if (openPopupStack.length > 0) {
        const popupId = openPopupStack.pop();
        const popupElement = document.getElementById(popupId);
        if (popupElement) popupElement.remove();
        if (openPopupStack.length === 0) {
            document.body.classList.remove('body-popup-open');
        }
    }
}

/**
 * Mostra uno spinner all'interno del contenitore dei pulsanti di un popup.
 * @param {HTMLElement} button - Il pulsante che ha attivato l'azione.
 */
function showButtonSpinner(button) {
    if (!button) return;

    // Salva il testo originale e disabilita il pulsante
    button.dataset.originalText = button.innerHTML;
    button.disabled = true;

    const color = window.getComputedStyle(button).color || '#8A9A5B';
    button.innerHTML = `<div class="btn-spinner" style="color: ${color}; margin: 0 auto;"></div>`;
}

/**
 * Nasconde lo spinner e ripristina i pulsanti originali.
 * @param {HTMLElement} button - Il pulsante che ha attivato l'azione.
 */
function hideButtonSpinner(button) {
    if (button && button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
        button.disabled = false;
    }
}

/**
 * Crea una struttura di popup standardizzata.
 * @param {string} id - ID univoco per l'overlay del popup.
 * @param {string} title - Il titolo da mostrare nell'header del popup.
 * @param {string} contentHtml - L'HTML per il corpo del popup.
 * @param {string} actionsHtml - L'HTML per i pulsanti di azione nel footer.
 * @returns {HTMLElement} L'elemento overlay del popup creato.
 */
function createPopup(id, title, contentHtml, actionsHtml) {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.id = id;

    overlay.innerHTML = `
        <div class="popup-content fade-in">
            <h2 class="popup-title">${title}</h2>
            <div class="popup-body">
                ${contentHtml}
            </div>
            <div class="popup-actions">
                ${actionsHtml}
            </div>
        </div>
    `;
    
    openPopup(overlay); // Usiamo la nostra funzione helper per gestire lo stack e la cronologia
    return overlay;
}

/**
 * Mostra un popup di avviso personalizzato invece dell'alert di sistema.
 * @param {string} title - Titolo del popup.
 * @param {string} message - Messaggio del popup.
 * @param {function} [callback] - Funzione da eseguire alla chiusura del popup.
 */
function showCustomAlert(title, message, callback) {
  const contentHtml = `<p>${message}</p>`;
  const actionsHtml = `<button id="alert-close-btn" class="popup-action-main">Chiudi</button>`;
  const overlay = createPopup('custom-alert-overlay', title, contentHtml, actionsHtml);
  
  const closeBtn = document.getElementById('alert-close-btn');
  closeBtn.onclick = () => {    
    closeAllPopupsAndRedirect(callback); // Il callback verrà eseguito solo se non è nullo
  };
}

/**
 * Mostra un popup di conferma prima di procedere al logout.
 */
function confirmLogout(homeRenderFunction) {
  const contentHtml = `<p>Sei sicuro di voler uscire dal tuo account?</p>`;
  const actionsHtml = `
    <button id="logout-cancel-btn" class="popup-action-secondary">Annulla</button>
    <button id="logout-confirm-btn" class="popup-action-danger">Esci</button>
  `;
  const overlay = createPopup('logout-confirmation-overlay', 'Conferma Logout', contentHtml, actionsHtml);
  
  document.getElementById('logout-confirm-btn').onclick = () => {
    resetUserAndReload();
  };
  
  document.getElementById('logout-cancel-btn').onclick = () => {
    if (homeRenderFunction) {
      closeAllPopupsAndRedirect(homeRenderFunction, true); // Chiude il popup e ricarica la pagina specificata senza animazioni
    }
  };
}

/**
 * Funzione per resettare l'utente e ricaricare la pagina (logout).
 */
function resetUserAndReload() {
  localStorage.removeItem('barber_user');
  localStorage.removeItem('client_user');
  localStorage.removeItem('barber_authenticated');
  location.reload();
}

/**
 * Gestore per il focus degli input: salva il valore corrente e lo svuota.
 * @param {HTMLInputElement} el - L'elemento input.
 */
function handleInputFocus(el) {
    el.dataset.oldVal = el.value;
    el.value = '';
}

/**
 * Gestore per il blur degli input: ripristina il valore precedente se l'input è vuoto,
 * altrimenti formatta gli orari.
 * @param {HTMLInputElement} el - L'elemento input.
 */
function handleInputBlur(el) {
    let val = el.value.trim();
    // Se il campo contiene solo la maschera vuota, ripristina il valore precedente
    if (val === '') {
        el.value = el.dataset.oldVal || '';
        return;
    }

    // Auto-completamento Data (es. "15" -> "15/MM/YYYY", "15/10" -> "15/10/YYYY")
    if (el.classList.contains('date-mask')) {
        const now = new Date();
        const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
        const currentYear = String(now.getFullYear());
        
        let parts = val.split('/');
        let d = parts[0] ? parts[0].padStart(2, '0') : '';
        let m = parts[1] ? parts[1].padStart(2, '0') : currentMonth;
        let y = parts[2] ? parts[2] : currentYear;
        
        if (y && y.length === 2) y = "20" + y; // Gestione anno a 2 cifre
        
        if (d) {
            if (parseInt(m, 10) > 12) m = currentMonth;
            if (parseInt(d, 10) > 31) d = '31';
            el.value = `${d}/${m}/${y}`;
        }
    }

    // Formattazione automatica per gli orari (es. "9" -> "09:00", "1430" -> "14:30")
    if (el.classList.contains('h-inp')) {
        // Se l'utente scrive solo numeri, formattiamo in base alla lunghezza
        if (/^\d+$/.test(val)) {
            if (val.length <= 2) val = val.padStart(2, '0') + ":00";
            else if (val.length === 3) val = "0" + val.substring(0, 1) + ":" + val.substring(1);
            else if (val.length === 4) val = val.substring(0, 2) + ":" + val.substring(2);
        }

        let parts = val.split(':');
        let h = parts[0] ? parts[0].padStart(2, '0') : '00';
        let m = parts[1] ? parts[1].padEnd(2, '0').substring(0, 2) : '00';

        // Validazione limiti 24h
        let hNum = parseInt(h, 10);
        let mNum = parseInt(m, 10);
        if (isNaN(hNum) || hNum > 23) h = '00';
        if (isNaN(mNum) || mNum > 59) m = '00';

        el.value = h + ":" + m;
    }
}

/**
 * Sincronizza il valore di un input date picker con un input di testo mascherato.
 */
function syncPickerToMask(picker, targetId) {
    if (!picker.value) return;
    const target = document.getElementById(targetId);
    if (target) {
        target.value = formatDateToItalian(picker.value);
    }
}

/**
 * Mostra una schermata di errore di rete con un pulsante per ricaricare la pagina.
 * @param {Error|string} err - L'oggetto errore o il messaggio di errore.
 */
function showNetworkError(err) {
    console.error("Network/API Error:", err);
    const errorMessage = `
        <div class="loading-container">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; text-align: center; padding: 20px;">
                <button onclick="location.reload()" style="background: transparent; border: none; color: #8A9A5B; cursor: pointer; padding: 20px; border-radius: 50%;" title="Ricarica pagina">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                </button>
                <p style="font-size: 0.9em; color: #666;">Errore di connessione. Tocca per ricaricare.</p>
            </div>
        </div>`;
    appContainer.innerHTML = errorMessage;
}

/**
 * Gestisce l'inserimento con maschera per date e orari.
 */
function handleMaskInput(el, type) {
    let val = el.value.replace(/\D/g, ''); // Estrai solo i numeri
    let out = '';
    
    if (type === 'date') {
        val = val.substring(0, 8); // Max 8 cifre
        if (val.length > 0) out += val.substring(0, 2);
        if (val.length > 2) out += '/' + val.substring(2, 4);
        if (val.length > 4) out += '/' + val.substring(4, 8);
    } else {
        val = val.substring(0, 4); // Max 4 cifre
        if (val.length > 0) out += val.substring(0, 2);
        if (val.length > 2) out += ':' + val.substring(2, 4);
    }
    
    el.value = out;
}

/**
 * Converte GG/MM/AAAA in AAAA-MM-GG per il backend.
 */
function formatDateToIso(str) {
    if (!str || !str.includes('/')) return str;
    const parts = str.split('/');
    if (parts.length !== 3) return str;
    return `${parts[2].trim()}-${parts[1].trim()}-${parts[0].trim()}`;
}

/**
 * Converte AAAA-MM-GG in GG/MM/AAAA per la visualizzazione.
 */
function formatDateToItalian(iso) {
    if (!iso || !iso.includes('-')) return iso;
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Normalizza un numero di telefono per il confronto (versione Frontend).
 * Rimuove tutto ciò che non è un numero e gestisce i prefissi italiani.
 * @param {string} phone - Il numero di telefono da normalizzare.
 * @returns {string} Il numero di telefono normalizzato.
 */
function normalizePhone(phone) {
    if (!phone) return "";
    let cleaned = phone.toString().replace(/\D/g, ""); // Rimuove tutto ciò che non è un numero

    // Gestione prefisso Italia (39 o 0039) su numeri standard di 10 cifre
    if (cleaned.startsWith("0039") && cleaned.length > 10) cleaned = cleaned.substring(4);
    else if (cleaned.startsWith("39") && cleaned.length > 10) cleaned = cleaned.substring(2);

    return cleaned;
}

/**
 * Capitalizza solo la prima lettera di una stringa e rende il resto minuscolo.
 * @param {string} str - La stringa da formattare.
 * @returns {string} La stringa formattata.
 */
function capitalizeFirst(str) {
    if (!str) return "";
    const trimmed = str.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/**
 * Utility: Converte stringa HH:mm in oggetto ore/minuti (Frontend).
 */
function parseTimeString(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.toString().split(':');
    if (parts.length < 2) return null;
    return { hours: parseInt(parts[0], 10), minutes: parseInt(parts[1], 10) };
}

/**
 * Genera la lista dei giorni disponibili basata sulle impostazioni e orari di lavoro (Unificata).
 */
function getBookingDays(settings, workingHours) {
    const now = new Date();
    let minDays = parseInt(settings.MIN_BOOKINGS_DAYS, 10);
    if (isNaN(minDays)) {
        if (settings.MIN_BOOKINGS_DAYS === 'next_week') {
            const today = new Date();
            const dayOfWeek = today.getDay();
            let daysUntilMonday = (dayOfWeek === 0) ? 1 : (7 - dayOfWeek + 1) % 7;
            if (daysUntilMonday === 0) daysUntilMonday = 7;
            minDays = daysUntilMonday;
        } else {
            minDays = 0;
        }
    }
    const windowDays = parseInt(settings.BOOKING_WINDOW_DAYS, 10) || 10;
    const daysNames = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    const allBarberIds = Object.keys(workingHours).filter(key => key !== '_visibility');

    const result = [];
    for (let i = minDays; i < minDays + windowDays; i++) {
        const d = new Date();
        d.setDate(now.getDate() + i);
        const dayOfWeek = daysNames[d.getDay()];
        
        let isOpen = false;
        for (const barberId of allBarberIds) {
            const barberSchedule = workingHours[barberId] || [];
            const config = barberSchedule.find(row => row[1] && row[1].toLowerCase() === dayOfWeek);
            if (config && (config[2] || config[3] || config[4] || config[5])) {
                isOpen = true;
                break;
            }
        }
        if (isOpen) {
            result.push(new Date(d));
        }
    }
    return result;
}

/**
 * Genera l'HTML per le colonne dei barbieri e i relativi slot orari.
 */
function getBarberColumnsHtml(allSlots, targetDay, barbers, onSelectSlotName) {
    const filtered = allSlots ? allSlots.filter(s => s.dateKey === targetDay) : [];
    let html = '';

    for (const bId in barbers) {
        const barber = barbers[bId];
        const bSlots = filtered.filter(s => s.barberId === bId);
        
        const slotsHtml = bSlots.length > 0
            ? bSlots.map(s => `<div class="time-slot" onclick="${onSelectSlotName}(this, '${s.iso}', '${s.barberId}', '${s.formatted}', '${s.time}', '${s.barberName}', '${s.clientEmail}', '${s.serviceName}')">${s.time}</div>`).join('')
            : `<p style="font-size: 0.8em; text-align: center; color: #dc3545; font-weight: 600; margin-top: 10px;">Non disponibile</p>`;

        const bPhoto = barber.foto || "https://via.placeholder.com/100/8A9A5B/ffffff?text=" + barber.nome.charAt(0);

        html += `
            <div class="barber-col">
                <div class="barber-info-header">
                    <img src="${bPhoto}" class="barber-photo" style="width:50px; height:50px;" alt="${barber.nome}">
                    <div class="barber-name-header" style="font-size:0.85em;">${barber.nome}</div>
                </div>
                ${slotsHtml}
            </div>`;
    }
    return html;
}

/**
 * Formatta il label del mese/anno per le liste giorni.
 */
function getMonthLabel(date) {
    const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    return months[date.getMonth()] + " " + date.getFullYear();
}

/**
 * Genera l'HTML per una singola pillola del giorno.
 */
function getDayPillHtml(date, onClickName) {
    const daysShort = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
    const isoDate = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, '0') + "-" + String(date.getDate()).padStart(2, '0');
    return `
        <div class="day-pill" data-label="${getMonthLabel(date)}" onclick="${onClickName}(this, '${isoDate}')">
            <span class="day-name">${daysShort[date.getDay()]}</span>
            <div class="day-num">${date.getDate()}</div>
        </div>`;
}

/**
 * Mostra il popup dei conflitti per le indisponibilità
 */
function showIndispoConflictPopup(conflicts, onConfirm) {
    const conflictsHtml = conflicts.map(c => `
        <div style="padding: 8px; border-bottom: 1px solid #eee; text-align: left; font-size: 0.9em;">
            <strong>${c.time}</strong> - ${c.name} (${c.service})
        </div>
    `).join('');

    const contentHtml = `
        <p>In questo orario sono già presenti degli appuntamenti. Se procedi, verranno <strong>annullati</strong> e i clienti riceveranno una notifica:</p>
        <div class="conflict-list">${conflictsHtml}</div>
    `;
    // La chiusura qui è gestita dal `history.back()` che non ha bisogno del flag `isClosingPopup`
    const actionsHtml = `
        <button class="popup-action-secondary" onclick="closeAllPopupsAndRedirect()">Chiudi</button>
        <button id="confirmForceIndispo" class="popup-action-danger">Elimina e Procedi</button>
    `;
    createPopup('indispo-conflict-overlay', 'Conflitto Appuntamenti', contentHtml, actionsHtml);

    document.getElementById('confirmForceIndispo').onclick = () => {
        closeAllPopupsAndRedirect(); // Prima chiudiamo tutti i popup
        onConfirm(); // E poi eseguiamo l'azione di salvataggio forzato
    };
}