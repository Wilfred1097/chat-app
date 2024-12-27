const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const messagesFile = 'messages.json';

// Serve static files from the "public" directory
app.use(express.static('public'));

// Load messages from the JSON file
let messages = [];
if (fs.existsSync(messagesFile)) {
    messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
}

let activeUsers = new Set();

// WebSocket connection
wss.on('connection', (ws) => {
    console.log('New connection');

    // Listen for username messages
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'username') {
            if (activeUsers.has(data.username)) {
                ws.send(JSON.stringify({ type: 'username-taken' }));
            } else {
                activeUsers.add(data.username);
                ws.send(JSON.stringify({ type: 'username-accepted', username: data.username }));
                ws.username = data.username;
                console.log('Username accepted:', data.username);
            }
        } else if (data.type === 'message') {
            const msg = {
                user: data.username,
                text: data.text,
                timestamp: new Date().toISOString()
            };
            messages.push(msg);

            // Save messages to the JSON file
            fs.writeFileSync(messagesFile, JSON.stringify(messages));

            // Broadcast the message to all clients
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify([msg]));
                }
            });
        }
    });

    // Remove username from activeUsers when the client disconnects
    ws.on('close', () => {
        if (ws.username) {
            activeUsers.delete(ws.username);
            console.log('Connection closed, username removed:', ws.username);
        }
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});