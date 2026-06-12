const root = document.documentElement;
const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-button]');
const nav = document.querySelector('[data-nav]');
const halo = document.querySelector('.cursor-light');
const modal = document.querySelector('[data-modal]');
const modalEvent = document.querySelector('[data-modal-event]');
const downloadIcsBtn = document.querySelector('[data-download-ics]');
const bookingForm = document.querySelector('[data-booking-form]');
const bookingFeedback = document.querySelector('[data-booking-feedback]');
const eventForm = document.querySelector('[data-event-registration-form]');
const eventFeedback = document.querySelector('[data-event-feedback]');
let currentEvent = null;

const EVENT_STORAGE_KEY = 'sgf-events-v1';

let EVENTS = {
  'forum-paris': {
    title: 'SGF Investment Forum',
    dateLabel: '15 septembre 2026, 09h00 à 18h00',
    start: '20260915T090000',
    end: '20260915T180000',
    location: 'Paris 17e',
    description: 'Forum SGF dédié aux acquisitions, aux secteurs stratégiques, au networking et à la présentation des premières orientations du groupe.',
    category: 'Forum, Paris',
    badgeDay: '15',
    badgeMonth: 'Sep 2026',
    formats: ['Présentiel', 'Teams Live'],
    buttonLabel: 'Réserver ma place',
    visible: true
  },
  'meet-benin': {
    title: 'Entrepreneurs Bénin × SGF',
    dateLabel: '22 octobre 2026, 10h00 à 17h00',
    start: '20261022T100000',
    end: '20261022T170000',
    location: 'Cotonou',
    description: 'Rencontre d’affaires entre SGF Bénin, entrepreneurs, institutions et partenaires en Afrique de l’Ouest.',
    category: 'Networking, Cotonou',
    badgeDay: '22',
    badgeMonth: 'Oct 2026',
    formats: ['Présentiel', 'Google Meet'],
    buttonLabel: 'Réserver ma place',
    visible: true
  },
  'webinar-holding': {
    title: 'Finance d’entreprise et holdings en 2026',
    dateLabel: '05 novembre 2026, 14h00 à 16h30',
    start: '20261105T140000',
    end: '20261105T163000',
    location: 'Microsoft Teams',
    description: 'Webinaire sur la structuration de holdings, la gouvernance financière, la formation et le financement des acquisitions.',
    category: 'Webinaire, online',
    badgeDay: '05',
    badgeMonth: 'Nov 2026',
    formats: ['Microsoft Teams', 'Google Meet'],
    buttonLabel: 'Rejoindre',
    visible: true
  },
  'annual-gathering': {
    title: 'SGF Annual Gathering 2026',
    dateLabel: '12 décembre 2026, 19h30 à 00h00',
    start: '20261212T193000',
    end: '20261213T000000',
    location: 'Paris, sur invitation',
    description: 'Rencontre annuelle réservée aux partenaires, investisseurs et interlocuteurs stratégiques de SGF.',
    category: 'Soirée annuelle',
    badgeDay: '12',
    badgeMonth: 'Déc 2026',
    formats: ['Sur invitation'],
    buttonLabel: 'Demander une invitation',
    visible: true
  }
};

function safeText(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function mapToEventList(map) {
  return Object.entries(map).map(([id, event]) => ({ id, ...event }));
}

function eventListToMap(list) {
  return (Array.isArray(list) ? list : []).reduce((acc, event) => {
    if (!event || !event.id || !event.title) return acc;
    acc[event.id] = { ...event };
    delete acc[event.id].id;
    return acc;
  }, {});
}

function formatDateBadge(event) {
  if (event.badgeDay && event.badgeMonth) return { day: event.badgeDay, month: event.badgeMonth };
  const match = String(event.dateLabel || '').match(/(\d{1,2})\s+([a-zéû\.]+\s+\d{4})/i);
  if (match) return { day: match[1].padStart(2, '0'), month: match[2].replace('.', '') };
  return { day: 'À', month: 'venir' };
}

function renderEvents() {
  const grid = document.querySelector('[data-events-list]');
  if (!grid) return;
  const list = mapToEventList(EVENTS).filter((event) => event.visible !== false);
  if (!list.length) {
    grid.innerHTML = '<p class="empty-events">Aucun événement publié pour le moment.</p>';
    return;
  }
  grid.innerHTML = list.map((event, index) => {
    const badge = formatDateBadge(event);
    const formats = Array.isArray(event.formats) && event.formats.length ? event.formats : ['Sur demande'];
    const delay = index % 2 ? ' delay-1' : '';
    return `
      <article class="event-card interactive-card reveal in${delay}" data-event-id="${safeText(event.id)}">
        <div class="event-date"><strong>${safeText(badge.day)}</strong><span>${safeText(badge.month)}</span></div>
        <div class="event-content">
          <span>${safeText(event.category || 'Événement SGF')}</span>
          <h3>${safeText(event.title)}</h3>
          <p>${safeText(event.description)}</p>
          <div>${formats.map((format) => `<em>${safeText(format)}</em>`).join('')}</div>
        </div>
        <button class="btn btn-card" type="button" data-open-booking="${safeText(event.id)}">${safeText(event.buttonLabel || 'Réserver')}</button>
      </article>`;
  }).join('');
  grid.querySelectorAll('[data-open-booking]').forEach((button) => {
    button.addEventListener('click', () => openModal(button.dataset.openBooking));
  });
  initLightOnCards(grid);
}

async function loadEvents() {
  const localEvents = localStorage.getItem(EVENT_STORAGE_KEY);
  if (localEvents) {
    try {
      const parsed = JSON.parse(localEvents);
      const map = eventListToMap(parsed);
      if (Object.keys(map).length) EVENTS = map;
    } catch (_) {}
  }

  try {
    const response = await fetch('/api/events', { headers: { Accept: 'application/json' } });
    if (response.ok) {
      const payload = await response.json();
      const map = eventListToMap(payload.events || payload);
      if (Object.keys(map).length) EVENTS = map;
    }
  } catch (_) {}

  renderEvents();
}

function setTerritory(territory) {
  if (territory !== 'france' && territory !== 'benin') return;
  root.classList.add('is-switching');
  root.dataset.territory = territory;
  document.querySelectorAll('[data-territory-switch]').forEach((button) => {
    const active = button.dataset.territorySwitch === territory;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    if (button.classList.contains('choice-card')) button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  localStorage.setItem('sgf-territory', territory);
  setTimeout(() => root.classList.remove('is-switching'), 460);
}

function initTerritorySwitches() {
  document.querySelectorAll('[data-territory-switch]').forEach((button) => {
    button.addEventListener('click', () => setTerritory(button.dataset.territorySwitch));
  });
  const stored = localStorage.getItem('sgf-territory');
  if (stored === 'france' || stored === 'benin') setTerritory(stored);
}

function initHeader() {
  window.addEventListener('scroll', () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 20);
  }, { passive: true });

  menuButton?.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    menuButton.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  nav?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      menuButton?.classList.remove('is-open');
      menuButton?.setAttribute('aria-expanded', 'false');
    });
  });
}

function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

function initCursorLight() {
  if (!matchMedia('(pointer:fine)').matches || !halo) return;
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let tx = x;
  let ty = y;
  let visible = false;
  window.addEventListener('pointermove', (event) => {
    tx = event.clientX;
    ty = event.clientY;
    if (!visible) {
      visible = true;
      halo.style.opacity = '1';
    }
  }, { passive: true });
  window.addEventListener('pointerleave', () => {
    visible = false;
    halo.style.opacity = '0';
  });
  function tick() {
    x += (tx - x) * 0.16;
    y += (ty - y) * 0.16;
    halo.style.transform = `translate3d(${x - 210}px, ${y - 210}px, 0)`;
    requestAnimationFrame(tick);
  }
  tick();
}

function initLightOnCards(scope = document) {
  scope.querySelectorAll('.interactive-card').forEach((card) => {
    if (card.dataset.lightReady) return;
    card.dataset.lightReady = '1';
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--y', `${event.clientY - rect.top}px`);
    }, { passive: true });
  });
}

function initMagnetButtons() {
  if (!matchMedia('(pointer:fine)').matches) return;
  document.querySelectorAll('.magnet').forEach((button) => {
    button.addEventListener('pointermove', (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      button.style.transform = `translate3d(${x * 0.06}px, ${y * 0.1}px, 0)`;
    }, { passive: true });
    button.addEventListener('pointerleave', () => {
      button.style.transform = '';
    });
  });
}

function openModal(eventId) {
  currentEvent = EVENTS[eventId] ? { id: eventId, ...EVENTS[eventId] } : null;
  if (!currentEvent) return;
  modalEvent.textContent = `${currentEvent.title}, ${currentEvent.dateLabel}`;
  if (eventFeedback) eventFeedback.textContent = '';
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function escapeIcs(text = '') {
  return String(text).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function downloadIcs() {
  if (!currentEvent) return;
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SGF Group//Events//FR',
    'BEGIN:VEVENT',
    `UID:${currentEvent.id}@sgf-group`,
    `DTSTAMP:${now}`,
    `DTSTART:${currentEvent.start || ''}`,
    `DTEND:${currentEvent.end || ''}`,
    `SUMMARY:${escapeIcs(currentEvent.title)}`,
    `LOCATION:${escapeIcs(currentEvent.location || '')}`,
    `DESCRIPTION:${escapeIcs(currentEvent.description || '')}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${currentEvent.id || 'sgf-event'}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.error || 'Une erreur est survenue.');
  return data;
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function initForms() {
  bookingForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    bookingFeedback.textContent = 'Envoi en cours...';
    try {
      await postJson('/api/booking', formToObject(bookingForm));
      bookingFeedback.textContent = 'Votre demande a bien été transmise à SGF.';
      bookingForm.reset();
    } catch (error) {
      bookingFeedback.textContent = `${error.message} Si le site est testé en statique, le formulaire nécessite le backend.`;
    }
  });

  eventForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentEvent) return;
    eventFeedback.textContent = 'Inscription en cours...';
    try {
      await postJson('/api/event-registrations', { eventId: currentEvent.id, ...formToObject(eventForm) });
      eventFeedback.textContent = 'Inscription enregistrée. SGF recevra votre demande.';
      eventForm.reset();
    } catch (error) {
      eventFeedback.textContent = `${error.message} Le backend doit être lancé pour enregistrer les inscriptions.`;
    }
  });
}

document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal));
modal?.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
downloadIcsBtn?.addEventListener('click', downloadIcs);

initTerritorySwitches();
initHeader();
initReveal();
initCursorLight();
initLightOnCards();
initMagnetButtons();
initForms();
loadEvents();
