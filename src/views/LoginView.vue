<script setup>
import { ref } from "vue"
import router from "../router";

const emits = defineEmits(["sesionIniciada"]);
const form = ref({ usuario: '', password: '' });
const error = ref('');

async function iniciarSesion() {
    try {
        const response = await fetch('/usuarios.json');
        const usuarios = await response.json();
        const usuarioEncontrado = usuarios.find(
            (u) => u.usuario === form.value.usuario && u.password === form.value.password
        );
        if (usuarioEncontrado) {
            //TODO: HABRÍA QUE NOTIFICAR A APP.VUE CON UN EMIT PARA QUE SEPA QUE LA SESIÓN ESTÁ INICIADA
            emits("sesionIniciada", { usuario: usuarioEncontrado.usuario,rol: usuarioEncontrado.rol });
            error.value = '';
            router.push({ name: "home" });

        } else {
            error.value = 'Usuario o contraseña incorrectos';
        }
    } catch (err) {
        error.value = 'Error al cargar los datos';
    }
}

</script>


<template>
    <form>
        <label>Nombre</label>
        <input v-model="form.usuario" type="text" />
        <label>Contraseña</label>
        <input v-model="form.password" type="password" />
        <p v-if="error" class="text-danger mt-2"> {{ error }}</p>
        <button @click.prevent="iniciarSesion"> Iniciar Sesion</button>
    </form>
</template>