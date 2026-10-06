const GOOGLE_MAPS_SCRIPT_ID = 'crm-google-maps-js';

export const loadGoogleMaps = (apiKey) => {
  if (!apiKey) return Promise.reject(new Error('Missing Google Maps API key.'));
  if (typeof window !== 'undefined' && window.google?.maps) return Promise.resolve(window.google.maps);

  const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(window.google?.maps), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps script.')), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = async () => {
      const maps = window.google?.maps;
      if (!maps) {
        reject(new Error('Google Maps loaded but window.google.maps is unavailable.'));
        return;
      }
      if (typeof maps.importLibrary === 'function') {
        try {
          await maps.importLibrary('places');
        } catch {
          // ignore
        }
      }
      resolve(maps);
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps script.'));
    document.head.appendChild(script);
  });
};

