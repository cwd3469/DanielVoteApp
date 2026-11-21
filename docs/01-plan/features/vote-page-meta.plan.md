# vote-page-meta Plan

> **Project**: vote-app
> **Date**: 2026-11-21
> **Status**: Draft

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | `/vote/:id` 공유 시 타이틀·이미지 없어 카카오/SNS 미리보기 품질 저하 |
| **Solution** | Next.js `generateMetadata` + `ImageResponse` OG 이미지 자동 생성 |
| **UX Effect** | 링크 공유 시 투표 제목 + 브랜드 카드 이미지가 미리보기에 표시 |
| **Core Value** | QR 공유 흐름의 완성 — 링크 받은 사람이 뭔지 알고 클릭 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | QR/링크 공유 시 SNS 미리보기에 투표 제목이 보여야 클릭률 향상 |
| **WHO** | 투표 링크를 받은 참여자 (카카오톡·슬랙 등에서 미리보기 확인) |
| **RISK** | OG 이미지 생성 시 Supabase 조회 필요 — 없는 투표 ID면 fallback 처리 |
| **SUCCESS** | 카카오톡 공유 시 투표 제목 + 이미지 미리보기 표시 |
| **SCOPE** | `app/vote/[id]/page.tsx` + `app/vote/[id]/opengraph-image.tsx` 신규/수정 |

---

## 1. 구현 항목

### 1.1 `generateMetadata` — `app/vote/[id]/page.tsx`

```ts
export async function generateMetadata({ params }) {
  const { id } = await params
  const supabase = await getServerClient()
  const { data: poll } = await supabase.from("polls").select("title, description")
    .eq("id", id).maybeSingle()

  if (!poll) return { title: "투표하자" }

  return {
    title: `${poll.title} | 투표하자`,
    description: poll.description ?? `${poll.title}에 투표해 주세요`,
    openGraph: {
      title: poll.title,
      description: poll.description ?? `${poll.title}에 투표해 주세요`,
    },
  }
}
```

### 1.2 `opengraph-image.tsx` — `app/vote/[id]/opengraph-image.tsx`

Next.js App Router 규약 — 파일명 `opengraph-image.tsx` 로 `/vote/:id/opengraph-image` 자동 라우팅.

```
┌──────────────────────────────────────────┐
│                                          │  1200×630
│   투표하자                               │  bg: #fafaf8
│                                          │
│   점심 메뉴 투표                          │  font: bold 48px
│                                          │
│   지금 투표하기 →                         │  muted text
│                                          │
└──────────────────────────────────────────┘
```

- `ImageResponse` size: `1200 × 630`
- 투표 없을 경우 fallback: 기본 "투표하자" 카드

---

## 2. 파일 목록

| 파일 | 작업 |
|------|------|
| `app/vote/[id]/page.tsx` | 수정 — `generateMetadata` 추가 |
| `app/vote/[id]/opengraph-image.tsx` | 신규 — ImageResponse |

---

## 3. Success Criteria

- [ ] 카카오톡/슬랙 공유 시 투표 제목이 타이틀에 표시
- [ ] OG 이미지 URL(`/vote/:id/opengraph-image`) 접근 가능
- [ ] 존재하지 않는 ID는 기본값 fallback
- [ ] `pnpm typecheck` 통과
