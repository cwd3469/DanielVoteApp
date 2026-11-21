# vote-only-page Design Document

> **Project**: vote-app
> **Author**: Claude
> **Date**: 2026-11-21
> **Status**: Draft
> **Plan Ref**: `docs/01-plan/features/vote-only-page.plan.md`

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 공유용 투표 페이지와 관리 페이지 혼재 → 참여자 UX 저하 |
| **WHO** | 투표 참여자(QR 스캔 후 투표), 방장(QR 생성·공유) |
| **RISK** | VoteView·PollView 로직 중복, qrcode.react 패키지 추가 |
| **SUCCESS** | `/vote/:id` 투표 완료 후 결과 표시, QR 스캔으로 접근 가능 |
| **SCOPE** | Phase 1: vote 레이아웃+VoteView / Phase 2: PollQR+관리페이지 연결 |

---

## 1. Selected Architecture — Option B (VoteView 완전 독립)

**원칙**: PollView 수정 없음. VoteView는 독립적으로 작성.

```
app/vote/
├── layout.tsx          ← 신규: AuthProvider만, 헤더/푸터 없음
└── [id]/
    └── page.tsx        ← 신규: Server Component (SSR)

components/
├── VoteView.tsx        ← 신규: 독립 투표 UI 클라이언트 컴포넌트
└── PollQR.tsx          ← 신규: QR 코드 클라이언트 컴포넌트

app/polls/[id]/
└── page.tsx            ← 수정: isOwner 체크 + PollQR 조건부 렌더링
```

---

## 2. Component Design

### 2.1 `app/vote/layout.tsx`

**역할**: `/vote/*` 전용 레이아웃 — 헤더/푸터 완전 제거, AuthProvider만 포함

```tsx
import AuthProvider from "@/components/AuthProvider";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function VoteLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {isSupabaseConfigured ? children : (
        <div className="banner error">Supabase 설정 필요</div>
      )}
    </AuthProvider>
  );
}
```

> **중요**: 루트 `app/layout.tsx`는 `<html><body>` 태그를 가지므로 vote layout은 그 안에 중첩됨.
> Next.js nested layout — 헤더/푸터는 루트 layout에서 오지만, vote layout이 덮어쓰므로
> `app/vote/layout.tsx`에서는 AuthProvider만 감싸면 됨.
>
> **헤더 제거 방법**: 루트 layout의 `<header>`와 `<main className="container">`가 모든 경로에 적용됨.
> `/vote/*` 는 별도 레이아웃이므로 루트 layout의 header/main이 그대로 보임.
> → 루트 layout을 수정해야 `/vote/*`에서 헤더를 숨길 수 있음.
>
> **실제 구현 전략**: 루트 layout에서 pathname을 감지하는 것은 Server Component에서 불가.
> 대신 `app/vote/layout.tsx`가 `<html><body>`를 포함하는 독립 레이아웃을 가질 수 없으므로,
> **CSS로 헤더 숨기기** 또는 **route group** 활용.
>
> **선택: Route Group 방식**
> ```
> app/
> ├── (main)/              ← route group (URL에 영향 없음)
> │   ├── layout.tsx       ← 헤더/푸터 있는 레이아웃
> │   ├── page.tsx         → redirect('/polls')
> │   ├── polls/...
> │   └── ...
> ├── vote/
> │   ├── layout.tsx       ← 헤더/푸터 없는 레이아웃
> │   └── [id]/page.tsx
> └── layout.tsx           ← 루트: <html><body>만, AuthProvider만
> ```

### 2.2 Route Group 재구조화

현재 루트 `app/layout.tsx`가 헤더를 포함하므로, 헤더 없는 `/vote/*`를 구현하려면
route group으로 분리해야 합니다.

```
app/
├── layout.tsx              ← 수정: <html><body> + AuthProvider만 (헤더 제거)
├── (main)/                 ← 신규 route group
│   ├── layout.tsx          ← 신규: 헤더 있는 레이아웃
│   ├── page.tsx            ← 이동: redirect('/polls')
│   ├── polls/              ← 이동
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── results/page.tsx
│   └── not-found.tsx       ← 이동
└── vote/
    ├── layout.tsx          ← 신규: 헤더 없는 vote 전용 레이아웃
    └── [id]/
        └── page.tsx        ← 신규
```

### 2.3 레이아웃 분리 상세

**`app/layout.tsx` (수정)**:
```tsx
// <html><body> + globals.css + AuthProvider만
export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        {isSupabaseConfigured
          ? <AuthProvider>{children}</AuthProvider>
          : <div className="banner error">...</div>
        }
      </body>
    </html>
  );
}
```

**`app/(main)/layout.tsx` (신규)**:
```tsx
// 헤더 + main container
export default function MainLayout({ children }) {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="logo">투표하자</Link>
          <Link href="/polls/new" className="btn btn-primary btn-sm">+ 새 투표</Link>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
```

**`app/vote/layout.tsx` (신규)**:
```tsx
// 헤더/푸터 없음, 풀스크린 vote 레이아웃
export default function VoteLayout({ children }) {
  return <main className="vote-container">{children}</main>;
}
```

### 2.4 `components/VoteView.tsx`

**역할**: 헤더/푸터 없는 최소 투표 UI

**상태:**
```typescript
const [options, setOptions] = useState<PollOption[]>(initialOptions)
const [myVotes, setMyVotes] = useState<string[] | null>(null)  // null = 로딩중
const [selected, setSelected] = useState<string>("")
const [busy, setBusy] = useState(false)
const [error, setError] = useState<string | null>(null)
const [now, setNow] = useState(0)
```

**렌더링 분기:**
```
isClosed(poll, now)
  → true  : "마감된 투표입니다" 메시지
  → false :
      myVotes === null : 로딩 스피너 (또는 스켈레톤)
      myVotes.length > 0 : 결과 표시 (각 옵션별 %)
      myVotes.length === 0 : 선택지 + 투표하기 버튼
```

**핵심 구조:**
```tsx
export default function VoteView({ initialPoll, initialOptions }: Props) {
  // ... 상태
  const { userId, ready } = useAuth()
  const supabase = getBrowserClient()
  const closed = isClosed(poll, now)
  const hasVoted = (myVotes?.length ?? 0) > 0

  // 내 투표 조회
  useEffect(() => {
    if (!ready || !userId) return
    supabase.from("votes").select("option_id")
      .eq("poll_id", poll.id).eq("user_id", userId)
      .then(({ data }) => {
        setMyVotes((data ?? []).map(v => v.option_id as string))
      })
  }, [ready, userId])

  // 투표 제출
  async function submit() {
    if (!selected) return
    setBusy(true)
    const { error } = await supabase.rpc("cast_vote", {
      p_poll_id: poll.id,
      p_option_ids: [selected],
    })
    setBusy(false)
    if (error) setError(toMessage(error))
    else setMyVotes([selected])
  }

  return (
    <div className="vote-page">
      <h1 className="vote-title">{poll.title}</h1>
      {poll.description && <p className="vote-desc">{poll.description}</p>}

      {closed ? (
        <p className="vote-closed">마감된 투표입니다.</p>
      ) : hasVoted ? (
        <VoteResult options={options} />    // 인라인 결과 컴포넌트
      ) : (
        <>
          <ul className="vote-options">
            {options.map(o => (
              <li key={o.id}>
                <button
                  className={`vote-option ${selected === o.id ? "selected" : ""}`}
                  onClick={() => setSelected(o.id)}
                  disabled={!ready || busy}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
          <button
            className="btn btn-primary btn-block vote-submit"
            disabled={!selected || busy || !ready}
            onClick={submit}
          >
            {busy ? "제출 중…" : "투표하기"}
          </button>
          {error && <p className="vote-error">{error}</p>}
        </>
      )}
    </div>
  )
}
```

### 2.5 `app/vote/[id]/page.tsx`

```tsx
export default async function VotePage({ params }) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const supabase = await getServerClient()
  const { data: poll } = await supabase.from("polls").select("*").eq("id", id).maybeSingle<Poll>()
  if (!poll) notFound()

  const { data: options } = await supabase.from("poll_options")
    .select("*").eq("poll_id", id).order("position").returns<PollOption[]>()

  return <VoteView initialPoll={poll} initialOptions={options ?? []} />
}
```

### 2.6 `components/PollQR.tsx`

```tsx
"use client"
import { QRCodeSVG } from "qrcode.react"

interface Props { pollId: string }

export default function PollQR({ pollId }: Props) {
  const url = `${window.location.origin}/vote/${pollId}`

  return (
    <div className="poll-qr">
      <p className="poll-qr-label">참여자용 투표 링크</p>
      <div className="poll-qr-code">
        <QRCodeSVG value={url} size={180} />
      </div>
      <p className="poll-qr-url">{url}</p>
    </div>
  )
}
```

> `window.location.origin` 접근을 위해 `'use client'` 필수.

### 2.7 `app/polls/[id]/page.tsx` 수정

방장(`created_by === user.id`)에게만 PollQR 표시:

```tsx
export default async function PollPage({ params }) {
  const { id } = await params
  const supabase = await getServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: poll } = ...
  const { data: options } = ...

  const isOwner = user?.id === poll.created_by

  return (
    <>
      <PollView initialPoll={poll} initialOptions={options ?? []} />
      {isOwner && <PollQR pollId={id} />}
    </>
  )
}
```

---

## 3. CSS 추가 클래스

`app/globals.css`에 추가:

```css
/* 투표 전용 페이지 레이아웃 */
.vote-container {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 20px 80px;
}

.vote-page {
  width: 100%;
  max-width: 480px;
}

.vote-title {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 8px;
  line-height: 1.3;
}

.vote-desc {
  color: var(--muted);
  margin: 0 0 24px;
  white-space: pre-wrap;
}

.vote-options {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
  display: grid;
  gap: 10px;
}

.vote-option {
  width: 100%;
  padding: 16px 20px;
  text-align: left;
  font: inherit;
  font-size: 1rem;
  font-weight: 500;
  background: var(--surface);
  border: 2px solid var(--line);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color .15s, background .15s;
  color: var(--text);
}
.vote-option:hover:not(:disabled) { border-color: var(--accent); }
.vote-option.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
  font-weight: 700;
}
.vote-option:disabled { opacity: .5; cursor: not-allowed; }

.vote-submit { margin-top: 4px; padding: 14px; font-size: 1rem; }
.vote-error { color: var(--danger); font-size: .9rem; margin-top: 12px; }
.vote-closed { color: var(--muted); text-align: center; padding: 40px 0; font-size: 1.1rem; }

/* QR 코드 섹션 */
.poll-qr {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
  text-align: center;
}
.poll-qr-label { font-weight: 600; margin: 0 0 12px; }
.poll-qr-code {
  display: inline-block;
  padding: 12px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid var(--line);
}
.poll-qr-url {
  margin: 10px 0 0;
  font-size: .8rem;
  color: var(--muted);
  word-break: break-all;
}
```

---

## 4. File Impact Summary

| File | Action | Lines (est.) |
|------|--------|-------------|
| `app/layout.tsx` | 수정 — 헤더 제거, AuthProvider만 | ~20 |
| `app/(main)/layout.tsx` | 신규 — 헤더 있는 레이아웃 | ~20 |
| `app/(main)/` 하위 파일들 | 이동 (내용 변경 없음) | 0 |
| `app/vote/layout.tsx` | 신규 — vote 전용 레이아웃 | ~10 |
| `app/vote/[id]/page.tsx` | 신규 | ~30 |
| `components/VoteView.tsx` | 신규 | ~100 |
| `components/PollQR.tsx` | 신규 | ~25 |
| `app/polls/[id]/page.tsx` | 수정 — user 조회 + PollQR | ~15 diff |
| `app/globals.css` | 수정 — vote/QR CSS 추가 | ~70 |

**총계**: 신규 4파일, 수정 3파일, 이동 ~6파일

---

## 5. Package

```bash
pnpm add qrcode.react
```

TypeScript 타입 내장. `@types/qrcode.react` 불필요.

---

## 6. Data Flow

```
사용자 QR 스캔 → /vote/:id
    │
    ▼
app/vote/[id]/page.tsx  (Server)
    │  polls + poll_options SSR
    │
    ▼
VoteView  (Client)
    │  useAuth() → userId
    │  votes 조회 → myVotes
    │  선택 → cast_vote RPC
    │  완료 → 결과 표시
    ▼
결과: 각 옵션 vote_count / totalVotes %
```

---

## 7. Error Handling

| Scenario | Handling |
|----------|----------|
| 잘못된 UUID | `notFound()` |
| 존재하지 않는 투표 | `notFound()` |
| 마감된 투표 | "마감된 투표입니다" 메시지 표시 |
| 이미 투표 | 결과 화면 표시 |
| cast_vote 실패 | error state → `.vote-error` 표시 |
| 미선택 제출 시도 | submit 버튼 disabled |

---

## 8. Implementation Guide

### 11.1 Implementation Order

1. `pnpm add qrcode.react`
2. 루트 `app/layout.tsx` 수정 (헤더 제거)
3. `app/(main)/layout.tsx` 신규 (헤더 이동)
4. 기존 파일들 `app/(main)/` 로 이동
5. `app/vote/layout.tsx` 신규
6. `app/globals.css` CSS 추가
7. `components/VoteView.tsx` 신규
8. `app/vote/[id]/page.tsx` 신규
9. `components/PollQR.tsx` 신규
10. `app/polls/[id]/page.tsx` 수정

### 11.2 Key Dependencies

```
app/vote/[id]/page.tsx
  ← getServerClient
  ← Poll, PollOption types
  ← VoteView

components/VoteView.tsx
  ← useAuth (AuthProvider)
  ← getBrowserClient
  ← Poll, PollOption, isClosed, toMessage, formatDate
  ← cast_vote RPC

components/PollQR.tsx
  ← QRCodeSVG (qrcode.react)

app/polls/[id]/page.tsx (수정)
  ← PollQR (추가)
  ← auth.getUser() (추가)
```

### 11.3 Session Guide

```
Module Map:
  M1: 레이아웃 재구조화 (루트/main/vote layout + 파일 이동)
  M2: VoteView + vote page
  M3: PollQR + polls/[id] 수정

Recommended Sessions:
  Session 1: M1 (레이아웃)
  Session 2: M2 + M3 (컴포넌트)
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-11-21 | Initial design (Option B) | Claude |
