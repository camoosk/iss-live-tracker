const LocationController = (() => {
  let current = null;
  const listeners = [];

  function emit(location, source) {
    current = { ...location, source };
    listeners.slice().forEach(fn => fn(current));
  }

  function setManual(latitude, longitude) {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error('Invalid coordinates');
    }
    const location = { latitude: lat, longitude: lon };
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
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    listeners.push(fn);
    return () => {
      const index = listeners.indexOf(fn);
      if (index >= 0) listeners.splice(index, 1);
    };
  }

  return { locate, setManual, subscribe, get current() { return current; } };
})();
