"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { useAccount, useReadContract } from "wagmi";
import { isAddress, parseUnits } from "viem";
import {
  AFFILIATE_REFERRER_ADDRESS,
  CollateralSymbol,
  OVERTIME_BLACKJACK_ADDRESS,
  SUPPORTED_COLLATERALS,
  hasVerifiedOvertimeConfig,
} from "@/lib/overtime/config";
import { erc20Abi } from "@/lib/overtime/abi";

const chips = [3, 10, 25, 50, 100];
const rewardsStorageKey = "farcaster-casino-access-rewards";

type Card = { value: string; suit: string; red?: boolean };
type TableState = "idle" | "dealing" | "playerTurn" | "resolved";
type HandResult = "blackjack" | "win" | "lose" | "push" | null;
type MusicTrack = "off" | "vegas-lounge" | "noir-jazz" | "high-roller";
type AffiliateBetState =
  | "connect"
  | "select-collateral"
  | "enter-wager"
  | "approve"
  | "ready"
  | "pending-vrf"
  | "resolved"
  | "recover";

const deckValues = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const suits = [
  { suit: "♠", red: false },
  { suit: "♥", red: true },
  { suit: "♦", red: true },
  { suit: "♣", red: false },
];

const casinoAccessTiers = [
  { name: "House Card", checkIns: 0, accent: "from-zinc-700 via-zinc-900 to-black" },
  { name: "Ruby Card", checkIns: 30, accent: "from-red-500 via-rose-800 to-black" },
  { name: "Sapphire Card", checkIns: 45, accent: "from-blue-400 via-blue-800 to-black" },
  { name: "Emerald Card", checkIns: 60, accent: "from-emerald-300 via-emerald-800 to-black" },
  { name: "Diamond Card", checkIns: 90, accent: "from-cyan-200 via-slate-700 to-black" },
  { name: "Black Diamond Card", checkIns: 120, accent: "from-zinc-100 via-cyan-950 to-black" },
];

type CasinoAccessTier = (typeof casinoAccessTiers)[number];

type CasinoAccessRewards = {
  checkIns: number;
  lastCheckInDate: string | null;
};

function getTodayKey() {
  return new Date().toLocaleDateString("en-CA");
}

function getCurrentTier(checkIns: number) {
  return casinoAccessTiers
    .filter((tier) => checkIns >= tier.checkIns)
    .at(-1) ?? casinoAccessTiers[0];
}

function getNextTier(checkIns: number) {
  return casinoAccessTiers.find((tier) => checkIns < tier.checkIns) ?? null;
}

function getStoredRewards(): CasinoAccessRewards {
  if (typeof window === "undefined") {
    return { checkIns: 15, lastCheckInDate: null };
  }

  try {
    const storedRewards = window.localStorage.getItem(rewardsStorageKey);
    if (!storedRewards) return { checkIns: 15, lastCheckInDate: null };

    const parsedRewards = JSON.parse(storedRewards) as Partial<CasinoAccessRewards>;

    return {
      checkIns:
        typeof parsedRewards.checkIns === "number"
          ? Math.max(0, parsedRewards.checkIns)
          : 15,
      lastCheckInDate:
        typeof parsedRewards.lastCheckInDate === "string"
          ? parsedRewards.lastCheckInDate
          : null,
    };
  } catch {
    return { checkIns: 15, lastCheckInDate: null };
  }
}

function drawCard(): Card {
  const value = deckValues[Math.floor(Math.random() * deckValues.length)];
  const suit = suits[Math.floor(Math.random() * suits.length)];
  return { value, suit: suit.suit, red: suit.red };
}

function cardPoints(value: string) {
  if (["J", "Q", "K"].includes(value)) return 10;
  if (value === "A") return 11;
  return Number(value);
}

function handValue(cards: Card[]) {
  let total = cards.reduce((sum, card) => sum + cardPoints(card.value), 0);
  let aces = cards.filter((card) => card.value === "A").length;

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

function playSound(src: string, soundOn: boolean, volume = 0.45) {
  if (!soundOn || typeof window === "undefined") return;

  const audio = new Audio(src);
  audio.volume = volume;
  audio.play().catch(() => {});
}

function getAffiliateBetState({
  bet,
  isConnected,
  needsApproval,
  validCollateralAddress,
  wagerAmount,
}: {
  bet: number;
  isConnected: boolean;
  needsApproval: boolean;
  validCollateralAddress: boolean;
  wagerAmount: bigint;
}): AffiliateBetState {
  if (!isConnected) return "connect";
  if (!validCollateralAddress) return "select-collateral";
  if (bet < 3 || wagerAmount <= BigInt(0)) return "enter-wager";
  if (needsApproval) return "approve";
  return "ready";
}

function getPlayerStatus({
  affiliateBetState,
  tableState,
  gameStatus,
  isConnected,
}: {
  affiliateBetState: AffiliateBetState;
  tableState: TableState;
  gameStatus: string;
  isConnected: boolean;
}) {
  if (!isConnected) return "Connect wallet to save your seat.";
  if (tableState === "dealing") return gameStatus;
  if (tableState === "playerTurn") return "Your move.";
  if (tableState === "resolved") return gameStatus;
  if (affiliateBetState === "pending-vrf") return "Waiting for shuffle.";
  return "Staging table: live hands open after final house verification.";
}

export default function Home() {
  const ambienceRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const soundOnRef = useRef(false);
  const hapticLockedRef = useRef(false);
  const dealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dealerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [enteredCasino, setEnteredCasino] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack>("vegas-lounge");

  const [bet, setBet] = useState(25);
  const [customBet, setCustomBet] = useState("25");
  const [asset, setAsset] = useState<CollateralSymbol>("USDC");
  const [manualAffiliateBetState, setManualAffiliateBetState] =
    useState<AffiliateBetState | null>(null);
  const [shareStatus, setShareStatus] = useState("Share-to-cast is ready when opened inside Farcaster.");

  const [playerCards, setPlayerCards] = useState<Card[]>([
    { value: "A", suit: "♠" },
    { value: "K", suit: "♥", red: true },
  ]);

  const [dealerCards, setDealerCards] = useState<Card[]>([
    { value: "9", suit: "♦", red: true },
    { value: "6", suit: "♣" },
  ]);

  const [hideDealerCard, setHideDealerCard] = useState(true);
  const [gameStatus, setGameStatus] = useState("Choose your wager. Practice mode is open.");
  const [tableState, setTableState] = useState<TableState>("idle");
  const [handResult, setHandResult] = useState<HandResult>(null);
  const [rewards, setRewards] = useState<CasinoAccessRewards>(getStoredRewards);
  const [todayKey, setTodayKey] = useState<string | null>(() =>
    typeof window === "undefined" ? null : getTodayKey()
  );

  const { address, isConnected } = useAccount();
  const selectedCollateral =
    SUPPORTED_COLLATERALS.find((collateral) => collateral.symbol === asset) ??
    SUPPORTED_COLLATERALS[0];
  const wagerAmount =
    Number.isFinite(Number(customBet)) && Number(customBet) > 0
      ? parseUnits(customBet, selectedCollateral.decimals)
      : BigInt(0);
  const validCollateralAddress = isAddress(selectedCollateral.address);
  const validBlackjackAddress = isAddress(OVERTIME_BLACKJACK_ADDRESS);
  const validAffiliateAddress = isAddress(AFFILIATE_REFERRER_ADDRESS);
  const configReady = hasVerifiedOvertimeConfig() && validCollateralAddress;
  void validAffiliateAddress;

  const { data: allowance = BigInt(0) } = useReadContract({
    abi: erc20Abi,
    address: validCollateralAddress
      ? (selectedCollateral.address as `0x${string}`)
      : undefined,
    functionName: "allowance",
    args:
      address && validBlackjackAddress
        ? [address, OVERTIME_BLACKJACK_ADDRESS as `0x${string}`]
        : undefined,
    query: {
      enabled:
        Boolean(address) &&
        validCollateralAddress &&
        validBlackjackAddress,
    },
  });

  const needsApproval =
    configReady && wagerAmount > BigInt(0) && allowance < wagerAmount;
  const derivedAffiliateBetState = getAffiliateBetState({
    bet,
    isConnected,
    needsApproval,
    validCollateralAddress,
    wagerAmount,
  });
  const affiliateBetState =
    derivedAffiliateBetState === "ready" && manualAffiliateBetState
      ? manualAffiliateBetState
      : derivedAffiliateBetState;
  const shareLabel =
    tableState === "resolved" && (handResult === "blackjack" || handResult === "win")
      ? "Share Win"
      : "Share Hand";
  const playerStatus = getPlayerStatus({
    affiliateBetState,
    tableState,
    gameStatus,
    isConnected,
  });

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    const ambience = ambienceRef.current;
    const music = musicRef.current;

    if (ambience) ambience.volume = 0.22;
    if (music) music.volume = 0.14;

    if (!audioUnlocked || !soundOn) {
      ambience?.pause();
      music?.pause();
      return;
    }

    ambience?.play().catch(() => {});

    if (selectedMusic === "off") {
      music?.pause();
      return;
    }

    music?.play().catch(() => {});
  }, [audioUnlocked, soundOn, selectedMusic]);

  useEffect(() => {
    return () => {
      if (dealTimerRef.current) clearTimeout(dealTimerRef.current);
      if (dealerTimerRef.current) clearTimeout(dealerTimerRef.current);
    };
  }, []);

  const playerTotal = handValue(playerCards);
  const dealerTotal = handValue(dealerCards);
  const currentTier = getCurrentTier(rewards.checkIns);
  const nextTier = getNextTier(rewards.checkIns);
  const previousTierCheckIns = currentTier.checkIns;
  const nextTierCheckIns = nextTier?.checkIns ?? currentTier.checkIns;
  const tierSpan = Math.max(nextTierCheckIns - previousTierCheckIns, 1);
  const tierProgress = nextTier
    ? Math.min(
        ((rewards.checkIns - previousTierCheckIns) / tierSpan) * 100,
        100
      )
    : 100;
  const checkInsRemaining = nextTier
    ? Math.max(nextTier.checkIns - rewards.checkIns, 0)
    : 0;
  const checkedInToday =
    Boolean(todayKey) && rewards.lastCheckInDate === todayKey;

  useEffect(() => {
    window.localStorage.setItem(rewardsStorageKey, JSON.stringify(rewards));
  }, [rewards]);

  function playCasinoSound(src: string, volume = 0.45) {
    playSound(src, soundOnRef.current, volume);
  }

  function triggerHaptic(pattern: number | number[], minimumGapMs = 90) {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    if (hapticLockedRef.current) return;

    hapticLockedRef.current = true;
    navigator.vibrate(pattern);
    window.setTimeout(() => {
      hapticLockedRef.current = false;
    }, minimumGapMs);
  }

  function enterWithSound() {
    setAudioUnlocked(true);
    setSoundOn(true);
    setEnteredCasino(true);
  }

  function enterMuted() {
    setSoundOn(false);
    setEnteredCasino(true);
  }

  function toggleSound() {
    setAudioUnlocked(true);
    setSoundOn((current) => !current);
  }

  function clearTableTimers() {
    if (dealTimerRef.current) clearTimeout(dealTimerRef.current);
    if (dealerTimerRef.current) clearTimeout(dealerTimerRef.current);
    dealTimerRef.current = null;
    dealerTimerRef.current = null;
  }

  function resolveDealerHand(finalPlayerCards: Card[], visibleDealerCards: Card[]) {
    const finalDealerCards = [...visibleDealerCards];
    let total = handValue(finalDealerCards);
    const finalPlayerTotal = handValue(finalPlayerCards);

    while (total < 17) {
      finalDealerCards.push(drawCard());
      total = handValue(finalDealerCards);
    }

    setDealerCards(finalDealerCards);
    setHideDealerCard(false);
    setTableState("resolved");
    setManualAffiliateBetState("resolved");

    if (total > 21 || finalPlayerTotal > total) {
      playCasinoSound("/sounds/win.mp3", 0.55);
      triggerHaptic([12, 35, 18], 450);
      setHandResult("win");
      setGameStatus("You beat The House.");
    } else if (finalPlayerTotal < total) {
      playCasinoSound("/sounds/lose.mp3", 0.5);
      setHandResult("lose");
      setGameStatus("Dealer wins.");
    } else {
      setHandResult("push");
      setGameStatus("Push.");
    }
  }

  function queueDealerReveal(finalPlayerCards: Card[], visibleDealerCards: Card[]) {
    clearTableTimers();
    setManualAffiliateBetState(null);
    setGameStatus("Dealer reveals...");
    setTableState("dealing");
    setHideDealerCard(false);
    playCasinoSound("/sounds/card-deal.mp3", 0.35);

    dealerTimerRef.current = setTimeout(() => {
      resolveDealerHand(finalPlayerCards, visibleDealerCards);
      dealerTimerRef.current = null;
    }, 700);
  }

  function startHand() {
    if (bet < 3 || tableState === "dealing" || tableState === "playerTurn") return;

    clearTableTimers();
    triggerHaptic(12);
    playCasinoSound("/sounds/card-deal.mp3", 0.45);
    setPlayerCards([]);
    setDealerCards([]);
    setHandResult(null);
    setHideDealerCard(true);
    setGameStatus("Shuffling cards...");
    setTableState("dealing");

    dealTimerRef.current = setTimeout(() => {
      const nextPlayerCards = [drawCard(), drawCard()];
      const nextDealerCards = [drawCard(), drawCard()];

      setPlayerCards(nextPlayerCards);
      setDealerCards(nextDealerCards);

      if (handValue(nextPlayerCards) === 21) {
        setHideDealerCard(false);
        setTableState("resolved");
        setManualAffiliateBetState("resolved");
        setHandResult("blackjack");
        setGameStatus("Blackjack!");
        playCasinoSound("/sounds/win.mp3", 0.55);
        triggerHaptic([12, 35, 18], 450);
      } else {
        setHideDealerCard(true);
        setTableState("playerTurn");
        setGameStatus("Your move.");
      }

      dealTimerRef.current = null;
    }, 650);
  }

  function hit() {
    if (tableState !== "playerTurn") return;

    playCasinoSound("/sounds/card-deal.mp3", 0.45);
    triggerHaptic(10);

    const nextCards = [...playerCards, drawCard()];
    const nextTotal = handValue(nextCards);

    setPlayerCards(nextCards);

    if (nextTotal > 21) {
      playCasinoSound("/sounds/lose.mp3", 0.5);
      setHandResult("lose");
      setGameStatus("Dealer wins.");
      setHideDealerCard(false);
      setTableState("resolved");
      setManualAffiliateBetState("resolved");
    } else {
      setGameStatus("Your move.");
    }
  }

  function stand() {
    if (tableState !== "playerTurn") return;

    queueDealerReveal(playerCards, dealerCards);
  }

  function doubleDown() {
    if (tableState !== "playerTurn") return;

    playCasinoSound("/sounds/card-deal.mp3", 0.45);

    const nextCards = [...playerCards, drawCard()];
    setPlayerCards(nextCards);

    if (handValue(nextCards) > 21) {
      setHideDealerCard(false);
      setTableState("resolved");
      setManualAffiliateBetState("resolved");
      setHandResult("lose");
      setGameStatus("Dealer wins.");
      playCasinoSound("/sounds/lose.mp3", 0.5);
      return;
    }

    queueDealerReveal(nextCards, dealerCards);
  }

  function dailyCheckIn() {
    const checkInDate = getTodayKey();
    if (rewards.lastCheckInDate === checkInDate) return;

    playCasinoSound("/sounds/xp.mp3", 0.45);
    triggerHaptic([10, 30, 10], 350);
    setTodayKey(checkInDate);
    setRewards((current) => ({
      checkIns: current.checkIns + 1,
      lastCheckInDate: checkInDate,
    }));
  }

  function handleDealHand() {
    startHand();
  }

  function showSplitPlaceholder() {
    setManualAffiliateBetState("recover");
    setGameStatus("Split is coming soon at this table.");
  }

  async function shareToCastPlaceholder() {
    try {
      const { sdk } = await import("@farcaster/miniapp-sdk");
      const isMiniApp = await sdk.isInMiniApp();

      if (!isMiniApp) {
        setShareStatus("Open this staging app inside Farcaster to compose a cast.");
        return;
      }

      const result = await sdk.actions.composeCast({
        text:
          shareLabel === "Share Win"
            ? "I just beat the house in Farcaster Casino."
            : "Playing a hand in Farcaster Casino.",
        embeds: [window.location.href],
      });

      setShareStatus(
        result?.cast
          ? "Cast composed."
          : "Cast composer closed without posting."
      );
    } catch {
      setShareStatus("Share-to-cast placeholder could not reach the Farcaster host.");
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#06030B] text-white">
      {!enteredCasino && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06030B] px-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,.22),transparent_30%),radial-gradient(circle_at_bottom,rgba(124,58,237,.34),transparent_35%)]" />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-md rounded-[2rem] border border-yellow-400/30 bg-black/70 p-6 text-center shadow-2xl shadow-yellow-900/30"
          >
            <div className="text-5xl">🎰</div>

            <div className="mt-4 text-xs font-black tracking-[0.35em] text-yellow-300">
              FARCASTER CASINO
            </div>

            <h1 className="mt-2 text-4xl font-black">Beat The House</h1>

            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Enter the table. Build your streak. Climb the leaderboard.
            </p>

            <button
              onClick={enterWithSound}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-yellow-300 via-yellow-500 to-orange-700 p-4 font-black text-black shadow-lg shadow-yellow-500/30"
            >
              Enter Casino
            </button>

            <button
              onClick={enterMuted}
              className="mt-3 text-xs font-bold text-zinc-400"
            >
              Enter without sound
            </button>
          </motion.div>
        </div>
      )}

      {audioUnlocked && (
        <>
          <audio ref={ambienceRef} loop preload="auto">
            <source src="/casino-ambience.mp3" type="audio/mpeg" />
          </audio>

          {selectedMusic !== "off" && (
            <audio ref={musicRef} loop preload="auto" key={selectedMusic}>
              <source src={`/music/${selectedMusic}.mp3`} type="audio/mpeg" />
            </audio>
          )}
        </>
      )}

      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,.18),transparent_28%),radial-gradient(circle_at_70%_10%,rgba(124,58,237,.32),transparent_30%),radial-gradient(circle_at_bottom,rgba(16,185,129,.18),transparent_32%)]" />

      <div className="relative mx-auto max-w-md px-4 py-5">
        <Header
          soundOn={soundOn}
          toggleSound={toggleSound}
          selectedMusic={selectedMusic}
          setSelectedMusic={setSelectedMusic}
        />

        <motion.section
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="rounded-[2rem] border border-yellow-400/30 bg-black/60 p-5 shadow-2xl shadow-purple-950/50"
        >
          <div className="text-center text-yellow-200 font-black tracking-[0.3em]">
            DEALER {hideDealerCard ? "" : `· ${dealerTotal}`}
          </div>

          <div className="my-6 flex justify-center gap-3">
            {dealerCards.length > 0 ? (
              dealerCards.map((card, index) =>
                index === 1 && hideDealerCard ? (
                  <CasinoCard key={index} back delay={0.25} />
                ) : (
                  <CasinoCard key={index} {...card} delay={0.1 + index * 0.15} />
                )
              )
            ) : (
              <div className="flex h-28 items-center rounded-2xl border border-yellow-400/20 bg-black/35 px-6 text-sm font-bold text-zinc-400">
                Dealer is shuffling
              </div>
            )}
          </div>

          <div className="rounded-full border border-yellow-400/30 bg-black/70 px-4 py-2 text-center text-sm font-bold text-yellow-100">
            {gameStatus}
          </div>

          <div className="mt-6 text-center text-cyan-200 font-black tracking-[0.3em]">
            YOU · {playerTotal}
          </div>

          <div className="my-6 flex flex-wrap justify-center gap-3">
            {playerCards.length > 0 ? (
              playerCards.map((card, index) => (
                <CasinoCard key={index} {...card} delay={0.35 + index * 0.12} />
              ))
            ) : (
              <div className="flex h-28 items-center rounded-2xl border border-yellow-400/20 bg-black/35 px-6 text-sm font-bold text-zinc-400">
                Waiting for the next hand
              </div>
            )}
          </div>

          <CasinoActionArea
            affiliateBetState={affiliateBetState}
            asset={asset}
            bet={bet}
            configReady={configReady}
            tableState={tableState}
            hit={hit}
            onDouble={doubleDown}
            onDealHand={handleDealHand}
            onShareToCast={shareToCastPlaceholder}
            onSplit={showSplitPlaceholder}
            shareLabel={shareLabel}
            shareStatus={shareStatus}
            stand={stand}
            statusLine={playerStatus}
          />
        </motion.section>

        <section className="mt-4 rounded-[2rem] bg-[#171122]/95 border border-yellow-400/20 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-yellow-200">
              <Image
                src="/chip.png"
                alt="Casino Chip"
                width={40}
                height={40}
                className="h-10 w-10 object-contain drop-shadow-[0_0_18px_rgba(250,204,21,0.55)]"
              />
              <span>Set The Stakes</span>
            </div>

            <div className="text-xs text-zinc-400">Minimum bet: $3</div>
          </div>

          <div className="mt-3 grid grid-cols-5 gap-2">
            {chips.map((chip) => (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                key={chip}
                onClick={() => {
                  playCasinoSound("/sounds/chip-click.mp3", 0.45);
                  triggerHaptic(8);
                  setBet(chip);
                  setCustomBet(String(chip));
                }}
                className={`rounded-xl p-3 font-black transition ${
                  bet === chip
                    ? "bg-gradient-to-br from-yellow-200 via-yellow-400 to-orange-600 text-black shadow-lg shadow-yellow-500/25"
                    : "bg-purple-900/70 text-white border border-purple-400/20"
                }`}
              >
                ${chip}
              </motion.button>
            ))}
          </div>

          <div className="mt-3">
            <label className="mb-2 block text-xs font-bold text-yellow-200">
              Custom Bet Amount
            </label>

            <input
              value={customBet}
              onChange={(e) => {
                setCustomBet(e.target.value);
                const value = Number(e.target.value);
                if (!Number.isNaN(value)) setBet(value);
              }}
              type="number"
              min="3"
              step="1"
              placeholder="Enter any amount over $3"
              className="w-full rounded-xl border border-yellow-400/40 bg-black/50 p-3 font-black text-white outline-none"
            />
          </div>

          <div className="mt-4 rounded-2xl border border-cyan-400/40 bg-black/40 p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-cyan-200">Collateral</span>
              <span className="font-black text-white">{asset}</span>
            </div>

            <select
              value={asset}
              onChange={(e) => setAsset(e.target.value as CollateralSymbol)}
              className="w-full rounded-xl bg-[#050713] border border-cyan-400/50 p-3 text-white"
            >
              {SUPPORTED_COLLATERALS.map((collateral) => (
                <option key={collateral.symbol}>{collateral.symbol}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="mt-4 rounded-[2rem] bg-[#171122]/95 border border-yellow-400/20 p-4">
          <div className="text-yellow-200 font-black mb-2">How To Play</div>

          <p className="text-sm leading-6 text-zinc-300">
            Get closer to 21 than the dealer without busting. Natural blackjack pays 3:2.
            Regular wins pay 1:1. Dealer hits soft 17. No insurance. No surrender.
            Live hands will use verifiable randomness.
          </p>
        </section>

        <section className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="XP" value="8,210" />
          <Stat label="Rank" value="#118" />
          <Stat label="Streak" value={`${rewards.checkIns}d`} />
        </section>

        <CasinoAccessRewards
          checkedInToday={checkedInToday}
          checkIns={rewards.checkIns}
          checkInsRemaining={checkInsRemaining}
          currentTier={currentTier}
          dailyCheckIn={dailyCheckIn}
          nextTier={nextTier}
          tierProgress={tierProgress}
        />

        <Leaderboard />

        <footer className="mb-8 rounded-[2rem] border border-yellow-400/20 bg-black/45 p-4 text-xs leading-5 text-zinc-300">
          Affiliate disclosure: This interface may receive referral
          compensation from qualifying casino activity. Referrals do
          not change odds, payout rules, or user fees. 18+ only. Follow your
          local laws.{" "}
          <Link href="/affiliate-disclosure" className="font-black text-yellow-200">
            Read more
          </Link>
        </footer>
      </div>
    </main>
  );
}

function Header({
  soundOn,
  toggleSound,
  selectedMusic,
  setSelectedMusic,
}: {
  soundOn: boolean;
  toggleSound: () => void;
  selectedMusic: MusicTrack;
  setSelectedMusic: (value: MusicTrack) => void;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="text-xs tracking-[0.34em] text-yellow-300 font-black">
          FARCASTER CASINO
        </div>

        <h1 className="text-3xl font-black tracking-tight">Beat The House</h1>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={toggleSound}
            className="min-w-20 rounded-xl border border-yellow-400/30 bg-black/50 px-3 py-2 text-xs font-black text-yellow-200"
          >
            {soundOn ? "🔊 On" : "🔇 Off"}
          </button>

          <select
            value={selectedMusic}
            onChange={(e) => setSelectedMusic(e.target.value as MusicTrack)}
            className="min-w-40 flex-1 rounded-xl border border-cyan-400/30 bg-[#050713] px-3 py-2 text-xs font-black text-cyan-200 outline-none"
          >
            <option value="off">Music Off</option>
            <option value="vegas-lounge">Vegas Lounge</option>
            <option value="noir-jazz">Noir Jazz</option>
            <option value="high-roller">High Roller</option>
          </select>
        </div>
      </div>

      <div className="flex justify-start sm:justify-end">
        <CasinoAccessCard />
      </div>
    </div>
  );
}

function CasinoAccessCard() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            <button
              onClick={connected ? openAccountModal : openConnectModal}
              className="group relative h-[98px] w-[218px] overflow-hidden rounded-2xl border border-cyan-300/50 bg-gradient-to-br from-zinc-950 via-slate-900 to-cyan-950 px-5 py-4 text-left shadow-[0_0_30px_rgba(34,211,238,0.22)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_45px_rgba(34,211,238,0.35)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,.22),transparent_18%),radial-gradient(circle_at_80%_85%,rgba(34,211,238,.25),transparent_35%)]" />

              <div className="absolute right-4 top-4 text-xl opacity-90">💎</div>

              <div className="absolute bottom-3 right-4 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/50">
                BLACK DIAMOND
              </div>

              <div className="relative flex h-full flex-col justify-between pr-9">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/70">
                  Casino Access
                </div>

                <div className="text-2xl font-black leading-none text-white">
                  {connected ? "VIP Active" : "Connect"}
                </div>

                <div className="max-w-[150px] truncate text-xs font-bold text-cyan-100/75">
                  {connected ? account.displayName : "Wallet required"}
                </div>
              </div>

              <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-cyan-200 via-yellow-300 to-cyan-400" />
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

function CasinoActionArea({
  affiliateBetState,
  asset,
  bet,
  configReady,
  tableState,
  hit,
  onDouble,
  onDealHand,
  onShareToCast,
  onSplit,
  shareLabel,
  shareStatus,
  stand,
  statusLine,
}: {
  affiliateBetState: AffiliateBetState;
  asset: CollateralSymbol;
  bet: number;
  configReady: boolean;
  tableState: TableState;
  hit: () => void;
  onDouble: () => void;
  onDealHand: () => void;
  onShareToCast: () => void;
  onSplit: () => void;
  shareLabel: string;
  shareStatus: string;
  stand: () => void;
  statusLine: string;
}) {
  const canDeal = bet >= 3 && tableState !== "dealing" && tableState !== "playerTurn";
  const showPlayerActions = tableState === "playerTurn";
  const isShuffling = tableState === "dealing";
  const statusTone: Record<AffiliateBetState, string> = {
    connect: "Connect wallet",
    "select-collateral": "Choose chips",
    "enter-wager": "Set wager",
    approve: "Chips pending",
    ready: "Table ready",
    "pending-vrf": "Shuffling",
    resolved: "Settled",
    recover: "Reviewing",
  };

  return (
    <div className="mt-4 rounded-2xl border border-yellow-400/25 bg-black/45 p-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-yellow-400/15 bg-yellow-400/10 px-3 py-2">
        <div className="text-xs font-black uppercase tracking-[0.22em] text-yellow-200">
          {statusTone[affiliateBetState]}
        </div>
        <div className="text-right text-xs font-bold text-zinc-300">
          {statusLine}
        </div>
      </div>

      {!configReady && (
        <div className="mt-3 rounded-xl border border-yellow-400/15 bg-black/35 p-3 text-xs font-bold leading-5 text-zinc-300">
          Practice table is open. Live hands unlock after final table verification.
        </div>
      )}

      {!showPlayerActions ? (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onDealHand}
          disabled={!canDeal}
          className="mt-3 w-full rounded-2xl bg-gradient-to-r from-yellow-300 via-yellow-500 to-orange-700 p-4 text-base font-black text-black shadow-lg shadow-yellow-500/20 disabled:opacity-40"
        >
          {isShuffling ? "🎲 Shuffling..." : `🎲 Deal Hand · $${bet} ${asset}`}
        </motion.button>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={hit}
            className="rounded-xl bg-emerald-400 p-3 font-black text-black"
          >
            🎴 Hit
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={stand}
            className="rounded-xl bg-red-500 p-3 font-black text-white"
          >
            🛑 Stand
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onDouble}
            className="rounded-xl border border-yellow-400/35 bg-yellow-400/15 p-3 font-black text-yellow-100"
          >
            💰 Double
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onSplit}
            className="rounded-xl border border-cyan-400/35 bg-cyan-400/15 p-3 font-black text-cyan-100"
          >
            ✂️ Split
          </motion.button>
        </div>
      )}

      <div className="mt-3 text-xs font-black">
        <button
          onClick={onShareToCast}
          className="w-full rounded-xl border border-purple-300/25 bg-purple-400/10 p-3 text-purple-100"
        >
          {shareLabel}
        </button>
      </div>

      {shareStatus && (
        <div className="mt-2 rounded-xl bg-black/30 p-2 text-center text-[11px] font-bold text-zinc-400">
          {shareStatus}
        </div>
      )}
    </div>
  );
}

function CasinoCard({
  value,
  suit,
  red = false,
  back = false,
  delay = 0,
}: {
  value?: string;
  suit?: string;
  red?: boolean;
  back?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -40, rotate: -8, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      whileHover={{ y: -6, rotate: -1 }}
      transition={{ duration: 0.45, delay }}
      className={`relative h-28 w-20 overflow-hidden rounded-2xl border shadow-2xl ${
        back
          ? "border-yellow-400/40 bg-gradient-to-br from-red-950 via-red-800 to-black p-3"
          : "border-yellow-400/40 bg-gradient-to-br from-white via-yellow-50 to-zinc-100 p-3 text-black"
      }`}
    >
      {back ? (
        <div className="h-full rounded-xl border border-yellow-400/30 bg-[radial-gradient(circle,rgba(250,204,21,.35),transparent_60%)]" />
      ) : (
        <>
          <div className={`absolute left-2 top-2 text-xl font-black ${red ? "text-red-600" : "text-black"}`}>
            {value}
          </div>

          <div className={`flex h-full items-center justify-center text-5xl ${red ? "text-red-600" : "text-black"}`}>
            {suit}
          </div>

          <div className={`absolute bottom-2 right-2 rotate-180 text-xl font-black ${red ? "text-red-600" : "text-black"}`}>
            {value}
          </div>
        </>
      )}
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-yellow-400/20 bg-black/40 p-3 text-center">
      <div className="text-xs uppercase tracking-[0.2em] text-yellow-300/80">
        {label}
      </div>
      <div className="mt-1 font-black">{value}</div>
    </div>
  );
}

function CasinoAccessRewards({
  checkedInToday,
  checkIns,
  checkInsRemaining,
  currentTier,
  dailyCheckIn,
  nextTier,
  tierProgress,
}: {
  checkedInToday: boolean;
  checkIns: number;
  checkInsRemaining: number;
  currentTier: CasinoAccessTier;
  dailyCheckIn: () => void;
  nextTier: CasinoAccessTier | null;
  tierProgress: number;
}) {
  const progressDots = Array.from({ length: 12 }, (_, index) => {
    const threshold = ((index + 1) / 12) * 100;
    return tierProgress >= threshold;
  });

  return (
    <section className="mt-4 rounded-[2rem] border border-yellow-400/20 bg-[#120d19] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-yellow-200 font-black">Casino Access Rewards</div>
          <div className="mt-1 text-xs font-bold text-zinc-400">
            {nextTier
              ? `${checkInsRemaining} check-ins to ${nextTier.name}`
              : "Top card tier unlocked"}
          </div>
        </div>

        <div className="rounded-full border border-yellow-400/25 bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-100">
          {checkIns} days
        </div>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br ${currentTier.accent} p-4 shadow-xl shadow-black/30`}
      >
        <div className="absolute right-4 top-4 text-3xl opacity-80">♦</div>
        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/60">
          Current Card
        </div>
        <div className="mt-2 text-2xl font-black text-white">
          {currentTier.name}
        </div>
        <div className="mt-6 flex items-end justify-between">
          <div className="text-xs font-bold text-white/70">
            Member streak
          </div>
          <div className="font-mono text-sm font-black text-white/80">
            {String(checkIns).padStart(4, "0")}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-zinc-300">Next card</span>
        <span className="font-black text-white">
          {nextTier ? nextTier.name : "Complete"}
        </span>
      </div>

      <div className="mt-2 h-3 rounded-full bg-zinc-800">
        <div
          style={{ width: `${tierProgress}%` }}
          className="h-3 rounded-full bg-gradient-to-r from-yellow-200 via-emerald-300 to-cyan-300"
        />
      </div>

      <div className="mt-3 grid grid-cols-12 gap-1">
        {progressDots.map((filled, index) => (
          <div
            key={index}
            className={`h-2 rounded-full ${
              filled ? "bg-yellow-300" : "bg-black/60"
            }`}
          />
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-100">
        {checkedInToday
          ? "Checked in today. Come back tomorrow for the next stamp."
          : "Check in once per day to stamp your casino access card."}
      </div>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={dailyCheckIn}
        disabled={checkedInToday}
        className="mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-300 to-green-700 p-3 font-black text-black disabled:opacity-45"
      >
        {checkedInToday ? "Checked in today" : "Daily Casino Check-In"}
      </motion.button>
    </section>
  );
}

function Leaderboard() {
  return (
    <section className="mt-4 mb-8 rounded-[2rem] bg-[#1a1028]/95 border border-yellow-400/20 p-4">
      <div className="text-yellow-200 font-black">
        Beat The House Leaderboard
      </div>

      <div className="mt-3 space-y-2">
        <LeaderboardRow name="🥇 VegasWhale" xp="182,440 XP" />
        <LeaderboardRow name="🥈 CardCounterX" xp="148,220 XP" />
        <LeaderboardRow name="🔥 You" xp="8,210 XP" />
      </div>
    </section>
  );
}

function LeaderboardRow({ name, xp }: { name: string; xp: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="flex items-center justify-between rounded-xl border border-yellow-400/15 bg-black/35 px-3 py-2"
    >
      <div className="font-bold">{name}</div>
      <div className="text-sm font-black text-yellow-200">{xp}</div>
    </motion.div>
  );
}
