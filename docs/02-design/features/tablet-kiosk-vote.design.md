# Design: tablet-kiosk-vote

- Date: 2026-11-21
- Phase: Design
- Architecture: Option B — KioskView 독립 컴포넌트

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| WHY | 폰 없는 참여자 포용 — 현장 태블릿 키오스크로 접근성 보장 |
| WHO | 현장 진행자(태블릿 세팅), 스마트폰 미소지 투표 참여자 |
| RISK | 공용 기기 중복 투표 허용 (신뢰 기반 운영) |
| SUCCESS | /kiosk/:id 접속 → 선택 → 자동 리셋 흐름이 오류 없이 작동 |
| SCOPE | `/kiosk/:id` 신규 라우트 + KioskView 컴포넌트 (기존 /vote 무변경) |

---

## 1. Overview

`/kiosk/:id` 경로에 태블릿 전용 키오스크 투표 UI를 추가한다.
기존 `/vote/:id` (개인폰용)와 완전히 독립된 컴포넌트로 구성한다.

**선택 아키텍처: Option B — KioskView 독립**
- VoteView와 KioskView는 별개 컴포넌트 (공통 prop/훅 없음)
- 리셋 시 Supabase `signOut` → `signInAnonymously` 재호출로 세션 교체
- 기존 코드 변경 최소화 (proxy.ts 1줄, globals.css 추가)

---

## 2. 화면 흐름

```
[대기 화면]
  투표 제목 + 설명
  선택지 버튼들 (큰 터치 타깃)
  "투표하기" 버튼 (선택 전: disabled)
       ↓ 제출
[완료 화면]
  "수고하셨습니다"
  내가 선택한 항목
  카운트다운: 3 → 2 → 1
       ↓ 0이 되면
[세션 교체]
  signOut() → signInAnonymously()
  selected/busy/error 상태 초기화
       ↓
[대기 화면] (다음 사람)
```

---

## 3. 컴포넌트 구조

```
app/kiosk/[id]/page.tsx       Server Component
  └── KioskView               Client Component
        ├── AuthProvider (이미 layout에서 감쌈)
        ├── 투표 UI (대기 화면)
        └── 완료 UI (카운트다운 + 리셋)
```

### app/kiosk/[id]/page.tsx

- `app/vote/[id]/page.tsx`와 동일 패턴 (SSR 데이터 패치)
- UUID 검증, `polls` + `poll_options` 조회
- `<KioskView initialPoll={poll} initialOptions={options} />` 렌더

### components/KioskView.tsx

**상태:**
```typescript
const [options, setOptions] = useState(initialOptions)
const [selected, setSelected] = useState<string>("")
const [busy, setBusy] = useState(false)
const [error, setError] = useState<string | null>(null)
const [done, setDone] = useState(false)           // 완료 화면 표시 여부
const [countdown, setCountdown] = useState(3)     // 카운트다운 숫자
const [now, setNow] = useState(0)
```

**리셋 로직:**
```typescript
// done=true가 되면 카운트다운 시작
useEffect(() => {
  if (!done) return;
  setCountdown(3);
  const interval = setInterval(() => {
    setCountdown((n) => {
      if (n <= 1) {
        clearInterval(interval);
        resetSession(); // signOut → signInAnonymously → 상태 초기화
        return 0;
      }
      return n - 1;
    });
  }, 1000);
  return () => clearInterval(interval);
}, [done]);
```

**세션 교체 함수:**
```typescript
async function resetSession() {
  await supabase.auth.signOut();
  await supabase.auth.signInAnonymously();
  setSelected("");
  setBusy(false);
  setError(null);
  setDone(false);
}
```

**투표 제출:**
```typescript
async function submit() {
  if (!selected) return;
  setBusy(true);
  const { error } = await supabase.rpc("cast_vote", {
    p_poll_id: poll.id,
    p_option_ids: [selected],
  });
  setBusy(false);
  if (error) {
    setError(toMessage(error));
  } else {
    setDone(true);
  }
}
```

---

## 4. 라우트 구성

```
app/
  kiosk/
    [id]/
      page.tsx       ← 신규 (헤더 없는 레이아웃)
```

**레이아웃 처리:**
- `app/kiosk/` 디렉토리는 `(main)` 그룹 외부 → 헤더 없음
- `app/layout.tsx` (루트 레이아웃)의 `<AuthProvider>` 적용은 유지됨

---

## 5. proxy.ts 수정

```typescript
// 현재
const isPublic =
  pathname.startsWith("/vote/") ||
  pathname === "/login" ||
  pathname.startsWith("/api/login") ||
  pathname.startsWith("/api/logout");

// 변경 후
const isPublic =
  pathname.startsWith("/vote/") ||
  pathname.startsWith("/kiosk/") ||   // ← 추가
  pathname === "/login" ||
  pathname.startsWith("/api/login") ||
  pathname.startsWith("/api/logout");
```

---

## 6. CSS 설계 (`globals.css` 추가)

```css
/* 키오스크 전용 — 태블릿 큰 터치 타깃 */
.kiosk-page { ... }          /* 전체 래퍼, 중앙 정렬, 패딩 */
.kiosk-title { ... }         /* 큰 제목 */
.kiosk-options { ... }       /* 선택지 그리드 */
.kiosk-option { ... }        /* 버튼: min-height 80px, font-size 1.2rem */
.kiosk-option.selected { ... }  /* 선택 상태 */
.kiosk-submit { ... }        /* 큰 제출 버튼 */
.kiosk-done-wrap { ... }     /* 완료 화면 래퍼 */
.kiosk-countdown { ... }     /* 카운트다운 숫자 */
```

---

## 7. 데이터 흐름

```
page.tsx (Server)
  → getServerClient() → polls + poll_options 조회
  → <KioskView initialPoll={poll} initialOptions={options} />

KioskView (Client)
  → useAuth() → userId 확인 (AuthProvider)
  → getBrowserClient() → cast_vote RPC
  → done=true → countdown useEffect → resetSession()
  → supabase.auth.signOut() + signInAnonymously()
```

---

## 8. 성공 기준 매핑

| SC | 구현 위치 |
|----|-----------|
| SC-01 | `app/kiosk/[id]/page.tsx` SSR 데이터 패치 |
| SC-02 | `KioskView` done=true 시 완료 UI 렌더 |
| SC-03 | `KioskView` countdown useEffect + resetSession() |
| SC-04 | `KioskView` isClosed() 체크 → 마감 메시지 |
| SC-05 | `proxy.ts` isPublic에 `/kiosk/` 추가 |

---

## 9. 구현 대상 파일 요약

| 파일 | 작업 | 예상 줄수 |
|------|------|-----------|
| `app/kiosk/[id]/page.tsx` | 신규 | ~50줄 |
| `components/KioskView.tsx` | 신규 | ~130줄 |
| `proxy.ts` | 수정 (1줄 추가) | +1줄 |
| `app/globals.css` | 수정 (kiosk 스타일) | +50줄 |

---

## 10. 비고

- `app/kiosk/` 는 `(main)` route group 밖 → 헤더 레이아웃 미적용
- `AuthProvider`는 루트 `app/layout.tsx`에서 감싸므로 kiosk에서도 동작
- 리셋 후 `signInAnonymously`는 `AuthProvider`의 `onAuthStateChange`가 자동 감지해 `userId` 갱신
- Supabase Anonymous Sign-in이 대시보드에서 활성화되어 있어야 함 (기존과 동일)

---

## 11. Implementation Guide

### 11.1 구현 순서

1. `proxy.ts` — `/kiosk/` isPublic 추가 (1줄)
2. `app/kiosk/[id]/page.tsx` — Server Component 신규 작성
3. `components/KioskView.tsx` — Client Component 신규 작성
4. `app/globals.css` — kiosk 전용 스타일 추가

### 11.2 의존성

추가 패키지 없음 (기존 Supabase, React 훅만 사용)

### 11.3 Session Guide

| Module | 파일 | 작업 |
|--------|------|------|
| module-1 | proxy.ts | isPublic 수정 |
| module-2 | app/kiosk/[id]/page.tsx | SSR 라우트 신규 |
| module-3 | components/KioskView.tsx | 키오스크 UI + 리셋 로직 |
| module-4 | app/globals.css | kiosk 스타일 |

전체 구현 1세션으로 완료 가능.
