/**
 * Logica e Rendering della Dashboard del Barbiere
 */
let currentBarberId = null; // ID del barbiere loggato
let currentCalendarWeekStart = new Date(); // Inizio della settimana visualizzata nel calendario
let currentDisplayedBarberId = null; // ID del barbiere attualmente visualizzato nella dashboard
let currentCalendarView = localStorage.getItem('barber_calendar_view') || 'day'; 
let cachedBarberAppointments = null; // Cache locale per tutti gli appuntamenti del barbiere
let isCalendarExpanded = currentCalendarView === 'week'; 
let dashboardCalendarScrollPosition = null; // Memorizza la posizione di scroll del calendario tra le viste
let editAppState = {}; // Stato per la modifica appuntamento nel popup
let calendarZoomLevel = parseFloat(localStorage.getItem('barber_calendar_zoom')) || 1.0; // Livello di zoom per l'altezza delle ore (1.0 = 60px)
let dashboardAutoRefreshInterval = null; // Timer per il refresh automatico

/**
 * Renderizza la pagina di richiesta password per il barbiere.
 */
function renderBarberPasswordPage(skipPush = false) {
    window.scrollTo(0, 0);
    if (!skipPush) pushView('barber-password');

    const renderForm = () => {
        appContainer.innerHTML = `
            <div id="barber-password-screen" class="full-screen">
                <div class="registration-content">
                    <img src="./Frontend/assets/logo-full-maskable.png" alt="Logo" style="width: 280px; margin: 0 auto 20px; display: block;">
                    <p style="text-align: center; color: #666; margin-bottom: 20px;">Inserisci le tue credenziali per accedere alla dashboard.</p>
                    <input type="email" id="barberEmail" placeholder="Email" required onkeydown="if(event.key === 'Enter') handleBarberPasswordSubmit()">
                    <input type="password" id="barberPassword" placeholder="Password" required onkeydown="if(event.key === 'Enter') handleBarberPasswordSubmit()">
                    <button class="login-button" onclick="handleBarberPasswordSubmit()">Accedi</button>
                    <p id="passwordError" style="color: #dc3545; text-align: center; margin-top: 10px; display: none;">Email o Password errata. Riprova.</p>
                </div>
            </div>
        `;
    };

    // Se le impostazioni non sono in cache, mostra lo spinner e caricale
    if (!cachedAppData || !cachedAppData.settings) {
        appContainer.innerHTML = `<div class="loading-container"><div class="spinner"></div></div>`;
        google.script.run.withSuccessHandler(settings => {
            if (!cachedAppData) cachedAppData = {};
            cachedAppData.settings = settings;
            renderForm();
        }).getSettings();
    } else {
        renderForm();
    }
}

/**
 * Mostra un messaggio di errore nel form di login del barbiere e ripristina il pulsante.
 * @param {string} message - Il messaggio da visualizzare.
 */
function showLoginError(message) {
    const errorDisplay = document.getElementById('passwordError');
    const btn = document.querySelector('#barber-password-screen button');
    const passwordInput = document.getElementById('barberPassword');

    if (errorDisplay) {
        errorDisplay.innerText = message;
        errorDisplay.style.display = 'block';
    }
    // Usa la funzione globale per nascondere lo spinner e ripristinare il pulsante
    if (btn) hideButtonSpinner(btn);
    if (passwordInput) passwordInput.value = '';
}

/**
 * Gestisce l'invio della password del barbiere.
 */
function handleBarberPasswordSubmit() {
    const email = document.getElementById('barberEmail').value.trim();
    const password = document.getElementById('barberPassword').value.trim();
    const btn = document.querySelector('#barber-password-screen button');

    if (!email || !password) return showLoginError("Inserisci sia email che password.");

    showButtonSpinner(btn); // Mostra lo spinner nel pulsante

    google.script.run
        .withSuccessHandler(isCorrect => {
            if (isCorrect) {
                localStorage.setItem('barber_authenticated', 'true'); // Marca l'utente come autenticato in modo persistente
                
                // Salviamo temporaneamente l'email per caricare i dati corretti
                userData = { email: email };
                localStorage.setItem('barber_user', JSON.stringify(userData));

                // Mostra lo spinner a schermo intero durante il caricamento dei dati
                appContainer.innerHTML = `<div class="loading-container"><div class="spinner"></div></div>`;

                // Carichiamo i dati iniziali del barbiere prima di mostrare la dashboard
                google.script.run.withSuccessHandler(data => {
                    cachedAppData = data;
                    document.title = (data.settings.BUSINESS_NAME || 'Business') + " - Gestionale";
                    // Cerchiamo i dettagli completi del barbiere per aggiornare userData
                    const barberInfo = Object.values(data.barbers).find(b => b.email.toLowerCase() === email.toLowerCase());
                    if (barberInfo) {
                        userData.nome = barberInfo.nome;
                        localStorage.setItem('barber_user', JSON.stringify(userData));
                    }
                    initBarberDashboard();
                }).withFailureHandler(showNetworkError).getAppInitData(email, null, true); // Esegui un full-load all'accesso
                
            } else {
                showLoginError("Credenziali non valide. Riprova.");
            }
        })
        .withFailureHandler(err => {
            showLoginError("Errore di verifica: " + err);
        })
        .verifyBarberPassword(email, password);
}

/**
 * Inizializza la dashboard del barbiere, recuperando l'ID del barbiere loggato.
 */
function initBarberDashboard() {
    // Se i dati non sono ancora in cache, mostra lo spinner corretto e avvia il caricamento.
    if (!cachedAppData) {
        appContainer.innerHTML = `<div class="loading-container"><div class="spinner"></div></div>`;
        google.script.run.withSuccessHandler(data => {
            cachedAppData = data;
            initBarberDashboard(); // Richiama se stessa con i dati ora in cache
        }).withFailureHandler(showNetworkError).getAppInitData(userData.email, null, false); // Caricamento iniziale "leggero"
        return; // Esce per attendere il caricamento
    }

    // Trova l'ID del barbiere loggato
    const barberEntries = Object.entries(cachedAppData.barbers);
    const foundBarber = barberEntries.find(([id, b]) => b.email.toLowerCase() === userData.email.toLowerCase());
    if (foundBarber) {
        currentBarberId = foundBarber[0]; // Salva l'ID del barbiere
    } else {
        showCustomAlert("Errore", "Impossibile trovare il barbiere associato a questa email.");
        resetUserAndReload();
        return;
    }

    // Imposta la data di riferimento a oggi a mezzanotte
    const today = new Date();
    currentCalendarWeekStart.setHours(0, 0, 0, 0);

    currentDisplayedBarberId = currentBarberId;
    
    // Utilizziamo i dati già presenti nel caricamento iniziale (cachedAppData)
    // Questo evita la seconda chiamata getAppInitData all'apertura
    cachedBarberAppointments = cachedAppData.barberAppointments || [];
    
    renderBarberDashboardPage();
    startDashboardAutoRefresh(); 
}

function renderBarberDashboardPage(skipPush = false, isSilent = false) {
    window.scrollTo(0, 0);
    // Assicurati che l'utente sia autenticato come barbiere per vedere questa pagina
    if (!localStorage.getItem('barber_authenticated')) {
        renderBarberPasswordPage(skipPush); // Reindirizza alla pagina di password se non autenticato
        return;
    }
    if (!skipPush) pushView('dashboard');

    // Salva la posizione di scroll del calendario prima di ridisegnare la pagina
    const oldCalendarBody = document.querySelector('.calendar-body');
    const savedScrollTop = oldCalendarBody ? oldCalendarBody.scrollTop : dashboardCalendarScrollPosition;

    // Recupera i dati del barbiere attualmente visualizzato
    const displayedBarber = cachedAppData.barbers[currentDisplayedBarberId];
    // Sicurezza: controlla se barber_1 esiste prima di accedere alla mail
    const isOwner = cachedAppData.barbers.barber_1 ? (userData.email.toLowerCase() === cachedAppData.barbers.barber_1.email.toLowerCase()) : false;

    const layoutClass = isCalendarExpanded ? 'dashboard-layout expanded' : 'dashboard-layout';
    const animClass = isSilent ? '' : 'fade-in';
    const headerClass = isCalendarExpanded ? `barber-display-header ${animClass} expanded` : `barber-display-header ${animClass}`;
    
    // Calcola se ci sono richieste di cancellazione pendenti
    const pendingCount = cachedBarberAppointments ? 
        cachedBarberAppointments.filter(a => a.status === 'Richiesta cancellazione').length : 0;

    const cancelCardStyle = pendingCount > 0 
        ? "background-color: #dc3545; color: white; border: none; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4);" 
        : "background-color: white; color: #1a1a1a;";

    appContainer.innerHTML = `
        <div id="barber-dashboard-screen" class="full-screen">
            <div class="fixed-header">
                <img src="./Frontend/assets/logo-name-maskable.png" alt="Logo" style="height: 45px; width: auto;">
                <button class="logout-header-btn" onclick="confirmLogout(renderBarberDashboardPage)" title="Logout">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </button>
            </div>
            <div class="home-content">
                <!-- Nome del Barbiere Visualizzato e Controlli di Cambio -->
                <div class="${headerClass}">
                    <h2 style="text-align: center; margin-top: 0; margin-bottom: 0;">${displayedBarber.nome}</h2>
                </div>

                <div class="${layoutClass}">
                    <!-- Colonna Sinistra: Calendario -->
                    <div class="calendar-section">
                        <div class="calendar-unified-container ${animClass}">
                            <div class="calendar-controls">
                                <!-- Riga Superiore: Vista e Aggiorna -->
                                <div class="calendar-controls-row top-row">
                                    <div class="view-selector">
                                        <button class="${currentCalendarView === 'day' ? 'active' : ''}" onclick="setCalendarView('day')">Giorno</button>
                                        <button class="${currentCalendarView === 'week' ? 'active' : ''}" onclick="setCalendarView('week')">Settimana</button>
                                    </div>
                                    <button class="calendar-refresh-btn" onclick="refreshDashboardData(false)" title="Sincronizza">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                                    </button>
                                </div>
                                <!-- Riga Inferiore: Navigazione e Oggi -->
                                <div class="calendar-controls-row bottom-row">
                                    <div class="calendar-zoom-controls">
                                        <button onclick="zoomCalendar(-1)" class="zoom-btn" title="Riduci">-</button>
                                        <span id="zoom-level-label">100%</span>
                                        <button onclick="zoomCalendar(1)" class="zoom-btn" title="Ingrandisci">+</button>
                                    </div>
                                    <div class="calendar-nav-group main-nav">
                                        <div id="current-period-label-container"><span id="current-period-label"></span></div>
                                    </div>
                                    <button onclick="goToToday()" class="today-btn">OGGI</button>
                                </div>
                            </div>

                            <div id="custom-barber-calendar" class="custom-calendar">
                                <!-- Contenuto generato da renderCustomCalendar -->
                                <div class="spinner" style="margin: 50px auto;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Colonna Destra: Info e Azioni -->
                    <div class="info-section">
                        <h2 style="text-align: left; margin-top: 0; margin-bottom: 20px;">Azioni Rapide</h2>
                        
                        <div class="dashboard-cards-grid">
                            <div class="dashboard-card ${animClass}" style="animation-delay: 0.1s;" onclick="saveDashboardScroll(); renderBarberAddAppointmentPage();">
                                <div class="dashboard-card-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                </div>
                                <div class="dashboard-card-label">Aggiungi Appuntamento</div>
                            </div>
                            
                            <div class="dashboard-card ${animClass}" style="animation-delay: 0.15s;" onclick="saveDashboardScroll(); renderBarberWeeklyAppointmentsListPage();">
                                <div class="dashboard-card-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15.61V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"></path><path d="M16 2v4"></path><path d="M8 2v4"></path><path d="M3 10h18"></path><path d="M19 22l2-2-2-2"></path><path d="M21 20H15a2 2 0 0 1-2-2"></path></svg>
                                </div>
                                <div class="dashboard-card-label">Appuntamenti Settimanali</div>
                            </div>

                            <div class="dashboard-card ${animClass}" style="animation-delay: 0.4s;" onclick="saveDashboardScroll(); renderBarberAppointmentsListPage();">
                                <div class="dashboard-card-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                </div>
                                <div class="dashboard-card-label">Lista Appuntamenti</div>
                            </div>                            

                            <div class="dashboard-card ${animClass}" style="animation-delay: 0.3s;" onclick="saveDashboardScroll(); renderBarberClientsListPage();">
                                <div class="dashboard-card-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                </div>
                                <div class="dashboard-card-label">Lista Clienti</div>
                            </div>

                            <div class="dashboard-card ${animClass}" style="animation-delay: 0.2s; ${cancelCardStyle}" onclick="saveDashboardScroll(); renderBarberCancellationsPage();">
                                <div class="dashboard-card-icon" style="background: ${pendingCount > 0 ? 'rgba(255,255,255,0.2)' : ''};">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${pendingCount > 0 ? 'white' : 'currentColor'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                </div>
                                <div class="dashboard-card-label" style="color: ${pendingCount > 0 ? 'white' : 'inherit'}">Richieste Annullamenti</div>
                                ${pendingCount > 0 ? `<div style="position: absolute; top: 10px; right: 10px; background: white; color: #dc3545; width: 20px; height: 20px; border-radius: 50%; font-size: 0.7em; display: flex; align-items: center; justify-content: center; font-weight: 800;">${pendingCount}</div>` : ''}
                            </div>

                            <!--
                            <div class="dashboard-card ${animClass}" style="animation-delay: 0.45s;" onclick="saveDashboardScroll(); renderBarberWorkingHoursPage();">
                                <div class="dashboard-card-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                </div>
                                <div class="dashboard-card-label">Orari e Servizi</div>
                            </div>
                            -->

                            <div class="dashboard-card ${animClass}" style="animation-delay: 0.48s;" onclick="saveDashboardScroll(); renderPersonalCommitmentsListPage();">
                                <div class="dashboard-card-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                </div>
                                <div class="dashboard-card-label">Indisponibilità Barbiere</div>
                            </div>

                            <!--
                            <div class="dashboard-card ${animClass}" style="animation-delay: 0.5s;" onclick="saveDashboardScroll(); renderBarberSettingsPage();">
                                <div class="dashboard-card-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                </div>
                                <div class="dashboard-card-label">Impostazioni</div>
                            </div>
                            -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Aggiorna l'etichetta dello zoom con il valore corretto in memoria
    document.getElementById('zoom-level-label').innerText = `${Math.round(calendarZoomLevel * 100)}%`;

    // Se abbiamo i dati in cache, renderizziamo subito il calendario, altrimenti mostriamo lo spinner
    if (cachedBarberAppointments) {
        renderCustomCalendar(cachedBarberAppointments, isSilent, savedScrollTop);
    } else {
        const calendarContainer = document.getElementById('custom-barber-calendar');
        if (calendarContainer) calendarContainer.innerHTML = '<div class="spinner" style="margin: 50px auto;"></div>';
    }
}

function saveDashboardScroll() {
    const calendarBody = document.querySelector('.calendar-body');
    if (calendarBody) dashboardCalendarScrollPosition = calendarBody.scrollTop;
}


/**
 * Esempio di implementazione di una Sotto-Pagina: Richieste Cancellazione
 */
function renderBarberCancellations() {
    window.scrollTo(0, 0);
    const displayedBarber = cachedAppData.barbers[currentDisplayedBarberId];
    
    appContainer.innerHTML = `
        <div id="cancellations-screen" class="full-screen">
            <div class="fixed-header" onclick="saveDashboardScroll()">
                <button onclick="renderBarberDashboardPage();" class="header-back-btn">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <h2>RICHIESTE CANCELLAZIONE</h2>
            </div>
            <div class="home-content">
                <div class="booking-container">
                    <h2 style="margin-top: 20px;">Richieste per ${displayedBarber.nome}</h2>
                    <p style="text-align: center; color: #666; margin-bottom: 20px;">Qui appariranno le richieste pendenti.</p>
                    
                    <!-- Area per la lista delle richieste (da popolare con una fetch) -->
                    <div id="cancellations-list">
                         <p style="text-align: center; color: #aaa; font-style: italic; margin-top: 50px;">Nessuna richiesta al momento.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Placeholder per le altre pagine
 */
function renderBarberAddAppointment() { showCustomAlert("Info", "Pagina Aggiungi Appuntamento in costruzione"); }
function renderBarberClientsList() { showCustomAlert("Info", "Pagina Lista Clienti in costruzione"); }
function renderBarberAppointmentsList() { showCustomAlert("Info", "Pagina Elenco Appuntamenti in costruzione"); }
function renderBarberSettings() { showCustomAlert("Info", "Pagina Impostazioni in costruzione"); }

/**
 * Cambia la visualizzazione del calendario.
 */
function setCalendarView(view) {
    if (currentCalendarView === view) return;

    const infoSection = document.querySelector('.info-section');
    const layout = document.querySelector('.dashboard-layout');
    const cards = infoSection ? infoSection.querySelectorAll('.dashboard-card') : [];


    // 1. Fai scomparire le card azione
    if (infoSection) {
        infoSection.classList.add('switching-view');
        // Rimuovi la classe fade-in da ogni card per resettare l'animazione
        cards.forEach(card => {
            card.classList.remove('fade-in');
            card.style.opacity = '0'; // Assicurati che siano invisibili
        });
    }

    // 2. Attendi un istante e avvia l'espansione/contrazione
    setTimeout(() => {
        currentCalendarView = view;
        isCalendarExpanded = (view === 'week');
        localStorage.setItem('barber_calendar_view', view);
        
        if (layout) {
            layout.classList.toggle('expanded', isCalendarExpanded);
        }

        // Aggiorniamo lo stato attivo dei pulsanti nel selettore
        // Questi bottoni non vengono ricreati, quindi possiamo aggiornarli direttamente.

        document.querySelectorAll('.view-selector button').forEach(btn => {
            const isSettimana = btn.textContent.toLowerCase().includes('settimana');
            btn.classList.toggle('active', (view === 'week' && isSettimana) || (view === 'day' && !isSettimana));
        });

        // Ridisegniamo il calendario mentre si espande
        fetchAndRenderBarberAppointments();

        // 3. Quando l'animazione del layout finisce (500ms), fai riapparire le card in sequenza
        setTimeout(() => {
            if (infoSection) {
                infoSection.classList.remove('switching-view');
                cards.forEach((card, index) => {
                    // Forza un reflow per garantire che la rimozione della classe sia effettiva prima di riaggiungerla
                    void card.offsetWidth; 
                    card.style.animationDelay = `${index * 0.1}s`; // Staggered delay
                    card.classList.add('fade-in'); // Aggiungi per riattivare l'animazione
                });
            }
        }, 500);
    }, 150);
}

/**
 * Riporta il calendario alla data odierna.
 */
function goToToday() {
    currentCalendarWeekStart = new Date();
    currentCalendarWeekStart.setHours(0, 0, 0, 0);
    fetchAndRenderBarberAppointments(); // Utilizza la cache
}

/**
 * Cambia il periodo visualizzato (giorno o settimana) nel calendario.
 * @param {number} offset - Numero di periodi da aggiungere/sottrarre.
 */
function changeCalendarPeriod(offset) {
    const step = currentCalendarView === 'week' ? 7 : 1;
    const newDate = new Date(currentCalendarWeekStart);
    newDate.setDate(newDate.getDate() + (offset * step));
    currentCalendarWeekStart = newDate;
    
    // Passiamo l'offset a fetchAndRender per gestire l'animazione
    fetchAndRenderBarberAppointments(false, true, null, offset);
}

/**
 * Modifica il livello di zoom del calendario.
 * @param {number} direction - 1 per ingrandire, -1 per ridurre.
 */
function zoomCalendar(direction) {
    const ZOOM_STEP = 0.25;
    const MIN_ZOOM = 0.5; // 30px
    const MAX_ZOOM = 2.0; // 120px

    let newZoom = calendarZoomLevel + (direction * ZOOM_STEP);
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

    if (newZoom !== calendarZoomLevel) {
        calendarZoomLevel = newZoom;
        localStorage.setItem('barber_calendar_zoom', calendarZoomLevel); // Salva il nuovo valore di zoom
        // Aggiorna l'etichetta della percentuale
        document.getElementById('zoom-level-label').innerText = `${Math.round(calendarZoomLevel * 100)}%`;
        fetchAndRenderBarberAppointments(false, true); // Re-renderizza il calendario dalla cache
    }
}

/**
 * Posiziona lo scroll del calendario in modo che l'ora corrente sia a 1/4 dell'altezza.
 */
function scrollToCurrentTime(calendarBodyEl) {
    if (!calendarBodyEl) return;
    
    requestAnimationFrame(() => {
        const now = new Date();
        const baseHourHeight = currentCalendarView === 'week' ? 36 : 60;
        const hourHeight = baseHourHeight * calendarZoomLevel;
        const currentPixels = (now.getHours() * hourHeight) + (now.getMinutes() * (hourHeight / 60));
        const targetScroll = currentPixels - (calendarBodyEl.clientHeight / 4);
        calendarBodyEl.scrollTop = targetScroll > 0 ? targetScroll : 0;
    });
}

/**
 * Avvia o resetta il timer per il refresh automatico dei dati ogni 10 minuti.
 */
function startDashboardAutoRefresh() {
    if (dashboardAutoRefreshInterval) clearInterval(dashboardAutoRefreshInterval);
    dashboardAutoRefreshInterval = setInterval(() => {
        console.log("[Dashboard] Sync automatico (5 min)...");
        refreshDashboardData(true); // Esegue il refresh in modalità "silenziosa"
    }, 5 * 60 * 1000); // Portato a 5 minuti
}

/**
 * Esegue un refresh completo di tutti i dati (globali e del barbiere visualizzato).
 * @param {boolean} isSilent - Se true, non mostra lo spinner di caricamento.
 */
function refreshDashboardData(isSilent = false, callback = null) {
    if (!userData || !userData.email || !currentDisplayedBarberId) return;

    const calendarContainer = document.getElementById('custom-barber-calendar');

    // Se il refresh è manuale (non silenzioso), mostriamo lo spinner solo nel calendario
    if (!isSilent) {
        if (calendarContainer) {
            calendarContainer.innerHTML = '<div class="spinner" style="margin: 50px auto;"></div>';
        }
    }

    google.script.run
        .withSuccessHandler(data => {
            cachedAppData = data;
            cachedBarberAppointments = data.barberAppointments || [];

            // Se è stato passato un callback (es. dopo aver salvato un impegno), lo eseguiamo.
            if (callback && typeof callback === 'function') {
                callback();
            // Altrimenti, se siamo nella dashboard, la aggiorniamo silenziosamente.
            } else if (document.getElementById('barber-dashboard-screen')) {
                renderBarberDashboardPage(true, true);
            } else {
                // Fallback: aggiorna solo il calendario se non siamo in nessuna delle condizioni precedenti.
                renderCustomCalendar(cachedBarberAppointments, true);
            }
        })
        .getAppInitData(userData.email, currentDisplayedBarberId, false); // Esegui sempre un caricamento "leggero" al refresh
}

/**
 * Recupera gli appuntamenti del barbiere dal backend e li renderizza nel calendario.
 * @param {boolean} forceRefresh - Se true, ignora la cache e interroga il server.
 * @param {boolean} isSilent - Se true, non mostra lo spinner di caricamento.
 */
function fetchAndRenderBarberAppointments(forceRefresh = false, isSilent = false, savedScrollTop = null, slideDirection = 0) {
    if (!currentDisplayedBarberId) {
        console.error("Nessun barbiere selezionato per il caricamento dati.");
        return;
    }

    // Salva la posizione di scroll corrente se stiamo per avviare un'animazione
    const currentBody = document.querySelector('.calendar-sliding-content.active .calendar-body');
    const scrollPos = savedScrollTop !== null ? savedScrollTop : (currentBody ? currentBody.scrollTop : null);

    // Se abbiamo i dati in cache e non è richiesto un refresh forzato, renderizziamo istantaneamente
    if (cachedBarberAppointments && !forceRefresh) {
        console.log("[Dashboard] Rendering da cache locale...");
        renderCustomCalendar(cachedBarberAppointments, isSilent, scrollPos, slideDirection);
        return;
    }

    const calendarContainer = document.getElementById('custom-barber-calendar');
    // Se stiamo facendo uno slide, non mostrare lo spinner principale
    if (slideDirection !== 0) isSilent = true;

    if (calendarContainer && !isSilent) {
        calendarContainer.innerHTML = '<div class="spinner" style="margin: 50px auto;"></div>'; // Mostra spinner
    }

    google.script.run
        .withSuccessHandler(appointments => { // Questo handler viene chiamato per currentDisplayedBarberId
            console.log("[Dashboard] Dati ricevuti dal server e salvati in cache.");
            cachedBarberAppointments = appointments; // Popola la cache
            
            // Se siamo nella dashboard principale e non è un refresh silenzioso (background),
            // rinfreschiamo l'intera pagina per aggiornare i colori delle card e il testo bianco
            if (document.getElementById('barber-dashboard-screen') && !isSilent) {
                renderBarberDashboardPage();
            } else {
                renderCustomCalendar(appointments, isSilent, scrollPos, slideDirection);
            }
        })
        .withFailureHandler(err => {
            console.error("Errore nel recupero appuntamenti barbiere:", err);
            if (calendarContainer) {
                calendarContainer.innerHTML = `<p style="text-align:center; color:#dc3545;">Errore caricamento appuntamenti: ${err}</p>`;
            }
        })
        .getBarberAppointments(currentDisplayedBarberId);
}

/**
 * Renderizza il calendario personalizzato con gli appuntamenti.
 * @param {Array} appointments - Lista degli appuntamenti del barbiere.
 */
function renderCustomCalendar(appointments, isSilent = false, savedScrollTop = null, slideDirection = 0) {
    const calendarContainer = document.getElementById('custom-barber-calendar');
    if (!calendarContainer) return;

    const baseHourHeight = currentCalendarView === 'week' ? 36 : 60;
    const hourHeight = baseHourHeight * calendarZoomLevel;
    calendarContainer.classList.toggle('calendar-view-week', currentCalendarView === 'week');
    calendarContainer.classList.toggle('daily-view-full-height', currentCalendarView === 'day');

    const daysOfWeek = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    const monthsFull = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

    let viewStart = new Date(currentCalendarWeekStart);
    let numDays = currentCalendarView === 'week' ? 7 : 1;

    // Se vista settimanale, calcoliamo sempre il lunedì della settimana di riferimento
    if (currentCalendarView === 'week') {
        const day = viewStart.getDay();
        const diff = viewStart.getDate() - day + (day === 0 ? -6 : 1);
        viewStart = new Date(viewStart.setDate(diff));
    }

    const viewEnd = new Date(viewStart);
    viewEnd.setDate(viewEnd.getDate() + (numDays - 1));

    // Aggiorna il label del periodo corrente
    const periodLabel = document.getElementById('current-period-label');
    if (periodLabel) {
        if (currentCalendarView === 'week') {
            periodLabel.innerText = `${viewStart.getDate()} ${months[viewStart.getMonth()]} - ${viewEnd.getDate()} ${months[viewEnd.getMonth()]}`;
        } else {
            periodLabel.innerText = `${viewStart.getDate()} ${monthsFull[viewStart.getMonth()]} ${viewStart.getFullYear()}`;
        }
    }

    let headerHtml = '';
    let daysColumnWrapperHtml = '';
    let viewContainsToday = false;

    // Genera la colonna degli orari con l'altezza dinamica
    const timeColumnHtml = Array.from({ length: 24 }, (_, h) => 
        `<div class="time-label" style="height: ${hourHeight}px;">${String(h).padStart(2, '0')}</div>`
    ).join('');

    for (let i = 0; i < numDays; i++) {
        const day = new Date(viewStart);
        day.setDate(viewStart.getDate() + i);
        const now = new Date();
        const isToday = day.toDateString() === now.toDateString();
        if (isToday) viewContainsToday = true;

        const dayName = daysOfWeek[day.getDay() === 0 ? 6 : day.getDay() - 1];
        headerHtml += `<div class="day-header ${isToday ? 'today' : ''}">${currentCalendarView === 'week' ? dayName.substring(0, 3) : dayName}<br>${day.getDate()}</div>`;

        let dayAppointmentsHtml = '';
        if (isToday) {
            // Linea del tempo corrente proporzionata
            const lineTop = (now.getHours() * hourHeight) + (now.getMinutes() * (hourHeight / 60));
            dayAppointmentsHtml += `<div class="current-time-line" style="top: ${lineTop}px;"></div>`;
        }

        const dayAppointments = appointments.filter(app => {
            const appDate = new Date(app.start);
            return appDate.toDateString() === day.toDateString();
        });

        dayAppointments.forEach(app => {
            const appStart = new Date(app.start);
            const appEnd = new Date(app.end);
            const startHour = appStart.getHours();
            const startMinute = appStart.getMinutes();
            const endHour = appEnd.getHours();
            const endMinute = appEnd.getMinutes();

            // Calcolo proporzionale: 1 ora = hourHeight pixel
            const top = (startHour * hourHeight) + (startMinute * (hourHeight / 60));
            const height = Math.max(((endHour * hourHeight) + (endMinute * (hourHeight / 60))) - top, 15); // Altezza minima

            const isPendingCancel = app.status.toLowerCase() === 'richiesta cancellazione';
            const isWeekly = app.status.toLowerCase() === 'weekly';
            const isIndispo = app.status.toLowerCase() === 'indisponibile';
            const isPast = appStart < now;
            const statusClass = isIndispo ? 'appointment-indisponibile' : (isPendingCancel ? 'appointment-pending' : 'appointment-confirmed');
            const cancelStyle = isPendingCancel ? 'background-color: #dc3545 !important; color: white !important; border-left: 3px solid rgba(0,0,0,0.2);' : '';
            const weeklyStyle = isWeekly ? 'background-color: #3498db !important; color: white !important; border-left: 3px solid rgba(0,0,0,0.2);' : '';

            dayAppointmentsHtml += `
                <div class="appointment-item ${statusClass} ${isPast ? 'past-appointment' : ''}" style="top: ${top}px; height: ${height}px; --appointment-height: ${height}px; ${cancelStyle} ${weeklyStyle}"
                    onclick="showAppointmentDetailsPopup('${app.id}', '${app.clientName}', '${app.service}', '${app.start}', '${app.end}', '${app.clientPhone}', '${currentDisplayedBarberId}', '${app.status}', '${String(app.cancelReason || "").replace(/'/g, "\\'")}')">
                    <div class="appointment-header">
                        <span class="appointment-time">${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}</span>
                        <span class="appointment-service">${app.service.replace(/_/g, ' ')}</span>
                    </div>
                    <span class="appointment-client">${app.clientName}</span>
                </div>
            `;
        });

        // Applica stili dinamici alla colonna del giorno
        const dayColumnStyle = `
            min-height: ${24 * hourHeight}px;
            background-size: 100% ${hourHeight}px;
        `;
        daysColumnWrapperHtml += `<div class="day-column ${isToday ? 'today' : ''}" style="${dayColumnStyle}">${dayAppointmentsHtml}</div>`;
    }

    // Calcolo del padding per l'allineamento verticale
    const verticalPadding = hourHeight / 2;
    const newContentHtml = `
        <div class="calendar-header"><div class="time-column-header"></div>${headerHtml}</div>
        <div class="calendar-body">
            <div class="time-column" style="padding-top: ${verticalPadding}px;">
                ${timeColumnHtml}
            </div>
            <div class="days-column-wrapper" style="padding-top: ${verticalPadding}px;">${daysColumnWrapperHtml}</div>
        </div>
    `;

    if (slideDirection === 0) {
        calendarContainer.innerHTML = `
            <div class="calendar-scroll-container">
                <div class="calendar-sliding-content active">${newContentHtml}</div>
            </div>
        `;
        const newBody = calendarContainer.querySelector('.calendar-body');
        if (savedScrollTop !== null) {
            newBody.scrollTop = savedScrollTop;
        } else if (!isSilent && viewContainsToday) {
            scrollToCurrentTime(newBody);
        }
        // Aggiungi la navigazione swipe al nuovo contenuto
        addSwipeNavigation(calendarContainer.querySelector('.calendar-scroll-container'));

        // Applica il margine negativo al primo time-label per il corretto allineamento
        const firstTimeLabel = calendarContainer.querySelector('.time-label:first-child');
        if (firstTimeLabel) firstTimeLabel.style.marginTop = `-${verticalPadding}px`;

    } else {
        const scrollContainer = calendarContainer.querySelector('.calendar-scroll-container');
        const oldContent = scrollContainer.querySelector('.calendar-sliding-content.active');

        const newSlidingContent = document.createElement('div');
        newSlidingContent.className = 'calendar-sliding-content';
        newSlidingContent.innerHTML = newContentHtml;

        // Imposta la posizione di partenza per l'animazione in entrata
        newSlidingContent.classList.add(slideDirection > 0 ? 'slide-in-from-right' : 'slide-in-from-left');
        scrollContainer.appendChild(newSlidingContent);

        // Ripristina lo scroll sul nuovo elemento PRIMA che l'animazione parta
        const newBody = newSlidingContent.querySelector('.calendar-body');
        if (savedScrollTop !== null) newBody.scrollTop = savedScrollTop;

        // Applica il margine negativo al primo time-label del nuovo contenuto
        const firstTimeLabel = newSlidingContent.querySelector('.time-label:first-child');
        if (firstTimeLabel) firstTimeLabel.style.marginTop = `-${verticalPadding}px`;

        // Aggiungi la navigazione swipe al nuovo contenuto
        addSwipeNavigation(scrollContainer);

        // Avvia l'animazione
        requestAnimationFrame(() => {
            if (oldContent) {
                oldContent.classList.remove('active');
                oldContent.classList.add(slideDirection > 0 ? 'slide-out-left' : 'slide-out-right');
            }
            newSlidingContent.classList.remove('slide-in-from-right', 'slide-in-from-left');
            newSlidingContent.classList.add('active');
        });

        setTimeout(() => oldContent?.remove(), 400);
    }
}

let isCalendarAnimating = false; // Flag per prevenire animazioni sovrapposte (debouncing)
let activeSwipeElement = null; // Riferimento all'elemento con i listener attivi

/**
 * Abilita la navigazione swipe orizzontale per il calendario.
 * @param {HTMLElement} element - L'elemento contenitore a cui applicare gli eventi.
 */
function addSwipeNavigation(element) {
    if (!element) return;

    // Rimuovi i vecchi listener se l'elemento è cambiato, per evitare duplicati.
    if (activeSwipeElement && activeSwipeElement !== element) {
        activeSwipeElement.removeEventListener('touchstart', handleTouchStart);
        activeSwipeElement.removeEventListener('touchend', handleTouchEnd);
        activeSwipeElement.removeEventListener('wheel', handleWheel);
    }
    activeSwipeElement = element;

    let touchStartX = 0;
    let touchStartY = 0;

    function handleTouchStart(event) {
        touchStartX = event.changedTouches[0].screenX;
        touchStartY = event.changedTouches[0].screenY;
    }

    function handleTouchEnd(event) {
        if (isCalendarAnimating) return;
        const touchEndX = event.changedTouches[0].screenX;
        const touchEndY = event.changedTouches[0].screenY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        // Attiva solo se lo swipe è prevalentemente orizzontale e supera una soglia
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            isCalendarAnimating = true;
            if (diffX < 0) {
                changeCalendarPeriod(1);
            } else {
                changeCalendarPeriod(-1);
            }
            setTimeout(() => { isCalendarAnimating = false; }, 500); // Sblocca dopo l'animazione
        }
    }

    function handleWheel(event) {
        // Ignora lo scroll verticale
        if (Math.abs(event.deltaX) < Math.abs(event.deltaY)) return;
        
        event.preventDefault(); // Previene lo scroll della pagina
        if (isCalendarAnimating) return;

        if (Math.abs(event.deltaX) > 20) { // Soglia per attivare
            isCalendarAnimating = true;
            if (event.deltaX > 0) {
                changeCalendarPeriod(1); // Scroll a destra -> settimana successiva
            } else {
                changeCalendarPeriod(-1); // Scroll a sinistra -> settimana precedente
            }
            setTimeout(() => { isCalendarAnimating = false; }, 500); // Sblocca dopo l'animazione
        }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('wheel', handleWheel, { passive: false });
}

/**
 * Mostra un popup con i dettagli dell'appuntamento e le opzioni di modifica/eliminazione.
 */
function showAppointmentDetailsPopup(bookingId, clientName, service, startIso, endIso, clientPhone, barberId, status, cancelReason = "") {
    const initialDate = new Date(startIso);
    const initialEndDate = new Date(endIso);
    const duration = (new Date(endIso).getTime() - initialDate.getTime()) / 60000;
    const isIndispo = status.toLowerCase() === 'indisponibile';
    const isPendingCancel = status === 'Richiesta cancellazione';

    editAppState = { // Use settings for default indispo names
        bookingId: bookingId, 
        serviceDuration: duration,
        clientPhone: clientPhone,
        clientEmail: (cachedAppData.clients || []).find(c => normalizePhone(c.telefono) === normalizePhone(clientPhone))?.email || 'Nessuna Email',
        barberId: barberId,
        isIndispo: isIndispo,
        currentDate: formatDateToItalian(initialDate.toISOString().split('T')[0]),
        currentTime: initialDate.getHours().toString().padStart(2, '0') + ":" + initialDate.getMinutes().toString().padStart(2, '0'),
        // Use settings for indispo names
        clientName: isIndispo ? cachedAppData.settings.INDISPO_CLIENT_NAME || "IMPEGNO PERSONALE" : clientName,
        serviceName: isIndispo ? cachedAppData.settings.INDISPO_SERVICE_NAME || "Indisponibilità" : service,
        cancelReason: cancelReason,
        allSlots: null, 
        selectedSlot: null,
        isWeekly: status.toLowerCase() === 'weekly'
    };

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.id = 'appointment-details-overlay';

    const formattedDate = initialDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedTime = initialDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const formattedEndTime = initialEndDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    overlay.innerHTML = `
        <div class="appointment-detail-popup fade-in" style="max-width: 420px; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <h3 style="margin: 0;">${isIndispo ? 'Dettagli Impegno' : 'Dettagli Appuntamento'}</h3>
                <button onclick="confirmCancelStandardAppointment('${bookingId}', '${clientName}', '${formattedDate} ${formattedTime}')" 
                        style="border: none; background: none; color: #dc3545; padding: 5px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
                ${isIndispo ? `
                <div class="detail-row">
                    <span class="detail-label">Nota / Descrizione</span>
                    <span class="detail-value" style="margin:0;">${service}</span>
                </div>
                ` : `
                <div class="detail-row">
                    <span class="detail-label">Cliente</span>
                    <span class="detail-value" style="margin:0;">${clientName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Telefono</span>
                    <a href="tel:${clientPhone}" class="detail-value" style="text-decoration: none; margin:0;">${clientPhone}</a>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email</span>
                    <a href="mailto:${editAppState.clientEmail}" class="detail-value" style="text-decoration: none; margin:0;">${editAppState.clientEmail}</a>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Servizio</span>
                    <span class="detail-value" style="margin:0;">${service.replace(/_/g, ' ')} (${duration} min)</span>
                </div>
                `}
            </div>

            ${isPendingCancel ? `
                <div style="background: #fff5f5; border: 1px solid #feb2b2; border-radius: 15px; padding: 15px; margin-bottom: 20px; text-align: left;">
                    <span class="detail-label" style="color: #999; font-size: 0.75em;">Motivo richiesta annullamento:</span>
                    <p style="font-size: 0.9em; color: #666; font-weight: 600; margin-top: 4px; line-height: 1.4;">${cancelReason || 'Nessuna motivazione fornita.'}</p>
                    <div id="cancellation-decision-buttons" style="display: flex; width: 100%; margin-top: 15px; border-top: 1px solid rgba(220, 53, 69, 0.1); padding-top: 10px;">
                        <button onclick="processBarberDecision('${bookingId}', 'reject', this)" style="flex: 1; background: transparent; border: none; color: #999; font-size: 0.75em; padding: 10px; font-weight: 700; text-transform: uppercase;">Rifiuta</button>
                        <button onclick="processBarberDecision('${bookingId}', 'approve', this)" style="flex: 1; background: transparent; color: #dc3545; border: none; font-size: 0.75em; padding: 10px; font-weight: 700; text-transform: uppercase;">Conferma</button>
                    </div>
                </div>
            ` : ''}
            
            <div style="display: flex; gap: 15px; align-items: center; background: #f9f9f9; padding: 12px; border-radius: 15px; border: 1px solid #eee; margin-bottom: 5px;">
                <div class="detail-row" style="flex: 1;">
                    <span class="detail-label">Data e Orario</span>
                    <span class="detail-value" style="margin:0;">${formattedDate} - ${formattedTime} - ${formattedEndTime}</span>
                </div>
                <button id="edit-time-btn" style="border: none; background: none; color: #555; padding: 5px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Modifica">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
            </div>

            <div id="edit-slots-section" class="hidden" style="margin-top: 15px; border-top: 2px dashed #eee; padding-top: 15px;">
                ${isIndispo ? `
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <span class="detail-label" style="color: #8A9A5B;">Modifica Impegno:</span>
                        <div>
                            <label class="detail-label">Giorno</label>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <input type="text" id="edit-indispo-date" class="date-mask" value="${editAppState.currentDate}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)" oninput="handleMaskInput(this, 'date')" placeholder="--/--/----" style="flex-grow: 1;">
                                <div style="position: relative; width: 45px; height: 45px; flex-shrink: 0;">
                                    <input type="date" id="edit-indispo-date-picker" value="${formatDateToIso(editAppState.currentDate)}" style="position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; z-index: 2;" onchange="syncPickerToMask(this, 'edit-indispo-date')">
                                    <button type="button" style="width: 100%; height: 100%; padding: 0; display: flex; align-items: center; justify-content: center; border: 1px solid #ccc; background: white; border-radius: 8px; color: #8A9A5B; position: absolute; top:0; left:0; z-index: 1;">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <div style="flex: 1;">
                                <label class="detail-label">Dalle ore</label>
                                <input type="text" id="edit-indispo-start" class="h-inp" value="${editAppState.currentTime}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)" oninput="handleMaskInput(this, 'time')" placeholder="--:--">
                            </div>
                            <div style="flex: 1;">
                                <label class="detail-label">Alle ore</label>
                                <input type="text" id="edit-indispo-end" class="h-inp" value="${initialEndDate.getHours().toString().padStart(2, '0')}:${initialEndDate.getMinutes().toString().padStart(2, '0')}" onfocus="handleInputFocus(this)" onblur="handleInputBlur(this)" oninput="handleMaskInput(this, 'time')" placeholder="--:--">
                            </div>
                        </div>
                        <div>
                            <label class="detail-label">Nota / Descrizione</label>
                            <input type="text" id="edit-indispo-note" value="${service}" placeholder="Descrizione">
                        </div>
                    </div>
                ` : `
                    <span class="detail-label" style="margin-bottom: 10px; display: block; color: #8A9A5B;">Nuova disponibilità:</span>
                    <div id="edit-days-row" class="days-scroll" style="margin-bottom: 15px; padding: 5px 0;"></div>
                    <div style="max-height: 200px; overflow-y: auto; padding-right: 5px;">
                        <div id="edit-barbers-columns" class="barbers-grid">
                            <div class="spinner" style="width:25px; height:25px;"></div>
                        </div>
                    </div>
                `}
            </div>

            ${editAppState.isWeekly ? `<p style="font-size:0.8em; color:#3498db; text-align:center; margin:10px 0; font-style:italic;">* Stai modificando una singola data di un appuntamento fisso.</p>` : ''}

            <div class="action-buttons" style="margin-top: 25px; display: flex; width: 100%; align-items: center;">
                <button class="btn-cancel" onclick="document.getElementById('appointment-details-overlay').remove()" style="flex: 1; background: transparent; border: none; color: #666; font-size: 0.9em; font-weight: 600; cursor: pointer; text-transform: uppercase;">Chiudi</button>
                <button class="btn-save" id="save-appointment-changes" disabled onclick="saveAppointmentChanges()" style="flex: 1; background: transparent; color: #8A9A5B; border: none; padding: 12px; font-weight: 700; text-transform: uppercase;">Salva</button>
            </div>
        </div>
    `;
    openPopup(overlay);

    document.getElementById('edit-time-btn').addEventListener('click', function() {
        this.style.display = 'none';
        document.getElementById('edit-slots-section').classList.remove('hidden');

        if (editAppState.isIndispo) {
            document.getElementById('save-appointment-changes').disabled = false;
        } else {
            generateEditDayPills();
            const currentDayPill = document.querySelector(`#edit-days-row .day-pill[data-iso="${editAppState.currentDate}"]`);
            if (currentDayPill) currentDayPill.classList.add('active');
            refreshEditSlots();
        }
    });

    // Gestione chiusura popup
    overlay.querySelector('.btn-cancel').addEventListener('click', () => closeAllPopupsAndRedirect(renderBarberDashboardPage, true));
}

function generateEditDayPills() {
    const container = document.getElementById('edit-days-row');
    const availableDates = getBookingDays(cachedAppData.settings, cachedAppData.workingHours);
    container.innerHTML = availableDates.map(d => {
        const isoDate = d.toISOString().split('T')[0];
        return getDayPillHtml(d, 'selectEditDay').replace('data-label', `data-iso="${isoDate}" data-label`);
    }).join('');
}

function selectEditDay(el, isoDate) {
    document.querySelectorAll('#edit-days-row .day-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    editAppState.currentDate = isoDate;
    editAppState.selectedSlot = null;
    document.getElementById('save-appointment-changes').disabled = true;
    renderEditBarberColumns();
}

function refreshEditSlots() {
    const container = document.getElementById('edit-barbers-columns');
    container.innerHTML = '<div class="spinner" style="margin: 20px auto; width:25px; height:25px; border-width:3px;"></div>';
    google.script.run
        .withSuccessHandler(res => {
            editAppState.allSlots = Array.isArray(res) ? res : (res && res.slots ? res.slots : []);
            renderEditBarberColumns();
        })
        .withFailureHandler(err => {
            console.error("Errore slot modifica:", err);
            document.getElementById('edit-barbers-columns').innerHTML = `<p style="color:red; font-size:0.8em;">Errore caricamento orari.</p>`;
        })
        .getAvailableSlots(editAppState.serviceDuration, editAppState.serviceName, editAppState.clientEmail);
}

function renderEditBarberColumns() {
    const container = document.getElementById('edit-barbers-columns');
    if (!editAppState.allSlots || !editAppState.currentDate) return;
    const filteredSlots = editAppState.allSlots.filter(s => s.dateKey === editAppState.currentDate);
    container.innerHTML = getBarberColumnsHtml(
        filteredSlots,
        editAppState.currentDate,
        cachedAppData.barbers,
        'selectEditSlot'
    );
}

function selectEditSlot(el, iso, barberId, formatted, time, barberName) {
    document.querySelectorAll('#edit-barbers-columns .time-slot').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    editAppState.selectedSlot = { iso, barberId, formatted, time, barberName };
    document.getElementById('save-appointment-changes').disabled = false;
}

function saveAppointmentChanges(force = false, conflictPayload = null) {
    const btn = document.getElementById('save-appointment-changes');

    if (editAppState.isIndispo) {
        let startIso, endIso, note;

        if (conflictPayload) {
            // Se stiamo forzando dopo un conflitto, usiamo i dati salvati nel payload
            startIso = conflictPayload.startIso;
            endIso = conflictPayload.endIso;
            note = conflictPayload.note;
        } else {
            // Altrimenti, leggiamo i valori freschi dagli input
            const date = document.getElementById('edit-indispo-date').value;
            const start = document.getElementById('edit-indispo-start').value;
            const end = document.getElementById('edit-indispo-end').value;
            note = document.getElementById('edit-indispo-note').value.trim();
            if (!date || !start || !end) { showCustomAlert("Attenzione", "Compila tutti i campi."); return; }
            startIso = new Date(`${formatDateToIso(date)}T${start.trim()}:00`).toISOString();
            endIso = new Date(`${formatDateToIso(date)}T${end.trim()}:00`).toISOString();
        }

        if (btn && !force) showButtonSpinner(btn);
        google.script.run.withSuccessHandler(res => {
            if (res.status === "OK") {
                showCustomAlert("Fatto", "Impegno modificato correttamente.");
                // Chiudi tutti i popup e reindirizza alla dashboard home, aggiornando i dati
                closeAllPopupsAndRedirect(refreshDashboardData, true);
            } else if (res.status === "CONFLICT") {
                btn.innerText = "Salva"; btn.disabled = false;
                // Salviamo i valori correnti prima di mostrare il popup di conflitto
                // perché il contenuto del popup verrà sostituito.
                const conflictPayload = {
                    startIso: startIso,
                    endIso: endIso,
                    note: note
                };
                showIndispoConflictPopup(res.conflicts, () => saveAppointmentChanges(true, conflictPayload));
            } else {
                if (btn && !force) hideButtonSpinner(btn);
                showCustomAlert("Errore", res.message || "Impossibile salvare l'impegno.");
            }
        }).updateIndisponibilita(editAppState.bookingId, startIso, endIso, note, force);
        return;
    }

    if (!editAppState.selectedSlot) return;
    if (btn) showButtonSpinner(btn);

    const newStart = new Date(editAppState.selectedSlot.iso);
    const newEnd = new Date(newStart.getTime() + editAppState.serviceDuration * 60000);

    google.script.run
        .withSuccessHandler(res => {
            if (res && res.status === "OK") {
                showCustomAlert("Aggiornato", "Appuntamento spostato correttamente.");
                // Chiudi tutti i popup e reindirizza alla dashboard home, aggiornando i dati
                closeAllPopupsAndRedirect(refreshDashboardData, true);
            } else {
                if (btn) hideButtonSpinner(btn);
                showCustomAlert("Errore", res.message || "Impossibile salvare.");
            }
        })
        .withFailureHandler(err => { if (btn) hideButtonSpinner(btn); showCustomAlert("Errore", "Errore di connessione: " + err); })
        .updateAppointment(
            editAppState.bookingId,
            newStart.toISOString(),
            newEnd.toISOString(),
            editAppState.serviceName,
            editAppState.clientEmail,
            editAppState.selectedSlot.barberId
        );
}