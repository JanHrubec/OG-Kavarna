<script setup>
import { ref, onMounted, computed } from 'vue';
import { getAll, add, update, remove, deleteAll } from '../db.js';
import { useAuth } from '../composables/useAuth.js';

const { isAuthenticated } = useAuth();

const menuItems = ref([]);
const categories = ref([]);
const editingItem = ref(null);
const newItem = ref({ name: '', price: 0, category: '', amount: 0 });
const showAddItemForm = ref(false);
const loading = ref(true);

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  menuItems.value = await getAll('menuItems');
  categories.value = await getAll('categories');
  // Sort categories by order
  categories.value.sort((a, b) => (a.order || 0) - (b.order || 0));
  loading.value = false;
}

function getCategoryName(item) {
  return item.category || 'Unknown';
}

const menuItemsByCategory = computed(() => {
  const grouped = {};
  categories.value.forEach(cat => {
    grouped[cat.name] = menuItems.value.filter(item => item.category === cat.name);
  });
  return grouped;
});

// Menu Items
function editItem(item) {
  editingItem.value = { ...item };
}

function cancelEditItem() {
  editingItem.value = null;
}

async function saveEditItem() {
  if (editingItem.value) {
    await update('menuItems', editingItem.value);
    editingItem.value = null;
    await loadData();
  }
}

async function deleteItem(id) {
  if (confirm('Are you sure you want to delete this item?')) {
    await remove('menuItems', id);
    await loadData();
  }
}

async function addItem() {
  if (!newItem.value.name || !newItem.value.category) {
    alert('Please fill in all fields');
    return;
  }
  
  await add('menuItems', { ...newItem.value });
  newItem.value = { name: '', price: 0, category: '', amount: 0 };
  showAddItemForm.value = false;
  await loadData();
}

function cancelAddItem() {
  newItem.value = { name: '', price: 0, category: '', amount: 0 };
  showAddItemForm.value = false;
}

async function deleteAllItems() {
  if (confirm('WARNING: This will permanently delete ALL menu items. Are you absolutely sure?')) {
    if (confirm('This action cannot be undone. Delete all menu items?')) {
      await deleteAll('menuItems');
      await loadData();
    }
  }
}
</script>

<template>
  <div class="menu-page">
    <div v-if="loading" class="loading">Loading...</div>
    <template v-else>
    <div class="section">
      <div class="page-header">
        <h1>Menu Items</h1>
        <div style="display: flex; gap: 10px;">
          <button @click="showAddItemForm = true" v-if="!showAddItemForm" class="success">
            + Add Item
          </button>
          <button v-if="isAuthenticated && menuItems.length > 0" @click="deleteAllItems" class="danger">
            Delete All Items
          </button>
        </div>
      </div>

      <div v-if="showAddItemForm" class="card add-form">
        <h3>Add New Menu Item</h3>
        <div class="form-grid">
          <div class="form-field">
            <label>Name:</label>
            <input v-model="newItem.name" type="text" placeholder="Item Name" />
          </div>
          <div class="form-field">
            <label>Price (Kč):</label>
            <input v-model.number="newItem.price" type="number" min="0" placeholder="0" />
          </div>
          <div class="form-field">
            <label>Category:</label>
            <select v-model="newItem.category">
              <option value="">Select category...</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.name">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div class="form-field">
            <label>Amount:</label>
            <input v-model.number="newItem.amount" type="number" min="0" placeholder="0" />
          </div>
        </div>
        <div class="form-actions">
          <button @click="addItem" class="success">Add Item</button>
          <button @click="cancelAddItem" class="danger">Cancel</button>
        </div>
      </div>

      <div v-if="categories.length === 0">
        <p style="text-align: center; color: #95a5a6; padding: 2rem;">No categories found. Please add a category first.</p>
      </div>

      <div v-else v-for="category in categories" :key="category.id" class="category-group">
        <h3 class="category-heading">{{ category.name }}</h3>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!menuItemsByCategory[category.name] || menuItemsByCategory[category.name].length === 0">
                <td colspan="4" style="text-align: center; color: #95a5a6;">No items in this category</td>
              </tr>
              <tr v-for="item in menuItemsByCategory[category.name]" :key="item.id">
                <template v-if="editingItem && editingItem.id === item.id">
                  <td>
                    <input v-model="editingItem.name" type="text" />
                  </td>
                  <td>
                    <input v-model.number="editingItem.price" type="number" min="0" style="width: 80px;" />
                  </td>
                  <td>
                    <input v-model.number="editingItem.amount" type="number" min="0" style="width: 80px;" />
                  </td>
                  <td>
                    <button @click="saveEditItem" class="success">Save</button>
                    <button @click="cancelEditItem" class="danger">Cancel</button>
                  </td>
                </template>
                <template v-else>
                  <td>{{ item.name }}</td>
                  <td>{{ item.price }} Kč</td>
                  <td>{{ item.amount }}</td>
                  <td>
                    <button @click="editItem(item)">Edit</button>
                    <button @click="deleteItem(item.id)" class="danger">Delete</button>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
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

.menu-page {
  max-width: 100%;
}

.section {
  margin-bottom: 3rem;
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
}

.category-group {
  margin-bottom: 2rem;
}

.category-heading {
  color: #2c3e50;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #3498db;
  font-size: 1.3rem;
}

table {
  min-width: 700px;
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

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
  }

  .header-actions button {
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  table {
    min-width: 500px;
    font-size: 0.85rem;
  }

  td button {
    padding: 0.3rem 0.6rem;
    font-size: 0.85rem;
  }
}
</style>
