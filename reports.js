// Reports JavaScript

// Global data storage
let thisMonthData = null;
let lastMonthData = null;
let currentTab = 'this_month';

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
async function loadReports() {
    const loadingState = document.getElementById('loadingState');
    const reportContent = document.getElementById('reportContent');
    const comparisonContent = document.getElementById('comparisonContent');
    const errorState = document.getElementById('errorState');

    // Show loading
    loadingState.style.display = 'block';
    reportContent.style.display = 'none';
    comparisonContent.style.display = 'none';
    errorState.style.display = 'none';

    try {
        // Fetch both reports
        const [thisMonthResponse, lastMonthResponse] = await Promise.all([
            fetch('data/this_month.json'),
            fetch('data/last_month.json')
        ]);

        if (!thisMonthResponse.ok || !lastMonthResponse.ok) {
            throw new Error('No se pudieron cargar los reportes');
        }

        thisMonthData = await thisMonthResponse.json();
        lastMonthData = await lastMonthResponse.json();

        // Hide loading
        loadingState.style.display = 'none';

        // Show initial tab
        switchTab(currentTab);

    } catch (error) {
        console.error('Error loading reports:', error);

        // Show error state
        loadingState.style.display = 'none';
        errorState.style.display = 'block';

        showToast('Error al cargar los reportes', 'error');
    }
}

// Switch between tabs
function switchTab(tab) {
    currentTab = tab;

    const reportContent = document.getElementById('reportContent');
    const comparisonContent = document.getElementById('comparisonContent');

    // Update tab buttons
    document.getElementById('tabThisMonth').classList.remove('active');
    document.getElementById('tabLastMonth').classList.remove('active');
    document.getElementById('tabComparison').classList.remove('active');

    if (tab === 'this_month') {
        document.getElementById('tabThisMonth').classList.add('active');
        reportContent.style.display = 'block';
        comparisonContent.style.display = 'none';
        displayReport(thisMonthData);
    } else if (tab === 'last_month') {
        document.getElementById('tabLastMonth').classList.add('active');
        reportContent.style.display = 'block';
        comparisonContent.style.display = 'none';
        displayReport(lastMonthData);
    } else if (tab === 'comparison') {
        document.getElementById('tabComparison').classList.add('active');
        reportContent.style.display = 'none';
        comparisonContent.style.display = 'block';
        displayComparison(thisMonthData, lastMonthData);
    }
}

// Display single month report
function displayReport(data) {
    // Period info - display as "Reporte del mes de [Month Year]"
    const startDate = new Date(data.period.start);
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const monthName = monthNames[startDate.getMonth()];
    const year = startDate.getFullYear();

    document.getElementById('periodInfo').textContent =
        `Reporte del mes de ${monthName} ${year}`;

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

// Display comparison view
function displayComparison(thisMonth, lastMonth) {
    // Period info
    const thisMonthDate = new Date(thisMonth.period.start);
    const lastMonthDate = new Date(lastMonth.period.start);
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const thisMonthName = monthNames[thisMonthDate.getMonth()];
    const lastMonthName = monthNames[lastMonthDate.getMonth()];
    const year = thisMonthDate.getFullYear();

    document.getElementById('comparisonPeriodInfo').textContent =
        `Comparación: ${lastMonthName} vs ${thisMonthName} ${year}`;

    // Create comparison metrics
    const metrics = [
        {
            label: 'Ingresos Totales',
            thisMonth: thisMonth.metrics.total_revenue,
            lastMonth: lastMonth.metrics.total_revenue,
            formatter: formatCurrency
        },
        {
            label: 'Total de Notas',
            thisMonth: thisMonth.metrics.total_notas,
            lastMonth: lastMonth.metrics.total_notas,
            formatter: (v) => v.toString()
        },
        {
            label: 'Ticket Promedio',
            thisMonth: thisMonth.metrics.avg_ticket,
            lastMonth: lastMonth.metrics.avg_ticket,
            formatter: formatCurrency
        },
        {
            label: 'Items Vendidos',
            thisMonth: thisMonth.metrics.total_items,
            lastMonth: lastMonth.metrics.total_items,
            formatter: (v) => v.toString()
        }
    ];

    const metricsContainer = document.getElementById('comparisonMetrics');
    metricsContainer.innerHTML = metrics.map(metric => {
        const change = metric.lastMonth === 0 ?
            (metric.thisMonth > 0 ? 100 : 0) :
            ((metric.thisMonth - metric.lastMonth) / metric.lastMonth) * 100;

        const changeClass = change > 0 ? 'positive' : (change < 0 ? 'negative' : 'neutral');
        const arrow = change > 0 ? '↑' : (change < 0 ? '↓' : '−');
        const changeText = change === 0 ? 'Sin cambio' : `${arrow} ${Math.abs(change).toFixed(1)}%`;

        return `
            <div class="comparison-metric-card">
                <div class="comparison-metric-header">${metric.label}</div>
                <div class="comparison-metric-row">
                    <div class="comparison-metric-item">
                        <div class="comparison-metric-label">Este Mes</div>
                        <div class="comparison-metric-value">${metric.formatter(metric.thisMonth)}</div>
                    </div>
                    <div class="comparison-metric-item">
                        <div class="comparison-metric-change ${changeClass}">
                            ${changeText}
                        </div>
                    </div>
                    <div class="comparison-metric-item">
                        <div class="comparison-metric-label">Mes Anterior</div>
                        <div class="comparison-metric-value">${metric.formatter(metric.lastMonth)}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Comparison customers
    const customersMap = new Map();
    thisMonth.top_customers.forEach(c => {
        customersMap.set(c.name, { thisMonth: c.revenue, lastMonth: 0 });
    });
    lastMonth.top_customers.forEach(c => {
        if (customersMap.has(c.name)) {
            customersMap.get(c.name).lastMonth = c.revenue;
        } else {
            customersMap.set(c.name, { thisMonth: 0, lastMonth: c.revenue });
        }
    });

    const customersArray = Array.from(customersMap.entries())
        .sort((a, b) => b[1].thisMonth - a[1].thisMonth)
        .slice(0, 5);

    const customersBody = document.getElementById('comparisonCustomersBody');
    if (customersArray.length > 0) {
        customersBody.innerHTML = customersArray.map(([name, data]) => {
            const change = data.lastMonth === 0 ?
                (data.thisMonth > 0 ? 100 : 0) :
                ((data.thisMonth - data.lastMonth) / data.lastMonth) * 100;

            const changeClass = change > 0 ? 'positive' : (change < 0 ? 'negative' : 'neutral');
            const arrow = change > 0 ? '↑' : (change < 0 ? '↓' : '−');
            const changeText = `${arrow} ${Math.abs(change).toFixed(1)}%`;

            return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td>${name}</td>
                    <td style="text-align: right; font-weight: 500;">${formatCurrency(data.thisMonth)}</td>
                    <td style="text-align: right; font-weight: 500;">${formatCurrency(data.lastMonth)}</td>
                    <td style="text-align: center;">
                        <span class="comparison-metric-change-small ${changeClass}">${changeText}</span>
                    </td>
                </tr>
            `;
        }).join('');
    } else {
        customersBody.innerHTML = `
            <tr>
                <td colspan="4" style="padding: 20px; text-align: center; color: #999;">
                    No hay datos disponibles
                </td>
            </tr>
        `;
    }

    // Comparison products
    const productsMap = new Map();
    thisMonth.top_products.forEach(p => {
        productsMap.set(p.name, { thisMonth: p.quantity, lastMonth: 0 });
    });
    lastMonth.top_products.forEach(p => {
        if (productsMap.has(p.name)) {
            productsMap.get(p.name).lastMonth = p.quantity;
        } else {
            productsMap.set(p.name, { thisMonth: 0, lastMonth: p.quantity });
        }
    });

    const productsArray = Array.from(productsMap.entries())
        .sort((a, b) => b[1].thisMonth - a[1].thisMonth)
        .slice(0, 5);

    const productsBody = document.getElementById('comparisonProductsBody');
    if (productsArray.length > 0) {
        productsBody.innerHTML = productsArray.map(([name, data]) => {
            const change = data.lastMonth === 0 ?
                (data.thisMonth > 0 ? 100 : 0) :
                ((data.thisMonth - data.lastMonth) / data.lastMonth) * 100;

            const changeClass = change > 0 ? 'positive' : (change < 0 ? 'negative' : 'neutral');
            const arrow = change > 0 ? '↑' : (change < 0 ? '↓' : '−');
            const changeText = `${arrow} ${Math.abs(change).toFixed(1)}%`;

            return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td>${name}</td>
                    <td style="text-align: right; font-weight: 500;">${data.thisMonth}</td>
                    <td style="text-align: right; font-weight: 500;">${data.lastMonth}</td>
                    <td style="text-align: center;">
                        <span class="comparison-metric-change-small ${changeClass}">${changeText}</span>
                    </td>
                </tr>
            `;
        }).join('');
    } else {
        productsBody.innerHTML = `
            <tr>
                <td colspan="4" style="padding: 20px; text-align: center; color: #999;">
                    No hay datos disponibles
                </td>
            </tr>
        `;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadReports();
});
