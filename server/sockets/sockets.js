/* eslint-disable no-console */
// import SChess from "schess.js";
const SChess = require("schess.js").SChess;

const seeks = [];

const rooms = [];

const sockets = {};

let nextRoomid = 0;

let numConnections = 0;

const printState = event => {
	console.log();
	console.log(
		event,
		"-".repeat(50 - event.length - 1),
		new Date().toLocaleString("en-US", {
			timeZone: "America/New_York",
			timeZoneName: "short"
		})
	);
	console.log(`# connections: ${numConnections}`);
	console.log(`# seeks: ${seeks.length}`);
	console.log(`# rooms: ${rooms.length}`);
	console.log("rooms:");
	rooms
		.map(r => {
			const wName = sockets[r.white.id].username;
			const bName = sockets[r.black.id].username;
			return `[${r.id}: ${wName}<${r.white.id}> vs ${bName}<${r.black
				.id}>, ${r.game.pgn()}, inPlay:${r.inPlay}]`;
		})
		.forEach(r => console.log(r));
	console.log("-".repeat(50));
	console.log();
};

const handleConnect = (io, socket) => {
	console.log("A client just joined on", socket.id);
	sockets[socket.id] = { username: "Anonymous", socket };
	numConnections += 1;
	io.emit("updateNumConnections", numConnections);
};

const handleMove = (io, socket, move) => {
	console.log("got move:", move);
	const game = sockets[socket.id].room.game;
	game.move(
		Object.assign({}, move, {
			promotion: move.promotion ? move.promotion.charAt(0) : undefined
		})
	);
	socket.broadcast.emit("opponentMove", move);
	const roomName = sockets[socket.id].room.id.toString();
	if (game.in_checkmate()) {
		if (game.turn() === "b") io.in(roomName).emit("whiteWinsMate");
		else io.in(roomName).emit("blackWinsMate");
		sockets[socket.id].room.inPlay = false;
		emitUpdateNumGames(io);
		io.in(roomName).emit("pgn", game.pgn());
	}
};

const handleDisconnect = (io, socket) => {
	numConnections -= 1;
	removeSeek(io, socket.id);
	const room = sockets[socket.id].room;
	if (room) {
		room.inPlay = false;
		socket.to(room.id.toString()).emit("opponentDisconnected");
		io.in(room.id.toString()).emit("pgn", room.game.pgn());
	}
	io.emit("updateNumConnections", numConnections);
	emitUpdateNumGames(io);
};

const handleNewSeek = (io, socket) => {
	const seek = {
		username: sockets[socket.id].username,
		id: socket.id
	};

	seeks.push(seek);
	io.to("lobby").emit("newSeek", seek);
};

const removeSeek = (io, id) => {
	const index = seeks.findIndex(seek => seek.id === id);
	if (index !== -1) seeks.splice(index, 1);
	io.to("lobby").emit("removeSeek", id);
};

const handleAcceptSeek = (io, socket, seek) => {
	const otherPlayer = sockets[seek.id].socket;
	const players =
		Math.random() > 0.5 ? [socket, otherPlayer] : [otherPlayer, socket];
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
	sockets[white.id].room = newRoom;
	sockets[black.id].room = newRoom;
	const roomName = newRoom.id.toString();
	white.join(roomName);
	black.join(roomName);
	io.in(roomName).emit("seekAccepted");
	white.emit("setColor", "white");
	black.emit("setColor", "black");
	const whiteName = sockets[white.id].username;
	const blackName = sockets[black.id].username;
	console.log("startGame", whiteName, blackName);
	io.in(roomName).emit("startGame", { whiteName, blackName });
	removeSeek(io, seek.id);
	removeSeek(io, socket.id);
	emitUpdateNumGames(io);
};

const handleResign = (io, socket) => {
	const room = sockets[socket.id].room;
	const roomName = room.id.toString();
	if (socket.id === room.white.id) {
		io.in(roomName).emit("whiteResigned");
	} else if (socket.id === room.black.id) {
		io.in(roomName).emit("blackResigned");
	}
	room.inPlay = false;
	emitUpdateNumGames(io);
	io.in(roomName).emit("pgn", room.game.pgn());
};

const emitUpdateNumGames = io => {
	io.emit("updateNumGames", rooms.filter(r => r.inPlay === true).length);
};

const handleOfferRematch = (io, socket) => {
	const room = sockets[socket.id].room;
	const roomName = room.id.toString();
	room.rematchOfferedBy = socket.id;
	socket.to(roomName).emit("offerRematch");
};

const handleCancelRematch = (io, socket) => {
	const room = sockets[socket.id].room;
	const roomName = room.id.toString();
	room.rematchOfferedBy = undefined;
	socket.to(roomName).emit("cancelRematch");
};

const handleAcceptRematch = (io, socket) => {
	const room = sockets[socket.id].room;
	const roomName = room.id.toString();
	room.rematchOfferedBy = undefined;
	room.white = room.players[1];
	room.black = room.players[0];
	room.players = [room.white, room.black];
	room.game = new SChess();
	room.inPlay = true;
	room.white.emit("setColor", "white");
	room.black.emit("setColor", "black");
	const whiteName = sockets[room.white.id].username;
	const blackName = sockets[room.black.id].username;
	io.in(roomName).emit("startGame", { whiteName, blackName });
	emitUpdateNumGames(io);
	socket.to(roomName).emit("acceptRematch");
};

const handleSetUsername = (io, socket, name) => {
	sockets[socket.id].username = name.slice(0, 20);
};

const handleClearUsername = (io, socket) => {
	sockets[socket.id].username = "Anonymous";
};

module.exports.socketServer = io => {
	io.on("connection", socket => {
		handleConnect(io, socket);
		printState("connection");

		socket.on("joinedLobby", () => {
			socket.join("lobby");
			socket.emit("allSeeks", seeks);
		});
		socket.on("leftLobby", () => socket.leave("lobby"));

		socket.on("move", move => {
			handleMove(io, socket, move);
			printState("move");
		});

		socket.on("disconnect", () => {
			handleDisconnect(io, socket);
			printState("disconnect");
		});

		socket.on("newSeek", () => {
			handleNewSeek(io, socket);
			printState("newSeek");
		});

		socket.on("acceptSeek", seek => {
			handleAcceptSeek(io, socket, seek);
			printState("acceptSeek");
		});

		socket.on("cancelSeek", () => {
			removeSeek(io, socket.id);
			printState("cancelSeek");
		});

		socket.on("resign", () => {
			handleResign(io, socket);
			printState("resign");
		});

		socket.on("offerRematch", () => {
			handleOfferRematch(io, socket);
			printState("offerRematch");
		});

		socket.on("cancelRematch", () => {
			handleCancelRematch(io, socket);
			printState("cancelRematch");
		});

		socket.on("acceptRematch", () => {
			handleAcceptRematch(io, socket);
			printState("acceptRematch");
		});

		socket.on("setUsername", name => {
			handleSetUsername(io, socket, name);
			printState("setUsername");
		});

		socket.on("clearUsername", () => {
			handleClearUsername(io, socket);
			printState("clearUsername");
		});
	});
};
