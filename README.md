# chookjibupAdmin_FE

AI 기반 축제 대기열 배치 설계 및 대기시간 안내 플랫폼 — 관리자/운영자/스태프용 프론트엔드.

관리자·운영자용 데스크탑 콘솔(`/console`)과 스태프용 모바일 화면(`/staff`)을 함께 다룹니다.
방문자용 화면은 별도 저장소 [`chookjibupUser_FE`](https://github.com/ChookJiBup/chookjibupUser_FE)에서 다룹니다.

## 스택

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Zustand · TanStack Query · Axios · ESLint/Prettier

## 시작하기

Node 22 이상이 필요합니다 (`package.json`의 `engines.node` 기준). `pnpm` 실행 자체가 Node 22+ 를 요구하니, 버전이 다르면 먼저 맞춰주세요.

```bash
nvm use 22   # 또는 사용 중인 버전 매니저로 Node 22 이상으로 전환
pnpm install
pnpm dev
```

http://localhost:3000 에서 확인합니다.

### 백엔드 연동

`next.config.ts`의 `rewrites()`가 `/api/admin/*`, `/api/field-staff/*` 요청을 백엔드로 프록시합니다
(백엔드가 CORS를 별도로 열어두지 않았기 때문에, 브라우저 기준 same-origin으로 우회하는 방식입니다).

기본값은 `http://localhost:8080`이며, 다른 주소를 쓰려면 `BACKEND_ORIGIN` 환경변수를 지정하세요.

```bash
BACKEND_ORIGIN=http://localhost:8080 pnpm dev
```

백엔드 저장소: [`demoAdmin_BE`](https://github.com/ChookJiBup/demoAdmin_BE) — 관리자 백엔드 공용 서버(Spring Boot).

## 폴더 구조

```
src/
├── app/
│   ├── login, signup            # 관리자·운영자 공용 인증 (공무원 이메일)
│   ├── console/                  # 관리자·운영자 데스크탑 화면 (AdminAuthGuard로 보호)
│   │   ├── festivals/              # 축제 리스트 조회, 축제 등록
│   │   │   └── [festivalId]/        # 기본정보, 부스맵, 대시보드(혼잡도·AI 제안),
│   │   │                             # 운영자 관리, 스태프 관리, 운영결과리포트
│   │   └── mypage/
│   ├── staff/                    # 스태프 모바일 화면
│   │   ├── login/                  # 관리자·운영자가 발급한 계정으로 로그인
│   │   └── dashboard/               # 실시간 혼잡도, 부스 줄끝라인 수정 (StaffAuthGuard로 보호)
│   └── providers.tsx             # TanStack Query Provider
├── components/auth/              # AdminAuthGuard, StaffAuthGuard, 로그아웃 버튼
├── features/auth/                # admin/staff 로그인 요청 함수 + 타입 (백엔드 DTO 매핑)
├── lib/api/                      # axios 인스턴스(adminApiClient, staffApiClient), 공통 에러 처리
└── store/                        # zustand persist 기반 인증 세션 스토어
```

방문자용 화면은 이 저장소에 없습니다.

## 인증 구조

- 로그인 응답의 JWT는 zustand `persist`(localStorage)에 저장하고, axios 요청 인터셉터에서
  `Authorization: Bearer` 헤더로 자동 첨부합니다.
- 관리자/운영자와 스태프는 계정 체계와 API가 달라 `adminApiClient` / `staffApiClient`,
  `useAdminAuthStore` / `useStaffAuthStore`로 완전히 분리되어 있습니다.
- 라우트 보호는 Next.js 미들웨어가 아니라 클라이언트 컴포넌트 가드(`AdminAuthGuard`,
  `StaffAuthGuard`)로 처리합니다 (백엔드가 httpOnly 쿠키를 내려주지 않아 Edge에서 인증을
  판단할 수 없기 때문).

자세한 배경과 아직 정해지지 않은 사항은 [`docs/specs/01_기능명세서.md`](./docs/specs/01_기능명세서.md)의
"프론트 확정 필요 사항"을 참고하세요.

## 문서 (`docs/`)

| 문서                                                                              | 내용                                                              |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`commit-message-guide.md`](./docs/commit-message-guide.md)                       | 커밋 메시지 작성 규칙 (Conventional Commits, 한국어)              |
| [`specs/01_기능명세서.md`](./docs/specs/01_기능명세서.md)                         | 백엔드 기능명세를 프론트엔드 라우트/화면 관점으로 재정리한 문서   |
| [`specs/02_부스맵_배치_파이프라인.md`](./docs/specs/02_부스맵_배치_파이프라인.md) | 부스맵 이미지 업로드 → AI 자동 배치 → 운영자 수정 파이프라인 정리 |

## 디자인 토큰

`src/app/globals.css`에 Figma "축지법" 파일의 Colors/Typography 토큰이 반영되어 있습니다
(zinc 색상 스케일, `primary`/`secondary`/`error`/`dimmed` 시맨틱 색상, `heading-large` 같은
텍스트 스타일 유틸리티). 본문 서체는 Pretendard Variable을 로컬 폰트로 로드합니다.

## 스크립트

| 명령어           | 설명            |
| ---------------- | --------------- |
| `pnpm dev`       | 개발 서버 실행  |
| `pnpm build`     | 프로덕션 빌드   |
| `pnpm lint`      | ESLint 검사     |
| `pnpm typecheck` | 타입 체크       |
| `pnpm format`    | Prettier 포맷팅 |

## Git

| 브랜치      | 용도             |
| ----------- | ---------------- |
| `main`      | 배포 기준        |
| `develop`   | 통합 개발 브랜치 |
| `feature/*` | 기능 개발        |
| `fix/*`     | 버그 수정        |
| `chore/*`   | 설정, 기타       |

커밋 메시지는 [`docs/commit-message-guide.md`](./docs/commit-message-guide.md)를 따릅니다 (한국어, Conventional Commits, atomic commit).

```
feat(design-system): Figma 색상·타이포그래피 토큰 적용
fix(auth): 로그인 리다이렉트 오류 수정
chore(deps): 패키지 매니저 버전 고정
```

PR을 올릴 때는 `.github/pull_request_template.md` 체크리스트를 확인하고, `lint`·`typecheck`가 통과하는지 확인 후 올립니다.
