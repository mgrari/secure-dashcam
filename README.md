# SecureDashcam

A privacy-first dashcam web application with end-to-end encryption. Video is encrypted in the browser before it ever leaves your device — the server stores only ciphertext and never has access to your keys or footage.

---

## Features

- **End-to-end encrypted video streaming** — video chunks are AES-encrypted client-side every 500ms and streamed to the backend
- **RSA key pair per user** — generated in the browser at registration; the private key never leaves the client
- **HMAC integrity checks** — all stored user data (email, name, organization) is integrity-verified on retrieval
- **TOTP two-factor authentication** — login requires a one-time code from Google Authenticator or any TOTP app
- **Video sharing** — regular users can share their encrypted videos with trusted users by re-encrypting the symmetric key with the recipient's public key
- **Two user roles** — regular users (record & view) and trusted users (can receive shared videos)
- **Full HTTPS** — both frontend and backend run over TLS with a custom certificate chain (Root CA → Intermediate CA → Server)
- **Dockerized** — the entire stack spins up with a single command

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Cryptography | Web Crypto API (AES-GCM, RSA-OAEP, HMAC-SHA256) |
| Auth | JWT + TOTP (speakeasy) |
| Infrastructure | Docker, Docker Compose |

---

## Security Model

### Key generation (at registration)
1. An RSA-4096 key pair is generated in the browser
2. Two AES-256 symmetric keys are generated: one for profile data, one for videos
3. Two HMAC keys are generated for integrity verification
4. Each symmetric/HMAC key is encrypted with the user's RSA public key and signed with their RSA private key
5. Only the encrypted keys and the public key are sent to the server — the private key stays in the browser

### Video encryption (during recording)
- The browser captures video in 500ms chunks via the MediaRecorder API
- Each chunk is encrypted with AES-GCM using the user's video symmetric key before being sent
- The server stores only the encrypted blobs — it cannot decrypt them

### Data integrity
- Every sensitive profile field (email, fullname, organization, country) is HMAC-signed
- On retrieval, signatures are verified before decryption — any server-side tampering is detected

### Video sharing
- When sharing with a trusted user, the video symmetric key is re-encrypted with the recipient's RSA public key
- The recipient decrypts it with their own private key — no plaintext key is ever transmitted

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose v2.20.2+
- Make sure no local MongoDB instance is running on port 27017:
  ```bash
  sudo systemctl stop mongod
  ```

---

## Quick Start (Docker)

```bash
git clone https://github.com/mgrari/secure-dashcam.git
cd secure-dashcam
sudo ./run_docker.sh
```

Once running:
- **Frontend:** https://localhost:3000
- **Backend:** https://localhost:8080

> The app uses a self-signed certificate chain. You will need to accept the browser security warning on first visit.

---

## Manual Installation

### 1. MongoDB

Install MongoDB and create an admin user:
```bash
sudo ./setUpAdminMongo.sh
```

### 2. Backend

```bash
cd nodeBackend
npm install
npm run dev
```

Runs on https://localhost:8080

### 3. Frontend

```bash
cd nextfrontend
npm install
npm run dev
```

Runs on https://localhost:3000

---

## Project Structure

```
secure-dashcam/
├── nextfrontend/          # Next.js frontend
│   ├── app/               # Pages (App Router)
│   │   ├── dashcam/       # Live recording page
│   │   ├── home/          # Regular user dashboard
│   │   ├── hometrusted/   # Trusted user dashboard
│   │   ├── videos/        # Video playback
│   │   ├── users/         # Share access with trusted users
│   │   ├── register/      # Registration
│   │   └── login/         # Login
│   ├── crypto/            # Client-side crypto utilities
│   │   ├── handlers.js    # High-level crypto flows
│   │   ├── rsaUtils.js    # RSA key generation, encryption, signing
│   │   └── symKeyUtils.js # AES & HMAC operations
│   └── components/        # UI components
├── nodeBackend/           # Express backend
│   ├── controllers/       # Route handlers
│   ├── middleware/        # JWT validation
│   ├── models/            # Mongoose schemas
│   ├── routes/            # API routes
│   ├── logging/           # Logger setup
│   └── certificates/      # TLS certificate chain
└── docker-compose.yml
```

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/user/register` | Register a new user |
| POST | `/api/user/login` | Login with TOTP code |
| GET | `/api/user/current` | Get current user info |
| POST | `/stream` | Upload an encrypted video chunk |
| GET | `/getSymetric` | Retrieve user's encrypted symmetric key |
| GET | `/api/video/list` | List user's videos |
| GET | `/api/video/:name/:username/chunks` | Fetch encrypted chunks for a video |
| DELETE | `/api/video/:name` | Delete a video |
| GET | `/api/users/list` | List trusted users available to share with |
| POST | `/api/users/share` | Share videos with a trusted user |
| GET | `/api/video/trustedList` | List videos shared with the current trusted user |

---

## Monitoring & Logs

```bash
# Check running containers
docker ps

# View backend logs
docker logs nodeBackend

# View frontend logs
docker logs nextfrontend
```
