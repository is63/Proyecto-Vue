<script setup>
import { ref } from 'vue'; // Importamos ref para la reactividad

// Declaramos una referencia reactiva para los datos
const datos = ref([]);

const API_URL = 'http://localhost/freetours/api.php/';

// Llamamos a fetchData cuando el componente carga
fetchData();

async function fetchData() {
  try {
    const response = await fetch(API_URL + 'usuarios');

    if (!response.ok) {
      throw new Error('Could not fetch resource');
    }

    const data = await response.json();

    // Actualizamos la referencia reactiva "datos" con los datos obtenidos
    datos.value = data;

  } catch (error) {
    console.error('Error al obtener los datos:', error);
  }
}
</script>

<template>
  <main class="d-flex justify-content-center mt-5 text-center">
    <!-- Tabla con estilo Bootstrap -->
    <div class="table-responsive w-75">
      <table class="table table-bordered table-hover">
        <thead class="table-dark">
        <!-- Encabezados de la tabla -->
        <tr>
          <th>#</th>
          <th>Nombre</th>
          <th>Email</th>
          <th>Rol</th>
          <!-- Aplicamos una clase para ajustar el ancho de la columna de acciones -->
          <th class="acciones-col">Acciones</th>
        </tr>
        </thead>
        <tbody>
        <!-- Iteramos por los datos y agregamos una fila (tr) por cada elemento -->
        <tr v-for="(dato, index) in datos" :key="index">
          <td>{{ index + 1 }}</td>
          <td>{{ dato.nombre }}</td>
          <td>{{ dato.email }}</td>
          <td>{{ dato.rol }}</td>
          <td class="text-end">
            <!-- Grupo de botones alineados a la derecha -->
            <div class="d-flex justify-content-end me-2">
              <button class="btn btn-warning btn-sm me-1">Editar</button>
              <button class="btn btn-danger btn-sm">Eliminar</button>
            </div>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<style scoped>
/* Margen superior y centrado general */
main {
  margin-top: 20px;
}

/* Ajustamos el tamaño de la columna de acciones */
.acciones-col {
  width: 150px; /* Cambia el valor según el tamaño deseado */
}
</style>