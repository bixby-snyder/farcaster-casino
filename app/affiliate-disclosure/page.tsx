import Link from "next/link";
import { OVERTIME_REFERRAL_URL } from "@/lib/overtime/config";

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

        <p className="mt-4 text-sm leading-6 text-zinc-400">
          The Overtime outbound URL uses referrerId=casino for referral link
          tracking. Onchain casino attribution is separate and must use the
          configured affiliate wallet as the _referrer address in verified
          contract calls.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-black"
        >
          Back to Casino
        </Link>

        <a
          href={OVERTIME_REFERRAL_URL}
          target="_blank"
          rel="noreferrer"
          className="ml-3 mt-6 inline-flex rounded-xl border border-cyan-300/40 px-4 py-3 text-sm font-black text-cyan-100"
        >
          Open Overtime Markets
        </a>
      </section>
    </main>
  );
}
