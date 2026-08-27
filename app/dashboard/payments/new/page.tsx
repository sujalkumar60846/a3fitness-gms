import { getMemberById } from "@/app/actions/member.actions";
import { getGymSettings } from "@/app/actions/settings.actions";
import { RecordPaymentForm } from "./record-payment-form";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string }>;
}) {
  const { memberId } = await searchParams;
  const [member, settings] = await Promise.all([
    memberId ? getMemberById(memberId) : Promise.resolve(null),
    getGymSettings(),
  ]);
  const defaultPricing = (settings?.defaultPricing as Record<string, number>) ?? {};

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-zinc-900">Record Payment</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Collecting a fee renews the member&apos;s plan, generates a PDF invoice, and sends it to them over WhatsApp.
      </p>
      <div className="mt-6">
        <RecordPaymentForm
          defaultPricing={defaultPricing}
          initialMember={
            member
              ? {
                  id: member.id,
                  fullName: member.fullName,
                  memberCode: member.memberCode,
                  phone: member.phone,
                  photoUrl: member.photoUrl,
                  activeSubscription: (() => {
                    const active = member.subscriptions.find((s) => s.status === "ACTIVE");
                    if (!active) return null;
                    return {
                      planMonths: active.planMonths,
                      feeAmount: Number(active.feeAmount),
                      dueDate: active.dueDate,
                    };
                  })(),
                }
              : null
          }
        />
      </div>
    </div>
  );
}
