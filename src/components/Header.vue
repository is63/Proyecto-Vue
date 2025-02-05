<script setup>
import router from "../router";
import {ref} from "vue"

const emits = defineEmits(["sesionCerrada"]);

const props = defineProps({
  title: String,
  usuarioAutenticado: Object,
});



function cerrarSesion() {
    
  emits("sesionCerrada")
    router.push({name:"home"});

}
</script>


<template>
    <header class="bg-white text-dark  p-3">
      <div class="row">
        <h1 class="col-8">{{ title }}</h1>
        <div class="col-4">

        <div v-if="usuarioAutenticado" class="container text-end">
          <span>Bienvenido, {{ usuarioAutenticado.usuario }} ({{ usuarioAutenticado.rol }})</span>
          <button @click="cerrarSesion" class="btn btn-danger">Cerrar Sesión</button>
        </div>
      </div>
      </div>
  </header>
</template>
  
 
<style scoped>

</style>
  