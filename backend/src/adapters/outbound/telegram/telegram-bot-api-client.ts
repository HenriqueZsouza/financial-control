import type { TelegramBot } from '../../../application/ports/outbound/telegram.js';

export class TelegramBotApiClient implements TelegramBot {
  constructor(private readonly token: string) {}
  async sendMessage(chatId: string, text: string, options?: { buttons?: Array<Array<{ text: string; data: string }>> }) {
    await this.call('sendMessage', { chat_id: chatId, text, ...(options?.buttons ? { reply_markup: { inline_keyboard: options.buttons.map((row) => row.map((button) => ({ text: button.text, callback_data: button.data }))) } } : {}) });
  }
  async answerCallback(callbackId: string) { await this.call('answerCallbackQuery', { callback_query_id: callbackId }); }
  private async call(method: string, body: unknown) {
    const response = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Telegram Bot API ${method} failed with ${response.status}`);
  }
}
