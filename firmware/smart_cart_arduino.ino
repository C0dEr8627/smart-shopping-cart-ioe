/*
 * IoE Smart Shopping Cart — Arduino Uno Firmware
 * Step 1: RFID + item-placement verification + temperature + IR safety
 *
 * Pins used:
 * D2  DHT11 DATA
 * D3  IR sensor OUT (LOW = obstacle)
 * D6  HC-SR04 TRIG
 * D7  HC-SR04 ECHO
 * D8  ESP8266 TX -> Arduino RX
 * D9  RC522 RST
 * D10 RC522 SS/SDA
 * D11 RC522 MOSI
 * D12 RC522 MISO
 * D13 RC522 SCK
 * A0  Arduino TX -> ESP8266 RX through 1k/2k divider
 * A1  Active buzzer
 * A2  Green LED
 * A3  Red LED
 * A4  LCD SDA
 * A5  LCD SCL
 *
 * RC522 VCC MUST be 3.3V.
 * LDR and SW-420 are intentionally not used.
 */

#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <SoftwareSerial.h>

SoftwareSerial espSerial(8, A0); // RX, TX

#define RFID_SS_PIN    10
#define RFID_RST_PIN    9
#define DHT_PIN         2
#define IR_PIN          3
#define US_TRIG_PIN     6
#define US_ECHO_PIN     7
#define BUZZER_PIN     A1
#define LED_GREEN_PIN  A2
#define LED_RED_PIN    A3

#define DHTTYPE DHT11

MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHT_PIN, DHTTYPE);

// Tune this for the actual basket geometry.
const int ITEM_DETECT_DISTANCE_CM = 18;

// After RFID scan, allow this much time for the physical item to be placed.
const unsigned long RFID_VERIFY_WINDOW_MS = 5000;

// Prevent one physical item from generating repeated warnings.
const unsigned long ITEM_EVENT_COOLDOWN_MS = 2500;

// RFID debounce.
const unsigned long RFID_SCAN_COOLDOWN_MS = 1200;

// Temperature refresh.
const unsigned long TEMP_INTERVAL_MS = 3000;

// IR warning repeat interval.
const unsigned long IR_WARNING_INTERVAL_MS = 500;

const String CART_ID = "CART_004";

bool isLinked = false;
bool isRemovalMode = false;

String pendingUid = "";
unsigned long pendingUidTime = 0;
unsigned long lastPhysicalEvent = 0;
unsigned long lastRfidScan = 0;
unsigned long lastTempRead = 0;
unsigned long lastIrWarning = 0;

float currentTemp = NAN;
float currentHumidity = NAN;

void setup() {
  espSerial.begin(9600);

  SPI.begin();
  rfid.PCD_Init();

  pinMode(DHT_PIN, INPUT);
  pinMode(IR_PIN, INPUT);
  pinMode(US_TRIG_PIN, OUTPUT);
  pinMode(US_ECHO_PIN, INPUT);

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_RED_PIN, LOW);

  lcd.init();
  lcd.backlight();

  dht.begin();
  delay(1000);

  lcdShow("IoE SmartCart", CART_ID);
  delay(1200);
  lcdShow("Scan QR to Start", "Then scan RFID");
}

void loop() {
  unsigned long now = millis();

  processEspCommands();
  updateTemperature(now);
  checkIRObstacle(now);

  // RFID scan identifies the product.
  // Ultrasonic verification is handled separately so both events can be matched.
  checkRFID();

  // Physical placement without a recent RFID scan = warning.
  checkPhysicalPlacement(now);

  // Clear an old RFID expectation.
  if (pendingUid.length() > 0 &&
      now - pendingUidTime > RFID_VERIFY_WINDOW_MS) {
    pendingUid = "";
  }
}

// ---------------- RFID ----------------

void checkRFID() {
  unsigned long now = millis();
  if (now - lastRfidScan < RFID_SCAN_COOLDOWN_MS) return;
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  String uid = getUid();
  lastRfidScan = now;

  if (isRemovalMode) {
    doRemovalScan(uid);
  } else {
    doAddScan(uid);
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

String getUid() {
  String uid = "";

  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }

  uid.toUpperCase();
  return uid;
}

void doAddScan(String uid) {
  pendingUid = uid;
  pendingUidTime = millis();

  lcdShow("RFID OK", "Place item in cart");
  normalIndicator();

  // Existing ESP/Firebase protocol retained.
  espSerial.println("SCAN:" + CART_ID + ":" + uid + ":ADD");
}

void doRemovalScan(String uid) {
  pendingUid = "";

  lcdShow("Remove RFID OK", uid.substring(0, min(8, (int)uid.length())));
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_RED_PIN, HIGH);
  beep(80);
  delay(80);
  beep(80);
  digitalWrite(LED_RED_PIN, LOW);

  espSerial.println("SCAN:" + CART_ID + ":" + uid + ":REM");
  isRemovalMode = false;
}

// ---------------- Ultrasonic verification ----------------

void checkPhysicalPlacement(unsigned long now) {
  if (isRemovalMode) return;
  if (now - lastPhysicalEvent < ITEM_EVENT_COOLDOWN_MS) return;

  long distance = readUltrasonicCm();
  bool itemDetected = distance > 0 && distance < ITEM_DETECT_DISTANCE_CM;

  if (!itemDetected) return;

  lastPhysicalEvent = now;

  // RFID was scanned recently -> physical item is verified.
  if (pendingUid.length() > 0 &&
      now - pendingUidTime <= RFID_VERIFY_WINDOW_MS) {

    lcdShow("Item Verified", "RFID + Placement");
    digitalWrite(LED_GREEN_PIN, HIGH);
    beep(70);
    delay(70);
    digitalWrite(LED_GREEN_PIN, LOW);

    pendingUid = "";
    return;
  }

  // Physical item appeared without a recent RFID scan.
  warning("SCAN ITEM FIRST");
}

long readUltrasonicCm() {
  digitalWrite(US_TRIG_PIN, LOW);
  delayMicroseconds(2);

  digitalWrite(US_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(US_TRIG_PIN, LOW);

  unsigned long duration = pulseIn(US_ECHO_PIN, HIGH, 25000UL);
  if (duration == 0) return -1;

  return (long)(duration * 0.0343 / 2.0);
}

// ---------------- Temperature ----------------

void updateTemperature(unsigned long now) {
  if (now - lastTempRead < TEMP_INTERVAL_MS) return;
  lastTempRead = now;

  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  if (!isnan(temp)) currentTemp = temp;
  if (!isnan(hum)) currentHumidity = hum;

  if (!isnan(currentTemp)) {
    lcdShow("Cold Section", "Temp: " + String(currentTemp, 1) + " C");
  }

  // Keep the existing ESP gateway telemetry format.
  // LDR/SW-420 are intentionally represented as 0 because they are not used.
  espSerial.print("TELEM:");
  espSerial.print(CART_ID);
  espSerial.print(":");
  espSerial.print(isnan(currentTemp) ? 0.0 : currentTemp, 1);
  espSerial.print(":");
  espSerial.print(isnan(currentHumidity) ? 0.0 : currentHumidity, 1);
  espSerial.print(":");
  espSerial.print((digitalRead(IR_PIN) == LOW) ? "1" : "0");
  espSerial.print(":0:0\n");
}

// ---------------- IR obstacle warning ----------------

void checkIRObstacle(unsigned long now) {
  bool obstacle = (digitalRead(IR_PIN) == LOW);

  if (!obstacle) return;
  if (now - lastIrWarning < IR_WARNING_INTERVAL_MS) return;

  lastIrWarning = now;
  lcdShow("Obstacle Ahead", "Please Stop");

  digitalWrite(LED_RED_PIN, HIGH);
  beep(60);
  digitalWrite(LED_RED_PIN, LOW);
}

// ---------------- ESP commands ----------------

void processEspCommands() {
  while (espSerial.available()) {
    String msg = espSerial.readStringUntil('\n');
    msg.trim();

    if (msg.length() == 0) continue;

    if (msg.startsWith("LCD:")) {
      int sep = msg.indexOf('|');

      if (sep > 4) {
        lcdShow(msg.substring(4, sep), msg.substring(sep + 1));
      } else {
        lcdShow(msg.substring(4), "");
      }
    }

    else if (msg.startsWith("LINKED:")) {
      isLinked = true;

      String user = msg.substring(7);
      if (user.length() > 12) user = user.substring(0, 12);

      lcdShow("Cart Linked", user);
      digitalWrite(LED_GREEN_PIN, HIGH);
      beep(120);
      delay(80);
      beep(80);
      digitalWrite(LED_GREEN_PIN, LOW);
    }

    else if (msg.startsWith("TOTAL:")) {
      int sep = msg.indexOf(':', 6);

      if (sep > 6) {
        String count = msg.substring(6, sep);
        String total = msg.substring(sep + 1);

        lcdShow(count + " item(s)", "Rs." + total);
      }
    }

    else if (msg == "MODE:REMOVAL") {
      isRemovalMode = true;
      pendingUid = "";

      lcdShow("Remove Item", "Scan RFID tag");
      digitalWrite(LED_RED_PIN, HIGH);
    }

    else if (msg == "MODE:NORMAL") {
      isRemovalMode = false;
      pendingUid = "";
      digitalWrite(LED_RED_PIN, LOW);
      lcdShow("Ready", "Scan RFID");
    }
  }
}

// ---------------- Output helpers ----------------

void warning(String message) {
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_RED_PIN, HIGH);

  lcdShow("WARNING!", message);

  for (int i = 0; i < 2; i++) {
    beep(150);
    delay(100);
  }

  digitalWrite(LED_RED_PIN, LOW);
}

void normalIndicator() {
  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, HIGH);
  beep(70);
  digitalWrite(LED_GREEN_PIN, LOW);
}

void beep(int ms) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(ms);
  digitalWrite(BUZZER_PIN, LOW);
}

void lcdShow(String line1, String line2) {
  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print(line1.substring(0, 16));

  lcd.setCursor(0, 1);
  lcd.print(line2.substring(0, 16));
}
