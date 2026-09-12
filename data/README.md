# Local view data

Per-view JSON stores used by the prototype when no remote backend is configured.

| Folder | API prefix |
| --- | --- |
| `mock-one/` | `/api/mock-one/planner`, `/artifacts`, `/courses` |
| `alex-knight/` | `/api/alex-knight/...` |
| `alex-seager/` | `/api/alex-seager/...` |

Each folder holds `planner.json`, `artifacts.json`, and `courses.json`. Files are created on first read (seeded for Mock One, empty for the blank views). Writes from the app update these files in place.
