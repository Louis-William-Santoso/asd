<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="csrf-token" content="{{ csrf_token() }}">
<title>FireGuard IoT - Login</title>
<link rel="stylesheet" href="{{ asset('css/style.css') }}">
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="{{ asset('js/config.js') }}"></script>
<script src="{{ asset('js/login.js') }}"></script>
</head>
<body class="login-body">
<main class="login-container">
<section class="login-card">
<div class="brand-icon">🔥</div>
<h1>FireGuard IoT</h1>
<p class="subtitle">Fire Detection & Monitoring System</p>
<form id="loginForm">
<div class="form-group">
<label for="username">Username</label>
<input id="username" name="username" type="text" autocomplete="username" placeholder="Username" required autofocus value="{{ old('username') }}">
</div>
<div class="form-group">
<label for="password">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password" placeholder="Password" required>
</div>
<button id="loginButton" type="submit" class="primary-btn">Login</button>
<div id="loginMessage" class="message" role="status" aria-live="polite"></div>
</form>
</section>
</main>
</body>
</html>
