const state = { turn: "w", timeControl: { base: 30000, increment: 0 }, ply: 0 };

const getters = {
	getTurn: state => (state.turn.charAt(0) === "w" ? "white" : "black"),
	getTimeControl: state => state.timeControl,
	getPly: state => state.ply
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
	}
};

export default {
	state,
	getters,
	actions,
	mutations
};