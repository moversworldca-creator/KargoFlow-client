import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

import { loadGoogleMaps } from '../utils/googleMaps';

const toString = (v) => String(v || '').trim();

const parseAddressComponents = (components = []) => {
  const readLong = (c) => c?.long_name || c?.longText || c?.short_name || c?.shortText || '';
  const readShort = (c) => c?.short_name || c?.shortText || c?.long_name || c?.longText || '';
  const get = (type) => components.find((c) => Array.isArray(c?.types) && c.types.includes(type));
  const streetNumber = readLong(get('street_number'));
  const route = readLong(get('route'));
  const street = [streetNumber, route].filter(Boolean).join(' ').trim();

  const city =
    readLong(get('locality')) ||
    readLong(get('postal_town')) ||
    readLong(get('administrative_area_level_3')) ||
    '';

  const province = readShort(get('administrative_area_level_1'));
  const postalCode = readLong(get('postal_code'));
  const countryCode = String(readShort(get('country')) || '').toLowerCase();

  return { street, city, province, postalCode, countryCode };
};

export default function AddressAutocomplete({
  value,
  onChange,
  onPick,
  placeholder = 'Street',
  className = '',
  country = '',
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const containerRef = useRef(null);
  const legacyAutocompleteRef = useRef(null);
  const autocompleteSuggestionRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const placeCtorRef = useRef(null);
  const sessionTokenCtorRef = useRef(null);
  const blurTimerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [open, setOpen] = useState(false);
  const allowedCountries = useMemo(() => {
    const parsed = String(country || '')
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);
    return parsed.length ? parsed : ['ca', 'us'];
  }, [country]);

  const inputValue = String(value ?? '');

  useEffect(() => {
    let cancelled = false;
    if (!apiKey) return;
    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled) return;
        // Prefer new Places Autocomplete Data API.
        autocompleteSuggestionRef.current = window.google?.maps?.places?.AutocompleteSuggestion || null;
        placeCtorRef.current = window.google?.maps?.places?.Place || null;
        sessionTokenCtorRef.current = window.google?.maps?.places?.AutocompleteSessionToken || null;

        // Legacy fallback (for older projects / keys).
        legacyAutocompleteRef.current = window.google.maps.places?.AutocompleteService
          ? new window.google.maps.places.AutocompleteService()
          : null;
        setReady(true);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Unable to load Maps.');
      });
    return () => {
      cancelled = true;
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };
  }, [apiKey]);

  const fetchPredictions = async (q) => {
    if (!ready) return;
    const query = toString(q);
    if (!query || query.length < 3) {
      setPredictions([]);
      return;
    }
    setBusy(true);
    setError('');

    // New API path
    if (autocompleteSuggestionRef.current && typeof autocompleteSuggestionRef.current.fetchAutocompleteSuggestions === 'function') {
      try {
        if (!sessionTokenRef.current && sessionTokenCtorRef.current) {
          sessionTokenRef.current = new sessionTokenCtorRef.current();
        }
        const req = {
          input: query,
          sessionToken: sessionTokenRef.current || undefined,
          includedRegionCodes: allowedCountries,
        };
        let res;
        try {
          res = await autocompleteSuggestionRef.current.fetchAutocompleteSuggestions(req);
        } catch {
          // Fallback for environments that don't support includedRegionCodes yet.
          res = await autocompleteSuggestionRef.current.fetchAutocompleteSuggestions({
            input: query,
            sessionToken: sessionTokenRef.current || undefined,
          });
        }
        const list = Array.isArray(res?.suggestions) ? res.suggestions : [];
        setPredictions(list.slice(0, 6));
      } catch (e) {
        setPredictions([]);
        setError(e?.message || 'Autocomplete failed.');
      } finally {
        setBusy(false);
      }
      return;
    }

    // Legacy fallback
    if (!legacyAutocompleteRef.current) {
      setBusy(false);
      setPredictions([]);
      return;
    }
    legacyAutocompleteRef.current.getPlacePredictions(
      {
        input: query,
        componentRestrictions: allowedCountries.length === 1 ? { country: allowedCountries[0] } : undefined,
      },
      (results, status) => {
        setBusy(false);
        if (status !== window.google.maps.places.PlacesServiceStatus.OK) {
          setPredictions([]);
          return;
        }
        setPredictions(Array.isArray(results) ? results.slice(0, 6) : []);
      }
    );
  };

  const pickPrediction = async (prediction) => {
    setBusy(true);
    setError('');
    try {
      // New API prediction shape: AutocompleteSuggestion.placePrediction
      const placePrediction = prediction?.placePrediction;
      if (placePrediction && typeof placePrediction.toPlace === 'function') {
        const place = placePrediction.toPlace();
        if (!place || typeof place.fetchFields !== 'function') {
          throw new Error('Unable to resolve place.');
        }
        await place.fetchFields({ fields: ['addressComponents', 'formattedAddress'] });
        const components = place.addressComponents || [];
        const parts = parseAddressComponents(components);
        const formatted = place.formattedAddress || '';
        if (parts.countryCode && !allowedCountries.includes(parts.countryCode)) {
          setError('Please choose an address in Canada or USA.');
          return;
        }
        onPick?.({ ...parts, formattedAddress: formatted }, place);
        setOpen(false);
        setPredictions([]);
        sessionTokenRef.current = null; // end session after first details fetch
        return;
      }

      // Legacy prediction shape: { place_id }
      const placeId = prediction?.place_id;
      const PlaceCtor = window.google?.maps?.places?.Place;
      if (!placeId || typeof PlaceCtor !== 'function') {
        setError('Unable to fetch place details.');
        return;
      }
      const place = new PlaceCtor({ id: placeId });
      await place.fetchFields({ fields: ['addressComponents', 'formattedAddress'] });
      const parts = parseAddressComponents(place.addressComponents || []);
      const formatted = place.formattedAddress || '';
      if (parts.countryCode && !allowedCountries.includes(parts.countryCode)) {
        setError('Please choose an address in Canada or USA.');
        return;
      }
      onPick?.({ ...parts, formattedAddress: formatted }, place);
      setOpen(false);
      setPredictions([]);
    } catch (e) {
      setError(e?.message || 'Unable to fetch place details.');
    } finally {
      setBusy(false);
    }
  };

  const predictionLabel = (p) => {
    const pp = p?.placePrediction;
    if (pp) {
      const main = pp?.mainText?.text || pp?.mainText?.toString?.() || '';
      const secondary = pp?.secondaryText?.text || '';
      const joined = [main, secondary].filter(Boolean).join(' — ');
      return joined || main || secondary || 'Suggestion';
    }
    return p?.description || 'Suggestion';
  };

  const showDropdown = open && (predictions.length > 0 || busy || error);
  const hint = useMemo(() => {
    if (!apiKey) return 'Set VITE_GOOGLE_MAPS_API_KEY to enable suggestions.';
    if (!ready && !error) return 'Loading suggestions…';
    return '';
  }, [apiKey, ready, error]);

  return (
    <div className="relative" ref={containerRef}>
      <input
        className={className}
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => {
          onChange?.(e);
          setOpen(true);
          fetchPredictions(e.target.value);
        }}
        onFocus={() => {
          setOpen(true);
          fetchPredictions(inputValue);
        }}
        onBlur={() => {
          // allow click selection
          if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
          blurTimerRef.current = setTimeout(() => {
            setOpen(false);
            blurTimerRef.current = null;
          }, 150);
        }}
      />
      {hint ? <div className="mt-1 text-[0.625rem] font-bold text-black">{hint}</div> : null}
      {showDropdown ? (
        <div className="absolute left-0 right-0 top-full z-[200] mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          {busy ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-black">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : null}
          {error ? <div className="bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</div> : null}
          {predictions.map((p, idx) => (
            <button
              key={[
                p?.placePrediction?.placeId || '',
                p?.place_id || '',
                predictionLabel(p),
                idx,
              ].filter(Boolean).join(':')}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickPrediction(p)}
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs font-bold text-black hover:bg-slate-50"
            >
              <MapPin className="mt-0.5 h-4 w-4 text-black" />
              <span className="break-words">{predictionLabel(p)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
