# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # 개발 서버 실행 (http://localhost:3000)
pnpm build      # 프로덕션 빌드
pnpm start      # 빌드된 앱 실행
pnpm typecheck  # TypeScript 타입 체크 (tsc --noEmit)
```

테스트 프레임워크는 없음. 타입 체크가 주요 정적 검증 수단.

## 환경 변수

`.env.local` 파일 필요:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   # 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY
```

`isSupabaseConfigured`(`lib/supabase/env.ts`)가 false이면 앱이 오류 배너만 표시함.

## 아키텍처

**Next.js 15 App Router + Supabase** 구성. 패키지 매니저는 pnpm.

### 데이터 흐름

- **서버 컴포넌트** (`app/page.tsx`, `app/polls/[id]/page.tsx`): `getServerClient()`로 SSR 데이터 패치.
- **클라이언트 컴포넌트** (`components/PollView.tsx`, `app/polls/new/page.tsx`): `getBrowserClient()` 싱글턴 사용.
- Supabase 세션은 쿠키에 저장되어 서버·브라우저 양쪽에서 공유됨 (`@supabase/ssr`).

### 인증 (익명 로그인)

`AuthProvider`(`components/AuthProvider.tsx`)가 앱 전체를 감쌈.
방문자가 처음 접속하면 Supabase `signInAnonymously()`로 자동 익명 계정 발급 → 쿠키에 세션 저장 → 1인 1표 보장.
`useAuth()` 훅이 `{ userId, ready }` 반환. `ready`가 false이면 익명 세션 미발급 상태.

**Supabase 대시보드에서 "Anonymous Sign-ins" 옵션을 활성화해야 작동함.**

### Supabase RPC

투표 생성과 투표 행사는 직접 테이블 쓰기 대신 RPC 호출:
- `create_poll(p_title, p_options, p_description, p_allow_multiple, p_closes_at)` → 투표 UUID 반환
- `cast_vote(p_poll_id, p_option_ids)` → 투표 행사 (배열 비워서 호출하면 취소)

### 실시간

`PollView`는 Supabase Realtime으로 `poll_options`·`polls` 테이블 변경을 구독.
채널 이름: `poll:{id}`. 구독 연결 직후 `refetch()`로 놓친 변경 보정.

### 데이터 타입

`lib/types.ts`에 `Poll`, `PollOption` 타입과 `isClosed`, `formatDate`, `toMessage` 유틸 함수 정의.
