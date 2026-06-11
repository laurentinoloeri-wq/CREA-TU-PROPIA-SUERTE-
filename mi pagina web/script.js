const STORAGE_KEY = 'ctps_orders'; // clave usada para persistir pedidos en localStorage

let cart = []; // carrito temporal del cliente antes de enviar el pedido
let ordersMasterList = []; // lista maestra de pedidos para personal y administrador
let orderIncrementId = 1001; // identificador secuencial para cada nuevo pedido

let currentAuthRole = ''; // rol activo en el modal de autenticación

// Guarda la lista de pedidos actual en el almacenamiento local del navegador.
function saveOrdersToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ordersMasterList));
}

// Carga los pedidos guardados al iniciar la aplicación.
function loadOrdersFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            ordersMasterList = JSON.parse(saved);
        } catch (error) {
            console.error('Error al cargar pedidos desde localStorage:', error);
            ordersMasterList = [];
        }
    } else {
        ordersMasterList = [];
    }
}

// Actualiza las tablas de personal y administrador con los pedidos sincronizados.
function syncOrderTables() {
    renderPersonalTable();
    renderAdminTable();
}

// Muestra u oculta la ventana del carrito de compras en la página.
function toggleCart() {
    const cartWindow = document.getElementById('shopping-cart-window');
    if (cartWindow.style.display === 'block') {
        cartWindow.style.display = 'none';
    } else {
        cartWindow.style.display = 'block';
        alert("Abriendo el carrito de compras. Aquí puedes revisar tus artículos seleccionados.");
    }
}

// Añade el producto seleccionado al carrito con la cantidad indicada.
function addToCart(buttonElement) {
    const card = buttonElement.closest('.card-product');
    const id = card.getAttribute('data-id');
    const name = card.getAttribute('data-name');
    const price = parseInt(card.getAttribute('data-price'));
    const quantityInput = card.querySelector('.product-qty');
    const quantity = parseInt(quantityInput.value);

    if (quantity <= 0 || isNaN(quantity)) {
        alert("Por favor, introduce una cantidad válida.");
        return;
    }

    const existingIndex = cart.findIndex(item => item.id === id);

    if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        cart.push({ id, name, price, quantity });
    }

    alert(`¡Selección registrada!\nSe han añadido ${quantity} unidad(es) de "${name}" al espacio de confirmación.`);
    quantityInput.value = 1;
    updateCartUI();
}

/* Actualiza el contador del carrito, la lista de productos y el total visible. */
function updateCartUI() {
    const countElement = document.getElementById('cart-count');
    const container = document.getElementById('cart-items-container');
    const totalElement = document.getElementById('cart-total-price');

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    countElement.innerText = totalItems;

    if (cart.length === 0) {
        container.innerHTML = `<p style="font-size: 1.2rem; color: #777; text-align: center;">El carrito está vacío</p>`;
        totalElement.innerText = "Total: 0 XAF";
        return;
    }

    container.innerHTML = "";
    let grandTotal = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        grandTotal += itemTotal;

        const row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `
            <span><strong>${item.name}</strong> (x${item.quantity})</span>
            <span>${itemTotal.toLocaleString()} XAF</span>
        `;
        container.appendChild(row);
    });

    totalElement.innerText = `Total: ${grandTotal.toLocaleString()} XAF`;
}

/* Convierte los productos del carrito en un pedido, lo guarda y actualiza las tablas. */
function checkoutCart() {
    if (cart.length === 0) {
        alert("El carrito está vacío. Agrega algún producto para realizar un pedido.");
        return;
    }

    const dateNow = new Date();
    const formattedDate = `${dateNow.toLocaleDateString()} ${dateNow.toLocaleTimeString()}`;
    
    let description = cart.map(item => `${item.name} (x${item.quantity})`).join(', ');
    let totalCost = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const newOrder = {
        id: orderIncrementId++,
        date: formattedDate,
        itemsDescription: description,
        total: totalCost,
        status: "Pendiente"
    };

    ordersMasterList.push(newOrder);
    saveOrdersToStorage();

    alert(`📦 ¡Pedido enviado con éxito!\nEl mensaje ha llegado al Panel de Personal para su correspondiente confirmación o rechazo.`);

    cart = [];
    updateCartUI();
    const cartWindow = document.getElementById('shopping-cart-window');
    if (cartWindow) cartWindow.style.display = 'none';

    syncOrderTables();
}

/* Dibuja la tabla de pedidos pendientes que el personal debe confirmar o rechazar. */
function renderPersonalTable() {
    const tbody = document.getElementById('personal-table-body');
    if (!tbody) return;

    const pendingOrders = ordersMasterList.filter(o => o.status === "Pendiente");

    if (pendingOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; font-size:1.3rem; padding:2rem; color:#777;">No hay pedidos pendientes de validar en este momento.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    pendingOrders.forEach(order => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#${order.id}</strong></td>
            <td>${order.itemsDescription}</td>
            <td><strong>${order.total.toLocaleString()} XAF</strong></td>
            <td>
                <button class="btn-action btn-approve" onclick="changeOrderStatus(${order.id}, 'Confirmado')">Confirmar</button>
                <button class="btn-action btn-reject" onclick="changeOrderStatus(${order.id}, 'Rechazado')">Rechazar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/* Dibuja el historial completo de pedidos para que el administrador lo revise. */
function renderAdminTable() {
    const tbody = document.getElementById('admin-table-body');
    if (!tbody) return;

    if (ordersMasterList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; font-size:1.3rem; padding:2rem; color:#aaa;">Historial maestro vacío.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    ordersMasterList.forEach(order => {
        let statusStyle = "color: #f1c40f;";
        if (order.status === "Confirmado") statusStyle = "color: #2ecc71; font-weight: bold;";
        if (order.status === "Rechazado") statusStyle = "color: #e74c3c; text-decoration: line-through;";

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#${order.id}</strong></td>
            <td><i class='bx bx-time-five'></i> ${order.date}</td>
            <td>${order.itemsDescription}</td>
            <td style="color: #6495ed; font-weight:bold;">${order.total.toLocaleString()} XAF</td>
            <td style="${statusStyle}">${order.status}</td>
        `;
        tbody.appendChild(tr);
    });
}

/* Cambia el estado de un pedido y refresca las tablas para personal y admin. */
function changeOrderStatus(orderId, newStatus) {
    const order = ordersMasterList.find(o => o.id === orderId);
    if (order) {
        order.status = newStatus;
        // Guarda el cambio de estado para que personal y administrador vean el resultado.
        saveOrdersToStorage();
        alert(`Estado del pedido #${orderId} actualizado a: "${newStatus}"`);
        renderPersonalTable();
        renderAdminTable();
    }
}

/* Muestra el ventana modal de contraseña para acceso de personal o administrador. */
function openAuthModal(role) {
    currentAuthRole = role;
    const modal = document.getElementById('auth-modal');
    const title = document.getElementById('auth-modal-title');
    const desc = document.getElementById('auth-modal-desc');
    const input = document.getElementById('auth-password-input');

    input.value = '';

    if (role === 'personal') {
        title.innerHTML = "<i class='bx bx-briefcase'></i> Acceso Personal";
        desc.innerText = "Por favor, introduce la contraseña de personal (1234) para gestionar pedidos.";
    } else if (role === 'admin') {
        title.innerHTML = "<i class='bx bx-shield-quarter'></i> Panel de Administrador";
        desc.innerText = "Introduce la clave de Administrador (22) para auditar el historial de ventas.";
    }

    modal.style.display = 'flex';
    input.focus();
}

/* Cierra el modal de autenticación y limpia el rol temporal seleccionado. */
function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
    currentAuthRole = '';
}

/* Valida la contraseña ingresada y redirige al panel correspondiente. */
function verifyPassword() {
    const inputPassword = document.getElementById('auth-password-input').value.trim();

    if (currentAuthRole === 'personal') {
        if (inputPassword === '1234') {
            alert('🔑 ¡Contraseña correcta! Redirigiendo al Panel de Personal.');
            closeAuthModal();
            window.location.href = './indexpanel-personal.html';
            return;
        }
        alert('❌ Contraseña incorrecta. Acceso Personal denegado.');
        return;
    }

    if (currentAuthRole === 'admin') {
        if (inputPassword === '22') {
            alert('👑 ¡Contraseña correcta! Redirigiendo al Panel de Administrador.');
            closeAuthModal();
            window.location.href = './indexpanel-admin.html';
            return;
        }
        alert('❌ Contraseña incorrecta. Acceso Admin denegado.');
        return;
    }

    alert('Selecciona primero el tipo de acceso: Personal o Admin.');
}

/* Envía la verificación de contraseña cuando el usuario presiona Enter. */
function handleAuthKeyPress(event) {
    if (event.key === 'Enter') {
        verifyPassword();
    }
}

/* Configura los enlaces de acceso para abrir el modal de autenticación. */
function setupAuthLinks() {
    const authLinks = document.querySelectorAll('.auth-link');
    authLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const role = this.dataset.authRole;
            openAuthModal(role);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupAuthLinks();
    loadOrdersFromStorage();
    syncOrderTables();
});