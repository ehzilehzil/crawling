# 파이썬 크롤링

## 환경변수

dotenv 모듈 사용하여 다른 폴더에 있는 .env 파일 로드

텔레그램, 몽고DB 관련 토큰이나 비번 등


## 비동기 병렬실행 방식

asyncio 모듈로, producer 와 comsumer 분리, 중간에 비동기큐로 데이터를 주고 받음

일단 consumer 부분은 다수워커가 병렬실행될 수 있어, 각 워커가 실행해야 하는 일들은 다시 task 함수로 분리, consumer 안에서 여러개 워커가 task 를 병행실행 하도록 함

전역에 Config 클래스를 형성, 클래스 속성을 사용하여, consumer 안에서 워커 수를 조절하도록 함 (현재는 수동이며 나중에 CPU, 메모리 자원에 따라 조절할 수 있는 로직을 붙일 예정)



## tor 네트워크

[torpy](https://pypi.org/project/torpy/) 쓰고자 했으나, python 3.9 버전 이후로 유지보수 안하는 듯, 25년 8월 현재 최근 최신 버전인 3.13 에서 사용하면 예외가 발생함

tor 데몬으로 실행, [Tor 다운로드 사이트](https://www.torproject.org/download/tor/) 에서 Tor Expert Bundle Windows 용으로 다운로드

압축파일에서 tor.exe 만을 빼내고, 같은 폴더에 torrc 파일을 아래 내용으로 생성 (copilot 이 만들어줬음 ❤)

```plaintext
socksPort 9050
ControlPort 9051
CookieAuthentication 1
CookieAuthFileGroupReadable 1
Log notice stdout
```

tor 데몬 실행할 땐 아래와 같이 실행

```bash
tor.exe -f ./torrc
```

## TBD

텔레그램 메시지 송신
몽고DB 아틀라스 연결
