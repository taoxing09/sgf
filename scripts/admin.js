const API = {
  login: '/api/admin/login',
  events: '/api/admin/events',
  registrations: '/api/admin/registrations'
};
const TOKEN_KEY = 'sgf-v9-admin-token';
let token = localStorage.getItem(TOKEN_KEY) || '';
let events = [];
let registrations = [];
let selectedId = null;

const $ = (selector) => document.querySelector(selector);
const listEl = $('[data-event-list]');
const form = $('[data-event-form]');
const loginLayer = $('[data-login-layer]');
const loginForm = $('[data-login-form]');
const loginError = $('[data-login-error]');
const toastEl = $('[data-toast]');

function headers(json = true) {
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${token}`
  };
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toastEl.classList.remove('is-visible'), 2600);
}

function setAuthUI(connected) {
  loginLayer.classList.toggle('is-visible', !connected);
  $('[data-auth-status]').textContent = connected ? 'Connecté' : 'Non connecté';
}

function normalizeEvent(event = {}) {
  return {
    id: event.id || '',
    title: event.title || '',
    category: event.category || 'Événement SGF',
    dateLabel: event.dateLabel || '',
    badgeDay: event.badgeDay || '',
    badgeMonth: event.badgeMonth || '',
    start: event.start || '',
    end: event.end || '',
    location: event.location || '',
    description: event.description || '',
    formats: Array.isArray(event.formats) ? event.formats : String(event.formats || '').split(',').map(x => x.trim()).filter(Boolean),
    buttonLabel: event.buttonLabel || 'Réserver',
    teamsUrl: event.teamsUrl || '',
    meetUrl: event.meetUrl || '',
    capacity: event.capacity || 0,
    visible: event.visible !== false,
    featured: event.featured === true
  };
}

function renderStats() {
  $('[data-count-events]').textContent = events.length;
  $('[data-count-visible]').textContent = events.filter(e => e.visible).length;
  $('[data-count-registrations]').textContent = registrations.length;
}

function renderEvents() {
  renderStats();
  if (!events.length) {
    listEl.innerHTML = '<p class="empty-state">Aucun événement. Clique sur “Nouvel événement”.</p>';
    return;
  }
  listEl.innerHTML = events.map((event) => `
    <button class="event-row ${event.id === selectedId ? 'is-active' : ''} ${event.visible ? '' : 'is-draft'}" type="button" data-id="${escapeHtml(event.id)}">
      <strong>${escapeHtml(event.title || 'Sans titre')}</strong>
      <small>${escapeHtml(event.dateLabel || event.category || 'Date à préciser')}</small>
      <em>${event.visible ? 'Publié' : 'Brouillon'}</em>
    </button>
  `).join('');
  listEl.querySelectorAll('[data-id]').forEach(btn => btn.addEventListener('click', () => selectEvent(btn.dataset.id)));
}

function renderRegistrations() {
  const el = $('[data-registration-list]');
  renderStats();
  if (!registrations.length) {
    el.innerHTML = '<p class="empty-state">Aucune inscription reçue pour le moment.</p>';
    return;
  }
  el.innerHTML = registrations.slice(0, 40).map((row) => `
    <div class="registration-row">
      <span><strong>${escapeHtml(row.name)}</strong><br>${escapeHtml(row.company || '-')}</span>
      <span>${escapeHtml(row.eventTitle || row.eventId)}</span>
      <span>${escapeHtml(row.email)}<br>${escapeHtml(row.phone || '')}</span>
      <span>${new Date(row.createdAt).toLocaleDateString('fr-FR')}</span>
    </div>
  `).join('');
}

function fillForm(event = null) {
  const data = normalizeEvent(event || {});
  form.elements.id.value = data.id;
  form.elements.title.value = data.title;
  form.elements.category.value = data.category;
  form.elements.dateLabel.value = data.dateLabel;
  form.elements.badgeDay.value = data.badgeDay;
  form.elements.badgeMonth.value = data.badgeMonth;
  form.elements.start.value = data.start;
  form.elements.end.value = data.end;
  form.elements.location.value = data.location;
  form.elements.capacity.value = data.capacity || '';
  form.elements.description.value = data.description;
  form.elements.formats.value = data.formats.join(', ');
  form.elements.buttonLabel.value = data.buttonLabel;
  form.elements.teamsUrl.value = data.teamsUrl;
  form.elements.meetUrl.value = data.meetUrl;
  form.elements.visible.checked = data.visible;
  form.elements.featured.checked = data.featured;
  $('[data-form-title]').textContent = data.id ? 'Modifier un événement' : 'Créer un événement';
}

function selectEvent(id) {
  selectedId = id;
  fillForm(events.find(e => e.id === id));
  renderEvents();
}

function resetForm() {
  selectedId = null;
  form.reset();
  form.elements.visible.checked = true;
  form.elements.buttonLabel.value = 'Réserver ma place';
  fillForm(null);
  renderEvents();
}

function formToEvent() {
  const raw = Object.fromEntries(new FormData(form).entries());
  return normalizeEvent({
    ...raw,
    formats: String(raw.formats || '').split(',').map(x => x.trim()).filter(Boolean),
    visible: form.elements.visible.checked,
    featured: form.elements.featured.checked,
    capacity: Number(raw.capacity || 0)
  });
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401) {
    token = '';
    localStorage.removeItem(TOKEN_KEY);
    setAuthUI(false);
    throw new Error(payload.error || 'Session expirée.');
  }
  if (!response.ok) throw new Error(payload.error || 'Erreur serveur.');
  return payload;
}

async function loadAll() {
  if (!token) { setAuthUI(false); return; }
  try {
    setAuthUI(true);
    const [eventPayload, registrationPayload] = await Promise.all([
      request(API.events, { headers: headers(false) }),
      request(API.registrations, { headers: headers(false) })
    ]);
    events = (eventPayload.events || []).map(normalizeEvent);
    registrations = registrationPayload.registrations || [];
    $('[data-server-status]').textContent = 'Connecté au backend production.';
    renderEvents();
    renderRegistrations();
    if (events[0] && !selectedId) selectEvent(events[0].id);
  } catch (error) {
    $('[data-server-status]').textContent = error.message;
    showToast(error.message);
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.textContent = '';
  try {
    const password = new FormData(loginForm).get('password');
    const payload = await request(API.login, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    token = payload.token;
    localStorage.setItem(TOKEN_KEY, token);
    loginForm.reset();
    showToast('Connexion réussie.');
    await loadAll();
  } catch (error) {
    loginError.textContent = error.message;
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = formToEvent();
  try {
    const isUpdate = Boolean(data.id && events.find(e => e.id === data.id));
    const url = isUpdate ? `${API.events}/${encodeURIComponent(data.id)}` : API.events;
    const method = isUpdate ? 'PATCH' : 'POST';
    const payload = await request(url, { method, headers: headers(), body: JSON.stringify(data) });
    const saved = normalizeEvent(payload.event);
    const index = events.findIndex(e => e.id === saved.id);
    if (index >= 0) events[index] = saved; else events.unshift(saved);
    selectedId = saved.id;
    renderEvents();
    fillForm(saved);
    showToast(isUpdate ? 'Événement modifié.' : 'Événement créé.');
  } catch (error) { showToast(error.message); }
});

$('[data-new-event]').addEventListener('click', resetForm);
$('[data-reset-form]').addEventListener('click', resetForm);
$('[data-delete-event]').addEventListener('click', async () => {
  if (!selectedId) return showToast('Sélectionne un événement à supprimer.');
  const event = events.find(e => e.id === selectedId);
  if (!confirm(`Supprimer définitivement “${event?.title || selectedId}” ?`)) return;
  try {
    await request(`${API.events}/${encodeURIComponent(selectedId)}`, { method: 'DELETE', headers: headers(false) });
    events = events.filter(e => e.id !== selectedId);
    resetForm();
    showToast('Événement supprimé.');
  } catch (error) { showToast(error.message); }
});

$('[data-export-json]').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sgf-events-export.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

$('[data-export-csv]').addEventListener('click', (event) => {
  if (!token) return;
  event.preventDefault();
  fetch('/api/admin/registrations.csv', { headers: headers(false) })
    .then(r => r.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sgf-inscriptions-evenements.csv';
      link.click();
      URL.revokeObjectURL(url);
    });
});

$('[data-refresh-registrations]').addEventListener('click', loadAll);
$('[data-logout]').addEventListener('click', () => {
  token = '';
  localStorage.removeItem(TOKEN_KEY);
  setAuthUI(false);
});

loadAll();
