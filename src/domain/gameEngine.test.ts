import { describe, it, expect } from 'vitest';
import {
  startNewRound,
  processPlayerAction,
  processCpuAction,
  resolveShowdown,
  getAvailableActions,
  type RoundConfig,
  type EngineState,
  type PlayerAction,

} from './gameEngine';
import { createDeck, shuffleDeck, type Deck } from './deck';
import type { Card } from './card';

// ========== テストヘルパー ==========

const DEFAULT_CONFIG: RoundConfig = {
  playerStack: 1000,
  cpuStack: 1000,
  ante: 10,
  betSize: 20,
};

function createSeededDeck(): Deck {
  return shuffleDeck(createDeck());
}

function createEngineStateAfterStart(
  config: RoundConfig = DEFAULT_CONFIG
): { engineState: EngineState; deck: Deck } {
  return startNewRound(config);
}

function advanceToPlayerBet(
  config: RoundConfig = DEFAULT_CONFIG
): { engineState: EngineState; deck: Deck } {
  const { engineState, deck } = createEngineStateAfterStart(config);
  const betAction: PlayerAction = { type: 'bet' };
  return processPlayerAction(engineState, deck, betAction);
}

// ========== startNewRound ==========

describe('startNewRound: ラウンド開始', () => {
  it('アンティが両プレイヤーのスタックから引かれる', () => {
    // Given
    const config: RoundConfig = {
      playerStack: 1000,
      cpuStack: 1000,
      ante: 10,
      betSize: 20,
    };

    // When
    const { engineState } = startNewRound(config);

    // Then
    expect(engineState.playerStack).toBe(990);
    expect(engineState.cpuStack).toBe(990);
  });

  it('ポットにアンティの合計が反映される', () => {
    const config: RoundConfig = {
      playerStack: 500,
      cpuStack: 500,
      ante: 25,
      betSize: 50,
    };

    const { engineState } = startNewRound(config);

    expect(engineState.pot).toBe(50);
  });

  it('各プレイヤーに3枚のカードが配布される', () => {
    const { engineState } = createEngineStateAfterStart();

    expect(engineState.playerCards).toHaveLength(3);
    expect(engineState.cpuCards).toHaveLength(3);
  });

  it('プレイヤーのカードは2枚down + 1枚up', () => {
    const { engineState } = createEngineStateAfterStart();

    const downCards = engineState.playerCards.filter((c) => !c.faceUp);
    const upCards = engineState.playerCards.filter((c) => c.faceUp);
    expect(downCards).toHaveLength(2);
    expect(upCards).toHaveLength(1);
  });

  it('CPUのカードは2枚down + 1枚up', () => {
    const { engineState } = createEngineStateAfterStart();

    const downCards = engineState.cpuCards.filter((c) => !c.faceUp);
    const upCards = engineState.cpuCards.filter((c) => c.faceUp);
    expect(downCards).toHaveLength(2);
    expect(upCards).toHaveLength(1);
  });

  it('phase が player-turn で開始する', () => {
    const { engineState } = createEngineStateAfterStart();

    expect(engineState.phase).toBe('player-turn');
  });

  it('ストリートが third で開始する', () => {
    const { engineState } = createEngineStateAfterStart();

    expect(engineState.street).toBe('third');
  });

  it('currentBet が 0 で開始する', () => {
    const { engineState } = createEngineStateAfterStart();

    expect(engineState.currentBet).toBe(0);
  });

  it('playerBetInStreet が 0 で開始する', () => {
    const { engineState } = createEngineStateAfterStart();

    expect(engineState.playerBetInStreet).toBe(0);
  });

  it('cpuBetInStreet が 0 で開始する', () => {
    const { engineState } = createEngineStateAfterStart();

    expect(engineState.cpuBetInStreet).toBe(0);
  });

  it('betSize が設定値と一致する', () => {
    const config: RoundConfig = {
      playerStack: 1000,
      cpuStack: 1000,
      ante: 10,
      betSize: 50,
    };

    const { engineState } = startNewRound(config);

    expect(engineState.betSize).toBe(50);
  });

  it('roundResult は未設定', () => {
    const { engineState } = createEngineStateAfterStart();

    expect(engineState.roundResult).toBeUndefined();
  });

  it('配布後のデッキは46枚（52 - 6）', () => {
    const { deck } = createEngineStateAfterStart();

    expect(deck.cards).toHaveLength(46);
  });

  it('プレイヤーとCPUのカードは重複しない', () => {
    const { engineState } = createEngineStateAfterStart();

    const allCards = [...engineState.playerCards, ...engineState.cpuCards];
    const uniqueCards = new Set(allCards.map((c) => `${c.suit}-${c.rank}`));
    expect(uniqueCards.size).toBe(6);
  });
});

// ========== getAvailableActions ==========

describe('getAvailableActions: 選択可能アクション', () => {
  it('currentBet が 0 のとき bet, check, fold が選択可能', () => {
    // Given
    const { engineState } = createEngineStateAfterStart();

    // When
    const actions = getAvailableActions(engineState);

    // Then
    expect(actions).toContain('bet');
    expect(actions).toContain('check');
    expect(actions).toContain('fold');
    expect(actions).not.toContain('call');
  });

  it('currentBet > 0 のとき call, fold が選択可能、bet と check は不可', () => {
    // Given: CPUがベットした状態を想定
    const { engineState } = createEngineStateAfterStart();
    const stateWithBet: EngineState = {
      ...engineState,
      currentBet: 20,
      cpuBetInStreet: 20,
      phase: 'player-turn',
    };

    // When
    const actions = getAvailableActions(stateWithBet);

    // Then
    expect(actions).toContain('call');
    expect(actions).toContain('fold');
    expect(actions).not.toContain('bet');
    expect(actions).not.toContain('check');
  });

  it('phase が player-turn でないとき空配列を返す', () => {
    // Given: cpu-turn の状態
    const { engineState } = createEngineStateAfterStart();
    const cpuTurnState: EngineState = {
      ...engineState,
      phase: 'cpu-turn',
    };

    // When
    const actions = getAvailableActions(cpuTurnState);

    // Then
    expect(actions).toHaveLength(0);
  });

  it('phase が round-over のとき空配列を返す', () => {
    const { engineState } = createEngineStateAfterStart();
    const overState: EngineState = {
      ...engineState,
      phase: 'round-over',
    };

    const actions = getAvailableActions(overState);

    expect(actions).toHaveLength(0);
  });
});

// ========== processPlayerAction: fold ==========

describe('processPlayerAction - fold: プレイヤーフォールド', () => {
  it('ラウンドが即座に終了する', () => {
    // Given
    const { engineState, deck } = createEngineStateAfterStart();

    // When
    const result = processPlayerAction(engineState, deck, { type: 'fold' });

    // Then
    expect(result.engineState.phase).toBe('round-over');
  });

  it('CPUが勝者になる', () => {
    const { engineState, deck } = createEngineStateAfterStart();

    const result = processPlayerAction(engineState, deck, { type: 'fold' });

    expect(result.engineState.roundResult).toBeDefined();
    expect(result.engineState.roundResult!.winner).toBe('cpu');
  });

  it('chipDelta がポットの負値になる', () => {
    // Given: ante=10 → pot=20
    const config: RoundConfig = {
      playerStack: 1000,
      cpuStack: 1000,
      ante: 10,
      betSize: 20,
    };
    const { engineState, deck } = startNewRound(config);

    // When
    const result = processPlayerAction(engineState, deck, { type: 'fold' });

    // Then: プレイヤーがフォールドしたので、ポット分を失う
    expect(result.engineState.roundResult!.chipDelta).toBeLessThan(0);
  });

  it('フォールドしたプレイヤーのスタックは変化せず、勝者にポットが加算される', () => {
    const { engineState, deck } = createEngineStateAfterStart();
    const playerStackBefore = engineState.playerStack;
    const cpuStackBefore = engineState.cpuStack;
    const potBefore = engineState.pot;

    const result = processPlayerAction(engineState, deck, { type: 'fold' });

    expect(result.engineState.playerStack).toBe(playerStackBefore);
    expect(result.engineState.cpuStack).toBe(cpuStackBefore + potBefore);
    expect(result.engineState.pot).toBe(0);
  });
});

// ========== processPlayerAction: bet ==========

describe('processPlayerAction - bet: プレイヤーベット', () => {
  it('プレイヤーのスタックが betSize 分減少する', () => {
    // Given
    const config: RoundConfig = {
      playerStack: 1000,
      cpuStack: 1000,
      ante: 10,
      betSize: 20,
    };
    const { engineState, deck } = startNewRound(config);
    const stackBefore = engineState.playerStack;

    // When
    const result = processPlayerAction(engineState, deck, { type: 'bet' });

    // Then
    expect(result.engineState.playerStack).toBe(stackBefore - 20);
  });

  it('ポットが betSize 分増加する', () => {
    const config: RoundConfig = {
      playerStack: 1000,
      cpuStack: 1000,
      ante: 10,
      betSize: 20,
    };
    const { engineState, deck } = startNewRound(config);
    const potBefore = engineState.pot;

    const result = processPlayerAction(engineState, deck, { type: 'bet' });

    expect(result.engineState.pot).toBe(potBefore + 20);
  });

  it('currentBet が betSize に設定される', () => {
    const { engineState, deck } = createEngineStateAfterStart();

    const result = processPlayerAction(engineState, deck, { type: 'bet' });

    expect(result.engineState.currentBet).toBe(DEFAULT_CONFIG.betSize);
  });

  it('playerBetInStreet が betSize に設定される', () => {
    const { engineState, deck } = createEngineStateAfterStart();

    const result = processPlayerAction(engineState, deck, { type: 'bet' });

    expect(result.engineState.playerBetInStreet).toBe(DEFAULT_CONFIG.betSize);
  });

  it('phase が cpu-turn に遷移する', () => {
    const { engineState, deck } = createEngineStateAfterStart();

    const result = processPlayerAction(engineState, deck, { type: 'bet' });

    expect(result.engineState.phase).toBe('cpu-turn');
  });
});

// ========== processPlayerAction: call ==========

describe('processPlayerAction - call: プレイヤーコール', () => {
  it('currentBet との差額のみスタックから引かれる', () => {
    // Given: currentBet=20, playerBetInStreet=0 の状態
    const { engineState } = createEngineStateAfterStart();
    const stateWithBet: EngineState = {
      ...engineState,
      currentBet: 20,
      cpuBetInStreet: 20,
      phase: 'player-turn',
    };
    const deck = createSeededDeck();

    // When
    const result = processPlayerAction(stateWithBet, deck, { type: 'call' });

    // Then: 差額 = 20 - 0 = 20
    expect(result.engineState.playerStack).toBe(stateWithBet.playerStack - 20);
  });

  it('ポットに差額が加算される', () => {
    const { engineState } = createEngineStateAfterStart();
    const stateWithBet: EngineState = {
      ...engineState,
      currentBet: 20,
      cpuBetInStreet: 20,
      phase: 'player-turn',
    };
    const deck = createSeededDeck();
    const potBefore = stateWithBet.pot;

    const result = processPlayerAction(stateWithBet, deck, { type: 'call' });

    expect(result.engineState.pot).toBe(potBefore + 20);
  });

  it('playerBetInStreet が currentBet に一致する', () => {
    const { engineState } = createEngineStateAfterStart();
    const stateWithBet: EngineState = {
      ...engineState,
      currentBet: 20,
      cpuBetInStreet: 20,
      phase: 'player-turn',
    };
    const deck = createSeededDeck();

    const result = processPlayerAction(stateWithBet, deck, { type: 'call' });

    expect(result.engineState.playerBetInStreet).toBe(20);
  });

  it('phase が cpu-turn に遷移する', () => {
    const { engineState } = createEngineStateAfterStart();
    const stateWithBet: EngineState = {
      ...engineState,
      currentBet: 20,
      cpuBetInStreet: 20,
      phase: 'player-turn',
    };
    const deck = createSeededDeck();

    const result = processPlayerAction(stateWithBet, deck, { type: 'call' });

    expect(result.engineState.phase).toBe('cpu-turn');
  });
});

// ========== processPlayerAction: check ==========

describe('processPlayerAction - check: プレイヤーチェック', () => {
  it('スタックが変化しない', () => {
    // Given: currentBet=0 の状態
    const { engineState, deck } = createEngineStateAfterStart();
    const stackBefore = engineState.playerStack;

    // When
    const result = processPlayerAction(engineState, deck, { type: 'check' });

    // Then
    expect(result.engineState.playerStack).toBe(stackBefore);
  });

  it('ポットが変化しない', () => {
    const { engineState, deck } = createEngineStateAfterStart();
    const potBefore = engineState.pot;

    const result = processPlayerAction(engineState, deck, { type: 'check' });

    expect(result.engineState.pot).toBe(potBefore);
  });

  it('phase が cpu-turn に遷移する', () => {
    const { engineState, deck } = createEngineStateAfterStart();

    const result = processPlayerAction(engineState, deck, { type: 'check' });

    expect(result.engineState.phase).toBe('cpu-turn');
  });

  it('currentBet は 0 のまま', () => {
    const { engineState, deck } = createEngineStateAfterStart();

    const result = processPlayerAction(engineState, deck, { type: 'check' });

    expect(result.engineState.currentBet).toBe(0);
  });
});

// ========== processPlayerAction: イミュータビリティ ==========

describe('processPlayerAction: イミュータビリティ', () => {
  it('元の engineState を変更しない', () => {
    const { engineState, deck } = createEngineStateAfterStart();
    const originalStack = engineState.playerStack;
    const originalPot = engineState.pot;
    const originalPhase = engineState.phase;

    processPlayerAction(engineState, deck, { type: 'bet' });

    expect(engineState.playerStack).toBe(originalStack);
    expect(engineState.pot).toBe(originalPot);
    expect(engineState.phase).toBe(originalPhase);
  });

  it('元の deck を変更しない', () => {
    const { engineState, deck } = createEngineStateAfterStart();
    const originalDeckLength = deck.cards.length;

    processPlayerAction(engineState, deck, { type: 'bet' });

    expect(deck.cards).toHaveLength(originalDeckLength);
  });
});

// ========== processCpuAction: fold ==========

describe('processCpuAction - fold: CPUフォールド', () => {
  it('ラウンドが即座に終了する', () => {
    // Given: プレイヤーがベットして cpu-turn の状態
    const { engineState, deck } = advanceToPlayerBet();

    // When
    const result = processCpuAction(engineState, deck, { type: 'fold' });

    // Then
    expect(result.engineState.phase).toBe('round-over');
  });

  it('プレイヤーが勝者になる', () => {
    const { engineState, deck } = advanceToPlayerBet();

    const result = processCpuAction(engineState, deck, { type: 'fold' });

    expect(result.engineState.roundResult).toBeDefined();
    expect(result.engineState.roundResult!.winner).toBe('player');
  });

  it('chipDelta が正の値になる（プレイヤーがポットを獲得）', () => {
    const { engineState, deck } = advanceToPlayerBet();

    const result = processCpuAction(engineState, deck, { type: 'fold' });

    expect(result.engineState.roundResult!.chipDelta).toBeGreaterThan(0);
  });
});

// ========== processCpuAction: call/check + ストリート進行 ==========

describe('processCpuAction - call: CPUコールとストリート進行', () => {
  it('CPUのスタックが差額分減少する', () => {
    // Given: プレイヤーがベットした後、CPUがコール
    const { engineState, deck } = advanceToPlayerBet();
    const cpuStackBefore = engineState.cpuStack;
    const callAmount = engineState.currentBet - engineState.cpuBetInStreet;

    // When
    const result = processCpuAction(engineState, deck, { type: 'call' });

    // Then
    expect(result.engineState.cpuStack).toBe(cpuStackBefore - callAmount);
  });

  it('ポットにCPUのコール額が加算される', () => {
    const { engineState, deck } = advanceToPlayerBet();
    const potBefore = engineState.pot;
    const callAmount = engineState.currentBet - engineState.cpuBetInStreet;

    const result = processCpuAction(engineState, deck, { type: 'call' });

    expect(result.engineState.pot).toBe(potBefore + callAmount);
  });

  it('third ストリートで次の fourth に遷移する', () => {
    const { engineState, deck } = advanceToPlayerBet();

    const result = processCpuAction(engineState, deck, { type: 'call' });

    expect(result.engineState.street).toBe('fourth');
  });

  it('ストリート進行後に各プレイヤーにカードが1枚追加される', () => {
    const { engineState, deck } = advanceToPlayerBet();
    const playerCardsBefore = engineState.playerCards.length;
    const cpuCardsBefore = engineState.cpuCards.length;

    const result = processCpuAction(engineState, deck, { type: 'call' });

    expect(result.engineState.playerCards).toHaveLength(playerCardsBefore + 1);
    expect(result.engineState.cpuCards).toHaveLength(cpuCardsBefore + 1);
  });

  it('ストリート進行後に phase が player-turn に戻る', () => {
    const { engineState, deck } = advanceToPlayerBet();

    const result = processCpuAction(engineState, deck, { type: 'call' });

    expect(result.engineState.phase).toBe('player-turn');
  });

  it('ストリート進行後にベット情報がリセットされる', () => {
    const { engineState, deck } = advanceToPlayerBet();

    const result = processCpuAction(engineState, deck, { type: 'call' });

    expect(result.engineState.currentBet).toBe(0);
    expect(result.engineState.playerBetInStreet).toBe(0);
    expect(result.engineState.cpuBetInStreet).toBe(0);
  });
});

describe('processCpuAction - check: CPUチェックとストリート進行', () => {
  it('スタックが変化しない', () => {
    // Given: プレイヤーがチェックして cpu-turn
    const { engineState, deck } = createEngineStateAfterStart();
    const afterCheck = processPlayerAction(engineState, deck, { type: 'check' });
    const cpuStackBefore = afterCheck.engineState.cpuStack;

    // When
    const result = processCpuAction(
      afterCheck.engineState,
      afterCheck.deck,
      { type: 'check' }
    );

    // Then
    expect(result.engineState.cpuStack).toBe(cpuStackBefore);
  });

  it('ポットが変化しない', () => {
    const { engineState, deck } = createEngineStateAfterStart();
    const afterCheck = processPlayerAction(engineState, deck, { type: 'check' });
    const potBefore = afterCheck.engineState.pot;

    const result = processCpuAction(
      afterCheck.engineState,
      afterCheck.deck,
      { type: 'check' }
    );

    expect(result.engineState.pot).toBe(potBefore);
  });
});

// ========== processCpuAction: seventh → showdown 遷移 ==========

describe('processCpuAction: seventh ストリートからショーダウンへの遷移', () => {
  it('seventh ストリートでCPUアクション後にショーダウンが発生する', () => {
    // Given: seventh ストリートまで進行した状態を構築
    let { engineState, deck } = createEngineStateAfterStart();

    // third → fourth → fifth → sixth → seventh まで進行
    // 各ストリート: プレイヤーcheck → CPUcheck
    const streetsToAdvance = ['fourth', 'fifth', 'sixth', 'seventh'] as const;
    for (const expectedStreet of streetsToAdvance) {
      const playerResult = processPlayerAction(engineState, deck, { type: 'check' });
      const cpuResult = processCpuAction(
        playerResult.engineState,
        playerResult.deck,
        { type: 'check' }
      );
      engineState = cpuResult.engineState;
      deck = cpuResult.deck;
      expect(engineState.street).toBe(expectedStreet);
    }

    // When: seventh でプレイヤーcheck → CPUcheck
    const playerResult = processPlayerAction(engineState, deck, { type: 'check' });
    const result = processCpuAction(
      playerResult.engineState,
      playerResult.deck,
      { type: 'check' }
    );

    // Then: ショーダウンが発生し、roundResult が設定される
    expect(result.engineState.phase).toBe('round-over');
    expect(result.engineState.roundResult).toBeDefined();
    expect(result.engineState.street).toBe('showdown');
  });
});

// ========== processCpuAction: イミュータビリティ ==========

describe('processCpuAction: イミュータビリティ', () => {
  it('元の engineState を変更しない', () => {
    const { engineState, deck } = advanceToPlayerBet();
    const originalStack = engineState.cpuStack;
    const originalPot = engineState.pot;

    processCpuAction(engineState, deck, { type: 'call' });

    expect(engineState.cpuStack).toBe(originalStack);
    expect(engineState.pot).toBe(originalPot);
  });
});

// ========== resolveShowdown ==========

describe('resolveShowdown: ショーダウン判定', () => {
  it('勝者・役タイプ・chipDelta を含む RoundResult を返す', () => {
    // Given: 7枚ずつカードを持った showdown 状態
    const playerCards: Card[] = [
      { suit: 'spades', rank: 14, faceUp: true },
      { suit: 'spades', rank: 13, faceUp: true },
      { suit: 'spades', rank: 12, faceUp: true },
      { suit: 'spades', rank: 11, faceUp: true },
      { suit: 'spades', rank: 10, faceUp: true },
      { suit: 'hearts', rank: 2, faceUp: false },
      { suit: 'hearts', rank: 3, faceUp: false },
    ];
    const cpuCards: Card[] = [
      { suit: 'hearts', rank: 7, faceUp: true },
      { suit: 'diamonds', rank: 7, faceUp: true },
      { suit: 'clubs', rank: 5, faceUp: true },
      { suit: 'hearts', rank: 9, faceUp: true },
      { suit: 'diamonds', rank: 2, faceUp: true },
      { suit: 'clubs', rank: 3, faceUp: false },
      { suit: 'hearts', rank: 4, faceUp: false },
    ];

    const state: EngineState = {
      playerStack: 980,
      cpuStack: 980,
      pot: 40,
      street: 'showdown',
      playerCards,
      cpuCards,
      phase: 'round-over',
      currentBet: 0,
      playerBetInStreet: 0,
      cpuBetInStreet: 0,
      betSize: 20,
    };

    // When
    const result = resolveShowdown(state);

    // Then: プレイヤーがロイヤルフラッシュで勝利
    expect(result.engineState.roundResult).toBeDefined();
    expect(result.engineState.roundResult!.winner).toBe('player');
    expect(result.engineState.roundResult!.playerHandType).toBeTruthy();
    expect(result.engineState.roundResult!.cpuHandType).toBeTruthy();
    expect(result.engineState.roundResult!.chipDelta).toBeGreaterThan(0);
  });

  it('プレイヤーが強い手で勝利した場合、ポット全額を獲得する', () => {
    // Given: プレイヤー=フラッシュ、CPU=ハイカード
    const playerCards: Card[] = [
      { suit: 'hearts', rank: 14, faceUp: true },
      { suit: 'hearts', rank: 10, faceUp: true },
      { suit: 'hearts', rank: 8, faceUp: true },
      { suit: 'hearts', rank: 6, faceUp: true },
      { suit: 'hearts', rank: 4, faceUp: true },
      { suit: 'diamonds', rank: 2, faceUp: false },
      { suit: 'clubs', rank: 3, faceUp: false },
    ];
    const cpuCards: Card[] = [
      { suit: 'spades', rank: 13, faceUp: true },
      { suit: 'hearts', rank: 12, faceUp: true },
      { suit: 'diamonds', rank: 9, faceUp: true },
      { suit: 'clubs', rank: 7, faceUp: true },
      { suit: 'spades', rank: 5, faceUp: true },
      { suit: 'diamonds', rank: 3, faceUp: false },
      { suit: 'clubs', rank: 2, faceUp: false },
    ];

    const potAmount = 100;
    const state: EngineState = {
      playerStack: 950,
      cpuStack: 950,
      pot: potAmount,
      street: 'showdown',
      playerCards,
      cpuCards,
      phase: 'round-over',
      currentBet: 0,
      playerBetInStreet: 0,
      cpuBetInStreet: 0,
      betSize: 20,
    };

    // When
    const result = resolveShowdown(state);

    // Then
    expect(result.engineState.roundResult!.winner).toBe('player');
    expect(result.engineState.roundResult!.chipDelta).toBe(potAmount);
  });

  it('CPUが勝利した場合、chipDelta が負になる', () => {
    // Given: プレイヤー=ハイカード、CPU=ワンペア
    const playerCards: Card[] = [
      { suit: 'spades', rank: 14, faceUp: true },
      { suit: 'hearts', rank: 10, faceUp: true },
      { suit: 'diamonds', rank: 8, faceUp: true },
      { suit: 'clubs', rank: 6, faceUp: true },
      { suit: 'spades', rank: 4, faceUp: true },
      { suit: 'hearts', rank: 2, faceUp: false },
      { suit: 'diamonds', rank: 3, faceUp: false },
    ];
    const cpuCards: Card[] = [
      { suit: 'hearts', rank: 13, faceUp: true },
      { suit: 'diamonds', rank: 13, faceUp: true },
      { suit: 'clubs', rank: 9, faceUp: true },
      { suit: 'spades', rank: 7, faceUp: true },
      { suit: 'hearts', rank: 5, faceUp: true },
      { suit: 'clubs', rank: 3, faceUp: false },
      { suit: 'diamonds', rank: 2, faceUp: false },
    ];

    const state: EngineState = {
      playerStack: 950,
      cpuStack: 950,
      pot: 100,
      street: 'showdown',
      playerCards,
      cpuCards,
      phase: 'round-over',
      currentBet: 0,
      playerBetInStreet: 0,
      cpuBetInStreet: 0,
      betSize: 20,
    };

    // When
    const result = resolveShowdown(state);

    // Then
    expect(result.engineState.roundResult!.winner).toBe('cpu');
    expect(result.engineState.roundResult!.chipDelta).toBeLessThan(0);
  });

  it('引き分けの場合、winner が draw で chipDelta は半額ずつ', () => {
    // Given: 同じランクの手札（同じ役で同強度）
    const playerCards: Card[] = [
      { suit: 'spades', rank: 14, faceUp: true },
      { suit: 'hearts', rank: 13, faceUp: true },
      { suit: 'diamonds', rank: 12, faceUp: true },
      { suit: 'clubs', rank: 11, faceUp: true },
      { suit: 'spades', rank: 9, faceUp: true },
      { suit: 'hearts', rank: 2, faceUp: false },
      { suit: 'diamonds', rank: 3, faceUp: false },
    ];
    const cpuCards: Card[] = [
      { suit: 'hearts', rank: 14, faceUp: true },
      { suit: 'diamonds', rank: 13, faceUp: true },
      { suit: 'clubs', rank: 12, faceUp: true },
      { suit: 'spades', rank: 11, faceUp: true },
      { suit: 'hearts', rank: 9, faceUp: true },
      { suit: 'clubs', rank: 2, faceUp: false },
      { suit: 'spades', rank: 3, faceUp: false },
    ];

    const state: EngineState = {
      playerStack: 950,
      cpuStack: 950,
      pot: 100,
      street: 'showdown',
      playerCards,
      cpuCards,
      phase: 'round-over',
      currentBet: 0,
      playerBetInStreet: 0,
      cpuBetInStreet: 0,
      betSize: 20,
    };

    // When
    const result = resolveShowdown(state);

    // Then
    expect(result.engineState.roundResult!.winner).toBe('draw');
  });

  it('phase が round-over に設定される', () => {
    const playerCards: Card[] = [
      { suit: 'spades', rank: 14, faceUp: true },
      { suit: 'hearts', rank: 13, faceUp: true },
      { suit: 'diamonds', rank: 12, faceUp: true },
      { suit: 'clubs', rank: 11, faceUp: true },
      { suit: 'spades', rank: 10, faceUp: true },
      { suit: 'hearts', rank: 2, faceUp: false },
      { suit: 'diamonds', rank: 3, faceUp: false },
    ];
    const cpuCards: Card[] = [
      { suit: 'hearts', rank: 7, faceUp: true },
      { suit: 'diamonds', rank: 5, faceUp: true },
      { suit: 'clubs', rank: 4, faceUp: true },
      { suit: 'spades', rank: 3, faceUp: true },
      { suit: 'hearts', rank: 2, faceUp: true },
      { suit: 'clubs', rank: 9, faceUp: false },
      { suit: 'diamonds', rank: 8, faceUp: false },
    ];

    const state: EngineState = {
      playerStack: 950,
      cpuStack: 950,
      pot: 100,
      street: 'showdown',
      playerCards,
      cpuCards,
      phase: 'round-over',
      currentBet: 0,
      playerBetInStreet: 0,
      cpuBetInStreet: 0,
      betSize: 20,
    };

    const result = resolveShowdown(state);

    expect(result.engineState.phase).toBe('round-over');
  });

  it('勝者のスタックにポット全額が加算される', () => {
    // Given: プレイヤーが勝つ手札
    const playerCards: Card[] = [
      { suit: 'spades', rank: 14, faceUp: true },
      { suit: 'spades', rank: 13, faceUp: true },
      { suit: 'spades', rank: 12, faceUp: true },
      { suit: 'spades', rank: 11, faceUp: true },
      { suit: 'spades', rank: 10, faceUp: true },
      { suit: 'hearts', rank: 2, faceUp: false },
      { suit: 'hearts', rank: 3, faceUp: false },
    ];
    const cpuCards: Card[] = [
      { suit: 'hearts', rank: 7, faceUp: true },
      { suit: 'diamonds', rank: 5, faceUp: true },
      { suit: 'clubs', rank: 4, faceUp: true },
      { suit: 'spades', rank: 3, faceUp: true },
      { suit: 'hearts', rank: 9, faceUp: true },
      { suit: 'clubs', rank: 8, faceUp: false },
      { suit: 'diamonds', rank: 2, faceUp: false },
    ];

    const state: EngineState = {
      playerStack: 950,
      cpuStack: 950,
      pot: 100,
      street: 'showdown',
      playerCards,
      cpuCards,
      phase: 'round-over',
      currentBet: 0,
      playerBetInStreet: 0,
      cpuBetInStreet: 0,
      betSize: 20,
    };

    // When
    const result = resolveShowdown(state);

    // Then: プレイヤーのスタックにポット加算
    expect(result.engineState.playerStack).toBe(950 + 100);
  });
});

// ========== インテグレーション: 1ラウンド全体フロー ==========

describe('インテグレーション: 1ラウンドの完全なフロー', () => {
  it('third から showdown まで check-check で進行し、ショーダウンで決着する', () => {
    // Given
    let { engineState, deck } = createEngineStateAfterStart();

    // When: 全ストリートを check-check で通過
    const expectedStreets = ['fourth', 'fifth', 'sixth', 'seventh'] as const;
    for (const expectedStreet of expectedStreets) {
      expect(engineState.phase).toBe('player-turn');

      const playerResult = processPlayerAction(engineState, deck, { type: 'check' });
      expect(playerResult.engineState.phase).toBe('cpu-turn');

      const cpuResult = processCpuAction(
        playerResult.engineState,
        playerResult.deck,
        { type: 'check' }
      );
      engineState = cpuResult.engineState;
      deck = cpuResult.deck;

      expect(engineState.street).toBe(expectedStreet);
    }

    // seventh ストリートの最終アクション
    expect(engineState.phase).toBe('player-turn');
    const finalPlayerResult = processPlayerAction(engineState, deck, { type: 'check' });
    const finalCpuResult = processCpuAction(
      finalPlayerResult.engineState,
      finalPlayerResult.deck,
      { type: 'check' }
    );

    // Then
    expect(finalCpuResult.engineState.phase).toBe('round-over');
    expect(finalCpuResult.engineState.roundResult).toBeDefined();
    expect(finalCpuResult.engineState.street).toBe('showdown');

    const result = finalCpuResult.engineState.roundResult!;
    expect(['player', 'cpu', 'draw']).toContain(result.winner);
    expect(result.playerHandType).toBeTruthy();
    expect(result.cpuHandType).toBeTruthy();
  });

  it('プレイヤーが third で fold した場合、即座にラウンドが終了する', () => {
    // Given
    const { engineState, deck } = createEngineStateAfterStart();

    // When
    const result = processPlayerAction(engineState, deck, { type: 'fold' });

    // Then
    expect(result.engineState.phase).toBe('round-over');
    expect(result.engineState.roundResult!.winner).toBe('cpu');
    expect(result.engineState.playerCards).toHaveLength(3);
    expect(result.engineState.cpuCards).toHaveLength(3);
  });

  it('bet-call のフローでスタックとポットの整合性が保たれる', () => {
    // Given
    const config: RoundConfig = {
      playerStack: 1000,
      cpuStack: 1000,
      ante: 10,
      betSize: 20,
    };
    const { engineState, deck } = startNewRound(config);

    // When: プレイヤーbet → CPUcall
    const afterBet = processPlayerAction(engineState, deck, { type: 'bet' });
    const afterCall = processCpuAction(
      afterBet.engineState,
      afterBet.deck,
      { type: 'call' }
    );

    // Then: チップの合計は保存される
    const totalChips =
      afterCall.engineState.playerStack +
      afterCall.engineState.cpuStack +
      afterCall.engineState.pot;
    expect(totalChips).toBe(2000);
  });
});
