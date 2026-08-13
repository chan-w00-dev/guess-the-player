# Project Interview — guess-the-player

Collected via `/moai project` Socratic interview (AskUserQuestion rounds), New Project path (Phase 2).

## Stage A — Base Fields

- **domain**: 스포츠(해외 축구 리그) 선수 맞추기 웹 게임
- **goal**: 해외 축구 리그(EPL·라리가 등) 선수를 힌트로 맞히는 웹 게임을 만들고, 선수 이름의 한국어 지원(공식/통용 한글 표기 매핑)을 핵심 차별점으로 제공한다.
- **constraints**:
  - 웹 브라우저 전용 (모바일 네이티브 앱 아님)
  - 하루 1회 제한 없이 계속 플레이 가능 (Wordle식 일일 제한 없음)
  - MVP는 로그인/계정 없이 게임 핵심 기능만 포함
  - 선수 데이터는 외부 축구 API에서 가져오되, 선수명은 한국어 매핑을 거쳐 표시
- **scope**:
  - In scope (v1/MVP): 힌트 기반 선수 맞추기 게임 로직, 외부 축구 API 연동, 선수명 한국어 매핑 테이블, 무제한 플레이
  - Out of scope (v1): 회원가입/로그인, 개인 기록 저장, 리더보드, 친구 대결, 축구 외 다른 스포츠 종목

## Stage B — Extended Axes

- **verification**: 자동 테스트 (Vitest/Jest) — `npm test` 로 검증. development_mode는 `tdd`.
- **external_systems**:
  - 외부 축구 데이터 API (예: API-Football, football-data.org 등 — 선정은 tech.md 참고)
  - 선수 한국어 이름 매핑을 위한 경량 DB (Supabase/Postgres)
- **ui_surface**: has-ui (웹 브라우저 UI)
- **team_sharing**: solo (1인 개발)

## Tech Stack Confirmation

Next.js(React) + TypeScript, Tailwind CSS, Supabase(Postgres) — 사용자 확인 완료 (추천안 그대로 진행).

---

Generated: 2026-08-13
