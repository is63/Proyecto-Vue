<script setup>
// Importamos las funciones necesarias de Vue y Bootstrap
import { ref, onMounted } from 'vue';
import { Modal } from 'bootstrap';

// Referencia al modal en el DOM
const modalRef = ref(null);

// Instancia del modal de Bootstrap (se inicializará en el montaje del componente)
let modalInstance = null;

// Variable reactiva para almacenar los datos de los usuarios obtenidos de la API
const datos = ref([]);

// Estado reactivo para saber si estamos en modo edición o creación
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

// Definimos los roles permitidos dentro del sistema
const rolesPermitidos = ['admin', 'guia', 'cliente'];

// URL de la API donde se gestionan los usuarios
const API_URL = 'http://localhost/freetours/api.php/usuarios';

// Función para obtener los datos de los usuarios desde la API
async function fetchData() {
  try {
    // Realizamos una solicitud GET a la API
    const response = await fetch(API_URL);

    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) {
      throw new Error('No se pudo obtener los datos');
    }

    // Convertimos la respuesta a formato JSON y almacenamos los datos
    datos.value = await response.json();
  } catch (error) {
    // En caso de error, lo mostramos en la consola
    console.error('Error al obtener los datos:', error);
  }
}

// Inicializamos el modal al montar el componente
onMounted(() => {
  // Creamos una instancia del modal de Bootstrap usando la referencia del DOM
  modalInstance = new Modal(modalRef.value);

  // Obtenemos los datos de la API al cargar el componente
  fetchData();
});

// Función para abrir el modal en modo edición
function abrirModalEditar(usuario) {
  // Copiamos los datos del usuario seleccionado en el formulario de edición
  usuarioSeleccionado.value = { ...usuario };

  // Activamos el modo edición
  modoEdicion.value = true;

  // Mostramos el modal
  modalInstance.show();
}

// Función para abrir el modal en modo creación
function abrirModalCrear() {
  // Reiniciamos los valores del nuevo usuario
  usuarioNuevo.value = { nombre: '', email: '', contraseña: '', rol: '' };

  // Desactivamos el modo edición (indicamos que es un nuevo usuario)
  modoEdicion.value = false;

  // Mostramos el modal
  modalInstance.show();
}

// Función para crear un usuario nuevo
async function crearUsuario() {
  // Validamos que todos los campos requeridos estén llenos
  if (!usuarioNuevo.value.nombre || !usuarioNuevo.value.email || !usuarioNuevo.value.contraseña) {
    alert('Todos los campos son obligatorios');
    return;
  }

  try {
    // Enviamos una solicitud POST a la API para crear un nuevo usuario
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(usuarioNuevo.value), // Enviamos los datos del nuevo usuario en formato JSON
    });

    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) {
      throw new Error('Error al crear usuario');
    }

    // Cerramos el modal
    modalInstance.hide();

    // Recargamos los datos de la tabla
    fetchData();
  } catch (error) {
    // Si ocurre un error, lo mostramos en la consola
    console.error('Error al crear usuario:', error);
    alert('Hubo un problema al crear el usuario');
  }
}

// Variable reactiva para mostrar un mensaje de éxito en la actualización del rol
const mensajeExito = ref(false);

// Función para actualizar el rol de un usuario
async function actualizarRol() {
  try {
    // Enviamos una solicitud PUT a la API para actualizar el rol del usuario
    const response = await fetch(`${API_URL}?id=${usuarioSeleccionado.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rol: usuarioSeleccionado.value.rol, // Solo enviamos el rol actualizado
      }),
    });

    // Si la respuesta no es exitosa, lanzamos un error
    if (!response.ok) {
      throw new Error('Error al actualizar el rol');
    }

    // Leemos la respuesta JSON de la API
    const result = await response.json();

    // Si la API devuelve un estado de éxito
    if (result.status === 'success') {
      // Mostramos el mensaje de éxito en lugar del modal
      mensajeExito.value = true;

      // Esperamos 2 segundos y ocultamos el modal
      setTimeout(() => {
        mensajeExito.value = false;
        modalInstance.hide();
      }, 2000);

      // Recargamos los datos de la tabla
      fetchData();
    } else {
      throw new Error(result.message || 'Error al actualizar el rol');
    }
  } catch (error) {
    console.error('Error al actualizar el rol:', error);
    alert('Hubo un problema al actualizar el rol: ' + error.message);
  }
}
</script>

<template>
  <main class="d-flex justify-content-center mt-5 text-center">
    <div class="table-responsive w-75">
      <table class="table table-bordered table-hover">
        <thead class="table-dark">
        <tr>
          <th>#</th>
          <th>Nombre</th>
          <th>Email</th>
          <th>Rol</th>
          <th class="acciones-col">Acciones</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="dato in datos" :key="dato.id">
          <td>{{ dato.id }}</td>
          <td>{{ dato.nombre }}</td>
          <td>{{ dato.email }}</td>
          <td>{{ dato.rol }}</td>
          <td class="text-end">
            <div class="d-flex justify-content-end me-2">
              <button class="btn btn-warning btn-sm me-1" @click="abrirModalEditar(dato)">
                Editar
              </button>
              <button class="btn btn-danger btn-sm">Eliminar</button>
            </div>
          </td>
        </tr>
        </tbody>
      </table>
      <button class="btn btn-primary mt-4" @click="abrirModalCrear">Crear usuario</button>
    </div>
  </main>

  <!-- Modal de Bootstrap -->
  <div class="modal fade" ref="modalRef" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            {{ modoEdicion ? 'Editar Usuario' : 'Crear Usuario' }}
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div v-if="mensajeExito" class="alert alert-success text-center">
            ¡Rol actualizado con éxito!
          </div>
          <form v-else>
            <div v-if="modoEdicion">
              <label class="form-label">Rol del Usuario</label>
              <select class="form-select" v-model="usuarioSeleccionado.rol">
                <option v-for="rol in rolesPermitidos" :key="rol" :value="rol">
                  {{ rol }}
                </option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button v-if="!mensajeExito" class="btn btn-primary" @click="actualizarRol">
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.acciones-col {
  width: 150px;
}
</style>
