const LocationController = (() => {
  const STORAGE_KEY = 'iss-live-tracker-location';
  let current = null;
  const listeners = [];

  function emit(location, source, persist = true) {
    current = { ...location, source };
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      } catch (_) {
        // Storage can be unavailable in private/restricted browser contexts.
      }
    }
    listeners.slice().forEach(fn => fn(current));
  }

  function normalize(latitude, longitude) {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error('Invalid coordinates');
    }
    return { latitude: lat, longitude: lon };
  }

  function setManual(latitude, longitude) {
    const location = normalize(latitude, longitude);
    emit(location, 'manual');
    return location;
  }

  function locate() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation unavailable'));
      navigator.geolocation.getCurrentPosition(
        position => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          emit(location, 'automatic');
          resolve(location);
        },
        reject,
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
      );
    });
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved) return null;
      const location = normalize(saved.latitude, saved.longitude);
      current = { ...location, source: saved.source === 'automatic' ? 'automatic' : 'manual', accuracy: saved.accuracy };
      return current;
    } catch (_) {
      return null;
    }
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    listeners.push(fn);
    if (current) fn(current);
    return () => {
      const index = listeners.indexOf(fn);
      if (index >= 0) listeners.splice(index, 1);
    };
  }

  restore();

  return {
    locate,
    setManual,
    subscribe,
    restore,
    get current() { return current; }
  };
})();
