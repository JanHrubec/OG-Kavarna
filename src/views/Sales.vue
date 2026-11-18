<script setup>
import { ref, onMounted, computed } from 'vue';
import { getAll, remove, update, deleteAll } from '../db.js';
import { useAuth } from '../composables/useAuth.js';

const { isAuthenticated } = useAuth();

const TIME_FRAMES = {
  afternoon: { start: '16:00', end: '17:30' },
  evening: { start: '20:00', end: '21:30' }
};

const sales = ref([]);
const people = ref([]);
const shiftLogs = ref([]);
const menuItems = ref([]);
const editingSale = ref(null);
const filterTimeRange = ref(null);
const loading = ref(true);

onMounted(async () => {
  await loadData();
  
  const savedFilter = sessionStorage.getItem('salesFilter');
  if (savedFilter) {
    const filter = JSON.parse(savedFilter);
    filterTimeRange.value = {
      startTime: new Date(filter.startTime),
      endTime: new Date(filter.endTime)
    };
    // optional paymentMethod filter: 'cash' or 'card'
    if (filter.paymentMethod) {
      filterPaymentMethod.value = filter.paymentMethod;
    }
    sessionStorage.removeItem('salesFilter');
  }
});

const filterPaymentMethod = ref(null);

async function loadData() {
  loading.value = true;
  sales.value = await getAll('sales');
  people.value = await getAll('people');
  menuItems.value = await getAll('menuItems');
  shiftLogs.value = await getAll('shifts');
  sales.value.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  loading.value = false;
}

const filteredSales = computed(() => {
  if (!filterTimeRange.value) return sales.value;

  const { startTime, endTime } = filterTimeRange.value;
  return sales.value.filter(sale => {
    const saleTime = new Date(sale.timestamp);
    if (!(saleTime >= startTime && saleTime <= endTime)) return false;
    if (!filterPaymentMethod.value) return true;
    const method = sale.paymentMethod || 'cash';
    return method === filterPaymentMethod.value;
  });
});

const salesGrouped = computed(() => {
  const result = [];
  let lastDate = null;
  let lastTimeFrame = null;
  
  filteredSales.value.forEach(sale => {
    const saleDate = new Date(sale.timestamp);
    const dateStr = saleDate.toISOString().split('T')[0];
    const timeStr = saleDate.toTimeString().substring(0, 5);
    
    let timeFrame = null;
    let dutyName = null;
    
    if (timeStr >= TIME_FRAMES.afternoon.start && timeStr <= TIME_FRAMES.afternoon.end) {
      timeFrame = 'afternoon';
    } else if (timeStr >= TIME_FRAMES.evening.start && timeStr <= TIME_FRAMES.evening.end) {
      timeFrame = 'evening';
    }
    
    if (timeFrame) {
      const log = shiftLogs.value.find(l => {
        const logDate = l.date || new Date(l.startTime).toISOString().split('T')[0];
        return logDate === dateStr && l.timeFrame === timeFrame;
      });
      dutyName = log ? log.dutyName : null;
    }
    
    const isNewGroup = dateStr !== lastDate || timeFrame !== lastTimeFrame;
    
    result.push({
      ...sale,
      dateStr,
      timeFrame,
      dutyName,
      isNewGroup
    });
    
    lastDate = dateStr;
    lastTimeFrame = timeFrame;
  });
  
  return result;
});

function getPersonName(sale) {
  return sale.personName || 'Unknown';
}

function formatPersonName(person) {
  return `${person.firstName} ${person.lastName}`;
}

function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('cs-CZ');
}

function editSale(sale) {
  const date = new Date(sale.timestamp);
  const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  editingSale.value = { ...sale, timestamp: localDateTime };
}

function cancelEdit() {
  editingSale.value = null;
}

async function saveEdit() {
  if (editingSale.value) {
    await update('sales', editingSale.value);
    editingSale.value.personName = ''; // Clear the person field after submission
    editingSale.value = null;
    await loadData();
  }
}

async function deleteSale(id) {
  if (confirm('Are you sure you want to delete this sale?')) {
    const sale = sales.value.find(s => s.id === id);
    if (sale && Array.isArray(sale.items)) {
      for (const soldItem of sale.items) {
        try {
          const menuItem = menuItems.value.find(m => m.name === soldItem.name);
          if (menuItem) {
            const newAmount = (Number(menuItem.amount) || 0) + 1;
            const updated = { ...menuItem, amount: newAmount };
            await update('menuItems', updated);
          }
        } catch (err) {
          console.error('Failed to restore menu item amount for', soldItem, err);
        }
      }
    }

    await remove('sales', id);
    await loadData();
  }
}

function getItemsList(items) {
  return items.map(item => item.name).join(', ');
}

function clearTimeFilter() {
  filterTimeRange.value = null;
  filterPaymentMethod.value = null;
}

function getTimeFrameLabel(timeFrame) {
  if (timeFrame === 'afternoon') return 'Afternoon';
  if (timeFrame === 'evening') return 'Evening';
  return 'Other Time';
}

function formatDateShort(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('cs-CZ', { 
    weekday: 'short',
    day: 'numeric',
    month: 'numeric'
  });
}

function isOutsideDutyHours(timestamp) {
  const timeStr = new Date(timestamp).toTimeString().substring(0, 5);
  const inAfternoon = timeStr >= TIME_FRAMES.afternoon.start && timeStr <= TIME_FRAMES.afternoon.end;
  const inEvening = timeStr >= TIME_FRAMES.evening.start && timeStr <= TIME_FRAMES.evening.end;
  return !inAfternoon && !inEvening;
}

async function deleteAllSales() {
  if (confirm('WARNING: This will permanently delete ALL sales records. Are you absolutely sure?')) {
    if (confirm('This action cannot be undone. Delete all sales?')) {
      await deleteAll('sales');
      await loadData();
    }
  }
}
</script>

<template>
  <div class="sales-page">
    <div v-if="loading" class="loading">Loading...</div>
    <template v-else>
    <div class="page-header">
      <h1>Sales History</h1>
      <div style="display: flex; gap: 10px; align-items: center;">
        <div v-if="filterTimeRange" class="filter-badge">
          <span>Filtered: {{ formatDateTime(filterTimeRange.startTime) }} - {{ formatDateTime(filterTimeRange.endTime) }}</span>
          <button @click="clearTimeFilter" class="danger small">Clear Filter</button>
        </div>
        <button v-if="isAuthenticated && sales.length > 0" @click="deleteAllSales" class="danger">
          Delete All Sales
        </button>
      </div>
    </div>

    <div v-if="salesGrouped.length === 0" class="no-sales">
      <p>No sales found</p>
    </div>

    <div v-else class="table-container">
      <table>
        <thead>
          <tr>
            <th>Person</th>
            <th>Payment</th>
            <th>Items</th>
            <th>Total Price</th>
            <th>Timestamp</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="sale in salesGrouped" :key="sale.id">
            <tr v-if="sale.isNewGroup" class="group-separator">
              <td colspan="6" class="group-label">
                <span class="date-label">{{ formatDateShort(sale.dateStr) }}</span>
                <span class="time-label">{{ getTimeFrameLabel(sale.timeFrame) }}</span>
                <span v-if="sale.dutyName" class="duty-label">{{ sale.dutyName }}</span>
                <span v-else-if="sale.timeFrame" class="duty-label missing">Missing</span>
              </td>
            </tr>
            <tr :class="{ 'outside-duty-hours': isOutsideDutyHours(sale.timestamp) }">
            <template v-if="editingSale && editingSale.id === sale.id">
              <td>
                <input type="text" v-model="editingSale.personName" />
              </td>
              <td>
                <select v-model="editingSale.paymentMethod">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                </select>
              </td>
              <td>{{ getItemsList(sale.items) }}</td>
              <td>{{ sale.totalPrice }} Kč</td>
              <td>
                <input 
                  type="datetime-local" 
                  v-model="editingSale.timestamp" 
                  style="width: 180px;"
                />
              </td>
              <td>
                <button @click="saveEdit" class="success">Save</button>
                <button @click="cancelEdit" class="danger">Cancel</button>
              </td>
            </template>
            <template v-else>
              <td>{{ getPersonName(sale) }}</td>
              <td>{{ sale.paymentMethod || 'cash' }}</td>
              <td>{{ getItemsList(sale.items) }}</td>
              <td>{{ sale.totalPrice }} Kč</td>
              <td>{{ formatDateTime(sale.timestamp) }}</td>
              <td>
                <button @click="editSale(sale)">Edit</button>
                <button @click="deleteSale(sale.id)" class="danger">Delete</button>
              </td>
            </template>
          </tr>
          </template>
        </tbody>
      </table>
    </div>
    </template>
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
  font-size: 1.2rem;
  color: #95a5a6;
}

.sales-page {
  max-width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.filter-badge {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background-color: #3498db;
  color: white;
  border-radius: 4px;
}

.filter-badge button.small {
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
}

.no-sales {
  text-align: center;
  padding: 3rem;
  color: #95a5a6;
  font-size: 1.2rem;
}

.group-separator {
  border-top: 3px solid #e0e0e0;
}

.group-label {
  background: #f8f9fa;
  padding: 0.75rem 1rem !important;
  font-weight: 500;
  color: #2c3e50;
}

.date-label,
.time-label {
  margin-right: 1rem;
  color: #2c3e50;
}

.duty-label {
  padding: 0.25rem 0.75rem;
  background: #667eea;
  color: white;
  border-radius: 4px;
  font-size: 0.9rem;
  margin-left: auto;
}

.duty-label.missing {
  background: #e74c3c;
  color: white;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.table-container {
  overflow-x: auto;
}

table {
  min-width: 800px;
}

td button {
  margin-right: 0.5rem;
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
}

td input, td select {
  padding: 0.3rem;
  font-size: 0.9rem;
}

.outside-duty-hours {
  background-color: #ffebee !important;
  border-left: 3px solid #e74c3c;
}

.outside-duty-hours td {
  color: #c0392b;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .table-container {
    overflow-x: auto;
  }

  table {
    min-width: 600px;
    font-size: 0.8rem;
  }

  th, td {
    padding: 0.5rem 0.3rem;
  }

  td button {
    padding: 0.3rem 0.5rem;
    font-size: 0.8rem;
    margin-right: 0.25rem;
  }

  td input, td select {
    padding: 0.2rem;
    font-size: 0.8rem;
  }

  .group-label {
    font-size: 0.9rem;
  }

  .date-label,
  .time-label,
  .duty-label {
    font-size: 0.85rem;
  }

  .duty-label {
    padding: 0.2rem 0.5rem;
  }
}
</style>
