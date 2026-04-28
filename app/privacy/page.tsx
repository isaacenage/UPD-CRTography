import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Hanap-Bidet",
  description:
    "How Hanap-Bidet handles geolocation, camera input, anonymous contributions, and third-party services for the UP Diliman comfort room atlas.",
};

const LAST_UPDATED = "April 28, 2026";

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-2 font-mono text-[10px] tracking-widest uppercase text-gray-500">
            Last updated · {LAST_UPDATED}
          </p>
        </header>

        <section className="mt-8 space-y-6 text-sm leading-relaxed text-gray-700 dark:text-gray-700">
          <Intro />

          <Section title="1. The short version">
            <ul className="list-disc pl-5 space-y-1">
              <li>No account. No login. No sign-up. Ever.</li>
              <li>
                We do <strong>not</strong> collect your name, email, phone
                number, IP address, device ID, or any other identifier
                that could be used to recognize you across visits.
              </li>
              <li>
                We do <strong>not</strong> use cookies for tracking. We do
                <strong> not </strong>integrate analytics, advertising
                pixels, or session-replay tooling.
              </li>
              <li>
                Geolocation and camera permissions are only requested at
                the exact moment you use a feature that needs them
                (directions, locate, or contributing). They are released
                immediately after.
              </li>
              <li>
                Contributions are <strong>anonymous</strong>. The photo
                and the GPS coordinates of the building are stored. No
                identifier of who submitted them is captured.
              </li>
              <li>
                The site is open source. Anyone can audit exactly what
                code runs in your browser and on the server.
              </li>
            </ul>
          </Section>

          <Section title="2. What we do not collect">
            <p>
              In the course of normal use, the site does not request, store,
              or transmit any of the following:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your full name, nickname, alias, or username.</li>
              <li>Your email address, phone number, or other contact details.</li>
              <li>Your UP student / employee ID or any institutional identifier.</li>
              <li>Your social media handles or profiles.</li>
              <li>Your IP address (beyond what your hosting provider sees at the network layer for routine request handling — see Section 6).</li>
              <li>Your device's advertising ID, IDFA, or fingerprint.</li>
              <li>Your contacts, calendar, microphone, or files unrelated to a photo you choose.</li>
              <li>Your browsing history, both on this site and elsewhere.</li>
              <li>Any payment information &mdash; the site is free.</li>
            </ul>
          </Section>

          <Section title="3. What we do collect, when, and why">
            <p>
              Only the following data is handled, and only for the
              corresponding feature:
            </p>
            <SubSection
              title="Geolocation (GPS)"
              when="When you tap “Get Directions”, the locate button, or “Use my current location” inside the Contribute flow."
              what="Your latitude, longitude, and the GPS accuracy reported by your browser."
              why="To draw a walking route from your position to the destination, to recenter the map on you, or to attach precise coordinates to a contribution."
              kept="Coordinates used for routing or recentering live in your browser tab only and are dropped when the tab closes. Coordinates submitted with a contribution are stored alongside the contribution."
            />
            <SubSection
              title="Camera"
              when="When you tap “Take a photo” inside the Contribute flow or the photo upload form on a building."
              what="The single still image you select with the device camera."
              why="To verify the building exists and that the bidet is real before incorporating it into the public dataset."
              kept="The photo is uploaded to our Supabase storage bucket. If you submitted it with a contribution it is associated with that contribution row. Approved photos are publicly visible on the map; rejected ones are deleted."
            />
            <SubSection
              title="Building name, gender, and access attributes"
              when="When you submit a contribution."
              what="The text and dropdown values you typed/selected in the Contribute form."
              why="So a maintainer can review the entry and so the pin can be rendered on the map with accurate metadata."
              kept="Stored alongside the contribution. Once approved, becomes part of the public dataset."
            />
            <SubSection
              title="Photo report comments"
              when="When you flag an existing photo as troll/incorrect."
              what="The text you typed in the report form."
              why="To give the dev context for whether to remove the photo."
              kept="Stored on the open report. Dropped when the report is resolved."
            />
            <p className="text-xs text-gray-500">
              That is the complete list. There is nothing else.
            </p>
          </Section>

          <Section title="4. Anonymity of contributions">
            <p>
              Contributions and reports are submitted without any user
              identifier. The site does not generate a user id, does not
              persist a session cookie that could link entries together,
              and does not store the IP address of the submitter alongside
              the row. From the maintainer's point of view, every
              submission is from &ldquo;someone&rdquo; &mdash; never from a
              named or trackable individual.
            </p>
            <p>
              That also means we cannot send you a confirmation email, we
              cannot follow up if a submission is unclear, and we cannot
              restore a contribution to &ldquo;your account&rdquo; if you
              reinstall your browser. That trade-off is intentional.
            </p>
          </Section>

          <Section title="5. Permissions in detail">
            <p>
              Both geolocation and camera access happen through the
              standard browser permission system. The browser, not the
              site, owns the permission state. You can revoke either at
              any time from your browser's site settings, and the site
              will simply stop being able to use the corresponding
              feature.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Geolocation</strong> uses{" "}
                <code>navigator.geolocation.getCurrentPosition</code>. It
                runs once per request and is not kept open in the
                background. There is no continuous tracking.
              </li>
              <li>
                <strong>Camera</strong> uses an HTML file picker with the{" "}
                <code>capture</code> attribute. The browser opens the
                native camera UI. The site never receives a live video
                stream &mdash; only the still image you pick after taking
                the shot.
              </li>
            </ul>
            <p>
              Photos are compressed in your browser before upload to
              minimize bandwidth and to strip large amounts of EXIF metadata
              that some camera apps embed. We don&rsquo;t inspect EXIF
              values, but we recommend assuming nothing about EXIF survives
              the compression pass.
            </p>
          </Section>

          <Section title="6. Local storage in your browser">
            <p>
              The site uses your browser's <code>localStorage</code> for a
              few small, non-tracking conveniences:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Whether the location permission explainer has already been shown.</li>
              <li>Your light/dark theme preference.</li>
              <li>A local cache of contributions you submitted yourself, so they appear immediately on your map even before the network round-trip completes.</li>
            </ul>
            <p>
              These values never leave your device. Clearing site data in
              your browser wipes them. None are used to identify you.
            </p>
          </Section>

          <Section title="7. Third-party services">
            <p>
              The map is composed of several upstream services. When your
              browser fetches resources from them, those services see your
              network-level information (IP address, user agent) the same
              way they would for any website that uses them.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>OpenFreeMap</strong> and <strong>CARTO</strong> serve basemap tiles.
              </li>
              <li>
                <strong>OSRM</strong> (project-osrm.org or a self-hosted
                replacement) computes walking directions when you request
                them. Only the start and end coordinates of the route
                request are sent.
              </li>
              <li>
                <strong>Supabase</strong> stores approved photos, photo
                reports, and contribution records. Anonymous keys are used;
                no per-user authentication is performed.
              </li>
              <li>
                <strong>Vercel</strong> (or the project's chosen host)
                serves the static site. Like any web host, it observes
                request metadata for operational and abuse-prevention
                purposes.
              </li>
            </ul>
            <p>
              Each provider has its own privacy policy that governs what
              they do with the network-level information they see.
              Hanap-Bidet does not pass any extra identifying data to
              them.
            </p>
          </Section>

          <Section title="8. Data retention">
            <p>
              Approved photos and approved contribution metadata are
              retained indefinitely as part of the public dataset. Pending
              entries that are rejected during review are deleted from the
              database, and their photos are removed from storage.
              Outstanding photo reports are removed once resolved.
            </p>
            <p>
              Because the project is open source, prior versions of the
              public dataset may persist in the Git history of the
              repository. If you submitted something and want it removed
              after the fact, see Section 11.
            </p>
          </Section>

          <Section title="9. Security">
            <p>
              We use the standard security primitives of our hosting
              providers (TLS in transit, role-based access keys for the
              database, signed URLs for storage where appropriate). No
              system is invulnerable, but the attack surface is small:
              there is no login system to compromise and no user accounts
              to leak.
            </p>
          </Section>

          <Section title="10. Children">
            <p>
              The site is not directed at children under 13 and is not
              designed to collect any personal data from anyone. If you
              are under 13 and would like to contribute, please ask a
              parent or guardian to help.
            </p>
          </Section>

          <Section title="11. Removal requests">
            <p>
              Because submissions are anonymous, we cannot match a removal
              request to &ldquo;your&rdquo; submission by identity alone.
              If you would like a specific photo or contribution removed,
              the easiest path is to use the in-app{" "}
              <strong>Report</strong> action on the photo, which opens a
              report visible to the maintainers.
            </p>
            <p>
              Alternatively, open an issue or send a message via the
              project's public repository describing the photo or pin
              (e.g. building, approximate time of submission). We act on
              good-faith removal requests promptly.
            </p>
          </Section>

          <Section title="12. Open source transparency">
            <p>
              You don't have to take this policy at face value. The full
              source code of the site is available in the project's
              public repository &mdash; including every network call,
              every storage write, and the SQL schema for the database.
              Independent audits and pull requests are welcomed.
            </p>
          </Section>

          <Section title="13. Changes to this policy">
            <p>
              If this policy changes in a way that affects how data is
              handled, the &ldquo;Last updated&rdquo; date above will move
              and a brief note describing the change will be added to the
              project changelog. Continued use of the site after a change
              means you accept the new version.
            </p>
          </Section>

          <Section title="14. Contact">
            <p>
              For privacy questions, takedown requests, or anything else
              related to this policy, please open an issue in the
              project's public repository (linked from the footer of the
              README). For urgent content concerns, the in-app
              &ldquo;Report&rdquo; button on a photo is the fastest path.
            </p>
          </Section>
        </section>

        <footer className="mt-10 pt-6 border-t border-gray-200 text-xs text-gray-500 flex gap-6 font-mono tracking-widest uppercase">
          <Link
            href="/terms"
            className="underline underline-offset-4 hover:opacity-70"
          >
            Terms
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
        <strong>Plain-language summary.</strong> Hanap-Bidet does not collect
        personal information. There are no accounts, no tracking cookies, no
        analytics, and no advertising integrations. Camera and GPS
        permissions are used only at the moment you submit a contribution or
        request walking directions, and they are released immediately
        after. Contributions are stored without any link back to who
        submitted them.
      </p>
      <p className="text-xs text-gray-500">
        This summary is informational. The numbered sections below are the
        binding policy.
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

function SubSection({
  title,
  when,
  what,
  why,
  kept,
}: {
  title: string;
  when: string;
  what: string;
  why: string;
  kept: string;
}) {
  return (
    <div className="rounded-sm border border-gray-200 bg-paper p-3 space-y-1.5 text-[13px]">
      <div className="font-bold text-ink">{title}</div>
      <DataLine label="When" value={when} />
      <DataLine label="What" value={what} />
      <DataLine label="Why" value={why} />
      <DataLine label="How long" value={kept} />
    </div>
  );
}

function DataLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[60px_1fr] gap-3">
      <div className="font-mono text-[10px] tracking-widest uppercase text-gray-500 pt-0.5">
        {label}
      </div>
      <div>{value}</div>
    </div>
  );
}
