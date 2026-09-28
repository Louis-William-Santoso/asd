let chart=null,pollTimer=null;
$(function(){
if(!localStorage.getItem("iot_token")){location.href="/";return;}
loadUser();initChart();loadThresholds();loadFireStatus();loadHistory();loadEvents();
pollTimer=setInterval(()=>{loadFireStatus();loadHistory();loadEvents();},API_CONFIG.pollingInterval);
$("#thresholdForm").on("submit",saveThresholds);$("#logoutButton").on("click",logout);
});
function headers(){return{Authorization:"Bearer "+localStorage.getItem("iot_token")};}
function unauthorized(x){if(x.status===401){localStorage.removeItem("iot_token");localStorage.removeItem("iot_user");clearInterval(pollTimer);location.href="/";return true;}return false;}
function loadUser(){try{const u=JSON.parse(localStorage.getItem("iot_user")||"{}");$("#userLabel").text(u.name||u.username||"User");}catch(e){}}
function connection(ok){$("#connectionBadge").removeClass("badge-online badge-offline").addClass(ok?"badge-online":"badge-offline").text(ok?"● Connected":"● Disconnected");}
function loadFireStatus(){$.ajax({url:API_CONFIG.baseUrl+API_CONFIG.endpoints.fireStatus,method:"GET",dataType:"json",headers:headers(),timeout:5000,success:d=>{connection(true);updateDashboard(d)},error:x=>{connection(false);unauthorized(x)}});}
function loadHistory(){$.ajax({url:API_CONFIG.baseUrl+API_CONFIG.endpoints.sensorHistory,method:"GET",dataType:"json",headers:headers(),data:{limit:API_CONFIG.historyPoints},success:r=>renderChart(r.data||[]),error:x=>unauthorized(x)});}
function loadEvents(){$.ajax({url:API_CONFIG.baseUrl+API_CONFIG.endpoints.events,method:"GET",dataType:"json",headers:headers(),data:{limit:20},success:r=>renderEvents(r.events||[]),error:x=>unauthorized(x)});}
function loadThresholds(){$.ajax({url:API_CONFIG.baseUrl+API_CONFIG.endpoints.thresholds,method:"GET",dataType:"json",headers:headers(),success:d=>{$("#tempWarning").val(d.temperature_warning??50);$("#tempDanger").val(d.temperature_danger??70);$("#smokeWarning").val(d.smoke_warning??300);$("#smokeDanger").val(d.smoke_danger??500);},error:x=>unauthorized(x)});}
function saveThresholds(e){
e.preventDefault();const tw=+$("#tempWarning").val(),td=+$("#tempDanger").val(),sw=+$("#smokeWarning").val(),sd=+$("#smokeDanger").val(),$b=$("#saveThresholdButton"),$m=$("#thresholdMessage");
$m.removeClass("error success").text("");
if(td<=tw||sd<=sw){$m.addClass("error").text("Danger harus lebih besar dari warning.");return;}
$b.prop("disabled",true).text("Menyimpan...");
$.ajax({url:API_CONFIG.baseUrl+API_CONFIG.endpoints.thresholds,method:"PUT",contentType:"application/json",dataType:"json",headers:headers(),data:JSON.stringify({temperature_warning:tw,temperature_danger:td,smoke_warning:sw,smoke_danger:sd}),success:()=>{$m.addClass("success").text("Threshold berhasil disimpan.");},error:x=>{if(!unauthorized(x))$m.addClass("error").text((x.responseJSON&&x.responseJSON.message)||"Gagal menyimpan threshold.");},complete:()=>{$b.prop("disabled",false).text("Simpan Threshold");}});
}
function thresholds(){return{tw:+$("#tempWarning").val()||50,td:+$("#tempDanger").val()||70,sw:+$("#smokeWarning").val()||300,sd:+$("#smokeDanger").val()||500};}
function updateDashboard(d){
const temp=+(d.temperature??0),smoke=+(d.smoke??0),flame=bool(d.flame),alarm=bool(d.alarm),t=thresholds();
$("#temperature").text(Number.isInteger(temp)?temp:temp.toFixed(1));$("#smoke").text(Math.round(smoke));$("#flame").text(flame?"TERDETEKSI":"TIDAK");$("#alarm").text(alarm?"ON":"OFF");
status("#temperatureStatus",temp,t.tw,t.td);status("#smokeStatus",smoke,t.sw,t.sd);
$("#flameStatus").removeClass("normal warning danger neutral").addClass(flame?"danger":"normal").text(flame?"API TERDETEKSI":"TIDAK TERDETEKSI");
$("#alarmStatus").removeClass("normal warning danger neutral").addClass(alarm?"danger":"normal").text(alarm?"ALARM AKTIF":"SISTEM SIAGA");
act("#buzzer",bool(d.buzzer));act("#warningLight",bool(d.warning_light));act("#pump",bool(d.pump));
const danger=flame||alarm||temp>=t.td||smoke>=t.sd,warning=!danger&&(temp>=t.tw||smoke>=t.sw);
mainStatus(danger,warning);$("#lastUpdate").text("Last update: "+fmt(d.timestamp?new Date(d.timestamp):new Date()));
}
function status(sel,v,w,d){const $e=$(sel);$e.removeClass("normal warning danger neutral");if(v>=d)$e.addClass("danger").text("BAHAYA");else if(v>=w)$e.addClass("warning").text("WASPADA");else $e.addClass("normal").text("NORMAL");}
function act(sel,on){const $e=$(sel);$e.removeClass("on off").addClass(on?"on":"off").text(on?"ON":"OFF");}
function mainStatus(d,w){const $s=$("#mainStatus");$s.removeClass("safe warning danger");if(d){$s.addClass("danger");$("#mainStatusTitle").text("BAHAYA KEBAKARAN!");$("#mainStatusText").text("Sistem mendeteksi indikasi kebakaran. Segera lakukan pemeriksaan.");$("#statusIcon").text("🔥");}else if(w){$s.addClass("warning");$("#mainStatusTitle").text("WASPADA");$("#mainStatusText").text("Nilai sensor melewati batas warning. Periksa kondisi area.");$("#statusIcon").text("⚠️");}else{$s.addClass("safe");$("#mainStatusTitle").text("AMAN");$("#mainStatusText").text("Tidak ada indikasi kebakaran.");$("#statusIcon").text("🛡️");}}
function initChart(){chart=new Chart(document.getElementById("sensorChart"),{type:"line",data:{labels:[],datasets:[{label:"Suhu (°C)",data:[],tension:.35,pointRadius:3,borderWidth:2,yAxisID:"y"},{label:"Asap (ppm)",data:[],tension:.35,pointRadius:3,borderWidth:2,yAxisID:"y1"}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},scales:{y:{beginAtZero:true,position:"left",title:{display:true,text:"Suhu (°C)"}},y1:{beginAtZero:true,position:"right",title:{display:true,text:"Asap (ppm)"},grid:{drawOnChartArea:false}}}}});}
function renderChart(points){points=[...points].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));chart.data.labels=points.map(p=>new Date(p.timestamp).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));chart.data.datasets[0].data=points.map(p=>+(p.temperature??0));chart.data.datasets[1].data=points.map(p=>+(p.smoke??0));chart.update("none");$("#chartRangeLabel").text(points.length+" data terakhir");}
function renderEvents(events){const $l=$("#eventLog");$("#logCount").text(events.length+" event");$l.empty();if(!events.length){$l.html('<div class="empty-state">Belum ada event.</div>');return;}events.slice(0,20).forEach(e=>{$l.append(`<div class="log-item"><span class="log-message ${e.danger?"danger":"normal"}">${esc(e.message||"Event IoT")}</span><span class="log-time">${e.timestamp?fmt(new Date(e.timestamp)):"-"}</span></div>`);});}
function bool(v){if(typeof v==="boolean")return v;if(typeof v==="number")return v!==0;if(typeof v==="string")return["true","1","yes","on","detected"].includes(v.toLowerCase());return false;}
function fmt(d){return d.toLocaleString("id-ID",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"});}
function esc(s){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function logout(){clearInterval(pollTimer);localStorage.removeItem("iot_token");localStorage.removeItem("iot_user");location.href="/";}
