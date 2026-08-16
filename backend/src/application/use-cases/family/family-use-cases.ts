import { DomainError } from '../../../domain/shared/errors.js';
import type { Clock } from '../../ports/outbound/security.js';
import type { FamilyRepository } from '../../ports/outbound/family-repository.js';
import type { NotificationRepository } from '../../ports/outbound/notification-repository.js';
import type { UserRepository } from '../../ports/outbound/user-repository.js';
import type {
  AcceptFamilyInvite,
  DeclineFamilyInvite,
  DissolveFamilyGroup,
  GetMyFamily,
  InviteFamilyMember,
  LeaveFamilyGroup,
  ListReceivedInvites,
  RemoveFamilyMember,
} from '../../ports/inbound/family.js';

export class GetMyFamilyUseCase implements GetMyFamily {
  constructor(private family: FamilyRepository) {}

  execute(userId: number) {
    return this.family.getActiveFamily(userId);
  }
}

export class InviteFamilyMemberUseCase implements InviteFamilyMember {
  constructor(
    private family: FamilyRepository,
    private users: UserRepository,
    private notifications: NotificationRepository,
    private clock: Clock,
  ) {}

  async execute(userId: number, email: string) {
    const invitee = await this.users.findByEmail(email.toLowerCase());
    if (!invitee || invitee.deletedAt) {
      throw new DomainError('USER_NOT_FOUND', 'Nenhum usuário encontrado com este e-mail.');
    }
    if (invitee.id === userId) {
      throw new DomainError('CANNOT_INVITE_SELF', 'Você não pode convidar a si mesmo.');
    }
    if (await this.family.getActiveMembership(invitee.id)) {
      throw new DomainError('ALREADY_IN_FAMILY_GROUP', 'Este usuário já participa de um grupo familiar.');
    }
    if (await this.family.hasPendingInvite(invitee.id)) {
      throw new DomainError('INVITE_ALREADY_PENDING', 'Este usuário já possui um convite pendente.');
    }

    const inviter = await this.users.findActiveById(userId);
    if (!inviter) throw new DomainError('NOT_FOUND', 'Usuário não encontrado.');

    let membership = await this.family.getActiveMembership(userId);
    if (membership && membership.role !== 'OWNER') {
      throw new DomainError('FORBIDDEN', 'Apenas o proprietário pode convidar membros.');
    }
    if (!membership) {
      await this.family.createGroup(inviter, this.clock.now());
      membership = await this.family.getActiveMembership(userId);
    }

    const invite = await this.family.createInvite({
      familyGroupId: membership!.familyGroupId,
      inviterId: userId,
      inviteeId: invitee.id,
      inviteeEmail: invitee.email,
    });
    const inviterName = `${inviter.firstName} ${inviter.lastName}`.trim();
    await this.notifications.create({
      userId: invitee.id,
      type: 'FAMILY_INVITE_RECEIVED',
      title: 'Novo convite familiar',
      body: `${inviterName} convidou você para participar de um grupo familiar.`,
      payload: { inviteId: invite.id, familyGroupId: invite.familyGroupId },
    });
    return invite;
  }
}

export class ListReceivedInvitesUseCase implements ListReceivedInvites {
  constructor(private family: FamilyRepository) {}

  execute(userId: number) {
    return this.family.listReceivedInvites(userId);
  }
}

export class AcceptFamilyInviteUseCase implements AcceptFamilyInvite {
  constructor(
    private family: FamilyRepository,
    private notifications: NotificationRepository,
    private clock: Clock,
  ) {}

  async execute(userId: number, inviteId: number) {
    const invite = await this.family.findInvite(inviteId, userId);
    if (!invite) throw new DomainError('NOT_FOUND', 'Convite não encontrado.');
    if (invite.status !== 'PENDING') {
      throw new DomainError('INVITE_NOT_PENDING', 'Este convite não está pendente.');
    }
    if (await this.family.getActiveMembership(userId)) {
      throw new DomainError('ALREADY_IN_FAMILY_GROUP', 'Você já participa de um grupo familiar.');
    }

    await this.family.acceptInvite(invite, this.clock.now());
    await this.notifications.create({
      userId: invite.inviterId,
      type: 'INVITE_ACCEPTED',
      title: 'Convite aceito',
      body: 'Seu convite para o grupo familiar foi aceito.',
      payload: { inviteId, familyGroupId: invite.familyGroupId },
    });
    return (await this.family.getActiveFamily(userId))!;
  }
}

export class DeclineFamilyInviteUseCase implements DeclineFamilyInvite {
  constructor(
    private family: FamilyRepository,
    private notifications: NotificationRepository,
    private clock: Clock,
  ) {}

  async execute(userId: number, inviteId: number) {
    const invite = await this.family.findInvite(inviteId, userId);
    if (!invite) throw new DomainError('NOT_FOUND', 'Convite não encontrado.');
    if (invite.status !== 'PENDING') {
      throw new DomainError('INVITE_NOT_PENDING', 'Este convite não está pendente.');
    }

    await this.family.declineInvite(invite, this.clock.now());
    await this.notifications.create({
      userId: invite.inviterId,
      type: 'INVITE_DECLINED',
      title: 'Convite recusado',
      body: 'Seu convite para o grupo familiar foi recusado.',
      payload: { inviteId, familyGroupId: invite.familyGroupId },
    });
  }
}

export class LeaveFamilyGroupUseCase implements LeaveFamilyGroup {
  constructor(private family: FamilyRepository, private clock: Clock) {}

  async execute(userId: number) {
    const membership = await this.family.getActiveMembership(userId);
    if (!membership) throw new DomainError('NOT_FOUND', 'Grupo familiar não encontrado.');
    if (membership.role === 'OWNER') {
      throw new DomainError('OWNER_CANNOT_LEAVE', 'O proprietário deve dissolver o grupo.');
    }
    await this.family.leave(userId, this.clock.now());
  }
}

export class RemoveFamilyMemberUseCase implements RemoveFamilyMember {
  constructor(
    private family: FamilyRepository,
    private notifications: NotificationRepository,
    private clock: Clock,
  ) {}

  async execute(ownerId: number, memberUserId: number) {
    if (ownerId === memberUserId) {
      throw new DomainError('FORBIDDEN', 'O proprietário não pode remover a si mesmo.');
    }
    if (!(await this.family.remove(ownerId, memberUserId, this.clock.now()))) {
      throw new DomainError('NOT_FOUND', 'Membro não encontrado.');
    }
    await this.notifications.create({
      userId: memberUserId,
      type: 'MEMBER_REMOVED',
      title: 'Você foi removido',
      body: 'Você foi removido do grupo familiar.',
    });
  }
}

export class DissolveFamilyGroupUseCase implements DissolveFamilyGroup {
  constructor(
    private family: FamilyRepository,
    private notifications: NotificationRepository,
    private clock: Clock,
  ) {}

  async execute(ownerId: number) {
    const ids = await this.family.dissolve(ownerId, this.clock.now());
    if (!ids.length) {
      throw new DomainError('FORBIDDEN', 'Apenas o proprietário pode dissolver o grupo.');
    }
    await Promise.all(
      ids
        .filter((id) => id !== ownerId)
        .map((userId) =>
          this.notifications.create({
            userId,
            type: 'GROUP_DISSOLVED',
            title: 'Grupo dissolvido',
            body: 'O grupo familiar foi dissolvido.',
          }),
        ),
    );
  }
}
