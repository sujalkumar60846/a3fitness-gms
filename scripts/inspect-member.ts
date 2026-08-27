import { prisma } from "../lib/prisma";

async function main() {
  const member = await prisma.member.findUnique({
    where: { memberCode: "GYM-0001" },
    include: {
      subscriptions: true,
      payments: true,
    },
  });

  console.log("MEMBER:", member?.fullName, member?.memberCode);
  console.log("SUBSCRIPTIONS:", JSON.stringify(member?.subscriptions, null, 2));
  console.log("PAYMENTS:", JSON.stringify(member?.payments, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
