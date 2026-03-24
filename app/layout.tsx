/**
 * 루트 레이아웃 — BTC 모니터링 대시보드
 * 다크 테마 Bloomberg Terminal 스타일 적용
 */

import type { Metadata, Viewport } from 'next';
import { Geist_Mono } from 'next/font/google';
import './globals.css';

// 모노스페이스 폰트 — 트레이딩 터미널 느낌
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BTC 신호 모니터 | 노모어매뉴얼',
  description: 'BTC 11카테고리 실시간 시그널 스코어링 대시보드',
};

// 모바일 뷰포트 최적화 (텔레그램 알림 → 폰에서 확인 시나리오)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`${geistMono.variable} h-full`}
      // 강제 다크 모드
      style={{ colorScheme: 'dark' }}
    >
      <body
        className="min-h-full"
        style={{
          background: '#0a0a0f',   // 다크 배경
          color: '#e2e8f0',        // 기본 텍스트
          fontFamily: 'var(--font-geist-mono), monospace',
        }}
      >
        {children}
      </body>
    </html>
  );
}
