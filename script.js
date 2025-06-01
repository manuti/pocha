const numPlayers = 4;
let round = 1;
let cardsPerPlayer = 1;
const maxCards = 10;
let increasing = true;

const players = Array.from({ length: numPlayers }, (_, i) => ({
    name: '',
    bid: 0,
    won: 0,
    total: 0
}));

function updateCurrentRoundHeader() {
    document.getElementById("current-round-header").textContent = `Ronda: ${round}, Cartas: ${cardsPerPlayer}`;
}

function updateDisplay() {
    players.forEach((player, index) => {
        const card = document.querySelector(`.player-card[data-player='${index}']`);
        card.querySelector(".player-name").value = player.name;
        card.querySelector(".bid-value").textContent = player.bid;
        card.querySelector(".won-value").textContent = player.won;
    });
}

function changeValue(index, field, delta) {
    players[index][field] = Math.max(0, players[index][field] + delta);
    updateDisplay();
}

function saveRound() {
    const scoreboard = document.getElementById("scoreboard");
    
    // Crear el bloque de la ronda actual
    const roundBlock = document.createElement("div");
    roundBlock.className = "round-block";
    
    // Crear el header de la ronda
    const roundHeader = document.createElement("div");
    roundHeader.className = "round-label";
    roundHeader.textContent = `Ronda: ${round}, Cartas: ${cardsPerPlayer}`;
    
    // Crear la tabla
    const table = document.createElement("table");
    table.className = "round-table";
    
    // Crear el header de la tabla
    const thead = document.createElement("thead");
    thead.innerHTML = `
        <tr>
            <th>Jugador</th>
            <th>Apuestas</th>
            <th>Ganadas</th>
            <th>Pts</th>
            <th>Total</th>
        </tr>
    `;
    
    // Crear el cuerpo de la tabla
    const tbody = document.createElement("tbody");
    
    players.forEach((player, index) => {
        const points =
            player.bid === player.won
                ? 5 + player.won * 3
                : -3 * Math.abs(player.bid - player.won);
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
    
    // Ensamblar la tabla
    table.appendChild(thead);
    table.appendChild(tbody);
    
    // Ensamblar el bloque
    roundBlock.appendChild(roundHeader);
    roundBlock.appendChild(table);
    
    // Insertar al principio del scoreboard (nuevas rondas arriba)
    scoreboard.insertBefore(roundBlock, scoreboard.firstChild);

    // Calcular siguiente número de cartas
    if (increasing) {
        if (cardsPerPlayer < maxCards) {
            cardsPerPlayer++;
        } else {
            increasing = false;
            cardsPerPlayer--;
        }
    } else {
        if (cardsPerPlayer > 1) {
            cardsPerPlayer--;
        }
    }
    round++;
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