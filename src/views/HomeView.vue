<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router"; // Importamos useRouter para redirigir

const API_BASE_URL = "http://localhost/freetours/api.php"; // URL base de la API
const rutas = ref([]); // Estado reactivo para almacenar las rutas
const valoraciones = ref([]); // Estado reactivo para almacenar las valoraciones
const error = ref(""); // Estado para manejar errores
const router = useRouter(); // Instancia de Vue Router
const busqueda = ref(""); // Estado para almacenar el texto de búsqueda

// Lista de imágenes del carrusel
const imagenesCarrusel = [
  "/img/Almagro.webp",
  "/img/EmbajadaBerlin.webp",
  "/img/MezquitaCordoba.webp"
];

// Función para obtener las rutas desde la API
async function obtenerRutas() {
  try {
    const response = await fetch(`${API_BASE_URL}/rutas`); // Endpoint para rutas
    if (!response.ok) throw new Error("Error al cargar las rutas");

    const data = await response.json();

    // Verificamos que los datos tengan la estructura esperada
    if (Array.isArray(data)) {
      rutas.value = data.map((ruta) => ({
        id: ruta.id, // ID de la ruta
        titulo: ruta.titulo,
        localidad: ruta.localidad,
        descripcion: ruta.descripcion,
        foto: ruta.foto,
        valoraciones: [], // Inicializamos un array para las valoraciones de esta ruta
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
    const response = await fetch(`${API_BASE_URL}/valoraciones`); // Endpoint para valoraciones
    if (!response.ok) throw new Error("Error al cargar las valoraciones");

    const data = await response.json();

    // Verificamos que los datos tengan la estructura esperada
    if (Array.isArray(data)) {
      valoraciones.value = data;

      // Asignamos las valoraciones a las rutas correspondientes
      rutas.value.forEach((ruta) => {
        ruta.valoraciones = valoraciones.value.filter(
            (valoracion) => valoracion.ruta_id === ruta.id
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
  router.push(`/ruta/${id}`); // Redirigimos a la ruta dinámica
}

// Función para filtrar rutas según la búsqueda
function filtrarRutas() {
  return rutas.value.filter((ruta) =>
      ruta.titulo.toLowerCase().includes(busqueda.value.toLowerCase()) ||
      ruta.localidad.toLowerCase().includes(busqueda.value.toLowerCase())
  );
}

// Ejecutamos las funciones al montar el componente
onMounted(async () => {
  await obtenerRutas();
  await obtenerValoraciones();
});
</script>

<template>
  <div class="container">
    <!-- Barra de búsqueda  -->
    <div class="mb-4 mt-4">
      <form @submit.prevent="filtrarRutas" class="buscador">
        <input v-model="busqueda" type="text" class="form-control rounded-pill ps-5" placeholder="Buscar rutas por título o localidad" aria-label="Buscar"/>
        <i class="bi bi-search icono-busqueda"></i>
      </form>
    </div>

    <!-- Carrusel -->
    <div id="carouselExample" class="carousel slide border mb-5 bg-white rounded mt-5" data-bs-ride="carousel">
      <div class="carousel-inner">
        <div v-for="(imagen, index) in imagenesCarrusel" :key="index" class="carousel-item" data-bs-interval="4000" data-bs-pause="hover" :class="{ active: index === 0 }">
          <img :src="imagen" class="d-block w-100" style="height: 450px; object-fit: cover" alt="Imagen carrusel"/>
        </div>
      </div>
      <!-- Controles del carrusel -->
      <button class="carousel-control-prev" type="button" data-bs-target="#carouselExample" data-bs-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
      </button>
      <button
          class="carousel-control-next"
          type="button"
          data-bs-target="#carouselExample"
          data-bs-slide="next"
      >
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
      </button>
    </div>

    <h1 class="text-center text-primary mb-4">Lista de Rutas</h1>

    <!-- Mensaje de error si la API falla -->
    <div v-if="error" class="alert alert-danger text-center">{{ error }}</div>

    <!-- Tarjetas de rutas obtenidas desde la API -->
    <div v-if="filtrarRutas().length > 0" class="row g-4 mb-4">
      <div v-for="(ruta, index) in filtrarRutas()" :key="index" class="col-12">
        <div class="card h-100 shadow-sm mb-4">
          <div class="row g-0">
            <!-- Imagen de la API -->
            <div class="col-md-5 p-3">
              <img :src="'/img/' + ruta.foto" class="img-fluid rounded-start w-100" style="height: 250px; object-fit: cover" alt="Imagen de la ruta"/>
            </div>
            <!-- Contenido de la tarjeta -->
            <div class="col-md-7">
              <div class="card-body">
                <!-- Título como enlace -->
                <a href="#" @click.prevent="verRuta(ruta.id)" class="text-decoration-none">
                  <h3 class="card-title text-primary">{{ ruta.titulo }}</h3>
                </a>
                <p class="card-text">{{ ruta.descripcion }}</p>
                <p class="card-text">
                  <small class="text-muted">{{ ruta.localidad }}</small>
                </p>
              </div>
            </div>
          </div>

          <!-- Sección de valoraciones -->
          <div class="card-footer bg-light">
            <h5 class="mb-3">Valoraciones:</h5>
            <div v-if="ruta.valoraciones.length > 0">
              <div
                  v-for="(valoracion, idx) in ruta.valoraciones"
                  :key="idx"
                  class="mb-3"
              >
                <div class="d-flex align-items-center">
                  <span class="badge bg-primary me-2">
                    {{ valoracion.puntuacion }} ★
                  </span>
                  <p class="mb-0">{{ valoracion.comentario }}</p>
                </div>
                <small class="text-muted"
                >{{ valoracion.fecha_valoracion }}</small
                >
              </div>
            </div>
            <p v-else class="text-muted">
              No hay valoraciones para esta ruta.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Mensaje si no hay rutas disponibles -->
    <p v-else-if="!error" class="text-center text-muted">
      No se encontraron rutas.
    </p>
  </div>
</template>

<style scoped>
/*Contenedor de la Barra de búsqueda */
.buscador {
  max-width: 600px;
  margin: 0 auto;
  position: relative;
}
</style>
