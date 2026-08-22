const user = JSON.parse(sessionStorage.getItem("fflUser") || "null");

if (!user || user.role !== "user") {
  window.location.href = "/";
}

const MODULES = [
  "3-4-1-2",
  "3-4-2-1",
  "3-4-3",
  "3-5-1-1",
  "3-5-2",
  "4-2-3-1",
  "4-2-4",
  "4-3-1-2",
  "4-3-2-1",
  "4-3-3",
  "4-4-1-1",
  "4-4-2",
  "4-5-1",
  "5-3-1-1",
  "5-3-2",
  "5-4-1"
];

const ROLE_GROUPS = {
  P: ["P"],
  D: ["DD", "DC", "DS"],
  C: ["M", "CC", "CD", "CS"],
  T: ["T", "AD", "AS"],
  A: ["SP", "PS", "PD", "PC"]
};

const ALL_ROLES = ["P", "DD", "DC", "DS", "M", "CC", "CD", "CS", "T", "AD", "AS", "SP", "PS", "PD", "PC"];

const teamName = document.getElementById("teamName");
const welcomeText = document.getElementById("welcomeText");
const rosterList = document.getElementById("rosterList");
const rosterCounter = document.getElementById("rosterCounter");
const moduleSelect = document.getElementById("moduleSelect");
const startersList = document.getElementById("startersList");
const reservesList = document.getElementById("reservesList");
const captainSelect = document.getElementById("captainSelect");
const viceCaptainSelect = document.getElementById("viceCaptainSelect");
const pitchPlayers = document.getElementById("pitchPlayers");
const pitchEmpty = document.getElementById("pitchEmpty");
const moduleBadge = document.getElementById("moduleBadge");
const dashboardMessage = document.getElementById("dashboardMessage");
const sendFormationButton = document.getElementById("sendFormationButton");

let rosa = null;
let players = [];
let starterSlots = [];
let reserveSelections = Array(12).fill("");

teamName.textContent = user.squadra || user.username;
welcomeText.textContent = `Benvenuto nella dashboard di ${user.squadra || user.username}.`;

for (const moduleName of MODULES) {
  const option = document.createElement("option");
  option.value = moduleName;
  option.textContent = moduleName;
  moduleSelect.appendChild(option);
}

function parseModule(moduleName) {
  const parts = moduleName.split("-").map(Number);

  if (parts.length === 3) {
    return {
      defenders: parts[0],
      midfielders: parts[1],
      attackingMidfielders: 0,
      attackers: parts[2]
    };
  }

  return {
    defenders: parts[0],
    midfielders: parts[1],
    attackingMidfielders: parts[2],
    attackers: parts[3]
  };
}

function buildStarterSlots(moduleName) {
  const shape = parseModule(moduleName);
  const slots = [{ group: "P", label: "P", player: "", role: "P" }];

  for (let i = 0; i < shape.defenders; i++) {
    slots.push({ group: "D", label: `D${i + 1}`, player: "", role: "" });
  }

  for (let i = 0; i < shape.midfielders; i++) {
    slots.push({ group: "C", label: `C${i + 1}`, player: "", role: "" });
  }

  for (let i = 0; i < shape.attackingMidfielders; i++) {
    slots.push({ group: "T", label: `T${i + 1}`, player: "", role: "" });
  }

  for (let i = 0; i < shape.attackers; i++) {
    slots.push({ group: "A", label: `A${i + 1}`, player: "", role: "" });
  }

  return slots;
}

function renderRoster() {
  rosterList.innerHTML = "";

  const groups = [
    { title: "ALLENATORE", count: 1, items: rosa.allenatore ? [rosa.allenatore] : [], coach: true },
    { title: "PORTIERI", count: 3, items: players.slice(0, 3) },
    { title: "DIFENSORI", count: 10, items: players.slice(3, 13) },
    { title: "CENTROCAMPISTI", count: 10, items: players.slice(13, 23) },
    { title: "ATTACCANTI", count: 6, items: players.slice(23, 29) }
  ];

  for (const group of groups) {
    const section = document.createElement("section");
    section.className = "roster-section";

    const title = document.createElement("div");
    title.className = "roster-section-title";
    title.innerHTML = `<span>${group.title}</span><span>${group.items.length}/${group.count}</span>`;
    section.appendChild(title);

    for (const item of group.items) {
      const row = document.createElement("div");
      row.className = "roster-row";

      const main = document.createElement("div");
      main.className = "roster-main";

      const name = document.createElement("div");
      name.className = "roster-name";
      name.textContent = item.nome || "-";

      const roles = document.createElement("div");
      roles.className = "roster-roles";
      roles.textContent = group.coach ? (item.ruoli || "ALL") : (item.ruoli || "-");

      main.append(name, roles);

      const teamCode = document.createElement("div");
      teamCode.className = "team-code";
      teamCode.textContent = group.coach ? "ALL" : (item.squadraSerieA || "--");

      row.append(main, teamCode);
      section.appendChild(row);
    }

    rosterList.appendChild(section);
  }

  rosterCounter.textContent = String(players.length + (rosa.allenatore ? 1 : 0));
}

function selectedPlayerNames() {
  const selected = new Set();

  for (const slot of starterSlots) {
    if (slot.player) selected.add(slot.player);
  }

  for (const name of reserveSelections) {
    if (name) selected.add(name);
  }

  return selected;
}

function fillPlayerSelect(select, currentValue) {
  const selected = selectedPlayerNames();
  select.innerHTML = '<option value="">Scegli giocatore</option>';

  for (const player of players) {
    if (selected.has(player.nome) && player.nome !== currentValue) {
      continue;
    }

    const option = document.createElement("option");
    option.value = player.nome;
    option.textContent = `${player.nome} · ${player.squadraSerieA || "--"}`;
    select.appendChild(option);
  }

  select.value = currentValue || "";
}

function renderStarters() {
  startersList.innerHTML = "";

  starterSlots.forEach((slot, index) => {
    const row = document.createElement("div");
    row.className = "player-selection-row";

    const label = document.createElement("div");
    label.className = "slot-label";
    label.textContent = slot.label;

    const playerSelect = document.createElement("select");
    playerSelect.className = "dashboard-select player-select";
    playerSelect.dataset.index = String(index);
    fillPlayerSelect(playerSelect, slot.player);

    const roleSelect = document.createElement("select");
    roleSelect.className = "dashboard-select role-select";
    roleSelect.dataset.index = String(index);

    const allowedRoles = ROLE_GROUPS[slot.group] || ALL_ROLES;
    roleSelect.innerHTML = '<option value="">Ruolo</option>';

    for (const role of allowedRoles) {
      const option = document.createElement("option");
      option.value = role;
      option.textContent = role;
      roleSelect.appendChild(option);
    }

    if (slot.group === "P") {
      slot.role = "P";
      roleSelect.value = "P";
      roleSelect.disabled = true;
    } else {
      roleSelect.value = slot.role || "";
    }

    playerSelect.addEventListener("change", () => {
      starterSlots[index].player = playerSelect.value;
      refreshAllSelectors();
      updateCaptains();
      renderPitch();
    });

    roleSelect.addEventListener("change", () => {
      starterSlots[index].role = roleSelect.value;
      renderPitch();
    });

    row.append(label, playerSelect, roleSelect);
    startersList.appendChild(row);
  });
}

function renderReserves() {
  reservesList.innerHTML = "";

  reserveSelections.forEach((selectedName, index) => {
    const row = document.createElement("div");
    row.className = "player-selection-row reserve-row";

    const label = document.createElement("div");
    label.className = "slot-label";
    label.textContent = `R${index + 1}`;

    const playerSelect = document.createElement("select");
    playerSelect.className = "dashboard-select reserve-select";
    playerSelect.dataset.index = String(index);
    fillPlayerSelect(playerSelect, selectedName);

    playerSelect.addEventListener("change", () => {
      reserveSelections[index] = playerSelect.value;
      refreshAllSelectors();
    });

    row.append(label, playerSelect);
    reservesList.appendChild(row);
  });
}

function refreshAllSelectors() {
  document.querySelectorAll(".player-select").forEach((select) => {
    const index = Number(select.dataset.index);
    fillPlayerSelect(select, starterSlots[index]?.player || "");
  });

  document.querySelectorAll(".reserve-select").forEach((select) => {
    const index = Number(select.dataset.index);
    fillPlayerSelect(select, reserveSelections[index] || "");
  });
}

function updateCaptains() {
  const previousCaptain = captainSelect.value;
  const previousVice = viceCaptainSelect.value;
  const starters = starterSlots.map((slot) => slot.player).filter(Boolean);

  captainSelect.innerHTML = '<option value="">Scegli il capitano</option>';
  viceCaptainSelect.innerHTML = '<option value="">Scegli il vice</option>';

  starters.forEach((name) => {
    const captainOption = document.createElement("option");
    captainOption.value = name;
    captainOption.textContent = name;
    captainSelect.appendChild(captainOption);

    const viceOption = document.createElement("option");
    viceOption.value = name;
    viceOption.textContent = name;
    viceCaptainSelect.appendChild(viceOption);
  });

  if (starters.includes(previousCaptain)) captainSelect.value = previousCaptain;
  if (starters.includes(previousVice)) viceCaptainSelect.value = previousVice;

  if (captainSelect.value && captainSelect.value === viceCaptainSelect.value) {
    viceCaptainSelect.value = "";
  }

  updateCaptainOptionAvailability();
}

function updateCaptainOptionAvailability() {
  const captain = captainSelect.value;
  const vice = viceCaptainSelect.value;

  Array.from(captainSelect.options).forEach((option) => {
    option.disabled = Boolean(vice && option.value === vice);
  });

  Array.from(viceCaptainSelect.options).forEach((option) => {
    option.disabled = Boolean(captain && option.value === captain);
  });
}

captainSelect.addEventListener("change", updateCaptainOptionAvailability);
viceCaptainSelect.addEventListener("change", updateCaptainOptionAvailability);

function linePositions(count, y) {
  if (count === 1) return [{ x: 50, y }];
  if (count === 2) return [{ x: 34, y }, { x: 66, y }];
  if (count === 3) return [{ x: 24, y }, { x: 50, y }, { x: 76, y }];
  if (count === 4) return [{ x: 16, y }, { x: 38, y }, { x: 62, y }, { x: 84, y }];
  if (count === 5) return [{ x: 11, y }, { x: 30, y }, { x: 50, y }, { x: 70, y }, { x: 89, y }];

  return Array.from({ length: count }, (_, index) => ({
    x: ((index + 1) * 100) / (count + 1),
    y
  }));
}

function renderPitch() {
  pitchPlayers.innerHTML = "";

  const moduleName = moduleSelect.value;
  moduleBadge.textContent = moduleName || "--";

  if (!moduleName || starterSlots.length !== 11) {
    pitchEmpty.classList.remove("hidden");
    return;
  }

  const grouped = {
    P: starterSlots.filter((slot) => slot.group === "P"),
    D: starterSlots.filter((slot) => slot.group === "D"),
    C: starterSlots.filter((slot) => slot.group === "C"),
    T: starterSlots.filter((slot) => slot.group === "T"),
    A: starterSlots.filter((slot) => slot.group === "A")
  };

  const rows = [
    { group: "P", y: 86 },
    { group: "D", y: 68 },
    { group: "C", y: grouped.T.length ? 48 : 43 },
    { group: "T", y: 30 },
    { group: "A", y: 14 }
  ];

  let hasPlayer = false;

  for (const row of rows) {
    const line = grouped[row.group];
    if (!line.length) continue;

    const positions = linePositions(line.length, row.y);

    line.forEach((slot, index) => {
      if (!slot.player) return;
      hasPlayer = true;

      const wrapper = document.createElement("div");
      wrapper.className = "pitch-player";
      wrapper.style.left = `${positions[index].x}%`;
      wrapper.style.top = `${positions[index].y}%`;

      const dot = document.createElement("div");
      dot.className = "pitch-dot";

      const name = document.createElement("div");
      name.className = "pitch-player-name";
      name.textContent = slot.player;

      const role = document.createElement("div");
      role.className = "pitch-player-role";
      role.textContent = slot.role || slot.group;

      wrapper.append(dot, name, role);
      pitchPlayers.appendChild(wrapper);
    });
  }

  pitchEmpty.classList.toggle("hidden", hasPlayer);
}

moduleSelect.addEventListener("change", () => {
  const moduleName = moduleSelect.value;
  starterSlots = moduleName ? buildStarterSlots(moduleName) : [];
  reserveSelections = Array(12).fill("");
  captainSelect.value = "";
  viceCaptainSelect.value = "";

  renderStarters();
  renderReserves();
  updateCaptains();
  renderPitch();
});

async function loadRoster() {
  try {
    dashboardMessage.textContent = "Caricamento rosa...";

    const response = await fetch(`/api/rosa/${encodeURIComponent(user.squadra)}`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Impossibile caricare la rosa.");
    }

    rosa = data.rosa;
    players = Array.isArray(rosa.giocatori) ? rosa.giocatori.slice(0, 29) : [];

    renderRoster();
    renderStarters();
    renderReserves();
    renderPitch();

    if (players.length !== 29) {
      dashboardMessage.textContent = `Attenzione: il registro contiene ${players.length} giocatori invece dei 29 previsti.`;
    } else {
      dashboardMessage.textContent = "";
    }
  } catch (error) {
    console.error(error);
    dashboardMessage.textContent = error.message || "Errore durante il caricamento della rosa.";
  }
}


function buildFormationText() {
  const moduleName = moduleSelect.value;

  if (!moduleName || starterSlots.length !== 11) {
    throw new Error("Scegli prima il modulo.");
  }

  const incompleteStarter = starterSlots.find((slot) => !slot.player || !slot.role);
  if (incompleteStarter) {
    throw new Error("Completa tutti gli 11 titolari e i relativi ruoli.");
  }

  if (!captainSelect.value || !viceCaptainSelect.value) {
    throw new Error("Scegli capitano e vice capitano.");
  }

  const lines = [
    `⚽ FFL - FORMAZIONE ${user.squadra || user.username}`,
    "",
    `📐 MODULO: ${moduleName}`,
    "",
    "🟢 TITOLARI"
  ];

  starterSlots.forEach((slot, index) => {
    lines.push(`${index + 1}. ${slot.player} (${slot.role})`);
  });

  lines.push("", "🟡 RISERVE");

  reserveSelections.forEach((name, index) => {
    lines.push(`${index + 1}. ${name || "-"}`);
  });

  lines.push(
    "",
    `©️ CAPITANO: ${captainSelect.value}`,
    `🅥 VICE CAPITANO: ${viceCaptainSelect.value}`
  );

  return lines.join("\n");
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Il browser non consente la copia automatica.");
  }
}

sendFormationButton.addEventListener("click", async () => {
  dashboardMessage.textContent = "";

  try {
    const deadlineResponse = await fetch("/api/deadline", { cache: "no-store" });
    const deadlineData = await deadlineResponse.json();

    if (!deadlineResponse.ok || !deadlineData.ok) {
      throw new Error(deadlineData.message || "Impossibile verificare il termine di invio.");
    }

    if (deadlineData.expired) {
      const expiredMessage = "Caricamento non consentito, tempo scaduto!";
      dashboardMessage.classList.remove("success-message");
      dashboardMessage.textContent = expiredMessage;
      alert(expiredMessage);
      return;
    }

    const formationText = buildFormationText();
    await copyTextToClipboard(formationText);
    dashboardMessage.textContent =
      "✓ Formazione copiata negli appunti. Ora puoi incollarla su WhatsApp.";
    dashboardMessage.classList.add("success-message");
  } catch (error) {
    dashboardMessage.classList.remove("success-message");
    dashboardMessage.textContent =
      error.message || "Impossibile copiare la formazione.";
  }
});

document.getElementById("logoutButton").addEventListener("click", () => {
  sessionStorage.removeItem("fflUser");
  window.location.href = "/";
});

loadRoster();
