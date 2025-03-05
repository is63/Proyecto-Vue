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
  <header class="bg-primary-dark text-light sticky-top">
    <nav class="navbar navbar-expand navbar-dark py-2">
      <div class="container-fluid">
        <!-- Logo y Nombre -->
        <router-link to="/" class="navbar-brand d-flex align-items-center">
          <img src="../../img/olimpo.png" class="logo me-2" alt="Logo" />
          <span class="text-gold fw-bold text-shadow title-responsive">Olé Tours</span>
        </router-link>

        <!-- Menú de navegación siempre visible -->
        <div class="nav-container ms-auto">
          <div v-if="usuarioAutenticado" class="d-flex align-items-center">
            <!-- Nombre de usuario - visible solo en pantallas medianas y grandes -->
            <span class="me-3 d-none d-md-inline">
              <span class="fw-bold">{{ usuarioAutenticado.nombre }}</span>
              <span class="text-gold fw-bold">, {{ usuarioAutenticado.rol }}</span>
            </span>
            
            <!-- Menú Principal - Adaptativo -->
            <ul class="navbar-nav flex-row">
              <!-- Menú para administradores -->
              <template v-if="usuarioAutenticado.rol === 'admin'">
                <li class="nav-item mx-1">
                  <router-link class="nav-link btn-nav-icon" to="/" title="Home">
                    <i class="bi bi-house-door-fill d-block d-lg-none"></i>
                    <span class="d-none d-lg-block">Home</span>
                  </router-link>
                </li>
                <li class="nav-item mx-1">
                  <router-link class="nav-link btn-nav-icon" to="/gestionusuarios" title="Gestionar Usuarios">
                    <i class="bi bi-people-fill d-block d-lg-none"></i>
                    <span class="d-none d-lg-block">Gestionar Usuarios</span>
                  </router-link>
                </li>
                <li class="nav-item mx-1">
                  <router-link class="nav-link btn-nav-icon" to="/crearRuta" title="Crear Rutas">
                    <i class="bi bi-plus-circle-fill d-block d-lg-none"></i>
                    <span class="d-none d-lg-block">Crear Rutas</span>
                  </router-link>
                </li>
              </template>
              
              <!-- Menú para guías -->
              <template v-else-if="usuarioAutenticado.rol === 'guia'">
                <li class="nav-item mx-1">
                  <router-link class="nav-link btn-nav-icon" to="/" title="Home">
                    <i class="bi bi-house-door-fill d-block d-lg-none"></i>
                    <span class="d-none d-lg-block">Home</span>
                  </router-link>
                </li>
                <li class="nav-item mx-1">
                  <router-link class="nav-link btn-nav-icon" to="/rutasAsignadas" title="Rutas Asignadas">
                    <i class="bi bi-map-fill d-block d-lg-none"></i>
                    <span class="d-none d-lg-block">Rutas Asignadas</span>
                  </router-link>
                </li>
              </template>
              
              <!-- Menú para clientes -->
              <template v-else-if="usuarioAutenticado.rol === 'cliente'">
                <li class="nav-item mx-1">
                  <router-link class="nav-link btn-nav-icon" to="/" title="Home">
                    <i class="bi bi-house-door-fill d-block d-lg-none"></i>
                    <span class="d-none d-lg-block">Home</span>
                  </router-link>
                </li>
                <li class="nav-item mx-1">
                  <router-link class="nav-link btn-nav-icon" to="/misReservas" title="Mis Reservas">
                    <i class="bi bi-bookmark-fill d-block d-lg-none"></i>
                    <span class="d-none d-lg-block">Mis Reservas</span>
                  </router-link>
                </li>
              </template>
              
              <!-- Botón de cerrar sesión -->
              <li class="nav-item mx-1">
                <button @click="cerrarSesion" class="btn btn-danger btn-sm py-1 logout-btn" title="Cerrar Sesión">
                  <i class="bi bi-box-arrow-right d-block d-lg-none"></i>
                  <span class="d-none d-lg-block">Cerrar Sesión</span>
                </button>
              </li>
            </ul>
          </div>
          
          <!-- Si no hay usuario autenticado -->
          <router-link v-else to="/login" class="nav-link btn-login">
            <i class="bi bi-person-fill d-inline d-lg-none me-1"></i>
            Iniciar Sesión
          </router-link>
        </div>
      </div>
    </nav>
  </header>
</template>

<style scoped>
/* Importar iconos de Bootstraop */
@import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css");

.bg-primary-dark {
  background-color: #1a1a2e;
}

.text-light {
  color: #ffffff !important;
}

.text-gold {
  color: #f4a261 !important;
}

.text-shadow {
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
}

/* Logo */
.logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

/* Contenedor principal de navegación */
.nav-container {
  display: flex;
  align-items: center;
}

/* Estilos para botones de navegación */
.btn-nav-icon {
  color: #f4a261;
  font-weight: 600;
  transition: all 0.3s ease;
  text-align: center;
  padding: 0.4rem 0.7rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-nav-icon:hover {
  color: #ffffff;
  background-color: rgba(244, 162, 97, 0.2);
}

.btn-nav-icon i {
  font-size: 1.3rem;
}

/* Estilo del botón de login */
.btn-login {
  color: #f4a261;
  font-weight: bold;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
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
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-danger:hover {
  background-color: #d62828;
}

/* Botón cerrar sesión más pequeño en móviles */
.logout-btn {
  min-height: 38px;
}

.logout-btn i {
  font-size: 1.3rem;
}

/* Media queries para mejor adaptación */
@media (max-width: 991.98px) {
  .navbar-nav {
    gap: 0.5rem;
  }
  
  .logo {
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 767.98px) {
  .navbar-nav {
    background: none;
    padding: 0;
  }
  
  .nav-item.mx-1 {
    margin-left: 0.1rem !important;
    margin-right: 0.1rem !important;
  }
}

@media (max-width: 575.98px) {
  .logo {
    width: 32px;
    height: 32px;
  }
  
  .text-gold.fs-4 {
    font-size: 1.1rem !important;
  }
}

.title-responsive {
  font-size: 1.5rem;
}

@media (max-width: 575.98px) {
  .title-responsive {
    font-size: 1.2rem;
  }
}

@media (max-width: 370px) {
  .title-responsive {
    font-size: 1rem;
  }
}
</style>
