import Link from "next/link";

export default function AffiliateDisclosurePage() {
  return (
    <main className="min-h-screen bg-[#06030B] px-4 py-8 text-white">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-yellow-400/30 bg-black/70 p-6 shadow-2xl shadow-purple-950/40">
        <div className="text-xs font-black uppercase tracking-[0.34em] text-yellow-300">
          Farcaster Casino
        </div>

        <h1 className="mt-3 text-3xl font-black">Affiliate Disclosure</h1>

        <p className="mt-4 text-sm leading-6 text-zinc-300">
          Affiliate disclosure: This interface may receive referral
          compensation from qualifying Overtime Casino activity. Referrals do
          not change odds, payout rules, or user fees. 18+ only. Follow your
          local laws.
        </p>

        <p className="mt-4 text-sm leading-6 text-zinc-400">
          The Overtime Casino contract addresses and Blackjack ABI must be
          verified before this interface can submit real-money bets. Placeholder
          configuration is used until those deployment details are supplied.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-black"
        >
          Back to Casino
        </Link>
      </section>
    </main>
  );
}

