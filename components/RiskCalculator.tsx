'use client';

/**
 * RiskCalculator — 투자금 시뮬레이터
 * "내 3억으로 얼마나 투자하라는 건지" 구체적 금액으로 보여줌
 * 60대가 직관적으로 이해 가능한 시나리오 3가지 제시
 */

import { useState } from 'react';
import type { SignalResult } from '@/lib/scoring/types';

interface Props {
  data: Pick<SignalResult, 'grade' | 'finalScore' | 'tradeSetup' | 'direction'>;
  currentPrice: number;
}

// 등급별 기본 Kelly %
const GRADE_KELLY: Record<string, number> = {
  S: 15, A: 10, B: 6, C: 0, NO_TRADE: 0, F: 0,
};

export default function RiskCalculator({ data, currentPrice }: Props) {
  // 투자금 입력 (기본 3억)
  const [capital, setCapital] = useState(300000000);

  // Kelly % — tradeSetup이 있으면 거기서 가져오고, 없으면 등급 기본값
  const kellyPct = data.tradeSetup?.kellyPct ?? GRADE_KELLY[data.grade] ?? 0;

  // 투자 권장 금액
  const investAmount = Math.round(capital * (kellyPct / 100));

  // BTC 매수 수량 (현재가 기준)
  const btcAmount = currentPrice > 0 ? (investAmount / currentPrice) : 0;

  // 시나리오 계산
  const tp1Price = data.tradeSetup?.tp1 ?? currentPrice * 1.15;
  const slPrice = data.tradeSetup?.stopLoss ?? currentPrice * 0.9;

  const bestReturn = ((tp1Price - currentPrice) / currentPrice) * investAmount;
  const worstReturn = ((slPrice - currentPrice) / currentPrice) * investAmount;

  // 한국 원 포맷
  const fmtKrw = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 100000000) return `${(n / 100000000).toFixed(1)}억원`;
    if (abs >= 10000) return `${Math.round(n / 10000).toLocaleString()}만원`;
    return `${n.toLocaleString()}원`;
  };

  // 매매 불가 등급
  const noTrade = data.grade === 'NO_TRADE' || data.grade === 'F' || data.grade === 'C';

  return (
    <div className="card-fintech p-5">
      {/* 헤더 */}
      <div className="text-xs font-semibold tracking-wider mb-4" style={{ color: '#9098b1' }}>
        투자금 시뮬레이터
      </div>

      {/* 투자금 입력 */}
      <div className="mb-4">
        <div className="text-xs mb-2" style={{ color: '#5b6178' }}>내 투자 가능 금액</div>
        <div className="flex gap-2">
          {[100000000, 300000000, 500000000, 1000000000].map(amt => (
            <button
              key={amt}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                background: capital === amt ? '#7c5cfc' : '#f0f2f5',
                color: capital === amt ? 'white' : '#5b6178',
              }}
              onClick={() => setCapital(amt)}
            >
              {fmtKrw(amt)}
            </button>
          ))}
        </div>
      </div>

      {noTrade ? (
        /* ─── 매매 불가 상태 ─── */
        <div className="p-4 rounded-xl text-center" style={{ background: '#f8f9fc' }}>
          <div className="text-lg font-bold mb-1" style={{ color: '#94a3b8' }}>
            현재 투자 권장하지 않음
          </div>
          <p className="text-xs" style={{ color: '#9098b1' }}>
            {data.grade === 'NO_TRADE' && '시장 방향이 불분명합니다. 현금 보유가 최선입니다.'}
            {data.grade === 'F' && '하락 신호가 강합니다. 투자하지 마세요.'}
            {data.grade === 'C' && '리스크가 높습니다. 더 좋은 기회를 기다리세요.'}
          </p>
          <div className="mt-3 text-2xl font-black" style={{ color: '#1a1d2e' }}>
            {fmtKrw(capital)} → 전액 현금 보유
          </div>
        </div>
      ) : (
        /* ─── 매매 가능 상태 ─── */
        <div className="space-y-3">
          {/* 권장 투자금 */}
          <div className="p-4 rounded-xl" style={{ background: '#7c5cfc08', border: '1px solid #7c5cfc20' }}>
            <div className="text-xs mb-1" style={{ color: '#7c5cfc' }}>
              시스템 권장 (Kelly {kellyPct}%)
            </div>
            <div className="text-2xl font-black" style={{ color: '#1a1d2e' }}>
              {fmtKrw(investAmount)} 투자
            </div>
            <div className="text-xs mt-1" style={{ color: '#9098b1' }}>
              {fmtKrw(capital)} 중 {kellyPct}% · BTC {btcAmount.toFixed(4)}개
            </div>
          </div>

          {/* 3가지 시나리오 */}
          <div className="grid grid-cols-3 gap-2">
            {/* 최선 */}
            <div className="p-3 rounded-xl text-center" style={{ background: '#00c47108' }}>
              <div className="text-xs mb-1" style={{ color: '#00c471' }}>1차 목표 도달</div>
              <div className="text-lg font-bold" style={{ color: '#00c471' }}>
                +{fmtKrw(Math.round(bestReturn))}
              </div>
              <div className="text-xs" style={{ color: '#9098b1' }}>
                ${Math.round(tp1Price).toLocaleString()}
              </div>
            </div>

            {/* 횡보 */}
            <div className="p-3 rounded-xl text-center" style={{ background: '#f8f9fc' }}>
              <div className="text-xs mb-1" style={{ color: '#9098b1' }}>현재 유지</div>
              <div className="text-lg font-bold" style={{ color: '#5b6178' }}>
                ±0원
              </div>
              <div className="text-xs" style={{ color: '#9098b1' }}>
                ${Math.round(currentPrice).toLocaleString()}
              </div>
            </div>

            {/* 손절 */}
            <div className="p-3 rounded-xl text-center" style={{ background: '#ef444408' }}>
              <div className="text-xs mb-1" style={{ color: '#ef4444' }}>손절 시</div>
              <div className="text-lg font-bold" style={{ color: '#ef4444' }}>
                {fmtKrw(Math.round(worstReturn))}
              </div>
              <div className="text-xs" style={{ color: '#9098b1' }}>
                ${Math.round(slPrice).toLocaleString()}
              </div>
            </div>
          </div>

          {/* 나머지 현금 */}
          <div className="text-xs text-center" style={{ color: '#b4bcd0' }}>
            나머지 {fmtKrw(capital - investAmount)}은 현금으로 안전하게 보관
          </div>
        </div>
      )}
    </div>
  );
}
