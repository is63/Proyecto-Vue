<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import router from '@/router';
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import Swal from 'sweetalert2';
import { Modal } from 'bootstrap';

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


const ruta = ref({ asistentes: 0 });
const error = ref("");
let mapa = null;
const asignacionGuia = ref(null);


// Datos de reservas
const reservas = ref([]);
const numPersonas = ref(1);
const errorReserva = ref("");
const cargandoReserva = ref(false);
const modalReserva = ref(null);


// Datos para la gestion de los guias
const guias = ref([]);
const guiaSeleccionado = ref('');
const modalAsignarGuia = ref(null);

// Datos para la duplicion de rutas
const nuevaFecha = ref("");
const nuevaHora = ref("");
const nuevoGuia = ref("");
let instanciaModalDuplicar = null;


// Datos para la eliminación de rutas
let eliminacionCompletada = ref(false);

// Datos para la gestion de Pasar Lista
const modalAsistentes = ref(null);
const modalPasarLista = ref(null);
const asistencias = ref({});
const asistentesReales = ref({});

// Datos para saber si el usuario ha iniciado sesion
const modalLoginRequerido = ref(null);

// Variable para almacenar el id del usuario
const clienteIdUsuarioActual = ref(null);

//Datos para las valoraciones
const mostrarFormularioValoracion = ref(false);
const nuevaValoracion = ref({
  puntuacion: 5,
  comentario: ''
});
const enviandoValoracion = ref(false);
const errorValoracion = ref('');
const yaHaValorado = ref(false);


// Comprueba si la ruta ya pasó
const rutaYaPaso = computed(() => {
  if (!ruta.value?.fecha) return false;

  const fechaRuta = new Date(ruta.value.fecha);
  const hoy = new Date();

  // Comparar año, mes y día
  if (fechaRuta.getFullYear() < hoy.getFullYear()) return true;
  if (fechaRuta.getFullYear() == hoy.getFullYear() &&
    fechaRuta.getMonth() < hoy.getMonth()) return true;
  if (fechaRuta.getFullYear() == hoy.getFullYear() &&
    fechaRuta.getMonth() == hoy.getMonth() &&
    fechaRuta.getDate() < hoy.getDate()) return true;

  return false;
});


// URL de la imagen de la ruta
const urlImagen = computed(() => {
  if (!ruta.value?.foto) return '';
  return ruta.value.foto;
});

// Comprobar si el usuario registrado es el guía asignado a esta ruta
const esGuiaAsignado = computed(() => {
  return props.usuarioAutenticado?.rol == 'guia' &&
    asignacionGuia.value == props.usuarioAutenticado.nombre;
});

// Verifica si la fecha de la ruta es el día actual para activar el control de asistencia
const esHoyLaRuta = computed(() => {
  if (!ruta.value?.fecha) return false;

  const fechaRuta = new Date(ruta.value.fecha);
  const hoy = new Date();

  return fechaRuta.getFullYear() == hoy.getFullYear() &&
    fechaRuta.getMonth() == hoy.getMonth() &&
    fechaRuta.getDate() == hoy.getDate();
});

// Comprobar si el cliente ya ha reservado esta ruta para evitar duplicados - solo usando ID
const yaHaReservado = computed(() => {
  if (!props.usuarioAutenticado || !reservas.value.length) {
    return false;
  }

  const clienteId = props.usuarioAutenticado.id;


  return reservas.value.some(reserva =>
    reserva.cliente_id == clienteId &&
    reserva.ruta_id == props.id
  );
});

// Array para las valoraciones 
const valoraciones = ref([]);


function formatearFecha(fechaStr) {
  if (!fechaStr) return '';

  const fecha = new Date(fechaStr);
  return fecha.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Cargar valoraciones
async function cargarValoraciones() {
  try {
    const respuesta = await fetch(`http://localhost/freetours/api.php/valoraciones?ruta_id=${props.id}`);
    if (!respuesta.ok) {
      throw new Error(`Error al cargar las valoraciones: ${respuesta.status}`);
    }
    valoraciones.value = await respuesta.json();
    //console.log("Valoraciones cargadas:", valoraciones.value);
  } catch (error) {
    console.error("Error al cargar las valoraciones:", error);
    valoraciones.value = [];
  }
}

// Cargar los datos de la ruta
async function cargarDatos() {
  try {
    const respuestaRuta = await fetch(`http://localhost/freetours/api.php/rutas?id=${props.id}`);
    if (!respuestaRuta.ok) {
      throw new Error(`Error al cargar la ruta: ${respuestaRuta.status} ${respuestaRuta.statusText}`);
    }
    const datosRuta = await respuestaRuta.json();
    ruta.value = datosRuta; // Guardar los datos de la ruta

    if (ruta.value == null) {
      router.push("/"); // Si la ruta no existe, redirigir al inicio
    }

    // Cargar las asignaciones de guías
    const respuestaAsignaciones = await fetch("http://localhost/freetours/api.php/asignaciones");
    if (!respuestaAsignaciones.ok) {
      throw new Error(`Error al cargar las asignaciones: ${respuestaAsignaciones.status}`);
    }
    const asignaciones = await respuestaAsignaciones.json();

    // Cargar la lista de todos los guías 
    const respuestaGuias = await fetch("http://localhost/freetours/api.php/usuarios");
    if (!respuestaGuias.ok) {
      throw new Error(`Error al cargar los guías: ${respuestaGuias.status} ${respuestaGuias.statusText}`);
    }
    const datosGuias = await respuestaGuias.json();
    guias.value = datosGuias.filter(usuario => usuario.rol == "guia");

    // Identificar el guía asignado a esta ruta
    const asignacionActual = asignaciones.find(asig => asig.ruta_id == props.id);
    if (asignacionActual) {
      // Buscar el nombre del guía en la lista de guías
      const guiaAsignado = guias.value.find(guia => guia.id == asignacionActual.guia_id);
      asignacionGuia.value = guiaAsignado ? guiaAsignado.nombre : 'Guía no encontrado';
    } else {
      asignacionGuia.value = null;
    }

    // Iniciar el mapa si la ruta tiene coordenadas
    if (ruta.value.latitud && ruta.value.longitud) {
      inicializarMapa(ruta.value.latitud, ruta.value.longitud);
    }

    // Cargar las valoraciones de la ruta
    await cargarValoraciones();

    // Verificar si el usuario ya ha valorado esta ruta
    if (props.usuarioAutenticado) {
      await verificarSiYaValoro();
      //console.log("Verificación de valoración completada:", yaHaValorado.value);
    }

  } catch (err) {
    console.error("Error:", err);
    error.value = `No se pudieron cargar los datos de la ruta. ${err.message}`;
  }
}

// Cargar las reservas asociadas a la ruta
async function cargarReservas() {
  try {
    const response = await fetch(`http://localhost/freetours/api.php/reservas?ruta_id=${props.id}`);
    if (!response.ok) {
      throw new Error(`Error al cargar las reservas: ${response.status}`);
    }
    reservas.value = await response.json();
    //console.log("Reservas cargadas para ruta ID", props.id, ":", reservas.value);
  } catch (error) {
    console.error("Error al cargar reservas:", error);
  }
}

// Cargar los guías disponibles para asignar a la ruta
async function cargarGuias() {
  try {
    const fecha = ruta.value.fecha;

    // Obtener la disponibilidad de guías
    const response = await fetch(`http://localhost/freetours/api.php/asignaciones?fecha=${fecha}`);
    if (!response.ok) {
      throw new Error(`Error al cargar los guías disponibles: ${response.status}`);
    }
    const guiasDisponibles = await response.json();

    // Obtener la informacion de los guías
    const respuestaGuias = await fetch("http://localhost/freetours/api.php/usuarios");
    if (!respuestaGuias.ok) {
      throw new Error(`Error al cargar los guías: ${respuestaGuias.status}`);
    }
    const todosGuias = await respuestaGuias.json();

    // Filtrar solo los guías disponibles para la fecha
    guias.value = todosGuias.filter(guia =>
      guia.rol == "guia" && guiasDisponibles.some(g => g.id == guia.id)
    );
  } catch (error) {
    console.error("Error al cargar guías:", error);
    guias.value = [];
  }
}

// Cargar los guías disponibles para la nueva fecha 
async function cargarGuiasParaDuplicar() {
  try {
    if (!nuevaFecha.value) {
      guias.value = [];
      return;
    }

    // Obtener guías disponibles para la nueva fecha
    const respuesta = await fetch(`http://localhost/freetours/api.php/asignaciones?fecha=${nuevaFecha.value}`);
    if (!respuesta.ok) {
      throw new Error(`Error al cargar los guías disponibles: ${respuesta.status}`);
    }
    const guiasDisponibles = await respuesta.json();

    // Obtener la informacion de  los guías
    const respuestaGuias = await fetch("http://localhost/freetours/api.php/usuarios");
    if (!respuestaGuias.ok) {
      throw new Error(`Error al cargar los guías: ${respuestaGuias.status}`);
    }
    const todosGuias = await respuestaGuias.json();

    // Filtrar por los guías disponibles para la  fecha
    guias.value = todosGuias.filter(guia =>
      guia.rol == "guia" && guiasDisponibles.some(g => g.id == guia.id)
    );

    //console.log("Guías disponibles para duplicar:", guias.value);
  } catch (error) {
    console.error("Error al cargar guías para duplicar:", error);
    guias.value = [];
  }
}


// Iniciar el mapa con la ubicación de la ruta
function inicializarMapa(latitud, longitud) {
  if (mapa) {
    mapa.remove(); // Si ya existe un mapa, se elimina
  }

  mapa = L.map("mapa").setView([latitud, longitud], 16); // Crear el mapa 

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '',
  }).addTo(mapa);

  L.marker([latitud, longitud]) // Crear un marcador 
    .addTo(mapa)
    .bindPopup("Punto de encuentro") // Texto del popup
    .openPopup(); // Mostrar popup inicialmente
}

// Manejar los errores al cargar imágenes
function manejarErrorImagen(e) {
  console.error('Error al cargar la imagen:', e);
  e.target.src = 'https://placehold.co/600x400?text=Imagen+no+disponible';
}


// FUNCIONES PARA GESTIÓN DE RESERVAS

// Abrir el modal para realizar una nueva reserva
function abrirModalReserva() {
  const modalReserva = new Modal(document.getElementById('reservaModal'));
  modalReserva.show();
}

// Crear la reserva
async function realizarReserva() {
  try {
    cargandoReserva.value = true;
    errorReserva.value = "";

    // Verificar autenticación del usuario
    if (!props.usuarioAutenticado) {
      throw new Error('Debe iniciar sesión para realizar una reserva');
    }

    //console.log("Datos del usuario autenticado:", props.usuarioAutenticado);

    // Obtener el email del usuario 
    const email = props.usuarioAutenticado.email;

    if (!email) {
      throw new Error('No se pudo obtener el email del usuario');
    }

    // Verificar que no exista ya una reserva para este cliente
    const clienteId = props.usuarioAutenticado.id;

    const yaReservada = reservas.value.some(reserva =>
      (reserva.cliente_id == clienteId ||
        reserva.usuario_email.toLowerCase() == email.toLowerCase()) &&
      reserva.ruta_id == props.id
    );

    if (yaReservada) {
      throw new Error('Ya tienes una reserva para esta ruta. No puedes reservar dos veces.');
    }

    // Asignar los datos de la reserva
    const datosReserva = {
      email: email,
      ruta_id: parseInt(props.id),
      num_personas: numPersonas.value
    };

    //console.log("Datos a enviar para la reserva:", datosReserva);

    // Realizar la petición a la API
    const response = await fetch('http://localhost/freetours/api.php/reservas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datosReserva)
    });

    const responseText = await response.text();
    //console.log("Respuesta de la API:", responseText);

    // Verificar respuesta del servidor
    if (!response.ok) {
      try {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || `Error del servidor: ${response.status}`);
      } catch (parseError) {
        throw new Error(`Error al realizar la reserva: ${response.status} - ${responseText}`);
      }
    }

    // Cerrar el modal 
    const modalReservaEl = document.getElementById('reservaModal');
    if (modalReservaEl) {
      const modalInstance = Modal.getInstance(modalReservaEl);
      if (modalInstance) {
        modalInstance.hide();
      }
    }

    // Limpiar el modal
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    //Eliminar el fondo negro del modal
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
    }

    // Mostrar confirmación y redirigir 
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

    // Actualizar contador de asistentes en la vista
    if (ruta.value) {
      ruta.value.asistentes = (parseInt(ruta.value.asistentes || 0) + parseInt(numPersonas.value));
    }

    // Recargar las reservas
    await cargarReservas();

  } catch (error) {
    console.error("Error al realizar la reserva:", error);
    errorReserva.value = error.message || "No se pudo completar la reserva";

    // Mostrar el error 
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


// FUNCIONES PARA GESTIÓN DE ASISTENTES

// Abrir el modal para ver los asistentes a la ruta
function verAsistentes() {
  modalAsistentes.value.show();
}

// Abrir el modal para registrar asistencia (solo activo para el día de la ruta)
function abrirPasarLista() {
  // Cerrar el modal de asistentes
  modalAsistentes.value.hide();

  // Iniciar el objeto de asistencias
  if (Object.keys(asistencias.value).length == 0) {
    reservas.value.forEach(reserva => {
      asistencias.value[reserva.reserva_id] = null;
    });
  }

  // Abrir el nuevo modal
  setTimeout(() => {
    modalPasarLista.value.show();
  }, 500);
}

// Registrar la asistencia de los participantes (presente/ausente)
function marcarAsistencia(reservaId, presente) {
  asistencias.value[reservaId] = presente;

  // Si está presente, mostrar el contador de acompañantes
  if (presente && !asistentesReales.value[reservaId]) {
    const reserva = reservas.value.find(r => r.reserva_id == reservaId);
    asistentesReales.value[reservaId] = reserva ? reserva.num_personas : 0;
  }
}

// Guardar la información de asistencia (no se guarda en la API)
async function guardarAsistencias() {
  try {
    // Asignar los datos de asistencia
    const datosAsistencia = {
      asistencias: asistencias.value,
      asistentesReales: asistentesReales.value
    };

    //console.log('Datos a guardar:', datosAsistencia);

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

// FUNCIONES ADMIN

// Crear una copia de la ruta actual 
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
    // Validar los datos
    if (datosRuta.hora == "" || datosRuta.fecha == "") {
      throw new Error("Los campos de la fecha u hora están vacíos");
    }

    // Enviar solicitud para crear la ruta
    const response = await fetch("http://localhost/freetours/api.php/rutas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datosRuta),
    });

    if (response.ok) {
      // Cerrar el modal
      const modalDuplicar = document.getElementById('duplicarModal');
      const modal = Modal.getInstance(modalDuplicar);
      modal.hide();

      // Limpiar el modal
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Eliminar el fonde negro
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }

      // Mostrar confirmación
      await Swal.fire({
        title: '¡Duplicada!',
        text: 'La ruta ha sido duplicada correctamente',
        icon: 'success',
        confirmButtonColor: '#ffc107',
        timer: 2000,
        timerProgressBar: true,
        backdrop: false,
        allowOutsideClick: true,
        didClose: () => {
          //Limpiar los campos del modal
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
          nuevaFecha.value = "";
          nuevaHora.value = "";
          nuevoGuia.value = "";
        }
      });

    } else {
      throw new Error("Error al duplicar la ruta");
    }
  } catch (error) {
    // Mostrar mensaje de error
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

// Eliminar la ruta actual 
async function confirmarEliminacion() {
  try {

    const response = await fetch(`http://localhost/freetours/api.php/rutas?id=${ruta.value.id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      // Cerrar  el modal
      const modalEliminar = document.getElementById('eliminarModal');
      const modal = Modal.getInstance(modalEliminar);
      modal.hide();

      // Limpiar el modal
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Eliminar el fondo negro
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }

      // Mostrar confirmación 
      await Swal.fire({
        title: 'Eliminada',
        html: '<strong>La ruta ha sido eliminada </strong>',
        icon: 'success',
        iconColor: 'red',
        confirmButtonColor: '#dc3545',
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
          // Limpiar el modal
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
          // Redirigir a la página principal
          router.push('/');
        }
      });

    } else {
      throw new Error("Error al eliminar la ruta");
    }
  } catch (error) {
    // Mostrar mensaje de error
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

// Asignar un guía a la ruta actual 
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
      // 3. Cerrar el modal
      const modalAsignar = document.getElementById('asignarGuiaModal');
      const modal = Modal.getInstance(modalAsignar);
      modal.hide();

      // Limpiar el modal
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      // Eliminar el fondo negro
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }

      // Mostrar confirmación 
      await Swal.fire({
        title: '¡Asignado!',
        text: 'El guía ha sido asignado correctamente',
        icon: 'success',
        confirmButtonColor: '#0dcaf0',
        timer: 2000,
        timerProgressBar: true,
        backdrop: false,
        allowOutsideClick: true,
        didClose: () => {
          //Limpiar el modal
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
          //Recargar los datos
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

// comprobar que el usuario ha iniciado sesion
function mostrarModalLogin() {
  if (!modalLoginRequerido.value) {
    modalLoginRequerido.value = new Modal(document.getElementById('loginRequeridoModal'));
  }
  modalLoginRequerido.value.show();
}

function irALogin() {
  // Cerrar el modal antes de redirigir
  if (modalLoginRequerido.value) {
    modalLoginRequerido.value.hide();

    // Limpiar el modal
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    //Eliminar el fondo negro
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
    }
  }

  // Redirigir al inicio de sesión
  router.push('/login');
}



// Función para verificar si el usuario ya ha valorado esta ruta
async function verificarSiYaValoro() {
  if (!props.usuarioAutenticado) return;

  try {
    console.log("Verificando si el usuario ya valoró esta ruta...");

    // Hacer una solicitud a la API para obtener valoraciones por usuario y ruta
    const response = await fetch(`http://localhost/freetours/api.php/valoraciones?ruta_id=${props.id}&user_id=${props.usuarioAutenticado.id}`);

    if (!response.ok) {
      throw new Error(`Error al verificar valoraciones: ${response.status}`);
    }

    const valoracionesUsuario = await response.json();
    console.log("Valoraciones del usuario para esta ruta:", valoracionesUsuario);

    // Si hay al menos una valoración del usuario para esta ruta, ya ha valorado
    yaHaValorado.value = valoracionesUsuario.length > 0;

    console.log("¿Ya ha valorado?", yaHaValorado.value);
  } catch (error) {
    console.error("Error al verificar valoraciones:", error);
    yaHaValorado.value = false; // En caso de error, asumimos que no ha valorado
  }
}

// Función para crear una valoracion
async function enviarValoracion() {
  try {
    enviandoValoracion.value = true;
    errorValoracion.value = '';

    // Validar datos
    if (nuevaValoracion.value.puntuacion < 1 || nuevaValoracion.value.puntuacion > 5) {
      throw new Error('La puntuación debe estar entre 1 y 5 estrellas');
    }

    if (!nuevaValoracion.value.comentario.trim()) {
      throw new Error('El comentario no puede estar vacío');
    }

    const datosValoracion = {
      user_id: props.usuarioAutenticado.id,
      ruta_id: parseInt(props.id),
      estrellas: nuevaValoracion.value.puntuacion,
      comentario: nuevaValoracion.value.comentario
    };

    //console.log("Datos a enviar para valoración:", datosValoracion);

    // Enviar la valoración
    const response = await fetch('http://localhost/freetours/api.php/valoraciones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datosValoracion)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al enviar valoración: ${response.status} - ${errorText}`);
    }

    // Cerrar formulario y actualizar valoraciones
    mostrarFormularioValoracion.value = false;

    // Mostrar mensaje de éxito
    Swal.fire({
      title: '¡Gracias por tu valoración!',
      text: 'Tu opinión ayuda a otros usuarios a elegir las mejores rutas',
      icon: 'success',
      confirmButtonColor: '#28a745'
    });

    // Actualizar las valoraciones
    await cargarValoraciones();

    // Actualizar el estado de valoración
    yaHaValorado.value = true;

  } catch (error) {
    console.error("Error al enviar valoración:", error);
    errorValoracion.value = error.message;

    Swal.fire({
      title: 'Error',
      text: errorValoracion.value,
      icon: 'error',
      confirmButtonColor: '#dc3545'
    });
  } finally {
    enviandoValoracion.value = false;
  }
}

// Función para redirigir a mis reservas
function irAMisReservas() {
  router.push('/misReservas');
}

// Función para modificar asistentes
function modificarAsistentes() {

  const reservaUsuario = reservas.value.find(reserva => {
    const clienteId = props.usuarioAutenticado.id;
    const email = props.usuarioAutenticado.email?.toLowerCase();

    return (reserva.cliente_id == clienteId ||
      reserva.usuario_email.toLowerCase() == email) &&
      reserva.ruta_id == props.id;
  });

  if (reservaUsuario) {
    numPersonas.value = reservaUsuario.num_personas;

    // Crear modal para modificar la reserva
    const modalModificar = new Modal(document.getElementById('modificarReservaModal'));
    modalModificar.show();
  } else {
    Swal.fire({
      title: 'Error',
      text: 'No se encontró tu reserva para esta ruta',
      icon: 'error',
      confirmButtonColor: '#dc3545'
    });
  }
}

// Actualizar la reserva
async function actualizarReserva() {
  try {
    cargandoReserva.value = true;
    errorReserva.value = "";

    // Obtenemos la reserva 
    const reservaUsuario = reservas.value.find(reserva => {
      const clienteId = props.usuarioAutenticado.id;
      const email = props.usuarioAutenticado.email?.toLowerCase();

      return (reserva.cliente_id == clienteId ||
        reserva.usuario_email.toLowerCase() == email) &&
        reserva.ruta_id == props.id;
    });

    if (!reservaUsuario) {
      throw new Error('No se encontró tu reserva para esta ruta');
    }

    //  Eliminar la reserva existente
    const responseDelete = await fetch(`http://localhost/freetours/api.php/reservas?id=${reservaUsuario.reserva_id}`, {
      method: 'DELETE'
    });

    if (!responseDelete.ok) {
      const errorDelete = await responseDelete.text();
      throw new Error(`Error al eliminar la reserva existente: ${responseDelete.status} - ${errorDelete}`);
    }

    //  Crear una nueva reserva con el número nuevo de asistentes
    const datosNuevaReserva = {
      email: reservaUsuario.usuario_email,
      ruta_id: parseInt(props.id),
      num_personas: numPersonas.value
    };

    const responseCreate = await fetch('http://localhost/freetours/api.php/reservas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datosNuevaReserva)
    });

    // Verificar respuesta 
    if (!responseCreate.ok) {
      const errorCreate = await responseCreate.text();
      throw new Error(`Error al crear la nueva reserva: ${responseCreate.status} - ${errorCreate}`);
    }

    // Cerrar el modal
    const modalModificarEl = document.getElementById('modificarReservaModal');
    if (modalModificarEl) {
      const modalInstance = Modal.getInstance(modalModificarEl);
      if (modalInstance) {
        modalInstance.hide();
      }
    }

    // Limpiar el modal
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';

    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
    }

    // Mostrar confirmación 
    await Swal.fire({
      title: '¡Reserva actualizada!',
      text: `Has modificado tu reserva a ${numPersonas.value} ${numPersonas.value == 1 ? 'persona' : 'personas'}`,
      icon: 'success',
      confirmButtonColor: '#28a745',
      confirmButtonText: 'Ver mis reservas',
      showCancelButton: true,
      cancelButtonText: 'Continuar aquí',
      backdrop: false,
      timer: 3000, 
      timerProgressBar: true, 
    }).then((result) => {
      if (result.isConfirmed) {
        // Redirigir a misReservas
        router.push('/misReservas');
      }
    });

    // Actualizar los datos 
    await cargarReservas();

    // Actualizar contador de asistentes
    if (ruta.value) {
      ruta.value.asistentes = numPersonas.value;
    }

  } catch (error) {
    console.error("Error al actualizar la reserva:", error);
    errorReserva.value = error.message || "No se pudo actualizar la reserva";

    // Mostrar el error 
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

// Verificar si el usuario ha creado una valoracion
function esAutorValoracion(valoracion) {
  if (!props.usuarioAutenticado || !valoracion) return false;

  // obtener el id del usuario actual
  const usuarioClienteId = obtenerusuarioActual();

  // Comparar el cliente_id del usuario con el cliente_id de la valoración
  return usuarioClienteId && Number(usuarioClienteId) === Number(valoracion.cliente_id);
}

// Obtener el id del usuario actual
function obtenerusuarioActual() {
  // Si ya esta almacenada se devuelve
  if (clienteIdUsuarioActual.value) {
    return clienteIdUsuarioActual.value;
  }

  if (!reservas.value.length) return null;

  // Buscar la reserva del usuario actual
  const reservaUsuario = reservas.value.find(reserva => {
    const email = props.usuarioAutenticado.email?.toLowerCase();

    return reserva.usuario_email.toLowerCase() == email;
  });

  // Guardar el id del ususario
  if (reservaUsuario) {
    clienteIdUsuarioActual.value = reservaUsuario.cliente_id;
    return clienteIdUsuarioActual.value;
  }

  return null;
}


// eliminar Valoracion
async function eliminarValoracion(valoracionId) {
  try {
    // Mostrar confirmación para eliminar
    const resultado = await Swal.fire({
      title: '¿Eliminar valoración?',
      text: '¿Estás seguro de que quieres eliminar tu valoración? Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!resultado.isConfirmed) {
      return; // El usuario canceló 
    }

    // Enviar solicitud para eliminar la valoración
    const response = await fetch(`http://localhost/freetours/api.php/valoraciones?id=${valoracionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Error al eliminar la valoración: ${response.status}`);
    }

    // Mostrar mensaje de éxito
    await Swal.fire({
      title: 'Valoración eliminada',
      text: 'Tu valoración ha sido eliminada correctamente',
      icon: 'success',
      confirmButtonColor: '#28a745',
      timer: 3000,
      timerProgressBar: true
    });

    // Actualizar a false
    yaHaValorado.value = false;

    // Recargar las valoraciones
    await cargarValoraciones();

    // Verificar de nuevo para asegurarse
    setTimeout(() => {
      verificarSiYaValoro();
    }, 1000);

  } catch (error) {
    console.error("Error al eliminar valoración:", error);

    // Mostrar mensaje de error
    Swal.fire({
      title: 'Error',
      text: error.message || 'No se pudo eliminar la valoración',
      icon: 'error',
      confirmButtonColor: '#dc3545',
      timer: 3000,
      timerProgressBar: true
    });
  }
}

// Cancelar la reserva del usuario
async function cancelarMiReserva() {
  try {
    // Obtener la reserva actual del usuario
    const reservaUsuario = reservas.value.find(reserva => {
      const clienteId = props.usuarioAutenticado.id;
      const email = props.usuarioAutenticado.email?.toLowerCase();

      return (reserva.cliente_id == clienteId ||
        reserva.usuario_email.toLowerCase() == email) &&
        reserva.ruta_id == props.id;
    });

    if (!reservaUsuario) {
      throw new Error('No se encontró tu reserva para esta ruta');
    }

    // Mostrar confirmación antes de cancelar
    const confirmar = await Swal.fire({
      title: '¿Cancelar reserva?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No, mantener'
    });

    if (!confirmar.isConfirmed) {
      return;
    }

    // Enviar solicitud de cancelación
    const response = await fetch(`http://localhost/freetours/api.php/reservas?id=${reservaUsuario.reserva_id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Error al cancelar la reserva: ${response.status}`);
    }

    // Mostrar mensaje de éxito
    await Swal.fire({
      title: 'Reserva cancelada',
      text: 'Tu reserva ha sido cancelada correctamente',
      icon: 'success',
      confirmButtonColor: '#28a745',
      timer: 3000,
      timerProgressBar: true
    });

    // Actualizar el estado 
    if (ruta.value) {
      //Actualizar el numero de asistentes a 0
      ruta.value.asistentes = 0;    
    }

    // Recargar las reservas
    await cargarReservas();

  } catch (error) {
    console.error("Error al cancelar reserva:", error);

    // Mostrar mensaje de error
    Swal.fire({
      title: 'Error',
      text: error.message || 'No se pudo cancelar la reserva',
      icon: 'error',
      confirmButtonColor: '#dc3545'
    });
  }
}

onMounted(() => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  cargarDatos().then(() => {
    cargarGuias(); 
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

  // Iniciar todos los modales
  instanciaModalDuplicar = new Modal(document.getElementById('duplicarModal'));
  new Modal(document.getElementById('eliminarModal'));

  // Añadir event listener para redireccionar al cerrar el modal de eliminación
  document.getElementById('eliminarModal').addEventListener('hidden.bs.modal', () => {
    if (eliminacionCompletada.value) { 
      //Si se ha eliminado correctamente hace la redireccion
      router.push("/");
    }
  });

  modalAsignarGuia.value = new Modal(document.getElementById('asignarGuiaModal'));
  modalAsistentes.value = new Modal(document.getElementById('asistentesModal'));
  modalPasarLista.value = new Modal(document.getElementById('pasarListaModal'));
  modalReserva.value = new Modal(document.getElementById('reservaModal'));
  modalLoginRequerido.value = new Modal(document.getElementById('loginRequeridoModal'));
  new Modal(document.getElementById('modificarReservaModal'));
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
    <!-- Imagen principal -->
    <div class="w-100">
      <img :src="urlImagen" :alt="ruta.titulo" class="img-fluid w-100 rounded" style="height: 400px; object-fit: cover"
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
            <div id="mapa" class="map"></div>
          </div>
        </div>

        <!-- Parte derecha: Detalles y Botones -->
        <div class="col-md-4 detalles-col">
          <!-- Información común-->
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
            <p class="detalle">{{ ruta.asistentes || 0 }}</p>
          </div>

          <!-- SECCIÓN DE RESERVA -->
          <div v-if="props.usuarioAutenticado" class="w-100 mb-3">

            <div class="d-grid gap-2">
              <!--  botones de gestión -->
              <button v-if="yaHaReservado && !rutaYaPaso" type="button" class="btn btn-info text-white w-100"
                @click="modificarAsistentes">
                <i class="bi bi-pencil-square me-2"></i>Modificar asistentes
              </button>

              <!--  botón de completada -->
              <button v-else-if="yaHaReservado && rutaYaPaso" type="button" class="btn btn-success w-100" disabled>
                <i class="bi bi-check-circle me-2"></i>Completada
              </button>

              <!-- botón de reservar -->
              <button v-else type="button" class="btn btn-primary w-100" @click="abrirModalReserva">
                <i class="bi bi-calendar-plus me-2"></i>Reservar
              </button>

              <!-- Botón para ir a Mis Reservas -->
              <button v-if="yaHaReservado && !rutaYaPaso" type="button" class="btn btn-outline-primary w-100 mb-2"
                @click="irAMisReservas">
                <i class="bi bi-eye me-2"></i>Ver en Mis Reservas
              </button>

              <!-- boton para cancelar reserva -->
              <button v-if="yaHaReservado && !rutaYaPaso" type="button" class="btn btn-outline-danger w-100"
                @click="cancelarMiReserva">
                <i class="bi bi-x-circle me-2"></i>Cancelar reserva
              </button>
            </div>
          </div>

          <!-- SECCIÓN DE USUARIO NO AUTENTICADO -->
          <div v-else class="w-100 mb-3">
            <button type="button" class="btn btn-outline-primary w-100" @click="mostrarModalLogin">
              Iniciar sesión para reservar
            </button>
          </div>

          <!-- Separador -->
          <hr class="mb-3">

          <!-- SECCIÓN DE ADMINISTRADOR -->
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

          <!-- SECCIÓN DE GUÍA -->
          <div v-else-if="esGuiaAsignado" class="btn-group mb-3 w-100" role="group">
            <button type="button" class="btn btn-info text-white w-100" @click="verAsistentes">
              Ver Asistentes
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Valoraciones -->
    <div class="container mt-5 mb-5">
      <hr>
      <h2 class="text-center mb-4">Valoraciones</h2>

      <!-- Botón de añadir valoración -->
      <div class="text-center mb-4" v-if="props.usuarioAutenticado && yaHaReservado && rutaYaPaso">
        <!-- Botón Añadir mi valoración -->
        <button v-if="!yaHaValorado && !mostrarFormularioValoracion" @click="mostrarFormularioValoracion = true"
          class="btn btn-primary">
          <i class="bi bi-star-fill me-2"></i>Añadir mi valoración
        </button>

        <!-- Botón Ya has valorado esta ruta -->
        <button v-if="yaHaValorado" class="btn btn-secondary" disabled>
          <i class="bi bi-check-circle-fill me-2"></i>Ya has valorado esta ruta
        </button>

        <!-- Formulario de valoración -->
        <div v-if="!yaHaValorado && mostrarFormularioValoracion" class="card shadow-sm mx-auto"
          style="max-width: 600px;">
          <div class="card-header d-flex justify-content-between align-items-center bg-light">
            <h5 class="mb-0">Tu valoración para esta ruta</h5>
            <button type="button" class="btn-close" @click="mostrarFormularioValoracion = false"></button>
          </div>
          <div class="card-body">
            <!-- Puntuación con estrellas -->
            <div class="mb-4">
              <label class="form-label">Puntuación</label>
              <div class="star-rating d-flex justify-content-center">
                <template v-for="star in 5" :key="`star-${star}`">
                  <button type="button" class="btn btn-link p-0 me-2" @click="nuevaValoracion.puntuacion = star">
                    <i class="bi"
                      :class="star <= nuevaValoracion.puntuacion ? 'bi-star-fill text-warning' : 'bi-star text-muted'"
                      style="font-size: 2rem;"></i>
                  </button>
                </template>
              </div>
            </div>

            <!-- Comentario -->
            <div class="mb-3">
              <label for="comentario" class="form-label">Tu comentario</label>
              <textarea class="form-control" id="comentario" v-model="nuevaValoracion.comentario" rows="3"
                placeholder="Cuéntanos tu experiencia en esta ruta..."></textarea>
            </div>

            <!-- Error -->
            <div v-if="errorValoracion" class="alert alert-danger">
              {{ errorValoracion }}
            </div>

            <!-- Botones de acción -->
            <div class="text-center mt-4">
              <button type="button" class="btn btn-secondary me-2"
                @click="mostrarFormularioValoracion = false">Cancelar</button>
              <button type="button" class="btn btn-success" @click="enviarValoracion" :disabled="enviandoValoracion">
                <span v-if="enviandoValoracion" class="spinner-border spinner-border-sm me-2" role="status"></span>
                Enviar valoración
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="row" v-if="valoraciones && valoraciones.length > 0">
        <div class="col-12 col-md-6 col-lg-4 mb-4" v-for="(valoracion, index) in valoraciones" :key="index">
          <div class="card h-100 shadow-sm valoracion-card">
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
              <div class="d-flex align-items-center">
                <div class="rating-badge me-2">
                  {{ valoracion.puntuacion }}
                  <i class="bi bi-star-fill text-warning"></i>
                </div>
                <div>
                  <h6 class="mb-0">{{ valoracion.cliente_nombre }}</h6>
                </div>
              </div>
              <!-- Botón para eliminar valoración solo visible para el autor -->
              <button v-if="esAutorValoracion(valoracion)" class="btn btn-sm btn-outline-danger"
                @click="eliminarValoracion(valoracion.valoracion_id)" title="Eliminar mi valoración">
                <i class="bi bi-trash"></i>
              </button>
            </div>
            <div class="card-body">
              <p class="card-text">{{ valoracion.comentario }}</p>
            </div>
            <div class="card-footer bg-white text-muted">
              <small>{{ formatearFecha(valoracion.fecha_valoracion) }}</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Mensaje cuando no hay valoraciones -->
      <div class="text-center p-4" v-else>
        <div class="empty-rating-container p-5 rounded">
          <i class="bi bi-chat-square-text fs-1 text-muted mb-3"></i>
          <h5>No hay valoraciones para esta ruta</h5>
          <p class="text-muted">¡Sé el primero en valorar esta experiencia!</p>
        </div>
      </div>
    </div>

    <!-- MODALES PARA ADMINISTRADOR -->
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

    <!-- MODALES PARA GUÍAS -->
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
            <!-- Lista de asistentes -->
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

    <!-- MODALES PARA CLIENTES -->
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

    <!-- Modal para modificar reserva -->
    <div class="modal fade" id="modificarReservaModal" tabindex="-1" aria-labelledby="modificarReservaModalLabel"
      aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="modificarReservaModalLabel">Modificar asistentes para: {{ ruta.titulo }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info" role="alert">
              <i class="bi bi-info-circle-fill me-2"></i>
              Puedes modificar el número de asistentes para esta reserva.
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
            <button type="button" class="btn btn-success" @click="actualizarReserva" :disabled="cargandoReserva">
              <span v-if="cargandoReserva" class="spinner-border spinner-border-sm me-2" role="status"
                aria-hidden="true"></span>
              Actualizar Reserva
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODALES PARA USUARIOS NO AUTENTICADOS -->
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
}

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


.selector-personas .btn:hover {
  background-color: #e9ecef;
  z-index: 1;
}

.selector-personas .btn-primary {
  z-index: 2;
}

/* Estilos para la sección de valoraciones */
.valoracion-card {
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.valoracion-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1) !important;
}

.rating-badge {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.empty-rating-container {
  background-color: #f8f9fa;
  border: 1px dashed #dee2e6;
}

/* Responsividad para valoraciones */
@media (max-width: 767.98px) {
  .valoracion-card {
    margin-bottom: 1rem;
  }
}

@media (max-width: 575.98px) {
  .valoracion-card .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .valoracion-card .card-header .rating-badge {
    margin-bottom: 0.5rem;
  }
}

/* Estilo para las estrellas interactivas */
.star-rating .btn-link {
  color: inherit;
  text-decoration: none;
  transition: transform 0.2s;
}

.star-rating .btn-link:hover {
  transform: scale(1.2);
}

.star-rating .btn-link:focus {
  box-shadow: none;
}

#mapa {
  height: 400px;
  width: 100%;
  border-radius: 8px;
  z-index: 0;
}

.map-container {
  position: relative;
  width: 100%;
  height: 400px;
  margin-bottom: 2rem;
}

.map {
  border: 1px solid #dee2e6;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}
</style>
