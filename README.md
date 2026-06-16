# P2P Web Share & Chat

A high-performance, secure, browser-to-browser file sharing and real-time chat application built with React, WebRTC, and Node.js. By utilizing direct data channels, both files and text messages are transferred directly between peers without ever hitting a cloud storage server.

---

## Features

* **True Peer-to-Peer:** Direct browser-to-browser data transfer using WebRTC `RTCDataChannel`.
* **End-to-End Encrypted Chat:** Send secure instant text messages natively over the same WebRTC connection, bypassing the signaling server completely.
* **Infinite Session Sharing:** Send multiple files sequentially without breaking or resetting the room connection.
* **Memory Safe Processing:** Files are processed in sequential 16KB binary chunks with automated backpressure handling to prevent browser tab crashes.
* **Modern UI:** Styled with a sleek, responsive dark-mode dashboard using Tailwind CSS v4.

---

## Architecture & Tech Stack

This application is built as a full-stack decoupled architecture:

* **Frontend:** React (Vite), Tailwind CSS v4, Socket.io-client
* **Backend (Signaling):** Node.js, Express, Socket.io

WebSockets are utilized solely as a "matchmaker" to introduce the two browsers. Once the WebRTC handshake completes, the signaling server steps away. Both chat messages and file payloads stream entirely over a secure, point-to-point pipeline.

---

## Local Installation & Setup

To run this application locally, you need to clone the repository and run **both the backend and frontend at the same time using two separate terminal windows.**

### 1. Clone the Repository
Open a terminal and run:
```bash
git clone [https://github.com/vxd-aryan/p2p-web-share.git](https://github.com/vxd-aryan/p2p-web-share.git)
cd p2p-web-share

2. Start the Backend Server (Terminal 1)
cd backend 
npm install
node server.js

3. Start the Frontend Application (Terminal 2)
cd p2p-file-share
npm install
npm run dev

**How To Use**
Open http://localhost:5173 in two separate browser windows (or separate devices on the same local network).

On Browser 1, click Create Room to generate a unique Room ID.

On Browser 2, paste that Room ID into the input field and click Join.

Once connected, use the Direct P2P Chat box at the bottom to send instant, encrypted messages.

To share a file, choose a file on the Sender screen and click Transmit.

When the transfer hits 100%, the Receiver's browser automatically saves the file.

Click Send Another File to share more data without losing your chat session!
