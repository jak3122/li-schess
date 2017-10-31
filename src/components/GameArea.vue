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
				<clock :time="opponentTime" :running="isOpponentTurn" :increment="timeIncrement"></clock>
				<div class="player-name opponent">{{ opponentName }}</div>
				<button v-if="isPlayer && !gameOver" @click="resign">Resign</button>
				<div class="rematch" v-if="isPlayer && gameOver">
					<button v-if="rematchStatus === 'initial'" @click="offerRematch">Rematch</button>
					<button v-if="rematchStatus === 'offered'" @click="cancelRematch">Cancel Rematch</button>
					<button v-if="rematchStatus === 'pending'" @click="acceptRematch">Accept Rematch</button>
				</div>
				<div class="player-name me">{{ myName }}</div>
				<clock :time="myTime" :running="isMyTurn" :increment="timeIncrement"></clock>
			</div>
			<div class="status-messages">
				<div v-if="gameOver">Game over.</div>
				<div v-if="whiteWinsMate">Checkmate - White wins!</div>
				<div v-else-if="blackWinsMate">Checkmate - Black wins!</div>
				<div v-else-if="whiteResigned">White resigned.</div>
				<div v-else-if="blackResigned">Black resigned.</div>
				<div v-else-if="opponentDisconnected">Opponent disconnected.</div>
				<div v-else-if="whiteWinsFlag">Time out. White wins!</div>
				<div v-else-if="blackWinsFlag">Time out. Black wins!</div>
				<div v-if="pgn">
					<textarea readonly class="pgn" v-model="pgn"></textarea>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { mapGetters } from "vuex";
import Board from "@/components/Board";
import Chat from "@/components/Chat";
import Clock from "@/components/Clock";

const initialState = {
	gameOver: false,
	whiteWinsMate: false,
	blackWinsMate: false,
	whiteResigned: false,
	blackResigned: false,
	whiteWinsFlag: false,
	blackWinsFlag: false,
	opponentDisconnected: false,
	pgn: "",
	rematchStatus: "initial",
	opponentTime: 0,
	myTime: 0
};

export default {
	name: "GameArea",
	components: {
		board: Board,
		chat: Chat,
		clock: Clock
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
			ply: "getPly"
		}),
		isOpponentTurn: function() {
			return (
				!this.gameOver && this.ply > 1 && this.turn !== this.orientation
			);
		},
		isMyTurn: function() {
			return (
				!this.gameOver && this.ply > 1 && this.turn === this.orientation
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
			Object.assign(this.$data, initialState);
			this.pgn = "";
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
		pgn: function(pgn) {
			this.pgn = pgn;
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

.room-controls-top {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.room-controls {
	width: 150px;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	margin: 50px;
}

.room-controls button {
	margin: 30px;
	width: 120px;
	transform: scale(1.4);
}

.status-messages {
	width: 200px;
	font-size: 14px;
}

.pgn {
	width: 150px;
	height: 60px;
}

.player-name {
	font-size: 18px;
	letter-spacing: 2px;
}
</style>

