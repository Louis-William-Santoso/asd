<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
	$request->validate([
	  'username' => 'required',
	  'password' => 'required',
        ]);

	$user = User::where('name', $request->username)->first();

	if (!$user || !Hash::check($request->password, $user->password)) {
	    return response()->json([
		'success' => false,
		'message' => 'Username atau password salah'
	    ], 401);
	}

	return response()->json([
	    'success' => true,
	    'message' => 'Login berhasil',
	    'token' => 'fireguard-token'
	]);
    }
}
