# 비동기큐

python 의 asyncio.Queue 클래스와 유사한 비동기큐를 사용

deno 에 내장되어 있는 Deno.Kv 비동기큐를 사용하고자 했으나, 아직 unstable 이고, asyncio.Queue 와는 다소 다른 형태가 되는 것 같아, copilot 이 생성해 준 별도 클래스를 사용

데이터 전처리 후 인큐 위한 producer 와 데이터 디큐 및 최종처리 위한 consumer 함수 준비

producer 와 consumer 안에는 실제 작업을 위한 비동기 함수가 있으며, 미리 설정한 개수를 한도로 병행

