# vote-only-page Gap Analysis

> **Project**: vote-app
> **Date**: 2026-11-21
> **Phase**: Check
> **Match Rate**: 95%

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

## 1. Strategic Alignment

| Check | Status | Evidence |
|-------|--------|----------|
| WHY 충족: 참여자 전용 URL 분리 | ✅ | `/vote/:id` → `app/vote/[id]/page.tsx` |
| 헤더/푸터 없는 레이아웃 | ✅ | `app/vote/layout.tsx` — `<main class="vote-container">` only |
| QR로 참여 URL 공유 | ✅ | `PollQR.tsx` → `/vote/:id` 링크 + SVG QR |
| 방장 전용 QR 노출 | ✅ | `isOwner = user?.id === poll.created_by` |

---

## 2. Success Criteria Evaluation

| Criteria | Status | Evidence |
|----------|--------|----------|
| `/vote/:id` 페이지 접근 가능 | ✅ Met | `app/vote/[id]/page.tsx` |
| 헤더/푸터 없음 | ✅ Met | `app/vote/layout.tsx` — header 없음, route group 분리 |
| 제목 + 선택지 + 투표 버튼만 표시 | ✅ Met | `VoteView.tsx` 최소 UI |
| 투표 완료 후 결과 표시 | ✅ Met | `hasVoted → vote-result-list` with %, mine badge |
| 마감된 투표 메시지 | ✅ Met | `isClosed(poll, now)` → "마감된 투표입니다" |
| 방장에게만 QR 코드 표시 | ✅ Met | `polls/[id]/page.tsx:43 — isOwner && <PollQR>` |
| PollView와 독립적 (VoteView) | ✅ Met | VoteView imports nothing from PollView |

**Success Rate: 7/7 (100%)**

---

## 3. Architecture Decision Verification

| Decision | Expected | Actual | Match |
|----------|----------|--------|-------|
| 선택 아키텍처 | Option B — VoteView 완전 독립 | VoteView는 PollView 의존 없음 | ✅ |
| Route Group 헤더 분리 | `(main)/` group + `vote/` 별도 | 구현 완료 | ✅ |
| `qrcode.react` QRCodeSVG | `QRCodeSVG value={url} size={180}` | 동일 | ✅ |
| `window.location.origin` 사용 | `'use client'` 필수 | `PollQR.tsx:1 "use client"` | ✅ |
| `cast_vote` RPC | `p_poll_id`, `p_option_ids` 배열 | `VoteView.tsx:59-62` | ✅ |
| UUID 검증 | `notFound()` on invalid | `vote/[id]/page.tsx:18-19` | ✅ |

---

## 4. Gap List

### G-01 — 로딩 중 투표 폼 조기 노출 [Low]

**Design spec** (§2.4):
```
myVotes === null : 로딩 스피너 (또는 스켈레톤)
```

**Implementation** (`VoteView.tsx:72`):
```tsx
const hasVoted = (myVotes?.length ?? 0) > 0;
// myVotes === null → hasVoted = false → 투표 폼 렌더링
```

`myVotes === null` (votes 쿼리 로딩 중) 상태를 별도로 처리하지 않아 투표 완료 사용자에게 투표 폼이 순간적으로 노출될 수 있음. 버튼은 `disabled={!ready || busy}`로 보호되지만, `ready=true`이고 votes 쿼리만 늦을 경우 버튼이 활성화된 채 폼이 보임.

**영향**: UX 깜빡임, 기능상 오류는 없음 (cast_vote RPC가 중복 투표 차단)

---

### G-02 — CSS 소폭 차이 [Low / Cosmetic]

| 항목 | Design | Implementation |
|------|--------|---------------|
| `.vote-container` min-height | `100vh` | `100dvh` (모바일 대응 개선) |
| `.vote-container` padding-top | `40px` | `48px` |
| `.vote-options` margin-bottom | `20px` | `16px` |
| `.poll-qr` 스타일 | `border-top` 구분선 | 카드 박스 (border + radius + bg) |

> **판단**: `100dvh`와 카드 스타일 QR은 의도적 개선으로 허용 범위.

---

## 5. Match Rate

| 항목 | 점수 |
|------|------|
| FR Coverage (7/7) | 100% |
| Architecture Decisions | 100% |
| G-01 (Low) | -3% |
| G-02 (Low/Cosmetic) | -2% |
| **Total Match Rate** | **95%** |

---

## 6. File Coverage

| File | Reviewed | Status |
|------|----------|--------|
| `app/vote/layout.tsx` | ✅ | Design match |
| `app/vote/[id]/page.tsx` | ✅ | Design match |
| `components/VoteView.tsx` | ✅ | G-01 (loading state) |
| `components/PollQR.tsx` | ✅ | Design match |
| `app/(main)/polls/[id]/page.tsx` | ✅ | Design match |
| `app/globals.css` | ✅ | G-02 (cosmetic CSS diff) |

---

## 7. Verdict

**Match Rate 95% ≥ 90% threshold** → 보고서 단계 진행 가능.

G-01 로딩 스피너 미구현은 기능 오류가 아닌 UX 개선 항목. 필요시 `iterate`로 수정 가능.
