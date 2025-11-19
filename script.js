// Configuration
const CONFIG = {
    github: {
        owner: 'dorianguzman',
        repo: 'notas_gc',
        branch: 'main'
    },
    emailjs: {
        serviceId: '', // To be configured
        templateId: '', // To be configured
        publicKey: '' // To be configured
    }
};

// Utility function to format numbers with comma separators
function formatNumber(number, decimals = 2) {
    return number.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// Utility function to get current date in Mexico timezone
function getMexicoDate() {
    return new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Initialize app on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Set current date in Mexico timezone (America/Mexico_City)
    document.getElementById('fecha').value = getMexicoDate();

    // Add event listeners for calculations
    setupCalculationListeners();

    // Initialize status monitoring
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
});

// GitHub Workflow Functions
async function getFileContent(path) {
    try {
        // Use local path for localhost, GitHub raw URL for production
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const url = isLocalhost
            ? `/${path}`
            : `https://raw.githubusercontent.com/${CONFIG.github.owner}/${CONFIG.github.repo}/${CONFIG.github.branch}/${path}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Error fetching file: ${response.status}`);
        }

        const content = await response.json();
        return { content };
    } catch (error) {
        console.error(`Error getting file ${path}:`, error);
        return null;
    }
}

async function triggerSaveWorkflow(remisionData) {
    try {
        // Trigger the save-remision workflow
        const url = `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/actions/workflows/save-remision.yml/dispatches`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ref: CONFIG.github.branch,
                inputs: {
                    fecha: remisionData.fecha,
                    cliente: remisionData.cliente,
                    ciudad: remisionData.ciudad,
                    conceptos: JSON.stringify(remisionData.conceptos),
                    subtotal: remisionData.subtotal.toString(),
                    iva: remisionData.iva.toString(),
                    total: remisionData.total.toString()
                }
            })
        });

        if (response.status === 204) {
            // Workflow triggered successfully
            return { success: true };
        } else {
            throw new Error(`Failed to trigger workflow: ${response.status}`);
        }
    } catch (error) {
        console.error('Error triggering workflow:', error);
        throw error;
    }
}

async function waitForSequenceUpdate(currentSequence, maxAttempts = 30) {
    // Wait for the workflow to complete and update the sequence
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

        const result = await getFileContent('data/secuencia.json');
        if (result && result.content.ultima !== currentSequence) {
            return result.content.ultima;
        }
    }

    throw new Error('Timeout esperando actualización de secuencia');
}

// Sequence Management
async function loadNextRemision() {
    try {
        const result = await getFileContent('data/secuencia.json');
        if (result) {
            const currentNum = parseInt(result.content.ultima);
            const nextNum = String(currentNum + 1).padStart(8, '0');
            document.getElementById('remision').value = nextNum;
            updateDataStatus(true, 'Secuencia cargada');
        } else {
            document.getElementById('remision').value = '00000001';
            updateDataStatus(true, 'Secuencia inicial');
        }
    } catch (error) {
        console.error('Error loading sequence:', error);
        document.getElementById('remision').value = '00000001';
        updateDataStatus(false, 'Error de secuencia');
    }
}

// Sequence increment is now handled by the workflow

// Table Management
function addRow() {
    const tbody = document.getElementById('conceptosBody');
    const newRow = document.createElement('tr');
    newRow.className = 'concepto-row';
    newRow.innerHTML = `
        <td><input type="number" class="cantidad" min="0" step="0.01" placeholder="0" required></td>
        <td><input type="text" class="descripcion" placeholder="Descripción" required></td>
        <td><input type="number" class="precio-unitario" min="0" step="0.01" placeholder="0.00" required></td>
        <td class="importe">$0.00</td>
        <td><button type="button" class="btn-remove" onclick="removeRow(this)">✕</button></td>
    `;
    tbody.appendChild(newRow);
    setupCalculationListeners();
}

function removeRow(button) {
    const row = button.closest('tr');
    const tbody = document.getElementById('conceptosBody');
    if (tbody.children.length > 1) {
        row.remove();
        calculateTotals();
    } else {
        showToast('Debe haber al menos una línea de concepto', 'error');
    }
}

// Calculations
function setupCalculationListeners() {
    const inputs = document.querySelectorAll('.cantidad, .precio-unitario');
    inputs.forEach(input => {
        input.removeEventListener('input', handleInputChange);
        input.addEventListener('input', handleInputChange);
    });

    const ivaInput = document.getElementById('iva');
    ivaInput.removeEventListener('input', calculateTotals);
    ivaInput.addEventListener('input', calculateTotals);
}

function handleInputChange(event) {
    const row = event.target.closest('tr');
    updateRowImporte(row);
    calculateTotals();
}

function updateRowImporte(row) {
    const cantidad = parseFloat(row.querySelector('.cantidad').value) || 0;
    const precioUnitario = parseFloat(row.querySelector('.precio-unitario').value) || 0;
    const importe = cantidad * precioUnitario;
    row.querySelector('.importe').textContent = `$${formatNumber(importe)}`;
}

function calculateTotals() {
    const rows = document.querySelectorAll('.concepto-row');
    let subtotal = 0;

    rows.forEach(row => {
        const cantidad = parseFloat(row.querySelector('.cantidad').value) || 0;
        const precioUnitario = parseFloat(row.querySelector('.precio-unitario').value) || 0;
        subtotal += cantidad * precioUnitario;
    });

    const ivaPercent = parseFloat(document.getElementById('iva').value) || 0;
    const ivaAmount = subtotal * (ivaPercent / 100);
    const total = subtotal + ivaAmount;

    document.getElementById('subtotal').textContent = `$${formatNumber(subtotal)}`;
    document.getElementById('ivaAmount').textContent = `$${formatNumber(ivaAmount)}`;
    document.getElementById('total').textContent = `$${formatNumber(total)}`;
}

// Data Collection
function getRemisionData() {
    const fecha = document.getElementById('fecha').value;
    const remision = document.getElementById('remision').value;
    const cliente = document.getElementById('cliente').value;
    const ciudad = document.getElementById('ciudad').value;

    const conceptos = [];
    const rows = document.querySelectorAll('.concepto-row');
    rows.forEach(row => {
        const cantidad = parseFloat(row.querySelector('.cantidad').value) || 0;
        const descripcion = row.querySelector('.descripcion').value;
        const pu = parseFloat(row.querySelector('.precio-unitario').value) || 0;
        const importe = cantidad * pu;

        if (cantidad > 0 && descripcion) {
            conceptos.push({
                cantidad,
                descripcion,
                pu,
                importe
            });
        }
    });

    const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace('$', ''));
    const iva = parseFloat(document.getElementById('ivaAmount').textContent.replace('$', ''));
    const total = parseFloat(document.getElementById('total').textContent.replace('$', ''));

    return {
        fecha,
        remision,
        cliente,
        ciudad,
        conceptos,
        subtotal,
        iva,
        total,
        deleted: false
    };
}

// Validation
function validateForm() {
    const cliente = document.getElementById('cliente').value.trim();
    if (!cliente) {
        showToast('El campo Cliente es obligatorio', 'error');
        return false;
    }

    const rows = document.querySelectorAll('.concepto-row');
    let hasValidRow = false;

    for (const row of rows) {
        const cantidad = parseFloat(row.querySelector('.cantidad').value) || 0;
        const descripcion = row.querySelector('.descripcion').value.trim();
        const pu = parseFloat(row.querySelector('.precio-unitario').value) || 0;

        if (cantidad > 0 && descripcion && pu > 0) {
            hasValidRow = true;
            break;
        }
    }

    if (!hasValidRow) {
        showToast('Debe agregar al menos un concepto válido', 'error');
        return false;
    }

    return true;
}

// Main Functions
async function guardarRemision() {
    if (!validateForm()) return;

    try {
        showToast('Guardando remisión...', 'info');

        const data = getRemisionData();

        // Get current sequence
        const currentResult = await getFileContent('data/secuencia.json');
        const currentSequence = currentResult.content.ultima;

        // Trigger workflow to save remision
        await triggerSaveWorkflow(data);

        showToast('Procesando remisión...', 'info');

        // Wait for workflow to complete and sequence to update
        const newRemision = await waitForSequenceUpdate(currentSequence);

        // Update UI with new remision number
        document.getElementById('remision').value = newRemision;
        showToast(`Remisión ${newRemision} guardada exitosamente`, 'success');

        // Reload next sequence for next remision
        await loadNextRemision();

    } catch (error) {
        console.error('Error saving remision:', error);
        showToast('Error al guardar la remisión: ' + error.message, 'error');
    }
}

async function generarPDF() {
    if (!validateForm()) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const data = getRemisionData();

    // Add logo
    try {
        const img = new Image();
        img.src = 'assets/logo.png';
        await new Promise((resolve) => {
            img.onload = () => {
                doc.addImage(img, 'PNG', 15, 10, 40, 40);
                resolve();
            };
            img.onerror = resolve; // Continue even if logo fails
        });
    } catch (e) {
        console.warn('Logo not loaded');
    }

    // Title
    doc.setFontSize(20);
    doc.text('Nota de Remisión', 105, 30, { align: 'center' });

    // Header info
    doc.setFontSize(12);
    doc.text(`Fecha: ${data.fecha}`, 15, 60);
    doc.text(`Remisión: ${data.remision}`, 150, 60);
    doc.text(`Cliente: ${data.cliente}`, 15, 70);
    doc.text(`Ciudad: ${data.ciudad}`, 15, 80);

    // Table
    doc.setFontSize(10);
    let y = 95;

    // Table header
    doc.setFillColor(102, 126, 234);
    doc.setTextColor(255, 255, 255);
    doc.rect(15, y, 180, 8, 'F');
    doc.text('Cantidad', 20, y + 6);
    doc.text('Concepto', 50, y + 6);
    doc.text('Precio Unitario', 115, y + 6);
    doc.text('Importe', 165, y + 6);

    // Table rows
    doc.setTextColor(0, 0, 0);
    y += 10;

    data.conceptos.forEach(concepto => {
        doc.text(formatNumber(concepto.cantidad, 0), 20, y);
        doc.text(concepto.descripcion, 50, y);
        doc.text(`$${formatNumber(concepto.pu)}`, 130, y);
        doc.text(`$${formatNumber(concepto.importe)}`, 165, y);
        y += 7;
    });

    // Totals
    y += 10;
    doc.text(`Subtotal:`, 130, y);
    doc.text(`$${formatNumber(data.subtotal)}`, 165, y);
    y += 7;
    doc.text(`IVA:`, 130, y);
    doc.text(`$${formatNumber(data.iva)}`, 165, y);
    y += 7;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total:`, 130, y);
    doc.text(`$${formatNumber(data.total)}`, 165, y);

    // Save PDF
    doc.save(`Remision_${data.remision}.pdf`);
    showToast('PDF generado exitosamente', 'success');
}

async function enviarCorreo() {
    if (!validateForm()) return;

    if (!CONFIG.emailjs.serviceId || !CONFIG.emailjs.templateId || !CONFIG.emailjs.publicKey) {
        showToast('Configure EmailJS primero', 'error');
        return;
    }

    try {
        showToast('Enviando correo...', 'info');

        const data = getRemisionData();

        // Generate PDF as base64
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        // ... (same PDF generation logic as above)

        const pdfBase64 = doc.output('datauristring').split(',')[1];

        // Send email via EmailJS
        const templateParams = {
            remision: data.remision,
            cliente: data.cliente,
            fecha: data.fecha,
            total: formatNumber(data.total),
            pdf_attachment: pdfBase64
        };

        await emailjs.send(
            CONFIG.emailjs.serviceId,
            CONFIG.emailjs.templateId,
            templateParams,
            CONFIG.emailjs.publicKey
        );

        showToast('Correo enviado exitosamente', 'success');
    } catch (error) {
        console.error('Error sending email:', error);
        showToast('Error al enviar el correo: ' + error.message, 'error');
    }
}

// Screen Navigation
function showScreen(screenId) {
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.style.display = 'none';
    });

    // Show selected screen
    const selectedScreen = document.getElementById(screenId);
    if (selectedScreen) {
        selectedScreen.style.display = 'block';
    }

    // Load data if needed
    if (screenId === 'formScreen') {
        loadNextRemision();
    } else if (screenId === 'historyScreen') {
        loadHistory();
    }
}

// Global variable to store history data
let historyData = [];
let currentFilter = 'all';

// Status Management
function updateOnlineStatus() {
    const statusEl = document.getElementById('onlineStatus');
    const isOnline = navigator.onLine;

    statusEl.classList.remove('online', 'offline', 'checking');

    if (isOnline) {
        statusEl.classList.add('online');
        statusEl.querySelector('.status-text').textContent = 'En línea';
    } else {
        statusEl.classList.add('offline');
        statusEl.querySelector('.status-text').textContent = 'Sin conexión';
    }
}

function updateDataStatus(success, message = '') {
    const statusEl = document.getElementById('dataStatus');
    statusEl.style.display = 'flex';

    statusEl.classList.remove('data-success', 'data-error');

    if (success) {
        statusEl.classList.add('data-success');
        statusEl.querySelector('.status-text').textContent = message || 'Sincronizado';
    } else {
        statusEl.classList.add('data-error');
        statusEl.querySelector('.status-text').textContent = message || 'Error de datos';
    }
}

// History Management
async function loadHistory() {
    const historyContent = document.getElementById('historyContent');

    try {
        historyContent.innerHTML = '<p class="loading">Cargando historial...</p>';

        const result = await getFileContent('data/historial.json');

        if (!result || !result.content || result.content.length === 0) {
            historyContent.innerHTML = '<p class="history-empty">No hay remisiones en el historial.</p>';
            updateDataStatus(true, 'Sin datos');
            return;
        }

        // Store and sort by remision number (newest first)
        historyData = result.content.sort((a, b) => {
            return b.remision.localeCompare(a.remision);
        });

        // Apply localStorage overrides (for local testing)
        applyLocalStorageOverrides();

        // Render with current filter
        renderHistory();

        // Update status indicator
        updateDataStatus(true, `${historyData.length} remisiones`);

    } catch (error) {
        console.error('Error loading history:', error);
        historyContent.innerHTML = '<p class="history-empty">Error al cargar el historial.</p>';
        updateDataStatus(false, 'Error al cargar');
    }
}

function applyLocalStorageOverrides() {
    // Load deleted states from localStorage
    const deletedStates = JSON.parse(localStorage.getItem('deletedStates') || '{}');

    // Apply to historyData
    historyData.forEach(item => {
        if (deletedStates.hasOwnProperty(item.remision)) {
            item.deleted = deletedStates[item.remision];
        }
    });
}

function saveDeletedStateToLocalStorage(remisionNumber, deleted) {
    const deletedStates = JSON.parse(localStorage.getItem('deletedStates') || '{}');
    deletedStates[remisionNumber] = deleted;
    localStorage.setItem('deletedStates', JSON.stringify(deletedStates));
}

function filterHistory(filter) {
    currentFilter = filter;

    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

    // Re-render history
    renderHistory();
}

function renderHistory() {
    const historyContent = document.getElementById('historyContent');

    // Filter data based on current filter
    let filteredData = historyData;
    if (currentFilter === 'active') {
        filteredData = historyData.filter(item => !item.deleted);
    } else if (currentFilter === 'deleted') {
        filteredData = historyData.filter(item => item.deleted);
    }

    if (filteredData.length === 0) {
        historyContent.innerHTML = '<p class="history-empty">No hay remisiones para mostrar.</p>';
        return;
    }

    // Generate history items
    let html = '';
    filteredData.forEach(item => {
        const statusClass = item.deleted ? 'status-deleted' : 'status-active';
        const statusText = item.deleted ? 'Eliminada' : 'Activa';

        html += `
            <div class="history-item" onclick="showDetailModal('${item.remision}')">
                <div class="history-item-header">
                    <div class="history-item-title-row">
                        <div class="history-item-remision">Remisión #${item.remision}</div>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="history-item-date">${item.fecha}</div>
                </div>
                <div class="history-item-info">
                    <span class="history-item-label">Cliente:</span>
                    <span class="history-item-value">${item.cliente}</span>
                </div>
                <div class="history-item-total">
                    Total: $${formatNumber(item.total)}
                </div>
            </div>
        `;
    });

    historyContent.innerHTML = html;
}

// Modal Management
function showDetailModal(remisionNumber) {
    const item = historyData.find(h => h.remision === remisionNumber);
    if (!item) return;

    const modal = document.getElementById('detailModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    const statusClass = item.deleted ? 'status-deleted' : 'status-active';
    const statusText = item.deleted ? 'Eliminada' : 'Activa';

    // Build conceptos table
    let conceptosHtml = '';
    item.conceptos.forEach(concepto => {
        conceptosHtml += `
            <tr>
                <td>${formatNumber(concepto.cantidad, 0)}</td>
                <td>${concepto.descripcion}</td>
                <td>$${formatNumber(concepto.pu)}</td>
                <td>$${formatNumber(concepto.importe)}</td>
            </tr>
        `;
    });

    modalTitle.innerHTML = `
        Remisión #${item.remision}
        <span class="status-badge ${statusClass}">${statusText}</span>
    `;

    modalBody.innerHTML = `
        <div class="modal-section">
            <div class="modal-info-row">
                <span class="modal-label">Fecha:</span>
                <span class="modal-value">${item.fecha}</span>
            </div>
            <div class="modal-info-row">
                <span class="modal-label">Cliente:</span>
                <span class="modal-value">${item.cliente}</span>
            </div>
            <div class="modal-info-row">
                <span class="modal-label">Ciudad:</span>
                <span class="modal-value">${item.ciudad}</span>
            </div>
        </div>

        <div class="modal-section">
            <h4>Conceptos</h4>
            <table class="modal-table">
                <thead>
                    <tr>
                        <th>Cant.</th>
                        <th>Descripción</th>
                        <th>Precio<br>Unitario</th>
                        <th>Importe</th>
                    </tr>
                </thead>
                <tbody>
                    ${conceptosHtml}
                </tbody>
            </table>
        </div>

        <div class="modal-section modal-totals">
            <div class="modal-total-row">
                <span>Subtotal:</span>
                <span>$${formatNumber(item.subtotal)}</span>
            </div>
            <div class="modal-total-row">
                <span>IVA:</span>
                <span>$${formatNumber(item.iva)}</span>
            </div>
            <div class="modal-total-row modal-total-final">
                <span>Total:</span>
                <span>$${formatNumber(item.total)}</span>
            </div>
        </div>

        <div class="modal-actions">
            ${item.deleted
                ? `<button type="button" class="btn-modal btn-restore" onclick="toggleDeleteRemision('${item.remision}', false)">
                    <svg class="icon-inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 3h18v18H3z"></path>
                        <path d="M9 9h6v6H9z"></path>
                    </svg>
                    Restaurar
                   </button>`
                : `<button type="button" class="btn-modal btn-delete" onclick="toggleDeleteRemision('${item.remision}', true)">
                    <svg class="icon-inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Eliminar
                   </button>`
            }
        </div>
    `;

    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
}

function closeModalOnBackdrop(event) {
    if (event.target.id === 'detailModal') {
        closeModal();
    }
}

function toggleDeleteRemision(remisionNumber, setDeleted) {
    if (setDeleted) {
        // Delete confirmation
        showConfirm({
            title: 'Eliminar Remisión',
            message: `¿Estás seguro de eliminar la remisión #${remisionNumber}? Esta acción marcará la nota como eliminada.`,
            type: 'danger',
            confirmText: 'Eliminar',
            onConfirm: () => {
                performDeleteToggle(remisionNumber, true);
            }
        });
    } else {
        // Restore confirmation
        showConfirm({
            title: 'Restaurar Remisión',
            message: `¿Deseas restaurar la remisión #${remisionNumber}?`,
            type: 'success',
            confirmText: 'Restaurar',
            onConfirm: () => {
                performDeleteToggle(remisionNumber, false);
            }
        });
    }
}

async function performDeleteToggle(remisionNumber, setDeleted) {
    try {
        showToast(setDeleted ? 'Eliminando remisión...' : 'Restaurando remisión...', 'info');

        // Update local data
        const item = historyData.find(h => h.remision === remisionNumber);
        if (!item) {
            showToast('No se encontró la remisión', 'error');
            return;
        }

        item.deleted = setDeleted;

        // Save to localStorage for local testing
        saveDeletedStateToLocalStorage(remisionNumber, setDeleted);

        // TODO: In production, trigger GitHub workflow to update historial.json

        showToast(
            setDeleted
                ? `Remisión #${remisionNumber} eliminada`
                : `Remisión #${remisionNumber} restaurada`,
            'success'
        );

        // Close detail modal and refresh history view
        closeModal();
        renderHistory();

    } catch (error) {
        console.error('Error toggling delete:', error);
        showToast('Error al actualizar la remisión', 'error');
    }
}

// Confirmation Modal
function showConfirm({ title, message, type = 'danger', confirmText = 'Confirmar', onConfirm }) {
    const modal = document.getElementById('confirmModal');
    const iconEl = document.getElementById('confirmIcon');
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    const actionBtn = document.getElementById('confirmActionBtn');

    // Set content
    titleEl.textContent = title;
    messageEl.textContent = message;
    actionBtn.textContent = confirmText;

    // Set icon
    iconEl.className = `confirm-icon icon-${type}`;
    if (type === 'danger') {
        iconEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        `;
        actionBtn.className = 'btn-confirm-action danger';
    } else {
        iconEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
        `;
        actionBtn.className = 'btn-confirm-action success';
    }

    // Set action
    actionBtn.onclick = () => {
        closeConfirmModal();
        if (onConfirm) onConfirm();
    };

    modal.style.display = 'flex';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

// Toast Notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = '';
    if (type === 'success') {
        icon = `
            <svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
        `;
    } else if (type === 'error') {
        icon = `
            <svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
        `;
    } else {
        icon = `
            <svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
        `;
    }

    toast.innerHTML = `
        ${icon}
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Configuration helper (to be called from console if needed)
function setEmailJSConfig(serviceId, templateId, publicKey) {
    CONFIG.emailjs.serviceId = serviceId;
    CONFIG.emailjs.templateId = templateId;
    CONFIG.emailjs.publicKey = publicKey;
    console.log('EmailJS configured');
}

// Expose functions globally
window.addRow = addRow;
window.removeRow = removeRow;
window.guardarRemision = guardarRemision;
window.generarPDF = generarPDF;
window.enviarCorreo = enviarCorreo;
window.setEmailJSConfig = setEmailJSConfig;
window.showScreen = showScreen;
window.filterHistory = filterHistory;
window.showDetailModal = showDetailModal;
window.closeModal = closeModal;
window.closeModalOnBackdrop = closeModalOnBackdrop;
window.toggleDeleteRemision = toggleDeleteRemision;
window.performDeleteToggle = performDeleteToggle;
window.showConfirm = showConfirm;
window.closeConfirmModal = closeConfirmModal;
window.showToast = showToast;
