# Cero Assistant - Backend

[English](#english) | [Español](#español)

---

<a name="english"></a>
## 🇬🇧 English

**Cero** is an AI-powered executive assistant. This repository contains the **Backend** API, built with Node.js and Express, which serves as the bridge between the Frontend, ElevenLabs AI, and Google Services (Calendar & Tasks).

### 🛠️ Tech Stack
- **Runtime:** [Node.js](https://nodejs.org/)
- **Framework:** [Express](https://expressjs.com/)
- **Cloud Platform:** Google Cloud Platform (Cloud Run)
- **AI Integration:** Google Vertex AI / Gemini (for auxiliary intelligence)
- **Google Services:** Google Calendar API, Google Tasks API (via `googleapis`)
- **Authentication:** OAuth 2.0 (Google)

### ✨ Features
- **Tool Use API:** Endpoints specifically designed for AI agents (like ElevenLabs) to perform actions:
  - List calendar events.
  - Create new events.
  - Manage tasks.
- **Authentication:** Handles Google OAuth flow to securely access user data.
- **Dashboard Data:** Aggregates and serves data for the frontend dashboard.
- **Robust Error Handling:** Designed to fail gracefully and provide meaningful error messages to the AI agent.

### 🚀 Getting Started

#### Prerequisites
- Node.js (v18 or higher)
- A Google Cloud Project with Calendar and Tasks APIs enabled.
- Service Account or OAuth Client credentials.

#### Installation
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

#### Configuration
Create a `.env` file in the root directory with the following variables:
```env
PORT=8080
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
REDIRECT_URI=http://localhost:8080/api/auth/google/callback
# Add other specific keys as required
```

#### Running the Application
Start the server:
```bash
npm start
# or for development
npm run dev
```
The server will run on `http://localhost:8080` (or the defined PORT).

#### Deployment
This project is configured for deployment on **Google Cloud Run**.
- Ensure you have the `gcloud` CLI installed and authenticated.
- The `Dockerfile` is included for containerization.

---

<a name="español"></a>
## 🇪🇸 Español

**Cero** es un asistente ejecutivo impulsado por IA. Este repositorio contiene la API del **Backend**, construida con Node.js y Express, que sirve como puente entre el Frontend, la IA de ElevenLabs y los Servicios de Google (Calendar y Tasks).

### 🛠️ Tecnologías
- **Entorno:** [Node.js](https://nodejs.org/)
- **Framework:** [Express](https://expressjs.com/)
- **Plataforma Cloud:** Google Cloud Platform (Cloud Run)
- **Integración IA:** Google Vertex AI / Gemini (para inteligencia auxiliar)
- **Servicios de Google:** Google Calendar API, Google Tasks API (vía `googleapis`)
- **Autenticación:** OAuth 2.0 (Google)

### ✨ Características
- **API de Uso de Herramientas (Tool Use):** Endpoints diseñados específicamente para que agentes de IA (como ElevenLabs) realicen acciones:
  - Listar eventos del calendario.
  - Crear nuevos eventos.
  - Gestionar tareas.
- **Autenticación:** Maneja el flujo OAuth de Google para acceder de forma segura a los datos del usuario.
- **Datos del Dashboard:** Agrega y sirve datos para el panel de control del frontend.
- **Manejo Robusto de Errores:** Diseñado para fallar de manera controlada y proporcionar mensajes de error significativos al agente de IA.

### 🚀 Comenzando

#### Prerrequisitos
- Node.js (v18 o superior)
- Un proyecto de Google Cloud con las APIs de Calendar y Tasks habilitadas.
- Credenciales de Cuenta de Servicio o Cliente OAuth.

#### Instalación
1. Navega al directorio del backend:
   ```bash
   cd backend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   # o
   pnpm install
   ```

#### Configuración
Crea un archivo `.env` en el directorio raíz con las siguientes variables:
```env
PORT=8080
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
REDIRECT_URI=http://localhost:8080/api/auth/google/callback
# Agrega otras claves específicas según sea necesario
```

#### Ejecutar la Aplicación
Inicia el servidor:
```bash
npm start
# o para desarrollo
npm run dev
```
El servidor correrá en `http://localhost:8080` (o el PORT definido).

#### Despliegue
Este proyecto está configurado para su despliegue en **Google Cloud Run**.
- Asegúrate de tener la CLI de `gcloud` instalada y autenticada.
- Se incluye el `Dockerfile` para la contenerización.
