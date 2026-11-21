# poll-list-and-results Design Document

> **Project**: vote-app
> **Author**: Claude
> **Date**: 2026-11-21
> **Status**: Draft
> **Plan Ref**: `docs/01-plan/features/poll-list-and-results.plan.md`

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 홈이 목록 역할 겸임 → 라우팅 불명확, 진행중/마감 구분 불가 |
| **WHO** | 투표 참여자(목록 탐색), 방장(결과 확인) |
| **RISK** | 홈(`/`) 리다이렉트로 기존 북마크 유실 가능성 |
| **SUCCESS** | `/polls` 라우트에서 탭 전환 동작, 결과 페이지 방장만 접근 |
| **SCOPE** | Phase 1: `/polls` 페이지 + 탭 / Phase 2: 결과 페이지 UI 개선 |

---

## 1. Overview

### 1.1 Selected Architecture

**Option C — Pragmatic Balance**

- `app/polls/page.tsx` (Server Component): 전체 polls SSR fetch
- `components/PollListTabs.tsx` (`'use client'`): props로 polls 받아 `useState` 탭 필터링
- `app/page.tsx`: `redirect('/polls')` 처리
- `app/polls/[id]/results/page.tsx`: UI 개선 (로직 변경 없음)

**선택 이유:**
- 탭 전환 시 추가 Supabase 요청 없음 (SSR에서 전체 로드)
- 기존 프로젝트 패턴(서버 컴포넌트 SSR + 클라이언트 인터랙션)과 일치
- 파일 3개로 최소 복잡도 유지

---

## 2. Architecture

### 2.1 Data Flow

```
브라우저 접속 /polls
    │
    ▼
app/polls/page.tsx  (Server Component)
    │  getServerClient() → supabase.from('polls').select('*')
    │  전체 polls (open + closed) 한번에 SSR
    │
    ▼
<PollListTabs polls={allPolls} />  (Client Component)
    │  useState<'open' | 'closed'>('open')
    │  isClosed(poll) 로 클라이언트 필터링
    │  탭 전환 → 재렌더링만 (fetch 없음)
    │
    ▼
<ul className="poll-list">
  {filteredPolls.map(poll => <PollCard />)}
</ul>
```

### 2.2 Redirect Flow

```
브라우저 접속 /
    │
    ▼
app/page.tsx
    │  redirect('/polls')  — Next.js 서버 사이드 redirect
    │
    ▼
app/polls/page.tsx
```

### 2.3 Results Page Flow (변경 없음)

```
방장이 /polls/:id/results 접속
    │
    ▼
app/polls/[id]/results/page.tsx  (Server Component)
    │  getServerClient() → auth.getUser()
    │  poll.created_by !== user.id → redirect('/polls/:id')
    │
    ▼
결과 UI (UI 개선만, 접근 로직 동일)
```

---

## 3. Component Design

### 3.1 `app/polls/page.tsx`

**역할**: Server Component — SSR 데이터 패치 + PollListTabs 렌더링

```tsx
// 핵심 구조
export default async function PollsPage() {
  const supabase = await getServerClient()
  const { data: polls } = await supabase
    .from('polls')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<Poll[]>()

  return (
    <section>
      <div className="page-header">
        <h1 className="page-title">투표 목록</h1>
        <Link href="/polls/new" className="btn btn-primary btn-sm">
          새 투표
        </Link>
      </div>
      <PollListTabs polls={polls ?? []} />
    </section>
  )
}
```

**의존성**: `getServerClient`, `Poll` type, `PollListTabs`

### 3.2 `components/PollListTabs.tsx`

**역할**: Client Component — 탭 UI + 클라이언트 필터링

```tsx
'use client'

type Tab = 'open' | 'closed'

interface Props {
  polls: Poll[]
}

export default function PollListTabs({ polls }: Props) {
  const [tab, setTab] = useState<Tab>('open')

  const openPolls = polls.filter(p => !isClosed(p))
  const closedPolls = polls.filter(p => isClosed(p))
  const filtered = tab === 'open' ? openPolls : closedPolls

  return (
    <div>
      {/* 탭 헤더 */}
      <div className="tab-bar" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'open'}
          className={`tab ${tab === 'open' ? 'tab-active' : ''}`}
          onClick={() => setTab('open')}
        >
          진행중 <span className="tab-count">{openPolls.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === 'closed'}
          className={`tab ${tab === 'closed' ? 'tab-active' : ''}`}
          onClick={() => setTab('closed')}
        >
          마감 <span className="tab-count">{closedPolls.length}</span>
        </button>
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="empty">
          <p>{tab === 'open' ? '진행 중인 투표가 없어요.' : '마감된 투표가 없어요.'}</p>
        </div>
      ) : (
        <ul className="poll-list">
          {filtered.map(poll => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </ul>
      )}
    </div>
  )
}
```

**의존성**: `Poll` type, `isClosed` util, `PollCard` (인라인 or 분리)

### 3.3 `app/page.tsx` (수정)

```tsx
import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/polls')
}
```

> 기존 SSR 로직 전부 제거, redirect만 남김.

### 3.4 `app/polls/[id]/results/page.tsx` (UI 개선)

**변경 사항** (접근 로직 완전 유지):
1. 옵션 순위 번호 표시 (1위 `🥇`, 2위 `🥈`)
2. 총 참여자/득표 요약 카드 (`<div className="result-summary">`)
3. 무투표 상태 처리 (`totalVotes === 0` 시 "아직 투표 없음" 메시지)

---

## 4. CSS 추가 클래스

기존 `globals.css`에 추가할 스타일:

```css
/* 탭 바 */
.tab-bar {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 20px;
}
.tab {
  appearance: none;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 8px 4px;
  margin-bottom: -1px;
  font: inherit;
  font-weight: 600;
  font-size: .95rem;
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color .15s, border-color .15s;
}
.tab:hover { color: var(--text); }
.tab-active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
.tab-count {
  font-size: .75rem;
  font-weight: 700;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0 6px;
  min-width: 20px;
  text-align: center;
  color: var(--muted);
}
.tab-active .tab-count {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

/* 페이지 헤더 (제목 + 버튼 행) */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header .page-title { margin: 0; }

/* 결과 요약 카드 */
.result-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  padding: 14px 16px;
  background: var(--bg);
  border-radius: 10px;
  font-size: .875rem;
  color: var(--muted);
}
.result-summary strong { color: var(--text); font-size: 1.1rem; }
```

---

## 5. File Impact Summary

| File | Action | Lines (est.) |
|------|--------|-------------|
| `app/page.tsx` | 수정 — redirect로 교체 | ~5 |
| `app/polls/page.tsx` | 신규 생성 | ~35 |
| `components/PollListTabs.tsx` | 신규 생성 | ~70 |
| `app/polls/[id]/results/page.tsx` | 수정 — UI 개선 | ~20 diff |
| `app/globals.css` | 수정 — 탭/헤더/요약 CSS 추가 | ~50 |

**총계**: 신규 2파일, 수정 3파일, 약 180 lines

---

## 6. Data Model

기존 `Poll`, `PollOption` 타입 그대로 사용. 스키마 변경 없음.

```typescript
// lib/types.ts — 변경 없음
// isClosed(poll) 유틸 활용해 탭 필터링
export function isClosed(poll: Poll, now = Date.now()): boolean {
  return !!poll.closes_at && new Date(poll.closes_at).getTime() <= now
}
```

---

## 7. Error Handling

| Scenario | Handling |
|----------|----------|
| polls fetch 실패 | `app/polls/page.tsx`에서 에러 배너 렌더링 (기존 패턴 동일) |
| polls 빈 배열 | PollListTabs 내 각 탭별 empty 메시지 |
| results 접근 권한 없음 | 기존 `redirect('/polls/:id')` 유지 |
| UUID 형식 오류 | 기존 `notFound()` 유지 |

---

## 8. Accessibility

| Element | Attribute |
|---------|-----------|
| 탭 컨테이너 | `role="tablist"` |
| 각 탭 버튼 | `role="tab"`, `aria-selected={boolean}` |
| 탭 패널 | `role="tabpanel"` (선택적, 단순 목록이므로 생략 가능) |

---

## 9. TypeScript

신규 타입 추가 없음. 기존 `Poll`, `PollOption`, `isClosed`, `formatDate` 그대로 사용.

```typescript
// PollListTabs.tsx 에서 사용하는 타입
type Tab = 'open' | 'closed'  // 로컬 타입
```

---

## 10. Testing Checklist

- [ ] `/polls` 접속 → 투표목록 렌더링 확인
- [ ] 진행중 탭 → `isClosed(p) === false` 인 투표만 표시
- [ ] 마감 탭 → `isClosed(p) === true` 인 투표만 표시
- [ ] 탭 카운트 뱃지 정확성 확인
- [ ] `/` 접속 → `/polls` 리다이렉트 확인
- [ ] `/polls/:id/results` 방장 접근 → 결과 표시
- [ ] `/polls/:id/results` 비방장 접근 → `/polls/:id` 리다이렉트 확인
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm build` 성공

---

## 11. Implementation Guide

### 11.1 Implementation Order

1. `app/page.tsx` — redirect 처리 (가장 단순, 먼저)
2. `app/globals.css` — 탭/헤더 CSS 추가
3. `components/PollListTabs.tsx` — 탭 클라이언트 컴포넌트
4. `app/polls/page.tsx` — 서버 컴포넌트 (PollListTabs 사용)
5. `app/polls/[id]/results/page.tsx` — UI 개선

### 11.2 Key Dependencies

```
app/polls/page.tsx
  ← getServerClient  (lib/supabase/server.ts)
  ← Poll type        (lib/types.ts)
  ← PollListTabs     (components/PollListTabs.tsx)

components/PollListTabs.tsx
  ← Poll type        (lib/types.ts)
  ← isClosed         (lib/types.ts)
  ← formatDate       (lib/types.ts)
```

### 11.3 Session Guide

```
Module Map:
  M1: app/page.tsx + app/polls/page.tsx  (라우팅 구조)
  M2: components/PollListTabs.tsx        (탭 UI)
  M3: app/polls/[id]/results/page.tsx + globals.css  (결과 UI + 스타일)

Recommended Sessions:
  Session 1: M1 + M2  (핵심 기능)
  Session 2: M3       (결과 페이지 개선)
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-11-21 | Initial design (Option C selected) | Claude |
