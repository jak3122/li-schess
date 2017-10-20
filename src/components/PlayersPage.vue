<template>
    <div class="players">
        <h2>Online Players <img class="refresh-button" src="static/loading.svg"/></h2>
        <div v-if="loading" class="loading"><img src="static/loading.svg" /></div>
        <ul v-if="!loading">
            <li v-for="player in players" :key="player.id">{{ player.username }}</li>
        </ul>
    </div>
</template>

<script>
export default {
	name: "players",
	data() {
		return {
			players: [],
			loading: true
		};
	},
	mounted() {
		this.loadPlayers();
	},
	methods: {
		loadPlayers: function() {
			this.loading = true;
			this.$socket.emit("requestPlayersList");
		}
	},
	sockets: {
		fullPlayersList: function(data) {
			const named = data.filter(
				player => player.username !== "Anonymous"
			);
			const anons = data.filter(
				player => player.username === "Anonymous"
			);
			const players = named;
			if (anons.length > 0) {
				players.push({
					id: "anonymous",
					username: `Anonymous (${anons.length})`
				});
			}
			this.players = players;
			this.loading = false;
		}
	}
};
</script>

<style scoped>
.players {
	padding: 20px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}
.refresh-button {
	cursor: pointer;
	vertical-align: middle;
	width: 20px;
	height: 20px;
}
@keyframes spin {
	100% {
		transform: rotate(360deg);
	}
}
.loading {
	animation: spin 1s linear infinite;
}
</style scoped>