<script setup>
import { ref, onMounted } from 'vue';
import { getAll, add, update, remove, deleteAll } from '../db.js';
import { useAuth } from '../composables/useAuth.js';

const { isAuthenticated } = useAuth();
const people = ref([]);
const editingPerson = ref(null);
const newPerson = ref({ firstName: '', lastName: '' });
const showAddForm = ref(false);
const loading = ref(true);

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  people.value = await getAll('people');
  loading.value = false;
}

function editPerson(person) {
  editingPerson.value = { ...person };
}

function cancelEdit() {
  editingPerson.value = null;
}

async function saveEdit() {
  if (editingPerson.value) {
    await update('people', editingPerson.value);
    editingPerson.value = null;
    await loadData();
  }
}

async function deletePerson(id) {
  if (confirm('Are you sure you want to delete this person?')) {
    await remove('people', id);
    await loadData();
  }
}

async function addPerson() {
  if (!newPerson.value.firstName || !newPerson.value.lastName) {
    alert('Please fill in all fields');
    return;
  }
  
  await add('people', { ...newPerson.value });
  newPerson.value = { firstName: '', lastName: '' };
  showAddForm.value = false;
  await loadData();
}

function cancelAdd() {
  newPerson.value = { firstName: '', lastName: '' };
  showAddForm.value = false;
}

async function deleteAllPeople() {
  if (confirm('WARNING: This will permanently delete ALL people. Are you absolutely sure?')) {
    if (confirm('This action cannot be undone. Delete all people?')) {
      await deleteAll('people');
      await loadData();
    }
  }
}
</script>

<template>
  <div class="people-page">
    <div v-if="loading" class="loading">Loading...</div>
    <template v-else>
    <div class="page-header">
      <h1>People</h1>
      <div class="header-actions">
        <button @click="showAddForm = true" v-if="!showAddForm" class="success">
          + Add Person
        </button>
        <button v-if="isAuthenticated && people.length > 0" @click="deleteAllPeople" class="danger">
          Delete All
        </button>
      </div>
    </div>

    <div v-if="showAddForm" class="card add-form">
      <h3>Add New Person</h3>
      <div class="form-grid">
        <div class="form-field">
          <label>First Name:</label>
          <input v-model="newPerson.firstName" type="text" placeholder="First Name" />
        </div>
        <div class="form-field">
          <label>Last Name:</label>
          <input v-model="newPerson.lastName" type="text" placeholder="Last Name" />
        </div>
      </div>
      <div class="form-actions">
        <button @click="addPerson" class="success">Add Person</button>
        <button @click="cancelAdd" class="danger">Cancel</button>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="people.length === 0">
            <td colspan="3" style="text-align: center; color: #95a5a6;">No people found</td>
          </tr>
          <tr v-for="person in people" :key="person.id">
            <template v-if="editingPerson && editingPerson.id === person.id">
              <td>
                <input v-model="editingPerson.firstName" type="text" />
              </td>
              <td>
                <input v-model="editingPerson.lastName" type="text" />
              </td>
              <td>
                <button @click="saveEdit" class="success">Save</button>
                <button @click="cancelEdit" class="danger">Cancel</button>
              </td>
            </template>
            <template v-else>
              <td>{{ person.firstName }}</td>
              <td>{{ person.lastName }}</td>
              <td>
                <button @click="editPerson(person)">Edit</button>
                <button @click="deletePerson(person.id)" class="danger">Delete</button>
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

.people-page {
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

.form-field input {
  width: 100%;
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
