'use client';

/**
 * 히스토리 페이지 — 스코어 + 가격 시계열 차트 (최근 48시간)
 * TradingView Lightweight Charts 미설치 시 기본 SVG 차트로 폴백
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

// ─── 모의 히스토리 데이터 생성 ───
function generateMockHistory(): Array<{ time: string; score: number; price: number; grade: string }> {
  const now = Date.now();
  const result = [];
  // 48시간 × 5분 간격 = 576개 포인트
  for (let i = 576; i >= 0; i--) {
    const t = new Date(now - i * 5 * 60 * 1000);
    // 모의 점수 (50~75 사이 랜덤 변동)
    const base = 62;
    const noise = Math.sin(i * 0.1) * 8 + Math.random() * 6 - 3;
    const score = Math.max(0, Math.min(100, Math.round(base + noise)));
    // 모의 가격 ($80K ~ $88K)
    const price = 84000 + Math.sin(i * 0.08) * 3500 + Math.random() * 1000 - 500;

    let grade = 'C';
    if (score >= 90) grade = 'S';
    else if (score >= 75) grade = 'A';
    else if (score >= 60) grade = 'B';
    else if (score >= 50) grade = 'C';
    else grade = 'F';

    result.push({
      time: t.toISOString(),
      score,
      price: Math.round(price),
      grade,
    });
  }
  return result;
}

// ─── 등급 컬러 ───
const GRADE_COLORS: Record<string, string> = {
  S: '#FFD700', A: '#00ff88', B: '#3b82f6', C: '#f59e0b', F: '#ef4444',
};

// ─── 미니멀 SVG 라인 차트 ───
function LineChart({
  data,
  valueKey,
  color,
  height = 200,
}: {
  data: Array<Record<string, number | string>>;
  valueKey: string;
  color: string;
  height?: number;
}) {
  if (data.length === 0) return null;

  const values = data.map((d) => Number(d[valueKey]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 1000; // SVG 내부 좌표 (viewBox 기준)
  const pad = 20;
  const chartW = width - pad * 2;
  const chartH = height - pad * 2;

  // 포인트 좌표 계산
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * chartW;
    const y = pad + ((max - v) / range) * chartH;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');

  // 최근 값
  const latest = values[values.length - 1];
  const latestX = width - pad;
  const latestY = pad + ((max - latest) / range) * chartH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {/* 배경 그리드 라인 (3개) */}
      {[0.25, 0.5, 0.75].map((p) => (
        <line key={p}
          x1={pad} y1={pad + p * chartH}
          x2={width - pad} y2={pad + p * chartH}
          stroke="rgba(255,255,255,0.04)" strokeWidth="1"
        />
      ))}

      {/* 라인 차트 */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* 아래 채우기 영역 */}
      <polygon
        points={`${pad},${height - pad} ${polyline} ${width - pad},${height - pad}`}
        fill={color}
        opacity="0.05"
      />

      {/* 최신 포인트 */}
      <circle cx={latestX} cy={latestY} r="4" fill={color}
              style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
}

export default function HistoryPage() {
  const [history, setHistory] = useState<ReturnType<typeof generateMockHistory>>([]);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    // 실제 Redis 히스토리 조회 — 빈 배열이면 모의 데이터로 폴백
    fetch('/api/history?count=288')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.length > 0) {
          // Redis 데이터 → 필요한 필드 추출
          const mapped = json.data.map((item: Record<string, unknown>) => ({
            time: (item.timestamp as string) || new Date().toISOString(),
            score: (item.finalScore as number) ?? 0,
            price: (item.price as number) ?? 0,
            grade: (item.grade as string) ?? 'C',
          }));
          setHistory(mapped);
          setIsMock(false);
        } else {
          // 데이터 없음 → 모의 데이터 표시
          setHistory(generateMockHistory());
          setIsMock(true);
        }
      })
      .catch(() => {
        setHistory(generateMockHistory());
        setIsMock(true);
      })
      .finally(() => setLoading(false));
  }, []);

  // 최신 데이터
  const latest = history[history.length - 1];
  // 최근 24시간 (288개)
  const last24h = history.slice(-288);
  // 최근 6시간 (72개)
  const last6h = history.slice(-72);

  return (
    <main className="max-w-7xl mx-auto px-3 py-4">
      {/* ─── 헤더 ─── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-sm font-bold tracking-widest uppercase"
              style={{ color: '#e2e8f0' }}>
            스코어 히스토리
          </h1>
          <p className="text-xs mt-1" style={{ color: '#475569' }}>
            최근 48시간
            {isMock && <span className="ml-2 px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>모의 데이터</span>}
          </p>
        </div>
        <Link href="/"
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
          ← 대시보드
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm" style={{ color: '#475569' }}>
          로딩 중...
        </div>
      ) : (
        <div className="space-y-4">
          {/* ─── 현재 상태 요약 ─── */}
          {latest && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '현재 점수', value: `${latest.score}점`, color: GRADE_COLORS[latest.grade] },
                { label: '현재 등급', value: latest.grade,        color: GRADE_COLORS[latest.grade] },
                { label: 'BTC 가격', value: `$${latest.price.toLocaleString()}`, color: '#e2e8f0' },
              ].map(({ label, value, color }) => (
                <div key={label}
                     className="p-4 rounded-xl border border-white/5 text-center"
                     style={{ background: '#12121a' }}>
                  <div className="text-xs mb-1" style={{ color: '#64748b' }}>{label}</div>
                  <div className="text-xl font-bold tabular-nums"
                       style={{ color }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* ─── 점수 차트 (24h) ─── */}
          <div className="p-5 rounded-xl border border-white/5"
               style={{ background: '#12121a' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold tracking-widest"
                  style={{ color: '#64748b' }}>
                시그널 점수 (24시간)
              </h2>
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 rounded inline-block" style={{ background: '#3b82f6' }} />
                <span className="text-xs" style={{ color: '#475569' }}>점수</span>
              </div>
            </div>
            <LineChart data={last24h} valueKey="score" color="#3b82f6" height={180} />
            <div className="flex justify-between text-xs mt-2" style={{ color: '#334155' }}>
              <span>24시간 전</span>
              <span>12시간 전</span>
              <span>현재</span>
            </div>
          </div>

          {/* ─── 가격 차트 (24h) ─── */}
          <div className="p-5 rounded-xl border border-white/5"
               style={{ background: '#12121a' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold tracking-widest"
                  style={{ color: '#64748b' }}>
                BTC 가격 (24시간)
              </h2>
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 rounded inline-block" style={{ background: '#f7931a' }} />
                <span className="text-xs" style={{ color: '#475569' }}>BTC/USD</span>
              </div>
            </div>
            <LineChart data={last24h} valueKey="price" color="#f7931a" height={180} />
            <div className="flex justify-between text-xs mt-2" style={{ color: '#334155' }}>
              <span>24시간 전</span>
              <span>12시간 전</span>
              <span>현재</span>
            </div>
          </div>

          {/* ─── 최근 6시간 테이블 ─── */}
          <div className="p-5 rounded-xl border border-white/5"
               style={{ background: '#12121a' }}>
            <h2 className="text-xs font-semibold tracking-widest mb-3"
                style={{ color: '#64748b' }}>
              상세 내역 (최근 6시간 — 10분 간격)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th className="text-left pb-2 pr-4">시각</th>
                    <th className="text-right pb-2 pr-4">점수</th>
                    <th className="text-right pb-2 pr-4">등급</th>
                    <th className="text-right pb-2">가격</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 10분 간격으로 필터링 (2개마다 1개) */}
                  {last6h.filter((_, i) => i % 2 === 0).reverse().slice(0, 30).map((row, i) => (
                    <tr key={i}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="py-1.5 pr-4 tabular-nums" style={{ color: '#475569' }}>
                        {new Date(row.time).toLocaleTimeString('ko-KR', {
                          hour: '2-digit', minute: '2-digit', hour12: false,
                        })}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums font-semibold"
                          style={{ color: GRADE_COLORS[row.grade] }}>
                        {row.score}
                      </td>
                      <td className="py-1.5 pr-4 text-right">
                        <span className="px-1.5 py-0.5 rounded text-xs font-bold"
                              style={{
                                background: `${GRADE_COLORS[row.grade]}22`,
                                color: GRADE_COLORS[row.grade],
                              }}>
                          {row.grade}
                        </span>
                      </td>
                      <td className="py-1.5 text-right tabular-nums"
                          style={{ color: '#94a3b8' }}>
                        ${row.price.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
