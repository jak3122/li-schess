<template>
  <div class="game-area">
    <board :orientation="orientation"></board>
    <div class="room-controls">
      <button :disabled="!blackEnabled" @click="play('black')">Play Black</button>
      <button :disabled="!whiteEnabled" @click="play('white')">Play White</button>
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
      whiteEnabled: true,
      blackEnabled: true
    };
  },
  methods: {
    play: function(color) {
      this.$socket.emit('play', color);
      this.orientation = color;
    },
  },
  sockets: {
    setPlayer: function(color) {
      const colorChar = color.charAt(0);
      if (colorChar === 'w')
        this.whiteEnabled = false;
      else if (colorChar === 'b')
        this.blackEnabled = false;
    },
    unsetPlayer: function(color) {
      const colorChar = color.charAt(0);
      if (colorChar === 'w')
        this.whiteEnabled = true;
      else if (colorChar === 'b')
        this.blackEnabled = true;
    }
  }
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
</style>

