

document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const currentTurnDisplay = document.getElementById('current-turn');
    const player1MonstersDisplay = document.getElementById('player1-monsters');
    const player2MonstersDisplay = document.getElementById('player2-monsters');
    const gameCountDisplay = document.getElementById('game-count');
    const player1WinsDisplay = document.getElementById('player1-wins');
    const player2WinsDisplay = document.getElementById('player2-wins');
    const endTurnBtn = document.getElementById('end-turn-btn');

    let gameCount = 0;
    let player1Wins = 0;
    let player2Wins = 0;
    let currentTurn = 1;
    let turnCount = 0;
    let selectedMonster = null;
    let player1Monsters = [];
    let player2Monsters = [];
    let player1Eliminations = 0;
    let player2Eliminations = 0;
    let grid = Array.from({ length: 10 }, () => Array(10).fill(null));
    let playersOrder = [1, 2];
    let hasPlacedMonster = false;
    let movedMonsters = new Set();
    let newlyPlacedMonster = null;
    let gameInProgress = true;

    const textures = ['texture1', 'texture2', 'texture3', 'texture4', 'texture5'];

    function initializeBoard() {
        gameBoard.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                const cell = document.createElement('div');
                cell.dataset.row = i;
                cell.dataset.col = j;
                const randomTexture = textures[Math.floor(Math.random() * textures.length)];
                cell.classList.add(randomTexture);
                gameBoard.appendChild(cell);
            }
        }
    }

    function startNewGame() {
        gameInProgress = true;
        grid = Array.from({ length: 10 }, () => Array(10).fill(null));
        player1Monsters = [];
        player2Monsters = [];
        player1Eliminations = 0;
        player2Eliminations = 0;
        turnCount = 0;
        determinePlayersOrder();
        currentTurn = playersOrder[0];
        hasPlacedMonster = false;
        newlyPlacedMonster = null;
        movedMonsters.clear();
        updateDisplays();
        initializeBoard();
    }

    function determinePlayersOrder() {
        const player1Count = player1Monsters.length;
        const player2Count = player2Monsters.length;

        if (player1Count < player2Count) {
            playersOrder = [1, 2];
        } else if (player2Count < player1Count) {
            playersOrder = [2, 1];
        } else {
            playersOrder = Math.random() < 0.5 ? [1, 2] : [2, 1];
        }
    }

    function updateDisplays() {
        currentTurnDisplay.textContent = `Player ${currentTurn}`;
        player1MonstersDisplay.textContent = player1Monsters.length;
        player2MonstersDisplay.textContent = player2Monsters.length;
        gameCountDisplay.textContent = gameCount;
        player1WinsDisplay.textContent = player1Wins;
        player2WinsDisplay.textContent = player2Wins;
    }

    function handleCellClick(event) {
        const cell = event.target.closest('div[data-row]');
        if (!cell || !gameInProgress) return;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (selectedMonster) {
            moveMonster(selectedMonster.row, selectedMonster.col, row, col);
            selectedMonster = null;
        } else {
            if (grid[row][col] && grid[row][col].player === `player${currentTurn}`) {
                if (newlyPlacedMonster && newlyPlacedMonster.row === row && newlyPlacedMonster.col === col) {
                    return;
                }
                selectedMonster = { row, col };
            } else {
                if (!hasPlacedMonster && isValidPlacement(row, col)) {
                    placeMonster(row, col, `player${currentTurn}`);
                }
            }
        }
    }

    function isValidPlacement(row, col) {
        if (currentTurn === 1 && col !== 0) return false;
        if (currentTurn === 2 && col !== 9) return false;
        return grid[row][col] === null;
    }

    function placeMonster(row, col, player) {
        if (grid[row][col] !== null) return;

        const monster = {
            type: getRandomMonster(),
            player: player,
            row: row,
            col: col
        };

        grid[row][col] = monster;
        updateBoard();
        if (player === 'player1') {
            player1Monsters.push(monster);
        } else {
            player2Monsters.push(monster);
        }

        hasPlacedMonster = true;
        newlyPlacedMonster = monster;
        checkEndTurnCondition();
    }

    function moveMonster(startRow, startCol, endRow, endCol) {
        if (!isValidMove(startRow, startCol, endRow, endCol)) return;

        const movingMonster = grid[startRow][startCol];

        if (movedMonsters.has(movingMonster)) return;

        const targetCell = grid[endRow][endCol];

        if (targetCell) {
            if (targetCell.player === movingMonster.player) return;
            resolveConflict(movingMonster, targetCell, startRow, startCol, endRow, endCol);
        } else {
            grid[startRow][startCol] = null;
            grid[endRow][endCol] = movingMonster;
        }

        movedMonsters.add(movingMonster);
        updateBoard();
        checkEndTurnCondition();
    }

    function isValidMove(startRow, startCol, endRow, endCol) {
        if (startRow === endRow && startCol === endCol) return false;
        const rowDiff = Math.abs(endRow - startRow);
        const colDiff = Math.abs(endCol - startCol);

        return (rowDiff === 0 || colDiff === 0 || (rowDiff === colDiff && rowDiff <= 2));
    }

    function resolveConflict(movingMonster, targetMonster, startRow, startCol, endRow, endCol) {
        const outcomes = {
            'vampire': { 'werewolf': 'removeTarget', 'ghost': 'removeMoving' },
            'werewolf': { 'ghost': 'removeTarget', 'vampire': 'removeMoving' },
            'ghost': { 'vampire': 'removeTarget', 'werewolf': 'removeMoving' }
        };

        const outcome = outcomes[movingMonster.type][targetMonster.type];

        if (outcome === 'removeTarget') {
            removeMonster(endRow, endCol, targetMonster);
            grid[endRow][endCol] = movingMonster;
            grid[startRow][startCol] = null;
        } else if (outcome === 'removeMoving') {
            removeMonster(startRow, startCol, movingMonster);
        } else {
            removeMonster(startRow, startCol, movingMonster);
            removeMonster(endRow, endCol, targetMonster);
        }

        updateBoard();
        checkEndTurnCondition();
    }

    function removeMonster(row, col, monster) {
        if (monster.player === 'player1') {
            player1Monsters = player1Monsters.filter(m => m !== monster);
            player1Eliminations++;
            if (player1Eliminations >= 10) {
                endGame('player2');
                return;
            }
        } else {
            player2Monsters = player2Monsters.filter(m => m !== monster);
            player2Eliminations++;
            if (player2Eliminations >= 10) {
                endGame('player1');
                return;
            }
        }
        grid[row][col] = null;
        updateDisplays();
    }

    function getRandomMonster() {
        const monsters = ['vampire', 'werewolf', 'ghost'];
        return monsters[Math.floor(Math.random() * monsters.length)];
    }

    function updateBoard() {
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                const cell = gameBoard.querySelector(`div[data-row="${i}"][data-col="${j}"]`);
                const monster = grid[i][j];
                if (monster) {
                    cell.innerHTML = `<img src="images/${monster.type}.jpg" alt="${monster.type}" class="monster-image ${monster.player}">`;
                    cell.className = cell.className.replace(/\b(player1|player2)\b/g, '').trim();
                    cell.classList.add(monster.player);
                } else {
                    cell.innerHTML = '';
                    cell.className = cell.className.replace(/\b(player1|player2)\b/g, '').trim();
                }
            }
        }
    }

    function checkEndTurnCondition() {
        if (!gameInProgress) return;

        if (turnCount > 0) {
            if (player1Monsters.length === 0) {
                endGame('player2');
                return;
            } else if (player2Monsters.length === 0) {
                endGame('player1');
                return;
            }
        }

        if (hasPlacedMonster || (currentTurn === 1 && player1Monsters.length === 0) || (currentTurn === 2 && player2Monsters.length === 0)) {
            endTurn();
        }
    }

    function endGame(winningPlayer) {
        gameInProgress = false;
        gameCount++;
        if (winningPlayer === 'player1') {
            player1Wins++;
            alert('Player 2 has been eliminated! Player 1 wins!');
        } else {
            player2Wins++;
            alert('Player 1 has been eliminated! Player 2 wins!');
        }
        updateDisplays();
        setTimeout(startNewGame, 2000);
    }

    function endTurn() {
        hasPlacedMonster = false;
        newlyPlacedMonster = null;
        movedMonsters.clear();
        turnCount++;
        if (currentTurn === playersOrder[0]) {
            currentTurn = playersOrder[1];
        } else {
            currentTurn = playersOrder[0];
            determinePlayersOrder();
        }
        updateDisplays();
    }

    endTurnBtn.addEventListener('click', endTurn);
    gameBoard.addEventListener('click', handleCellClick);
    startNewGame();
});
