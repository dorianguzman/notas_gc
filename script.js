// Configuration
const CONFIG = {
    googleAppsScriptUrl: 'https://script.google.com/macros/s/AKfycbxggnk7le4uSWEz05JJpgo_GURh7IDUYbzGZgaCg8pi9SNVipSI4guWmtvnHq9xWLEX/exec'
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

    // Add event listener for email button state
    const emailInput = document.getElementById('clienteEmail');
    emailInput.addEventListener('input', updateEmailButtonState);

    // Set initial email button state
    updateEmailButtonState();

    // Set status indicator to ready
    const statusDot = document.getElementById('statusDot');
    if (statusDot) {
        statusDot.classList.add('ready');
        statusDot.setAttribute('title', 'Estado: Lista');
    }

    // Load autocomplete data
    loadAutocompleteData();
});

// Global autocomplete data
let clientNames = [];
let productNames = [];
let clientEmails = [];

// Load historical data for autocomplete
async function loadAutocompleteData() {
    try {
        // Fetch both monthly reports
        const [thisMonthResponse, lastMonthResponse] = await Promise.all([
            fetch('data/this_month.json'),
            fetch('data/last_month.json')
        ]);

        if (!thisMonthResponse.ok || !lastMonthResponse.ok) {
            console.log('Could not load autocomplete data');
            return;
        }

        const thisMonthData = await thisMonthResponse.json();
        const lastMonthData = await lastMonthResponse.json();

        // Combine all records
        const allRecords = [
            ...(thisMonthData.records || []),
            ...(lastMonthData.records || [])
        ];

        // Extract unique client names
        const clientNamesSet = new Set();
        allRecords.forEach(record => {
            if (record.Cliente && record.Cliente.trim()) {
                clientNamesSet.add(record.Cliente.trim());
            }
        });
        clientNames = Array.from(clientNamesSet).sort();

        // Extract unique client emails
        const clientEmailsSet = new Set();
        allRecords.forEach(record => {
            if (record.ClienteEmail && record.ClienteEmail.trim()) {
                clientEmailsSet.add(record.ClienteEmail.trim());
            }
        });
        clientEmails = Array.from(clientEmailsSet).sort();

        // Extract unique product descriptions
        const productNamesSet = new Set();
        allRecords.forEach(record => {
            if (record.Conceptos_JSON) {
                try {
                    const conceptos = JSON.parse(record.Conceptos_JSON);
                    conceptos.forEach(concepto => {
                        if (concepto.descripcion && concepto.descripcion.trim()) {
                            productNamesSet.add(concepto.descripcion.trim());
                        }
                    });
                } catch (e) {
                    // Skip invalid JSON
                }
            }
        });
        productNames = Array.from(productNamesSet).sort();

        // Setup autocomplete for client field
        setupAutocomplete(
            document.getElementById('cliente'),
            document.getElementById('clienteAutocomplete'),
            clientNames
        );

        // Setup autocomplete for email field
        setupAutocomplete(
            document.getElementById('clienteEmail'),
            document.getElementById('emailAutocomplete'),
            clientEmails
        );

        // Setup autocomplete for all description fields
        setupDescriptionAutocomplete();

        console.log(`Loaded ${clientNames.length} clients, ${clientEmails.length} emails, and ${productNames.length} products for autocomplete`);

    } catch (error) {
        console.log('Error loading autocomplete data:', error);
    }
}

// Setup autocomplete for description fields
function setupDescriptionAutocomplete() {
    const descriptionFields = document.querySelectorAll('.descripcion');
    descriptionFields.forEach(field => {
        const dropdown = field.parentElement.querySelector('.autocomplete-dropdown');
        if (dropdown) {
            setupAutocomplete(field, dropdown, productNames);
        }
    });
}

// Setup autocomplete on an input field
function setupAutocomplete(input, dropdown, suggestions) {
    if (!input || !dropdown) return;

    let currentFocus = -1;

    // Input event - filter and show suggestions
    input.addEventListener('input', function() {
        const value = this.value.toLowerCase().trim();
        currentFocus = -1;

        // Clear dropdown
        dropdown.innerHTML = '';
        dropdown.classList.remove('show');

        if (!value) return;

        // Filter suggestions
        const filtered = suggestions.filter(item =>
            item.toLowerCase().includes(value)
        ).slice(0, 5); // Limit to 5 results

        if (filtered.length === 0) return;

        // Create dropdown items
        filtered.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.textContent = item;

            // Click handler
            div.addEventListener('click', function() {
                input.value = item;
                dropdown.innerHTML = '';
                dropdown.classList.remove('show');
                input.focus();
            });

            dropdown.appendChild(div);
        });

        dropdown.classList.add('show');
    });

    // Keyboard navigation
    input.addEventListener('keydown', function(e) {
        const items = dropdown.getElementsByClassName('autocomplete-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentFocus++;
            if (currentFocus >= items.length) currentFocus = 0;
            setActive(items, currentFocus);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentFocus--;
            if (currentFocus < 0) currentFocus = items.length - 1;
            setActive(items, currentFocus);
        } else if (e.key === 'Enter') {
            if (currentFocus > -1 && items[currentFocus]) {
                e.preventDefault();
                items[currentFocus].click();
            }
        } else if (e.key === 'Escape') {
            dropdown.innerHTML = '';
            dropdown.classList.remove('show');
        }
    });

    // Close on blur (with small delay for click to register)
    input.addEventListener('blur', function() {
        setTimeout(() => {
            dropdown.innerHTML = '';
            dropdown.classList.remove('show');
        }, 200);
    });

    // Focus - show dropdown if has value
    input.addEventListener('focus', function() {
        if (this.value.trim()) {
            // Trigger input event to show suggestions
            const event = new Event('input', { bubbles: true });
            this.dispatchEvent(event);
        }
    });
}

// Set active item in dropdown
function setActive(items, index) {
    Array.from(items).forEach((item, i) => {
        if (i === index) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
}

// Email Button State Management
function updateEmailButtonState() {
    const emailInput = document.getElementById('clienteEmail');
    const emailButton = document.getElementById('btnEnviarCorreo');

    if (emailInput && emailButton) {
        const hasEmail = emailInput.value.trim().length > 0;

        if (hasEmail) {
            emailButton.disabled = false;
            emailButton.classList.remove('disabled');
        } else {
            emailButton.disabled = true;
            emailButton.classList.add('disabled');
        }
    }
}

// Card Management
function addCard() {
    const container = document.getElementById('conceptosContainer');
    const newCard = document.createElement('div');
    newCard.className = 'concepto-card';
    newCard.innerHTML = `
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
                <div class="autocomplete-wrapper">
                    <input type="text" class="descripcion" placeholder="Descripción del concepto" autocomplete="off" required>
                    <div class="autocomplete-dropdown"></div>
                </div>
            </div>
        </div>
        <div class="card-total">
            <span class="importe-label">Importe:</span>
            <span class="importe">$0.00</span>
        </div>
        <button type="button" class="btn-remove-card" onclick="removeCard(this)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            Eliminar
        </button>
    `;
    container.appendChild(newCard);
    setupCalculationListeners();
    setupDescriptionAutocomplete();
}

// Global variable to store card pending deletion
let cardToDelete = null;

function removeCard(button) {
    const card = button.closest('.concepto-card');
    const container = document.getElementById('conceptosContainer');

    // Check if this is the last card
    if (container.children.length <= 1) {
        showToast('Debe haber al menos un concepto', 'error');
        return;
    }

    // Store reference to card and show confirmation modal
    cardToDelete = card;
    const modal = document.getElementById('deleteModal');
    modal.style.display = 'flex';
}

function confirmDelete() {
    if (cardToDelete) {
        cardToDelete.remove();
        calculateTotals();
        showToast('Concepto eliminado', 'success');
    }
    cancelDelete();
}

function cancelDelete() {
    cardToDelete = null;
    const modal = document.getElementById('deleteModal');
    modal.style.display = 'none';
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

    const descuentoInput = document.getElementById('descuento');
    descuentoInput.removeEventListener('input', calculateTotals);
    descuentoInput.addEventListener('input', calculateTotals);
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
    const descuento = parseFloat(document.getElementById('descuento').value) || 0;
    const total = subtotal + ivaAmount - descuento;

    document.getElementById('subtotal').textContent = `$${formatNumber(subtotal)}`;
    document.getElementById('ivaAmount').textContent = `$${formatNumber(ivaAmount)}`;
    document.getElementById('total').textContent = `$${formatNumber(total)}`;
}

// Data Collection
function getRemisionData() {
    const fecha = document.getElementById('fecha').value;
    const remision = document.getElementById('remision').value;
    const cliente = document.getElementById('cliente').value;
    const clienteEmail = document.getElementById('clienteEmail').value;
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
    const descuentoValue = parseFloat(document.getElementById('descuento').value) || 0;
    const totalText = document.getElementById('total').textContent.replace(/[$,]/g, '');

    return {
        fecha,
        remision,
        cliente,
        clienteEmail,
        ciudad,
        conceptos,
        subtotal: parseFloat(subtotalText),
        iva: parseFloat(ivaText),
        descuento: descuentoValue,
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

// PDF Generation - Show confirmation modal
function generarPDF() {
    if (!validateForm()) return;

    // Show confirmation modal
    const modal = document.getElementById('pdfModal');
    modal.style.display = 'flex';
}

function confirmPDF() {
    // Hide modal
    cancelPDF();
    // Generate PDF
    actualGenerarPDF();
}

function cancelPDF() {
    const modal = document.getElementById('pdfModal');
    modal.style.display = 'none';
}

// Core PDF Generation Logic
async function createPDFDocument(data) {
    // Destructure jsPDF and GState (for transparency)
    const { jsPDF, GState } = window.jspdf;
    const doc = new jsPDF();

    // Add watermark logo
    const watermarkImg = new Image();
    watermarkImg.src = 'assets/logo_watermark.png';

    // Wait for image to load
    await new Promise((resolve, reject) => {
        watermarkImg.onload = resolve;
        watermarkImg.onerror = reject;
    });

    // Add watermark in center of page
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Reduced size for better aesthetics
    const imgWidth = 90; 
    const imgHeight = (watermarkImg.height / watermarkImg.width) * imgWidth;
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    doc.addImage(watermarkImg, 'PNG', x, y, imgWidth, imgHeight);

    let currentY = 20;

    // Main title: Nota de Remisión
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(45, 45, 45);
    doc.text('Nota de Remisión', 105, currentY, { align: 'center' });

    // Remision number and date
    currentY += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Remisión: ${data.remision}`, 105, currentY, { align: 'center' });

    currentY += 5;
    doc.text(`Fecha: ${data.fecha}`, 105, currentY, { align: 'center' });

    // Client information section
    currentY += 15;
    doc.setDrawColor(220, 220, 220);
    doc.line(15, currentY, 195, currentY);

    currentY += 8;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(45, 45, 45);
    doc.text('CLIENTE', 15, currentY);

    currentY += 7;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(data.cliente, 15, currentY);

    currentY += 5;
    if (data.clienteEmail) {
        doc.setTextColor(100, 100, 100);
        doc.text(`Email: ${data.clienteEmail}`, 15, currentY);
        currentY += 5;
    }

    doc.setTextColor(100, 100, 100);
    doc.text(`Ciudad: ${data.ciudad}`, 15, currentY);

    // Conceptos table
    currentY += 12;

    // Table header
    doc.setFillColor(45, 45, 45);
    doc.setDrawColor(45, 45, 45);
    doc.roundedRect(15, currentY - 6, 180, 10, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9); // Slightly larger
    doc.setFont(undefined, 'bold');
    
    // Adjusted alignment for professional look
    doc.text('CANTIDAD', 20, currentY);
    doc.text('DESCRIPCIÓN', 50, currentY);
    doc.text('P. UNITARIO', 160, currentY, { align: 'right' });
    doc.text('IMPORTE', 190, currentY, { align: 'right' });

    currentY += 8;

    // Table rows with alternating background and transparency
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60, 60, 60);

    let rowIndex = 0;
    data.conceptos.forEach(concepto => {
        // Pre-calculate height for the row background
        const descMaxWidth = 75; // Reduced slightly to account for shift
        const descLines = doc.splitTextToSize(concepto.descripcion, descMaxWidth);
        const lineHeight = Math.max(8, descLines.length * 5 + 4); // Min height 8, padding

        // Draw alternating background with transparency
        if (rowIndex % 2 === 0) {
            if (GState) {
                // Set transparency to allow watermark to show through
                const gState = new GState({ opacity: 0.6 }); 
                doc.setGState(gState);
                
                doc.setFillColor(245, 245, 245); // Light grey
                doc.rect(15, currentY - 4, 180, lineHeight, 'F');
                
                // Reset transparency
                doc.setGState(new GState({ opacity: 1.0 }));
            } else {
                // Fallback if GState not available
                doc.setFillColor(245, 245, 245);
                doc.rect(15, currentY - 4, 180, lineHeight, 'F');
            }
        }

        // Draw text
        doc.text(formatNumber(concepto.cantidad, 2), 20, currentY); // Aligned with header
        
        doc.text(descLines, 50, currentY);

        doc.text(`$${formatNumber(concepto.pu)}`, 160, currentY, { align: 'right' });
        doc.text(`$${formatNumber(concepto.importe)}`, 190, currentY, { align: 'right' });

        currentY += lineHeight;
        rowIndex++;
    });

    // Bottom line for the table
    doc.setDrawColor(45, 45, 45);
    doc.setLineWidth(0.5);
    doc.line(15, currentY - 2, 195, currentY - 2);

    // Totals section
    currentY += 5;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);

    // Only show Subtotal if IVA or Descuento is greater than 0
    if (data.iva > 0 || data.descuento > 0) {
        doc.text('Subtotal:', 140, currentY, { align: 'right' });
        doc.text(`$${formatNumber(data.subtotal)}`, 190, currentY, { align: 'right' });

        currentY += 6;

        if (data.iva > 0) {
            doc.text('IVA:', 140, currentY, { align: 'right' });
            doc.text(`$${formatNumber(data.iva)}`, 190, currentY, { align: 'right' });
            currentY += 6;
        }

        if (data.descuento > 0) {
            doc.text('Descuento:', 140, currentY, { align: 'right' });
            doc.text(`-$${formatNumber(data.descuento)}`, 190, currentY, { align: 'right' });
            currentY += 6;
        }

        currentY += 2;
    } else {
        // If no IVA or descuento, add minimal spacing before total
        currentY += 2;
    }

    // Total line
    doc.setDrawColor(45, 45, 45);
    doc.setLineWidth(0.5);
    doc.line(140, currentY - 2, 195, currentY - 2);

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(45, 45, 45);
    doc.text('TOTAL:', 140, currentY + 2, { align: 'right' });
    doc.text(`$${formatNumber(data.total)}`, 190, currentY + 2, { align: 'right' });

    // Footer
    const footerY = 270;

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(15, footerY, 195, footerY);

    // Company name
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('GANADERÍA CATORCE', 105, footerY + 5, { align: 'center' });

    // Location
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text('Querétaro, México', 105, footerY + 10, { align: 'center' });

    // Contact info
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text('Tel: +52 446 106 0320  |  Email: ganaderiacatorce@gmail.com', 105, footerY + 15, { align: 'center' });

    // Thank you message
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Gracias por su preferencia', 105, footerY + 19, { align: 'center' });

    return doc;
}

// Shared Email Sending Function
async function sendEmailWithPDF(pdfDoc, recipientEmail, data) {
    try {
        // Get PDF as base64
        const pdfBase64 = pdfDoc.output('datauristring').split(',')[1];

        // Send to Google Apps Script
        const response = await fetch(CONFIG.googleAppsScriptUrl, {
            method: 'POST',
            body: JSON.stringify({
                recipientEmail: recipientEmail,
                remision: data.remision,
                cliente: data.cliente,
                clienteEmail: data.clienteEmail,
                fecha: data.fecha,
                conceptos: data.conceptos,
                subtotal: formatNumber(data.subtotal),
                iva: formatNumber(data.iva),
                descuento: formatNumber(data.descuento),
                total: formatNumber(data.total),
                pdfBase64: pdfBase64
            })
        });

        // Check HTTP status before parsing JSON
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Error al enviar correo');
        }

        return result;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

// Actual PDF Generation
async function actualGenerarPDF() {
    try {
        const data = getRemisionData();
        const doc = await createPDFDocument(data);

        // Send email FIRST (before PDF download interrupts on mobile)
        showToast('Enviando datos...', 'info');
        try {
            await sendEmailWithPDF(doc, 'ganaderiacatorce@gmail.com', data);
            showToast('Datos guardados. Descargando PDF...', 'success');
        } catch (emailError) {
            showToast('Error al guardar (PDF se descargará)', 'error');
        }

        // Save PDF AFTER email sent (mobile-safe)
        doc.save(`Remision_${data.remision}.pdf`);

        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Error generating PDF:', error);
        showToast('Error al generar el PDF: ' + error.message, 'error');
    }
}

// Email Sending via Google Apps Script
async function enviarCorreo() {
    if (!validateForm()) return;

    // Check if email is provided
    const clienteEmail = document.getElementById('clienteEmail').value.trim();
    if (!clienteEmail) {
        showToast('Debe ingresar un email para enviar', 'error');
        return;
    }

    if (!CONFIG.googleAppsScriptUrl) {
        showToast('Configure Google Apps Script URL primero', 'error');
        return;
    }

    try {
        showToast('Generando PDF y enviando correo...', 'info');

        const data = getRemisionData();
        // Generate PDF document (but don't download)
        const doc = await createPDFDocument(data);

        // Send email using shared function
        await sendEmailWithPDF(doc, clienteEmail, data);

        showToast('Correo enviado exitosamente', 'success');

        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Error sending email:', error);
        showToast('Error al enviar el correo: ' + error.message, 'error');
    }
}

// Nueva Nota - Clear form and start fresh
function nuevaNota() {
    // Clear form inputs
    document.getElementById('cliente').value = '';
    document.getElementById('clienteEmail').value = '';
    document.getElementById('ciudad').value = 'Querétaro';

    // Reset date and remision with fresh timestamp
    document.getElementById('fecha').value = getMexicoDate();
    document.getElementById('remision').value = generateRemisionNumber();

    // Clear all concept cards and add one empty card
    const container = document.getElementById('conceptosContainer');
    container.innerHTML = `
        <div class="concepto-card">
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
            <button type="button" class="btn-remove-card" onclick="removeCard(this)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                Eliminar
            </button>
        </div>
    `;

    // Reset IVA and Descuento to default
    document.getElementById('iva').value = '0';
    document.getElementById('descuento').value = '0';

    // Recalculate totals (will show $0.00)
    setupCalculationListeners();
    calculateTotals();

    // Update email button state (will be disabled since email is cleared)
    updateEmailButtonState();

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
window.confirmDelete = confirmDelete;
window.cancelDelete = cancelDelete;
window.generarPDF = generarPDF;
window.confirmPDF = confirmPDF;
window.cancelPDF = cancelPDF;
window.enviarCorreo = enviarCorreo;
window.nuevaNota = nuevaNota;
