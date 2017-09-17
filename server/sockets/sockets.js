/* eslint-disable no-console */
// import SChess from 'schess.js';

// const gameState = new SChess();

const players = {};

module.exports.socketServer = (io) => {
  io.on('connection', (socket) => {
    console.log('A client just joined on', socket.id);
    if (players.white) {
      socket.emit('setPlayer', 'white');
    }
    if (players.black) {
      socket.emit('setPlayer', 'black');
    }

    socket.on('play', (color) => {
      console.log('adding player', color);
      socket.join('playing');
      players[color] = socket;
      io.emit('setPlayer', color);
      if (players.white && players.black) {
        console.log('starting game');
        io.emit('startGame');
      }
    });

    socket.on('move', (move) => {
      console.log('got move:', move);
      socket.broadcast.emit('opponentMove', move);
    });

    socket.on('disconnect', () => {
      if (players.white && players.white.id === socket.id) {
        players.white = undefined;
        io.emit('unsetPlayer', 'white');
      } else if (players.black && players.black.id === socket.id) {
        players.black = undefined;
        io.emit('unsetPlayer', 'black');
      }
    });
  });
};
