import Vue from 'vue';
import Router from 'vue-router';
import Lobby from '@/components/Lobby';
import GameArea from '@/components/GameArea';

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/',
      name: 'lobby',
      component: Lobby,
    },
    {
      path: '/game',
      name: 'game',
      component: GameArea,
    },
  ],
});
