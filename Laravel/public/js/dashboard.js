let chart = null, pollTimer = null, lastStatus = null;

$(function () {
  initChart();
  loadStatus();
  loadHistory();
  pollTimer = setInterval(() => { loadStatus(); loadHistory(); }, API_CONFIG.pollingInterval);
  $("#logoutButton").on("click", logout);
});

function unauthorized(x) {
  // 401 = session gone, 419 = CSRF token stale. Both mean "log in again".
  if (x.status === 401 || x.status === 419) {
    clearInterval(pollTimer);
    location.href = "/login";
    return true;
  }
  return false;
}

function connection(ok, text) {
  $("#connectionBadge")
    .removeClass("badge-online badge-offline")
    .addClass(ok ? "badge-online" : "badge-offline")
    .text(ok ? "● Connected" : "● " + (text || "Disconnected"));
}

function loadStatus() {
  $.ajax({ url: API_CONFIG.endpoints.fireStatus, method: "GET", dataType: "json", timeout: 8000 })
    .done(function (d) {
      connection(true);
      $("#adcMax").text(d.adc_max);
      if (!d.online) { showNoData(); return; }
      render(d.reading, d.thresholds.gas, d.adc_max);
    })
    .fail(function (x) {
      if (unauthorized(x)) return;
      connection(false, x.status === 503 ? "● InfluxDB down" : "● Server error");
      showNoData();
    });
}

function loadHistory() {
  $.ajax({
    url: API_CONFIG.endpoints.sensorHistory, method: "GET", dataType: "json", timeout: 8000,
    data: { limit: API_CONFIG.historyPoints, minutes: API_CONFIG.historyMinutes }
  })
    .done(function (r) { renderChart(r.data || [], window.__gasThreshold); })
    .fail(function (x) { if (!unauthorized(x)) renderChart([], window.__gasThreshold); });
}

function showNoData() {
  $("#mainStatus").removeClass("safe warning danger").addClass("safe");
  $("#mainStatusTitle").text("MENUNGGU DATA");
  $("#mainStatusText").text("Belum ada pembacaan sensor dari Raspberry Pi.");
  $("#statusIcon").text("🛡️");
  ["#gasIntensity", "#gasPercent", "#statusValue", "#uptime"].each(s => $(s).text("-"));
  $("#gasStatus, #statusNote").removeClass("normal warning danger").addClass("neutral").text("Menunggu data");
  $("#lastUpdate").text("Last update: -");
}

function render(r, threshold, adcMax) {
  window.__gasThreshold = threshold;
  const bad = r.status === "bad";
  const pct = Math.min(100, Math.round((r.gas_intensity / adcMax) * 100));

  $("#gasIntensity").text(Math.round(r.gas_intensity));
  $("#gasPercent").text(pct);
  $("#statusValue").text(bad ? "BAHAYA" : "AMAN");
  $("#uptime").text(fmtDuration(r.uptime));

  const state = bad ? "danger" : (r.gas_intensity >= threshold * 0.75 ? "warning" : "normal");
  paint("#gasStatus", state, state === "danger" ? "BAHAYA" : state === "warning" ? "WASPADA" : "NORMAL");
  paint("#statusNote", state, bad ? "ESP32/report status bad" : "ESP32/report status good");

  $("#mainStatus").removeClass("safe warning danger").addClass(state);
  $("#mainStatusTitle").text(bad ? "BAHAYA KEBAKARAN!" : state === "warning" ? "WASPADA" : "AMAN");
  $("#mainStatusText").text(bad
    ? "Sensor melaporkan kondisi berbahaya. Segera periksa area."
    : state === "warning" ? "Nilai mendekati batas alarm ESP32." : "Tidak ada indikasi kebakaran.");
  $("#statusIcon").text(bad ? "🔥" : state === "warning" ? "⚠️" : "🛡️");

  $("#buzzer").removeClass("on off").addClass(bad ? "on" : "off").text(bad ? "ON" : "OFF");
  $("#alarmIcon").text(bad ? "🔔" : "🔕");
  $("#alarmSummaryTitle").text(bad ? "Alarm Aktif" : "Alarm Tidak Aktif");
  $("#alarmSummaryText").text(bad ? "ESP32 menyalakan buzzer." : "Sistem dalam keadaan siaga.");
  $("#lastUpdate").text("Last update: " + fmt(new Date(r.timestamp)));
}

function paint(sel, state, text) {
  $(sel).removeClass("normal warning danger neutral").addClass(state).text(text);
}

function initChart() {
  chart = new Chart(document.getElementById("sensorChart"), {
    type: "line",
    data: { labels: [], datasets: [{
      label: "Intensitas Gas (ADC)", data: [], tension: .35, pointRadius: 3, borderWidth: 2,
      backgroundColor: "rgba(56,189,248,.15)", fill: true, borderColor: "#38bdf8"
    }]},
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, title: { display: true, text: "Nilai ADC" } } }
    }
  });
}

function renderChart(points, threshold) {
  points = [...points].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  chart.data.labels = points.map(p => new Date(p.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
  chart.data.datasets[0].data = points.map(p => +p.gas_intensity);
  if (threshold) {
    // ponytail: horizontal threshold line as a constant dataset; swap for a
    // custom plugin if per-point thresholding is ever needed.
    chart.data.datasets[1] = {
      label: "Batas alarm", data: points.map(() => threshold), borderColor: "#ef4444",
      borderDash: [6, 4], pointRadius: 0, borderWidth: 1.5, fill: false
    };
  }
  chart.update("none");
  $("#chartRangeLabel").text(points.length + " data terakhir");
  renderEvents(points);
}

// ponytail: events are collapsed client-side from the fetched window rather
// than stored in MySQL. Ceiling: only status changes inside the loaded history
// are visible. Move to a server query when the window is too short to catch them.
function renderEvents(points) {
  const events = [];
  points.forEach(p => {
    if (lastStatus === null || p.status !== lastStatus) {
      if (lastStatus !== null) {
        events.push({ message: p.status === "bad" ? "Status berubah: BAHAYA terdeteksi" : "Status kembali AMAN", timestamp: p.timestamp, danger: p.status === "bad" });
      }
      lastStatus = p.status;
    }
  });

  const $l = $("#eventLog");
  $("#logCount").text(events.length + " event");
  $l.empty();
  if (!events.length) { $l.html('<div class="empty-state">Belum ada event.</div>'); return; }
  events.slice().reverse().forEach(e => {
    $l.append($("<div>", { class: "log-item" })
      .append($("<span>", { class: "log-message " + (e.danger ? "danger" : "normal"), text: e.message }))
      .append($("<span>", { class: "log-time", text: e.timestamp ? fmt(new Date(e.timestamp)) : "-" })));
  });
}

function fmtDuration(s) {
  s = Math.max(0, Math.floor(+s || 0));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return d + "h " + h + "j";
  if (h) return h + "j " + m + "m";
  return m + "m " + (s % 60) + "d";
}

function fmt(d) {
  return d.toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function logout() {
  clearInterval(pollTimer);
  $.post(API_CONFIG.endpoints.logout).always(function () { location.href = "/login"; });
}
