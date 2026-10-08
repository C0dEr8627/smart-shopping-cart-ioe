/*
 * ==============================================================================
 * IoE Smart Shopping Cart — Arduino Uno Firmware (FINAL PRODUCTION VERSION)
 * ==============================================================================
 *
 * HARDWARE: Arduino Uno
 * ALL MODULES use DuPont jumper wires — no soldering required.
 *
 * ── Pin Map (Arduino Uno) ─────────────────────────────────────────────────────
 *  D0  (RX)       → [RESERVED for USB upload only — keep free during upload]
 *  D1  (TX)       → [RESERVED for USB upload only — keep free during upload]
 *  D2             → DHT11 DATA
 *  D3             → IR Obstacle Sensor OUT
 *  D4             → LDR Digital Output (DO)
 *  D5             → SW-420 Vibration Sensor DO
 *  D6             → HC-SR04 Echo
 *  D7             → HC-SR04 Trigger
 *  D8             → SoftwareSerial RX ← ESP8266 TX (3.3V safe, direct wire)
 *  D9             → RFID RST
 *  D10 (SS)       → RFID SDA (SS)
 *  D11 (MOSI)     → RFID MOSI  [SPI — fixed]
 *  D12 (MISO)     → RFID MISO  [SPI — fixed]
 *  D13 (SCK)      → RFID SCK   [SPI — fixed]
 *  A0             → SoftwareSerial TX → ESP8266 RX (via 1kΩ+2kΩ voltage divider)
 *  A1             → Green LED (via 220Ω resistor)
 *  A2             → Red LED (via 220Ω resistor)
 *  A3             → Basket LED Lightbar (via 220Ω or transistor)
 *  A4 (SDA)       → I2C LCD SDA  [I2C — fixed]
 *  A5 (SCL)       → I2C LCD SCL  [I2C — fixed]
 *
 * ── IMPORTANT: UPLOAD PROCEDURE ──────────────────────────────────────────────
 *  1. Disconnect ESP8266 TX/RX wires from D8 and A0 BEFORE uploading sketch.
 *  2. Upload via USB normally.
 *  3. Reconnect ESP8266 TX → D8 and ESP8266 RX → A0 (via voltage divider).
 *  4. Power-cycle the Arduino — done.
 *
 * ── ESP8266 Voltage Divider for Arduino TX (A0 → ESP8266 RX) ─────────────────
 *  Arduino A0 (5V) → 1kΩ → [junction] → ESP8266 RX
 *                              2kΩ ↓
 *                             GND
 * (This safely drops 5V logic to ~3.3V for ESP8266)
 *
 * ── Required Libraries (Arduino IDE Library Manager) ─────────────────────────
 *  1. MFRC522          (by GithubCommunity)
 *  2. LiquidCrystal_I2C (by Frank de Brabander)
 *  3. DHT sensor library (by Adafruit)
 *  4. Adafruit Unified Sensor
 * ==============================================================================
 */

#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <SoftwareSerial.h>

// ─── SoftwareSerial for ESP8266 Communication ────────────────────────────────
// D8 = RX (from ESP8266 TX) | A0 = TX (to ESP8266 RX via voltage divider)
SoftwareSerial espSerial(8, A0);   // RX=D8, TX=A0

// ─── Pin Definitions ─────────────────────────────────────────────────────────
#define RFID_SS_PIN      10
#define RFID_RST_PIN      9
#define US_TRIG_PIN       7
#define US_ECHO_PIN       6
#define DHT_PIN           2
#define IR_OBSTACLE_PIN   3   // LOW = obstacle detected
#define LDR_PIN           4   // LOW = dark aisle
#define VIBRATION_PIN     5   // HIGH = motion detected
#define BUZZER_PIN       13   // Active buzzer (moved from 8 to 13 - no SPI conflict during runtime)
#define LED_GREEN_PIN    A1
#define LED_RED_PIN      A2
#define LED_LIGHTBAR_PIN A3

// ─── Module Instances ─────────────────────────────────────────────────────────
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2);  // Try 0x3F if 0x27 doesn't work
#define DHTTYPE DHT11
DHT dht(DHT_PIN, DHTTYPE);

// ─── Cart State Variables ─────────────────────────────────────────────────────
const String CART_ID           = "CART_004";
bool isLinked                  = false;
bool isRemovalMode             = false;
bool isPaid                    = false;
bool theftAlarmTriggered       = false;
int  itemCount                 = 0;
float cartTotal                = 0.0;

unsigned long lastTelemetryTime  = 0;
unsigned long lastScanCooldown   = 0;
unsigned long lastAlarmBeep      = 0;

// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  // SoftwareSerial to ESP8266 (9600 baud — do NOT use hardware Serial)
  espSerial.begin(9600);

  // SPI + RFID
  SPI.begin();
  rfid.PCD_Init();

  // Sensor pins
  pinMode(US_TRIG_PIN,      OUTPUT);
  pinMode(US_ECHO_PIN,      INPUT);
  pinMode(IR_OBSTACLE_PIN,  INPUT);
  pinMode(LDR_PIN,          INPUT);
  pinMode(VIBRATION_PIN,    INPUT);
  pinMode(BUZZER_PIN,       OUTPUT);
  pinMode(LED_GREEN_PIN,    OUTPUT);
  pinMode(LED_RED_PIN,      OUTPUT);
  pinMode(LED_LIGHTBAR_PIN, OUTPUT);

  // Safe initial state
  digitalWrite(BUZZER_PIN,       LOW);
  digitalWrite(LED_GREEN_PIN,    LOW);
  digitalWrite(LED_RED_PIN,      LOW);
  digitalWrite(LED_LIGHTBAR_PIN, LOW);

  // I2C LCD
  lcd.init();
  lcd.backlight();
  lcdShow("IoE SmartCart", "Cart: " + CART_ID);

  dht.begin();
  delay(1200);

  // Startup screen
  lcdShow("Welcome! " + CART_ID, "Scan QR to Pair");
  beep(120);
}

// ─────────────────────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // 1. Process commands arriving from ESP8266 cloud gateway
  processEspCommands();

  // 2. Anti-theft monitoring (Stage 5)
  checkAntiTheft(now);

  // 3. IR collision warning (Stage 3)
  checkCollisionWarning();

  // 4. Ambient basket lighting (Stage 3)
  checkAmbientLighting();

  // 5. RFID basket scan (Stage 2 & 4) — only if no active alarm
  if (!theftAlarmTriggered) {
    checkBasketScan();
  }

  // 6. Telemetry push to ESP8266 every 4 seconds (Stage 3)
  if (now - lastTelemetryTime > 4000) {
    lastTelemetryTime = now;
    sendTelemetry();
  }
}

// ─── Stage 2 & 4: Item Scan Logic ─────────────────────────────────────────────
void checkBasketScan() {
  // 2 second debounce between scans
  if (millis() - lastScanCooldown < 2000) return;

  // Detect object entering basket (ultrasonic < 18cm)
  long dist = readUltrasonicCm();
  bool objectEntering = (dist > 0 && dist < 18);

  // Try to read RFID tag if object detected OR tag is already near reader
  if (objectEntering || rfid.PICC_IsNewCardPresent()) {
    if (rfid.PICC_ReadCardSerial()) {
      String uid = "";
      for (byte i = 0; i < rfid.uid.size; i++) {
        if (rfid.uid.uidByte[i] < 0x10) uid += "0";
        uid += String(rfid.uid.uidByte[i], HEX);
      }
      uid.toUpperCase();

      lastScanCooldown = millis();

      if (isRemovalMode) {
        doRemovalScan(uid);
      } else {
        doAddItemScan(uid);
      }

      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
    }
  }
}

void doAddItemScan(String uid) {
  lcdShow("Scanned Tag:", uid.substring(0, 8));
  digitalWrite(LED_GREEN_PIN, HIGH);
  beep(120);
  digitalWrite(LED_GREEN_PIN, LOW);

  // Send to ESP8266 → Firebase
  // Format: SCAN:<CART_ID>:<UID>:ADD
  espSerial.println("SCAN:" + CART_ID + ":" + uid + ":ADD");
}

void doRemovalScan(String uid) {
  lcdShow("Removing Tag:", uid.substring(0, 8));
  digitalWrite(LED_RED_PIN, HIGH);
  beep(80); delay(80); beep(80);
  digitalWrite(LED_RED_PIN, LOW);

  isRemovalMode = false;
  digitalWrite(LED_RED_PIN, LOW);

  // Send to ESP8266 → Firebase
  // Format: SCAN:<CART_ID>:<UID>:REM
  espSerial.println("SCAN:" + CART_ID + ":" + uid + ":REM");
}

// ─── Stage 3: Passive Safety Sensors ──────────────────────────────────────────
void checkCollisionWarning() {
  // IR goes LOW on obstacle within ~15cm
  if (digitalRead(IR_OBSTACLE_PIN) == LOW) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(20);
    digitalWrite(BUZZER_PIN, LOW);
    delay(20);
  }
}

void checkAmbientLighting() {
  // LDR goes LOW in dark conditions
  bool isDark = (digitalRead(LDR_PIN) == LOW);
  digitalWrite(LED_LIGHTBAR_PIN, isDark ? HIGH : LOW);
}

// ─── Stage 3: Telemetry Push ────────────────────────────────────────────────
void sendTelemetry() {
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  // Use safe fallback if sensor read fails
  if (isnan(temp)) temp = 21.0;
  if (isnan(hum))  hum  = 55.0;

  bool obstacle = (digitalRead(IR_OBSTACLE_PIN) == LOW);
  bool dimLight = (digitalRead(LDR_PIN)          == LOW);
  bool vib      = (digitalRead(VIBRATION_PIN)    == HIGH);

  // Format: TELEM:<CART_ID>:<TEMP>:<HUM>:<OBSTACLE>:<DIM>:<VIB>
  espSerial.print("TELEM:");
  espSerial.print(CART_ID);
  espSerial.print(":");
  espSerial.print(temp, 1);
  espSerial.print(":");
  espSerial.print(hum, 1);
  espSerial.print(":");
  espSerial.print(obstacle ? "1" : "0");
  espSerial.print(":");
  espSerial.print(dimLight ? "1" : "0");
  espSerial.print(":");
  espSerial.println(vib ? "1" : "0");
}

// ─── Stage 5: Anti-Theft ──────────────────────────────────────────────────────
void checkAntiTheft(unsigned long now) {
  if (theftAlarmTriggered) {
    // Pulse siren every 200ms without blocking loop
    if (now - lastAlarmBeep > 200) {
      lastAlarmBeep = now;
      bool buzzerState = (now / 200) % 2;
      digitalWrite(BUZZER_PIN, buzzerState);
      digitalWrite(LED_RED_PIN, buzzerState);
    }
    return;
  }

  // Trigger: cart has items, not paid, and physical motion detected
  if (itemCount > 0 && !isPaid && digitalRead(VIBRATION_PIN) == HIGH) {
    theftAlarmTriggered = true;
    lcdShow("SECURITY ALERT!", "UNPAID MOVEMENT");
    // Notify cloud
    espSerial.println("ALARM:" + CART_ID + ":THEFT");
  }
}

// ─── Stage 6: Process Commands From ESP8266 Cloud ────────────────────────────
void processEspCommands() {
  while (espSerial.available()) {
    String msg = espSerial.readStringUntil('\n');
    msg.trim();
    if (msg.length() == 0) continue;

    // LCD:<Line1>|<Line2>  — display update from cloud
    if (msg.startsWith("LCD:")) {
      int sep = msg.indexOf('|');
      if (sep > 4) {
        lcdShow(msg.substring(4, sep), msg.substring(sep + 1));
      } else {
        lcdShow(msg.substring(4), "");
      }
    }

    // LINKED:<username>  — QR pairing confirmed from mobile app
    else if (msg.startsWith("LINKED:")) {
      isLinked = true;
      String user = msg.substring(7);
      if (user.length() > 10) user = user.substring(0, 10);
      lcdShow("Linked! " + user, "Ready to Shop!");
      digitalWrite(LED_GREEN_PIN, HIGH);
      beep(200);
      delay(100);
      beep(100);
      digitalWrite(LED_GREEN_PIN, LOW);
    }

    // TOTAL:<items>:<total>  — live cart summary from cloud
    else if (msg.startsWith("TOTAL:")) {
      int c1 = msg.indexOf(':', 6);
      if (c1 > 6) {
        itemCount  = msg.substring(6, c1).toInt();
        cartTotal  = msg.substring(c1 + 1).toFloat();
        lcdShow(String(itemCount) + " item(s)", "Rs." + String(cartTotal, 0));
      }
    }

    // MODE:REMOVAL  — triggered from mobile app
    else if (msg == "MODE:REMOVAL") {
      isRemovalMode = true;
      lcdShow("Scan to Remove", "Present Item Tag");
      digitalWrite(LED_RED_PIN, HIGH);
    }

    // MODE:NORMAL  — removal mode cleared
    else if (msg == "MODE:NORMAL") {
      isRemovalMode = false;
      digitalWrite(LED_RED_PIN, LOW);
    }

    // PAID:SUCCESS  — payment completed on mobile app
    else if (msg.startsWith("PAID:SUCCESS")) {
      isPaid              = true;
      theftAlarmTriggered = false;
      isRemovalMode       = false;
      itemCount           = 0;
      cartTotal           = 0.0;
      digitalWrite(BUZZER_PIN, LOW);
      digitalWrite(LED_RED_PIN, LOW);
      digitalWrite(LED_GREEN_PIN, HIGH);
      lcdShow("Payment Success!", "Thank You! Bye!");
      chimeSuccess();
      delay(3000);
      lcdShow("IoE SmartCart", "Scan QR to Start");
      digitalWrite(LED_GREEN_PIN, LOW);
      isPaid = false;  // Reset for next session
    }

    // ALARM:RESET  — alarm disarmed from mobile app
    else if (msg == "ALARM:RESET") {
      theftAlarmTriggered = false;
      digitalWrite(BUZZER_PIN, LOW);
      digitalWrite(LED_RED_PIN, LOW);
      lcdShow("Alarm Cleared", "Cart Safe");
      delay(1500);
      lcdShow(String(itemCount) + " item(s)", "Rs." + String(cartTotal, 0));
    }
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
long readUltrasonicCm() {
  digitalWrite(US_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(US_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(US_TRIG_PIN, LOW);
  long dur = pulseIn(US_ECHO_PIN, HIGH, 25000UL); // 25ms timeout
  if (dur == 0) return -1;
  return dur * 0.034 / 2;
}

void lcdShow(String line1, String line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(line2.substring(0, 16));
}

void beep(int ms) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(ms);
  digitalWrite(BUZZER_PIN, LOW);
}

void chimeSuccess() {
  beep(100); delay(80);
  beep(100); delay(80);
  beep(260);
}
