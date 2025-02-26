<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from "vue-router";

const props = defineProps({
  usuarioAutenticado: {
    type: Object,
    required: true
  }
});

const rutas = ref([]);
const error = ref("");
const router = useRouter();

// Paginación
const paginaActual = ref(1);
const rutasPorPagina = ref(5);

const rutasPaginadas = computed(() => {
  const inicio = (paginaActual.value - 1) * rutasPorPagina.value;
  const fin = inicio + rutasPorPagina.value;
  return rutas.value.slice(inicio, fin);
});

const totalPaginas = computed(() => Math.ceil(rutas.value.length / rutasPorPagina.value));

function cambiarPagina(pagina) {
  if (pagina >= 1 && pagina <= totalPaginas.value) {
    paginaActual.value = pagina;
  }
}

// Función para obtener todas las rutas
async function obtenerRutas() {
  try {
    const respuestaRutas = await fetch(`http://localhost/freetours/api.php/rutas`);
    if (!respuestaRutas.ok) {
      throw new Error("Error al cargar las rutas");
    }
    const todasRutas = await respuestaRutas.json();
    rutas.value = todasRutas;
  } catch (err) {
    console.error("Error:", err);
    error.value = "Error al cargar las rutas";
  }
}

// Función para ver detalles de una ruta
function verRuta(id) {
  router.push(`/ruta/${id}`);
}

onMounted(() => {
  if (!props.usuarioAutenticado || props.usuarioAutenticado.rol !== 'guia') {
    router.push('/');
    return;
  }
  obtenerRutas();
});
</script>

<template>
  <div class="container py-4">
    <h1 class="text-center text-primary mb-4">Mis Rutas Asignadas</h1>

    <!-- Mensaje de error -->
    <div v-if="error" class="alert alert-danger text-center">{{ error }}</div>

    <!-- Lista de rutas -->
    <div v-else>
      <div v-if="rutas.length > 0" class="row g-4 mb-4">
        <div v-for="ruta in rutasPaginadas" :key="ruta.id" class="col-12">
          <div class="card h-100 shadow-sm mb-4">
            <div class="row g-0">
              <!-- Imagen de la ruta -->
              <div class="col-md-5 p-3">
                <img :src="'/img/' + ruta.foto" class="img-fluid rounded-start w-100"
                  style="height: 250px; object-fit: cover" alt="Imagen de la ruta" />
              </div>
              <!-- Contenido de la tarjeta -->
              <div class="col-md-7">
                <div class="card-body">
                  <a href="#" @click.prevent="verRuta(ruta.id)" class="text-decoration-none">
                    <h3 class="card-title text-primary">{{ ruta.titulo }}</h3>
                  </a>
                  <p class="card-text">{{ ruta.descripcion }}</p>
                  <p class="card-text">
                    <small class="text-muted">{{ ruta.localidad }}</small>
                  </p>
                  <p class="card-text">
                    <small class="text-muted"><i class="bi bi-calendar3"></i> {{ ruta.fecha }} - {{ ruta.hora }}</small>
                  </p>
                </div>
              </div>
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
        No hay rutas disponibles.
      </p>
    </div>
  </div>
</template>

<style scoped>
.card {
  transition: transform 0.2s;
}

.card:hover {
  transform: translateY(-5px);
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
</style>