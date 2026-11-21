# poll-list-and-results Planning Document

> **Summary**: 투표목록 전용 `/polls` 라우트(진행중/마감 탭)와 방장 전용 결과 페이지 개선
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
| **Problem** | 홈(`/`)이 투표목록 역할을 겸하고 있어 라우팅이 불명확하고, 진행중·마감 필터링이 없어 사용자가 원하는 투표를 찾기 어렵다 |
| **Solution** | `/polls` 전용 라우트 생성 + 진행중/마감 탭 UI 추가. 홈은 `/polls`로 리다이렉트. 결과 페이지는 방장 전용 유지하며 UI 완성도 개선 |
| **Function/UX Effect** | 사용자가 진행중·마감 투표를 탭으로 즉시 구분 가능. 방장은 `/polls/:id/results`에서 명확한 결과 뷰를 확인 |
| **Core Value** | 명확한 URL 구조와 탭 필터링으로 투표 탐색 UX 개선 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 홈이 목록 역할을 겸해 라우팅 불명확, 진행중/마감 구분 불가 |
| **WHO** | 투표 참여자(목록 탐색), 방장(결과 확인) |
| **RISK** | 홈(`/`) 접근 경로 변경 시 기존 북마크/링크 유실 가능성 |
| **SUCCESS** | `/polls` 라우트에서 탭 전환 동작, 결과 페이지 방장만 접근 |
| **SCOPE** | Phase 1: `/polls` 페이지 + 탭 UI / Phase 2: 결과 페이지 UI 개선 |

---

## 1. Overview

### 1.1 Purpose

투표목록을 `/polls` 전용 라우트로 분리하고, 진행중/마감 탭 필터를 추가하여 투표 탐색 UX를 개선한다.
결과 페이지는 방장 전용 접근을 유지하면서 시각적 완성도를 높인다.

### 1.2 Background

현재 `app/page.tsx`(홈)가 투표목록 역할을 겸하고 있어:
- URL 구조가 불명확 (`/` vs `/polls`)
- 진행중·마감 투표가 한 목록에 섞여 있어 탐색 불편
- 결과 페이지(`/polls/:id/results`)는 방장 전용이나 UI 개선 여지가 있음

### 1.3 Related Documents

- 기존 구현: `app/page.tsx`, `app/polls/[id]/results/page.tsx`
- 타입 정의: `lib/types.ts`

---

## 2. Scope

### 2.1 In Scope

- [ ] `app/polls/page.tsx` 생성 — 투표목록 전용 페이지
- [ ] 진행중 / 마감 탭 UI (클라이언트 사이드 탭 전환)
- [ ] `app/page.tsx` → `/polls` 리다이렉트 처리
- [ ] 결과 페이지(`app/polls/[id]/results/page.tsx`) UI 개선
  - 순위 표시 (1위 하이라이트)
  - 총 참여자·총 투표수 요약 개선

### 2.2 Out of Scope

- 결과 페이지 공개 접근 (방장 전용 유지)
- 무한스크롤/페이지네이션 (현재 50개 limit 유지)
- 검색/키워드 필터
- 실시간 목록 업데이트

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | `/polls` 라우트에서 전체 투표목록 표시 | High | Pending |
| FR-02 | 탭: "진행중" (closes_at 미도래 or null) / "마감" (closes_at 도래) | High | Pending |
| FR-03 | 탭 전환 시 해당 상태 투표만 표시 | High | Pending |
| FR-04 | `app/page.tsx`는 `/polls`로 redirect | High | Pending |
| FR-05 | 결과 페이지 — 순위 1위 옵션 시각적 강조 | Medium | Pending |
| FR-06 | 결과 페이지 — 총 참여자수·총 득표수 요약 카드 | Medium | Pending |
| FR-07 | 각 탭에 투표 개수 뱃지 표시 (예: 진행중 3) | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | SSR 렌더링, 탭 전환은 클라이언트 필터 (추가 fetch 없음) | 개발자 도구 Network |
| Accessibility | 탭에 `role="tab"` 적용, 키보드 전환 가능 | 수동 검증 |
| Type Safety | TypeScript 타입 오류 없음 | `pnpm typecheck` |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] `/polls` 접속 시 투표목록 렌더링
- [ ] 진행중/마감 탭 전환 동작
- [ ] `/` 접속 시 `/polls`로 리다이렉트
- [ ] 결과 페이지 방장 전용 접근 유지
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm build` 성공

### 4.2 Quality Criteria

- [ ] 타입 오류 0개
- [ ] 빌드 성공
- [ ] 기존 `/polls/:id` 페이지 영향 없음

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 홈(`/`) 리다이렉트로 기존 북마크 유실 | Low | Low | 홈을 redirect로 처리해 기존 URL 접근 유지 |
| 탭 상태를 URL query로 관리 시 SSR 복잡도 증가 | Medium | Medium | 클라이언트 사이드 useState 탭 전환으로 단순화 |
| 결과 페이지 권한 로직 변경 실수 | High | Low | 기존 `created_by` 비교 로직 유지, UI만 수정 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `app/page.tsx` | Page Route | 목록 로직 제거 → `/polls` redirect로 대체 |
| `app/polls/page.tsx` | Page Route | 신규 생성 — 투표목록 UI |
| `app/polls/[id]/results/page.tsx` | Page Route | UI 개선 (로직 변경 없음) |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `app/page.tsx` | READ | 직접 접근 `/` | redirect로 대체 — 기능 동일 |
| `app/polls/[id]/results/page.tsx` | READ | 방장이 결과 버튼 클릭 | UI만 변경, 접근 로직 동일 |

### 6.3 Verification

- [ ] `/polls` 접근 정상 동작
- [ ] `/` 접근 시 `/polls` 리다이렉트 확인
- [ ] 기존 `/polls/:id` 개별 투표 페이지 영향 없음

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Selected |
|-------|:--------:|
| **Starter** | ☐ |
| **Dynamic** | ☑ |
| **Enterprise** | ☐ |

### 7.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 탭 상태 관리 | `useState` (클라이언트) | 추가 fetch 없이 SSR 데이터를 클라이언트에서 필터링 — 단순함 |
| 목록 데이터 패치 | Server Component + `getServerClient()` | 기존 패턴 일관성 유지 |
| 홈 처리 | `redirect('/polls')` in `page.tsx` | SEO/북마크 유지하며 단순 처리 |
| 결과 페이지 접근 | 기존 `created_by` 비교 유지 | 보안 로직 변경 없음 |

### 7.3 Folder Structure

```
app/
├── page.tsx                    ← redirect('/polls')로 변경
├── polls/
│   ├── page.tsx               ← 신규: 투표목록 + 탭 UI
│   ├── new/page.tsx           ← 변경 없음
│   └── [id]/
│       ├── page.tsx           ← 변경 없음
│       └── results/page.tsx   ← UI 개선만
components/
│   └── PollListTabs.tsx       ← 신규: 탭 클라이언트 컴포넌트
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md` 에 아키텍처 패턴 명시
- [x] TypeScript (`tsconfig.json`)
- [x] pnpm 패키지 매니저

### 8.2 Key Conventions

| Category | Rule |
|----------|------|
| 서버 컴포넌트 | `getServerClient()` 사용, `async` 함수 |
| 클라이언트 컴포넌트 | `'use client'` 선언, `getBrowserClient()` 싱글턴 |
| 스타일 | `globals.css` CSS 변수 기반, BEM-like 클래스명 |
| 타입 | `lib/types.ts`의 `Poll`, `PollOption`, 유틸 함수 사용 |

---

## 9. Next Steps

1. [ ] `/pdca design poll-list-and-results` — 상세 설계 문서 작성
2. [ ] `PollListTabs` 클라이언트 컴포넌트 구현
3. [ ] `app/polls/page.tsx` 서버 컴포넌트 구현
4. [ ] `app/page.tsx` redirect 처리
5. [ ] 결과 페이지 UI 개선

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-11-21 | Initial draft | Claude |
