<script setup>
import { ref, onMounted } from "vue";

// Props
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});

// Estado reactivo para la ruta
const ruta = ref({});
const error = ref("");

// Función para cargar los datos de la ruta desde la API
async function cargarRuta() {
  try {
    // Fetch para obtener los datos de la ruta
    const response = await fetch(`http://localhost/freetours/api.php/rutas?id=${props.id}`);
    if (!response.ok) {
      throw new Error(`Error al cargar la ruta: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Datos de la ruta:", data);

    // Fetch para obtener las valoraciones de la ruta
    const responseValoraciones = await fetch(`http://localhost/freetours/api.php/valoraciones?ruta_id=${props.id}`);
    if (!responseValoraciones.ok) {
      throw new Error(`Error al cargar las valoraciones: ${responseValoraciones.status} ${responseValoraciones.statusText}`);
    }

    const valoraciones = await responseValoraciones.json();
    console.log("Valoraciones:", valoraciones);

    // Asignamos los datos a la ruta
    ruta.value = {
      ...data,
      valoraciones,
    };
  } catch (err) {
    console.error("Error:", err);
    error.value = `No se pudieron cargar los datos de la ruta. ${err.message}`;
  }
}

// Cargar los datos de la ruta al montar el componente
onMounted(() => {
  cargarRuta();
});
</script>

<template>
  <div class="container-fluid px-0">
    <!-- Imagen de la ruta con margen -->
    <div class="w-100 ">
      <img :src="`/img/${ruta.foto}`" alt="Imagen de la ruta" class="img-fluid w-100 rounded" style="height: 400px; background-size: cover;">
    </div>

    <!-- Título de la ruta -->
    <h1 class="text-center my-4 display-4 fw-bold">{{ ruta.titulo }}</h1>

    <!-- Detalles de la ruta -->
    <div class="container">
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <p class="card-text">{{ ruta.descripcion }}</p>
          <p class="card-text"><strong>Localidad:</strong> {{ ruta.localidad }}</p>
          <p class="card-text"><strong>Fecha:</strong> {{ ruta.fecha }}</p>
          <p class="card-text"><strong>Hora:</strong> {{ ruta.hora }}</p>
        </div>
      </div>

      <!-- Valoraciones de la ruta -->
      <div class="card shadow-sm">
        <div class="card-body">
          <h5 class="card-title">Valoraciones:</h5>
          <div v-if="ruta.valoraciones && ruta.valoraciones.length > 0">
            <div v-for="(valoracion, index) in ruta.valoraciones" :key="index" class="mb-3">
              <div class="d-flex align-items-center">
                <span class="badge bg-primary me-2">{{ valoracion.puntuacion }} ★</span>
                <p class="mb-0">{{ valoracion.comentario }}</p>
              </div>
              <small class="text-muted">{{ valoracion.fecha_valoracion }}</small>
            </div>
          </div>
          <p v-else class="text-muted">No hay valoraciones para esta ruta.</p>
        </div>
      </div>

      <!-- Mensaje de error -->
      <div v-if="error" class="alert alert-danger text-center">{{ error }}</div>
    </div>
  </div>
</template>

<style scoped>
/* Estilos personalizados para la página */
.container-fluid {
  padding: 0;
}

h1 {
  font-size: 3rem; /* Tamaño grande para el título */
  font-weight: bold; /* Texto en negrita */
  margin-top: 1rem; /* Espacio arriba del título */
  margin-bottom: 2rem; /* Espacio debajo del título */
}

.card {
  margin-bottom: 20px;
}

.card-title {
  font-size: 1.5rem;
  font-weight: bold;
}

.card-text {
  font-size: 1rem;
}

.badge {
  font-size: 1rem;
}

.img-fluid {
  max-width: 100%;
  height: auto;
}
</style>