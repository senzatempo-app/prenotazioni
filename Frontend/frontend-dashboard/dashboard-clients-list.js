/**
 * Logica e Rendering della pagina "Lista Clienti" per il barbiere.
 */
function renderBarberClientsListPage(skipPush = false) {
    window.scrollTo(0, 0);
    if (!skipPush) pushView('clients-list');
    appContainer.innerHTML = `
        <div id="barber-clients-list-screen" class="full-screen">
            <div class="fixed-header">
                <button onclick="saveDashboardScroll(); renderBarberDashboardPage();" class="header-back-btn">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <h2>LISTA CLIENTI</h2>
            </div>
            <div class="home-content">
                <div class="booking-container">
                    <div class="booking-card fade-in">
                        <div class="card-title" id="client-list-card-title">Ricerca e Gestione</div>
                        <div id="search-container-list" style="display: flex; gap: 10px; width: 100%; align-items: center;">
                            <input type="text" id="client-list-search" placeholder="Cerca per nome o telefono..." oninput="filterClientsList(this.value)" style="flex-grow: 1; margin: 0; height: 45px;">
                            <button id="btn-new-client-plus-list" onclick="showNewClientFormForList()" style="width: 45px; height: 45px; padding: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #ccc; border-radius: 50%; color: #8A9A5B; background: white;" title="Nuovo Cliente">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                        </div>

                        <div id="new-client-fields-list" class="hidden" style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px; width: 100%;">
                            <p id="list-new-client-error" style="color: #dc3545; text-align: center; margin-bottom: 5px; display: none; font-size: 0.9em;"></p>
                            <input type="text" id="list-newC-nome" placeholder="Nome">
                            <input type="text" id="list-newC-cognome" placeholder="Cognome">
                            <input type="tel" id="list-newC-tel" placeholder="Telefono">
                            <input type="email" id="list-newC-email" placeholder="Email">
                            <div style="display: flex; width: 100%; margin-top: 15px;">
                                <button onclick="hideNewClientFormForList()" style="flex: 1; border: none; background: transparent; color: #666; font-size: 0.9em; font-weight: 600; text-transform: uppercase; cursor: pointer;">Annulla</button>
                                <button onclick="saveNewClientFromList(this)" style="flex: 1; background: transparent; color: #8A9A5B; border: none; font-weight: 700; text-transform: uppercase; cursor: pointer;">Salva</button>
                            </div>
                        </div>
                    </div>

                    <div id="clients-count" style="font-size: 0.85em; color: #888; margin: -10px 0 5px 5px; font-weight: 600;"></div>

                    <div id="clients-list-container" class="fade-in" style="display: flex; flex-direction: column; gap: 6px;">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Usa dati dalla cache globale per caricamento istantaneo
    window.allClientsData = cachedAppData.clients || [];
    renderClientsCards(window.allClientsData);
}

function renderClientsCards(clients) {
    const container = document.getElementById('clients-list-container');
    const countEl = document.getElementById('clients-count');

    if (countEl) countEl.innerText = clients ? `${clients.length} clienti in lista` : "0 clienti";

    if (!clients || clients.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999;">Nessun cliente trovato.</p>';
        return;
    }

    container.innerHTML = clients.map(c => `
        <div class="booking-card" style="flex-direction: row; justify-content: space-between; align-items: center; padding: 8px 15px; margin-bottom: 0;">
            <div>
                <div style="font-weight: 700; color: #1a1a1a;">${c.nome} ${c.cognome}</div>
                <div style="font-size: 0.85em; color: #666;">${c.telefono}</div>
                <div style="font-size: 0.8em; color: #888;">${c.email.includes('@barber.it') ? 'No Email' : c.email}</div>
                <div style="font-size: 0.8em; color: #888;">Durata Taglio: ${c.cutTime} min</div>
            </div>
                        <div style="display: flex; gap: 12px; align-items: center;">
                <a href="https://wa.me/${c.telefono.toString().replace(/\D/g, '')}" target="_blank" style="color: #25D366; display: flex;"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>
                <a href="tel:${c.telefono}" style="color: #666; display: flex;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></a>
                <button onclick="showEditClientPopup('${c.id}')" style="border:none; background:none; padding:0; color: #555; cursor:pointer; display:flex;" title="Modifica dati">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button onclick="confirmRemoveClient('${c.id}', '${c.nome} ${c.cognome}')" style="border:none; background:none; padding:0; color:#dc3545; cursor:pointer; display:flex;" title="Elimina cliente">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        </div>
    `).join('');
}

function showEditClientPopup(clientId) {
    const client = window.allClientsData.find(c => c.id === clientId);
    if (!client) return;

    const overlay = document.createElement('div');
    overlay.id = 'edit-client-overlay';
    overlay.className = 'popup-overlay';

    overlay.innerHTML = `
        <div class="booking-card fade-in" style="width: 90%; max-width: 450px; background: white; padding: 25px; align-items: center; text-align: center; border: none; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
            <h2 style="margin-bottom: 20px; width: 100%;">Modifica Cliente</h2>
            <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; align-items: center;">
                <div style="text-align: left; width: 100%;">
                    <label style="font-size: 0.75em; font-weight: 700; color: #666; margin-bottom: 2px; display: block; text-transform: uppercase;">Nome</label>
                    <input type="text" id="editC-Nome" value="${client.nome}" placeholder="Nome">
                </div>
                <div style="text-align: left; width: 100%;">
                    <label style="font-size: 0.75em; font-weight: 700; color: #666; margin-bottom: 2px; display: block; text-transform: uppercase;">Cognome</label>
                    <input type="text" id="editC-Cognome" value="${client.cognome}" placeholder="Cognome">
                </div>
                <div style="text-align: left; width: 100%;">
                    <label style="font-size: 0.75em; font-weight: 700; color: #666; margin-bottom: 2px; display: block; text-transform: uppercase;">Telefono</label>
                    <input type="tel" id="editC-Phone" value="${client.telefono}" placeholder="Telefono">
                </div>
                <div style="text-align: left; width: 100%;">
                    <label style="font-size: 0.75em; font-weight: 700; color: #666; margin-bottom: 2px; display: block; text-transform: uppercase;">Email</label>
                    <input type="email" id="editC-Email" value="${client.email.includes('@barber.it') ? '' : client.email}" placeholder="Email">
                </div>
                <div style="text-align: left; width: 100%;">
                    <label style="font-size: 0.75em; font-weight: 700; color: #666; margin-bottom: 2px; display: block; text-transform: uppercase;">Durata Taglio (min)</label>
                    <input type="number" id="editC-CutTime" value="${client.cutTime}" placeholder="Durata Taglio (min)" min="15" step="5">
                    <p id="edit-client-error" style="color: #dc3545; text-align: center; margin-top: 5px; margin-bottom: 10px; display: none; font-size: 0.9em;"></p>
                    </div>
                <div style="display: flex; width: 100%; margin-top: 15px;">
                    <button id="cancel-edit-client-btn" style="flex: 1; border: none; background: transparent; color: #666; font-size: 0.9em; font-weight: 600; text-transform: uppercase; cursor: pointer;">Annulla</button>
                    <button id="saveClientBtn" onclick="saveEditedClient('${client.id}', '${client.telefono}')" style="flex: 1; background: transparent; color: #8A9A5B; border: none; font-weight: 700; text-transform: uppercase;">Salva</button>
                </div>
            </div>
        </div>
    `;
    openPopup(overlay);

    document.getElementById('cancel-edit-client-btn').onclick = () => closeAllPopupsAndRedirect();
}

function saveEditedClient(clientId, oldIdentifier) {
    const btn = document.getElementById('saveClientBtn');
    const errorEl = document.getElementById('edit-client-error');
    const updatedData = {
        nome: capitalizeFirst(document.getElementById('editC-Nome').value),
        cognome: capitalizeFirst(document.getElementById('editC-Cognome').value),
        telefono: normalizePhone(document.getElementById('editC-Phone').value),
        email: document.getElementById('editC-Email').value.trim(),
        cutTime: parseInt(document.getElementById('editC-CutTime').value, 10) || 30
    };

    if (!updatedData.nome || !updatedData.cognome || !updatedData.telefono || !updatedData.email) {
        if (errorEl) {
            errorEl.innerText = "Tutti i campi (Nome, Cognome, Telefono, Email) sono obbligatori.";
            errorEl.style.display = 'block';
        }
        return;
    }

    if (errorEl) errorEl.style.display = 'none';
    showButtonSpinner(btn);

    google.script.run.withSuccessHandler((res) => {
        if (res && res.status === "OK") {
            // Aggiorna la cache locale con i dati modificati
            const clientIndex = cachedAppData.clients.findIndex(c => c.id === clientId);
            if (clientIndex !== -1) {
                cachedAppData.clients[clientIndex] = { ...cachedAppData.clients[clientIndex], ...updatedData, id: clientId };
            }
            window.allClientsData = cachedAppData.clients;
            // Chiude il popup e aggiorna la lista, confermando implicitamente il successo
            closeAllPopupsAndRedirect(renderBarberClientsListPage, true);
        } else {
            hideButtonSpinner(btn);
            if (errorEl) {
                errorEl.innerText = res.message || "Impossibile aggiornare i dati.";
                errorEl.style.display = 'block';
            }
        }
    }).updateClientData(oldIdentifier, updatedData);
}

function showNewClientFormForList() {
    document.getElementById('new-client-fields-list').classList.remove('hidden');
    document.getElementById('search-container-list').classList.add('hidden');
    document.getElementById('client-list-card-title').innerText = "Nuovo Cliente";
}

function hideNewClientFormForList() {
    document.getElementById('new-client-fields-list').classList.add('hidden');
    document.getElementById('search-container-list').classList.remove('hidden');
    document.getElementById('client-list-card-title').innerText = "Ricerca e Gestione";
}

function saveNewClientFromList(btn) {
    const n = document.getElementById('list-newC-nome').value.trim();
    const c = document.getElementById('list-newC-cognome').value.trim();
    const t = document.getElementById('list-newC-tel').value.trim();
    const e = document.getElementById('list-newC-email').value.trim();
    const errorEl = document.getElementById('list-new-client-error');

    if (!n || !c || !t || !e) {
        if (errorEl) {
            errorEl.innerText = "Tutti i campi (Nome, Cognome, Telefono, Email) sono obbligatori.";
            errorEl.style.display = 'block';
        }
        return;
    }

    if (errorEl) errorEl.style.display = 'none';
    showButtonSpinner(btn);

    google.script.run.withSuccessHandler((serverUser) => {
        hideButtonSpinner(btn);
        // Aggiungi il nuovo cliente alla cache locale
        cachedAppData.clients.push(serverUser);
        // Ordina la cache per mantenere l'ordine alfabetico
        cachedAppData.clients.sort((a, b) => (a.nome + " " + a.cognome).toLowerCase().localeCompare((b.nome + " " + b.cognome).toLowerCase()));
        window.allClientsData = cachedAppData.clients;

        // Svuota i campi di input
        document.getElementById('list-newC-nome').value = '';
        document.getElementById('list-newC-cognome').value = '';
        document.getElementById('list-newC-tel').value = '';
        document.getElementById('list-newC-email').value = '';

        // Nascondi il form di inserimento
        hideNewClientFormForList();

        // Aggiorna la lista visualizzata con i dati locali
        renderClientsCards(window.allClientsData);
    }).withFailureHandler(err => {
        hideButtonSpinner(btn);
        if (errorEl) {
            errorEl.innerText = err;
            errorEl.style.display = 'block';
        }
    }).registerOrUpdateUser({ nome: capitalizeFirst(n), cognome: capitalizeFirst(c), email: e, telefono: t });
}

function filterClientsList(val) {
    const filtered = window.allClientsData.filter(c =>
        (c.nome + " " + c.cognome + " " + c.telefono).toLowerCase().includes(val.toLowerCase())
    );
    renderClientsCards(filtered);
}

function confirmRemoveClient(clientId, clientName) {
    const overlay = document.createElement('div');
    overlay.id = 'remove-client-overlay';
    overlay.className = 'popup-overlay';

    overlay.innerHTML = `
        <div class="booking-card fade-in" style="width: 90%; max-width: 400px; background: white; padding: 25px; align-items: center; text-align: center; border: none; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
            <h2 style="margin-bottom: 10px; font-size: 1.2em; width: 100%;">Elimina Cliente</h2>
            <p style="margin-bottom: 20px; color: #666; font-size: 0.95em; line-height: 1.4;">Vuoi davvero eliminare <strong>${clientName}</strong>? L'azione è irreversibile.</p>
            <div class="popup-actions" style="display: flex; width: 100%; margin-top: 10px;">
                <button onclick="document.getElementById('remove-client-overlay').remove()" style="flex: 1; border: none; background: transparent; color: #666; font-size: 0.9em; font-weight: 600; cursor: pointer; text-transform: uppercase;">Annulla</button>
                <button id="confirmRemoveClientBtn" style="flex: 1; background: transparent; color: #dc3545; padding: 12px; font-weight: 700; border: none; cursor: pointer; text-transform: uppercase;">Elimina</button>
            </div>
        </div>
    `;

    openPopup(overlay);

    document.getElementById('confirmRemoveClientBtn').onclick = () => {
        const btn = document.getElementById('confirmRemoveClientBtn');
        showButtonSpinner(btn);

        google.script.run.withSuccessHandler(res => {
            if (res && res.status === "OK") {
                showCustomAlert("Successo", "Cliente eliminato correttamente.");
                // Aggiorniamo i dati locali e rirenderizziamo
                cachedAppData.clients = cachedAppData.clients.filter(c => c.id !== clientId);
                window.allClientsData = cachedAppData.clients;
                closeAllPopupsAndRedirect(renderBarberClientsListPage, true);
            } else {
                hideButtonSpinner(btn);
                showCustomAlert("Errore", res.message || "Impossibile eliminare il cliente.");
            }
        }).deleteClient(clientId);
    };
}