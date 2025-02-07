<script setup>
window.addEventListener("load", function(){
   
    let datos = [];

   //Ejemplo para ver los guías disponibles
   const API_URL = 'http://localhost/freetours/api.php/';

   fetch(API_URL+'usuarios')
   .then(response => response.json())
   .then(data => console.log("Guías disponibles:", data))
   .catch(error => console.error("Error:", error));

    
   console.log(datos);
   

})

</script>

<template>
<main class="row">

<p></p>

</main>

</template>

<style scoped></style>