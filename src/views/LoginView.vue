<script setup>
import { ref } from "vue";
import router from "../router";

let mostrarForm = ref(true);

function cambiarForm() {
  mostrarForm.value = !mostrarForm.value;
  // Limpiar errores y mensajes al cambiar de formulario
  error.value = '';
  mensajeExito.value = '';
}

const API_URL = 'http://localhost/freetours/api.php/usuarios';

const emits = defineEmits(["sesionIniciada"]);
const form = ref({ email: '', password: '' });
const formRegistro = ref({ nombre: '', email: '', contraseña: '', confirmarContraseña: '' });
const error = ref('');
const mensajeExito = ref('');

async function iniciarSesion() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error('Error al cargar los datos');
    }

    const usuarios = await response.json();

    // Buscar el usuario en la lista
    const usuarioEncontrado = usuarios.find(
      (u) => u.email == form.value.email && u.contraseña == form.value.password
    );
    if (usuarioEncontrado) {

      // Emitir el evento con los datos del usuario 
      emits("sesionIniciada", {
        id: usuarioEncontrado.id,
        nombre: usuarioEncontrado.nombre,
        email: usuarioEncontrado.email, 
        rol: usuarioEncontrado.rol
      });

      error.value = '';
      router.push({ name: "home" }); // Redirigir a /home
    } else {
      error.value = 'Email o contraseña incorrectos';
      setTimeout(() => {
        error.value = '';  // Limpiar el mensaje de error después de 3 segundos
      }, 3000);
    }
  } catch (err) {

    error.value = 'Error al cargar los datos';
  }
}

async function registrarUsuario() {
  try {
    // Reiniciar mensaje de error
    error.value = '';
    
    // Validar que todos los campos estén completos
    if (
      formRegistro.value.nombre.trim() == "" ||
      formRegistro.value.email.trim() == "" ||
      formRegistro.value.contraseña.trim() == "" ||
      formRegistro.value.confirmarContraseña.trim() == ""
    ) {
      error.value = 'Todos los campos son obligatorios';
      setTimeout(() => {
        error.value = '';  // Limpiar el mensaje de error después de 3 segundos
      }, 3000);
      return;
    }

    // Validar el formato del email
    if (
      formRegistro.value.email.indexOf("@") == -1 ||
      formRegistro.value.email == ""
    ) {
      error.value = 'El email no es válido';
      setTimeout(() => {
        error.value = '';  // Limpiar el mensaje de error después de 3 segundos
      }, 3000);
      return;
    }
    
    // Validar que las contraseñas coincidan
    if (formRegistro.value.contraseña !== formRegistro.value.confirmarContraseña) {
      error.value = 'Las contraseñas no coinciden';
      setTimeout(() => {
        error.value = '';
      }, 3000);
      return;
    }
    
    // Validar longitud mínima de la contraseña
    if (formRegistro.value.contraseña.length < 6) {
      error.value = 'La contraseña debe tener al menos 6 caracteres';
      setTimeout(() => {
        error.value = '';
      }, 3000);
      return;
    }

    // Crear el objeto de usuario para enviar a la API
    const nuevoUsuario = {
      nombre: formRegistro.value.nombre,
      email: formRegistro.value.email,
      contraseña: formRegistro.value.contraseña,
    };

    // Registrar el usuario
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(nuevoUsuario),
    });

    if (!response.ok) {
      throw new Error('Error al registrar el usuario');
    }

    // Limpiar el formulario de registro
    formRegistro.value = { nombre: '', email: '', contraseña: '', confirmarContraseña: '' };

    // Cambiar al formulario de inicio de sesión
    mostrarForm.value = true;

    // Mostrar un mensaje de éxito
    mensajeExito.value = 'Usuario registrado correctamente. Inicia sesión.';

    // Ocultar el mensaje de éxito después de 3 segundos
    setTimeout(() => {
      mensajeExito.value = '';
    }, 3000);
  } catch (err) {
    console.error("Error en registrarUsuario:", err);
    error.value = 'Error al registrar el usuario';

    // Ocultar el mensaje de error después de 3 segundos
    setTimeout(() => {
      error.value = '';
    }, 3000);
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
              <label for="emailLogIn" class="form-label">Email</label>
              <input v-model="form.email" type="text" id="emailLogIn" class="form-control"
                placeholder="Ingresa tu email">
            </div>
            <div class="mb-3">
              <label for="passwordLogIn" class="form-label">Contraseña</label>
              <input v-model="form.password" type="password" id="passwordLogIn" class="form-control"
                placeholder="Ingresa tu contraseña">
            </div>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <div v-if="mensajeExito" class="alert alert-success">{{ mensajeExito }}</div>
            <div class="mb-3">
              <label class="form-text">
                ¿No está registrado? <a href="#" id="registrarse" class="text-primary"
                  @click.prevent="cambiarForm()">Regístrese</a>
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
              <input v-model="formRegistro.nombre" type="text" id="NombreRegistrar" class="form-control"
                placeholder="Ingresa tu nombre">
            </div>
            <div class="mb-3">
              <label for="emailRegistrar" class="form-label">Email</label>
              <input v-model="formRegistro.email" type="text" id="emailRegistrar" class="form-control"
                placeholder="Ingresa tu email">
            </div>
            <div class="mb-3">
              <label for="contrasenaRegistrar" class="form-label">Contraseña</label>
              <input v-model="formRegistro.contraseña" type="password" id="contrasenaRegistrar" class="form-control"
                placeholder="Crea una contraseña">
              <div class="form-text">La contraseña debe tener al menos 6 caracteres.</div>
            </div>
            <div class="mb-3">
              <label for="confirmarContrasena" class="form-label">Confirmar Contraseña</label>
              <input v-model="formRegistro.confirmarContraseña" type="password" id="confirmarContrasena" class="form-control"
                placeholder="Confirma tu contraseña">
            </div>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <div class="mb-3">
              <label class="form-text">
                ¿Ya estás registrado? <a href="#" id="iniciarSesion" class="text-primary"
                  @click.prevent="cambiarForm()">Iniciar Sesión</a>
              </label>
            </div>
            <button @click.prevent="registrarUsuario" type="submit" class="btn btn-success w-100">Registrar</button>
          </form>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>

.alert {
  transition: opacity 0.3s ease-in-out;
}

/* Estilo para indicar si las contraseñas no coinciden */
input.is-invalid {
  border-color: #dc3545;
  padding-right: calc(1.5em + 0.75rem);
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12' fill='none' stroke='%23dc3545'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23dc3545' stroke='none'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right calc(0.375em + 0.1875rem) center;
  background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);
}

input.is-valid {
  border-color: #198754;
  padding-right: calc(1.5em + 0.75rem);
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3cpath fill='%23198754' d='M2.3 6.73L.6 4.53c-.4-1.04.46-1.4 1.1-.8l1.1 1.4 3.4-3.8c.6-.63 1.6-.27 1.2.7l-4 4.6c-.43.5-.8.4-1.1.1z'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right calc(0.375em + 0.1875rem) center;
  background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);
}
</style>