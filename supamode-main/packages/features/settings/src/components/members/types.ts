export type Member = {
  account: {
    id: string;
    authUserId: string;
    createdAt: string;
    updatedAt: string;
    metadata: unknown;
    isActive: boolean;
  };
  displayName: unknown;
  email: string | null;
  pictureUrl: string | null;
  roles: Array<{
    role: {
      id: string;
      name: string;
      description: string | null;
      rank: number | null;
    };
    assignedAt: string;
  }>;
  highestRoleRank: number;
};
