const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let players = [];
let gameState = {
    gameCount: 0,
    currentTurn: 1,
    turnCount: 0,
    playerMonsters: [[], [], [], []],
    eliminations: [0, 0, 0, 0],
    eliminatedPlayers: [false, false, false, false], // Track eliminated players
    grid: Array.from({ length: 10 }, () => Array(10).fill(null)),
    playersOrder: [1, 2, 3, 4],
    hasPlacedMonster: false,
    movedMonsters: new Set(),
    newlyPlacedMonster: null,
    gameInProgress: true,
    wins: [0, 0, 0, 0],
    firstRound: true, // Property to track the first round
    monstersPlacedThisRound: [0, 0, 0, 0] // Track monsters placed by each player in the current round
};

wss.on('connection', (ws) => {
    if (players.length < 4) {
        players.push(ws);
        const playerNumber = players.length;
        ws.send(JSON.stringify({ type: 'playerNumber', playerNumber }));

        ws.on('message', (message) => {
            const data = JSON.parse(message);
            handleClientMessage(ws, data, playerNumber);
        });

        ws.on('close', () => {
            players = players.filter(player => player !== ws);
        });
    } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Game is full' }));
        ws.close();
    }
});

function handleClientMessage(ws, data, playerNumber) {
    if (playerNumber !== gameState.currentTurn) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not your turn' }));
        return;
    }
    if (gameState.eliminatedPlayers[playerNumber - 1]) {
        ws.send(JSON.stringify({ type: 'error', message: 'You are eliminated' }));
        return;
    }

    switch (data.type) {
        case 'placeMonster':
            placeMonster(data.row, data.col, playerNumber);
            break;
        case 'moveMonster':
            moveMonster(data.startRow, data.startCol, data.endRow, data.endCol, playerNumber);
            break;
        case 'endTurn':
            endTurn();
            break;
    }
    broadcastGameState();
}

function broadcastGameState() {
    const state = JSON.stringify({ type: 'gameState', gameState });
    players.forEach(player => player.send(state));
}

function determinePlayersOrder() {
    const playerCounts = gameState.playerMonsters.map(monsters => monsters.length);
    const minCount = Math.min(...playerCounts.filter((count, index) => !gameState.eliminatedPlayers[index]));
    const playersWithMinCount = gameState.playersOrder.filter((_, index) => playerCounts[index] === minCount && !gameState.eliminatedPlayers[index]);
    const startPlayer = playersWithMinCount[Math.floor(Math.random() * playersWithMinCount.length)];

    const remainingPlayers = gameState.playersOrder.filter(player => player !== startPlayer && !gameState.eliminatedPlayers[player - 1]);
    gameState.playersOrder = [startPlayer, ...remainingPlayers];
}

function placeMonster(row, col, playerNumber) {
    if (gameState.grid[row][col] !== null) return;
    if (gameState.monstersPlacedThisRound[playerNumber - 1] >= 1) return; // Ensure the player places only one monster per round

    const monster = {
        type: getRandomMonster(),
        player: `player${playerNumber}`,
        row: row,
        col: col
    };

    gameState.grid[row][col] = monster;
    gameState.playerMonsters[playerNumber - 1].push(monster);
    gameState.monstersPlacedThisRound[playerNumber - 1]++;
    gameState.hasPlacedMonster = true;
    gameState.newlyPlacedMonster = monster;
    checkEndTurnCondition();
}

function moveMonster(startRow, startCol, endRow, endCol, playerNumber) {
    if (!isValidMove(startRow, startCol, endRow, endCol)) return;

    const movingMonster = gameState.grid[startRow][startCol];
    if (gameState.movedMonsters.has(movingMonster)) return;

    const targetCell = gameState.grid[endRow][endCol];
    if (targetCell) {
        if (targetCell.player === movingMonster.player) return;
        resolveConflict(movingMonster, targetCell, startRow, startCol, endRow, endCol);
    } else {
        gameState.grid[startRow][startCol] = null;
        gameState.grid[endRow][endCol] = movingMonster;
    }

    gameState.movedMonsters.add(movingMonster);
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
        gameState.grid[endRow][endCol] = movingMonster;
        gameState.grid[startRow][startCol] = null;
    } else if (outcome === 'removeMoving') {
        removeMonster(startRow, startCol, movingMonster);
    } else {
        removeMonster(startRow, startCol, movingMonster);
        removeMonster(endRow, endCol, targetMonster);
    }
    checkEndTurnCondition();
}

function removeMonster(row, col, monster) {
    const playerIndex = parseInt(monster.player.replace('player', '')) - 1;
    gameState.playerMonsters[playerIndex] = gameState.playerMonsters[playerIndex].filter(m => m !== monster);
    gameState.eliminations[playerIndex]++;
    gameState.grid[row][col] = null;
}

function checkEndTurnCondition() {
    if (!gameState.gameInProgress) return;

    if (gameState.firstRound) {
        const allPlayersPlaced = gameState.playerMonsters.every(monsters => monsters.length > 0);
        if (allPlayersPlaced) {
            gameState.firstRound = false;
            determinePlayersOrder(); // Determine the order for the second round
            resetMonstersPlacedThisRound(); // Reset the counter for the next round
        } else {
            endTurn();
            return;
        }
    } else {
        const allPlayersPlaced = gameState.monstersPlacedThisRound.every(count => count > 0);
        if (allPlayersPlaced) {
            resetMonstersPlacedThisRound(); // Reset the counter for the next round
        }

        // Eliminate players with no monsters
        for (let i = 0; i < 4; i++) {
            if (!gameState.eliminatedPlayers[i] && gameState.playerMonsters[i].length === 0) {
                gameState.eliminatedPlayers[i] = true;
                console.log(`Player ${i + 1} has been eliminated.`);
            }
        }

        // Check if only one player remains with monsters
        const activePlayers = gameState.eliminatedPlayers.filter(eliminated => !eliminated);
        if (activePlayers.length === 1) {
            const winnerIndex = gameState.eliminatedPlayers.findIndex(eliminated => !eliminated);
            endGame(`player${winnerIndex + 1}`);
            return;
        }
    }

    if (gameState.hasPlacedMonster) {
        endTurn();
    }
}

function endGame(winningPlayer) {
    gameState.gameInProgress = false;
    gameState.gameCount++;
    const winnerIndex = parseInt(winningPlayer.replace('player', '')) - 1;
    gameState.wins[winnerIndex]++;
    console.log(`${winningPlayer} wins!`);
    broadcastGameState();
    setTimeout(startNewGame, 2000);
}

function endTurn() {
    gameState.hasPlacedMonster = false;
    gameState.newlyPlacedMonster = null;
    gameState.movedMonsters.clear();
    do {
        gameState.turnCount++;
        gameState.currentTurn = gameState.playersOrder[gameState.turnCount % 4];
    } while (gameState.eliminatedPlayers[gameState.currentTurn - 1] && gameState.turnCount < 100);
    broadcastGameState();
}

function resetMonstersPlacedThisRound() {
    gameState.monstersPlacedThisRound = [0, 0, 0, 0];
}

function getRandomMonster() {
    const monsters = ['vampire', 'werewolf', 'ghost'];
    return monsters[Math.floor(Math.random() * monsters.length)];
}

function startNewGame() {
    gameState.gameInProgress = true;
    gameState.grid = Array.from({ length: 10 }, () => Array(10).fill(null));
    gameState.playerMonsters = [[], [], [], []];
    gameState.eliminations = [0, 0, 0, 0];
    gameState.eliminatedPlayers = [false, false, false, false]; // Reset eliminated players
    gameState.turnCount = 0;
    gameState.firstRound = true; // Reset first round
    gameState.playersOrder = [1, 2, 3, 4]; // Reset player order
    gameState.currentTurn = gameState.playersOrder[Math.floor(Math.random() * 4)]; // Randomly select the first player
    gameState.hasPlacedMonster = false;
    gameState.newlyPlacedMonster = null;
    gameState.movedMonsters.clear();
    resetMonstersPlacedThisRound(); // Reset the counter for the new game
    broadcastGameState();
}

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
