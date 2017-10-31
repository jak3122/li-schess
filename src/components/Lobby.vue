<template>
  <div class="lobby">
    <div v-if="currentlySeeking" class="seek-button">
      <p>
        <button @click="cancelSeek">Cancel Seek</button>
      </p>
      <p>Waiting for a player to accept your seek...</p>
    </div>
    <div v-else class="seek-button">
			<p>
				<select v-model="timeBase">
					<option disabled value="">Time (mins)</option>
					<option v-for="time in timeControls" :key="time">{{ time }}</option>
				</select>
				<select v-model="timeIncrement">
					<option disabled value="">Increment (sec)</option>
					<option v-for="inc in timeIncrements" :key="inc">{{ inc }}</option>
				</select>
			</p>
      <p>
        <button @click="newSeek">Seek Game</button>
      </p>
    </div>
    <div class="active-seeks">
      <h3>Active Seeks</h3>
      <table class="seek-list">
        <tr v-for="seek in seeks" @click="acceptSeek(seek)" :key="seek.id">
          <td class="username">{{ seek.username }}</td>
					<td class="timeControl">{{ seek.timeControl.base }}+{{ seek.timeControl.increment }}</td>
        </tr>
      </table>
    </div>
    <div class="game-list">
      <miniBoard v-for="game in gameList" :key="game.id" :fen="game.fen" :white="game.white" :black="game.black" :onBoardClick="spectateGame(game.id)">
      </miniBoard>
    </div>
  </div>
</template>

<script>
import BoardMini from "@/components/BoardMini";

export default {
	name: "Lobby",

	components: {
		miniBoard: BoardMini
	},

	data() {
		return {
			currentlySeeking: false,
			seeks: [],
			gameList: [],
			timeBase: "",
			timeIncrement: "",
			timeControls: [],
			timeIncrements: []
		};
	},

	created() {
		this.$socket.emit("joinedLobby");
		document.title = "schess.org";
		this.timeControls = ["1/4", "1/2"];
		this.timeControls = this.timeControls.concat(
			[...Array(20).keys()].map(n => (n + 1).toString())
		);
		this.timeControls.concat(["25", "30", "45", "60"]);
		this.timeIncrements = [...Array(21).keys()].map(n => n.toString());
	},

	beforeDestroy() {
		this.$socket.emit("leftLobby");
	},

	methods: {
		newSeek: function() {
			this.currentlySeeking = true;
			const base = this.timeBase || "5";
			const increment = this.timeIncrement || "0";
			this.$socket.emit("newSeek", {
				timeControl: { base, increment }
			});
		},
		acceptSeek: function(seek) {
			if (seek.id === this.$socket.id) return;
			this.$socket.emit("acceptSeek", seek);
		},
		cancelSeek: function() {
			this.currentlySeeking = false;
			this.$socket.emit("cancelSeek");
		},
		spectateGame: function(roomName) {
			return function() {
				this.$socket.emit("spectatorJoin", roomName);
				this.$router.push({ name: "game", params: { roomName } });
			}.bind(this);
		}
	},

	sockets: {
		newSeek: function(seek) {
			this.seeks.push(seek);
		},
		seekAccepted: function(roomName) {
			this.currentlySeeking = false;
			this.$router.push({ name: "game", params: { roomName } });
		},
		removeSeek: function(id) {
			const index = this.seeks.findIndex(seek => seek.id === id);
			if (index !== -1) this.seeks.splice(index, 1);
		},
		allSeeks: function(seeks) {
			this.seeks = seeks;
		},
		gameList: function(gameList) {
			this.gameList = gameList;
		},
		gameListUpdate: function(update) {
			const index = this.gameList.findIndex(
				game => game.id === update.id
			);
			if (index !== -1) {
				const game = this.gameList[index];
				this.gameList.splice(index, 1, { ...game, fen: update.fen });
			}
		}
	}
};
</script>

<style scoped>
.lobby {
	padding: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
}

.seek-button {
	height: 100px;
}

p {
	text-align: center;
}

.active-seeks {
	height: 300px;
	display: flex;
	flex-direction: column;
	align-items: center;
	overflow-y: scroll;
}

table.seek-list {
	width: 300px;
	/* border: 1px solid black; */
	border-collapse: collapse;
}

.seek-list th,
td {
	padding: 10px;
	border-bottom: 1px solid #ddd;
	border-top: 1px solid #ddd;
	cursor: pointer;
}

.seek-list tr:hover {
	background-color: #f5f5f5;
}

.game-list {
	width: 1000px;
	display: grid;
	grid-template-rows: 333px 333px 333px;
	grid-template-columns: 333px 333px 333px;
}
</style>