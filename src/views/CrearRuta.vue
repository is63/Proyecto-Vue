<script setup>

</script>

<template>
<h1>Crear Ruta</h1>
<form>
  <div class="mb-3">
    <label for="titulo" class="form-label">Título</label>
    <input type="text" class="form-control" id="titulo" v-model="titulo">
  </div>
  <div class="mb-3">
    <label for="descripcion" class="form-label">Descripción</label>
    <textarea class="form-control" id="descripcion" rows="3" v-model="descripcion"></textarea>
    </div>
    <div class="mb-3">
      <label for="localidad" class="form-label">Localidad</label>
      <input type="text" class="form-control" id="localidad" v-model="localidad">
    </div>
    <div class="mb-3">
      <label for="duracion" class="form-label">Duración</label>
      <input type="text" class="form-control" id="duracion" v-model="duracion">
    </div>
    <div class="mb-3">
      <label for="dificultad" class="form-label">Dificultad</label>
      <select class="form-select" id="dificultad" v-model="dificultad">
        <option value="baja">Baja</option>
        <option value="media">Media</option>
        <option value="alta">Alta</option>
      </select>
    </div>
    <div class="mb-3">
      <label for="imagen" class="form-label">Imagen</label>
      <input type="text" class="form-control" id="imagen" v-model="imagen">
    </div>
    <div class="mb-3">
      <label for="coordenadas" class="form-label">Coordenadas</label>
      <input type="text" class="form-control" id="coordenadas" v-model="coordenadas">
    </div>
    <button type="submit" class="btn btn-primary">Crear Ruta</button>
    </form>
</template>

<style scoped>

</style>