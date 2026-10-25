# Apple Health → Snapfit Shortcut

Snapfit is a web app, so it can't read Apple Health directly. This iPhone Shortcut runs every morning, reads yesterday's numbers from Health, and sends them to Snapfit. It's free and needs no extra apps.

**It's optional.** Everything it sends can also be logged in Snapfit with a photo or typed in. Set up only the parts your devices cover, and add more later.

| If you have | It sends | Set up in its app |
|---|---|---|
| A watch or band (Apple Watch, Xiaomi Smart Band, Amazfit, Garmin) | sleep, resting heart rate, HRV, steps, workouts | Mi Fitness / Zepp / Garmin Connect → Apple Health |
| A smart scale (e.g. Xiaomi S200) | weight, body fat | Xiaomi Home → Apple Health |
| A Bluetooth BP monitor (e.g. Omron with Omron Connect) | blood pressure, pulse | Omron Connect → Apple Health |
| Nike Run Club, Hevy | workouts | see "Before you start" |

> **Status: draft.** These steps follow the Shortcuts app's Health actions, but they haven't been tested end to end on a phone yet. Action names can differ slightly between iOS versions. If a step doesn't match, the goal is the same: build the JSON below and POST it.

## What gets sent

```json
{
  "date": "2026-10-18",
  "sleep_hours": 6.8,
  "resting_hr": 64,
  "hrv_ms": 41,
  "steps": 8400,
  "weight_kg": 96.4,
  "body_fat_pct": 31.2,
  "blood_pressure": [
    { "at": "2026-10-18T07:10:00+08:00", "systolic": 128, "diastolic": 82, "pulse": 71 }
  ],
  "workouts": [
    { "start": "2026-10-17T18:05:00+08:00", "activity": "Running", "app": "Nike Run Club", "duration_min": 31.5, "distance_km": 5.02, "kcal": 380 }
  ]
}
```

Every field except `date` is optional. Sending the same day twice updates that day instead of duplicating it, so it's safe to re-run.

## Before you start

1. **Nike Run Club → Settings → Privacy → Health:** let it write workouts to Health.
2. **Hevy → Settings → Apple Health:** turn on syncing workouts.
3. **Snapfit → Settings → Devices → Create token.** Copy the token and the "Send to" URL somewhere you can paste from.

## Build the Shortcut

Open **Shortcuts → +** (new shortcut) and add these actions in order.

### Sleep

1. **Find Health Samples** → Type: *Sleep Analysis*, filter *Start Date is in the last 1 day*, *Value is Asleep* (iOS may list Core, Deep and REM separately: include all asleep values).
2. **Get Details of Health Sample** → *Duration*.
3. **Calculate Statistics** → *Sum*.
4. **Calculate** → result ÷ 3600 (turns seconds into hours). Rename the output to `SleepHours`.

### Resting heart rate and HRV

5. **Find Health Samples** → Type: *Resting Heart Rate*, *Start Date is in the last 1 day*, Sort by *Start Date*, *Latest first*, Limit *1* → **Get Details** → *Value* → rename `RestingHR`.
6. Same again with Type *Heart Rate Variability* → rename `HRV`.

### Steps

7. **Find Health Samples** → Type *Steps*, *last 1 day* → **Calculate Statistics** → *Sum* → rename `Steps`.

### Weight and body fat (if you have a smart scale)

Use the same pattern: **Find Health Samples** → Type *Weight* (then *Body Fat Percentage*), *last 1 day*, latest first, limit 1 → **Get Details** → *Value*. Rename them `Weight` and `BodyFat`. If Health shows weight in lb, add **Calculate** ÷ 2.20462 to get kg.

### Blood pressure (if you have a BP monitor)

Find Health Samples → Type *Blood Pressure Systolic*, *last 1 day*, latest first, limit 1 → Get Details → *Value* → rename `SYS`. Same for *Blood Pressure Diastolic* → `DIA`. Then make a small **Dictionary** with `systolic` → `SYS` and `diastolic` → `DIA`, and put it in a **List** → rename `BP`.

### Send it

8. **Format Date** → *Current Date* → Custom format `yyyy-MM-dd` → rename `Today`.
9. **Dictionary** with these keys:
   - `date` (Text) → `Today`
   - `sleep_hours` (Number) → `SleepHours`
   - `resting_hr` (Number) → `RestingHR`
   - `hrv_ms` (Number) → `HRV`
   - `steps` (Number) → `Steps`
   - `weight_kg` (Number) → `Weight` (skip if no scale)
   - `body_fat_pct` (Number) → `BodyFat` (skip if no scale)
   - `blood_pressure` (Array) → `BP` (skip if no monitor)
10. **Get Contents of URL**
    - URL: the "Send to" URL from Snapfit settings (ends in `/api/ingest/health`)
    - Method: **POST**
    - Headers: `Authorization` = `Bearer ` followed by your token (with a space after Bearer)
    - Request Body: **JSON** → choose the Dictionary from step 9
11. **Show Result** while testing, so you can see the reply. A good reply looks like `{"saved":1}`. Remove this step once it works.

Name it **Send to Snapfit** and run it once by hand. Check Snapfit's log for a Sleep entry marked "Apple Health".

### Workouts (optional, after the rest works)

Nike and Hevy workouts can be added to the same Shortcut: **Find Health Samples** → Type *Workouts* (if your iOS version lists it) → *last 1 day*, then **Repeat with Each** to build one dictionary per workout (`start`, `activity`, `app`, `duration_min`, `distance_km`, `kcal`) and add them to a list under the `workouts` key. If your iOS version doesn't offer workouts here, keep using the Workout screenshot button in Snapfit.

## Run it every morning

**Shortcuts → Automation → + → Time of Day** → 8:00 AM, Daily → **Run Immediately** (so it doesn't ask each time) → choose **Send to Snapfit**.

## If something goes wrong

| Reply | Meaning |
|---|---|
| `{"error":"Missing token."}` | The Authorization header is missing. |
| `{"error":"Unknown token..."}` | Token is wrong or was replaced. Create a new one in Snapfit settings. |
| `{"error":"Payload doesn't match..."}` | A field has the wrong type. The reply lists which one. A common cause is a date that isn't `yyyy-MM-dd`. |
| `{"saved":0}` | It worked, but there was nothing to save (for example no sleep recorded). |
