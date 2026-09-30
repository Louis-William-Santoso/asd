<?php

namespace App\Services;

use InfluxDB2\Client;
use InfluxDB2\Model\WritePrecision;
use InfluxDB2\Point;
use InfluxDB2\WriteApi;
use InvalidArgumentException;

class Influx
{
    private ?Client $client = null;

    private ?WriteApi $write = null;

    /**
     * Normalise one MQTT payload from the edge agent. Pure, no I/O.
     *
     * The ESP32 spells the key "gas_intencity" (ArduinoSRC.ino); the edge agent
     * renames it to "gas_intensity". Both are accepted so neither side is
     * load-bearing on the typo being fixed.
     */
    public function reading(string $json): array
    {
        $data = json_decode($json, true);

        if (! is_array($data)) {
            throw new InvalidArgumentException('payload is not a JSON object');
        }

        $intensity = (float) ($data['gas_intensity'] ?? $data['gas_intencity'] ?? 0);

        return [
            'gas_intensity' => $intensity,
            'gas_raw' => (int) ($data['gas_intencity'] ?? $data['gas_intensity'] ?? $intensity),
            'status' => $data['status'] ?? ($intensity > config('influxdb.gas_threshold') ? 'bad' : 'good'),
            'uptime' => (int) ($data['uptime'] ?? 0),
            'timestamp' => (int) ($data['fog_timestamp'] ?? time()),
        ];
    }

    public function write(array $reading): void
    {
        $point = new Point(
            config('influxdb.measurement'),
            ['status' => $reading['status']],
            [
                'gas_intensity' => $reading['gas_intensity'],
                'gas_raw' => $reading['gas_raw'],
                'uptime' => $reading['uptime'],
            ],
            $reading['timestamp'],
            WritePrecision::S,
        );

        $this->writeApi()->write($point, WritePrecision::S, config('influxdb.bucket'), config('influxdb.org'));
    }

    /** @return list<array<string, mixed>> oldest first */
    public function history(int $limit = 50, int $minutes = 60): array
    {
        $query = sprintf(
            'from(bucket: %1$s)
  |> range(start: -%2$dm)
  |> filter(fn: (r) => r._measurement == %3$s)
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: %4$d)
  |> sort(columns: ["_time"])',
            $this->quote(config('influxdb.bucket')),
            $minutes,
            $this->quote(config('influxdb.measurement')),
            $limit,
        );

        $rows = [];

        foreach ($this->client()->createQueryApi()->query($query, config('influxdb.org')) as $table) {
            foreach ($table->records as $record) {
                $rows[] = [
                    'timestamp' => (string) $record->values['_time'],
                    'gas_intensity' => (float) ($record->values['gas_intensity'] ?? 0),
                    'gas_raw' => (int) ($record->values['gas_raw'] ?? 0),
                    'uptime' => (int) ($record->values['uptime'] ?? 0),
                    'status' => (string) ($record->values['status'] ?? 'good'),
                ];
            }
        }

        return $rows;
    }

    public function latest(): ?array
    {
        return $this->history(limit: 1, minutes: 1440)[0] ?? null;
    }

    private function client(): Client
    {
        // ponytail: one shared client per process; the command is long lived so
        // the TCP+TLS handshake is paid once, not per message.
        return $this->client ??= new Client([
            'url' => config('influxdb.url'),
            'token' => config('influxdb.token'),
            'timeout' => 5,
        ]);
    }

    private function writeApi(): WriteApi
    {
        return $this->write ??= $this->client()->createWriteApi();
    }

    private function quote(string $value): string
    {
        return '"'.addcslashes($value, '"\\').'"';
    }
}
