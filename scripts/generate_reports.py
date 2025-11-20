#!/usr/bin/env python3
"""
Generate sales reports from Google Sheets data.

This script:
1. Fetches nota data from Google Sheets (last 3 months)
2. Generates reports for different time ranges
3. Saves reports as markdown files
"""

import os
import json
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import gspread
from google.oauth2.service_account import Credentials

# Configuration
SHEET_ID = os.environ.get('SHEET_ID')
SERVICE_ACCOUNT_JSON = os.environ.get('GOOGLE_SERVICE_ACCOUNT')

# Report configuration
REPORTS_DIR = 'reports'
DATE_FORMAT = '%Y-%m-%d'


def setup_google_sheets():
    """Setup and authenticate Google Sheets client."""
    if not SERVICE_ACCOUNT_JSON:
        raise ValueError("GOOGLE_SERVICE_ACCOUNT environment variable not set")
    if not SHEET_ID:
        raise ValueError("SHEET_ID environment variable not set")

    # Parse service account credentials
    creds_dict = json.loads(SERVICE_ACCOUNT_JSON)

    # Define scopes
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly'
    ]

    # Create credentials
    creds = Credentials.from_service_account_info(creds_dict, scopes=scopes)

    # Create client
    client = gspread.authorize(creds)

    return client


def fetch_data(client):
    """Fetch all data from Google Sheets."""
    try:
        spreadsheet = client.open_by_key(SHEET_ID)
        worksheet = spreadsheet.worksheet('Notas')

        # Get all records as list of dictionaries
        records = worksheet.get_all_records()

        print(f"Fetched {len(records)} records from Google Sheets")
        return records
    except Exception as e:
        print(f"Error fetching data: {e}")
        raise


def parse_date(date_str):
    """Parse date string to datetime object."""
    try:
        # Try YYYY-MM-DD format first
        return datetime.strptime(date_str, '%Y-%m-%d')
    except:
        try:
            # Try M/D/YYYY format
            return datetime.strptime(date_str, '%m/%d/%Y')
        except:
            return None


def filter_by_date_range(records, start_date, end_date=None):
    """Filter records by date range."""
    if end_date is None:
        end_date = datetime.now()

    filtered = []
    for record in records:
        fecha = parse_date(record.get('Fecha', ''))
        if fecha and start_date <= fecha <= end_date:
            filtered.append(record)

    return filtered


def calculate_metrics(records):
    """Calculate metrics from filtered records."""
    if not records:
        return {
            'total_revenue': 0,
            'total_notas': 0,
            'avg_ticket': 0,
            'total_items': 0,
            'top_customers': [],
            'top_products': []
        }

    total_revenue = sum(float(r.get('Total', 0)) for r in records)
    total_notas = len(records)
    avg_ticket = total_revenue / total_notas if total_notas > 0 else 0

    # Count items sold
    total_items = 0
    customer_totals = defaultdict(float)
    product_counts = Counter()

    for record in records:
        cliente = record.get('Cliente', 'Unknown')
        total = float(record.get('Total', 0))
        customer_totals[cliente] += total

        # Parse conceptos JSON
        conceptos_json = record.get('Conceptos_JSON', '[]')
        try:
            conceptos = json.loads(conceptos_json)
            total_items += len(conceptos)
            for concepto in conceptos:
                desc = concepto.get('descripcion', 'Unknown')
                qty = concepto.get('cantidad', 0)
                product_counts[desc] += qty
        except:
            pass

    # Get top 5 customers
    top_customers = sorted(customer_totals.items(), key=lambda x: x[1], reverse=True)[:5]

    # Get top 10 products
    top_products = product_counts.most_common(10)

    return {
        'total_revenue': total_revenue,
        'total_notas': total_notas,
        'avg_ticket': avg_ticket,
        'total_items': total_items,
        'top_customers': top_customers,
        'top_products': top_products
    }


def format_currency(amount):
    """Format number as currency."""
    return f"${amount:,.2f}"


def generate_markdown_report(title, metrics, start_date, end_date):
    """Generate markdown report."""
    report = []
    report.append(f"# {title}")
    report.append(f"\n**Period**: {start_date.strftime(DATE_FORMAT)} to {end_date.strftime(DATE_FORMAT)}")
    report.append(f"\n**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append("\n---\n")

    # Summary metrics
    report.append("## Summary")

    if metrics['total_notas'] == 0:
        report.append("\n> ⚠️ **No data available for this period**")

    report.append(f"\n- **Total Revenue**: {format_currency(metrics['total_revenue'])}")
    report.append(f"- **Total Notas**: {metrics['total_notas']}")
    report.append(f"- **Average Ticket**: {format_currency(metrics['avg_ticket'])}")
    report.append(f"- **Total Items Sold**: {metrics['total_items']}")

    # Top customers
    if metrics['top_customers']:
        report.append("\n## Top Customers")
        report.append("\n| Rank | Customer | Revenue |")
        report.append("|------|----------|---------|")
        for i, (customer, total) in enumerate(metrics['top_customers'], 1):
            report.append(f"| {i} | {customer} | {format_currency(total)} |")

    # Top products
    if metrics['top_products']:
        report.append("\n## Top Products")
        report.append("\n| Rank | Product | Quantity Sold |")
        report.append("|------|---------|---------------|")
        for i, (product, qty) in enumerate(metrics['top_products'], 1):
            report.append(f"| {i} | {product} | {qty} |")

    return "\n".join(report)


def save_report(filename, content):
    """Save report to file."""
    os.makedirs(REPORTS_DIR, exist_ok=True)
    filepath = os.path.join(REPORTS_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Report saved: {filepath}")


def main():
    """Main function."""
    print("Starting report generation...")

    # Setup Google Sheets client
    client = setup_google_sheets()

    # Fetch all data
    all_records = fetch_data(client)

    if not all_records:
        print("⚠️  No data found in Google Sheets - generating empty reports")
        all_records = []  # Continue with empty list

    # Define date ranges
    now = datetime.now()
    today = datetime(now.year, now.month, now.day)

    date_ranges = {
        'yesterday.md': {
            'title': 'Yesterday Report',
            'start': today - timedelta(days=1),
            'end': today - timedelta(days=1)
        },
        'last_7_days.md': {
            'title': 'Last 7 Days Report',
            'start': today - timedelta(days=7),
            'end': today
        },
        'last_15_days.md': {
            'title': 'Last 15 Days Report',
            'start': today - timedelta(days=15),
            'end': today
        },
        'this_month.md': {
            'title': 'This Month Report',
            'start': datetime(now.year, now.month, 1),
            'end': today
        },
        'last_3_months.md': {
            'title': 'Last 3 Months Report',
            'start': today - timedelta(days=90),
            'end': today
        }
    }

    # Generate reports
    for filename, config in date_ranges.items():
        print(f"\nGenerating {filename}...")

        # Filter data
        filtered_records = filter_by_date_range(all_records, config['start'], config['end'])
        print(f"  Found {len(filtered_records)} records")

        # Calculate metrics
        metrics = calculate_metrics(filtered_records)

        # Generate report
        report = generate_markdown_report(
            config['title'],
            metrics,
            config['start'],
            config['end']
        )

        # Save report
        save_report(filename, report)

    print("\n✓ All reports generated successfully!")


if __name__ == '__main__':
    main()
