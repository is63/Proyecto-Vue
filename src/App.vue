<script setup>
import Header from './components/Header.vue';
import Footer from './components/Footer.vue';
import { ref } from "vue";

const sesion = ref(JSON.parse(localStorage.getItem("sesion")));

function actualizaDatosSesion(usuario) {
  console.log("Actualizando sesión:", usuario); 
  if (usuario) {

    if (!usuario.email) {
      console.error("Error: El objeto usuario no contiene un email", usuario);
    }


    sesion.value = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol
    };

    // Guardar en localStorage
    localStorage.setItem("sesion", JSON.stringify(sesion.value));
    console.log("Sesión guardada:", sesion.value); 
  } else {
    sesion.value = null;
    localStorage.removeItem("sesion");
    console.log("Sesión cerrada"); 
  }
}
</script>

<template>
  <div class="layout">
    <Header :usuarioAutenticado="sesion" @sesionCerrada="actualizaDatosSesion" title="Toqueteando" />
    <RouterView :usuarioAutenticado="sesion" @sesionIniciada="actualizaDatosSesion">
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