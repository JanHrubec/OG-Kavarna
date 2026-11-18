<script setup>
import { ref, onMounted, computed } from 'vue';
import { getAll, add, update, remove, deleteAll } from '../db.js';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth.js';

const router = useRouter();
const { isAuthenticated } = useAuth();

const shifts = ref([]);
const allSales = ref([]);
const editingShift = ref(null);
const newShift = ref({ 
  dutyName: '', 
  startCashAmount: 0, 
  endCashAmount: 0, 
  startCardAmount: 0,
  endCardAmount: 0,
  timeFrame: 'afternoon',
  date: new Date().toISOString().split('T')[0]
});
const showAddForm = ref(false);
const loading = ref(true);

const TIME_FRAMES = {
  afternoon: { label: 'Afternoon', start: '16:00', end: '17:30' },
  evening: { label: 'Evening', start: '20:00', end: '21:30' }
};

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  shifts.value = await getAll('shifts');
  allSales.value = await getAll('sales');
  shifts.value.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  loading.value = false;
}

function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('cs-CZ');
}

function calculateAmountChange(shift, forCard = false) {
  if (forCard) {
    const start = Number(shift.startCardAmount || 0);
    const end = Number(shift.endCardAmount || 0);
    return end - start;
  }
  const start = Number(shift.startCashAmount || 0);
  const end = Number(shift.endCashAmount || 0);
  return end - start;
}

const shiftsWithComputedTotals = computed(() => {
  return shifts.value.map(s => {
    const salesInRange = allSales.value.filter(sale => {
      const saleTime = new Date(sale.timestamp);
      return saleTime >= new Date(s.startTime) && saleTime <= new Date(s.endTime);
    });
    const cashSum = salesInRange.reduce((sum, sale) => sum + ((sale.paymentMethod === 'card') ? 0 : (sale.totalPrice || 0)), 0);
    const cardSum = salesInRange.reduce((sum, sale) => sum + ((sale.paymentMethod === 'card') ? (sale.totalPrice || 0) : 0), 0);
    // ensure start/end card fields exist for older records
    const startCard = Number(s.startCardAmount || 0);
    const endCard = Number(s.endCardAmount || 0);
    const startCash = Number(s.startCashAmount || s.startAmount || 0);
    const endCash = Number(s.endCashAmount || s.endAmount || 0);
    const cashChange = endCash - startCash;
    const cardChange = endCard - startCard;
    const cashDiff = cashChange - cashSum;
    const cardDiff = cardChange - cardSum;
    return { 
      ...s, 
      expectedEarnings: cashSum, 
      cardSum,
      cashChange,
      cardChange,
      cashDiff,
      cardDiff,
      startCardAmount: startCard,
      endCardAmount: endCard,
      startCashAmount: startCash,
      endCashAmount: endCash
    };
  });
});

function editLog(log) {
  const logDate = log.date || new Date(log.startTime).toISOString().split('T')[0];
  editingShift.value = { ...log, date: logDate };
}

function cancelEdit() {
  editingShift.value = null;
}

async function saveEdit() {
  if (editingShift.value) {
    updateLogTimes(editingShift.value);
    await update('shifts', editingShift.value);
    editingShift.value = null;
    await loadData();
  }
}

async function deleteLog(id) {
  if (confirm('Are you sure you want to delete this shift?')) {
    await remove('shifts', id);
    await loadData();
  }
}

function updateLogTimes(log) {
  const logDate = log.date || new Date().toISOString().split('T')[0];
  const timeFrame = TIME_FRAMES[log.timeFrame];
  log.startTime = `${logDate}T${timeFrame.start}:00`;
  log.endTime = `${logDate}T${timeFrame.end}:00`;
}

async function addLog() {
  if (!newShift.value.dutyName) {
    alert('Please enter the name of the person on duty');
    return;
  }
  
  updateLogTimes(newShift.value);

  await add('shifts', { ...newShift.value });
  newShift.value = { 
    dutyName: '', 
    startCashAmount: 0, 
    endCashAmount: 0, 
    startCardAmount: 0,
    endCardAmount: 0,
    timeFrame: 'afternoon',
    date: new Date().toISOString().split('T')[0]
  };
  showAddForm.value = false;
  await loadData();
}

function cancelAdd() {
  newShift.value = { 
    dutyName: '', 
    startCashAmount: 0, 
    endCashAmount: 0, 
    startCardAmount: 0,
    endCardAmount: 0,
    timeFrame: 'afternoon',
    date: new Date().toISOString().split('T')[0]
  };
  showAddForm.value = false;
}

function getTimeFrameLabel(timeFrame) {
  return TIME_FRAMES[timeFrame]?.label || timeFrame;
}

async function viewSalesForLog(log, paymentMethod = null) {
  // Navigate to sales page with time filter and optional paymentMethod
  const filter = {
    startTime: log.startTime,
    endTime: log.endTime
  };
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  sessionStorage.setItem('salesFilter', JSON.stringify(filter));
  router.push('/sales');
}

async function deleteAllLogs() {
  if (confirm('WARNING: This will permanently delete ALL shift logs. Are you absolutely sure?')) {
    if (confirm('This action cannot be undone. Delete all shift logs?')) {
      await deleteAll('shifts');
      await loadData();
    }
  }
}
</script>

<template>
  <div class="shifts-page">
    <div v-if="loading" class="loading">Loading...</div>
    <template v-else>
    <div class="page-header">
      <h1>Shifts</h1>
      <div style="display: flex; gap: 10px;">
        <button @click="showAddForm = true" v-if="!showAddForm" class="success">
          + Add Shift
        </button>
          <button v-if="isAuthenticated && shifts.length > 0" @click="deleteAllLogs" class="danger">
          Delete All Shifts
        </button>
      </div>
    </div>

    <div v-if="showAddForm" class="card add-form">
      <h3>Add New Shift</h3>
      <div class="form-grid">
        <div class="form-field">
          <label>Name:</label>
          <input v-model="newShift.dutyName" type="text" placeholder="Name" />
        </div>
        <div class="form-field">
          <label>Date:</label>
          <input v-model="newShift.date" type="date" />
        </div>
        <div class="form-field">
          <label>Time:</label>
          <select v-model="newShift.timeFrame">
            <option value="afternoon">{{ TIME_FRAMES.afternoon.label }} ({{ TIME_FRAMES.afternoon.start }} - {{ TIME_FRAMES.afternoon.end }})</option>
            <option value="evening">{{ TIME_FRAMES.evening.label }} ({{ TIME_FRAMES.evening.start }} - {{ TIME_FRAMES.evening.end }})</option>
          </select>
        </div>
        <div class="form-field">
          <label>Start Amount (Cash, Kč):</label>
          <input v-model.number="newShift.startCashAmount" type="number" min="0" placeholder="0" />
        </div>
        <div class="form-field">
          <label>End Amount (Cash, Kč):</label>
          <input v-model.number="newShift.endCashAmount" type="number" min="0" placeholder="0" />
        </div>
        <div class="form-field">
          <label>Start Amount (Card, Kč):</label>
          <input v-model.number="newShift.startCardAmount" type="number" min="0" placeholder="0" />
        </div>
        <div class="form-field">
          <label>End Amount (Card, Kč):</label>
          <input v-model.number="newShift.endCardAmount" type="number" min="0" placeholder="0" />
        </div>
      </div>
      <div class="form-actions">
        <button @click="addLog" class="success">Add Log</button>
        <button @click="cancelAdd" class="danger">Cancel</button>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Date</th>
            <th>Time</th>
            <th>Start Cash</th>
            <th>End Cash</th>
            <th>Change Cash</th>
            <th>Cash Sales</th>
            <th>Start Card</th>
            <th>End Card</th>
            <th>Change Card</th>
            <th>Card Sales</th>
            <th>View</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="shiftsWithComputedTotals.length === 0">
            <td colspan="14" style="text-align: center; color: #95a5a6;">No shifts found</td>
          </tr>
          <tr 
            v-for="log in shiftsWithComputedTotals" 
            :key="log.id"
          >
            <template v-if="editingShift && editingShift.id === log.id">
              <td>
                <input v-model="editingShift.dutyName" type="text" />
              </td>
              <td>
                <input v-model="editingShift.date" type="date" style="width: 140px;" />
              </td>
              <td>
                <select v-model="editingShift.timeFrame">
                  <option value="afternoon">{{ TIME_FRAMES.afternoon.label }}</option>
                  <option value="evening">{{ TIME_FRAMES.evening.label }}</option>
                </select>
              </td>
              <td>
                <input v-model.number="editingShift.startCashAmount" type="number" min="0" style="width: 100px;" />
              </td>
              <td>
                <input v-model.number="editingShift.endCashAmount" type="number" min="0" style="width: 100px;" />
              </td>
              <td>{{ calculateAmountChange(editingShift, false) }} Kč</td>
              <td :class="{ 'equal': calculateAmountChange(editingShift, false) === (log.expectedEarnings || 0), 'negative': (log.expectedEarnings || 0) > calculateAmountChange(editingShift, false), 'positive': (log.expectedEarnings || 0) < calculateAmountChange(editingShift, false) }">
                {{ log.expectedEarnings }} Kč
              </td>
              <td>
                <input v-model.number="editingShift.startCardAmount" type="number" min="0" style="width: 100px;" />
              </td>
              <td>
                <input v-model.number="editingShift.endCardAmount" type="number" min="0" style="width: 100px;" />
              </td>
              <td>{{ calculateAmountChange(editingShift, true) }} Kč</td>
              <td :class="{ 'equal': calculateAmountChange(editingShift, true) === (log.cardSum || 0), 'negative': (log.cardSum || 0) > calculateAmountChange(editingShift, true), 'positive': (log.cardSum || 0) < calculateAmountChange(editingShift, true) }">
                {{ log.cardSum || 0 }} Kč
              </td>
              <td>
                <button @click="viewSalesForLog(log, 'cash')" class="info">Cash</button>
                <button @click="viewSalesForLog(log, 'card')" class="info">Card</button>
              </td>
              <td>
                <button @click="saveEdit" class="success">Save</button>
                <button @click="cancelEdit" class="danger">Cancel</button>
              </td>
            </template>
            <template v-else>
              <td>{{ log.dutyName }}</td>
              <td>{{ log.date || formatDateTime(log.startTime).split(' ')[0] }}</td>
              <td>{{ getTimeFrameLabel(log.timeFrame) }}</td>
              <td>{{ log.startCashAmount || 0 }} Kč</td>
              <td>{{ log.endCashAmount || 0 }} Kč</td>
              <td>{{ calculateAmountChange(log, false) }} Kč</td>
              <td :class="{ 'equal': calculateAmountChange(log, false) === (log.expectedEarnings || 0), 'negative': (log.expectedEarnings || 0) > calculateAmountChange(log, false), 'positive': (log.expectedEarnings || 0) < calculateAmountChange(log, false) }">
                {{ log.expectedEarnings }} Kč
              </td>
              <td>{{ log.startCardAmount || 0 }} Kč</td>
              <td>{{ log.endCardAmount || 0 }} Kč</td>
              <td>{{ calculateAmountChange(log, true) }} Kč</td>
              <td :class="{ 'equal': calculateAmountChange(log, true) === (log.cardSum || 0), 'negative': (log.cardSum || 0) > calculateAmountChange(log, true), 'positive': (log.cardSum || 0) < calculateAmountChange(log, true) }">
                {{ log.cardSum || 0 }} Kč
              </td>
              <td>
                <button @click="viewSalesForLog(log, 'cash')" class="info">Cash</button>
                <button @click="viewSalesForLog(log, 'card')" class="info">Card</button>
              </td>
              <td>
                <button @click="editLog(log)">Edit</button>
                <button @click="deleteLog(log.id)" class="danger">Delete</button>
              </td>
            </template>
          </tr>
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

.shifts-page {
  max-width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.add-form {
  margin-bottom: 2rem;
}

.add-form h3 {
  margin-bottom: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-weight: 600;
  color: #2c3e50;
}

.form-field input,
.form-field select {
  width: 100%;
}

.form-actions {
  display: flex;
  gap: 1rem;
}

.table-container {
  overflow-x: auto;
  margin-bottom: 1rem;
}

table {
  min-width: 1200px;
}

td button {
  margin-right: 0.5rem;
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
}

td input,
td select {
  padding: 0.3rem;
  font-size: 0.9rem;
}

.positive {
  color: #27ae60;
  font-weight: bold;
}

.negative {
  color: #e74c3c;
  font-weight: bold;
}

.equal {
  color: #000;
  font-weight: bold;
}

.expanded-row {
  background-color: #e8f4f8;
}

.info-card {
  margin-top: 1rem;
}

.info-card p {
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  table {
    min-width: 700px;
    font-size: 0.85rem;
  }

  th, td {
    padding: 0.5rem 0.3rem;
  }

  td button {
    padding: 0.3rem 0.5rem;
    font-size: 0.8rem;
  }

  td input, td select {
    padding: 0.2rem;
    font-size: 0.8rem;
  }
}
</style>
