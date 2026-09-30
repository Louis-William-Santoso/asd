#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h> // Library untuk membuat JSON

const char* ssid = "KSM-IF";
const char* password = "k1ta bukan 4ku";
const char* mqtt_server = "192.168.0.2";

const int buzzer = 16;
const int analGas = 34;
const int digiGas = 27;

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  unsigned long t = millis();
  while (WiFi.status() != WL_CONNECTED && millis()-t < 15000) delay(500);

  pinMode(buzzer, OUTPUT);
  pinMode(analGas, INPUT);
  pinMode(digiGas, INPUT);

  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.begin(ssid, password);   // atau WiFi.reconnect()
    delay(1000);
    return;
  }
  reconectWifi();

  int inputAnalGas = analogRead(analGas);
  int inputDigiGas = digitalRead(digiGas);

  Serial.print("Anal Gas:"); Serial.println(inputAnalGas);
  Serial.print("Digi Gas:"); Serial.println(inputDigiGas);
  delay(2500);

  char* status = "";
  if(inputAnalGas > 2000){
    digitalWrite(buzzer,HIGH);
    delay(1500);
    digitalWrite(buzzer,LOW);
    status = "bad";
  } else {
    status = "good";
  }

  // Kirim data JSON setiap 5 detik
  static unsigned long lastMsg = 0;
  if (millis() - lastMsg > 5000) {
    lastMsg = millis();

    // 1. Buat Dokumen JSON
    JsonDocument doc;
    
    // 2. Isi Data/Kunci JSON
    doc["gas_intencity"] = inputAnalGas;
    doc["status"] = status;
    doc["uptime"] = millis() / 1000;

    // 3. Konversi JSON ke bentuk String/Buffer
    char buffer[256];
    serializeJson(doc, buffer);

    // 4. Publish ke MQTT Topic
    client.publish("esp32/sensor_data", buffer);
    
    Serial.print("Sent JSON: ");
    Serial.println(buffer);
  }
}

void reconectWifi(){
  if (!client.connected()) {
    // Reconnect logic
    if (client.connect("ESP32_JSON_Client")) {
      Serial.println("Connected to MQTT");
    } else {
      delay(2000);
      return;
    }
  }
  client.loop();
}