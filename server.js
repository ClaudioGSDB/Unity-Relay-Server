// server.js - For Render.com or similar hosting
const WebSocket = require("ws");
const http = require("http");

// Create HTTP server
const server = http.createServer((req, res) => {
	res.writeHead(200, { "Content-Type": "text/plain" });
	res.end("Mirror WebSocket Relay Server\n");
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Maps to store clients
const clients = new Map();
let nextClientId = 0;

// WebSocket connection handler
wss.on("connection", (ws) => {
	// Assign ID to client
	const clientId = nextClientId++;
	console.log(`Client ${clientId} connected`);

	// Store client
	clients.set(clientId, ws);

	// Send welcome message with ID
	ws.send(
		JSON.stringify({
			type: "connection",
			id: clientId,
			message: "Connected to relay server",
		})
	);

	// Broadcast connection status
	broadcastStatus();

	// Handle messages
	ws.on("message", (message) => {
		try {
			// Try to parse as JSON to check for targeted messages
			const data = JSON.parse(message.toString());

			if (data.target !== undefined) {
				// Send to specific client
				const targetWs = clients.get(data.target);
				if (targetWs && targetWs.readyState === WebSocket.OPEN) {
					data.from = clientId;
					targetWs.send(JSON.stringify(data));
				}
			} else {
				// Broadcast to all except sender
				broadcast(message.toString(), clientId);
			}
		} catch (e) {
			// If not valid JSON, broadcast raw message
			broadcast(message.toString(), clientId);
		}
	});

	// Handle disconnection
	ws.on("close", () => {
		console.log(`Client ${clientId} disconnected`);
		clients.delete(clientId);
		broadcastStatus();
	});
});

// Broadcast message to all clients except sender
function broadcast(message, senderId) {
	clients.forEach((client, id) => {
		if (id !== senderId && client.readyState === WebSocket.OPEN) {
			client.send(message);
		}
	});
}

// Broadcast status update
function broadcastStatus() {
	const status = {
		type: "status",
		clients: clients.size,
		timestamp: Date.now(),
	};

	const statusMsg = JSON.stringify(status);
	clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(statusMsg);
		}
	});
}

// Start server
const PORT = process.env.PORT || 7778;
server.listen(PORT, () => {
	console.log(`WebSocket server listening on port ${PORT}`);
});
