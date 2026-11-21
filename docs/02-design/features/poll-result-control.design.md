# Design: 투표 결과 공개 제어 (poll-result-control)

**Date**: 2026-11-21
**Status**: Design
**Architecture**: Option B — 탭 컴포넌트 분리

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 결과 실시간 노출로 편향 발생, 투표 변경 가능해 신뢰도 낮음 |
| **WHO** | 투표 생성자(방장), 투표 참여자 |
| **RISK** | 쿠키 삭제 시 재투표 가능 (기존 한계 유지) |
| **SUCCESS** | 투표 중 결과 비노출, 1회 제출 고정, 마감 후에만 결과 탭 접근 가능 |
| **SCOPE** | PollView.tsx 수정 + VoteTab.tsx, ResultTab.tsx 신규 생성 |

---

## 1. 컴포넌트 구조

```
components/
├── PollView.tsx      (기존 — 탭 전환 + 공통 상태 관리)
├── VoteTab.tsx       (신규 — 투표 UI)
└── ResultTab.tsx     (신규 — 결과 UI)
```

### 역할 분리

| 컴포넌트 | 역할 |
|---------|------|
| `PollView` | 공통 상태(poll, options, myVotes, userId), 탭 전환, Realtime 구독, 방장 액션 |
| `VoteTab` | 선택지 선택 UI, 투표 제출 버튼 (결과 비표시) |
| `ResultTab` | 득표수/퍼센트/막대그래프, 마감 전 잠금 처리 |

---

## 2. 상태 설계

### PollView 공통 상태 (기존 유지 + 변경)

```ts
// 유지
const [poll, setPoll] = useState(initialPoll)
const [options, setOptions] = useState(initialOptions)
const [myVotes, setMyVotes] = useState<string[] | null>(null)
const [now, setNow] = useState(0)

// 추가
const [activeTab, setActiveTab] = useState<'vote' | 'result'>('vote')

// 제거
// [editing] — 1회 제출 고정으로 불필요
// [peek]    — "결과만 보기" 버튼 제거로 불필요
```

### 탭 자동 전환 규칙

```
초기 진입 시:
  - 미투표 + 진행 중 → 'vote' 탭
  - 이미 투표함      → 'result' 탭 (재입장 처리)
  - 마감된 투표      → 'result' 탭

결과 탭 접근 가능 조건:
  - 투표 마감(closed === true) OR
  - 방장(isOwner === true)
```

---

## 3. VoteTab 설계

### Props

```ts
type VoteTabProps = {
  poll: Poll
  options: PollOption[]
  myVotes: string[] | null
  userId: string | null
  ready: boolean
  closed: boolean
  onVoted: (optionIds: string[]) => void  // 투표 완료 콜백
}
```

### 렌더링 조건

| 상태 | UI |
|------|-----|
| `myVotes.length > 0` | "이미 투표하셨습니다" + 결과 탭으로 이동 버튼 |
| `closed` | "마감된 투표입니다" 메시지 |
| 투표 가능 | 선택지 버튼 + "투표하기" 버튼 |

### 제거 항목
- 결과 미리보기 (막대그래프, 퍼센트) — 완전 제거
- "결과만 보기" 버튼 — 제거
- "표 바꾸기" 버튼 — 제거
- "투표 취소" 버튼 — 제거

---

## 4. ResultTab 설계

### Props

```ts
type ResultTabProps = {
  poll: Poll
  options: PollOption[]
  myVotes: string[] | null
  isOwner: boolean
  closed: boolean
  totalVotes: number
  maxVotes: number
}
```

### 렌더링 조건

| 상태 | UI |
|------|-----|
| `!closed && !isOwner` | 🔒 "마감 후 공개됩니다" 잠금 화면 |
| `closed \|\| isOwner` | 득표수/퍼센트/막대그래프 전체 표시 |
| `myVotes` 있음 | 본인 선택 항목에 "내 선택" 뱃지 |

### 결과 표시 항목
- 선택지별 퍼센트(%), 득표수, 막대그래프
- 1위 선택지 강조 (`.top` 클래스)
- 총 참여자 수, 총 득표수
- 본인 투표 항목에 "내 선택" 뱃지

---

## 5. 탭 UI

```
[ 투표 ] [ 결과 🔒 ]   ← 마감 전
[ 투표 ] [ 결과 ]      ← 마감 후
```

- 현재 탭에 활성화 스타일 (`.tab-active`)
- 잠긴 결과 탭 클릭 시: 탭 이동 없이 토스트/인라인 메시지 "마감 후 공개돼요"

---

## 6. 방장 액션

방장 전용 UI는 PollView 하단에 유지 (탭 외부):
- "지금 마감" 버튼
- "삭제" 버튼
- 링크 복사 버튼

---

## 7. Realtime

기존 PollView의 Supabase Realtime 구독 유지.
`options` 상태 업데이트 → ResultTab에 props로 전달 → 자동 반영.

---

## 8. 구현 순서

1. **PollView.tsx 리팩터링**
   - `editing`, `peek` 상태 제거
   - `activeTab` 상태 추가
   - 탭 자동 전환 로직 (`useEffect`)
   - 탭 UI 렌더링 (버튼 2개)
   - VoteTab, ResultTab 렌더링

2. **VoteTab.tsx 신규**
   - 선택지 선택 UI
   - 투표 제출 버튼
   - 이미 투표한 경우 메시지

3. **ResultTab.tsx 신규**
   - 잠금 화면 (마감 전, 비방장)
   - 결과 표시 (마감 후 or 방장)

### 11.3 Session Guide

| 모듈 | 파일 | 작업 |
|------|------|------|
| module-1 | PollView.tsx | 상태 정리 + 탭 UI + 자동 전환 로직 |
| module-2 | VoteTab.tsx | 투표 UI 신규 생성 |
| module-3 | ResultTab.tsx | 결과 UI 신규 생성 |

전체 한 세션에서 처리 가능한 범위입니다.
