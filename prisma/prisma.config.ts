// prisma/prisma.config.ts
import "dotenv/config";

const prismaConfig = {
  schema: "./schema.prisma",
  generators: {
    client: {
      provider: "prisma-client",
      output: "../app/generated/prisma/client",
    },
  },
};

export default prismaConfig;
