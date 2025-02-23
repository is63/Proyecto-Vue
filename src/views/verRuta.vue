<script setup>
import { ref, onMounted, watch } from 'vue';
import router from '@/router';
import "leaflet/dist/leaflet.css";
import L from "leaflet"; // Mapa
import flatpickr from "flatpickr"; // Fecha y Hora (Calendario)
import "flatpickr/dist/flatpickr.min.css";
import { Modal } from 'bootstrap';

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});

const ruta = ref({
  asistentes: 0 // Añadir esta propiedad
}); // Almacenar los datos de la ruta
const guias = ref([]); // Guardar los guias disponibles
const error = ref(""); // Mostrar mensajes de error

let mapa = null; //Guardar el mapa


const nuevaFecha = ref(""); // Guardar la fecha seleccionada
const nuevaHora = ref(""); // Guardar la hora seleccionada
const nuevoGuia = ref(""); // Guardar el guía seleccionado


const mostrarConfirmacion = ref(false); // Mostrar el modal de confirmación
const mensajeConfirmacion = ref(""); // Guardar el mensaje de confirmación
const confirmacionExitosa = ref(false); // Para saber si la duplicación fue exitosa

const mostrarConfirmacionEliminacion = ref(false);
const mensajeConfirmacionEliminacion = ref("");
const eliminacionExitosa = ref(false);

let instanciaModalDuplicar = null; // Instancia del modal de duplicar

let eliminacionCompletada = ref(false); // Eliminación exitosa

const guiaSeleccionado = ref(''); // Guardar el guia seleccionado en el select
const instanciaModalAsignarGuia = ref(null);


const mostrarFeedbackAsignacion = ref(false); //Mostral el modal de asignacion
const mensajeFeedbackAsignacion = ref(""); //Mensaje de asignacion
const asignacionExitosa = ref(false); //Asignacion exitosa


const asignacionGuia = ref(null); //Guardar al guia asignado si existe

// Añadir nueva ref para almacenar los guías con sus datos
const guiasConAsignaciones = ref([]);
const rutas = ref([]); // Para almacenar todas las rutas


async function cargarDatos() {
  try {
    // Cargar datos de la ruta actual
    const respuestaRuta = await fetch(`http://localhost/freetours/api.php/rutas?id=${props.id}`);
    if (!respuestaRuta.ok) {
      throw new Error(`Error al cargar la ruta: ${respuestaRuta.status} ${respuestaRuta.statusText}`);
    }
    const datosRuta = await respuestaRuta.json();
    ruta.value = datosRuta; // Guardar los datos de la ruta
  
    if(ruta.value == null){
      router.push("/");
    }

    // Cargar datos de las asignaciones
    const respuestaAsignaciones = await fetch("http://localhost/freetours/api.php/asignaciones");
    if (!respuestaAsignaciones.ok) {
      throw new Error(`Error al cargar las asignaciones: ${respuestaAsignaciones.status}`);
    }
    const asignaciones = await respuestaAsignaciones.json();
    
    // Cargar guias disponibles 
    const respuestaGuias = await fetch("http://localhost/freetours/api.php/usuarios");
    if (!respuestaGuias.ok) {
      throw new Error(`Error al cargar los guías: ${respuestaGuias.status} ${respuestaGuias.statusText}`);
    }
    const datosGuias = await respuestaGuias.json();
    guias.value = datosGuias.filter(usuario => usuario.rol === "guia");

    // Buscar el guia asignado para la ruta actual
    const asignacionActual = asignaciones.find(asig => asig.ruta_id == props.id);
    if (asignacionActual) {
      // Find guide's name from guides list
      const guiaAsignado = guias.value.find(guia => guia.id == asignacionActual.guia_id);
      asignacionGuia.value = guiaAsignado ? guiaAsignado.nombre : 'Guía no encontrado';
    } else {
      asignacionGuia.value = null;
    }

    // Si la ruta tiene coordenadas, se inicializa el mapa
    if (ruta.value.latitud && ruta.value.longitud) {
      inicializarMapa(ruta.value.latitud, ruta.value.longitud);
    }
  } catch (err) {
    console.error("Error:", err);
    error.value = `No se pudieron cargar los datos de la ruta. ${err.message}`; // Añadir el mensaje de error
  }
}

// Funcion para inicializar el mapa
function inicializarMapa(latitud, longitud) {
  if (mapa) {
    mapa.remove(); // Si ya existe un mapa, se elimina
  }

  mapa = L.map("mapa").setView([latitud, longitud], 16); // Crear el mapa

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { // Añadir la "atribución" al mapa (abajo derecha)
    attribution: '', })
    .addTo(mapa);

  L.marker([latitud, longitud]) // Crear un marcador
      .addTo(mapa) // Añadir al mapa
      .bindPopup("Punto de encuentro") // Añadir texto a un popup al marcador
      .openPopup(); // Abrir el mensaje del marcador cuando se carga el mapa
}

onMounted(() => {
  cargarDatos();

  flatpickr("#fechaPicker", { // Calendario de fecha
    dateFormat: "Y-m-d", // Formato de fecha Año-mes-dia
    defaultDate: new Date(), // Fecha por defecto
    minDate: "today", // Establecer la fecha mínima como hoy
    onChange: (selectedDates, dateStr) => {
      nuevaFecha.value = dateStr; // Asignar la fecha seleccionada
    },
    static: false, // Hacer que el calendario sea estático
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

  instanciaModalDuplicar = new Modal(document.getElementById('duplicarModal'));
  new Modal(document.getElementById('eliminarModal'));

  // Añadir event listener para cuando el modal de eliminación se oculta/cierra
  document.getElementById('eliminarModal').addEventListener('hidden.bs.modal', () => { 
    if (eliminacionCompletada.value) { //Si se ha eliminado correctamente hace la redireccion
      router.push("/");
    }
  });

  instanciaModalAsignarGuia.value = new Modal(document.getElementById('asignarGuiaModal'));
  obtenerGuiasConAsignaciones();
  cargarGuias();
});

// Función para duplicar la ruta
async function duplicarRuta() {
  const datosRuta = { // Preparar los datos de la nueva ruta
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
  console.log(datosRuta);
  
  try {
    if(datosRuta.hora == "" || datosRuta.fecha == ""){
      throw new Error("Los campos de la fecha u hora están vacíos")
    }

    const response = await fetch("http://localhost/freetours/api.php/rutas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datosRuta),
    });

    if (response.ok) { // Si la respuesta es exitosa
      mensajeConfirmacion.value = "Ruta duplicada con éxito"; // Mensaje de éxito
      confirmacionExitosa.value = true; // Marcar como exitosa

      // Limpiar los campos del modal
      nuevaFecha.value = "";
      nuevaHora.value = "";
      nuevoGuia.value = "";

      // Mostrar el modal de confirmación
      mostrarConfirmacion.value = true;
      // Cerrar solo el modal de confirmación después de 3 segundos
      setTimeout(() => {
        mostrarConfirmacion.value = false;
      }, 3000);
    } else {
      throw new Error("Error al duplicar la ruta"); // Si la respuesta no es exitosa, lanzar un error
    }

  } catch (error) { // Si ocurre un error al duplicar la ruta
    mensajeConfirmacion.value = "Error al duplicar la ruta"; // Mensaje de error
    confirmacionExitosa.value = false; // Marcar como no exitosa

    // Mostrar el modal de error
    mostrarConfirmacion.value = true;
    // Cerrar solo el modal de error después de 3 segundos
    setTimeout(() => {
      mostrarConfirmacion.value = false;
    }, 3000);
  }
}

// Reemplazar la función confirmarEliminacion por esta
async function confirmarEliminacion() {
  try {
    const response = await fetch(`http://localhost/freetours/api.php/rutas?id=${ruta.value.id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      // Configurar mensaje y estado
      mensajeConfirmacionEliminacion.value = "Ruta eliminada con éxito";
      eliminacionExitosa.value = true;
      eliminacionCompletada.value = true;
      
      // Mostrar modal de confirmación
      mostrarConfirmacionEliminacion.value = true;
      
      // Cerrar solo el modal de feedback después de 3 segundos
      setTimeout(() => {
        mostrarConfirmacionEliminacion.value = false;
      }, 3000);
    } else {
      throw new Error("Error al eliminar la ruta");
    }
  } catch (error) {
    // En caso de error
    mensajeConfirmacionEliminacion.value = "Error al eliminar la ruta";
    eliminacionExitosa.value = false;
    eliminacionCompletada.value = false;
    
    // Mostrar modal de error
    mostrarConfirmacionEliminacion.value = true;
    
    // Cerrar el modal de error después de 3 segundos
    setTimeout(() => {
      mostrarConfirmacionEliminacion.value = false;
    }, 3000);

    console.error('Error:', error);
  }
}

// Nueva función para obtener los guías y sus asignaciones
async function obtenerGuiasConAsignaciones() {
  try {
    // Obtener los guías
    const respuestaGuias = await fetch("http://localhost/freetours/api.php/usuarios");
    if (!respuestaGuias.ok) {
      throw new Error(`Error al cargar los guías: ${respuestaGuias.status}`);
    }
    const usuarios = await respuestaGuias.json();
    const guiasDisponibles = usuarios.filter(usuario => usuario.rol === "guia");

    // Obtener las asignaciones
    const respuestaAsignaciones = await fetch("http://localhost/freetours/api.php/asignaciones");
    if (!respuestaAsignaciones.ok) {
      throw new Error(`Error al cargar las asignaciones: ${respuestaAsignaciones.status}`);
    }
    const asignaciones = await respuestaAsignaciones.json();

    // Procesar los datos de cada guía
    guiasConAsignaciones.value = guiasDisponibles.map(guia => {
      const asignacionesGuia = asignaciones.filter(asig => asig.guia_id === guia.id);
      return {
        id: guia.id,
        nombre: guia.nombre,
        asignaciones: asignacionesGuia
      };
    });

  } catch (error) {
    console.error("Error al obtener guías con asignaciones:", error);
    guiasConAsignaciones.value = [];
  }
}

// Modificar la función cargarGuias en la sección del script
async function cargarGuias() {
  try {
    // Si no hay fecha seleccionada, no mostrar guías
    if (!nuevaFecha.value) {
      guias.value = [];
      return;
    }

    // Obtener las rutas si no están cargadas
    if (rutas.value.length === 0) {
      const respuestaRutas = await fetch("http://localhost/freetours/api.php/rutas");
      if (!respuestaRutas.ok) {
        throw new Error(`Error al cargar las rutas: ${respuestaRutas.status}`);
      }
      rutas.value = await respuestaRutas.json();
    }

    // Filtrar los guías basándonos en las asignaciones existentes
    guias.value = guiasConAsignaciones.value.filter(guia => {
      // Si el guía no tiene asignaciones, está disponible
      if (guia.asignaciones.length === 0) {
        return true;
      }

      // Contar las rutas del guía en la fecha seleccionada
      const rutasEnFecha = guia.asignaciones.filter(asig => {
        const rutaAsignada = rutas.value.find(r => r.id === asig.ruta_id);
        return rutaAsignada && rutaAsignada.fecha === nuevaFecha.value;
      });

      // El guía está disponible si tiene menos de 2 rutas en esa fecha
      return rutasEnFecha.length < 2;
    });

  } catch (error) {
    console.error("Error al cargar guías:", error);
    guias.value = [];
  }
}

// Añadir un watcher para la fecha
watch(() => nuevaFecha.value, () => {
  if (nuevaFecha.value) {
    cargarGuias();
  }
});

// Modificar la función asignarGuia en la sección del script
async function asignarGuia() {
  try {
    const datosAsignacion = {
      ruta_id: ruta.value.id,
      guia_id: guiaSeleccionado.value
    };

    const response = await fetch('http://localhost/freetours/api.php/asignaciones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datosAsignacion)
    });

    if (response.ok) {
      // Mostrar feedback de éxito
      mensajeFeedbackAsignacion.value = "Guía asignado exitosamente";
      asignacionExitosa.value = true;
      mostrarFeedbackAsignacion.value = true;

      // Recargar datos de la ruta para mostrar el nuevo guía
      cargarDatos();

      // Cerrar solo el feedback después de 3 segundos
      setTimeout(() => {
        mostrarFeedbackAsignacion.value = false;
      }, 3000);
    } else {
      throw new Error("Error al asignar el guía");
    }
  } catch (error) {
    // Mostrar feedback de error
    mensajeFeedbackAsignacion.value = "Error al asignar el guía";
    asignacionExitosa.value = false;
    mostrarFeedbackAsignacion.value = true;

    setTimeout(() => {
      mostrarFeedbackAsignacion.value = false;
    }, 3000);

    console.error('Error:', error);
  }
}
</script>

<template>
  <div class="container-fluid mb-4 px-0">
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
            <div id="mapa" class="map-styled"></div>
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
            <p v-if="asignacionGuia" class="detalle">{{ asignacionGuia }}</p>
            <p v-else class="detalle text-muted">No hay guía asignado</p>
          </div>

          <div class="mb-3">
            <p class="h4 fw-bold text-decoration-underline text-secondary">Fecha y Hora</p>
            <p class="detalle">{{ ruta.fecha }}</p>
            <p class="detalle">{{ ruta.hora }}</p>
          </div>

          <!-- Asistentes -->
          <div class="mb-3">
            <p class="h4 fw-bold text-decoration-underline text-secondary">Asistentes</p>
            <p class="detalle">{{ ruta.asistentes || 2 }}</p>
          </div>

          <!-- Botones -->
          <div class="btn-group mb-3 w-100" role="group">
            <button type="button" class="btn btn-warning" data-bs-toggle="modal" data-bs-target="#duplicarModal">Duplicar</button>
            <button type="button" class="btn btn-info text-white" data-bs-toggle="modal" data-bs-target="#asignarGuiaModal">Asignar guía</button>
            <button type="button" class="btn btn-danger" data-bs-toggle="modal" data-bs-target="#eliminarModal">Borrar</button>
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
                  readonly>
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
                 <option v-for="guia in guias" :key="guia.id" :value="guia.id">
                  {{ guia.nombre }}
                </option>
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

    <!-- Modal de Confirmación de Eliminación -->
    <div class="modal fade" id="eliminarModal" tabindex="-1" aria-labelledby="eliminarModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="eliminarModalLabel">Confirmar eliminación</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="mb-0">¿Seguro que quiere <strong class="text-danger">eliminar</strong> la ruta?</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-danger" @click="confirmarEliminacion">Confirmar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Feedback de Eliminación -->
    <div v-if="mostrarConfirmacionEliminacion" class="modal fade show" tabindex="-1" aria-hidden="true" style="display: block;">
      <div class="modal-dialog">
        <div :class="['modal-content', eliminacionExitosa ? 'bg-success' : 'bg-danger']">
          <div class="modal-body">
            <p class="text-white fs-5 text-center">{{ mensajeConfirmacionEliminacion }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Asignar Guía -->
    <div class="modal fade" id="asignarGuiaModal" tabindex="-1" aria-labelledby="asignarGuiaModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="asignarGuiaModalLabel">Asignar Guía</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Seleccionar Guía</label>
              <select class="form-select" v-model="guiaSeleccionado">
                <option value="" disabled selected>Seleccione un guía</option>
                <option v-for="guia in guias" :key="guia.id" :value="guia.id">
                  {{ guia.nombre }}
                </option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" @click="asignarGuia">Asignar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Feedback de Asignación -->
    <div v-if="mostrarFeedbackAsignacion" class="modal fade show" tabindex="-1" aria-hidden="true" style="display: block;">
      <div class="modal-dialog">
        <div :class="['modal-content', asignacionExitosa ? 'bg-success' : 'bg-danger']">
          <div class="modal-body">
            <p class="text-white fs-5 text-center">{{ mensajeFeedbackAsignacion }}</p>
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
