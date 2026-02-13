function doPost(e) {
  var p = e && e.parameter ? e.parameter : {};
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Sheet 1: generic logs (your existing MVP sheet)
  var sh = ss.getSheetByName('logs') || ss.insertSheet('logs');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['ts_iso','event','variant','userId','meta']);
  }
  var ts = p.ts ? new Date(Number(p.ts)) : new Date();
  sh.appendRow([
    ts.toISOString(),
    p.event || '',
    p.variant || '',
    p.userId || '',
    p.meta || ''
  ]);

  // Sheet 2: sentiment-specific data with explicit columns
  var sentimentSheet = ss.getSheetByName('sentiment_logs') || ss.insertSheet('sentiment_logs');
  if (sentimentSheet.getLastRow() === 0) {
    sentimentSheet.appendRow(['timestamp','review','sentiment','confidence','action_taken']);
  }

  var meta = {};
  try {
    meta = JSON.parse(p.meta || "{}");
  } catch (err) {
    meta = {};
  }

  // Fill columns from meta; if missing, leave empty
  sentimentSheet.appendRow([
    ts.toISOString(),
    meta.review || '',
    meta.sentiment || '',
    meta.confidence || '',
    meta.action_taken || ''
  ]);

  return ContentService.createTextOutput('OK');
}
