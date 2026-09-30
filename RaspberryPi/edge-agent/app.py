import os
import time
import json
import sqlite3
import threading
import paho.mqtt.client as mqtt

# ==========================================
# KONFIGURASI ENVIRONMENT & DATABASE
# ==========================================
LOCAL_BROKER = os.getenv("LOCAL_BROKER", "fog_mosquitto")
CLOUD_BROKER = os.getenv("CLOUD_BROKER", "fog_mosquitto")
DB_PATH = "/app/data/offline_buffer.db"

is_cloud_connected = False
last_sent_time = 0

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS buffer (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT NOT NULL,
            payload TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def save_to_offline_buffer(topic, payload):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO buffer (topic, payload) VALUES (?, ?)", (topic, payload))
        conn.commit()
        conn.close()
        print(f"[OFFLINE STORAGE] Data disimpan ke lokal DB (Topic: {topic})")
    except Exception as e:
        print(f"[ERROR DB SAVE] {e}")

def flush_offline_buffer(cloud_client):
    """ Rekonsiliasi data: Mengirim ulang isi SQLite saat Cloud kembali online """
    global is_cloud_connected
    while True:
        if is_cloud_connected:
            try:
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute("SELECT id, topic, payload FROM buffer ORDER BY id ASC LIMIT 50")
                rows = cursor.fetchall()
                
                if rows:
                    print(f"[SYNC] Mengirim {len(rows)} data tersimpan di lokal DB ke Cloud Server...")
                    for row in rows:
                        row_id, topic, payload = row
                        cloud_client.publish(topic, payload, qos=1)
                        cursor.execute("DELETE FROM buffer WHERE id = ?", (row_id,))
                        conn.commit()
                        time.sleep(0.05)
                conn.close()
            except Exception as e:
                print(f"[ERROR DB FLUSH] {e}")
        time.sleep(5)

# ==========================================
# CALLBACKS MQTT CLOUD CLIENT
# ==========================================
def on_cloud_connect(client, userdata, flags, rc):
    global is_cloud_connected
    if rc == 0:
        print("[CLOUD STATUS] Terhubung ke Cloud MQTT Server (Ubuntu)!")
        is_cloud_connected = True
    else:
        print(f"[CLOUD STATUS] Gagal terhubung ke Cloud MQTT Server, RC: {rc}")
        is_cloud_connected = False

def on_cloud_disconnect(client, userdata, rc):
    global is_cloud_connected
    print("[CLOUD STATUS] Koneksi ke Cloud MQTT Server terputus!")
    is_cloud_connected = False

# ==========================================
# CALLBACKS MQTT LOCAL CLIENT (MENERIMA DARI ESP32)
# ==========================================
def on_local_message(client, userdata, msg):
    global last_sent_time
    try:
        raw_payload = msg.payload.decode('utf-8')
        data = json.loads(raw_payload)
        
        gas_intensity = data.get("gas_intencity", 0)
        status = data.get("status", "good")
        uptime = int(data.get('uptime', 0))
        
        print("GAS:",gas_intensity,"|STATUS:",status,"|UPTIME:",uptime)

        # 1. FILTERING & RATE LIMITING
        current_time = time.time()
        if status == "good":
            if(current_time - last_sent_time) < 1.0:
                return

        last_sent_time = current_time

        # 2. SERIALISASI DATA (Tambahkan Metadata Fog Tier)
        enriched_payload = {
            "status": status,
            "uptime": uptime,
            "gas_intensity": float(gas_intensity),
            "fog_timestamp": int(current_time)
        }
        
        cloud_topic = f"cloud/{msg.topic}"
        payload_str = json.dumps(enriched_payload)

        # 3. ROUTING & OFFLINE BUFFERING
        if is_cloud_connected:
            userdata['cloud_client'].publish(cloud_topic, payload_str, qos=1)
            print(f"[FORWARD] Data dikirim ke Cloud -> {cloud_topic}")
        else:
            save_to_offline_buffer(cloud_topic, payload_str)
            
    except Exception as e:
        print(f"[ERROR] Parsing data ESP32 gagal: {e}")

# ==========================================
# MAIN EXECUTION
# ==========================================
if __name__ == "__main__":
    init_db()
    
    # Inisialisasi Client ke Cloud
    cloud_client = mqtt.Client(client_id="RaspberryPi_Fog_Gateway")
    cloud_client.on_connect = on_cloud_connect
    cloud_client.on_disconnect = on_cloud_disconnect
    
    try:
        cloud_client.connect_async(CLOUD_BROKER, 1883, 60)
        cloud_client.loop_start()
    except Exception as e:
        print(f"[WARNING] Gagal inisiasi koneksi ke Cloud Broker: {e}")

    # Thread terpisah untuk rekonsiliasi data
    sync_thread = threading.Thread(target=flush_offline_buffer, args=(cloud_client,), daemon=True)
    sync_thread.start()

    # Inisialisasi Client ke Local Broker
    local_client = mqtt.Client(client_id="ESP32_Subscriber", userdata={'cloud_client': cloud_client})
    local_client.on_message = on_local_message
    
    time.sleep(2)
    
    while True:
        try:
            local_client.connect(LOCAL_BROKER, 1883, 60)
            local_client.subscribe("esp32/sensor_data")
            print("[FOG AGENT] Agent berjalan dan siap memproses data ESP32...")
            local_client.loop_forever()
        except Exception as e:
            print(f"[RECONNECT] Reconnecting ke Local Broker dalam 5 detik... ({e})")
            time.sleep(5)
