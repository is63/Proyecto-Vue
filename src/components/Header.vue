<script setup>
import router from "../router";
import { ref } from "vue";

const emits = defineEmits(["sesionCerrada"]);

const props = defineProps({
  title: String,
  usuarioAutenticado: Object,
});

function cerrarSesion() {
  emits("sesionCerrada");
  router.push({ name: "home" });
}
</script>

<template>
  <header class="bg-white text-dark p-3">
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
      <div class="container-fluid">
        <!-- Logo a la izquierda -->
        <div class="navbar-brand">
          <img src="../assets/logo.svg" width="70px" alt="Logo" />
        </div>

        <!-- Botones de navegación en el centro -->
        <div class="mx-auto">
          <ul class="navbar-nav d-flex flex-row gap-3">
            <li class="nav-item">
              <router-link class="nav-link" to="/">Home</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/gestionusuarios">Gestión</router-link>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#">Preguntas</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#">Exámenes</a>
            </li>
          </ul>
        </div>

        <!-- Botón de "Cerrar sesión" a la derecha -->
        <div v-if="usuarioAutenticado" class="d-flex align-items-center">
          <span class="me-3">Bienvenido, {{ usuarioAutenticado.nombre }} ({{ usuarioAutenticado.rol }})</span>
          <button @click="cerrarSesion" class="btn btn-danger">Cerrar Sesión</button>
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