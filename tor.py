import os
import requests
import time
import subprocess
from stem import Signal
from stem.control import Controller

class Tor:
    ports = [
        9050, 9060, 9070, 9080, 9090, 9150, 9160, 9170, 9180, 9190,
        9250, 9260, 9270, 9280, 9290, 9350, 9360, 9370, 9380, 9390,
        9450, 9460, 9470, 9480, 9490, 9550, 9560, 9570, 9580, 9590,
    ]
    proc = None
    socks = []
    current = 0


def init_tor_instance():
    ''' tor 인스턴스 생성 '''
    data_dir = f"z:/_dev/_env/tmp/tor"
    os.makedirs(data_dir, exist_ok=True)

    cmd = [
        "../_env/tor.exe",
        "--SocksPort", f"{Tor.ports[0]}",
        "--ControlPort", "9051",
        "--CookieAuthentication", "1",
        "--CookieAuthFileGroupReadable", "1",
        "--Log", "notice stdout",
        "--DataDirectory", data_dir,
    ]
    Tor.proc = subprocess.Popen(
        cmd,
        creationflags=subprocess.CREATE_NEW_CONSOLE,
    )

    Tor.current = 1

    for x in Tor.ports:
        session = requests.session()
        session.proxies = {
            "http": f"socks5h://127.0.0.1:{x}",
            "https": f"socks5h://127.0.0.1:{x}",
        }
        Tor.socks.append(session)

def set_tor_instance(i):
    if i <= 0 or len(Tor.ports) <= i:
        return
    
    Tor.current = i
    t = [("SocksPort", str(x)) for x in Tor.ports[:Tor.current]]
    print(t)

    with Controller.from_port(port=9051) as c:
        c.authenticate()
        c.set_options(t)

def renew_circuit():
    ''' tor 인스턴스 회로 재설정 요청 '''
    with Controller.from_port(port=9051) as c:
        c.authenticate()
        c.signal(Signal.NEWNYM)

def close_tor_instance():
    Tor.proc.terminate()

##################################################################

def test():
    init_tor_instance()

    set_tor_instance(4)

    for i in range(Tor.current):
        print("Tor IP:", Tor.socks[i].get("http://httpbin.org/ip").text)
    print("======")

    renew_circuit()
    time.sleep(5)

    for i in range(Tor.current):
        print("Tor IP:", Tor.socks[i].get("http://httpbin.org/ip").text)
    print("======")

    close_tor_instance()


if __name__ == "__main__":
    test()