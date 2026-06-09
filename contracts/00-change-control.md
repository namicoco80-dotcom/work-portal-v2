# 00. Change Control Contract
# 업무Portal v2 — 변경 통제 시스템

> 이 문서는 contracts/ 중 최상위입니다.
> 모든 코드 변경은 이 규칙을 통과해야 합니다.

---

## 1. Tag Immutability Rule

- 생성된 git tag는 **절대 변경/삭제/재지정 금지**
- `v0.1-engine-core` = 재현 기준. 비교 대상. 수정 대상 아님
- 코드 수정 → 반드시 새 tag (v0.1.1, v0.1.2, v0.2.0 …)

---

## 2. Version Increment Rule

변경 종류         | 버전 증가 위치  | 예시
-----------------|---------------|-------------------------
engine 로직 변경  | engine_version | 2.0.0 → 2.1.0
snapshot 구조 변경| snapshot_version | 2.0.0 → 2.1.0
report 포맷 변경  | report_version | 2.0.0 → 2.1.0

- `engine_version == report_version` 항상 동기 유지
- VERSION 파일 수정 없이 코드 변경 금지

---

## 3. Baseline Immutability Rule

- `baseline/baseline.v0.1.json` = 수정 금지
- 새 기준 필요 시 `baseline.v0.2.json` 신규 생성
- CI는 이 파일을 "절대 기준"으로 비교

---

## 4. Engine Modification Rule

- engine/ 수정 가능 조건:
  1. VERSION 파일 engine_version 먼저 증가
  2. 새 git tag 계획 수립
  3. baseline diff 테스트 통과 후 커밋

- **금지**: engine_version 변경 없이 engine/ 수정

---

## 5. Cloudflare 역할 고정

위치         | 역할                    | 엔진 수정 가능 여부
------------|------------------------|-------------------
GitHub      | Source of truth         | ✅ (규칙 준수 시)
Cloudflare  | Read-only UI (viewer)   | ❌ 절대 금지

- Cloudflare Pages: report viewer / snapshot viewer / demo 전용
- Cloudflare에서 engine 로직 변경 시 이 contract 위반

---

## 6. 변경 허용 절차 (체크리스트)

```
[ ] VERSION 파일 해당 버전 증가
[ ] 변경 내용 contracts/ 해당 문서에 반영
[ ] 테스트 통과 (store.test / migration.test / manager.test)
[ ] baseline diff 확인
[ ] 새 git tag 생성
[ ] Cloudflare 배포 (read-only output만)
```

---

## 7. Version ↔ Tag 이력

engine_version | git_tag              | 변경 내용
--------------|----------------------|---------------------------
2.0.0         | v0.1-engine-core     | 최초 baseline freeze
