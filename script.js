
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

// Historial de rondas ya guardadas (para reconstruir la tabla tras recargar)
let roundHistory = []; // [{label, cards, betsArr, winsArr, ptsArr}]

// Partida del historial actualmente visualizada (null = partida en curso)
let activeHistoryGame = null;

// Instancia de Chart.js activa
let chartInstance = null;

// ======= Persistencia en localStorage =======
const STORAGE_KEY = "pocha_game_state";

function persistState() {
  try {
    const state = {
      roundIndex,
      players: players.map((p) => ({ ...p })),
      roundHistory,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // Ignorar errores de almacenamiento (modo privado, cuota, etc.)
  }
}

function restoreState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const state = JSON.parse(raw);
    if (typeof state.roundIndex !== "number") return false;

    roundIndex = state.roundIndex;
    cardsPerPlayer =
      roundIndex < roundPlan.length
        ? roundPlan[roundIndex].cards
        : roundPlan[roundPlan.length - 1].cards;

    state.players.forEach((sp, i) => {
      players[i].name = sp.name;
      players[i].bid = sp.bid;
      players[i].won = sp.won;
      players[i].total = sp.total;
    });

    roundHistory = state.roundHistory || [];
    return true;
  } catch (e) {
    return false;
  }
}

function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}

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
  updateSaveButtonState();
}

function updateDisplay() {
  const totalWins = players.reduce((sum, p) => sum + (p.won || 0), 0);
  const winsAtMax = totalWins >= cardsPerPlayer;

  players.forEach((player, index) => {
    const card = document.querySelector(`.player-card[data-player='${index}']`);
    if (!card) return;
    const nameEl = card.querySelector(".player-name");
    const bidEl  = card.querySelector(".bid-value");
    const wonEl  = card.querySelector(".won-value");
    const wonPlus = card.querySelector(".won-plus");
    if (nameEl) nameEl.value = player.name;
    if (bidEl)  bidEl.textContent = player.bid;
    if (wonEl)  wonEl.textContent = player.won;
    // Deshabilitar (+) de Ganadas si el total global ya llegó al máximo de cartas
    if (wonPlus) wonPlus.disabled = winsAtMax || player.won >= cardsPerPlayer;
  });
  updateBidsIndicator();
  updateSaveButtonState();
}

function changeValue(index, field, delta) {
  const newValue = (players[index]?.[field] ?? 0) + delta;
  const maxValue = cardsPerPlayer; // límites 0..cartas

  // Bloqueo global: la suma de Ganadas no puede superar el total de cartas
  if (field === "won" && delta > 0) {
    const totalWins = players.reduce((sum, p) => sum + (p.won || 0), 0);
    if (totalWins >= cardsPerPlayer) return;
  }

  players[index][field] = Math.max(0, Math.min(maxValue, newValue));
  updateDisplay();
  persistState();
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

// ======= Validación de 'Ganadas' y estado del botón =======
function updateSaveButtonState() {
  const btn = document.getElementById("next-round");
  if (!btn) return;

  // Si la partida terminó, bloquea definitivamente
  if (roundIndex >= roundPlan.length) {
    btn.textContent = "Partida finalizada";
    btn.disabled = true;
    return;
  }

  const totalWins = players.reduce((sum, p) => sum + (p.won || 0), 0);
  const ok = totalWins === cardsPerPlayer;

  btn.disabled = !ok;
  btn.textContent = ok ? "Guardar ronda" : `Ajusta Ganadas (${totalWins}/${cardsPerPlayer})`;
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
      tdRound.textContent = roundLabel; // SOLO "1", "2", "S1", ...
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
  // Doble validación por seguridad (por si el botón no estuviera disabled)
  const totalWins = players.reduce((sum, p) => sum + (p.won || 0), 0);
  if (totalWins !== cardsPerPlayer) {
    updateSaveButtonState();
    return;
  }

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

  // Guardar ronda en el historial (para poder reconstruir tras recargar)
  roundHistory.push({ label: roundLabel, cards, betsArr, winsArr, ptsArr });

  // Añadir 3 filas de la ronda a la tabla
  appendRoundRows(roundLabel, cards, betsArr, winsArr, ptsArr);
  updateTotalsRow();

  // Avanzar en el plan de rondas
  roundIndex++;
  if (roundIndex >= roundPlan.length) {
    persistState();
    endGame();
    return;
  }

  cardsPerPlayer = roundPlan[roundIndex].cards;
  persistState();
  updateDisplay();
  updateCurrentRoundHeader();
  updateSaveButtonState();
}

function endGame() {
  saveGameToHistory();
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

// ======= Historial de partidas =======
const HISTORY_KEY = "pocha_history";

function buildRoundsWithResults() {
  let cumulatives = new Array(numPlayers).fill(0);
  return roundHistory.map((h) => {
    h.ptsArr.forEach((pts, i) => { cumulatives[i] += pts; });
    return {
      label: h.label,
      cards: h.cards,
      results: players.map((p, i) => ({
        playerId: i,
        name: p.name,
        bid: h.betsArr[i],
        won: h.winsArr[i],
        points: h.ptsArr[i],
        total: cumulatives[i],
      })),
    };
  });
}

function saveGameToHistory() {
  if (roundHistory.length === 0) return;
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const gameName = `Partida ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${String(now.getFullYear()).slice(-2)} ${pad(now.getHours())}.${pad(now.getMinutes())}`;
    const gameData = {
      id: Date.now(),
      name: gameName,
      date: now.toLocaleString(),
      players: players.map((p) => ({ name: p.name, total: p.total })),
      rounds: buildRoundsWithResults(),
    };
    history.push(gameData);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {}
}

function openHistoryModal() {
  const modal = document.getElementById("history-modal");
  const historyList = document.getElementById("history-list");
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  historyList.innerHTML = "";
  if (history.length === 0) {
    historyList.innerHTML = "<p style='text-align:center;padding:1rem;'>No hay partidas guardadas.</p>";
  } else {
    history.slice().reverse().forEach((game) => {
      const item = document.createElement("div");
      item.className = "history-item";
      const sortedPlayers = [...game.players].sort((a, b) => b.total - a.total);
      const playersHtml = sortedPlayers
        .map((p, idx) => {
          const text = `${p.name}: ${p.total}`;
          return idx === 0 ? `<strong>${text}</strong>` : text;
        })
        .join(", ");
      item.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.5rem;width:100%">
          <div style="flex:1">
            <div class="game-name">${game.name}</div>
            <div class="game-players">${playersHtml}</div>
          </div>
          <button class="btn-delete-game" data-id="${game.id}" style="background:#c44;border:none;color:white;padding:0.3rem 0.6rem;border-radius:4px;cursor:pointer;font-size:0.8rem;flex-shrink:0;">🗑️</button>
        </div>`;
      item.addEventListener("click", (e) => {
        if (!e.target.classList.contains("btn-delete-game")) {
          viewGameHistory(game);
          modal.style.display = "none";
        }
      });
      item.querySelector(".btn-delete-game").addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(`¿Borrar la partida "${game.name}"?`)) {
          deleteGame(game.id);
          openHistoryModal();
        }
      });
      historyList.appendChild(item);
    });
  }
  modal.style.display = "block";
}

function deleteGame(gameId) {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.filter((g) => g.id !== gameId)));
  } catch (e) {}
}

function viewGameHistory(game) {
  activeHistoryGame = game;
  const host = document.getElementById("scoreboard");
  host.innerHTML = "";

  const banner = document.createElement("p");
  banner.style.cssText = "text-align:center;color:#f6e27a;font-weight:bold;margin:0 0 1rem 0;";
  banner.textContent = `Viendo: ${game.name}`;
  host.appendChild(banner);

  const table = document.createElement("table");
  table.className = "score-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const thLabel = document.createElement("th");
  thLabel.textContent = "Jugador";
  thLabel.colSpan = 2;
  headRow.appendChild(thLabel);
  game.players.forEach((p) => {
    const th = document.createElement("th");
    th.textContent = p.name;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  const totalsRow = document.createElement("tr");
  totalsRow.className = "total-row";
  const spacer = document.createElement("th");
  const totalLabel = document.createElement("th");
  totalLabel.textContent = "Total";
  totalsRow.appendChild(spacer);
  totalsRow.appendChild(totalLabel);
  game.players.forEach((p) => {
    const td = document.createElement("td");
    td.textContent = p.total;
    totalsRow.appendChild(td);
  });
  tbody.appendChild(totalsRow);

  game.rounds.forEach((round) => {
    const ordered = [...round.results].sort((a, b) => a.playerId - b.playerId);
    const types = ["Bets", "Wins", "Pts"];
    const dataArrays = [ordered.map((r) => r.bid), ordered.map((r) => r.won), ordered.map((r) => r.points)];
    for (let r = 0; r < 3; r++) {
      const tr = document.createElement("tr");
      if (r === 0) {
        const tdRound = document.createElement("td");
        tdRound.className = "round-label";
        tdRound.rowSpan = 3;
        tdRound.textContent = round.label;
        tr.appendChild(tdRound);
      }
      const tdType = document.createElement("td");
      tdType.className = "row-type";
      tdType.textContent = types[r];
      tr.appendChild(tdType);
      dataArrays[r].forEach((val) => {
        const td = document.createElement("td");
        td.textContent = val;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  host.appendChild(table);

  document.getElementById("current-round-header").textContent = `Historial: ${game.name}`;
}

// ======= Gráfica =======
function getPlayerColor(index) {
  const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"];
  return colors[index % colors.length];
}

function showChart() {
  let rounds, playerNames;
  if (activeHistoryGame) {
    rounds = activeHistoryGame.rounds;
    playerNames = activeHistoryGame.players.map((p) => p.name);
  } else {
    if (roundHistory.length === 0) {
      alert("No hay rondas jugadas aún para mostrar la gráfica.");
      return;
    }
    rounds = buildRoundsWithResults();
    playerNames = players.map((p) => p.name);
  }

  const datasets = playerNames.map((name, i) => ({
    label: name,
    data: [0],
    borderColor: getPlayerColor(i),
    backgroundColor: getPlayerColor(i),
    tension: 0.1,
    fill: false,
    pointRadius: 4,
    pointHoverRadius: 6,
  }));

  const labels = ["Inicio"];
  const cumulatives = new Array(playerNames.length).fill(0);

  rounds.forEach((round) => {
    labels.push(round.label);
    const ordered = [...round.results].sort((a, b) => a.playerId - b.playerId);
    ordered.forEach((res, i) => {
      cumulatives[i] += res.points;
      datasets[i].data.push(cumulatives[i]);
    });
  });

  datasets.sort((a, b) => {
    const lastA = a.data[a.data.length - 1];
    const lastB = b.data[b.data.length - 1];
    return lastB - lastA;
  });

  const ctx = document.getElementById("scoreChart").getContext("2d");
  if (chartInstance) chartInstance.destroy();

  Chart.defaults.color = "#1e4022";

  chartInstance = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        y: { grid: { color: "rgba(30, 64, 34, 0.1)" }, ticks: { color: "#1e4022" } },
        x: { grid: { color: "rgba(30, 64, 34, 0.1)" }, ticks: { color: "#1e4022" } },
      },
      plugins: {
        legend: { labels: { color: "#1e4022" } },
        tooltip: { mode: "index", intersect: false, itemSort: (a, b) => b.raw - a.raw },
      },
    },
  });

  document.getElementById("chart-modal").style.display = "block";
}

// ======= Estadísticas =======
function calculatePositiveStreak(rounds, playerId) {
  let max = 0, cur = 0;
  rounds.forEach((round) => {
    const res = round.results.find((r) => r.playerId === playerId);
    if (res && res.points >= 0) { cur++; max = Math.max(max, cur); } else { cur = 0; }
  });
  return max;
}

function calculateNegativeStreak(rounds, playerId) {
  let max = 0, cur = 0;
  rounds.forEach((round) => {
    const res = round.results.find((r) => r.playerId === playerId);
    if (res && res.points < 0) { cur++; max = Math.max(max, cur); } else { cur = 0; }
  });
  return max;
}

function calculateAccuracy(rounds, playerId) {
  let exact = 0;
  rounds.forEach((round) => {
    const res = round.results.find((r) => r.playerId === playerId);
    if (res && res.bid === res.won) exact++;
  });
  return rounds.length > 0 ? ((exact / rounds.length) * 100).toFixed(1) : 0;
}

function calculateBestRound(rounds, playerId) {
  let best = -Infinity;
  rounds.forEach((round) => {
    const res = round.results.find((r) => r.playerId === playerId);
    if (res && res.points > best) best = res.points;
  });
  return best > -Infinity ? best : 0;
}

function calculateWorstRound(rounds, playerId) {
  let worst = Infinity;
  rounds.forEach((round) => {
    const res = round.results.find((r) => r.playerId === playerId);
    if (res && res.points < worst) worst = res.points;
  });
  return worst < Infinity ? worst : 0;
}

function renderStreakTable(streaks) {
  let html = '<table class="stats-table"><thead><tr><th>Jugador</th><th>Rondas</th></tr></thead><tbody>';
  streaks.forEach(({ name, streak }) => { html += `<tr><td>${name}</td><td>${streak}</td></tr>`; });
  return html + "</tbody></table>";
}

function renderTopStreaksTable(topStreaks) {
  let html = '<table class="stats-table"><thead><tr><th>#</th><th>Jugador</th><th>Rondas</th><th>Partida</th></tr></thead><tbody>';
  topStreaks.forEach((entry, idx) => {
    html += `<tr><td>${idx + 1}</td><td>${entry.name}</td><td>${entry.streak}</td><td style="font-size:0.8rem;opacity:0.8;">${entry.game}</td></tr>`;
  });
  return html + "</tbody></table>";
}

function showGameStatsForGame(game) {
  const modal = document.getElementById("stats-modal");
  document.getElementById("stats-title").textContent = `Estadísticas: ${game.name || "Partida actual"}`;

  const gamePlayers = game.players;
  const gameRounds = game.rounds;

  let html = '<div class="stats-section">';

  html += '<h4 style="color:#eac77a;">🔥 Mejor Racha Positiva</h4>';
  const posStreaks = gamePlayers.map((p, i) => ({ name: p.name, streak: calculatePositiveStreak(gameRounds, i) }))
    .sort((a, b) => b.streak - a.streak);
  html += renderStreakTable(posStreaks);

  html += '<h4 style="color:#eac77a;margin-top:1.5rem;">❄️ Mejor Racha Negativa</h4>';
  const negStreaks = gamePlayers.map((p, i) => ({ name: p.name, streak: calculateNegativeStreak(gameRounds, i) }))
    .sort((a, b) => b.streak - a.streak);
  html += renderStreakTable(negStreaks);

  html += '<h4 style="color:#eac77a;margin-top:1.5rem;">🎯 % de Acierto (apuesta = ganadas)</h4>';
  html += '<table class="stats-table"><thead><tr><th>Jugador</th><th>% Acierto</th></tr></thead><tbody>';
  gamePlayers.map((p, i) => ({ name: p.name, value: calculateAccuracy(gameRounds, i) }))
    .sort((a, b) => parseFloat(b.value) - parseFloat(a.value))
    .forEach(({ name, value }) => { html += `<tr><td>${name}</td><td>${value}%</td></tr>`; });
  html += "</tbody></table>";

  html += '<h4 style="color:#eac77a;margin-top:1.5rem;">📊 Mejor y Peor Ronda Individual</h4>';
  html += '<table class="stats-table"><thead><tr><th>Jugador</th><th>Mejor</th><th>Peor</th></tr></thead><tbody>';
  gamePlayers.forEach((p, i) => {
    html += `<tr><td>${p.name}</td><td style="color:#4BC0C0;">+${calculateBestRound(gameRounds, i)}</td><td style="color:#e08e79;">${calculateWorstRound(gameRounds, i)}</td></tr>`;
  });
  html += "</tbody></table>";

  html += "</div>";
  document.getElementById("stats-content").innerHTML = html;
  modal.style.display = "block";
}

function showGlobalStats(history) {
  const modal = document.getElementById("stats-modal");
  document.getElementById("stats-title").textContent = `Estadísticas Globales (${history.length} partidas)`;

  // Clasificación histórica
  const ranking = {};
  history.forEach((game) => {
    [...game.players].sort((a, b) => b.total - a.total).forEach((p, idx) => {
      if (!ranking[p.name]) ranking[p.name] = 0;
      ranking[p.name] += Math.max(1, numPlayers - idx);
    });
  });
  const historicalRanking = Object.entries(ranking).map(([name, pts]) => ({ name, points: pts })).sort((a, b) => b.points - a.points);

  // Partidas ganadas
  const wins = {};
  history.forEach((game) => {
    const winner = [...game.players].sort((a, b) => b.total - a.total)[0];
    if (!wins[winner.name]) wins[winner.name] = 0;
    wins[winner.name]++;
  });

  // Puntuación media
  const scores = {};
  history.forEach((game) => {
    game.players.forEach((p) => {
      if (!scores[p.name]) scores[p.name] = { total: 0, count: 0 };
      scores[p.name].total += p.total;
      scores[p.name].count++;
    });
  });

  // % acierto global
  const accuracy = {};
  history.forEach((game) => {
    game.rounds.forEach((round) => {
      round.results.forEach((res) => {
        if (!accuracy[res.name]) accuracy[res.name] = { exact: 0, total: 0 };
        accuracy[res.name].total++;
        if (res.bid === res.won) accuracy[res.name].exact++;
      });
    });
  });

  let html = '<div class="stats-section">';

  html += '<h4 style="color:#eac77a;">🏆 Clasificación Histórica</h4>';
  html += '<table class="stats-table"><thead><tr><th>Jugador</th><th>Puntos</th></tr></thead><tbody>';
  historicalRanking.forEach((e, idx) => {
    const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "";
    html += `<tr><td>${medal} ${e.name}</td><td>${e.points}</td></tr>`;
  });
  html += "</tbody></table>";

  html += '<h4 style="color:#eac77a;margin-top:1.5rem;">👑 Partidas Ganadas</h4>';
  html += '<table class="stats-table"><thead><tr><th>Jugador</th><th>Victorias</th></tr></thead><tbody>';
  Object.entries(wins).sort((a, b) => b[1] - a[1]).forEach(([name, w]) => {
    html += `<tr><td>${name}</td><td>${w}</td></tr>`;
  });
  html += "</tbody></table>";

  html += '<h4 style="color:#eac77a;margin-top:1.5rem;">📈 Puntuación Media por Partida</h4>';
  html += '<table class="stats-table"><thead><tr><th>Jugador</th><th>Media</th></tr></thead><tbody>';
  Object.entries(scores).map(([name, d]) => ({ name, avg: d.total / d.count })).sort((a, b) => b.avg - a.avg).forEach((e) => {
    html += `<tr><td>${e.name}</td><td>${e.avg.toFixed(1)}</td></tr>`;
  });
  html += "</tbody></table>";

  html += '<h4 style="color:#eac77a;margin-top:1.5rem;">🎯 % de Acierto Global</h4>';
  html += '<table class="stats-table"><thead><tr><th>Jugador</th><th>% Acierto</th></tr></thead><tbody>';
  Object.entries(accuracy).map(([name, d]) => ({ name, acc: ((d.exact / d.total) * 100).toFixed(1) })).sort((a, b) => parseFloat(b.acc) - parseFloat(a.acc)).forEach((e) => {
    html += `<tr><td>${e.name}</td><td>${e.acc}%</td></tr>`;
  });
  html += "</tbody></table>";

  html += "</div>";
  document.getElementById("stats-content").innerHTML = html;
  modal.style.display = "block";
}

// ======= Copia de seguridad =======
function setupBackup() {
  const backupArea = document.getElementById("backup-area");
  const backupText = document.getElementById("backup-text");
  const btnSaveImport = document.getElementById("btn-save-import");
  const btnSaveSingle = document.getElementById("btn-save-single");
  const btnCopy = document.getElementById("btn-copy-clipboard");
  const btnPaste = document.getElementById("btn-paste-clipboard");
  const backupStatus = document.getElementById("backup-status");

  document.getElementById("btn-export").addEventListener("click", () => {
    const data = localStorage.getItem(HISTORY_KEY) || "[]";
    backupArea.style.display = "block";
    backupText.value = data;
    btnSaveImport.style.display = "none";
    btnSaveSingle.style.display = "none";
    if (btnCopy) btnCopy.style.display = "block";
    if (btnPaste) btnPaste.style.display = "none";
    backupStatus.textContent = 'Pulsa "Copiar al Portapapeles" o selecciona el texto manualmente.';
  });

  document.getElementById("btn-import").addEventListener("click", () => {
    backupArea.style.display = "block";
    backupText.value = "";
    backupText.placeholder = "Pega aquí el código copiado...";
    btnSaveImport.style.display = "block";
    btnSaveSingle.style.display = "none";
    if (btnCopy) btnCopy.style.display = "none";
    if (btnPaste) btnPaste.style.display = "block";
    backupStatus.textContent = 'Pega el texto y pulsa "Restaurar Datos".';
    setTimeout(() => backupText.focus(), 100);
  });

  document.getElementById("btn-import-single").addEventListener("click", () => {
    backupArea.style.display = "block";
    backupText.value = "";
    backupText.placeholder = "Pega aquí el JSON de una partida individual...";
    btnSaveImport.style.display = "none";
    btnSaveSingle.style.display = "block";
    if (btnCopy) btnCopy.style.display = "none";
    if (btnPaste) btnPaste.style.display = "block";
    backupStatus.textContent = 'Pega el JSON de una partida y pulsa "Añadir Partida".';
    setTimeout(() => backupText.focus(), 100);
  });

  if (btnCopy) {
    btnCopy.addEventListener("click", () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(backupText.value).then(() => {
          backupStatus.textContent = "¡Copiado al portapapeles!";
          backupStatus.style.color = "#4BC0C0";
        }).catch(() => {
          backupText.select();
          document.execCommand("copy");
          backupStatus.textContent = "Texto seleccionado. Si no se copió, hazlo manualmente.";
          backupStatus.style.color = "#d6ad60";
        });
      } else {
        backupText.select();
        document.execCommand("copy");
        backupStatus.textContent = "Texto seleccionado. Cópialo manualmente.";
        backupStatus.style.color = "#d6ad60";
      }
    });
  }

  if (btnPaste) {
    btnPaste.addEventListener("click", async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          backupText.value = text;
          backupStatus.textContent = "¡Texto pegado correctamente!";
          backupStatus.style.color = "#4BC0C0";
          backupText.focus();
        } else {
          backupText.focus();
          backupStatus.textContent = 'El campo está listo. Usa el pegado nativo de tu dispositivo.';
          backupStatus.style.color = "#d6ad60";
        }
      } catch (e) {
        backupText.focus();
        backupStatus.textContent = "No se pudo acceder al portapapeles. Pega manualmente.";
        backupStatus.style.color = "#d6ad60";
      }
    });
  }

  btnSaveImport.addEventListener("click", () => {
    try {
      const dataStr = backupText.value.trim();
      if (!dataStr) { backupStatus.textContent = "Por favor, pega los datos primero."; backupStatus.style.color = "#ff6b6b"; backupText.focus(); return; }
      const data = JSON.parse(dataStr);
      if (Array.isArray(data)) {
        if (confirm("Se sobrescribirán las partidas actuales con las pegadas. ¿Continuar?")) {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
          backupStatus.textContent = "¡Datos restaurados! Recargando...";
          backupStatus.style.color = "#4BC0C0";
          setTimeout(() => location.reload(), 500);
        }
      } else {
        backupStatus.textContent = "Error: El formato no es válido (no es una lista).";
        backupStatus.style.color = "#ff6b6b";
        backupText.focus();
      }
    } catch (e) {
      backupStatus.textContent = "Error: El texto no es un JSON válido.";
      backupStatus.style.color = "#ff6b6b";
      backupText.focus();
    }
  });

  btnSaveSingle.addEventListener("click", () => {
    try {
      const dataStr = backupText.value.trim();
      if (!dataStr) { backupStatus.textContent = "Por favor, pega los datos primero."; backupStatus.style.color = "#ff6b6b"; backupText.focus(); return; }
      const game = JSON.parse(dataStr);
      if (game && typeof game.id === "number" && typeof game.name === "string" && Array.isArray(game.players) && Array.isArray(game.rounds)) {
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
        if (history.some((g) => g.id === game.id)) {
          backupStatus.textContent = "Esta partida ya existe en el historial.";
          backupStatus.style.color = "#d6ad60";
          backupText.focus();
          return;
        }
        history.push(game);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        backupStatus.textContent = "¡Partida añadida! Recargando...";
        backupStatus.style.color = "#4BC0C0";
        setTimeout(() => location.reload(), 500);
      } else {
        backupStatus.textContent = "Error: Formato no válido. Debe ser un objeto de partida con id, name, date, players, rounds.";
        backupStatus.style.color = "#ff6b6b";
        backupText.focus();
      }
    } catch (e) {
      backupStatus.textContent = "Error: El texto no es un JSON válido.";
      backupStatus.style.color = "#ff6b6b";
      backupText.focus();
    }
  });
}

// ======= Nueva partida =======
function newGame() {
  const enCurso = roundIndex > 0 && roundIndex < roundPlan.length;
  if (enCurso) {
    const confirmar = confirm(
      "¿Seguro que quieres empezar una nueva partida?\nSe perderá el avance actual."
    );
    if (!confirmar) return;
  }
  activeHistoryGame = null;
  clearState();
  location.reload();
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

  // Intentar restaurar partida guardada
  const restored = restoreState();

  if (restored) {
    // Sincronizar los inputs de nombre con el estado restaurado
    players.forEach((p, i) => {
      const input = document.querySelector(`.player-card[data-player='${i}'] .player-name`);
      if (input) input.value = p.name;
    });
  } else {
    askPlayerNames();
  }

  ensureScoreTable();

  // Reconstruir la tabla de puntuación con el historial guardado
  roundHistory.forEach((h) => {
    appendRoundRows(h.label, h.cards, h.betsArr, h.winsArr, h.ptsArr);
  });

  renderHeader();
  updateTotalsRow();
  updateCurrentRoundHeader();
  updateDisplay();
  updateSaveButtonState();

  // Si la partida había terminado, bloquear controles
  if (roundIndex >= roundPlan.length) {
    endGame();
  }

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

  const newGameBtn = document.getElementById("new-game");
  if (newGameBtn) newGameBtn.addEventListener("click", newGame);

  // Botones de historial, gráfica y estadísticas
  document.getElementById("open-history").addEventListener("click", openHistoryModal);
  document.getElementById("close-history").addEventListener("click", () => {
    document.getElementById("history-modal").style.display = "none";
  });
  document.getElementById("btn-global-stats").addEventListener("click", () => {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    if (history.length === 0) { alert("No hay partidas en el historial."); return; }
    document.getElementById("history-modal").style.display = "none";
    showGlobalStats(history);
  });

  document.getElementById("open-chart").addEventListener("click", showChart);
  document.getElementById("close-chart").addEventListener("click", () => {
    document.getElementById("chart-modal").style.display = "none";
  });
  document.getElementById("close-chart-btn").addEventListener("click", () => {
    document.getElementById("chart-modal").style.display = "none";
  });

  document.getElementById("open-stats").addEventListener("click", () => {
    if (activeHistoryGame) {
      showGameStatsForGame(activeHistoryGame);
    } else {
      if (roundHistory.length === 0) { alert("No hay rondas jugadas aún para mostrar estadísticas."); return; }
      showGameStatsForGame({
        name: "Partida actual",
        players: players.map((p) => ({ name: p.name, total: p.total })),
        rounds: buildRoundsWithResults(),
      });
    }
  });
  document.getElementById("close-stats").addEventListener("click", () => {
    document.getElementById("stats-modal").style.display = "none";
  });

  // Cerrar modales al hacer clic fuera
  window.addEventListener("click", (e) => {
    ["history-modal", "chart-modal", "stats-modal"].forEach((id) => {
      const modal = document.getElementById(id);
      if (e.target === modal) modal.style.display = "none";
    });
  });

  setupBackup();

  // Cambios de nombre en vivo → actualizar cabecera y persistir
  document.querySelectorAll(".player-name").forEach((input, index) => {
    input.addEventListener("input", () => {
      players[index].name = input.value || `Jugador ${index + 1}`;
      renderHeader();
      persistState();
    });
  });
}

window.addEventListener("DOMContentLoaded", setup);
