# light-mode-colors Plan

> **Project**: vote-app
> **Date**: 2026-11-21
> **Status**: Draft

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 라이트 모드 accent(#3b5bdb)가 채도·명도가 높아 장시간 사용 시 눈 피로 유발 |
| **Solution** | CSS 변수 `globals.css :root` 블록만 수정 — 다크 모드 변경 없음 |
| **UX Effect** | 배경 약간 워밍, accent 채도 완화, 상태 색상 밝기 개선 → 눈이 편안한 화면 |
| **Core Value** | 디자인 시스템 최소 변경으로 라이트 모드 체감 품질 향상 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 라이트 모드 색상이 강해 눈 피로 → 편안한 색상 팔레트로 개선 |
| **WHO** | 라이트 모드 사용자 |
| **RISK** | 대비 과다 완화 시 접근성 기준(WCAG AA) 미달 가능 |
| **SUCCESS** | 모든 색상 변경 후 타입체크 통과, 대비비 4.5:1 이상 유지 |
| **SCOPE** | `globals.css :root` 블록 CSS 변수 수정만 (다크 모드 제외) |

---

## 1. 현재 라이트 모드 팔레트 문제점

| 변수 | 현재 값 | 문제 |
|------|---------|------|
| `--bg` | `#f6f6f3` | 약간 차가움 |
| `--surface` | `#ffffff` | 순백 → 고대비 |
| `--text` | `#1c1c1a` | 거의 검정, 고대비 |
| `--accent` | `#3b5bdb` | 채도 높은 파랑, 자극적 |
| `--accent-soft` | `#e8edff` | 무난 |
| `--open` | `#2b8a3e` | 어두운 초록, 무거움 |
| `--danger` | `#c92a2a` | 어두운 빨강, 자극적 |

---

## 2. 목표 팔레트 (Linear/Notion 스타일)

| 변수 | 현재 | 변경 후 | 이유 |
|------|------|---------|------|
| `--bg` | `#f6f6f3` | `#fafaf8` | 더 밝고 따뜻한 오프화이트 |
| `--surface` | `#ffffff` | `#ffffff` | 유지 |
| `--text` | `#1c1c1a` | `#1a1a18` | 미세 조정, 약간 따뜻하게 |
| `--muted` | `#6b6b66` | `#787872` | 약간 밝게 → 덜 묵직함 |
| `--line` | `#e4e4de` | `#eaeae4` | 약간 밝게 → 덜 강함 |
| `--accent` | `#3b5bdb` | `#4263eb` | 채도 유지, 명도 올림 → 덜 묵직함 |
| `--accent-soft` | `#e8edff` | `#eef2ff` | 미세 조정 |
| `--bar` | `#dfe6ff` | `#dde5ff` | 유사 유지 |
| `--bar-top` | `#c3d0ff` | `#bac8ff` | 약간 밝게 |
| `--open` | `#2b8a3e` | `#2f9e44` | 더 밝은 초록 → 생동감 |
| `--closed` | `#868e96` | `#868e96` | 유지 |
| `--danger` | `#c92a2a` | `#e03131` | 더 밝은 빨강 → 덜 무거움 |

---

## 3. 접근성 고려

- `--text` on `--bg`: `#1a1a18` on `#fafaf8` → 대비비 약 18:1 (AAA 충족)
- `--accent` on `--surface`: `#4263eb` on `#ffffff` → 대비비 약 5.1:1 (AA 충족)
- `--open` on `--bg`: 충분한 대비 유지

---

## 4. 범위

- **변경 파일**: `app/globals.css` — `:root` 블록만
- **변경 없음**: 다크 모드 `@media (prefers-color-scheme: dark)`, 모든 컴포넌트 JSX/CSS

---

## 5. Success Criteria

- [ ] `:root` 블록 12개 변수 중 필요한 것만 수정 완료
- [ ] 다크 모드 변수 변경 없음
- [ ] `pnpm typecheck` 통과
- [ ] 라이트 모드에서 텍스트 대비비 AA 이상 유지
