# 업무Portal v2 — v1.0 RC Checklist
# 실행 검증 체크리스트

---

## 환경 준비
- [ ] Node.js 20+ 설치 확인 (`node --version`)
- [ ] `app/` 폴더에서 `npm install` 완료
- [ ] `better-sqlite3` native build 성공
- [ ] 오류 없이 설치 완료

---

## R1. Boot

```bash
cd app/
npm run dev
```

- [ ] Electron 창이 열림
- [ ] TopBar: "업무Portal" + "v2" chip 표시
- [ ] 4개 탭: 캘린더 / 할 일 / 메모 / 스냅샷
- [ ] DevTools Console에 빨간 오류 없음
- [ ] 오늘 날짜 캘린더에 하이라이트

---

## R2. Calendar

- [ ] 월 이동 (‹/›) 정상
- [ ] "오늘" 버튼 → 현재 월로 이동
- [ ] "+ 일정 추가" → modal 열림
- [ ] 제목 입력 → "추가" → 이벤트 생성
- [ ] 캘린더 날짜에 초록 점 표시
- [ ] × 버튼 → 이벤트 삭제

---

## R3. Todo ↔ Calendar Sync

- [ ] 할 일 추가 (마감일 있음) → 캘린더에 `[할 일] 제목` 이벤트 자동 생성
- [ ] 할 일 완료 체크 → 캘린더 이벤트 녹색으로 변경
- [ ] 할 일 삭제 → 연결 이벤트도 함께 삭제
- [ ] 캘린더 이벤트 삭제 → 할 일은 유지, linkedEventId만 제거

---

## R4. Memo

- [ ] 날짜 이동 (‹/›/오늘) 정상
- [ ] 텍스트 입력 → 600ms 후 "저장됨 ✓" 표시

---

## R5. Search

- [ ] Ctrl+F → 검색 패널 열림
- [ ] 🔍 버튼 → 검색 패널 열림
- [ ] 키워드 입력 → 관련 항목 표시
- [ ] 타입 필터 (할 일/일정/메모) 토글
- [ ] 결과 클릭 → 해당 탭으로 이동
- [ ] ESC → 검색 패널 닫힘

---

## R6. Undo / Redo

- [ ] 할 일 추가 후 Ctrl+Z → 이전 상태 복원
- [ ] Ctrl+Y → 다시 적용
- [ ] TopBar "↩ 취소" / "↪ 다시" 버튼 동작
- [ ] 새 action 후 redo 불가 확인

---

## R7. Snapshot Debug

- [ ] 스냅샷 탭 → 현재 상태 JSON 표시
- [ ] engine_version / snapshot_version 표시
- [ ] 이력 카운터 (n / total)
- [ ] "JSON 복사" 버튼 동작
- [ ] 데이터 추가 후 재확인 → 업데이트됨

---

## R8. Persistence (종료 → 재실행)

```
1. 앱에서 할 일 3개, 메모 1개, 일정 1개 생성
2. 앱 완전 종료 (창 닫기)
3. 앱 재실행 (npm run dev)
```

- [ ] 할 일 3개 복원
- [ ] 메모 내용 복원
- [ ] 일정 복원
- [ ] Todo ↔ Calendar 링크 유지

---

## R9. 패키징 (선택 — RC2 이후)

```bash
npm run build:win   # Windows
npm run build:mac   # macOS
```

- [ ] 빌드 완료 (`dist/` 폴더 생성)
- [ ] portable 실행 파일 동작
- [ ] installer 정상 설치
- [ ] 설치 후 실행 → R1~R8 재확인

---

## 발견 이슈 기록

| 번호 | 증상 | 재현 방법 | 우선순위 |
|---|---|---|---|
| - | - | - | - |

---

## RC 판정 기준

| 구분 | 조건 |
|---|---|
| RC2 진입 | R1~R7 전부 통과 |
| RC2 → v1.0 | R8 (Persistence) 통과 + 발견 이슈 없음 |
| v1.0 release | R9 (패키징) 통과 |
