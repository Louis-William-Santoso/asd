$(function(){
if(localStorage.getItem("iot_token")){location.href="dashboard.html";return;}
$("#loginForm").on("submit",function(e){
e.preventDefault();
const $b=$("#loginButton"),$m=$("#loginMessage");
$m.removeClass("error success").text("");
$b.prop("disabled",true).text("Logging in...");
$.ajax({
url:API_CONFIG.baseUrl+API_CONFIG.endpoints.login,method:"POST",contentType:"application/json",dataType:"json",
data:JSON.stringify({username:$("#username").val().trim(),password:$("#password").val()}),
success:function(r){
if(!r.token){$m.addClass("error").text("Token tidak ditemukan.");return;}
localStorage.setItem("iot_token",r.token);
if(r.user)localStorage.setItem("iot_user",JSON.stringify(r.user));
$m.addClass("success").text("Login berhasil.");
setTimeout(()=>location.href="dashboard.html",300);
},
error:function(xhr){$m.addClass("error").text((xhr.responseJSON&&xhr.responseJSON.message)||"Login gagal.");},
complete:function(){$b.prop("disabled",false).text("Login");}
});
});
});