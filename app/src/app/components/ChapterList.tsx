"use client";

import { useState } from "react";
import type { ChapterMeta, Progress } from "../types";

const CHAPTER_SUMMARIES: Record<string, string> = {
  "01_ch01_살아남은아이":
    "Dumbledore and McGonagall leave baby Harry at the Dursleys' doorstep after Voldemort's defeat.",
  "02_ch02_사라진유리창":
    "Harry lives miserably with the Dursleys. On a zoo trip, he accidentally makes glass vanish from a snake tank.",
  "03_ch03_발신자없는편지들":
    "Mysterious letters keep arriving for Harry. Uncle Vernon flees with the family to a hut on a rock in the sea.",
  "04_ch04_숲지기":
    "Hagrid bursts in and tells Harry he's a wizard. He gives Dudley a pig's tail.",
  "05_ch05a_다이애건앨리":
    "Hagrid takes Harry to Diagon Alley and Gringotts, where Harry discovers his parents' gold.",
  "06_ch05b_다이애건앨리2":
    "Harry buys school supplies. At Ollivander's he gets a wand — the twin core of Voldemort's.",
  "07_ch06a_정거장":
    "Harry can't find Platform 9¾. The Weasley family helps him through the barrier.",
  "08_ch06b_정거장2":
    "Harry and Ron bond on the train. They arrive at Hogwarts and cross the lake in boats.",
  "09_ch07-08_기숙사배정_마법약교수":
    "The Sorting Hat places Harry in Gryffindor. Snape's Potions class is hostile from day one.",
  "10_ch09_한밤의결투":
    "Malfoy tricks Harry into a midnight duel. They stumble upon a three-headed dog guarding a trapdoor.",
  "11_ch10_핼러윈":
    "A troll gets into the school. Harry and Ron rescue Hermione, and the three become friends.",
  "12_ch11_퀴디치":
    "Harry plays his first Quidditch match. His broom is jinxed, but he catches the Snitch.",
  "13_ch12_이레지드거울":
    "Harry receives an invisibility cloak and discovers the Mirror of Erised, which shows him his parents.",
  "14_ch13_니콜라플라멜":
    "The trio discovers Nicolas Flamel and the Philosopher's Stone — what the dog guards.",
};

const CHAPTER_DETAILS: Record<string, string[]> = {
  "01_ch01_살아남은아이": [
    "Mr. Dursley notices strange things all day — owls, people in cloaks, shooting stars — but tries to ignore them.",
    "That night, Dumbledore appears on Privet Drive and meets Professor McGonagall, who has been watching the house as a cat all day.",
    "They discuss the fall of Voldemort and the death of James and Lily Potter.",
    "Hagrid arrives on a flying motorcycle carrying baby Harry. Dumbledore leaves Harry on the Dursleys' doorstep with a letter explaining everything.",
    "Harry is left with only a lightning-bolt scar on his forehead — the mark of the curse that killed his parents but somehow couldn't kill him.",
  ],
  "02_ch02_사라진유리창": [
    "Ten years pass. Harry sleeps in the cupboard under the stairs and is treated like a servant by the Dursleys.",
    "Dudley is spoiled rotten — he counts his birthday presents and throws a tantrum when there aren't enough.",
    "On Dudley's birthday trip to the zoo, Harry has a conversation with a boa constrictor from Brazil.",
    "When Dudley shoves Harry aside to see the snake, the glass vanishes and the snake escapes — thanking Harry on the way out.",
    "Harry is punished and locked in his cupboard. Strange things have always happened around him, but he doesn't understand why.",
  ],
  "03_ch03_발신자없는편지들": [
    "A letter arrives addressed to 'Mr. H. Potter, The Cupboard Under the Stairs.' Vernon snatches it away before Harry can read it.",
    "More letters come — dozens, then hundreds. Vernon boards up the mail slot, nails the door shut, and moves Harry to Dudley's second bedroom.",
    "Letters start arriving stuffed inside eggs, hidden in the milk bottles, and shot down the chimney.",
    "Vernon snaps and packs the family into the car. They drive for hours and end up in a shack on a tiny island in the middle of a storm.",
    "As midnight strikes — Harry's 11th birthday — someone starts pounding on the door.",
  ],
  "04_ch04_숲지기": [
    "The door crashes open and Hagrid walks in — enormous, wild-haired, carrying a birthday cake he baked himself.",
    "Hagrid is stunned that Harry knows nothing about the wizarding world or how his parents really died.",
    "He tells Harry the truth: his parents were murdered by Voldemort, the most feared dark wizard in history — and Harry survived.",
    "Vernon tries to stop Harry from going to Hogwarts. Hagrid loses his temper and gives Dudley a pig's tail.",
    "Hagrid and Harry leave the island. Harry learns that Hagrid was expelled from Hogwarts and isn't supposed to do magic.",
  ],
  "05_ch05a_다이애건앨리": [
    "Hagrid takes Harry to London and taps a brick wall behind the Leaky Cauldron — it opens into Diagon Alley.",
    "Everyone in the Leaky Cauldron recognizes Harry and wants to shake his hand. He's already famous.",
    "At Gringotts bank, Harry discovers his parents left him a small fortune in gold Galleons.",
    "Hagrid secretly retrieves a small, grubby package from a high-security vault (713) on Dumbledore's orders.",
    "At Madam Malkin's robe shop, Harry meets a pale, arrogant boy — Draco Malfoy — for the first time.",
  ],
  "06_ch05b_다이애건앨리2": [
    "Harry buys his textbooks at Flourish & Blotts, a cauldron, telescope, and potions ingredients.",
    "Hagrid buys Harry a snowy owl (Hedwig) as a birthday present.",
    "At Ollivander's wand shop, Harry tries wand after wand until one chooses him: holly, 11 inches, phoenix feather core.",
    "Ollivander reveals that the phoenix whose feather is in Harry's wand gave only one other feather — the one in Voldemort's wand.",
    "Harry returns to the Dursleys for the rest of summer with his trunk, his owl, and a ticket for the Hogwarts Express on September 1st.",
  ],
  "07_ch06a_정거장": [
    "The Dursleys drop Harry at King's Cross and drive away laughing — there is no Platform 9¾.",
    "Harry overhears a red-haired woman mentioning 'Muggles' — it's Mrs. Weasley with her children.",
    "The Weasley twins show Harry how to run through the barrier between platforms 9 and 10.",
    "On the train, Harry shares a compartment with Ron Weasley. Ron comes from a big wizarding family but they don't have much money.",
    "Harry buys the entire sweet trolley and they share everything. Harry tries Chocolate Frogs and Bertie Bott's Every Flavour Beans for the first time.",
  ],
  "08_ch06b_정거장2": [
    "Ron tries to turn his rat Scabbers yellow with a spell — it doesn't work. Hermione Granger stops by, already in her robes, looking for Neville's toad.",
    "Malfoy shows up with Crabbe and Goyle, offering to help Harry pick the 'right sort' of friends. Harry refuses.",
    "Ron's rat Scabbers bites Goyle's finger and the three boys flee.",
    "The train arrives at Hogsmeade station. Hagrid leads the first-years across the lake in small boats.",
    "They get their first look at Hogwarts castle, lit up and towering over the dark water.",
  ],
  "09_ch07-08_기숙사배정_마법약교수": [
    "The first-years enter the Great Hall. Ghosts float overhead. The Sorting Hat sings its song explaining the four houses.",
    "Harry begs the hat 'Not Slytherin' — it considers, then shouts 'Gryffindor!' Ron joins him there.",
    "Dumbledore gives start-of-term announcements: the third-floor corridor is forbidden, the Forbidden Forest is off limits.",
    "In their first flying lesson, Neville breaks his wrist. Malfoy steals his Remembrall and Harry chases him on a broomstick — McGonagall sees and makes Harry Seeker for Gryffindor.",
    "In Potions, Snape singles Harry out with impossible questions and takes points from Gryffindor. Harry senses Snape hates him personally.",
  ],
  "10_ch09_한밤의결투": [
    "Malfoy challenges Harry to a wizard's duel at midnight in the trophy room. Ron agrees to be his second.",
    "Hermione tries to stop them but gets locked out of the common room and has to come along. Neville joins too, having forgotten the password.",
    "It's a setup — Malfoy tipped off Filch. The four of them run from Filch and Mrs. Norris through the castle.",
    "They accidentally end up in the forbidden third-floor corridor and find a massive three-headed dog standing on a trapdoor.",
    "Hermione notices the dog is guarding something. Harry remembers the package Hagrid took from vault 713.",
  ],
  "11_ch10_핼러윈": [
    "In Charms class, Hermione corrects Ron's levitation spell ('It's Levi-OH-sa, not Levio-SAH'). Ron complains about her behind her back — she overhears and spends the afternoon crying in the bathroom.",
    "At the Halloween feast, Professor Quirrell bursts in screaming that there's a troll in the dungeon.",
    "Harry and Ron realize Hermione doesn't know about the troll. They find it in the girls' bathroom — twelve feet tall, swinging a club.",
    "Harry jumps on the troll's back and accidentally sticks his wand up its nose. Ron levitates the troll's own club and drops it on its head.",
    "Hermione takes the blame to protect them. From this point on, the three are inseparable friends.",
  ],
  "12_ch11_퀴디치": [
    "Harry's Nimbus Two Thousand arrives at breakfast, sent by McGonagall. Quidditch captain Oliver Wood trains him.",
    "During the match against Slytherin, Harry's broom starts bucking wildly — someone is jinxing it.",
    "Hermione spots Snape muttering and staring at Harry without blinking. She sneaks under the stands and sets Snape's robes on fire.",
    "The broom stops jerking. Harry dives after the Snitch, nearly swallows it, and Gryffindor wins.",
    "Hagrid lets slip that the three-headed dog (Fluffy) is his, and that what it guards is 'between Dumbledore and Nicolas Flamel.'",
  ],
  "13_ch12_이레지드거울": [
    "Christmas at Hogwarts — the Weasleys go home, but Ron stays with Harry. Harry receives an anonymous gift: an invisibility cloak that belonged to his father.",
    "That night, Harry uses the cloak to sneak into the Restricted Section of the library, looking for Nicolas Flamel.",
    "Fleeing from Filch, he ducks into an empty room and finds the Mirror of Erised. In it, he sees his parents and his whole family smiling at him.",
    "Harry returns to the mirror night after night. Ron looks in and sees himself as Head Boy and Quidditch captain — the mirror shows your deepest desire.",
    "Dumbledore finds Harry there and gently explains: the mirror shows nothing real, and men have wasted away sitting before it. He moves the mirror, telling Harry not to go looking for it.",
  ],
  "14_ch13_니콜라플라멜": [
    "Hermione finally finds Nicolas Flamel on a Chocolate Frog card — he's Dumbledore's partner in alchemy and the only known maker of the Philosopher's Stone.",
    "The Stone produces the Elixir of Life, which makes the drinker immortal. Flamel is over 600 years old.",
    "The trio realizes this is what Fluffy guards — and that someone at Hogwarts is trying to steal it.",
    "Harry overhears Snape threatening Quirrell in the forest and becomes convinced Snape is after the Stone for Voldemort.",
    "Hagrid accidentally reveals that he told a stranger how to get past Fluffy ('Just play him a bit of music and he falls straight to sleep').",
  ],
};

const CHAPTER_LABELS: Record<string, string> = {
  "01_ch01_살아남은아이": "1장 살아남은 아이",
  "02_ch02_사라진유리창": "2장 사라진 유리창",
  "03_ch03_발신자없는편지들": "3장 발신자 없는 편지들",
  "04_ch04_숲지기": "4장 숲지기",
  "05_ch05a_다이애건앨리": "5장 다이애건 앨리 (상)",
  "06_ch05b_다이애건앨리2": "5장 다이애건 앨리 (하)",
  "07_ch06a_정거장": "6장 정거장에서 떠나는 여행 (상)",
  "08_ch06b_정거장2": "6장 정거장에서 떠나는 여행 (하)",
  "09_ch07-08_기숙사배정_마법약교수": "7-8장 기숙사 배정 / 마법약 교수",
  "10_ch09_한밤의결투": "9장 한밤의 결투",
  "11_ch10_핼러윈": "10장 핼러윈",
  "12_ch11_퀴디치": "11장 퀴디치",
  "13_ch12_이레지드거울": "12장 소망의 거울",
  "14_ch13_니콜라플라멜": "13장 니콜라 플라멜",
};

interface Props {
  chapters: ChapterMeta[];
  currentIndex: number;
  progress: Progress;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export function ChapterList({ chapters, currentIndex, progress, onSelect, onClose }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 bg-[var(--background)] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-lg font-bold">해리 포터와 마법사의 돌</h2>
        <button
          onClick={onClose}
          className="p-2 text-[var(--text-dim)] hover:text-[var(--foreground)]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {chapters.map((ch, i) => {
          const label = CHAPTER_LABELS[ch.id] || ch.title;
          const isActive = i === currentIndex;
          const isCompleted = progress.completedChapters.includes(i);
          const plays = progress.playCount[ch.id] || 0;
          const summary = CHAPTER_SUMMARIES[ch.id];
          const details = CHAPTER_DETAILS[ch.id];
          const isExpanded = expandedId === ch.id;

          return (
            <div key={ch.id} className="rounded-lg overflow-hidden">
              <div
                className={`
                  flex items-center gap-3 w-full text-left px-4 py-3 transition-colors
                  ${isActive ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] hover:bg-[var(--surface-hover)]"}
                  ${isExpanded ? "rounded-t-lg" : "rounded-lg"}
                `}
              >
                {isCompleted && !isActive && (
                  <span className="text-[var(--repeat-glow)] text-sm">&#10003;</span>
                )}
                <button
                  className="flex-1 text-left"
                  onClick={() => {
                    onSelect(i);
                    onClose();
                  }}
                >
                  <div className={`text-sm ${isActive ? "font-bold" : ""}`}>{label}</div>
                  {summary && (
                    <div className={`text-xs mt-1 leading-relaxed ${isActive ? "text-white/70" : "text-[var(--text-dim)]"}`}>
                      {summary}
                    </div>
                  )}
                  {plays > 0 && (
                    <div className="text-xs text-[var(--text-dim)] mt-0.5">
                      {plays}회 재생
                    </div>
                  )}
                </button>
                {isActive && (
                  <span className="text-xs opacity-75 shrink-0">재생 중</span>
                )}
                {details && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(isExpanded ? null : ch.id);
                    }}
                    className={`
                      shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors
                      ${isActive ? "hover:bg-white/20 text-white/70" : "hover:bg-[var(--surface-hover)] text-[var(--text-dim)]"}
                    `}
                    aria-label="Story beats"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
                  </button>
                )}
              </div>
              {isExpanded && details && (
                <div className={`
                  px-4 py-3 text-xs leading-relaxed border-t
                  ${isActive ? "bg-[var(--accent)]/80 text-white/90 border-white/10" : "bg-[var(--surface)] text-[var(--text-dim)] border-[var(--border)]"}
                `}>
                  <ul className="space-y-1.5 list-none">
                    {details.map((beat, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="shrink-0 mt-0.5 opacity-50">&#8250;</span>
                        <span>{beat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="px-4 py-3 border-t border-[var(--border)] text-center text-sm text-[var(--text-dim)]">
        {progress.completedChapters.length}/{chapters.length} 챕터 완료
      </div>
    </div>
  );
}
