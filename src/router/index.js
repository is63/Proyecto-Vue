import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Login from '../views/LoginView.vue';
import GestionUsuarios from '@/views/GestionUsuariosView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
        path: '/login',
        name: 'login',
        component: Login,
      },
      {
        path: '/gestionusuarios',
        name: 'gestionusuarios',
        component: GestionUsuarios,
      }
  ],
})

export default router
