// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGameView } from './gameView';
import type { EngineState, PlayerActionType } from '../domain/gameEngine';
import type { RoundResult } from '../domain/gameState';
import type { Card } from '../domain/card';

// ========== テストヘルパー ==========

function createTestContainer(): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

function createCard(
  suit: Card['suit'],
  rank: Card['rank'],
  faceUp: boolean,
): Card {
  return { suit, rank, faceUp };
}

function createTestEngineState(
  overrides: Partial<EngineState> = {},
): EngineState {
  return {
    playerStack: 990,
    cpuStack: 990,
    pot: 20,
    street: 'third',
    playerCards: [
      createCard('spades', 14, false),
      createCard('hearts', 13, false),
      createCard('diamonds', 12, true),
    ],
    cpuCards: [
      createCard('clubs', 10, false),
      createCard('spades', 9, false),
      createCard('hearts', 8, true),
    ],
    phase: 'player-turn',
    currentBet: 0,
    playerBetInStreet: 0,
    cpuBetInStreet: 0,
    betSize: 20,
    ...overrides,
  };
}

let container: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  container = createTestContainer();
});

// ========== createGameView: DOM 構築 ==========

describe('createGameView: DOM 構築', () => {
  it('コンテナ内に DOM 要素を生成する', () => {
    // Given / When
    createGameView(container);

    // Then
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('リロード時リセットの説明テキストが含まれる', () => {
    createGameView(container);

    expect(container.textContent).toMatch(/リロード|リセット/);
  });

  it('統計パネル領域が存在する', () => {
    createGameView(container);

    const statsPanel = container.querySelector('[data-testid="stats-panel"]');
    expect(statsPanel).not.toBeNull();
  });
});

// ========== render: 状態の表示 ==========

describe('render: 状態の表示', () => {
  it('プレイヤーのスタックが表示される', () => {
    // Given
    const view = createGameView(container);
    const state = createTestEngineState({ playerStack: 950 });
    const actions: PlayerActionType[] = ['bet', 'check', 'fold'];

    // When
    view.render(state, actions);

    // Then
    expect(container.textContent).toContain('950');
  });

  it('CPU のスタックが表示される', () => {
    const view = createGameView(container);
    const state = createTestEngineState({ cpuStack: 870 });
    const actions: PlayerActionType[] = ['bet', 'check', 'fold'];

    view.render(state, actions);

    expect(container.textContent).toContain('870');
  });

  it('ポットが表示される', () => {
    const view = createGameView(container);
    const state = createTestEngineState({ pot: 60 });
    const actions: PlayerActionType[] = ['bet', 'check', 'fold'];

    view.render(state, actions);

    expect(container.textContent).toContain('60');
  });

  it('現在のストリートが表示される', () => {
    const view = createGameView(container);
    const state = createTestEngineState({ street: 'fourth' });
    const actions: PlayerActionType[] = ['bet', 'check', 'fold'];

    view.render(state, actions);

    expect(container.textContent).toMatch(/fourth|4th/i);
  });

  it('プレイヤーのカード枚数分の要素が存在する', () => {
    const view = createGameView(container);
    const state = createTestEngineState();
    const actions: PlayerActionType[] = ['bet', 'check', 'fold'];

    view.render(state, actions);

    const playerArea = container.querySelector(
      '[data-testid="player-cards"]',
    );
    expect(playerArea).not.toBeNull();
    expect(playerArea!.children.length).toBe(3);
  });

  it('CPU のカード枚数分の要素が存在する', () => {
    const view = createGameView(container);
    const state = createTestEngineState();
    const actions: PlayerActionType[] = ['bet', 'check', 'fold'];

    view.render(state, actions);

    const cpuArea = container.querySelector('[data-testid="cpu-cards"]');
    expect(cpuArea).not.toBeNull();
    expect(cpuArea!.children.length).toBe(3);
  });
});

// ========== render: アクションボタンの活性/非活性 ==========

describe('render: アクションボタンの活性/非活性', () => {
  it('利用可能なアクションのボタンが活性化される', () => {
    // Given
    const view = createGameView(container);
    const state = createTestEngineState();
    const actions: PlayerActionType[] = ['bet', 'check', 'fold'];

    // When
    view.render(state, actions);

    // Then
    const betButton = container.querySelector(
      '[data-action="bet"]',
    ) as HTMLButtonElement;
    const checkButton = container.querySelector(
      '[data-action="check"]',
    ) as HTMLButtonElement;
    const foldButton = container.querySelector(
      '[data-action="fold"]',
    ) as HTMLButtonElement;

    expect(betButton.disabled).toBe(false);
    expect(checkButton.disabled).toBe(false);
    expect(foldButton.disabled).toBe(false);
  });

  it('利用不可能なアクションのボタンが非活性化される', () => {
    // Given
    const view = createGameView(container);
    const state = createTestEngineState({ currentBet: 20, cpuBetInStreet: 20 });
    const actions: PlayerActionType[] = ['call', 'fold'];

    // When
    view.render(state, actions);

    // Then
    const betButton = container.querySelector(
      '[data-action="bet"]',
    ) as HTMLButtonElement;
    const checkButton = container.querySelector(
      '[data-action="check"]',
    ) as HTMLButtonElement;

    expect(betButton.disabled).toBe(true);
    expect(checkButton.disabled).toBe(true);
  });

  it('空の availableActions で全ボタンが非活性化される', () => {
    // Given
    const view = createGameView(container);
    const state = createTestEngineState({ phase: 'cpu-turn' });
    const actions: PlayerActionType[] = [];

    // When
    view.render(state, actions);

    // Then
    const buttons = container.querySelectorAll<HTMLButtonElement>(
      '[data-action]',
    );
    for (const button of buttons) {
      expect(button.disabled).toBe(true);
    }
  });
});

// ========== showCpuThinking: CPU 思考中表示 ==========

describe('showCpuThinking: CPU 思考中表示', () => {
  it('CPU 思考中メッセージが表示される', () => {
    // Given
    const view = createGameView(container);

    // When
    view.showCpuThinking();

    // Then
    expect(container.textContent).toMatch(/思考中|thinking/i);
  });
});

// ========== showRoundResult: ラウンド結果表示 ==========

describe('showRoundResult: ラウンド結果表示', () => {
  it('勝者が表示される', () => {
    // Given
    const view = createGameView(container);
    const result: RoundResult = {
      winner: 'player',
      playerHandType: 'flush',
      cpuHandType: 'one-pair',
      chipDelta: 100,
    };

    // When
    view.showRoundResult(result);

    // Then
    expect(container.textContent).toMatch(/player|プレイヤー|勝/i);
  });

  it('役名が表示される', () => {
    const view = createGameView(container);
    const result: RoundResult = {
      winner: 'player',
      playerHandType: 'flush',
      cpuHandType: 'one-pair',
      chipDelta: 100,
    };

    view.showRoundResult(result);

    expect(container.textContent).toContain('flush');
    expect(container.textContent).toContain('one-pair');
  });

  it('チップ変動が表示される', () => {
    const view = createGameView(container);
    const result: RoundResult = {
      winner: 'player',
      playerHandType: 'flush',
      cpuHandType: 'one-pair',
      chipDelta: 100,
    };

    view.showRoundResult(result);

    expect(container.textContent).toContain('100');
  });

  it('CPU が勝利した場合に CPU 勝利が表示される', () => {
    const view = createGameView(container);
    const result: RoundResult = {
      winner: 'cpu',
      playerHandType: 'high-card',
      cpuHandType: 'two-pair',
      chipDelta: -60,
    };

    view.showRoundResult(result);

    expect(container.textContent).toMatch(/cpu|CPU|敗/i);
  });

  it('引き分けの場合に引き分けが表示される', () => {
    const view = createGameView(container);
    const result: RoundResult = {
      winner: 'draw',
      playerHandType: 'one-pair',
      cpuHandType: 'one-pair',
      chipDelta: 0,
    };

    view.showRoundResult(result);

    expect(container.textContent).toMatch(/draw|引き分け/i);
  });

  it('フォールドによる勝利で空の役名が表示されても例外が発生しない', () => {
    const view = createGameView(container);
    const result: RoundResult = {
      winner: 'cpu',
      playerHandType: '',
      cpuHandType: '',
      chipDelta: -20,
    };

    expect(() => view.showRoundResult(result)).not.toThrow();
  });
});

// ========== onAction: アクションボタンのイベントバインド ==========

describe('onAction: アクションボタンのイベントバインド', () => {
  it('bet ボタンクリックでコールバックが呼ばれる', () => {
    // Given
    const view = createGameView(container);
    const state = createTestEngineState();
    view.render(state, ['bet', 'check', 'fold']);
    const callback = vi.fn();
    view.onAction(callback);

    // When
    const betButton = container.querySelector(
      '[data-action="bet"]',
    ) as HTMLButtonElement;
    betButton.click();

    // Then
    expect(callback).toHaveBeenCalledWith('bet');
  });

  it('call ボタンクリックでコールバックが呼ばれる', () => {
    const view = createGameView(container);
    const state = createTestEngineState({
      currentBet: 20,
      cpuBetInStreet: 20,
    });
    view.render(state, ['call', 'fold']);
    const callback = vi.fn();
    view.onAction(callback);

    const callButton = container.querySelector(
      '[data-action="call"]',
    ) as HTMLButtonElement;
    callButton.click();

    expect(callback).toHaveBeenCalledWith('call');
  });

  it('fold ボタンクリックでコールバックが呼ばれる', () => {
    const view = createGameView(container);
    const state = createTestEngineState();
    view.render(state, ['bet', 'check', 'fold']);
    const callback = vi.fn();
    view.onAction(callback);

    const foldButton = container.querySelector(
      '[data-action="fold"]',
    ) as HTMLButtonElement;
    foldButton.click();

    expect(callback).toHaveBeenCalledWith('fold');
  });

  it('check ボタンクリックでコールバックが呼ばれる', () => {
    const view = createGameView(container);
    const state = createTestEngineState();
    view.render(state, ['bet', 'check', 'fold']);
    const callback = vi.fn();
    view.onAction(callback);

    const checkButton = container.querySelector(
      '[data-action="check"]',
    ) as HTMLButtonElement;
    checkButton.click();

    expect(callback).toHaveBeenCalledWith('check');
  });
});

// ========== onNewGame / onNextRound: ゲーム制御ボタン ==========

describe('onNewGame: 新規ゲームボタン', () => {
  it('新規ゲームボタンクリックでコールバックが呼ばれる', () => {
    // Given
    const view = createGameView(container);
    const callback = vi.fn();
    view.onNewGame(callback);

    // When
    const button = container.querySelector(
      '[data-testid="new-game-button"]',
    ) as HTMLButtonElement;
    button.click();

    // Then
    expect(callback).toHaveBeenCalledOnce();
  });
});

describe('onNextRound: 次ラウンドボタン', () => {
  it('次ラウンドボタンクリックでコールバックが呼ばれる', () => {
    // Given
    const view = createGameView(container);
    const callback = vi.fn();
    view.onNextRound(callback);

    // When
    const button = container.querySelector(
      '[data-testid="next-round-button"]',
    ) as HTMLButtonElement;
    button.click();

    // Then
    expect(callback).toHaveBeenCalledOnce();
  });
});
