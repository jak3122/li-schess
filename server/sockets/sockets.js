/* eslint-disable no-console */
const SChess = require("schess.js").SChess;
const shortid = require("shortid");
const clock = require("../../src/chess/clock").clock;

const seeks = [];

const rooms = [];

const sockets = {};

let numConnections = 0;

const removeDeadSeeks = () => {
	const deadSeeks = [];
	seeks.forEach((seek, index) => {
		if (!sockets.hasOwnProperty(seek.id)) {
			deadSeeks.push(index);
		}
	});
	if (deadSeeks.length > 0)
		console.log(
			"removing dead seeks:",
			deadSeeks.map(seekIndex => {
				const seek = seeks[seekIndex];
				return `[${seek.id}:${seek.username}@${seek.timeControl
					.base}+${seek.timeControl.increment}]`;
			})
		);
	deadSeeks.forEach(seekIndex => {
		seeks.splice(seekIndex, 1);
	});
};

const timeControlBaseStringToMillis = minString => {
	switch (minString) {
		case "1/4":
			return 15000;
		case "1/2":
			return 30000;
		default:
			return Number(minString) * 60000;
	}
};

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
	const moveColor = game.turn();
	const moveResult = game.move(
		Object.assign({}, move, {
			promotion: move.promotion ? move.promotion.charAt(0) : undefined
		})
	);
	const plies = game.history({ verbose: true }).length;
	if (plies > 1) {
		if (moveColor === "w") {
			room.whiteClock.pause();
			room.whiteTime = room.whiteClock.timeLeft();
			room.blackClock.start(room.blackTime);
			console.log("white timeLeft:", room.whiteTime);
		} else if (moveColor === "b") {
			room.blackClock.pause();
			room.blackTime = room.blackClock.timeLeft();
			room.whiteClock.start(room.whiteTime);
			console.log("black timeLeft:", room.blackTime);
		}
	}
	const roomName = room.id;
	room.currentFen = game.fen();
	room.moves.push({ fen: room.currentFen, lastMove: moveResult });
	socket.to(roomName).emit("opponentMove", move);
	emitUpdateTimes(io, room);
	emitGameListUpdate(io, room.id);
	if (game.in_checkmate()) {
		if (game.turn() === "b") io.in(roomName).emit("whiteWinsMate");
		else io.in(roomName).emit("blackWinsMate");
		room.inPlay = false;
		emitUpdateNumGames(io);
		io.in(roomName).emit("pgn", game.pgn());
	}
	const nextColor = moveColor === "w" ? "b" : "w";
	console.log("nextColor:", nextColor);
	console.log("plies:", plies);
	if (game.game_over()) {
		stopGame(room);
	}
};

const emitUpdateTimes = (io, room) => {
	const times = { whiteTime: room.whiteTime, blackTime: room.blackTime };
	console.log("updateTimes:", times);
	io.to(room.id).emit("updateTimes", times);
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

const stopGame = room => {
	room.inPlay = false;
	if (room.whiteClock) room.whiteClock.pause();
	if (room.blackClock) room.blackClock.pause();
};

const handleNewSeek = (io, socket, data) => {
	const { timeControl } = data;
	const seek = {
		username: sockets[socket.id].username,
		id: socket.id,
		timeControl
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
	seek.timeControl.base = timeControlBaseStringToMillis(
		seek.timeControl.base
	);
	seek.timeControl.increment = Number(seek.timeControl.increment);
	const gameObj = new SChess();
	const fen = gameObj.fen();
	const newRoom = {
		id: shortid.generate(),
		white,
		black,
		players,
		game: gameObj,
		moves: [
			{
				fen,
				lastMove: { from: undefined, to: undefined }
			}
		],
		currentFen: fen,
		inPlay: true,
		spectators: [],
		timeControl: seek.timeControl,
		whiteTime: seek.timeControl.base,
		blackTime: seek.timeControl.base,
		whiteClock: new clock(
			seek.timeControl.base,
			seek.timeControl.increment
		),
		blackClock: new clock(seek.timeControl.base, seek.timeControl.increment)
	};
	const whiteFlagCallback = () => handleFlag(io, socket, newRoom, "white");
	const blackFlagCallback = () => handleFlag(io, socket, newRoom, "black");
	newRoom.whiteClock.onTimeUp(whiteFlagCallback);
	newRoom.blackClock.onTimeUp(blackFlagCallback);
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
	const { timeControl } = newRoom;
	console.log("startGame", roomName, whiteName, blackName);
	io.in(roomName).emit("startGame", {
		whiteName,
		blackName,
		whiteId,
		blackId,
		timeControl
	});
	emitGameListUpdate(io, newRoom.id);
	removeSeek(io, seek.id);
	removeSeek(io, socket.id);
	emitUpdateNumGames(io);
};

const handleResign = (io, socket) => {
	const room = sockets[socket.id].room;
	stopGame(room);
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

const handleFlag = (io, socket, room, color) => {
	console.log(color, "flagged");
	stopGame(room);
	room.whiteTime = room.whiteClock.timeLeft();
	room.blackTime = room.blackClock.timeLeft();
	emitUpdateTimes(io, room);
	io.to(room.id).emit("playerFlagged", { color });
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
	const fen = room.game.fen();
	room.moves = [{ fen, lastMove: {} }];
	room.inPlay = true;
	room.white.emit("setColor", "white");
	room.black.emit("setColor", "black");
	room.whiteTime = room.timeControl.base;
	room.blackTime = room.timeControl.base;
	room.whiteClock = new clock(
		room.timeControl.base,
		room.timeControl.increment
	);
	room.blackClock = new clock(
		room.timeControl.base,
		room.timeControl.increment
	);
	const whiteFlagCallback = () => handleFlag(io, socket, room, "white");
	const blackFlagCallback = () => handleFlag(io, socket, room, "black");
	room.whiteClock.onTimeUp(whiteFlagCallback);
	room.blackClock.onTimeUp(blackFlagCallback);
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
	removeDeadSeeks();
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
		const moves = room.moves;
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
			spectators,
			whiteTime: room.whiteTime,
			blackTime: room.blackTime,
			moves,
			ply: moves.length - 1
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

		socket.on("newSeek", data => {
			handleNewSeek(io, socket, data);
			printState(
				"newSeek",
				`${data.timeControl.base}+${data.timeControl.increment}`
			);
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
