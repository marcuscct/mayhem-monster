// game.js

document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const currentTurnDisplay = document.getElementById('current-turn');
    const player1MonstersDisplay = document.getElementById('player1-monsters');
    const player2MonstersDisplay = document.getElementById('player2-monsters');
    const gameCountDisplay = document.getElementById('game-count');
    const player1WinsDisplay = document.getElementById('player1-wins');
    const player2WinsDisplay = document.getElementById('player2-wins');

    let gameCount = 0;
    let player1Wins = 0;
    let player2Wins = 0;
    let currentTurn = 1;
    let player1Monsters = [];
    let player2Monsters = [];
    let grid = Array.from({ length: 10 }, () => Array(10).fill(null));

    function initializeBoard() {
        gameBoard.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                const cell = document.createElement('div');
                cell.dataset.row = i;
                cell.dataset.col = j;
                gameBoard.appendChild(cell);
            }
        }
    }

    function startNewGame() {
        grid = Array.from({ length: 10 }, () => Array(10).fill(null));
        player1Monsters = [];
        player2Monsters = [];
        currentTurn = 1;
        updateDisplays();
        initializeBoard();
    }

    function updateDisplays() {
        currentTurnDisplay.textContent = `Current Turn: Player ${currentTurn}`;
        player1MonstersDisplay.textContent = player1Monsters.length;
        player2MonstersDisplay.textContent = player2Monsters.length;
        gameCountDisplay.textContent = gameCount;
        player1WinsDisplay.textContent = player1Wins;
        player2WinsDisplay.textContent = player2Wins;
    }

    function handleCellClick(event) {
        const cell = event.target;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (currentTurn === 1 && col === 0) {
            placeMonster(row, col, 'player1');
        } else if (currentTurn === 2 && col === 9) {
            placeMonster(row, col, 'player2');
        }
    }

    function placeMonster(row, col, player) {
        if (grid[row][col] !== null) return;

        const monster = {
            type: getRandomMonster(),
            player: player
        };

        grid[row][col] = monster;
        updateBoard();
        if (player === 'player1') {
            player1Monsters.push(monster);
        } else {
            player2Monsters.push(monster);
        }

        endTurn();
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
                    cell.textContent = monster.type.charAt(0).toUpperCase();
                    cell.className = monster.type;
                } else {
                    cell.textContent = '';
                    cell.className = '';
                }
            }
        }
    }

    function endTurn() {
        currentTurn = currentTurn === 1 ? 2 : 1;
        updateDisplays();
    }

    gameBoard.addEventListener('click', handleCellClick);
    startNewGame();
});
