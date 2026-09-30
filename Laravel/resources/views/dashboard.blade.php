<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="csrf-token" content="{{ csrf_token() }}">
<title>FireGuard IoT - Dashboard</title>
<link rel="stylesheet" href="{{ asset('css/style.css') }}">
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
<script src="{{ asset('js/config.js') }}"></script>
<script src="{{ asset('js/dashboard.js') }}"></script>
</head>
<body class="dashboard-body">
<header class="topbar">
<div><h1>🔥 FireGuard IoT</h1><span class="topbar-subtitle">Fire Detection & Monitoring System</span></div>
<div class="topbar-right">
<span id="connectionBadge" class="badge badge-offline">● Disconnected</span>
<span class="user-label">{{ auth()->user()->name }}</span>
<button id="logoutButton" class="logout-btn">Logout</button>
</div>
</header>

<main class="dashboard-container">
<section id="mainStatus" class="main-status safe">
<div>
<div class="status-kicker">STATUS SISTEM</div>
<h2 id="mainStatusTitle">MENUNGGU DATA</h2>
<p id="mainStatusText">Belum ada pembacaan sensor dari Raspberry Pi.</p>
<span id="lastUpdate" class="last-update">Last update: -</span>
</div>
<div id="statusIcon" class="status-icon">🛡️</div>
</section>

<section class="stats-grid">
<article class="stat-card"><span class="stat-label">Intensitas Gas</span><strong><span id="gasIntensity">-</span> <small>ADC</small></strong><span id="gasStatus" class="status-text neutral">Menunggu data</span></article>
<article class="stat-card"><span class="stat-label">Porsi ADC</span><strong><span id="gasPercent">-</span> %</strong><span class="status-text neutral">skala 0&ndash;<span id="adcMax">4095</span></span></article>
<article class="stat-card"><span class="stat-label">Status ESP32</span><strong id="statusValue">-</strong><span id="statusNote" class="status-text neutral">Menunggu data</span></article>
<article class="stat-card"><span class="stat-label">Uptime Sensor</span><strong id="uptime">-</strong><span class="status-text neutral">lama menyala</span></article>
</section>

<section class="panel chart-panel">
<div class="panel-header">
<div><h2>📈 Grafik Intensitas Gas</h2><p class="panel-subtitle">Pembacaan terakhir dari InfluxDB, garis merah = batas alarm ESP32</p></div>
<span id="chartRangeLabel" class="small-label">0 data</span>
</div>
<div class="chart-wrap"><canvas id="sensorChart"></canvas></div>
</section>

<section class="content-grid">
<article class="panel">
<div class="panel-header"><div><h2>🚨 Status Alarm</h2><p class="panel-subtitle">Alarm dijalankan langsung oleh ESP32</p></div></div>
<div class="alarm-summary">
<div class="alarm-big-icon" id="alarmIcon">🔕</div>
<div><strong id="alarmSummaryTitle">Alarm Tidak Aktif</strong><span id="alarmSummaryText">Sistem dalam keadaan siaga.</span></div>
</div>
<div class="actuator-row"><div><strong>Buzzer</strong><span>Dinyalakan ESP32 saat gas &gt; 2000</span></div><span id="buzzer" class="actuator-badge off">OFF</span></div>
<div class="actuator-row"><div><strong>Lampu Peringatan</strong><span>Tidak terpasang di board</span></div><span class="actuator-badge off">N/A</span></div>
<div class="actuator-row"><div><strong>Pompa / Sprinkler</strong><span>Tidak terpasang di board</span></div><span class="actuator-badge off">N/A</span></div>
</article>

<article class="panel">
<div class="panel-header"><div><h2>📋 Log Kejadian</h2><p class="panel-subtitle">Perubahan status dalam jendela data aktif</p></div><span id="logCount" class="small-label">0 event</span></div>
<div id="eventLog" class="event-log"><div class="empty-state">Belum ada event.</div></div>
</article>
</section>
</main>
</body>
</html>
