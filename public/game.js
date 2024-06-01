document.addEventListener('DOMContentLoaded', () => {
    const socket = new WebSocket(`ws://${window.location.host}`);
    let playerNumber;
    let gameState;
    let selectedMonster = null;

    const gameBoard = document.getElementById('game-board');
    const currentTurnDisplay = document.getElementById('current-turn');
    const playerMonstersDisplay = document.getElementById('player-monsters');
    const playerWinsDisplay = document.getElementById('player-wins');
    const gameCountDisplay = document.getElementById('game-count');
    const endTurnBtn = document.getElementById('end-turn-btn');

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        switch (data.type) {
            case 'playerNumber':
                initializePlayer(data.playerNumber);
                break;
            case 'gameState':
                updateGameState(data.gameState);
                break;
        }
    };

    function initializePlayer(number) {
        playerNumber = number;
        updatePlayerStats();
        startNewGame();
    }

    function updatePlayerStats() {
        const playerColors = ['rgb(189, 28, 28)', 'rgb(176, 238, 7)', 'rgb(0, 255, 0)', 'rgb(0, 0, 255)'];
        document.getElementById('player-stats').style.color = playerColors[playerNumber - 1];
    }

    function startNewGame() {
        gameState = {
            currentTurn: 1,
            playerMonsters: [[], [], [], []],
            grid: Array.from({ length: 10 }, () => Array(10).fill(null)),
            hasPlacedMonster: false,
            newlyPlacedMonster: null,
            movedMonsters: new Set(),
            gameInProgress: true,
            firstRound: true // Property to track the first round
        };
        updateBoard();
    }

    function placeMonster(row, col) {
        socket.send(JSON.stringify({ type: 'placeMonster', row, col }));
    }

    function moveMonster(startRow, startCol, endRow, endCol) {
        socket.send(JSON.stringify({ type: 'moveMonster', startRow, startCol, endRow, endCol }));
    }

    function endTurn() {
        socket.send(JSON.stringify({ type: 'endTurn' }));
    }

    function updateGameState(state) {
        gameState = state;
        updateBoard();
        updateDisplays();
    }

    function updateBoard() {
        gameBoard.innerHTML = ''; // Clear the board before updating
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                const cell = document.createElement('div');
                cell.dataset.row = i;
                cell.dataset.col = j;
                const monster = gameState.grid[i][j];
                if (monster) {
                    cell.innerHTML = `<img src="images/${monster.type}.jpg" alt="${monster.type}" class="monster-image ${monster.player}">`;
                    cell.className = `texture${(i + j) % 5 + 1}`;
                    cell.classList.add(monster.player);
                } else {
                    cell.className = `texture${(i + j) % 5 + 1}`;
                }
                gameBoard.appendChild(cell);
            }
        }
    }

    function updateDisplays() {
        currentTurnDisplay.textContent = `Player ${gameState.currentTurn}`;
        playerMonstersDisplay.textContent = gameState.playerMonsters[playerNumber - 1].length;
        playerWinsDisplay.textContent = gameState.wins ? gameState.wins[playerNumber - 1] : 0;
        gameCountDisplay.textContent = gameState.gameCount;
    }

    endTurnBtn.addEventListener('click', endTurn);
    gameBoard.addEventListener('click', handleCellClick);

    function handleCellClick(event) {
        const cell = event.target.closest('div[data-row]');
        if (!cell || !gameState.gameInProgress) return;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (selectedMonster) {
            moveMonster(selectedMonster.row, selectedMonster.col, row, col);
            selectedMonster = null;
        } else {
            if (gameState.grid[row][col] && gameState.grid[row][col].player === `player${playerNumber}`) {
                if (gameState.newlyPlacedMonster && gameState.newlyPlacedMonster.row === row && gameState.newlyPlacedMonster.col === col) {
                    return;
                }
                selectedMonster = { row, col };
            } else {
                if (!gameState.hasPlacedMonster && isValidPlacement(row, col)) {
                    placeMonster(row, col);
                }
            }
        }
    }

    function isValidPlacement(row, col) {
        if (playerNumber === 1 && col !== 0) return false;
        if (playerNumber === 2 && col !== 9) return false;
        if (playerNumber === 3 && row !== 0) return false;
        if (playerNumber === 4 && row !== 9) return false;
        return gameState.grid[row][col] === null;
    }
});
