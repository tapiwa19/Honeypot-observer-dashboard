# 🍯 Honeypot Observer Dashboard

A modern, real-time cybersecurity dashboard for monitoring and analyzing honeypot attacks using Cowrie framework and ELK stack.

## 🎓 Academic Project



## 📊 Project Status

🚧 **Phase 1: Frontend Development** ✅ COMPLETED  
🚧 **Phase 2: Backend Integration** 🔄 IN PROGRESS  
🚧 **Phase 3: Live Deployment** ⏳ PENDING

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Icons:** Lucide React
- **Build Tool:** Vite

### Backend (Planned)
- **Honeypot:** Cowrie SSH/Telnet Honeypot
- **Data Stack:** Elasticsearch, Logstash, Kibana (ELK)
- **API:** Node.js/Express
- **Real-time:** Socket.IO/WebSockets

## ✨ Features

### Implemented ✅
- [x] Real-time dashboard with live statistics
- [x] Interactive attack session monitoring
- [x] Analytics with charts and visualizations
- [x] Alert management system with investigation modals
- [x] Geographic attack origin mapping
- [x] Behavioral analytics and attacker profiling
- [x] MITRE ATT&CK framework mapping
- [x] Data export center (CSV, JSON, Excel, PDF)
- [x] Professional UI/UX with dark/light themes
- [x] Responsive design for all devices

### In Development 🔄
- [ ] Integration with real Cowrie honeypot data
- [ ] Elasticsearch backend connection
- [ ] WebSocket for real-time updates
- [ ] Authentication system
- [ ] Database for persistent storage

## 🚀 Getting Started

### Prerequisites
```bash
node >= 18.0.0
npm >= 9.0.0
```

### Installation

1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/honeypot-observer.git
cd honeypot-observer
```

2. Install dependencies
```bash
npm install
```

3. Run development server
```bash
npm run dev
```

> **Tip:** the frontend reads API/socket endpoints from Vite environment variables.
> Create a `.env` file in the repo root with values such as:
> ```env
> VITE_API_URL=http://localhost:5001/api
> VITE_SOCKET_URL=http://localhost:5001
> ```
> That way the client will connect correctly in different environments.

4. Open browser to `http://localhost:3000`

### Build for Production
```bash
npm run build
npm run preview
```

## 📁 Project Structure
```
honeypot-observer/
├── src/
│   ├── components/
│   │   ├── layout/          # Sidebar, TopBar, StatCard
│   │   └── sessions/        # SessionCard
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── LiveSessions.tsx
│   │   ├── Analytics.tsx
│   │   ├── Alerts.tsx
│   │   ├── GeoMap.tsx
│   │   ├── BehavioralAnalytics.tsx
│   │   ├── DataExport.tsx
│   │   └── Settings.tsx
│   ├── types/               # TypeScript definitions
│   ├── utils/               # Helper functions
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
└── README.md
```

## 🎨 Screenshots

> **Note:** Screenshots will be added after backend integration

## 🔐 Security Note

⚠️ **This is a development version with mock data.**  
Real honeypot data will be integrated in Phase 2.  
No sensitive or production data is included in this repository.

## 📚 Documentation

### Mock Data
Currently using simulated attack data for UI development:
- Attack feed: Randomized IP addresses and attack types
- Sessions: Simulated SSH connection data
- Analytics: Generated statistics and charts
- Geographic: Sample country-wise attack distribution

### Future Integration
Backend will connect to:
- Cowrie honeypot logs
- Elasticsearch indices
- Real-time attack stream

## 🎯 Learning Objectives

1. ✅ Frontend development with React + TypeScript
2. ✅ Data visualization and charts
3. ✅ Responsive UI/UX design
4. 🔄 Backend API development
5. 🔄 Database integration
6. 🔄 Real-time data streaming
7. ⏳ Cybersecurity concepts and honeypot analysis



## 📄 License

This project is for academic purposes only.


