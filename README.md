# 업무Portal v2

## 구조
```
contracts/   규칙 문서 (8개) — 코드보다 먼저
core/        snapshot.js / store.js
engine/      todo / memo / calendar
backup/      migration-engine (v1→v2)
shared/      focus / overlay / modal manager
tests/       pure logic 테스트
baseline/    회귀 비교용 기준 snapshot
```

## 핵심 원칙
- Action → Engine → Snapshot → UI 단방향
- Engine = Pure Function (DOM/localStorage 접근 금지)
- UI = 읽기 전용 (Snapshot 직접 수정 금지)
- Focus/Modal/Overlay = Manager 통해서만

## 체크포인트
- v0.1-engine-core: Contracts + Core + Engines + Managers pure logic
