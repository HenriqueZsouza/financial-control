import type { AppNotification, FamilyInvite, FamilyView } from '../../../domain/family/family.js';
export interface GetMyFamily { execute(userId: number): Promise<FamilyView | null>; }
export interface InviteFamilyMember { execute(userId: number, email: string): Promise<FamilyInvite>; }
export interface ListReceivedInvites { execute(userId: number): Promise<FamilyInvite[]>; }
export interface AcceptFamilyInvite { execute(userId: number, inviteId: number): Promise<FamilyView>; }
export interface DeclineFamilyInvite { execute(userId: number, inviteId: number): Promise<void>; }
export interface RemoveFamilyMember { execute(ownerId: number, memberUserId: number): Promise<void>; }
export interface LeaveFamilyGroup { execute(userId: number): Promise<void>; }
export interface DissolveFamilyGroup { execute(ownerId: number): Promise<void>; }
export interface ListNotifications { execute(userId: number, unreadOnly?: boolean): Promise<{ items: AppNotification[]; unreadCount: number }>; }
export interface MarkNotificationRead { execute(userId: number, id: number): Promise<void>; }
export interface MarkAllNotificationsRead { execute(userId: number): Promise<void>; }
