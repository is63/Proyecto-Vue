<script setup>
import router from "../router";
import { ref } from "vue";

const emits = defineEmits(["sesionCerrada"]);

const props = defineProps({
  title: String,
  usuarioAutenticado: Object,
});

function cerrarSesion() {
  emits("sesionCerrada", null);
  router.push({ name: "home" });
}
</script>

<template>
  <header class="bg-primary-dark text-light">
    <nav class="navbar navbar-expand-lg navbar-dark py-2">
      <div class="container-fluid d-flex justify-content-between align-items-center">
        <!-- Logo y Nombre -->
        <div class="d-flex align-items-center">
          <router-link to="/" class="me-2 d-flex align-items-center text-decoration-none">
            <img src="../../img/olimpo.png" class="logo me-2" alt="Logo" />
            <span class="text-gold fs-4 fw-bold text-shadow">Olímpo Tours</span>
          </router-link>
        </div>

        <!-- Menú de navegación -->
        <ul v-if="usuarioAutenticado && usuarioAutenticado.rol === 'admin'" class="navbar-nav flex-row gap-3">
          <li class="nav-item">
            <router-link class="nav-link btn-custom" to="/">Home</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link btn-custom" to="/gestionusuarios">Gestionar Usuarios</router-link>
          </li>
          <li class="nav-item">
            <router-link class="nav-link btn-custom" to="/crearRuta">Crear Rutas</router-link>
          </li>
        </ul>

        <!-- Botón de Sesión -->
        <div class="nav-item">
          <div v-if="usuarioAutenticado" class="d-flex align-items-center">
            <span class="me-3">
              <label class="fw-bold">{{ usuarioAutenticado.nombre }}</label>,
              <label class="text-gold fw-bold"> {{ usuarioAutenticado.rol }} </label>
            </span>
            <button @click="cerrarSesion" class="btn btn-danger">Cerrar Sesión</button>
          </div>
          <router-link v-else to="/login" class="nav-link btn-login">Iniciar Sesión</router-link>
        </div>
      </div>
    </nav>
  </header>
</template>

<style scoped>
*{
font-family: monocraft;
}

.bg-primary-dark {
  background-color: #1a1a2e; /* Azul oscuro elegante */
}

.text-light {
  color: #ffffff !important;
}

.text-gold {
  color: #f4a261 !important; /* Dorado elegante */
}

.text-shadow {
  text-shadow: 1px 1px 2px black;
}

/* Ajuste del tamaño del header */
.navbar {
  height: 70px; /* Reduce la altura */
}

/* Logo */
.logo {
  width: 50px;
  height: 50px; /* Altura fija para mejor alineación */
  object-fit: contain; /* Mantiene la proporción de la imagen */
}

router-link {
  text-decoration: none !important;
}

/* Estilos de los botones de navegación */
.btn-custom {
  color: #f4a261;
  font-weight: 600;
  font-size: 1.2rem; /* Aumentado el tamaño de fuente */
  transition: all 0.3s ease;
}

.btn-custom:hover {
  color: #ffffff;
  background-color: rgba(244, 162, 97, 0.2);
  border-radius: 5px;
}

/* Estilo del botón de login */
.btn-login {
  color: #f4a261;
  font-size: 1.3em; /* Aumentado el tamaño */
  font-weight: bold;
  transition: all 0.3s ease;
}

.btn-login:hover {
  color: #ffffff;
}

/* Estilo del botón de cerrar sesión */
.btn-danger {
  background-color: #e63946;
  border: none;
  font-weight: bold;
  transition: all 0.3s ease;
}

.btn-danger:hover {
  background-color: #d62828;
}
</style>
