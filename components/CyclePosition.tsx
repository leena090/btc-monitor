'use client';

/**
 * CyclePosition — 반감기 후 경과 개월 + 페이즈 + 피보나치 레벨 + 다음 반감기
 */

import type { CycleData } from '@/lib/scoring/types';

interface Props {
  cycle: CycleData;
  currentPrice: number;
}

// 페이즈별 스타일
const PHASE_STYLES = {
  accumulation: { label: '초기 축적',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  range: '0~6개월' },
  bull_run:     { label: '상승 가속',   color: '#00ff88', bg: 'rgba(0,255,136,0.12)',   range: '6~18개월' },
  late_cycle:   { label: '후기/조정',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  range: '18~30개월' },
  bear_bottom:  { label: '바닥 형성',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   range: '30~48개월' },
};

// 피보나치 레벨 시각화 데이터
const FIB_LEVELS = [
  { pct: 0.000, price: 126200, label: '0.000 (ATH)' },
  { pct: 0.236, price: 100100, label: '0.236' },
  { pct: 0.382, price:  83900, label: '0.382' },
  { pct: 0.500, price:  70850, label: '0.500' },
  { pct: 0.618, price:  57800, label: '0.618' },
  { pct: 0.786, price:  39400, label: '0.786' },
  { pct: 1.000, price:  15500, label: '1.000 (저점)' },
];

export default function CyclePosition({ cycle, currentPrice }: Props) {
  const phase = PHASE_STYLES[cycle.phase];

  // 다음 반감기 날짜 포맷
  const nextHalving = new Date(cycle.nextHalvingDate).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // 사이클 타임라인 진행률 (0~48개월 기준)
  const cycleProgressPct = Math.min((cycle.monthsSinceHalving / 48) * 100, 100);

  // 현재 가격이 피보나치 레벨에서 어느 위치인지 (0%=ATH, 100%=저점)
  const priceRange = 126200 - 15500;
  const pricePosition = Math.max(0, Math.min(100, ((126200 - currentPrice) / priceRange) * 100));

  return (
    <div className="p-5 rounded-xl border border-white/8 h-full"
         style={{ background: '#12121a' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold tracking-widest"
            style={{ color: '#64748b' }}>
          4년 사이클
        </h3>
        {/* 페이즈 배지 */}
        <span className="px-2 py-0.5 rounded text-xs font-semibold"
              style={{ background: phase.bg, color: phase.color }}>
          {phase.label} ({phase.range})
        </span>
      </div>

      {/* 반감기 경과 월수 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: '#94a3b8' }}>
            2024 반감기 이후
          </span>
          <span className="text-xl font-bold tabular-nums"
                style={{ color: phase.color }}>
            {cycle.monthsSinceHalving}개월
          </span>
        </div>

        {/* 사이클 타임라인 바 (0~48개월) */}
        <div className="relative h-3 rounded-full overflow-hidden"
             style={{ background: 'rgba(255,255,255,0.06)' }}>
          {/* 페이즈 구분선들 */}
          <div className="absolute top-0 bottom-0 w-px"
               style={{ left: '12.5%', background: 'rgba(255,255,255,0.1)' }} /> {/* 6개월 */}
          <div className="absolute top-0 bottom-0 w-px"
               style={{ left: '37.5%', background: 'rgba(255,255,255,0.1)' }} /> {/* 18개월 */}
          <div className="absolute top-0 bottom-0 w-px"
               style={{ left: '62.5%', background: 'rgba(255,255,255,0.1)' }} /> {/* 30개월 */}

          {/* 진행 바 */}
          <div className="absolute top-0 left-0 bottom-0 transition-all duration-700"
               style={{
                 width: `${cycleProgressPct}%`,
                 background: `linear-gradient(90deg, #3b82f6, ${phase.color})`,
                 opacity: 0.7,
               }} />

          {/* 현재 위치 점 */}
          <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
               style={{
                 left: `calc(${cycleProgressPct}% - 4px)`,
                 background: phase.color,
                 boxShadow: `0 0 6px ${phase.color}`,
               }} />
        </div>

        {/* 타임라인 레이블 */}
        <div className="flex justify-between text-xs mt-1" style={{ color: '#475569' }}>
          <span>반감기</span>
          <span>6mo</span>
          <span>18mo</span>
          <span>30mo</span>
          <span>48mo</span>
        </div>
      </div>

      {/* 피보나치 레벨 시각화 */}
      <div className="mb-4">
        <div className="text-xs font-semibold mb-2" style={{ color: '#475569' }}>
          피보나치 되돌림 — 현재 위치
        </div>

        <div className="relative">
          {/* 수직 바 (ATH ~ 저점) */}
          <div className="relative h-40 flex">
            {/* 왼쪽: 피보나치 레벨 선 */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-3 w-1.5 rounded-full"
                   style={{ background: 'rgba(255,255,255,0.06)' }}>
                {/* 현재가 위치 표시 */}
                <div className="absolute w-3 h-1 rounded-full -left-0.5"
                     style={{
                       top: `${pricePosition}%`,
                       background: '#f59e0b',
                       boxShadow: '0 0 6px #f59e0b',
                       transform: 'translateY(-50%)',
                     }} />
              </div>

              {/* 피보나치 레벨 라인들 */}
              {FIB_LEVELS.map(({ pct, price, label }) => {
                const posY = pct * 100;
                const isNearCurrent = Math.abs(currentPrice - price) < 5000;
                return (
                  <div key={label}
                       className="absolute right-0 flex items-center gap-2"
                       style={{ top: `${posY}%`, transform: 'translateY(-50%)' }}>
                    <div className="w-2 h-px"
                         style={{ background: isNearCurrent ? '#f59e0b' : 'rgba(255,255,255,0.15)' }} />
                    <span className="text-xs tabular-nums"
                          style={{ color: isNearCurrent ? '#f59e0b' : '#475569' }}>
                      {label}
                    </span>
                    <span className="text-xs tabular-nums"
                          style={{ color: isNearCurrent ? '#f59e0b' : '#475569' }}>
                      ${price.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 현재 피보나치 레벨 */}
        <div className="text-xs mt-1" style={{ color: '#f59e0b' }}>
          현재: {cycle.fibLevel} (ATH 대비 -{cycle.athDrawdown.toFixed(1)}%)
        </div>
      </div>

      {/* 다음 반감기 */}
      <div className="flex items-center justify-between pt-3 border-t border-white/8">
        <span className="text-xs" style={{ color: '#64748b' }}>다음 반감기</span>
        <div className="text-right">
          <div className="text-xs font-medium" style={{ color: '#e2e8f0' }}>{nextHalving}</div>
          <div className="text-xs" style={{ color: '#475569' }}>
            약 {cycle.daysUntilNextHalving}일 후
          </div>
        </div>
      </div>
    </div>
  );
}
