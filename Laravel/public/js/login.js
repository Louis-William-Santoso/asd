$(function () {
  $("#loginForm").on("submit", function (e) {
    e.preventDefault();
    const $b = $("#loginButton"), $m = $("#loginMessage");
    $m.removeClass("error").text("");
    $b.prop("disabled", true).text("Logging in...");

    $.ajax({
      url: API_CONFIG.endpoints.login,
      method: "POST",
      data: { username: $("#username").val().trim(), password: $("#password").val() }
    })
      .done(function (r) { location.href = r.redirect || "/dashboard"; })
      .fail(function (xhr) {
        // Laravel returns 422 with a field-keyed errors object for ValidationException.
        const body = xhr.responseJSON || {};
        $m.addClass("error").text(body.message || body.errors?.username?.[0] || "Login gagal.");
      })
      .always(function () { $b.prop("disabled", false).text("Login"); });
  });
});
