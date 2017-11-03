<template>
	<div class="game-area">
		<div class="loading" v-if="loading"></div>
		<div class="content" v-if="!loading">
			<div class="left-area">
				<div class="game-info">
					<div class="players-vs">{{ whiteName }} vs {{ blackName }}</div>
					<div class="time-control">{{ timeBase/60000 }}+{{ timeIncrement }}</div>
				</div>
				<chat :isPlayer="isPlayer"></chat>
			</div>
			<board :orientation="orientation" :isPlayer="isPlayer" :gameOver="gameOver"></board>
			<div class="room-controls">
				<clock position="top" :time="opponentTime" :running="isOpponentTurn" :increment="timeIncrement"></clock>
				<div class="game-table">
					<div class="player-name opponent">{{ opponentName }}</div>
					<moveList></moveList>
					<div class="status-messages" v-if="gameOver">
						<div v-if="whiteWinsMate">Checkmate - White wins!</div>
						<div v-else-if="blackWinsMate">Checkmate - Black wins!</div>
						<div v-else-if="whiteResigned">White resigned.</div>
						<div v-else-if="blackResigned">Black resigned.</div>
						<div v-else-if="opponentDisconnected">Opponent disconnected.</div>
						<div v-else-if="whiteWinsFlag">Time out. White wins!</div>
						<div v-else-if="blackWinsFlag">Time out. Black wins!</div>
					</div>
					<button v-if="isPlayer && !gameOver" @click="resign">Resign</button>
					<template v-if="isPlayer && gameOver">
						<button v-if="rematchStatus === 'initial'" @click="offerRematch">Rematch</button>
						<button v-if="rematchStatus === 'offered'" @click="cancelRematch">Cancel Rematch</button>
						<button v-if="rematchStatus === 'pending'" @click="acceptRematch">Accept Rematch</button>
					</template>
					<div class="player-name me">{{ myName }}</div>
				</div>
				<clock position="bottom" :time="myTime" :running="isMyTurn" :increment="timeIncrement"></clock>
			</div>
		</div>
	</div>
</template>

<script>
import { mapGetters } from "vuex";
import Board from "@/components/Board";
import Chat from "@/components/Chat";
import Clock from "@/components/Clock";
import MoveList from "@/components/MoveList";

const initialState = {
	gameOver: false,
	whiteWinsMate: false,
	blackWinsMate: false,
	whiteResigned: false,
	blackResigned: false,
	whiteWinsFlag: false,
	blackWinsFlag: false,
	opponentDisconnected: false,
	rematchStatus: "initial",
	opponentTime: 0,
	myTime: 0
};

export default {
	name: "GameArea",
	components: {
		board: Board,
		chat: Chat,
		clock: Clock,
		moveList: MoveList
	},
	props: ["roomName"],
	data() {
		return {
			orientation: "white",
			whiteName: "Anonymous",
			blackName: "Anonymous",
			whiteId: null,
			blackId: null,
			loading: true,
			isPlayer: false,
			...initialState
		};
	},
	computed: {
		...mapGetters({
			turn: "getTurn",
			timeBase: "getTimeBase",
			timeIncrement: "getTimeIncrement",
			ply: "getPly",
			gamePly: "gamePly"
		}),
		isOpponentTurn: function() {
			return (
				!this.gameOver && this.gamePly > 1 && this.turn !== this.orientation
			);
		},
		isMyTurn: function() {
			return (
				!this.gameOver && this.gamePly > 1 && this.turn === this.orientation
			);
		},
		myName: function() {
			return this.orientation === "white"
				? this.whiteName
				: this.blackName;
		},
		opponentName: function() {
			return this.orientation === "white"
				? this.blackName
				: this.whiteName;
		}
	},
	mounted() {
		this.resetClocks();
		this.$socket.emit("joinRoom", this.roomName);
	},
	updated() {
		document.title = `${this.whiteName} vs ${this.blackName} - schess.org`;
	},
	beforeDestroy() {
		this.$socket.emit("leaveRoom", this.roomName);
		this.$store.commit("setPly", 0);
	},
	methods: {
		flipBoard: function() {
			this.orientation === "white"
				? (this.orientation = "black")
				: (this.orientation = "white");
		},
		resign: function() {
			this.$socket.emit("resign");
		},
		offerRematch: function() {
			this.rematchStatus = "offered";
			this.$socket.emit("offerRematch");
		},
		cancelRematch: function() {
			this.rematchStatus = "initial";
			this.$socket.emit("cancelRematch");
		},
		acceptRematch: function() {
			this.rematchStatus = "initial";
			this.$socket.emit("acceptRematch");
		},
		resetClocks: function() {
			this.opponentTime = this.timeBase;
			this.myTime = this.timeBase;
		},
		setTimes: function(times) {
			console.log("updateTimes:", times);
			if (this.orientation === "white") {
				console.log("myTime:", this.myTime, "->", times.whiteTime);
				console.log(
					"opponentTime:",
					this.opponentTime,
					"->",
					times.blackTime
				);
				this.myTime = times.whiteTime;
				this.opponentTime = times.blackTime;
			} else if (this.orientation === "black") {
				console.log("myTime:", this.myTime, "->", times.blackTime);
				console.log(
					"opponentTime:",
					this.opponentTime,
					"->",
					times.whiteTime
				);
				this.myTime = times.blackTime;
				this.opponentTime = times.whiteTime;
			}
		}
	},
	sockets: {
		startGame: function(data) {
			console.log("GameArea startGame");
			Object.assign(this.$data, initialState);
			if (data) {
				this.whiteName = data.whiteName;
				this.blackName = data.blackName;
				this.whiteId = data.whiteId;
				this.blackId = data.blackId;
				if (data.timeControl) {
					this.$store.commit("setTimeBase", data.timeControl.base);
					this.$store.commit(
						"setTimeIncrement",
						data.timeControl.increment
					);
				}
			}
			this.resetClocks();
			this.$store.commit("resetMoves");
		},
		joinRoomAsPlayer: function(data) {
			this.isPlayer = true;
			this.loading = false;
		},
		joinRoomAsSpectator: function(data) {
			this.isPlayer = false;
			this.loading = false;
		},
		fullGameUpdate: function(data) {
			this.whiteName = data.whiteName;
			this.blackName = data.blackName;
			this.whiteId = data.whiteId;
			this.blackId = data.blackId;
			this.$store.commit("setPly", data.ply);
			this.setTimes({
				whiteTime: data.whiteTime,
				blackTime: data.blackTime
			});
		},
		whiteWinsMate: function() {
			this.whiteWinsMate = true;
			this.gameOver = true;
		},
		blackWinsMate: function() {
			this.blackWinsMate = true;
			this.gameOver = true;
		},
		whiteResigned: function() {
			this.whiteResigned = true;
			this.gameOver = true;
		},
		blackResigned: function() {
			this.blackResigned = true;
			this.gameOver = true;
		},
		opponentDisconnected: function() {
			this.opponentDisconnected = true;
			this.gameOver = true;
		},
		setColor: function(color) {
			this.orientation = color;
		},
		offerRematch: function() {
			this.rematchStatus = "pending";
		},
		cancelRematch: function() {
			this.rematchStatus = "initial";
		},
		updateTimes: function(times) {
			this.setTimes(times);
		},
		playerFlagged: function(data) {
			const { color } = data;
			console.log(color, "flagged");
			if (color === "white") {
				this.blackWinsFlag = true;
			} else if (color === "black") {
				this.whiteWinsFlag = true;
			}
			this.gameOver = true;
		}
	}
};
</script>

<style scoped>
.game-area .content {
	padding: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.left-area {
	display: flex;
	flex-direction: column;
}

.left-area .game-info {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	padding: 20px;
	margin-right: 15px;
	margin-bottom: 10px;
	border: 1px solid lightgray;
}

.left-area .game-info * {
	padding: 5px;
}

.right-area {
	display: flex;
	flex-direction: column;
}

.game-table {
	display: flex;
	flex-direction: column;
    border: 1px solid #ccc;
	align-items: center;
}

.room-controls-top {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.room-controls {
	width: 242px;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	margin-left: 15px;
}

.room-controls button {
	padding: 8px;
    width: 100%;
    box-sizing: border-box;
	cursor: pointer;
}

.status-messages {
	width: 100%;
	padding: 7px 0;
	font-size: 14px;
	display: flex;
	flex-direction: column;
	align-items: center;
    border: 1px solid #ccc;
}

.player-name {
	font-size: 18px;
	letter-spacing: 2px;
	padding: 10px;
}
</style>

