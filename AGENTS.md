<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 커밋 메시지 작성 지침

커밋을 만들기 전에는 `docs/commit-message-guide.md`를 먼저 읽고 그 규칙(Conventional Commits, 한국어 작성, atomic commit, AI 생성 문구 금지 등)을 따른다.

## UI 컴포넌트 작업 지침

새 화면이나 컴포넌트를 만들기 전에는 `docs/frontend-guides/01_UI_컴포넌트_가이드.md`를 먼저 읽고, 기존 컴포넌트 재사용 여부·색상/타이포 토큰·아이콘 라이브러리(Radix 고정) 규칙을 따른다.

## Git 워크플로

`main`에 직접 커밋/푸시하지 않는다. `develop`에서 작업하고, PR은 `.github/pull_request_template.md` 템플릿 구조(Summary/Changes/Type of Change/Screenshots/Checklist/Related Issues)를 그대로 채워서 `main`으로 올린다.
