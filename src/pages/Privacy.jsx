import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";

const LINK_CLS = "text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:opacity-80";
const PLACEHOLDER_CLS = "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 px-1 rounded font-mono text-sm";

export default function Privacy() {
  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <main id="main-content" className="flex-1 max-w-3xl mx-auto w-full px-6 py-14">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 dark:text-gray-400 mb-1">NJIT Campus Wellness Center Platform</p>
        <p className="text-sm text-slate-500 dark:text-gray-400 mb-10">
          Last updated: <span className={PLACEHOLDER_CLS}>[date]</span>
        </p>

        <Section title="What this policy covers">
          <p>
            This page explains what information the Campus Wellness Center platform collects, why, and how it's handled.
            This platform is operated for NJIT students and staff by the Campus Wellness Center.
          </p>
        </Section>

        <Section title="Information we collect">
          <ul className="list-disc pl-6 space-y-2">
            <li><strong className="text-slate-800 dark:text-gray-200">Account information:</strong> your name, NJIT email address, and a securely hashed password (we never store your password in plain text).</li>
            <li><strong className="text-slate-800 dark:text-gray-200">Profile information (optional):</strong> campus, major/college, graduation year, bio, gender, pronouns, preferred name, and profile photo. All of these are optional — you choose what to share.</li>
            <li><strong className="text-slate-800 dark:text-gray-200">Activity data:</strong> which wellness modules you've viewed or completed, quiz responses, points earned, redemption history, and login streaks.</li>
            <li><strong className="text-slate-800 dark:text-gray-200">Communications:</strong> if you contact us or leave comments/discussion posts within the platform.</li>
          </ul>
        </Section>

        <Section title="How we use this information">
          <ul className="list-disc pl-6 space-y-2">
            <li>To operate your account and track your progress through wellness modules.</li>
            <li>To award points, manage rewards, and run the leaderboard and streak features.</li>
            <li>To send you account-related emails (verification codes, password resets) and, if you opt in, occasional platform notifications.</li>
            <li>To help the Campus Wellness Center understand how our programs are used, so we can improve them.</li>
          </ul>
        </Section>

        <Section title="Who can see your information">
          <ul className="list-disc pl-6 space-y-2">
            <li>Platform administrators (Campus Wellness Center staff) can view your account and activity data to manage the platform and support users.</li>
            <li>Your name and points may be visible to other users on the public leaderboard, unless you choose not to participate.</li>
            <li>We do not sell or share your personal information with third parties for advertising or marketing purposes.</li>
          </ul>
        </Section>

        <Section title="Service providers we use">
          <p className="mb-3">
            To operate the platform, we use the following third-party services, which process data on our behalf:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong className="text-slate-800 dark:text-gray-200">Resend</strong> — to deliver account emails (verification codes, notifications).</li>
            <li><strong className="text-slate-800 dark:text-gray-200">Amazon Web Services (S3)</strong> — to store uploaded files such as profile photos and module content.</li>
            <li><strong className="text-slate-800 dark:text-gray-200">Railway</strong> — to host the application and database.</li>
          </ul>
          <p className="mt-3">These providers only process data as needed to provide their service and do not use it for their own purposes.</p>
        </Section>

        <Section title="Data retention">
          <p>
            We retain your account and activity data for as long as your account is active. If you'd like your account or data deleted,
            contact us using the information below.
          </p>
        </Section>

        <Section title="Your choices">
          <ul className="list-disc pl-6 space-y-2">
            <li>Most profile fields are optional and can be left blank or updated at any time from your Profile page.</li>
            <li>You can request a copy of your data, ask us to correct it, or request deletion at any time.</li>
          </ul>
        </Section>

        <Section title="Security">
          <p>
            We take reasonable technical measures to protect your data, including encrypted password storage and secure hosting.
            No system is 100% secure, but we work to keep your information safe.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this policy as the platform evolves. We'll update the "last updated" date above when we do.
          </p>
        </Section>

        <Section title="Contact us" last>
          <p>
            Questions about this policy or your data? Contact the Campus Wellness Center at{" "}
            <span className={PLACEHOLDER_CLS}>[contact email]</span>.
          </p>
        </Section>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children, last }) {
  return (
    <section className={`mb-${last ? "0" : "10"}`}>
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">{title}</h2>
      <div className="text-slate-600 dark:text-gray-400 leading-relaxed space-y-2">
        {children}
      </div>
      {!last && <hr className="mt-8 border-slate-200 dark:border-gray-800" />}
    </section>
  );
}
