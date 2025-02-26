<script setup>
import Header from './components/Header.vue';
import Footer from './components/Footer.vue';
import { ref } from "vue";

const sesion = ref(JSON.parse(localStorage.getItem("sesion")));

function actualizaDatosSesion(usuario) {
  console.log("Actualizando sesión:", usuario); // Debug
  sesion.value = usuario;
  if (usuario) {
    localStorage.setItem("sesion", JSON.stringify(usuario));
  } else {
    localStorage.removeItem("sesion");
  }
}
</script>

<template>
  <div class="layout">
    <Header :usuarioAutenticado="sesion" @sesionCerrada="actualizaDatosSesion" title="Toqueteando" />
    <RouterView 
      :usuarioAutenticado="sesion" 
      @sesionIniciada="actualizaDatosSesion">
    </RouterView>
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