"""
TradingView 기술 지표 수집 — Vercel Python Runtime용
tradingview-ta 라이브러리: 키 불필요, TradingView 내부 screener API 활용

수집 항목:
  - RSI(14): 일봉/주봉/월봉 (핵심 — Cardwell RSI 매크로 사이클 분석)
  - MACD(12,26,9): 일봉
  - MA 20/50/100/200: 일봉 (EMA + SMA)
  - ADX(14): 일봉
  - DXY 달러인덱스: 심볼 TVC:DXY 별도 조회

Rate limit 주의: 공식 제한 없음 → 30~60초 간격 권장 (IP 차단 방지)
Vercel Python Runtime: requirements.txt에 tradingview-ta 명시 필요
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import traceback

# tradingview-ta 라이브러리 임포트
try:
    from tradingview_ta import TA_Handler, Interval, Exchange
except ImportError:
    TA_Handler = None


# ──────────────────────────────────────────────
# 지표 수집 함수
# ──────────────────────────────────────────────

def get_btc_indicators():
    """
    BTC USDT 기술 지표 수집 (3개 타임프레임)
    반환: RSI, MACD, MA, ADX 값 딕셔너리
    """
    if TA_Handler is None:
        raise ImportError("tradingview_ta 라이브러리 미설치")

    # 일봉 분석
    btc_daily = TA_Handler(
        symbol="BTCUSDT",
        exchange="BINANCE",
        screener="crypto",
        interval=Interval.INTERVAL_1_DAY
    )

    # 주봉 분석 (RSI 매크로 사이클 핵심)
    btc_weekly = TA_Handler(
        symbol="BTCUSDT",
        exchange="BINANCE",
        screener="crypto",
        interval=Interval.INTERVAL_1_WEEK
    )

    # 월봉 분석 (RSI 레짐 필터)
    btc_monthly = TA_Handler(
        symbol="BTCUSDT",
        exchange="BINANCE",
        screener="crypto",
        interval=Interval.INTERVAL_1_MONTH
    )

    # 각 타임프레임 분석 실행
    daily = btc_daily.get_analysis()
    weekly = btc_weekly.get_analysis()
    monthly = btc_monthly.get_analysis()

    indicators = daily.indicators
    indicators_w = weekly.indicators
    indicators_m = monthly.indicators

    return {
        # RSI (14) — 3 타임프레임 (Cardwell 매크로 분석용)
        "rsi_daily": round(float(indicators.get("RSI", 0) or 0), 2),
        "rsi_weekly": round(float(indicators_w.get("RSI", 0) or 0), 2),
        "rsi_monthly": round(float(indicators_m.get("RSI", 0) or 0), 2),

        # MACD (12, 26, 9) — 일봉
        "macd_daily": round(float(indicators.get("MACD.macd", 0) or 0), 2),
        "macd_signal_daily": round(float(indicators.get("MACD.signal", 0) or 0), 2),
        "macd_histogram": round(
            float(indicators.get("MACD.macd", 0) or 0) -
            float(indicators.get("MACD.signal", 0) or 0), 2
        ),

        # 이동평균선 (일봉)
        "ema20": round(float(indicators.get("EMA20", 0) or 0), 2),
        "sma20": round(float(indicators.get("SMA20", 0) or 0), 2),
        "sma50": round(float(indicators.get("SMA50", 0) or 0), 2),
        "sma100": round(float(indicators.get("SMA100", 0) or 0), 2),
        "sma200": round(float(indicators.get("SMA200", 0) or 0), 2),
        "ema200": round(float(indicators.get("EMA200", 0) or 0), 2),

        # ADX (14) — 일봉 (추세 강도)
        "adx": round(float(indicators.get("ADX", 0) or 0), 2),
        "adx_plus_di": round(float(indicators.get("ADX+DI", 0) or 0), 2),
        "adx_minus_di": round(float(indicators.get("ADX-DI", 0) or 0), 2),

        # 현재가 (TradingView 기준)
        "close_daily": round(float(indicators.get("close", 0) or 0), 2),
        "close_weekly": round(float(indicators_w.get("close", 0) or 0), 2),
    }


def get_dxy_indicators():
    """
    DXY (달러인덱스) 기술 지표 수집
    심볼: TVC:DXY (TradingView 자체 데이터)
    """
    if TA_Handler is None:
        raise ImportError("tradingview_ta 라이브러리 미설치")

    dxy_daily = TA_Handler(
        symbol="DXY",
        exchange="TVC",        # TradingView 내부 데이터 소스
        screener="forex",
        interval=Interval.INTERVAL_1_DAY
    )

    dxy = dxy_daily.get_analysis()
    indicators = dxy.indicators

    return {
        "dxy_close": round(float(indicators.get("close", 0) or 0), 2),
        "dxy_sma50": round(float(indicators.get("SMA50", 0) or 0), 2),
        "dxy_rsi": round(float(indicators.get("RSI", 0) or 0), 2),
        # 추천: buy/sell/neutral 집계
        "dxy_recommendation": str(dxy.summary.get("RECOMMENDATION", "NEUTRAL")),
    }


# ──────────────────────────────────────────────
# Vercel Python Runtime 핸들러
# ──────────────────────────────────────────────

class handler(BaseHTTPRequestHandler):
    """Vercel Serverless Python 핸들러"""

    def do_GET(self):
        """GET /api/indicators — 모든 지표 반환"""
        try:
            # BTC 지표 수집
            btc_data = get_btc_indicators()

            # DXY 지표 수집 (실패 시 폴백)
            try:
                dxy_data = get_dxy_indicators()
            except Exception as e:
                print(f"[indicators] DXY 수집 실패 (폴백): {e}")
                dxy_data = {
                    "dxy_close": 0,
                    "dxy_sma50": 0,
                    "dxy_rsi": 0,
                    "dxy_recommendation": "NEUTRAL",
                }

            # 응답 조합
            response = {
                "success": True,
                "btc": btc_data,
                "dxy": dxy_data,
                "fetchedAt": __import__('datetime').datetime.utcnow().isoformat() + "Z"
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            # 에러 응답 — 스코어링에서 폴백 처리
            error_response = {
                "success": False,
                "error": str(e),
                "traceback": traceback.format_exc(),
            }
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(error_response).encode())

    def log_message(self, format, *args):
        """Vercel 로그에 기록"""
        print(f"[indicators] {format % args}")
