
# 🚀 SOC Dashboard - Ultimate Edition
## Features: Attack Map + Playbook Automation + Live Feed

---

## 📦 What's Included:

### ✅ Feature 1: Attack Map Visualization
- **Interactive world map** showing attack origins
- **Color-coded threat levels** (red = high, yellow = medium, green = low)
- **Real-time attack counters** by country
- **Click to filter** alerts by country
- **Top 5 countries** sidebar with flags

### ✅ Feature 2: Playbook Automation
- **One-click execution** of investigation playbooks
- **6 pre-built playbooks** (Malware, Brute Force, Data Exfil, etc.)
- **Real-time progress tracking** with step-by-step updates
- **Auto-remediation actions** (block IP, isolate host, notify team)
- **Time saved metrics** displayed

### ✅ Feature 3: Live Alert Feed
- **WebSocket real-time updates** - no refresh needed
- **Live counter** updates as alerts come in
- **Toast notifications** for new critical alerts
- **Auto-scroll feed** showing latest 5 alerts
- **Desktop notifications** for critical threats

---

## 📋 Files in This Package:

```
soc-final-package/
├── backend/
│   ├── main.py                 ← Enhanced backend with WebSocket
│   └── requirements.txt        ← Python dependencies
├── frontend/
│   ├── app/
│   │   └── page.tsx           ← Main dashboard (COMPLETE)
│   ├── components/
│   │   ├── AttackMap.tsx      ← Attack map component
│   │   ├── PlaybookRunner.tsx ← Playbook automation
│   │   └── LiveFeed.tsx       ← Live alert feed
│   └── package.json           ← Updated dependencies
└── README.md                  ← This file
```

---

## 🚀 Installation Steps:

### Step 1: Backend Setup

```bash
cd backend
rm -rf venv  # Remove old venv
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt --break-system-packages

# Start backend
uvicorn main:app --reload
```

**Backend runs on:** http://localhost:8000

---

### Step 2: Frontend Setup

```bash
cd frontend

# Install NEW dependencies
npm install socket.io-client react-simple-maps d3-geo

# Replace files
rm app/page.tsx
cp ../soc-final-package/frontend/app/page.tsx app/

# Create components folder if it doesn't exist
mkdir -p app/components
cp ../soc-final-package/frontend/components/*.tsx app/components/

# Start frontend
npm run dev
```

**Frontend runs on:** http://localhost:3000

---

## 🗺️ FEATURE 1: Attack Map

### What You'll See:

```
┌─────────────────────────────────────────┐
│  🌍 Live Attack Origins                 │
├─────────────────────────────────────────┤
│                                         │
│     [Interactive World Map]             │
│     Pins on Russia, China, USA, etc.    │
│                                         │
│  📊 Top Attack Sources:                 │
│  ┌─────────────────────────────────┐   │
│  │ 🥇 🇷🇺 Russia - 47 attacks      │   │
│  │ 🥈 🇨🇳 China - 23 attacks       │   │
│  │ 🥉 🇺🇸 USA - 12 attacks         │   │
│  │ 4️⃣ 🇳🇱 Netherlands - 8          │   │
│  │ 5️⃣ 🇬🇧 UK - 6                   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Filter by Country ▼]                  │
└─────────────────────────────────────────┘
```

### Location:
- **Tab:** New "Attack Map" tab in navigation
- **API:** `GET /api/attack-map`
- **Updates:** Real-time via WebSocket

---

## 🤖 FEATURE 2: Playbook Automation

### What You'll See:

```
┌─────────────────────────────────────────┐
│  📋 Execute Investigation Playbook      │
├─────────────────────────────────────────┤
│  Alert: alert_042 - Ransomware          │
│                                         │
│  Select Playbook:                       │
│  ◉ Malware Response (Recommended)       │
│  ○ Data Exfiltration Response           │
│  ○ Generic Investigation                │
│                                         │
│  [Execute Playbook]                     │
├─────────────────────────────────────────┤
│  Progress: ████████░░ 80%               │
│                                         │
│  ✅ Isolate host (2s)                   │
│  ✅ Block IP at firewall (1s)           │
│  ✅ Notify security team (1s)           │
│  ✅ Collect memory dump (15s)           │
│  ⏳ Scan network (5/30s)                │
│  ⏸️  Generate report (pending)          │
│                                         │
│  Time Saved: 28 minutes                 │
│  [Pause] [Stop] [View Logs]             │
└─────────────────────────────────────────┘
```

### Available Playbooks:
1. **Malware Response** (6 steps, ~30s)
2. **Brute Force Mitigation** (5 steps, ~20s)
3. **Data Exfiltration Response** (8 steps, ~45s)
4. **Port Scan Investigation** (4 steps, ~15s)
5. **Phishing Response** (5 steps, ~25s)
6. **DDoS Mitigation** (6 steps, ~30s)

### Location:
- **Button:** "Run Playbook" in alert detail modal
- **API:** `POST /api/playbook/execute/{alert_id}`
- **Updates:** Real-time WebSocket progress

---

## 🔴 FEATURE 3: Live Alert Feed

### What You'll See:

```
┌─────────────────────────────────────────┐
│  🔴 LIVE ALERT FEED                     │
│  127 alerts today | 🟢 Connected        │
├─────────────────────────────────────────┤
│  ⚠️ NEW: Ransomware Detection           │
│  2s ago | Payment Server | CRITICAL     │
│  [Investigate →]                        │
├─────────────────────────────────────────┤
│  🔴 NEW: Brute Force Attempt            │
│  5s ago | VPN Gateway | HIGH            │
│  [Investigate →]                        │
├─────────────────────────────────────────┤
│  🟡 Port Scan Activity                  │
│  12s ago | Web Server | MEDIUM          │
│  [Investigate →]                        │
├─────────────────────────────────────────┤
│  🟢 Login Anomaly                       │
│  45s ago | HR System | LOW              │
│  [Investigate →]                        │
└─────────────────────────────────────────┘
```

### Features:
- **WebSocket connection** (reconnects automatically)
- **Real-time updates** without refresh
- **Desktop notifications** for critical alerts
- **Auto-scroll** to show latest alerts
- **Connection status** indicator

### Location:
- **Sidebar:** Right side of dashboard (collapsible)
- **Connection:** `ws://localhost:8000/ws`
- **Fallback:** Polls every 10s if WebSocket fails

---

## 🧪 Testing the Features:

### Test Attack Map:
1. Click new **"Attack Map"** tab
2. See world map with pins
3. Click Russia pin → filters to Russian IPs
4. See live updates as new alerts arrive

### Test Playbook:
1. Click any alert → "View" button
2. Scroll to bottom → "Run Playbook" button
3. Select playbook → Click "Execute"
4. Watch steps execute in real-time!
5. See "Time Saved: X minutes"

### Test Live Feed:
1. Feed appears on right side (or click "Live Feed" toggle)
2. See connection status: 🟢 Connected
3. Counter updates automatically
4. New alerts appear at top
5. Click alert → Opens detail modal

---

## 📊 Backend API Changes:

### New Endpoints:

```python
# WebSocket for live updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket)

# Attack map data
@app.get("/api/attack-map")
async def get_attack_map()

# Execute playbook
@app.post("/api/playbook/execute/{alert_id}")
async def execute_playbook(alert_id: str, playbook_name: str)

# Playbook status
@app.get("/api/playbook/status/{execution_id}")
async def get_playbook_status(execution_id: str)

# Simulate new alert (for testing)
@app.post("/api/alerts/simulate")
async def simulate_alert()
```

---

## 🎨 UI Updates:

### New Navigation Tab:
```
[Alerts] [Analytics] [Attack Map] [Team]
                        ↑ NEW!
```

### New Buttons:
- Alert detail: **"Run Playbook"** button
- Header: **"Live Feed"** toggle
- Attack map: Country filter dropdown

### New Components:
- `AttackMap.tsx` - Interactive world map
- `PlaybookRunner.tsx` - Automation modal
- `LiveFeed.tsx` - Real-time sidebar

---

## ⚙️ Configuration:

### Frontend `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### Backend (already configured):
- WebSocket endpoint: `/ws`
- CORS: Allows all origins (change for production)
- Alert simulation: Every 30s (for demo)

---

## 🔧 Troubleshooting:

### WebSocket not connecting:
```bash
# Check backend is running
curl http://localhost:8000/docs

# Check WebSocket endpoint
wscat -c ws://localhost:8000/ws
```

### Attack map not showing:
```bash
# Ensure dependencies installed
npm list react-simple-maps
npm install react-simple-maps d3-geo
```

### Playbook not executing:
```bash
# Check backend logs
# Look for "Playbook execution started"
```

---

## 📁 File Sizes:

- `backend/main.py` - ~1200 lines (enhanced)
- `frontend/app/page.tsx` - ~2400 lines (complete dashboard)
- `components/AttackMap.tsx` - ~250 lines
- `components/PlaybookRunner.tsx` - ~200 lines
- `components/LiveFeed.tsx` - ~180 lines

---

## 🎯 Quick Start (TL;DR):

```bash
# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt --break-system-packages
uvicorn main:app --reload

# Frontend (new terminal)
cd frontend
npm install socket.io-client react-simple-maps d3-geo
# Replace page.tsx with provided file
# Copy component files to app/components/
npm run dev
```

Visit: http://localhost:3000

---

## ✨ What Makes This Special:

**Compared to basic dashboards:**
- ❌ Static data → ✅ Real-time WebSocket updates
- ❌ Manual investigation → ✅ Automated playbooks
- ❌ Text lists → ✅ Interactive geo-visualization
- ❌ Refresh to update → ✅ Live feed with notifications

**Professional Features:**
- Real-time collaboration ready
- Production WebSocket handling
- Graceful fallbacks
- Mobile responsive
- Dark mode compatible

---

## 🚀 You're Ready!

Everything is included and ready to go. Just follow the installation steps and you'll have a production-grade SOC dashboard with enterprise features!

**Questions? Check the code comments - every feature is documented!**
=======
# SOC-Dashbaord
Security Operations Centre Dashboard by Ayesha 

