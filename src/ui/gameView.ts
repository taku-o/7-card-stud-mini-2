import type { EngineState, PlayerActionType } from '../domain/gameEngine';
import type { RoundResult } from '../domain/gameState';
import { renderCards } from './cardRenderer';

const ACTION_TYPES: PlayerActionType[] = ['bet', 'call', 'check', 'fold'];

type ActionCallback = (action: PlayerActionType) => void;

export type GameView = {
  render(state: EngineState, availableActions: PlayerActionType[]): void;
  showCpuThinking(): void;
  showRoundResult(result: RoundResult): void;
  onAction(callback: ActionCallback): void;
  onNewGame(callback: () => void): void;
  onNextRound(callback: () => void): void;
};

export function createGameView(container: HTMLElement): GameView {
  const header = document.createElement('header');
  header.className = 'game-header';

  const title = document.createElement('h1');
  title.textContent = '7 Card Stud Mini';
  header.appendChild(title);

  const notice = document.createElement('p');
  notice.textContent =
    '※ブラウザをリロードするとゲーム状態がリセットされます';
  header.appendChild(notice);

  const cpuArea = document.createElement('section');
  cpuArea.className = 'cpu-area';

  const cpuLabel = document.createElement('h2');
  cpuLabel.textContent = 'CPU';
  cpuArea.appendChild(cpuLabel);

  const cpuCardsEl = document.createElement('div');
  cpuCardsEl.dataset.testid = 'cpu-cards';
  cpuArea.appendChild(cpuCardsEl);

  const cpuStackEl = document.createElement('div');
  cpuStackEl.className = 'stack-display';
  cpuArea.appendChild(cpuStackEl);

  const infoArea = document.createElement('section');
  infoArea.className = 'info-area';

  const potEl = document.createElement('div');
  potEl.className = 'pot-display';
  infoArea.appendChild(potEl);

  const streetEl = document.createElement('div');
  streetEl.className = 'street-display';
  infoArea.appendChild(streetEl);

  const messageEl = document.createElement('div');
  messageEl.className = 'message-display';
  infoArea.appendChild(messageEl);

  const playerArea = document.createElement('section');
  playerArea.className = 'player-area';

  const playerLabel = document.createElement('h2');
  playerLabel.textContent = 'Player';
  playerArea.appendChild(playerLabel);

  const playerCardsEl = document.createElement('div');
  playerCardsEl.dataset.testid = 'player-cards';
  playerArea.appendChild(playerCardsEl);

  const playerStackEl = document.createElement('div');
  playerStackEl.className = 'stack-display';
  playerArea.appendChild(playerStackEl);

  const actionPanel = document.createElement('section');
  actionPanel.className = 'action-panel';

  const actionButtons = new Map<PlayerActionType, HTMLButtonElement>();
  for (const actionType of ACTION_TYPES) {
    const btn = document.createElement('button');
    btn.dataset.action = actionType;
    btn.textContent = actionType;
    btn.disabled = true;
    actionPanel.appendChild(btn);
    actionButtons.set(actionType, btn);
  }

  const controlPanel = document.createElement('section');
  controlPanel.className = 'control-panel';

  const newGameBtn = document.createElement('button');
  newGameBtn.dataset.testid = 'new-game-button';
  newGameBtn.textContent = '新規ゲーム';
  controlPanel.appendChild(newGameBtn);

  const nextRoundBtn = document.createElement('button');
  nextRoundBtn.dataset.testid = 'next-round-button';
  nextRoundBtn.textContent = '次のラウンド';
  controlPanel.appendChild(nextRoundBtn);

  const statsPanel = document.createElement('div');
  statsPanel.dataset.testid = 'stats-panel';

  container.appendChild(header);
  container.appendChild(cpuArea);
  container.appendChild(infoArea);
  container.appendChild(playerArea);
  container.appendChild(actionPanel);
  container.appendChild(controlPanel);
  container.appendChild(statsPanel);

  function render(
    state: EngineState,
    availableActions: PlayerActionType[],
  ): void {
    playerStackEl.textContent = `Stack: ${state.playerStack}`;
    cpuStackEl.textContent = `Stack: ${state.cpuStack}`;
    potEl.textContent = `Pot: ${state.pot}`;
    streetEl.textContent = `Street: ${state.street}`;
    messageEl.textContent = '';

    playerCardsEl.innerHTML = '';
    const playerContainer = renderCards(state.playerCards);
    while (playerContainer.firstChild) {
      playerCardsEl.appendChild(playerContainer.firstChild);
    }

    cpuCardsEl.innerHTML = '';
    const cpuContainer = renderCards(state.cpuCards);
    while (cpuContainer.firstChild) {
      cpuCardsEl.appendChild(cpuContainer.firstChild);
    }

    const availableSet = new Set(availableActions);
    for (const [actionType, btn] of actionButtons) {
      btn.disabled = !availableSet.has(actionType);
    }
  }

  function showCpuThinking(): void {
    messageEl.textContent = 'CPU思考中...';
    for (const btn of actionButtons.values()) {
      btn.disabled = true;
    }
  }

  function showRoundResult(result: RoundResult): void {
    let winnerText: string;
    if (result.winner === 'player') {
      winnerText = 'プレイヤーの勝ち!';
    } else if (result.winner === 'cpu') {
      winnerText = 'CPUの勝ち';
    } else {
      winnerText = '引き分け (draw)';
    }

    const parts = [winnerText];
    if (result.playerHandType || result.cpuHandType) {
      parts.push(
        `Player: ${result.playerHandType} / CPU: ${result.cpuHandType}`,
      );
    }
    parts.push(`チップ変動: ${result.chipDelta}`);
    messageEl.textContent = parts.join(' | ');

    for (const btn of actionButtons.values()) {
      btn.disabled = true;
    }
  }

  function onAction(callback: ActionCallback): void {
    for (const [actionType, btn] of actionButtons) {
      btn.addEventListener('click', () => callback(actionType));
    }
  }

  function onNewGame(callback: () => void): void {
    newGameBtn.addEventListener('click', callback);
  }

  function onNextRound(callback: () => void): void {
    nextRoundBtn.addEventListener('click', callback);
  }

  return { render, showCpuThinking, showRoundResult, onAction, onNewGame, onNextRound };
}
