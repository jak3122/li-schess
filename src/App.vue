<template>
  <div id="app">
    <div class="header">
      <div class="title">
        <router-link to="/">li-schess</router-link>
      </div>
    </div>
    <router-view></router-view>
  </div>
</template>

<script>

export default {
  name: 'app',
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
}

.title {
  display: inline-block;
  margin: 0 30px;
  font-size: 30px;
  line-height: 90px;
}
</style>

<style src="./assets/chessboard.css"></style>