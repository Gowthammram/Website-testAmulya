# Manual test steps

Start both servers first (see README). Use Chrome or Edge at http://localhost:5173.
No step below contacts a real person: `DEMO_MODE=true`.

| # | Test | Steps | Expected |
|---|---|---|---|
| 1 | Services running | Open http://127.0.0.1:8000/api/health | `status: ok`, `demo_mode: true` |
| 2 | Onboarding | Fresh browser, open the app | Welcome, then the how-it-works step. Continue stays disabled until you tick the box |
| 3 | Camera denied | Video step, click "Allow camera", choose **Block** | Calm message, **Skip for now** still works |
| 4 | Camera works | Allow, record 5 s, stop, Save | Review player, then "saved on this device". Reload: video is still there |
| 5 | Re-record and delete | Saved video, Re-record then Save. Then Delete | Delete asks to confirm and the video is gone |
| 6 | Trusted contact | Add name and phone `+919876543210` | Save is disabled until the consent box is ticked. Bad phone shows an error. Edit and Remove work |
| 7 | Chat without AI key | Leave `LLM_API_KEY` empty. Send "I feel anxious" | Fallback reply with a breathing exercise |
| 8 | AI failure | Set a wrong key, restart backend, send a message | Fallback reply, no crash |
| 9 | Concerning message | Send "I feel hopeless" | Reply plus a banner "See help options" |
| 10 | Urgent message | Send "I want to kill myself" | Fixed supportive reply naming 112 and Tele-MANAS, plus the banner |
| 11 | Backend down | Stop the backend, send a chat message | Local kind reply and help banner. Emergency page still shows 112 and 14416 |
| 12 | Emergency actions | Open Help. Click the Call buttons | Your dialer opens, or nothing on a desktop. The page says Amulya does not place calls |
| 13 | Alert preview and confirm | Help, "Prepare a message", Show preview, then confirm | Preview shows recipient, message, shared and not-shared lists. Result says **no message was sent** (demo). Settings lists a test event |
| 14 | Location denied | Tick "Include my location", **Block** | Message that location was blocked, preview still shows without location |
| 15 | Location demo | Help, "Check my location", Allow, Start demo sharing | Log lines every 10 s marked "nothing was sent". Stop sharing stops them. Leaving the page also stops them |
| 16 | Delete data | Settings, Delete everything | Contact, plan, events, video and name are gone |

Record real results in your own notes. Do not assume a test passes until you have seen it.
