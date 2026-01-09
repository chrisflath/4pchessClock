/**
 * 4P Chess Clock & Scorer
 * Mobile-optimized chess clock and point tracker for 4-player chess
 */

// ============================================
// State Management
// ============================================

const PLAYERS = ['red', 'blue', 'yellow', 'green'];

// Color presets with main color and dark variant
const COLOR_PRESETS = {
    // Reds/Warm
    red: { main: '#e74c3c', dark: '#c0392b', textDark: false },
    orange: { main: '#e67e22', dark: '#d35400', textDark: false },
    // Blues/Cool
    blue: { main: '#3498db', dark: '#2980b9', textDark: false },
    navy: { main: '#2c3e50', dark: '#1a252f', textDark: false },
    // Yellows/Light
    yellow: { main: '#f1c40f', dark: '#d4ac0d', textDark: true },
    gold: { main: '#ffc107', dark: '#ffa000', textDark: true },
    cream: { main: '#fff59d', dark: '#fff176', textDark: true },
    // Greens
    green: { main: '#2ecc71', dark: '#27ae60', textDark: false },
    forest: { main: '#4caf50', dark: '#388e3c', textDark: false },
    // Blacks/Darks
    black: { main: '#1a1a1a', dark: '#0d0d0d', textDark: false },
    charcoal: { main: '#36454f', dark: '#2a363d', textDark: false },
    // Browns/Woods
    brown: { main: '#8b4513', dark: '#6b3410', textDark: false },
    tan: { main: '#d2b48c', dark: '#c4a574', textDark: true },
    walnut: { main: '#5d432c', dark: '#4a3623', textDark: false },
    coffee: { main: '#6f4e37', dark: '#5a3f2d', textDark: false },
    mahogany: { main: '#c04000', dark: '#9a3300', textDark: false },
    espresso: { main: '#3c1414', dark: '#2d0f0f', textDark: false }
};

const state = {
    mode: 'ffa', // 'ffa' or 'teams'
    timeMinutes: 5,
    incrementSeconds: 0,
    playerColors: ['red', 'blue', 'yellow', 'green'], // Color names for each position
    playerNames: ['Red', 'Blue', 'Yellow', 'Green'], // Custom names
    players: {
        red: { time: 300000, score: 0, eliminated: false },
        blue: { time: 300000, score: 0, eliminated: false },
        yellow: { time: 300000, score: 0, eliminated: false },
        green: { time: 300000, score: 0, eliminated: false }
    },
    currentPlayer: 'red',
    isRunning: false,
    isPaused: true,
    gameStarted: false,
    lastTick: null,
    actionHistory: []
};

let timerInterval = null;


// ============================================
// DOM Elements
// ============================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const elements = {
    setupScreen: $('#setup-screen'),
    gameScreen: $('#game-screen'),
    modeBtns: $$('.mode-btn'),
    timeBtns: $$('.time-btn'),
    incrementBtns: $$('.increment-btn'),
    customTimeInput: $('#custom-time'),
    startGameBtn: $('#start-game'),
    gameModeDisplay: $('#game-mode-display'),
    turnIndicator: $('#turn-indicator'),
    pauseBtn: $('#pause-btn'),
    playerZones: $$('.player-zone'),
    scoreBtn: $('#score-btn'),
    menuBtn: $('#menu-btn'),
    actionBtn: $('#action-btn'),
    undoBtn: $('#undo-btn'),
    scorePanel: $('#score-panel'),
    logBtn: $('#log-btn'),
    logPanel: $('#log-panel'),
    actionPanel: $('#action-panel'),
    menuPanel: $('#menu-panel'),
    overlay: $('#overlay'),
    closePanelBtns: $$('.close-panel-btn'),
    playerSelectBtns: $$('.player-select-btn'),
    actionTypeBtns: $$('.action-type-btn'),
    captureBtns: $$('.capture-btn'),
    statusBtns: $$('.status-btn'),

    // Modals
    gameOverModal: $('#game-over-modal'),
    resultsContainer: $('#results-container'),
    modalNewGameBtn: $('#modal-new-game-btn'),
    modalCloseBtn: $('#modal-close-btn'),

    // Menu items
    newGameBtn: $('#new-game-btn'),
    resetClocksBtn: $('#reset-clocks-btn'),
    finishGameBtn: $('#finish-game-btn'),
    resetScoresBtn: $('#reset-scores-btn'),
};

// ============================================
// Initialization
// ============================================

function init() {
    setupEventListeners();
    updateSetupUI();
}

function setupEventListeners() {
    // Setup screen
    elements.modeBtns.forEach(btn => {
        btn.addEventListener('click', () => selectMode(btn.dataset.mode));
    });

    elements.timeBtns.forEach(btn => {
        btn.addEventListener('click', () => selectTime(parseInt(btn.dataset.minutes)));
    });

    elements.incrementBtns.forEach(btn => {
        btn.addEventListener('click', () => selectIncrement(parseInt(btn.dataset.seconds)));
    });

    elements.customTimeInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (val > 0 && val <= 60) {
            elements.timeBtns.forEach(b => b.classList.remove('active'));
            state.timeMinutes = val;
        }
    });

    // Name inputs
    $$('.name-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const pos = parseInt(e.target.dataset.position);
            state.playerNames[pos] = e.target.value.trim() || `Player ${pos + 1}`;
        });
    });

    // Color picker
    $$('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            const row = swatch.closest('.color-picker-row');
            const position = parseInt(row.dataset.position);
            const color = swatch.dataset.color;

            // Update state
            state.playerColors[position] = color;

            // Update UI - deselect others in same row
            row.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
        });
    });

    elements.startGameBtn.addEventListener('click', startGame);

    // Game screen
    elements.playerZones.forEach(zone => {
        zone.addEventListener('click', () => handlePlayerTap(zone.dataset.player));
    });

    elements.pauseBtn.addEventListener('click', togglePause);
    elements.actionBtn.addEventListener('click', () => openPanel('action'));
    elements.undoBtn.addEventListener('click', undoLastAction);

    // Panel Toggles
    elements.menuBtn.addEventListener('click', () => openPanel(elements.menuPanel));
    elements.scoreBtn.addEventListener('click', () => {
        updateScorePanel(); // Ensure fresh data
        openPanel(elements.scorePanel);
    });
    elements.logBtn.addEventListener('click', () => {
        updateLogPanel();
        openPanel(elements.logPanel);
    });

    elements.closePanelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.panel').forEach(p => p.classList.remove('active'));
            elements.overlay.classList.remove('active');
        });
    });

    // Action panel
    elements.playerSelectBtns.forEach(btn => {
        btn.addEventListener('click', () => selectActionPlayer(btn.dataset.player));
    });

    elements.actionTypeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            handleButtonPress(btn);
            applyAction(btn.dataset.action, parseInt(btn.dataset.points));
            triggerFeedback(e, `+${btn.dataset.points}`);
        });
    });

    elements.captureBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            handleButtonPress(btn);
            applyCapture(btn.dataset.piece, parseInt(btn.dataset.points));
            triggerFeedback(e, `+${btn.dataset.points}`);
        });
    });

    elements.statusBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            handleButtonPress(btn);
            applyStatus(btn.dataset.status);
        });
    });

    // Menu Actions
    elements.newGameBtn.addEventListener('click', () => {
        closeAllPanels();
        elements.setupScreen.classList.add('active');
        elements.gameScreen.classList.remove('active');
        stopTimer();
    });

    elements.resetClocksBtn.addEventListener('click', () => {
        closeAllPanels();
        resetClocks();
    });

    elements.finishGameBtn.addEventListener('click', () => {
        closeAllPanels();
        endGame();
    });

    elements.resetScoresBtn.addEventListener('click', () => {
        closeAllPanels();
        resetScores();
    });

    // Modal Actions
    elements.modalNewGameBtn.addEventListener('click', () => {
        elements.gameOverModal.classList.remove('active');
        elements.setupScreen.classList.add('active');
        elements.gameScreen.classList.remove('active');
    });

    elements.modalCloseBtn.addEventListener('click', () => {
        elements.gameOverModal.classList.remove('active');
    });
}

// Helper for button animation
function handleButtonPress(btn) {
    btn.classList.remove('btn-pressed');
    void btn.offsetWidth; // Trigger reflow
    btn.classList.add('btn-pressed');
}



// ============================================
// Setup Functions
// ============================================

function selectMode(mode) {
    state.mode = mode;
    elements.modeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
}

function selectTime(minutes) {
    state.timeMinutes = minutes;
    elements.customTimeInput.value = '';
    elements.timeBtns.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.minutes) === minutes);
    });
}

function selectIncrement(seconds) {
    state.incrementSeconds = seconds;
    elements.incrementBtns.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.seconds) === seconds);
    });
}

function updateSetupUI() {
    selectMode(state.mode);
    selectTime(state.timeMinutes);
    selectIncrement(state.incrementSeconds);
}

// ============================================
// Game Functions
// ============================================

function startGame() {
    const timeMs = state.timeMinutes * 60 * 1000;

    PLAYERS.forEach(p => {
        state.players[p] = { time: timeMs, score: 0, eliminated: false };
    });

    state.currentPlayer = 'red';
    state.isRunning = false;
    state.isPaused = true;
    state.gameStarted = false;
    state.actionHistory = [];

    elements.setupScreen.classList.remove('active');
    elements.gameScreen.classList.add('active');

    // Apply selected colors and names to player zones
    applyPlayerColors();

    updateGameUI();
    updateScorePanel();
}

// Apply custom colors to each player zone
function applyPlayerColors() {
    PLAYERS.forEach((player, index) => {
        const zone = $(`.player-zone[data-player="${player}"]`);
        const colorName = state.playerColors[index];
        const colorData = COLOR_PRESETS[colorName];

        if (colorData) {
            zone.style.background = `linear-gradient(135deg, ${colorData.main} 0%, ${colorData.dark} 100%)`;
            zone.style.setProperty('--player-glow', colorData.main.replace(')', ', 0.4)').replace('#', 'rgba('));

            // Handle text color for light backgrounds
            if (colorData.textDark) {
                zone.classList.add('light-bg');
            } else {
                zone.classList.remove('light-bg');
            }

            // Update player name display
            const nameEl = zone.querySelector('.player-name');
            nameEl.textContent = state.playerNames[index];
        }
    });
}

function showSetup() {
    stopTimer();
    closeAllPanels();
    elements.gameScreen.classList.remove('active');
    elements.setupScreen.classList.add('active');
}

function handlePlayerTap(player) {
    if (state.players[player].eliminated) return;

    if (!state.gameStarted) {
        // First tap starts the game
        state.gameStarted = true;
        state.isRunning = true;
        state.isPaused = false;
        state.currentPlayer = player;
        startTimer();
        updateGameUI();
        return;
    }

    if (state.isPaused) return;

    if (player === state.currentPlayer) {
        // End turn - add increment and switch to next player
        state.players[player].time += state.incrementSeconds * 1000;
        nextPlayer();
    }
}

function nextPlayer() {
    const currentIdx = PLAYERS.indexOf(state.currentPlayer);
    let nextIdx = (currentIdx + 1) % 4;

    // Skip eliminated players
    let attempts = 0;
    while (state.players[PLAYERS[nextIdx]].eliminated && attempts < 4) {
        nextIdx = (nextIdx + 1) % 4;
        attempts++;
    }

    state.currentPlayer = PLAYERS[nextIdx];
    updateGameUI();

    // Check if game is over (only one player left)
    const activePlayers = PLAYERS.filter(p => !state.players[p].eliminated);
    if (activePlayers.length <= 1) {
        endGame();
    }
}

function togglePause() {
    if (!state.gameStarted) return;

    state.isPaused = !state.isPaused;

    if (state.isPaused) {
        stopTimer();
    } else {
        startTimer();
    }

    updateGameUI();
}

function startTimer() {
    stopTimer();
    state.lastTick = Date.now();
    timerInterval = setInterval(tick, 100);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function tick() {
    if (state.isPaused || !state.isRunning) return;

    const now = Date.now();
    const elapsed = now - state.lastTick;
    state.lastTick = now;

    const player = state.players[state.currentPlayer];
    player.time -= elapsed;

    if (player.time <= 0) {
        player.time = 0;
        eliminatePlayer(state.currentPlayer, 'timeout');
    }

    updateTimerDisplay(state.currentPlayer);
}

function eliminatePlayer(player, reason) {
    state.players[player].eliminated = true;

    if (reason === 'timeout') {
        // When a player times out, their king moves randomly
        // Other players can still checkmate it for points
    }

    nextPlayer();
    updateGameUI();
}

function endGame() {
    state.isRunning = false;
    state.isPaused = true;
    stopTimer();
    updateGameUI();
    showGameOver();
}

function showGameOver() {
    // Calculate standings
    const standings = PLAYERS.map((p, i) => ({
        color: p,
        name: state.playerNames[i],
        score: state.players[p].score,
        time: state.players[p].time
    })).sort((a, b) => b.score - a.score);

    // Render logic
    const html = standings.map((p, i) => {
        let medal = '';
        if (i === 0) medal = '🥇';
        if (i === 1) medal = '🥈';
        if (i === 2) medal = '🥉';

        return `
            <div class="result-row" style="border-left: 4px solid var(--player-${p.color})">
                <div class="result-rank">${medal || (i + 1)}</div>
                <div class="result-player">${p.name}</div>
                <div class="result-score">${p.score} pts</div>
            </div>
        `;
    }).join('');

    elements.resultsContainer.innerHTML = html;
    elements.gameOverModal.classList.add('active');
}

// ============================================
// Timer Display
// ============================================

function formatTime(ms) {
    if (ms <= 0) return '0:00';

    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function updateTimerDisplay(player) {
    const zone = $(`.player-zone[data-player="${player}"]`);
    const timeEl = zone.querySelector('.time');
    const time = state.players[player].time;

    timeEl.textContent = formatTime(time);

    // Low time warning (under 30 seconds)
    zone.classList.toggle('low-time', time > 0 && time < 30000);
}

function updateGameUI() {
    // Update mode display
    elements.gameModeDisplay.textContent = state.mode === 'ffa' ? 'Free-for-All' : 'Teams';

    // Update turn indicator
    const currentPlayerIndex = PLAYERS.indexOf(state.currentPlayer);
    const currentName = state.playerNames[currentPlayerIndex];
    elements.turnIndicator.textContent = state.isPaused ? 'PAUSED' : `${currentName}'s Turn`;

    // Update pause button
    elements.pauseBtn.classList.toggle('paused', state.isPaused);
    const pauseIcon = elements.pauseBtn.querySelector('.pause-icon');
    pauseIcon.textContent = state.isPaused ? '▶' : '❚❚';

    // Update player zones
    PLAYERS.forEach(player => {
        const zone = $(`.player-zone[data-player="${player}"]`);
        const data = state.players[player];

        zone.classList.toggle('active', player === state.currentPlayer && !state.isPaused);
        zone.classList.toggle('eliminated', data.eliminated);

        // Update time and score
        zone.querySelector('.time').textContent = formatTime(data.time);
        zone.querySelector('.player-score').textContent = `${data.score} pts`;

        // Update status
        const statusEl = zone.querySelector('.player-status');
        if (data.eliminated) {
            statusEl.textContent = 'ELIMINATED';
        } else if (player === state.currentPlayer && !state.gameStarted) {
            statusEl.textContent = 'TAP TO START';
        } else {
            statusEl.textContent = '';
        }
    });
}

// ============================================
// Scoring Functions
// ============================================

let selectedActionPlayer = null;

function selectActionPlayer(player) {
    selectedActionPlayer = player;
    elements.playerSelectBtns.forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.player === player);
    });
}

function applyAction(action, points) {
    if (!selectedActionPlayer) {
        alert('Please select a player first');
        return;
    }

    // Intercept Checkmate and Stalemate-Other to ask for a victim
    if (action === 'checkmate' || action === 'stalemate-other') {
        showVictimSelection(action, points);
        return;
    }

    const player = selectedActionPlayer;

    // Handle special cases
    if (action === 'stalemate-self') {
        state.players[player].score += points;
        eliminatePlayer(player, 'stalemate');

        state.actionHistory.push({
            type: action,
            player,
            points,
            timestamp: Date.now()
        });

        updateGameUI();
        updateScorePanel();
        updateLogPanel();
        triggerFeedback(null, `+${points}`);
        closeAllPanels();
        return;
    }

    // Standard action processing
    state.players[player].score += points;

    state.actionHistory.push({
        type: action,
        player,
        points,
        timestamp: Date.now()
    });

    updateGameUI();
    updateScorePanel();
    updateLogPanel(); // Add missing updateLogPanel in original code if it wasn't there? It was in original.

    const playerIndex = PLAYERS.indexOf(player);
    const playerName = state.playerNames[playerIndex];

    // Visual Feedback
    triggerFeedback(null, `+${points}`);
}

function applyCapture(piece, points) {
    if (!selectedActionPlayer) {
        alert('Please select a player first');
        return;
    }

    // Visual feedback on the button that was clicked
    // We need to pass the event or find the button. 
    // Since we don't have the event here, we can assume the user just clicked interaction.
    // simpler: just animate "Floating Text" from the center of the panel or relative position.
    // Better: let's update the event listeners to pass the event target. 

    state.players[selectedActionPlayer].score += points;
    state.actionHistory.push({ type: 'capture', player: selectedActionPlayer, piece, points });

    updateGameUI();
    updateScorePanel();
    updateLogPanel();

    const playerIndex = PLAYERS.indexOf(selectedActionPlayer);
    const playerName = state.playerNames[playerIndex];

    triggerFeedback(null, `+${points}`);
}

function applyStatus(status) {
    if (!selectedActionPlayer) {
        alert('Please select a player first');
        return;
    }

    if (status === 'eliminate' || status === 'timeout') {
        eliminatePlayer(selectedActionPlayer, status);
        state.actionHistory.push({ type: status, player: selectedActionPlayer, timestamp: Date.now() });
    }

    updateGameUI();
    updateScorePanel();
    updateLogPanel();
    closeAllPanels();
}

// Global variable to store pending action
let pendingAction = null;

function showVictimSelection(action, points) {
    pendingAction = { type: action, scorer: selectedActionPlayer, points: points };

    // Change Action Panel Content to "Select Player to Eliminate"
    const panelContent = elements.actionPanel.querySelector('.panel-content');

    // Save original content to restore later
    if (!elements.actionPanel.dataset.originalContent) {
        elements.actionPanel.dataset.originalContent = panelContent.innerHTML;
    }

    const scorerName = state.playerNames[PLAYERS.indexOf(selectedActionPlayer)];
    const actionName = action === 'checkmate' ? 'Checkmated' : 'Stalemated';

    panelContent.innerHTML = `
        <div class="action-section">
            <h3>Who did ${scorerName} ${actionName}?</h3>
            <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 0.9rem;">
                Select the player to eliminate.
            </p>
            <div class="player-select victim-select">
                ${PLAYERS.map(p => {
        if (p === selectedActionPlayer || state.players[p].eliminated) return ''; // Can't checkmate self or eliminated
        const pName = state.playerNames[PLAYERS.indexOf(p)];
        // Use dynamic colors from CSS variables? Inline styles for simplicity in this dynamic injection
        let color = '';
        if (p === 'red') color = 'var(--red)';
        if (p === 'blue') color = 'var(--blue)';
        if (p === 'yellow') color = 'var(--yellow)';
        if (p === 'green') color = 'var(--green)';

        return `
                        <button class="player-select-btn victim-btn" 
                                style="background: ${color}; color: ${p === 'yellow' ? '#1a1a2e' : 'white'}; width: 100%; margin-bottom: 8px;"
                                data-victim="${p}">
                            ${pName}
                        </button>
                    `;
    }).join('')}
            </div>
            <button class="secondary-btn" id="cancel-victim-select" style="margin-top: 24px; width: 100%; padding: 16px; background: var(--bg-elevated); border-radius: var(--radius-md);">Cancel</button>
        </div>
    `;

    // Add event listeners for the new buttons
    panelContent.querySelectorAll('.victim-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            handleVictimSelected(btn.dataset.victim);
        });
    });

    panelContent.querySelector('#cancel-victim-select').addEventListener('click', () => {
        // Restore
        panelContent.innerHTML = elements.actionPanel.dataset.originalContent;
        // Re-attach listeners is complicated unless we re-init. 
        // Easier: Just close panel or simple re-init.
        // Actually, destroying innerHTML destroys listeners. We need to handle this better.
        // Better strategy: Hide sections instead of overwriting innerHTML.
        restoreActionPanel();
        closeAllPanels();
    });
}

function handleVictimSelected(victim) {
    if (!pendingAction) return;

    const { type, scorer, points } = pendingAction;

    // 1. Eliminate Victim
    eliminatePlayer(victim, type);

    // 2. Award Points to Scorer
    state.players[scorer].score += points;

    // 3. Special Case: Stalemate Other (Award points to everyone active?)
    if (type === 'stalemate-other') {
        // "Stalemate-other" usually means Scorer caused it.
        // The original logic was: "All active players get 10 points"
        // Let's stick to Scorer gets points (passed in args) + maybe others?
        // The button says "+10 each".
        // Let's give appropriate points.
        // If button says "+10 each", we should give 10 to Scorer, and 10 to others active?
        // Simplify: Just give the points defined in the button to the scorer, or following specific rules.
        // User just asked for "ask who it was and disable".
        // I will stick to giving the Scorer the points in the dataset (which might be 10 or 20).
        // If it's "stalemate-other", typically *everyone remaining* gets 10 pts.
        // Let's iterate and give 10 to everyone except victim?
        if (points === 10) { // Assuming it's the +10 each case
            PLAYERS.forEach(p => {
                if (!state.players[p].eliminated && p !== victim && p !== scorer) {
                    state.players[p].score += 10;
                }
            });
        }
    }

    // Log it
    state.actionHistory.push({
        type: type,
        scorer: scorer,
        victim: victim,
        points: points,
        timestamp: Date.now()
    });

    updateGameUI();
    updateScorePanel();
    updateLogPanel();

    restoreActionPanel();
    closeAllPanels();

    pendingAction = null;
}

function restoreActionPanel() {
    if (elements.actionPanel.dataset.originalContent) {
        elements.actionPanel.querySelector('.panel-content').innerHTML = elements.actionPanel.dataset.originalContent;
        // We MUST re-attach listeners because we nuked the DOM
        setupEventListeners(); // Re-run setup to attach listeners to recreated elements
        // This is a bit heavy but safe. 
    }
}

function triggerFeedback(event, text) {
    // 1. Create Floating Text
    const floater = document.createElement('div');
    floater.textContent = text;
    floater.className = 'floating-score';

    // Position: user click coordinates or element center
    let x, y;
    if (event) {
        x = event.clientX;
        y = event.clientY;
    } else {
        // Fallback to center of action panel if no event
        const panel = document.getElementById('action-panel');
        const rect = panel.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
    }

    floater.style.left = `${x}px`;
    floater.style.top = `${y}px`;

    document.body.appendChild(floater);

    // Cleanup
    setTimeout(() => {
        floater.remove();
    }, 1000);
}

function undoLastAction() {
    if (state.actionHistory.length === 0) return;

    const lastAction = state.actionHistory.pop();

    if (lastAction.type === 'stalemate-other') {
        PLAYERS.forEach(p => {
            if (!state.players[p].eliminated) {
                state.players[p].score -= 10;
            }
        });
    } else if (lastAction.points) {
        state.players[lastAction.player].score -= lastAction.points;
    } else if (lastAction.type === 'eliminate' || lastAction.type === 'timeout') {
        state.players[lastAction.player].eliminated = false;
    }

    updateGameUI();
    updateScorePanel();
}

function showConfirmation(text) {
    // Brief visual feedback
    const btn = elements.actionBtn;
    const originalText = btn.textContent;
    btn.textContent = text;
    setTimeout(() => {
        btn.textContent = originalText;
    }, 800);
}

function updateScorePanel() {
    PLAYERS.forEach((player, index) => {
        const item = $(`.score-item.${player}`);
        item.querySelector('.score-value').textContent = state.players[player].score;

        // Update name in score panel too
        const EmojiMap = { red: '🔴', blue: '🔵', yellow: '🟡', green: '🟢' };
        // Use the current color of the player to determine emoji, or default based on position
        const colorName = state.playerColors[index]; // current color
        // Simple mapping based on original slots or dynamic? Let's just use the position icon
        const icons = ['🔴', '🔵', '🟡', '🟢'];
        item.querySelector('.score-player').textContent = `${icons[index]} ${state.playerNames[index]}`;

        // Also update selection buttons in action panel
        const selectBtn = $(`.player-select-btn.${player}`);
        if (selectBtn) selectBtn.textContent = state.playerNames[index];
    });
}

// ============================================
// Panel Functions
// ============================================

function openPanel(panel) {
    closeAllPanels();

    // If panel is a string (legacy support) or an element
    let panelEl = panel;
    if (typeof panel === 'string') {
        if (panel === 'score') panelEl = elements.scorePanel;
        else if (panel === 'action') panelEl = elements.actionPanel;
        else if (panel === 'menu') panelEl = elements.menuPanel;
    }

    if (panelEl) {
        panelEl.classList.add('active'); // Changed from 'open' to 'active' to match CSS
    }

    // Special logic for action panel initialization
    if (panelEl === elements.actionPanel) {
        selectedActionPlayer = state.currentPlayer;
        selectActionPlayer(selectedActionPlayer);
    }

    // Log panel auto-update is handled by the click listener now

    elements.overlay.classList.add('active');

    if (!state.isPaused && state.gameStarted) {
        togglePause();
    }
}

function closeAllPanels() {
    $$('.panel').forEach(p => p.classList.remove('active'));
    elements.overlay.classList.remove('active');
}

function updateLogPanel() {
    const logList = document.getElementById('game-log-list');
    if (!logList) return;

    if (state.actionHistory.length === 0) {
        logList.innerHTML = '<div class="empty-state">No events yet</div>';
        return;
    }

    // Clone and reverse to show newest first
    const history = [...state.actionHistory].reverse();

    logList.innerHTML = history.map(action => {
        // Find player details
        const pIndex = PLAYERS.indexOf(action.player);
        const name = state.playerNames[pIndex];
        const pointClass = action.points >= 0 ? 'positive' : 'negative';
        const sign = action.points > 0 ? '+' : '';
        const pointsDisplay = action.points !== undefined ? `${sign}${action.points}` : '';

        let details = action.type;
        if (action.type === 'capture') details = `Captured ${action.piece}`;
        if (action.type === 'checkmate') details = 'Checkmate';
        if (action.type === 'check') details = 'Check';
        if (action.type === 'stalemate') details = 'Stalemate';

        // Simple time formatting (relative)
        const date = action.timestamp ? new Date(action.timestamp) : new Date();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="log-item ${action.player}">
                <span class="log-time">${timeStr}</span>
                <div class="log-content">
                    <strong>${name}</strong>: ${details}
                </div>
                <span class="log-points ${pointClass}">${pointsDisplay}</span>
            </div>
        `;
    }).join('');
}

// ============================================
// Reset Functions
// ============================================

function resetClocks() {
    const timeMs = state.timeMinutes * 60 * 1000;

    PLAYERS.forEach(p => {
        state.players[p].time = timeMs;
        state.players[p].eliminated = false;
    });

    state.currentPlayer = 'red';
    state.isRunning = false;
    state.isPaused = true;
    state.gameStarted = false;
    stopTimer();

    closeAllPanels();
    updateGameUI();
}

function resetScores() {
    PLAYERS.forEach(p => {
        state.players[p].score = 0;
    });

    state.actionHistory = [];

    closeAllPanels();
    updateGameUI();
    updateScorePanel();
    updateLogPanel();
}

// ============================================
// Start App
// ============================================

document.addEventListener('DOMContentLoaded', init);
