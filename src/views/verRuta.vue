<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import router from '@/router';
import "leaflet/dist/leaflet.css";
import L from "leaflet"; // Mapa
import flatpickr from "flatpickr"; // Fecha y Hora (Calendario)
import "flatpickr/dist/flatpickr.min.css";
import Swal from 'sweetalert2'; // SweetAlert
import { Modal } from 'bootstrap';

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  usuarioAutenticado: {
    type: Object,
    default: null
  }
});

// Variables ref
const ruta = ref({
  asistentes: 0 
}); 
const guias = ref([]); 
const error = ref(""); 
let mapa = null;
const nuevaFecha = ref(""); 
const nuevaHora = ref(""); 
const nuevoGuia = ref(""); 
const mostrarConfirmacion = ref(false); 
const mensajeConfirmacion = ref(""); 
const confirmacionExitosa = ref(false); 
const mostrarConfirmacionEliminacion = ref(false);
const mensajeConfirmacionEliminacion = ref("");
const eliminacionExitosa = ref(false);
let instanciaModalDuplicar = null;
let eliminacionCompletada = ref(false);
const guiaSeleccionado = ref('');
const instanciaModalAsignarGuia = ref(null);
const asignacionGuia = ref(null);
const rutas = ref([]);
const reservas = ref([]);
const modalAsistentes = ref(null);
const modalPasarLista = ref(null);
const asistencias = ref({});
const asistentesReales = ref({});

const urlImagen = computed(() => {
  if (!ruta.value?.foto) return '';
  return ruta.value.foto;
});

const esGuiaAsignado = computed(() => {
  return props.usuarioAutenticado?.rol === 'guia' && 
         asignacionGuia.value === props.usuarioAutenticado.nombre;
});

const esHoyLaRuta = computed(() => {
  if (!ruta.value?.fecha) return false;
  
  const fechaRuta = new Date(ruta.value.fecha);
  const hoy = new Date();
  
  // Comparar año, mes y día
  return fechaRuta.getFullYear() === hoy.getFullYear() &&
         fechaRuta.getMonth() === hoy.getMonth() &&
         fechaRuta.getDate() === hoy.getDate();
});

function manejarErrorImagen(e) {
  console.error('Error al cargar la imagen:', e);
  e.target.src = 'https://placehold.co/600x400?text=Imagen+no+disponible';
}

async function cargarDatos() {
  try {
    // Cargar datos de la ruta actual
    const respuestaRuta = await fetch(`http://localhost/freetours/api.php/rutas?id=${props.id}`);
    if (!respuestaRuta.ok) {
      throw new Error(`Error al cargar la ruta: ${respuestaRuta.status} ${respuestaRuta.statusText}`);
    }
    const datosRuta = await respuestaRuta.json();
    ruta.value = datosRuta; // Guardar los datos de la ruta

    if (ruta.value == null) {
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
    attribution: '',
  })
    .addTo(mapa);

  L.marker([latitud, longitud]) // Crear un marcador
    .addTo(mapa) // Añadir al mapa
    .bindPopup("Punto de encuentro") // Añadir texto a un popup al marcador
    .openPopup(); // Abrir el mensaje del marcador cuando se carga el mapa
}

onMounted(() => {
  cargarDatos().then(() => {
    cargarGuias(); // Cargar guías después de tener los datos de la ruta
    cargarReservas();
  });

  // Configurar calendario de fecha
  flatpickr("#fechaPicker", {
    dateFormat: "Y-m-d",
    defaultDate: new Date(),
    minDate: "today",
    onChange: (fechasSeleccionadas, fechaStr) => {
      nuevaFecha.value = fechaStr;
    },
    static: false,
    position: "bottom",
  });

  // Configurar selector de hora
  flatpickr("#horaPicker", {
    enableTime: true,
    noCalendar: true,
    dateFormat: "H:i:S",
    time_24hr: true,
    onChange: (horasSeleccionadas, horaStr) => {
      nuevaHora.value = horaStr;
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
  modalAsistentes.value = new Modal(document.getElementById('asistentesModal'));
  modalPasarLista.value = new Modal(document.getElementById('pasarListaModal'));
});

// Función para duplicar la ruta
async function duplicarRuta() {
  const datosRuta = {
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
    if (datosRuta.hora == "" || datosRuta.fecha == "") {
      throw new Error("Los campos de la fecha u hora están vacíos");
    }

    const response = await fetch("http://localhost/freetours/api.php/rutas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datosRuta),
    });

    if (response.ok) {
      // Cerrar el modal de duplicación y limpiar completamente
      const modalDuplicar = document.getElementById('duplicarModal');
      const modal = Modal.getInstance(modalDuplicar);
      modal.hide();

      // Limpiar completamente todos los rastros del modal
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Eliminar el backdrop si existe
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }

      // Mostrar feedback de duplicar
      await Swal.fire({
        title: '¡Duplicada!',
        text: 'La ruta ha sido duplicada correctamente',
        icon: 'success',
        confirmButtonColor: '#ffc107', // Bootstrap warning color
        timer: 2000,
        timerProgressBar: true,
        backdrop: false,
        allowOutsideClick: true,
        didClose: () => {
          // Asegurarse de que el body esté limpio
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
          // Limpiar los campos del modal
          nuevaFecha.value = "";
          nuevaHora.value = "";
          nuevoGuia.value = "";
        }
      });

    } else {
      throw new Error("Error al duplicar la ruta");
    }
  } catch (error) {
    // Mostrar error 
    Swal.fire({
      title: 'Error',
      text: error.message || 'Error al duplicar la ruta',
      icon: 'error',
      confirmButtonColor: '#232342',
      confirmButtonText: 'Aceptar',
      backdrop: false,
      allowOutsideClick: true,
      timer: 3000,
      timerProgressBar: true,
    });
    console.error('Error:', error);
  }
}

// Reemplazar la función confirmarEliminacion por esta
async function confirmarEliminacion() {
  try {
    const response = await fetch(`http://localhost/freetours/api.php/rutas?id=${ruta.value.id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      // Cerrar el modal de eliminación y limpiar completamente
      const modalEliminar = document.getElementById('eliminarModal');
      const modal = Modal.getInstance(modalEliminar);
      modal.hide();

      // Limpiar completamente todos los rastros del modal
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Eliminar el backdrop si existe
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }

      // Mostrar el fedback de eliminación
      await Swal.fire({
        title: 'Eliminada',
        html: '<strong>La ruta ha sido eliminada </strong>',
        icon: 'success',
        iconColor: 'red',
        confirmButtonColor: '#dc3545', // Bootstrap danger color
        timer: 2500,
        timerProgressBar: true,
        showConfirmButton: true,
        confirmButtonText: 'Aceptar',
        backdrop: false,
        allowOutsideClick: true,

        showClass: {
          popup: 'animate__animated animate__fadeInDown'
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOutUp'
        },
        didClose: () => {
          // Asegurarse de que el body esté limpio antes de redirigir
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
          router.push('/');
        }
      });

    } else {
      throw new Error("Error al eliminar la ruta");
    }
  } catch (error) {
    // En caso de error
    Swal.fire({
      title: 'Error',
      text: 'Error al eliminar la ruta',
      icon: 'error',
      confirmButtonColor: '#232342',
      confirmButtonText: 'Aceptar',
      backdrop: false, // Deshabilitar el backdrop también en el mensaje de error
      allowOutsideClick: true,
      timer: 3000,
      timerProgressBar: true,
    });
    console.error('Error:', error);
  }
}

// Update the cargarGuias function
async function cargarGuias() {
  try {
    const fecha = ruta.value.fecha; // Usar la fecha de la ruta actual
    
    // Obtener guías disponibles para la fecha usando la API
    const response = await fetch(`http://localhost/freetours/api.php/asignaciones?fecha=${fecha}`);
    if (!response.ok) {
      throw new Error(`Error al cargar los guías disponibles: ${response.status}`);
    }
    const guiasDisponibles = await response.json();
    
    // Obtener detalles de todos los guías
    const respuestaGuias = await fetch("http://localhost/freetours/api.php/usuarios");
    if (!respuestaGuias.ok) {
      throw new Error(`Error al cargar los guías: ${respuestaGuias.status}`);
    }
    const todosGuias = await respuestaGuias.json();
    
    // Filtrar solo los guías que están disponibles y son guías
    guias.value = todosGuias.filter(guia => 
      guia.rol === "guia" && guiasDisponibles.some(g => Number(g.id) === Number(guia.id))
    );
    
    console.log("Guías disponibles para la fecha:", guias.value); // Debug
  } catch (error) {
    console.error("Error al cargar guías:", error);
    guias.value = [];
  }
}

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
      // Cerrar el modal de asignación y limpiar completamente
      const modalAsignar = document.getElementById('asignarGuiaModal');
      const modal = Modal.getInstance(modalAsignar);
      modal.hide();

      // Limpiar completamente todos los rastros del modal
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Eliminar el backdrop si existe
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }

      // Mostrar ferdback de asignación
      await Swal.fire({
        title: '¡Asignado!',
        text: 'El guía ha sido asignado correctamente',
        icon: 'success',
        confirmButtonColor: '#0dcaf0', // Bootstrap info color
        timer: 2000,
        timerProgressBar: true,
        backdrop: false,
        allowOutsideClick: true,
        didClose: () => {
          // Asegurarse de que el body esté limpio
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
          // Recargar datos
          cargarDatos();
        }
      });

    } else {
      throw new Error("Error al asignar el guía");
    }
  } catch (error) {
    // Mostrar error 
    Swal.fire({
      title: 'Error',
      text: 'Error al asignar el guía',
      icon: 'error',
      confirmButtonColor: '#232342',
      confirmButtonText: 'Aceptar',
      backdrop: false,
      allowOutsideClick: true,
      timer: 3000,
      timerProgressBar: true,
    });
    console.error('Error:', error);
  }
}

async function cargarReservas() {
  try {
    const response = await fetch(`http://localhost/freetours/api.php/reservas?ruta_id=${props.id}`);
    if (!response.ok) {
      throw new Error(`Error al cargar las reservas: ${response.status}`);
    }
    reservas.value = await response.json();
    console.log("Reservas cargadas:", reservas.value);
  } catch (error) {
    console.error("Error al cargar reservas:", error);
  }
}

function verAsistentes() {
  modalAsistentes.value.show();
}

function abrirPasarLista() {
  // Cerrar el modal de asistentes
  modalAsistentes.value.hide();
  
  // Inicializar el objeto de asistencias si es necesario
  if (Object.keys(asistencias.value).length === 0) {
    reservas.value.forEach(reserva => {
      asistencias.value[reserva.reserva_id] = null;  // null = sin marcar
    });
  }
  
  // Abrir el nuevo modal después de un breve retraso para permitir que se cierre el anterior
  setTimeout(() => {
    modalPasarLista.value.show();
  }, 500);
}

function marcarAsistencia(reservaId, presente) {
  asistencias.value[reservaId] = presente;
  
  // Si está marcado como presente y no tiene valor de acompañantes, inicializar
  if (presente && !asistentesReales.value[reservaId]) {
    // Inicializar con el número de personas reservadas
    const reserva = reservas.value.find(r => r.reserva_id == reservaId);
    asistentesReales.value[reservaId] = reserva ? reserva.num_personas : 0;
  }
}

// Modificar la función guardarAsistencias para incluir los asistentes reales
async function guardarAsistencias() {
  try {
    // Preparar los datos a enviar
    const datosAsistencia = {
      asistencias: asistencias.value,
      asistentesReales: asistentesReales.value
    };
    
    console.log('Datos a guardar:', datosAsistencia);
    
    // Aquí iría el código para enviar al servidor
    
    // Mostrar confirmación
    Swal.fire({
      title: '¡Lista pasada!',
      text: 'Se ha registrado la asistencia correctamente',
      icon: 'success',
      confirmButtonColor: '#28a745',
      confirmButtonText: 'Aceptar',
      backdrop: false
    });
    
    // Cerrar el modal
    modalPasarLista.value.hide();
  } catch (error) {
    console.error('Error al guardar asistencias:', error);
    Swal.fire({
      title: 'Error',
      text: 'No se pudo guardar la asistencia',
      icon: 'error',
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Aceptar',
      backdrop: false
    });
  }
}
</script>

<template>
  <div class="container-fluid mb-4 px-0">
    <!-- Imagen principal -->
    <div class="w-100">
      <img :src="urlImagen" 
           :alt="ruta.titulo" 
           class="img-fluid w-100 rounded"
           style="height: 400px; object-fit: cover"
           @error="manejarErrorImagen">
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

          <!-- Botones - Solo visibles para admin -->
          <div v-if="props.usuarioAutenticado && props.usuarioAutenticado.rol === 'admin'" 
               class="btn-group mb-3 w-100"
               role="group">
            <button type="button" class="btn btn-warning" data-bs-toggle="modal" data-bs-target="#duplicarModal">
              Duplicar
            </button>
            <button type="button" class="btn btn-info text-white" data-bs-toggle="modal"
              data-bs-target="#asignarGuiaModal">
              Asignar guía
            </button>
            <button type="button" class="btn btn-danger" data-bs-toggle="modal" data-bs-target="#eliminarModal">
              Borrar
            </button>
          </div>

          <!-- Botones - Solo visibles para el guía asignado -->
          <div v-else-if="esGuiaAsignado" class="btn-group mb-3 w-100" role="group">
            <button type="button" class="btn btn-success">
              Iniciar Ruta
            </button>
            <button type="button" class="btn btn-warning" @click="verAsistentes">
              Ver Asistentes
            </button>
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
              <input type="text" class="form-control" id="fechaPicker" v-model="nuevaFecha"
                placeholder="Seleccione una fecha" readonly>
            </div>

            <!-- Hora -->
            <div class="mb-3">
              <label class="form-label">Hora (HH:MM:SS)</label>
              <input type="text" class="form-control" id="horaPicker" v-model="nuevaHora"
                placeholder="Seleccione una hora" readonly>
            </div>

            <!-- Guia -->
            <div class="mb-3">
              <label class="form-label">Nuevo Guía</label>
              <select class="form-select" v-model="nuevoGuia">
                <option value="" disabled selected>Seleccione un guía</option>
                <option v-for="guia in guias" :key="guia.id" :value="guia.id">
                  {{ guia.nombre }}
                </option>
              </select>
              <small class="text-muted" v-if="guias.length === 0 && nuevaFecha.value">
                No hay guías disponibles para esta fecha
              </small>
              <small class="text-muted" v-if="!nuevaFecha.value">
                Seleccione una   para ver guías disponibles
              </small>
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
    <div v-if="mostrarConfirmacionEliminacion" class="modal fade show" tabindex="-1" aria-hidden="true"
      style="display: block;">
      <div class="modal-dialog">
        <div :class="['modal-content', eliminacionExitosa ? 'bg-success' : 'bg-danger']">
          <div class="modal-body">
            <p class="text-white fs-5 text-center">{{ mensajeConfirmacionEliminacion }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Asignar Guía -->
    <div class="modal fade" id="asignarGuiaModal" tabindex="-1" aria-labelledby="asignarGuiaModalLabel"
      aria-hidden="true">
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
              <small class="text-muted" v-if="guias.length === 0">
                No hay guías disponibles para esta fecha
              </small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-info text-white" @click="asignarGuia">Asignar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Asistentes -->
    <div class="modal fade" id="asistentesModal" tabindex="-1" aria-labelledby="asistentesModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="asistentesModalLabel">Asistentes para la ruta: {{ ruta.titulo }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <!-- Lista de asistentes -->
            <div v-if="reservas.length > 0" class="list-group">
              <div v-for="reserva in reservas" :key="reserva.reserva_id" class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="mb-0">{{ reserva.usuario_nombre }}</h6>
                    <p class="mb-0 text-muted small">{{ reserva.usuario_email }}</p>
                  </div>
                  <span class="badge bg-primary rounded-pill">
                    {{ reserva.num_personas }} personas
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="text-center p-4">
              <p class="text-muted mb-0">No hay reservas para esta ruta.</p>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            <button 
              type="button" 
              class="btn btn-success" 
              @click="abrirPasarLista"
              v-if="esHoyLaRuta"
            >
              Pasar Lista
            </button>
            <button 
              type="button" 
              class="btn btn-secondary" 
              disabled
              v-else
              title="Solo se puede pasar lista el día de la ruta"
            >
              Pasar Lista
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Nuevo Modal para pasar lista -->
    <div class="modal fade" id="pasarListaModal" tabindex="-1" aria-labelledby="pasarListaModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="pasarListaModalLabel">Pasar Lista: {{ ruta.titulo }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
            <!-- Lista de asistentes con botones de asistencia -->
            <div v-if="reservas.length > 0" class="list-group">
              <div v-for="reserva in reservas" :key="reserva.reserva_id" class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 class="mb-0" :class="{ 'text-danger text-decoration-line-through': asistencias[reserva.reserva_id] === false }">
                      {{ reserva.usuario_nombre }}
                    </h6>
                    <p class="mb-0 text-muted small">{{ reserva.usuario_email }}</p>
                    <div v-if="asistencias[reserva.reserva_id] === true" class="mt-2">
                      <label class="form-label small">Acompañantes reales:</label>
                      <input 
                        type="number" 
                        class="form-control form-control-sm" 
                        v-model="asistentesReales[reserva.reserva_id]" 
                        min="0" 
                        :max="reserva.num_personas"
                        style="width: 70px; display: inline-block;"
                      >
                      <span class="ms-2 small text-muted">de {{ reserva.num_personas }} previstos</span>
                    </div>
                  </div>
                  <div class="btn-group" role="group">
                    <button 
                      type="button" 
                      class="btn btn-sm btn-danger text-white" 
                      :class="{ 'btn-outline-danger': asistencias[reserva.reserva_id] !== false }"
                      @click="marcarAsistencia(reserva.reserva_id, false)"
                    >
                      Ausente
                    </button>
                    <button 
                      type="button" 
                      class="btn btn-sm btn-success text-white" 
                      :class="{ 'btn-outline-success': asistencias[reserva.reserva_id] !== true }"
                      @click="marcarAsistencia(reserva.reserva_id, true)"
                    >
                      Presente
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center p-4">
              <p class="text-muted mb-0">No hay reservas para esta ruta.</p>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary text-white" data-bs-dismiss="modal">Cerrar</button>
            <button type="button" class="btn btn-primary text-white" @click="guardarAsistencias">Guardar</button>
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
