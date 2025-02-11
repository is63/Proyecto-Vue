<script setup>

const API_URL = "http://localhost/freetours/api.php/rutas"

fetch(API_URL, {
    method: 'GET',
})
.then(response => response.json())
.then(data => console.log('Rutas:', data))
.catch(error => console.error('Error:', error));

</script>

<template>
  <h1>HOLA SOY EL INDEX</h1>
</template>

<style scoped>

</style>