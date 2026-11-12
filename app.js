/**
 * Kanban Task Manager
 * Clean Architecture with Vanilla JavaScript
 * Modules: StorageService, StateManager, DOMRenderer, NavigationController, SidebarController,
 *          DragDropController, ModalController, ThemeManager, App
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. Storage Layer (localStorage wrapper)
  // ==========================================================================
  const StorageService = {
    STORAGE_TASKS_KEY: 'kanban_board_tasks_v2',
    STORAGE_TASKS_OLD_KEY: 'kanban_board_tasks_v1',
    STORAGE_USERS_KEY: 'kanban_board_users_v2',
    STORAGE_SIDEBAR_KEY: 'kanban_sidebar_collapsed_v1',

    // Initial seed users shown on first launch
    DEFAULT_USERS: [
      {
        id: 'user-1',
        name: 'Sarah Chen',
        stack: 'Frontend Engineer',
        createdAt: Date.now() - 86400000 * 5
      },
      {
        id: 'user-2',
        name: 'Alex Rivera',
        stack: 'Backend Developer',
        createdAt: Date.now() - 86400000 * 4
      },
      {
        id: 'user-3',
        name: 'Elena Rostova',
        stack: 'UI/UX Designer',
        createdAt: Date.now() - 86400000 * 3
      },
      {
        id: 'user-4',
        name: 'Marcus Vance',
        stack: 'DevOps Specialist',
        createdAt: Date.now() - 86400000 * 2
      }
    ],

    // Initial seed tasks shown on first launch
    DEFAULT_TASKS: [
      {
        id: 'task-1',
        title: 'Conduct user research and persona mapping',
        description: 'Interview 5 active project managers to uncover pain points in current workflow tools.',
        status: 'todo',
        assigneeId: 'user-3',
        createdAt: Date.now() - 86400000 * 3
      },
      {
        id: 'task-2',
        title: 'Design high-fidelity design system tokens',
        description: 'Define semantic color variables, responsive typography scale, and card elevation hierarchy.',
        status: 'todo',
        assigneeId: 'user-1',
        createdAt: Date.now() - 86400000 * 2
      },
      {
        id: 'task-3',
        title: 'Implement native HTML5 drag-and-drop system',
        description: 'Wire up dragstart, dragover placeholder positioning, and state-driven drop reordering.',
        status: 'inprogress',
        assigneeId: 'user-1',
        createdAt: Date.now() - 86400000 * 1
      },
      {
        id: 'task-4',
        title: 'Initialize repository and architecture plan',
        description: 'Structured decoupled layers for DOM, State, and Storage without third-party frameworks.',
        status: 'done',
        assigneeId: 'user-2',
        createdAt: Date.now() - 86400000 * 4
      }
    ],

    /**
     * Load tasks from localStorage or return default tasks
     * @returns {Array<Object>}
     */
    loadTasks() {
      try {
        const serialized = localStorage.getItem(this.STORAGE_TASKS_KEY);
        if (!serialized) {
          // Check for legacy v1 tasks to migrate
          const oldSerialized = localStorage.getItem(this.STORAGE_TASKS_OLD_KEY);
          if (oldSerialized) {
            const oldTasks = JSON.parse(oldSerialized);
            if (Array.isArray(oldTasks) && oldTasks.length > 0) {
              const migrated = oldTasks.map((t) => ({ ...t, assigneeId: t.assigneeId || null }));
              this.saveTasks(migrated);
              return migrated;
            }
          }
          this.saveTasks(this.DEFAULT_TASKS);
          return [...this.DEFAULT_TASKS];
        }
        const parsed = JSON.parse(serialized);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.error('StorageService: Failed to read tasks from localStorage', err);
        return [];
      }
    },

    /**
     * Persist tasks to localStorage
     * @param {Array<Object>} tasks
     */
    saveTasks(tasks) {
      try {
        localStorage.setItem(this.STORAGE_TASKS_KEY, JSON.stringify(tasks));
      } catch (err) {
        console.error('StorageService: Failed to persist tasks to localStorage', err);
      }
    },

    /**
     * Load users from localStorage or return default sample users
     * @returns {Array<Object>}
     */
    loadUsers() {
      try {
        const serialized = localStorage.getItem(this.STORAGE_USERS_KEY);
        if (!serialized) {
          this.saveUsers(this.DEFAULT_USERS);
          return [...this.DEFAULT_USERS];
        }
        const parsed = JSON.parse(serialized);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.error('StorageService: Failed to read users from localStorage', err);
        return [];
      }
    },

    /**
     * Persist users to localStorage
     * @param {Array<Object>} users
     */
    saveUsers(users) {
      try {
        localStorage.setItem(this.STORAGE_USERS_KEY, JSON.stringify(users));
      } catch (err) {
        console.error('StorageService: Failed to persist users to localStorage', err);
      }
    },

    /**
     * Load sidebar collapsed state
     * @returns {boolean}
     */
    loadSidebarCollapsed() {
      try {
        return localStorage.getItem(this.STORAGE_SIDEBAR_KEY) === 'true';
      } catch (err) {
        return false;
      }
    },

    /**
     * Persist sidebar collapsed state
     * @param {boolean} isCollapsed
     */
    saveSidebarCollapsed(isCollapsed) {
      try {
        localStorage.setItem(this.STORAGE_SIDEBAR_KEY, isCollapsed ? 'true' : 'false');
      } catch (err) {
        console.error('StorageService: Failed to persist sidebar state', err);
      }
    }
  };

  // ==========================================================================
  // 2. State Management Layer
  // ==========================================================================
  const StateManager = {
    tasks: [],
    users: [],
    listeners: [],

    /**
     * Initialize state with storage data
     */
    init() {
      this.users = StorageService.loadUsers();
      this.tasks = StorageService.loadTasks();

      // Clean up any tasks pointing to non-existent user IDs
      const validUserIds = new Set(this.users.map((u) => u.id));
      let modified = false;
      this.tasks.forEach((t) => {
        if (t.assigneeId && !validUserIds.has(t.assigneeId)) {
          t.assigneeId = null;
          modified = true;
        }
      });
      if (modified) {
        StorageService.saveTasks(this.tasks);
      }
    },

    /**
     * Subscribe a callback to state changes
     * Callback receives (tasks, users)
     * @param {Function} listener
     */
    subscribe(listener) {
      if (typeof listener === 'function') {
        this.listeners.push(listener);
      }
    },

    /**
     * Notify all subscribers with updated state and persist
     */
    notify() {
      StorageService.saveTasks(this.tasks);
      StorageService.saveUsers(this.users);
      const tasksSnapshot = this.getTasks();
      const usersSnapshot = this.getUsers();
      this.listeners.forEach((fn) => fn(tasksSnapshot, usersSnapshot));
    },

    // --- Task Methods ---
    getTasks() {
      return [...this.tasks];
    },

    getTaskById(id) {
      return this.tasks.find((task) => task.id === id) || null;
    },

    addTask({ title, description, status, assigneeId }) {
      const newTask = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
        title: title.trim(),
        description: (description || '').trim(),
        status: status || 'todo',
        assigneeId: assigneeId || null,
        createdAt: Date.now()
      };

      this.tasks.push(newTask);
      this.notify();
      return newTask;
    },

    updateTask(id, { title, description, status, assigneeId }) {
      const index = this.tasks.findIndex((t) => t.id === id);
      if (index === -1) return false;

      this.tasks[index] = {
        ...this.tasks[index],
        title: title.trim(),
        description: (description || '').trim(),
        status: status || this.tasks[index].status,
        assigneeId: assigneeId !== undefined ? (assigneeId || null) : this.tasks[index].assigneeId
      };

      this.notify();
      return true;
    },

    deleteTask(id) {
      const initialLength = this.tasks.length;
      this.tasks = this.tasks.filter((t) => t.id !== id);
      if (this.tasks.length !== initialLength) {
        this.notify();
        return true;
      }
      return false;
    },

    moveTask(taskId, targetStatus, targetIndex = null) {
      const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) return;

      const [task] = this.tasks.splice(taskIndex, 1);
      task.status = targetStatus;

      const sameStatusTasks = this.tasks.filter((t) => t.status === targetStatus);
      const otherStatusTasks = this.tasks.filter((t) => t.status !== targetStatus);

      if (targetIndex === null || targetIndex < 0 || targetIndex >= sameStatusTasks.length) {
        sameStatusTasks.push(task);
      } else {
        sameStatusTasks.splice(targetIndex, 0, task);
      }

      this.tasks = [...otherStatusTasks, ...sameStatusTasks];
      this.notify();
    },

    // --- User Methods ---
    getUsers() {
      return [...this.users];
    },

    getUserById(id) {
      if (!id) return null;
      return this.users.find((user) => user.id === id) || null;
    },

    addUser({ name, stack }) {
      const newUser = {
        id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
        name: name.trim(),
        stack: stack.trim(),
        createdAt: Date.now()
      };

      this.users.push(newUser);
      this.notify();
      return newUser;
    },

    updateUser(id, { name, stack }) {
      const index = this.users.findIndex((u) => u.id === id);
      if (index === -1) return false;

      this.users[index] = {
        ...this.users[index],
        name: name.trim(),
        stack: stack.trim()
      };

      this.notify();
      return true;
    },

    deleteUser(id) {
      const initialLength = this.users.length;
      this.users = this.users.filter((u) => u.id !== id);
      if (this.users.length === initialLength) return false;

      // Automatically unassign tasks assigned to this user
      this.tasks.forEach((task) => {
        if (task.assigneeId === id) {
          task.assigneeId = null;
        }
      });

      this.notify();
      return true;
    },

    /**
     * Get the number of tasks assigned to a specific user
     * @param {string} userId
     * @returns {number}
     */
    getTasksCountByUser(userId) {
      return this.tasks.filter((task) => task.assigneeId === userId).length;
    }
  };

  // ==========================================================================
  // 3. DOM Manipulation & Rendering Layer
  // ==========================================================================
  const DOMRenderer = {
    columns: {
      todo: document.getElementById('list-todo'),
      inprogress: document.getElementById('list-inprogress'),
      done: document.getElementById('list-done')
    },
    counts: {
      todo: document.getElementById('count-todo'),
      inprogress: document.getElementById('count-inprogress'),
      done: document.getElementById('count-done')
    },
    usersGrid: document.getElementById('users-grid'),
    usersBadgeCount: document.getElementById('users-badge-count'),
    navTaskCount: document.getElementById('nav-task-count'),
    navUserCount: document.getElementById('nav-user-count'),

    dateFormatter: new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),

    /**
     * Escape HTML characters to protect against XSS
     * @param {string} str
     * @returns {string}
     */
    escapeHTML(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    /**
     * Generate 1-2 letter initials from a person's name
     * @param {string} name
     * @returns {string}
     */
    getInitials(name) {
      if (!name) return '?';
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
      }
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    },

    /**
     * Generate deterministic, vibrant avatar background color from string
     * @param {string} str
     * @returns {string}
     */
    getAvatarColor(str) {
      const palette = [
        '#4f46e5', // Indigo
        '#0284c7', // Sky
        '#0d9488', // Teal
        '#10b981', // Emerald
        '#d97706', // Amber
        '#ea580c', // Orange
        '#e11d48', // Rose
        '#9333ea', // Purple
        '#2563eb', // Blue
        '#db2777'  // Pink
      ];
      if (!str) return palette[0];
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return palette[Math.abs(hash) % palette.length];
    },

    /**
     * Render the whole application UI (Tasks Board, Users Grid, Counters)
     * @param {Array<Object>} tasks
     * @param {Array<Object>} users
     */
    render(tasks, users) {
      this.renderTasks(tasks);
      this.renderUsers(users, tasks);
      this.updateBadges(tasks, users);
    },

    /**
     * Render the Kanban tasks board columns
     * @param {Array<Object>} tasks
     */
    renderTasks(tasks) {
      const grouped = {
        todo: [],
        inprogress: [],
        done: []
      };

      tasks.forEach((task) => {
        if (grouped[task.status]) {
          grouped[task.status].push(task);
        }
      });

      Object.keys(this.columns).forEach((status) => {
        const columnEl = this.columns[status];
        if (!columnEl) return;
        const statusTasks = grouped[status];

        // Update column badge
        if (this.counts[status]) {
          this.counts[status].textContent = statusTasks.length;
        }

        // Clear existing cards
        columnEl.innerHTML = '';

        if (statusTasks.length === 0) {
          columnEl.appendChild(this.createEmptyState());
        } else {
          statusTasks.forEach((task) => {
            const cardEl = this.createTaskCard(task);
            columnEl.appendChild(cardEl);
          });
        }
      });
    },

    /**
     * Build empty state placeholder for a column
     * @returns {HTMLElement}
     */
    createEmptyState() {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      emptyDiv.innerHTML = `
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="9" x2="15" y2="15"></line>
          <line x1="15" y1="9" x2="9" y2="15"></line>
        </svg>
        <span class="empty-text">No tasks yet</span>
        <span class="empty-subtext">Drop a task or create one</span>
      `;
      return emptyDiv;
    },

    /**
     * Build an interactive task card element
     * @param {Object} task
     * @returns {HTMLElement}
     */
    createTaskCard(task) {
      const card = document.createElement('article');
      card.className = 'task-card';
      card.setAttribute('draggable', 'true');
      card.setAttribute('data-id', task.id);
      card.setAttribute('role', 'listitem');
      card.setAttribute('aria-grabbed', 'false');

      const formattedDate = this.dateFormatter.format(new Date(task.createdAt || Date.now()));
      const escapedTitle = this.escapeHTML(task.title);
      const escapedDesc = this.escapeHTML(task.description);

      // Render Assignee Pill if assigned
      let assigneeHtml = '';
      if (task.assigneeId) {
        const user = StateManager.getUserById(task.assigneeId);
        if (user) {
          const avatarColor = this.getAvatarColor(user.name);
          const initials = this.getInitials(user.name);
          const escapedName = this.escapeHTML(user.name);
          const escapedStack = this.escapeHTML(user.stack);
          assigneeHtml = `
            <div class="card-assignee" title="Assigned to ${escapedName} (${escapedStack})">
              <span class="assignee-avatar" style="background-color: ${avatarColor};">${initials}</span>
              <span class="assignee-name">${escapedName}</span>
            </div>
          `;
        }
      }

      card.innerHTML = `
        <h4 class="card-title">${escapedTitle}</h4>
        ${escapedDesc ? `<p class="card-desc">${escapedDesc}</p>` : ''}
        ${assigneeHtml}
        <footer class="card-footer">
          <div class="card-date" title="Created on ${formattedDate}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>${formattedDate}</span>
          </div>
          <div class="card-actions">
            <button type="button" class="card-action-btn btn-edit-card" aria-label="Edit task: ${escapedTitle}" title="Edit task">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button type="button" class="card-action-btn btn-delete-card" aria-label="Delete task: ${escapedTitle}" title="Delete task">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        </footer>
      `;

      return card;
    },

    /**
     * Render the Users Page Grid
     * @param {Array<Object>} users
     * @param {Array<Object>} tasks
     */
    renderUsers(users, tasks) {
      if (!this.usersGrid) return;
      this.usersGrid.innerHTML = '';

      if (this.usersBadgeCount) {
        this.usersBadgeCount.textContent = users.length;
      }

      if (users.length === 0) {
        this.usersGrid.appendChild(this.createUsersEmptyState());
        return;
      }

      users.forEach((user) => {
        const taskCount = StateManager.getTasksCountByUser(user.id);
        const userCard = this.createUserCard(user, taskCount);
        this.usersGrid.appendChild(userCard);
      });
    },

    /**
     * Build an empty state placeholder for the Users page
     * @returns {HTMLElement}
     */
    createUsersEmptyState() {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'users-empty';
      emptyDiv.innerHTML = `
        <svg class="users-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        <h3 class="users-empty-title">No users yet</h3>
        <p class="users-empty-text">Add your team members to assign them tasks across the board.</p>
        <button id="btn-empty-add-user" class="btn btn-primary" type="button">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Add User</span>
        </button>
      `;
      return emptyDiv;
    },

    /**
     * Build a User card element
     * @param {Object} user
     * @param {number} taskCount
     * @returns {HTMLElement}
     */
    createUserCard(user, taskCount) {
      const card = document.createElement('article');
      card.className = 'user-card';
      card.setAttribute('data-id', user.id);
      card.setAttribute('role', 'listitem');

      const avatarColor = this.getAvatarColor(user.name);
      const initials = this.getInitials(user.name);
      const escapedName = this.escapeHTML(user.name);
      const escapedStack = this.escapeHTML(user.stack);

      card.innerHTML = `
        <div class="user-card-top">
          <div class="user-profile-group">
            <div class="user-avatar-lg" style="background-color: ${avatarColor};" aria-hidden="true">
              ${initials}
            </div>
            <div class="user-info">
              <h3 class="user-name">${escapedName}</h3>
              <span class="user-stack-tag">${escapedStack}</span>
            </div>
          </div>
          <div class="user-actions">
            <button type="button" class="card-action-btn btn-edit-user" data-id="${user.id}" aria-label="Edit user: ${escapedName}" title="Edit user">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button type="button" class="card-action-btn btn-delete-user" data-id="${user.id}" aria-label="Delete user: ${escapedName}" title="Delete user">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        </div>
        <div class="user-card-bottom">
          <div class="user-tasks-count">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <line x1="15" y1="3" x2="15" y2="21"></line>
            </svg>
            <span>${taskCount} ${taskCount === 1 ? 'task assigned' : 'tasks assigned'}</span>
          </div>
        </div>
      `;

      return card;
    },

    /**
     * Update the sidebar navigation count badges
     * @param {Array<Object>} tasks
     * @param {Array<Object>} users
     */
    updateBadges(tasks, users) {
      if (this.navTaskCount) {
        this.navTaskCount.textContent = tasks.length;
      }
      if (this.navUserCount) {
        this.navUserCount.textContent = users.length;
      }
    }
  };

  // ==========================================================================
  // 4. Navigation Controller (Tasks Page <-> Users Page)
  // ==========================================================================
  const NavigationController = {
    navTasks: document.getElementById('nav-tasks'),
    navUsers: document.getElementById('nav-users'),
    pageTasks: document.getElementById('page-tasks'),
    pageUsers: document.getElementById('page-users'),
    btnAddTask: document.getElementById('btn-add-task'),
    btnAddUserHeader: document.getElementById('btn-add-user-header'),

    activePage: 'tasks',

    init() {
      this.bindEvents();

      // Check URL hash on initial load
      const initialHash = window.location.hash.replace('#', '');
      if (initialHash === 'users') {
        this.navigateTo('users', false);
      } else {
        this.navigateTo('tasks', false);
      }
    },

    bindEvents() {
      if (this.navTasks) {
        this.navTasks.addEventListener('click', () => this.navigateTo('tasks'));
      }
      if (this.navUsers) {
        this.navUsers.addEventListener('click', () => this.navigateTo('users'));
      }

      // Handle browser back/forward buttons
      window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '');
        if (hash === 'users' && this.activePage !== 'users') {
          this.navigateTo('users', false);
        } else if ((hash === 'tasks' || !hash) && this.activePage !== 'tasks') {
          this.navigateTo('tasks', false);
        }
      });
    },

    /**
     * Switch visible application page
     * @param {'tasks'|'users'} page
     * @param {boolean} updateHash
     */
    navigateTo(page, updateHash = true) {
      this.activePage = page;

      if (page === 'tasks') {
        // Show Tasks page
        this.pageTasks.classList.remove('hidden-page');
        this.pageTasks.classList.add('active-page');
        this.pageUsers.classList.add('hidden-page');
        this.pageUsers.classList.remove('active-page');

        // Update nav items
        this.navTasks.classList.add('active');
        this.navUsers.classList.remove('active');

        // Header actions
        this.btnAddTask.classList.remove('hidden');
        if (this.btnAddUserHeader) {
          this.btnAddUserHeader.classList.add('hidden');
        }

        if (updateHash) {
          window.location.hash = 'tasks';
        }
      } else if (page === 'users') {
        // Show Users page
        this.pageUsers.classList.remove('hidden-page');
        this.pageUsers.classList.add('active-page');
        this.pageTasks.classList.add('hidden-page');
        this.pageTasks.classList.remove('active-page');

        // Update nav items
        this.navUsers.classList.add('active');
        this.navTasks.classList.remove('active');

        // Header actions
        this.btnAddTask.classList.add('hidden');
        if (this.btnAddUserHeader) {
          this.btnAddUserHeader.classList.remove('hidden');
        }

        if (updateHash) {
          window.location.hash = 'users';
        }
      }

      // Close mobile drawer on navigation
      SidebarController.closeMobile();
    }
  };

  // ==========================================================================
  // 5. Collapsible Sidebar Controller
  // ==========================================================================
  const SidebarController = {
    sidebar: document.getElementById('app-sidebar'),
    btnCollapse: document.getElementById('btn-sidebar-collapse'),
    btnToggleMobile: document.getElementById('btn-sidebar-toggle'),
    backdrop: document.getElementById('sidebar-backdrop'),

    init() {
      // Restore desktop collapsed state from localStorage
      const isCollapsed = StorageService.loadSidebarCollapsed();
      if (isCollapsed && this.sidebar) {
        this.sidebar.classList.add('collapsed');
        this.updateCollapseBtnState(true);
      }

      this.bindEvents();
    },

    bindEvents() {
      // Desktop collapse / expand toggle
      if (this.btnCollapse) {
        this.btnCollapse.addEventListener('click', () => {
          this.toggleCollapse();
        });
      }

      // Mobile drawer open / close toggle
      if (this.btnToggleMobile) {
        this.btnToggleMobile.addEventListener('click', () => {
          this.toggleMobile();
        });
      }

      // Backdrop click closes mobile drawer
      if (this.backdrop) {
        this.backdrop.addEventListener('click', () => {
          this.closeMobile();
        });
      }
    },

    toggleCollapse() {
      if (!this.sidebar) return;
      const isCurrentlyCollapsed = this.sidebar.classList.toggle('collapsed');
      StorageService.saveSidebarCollapsed(isCurrentlyCollapsed);
      this.updateCollapseBtnState(isCurrentlyCollapsed);
    },

    updateCollapseBtnState(isCollapsed) {
      if (!this.btnCollapse) return;
      const title = isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
      this.btnCollapse.setAttribute('title', title);
      this.btnCollapse.setAttribute('aria-label', title);
      this.btnCollapse.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    },

    toggleMobile() {
      if (!this.sidebar) return;
      const isOpen = this.sidebar.classList.toggle('mobile-open');
      if (this.backdrop) {
        this.backdrop.classList.toggle('active', isOpen);
      }
    },

    closeMobile() {
      if (this.sidebar) {
        this.sidebar.classList.remove('mobile-open');
      }
      if (this.backdrop) {
        this.backdrop.classList.remove('active');
      }
    }
  };

  // ==========================================================================
  // 6. Drag & Drop Controller (Native HTML5 Drag and Drop API)
  // ==========================================================================
  const DragDropController = {
    draggedElement: null,
    draggedTaskId: null,
    placeholder: null,

    init() {
      this.placeholder = document.createElement('div');
      this.placeholder.className = 'drag-placeholder';
      this.bindEvents();
    },

    bindEvents() {
      const boardContainer = document.querySelector('.board-container');
      if (!boardContainer) return;

      // Card Drag Start
      boardContainer.addEventListener('dragstart', (e) => {
        const card = e.target.closest('.task-card');
        if (!card) return;

        this.draggedElement = card;
        this.draggedTaskId = card.getAttribute('data-id');

        card.classList.add('is-dragging');
        card.setAttribute('aria-grabbed', 'true');

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.draggedTaskId);

        setTimeout(() => {
          if (this.draggedElement) {
            this.draggedElement.style.display = 'none';
          }
        }, 0);
      });

      // Card Drag End
      boardContainer.addEventListener('dragend', () => {
        if (this.draggedElement) {
          this.draggedElement.classList.remove('is-dragging');
          this.draggedElement.setAttribute('aria-grabbed', 'false');
          this.draggedElement.style.display = '';
        }

        if (this.placeholder && this.placeholder.parentNode) {
          this.placeholder.parentNode.removeChild(this.placeholder);
        }

        document.querySelectorAll('.task-list').forEach((col) => {
          col.classList.remove('drag-over');
        });

        this.draggedElement = null;
        this.draggedTaskId = null;
      });

      // Drop Zones
      const taskLists = document.querySelectorAll('.task-list');

      taskLists.forEach((list) => {
        list.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';

          if (!this.draggedTaskId) return;

          list.classList.add('drag-over');

          const emptyState = list.querySelector('.empty-state');
          if (emptyState) {
            emptyState.style.display = 'none';
          }

          const afterElement = this.getDragAfterElement(list, e.clientY);
          if (afterElement == null) {
            list.appendChild(this.placeholder);
          } else {
            list.insertBefore(this.placeholder, afterElement);
          }
        });

        list.addEventListener('dragleave', (e) => {
          if (!list.contains(e.relatedTarget)) {
            list.classList.remove('drag-over');
            if (this.placeholder && this.placeholder.parentNode === list) {
              list.removeChild(this.placeholder);
            }
            const emptyState = list.querySelector('.empty-state');
            if (emptyState && list.querySelectorAll('.task-card').length === 0) {
              emptyState.style.display = '';
            }
          }
        });

        list.addEventListener('drop', (e) => {
          e.preventDefault();
          list.classList.remove('drag-over');

          const taskId = e.dataTransfer.getData('text/plain') || this.draggedTaskId;
          if (!taskId) return;

          const targetStatus = list.getAttribute('data-status');

          const children = Array.from(list.children);
          const placeholderIndex = children.indexOf(this.placeholder);

          let targetIndex = 0;
          if (placeholderIndex !== -1) {
            targetIndex = children.slice(0, placeholderIndex).filter((el) => el.classList.contains('task-card')).length;
          }

          StateManager.moveTask(taskId, targetStatus, targetIndex);
        });
      });
    },

    getDragAfterElement(container, y) {
      const draggableElements = [
        ...container.querySelectorAll('.task-card:not(.is-dragging)')
      ];

      return draggableElements.reduce(
        (closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = y - box.top - box.height / 2;

          if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
          } else {
            return closest;
          }
        },
        { offset: Number.NEGATIVE_INFINITY, element: null }
      ).element;
    }
  };

  // ==========================================================================
  // 7. Modal Controller (Tasks CRUD & Users CRUD)
  // ==========================================================================
  const ModalController = {
    // Task Modal elements
    taskModal: document.getElementById('task-modal'),
    deleteTaskModal: document.getElementById('delete-modal'),
    taskForm: document.getElementById('task-form'),
    taskIdInput: document.getElementById('task-id'),
    taskTitleInput: document.getElementById('task-title'),
    taskDescInput: document.getElementById('task-desc'),
    taskStatusSelect: document.getElementById('task-status'),
    taskAssigneeSelect: document.getElementById('task-assignee'),
    taskTitleError: document.getElementById('title-error'),
    taskModalTitle: document.getElementById('modal-title'),
    deleteTaskPreview: document.getElementById('delete-task-preview'),

    // User Modal elements
    userModal: document.getElementById('user-modal'),
    deleteUserModal: document.getElementById('delete-user-modal'),
    userForm: document.getElementById('user-form'),
    userIdInput: document.getElementById('user-id'),
    userNameInput: document.getElementById('user-name'),
    userStackInput: document.getElementById('user-stack'),
    userNameError: document.getElementById('user-name-error'),
    userStackError: document.getElementById('user-stack-error'),
    userModalTitle: document.getElementById('user-modal-title'),
    deleteUserPreview: document.getElementById('delete-user-preview'),

    pendingDeleteTaskId: null,
    pendingDeleteUserId: null,

    init() {
      this.bindEvents();
    },

    bindEvents() {
      // --- Task Modal Triggers & Actions ---
      const btnAddTask = document.getElementById('btn-add-task');
      if (btnAddTask) {
        btnAddTask.addEventListener('click', () => this.openCreateTaskModal());
      }

      document.getElementById('modal-close-btn').addEventListener('click', () => this.closeTaskModal());
      document.getElementById('modal-cancel-btn').addEventListener('click', () => this.closeTaskModal());

      // Task delete modal buttons
      document.getElementById('delete-close-btn').addEventListener('click', () => this.closeDeleteTaskModal());
      document.getElementById('delete-cancel-btn').addEventListener('click', () => this.closeDeleteTaskModal());
      document.getElementById('delete-confirm-btn').addEventListener('click', () => {
        if (this.pendingDeleteTaskId) {
          StateManager.deleteTask(this.pendingDeleteTaskId);
          this.closeDeleteTaskModal();
        }
      });

      // Task form submission
      this.taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleTaskFormSubmit();
      });

      this.taskTitleInput.addEventListener('input', () => {
        if (this.taskTitleInput.value.trim().length > 0) {
          this.taskTitleInput.classList.remove('input-error');
          this.taskTitleError.classList.remove('visible');
        }
      });

      // --- User Modal Triggers & Actions ---
      const btnAddUser = document.getElementById('btn-add-user');
      if (btnAddUser) {
        btnAddUser.addEventListener('click', () => this.openCreateUserModal());
      }

      const btnAddUserHeader = document.getElementById('btn-add-user-header');
      if (btnAddUserHeader) {
        btnAddUserHeader.addEventListener('click', () => this.openCreateUserModal());
      }

      document.getElementById('user-modal-close-btn').addEventListener('click', () => this.closeUserModal());
      document.getElementById('user-modal-cancel-btn').addEventListener('click', () => this.closeUserModal());

      // User delete modal buttons
      document.getElementById('delete-user-close-btn').addEventListener('click', () => this.closeDeleteUserModal());
      document.getElementById('delete-user-cancel-btn').addEventListener('click', () => this.closeDeleteUserModal());
      document.getElementById('delete-user-confirm-btn').addEventListener('click', () => {
        if (this.pendingDeleteUserId) {
          StateManager.deleteUser(this.pendingDeleteUserId);
          this.closeDeleteUserModal();
        }
      });

      // User form submission
      this.userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleUserFormSubmit();
      });

      this.userNameInput.addEventListener('input', () => {
        if (this.userNameInput.value.trim().length > 0) {
          this.userNameInput.classList.remove('input-error');
          this.userNameError.classList.remove('visible');
        }
      });

      this.userStackInput.addEventListener('input', () => {
        if (this.userStackInput.value.trim().length > 0) {
          this.userStackInput.classList.remove('input-error');
          this.userStackError.classList.remove('visible');
        }
      });

      // --- Global Modal Backdrop and Escape Key ---
      [this.taskModal, this.deleteTaskModal, this.userModal, this.deleteUserModal].forEach((overlay) => {
        if (overlay) {
          overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
              this.closeAllModals();
            }
          });
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeAllModals();
          SidebarController.closeMobile();
        }
      });
    },

    /**
     * Populate the Task Assignee dropdown with all existing users
     * @param {string|null} selectedUserId
     */
    populateAssigneeSelect(selectedUserId = null) {
      if (!this.taskAssigneeSelect) return;
      this.taskAssigneeSelect.innerHTML = '<option value="">Unassigned</option>';

      const users = StateManager.getUsers();
      users.forEach((user) => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = `${user.name} (${user.stack})`;
        if (selectedUserId && user.id === selectedUserId) {
          option.selected = true;
        }
        this.taskAssigneeSelect.appendChild(option);
      });

      if (!selectedUserId) {
        this.taskAssigneeSelect.value = '';
      }
    },

    // --- Task Modal Operations ---
    openCreateTaskModal(defaultStatus = 'todo') {
      this.taskForm.reset();
      this.taskIdInput.value = '';
      this.taskStatusSelect.value = defaultStatus;
      this.populateAssigneeSelect(null);
      this.taskModalTitle.textContent = 'Create New Task';
      this.clearTaskErrors();
      this.taskModal.classList.remove('hidden');
      setTimeout(() => this.taskTitleInput.focus(), 50);
    },

    openEditTaskModal(task) {
      if (!task) return;
      this.clearTaskErrors();
      this.taskIdInput.value = task.id;
      this.taskTitleInput.value = task.title;
      this.taskDescInput.value = task.description || '';
      this.taskStatusSelect.value = task.status;
      this.populateAssigneeSelect(task.assigneeId || null);
      this.taskModalTitle.textContent = 'Edit Task';
      this.taskModal.classList.remove('hidden');
      setTimeout(() => this.taskTitleInput.focus(), 50);
    },

    openDeleteTaskConfirmation(task) {
      if (!task) return;
      this.pendingDeleteTaskId = task.id;
      this.deleteTaskPreview.textContent = `"${task.title}"`;
      this.deleteTaskModal.classList.remove('hidden');
    },

    closeTaskModal() {
      this.taskModal.classList.add('hidden');
      this.clearTaskErrors();
    },

    closeDeleteTaskModal() {
      this.deleteTaskModal.classList.add('hidden');
      this.pendingDeleteTaskId = null;
    },

    clearTaskErrors() {
      this.taskTitleInput.classList.remove('input-error');
      this.taskTitleError.classList.remove('visible');
    },

    handleTaskFormSubmit() {
      const title = this.taskTitleInput.value.trim();
      const description = this.taskDescInput.value.trim();
      const status = this.taskStatusSelect.value;
      const assigneeId = this.taskAssigneeSelect.value || null;
      const taskId = this.taskIdInput.value;

      if (!title) {
        this.taskTitleInput.classList.add('input-error');
        this.taskTitleError.classList.add('visible');
        this.taskTitleInput.focus();
        return;
      }

      if (taskId) {
        StateManager.updateTask(taskId, { title, description, status, assigneeId });
      } else {
        StateManager.addTask({ title, description, status, assigneeId });
      }

      this.closeTaskModal();
    },

    // --- User Modal Operations ---
    openCreateUserModal() {
      this.userForm.reset();
      this.userIdInput.value = '';
      this.userModalTitle.textContent = 'Add User';
      this.clearUserErrors();
      this.userModal.classList.remove('hidden');
      setTimeout(() => this.userNameInput.focus(), 50);
    },

    openEditUserModal(user) {
      if (!user) return;
      this.clearUserErrors();
      this.userIdInput.value = user.id;
      this.userNameInput.value = user.name;
      this.userStackInput.value = user.stack;
      this.userModalTitle.textContent = 'Edit User';
      this.userModal.classList.remove('hidden');
      setTimeout(() => this.userNameInput.focus(), 50);
    },

    openDeleteUserConfirmation(user) {
      if (!user) return;
      this.pendingDeleteUserId = user.id;
      this.deleteUserPreview.textContent = `${user.name} — ${user.stack}`;
      this.deleteUserModal.classList.remove('hidden');
    },

    closeUserModal() {
      this.userModal.classList.add('hidden');
      this.clearUserErrors();
    },

    closeDeleteUserModal() {
      this.deleteUserModal.classList.add('hidden');
      this.pendingDeleteUserId = null;
    },

    clearUserErrors() {
      this.userNameInput.classList.remove('input-error');
      this.userNameError.classList.remove('visible');
      this.userStackInput.classList.remove('input-error');
      this.userStackError.classList.remove('visible');
    },

    handleUserFormSubmit() {
      const name = this.userNameInput.value.trim();
      const stack = this.userStackInput.value.trim();
      const userId = this.userIdInput.value;

      let hasError = false;

      if (!name) {
        this.userNameInput.classList.add('input-error');
        this.userNameError.classList.add('visible');
        hasError = true;
      }

      if (!stack) {
        this.userStackInput.classList.add('input-error');
        this.userStackError.classList.add('visible');
        hasError = true;
      }

      if (hasError) {
        if (!name) this.userNameInput.focus();
        else this.userStackInput.focus();
        return;
      }

      if (userId) {
        StateManager.updateUser(userId, { name, stack });
      } else {
        StateManager.addUser({ name, stack });
      }

      this.closeUserModal();
    },

    closeAllModals() {
      this.closeTaskModal();
      this.closeDeleteTaskModal();
      this.closeUserModal();
      this.closeDeleteUserModal();
    }
  };

  // ==========================================================================
  // 8. Theme Manager (Dark / Light mode persistence)
  // ==========================================================================
  const ThemeManager = {
    STORAGE_KEY: 'kanban_theme_preference',
    themeToggleBtn: document.getElementById('btn-theme-toggle'),

    init() {
      const savedTheme = localStorage.getItem(this.STORAGE_KEY);
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

      this.applyTheme(initialTheme);
      this.bindEvents();
    },

    bindEvents() {
      if (this.themeToggleBtn) {
        this.themeToggleBtn.addEventListener('click', () => {
          const currentTheme = document.documentElement.getAttribute('data-theme') || 
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
          const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
          this.setTheme(nextTheme);
        });
      }

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(this.STORAGE_KEY)) {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    },

    setTheme(theme) {
      try {
        localStorage.setItem(this.STORAGE_KEY, theme);
      } catch (err) {
        console.error('ThemeManager: Failed to save theme preference', err);
      }
      this.applyTheme(theme);
    },

    applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      if (this.themeToggleBtn) {
        const isDark = theme === 'dark';
        const labelText = isDark ? 'Switch to light mode' : 'Switch to dark mode';
        this.themeToggleBtn.setAttribute('aria-label', labelText);
        this.themeToggleBtn.setAttribute('title', labelText);
      }
    }
  };

  // ==========================================================================
  // 9. Application Controller & Initialization
  // ==========================================================================
  const App = {
    init() {
      // 1. Initialize Theme, State and Local Storage
      ThemeManager.init();
      StateManager.init();

      // 2. Subscribe DOM Renderer to State changes
      StateManager.subscribe((tasks, users) => {
        DOMRenderer.render(tasks, users);
      });

      // 3. Initialize Controllers
      NavigationController.init();
      SidebarController.init();
      DragDropController.init();
      ModalController.init();

      // 4. Delegate Card & Grid Actions
      this.bindActionDelegations();

      // 5. Initial Render
      DOMRenderer.render(StateManager.getTasks(), StateManager.getUsers());
    },

    bindActionDelegations() {
      // Task Card Actions (Edit, Delete)
      const boardContainer = document.querySelector('.board-container');
      if (boardContainer) {
        boardContainer.addEventListener('click', (e) => {
          // Edit task button
          const editBtn = e.target.closest('.btn-edit-card');
          if (editBtn) {
            const card = editBtn.closest('.task-card');
            const taskId = card.getAttribute('data-id');
            const task = StateManager.getTaskById(taskId);
            if (task) {
              ModalController.openEditTaskModal(task);
            }
            return;
          }

          // Delete task button
          const deleteBtn = e.target.closest('.btn-delete-card');
          if (deleteBtn) {
            const card = deleteBtn.closest('.task-card');
            const taskId = card.getAttribute('data-id');
            const task = StateManager.getTaskById(taskId);
            if (task) {
              ModalController.openDeleteTaskConfirmation(task);
            }
            return;
          }
        });
      }

      // Users Grid Actions (Edit user, Delete user, Empty state Add button)
      const usersGrid = document.getElementById('users-grid');
      if (usersGrid) {
        usersGrid.addEventListener('click', (e) => {
          // Edit user button
          const editUserBtn = e.target.closest('.btn-edit-user');
          if (editUserBtn) {
            const userId = editUserBtn.getAttribute('data-id');
            const user = StateManager.getUserById(userId);
            if (user) {
              ModalController.openEditUserModal(user);
            }
            return;
          }

          // Delete user button
          const deleteUserBtn = e.target.closest('.btn-delete-user');
          if (deleteUserBtn) {
            const userId = deleteUserBtn.getAttribute('data-id');
            const user = StateManager.getUserById(userId);
            if (user) {
              ModalController.openDeleteUserConfirmation(user);
            }
            return;
          }

          // Empty state "Add User" button
          const emptyAddBtn = e.target.closest('#btn-empty-add-user');
          if (emptyAddBtn) {
            ModalController.openCreateUserModal();
            return;
          }
        });
      }
    }
  };

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }
})();
