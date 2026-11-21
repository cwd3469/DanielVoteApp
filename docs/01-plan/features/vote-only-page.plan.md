# vote-only-page Planning Document

> **Summary**: 헤더/푸터 없는 순수 투표 전용 페이지(/vote/:id) 신규 + 관리 페이지에 QR 링크 제공
>
> **Project**: vote-app
> **Version**: 0.1.0
> **Author**: Claude
> **Date**: 2026-11-21
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 현재 `/polls/:id`는 관리 기능(마감·삭제·결과 보기 등)이 섞여 있어 참여자에게 공유하기 불적합. QR로 공유할 수 있는 간결한 투표 전용 페이지가 없음 |
| **Solution** | `/vote/:id` 전용 라우트 신설 — 제목·선택지·제출만 있는 미니멀 투표 UI. 헤더/푸터 없음. `/polls/:id`는 방장용 관리 페이지로 유지. 관리 페이지에 QR 코드 추가 |
| **Function/UX Effect** | 방장은 QR 스캔으로 참여자를 `/vote/:id`로 안내. 참여자는 불필요한 UI 없이 바로 투표 가능 |
| **Core Value** | 오프라인 현장에서 QR 하나로 즉시 투표 참여 가능한 경험 제공 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 공유용 투표 페이지와 관리 페이지 혼재 → 참여자 UX 저하 |
| **WHO** | 투표 참여자(QR 스캔 후 투표), 방장(QR 생성·공유) |
| **RISK** | `/vote/:id`와 `/polls/:id` 로직 중복 발생 가능. qrcode.react 패키지 추가 |
| **SUCCESS** | `/vote/:id`에서 투표 완료 후 결과 표시, QR 스캔으로 접근 가능 |
| **SCOPE** | Phase 1: `/vote/:id` 페이지 / Phase 2: 관리 페이지 QR 추가 |

---

## 1. Overview

### 1.1 Purpose

참여자에게 공유 가능한 최소 UI의 투표 전용 페이지를 제공하고,
방장이 QR 코드로 쉽게 링크를 공유할 수 있게 한다.

### 1.2 Background

현재 `/polls/:id`(PollView)는:
- 투표 기능 + 방장 전용 버튼(마감·삭제·결과 보기)이 같은 페이지에 존재
- 헤더/푸터가 포함된 레이아웃
- QR 공유 수단 없음

참여자에게 공유할 때는 불필요한 UI가 보이고, 오프라인 현장 투표에 적합하지 않다.

### 1.3 Related Documents

- 기존 투표 로직: `components/PollView.tsx`
- 인증: `components/AuthProvider.tsx`
- 타입: `lib/types.ts`

---

## 2. Scope

### 2.1 In Scope

- [ ] `app/vote/[id]/page.tsx` 신규 — 투표 전용 Server Component
- [ ] `components/VoteView.tsx` 신규 — 헤더/푸터 없는 최소 투표 UI 클라이언트 컴포넌트
  - 제목 표시
  - 선택지 목록 + 선택
  - "투표하기" 제출 버튼
  - 이미 투표한 경우 결과(%) 표시
- [ ] `app/vote/layout.tsx` 신규 — 헤더/푸터 없는 별도 레이아웃
- [ ] `components/PollQR.tsx` 신규 — `/vote/:id` QR 코드 클라이언트 컴포넌트
- [ ] `app/polls/[id]/page.tsx` 수정 — QR 섹션 추가 (방장에게만 표시)
- [ ] `qrcode.react` 패키지 설치

### 2.2 Out of Scope

- 복수 선택(allow_multiple) 지원 — 단일 선택만 (단순화)
- 투표 전용 페이지에서 투표 취소
- 투표 전용 페이지에서 마감·삭제 기능
- QR 이미지 다운로드

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | `/vote/:id` 접속 시 투표 제목 + 선택지 + 제출 버튼만 표시 | High | Pending |
| FR-02 | `/vote/:id` 페이지에 헤더/푸터 없음 (별도 layout) | High | Pending |
| FR-03 | 익명 세션 기반 투표 (기존 `cast_vote` RPC 재사용) | High | Pending |
| FR-04 | 이미 투표한 경우 결과(선택지별 %) 표시 | High | Pending |
| FR-05 | 마감된 투표 접속 시 "마감된 투표입니다" 메시지 표시 | Medium | Pending |
| FR-06 | 관리 페이지(`/polls/:id`)에 방장에게만 QR 코드 표시 | High | Pending |
| FR-07 | QR은 `/vote/:id` URL을 인코딩 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| 모바일 최적화 | `/vote/:id` 는 모바일 화면 기준 풀스크린 레이아웃 |
| 성능 | qrcode.react 클라이언트 렌더링, SSR 불필요 |
| 타입 안전 | `pnpm typecheck` 통과 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] `/vote/:id` 접속 → 투표 UI만 렌더링 (헤더/푸터 없음)
- [ ] 투표 제출 → `cast_vote` RPC 호출 성공
- [ ] 이미 투표 → 결과 표시
- [ ] 마감 투표 → 마감 메시지
- [ ] 관리 페이지 방장 → QR 코드 표시
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm build` 성공

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| VoteView와 PollView 로직 중복 | Medium | High | `cast_vote` RPC, `votes` 조회 로직을 VoteView에서 재구현 (공유 훅 불필요, 독립성 유지) |
| qrcode.react SSR 오류 | Low | Medium | `'use client'` PollQR 컴포넌트로 분리, dynamic import 불필요 |
| `/vote/:id` RLS 접근 | Medium | Low | 기존 polls/poll_options SELECT 정책 그대로 적용 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `app/polls/[id]/page.tsx` | Page | QR 섹션 추가 (방장 조건부) |
| `app/vote/[id]/page.tsx` | Page Route | 신규 생성 |
| `app/vote/layout.tsx` | Layout | 신규 — 헤더/푸터 없는 레이아웃 |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `app/polls/[id]/page.tsx` | READ | 기존 PollView 렌더링 | QR 섹션만 추가, 기존 로직 영향 없음 |
| `cast_vote` RPC | EXEC | PollView.tsx → VoteView에서도 사용 | 동일 RPC 재사용, 중복 아님 |

---

## 7. Architecture Considerations

### 7.1 Folder Structure

```
app/
├── vote/
│   ├── layout.tsx          ← 신규: 헤더/푸터 없는 레이아웃
│   └── [id]/
│       └── page.tsx        ← 신규: Server Component
├── polls/
│   └── [id]/
│       └── page.tsx        ← 수정: QR 섹션 추가
components/
├── VoteView.tsx             ← 신규: 투표 전용 클라이언트 컴포넌트
└── PollQR.tsx               ← 신규: QR 코드 클라이언트 컴포넌트
```

### 7.2 Key Decisions

| Decision | Selected | Rationale |
|----------|---------|-----------|
| 레이아웃 분리 | `app/vote/layout.tsx` | Next.js nested layout으로 헤더/푸터 완전 제거 |
| VoteView | PollView 독립 재구현 | 의존성 없이 단순하게 유지. 로직 단순화 |
| QR 렌더링 | `'use client'` PollQR 컴포넌트 | qrcode.react는 DOM 필요, SSR 불가 |
| 복수 선택 | 단일 선택만 지원 | 투표 전용 페이지 단순화 |

---

## 8. Package

```bash
pnpm add qrcode.react
pnpm add -D @types/qrcode  # 필요 시
```

> qrcode.react는 자체 TypeScript 타입 포함, `@types` 불필요.

---

## 9. Next Steps

1. [ ] `/pdca design vote-only-page`
2. [ ] `pnpm add qrcode.react`
3. [ ] `app/vote/layout.tsx` 구현
4. [ ] `components/VoteView.tsx` 구현
5. [ ] `app/vote/[id]/page.tsx` 구현
6. [ ] `components/PollQR.tsx` 구현
7. [ ] `app/polls/[id]/page.tsx` QR 섹션 추가

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-11-21 | Initial draft | Claude |
