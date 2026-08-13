# Codemaps Overview — guess-the-player

> 아직 실제 코드가 없는 새 프로젝트라, 지금은 자리표시자(placeholder)예요. 코드가 생기면
> `/moai codemaps`로 실제 아키텍처 문서(overview.md, modules.md, dependencies.md,
> entry-points.md, data-flow.md)를 다시 생성해주세요.

## 프로젝트 목표

해외 축구 리그 선수를 힌트로 맞히는 웹 게임. 선수 이름의 한국어 표시가 핵심 차별점.
자세한 내용은 `.moai/project/product.md` 참고.

## 예정 아키텍처 (제안, 미구현)

`.moai/project/structure.md`에서 제안한 Next.js(App Router) + TypeScript 구조를 따를 예정이에요:

- `app/` — 페이지 및 API 라우트(외부 축구 API 프록시)
- `lib/game/` — 힌트·정답 판정 등 게임 핵심 로직
- `lib/korean-name-mapping/` — 선수명 한국어 매핑 로직
- `lib/football-api/` — 외부 축구 데이터 API 연동

실제 모듈 구조와 의존성 그래프는 코드 작성 후 `/moai codemaps`로 생성돼요.
