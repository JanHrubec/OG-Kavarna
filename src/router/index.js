import { createRouter, createWebHistory } from 'vue-router';
import Order from '../views/Order.vue';
import Sales from '../views/Sales.vue';
import People from '../views/People.vue';
import Menu from '../views/Menu.vue';
import Categories from '../views/Categories.vue';
import Shifts from '../views/Shifts.vue';
import Login from '../views/Login.vue';

const routes = [
  {
    path: '/',
    name: 'Order',
    component: Order
  },
  {
    path: '/sales',
    name: 'Sales',
    component: Sales
  },
  {
    path: '/shifts',
    name: 'Shifts',
    component: Shifts
  },
  {
    path: '/people',
    name: 'People',
    component: People,
    meta: { requiresAuth: true }
  },
  {
    path: '/menu',
    name: 'Menu',
    component: Menu,
    meta: { requiresAuth: true }
  },
  {
    path: '/categories',
    name: 'Categories',
    component: Categories,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    sessionStorage.setItem('redirectAfterLogin', to.path);
    next('/login');
  } else {
    next();
  }
});

export default router;
