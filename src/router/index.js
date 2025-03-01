import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Login from '../views/LoginView.vue';
import GestionUsuarios from '@/views/GestionUsuariosView.vue';
import VerRuta from "@/views/verRuta.vue";
import crearRuta from "@/views/CrearRuta.vue";
import rutasAsignadas from '@/views/rutasAsignadas.vue';
import MisReservas from '@/views/MisReservas.vue';

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
      },
    {
      path: "/ruta/:id",
      name: "verRuta",
      component: VerRuta,
      props: true,
    },
    {
      path: "/crearRuta",
      name: "crearRuta",
      component: crearRuta
    },
    {
      path: "/rutasAsignadas",
      name: "rutasAsignadas",
      component: rutasAsignadas,
      props: true,
    },
    {
      path: "/misReservas",
      name: "misReservas",
      component: MisReservas,
      props: true,
    }
  ],
})

export default router
