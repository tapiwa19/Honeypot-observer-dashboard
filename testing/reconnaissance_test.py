# reconnaissance_test.py
import paramiko
import time

TARGET_IP   = "192.168.56.101"
TARGET_PORT = 22
USERNAME    = "root"
PASSWORD    = "hello"      # accepted by Cowrie

recon_commands = [
    "whoami",
    "id",
    "uname -a",
    "hostname",
    "pwd",
    "ls -la",
    "cat /etc/passwd",
    "cat /etc/os-release",
    "cat /etc/hosts",
    "ifconfig",
    "ip addr",
    "netstat -tulnp",
    "ps aux",
    "cat /proc/cpuinfo",
    "df -h",
    "free -m",
    "env",
    "ls /home",
    "last",
    "w",
]

print(f"🔍 Starting reconnaissance simulation against {TARGET_IP}...")
print(f"   Username : {USERNAME}")
print(f"   Password : {PASSWORD}")
print(f"   Commands : {len(recon_commands)}\n")

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        TARGET_IP, port=TARGET_PORT,
        username=USERNAME, password=PASSWORD,
        timeout=5, banner_timeout=5
    )
    print(f"  ✅ Connected successfully\n")

    for cmd in recon_commands:
        try:
            stdin, stdout, stderr = client.exec_command(cmd)
            output = stdout.read().decode().strip()
            print(f"  🔍 {cmd}")
            if output:
                # show first 80 chars of output
                print(f"      → {output[:80]}")
        except Exception as e:
            print(f"  ⚠️  {cmd} → {e}")
        time.sleep(1)

    client.close()
    print(f"\n{'='*50}")
    print(f"  Reconnaissance Complete")
    print(f"  Commands run    : {len(recon_commands)}")
    print(f"  Check dashboard : http://localhost:3000")
    print(f"{'='*50}")

except paramiko.AuthenticationException:
    print(f"❌ Authentication failed — check credentials")
except Exception as e:
    print(f"❌ Connection failed: {e}")
    print(f"   Make sure your VM is running")