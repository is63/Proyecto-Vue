<script setup>
import router from '../router';
const props = defineProps({
    datosSesion:Object
});


</script>

<template>
    <nav class="navbar navbar-expand-lg navbar-light bg-light d-none">
        <a class="navbar-brand" href="#">Menu</a>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent"
            aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarSupportedContent">
            <ul class="navbar-nav mr-auto">
                <li v-if="datosSesion?.rol=='profe'" class="nav-item active">
                    <a class="nav-link" href="#">Preguntas <span class="sr-only">(current)</span></a>
                </li>
                <li v-if="datosSesion?.rol=='profe'" class="nav-item">
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
    </nav>
    
</template>


<style scoped></style>