const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginMessage = document.getElementById("loginMessage");

if (togglePassword) {
  togglePassword.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    togglePassword.textContent = isHidden ? "NASCONDI" : "MOSTRA";
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    loginMessage.textContent = "Inserisci squadra e password.";
    return;
  }

  loginMessage.textContent = "Accesso in corso...";

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      loginMessage.textContent = data.message || "Accesso non riuscito.";
      return;
    }

    sessionStorage.setItem("fflUser", JSON.stringify({
      username: data.username,
      squadra: data.squadra,
      role: data.role
    }));

    window.location.href =
      data.role === "admin" ? "/admin-dashboard.html" : "/dashboard.html";

  } catch (error) {
    console.error(error);
    loginMessage.textContent = "Impossibile contattare il server.";
  }
});
