# 업무Portal v2 — Runtime Validation Guide

## 실행 환경
- Node.js 20+
- npm 9+
- Windows 10/11 또는 macOS

---

## STEP R1: 로컬 실행

### 1. 의존성 설치
```bash
cd app/
npm install
```

> `better-sqlite3`는 네이티브 모듈이므로 빌드 시간이 걸릴 수 있어요.
> Windows에서는 `windows-build-tools` 필요할 수 있어요.

### 2. 개발 모드 실행
```bash
npm run dev
```

### 3. Smoke Test 체크리스트

#### Boot
- [ ] 앱 창이 열림
- [ ] TopBar에 "업무Portal v2" 표시
- [ ] 4개 탭 (캘린더/할 일/메모/스냅샷) 표시

#### Calendar
- [ ] 오늘 날짜 하이라이트
- [ ] 월 이동 (‹/›) 동작
- [ ] "+ 일정 추가" 클릭 → modal 열림
- [ ] 일정 추가 → 캘린더에 점 표시
- [ ] 일정 삭제 (× 버튼)

#### Todo
- [ ] "+ 추가" → modal → 할 일 추가
- [ ] 체크 클릭 → 완료 처리 (strikethrough)
- [ ] 마감일 있는 할 일 추가 → 캘린더에 [할 일] 이벤트 자동 생성 확인
- [ ] 완료 표시 → 캘린더 연결 이벤트 green으로 변경 확인
- [ ] 삭제 → 연결 이벤트도 삭제 확인
- [ ] "완료 삭제" 버튼

#### Memo
- [ ] 날짜 이동 (‹/›/오늘)
- [ ] 텍스트 입력 → 600ms 후 "저장됨 ✓" 표시

#### Search
- [ ] Ctrl+F → 검색 패널 열림
- [ ] 키워드 입력 → 결과 표시
- [ ] 결과 클릭 → 해당 뷰로 이동
- [ ] ESC → 검색 패널 닫힘

#### Undo/Redo
- [ ] 할 일 추가 후 Ctrl+Z → 취소됨
- [ ] Ctrl+Y → 다시 적용
- [ ] TopBar 버튼 동작

#### Snapshot Debug
- [ ] 스냅샷 탭에서 현재 상태 JSON 표시
- [ ] "JSON 복사" 버튼
- [ ] 이력 카운터 표시

---

## STEP R2: Persistence 검증

```bash
# 1. 앱 실행
npm run dev

# 2. 데이터 입력
# - 할 일 3개 추가
# - 메모 작성
# - 일정 추가

# 3. 앱 종료 (창 닫기)

# 4. 앱 재실행
npm run dev

# 5. 확인
# - 이전 데이터가 복원됐는지 확인
```

데이터 저장 위치:
- Windows: `%APPDATA%\work-portal-v2\work-portal-v2.db`
- macOS:   `~/Library/Application Support/work-portal-v2/work-portal-v2.db`

---

## STEP R3: 패키징

### Windows
```bash
npm run build:win
```

결과물: `dist/업무Portal-1.0.0-portable.exe` (portable)
        `dist/업무Portal Setup 1.0.0.exe` (installer)

### macOS
```bash
npm run build:mac
```

결과물: `dist/업무Portal-1.0.0.dmg`

---

## 알려진 주의사항

### better-sqlite3 네이티브 빌드
패키징 시 `asarUnpack`에 포함되어 있어요.
Windows에서 빌드 오류 시:
```bash
npm install --global windows-build-tools
npm rebuild better-sqlite3
```

### ESM + Electron
- `main.js`, `repository.js`, `app.js` → ESM (`type:module`)
- `preload.cjs` → CommonJS (Electron 요구사항)
- `better-sqlite3` → `createRequire`로 CJS 로드

### titleBarStyle
macOS에서 `hiddenInset` 적용됨.
Windows에서는 표준 타이틀바 사용.

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `Cannot find module 'better-sqlite3'` | 네이티브 빌드 실패 | `npm rebuild better-sqlite3` |
| 흰 화면 | preload 오류 | DevTools Console 확인 |
| snapshot 저장 안 됨 | IPC 오류 | Main process 로그 확인 |
| Ctrl+F 동작 안 함 | 포커스 문제 | 앱 창 클릭 후 시도 |
