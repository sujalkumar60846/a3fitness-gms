"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/rbac";
import { uploadMemberPhoto, deleteCloudinaryAsset } from "@/lib/cloudinary";
import { generateMemberCode, addMonths } from "@/lib/utils/generators";
import { sendEmailWelcome } from "@/lib/email";
import { getAppBaseUrl } from "@/lib/utils/url";
import { Gender } from "@prisma/client";

type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string };

const registerMemberSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(7).max(20),
  emergencyContact: z.string().min(7).max(20),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  planMonths: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]),
  startDate: z.coerce.date(),
  joiningDate: z.coerce.date().optional(),
  feeAmount: z.number().positive(),
  photoBase64: z.string().optional(), // data URI from camera capture or file upload
  customMemberCode: z.string().max(30).optional().or(z.literal("")),
});

/**
 * Registers a new member + their first Subscription in a single transaction.
 * Generates an unpredictable random Member Code (or validates custom code if provided).
 * Supports a custom joiningDate for onboarding existing gym clients.
 * Photo upload happens BEFORE the transaction (Cloudinary isn't transactional
 * with Postgres), so on DB failure we roll the uploaded asset back manually.
 */
export async function registerMember(
  input: z.infer<typeof registerMemberSchema>
): Promise<ActionResult<{ id: string; memberCode: string }>> {
  const session = await requirePermission("member:create");
  const parsed = registerMemberSchema.parse(input);

  const memberCode = await generateMemberCode(parsed.customMemberCode);

  let photo: { url: string; publicId: string } | null = null;
  try {
    if (parsed.photoBase64) {
      photo = await uploadMemberPhoto(parsed.photoBase64, memberCode);
    }

    const dueDate = addMonths(parsed.startDate, parsed.planMonths);
    const joiningDate = parsed.joiningDate ?? parsed.startDate;

    const member = await prisma.$transaction(async (tx) => {
      const created = await tx.member.create({
        data: {
          memberCode,
          fullName: parsed.fullName,
          email: parsed.email ? parsed.email.trim().toLowerCase() : null,
          phone: parsed.phone,
          emergencyContact: parsed.emergencyContact,
          gender: parsed.gender as Gender,
          joiningDate,
          photoUrl: photo?.url,
          photoPublicId: photo?.publicId,
          registeredById: session.userId,
        },
      });

      await tx.subscription.create({
        data: {
          memberId: created.id,
          planMonths: parsed.planMonths,
          feeAmount: parsed.feeAmount,
          startDate: parsed.startDate,
          dueDate,
          status: "ACTIVE",
        },
      });

      return created;
    });

    // Welcome email (best effort, non-blocking)
    if (member.email) {
      const gymSettings = await prisma.gymSettings.findUnique({ where: { id: "singleton" } });
      const gymName = gymSettings?.gymName || "Our Gym";
      const appBaseUrl = getAppBaseUrl();
      const portalUrl = `${appBaseUrl}/member/${member.memberCode}`;

      sendEmailWelcome({
        to: member.email,
        memberName: member.fullName,
        memberCode: member.memberCode,
        gymName,
        portalUrl,
      }).catch((err) => console.error("Welcome email failed:", err));
    }

    revalidatePath("/dashboard/members");
    return { success: true, data: { id: member.id, memberCode: member.memberCode } };
  } catch (err) {
    // Roll back the orphaned Cloudinary asset if the DB write failed.
    if (photo) await deleteCloudinaryAsset(photo.publicId).catch(() => {});
    return { success: false, error: errorMessage(err) };
  }
}

const updateMemberSchema = z.object({
  memberId: z.string().cuid(),
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(7).max(20).optional(),
  emergencyContact: z.string().min(7).max(20).optional(),
  joiningDate: z.coerce.date().optional(),
  photoBase64: z.string().optional(),
});

export async function updateMember(input: z.infer<typeof updateMemberSchema>): Promise<ActionResult> {
  try {
    await requirePermission("member:update");
    const parsed = updateMemberSchema.parse(input);

    const member = await prisma.member.findUnique({ where: { id: parsed.memberId } });
    if (!member) return { success: false, error: "Member not found." };

    let photoUpdate: { photoUrl?: string; photoPublicId?: string } = {};
    if (parsed.photoBase64) {
      const photo = await uploadMemberPhoto(parsed.photoBase64, member.memberCode);
      photoUpdate = { photoUrl: photo.url, photoPublicId: photo.publicId };
    }

    await prisma.member.update({
      where: { id: parsed.memberId },
      data: {
        fullName: parsed.fullName,
        email: parsed.email !== undefined ? (parsed.email ? parsed.email.trim().toLowerCase() : null) : undefined,
        phone: parsed.phone,
        emergencyContact: parsed.emergencyContact,
        joiningDate: parsed.joiningDate,
        ...photoUpdate,
      },
    });

    revalidatePath("/dashboard/members");
    revalidatePath(`/dashboard/members/${parsed.memberId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

/** Freeze / Deactivate or Unfreeze / Reactivate member */
export async function toggleMemberActive(memberId: string): Promise<ActionResult<{ isActive: boolean }>> {
  try {
    await requirePermission("member:update");
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return { success: false, error: "Member not found." };

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { isActive: !member.isActive },
    });

    revalidatePath("/dashboard/members");
    revalidatePath(`/dashboard/members/${memberId}`);
    revalidatePath("/dashboard/analytics");
    return { success: true, data: { isActive: updated.isActive } };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

/** Staff CANNOT call this — permission map restricts member:delete to SUPER_ADMIN/ADMIN. */
export async function deleteMember(memberId: string): Promise<ActionResult> {
  try {
    await requirePermission("member:delete");
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return { success: false, error: "Member not found." };

    await prisma.member.delete({ where: { id: memberId } }); // cascades attendance/subscriptions/payments
    if (member.photoPublicId) await deleteCloudinaryAsset(member.photoPublicId).catch(() => {});

    revalidatePath("/dashboard/members");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export type MemberStatusFilter = "ACTIVE" | "DUE_SOON" | "EXPIRED" | "INACTIVE" | "ALL";

/**
 * Status is DERIVED, not stored — this avoids drift between a stored enum
 * and the actual due_date, especially since due dates can be edited.
 */
export async function listMembers(filter: MemberStatusFilter = "ALL", search = "") {
  await requirePermission("member:view");

  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const members = await prisma.member.findMany({
    where: {
      OR: search
        ? [
            { fullName: { contains: search, mode: "insensitive" } },
            { memberCode: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { email: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: {
      subscriptions: { orderBy: { dueDate: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const withStatus = members.map((m) => {
    const latest = m.subscriptions[0];
    let status: MemberStatusFilter = "INACTIVE";
    if (!m.isActive) status = "INACTIVE";
    else if (latest) {
      if (latest.dueDate < now) status = "EXPIRED";
      else if (latest.dueDate <= soon) status = "DUE_SOON";
      else status = "ACTIVE";
    }
    return { ...m, computedStatus: status };
  });

  if (filter === "ALL") return withStatus;
  return withStatus.filter((m) => m.computedStatus === filter);
}

/** Lightweight member search for pickers (e.g. the payment recording form) — needs only "member:view". */
export async function searchMembersBasic(query: string) {
  await requirePermission("member:view");
  if (!query || query.trim().length < 2) return [];
  const q = query.trim();

  return prisma.member.findMany({
    where: {
      isActive: true,
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { memberCode: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, memberCode: true, phone: true, email: true, photoUrl: true },
    take: 8,
  });
}

/** Full profile for the member detail page — includes plan history + who registered them. */
export async function getMemberById(memberId: string) {
  await requirePermission("member:view");
  return prisma.member.findUnique({
    where: { id: memberId },
    include: {
      subscriptions: { orderBy: { dueDate: "desc" } },
      registeredBy: { select: { name: true } },
    },
  });
}

function errorMessage(err: unknown): string {
  if (err instanceof z.ZodError) return err.errors.map((e) => e.message).join(", ");
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
