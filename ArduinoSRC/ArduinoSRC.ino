#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h> // Library untuk membuat JSON

const char* ssid = "KSM-IF";
const char* password = "k1ta bukan 4ku";
const char* mqtt_server = "192.168.0.2";

const int buzzer = 16;
const int analGas = 34;
const int digiGas = 27;

const unsigned long SENSE_INTERVAL = 2500; // ms
const unsigned long NET_INTERVAL  = 5000;  // ms
const unsigned long PUB_INTERVAL  = 5000;  // ms
const int GAS_THRESHOLD = 1870;

WiFiClient espClient;
PubSubClient client(espClient);

// Nilai sensor terakhir: sensing tetap jalan walau WiFi mati,
// nilainya dipakai blok publish begitu koneksi kembali.
static int inputAnalGas = 0;
static int inputDigiGas = 0;
static const char* status = "good";

void setup() {
  Serial.begin(115200);
  Serial.println("Boot: mulai");

  pinMode(buzzer, OUTPUT);
  pinMode(analGas, INPUT);
  pinMode(digiGas, INPUT);

  client.setServer(mqtt_server, 1883);

  // Tidak ada tunggu blocking di sini: begitu Serial.begin selesai,
  // loop() langsung sensing, WiFi connect Paralel di background.
  WiFi.begin(ssid, password);
  delay(50);
}

void loop() {
  // 1. Sensing: tanpa syarat WiFi, selalu jalan
  static unsigned long lastSense = 0;
  if (millis() - lastSense >= SENSE_INTERVAL) {
    lastSense = millis();

    inputAnalGas = analogRead(analGas);
    inputDigiGas = digitalRead(digiGas);

    Serial.print("Anal Gas:"); Serial.println(inputAnalGas);
    Serial.print("Digi Gas:"); Serial.println(inputDigiGas);

    if (inputAnalGas > GAS_THRESHOLD) {
      status = "bad";
      digitalWrite(buzzer, HIGH);
      delay(1500);
      digitalWrite(buzzer, LOW);
    } else {
      status = "good";
    }
  }

  // 2. Jaringan: reconnect non-blocking, sensor tetap terbaca di atas
  static unsigned long lastNet = 0;
  if (millis() - lastNet >= NET_INTERVAL) {
    lastNet = millis();
    if (WiFi.status() != WL_CONNECTED) {
      WiFi.reconnect();
    } else if (!client.connected()) {
      if (client.connect("ESP32_JSON_Client")) {
        Serial.println("Connected to MQTT");
      }
    } else {
      client.loop();
    }
  }

  // 3. Publish JSON hanya kalau MQTT benar-benar terhubung
  static unsigned long lastMsg = 0;
  if (client.connected() && millis() - lastMsg >= PUB_INTERVAL) {
    lastMsg = millis();

    JsonDocument doc;
    doc["gas_intencity"] = inputAnalGas;
    doc["status"] = status;
    doc["uptime"] = millis() / 1000;

    char buffer[256];
    serializeJson(doc, buffer);

    client.publish("esp32/sensor_data", buffer);

    Serial.print("Sent JSON: ");
    Serial.println(buffer);
  }
}
