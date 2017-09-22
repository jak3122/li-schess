<template>
  <div id="app">
    <div class="header">
      <div class="title">
        <router-link to="/">li-schess</router-link>
      </div>
      <div class="stats">
        <div>{{ numConnectionsText }}</div>
        <div>{{ numGamesText }}</div>
      </div>
      <username></username>
    </div>
    <router-view></router-view>
  </div>
</template>

<script>
import Username from "@/components/Username";

export default {
  name: 'app',
  components: {
    username: Username
  },
  data() {
    return {
      numConnections: 0,
      numGames: 0
    }
  },
  computed: {
    numConnectionsText: function() {
      return `${this.numConnections} user${this.numConnections === 1 ? '' : 's'} connected`;
    },
    numGamesText: function() {
      return `${this.numGames} game${this.numGames === 1 ? '' : 's'} in play`;
    }
  },
  sockets: {
    updateNumConnections: function(n) {
      this.numConnections = n;
    },
    updateNumGames: function(n) {
      this.numGames = n;
    }
  }
};
</script>

<style>
body {
  font: 12px 'Noto Sans', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, Sans-Serif;
  margin: 0px;
}

#app {
  color: #2c3e50;
  width: 100%;
  height: 100%;
}

.header {
  width: 100%;
  height: 90px;
  background-color: #dedede;
  display: flex;
  align-items: center;
  position: relative;
  flex-flow: row-reverse;
}

.title {
  display: inline-block;
  margin: 0 30px;
  font-size: 30px;
  line-height: 90px;
  position: absolute;
  left: 0px;
}

.title a {
  text-decoration: none;
  color: gray;
}

.title a:hover {
  color: dimgray;
}

.stats {
  display: block;
  position: relative;
  margin-right: 50px;
  letter-spacing: 1px;
  font-size: 14px;
}
</style>

<style src="./assets/chessboard.css"></style>