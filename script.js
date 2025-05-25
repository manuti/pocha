// 1. Game State Variables
let players = [
    { name: '', score: 0, bid: 0, won: 0 },
    { name: '', score: 0, bid: 0, won: 0 },
    { name: '', score: 0, bid: 0, won: 0 },
    { name: '', score: 0, bid: 0, won: 0 }
];
let currentRound = 0;
let gameActive = true;
const roundCardsSequence = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const maxRounds = roundCardsSequence.length;

// 2. DOM Element References
const player1NameInput = document.getElementById('player1-name');
const player2NameInput = document.getElementById('player2-name');
const player3NameInput = document.getElementById('player3-name');
const player4NameInput = document.getElementById('player4-name');

const roundInfoDisplay = document.getElementById('round-info');

const player1BidInput = document.getElementById('player1-bid');
const player2BidInput = document.getElementById('player2-bid');
const player3BidInput = document.getElementById('player3-bid');
const player4BidInput = document.getElementById('player4-bid');

const player1TricksInput = document.getElementById('player1-tricks');
const player2TricksInput = document.getElementById('player2-tricks');
const player3TricksInput = document.getElementById('player3-tricks');
const player4TricksInput = document.getElementById('player4-tricks');

const submitRoundButton = document.getElementById('submit-round-button');
const resetGameButton = document.getElementById('reset-game-button');
const summaryTableBody = document.getElementById('summary-table-body');
const summaryTableHeaders = document.querySelectorAll('#summary-table th'); // To update player names

// --- LocalStorage Keys ---
const SAVE_KEY = 'pochaGameSave';

// --- Save & Load ---
function saveGame() {
    const gameState = {
        players: players,
        currentRound: currentRound,
        gameActive: gameActive,
        summaryTableHTML: summaryTableBody.innerHTML
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
}

function loadGame() {
    const savedData = localStorage.getItem(SAVE_KEY);
    if (savedData) {
        const loadedState = JSON.parse(savedData);
        players = loadedState.players;
        currentRound = loadedState.currentRound;
        gameActive = loadedState.gameActive;
        summaryTableBody.innerHTML = loadedState.summaryTableHTML;
        return true;
    }
    return false;
}

// --- UI Update Helpers ---
function updatePlayerNameInputsFromState() {
    player1NameInput.value = players[0].name;
    player2NameInput.value = players[1].name;
    player3NameInput.value = players[2].name;
    player4NameInput.value = players[3].name;
}

function updateSummaryTableHeadersFromState() {
    summaryTableHeaders[2].textContent = `${players[0].name} (Bid/Won/Points/Total)`;
    summaryTableHeaders[3].textContent = `${players[1].name} (Bid/Won/Points/Total)`;
    summaryTableHeaders[4].textContent = `${players[2].name} (Bid/Won/Points/Total)`;
    summaryTableHeaders[5].textContent = `${players[3].name} (Bid/Won/Points/Total)`;
}

function updateControlsBasedOnGameState() {
    const allGameAreaInputs = document.querySelectorAll('#game-area input');
    if (gameActive) {
        allGameAreaInputs.forEach(input => input.disabled = false);
        submitRoundButton.disabled = false;
    } else {
        allGameAreaInputs.forEach(input => input.disabled = true);
        submitRoundButton.disabled = true;
    }
}


// 3. Initialization Function (initGame)
function initGame(isReset = false) {
    if (isReset) {
        localStorage.removeItem(SAVE_KEY);
    }

    if (!isReset && loadGame()) {
        updatePlayerNameInputsFromState();
        updateSummaryTableHeadersFromState(); // Essential for loaded names
        updateControlsBasedOnGameState();

        if (!gameActive) {
            // If game was over, ensure roundInfoDisplay reflects it correctly
             roundInfoDisplay.textContent = "Game Over! Final Scores:";
        } else {
            displayNextRoundInfo(); // Sets round info and clears bid/trick inputs
        }
        return; // Loaded state, skip default initialization
    }

    // Default initialization / Reset
    // Player Names (read from input for flexibility if user typed before first "reset")
    players[0].name = player1NameInput.value.trim() || 'Player 1';
    players[1].name = player2NameInput.value.trim() || 'Player 2';
    players[2].name = player3NameInput.value.trim() || 'Player 3';
    players[3].name = player4NameInput.value.trim() || 'Player 4';
    updateSummaryTableHeadersFromState(); // Update headers with potentially new names

    currentRound = 0;
    players.forEach(player => {
        player.score = 0;
        player.bid = 0; // bid/won are transient for the round, reset them
        player.won = 0;
    });
    gameActive = true;
    summaryTableBody.innerHTML = ''; // Clear the summary table

    updateControlsBasedOnGameState(); // Enable controls
    displayNextRoundInfo(); // Setup for round 1
    saveGame(); // Save this fresh state
}

// Helper function for showing errors
function showError(message) {
    alert(message);
}

// 4. Display Next Round Information (displayNextRoundInfo)
function displayNextRoundInfo() {
    if (currentRound < maxRounds) {
        const cardsForRound = roundCardsSequence[currentRound];
        roundInfoDisplay.textContent = `Round ${currentRound + 1} - ${cardsForRound} Card${cardsForRound > 1 ? 's' : ''}`;

        // Clear previous bid/trick input values
        player1BidInput.value = '';
        player2BidInput.value = '';
        player3BidInput.value = '';
        player4BidInput.value = '';
        player1TricksInput.value = '';
        player2TricksInput.value = '';
        player3TricksInput.value = '';
        player4TricksInput.value = '';
    } else {
        endGame();
    }
}

// 5. Submit Round Function (handleSubmitRound)
function handleSubmitRound() {
    if (!gameActive) return;

    const cardsForRound = roundCardsSequence[currentRound];

    // 1. Collect all bid and trick inputs (as strings first for validation)
    const bidsInputs = [player1BidInput, player2BidInput, player3BidInput, player4BidInput];
    const tricksInputs = [player1TricksInput, player2TricksInput, player3TricksInput, player4TricksInput];

    const bidsRaw = bidsInputs.map(input => input.value);
    const tricksRaw = tricksInputs.map(input => input.value);

    // 2. Perform validation checks:
    //    - Are all fields filled?
    for (let i = 0; i < 4; i++) {
        if (bidsRaw[i] === '' || tricksRaw[i] === '') {
            showError("All bid and trick fields are required.");
            return;
        }
    }

    const bids = bidsRaw.map(val => parseInt(val));
    const tricks = tricksRaw.map(val => parseInt(val));

    //    - Are all values non-negative integers?
    for (let i = 0; i < 4; i++) {
        if (isNaN(bids[i]) || bids[i] < 0 || isNaN(tricks[i]) || tricks[i] < 0) {
            showError("Bids and tricks must be non-negative numbers.");
            return;
        }
    }

    //    - For each player: is tricks_won <= cards_dealt?
    for (let i = 0; i < 4; i++) {
        if (tricks[i] > cardsForRound) {
            showError(`${players[i].name}'s tricks won (${tricks[i]}) cannot exceed the number of cards dealt (${cardsForRound}).`);
            return;
        }
    }

    //    - Is sum_of_all_tricks_won === cards_dealt?
    const totalTricksWon = tricks.reduce((sum, current) => sum + current, 0);
    if (totalTricksWon !== cardsForRound) {
        showError(`The total number of tricks won (${totalTricksWon}) must equal the number of cards dealt (${cardsForRound}) in this round.`);
        return;
    }

    // 3. If all validations pass:
    //    - Store bids and tricks in the `players` array.
    for (let i = 0; i < 4; i++) {
        players[i].bid = bids[i];
        players[i].won = tricks[i];
    }

    //    - Calculate scores and store round points.
    players.forEach(player => {
        const roundPoints = calculatePlayerScore(player.bid, player.won);
        player.roundPoints = roundPoints; // Store points for the current round
        player.score += roundPoints;    // Add to total score
    });

    //    - Update summary table.
    updateSummaryTable();

    //    - Increment currentRound.
    currentRound++;
    //    - Call displayNextRoundInfo().
    displayNextRoundInfo();
    saveGame(); // Save game after successful round
}

// 6. Calculate Player Score Function (for testability)
function calculatePlayerScore(bid, won) {
    if (bid === won) {
        return 5 + (3 * won);
    } else {
        return -3 * Math.abs(bid - won);
    }
}

// 7. Update Summary Table Function
function updateSummaryTable() {
    const newRow = summaryTableBody.insertRow(); // Creates a new <tr> and appends it to tbody

    const roundCell = newRow.insertCell();
    roundCell.textContent = currentRound + 1; // currentRound is 0-indexed

    const cardsCell = newRow.insertCell();
    cardsCell.textContent = roundCardsSequence[currentRound];

    players.forEach(player => {
        const playerCell = newRow.insertCell();
        // player.bid and player.won are from the round just completed
        // player.roundPoints is the points for this specific round
        // player.score is the new total score
        playerCell.textContent = `${player.bid} / ${player.won} / ${player.roundPoints} / ${player.score}`;
    });
}

// 8. End Game Function (endGame)
function endGame() {
    gameActive = false;
    roundInfoDisplay.textContent = "Game Over! Final Scores:";

    // Disable inputs and button
    const allInputs = document.querySelectorAll('#game-area input');
    allInputs.forEach(input => input.disabled = true);
    submitRoundButton.disabled = true;

    console.log("Game Over! Final Scores:");
    players.forEach(player => console.log(`${player.name}: ${player.score}`));
    saveGame(); // Save game state at game over
}

// 9. Event Listeners
resetGameButton.addEventListener('click', () => initGame(true)); // Pass true for reset
submitRoundButton.addEventListener('click', handleSubmitRound);

// Initial call to set up the game
window.addEventListener('DOMContentLoaded', () => initGame(false)); // Pass false for initial load
