<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import Swal from 'sweetalert2';
import { Modal } from 'bootstrap';
import flatpickr from "flatpickr"; 
import "flatpickr/dist/flatpickr.min.css"; 

const router = useRouter();

const rutaNueva = ref({
  titulo: '',
  localidad: '',
  descripcion: '',
  foto: '',
  fecha: '',
  hora: '',
  latitud: '',
  longitud: '',
  guia_id: null
});

const guias = ref([]); // Variable para almacenar los guías

const modalMensaje = ref('');
const modalExito = ref(false);
let modalInstance = null;

let map = null;
let marker = null;

const botonDeshabilitado = ref(false); // Variable para controlar el estado del botón

let fechaPicker = null;
let horaPicker = null;

// Obtener los guías 
async function obtenerGuias() {
  try {
    // Obtener los guías
    const respuestaGuias = await fetch('http://localhost/freetours/api.php/usuarios');
    if (!respuestaGuias.ok) {
      throw new Error('Error al cargar los guías');
    }
    const datosGuias = await respuestaGuias.json();
    const guiasDisponibles = datosGuias.filter(usuario => usuario.rol === 'guia');

    // Obtener las rutas
    const respuestaRutas = await fetch('http://localhost/freetours/api.php/rutas');
    if (!respuestaRutas.ok) {
      throw new Error('Error al cargar las rutas');
    }
    const rutas = await respuestaRutas.json();

    // Filtrar los guías que no tienen más de 2 rutas en la fecha seleccionada
    guias.value = guiasDisponibles.filter(guia => {
      // Si no hay fecha seleccionada, mostrar todos los guías
      if (!rutaNueva.value.fecha) return true;

      // Contar cuántas rutas tiene el guía en la fecha seleccionada
      const rutasDelGuia = rutas.filter(ruta =>
        ruta.guia_id === guia.id &&
        ruta.fecha === formatearFecha(rutaNueva.value.fecha)
      );

      // Devolver true si el guía tiene menos de 2 rutas ese día
      return rutasDelGuia.length < 2;
    });
  } catch (error) {
    console.error('Error al obtener los guías:', error);
  }
}

// Añadir un watcher para la fecha
watch(() => rutaNueva.value.fecha, () => {
  obtenerGuias(); // Actualizar la lista de guías cuando cambie la fecha
});

function formatearFecha(fecha) {
  const date = new Date(fecha);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1);
  const day = (date.getDate() < 10 ? '0' : '') + date.getDate();
  return `${year}-${month}-${day}`;
}

function validarFecha(fecha) {
  const hoy = new Date();
  const fechaSeleccionada = new Date(fecha);
  return fechaSeleccionada >= hoy;
}

function validarCampos() {
  return rutaNueva.value.titulo && rutaNueva.value.localidad && rutaNueva.value.descripcion && rutaNueva.value.foto && rutaNueva.value.fecha && rutaNueva.value.hora && rutaNueva.value.latitud && rutaNueva.value.longitud;
}

const esFormularioValido = computed(() => {
  return validarCampos() && validarFecha(rutaNueva.value.fecha);
});

async function crearRuta() {
  if (!validarCampos()) {
    Swal.fire({
      html: '<strong>Todos los campos son obligatorios excepto el del guía</strong>',
      icon: 'info',
      iconColor: 'red',
      confirmButtonColor: '#232342',
      timer: 2500,
      timerProgressBar: true,
      color: "red",

    });
    return;
  }

  if (!validarFecha(rutaNueva.value.fecha)) {
    Swal.fire({
      html: '<strong>La fecha no puede ser anterior al día de hoy </strong>',
      icon: 'info',
      iconColor: 'red',
      confirmButtonColor: '#232342',
      timer: 2500,
      timerProgressBar: true,
      color: "red",
    });
    return;
  }

  const rutaData = {
    titulo: rutaNueva.value.titulo,
    localidad: rutaNueva.value.localidad,
    descripcion: rutaNueva.value.descripcion,
    foto: rutaNueva.value.foto,
    fecha: formatearFecha(rutaNueva.value.fecha),
    hora: rutaNueva.value.hora,
    latitud: rutaNueva.value.latitud,
    longitud: rutaNueva.value.longitud,
    guia_id: rutaNueva.value.guia_id,
  };

  try {
    const response = await fetch('http://localhost/freetours/api.php/rutas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rutaData)
    });

    if (!response.ok) {
      throw new Error('Error al crear la ruta');
    }

    botonDeshabilitado.value = true;
    Swal.fire({
      html: '<strong>Ruta creada correctamente</strong>',
      icon: 'success',
      confirmButtonColor: '#232342',
      timer: 2500,
      timerProgressBar: true,
      color: "green",
    }).then(() => {
      router.push('/');
    });

  } catch (error) {
    Swal.fire({
      title: 'Error',
      text: 'Error al crear la ruta',
      icon: 'error',
      confirmButtonColor: '#232342'
    });
  }
}

function inicializarMapa() {
  map = L.map('map').setView([40.4168, -3.7038], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  map.on('click', function (e) {
    if (marker) {
      map.removeLayer(marker);
    }
    marker = L.marker(e.latlng).addTo(map);
    rutaNueva.value.latitud = e.latlng.lat;
    rutaNueva.value.longitud = e.latlng.lng;
  });
}

async function buscarDireccion(direccion) {
  const provider = new OpenStreetMapProvider();
  const results = await provider.search({ query: direccion });

  if (results && results.length > 0) {
    const { x, y } = results[0];
    map.setView([y, x], 13);
    if (marker) {
      map.removeLayer(marker);
    }
    marker = L.marker([y, x]).addTo(map);
    rutaNueva.value.latitud = y;
    rutaNueva.value.longitud = x;
  }
}

function inicializarDatepickers() {
  // Configurar selector de fecha
  fechaPicker = flatpickr("#fecha", {
    dateFormat: "Y-m-d",
    minDate: "today",
    onChange: (selectedDates, dateStr) => {
      rutaNueva.value.fecha = dateStr;
      obtenerGuias();
    },
    disableMobile: false,
    position: "auto",
    static: true,
    altInput: false, 
    allowInput: false,
    clickOpens: true,
  });
  
  // Configurar selector de hora
  horaPicker = flatpickr("#hora", {
    enableTime: true,
    noCalendar: true,
    dateFormat: "H:i:S",
    time_24hr: true,
    onChange: (selectedDates, horaStr) => {
      rutaNueva.value.hora = horaStr;
    },
    disableMobile: false,
    position: "auto",
    static: true,
    allowInput: false,
    clickOpens: true,
    defaultHour: 12,
    defaultMinute: 0
  });

}
onMounted(() => {
  inicializarMapa();
  obtenerGuias();
  modalInstance = new Modal(document.getElementById('resultadoModal'));
  
  inicializarDatepickers();
});
</script>

<template>
  <div class="container mt-5">
    <h1 class="text-center text-primary mb-4">Crear Ruta</h1>
    <form @submit.prevent="crearRuta" @keydown.prevent.enter class="border p-4 shadow-sm rounded bg-white">
      <div class="row">
        <div class="col-md-6">
          <div class="mb-3">
            <label for="titulo" class="form-label">Título</label>
            <input type="text" class="form-control" id="titulo" v-model="rutaNueva.titulo">
          </div>
          <div class="mb-3">
            <label for="localidad" class="form-label">Localidad</label>
            <input type="text" class="form-control" id="localidad" v-model="rutaNueva.localidad">
          </div>
          <div class="mb-3">
            <label for="descripcion" class="form-label">Descripción</label>
            <textarea class="form-control" id="descripcion" rows="3" v-model="rutaNueva.descripcion"></textarea>
          </div>
        </div>
        <div class="col-md-6">
          <div class="mb-3">
            <label for="foto" class="form-label">Foto</label>
            <input type="text" class="form-control" id="foto" v-model="rutaNueva.foto" placeholder="Url de la imagen">
          </div>
          <div class="mb-3">
            <label for="fecha" class="form-label">Fecha</label>
            <input type="text" class="form-control date-input" id="fecha" placeholder="Seleccionar fecha" readonly>
          </div>
          <div class="mb-3">
            <label for="hora" class="form-label">Hora</label>
            <input type="text" class="form-control time-input" id="hora" placeholder="Seleccionar hora" readonly>
          </div>
        </div>
      </div>
      <div class="mb-3">
        <label for="guia_id" class="form-label">Guía (opcional)</label>
        <select class="form-select" id="guia_id" v-model="rutaNueva.guia_id">
          <option value="">No seleccionar guía</option>
          <option v-for="guia in guias" :key="guia.id" :value="guia.id">{{ guia.nombre }}</option>
        </select>
      </div>
      <div class="row">
        <div class="col-md-6">
          <div class="mb-3">
            <label for="latitud" class="form-label">Latitud</label>
            <input type="text" class="form-control" id="latitud" v-model="rutaNueva.latitud" readonly>
          </div>
        </div>
        <div class="col-md-6">
          <div class="mb-3">
            <label for="longitud" class="form-label">Longitud</label>
            <input type="text" class="form-control" id="longitud" v-model="rutaNueva.longitud" readonly>
          </div>
        </div>
      </div>
      <div class="mb-3">
        <label for="direccion" class="form-label">Buscar Dirección</label>
        <input type="text" class="form-control" id="direccion" @change="buscarDireccion($event.target.value)">
      </div>
      <div id="map" class="estilo-mapa mb-3"></div>
      <button :class="['btn', 'w-100', esFormularioValido ? 'btn-success' : 'btn-danger']" type="submit"
        :disabled="botonDeshabilitado">Crear Ruta</button>
    </form>

    <!-- Modal -->
    <div class="modal fade" id="resultadoModal" tabindex="-1" aria-labelledby="resultadoModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header" :class="{ 'bg-success': modalExito, 'bg-danger': !modalExito }">
            <h5 class="modal-title" id="resultadoModalLabel">{{ modalExito ? 'Éxito' : 'Error' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            {{ modalMensaje }}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

.container {
  max-width: 800px;
}

h1 {
  font-size: 2.5rem;
  font-weight: bold;
}

.estilo-mapa {
  height: 400px;
  margin-bottom: 20px;
}

/* Estilos de formulario */
.form-label {
  font-weight: bold;
  color: #232342;
  display: block;
  margin-bottom: 0.5rem;
}

.form-control {
  border-radius: 5px;
  width: 100%;
  box-sizing: border-box;
}

.btn-primary {
  background-color: #1a1a2e;
  border: none;
  font-weight: bold;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  background-color: #232342;
}

#fecha, 
#hora {
  background-color: #fff !important;
  border: 1px solid #ced4da !important;
  color: #212529 !important;
  cursor: pointer;
  width: 100% !important;
  max-width: 100% !important;
  display: block !important;
  padding: 0.375rem 0.75rem !important;
}

.date-input {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' class='bi bi-calendar3' viewBox='0 0 16 16'%3E%3Cpath d='M14 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zM1 3.857C1 3.384 1.448 3 2 3h12c.552 0 1 .384 1 .857v10.286c0 .473-.448.857-1 .857H2c-.552 0-1-.384-1-.857V3.857z'/%3E%3Cpath d='M6.5 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 16px;
  background-color: #fff !important; 
}

.time-input {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' class='bi bi-clock' viewBox='0 0 16 16'%3E%3Cpath d='M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z'/%3E%3Cpath d='M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 16px;
  background-color: #fff !important;
}

:deep(.flatpickr-wrapper) {
  width: 100% !important;
  display: block !important;
}

:deep(.flatpickr-input) {
  background-color: #fff !important;
  border: 1px solid #ced4da !important;
  border-radius: 0.25rem !important;
  width: 100% !important;
  display: block !important;
}

:deep(.flatpickr-input.flatpickr-mobile) {
  background-color: #fff !important;
}

:deep(.flatpickr-calendar) {
  width: 307.875px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  border-radius: 8px !important;
  border: none !important;
  background-color: #fff !important;
  z-index: 1060 !important;
}

:deep(.flatpickr-day.selected) {
  background-color: #0d6efd !important;
  border-color: #0d6efd !important;
}

:deep(.flatpickr-day.today) {
  border-color: #198754 !important;
}

:deep(.flatpickr-day:hover) {
  background-color: #e9ecef !important;
}

:deep([class^="flatpickr"]) {
  font-size: inherit !important;
  line-height: inherit !important;
}
</style>