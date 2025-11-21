#!/usr/bin/env python3
"""
Generate monthly sales report from Google Sheets data.

This script:
1. Fetches nota data from Google Sheets
2. Generates report for the current month
3. Saves report as JSON file
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
DATA_DIR = 'data'
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

    # Get top 5 products
    top_products = product_counts.most_common(5)

    return {
        'total_revenue': total_revenue,
        'total_notas': total_notas,
        'avg_ticket': avg_ticket,
        'total_items': total_items,
        'top_customers': top_customers,
        'top_products': top_products
    }


def generate_json_report(title, metrics, records, start_date, end_date):
    """Generate JSON report with data and metrics."""
    report = {
        'title': title,
        'period': {
            'start': start_date.strftime(DATE_FORMAT),
            'end': end_date.strftime(DATE_FORMAT)
        },
        'generated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'metrics': {
            'total_revenue': metrics['total_revenue'],
            'total_notas': metrics['total_notas'],
            'avg_ticket': metrics['avg_ticket'],
            'total_items': metrics['total_items']
        },
        'top_customers': [
            {'rank': i, 'name': name, 'revenue': revenue}
            for i, (name, revenue) in enumerate(metrics['top_customers'], 1)
        ],
        'top_products': [
            {'rank': i, 'name': name, 'quantity': qty}
            for i, (name, qty) in enumerate(metrics['top_products'], 1)
        ],
        'records': records
    }
    return report


def save_json_report(filename, data):
    """Save report as JSON file."""
    os.makedirs(DATA_DIR, exist_ok=True)
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Data saved: {filepath}")


def main():
    """Main function."""
    print("Starting monthly report generation...")

    # Setup Google Sheets client
    client = setup_google_sheets()

    # Fetch all data
    all_records = fetch_data(client)

    if not all_records:
        print("⚠️  No data found in Google Sheets - generating empty reports")
        all_records = []  # Continue with empty list

    now = datetime.now()
    today = datetime(now.year, now.month, now.day)

    # === THIS MONTH REPORT ===
    this_month_start = datetime(now.year, now.month, 1)

    print(f"\nGenerating report for {this_month_start.strftime('%B %Y')}...")

    # Filter data for current month
    this_month_records = filter_by_date_range(all_records, this_month_start, today)
    print(f"  Found {len(this_month_records)} records")

    # Calculate metrics
    this_month_metrics = calculate_metrics(this_month_records)

    # Generate JSON report
    this_month_report = generate_json_report(
        'This Month Report',
        this_month_metrics,
        this_month_records,
        this_month_start,
        today
    )

    # Save as JSON
    save_json_report('this_month.json', this_month_report)

    # === LAST MONTH REPORT ===
    # Calculate last month's date range
    first_day_this_month = datetime(now.year, now.month, 1)
    last_day_last_month = first_day_this_month - timedelta(days=1)
    last_month_start = datetime(last_day_last_month.year, last_day_last_month.month, 1)

    print(f"\nGenerating report for {last_month_start.strftime('%B %Y')}...")

    # Filter data for last month
    last_month_records = filter_by_date_range(all_records, last_month_start, last_day_last_month)
    print(f"  Found {len(last_month_records)} records")

    # Calculate metrics
    last_month_metrics = calculate_metrics(last_month_records)

    # Generate JSON report
    last_month_report = generate_json_report(
        'Last Month Report',
        last_month_metrics,
        last_month_records,
        last_month_start,
        last_day_last_month
    )

    # Save as JSON
    save_json_report('last_month.json', last_month_report)

    print("\n✓ Monthly reports generated successfully!")


if __name__ == '__main__':
    main()
