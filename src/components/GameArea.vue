<template>
  <div class="game-area">
    <board :orientation="orientation"></board>
    <div class="room-controls">
      <button :disabled="gameOver" @click="resign">Resign</button>
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
</template>

<script>
import Board from '@/components/Board';

export default {
  name: 'GameArea',
  components: {
    board: Board,
  },
  data() {
    return {
      orientation: 'white',
      gameOver: false,
      whiteWinsMate: false,
      blackWinsMate: false,
      whiteResigned: false,
      blackResigned: false,
      opponentDisconnected: false,
      pgn: "",
    };
  },
  methods: {
    resign: function() {
      this.$socket.emit('resign');
    },
  },
  sockets: {
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
    }
  },
};
</script>

<style scoped>
.game-area {
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.room-controls {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 50px;
}

.room-controls button {
  margin: 10px;
  transform: scale(1.2);
}

.status-messages {
  width: 200px;
  font-size: 14px;
}

.pgn {
  width: 150px;
  height: 60px;
}
</style>

