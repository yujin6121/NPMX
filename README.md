# NPMX

NPM을 대체하기 위해 바이브 코드가 포함하여 작업한 역방향 프록시 입니다.

## ✨ 주요 특징

### 프록시 관리
- **HTTP/3 & QUIC** - 차세대 프로토콜로 더 빠른 연결 제공
- **자동 SSL 인증서** - Let's Encrypt 자동 발급 및 갱신 (만료 30일 전)
- **무제한 파일 업로드** - 업로드 크기 제한 없음
- **WebSocket 지원** - 완벽한 WebSocket 프록시 기능
- **사용자 정의 Location** - 고급 Nginx location 블록 설정

### 보안
- **WAF 통합** - ModSecurity와 OWASP Core Rule Set
- **GeoIP 필터링** - 국가 기반 접근 제어
- **2단계 인증** - TOTP 기반 2FA
- **공격 차단** - 일반적인 공격 패턴 방어
- **SSL/TLS 강제** - HTTPS 리디렉션

### 모니터링
- **활동 로그** - 포괄적인 감사 추적
  - 날짜, 작업 유형, 키워드 필터링
  - CSV 내보내기
  - 실시간 통계 (요청 수, 오류율, 고유 IP)
  - IP 주소 및 User Agent 추적
- **시스템 모니터링** - CPU, 메모리, 디스크 사용량 대시보드
- **트래픽 통계** - 요청 수 및 오류율 분석

### 사용자 경험
- **다크 모드** - 눈이 편한 다크 테마
- **다국어 지원** - 한국어 및 영어
- **프로필 관리** - 아바타 업로드, 이메일/비밀번호 변경
- **백업 & 복원** - 데이터베이스 백업/복원
- **포트 스캐너** - 내장 네트워크 포트 스캔 도구

## 🚀 빠른 시작 (Docker)

### 1. Docker Compose 설치

```bash
# 저장소 복제
git clone <repository-url>
cd npmx

# 환경 설정
cp .env.docker .env

# .env 파일 수정
nano .env

# 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f npmx
```

**기본 계정:**
- 이메일: `admin@example.com`
- 비밀번호: `changeme`

⚠️ **첫 로그인 후 반드시 기본 비밀번호를 변경하세요!**

### 2. 환경 변수 설정

`.env` 파일 수정:

```bash
# JWT 시크릿 - 반드시 변경하세요!
JWT_SECRET=여기에-강력한-랜덤-키-입력

# 기본 관리자 계정
DEFAULT_EMAIL=admin@example.com
DEFAULT_PASSWORD=changeme

# Let's Encrypt 설정
LETSENCRYPT_STAGING=false  # 테스트 시 true로 설정

# 디버그 모드
DEBUG=false
```

### 3. 대시보드 접속

브라우저에서 다음 주소로 접속:
- **HTTP**: `http://localhost:81`
- **HTTPS**: `https://localhost:4443`

## 📖 사용 가이드

### 프록시 호스트 추가

1. **새 호스트 추가**
   - 도메인 이름 입력 (쉼표로 구분하여 여러 개 가능)
   - 포워드 스킴 선택 (http/https)
   - 대상 호스트 및 포트 입력
   - SSL 인증서 선택
   - HTTP/3 활성화 여부 선택

2. **SSL 인증서**
   - Let's Encrypt 자동 발급
   - 만료 30일 전 자동 갱신
   - 하나의 인증서로 여러 도메인 지원
   - SSL/HTTPS 강제 옵션

3. **고급 옵션**
   - 사용자 정의 Nginx location
   - WebSocket 업그레이드 지원
   - 캐시 제어
   - 일반 공격 차단

### 보안 기능

1. **WAF (웹 애플리케이션 방화벽)**
   - 호스트별 ModSecurity 활성화
   - 모드 선택: DetectionOnly 또는 On (차단)
   - Paranoia 레벨 1-4
   - OWASP Core Rule Set 적용

2. **GeoIP 필터링**
   - 특정 국가 허용
   - 특정 국가 차단
   - ISO 국가 코드 사용 (예: US, KR, CN)

3. **2단계 인증**
   - TOTP 기반 (Google Authenticator, Authy)
   - QR 코드 설정
   - 백업 코드 제공

### 활동 모니터링

1. **활동 로그**
   - 모든 사용자 작업 조회
   - 날짜 범위로 필터링
   - 키워드, IP, 작업별 검색
   - CSV로 내보내기

2. **통계 대시보드**
   - 총 요청 수
   - 오류 수 및 오류율
   - 고유 IP 주소 수
   - 작업 분류

3. **시스템 모니터링**
   - 실시간 CPU 사용량
   - 메모리 사용률
   - 디스크 공간
   - 시스템 가동 시간

## 🐛 문제 해결

### 로그인 문제

1. **"이메일 또는 비밀번호가 잘못되었습니다"**
   - 기본 계정 사용: `admin@example.com` / `changeme`
   - 데이터베이스 초기화: `docker-compose down -v && docker-compose up -d`

2. **로그인 실패 시 오류 메시지가 표시되지 않음**
   - 브라우저 콘솔에서 오류 확인
   - 백엔드 로그 확인: `docker-compose logs -f npmx`

### SSL 인증서 문제

1. **Let's Encrypt 속도 제한**
   - 테스트 시 `LETSENCRYPT_STAGING=true` 설정
   - 속도 제한 초기화 대기 (주간/일일 제한)

2. **인증서가 갱신되지 않음**
   - 컨테이너의 certbot 로그 확인
   - DNS 레코드가 서버를 가리키는지 확인

### 성능 문제

1. **느린 프록시 응답**
   - 시스템 리소스 확인 (CPU/메모리)
   - 대상 호스트 응답성 확인
   - 해당되는 경우 캐싱 활성화

2. **높은 메모리 사용량**
   - 활성 연결 검토
   - WAF 규칙 확인 (높은 paranoia 레벨)

## 📝 라이선스

MIT License - 자세한 내용은 LICENSE 파일 참조

## 🙏 크레딧

이 프로젝트는 다음에서 영감을 받았습니다:
- [Nginx Proxy Manager](https://github.com/NginxProxyManager/nginx-proxy-manager)
- [NPMplus](https://github.com/ZoeyVid/NPMplus)

---

**NPMX - Node.js, React, Nginx, ModSecurity로 ❤️ 를 담아 제작되었습니다**