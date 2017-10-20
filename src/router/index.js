import Vue from "vue";
import Router from "vue-router";
import Lobby from "@/components/Lobby";
import GameArea from "@/components/GameArea";
import PlayersPage from "@/components/PlayersPage";

Vue.use(Router);

export default new Router({
	routes: [
		{
			path: "/",
			name: "lobby",
			component: Lobby
		},
		{
			path: "/game/:roomName",
			name: "game",
			component: GameArea,
			props: true
		},
		{
			path: "/players",
			name: "players",
			component: PlayersPage
		}
	]
});
