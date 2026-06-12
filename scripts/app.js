const root = document.documentElement;
const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-button]');
const nav = document.querySelector('[data-nav]');
const halo = document.querySelector('.cursor-halo');
const modal = document.querySelector('[data-modal]');
const modalEvent = document.querySelector('[data-modal-event]');
const downloadIcsBtn = document.querySelector('[data-download-ics]');
let currentEvent = null;

const CONFIG = {
  bookingsUrl: '', // Exemple : 'https://outlook.office365.com/book/SGF@domain.com/'
  contactEmail: 'contact.sgffrance@gmail.com',
  timezone: 'Europe/Paris'
};

let EVENTS = {
  'forum-paris': {
    title: 'SGF Investment Forum',
    dateLabel: '15 septembre 2026 · 09h00 – 18h00',
    start: '20260915T090000',
    end: '20260915T180000',
    location: 'Paris 17e',
    description: 'Forum SGF : acquisition, investissement, panels sectoriels et networking.',
    category: 'Forum · Paris',
    badgeDay: '15',
    badgeMonth: 'Sep 2026',
    formats: ['Présentiel', 'Teams Live'],
    buttonLabel: 'Réserver ma place'
  },
  'meet-benin': {
    title: 'Entrepreneurs Bénin × SGF',
    dateLabel: '22 octobre 2026 · 10h00 – 17h00',
    start: '20261022T100000',
    end: '20261022T170000',
    location: 'Cotonou',
    description: 'Rencontre SGF avec entrepreneurs, institutions et partenaires en Afrique de l’Ouest.',
    category: 'Networking · Cotonou',
    badgeDay: '22',
    badgeMonth: 'Oct 2026',
    formats: ['Présentiel', 'Google Meet'],
    buttonLabel: 'Réserver ma place'
  },
  'webinar-holding': {
    title: 'Finance d’entreprise & holdings en 2026',
    dateLabel: '05 novembre 2026 · 14h00 – 16h30',
    start: '20261105T140000',
    end: '20261105T163000',
    location: 'Microsoft Teams / Google Meet',
    description: 'Webinaire SGF sur la structuration de holdings et le financement d’acquisitions.',
    category: 'Webinaire · Online',
    badgeDay: '05',
    badgeMonth: 'Nov 2026',
    formats: ['Microsoft Teams', 'Google Meet'],
    buttonLabel: 'Rejoindre'
  },
  'annual-gathering': {
    title: 'SGF Annual Gathering 2026',
    dateLabel: '12 décembre 2026 · 19h30 – 00h00',
    start: '20261212T193000',
    end: '20261213T000000',
    location: 'Paris · Sur invitation',
    description: 'Soirée annuelle SGF réservée aux partenaires, investisseurs et filiales.',
    category: 'Soirée annuelle · Invitation',
    badgeDay: '12',
    badgeMonth: 'Déc 2026',
    formats: ['Sur invitation'],
    buttonLabel: 'Demander une invitation'
  }
};

const EVENT_STORAGE_KEY = 'sgf-events-v1';

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

function safeText(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function formatDateBadge(event) {
  if (event.badgeDay && event.badgeMonth) return { day: event.badgeDay, month: event.badgeMonth };
  const match = String(event.dateLabel || '').match(/(\d{1,2})\s+([a-zéû\.]+\s+\d{4})/i);
  if (match) return { day: match[1].padStart(2, '0'), month: match[2].replace('.', '') };
  return { day: '—', month: 'À venir' };
}

function renderEvents() {
  const grid = document.querySelector('[data-events-list]');
  if (!grid) return;
  const list = mapToEventList(EVENTS).filter((event) => event.visible !== false);
  grid.innerHTML = list.map((event, index) => {
    const badge = formatDateBadge(event);
    const formats = Array.isArray(event.formats) && event.formats.length ? event.formats : ['Sur demande'];
    const delay = index % 2 ? ' delay-1' : '';
    return `
      <article class="event-card interactive-card reveal in${delay}" data-event-card data-event-id="${safeText(event.id)}">
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
  } catch (_) {
    // Site statique : on garde les événements de démonstration ou ceux du localStorage.
  }

  renderEvents();
}

function setTerritory(territory) {
  root.dataset.territory = territory;
  document.querySelectorAll('[data-territory-switch]').forEach((button) => {
    const active = button.dataset.territorySwitch === territory;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  localStorage.setItem('sgf-territory', territory);
}

document.querySelectorAll('[data-territory-switch]').forEach((button) => {
  button.addEventListener('click', () => setTerritory(button.dataset.territorySwitch));
});

const storedTerritory = localStorage.getItem('sgf-territory');
if (storedTerritory === 'france' || storedTerritory === 'benin') setTerritory(storedTerritory);

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

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

if (matchMedia('(pointer:fine)').matches && halo) {
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let tx = x;
  let ty = y;

  window.addEventListener('pointermove', (event) => {
    tx = event.clientX;
    ty = event.clientY;
    halo.style.opacity = '1';
  }, { passive: true });

  window.addEventListener('pointerleave', () => { halo.style.opacity = '0'; });

  function moveHalo() {
    x += (tx - x) * 0.15;
    y += (ty - y) * 0.15;
    halo.style.transform = `translate3d(${x - 210}px, ${y - 210}px, 0)`;
    requestAnimationFrame(moveHalo);
  }
  moveHalo();
}

document.querySelectorAll('.interactive-card,.command-card').forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--y', `${event.clientY - rect.top}px`);
  });
});

function openModal(eventId) {
  currentEvent = EVENTS[eventId] ? { id: eventId, ...EVENTS[eventId] } : null;
  if (!currentEvent) return;

  if (CONFIG.bookingsUrl && (eventId === 'webinar-holding' || eventId === 'forum-paris')) {
    window.open(CONFIG.bookingsUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  modalEvent.textContent = `${currentEvent.title} — ${currentEvent.dateLabel}`;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

loadEvents();

document.querySelectorAll('[data-open-booking]').forEach((button) => {
  button.addEventListener('click', () => openModal(button.dataset.openBooking));
});

document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal));
window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });

function escapeIcs(text = '') {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function downloadIcs() {
  if (!currentEvent) return;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `${currentEvent.start}-${currentEvent.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') }@sgf-group`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SGF Group//Website Booking//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${CONFIG.timezone}:${currentEvent.start}`,
    `DTEND;TZID=${CONFIG.timezone}:${currentEvent.end}`,
    `SUMMARY:${escapeIcs(currentEvent.title)}`,
    `DESCRIPTION:${escapeIcs(currentEvent.description)}`,
    `LOCATION:${escapeIcs(currentEvent.location)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${currentEvent.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

downloadIcsBtn?.addEventListener('click', downloadIcs);

function showInlineMessage(form, message, ok = true) {
  let note = form.querySelector('[data-inline-message]');
  if (!note) {
    note = document.createElement('p');
    note.dataset.inlineMessage = 'true';
    note.className = 'inline-message';
    form.appendChild(note);
  }
  note.textContent = message;
  note.classList.toggle('is-error', !ok);
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Une erreur est survenue.');
  return data;
}

document.querySelector('[data-event-registration-form]')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentEvent) return;
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    await postJson('/api/event-registrations', { ...data, eventId: currentEvent.id });
    showInlineMessage(form, 'Demande envoyée. SGF reviendra vers vous avec la confirmation et le lien Teams/Meet si applicable.');
    form.reset();
  } catch (error) {
    const subject = `Demande de réservation — ${currentEvent.title}`;
    const body = `Bonjour,\n\nJe souhaite réserver une place pour l’événement suivant :\n${currentEvent.title}\n${currentEvent.dateLabel}\nLieu / format : ${currentEvent.location}\n\nNom : ${data.name || ''}\nEntreprise : ${data.company || ''}\nEmail : ${data.email || ''}\nTéléphone : ${data.phone || ''}\nFormat souhaité : ${data.format || ''}\nMessage : ${data.message || ''}\n\nBien cordialement,`;
    window.location.href = `mailto:${CONFIG.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
});

document.querySelector('[data-booking-form]')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    await postJson('/api/booking', data);
    showInlineMessage(form, 'Demande envoyée. SGF reviendra vers vous pour confirmer le créneau.');
    form.reset();
  } catch (error) {
    const subject = `Demande de rendez-vous SGF — ${data.topic}`;
    const body = `Bonjour,\n\nNouvelle demande de rendez-vous depuis le site SGF Group.\n\nNom : ${data.name}\nEntreprise : ${data.company || ''}\nEmail : ${data.email}\nTéléphone : ${data.phone || ''}\nObjet : ${data.topic}\nFormat souhaité : ${data.format}\n\nMessage :\n${data.message || ''}\n\nBien cordialement,`;
    window.location.href = `mailto:${CONFIG.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
});

/* =====================================================
   V8 BALANCED MOTION — plus fluide, moins coûteux
===================================================== */
(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer:fine)').matches;
  const rootEl = document.documentElement;

  if (finePointer && !prefersReduced) {
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let tx = mx;
    let ty = my;
    let raf = null;

    const syncPointer = () => {
      mx += (tx - mx) * 0.10;
      my += (ty - my) * 0.10;
      rootEl.style.setProperty('--mx', `${mx}px`);
      rootEl.style.setProperty('--my', `${my}px`);
      raf = Math.abs(tx - mx) > 0.5 || Math.abs(ty - my) > 0.5 ? requestAnimationFrame(syncPointer) : null;
    };

    window.addEventListener('pointermove', (event) => {
      tx = event.clientX;
      ty = event.clientY;
      if (!raf) raf = requestAnimationFrame(syncPointer);
    }, { passive: true });

    document.querySelectorAll('.interactive-card,.command-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--x', `${event.clientX - rect.left}px`);
        card.style.setProperty('--y', `${event.clientY - rect.top}px`);
      }, { passive: true });
    });

    document.querySelectorAll('.magnet').forEach((button) => {
      button.addEventListener('pointermove', (event) => {
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        button.style.transform = `translate3d(${x * 0.045}px, ${y * 0.065}px, 0)`;
      }, { passive: true });
      button.addEventListener('pointerleave', () => { button.style.transform = ''; });
    });
  }

  document.querySelectorAll('[data-territory-switch]').forEach((button) => {
    button.addEventListener('click', () => {
      if (prefersReduced) return;
      rootEl.classList.remove('is-switching');
      void rootEl.offsetWidth;
      rootEl.classList.add('is-switching');
      window.setTimeout(() => rootEl.classList.remove('is-switching'), 360);
    });
  });
})();
