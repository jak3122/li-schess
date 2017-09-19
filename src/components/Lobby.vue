<template>
  <div class="lobby">
    <div v-if="currentlySeeking" class="currently-seeking">
      Waiting for a player to accept your seek...
    </div>
    <div v-else class="new-seek">
      <button @click="newSeek">Seek Game</button>
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
}
</style>