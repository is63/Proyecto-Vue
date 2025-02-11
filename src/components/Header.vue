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
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container-fluid">
        <!-- Logo a la izquierda -->
        <div class="navbar-brand">
          <router-link to="/">
            <img src="../assets/img/olimpo.png"  alt="Logo" />
          </router-link>
        </div>
        <div class="navbar-brand ">
            <p class="text-warning fs-2 fw-bold text-shadow mt-4">Olímpo Tours</p>
        </div>

        <!-- Botones de navegación en el centro -->
        <div class="mx-auto">
          <ul class="navbar-nav d-flex flex-row gap-3">
            <li class="nav-item">
              <router-link class="nav-link btn btn-lg" to="/">Home</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link btn btn-lg" to="/gestionusuarios">Gestionar Usuarios</router-link>
            </li>
            <li class="nav-item">
              <a class="nav-link btn btn-lg" href="#">Crear Rutas</a>
            </li>

          </ul>
        </div>

        <!-- Botón de "Iniciar sesión" o "Cerrar sesión" -->
        <div class="d-flex align-items-center nav-item">
          <!-- Mostrar "Cerrar sesión" si hay un usuario autenticado -->
          <div v-if="usuarioAutenticado" class="d-flex align-items-center">
            <span class="me-4"><label class="fw-bold">{{ usuarioAutenticado.nombre }}</label>, rol: <label class="text-success fw-bold"> {{ usuarioAutenticado.rol }} </label></span>
            <button @click="cerrarSesion" class="btn btn-danger ms-2">Cerrar Sesión</button>
          </div>

          <!-- Mostrar "Iniciar sesión" si no hay un usuario autenticado -->
          <router-link v-else to="/login" class="nav-link btn btn-lg text-success fs-4">Iniciar Sesión</router-link>
        </div>
      </div>
    </nav>
  </header>
</template>

<style scoped>

.navbar-nav .nav-link {
  font-weight: 500;
}

.navbar-nav .nav-link:hover {
  color: #007bff;
}
.text-shadow {
 
  text-shadow: 1px 0 0 black, -1px 0 0 black, 0 1px 0 black, 0 -1px 0 black;
}

.text-success{
  color: rgb(17, 177, 17) !important;
}

</style>