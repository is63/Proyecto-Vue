<script setup>
// Definir las propiedades y referencias necesarias
import { ref, onMounted } from 'vue';
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";

// Propiedades recibidas
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});

const ruta = ref({});
const guias = ref([]);
const error = ref("");
let map = null;

// Estados para el modal de duplicar
const nuevaFecha = ref("");
const nuevaHora = ref("");
const nuevoGuia = ref("");

// Estado para el modal de confirmación
const mostrarConfirmacion = ref(false);
const mensajeConfirmacion = ref("");
const confirmacionExitosa = ref(false);

// Función para cargar datos de la ruta y guías
async function cargarDatos() {
  try {
    const responseRuta = await fetch(`http://localhost/freetours/api.php/rutas?id=${props.id}`);
    if (!responseRuta.ok) {
      throw new Error(`Error al cargar la ruta: ${responseRuta.status} ${responseRuta.statusText}`);
    }
    const dataRuta = await responseRuta.json();
    ruta.value = dataRuta;

    // Cargar guías disponibles
    const responseGuias = await fetch("http://localhost/freetours/api.php/usuarios");
    if (!responseGuias.ok) {
      throw new Error(`Error al cargar los guías: ${responseGuias.status} ${responseGuias.statusText}`);
    }
    const dataGuias = await responseGuias.json();
    guias.value = dataGuias.filter(usuario => usuario.rol === "guia");

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

// Inicializar Flatpickr para fecha y hora
onMounted(() => {
  cargarDatos();

  // Configuración de Flatpickr para la fecha
  flatpickr("#fechaPicker", {
    dateFormat: "Y-m-d", // Formato de fecha
    defaultDate: new Date(), // Fecha por defecto (hoy)
    minDate: "today", // No permitir fechas anteriores a hoy
    onChange: (selectedDates, dateStr) => {
      nuevaFecha.value = dateStr; // Asignar la fecha seleccionada
    },
    static: true, // Hacer el calendario estático
    position: "bottom", // Asegura que el calendario se muestre abajo
  });

  // Configuración de Flatpickr para la hora
  flatpickr("#horaPicker", {
    enableTime: true, // Habilitar selector de hora
    noCalendar: true, // Ocultar el calendario
    dateFormat: "H:i:S", // Formato de hora (HH:MM:SS)
    time_24hr: true, // Usar formato de 24 horas
    onChange: (selectedDates, dateStr) => {
      nuevaHora.value = dateStr; // Asignar la hora seleccionada
    },
  });
});

// Función para duplicar la ruta
async function duplicarRuta() {
  // Crear el objeto de datos para la duplicación
  const rutaData = {
    titulo: ruta.value.titulo,
    localidad: ruta.value.localidad,
    descripcion: ruta.value.descripcion,
    foto: ruta.value.foto,
    fecha: nuevaFecha.value,
    hora: nuevaHora.value,
    latitud: ruta.value.latitud,
    longitud: ruta.value.longitud,
    guia_id: nuevoGuia.value || null, // Asignar guía si se seleccionó uno
  };

  try {
    // Realizar la llamada a la API para duplicar la ruta
    const response = await fetch("http://localhost/freetours/api.php/rutas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rutaData),
    });

    if (response.ok) {
      mensajeConfirmacion.value = "Ruta duplicada con éxito";
      confirmacionExitosa.value = true;
    } else {
      throw new Error("Error al duplicar la ruta");
    }

    // Mostrar el modal de confirmación y cerrar después de 3 segundos
    mostrarConfirmacion.value = true;
    setTimeout(() => {
      mostrarConfirmacion.value = false;

      // Limpiar los campos del modal después de la duplicación exitosa
      nuevaFecha.value = "";
      nuevaHora.value = "";
      nuevoGuia.value = "";
    }, 3000);

  } catch (error) {
    mensajeConfirmacion.value = "Error al duplicar la ruta";
    confirmacionExitosa.value = false;

    // Mostrar el modal de error y cerrarlo después de 3 segundos
    mostrarConfirmacion.value = true;
    setTimeout(() => {
      mostrarConfirmacion.value = false;
    }, 3000);
  }
}
</script>

<template>
  <div class="container-fluid px-0">
    <!-- Imagen principal de la ruta -->
    <div class="w-100">
      <img :src="`/img/${ruta.foto}`" alt="Imagen de la ruta" class="img-fluid w-100 rounded" style="height: 400px; object-fit: cover;">
    </div>

    <!-- Título de la ruta -->
    <h1 class="text-center my-4 display-4 fw-bold">{{ ruta.titulo }}</h1>

    <div class="container">
      <div class="row justify-content-between">
        <!-- Columna izquierda: Descripción y Mapa -->
        <div class="col-md-7 pe-md-5">
          <div class="mb-4 descripcion-container">
            <p class="descripcion">{{ ruta.descripcion }}</p>
          </div>

          <div class="mb-4 map-container">
            <div id="map" class="map-styled"></div>
          </div>
        </div>

        <!-- Columna derecha: Detalles y Botones -->
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

          <!-- Botones de acciones -->
          <div class="btn-group mb-3 w-100" role="group">
            <button type="button" class="btn btn-primary">Editar</button>
            <button type="button" class="btn btn-danger">Borrar</button>
            <button type="button" class="btn btn-secondary" data-bs-toggle="modal" data-bs-target="#duplicarModal">Duplicar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para Duplicar Ruta -->
    <div class="modal fade" id="duplicarModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Duplicar Ruta</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <!-- Campo de fecha con Flatpickr -->
            <div class="mb-3">
              <label class="form-label">Fecha</label> <br>
              <input
                  type="text"
                  class="form-control"
                  id="fechaPicker"
                  v-model="nuevaFecha"
                  placeholder="Seleccione una fecha"
                  readonly style="width: 465px">
            </div>

            <!-- Campo de hora con Flatpickr -->
            <div class="mb-3">
              <label class="form-label">Hora (HH:MM:SS)</label>
              <input
                  type="text"
                  class="form-control"
                  id="horaPicker"
                  v-model="nuevaHora"
                  placeholder="Seleccione una hora"
                  readonly>
            </div>

            <!-- Selector de guía -->
            <div class="mb-3">
              <label class="form-label">Nuevo Guía</label>
              <select class="form-select" v-model="nuevoGuia">
                <option value="" disabled>Seleccione un guía</option>
                <option v-for="guia in guias" :key="guia.id" :value="guia.id">{{ guia.nombre }}</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" @click="duplicarRuta">Duplicar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmación -->
    <div v-if="mostrarConfirmacion" class="modal fade show" tabindex="-1" aria-hidden="true" style="display: block;">
      <div class="modal-dialog">
        <div :class="['modal-content', confirmacionExitosa ? 'bg-success' : 'bg-danger']">
          <div class="modal-body">
            <!-- Mensaje con texto más pequeño y sin negrita -->
            <p class="text-white fs-5 text-center" v-if="confirmacionExitosa">{{ mensajeConfirmacion }}</p>
            <p class="text-white fs-5 text-center" v-if="!confirmacionExitosa">{{ mensajeConfirmacion }}</p>
          </div>
        </div>
      </div>
    </div>
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

.btn-group .btn {
  width: 33.33%;
}

/* Estilo para el calendario en el modal */
.flatpickr-calendar {
  width: 100% !important; /* Asegura que el calendario ocupe todo el ancho disponible */
  margin-top: 10px; /* Añade un pequeño margen superior */
  position: absolute; /* Asegura que el calendario quede alineado con el campo */
  top: 0;
  left: 0;
}

/* Asegura que el campo de entrada y el calendario estén alineados adecuadamente */
#fechaPicker {
  width: 100%; /* Hace que el campo de fecha ocupe todo el ancho */
  display: inline-block;
}

/* Asegura que el contenedor del calendario tiene suficiente espacio debajo del campo */
.modal-body {
  position: relative;

}

.flatpickr-calendar {
  z-index: 1050 !important; /* Asegura que el calendario esté encima del modal */
}
.bg-success {
  background-color: #28a745 !important;
}

.bg-danger {
  background-color: #dc3545 !important;
}

.text-white {
  color: white !important;
}

.fs-5 {
  font-size: 1.25rem !important; /* Tamaño de texto un poco más pequeño */
}

.text-center {
  text-align: center !important;
}
</style>
