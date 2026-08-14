export interface UserPublic {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends UserPublic { passwordHash: string; deletedAt: Date | null }
