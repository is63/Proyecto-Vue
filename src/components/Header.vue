<script setup>
import router from "../router";
import { ref } from "vue";

const emits = defineEmits(["sesionCerrada"]);

const props = defineProps({
  title: String,
  usuarioAutenticado: Object, // Recibe el usuario autenticado
});

function cerrarSesion() {
  emits("sesionCerrada", null); // Emite el evento de cierre de sesión
  router.push({ name: "home" }); // Redirige a la página de inicio
}
</script>

<template>
  <header class="bg-white text-dark p-3">
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
      <div class="container-fluid">
        <!-- Logo a la izquierda -->
        <div class="navbar-brand">
          <router-link to="/">
            <img src="../assets/logo.svg" width="70px" alt="Logo" />
          </router-link>
        </div>

        <!-- Botones de navegación en el centro -->
        <div class="mx-auto">
          <ul class="navbar-nav d-flex flex-row gap-3">
            <li class="nav-item">
              <router-link class="nav-link btn btn-lg" to="/">Home</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link btn btn-lg" to="/gestionusuarios">Gestión</router-link>
            </li>
            <li class="nav-item">
              <a class="nav-link btn btn-lg" href="#">Preguntas</a>
            </li>
            <li class="nav-item">
              <a class="nav-link btn btn-lg" href="#">Exámenes</a>
            </li>
          </ul>
        </div>

        <!-- Botón de "Iniciar sesión" o "Cerrar sesión" -->
        <div class="d-flex align-items-center">
          <!-- Mostrar "Cerrar sesión" si hay un usuario autenticado -->
          <div v-if="usuarioAutenticado" class="d-flex align-items-center">
            <span class="me-3">Bienvenido, {{ usuarioAutenticado.nombre }} ({{ usuarioAutenticado.rol }})</span>
            <button @click="cerrarSesion" class="btn btn-danger">Cerrar Sesión</button>
          </div>

          <!-- Mostrar "Iniciar sesión" si no hay un usuario autenticado -->
          <router-link v-else to="/login" class="btn btn-primary">Iniciar Sesión</router-link>
        </div>
      </div>
    </nav>
  </header>
</template>

<style scoped>
/* Estilos adicionales si es necesario */
.navbar-nav .nav-link {
  font-weight: 500; /* Hace que los textos de los botones sean un poco más gruesos */
}

.navbar-nav .nav-link:hover {
  color: #007bff; /* Cambia el color al pasar el mouse */
}
</style>