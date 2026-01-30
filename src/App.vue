<template>
  <RouterView />
</template>

<script setup>
import { RouterView } from 'vue-router'
</script>

<style>
/* Reset default Vue styling that might conflict */
#app {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  display: block; /* Overrides default grid/flex */
  max-width: none; /* Overrides default width limits */
}

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
