# 투표하자

로그인 없이 QR 코드 한 장으로 공유하는 실시간 투표 앱.

> Next.js 15 App Router + Supabase (Auth · Realtime · RLS)

---

## 스크린샷

> 아래 경로에 이미지를 추가하면 자동으로 표시됩니다.

| 투표 목록 | 투표 관리 | 참여자 투표 화면 |
|-----------|-----------|----------------|
| ![투표 목록](docs/screenshots/polls-list.png) | ![투표 관리](docs/screenshots/poll-manage.png) | ![투표 화면](docs/screenshots/vote-page.png) |

| QR 코드 모달 | 결과 페이지 |
|-------------|------------|
| ![QR 모달](docs/screenshots/qr-modal.png) | ![결과](docs/screenshots/results.png) |

---

## 기능

### 참여자
- QR 코드 스캔 또는 링크로 투표 페이지 직접 접근 (`/vote/:id`)
- 헤더·푸터 없는 깔끔한 투표 전용 화면
- 투표 완료 후 실시간 결과 즉시 확인 (옵션별 %, 내 선택 표시)
- 1인 1표 보장 — 익명 인증으로 브라우저마다 사용자 식별

### 방장 (투표 만든 사람)
- 투표 생성: 제목·설명·선택지(2~10개)·단일/복수 선택·마감 시간
- 관리 페이지(`/polls/:id`)에서 옵션 목록 확인, 지금 마감, 삭제
- **QR 코드 모달** — 참여자용 투표 링크를 QR로 바로 공유
- 상세 결과 페이지(`/polls/:id/results`)에서 순위·득표수·비율 확인

### 공통
- 실시간 결과 반영 (Supabase Realtime)
- 다크 모드 자동 대응
- 비밀투표 — 본인 선택만 조회 가능

---

## 페이지 구조

```
/                      → /polls 로 리다이렉트
/polls                 투표 목록 (진행 중 / 마감 탭)
/polls/new             투표 만들기
/polls/:id             투표 관리 페이지 (방장 전용 기능 포함)
/polls/:id/results     상세 결과 (방장 전용)
/vote/:id              참여자 전용 투표 페이지 (헤더 없음)
```

---

## 실행 방법

### 1. Supabase 설정 (약 5분)

1. [supabase.com](https://supabase.com/dashboard) 에서 새 프로젝트 생성
2. **익명 로그인 켜기**: Authentication → Providers → **Anonymous Sign-ins** ON
3. **스키마 적용**: SQL Editor에 `supabase/migrations/0001_init.sql` 붙여넣고 Run
4. **권한 설정**: 아래 SQL을 SQL Editor에서 실행
   ```sql
   GRANT UPDATE, DELETE ON public.polls TO authenticated;
   ```

### 2. 환경변수

```bash
cp .env.example .env.local
```

`.env.local` 에 Project Settings → API Keys 에서 복사:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

### 3. 실행

```bash
pnpm install
pnpm dev   # http://localhost:3000
```

### 4. 실시간 확인

같은 투표 링크를 일반 창 + 시크릿 창에서 열고,
한쪽에서 `/vote/:id` 페이지에서 투표 → 다른 쪽 막대가 바로 움직임.

---

## 프로젝트 구조

```
app/
  layout.tsx                루트 레이아웃 (<html><body> + AuthProvider)
  (main)/                   헤더 있는 레이아웃 그룹
    layout.tsx              사이트 헤더 + main 컨테이너
    page.tsx                → /polls 리다이렉트
    polls/
      page.tsx              투표 목록 (서버 컴포넌트)
      new/page.tsx          투표 만들기
      [id]/
        page.tsx            투표 관리 페이지
        results/page.tsx    상세 결과
  vote/
    layout.tsx              헤더 없는 투표 전용 레이아웃
    [id]/page.tsx           참여자 투표 페이지

components/
  AuthProvider.tsx          익명 로그인 자동 처리, useAuth() 훅 제공
  PollView.tsx              투표 관리 UI + Realtime 구독 + QR 모달
  VoteView.tsx              참여자 투표 UI (PollView 와 완전 독립)
  PollListTabs.tsx          목록 탭 (진행 중 / 마감)

lib/
  supabase/                 브라우저·서버 Supabase 클라이언트
  types.ts                  Poll, PollOption 타입 + 유틸 함수

supabase/migrations/        테이블, RLS 정책, RPC, 트리거
```

---

## 설계 포인트

| 주제 | 내용 |
|------|------|
| **쓰기 RPC 단일화** | `create_poll`, `cast_vote` RPC만 허용. 테이블 직접 INSERT/UPDATE 권한 없음 → 득표수 위조·중복 투표 차단 |
| **득표수 트리거** | `poll_options.vote_count` 는 트리거로 증감. 조회 시 COUNT 불필요, Realtime은 이 컬럼 변화만 구독 |
| **동시성** | `cast_vote` 는 `FOR UPDATE` 잠금으로 동시 요청 시 참여자 수 정합성 보장 |
| **레이아웃 분리** | Route Group `(main)/` 로 헤더 있는 영역과 `/vote/*` (헤더 없음) 분리 |
| **Realtime 보정** | 채널 재연결 시 전체 재조회로 놓친 변경 보정 |

---

## 한계 & 확장

- **1인 1표 우회 가능**: 쿠키 삭제·시크릿 창·다른 기기로 재투표 가능.
  진지한 투표라면 카카오/구글 OAuth 또는 이메일 매직링크로 교체 권장.
- **익명 사용자 누적**: `auth.users` 에 계속 쌓이므로 주기적 정리 필요.
- **배포**: Vercel에 import → 환경변수 2개 등록하면 완료.
