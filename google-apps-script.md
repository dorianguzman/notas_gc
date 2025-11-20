# Google Apps Script - Email Service

This file contains the Google Apps Script code for sending remission notes via Gmail.

## Setup Instructions

### 1. Create Google Sheet for Data Storage

1. The sheet is already created at: https://docs.google.com/spreadsheets/d/17zK2IwzvEc1LykPP5_1fBug3_yQaQvV5WtBFa97LDPM/edit
2. The script will automatically create a "Notas" tab with headers on first use
3. Columns: Timestamp, Remision, Fecha, Cliente, ClienteEmail, Ciudad, Conceptos_JSON, Subtotal, IVA, Total

### 2. Create Google Apps Script Project

1. Go to https://script.google.com
2. Click **"New Project"**
3. Delete any default code
4. Copy and paste the code below
5. Save the project (name it "Notas Remision Email Service" or similar)

### 2. Deploy as Web App

1. Click **"Deploy"** → **"New deployment"**
2. Click the gear icon ⚙️ next to "Select type" → Choose **"Web app"**
3. Configure:
   - **Execute as:** Your account
   - **Who has access:** Anyone
4. Click **"Deploy"**
5. **Copy the Web App URL** (looks like: `https://script.google.com/macros/s/.../exec`)
6. Add this URL to `script.js` in the `CONFIG.googleAppsScriptUrl` field

### 3. Grant Permissions

On first deployment, you'll need to:
1. Click "Authorize access"
2. Choose your Google account
3. Click "Advanced" → "Go to [project name] (unsafe)"
4. Click "Allow"

## Google Apps Script Code

```javascript
// Configuration
const SHEET_ID = '17zK2IwzvEc1LykPP5_1fBug3_yQaQvV5WtBFa97LDPM';

function doPost(e) {
  try {
    // Parse incoming data
    const data = JSON.parse(e.postData.contents);

    // Validate required fields
    if (!data.clienteEmail || !data.pdfBase64) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Faltan campos requeridos: clienteEmail o pdfBase64'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const recipient = data.clienteEmail;
    const subject = `Nota de Remisión #${data.remision} - Ganadería Catorce`;

    // Format conceptos list
    let conceptosList = '';
    if (data.conceptos && data.conceptos.length > 0) {
      data.conceptos.forEach((concepto, index) => {
        conceptosList += `\n${index + 1}. ${concepto.descripcion}
   Cantidad: ${concepto.cantidad}
   Precio Unitario: $${concepto.pu.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
   Importe: $${concepto.importe.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
`;
      });
    }

    const body = `
Estimado/a ${data.cliente},

Adjunto encontrará la Nota de Remisión #${data.remision}.

Detalles:
- Fecha: ${data.fecha}
${conceptosList}
${data.iva && parseFloat(data.iva.replace(/,/g, '')) > 0 ? `Subtotal: $${data.subtotal}
IVA: $${data.iva}
` : ''}Total: $${data.total}

Gracias por su preferencia.

---
Ganadería Catorce
Querétaro, México
Tel: +52 446 106 0320
Email: ganaderiacatorce@gmail.com
    `;

    // Convert base64 to PDF blob
    const pdfBlob = Utilities.newBlob(
      Utilities.base64Decode(data.pdfBase64),
      'application/pdf',
      `Remision_${data.remision}.pdf`
    );

    // Send email with Gmail
    // This will throw an exception if it fails (quota exceeded, size limit, etc.)
    GmailApp.sendEmail(recipient, subject, body, {
      attachments: [pdfBlob],
      name: 'Ganadería Catorce',
      cc: 'ganaderiacatorce@gmail.com'
    });

    // If we get here, email was sent successfully
    Logger.log(`Email sent successfully to ${recipient} for remision ${data.remision}`);

    // Append data to Google Sheet
    try {
      appendToSheet(data);
      Logger.log(`Data appended to sheet for remision ${data.remision}`);
    } catch (sheetError) {
      Logger.log(`Warning: Email sent but failed to append to sheet: ${sheetError.toString()}`);
      // Don't fail the request if sheet append fails
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Email enviado exitosamente'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Log the error for debugging
    Logger.log(`Error sending email: ${error.toString()}`);

    // Return error to frontend
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Function to append nota data to Google Sheet
function appendToSheet(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Notas') || ss.insertSheet('Notas');

  // Check if sheet is empty and add headers
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp',
      'Remision',
      'Fecha',
      'Cliente',
      'ClienteEmail',
      'Ciudad',
      'Conceptos_JSON',
      'Subtotal',
      'IVA',
      'Total'
    ]);

    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, 10);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
  }

  // Prepare data row
  const timestamp = new Date();
  const conceptosJson = JSON.stringify(data.conceptos || []);

  // Parse numbers from formatted strings
  const subtotal = parseFloat((data.subtotal || '0').toString().replace(/,/g, ''));
  const iva = parseFloat((data.iva || '0').toString().replace(/,/g, ''));
  const total = parseFloat((data.total || '0').toString().replace(/,/g, ''));

  // Append data row
  sheet.appendRow([
    timestamp,
    data.remision,
    data.fecha,
    data.cliente,
    data.clienteEmail,
    data.ciudad || 'Querétaro',
    conceptosJson,
    subtotal,
    iva,
    total
  ]);

  // Auto-resize columns for better readability
  sheet.autoResizeColumns(1, 10);
}
```

## Features

- ✅ **Automatic CC**: Every email automatically sends a copy to ganaderiacatorce@gmail.com
- ✅ **Google Sheets Integration**: Automatically appends nota data to Google Sheet for reporting
- ✅ **Error Handling**: Properly catches and returns Gmail errors (quota limits, size limits, etc.)
- ✅ **Validation**: Checks for required fields before attempting to send
- ✅ **Logging**: Logs all sends and errors to Google Apps Script logs
- ✅ **Data Backup**: All notas stored in structured format for future analysis

## Gmail Limits

Google Apps Script has daily email quotas:
- **Free Gmail accounts**: 100 emails/day
- **Google Workspace accounts**: 1,500 emails/day
- **Attachment size limit**: 25 MB per email
- **Total message size**: Must be under 25 MB including all parts

If you hit these limits, the script will return an error like:
- "Service invoked too many times for one day"
- "Limiet overschreden: Totale grootte e-mailbijlagen" (Attachment size exceeded)

## Testing

You can test the deployment using the included `test-email.js` script:

```bash
node test-email.js
```

Or manually check the logs in Google Apps Script:
1. Go to your project in script.google.com
2. Click "Executions" in the left sidebar
3. View recent execution logs

## Troubleshooting

**Email not sending:**
- Check Google Apps Script execution logs for errors
- Verify the Web App URL is correct in `script.js`
- Ensure you've granted Gmail permissions
- Check if you've hit daily email quota

**Size limit errors:**
- Reduce PDF size by optimizing images
- Check that logo file isn't too large
- Consider compressing the PDF before sending

**Permission errors:**
- Re-deploy the Web App
- Ensure "Execute as: Me" is selected
- Re-authorize permissions if needed
