# NovaShift AI

NovaShift AI is a production-style proof of concept for AI-assisted employee scheduling at small retail and service businesses. It ships with a complete demo workspace for **Nova Retail Berlin**, ten employees with varied constraints, a deterministic scheduling engine, jurisdiction-aware warnings, manual roster tools, and a schedule-aware assistant.

The app is intentionally local-first: all changes persist in browser `localStorage`, so the full product story works without provisioning a backend or API key.

## Features

- Executive dashboard with live staffing, hours, gaps, rule notifications, leave, and fairness metrics
- Employee directory with add, edit, details, status, filtering, validation, and confirmed deletion
- Weekly recurring availability, preferred days, vacation, sick leave, meetings, and unavailable periods
- Business profile, opening hours, per-day minimum staffing, role coverage, and shift guardrails
- Deterministic automatic schedule generation with an animated analysis sequence
- Availability, leave, role coverage, contracted-hour, overlap, and daily-hour-aware assignment scoring
- Germany, United States, and United Kingdom demo compliance modules
- Interactive seven-day roster with filters, warning and gap states, manual shift CRUD, and drag-to-move
- Schedule analysis with coverage, labor, unresolved gaps, fairness, and employee contract deltas
- Local schedule assistant that answers data-backed questions and can reduce hours or add targeted coverage
- Responsive UI, loading feedback, polished empty/error states, notifications, and persistence across refreshes

## Architecture

```text
src/
├── components/          Shared UI primitives
├── data/                Realistic seed data and date helpers
├── domain/
│   ├── scheduler/       Deterministic schedule generator
│   ├── rules/           Modular country-specific warning engines
│   ├── analysis.ts      Coverage, fairness, hours, and status metrics
│   ├── assistant.ts     Schedule-aware local assistant intents/actions
│   └── time.ts          Time arithmetic and overlap helpers
├── hooks/               Persistent local-storage state
├── App.tsx              Application shell and product screens
└── styles.css           Responsive visual system
```

Business logic is kept outside React components. Country rules conform to a shared checker interface, making an additional jurisdiction a small, isolated module plus one registry entry.

## Scheduling approach

For each open day, the engine divides the operating window into practical coverage segments and fills each deterministically:

1. Excludes inactive employees, unavailable windows, vacations, sick leave, meetings, and overlapping shifts.
2. Fills required roles first. Supervisors can provide manager coverage in the demo.
3. Fills the remaining minimum staffing target.
4. Ranks candidates by remaining contracted hours, preferred day, and required-role fit.
5. Avoids daily-hour limits and caps ordinary allocation near weekly contract targets.
6. Records unresolved staffing or role gaps rather than silently violating hard availability constraints.
7. Runs the resulting shifts through the selected jurisdiction module and attaches warnings.

The assistant reads the same live employees, settings, and schedule. Supported intents include explaining missed assignments, finding cover, listing under-hours employees, reporting conflicts, reducing a named employee’s hours, and adding more coverage to a named day.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
cd /home/hassan/Projects/POC
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

Create a production build with:

```bash
npm run build
npm run preview
```

## Suggested demo flow

1. Start on **Overview** and point out coverage, the staffing chart, schedule health, and upcoming leave.
2. Open **Employees** to inspect Sarah Klein’s Tuesday constraint or edit a contract.
3. Open **Availability** to show Emma’s vacation, Sofia’s sick leave, and Hannah’s meeting.
4. Open **Business settings** to review Berlin operating hours and Germany guardrails.
5. Open **Schedule** and click **Regenerate** to show the four-step generation sequence.
6. Inspect the roster’s intentional coverage gaps and warning states; drag a shift to another day or edit it.
7. Open **Analysis** to compare scheduled and contracted hours.
8. Ask the assistant “Why is Sarah not working Tuesday?”, “Who can cover Friday evening?”, or “Reduce John's hours.”
9. Refresh the page to demonstrate persisted changes.

To restore the original demo after extensive edits, clear this site’s local storage in browser developer tools and refresh.

## POC limitations

- Data is scoped to one browser and one workspace; there is no authentication or server sync.
- The scheduler is a transparent heuristic, not a mathematical optimizer.
- Dragging moves a shift to a different day while preserving its time; the edit dialog handles precise changes.
- Availability is modeled as one recurring time window per day plus dated exceptions.
- Compliance output is illustrative and intentionally not legal advice.

> **Demo compliance rules only. Final schedules should be reviewed against applicable employment law and company policy.**

## Production next steps

- Add an authenticated API, PostgreSQL, organizations, permissions, and audit history.
- Replace local date handling with timezone-aware date primitives and locale-specific week rules.
- Introduce solver-backed optimization with configurable hard and soft constraints.
- Add demand forecasting, shift templates, qualifications, labor-cost budgets, and schedule versioning.
- Add employee self-service, approval workflows, notifications, exports, and calendar integrations.
- Validate jurisdiction modules with qualified counsel and keep rule content versioned and auditable.
- Add unit tests for rules and scoring, property tests for schedule invariants, and end-to-end browser coverage.
