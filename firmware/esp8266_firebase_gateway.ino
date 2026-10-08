/*
 * ==============================================================================
 * IoE Smart Shopping Cart — ESP8266 Wi-Fi Firebase Gateway (FINAL VERSION)
 * ==============================================================================
 *
 * HARDWARE: ESP8266 ESP-01 (or NodeMCU)
 * ROLE: Bridges Arduino Uno ↔ Firebase Realtime Database via Wi-Fi
 *
 * ── WIRING: ESP8266 ↔ Arduino Uno ────────────────────────────────────────────
 *  ESP8266 TX  → Arduino D8  (direct wire, 3.3V logic is safe for Uno input)
 *  ESP8266 RX  → Arduino A0  (via 1kΩ+2kΩ voltage divider to drop 5V→3.3V)
 *  ESP8266 VCC → 3.3V (use dedicated 3.3V 500mA regulator — Uno's onboard
 *                       3.3V pin is limited; use AMS1117-3.3 if possible)
 *  ESP8266 CH_PD (EN) → 3.3V  (must be HIGH to enable module)
 *  ESP8266 GND → Arduino GND  (shared common ground — ESSENTIAL)
 *
 * ── VOLTAGE DIVIDER for Arduino A0 → ESP8266 RX ─────────────────────────────
 *  Arduino A0 → 1kΩ → [node] → 2kΩ → GND
 *                         └──→ ESP8266 RX
 *
 * ── UPLOAD PROCEDURE ─────────────────────────────────────────────────────────
 *  Flash this sketch to ESP8266 SEPARATELY (e.g., using a USB-to-Serial adapter
 *  or NodeMCU board). Then plug ESP-01 into the circuit.
 *
 * ── Required Arduino IDE Board & Libraries ───────────────────────────────────
 *  Board:   "Generic ESP8266 Module" (install via Boards Manager)
 *  Library: ArduinoJson by Benoît Blanchon (v6.x)
 *
 * ── FILL IN YOUR CREDENTIALS BELOW ──────────────────────────────────────────
 * ==============================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// ─── ⚙️  USER CONFIGURATION — FILL THESE IN ──────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";       // ← Your Wi-Fi network name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // ← Your Wi-Fi password

// Firebase Realtime Database host (no https://, no trailing slash)
const char* FIREBASE_HOST = "smart-attendance-336ca-default-rtdb.firebaseio.com";

// Cart ID — must match the cart node in your Firebase seed data
const String CART_ID = "CART_004";
// ─────────────────────────────────────────────────────────────────────────────

WiFiClientSecure wifiClient;
HTTPClient http;

unsigned long lastPollTime     = 0;
bool          lastRemovalMode  = false;   // Track state to send MODE:NORMAL
bool          lastTheftAlarm   = false;   // Track to send ALARM:RESET
String        lastStatus       = "";      // Track payment completion

// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(9600);   // UART to Arduino Uno (D8/A0 via SoftwareSerial on Uno)
  delay(500);

  wifiClient.setInsecure(); // Skip SSL cert check (acceptable for IoT prototype)

  // Connect to Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    // Notify Arduino that we're online
    Serial.println("LCD:Wi-Fi Connected|Cart #004 Online");
    initCartInFirebase();
  } else {
    Serial.println("LCD:Wi-Fi Failed!|Check Credentials");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
void loop() {
  // Handle incoming messages from Arduino (scans, telemetry, alarms)
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) {
      handleArduinoMessage(line);
    }
  }

  // Poll Firebase every 1.5s for cloud-driven state changes
  if (millis() - lastPollTime > 1500) {
    lastPollTime = millis();
    pollFirebaseStatus();
  }
}

// ─── Handle Serial Messages from Arduino ──────────────────────────────────────
void handleArduinoMessage(String msg) {

  // SCAN:<CART_ID>:<UID>:ADD — RFID scan add item
  if (msg.startsWith("SCAN:") && msg.endsWith(":ADD")) {
    String uid = extractField(msg, 2);
    addItemToCloud(uid);
  }

  // SCAN:<CART_ID>:<UID>:REM — RFID scan remove item
  else if (msg.startsWith("SCAN:") && msg.endsWith(":REM")) {
    String uid = extractField(msg, 2);
    removeItemFromCloud(uid);
  }

  // TELEM:<CART_ID>:<TEMP>:<HUM>:<OBS>:<DIM>:<VIB>
  else if (msg.startsWith("TELEM:")) {
    pushTelemetry(msg);
  }

  // ALARM:<CART_ID>:THEFT
  else if (msg.startsWith("ALARM:") && msg.endsWith(":THEFT")) {
    triggerTheftAlarmCloud();
  }
}

// ─── Firebase: Initialise Cart Node ───────────────────────────────────────────
void initCartInFirebase() {
  String url = buildUrl("/carts/" + CART_ID + ".json");
  http.begin(wifiClient, url);
  int code = http.GET();
  // If cart doesn't exist (null response), create minimal node
  if (code == 200) {
    String body = http.getString();
    if (body == "null" || body.length() < 5) {
      http.end();
      // Create default cart node
      String initJson = "{\"cart_id\":\"" + CART_ID + "\","
                        "\"status\":\"available\","
                        "\"paired_user\":\"\","
                        "\"total\":0,"
                        "\"total_items\":0,"
                        "\"removal_mode\":false,"
                        "\"theft_alarm\":false}";
      http.begin(wifiClient, url);
      http.addHeader("Content-Type", "application/json");
      http.PUT(initJson);
    }
  }
  http.end();
}

// ─── Firebase: Add Scanned Item ────────────────────────────────────────────────
void addItemToCloud(String uid) {
  // 1. Fetch product info from /products/<uid>
  String prodUrl = buildUrl("/products/" + uid + ".json");
  http.begin(wifiClient, prodUrl);
  int code = http.GET();

  if (code == 200) {
    String body = http.getString();
    http.end();

    DynamicJsonDocument doc(512);
    deserializeJson(doc, body);

    if (!doc.isNull()) {
      String name  = doc["name"]  | doc["item"] | "Unknown Item";
      float  price = doc["price"] | 0.0;
      bool   cold  = doc["is_cold"] | false;

      // 2. Write item to /carts/<CART_ID>/items/<uid>
      String itemUrl = buildUrl("/carts/" + CART_ID + "/items/" + uid + ".json");
      http.begin(wifiClient, itemUrl);
      http.addHeader("Content-Type", "application/json");

      String itemJson = "{\"uid\":\"" + uid + "\","
                        "\"name\":\"" + name + "\","
                        "\"price\":" + String(price, 2) + ","
                        "\"is_cold\":" + (cold ? "true" : "false") + ","
                        "\"quantity\":1}";
      http.PUT(itemJson);
      http.end();

      // 3. Recalculate and update cart totals
      recalculateTotals();

      // 4. Tell Arduino LCD what was added
      String shortName = name.length() > 10 ? name.substring(0, 10) : name;
      Serial.println("LCD:" + shortName + " Added|Rs." + String(price, 0));
    } else {
      http.end();
      Serial.println("LCD:Unknown Tag!|Not in Catalog");
    }
  } else {
    http.end();
    Serial.println("LCD:DB Error " + String(code) + "|Check Firebase");
  }
}

// ─── Firebase: Remove Scanned Item ────────────────────────────────────────────
void removeItemFromCloud(String uid) {
  // Delete item from cart
  String itemUrl = buildUrl("/carts/" + CART_ID + "/items/" + uid + ".json");
  http.begin(wifiClient, itemUrl);
  http.sendRequest("DELETE");
  http.end();

  // Clear removal mode flags on Firebase
  String patchUrl = buildUrl("/carts/" + CART_ID + ".json");
  http.begin(wifiClient, patchUrl);
  http.addHeader("Content-Type", "application/json");
  http.sendRequest("PATCH", "{\"removal_mode\":false,\"removal_target_uid\":null}");
  http.end();

  // Recalculate totals
  recalculateTotals();

  Serial.println("LCD:Item Removed|Updated Cart");
  Serial.println("MODE:NORMAL");
}

// ─── Firebase: Recalculate & Sync Cart Totals ─────────────────────────────────
void recalculateTotals() {
  String url = buildUrl("/carts/" + CART_ID + "/items.json");
  http.begin(wifiClient, url);
  int code = http.GET();

  float total     = 0.0;
  int   totalItems = 0;

  if (code == 200) {
    String body = http.getString();
    http.end();

    if (body != "null" && body.length() > 2) {
      DynamicJsonDocument doc(2048);
      deserializeJson(doc, body);
      JsonObject obj = doc.as<JsonObject>();
      for (JsonPair kv : obj) {
        total     += kv.value()["price"].as<float>();
        totalItems++;
      }
    }
  } else {
    http.end();
  }

  // Write updated totals back to Firebase
  String patchUrl = buildUrl("/carts/" + CART_ID + ".json");
  http.begin(wifiClient, patchUrl);
  http.addHeader("Content-Type", "application/json");
  String patch = "{\"total\":" + String(total, 2) + ",\"total_items\":" + String(totalItems) + "}";
  http.sendRequest("PATCH", patch);
  http.end();

  // Tell Arduino LCD the running total
  Serial.println("TOTAL:" + String(totalItems) + ":" + String(total, 0));
}

// ─── Firebase: Push Telemetry Data ────────────────────────────────────────────
void pushTelemetry(String msg) {
  // Format: TELEM:<CART_ID>:<TEMP>:<HUM>:<OBS>:<DIM>:<VIB>
  int c1 = msg.indexOf(':', 0);
  int c2 = msg.indexOf(':', c1 + 1);
  int c3 = msg.indexOf(':', c2 + 1);
  int c4 = msg.indexOf(':', c3 + 1);
  int c5 = msg.indexOf(':', c4 + 1);
  int c6 = msg.indexOf(':', c5 + 1);

  float temp = msg.substring(c2 + 1, c3).toFloat();
  float hum  = msg.substring(c3 + 1, c4).toFloat();
  bool obs   = msg.substring(c4 + 1, c5) == "1";
  bool dim   = msg.substring(c5 + 1, c6) == "1";
  bool vib   = msg.substring(c6 + 1)     == "1";

  String json = "{\"temp_c\":"     + String(temp, 1) +
                ",\"humidity\":"   + String(hum, 1)  +
                ",\"obstacle\":"   + (obs ? "true" : "false") +
                ",\"dim_lighting\":" + (dim ? "true" : "false") +
                ",\"vibration\":"  + (vib ? "true" : "false") + "}";

  String url = buildUrl("/carts/" + CART_ID + "/telemetry.json");
  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");
  http.PUT(json);
  http.end();
}

// ─── Firebase: Trigger Theft Alarm ────────────────────────────────────────────
void triggerTheftAlarmCloud() {
  String url = buildUrl("/carts/" + CART_ID + ".json");
  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");
  http.sendRequest("PATCH", "{\"theft_alarm\":true,\"status\":\"alarm\"}");
  http.end();
}

// ─── Firebase: Poll for Cloud State Changes ────────────────────────────────────
void pollFirebaseStatus() {
  String url = buildUrl("/carts/" + CART_ID + ".json");
  http.begin(wifiClient, url);
  int code = http.GET();

  if (code != 200) {
    http.end();
    return;
  }

  String body = http.getString();
  http.end();

  DynamicJsonDocument doc(2048);
  deserializeJson(doc, body);

  String status      = doc["status"]       | "available";
  bool removalMode   = doc["removal_mode"] | false;
  bool theftAlarm    = doc["theft_alarm"]  | false;
  String pairedUser  = doc["paired_user"]  | "";

  // ── Cart linked (mobile app scanned QR) ──
  if (pairedUser.length() > 0 && !pairedUser.equals("\"\"")) {
    static String lastUser = "";
    if (lastUser != pairedUser) {
      lastUser = pairedUser;
      Serial.println("LINKED:" + pairedUser);
    }
  }

  // ── Removal mode toggled ON from mobile app ──
  if (removalMode && !lastRemovalMode) {
    Serial.println("MODE:REMOVAL");
  }
  // ── Removal mode cleared ──
  if (!removalMode && lastRemovalMode) {
    Serial.println("MODE:NORMAL");
  }
  lastRemovalMode = removalMode;

  // ── Payment completed on mobile app ──
  if (status == "paid" && lastStatus != "paid") {
    Serial.println("PAID:SUCCESS");
    lastStatus = "paid";
  }
  if (status != "paid" && lastStatus == "paid") {
    lastStatus = status; // Reset tracking after new session
  }

  // ── Theft alarm disarmed from mobile app ──
  if (!theftAlarm && lastTheftAlarm) {
    Serial.println("ALARM:RESET");
  }
  lastTheftAlarm = theftAlarm;
}

// ─── Utilities ────────────────────────────────────────────────────────────────
String buildUrl(String path) {
  return "https://" + String(FIREBASE_HOST) + path;
}

// Extract the Nth colon-delimited field (0-indexed) from a string
String extractField(String str, int fieldIndex) {
  int start = 0;
  int count = 0;
  for (int i = 0; i < str.length(); i++) {
    if (str[i] == ':') {
      if (count == fieldIndex) {
        int end = str.indexOf(':', i + 1);
        if (end == -1) return str.substring(i + 1);
        return str.substring(i + 1, end);
      }
      count++;
      start = i + 1;
    }
  }
  return "";
}
