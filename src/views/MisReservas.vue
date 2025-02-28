<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import Swal from 'sweetalert2';

const props = defineProps({
  usuarioAutenticado: Object
});

const router = useRouter();
const reservas = ref([]);
const cargando = ref(true);
const error = ref('');

// Variable para filtrar por estado (futuras, pasadas, todas)
const filtroEstado = ref('todas'); // 'todas', 'futuras', 'pasadas'

// Función para cargar las reservas del cliente
async function cargarReservas() {
  cargando.value = true;
  error.value = '';
  
  try {
    if (!props.usuarioAutenticado) {
      throw new Error('Usuario no autenticado');
    }
    
    // Verificar el ID correcto del usuario
    const clienteId = Number(props.usuarioAutenticado.id); // Convertir a número
    const clienteEmail = props.usuarioAutenticado.email;
    
    console.log("Usuario autenticado:", props.usuarioAutenticado);
    console.log("ID de cliente a buscar:", clienteId);
    console.log("Email de cliente a buscar:", clienteEmail);
    
    // Intentar cargar todas las reservas
    let url = `http://localhost/freetours/api.php/reservas`;
    console.log("URL de la API:", url);
    
    let response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error al cargar reservas: ${response.status}`);
    }
    
    let data = await response.json();
    console.log("Todas las reservas recibidas:", data);
    
    // Filtrar solo las reservas del cliente actual, asegurando que las comparaciones sean del mismo tipo
    if (Array.isArray(data)) {
      reservas.value = data.filter(reserva => {
        const reservaClienteId = Number(reserva.cliente_id);
        const reservaEmail = String(reserva.usuario_email).toLowerCase();
        const clientEmailLower = String(clienteEmail).toLowerCase();
        
        console.log(`Comparando reserva ${reserva.reserva_id}: clienteId=${reservaClienteId} con ${clienteId}, email=${reservaEmail} con ${clientEmailLower}`);
        
        return reservaClienteId === clienteId || reservaEmail === clientEmailLower;
      });
    } else if (data) {
      // Si data es un objeto único
      const reservaClienteId = Number(data.cliente_id);
      const reservaEmail = String(data.usuario_email).toLowerCase();
      const clientEmailLower = String(clienteEmail).toLowerCase();
      
      if (reservaClienteId === clienteId || reservaEmail === clientEmailLower) {
        reservas.value = [data];
      } else {
        reservas.value = [];
      }
    } else {
      reservas.value = [];
    }
    
    console.log("Reservas filtradas para el cliente:", reservas.value);
    
  } catch (err) {
    console.error("Error:", err);
    error.value = "No se pudieron cargar tus reservas. Inténtalo más tarde.";
  } finally {
    cargando.value = false;
  }
}

// Filtrar reservas por estado (pasadas o futuras)
const reservasFiltradas = computed(() => {
  if (filtroEstado.value === 'todas') {
    return reservas.value;
  }
  
  const hoy = new Date();
  
  return reservas.value.filter(reserva => {
    const fechaRuta = new Date(reserva.ruta_fecha);
    
    if (filtroEstado.value === 'futuras') {
      return fechaRuta >= hoy;
    } else {
      return fechaRuta < hoy;
    }
  });
});

// Función para cancelar una reserva
async function cancelarReserva(reservaId) {
  try {
    // Mostrar confirmación antes de cancelar
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
    
    // Enviar solicitud para cancelar reserva según la documentación de la API
    const response = await fetch(`http://localhost/freetours/api.php/reservas?id=${reservaId}`, {
      method: 'DELETE'
    });
    
    const responseText = await response.text();
    console.log("Respuesta al cancelar reserva:", responseText);
    
    if (!response.ok) {
      throw new Error(`Error al cancelar la reserva: ${response.status}`);
    }
    
    // Mostrar mensaje de éxito
    await Swal.fire({
      title: '¡Cancelada!',
      text: 'Tu reserva ha sido cancelada correctamente',
      icon: 'success',
      confirmButtonColor: '#28a745'
    });
    
    // Recargar las reservas
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

// Función para ver detalles de una ruta
function verRuta(rutaId) {
  router.push(`/ruta/${rutaId}`);
}

// Formatear fecha en formato más legible
function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

onMounted(() => {
  cargarReservas();
});
</script>

<template>
  <div class="container mt-4">
    <h1 class="mb-4 text-center">Mis Reservas</h1>
    
    <!-- Filtros de estado -->
    <div class="d-flex justify-content-center mb-4">
      <div class="btn-group" role="group">
        <button type="button" class="btn" 
          :class="filtroEstado === 'todas' ? 'btn-primary' : 'btn-outline-primary'"
          @click="filtroEstado = 'todas'">
          Todas
        </button>
        <button type="button" class="btn"
          :class="filtroEstado === 'futuras' ? 'btn-success' : 'btn-outline-success'"
          @click="filtroEstado = 'futuras'">
          Próximas
        </button>
        <button type="button" class="btn"
          :class="filtroEstado === 'pasadas' ? 'btn-secondary' : 'btn-outline-secondary'"
          @click="filtroEstado = 'pasadas'">
          Pasadas
        </button>
      </div>
    </div>
    
    <!-- Indicador de carga -->
    <div v-if="cargando" class="text-center my-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="mt-2">Cargando tus reservas...</p>
    </div>
    
    <!-- Mensaje de error -->
    <div v-else-if="error" class="alert alert-danger" role="alert">
      {{ error }}
    </div>
    
    <!-- Sin reservas -->
    <div v-else-if="reservasFiltradas.length === 0" class="text-center my-5">
      <p class="fs-5">No tienes reservas {{ filtroEstado !== 'todas' ? (filtroEstado === 'futuras' ? 'próximas' : 'pasadas') : '' }}.</p>
      <router-link to="/" class="btn btn-primary mt-3">Explorar Rutas Disponibles</router-link>
    </div>
    
    <!-- Lista de reservas -->
    <div v-else class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
      <div v-for="reserva in reservasFiltradas" :key="reserva.reserva_id" class="col">
        <div class="card h-100 shadow-sm">
          <!-- Imagen de la ruta -->
          <img :src="reserva.ruta_foto" class="card-img-top" alt="Imagen de la ruta"
            style="height: 180px; object-fit: cover;" 
            @error="$event.target.src = 'https://placehold.co/600x400?text=Imagen+no+disponible'">
            
          <!-- Fecha de la reserva como badge con colores distintos según el estado -->
          <div class="position-absolute top-0 end-0 m-2">
            <span class="badge rounded-pill"
              :class="new Date(reserva.ruta_fecha) > new Date() ? 'bg-success' : 'bg-danger'">
              {{ new Date(reserva.ruta_fecha) > new Date() ? 'Próxima' : 'Pasada' }}
            </span>
          </div>
          
          <div class="card-body">
            <h5 class="card-title">{{ reserva.ruta_titulo }}</h5>
            <h6 class="card-subtitle mb-2 text-muted">{{ reserva.ruta_localidad }}</h6>
            
            <div class="d-flex align-items-center mb-2">
              <i class="bi bi-calendar-event me-2"></i>
              <small>{{ formatearFecha(reserva.ruta_fecha) }}</small>
            </div>
            
            <div class="d-flex align-items-center mb-2">
              <i class="bi bi-clock me-2"></i>
              <small>{{ reserva.ruta_hora }}</small>
            </div>
            
            <div class="d-flex align-items-center mb-3">
              <i class="bi bi-people-fill me-2"></i>
              <small>{{ reserva.num_personas }} {{ reserva.num_personas === 1 ? 'persona' : 'personas' }}</small>
            </div>
            
            <div class="d-grid gap-2">
              <button class="btn btn-primary btn-sm" @click="verRuta(reserva.ruta_id)">
                Ver Detalles
              </button>
              
              <!-- Solo mostrar para reservas futuras -->
              <button v-if="new Date(reserva.ruta_fecha) > new Date()" 
                class="btn btn-danger btn-sm" 
                @click="cancelarReserva(reserva.reserva_id)">
                Cancelar Reserva
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  transition: transform 0.3s;
}

.card:hover {
  transform: translateY(-5px);
}

/* Iconos de Bootstrap */
@import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css");
</style>