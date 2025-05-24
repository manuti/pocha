document.addEventListener('DOMContentLoaded', function() {
    const testResultsDiv = document.getElementById('test-results');
    let testsPassed = 0;
    let testsFailed = 0;

    // --- Test Helper Functions ---
    function logResult(message, isSuccess) {
        const p = document.createElement('p');
        p.textContent = message;
        p.className = isSuccess ? 'test-pass' : 'test-fail';
        testResultsDiv.appendChild(p);
        if (isSuccess) testsPassed++;
        else testsFailed++;
    }

    function assertEquals(expected, actual, message) {
        if (expected === actual) {
            logResult(`PASS: ${message} (Expected: ${expected}, Actual: ${actual})`, true);
        } else {
            logResult(`FAIL: ${message} (Expected: ${expected}, Actual: ${actual})`, false);
        }
    }

    function assertTrue(value, message) {
        if (value === true) {
            logResult(`PASS: ${message}`, true);
        } else {
            logResult(`FAIL: ${message} (Expected true, got ${value})`, false);
        }
    }

    function assertFalse(value, message) {
        if (value === false) {
            logResult(`PASS: ${message}`, true);
        } else {
            logResult(`FAIL: ${message} (Expected false, got ${value})`, false);
        }
    }

    function testSection(name, testFn) {
        const h3 = document.createElement('h3');
        h3.textContent = name;
        testResultsDiv.appendChild(h3);
        testFn();
    }

    // --- Mocking and Setup ---
    function resetGameStateForTest() {
        // Manually reset global state variables from script.js for isolated tests
        players = [
            { name: 'P1', score: 0, bid: 0, won: 0 },
            { name: 'P2', score: 0, bid: 0, won: 0 },
            { name: 'P3', score: 0, bid: 0, won: 0 },
            { name: 'P4', score: 0, bid: 0, won: 0 }
        ];
        currentRound = 0;
        gameActive = true;
        summaryTableBody.innerHTML = ''; // Clear summary table
        localStorage.removeItem(SAVE_KEY); // Clear any saved game state
        // Initialize a game in a controlled way (without full DOM interaction if possible)
        // For some tests, we might call parts of initGame or simulate its effects
    }

    // --- Test Suites ---

    testSection('Score Calculation Tests', function() {
        assertEquals(14, calculatePlayerScore(3, 3), "Bid 3, Won 3 should be 14 points");
        assertEquals(5, calculatePlayerScore(0, 0), "Bid 0, Won 0 should be 5 points");
        assertEquals(-6, calculatePlayerScore(3, 1), "Bid 3, Won 1 should be -6 points (Diff 2)");
        assertEquals(-3, calculatePlayerScore(1, 0), "Bid 1, Won 0 should be -3 points (Diff 1)");
        assertEquals(-9, calculatePlayerScore(0, 3), "Bid 0, Won 3 should be -9 points (Diff 3)");
        assertEquals(5 + (3*8), calculatePlayerScore(8, 8), "Bid 8, Won 8 (max cards in some rounds) should be 29 points");
    });

    testSection('Round Progression and Game State Tests', function() {
        resetGameStateForTest();
        initGame(true); // Start a fresh game, clears localStorage

        assertEquals(0, currentRound, "Initial round should be 0");
        assertTrue(gameActive, "Game should be active at start");

        // Simulate a round completion (bypassing UI and validation for this test)
        // We directly manipulate state as if a round was successfully processed
        players[0].bid = 1; players[0].won = 1; players[0].score += calculatePlayerScore(1,1);
        players[1].bid = 0; players[1].won = 0; players[1].score += calculatePlayerScore(0,0);
        players[2].bid = 0; players[2].won = 0; players[2].score += calculatePlayerScore(0,0);
        players[3].bid = 0; players[3].won = 0; players[3].score += calculatePlayerScore(0,0);
        updateSummaryTable(); // Uses currentRound, so call before incrementing
        currentRound++;
        displayNextRoundInfo(); // This would call endGame if currentRound >= maxRounds

        assertEquals(1, currentRound, "After one round, currentRound should be 1");

        // Simulate playing all rounds
        resetGameStateForTest();
        initGame(true);
        currentRound = maxRounds -1; // Go to the last round
        // Simulate last round completion
        players[0].bid = roundCardsSequence[maxRounds-1]; players[0].won = roundCardsSequence[maxRounds-1];
        players[0].score += calculatePlayerScore(players[0].bid, players[0].won);
        // ... (simplify: only one player for this test logic)
        updateSummaryTable();
        currentRound++;
        displayNextRoundInfo(); // This should call endGame()

        assertEquals(maxRounds, currentRound, `After ${maxRounds} rounds, currentRound should be ${maxRounds}`);
        assertFalse(gameActive, "Game should be inactive after all rounds");
    });


    testSection('LocalStorage Save/Load Tests', function() {
        resetGameStateForTest();
        initGame(true); // Start fresh, this also calls saveGame() for the initial state

        // Modify state
        players[0].name = "Tester1";
        players[0].score = 100;
        currentRound = 5;
        gameActive = true; // ensure it's active for this part of test
        summaryTableBody.innerHTML = "<tr><td>Test Row</td></tr>"; // Mock some table content
        saveGame(); // Explicitly save this modified state

        // Reset variables to ensure loadGame actually works
        players = [ { name: '', score: 0, bid: 0, won: 0 }, { name: '', score: 0, bid: 0, won: 0 }, { name: '', score: 0, bid: 0, won: 0 }, { name: '', score: 0, bid: 0, won: 0 } ];
        currentRound = 0;
        summaryTableBody.innerHTML = "";

        assertTrue(loadGame(), "loadGame should return true when data exists");
        assertEquals("Tester1", players[0].name, "Player name should be loaded correctly");
        assertEquals(100, players[0].score, "Player score should be loaded correctly");
        assertEquals(5, currentRound, "Current round should be loaded correctly");
        assertEquals("<tr><td>Test Row</td></tr>", summaryTableBody.innerHTML, "Summary table HTML should be loaded");

        // Test loading into an active game scenario (UI updates happen in initGame)
        resetGameStateForTest();
        localStorage.removeItem(SAVE_KEY); // Clear previous
        // Setup a specific state to save
        players[0].name = "MidGameP1"; players[0].score = 50;
        players[1].name = "MidGameP2"; players[1].score = -10;
        currentRound = 3; gameActive = true;
        summaryTableBody.innerHTML = "<tr><td>Round 1</td></tr><tr><td>Round 2</td></tr>";
        saveGame();

        // Call initGame(false) which should trigger loadGame and UI updates
        initGame(false); // isReset = false

        assertEquals("MidGameP1", player1NameInput.value, "Player 1 name input should be updated from loaded state");
        assertEquals("Round 3 - 4 Cards", roundInfoDisplay.textContent, "Round info display should be updated for loaded game");
        assertTrue(submitRoundButton.disabled === false, "Submit button should be enabled for an active loaded game");

        // Test loading a game-over state
        resetGameStateForTest();
        localStorage.removeItem(SAVE_KEY);
        players[0].name = "GameOverP1"; players[0].score = 70;
        currentRound = maxRounds; gameActive = false; // Game is over
        summaryTableBody.innerHTML = "<tr><td>Final Row</td></tr>";
        saveGame();

        initGame(false);
        assertEquals("GameOverP1", player1NameInput.value, "Player 1 name input should be updated from game-over loaded state");
        assertEquals("Game Over! Final Scores:", roundInfoDisplay.textContent, "Round info should show Game Over for loaded game-over state");
        assertTrue(submitRoundButton.disabled === true, "Submit button should be disabled for a game-over loaded state");


        localStorage.removeItem(SAVE_KEY); // Clean up
    });

    // --- Final Summary ---
    function logSummary() {
        const summaryP = document.createElement('p');
        summaryP.className = 'test-summary';
        summaryP.textContent = `Testing Complete. Passed: ${testsPassed}, Failed: ${testsFailed}.`;
        if (testsFailed > 0) {
            summaryP.style.color = 'red';
        } else {
            summaryP.style.color = 'green';
        }
        testResultsDiv.appendChild(summaryP);
    }

    logSummary();
});
