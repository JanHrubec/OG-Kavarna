<script setup>
import { ref, onMounted } from 'vue';
import { getAll, add, update, remove, deleteAll } from '../db.js';
import { useAuth } from '../composables/useAuth.js';

const { isAuthenticated } = useAuth();

const categories = ref([]);
const editingCategory = ref(null);
const newCategory = ref({ name: '' });
const showAddForm = ref(false);
const loading = ref(true);

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  categories.value = await getAll('categories');
  
  // Initialize order field for categories that don't have it
  let needsUpdate = false;
  categories.value.forEach((cat, index) => {
    if (cat.order === undefined || cat.order === null) {
      cat.order = index;
      needsUpdate = true;
    }
  });
  
  // Update categories that were missing order field
  if (needsUpdate) {
    for (const cat of categories.value) {
      await update('categories', cat);
    }
  }
  
  // Sort categories by order
  categories.value.sort((a, b) => (a.order || 0) - (b.order || 0));
  loading.value = false;
}

function editCategory(category) {
  editingCategory.value = { ...category };
}

function cancelEdit() {
  editingCategory.value = null;
}

async function saveEdit() {
  if (editingCategory.value) {
    await update('categories', editingCategory.value);
    editingCategory.value = null;
    await loadData();
  }
}

async function deleteCategory(id) {
  if (confirm('Are you sure you want to delete this category? This may affect menu items.')) {
    await remove('categories', id);
    await loadData();
  }
}

async function addCategory() {
  if (!newCategory.value.name) {
    alert('Please enter a category name');
    return;
  }
  
  // Set order to be the highest + 1
  const maxOrder = categories.value.reduce((max, cat) => Math.max(max, cat.order || 0), 0);
  const categoryData = {
    name: newCategory.value.name,
    order: maxOrder + 1
  };
  
  await add('categories', categoryData);
  newCategory.value = { name: '' };
  showAddForm.value = false;
  await loadData();
}

function cancelAdd() {
  newCategory.value = { name: '' };
  showAddForm.value = false;
}

async function moveCategoryUp(index) {
  if (index > 0) {
    // Create copies of the categories
    const currentCategory = { ...categories.value[index] };
    const previousCategory = { ...categories.value[index - 1] };
    
    // Ensure order values exist
    if (currentCategory.order === undefined) currentCategory.order = index;
    if (previousCategory.order === undefined) previousCategory.order = index - 1;
    
    // Swap order values
    const tempOrder = currentCategory.order;
    currentCategory.order = previousCategory.order;
    previousCategory.order = tempOrder;
    
    // Update local array immediately for smooth UI
    const newCategories = [...categories.value];
    newCategories[index] = previousCategory;
    newCategories[index - 1] = currentCategory;
    categories.value = newCategories;
    
    // Update database in background
    try {
      await Promise.all([
        update('categories', currentCategory),
        update('categories', previousCategory)
      ]);
    } catch (error) {
      console.error('Error updating categories:', error);
      // Reload on error to restore correct state
      await loadData();
    }
  }
}

async function moveCategoryDown(index) {
  if (index < categories.value.length - 1) {
    // Create copies of the categories
    const currentCategory = { ...categories.value[index] };
    const nextCategory = { ...categories.value[index + 1] };
    
    // Ensure order values exist
    if (currentCategory.order === undefined) currentCategory.order = index;
    if (nextCategory.order === undefined) nextCategory.order = index + 1;
    
    // Swap order values
    const tempOrder = currentCategory.order;
    currentCategory.order = nextCategory.order;
    nextCategory.order = tempOrder;
    
    // Update local array immediately for smooth UI
    const newCategories = [...categories.value];
    newCategories[index] = nextCategory;
    newCategories[index + 1] = currentCategory;
    categories.value = newCategories;
    
    // Update database in background
    try {
      await Promise.all([
        update('categories', currentCategory),
        update('categories', nextCategory)
      ]);
    } catch (error) {
      console.error('Error updating categories:', error);
      // Reload on error to restore correct state
      await loadData();
    }
  }
}

async function deleteAllCategories() {
  if (confirm('WARNING: This will permanently delete ALL categories. Are you absolutely sure?')) {
    if (confirm('This action cannot be undone. Delete all categories?')) {
      await deleteAll('categories');
      await loadData();
    }
  }
}
</script>

<template>
  <div class="categories-page">
    <div v-if="loading" class="loading">Loading...</div>
    <template v-else>
      <div class="page-header">
        <h1>Categories</h1>
        <div class="header-actions">
          <button @click="showAddForm = true" v-if="!showAddForm" class="success">
            + Add Category
          </button>
          <button v-if="isAuthenticated && categories.length > 0" @click="deleteAllCategories" class="danger">
            Delete All
          </button>
        </div>
      </div>

      <div v-if="showAddForm" class="card add-form">
        <h3>Add New Category</h3>
        <div class="form-field">
          <label>Category Name:</label>
          <input v-model="newCategory.name" type="text" placeholder="Category Name" @keyup.enter="addCategory" />
        </div>
        <div class="form-actions">
          <button @click="addCategory" class="success">Add Category</button>
          <button @click="cancelAdd" class="danger">Cancel</button>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th style="width: 150px;">Reorder</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="categories.length === 0">
              <td colspan="3" style="text-align: center; color: #95a5a6;">No categories found</td>
            </tr>
            <tr v-for="(category, index) in categories" :key="category.id">
              <template v-if="editingCategory && editingCategory.id === category.id">
                <td>
                  <input v-model="editingCategory.name" type="text" />
                </td>
                <td></td>
                <td>
                  <button @click="saveEdit" class="success">Save</button>
                  <button @click="cancelEdit" class="danger">Cancel</button>
                </td>
              </template>
              <template v-else>
                <td>{{ category.name }}</td>
                <td>
                  <div style="display: flex; gap: 0.5rem; align-items: center; justify-content: center;">
                    <button 
                      @click="moveCategoryUp(index)" 
                      :disabled="index === 0"
                      title="Move up"
                      class="order-btn"
                    >
                      ▲
                    </button>
                    <button 
                      @click="moveCategoryDown(index)" 
                      :disabled="index === categories.length - 1"
                      title="Move down"
                      class="order-btn"
                    >
                      ▼
                    </button>
                  </div>
                </td>
                <td>
                  <button @click="editCategory(category)">Edit</button>
                  <button @click="deleteCategory(category.id)" class="danger">Delete</button>
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

.categories-page {
  max-width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.add-form {
  margin-bottom: 2rem;
}

.add-form h3 {
  margin-bottom: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.form-field label {
  font-weight: 600;
  color: #2c3e50;
}

.form-field input {
  width: 100%;
  max-width: 400px;
}

.form-actions {
  display: flex;
  gap: 1rem;
}

.table-container {
  overflow-x: auto;
}

table {
  min-width: 600px;
}

td button {
  margin-right: 0.5rem;
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
}

.order-btn {
  padding: 0.2rem 0.5rem !important;
  font-size: 0.9rem;
  min-width: 30px;
}

.order-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

td input {
  padding: 0.3rem;
  font-size: 0.9rem;
  width: 100%;
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

  .form-field input {
    max-width: 100%;
  }

  table {
    min-width: 500px;
    font-size: 0.85rem;
  }

  td button {
    padding: 0.3rem 0.6rem;
    font-size: 0.85rem;
  }

  .order-btn {
    padding: 0.2rem 0.4rem !important;
    font-size: 0.8rem;
    min-width: 25px;
  }
}
</style>
