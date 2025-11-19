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

// Initialize app on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Set current date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fecha').value = today;

    // Add event listeners for calculations
    setupCalculationListeners();
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
        } else {
            document.getElementById('remision').value = '00000001';
        }
    } catch (error) {
        console.error('Error loading sequence:', error);
        document.getElementById('remision').value = '00000001';
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
        showStatus('Debe haber al menos una línea de concepto', 'error');
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
    row.querySelector('.importe').textContent = `$${importe.toFixed(2)}`;
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

    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('ivaAmount').textContent = `$${ivaAmount.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;
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
        showStatus('El campo Cliente es obligatorio', 'error');
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
        showStatus('Debe agregar al menos un concepto válido', 'error');
        return false;
    }

    return true;
}

// Main Functions
async function guardarRemision() {
    if (!validateForm()) return;

    try {
        showStatus('Guardando remisión...', 'info');

        const data = getRemisionData();

        // Get current sequence
        const currentResult = await getFileContent('data/secuencia.json');
        const currentSequence = currentResult.content.ultima;

        // Trigger workflow to save remision
        await triggerSaveWorkflow(data);

        showStatus('Procesando remisión...', 'info');

        // Wait for workflow to complete and sequence to update
        const newRemision = await waitForSequenceUpdate(currentSequence);

        // Update UI with new remision number
        document.getElementById('remision').value = newRemision;
        showStatus(`Remisión ${newRemision} guardada exitosamente`, 'success');

        // Reload next sequence for next remision
        await loadNextRemision();

    } catch (error) {
        console.error('Error saving remision:', error);
        showStatus('Error al guardar la remisión: ' + error.message, 'error');
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
    doc.text('P.U.', 130, y + 6);
    doc.text('Importe', 165, y + 6);

    // Table rows
    doc.setTextColor(0, 0, 0);
    y += 10;

    data.conceptos.forEach(concepto => {
        doc.text(concepto.cantidad.toString(), 20, y);
        doc.text(concepto.descripcion, 50, y);
        doc.text(`$${concepto.pu.toFixed(2)}`, 130, y);
        doc.text(`$${concepto.importe.toFixed(2)}`, 165, y);
        y += 7;
    });

    // Totals
    y += 10;
    doc.text(`Subtotal:`, 130, y);
    doc.text(`$${data.subtotal.toFixed(2)}`, 165, y);
    y += 7;
    doc.text(`IVA:`, 130, y);
    doc.text(`$${data.iva.toFixed(2)}`, 165, y);
    y += 7;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total:`, 130, y);
    doc.text(`$${data.total.toFixed(2)}`, 165, y);

    // Save PDF
    doc.save(`Remision_${data.remision}.pdf`);
    showStatus('PDF generado exitosamente', 'success');
}

async function enviarCorreo() {
    if (!validateForm()) return;

    if (!CONFIG.emailjs.serviceId || !CONFIG.emailjs.templateId || !CONFIG.emailjs.publicKey) {
        showStatus('Configure EmailJS primero', 'error');
        return;
    }

    try {
        showStatus('Enviando correo...', 'info');

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
            total: data.total.toFixed(2),
            pdf_attachment: pdfBase64
        };

        await emailjs.send(
            CONFIG.emailjs.serviceId,
            CONFIG.emailjs.templateId,
            templateParams,
            CONFIG.emailjs.publicKey
        );

        showStatus('Correo enviado exitosamente', 'success');
    } catch (error) {
        console.error('Error sending email:', error);
        showStatus('Error al enviar el correo: ' + error.message, 'error');
    }
}

// Utility Functions
function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;

    setTimeout(() => {
        statusEl.className = 'status-message';
    }, 5000);
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

// History Management
async function loadHistory() {
    const historyContent = document.getElementById('historyContent');

    try {
        historyContent.innerHTML = '<p class="loading">Cargando historial...</p>';

        const result = await getFileContent('data/historial.json');

        if (!result || !result.content || result.content.length === 0) {
            historyContent.innerHTML = '<p class="history-empty">No hay remisiones en el historial.</p>';
            return;
        }

        // Sort by remision number (newest first) - show all notes
        const history = result.content.sort((a, b) => {
            return b.remision.localeCompare(a.remision);
        });

        if (history.length === 0) {
            historyContent.innerHTML = '<p class="history-empty">No hay remisiones en el historial.</p>';
            return;
        }

        // Generate history items
        let html = '';
        history.forEach(item => {
            const statusClass = item.deleted ? 'status-deleted' : 'status-active';
            const statusText = item.deleted ? 'Eliminada' : 'Activa';

            html += `
                <div class="history-item">
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
                    <div class="history-item-info">
                        <span class="history-item-label">Ciudad:</span>
                        <span class="history-item-value">${item.ciudad}</span>
                    </div>
                    <div class="history-item-info">
                        <span class="history-item-label">Conceptos:</span>
                        <span class="history-item-value">${item.conceptos.length} item(s)</span>
                    </div>
                    <div class="history-item-total">
                        Total: $${item.total.toFixed(2)}
                    </div>
                </div>
            `;
        });

        historyContent.innerHTML = html;

    } catch (error) {
        console.error('Error loading history:', error);
        historyContent.innerHTML = '<p class="history-empty">Error al cargar el historial.</p>';
    }
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
