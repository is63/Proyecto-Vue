<script setup>
import { ref, onMounted, computed } from 'vue';
import { Modal } from 'bootstrap';

// Modal de crear/editar usuario
const modalRefCreate = ref(null);

// Modal de confirmación de eliminación
const modalConfirmacionRef = ref(null);

// Modal de mensajes de error
const modalErrorRef = ref(null);

// Modal de crear/editar usuario
let modalInstanceCreate = null;

// Modal de confirmación de eliminación
let modalConfirmacionInstance = null;

// Modal de mensajes de error
let modalErrorInstance = null;

// Datos de los usuarios obtenidos de la API
const datos = ref([]);

// Variable para saber si es en modo "editar" o "crear"
const modoEdicion = ref(false);

// Usuario seleccionado para editar el rol
const usuarioSeleccionado = ref({
  id: null,
  nombre: '',
  email: '',
  rol: '',
});

// Usuario nuevo para crear
const usuarioNuevo = ref({
  nombre: '',
  email: '',
  contraseña: '',
});

// ID del usuario que se va a eliminar
const usuarioAEliminar = ref(null);

// Roles permitidos
const rolesPermitidos = ['guia', 'cliente'];

// URL de la API
const API_URL = 'http://localhost/freetours/api.php/usuarios';

// Mensajes dentro del modal de crear/editar
const mensaje = ref('');
const tipoMensaje = ref('');

// Confirmación de Eliminación
const eliminacionExitosa = ref(false);
const mensajeEliminacion = ref('');

// Controlar si la operación (crear/editar) fue exitosa
const operacionExitosa = ref(false);

// Estado para el modal de error
const mensajeError = ref(''); // Mensaje de error a mostrar

// Paginación
const PaginaActual = ref(1);
const LimiteUsuarios = ref(10);
const TotalUsuarios = computed(() => datos.value.length);
const PaginasTotales = computed(() => Math.ceil(TotalUsuarios.value / LimiteUsuarios.value));

const datosPaginacion = computed(() => {
  const inicio = (PaginaActual.value - 1) * LimiteUsuarios.value;
  const final = inicio + LimiteUsuarios.value;
  return datos.value.slice(inicio, final);
});

function cambiarPagina(page) {
  if (page >= 1 && page <= PaginasTotales.value) {
    PaginaActual.value = page;
  }
}

// Función para obtener los datos de la API
async function fetchData() {
  try {
    // Hacemos una solicitud a la API
    const response = await fetch(API_URL);

    // Si la respuesta no es exitosa, se lanza un error
    if (!response.ok) throw new Error('No se pudo obtener los datos');

    // Se convierte la respuesta a JSON y la almacenamos en "datos"
    datos.value = await response.json();
  } catch (error) {
    // Si hay un error, se muestra en la consola
    console.error('Error al obtener los datos:', error);
  }
}

// Iniciar los modales al cargar el componente
onMounted(() => {
  // Crear una instancia del modal de crear/editar usuario
  modalInstanceCreate = new Modal(modalRefCreate.value);

  // Crear una instancia del modal de confirmación de eliminación
  modalConfirmacionInstance = new Modal(modalConfirmacionRef.value);

  // Crear una instancia del modal de mensajes de error
  modalErrorInstance = new Modal(modalErrorRef.value);

  // Se obtienen los datos de la API al cargar el componente
  fetchData();
});

// Función para mostrar un mensaje y cerrar el modal automáticamente
function mostrarMensajeModal(texto, tipo, cerrarModal = false) {
  mensaje.value = texto;
  tipoMensaje.value = tipo;

  // Si el mensaje es de éxito, se marca la operación como exitosa
  if (tipo === 'success') {
    operacionExitosa.value = true;
  }

  // Se cierra el modal después de 1.5 segundos si se indica
  setTimeout(() => {
    mensaje.value = '';
    if (cerrarModal) modalInstanceCreate.hide();
  }, 1500);
}

// Función para reiniciar el estado del modal al cerrarlo
function reiniciarModal() {
  operacionExitosa.value = false;
  mensaje.value = '';
  tipoMensaje.value = '';
}

// Función para mostrar el modal de error
function mostrarError(mensaje) {
  mensajeError.value = mensaje; // Establecer el mensaje de error
  modalErrorInstance.show(); // Mostrar el modal de error
}

// Función para abrir el modal en modo edición
function abrirModalEditar(usuario) {
  usuarioSeleccionado.value = { ...usuario };
  modoEdicion.value = true;
  reiniciarModal();
  modalInstanceCreate.show();
}

// Función para abrir el modal en modo creación
function abrirModalCrear() {
  usuarioNuevo.value = { nombre: '', email: '', contraseña: '' };
  modoEdicion.value = false;
  reiniciarModal();
  modalInstanceCreate.show();
}

// Función para validar los datos del usuario
function validarUsuario(usuario) {
  if (
    usuario.nombre == "" ||
    usuario.email.indexOf("@") == -1 ||
    usuario.email == "" ||
    usuario.contraseña == ""
  ) {
    return false; // Retorna false si la validación falla
  }
  return true; // Retorna true si la validación es exitosa
}

// Función para crear un usuario nuevo
async function crearUsuario() {
  // Validar que todos los campos estén completos
  if (!validarUsuario(usuarioNuevo.value)) {
    mostrarError('Todos los campos deben de ser válidos');
    return;
  }

  try {
    // Se hace una solicitud POST a la API para crear un nuevo usuario
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usuarioNuevo.value),
    });

    // Si la respuesta no es exitosa, se lanza un error
    if (!response.ok) throw new Error('Error al crear usuario');

    // Se muestra un mensaje de éxito y cerramos el modal
    mostrarMensajeModal('Usuario creado con éxito.', 'success', true);

    // Se recarga los datos de la tabla
    fetchData();
  } catch (error) {
    // Si hay un error, mostramos un mensaje de error
    mostrarMensajeModal('Hubo un problema al crear el usuario.', 'error');
  }
}

// Función para actualizar el rol de un usuario
async function actualizarRol() {
  try {
    // Hacemos una solicitud PUT a la API para actualizar el rol
    const response = await fetch(`${API_URL}?id=${usuarioSeleccionado.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol: usuarioSeleccionado.value.rol }),
    });

    // Se convierte la respuesta a JSON
    const result = await response.json();

    // Si la API devuelve un estado de éxito
    if (result.status === 'success') {
      // Se muestra un mensaje de éxito y se cierra el modal
      mostrarMensajeModal('Rol actualizado con éxito.', 'success', true);

      // Recargamos los datos de la tabla
      fetchData();
    } else {
      // Si la API devuelve un error, se lanza una excepción con el mensaje
      throw new Error(result.message || 'Error al actualizar el rol');
    }
  } catch (error) {
    // Si hay un error, se muestra un mensaje de error
    mostrarMensajeModal('Hubo un problema al actualizar el rol.', 'error');
  }
}

// Función para abrir el modal de confirmación de eliminación
function abrirModalConfirmacion(id) {
  usuarioAEliminar.value = id;
  eliminacionExitosa.value = false;
  mensajeEliminacion.value = '';
  modalConfirmacionInstance.show();
}

// Función para eliminar un usuario confirmado
async function eliminarUsuario() {
  try {
    // Se hace una solicitud DELETE a la API para eliminar el usuario
    const response = await fetch(`${API_URL}?id=${usuarioAEliminar.value}`, { method: 'DELETE' });

    // Se convierte la respuesta a JSON
    const result = await response.json();

    // Si la API devuelve un estado de éxito
    if (result.status === 'success') {
      eliminacionExitosa.value = true; // Se indica que la eliminación fue exitosa
      mensajeEliminacion.value = 'Usuario eliminado correctamente.'; // Se muestra un mensaje de éxito

      // Se recargan los datos de la tabla
      fetchData();

      // Se cierra el modal después de 1.5 segundos
      setTimeout(() => {
        modalConfirmacionInstance.hide();
      }, 1500);
    } else {
      // Si la API devuelve un error, se lanza una excepción con el mensaje
      throw new Error(result.message || 'No se pudo eliminar el usuario');
    }
  } catch (error) {
    // Si hay un error, se muestra un mensaje de error
    eliminacionExitosa.value = false;
    mensajeEliminacion.value = 'Hubo un problema al eliminar el usuario.';
  }
}
</script>

<template>
  <main class="d-flex justify-content-center mt-5 text-center">
    <div class="table-responsive w-75">
      <!-- Tabla con la lista de usuarios -->
      <table class="table table-bordered table-striped">
        <thead class="table cabecera-tabla">
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th class="acciones-col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <!-- Iterar sobre los usuarios -->
          <tr v-for="dato in datosPaginacion" :key="dato.id">
            <td>{{ dato.id }}</td>
            <td>{{ dato.nombre }}</td>
            <td>{{ dato.email }}</td>
            <td>{{ dato.rol }}</td>
            <td class="text-center">
              <div v-if="dato.rol != 'admin'">
                <!-- Botón de Editar -->
                <button class="btn btn-warning btn-sm me-2" @click="abrirModalEditar(dato)">Editar</button>
                <!-- Botón de Eliminar -->
                <button class="btn btn-danger btn-sm" @click="abrirModalConfirmacion(dato.id)">Eliminar</button>
              </div>
              <div v-else>
            <td class="text-center d-flex justify-content-center align-items-center">
              <a class="btn btn-secondary btn-sm" disabled>No disponible</a>
            </td>
    </div>
    </td>
    </tr>
    </tbody>
    </table>
    <!-- Botón de Crear Usuario -->
    <button class="btn btn-primary mt-4" @click="abrirModalCrear">Crear usuario</button>

    <!-- Paginacion -->
    <nav class="mt-4">
      <ul class="pagination justify-content-center">
        <li class="page-item" :class="{ disabled: PaginaActual === 1 }">
          <a class="page-link" href="#" @click.prevent="cambiarPagina(PaginaActual - 1)">&lt;</a> <!--Anterior-->
        </li>
        <li class="page-item" v-for="page in PaginasTotales" :key="page" :class="{ active: PaginaActual === page }">
          <a class="page-link" href="#" @click.prevent="cambiarPagina(page)">{{ page }}</a>
        </li>
        <li class="page-item" :class="{ disabled: PaginaActual === PaginasTotales }">
          <a class="page-link" href="#" @click.prevent="cambiarPagina(PaginaActual + 1)">&gt;</a> <!--Siguiente-->
        </li>
      </ul>
    </nav>
    </div>
  </main>

  <!-- Modal de Crear/Editar -->
  <div class="modal fade" ref="modalRefCreate" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            {{ modoEdicion ? 'Editar Usuario' : 'Crear Usuario' }}
          </h5>
          <!-- Botón para cerrar el modal -->
          <button type="button" class="btn-close" data-bs-dismiss="modal" @click="reiniciarModal"></button>
        </div>
        <div class="modal-body">
          <!-- Mensaje de éxito -->
          <div v-if="operacionExitosa" class="alert alert-success">
            {{ mensaje }}
          </div>

          <!-- Formulario si la operación no fue exitosa -->
          <form v-else>
            <div v-if="modoEdicion">
              <label for="rolUsuario" class="form-label">Rol del Usuario</label>
              <select id="rolUsuario" class="form-select" v-model="usuarioSeleccionado.rol">
                <option v-for="rol in rolesPermitidos" :key="rol" :value="rol">{{ rol }}</option>
              </select>
            </div>

            <div v-else>
              <label class="form-label">Nombre</label>
              <input type="text" class="form-control" v-model="usuarioNuevo.nombre" />
              <label class="form-label">Email</label>
              <input type="email" class="form-control" v-model="usuarioNuevo.email" />
              <label class="form-label">Contraseña</label>
              <input type="password" class="form-control" v-model="usuarioNuevo.contraseña" />
            </div>
          </form>
        </div>
        <div class="modal-footer d-flex justify-content-center">
          <!-- Botón para cerrar el modal -->
          <button class="btn btn-secondary" data-bs-dismiss="modal" @click="reiniciarModal">Cerrar</button>
          <!-- Botón para crear usuario o guardar cambios -->
          <button v-if="!modoEdicion && !operacionExitosa" class="btn btn-primary" @click="crearUsuario">
            Crear usuario
          </button>
          <button v-else-if="modoEdicion && !operacionExitosa" class="btn btn-primary" @click="actualizarRol">
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de Confirmación de la Eliminación -->
  <div class="modal fade" ref="modalConfirmacionRef" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Confirmar eliminación</h5>
        </div>
        <div class="modal-body">
          <!-- Mensaje de éxito si la eliminación fue exitosa -->
          <div v-if="eliminacionExitosa" class="alert alert-success">
            {{ mensajeEliminacion }}
          </div>
          <div v-else>
            <!-- Pregunta de confirmación si no hay mensaje de error -->
            <p v-if="!mensajeEliminacion">¿Estás seguro de que deseas eliminar este usuario?</p>
            <!-- Mensaje de error si la eliminación ha fallado -->
            <div v-else class="alert alert-danger">
              {{ mensajeEliminacion }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <!-- Botón para cerrar el modal -->
          <button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          <!-- Botón para confirmar la eliminación -->
          <button v-if="!eliminacionExitosa" class="btn btn-danger" @click="eliminarUsuario">Eliminar</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de Mensajes de Error -->
  <div class="modal fade" ref="modalErrorRef" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Error</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <!-- Mensaje de error -->
          <div class="alert alert-danger">
            {{ mensajeError }}
          </div>
        </div>
        <div class="modal-footer">
          <!-- Botón para cerrar el modal -->
          <button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.acciones-col {
  width: 150px;
}

.cabecera-tabla {
  background-color: #232342;
  color: white;
}

tbody tr:hover {
  background-color: #d6d4d4;
}

.pagination {
  margin-top: 2%;
}
</style>