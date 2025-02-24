<script setup>
import Header from './components/Header.vue';
import Footer from './components/Footer.vue';
import { ref } from "vue";

// Estado reactivo para almacenar la información de la sesión
const sesion = ref(JSON.parse(localStorage.getItem("sesion")));

// Función para actualizar los datos de la sesión
function actualizaDatosSesion(usuario) {
  sesion.value = usuario; // Actualiza el estado reactivo
  if (usuario) {
    localStorage.setItem("sesion", JSON.stringify(usuario)); // Guarda en localStorage
  } else {
    localStorage.removeItem("sesion"); // Elimina del localStorage si no hay usuario
  }
}
</script>

<template>
  <div class="layout">
    <!-- Header: Recibe el usuario autenticado y maneja el evento de cierre de sesión -->
    <Header :usuarioAutenticado="sesion" @sesionCerrada="actualizaDatosSesion" title="Toqueteando" />

    <!-- RouterView: Maneja las rutas y emite el evento cuando se inicia sesión -->
    <RouterView @sesionIniciada="actualizaDatosSesion" :usuarioAutenticado="sesion"></RouterView>

    <!-- Footer -->
    <Footer />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
</style>