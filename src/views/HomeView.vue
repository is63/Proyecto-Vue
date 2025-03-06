<script setup>
import { ref, onMounted, computed } from "vue";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";

const URL_BASE_API = "http://localhost/freetours/api.php"; // URL base de la API
const rutas = ref([]); // Estado reactivo para almacenar las rutas
const valoraciones = ref([]); // Estado reactivo para almacenar las valoraciones
const error = ref(""); // Estado para manejar errores
const busqueda = ref(""); // Estado para almacenar el texto de búsqueda
const tipoBusqueda = ref('texto'); // Nuevo estado para controlar el tipo de búsqueda (texto/fecha)

// Variable para almacenar la instancia de flatpickr
const instanciaCalendario = ref(null);

// Modificar las variables del video
const medio = ref(null);
const botonReproducir = ref('/img/jugar.png'); // ▶️ (esto cambia entre play y pause)

// Funciones para controlar el video
function reproducirPausar() {
  if (!medio.value.paused && !medio.value.ended) {
    medio.value.pause();
    botonReproducir.value = '/img/jugar.png'; // ▶️
  } else {
    medio.value.play();
    botonReproducir.value = '/img/pausa.png'; // ⏸️
  }
}

function reiniciar() {
  medio.value.currentTime = 0;
}

function retroceder() {
  if (medio.value.currentTime > 0) {
    medio.value.currentTime = medio.value.currentTime - 1;
  }
}

function avanzar() {
  if (medio.value.currentTime < medio.value.duration) {
    medio.value.currentTime = medio.value.currentTime + 1;
  }
}

function silenciar() {
  medio.value.muted = !medio.value.muted;
}

function subirVolumen() {
  if (medio.value.volume < 1) {
    medio.value.volume = Math.min(1, medio.value.volume + 0.1);
  }
}

function bajarVolumen() {
  if (medio.value.volume > 0) {
    medio.value.volume = Math.max(0, medio.value.volume - 0.1);
  }
}

// Variables y funciones para la paginación

const paginaActual = ref(1);
const rutasPorPagina = ref(5);

const rutasPaginadas = computed(() => {
  const inicio = (paginaActual.value - 1) * rutasPorPagina.value;
  const fin = inicio + rutasPorPagina.value;
  return filtrarRutas().slice(inicio, fin);
});

const totalPaginas = computed(() => Math.ceil(filtrarRutas().length / rutasPorPagina.value));


function cambiarPagina(pagina) {
  if (pagina >= 1 && pagina <= totalPaginas.value) {
    paginaActual.value = pagina;
    //Time Out para que cargue la paginacion antes 
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 100);
  }
}

// Función para manejar errores en las imágenes)

function manejarErrorImagen(e) {
  //Mostrar una imagen de reemplazo si la imagen no se puede cargar
  e.target.src = 'https://placehold.co/600x400?text=Imagen+no+disponible';
}

// Función para obtener las rutas desde la API
async function obtenerRutas() {
  try {
    const respuesta = await fetch(`${URL_BASE_API}/rutas`);
    if (!respuesta.ok) throw new Error("Error al cargar las rutas");

    const datos = await respuesta.json();

    // Verificar que los datos que han devuelto sean un array
    if (Array.isArray(datos)) {
      rutas.value = datos.map((ruta) => ({
        id: ruta.id,
        titulo: ruta.titulo,
        localidad: ruta.localidad,
        descripcion: ruta.descripcion,
        foto: ruta.foto,
        fecha: ruta.fecha,
        valoraciones: [],
      }));
    } else {
      throw new Error("La API no devolvió un array de rutas");
    }
  } catch (err) {
    console.error("Error:", err);
    error.value = "No se pudieron cargar las rutas. Inténtalo más tarde.";
  }
}

// Función para obtener las valoraciones desde la API
async function obtenerValoraciones() {
  try {
    const response = await fetch(`${URL_BASE_API}/valoraciones`);
    if (!response.ok) throw new Error("Error al cargar las valoraciones");

    const data = await response.json();

    // Verificar que los datos sean un array
    if (Array.isArray(data)) {
      valoraciones.value = data;

      // Asignar las valoraciones a las rutas correspondientes
      rutas.value.forEach((ruta) => {
        ruta.valoraciones = valoraciones.value.filter(
          (valoracion) => valoracion.ruta_id == ruta.id
        );
      });
    } else {
      throw new Error("La API no devolvió un array de valoraciones");
    }
  } catch (err) {
    console.error("Error:", err);
    error.value = "No se pudieron cargar las valoraciones. Inténtalo más tarde.";
  }
}

// Función para filtrar rutas según la búsqueda
function filtrarRutas() {
  if (tipoBusqueda.value === 'fecha') {
    // Si la fecha está vacía, mostrar todas las rutas
    if (!busqueda.value) {
      return rutas.value;
    }
    // Formatear la fecha de búsqueda a YYYY-MM-DD
    const fechaFormateada = new Date(busqueda.value).toISOString().split('T')[0];
    return rutas.value.filter((ruta) =>
      ruta.fecha === fechaFormateada
    );
  } else {
    // Busqueda por texto (título o localidad)
    if (!busqueda.value) {
      return rutas.value;
    }
    return rutas.value.filter((ruta) =>
      ruta.titulo.toLowerCase().includes(busqueda.value.toLowerCase()) ||
      ruta.localidad.toLowerCase().includes(busqueda.value.toLowerCase())
    );
  }
}

// Nueva funcion para cambiar el tipo de búsqueda
function cambiarTipoBusqueda() {
  // Destruir la instancia anterior de flatpickr si existe
  if (instanciaCalendario.value) {
    instanciaCalendario.value.destroy();
    instanciaCalendario.value = null;
  }

  tipoBusqueda.value = tipoBusqueda.value === 'texto' ? 'fecha' : 'texto';
  busqueda.value = ''; // Limpiar el campo de busqueda al cambiar

  // Si cambiamos a fecha, inicializar flatpickr
  if (tipoBusqueda.value === 'fecha') {
    setTimeout(() => {
      instanciaCalendario.value = flatpickr("#fechaBusqueda", {
        dateFormat: "Y-m-d",
        onChange: (selectedDates, dateStr) => {
          busqueda.value = dateStr;
        }
      });
    });
  }
}

onMounted(async () => {
  await obtenerRutas();
  await obtenerValoraciones();
});
</script>

<template>
  <div class="container">
    <!-- Barra de busqueda  -->
    <div class="mb-4 mt-4">
      <form @submit.prevent="filtrarRutas" class="buscador-container">
        <!-- Formulario de busqueda -->
        <div class="buscador ms-3">
          <input v-model="busqueda" :type="tipoBusqueda === 'fecha' ? 'text' : 'text'"
            class="form-control rounded-pill ps-5 input-busqueda" :class="{ 'texto': tipoBusqueda === 'texto' }"
            :placeholder="tipoBusqueda === 'fecha' ? 'Buscar por fecha' : 'Buscar por título o localidad'"
            :id="tipoBusqueda === 'fecha' ? 'fechaBusqueda' : ''" aria-label="Buscar" />
          <i class="bi bi-search icono-busqueda"></i>
        </div>
        <button type="button" @click="cambiarTipoBusqueda" class="btn btn-outline-primary rounded-pill ms-3 btn-toggle">
          <i class="bi" :class="tipoBusqueda === 'fecha' ? 'bi-calendar3' : 'bi-text-left'"></i>
          {{ tipoBusqueda === 'fecha' ? 'Fecha' : 'Nombre/Localidad' }}
        </button>
      </form>
    </div>

    <!-- Carrusel con altura responsiva -->
    <div id="carouselExample" class="carousel slide border mb-4 bg-white rounded mt-5">
      <div class="carousel-inner">
        <div class="carousel-item active" data-bs-interval="false" data-bs-pause="hover">
          <img src="/img/Almagro.webp" class="d-block w-100 carousel-img" alt="Imagen carrusel 1" />
        </div>
        <div class="carousel-item" data-bs-interval="false" data-bs-pause="hover">
          <img src="/img/EmbajadaBerlin.webp" class="d-block w-100 carousel-img" alt="Imagen carrusel 2" />
        </div>
        <div class="carousel-item" data-bs-interval="false" data-bs-pause="hover">
          <img src="/img/MezquitaCordoba.webp" class="d-block w-100 carousel-img" alt="Imagen carrusel 3" />
        </div>
      </div>
      <!-- Controles del carrusel -->
      <button class="carousel-control-prev" type="button" data-bs-target="#carouselExample" data-bs-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#carouselExample" data-bs-slide="next">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
      </button>
    </div>

    <!-- Mensaje de error y no hay rutas -->
    <div v-if="error" class="alert alert-danger text-center mt-5">{{ error }}</div>
    <div v-else>
      <!-- Tarjetas de rutas obtenidas desde la API -->
      <div v-if="filtrarRutas().length > 0" class="row g-4 mb-4 mt-5">
        <div v-for="(ruta, index) in rutasPaginadas" :key="index" class="col-12">
          <div class="card h-100 shadow-sm mb-4">
            <div class="row g-0">
              <!-- Imagen de la API -->
              <div class="col-md-5 p-3">
                <img :src="ruta.foto" class="img-fluid rounded-start w-100" style="height: 250px; object-fit: cover"
                  :alt="ruta.titulo" @error="manejarErrorImagen">
              </div>
              <!-- Contenido de la tarjeta -->
              <div class="col-md-7">
                <div class="card-body">
                  <router-link :to="`/ruta/${ruta.id}`" class="text-decoration-none">
                    <h3 class="card-title text-primary">{{ ruta.titulo }}</h3>
                  </router-link>
                  <p class="card-text">{{ ruta.descripcion }}</p>
                  <p class="card-text">
                    <small class="text-muted">{{ ruta.localidad }}</small>
                  </p>
                  <p class="card-text">
                    <small class="text-muted"><i class="bi bi-calendar3"></i> {{ ruta.fecha }}</small>
                  </p>
                </div>
              </div>
            </div>

            <!-- Seccion de valoraciones -->
            <div class="card-footer bg-light">
              <h5 class="mb-3">Valoraciones:</h5>
              <div v-if="ruta.valoraciones.length > 0">
                <div v-for="(valoracion, index) in ruta.valoraciones" :key="index" class="mb-3">
                  <div class="d-flex align-items-center">
                    <span class="badge bg-primary me-2">
                      {{ valoracion.puntuacion }} ★
                    </span>
                    <p class="mb-0">{{ valoracion.comentario }}</p>
                  </div>
                  <small class="text-muted">{{ valoracion.fecha_valoracion }}</small>
                </div>
              </div>
              <p v-else class="text-muted">
                No hay valoraciones para esta ruta.
              </p>
            </div>
          </div>
        </div>

        <!-- Paginación -->
        <nav aria-label="Navegación de páginas" class="mt-4">
          <ul class="pagination justify-content-center">
            <li class="page-item" :class="{ disabled: paginaActual === 1 }">
              <a class="page-link" href="#" @click.prevent="cambiarPagina(paginaActual - 1)">
                &laquo;
              </a>
            </li>
            <li v-for="pagina in totalPaginas" :key="pagina" class="page-item"
              :class="{ active: paginaActual === pagina }">
              <a class="page-link" href="#" @click.prevent="cambiarPagina(pagina)">
                {{ pagina }}
              </a>
            </li>
            <li class="page-item" :class="{ disabled: paginaActual === totalPaginas }">
              <a class="page-link" href="#" @click.prevent="cambiarPagina(paginaActual + 1)">
                &raquo;
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <!-- Mensaje al no encontrar ruta-->
      <p v-else class="text-center text-muted mt-5 ms-5">
        <span class="h1 text-danger">No se encontraron rutas.</span><br>
        <span class="d-flex justify-content-center align-content-center">
          <img class="mt-5"
            src="https://img.freepik.com/vector-premium/persona-confundida-mirando-mapa-desinformacion-lleno-burbujas-desinformaciocion-muertos_216520-73455.jpg"
            width="50%">
        </span>
      </p>

    </div>

    <!-- Video -->
    <div class="video-section mt-5 mb-4">
      <div class="video-container border rounded bg-white p-4">
        <video ref="medio" class="w-100 video-player" controls>
          <source src="/video/crush.mp4" type="video/mp4">
        </video>

        <!-- Controles de video -->
        <div class="video-controls mt-4">

          <div class="d-flex flex-column flex-md-row justify-content-center gap-md-3">

            <!-- Controles principales -->
            <div class="d-flex justify-content-center gap-2 mb-3 mb-md-0">
              <button class="btn btn-outline-primary control-btn" @click="reiniciar" title="Reiniciar">
                <img src="/img/atrasdoble.png" alt="Reiniciar">
              </button>
              <button class="btn btn-outline-primary control-btn" @click="retroceder" title="Retroceder">
                <img src='/img/atras.png' alt="Retroceder">
              </button>
              <button class="btn btn-outline-primary control-btn" @click="reproducirPausar" title="Reproducir/Pausar">
                <img :src="botonReproducir" alt="Reproducir/Pausar">
              </button>
              <button class="btn btn-outline-primary control-btn" @click="avanzar" title="Avanzar">
                <img src='/img/alante.png' alt="Avanzar">
              </button>
              <button class="btn btn-outline-primary control-btn" @click="silenciar" title="Silenciar">
                <img src="/img/sin-sonido.png" alt="Silenciar">
              </button>
            </div>

            <!-- Controles de volumen -->
            <div class="d-flex justify-content-center align-items-center gap-2">
              <span class="text-dark volume-label">Volumen</span>
              <button class="btn btn-outline-primary control-btn" @click="bajarVolumen" title="Bajar volumen">
                <img src="/img/altavoz-bajo.png" alt="Bajar volumen">
              </button>
              <button class="btn btn-outline-primary control-btn" @click="subirVolumen" title="Subir volumen">
                <img src="/img/altavoz-alto.png" alt="Subir volumen">
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.buscador-container {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.buscador {
  position: relative;
  flex: 1;
}

.icono-busqueda {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
}

input[type="date"] {
  font-family: inherit;
}

.btn-outline-primary.active {
  background-color: #0d6efd;
  color: white;
}

.btn-toggle {
  width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.input-busqueda {
  background-color: white;
}

.texto {
  cursor: text;
}

.video-container {
  max-width: 720px;
  margin: 0 auto;
}

video {
  width: 100%;
  height: auto;
}

.btn {
  min-width: 40px;
}

.pagination {
  margin-bottom: 2rem;
}

.page-link {
  color: #0d6efd;
  cursor: pointer;
}

.page-item.active .page-link {
  background-color: #0d6efd;
  border-color: #0d6efd;
}

.page-item.disabled .page-link {
  color: #6c757d;
  pointer-events: none;
  background-color: #fff;
  border-color: #dee2e6;
}

.video-section {
  max-width: 1000px;
  margin: 0 auto;
}

.video-container {
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}

/* Estilos para el carrusel*/
.carousel-img {
  height: 450px;
  object-fit: cover;
}

@media (max-width: 768px) {
  .carousel-img {
    height: 300px;
  }
}

@media (max-width: 576px) {
  .carousel-img {
    height: 200px;
  }
}

/* Estilo para los controles de video */
.video-player {
  height: 450px;
  background-color: black;
  object-fit: contain;
}

.control-btn {
  min-width: 42px;
  height: 42px;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.volume-label {
  font-size: 0.9rem;
  font-weight: 500;
}

/* Menu de video 2, Ahora es responsive */
@media (max-width: 768px) {
  .video-player {
    height: 350px;
  }

  .control-btn {
    min-width: 46px;
    height: 46px;
  }
}

@media (max-width: 576px) {
  .video-player {
    height: 250px;
  }

  .video-container {
    padding: 15px !important;
  }
}
</style>
