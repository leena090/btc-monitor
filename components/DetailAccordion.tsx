'use client';

/**
 * DetailAccordion — 기존 패널들을 접이식 아코디언으로 감싸는 래퍼
 * 기본 상태: 모두 접혀있음 (파워 유저만 펼쳐봄)
 * Progressive Disclosure 3단계 중 Tier 3 — 상세 분석
 */

interface AccordionSectionProps {
  /** 섹션 제목 */
  title: string;
  /** 섹션 부제 (선택) */
  subtitle?: string;
  /** 아이콘 */
  icon?: string;
  /** 자식 컴포넌트 */
  children: React.ReactNode;
  /** 기본 열린 상태 여부 */
  defaultOpen?: boolean;
}

/** 개별 아코디언 섹션 */
function AccordionSection({ title, subtitle, icon, children, defaultOpen = false }: AccordionSectionProps) {
  return (
    <details className="group rounded-xl border border-white/8 overflow-hidden" open={defaultOpen}
             style={{ background: '#12121a' }}>
      <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer select-none list-none hover:bg-white/[0.03] transition-colors">
        {/* 아이콘 */}
        {icon && <span className="text-base flex-shrink-0">{icon}</span>}

        {/* 제목 + 부제 */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-xs font-semibold tracking-widest" style={{ color: '#94a3b8' }}>
            {title}
          </span>
          {subtitle && (
            <span className="text-xs" style={{ color: '#475569' }}>
              · {subtitle}
            </span>
          )}
        </div>

        {/* 열기/닫기 화살표 */}
        <span className="text-xs transition-transform duration-200 group-open:rotate-180" style={{ color: '#475569' }}>
          ▼
        </span>
      </summary>

      {/* 펼쳐진 내용 */}
      <div className="border-t border-white/8">
        {children}
      </div>
    </details>
  );
}

// ─────────────────────────────────────────────
// 메인 아코디언 컨테이너
// ─────────────────────────────────────────────

interface DetailAccordionProps {
  children: React.ReactNode;
}

export default function DetailAccordion({ children }: DetailAccordionProps) {
  return (
    <div className="space-y-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-xs font-semibold tracking-widest" style={{ color: '#475569' }}>
          상세 분석
        </span>
        <span className="text-xs" style={{ color: '#475569' }}>
          클릭하여 펼치기
        </span>
      </div>
      {children}
    </div>
  );
}

// AccordionSection을 외부에서 사용할 수 있도록 export
export { AccordionSection };
