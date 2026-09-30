# Deploy

## Server (the cloud box)

1. InfluxDB 2, reachable from this box and the Pi:
   ```
   docker run -d --name influxdb --restart unless-stopped \
     -p 8086:8086 \
     -e DOCKER_INFLUXDB_INIT_MODE=setup \
     -e DOCKER_INFLUXDB_INIT_USERNAME=admin \
     -e DOCKER_INFLUXDB_INIT_PASSWORD=<password> \
     -e DOCKER_INFLUXDB_INIT_ORG=fireguard \
     -e DOCKER_INFLUXDB_INIT_BUCKET=fireguard \
     -e DOCKER_INFLUXDB_INIT_RETENTION=30d \
     -v influxdb-data:/var/lib/influxdb2 \
     -v influxdb-config:/etc/influxdb2 \
     influxdb:2
   ```
   The admin token it prints is what goes in `INFLUXDB_TOKEN`.

2. Mosquitto. `mosquitto.conf` in this directory is already LAN-open and
   persistent; copy it to `/etc/mosquitto/conf.d/fireguard.conf`.
   `allow_anonymous true` is fine for a LAN lab. Set a password file before
   this box faces anything untrusted.

3. `.env` — set `INFLUXDB_TOKEN`, and `MQTT_HOST` / `INFLUXDB_URL` to the server's
   own LAN address (not `127.0.0.1`; the Pi and this listener both reach it over
   the network).

4. The listener, as a service:
   ```
   sudo cp deploy/fireguard-mqtt.service /etc/systemd/system/
   sudo systemctl enable --now fireguard-mqtt
   journalctl -u fireguard-mqtt -f
   ```

5. `php artisan mqtt:listen --once` before going live — it prints one line per
   reading and exits. If it sits there, the Pi is not publishing.

## Raspberry Pi

`docker-compose.yml`: `CLOUD_BROKER=fog_mosquitto` currently points the cloud
client at the Pi's own broker. Change it to the server's address, or nothing
will ever cross the network:

```diff
-      - CLOUD_BROKER=fog_mosquitto
+      - CLOUD_BROKER=<IP_SERVER_ANDA>
```

Same for `ArduinoSRC.ino`, which hardcodes `mqtt_server = "192.168.0.2"` — that
must be the broker the Pi publishes to.

One data-loss race in `edge-agent/app.py` `flush_offline_buffer()`: it `DELETE`s
the SQLite row immediately after `publish()`, so a row is lost if the cloud link
drops before the PUBACK lands. That is precisely the case the buffer exists for.
Wait for the acknowledgement before deleting:

```python
info = cloud_client.publish(topic, payload, qos=1)
info.wait_for_publish(timeout=5)
if info.is_published():
    cursor.execute("DELETE FROM buffer WHERE id = ?", (row_id,))
    conn.commit()
```

## This box (dev)

`php artisan serve`, then sign in with the seeded `admin` / `admin123`.
`npm install` fails on npm 12 (`EALLOWREMOTE`, default `allow-remote=none`) — no
blade uses Vite, so nothing here needs it. `npm install --allow-remote=all` works
if you want the Tailwind toolchain back.
