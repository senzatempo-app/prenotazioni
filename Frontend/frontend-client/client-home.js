/**
 * Logica e Rendering della pagina Home principale
 */

/**
 * Genera l'HTML per il modulo di registrazione del cliente.
 * @returns {string} La stringa HTML del modulo.
 */
function getRegistrationFormHtml() {
  return `
    <img src="./Frontend/assets/logo-full-maskable.png" alt="Logo" style="width: 280px; margin: 0 auto 20px; display: block;">
    <p style="text-align: center; color: #666; margin-bottom: 20px;">Accedi per iniziare a prenotare il tuo appuntamento.</p>
    <input type="text" id="userName" name="first-name" placeholder="Nome" autocomplete="given-name" required onkeydown="if(event.key === 'Enter') saveClientUser()">
    <input type="text" id="userSurname" name="last-name" placeholder="Cognome" autocomplete="family-name" required onkeydown="if(event.key === 'Enter') saveClientUser()">
    <input type="tel" id="userPhone" name="phone" placeholder="Telefono" autocomplete="tel" required onkeydown="if(event.key === 'Enter') saveClientUser()">
    <input type="email" id="userEmail" name="email" placeholder="Email" autocomplete="email" required onkeydown="if(event.key === 'Enter') saveClientUser()">
    <button class="login-button" onclick="saveClientUser()">Accedi</button>
  `;
}

/**
 * Logica e Rendering della pagina di Registrazione Clienti
 */
function renderRegistrationPage(skipPush = false) {
  window.scrollTo(0, 0);
  if (!skipPush) pushView('registration');

  // Se i dati sono già in cache (caricati da window.onload), mostriamo subito la UI
  if (cachedAppData && cachedAppData.settings) {
    const settings = cachedAppData.settings;
    document.title = settings.BUSINESS_NAME || 'Il Tuo Business';
    appContainer.innerHTML = `<div id="registration-screen" class="full-screen"><div class="registration-content">${getRegistrationFormHtml()}</div></div>`;
    return;
  }

  appContainer.innerHTML = `<div class="loading-container"><div class="spinner"></div></div>`;

  google.script.run
    .withFailureHandler(showNetworkError)
    .withSuccessHandler(settings => {
      document.title = settings.BUSINESS_NAME || 'Il Tuo Business';
      appContainer.innerHTML = `<div id="registration-screen" class="full-screen"><div class="registration-content">${getRegistrationFormHtml()}</div></div>`;
    }).getSettings();
}

function saveClientUser() {
  const nome = document.getElementById('userName').value.trim();
  const cognome = document.getElementById('userSurname').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const telefono = document.getElementById('userPhone').value.trim();

  if (!nome || !cognome || !email || !telefono || !email.includes('@')) {
    showCustomAlert("Dati mancanti", "Per favore, compila tutti i campi obbligatori.");
    return;
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    showCustomAlert("Email non valida", "Per favore, inserisci un'email valida.");
    return;
  }

  appContainer.innerHTML = `<div class="loading-container"><div class="spinner"></div></div>`;

  google.script.run.withSuccessHandler(serverUser => {
    userData = serverUser;
    localStorage.setItem('client_user', JSON.stringify(serverUser));
    // Dopo aver ottenuto i dati dell'utente, carichiamo i dati completi dell'app
    // prima di renderizzare la home page.
    google.script.run
      .withSuccessHandler(data => {
        cachedAppData = data;
        renderHomePage();
      })
      .withFailureHandler(showNetworkError) // Mostra un errore di rete se il caricamento dati fallisce
      .getAppInitData(serverUser.email);
  }).withFailureHandler(err => {
    showCustomAlert("Errore registrazione", "Dettaglio errore: " + err, () => {
      renderRegistrationPage();
    });
  }).registerOrUpdateUser({ nome: capitalizeFirst(nome), cognome: capitalizeFirst(cognome), email, telefono });
}

function renderHomePage(skipPush = false, skipAnimation = false) {
  window.scrollTo(0, 0);
  if (!skipPush) pushView('home');
  // Funzione interna per il rendering effettivo della UI
  const displayUI = (data) => {
    cachedAppData = data;
    const animClass = skipAnimation ? '' : 'fade-in';

    const settings = data.settings;
    document.title = settings.BUSINESS_NAME || 'Il Tuo Business';
    const bookings = Array.isArray(data.userBookings)
      ? data.userBookings
      : (data.userBookings && Array.isArray(data.userBookings.data) 
          ? data.userBookings.data 
          : []);

    appContainer.innerHTML = `
          <div id="home-screen" class="full-screen">
            <div class="fixed-header">
              <button onclick="showAccountPopup()" title="Il mio profilo" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); border: none; background: transparent; color: #8A9A5B; display: flex; align-items: center; justify-content: center; width: 55px; height: 55px; cursor: pointer;">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </button>
              <img src="./Frontend/assets/logo-name-maskable.png" alt="Logo" style="height: 45px; width: auto;">
              <button onclick="confirmLogout(renderHomePage)" title="Logout" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); border: none; background: transparent; color: #dc3545; display: flex; align-items: center; justify-content: center; width: 55px; height: 55px; cursor: pointer;">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            </div>
            <div class="home-content">
              <div class="booking-container">
                <h2 class="${animClass} hidden" style="margin-bottom: 25px;">Ciao, ${userData.nome}!</h2>
                <div id="next-appointment-container" class="hidden" style="margin-bottom: 15px;"></div>
                <p id="home-subtitle" class="${animClass} hidden" style="text-align: center; color: #666; margin-bottom: 15px;"></p>
                
                <div class="home-buttons ${animClass}" style="${skipAnimation ? '' : 'animation-delay: 0.2s; opacity: 0;'} display: flex; flex-direction: column; gap: 15px;">
                  <button class="main-opt-btn" onclick="renderPrenotazionePage()">
                    <div style="margin-bottom: 10px; color: #8A9A5B;">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
                    </div>
                    NUOVA PRENOTAZIONE
                  </button>
                  
                  <button class="main-opt-btn" onclick="fetchUserBookings()">
                    <div style="margin-bottom: 10px; color: #8A9A5B;">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                    </div>
                    I MIEI APPUNTAMENTI
                  </button>

                  <button class="main-opt-btn" onclick="renderContattiPage()">
                    <div style="margin-bottom: 10px; color: #8A9A5B;">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </div>
                    CONTATTI
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
    const greetingHeader = document.querySelector("#home-screen h2");
    if (greetingHeader) {
      greetingHeader.classList.remove("hidden");
    }

    const now = Date.now();
    const futureBookings = (bookings || []).filter(b => {
      const status = (b.stato || '').toString().trim();
      const isVisibleStatus = status === 'Confermato' || status === 'Richiesta cancellazione' || status.toLowerCase() === 'weekly' || status.toLowerCase() === 'w e e k l y' || status.toLowerCase() === 'weekly ';
      return isVisibleStatus && (b.timestamp || 0) >= now;
    });
    // Ordina gli appuntamenti futuri dal più vicino al più lontano e prendi il primo
    const sortedFutureBookings = futureBookings.sort((a, b) => a.timestamp - b.timestamp);
    const next = sortedFutureBookings.length > 0 ? sortedFutureBookings[0] : null;

    const subtitle = document.getElementById('home-subtitle');
    const nextContainer = document.getElementById('next-appointment-container');

    if (next) {
      if (nextContainer) {
        nextContainer.classList.remove('hidden');
        nextContainer.innerHTML = ` 
              <div id="next-appointment-card-actual" class="next-appointment-card" style="background-image: linear-gradient(to right, #1a1a1a 60%, rgba(26, 26, 26, 0.4) 75%, transparent 100%), url('${next.imageUrl || ''}')">
                <div class="next-content-left ${animClass}">
                  <span class="next-label">Il tuo prossimo appuntamento</span>
                  <div class="next-details">${next.servizio.replace(/_/g, ' ')}</div>
                  <div class="next-date">${next.data}</div>
                  <div class="next-date">Ore ${next.oraInizio}</div>
                  ${next.stato === 'Richiesta cancellazione' ? '<div class="status-badge cancellation-requested" style="margin-top: 10px; font-size: 0.8em; text-transform: uppercase; font-weight: 700;">RICHIESTO ANNULLAMENTO</div>' : ''}
                </div>
              </div>
            `;
        // Applica l'animazione fade-in dopo che l'elemento è nel DOM
        const actualCard = document.getElementById('next-appointment-card-actual');
        if (actualCard) {
          void actualCard.offsetHeight; // Forza un reflow del browser
          if (!skipAnimation) {
            actualCard.classList.add('fade-in');
            actualCard.style.animationDelay = '0.15s'; // Imposta un ritardo per l'animazione
          }
        }
      }
      if (subtitle) subtitle.classList.add('hidden');
    } else if (subtitle) {
      if (nextContainer) nextContainer.classList.add('hidden');
      subtitle.innerText = "Non hai appuntamenti in programma.";
      subtitle.classList.remove('hidden');
      subtitle.style.opacity = "1";
    }
  };

  // Se abbiamo già i dati in cache, renderizziamo subito!
  if (cachedAppData) {
    displayUI(cachedAppData);
    return;
  }

  // Se un pre-caricamento è già attivo (es. dopo una prenotazione), non avviamone un altro
  if (isFetchingInitData) {
    appContainer.innerHTML = `
          <div class="loading-container" id="home-prefetch-waiter">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center;">
              <div class="spinner"></div>
              <p style="color: #8A9A5B; font-weight: bold; margin: 0;">Aggiornamento in corso...</p>
            </div>
          </div>`;
    return;
  }

  // Altrimenti carichiamo tutto dal server
  isFetchingInitData = true;
  appContainer.innerHTML = `<div class="loading-container"><div style="display: flex; flex-direction: column; align-items: center;"><div class="spinner"></div></div></div>`;
  google.script.run
    .withFailureHandler(showNetworkError)
    .withSuccessHandler(data => {
      isFetchingInitData = false;
      displayUI(data);
    }).getAppInitData(userData.email);
}

/**
 * Mostra il popup con i dati dell'account
 */
function showAccountPopup() {
  const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; align-items: center; text-align: left;">
        <input type="text" id="editNome" value="${userData.nome}" placeholder="Nome" autocomplete="given-name">
        <input type="text" id="editCognome" value="${userData.cognome}" placeholder="Cognome" autocomplete="family-name">
        <input type="tel" id="editPhone" value="${userData.telefono}" placeholder="Telefono" autocomplete="tel">
        <input type="email" id="editEmail" value="${userData.email}" placeholder="Email" autocomplete="email">
      </div>
  `;
  const actionsHtml = `
    <button class="popup-action-secondary" id="cancel-profile-btn">Annulla</button>
    <button class="popup-action-main" id="saveProfileBtn" style="color: #8A9A5B;">Salva</button>
  `;
  const overlay = createPopup('account-overlay', '<span style="color: #8A9A5B;">Il mio Profilo</span>', contentHtml, actionsHtml);

  document.getElementById('cancel-profile-btn').onclick = () => closeAllPopupsAndRedirect(renderHomePage, true);
  document.getElementById('saveProfileBtn').onclick = () => saveUpdatedUser();
}

/**
 * Salva le modifiche dell'utente sia localmente che sul server
 */
function saveUpdatedUser() {
  const btn = document.getElementById('saveProfileBtn');
  const oldEmail = userData.email;

  const updatedData = {
    nome: capitalizeFirst(document.getElementById('editNome').value),
    cognome: capitalizeFirst(document.getElementById('editCognome').value),
    telefono: normalizePhone(document.getElementById('editPhone').value),
    email: document.getElementById('editEmail').value.trim()
  };

  if (!updatedData.nome || !updatedData.cognome || !updatedData.email || !updatedData.telefono) {
    showCustomAlert("Attenzione", "Tutti i campi sono obbligatori.");
    return;
  }

  showButtonSpinner(btn);

  google.script.run.withSuccessHandler((res) => {
    if (res && res.status === "OK") {
      // Aggiorna stato locale
      userData = updatedData;
      localStorage.setItem('client_user', JSON.stringify(userData));
      cachedAppData = null; // Forza ricaricamento dati

      // Chiudi il popup e ricarica la home in modo "silenzioso" per mostrare le modifiche.
      closeAllPopupsAndRedirect(renderHomePage, true);
    } else if (res && res.message) {
      hideButtonSpinner(btn);
      showCustomAlert("Errore", res.message);
    } else {
      hideButtonSpinner(btn);
      showCustomAlert("Errore", "Errore durante l'aggiornamento. Riprova.");
    }
  }).updateClientData(oldEmail, updatedData);
}

/**
 * Rendering della pagina Contatti
 */
function renderContattiPage(skipPush = false) {
  window.scrollTo(0, 0);
  if (!skipPush) pushView('contatti');
  // Usiamo i dati caricati in Home per velocizzare il passaggio
  if (!cachedAppData) { renderHomePage(); return; }

  const settings = cachedAppData.settings;
  const barbers = cachedAppData.barbers;

  let barbersHtml = '';
  for (const id in barbers) {
    const b = barbers[id];
    const bPhoto = b.foto || `https://via.placeholder.com/200/8A9A5B/ffffff?text=${b.nome.charAt(0)}`;
    const waLink = b.telefono ? `https://wa.me/${b.telefono.toString().replace(/\D/g, '')}` : '#';
    barbersHtml += `
          <a href="${waLink}" target="_blank" class="barber-contact-card">
            <img src="${bPhoto}" class="barber-card-img" alt="${b.nome}">
            <div class="barber-card-info">
              <div class="barber-card-name">${b.nome}</div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </div>
          </a>`;
  }

  appContainer.innerHTML = `
        <div id="contatti-screen" class="full-screen">
          <div class="fixed-header">
            <button onclick="renderHomePage()" class="header-back-btn">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <h2>CONTATTI</h2>
          </div>
          <div class="home-content">
            <div class="booking-container" style="max-width: 800px;">
              <div class="booking-card fade-in" style="align-items: flex-start; text-align: left;">
                
                <div style="font-weight: 800; font-size: 1.4em; color: #1a1a1a; width: 100%; text-align: center;">${settings.BUSINESS_NAME || 'Il Tuo Business'}</div>
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.BUSINESS_ADDRESS || '')}" target="_blank" style="color: #666; margin-top: 20px; text-decoration: none; display: flex; align-items: flex-start;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-top: 3px; margin-right: 5px; flex-shrink: 0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <span>${settings.BUSINESS_ADDRESS || 'Indirizzo non disponibile'}</span>
                </a>
                <a href="tel:${settings.CONTACT_PHONE || ''}" style="color: #666; margin-top: 15px; text-decoration: none; display: flex; align-items: flex-start;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-top: 3px; margin-right: 5px; flex-shrink: 0;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    <span>${settings.CONTACT_PHONE || ''}</span>
                </a>
                <a href="mailto:${settings.CONTACT_EMAIL || ''}" style="color: #666; margin-top: 15px; text-decoration: none; display: flex; align-items: flex-start;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-top: 3px; margin-right: 5px; flex-shrink: 0;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    <span>${settings.CONTACT_EMAIL || ''}</span>
                </a>
              </div>

              <div class="fade-in" style="animation-delay: 0.1s; opacity: 0; width: 100%; text-align: center;">
                <div class="card-title">I nostri Barbieri</div>
                <div class="barbers-grid-contact">
                  ${barbersHtml}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
}