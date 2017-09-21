<template>
  <div class="lobby">
    <div v-if="currentlySeeking" class="currently-seeking">
      <p>
        <button @click="cancelSeek">Cancel Seek</button>
      </p>
      <p>Waiting for a player to accept your seek...</p>
    </div>
    <div v-else class="new-seek">
      <p>
        <button @click="newSeek">Seek Game</button>
      </p>
    </div>
  </div>
</template>

<script>
export default {

  name: 'Lobby',

  data() {
    return {
      currentlySeeking: false,
    }
  },

  methods: {
    newSeek: function() {
      this.currentlySeeking = true;
      this.$socket.emit('newSeek');
    },
    cancelSeek: function() {
      this.currentlySeeking = false;
      this.$socket.emit("cancelSeek");
    }
  },

  sockets: {
    seekAccepted: function() {
      this.currentlySeeking = false;
      this.$router.push('game');
    },
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

p {
  text-align: center;
}
</style>