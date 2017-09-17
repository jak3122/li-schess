import Vue from 'vue';
import Router from 'vue-router';
import GameArea from '@/components/GameArea';

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/',
      name: 'GameAreaj',
      component: GameArea,
    },
  ],
});
