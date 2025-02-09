<script setup>
import { ref, onMounted } from 'vue';
import { Modal } from 'bootstrap';

//  Referencia al modal en el DOM
const modalRef = ref(null);
//  Instancia del modal de Bootstrap
let modalInstance = null;

//  Datos de los usuarios obtenidos de la API
const datos = ref([]);

//  Estado reactivo para saber si estamos en "editar" o "crear"
const modoEdicion = ref(false);

//  Usuario seleccionado para editar
const usuarioSeleccionado = ref({
  id: null,
  nombre: '',
  email: '',
  rol: '',
});

//  Usuario nuevo para crear
const usuarioNuevo = ref({
  nombre: '',
  email: '',
  contraseña: '',
  rol: '',
});

//  Definir los roles permitidos
const rolesPermitidos = ['admin', 'guia', 'cliente'];

//  URL de la API
const API_URL = 'http://localhost/freetours/api.php/usuarios';

//  Función para obtener los datos de la API
async function fetchData() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error('No se pudo obtener los datos');
    }

    datos.value = await response.json();
  } catch (error) {
    console.error('Error al obtener los datos:', error);
  }
}

//  Inicializa el modal al montar el componente
onMounted(() => {
  modalInstance = new Modal(modalRef.value);
  fetchData();
});

//  Función para abrir el modal en modo "editar"
function abrirModalEditar(usuario) {
  usuarioSeleccionado.value = { ...usuario }; // Clonar usuario seleccionado
  modoEdicion.value = true; // Indicamos que estamos editando
  modalInstance.show();
}

//  Función para abrir el modal en modo "crear"
function abrirModalCrear() {
  usuarioNuevo.value = { nombre: '', email: '', contraseña: '', rol: '' }; // Reiniciar valores
  modoEdicion.value = false; // Indicamos que estamos creando
  modalInstance.show();
}

//  Función para crear un usuario nuevo
async function crearUsuario() {
  //  Validar que todos los campos estén completos
  if (
      !usuarioNuevo.value.nombre ||
      !usuarioNuevo.value.email ||
      !usuarioNuevo.value.contraseña)
  {
    alert('Todos los campos son obligatorios');
    return;
  }

  try {
    //  Hacer la petición POST a la API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(usuarioNuevo.value),
    });

    if (!response.ok) {
      throw new Error('Error al crear usuario');
    }

    alert('Usuario creado con éxito');
    modalInstance.hide(); //  Cerrar el modal
    fetchData(); //  Recargar la tabla con los nuevos datos
  } catch (error) {
    console.error('Error al crear usuario:', error);
    alert('Hubo un problema al crear el usuario');
  }
}
</script>

<template>
  <main class="d-flex justify-content-center mt-5 text-center">
    <div class="table-responsive w-75">
      <!--  Tabla con la lista de usuarios -->
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
        <!--  Iteramos sobre los usuarios -->
        <tr v-for="dato in datos" :key="dato.id">
          <td>{{ dato.id }}</td>
          <td>{{ dato.nombre }}</td>
          <td>{{ dato.email }}</td>
          <td>{{ dato.rol }}</td>
          <td class="text-end">
            <div class="d-flex justify-content-end me-2">
              <!--  Botón para abrir el modal en modo edición -->
              <button class="btn btn-warning btn-sm me-1" @click="abrirModalEditar(dato)">
                Editar
              </button>
              <!--  Botón para eliminar (sin funcionalidad aún) -->
              <button class="btn btn-danger btn-sm">Eliminar</button>
            </div>
          </td>
        </tr>
        </tbody>
      </table>
      <div class="text-center">
        <!--  Botón para abrir el modal en modo creación -->
        <button class="btn btn-primary mt-4" @click="abrirModalCrear">Crear usuario</button>
      </div>
    </div>
  </main>

  <!--  Modal de Bootstrap -->
  <div class="modal fade" ref="modalRef" tabindex="-1" aria-labelledby="modalTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="modalTitle">
            {{ modoEdicion ? 'Editar Usuario' : 'Crear Usuario' }}
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <div class="modal-body">
          <form>
            <!--  Formulario para editar usuario (solo cambia el rol) -->
            <div v-if="modoEdicion">
              <div class="mb-3">
                <label for="rolUsuario" class="form-label">Rol del Usuario</label>
                <select id="rolUsuario" class="form-select" v-model="usuarioSeleccionado.rol">
                  <option v-for="rol in rolesPermitidos" :key="rol" :value="rol">
                    {{ rol }}
                  </option>
                </select>
              </div>
            </div>

            <!--  Formulario para crear usuario -->
            <div v-else>
              <div class="mb-3">
                <label for="nombreUsuario" class="form-label">Nombre</label>
                <input type="text" id="nombreUsuario" class="form-control" v-model="usuarioNuevo.nombre" />
              </div>
              <div class="mb-3">
                <label for="emailUsuario" class="form-label">Email</label>
                <input type="email" id="emailUsuario" class="form-control" v-model="usuarioNuevo.email" />
              </div>
              <div class="mb-3">
                <label for="contraseñaUsuario" class="form-label">Contraseña</label>
                <input type="password" id="contraseñaUsuario" class="form-control" v-model="usuarioNuevo.contraseña" />
              </div>
              <div class="mb-3">
                <label for="rolUsuario" class="form-label">Rol</label>
                <select id="rolUsuario" class="form-select" v-model="usuarioNuevo.rol">
                </select>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          <button v-if="!modoEdicion" type="button" class="btn btn-primary" @click="crearUsuario">
            Crear usuario
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*  Ajustar el tamaño de la columna de acciones */
.acciones-col {
  width: 150px;
}
</style>
