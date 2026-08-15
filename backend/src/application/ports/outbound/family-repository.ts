import type { FamilyInvite, FamilyMember, FamilyView } from '../../../domain/family/family.js';
export interface FamilyRepository {
  getActiveFamily(userId: number): Promise<FamilyView | null>;
  getActiveMembership(userId: number): Promise<{ familyGroupId: number; role: 'OWNER' | 'MEMBER' } | null>;
  createGroup(owner: { id: number; firstName: string }, now: Date): Promise<FamilyView>;
  createInvite(data: { familyGroupId: number; inviterId: number; inviteeId: number; inviteeEmail: string }): Promise<FamilyInvite>;
  findInvite(id: number, inviteeId: number): Promise<FamilyInvite | null>;
  hasPendingInvite(inviteeId: number): Promise<boolean>;
  listReceivedInvites(userId: number): Promise<FamilyInvite[]>;
  acceptInvite(invite: FamilyInvite, now: Date): Promise<void>;
  declineInvite(invite: FamilyInvite, now: Date): Promise<void>;
  leave(userId: number, now: Date): Promise<void>;
  remove(ownerId: number, memberUserId: number, now: Date): Promise<boolean>;
  dissolve(ownerId: number, now: Date): Promise<number[]>;
  activeMemberUserIds(userId: number): Promise<number[] | null>;
}
