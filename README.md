# Beyond — Coaching Accountability App

A deliberately simple life-coaching app for one coach and one client. It gives you the
useful core of a tool like Asana — weekly tasks, statuses, comments — without any of the
overhead, and it's built around two foundations:

- **Meta-performance coaching practices** (in the spirit of Novus Global): the client sets
  bold weekly commitments, names the "beyond" version of every goal, and each week opens
  with a coaching prompt that challenges the client to go beyond what they think is possible.
- **The [ICF Code of Ethics](https://coachingfederation.org/ethics/code-of-ethics)**: a
  built-in coaching agreement covering confidentiality, client autonomy, clear boundaries,
  conflict-of-interest disclosure, and either party's right to end the relationship — which
  both coach and client acknowledge before coaching begins.

## Features

- **This Week** — the client's weekly commitments with simple statuses (to do, in progress,
  done, stuck — need support). Coach and client can comment on any commitment for
  accountability. Unfinished commitments can be carried into the next week, and every week
  ends with a two-way check-in (client reflection + coach response).
- **Goals** — long-term goals with "why it matters" and a "beyond version" (what 10x would
  look like). Weekly commitments link to goals, and each goal shows progress from completed
  commitments.
- **Sessions** — a log of coaching sessions: the client's agenda, insights, and commitments made.
- **Agreement & Ethics** — the ICF-based coaching agreement with acknowledgment for both parties.
- **Coach / Client toggle** — switch perspective; comments are attributed to whoever is active.
- **Private by design** — all data lives in the browser's localStorage and never touches a
  server, in line with the confidentiality commitment. Export/import as JSON for backups
  or to share state between coach and client.

## Running it

It's a static site — no build step, no dependencies:

```sh
open index.html          # or just double-click it
# or serve it:
python3 -m http.server   # then visit http://localhost:8000
```
