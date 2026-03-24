/**
 * 카테고리 5: ETF 유출입 + 베이시스 (가중치 10%)
 * 채점 기준: signal-scoring-algorithm.md Cat5 기준
 *
 * CME 베이시스 조정 → 진짜 수요 비율 계산 → 조정된 ETF 점수 산출
 *
 * 서브항목:
 *  - CME 베이시스 계산 (먼저 수행)
 *  - ETF 7일 누적 조정 후 점수: -4 ~ +4
 *  - 백워데이션 보너스: +2 (희귀 이벤트)
 *
 * 원점수 → 최대 +6 / 최소 -4 → -10~+10 정규화
 */

import type { CategoryScore, EtfFlowsInput } from '../types';

/**
 * CME 베이시스 연환산 계산
 * basis_annual = (선물가 - 현물가) / 현물가 × 365 / 잔여일수
 *
 * 베이시스 조정 계수:
 *  > 10%: 진짜 확신 비율 = 65%
 *  5~10%: 진짜 확신 비율 = 80%
 *  < 5%: 진짜 확신 비율 = 95%
 *  < 0%: 백워데이션 (역사적 바닥 신호)
 */
function calculateBasisAnnualized(input: EtfFlowsInput): {
  basisAnnualized: number;
  conviction: number;
  isBackwardation: boolean;
  detail: string;
} {
  const { cmePrice, spotPrice, cmeDaysToExpiry } = input;

  // 잔여일수가 0이면 나누기 오류 방지
  if (cmeDaysToExpiry <= 0) {
    return { basisAnnualized: 0, conviction: 0.95, isBackwardation: false, detail: 'CME 만기 데이터 없음 → 기본 95% 적용' };
  }

  const basisAnnualized = ((cmePrice - spotPrice) / spotPrice) * (365 / cmeDaysToExpiry) * 100;
  const isBackwardation = basisAnnualized < 0;

  let conviction: number;
  let convictionLabel: string;

  if (basisAnnualized > 10) {
    conviction = 0.65;
    convictionLabel = '65% (차익 35%)';
  } else if (basisAnnualized >= 5) {
    conviction = 0.80;
    convictionLabel = '80% (차익 20%)';
  } else if (basisAnnualized >= 0) {
    conviction = 0.95;
    convictionLabel = '95% (거의 순수 수요)';
  } else {
    // 백워데이션
    conviction = 1.0;
    convictionLabel = '100% + 백워데이션 보너스';
  }

  return {
    basisAnnualized,
    conviction,
    isBackwardation,
    detail: `CME 베이시스: ${basisAnnualized.toFixed(2)}% 연환산 → 진짜 확신 비율 ${convictionLabel}`,
  };
}

/**
 * ETF 7일 누적 조정 점수 계산
 * 베이시스 조정 후 순유입 기준:
 *  $500M+ 유입: +4
 *  $100M~$500M 유입: +2
 *  중립 (-$100M ~ $100M): 0
 *  $100M~$500M 유출: -2
 *  $500M+ 유출: -4
 */
function scoreEtfFlow(adjustedFlowM: number): { score: number; detail: string } {
  if (adjustedFlowM >= 500) {
    return { score: 4, detail: `조정 후 ETF 7일 유입: $${adjustedFlowM.toFixed(0)}M (기관 강한 매수) → +4` };
  } else if (adjustedFlowM >= 100) {
    return { score: 2, detail: `조정 후 ETF 7일 유입: $${adjustedFlowM.toFixed(0)}M → +2` };
  } else if (adjustedFlowM >= -100) {
    return { score: 0, detail: `조정 후 ETF 7일 유입: $${adjustedFlowM.toFixed(0)}M (중립) → 0` };
  } else if (adjustedFlowM >= -500) {
    return { score: -2, detail: `조정 후 ETF 7일 유출: $${Math.abs(adjustedFlowM).toFixed(0)}M → -2` };
  } else {
    return { score: -4, detail: `조정 후 ETF 7일 유출: $${Math.abs(adjustedFlowM).toFixed(0)}M (대규모 유출) → -4` };
  }
}

/**
 * 카테고리 5 최종 점수 계산
 */
export function scoreEtfFlows(input: EtfFlowsInput): CategoryScore {
  const basisResult = calculateBasisAnnualized(input);

  // 베이시스 조정 적용: 순유입에 진짜 확신 비율 곱하기
  const adjustedFlowM = input.etf7dNetFlowM * basisResult.conviction;
  const flowScore = scoreEtfFlow(adjustedFlowM);

  // 백워데이션 보너스 (역사적 바닥 신호)
  const backwardationBonus = basisResult.isBackwardation ? 2 : 0;
  const backwardationDetail = basisResult.isBackwardation
    ? `백워데이션 감지 → 역사적 바닥 신호 보너스 → +2`
    : `백워데이션 없음 → 보너스 없음`;

  // 원점수 합산 후 최대 +6, 최소 -4 범위 → -10~+10 정규화
  const rawTotal = flowScore.score + backwardationBonus;
  // 최대 6 기준 10 스케일로 변환
  const normalized = rawTotal >= 0
    ? (rawTotal / 6) * 10
    : (rawTotal / 4) * 10;
  const rawScore = Math.max(-10, Math.min(10, normalized));

  const weightedScore = rawScore * 0.10;

  return {
    id: 5,
    name: 'ETF 유출입 + 베이시스',
    weight: 0.10,
    rawScore,
    weightedScore,
    details: [basisResult.detail, flowScore.detail, backwardationDetail],
    dataFreshness: input.dataFreshness,
  };
}
