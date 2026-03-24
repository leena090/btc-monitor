'use client';

/**
 * CycleTimeline — 반감기 사이클 시각화 (라이트 핀테크 스타일)
 * 4번의 반감기를 타임라인으로 표시 + 현재 위치 + 각 사이클 수익률
 * 60대가 "지금 어디 있는지" 직관적으로 파악 가능
 */

import { HALVING_CYCLES } from '@/lib/backtest/historical-data';

interface Props {
  /** 현재 반감기 후 경과 개월수 */
  monthsSinceHalving?: number;
}

export default function CycleTimeline({ monthsSinceHalving }: Props) {
  const currentMonths = monthsSinceHalving ?? 23;

  // 사이클 평균 ATH 도달 기간 (전체 4개 사이클)
  const avgMonthsToAth = Math.round(
    HALVING_CYCLES.reduce((s, c) => s + c.monthsToAth, 0) / HALVING_CYCLES.length
  ); // ~16개월

  // 사이클 평균 수익률 (반감기→ATH, 1~3 사이클)
  const avgReturnToAth = Math.round(
    HALVING_CYCLES.slice(0, 3).reduce((s, c) => s + c.returnToAth, 0) / 3
  );

  return (
    <div className="card-fintech p-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold tracking-wider" style={{ color: '#9098b1' }}>
          반감기 사이클 위치
        </span>
        <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#7c5cfc12', color: '#7c5cfc' }}>
          4차 사이클 진행 중
        </span>
      </div>

      {/* 현재 위치 강조 */}
      <div className="text-center mb-5 p-4 rounded-xl" style={{ background: '#f8f9fc' }}>
        <div className="text-sm mb-1" style={{ color: '#5b6178' }}>
          2024년 반감기 이후
        </div>
        <div className="text-3xl font-black" style={{ color: '#1a1d2e' }}>
          {currentMonths}개월째
        </div>
        <div className="text-xs mt-1" style={{ color: '#9098b1' }}>
          역사적 ATH 평균 도달: {avgMonthsToAth}개월
        </div>
      </div>

      {/* 타임라인 바 */}
      <div className="relative mb-6">
        {/* 배경 바 (0~48개월) */}
        <div className="h-3 rounded-full" style={{ background: '#f0f2f5' }}>
          {/* 진행 바 */}
          <div
            className="h-3 rounded-full transition-all duration-700"
            style={{
              width: `${Math.min((currentMonths / 48) * 100, 100)}%`,
              background: 'linear-gradient(90deg, #7c5cfc, #3b82f6)',
            }}
          />
        </div>

        {/* 현재 위치 점 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white"
          style={{
            left: `calc(${Math.min((currentMonths / 48) * 100, 100)}% - 8px)`,
            background: '#7c5cfc',
            boxShadow: '0 2px 8px rgba(124,92,252,0.4)',
          }}
        />

        {/* 평균 ATH 위치 마커 */}
        <div
          className="absolute top-full mt-1 text-xs"
          style={{
            left: `${(avgMonthsToAth / 48) * 100}%`,
            transform: 'translateX(-50%)',
            color: '#f59e0b',
          }}
        >
          ▲ 평균 ATH
        </div>

        {/* 타임라인 라벨 */}
        <div className="flex justify-between text-xs mt-4" style={{ color: '#b4bcd0' }}>
          <span>반감기</span>
          <span>12개월</span>
          <span>24개월</span>
          <span>36개월</span>
          <span>48개월</span>
        </div>
      </div>

      {/* 4개 사이클 비교 카드 */}
      <div className="space-y-2">
        {HALVING_CYCLES.map((cycle) => {
          const isCurrent = cycle.number === 4;
          return (
            <div
              key={cycle.number}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{
                background: isCurrent ? '#7c5cfc08' : '#f8f9fc',
                border: isCurrent ? '1px solid #7c5cfc20' : '1px solid transparent',
              }}
            >
              {/* 사이클 번호 + 날짜 */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                     style={{
                       background: isCurrent ? '#7c5cfc' : '#e2e8f0',
                       color: isCurrent ? 'white' : '#5b6178',
                     }}>
                  {cycle.number}
                </div>
                <div>
                  <div className="text-xs font-medium" style={{ color: '#1a1d2e' }}>
                    {cycle.halvingDate.slice(0, 4)}년 반감기
                  </div>
                  <div className="text-xs" style={{ color: '#9098b1' }}>
                    ${cycle.halvingPrice.toLocaleString()} → ${cycle.athPrice.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 수익률 + ATH 기간 */}
              <div className="text-right">
                <div className="text-sm font-bold" style={{ color: '#00c471' }}>
                  +{cycle.returnToAth.toLocaleString()}%
                </div>
                <div className="text-xs" style={{ color: '#9098b1' }}>
                  {cycle.monthsToAth}개월{isCurrent ? ' (진행중)' : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 면책 */}
      <div className="mt-3 pt-3 text-xs text-center" style={{ borderTop: '1px solid #f0f2f5', color: '#b4bcd0' }}>
        과거 사이클이 반복될 보장은 없습니다. 각 사이클의 상승폭은 감소 추세입니다.
      </div>
    </div>
  );
}
