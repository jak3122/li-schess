<template>
  <div class="game-area">
    <div class="loading" v-if="loading"></div>
    <div class="content" v-if="!loading">
      <chat :isPlayer="isPlayer"></chat>
      <board :orientation="orientation" :isPlayer="isPlayer"></board>
      <div class="room-controls">
        <div class="player-name opponent">{{ opponentName }}</div>
        <button v-if="isPlayer && !gameOver" @click="resign">Resign</button>
        <div class="rematch" v-if="isPlayer && gameOver">
          <button v-if="rematchStatus === 'initial'" @click="offerRematch">Rematch</button>
          <button v-if="rematchStatus === 'offered'" @click="cancelRematch">Cancel Rematch</button>
          <button v-if="rematchStatus === 'pending'" @click="acceptRematch">Accept Rematch</button>
        </div>
        <div class="player-name me">{{ myName }}</div>
      </div>
      <div class="status-messages">
        <div v-if="gameOver">Game over.</div>
        <div v-if="whiteWinsMate">Checkmate - White wins!</div>
        <div v-else-if="blackWinsMate">Checkmate - Black wins!</div>
        <div v-else-if="whiteResigned">White resigned.</div>
        <div v-else-if="blackResigned">Black resigned.</div>
        <div v-else-if="opponentDisconnected">Opponent disconnected.</div>
        <div v-if="pgn">
          <textarea readonly class="pgn" v-model="pgn"></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Board from '@/components/Board';
import Chat from '@/components/Chat';

const initialState = {
  gameOver: false,
  whiteWinsMate: false,
  blackWinsMate: false,
  whiteResigned: false,
  blackResigned: false,
  opponentDisconnected: false,
  pgn: "",
  rematchStatus: "initial",
}

export default {
  name: 'GameArea',
  components: {
    board: Board,
    chat: Chat
  },
  props: ['roomName'],
  data() {
    return {
      orientation: 'white',
      whiteName: "Anonymous",
      blackName: "Anonymous",
      whiteId: null,
      blackid: null,
      loading: true,
      isPlayer: false,
      ...initialState
    };
  },
  computed: {
    myName: function() {
      return this.orientation === "white" ? this.whiteName : this.blackName;
    },
    opponentName: function() {
      return this.orientation === "white" ? this.blackName : this.whiteName;
    },
  },
  mounted() {
    this.$socket.emit("joinRoom", this.roomName);
  },
  updated() {
    document.title = `${this.whiteName} vs ${this.blackName} - schess.org`;
  },
  beforeDestroy() {
    this.$socket.emit("leaveRoom", this.roomName);
  },
  methods: {
    flipBoard: function() {
      this.orientation === "white" ? this.orientation = "black" : this.orientation = "white";
    },
    resign: function() {
      this.$socket.emit('resign');
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
  },
  sockets: {
    startGame: function(data) {
      console.log("startGame", data);
      Object.assign(this.$data, initialState);
      this.pgn = "";
      if (data) {
        this.whiteName = data.whiteName;
        this.blackName = data.blackName;
        this.whiteId = data.whiteId;
        this.blackId = data.blackId;
      }
    },
    joinRoomAsPlayer: function(data) {
      console.log("joinRoomAsPlayer");
      this.isPlayer = true;
      this.loading = false;
    },
    joinRoomAsSpectator: function(data) {
      console.log("joinRoomAsSpectator");
      this.isPlayer = false;
      this.loading = false;
    },
    fullGameUpdate: function(data) {
      this.whiteName = data.whiteName;
      this.blackName = data.blackName;
      this.whiteId = data.whiteId;
      this.blackid = data.blackId;
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
      console.log("setColor:", color);
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
  },
};
</script>

<style scoped>
.game-area .content {
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
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

