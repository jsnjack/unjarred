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
          <span class="event-counter label-new clickable" @click="handleCounterClick('new')"
            :class="{ active: filterText === 'new' }" title="Number of new cookies - click to filter">{{ eventCounts.new
            }}</span>
          <span class="event-counter label-removed clickable" @click="handleCounterClick('removed')"
            :class="{ active: filterText === 'removed' }" title="Number of removed cookies - click to filter">{{
            eventCounts.removed }}</span>
          <span class="event-counter label-evicted clickable" @click="handleCounterClick('evicted')"
            :class="{ active: filterText === 'evicted' }" title="Number of evicted cookies - click to filter">{{
            eventCounts.evicted }}</span>
          <span class="event-counter label-modified clickable" @click="handleCounterClick('modified')"
            :class="{ active: filterText === 'modified' }" title="Number of overwritten cookies - click to filter">{{
            eventCounts.modified }}</span>
          <span class="event-counter label-expired clickable" @click="handleCounterClick('expired')"
            :class="{ active: filterText === 'expired' }" title="Number of expired cookies - click to filter">{{
            eventCounts.expired }}</span>
        </div>
      </div>
      <input type="text" v-model="filterText" placeholder="Filter events..." class="filter-input" />
      <details class="statistics-details">
        <summary class="statistics-summary">📊 New cookies summary</summary>
        <div class="statistics-content">
          <div v-if="newCookieStatistics.length === 0" class="no-stats">
            No new cookies to analyze
          </div>
          <table v-else class="stats-table">
            <thead>
              <tr>
                <th @click="handleSort('domain')" class="sortable" :class="{ active: sortBy === 'domain' }">
                  Domain
                  <span class="sort-indicator" v-if="sortBy === 'domain'">
                    {{ sortDirection === 'asc' ? '↑' : '↓' }}
                  </span>
                </th>
                <th @click="handleSort('count')" class="sortable" :class="{ active: sortBy === 'count' }">
                  Cookies
                  <span class="sort-indicator" v-if="sortBy === 'count'">
                    {{ sortDirection === 'asc' ? '↑' : '↓' }}
                  </span>
                </th>
                <th @click="handleSort('totalSize')" class="sortable" :class="{ active: sortBy === 'totalSize' }">
                  Size (B)
                  <span class="sort-indicator" v-if="sortBy === 'totalSize'">
                    {{ sortDirection === 'asc' ? '↑' : '↓' }}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stats in newCookieStatistics" :key="stats.domain">
                <td class="domain-cell">{{ stats.domain }}</td>
                <td class="count-cell">
                  {{ stats.count }}
                  <span class="httponly-detail">({{ stats.httpOnlyCount }} httponly)</span>
                </td>
                <td class="size-cell">
                  {{ stats.totalSize }}
                  <span class="httponly-detail">({{ stats.httpOnlySize }} httponly)</span>
                </td>
              </tr>
              <tr v-if="newCookieStatistics.length > 0" class="total-row">
                <td class="domain-cell total-label">Total</td>
                <td class="count-cell">
                  {{ cookieTotals.count }}
                  <span class="httponly-detail">({{ cookieTotals.httpOnlyCount }} httponly)</span>
                </td>
                <td class="size-cell">
                  {{ cookieTotals.totalSize }}
                  <span class="httponly-detail">({{ cookieTotals.httpOnlySize }} httponly)</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
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
            <span class="info-icon" @click.stop="openModal(event)">
              ℹ️
            </span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Event Details</h3>
          <button class="close-button" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-section">
            <h4>Raw Event Data</h4>
            <pre>{{ JSON.stringify(sortObjectKeys(selectedEventForModal), null, 2) }}</pre>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="copyToClipboard(selectedEventForModal)">
            {{ copiedId === selectedEventForModal.id ? 'Copied!' : 'Copy JSON' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

// Cross-browser compatibility
const isChrome = typeof chrome !== 'undefined' && typeof browser === 'undefined';
const browserAPI = isChrome ? chrome : browser;

const cookieEvents = ref([]);
const copiedId = ref(null);
const selectedEvents = ref([]);
const filterText = ref('');
const sortBy = ref('domain');
const sortDirection = ref('asc');
const showModal = ref(false);
const selectedEventForModal = ref(null);

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

function openModal(event) {
  selectedEventForModal.value = event;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  selectedEventForModal.value = null;
}

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

const newCookieStatistics = computed(() => {
  const stats = {};

  cookieEvents.value
    .filter(event => event.cause_human === 'new')
    .forEach(event => {
      const domain = event.effectiveDomain || event.cookie.domain;
      const partitionKey = event.cookie.partitionKey?.topLevelSite || '';
      const groupKey = partitionKey ? `${domain} + ${partitionKey}` : domain;

      if (!stats[groupKey]) {
        stats[groupKey] = {
          domain: groupKey,
          count: 0,
          httpOnlyCount: 0,
          totalSize: 0,
          httpOnlySize: 0
        };
      }

      stats[groupKey].count++;
      stats[groupKey].totalSize += event.cookieSize || 0;

      if (event.cookie.httpOnly) {
        stats[groupKey].httpOnlyCount++;
        stats[groupKey].httpOnlySize += event.cookieSize || 0;
      }
    });

  // Convert to array and sort
  const statsArray = Object.values(stats);

  return statsArray.sort((a, b) => {
    let aVal, bVal;

    switch (sortBy.value) {
      case 'domain':
        aVal = a.domain.toLowerCase();
        bVal = b.domain.toLowerCase();
        break;
      case 'count':
        aVal = a.count;
        bVal = b.count;
        break;
      case 'httpOnlyCount':
        aVal = a.httpOnlyCount;
        bVal = b.httpOnlyCount;
        break;
      case 'totalSize':
        aVal = a.totalSize;
        bVal = b.totalSize;
        break;
      case 'httpOnlySize':
        aVal = a.httpOnlySize;
        bVal = b.httpOnlySize;
        break;
      default:
        return 0;
    }

    if (sortDirection.value === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });
});

const cookieTotals = computed(() => {
  return newCookieStatistics.value.reduce((totals, stats) => {
    totals.count += stats.count;
    totals.httpOnlyCount += stats.httpOnlyCount;
    totals.totalSize += stats.totalSize;
    totals.httpOnlySize += stats.httpOnlySize;
    return totals;
  }, {
    count: 0,
    httpOnlyCount: 0,
    totalSize: 0,
    httpOnlySize: 0
  });
});

async function copyToClipboard(event) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    copiedId.value = event.id;
    setTimeout(() => {
      if (copiedId.value === event.id) {
        copiedId.value = null;
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

function handleSort(column) {
  if (sortBy.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = column;
    sortDirection.value = 'asc';
  }
}

function handleCounterClick(cause) {
  if (filterText.value === cause) {
    // If already filtering by this cause, clear the filter
    filterText.value = '';
  } else {
    // Set filter to this cause
    filterText.value = cause;
  }
}

function sortObjectKeys(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[key] = sortObjectKeys(obj[key]);
      return result;
    }, {});
}

onMounted(() => {
  browserAPI.runtime.onMessage.addListener((message) => {
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

.event-counter.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.event-counter.clickable:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  opacity: 0.9;
}

.event-counter.clickable.active {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px currentColor;
  transform: scale(1.05);
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
  color: #28a745;
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

.statistics-details {
  margin-top: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background-color: #f8f9fa;
}

.statistics-summary {
  padding: 6px 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #495057;
  list-style: none;
  user-select: none;
}

.statistics-summary::-webkit-details-marker {
  display: none;
}

.statistics-summary::before {
  content: '▶';
  margin-right: 6px;
  transition: transform 0.2s;
  display: inline-block;
}

.statistics-details[open] .statistics-summary::before {
  transform: rotate(90deg);
}

.statistics-content {
  padding: 8px 10px;
  border-top: 1px solid #e0e0e0;
  background-color: #ffffff;
  max-height: 80vh;
  min-height: 20vh;
  overflow-y: auto;
  resize: vertical;
  border-bottom: 3px solid #dee2e6;
}

.no-stats {
  font-size: 12px;
  color: #6c757d;
  font-style: italic;
  text-align: center;
  padding: 8px 0;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.stats-table th {
  background-color: #f8f9fa;
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 600;
  color: #495057;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stats-table th.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
  transition: background-color 0.2s;
}

.stats-table th.sortable:hover {
  background-color: #e9ecef;
}

.stats-table th.active {
  background-color: #e3f2fd;
  color: #1976d2;
}

.sort-indicator {
  margin-left: 4px;
  font-size: 12px;
}

.stats-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: top;
}

.stats-table tr:hover {
  background-color: #f8f9fa;
}

.total-row {
  border-top: 2px solid #495057 !important;
  background-color: #e9ecef !important;
  font-weight: 600;
}

.total-row:hover {
  background-color: #e9ecef !important;
}

.total-label {
  font-weight: 700 !important;
  color: #212529 !important;
}

.domain-cell {
  font-weight: 500;
  color: #212529;
  word-break: break-all;
  max-width: 120px;
}

.count-cell,
.size-cell {
  color: #28a745;
  font-weight: 600;
  white-space: nowrap;
}

.httponly-detail {
  display: block;
  font-size: 11px;
  color: #495057;
  font-weight: 500;
  margin-top: 2px;
  line-height: 1.2;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  width: 80%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
}

.close-button:hover {
  color: #000;
  background: none;
}

.modal-body {
  padding: 16px;
  overflow-y: auto;
}

.modal-section {
  margin-bottom: 20px;
}

.modal-section h4 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 14px;
  color: #333;
}

.cookie-names-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cookie-name-tag {
  background-color: #e9ecef;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #495057;
}

.modal-body pre {
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  margin: 0;
}

.modal-footer {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
}
</style>
