# 🌐 GNS3 Auto-Config DHCP Portal

![Next.js](https://img.shields.io/badge/Next.js-15.3-black?style=flat-square&logo=nextdotjs)
![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.x-3776AB?style=flat-square&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-2.x-000000?style=flat-square&logo=flask)
![GNS3](https://img.shields.io/badge/GNS3-Network_Emulation-FF6B35?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

> An automated network provisioning portal that bridges modern web paradigms with low-level network engineering — translating UI-driven DHCP parameter inputs into direct CLI execution over SSH onto emulated Cisco infrastructure.

---

## 📖 Overview

The **GNS3 Auto-Config DHCP Portal** is a full-stack network automation tool built for IT engineers and students who need to rapidly provision DHCP services on Cisco and Linux devices without manual CLI intervention.

The system follows a clean **3-Tier Automation Architecture**:

```
[React Frontend] ──POST JSON──▶ [Flask REST API] ──SSH/Paramiko──▶ [GNS3 / Cisco IOS]
  UI Form Input                  Config Generation                   CLI Execution
```

Instead of manually SSH-ing into each router and typing IOS commands, a network engineer fills out a web form — and the stack handles the rest, end-to-end.

---

## 🛠️ Technical Stack

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript | UI, state management, JSON payload dispatch |
| **Styling** | CSS Modules, Lucide-React | Component-scoped styles, iconography |
| **Backend** | Python 3, Flask, Flask-CORS | RESTful API server, config logic |
| **SSH Automation** | Paramiko | Programmatic SSH session management |
| **IP Validation** | `ipaddress` (stdlib) | IPv4/IPv6 integrity enforcement |
| **Network Emulation** | GNS3, Dynamips, Cisco IOS | Virtual router/switch topology |
| **Virtual Endpoints** | VPCS | Simulated client nodes for lease validation |

---

## ✨ Key Features

- **Form-to-Infrastructure Pipeline** — Input subnet masks, default gateways, IP ranges, lease durations, and static MAC-to-IP mappings through a clean dashboard; the system translates these directly into IOS/Linux CLI commands.
- **REST-to-SSH Execution** — A custom Paramiko scripting layer opens secure socket connections and sequentially pipes CLI commands into the router's Non-Volatile RAM (NVRAM) without any manual intervention.
- **Dual-Target Config Generation** — Supports both **Cisco IOS** (`ip dhcp pool`, `network`, `default-router`) and **Linux** (`isc-dhcp-server`) configuration formats from the same interface.
- **Native IPv4 Validation** — Backend enforces address integrity using Python's `ipaddress` module, catching out-of-bound ranges, subnet conflicts, and gateway mismatches before any SSH session is opened.
- **GNS3 Virtual Testbed Bridging** — The topology uses a **Cloud node** to bridge the GNS3 virtual network to the host machine's physical adapter, enabling real SSH sessions over localhost to the emulated router.
- **Live DHCP Lease Validation** — VPCS nodes in the topology dynamically check out IP leases from the configured pool, confirming end-to-end provisioning success.
- **Config Rollback Support** — A dedicated `/api/remove-dhcp` endpoint allows clean teardown of DHCP pools from target devices.

---

## 🧠 Implementation Details

### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/validate` | `POST` | Validates IP parameters before config generation |
| `/api/generate-config` | `POST` | Generates device-specific CLI configuration string |
| `/api/apply-config` | `POST` | Opens SSH session via Paramiko and injects config |
| `/api/remove-dhcp` | `POST` | Tears down DHCP pool configuration on target device |

### IoT/Networking Engineering Highlights

- **SSH Session Management** — Paramiko establishes stateful socket-based connections; the backend sends sequenced CLI commands and reads back router stdout to verify execution success.
- **Protocol-Level IP Handling** — Uses Python's `ipaddress.IPv4Network` and `IPv4Address` classes for strict protocol-compliant validation — not regex hacks.
- **Cross-Environment Network Bridging** — GNS3's Cloud node maps the emulated router's interface to a host `tap`/`bridge` adapter, enabling the Flask backend to reach the router over a real TCP/IP stack.
- **Separation of Concerns** — The React frontend communicates exclusively via REST — it has zero knowledge of the underlying SSH or IOS logic. The Flask backend is fully stateless between requests.
- **Config Templating** — IOS CLI strings are assembled programmatically in Python using f-strings and validated against device-type flags (`cisco` vs `linux`) before dispatch.

### GNS3 Topology

```
[Cloud Node / Host Bridge]
        │
   [Ethernet Switch]
   /    |    \
[R1]  [PC1] [PC2]
Cisco  VPCS  VPCS
IOS
```

- **R1** — Dynamips-emulated Cisco router running DHCP server
- **Cloud** — Bridges virtual topology to host network for SSH access
- **PC1 / PC2** — VPCS nodes acting as DHCP clients for lease validation

---

## 📊 Project Complexity & Scale

| Metric | Detail |
|---|---|
| **Architecture** | 3-tier: Presentation → Logic → Emulation |
| **Languages** | TypeScript, Python, Cisco IOS CLI |
| **API surface** | 4 REST endpoints with full validation chain |
| **Protocols** | HTTP/REST, SSH (TCP/22), DHCP (UDP/67-68), IPv4 |
| **Disciplines** | Full-stack web, network automation, SDN concepts, Linux networking |
| **Config targets** | Cisco IOS + Linux (dual-format generation) |

This project is **non-trivial** for the following reasons:

1. It crosses **three independent runtime environments** (browser, Python process, GNS3 hypervisor) that must be co-ordinated.
2. It requires **network-level understanding** to configure the Cloud bridge, assign correct IPs to the router's interface, and enable SSH on IOS — all prerequisites before the automation layer can function.
3. It implements a **real SSH automation pipeline**, not a mock — Paramiko opens actual TCP sockets to the emulated router's management IP.

---

## 🐧 Setup Instructions (Arch Linux)

### Prerequisites

```bash
# Install system dependencies
sudo pacman -S python python-pip nodejs npm gns3-server gns3-gui dynamips vpcs
```

> **Note:** GNS3 may also be available via the AUR: `yay -S gns3-gui gns3-server`

---

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/gns3-dhcp-portal.git
cd gns3-dhcp-portal
```

---

### 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the Flask API server
python app.py
```

The API will be available at `http://localhost:5000`.

---

### 3. Frontend Setup

```bash
# In a new terminal, from the repo root
cd dhcp-config-app

npm install
npm run dev
```

The UI will be available at `http://localhost:3000`.

---

### 4. GNS3 Topology Setup

```bash
# Start the GNS3 server (if not using the GUI launcher)
gns3server
```

Then, in the **GNS3 GUI**:

1. Open `MiniProjet.gns3` via **File → Open Project**.
2. Start all nodes (R1, Switch, PC1, PC2, Cloud).
3. On **R1**, ensure SSH is configured:
   ```
   R1# conf t
   R1(config)# ip domain-name lab.local
   R1(config)# crypto key generate rsa modulus 1024
   R1(config)# username admin privilege 15 secret admin
   R1(config)# line vty 0 4
   R1(config-line)# login local
   R1(config-line)# transport input ssh
   ```
4. Verify that R1's management IP matches the target IP configured in the frontend form.

---

### 5. Network Bridge (Cloud Node)

The Cloud node must be bound to a host network adapter that shares a subnet with R1's management interface. On Arch Linux, you may need to create a TAP interface:

```bash
# Create a tap interface for GNS3
sudo ip tuntap add dev tap0 mode tap
sudo ip addr add 192.168.122.1/24 dev tap0
sudo ip link set tap0 up
```

Then bind the GNS3 Cloud node to `tap0` in the GNS3 GUI.

---

## 📁 Repository Structure

```
gns3-dhcp-portal/
├── backend/
│   ├── app.py               # Flask API server (REST endpoints + Paramiko SSH)
│   └── requirements.txt     # Python dependencies
├── dhcp-config-app/
│   ├── app/
│   │   ├── page.tsx         # Main React component (form + state + API calls)
│   │   ├── globals.css      # Global styles
│   │   ├── page.module.css  # Scoped component styles
│   │   └── styles/
│   │       └── dhcp.css     # DHCP-specific UI styles
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
├── MiniProjet/
│   ├── MiniProjet.gns3      # GNS3 topology definition (JSON)
│   └── project-files/
│       ├── dynamips/
│       │   └── configs/     # Router startup configurations (.cfg)
│       └── vpcs/
│           └── startup.vpc  # VPCS client startup configs
└── README.md
```

> **Note:** `project-files/captures/*.pcap` and `dynamips/*_log.txt` files are excluded from version control (add to `.gitignore`).

---

## 📄 .gitignore Recommendations

```gitignore
# Python
venv/
__pycache__/
*.pyc
*.pyo

# Node
node_modules/
.next/
*.log

# GNS3 artifacts
project-files/captures/*.pcap
project-files/dynamips/*_log.txt
project-files/dynamips/*_stdout.txt

# Environment
.env
.env.local
```

---
