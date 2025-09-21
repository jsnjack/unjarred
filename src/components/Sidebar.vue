<template>
  <div>
    <div v-for="event in cookieEvents" :key="event.timestamp">
      <h2>{{ event.cookie.domain }}</h2>
      <p>Cause: {{ event.cause_human }}</p>
      <p>Name: {{ event.cookie.name }}</p>
    </div>
    <button @click="reset">Reset</button>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';

const cookieEvents = ref([]);

function reset() {
  cookieEvents.value = [];
}

onMounted(() => {
  browser.runtime.onMessage.addListener((message) => {
    console.debug("[Sidebar.vue] Received message:", message);
    if (message.command === 'cookie-event') {
      cookieEvents.value.push(message.data);
    }
  });
});
</script>

<style>
h2 {
  font-size: 1.2em;
  margin-top: 1em;
}
</style>
