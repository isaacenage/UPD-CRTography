import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · Hanap-Bidet",
  description:
    "Terms governing use of the Hanap-Bidet UP Diliman comfort room atlas.",
};

const LAST_UPDATED = "April 28, 2026";

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
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-2 font-mono text-[10px] tracking-widest uppercase text-gray-500">
            Last updated · {LAST_UPDATED}
          </p>
        </header>

        <section className="mt-8 space-y-6 text-sm leading-relaxed text-gray-700 dark:text-gray-700">
          <Intro />

          <Section title="1. About this project">
            <p>
              Hanap-Bidet is a free, open-source community map of comfort
              rooms across the University of the Philippines Diliman campus.
              It exists to help students, faculty, staff, and visitors find
              clean, safe, and accessible facilities — and to surface where
              bidets are available.
            </p>
            <p>
              The project is maintained by independent volunteers and is
              <strong> not </strong>an official publication of the University
              of the Philippines. Building data is sourced from publicly
              shared posts (originally{" "}
              <a
                href="https://www.facebook.com/share/p/1HwxPg9ETt/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:opacity-80"
              >
                Philippine Collegian
              </a>
              ) and from contributions submitted directly through this site.
            </p>
            <p>
              The source code, data files, and these policies are open under
              the project's repository license. You are welcome to read,
              audit, fork, and propose changes to anything you see in the
              app or the dataset.
            </p>
          </Section>

          <Section title="2. Acceptance of these terms">
            <p>
              By using Hanap-Bidet — visiting the map, searching for a
              building, requesting walking directions, or submitting a
              contribution — you agree to these Terms of Service and the
              accompanying{" "}
              <Link
                href="/privacy"
                className="underline underline-offset-4 hover:opacity-80"
              >
                Privacy Policy
              </Link>
              . If you do not agree, please stop using the site.
            </p>
            <p>
              These terms can be updated as the project evolves. Material
              changes will be reflected by updating the &ldquo;Last
              updated&rdquo; date above; continued use after a change means
              you accept the new version.
            </p>
          </Section>

          <Section title="3. Who can use it">
            <p>
              The site is open to anyone &mdash; no account, login, sign-up,
              or invite is required. There is no age gate, but contributors
              under the age of 13 should ask a parent or guardian before
              submitting photos or location data.
            </p>
          </Section>

          <Section title="4. Acceptable use">
            <p>You agree to use Hanap-Bidet only for lawful purposes. You will not:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Submit photos containing other people, their faces, license plates, or other identifying information without their consent.</li>
              <li>Submit nudity, sexually explicit imagery, hateful imagery, harassment, or content depicting illegal activity.</li>
              <li>Submit fabricated or knowingly inaccurate locations, photos, or attributes.</li>
              <li>Use scrapers, headless tooling, or scripts to harvest data, hammer the routing endpoint, or upload bulk content without prior coordination with the maintainers.</li>
              <li>Attempt to interfere with or compromise the integrity of the site, its hosting infrastructure, or its third-party services.</li>
            </ul>
            <p>
              The maintainers reserve the right to remove any submission
              that violates these rules or that, in their judgment,
              undermines the usefulness or safety of the map &mdash; with or
              without notice.
            </p>
          </Section>

          <Section title="5. Community contributions">
            <p>
              Contributions are the heart of the project. When you submit a
              new building entry or photo, you confirm that:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The information is, to the best of your knowledge, accurate at the time of submission.</li>
              <li>You captured the photo yourself or have permission from the photographer to share it.</li>
              <li>The photo does not reveal personal information about other individuals.</li>
              <li>You grant the project a non-exclusive, perpetual, royalty-free license to display, distribute, and incorporate the contribution into the public dataset (including in derived open-source releases) so that everyone can benefit from it.</li>
            </ul>
            <p>
              Contributions are submitted <strong>anonymously</strong>. The
              site does not collect your name, email, IP address, or any
              other identifier alongside a contribution. See the{" "}
              <Link
                href="/privacy"
                className="underline underline-offset-4 hover:opacity-80"
              >
                Privacy Policy
              </Link>{" "}
              for details on how submissions are handled.
            </p>
            <p>
              All submissions enter a review queue. A maintainer checks each
              entry before it appears as an approved pin. We may edit or
              consolidate descriptions for clarity before publication, and
              we may decline submissions that are duplicates, obviously
              incorrect, or off-topic.
            </p>
          </Section>

          <Section title="6. Required device permissions">
            <p>
              Some features need access to your device hardware. We only
              ever ask for the minimum required, and you may decline at the
              browser prompt.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Geolocation (GPS).</strong> Required when you tap
                &ldquo;Get Directions&rdquo; on a building, when you press
                the locate button, or when you submit a new building
                contribution. Your coordinates are used in your browser to
                draw a walking route or to attach to a contribution. The
                site does not log your raw location otherwise.
              </li>
              <li>
                <strong>Camera.</strong> Required only when you choose to
                add a photo to an existing building or to submit a new
                building contribution. The site uses the standard browser
                file picker with the device camera; no live preview is
                streamed off-device.
              </li>
            </ul>
            <p>
              If you decline a permission, the related feature simply will
              not work for that session — you can still browse the rest of
              the map normally.
            </p>
          </Section>

          <Section title="7. Walking directions disclaimer">
            <p>
              Walking routes are computed by an external Open Source Routing
              Machine (OSRM) endpoint and are based on third-party street
              data. They are best-effort suggestions, not guarantees. Routes
              may suggest paths that are temporarily blocked, behind locked
              gates, or otherwise unsafe to follow. Always use your own
              judgment and obey on-the-ground signage.
            </p>
          </Section>

          <Section title="8. Accuracy and currency of data">
            <p>
              The map relies on community input. Buildings can change, CRs
              can be renovated, bidets can be removed or added, and access
              policies can shift without notice. We make no warranty that
              any specific entry is current. If you spot an error, please
              use the &ldquo;Report&rdquo; button on a photo or the
              &ldquo;Contribute&rdquo; button to submit an update.
            </p>
          </Section>

          <Section title="9. Open source and third-party services">
            <p>
              Hanap-Bidet is built on open infrastructure. The site uses,
              among others:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>OpenFreeMap</strong> and <strong>CARTO</strong> for basemap tiles.</li>
              <li><strong>MapLibre GL JS</strong> for rendering the map.</li>
              <li><strong>OSRM</strong> for walking-route computation.</li>
              <li><strong>Supabase</strong> for storing approved building photos and (when configured) community contribution records.</li>
              <li><strong>Vercel</strong> (or similar) for static hosting.</li>
            </ul>
            <p>
              Each service has its own terms; using Hanap-Bidet does not
              create any relationship between you and those providers
              beyond what their own terms describe.
            </p>
          </Section>

          <Section title="10. Intellectual property">
            <p>
              The Hanap-Bidet code, dataset, and map content are released
              under the project's open-source license, with attribution to
              contributors where appropriate. The University of the
              Philippines name and seal are property of the University and
              are referenced only descriptively.
            </p>
          </Section>

          <Section title="11. Disclaimer of warranties">
            <p>
              The site is provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo;, without warranties of any kind, express or
              implied, including but not limited to warranties of
              merchantability, fitness for a particular purpose, accuracy,
              or non-infringement. Your use of the site is at your sole
              risk.
            </p>
          </Section>

          <Section title="12. Limitation of liability">
            <p>
              To the fullest extent permitted by law, the project
              maintainers are not liable for any indirect, incidental,
              special, consequential, or punitive damages, or any loss of
              data, arising out of or relating to your use of the site,
              even if advised of the possibility of such damages.
            </p>
          </Section>

          <Section title="13. Changes to the project">
            <p>
              The maintainers may modify, suspend, or discontinue any part
              of the site at any time, including features, datasets, or the
              site as a whole. Because the project is open source, the
              source and the data remain available in the public
              repository for anyone who wishes to fork or self-host.
            </p>
          </Section>

          <Section title="14. Contact and reporting issues">
            <p>
              For bugs, suggestions, takedown requests, or anything else,
              please open an issue or pull request in the project's GitHub
              repository (linked from the footer of the README). For
              urgent content concerns &mdash; e.g. a photo that should not
              be public &mdash; use the &ldquo;Report&rdquo; button on the
              photo so a maintainer can review and remove it.
            </p>
          </Section>
        </section>

        <footer className="mt-10 pt-6 border-t border-gray-200 text-xs text-gray-500 flex gap-6 font-mono tracking-widest uppercase">
          <Link
            href="/privacy"
            className="underline underline-offset-4 hover:opacity-70"
          >
            Privacy
          </Link>
          <Link
            href="/"
            className="underline underline-offset-4 hover:opacity-70"
          >
            Map
          </Link>
        </footer>
      </div>
    </main>
  );
}

function Intro() {
  return (
    <div className="rounded-sm border border-gray-200 bg-paper p-4 space-y-2">
      <p>
        <strong>Plain-language summary.</strong> Hanap-Bidet is a free,
        open-source community map of UP Diliman comfort rooms with a focus
        on bidet availability. Use it freely. Contribute anonymously if you
        can &mdash; we don&rsquo;t collect your name, email, or any other
        identifier when you do. Camera and location permissions are only
        used at the moment you submit something, and never logged in the
        background. The map is helpful but not authoritative; please use
        your judgment on the ground.
      </p>
      <p className="text-xs text-gray-500">
        This summary is informational. The numbered sections below are the
        binding terms.
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {children}
    </div>
  );
}
