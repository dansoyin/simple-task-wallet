/* ========================================
   FINANCE TRACKER - MONEY MANAGER
   ========================================
   A modern finance tracking application
   Built with Vanilla JavaScript
   Uses localStorage for data persistence
   ======================================== */

// ========================================
// TRANSLATIONS - Multi-language Support
// ========================================
const translations = {
    en: {
        appTitle: 'Finance Tracker',
        appSubtitle: 'Manage your money with ease',
        totalBalance: 'Total Balance',
        totalIncome: 'Total Income',
        totalExpense: 'Total Expenses',
        savingsRate: 'Savings Rate',
        savingsGoal: 'Savings Goal',
        expense: 'Expense',
        income: 'Income',
        selectCategory: 'Select Category',
        addTransaction: 'Add Transaction',
        searchPlaceholder: 'Search transactions...',
        allTypes: 'All Types',
        allCategories: 'All Categories',
        allMonths: 'All Months',
        categoryBreakdown: 'Category Breakdown',
        incomeVsExpense: 'Income vs Expense',
        transactionHistory: 'Transaction History',
        clearAll: 'Clear All',
        noTransactions: 'No transactions yet',
        addFirstTransaction: 'Add your first transaction above!',
        editTransaction: 'Edit Transaction',
        setSavingsGoal: 'Set Savings Goal',
        goalAmount: 'Goal Amount',
        saveGoal: 'Save Goal',
        saveChanges: 'Save Changes',
        title: 'Title',
        amount: 'Amount',
        category: 'Category',
        date: 'Date',
        type: 'Type',
        transactionAdded: 'Transaction added successfully!',
        transactionUpdated: 'Transaction updated successfully!',
        transactionDeleted: 'Transaction deleted!',
        dataExported: 'Data exported successfully!',
        dataImported: 'Data imported successfully!',
        goalSet: 'Savings goal set!',
        allCleared: 'All transactions cleared!',
        confirmClear: 'Are you sure you want to clear all transactions?'
    },
    id: {
        appTitle: 'Pelacak Keuangan',
        appSubtitle: 'Kelola uang Anda dengan mudah',
        totalBalance: 'Total Saldo',
        totalIncome: 'Total Pemasukan',
        totalExpense: 'Total Pengeluaran',
        savingsRate: 'Tingkat Tabungan',
        savingsGoal: 'Target Tabungan',
        expense: 'Pengeluaran',
        income: 'Pemasukan',
        selectCategory: 'Pilih Kategori',
        addTransaction: 'Tambah Transaksi',
        searchPlaceholder: 'Cari transaksi...',
        allTypes: 'Semua Jenis',
        allCategories: 'Semua Kategori',
        allMonths: 'Semua Bulan',
        categoryBreakdown: 'Rincian Kategori',
        incomeVsExpense: 'Pemasukan vs Pengeluaran',
        transactionHistory: 'Riwayat Transaksi',
        clearAll: 'Hapus Semua',
        noTransactions: 'Belum ada transaksi',
        addFirstTransaction: 'Tambahkan transaksi pertama Anda di atas!',
        editTransaction: 'Edit Transaksi',
        setSavingsGoal: 'Atur Target Tabungan',
        goalAmount: 'Jumlah Target',
        saveGoal: 'Simpan Target',
        saveChanges: 'Simpan Perubahan',
        title: 'Judul',
        amount: 'Jumlah',
        category: 'Kategori',
        date: 'Tanggal',
        type: 'Jenis',
        transactionAdded: 'Transaksi berhasil ditambahkan!',
        transactionUpdated: 'Transaksi berhasil diperbarui!',
        transactionDeleted: 'Transaksi dihapus!',
        dataExported: 'Data berhasil diekspor!',
        dataImported: 'Data berhasil diimpor!',
        goalSet: 'Target tabungan ditetapkan!',
        allCleared: 'Semua transaksi dihapus!',
        confirmClear: 'Apakah Anda yakin ingin menghapus semua transaksi?'
    }
};

// ========================================
// CATEGORY DEFINITIONS
// ========================================
const categories = {
    expense: [
        { id: 'food', name: { en: 'Food & Drinks', id: 'Makanan & Minuman' }, icon: 'fas fa-utensils', color: '#ff6b6b' },
        { id: 'transport', name: { en: 'Transport', id: 'Transportasi' }, icon: 'fas fa-car', color: '#4ecdc4' },
        { id: 'shopping', name: { en: 'Shopping', id: 'Belanja' }, icon: 'fas fa-shopping-bag', color: '#45b7d1' },
        { id: 'bills', name: { en: 'Bills & Utilities', id: 'Tagihan & Utilitas' }, icon: 'fas fa-receipt', color: '#96ceb4' },
        { id: 'entertainment', name: { en: 'Entertainment', id: 'Hiburan' }, icon: 'fas fa-gamepad', color: '#dda0dd' },
        { id: 'health', name: { en: 'Health', id: 'Kesehatan' }, icon: 'fas fa-heartbeat', color: '#ff7f50' },
        { id: 'education', name: { en: 'Education', id: 'Pendidikan' }, icon: 'fas fa-graduation-cap', color: '#6495ed' },
        { id: 'other-expense', name: { en: 'Other', id: 'Lainnya' }, icon: 'fas fa-ellipsis-h', color: '#808080' }
    ],
    income: [
        { id: 'salary', name: { en: 'Salary', id: 'Gaji' }, icon: 'fas fa-briefcase', color: '#11998e' },
        { id: 'freelance', name: { en: 'Freelance', id: 'Freelance' }, icon: 'fas fa-laptop', color: '#38ef7d' },
        { id: 'investment', name: { en: 'Investment', id: 'Investasi' }, icon: 'fas fa-chart-line', color: '#00b894' },
        { id: 'gift', name: { en: 'Gift', id: 'Hadiah' }, icon: 'fas fa-gift', color: '#fd79a8' },
        { id: 'other-income', name: { en: 'Other', id: 'Lainnya' }, icon: 'fas fa-ellipsis-h', color: '#636e72' }
    ]
};

// ========================================
// GLOBAL VARIABLES
// ========================================
let transactions = JSON.parse(localStorage.getItem('finance_transactions')) || [];
let savingsGoal = JSON.parse(localStorage.getItem('finance_savingsGoal')) || 0;
let currentTheme = localStorage.getItem('finance_theme') || 'light';
let currentLanguage = localStorage.getItem('finance_language') || 'en';
let currentType = 'expense';
let filteredTransactions = [];

// ========================================
// DOM SELECTORS
// ========================================
const totalBalanceEl = document.querySelector('#total-balance');
const totalIncomeEl = document.querySelector('#total-income');
const totalExpenseEl = document.querySelector('#total-expense');
const savingsRateEl = document.querySelector('#savings-rate');
const savingsProgressEl = document.querySelector('#savings-progress');
const currentSavingsEl = document.querySelector('#current-savings');
const goalAmountEl = document.querySelector('#goal-amount');
const goalProgressFillEl = document.querySelector('#goal-progress-fill');
const goalPercentEl = document.querySelector('#goal-percent');

const transactionForm = document.querySelector('#transaction-form');
const transactionTitleInput = document.querySelector('#transaction-title');
const transactionAmountInput = document.querySelector('#transaction-amount');
const transactionCategorySelect = document.querySelector('#transaction-category');
const transactionDateInput = document.querySelector('#transaction-date');

const searchInput = document.querySelector('#search-input');
const filterTypeSelect = document.querySelector('#filter-type');
const filterCategorySelect = document.querySelector('#filter-category');
const filterMonthSelect = document.querySelector('#filter-month');

const transactionsList = document.querySelector('#transactions-list');
const emptyState = document.querySelector('#empty-state');
const categoryStatsEl = document.querySelector('#category-stats');
const chartIncomeEl = document.querySelector('#chart-income');
const chartExpenseEl = document.querySelector('#chart-expense');

const editModal = document.querySelector('#edit-modal');
const editForm = document.querySelector('#edit-form');
const closeEditModalBtn = document.querySelector('#close-edit-modal');

const goalModal = document.querySelector('#goal-modal');
const goalForm = document.querySelector('#goal-form');
const setGoalBtn = document.querySelector('#set-goal-btn');
const closeGoalModalBtn = document.querySelector('#close-goal-modal');
const goalAmountInput = document.querySelector('#goal-amount-input');

const themeToggle = document.querySelector('#theme-toggle');
const languageSelect = document.querySelector('#language-select');
const exportBtn = document.querySelector('#export-btn');
const importBtn = document.querySelector('#import-btn');
const importFile = document.querySelector('#import-file');
const clearAllBtn = document.querySelector('#clear-all-btn');
const toast = document.querySelector('#toast');

const tabButtons = document.querySelectorAll('.tab-btn');

// ========================================
// INITIALIZATION
// ========================================
function init() {
    applyTheme();
    applyLanguage();
    setDefaultDate();
    populateCategories();
    populateFilterCategories();
    populateMonthFilter();
    filterTransactions();
    console.log('Finance Tracker initialized!');
}

// ========================================
// THEME FUNCTIONS
// ========================================
function applyTheme() {
    if (currentTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.removeAttribute('data-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('finance_theme', currentTheme);
    applyTheme();
}

// ========================================
// LANGUAGE FUNCTIONS
// ========================================
function t(key) {
    return translations[currentLanguage][key] || translations['en'][key] || key;
}

function applyLanguage() {
    languageSelect.value = currentLanguage;

    // Apply to elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    // Apply to placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });

    // Update category options
    populateCategories();
    populateFilterCategories();

    // Update UI
    updateSummary();
    renderTransactions();
    updateCategoryStats();
}

function handleLanguageChange(event) {
    currentLanguage = event.target.value;
    localStorage.setItem('finance_language', currentLanguage);
    applyLanguage();
}

// ========================================
// CATEGORY FUNCTIONS
// ========================================
function getCategoryName(categoryId, type) {
    const category = categories[type].find(c => c.id === categoryId);
    if (category) {
        return category.name[currentLanguage] || category.name.en;
    }
    return categoryId;
}

function getCategoryIcon(categoryId, type) {
    const category = categories[type].find(c => c.id === categoryId);
    return category ? category.icon : 'fas fa-circle';
}

function getCategoryColor(categoryId, type) {
    const category = categories[type].find(c => c.id === categoryId);
    return category ? category.color : '#808080';
}

function populateCategories() {
    const categorySelect = document.querySelector('#transaction-category');
    categorySelect.innerHTML = `<option value="" data-i18n="selectCategory">${t('selectCategory')}</option>`;

    categories[currentType].forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name[currentLanguage] || cat.name.en;
        categorySelect.appendChild(option);
    });

    // Also update edit form categories
    const editCategorySelect = document.querySelector('#edit-category');
    editCategorySelect.innerHTML = '';
    categories.expense.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name[currentLanguage] || cat.name.en;
        editCategorySelect.appendChild(option);
    });
}

function populateFilterCategories() {
    filterCategorySelect.innerHTML = `<option value="all" data-i18n="allCategories">${t('allCategories')}</option>`;

    // Add expense categories
    categories.expense.forEach(cat => {
        const option = document.createElement('option');
        option.value = `expense-${cat.id}`;
        option.textContent = cat.name[currentLanguage] || cat.name.en;
        filterCategorySelect.appendChild(option);
    });

    // Add income categories
    categories.income.forEach(cat => {
        const option = document.createElement('option');
        option.value = `income-${cat.id}`;
        option.textContent = cat.name[currentLanguage] || cat.name.en;
        filterCategorySelect.appendChild(option);
    });
}

function populateMonthFilter() {
    filterMonthSelect.innerHTML = `<option value="all" data-i18n="allMonths">${t('allMonths')}</option>`;

    const months = [
        { en: 'January', id: 'Januari' },
        { en: 'February', id: 'Februari' },
        { en: 'March', id: 'Maret' },
        { en: 'April', id: 'April' },
        { en: 'May', id: 'Mei' },
        { en: 'June', id: 'Juni' },
        { en: 'July', id: 'Juli' },
        { en: 'August', id: 'Agustus' },
        { en: 'September', id: 'September' },
        { en: 'October', id: 'Oktober' },
        { en: 'November', id: 'November' },
        { en: 'December', id: 'Desember' }
    ];

    const currentYear = new Date().getFullYear();
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = `${currentYear}-${String(index + 1).padStart(2, '0')}`;
        option.textContent = month[currentLanguage];
        filterMonthSelect.appendChild(option);
    });
}

// ========================================
// DATE FUNCTIONS
// ========================================
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    transactionDateInput.value = today;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(currentLanguage === 'id' ? 'id-ID' : 'en-US', options);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat(currentLanguage === 'id' ? 'id-ID' : 'en-US', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// ========================================
// TRANSACTION CRUD OPERATIONS
// ========================================
function addTransaction(title, amount, category, date, type) {
    const transaction = {
        id: Date.now(),
        type: type,
        title: title.trim(),
        amount: parseFloat(amount),
        category: category,
        date: date,
        createdAt: new Date().toLocaleString()
    };

    transactions.unshift(transaction);
    saveTransactions();
    filterTransactions();
    showToast(t('transactionAdded'), 'success');
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    filterTransactions();
    showToast(t('transactionDeleted'), 'error');
}

function updateTransaction(id, updatedData) {
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
        transactions[index] = { ...transactions[index], ...updatedData };
        saveTransactions();
        filterTransactions();
        showToast(t('transactionUpdated'), 'success');
    }
}

function saveTransactions() {
    localStorage.setItem('finance_transactions', JSON.stringify(transactions));
}

// ========================================
// FILTER & SEARCH
// ========================================
function filterTransactions() {
    const searchTerm = searchInput.value.toLowerCase();
    const typeFilter = filterTypeSelect.value;
    const categoryFilter = filterCategorySelect.value;
    const monthFilter = filterMonthSelect.value;

    filteredTransactions = transactions.filter(t => {
        // Search filter
        const matchesSearch = t.title.toLowerCase().includes(searchTerm) ||
            t.category.toLowerCase().includes(searchTerm);

        // Type filter
        const matchesType = typeFilter === 'all' || t.type === typeFilter;

        // Category filter
        let matchesCategory = true;
        if (categoryFilter !== 'all') {
            const [type, catId] = categoryFilter.split('-');
            matchesCategory = t.type === type && t.category === catId;
        }

        // Month filter
        let matchesMonth = true;
        if (monthFilter !== 'all') {
            matchesMonth = t.date.startsWith(monthFilter);
        }

        return matchesSearch && matchesType && matchesCategory && matchesMonth;
    });

    renderTransactions();
    updateSummary();
    updateCategoryStats();
    updateChart();
}

// ========================================
// RENDER FUNCTIONS
// ========================================
function renderTransactions() {
    transactionsList.innerHTML = '';

    if (filteredTransactions.length === 0) {
        emptyState.classList.add('show');
    } else {
        emptyState.classList.remove('show');

        filteredTransactions.forEach(t => {
            const li = document.createElement('div');
            li.className = 'transaction-item';
            li.innerHTML = `
                <div class="transaction-icon ${t.type}">
                    <i class="${getCategoryIcon(t.category, t.type)}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-title">${escapeHtml(t.title)}</div>
                    <div class="transaction-meta">
                        <span><i class="${getCategoryIcon(t.category, t.type)}"></i> ${getCategoryName(t.category, t.type)}</span>
                        <span><i class="fas fa-calendar"></i> ${formatDate(t.date)}</span>
                    </div>
                </div>
                <div class="transaction-amount ${t.type}">
                    ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                </div>
                <div class="transaction-actions">
                    <button class="action-btn edit-btn" onclick="openEditModal(${t.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteTransaction(${t.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            transactionsList.appendChild(li);
        });
    }
}

function updateSummary() {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0;

    totalBalanceEl.textContent = formatCurrency(balance);
    totalIncomeEl.textContent = formatCurrency(totalIncome);
    totalExpenseEl.textContent = formatCurrency(totalExpense);
    savingsRateEl.textContent = `${savingsRate}%`;
    savingsProgressEl.style.width = `${Math.min(savingsRate, 100)}%`;

    // Update savings goal
    if (savingsGoal > 0) {
        currentSavingsEl.textContent = formatCurrency(balance > 0 ? balance : 0);
        goalAmountEl.textContent = formatCurrency(savingsGoal);
        const goalPercent = Math.min((balance / savingsGoal) * 100, 100);
        goalProgressFillEl.style.width = `${goalPercent}%`;
        goalPercentEl.textContent = `${goalPercent.toFixed(1)}%`;
    }
}

function updateCategoryStats() {
    categoryStatsEl.innerHTML = '';

    const expensesByCategory = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    });

    const sortedExpenses = Object.entries(expensesByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sortedExpenses.length === 0) {
        categoryStatsEl.innerHTML = '<p style="color: var(--text-light); text-align: center;">No expense data</p>';
        return;
    }

    sortedExpenses.forEach(([catId, amount]) => {
        const div = document.createElement('div');
        div.className = 'category-stat';
        div.innerHTML = `
            <div class="category-icon" style="background-color: ${getCategoryColor(catId, 'expense')}">
                <i class="${getCategoryIcon(catId, 'expense')}"></i>
            </div>
            <div class="category-info">
                <div class="category-name">${getCategoryName(catId, 'expense')}</div>
                <div class="category-amount">${formatCurrency(amount)}</div>
            </div>
        `;
        categoryStatsEl.appendChild(div);
    });
}

function updateChart() {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const maxValue = Math.max(totalIncome, totalExpense, 1);

    const incomeHeight = (totalIncome / maxValue) * 100;
    const expenseHeight = (totalExpense / maxValue) * 100;

    chartIncomeEl.style.height = `${Math.max(incomeHeight, 5)}%`;
    chartExpenseEl.style.height = `${Math.max(expenseHeight, 5)}%`;

    chartIncomeEl.innerHTML = formatCurrency(totalIncome);
    chartExpenseEl.innerHTML = formatCurrency(totalExpense);
}

// ========================================
// MODAL FUNCTIONS
// ========================================
function openEditModal(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    document.getElementById('edit-id').value = id;
    document.getElementById('edit-type').value = transaction.type;
    document.getElementById('edit-title').value = transaction.title;
    document.getElementById('edit-amount').value = transaction.amount;
    document.getElementById('edit-category').value = transaction.category;
    document.getElementById('edit-date').value = transaction.date;

    // Update categories based on type
    updateEditCategories(transaction.type);

    editModal.classList.add('show');
}

function closeEditModal() {
    editModal.classList.remove('show');
}

function updateEditCategories(type) {
    const editCategorySelect = document.querySelector('#edit-category');
    editCategorySelect.innerHTML = '';
    categories[type].forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name[currentLanguage] || cat.name.en;
        editCategorySelect.appendChild(option);
    });
}

function openGoalModal() {
    goalAmountInput.value = savingsGoal || '';
    goalModal.classList.add('show');
}

function closeGoalModal() {
    goalModal.classList.remove('show');
}

function saveGoal(e) {
    e.preventDefault();
    savingsGoal = parseFloat(goalAmountInput.value) || 0;
    localStorage.setItem('finance_savingsGoal', JSON.stringify(savingsGoal));
    updateSummary();
    closeGoalModal();
    showToast(t('goalSet'), 'success');
}

// ========================================
// TOAST NOTIFICATION
// ========================================
function showToast(message, type) {
    const toastEl = document.querySelector('#toast');
    const toastIcon = toastEl.querySelector('.toast-icon');
    const toastMessage = toastEl.querySelector('.toast-message');

    toastEl.className = `toast ${type}`;
    toastIcon.innerHTML = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>';
    toastMessage.textContent = message;

    toastEl.classList.add('show');

    setTimeout(() => {
        toastEl.classList.remove('show');
    }, 3000);
}

// ========================================
// EXPORT/IMPORT DATA
// ========================================
function exportData() {
    const data = {
        transactions: transactions,
        savingsGoal: savingsGoal,
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-tracker-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(t('dataExported'), 'success');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.transactions && Array.isArray(data.transactions)) {
                transactions = data.transactions;
                saveTransactions();
                if (data.savingsGoal) {
                    savingsGoal = data.savingsGoal;
                    localStorage.setItem('finance_savingsGoal', JSON.stringify(savingsGoal));
                }
                filterTransactions();
                showToast(t('dataImported'), 'success');
            }
        } catch (error) {
            showToast('Invalid file format', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function clearAll() {
    if (confirm(t('confirmClear'))) {
        transactions = [];
        saveTransactions();
        filterTransactions();
        showToast(t('allCleared'), 'error');
    }
}

// ========================================
// EVENT HANDLERS
// ========================================
function handleFormSubmit(e) {
    e.preventDefault();

    const title = transactionTitleInput.value;
    const amount = transactionAmountInput.value;
    const category = transactionCategorySelect.value;
    const date = transactionDateInput.value;

    if (!title || !amount || !category || !date) {
        return;
    }

    addTransaction(title, amount, category, date, currentType);

    // Reset form
    transactionTitleInput.value = '';
    transactionAmountInput.value = '';
    transactionCategorySelect.value = '';
    setDefaultDate();
}

function handleEditFormSubmit(e) {
    e.preventDefault();

    const id = parseInt(document.getElementById('edit-id').value);
    const type = document.getElementById('edit-type').value;
    const title = document.getElementById('edit-title').value;
    const amount = parseFloat(document.getElementById('edit-amount').value);
    const category = document.getElementById('edit-category').value;
    const date = document.getElementById('edit-date').value;

    updateTransaction(id, { type, title, amount, category, date });
    closeEditModal();
}

function handleTabClick(e) {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;

    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentType = btn.dataset.type;
    populateCategories();
}

function handleEditTypeChange(e) {
    updateEditCategories(e.target.value);
}

function handleSearch() {
    filterTransactions();
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// EVENT LISTENERS
// ========================================
transactionForm.addEventListener('submit', handleFormSubmit);
editForm.addEventListener('submit', handleEditFormSubmit);
goalForm.addEventListener('submit', saveGoal);

tabButtons.forEach(btn => btn.addEventListener('click', handleTabClick));
document.getElementById('edit-type').addEventListener('change', handleEditTypeChange);

searchInput.addEventListener('input', handleSearch);
filterTypeSelect.addEventListener('change', filterTransactions);
filterCategorySelect.addEventListener('change', filterTransactions);
filterMonthSelect.addEventListener('change', filterTransactions);

themeToggle.addEventListener('click', toggleTheme);
languageSelect.addEventListener('change', handleLanguageChange);
exportBtn.addEventListener('click', exportData);
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', importData);
clearAllBtn.addEventListener('click', clearAll);
setGoalBtn.addEventListener('click', openGoalModal);

closeEditModalBtn.addEventListener('click', closeEditModal);
closeGoalModalBtn.addEventListener('click', closeGoalModal);

editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
});
goalModal.addEventListener('click', (e) => {
    if (e.target === goalModal) closeGoalModal();
});

// ========================================
// START APP
// ========================================
init();