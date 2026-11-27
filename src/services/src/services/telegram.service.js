// src/services/telegram.service.js

async function sendAdminAlert(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[TELEGRAM] Missing bot token or chat ID. Skipping alert.');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML', // Allows bold text using <b> tags
      }),
    });
  } catch (error) {
    console.error('[TELEGRAM ALERT ERROR]:', error.message);
  }
}

module.exports = { sendAdminAlert };