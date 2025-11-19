// Configuration
const CONFIG = {
    github: {
        owner: 'dorianguzman',
        repo: 'notas_gc',
        token: '', // Will be set from GitHub Pages environment or user input
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

    // Load sequence and set next remision number
    await loadNextRemision();

    // Add event listeners for calculations
    setupCalculationListeners();

    // Show info message
    showStatus('Sistema cargado. Configure el token de GitHub en la consola si es necesario.', 'info');
});

// GitHub API Functions
async function githubFetch(path, method = 'GET', body = null) {
    const url = `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${path}`;

    const headers = {
        'Authorization': `Bearer ${CONFIG.github.token}`,
        'Accept': 'application/vnd.github.v3+json'
    };

    const options = {
        method,
        headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('GitHub fetch error:', error);
        throw error;
    }
}

async function getFileContent(path) {
    try {
        const data = await githubFetch(path);
        const content = atob(data.content);
        return {
            content: JSON.parse(content),
            sha: data.sha
        };
    } catch (error) {
        console.error(`Error getting file ${path}:`, error);
        return null;
    }
}

async function updateFileContent(path, content, message, sha) {
    const encodedContent = btoa(JSON.stringify(content, null, 2));

    const body = {
        message,
        content: encodedContent,
        sha,
        branch: CONFIG.github.branch
    };

    return await githubFetch(path, 'PUT', body);
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

async function incrementSequence() {
    try {
        const result = await getFileContent('data/secuencia.json');
        const currentNum = parseInt(result.content.ultima);
        const nextNum = String(currentNum + 1).padStart(8, '0');

        await updateFileContent(
            'data/secuencia.json',
            { ultima: nextNum },
            `Actualizar secuencia a ${nextNum}`,
            result.sha
        );

        return nextNum;
    } catch (error) {
        console.error('Error incrementing sequence:', error);
        throw error;
    }
}

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
        total
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

    if (!CONFIG.github.token) {
        showStatus('Configure el token de GitHub primero', 'error');
        const token = prompt('Ingrese el token de GitHub:');
        if (token) {
            CONFIG.github.token = token;
        } else {
            return;
        }
    }

    try {
        showStatus('Guardando remisión...', 'info');

        const data = getRemisionData();

        // Increment sequence
        const newRemision = await incrementSequence();
        document.getElementById('remision').value = newRemision;
        data.remision = newRemision;

        // Add to history
        const historyResult = await getFileContent('data/historial.json');
        const history = historyResult ? historyResult.content : [];
        history.push(data);

        await updateFileContent(
            'data/historial.json',
            history,
            `Agregar remisión ${newRemision}`,
            historyResult.sha
        );

        showStatus(`Remisión ${newRemision} guardada exitosamente`, 'success');

        // Reload next sequence
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

// Configuration helper (to be called from console if needed)
function setGitHubToken(token) {
    CONFIG.github.token = token;
    console.log('GitHub token configured');
}

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
window.setGitHubToken = setGitHubToken;
window.setEmailJSConfig = setEmailJSConfig;
