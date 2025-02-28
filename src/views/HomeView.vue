<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router"; // Importamos useRouter para redirigir
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";

const URL_BASE_API = "http://localhost/freetours/api.php"; // URL base de la API
const rutas = ref([]); // Estado reactivo para almacenar las rutas
const valoraciones = ref([]); // Estado reactivo para almacenar las valoraciones
const error = ref(""); // Estado para manejar errores
const enrutador = useRouter(); // Instancia de Vue Router
const busqueda = ref(""); // Estado para almacenar el texto de búsqueda
const tipoBusqueda = ref('texto'); // Nuevo estado para controlar el tipo de búsqueda (texto/fecha)

// Variable para almacenar la instancia de flatpickr
const instanciaCalendario = ref(null);

// Modificar las refs del video
const medio = ref(null);
const botonReproducir = ref('/img/jugar.png'); // ▶️ (esto cambia entre play y pause)

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

// Add after other ref declarations
const paginaActual = ref(1);
const rutasPorPagina = ref(5);

// Add this computed property
const rutasPaginadas = computed(() => {
  const inicio = (paginaActual.value - 1) * rutasPorPagina.value;
  const fin = inicio + rutasPorPagina.value;
  return filtrarRutas().slice(inicio, fin);
});

const totalPaginas = computed(() => Math.ceil(filtrarRutas().length / rutasPorPagina.value));

// Add this function to handle page changes
function cambiarPagina(pagina) {
  if (pagina >= 1 && pagina <= totalPaginas.value) {
    paginaActual.value = pagina;
  }
}

// Add this function in the script section
function manejarErrorImagen(e) {
  console.error('Error al cargar la imagen:', e);
  e.target.src = 'https://placehold.co/600x400?text=Imagen+no+disponible';
}

// Update the obtenerRutas function to use URLs directly
async function obtenerRutas() {
  try {
    const respuesta = await fetch(`${URL_BASE_API}/rutas`);
    if (!respuesta.ok) throw new Error("Error al cargar las rutas");

    const datos = await respuesta.json();

    if (Array.isArray(datos)) {
      rutas.value = datos.map((ruta) => ({
        id: ruta.id,
        titulo: ruta.titulo,
        localidad: ruta.localidad,
        descripcion: ruta.descripcion,
        foto: ruta.foto, // Using the URL directly from the API
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

    // Verificamos que los datos sean un array
    if (Array.isArray(data)) {
      valoraciones.value = data;

      // Asignamos las valoraciones a las rutas correspondientes
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

// Función para redirigir a la página de ver ruta
function verRuta(id) {
  enrutador.push(`/ruta/${id}`); // Redirigimos a la ruta dinámica
}

// Función modificada para filtrar rutas según la búsqueda
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
    // Busqueda por texto (titulo o localidad)
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
            class="form-control rounded-pill ps-5 search-input" :class="{ 'texto': tipoBusqueda === 'texto' }"
            :placeholder="tipoBusqueda === 'fecha' ? 'Buscar por fecha' : 'Buscar por título o localidad'"
            :id="tipoBusqueda === 'fecha' ? 'fechaBusqueda' : ''" aria-label="Buscar" />
          <i class="bi bi-search icono-busqueda"></i>
        </div>
        <button type="button" @click="cambiarTipoBusqueda" class="btn btn-outline-primary rounded-pill ms-3 btn-toggle">
          <i class="bi" :class="tipoBusqueda === 'fecha' ? 'bi-text-left' : 'bi-calendar3'"></i>
          {{ tipoBusqueda === 'fecha' ? 'Fecha' : 'Nombre/Localidad' }}
        </button>
      </form>
    </div>

    <!-- Carrusel -->
    <div id="carouselExample" class="carousel slide border mb-4 bg-white rounded mt-5">
      <div class="carousel-inner">
        <div class="carousel-item active" data-bs-interval="false" data-bs-pause="hover">
          <img src="/img/Almagro.webp" class="d-block w-100" style="height: 450px; object-fit: cover"
            alt="Imagen carrusel 1" />
        </div>
        <div class="carousel-item" data-bs-interval="false" data-bs-pause="hover">
          <img src="/img/EmbajadaBerlin.webp" class="d-block w-100" style="height: 450px; object-fit: cover"
            alt="Imagen carrusel 2" />
        </div>
        <div class="carousel-item" data-bs-interval="false" data-bs-pause="hover">
          <img src="/img/MezquitaCordoba.webp" class="d-block w-100" style="height: 450px; object-fit: cover"
            alt="Imagen carrusel 3" />
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
                <img :src="ruta.foto" 
                     class="img-fluid rounded-start w-100"
                     style="height: 250px; object-fit: cover" 
                     :alt="ruta.titulo"
                     @error="manejarErrorImagen">
              </div>
              <!-- Contenido de la tarjeta -->
              <div class="col-md-7">
                <div class="card-body">
                  <!-- Titulo como enlace -->
                  <a href="#" @click.prevent="verRuta(ruta.id)" class="text-decoration-none">
                    <h3 class="card-title text-primary">{{ ruta.titulo }}</h3>
                  </a>
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
            <li v-for="pagina in totalPaginas" 
                :key="pagina" 
                class="page-item"
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
      <p v-else class="text-center text-muted">
        No se encontraron rutas.
      </p>
    </div>

    <!-- Video -->
    <div class="video-section mt-5 mb-4">
      <div class="video-container border rounded bg-white p-4">
        <video ref="medio" class="w-100" style="height: 450px; background-color: black;" controls>
          <source src="/video/crush.mp4" type="video/mp4">
        </video>

        <!-- Controles de video -->
        <nav class="d-flex justify-content-center gap-2 mt-4">
          <button class="btn btn-outline-primary" @click="reiniciar">
            <span><img src="/img/atrasdoble.png"></span>
          </button>
          <button class="btn btn-outline-primary" @click="retroceder">
            <span><img src='/img/atras.png'></span>
          </button>
          <button class="btn btn-outline-primary" @click="reproducirPausar">
            <span><img :src="botonReproducir"></span>
          </button>
          <button class="btn btn-outline-primary" @click="avanzar">
            <span><img src='/img/alante.png'></span>
          </button>
          <button class="btn btn-outline-primary" @click="silenciar">
            <span><img src="/img/sin-sonido.png"></span>
          </button>
          <span class="d-flex align-items-center text-dark">Volumen</span>
          <button class="btn btn-outline-primary" @click="bajarVolumen">
            <span><img src="/img/altavoz-bajo.png"></span>
          </button>
          <button class="btn btn-outline-primary" @click="subirVolumen">
            <span><img src="/img/altavoz-alto.png"></span>
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Estilos actualizados */
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

/* Estilo para el botón cuando está en modo fecha */
.btn-outline-primary.active {
  background-color: #0d6efd;
  color: white;
}

.btn-toggle {
  width: 160px;
  /* Ancho fijo */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  /* Espacio entre el icono y el texto */
}

/* Añadir estilo para el input de fecha */
.search-input {
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

/* Add to the existing <style> section */
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

/* Add to the existing <style> section */
.video-section {
  max-width: 1000px;
  margin: 0 auto;
}

.video-container {
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}
</style>
