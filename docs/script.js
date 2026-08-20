const FOOD_EMOJIS = ['🍎', '🍕', '🍔', '🍟', '🌭', '🍿', '🍩', '🍪', '🍰', '🍉', '🍓', '🍌', '🍇', '🍒', '🥕', '🌽', '🍣', '🍙', '🍜', '🍦'];
const TOTAL_PAIRS = 24;
const MATCH_SCORE = 2;
const WRONG_REVEAL_TIME = 650;

const boardElement = document.querySelector('#gameBoard');
const scoreElement = document.querySelector('#scoreValue');
const matchesElement = document.querySelector('#matchesValue');
const attemptsElement = document.querySelector('#attemptsValue');
const statusElement = document.querySelector('#statusMessage');
const restartButton = document.querySelector('#restartButton');
const playAgainButton = document.querySelector('#playAgainButton');
const resultOverlay = document.querySelector('#resultOverlay');
const finalScoreElement = document.querySelector('#finalScore');
const finalAttemptsElement = document.querySelector('#finalAttempts');

const gameState = {
  cards: [],
  selectedIds: [],
  score: 0,
  matches: 0,
  attempts: 0,
  isLocked: false,
  isDragging: false,
  isComplete: false,
  wrongTimer: null
};

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function createCardValues() {
  const pairValues = [];
  for (let pairIndex = 0; pairIndex < TOTAL_PAIRS; pairIndex += 1) {
    pairValues.push(FOOD_EMOJIS[pairIndex % FOOD_EMOJIS.length]);
  }
  return shuffle([...pairValues, ...pairValues]);
}

function createNewGame() {
  clearTimeout(gameState.wrongTimer);
  gameState.cards = createCardValues().map((emoji, index) => ({
    id: index,
    emoji,
    matched: false
  }));
  gameState.selectedIds = [];
  gameState.score = 0;
  gameState.matches = 0;
  gameState.attempts = 0;
  gameState.isLocked = false;
  gameState.isDragging = false;
  gameState.isComplete = false;
  resultOverlay.classList.remove('is-visible');
  resultOverlay.setAttribute('aria-hidden', 'true');
  renderBoard();
  updateScoreboard();
  setStatus('카드 두 장을 골라보세요.');
}

function renderBoard() {
  boardElement.replaceChildren();
  gameState.cards.forEach((card) => {
    const cardElement = document.createElement('button');
    cardElement.type = 'button';
    cardElement.className = 'food-card';
    cardElement.dataset.cardId = card.id;
    cardElement.setAttribute('role', 'gridcell');
    cardElement.setAttribute('aria-label', `음식 이모지 카드 ${card.id + 1}`);
    cardElement.innerHTML = `<span class="emoji" aria-hidden="true">${card.emoji}</span>`;
    cardElement.addEventListener('pointerdown', handlePointerDown);
    cardElement.addEventListener('pointerenter', handlePointerEnter);
    cardElement.addEventListener('keydown', handleKeyDown);
    boardElement.append(cardElement);
  });
}

function updateScoreboard() {
  scoreElement.textContent = gameState.score;
  matchesElement.textContent = gameState.matches;
  attemptsElement.textContent = gameState.attempts;
}

function setStatus(message) {
  statusElement.textContent = message;
}

function getCardById(cardId) {
  return gameState.cards.find((card) => card.id === cardId);
}

function getCardElement(cardId) {
  return boardElement.querySelector(`[data-card-id="${cardId}"]`);
}

function selectCard(cardId) {
  if (gameState.isLocked || gameState.isComplete) return;
  const card = getCardById(cardId);
  if (!card || card.matched) return;

  if (gameState.selectedIds.includes(cardId)) {
    if (gameState.selectedIds.length === 1) {
      gameState.selectedIds = [];
      getCardElement(cardId)?.classList.remove('is-selected');
      setStatus('선택을 취소했어요.');
    }
    return;
  }

  if (gameState.selectedIds.length >= 2) return;
  gameState.selectedIds.push(cardId);
  getCardElement(cardId)?.classList.add('is-selected');

  if (gameState.selectedIds.length === 1) {
    setStatus('두 번째 카드를 골라보세요.');
  } else {
    gameState.attempts += 1;
    updateScoreboard();
    compareSelectedCards();
  }
}

function handlePointerDown(event) {
  if (gameState.isLocked || gameState.isComplete) return;
  event.preventDefault();
  gameState.isDragging = true;
  event.currentTarget.setPointerCapture?.(event.pointerId);
  selectCard(Number(event.currentTarget.dataset.cardId));
}

function handlePointerEnter(event) {
  if (!gameState.isDragging || gameState.isLocked || gameState.selectedIds.length !== 1) return;
  selectCard(Number(event.currentTarget.dataset.cardId));
}

function handlePointerUp() {
  if (!gameState.isDragging) return;
  gameState.isDragging = false;
  if (gameState.selectedIds.length === 2 && !gameState.isLocked) {
    compareSelectedCards();
  }
}

function handleKeyDown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  selectCard(Number(event.currentTarget.dataset.cardId));
}

function compareSelectedCards() {
  if (gameState.selectedIds.length !== 2 || gameState.isLocked) return;
  gameState.isLocked = true;
  const [firstId, secondId] = gameState.selectedIds;
  const firstCard = getCardById(firstId);
  const secondCard = getCardById(secondId);
  const firstElement = getCardElement(firstId);
  const secondElement = getCardElement(secondId);

  if (firstCard.emoji === secondCard.emoji) {
    firstCard.matched = true;
    secondCard.matched = true;
    gameState.score += MATCH_SCORE;
    gameState.matches += 1;
    firstElement?.classList.add('is-matched');
    secondElement?.classList.add('is-matched');
    setStatus('정답이에요! 맛있는 한 쌍을 찾았어요.');
    gameState.selectedIds = [];
    gameState.isLocked = false;
    updateScoreboard();
    checkForCompletion();
    return;
  }

  firstElement?.classList.add('is-wrong');
  secondElement?.classList.add('is-wrong');
  setStatus('아쉽지만 다른 음식이에요.');
  gameState.wrongTimer = window.setTimeout(() => {
    firstElement?.classList.remove('is-selected', 'is-wrong');
    secondElement?.classList.remove('is-selected', 'is-wrong');
    gameState.selectedIds = [];
    gameState.isLocked = false;
    setStatus('다시 두 장을 골라보세요.');
  }, WRONG_REVEAL_TIME);
}

function checkForCompletion() {
  if (gameState.matches !== TOTAL_PAIRS) return;
  gameState.isComplete = true;
  finalScoreElement.textContent = gameState.score;
  finalAttemptsElement.textContent = gameState.attempts;
  window.setTimeout(() => {
    resultOverlay.classList.add('is-visible');
    resultOverlay.setAttribute('aria-hidden', 'false');
  }, 420);
}

boardElement.addEventListener('pointerup', handlePointerUp);
boardElement.addEventListener('pointercancel', () => {
  gameState.isDragging = false;
});
restartButton.addEventListener('click', createNewGame);
playAgainButton.addEventListener('click', createNewGame);

createNewGame();
