import psutil
from dotenv import load_dotenv

def load_env():
    load_dotenv(dotenv_path="../_env/.env")

# 개별 프로세스가 아닌 전체 사용량 확인 위해 process 개체는 사용안함
# process = psutil.Process()

def get_cpu_percent():
    return psutil.cpu_percent(interval=1.0)

def get_mem_percent():
    return psutil.virtual_memory().percent

def get_swap_percent():
    return psutil.swap_memory().percent

def get_swap_memory():
    ''' MB단위 '''
    return psutil.swap_memory().used / (1024 ** 2)

##################################################################

def test():
    print("CPU %:", get_cpu_percent())
    print("MEM %:", get_mem_percent())
    print("SWP %:", get_swap_percent())

if __name__ == "__main__":
    test()
    print(psutil.swap_memory().used / (1024 ** 2), "MB", psutil.swap_memory().percent)