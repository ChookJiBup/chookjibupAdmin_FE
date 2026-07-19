# julcut_FE

AI 기반 축제 대기열 배치 설계 및 대기시간 안내 플랫폼 — 관리자/운영자/스태프용 프론트엔드.

## 스택

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Zustand · TanStack Query · Axios · ESLint/Prettier

## 시작하기

```bash
pnpm install
pnpm dev
```

http://localhost:3000 에서 확인.

## 폴더 구조

```
src/app/
├── login, signup           # 관리자·운영자 공용 인증 (공무원 이메일)
├── console/                 # 관리자·운영자 데스크탑 화면
│   ├── festivals/            # 축제 리스트 조회, 축제 등록
│   │   └── [festivalId]/      # 기본정보, 부스맵, 대시보드(혼잡도·AI 제안),
│   │                           # 운영자 관리, 스태프 관리, 운영결과리포트
│   └── mypage/
└── staff/                   # 스태프 모바일 화면
    ├── login/                 # 관리자·운영자가 발급한 계정으로 로그인
    └── dashboard/              # 실시간 혼잡도, 부스 줄끝라인 수정
```

방문자용 화면은 스펙 확정 전까지 제외.

## 스크립트

| 명령어                | 설명            |
| ---------------------- | --------------- |
| `pnpm dev`             | 개발 서버 실행  |
| `pnpm build`           | 프로덕션 빌드   |
| `pnpm lint`            | ESLint 검사     |
| `pnpm typecheck`       | 타입 체크       |
| `pnpm format`          | Prettier 포맷팅 |
