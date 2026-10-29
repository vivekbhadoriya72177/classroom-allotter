const elements = {
  systemStatus: document.querySelector("#system-status"),
  totalRooms: document.querySelector("#total-rooms"),
  roomsInUse: document.querySelector("#rooms-in-use"),
  recentReports: document.querySelector("#recent-reports"),
  searchForm: document.querySelector("#search-form"),
  searchDate: document.querySelector("#search-date"),
  searchStart: document.querySelector("#search-start"),
  searchEnd: document.querySelector("#search-end"),
  buildingFilter: document.querySelector("#building-filter"),
  resultsCount: document.querySelector("#results-count"),
  resultsWindow: document.querySelector("#results-window"),
  roomResults: document.querySelector("#room-results"),
  bookingForm: document.querySelector("#booking-form"),
  reportForm: document.querySelector("#report-form"),
  activityList: document.querySelector("#activity-list"),
  refreshActivity: document.querySelector("#refresh-activity"),
  toast: document.querySelector("#toast"),
};

let rooms = [];
let toastTimer;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function dateInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timeInputValue(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dateTimeInputValue(date) {
  return `${dateInputValue(date)}T${timeInputValue(date)}`;
}

function roundToNextHalfHour(date) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  rounded.setMinutes(Math.ceil((rounded.getMinutes() + 1) / 30) * 30);
  return rounded;
}

function setDefaultTimes() {
  let start = roundToNextHalfHour(new Date());

  if (start.getHours() >= 20 || start.getHours() < 7) {
    start.setDate(start.getDate() + (start.getHours() >= 20 ? 1 : 0));
    start.setHours(9, 0, 0, 0);
  }

  const end = new Date(start.getTime() + 60 * 60 * 1000);
  elements.searchDate.value = dateInputValue(start);
  elements.searchStart.value = timeInputValue(start);
  elements.searchEnd.value = timeInputValue(end);
  elements.bookingForm.elements.start.value = dateTimeInputValue(start);
  elements.bookingForm.elements.end.value = dateTimeInputValue(end);
}

function showToast(message, type = "success") {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.className = `toast visible ${type === "error" ? "error" : ""}`;
  toastTimer = setTimeout(() => {
    elements.toast.className = "toast";
  }, 4_000);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function relativeMinutes(value) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  return minutes < 1 ? "just now" : `${minutes}m ago`;
}

function intervalFromSearchForm() {
  const date = elements.searchDate.value;
  const start = new Date(`${date}T${elements.searchStart.value}:00`);
  const end = new Date(`${date}T${elements.searchEnd.value}:00`);
  return { start, end };
}

async function checkHealth() {
  try {
    await fetchJson("/api/health");
    elements.systemStatus.className = "system-status online";
    elements.systemStatus.lastChild.textContent = " System online";
  } catch {
    elements.systemStatus.className = "system-status offline";
    elements.systemStatus.lastChild.textContent = " System unavailable";
  }
}

async function loadOverview() {
  try {
    const { overview } = await fetchJson("/api/overview");
    elements.totalRooms.textContent = overview.total_rooms;
    elements.roomsInUse.textContent = overview.rooms_in_use;
    elements.recentReports.textContent = overview.recent_reports;
  } catch {
    elements.totalRooms.textContent = "—";
  }
}

async function loadRooms() {
  const data = await fetchJson("/api/rooms");
  rooms = data.rooms;
  const roomOptions = rooms
    .map((room) => `<option value="${room.id}">${escapeHtml(room.code)} · ${room.capacity} seats</option>`)
    .join("");

  document.querySelectorAll(".room-select").forEach((select) => {
    const selectedValue = select.value;
    select.innerHTML = roomOptions;
    if (selectedValue) select.value = selectedValue;
  });

  const buildings = [...new Set(rooms.map((room) => room.building))].sort();
  elements.buildingFilter.insertAdjacentHTML(
    "beforeend",
    buildings.map((building) => `<option value="${escapeHtml(building)}">${escapeHtml(building)}</option>`).join(""),
  );
}

function renderRooms(data) {
  elements.resultsCount.textContent = `${data.count} ${data.count === 1 ? "room" : "rooms"} available`;
  elements.resultsWindow.textContent = `${formatDateTime(data.interval.start)} — ${formatTime(data.interval.end)}`;

  if (!data.rooms.length) {
    elements.roomResults.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">×</span>
        <h3>No room is free for every minute of that interval</h3>
        <p>Try a different time, reduce capacity, or remove a facility filter.</p>
      </div>
    `;
    return;
  }

  elements.roomResults.innerHTML = data.rooms
    .map((room) => {
      const facilities = room.facilities.length
        ? room.facilities.map((facility) => `<span>${escapeHtml(facility)}</span>`).join("")
        : "<span>standard room</span>";
      const report = room.recentEmptyReport
        ? `<div class="report-signal">Reported empty ${relativeMinutes(room.recentEmptyReport.observedAt)} by ${escapeHtml(room.recentEmptyReport.reporterName)}</div>`
        : "";

      return `
        <article class="room-card">
          <div class="room-card-top">
            <div><h3>${escapeHtml(room.code)}</h3><p class="room-building">${escapeHtml(room.building)}</p></div>
            <span class="capacity-badge">${room.capacity} seats</span>
          </div>
          <div class="verified-row"><i>✓</i> Timetable and bookings are clear</div>
          <div class="facility-list">${facilities}</div>
          ${report}
          <div class="room-card-actions">
            <small>Full interval verified</small>
            <button class="book-room" type="button" data-room-id="${room.id}">Use this room</button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function searchRooms(event) {
  event?.preventDefault();
  const button = elements.searchForm.querySelector("button");
  const formData = new FormData(elements.searchForm);
  const { start, end } = intervalFromSearchForm();

  if (end <= start) {
    showToast("The end time must be later than the start time.", "error");
    return;
  }

  const params = new URLSearchParams({
    start: start.toISOString(),
    end: end.toISOString(),
    minCapacity: formData.get("minCapacity"),
  });

  if (formData.get("building")) params.set("building", formData.get("building"));
  if (formData.get("facility")) params.set("facility", formData.get("facility"));

  button.disabled = true;
  button.firstElementChild.textContent = "Checking timetable…";

  try {
    const data = await fetchJson(`/api/availability?${params}`);
    renderRooms(data);
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    button.disabled = false;
    button.firstElementChild.textContent = "Search rooms";
  }
}

function activityTypeLabel(value) {
  return {
    "rescheduled-lecture": "Rescheduled lecture",
    "extra-class": "Extra class",
    "study-session": "Study session",
    other: "Other activity",
  }[value] || value;
}

async function loadActivities() {
  try {
    const data = await fetchJson("/api/activities?limit=10");

    if (!data.activities.length) {
      elements.activityList.innerHTML = '<div class="list-loading">No activity has been recorded yet.</div>';
      return;
    }

    elements.activityList.innerHTML = data.activities.map((activity) => `
      <article class="activity-item">
        <div class="activity-main">
          <strong>${escapeHtml(activity.title)}</strong>
          <span>${escapeHtml(activity.room_code)} · ${escapeHtml(activityTypeLabel(activity.activity_type))}</span>
        </div>
        <span class="activity-time">${formatDateTime(activity.start_time)}<br />to ${formatTime(activity.end_time)}</span>
        <span class="activity-organizer">Organized by ${escapeHtml(activity.organizer_name)}</span>
        ${activity.status === "active"
          ? `<button class="release-button" type="button" data-activity-id="${activity.id}">Release room</button>`
          : `<span class="activity-status ${activity.status}">${escapeHtml(activity.status)}</span>`}
      </article>
    `).join("");
  } catch (error) {
    elements.activityList.innerHTML = `<div class="list-loading">${escapeHtml(error.message)}</div>`;
  }
}

async function submitBooking(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button");
  const data = Object.fromEntries(new FormData(form));
  const payload = {
    roomId: Number(data.roomId),
    activityType: data.activityType,
    title: data.title,
    organizerName: data.organizerName,
    start: new Date(data.start).toISOString(),
    end: new Date(data.end).toISOString(),
  };

  button.disabled = true;

  try {
    const result = await fetchJson("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    showToast(`${result.activity.room_code} reserved successfully.`);
    form.elements.title.value = "";
    await Promise.all([loadActivities(), loadOverview(), searchRooms()]);
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

async function submitReport(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button");
  const data = Object.fromEntries(new FormData(form));
  const payload = {
    roomId: Number(data.roomId),
    reporterName: data.reporterName,
    note: data.note,
    photoUrl: data.photoUrl,
  };

  button.disabled = true;

  try {
    const result = await fetchJson("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    showToast(`Fresh observation shared for ${result.report.room_code}.`);
    form.elements.note.value = "";
    form.elements.photoUrl.value = "";
    await Promise.all([loadOverview(), searchRooms()]);
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

elements.searchForm.addEventListener("submit", searchRooms);
elements.bookingForm.addEventListener("submit", submitBooking);
elements.reportForm.addEventListener("submit", submitReport);
elements.refreshActivity.addEventListener("click", loadActivities);

elements.roomResults.addEventListener("click", (event) => {
  const button = event.target.closest(".book-room");
  if (!button) return;

  const { start, end } = intervalFromSearchForm();
  elements.bookingForm.elements.roomId.value = button.dataset.roomId;
  elements.bookingForm.elements.start.value = dateTimeInputValue(start);
  elements.bookingForm.elements.end.value = dateTimeInputValue(end);
  elements.bookingForm.scrollIntoView({ behavior: "smooth", block: "center" });
});

elements.activityList.addEventListener("click", async (event) => {
  const button = event.target.closest(".release-button");
  if (!button) return;

  button.disabled = true;

  try {
    await fetchJson(`/api/activities/${button.dataset.activityId}/release`, { method: "PATCH" });
    showToast("The room was released early.");
    await Promise.all([loadActivities(), loadOverview(), searchRooms()]);
  } catch (error) {
    showToast(error.message, "error");
    button.disabled = false;
  }
});

setDefaultTimes();

Promise.all([checkHealth(), loadOverview(), loadRooms(), loadActivities()])
  .then(() => searchRooms())
  .catch((error) => showToast(error.message, "error"));
