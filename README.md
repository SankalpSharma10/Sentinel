# First15 & ParkGuard 🚦

**First15** and **ParkGuard** are next-generation smart city and traffic management applications designed to radically reduce urban congestion, streamline emergency response, and intelligently manage civic infrastructure using AI-driven insights.

## Overview

- **First15 (Incident Commander):** A real-time triage and rapid response dashboard that analyzes active incidents (accidents, potholes, vehicle breakdowns, etc.) across the city. It leverages historical data matching and XGBoost predictive models to provide precise mitigation playbooks within the "first 15 minutes" of an incident, minimizing cascading traffic shocks.
- **ParkGuard:** A proactive civic infrastructure monitoring tool that analyzes traffic violations, illegal parking hotspots, and IoT device reliability across the city grid, empowering civic bodies to deploy resources efficiently.

Both systems are seamlessly integrated into a single, high-performance monorepo utilizing an advanced stack.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Framer Motion (for dynamic UI animations), Mappls/Mapbox GL JS (for geospatial rendering).
- **Backend:** FastAPI (Python), Uvicorn.
- **Machine Learning / Data:** XGBoost, Scikit-learn, Pandas, DuckDB (in-memory analytical database for lightning-fast querying).

---

## 🚀 One-Click Deployment

This repository is pre-configured with Infrastructure-as-Code for a zero-configuration cloud deployment.

### Frontend (Vercel)
The Next.js frontend is fully compatible with Vercel. 
1. Import the repository into your Vercel Dashboard.
2. Ensure you specify the Root Directory as `frontend` if deploying separately, or deploy the root and set the Build Command to `npm run build --prefix frontend`.
3. Set the `NEXT_PUBLIC_API_URL` environment variable to point to your hosted backend.

### Backend (Render / Railway / Docker)
The backend is packaged with a `Dockerfile.backend` and a `render.yaml` blueprint.
1. Push this repository to GitHub.
2. In [Render](https://render.com), select **New > Blueprint** and connect the repository.
3. Render will automatically provision the environment, install the ML pipelines, and start the FastAPI server.

---

## 💻 Local Development

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### Start the Backend
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to access the First15 Dashboard.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
