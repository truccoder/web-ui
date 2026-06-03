const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { ExpressPeerServer } = require('peer');
const express = require('express');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const rooms = new Map();

app.prepare().then(() => {
  const expressApp = express();
  const server = createServer(expressApp);

  const peerServer = ExpressPeerServer(server, {
    path: '/',
    allow_discovery: true,
  });

  expressApp.use('/peerjs', peerServer);

  expressApp.post('/api/rooms', express.json(), (req, res) => {
    const { code, peerId } = req.body;
    if (!rooms.has(code)) {
      rooms.set(code, { peers: [] });
    }
    const room = rooms.get(code);
    if (!room.peers.includes(peerId)) {
      room.peers.push(peerId);
    }
    res.json({ peers: room.peers });
  });

  expressApp.get('/api/rooms/:code', (req, res) => {
    const room = rooms.get(req.params.code);
    if (!room) {
      return res.json({ peers: [] });
    }
    res.json({ peers: room.peers });
  });

  expressApp.delete('/api/rooms/:code/peers/:peerId', (req, res) => {
    const room = rooms.get(req.params.code);
    if (room) {
      room.peers = room.peers.filter((p) => p !== req.params.peerId);
      if (room.peers.length === 0) {
        rooms.delete(req.params.code);
      }
    }
    res.json({ ok: true });
  });

  expressApp.use((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  peerServer.on('connection', (client) => {
    console.log(`[PeerJS] Peer connected: ${client.getId()}`);
  });

  peerServer.on('disconnect', (client) => {
    console.log(`[PeerJS] Peer disconnected: ${client.getId()}`);
    for (const [code, room] of rooms.entries()) {
      room.peers = room.peers.filter((p) => p !== client.getId());
      if (room.peers.length === 0) {
        rooms.delete(code);
      }
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> Server ready on http://${hostname}:${port}`);
    console.log(`> PeerJS signaling at /peerjs`);
    console.log(`> Bind: 0.0.0.0 (accessible on LAN)`);
  });
});
