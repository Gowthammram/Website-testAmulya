# Privacy notes (prototype)

This is a **prototype for testing**, not a production privacy policy. It must be reviewed by qualified legal and privacy professionals before real users (including under India's DPDP Act).

| Data | Where it lives | Shared? |
|---|---|---|
| Personal video | This browser (IndexedDB) only | Never uploaded or sent |
| Trusted contact (name, phone, relationship, consent time) | SQLite file `backend/amulya.db` on the machine running the server. **Not encrypted** | Only the message you confirm. Phone is masked in logs |
| Safety plan | Same SQLite file | Never |
| Chat messages | Not saved by Amulya. Sent through the server to the AI service to get a reply | Governed by the AI provider's policy |
| Location | Read only when you press a button. Demo events store coordinates rounded to about 1 km | Not sent to anyone in this prototype |
| Display name | This browser (localStorage) | Included in the contact message only if you set it |

Controls: consent checkbox before saving a contact, preview and confirm before any alert, Stop sharing button, Delete everything in Settings, `DEMO_MODE=true` default so no real message can be sent.

Known gaps to fix before real use: encryption at rest, user accounts and authentication, rate limiting, audit review, retention rules, and a reviewed privacy policy.
