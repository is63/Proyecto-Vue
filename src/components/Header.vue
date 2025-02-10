<script setup>
import router from "../router";
import { ref } from "vue"

const emits = defineEmits(["sesionCerrada"]);

const props = defineProps({
  title: String,
  usuarioAutenticado: Object,
});



function cerrarSesion() {

  emits("sesionCerrada")
  router.push({ name: "home" });

}
</script>


<template>
  <header class="bg-white text-dark  p-3">
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
      <div class="row">
        <div class="col-6"></div>
        <div class="col-6">
          <div class="text-center">
            <img class="nav-item" src="../assets/logo.svg" width="100px">
            <ul class="navbar-nav ">
              <li class="nav-item">
                <a class="nav-link" href="#">Preguntas </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#">Categorias</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#">Examenes</a>
              </li>
              <li class="nav-item">
                <router-link class="nav-link" to="/gestionusuarios">Gestion</router-link>
              </li>
              <li class="nav-item">
                <router-link class="nav-link" to="/">Home</router-link>
              </li>
              <li class="nav-item">
                <router-link class="nav-link" to="/login">Login</router-link>
              </li>
            </ul>
          </div>
          <div v-if="usuarioAutenticado" class="container text-end">
          <span>Bienvenido, {{ usuarioAutenticado.nombre }} ({{ usuarioAutenticado.rol }})</span>
          <button @click="cerrarSesion" class="btn btn-danger">Cerrar Sesión</button>
        </div>
        </div>
      </div>
    </nav>
  </header>
</template>


<style scoped></style>