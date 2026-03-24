'use client';

/**
 * HeroVerdict — 3초 투자 판단 카드 (라이트 핀테크 스타일)
 * 화면의 주인공. 50대 퇴직금 투자자가 이것만 보고 판단 가능해야 함.
 * 레퍼런스: interfacely 핀테크 카드 디자인
 */

import type { SignalResult } from '@/lib/scoring/types';
import { VERDICT_MAP, CONFIDENCE_VERDICT, getSigmaVerdict } from '@/lib/verdict';

interface Props {
  data: Pick<SignalResult, 'finalScore' | 'grade' | 'confidence' | 'sigma' | 'rsiMacroBonus' | 'fibConfluenceBonus' | 'direction'>;
}

export default function HeroVerdict({ data }: Props) {
  const { finalScore, grade, confidence, sigma, rsiMacroBonus, fibConfluenceBonus, direction } = data;
  const verdict = VERDICT_MAP[grade];
  const confInfo = CONFIDENCE_VERDICT[confidence];
  const sigmaInfo = getSigmaVerdict(sigma);

  // 도넛 차트 계산 (원형 게이지)
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (finalScore / 100) * circumference;
  const empty = circumference - filled;

  return (
    <div
      className={`card-fintech relative overflow-hidden p-6 sm:p-8 ${verdict.pulse ? 'animate-hero-pulse' : ''}`}
      style={{
        '--hero-glow-color': `${verdict.color}30`,
      } as React.CSSProperties}
    >
      {/* 상단 레이블 */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9098b1' }}>
          투자 판단
        </span>
        {/* 방향 배지 */}
        <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{
          background: `${verdict.color}15`,
          color: verdict.color,
        }}>
          {direction === 'LONG' ? 'LONG 매수' : direction === 'SHORT' ? 'SHORT 매도' : direction === 'WAIT' ? '대기' : '매매 금지'}
        </span>
      </div>

      {/* 메인 콘텐츠: 도넛 게이지 + 판단 텍스트 */}
      <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
        {/* 왼쪽: 원형 도넛 게이지 */}
        <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
          <svg viewBox="0 0 120 120" width="140" height="140">
            {/* 배경 원 */}
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#f0f2f5" strokeWidth="10" />
            {/* 점수 호 — 상단에서 시작 */}
            <circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke={verdict.color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${empty}`}
              strokeDashoffset={circumference * 0.25}
              style={{
                transition: 'stroke-dasharray 0.8s ease',
                transform: 'rotate(-90deg)',
                transformOrigin: '60px 60px',
              }}
            />
          </svg>

          {/* 중앙 점수 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-black tabular-nums" style={{ color: verdict.color }}>
              {Math.round(finalScore)}
            </div>
            <div className="text-xs" style={{ color: '#b4bcd0' }}>/100점</div>
          </div>
        </div>

        {/* 오른쪽: 판단 텍스트 */}
        <div className="flex-1 text-center sm:text-left">
          {/* 신호등 아이콘 + 메인 헤드라인 */}
          <div className="flex items-center justify-center sm:justify-start gap-3 mb-3">
            <span className="text-3xl">{verdict.icon}</span>
            <h2 className="text-3xl sm:text-4xl font-black leading-tight" style={{ color: '#1a1d2e' }}>
              {verdict.headline}
            </h2>
          </div>

          {/* 이유 */}
          <p className="text-base mb-4" style={{ color: '#5b6178' }}>
            {verdict.reason}
          </p>

          {/* 행동 지침 — 둥근 카드 */}
          <div className="inline-block px-5 py-2.5 rounded-2xl text-sm font-bold" style={{
            background: `${verdict.color}12`,
            color: verdict.color,
          }}>
            {verdict.action}
          </div>
        </div>
      </div>

      {/* 하단: 확신도 + 시장합의도 + 보너스 */}
      <div className="flex flex-wrap items-center gap-2 mt-6 pt-5" style={{ borderTop: '1px solid #f0f2f5' }}>
        {/* 도박사 확신도 */}
        <span className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{
          background: `${confInfo.color}12`,
          color: confInfo.color,
        }}>
          {confInfo.gambler}
        </span>

        {/* 시장 합의도 */}
        <span className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{
          background: `${sigmaInfo.color}12`,
          color: sigmaInfo.color,
        }}>
          {sigmaInfo.label} (σ {sigma.toFixed(1)})
        </span>

        {/* RSI 보너스 */}
        {rsiMacroBonus > 0 && (
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{
            background: 'rgba(245, 158, 11, 0.1)',
            color: '#d97706',
          }}>
            {rsiMacroBonus === 8 ? '★★' : '★'} RSI 보너스 +{rsiMacroBonus}
          </span>
        )}

        {/* 피보나치 보너스 */}
        {fibConfluenceBonus > 0 && (
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{
            background: 'rgba(59, 130, 246, 0.1)',
            color: '#2563eb',
          }}>
            Fib 보너스 +{fibConfluenceBonus}
          </span>
        )}
      </div>
    </div>
  );
}
