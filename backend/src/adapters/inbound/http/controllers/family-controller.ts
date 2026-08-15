import type { NextFunction, Request, Response } from 'express';
import type { AcceptFamilyInvite, DeclineFamilyInvite, DissolveFamilyGroup, GetMyFamily, InviteFamilyMember, LeaveFamilyGroup, ListReceivedInvites, RemoveFamilyMember } from '../../../../application/ports/inbound/family.js';
import { familyIdSchema, inviteFamilySchema } from '../dto/family-dto.js';
export class FamilyController {
  constructor(private getFamily: GetMyFamily, private invite: InviteFamilyMember, private received: ListReceivedInvites, private accept: AcceptFamilyInvite, private decline: DeclineFamilyInvite, private removeMember: RemoveFamilyMember, private leaveGroup: LeaveFamilyGroup, private dissolveGroup: DissolveFamilyGroup) {}
  get = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ group: await this.getFamily.execute(req.userId!) }); } catch (e) { next(e); } };
  createInvite = async (req: Request, res: Response, next: NextFunction) => { try { res.status(201).json({ invite: await this.invite.execute(req.userId!, inviteFamilySchema.parse(req.body).email) }); } catch (e) { next(e); } };
  listReceived = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ invites: await this.received.execute(req.userId!) }); } catch (e) { next(e); } };
  acceptInvite = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ group: await this.accept.execute(req.userId!, familyIdSchema.parse(req.params.id)) }); } catch (e) { next(e); } };
  declineInvite = async (req: Request, res: Response, next: NextFunction) => { try { await this.decline.execute(req.userId!, familyIdSchema.parse(req.params.id)); res.status(204).send(); } catch (e) { next(e); } };
  remove = async (req: Request, res: Response, next: NextFunction) => { try { await this.removeMember.execute(req.userId!, familyIdSchema.parse(req.params.userId)); res.status(204).send(); } catch (e) { next(e); } };
  leave = async (req: Request, res: Response, next: NextFunction) => { try { await this.leaveGroup.execute(req.userId!); res.status(204).send(); } catch (e) { next(e); } };
  dissolve = async (req: Request, res: Response, next: NextFunction) => { try { await this.dissolveGroup.execute(req.userId!); res.status(204).send(); } catch (e) { next(e); } };
}
