(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n) => String(n).padStart(2, '0');
  const plural = (n, forms) => {
    const n10 = n % 10;
    const n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return forms[0];
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
    return forms[2];
  };

  /* ---------- Шапка при прокрутке ---------- */
  const header = $('.header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Мобильное меню ---------- */
  const burger = $('.burger');
  const menu = $('#mobile-menu');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  };
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  $$('a', menu).forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Появление блоков при прокрутке ---------- */
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- «Сейчас открыто» по минскому времени (UTC+3) ---------- */
  const statusEl = $('[data-status]');
  if (statusEl) {
    const now = new Date();
    const minsk = new Date(now.getTime() + (now.getTimezoneOffset() + 180) * 60000);
    const day = minsk.getDay();
    const mins = minsk.getHours() * 60 + minsk.getMinutes();
    const openAt = (d) => (d === 0 || d === 6 ? 9 * 60 : 7 * 60 + 30);
    const closeAt = 22 * 60;
    const fmt = (m) => `${Math.floor(m / 60)}:${pad(m % 60)}`;
    const isOpen = mins >= openAt(day) && mins < closeAt;

    let text = 'Сейчас открыто · до 22:00';
    if (!isOpen) {
      text = mins < openAt(day)
        ? `Сейчас закрыто · откроемся в ${fmt(openAt(day))}`
        : `Сейчас закрыто · завтра с ${fmt(openAt((day + 1) % 7))}`;
    }
    statusEl.classList.toggle('is-closed', !isOpen);
    $('[data-status-text]', statusEl).textContent = text;
  }

  /* ---------- Вкладки меню ---------- */
  const tabs = $$('.tab');
  const indicator = $('.tabs__indicator');
  const moveIndicator = (tab) => {
    indicator.style.setProperty('--x', `${tab.offsetLeft}px`);
    indicator.style.setProperty('--w', `${tab.offsetWidth}px`);
  };
  const activateTab = (tab, focus = false) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !on;
      panel.classList.toggle('is-active', on);
    });
    moveIndicator(tab);
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const shift = e.key === 'ArrowRight' ? 1 : -1;
      activateTab(tabs[(i + shift + tabs.length) % tabs.length], true);
    });
  });
  const syncIndicator = () => moveIndicator(tabs.find((t) => t.getAttribute('aria-selected') === 'true'));
  syncIndicator();
  if (document.fonts) document.fonts.ready.then(syncIndicator);
  window.addEventListener('resize', syncIndicator);

  /* ---------- Слайдер отзывов ---------- */
  const track = $('.reviews');
  const [prevBtn, nextBtn] = $$('[data-slide]');
  const slideStep = () => {
    const card = $('.review', track);
    const gap = parseFloat(getComputedStyle(track).columnGap) || 22;
    return card ? card.getBoundingClientRect().width + gap : 320;
  };
  $$('[data-slide]').forEach((btn) => btn.addEventListener('click', () => {
    track.scrollBy({ left: slideStep() * Number(btn.dataset.slide), behavior: reduceMotion ? 'auto' : 'smooth' });
  }));
  const updateSliderNav = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    prevBtn.disabled = track.scrollLeft <= 2;
    nextBtn.disabled = track.scrollLeft >= max;
  };
  track.addEventListener('scroll', updateSliderNav, { passive: true });
  window.addEventListener('resize', updateSliderNav);
  updateSliderNav();

  /* ---------- Форма брони ---------- */
  const form = $('.form');
  const nameInput = $('#f-name');
  const phoneInput = $('#f-phone');
  const dateInput = $('#f-date');
  const timeSelect = $('#f-time');
  const guestsOut = $('#f-guests');
  const [minusBtn, plusBtn] = $$('[data-step]');
  let guests = 2;

  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const setDateLimits = () => {
    const today = new Date();
    const max = new Date(today);
    max.setDate(max.getDate() + 60);
    dateInput.min = toISO(today);
    dateInput.max = toISO(max);
    dateInput.value = toISO(today);
  };

  const fillTimes = () => {
    const now = new Date();
    const chosen = dateInput.value ? new Date(`${dateInput.value}T00:00`) : now;
    const weekend = chosen.getDay() === 0 || chosen.getDay() === 6;
    const start = weekend ? 9 * 60 : 8 * 60;
    const end = 21 * 60;
    const isToday = dateInput.value === toISO(now);
    const earliest = now.getHours() * 60 + now.getMinutes() + 30;
    const prev = timeSelect.value;

    timeSelect.innerHTML = '';
    const placeholder = new Option('Выберите время', '', true, true);
    placeholder.disabled = true;
    timeSelect.add(placeholder);
    for (let m = start; m <= end; m += 30) {
      if (isToday && m < earliest) continue;
      const t = `${Math.floor(m / 60)}:${pad(m % 60)}`;
      timeSelect.add(new Option(t, t));
    }
    if (timeSelect.options.length === 1) placeholder.textContent = 'На сегодня всё занято — выберите другой день';
    if (prev && [...timeSelect.options].some((o) => o.value === prev)) timeSelect.value = prev;
  };

  const renderGuests = () => {
    guestsOut.textContent = guests;
    minusBtn.disabled = guests <= 1;
    plusBtn.disabled = guests >= 10;
  };
  $$('[data-step]').forEach((btn) => btn.addEventListener('click', () => {
    guests = Math.min(10, Math.max(1, guests + Number(btn.dataset.step)));
    renderGuests();
  }));

  // Маска телефона: +375 (29) 123-45-67
  const formatPhone = (value) => {
    let digits = value.replace(/\D/g, '');
    if (!digits.startsWith('375')) digits = `375${digits}`;
    const p = digits.slice(3, 12);
    let out = '+375';
    if (p.length) out += ` (${p.slice(0, 2)}`;
    if (p.length > 2) out += `) ${p.slice(2, 5)}`;
    if (p.length > 5) out += `-${p.slice(5, 7)}`;
    if (p.length > 7) out += `-${p.slice(7, 9)}`;
    return out;
  };
  phoneInput.addEventListener('input', () => { phoneInput.value = formatPhone(phoneInput.value); });
  phoneInput.addEventListener('focus', () => { if (!phoneInput.value) phoneInput.value = '+375 ('; });
  phoneInput.addEventListener('blur', () => { if (phoneInput.value.replace(/\D/g, '').length <= 3) phoneInput.value = ''; });

  const setError = (input, message = '') => {
    const field = input.closest('.field');
    field.classList.toggle('is-invalid', Boolean(message));
    $('.field__error', field).textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  };
  const validate = () => {
    const checks = [
      [nameInput, nameInput.value.trim().length >= 2, 'Введите имя'],
      [phoneInput, phoneInput.value.replace(/\D/g, '').length === 12, 'Номер в формате +375 (29) 123-45-67'],
      [dateInput, Boolean(dateInput.value), 'Выберите дату'],
      [timeSelect, Boolean(timeSelect.value), 'Выберите время'],
    ];
    checks.forEach(([input, ok, msg]) => setError(input, ok ? '' : msg));
    return checks.every(([, ok]) => ok);
  };
  [nameInput, phoneInput, dateInput, timeSelect].forEach((el) => {
    el.addEventListener('input', () => { if (el.closest('.field').classList.contains('is-invalid')) validate(); });
  });
  dateInput.addEventListener('change', fillTimes);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) {
      const firstBad = $('.field.is-invalid input, .field.is-invalid select', form);
      if (firstBad) firstBad.focus();
      return;
    }
    const date = new Date(`${dateInput.value}T00:00`);
    const dateText = date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    const guestsText = `${guests} ${plural(guests, ['гость', 'гостя', 'гостей'])}`;
    $('.form-success__details', form).textContent =
      `${nameInput.value.trim()}, ждём вас ${dateText} в ${timeSelect.value}. ${guestsText}.`;
    form.classList.add('is-sent');
  });

  $('[data-reset]', form).addEventListener('click', () => {
    form.reset();
    form.classList.remove('is-sent');
    [nameInput, phoneInput, dateInput, timeSelect].forEach((el) => setError(el));
    guests = 2;
    renderGuests();
    setDateLimits();
    fillTimes();
    nameInput.focus();
  });

  setDateLimits();
  fillTimes();
  renderGuests();

  /* ---------- Всплывающие подсказки ---------- */
  const toast = $('.toast');
  let toastTimer;
  const showToast = (text) => {
    toast.textContent = text;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  };
  $$('[data-toast]').forEach((el) => el.addEventListener('click', () => showToast(el.dataset.toast)));

  /* ---------- Параллакс в первом экране ---------- */
  const hero = $('.hero');
  const layers = $$('.hero__visual [data-depth]');
  if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      layers.forEach((el) => {
        const depth = Number(el.dataset.depth);
        el.style.translate = `${(x * depth).toFixed(1)}px ${(y * depth).toFixed(1)}px`;
      });
    });
    hero.addEventListener('pointerleave', () => layers.forEach((el) => { el.style.translate = ''; }));
  }

  /* ---------- Год в подвале ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
