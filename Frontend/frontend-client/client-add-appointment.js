/**
 * Logica e Rendering della nuova pagina di Prenotazione Classica
 */
let bookingState = {
  service: null,
  day: null,
  slot: null,
  allSlots: null // NULL indica che non abbiamo ancora caricato gli orari per il servizio scelto
};

function renderPrenotazionePage(skipPush = false) {
    window.scrollTo(0, 0);
    if (!skipPush) pushView('prenotazione');
    // Usiamo i dati caricati in Home per velocizzare il passaggio
    if (!cachedAppData) { renderHomePage(); return; }

    const settings = cachedAppData.settings;
    const workingHours = cachedAppData.workingHours;

        bookingState.service = null;
        bookingState.day = null;
        bookingState.slot = null;

        appContainer.innerHTML = `
          <div id="prenotazione-screen" class="full-screen">
            <div class="fixed-header">
              <button onclick="renderHomePage()" class="header-back-btn">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <h2>NUOVA PRENOTAZIONE</h2>
            </div>
            <div class="home-content">
              <div class="booking-container">

                <!-- Step 1: Servizi -->
                <div id="client-step-service" class="booking-card fade-in">
                  <div class="card-title">1. Scegli il servizio</div>
                  <div id="services-grid" class="services-scroll">
                    <div class="spinner" style="width:30px; height:30px; border-width:3px;"></div>
                  </div>
                </div>

                <!-- Step 2: Giorno (nascosta inizialmente) -->
                <div id="client-step-day" class="booking-card fade-in hidden">
                  <div class="card-title">2. Scegli il giorno</div>
                  <div id="month-label" style="font-size: 1.1em; font-weight: 700; color: #1a1a1a; margin-bottom: 15px; transition: opacity 0.4s ease, transform 0.4s ease; transform: translateX(0);"></div>
                  <div id="days-row" class="days-scroll">
                    <!-- Generato via JS -->
                  </div>
                </div>

                <!-- Step 3: Orari -->
                <div id="client-step-slots" class="booking-card fade-in hidden">
                  <div class="card-title">3. Seleziona l'orario</div>
                  <div id="barbers-columns" class="barbers-grid">
                    <!-- Generato via JS -->
                  </div>
                </div>

              </div>
            </div>

            <!-- Footer fisso con tasto prenota -->
            <div class="cta-container fade-in">
              <button id="main-book-btn" class="confirm hidden" style="width:100%; max-width:400px; padding:18px; border-radius:35px; border:none; background:#8A9A5B; color:white; pointer-events: auto;" onclick="handleFinalBooking()">
                Conferma
              </button>
            </div>
          </div>
        `;
        initBookingUI();
  }

  function initBookingUI() {
    generateDayPills();

    const container = document.getElementById('services-grid');
    if (!container) return;
    container.innerHTML = cachedAppData.services.map(s => {
      const formattedName = s.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const imageUrl = s.imageUrl || "https://via.placeholder.com/150/1a1a1a/ffffff?text=" + formattedName.split(' ')[0];
      return `
        <div class="service-card" onclick="selectService(this, '${s.name}', ${s.duration})" style="background-image: url('${imageUrl}')">
          <div class="service-name">${formattedName}</div>
        </div>`;
    }).join('');
  }

  function generateDayPills() {
    const container = document.getElementById('days-row');
    const monthLabel = document.getElementById('month-label');
    const availableDates = getBookingDays(cachedAppData.settings, cachedAppData.workingHours);

    if (availableDates.length > 0) {
        monthLabel.innerText = getMonthLabel(availableDates[0]);
    }
    container.innerHTML = availableDates.map(d => getDayPillHtml(d, 'selectDay')).join('');
    // Listener per il cambio mese/anno in dissolvenza durante lo scorrimento
    container.addEventListener('scroll', () => {
      const pills = container.querySelectorAll('.day-pill');
      const containerRect = container.getBoundingClientRect();
      let detectedLabel = "";
      const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

      for (let pill of pills) {
        const rect = pill.getBoundingClientRect();
        // Determina il mese basandosi sulla prima pillola visibile a sinistra
        if (rect.left >= containerRect.left - 20) {
          detectedLabel = pill.getAttribute('data-label');
          break;
        }
      }

      if (detectedLabel && detectedLabel !== monthLabel.innerText && !monthLabel.classList.contains('fading')) {
        monthLabel.classList.add('fading');
        
        const [oldMonth, oldYear] = monthLabel.innerText.split(' ');
        const [newMonth, newYear] = detectedLabel.split(' ');
        // Determina la direzione (avanti o indietro nel tempo)
        const isNext = (newYear > oldYear) || (newYear === oldYear && months.indexOf(newMonth) > months.indexOf(oldMonth));

        // Animazione di uscita: il vecchio mese si dissolve e scivola via
        monthLabel.style.opacity = '0';
        monthLabel.style.transform = isNext ? 'translateX(-20px)' : 'translateX(20px)';
        
        setTimeout(() => {
          monthLabel.innerText = detectedLabel;
          // Reset posizione per l'entrata dall'altro lato (senza transizione)
          monthLabel.style.transition = 'none';
          monthLabel.style.transform = isNext ? 'translateX(20px)' : 'translateX(-20px)';
          monthLabel.offsetHeight; // Trigger reflow per applicare il reset istantaneo
          // Animazione di entrata: torna al centro e ricompare
          monthLabel.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
          monthLabel.style.opacity = '1';
          monthLabel.style.transform = 'translateX(0)';
          setTimeout(() => monthLabel.classList.remove('fading'), 400);
        }, 400);
      }
    });
  }

  function selectService(el, name, duration) {
    document.querySelectorAll('.service-card').forEach(p => p.classList.remove('active'));
    el.classList.add('active');

    // Centra la card orizzontalmente nello scroll dello schermo
    el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

    // Se cambiamo servizio, dobbiamo resettare lo slot precedentemente selezionato
    bookingState.slot = null; // Reset dello slot selezionato
    bookingState.allSlots = null; // Svuota la cache degli slot del vecchio servizio
    document.getElementById('main-book-btn').classList.add('hidden'); // Nascondi il bottone di prenotazione
    document.getElementById('client-step-day').classList.remove('hidden'); // Mostra la card dei giorni

    // Se un giorno è già selezionato, mostriamo lo spinner nella card orari per indicare il caricamento
    if (bookingState.day) {
        document.getElementById('client-step-slots').classList.remove('hidden');
        document.getElementById('barbers-columns').innerHTML = '<div class="spinner" style="margin: 30px auto; width:30px; height:30px; border-width:3px;"></div>';
    } else {
        document.getElementById('client-step-slots').classList.add('hidden');
    }

    bookingState.service = { name, duration };

    // Avviamo subito il caricamento di tutti gli slot per il servizio scelto
    refreshSlots();
  }

  function selectDay(el, isoDate) {
    document.querySelectorAll('.day-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    bookingState.day = isoDate;
    document.getElementById('client-step-slots').classList.remove('hidden'); // Mostra la card degli orari
    document.getElementById('main-book-btn').classList.add('hidden'); // Nascondi il bottone di prenotazione
    bookingState.slot = null; // Reset dello slot selezionato

    // Ora che abbiamo il giorno, filtriamo gli slot già caricati
    if (bookingState.allSlots) {
        renderBarberColumns();
    } else {
        const container = document.getElementById('barbers-columns');
        container.innerHTML = '<div class="spinner" style="margin: 30px auto; width:30px; height:30px; border-width:3px;"></div>';
    }
  }

  function refreshSlots() {
    const container = document.getElementById('barbers-columns');
    const card = document.getElementById('client-step-slots');
    const bookBtn = document.getElementById('main-book-btn');

    // Se abbiamo già caricato tutti gli slot per questo servizio, non chiamiamo il server di nuovo
    // e procediamo direttamente al rendering degli slot per il giorno selezionato.
    if (bookingState.allSlots && bookingState.day) {
        renderBarberColumns();
        return;
    }

    // Sicurezza: se manca il servizio, non possiamo caricare gli slot
    if (!bookingState.service) {
        if (card) card.classList.add('hidden'); // Nascondi la card degli orari
        if (bookBtn) bookBtn.classList.add('hidden'); // Nascondi il bottone di prenotazione
      return;
    }

    bookBtn.classList.add('hidden');
    bookingState.slot = null;

    if (bookingState.day) {
        card.classList.remove('hidden');
        container.innerHTML = '<div class="spinner" style="margin: 30px auto; width:30px; height:30px; border-width:3px;"></div>';
    }

    google.script.run
      .withFailureHandler(err => {
        console.error("Errore caricamento slot:", err);
        container.innerHTML = `<p style="width:100%; text-align:center; color:#dc3545;">Errore durante la ricerca: ${err}</p>`;
      })
      .withSuccessHandler(res => {
        // Memorizziamo tutti gli slot per il servizio selezionato
        bookingState.allSlots = Array.isArray(res) ? res : (res && res.slots ? res.slots : []);
        
        // Se un giorno è già stato selezionato, renderizziamo subito le colonne
        if (bookingState.day) renderBarberColumns();
      }).getAvailableSlots(bookingState.service.duration, bookingState.service.name, userData.email);
  }

  function renderBarberColumns() {
    const container = document.getElementById('barbers-columns');
    container.innerHTML = getBarberColumnsHtml(
        bookingState.allSlots,
        bookingState.day,
        cachedAppData.barbers, // Passiamo tutti i barbieri
        'selectSlot'
    );
  }

  function selectSlot(el, iso, barberId, formatted, time, barberName) {
    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    bookingState.slot = { iso, barberId, formatted, time, barberName };
    
    const bookBtn = document.getElementById('main-book-btn');
    bookBtn.classList.remove('hidden'); // Mostra il tasto al click sullo slot
  }

  function handleFinalBooking() {
    const btn = document.getElementById('main-book-btn');
    showButtonSpinner(btn);

    google.script.run
      .withFailureHandler(err => {
        console.error("Errore invio prenotazione:", err);
        // In caso di errore di rete, mostra un avviso e al "Chiudi" ricarica la pagina di prenotazione.
        showCustomAlert("Errore di Rete", "Impossibile contattare il server: " + err, () => {
            renderPrenotazionePage(true); // Ricarica la pagina da zero
        });
      })
      .withSuccessHandler((res) => {
        if (res && res.status === "OK") {
          // Se il backend restituisce la lista aggiornata degli appuntamenti,
          // la usiamo per aggiornare la cache locale, garantendo che la home page
          // mostri subito il nuovo appuntamento.
          if (res.updatedBookings && cachedAppData) {
            cachedAppData.userBookings = res.updatedBookings;
          }
          cachedAppData = null;
          isFetchingInitData = true; 
          google.script.run
            .withSuccessHandler(data => {
              console.log("[Prefetch] Dati Home precaricati con successo");
              cachedAppData = data;
              isFetchingInitData = false; // Imposta a false dopo che i dati sono stati recuperati
              // Se l'utente ha già premuto "Home" ed è nello stato di attesa, rinfresca la UI
              if (document.getElementById('home-prefetch-waiter')) {
                renderHomePage();
              }
            })
            .withFailureHandler(() => { isFetchingInitData = false; })
            .getAppInitData(userData.email);
          closeAllPopupsAndRedirect(); // Chiudi tutti i popup prima di renderizzare la schermata di successo
          appContainer.innerHTML = `
            <div class="success-container">
              <div style="margin-bottom: 20px; color: #8A9A5B;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <h2 style="margin-bottom: 20px;">Prenotazione Confermata!</h2>
              <p style="font-weight: bold; font-size: 1.25em; color: #1a1a1a; text-transform: capitalize; margin-bottom: 2px;">${bookingState.service.name.replace(/_/g, ' ')}</p>
              <p style="font-weight: bold; font-size: 1.25em; color: #1a1a1a; text-transform: capitalize; margin-bottom: 2px;">${bookingState.slot.formatted}</p>
              <p style="font-weight: bold; font-size: 1.25em; color: #1a1a1a; margin-bottom: 2px;">Ore ${bookingState.slot.time}</p>
              <p style="font-size: 0.9em; color: #666; margin-bottom: 15px;">Barbiere: ${bookingState.slot.barberName}</p>
              <p style="margin-bottom: 10px; margin-top: 20px;">Troverai tutti i dettagli nei tuoi appuntamenti.</p>
              <button onclick="renderHomePage()" style="background: transparent; color: #8A9A5B; border: none; font-weight: 700; text-transform: uppercase; margin-top: 30px; width: 100%; cursor: pointer; padding: 15px;">Chiudi</button>
            </div>
          `;
        } else if (res && res.status === "SLOT_OCCUPIED") {
          // Se lo slot è occupato, avvisa l'utente e ricarica la pagina di prenotazione.
          showCustomAlert("Orario non disponibile", "Questo orario è stato appena prenotato. Scegli un altro slot.", () => {
              renderPrenotazionePage(true); // Ricarica la pagina da zero
          });
        } else {
          // Per qualsiasi altro errore, avvisa e ricarica la pagina.
          showCustomAlert("Errore", res.message || "Si è verificato un errore.", () => renderPrenotazionePage(true));
        }
      }).processBooking(userData, bookingState.slot.iso, bookingState.service.name, bookingState.service.duration, bookingState.slot.barberId);
  }