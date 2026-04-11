<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Three.js-0.160-000000?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-7.3-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Python-Flask-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/LoRa-IoT-FF6600?style=for-the-badge&logo=lora&logoColor=white" alt="LoRa" />
</p>

<h1 align="center">🚗 SmartDrive 3D</h1>

<p align="center">
  <b>AI-Powered Autonomous Vehicle Simulation with Real-Time Road Damage Detection & LoRa IoT Communication</b>
</p>

<p align="center">
  An immersive 3D vehicle simulation platform that combines <b>real-time road hazard detection</b>, <b>lane departure warnings</b>, and <b>LoRa-based IoT alerts</b> — all rendered in a browser-based 3D environment with dynamic procedurally-generated worlds.
</p>

---

## 🌟 Overview

**SmartDrive 3D** is a full-stack simulation platform designed to demonstrate intelligent vehicle systems in a realistic 3D environment. The project simulates how an autonomous vehicle would detect and respond to road hazards (potholes, debris, rocks, fallen trees) in real time, while broadcasting safety alerts over a LoRa IoT network.

The simulation features three distinct driving environments — **City**, **Village**, and **Jungle** — each with unique terrain, obstacles, and visual characteristics. A cinematic HUD overlay provides real-time telemetry, AI detection overlays, and environment controls.

---

## ✨ Key Features

### 🎮 3D Vehicle Simulation
- **Realistic vehicle physics** — acceleration, braking, steering, collision detection
- **Detailed car model** — metallic body, headlights, taillights, brake lights, side mirrors, DRL strips, exhaust tips
- **Interactive wheel animation** — rotating wheels with visible front-wheel steering response
- **First-person (FPV) & Third-person (TPV)** camera modes with smooth transitions
- **Cockpit interior** — detailed dashboard visible in first-person view

### 🌍 Dynamic Environments
| Environment | Description |
|---|---|
| 🏙️ **City** | High-rise buildings, traffic lights, parked vehicles, crosswalks, sidewalks, lane markings |
| 🏘️ **Village** | Rural houses with chimneys, wooden fences, scattered trees, grass patches |
| 🌿 **Jungle** | Dense tropical canopy, undergrowth bushes, moss-covered rocks, fallen trees |

- **Infinite procedural world generation** — chunk-based system with seeded randomization for consistent terrain
- **Day/Night cycle** — full lighting transitions with emissive building windows at night
- **Dynamic headlights** — spotlight-based headlights with realistic cone illumination

### 🤖 AI Detection Systems
- **Pothole Detection** — identifies potholes on the road surface with confidence scoring and depth-zone classification (`far`, `mid`, `near`)
- **Lane Detection** — monitors lane position with real-time departure warnings (`left`/`right`)
- **Obstacle Recognition** — classifies multiple hazard types: potholes, debris, rocks, fallen trees
- **Visual Overlays** — screen-space bounding boxes projected from 3D world positions onto the HUD

### 📡 LoRa IoT Integration
- **Real-time alerts** — detected road damage is broadcast via UDP to LoRa-compatible devices
- **Flask API gateway** — REST endpoint receives detection payloads and forwards them to the LoRa network
- **Multi-detection support** — handles both single-alert and batch detection payloads
- **Simulated LoRa sender** — standalone Python script for testing IoT data flow with sensor telemetry

### 🖥️ Premium HUD Interface
- **Glassmorphism design** — frosted-glass panels with cyan glow accents
- **Real-time speedometer** — color-coded speed display (green → amber → red) with progress bar
- **Collision warnings** — pulsing alert indicators on impact
- **Detection panel** — live feed of AI-detected hazards with severity classification
- **Keyboard controls reference** — integrated keycap-styled control guide

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Frontend)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Three.js /   │  │  Zustand     │  │  HUD / Overlays   │  │
│  │  R3F Canvas   │  │  State Mgmt  │  │  (React UI)       │  │
│  │  ─ Vehicle    │  │  ─ Simulation│  │  ─ Speedometer    │  │
│  │  ─ World      │◄─┤  ─ Pothole   │──┤  ─ Detection      │  │
│  │  ─ Camera     │  │  ─ Lane      │  │  ─ Controls       │  │
│  │  ─ Lighting   │  │  ─ Shared    │  │  ─ Lane Overlay   │  │
│  └──────┬───────┘  └──────────────┘  └───────────────────┘  │
│         │                                                    │
│         │  HTTP POST /api/road-damage                        │
└─────────┼────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Python Flask)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  REST API     │  │  Alert       │  │  UDP Broadcast    │  │
│  │  /api/road-   │──│  Formatter   │──│  (LoRa Gateway)   │  │
│  │   damage      │  │              │  │  Port 5005        │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | Component-based UI framework |
| **TypeScript** | Type-safe development |
| **Three.js + R3F** | 3D rendering engine with React bindings |
| **@react-three/drei** | Utility helpers for R3F (camera, lighting) |
| **Zustand** | Lightweight state management (zero re-render overhead for frame data) |
| **Tailwind CSS** | Utility-first styling with custom simulation theme |
| **shadcn/ui** | Pre-built accessible UI components |
| **Recharts** | Data visualization |
| **Vite** | Next-gen build tool with HMR |
| **Vitest** | Unit testing framework |

### Backend
| Technology | Purpose |
|---|---|
| **Python 3 / Flask** | REST API server |
| **Flask-CORS** | Cross-origin request handling |
| **Socket (UDP)** | LoRa UDP broadcast communication |

---

## 📂 Project Structure

```
SmartDrive-3D/
├── src/
│   ├── components/
│   │   ├── simulation/
│   │   │   ├── SimulationCanvas.tsx    # Main 3D canvas (Three.js R3F)
│   │   │   ├── Vehicle.tsx            # Car model, physics, headlights
│   │   │   ├── World.tsx              # Procedural world generation
│   │   │   ├── HUD.tsx                # Heads-up display overlay
│   │   │   ├── CameraController.tsx   # Third/first-person camera logic
│   │   │   ├── CockpitInterior.tsx    # First-person cockpit dashboard
│   │   │   ├── SkyAndLighting.tsx     # Day/night sky and ambient light
│   │   │   ├── PotholeDetector.tsx    # AI pothole detection system
│   │   │   ├── PotholeOverlay.tsx     # Screen-space pothole markers
│   │   │   ├── LaneDetector.tsx       # AI lane departure detection
│   │   │   ├── LaneOverlay.tsx        # Lane boundary visualization
│   │   │   └── DetectionPanel.tsx     # AI alert feed panel
│   │   ├── ui/                        # shadcn/ui component library (49 components)
│   │   └── NavLink.tsx                # Navigation link component
│   ├── stores/
│   │   ├── simulationStore.ts         # Core simulation state + frame data
│   │   ├── potholeDetectionStore.ts   # Pothole detection state
│   │   ├── laneDetectionStore.ts      # Lane detection state
│   │   └── sharedChunks.ts            # Shared chunk data between systems
│   ├── hooks/
│   │   ├── useKeyboard.ts             # Keyboard input handler
│   │   ├── use-mobile.tsx             # Mobile detection hook
│   │   └── use-toast.ts              # Toast notification hook
│   ├── utils/
│   │   └── loraService.ts            # LoRa API client + notifications
│   ├── pages/
│   │   ├── Index.tsx                  # Main simulation page
│   │   └── NotFound.tsx               # 404 page
│   ├── test/
│   │   ├── setup.ts                   # Test configuration
│   │   └── example.test.ts            # Example test case
│   ├── App.tsx                        # Root app with routing
│   ├── main.tsx                       # Entry point
│   └── index.css                      # Global styles + CSS variables
├── backend_gateway.py                 # Flask REST API + LoRa UDP gateway
├── lora_sender.py                     # Simulated LoRa sensor data sender
├── package.json                       # Node dependencies & scripts
├── vite.config.ts                     # Vite build configuration
├── tailwind.config.ts                 # Tailwind + custom theme tokens
├── tsconfig.json                      # TypeScript configuration
├── vitest.config.ts                   # Test runner configuration
└── README.md                          # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **Python** ≥ 3.8 (for the backend gateway)

### 1. Clone the Repository

```bash
git clone https://github.com/Rohan-14/SmartDrive-3D.git
cd SmartDrive-3D
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Start the Development Server

```bash
npm run dev
```

The simulation will be available at **`http://localhost:8080`**

### 4. Start the Backend Gateway (Optional)

In a separate terminal, start the Flask LoRa gateway:

```bash
pip install flask flask-cors
python backend_gateway.py
```

The API will be available at **`http://localhost:5050`**

### 5. Run the LoRa Sender Simulator (Optional)

To simulate IoT sensor data being broadcast:

```bash
python lora_sender.py
```

---

## 🎮 Controls

| Key | Action |
|---|---|
| `W` / `↑` | Accelerate |
| `S` / `↓` | Reverse |
| `A` / `D` | Steer Left / Right |
| `Space` | Brake |
| `L` | Toggle Headlights |
| `N` | Toggle Day / Night |
| `V` | Toggle Camera View (FPV ↔ TPV) |
| `D` | Toggle Pothole Detection |
| `G` | Toggle Lane Detection |

---

## 📡 API Reference

### POST `/api/road-damage`

Report detected road damage to the LoRa network.

**Request Body (Batch Detection):**
```json
{
  "mode": "city",
  "speed": 65,
  "detections": [
    {
      "type": "pothole",
      "distance": 25.3,
      "confidence": 0.87,
      "worldPosition": [2.1, 0.0, -45.6]
    }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "message": "1 road damage(s) detected and reported via LoRa",
  "detections": [...],
  "timestamp": "2026-04-11T22:30:00.000Z"
}
```

### GET `/api/health`

Health check endpoint.

```json
{
  "status": "online",
  "service": "LoRa Gateway + Road Damage Detection"
}
```

---

## 🧪 Testing

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch
```

---

## 📦 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run build:dev` | Build in development mode |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |

---

## 🔧 Configuration

### Environment Modes

The simulation supports three dynamically switchable environments, each with unique:

- **Road surface** — asphalt (city), dirt (village), jungle path
- **Road width** — 10m (city), 6m (village), 7m (jungle)
- **Scenery density** — buildings, houses, or dense forest canopy
- **Hazard types** — urban debris, rural rocks, jungle fallen trees
- **Lane markings** — full markings (city), minimal (village/jungle)

### Detection Zones

The pothole detection system classifies hazards by distance:

| Zone | Range | Color |
|---|---|---|
| 🔴 **Near** | < 20m | Red — immediate danger |
| 🟡 **Mid** | 20–40m | Amber — approaching hazard |
| 🟢 **Far** | 40–55m | Green — early warning |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is developed as part of an academic research initiative. All rights reserved.

---

<p align="center">
  Built with ❤️ using React, Three.js, and Python
</p>