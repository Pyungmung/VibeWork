const ROWS = 8;
const COLS = 6;
const TARGET_SUM = 10;
const POINTS_PER_APPLE = 2;

const boardElement = document.querySelector('#gameBoard');
const scoreElement = document.querySelector('#scoreValue');
const sumElement = document.querySelector('#sumValue');
const sumCardElement = document.querySelector('#sumCard');
const statusElement = document.querySelector('#statusMessage');
const restartButton = document.querySelector('#restartButton');

const gameState = {
  board: [],
  score: 0,
  selected: [],
  selectedSum: 0,
  isPointerDown: false,
  isBusy: false,
  effects: new Map()
};

function randomApple() {
  return Math.floor(Math.random() * 9) + 1;
}

function createBoard() {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, randomApple)
  );
}

function keyFor(row, column) {
  return `${row}-${column}`;
}

function isAdjacent(first, second) {
  const rowDistance = Math.abs(first.row - second.row);
  const columnDistance = Math.abs(first.column - second.column);
  return rowDistance + columnDistance === 1;
}

function isSelected(row, column) {
  return gameState.selected.some((tile) => tile.row === row && tile.column === column);
}

function renderBoard() {
  const fragment = document.createDocumentFragment();

  gameState.board.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      const tile = document.createElement('button');
      const tileKey = keyFor(rowIndex, columnIndex);
      const effect = gameState.effects.get(tileKey);
      const selected = isSelected(rowIndex, columnIndex);

      tile.className = 'apple-tile';
      tile.type = 'button';
      tile.dataset.row = rowIndex;
      tile.dataset.column = columnIndex;
      tile.setAttribute('role', 'gridcell');
      tile.setAttribute('aria-label', `${rowIndex + 1}행 ${columnIndex + 1}열, 숫자 ${value} 사과`);
      tile.innerHTML = `<span class="apple-number">${value}</span>`;

      if (selected) {
        tile.classList.add('selected');
        tile.setAttribute('aria-pressed', 'true');
      } else {
        tile.setAttribute('aria-pressed', 'false');
      }

      if (effect) {
        tile.classList.add(effect.type);
        tile.style.setProperty('--drop-delay', `${effect.delay}ms`);
      }

      fragment.append(tile);
    });
  });

  boardElement.replaceChildren(fragment);
  updateScoreboard();
}

function updateScoreboard() {
  scoreElement.textContent = gameState.score;
  sumElement.textContent = gameState.selectedSum;
  sumCardElement.classList.toggle('is-ready', gameState.selectedSum === TARGET_SUM);
}

function setStatus(message) {
  statusElement.textContent = message;
}

function clearSelection() {
  gameState.selected = [];
  gameState.selectedSum = 0;
  renderBoard();
}

function getTileFromPoint(event) {
  const tile = document.elementFromPoint(event.clientX, event.clientY)?.closest('.apple-tile');
  if (!tile || !boardElement.contains(tile)) {
    return null;
  }

  return {
    row: Number(tile.dataset.row),
    column: Number(tile.dataset.column)
  };
}

function addTileToSelection(tile) {
  if (!tile || isSelected(tile.row, tile.column)) {
    return;
  }

  const previousTile = gameState.selected.at(-1);
  if (previousTile && !isAdjacent(previousTile, tile)) {
    return;
  }

  const value = gameState.board[tile.row][tile.column];
  const nextSum = gameState.selectedSum + value;

  if (nextSum > TARGET_SUM) {
    gameState.isPointerDown = false;
    clearSelection();
    setStatus('10을 넘었어요. 다시 연결해보세요.');
    return;
  }

  gameState.selected.push(tile);
  gameState.selectedSum = nextSum;
  renderBoard();

  if (nextSum === TARGET_SUM) {
    completeSelection();
  } else {
    setStatus(`${gameState.selected.length}개 연결 · 합계 ${nextSum}`);
  }
}

function completeSelection() {
  const removedCount = gameState.selected.length;
  const removedKeys = new Set(gameState.selected.map((tile) => keyFor(tile.row, tile.column)));

  gameState.isPointerDown = false;
  gameState.isBusy = true;
  gameState.score += removedCount * POINTS_PER_APPLE;
  setStatus(`${removedCount}개 수확! +${removedCount * POINTS_PER_APPLE}점`);

  const nextBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  gameState.effects = new Map();

  for (let column = 0; column < COLS; column += 1) {
    const survivors = [];
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (!removedKeys.has(keyFor(row, column))) {
        survivors.push({ value: gameState.board[row][column], originalRow: row });
      }
    }

    let destinationRow = ROWS - 1;
    survivors.forEach(({ value, originalRow }) => {
      nextBoard[destinationRow][column] = value;
      const dropDistance = destinationRow - originalRow;
      if (dropDistance > 0) {
        gameState.effects.set(keyFor(destinationRow, column), {
          type: 'is-settling',
          delay: Math.min(dropDistance * 45, 180)
        });
      }
      destinationRow -= 1;
    });

    while (destinationRow >= 0) {
      nextBoard[destinationRow][column] = randomApple();
      gameState.effects.set(keyFor(destinationRow, column), {
        type: 'is-new',
        delay: Math.min((destinationRow + 1) * 45, 180)
      });
      destinationRow -= 1;
    }
  }

  gameState.board = nextBoard;
  gameState.selected = [];
  gameState.selectedSum = 0;
  renderBoard();

  window.setTimeout(() => {
    gameState.isBusy = false;
    gameState.effects.clear();
    renderBoard();
    setStatus('사과를 길게 눌러 연결하세요');
  }, 570);
}

function finishPointerSelection() {
  if (!gameState.isPointerDown || gameState.isBusy) {
    return;
  }

  gameState.isPointerDown = false;
  if (gameState.selectedSum !== TARGET_SUM) {
    clearSelection();
    setStatus('합이 10이 되도록 연결하세요.');
  }
}

function handlePointerDown(event) {
  if (gameState.isBusy) {
    return;
  }

  const tile = getTileFromPoint(event);
  if (!tile) {
    return;
  }

  event.preventDefault();
  gameState.isPointerDown = true;
  boardElement.setPointerCapture?.(event.pointerId);
  addTileToSelection(tile);
}

function handlePointerMove(event) {
  if (!gameState.isPointerDown || gameState.isBusy) {
    return;
  }

  event.preventDefault();
  addTileToSelection(getTileFromPoint(event));
}

function restartGame() {
  gameState.board = createBoard();
  gameState.score = 0;
  gameState.selected = [];
  gameState.selectedSum = 0;
  gameState.isPointerDown = false;
  gameState.isBusy = false;
  gameState.effects = new Map();
  renderBoard();
  setStatus('사과를 길게 눌러 연결하세요');
}

boardElement.addEventListener('pointerdown', handlePointerDown);
boardElement.addEventListener('pointermove', handlePointerMove);
boardElement.addEventListener('pointerup', finishPointerSelection);
boardElement.addEventListener('pointercancel', finishPointerSelection);
boardElement.addEventListener('lostpointercapture', finishPointerSelection);
restartButton.addEventListener('click', restartGame);

restartGame();
