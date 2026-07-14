# 한국사능력검정시험 심화 · 모의고사 문제은행 웹앱

기출 분석 기반 시대별 문제은행으로 모의고사를 반복 풀고, 틀린 개념의 **유사문제**를 다시 푸는 학습 웹앱.

## 현재 상태 (파일럿)
- **고려시대 100문항** 완성 (중상 40 / 상 60 — 난이도 중상 이상만, 정답 번호 균등 분포 20/20/20/20/20)
- 나머지 9시대는 동일 파이프라인으로 확장 예정 → 최종 표준 10시대 × 100 = **1000문항**

## 실행 방법
브라우저 자동화·`fetch` 제약 때문에 로컬 서버로 여는 것을 권장합니다.

```powershell
# 프로젝트 루트에서
node server.js 8777
# 브라우저에서 http://localhost:8777 접속
```

> 참고: `src/index.html`을 그대로 더블클릭(`file://`)해도 대부분 동작하지만, 일부 브라우저 보안설정에서 로컬 스크립트 로드가 막힐 수 있어 서버 실행을 권장합니다.

## 기능
- **홈** — 총 문항·푼 문항·누적 정답률·취약 개념 요약, 시대별 진입
- **모의고사** — 범위(전체/시대) · 문항 수(10/20/50) · 방식(학습모드=문항마다 즉시 해설 / 실전모드=일괄 채점)
- **오답 유사문제** — 틀린 문항의 개념 태그를 모아 취약 개념 순위화 → 개념별/종합 유사문제 재출제
- **통계** — 시대별·개념별 정답률, 기록 초기화
- 성적·오답 기록은 브라우저 `localStorage`에 저장 (서버·로그인 불필요)

## 문제 추가/재빌드
```powershell
# 1) 새 시대 문항을 src/data/questions/{prefix}_A.json, {prefix}_B.json 로 저장 (스키마: src/data/SCHEMA.md)
# 2) 정답 위치 균등화
.\rebalance.ps1 -Path .\src\data\questions\{prefix}_A.json
.\rebalance.ps1 -Path .\src\data\questions\{prefix}_B.json
# 3) 병합 + bank.js 재생성
.\build.ps1
```
`build.ps1` 의 `$eraKeyMap` 에 새 접두사→시대명 매핑을 추가하고, `app.js` 의 `matchEra` 매핑도 확장하면 시대별 필터가 연결됩니다.

## 파일 구조
```
src/
├── index.html         # 앱 진입점
├── styles.css         # 스타일 (라이트/다크 자동)
├── app.js             # 앱 로직 (라우팅·시험·채점·유사문제·통계)
└── data/
    ├── SCHEMA.md      # 문항 데이터 스키마
    ├── bank.js        # window.QUESTION_BANK (자동 생성)
    └── questions/
        ├── goryeo_A.json  # 정치·대외 50문항 (원본 부분파일)
        ├── goryeo_B.json  # 경제·사회·문화 50문항
        └── goryeo.json    # 병합·재번호 결과 (고려 100문항)
build.ps1              # 병합·bank.js 생성
rebalance.ps1          # 정답 번호 균등 재배치
server.js              # 로컬 정적 서버
_workspace/            # 기획·입력 정리 문서
```
