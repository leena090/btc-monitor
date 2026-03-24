# 프로젝트: BTC 모니터 — 버그 수정 + 디자인 개선

## 설명
btc-monitor-six.vercel.app 앱의 기능 버그 수정 및 전반적인 디자인 개선

## 기술 스택
Next.js 14 App Router / TypeScript / Tailwind CSS

## 작업 목록

### 버그 수정
- [x] Task 1: CategoryBreakdown — rawScore 소수점 16자리 → 최대 1자리 표시 (toFixed(1) 적용)
- [x] Task 2: CategoryBreakdown — 원점수 컬럼 너비 확장 (w-8 → w-12) + 숫자 overflow 방지
- [x] Task 3: 앱 전체 — 색상 #334155 (거의 안 보이는 텍스트) → #475569 이상으로 대체
- [x] Task 4: ScoreGauge — finalScore 소수점 1자리 이하 버림 (정수 표시)
- [x] Task 5: AlertHistory / DataFreshness — 패널 내 "최근 알림 없음" 텍스트 컬러 #334155 → #475569

### 디자인 개선
- [x] Task 6: layout.tsx / page.tsx — 상단 타이틀 "BTC 시그널 모니터" 색상 개선 (#334155 → #94a3b8)
- [x] Task 7: PriceHeader — 가격 폰트 크기 및 레이아웃 시각적 강화 (더 임팩트 있게)
- [x] Task 8: ScoreGauge — 게이지 반원 크기 개선 (더 크고 선명하게), 등급 배지 크기 키우기
- [x] Task 9: CategoryBreakdown — 바 두께 h-1.5 → h-2, 행 높이/여백 개선
- [x] Task 10: 전체 카드 — 보더 border-white/5 → border-white/8 (구분선 더 잘 보이게)
- [x] Task 11: history/page.tsx — 차트 그리드 라인 개선, 테이블 가독성 향상

## 완료 기준
- TypeScript 컴파일 에러 0개
- 카테고리 점수 최대 소수점 1자리
- 모든 텍스트 최소 #475569 이상 가시성
- 전체 화면에서 Bloomberg Terminal 느낌 유지하면서 가독성 향상
