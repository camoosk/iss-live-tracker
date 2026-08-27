const LocationController = (() => {
  let current = null;
  const listeners = [];

  function emit(location, source) {
    current = { ...location, source };
    listeners.forEach(fn => fn(current));
  }

  function setManual(latitude, longitude) {
    const lat = Number(latitude), lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error('Invalid coordinates');
    }
    emit({ latitude: lat, longitude: lon }, 'manual');
  }

  function locate() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation unavailable'));
      navigator.geolocation.getCurrentPosition(
        position => {
          const location = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy };
          emit(location, 'automatic');
          resolve(location);
        }, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  }

  return { locate, setManual, subscribe(fn) { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); }, get current() { return current; } };
})();
