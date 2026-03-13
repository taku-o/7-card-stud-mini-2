import type { Card } from './card';
import type { EngineState, PlayerAction } from './gameEngine';
import { evaluateHand, type HandType } from './handEvaluator';

export type CpuStrategyOptions = {
  aggression: number;
  tightness: number;
};

export const PRESET_TIGHT: CpuStrategyOptions = {
  aggression: 0.3,
  tightness: 0.7,
};

export const PRESET_LOOSE: CpuStrategyOptions = {
  aggression: 0.7,
  tightness: 0.3,
};

export const PRESET_DEFAULT: CpuStrategyOptions = {
  aggression: 0.5,
  tightness: 0.5,
};

const HAND_STRENGTH: Record<HandType, number> = {
  'high-card': 0.1,
  'one-pair': 0.25,
  'two-pair': 0.4,
  'three-of-a-kind': 0.55,
  'straight': 0.65,
  'flush': 0.7,
  'full-house': 0.8,
  'four-of-a-kind': 0.9,
  'straight-flush': 0.95,
  'royal-flush': 1.0,
};

function computeHandStrength(cards: Card[]): number {
  const hand = evaluateHand(cards);
  return HAND_STRENGTH[hand.type];
}

export function decideAction(
  state: EngineState,
  options: CpuStrategyOptions,
  random: () => number,
): PlayerAction {
  const strength = computeHandStrength(state.cpuCards);
  const roll = random();

  if (state.currentBet === 0) {
    return decideWithNoBet(strength, options, roll);
  }
  return decideWithBet(strength, options, roll);
}

function decideWithNoBet(
  strength: number,
  options: CpuStrategyOptions,
  roll: number,
): PlayerAction {
  const betProb = strength * (0.3 + options.aggression * 0.5);
  const foldProb = (1 - strength) * options.tightness * 0.1;

  if (roll < betProb) return { type: 'bet' };
  if (roll < betProb + foldProb) return { type: 'fold' };
  return { type: 'check' };
}

function decideWithBet(
  strength: number,
  options: CpuStrategyOptions,
  roll: number,
): PlayerAction {
  const callProb =
    0.15 + strength * (0.5 + (1 - options.tightness) * 0.35);

  if (roll < callProb) return { type: 'call' };
  return { type: 'fold' };
}
