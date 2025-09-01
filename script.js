
// ======= Configuración inicial =======
const numPlayers = 5;

// Plan fijo de rondas (incluye Subastados) con etiqueta corta ---------
let roundIndex = 0; // índice actual (0..plan.length-1)

function buildRoundPlan() {
  const plan = [];
  // Rondas 1..8 (sube 1..8)
  for (let i = 1; i <= 8; i++) plan.push({ title: `Ronda: ${i}`, short: `${i}`, cards: i });
  // Rondas 9..12 (8 cartas)
  for (let i = 9; i <= 12; i++) plan.push({ title: `Ronda: ${i}`, short: `${i}`, cards: 8 });
  // Rondas 13..19 (baja 7..1)
  let c = 7;
  for (let i = 13; i <= 19; i++, c--) plan.push({ title: `Ronda: ${i}`, short: `${i}`, cards: c });
  // Subastados 1..5 (8 cartas)
  for (let s = 1; s <= 5; s++) plan.push({ title: `Subastado: ${s}`, short: `S${s}`, cards: 8 });
  return plan;
}

const roundPlan = buildRoundPlan();
let cardsPerPlayer = roundPlan[roundIndex].cards;

// Estado de jugadores ----------------------------------------
const players = Array.from({ length: numPlayers }, (_, i) => ({
  name: `Jugador ${i + 1}`,
  bid: 0,
  won: 0,
  total: 0,
}));

// ======= UI helpers generales =======
function updateCurrentRoundHeader() {
  const header = document.getElementById("current-round-header");
  if (!header) return;

  if (roundIndex < roundPlan.length) {
    header.textContent = `${roundPlan[roundIndex].title}, Cartas: ${cardsPerPlayer}`;
  } else {
    header.textContent = `Partida finalizada`;
  }
  updateBidsIndicator();
}

function updateDisplay() {
  players.forEach((player, index) => {
    const card = document.querySelector(`.player-card[data-player='${index}']`);
    if (!card) return;
    const nameEl = card.querySelector(".player-name");
    const bidEl  = card.querySelector(".bid-value");
    const wonEl  = card.querySelector(".won-value");
    if (nameEl) nameEl.value = player.name;
    if (bidEl)  bidEl.textContent = player.bid;
    if (wonEl)  wonEl.textContent = player.won;
  });
  updateBidsIndicator();
}

function changeValue(index, field, delta) {
  const newValue = (players[index]?.[field] ?? 0) + delta;
  const maxValue = cardsPerPlayer; // límites 0..cartas
  players[index][field] = Math.max(0, Math.min(maxValue, newValue));
  updateDisplay();
}

function getIndex(element) {
  return parseInt(element.closest(".player-card").dataset.player, 10);
}

// ======= Indicador de suma de apuestas =======
function updateBidsIndicator() {
  const el = document.getElementById("bids-indicator");
  if (!el) return;
  const totalBids = players.reduce((sum, p) => sum + (p.bid || 0), 0);
  el.textContent = `Apuestas: ${totalBids} / ${cardsPerPlayer}`;
  el.classList.toggle("alert", totalBids === cardsPerPlayer);
}

// ======= Scoreboard: Tabla única horizontal =======
let scoreTable, scoreTbody, totalsRow;

function ensureScoreTable() {
  if (scoreTable) return;

  const host = document.getElementById("scoreboard");
  if (!host) return;
  host.innerHTML = ""; // clean

  scoreTable = document.createElement("table");
  scoreTable.className = "score-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const thLabel = document.createElement("th");
  thLabel.textContent = "Jugador";
  thLabel.colSpan = 2; // Ronda + Tipo
  headRow.appendChild(thLabel);

  players.forEach((p, i) => {
    const th = document.createElement("th");
    th.dataset.col = i;
    th.textContent = p.name || `Jugador ${i + 1}`;
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  scoreTbody = document.createElement("tbody");

  totalsRow = document.createElement("tr");
  totalsRow.className = "total-row";
  const spacer = document.createElement("th");
  spacer.colSpan = 1;
  spacer.textContent = "";
  const totalLabel = document.createElement("th");
  totalLabel.textContent = "Total";
  totalsRow.appendChild(spacer);
  totalsRow.appendChild(totalLabel);
  for (let i = 0; i < players.length; i++) {
    const td = document.createElement("td");
    td.dataset.col = i;
    td.textContent = "0";
    totalsRow.appendChild(td);
  }
  scoreTbody.appendChild(totalsRow);

  scoreTable.appendChild(thead);
  scoreTable.appendChild(scoreTbody);
  host.appendChild(scoreTable);
}

function renderHeader() {
  if (!scoreTable) return;
  const ths = scoreTable.querySelectorAll("thead th[data-col]");
  ths.forEach((th) => {
    const idx = parseInt(th.dataset.col, 10);
    th.textContent = players[idx].name || `Jugador ${idx + 1}`;
  });
}

function updateTotalsRow() {
  if (!totalsRow) return;
  for (let i = 0; i < players.length; i++) {
    totalsRow.querySelector(`td[data-col='${i}']`).textContent = players[i].total;
  }
}

function appendRoundRows(roundLabel, cards, betsArr, winsArr, ptsArr) {
  const types = ["Bets", "Wins", "Pts"];
  const data = [betsArr, winsArr, ptsArr];

  for (let r = 0; r < 3; r++) {
    const tr = document.createElement("tr");

    if (r === 0) {
      const tdRound = document.createElement("td");
      tdRound.className = "round-label";
      tdRound.rowSpan = 3;
      tdRound.textContent = roundLabel; // <<--- SOLO "1", "2", "S1", ...
      tr.appendChild(tdRound);
    }

    const tdType = document.createElement("td");
    tdType.className = "row-type";
    tdType.textContent = types[r];
    tr.appendChild(tdType);

    for (let i = 0; i < players.length; i++) {
      const td = document.createElement("td");
      td.textContent = data[r][i];
      tr.appendChild(td);
    }

    scoreTbody.appendChild(tr);
  }
}

// ======= Flujo de juego =======
function saveRound() {
  ensureScoreTable();

  // Datos de la ronda actual
  const roundLabel = roundPlan[roundIndex].short || roundPlan[roundIndex].title;
  const cards = cardsPerPlayer;

  // Datos por jugador en esta ronda
  const betsArr = players.map((p) => p.bid);
  const winsArr = players.map((p) => p.won);
  const ptsArr = players.map((p) =>
    p.bid === p.won ? 10 + p.won * 5 : -5 * Math.abs(p.bid - p.won)
  );

  // Actualizar totales y reset para la siguiente ronda
  players.forEach((p, i) => {
    p.total += ptsArr[i];
    p.bid = 0;
    p.won = 0;
  });

  // Añadir 3 filas de la ronda a la tabla
  appendRoundRows(roundLabel, cards, betsArr, winsArr, ptsArr);
  updateTotalsRow();

  // Avanzar en el plan de rondas
  roundIndex++;
  if (roundIndex >= roundPlan.length) {
    endGame();
    return;
  }

  cardsPerPlayer = roundPlan[roundIndex].cards;
  updateDisplay();
  updateCurrentRoundHeader();
}

function endGame() {
  updateCurrentRoundHeader();
  const btn = document.getElementById("next-round");
  if (btn) {
    btn.textContent = "Partida finalizada";
    btn.disabled = true;
  }
  document
    .querySelectorAll(".player-name, .bid-plus, .bid-minus, .won-plus, .won-minus")
    .forEach((el) => (el.disabled = true));
  updateBidsIndicator();
}

// ======= Inicialización de tarjetas de jugador =======
function ensurePlayerCards() {
  const container = document.querySelector(".player-inputs");
  if (!container) return;
  for (let i = 0; i < numPlayers; i++) {
    if (!document.querySelector(`.player-card[data-player='${i}']`)) {
      const div = document.createElement("div");
      div.className = "player-card";
      div.dataset.player = i;
      div.innerHTML = `
        <h3><input type="text" class="player-name" value="Jugador ${i + 1}"></h3>
        <div class="control-group">
          <label>Apuesta:</label>
          <div class="controls">
            <button class="bid-minus">-</button>
            <span class="value bid-value">0</span>
            <button class="bid-plus">+</button>
          </div>
        </div>
        <div class="control-group">
          <label>Ganadas:</label>
          <div class="controls">
            <button class="won-minus">-</button>
            <span class="value won-value">0</span>
            <button class="won-plus">+</button>
          </div>
        </div>
      `;
      container.appendChild(div);
    }
  }
}

// Rellena players[].name desde los inputs si existen (sin prompt intrusivo)
function askPlayerNames() {
  for (let i = 0; i < numPlayers; i++) {
    const input = document.querySelector(`.player-card[data-player='${i}'] .player-name`);
    const val = input && input.value && input.value.trim();
    players[i].name = val || `Jugador ${i + 1}`;
  }
  updateDisplay();
}

// ======= Setup =======
function setup() {
  ensurePlayerCards();
  askPlayerNames();
  ensureScoreTable();
  renderHeader();
  updateTotalsRow();
  updateCurrentRoundHeader();
  updateDisplay();

  // Listeners de + / -
  document.querySelectorAll(".bid-plus").forEach((btn) =>
    btn.addEventListener("click", () => changeValue(getIndex(btn), "bid", 1))
  );
  document.querySelectorAll(".bid-minus").forEach((btn) =>
    btn.addEventListener("click", () => changeValue(getIndex(btn), "bid", -1))
  );
  document.querySelectorAll(".won-plus").forEach((btn) =>
    btn.addEventListener("click", () => changeValue(getIndex(btn), "won", 1))
  );
  document.querySelectorAll(".won-minus").forEach((btn) =>
    btn.addEventListener("click", () => changeValue(getIndex(btn), "won", -1))
  );

  const nextBtn = document.getElementById("next-round");
  if (nextBtn) nextBtn.addEventListener("click", saveRound);

  // Cambios de nombre en vivo → actualizar cabecera
  document.querySelectorAll(".player-name").forEach((input, index) => {
    input.addEventListener("input", () => {
      players[index].name = input.value || `Jugador ${index + 1}`;
      renderHeader();
    });
  });
}

window.addEventListener("DOMContentLoaded", setup);
