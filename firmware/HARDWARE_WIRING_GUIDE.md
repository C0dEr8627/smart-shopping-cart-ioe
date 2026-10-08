# IoE Smart Shopping Cart — Hardware Wiring Guide (Arduino Uno Final)

> All connections use standard DuPont jumper wires — **no soldering required**.
> RC522 RFID **must use 3.3V** — connecting it to 5V will destroy the chip.

---

## 1. Arduino Uno Pin Map

| Pin | Connected To | Notes |
|-----|-------------|-------|
| **D0 (RX)** | *(free)* | Keep free during sketch upload |
| **D1 (TX)** | *(free)* | Keep free during sketch upload |
| **D2** | DHT11 DATA | Add 10kΩ pull-up to 5V |
| **D3** | IR Obstacle Sensor OUT | Goes LOW on obstacle |
| **D4** | LDR Module DO | Goes LOW in dark |
| **D5** | SW-420 Vibration DO | Goes HIGH on motion |
| **D6** | HC-SR04 Echo | Digital input |
| **D7** | HC-SR04 Trig | Digital output |
| **D8** | ESP8266 TX → Arduino RX | Direct wire (3.3V logic safe) |
| **D9** | RC522 RST | RFID reset pin |
| **D10** | RC522 SDA (SS) | SPI chip select |
| **D11** | RC522 MOSI | SPI — fixed pin on Uno |
| **D12** | RC522 MISO | SPI — fixed pin on Uno |
| **D13** | Active Buzzer (+) | 5V buzzer signal |
| **A0** | ESP8266 RX ← Arduino TX | ⚠️ Use voltage divider (see below) |
| **A1** | Green LED anode | Via 220Ω resistor to GND |
| **A2** | Red LED anode | Via 220Ω resistor to GND |
| **A3** | Basket LED Lightbar (+) | Via 220Ω or transistor |
| **A4 (SDA)** | I2C LCD SDA | I2C — fixed on Uno |
| **A5 (SCL)** | I2C LCD SCL | I2C — fixed on Uno |
| **5V** | All sensor VCC | DHT11, HC-SR04, IR, LDR, SW-420 |
| **3.3V** | RC522 VCC | ⚠️ 3.3V only for RFID! |
| **GND** | All module GND | Common ground |

---

## 2. Voltage Divider: Arduino A0 → ESP8266 RX

Arduino Uno outputs 5V logic but ESP8266 RX only accepts 3.3V max.

```
Arduino A0 (5V) ──── 1kΩ ──── [junction] ──── ESP8266 RX
                                   │
                                  2kΩ
                                   │
                                  GND
```

> This creates ~3.33V at the junction, safely within ESP8266's 3.6V max.

---

## 3. ESP8266 Wiring to Arduino Uno

| ESP8266 Pin | Connect To | Notes |
|-------------|-----------|-------|
| **VCC** | 3.3V regulator out | Use AMS1117-3.3 (500mA) — Uno's 3.3V pin is only 150mA |
| **CH_PD (EN)** | 3.3V | Must be HIGH to enable module |
| **GND** | Arduino GND | Shared common ground |
| **TX** | Arduino D8 | Direct wire — 3.3V safe |
| **RX** | Arduino A0 | Via 1kΩ + 2kΩ voltage divider |
| **GPIO0** | *(float or 3.3V)* | Must be HIGH for normal run mode |
| **RST** | *(float)* | Leave unconnected |

---

## 4. Sensor Module Wiring Detail

### RC522 RFID Reader
| RC522 Pin | Arduino Uno | Notes |
|-----------|------------|-------|
| VCC (3.3V) | 3.3V | ⚠️ 3.3V only |
| GND | GND | Common ground |
| RST | D9 | |
| SDA (SS) | D10 | |
| MOSI | D11 | Fixed SPI |
| MISO | D12 | Fixed SPI |
| SCK | D13 | Fixed SPI |

> **Note:** D13 doubles as SCK and the Buzzer pin in this firmware. The SPI bus is only active during RFID card reads (very brief), so the buzzer won't interfere. The Buzzer GND connects to GND directly.

### DHT11 Temperature & Humidity
| DHT11 Pin | Arduino Uno | Notes |
|-----------|------------|-------|
| VCC (+) | 5V | |
| GND (-) | GND | |
| DATA | D2 | 10kΩ pull-up resistor between DATA and VCC |

### HC-SR04 Ultrasonic (Basket Entry Detection)
| HC-SR04 Pin | Arduino Uno |
|-------------|------------|
| VCC | 5V |
| GND | GND |
| Trig | D7 |
| Echo | D6 |

> Mount at the basket rim pointing inward. Item entry detected when distance < 18cm.

### IR Obstacle Sensor (Collision Warning)
| IR Sensor Pin | Arduino Uno |
|---------------|------------|
| VCC | 5V |
| GND | GND |
| OUT | D3 |

> Mount at front of cart. Signal goes LOW when obstacle is within ~15cm. Adjust onboard potentiometer to set sensitivity.

### LDR Light Sensor Module (Auto Basket Lighting)
| LDR Pin | Arduino Uno |
|---------|------------|
| VCC | 5V |
| GND | GND |
| DO | D4 |

> DO goes LOW when ambient light falls below threshold. Adjust onboard potentiometer.

### SW-420 Vibration Sensor (Anti-Theft)
| SW-420 Pin | Arduino Uno |
|------------|------------|
| VCC | 5V |
| GND | GND |
| DO | D5 |

> Mount on cart chassis or wheel axle. DO goes HIGH on motion/vibration.

### I2C LCD (16×2)
| LCD I2C Backpack | Arduino Uno |
|-----------------|------------|
| VCC | 5V |
| GND | GND |
| SDA | A4 |
| SCL | A5 |

> Default I2C address is `0x27`. If the screen is blank, try `0x3F` in the firmware (line: `LiquidCrystal_I2C lcd(0x27, 16, 2)`).

---

## 5. Upload Procedure

> ⚠️ **Critical for Arduino Uno** — the ESP8266 SoftwareSerial uses D8 and A0. If the ESP8266 is connected during upload, it may garble the sketch transfer.

1. **Disconnect** ESP8266 TX wire from D8 and ESP8266 RX wire from A0.
2. Connect Arduino Uno to PC via USB.
3. In Arduino IDE: select **Board = Arduino Uno**, correct COM port.
4. Click **Upload**.
5. After "Done uploading", **reconnect** ESP8266 TX → D8 and A0 → voltage divider → ESP8266 RX.
6. Power-cycle Arduino (press reset or unplug/replug USB).

---

## 6. Required Libraries (Arduino IDE Library Manager)

Install via `Sketch → Include Library → Manage Libraries`:

| Library | Author | Used For |
|---------|--------|----------|
| `MFRC522` | GithubCommunity | RC522 RFID reader |
| `LiquidCrystal_I2C` | Frank de Brabander | I2C LCD display |
| `DHT sensor library` | Adafruit | DHT11 temperature/humidity |
| `Adafruit Unified Sensor` | Adafruit | Required by DHT lib |

For ESP8266 sketch:
| Library | Author | Used For |
|---------|--------|----------|
| `ArduinoJson` | Benoît Blanchon | Parse Firebase JSON (use v6.x) |

---

## 7. Full System Data Flow

```
[RC522 RFID Tag Scan]
        ↓
[Arduino Uno: reads UID → sends "SCAN:CART_004:<UID>:ADD" via SoftwareSerial]
        ↓
[ESP8266: receives → fetches /products/<UID> from Firebase]
        ↓
[ESP8266: writes item to /carts/CART_004/items/<UID> in Firebase]
        ↓
[ESP8266: recalculates totals → PATCHes Firebase → sends "TOTAL:2:149" to Arduino]
        ↓
[Arduino LCD: shows "2 item(s) / Rs.149"]
        ↓
[React Mobile App: Firebase listener fires → UI updates in real time]
        ↓
[User taps "Pay Now" → Firebase status = "paid"]
        ↓
[ESP8266: polls Firebase → sees "paid" → sends "PAID:SUCCESS" to Arduino]
        ↓
[Arduino: plays chime + shows "Payment Success! / Thank You! Bye!"]
```

---

## 8. Firebase Seed Data Structure

Your database should contain these top-level nodes (already in `firebase_seed.json`):

```json
{
  "carts": {
    "CART_004": { "status": "available", "total": 0, ... }
  },
  "products": {
    "F175D3AD": { "name": "Amul Milk 500ml", "price": 28, "is_cold": true },
    "A2B3C4D5": { "name": "Britannia Bread", "price": 45, "is_cold": false }
  }
}
```

> To add new RFID tags: scan them, get the UID printed on LCD, then add the product entry to `/products/<UID>` in Firebase Console.
