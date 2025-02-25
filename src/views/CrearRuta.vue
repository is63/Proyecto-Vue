<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import Swal from 'sweetalert2';
import { Modal } from 'bootstrap';

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

// Reemplazar la función obtenerGuias actual
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
  map = L.map('map').setView([40.4168, -3.7038], 13); // Coordenadas de Madrid, España

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  map.on('click', function(e) {
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
            <input type="date" class="form-control" id="fecha" v-model="rutaNueva.fecha">
          </div>
          <div class="mb-3">
            <label for="hora" class="form-label">Hora</label>
            <input type="time" class="form-control" id="hora" v-model="rutaNueva.hora">
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
      <button :class="['btn', 'w-100', esFormularioValido ? 'btn-success' : 'btn-danger']" type="submit" :disabled="botonDeshabilitado">Crear Ruta</button>
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