# Hosting Jyldam Locally

## Requirements
- Node.js (v18+)
- npm (v9+)
- A modern webcam 

## 1. Start the Backend Server
Navigate to the `server` directory and start the Express & Socket.io server:
```bash
cd server
npm install
npm run dev
```
The backend will run on `http://localhost:4000`.

## 2. Start the Frontend Client
Open a **new terminal window**, navigate to the `client` directory, and start the Vite server:
```bash
cd client
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`.

## 3. Experience the Live Demo
Open the following links in separate tabs or on separate monitors to simulate the 4-node dispatch system:
- **Central Command:** `http://localhost:5173/operator`
- **AI Camera Node:** `http://localhost:5173/camera`
- **112 Dispatch:** `http://localhost:5173/112`
- **Volunteer Interface:** `http://localhost:5173/volunteer`
