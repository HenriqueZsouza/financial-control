import type { NextFunction, Request, Response } from 'express';
import type { CreateTelegramLinkToken, GetTelegramConnection, ProcessTelegramUpdate, RevokeTelegramConnection } from '../../../../application/ports/inbound/telegram.js';
import { telegramWebhookSchema } from '../dto/telegram-dto.js';

export class TelegramIntegrationsController {
  constructor(private readonly createLinkTokenUseCase: CreateTelegramLinkToken, private readonly getConnection: GetTelegramConnection, private readonly revokeConnection: RevokeTelegramConnection) {}
  createLinkToken = async (req: Request, res: Response, next: NextFunction) => { try { const result = await this.createLinkTokenUseCase.execute(req.userId!); res.status(201).json({ linkUrl: result.linkUrl, expiresAt: result.expiresAt }); } catch (error) { next(error); } };
  get = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ connection: await this.getConnection.execute(req.userId!) }); } catch (error) { next(error); } };
  remove = async (req: Request, res: Response, next: NextFunction) => { try { await this.revokeConnection.execute(req.userId!); res.status(204).send(); } catch (error) { next(error); } };
}

export class TelegramWebhookController {
  constructor(private readonly processUpdate: ProcessTelegramUpdate, private readonly secret: string) {}
  webhook = async (req: Request, res: Response, next: NextFunction) => {
    if (req.header('X-Telegram-Bot-Api-Secret-Token') !== this.secret) return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Webhook não autorizado.' });
    try {
      const update = telegramWebhookSchema.parse(req.body);
      const message = update.message; const callback = update.callback_query;
      void this.processUpdate.execute({
        updateId: update.update_id,
        chatId: message?.chat.id ?? callback?.message?.chat.id,
        telegramUserId: message?.from?.id ?? callback?.from.id,
        username: message?.from?.username ?? callback?.from.username,
        firstName: message?.from?.first_name ?? callback?.from.first_name,
        chatType: message?.chat.type ?? callback?.message?.chat.type,
        text: message?.from?.is_bot ? undefined : message?.text,
        callbackData: callback?.from.is_bot ? undefined : callback?.data,
        callbackId: callback?.id,
      }).catch((error) => console.error('Telegram webhook processing failed', { code: error instanceof Error ? error.name : 'UNKNOWN' }));
      return res.status(200).send();
    } catch (error) { next(error); }
  };
}
