const express = require("express");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* LOGIN:
   username e password sono entrambi CASE INSENSITIVE.
*/
app.post("/api/login", (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        ok: false,
        message: "Inserisci squadra e password."
      });
    }

    const utentiPath = path.join(__dirname, "data", "utenti.json");
    const utenti = JSON.parse(fs.readFileSync(utentiPath, "utf8"));

    const usernameInserito = String(username).trim().toUpperCase();
    const passwordInserita = String(password).trim().toUpperCase();

    const utente = utenti.find((u) =>
      String(u.username).trim().toUpperCase() === usernameInserito &&
      String(u.password).trim().toUpperCase() === passwordInserita
    );

    if (!utente) {
      return res.status(401).json({
        ok: false,
        message: "Squadra o password non corretti."
      });
    }

    return res.json({
      ok: true,
      username: utente.username,
      squadra: utente.squadra,
      role: utente.role
    });

  } catch (error) {
    console.error("Errore durante il login:", error);
    return res.status(500).json({
      ok: false,
      message: "Errore interno del server."
    });
  }
});


/* ROSA UTENTE:
   restituisce esclusivamente la rosa richiesta dal file data/rose.json.
*/
app.get("/api/rosa/:squadra", (req, res) => {
  try {
    const squadraRichiesta = String(req.params.squadra || "").trim().toUpperCase();

    if (!squadraRichiesta) {
      return res.status(400).json({
        ok: false,
        message: "Squadra non specificata."
      });
    }

    const rosePath = path.join(__dirname, "data", "rose.json");

    if (!fs.existsSync(rosePath)) {
      return res.status(404).json({
        ok: false,
        message: "Registro rose non disponibile."
      });
    }

    const rose = JSON.parse(fs.readFileSync(rosePath, "utf8"));
    const nomeSquadra = Object.keys(rose).find(
      (nome) => String(nome).trim().toUpperCase() === squadraRichiesta
    );

    if (!nomeSquadra || !rose[nomeSquadra]) {
      return res.status(404).json({
        ok: false,
        message: "Rosa della squadra non trovata."
      });
    }

    return res.json({
      ok: true,
      squadra: nomeSquadra,
      rosa: rose[nomeSquadra]
    });
  } catch (error) {
    console.error("Errore lettura rosa:", error);
    return res.status(500).json({
      ok: false,
      message: "Impossibile leggere la rosa."
    });
  }
});

/*
  CARICAMENTO REGISTRO EXCEL

  Struttura letta dal foglio REGISTRO:
  - nomi squadre: riga 5
  - allenatore: riga 12
  - giocatori: righe 13-41
  - per ogni squadra: 5 colonne
      Nome | Squadra Serie A | Valore | Contratto | Ruoli

  Blocchi:
  B:F, H:L, N:R, T:X, Z:AD,
  AF:AJ, AL:AP, AR:AV, AX:BB, BD:BH
*/
app.post(
  "/api/admin/registro",
  express.raw({
    type: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream"
    ],
    limit: "10mb"
  }),
  (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({
          ok: false,
          message: "File Excel non ricevuto."
        });
      }

      const workbook = XLSX.read(req.body, {
        type: "buffer",
        cellDates: false
      });

      if (!workbook.SheetNames.includes("REGISTRO")) {
        return res.status(400).json({
          ok: false,
          message: "Il file selezionato non contiene il foglio REGISTRO."
        });
      }

      const sheet = workbook.Sheets["REGISTRO"];

      const blocchi = [
        { squadra: "ATLETICO VAR", col: "B" },
        { squadra: "DREAMTEAM", col: "H" },
        { squadra: "FC SOFIA", col: "N" },
        { squadra: "MI MAX TURBO", col: "T" },
        { squadra: "IL SIGNOR G", col: "Z" },
        { squadra: "INPSWICH FC", col: "AF" },
        { squadra: "PARTENAZZURRI", col: "AL" },
        { squadra: "SCOGLIO FFC", col: "AR" },
        { squadra: "SCAGLIONE B", col: "AX" },
        { squadra: "XAMATT FFC", col: "BD" }
      ];

      const getValue = (row, colIndex) => {
        const address = XLSX.utils.encode_cell({
          r: row - 1,
          c: colIndex
        });

        const cell = sheet[address];

        if (!cell || cell.v === undefined || cell.v === null) {
          return "";
        }

        return cell.v;
      };

      const toText = (value) => {
        if (value === null || value === undefined) return "";
        return String(value).trim();
      };

      const toNumberIfPossible = (value) => {
        if (value === "" || value === null || value === undefined) return "";
        const n = Number(value);
        return Number.isFinite(n) ? n : value;
      };

      const rose = {};
      let totaleGiocatori = 0;

      for (const blocco of blocchi) {
        const startCol = XLSX.utils.decode_col(blocco.col);

        const allenatoreNome = toText(getValue(12, startCol));

        const giocatori = [];

        for (let row = 13; row <= 41; row++) {
          const nome = toText(getValue(row, startCol));

          if (!nome) {
            continue;
          }

          const squadraSerieA = toText(getValue(row, startCol + 1));
          const valore = toNumberIfPossible(getValue(row, startCol + 2));
          const contratto = toNumberIfPossible(getValue(row, startCol + 3));
          const ruoli = toText(getValue(row, startCol + 4));

          giocatori.push({
            nome,
            squadraSerieA,
            valore,
            contratto,
            ruoli
          });
        }

        totaleGiocatori += giocatori.length;

        rose[blocco.squadra] = {
          allenatore: allenatoreNome
            ? {
                nome: allenatoreNome,
                contratto: toNumberIfPossible(getValue(12, startCol + 3)),
                ruoli: toText(getValue(12, startCol + 4))
              }
            : null,
          giocatori
        };
      }

      const dataDir = path.join(__dirname, "data");
      fs.mkdirSync(dataDir, { recursive: true });

      const rosePath = path.join(dataDir, "rose.json");
      const tmpPath = path.join(dataDir, "rose.tmp.json");

      fs.writeFileSync(
        tmpPath,
        JSON.stringify(rose, null, 2),
        "utf8"
      );

      fs.renameSync(tmpPath, rosePath);

      return res.json({
        ok: true,
        message: "Registro caricato correttamente.",
        squadre: Object.keys(rose).length,
        giocatori: totaleGiocatori
      });

    } catch (error) {
      console.error("Errore caricamento REGISTRO:", error);

      return res.status(500).json({
        ok: false,
        message: "Impossibile leggere il registro Excel."
      });
    }
  }
);


app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
