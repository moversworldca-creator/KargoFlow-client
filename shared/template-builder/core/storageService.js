/**
 * Storage & Media Optimization Service for KargoFlow
 *
 * Implements:
 * 1. Image compression (canvas-based downscaling + WebP/JPEG optimization) to prevent quota blowout.
 * 2. Dual-tier storage engine (IndexedDB primary with LocalStorage fallback) to prevent 5MB storage crashes.
 */

export const STORAGE_KEY = "kargoflow-template-v2";
export const LIBRARY_KEY = "kargoflow-template-library-v1";
const DB_NAME = "kargoflow_db";
const DB_VERSION = 1;
const STORE_NAME = "templates";

export async function compressImageFile(
  file,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85
) {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    !window.HTMLCanvasElement
  ) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      const testCanvas = document.createElement("canvas");
      if (!testCanvas.getContext || !testCanvas.getContext("2d")) {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      let finished = false;
      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          resolve(dataUrl);
        }
      }, 500);

      img.onerror = () => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve(dataUrl);
        }
      };

      img.onload = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);

        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            maxHeight = height;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const isPng = file.type === "image/png" || file.name.endsWith(".png");
        const mimeType = isPng ? "image/png" : "image/jpeg";
        const compressedDataUrl = canvas.toDataURL(mimeType, quality);
        resolve(compressedDataUrl);
      };

      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

function openDatabase() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (e) => {
        resolve(e.target.result);
      };
      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

export async function idbGet(key) {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbSet(key, value) {
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function idbDelete(key) {
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Saves document into IndexedDB and LocalStorage fallback
 */
export async function saveDocument(doc) {
  let idbSuccess = false;
  try {
    idbSuccess = await idbSet(STORAGE_KEY, doc);
  } catch {
    idbSuccess = false;
  }

  let lsSuccess = false;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
      lsSuccess = true;
    }
  } catch {
    lsSuccess = false;
  }

  if (idbSuccess) return { success: true, storageType: "indexeddb" };
  if (lsSuccess) return { success: true, storageType: "localstorage" };
  return {
    success: false,
    storageType: "memory",
    error: "Browser storage is full or disabled. Please export template as JSON.",
  };
}

/**
 * Loads document synchronously from LocalStorage
 */
export function loadDocumentSync() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Saves template library (up to 25 templates)
 */
export async function saveLibrary(library) {
  let idbSuccess = false;
  try {
    idbSuccess = await idbSet(LIBRARY_KEY, library);
  } catch {
    idbSuccess = false;
  }

  let lsSuccess = false;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
      lsSuccess = true;
    }
  } catch {
    lsSuccess = false;
  }

  if (idbSuccess) return { success: true, storageType: "indexeddb" };
  if (lsSuccess) return { success: true, storageType: "localstorage" };
  return {
    success: false,
    storageType: "memory",
    error: "Could not save to library. Export templates as JSON backups.",
  };
}

/**
 * Synchronous loader for template library
 */
export function loadLibrarySync() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(LIBRARY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Async loader for template library (IndexedDB primary)
 */
export async function loadLibraryAsync() {
  try {
    const fromIdb = await idbGet(LIBRARY_KEY);
    if (Array.isArray(fromIdb)) return fromIdb;
  } catch {
    // fallback
  }
  return loadLibrarySync();
}
