import { DomainError } from '../../../domain/shared/errors.js';
import type { Clock } from '../../ports/outbound/security.js';
import type { NotificationRepository } from '../../ports/outbound/notification-repository.js';
import type { ListNotifications, MarkAllNotificationsRead, MarkNotificationRead } from '../../ports/inbound/family.js';
export class ListNotificationsUseCase implements ListNotifications { constructor(private notifications: NotificationRepository) {} async execute(userId: number, unreadOnly?: boolean) { const items = await this.notifications.list(userId, unreadOnly); return { items, unreadCount: items.filter((item) => !item.readAt).length }; } }
export class MarkNotificationReadUseCase implements MarkNotificationRead { constructor(private notifications: NotificationRepository, private clock: Clock) {} async execute(userId: number, id: number) { if (!await this.notifications.markRead(userId, id, this.clock.now())) throw new DomainError('NOT_FOUND', 'Notificação não encontrada.'); } }
export class MarkAllNotificationsReadUseCase implements MarkAllNotificationsRead { constructor(private notifications: NotificationRepository, private clock: Clock) {} execute(userId: number) { return this.notifications.markAllRead(userId, this.clock.now()); } }
