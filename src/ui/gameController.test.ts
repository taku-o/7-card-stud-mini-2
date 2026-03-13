// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createGameController } from './gameController';

// ========== テストヘルパー ==========

function createTestContainer(): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

let container: HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
  container = createTestContainer();
});

afterEach(() => {
  vi.useRealTimers();
});

// ========== createGameController: 初期化 ==========

describe('createGameController: 初期化', () => {
  it('コンテナ内に DOM 要素を生成する', () => {
    // Given / When
    createGameController(container);

    // Then
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('GameController オブジェクトを返す', () => {
    const controller = createGameController(container);

    expect(controller).toBeDefined();
    expect(controller.startNewGame).toBeTypeOf('function');
    expect(controller.startNextRound).toBeTypeOf('function');
    expect(controller.handlePlayerAction).toBeTypeOf('function');
  });
});

// ========== startNewGame: 新規ゲーム開始 ==========

describe('startNewGame: 新規ゲーム開始', () => {
  it('プレイヤーとCPU のスタックが初期値で表示される', () => {
    // Given
    const controller = createGameController(container);

    // When
    controller.startNewGame();

    // Then: 初期チップ（1000 想定）からアンティを引いた値が表示される
    expect(container.textContent).toMatch(/\d{3,4}/);
  });

  it('ポットが表示される', () => {
    const controller = createGameController(container);

    controller.startNewGame();

    expect(container.textContent).toMatch(/\d+/);
  });

  it('プレイヤーのカードが 3 枚表示される', () => {
    const controller = createGameController(container);

    controller.startNewGame();

    const playerCards = container.querySelector(
      '[data-testid="player-cards"]',
    );
    expect(playerCards).not.toBeNull();
    expect(playerCards!.children.length).toBe(3);
  });

  it('CPU のカードが 3 枚表示される', () => {
    const controller = createGameController(container);

    controller.startNewGame();

    const cpuCards = container.querySelector('[data-testid="cpu-cards"]');
    expect(cpuCards).not.toBeNull();
    expect(cpuCards!.children.length).toBe(3);
  });

  it('アクションボタンが活性化される', () => {
    const controller = createGameController(container);

    controller.startNewGame();

    const buttons = container.querySelectorAll<HTMLButtonElement>(
      '[data-action]',
    );
    const enabledButtons = Array.from(buttons).filter((b) => !b.disabled);
    expect(enabledButtons.length).toBeGreaterThan(0);
  });
});

// ========== handlePlayerAction - bet: プレイヤーベット ==========

describe('handlePlayerAction - bet: プレイヤーベット', () => {
  it('ベット後に CPU 思考中メッセージが表示される', () => {
    // Given
    const controller = createGameController(container);
    controller.startNewGame();

    // When
    controller.handlePlayerAction('bet');

    // Then
    expect(container.textContent).toMatch(/思考中|thinking/i);
  });

  it('ベット後にアクションボタンが全て非活性化される', () => {
    const controller = createGameController(container);
    controller.startNewGame();

    controller.handlePlayerAction('bet');

    const buttons = container.querySelectorAll<HTMLButtonElement>(
      '[data-action]',
    );
    for (const button of buttons) {
      expect(button.disabled).toBe(true);
    }
  });

  it('CPU 思考遅延後に画面が更新される', () => {
    const controller = createGameController(container);
    controller.startNewGame();

    controller.handlePlayerAction('bet');
    vi.runAllTimers();

    const buttons = container.querySelectorAll<HTMLButtonElement>(
      '[data-action]',
    );
    const hasActiveButton = Array.from(buttons).some((b) => !b.disabled);
    expect(hasActiveButton || container.textContent!.match(/round-over|結果|勝|敗/i)).toBeTruthy();
  });
});

// ========== handlePlayerAction - check: プレイヤーチェック ==========

describe('handlePlayerAction - check: プレイヤーチェック', () => {
  it('チェック後に CPU 思考中メッセージが表示される', () => {
    const controller = createGameController(container);
    controller.startNewGame();

    controller.handlePlayerAction('check');

    expect(container.textContent).toMatch(/思考中|thinking/i);
  });

  it('CPU 思考遅延後に画面が更新される', () => {
    const controller = createGameController(container);
    controller.startNewGame();

    controller.handlePlayerAction('check');
    vi.runAllTimers();

    const playerCards = container.querySelector(
      '[data-testid="player-cards"]',
    );
    expect(playerCards).not.toBeNull();
  });
});

// ========== handlePlayerAction - fold: プレイヤーフォールド ==========

describe('handlePlayerAction - fold: プレイヤーフォールド', () => {
  it('フォールド後にラウンド結果が表示される', () => {
    // Given
    const controller = createGameController(container);
    controller.startNewGame();

    // When
    controller.handlePlayerAction('fold');

    // Then: CPU 勝利が表示される
    expect(container.textContent).toMatch(/cpu|CPU|勝|敗/i);
  });

  it('フォールド後にアクションボタンが全て非活性化される', () => {
    const controller = createGameController(container);
    controller.startNewGame();

    controller.handlePlayerAction('fold');

    const buttons = container.querySelectorAll<HTMLButtonElement>(
      '[data-action]',
    );
    for (const button of buttons) {
      expect(button.disabled).toBe(true);
    }
  });
});

// ========== startNextRound: チップ引き継ぎ ==========

describe('startNextRound: チップ引き継ぎ', () => {
  it('前ラウンドのスタックを引き継いで次ラウンドが開始される', () => {
    // Given: 1ラウンド目をフォールドで終了
    const controller = createGameController(container);
    controller.startNewGame();
    controller.handlePlayerAction('fold');

    // When: 次ラウンド開始
    controller.startNextRound();

    // Then: カードが 3 枚ずつ配布される（新ラウンド開始の証拠）
    const playerCards = container.querySelector(
      '[data-testid="player-cards"]',
    );
    expect(playerCards).not.toBeNull();
    expect(playerCards!.children.length).toBe(3);
  });

  it('次ラウンド開始後にアクションボタンが活性化される', () => {
    const controller = createGameController(container);
    controller.startNewGame();
    controller.handlePlayerAction('fold');

    controller.startNextRound();

    const buttons = container.querySelectorAll<HTMLButtonElement>(
      '[data-action]',
    );
    const enabledButtons = Array.from(buttons).filter((b) => !b.disabled);
    expect(enabledButtons.length).toBeGreaterThan(0);
  });
});

// ========== ゲームフロー: 1ラウンド完走 ==========

describe('ゲームフロー: 1ラウンド完走', () => {
  it('check-check を繰り返してショーダウンまで進行し、結果が表示される', () => {
    // Given
    const controller = createGameController(container);
    controller.startNewGame();

    // When: 全ストリートを check で通過（third → seventh → showdown）
    // third ストリートから始まり、seventh まで5回のプレイヤーアクション
    for (let i = 0; i < 5; i++) {
      controller.handlePlayerAction('check');
      vi.runAllTimers();
    }

    // Then: ラウンド結果が表示される
    expect(
      container.textContent,
    ).toMatch(/勝|敗|draw|引き分け|player|cpu|結果/i);
  });
});

// ========== ゲームフロー: 複数ラウンド ==========

describe('ゲームフロー: 複数ラウンド', () => {
  it('2ラウンド連続でプレイできる', () => {
    // Given
    const controller = createGameController(container);
    controller.startNewGame();

    // When: 1ラウンド目をフォールドで終了
    controller.handlePlayerAction('fold');

    // Then: 2ラウンド目を開始できる
    expect(() => controller.startNextRound()).not.toThrow();
    expect(
      container.querySelector('[data-testid="player-cards"]')!.children.length,
    ).toBe(3);
  });

  it('チップ合計がラウンド間で保存される', () => {
    // Given
    const controller = createGameController(container);
    controller.startNewGame();

    // When: 1ラウンド目終了 → 2ラウンド目開始
    controller.handlePlayerAction('fold');
    controller.startNextRound();

    // Then: プレイヤーのスタックが初期値から減少している
    // （初期1000 - アンティ10(R1) - アンティ10(R2) = 980）
    const text = container.textContent!;
    expect(text).toContain('980');
  });
});
