import { prisma } from "../lib/prisma";

async function main() {
  const member = await prisma.member.findUnique({
    where: { memberCode: "GYM-0001" },
  });

  if (!member) {
    console.log("Member GYM-0001 not found");
    return;
  }

  // Delete simulated payments
  const deletedPayments = await prisma.payment.deleteMany({
    where: {
      memberId: member.id,
      method: "ONLINE_RAZORPAY",
    },
  });
  console.log("Deleted simulated payments:", deletedPayments.count);

  // Delete extra subscriptions created by simulation
  const deletedSubs = await prisma.subscription.deleteMany({
    where: {
      memberId: member.id,
      id: { not: "cmt6zt6jg0004nn5fh59l09k6" },
    },
  });
  console.log("Deleted simulated subscriptions:", deletedSubs.count);

  // Reset original subscription to ACTIVE
  await prisma.subscription.update({
    where: { id: "cmt6zt6jg0004nn5fh59l09k6" },
    data: { status: "ACTIVE" },
  });
  console.log("Reset original subscription to ACTIVE (Due: 24 Sept 2026)");
}

main().catch(console.error).finally(() => prisma.$disconnect());
