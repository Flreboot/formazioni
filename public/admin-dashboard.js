const user = JSON.parse(sessionStorage.getItem("fflUser") || "null");

if (!user || user.role !== "admin") {
  window.location.href = "/";
}

const logoutButton = document.getElementById("logoutButton");
const registroButton = document.getElementById("registroButton");
const registroFile = document.getElementById("registroFile");
const registroStatus = document.getElementById("registroStatus");
const deadlineButton = document.getElementById("deadlineButton");
const deadlineInput = document.getElementById("deadlineInput");
const deadlineStatus = document.getElementById("deadlineStatus");

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem("fflUser");
  window.location.href = "/";
});

registroButton.addEventListener("click", () => {
  registroFile.value = "";
  registroFile.click();
});

registroFile.addEventListener("change", async () => {
  const file = registroFile.files[0];

  if (!file) {
    return;
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    registroStatus.textContent = "Seleziona un file Excel .xlsx.";
    return;
  }

  registroButton.disabled = true;
  registroButton.textContent = "CARICAMENTO...";
  registroStatus.textContent = "Lettura del foglio REGISTRO in corso...";

  try {
    const buffer = await file.arrayBuffer();

    const response = await fetch("/api/admin/registro", {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "X-Filename": encodeURIComponent(file.name)
      },
      body: buffer
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Errore durante il caricamento del registro.");
    }

    registroStatus.textContent =
      `Registro caricato: ${data.squadre} squadre, ${data.giocatori} giocatori.`;

  } catch (error) {
    console.error(error);
    registroStatus.textContent = error.message || "Errore durante il caricamento del registro.";
  } finally {
    registroButton.disabled = false;
    registroButton.textContent = "CARICA REGISTRO";
  }
});

function formatDeadline(isoString) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(isoString));
}

function toLocalInputValue(isoString) {
  const date = new Date(isoString);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function loadDeadline() {
  try {
    const response = await fetch("/api/deadline");
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Impossibile leggere la scadenza.");
    }

    if (!data.deadline) {
      deadlineStatus.textContent = "Nessuna scadenza impostata.";
      return;
    }

    deadlineInput.value = toLocalInputValue(data.deadline);
    deadlineStatus.textContent = data.expired
      ? `Scadenza trascorsa: ${formatDeadline(data.deadline)}`
      : `Scadenza attiva: ${formatDeadline(data.deadline)}`;
  } catch (error) {
    console.error(error);
    deadlineStatus.textContent = error.message || "Errore durante la lettura della scadenza.";
  }
}

deadlineButton.addEventListener("click", async () => {
  if (!deadlineInput.value) {
    deadlineStatus.textContent = "Seleziona prima data e orario.";
    return;
  }

  const selectedDate = new Date(deadlineInput.value);

  if (Number.isNaN(selectedDate.getTime())) {
    deadlineStatus.textContent = "Data o orario non validi.";
    return;
  }

  deadlineButton.disabled = true;
  deadlineButton.textContent = "SALVATAGGIO...";
  deadlineStatus.textContent = "Salvataggio scadenza in corso...";

  try {
    const response = await fetch("/api/admin/deadline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deadline: selectedDate.toISOString() })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Impossibile salvare la scadenza.");
    }

    deadlineStatus.textContent = `Scadenza impostata: ${formatDeadline(data.deadline)}`;
  } catch (error) {
    console.error(error);
    deadlineStatus.textContent = error.message || "Errore durante il salvataggio della scadenza.";
  } finally {
    deadlineButton.disabled = false;
    deadlineButton.textContent = "SALVA SCADENZA";
  }
});

loadDeadline();
