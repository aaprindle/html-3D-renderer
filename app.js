/* Beyond — coaching accountability app.
 * All data is kept in localStorage; nothing leaves the browser
 * (a confidentiality requirement of the coaching agreement). */

const STORAGE_KEY = "beyond-coaching-v1";

/* Weekly coaching prompts in the spirit of meta-performance coaching:
 * challenge the story, invite the client beyond what they think is possible. */
const WEEKLY_PROMPTS = [
  "What would it look like to go beyond what you think is possible this week?",
  "What are you tolerating right now that you're ready to stop tolerating?",
  "If this week went 10x better than planned, what would have happened?",
  "What story are you telling yourself that's keeping this goal small?",
  "Who do you need to become for this week's commitments to feel easy?",
  "What's the conversation you're avoiding that would change everything?",
  "Where are you playing it safe, and what would bold look like instead?",
  "What would you commit to if you knew you couldn't fail?",
];

const STATUSES = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "In progress" },
  { id: "done", label: "Done" },
  { id: "stuck", label: "Stuck — need support" },
];

/* ---------------- state ---------------- */

let state = load();

function defaultState() {
  return {
    role: "client",
    names: { client: "", coach: "" },
    goals: [],
    weeks: {}, // weekKey -> { tasks: [], checkin: { client: "", coach: "" } }
    sessions: [],
    agreement: { client: false, coach: false, date: null },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) {
    console.warn("Could not load saved data:", e);
  }
  return defaultState();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------------- weeks ---------------- */

let viewedWeek = mondayOf(new Date());

function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

const weekKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function getWeek(key) {
  if (!state.weeks[key]) state.weeks[key] = { tasks: [], checkin: { client: "", coach: "" } };
  return state.weeks[key];
}

function shiftWeek(days) {
  const d = new Date(viewedWeek);
  d.setDate(d.getDate() + days);
  viewedWeek = d;
  renderWeek();
}

/* ---------------- helpers ---------------- */

const $ = (sel) => document.querySelector(sel);

function esc(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function displayName(role) {
  return state.names[role] || (role === "coach" ? "Coach" : "Client");
}

function fmtRange(monday) {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const opts = { month: "short", day: "numeric" };
  return `${monday.toLocaleDateString(undefined, opts)} – ${sunday.toLocaleDateString(undefined, opts)}, ${sunday.getFullYear()}`;
}

/* ---------------- week view ---------------- */

function renderWeek() {
  const key = weekKey(viewedWeek);
  const week = getWeek(key);
  const isCurrent = key === weekKey(mondayOf(new Date()));

  $("#weekLabel").textContent = (isCurrent ? "This week · " : "Week of ") + fmtRange(viewedWeek);

  const done = week.tasks.filter((t) => t.status === "done").length;
  $("#weekProgress").textContent = week.tasks.length
    ? `${done} of ${week.tasks.length} commitments complete`
    : "No commitments yet";

  // Deterministic prompt per week so it doesn't change on every render
  const promptIdx = Math.abs(key.split("-").join("") % WEEKLY_PROMPTS.length);
  $("#weeklyPrompt").textContent = "“" + WEEKLY_PROMPTS[promptIdx] + "”";

  // goal selector
  const sel = $("#taskGoal");
  sel.innerHTML =
    '<option value="">No linked goal</option>' +
    state.goals.map((g) => `<option value="${g.id}">${esc(g.title)}</option>`).join("");

  // tasks
  const list = $("#taskList");
  list.innerHTML = "";
  $("#taskEmpty").hidden = week.tasks.length > 0;

  for (const task of week.tasks) {
    const li = document.createElement("li");
    li.className = "task" + (task.status === "done" ? " done" : "");
    const goal = state.goals.find((g) => g.id === task.goalId);

    li.innerHTML = `
      <div class="task-main">
        <span class="task-title">${esc(task.title)}</span>
        ${goal ? `<span class="task-goal-tag">◆ ${esc(goal.title)}</span>` : ""}
        <select class="status-select status-${task.status}" data-id="${task.id}">
          ${STATUSES.map((s) => `<option value="${s.id}" ${s.id === task.status ? "selected" : ""}>${s.label}</option>`).join("")}
        </select>
        <button class="icon-btn comment-toggle" data-id="${task.id}" title="Comments">💬 ${task.comments.length || ""}</button>
        <button class="icon-btn delete-task" data-id="${task.id}" title="Remove commitment">✕</button>
      </div>
      <div class="comments" data-id="${task.id}" ${task.open ? "" : "hidden"}>
        ${task.comments
          .map(
            (c) => `<div class="comment ${c.role}">
              <span class="who">${esc(displayName(c.role))}</span>${esc(c.text)}
              <span class="when">${new Date(c.ts).toLocaleDateString()}</span>
            </div>`
          )
          .join("")}
        <form class="comment-form" data-id="${task.id}">
          <input type="text" maxlength="500" placeholder="${state.role === "coach" ? "Acknowledge or challenge…" : "Update your coach…"}" required />
          <button class="btn" type="submit">Post</button>
        </form>
      </div>`;
    list.appendChild(li);
  }

  // carry-over button: show when viewing a past or current week with unfinished tasks
  const unfinished = week.tasks.filter((t) => t.status !== "done");
  $("#carryOverBtn").hidden = unfinished.length === 0;

  // check-in
  $("#clientReflection").value = week.checkin.client || "";
  $("#coachFeedback").value = week.checkin.coach || "";
  $("#checkinSaved").textContent = "";
}

function wireWeek() {
  $("#prevWeek").addEventListener("click", () => shiftWeek(-7));
  $("#nextWeek").addEventListener("click", () => shiftWeek(7));

  $("#taskForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("#taskTitle").value.trim();
    if (!title) return;
    getWeek(weekKey(viewedWeek)).tasks.push({
      id: uid(),
      title,
      goalId: $("#taskGoal").value || null,
      status: "todo",
      comments: [],
    });
    $("#taskTitle").value = "";
    save();
    renderWeek();
  });

  $("#taskList").addEventListener("change", (e) => {
    if (!e.target.matches(".status-select")) return;
    const task = findTask(e.target.dataset.id);
    if (task) {
      task.status = e.target.value;
      save();
      renderWeek();
    }
  });

  $("#taskList").addEventListener("click", (e) => {
    const del = e.target.closest(".delete-task");
    const toggle = e.target.closest(".comment-toggle");
    if (del) {
      const week = getWeek(weekKey(viewedWeek));
      const task = findTask(del.dataset.id);
      if (task && confirm(`Remove "${task.title}"?`)) {
        week.tasks = week.tasks.filter((t) => t.id !== del.dataset.id);
        save();
        renderWeek();
      }
    } else if (toggle) {
      const task = findTask(toggle.dataset.id);
      if (task) {
        task.open = !task.open;
        renderWeek();
      }
    }
  });

  $("#taskList").addEventListener("submit", (e) => {
    if (!e.target.matches(".comment-form")) return;
    e.preventDefault();
    const input = e.target.querySelector("input");
    const task = findTask(e.target.dataset.id);
    if (task && input.value.trim()) {
      task.comments.push({ role: state.role, text: input.value.trim(), ts: Date.now() });
      task.open = true;
      save();
      renderWeek();
    }
  });

  $("#carryOverBtn").addEventListener("click", () => {
    const from = getWeek(weekKey(viewedWeek));
    const next = new Date(viewedWeek);
    next.setDate(next.getDate() + 7);
    const to = getWeek(weekKey(next));
    const moving = from.tasks.filter((t) => t.status !== "done");
    for (const t of moving) {
      to.tasks.push({ ...t, id: uid(), status: "todo", comments: [], open: false });
    }
    from.tasks = from.tasks.filter((t) => t.status === "done");
    save();
    viewedWeek = next;
    renderWeek();
  });

  $("#saveCheckin").addEventListener("click", () => {
    const week = getWeek(weekKey(viewedWeek));
    week.checkin.client = $("#clientReflection").value;
    week.checkin.coach = $("#coachFeedback").value;
    save();
    $("#checkinSaved").textContent = "Saved ✓";
  });
}

function findTask(id) {
  return getWeek(weekKey(viewedWeek)).tasks.find((t) => t.id === id);
}

/* ---------------- goals ---------------- */

function renderGoals() {
  const list = $("#goalList");
  list.innerHTML = "";
  $("#goalEmpty").hidden = state.goals.length > 0;

  for (const goal of state.goals) {
    // count linked commitments across all weeks
    let linked = 0,
      linkedDone = 0;
    for (const wk of Object.values(state.weeks)) {
      for (const t of wk.tasks) {
        if (t.goalId === goal.id) {
          linked++;
          if (t.status === "done") linkedDone++;
        }
      }
    }
    const card = document.createElement("div");
    card.className = "card goal-card";
    card.innerHTML = `
      <button class="icon-btn delete-goal" data-id="${goal.id}" title="Remove goal">✕</button>
      <h3>${esc(goal.title)}</h3>
      ${goal.why ? `<p class="goal-field"><strong>Why it matters</strong>${esc(goal.why)}</p>` : ""}
      ${goal.beyond ? `<p class="goal-field"><strong>The beyond version</strong>${esc(goal.beyond)}</p>` : ""}
      <p class="goal-meta">${linked ? `${linkedDone}/${linked} weekly commitments completed toward this goal` : "No weekly commitments linked yet"}</p>`;
    list.appendChild(card);
  }
}

function wireGoals() {
  $("#goalForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.goals.push({
      id: uid(),
      title: $("#goalTitle").value.trim(),
      why: $("#goalWhy").value.trim(),
      beyond: $("#goalBeyond").value.trim(),
    });
    e.target.reset();
    save();
    renderGoals();
    renderWeek();
  });

  $("#goalList").addEventListener("click", (e) => {
    const del = e.target.closest(".delete-goal");
    if (!del) return;
    const goal = state.goals.find((g) => g.id === del.dataset.id);
    if (goal && confirm(`Remove goal "${goal.title}"? Linked commitments are kept.`)) {
      state.goals = state.goals.filter((g) => g.id !== del.dataset.id);
      save();
      renderGoals();
      renderWeek();
    }
  });
}

/* ---------------- sessions ---------------- */

function renderSessions() {
  const list = $("#sessionList");
  list.innerHTML = "";
  $("#sessionEmpty").hidden = state.sessions.length > 0;

  const sorted = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date));
  for (const s of sorted) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${esc(s.agenda)} <span class="session-date">${new Date(s.date + "T00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span></h3>
      ${s.insights ? `<p class="goal-field"><strong>Insights</strong>${esc(s.insights)}</p>` : ""}
      ${s.commitments ? `<p class="goal-field"><strong>Commitments</strong>${esc(s.commitments)}</p>` : ""}
      <button class="icon-btn delete-session" data-id="${s.id}" title="Delete session">✕ delete</button>`;
    list.appendChild(card);
  }
}

function wireSessions() {
  $("#sessionDate").value = new Date().toISOString().slice(0, 10);

  $("#sessionForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.sessions.push({
      id: uid(),
      date: $("#sessionDate").value,
      agenda: $("#sessionAgenda").value.trim(),
      insights: $("#sessionInsights").value.trim(),
      commitments: $("#sessionCommitments").value.trim(),
    });
    e.target.reset();
    $("#sessionDate").value = new Date().toISOString().slice(0, 10);
    save();
    renderSessions();
  });

  $("#sessionList").addEventListener("click", (e) => {
    const del = e.target.closest(".delete-session");
    if (del && confirm("Delete this session log?")) {
      state.sessions = state.sessions.filter((s) => s.id !== del.dataset.id);
      save();
      renderSessions();
    }
  });
}

/* ---------------- ethics & settings ---------------- */

function renderEthics() {
  $("#ackClient").checked = state.agreement.client;
  $("#ackCoach").checked = state.agreement.coach;
  $("#clientName").value = state.names.client;
  $("#coachName").value = state.names.coach;
  updateAckStatus();
}

function updateAckStatus() {
  const a = state.agreement;
  $("#ackStatus").textContent =
    a.client && a.coach
      ? `Agreement in effect since ${new Date(a.date).toLocaleDateString()}. Either party may end the relationship at any time.`
      : "Coaching formally begins once both parties have acknowledged the agreement.";
}

function wireEthics() {
  for (const role of ["client", "coach"]) {
    $(`#ack${role[0].toUpperCase() + role.slice(1)}`).addEventListener("change", (e) => {
      state.agreement[role] = e.target.checked;
      if (state.agreement.client && state.agreement.coach && !state.agreement.date) {
        state.agreement.date = Date.now();
      }
      if (!e.target.checked) state.agreement.date = null;
      save();
      updateAckStatus();
    });
    $(`#${role}Name`).addEventListener("input", (e) => {
      state.names[role] = e.target.value;
      save();
    });
  }

  $("#resetBtn").addEventListener("click", () => {
    if (confirm("Erase ALL coaching data from this browser? This cannot be undone.")) {
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      renderAll();
    }
  });
}

/* ---------------- role, tabs, import/export ---------------- */

function wireChrome() {
  $("#roleToggle").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-role]");
    if (!btn) return;
    state.role = btn.dataset.role;
    save();
    renderRole();
  });

  $("#tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + btn.dataset.tab));
  });

  $("#exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `beyond-coaching-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("#importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.weeks || !data.goals) throw new Error("not a Beyond export");
      if (confirm("Replace all current data with this import?")) {
        state = Object.assign(defaultState(), data);
        save();
        renderAll();
      }
    } catch {
      alert("That file doesn't look like a valid Beyond export.");
    }
    e.target.value = "";
  });
}

function renderRole() {
  document.querySelectorAll("#roleToggle button").forEach((b) =>
    b.classList.toggle("active", b.dataset.role === state.role)
  );
  renderWeek(); // comment placeholders depend on role
}

/* ---------------- boot ---------------- */

function renderAll() {
  renderRole();
  renderWeek();
  renderGoals();
  renderSessions();
  renderEthics();
}

wireChrome();
wireWeek();
wireGoals();
wireSessions();
wireEthics();
renderAll();
