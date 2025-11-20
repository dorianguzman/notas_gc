// Reports JavaScript

// Format currency
function formatCurrency(amount) {
    return `$${amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

// Show toast notification
function showToast(message, type = 'info') {
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

// Load report data
async function loadReport() {
    const period = document.getElementById('reportPeriod').value;
    const loadingState = document.getElementById('loadingState');
    const reportContent = document.getElementById('reportContent');
    const errorState = document.getElementById('errorState');

    // Show loading
    loadingState.style.display = 'block';
    reportContent.style.display = 'none';
    errorState.style.display = 'none';

    try {
        // Fetch JSON data
        const response = await fetch(`data/${period}.json`);

        if (!response.ok) {
            throw new Error('No se pudo cargar el reporte');
        }

        const data = await response.json();

        // Display report
        displayReport(data);

        // Hide loading, show content
        loadingState.style.display = 'none';
        reportContent.style.display = 'block';

    } catch (error) {
        console.error('Error loading report:', error);

        // Show error state
        loadingState.style.display = 'none';
        errorState.style.display = 'block';

        showToast('Error al cargar el reporte', 'error');
    }
}

// Display report data
function displayReport(data) {
    // Period info
    document.getElementById('periodInfo').textContent =
        `${data.period.start} a ${data.period.end} | Generado: ${data.generated}`;

    // Metrics
    document.getElementById('totalRevenue').textContent = formatCurrency(data.metrics.total_revenue);
    document.getElementById('totalNotas').textContent = data.metrics.total_notas;
    document.getElementById('avgTicket').textContent = formatCurrency(data.metrics.avg_ticket);
    document.getElementById('totalItems').textContent = data.metrics.total_items;

    // Top customers
    const customersBody = document.getElementById('topCustomersBody');
    if (data.top_customers && data.top_customers.length > 0) {
        customersBody.innerHTML = data.top_customers.map(customer => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">${customer.rank}</td>
                <td style="padding: 10px;">${customer.name}</td>
                <td style="padding: 10px; text-align: right; font-weight: 500;">${formatCurrency(customer.revenue)}</td>
            </tr>
        `).join('');
    } else {
        customersBody.innerHTML = `
            <tr>
                <td colspan="3" style="padding: 20px; text-align: center; color: #999;">
                    No hay datos disponibles
                </td>
            </tr>
        `;
    }

    // Top products
    const productsBody = document.getElementById('topProductsBody');
    if (data.top_products && data.top_products.length > 0) {
        productsBody.innerHTML = data.top_products.map(product => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">${product.rank}</td>
                <td style="padding: 10px;">${product.name}</td>
                <td style="padding: 10px; text-align: right; font-weight: 500;">${product.quantity}</td>
            </tr>
        `).join('');
    } else {
        productsBody.innerHTML = `
            <tr>
                <td colspan="3" style="padding: 20px; text-align: center; color: #999;">
                    No hay datos disponibles
                </td>
            </tr>
        `;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadReport();
});
