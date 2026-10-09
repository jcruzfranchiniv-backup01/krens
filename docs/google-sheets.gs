/**
 * Google Apps Script: recibe los leads del sitio y los guarda en la hoja.
 * 1. Crear una Google Sheet con la pestaña "Leads".
 * 2. Extensiones > Apps Script > pegar este código.
 * 3. Propiedades del proyecto > Propiedades de la secuencia de comandos: SECRET = (el mismo valor que LEADS_WEBHOOK_SECRET),
 *    NOTIFY_EMAIL = (opcional) correo que recibe un aviso por cada lead.
 * 4. Implementar > Aplicación web > Ejecutar como: yo / Acceso: cualquier persona. Copiar la URL en LEADS_WEBHOOK_URL.
 */
const HEADERS = [
  'receivedAt', 'name', 'eventType', 'guests', 'eventDate', 'phone', 'eventId', 'sourceUrl',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'landing', 'referrer',
];

function doPost(e) {
  const props = PropertiesService.getScriptProperties();
  const data = JSON.parse(e.postData.contents);
  if (data.secret !== props.getProperty('SECRET')) return json({ ok: false, error: 'forbidden' });

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Leads');
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  // Evita duplicados si el navegador reintenta: eventId es único por envío.
  const ids = sheet.getRange(2, HEADERS.indexOf('eventId') + 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues().flat();
  if (ids.indexOf(data.eventId) === -1) sheet.appendRow(HEADERS.map((h) => data[h] || ''));

  const notify = props.getProperty('NOTIFY_EMAIL');
  if (notify) {
    MailApp.sendEmail(notify, 'Nuevo pedido de cotización: ' + data.name,
      [data.eventType, data.guests, data.eventDate, 'WhatsApp: ' + data.phone].join('\n'));
  }
  return json({ ok: true });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
