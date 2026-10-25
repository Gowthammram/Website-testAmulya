# API summary and Flutter preparation (planned, not started)

Start Flutter only after the web prototype passes your manual tests.

## Endpoints (all under `/api`)

| Method and path | Purpose |
|---|---|
| GET `/health` | Server, demo mode, AI configured |
| POST `/chat` | `{message, history[]}` returns reply, `risk_level`, `emergency_suggested` |
| GET, PUT, DELETE `/contact` | Trusted contact (PUT needs `consent: true`) |
| GET, PUT `/safety-plan` | Safety plan lists |
| GET `/emergency/resources` | Crisis numbers (verify before release) |
| POST `/emergency/alert-preview` | Message and what would be shared |
| POST `/emergency/alert-send` | Needs `confirm: true`. Demo returns `simulated` |
| POST `/location/preview`, `/location/demo-update` | Preview and test events |
| GET `/events`, DELETE `/data` | Test events, delete everything |

## Reuse vs rebuild

- **Reuse as is:** the whole backend (safety, chat, notify, location, database).
- **Rebuild in Flutter:** all screens, video recording (the `camera` plugin), local video storage (app files directory), location (`geolocator`), calling (`url_launcher` with `tel:`).
- **Needs changes before real use:** accounts and authentication on the API, encryption at rest, a real SMS or push provider.

## Mobile location notes

- Android: `ACCESS_FINE_LOCATION`, then `ACCESS_BACKGROUND_LOCATION` requested separately, and a foreground service with a visible notification for ongoing updates. Newer Android versions limit background work and battery optimisation can stop it.
- iOS: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, and the location background mode. iOS shows its own prompts and can pause updates.
- Background sharing drains battery, so it must start only after explicit opt-in, always be stoppable with one tap, and pass safety, legal and privacy review first.
