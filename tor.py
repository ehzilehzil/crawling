import requests
import time
from stem import Signal
from stem.control import Controller

def get_tor_session():
    session = requests.session()
    session.proxies = {
        "http": "socks5h://127.0.0.1:9050",
        "https": "socks5h://127.0.0.1:9050",
    }
    return session

def isconnected():
    try:
        get_tor_session().get("http://httpbin.org/ip")
    except:
        return False
    
    return True

def renewcircuit():
    with Controller.from_port(port=9051) as controller:
        controller.authenticate()
        controller.signal(Signal.NEWNYM)

def test():
    print("Public IP:", requests.get("http://httpbin.org/ip").text)
    
    tor_session = get_tor_session()
    print("Tor IP:", tor_session.get("http://httpbin.org/ip").text)

if __name__ == "__main__":
    test()
    renewcircuit()
    time.sleep(1)
    test()