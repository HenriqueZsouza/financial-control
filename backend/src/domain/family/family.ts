export type FamilyMemberRole = 'OWNER' | 'MEMBER';
export type FamilyMembershipStatus = 'ACTIVE' | 'LEFT' | 'REMOVED';
export type FamilyInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
export type NotificationType = 'FAMILY_INVITE_RECEIVED' | 'INVITE_ACCEPTED' | 'INVITE_DECLINED' | 'MEMBER_REMOVED' | 'GROUP_DISSOLVED';
export interface FamilyMember { userId: number; firstName: string; lastName: string; role: FamilyMemberRole; status: FamilyMembershipStatus; joinedAt: Date; }
export interface FamilyView { id: number; name: string; members: FamilyMember[]; }
export interface FamilyInvite {
  id: number;
  familyGroupId: number;
  inviterId: number;
  inviteeId: number;
  inviteeEmail: string;
  status: FamilyInviteStatus;
  createdAt: Date;
  inviter: { firstName: string; lastName: string };
}
export interface AppNotification { id: number; userId: number; type: NotificationType; title: string; body: string; payload: unknown; readAt: Date | null; createdAt: Date; }
