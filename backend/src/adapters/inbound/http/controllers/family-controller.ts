import type { NextFunction, Request, Response } from 'express';
import type {
  AcceptFamilyInvite,
  DeclineFamilyInvite,
  DissolveFamilyGroup,
  GetMyFamily,
  InviteFamilyMember,
  LeaveFamilyGroup,
  ListReceivedInvites,
  RemoveFamilyMember,
} from '../../../../application/ports/inbound/family.js';
import { familyIdSchema, inviteFamilySchema } from '../dto/family-dto.js';

export class FamilyController {
  constructor(
    private getFamily: GetMyFamily,
    private invite: InviteFamilyMember,
    private received: ListReceivedInvites,
    private accept: AcceptFamilyInvite,
    private decline: DeclineFamilyInvite,
    private removeMember: RemoveFamilyMember,
    private leaveGroup: LeaveFamilyGroup,
    private dissolveGroup: DissolveFamilyGroup,
  ) {}

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ group: await this.getFamily.execute(req.userId!) });
    } catch (error) {
      next(error);
    }
  };

  createInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ invite: await this.invite.execute(req.userId!, inviteFamilySchema.parse(req.body).email) });
    } catch (error) {
      next(error);
    }
  };

  listReceived = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ invites: await this.received.execute(req.userId!) });
    } catch (error) {
      next(error);
    }
  };

  acceptInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ group: await this.accept.execute(req.userId!, familyIdSchema.parse(req.params.id)) });
    } catch (error) {
      next(error);
    }
  };

  declineInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.decline.execute(req.userId!, familyIdSchema.parse(req.params.id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.removeMember.execute(req.userId!, familyIdSchema.parse(req.params.userId));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  leave = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.leaveGroup.execute(req.userId!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  dissolve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.dissolveGroup.execute(req.userId!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
