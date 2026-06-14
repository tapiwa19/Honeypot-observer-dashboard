# 🍯 Honeypot Observer

**An Adaptive Adversarial Engagement and Behavioural Analysis System**

> *"We don't just detect attackers. We study them."*

A real-time cybersecurity intelligence platform that deploys a medium-interaction SSH honeypot to lure, capture, and analyse adversarial behaviour. The system processes every attacker session through a live ELK Stack pipeline, classifies behaviour against the MITRE ATT\&CK framework, and delivers forensic intelligence to analysts via a React TypeScript dashboard — within 5 seconds of detection.

---

## 🎓 Academic Context

| Field | Detail |
|---|---|
| Student | Tapiwa Mafuhure · N02212913Q |
| Supervisor | Mr K.G. Mahute |
| Institution | National University of Science and Technology (NUST), Zimbabwe |
| Degree | BSc (Hons) Computer Science · 2025 |
| Project Type | Final Year Project — System + Research |

---

## 🏗️ System Architecture

```
Internet Attackers
       │
       ▼ port 22
┌─────────────────────────────────────────────────────────┐
│  Ubuntu VM (VirtualBox)                                  │
│                                                          │
│  ┌──────────┐   logs   ┌──────────┐   ┌─────────────┐  │
│  │  Cowrie  │ ───────► │ Filebeat │──►│  Logstash   │  │
│  │ (Docker) │          └──────────┘   │ GeoIP Parse │  │
│  └──────────┘                         └──────┬──────┘  │
│  Bridged adapter                             │          │
│  (internet-facing)                           ▼          │
│                                    ┌───────────────────┐│
│                                    │   Elasticsearch   ││
│                                    │  Index · Search   ││
│                                    └────────┬──────────┘│
│  Host-only adapter                          │           │
│  192.168.56.101                             ▼           │
│  (management only)                ┌─────────────────┐   │
│                                   │  Node.js API    │   │
│                                   │  REST · WS      │   │
│                                   └────────┬────────┘   │
└────────────────────────────────────────────│────────────┘
                                             │
                          ┌──────────────────┼──────────────┐
                          ▼                  ▼              ▼
                   React Dashboard     NTFY Push      Twilio SMS
                   (Windows host)      Notification   Alert
```

**End-to-end latency: under 5 seconds from attack event to dashboard display.**

The bridged network adapter exposes only Cowrie on port 22 to the internet. All other services — Elasticsearch, Logstash, Kibana, and the Node.js backend — are bound exclusively to the host-only adapter and are unreachable from outside the local machine.

---

## ✨ Features

### Core Intelligence Pipeline
- **Live attack capture** — Cowrie medium-interaction SSH honeypot on port 22 inside Docker
- **Real-time log processing** — Filebeat ships logs to Logstash for parsing, field extraction, and GeoIP enrichment within seconds
- **Indexed event storage** — Elasticsearch stores and indexes every event for sub-second querying
- **WebSocket live feed** — Socket.IO pushes new sessions to the dashboard within 4 seconds, no page refresh required

### Behavioural Classification
- **Event-level severity mapping** — CRITICAL for successful logins and file downloads, HIGH for active command execution, MEDIUM for failed attempts
- **Session risk scoring** — 1 to 10 based on command frequency; sessions scoring 7 or above trigger the alert pipeline
- **MITRE ATT\&CK attribution** — every session automatically tagged: Initial Access T1078, Execution T1059, Discovery T1082, Persistence T1136, Command and Control T1071
- **Skill level classification** — Advanced, Intermediate, Beginner based on command count and behavioural patterns

### Forensic Intelligence
- **Session replay** — full command-by-command reconstruction with precision timestamps; distinguishes human operators from automated bots by inter-command timing
- **Credential intelligence** — username and password pairs captured, deduplicated, and ranked by attempt frequency
- **Geographic attack mapping** — Leaflet.js live heatmap with IP geolocation via local geoip-lite database (no external API dependency)
- **Behavioural analytics** — attack pattern detection, attacker profiling, vulnerability targeting analysis, TTP timeline

### Alerting and Response
- **Multi-channel alerting** — NTFY HTTP push notification and Twilio SMS dispatched asynchronously within 6 seconds of CRITICAL detection
- **DDoS self-protection** — backend monitors its own request rate and broadcasts a warning if any IP exceeds 100 requests per minute
- **Browser notifications** — Web Notifications API fires a desktop alert even when the dashboard tab is not in focus
- **Audio notification** — Web Audio API plays an alert tone the moment a new session is detected

### Dashboard and Management
- **Role-based access control** — SOC Analyst and Admin roles enforced via JWT authentication on all API endpoints
- **CSV export** — bulk session export for SIEM integration and research use
- **Real-time connection health** — latency monitoring, reconnection tracking, and WebSocket status indicator
- **Time range filtering** — Last Hour, Last 24 Hours, Last 7 Days, All Time

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Honeypot | Cowrie + Docker | Medium-interaction SSH decoy, container isolation |
| Log Shipping | Filebeat | Lightweight log forwarder from Cowrie to Logstash |
| Log Processing | Logstash | Parsing, field extraction, GeoIP enrichment |
| Storage | Elasticsearch 8.x | Indexed document store, sub-second search |
| Visualisation | Kibana | Raw log exploration and index management |
| Backend API | Node.js 18 + Express | REST endpoints, business logic, classification engine |
| Real-time | Socket.IO | WebSocket push for live dashboard updates |
| Frontend | React 18 + TypeScript | Component-based dashboard UI |
| Styling | Tailwind CSS | Utility-first styling framework |
| Maps | Leaflet.js | Interactive geographic attack visualisation |
| Geolocation | geoip-lite | Local MaxMind IP resolution — no external API |
| Alerting | NTFY + Twilio | HTTP push and SMS notification dispatch |
| Auth | JWT + bcrypt | Token-based authentication, password hashing |
| Testing | Vitest + Jest + Supertest | Unit, integration, and API endpoint testing |
| Attack Simulation | Metasploit + Kali Linux | Controlled penetration testing for system validation |
| Infrastructure | VirtualBox + Ubuntu 24.04 | VM hosting the complete server environment |

---

## 📊 Validated Results

### System Testing — 107 Tests · 100% Pass Rate

| Tier | Tool | Result |
|---|---|---|
| Unit Testing | Vitest + Jest | 34/34 passed · 0.734 seconds |
| Integration Testing | Jest + Supertest | 66/66 passed · 9.524 seconds |
| System Testing | Metasploit + Manual SSH | 7/7 end-to-end scenarios passed |

### Performance Metrics

| Metric | Target | Achieved |
|---|---|---|
| Pipeline latency (attack to Elasticsearch) | < 7 seconds | < 5 seconds ✓ |
| Dashboard live update (WebSocket) | < 6 seconds | 4 seconds ✓ |
| NTFY alert dispatch | < 7 seconds | < 6 seconds ✓ |

### Behavioural Classifier — 200 Live Events

| Attack Class | Precision | Recall | Support |
|---|---|---|---|
| Brute Force | 1.00 | 1.00 | 52 |
| Reconnaissance | 1.00 | 1.00 | 139 |
| Malware Download | 1.00 | 1.00 | 6 |
| Command Injection | 1.00 | 1.00 | 3 |

> **Note:** The classifier uses a rule-based engine derived from Cowrie event identifiers. The results confirm correct rule implementation across all 200 evaluated events. The system does not claim generalisation to novel attack patterns outside predefined event types — this is an acknowledged limitation addressed in future work.

---

## 🚀 Getting Started

### Prerequisites

```
Node.js >= 18.0.0
npm >= 9.0.0
Docker + Docker Compose
VirtualBox (for Ubuntu VM deployment)
Ubuntu 24.04 (server environment)
```

### Frontend — Development

```bash
# Clone the repository
git clone https://github.com/tapiwa19/honeypot-observer.git
cd honeypot-observer/frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your VM IP:
# VITE_API_URL=http://192.168.56.101:5001/api
# VITE_SOCKET_URL=http://192.168.56.101:5001

# Start development server
npm run dev
```

Open `http://localhost:3000` in your browser.

### Backend — Ubuntu VM

```bash
# SSH into your Ubuntu VM
ssh -p 2222 user@192.168.56.101

# Navigate to backend directory
cd honeypot-observer/backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Configure Elasticsearch connection, JWT secret, Twilio credentials

# Start backend server
npm run dev
```

### Cowrie Honeypot — Docker

```bash
# Navigate to docker directory
cd honeypot-observer/docker

# Start Cowrie container
docker-compose up -d cowrie

# Verify Cowrie is running
docker logs -f cowrie

# Cowrie listens on port 22 via bridged adapter
# All logs written to /home/cowrie/var/log/cowrie/
```

### ELK Stack — Docker

```bash
# Start Elasticsearch, Logstash, Kibana, and Filebeat
docker-compose up -d elasticsearch logstash kibana filebeat

# Verify Elasticsearch is running
curl http://localhost:9200

# Kibana available at http://192.168.56.101:5601 (host-only only)
```

### Environment Variables

**Frontend `.env`:**
```env
VITE_API_URL=http://192.168.56.101:5001/api
VITE_SOCKET_URL=http://192.168.56.101:5001
```

**Backend `.env`:**
```env
PORT=5001
ELASTICSEARCH_URL=http://localhost:9200
JWT_SECRET=your_jwt_secret_here
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_FROM=+1234567890
TWILIO_PHONE_TO=+1234567890
NTFY_TOPIC=your_ntfy_topic
NODE_ENV=development
```

---

## 📁 Project Structure

```
honeypot-observer/
├── frontend/                    # React TypeScript dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, TopBar, StatCard
│   │   │   ├── LiveAttackFeed.tsx
│   │   │   └── sessions/        # SessionCard
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx        # Main overview + WebSocket
│   │   │   ├── LiveSessions.tsx     # Real-time session grid + replay
│   │   │   ├── Analytics.tsx        # Timeline and attack charts
│   │   │   ├── Alerts.tsx           # Alert management
│   │   │   ├── GeoMap.tsx           # Leaflet.js geographic map
│   │   │   ├── BehavioralAnalytics.tsx  # MITRE + profiling
│   │   │   ├── DataExport.tsx       # CSV + JSON export
│   │   │   └── Settings.tsx
│   │   ├── services/
│   │   │   └── api.ts           # Axios API client
│   │   ├── utils/
│   │   │   ├── constants.ts     # Socket and API URLs
│   │   │   ├── formatters.ts    # Time and data formatters
│   │   │   └── behavioral.ts    # Pattern processing helpers
│   │   ├── types/               # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── .env.example
│   └── package.json
│
├── backend/                     # Node.js + Express API
│   ├── server.js                # Main server, WebSocket, classification engine
│   ├── routes/
│   │   ├── dashboard.js         # /api/dashboard/*
│   │   ├── sessions.js          # /api/sessions/*
│   │   ├── analytics.js         # /api/analytics/*
│   │   ├── credentials.js       # /api/credentials/*
│   │   └── alerts.js            # /api/alerts/*
│   ├── .env.example
│   └── package.json
│
├── docker/                      # Container configuration
│   ├── docker-compose.yml       # Cowrie + ELK Stack
│   ├── cowrie/
│   │   └── cowrie.cfg           # Cowrie honeypot configuration
│   └── logstash/
│       └── pipeline/
│           └── cowrie.conf      # Logstash parsing pipeline
│
└── README.md
```

---

## 🔐 Security Architecture

### Operational Security
- **Docker isolation** — Cowrie runs inside a container with its own filesystem, network namespace, and process space. Even full Cowrie compromise cannot reach the host Ubuntu system
- **Egress filtering** — Docker network rules prevent Cowrie from initiating outbound connections, making weaponisation impossible
- **Network separation** — bridged adapter exposes only port 22 to the internet; all management services bound to host-only adapter 192.168.56.101
- **iptables rules** — restrict bridged adapter traffic exclusively to the Cowrie container on port 22

### Application Security
- **JWT authentication** — all API endpoints protected with token-based authentication
- **Role-based access control** — SOC Analyst and Admin roles with distinct permissions
- **Input validation** — session IDs validated against regex before Elasticsearch queries to prevent injection
- **DDoS self-protection** — request rate monitoring with automatic WebSocket warning broadcast

### Ethical Considerations
- All captured data used strictly for research and security analysis
- Egress filtering prevents the honeypot from being used to attack third parties
- Container state resets eliminate persistent attacker backdoors
- Compliant with NIST SP 800-207 transparency guidelines for deception system design

---

## 🧪 Running Tests

```bash
# Navigate to backend
cd backend

# Run all unit tests
npm run test:unit

# Run integration tests (requires backend running)
npm run test:integration

# Run all tests with coverage
npm run test:coverage
```

```bash
# Navigate to frontend
cd frontend

# Run frontend unit tests
npm run test
```

---

## 📚 Research Contributions

This system makes four documented contributions to the cybersecurity research field:

**1. Integrated Pipeline** — First documented open-source system combining Cowrie, ELK Stack, forensic session replay, MITRE ATT\&CK attribution, and real-time multi-channel alerting in a single deployable architecture with sub-5-second end-to-end latency.

**2. Authentic Live Dataset** — Original attack dataset generated from live internet exposure containing real credential combinations, command sequences, and inter-command timing patterns. Not synthetic, not downloaded — produced by this system during deployment. Suitable for training supervised machine learning classifiers on genuine attacker behaviour.

**3. Forensic Session Replay** — Addresses a documented gap in reviewed honeypot literature. Full command-level session reconstruction with precision timestamps enables analysts to distinguish human operators from automated tools without manual log analysis.

**4. African Context Evidence** — Empirical validation of honeypot deployment in a Zimbabwean academic context — an underrepresented geographic region in global cybersecurity research. Contributes deployment findings distinct from the European, North American, and Asian contexts that dominate the existing literature.

---

## 🔮 Future Work

| Priority | Enhancement |
|---|---|
| 1 | Replace rule-based classifier with Random Forest or LSTM trained continuously on captured dataset |
| 2 | Extend to HTTP, FTP, and RDP honeypot protocols for broader attack coverage |
| 3 | Integrate AbuseIPDB and VPN IP databases for probabilistic geographic attribution |
| 4 | Export Elasticsearch data to Splunk or IBM QRadar for SIEM integration |
| 5 | Automated dataset publication pipeline for the cybersecurity research community |

---

## 📄 Academic References

- Spitzner, L. (2003). *Honeypots: Tracking Hackers.* Addison-Wesley.
- Mukti, I.Y., Sukarno, P., & Wardana, A.A. (2021). Integration of Cowrie honeypot with ELK Stack for real-time SSH attack analysis. *Jurnal RESTI*, 5(4), 701–710.
- Chingoriwo, T. (2022). Cybersecurity challenges and needs in Zimbabwe. *British Journal of Multidisciplinary and Advanced Studies*, 3(2), 77–104.
- MITRE ATT\&CK Framework: https://attack.mitre.org

---

## 📄 License

This project is submitted for academic assessment at the National University of Science and Technology, Zimbabwe. All rights reserved. Not licensed for commercial use.

---

*Honeypot Observer — Tapiwa Mafuhure · NUST · 2025*

