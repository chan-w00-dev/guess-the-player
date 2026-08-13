# Structure — guess-the-player

> **주의**: 이 문서는 아직 소스 코드가 존재하지 않는 **신규 프로젝트(New Project)**를 위한 **제안된(Proposed)** 디렉토리 구조입니다. 실제 구현 시 세부 사항은 변경될 수 있습니다. 본 문서는 Next.js(App Router) + TypeScript 기준으로 작성되었습니다.

## 제안 디렉토리 트리

```
guess-the-player/
├── app/                          # Next.js App Router 엔트리 포인트
│   ├── layout.tsx                # 루트 레이아웃 (전역 스타일, 메타데이터)
│   ├── page.tsx                  # 메인 게임 화면 (홈 = 게임 플레이 화면)
│   ├── globals.css                # Tailwind 전역 스타일 진입점
│   └── api/                      # Next.js Route Handlers (서버 API)
│       ├── player/
│       │   └── random/
│       │       └── route.ts      # 랜덤 정답 선수 선정 + 힌트 데이터 반환
│       └── guess/
│           └── route.ts          # 사용자 추측 검증 엔드포인트
│
├── components/                   # 재사용 가능한 UI 컴포넌트
│   ├── game/
│   │   ├── GuessInput.tsx        # 선수 이름 검색/입력 컴포넌트
│   │   ├── HintPanel.tsx         # 단계별 힌트(클럽/포지션/국적 등) 표시
│   │   ├── ResultModal.tsx       # 정답/오답 결과 모달
│   │   └── GameBoard.tsx         # 게임 전체 레이아웃 조합
│   └── ui/                       # 범용 UI 프리미티브 (버튼, 카드 등)
│
├── lib/                          # 도메인 로직 및 유틸리티
│   ├── football-api/             # 외부 축구 데이터 API 연동 계층
│   │   ├── client.ts              # API 클라이언트(fetch 래퍼, 인증)
│   │   └── types.ts               # API 응답 타입 정의
│   ├── korean-name-mapping/      # 선수명 한국어 매핑 로직 (핵심 차별점)
│   │   ├── mapper.ts               # 원어명 → 한글 표기 변환 로직
│   │   └── types.ts                # 매핑 테이블 타입 정의
│   ├── game/                     # 게임 규칙/상태 관리 로직
│   │   ├── hint-engine.ts          # 힌트 단계 결정 로직
│   │   └── answer-checker.ts       # 정답 판정 로직
│   └── supabase/                 # Supabase 클라이언트 및 쿼리
│       └── client.ts               # Supabase 클라이언트 초기화
│
├── data/                         # 정적/시드 데이터 (선택적)
│   └── korean-name-seed.json     # 선수 한글명 매핑 초기 시드 데이터 (Supabase 테이블을 최초 1회 채우기 위한 로컬 시드 파일. 런타임 소스 오브 트루스는 Supabase 테이블이며, 이 파일은 병렬 데이터 저장소가 아님)
│
├── types/                        # 프로젝트 전역 공용 타입
│   └── player.ts                 # Player 도메인 타입 (원어명/한글명/클럽/포지션 등)
│
├── tests/                        # 테스트 코드 (Vitest/Jest)
│   ├── unit/
│   │   ├── korean-name-mapping.test.ts
│   │   └── hint-engine.test.ts
│   └── integration/
│       └── guess-flow.test.ts
│
├── public/                       # 정적 자산 (아이콘, 이미지 등)
│
├── .env.local.example            # 환경 변수 예시 (API 키, Supabase URL 등)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── vitest.config.ts              # 또는 jest.config.ts
```

## 최상위 디렉토리 목적

| 디렉토리 | 목적 |
|---|---|
| `app/` | Next.js App Router 페이지 및 서버 API 라우트. UI 화면과 서버 엔드포인트가 함께 위치 |
| `components/` | 프레젠테이션 계층. 게임 전용 컴포넌트(`game/`)와 범용 UI 컴포넌트(`ui/`) 분리 |
| `lib/` | 도메인 로직 계층. 외부 API 연동, 한국어 이름 매핑, 게임 규칙을 각각 독립 모듈로 분리 |
| `data/` | 초기 셋업 시 Supabase 매핑 테이블을 채우기 위한 1회성 로컬 시드 데이터. 영구 저장소가 아니며, 런타임에는 사용하지 않음 — 런타임 소스 오브 트루스는 항상 Supabase 테이블 |
| `types/` | 프로젝트 전역에서 공유하는 TypeScript 타입 정의 |
| `tests/` | Vitest/Jest 기반 자동 테스트 (TDD 개발 방식에 따라 unit/integration 분리) |
| `public/` | 정적 자산 |

## 핵심 모듈 설계 근거

- **`lib/korean-name-mapping/`을 독립 모듈로 분리한 이유**: 이 프로젝트의 핵심 차별점(선수명 한국어 표시)이므로, 외부 API 응답 구조가 바뀌더라도 매핑 로직이 격리되어 영향을 받지 않도록 하기 위함. 매핑 테이블은 MVP 시점부터 Supabase 테이블이 소스 오브 트루스이며(`data/korean-name-seed.json`은 최초 1회 시드 용도), 추후 관리자 도구 등을 붙일 때도 이 경계가 유지되어야 함.
- **`lib/football-api/`와 `lib/korean-name-mapping/` 분리**: 외부 API 원본 데이터(원어명)와 한국어 표기 변환 로직의 관심사를 분리하여, API 공급자를 교체하더라도 매핑 로직에 영향이 없도록 설계.
- **`app/api/`를 통한 서버 사이드 API 키 보호**: 외부 축구 API 키를 클라이언트에 노출하지 않기 위해 Next.js Route Handler를 경유하여 프록시.
- MVP 범위상 `auth/`, `leaderboard/` 등 로그인·리더보드 관련 디렉토리는 의도적으로 제외됨 (product.md의 Out of Scope 참고).

## 주요 파일 위치 (구현 시 참고)

- 게임 메인 화면: `app/page.tsx`
- 정답 선수 선정 API: `app/api/player/random/route.ts`
- 추측 검증 API: `app/api/guess/route.ts`
- 한국어 이름 매핑 핵심 로직: `lib/korean-name-mapping/mapper.ts`
- Player 도메인 타입: `types/player.ts`
