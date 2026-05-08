// ========================================
// TO-DO LIST APPLICATION - ENHANCED VERSION
// ========================================
// Features: Add, Edit, Delete, Complete, Filter, Search
// New: Priority Levels, Due Dates, Progress Bar, Dark Mode
// ========================================

// ========================================
// GLOBAL VARIABLES
// ========================================
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentFilter = 'all';
let currentTheme = localStorage.getItem('theme') || 'light';
let currentSort = localStorage.getItem('sort') || 'newest';
let currentLanguage = localStorage.getItem('language') || 'en';

const translations = {
    en: {
        appTitle: 'My Tasks',
        appSubtitle: 'Stay organized, stay productive',
        progress: 'Progress',
        inputPlaceholder: 'What needs to be done?',
        addBtn: 'Add Task',
        priorityLow: '🟢 Low',
        priorityMedium: '🟡 Medium',
        priorityHigh: '🔴 High',
        searchPlaceholder: 'Search tasks...',
        filterAll: 'All',
        filterPending: 'Pending',
        filterCompleted: 'Completed',
        sortNewest: '🕐 Newest First',
        sortOldest: '📜 Oldest First',
        sortPriority: '⚡ Priority High→Low',
        sortDueDate: '📅 Due Date',
        clearCompleted: 'Clear Completed',
        emptyState: 'No tasks yet. Add your first task above!',
        tasks: 'tasks',
        taskLeft: 'task left',
        overdue: 'Overdue',
        today: 'Today',
        tomorrow: 'Tomorrow',
        days: 'days',
        edit: 'Edit',
        delete: 'Delete',
        save: 'Save',
        cancel: 'Cancel'
    },
    id: {
        appTitle: 'Tugas Saya',
        appSubtitle: 'Tetap teratur, tetap produktif',
        progress: 'Progres',
        inputPlaceholder: 'Apa yang perlu dilakukan?',
        addBtn: 'Tambah Tugas',
        priorityLow: '🟢 Rendah',
        priorityMedium: '🟡 Sedang',
        priorityHigh: '🔴 Tinggi',
        searchPlaceholder: 'Cari tugas...',
        filterAll: 'Semua',
        filterPending: 'Tertunda',
        filterCompleted: 'Selesai',
        sortNewest: '🕐 Terbaru Dulu',
        sortOldest: '📜 Terlama Dulu',
        sortPriority: '⚡ Prioritas Tinggi→Rendah',
        sortDueDate: '📅 Tanggal Jatuh Tempo',
        clearCompleted: 'Hapus Selesai',
        emptyState: 'Belum ada tugas. Tambahkan tugas pertama Anda di atas!',
        tasks: 'tugas',
        taskLeft: 'tugas tersisa',
        overdue: 'Terlambat',
        today: 'Hari Ini',
        tomorrow: 'Besok',
        days: 'hari',
        edit: 'Edit',
        delete: 'Hapus',
        save: 'Simpan',
        cancel: 'Batal'
    }
};

function t(key) {
    return translations[currentLanguage][key] || translations['en'][key] || key;
}

// ========================================
// DOM SELECTORS
// ========================================
const todoForm = document.querySelector('#todo-form');
const todoInput = document.querySelector('#todo-input');
const todoList = document.querySelector('#todo-list');
const searchInput = document.querySelector('#search-input');
const filterButtons = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.querySelector('#clear-completed-btn');
const taskCounter = document.querySelector('#task-counter');
const emptyState = document.querySelector('#empty-state');
const themeToggle = document.querySelector('#theme-toggle');
const prioritySelect = document.querySelector('#priority-select');
const dueDateInput = document.querySelector('#due-date');
const progressFill = document.querySelector('#progress-fill');
const progressPercent = document.querySelector('#progress-percent');
const sortSelect = document.querySelector('#sort-select');
const languageSelect = document.querySelector('#language-select');

// ========================================
// INITIALIZATION
// ========================================
function init() {
    applyTheme();
    applySortOption();
    applyLanguage();
    renderTodos();
    console.log('To-Do List App initialized!');
}

// ========================================
// THEME FUNCTIONS (Dark Mode)
// ========================================

/**
 * toggleTheme()
 * Switches between light and dark mode
 */
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme();
    localStorage.setItem('theme', currentTheme);
}

/**
 * applyTheme()
 * Applies current theme to the document
 */
function applyTheme() {
    if (currentTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
    } else {
        document.body.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
    }
}

// ========================================
// LOCAL STORAGE FUNCTIONS
// ========================================
function saveTodosToStorage() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// ========================================
// TASK OBJECT CREATOR
// ========================================
function createTodoObject(title, priority, dueDate) {
    return {
        id: Date.now(),
        title: title.trim(),
        completed: false,
        priority: priority,      // 'high', 'medium', 'low'
        dueDate: dueDate || null, // ISO date string or null
        createdAt: new Date().toLocaleString()
    };
}

// ========================================
// PROGRESS BAR FUNCTIONS
// ========================================

/**
 * updateProgressBar()
 * Calculates and displays completion percentage
 */
function updateProgressBar() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;

    if (total === 0) {
        progressFill.style.width = '0%';
        progressPercent.textContent = '0%';
        return;
    }

    const percent = Math.round((completed / total) * 100);
    progressFill.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}%`;
}

// ========================================
// TASK CRUD OPERATIONS
// ========================================

function addTask(title, priority, dueDate) {
    if (typeof title !== 'string' || title.trim() === '') {
        return;
    }

    const newTask = createTodoObject(title, priority, dueDate);
    todos.unshift(newTask);

    saveTodosToStorage();
    renderTodos();
}

function deleteTask(id) {
    todos = todos.filter(todo => todo.id !== id);
    saveTodosToStorage();
    renderTodos();
}

function editTask(id, newTitle, newPriority, newDueDate) {
    const task = todos.find(todo => todo.id === id);
    if (task) {
        task.title = newTitle.trim();
        task.priority = newPriority;
        task.dueDate = newDueDate;
    }

    saveTodosToStorage();
    renderTodos();
}

function toggleComplete(id) {
    const task = todos.find(todo => todo.id === id);
    if (task) {
        task.completed = !task.completed;
    }

    saveTodosToStorage();
    renderTodos();
}

function clearCompleted() {
    todos = todos.filter(todo => !todo.completed);
    saveTodosToStorage();
    renderTodos();
}

// ========================================
// FILTER & SEARCH & SORT
// ========================================
function getFilteredTodos() {
    const searchTerm = searchInput.value.toLowerCase();

    // First filter by search and status
    let filtered = todos.filter(todo => {
        const matchesSearch = todo.title.toLowerCase().includes(searchTerm);

        if (currentFilter === 'pending') {
            return matchesSearch && !todo.completed;
        } else if (currentFilter === 'completed') {
            return matchesSearch && todo.completed;
        }

        return matchesSearch;
    });

    // Then sort the filtered results
    return sortTodos(filtered);
}

/**
 * sortTodos(todos)
 * Sorts tasks based on current sort option
 * @param {array} todos - Array of tasks to sort
 * @returns {array} - Sorted array
 */
function sortTodos(todosToSort) {
    // Priority order for sorting (high = 1, medium = 2, low = 3)
    const priorityOrder = { high: 1, medium: 2, low: 3 };

    switch (currentSort) {
        case 'oldest':
            // Sort by creation time (oldest first)
            return [...todosToSort].sort((a, b) => a.id - b.id);

        case 'priority':
            // Sort by priority (high first), then by date
            return [...todosToSort].sort((a, b) => {
                // First by priority
                if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                }
                // Then by due date (earliest first)
                if (a.dueDate && b.dueDate) {
                    return new Date(a.dueDate) - new Date(b.dueDate);
                }
                if (a.dueDate) return -1;
                if (b.dueDate) return 1;
                return 0;
            });

        case 'dueDate':
            // Sort by due date (earliest first), tasks without due date go to end
            return [...todosToSort].sort((a, b) => {
                // Tasks with due dates first
                if (a.dueDate && b.dueDate) {
                    return new Date(a.dueDate) - new Date(b.dueDate);
                }
                if (a.dueDate) return -1;
                if (b.dueDate) return 1;
                // If both have no due date, sort by priority
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });

        case 'newest':
        default:
            // Sort by creation time (newest first) - default
            return [...todosToSort].sort((a, b) => b.id - a.id);
    }
}

/**
 * applySortOption()
 * Applies the saved sort option from localStorage
 */
function applySortOption() {
    sortSelect.value = currentSort;
}

function applyLanguage() {
    languageSelect.value = currentLanguage;
    document.querySelector('.app-title').textContent = t('appTitle');
    document.querySelector('.app-subtitle').textContent = t('appSubtitle');
    document.querySelector('.progress-info span:first-child').textContent = t('progress');
    todoInput.placeholder = t('inputPlaceholder');
    document.querySelector('#add-btn').textContent = t('addBtn');
    prioritySelect.innerHTML = `
        <option value="low">${t('priorityLow')}</option>
        <option value="medium" selected>${t('priorityMedium')}</option>
        <option value="high">${t('priorityHigh')}</option>
    `;
    searchInput.placeholder = t('searchPlaceholder');
    document.querySelector('[data-filter="all"]').textContent = t('filterAll');
    document.querySelector('[data-filter="pending"]').textContent = t('filterPending');
    document.querySelector('[data-filter="completed"]').textContent = t('filterCompleted');
    sortSelect.innerHTML = `
        <option value="newest">${t('sortNewest')}</option>
        <option value="oldest">${t('sortOldest')}</option>
        <option value="priority">${t('sortPriority')}</option>
        <option value="dueDate">${t('sortDueDate')}</option>
    `;
    sortSelect.value = currentSort;
    document.querySelector('#clear-completed-btn').textContent = t('clearCompleted');
    document.querySelector('#empty-state p').textContent = t('emptyState');
}

function handleLanguageChange(event) {
    currentLanguage = event.target.value;
    localStorage.setItem('language', currentLanguage);
    applyLanguage();
    renderTodos();
}

/**
 * handleSortChange(event)
 * Handles sort dropdown changes
 * @param {Event} event - Change event
 */
function handleSortChange(event) {
    currentSort = event.target.value;
    localStorage.setItem('sort', currentSort);
    renderTodos();
}

// ========================================
// DATE FORMATTING
// ========================================

/**
 * formatDueDate(dateString)
 * Formats due date for display
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
function formatDueDate(dateString) {
    if (!dateString) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(dateString);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { text: t('overdue'), isOverdue: true };
    } else if (diffDays === 0) {
        return { text: t('today'), isOverdue: false };
    } else if (diffDays === 1) {
        return { text: t('tomorrow'), isOverdue: false };
    } else if (diffDays <= 7) {
        return { text: `${diffDays} ${t('days')}`, isOverdue: false };
    } else {
        return { text: dueDate.toLocaleDateString(currentLanguage === 'id' ? 'id-ID' : 'en-US'), isOverdue: false };
    }
}

/**
 * isOverdue(dateString)
 * Checks if a due date has passed
 * @param {string} dateString - ISO date string
 * @returns {boolean}
 */
function isOverdue(dateString) {
    if (!dateString) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(dateString);
    dueDate.setHours(0, 0, 0, 0);

    return dueDate < today;
}

// ========================================
// RENDER FUNCTION
// ========================================
function renderTodos() {
    const filteredTodos = getFilteredTodos();

    todoList.innerHTML = '';

    if (filteredTodos.length === 0) {
        emptyState.classList.add('show');
    } else {
        emptyState.classList.remove('show');
    }

    updateTaskCounter();
    updateProgressBar();

    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        li.dataset.id = todo.id;

        // Check for overdue
        const overdueClass = (!todo.completed && isOverdue(todo.dueDate)) ? 'overdue' : '';

        // Format due date
        const dueInfo = formatDueDate(todo.dueDate);
        const dueDateHtml = dueInfo.text ? `
            <span class="task-due ${dueInfo.isOverdue ? 'overdue' : ''}">
                📅 ${dueInfo.text}
            </span>
        ` : '';

        li.innerHTML = `
            <div class="priority-indicator ${todo.priority}"></div>
            <label class="checkbox-container">
                <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="checkmark"></span>
            </label>
            <div class="task-content">
                <span class="task-title ${todo.completed ? 'completed' : ''} ${overdueClass}">${escapeHtml(todo.title)}</span>
                <div class="task-meta">
                    <span class="task-date">🕐 ${todo.createdAt}</span>
                    ${dueDateHtml}
                </div>
            </div>
            <div class="task-actions">
                <button class="action-btn edit-btn" title="${t('edit')}">✏️</button>
                <button class="action-btn delete-btn" title="${t('delete')}">🗑️</button>
            </div>
        `;

        todoList.appendChild(li);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateTaskCounter() {
    const pendingCount = todos.filter(todo => !todo.completed).length;
    const totalCount = todos.length;

    if (pendingCount === 0 && totalCount === 0) {
        taskCounter.textContent = `0 ${t('tasks')}`;
    } else if (pendingCount === 1) {
        taskCounter.textContent = `1 ${t('taskLeft')}`;
    } else {
        taskCounter.textContent = `${pendingCount} ${t('taskLeft')}`;
    }
}

// ========================================
// EVENT HANDLERS
// ========================================

function handleFormSubmit(event) {
    event.preventDefault();

    const title = todoInput.value;
    const priority = prioritySelect.value;
    const dueDate = dueDateInput.value;

    addTask(title, priority, dueDate || null);

    // Reset form
    todoInput.value = '';
    prioritySelect.value = 'medium';
    dueDateInput.value = '';
    todoInput.focus();
}

function handleTaskClick(event) {
    const target = event.target;
    const todoItem = target.closest('.todo-item');

    if (!todoItem) return;

    const taskId = parseInt(todoItem.dataset.id);

    if (target.type === 'checkbox' || target.classList.contains('checkmark')) {
        toggleComplete(taskId);
        return;
    }

    if (target.closest('.delete-btn')) {
        deleteTask(taskId);
        return;
    }

    if (target.closest('.edit-btn')) {
        startEditing(taskId);
    }
}

function startEditing(taskId) {
    const todoItem = todoList.querySelector(`[data-id="${taskId}"]`);
    if (!todoItem) return;

    const task = todos.find(t => t.id === taskId);
    if (!task) return;

    const taskContent = todoItem.querySelector('.task-content');
    const taskTitle = taskContent.querySelector('.task-title');
    const taskMeta = taskContent.querySelector('.task-meta');

    // Create edit container
    const editContainer = document.createElement('div');
    editContainer.style.cssText = 'display: flex; flex-direction: column; gap: 10px; width: 100%;';

    // Edit input
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'edit-input';
    editInput.value = task.title;

    // Edit options row
    const editOptions = document.createElement('div');
    editOptions.style.cssText = 'display: flex; gap: 10px;';

    // Priority select
    const editPriority = document.createElement('select');
    editPriority.className = 'priority-select';
    editPriority.style.cssText = 'flex: 1; padding: 8px; border-radius: 8px; border: 2px solid #667eea;';
    editPriority.innerHTML = `
        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>${t('priorityLow')}</option>
        <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>${t('priorityMedium')}</option>
        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>${t('priorityHigh')}</option>
    `;

    // Due date input
    const editDueDate = document.createElement('input');
    editDueDate.type = 'date';
    editDueDate.className = 'due-date-input';
    editDueDate.style.cssText = 'flex: 1; padding: 8px; border-radius: 8px; border: 2px solid #667eea;';
    editDueDate.value = task.dueDate || '';

    editOptions.appendChild(editPriority);
    editOptions.appendChild(editDueDate);

    editContainer.appendChild(editInput);
    editContainer.appendChild(editOptions);

    taskTitle.replaceWith(editContainer);
    taskMeta.style.display = 'none';

    // Action buttons
    const actionsDiv = todoItem.querySelector('.task-actions');
    const saveBtn = document.createElement('button');
    saveBtn.className = 'action-btn save-btn';
    saveBtn.textContent = '✓';
    saveBtn.title = t('save');

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'action-btn cancel-btn';
    cancelBtn.textContent = '✕';
    cancelBtn.title = t('cancel');

    actionsDiv.innerHTML = '';
    actionsDiv.appendChild(saveBtn);
    actionsDiv.appendChild(cancelBtn);

    editInput.focus();
    editInput.select();

    saveBtn.onclick = function() {
        const newTitle = editInput.value.trim();
        const newPriority = editPriority.value;
        const newDueDate = editDueDate.value || null;

        if (newTitle) {
            editTask(taskId, newTitle, newPriority, newDueDate);
        } else {
            cancelEditing();
        }
    };

    cancelBtn.onclick = cancelEditing;

    editInput.onkeydown = function(e) {
        if (e.key === 'Enter') {
            saveBtn.click();
        } else if (e.key === 'Escape') {
            cancelEditing();
        }
    };
}

function cancelEditing() {
    renderTodos();
}

function handleSearch(event) {
    renderTodos();
}

function handleFilterClick(event) {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    currentFilter = event.target.dataset.filter;
    renderTodos();
}

function handleClearCompleted() {
    clearCompleted();
}

function handleThemeToggle() {
    toggleTheme();
}

// ========================================
// EVENT LISTENERS
// ========================================
todoForm.addEventListener('submit', handleFormSubmit);
todoList.addEventListener('click', handleTaskClick);
searchInput.addEventListener('input', handleSearch);
filterButtons.forEach(btn => btn.addEventListener('click', handleFilterClick));
clearCompletedBtn.addEventListener('click', handleClearCompleted);
themeToggle.addEventListener('click', handleThemeToggle);
sortSelect.addEventListener('change', handleSortChange);
languageSelect.addEventListener('change', handleLanguageChange);

// ========================================
// START APP
// ========================================
init();