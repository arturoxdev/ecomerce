import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

type HeroProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
};

export function StaticPageHero({ eyebrow, title, subtitle }: HeroProps) {
  return (
    <section className="bg-[linear-gradient(180deg,#fff7ed_0%,#f8f7f5_100%)] px-6 py-16 lg:px-20">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center">
        {eyebrow ? (
          <span className="rounded-full border border-[#fed7aa] bg-white px-4 py-1 text-sm font-semibold text-primary">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-600">{subtitle}</p>
      </div>
    </section>
  );
}

export function DocumentShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-white px-6 py-12 lg:px-20">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto w-full max-w-[900px] rounded-2xl border border-[#f1f5f9] bg-white p-8 shadow-[0_12px_32px_rgba(15,23,42,0.06)] sm:p-12">
          {children}
        </div>
      </div>
    </section>
  );
}

export function AboutStorySection({
  locale,
  storyTitle,
  storyBody,
  valuesTitle,
  valuesBody,
}: {
  locale: string;
  storyTitle: string;
  storyBody: string;
  valuesTitle: string;
  valuesBody: string;
}) {
  const cards =
    locale === "es"
      ? [
          {
            title: "Equipo preparado",
            body: "Artículos limpios e inspeccionados para eventos familiares y celebraciones.",
          },
          {
            title: "Entrega cercana",
            body: "Comunicación clara desde la reservación hasta la recolección.",
          },
          {
            title: "Soporte flexible",
            body: "Ayuda para paquetes, fechas especiales y eventos grandes.",
          },
        ]
      : [
          {
            title: "Prepared equipment",
            body: "Clean, inspected items ready for family events and celebrations.",
          },
          {
            title: "Friendly delivery",
            body: "Clear communication from booking through setup and pickup.",
          },
          {
            title: "Flexible support",
            body: "Help for custom packages, timing questions, and large events.",
          },
        ];

  return (
    <>
      <section className="bg-white px-6 py-12 lg:px-20">
        <div className="mx-auto grid max-w-6xl gap-10 rounded-3xl bg-white lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-2xl bg-slate-200 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1669670131653-dc07f4be01ec?auto=format&fit=crop&w=1200&q=80"
              alt="Party setup"
              className="h-full min-h-[320px] w-full object-cover"
            />
          </div>

          <div className="flex flex-col justify-center rounded-2xl bg-[#f8f7f5] p-8 sm:p-10">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {storyTitle}
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">{storyBody}</p>
          </div>
        </div>
      </section>

      <section className="bg-[#f8f7f5] px-6 py-12 lg:px-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {valuesTitle}
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">{valuesBody}</p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {cards.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[#f1f5f9] bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
              >
                <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function ContactInfoSection({
  locale,
  location,
  phone,
  email,
  businessHours,
}: {
  locale: string;
  location: string;
  phone: string;
  email: string;
  businessHours: string;
}) {
  const copy =
    locale === "es"
      ? {
          title: "Envíanos un mensaje",
          subtitle:
            "Con gusto te ayudamos con disponibilidad, paquetes y detalles para tu evento.",
          name: "Nombre",
          email: "Correo",
          phone: "Teléfono",
          date: "Fecha del evento",
          message: "Mensaje",
          button: "Escríbenos por correo",
          placeholders: {
            name: "Tu nombre",
            email: "tu@email.com",
            phone: "+1 (713) 555-0198",
            date: "MM/DD/YYYY",
            message: "Cuéntanos sobre tu evento",
          },
          cards: [
            { title: "Ubicación", value: location, icon: MapPin },
            { title: "Teléfono", value: phone, icon: Phone },
            { title: "Correo", value: email, icon: Mail },
            { title: "Horario", value: businessHours, icon: Clock3 },
          ],
        }
      : {
          title: "Send us a message",
          subtitle:
            "We are happy to help with availability questions, bundle requests, and event planning details.",
          name: "Name",
          email: "Email",
          phone: "Phone",
          date: "Event date",
          message: "Message",
          button: "Email our team",
          placeholders: {
            name: "Your name",
            email: "you@example.com",
            phone: "+1 (713) 555-0198",
            date: "MM/DD/YYYY",
            message: "Tell us about your event",
          },
          cards: [
            { title: "Location", value: location, icon: MapPin },
            { title: "Phone", value: phone, icon: Phone },
            { title: "Email", value: email, icon: Mail },
            { title: "Business hours", value: businessHours, icon: Clock3 },
          ],
        };

  return (
    <section className="bg-white px-6 py-12 lg:px-20">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_380px]">
        <div className="rounded-2xl border border-[#f1f5f9] bg-[#f8f7f5] p-8 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:p-10">
          <h2 className="text-2xl font-bold text-slate-900">{copy.title}</h2>
          <p className="mt-3 max-w-xl text-slate-600">
            {copy.subtitle}
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Field label={copy.name} placeholder={copy.placeholders.name} />
            <Field label={copy.email} placeholder={copy.placeholders.email} />
            <Field label={copy.phone} placeholder={copy.placeholders.phone} />
            <Field label={copy.date} placeholder={copy.placeholders.date} />
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              {copy.message}
            </label>
            <textarea
              rows={5}
              className="w-full rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary"
              placeholder={copy.placeholders.message}
            />
          </div>

          <button className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-white transition hover:bg-green-800">
            {copy.button}
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {copy.cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-2xl border border-[#f1f5f9] bg-[#f8f7f5] p-6 shadow-[0_8px_20px_rgba(15,23,42,0.03)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{card.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{card.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <input
        className="h-12 w-full rounded-xl border border-[#e2e8f0] bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-primary"
        placeholder={placeholder}
      />
    </div>
  );
}

export function FaqSection({
  items,
  locale,
  ctaTitle,
  ctaSubtitle,
  ctaButtonLabel,
}: {
  items: { id: string; question: string; answer: string }[];
  locale: string;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButtonLabel: string;
}) {
  return (
    <>
      <section className="bg-white px-6 py-12 lg:px-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-[900px] overflow-hidden rounded-2xl border border-[#f1f5f9] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
            {items.map((item, index) => (
              <details
                key={item.id}
                open={index === 0}
                className="group border-b border-[#f1f5f9] last:border-b-0"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between px-8 py-6 text-left text-lg font-semibold text-slate-900">
                  <span>{item.question}</span>
                  <span className="text-primary transition group-open:rotate-45">+</span>
                </summary>
                <div className="px-8 pb-6 text-base leading-8 text-slate-600">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8f7f5] px-6 py-12 lg:px-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center">
          <h2 className="text-3xl font-bold text-slate-900">{ctaTitle}</h2>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            {ctaSubtitle}
          </p>
          <Link
            href={`/${locale}/contact`}
            className="inline-flex items-center justify-center rounded-xl bg-secondary px-7 py-3 text-sm font-bold text-white transition hover:bg-green-800"
          >
            {ctaButtonLabel}
          </Link>
        </div>
      </section>
    </>
  );
}
