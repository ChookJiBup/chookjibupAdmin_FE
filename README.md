# chookjibupAdmin_FE

AI 기반 축제 대기열 배치 설계 및 대기시간 안내 플랫폼 — 관리자/운영자/스태프용 프론트엔드

## Tech Stack

| Category       | Technology            |
| -------------- | --------------------- |
| Framework      | Next.js App Router 16 |
| UI Library     | React 19              |
| Language       | TypeScript            |
| Styling        | Tailwind CSS v4       |
| State (Client) | Zustand               |
| State (Server) | TanStack Query        |
| HTTP Client    | Axios                 |
| Canvas         | React Konva           |
| Font           | Pretendard Variable   |
| Code Quality   | ESLint, Prettier      |

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm

### Installation

```bash
pnpm install
```

### Development

백엔드(`demoAdmin_BE`)를 먼저 띄운 뒤 실행합니다. `next.config.ts`의 rewrites가
`/api/admin/*`, `/api/festivals/*`, `/api/field-staff/*` 요청을 백엔드로 프록시합니다.

```bash
pnpm dev
# 백엔드 주소가 localhost:8080이 아니면
BACKEND_ORIGIN=http://localhost:8080 pnpm dev
```

http://localhost:3000 에서 확인합니다.

### Build

```bash
pnpm build
pnpm start
```

## Scripts

| Script              | Description          |
| ------------------- | -------------------- |
| `pnpm dev`          | 개발 서버 실행       |
| `pnpm build`        | 프로덕션 빌드        |
| `pnpm start`        | 프로덕션 서버 실행   |
| `pnpm lint`         | ESLint 검사          |
| `pnpm typecheck`    | TypeScript 타입 검사 |
| `pnpm format`       | Prettier 포맷팅      |
| `pnpm format:check` | 포맷팅 검사          |

## Project Structure

```txt
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 루트 레이아웃 (폰트, Providers)
│   ├── providers.tsx             # TanStack Query Provider
│   ├── page.tsx                  # 랜딩
│   ├── login/, signup/           # 관리자·운영자 공용 인증
│   ├── console/                  # 관리자·운영자 데스크탑 화면 (AdminAuthGuard)
│   │   ├── festivals/            # 축제 리스트, 등록
│   │   │   └── [festivalId]/     # 상세, 부스맵, 대시보드, 운영자, 스태프, 결과리포트
│   │   └── mypage/
│   └── staff/                    # 스태프 모바일 화면
│       ├── login/
│       └── dashboard/            # 혼잡도/줄끝라인 (StaffAuthGuard)
├── components/auth/              # AdminAuthGuard, StaffAuthGuard, 로그아웃 버튼
├── features/                     # 기능 단위 모듈
│   ├── auth/admin, auth/staff    # 로그인·회원가입 API + 타입
│   ├── festivals/                # 축제 등록 API + 타입
│   ├── operators/                # 운영자 조회·후보 검색
│   ├── staffs/                   # 현장 스태프 조회·생성·삭제
│   ├── dashboard/                # 운영 대시보드
│   ├── report/                   # 운영결과리포트
│   ├── boothmap/                 # 부스맵 업로드·자동배치 (목업)
│   └── staffDashboard/           # 스태프 혼잡도·줄끝라인 (목업)
├── lib/api/                      # axios 인스턴스, 공통 에러 처리
└── store/                        # zustand persist 세션 스토어
```

## Routing

| Path                                        | Page                   | Guard          |
| ------------------------------------------- | ---------------------- | -------------- |
| `/`                                         | 랜딩                   | -              |
| `/login`, `/signup`                         | 관리자 로그인/회원가입 | -              |
| `/console/festivals`                        | 축제 리스트            | AdminAuthGuard |
| `/console/festivals/new`                    | 축제 등록              | AdminAuthGuard |
| `/console/festivals/[festivalId]`           | 축제 기본정보          | AdminAuthGuard |
| `/console/festivals/[festivalId]/boothmap`  | 부스맵 자동배치 (목업) | AdminAuthGuard |
| `/console/festivals/[festivalId]/dashboard` | 운영 대시보드          | AdminAuthGuard |
| `/console/festivals/[festivalId]/operators` | 운영자 관리            | AdminAuthGuard |
| `/console/festivals/[festivalId]/staffs`    | 스태프 관리            | AdminAuthGuard |
| `/console/festivals/[festivalId]/report`    | 운영결과리포트         | AdminAuthGuard |
| `/console/mypage`                           | 마이페이지             | AdminAuthGuard |
| `/staff/login`                              | 스태프 로그인          | -              |
| `/staff/dashboard`                          | 혼잡도/줄끝라인 (목업) | StaffAuthGuard |

## Path Alias

`@/` → `src/`

```ts
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { adminApiClient } from "@/lib/api/adminApiClient";
import { useAdminAuthStore } from "@/store/adminAuthStore";
```

## State Management

### Zustand (Client State) — 인증 세션

```tsx
import { useAdminAuthStore } from "@/store/adminAuthStore";

function Component() {
  const admin = useAdminAuthStore((state) => state.session?.admin);
  const clearSession = useAdminAuthStore((state) => state.clearSession);

  return <button onClick={clearSession}>{admin?.name} 로그아웃</button>;
}
```

관리자/운영자(`useAdminAuthStore`)와 스태프(`useStaffAuthStore`)는 계정 체계가 달라
완전히 분리된 스토어를 쓴다. 둘 다 `persist`(localStorage)로 토큰을 보관한다.

### TanStack Query (Server State)

```tsx
import { useQuery } from "@tanstack/react-query";
import { getFestivalDashboard } from "@/features/dashboard/api";

const { data, isLoading } = useQuery({
  queryKey: ["festival-dashboard", festivalId],
  queryFn: () => getFestivalDashboard(festivalId),
  refetchInterval: 15000,
});
```

## API

### Axios Clients

```ts
import { adminApiClient } from "@/lib/api/adminApiClient";
import { staffApiClient } from "@/lib/api/staffApiClient";

const response = await adminApiClient.get("/festivals");
const created = await adminApiClient.post("/festivals", { name: "..." });
```

`adminApiClient`(`src/lib/api/adminApiClient.ts`)와 `staffApiClient`는 각각 자신의
zustand 세션에서 토큰을 읽어 `Authorization: Bearer` 헤더로 자동 첨부하고, 401 응답 시
해당 세션을 초기화한다. 공통 에러 메시지 추출은 `src/lib/api/httpError.ts`의
`getApiErrorMessage`를 사용한다.

## Environment Variables

| Variable         | Description                              | Required                            |
| ---------------- | ---------------------------------------- | ----------------------------------- |
| `BACKEND_ORIGIN` | 백엔드 API 오리진 (rewrites 프록시 대상) | No (기본값 `http://localhost:8080`) |

## Design System

File: `src/app/globals.css` — Figma "축지법" 파일의 Colors/Typography 프레임 기준

### Colors

| Token              | Name     | Hex       |
| ------------------ | -------- | --------- |
| `--color-zinc-50`  | Zinc 50  | `#fafafa` |
| `--color-zinc-100` | Zinc 100 | `#f4f4f5` |
| `--color-zinc-200` | Zinc 200 | `#e4e4e7` |
| `--color-zinc-300` | Zinc 300 | `#d4d4d8` |
| `--color-zinc-400` | Zinc 400 | `#9f9fa9` |
| `--color-zinc-500` | Zinc 500 | `#71717b` |
| `--color-zinc-600` | Zinc 600 | `#52525c` |
| `--color-zinc-700` | Zinc 700 | `#3f3f46` |
| `--color-zinc-800` | Zinc 800 | `#27272a` |
| `--color-zinc-900` | Zinc 900 | `#18181b` |
| `--color-zinc-950` | Zinc 950 | `#09090b` |
| `--color-red-500`  | Red 500  | `#fb2c36` |

### Semantic Tokens

```css
var(--color-primary)    /* zinc-900 */
var(--color-secondary)  /* zinc-700 */
var(--color-error)      /* red-500 */
var(--color-dimmed)     /* rgb(0 0 0 / 25%) */
```

### Typography Utilities

Figma 텍스트 스타일 이름을 그대로 kebab-case한 유틸리티 클래스이다.

```
heading-large  heading-regular  heading-small
body-large     body-regular     body-small     body-caption
body-large-bold  body-regular-bold  body-small-bold  body-mono
```

## Git Convention

### Branch Strategy

| Branch      | Description      |
| ----------- | ---------------- |
| `main`      | 배포 기준        |
| `develop`   | 통합 개발 브랜치 |
| `feature/*` | 기능 개발        |
| `fix/*`     | 버그 수정        |
| `chore/*`   | 설정, 기타       |

### Commit Convention

`docs/commit-message-guide.md`의 규칙(Conventional Commits, 한국어, atomic commit)을 따른다.

```txt
<type>(scope): <한국어 설명>
```

| Type       | Description      |
| ---------- | ---------------- |
| `feat`     | 새로운 기능      |
| `fix`      | 버그 수정        |
| `docs`     | 문서 변경        |
| `style`    | 코드 포맷팅      |
| `refactor` | 코드 리팩토링    |
| `perf`     | 성능 개선        |
| `test`     | 테스트 추가/수정 |
| `chore`    | 빌드, 설정 변경  |
| `ci`       | CI 설정 변경     |

### PR Process

1. `develop` 또는 `feature/*` 작업 브랜치에서 작업
2. `docs/commit-message-guide.md` 규칙에 맞춰 커밋
3. `main` 브랜치로 PR 생성 (`.github/pull_request_template.md` 사용)
4. Lint, Typecheck, Build(CI) 통과 확인
5. 리뷰 후 머지

## 문서

| 문서                                                                                   | 내용                                                            |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [`docs/commit-message-guide.md`](./docs/commit-message-guide.md)                       | 커밋 메시지 작성 규칙                                           |
| [`docs/specs/01_기능명세서.md`](./docs/specs/01_기능명세서.md)                         | 백엔드 기능명세를 프론트엔드 라우트/화면 관점으로 재정리한 문서 |
| [`docs/specs/02_부스맵_배치_파이프라인.md`](./docs/specs/02_부스맵_배치_파이프라인.md) | 부스맵 자동배치 파이프라인 정리                                 |
