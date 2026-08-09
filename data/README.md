# Local view stores

One folder per admin view (`/admin`). API routes mirror the folders:

| Folder | Endpoints |
|--------|-----------|
| `mock-one/` | `/api/mock-one/planner`, `/projects`, `/classes` |
| `alex-knight/` | `/api/alex-knight/...` |
| `alex-seager/` | `/api/alex-seager/...` |

Each folder holds `planner.json`, `projects.json`, and `classes.json`. Files are created on first read (seeded for Mock One, empty for the blank views). Writes from the app update these files in place.
