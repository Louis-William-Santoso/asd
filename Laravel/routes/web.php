<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\SensorController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->middleware('guest');

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'show'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', fn () => view('dashboard'))->name('dashboard');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    // In web.php, not api.php: these are session-authenticated fetches, and the
    // api group has no session middleware.
    Route::get('/api/fire/status', [SensorController::class, 'status'])->name('api.fire.status');
    Route::get('/api/fire/history', [SensorController::class, 'history'])->name('api.fire.history');
});
