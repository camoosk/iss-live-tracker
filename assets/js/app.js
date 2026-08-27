(() => {
  const buttons = document.querySelectorAll('.lang-button');
  const elements = document.querySelectorAll('[data-i18n]');
  const $ = id => document.getElementById(id);
  let language = localStorage.getItem('iss-live-tracker-language') || 'id';
  let iss = null;
  let user = null;

  const t = key => (window.ISS_I18N[language] || window.ISS_I18N.id)[key] || key;
  const fmt = (value, digits = 2) => Number(value).toLocaleString(language === 'id' ? 'id-ID' : 'en-US', { maximumFractionDigits: digits });

  function setLanguage(next) {
    language = next;
    const dictionary = window.ISS_I18N[language] || window.ISS_I18N.id;
    document.documentElement.lang = language;
    elements.forEach(el => { if (dictionary[el.dataset.i18n]) el.textContent = dictionary[el.dataset.i18n]; });
    buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.language === language));
    localStorage.setItem('iss-live-tracker-language', language);
    if (iss) renderISS(iss);
    if (user) renderUser(user);
  }

  function renderISS(data) {
    iss = data;
    $('iss-lat').textContent = `${fmt(data.latitude, 3)}°`;
    $('iss-lon').textContent = `${fmt(data.longitude, 3)}°`;
    $('iss-alt').textContent = `${fmt(data.altitude, 1)} km`;
    $('iss-speed').textContent = `${fmt(data.velocity, 0)} km/h`;
    $('iss-visibility').textContent = data.visibility === 'daylight' ? (language === 'id' ? 'Siang' : 'Daylight') : (language === 'id' ? 'Bayangan Bumi' : 'Eclipsed');
    $('iss-footprint').textContent = `${fmt(data.footprint, 0)} km`;
    $('last-update').textContent = new Date(Number(data.timestamp) * 1000).toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US');
    $('system-status').textContent = t('connected');
    $('status-dot').classList.add('online');
    $('status-dot').classList.remove('error');
    renderDistance();
  }

  function renderUser(location) {
    user = location;
    $('location-result').textContent = `${location.source === 'automatic' ? t('automaticLocation') : t('manualLocation')}: ${fmt(location.latitude, 5)}°, ${fmt(location.longitude, 5)}°`;
    if (window.ISS_3D) window.ISS_3D.setUserLocation(location);
    renderDistance();
  }

  function renderDistance() {
    if (!user || !iss) return;
    const R = 6371;
    const a1 = Number(user.latitude) * Math.PI / 180;
    const a2 = Number(iss.latitude) * Math.PI / 180;
    const da = (Number(iss.latitude) - Number(user.latitude)) * Math.PI / 180;
    const db = (Number(iss.longitude) - Number(user.longitude)) * Math.PI / 180;
    const a = Math.sin(da / 2) ** 2 + Math.cos(a1) * Math.cos(a2) * Math.sin(db / 2) ** 2;
    const surface = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = Math.sqrt(surface ** 2 + Number(iss.altitude) ** 2);
    $('distance-to-iss').textContent = `${fmt(distance, 0)} km`;
  }

  buttons.forEach(btn => btn.addEventListener('click', () => setLanguage(btn.dataset.language)));
  LocationController.subscribe(renderUser);
  $('locate-btn').addEventListener('click', async () => {
    $('locate-btn').disabled = true;
    try { await LocationController.locate(); }
    catch { $('location-result').textContent = t('locationDenied'); }
    finally { $('locate-btn').disabled = false; }
  });
  $('manual-location-form').addEventListener('submit', event => {
    event.preventDefault();
    try { LocationController.setManual($('manual-lat').value, $('manual-lon').value); }
    catch { $('location-result').textContent = t('invalidLocation'); }
  });
  window.addEventListener('iss:update', event => renderISS(event.detail));
  window.addEventListener('iss:error', () => {
    $('system-status').textContent = t('error');
    $('status-dot').classList.remove('online');
    $('status-dot').classList.add('error');
  });
  setLanguage(language);
})();
