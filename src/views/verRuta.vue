<script setup>
import { ref, onMounted } from "vue";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});

const ruta = ref({});
const error = ref("");
let map = null;

async function cargarRuta() {
  try {
    const responseRuta = await fetch(`http://localhost/freetours/api.php/rutas?id=${props.id}`);
    if (!responseRuta.ok) {
      throw new Error(`Error al cargar la ruta: ${responseRuta.status} ${responseRuta.statusText}`);
    }
    const dataRuta = await responseRuta.json();

    const responseRutasCompletas = await fetch(`http://localhost/freetours/api.php/rutas`);
    if (!responseRutasCompletas.ok) {
      throw new Error(`Error al cargar las rutas completas: ${responseRutasCompletas.status} ${responseRutasCompletas.statusText}`);
    }
    const dataRutasCompletas = await responseRutasCompletas.json();

    const rutaCompleta = dataRutasCompletas.find(ruta => ruta.id == props.id);
    const nombreGuia = rutaCompleta ? rutaCompleta.guia_nombre : null;

    const responseValoraciones = await fetch(`http://localhost/freetours/api.php/valoraciones?ruta_id=${props.id}`);
    if (!responseValoraciones.ok) {
      throw new Error(`Error al cargar las valoraciones: ${responseValoraciones.status} ${responseValoraciones.statusText}`);
    }
    const valoraciones = await responseValoraciones.json();

    ruta.value = {
      ...dataRuta,
      guia_nombre: nombreGuia,
      valoraciones,
    };

    if (ruta.value.latitud && ruta.value.longitud) {
      inicializarMapa(ruta.value.latitud, ruta.value.longitud);
    }
  } catch (err) {
    console.error("Error:", err);
    error.value = `No se pudieron cargar los datos de la ruta. ${err.message}`;
  }
}

function inicializarMapa(latitud, longitud) {
  if (map) {
    map.remove();
  }

  map = L.map("map").setView([latitud, longitud], 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  L.marker([latitud, longitud])
      .addTo(map)
      .bindPopup("Punto de encuentro")
      .openPopup();
}

onMounted(() => {
  cargarRuta();
});
</script>

<template>
  <div class="container-fluid px-0">
    <div class="w-100">
      <img :src="`/img/${ruta.foto}`" alt="Imagen de la ruta" class="img-fluid w-100 rounded" style="height: 400px; object-fit: cover;">
    </div>

    <h1 class="text-center my-4 display-4 fw-bold">{{ ruta.titulo }}</h1>

    <div class="container">
      <div class="row justify-content-between">
        <div class="col-md-7 pe-md-5">
          <div class="mb-4 descripcion-container">
            <p class="descripcion">{{ ruta.descripcion }}</p>
          </div>

          <div class="mb-4 map-container">
            <div id="map" class="map-styled"></div>
          </div>
        </div>

        <div class="col-md-4 detalles-col">
          <div class="mb-3">
            <p class="h4 fw-bold text-decoration-underline text-secondary">Localidad</p>
            <p class="detalle">{{ ruta.localidad }}</p>
          </div>

          <div class="mb-3">
            <p class="h4 fw-bold text-decoration-underline text-secondary">Guía</p>
            <p v-if="ruta.guia_nombre" class="detalle">{{ ruta.guia_nombre }}</p>
            <p v-else class="detalle text-muted">No hay guía asignado</p>
          </div>

          <div class="mb-3">
            <p class="h4 fw-bold text-decoration-underline text-secondary">Fecha y Hora</p>
            <p class="detalle">{{ ruta.fecha }}</p>
            <p class="detalle">{{ ruta.hora }}</p>
          </div>

          <!-- Grupo de botones -->
          <div class="btn-group mb-3 w-100" role="group">
            <button type="button" class="btn btn-primary">Editar</button>
            <button type="button" class="btn btn-danger">Borrar</button>
            <button type="button" class="btn btn-secondary">Duplicar</button>
          </div>
        </div>
      </div>

      <!-- Tarjetas de valoraciones -->
      <div class="valoraciones-container mt-4">
        <h5 class="mb-3">Valoraciones:</h5>
        <div class="row justify-content-center">
          <div v-if="ruta.valoraciones && ruta.valoraciones.length > 0">
            <div v-for="(valoracion, index) in ruta.valoraciones" :key="index" class="col-md-4 mb-3 d-flex justify-content-center">
              <div class="card valoracion-card w-100">
                <div class="card-body">
                  <span class="badge bg-primary me-2">{{ valoracion.puntuacion }} ★</span>
                  <p class="mb-0">{{ valoracion.comentario }}</p>
                  <small class="text-muted">{{ valoracion.fecha_valoracion }}</small>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="text-muted text-center">No hay valoraciones para esta ruta.</p>
        </div>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger text-center">{{ error }}</div>
  </div>
</template>

<style scoped>
.container-fluid {
  padding: 0;
}

h1 {
  font-size: 3rem;
  font-weight: bold;
  margin-top: 1rem;
  margin-bottom: 2rem;
}

.descripcion {
  font-size: 1.25rem;
  line-height: 1.6;
}

.map-styled {
  width: 100%;
  height: 350px;
  border-radius: 10px;
}

.detalles-col {
  border-left: 1px solid #e3e3e3;
  padding-left: 30px;
}

.valoraciones-container {
  margin-top: 2rem;
}

.valoracion-card {
  background: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.btn-group .btn {
  width: 33.33%;
}

@media (max-width: 768px) {
  .col-md-7,
  .col-md-4 {
    flex: 0 0 100%;
    max-width: 100%;
  }

  .detalles-col {
    border-left: none;
    padding-left: 0;
  }
}
</style>
