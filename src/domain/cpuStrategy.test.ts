import { describe, it, expect } from 'vitest';
import {
  decideAction,
  PRESET_TIGHT,
  PRESET_LOOSE,
  PRESET_DEFAULT,
  type CpuStrategyOptions,
} from './cpuStrategy';
import type { EngineState } from './gameEngine';
import type { Card } from './card';

// ========== テストヘルパー ==========

function createCpuCards(ranks: number[]): Card[] {
  const suits = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
  return ranks.map((rank, i) => ({
    suit: suits[i % suits.length]!,
    rank: rank as Card['rank'],
    faceUp: true,
  }));
}

function createBaseState(overrides: Partial<EngineState> = {}): EngineState {
  return {
    playerStack: 990,
    cpuStack: 990,
    pot: 20,
    street: 'third',
    playerCards: createCpuCards([14, 13, 12]),
    cpuCards: createCpuCards([7, 5, 3]),
    phase: 'cpu-turn',
    currentBet: 0,
    playerBetInStreet: 0,
    cpuBetInStreet: 0,
    betSize: 20,
    ...overrides,
  };
}

// 強い手: フルハウス（7,7,7,5,5,3,2）
function createStrongHandState(overrides: Partial<EngineState> = {}): EngineState {
  return createBaseState({
    cpuCards: createCpuCards([7, 7, 7, 5, 5, 3, 2]),
    street: 'seventh',
    ...overrides,
  });
}

// 弱い手: ハイカード（14,10,8,6,4,3,2）
function createWeakHandState(overrides: Partial<EngineState> = {}): EngineState {
  return createBaseState({
    cpuCards: createCpuCards([14, 10, 8, 6, 4, 3, 2]),
    street: 'seventh',
    ...overrides,
  });
}

// 中程度の手: ワンペア（10,10,8,6,4,3,2）
function createMediumHandState(overrides: Partial<EngineState> = {}): EngineState {
  return createBaseState({
    cpuCards: createCpuCards([10, 10, 8, 6, 4, 3, 2]),
    street: 'seventh',
    ...overrides,
  });
}

// ========== decideAction: 戻り値の型 ==========

describe('decideAction: 戻り値の型', () => {
  it('PlayerAction 型のオブジェクトを返す', () => {
    // Given
    const state = createBaseState();
    const options = PRESET_DEFAULT;

    // When
    const action = decideAction(state, options, () => 0.5);

    // Then
    expect(action).toHaveProperty('type');
    expect(['bet', 'call', 'fold', 'check']).toContain(action.type);
  });
});

// ========== decideAction: currentBet === 0 のときのアクション種別 ==========

describe('decideAction: currentBet === 0 のときのアクション種別', () => {
  it('bet, check, fold のいずれかを返す', () => {
    // Given
    const state = createBaseState({ currentBet: 0 });
    const options = PRESET_DEFAULT;

    // When
    const action = decideAction(state, options, () => 0.5);

    // Then
    expect(['bet', 'check', 'fold']).toContain(action.type);
  });

  it('call を返さない', () => {
    // Given
    const state = createBaseState({ currentBet: 0 });
    const options = PRESET_DEFAULT;

    // When: 様々なrandom値で試行
    const actions = Array.from({ length: 100 }, (_, i) =>
      decideAction(state, options, () => i / 100),
    );

    // Then
    expect(actions.every((a) => a.type !== 'call')).toBe(true);
  });
});

// ========== decideAction: currentBet > 0 のときのアクション種別 ==========

describe('decideAction: currentBet > 0 のときのアクション種別', () => {
  it('call, fold のいずれかを返す', () => {
    // Given
    const state = createBaseState({ currentBet: 20, playerBetInStreet: 20 });
    const options = PRESET_DEFAULT;

    // When
    const action = decideAction(state, options, () => 0.5);

    // Then
    expect(['call', 'fold']).toContain(action.type);
  });

  it('bet, check を返さない', () => {
    // Given
    const state = createBaseState({ currentBet: 20, playerBetInStreet: 20 });
    const options = PRESET_DEFAULT;

    // When
    const actions = Array.from({ length: 100 }, (_, i) =>
      decideAction(state, options, () => i / 100),
    );

    // Then
    expect(actions.every((a) => a.type !== 'bet' && a.type !== 'check')).toBe(true);
  });
});

// ========== decideAction: 強い手での挙動 ==========

describe('decideAction: 強い手での挙動', () => {
  it('currentBet === 0 のとき bet 傾向が高い', () => {
    // Given
    const state = createStrongHandState({ currentBet: 0 });
    const options = PRESET_DEFAULT;
    const trialCount = 100;

    // When
    const actions = Array.from({ length: trialCount }, (_, i) =>
      decideAction(state, options, () => i / trialCount),
    );
    const betCount = actions.filter((a) => a.type === 'bet').length;

    // Then: 強い手なので半数以上は bet するはず
    expect(betCount).toBeGreaterThan(trialCount * 0.4);
  });

  it('currentBet > 0 のとき call 傾向が高い', () => {
    // Given
    const state = createStrongHandState({ currentBet: 20, playerBetInStreet: 20 });
    const options = PRESET_DEFAULT;
    const trialCount = 100;

    // When
    const actions = Array.from({ length: trialCount }, (_, i) =>
      decideAction(state, options, () => i / trialCount),
    );
    const callCount = actions.filter((a) => a.type === 'call').length;

    // Then: 強い手なので大半は call するはず
    expect(callCount).toBeGreaterThan(trialCount * 0.6);
  });
});

// ========== decideAction: 弱い手での挙動 ==========

describe('decideAction: 弱い手での挙動', () => {
  it('currentBet > 0 のとき fold 傾向が高い', () => {
    // Given
    const state = createWeakHandState({ currentBet: 20, playerBetInStreet: 20 });
    const options = PRESET_DEFAULT;
    const trialCount = 100;

    // When
    const actions = Array.from({ length: trialCount }, (_, i) =>
      decideAction(state, options, () => i / trialCount),
    );
    const foldCount = actions.filter((a) => a.type === 'fold').length;

    // Then: 弱い手なので fold 率が高い
    expect(foldCount).toBeGreaterThan(trialCount * 0.3);
  });

  it('currentBet === 0 のとき check 傾向が高い', () => {
    // Given
    const state = createWeakHandState({ currentBet: 0 });
    const options = PRESET_DEFAULT;
    const trialCount = 100;

    // When
    const actions = Array.from({ length: trialCount }, (_, i) =>
      decideAction(state, options, () => i / trialCount),
    );
    const checkCount = actions.filter((a) => a.type === 'check').length;

    // Then: 弱い手なので check が多い
    expect(checkCount).toBeGreaterThan(trialCount * 0.3);
  });
});

// ========== decideAction: 極端行動の回避 ==========

describe('decideAction: 極端行動の回避', () => {
  it('弱い手でも100%フォールドにはならない（currentBet > 0）', () => {
    // Given
    const state = createWeakHandState({ currentBet: 20, playerBetInStreet: 20 });
    const options = PRESET_DEFAULT;
    const trialCount = 100;

    // When
    const actions = Array.from({ length: trialCount }, (_, i) =>
      decideAction(state, options, () => i / trialCount),
    );
    const foldCount = actions.filter((a) => a.type === 'fold').length;

    // Then: 100%フォールドにはならない
    expect(foldCount).toBeLessThan(trialCount);
  });

  it('強い手でも100%ベットにはならない（currentBet === 0）', () => {
    // Given
    const state = createStrongHandState({ currentBet: 0 });
    const options = PRESET_DEFAULT;
    const trialCount = 100;

    // When
    const actions = Array.from({ length: trialCount }, (_, i) =>
      decideAction(state, options, () => i / trialCount),
    );
    const betCount = actions.filter((a) => a.type === 'bet').length;

    // Then: 100%ベットにはならない
    expect(betCount).toBeLessThan(trialCount);
  });

  it('タイト設定でも常にフォールドしない', () => {
    // Given
    const state = createWeakHandState({ currentBet: 20, playerBetInStreet: 20 });
    const options = PRESET_TIGHT;
    const trialCount = 100;

    // When
    const actions = Array.from({ length: trialCount }, (_, i) =>
      decideAction(state, options, () => i / trialCount),
    );
    const callCount = actions.filter((a) => a.type === 'call').length;

    // Then: タイト設定でもコールが0にはならない
    expect(callCount).toBeGreaterThan(0);
  });
});

// ========== decideAction: tightness パラメータの影響 ==========

describe('decideAction: tightness パラメータの影響', () => {
  it('tightness が高いとフォールド率が上がる', () => {
    // Given
    const state = createMediumHandState({ currentBet: 20, playerBetInStreet: 20 });
    const tightOptions: CpuStrategyOptions = { aggression: 0.5, tightness: 0.8 };
    const looseOptions: CpuStrategyOptions = { aggression: 0.5, tightness: 0.2 };
    const trialCount = 100;

    // When
    const tightActions = Array.from({ length: trialCount }, (_, i) =>
      decideAction(state, tightOptions, () => i / trialCount),
    );
    const looseActions = Array.from({ length: trialCount }, (_, i) =>
      decideAction(state, looseOptions, () => i / trialCount),
    );
    const tightFoldCount = tightActions.filter((a) => a.type === 'fold').length;
    const looseFoldCount = looseActions.filter((a) => a.type === 'fold').length;

    // Then: タイト設定のほうがフォールド率が高い
    expect(tightFoldCount).toBeGreaterThan(looseFoldCount);
  });

  it('同じ手・同じrandom値でも tightness の違いでアクションが変わるケースがある', () => {
    // Given
    const state = createMediumHandState({ currentBet: 20, playerBetInStreet: 20 });
    const tightOptions: CpuStrategyOptions = { aggression: 0.5, tightness: 0.9 };
    const looseOptions: CpuStrategyOptions = { aggression: 0.5, tightness: 0.1 };

    // When: 複数のrandom値でテストし、少なくとも1つは異なるアクションがあることを確認
    const differences = Array.from({ length: 100 }, (_, i) => {
      const r = () => i / 100;
      const tightAction = decideAction(state, tightOptions, r);
      const looseAction = decideAction(state, looseOptions, r);
      return tightAction.type !== looseAction.type;
    });

    // Then
    expect(differences.some(Boolean)).toBe(true);
  });
});

// ========== decideAction: aggression パラメータの影響 ==========

describe('decideAction: aggression パラメータの影響', () => {
  it('aggression が高いとベット率が上がる（currentBet === 0）', () => {
    // Given
    const state = createMediumHandState({ currentBet: 0 });
    const aggressiveOptions: CpuStrategyOptions = { aggression: 0.9, tightness: 0.5 };
    const passiveOptions: CpuStrategyOptions = { aggression: 0.1, tightness: 0.5 };
    const trialCount = 100;

    // When
    const aggressiveActions = Array.from({ length: trialCount }, (_, i) =>
      decideAction(state, aggressiveOptions, () => i / trialCount),
    );
    const passiveActions = Array.from({ length: trialCount }, (_, i) =>
      decideAction(state, passiveOptions, () => i / trialCount),
    );
    const aggressiveBetCount = aggressiveActions.filter((a) => a.type === 'bet').length;
    const passiveBetCount = passiveActions.filter((a) => a.type === 'bet').length;

    // Then: アグレッシブ設定のほうがベット率が高い
    expect(aggressiveBetCount).toBeGreaterThan(passiveBetCount);
  });

  it('同じ手・同じrandom値でも aggression の違いでアクションが変わるケースがある', () => {
    // Given
    const state = createMediumHandState({ currentBet: 0 });
    const aggressiveOptions: CpuStrategyOptions = { aggression: 0.9, tightness: 0.5 };
    const passiveOptions: CpuStrategyOptions = { aggression: 0.1, tightness: 0.5 };

    // When
    const differences = Array.from({ length: 100 }, (_, i) => {
      const r = () => i / 100;
      const aggressiveAction = decideAction(state, aggressiveOptions, r);
      const passiveAction = decideAction(state, passiveOptions, r);
      return aggressiveAction.type !== passiveAction.type;
    });

    // Then
    expect(differences.some(Boolean)).toBe(true);
  });
});

// ========== decideAction: プリセット定義 ==========

describe('decideAction: プリセット定義', () => {
  it('PRESET_TIGHT が正しいパラメータを持つ', () => {
    expect(PRESET_TIGHT.tightness).toBeGreaterThan(PRESET_TIGHT.aggression);
  });

  it('PRESET_LOOSE が正しいパラメータを持つ', () => {
    expect(PRESET_LOOSE.aggression).toBeGreaterThan(PRESET_LOOSE.tightness);
  });

  it('PRESET_DEFAULT が中間的なパラメータを持つ', () => {
    expect(PRESET_DEFAULT.aggression).toBe(0.5);
    expect(PRESET_DEFAULT.tightness).toBe(0.5);
  });

  it('全プリセットが有効な PlayerAction を返す', () => {
    // Given
    const state = createBaseState();
    const presets = [PRESET_TIGHT, PRESET_LOOSE, PRESET_DEFAULT];

    // When & Then
    for (const preset of presets) {
      const action = decideAction(state, preset, () => 0.5);
      expect(['bet', 'call', 'fold', 'check']).toContain(action.type);
    }
  });
});

// ========== decideAction: random パラメータによるテスタビリティ ==========

describe('decideAction: random パラメータによるテスタビリティ', () => {
  it('同じ random 値で同じ結果を返す（再現性）', () => {
    // Given
    const state = createBaseState();
    const options = PRESET_DEFAULT;
    const fixedRandom = () => 0.42;

    // When
    const action1 = decideAction(state, options, fixedRandom);
    const action2 = decideAction(state, options, fixedRandom);

    // Then
    expect(action1.type).toBe(action2.type);
  });

  it('異なる random 値で異なる結果を返し得る', () => {
    // Given
    const state = createMediumHandState({ currentBet: 0 });
    const options = PRESET_DEFAULT;

    // When
    const actions = Array.from({ length: 100 }, (_, i) =>
      decideAction(state, options, () => i / 100),
    );
    const uniqueTypes = new Set(actions.map((a) => a.type));

    // Then: 少なくとも2種類のアクションが出るはず
    expect(uniqueTypes.size).toBeGreaterThanOrEqual(2);
  });
});

// ========== decideAction: 少ないカード枚数での動作 ==========

describe('decideAction: 少ないカード枚数での動作', () => {
  it('3枚（third ストリート）でも正常に動作する', () => {
    // Given
    const state = createBaseState({
      cpuCards: createCpuCards([14, 14, 7]),
      street: 'third',
    });
    const options = PRESET_DEFAULT;

    // When
    const action = decideAction(state, options, () => 0.5);

    // Then
    expect(['bet', 'call', 'fold', 'check']).toContain(action.type);
  });

  it('4枚（fourth ストリート）でも正常に動作する', () => {
    // Given
    const state = createBaseState({
      cpuCards: createCpuCards([14, 14, 7, 3]),
      street: 'fourth',
    });
    const options = PRESET_DEFAULT;

    // When
    const action = decideAction(state, options, () => 0.5);

    // Then
    expect(['bet', 'call', 'fold', 'check']).toContain(action.type);
  });
});

// ========== decideAction: 統計的テスト ==========

describe('decideAction: 統計的テスト', () => {
  it('100回試行してフォールド率が70%を超えない（極端な偏り回避）', () => {
    // Given
    const state = createMediumHandState({ currentBet: 20, playerBetInStreet: 20 });
    const options = PRESET_DEFAULT;
    const trialCount = 100;

    // When
    let foldCount = 0;
    for (let i = 0; i < trialCount; i++) {
      const action = decideAction(state, options, () => i / trialCount);
      if (action.type === 'fold') foldCount++;
    }

    // Then
    expect(foldCount).toBeLessThanOrEqual(trialCount * 0.7);
  });

  it('100回試行して少なくとも2種類のアクションが出る', () => {
    // Given
    const state = createMediumHandState({ currentBet: 0 });
    const options = PRESET_DEFAULT;
    const trialCount = 100;

    // When
    const actionTypes = new Set<string>();
    for (let i = 0; i < trialCount; i++) {
      const action = decideAction(state, options, () => i / trialCount);
      actionTypes.add(action.type);
    }

    // Then
    expect(actionTypes.size).toBeGreaterThanOrEqual(2);
  });

  it('PRESET_TIGHT と PRESET_LOOSE で統計的に明確な差が出る', () => {
    // Given
    const state = createMediumHandState({ currentBet: 20, playerBetInStreet: 20 });
    const trialCount = 100;

    // When
    let tightFoldCount = 0;
    let looseFoldCount = 0;
    for (let i = 0; i < trialCount; i++) {
      const r = () => i / trialCount;
      if (decideAction(state, PRESET_TIGHT, r).type === 'fold') tightFoldCount++;
      if (decideAction(state, PRESET_LOOSE, r).type === 'fold') looseFoldCount++;
    }

    // Then: タイトのほうがルースよりフォールド率が高い
    expect(tightFoldCount).toBeGreaterThan(looseFoldCount);
  });
});
