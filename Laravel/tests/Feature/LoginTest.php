<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

class LoginTest extends TestCase
{
    public function test_login_page_is_public(): void
    {
        $this->get('/login')->assertOk();
    }

    public function test_dashboard_requires_auth(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_valid_credentials_start_a_session(): void
    {
        $user = User::factory()->create(['name' => 'admin', 'password' => 'admin123']);

        $this->postJson('/login', ['username' => 'admin', 'password' => 'admin123'])
            ->assertOk()
            ->assertJson(['redirect' => url('/dashboard')]);

        $this->assertAuthenticatedAs($user);
    }

    public function test_wrong_password_is_rejected(): void
    {
        User::factory()->create(['name' => 'admin', 'password' => 'admin123']);

        $this->postJson('/login', ['username' => 'admin', 'password' => 'salah'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('username');

        $this->assertGuest();
    }

    public function test_logout_ends_the_session(): void
    {
        $this->actingAs(User::factory()->create())->post('/logout')->assertRedirect('/login');
        $this->assertGuest();
    }

    public function test_sensor_endpoints_require_auth(): void
    {
        $this->getJson('/api/fire/status')->assertUnauthorized();
        $this->getJson('/api/fire/history')->assertUnauthorized();
    }
}
