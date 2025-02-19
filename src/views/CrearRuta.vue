<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import { Modal } from 'bootstrap';

const router = useRouter();

const titulo = ref('');
const localidad = ref('');
const descripcion = ref('');
const foto = ref('');
const fecha = ref('');
const hora = ref('');
const latitud = ref('');
const longitud = ref('');
const guia_id = ref(null);
const guias = ref([]); // Variable para almacenar los guías

const modalMensaje = ref('');
const modalExito = ref(false);
let modalInstance = null;

let map = null;
let marker = null;

async function obtenerGuias() {
  try {
    const response = await fetch('http://localhost/freetours/api.php/usuarios');
    if (!response.ok) {
      throw new Error('Error al cargar los guías');
    }
    const data = await response.json();
    guias.value = data.filter(usuario => usuario.rol === 'guia');
  } catch (error) {
    console.error('Error al obtener los guías:', error);
  }
}

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
  return titulo.value && localidad.value && descripcion.value && foto.value && fecha.value && hora.value && latitud.value && longitud.value;
}

const esFormularioValido = computed(() => {
  return validarCampos() && validarFecha(fecha.value);
});

async function crearRuta() {
  if (!validarCampos()) {
    modalMensaje.value = 'Todos los campos son obligatorios excepto el del guía';
    modalExito.value = false;
    modalInstance.show();
    return;
  }

  if (!validarFecha(fecha.value)) {
    modalMensaje.value = 'La fecha no puede ser anterior al día de hoy';
    modalExito.value = false;
    modalInstance.show();
    return;
  }

  const rutaData = {
    titulo: titulo.value,
    localidad: localidad.value,
    descripcion: descripcion.value,
    foto: foto.value,
    fecha: formatearFecha(fecha.value),
    hora: hora.value,
    latitud: latitud.value,
    longitud: longitud.value,
    guia_id: guia_id.value,
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

    modalMensaje.value = 'Ruta creada correctamente';
    modalExito.value = true;
    setTimeout(() => {
      router.push('/');
    }, 3000);
  } catch (error) {
    modalMensaje.value = 'Error al crear la ruta';
    modalExito.value = false;
  } finally {
    modalInstance.show();
  }
}

function inicializarMapa() {
  map = L.map('map').setView([40.4168, -3.7038], 13); // Coordenadas de Madrid, España

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  map.on('click', function(e) {
    if (marker) {
      map.removeLayer(marker);
    }
    marker = L.marker(e.latlng).addTo(map);
    latitud.value = e.latlng.lat;
    longitud.value = e.latlng.lng;
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
    latitud.value = y;
    longitud.value = x;
  }
}

onMounted(() => {
  inicializarMapa();
  obtenerGuias(); // Obtener los guías al montar el componente
  modalInstance = new Modal(document.getElementById('resultadoModal'));
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
            <input type="text" class="form-control" id="titulo" v-model="titulo">
          </div>
          <div class="mb-3">
            <label for="localidad" class="form-label">Localidad</label>
            <input type="text" class="form-control" id="localidad" v-model="localidad">
          </div>
          <div class="mb-3">
            <label for="descripcion" class="form-label">Descripción</label>
            <textarea class="form-control" id="descripcion" rows="3" v-model="descripcion"></textarea>
          </div>
        </div>
        <div class="col-md-6">
          <div class="mb-3">
            <label for="foto" class="form-label">Foto</label>
            <input type="text" class="form-control" id="foto" v-model="foto" placeholder="Url de la imagen">
          </div>
          <div class="mb-3">
            <label for="fecha" class="form-label">Fecha</label>
            <input type="date" class="form-control" id="fecha" v-model="fecha">
          </div>
          <div class="mb-3">
            <label for="hora" class="form-label">Hora</label>
            <input type="time" class="form-control" id="hora" v-model="hora">
          </div>
        </div>
      </div>
      <div class="mb-3">
        <label for="guia_id" class="form-label">Guía (opcional)</label>
        <select class="form-select" id="guia_id" v-model="guia_id">
          <option value="">No seleccionar guía</option>
          <option v-for="guia in guias" :key="guia.id" :value="guia.id">{{ guia.nombre }}</option>
        </select>
      </div>
      <div class="row">
        <div class="col-md-6">
          <div class="mb-3">
            <label for="latitud" class="form-label">Latitud</label>
            <input type="text" class="form-control" id="latitud" v-model="latitud" readonly>
          </div>
        </div>
        <div class="col-md-6">
          <div class="mb-3">
            <label for="longitud" class="form-label">Longitud</label>
            <input type="text" class="form-control" id="longitud" v-model="longitud" readonly>
          </div>
        </div>
      </div>
      <div class="mb-3">
        <label for="direccion" class="form-label">Buscar Dirección</label>
        <input type="text" class="form-control" id="direccion" @change="buscarDireccion($event.target.value)">
      </div>
      <div id="map" class="estilo-mapa mb-3"></div>
      <button :class="['btn', 'w-100', esFormularioValido ? 'btn-success' : 'btn-danger']" type="submit">Crear Ruta</button>
    </form>

    <!-- Modal -->
    <div class="modal fade" id="resultadoModal" tabindex="-1" aria-labelledby="resultadoModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header" :class="{'bg-success': modalExito, 'bg-danger': !modalExito}">
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
  max-width: 800px; /* Aumenta el ancho del contenedor */
}

h1 {
  font-size: 2.5rem;
  font-weight: bold;
}

.form-label {
  font-weight: bold;
  color: #232342; /* Color acorde al proyecto */
}

.form-control {
  border-radius: 5px;
}

.btn-primary {
  background-color: #1a1a2e; /* Azul oscuro elegante */
  border: none;
  font-weight: bold;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  background-color: #232342; /* Color acorde al proyecto */
}

.estilo-mapa {
  height: 400px;
  margin-bottom: 20px;
}
</style>