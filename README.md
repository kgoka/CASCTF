# CASCTF

캐스퍼용 CTF(문제 풀이) 플랫폼입니다.  
플레이어는 CTF 진행, 관리자는 CTF를 관리 및 운영할 수 있습니다.

## 기술 스택
- Frontend: Next.js, React, TypeScript
- Backend: FastAPI, SQLAlchemy, Pydantic
- Database: SQLite
- Infra: Docker Compose

## 개발 브랜치 규칙
기본 작업 흐름은 아래처럼 진행합니다.

1. `develop`에서 기능 브랜치 생성
2. 기능 개발 및 커밋
3. `develop`으로 Merge

예시:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/할거

# 작업 후
git add .
git commit -m "feat: 작업 내용"
git push -u origin feature/your-task

# PR 또는 merge 후 develop 반영
```