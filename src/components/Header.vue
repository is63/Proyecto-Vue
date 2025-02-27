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
      <div class="container-fluid">
        <!-- Logo y Nombre -->
        <router-link to="/" class="navbar-brand d-flex align-items-center">
          <img src="../../img/olimpo.png" class="logo me-2" alt="Logo" />
          <span class="text-gold fs-4 fw-bold text-shadow">Olé Tours</span>
        </router-link>

        <!-- Contenido colapsable -->
        <div class="collapse navbar-collapse justify-content-between" id="navbarContent">
          <!-- Espacio a la izquierda para centrar el menú -->
          <div class="invisible navbar-brand">
            <span class="invisible">Espaciador</span>
          </div>

          <!-- Menú de navegación -->
          <ul v-if="usuarioAutenticado" class="navbar-nav">
            <!-- Menú para administradores -->
            <template v-if="usuarioAutenticado.rol === 'admin'">
              <li class="nav-item">
                <router-link class="nav-link btn-custom" to="/">Home</router-link>
              </li>
              <li class="nav-item">
                <router-link class="nav-link btn-custom" to="/gestionusuarios">Gestionar Usuarios</router-link>
              </li>
              <li class="nav-item">
                <router-link class="nav-link btn-custom" to="/crearRuta">Crear Rutas</router-link>
              </li>
            </template>
            
            <!-- Menú para guías -->
            <template v-else-if="usuarioAutenticado.rol === 'guia'">
              <li class="nav-item">
                <router-link class="nav-link btn-custom" to="/">Home</router-link>
              </li>
              <li class="nav-item">
                <router-link class="nav-link btn-custom" to="/rutasAsignadas">Rutas Asignadas</router-link>
              </li>
            </template>
          </ul>

          <!-- Botón de Sesión - Separado a la derecha -->
          <div class="nav-item">
            <div v-if="usuarioAutenticado" class="d-flex flex-column flex-lg-row align-items-center">
              <span class="me-lg-3 mb-2 mb-lg-0 text-center">
                <label class="fw-bold">{{ usuarioAutenticado.nombre }}</label>,
                <label class="text-gold fw-bold"> {{ usuarioAutenticado.rol }} </label>
              </span>
              <button @click="cerrarSesion" class="btn btn-danger">Cerrar Sesión</button>
            </div>
            <router-link v-else to="/login" class="nav-link btn-login">Iniciar Sesión</router-link>
          </div>
        </div>
      </div>
    </nav>
  </header>
</template>

<style scoped>

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

/* Update navbar styles */
.navbar-nav {
  gap: 2rem;
  display: flex;
  align-items: center;
}

@media (max-width: 991.98px) {
  .navbar-nav {
    text-align: center;
    margin: 1rem 0;
  }
  
  .nav-item {
    margin: 0.5rem 0;
  }
  
  .navbar-collapse {
    padding: 1rem 0;
    text-align: center;
  }

  .invisible {
    display: none;
  }
}

</style>
