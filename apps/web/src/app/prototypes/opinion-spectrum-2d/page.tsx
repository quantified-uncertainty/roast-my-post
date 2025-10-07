"use client";

import {
  Opinion2DPoint,
  OpinionSpectrum2D,
} from "@/lib/OpinionSpectrum2D";

// Refusal examples
const REFUSALS: Opinion2DPoint[] = [
  {
    id: "refusal1",
    name: "GPT-4o",
    avatar: "GPT4",
    agreement: 0,
    confidence: 0,
    refusalReason: "Unclear",
    info: "The claim is unclear and I don't have enough context to evaluate it meaningfully.",
  },
  {
    id: "refusal2",
    name: "Claude 4.5m",
    avatar: "C4.5m",
    agreement: 0,
    confidence: 0,
    refusalReason: "Unclear",
    info: "The terms in this claim are too vague for me to assess.",
  },
  {
    id: "refusal3",
    name: "DeepSeek",
    avatar: "DS",
    agreement: 0,
    confidence: 0,
    refusalReason: "Policy",
    info: "I cannot evaluate claims about illegal activities.",
  },
  {
    id: "refusal4",
    name: "Sonnet 5m",
    avatar: "5m",
    agreement: 0,
    confidence: 0,
    refusalReason: "MissingData",
    info: "I don't have access to real-time data needed to evaluate this claim.",
  },
  {
    id: "refusal5",
    name: "Grok 4",
    avatar: "Grok4",
    agreement: 0,
    confidence: 0,
    refusalReason: "MissingData",
    info: "This requires specialized domain knowledge I don't possess.",
  },
  {
    id: "refusal6",
    name: "GPT-5",
    avatar: "GPT5",
    agreement: 0,
    confidence: 0,
    refusalReason: "Safety",
    info: "This request violates my safety guidelines.",
  },
  {
    id: "refusal7",
    name: "Gemini 2.5",
    avatar: "G2.5",
    agreement: 0,
    confidence: 0,
    refusalReason: "Error",
    info: "An internal error occurred while processing this request.",
  },
];

// Base opinion data (without refusals)
const BASE_OPINIONS: Opinion2DPoint[] = [
  // High confidence, agree
  {
    id: "1",
    name: "Alice Chen",
    avatar: "AC",
    agreement: 90,
    confidence: 90,
    info: "Current scaling laws show no signs of stopping. We're already seeing GPT-4 level reasoning, and compute is doubling every 6 months. The math checks out.",
  },
  {
    id: "2",
    name: "Bob Smith",
    avatar: "BS",
    agreement: 85,
    confidence: 85,
    info: "Major labs are all targeting 2027-2028. They have the funding, talent, and compute. The only question is which lab gets there first.",
  },
  {
    id: "3",
    name: "Carol Wang",
    avatar: "CW",
    agreement: 88,
    confidence: 88,
    info: "Algorithmic improvements are accelerating faster than most realize. We don't even need much more compute if efficiency keeps improving at this rate.",
  },

  // High confidence, disagree
  {
    id: "4",
    name: "David Lee",
    avatar: "DL",
    agreement: 15,
    confidence: 92,
    info: "We're hitting fundamental bottlenecks in architecture. Scaling alone won't get us there - we need breakthroughs we don't even know how to approach yet.",
  },
  {
    id: "5",
    name: "Emma Wilson",
    avatar: "EW",
    agreement: 12,
    confidence: 87,
    info: "The data wall is real. We've already trained on most of the internet. Quality data is becoming the limiting factor, not compute.",
  },

  // Low confidence, agree (expanded)
  {
    id: "6",
    name: "Frank Zhang",
    avatar: "FZ",
    agreement: 85,
    confidence: 12,
    info: "The progress seems fast, but I don't really understand the technical details well enough. Just going by what the experts are saying.",
  },
  {
    id: "7",
    name: "Grace Park",
    avatar: "GP",
    agreement: 80,
    confidence: 18,
    info: "Seems plausible based on current trajectory, but there could be unforeseen obstacles. Hard to predict these things with certainty.",
  },
  {
    id: "16",
    name: "Paul Chen",
    avatar: "PC",
    agreement: 75,
    confidence: 22,
    info: "If the current pace continues it makes sense, but I'm not sure if it will. Too many unknowns in the pipeline.",
  },
  {
    id: "17",
    name: "Quinn Lee",
    avatar: "QL",
    agreement: 82,
    confidence: 15,
    info: "The timeline feels right intuitively, but I haven't done the deep analysis. Could easily be wrong about this.",
  },

  // Low confidence, disagree (expanded)
  {
    id: "8",
    name: "Henry Davis",
    avatar: "HD",
    agreement: 25,
    confidence: 10,
    info: "Something feels off about the timeline, but I can't articulate exactly why. Maybe it's just wishful thinking that it takes longer.",
  },
  {
    id: "9",
    name: "Iris Martinez",
    avatar: "IM",
    agreement: 20,
    confidence: 20,
    info: "Seems too soon, but I don't have strong technical arguments. Just a gut feeling that we're overestimating the pace of progress.",
  },
  {
    id: "18",
    name: "Rita Wong",
    avatar: "RW",
    agreement: 15,
    confidence: 15,
    info: "I've heard conflicting expert opinions. Some say 2027, others say never. Hard to know who to trust on this.",
  },
  {
    id: "19",
    name: "Sam Taylor",
    avatar: "ST",
    agreement: 22,
    confidence: 25,
    info: "Past predictions have usually been too optimistic. Probably the same here, but I could be anchoring too much on history.",
  },

  // Low confidence, neutral (new)
  {
    id: "11",
    name: "Kate Johnson",
    avatar: "KJ",
    agreement: 52,
    confidence: 8,
    info: "Honestly have no idea. Could happen, could not. I don't understand the technology well enough to have an informed opinion.",
  },
  {
    id: "20",
    name: "Uma Patel",
    avatar: "UP",
    agreement: 48,
    confidence: 18,
    info: "The arguments on both sides seem reasonable. I keep changing my mind depending on who I talk to.",
  },
  {
    id: "21",
    name: "Victor Kim",
    avatar: "VK",
    agreement: 50,
    confidence: 12,
    info: "Completely uncertain. The field moves so fast that any prediction feels like a coin flip to me.",
  },

  // Mid-range confidence (new)
  {
    id: "10",
    name: "Jack Brown",
    avatar: "JB",
    agreement: 50,
    confidence: 45,
    info: "There are strong arguments both ways. Compute trends say yes, but we might hit unexpected walls. Genuinely 50/50 on this.",
  },
  {
    id: "22",
    name: "Wendy Liu",
    avatar: "WL",
    agreement: 65,
    confidence: 50,
    info: "Leaning yes based on the investment and talent flowing in, but acknowledge there could be fundamental barriers we haven't discovered yet.",
  },
  {
    id: "23",
    name: "Xavier Ross",
    avatar: "XR",
    agreement: 35,
    confidence: 48,
    info: "Probably need more time for safety and alignment work anyway. The technical capability might be there, but deployment is another story.",
  },

  // Mid-range agreement, high confidence
  {
    id: "12",
    name: "Liam Taylor",
    avatar: "LT",
    agreement: 65,
    confidence: 75,
    info: "The trend lines are clear, though there's some uncertainty in exact timing. 2027-2030 range seems most likely.",
  },
  {
    id: "13",
    name: "Mia Anderson",
    avatar: "MA",
    agreement: 35,
    confidence: 80,
    info: "We consistently underestimate how hard the last 10% is. Getting to 'almost AGI' and getting to actual AGI are very different challenges.",
  },

  // Edge cases
  {
    id: "14",
    name: "Nick Bostrom",
    avatar: "NB",
    agreement: 8,
    confidence: 95,
    info: "The intelligence explosion thesis requires recursive self-improvement. We're nowhere near that. 2027 is science fiction, not extrapolation.",
  },
  {
    id: "15",
    name: "Olivia Thomas",
    avatar: "OT",
    agreement: 95,
    confidence: 93,
    info: "We're already at the threshold. One more generation of models with better training will cross the line. All the pieces are in place.",
  },

  // Cluster test: 6 people at exact same position (70% agreement, 60% confidence)
  {
    id: "24",
    name: "Alex Johnson",
    avatar: "AJ",
    agreement: 70,
    confidence: 60,
    info: "Optimistic about progress but aware of challenges. 2027-2028 seems achievable with current momentum.",
  },
  {
    id: "25",
    name: "Blake Morgan",
    avatar: "BM",
    agreement: 70,
    confidence: 60,
    info: "Hardware advances are impressive, but software/algorithmic improvements matter more in the near term.",
  },
  {
    id: "26",
    name: "Casey Rivera",
    avatar: "CR",
    agreement: 70,
    confidence: 60,
    info: "The economic incentives are aligned. Big tech will throw whatever resources needed to hit this milestone.",
  },
  {
    id: "27",
    name: "Dana Foster",
    avatar: "DF",
    agreement: 70,
    confidence: 60,
    info: "Timeline seems reasonable given current rate of capability improvements. No obvious blockers visible yet.",
  },
  {
    id: "28",
    name: "Eli Cooper",
    avatar: "EC",
    agreement: 70,
    confidence: 60,
    info: "Labs are converging on similar architectures and approaches. Someone will likely crack it by 2027.",
  },
  {
    id: "29",
    name: "Finn Hayes",
    avatar: "FH",
    agreement: 70,
    confidence: 60,
    info: "Moderately confident in this timeline. Could slip to 2028-2029, but the trend is clear enough.",
  },
];

export default function OpinionSpectrum2DPrototype() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl space-y-12">
        <h1 className="text-3xl font-bold">
          2D Opinion Spectrum Prototype
        </h1>

        {/* Instructions */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h2 className="mb-2 font-semibold text-blue-900">How to use:</h2>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>
              • Hover over avatars to see details including agreement and confidence percentages
            </li>
            <li>
              • X-axis: left = disagree, right = agree
            </li>
            <li>
              • Y-axis: bottom = low confidence, top = high confidence
            </li>
            <li>
              • Nearby avatars are clustered in circular patterns to avoid overlap
            </li>
          </ul>
        </div>

        {/* Example 1: With Errors */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Example 1: With Errors/Refusals
          </h2>
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <OpinionSpectrum2D
              data={[...REFUSALS, ...BASE_OPINIONS]}
              height="h-48"
            />
          </div>
        </div>

        {/* Example 2: Without Errors */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Example 2: Without Errors (Clean Opinions Only)
          </h2>
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <OpinionSpectrum2D
              data={BASE_OPINIONS}
              height="h-48"
            />
          </div>
        </div>

        {/* Example 3: All Failed (Only Errors) */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Example 3: All Responses Failed
          </h2>
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <OpinionSpectrum2D
              data={REFUSALS}
              height="h-48"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
