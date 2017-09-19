/* eslint-disable no-console */
// import SChess from "schess.js";
const SChess = require("schess.js").SChess;

// const gameState = new SChess();

const seekers = [];

const rooms = [];

const sockets = {};

let nextRoomid = 0;

const handleConnect = (io, socket) => {
	console.log("A client just joined on", socket.id);
};

const handleMove = (io, socket, move) => {
	console.log("got move:", move);
	const game = sockets[socket.id].game;
	game.move(move);
	socket.broadcast.emit("opponentMove", move);
	const roomName = sockets[socket.id].id.toString();
	if (game.in_checkmate()) {
		if (game.turn() === "b") io.in(roomName).emit("whiteWinsMate");
		else io.in(roomName).emit("blackWinsMate");
		sockets[socket.id].inPlay = false;
	}
};

const handleDisconnect = (io, socket) => {};

const handleNewSeek = (io, socket) => {
	if (seekers.length > 0) {
		const players =
			Math.random() > 0.5
				? [socket, seekers.pop()]
				: [seekers.pop(), socket];
		const white = players[0];
		const black = players[1];
		const newRoom = {
			id: nextRoomid++,
			white,
			black,
			players,
			game: new SChess(),
			inPlay: true
		};
		rooms.push(newRoom);
		sockets[white.id] = newRoom;
		sockets[black.id] = newRoom;
		const roomName = newRoom.id.toString();
		white.join(roomName);
		black.join(roomName);
		io.in(roomName).emit("seekAccepted");
		white.emit("setColor", "white");
		black.emit("setColor", "black");
		io.in(roomName).emit("startGame");
	} else {
		seekers.push(socket);
	}
};

const handleResign = (io, socket) => {
	const room = sockets[socket.id];
	const roomName = room.id.toString();
	if (socket.id === room.white.id) {
		io.in(roomName).emit("whiteResigned");
	} else if (socket.id === room.black.id) {
		io.in(roomName).emit("blackResigned");
	}
	room.inPlay = false;
};

module.exports.socketServer = io => {
	io.on("connection", socket => {
		handleConnect(io, socket);

		socket.on("move", move => {
			handleMove(io, socket, move);
		});

		socket.on("disconnect", () => {
			handleDisconnect(io, socket);
		});

		socket.on("newSeek", () => {
			handleNewSeek(io, socket);
		});

		socket.on("resign", () => {
			handleResign(io, socket);
		});
	});
};
