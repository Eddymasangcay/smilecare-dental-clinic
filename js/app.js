/**
 * SmileCare Dental Clinic — Patient portal application logic
 * Vanilla JS SPA-style views with localStorage persistence (no backend).
 *
 * IMPORTANT: localStorage is device- and browser-specific. Data will not
 * automatically synchronize between different devices or users.
 *
 * Frontend authentication is simulated and is NOT secure for real patient data.
 * Each logged-in patient only sees and manages their own appointments/profile.
 */

(function () {
  "use strict";

  let state = SmileCareStorage.load();
  let currentUserId = SmileCareStorage.getSessionPatientId();
  let currentView = "dashboard";
  let editingId = null;
  let selectedSlot = null;
  let preferredService = "";
  let confirmCallback = null;
  let toastTimer = null;
  let memorySessionId = null; // fallback if sessionStorage is blocked

  const VIEW_TITLES = {
    dashboard: "Home",
    appointments: "My Appointments",
    services: "Services",
    profile: "My Profile",
    settings: "Settings",
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- Utils ---------- */
  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatDisplayDate(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    return new Date(y, m - 1, d).toLocaleDateString("en-PH", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatLongDate(date = new Date()) {
    return date.toLocaleDateString("en-PH", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning,";
    if (h < 17) return "Good afternoon,";
    return "Good evening,";
  }

  function formatMoney(n) {
    return "₱" + Number(n || 0).toLocaleString("en-PH");
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function persist() {
    return SmileCareStorage.save(state);
  }

  function nextId(kind) {
    state.counters = state.counters || {};
    state.counters[kind] = (state.counters[kind] || 0) + 1;
    const n = state.counters[kind];
    if (kind === "patient") return `PAT-${n}`;
    if (kind === "appointment") return `APT-${n}`;
    if (kind === "service") return `SRV-${String(n).padStart(3, "0")}`;
    return `ID-${n}`;
  }

  function showToast(message, type = "success") {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
  }

  function isValidEmail(email) {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function sanitizeUsername(u) {
    return String(u || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .slice(0, 40);
  }

  /* ---------- Auth / current user ---------- */
  function getSessionId() {
    return SmileCareStorage.getSessionPatientId() || memorySessionId;
  }

  function setSessionId(id) {
    currentUserId = id;
    memorySessionId = id;
    SmileCareStorage.setSessionPatientId(id);
  }

  function clearSession() {
    currentUserId = null;
    memorySessionId = null;
    SmileCareStorage.setSessionPatientId(null);
  }

  function currentUser() {
    const id = getSessionId();
    if (!id) return null;
    return state.patients.find((p) => p.id === id) || null;
  }

  function requireUser() {
    const user = currentUser();
    if (!user) {
      logout(false);
      return null;
    }
    return user;
  }

  function myAppointments() {
    const user = currentUser();
    if (!user) return [];
    return state.appointments.filter((a) => a.patientId === user.id);
  }

  function ownsAppointment(id) {
    const user = currentUser();
    if (!user) return false;
    const a = state.appointments.find((x) => x.id === id);
    return !!(a && a.patientId === user.id);
  }

  function login(username, password) {
    const u = sanitizeUsername(username);
    const patient = state.patients.find(
      (p) => sanitizeUsername(p.username) === u && String(p.password) === String(password)
    );
    if (!patient) return false;
    setSessionId(patient.id);
    return true;
  }

  function registerAccount(payload) {
    const username = sanitizeUsername(payload.username);
    if (!username || username.length < 3) {
      return { ok: false, error: "Username must be at least 3 characters (letters/numbers)." };
    }
    if (state.patients.some((p) => sanitizeUsername(p.username) === username)) {
      return { ok: false, error: "That username is already taken. Choose another." };
    }
    if (!payload.fullName || !payload.contact || !payload.password) {
      return { ok: false, error: "Please complete all required fields." };
    }
    if (String(payload.password).length < 6) {
      return { ok: false, error: "Password must be at least 6 characters." };
    }
    const age = Number(payload.age);
    if (!age || age < 1 || age > 120) {
      return { ok: false, error: "Please enter a valid age (1–120)." };
    }
    if (!isValidEmail(payload.email)) {
      return { ok: false, error: "Please enter a valid email address." };
    }

    const id = nextId("patient");
    const patient = {
      id,
      username,
      password: String(payload.password),
      fullName: String(payload.fullName).trim().slice(0, 80),
      age,
      gender: payload.gender || "Other",
      contact: String(payload.contact).trim().slice(0, 30),
      email: String(payload.email || "").trim().slice(0, 100),
      address: String(payload.address || "").trim().slice(0, 200),
    };
    state.patients.unshift(patient);
    persist();
    setSessionId(id);
    return { ok: true, patient };
  }

  function logout(showMessage = true) {
    clearSession();
    closeModal();
    closeConfirm();
    $("#app").classList.add("hidden");
    $("#app").setAttribute("aria-hidden", "true");
    $("#login-screen").classList.remove("hidden");
    $("#login-form")?.reset();
    $("#register-form")?.reset();
    $("#login-error")?.classList.add("hidden");
    $("#register-error")?.classList.add("hidden");
    switchAuthTab("login");
    if (showMessage) showToast("You have been logged out");
  }

  function enterApp() {
    if (!requireUser()) return;
    $("#login-screen").classList.add("hidden");
    $("#app").classList.remove("hidden");
    $("#app").setAttribute("aria-hidden", "false");
    applyPreferences();
    navigate("dashboard");
  }

  function switchAuthTab(tab) {
    const isLogin = tab === "login";
    $("#tab-login")?.classList.toggle("active", isLogin);
    $("#tab-register")?.classList.toggle("active", !isLogin);
    $("#tab-login")?.setAttribute("aria-selected", String(isLogin));
    $("#tab-register")?.setAttribute("aria-selected", String(!isLogin));
    $("#login-form")?.classList.toggle("hidden", !isLogin);
    $("#register-form")?.classList.toggle("hidden", isLogin);
    $("#login-error")?.classList.add("hidden");
    $("#register-error")?.classList.add("hidden");
  }

  function togglePassword(inputId, btn) {
    const input = $(inputId);
    if (!input || !btn) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.querySelector(".icon-eye")?.classList.toggle("hidden", show);
    btn.querySelector(".icon-eye-off")?.classList.toggle("hidden", !show);
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
  }

  /* ---------- Navigation ---------- */
  function navigate(view) {
    if (!requireUser()) return;
    if (!VIEW_TITLES[view]) view = "dashboard";
    currentView = view;
    $$(".view").forEach((v) => v.classList.toggle("active", v.dataset.view === view));
    $$(".nav-item").forEach((btn) => {
      const active = btn.dataset.nav === view;
      btn.classList.toggle("active", active);
      if (active) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
    $("#header-subtitle").textContent = VIEW_TITLES[view] || view;

    const addBtn = $("#header-action-btn");
    if (view === "appointments" || view === "services") {
      addBtn.classList.remove("hidden");
      addBtn.setAttribute("aria-label", "Book appointment");
    } else {
      addBtn.classList.add("hidden");
    }

    if (view === "dashboard") renderDashboard();
    if (view === "appointments") renderAppointments();
    if (view === "services") renderServices();
    if (view === "profile") renderProfile();
    if (view === "settings") renderSettings();
    window.scrollTo(0, 0);
  }

  function handleHeaderAction() {
    openAppointmentForm();
  }

  /* ---------- Dashboard (patient-scoped) ---------- */
  function getMyStats() {
    const today = todayISO();
    const appts = myAppointments();
    return {
      total: appts.length,
      upcoming: appts.filter(
        (a) => a.date >= today && (a.status === "Pending" || a.status === "Confirmed")
      ).length,
      pending: appts.filter((a) => a.status === "Pending").length,
      completed: appts.filter((a) => a.status === "Completed").length,
    };
  }

  function getMyUpcoming() {
    const today = todayISO();
    return myAppointments()
      .filter((a) => a.date >= today && (a.status === "Pending" || a.status === "Confirmed"))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 5);
  }

  function getMyRecentActivity() {
    return myAppointments()
      .slice()
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 5)
      .map((a) => ({
        text: `${a.status}: ${a.service} · ${a.id}`,
        time: a.updatedAt ? relativeTime(a.updatedAt) : formatDisplayDate(a.date),
      }));
  }

  function relativeTime(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  }

  function renderDashboard() {
    const user = requireUser();
    if (!user) return;
    $("#welcome-greeting").textContent = greeting();
    $("#welcome-name").textContent = user.fullName;
    $("#current-date").textContent = formatLongDate();

    const stats = getMyStats();
    $("#stat-total").textContent = stats.total;
    $("#stat-upcoming").textContent = stats.upcoming;
    $("#stat-pending").textContent = stats.pending;
    $("#stat-completed").textContent = stats.completed;

    const list = $("#upcoming-list");
    const upcoming = getMyUpcoming();
    if (!upcoming.length) {
      list.innerHTML = `<div class="empty-state"><strong>No upcoming appointments</strong><p>Book a visit from Services or tap +.</p></div>`;
    } else {
      list.innerHTML = upcoming.map(apptCardHtml).join("");
    }

    const activity = $("#activity-list");
    const items = getMyRecentActivity();
    if (!items.length) {
      activity.innerHTML = `<div class="empty-state"><p>No recent activity yet.</p></div>`;
    } else {
      activity.innerHTML = items
        .map(
          (a) => `
        <div class="activity-item">
          <span class="activity-dot" aria-hidden="true"></span>
          <div>
            <p>${escapeHtml(a.text)}</p>
            <small>${escapeHtml(a.time)}</small>
          </div>
        </div>`
        )
        .join("");
    }
  }

  /* ---------- Appointments (own only) ---------- */
  function apptCardHtml(a) {
    const statusClass = `badge-${String(a.status).toLowerCase()}`;
    return `
      <button type="button" class="appt-card" data-appt-id="${escapeHtml(a.id)}"
        onclick="window.SmileCareApp.openAppointmentDetail('${escapeHtml(a.id)}')">
        <div class="appt-card-top">
          <h4>${escapeHtml(a.service)}</h4>
          <span class="badge ${statusClass}">${escapeHtml(a.status)}</span>
        </div>
        <div class="appt-meta">
          <span>${escapeHtml(a.id)}</span>
          <span>${escapeHtml(formatDisplayDate(a.date))}</span>
          <span>${escapeHtml(a.time)}</span>
        </div>
      </button>`;
  }

  function getFilteredAppointments() {
    const q = ($("#appt-search")?.value || "").trim().toLowerCase();
    const status = $("#appt-filter-status")?.value || "all";
    const date = $("#appt-filter-date")?.value || "";

    return myAppointments()
      .filter((a) => {
        if (status !== "all" && a.status !== status) return false;
        if (date && a.date !== date) return false;
        if (!q) return true;
        const hay = `${a.id} ${a.service} ${a.status} ${a.remarks} ${a.date} ${a.time}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }

  function renderAppointments() {
    const list = $("#appointments-list");
    const items = getFilteredAppointments();
    if (!items.length) {
      list.innerHTML = `<div class="empty-state"><strong>No appointments found</strong><p>Book a new appointment to get started.</p></div>`;
      return;
    }
    list.innerHTML = items.map(apptCardHtml).join("");
  }

  /** Clinic-wide conflict check (any patient's active booking on same slot). */
  function isSlotTaken(date, time, excludeId = null) {
    return state.appointments.some(
      (a) =>
        a.id !== excludeId &&
        a.date === date &&
        a.time === time &&
        a.status !== "Cancelled"
    );
  }

  function openAppointmentForm(editId = null, serviceName = "") {
    const user = requireUser();
    if (!user) return;

    if (editId && !ownsAppointment(editId)) {
      showToast("You can only manage your own appointments", "error");
      return;
    }

    editingId = editId;
    selectedSlot = null;
    const appt = editId ? state.appointments.find((a) => a.id === editId) : null;
    if (appt) selectedSlot = appt.time;
    preferredService = serviceName || appt?.service || preferredService || "";

    const serviceOptions = state.services
      .map(
        (s) =>
          `<option value="${escapeHtml(s.name)}" ${
            preferredService === s.name ? "selected" : ""
          }>${escapeHtml(s.name)}</option>`
      )
      .join("");

    const isEdit = !!editId;
    $("#modal-title").textContent = isEdit ? "Reschedule Appointment" : "Book Appointment";
    $("#modal-body").innerHTML = `
      <form id="appt-form" class="form-grid" novalidate>
        <div class="field">
          <label>Patient</label>
          <input type="text" value="${escapeHtml(user.fullName)}" disabled />
          <p class="field-hint">Bookings are linked to your account only.</p>
        </div>
        <div class="field">
          <label for="appt-service">Dental service *</label>
          <select id="appt-service" required>
            <option value="">Select service</option>
            ${serviceOptions}
          </select>
        </div>
        <div class="field">
          <label for="appt-date">Date *</label>
          <input id="appt-date" type="date" required min="${todayISO()}"
            value="${escapeHtml(appt?.date && appt.date >= todayISO() ? appt.date : todayISO())}" />
        </div>
        <div class="field">
          <label>Time slot *</label>
          <div id="slot-grid" class="slot-grid"></div>
          <p id="slot-error" class="field-error hidden">Please select an available time slot.</p>
        </div>
        <div class="field">
          <label for="appt-remarks">Notes</label>
          <textarea id="appt-remarks" maxlength="300" placeholder="Symptoms, preferences, or notes">${escapeHtml(
            appt?.remarks || ""
          )}</textarea>
        </div>
        <p id="appt-form-error" class="form-error hidden"></p>
      </form>`;

    $("#modal-footer").innerHTML = `
      <button type="button" class="btn btn-primary btn-block"
        onclick="window.SmileCareApp.saveAppointment()">
        ${isEdit ? "Save Reschedule" : "Confirm Booking"}
      </button>`;

    openModal();
    renderSlots();
    $("#appt-date").onchange = () => {
      selectedSlot = null;
      renderSlots();
    };
  }

  function selectSlot(slotOrBtn) {
    const slot = typeof slotOrBtn === "string" ? slotOrBtn : slotOrBtn?.dataset?.slot;
    if (!slot) return;
    if (typeof slotOrBtn !== "string" && slotOrBtn?.disabled) return;
    selectedSlot = slot;
    $("#slot-error")?.classList.add("hidden");
    renderSlots();
  }

  function renderSlots() {
    const date = $("#appt-date")?.value;
    const grid = $("#slot-grid");
    if (!grid) return;
    grid.innerHTML = SmileCareData.TIME_SLOTS.map((slot) => {
      const taken = date ? isSlotTaken(date, slot, editingId) : false;
      const selected = selectedSlot === slot;
      return `<button type="button" class="slot-btn ${selected ? "selected" : ""}"
        data-slot="${escapeHtml(slot)}" ${taken ? "disabled" : ""}
        onclick="window.SmileCareApp.selectSlot(this)">${escapeHtml(slot)}</button>`;
    }).join("");
  }

  function saveAppointment() {
    const user = requireUser();
    if (!user) return;

    if (editingId && !ownsAppointment(editingId)) {
      showToast("You can only manage your own appointments", "error");
      return;
    }

    const service = $("#appt-service")?.value || "";
    const date = $("#appt-date")?.value || "";
    const remarks = ($("#appt-remarks")?.value || "").trim().slice(0, 300);
    const err = $("#appt-form-error");
    err?.classList.add("hidden");
    $("#slot-error")?.classList.add("hidden");

    if (!service || !date) {
      if (err) {
        err.textContent = "Please select a service and date.";
        err.classList.remove("hidden");
      }
      return;
    }
    if (date < todayISO()) {
      if (err) {
        err.textContent = "Please choose today or a future date.";
        err.classList.remove("hidden");
      }
      return;
    }
    if (!selectedSlot) {
      $("#slot-error")?.classList.remove("hidden");
      return;
    }
    if (isSlotTaken(date, selectedSlot, editingId)) {
      if (err) {
        err.textContent = "That time slot is already booked. Please choose another.";
        err.classList.remove("hidden");
      }
      return;
    }

    if (editingId) {
      const idx = state.appointments.findIndex((a) => a.id === editingId && a.patientId === user.id);
      if (idx === -1) {
        showToast("Appointment not found", "error");
        return;
      }
      const prev = state.appointments[idx];
      state.appointments[idx] = {
        ...prev,
        patientName: user.fullName,
        contact: user.contact,
        patientId: user.id,
        service,
        date,
        time: selectedSlot,
        status: prev.status === "Cancelled" ? "Pending" : prev.status === "Completed" ? "Pending" : prev.status,
        remarks,
        updatedAt: Date.now(),
      };
      persist();
      closeModal();
      showToast(`Appointment updated · ${editingId}`);
    } else {
      const id = nextId("appointment");
      state.appointments.unshift({
        id,
        patientName: user.fullName,
        contact: user.contact,
        patientId: user.id,
        service,
        date,
        time: selectedSlot,
        status: "Pending",
        remarks,
        updatedAt: Date.now(),
      });
      persist();
      closeModal();
      showToast(`Booking confirmed · Ref ${id}`);
    }
    preferredService = "";
    editingId = null;
    selectedSlot = null;
    refreshAll();
  }

  function openAppointmentDetail(id) {
    if (!ownsAppointment(id)) {
      showToast("You can only view your own appointments", "error");
      return;
    }
    const a = state.appointments.find((x) => x.id === id);
    if (!a) return;
    editingId = id;
    const canModify = a.status === "Pending" || a.status === "Confirmed";

    $("#modal-title").textContent = "Appointment Details";
    $("#modal-body").innerHTML = `
      <dl class="detail-grid">
        <div><dt>Reference No.</dt><dd>${escapeHtml(a.id)}</dd></div>
        <div><dt>Service</dt><dd>${escapeHtml(a.service)}</dd></div>
        <div><dt>Date</dt><dd>${escapeHtml(formatDisplayDate(a.date))}</dd></div>
        <div><dt>Time</dt><dd>${escapeHtml(a.time)}</dd></div>
        <div><dt>Status</dt><dd><span class="badge badge-${String(a.status).toLowerCase()}">${escapeHtml(
          a.status
        )}</span></dd></div>
        <div><dt>Notes</dt><dd>${escapeHtml(a.remarks || "—")}</dd></div>
      </dl>`;

    $("#modal-footer").innerHTML = canModify
      ? `<div class="btn-row">
          <button type="button" class="btn btn-outline" onclick="window.SmileCareApp.openAppointmentForm('${escapeHtml(
            id
          )}')">Reschedule</button>
          <button type="button" class="btn btn-danger" onclick="window.SmileCareApp.cancelAppointment('${escapeHtml(
            id
          )}')">Cancel</button>
        </div>`
      : `<button type="button" class="btn btn-outline btn-block" onclick="window.SmileCareApp.closeModal()">Close</button>`;

    openModal();
  }

  function cancelAppointment(id) {
    if (!ownsAppointment(id)) {
      showToast("You can only cancel your own appointments", "error");
      return;
    }
    const a = state.appointments.find((x) => x.id === id);
    if (!a) return;
    if (a.status === "Cancelled" || a.status === "Completed") {
      showToast("This appointment cannot be cancelled", "error");
      return;
    }
    askConfirm("Cancel appointment?", `Cancel ${a.id} (${a.service}) on ${formatDisplayDate(a.date)}?`, () => {
      const idx = state.appointments.findIndex((x) => x.id === id);
      if (idx === -1) return;
      state.appointments[idx].status = "Cancelled";
      state.appointments[idx].updatedAt = Date.now();
      persist();
      closeModal();
      showToast("Appointment cancelled");
      refreshAll();
    });
  }

  /* ---------- Services (browse + book) ---------- */
  function renderServices() {
    const list = $("#services-list");
    if (!state.services.length) {
      list.innerHTML = `<div class="empty-state"><strong>No services available</strong></div>`;
      return;
    }
    list.innerHTML = state.services
      .map((s) => {
        const safeName = JSON.stringify(s.name);
        return `
      <article class="service-card">
        <h4>${escapeHtml(s.name)}</h4>
        <span class="service-price">${formatMoney(s.price)}</span>
        <p>${escapeHtml(s.description)}</p>
        <div class="service-actions">
          <button type="button" class="btn btn-primary btn-sm"
            onclick='window.SmileCareApp.bookService(${safeName})'>Book this</button>
        </div>
      </article>`;
      })
      .join("");
  }

  function bookService(name) {
    preferredService = name;
    openAppointmentForm(null, name);
  }

  /* ---------- Profile (own only) ---------- */
  function renderProfile() {
    const user = requireUser();
    if (!user) return;
    $("#profile-card").innerHTML = `
      <dl>
        <div><dt>Patient ID</dt><dd>${escapeHtml(user.id)}</dd></div>
        <div><dt>Full name</dt><dd>${escapeHtml(user.fullName)}</dd></div>
        <div><dt>Username</dt><dd>${escapeHtml(user.username)}</dd></div>
        <div><dt>Age</dt><dd>${escapeHtml(String(user.age))}</dd></div>
        <div><dt>Gender</dt><dd>${escapeHtml(user.gender)}</dd></div>
        <div><dt>Contact</dt><dd>${escapeHtml(user.contact)}</dd></div>
        <div><dt>Email</dt><dd>${escapeHtml(user.email || "—")}</dd></div>
        <div><dt>Address</dt><dd>${escapeHtml(user.address || "—")}</dd></div>
      </dl>`;
  }

  function openProfileEditor() {
    const user = requireUser();
    if (!user) return;
    $("#modal-title").textContent = "Edit Profile";
    $("#modal-body").innerHTML = `
      <form id="profile-form" class="form-grid" novalidate>
        <div class="field">
          <label for="prof-name">Full name *</label>
          <input id="prof-name" type="text" maxlength="80" required value="${escapeHtml(user.fullName)}" />
        </div>
        <div class="field-row">
          <div class="field">
            <label for="prof-age">Age *</label>
            <input id="prof-age" type="number" min="1" max="120" required value="${escapeHtml(String(user.age))}" />
          </div>
          <div class="field">
            <label for="prof-gender">Gender *</label>
            <select id="prof-gender">
              ${["Female", "Male", "Other"]
                .map((g) => `<option value="${g}" ${user.gender === g ? "selected" : ""}>${g}</option>`)
                .join("")}
            </select>
          </div>
        </div>
        <div class="field">
          <label for="prof-contact">Contact *</label>
          <input id="prof-contact" type="tel" maxlength="30" required value="${escapeHtml(user.contact)}" />
        </div>
        <div class="field">
          <label for="prof-email">Email</label>
          <input id="prof-email" type="email" maxlength="100" value="${escapeHtml(user.email || "")}" />
        </div>
        <div class="field">
          <label for="prof-address">Address</label>
          <textarea id="prof-address" maxlength="200">${escapeHtml(user.address || "")}</textarea>
        </div>
        <div class="field">
          <label for="prof-password">New password (optional)</label>
          <input id="prof-password" type="password" maxlength="64" placeholder="Leave blank to keep current" autocomplete="new-password" />
        </div>
        <p id="profile-form-error" class="form-error hidden"></p>
      </form>`;
    $("#modal-footer").innerHTML = `
      <button type="button" class="btn btn-primary btn-block" onclick="window.SmileCareApp.saveProfile()">Save Profile</button>`;
    openModal();
  }

  function saveProfile() {
    const user = requireUser();
    if (!user) return;
    const err = $("#profile-form-error");
    err?.classList.add("hidden");

    const fullName = ($("#prof-name")?.value || "").trim();
    const age = Number($("#prof-age")?.value);
    const gender = $("#prof-gender")?.value || "Other";
    const contact = ($("#prof-contact")?.value || "").trim();
    const email = ($("#prof-email")?.value || "").trim();
    const address = ($("#prof-address")?.value || "").trim();
    const newPass = $("#prof-password")?.value || "";

    if (!fullName || !contact || !age) {
      if (err) {
        err.textContent = "Please complete all required fields.";
        err.classList.remove("hidden");
      }
      return;
    }
    if (age < 1 || age > 120) {
      if (err) {
        err.textContent = "Please enter a valid age (1–120).";
        err.classList.remove("hidden");
      }
      return;
    }
    if (!isValidEmail(email)) {
      if (err) {
        err.textContent = "Please enter a valid email address.";
        err.classList.remove("hidden");
      }
      return;
    }
    if (newPass && newPass.length < 6) {
      if (err) {
        err.textContent = "New password must be at least 6 characters.";
        err.classList.remove("hidden");
      }
      return;
    }

    const idx = state.patients.findIndex((p) => p.id === user.id);
    if (idx === -1) return;
    state.patients[idx] = {
      ...state.patients[idx],
      fullName: fullName.slice(0, 80),
      age,
      gender,
      contact: contact.slice(0, 30),
      email: email.slice(0, 100),
      address: address.slice(0, 200),
      password: newPass ? newPass : state.patients[idx].password,
    };

    // Keep appointment display names/contacts in sync for this patient only
    state.appointments = state.appointments.map((a) =>
      a.patientId === user.id
        ? { ...a, patientName: state.patients[idx].fullName, contact: state.patients[idx].contact }
        : a
    );

    persist();
    closeModal();
    showToast("Profile updated");
    refreshAll();
  }

  /* ---------- Settings ---------- */
  function renderSettings() {
    const user = requireUser();
    if (!user) return;
    const clinic = SmileCareData.CLINIC_INFO;

    $("#account-card").innerHTML = `
      <dl>
        <div><dt>Name</dt><dd>${escapeHtml(user.fullName)}</dd></div>
        <div><dt>Username</dt><dd>${escapeHtml(user.username)}</dd></div>
        <div><dt>Patient ID</dt><dd>${escapeHtml(user.id)}</dd></div>
        <div><dt>Email</dt><dd>${escapeHtml(user.email || "—")}</dd></div>
      </dl>`;

    $("#clinic-info-card").innerHTML = `
      <dl>
        <div><dt>Clinic</dt><dd>${escapeHtml(clinic.name)}</dd></div>
        <div><dt>Tagline</dt><dd>${escapeHtml(clinic.tagline)}</dd></div>
        <div><dt>Address</dt><dd>${escapeHtml(clinic.address)}</dd></div>
        <div><dt>Phone</dt><dd>${escapeHtml(clinic.phone)}</dd></div>
        <div><dt>Email</dt><dd>${escapeHtml(clinic.email)}</dd></div>
        <div><dt>Hours</dt><dd>${escapeHtml(clinic.hours)}</dd></div>
      </dl>`;

    $("#pref-compact").checked = !!state.preferences.compact;
    $("#pref-confirm-delete").checked = state.preferences.confirmDelete !== false;
  }

  function applyPreferences() {
    document.body.classList.toggle("compact-lists", !!state.preferences?.compact);
  }

  /* ---------- Modal / Confirm ---------- */
  function openModal() {
    $("#modal-overlay").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    $("#modal-overlay").classList.add("hidden");
    $("#modal-body").innerHTML = "";
    $("#modal-footer").innerHTML = "";
    editingId = null;
    selectedSlot = null;
    document.body.style.overflow = "";
  }

  function askConfirm(title, message, onOk) {
    if (state.preferences?.confirmDelete === false) {
      onOk();
      return;
    }
    confirmCallback = onOk;
    $("#confirm-title").textContent = title;
    $("#confirm-message").textContent = message;
    $("#confirm-overlay").classList.remove("hidden");
  }

  function closeConfirm() {
    $("#confirm-overlay").classList.add("hidden");
    confirmCallback = null;
  }

  function refreshAll() {
    if (!currentUser()) return;
    if (currentView === "dashboard") renderDashboard();
    else if (currentView === "appointments") renderAppointments();
    else if (currentView === "services") renderServices();
    else if (currentView === "profile") renderProfile();
    else if (currentView === "settings") renderSettings();
  }

  /* ---------- Events ---------- */
  function bindEvents() {
    $$("[data-auth-tab]").forEach((btn) => {
      btn.addEventListener("click", () => switchAuthTab(btn.dataset.authTab));
    });

    $("#login-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const err = $("#login-error");
      const ok = login($("#login-username").value, $("#login-password").value);
      if (ok) {
        err?.classList.add("hidden");
        enterApp();
        const user = currentUser();
        showToast(`Welcome back, ${user?.fullName?.split(" ")[0] || "patient"}`);
      } else {
        if (err) {
          err.textContent = "Invalid username or password. Try a demo account below.";
          err.classList.remove("hidden");
        }
      }
    });

    $("#register-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const err = $("#register-error");
      const result = registerAccount({
        fullName: $("#reg-fullname").value,
        age: $("#reg-age").value,
        gender: $("#reg-gender").value,
        contact: $("#reg-contact").value,
        email: $("#reg-email").value,
        address: $("#reg-address").value,
        username: $("#reg-username").value,
        password: $("#reg-password").value,
      });
      if (result.ok) {
        err?.classList.add("hidden");
        enterApp();
        showToast("Account created — you're signed in");
      } else if (err) {
        err.textContent = result.error;
        err.classList.remove("hidden");
      }
    });

    $("#toggle-password")?.addEventListener("click", () =>
      togglePassword("#login-password", $("#toggle-password"))
    );
    $("#toggle-reg-password")?.addEventListener("click", () =>
      togglePassword("#reg-password", $("#toggle-reg-password"))
    );

    $$(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => navigate(btn.dataset.nav));
    });

    document.addEventListener("click", (e) => {
      const navBtn = e.target.closest("[data-nav]");
      if (navBtn && !navBtn.classList.contains("nav-item")) {
        navigate(navBtn.dataset.nav);
      }
    });

    $("#modal-close")?.addEventListener("click", closeModal);
    $("#modal-overlay")?.addEventListener("click", (e) => {
      if (e.target.id === "modal-overlay") closeModal();
    });

    $("#confirm-cancel")?.addEventListener("click", closeConfirm);
    $("#confirm-ok")?.addEventListener("click", () => {
      const cb = confirmCallback;
      closeConfirm();
      if (cb) cb();
    });
    $("#confirm-overlay")?.addEventListener("click", (e) => {
      if (e.target.id === "confirm-overlay") closeConfirm();
    });

    $("#appt-search")?.addEventListener("input", renderAppointments);
    $("#appt-filter-status")?.addEventListener("change", renderAppointments);
    $("#appt-filter-date")?.addEventListener("change", renderAppointments);
    $("#appt-clear-filters")?.addEventListener("click", () => {
      if ($("#appt-search")) $("#appt-search").value = "";
      if ($("#appt-filter-status")) $("#appt-filter-status").value = "all";
      if ($("#appt-filter-date")) $("#appt-filter-date").value = "";
      renderAppointments();
    });

    $("#pref-compact")?.addEventListener("change", (e) => {
      state.preferences.compact = e.target.checked;
      persist();
      applyPreferences();
    });

    $("#pref-confirm-delete")?.addEventListener("change", (e) => {
      state.preferences.confirmDelete = e.target.checked;
      persist();
    });

    $("#btn-reset-data")?.addEventListener("click", () => {
      askConfirm(
        "Reset demonstration data?",
        "This restores sample patients and appointments and signs you out. Current demo changes on this device will be lost.",
        () => {
          state = SmileCareStorage.reset();
          clearSession();
          applyPreferences();
          logout(false);
          showToast("Demonstration data restored");
        }
      );
    });

    $("#btn-logout")?.addEventListener("click", () => logout(true));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!$("#confirm-overlay").classList.contains("hidden")) closeConfirm();
        else if (!$("#modal-overlay").classList.contains("hidden")) closeModal();
      }
    });
  }

  /* ---------- Boot ---------- */
  window.SmileCareApp = {
    navigate,
    handleHeaderAction,
    openAppointmentForm,
    openAppointmentDetail,
    selectSlot,
    saveAppointment,
    cancelAppointment,
    bookService,
    openProfileEditor,
    saveProfile,
    closeModal,
    getState: () => state,
    currentUser,
    myAppointments,
    refreshAll,
  };

  function init() {
    SmileCareStorage.clearLegacySession();
    bindEvents();
    const sid = getSessionId();
    if (sid && state.patients.some((p) => p.id === sid)) {
      currentUserId = sid;
      enterApp();
    } else {
      clearSession();
      $("#login-screen").classList.remove("hidden");
      $("#app").classList.add("hidden");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
