<script setup>
import { ref } from "vue"
import router from "../router";


let mostrarForm = ref(true);

function cambiarForm() {
  mostrarForm.value = !mostrarForm.value;
}


</script>


<template>

  <main class="mt-5">
    <!-- Formulario de Inicio de Sesión -->
    <div v-if="mostrarForm">
      <div id="formLogIn" class="row justify-content-center">
        <div class="col-12 col-md-6 col-lg-4">
          <form id="botonLogIn" class="border p-4 shadow-sm rounded bg-white">
            <h2 class="text-center mb-4">Iniciar Sesión</h2>
            <div class="mb-3">
              <label for="emailLogIn" class="form-label">Email</label>
              <input type="text" id="emailLogIn" class="form-control" placeholder="Ingresa tu email">
            </div>
            <div class="mb-3">
              <label for="passwordLogIn" class="form-label">Contraseña</label>
              <input type="password" id="passwordLogIn" class="form-control" placeholder="Ingresa tu contraseña">
            </div>
            <div class="mb-3">
              <label class="form-text">
                ¿No está registrado? <a href="#" id="registrarse" class="text-primary" @click="cambiarForm()">Regístrese</a>
              </label>
            </div>
            <button type="submit" class="btn btn-primary w-100">Log In</button>
          </form>
        </div>
      </div>
    </div>


    <!-- Formulario de Registro -->

    <div v-if="!mostrarForm">
      <div id="formRegistrar" class="row justify-content-center mt-5">
        <div class="col-12 col-md-6 col-lg-4">

          <form id="botonRegistrar" class="border p-4 shadow-sm rounded bg-white">
            <h2 class="text-center mb-4">Registrarse</h2>
            <div class="mb-3">
              <label for="NombreRegistrar" class="form-label">Nombre</label>
              <input type="text" id="NombreRegistrar" class="form-control" placeholder="Ingresa tu nombre">
            </div>
            <div class="mb-3">
              <label for="ApellidosRegistrar" class="form-label">Apellidos</label>
              <input type="text" id="ApellidosRegistrar" class="form-control" placeholder="Ingresa tu apellido">
            </div>
            <div class="mb-3">
              <label for="emailRegistrar" class="form-label">Email</label>
              <input type="text" id="emailRegistrar" class="form-control" placeholder="Ingresa tu email">
            </div>
            <div class="mb-3">
              <label for="contrasenaRegistrar" class="form-label">Contraseña</label>
              <input type="password" id="contrasenaRegistrar" class="form-control" placeholder="Crea una contraseña">
            </div>
            <div class="mb-3">
            </div>
            <div class="mb-3">
              <label class="form-text">
                ¿Ya estás registrado? <a href="#" id="iniciarSesion" class="text-primary" @click="cambiarForm()">Iniciar Sesión</a>
              </label>
            </div>
            <button type="submit" class="btn btn-success w-100">Registrar</button>
          </form>
        </div>
      </div>

    </div>
  </main>
</template>

<style scoped></style>