FIREGUARD IOT GUI - v2

Fitur:
- Login user dengan jQuery AJAX
- Grafik Suhu/Asap dengan Chart.js
- Status Alarm
- Log Kejadian
- Form Setting Threshold
- Polling data IoT setiap 2 detik
- Token Authorization Bearer

Arsitektur:
Browser/jQuery -> Backend API -> Grafana/Data Source -> Data IoT

Endpoint backend:
POST /api/login
GET  /api/fire/status
GET  /api/fire/history?limit=20
GET  /api/fire/events?limit=20
GET  /api/fire/thresholds
PUT  /api/fire/thresholds

Contoh /api/fire/status:
{
  "temperature": 32.5,
  "smoke": 180,
  "flame": false,
  "alarm": false,
  "buzzer": false,
  "warning_light": false,
  "pump": false,
  "timestamp": "2026-09-26T12:00:00+07:00"
}

Contoh /api/fire/history:
{
  "data": [
    {"timestamp":"2026-09-26T11:59:00+07:00","temperature":31.2,"smoke":160},
    {"timestamp":"2026-09-26T12:00:00+07:00","temperature":32.5,"smoke":180}
  ]
}

Contoh /api/fire/events:
{
  "events": [
    {"message":"Kebakaran terdeteksi","danger":true,"timestamp":"2026-09-26T11:58:00+07:00"}
  ]
}

Contoh threshold:
{
  "temperature_warning": 50,
  "temperature_danger": 70,
  "smoke_warning": 300,
  "smoke_danger": 500
}

Edit js/config.js untuk alamat backend.

Jangan simpan credential Grafana di JavaScript frontend. Lebih aman browser -> backend -> Grafana.
