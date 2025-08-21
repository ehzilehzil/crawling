# 파이썬 크롤링

## 비동기 병행실행 방식

asyncio 모듈로, producer 와 comsumer 분리, 중간에 비동기큐로 통신

일단 consumer 부분은 다수워커가 사용될 수 있어, 각 워커가 실행해야 하는 일들은 task 함수로 분리, consumer 안에서 여러개 워커가 task 를 병행실행 하도록 함



## tor 네트워크

tor 데몬으로 실행, [Tor 다운로드 사이트](https://www.torproject.org/download/tor/) 에서 Tor Expert Bundle Windows 용으로 다운로드

압축파일에서 tor.exe 만을 빼내고, 같은 폴더에 torrc 파일을 아래 내용으로 생성 (copilot 이 만들어줬음)

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