import { PrismaClient } from '@prisma/client';
import { logger } from '../middleware/logger';

const prisma = new PrismaClient();

export const getUserRepository = () => ({
  findById: async (id: string) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });
      return user;
    } catch (error) {
      logger.error({ userId: id, error }, 'Failed to fetch user');
      throw error;
    }
  },

  findByEmail: async (email: string) => {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });
      return user;
    } catch (error) {
      logger.error({ email, error }, 'Failed to fetch user by email');
      throw error;
    }
  },
});

export const prismaClient = prisma;
