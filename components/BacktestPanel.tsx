'use client';

/**
 * BacktestPanel — 과거 20개 시점 백테스트 성과 상세 패널
 * 아코디언 안에 들어감. 60대가 "이 시스템이 언제 맞고 틀렸는지" 직관적으로 확인.
 * 라이트 핀테크 스타일.
 */

import { useState, useEffect } from 'react';

// ─── 백테스트 결과 타입 (runner.ts에서 가져오는 대신 경량 타입 사용) ───
interface BacktestEntry {
  id: string;
  date: string;
  label: string;
  price: number;
  grade: string;
  score: number;
  direction: string;
  return90d: number;
  hit: boolean;
  type: string;
}

interface GradePerf {
  grade: string;
  count: number;
  hits: number;
  hitRate: number;
  avgReturn90d: number;
  avgReturn180d: number;
}

interface BacktestData {
  entries: BacktestEntry[];
  gradePerformance: GradePerf[];
  overallHitRate: number;
  totalPoints: number;
  disclaimer: string;
}

// 등급 색상 매핑 (라이트 테마)
const GRADE_COLORS: Record<string, string> = {
  S: '#00c471', A: '#34d399', B: '#f59e0b', C: '#fb923c', NO_TRADE: '#94a3b8', F: '#ef4444',
};

export default function BacktestPanel() {
  const [data, setData] = useState<BacktestData | null>(null);
  const [loading, setLoading] = useState(true);

  // /api/backtest에서 데이터 로드
  useEffect(() => {
    fetch('/api/backtest')
      .then(res => res.json())
      .then(json => { if (json.success) setData(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-5 text-center text-xs" style={{ color: '#9098b1' }}>백테스트 로딩 중...</div>;
  }

  if (!data) {
    return <div className="p-5 text-center text-xs" style={{ color: '#9098b1' }}>백테스트 데이터 없음</div>;
  }

  // 과거 시점만 (현재 제외)
  const pastEntries = data.entries.filter(e => e.type !== 'current');

  return (
    <div className="p-5 space-y-5">
      {/* ─── 등급별 성과 요약 카드 ─── */}
      <div>
        <div className="text-xs font-semibold tracking-wider mb-3" style={{ color: '#9098b1' }}>
          등급별 과거 적중률 (2015~2025, {data.totalPoints}개 시점)
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {data.gradePerformance.map(g => (
            <div key={g.grade} className="p-3 rounded-xl" style={{ background: '#f8f9fc' }}>
              {/* 등급 + 적중률 */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold" style={{ color: GRADE_COLORS[g.grade] ?? '#94a3b8' }}>
                  {g.grade}
                </span>
                <span className="text-lg font-black tabular-nums" style={{ color: '#1a1d2e' }}>
                  {g.hitRate}%
                </span>
              </div>

              {/* 건수 + 90일 수익률 */}
              <div className="text-xs" style={{ color: '#9098b1' }}>
                {g.count}건 중 {g.hits}건 적중
              </div>
              <div className="text-xs mt-0.5" style={{ color: g.avgReturn90d >= 0 ? '#00c471' : '#ef4444' }}>
                90일 평균 {g.avgReturn90d >= 0 ? '+' : ''}{g.avgReturn90d}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 시점별 상세 테이블 ─── */}
      <div>
        <div className="text-xs font-semibold tracking-wider mb-3" style={{ color: '#9098b1' }}>
          시점별 판단 vs 실제 결과
        </div>

        <div className="space-y-1.5">
          {pastEntries.map(e => {
            const gradeColor = GRADE_COLORS[e.grade] ?? '#94a3b8';
            return (
              <div key={e.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                   style={{ background: e.hit ? '#00c47108' : '#f8f9fc' }}>
                {/* 적중 여부 */}
                <span className="text-sm flex-shrink-0 w-5">
                  {e.hit ? '✅' : '❌'}
                </span>

                {/* 날짜 + 설명 */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: '#1a1d2e' }}>
                    {e.date.slice(0, 7)} — {e.label.slice(0, 25)}
                  </div>
                  <div className="text-xs" style={{ color: '#9098b1' }}>
                    ${e.price.toLocaleString()}
                  </div>
                </div>

                {/* 등급 */}
                <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: `${gradeColor}15`, color: gradeColor }}>
                  {e.grade} ({e.score})
                </span>

                {/* 90일 수익률 */}
                <span className="text-xs font-bold tabular-nums w-14 text-right flex-shrink-0"
                      style={{ color: e.return90d >= 0 ? '#00c471' : '#ef4444' }}>
                  {e.return90d >= 0 ? '+' : ''}{e.return90d}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 면책 ─── */}
      <div className="text-xs text-center pt-3" style={{ borderTop: '1px solid #f0f2f5', color: '#b4bcd0' }}>
        {data.disclaimer}
      </div>
    </div>
  );
}
