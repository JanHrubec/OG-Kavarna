<script setup>
import { ref } from 'vue';
import { useAuth } from '../composables/useAuth.js';
import { useRouter } from 'vue-router';

const props = defineProps({
  redirectTo: {
    type: String,
    default: '/'
  }
});

const { login, authError } = useAuth();
const router = useRouter();

const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleLogin() {
  error.value = '';
  loading.value = true;
  
  try {
    const success = await login(password.value);
    if (success) {
      // Check if there's a stored redirect path
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || props.redirectTo;
      sessionStorage.removeItem('redirectAfterLogin');
      router.push(redirectPath);
    } else {
      error.value = authError.value || 'Incorrect password. Please try again.';
      password.value = '';
    }
  } catch (err) {
    error.value = err.message || 'Login failed.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card card">
      <form @submit.prevent="handleLogin">
        <div class="form-field">
          <label for="password">Password:</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Enter password"
            autofocus
          />
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <div class="form-actions">
          <button type="submit" class="success" :disabled="loading">
            {{ loading ? 'Logging in...' : 'Login' }}
          </button>
          <button type="button" @click="router.push('/')" :disabled="loading">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 120px);
  padding: 2rem;
}

.login-card {
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.login-card h1 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.login-card p {
  margin-bottom: 2rem;
  color: #7f8c8d;
}

.form-field {
  margin-bottom: 1.5rem;
  text-align: left;
}

.form-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #2c3e50;
}

.form-field input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 2px solid #ddd;
  border-radius: 4px;
}

.form-field input:focus {
  border-color: #3498db;
  outline: none;
}

.error-message {
  background-color: #ffe6e6;
  color: #e74c3c;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-weight: 500;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.form-actions button {
  flex: 1;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}

.info-text {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #ecf0f1;
  color: #95a5a6;
}
</style>
