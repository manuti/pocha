const numPlayers = 5;

let roundIndex = 0; // índice 0..(plan.length-1)

// Plan fijo de la partida
function buildRoundPlan() {
    const plan = [];
    // Ronda 1..8 (sube 1..8)
    for (let i = 1; i <= 8; i++) plan.push({ title: `Ronda: ${i}`, cards: i });
    // Ronda 9..12 (8 cartas)
    for (let i = 9; i <= 12; i++) plan.push({ title: `Ronda: ${i}`, cards: 8 });
    // Ronda 13..19 (baja 7..1)
    let c = 7;
    for (let i = 13; i <= 19; i++, c--) plan.push({ title: `Ronda: ${i}`, cards: c });
    // Subastados 1..5 (8 cartas)
    for (let s = 1; s <= 5; s++) plan.push({ title: `Subastado: ${s}`, cards: 8 });
    return plan;
}

const roundPlan = buildRoundPlan();
let cardsPerPlayer = roundPlan[roundIndex].cards;


const players = Array.from({ length: numPlayers }, (_, i) => ({
    name: '',
    bid: 0,
    won: 0,
    total: 0
}));

function updateCurrentRoundHeader() {
    const header = document.getElementById("current-round-header");
    if (roundIndex < roundPlan.length) {
        header.textContent = `${roundPlan[roundIndex].title}, Cartas: ${cardsPerPlayer}`;
    } else {
        header.textContent = `Partida finalizada`;
    }
    updateBidsIndicator?.(); // si ya añadiste el indicador de apuestas
}

function updateBidsIndicator() {
    const totalBids = players.reduce((sum, p) => sum + p.bid, 0);
    const el = document.getElementById("bids-indicator");
    if (!el) return;

    // Mostrar "Apuestas: X / Y" donde Y es el número de cartas de la ronda
    el.textContent = `Apuestas: ${totalBids} / ${cardsPerPlayer}`;

    // Poner en rojo cuando X == Y
    el.classList.toggle("alert", totalBids === cardsPerPlayer);
}

function updateDisplay() {
    players.forEach((player, index) => {
        const card = document.querySelector(`.player-card[data-player='${index}']`);
        card.querySelector(".player-name").value = player.name;
        card.querySelector(".bid-value").textContent = player.bid;
        card.querySelector(".won-value").textContent = player.won;
    });
    updateBidsIndicator(); // <-- NUEVO
}

function changeValue(index, field, delta) {
    const newValue = players[index][field] + delta;
    
    // Para las apuestas (bid), el máximo es el número de cartas por jugador
    // Para las victorias (won), el máximo también es el número de cartas por jugador
    const maxValue = cardsPerPlayer;
    
    // Aplicar límites: mínimo 0, máximo según el campo
    players[index][field] = Math.max(0, Math.min(maxValue, newValue));
    
    updateDisplay();
}

function saveRound() {
    const scoreboard = document.getElementById("scoreboard");

    // Header/tabla de la ronda actual
    const roundBlock = document.createElement("div");
    roundBlock.className = "round-block";

    const roundHeader = document.createElement("div");
    roundHeader.className = "round-label";
    roundHeader.textContent = `${roundPlan[roundIndex].title}, Cartas: ${cardsPerPlayer}`;

    const table = document.createElement("table");
    table.className = "round-table";

    const thead = document.createElement("thead");
    thead.innerHTML = `
        <tr>
            <th>Jugador</th>
            <th>Bets</th>
            <th>Wins</th>
            <th>Pts</th>
            <th>Total</th>
        </tr>
    `;

    const tbody = document.createElement("tbody");

    players.forEach((player) => {
        const points =
            player.bid === player.won
                ? 10 + player.won * 5
                : -5 * Math.abs(player.bid - player.won);
        player.total += points;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${player.name}</td>
            <td>${player.bid}</td>
            <td>${player.won}</td>
            <td>${points}</td>
            <td class="total">${player.total}</td>
        `;
        tbody.appendChild(row);

        // Reset para la siguiente ronda
        player.bid = 0;
        player.won = 0;
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    roundBlock.appendChild(roundHeader);
    roundBlock.appendChild(table);
    scoreboard.insertBefore(roundBlock, scoreboard.firstChild);

    // Avanzar en el plan
    roundIndex++;

    // ¿Se acabó el plan?
    if (roundIndex >= roundPlan.length) {
        endGame();
        return;
    }

    // Preparar siguiente ronda según plan
    cardsPerPlayer = roundPlan[roundIndex].cards;
    updateDisplay();
    updateCurrentRoundHeader();
}

function askPlayerNames() {
    players.forEach((player, i) => {
        const name = prompt(`Nombre del jugador ${i + 1}:`, `Jugador ${i + 1}`);
        player.name = name || `Jugador ${i + 1}`;
    });
    updateDisplay();
}

function endGame() {
    // Encabezado
    updateCurrentRoundHeader();

    // Botón
    const btn = document.getElementById("next-round");
    btn.textContent = "Partida finalizada";
    btn.disabled = true;

    // Desactivar entradas y botones de suma/resta
    document.querySelectorAll(".player-name, .bid-plus, .bid-minus, .won-plus, .won-minus")
        .forEach(el => el.disabled = true);

    // Refrescar indicador de apuestas, si existe
    updateBidsIndicator?.();
}

function setup() {
    askPlayerNames();
    updateCurrentRoundHeader();

    document.querySelectorAll(".bid-plus").forEach((btn, i) =>
        btn.addEventListener("click", () => changeValue(getIndex(btn), "bid", 1))
    );
    document.querySelectorAll(".bid-minus").forEach((btn, i) =>
        btn.addEventListener("click", () => changeValue(getIndex(btn), "bid", -1))
    );
    document.querySelectorAll(".won-plus").forEach((btn, i) =>
        btn.addEventListener("click", () => changeValue(getIndex(btn), "won", 1))
    );
    document.querySelectorAll(".won-minus").forEach((btn, i) =>
        btn.addEventListener("click", () => changeValue(getIndex(btn), "won", -1))
    );

    document.getElementById("next-round").addEventListener("click", saveRound);

    document.querySelectorAll(".player-name").forEach((input, index) => {
        input.addEventListener("input", () => {
            players[index].name = input.value;
        });
    });
}

function getIndex(element) {
    return parseInt(element.closest(".player-card").dataset.player);
}

window.addEventListener("DOMContentLoaded", setup);
