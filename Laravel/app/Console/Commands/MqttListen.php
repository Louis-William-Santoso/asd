<?php

namespace App\Console\Commands;

use App\Services\Influx;
use Illuminate\Console\Command;
use PhpMqtt\Client\ConnectionSettings;
use PhpMqtt\Client\MqttClient;
use Throwable;

class MqttListen extends Command
{
    protected $signature = 'mqtt:listen {--once : Exit after the first message (smoke test)}';

    protected $description = 'Subscribe to the fog MQTT broker and store sensor readings in InfluxDB';

    public function handle(Influx $influx): int
    {
        $host = config('services.mqtt.host');
        $port = config('services.mqtt.port');
        $topic = config('services.mqtt.topic');
        $received = false;

        $client = new MqttClient($host, $port, config('services.mqtt.client_id'));
        $client->connect((new ConnectionSettings)
            ->setKeepAliveInterval(10)
            ->setReconnectAutomatically(true)
            ->setMaxReconnectAttempts(-1)
            ->setDelayBetweenReconnectAttempts(2));

        $this->components->info("Subscribed to mqtt://{$host}:{$port} topic {$topic}");

        $client->subscribe($topic, function (string $topic, string $message) use ($influx, &$received) {
            try {
                $reading = $influx->reading($message);
                $influx->write($reading);
                $received = true;
                $this->line("  [ingest] status={$reading['status']} gas={$reading['gas_raw']} uptime={$reading['uptime']}s");
            } catch (Throwable $e) {
                // One malformed message must not kill the listener.
                $this->warn('  [drop] '.$e->getMessage());
            }
        });

        // ponytail: --once polls the loop instead of blocking, so a broker that is
        // up but silent still times out here instead of hanging a smoke test.
        while ($client->loop(true)) {
            if ($this->option('once') && $received) {
                break;
            }
            if ($this->option('once')) {
                $this->components->error('No message received. Is the Pi publishing to this topic?');
                break;
            }
        }

        $client->disconnect();

        return $received || ! $this->option('once') ? self::SUCCESS : self::FAILURE;
    }
}
