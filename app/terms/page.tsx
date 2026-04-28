import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · Hanap-Bidet",
  description:
    "Terms governing use of the Hanap-Bidet UP Diliman comfort room atlas.",
};

export default function TermsPage() {
  return (
    <main className="min-h-[100svh] bg-paper text-ink">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Link
          href="/"
          className="font-mono text-[10px] tracking-widest uppercase text-maroon-600 dark:text-maroon-300 hover:text-maroon-700 dark:hover:text-maroon-200 underline underline-offset-2"
        >
          &larr; Back to map
        </Link>

        <header className="mt-6">
          <div className="font-mono text-[10px] tracking-widest uppercase text-maroon-600 dark:text-maroon-300 font-medium">
            Hanap-Bidet
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-sm text-gray-600">Coming soon — final policy pending review.</p>
        </header>

        <section className="mt-8 space-y-6 text-sm leading-relaxed text-gray-700">
          <Section title="Acceptance of Terms" />
          <Section title="Use of the Service" />
          <Section title="Geolocation and Map Data" />
          <Section title="Third-Party Services" />
          <Section title="Disclaimer of Warranties" />
          <Section title="Limitation of Liability" />
          <Section title="Changes to These Terms" />
          <Section title="Contact" />
        </section>
      </div>
    </main>
  );
}

function Section({ title }: { title: string }) {
  return (
    <div className="border-t border-gray-100 pt-4">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-gray-500">
        <em>Placeholder &mdash; copy to be supplied.</em>
      </p>
    </div>
  );
}
