'use client';

/**
 * OnchainPanel — MVRV + STH 실현가격 + 거래소 BTC 보유량 추세
 */

import type { OnchainData } from '@/lib/scoring/types';

interface Props {
  onchain: OnchainData;
  currentPrice: number;
}

// MVRV 상태별 색상/레이블
const MVRV_STYLES = {
  undervalued: { label: '저평가',       color: '#00ff88', bg: 'rgba(0,255,136,0.12)',  range: '< 1.0' },
  fair:        { label: '공정가치',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', range: '1.0~2.4' },
  overvalued:  { label: '고평가',       color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', range: '2.4~3.7' },
  bubble:      { label: '버블 경계',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  range: '> 3.7' },
};

// 거래소 보유량 추세 스타일
const RESERVE_TREND_STYLES = {
  down: { icon: '↓', label: '감소 (BTC 이탈 — 축적 신호)',  color: '#00ff88' },
  up:   { icon: '↑', label: '증가 (거래소 유입 — 매도 압력)', color: '#ef4444' },
  flat: { icon: '→', label: '보합',                          color: '#94a3b8' },
};

export default function OnchainPanel({ onchain, currentPrice }: Props) {
  const mvrvStyle = MVRV_STYLES[onchain.mvrvStatus];
  const reserveTrend = RESERVE_TREND_STYLES[onchain.exchangeReserveTrend];

  // STH 실현가격과 현재가 비교
  const sthDiff = currentPrice - onchain.sthRealizedPrice;
  const sthDiffPct = ((sthDiff / onchain.sthRealizedPrice) * 100).toFixed(1);
  const sthAbove = sthDiff >= 0; // 현재가가 STH 원가 이상

  return (
    <div className="p-5 rounded-xl border border-white/5 h-full"
         style={{ background: '#12121a' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🏦</span>
          <h3 className="text-xs font-semibold tracking-widest"
              style={{ color: '#64748b' }}>
            온체인
          </h3>
        </div>
      </div>

      {/* MVRV 비율 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs" style={{ color: '#94a3b8' }}>MVRV 비율</span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold"
                  style={{ background: mvrvStyle.bg, color: mvrvStyle.color }}>
              {mvrvStyle.label} ({mvrvStyle.range})
            </span>
            <span className="text-xl font-bold tabular-nums"
                  style={{ color: mvrvStyle.color }}>
              {onchain.mvrv.toFixed(2)}
            </span>
          </div>
        </div>

        {/* MVRV 게이지 바 (0~5 범위) */}
        <div className="relative h-2 rounded-full overflow-hidden"
             style={{ background: 'rgba(255,255,255,0.06)' }}>
          {/* 1.0 레벨 선 */}
          <div className="absolute top-0 bottom-0 w-px"
               style={{ left: '20%', background: 'rgba(0,255,136,0.4)' }} />
          {/* 2.4 레벨 선 */}
          <div className="absolute top-0 bottom-0 w-px"
               style={{ left: '48%', background: 'rgba(245,158,11,0.4)' }} />
          {/* 3.7 레벨 선 */}
          <div className="absolute top-0 bottom-0 w-px"
               style={{ left: '74%', background: 'rgba(239,68,68,0.4)' }} />
          {/* 값 바 */}
          <div className="absolute top-0 left-0 bottom-0 rounded-full transition-all duration-700"
               style={{
                 width: `${Math.min((onchain.mvrv / 5) * 100, 100)}%`,
                 background: mvrvStyle.color,
                 opacity: 0.7,
               }} />
        </div>
        <div className="flex justify-between text-xs mt-0.5" style={{ color: '#334155' }}>
          <span>0</span><span>1.0</span><span>2.4</span><span>3.7</span><span>5.0</span>
        </div>
      </div>

      {/* STH 실현가격 */}
      <div className="flex items-center justify-between py-2.5 border-t border-white/5">
        <div>
          <div className="text-xs" style={{ color: '#64748b' }}>STH 실현가격</div>
          <div className="text-xs mt-0.5" style={{ color: '#334155' }}>
            단기 보유자 손익분기
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums"
               style={{ color: '#e2e8f0' }}>
            ${onchain.sthRealizedPrice.toLocaleString()}
          </div>
          <div className={`text-xs tabular-nums ${sthAbove ? 'text-emerald-400' : 'text-red-400'}`}>
            현재가 {sthAbove ? '+' : ''}{sthDiffPct}%
          </div>
        </div>
      </div>

      {/* 거래소 BTC 보유량 */}
      <div className="flex items-center justify-between py-2.5 border-t border-white/5">
        <div>
          <div className="text-xs" style={{ color: '#64748b' }}>거래소 BTC 보유량</div>
          <div className="text-xs mt-0.5" style={{ color: reserveTrend.color }}>
            {reserveTrend.icon} {reserveTrend.label}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums"
               style={{ color: '#e2e8f0' }}>
            {(onchain.exchangeReserve / 1000).toFixed(0)}K BTC
          </div>
        </div>
      </div>
    </div>
  );
}
