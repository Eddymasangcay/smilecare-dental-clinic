/**
 * SmileCare Dental Clinic — localStorage persistence layer
 *
 * IMPORTANT: localStorage is device- and browser-specific.
 * Data saved here will NOT automatically synchronize between different
 * devices or users. Each browser profile keeps its own independent copy.
 * This is intentional for a static frontend demo with no backend/database.
 *
 * Session stores the logged-in patient ID only in this browser tab/session.
 * Frontend authentication is simulated and is not secure for real PHI.
 */

const SmileCareStorage = (function () {
  const KEY = "smilecare_dental_clinic_v2";
  const LEGACY_KEY = "smilecare_dental_clinic_v1";
  const SESSION_KEY = "smilecare_session_patient_v2";

  function isValidState(obj) {
    return (
      obj &&
      typeof obj === "object" &&
      Array.isArray(obj.patients) &&
      Array.isArray(obj.appointments) &&
      Array.isArray(obj.services)
    );
  }

  function normalizePatient(p, index) {
    if (!p || typeof p !== "object") return null;
    const id = String(p.id || `PAT-${1000 + index}`);
    const fullName = String(p.fullName || "Patient").trim() || "Patient";
    const baseUser = fullName.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "") || `user${index}`;
    return {
      id,
      username: String(p.username || baseUser).trim().toLowerCase(),
      password: String(p.password || "smilecare123"),
      fullName,
      age: Number(p.age) > 0 ? Number(p.age) : 18,
      gender: ["Female", "Male", "Other"].includes(p.gender) ? p.gender : "Other",
      contact: String(p.contact || "").trim(),
      email: String(p.email || "").trim(),
      address: String(p.address || "").trim(),
    };
  }

  function normalizeAppointment(a) {
    if (!a || typeof a !== "object") return null;
    const status = ["Pending", "Confirmed", "Completed", "Cancelled"].includes(a.status)
      ? a.status
      : "Pending";
    return {
      id: String(a.id || ""),
      patientName: String(a.patientName || ""),
      contact: String(a.contact || ""),
      patientId: String(a.patientId || ""),
      service: String(a.service || ""),
      date: String(a.date || ""),
      time: String(a.time || ""),
      status,
      remarks: String(a.remarks || ""),
      updatedAt: Number(a.updatedAt) || Date.now(),
    };
  }

  function normalize(raw) {
    const seed = SmileCareData.createSeedState();
    if (!isValidState(raw)) return seed;

    const patients = (raw.patients || []).map(normalizePatient).filter(Boolean);
    const appointments = (raw.appointments || []).map(normalizeAppointment).filter((a) => a && a.id);
    const services =
      Array.isArray(raw.services) && raw.services.length
        ? raw.services
            .filter((s) => s && s.id && s.name)
            .map((s) => ({
              id: String(s.id),
              name: String(s.name),
              description: String(s.description || ""),
              price: Math.max(0, Number(s.price) || 0),
            }))
        : seed.services;

    return {
      version: SmileCareData.STORAGE_VERSION,
      services,
      patients: patients.length ? patients : seed.patients,
      appointments: appointments.length ? appointments : seed.appointments,
      preferences: {
        ...seed.preferences,
        ...(raw.preferences && typeof raw.preferences === "object" ? raw.preferences : {}),
      },
      counters: {
        ...seed.counters,
        ...(raw.counters && typeof raw.counters === "object" ? raw.counters : {}),
      },
    };
  }

  function load() {
    try {
      let raw = localStorage.getItem(KEY);
      if (!raw) {
        // One-time migration from v1 staff demo store if present
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          try {
            const parsedLegacy = JSON.parse(legacy);
            const migrated = normalize(parsedLegacy);
            // Ensure demo patients have login credentials after migration
            migrated.patients = migrated.patients.map((p, i) => normalizePatient(p, i));
            save(migrated);
            try {
              localStorage.removeItem(LEGACY_KEY);
            } catch (_) {
              /* ignore */
            }
            return migrated;
          } catch (_) {
            /* fall through to seed */
          }
        }
        const seed = SmileCareData.createSeedState();
        save(seed);
        return seed;
      }
      const parsed = JSON.parse(raw);
      const normalized = normalize(parsed);
      // Persist normalized shape if corrupted/partial data was repaired
      save(normalized);
      return normalized;
    } catch (err) {
      console.warn("SmileCare: failed to read localStorage, using seed data.", err);
      const seed = SmileCareData.createSeedState();
      save(seed);
      return seed;
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      console.error("SmileCare: failed to write localStorage.", err);
      return false;
    }
  }

  function reset() {
    const seed = SmileCareData.createSeedState();
    save(seed);
    return seed;
  }

  function getSessionPatientId() {
    try {
      const id = sessionStorage.getItem(SESSION_KEY);
      return id && id.trim() ? id.trim() : null;
    } catch {
      return null;
    }
  }

  function setSessionPatientId(patientId) {
    try {
      if (patientId) sessionStorage.setItem(SESSION_KEY, String(patientId));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* private mode may block sessionStorage */
    }
  }

  function clearLegacySession() {
    try {
      sessionStorage.removeItem("smilecare_session_v1");
    } catch (_) {
      /* ignore */
    }
  }

  return {
    KEY,
    load,
    save,
    reset,
    getSessionPatientId,
    setSessionPatientId,
    clearLegacySession,
  };
})();
