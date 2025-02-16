<script setup>
import { ref, onMounted } from 'vue';
import "leaflet/dist/leaflet.css";
import L from "leaflet"; // Mapa
import flatpickr from "flatpickr"; //Fecha y Hora (Calendario)
import "flatpickr/dist/flatpickr.min.css";

// Propiedades recibidas del componente padre
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});

// Variables reactivas
const ruta = ref({}); // Almacenar los datos de la ruta
const guias = ref([]); // Guardar los guías disponibles
const error = ref(""); //  mostrar mensajes de error

let map = null; // Variable para guardar el mapa

// Estados para el modal de duplicar
const nuevaFecha = ref(""); // Guardar la fecha seleccionada
const nuevaHora = ref(""); // Guardar la hora seleccionada
const nuevoGuia = ref(""); // Guardar el guía seleccionado

// Estado para el modal de confirmación
const mostrarConfirmacion = ref(false); // Mostrar el modal de confirmación
const mensajeConfirmacion = ref(""); // Guardar el mensaje de confirmación
const confirmacionExitosa = ref(false); // Para saber si la duplicación fue exitosa

// Función para cargar los datos de la ruta y los guias
async function cargarDatos() {
  try {
    // Cargar datos de la ruta actual
    const responseRuta = await fetch(`http://localhost/freetours/api.php/rutas?id=${props.id}`);
    if (!responseRuta.ok) {
      throw new Error(`Error al cargar la ruta: ${responseRuta.status} ${responseRuta.statusText}`);
    }
    const dataRuta = await responseRuta.json();
    ruta.value = dataRuta; // Guardar los datos de la ruta

    // Cargar guias disponibles
    const responseGuias = await fetch("http://localhost/freetours/api.php/usuarios");
    if (!responseGuias.ok) {
      throw new Error(`Error al cargar los guías: ${responseGuias.status} ${responseGuias.statusText}`);
    }
    const dataGuias = await responseGuias.json();
    guias.value = dataGuias.filter(usuario => usuario.rol === "guia"); // Filtrar solo los guías

    // Si la ruta tiene coordenadas, se inicializa el mapa
    if (ruta.value.latitud && ruta.value.longitud) {
      inicializarMapa(ruta.value.latitud, ruta.value.longitud);
    }
  } catch (err) {
    console.error("Error:", err);
    error.value = `No se pudieron cargar los datos de la ruta. ${err.message}`; // Añadir el mensaje de error
  }
}

// Función para inicializar el mapa
function inicializarMapa(latitud, longitud) {
  if (map) {
    map.remove(); // Si ya existe un mapa, se elimina
  }

  map = L.map("map").setView([latitud, longitud], 16); // Crear el mapa

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { //Añadir la "atribucion" al mapa (abajo derecha)
    attribution: '', })
    .addTo(map);

  L.marker([latitud, longitud]) // Crear un marcador
      .addTo(map) // Añadir al mapa
      .bindPopup("Punto de encuentro") // Añadir texto a un popup al marcador
      .openPopup(); // Abrir el PoPup solo
}

onMounted(() => {
  cargarDatos();

  flatpickr("#fechaPicker", { // Calendario de fecha
    dateFormat: "Y-m-d", // Formato de fecha Año-mes-dia
    defaultDate: new Date(), // Fecha por defecto
    minDate: "today", // Establecer la fecha minima como hoy
    onChange: (selectedDates, dateStr) => {
      nuevaFecha.value = dateStr; // Asignar la fecha seleccionada
    },
    static: true, // Hacer que el calendario sea estático
    position: "bottom", // Posicionar el calendario debajo del campo de entrada
  });

  flatpickr("#horaPicker", { // Selector de hora
    enableTime: true, // Habilitar la selección de hora
    noCalendar: true, // Deshabilitar el calendario
    dateFormat: "H:i:S", // Formato de hora de Hora:minutos:segundos
    time_24hr: true, // Usar formato de 24 horas
    onChange: (selectedDates, dateStr) => {
      nuevaHora.value = dateStr; // Asignar la hora seleccionada
    },
  });
});

// Función para duplicar la ruta
async function duplicarRuta() {
  const rutaData = { // Preparar los datos de la nueva ruta
    titulo: ruta.value.titulo,
    localidad: ruta.value.localidad,
    descripcion: ruta.value.descripcion,
    foto: ruta.value.foto,
    fecha: nuevaFecha.value,
    hora: nuevaHora.value,
    latitud: ruta.value.latitud,
    longitud: ruta.value.longitud,
    guia_id: nuevoGuia.value || null,
  };

  try {
    const response = await fetch("http://localhost/freetours/api.php/rutas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rutaData),
    });

    if (response.ok) { // Si la respuesta es exitosa
      mensajeConfirmacion.value = "Ruta duplicada con éxito"; // Mensaje de éxito
      confirmacionExitosa.value = true; // Marcar como exitosa

      // Limpiar los campos del modal
      nuevaFecha.value = "";
      nuevaHora.value = "";
      nuevoGuia.value = "";
    } else {
      throw new Error("Error al duplicar la ruta"); // Si la respuesta no es exitosa, lanzar un error
    }

    // Mostrar el modal de confirmacion
    mostrarConfirmacion.value = true;
    setTimeout(() => {
      mostrarConfirmacion.value = false;
    }, 3000);

  } catch (error) { // Si ocurre un error al duplicar la ruta
    mensajeConfirmacion.value = "Error al duplicar la ruta"; // Mensaje de error
    confirmacionExitosa.value = false; // Marcar como no exitosa

    // Mostrar el modal de error
    mostrarConfirmacion.value = true;
    setTimeout(() => {
      mostrarConfirmacion.value = false;
    }, 3000);
  }
}
</script>

<template>
  <div class="container-fluid px-0">
    <!-- Imagen principal -->
    <div class="w-100">
      <img :src="`/img/${ruta.foto}`" alt="Imagen de la ruta" class="img-fluid w-100 rounded" style="height: 400px; object-fit: cover;">
    </div>

    <!-- Titulo -->
    <h1 class="text-center my-4 display-4 fw-bold">{{ ruta.titulo }}</h1>

    <div class="container">
      <div class="row justify-content-between">
        <!-- Parte izquierda: Descripción y Mapa -->
        <div class="col-md-7 pe-md-5">
          <div class="mb-4 descripcion-container">
            <p class="descripcion">{{ ruta.descripcion }}</p>
          </div>
          <div class="mb-4 map-container">
            <div id="map" class="map-styled"></div>
          </div>
        </div>

        <!-- Parte derecha derecha: Detalles y Botones -->
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

          <!-- Botones -->
          <div class="btn-group mb-3 w-100" role="group">
            <button type="button" class="btn btn-primary">Editar</button>
            <button type="button" class="btn btn-danger">Borrar</button>
            <button type="button" class="btn btn-secondary" data-bs-toggle="modal" data-bs-target="#duplicarModal">Duplicar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Duplicar Ruta -->
    <div class="modal fade" id="duplicarModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Duplicar Ruta</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <!-- Fecha -->
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

            <!-- Hora -->
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

            <!-- Guia -->
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

    <!-- Modal de Confirmacion -->
    <div v-if="mostrarConfirmacion" class="modal fade show" tabindex="-1" aria-hidden="true" style="display: block;">
      <div class="modal-dialog">
        <div :class="['modal-content', confirmacionExitosa ? 'bg-success' : 'bg-danger']">
          <div class="modal-body">
            <!-- Mensaje Correcto -->
            <p class="text-white fs-5 text-center" v-if="confirmacionExitosa">{{ mensajeConfirmacion }}</p>
            <!-- Mensaje Error -->
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

.text-white {
  color: white !important;
}


.text-center {
  text-align: center !important;
}
</style>
