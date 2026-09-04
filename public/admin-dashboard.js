const user = JSON.parse(sessionStorage.getItem("fflUser") || "null");

if (!user || user.role !== "admin") {
  window.location.href = "/";
}

const logoutButton = document.getElementById("logoutButton");
const registroButton = document.getElementById("registroButton");
const registroFile = document.getElementById("registroFile");
const registroStatus = document.getElementById("registroStatus");

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
