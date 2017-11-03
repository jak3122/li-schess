import SChess from "schess.js";

const state = {
	turn: "w",
	timeControl: { base: 30000, increment: 0 },
	ply: 0,
	moves: [{ fen: new SChess().fen(), lastMove: {} }]
};

const getters = {
	getTurn: state => (state.turn.charAt(0) === "w" ? "white" : "black"),
	getTimeBase: state => state.timeControl.base,
	getTimeIncrement: state => state.timeControl.increment,
	getPly: state => state.ply,
	gamePly: state => state.moves.length - 1,
	getMoves: state => state.moves,
	getLastMove: state => state.moves[state.moves.length - 1]
};

const actions = {};

const mutations = {
	setTurn(state, newTurn) {
		state.turn = newTurn;
	},
	setTimeBase(state, timeBase) {
		state.timeControl.base = timeBase;
	},
	setTimeIncrement(state, timeIncrement) {
		state.timeControl.increment = timeIncrement;
	},
	setPly(state, ply) {
		state.ply = ply;
	},
	incrementPly(state) {
		if (state.ply === state.moves.length - 2)
			state.ply = state.moves.length - 1;
	},
	resetMoves(state) {
		state.moves = [{ fen: new SChess().fen(), lastMove: {} }];
	},
	setMoves(state, moves) {
		state.moves = moves;
	},
	addMove(state, move) {
		state.moves.push(move);
	}
};

export default {
	state,
	getters,
	actions,
	mutations
};
