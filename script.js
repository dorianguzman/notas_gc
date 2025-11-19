// Configuration
const CONFIG = {
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

// Remision Number Generation (Timestamp-based)
function generateRemisionNumber() {
    const now = new Date().toLocaleString('en-US', {
        timeZone: 'America/Mexico_City'
    });
    const mexicoDate = new Date(now);

    const year = mexicoDate.getFullYear();
    const month = String(mexicoDate.getMonth() + 1).padStart(2, '0');
    const day = String(mexicoDate.getDate()).padStart(2, '0');
    const hour = String(mexicoDate.getHours()).padStart(2, '0');
    const minute = String(mexicoDate.getMinutes()).padStart(2, '0');

    return `${year}${month}${day}-${hour}${minute}`;
}

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set current date in Mexico timezone
    document.getElementById('fecha').value = getMexicoDate();

    // Set remision number with current timestamp
    document.getElementById('remision').value = generateRemisionNumber();

    // Add event listeners for calculations
    setupCalculationListeners();

    // Set status indicator to ready
    const statusDot = document.getElementById('statusDot');
    if (statusDot) {
        statusDot.classList.add('ready');
        statusDot.setAttribute('title', 'Estado: Lista');
    }
});

// Card Management
function addCard() {
    const container = document.getElementById('conceptosContainer');
    const newCard = document.createElement('div');
    newCard.className = 'concepto-card';
    newCard.innerHTML = `
        <button type="button" class="btn-remove-card" onclick="removeCard(this)">✕</button>
        <div class="card-row">
            <div class="card-field">
                <label>Cantidad</label>
                <input type="number" class="cantidad" min="0" step="0.01" placeholder="0" required>
            </div>
            <div class="card-field">
                <label>Precio Unitario</label>
                <input type="number" class="precio-unitario" min="0" step="0.01" placeholder="0.00" required>
            </div>
        </div>
        <div class="card-row">
            <div class="card-field full-width">
                <label>Descripción</label>
                <input type="text" class="descripcion" placeholder="Descripción del concepto" required>
            </div>
        </div>
        <div class="card-total">
            <span class="importe-label">Importe:</span>
            <span class="importe">$0.00</span>
        </div>
    `;
    container.appendChild(newCard);
    setupCalculationListeners();
}

function removeCard(button) {
    const card = button.closest('.concepto-card');
    const container = document.getElementById('conceptosContainer');

    if (container.children.length > 1) {
        card.remove();
        calculateTotals();
    } else {
        showToast('Debe haber al menos un concepto', 'error');
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
    const card = event.target.closest('.concepto-card');
    updateCardImporte(card);
    calculateTotals();
}

function updateCardImporte(card) {
    if (!card) return;

    const cantidad = parseFloat(card.querySelector('.cantidad')?.value) || 0;
    const precioUnitario = parseFloat(card.querySelector('.precio-unitario')?.value) || 0;
    const importe = cantidad * precioUnitario;

    const importeElement = card.querySelector('.importe');
    if (importeElement) {
        importeElement.textContent = `$${formatNumber(importe)}`;
    }
}

function calculateTotals() {
    const cards = document.querySelectorAll('.concepto-card');
    let subtotal = 0;

    cards.forEach(card => {
        const cantidad = parseFloat(card.querySelector('.cantidad')?.value) || 0;
        const precioUnitario = parseFloat(card.querySelector('.precio-unitario')?.value) || 0;
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
    const cards = document.querySelectorAll('.concepto-card');
    cards.forEach(card => {
        const cantidad = parseFloat(card.querySelector('.cantidad')?.value) || 0;
        const descripcion = card.querySelector('.descripcion')?.value || '';
        const pu = parseFloat(card.querySelector('.precio-unitario')?.value) || 0;
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

    const subtotalText = document.getElementById('subtotal').textContent.replace(/[$,]/g, '');
    const ivaText = document.getElementById('ivaAmount').textContent.replace(/[$,]/g, '');
    const totalText = document.getElementById('total').textContent.replace(/[$,]/g, '');

    return {
        fecha,
        remision,
        cliente,
        ciudad,
        conceptos,
        subtotal: parseFloat(subtotalText),
        iva: parseFloat(ivaText),
        total: parseFloat(totalText)
    };
}

// Validation
function validateForm() {
    const cliente = document.getElementById('cliente').value.trim();
    if (!cliente) {
        showToast('El campo Cliente es obligatorio', 'error');
        return false;
    }

    const cards = document.querySelectorAll('.concepto-card');
    let hasValidCard = false;

    for (const card of cards) {
        const cantidad = parseFloat(card.querySelector('.cantidad').value) || 0;
        const descripcion = card.querySelector('.descripcion').value.trim();
        const pu = parseFloat(card.querySelector('.precio-unitario').value) || 0;

        if (cantidad > 0 && descripcion && pu > 0) {
            hasValidCard = true;
            break;
        }
    }

    if (!hasValidCard) {
        showToast('Debe agregar al menos un concepto válido', 'error');
        return false;
    }

    return true;
}

// PDF Generation
async function generarPDF() {
    if (!validateForm()) return;

    try {
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
                img.onerror = resolve;
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
        doc.setFillColor(45, 45, 45);
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
            doc.text(`$${formatNumber(concepto.pu)}`, 115, y);
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

    } catch (error) {
        console.error('Error generating PDF:', error);
        showToast('Error al generar el PDF: ' + error.message, 'error');
    }
}

// Email Sending
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

        // (Same PDF generation as above - simplified for email)
        doc.setFontSize(20);
        doc.text('Nota de Remisión', 105, 30, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Remisión: ${data.remision}`, 15, 50);
        doc.text(`Cliente: ${data.cliente}`, 15, 60);
        doc.text(`Total: $${formatNumber(data.total)}`, 15, 70);

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

// Nueva Nota - Clear form and start fresh
function nuevaNota() {
    // Clear form inputs
    document.getElementById('cliente').value = '';
    document.getElementById('ciudad').value = 'Querétaro';

    // Reset date and remision with fresh timestamp
    document.getElementById('fecha').value = getMexicoDate();
    document.getElementById('remision').value = generateRemisionNumber();

    // Clear all concept cards and add one empty card
    const container = document.getElementById('conceptosContainer');
    container.innerHTML = `
        <div class="concepto-card">
            <button type="button" class="btn-remove-card" onclick="removeCard(this)">✕</button>
            <div class="card-row">
                <div class="card-field">
                    <label>Cantidad</label>
                    <input type="number" class="cantidad" min="0" step="0.01" placeholder="0" required>
                </div>
                <div class="card-field">
                    <label>Precio Unitario</label>
                    <input type="number" class="precio-unitario" min="0" step="0.01" placeholder="0.00" required>
                </div>
            </div>
            <div class="card-row">
                <div class="card-field full-width">
                    <label>Descripción</label>
                    <input type="text" class="descripcion" placeholder="Descripción del concepto" required>
                </div>
            </div>
            <div class="card-total">
                <span class="importe-label">Importe:</span>
                <span class="importe">$0.00</span>
            </div>
        </div>
    `;

    // Reset IVA to default
    document.getElementById('iva').value = '16';

    // Recalculate totals (will show $0.00)
    setupCalculationListeners();
    calculateTotals();

    // Show feedback
    showToast('Nueva nota lista', 'success');
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

// Expose functions globally
window.addCard = addCard;
window.removeCard = removeCard;
window.generarPDF = generarPDF;
window.enviarCorreo = enviarCorreo;
window.nuevaNota = nuevaNota;
