import os
import requests
import time
import subprocess
from stem import Signal
from stem.control import Controller

# 최대 30개
ports = [
    9050, 9060, 9070, 9080, 9090, 9150, 9160, 9170, 9180, 9190,
    9250, 9260, 9270, 9280, 9290, 9350, 9360, 9370, 9380, 9390,
    9450, 9460, 9470, 9480, 9490, 9550, 9560, 9570, 9580, 9590,
]
procs = {}

def run_tor_instance(i):
    ''' i 번째 tor 인스턴스 생성 '''

    data_dir = f"z:/_dev/_env/tmp/tor{i}"
    os.makedirs(data_dir, exist_ok=True)
    cmd = [
        "../_env/tor.exe",
        "--SocksPort", f"{ports[i]}",
        "--ControlPort", f"{ports[i] + 1}",
        "--CookieAuthentication", "1",
        "--CookieAuthFileGroupReadable", "1",
        "--Log", "notice stdout",
        "--DataDirectory", data_dir,
    ]
    proc = subprocess.Popen(
        cmd,
        creationflags=subprocess.CREATE_NEW_CONSOLE,
        # stdout=subprocess.DEVNULL,
        # stderr=subprocess.DEVNULL,
        # stdin=subprocess.DEVNULL,
    )
    
    procs[i] = proc
    time.sleep(0.2)

def stop_tor_instance(i):
    ''' i 번재 tor 인스턴스 종료 '''
    procs[i].terminate()

def get_tor_session(i):
    ''' i 번째 tor 인스턴스 세션 연결'''

    session = requests.session()
    session.proxies = {
        "http": f"socks5h://127.0.0.1:{ports[i]}",
        "https": f"socks5h://127.0.0.1:{ports[i]}",
    }
    return session

def is_connected():
    try:
        get_tor_session().get("http://httpbin.org/ip")
    except:
        return False
    return True

def renew_circuit(i):
    ''' i 번째 tor 인스턴스 회로 재설정 요청 '''
    with Controller.from_port(port=ports[i] + 1) as controller:
        controller.authenticate()
        controller.signal(Signal.NEWNYM)

##################################################################

def test(i):
    # print("Public IP:", requests.get("http://httpbin.org/ip").text)
    
    tor_session = get_tor_session(i)
    print("Tor IP:", tor_session.get("http://httpbin.org/ip").text)

if __name__ == "__main__":
    run_tor_instance(0)
    run_tor_instance(1)

    tor_session0 = get_tor_session(0)
    tor_session1 = get_tor_session(1)

    print(tor_session0.get("http://httpbin.org/ip", timeout=10).text)
    print(tor_session1.get("http://httpbin.org/ip", timeout=10).text)
    
    stop_tor_instance(0)
    stop_tor_instance(1)