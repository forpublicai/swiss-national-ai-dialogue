"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { requestConsentReopen } from "@/lib/analytics/cookies";

const EFFECTIVE_DATE = "17 July 2026";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="text-foreground text-xl font-semibold lg:text-2xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground text-sm leading-relaxed lg:text-base">
      {children}
    </p>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-foreground mt-6 text-base font-semibold">{children}</h3>
  );
}

function List({ children }: { children: ReactNode }) {
  return (
    <ul className="text-muted-foreground list-disc space-y-2 pl-6 text-sm leading-relaxed lg:text-base">
      {children}
    </ul>
  );
}

const linkClass = "text-foreground underline underline-offset-2";

function ManageCookies() {
  return (
    <button type="button" onClick={requestConsentReopen} className={linkClass}>
      Manage cookies
    </button>
  );
}

const CONTACT_EMAIL = "contact@ideasforchange.org";

export function SwissTerms() {
  return (
    <main className="mx-auto max-w-[820px] px-4 py-12 lg:px-8 lg:py-16">
      <header className="border-border border-b pb-6">
        <h1 className="text-foreground text-3xl font-bold lg:text-4xl">
          Terms of Use &amp; Privacy Notice
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Effective Date: {EFFECTIVE_DATE}
        </p>
      </header>

      <div className="mt-10">
        <Section title="1. Introduction">
          <P>
            Change.org, PBC (“Change.org”) and Metagov, d.b.a. Public AI
            (“Public AI”) operate the Swiss National AI Dialogue (the
            &quot;Program&quot;). Change.org and Public AI are referred to
            together as &quot;we&quot; or &quot;us.&quot;
          </P>
          <P>
            The Program invites participants to share their thoughts concerning
            civic issues. By accessing or using the Program sites, you
            (&quot;you&quot; or &quot;participant&quot;) agree to these Terms of
            Use and Privacy Notice.
          </P>
          <P>
            The Program processes limited personal data (defined below) solely
            to operate core features, maintain security, improve reliability,
            promote civic engagement, and conduct research/analysis related to
            the Program. We use service providers to host the site, store data,
            secure sessions, and measure usage, as detailed below.
          </P>
        </Section>

        <Section title="2. Eligibility and Participation">
          <P>
            <strong>Age Restriction.</strong> Participation is open to
            individuals 18 or older. Individuals under 18 may not participate. We
            do not knowingly collect information from children under 18.
          </P>
          <P>
            <strong>Browser/Device-Based Participation.</strong> Participating in
            the Program does not require creating an account. Participation is
            tied to a browser-specific identifier stored via cookies/local
            storage. You must use the same browser and device (with cookies
            enabled) to continue participating. If you use a shared device, other
            users of that device may be able to continue your session until
            cookies are cleared. Use a private device if possible.
          </P>
          <P>
            <strong>Partner Data Sharing.</strong> Your participation in this
            Program requires that your submissions be shared with our
            deliberation partners from the Swiss National AI Initiative,
            Collective Intelligence Project, and Swiss {"{"}ai{"}"} Weeks so they
            can conduct research and publish the results. If you do not wish to
            share your information with our partners, please do not participate
            in those deliberations. See Section 6.2 and 6.3 for details on how
            they may use your information.
          </P>
        </Section>

        <Section title="3. Acceptable Use">
          <P>
            <strong>Lawful and Respectful Conduct:</strong> You must comply with
            all applicable laws and respect the rights of others. Do not post
            unlawful, defamatory, harassing, or infringing content. We reserve
            the right to remove content or terminate participation for
            violations. We may remove content, limit participation, or invalidate
            submissions to protect the integrity of the Program.
          </P>
          <P>
            <strong>Public Nature of Content:</strong> All submissions may be
            publicly visible along with your canton, and may be viewed by other
            participants, our staff, and civic partners. Your submissions are not
            confidential; do not include personal information about yourself or
            others that you do not wish to be public. Do not include home
            addresses, school names, or contact details in any submission. You
            may not submit content that includes other people’s personal data
            (e.g., names, phone numbers) without their consent. You are
            responsible for maintaining control of your device/browser. If others
            use your browser/device, we may attribute their actions to you until
            cookies are cleared.
          </P>
        </Section>

        <Section title="4. User Submissions and License">
          <P>
            You retain ownership of the content you submit. You grant us a
            worldwide, non-exclusive, royalty-free license to host, store,
            reproduce, publicly display, translate, analyze, and create
            derivative works (such as summaries, aggregations, and excerpts) from
            your submissions, including through the service providers and
            partners described in Section 6.3, for the purposes of operating the
            Program, moderation and security, research and analysis, public
            reporting, and promoting the Program and civic engagement. This
            license continues for as long as we retain your submissions. If you
            request deletion of your submissions (see Section 6.6), we will stop
            making new uses of them and will delete or de-identify them in our
            active systems; materials already published or distributed (such as
            reports, academic papers, and public datasets) and aggregated or
            de-identified materials are not affected and may continue to be used.
            You retain any moral rights you may have.
          </P>
        </Section>

        <Section title="5. Disclaimer of Affiliation">
          <P>
            This Program is facilitated by Change.org and Public AI. The Program
            may not necessarily be endorsed by or affiliated with any city,
            state, or federal government or government body. References to a
            city, state, or country name indicate geographic focus, not
            necessarily an official partnership.
          </P>
        </Section>

        <Section title="6. Privacy Notice">
          <SubHeading>6.1 Information Collected</SubHeading>
          <P>
            <strong>Participation Data.</strong> When you participate in the
            Program, we collect your general location (canton) and the timestamps
            and the content of your submissions. You may also optionally provide
            contact (e.g. email address) and demographic (e.g. age) information.
          </P>
          <P>
            <strong>Browser Identifier.</strong> To recognize your participation
            and prevent duplicate submissions, we store a browser-specific
            identifier in cookies/local storage. It is not portable across
            browsers/devices. We do not use this identifier for advertising or
            cross-site tracking.
          </P>
          <P>
            <strong>Website Analytics.</strong> We collect usage analytics (e.g.
            page views, time of access, referral links) and technical
            identifiers (e.g. IP address, browser/device information,
            cookie/local storage identifiers) to ensure service stability and
            understand usage patterns.
          </P>
          <P>
            <strong>Session replay via Amplitude.</strong> We may capture session
            replays to understand usability and fix bugs. We mask/redact input
            fields likely to contain personal data to the extent technically
            feasible.
          </P>
          <P>
            <strong>Session replay and error monitoring via Sentry.</strong> We
            use Sentry to monitor errors and capture session replays to fix bugs.
            We mask fields likely to contain personal data to the extent
            technically feasible.
          </P>
          <P>
            <strong>AI processing of submissions.</strong> We use third-party AI
            providers to screen submissions for prohibited content and to analyze
            submissions for research and reporting (AWS Bedrock). The optional AI
            interviewer described below runs on Apertus, hosted through CSCS,
            Infomaniak, and the Public AI Inference Utility. These providers
            process this data on our behalf under contracts limiting their use of
            it.
          </P>
          <P>
            <strong>Meta Pixel.</strong> Change.org may use Meta Pixel for
            measurement, such as to understand traffic sources and campaign
            performance. Meta may receive device and browsing data from our site.
          </P>
          <P>
            <strong>Optional Event Survey Data (Contact and Demographics).</strong>{" "}
            If you complete our optional surveys to express interest in
            participating in events, we collect your contact information (e.g.
            email address) and demographics (e.g., age range, canton). You may
            choose not to answer. We do not sell or “share” this information for
            cross-context behavioral advertising and do not link it to your
            public submissions.
          </P>
          <P>
            <strong>Optional AI Interview Data.</strong> The Program includes an
            optional AI interviewer that asks about your views and experience. If
            you respond, we collect your responses for research and analysis. You
            may choose not to answer. We do not sell or “share” this information
            for cross-context behavioral advertising. The AI interviewer helps
            you develop and refine your thoughts as part of the Program. Because
            this is integrated as a part of your participation, your responses
            are linked to any other information you provide, including general
            location (canton).
          </P>

          <SubHeading>6.2 How We Use Your Information</SubHeading>
          <P>We use the information described above to:</P>
          <List>
            <li>Facilitate the civic discussion and submissions;</li>
            <li>Screen submissions for prohibited content before they are stored;</li>
            <li>
              Analyze and summarize responses for research, reporting, and
              presentation to the general public and municipal stakeholders,
              including by using third-party AI services;
            </li>
            <li>
              Share data with academic, research, and civic partners – including
              partners who participate in or contribute to the Program in the
              future – so they may conduct noncommercial research and analysis
              related to the Program and the civic questions they address, and
              publish the results;
            </li>
            <li>
              Send you transactional messages necessary to operate the Program;
            </li>
            <li>Maintain security and detect misuse or technical issues;</li>
            <li>
              Understand usage patterns of the program to improve reliability and
              user experience;
            </li>
            <li>
              Promote civic engagement and the Program, including through
              marketing materials that may feature your submissions; and
            </li>
            <li>Comply with legal obligations.</li>
          </List>

          <SubHeading>6.3 When We Share Information</SubHeading>
          <P>
            We may share the information we collect for purposes described in
            this Notice and as outlined below:
          </P>
          <P>
            <strong>Service providers/processors:</strong> We use vendors under
            contracts limiting their use of data to help us operate the Program.
            Such vendors include:
          </P>
          <List>
            <li>Amazon Web Services (AWS): database storage and backups</li>
            <li>Amplitude: website analytics and session replay</li>
            <li>CSCS: inference provider for Apertus Model</li>
            <li>Infomaniak: inference provider for Apertus Model</li>
            <li>
              Public AI Inference Utility: inference provider for Apertus Model
            </li>
            <li>Sentry: error monitoring and session replay</li>
          </List>
          <P>
            <strong>Advertising/measurement partners:</strong> We use advertising
            and measurement trackers to measure and optimize advertising. You can
            opt out at <ManageCookies />.
          </P>
          <List>
            <li>
              Meta (Pixel): Meta may receive data as an independent
              controller/third party; see{" "}
              <a
                href="https://www.facebook.com/privacy/policy/"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                Meta’s privacy policy
              </a>{" "}
              for its practices and choices.
            </li>
          </List>
          <P>
            <strong>Public/municipal reporting:</strong> We may publish aggregated
            or anonymized insights, and may quote or reproduce individual
            submissions as illustrative examples in research reports, articles,
            and public-facing materials. We will not disclose your email
            publicly, nor share your demographic responses in identifiable form
            without your consent or as required by law. Published examples may
            include limited non-identifying context such as a general region or
            state. Before publication, we review selected examples and remove or
            redact details that could reasonably identify you.
          </P>
          <P>
            <strong>Legal/security obligations:</strong> We may disclose
            information to comply with law, protect rights and safety, and
            maintain the integrity of the Program.
          </P>
          <P>
            <strong>Research partners:</strong> We may make deliberation data
            available to academic, research, and civic partners, including
            current and future Program partners, for noncommercial research,
            analysis, and publication, including in academic papers and public
            research reports. Research partners receive data under written
            agreements that limit use to the approved research project, prohibit
            further disclosure of the data, require appropriate security
            safeguards, and permit publication only of aggregate or de-identified
            findings.
          </P>

          <SubHeading>6.4 Cookies and Similar Technologies</SubHeading>
          <P>
            We use cookies and similar technologies to run the site and
            understand how it’s used:
          </P>
          <List>
            <li>
              <strong>Essential.</strong> We use strictly necessary cookies/local
              storage to operate core features (e.g. recognizing the same
              browser, security).
            </li>
            <li>
              <strong>Analytics.</strong> We use analytics trackers (e.g.
              Amplitude) to help us measure usage and fix bugs.
            </li>
            <li>
              <strong>Marketing.</strong> We use marketing trackers (e.g. Meta
              Pixel) for advertising measurement and to optimize advertising.
            </li>
          </List>
          <P>
            You can manage your cookie preferences at <ManageCookies />.
          </P>

          <SubHeading>6.5 Data Retention</SubHeading>
          <P>
            We retain submissions and associated data for as long as necessary to
            complete the Program, produce reports, and comply with legal
            obligations. We may store anonymized summaries indefinitely for
            research and archival purposes.
          </P>

          <SubHeading>6.6 Your Rights</SubHeading>
          <P>
            Depending on where you live, you may have rights to request access
            to, correct, or delete personal data we hold about you; opt out of
            the sale or sharing of your personal information; limit the use and
            disclosure of sensitive personal information; or withdraw consent.
          </P>
          <P>
            To exercise these rights, contact us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
                "Swiss National AI Dialogue – Data Request",
              )}`}
              className={linkClass}
            >
              {CONTACT_EMAIL}
            </a>{" "}
            with the subject line &quot;Swiss National AI Dialogue – Data
            Request.&quot;
          </P>
          <P>
            We will respond as permitted or required by applicable law. Data
            rights requests will be handled to the extent technically feasible.
            Deletion requests will not require removal of submissions from
            aggregated, anonymized, or published materials, consistent with the
            license granted in Section 4.
          </P>

          <SubHeading>6.7 International Users and Transfers</SubHeading>
          <P>
            Your data may be processed in countries other than your own,
            including the United States. This includes processing by our
            third-party service providers, including those listed in Section 6.3.
            Our database storage and backups (AWS) are hosted in Switzerland. By
            participating, you consent to the transfer of your information to the
            United States and other jurisdictions that may have different data
            protection laws.
          </P>
          <P>
            Change.org and Public AI are joint controllers of the personal data
            described in this Notice. Change.org is the point of contact for
            exercising your rights under Section 6.6; the parties have agreed on
            the allocation of data protection responsibilities between them,
            including in respect of security, retention, and responding to your
            requests.
          </P>
          <P>
            If you are in the EEA/UK, our lawful basis is legitimate interests to
            run the Program. Where required (e.g. analytics/replay, pixels,
            optional demographics) we rely on your consent.
          </P>
        </Section>

        <Section title="7. Disclaimers and Limitation of Liability">
          <P>
            <strong>No Official Decisions:</strong> The Program is an
            experimental civic engagement exercise. Participation does not
            guarantee any specific governmental action.
          </P>
          <P>
            <strong>No Warranty:</strong> We provide the Program &quot;as
            is&quot; without warranties of any kind. We are not liable for any
            indirect or consequential damages arising out of your use of the
            Program.
          </P>
        </Section>

        <Section title="8. Changes to These Terms">
          <P>
            We may modify these terms and privacy notice for this Program from
            time to time. If we make material changes, we will update the date at
            the top of this document and, if feasible, provide additional notice.
            Continued participation constitutes your acceptance of the revised
            terms.
          </P>
        </Section>

        <Section title="9. Contact Information">
          <P>
            For questions about these Terms, this Privacy Notice, or your data,
            contact:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
              {CONTACT_EMAIL}
            </a>{" "}
            or write to: Change.org, 548 Market Street, #29993, San Francisco, CA
            94104-5401, USA.
          </P>
        </Section>
      </div>

      <footer className="border-border mt-12 border-t pt-6">
        <Link href="/swiss-national-ai-dialogue" className={linkClass}>
          Return to the Swiss National AI Dialogue
        </Link>
      </footer>
    </main>
  );
}
