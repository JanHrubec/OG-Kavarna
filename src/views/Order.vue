<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { getAll, add, update } from '../db.js';

const people = ref([]);
const categories = ref([]);
const menuItems = ref([]);
const orderItems = reactive([]);
const selectedPerson = ref(null);
const searchText = ref('');
const showDropdown = ref(false);
const loading = ref(true);
const paymentMethod = ref('cash');

function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function formatPersonName(person) {
  return `${person.firstName} ${person.lastName}`;
}

onMounted(async () => {
  await loadData();
  const savedPersonName = localStorage.getItem('selectedPersonName');
  if (savedPersonName) {
    searchText.value = savedPersonName;
  }
  const savedPayment = localStorage.getItem('lastPaymentMethod');
  if (savedPayment) paymentMethod.value = savedPayment;
});

watch(selectedPerson, (newValue) => {
  if (newValue) {
    const personName = formatPersonName(newValue);
    searchText.value = personName;
  }
});

async function loadData() {
  loading.value = true;
  people.value = await getAll('people');
  categories.value = await getAll('categories');
  // Sort categories by order
  categories.value.sort((a, b) => (a.order || 0) - (b.order || 0));
  menuItems.value = await getAll('menuItems');
  loading.value = false;
}

const menuByCategory = computed(() => {
  const grouped = {};
  categories.value.forEach(cat => {
    grouped[cat.name] = menuItems.value.filter(item => item.category === cat.name);
  });
  return grouped;
});

const filteredPeople = computed(() => {
  if (!searchText.value.trim()) return people.value;
  
  const search = removeDiacritics(searchText.value.toLowerCase());
  return people.value.filter(person => {
    const fullName = removeDiacritics(`${person.firstName} ${person.lastName}`.toLowerCase());
    return fullName.includes(search);
  });
});

const totalPrice = computed(() => {
  return orderItems.reduce((sum, item) => sum + item.price, 0);
});

function addToOrder(item) {
  orderItems.push({ ...item });
}

function removeFromOrder(index) {
  orderItems.splice(index, 1);
}

function selectPerson(person) {
  selectedPerson.value = person;
  searchText.value = formatPersonName(person);
  showDropdown.value = false;
}

function handleSearchFocus() {
  showDropdown.value = true;
}

function handleSearchInput() {
  selectedPerson.value = null; // Clear selection when typing
  showDropdown.value = true;
}

function handleSearchBlur() {
  setTimeout(() => {
    showDropdown.value = false;
  }, 200);
}

function handleKeyDown(event) {
  if (event.key === 'Enter') {
    event.target.blur();
    showDropdown.value = false;
  }
}

async function placeOrder() {
  const personName = searchText.value.trim();

  if (!personName) {
    alert('Please enter or select a person');
    return;
  }

  if (orderItems.length === 0) {
    alert('Please add items to the order');
    return;
  }

  for (const orderItem of orderItems) {
    const menuItem = menuItems.value.find(m => m.id === orderItem.id);
    if (menuItem) {
      menuItem.amount -= 1;
      await update('menuItems', menuItem);
    }
  }

  const sale = {
    personName: personName,
    items: orderItems.map(item => ({ name: item.name, price: item.price })),
    totalPrice: totalPrice.value,
    paymentMethod: paymentMethod.value || 'cash',
    timestamp: new Date().toISOString()
  };

  await add('sales', sale);

  orderItems.length = 0;
  localStorage.setItem('selectedPersonName', personName);
  localStorage.setItem('lastPaymentMethod', paymentMethod.value || 'cash');
  await loadData();
}
</script>

<template>
  <div class="order-page">
    <div v-if="loading" class="loading">Loading...</div>
    <template v-else>
    <div class="menu-section">
      <div v-for="(items, categoryName) in menuByCategory" :key="categoryName" class="category-section">
        <h2>{{ categoryName }}</h2>
        <div class="menu-grid">
          <button
            v-for="item in items"
            :key="item.id"
            @click="addToOrder(item)"
            class="menu-item"
          >
            <div class="item-name">{{ item.name }}</div>
            <div class="item-price">{{ item.price }} Kč</div>
          </button>
        </div>
      </div>
    </div>

    <div class="order-sidebar">
      <div class="order-header">
        <h2>Current Order</h2>
        <div class="person-selector">
          <label for="person">Person:</label>
          <div class="search-container">
            <input
              id="person"
              type="text"
              v-model="searchText"
              @input="handleSearchInput"
              @focus="handleSearchFocus"
              @blur="handleSearchBlur"
              @keydown="handleKeyDown"
              placeholder="Type or search person name..."
              autocomplete="off"
            />
            <div v-if="showDropdown && filteredPeople.length > 0" class="dropdown">
              <div
                v-for="person in filteredPeople"
                :key="person.id"
                @click="selectPerson(person)"
                class="dropdown-item"
              >
                {{ formatPersonName(person) }}
              </div>
            </div>
            <div v-if="showDropdown && searchText && filteredPeople.length === 0" class="dropdown">
              <div class="dropdown-item no-results">No people found</div>
            </div>
          </div>
        </div>
      </div>

      <div class="order-list">
        <div v-if="orderItems.length === 0" class="empty-order">
          No items in order
        </div>
        <div v-else>
          <div v-for="(item, index) in orderItems" :key="index" class="order-item">
            <span>{{ item.name }}</span>
            <span>{{ item.price }} Kč</span>
            <button @click="removeFromOrder(index)" class="danger small">×</button>
          </div>
        </div>
      </div>

      <div class="order-footer">
        <div class="total">
          <strong>Total:</strong>
          <strong>{{ totalPrice }} Kč</strong>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;margin-right:1rem;">
          <label for="payment" style="font-weight:600;">Payment:</label>
          <select id="payment" v-model="paymentMethod">
            <option value="cash">Cash</option>
            <option value="card">Card</option>
          </select>
        </div>
        <button @click="placeOrder" class="success place-order-btn">
          Place Order
        </button>
      </div>
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

.order-page {
  display: flex;
  gap: 2rem;
  height: calc(100vh - 120px);
}

.menu-section {
  flex: 1;
  overflow-y: auto;
  padding-right: 1rem;
}

.category-section {
  margin-bottom: 2rem;
}

.category-section h2 {
  color: #2c3e50;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #3498db;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.menu-item {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  background-color: white;
  border: 2px solid #3498db;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 100px;
  justify-content: space-between;
}

.menu-item:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.item-name {
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #2c3e50;
  font-size: 1rem;
}

.item-price {
  color: #27ae60;
  font-weight: bold;
  font-size: 1.1rem;
}

.order-sidebar {
  width: 350px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 120px);
  position: sticky;
  top: 0;
}

.order-header {
  padding: 1.5rem;
  border-bottom: 2px solid #ecf0f1;
}

.order-header h2 {
  margin-bottom: 1rem;
}

.person-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.search-container {
  position: relative;
  width: 100%;
}

.search-container input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.search-container input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  z-index: 1000;
}

.dropdown-item {
  padding: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background-color: #f8f9fa;
}

.dropdown-item.no-results {
  color: #95a5a6;
  cursor: default;
  text-align: center;
}

.dropdown-item.no-results:hover {
  background-color: white;
}

.person-selector select {
  width: 100%;
}

.order-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.empty-order {
  text-align: center;
  color: #95a5a6;
  padding: 2rem;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  gap: 0.5rem;
}

.order-item button.small {
  padding: 0.25rem 0.5rem;
  font-size: 1.2rem;
  line-height: 1;
}

.order-footer {
  padding: 1.5rem;
  border-top: 2px solid #ecf0f1;
}

.total {
  display: flex;
  justify-content: space-between;
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

.place-order-btn {
  width: 100%;
  padding: 1rem;
  font-size: 1.1rem;
  font-weight: bold;
}

@media (max-width: 768px) {
  .order-page {
    flex-direction: column;
    height: auto;
  }

  .menu-section {
    padding-right: 0;
  }

  .menu-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem;
  }

  .menu-item {
    padding: 0.75rem;
    min-height: 80px;
  }

  .item-name {
    font-size: 0.9rem;
  }

  .item-price {
    font-size: 1rem;
  }

  .order-sidebar {
    width: 100%;
    max-height: none;
    position: relative;
  }

  .search-container input {
    font-size: 0.9rem;
  }

  .dropdown {
    max-height: 150px;
  }

  .order-header {
    padding: 1rem;
  }

  .order-footer {
    padding: 1rem;
  }

  .total {
    font-size: 1.1rem;
  }
}
</style>

