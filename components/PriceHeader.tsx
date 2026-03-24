'use client';

/**
 * PriceHeader — 현재 BTC 가격 (USD + KRW) + 24h 변동률
 * 업비트 API에서 원화 가격을 실시간으로 가져와 함께 표시
 * 라이트 핀테크 스타일
 */

import { useEffect, useState } from 'react';
import type { SignalResult } from '@/lib/scoring/types';

interface Props {
  data: {
    price: NonNullable<SignalResult['price']>;
    priceChange24h: NonNullable<SignalResult['priceChange24h']>;
    timestamp: SignalResult['timestamp'];
  };
}

export default function PriceHeader({ data }: Props) {
  // 업비트 원화 가격 + 실시간 환율 상태
  const [krwPrice, setKrwPrice] = useState<number | null>(null);
  const [krwChange, setKrwChange] = useState<number | null>(null);
  const [usdKrwRate, setUsdKrwRate] = useState<number | null>(null);

  // 업비트 BTC/KRW + USDT/KRW 한 번에 조회 (공개 API, 키 불필요)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 두 마켓을 한 번에 조회 (API 호출 1회로 통합)
        const res = await fetch('https://api.upbit.com/v1/ticker?markets=KRW-BTC,KRW-USDT');
        if (!res.ok) return;
        const tickers = await res.json();
        for (const t of tickers) {
          if (t.market === 'KRW-BTC') {
            setKrwPrice(t.trade_price);
            setKrwChange(t.signed_change_rate * 100);
          } else if (t.market === 'KRW-USDT') {
            setUsdKrwRate(t.trade_price);
          }
        }
      } catch { /* 업비트 API 실패 시 무시 — USD 가격은 정상 표시 */ }
    };

    fetchData();
    // 30초마다 갱신
    const timer = setInterval(fetchData, 30000);
    return () => clearInterval(timer);
  }, []);

  // 24h 변동률 색상
  const isPositive = data.priceChange24h >= 0;
  const changeColor = isPositive ? '#00c471' : '#ef4444';
  const changeIcon = isPositive ? '▲' : '▼';

  // 원화 변동률 색상
  const krwIsPositive = (krwChange ?? 0) >= 0;
  const krwChangeColor = krwIsPositive ? '#00c471' : '#ef4444';

  // 마지막 업데이트 시각 포맷
  const lastUpdate = new Date(data.timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

  // BTC 가격 천단위 포맷
  const formattedPrice = data.price.toLocaleString('en-US', {
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });

  // 원화 가격 포맷 (억/만 단위)
  const formattedKrw = krwPrice
    ? krwPrice >= 100000000
      ? `${(krwPrice / 100000000).toFixed(2)}억원`
      : `${Math.round(krwPrice / 10000).toLocaleString()}만원`
    : null;

  // 김치 프리미엄 계산: (업비트 BTC원화가) / (바이낸스 USD × 실시간 USDT/KRW 환율) - 1
  const kimchiPremium = (krwPrice && data.price > 0 && usdKrwRate)
    ? ((krwPrice / (data.price * usdKrwRate)) - 1) * 100
    : null;

  return (
    <div className="card-fintech flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4">
      {/* 왼쪽: 비트코인 레이블 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-full text-xl font-bold text-white"
             style={{
               background: 'linear-gradient(135deg, #f7931a, #e8830e)',
               boxShadow: '0 4px 12px rgba(247,147,26,0.25)',
             }}>
          ₿
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color: '#1a1d2e' }}>BITCOIN</div>
          <div className="text-xs" style={{ color: '#9098b1' }}>BTC / USDT · SPOT</div>
        </div>
      </div>

      {/* 중앙: 현재 가격 (USD + KRW) */}
      <div className="flex flex-col items-start sm:items-center">
        {/* USD 가격 */}
        <div className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums"
             style={{ color: '#1a1d2e' }}>
          ${formattedPrice}
        </div>
        {/* KRW 가격 (업비트) */}
        {formattedKrw && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg font-bold tabular-nums" style={{ color: '#5b6178' }}>
              ₩{krwPrice?.toLocaleString()}
            </span>
            {/* 김치 프리미엄 */}
            {kimchiPremium !== null && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{
                background: kimchiPremium > 0 ? '#ef444412' : '#00c47112',
                color: kimchiPremium > 0 ? '#ef4444' : '#00c471',
              }}>
                김프 {kimchiPremium > 0 ? '+' : ''}{kimchiPremium.toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* 오른쪽: 변동률 + 업데이트 시각 */}
      <div className="flex flex-col items-start sm:items-end gap-1.5">
        {/* USD 24h 변동률 */}
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-bold tabular-nums"
             style={{ background: `${changeColor}10`, color: changeColor }}>
          <span>{changeIcon}</span>
          <span>{Math.abs(data.priceChange24h).toFixed(2)}%</span>
          <span className="text-xs opacity-60 ml-0.5">24h</span>
        </div>

        {/* KRW 24h 변동률 (업비트) */}
        {krwChange !== null && (
          <div className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-medium tabular-nums"
               style={{ background: `${krwChangeColor}08`, color: krwChangeColor }}>
            <span className="text-xs" style={{ color: '#9098b1' }}>업비트</span>
            <span>{krwIsPositive ? '▲' : '▼'}</span>
            <span>{Math.abs(krwChange).toFixed(2)}%</span>
          </div>
        )}

        {/* 마지막 업데이트 시각 */}
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00c471' }} />
          <span className="text-xs" style={{ color: '#9098b1' }}>{lastUpdate} 기준</span>
        </div>
      </div>
    </div>
  );
}
