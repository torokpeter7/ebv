// =====================================
// EBV - Asztalos Fizetési Rendszer
// Fő JavaScript File
// =====================================

let currentUser = null;
let currentTable = null;
let currentOrder = {};
let paymentMethod = null;
let menuItems = [];
let allTables = [];

function getSupabaseErrorMessage(error, defaultMessage) {
  if (!error) {
    return defaultMessage;
  }

  const status = error.status || error.code;
  if (status === 401 || status === 403) {
    return 'Supabase jogosultsági hiba: futtasd le a SQL_SETUP.md RLS policy részt.';
  }

  return error.message || error.details || defaultMessage;
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
  await initializeDatabase();
  checkAuth();
});

// ===== DATABASE INITIALIZATION =====
async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Check if tables exist
    const { error: tablesError } = await supabase
      .from('tables')
      .select('*', { count: 'exact', head: true });

    const { error: menusError } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true });

    const { error: ordersError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    const { error: paymentsError } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true });

    if (tablesError || menusError || ordersError || paymentsError) {
      throw tablesError || menusError || ordersError || paymentsError;
    }

    console.log('Tables exist, database initialized');
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      console.error('Supabase jogosultsági hiba: ellenőrizd az RLS policy-kat.');
      showNotification('Az adatbázis RLS beállításai hiányoznak. Futtasd le a SQL_SETUP.md policy részt.', 'error');
      return;
    }

    console.log('Tables might not exist yet. They will be created on first use.');
    // Tables will be created automatically when first insert is attempted
  }
}

// ===== AUTHENTICATION =====
function checkAuth() {
  const savedUser = localStorage.getItem('ebv_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showAdminView();
    loadAllData();
  } else {
    showLoginView();
  }
}

async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showNotification('Kérjük, töltsd ki az összes mezőt!', 'error');
    return;
  }

  // Simple authentication (in production, use Supabase Auth)
  const user = {
    id: Math.random().toString(36).substr(2, 9),
    email: email,
    name: email.split('@')[0],
    role: 'admin'
  };

  currentUser = user;
  localStorage.setItem('ebv_user', JSON.stringify(user));
  showNotification('Sikeres bejelentkezés!', 'success');
  showAdminView();
  loadAllData();
}

function logout() {
  if (confirm('Biztosan ki szeretnél jelentkezni?')) {
    currentUser = null;
    localStorage.removeItem('ebv_user');
    showLoginView();
  }
}

// ===== VIEW SWITCHING =====
function showLoginView() {
  document.getElementById('loginSection').classList.remove('hidden');
  document.getElementById('adminSection').classList.add('hidden');
  document.getElementById('guestSection').classList.add('hidden');
}

function showAdminView() {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('adminSection').classList.remove('hidden');
  document.getElementById('guestSection').classList.add('hidden');
}

function showGuestView() {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('adminSection').classList.add('hidden');
  document.getElementById('guestSection').classList.remove('hidden');
  resetGuestView();
}

function resetGuestView() {
  document.getElementById('qrScannerSection').classList.remove('hidden');
  document.getElementById('orderSection').classList.add('hidden');
  document.getElementById('paymentSection').classList.add('hidden');
  document.getElementById('successSection').classList.add('hidden');
  document.getElementById('qrInput').value = '';
  currentTable = null;
  currentOrder = {};
  paymentMethod = null;
}

// ===== ADMIN FUNCTIONS =====

// Switch Admin Tabs
function switchAdminTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(tabName + 'Tab').classList.remove('hidden');
  
  if (tabName === 'menu') {
    loadMenuItems();
  } else if (tabName === 'payments') {
    loadPayments();
  }
}

// Load All Admin Data
async function loadAllData() {
  loadTables();
  loadMenuItems();
  updateStats();

  // Set up realtime subscriptions
  supabase
    .channel('tables_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => {
      loadTables();
      updateStats();
    })
    .subscribe();

  supabase
    .channel('payments_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
      updateStats();
      loadPayments();
      showNotification('🔔 Új fizetés érkezett!', 'success');
    })
    .subscribe();
}

// Load Tables
async function loadTables() {
  try {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .order('table_number', { ascending: true });

    if (error) throw error;

    allTables = data || [];
    renderTablesList();
  } catch (error) {
    console.error('Error loading tables:', error);
    showNotification(getSupabaseErrorMessage(error, 'Hiba az asztalok betöltésekor'), 'error');
  }
}

// Render Tables List
function renderTablesList() {
  const tablesList = document.getElementById('tablesList');
  tablesList.innerHTML = '';

  if (allTables.length === 0) {
    tablesList.innerHTML = '<div class="empty-state"><h3>Nincsenek asztalok</h3><p>Kattints az "Új Asztal" gombra az első asztal hozzáadásához</p></div>';
    return;
  }

  allTables.forEach(table => {
    const statusClass = table.status;
    const statusText = {
      'available': '📍 Szabad',
      'occupied': '🍽️ Foglalt',
      'paying': '💳 Fizető'
    }[table.status] || table.status;

    const tableRow = document.createElement('div');
    tableRow.className = 'table-row';
    tableRow.innerHTML = `
      <div class="table-row-info">
        <h3>Asztal #${table.table_number}</h3>
        <small style="color: var(--gray);">QR: ${table.qr_code.substring(0, 8)}...</small>
      </div>
      <div class="table-row-status">
        <span class="badge ${statusClass}">${statusText}</span>
        <button class="btn btn-secondary btn-small" onclick="showQRCode(${table.id}, ${table.table_number}, '${table.qr_code}')">QR-kód</button>
        <button class="btn btn-danger btn-small" onclick="deleteTable(${table.id})">Törlés</button>
      </div>
    `;
    tablesList.appendChild(tableRow);
  });
}

// Add Table
async function addTable() {
  const tableNumber = parseInt(document.getElementById('tableNumber').value);

  if (!tableNumber || tableNumber < 1) {
    showNotification('Kérjük, adj meg egy érvényes asztalszámot!', 'error');
    return;
  }

  try {
    const qrCode = `TABLE_${tableNumber}_${Date.now()}`;

    const { data, error } = await supabase
      .from('tables')
      .insert({
        table_number: tableNumber,
        qr_code: qrCode,
        status: 'available'
      })
      .select();

    if (error) throw error;

    showNotification(`Asztal #${tableNumber} sikeresen hozzáadva!`, 'success');
    closeModal('addTableModal');
    document.getElementById('tableNumber').value = '';
    loadTables();
  } catch (error) {
    console.error('Error adding table:', error);
    showNotification(getSupabaseErrorMessage(error, 'Hiba az asztal hozzáadásakor'), 'error');
  }
}

// Delete Table
async function deleteTable(tableId) {
  if (!confirm('Biztosan törlöd ezt az asztalt?')) return;

  try {
    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', tableId);

    if (error) throw error;

    showNotification('Asztal sikeresen törölve!', 'success');
    loadTables();
  } catch (error) {
    console.error('Error deleting table:', error);
    showNotification(getSupabaseErrorMessage(error, 'Hiba az asztal törlésénél'), 'error');
  }
}

// Show QR Code
function showQRCode(tableId, tableNumber, qrCode) {
  document.getElementById('qrTableNumber').textContent = tableNumber;
  document.getElementById('qrCodeValue').value = qrCode;

  const container = document.getElementById('qrCodeContainer');
  container.innerHTML = '';

  new QRCode(container, {
    text: qrCode,
    width: 250,
    height: 250,
    correctLevel: QRCode.CorrectLevel.H
  });

  openModal('qrCodeModal');
}

// Print QR Code
function printQRCode() {
  const qrCode = document.getElementById('qrCodeValue').value;
  const tableNumber = document.getElementById('qrTableNumber').textContent;
  
  const printWindow = window.open('', '', 'height=400,width=600');
  printWindow.document.write(`
    <html>
      <head>
        <title>QR-kód nyomtatás - Asztal #${tableNumber}</title>
        <style>
          body { text-align: center; padding: 20px; font-family: Arial, sans-serif; }
          h1 { color: #6366f1; }
          img { max-width: 400px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>Asztal #${tableNumber}</h1>
        <p>Olvasd be ezt a QR-kódot fizetéshez:</p>
        <div id="qr"></div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
        <script>new QRCode(document.getElementById('qr'), '${qrCode}');<\/script>
      </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}

// Load Menu Items
async function loadMenuItems() {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('category', { ascending: true });

    if (error) throw error;

    menuItems = data || [];
    renderMenuList();
  } catch (error) {
    console.error('Error loading menu items:', error);
    showNotification('Hiba a menü betöltésénél', 'error');
  }
}

// Render Menu List
function renderMenuList() {
  const menuList = document.getElementById('menuList');
  menuList.innerHTML = '';

  if (menuItems.length === 0) {
    menuList.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><h3>Nincsenek menüpontok</h3><p>Kattints az "Új Tétel" gombra az első elem hozzáadásához</p></div>';
    return;
  }

  menuItems.forEach(item => {
    const menuCard = document.createElement('div');
    menuCard.className = 'menu-card';
    menuCard.innerHTML = `
      <div class="menu-card-header">
        <div class="menu-category">${getCategoryName(item.category)}</div>
        <div class="menu-name">${item.name}</div>
        <div class="menu-price">${item.price} Ft</div>
      </div>
      <div class="menu-card-body">
        <div class="menu-description">${item.description || 'Nincs leírás'}</div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-secondary btn-small" style="flex: 1;" onclick="editMenuItem(${item.id})">Szerkesztés</button>
          <button class="btn btn-danger btn-small" style="flex: 1;" onclick="deleteMenuItem(${item.id})">Törlés</button>
        </div>
      </div>
    `;
    menuList.appendChild(menuCard);
  });
}

// Add Menu Item
async function addMenuItem() {
  const name = document.getElementById('menuName').value.trim();
  const description = document.getElementById('menuDescription').value.trim();
  const category = document.getElementById('menuCategory').value;
  const price = parseFloat(document.getElementById('menuPrice').value);

  if (!name || !price || price <= 0) {
    showNotification('Kérjük, töltsd ki az összes kötelező mezőt!', 'error');
    return;
  }

  try {
    const { error } = await supabase
      .from('menu_items')
      .insert({
        name,
        description,
        category,
        price,
        available: true
      });

    if (error) throw error;

    showNotification(`"${name}" sikeresen hozzáadva!`, 'success');
    closeModal('addMenuItemModal');
    document.getElementById('menuName').value = '';
    document.getElementById('menuDescription').value = '';
    document.getElementById('menuPrice').value = '';
    loadMenuItems();
  } catch (error) {
    console.error('Error adding menu item:', error);
    showNotification('Hiba a menüpont hozzáadásakor', 'error');
  }
}

// Delete Menu Item
async function deleteMenuItem(itemId) {
  if (!confirm('Biztosan törlöd ezt a menüpontot?')) return;

  try {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    showNotification('Menüpont sikeresen törölve!', 'success');
    loadMenuItems();
  } catch (error) {
    console.error('Error deleting menu item:', error);
    showNotification('Hiba a menüpont törlésénél', 'error');
  }
}

// Load Payments
async function loadPayments() {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*, tables(table_number)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    renderPaymentsList(data || []);
  } catch (error) {
    console.error('Error loading payments:', error);
    showNotification('Hiba a fizetések betöltésénél', 'error');
  }
}

// Render Payments List
function renderPaymentsList(payments) {
  const paymentsList = document.getElementById('paymentsList');
  paymentsList.innerHTML = '';

  if (payments.length === 0) {
    paymentsList.innerHTML = '<div class="empty-state"><h3>Nincsenek fizetések</h3></div>';
    return;
  }

  payments.forEach(payment => {
    const date = new Date(payment.created_at).toLocaleString('hu-HU');
    const statusText = {
      'pending': '⏳ Függőben',
      'completed': '✅ Kész',
      'failed': '❌ Sikertelen'
    }[payment.status] || payment.status;

    const statusClass = payment.status;

    const paymentRow = document.createElement('div');
    paymentRow.className = 'table-row';
    paymentRow.innerHTML = `
      <div class="table-row-info">
        <h3>Asztal #${payment.tables.table_number}</h3>
        <small style="color: var(--gray);">${date}</small>
      </div>
      <div class="table-row-status">
        <span style="font-weight: 700; color: var(--primary); margin-right: 1rem;">${payment.total_amount} Ft</span>
        <span class="badge ${statusClass}">${statusText}</span>
      </div>
    `;
    paymentsList.appendChild(paymentRow);
  });
}

// Update Stats
async function updateStats() {
  try {
    const { data: tableData } = await supabase
      .from('tables')
      .select('status');

    const { data: paymentData } = await supabase
      .from('payments')
      .select('total_amount')
      .eq('status', 'completed');

    const occupied = tableData?.filter(t => t.status === 'occupied').length || 0;
    const available = tableData?.filter(t => t.status === 'available').length || 0;
    const paying = tableData?.filter(t => t.status === 'paying').length || 0;
    const revenue = paymentData?.reduce((sum, p) => sum + parseFloat(p.total_amount), 0) || 0;

    document.getElementById('occupiedCount').textContent = occupied;
    document.getElementById('availableCount').textContent = available;
    document.getElementById('payingCount').textContent = paying;
    document.getElementById('totalRevenue').textContent = revenue.toFixed(0) + ' Ft';
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

// ===== GUEST FUNCTIONS =====

// Load Table Order
async function loadTableOrder() {
  const input = document.getElementById('qrInput').value.trim();

  if (!input) {
    showNotification('Kérjük, add meg az asztal ID-t vagy QR-kódot!', 'error');
    return;
  }

  try {
    let table;

    // Try to find by QR code first
    let { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('qr_code', input)
      .single();

    if (error || !data) {
      // Try to find by table number
      const tableNum = parseInt(input);
      if (isNaN(tableNum)) {
        showNotification('Érvénytelen asztal ID!', 'error');
        return;
      }

      const result = await supabase
        .from('tables')
        .select('*')
        .eq('table_number', tableNum)
        .single();

      table = result.data;
      if (!table) throw new Error('Asztal nem található');
    } else {
      table = data;
    }

    currentTable = table;

    // Load existing orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*, menu_items(*)')
      .eq('table_id', table.id);

    if (!ordersError && orders) {
      currentOrder = {};
      orders.forEach(order => {
        currentOrder[order.menu_item_id] = {
          quantity: order.quantity,
          item: order.menu_items
        };
      });
    }

    // Mark table as occupied
    await supabase
      .from('tables')
      .update({ status: 'occupied' })
      .eq('id', table.id);

    // Show order section
    document.getElementById('qrScannerSection').classList.add('hidden');
    document.getElementById('orderSection').classList.remove('hidden');
    document.getElementById('guestTableNumber').textContent = `#${table.table_number}`;

    loadGuestMenuItems();
  } catch (error) {
    console.error('Error loading table:', error);
    showNotification('Hiba az asztal betöltésénél', 'error');
  }
}

// Load Guest Menu Items
async function loadGuestMenuItems() {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('available', true)
      .order('category', { ascending: true });

    if (error) throw error;

    renderGuestMenu(data || []);
    updateGuestOrderSummary();
  } catch (error) {
    console.error('Error loading menu items:', error);
    showNotification('Hiba a menü betöltésénél', 'error');
  }
}

// Render Guest Menu
function renderGuestMenu(items) {
  const menuContainer = document.getElementById('guestMenuItems');
  menuContainer.innerHTML = '';

  if (items.length === 0) {
    menuContainer.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><h3>Nincsenek elérhető menüpontok</h3></div>';
    return;
  }

  items.forEach(item => {
    const menuCard = document.createElement('div');
    menuCard.className = 'menu-card';
    menuCard.innerHTML = `
      <div class="menu-card-header">
        <div class="menu-category">${getCategoryName(item.category)}</div>
        <div class="menu-name">${item.name}</div>
        <div class="menu-price">${item.price} Ft</div>
      </div>
      <div class="menu-card-body">
        <div class="menu-description">${item.description || ''}</div>
        <button class="add-to-order" onclick="addToGuestOrder(${item.id}, '${item.name}', ${item.price})">
          🛒 Hozzáadás
        </button>
      </div>
    `;
    menuContainer.appendChild(menuCard);
  });
}

// Add to Guest Order
function addToGuestOrder(itemId, itemName, price) {
  if (!currentOrder[itemId]) {
    currentOrder[itemId] = {
      name: itemName,
      price: price,
      quantity: 1
    };
  } else {
    currentOrder[itemId].quantity++;
  }
  updateGuestOrderSummary();
  showNotification(`"${itemName}" hozzáadva a rendeléshez!`, 'success');
}

// Update Guest Order Summary
function updateGuestOrderSummary() {
  const container = document.getElementById('guestOrderItems');
  container.innerHTML = '';

  let total = 0;

  Object.entries(currentOrder).forEach(([itemId, orderItem]) => {
    const itemTotal = orderItem.price * orderItem.quantity;
    total += itemTotal;

    const orderItemEl = document.createElement('div');
    orderItemEl.className = 'order-item';
    orderItemEl.innerHTML = `
      <div class="order-item-name">
        <strong>${orderItem.name}</strong>
        <div style="font-size: 0.875rem; color: var(--gray);">${orderItem.price} Ft/db</div>
      </div>
      <div class="order-item-price">${itemTotal} Ft</div>
      <div class="order-item-qty">
        <button onclick="updateGuestOrderQty(${itemId}, -1)">−</button>
        <span>${orderItem.quantity}</span>
        <button onclick="updateGuestOrderQty(${itemId}, 1)">+</button>
      </div>
    `;
    container.appendChild(orderItemEl);
  });

  document.getElementById('guestTotalAmount').textContent = total + ' Ft';
  document.getElementById('paymentAmount').textContent = total + ' Ft';
}

// Update Guest Order Quantity
function updateGuestOrderQty(itemId, change) {
  if (currentOrder[itemId]) {
    currentOrder[itemId].quantity += change;
    if (currentOrder[itemId].quantity <= 0) {
      delete currentOrder[itemId];
    }
    updateGuestOrderSummary();
  }
}

// Go to Payment
function goToPayment() {
  if (Object.keys(currentOrder).length === 0) {
    showNotification('Kérjük, adj hozzá legalább egy tételt!', 'error');
    return;
  }

  document.getElementById('orderSection').classList.add('hidden');
  document.getElementById('paymentSection').classList.remove('hidden');
}

// Back to Order
function backToOrder() {
  document.getElementById('paymentSection').classList.add('hidden');
  document.getElementById('orderSection').classList.remove('hidden');
  paymentMethod = null;
}

// Back to QR Scanner
function backToQRScanner() {
  resetGuestView();
}

// Select Payment Method
function selectPaymentMethod(method, element) {
  paymentMethod = method;
  document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('selected'));
  element.classList.add('selected');
}

// Confirm Payment
async function confirmPayment() {
  if (!paymentMethod) {
    showNotification('Kérjük, válassz egy fizetési módot!', 'error');
    return;
  }

  const customerName = document.getElementById('customerName').value.trim();
  const customerEmail = document.getElementById('customerEmail').value.trim();

  if (!customerName) {
    showNotification('Kérjük, add meg a nevedet!', 'error');
    return;
  }

  try {
    // Calculate total
    let totalAmount = 0;
    Object.entries(currentOrder).forEach(([itemId, orderItem]) => {
      totalAmount += orderItem.price * orderItem.quantity;
    });

    // Save orders to database
    const ordersToInsert = Object.entries(currentOrder).map(([itemId, orderItem]) => ({
      table_id: currentTable.id,
      menu_item_id: parseInt(itemId),
      quantity: orderItem.quantity
    }));

    if (ordersToInsert.length > 0) {
      // Delete existing orders
      await supabase
        .from('orders')
        .delete()
        .eq('table_id', currentTable.id);

      // Insert new orders
      const { error: ordersError } = await supabase
        .from('orders')
        .insert(ordersToInsert);

      if (ordersError) throw ordersError;
    }

    // Create payment record
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert({
        table_id: currentTable.id,
        total_amount: totalAmount,
        status: 'completed',
        payment_method: paymentMethod,
        customer_name: customerName,
        customer_email: customerEmail,
        completed_at: new Date().toISOString()
      })
      .select();

    if (paymentError) throw paymentError;

    // Update table status to paying
    await supabase
      .from('tables')
      .update({ status: 'paying' })
      .eq('id', currentTable.id);

    // Show success screen
    document.getElementById('paymentSection').classList.add('hidden');
    document.getElementById('successSection').classList.remove('hidden');
    document.getElementById('receiptNumber').textContent = `#${paymentData[0].id}`;
    document.getElementById('receiptAmount').textContent = totalAmount + ' Ft';

    // Reset table status after 5 seconds
    setTimeout(async () => {
      await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', currentTable.id);
    }, 5000);

  } catch (error) {
    console.error('Error processing payment:', error);
    showNotification('Hiba a fizetés feldolgozásakor', 'error');
  }
}

// ===== HELPER FUNCTIONS =====

function getCategoryName(category) {
  const categories = {
    'appetizer': 'Előétel',
    'main': 'Főétel',
    'dessert': 'Dessert',
    'beverage': 'Ital',
    'other': 'Egyéb'
  };
  return categories[category] || category;
}

// Modal Functions
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function openAddTableModal() {
  document.getElementById('tableNumber').value = '';
  openModal('addTableModal');
}

function openAddMenuItemModal() {
  document.getElementById('menuName').value = '';
  document.getElementById('menuDescription').value = '';
  document.getElementById('menuPrice').value = '';
  document.getElementById('menuCategory').value = 'beverage';
  openModal('addMenuItemModal');
}

// Notifications
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Close modals on background click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});
