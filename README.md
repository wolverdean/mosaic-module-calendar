# mosaic-module-calendar

Month-view calendar module for the Mosaic framework. Aggregates events, birthdays, habit logs, and idea due dates from all registered modules into a single unified calendar.

The framework owns the `calendar_events` table and the `/api/calendar/` routes (events, delivery settings, push notifications). This module provides the frontend month-grid UI only — it calls those framework endpoints plus each module's calendar hook to populate the view.

---

## Features

| Feature | Detail |
|---|---|
| Month grid | Navigate forward and backward by month |
| Framework events | One-off and yearly-recurring events from `/api/calendar/events` |
| Module items | Aggregated from all modules: birthdays (Contacts), habit logs (Habits), idea due dates (Ideas Lab) |
| Event creation | Add events directly from any day cell |
| Yearly recurrence | Events can repeat on the same date every year (e.g. birthdays, anniversaries) |
| Reminders | Per-event `notify_tomorrow` flag — framework sends push/webhook/Telegram reminder the day before |

---

## Framework API used

This module has no API endpoints of its own. It relies on the framework:

| Endpoint | Description |
|---|---|
| `GET /api/calendar/events?year=&month=` | List events for a month |
| `POST /api/calendar/events` | Create event (`title`, `date`, `yearly`, `notify_tomorrow`) |
| `PUT /api/calendar/events/:id` | Update event |
| `DELETE /api/calendar/events/:id` | Delete event |
| `GET /api/modules` | Used by shell to call each module's calendar hook |

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `express` | peer | HTTP server (provided by framework) |
| `@opentelemetry/api` | peer | Observability (provided by framework) |

---

## Project structure

```
mosaic-module-calendar/
├── index.ts            # Module manifest — slug, nav, calendar hook (passes through to framework)
├── src/
│   └── routes/
│       └── index.ts    # Single route: GET /ui.js
├── public/
│   └── ui.js           # Frontend IIFE — served via GET /api/calendar/ui.js
└── tests/
    └── unit/           # Vitest unit tests
```
