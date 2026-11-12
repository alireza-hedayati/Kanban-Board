/**
 * Kanban Task Manager
 * Clean Architecture with Vanilla JavaScript
 * Modules: StorageService, StateManager, DOMRenderer, DragDropController, ModalController, ThemeManager, App
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. Storage Layer (localStorage wrapper)
  // ==========================================================================
  const StorageService = {
    STORAGE_KEY: 'kanban_board_tasks_v1',

    // Initial seed tasks shown only on very first launch
    DEFAULT_TASKS: [
      {
        id: 'task-1',
        title: 'Conduct user research and persona mapping',
        description: 'Interview 5 active project managers to uncover pain points in current workflow tools.',
        status: 'todo',
        createdAt: Date.now() - 86400000 * 3
      },
      {
        id: 'task-2',
        title: 'Design high-fidelity design system tokens',
        description: 'Define semantic color variables, responsive typography scale, and card elevation hierarchy.',
        status: 'todo',
        createdAt: Date.now() - 86400000 * 2
      },
      {
        id: 'task-3',
        title: 'Implement native HTML5 drag-and-drop system',
        description: 'Wire up dragstart, dragover placeholder positioning, and state-driven drop reordering.',
        status: 'inprogress',
        createdAt: Date.now() - 86400000 * 1
      },
      {
        id: 'task-4',
        title: 'Initialize repository and architecture plan',
        description: 'Structured decoupled layers for DOM, State, and Storage without third-party frameworks.',
        status: 'done',
        createdAt: Date.now() - 86400000 * 4
      }
    ],

    /**
     * Load tasks from localStorage or return default sample tasks
     * @returns {Array<Object>}
     */
    loadTasks() {
      try {
        const serialized = localStorage.getItem(this.STORAGE_KEY);
        if (!serialized) {
          this.saveTasks(this.DEFAULT_TASKS);
          return [...this.DEFAULT_TASKS];
        }
        const parsed = JSON.parse(serialized);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.error('StorageService: Failed to read from localStorage', err);
        return [];
      }
    },

    /**
     * Persist tasks to localStorage
     * @param {Array<Object>} tasks
     */
    saveTasks(tasks) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
      } catch (err) {
        console.error('StorageService: Failed to persist to localStorage', err);
      }
    }
  };

  // ==========================================================================
  // 2. State Management Layer
  // ==========================================================================
  const StateManager = {
    tasks: [],
    listeners: [],

    /**
     * Initialize state with storage data
     */
    init() {
      this.tasks = StorageService.loadTasks();
    },

    /**
     * Subscribe a callback to state changes
     * @param {Function} listener
     */
    subscribe(listener) {
      if (typeof listener === 'function') {
        this.listeners.push(listener);
      }
    },

    /**
     * Notify all subscribers with the updated task list
     */
    notify() {
      StorageService.saveTasks(this.tasks);
      const snapshot = this.getTasks();
      this.listeners.forEach((fn) => fn(snapshot));
    },

    /**
     * Return a shallow clone of the tasks array
     * @returns {Array<Object>}
     */
    getTasks() {
      return [...this.tasks];
    },

    /**
     * Find a single task by its id
     * @param {string} id
     * @returns {Object|null}
     */
    getTaskById(id) {
      return this.tasks.find((task) => task.id === id) || null;
    },

    /**
     * Add a new task to state
     * @param {Object} taskData
     */
    addTask({ title, description, status }) {
      const newTask = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
        title: title.trim(),
        description: (description || '').trim(),
        status: status || 'todo',
        createdAt: Date.now()
      };

      this.tasks.push(newTask);
      this.notify();
      return newTask;
    },

    /**
     * Update an existing task
     * @param {string} id
     * @param {Object} updates
     */
    updateTask(id, { title, description, status }) {
      const index = this.tasks.findIndex((t) => t.id === id);
      if (index === -1) return false;

      this.tasks[index] = {
        ...this.tasks[index],
        title: title.trim(),
        description: (description || '').trim(),
        status: status || this.tasks[index].status
      };

      this.notify();
      return true;
    },

    /**
     * Remove a task by ID
     * @param {string} id
     */
    deleteTask(id) {
      const initialLength = this.tasks.length;
      this.tasks = this.tasks.filter((t) => t.id !== id);
      if (this.tasks.length !== initialLength) {
        this.notify();
        return true;
      }
      return false;
    },

    /**
     * Move and reorder task across/within columns
     * @param {string} taskId
     * @param {string} targetStatus
     * @param {number} targetIndex - index within the target status column
     */
    moveTask(taskId, targetStatus, targetIndex = null) {
      const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) return;

      const [task] = this.tasks.splice(taskIndex, 1);
      task.status = targetStatus;

      // Group tasks of target status vs other statuses
      const sameStatusTasks = this.tasks.filter((t) => t.status === targetStatus);
      const otherStatusTasks = this.tasks.filter((t) => t.status !== targetStatus);

      // Insert task at targetIndex within its status group
      if (targetIndex === null || targetIndex < 0 || targetIndex >= sameStatusTasks.length) {
        sameStatusTasks.push(task);
      } else {
        sameStatusTasks.splice(targetIndex, 0, task);
      }

      // Reassemble complete array
      this.tasks = [...otherStatusTasks, ...sameStatusTasks];
      this.notify();
    }
  };

  // ==========================================================================
  // 3. DOM Manipulation Layer
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
     * Render the entire Kanban board
     * @param {Array<Object>} tasks
     */
    render(tasks) {
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

      // Update each column
      Object.keys(this.columns).forEach((status) => {
        const columnEl = this.columns[status];
        const statusTasks = grouped[status];

        // Update count badge
        if (this.counts[status]) {
          this.counts[status].textContent = statusTasks.length;
        }

        // Clear existing column content
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

      card.innerHTML = `
        <h4 class="card-title">${escapedTitle}</h4>
        ${escapedDesc ? `<p class="card-desc">${escapedDesc}</p>` : ''}
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
    }
  };

  // ==========================================================================
  // 4. Drag & Drop Controller (Native HTML5 Drag and Drop API)
  // ==========================================================================
  const DragDropController = {
    draggedElement: null,
    draggedTaskId: null,
    placeholder: null,

    init() {
      // Create reusable drop-indicator placeholder element
      this.placeholder = document.createElement('div');
      this.placeholder.className = 'drag-placeholder';

      this.bindEvents();
    },

    bindEvents() {
      const boardContainer = document.querySelector('.board-container');

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

        // Give tiny delay before visual dimming so ghost drag image captures original card
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

      // Drop Zones: dragover, dragleave, drop
      const taskLists = document.querySelectorAll('.task-list');

      taskLists.forEach((list) => {
        list.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';

          if (!this.draggedTaskId) return;

          list.classList.add('drag-over');

          // Remove empty-state visually while hovering
          const emptyState = list.querySelector('.empty-state');
          if (emptyState) {
            emptyState.style.display = 'none';
          }

          // Calculate where to position placeholder
          const afterElement = this.getDragAfterElement(list, e.clientY);
          if (afterElement == null) {
            list.appendChild(this.placeholder);
          } else {
            list.insertBefore(this.placeholder, afterElement);
          }
        });

        list.addEventListener('dragleave', (e) => {
          // If leaving the list container itself
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

          // Determine target index based on placeholder position
          const children = Array.from(list.children);
          const placeholderIndex = children.indexOf(this.placeholder);

          let targetIndex = 0;
          if (placeholderIndex !== -1) {
            // Count task-card siblings preceding the placeholder
            targetIndex = children.slice(0, placeholderIndex).filter((el) => el.classList.contains('task-card')).length;
          }

          // Move the task via state manager
          StateManager.moveTask(taskId, targetStatus, targetIndex);
        });
      });
    },

    /**
     * Determine the nearest element after the current cursor position
     * @param {HTMLElement} container
     * @param {number} y
     * @returns {HTMLElement|null}
     */
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
  // 5. Modal Controller (Create, Edit, Delete Confirmations)
  // ==========================================================================
  const ModalController = {
    taskModal: document.getElementById('task-modal'),
    deleteModal: document.getElementById('delete-modal'),
    taskForm: document.getElementById('task-form'),
    taskIdInput: document.getElementById('task-id'),
    titleInput: document.getElementById('task-title'),
    descInput: document.getElementById('task-desc'),
    statusSelect: document.getElementById('task-status'),
    titleError: document.getElementById('title-error'),
    modalTitle: document.getElementById('modal-title'),
    deletePreview: document.getElementById('delete-task-preview'),

    pendingDeleteId: null,

    init() {
      this.bindEvents();
    },

    bindEvents() {
      // Header Add Task button
      document.getElementById('btn-add-task').addEventListener('click', () => {
        this.openCreateTaskModal();
      });

      // Task modal close buttons
      document.getElementById('modal-close-btn').addEventListener('click', () => {
        this.closeTaskModal();
      });
      document.getElementById('modal-cancel-btn').addEventListener('click', () => {
        this.closeTaskModal();
      });

      // Delete modal cancel/close buttons
      document.getElementById('delete-close-btn').addEventListener('click', () => {
        this.closeDeleteModal();
      });
      document.getElementById('delete-cancel-btn').addEventListener('click', () => {
        this.closeDeleteModal();
      });

      // Delete modal confirm button
      document.getElementById('delete-confirm-btn').addEventListener('click', () => {
        if (this.pendingDeleteId) {
          StateManager.deleteTask(this.pendingDeleteId);
          this.closeDeleteModal();
        }
      });

      // Task form submit
      this.taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleTaskFormSubmit();
      });

      // Clear title error on typing
      this.titleInput.addEventListener('input', () => {
        if (this.titleInput.value.trim().length > 0) {
          this.titleInput.classList.remove('input-error');
          this.titleError.classList.remove('visible');
        }
      });

      // Close modal on backdrop click
      [this.taskModal, this.deleteModal].forEach((overlay) => {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            this.closeAllModals();
          }
        });
      });

      // Keyboard support: Escape closes modals
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeAllModals();
        }
      });
    },

    openCreateTaskModal(defaultStatus = 'todo') {
      this.taskForm.reset();
      this.taskIdInput.value = '';
      this.statusSelect.value = defaultStatus;
      this.modalTitle.textContent = 'Create New Task';
      this.clearErrors();
      this.taskModal.classList.remove('hidden');
      setTimeout(() => this.titleInput.focus(), 50);
    },

    openEditTaskModal(task) {
      if (!task) return;
      this.clearErrors();
      this.taskIdInput.value = task.id;
      this.titleInput.value = task.title;
      this.descInput.value = task.description || '';
      this.statusSelect.value = task.status;
      this.modalTitle.textContent = 'Edit Task';
      this.taskModal.classList.remove('hidden');
      setTimeout(() => this.titleInput.focus(), 50);
    },

    openDeleteConfirmation(task) {
      if (!task) return;
      this.pendingDeleteId = task.id;
      this.deletePreview.textContent = `"${task.title}"`;
      this.deleteModal.classList.remove('hidden');
    },

    closeTaskModal() {
      this.taskModal.classList.add('hidden');
      this.clearErrors();
    },

    closeDeleteModal() {
      this.deleteModal.classList.add('hidden');
      this.pendingDeleteId = null;
    },

    closeAllModals() {
      this.closeTaskModal();
      this.closeDeleteModal();
    },

    clearErrors() {
      this.titleInput.classList.remove('input-error');
      this.titleError.classList.remove('visible');
    },

    handleTaskFormSubmit() {
      const title = this.titleInput.value.trim();
      const description = this.descInput.value.trim();
      const status = this.statusSelect.value;
      const taskId = this.taskIdInput.value;

      // Validation
      if (!title) {
        this.titleInput.classList.add('input-error');
        this.titleError.classList.add('visible');
        this.titleInput.focus();
        return;
      }

      if (taskId) {
        // Edit existing task
        StateManager.updateTask(taskId, { title, description, status });
      } else {
        // Create new task
        StateManager.addTask({ title, description, status });
      }

      this.closeTaskModal();
    }
  };

  // ==========================================================================
  // 6. Theme Manager (Dark / Light mode persistence)
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

      // Listen to OS theme changes if user hasn't set an explicit preference
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
  // 7. Application Controller & Initialization
  // ==========================================================================
  const App = {
    init() {
      // 1. Initialize Theme, State and Local Storage
      ThemeManager.init();
      StateManager.init();

      // 2. Subscribe DOM Renderer to State changes
      StateManager.subscribe((tasks) => {
        DOMRenderer.render(tasks);
      });

      // 3. Initialize Drag & Drop and Modals
      DragDropController.init();
      ModalController.init();

      // 4. Delegate Task Card Actions (Edit, Delete)
      this.bindCardActionDelegation();

      // 5. Initial Render
      DOMRenderer.render(StateManager.getTasks());
    },

    bindCardActionDelegation() {
      const boardContainer = document.querySelector('.board-container');

      boardContainer.addEventListener('click', (e) => {
        // Edit button
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

        // Delete button
        const deleteBtn = e.target.closest('.btn-delete-card');
        if (deleteBtn) {
          const card = deleteBtn.closest('.task-card');
          const taskId = card.getAttribute('data-id');
          const task = StateManager.getTaskById(taskId);
          if (task) {
            ModalController.openDeleteConfirmation(task);
          }
          return;
        }
      });
    }
  };

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }
})();