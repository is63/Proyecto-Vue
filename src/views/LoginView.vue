<script setup>
import { ref } from "vue";
import router from "../router";

let mostrarForm = ref(true);

function cambiarForm() {
  mostrarForm.value = !mostrarForm.value;
}

const API_URL = 'http://localhost/freetours/api.php/usuarios';

const emits = defineEmits(["sesionIniciada"]);
const form = ref({ nombre: '', password: '' });
const error = ref('');

async function iniciarSesion() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error('Error al cargar los datos');
    }

    const usuarios = await response.json();
    console.log("Usuarios cargados:", usuarios); // Para depuración

    // Buscar el usuario en la lista
    const usuarioEncontrado = usuarios.find(
        (u) => u.nombre === form.value.nombre && u.contraseña === form.value.password
    );

    if (usuarioEncontrado) {
      console.log("Usuario encontrado:", usuarioEncontrado); // Para depuración

      // Emitir el evento con los datos del usuario autenticado
      emits("sesionIniciada", {
        nombre: usuarioEncontrado.nombre,
        rol: usuarioEncontrado.rol,
      });

      error.value = '';
      router.push({ name: "home" }); // Redirigir a /home
    } else {
      error.value = 'Usuario o contraseña incorrectos';
    }
  } catch (err) {
    console.error("Error en iniciarSesion:", err); // Para depuración
    error.value = 'Error al cargar los datos';
  }
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
              <label for="emailLogIn" class="form-label">Nombre de usuario</label>
              <input v-model="form.nombre" type="text" id="emailLogIn" class="form-control" placeholder="Ingresa tu nombre">
            </div>
            <div class="mb-3">
              <label for="passwordLogIn" class="form-label">Contraseña</label>
              <input v-model="form.password" type="password" id="passwordLogIn" class="form-control" placeholder="Ingresa tu contraseña">
            </div>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <div class="mb-3">
              <label class="form-text">
                ¿No está registrado? <a href="#" id="registrarse" class="text-primary" @click.prevent="cambiarForm()">Regístrese</a>
              </label>
            </div>
            <button @click.prevent="iniciarSesion()" type="submit" class="btn btn-primary w-100">Log In</button>
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
              <label class="form-text">
                ¿Ya estás registrado? <a href="#" id="iniciarSesion" class="text-primary" @click.prevent="cambiarForm()">Iniciar Sesión</a>
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