// Same-origin: session cookie rides along on every $.ajax call.
const API_CONFIG = {
  endpoints: {
    login: "/login",
    logout: "/logout",
    fireStatus: "/api/fire/status",
    sensorHistory: "/api/fire/history"
  },
  pollingInterval: 5000,
  historyPoints: 60,
  historyMinutes: 60
};

$.ajaxSetup({
  headers: { "X-CSRF-TOKEN": $('meta[name="csrf-token"]').attr('content') }
});
