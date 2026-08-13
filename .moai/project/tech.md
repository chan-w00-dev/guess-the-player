# Tech — guess-the-player

> 출처: `.moai/project/interview.md` Tech Stack Confirmation 섹션.
> **상태 표기 안내**: 프레임워크/언어/스타일링/DB 계층(Next.js, TypeScript, Tailwind CSS, Supabase)은 사용자 확인이 완료되어 확정되었다. 단, 외부 축구 데이터 API는 이 문서 작성 시점에도 여전히 미확정(open)이며, MVP 구현 착수 전 별도로 결정해야 하는 항목이다. 아래 표의 "상태" 열을 항목별로 참고할 것 — 문서 전체가 "확정"임을 의미하지 않는다.

## 기술 스택 개요

| 영역 | 선택 기술 | 상태 |
|---|---|---|
| 프레임워크 | Next.js (React) | 확정 |
| 언어 | TypeScript | 확정 |
| 스타일링 | Tailwind CSS | 확정 |
| 데이터베이스/BaaS | Supabase (Postgres) | 확정 |
| 외부 데이터 소스 | 축구 데이터 API (API-Football / football-data.org 등) | 선정 진행 중(open) |
| 테스트 | Vitest 또는 Jest | 확정 (TDD 방식) |

## 기술 선택 근거

### Next.js (React) + TypeScript

- **왜 Next.js인가**: 웹 브라우저 전용 서비스라는 제약(constraints)에 정확히 부합하며, App Router의 Route Handler 기능으로 외부 축구 API 키를 서버 사이드에서 안전하게 프록시할 수 있음. 별도 백엔드 서버 없이 풀스택 구현이 가능해 1인 개발(solo)에 적합.
- **왜 TypeScript인가**: 선수 데이터(원어명, 한글명, 클럽, 포지션, 국적 등) 구조가 여러 계층(외부 API 응답 → 매핑 로직 → UI)을 거치므로, 타입 안전성이 리팩터링 및 유지보수 비용을 줄여줌.

### Tailwind CSS

- 1인 개발 환경에서 별도 디자인 시스템 구축 없이 빠르게 UI를 구성할 수 있는 유틸리티 우선 CSS 프레임워크. Next.js와의 통합이 표준화되어 있어 설정 비용이 낮음.

### Supabase (Postgres)

- **핵심 선정 근거**: 이 프로젝트의 핵심 차별점은 "선수명 한국어 매핑"이며, 이는 정적 파일로 하드코딩하기보다 별도 테이블로 관리하는 것이 장기적으로 유지보수(신규 선수 추가, 표기 수정)에 유리함. Supabase는 가벼운 매니지드 Postgres DB로 MVP 단계에서 부담 없이 시작할 수 있고, 필요 시(Auth, 추가 테이블 등) 확장 가능한 즉시 사용 가능한 REST/클라이언트 SDK를 제공하여, 별도 백엔드 인프라 구축 없이 한글 매핑 테이블을 빠르게 구축·운영할 수 있음.
- MVP 범위상 로그인/계정 기능은 사용하지 않지만(Out of Scope), Supabase Auth를 추후(v2 이후) 리더보드/개인 기록 기능 확장 시 낮은 비용으로 도입할 수 있는 여지를 남겨둠.

## 외부 축구 데이터 API 연동 방안

선수 데이터(이름, 소속 클럽, 포지션, 국적, 사진 등)를 제공하는 외부 API가 필요하며, 최종 선정은 아직 열려 있음(open) — 결정 시점: 실제 개발(구현 SPEC) 착수 시. 검토 후보:

- **API-Football (RapidAPI 경유)**: EPL, 라리가 등 유럽 주요 리그의 선수/팀 데이터를 폭넓게 제공. RapidAPI 요금제 기반 사용량 제한 존재.
- **football-data.org**: 무료 티어를 제공하는 축구 데이터 API. 리그/팀/선수 커버리지와 요청 한도(rate limit)를 확인 후 MVP에 적합한지 검증 필요.

연동 설계 원칙:

- 외부 API 원본 응답(원어명 등)과 한국어 이름 매핑 로직을 분리하여, API 공급자 교체 시에도 매핑 계층이 영향을 받지 않도록 함 (`structure.md` 참고).
- API 키는 클라이언트에 노출하지 않고 Next.js Route Handler(`app/api/`)를 통해 서버 사이드에서만 사용.
- 최종 API 선정 시 요청 한도(rate limit), 데이터 커버리지(EPL/라리가 등 주요 리그 포함 여부), 선수 사진 제공 여부를 비교 기준으로 삼을 것을 권장.

## 개발 환경 요구사항

- **Node.js**: LTS 버전 (v20 이상 권장, Next.js 최신 버전 요구사항에 맞춤)
- **패키지 매니저**: npm (또는 pnpm) — 현재 미확정(open); 결정 시점: 프로젝트 스캐폴딩 SPEC 착수 시
- **환경 변수**: 축구 데이터 API 키, Supabase URL/anon key 등은 `.env.local`로 관리하며 버전 관리에서 제외

## 빌드 및 배포

- **권장 배포 플랫폼**: Vercel — Next.js와 동일 조직에서 관리하는 플랫폼으로 별도 설정 없이 App Router, Route Handler, 환경 변수 관리가 잘 통합됨. 1인 개발 프로젝트에 적합한 무료/저비용 티어 존재.
- Supabase는 별도 클라우드 프로젝트로 운영하며, Vercel 배포 환경 변수에 연결 정보를 주입.

## 테스트 방식

- **테스트 프레임워크**: Vitest 또는 Jest (`npm test`로 실행)
- **개발 방법론**: TDD (development_mode: tdd) — 힌트 로직, 한국어 이름 매핑 로직, 정답 판정 로직 등 핵심 도메인 로직은 테스트를 먼저 작성한 뒤 구현
- **커버리지 목표**: 전체 커버리지 목표 85%, 커밋당 최소 커버리지 80% (`.moai/config/sections/quality.yaml`의 `test_coverage_target: 85`, `tdd_settings.min_coverage_per_commit: 80` 설정값 기준)
- 테스트 범위 제안: `lib/korean-name-mapping/`, `lib/game/` 등 순수 로직 계층에 대한 단위 테스트를 우선 확보하고, 이후 API 연동 통합 테스트로 확장 (`structure.md`의 `tests/` 디렉토리 참고)
