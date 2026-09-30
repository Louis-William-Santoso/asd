<?php

namespace Tests\Feature;

use App\Services\Influx;
use Tests\TestCase;

class SensorIngestTest extends TestCase
{
    public function test_reads_the_esp32_typo_key(): void
    {
        // ArduinoSRC.ino publishes "gas_intencity", the edge agent renames it to
        // "gas_intensity". Both must land on the same normalised reading.
        $esp32 = $this->app->make(Influx::class)->reading('{"gas_intencity":2450,"status":"bad","uptime":120}');
        $agent = $this->app->make(Influx::class)->reading('{"gas_intensity":2450.0,"status":"bad","uptime":120,"fog_timestamp":1700000000}');

        $this->assertSame(2450, $esp32['gas_raw']);
        $this->assertSame('bad', $esp32['status']);
        $this->assertSame(120, $esp32['uptime']);

        $this->assertSame(2450, $agent['gas_raw']);
        $this->assertSame('bad', $agent['status']);
        $this->assertSame(1700000000, $agent['timestamp']);
    }

    public function test_derives_status_when_the_payload_omits_it(): void
    {
        $influx = $this->app->make(Influx::class);

        $this->assertSame('good', $influx->reading('{"gas_intencity":10}')['status']);
        $this->assertSame('bad', $influx->reading('{"gas_intencity":2001}')['status']);
        // Threshold boundary comes from config, matching the ESP32's `> 2000`.
        $this->assertSame('good', $influx->reading('{"gas_intencity":2000}')['status']);
    }

    public function test_rejects_non_json(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->app->make(Influx::class)->reading('not json');
    }
}
