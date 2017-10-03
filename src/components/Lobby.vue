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
        <button @click="newSeek">Seek Game</button>
      </p>
    </div>
    <div class="active-seeks">
      <h3>Active Seeks</h3>
      <table class="seek-list">
        <tr v-for="seek in seeks" @click="acceptSeek(seek)" :key="seek.id">
          <td class="username">{{ seek.username }}</td>
        </tr>
      </table>
    </div>
    <div class="game-list">
      <miniBoard v-for="game in gameList" :key="game.id" :fen="game.fen" :white="game.white" :black="game.black"></miniBoard>
    </div>
  </div>
</template>

<script>
import BoardMini from '@/components/BoardMini';

export default {

  name: 'Lobby',

  components: {
    miniBoard: BoardMini
  },

  data() {
    return {
      currentlySeeking: false,
      seeks: [],
      gameList: []
    }
  },

  created() {
    this.$socket.emit("joinedLobby");
    document.title = "li-schess";
  },

  beforeDestroy() {
    this.$socket.emit("leftLobby");
  },

  methods: {
    newSeek: function() {
      this.currentlySeeking = true;
      this.$socket.emit('newSeek');
    },
    acceptSeek: function(seek) {
      if (seek.id === this.$socket.id) return;
      this.$socket.emit("acceptSeek", seek);
    },
    cancelSeek: function() {
      this.currentlySeeking = false;
      this.$socket.emit("cancelSeek");
    }
  },

  sockets: {
    newSeek: function(seek) {
      this.seeks.push(seek);
    },
    seekAccepted: function() {
      this.currentlySeeking = false;
      this.$router.push('game');
    },
    removeSeek: function(id) {
      const index = this.seeks.findIndex(seek => seek.id === id);
      if (index !== -1) this.seeks.splice(index, 1);
    },
    allSeeks: function(seeks) {
      this.seeks = seeks;
    },
    gameList: function(gameList) {
      console.log("game list:", gameList);
      this.gameList = gameList;
    },
    gameListUpdate: function(update) {
      console.log("update:", update);
      console.log("gameList:", this.gameList);
      const index = this.gameList.findIndex(game => game.id === update.id);
      if (index !== -1) {
        console.log("updating", index);
        const game = this.gameList[index];
        this.gameList.splice(index, 1, { ...game, fen: update.fen });
      }
    }
  },

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
  background-color: #f5f5f5
}

.game-list {
  width: 1000px;
  display: grid;
  grid-template-rows: 333px 333px 333px;
  grid-template-columns: 333px 333px 333px;
}
</style>