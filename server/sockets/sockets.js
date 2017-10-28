/* eslint-disable no-console */
const SChess = require("schess.js").SChess;
const shortid = require("shortid");

const seeks = [];

const rooms = [];

const sockets = {};

let numConnections = 0;

const printState = (event, ...rest) => {
	console.log(
		event,
		rest.join(", "),
		"\t\t\t\t\t",
		`# connections: ${numConnections}`,
		`# seeks: ${seeks.length}`,
		`# rooms: ${rooms.length}`,
		new Date().toLocaleString("en-US", {
			timeZone: "America/New_York",
			timeZoneName: "short"
		})
	);
};

const getSpectators = room => {
	return room.spectators.map(specSocket => {
		const specName = sockets[specSocket.id].username;
		return specName;
	});
};

const removeSpectator = (room, socket) => {
	const index = room.spectators.findIndex(s => s.id === socket.id);
	if (index !== -1) {
		room.spectators.splice(index, 1);
		socket.to(room.id).emit("spectators", getSpectators(room));
	}
};

const handleConnect = (io, socket) => {
	console.log("A client just joined on", socket.id);
	sockets[socket.id] = { username: "Anonymous", socket };
	numConnections += 1;
	io.emit("updateNumConnections", numConnections);
};

const handleMove = (io, socket, move) => {
	console.log("got move:", move);
	const room = sockets[socket.id].room;
	const game = room.game;
	game.move(
		Object.assign({}, move, {
			promotion: move.promotion ? move.promotion.charAt(0) : undefined
		})
	);
	const roomName = room.id;
	room.currentFen = game.fen();
	socket.to(roomName).emit("opponentMove", move);
	emitGameListUpdate(io, room.id);
	if (game.in_checkmate()) {
		if (game.turn() === "b") io.in(roomName).emit("whiteWinsMate");
		else io.in(roomName).emit("blackWinsMate");
		room.inPlay = false;
		emitUpdateNumGames(io);
		io.in(roomName).emit("pgn", game.pgn());
	}
};

const handleDisconnect = (io, socket) => {
	numConnections -= 1;
	removeSeek(io, socket.id);
	const room = sockets[socket.id].room;
	if (room) {
		if (socket.id === room.white.id || socket.id === room.black.id) {
			room.inPlay = false;
			socket.to(room.id).emit("opponentDisconnected");
			io.in(room.id).emit("pgn", room.game.pgn());
		} else {
			removeSpectator(room, socket);
		}
	}
	if (sockets[socket.id]) {
		delete sockets[socket.id];
	}
	console.log("sockets after disconnect:", Object.keys(sockets).length);
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
		id: shortid.generate(),
		white,
		black,
		players,
		game: new SChess(),
		currentFen: new SChess().fen(),
		inPlay: true,
		spectators: []
	};
	rooms.push(newRoom);
	sockets[white.id].room = newRoom;
	sockets[black.id].room = newRoom;
	const roomName = newRoom.id;
	white.join(roomName);
	black.join(roomName);
	io.in(roomName).emit("seekAccepted", roomName);
	white.emit("setColor", "white");
	black.emit("setColor", "black");
	const whiteName = sockets[white.id].username;
	const blackName = sockets[black.id].username;
	const whiteId = white.id;
	const blackId = black.id;
	console.log("startGame", roomName, whiteName, blackName);
	io
		.in(roomName)
		.emit("startGame", { whiteName, blackName, whiteId, blackId });
	emitGameListUpdate(io, newRoom.id);
	removeSeek(io, seek.id);
	removeSeek(io, socket.id);
	emitUpdateNumGames(io);
};

const handleResign = (io, socket) => {
	const room = sockets[socket.id].room;
	const roomName = room.id;
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
	if (room) {
		const roomName = room.id;
		room.rematchOfferedBy = socket.id;
		socket.to(roomName).emit("offerRematch");
	}
};

const handleCancelRematch = (io, socket) => {
	const room = sockets[socket.id].room;
	const roomName = room.id;
	room.rematchOfferedBy = undefined;
	socket.to(roomName).emit("cancelRematch");
};

const handleAcceptRematch = (io, socket) => {
	const room = sockets[socket.id].room;
	const roomName = room.id;
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
	emitGameListUpdate(io, room.id);
};

const handleSetUsername = (io, socket, name) => {
	sockets[socket.id].username = name.slice(0, 20);
};

const handleClearUsername = (io, socket) => {
	sockets[socket.id].username = "Anonymous";
};

const handleSpectatorChatMessage = (io, socket, message) => {
	try {
		const roomId = sockets[socket.id].room.id;
		const username = sockets[socket.id].username;
		console.log(`[(s)chat ${roomId}] ${username}:`, message);
		io
			.in(roomId)
			.emit("newSpectatorChatMessage", `${username}: ${message}`);
	} catch (err) {
		console.trace(
			`handleSpectatorChatMessage ${socket.id} ${message} failed:`,
			err
		);
	}
};

const handleGameChatMessage = (io, socket, message) => {
	try {
		const roomId = sockets[socket.id].room.id;
		const username = sockets[socket.id].username;
		console.log(`[(g)chat ${roomId}] ${username}:`, message);
		io.in(roomId).emit("newGameChatMessage", `${username}: ${message}`);
	} catch (err) {
		console.trace(
			`handleGameChatMessage ${socket.id} ${message} failed:`,
			err
		);
	}
};

const handleJoinedLobby = (io, socket) => {
	socket.join("lobby");
	socket.emit("allSeeks", seeks);
	const gameList = rooms
		.filter(room => room.inPlay === true)
		.slice(-9)
		.map(room => {
			const white = sockets[room.white.id];
			const black = sockets[room.black.id];
			return {
				id: room.id,
				white: white ? white.username : undefined,
				black: black ? black.username : undefined,
				fen: room.currentFen
			};
		});
	socket.emit("gameList", gameList);
};

const emitGameListUpdate = (io, id) => {
	try {
		const room = rooms.find(room => room.id === id);
		const white = sockets[room.white.id];
		const black = sockets[room.black.id];
		const update = {
			id,
			fen: room.currentFen,
			white: white ? white.username : undefined,
			black: black ? black.username : undefined
		};
		io.in("lobby").emit("gameListUpdate", update);
	} catch (err) {
		console.trace(`id: ${id}`);
	}
};

const handleJoinRoom = (io, socket, roomName) => {
	try {
		const room = rooms.find(room => room.id === roomName);
		if (socket.id === room.white.id || socket.id === room.black.id) {
			joinRoomAsPlayer(io, socket, roomName);
		} else {
			joinRoomAsSpectator(io, socket, roomName);
		}
	} catch (err) {
		console.trace(`roomName: ${roomName}`);
	}
};

const joinRoomAsPlayer = (io, socket, roomName) => {
	try {
		console.log("player joined", roomName);
		socket.join(roomName);
		socket.emit("joinRoomAsPlayer", roomName);
	} catch (err) {
		console.trace(`roomName: ${roomName}`);
	}
};

const joinRoomAsSpectator = (io, socket, roomName) => {
	try {
		console.log("spectator joined", roomName);
		socket.join(roomName);
		socket.emit("joinRoomAsSpectator", roomName);
		const room = rooms.find(room => room.id === roomName);
		room.spectators.push(socket);
		sockets[socket.id].room = room;
		emitFullGameUpdate(io, socket, roomName);
		socket.to(room.id).emit("spectators", getSpectators(room));
	} catch (err) {
		console.trace(`roomName: ${roomName}`);
	}
};

const emitFullGameUpdate = (io, socket, roomName) => {
	try {
		const room = rooms.find(room => room.id === roomName);
		const whiteName = sockets[room.white.id].username;
		const blackName = sockets[room.black.id].username;
		const spectators = getSpectators(room);
		console.log(
			`fullGameUpdate room.id: ${room.id}, fen: ${room.currentFen}`
		);
		const roomUpdate = {
			id: room.id,
			whiteName,
			whiteId: room.white.id,
			blackName,
			blackId: room.black.id,
			currentFen: room.currentFen,
			spectators
		};
		socket.emit("fullGameUpdate", roomUpdate);
	} catch (err) {
		console.trace(`roomName: ${roomName}`);
	}
};

const handleLeaveRoom = (io, socket, roomName) => {
	const room = rooms.find(room => room.id === roomName);
	if (!room) {
		console.log("room not found:", roomName);
		console.trace();
		return;
	}
	removeSpectator(room, socket);
};

const handleRequestPlayersList = (io, socket) => {
	try {
		const socketIds = Object.keys(sockets);
		const playersList = socketIds.map(id => ({
			id,
			username: sockets[id].username
		}));
		console.log("player list:", playersList);
		socket.emit("fullPlayersList", playersList);
	} catch (err) {
		console.trace();
	}
};

module.exports.socketServer = io => {
	io.on("connection", socket => {
		handleConnect(io, socket);
		printState("connection");

		socket.on("joinedLobby", () => {
			handleJoinedLobby(io, socket);
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
			try {
				handleAcceptSeek(io, socket, seek);
			} catch (err) {
				console.trace("handleAcceptSeek", err);
			}
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
			printState("setUsername", name);
		});

		socket.on("clearUsername", () => {
			handleClearUsername(io, socket);
			printState("clearUsername");
		});

		socket.on("spectatorChatMessage", message => {
			handleSpectatorChatMessage(io, socket, message);
		});

		socket.on("gameChatMessage", message => {
			handleGameChatMessage(io, socket, message);
		});

		socket.on("joinRoom", roomName => {
			handleJoinRoom(io, socket, roomName);
			printState("joinRoom");
		});

		socket.on("leaveRoom", roomName => {
			handleLeaveRoom(io, socket, roomName);
			printState("leaveRoom");
		});

		socket.on("requestPlayersList", () => {
			handleRequestPlayersList(io, socket);
		});
	});
};
