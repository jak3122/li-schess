const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');

const app = express();
const server = http.Server(app);
const io = socketio(server);
require('./sockets/sockets').socketServer(io);

server.listen(8080, () => console.log('listening on *:8080'));

console.log(path.join(__dirname, '../dist/index.html'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.use('/static', express.static(path.join(__dirname, '../dist/static')));
