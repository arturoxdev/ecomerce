import Link from "next/link";

import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ locale: string; orderId: string }>;
};

export default async function CancelledPage({ params }: Props) {
  const { locale } = await params;
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">
        Payment cancelled
      </h1>
      <p className="mb-8 text-sm text-slate-500">
        Your cart is still saved. You can come back and try again whenever you
        like.
      </p>
      <Link href={`/${locale}/cart`}>
        <Button>Back to cart</Button>
      </Link>
    </div>
  );
}
