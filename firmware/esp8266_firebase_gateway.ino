/*
 * IoE Smart Shopping Cart — ESP8266 Firebase Gateway
 * Step 2: Arduino <-> Firebase bridge
 *
 * Arduino serial:
 *   SCAN:CART_ID:UID:ADD
 *   SCAN:CART_ID:UID:REM
 *   TELEM:CART_ID:TEMP:HUM:OBSTACLE:0:0
 *
 * ESP -> Arduino:
 *   LCD:<line1>|<line2>
 *   LINKED:<user>
 *   TOTAL:<count>:<total>
 *   MODE:REMOVAL
 *   MODE:NORMAL
 *
 * LDR, SW-420, theft alarm and payment gateway are intentionally not used.
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// ---------------- Configuration ----------------

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* FIREBASE_HOST =
  "smart-attendance-336ca-default-rtdb.firebaseio.com";

const String CART_ID = "CART_004";

const unsigned long FIREBASE_POLL_MS = 1500;

// Cold-section temperature threshold.
// This is only a display/data warning; it does not control cooling hardware.
const float COLD_ALERT_TEMP_C = 8.0;

// ---------------- Runtime ----------------

WiFiClientSecure wifiClient;

unsigned long lastPollTime = 0;
bool lastRemovalMode = false;
String lastPairedUser = "";

void setup() {
  Serial.begin(9600);
  delay(500);

  wifiClient.setInsecure();

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;

  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("LCD:Wi-Fi Connected|Cart #004 Online");
    initCartInFirebase();
  } else {
    Serial.println("LCD:Wi-Fi Failed!|Check Credentials");
  }
}

void loop() {
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();

    if (line.length() > 0) {
      handleArduinoMessage(line);
    }
  }

  if (millis() - lastPollTime >= FIREBASE_POLL_MS) {
    lastPollTime = millis();
    pollFirebaseStatus();
  }
}

// ---------------- Arduino -> Firebase ----------------

void handleArduinoMessage(String msg) {
  if (msg.startsWith("SCAN:") && msg.endsWith(":ADD")) {
    String uid = extractScanUid(msg);
    if (uid.length() > 0) {
      addItemToCloud(uid);
    }
    return;
  }

  if (msg.startsWith("SCAN:") && msg.endsWith(":REM")) {
    String uid = extractScanUid(msg);
    if (uid.length() > 0) {
      removeItemFromCloud(uid);
    }
    return;
  }

  if (msg.startsWith("TELEM:")) {
    pushTelemetry(msg);
    return;
  }
}

String extractScanUid(String msg) {
  // SCAN:<cart>:<uid>:ADD/REM
  int first = msg.indexOf(':');
  int second = msg.indexOf(':', first + 1);
  int third = msg.indexOf(':', second + 1);

  if (first < 0 || second < 0 || third < 0) return "";

  return msg.substring(second + 1, third);
}

// ---------------- Cart initialisation ----------------

void initCartInFirebase() {
  String url = buildUrl("/carts/" + CART_ID + ".json");

  HTTPClient http;
  http.begin(wifiClient, url);

  int code = http.GET();

  if (code == 200) {
    String body = http.getString();
    http.end();

    if (body == "null" || body.length() < 5) {
      String initJson =
        "{"
        "\"cart_id\":\"" + CART_ID + "\","
        "\"status\":\"available\","
        "\"paired_user\":null,"
        "\"items\":{},"
        "\"total\":0,"
        "\"total_items\":0,"
        "\"removal_mode\":false,"
        "\"removal_target_uid\":null,"
        "\"theft_alarm\":false"
        "}";

      http.begin(wifiClient, url);
      http.addHeader("Content-Type", "application/json");
      http.PUT(initJson);
      http.end();
    }
  } else {
    http.end();
  }
}

// ---------------- Add item ----------------

void addItemToCloud(String uid) {
  String prodUrl = buildUrl("/products/" + uid + ".json");

  HTTPClient http;
  http.begin(wifiClient, prodUrl);

  int code = http.GET();

  if (code != 200) {
    http.end();
    Serial.println("LCD:DB Error|Product lookup failed");
    return;
  }

  String body = http.getString();
  http.end();

  DynamicJsonDocument doc(768);
  DeserializationError error = deserializeJson(doc, body);

  if (error || doc.isNull()) {
    Serial.println("LCD:Unknown Tag|Not in Catalog");
    return;
  }

  String name = doc["name"] | doc["item"] | "Unknown Item";
  float price = doc["price"] | 0.0;
  bool cold = doc["is_cold"] | false;

  String itemUrl =
    buildUrl("/carts/" + CART_ID + "/items/" + uid + ".json");

  String itemJson =
    "{\"uid\":\"" + uid +
    "\",\"name\":\"" + name +
    "\",\"price\":" + String(price, 2) +
    ",\"is_cold\":" + String(cold ? "true" : "false") +
    ",\"quantity\":1}";

  http.begin(wifiClient, itemUrl);
  http.addHeader("Content-Type", "application/json");
  int putCode = http.PUT(itemJson);
  http.end();

  if (putCode < 200 || putCode >= 300) {
    Serial.println("LCD:Cart Update Error|Try Again");
    return;
  }

  recalculateTotals();

  String shortName = name;
  if (shortName.length() > 10) shortName = shortName.substring(0, 10);

  Serial.println(
    "LCD:" + shortName + " Added|Rs." + String(price, 0)
  );
}

// ---------------- Remove item ----------------

void removeItemFromCloud(String uid) {
  String itemUrl =
    buildUrl("/carts/" + CART_ID + "/items/" + uid + ".json");

  HTTPClient http;
  http.begin(wifiClient, itemUrl);

  int code = http.sendRequest("DELETE");
  http.end();

  if (code < 200 || code >= 300) {
    Serial.println("LCD:Remove Failed|Try Again");
    return;
  }

  String cartUrl = buildUrl("/carts/" + CART_ID + ".json");

  http.begin(wifiClient, cartUrl);
  http.addHeader("Content-Type", "application/json");
  http.sendRequest(
    "PATCH",
    "{\"removal_mode\":false,\"removal_target_uid\":null}"
  );
  http.end();

  recalculateTotals();

  Serial.println("LCD:Item Removed|Updated Cart");
  Serial.println("MODE:NORMAL");
}

// ---------------- Totals ----------------

void recalculateTotals() {
  String url =
    buildUrl("/carts/" + CART_ID + "/items.json");

  HTTPClient http;
  http.begin(wifiClient, url);

  int code = http.GET();

  float total = 0.0;
  int totalItems = 0;

  if (code == 200) {
    String body = http.getString();
    http.end();

    if (body != "null" && body.length() > 2) {
      DynamicJsonDocument doc(4096);

      if (!deserializeJson(doc, body)) {
        JsonObject items = doc.as<JsonObject>();

        for (JsonPair kv : items) {
          total += kv.value()["price"].as<float>();
          totalItems++;
        }
      }
    }
  } else {
    http.end();
  }

  String cartUrl = buildUrl("/carts/" + CART_ID + ".json");

  http.begin(wifiClient, cartUrl);
  http.addHeader("Content-Type", "application/json");

  String patch =
    "{\"total\":" + String(total, 2) +
    ",\"total_items\":" + String(totalItems) +
    ",\"status\":\"active\"}";

  http.sendRequest("PATCH", patch);
  http.end();

  Serial.println(
    "TOTAL:" + String(totalItems) + ":" + String(total, 0)
  );
}

// ---------------- DHT + IR telemetry ----------------

void pushTelemetry(String msg) {
  // TELEM:<cart>:<temp>:<humidity>:<obstacle>:0:0

  int c1 = msg.indexOf(':');
  int c2 = msg.indexOf(':', c1 + 1);
  int c3 = msg.indexOf(':', c2 + 1);
  int c4 = msg.indexOf(':', c3 + 1);
  int c5 = msg.indexOf(':', c4 + 1);
  int c6 = msg.indexOf(':', c5 + 1);

  if (c1 < 0 || c2 < 0 || c3 < 0 ||
      c4 < 0 || c5 < 0 || c6 < 0) {
    return;
  }

  float temp = msg.substring(c2 + 1, c3).toFloat();
  float humidity = msg.substring(c3 + 1, c4).toFloat();
  bool obstacle = msg.substring(c4 + 1, c5) == "1";

  bool coldAlert = temp > COLD_ALERT_TEMP_C;

  String json =
    "{"
    "\"temp_c\":" + String(temp, 1) +
    ",\"humidity\":" + String(humidity, 1) +
    ",\"cold_alert\":" + String(coldAlert ? "true" : "false") +
    ",\"obstacle\":" + String(obstacle ? "true" : "false") +
    "}";

  String url =
    buildUrl("/carts/" + CART_ID + "/telemetry.json");

  HTTPClient http;
  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");
  http.PUT(json);
  http.end();

  // Keep the cart's main telemetry fields in sync for the web apps.
  String cartUrl = buildUrl("/carts/" + CART_ID + ".json");

  http.begin(wifiClient, cartUrl);
  http.addHeader("Content-Type", "application/json");

  String patch =
    "{"
    "\"telemetry\":" + json +
    ",\"last_updated\":" + String(millis()) +
    "}";

  http.sendRequest("PATCH", patch);
  http.end();
}

// ---------------- Firebase -> Arduino ----------------

void pollFirebaseStatus() {
  String url =
    buildUrl("/carts/" + CART_ID + ".json");

  HTTPClient http;
  http.begin(wifiClient, url);

  int code = http.GET();

  if (code != 200) {
    http.end();
    return;
  }

  String body = http.getString();
  http.end();

  DynamicJsonDocument doc(4096);

  if (deserializeJson(doc, body)) {
    return;
  }

  bool removalMode = doc["removal_mode"] | false;
  String pairedUser = doc["paired_user"] | "";

  // QR pairing from the mobile web app.
  if (pairedUser.length() > 0 &&
      pairedUser != "null" &&
      pairedUser != lastPairedUser) {

    lastPairedUser = pairedUser;
    Serial.println("LINKED:" + pairedUser);
  }

  // Mobile app requests physical RFID removal.
  if (removalMode && !lastRemovalMode) {
    Serial.println("MODE:REMOVAL");
  }

  if (!removalMode && lastRemovalMode) {
    Serial.println("MODE:NORMAL");
  }

  lastRemovalMode = removalMode;

  // Keep the LCD total synchronized with Firebase.
  int totalItems = doc["total_items"] | 0;
  float total = doc["total"] | 0.0;

  static int lastItems = -1;
  static float lastTotal = -1.0;

  if (totalItems != lastItems ||
      abs(total - lastTotal) > 0.01) {

    lastItems = totalItems;
    lastTotal = total;

    Serial.println(
      "TOTAL:" + String(totalItems) +
      ":" + String(total, 0)
    );
  }
}

// ---------------- Utilities ----------------

String buildUrl(String path) {
  return "https://" + String(FIREBASE_HOST) + path;
}
