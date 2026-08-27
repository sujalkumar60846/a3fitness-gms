import { prisma } from "../lib/prisma";

async function main() {
  const members = await prisma.member.findMany({
    include: {
      subscriptions: true,
      payments: true,
      attendances: true,
    },
  });
  console.log("TOTAL_MEMBERS:", members.length);
  members.forEach((m) => {
    console.log(`- Member Code: ${m.memberCode} | Name: ${m.fullName} | Phone: ${m.phone} | Status: ${m.isActive ? "Active" : "Inactive"}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
