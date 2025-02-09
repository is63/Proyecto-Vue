<script setup>
// Importamos las funciones necesarias de Vue y Bootstrap
import { ref, onMounted } from 'vue';
import { Modal } from 'bootstrap';

// Referencia al modal de crear/editar usuario en el DOM
const modalRef = ref(null);

// Referencia al modal de confirmación de eliminación en el DOM
const modalConfirmacionRef = ref(null);

// Instancia del modal de crear/editar usuario
let modalInstance = null;

// Instancia del modal de confirmación de eliminación
let modalConfirmacionInstance = null;

// Datos de los usuarios obtenidos de la API
const datos = ref([]);

// Estado reactivo para saber si estamos en modo "editar" o "crear"
const modoEdicion = ref(false);

// Usuario seleccionado para editar
const usuarioSeleccionado = ref({
  id: null, // ID del usuario
  nombre: '', // Nombre del usuario
  email: '', // Email del usuario
  rol: '', // Rol del usuario
});

// Usuario nuevo para crear
const usuarioNuevo = ref({
  nombre: '', // Nombre del nuevo usuario
  email: '', // Email del nuevo usuario
  contraseña: '', // Contraseña del nuevo usuario
  rol: '', // Rol del nuevo usuario
});

// ID del usuario que se va a eliminar
const usuarioAEliminar = ref(null);

// Roles permitidos para los usuarios
const rolesPermitidos = ['admin', 'guia', 'cliente'];

// URL de la API
const API_URL = 'http://localhost/freetours/api.php/usuarios';

// Estado para los mensajes dentro del modal de crear/editar
const mensaje = ref(''); // Mensaje a mostrar
const tipoMensaje = ref(''); // Tipo de mensaje: 'success' o 'error'

// Estado para el modal de confirmación de eliminación
const eliminacionExitosa = ref(false); // Indica si la eliminación fue exitosa
const mensajeEliminacion = ref(''); // Mensaje de éxito o error en la eliminación

// Estado para controlar si la operación (crear/editar) fue exitosa
const operacionExitosa = ref(false); // Indica si la operación fue exitosa

// Función para obtener los datos de la API
async function fetchData() {
  try {
    // Hacemos una solicitud GET a la API
    const response = await fetch(API_URL);

    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) throw new Error('No se pudo obtener los datos');

    // Convertimos la respuesta a JSON y la almacenamos en "datos"
    datos.value = await response.json();
  } catch (error) {
    // Si hay un error, lo mostramos en la consola
    console.error('Error al obtener los datos:', error);
  }
}

// Inicializa los modales al cargar el componente
onMounted(() => {
  // Creamos una instancia del modal de crear/editar usuario
  modalInstance = new Modal(modalRef.value);

  // Creamos una instancia del modal de confirmación de eliminación
  modalConfirmacionInstance = new Modal(modalConfirmacionRef.value);

  // Obtenemos los datos de la API al cargar el componente
  fetchData();
});

// Función para mostrar un mensaje y cerrar el modal automáticamente
function mostrarMensaje(texto, tipo, cerrarModal = false) {
  mensaje.value = texto; // Establecemos el mensaje
  tipoMensaje.value = tipo; // Establecemos el tipo de mensaje

  // Si el mensaje es de éxito, marcamos la operación como exitosa
  if (tipo === 'success') {
    operacionExitosa.value = true;
  }

  // Cerramos el modal después de 1.5 segundos si se indica
  setTimeout(() => {
    mensaje.value = ''; // Limpiamos el mensaje
    if (cerrarModal) modalInstance.hide(); // Cerramos el modal
  }, 1500);
}

// Función para reiniciar el estado del modal al cerrarlo
function reiniciarModal() {
  operacionExitosa.value = false; // Reiniciamos el estado de la operación
  mensaje.value = ''; // Limpiamos el mensaje
  tipoMensaje.value = ''; // Limpiamos el tipo de mensaje
}

// Función para abrir el modal en modo edición
function abrirModalEditar(usuario) {
  usuarioSeleccionado.value = { ...usuario }; // Copiamos los datos del usuario seleccionado
  modoEdicion.value = true; // Indicamos que estamos en modo edición
  reiniciarModal(); // Reiniciamos el estado del modal
  modalInstance.show(); // Mostramos el modal
}

// Función para abrir el modal en modo creación
function abrirModalCrear() {
  usuarioNuevo.value = { nombre: '', email: '', contraseña: '', rol: '' }; // Reiniciamos los valores del nuevo usuario
  modoEdicion.value = false; // Indicamos que estamos en modo creación
  reiniciarModal(); // Reiniciamos el estado del modal
  modalInstance.show(); // Mostramos el modal
}

// Función para crear un usuario nuevo
async function crearUsuario() {
  // Validar que todos los campos estén completos
  if (!usuarioNuevo.value.nombre || !usuarioNuevo.value.email || !usuarioNuevo.value.contraseña) {
    mostrarMensaje('Todos los campos son obligatorios.', 'error');
    return;
  }

  try {
    // Hacemos una solicitud POST a la API para crear un nuevo usuario
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usuarioNuevo.value), // Enviamos los datos del nuevo usuario
    });

    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) throw new Error('Error al crear usuario');

    // Mostramos un mensaje de éxito y cerramos el modal
    mostrarMensaje('Usuario creado con éxito.', 'success', true);

    // Recargamos los datos de la tabla
    fetchData();
  } catch (error) {
    // Si hay un error, mostramos un mensaje de error
    mostrarMensaje('Hubo un problema al crear el usuario.', 'error');
  }
}

// Función para actualizar el rol de un usuario
async function actualizarRol() {
  try {
    // Hacemos una solicitud PUT a la API para actualizar el rol
    const response = await fetch(`${API_URL}?id=${usuarioSeleccionado.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol: usuarioSeleccionado.value.rol }), // Enviamos solo el rol en el cuerpo
    });

    // Convertimos la respuesta a JSON
    const result = await response.json();

    // Si la API devuelve un estado de éxito
    if (result.status === 'success') {
      // Mostramos un mensaje de éxito y cerramos el modal
      mostrarMensaje('Rol actualizado con éxito.', 'success', true);

      // Recargamos los datos de la tabla
      fetchData();
    } else {
      // Si la API devuelve un error, lanzamos una excepción con el mensaje
      throw new Error(result.message || 'Error al actualizar el rol');
    }
  } catch (error) {
    // Si hay un error, mostramos un mensaje de error
    mostrarMensaje('Hubo un problema al actualizar el rol.', 'error');
  }
}

// Función para abrir el modal de confirmación de eliminación
function abrirModalConfirmacion(id) {
  usuarioAEliminar.value = id; // Guardamos el ID del usuario a eliminar
  eliminacionExitosa.value = false; // Reiniciamos el estado de eliminación
  mensajeEliminacion.value = ''; // Limpiamos el mensaje anterior
  modalConfirmacionInstance.show(); // Mostramos el modal de confirmación
}

// Función para eliminar un usuario confirmado
async function eliminarUsuario() {
  try {
    // Hacemos una solicitud DELETE a la API para eliminar el usuario
    const response = await fetch(`${API_URL}?id=${usuarioAEliminar.value}`, { method: 'DELETE' });

    // Convertimos la respuesta a JSON
    const result = await response.json();

    // Si la API devuelve un estado de éxito
    if (result.status === 'success') {
      eliminacionExitosa.value = true; // Indicamos que la eliminación fue exitosa
      mensajeEliminacion.value = 'Usuario eliminado correctamente.'; // Mostramos un mensaje de éxito

      // Recargamos los datos de la tabla
      fetchData();

      // Cerramos el modal después de 1.5 segundos
      setTimeout(() => {
        modalConfirmacionInstance.hide();
      }, 1500);
    } else {
      // Si la API devuelve un error, lanzamos una excepción con el mensaje
      throw new Error(result.message || 'No se pudo eliminar el usuario');
    }
  } catch (error) {
    // Si hay un error, mostramos un mensaje de error
    eliminacionExitosa.value = false;
    mensajeEliminacion.value = 'Hubo un problema al eliminar el usuario.';
  }
}
</script>

<template>
  <main class="d-flex justify-content-center mt-5 text-center">
    <div class="table-responsive w-75">
      <!-- Tabla con la lista de usuarios -->
      <table class="table table-bordered table-hover">
        <thead class="table-dark">
        <tr>
          <th>#</th> <!-- Columna para el ID -->
          <th>Nombre</th> <!-- Columna para el nombre -->
          <th>Email</th> <!-- Columna para el email -->
          <th>Rol</th> <!-- Columna para el rol -->
          <th class="acciones-col">Acciones</th> <!-- Columna para las acciones -->
        </tr>
        </thead>
        <tbody>
        <!-- Iteramos sobre los usuarios -->
        <tr v-for="dato in datos" :key="dato.id">
          <td>{{ dato.id }}</td> <!-- Mostramos el ID -->
          <td>{{ dato.nombre }}</td> <!-- Mostramos el nombre -->
          <td>{{ dato.email }}</td> <!-- Mostramos el email -->
          <td>{{ dato.rol }}</td> <!-- Mostramos el rol -->
          <td class="text-center">
            <!-- Botón para abrir el modal en modo edición -->
            <button class="btn btn-warning btn-sm me-2" @click="abrirModalEditar(dato)">Editar</button>
            <!-- Botón para abrir el modal de confirmación de eliminación -->
            <button class="btn btn-danger btn-sm" @click="abrirModalConfirmacion(dato.id)">Eliminar</button>
          </td>
        </tr>
        </tbody>
      </table>
      <!-- Botón para abrir el modal en modo creación -->
      <button class="btn btn-primary mt-4" @click="abrirModalCrear">Crear usuario</button>
    </div>
  </main>

  <!-- Modal de Crear/Editar -->
  <div class="modal fade" ref="modalRef" tabindex="-1">
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
          <!-- Mostrar mensaje de éxito si la operación fue exitosa -->
          <div v-if="operacionExitosa" class="alert alert-success">
            {{ mensaje }}
          </div>

          <!-- Mostrar el formulario si la operación no fue exitosa -->
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

  <!-- Modal de Confirmación de Eliminación -->
  <div class="modal fade" ref="modalConfirmacionRef" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Confirmar eliminación</h5>
        </div>
        <div class="modal-body">
          <!-- Mostrar mensaje de éxito si la eliminación fue exitosa -->
          <div v-if="eliminacionExitosa" class="alert alert-success">
            {{ mensajeEliminacion }}
          </div>
          <div v-else>
            <!-- Mostrar la pregunta de confirmación si no hay mensaje de error -->
            <p v-if="!mensajeEliminacion">¿Estás seguro de que deseas eliminar este usuario?</p>
            <!-- Mostrar mensaje de error si la eliminación falló -->
            <div v-else class="alert alert-danger">
              {{ mensajeEliminacion }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <!-- Botón para cancelar la eliminación -->
          <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
          <!-- Botón para confirmar la eliminación -->
          <button v-if="!eliminacionExitosa" class="btn btn-danger" @click="eliminarUsuario">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ajustar el tamaño de la columna de acciones */
.acciones-col {
  width: 150px;
}
</style>