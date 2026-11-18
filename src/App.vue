<script setup>
import { useAuth } from './composables/useAuth.js';
import { useRouter } from 'vue-router';

const { isAuthenticated, logout } = useAuth();
const router = useRouter();

async function handleLogout() {
  await logout();
  router.push('/');
}
</script>

<template>
  <div id="app">
    <nav class="navbar">
      <div class="nav-brand">OG Kavárna</div>
      <div class="nav-links">
        <router-link to="/">Order</router-link>
        <router-link to="/sales">Sales</router-link>
        <router-link to="/shifts">Shifts</router-link>
        <template v-if="isAuthenticated">
          <router-link to="/people">People</router-link>
          <router-link to="/menu">Menu</router-link>
          <router-link to="/categories">Categories</router-link>
        </template>
      </div>
      <div class="nav-actions">
        <button v-if="isAuthenticated" @click="handleLogout" class="logout-btn">
          Logout
        </button>
        <router-link v-else to="/login" class="login-link">
          Login
        </router-link>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: #f5f5f5;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background-color: #2c3e50;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  gap: 2rem;
  flex-wrap: wrap;
}

.nav-brand {
  font-size: 1.5rem;
  font-weight: bold;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
  flex: 1;
  flex-wrap: wrap;
}

.nav-links a {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.nav-links a:hover {
  background-color: #34495e;
}

.nav-links a.router-link-active {
  background-color: #3498db;
}

.nav-actions {
  display: flex;
  align-items: center;
}

.logout-btn {
  padding: 0.5rem 1rem;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.logout-btn:hover {
  background-color: #c0392b;
}

.login-link {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border: 2px solid white;
  border-radius: 4px;
  transition: all 0.2s;
}

.login-link:hover {
  background-color: white;
  color: #2c3e50;
}

.main-content {
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

button {
  padding: 0.5rem 1rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #2980b9;
}

button.danger {
  background-color: #e74c3c;
}

button.danger:hover {
  background-color: #c0392b;
}

button.success {
  background-color: #27ae60;
}

button.success:hover {
  background-color: #229954;
}

button.info {
  background-color: #3498db;
}

button.info:hover {
  background-color: #2980b9;
}

input, select, textarea {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #3498db;
}

table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border-radius: 8px;
  overflow: hidden;
}

th, td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #ecf0f1;
}

th {
  background-color: #34495e;
  color: white;
  font-weight: 600;
}

tr:hover {
  background-color: #f8f9fa;
}

.card {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .navbar {
    padding: 0.75rem 1rem;
    gap: 1rem;
  }

  .nav-brand {
    font-size: 1.2rem;
    width: 100%;
    text-align: center;
  }

  .nav-links {
    width: 100%;
    justify-content: center;
    gap: 0.5rem;
  }

  .nav-links a {
    padding: 0.4rem 0.6rem;
    font-size: 0.9rem;
  }

  .nav-actions {
    width: 100%;
    justify-content: center;
  }

  .main-content {
    padding: 1rem;
  }

  table {
    font-size: 0.85rem;
  }

  th, td {
    padding: 0.5rem;
  }

  .card {
    padding: 1rem;
  }

  button {
    font-size: 0.9rem;
    padding: 0.4rem 0.8rem;
  }
}
</style>
