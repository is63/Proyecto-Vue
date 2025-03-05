<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import router from '@/router';
import "leaflet/dist/leaflet.css";
import L from "leaflet"; // Para el mapa interactivo
import flatpickr from "flatpickr"; // Selector de fecha y hora
import "flatpickr/dist/flatpickr.min.css";
import Swal from 'sweetalert2'; // Alertas y confirmaciones elegantes
import { Modal } from 'bootstrap'; // Modales de Bootstrap

const props = defineProps({
  id: {
    type: String,
    required: true,  // ID de la ruta a mostrar
  },
  usuarioAutenticado: {
    type: Object,
    default: null    // Datos del usuario que ha iniciado sesión
  }
});

// ==========================================
// VARIABLES DE ESTADO PRINCIPALES
// ==========================================
const ruta = ref({ asistentes: 0 });  // Datos de la ruta actual
const error = ref("");                // Mensajes de error
let mapa = null;                      // Instancia del mapa Leaflet
const asignacionGuia = ref(null);     // Nombre del guía asignado a la ruta

// ==========================================
// GESTIÓN DE RESERVAS
// ==========================================
const reservas = ref([]);             // Lista de reservas para la ruta
const numPersonas = ref(1);           // Número de personas para nueva reserva
const errorReserva = ref("");         // Errores específicos de reserva
const cargandoReserva = ref(false);   // Estado de carga durante reserva
const modalReserva = ref(null);       // Referencia al modal de reserva

// ==========================================
// GESTIÓN DE GUÍAS
// ==========================================
const guias = ref([]);                // Lista de guías disponibles
const guiaSeleccionado = ref('');     // Guía seleccionado para asignar
const instanciaModalAsignarGuia = ref(null); // Referencia al modal de asignación

// ==========================================
// DUPLICACIÓN DE RUTAS
// ==========================================
const nuevaFecha = ref("");           // Fecha para la ruta duplicada
const nuevaHora = ref("");            // Hora para la ruta duplicada
const nuevoGuia = ref("");            // Guía para la ruta duplicada
let instanciaModalDuplicar = null;    // Referencia al modal de duplicación

// ==========================================
// ELIMINACIÓN DE RUTAS
// ==========================================
const mostrarConfirmacionEliminacion = ref(false);
const mensajeConfirmacionEliminacion = ref("");
const eliminacionExitosa = ref(false);
let eliminacionCompletada = ref(false);

// ==========================================
// GESTIÓN DE ASISTENTES Y CONTROL DE ASISTENCIA
// ==========================================
const modalAsistentes = ref(null);    // Modal para ver lista de asistentes
const modalPasarLista = ref(null);    // Modal para control de asistencia
const asistencias = ref({});          // Registro de asistencias (presente/ausente)
const asistentesReales = ref({});     // Número real de asistentes por reserva

// ==========================================
// CONFIRMACIONES Y FEEDBACK
// ==========================================
const mostrarConfirmacion = ref(false);
const mensajeConfirmacion = ref("");
const confirmacionExitosa = ref(false);

// ==========================================
// Añadir estas variables
const modalLoginRequerido = ref(null);

// ==========================================
// PROPIEDADES COMPUTADAS
// ==========================================

// URL de la imagen de la ruta, con fallback si no existe
const urlImagen = computed(() => {
  if (!ruta.value?.foto) return '';
  return ruta.value.foto;
});

// Determina si el usuario autenticado es el guía asignado a esta ruta
const esGuiaAsignado = computed(() => {
  return props.usuarioAutenticado?.rol === 'guia' &&
    asignacionGuia.value === props.usuarioAutenticado.nombre;
});

// Verifica si la ruta es el día actual para habilitar control de asistencia
const esHoyLaRuta = computed(() => {
  if (!ruta.value?.fecha) return false;

  const fechaRuta = new Date(ruta.value.fecha);
  const hoy = new Date();

  // Comparar año, mes y día para determinar si es hoy
  return fechaRuta.getFullYear() === hoy.getFullYear() &&
    fechaRuta.getMonth() === hoy.getMonth() &&
    fechaRuta.getDate() === hoy.getDate();
});

// Comprueba si el cliente ya ha reservado esta ruta para evitar duplicados
const yaHaReservado = computed(() => {
  if (!props.usuarioAutenticado || !reservas.value.length) {
    return false;
  }

  const clienteId = props.usuarioAutenticado.id;
  const email = props.usuarioAutenticado.email?.toLowerCase();

  // Verifica tanto por ID como por email para mayor seguridad
  return reservas.value.some(reserva =>
    (Number(reserva.cliente_id) === Number(clienteId) ||
      String(reserva.usuario_email).toLowerCase() === email) &&
    Number(reserva.ruta_id) === Number(props.id)
  );
});

// ==========================================
// FUNCIONES DE CARGA DE DATOS
// ==========================================

// Carga todos los datos necesarios para mostrar la ruta
async function cargarDatos() {
  try {
    // 1. Carga datos de la ruta actual
    const respuestaRuta = await fetch(`http://localhost/freetours/api.php/rutas?id=${props.id}`);
    if (!respuestaRuta.ok) {
      throw new Error(`Error al cargar la ruta: ${respuestaRuta.status} ${respuestaRuta.statusText}`);
    }
    const datosRuta = await respuestaRuta.json();
    ruta.value = datosRuta; // Guardar los datos de la ruta

    if (ruta.value == null) {
      router.push("/"); // Si la ruta no existe, redirigir al inicio
    }

    // 2. Carga datos de las asignaciones de guías
    const respuestaAsignaciones = await fetch("http://localhost/freetours/api.php/asignaciones");
    if (!respuestaAsignaciones.ok) {
      throw new Error(`Error al cargar las asignaciones: ${respuestaAsignaciones.status}`);
    }
    const asignaciones = await respuestaAsignaciones.json();

    // 3. Carga la lista de todos los guías 
    const respuestaGuias = await fetch("http://localhost/freetours/api.php/usuarios");
    if (!respuestaGuias.ok) {
      throw new Error(`Error al cargar los guías: ${respuestaGuias.status} ${respuestaGuias.statusText}`);
    }
    const datosGuias = await respuestaGuias.json();
    guias.value = datosGuias.filter(usuario => usuario.rol === "guia");

    // 4. Identifica el guía asignado a esta ruta
    const asignacionActual = asignaciones.find(asig => asig.ruta_id == props.id);
    if (asignacionActual) {
      // Buscar el nombre del guía en la lista de guías
      const guiaAsignado = guias.value.find(guia => guia.id == asignacionActual.guia_id);
      asignacionGuia.value = guiaAsignado ? guiaAsignado.nombre : 'Guía no encontrado';
    } else {
      asignacionGuia.value = null;
    }

    // 5. Inicializar el mapa si la ruta tiene coordenadas
    if (ruta.value.latitud && ruta.value.longitud) {
      inicializarMapa(ruta.value.latitud, ruta.value.longitud);
    }
  } catch (err) {
    console.error("Error:", err);
    error.value = `No se pudieron cargar los datos de la ruta. ${err.message}`;
  }
}

// Carga las reservas asociadas a la ruta actual
async function cargarReservas() {
  try {
    const response = await fetch(`http://localhost/freetours/api.php/reservas?ruta_id=${props.id}`);
    if (!response.ok) {
      throw new Error(`Error al cargar las reservas: ${response.status}`);
    }
    reservas.value = await response.json();
    console.log("Reservas cargadas para ruta ID", props.id, ":", reservas.value);
  } catch (error) {
    console.error("Error al cargar reservas:", error);
  }
}

// Carga los guías disponibles para asignar a la ruta
async function cargarGuias() {
  try {
    const fecha = ruta.value.fecha; // Usar la fecha de la ruta actual

    // 1. Obtener disponibilidad de guías para la fecha
    const response = await fetch(`http://localhost/freetours/api.php/asignaciones?fecha=${fecha}`);
    if (!response.ok) {
      throw new Error(`Error al cargar los guías disponibles: ${response.status}`);
    }
    const guiasDisponibles = await response.json();

    // 2. Obtener información completa de todos los guías
    const respuestaGuias = await fetch("http://localhost/freetours/api.php/usuarios");
    if (!respuestaGuias.ok) {
      throw new Error(`Error al cargar los guías: ${respuestaGuias.status}`);
    }
    const todosGuias = await respuestaGuias.json();

    // 3. Filtrar solo los guías disponibles para esta fecha
    guias.value = todosGuias.filter(guia =>
      guia.rol === "guia" && guiasDisponibles.some(g => Number(g.id) === Number(guia.id))
    );
  } catch (error) {
    console.error("Error al cargar guías:", error);
    guias.value = [];
  }
}

// Carga guías disponibles para una nueva fecha (duplicación de ruta)
async function cargarGuiasParaDuplicar() {
  try {
    if (!nuevaFecha.value) {
      guias.value = [];
      return;
    }

    // 1. Obtener guías disponibles para la nueva fecha
    const respuesta = await fetch(`http://localhost/freetours/api.php/asignaciones?fecha=${nuevaFecha.value}`);
    if (!respuesta.ok) {
      throw new Error(`Error al cargar los guías disponibles: ${respuesta.status}`);
    }
    const guiasDisponibles = await respuesta.json();

    // 2. Obtener información completa de todos los guías
    const respuestaGuias = await fetch("http://localhost/freetours/api.php/usuarios");
    if (!respuestaGuias.ok) {
      throw new Error(`Error al cargar los guías: ${respuestaGuias.status}`);
    }
    const todosGuias = await respuestaGuias.json();

    // 3. Filtrar solo los guías disponibles para la nueva fecha
    guias.value = todosGuias.filter(guia =>
      guia.rol === "guia" && guiasDisponibles.some(g => Number(g.id) === Number(guia.id))
    );

    console.log("Guías disponibles para duplicar:", guias.value);
  } catch (error) {
    console.error("Error al cargar guías para duplicar:", error);
    guias.value = [];
  }
}

// ==========================================
// FUNCIONES PARA EL MAPA
// ==========================================

// Inicializa el mapa Leaflet con la ubicación de la ruta
function inicializarMapa(latitud, longitud) {
  if (mapa) {
    mapa.remove(); // Si ya existe un mapa, se elimina primero
  }

  mapa = L.map("mapa").setView([latitud, longitud], 16); // Crear el mapa con zoom 16

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '', // Atribución del mapa
  }).addTo(mapa);

  L.marker([latitud, longitud]) // Crear un marcador en las coordenadas
    .addTo(mapa)
    .bindPopup("Punto de encuentro") // Texto del popup
    .openPopup(); // Mostrar popup inicialmente
}

// Maneja errores al cargar imágenes y muestra una imagen de placeholder
function manejarErrorImagen(e) {
  console.error('Error al cargar la imagen:', e);
  e.target.src = 'https://placehold.co/600x400?text=Imagen+no+disponible';
}

// ==========================================
// FUNCIONES PARA GESTIÓN DE RESERVAS
// ==========================================

// Abre el modal para realizar una nueva reserva
function abrirModalReserva() {
  const modalReserva = new Modal(document.getElementById('reservaModal'));
  modalReserva.show();
}

// Incrementa el número de personas para la reserva (máx. 8)
function incrementarPersonas() {
  if (numPersonas.value < 8) {
    numPersonas.value++;
  }
}

// Decrementa el número de personas para la reserva (mín. 1)
function decrementarPersonas() {
  if (numPersonas.value > 1) {
    numPersonas.value--;
  }
}

// Procesa la reserva enviándola al servidor
async function realizarReserva() {
  try {
    cargandoReserva.value = true;
    errorReserva.value = "";

    // 1. Verificar autenticación del usuario
    if (!props.usuarioAutenticado) {
      throw new Error('Debe iniciar sesión para realizar una reserva');
    }

    console.log("Datos del usuario autenticado:", props.usuarioAutenticado);

    // 2. Obtener el email del usuario autenticado
    const email = props.usuarioAutenticado.email;

    if (!email) {
      throw new Error('No se pudo obtener el email del usuario');
    }

    // 3. Verificar que no exista ya una reserva para este cliente
    const clienteId = props.usuarioAutenticado.id;

    const yaReservada = reservas.value.some(reserva =>
      (Number(reserva.cliente_id) === Number(clienteId) ||
        reserva.usuario_email.toLowerCase() === email.toLowerCase()) &&
      Number(reserva.ruta_id) === Number(props.id)
    );

    if (yaReservada) {
      throw new Error('Ya tienes una reserva para esta ruta. No puedes reservar dos veces.');
    }

    // 4. Preparar datos de la reserva para enviar a la API
    const datosReserva = {
      email: email,
      ruta_id: parseInt(props.id),
      num_personas: numPersonas.value
    };

    console.log("Datos a enviar para la reserva:", datosReserva);

    // 5. Realizar la petición a la API
    const response = await fetch('http://localhost/freetours/api.php/reservas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datosReserva)
    });

    // Para depuración
    const responseText = await response.text();
    console.log("Respuesta de la API:", responseText);

    // 6. Verificar respuesta del servidor
    if (!response.ok) {
      try {
        // Intentar analizar la respuesta como JSON
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || `Error del servidor: ${response.status}`);
      } catch (parseError) {
        // Si no se puede analizar como JSON, usar el texto directamente
        throw new Error(`Error al realizar la reserva: ${response.status} - ${responseText}`);
      }
    }

    // 7. Cerrar el modal y limpiar
    const modalReservaEl = document.getElementById('reservaModal');
    if (modalReservaEl) {
      const modalInstance = Modal.getInstance(modalReservaEl);
      if (modalInstance) {
        modalInstance.hide();
      }
    }

    // Limpiar elementos del modal
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
    }

    // 8. Mostrar confirmación y redirigir a misReservas al cerrar
    await Swal.fire({
      title: '¡Reserva realizada!',
      text: `Has reservado para ${numPersonas.value} ${numPersonas.value === 1 ? 'persona' : 'personas'}`,
      icon: 'success',
      confirmButtonColor: '#28a745',
      confirmButtonText: 'Ver mis reservas',
      backdrop: false,
      allowOutsideClick: true,
      didClose: () => {
        // Redirigir a la página de misReservas
        router.push('/misReservas');
      }
    });

    // 9. Actualizar contador de asistentes en la vista
    if (ruta.value) {
      ruta.value.asistentes = (parseInt(ruta.value.asistentes || 0) + parseInt(numPersonas.value));
    }

    // 10. Recargar las reservas
    await cargarReservas();

  } catch (error) {
    console.error("Error al realizar la reserva:", error);
    errorReserva.value = error.message || "No se pudo completar la reserva";

    // Mostrar el error en el modal y con SweetAlert
    Swal.fire({
      title: 'Error',
      text: errorReserva.value,
      icon: 'error',
      confirmButtonColor: '#dc3545',
      backdrop: false
    });
  } finally {
    cargandoReserva.value = false;
  }
}

// Permite cancelar una reserva existente
async function cancelarReserva(reservaId) {
  try {
    // 1. Mostrar confirmación antes de cancelar
    const confirmar = await Swal.fire({
      title: '¿Estás seguro?',
      text: "No podrás revertir esta acción",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, cancelar reserva',
      cancelButtonText: 'No, mantener reserva'
    });

    if (!confirmar.isConfirmed) {
      return;
    }

    // 2. Enviar solicitud de cancelación a la API
    const response = await fetch(`http://localhost/freetours/api.php/reservas?id=${reservaId}`, {
      method: 'DELETE'
    });

    const responseText = await response.text();
    console.log("Respuesta al cancelar reserva:", responseText);

    if (!response.ok) {
      throw new Error(`Error al cancelar la reserva: ${response.status}`);
    }

    // 3. Mostrar mensaje de éxito
    await Swal.fire({
      title: '¡Cancelada!',
      text: 'Tu reserva ha sido cancelada correctamente',
      icon: 'success',
      confirmButtonColor: '#28a745'
    });

    // 4. Recargar las reservas para actualizar la vista
    cargarReservas();

  } catch (err) {
    console.error("Error:", err);
    await Swal.fire({
      title: 'Error',
      text: 'No se pudo cancelar la reserva. Inténtalo más tarde.',
      icon: 'error',
      confirmButtonColor: '#dc3545'
    });
  }
}

// ==========================================
// FUNCIONES PARA GESTIÓN DE ASISTENTES
// ==========================================

// Abre el modal para ver los asistentes a la ruta
function verAsistentes() {
  modalAsistentes.value.show();
}

// Abre el modal para registrar asistencia (solo disponible el día de la ruta)
function abrirPasarLista() {
  // Cerrar el modal de asistentes
  modalAsistentes.value.hide();

  // Inicializar el objeto de asistencias si es necesario
  if (Object.keys(asistencias.value).length === 0) {
    reservas.value.forEach(reserva => {
      asistencias.value[reserva.reserva_id] = null;  // null = sin marcar
    });
  }

  // Abrir el nuevo modal después de un breve retraso
  setTimeout(() => {
    modalPasarLista.value.show();
  }, 500);
}

// Registra la asistencia de los participantes (presente/ausente)
function marcarAsistencia(reservaId, presente) {
  asistencias.value[reservaId] = presente;

  // Si está presente, inicializar el contador de acompañantes
  if (presente && !asistentesReales.value[reservaId]) {
    // Inicializar con el número de personas reservadas
    const reserva = reservas.value.find(r => r.reserva_id == reservaId);
    asistentesReales.value[reservaId] = reserva ? reserva.num_personas : 0;
  }
}

// Guarda la información de asistencia en el servidor
async function guardarAsistencias() {
  try {
    // 1. Preparar los datos a enviar
    const datosAsistencia = {
      asistencias: asistencias.value,
      asistentesReales: asistentesReales.value
    };

    console.log('Datos a guardar:', datosAsistencia);

    // Aquí iría el código para enviar al servidor

    // 2. Mostrar confirmación
    Swal.fire({
      title: '¡Lista pasada!',
      text: 'Se ha registrado la asistencia correctamente',
      icon: 'success',
      confirmButtonColor: '#28a745',
      confirmButtonText: 'Aceptar',
      backdrop: false
    });

    // 3. Cerrar el modal
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

// ==========================================
// FUNCIONES ADMINISTRATIVAS (ADMIN)
// ==========================================

// Crea una copia de la ruta actual con nueva fecha y hora
async function duplicarRuta() {
  const datosRuta = {
    titulo: ruta.value.titulo,
    localidad: ruta.value.localidad,
    descripcion: ruta.value.descripcion,
    foto: ruta.value.foto,
    fecha: nuevaFecha.value,
    hora: nuevaHora.value,
    latitud: ruta.value.latitud,
    longitud: ruta.value.long,
    guia_id: nuevoGuia.value || null,
  };

  try {
    // 1. Validar datos obligatorios
    if (datosRuta.hora == "" || datosRuta.fecha == "") {
      throw new Error("Los campos de la fecha u hora están vacíos");
    }

    // 2. Enviar solicitud de creación de ruta
    const response = await fetch("http://localhost/freetours/api.php/rutas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datosRuta),
    });

    if (response.ok) {
      // 3. Cerrar y limpiar el modal
      const modalDuplicar = document.getElementById('duplicarModal');
      const modal = Modal.getInstance(modalDuplicar);
      modal.hide();

      // Limpiar elementos del modal
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Eliminar el backdrop
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }

      // 4. Mostrar confirmación de éxito
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
    // 5. Mostrar mensaje de error
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

// Elimina la ruta actual (solo admin)
async function confirmarEliminacion() {
  try {
    // 1. Enviar solicitud de eliminación a la API
    const response = await fetch(`http://localhost/freetours/api.php/rutas?id=${ruta.value.id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      // 2. Cerrar y limpiar el modal
      const modalEliminar = document.getElementById('eliminarModal');
      const modal = Modal.getInstance(modalEliminar);
      modal.hide();

      // Limpiar elementos del modal
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Eliminar el backdrop
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }

      // 3. Mostrar confirmación de éxito
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
          // 4. Redirigir al usuario a la página principal
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
    // 5. Mostrar mensaje de error
    Swal.fire({
      title: 'Error',
      text: 'Error al eliminar la ruta',
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

// Asigna un guía a la ruta actual (solo admin)
async function asignarGuia() {
  try {
    // 1. Preparar datos de asignación
    const datosAsignacion = {
      ruta_id: ruta.value.id,
      guia_id: guiaSeleccionado.value
    };

    // 2. Enviar solicitud a la API
    const response = await fetch('http://localhost/freetours/api.php/asignaciones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datosAsignacion)
    });

    if (response.ok) {
      // 3. Cerrar y limpiar el modal
      const modalAsignar = document.getElementById('asignarGuiaModal');
      const modal = Modal.getInstance(modalAsignar);
      modal.hide();

      // Limpiar elementos del modal
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Eliminar el backdrop
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }

      // 4. Mostrar confirmación de éxito
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
          // 5. Recargar datos para actualizar la vista
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
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

// Añadir estas funciones
function mostrarModalLogin() {
  // Inicializar el modal si es la primera vez
  if (!modalLoginRequerido.value) {
    modalLoginRequerido.value = new Modal(document.getElementById('loginRequeridoModal'));
  }
  modalLoginRequerido.value.show();
}

function irALogin() {
  // Cerrar el modal antes de redirigir
  if (modalLoginRequerido.value) {
    modalLoginRequerido.value.hide();

    // Limpiar elementos del modal
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
    }
  }

  // Redirigir al inicio de sesión
  router.push('/login');
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
      // No necesitamos llamar a cargarGuiasParaDuplicar aquí porque el watch lo hará
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

  // Inicializar todos los modales
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
  modalReserva.value = new Modal(document.getElementById('reservaModal'));
  modalLoginRequerido.value = new Modal(document.getElementById('loginRequeridoModal'));
});

// Añadir un watch para actualizar la lista de guías cuando cambia la fecha
watch(() => nuevaFecha.value, (nuevaFecha) => {
  if (nuevaFecha) {
    // Cargar guías disponibles cuando se selecciona una fecha
    cargarGuiasParaDuplicar();
  } else {
    // Limpiar la lista de guías si no hay fecha seleccionada
    guias.value = [];
    nuevoGuia.value = "";
  }
});
</script>

<template>
  <div class="container-fluid mb-4 px-0">
    <!-- ==========================================
    SECCIÓN COMÚN - VISIBLE PARA TODOS LOS USUARIOS
    ========================================== -->
    <!-- Imagen principal -->
    <div class="w-100">
      <img :src="urlImagen" :alt="ruta.titulo" class="img-fluid w-100 rounded" style="height: 400px; object-fit: cover"
        @error="manejarErrorImagen">
    </div>

    <!-- Titulo -->
    <h1 class="text-center my-4 display-4 fw-bold">{{ ruta.titulo }}</h1>

    <div class="container">
      <div class="row justify-content-between">
        <!-- Parte izquierda: Descripción y Mapa (común para todos) -->
        <div class="col-md-7 pe-md-5">
          <div class="mb-4 descripcion-container">
            <p class="descripcion">{{ ruta.descripcion }}</p>
          </div>
          <div class="mb-4 map-container">
            <div id="mapa" class="map-styled"></div>
          </div>
        </div>

        <!-- Parte derecha: Detalles y Botones (específica por rol) -->
        <div class="col-md-4 detalles-col">
          <!-- Información común - Visible para todos -->
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

          <!-- Asistentes - Visible para todos -->
          <div class="mb-3">
            <p class="h4 fw-bold text-decoration-underline text-secondary">Asistentes</p>
            <p class="detalle">{{ ruta.asistentes || 2 }}</p>
          </div>

          <!-- ==========================================
          SECCIÓN DE ADMINISTRADOR
          ========================================== -->
          <div v-if="props.usuarioAutenticado && props.usuarioAutenticado.rol === 'admin'" class="btn-group mb-3 w-100"
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

          <!-- ==========================================
          SECCIÓN DE GUÍA
          ========================================== -->
          <div v-else-if="esGuiaAsignado" class="btn-group mb-3 w-100" role="group">
            <button type="button" class="btn btn-info text-white w-100" @click="verAsistentes">
              Ver Asistentes
            </button>
          </div>

          <!-- ==========================================
          SECCIÓN DE CLIENTE
          ========================================== -->
          <div v-else-if="props.usuarioAutenticado && props.usuarioAutenticado.rol === 'cliente'"
            class="btn-group mb-3 w-100" role="group">
            <button type="button" class="btn btn-primary w-100" @click="abrirModalReserva" :disabled="yaHaReservado"
              :title="yaHaReservado ? 'Ya tienes una reserva para esta ruta' : 'Reservar plaza para esta ruta'">
              {{ yaHaReservado ? 'Ya reservada' : 'Reservar' }}
            </button>
          </div>

          <!-- ==========================================
          SECCIÓN DE USUARIO NO AUTENTICADO
          ========================================== -->
          <div v-else class="btn-group mb-3 w-100" role="group">
            <button type="button" class="btn btn-outline-primary w-100" @click="mostrarModalLogin">
              Reservar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ==========================================
    MODALES PARA ADMINISTRADOR
    ========================================== -->
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
                Seleccione una fecha para ver guías disponibles
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

    <!-- Modal de Asignar Guía -->
    <div class="modal fade" id="asignarGuiaModal" tabindex="-1" aria-labelledby="asignarGuiaModalLabel">
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

    <!-- ==========================================
    MODALES PARA GUÍAS
    ========================================== -->
    <!-- Modal de Asistentes -->
    <div class="modal fade" id="asistentesModal" tabindex="-1" aria-labelledby="asistentesModalLabel"
      aria-hidden="true">
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
            <button type="button" class="btn btn-success" @click="abrirPasarLista" v-if="esHoyLaRuta">
              Pasar Lista
            </button>
            <button type="button" class="btn btn-secondary" disabled v-else
              title="Solo se puede pasar lista el día de la ruta">
              Pasar Lista
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para pasar lista -->
    <div class="modal fade" id="pasarListaModal" tabindex="-1" aria-labelledby="pasarListaModalLabel"
      aria-hidden="true">
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
                    <h6 class="mb-0"
                      :class="{ 'text-danger text-decoration-line-through': asistencias[reserva.reserva_id] === false }">
                      {{ reserva.usuario_nombre }}
                    </h6>
                    <p class="mb-0 text-muted small">{{ reserva.usuario_email }}</p>
                    <div v-if="asistencias[reserva.reserva_id] === true" class="mt-2">
                      <label class="form-label small">Acompañantes reales:</label>
                      <input type="number" class="form-control form-control-sm"
                        v-model="asistentesReales[reserva.reserva_id]" min="0" :max="reserva.num_personas"
                        style="width: 70px; display: inline-block;">
                      <span class="ms-2 small text-muted">de {{ reserva.num_personas }} previstos</span>
                    </div>
                  </div>
                  <div class="btn-group" role="group">
                    <button type="button" class="btn btn-sm btn-danger text-white"
                      :class="{ 'btn-outline-danger': asistencias[reserva.reserva_id] !== false }"
                      @click="marcarAsistencia(reserva.reserva_id, false)">
                      Ausente
                    </button>
                    <button type="button" class="btn btn-sm btn-success text-white"
                      :class="{ 'btn-outline-success': asistencias[reserva.reserva_id] !== true }"
                      @click="marcarAsistencia(reserva.reserva_id, true)">
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

    <!-- ==========================================
    MODALES PARA CLIENTES
    ========================================== -->
    <!-- Modal de Reserva -->
    <div class="modal fade" id="reservaModal" tabindex="-1" aria-labelledby="reservaModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="reservaModalLabel">Reservar: {{ ruta.titulo }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p>Por favor, indique cuántas personas asistirán a la ruta:</p>

            <div class="alert alert-info" role="alert">
              <i class="bi bi-info-circle-fill me-2"></i>
              La reserva se realizará para el día {{ ruta.fecha }} a las {{ ruta.hora }}.
            </div>

            <div class="mb-3">
              <label for="numPersonas" class="form-label">Número de personas</label>
              <div class="d-flex justify-content-center align-items-center mb-3">
                <div class="btn-group selector-personas">
                  <button v-for="num in 8" :key="num" type="button"
                    :class="['btn', numPersonas === num ? 'btn-primary' : 'btn-outline-primary']"
                    @click="numPersonas = num">
                    {{ num }}
                  </button>
                </div>
              </div>
              <small class="form-text text-muted d-block text-center">Máximo 8 personas por reserva</small>
            </div>

            <div class="alert alert-warning" v-if="errorReserva">
              {{ errorReserva }}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-success" @click="realizarReserva" :disabled="cargandoReserva">
              <span v-if="cargandoReserva" class="spinner-border spinner-border-sm me-2" role="status"
                aria-hidden="true"></span>
              Confirmar Reserva
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ==========================================
    MODALES PARA USUARIOS NO AUTENTICADOS
    ========================================== -->
    <!-- Modal de Login Requerido -->
    <div class="modal fade" id="loginRequeridoModal" tabindex="-1" aria-labelledby="loginRequeridoModalLabel"
      aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="loginRequeridoModalLabel">Iniciar sesión requerido</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="text-center mb-4">
              <i class="bi bi-exclamation-circle fs-1 text-warning"></i>
            </div>
            <p class="text-center">Debes iniciar sesión para poder reservar esta ruta.</p>
            <p class="text-center text-muted">Si no tienes una cuenta, podrás registrarte en la misma página.</p>
          </div>
          <div class="modal-footer justify-content-center">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" @click="irALogin">
              Iniciar sesión
            </button>
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

/* Nuevos estilos para el selector de personas */
.selector-personas .btn {
  min-width: 40px;
  border-radius: 0;
}

.selector-personas .btn:first-child {
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.selector-personas .btn:last-child {
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

/* Efecto hover mejorado */
.selector-personas .btn:hover {
  background-color: #e9ecef;
  z-index: 1;
}

.selector-personas .btn-primary {
  z-index: 2;
}
</style>
