<template>
  <div class="sidebar-container">
    <div class="sidebar-header">
      <div class="header-row">
        <button @click="reset">Reset</button>
        <div class="event-counters">
          <span class="event-counter" title="Total number of cookie events">
            Total: {{ filteredCookieEvents.length }}
            <span v-if="filterText">/ {{ cookieEvents.length }}</span>
          </span>
          <span class="event-counter label-new" title="Number of new cookies">{{ eventCounts.new }}</span>
          <span class="event-counter label-removed" title="Number of removed cookies">{{ eventCounts.removed }}</span>
          <span class="event-counter label-evicted" title="Number of evicted cookies">{{ eventCounts.evicted }}</span>
          <span class="event-counter label-modified" title="Number of overwritten cookies">{{ eventCounts.modified
            }}</span>
          <span class="event-counter label-expired" title="Number of expired cookies">{{ eventCounts.expired }}</span>
        </div>
      </div>
      <input type="text" v-model="filterText" placeholder="Filter events..." class="filter-input" />
    </div>
    <div class="event-list">
      <div v-for="event in filteredCookieEvents" :key="event.id" class="card" @click="toggleSelection(event)"
        :class="{ 'selected': selectedEvents.includes(event.id) }">
        <div class="card-header">
          <p class="cookie-name"><strong>Name:</strong> {{ event.cookie.name }}</p>
          <div :class="['label', getLabelClass(event.cause_human)]">{{ event.cause_human }}</div>
        </div>
        <div class="card-body">
          <p><strong>Size:</strong> {{ event.cookieSize }} B</p>
        </div>
        <div class="card-footer">
          <div class="footer-details">
            <p>🫙 {{ event.cookiejarName }} ({{ event.numberOfCookiesInJar }} 🍪, {{
              event.sizeOfAllCookiesInJar }} B)</p>
          </div>
          <div class="info-container">
            <span v-if="copiedTimestamp === event.timestamp" class="copied-message">Copied!</span>
            <span v-else class="info-icon" @click="copyToClipboard(event)" :title="JSON.stringify(event, null, 2)">
              ℹ️
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

const cookieEvents = ref([]);
const copiedTimestamp = ref(null);
const selectedEvents = ref([]);
const filterText = ref('');

const filteredCookieEvents = computed(() => {
  if (!filterText.value) {
    return cookieEvents.value;
  }
  const lowerCaseFilter = filterText.value.toLowerCase();
  return cookieEvents.value.filter(event => {
    return (
      event.cookie.name.toLowerCase().includes(lowerCaseFilter) ||
      event.cookie.domain.toLowerCase().includes(lowerCaseFilter) ||
      event.cause_human.toLowerCase().includes(lowerCaseFilter)
    );
  });
});


function toggleSelection(event) {
  const eventId = event.id;
  const index = selectedEvents.value.indexOf(eventId);
  if (index > -1) {
    selectedEvents.value.splice(index, 1);
  } else {
    selectedEvents.value.push(eventId);
  }
}



const eventCounts = computed(() => {
  const counts = {
    new: 0,
    removed: 0,
    evicted: 0,
    modified: 0,
    expired: 0,
  };
  cookieEvents.value.forEach(event => {
    if (counts.hasOwnProperty(event.cause_human)) {
      counts[event.cause_human]++;
    }
  });
  return counts;
});

async function copyToClipboard(event) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(event.cookie, null, 2));
    copiedTimestamp.value = event.timestamp;
    setTimeout(() => {
      if (copiedTimestamp.value === event.timestamp) {
        copiedTimestamp.value = null;
      }
    }, 1500);
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
}

function getLabelClass(cause) {
  switch (cause) {
    case 'new':
      return 'label-new';
    case 'removed':
      return 'label-removed';
    case 'evicted':
      return 'label-evicted';
    case 'modified':
      return 'label-modified';
    case 'expired':
      return 'label-expired';
    default:
      return '';
  }
}

function reset() {
  cookieEvents.value = [];
  selectedEvents.value = [];
  filterText.value = '';
}

onMounted(() => {
  browser.runtime.onMessage.addListener((message) => {
    if (message.command === 'cookie-event') {
      cookieEvents.value.unshift(message.data);
    }
  });
});
</script>

<style>
.sidebar-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f0f2f5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}


.filter-input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  margin-top: 8px;
}

.sidebar-header {
  display: flex;
  flex-direction: column;
  padding: 8px;
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 1;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}


.event-counters {
  display: flex;
  gap: 5px;
}

.event-counter {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 6px;
  border-radius: 4px;
  background-color: #eee;
}

.event-list {
  overflow-y: auto;
  flex-grow: 1;
}

.card {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px;
  margin: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  position: relative;
  padding-bottom: 30px;
  /* Make space for the footer */
  cursor: pointer;
}

.card.selected {
  border-color: #007bff;
  box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
  outline: 1px solid #007bff;
}


.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

.cookie-name {
  word-break: break-all;
  margin: 0;
  font-size: 14px;
}

.card-body p {
  margin: 0;
  font-size: 14px;
  color: #333;
}

.card-body p strong {
  color: #000;
}

.card-footer {
  position: absolute;
  bottom: 4px;
  left: 8px;
  right: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-details {
  text-align: left;
}

.footer-details p {
  margin: 0;
  font-size: 12px;
  color: #555;
}

.info-container {
  display: flex;
  align-items: center;
}

.info-icon {
  cursor: pointer;
  font-size: 16px;
}

.copied-message {
  font-size: 12px;
  color: #28a745;
  font-weight: bold;
}

.label {
  padding: 2px 5px;
  border-radius: 4px;
  color: white;
  font-size: 10px;
  font-weight: 500;
  text-transform: capitalize;
  flex-shrink: 0;
}

.label-new {
  background-color: #28a745;
  /* Green */
}

.label-removed {
  background-color: #dc3545;
  /* Red */
}

.label-evicted {
  background-color: #007bff;
  /* Blue */
}

.label-modified {
  background-color: #ffc107;
  /* Yellow */
  color: #212529;
}

.label-expired {
  background-color: #9ba0a5;
  /* Gray */
}

button {
  padding: 8px 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #0056b3;
}
</style>
