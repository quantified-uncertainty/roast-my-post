"use client";

import { useState } from "react";

interface Person {
  id: string;
  name: string;
  avatar: string;
  opinion: number; // 0 (strongly agree) to 100 (strongly disagree)
  info?: string;
  riskLevel?: "insignificant" | "low" | "significant" | "high" | "overwhelming";
}

const SAMPLE_PEOPLE: Person[] = [
  { id: "1", name: "Alice Chen", avatar: "AC", opinion: 5, info: "Senior researcher", riskLevel: "insignificant" },
  { id: "2", name: "Bob Smith", avatar: "BS", opinion: 8, info: "Data scientist", riskLevel: "insignificant" },
  { id: "3", name: "Carol Wang", avatar: "CW", opinion: 12, info: "ML Engineer", riskLevel: "insignificant" },
  { id: "4", name: "David Lee", avatar: "DL", opinion: 15, info: "Professor", riskLevel: "insignificant" },
  { id: "5", name: "Emma Wilson", avatar: "EW", opinion: 18, info: "AI Safety researcher", riskLevel: "insignificant" },
  { id: "6", name: "Frank Zhang", avatar: "FZ", opinion: 22, info: "Tech lead", riskLevel: "insignificant" },
  { id: "7", name: "Grace Park", avatar: "GP", opinion: 28, info: "Ethicist", riskLevel: "low" },
  { id: "8", name: "Henry Davis", avatar: "HD", opinion: 35, info: "Policy analyst", riskLevel: "low" },
  { id: "9", name: "Iris Martinez", avatar: "IM", opinion: 50, info: "About even", riskLevel: "significant" },
  { id: "10", name: "Jack Brown", avatar: "JB", opinion: 65, info: "Skeptical observer", riskLevel: "significant" },
  { id: "11", name: "Kate Johnson", avatar: "KJ", opinion: 72, info: "Critical thinker", riskLevel: "high" },
  { id: "12", name: "Liam Taylor", avatar: "LT", opinion: 78, info: "Independent researcher", riskLevel: "high" },
  { id: "13", name: "Mia Anderson", avatar: "MA", opinion: 85, info: "Contrarian", riskLevel: "high" },
  { id: "14", name: "Nick Bostrom", avatar: "NB", opinion: 92, info: "Philosopher", riskLevel: "overwhelming" },
  { id: "15", name: "Olivia Thomas", avatar: "OT", opinion: 95, info: "Strong dissenter", riskLevel: "overwhelming" },
];

const RISK_COLORS = {
  insignificant: "bg-green-100 border-green-300 text-green-700",
  low: "bg-blue-100 border-blue-300 text-blue-700",
  significant: "bg-yellow-100 border-yellow-300 text-yellow-700",
  high: "bg-orange-100 border-orange-300 text-orange-700",
  overwhelming: "bg-red-100 border-red-300 text-red-700",
};

// Calculate vertical offset for avatars that are close together
function getVerticalOffset(person: Person, allPeople: Person[]): number {
  const PROXIMITY_THRESHOLD = 5; // Consider avatars within 5% as "nearby"
  const VERTICAL_SPACING = 60; // Pixels between stacked avatars

  // Find all people within proximity threshold, sorted by opinion
  const nearby = allPeople
    .filter(p => Math.abs(p.opinion - person.opinion) < PROXIMITY_THRESHOLD)
    .sort((a, b) => a.opinion - b.opinion);

  if (nearby.length === 1) return 0; // No collision

  // Find this person's index in the nearby group
  const index = nearby.findIndex(p => p.id === person.id);

  // Center the cluster vertically by offsetting from the middle
  const centerOffset = ((nearby.length - 1) * VERTICAL_SPACING) / 2;
  return index * VERTICAL_SPACING - centerOffset;
}

function Avatar({
  person,
  allPeople,
  onHover,
  isHovered
}: {
  person: Person;
  allPeople: Person[];
  onHover: () => void;
  isHovered: boolean;
}) {
  const colorClass = RISK_COLORS[person.riskLevel || "low"];
  const verticalOffset = getVerticalOffset(person, allPeople);

  return (
    <div className="relative">
      <div
        className={`
          w-12 h-12 rounded-full border-2 flex items-center justify-center
          font-semibold text-sm cursor-pointer transition-all duration-200
          ${colorClass}
          ${isHovered ? "scale-125 shadow-lg z-10" : "hover:scale-110"}
        `}
        onMouseEnter={onHover}
        style={{
          position: "absolute",
          left: `${person.opinion}%`,
          top: `${verticalOffset}px`,
          transform: "translateX(-50%)",
        }}
      >
        {person.avatar}
      </div>

      {isHovered && (
        <div
          className="absolute bg-white border-2 border-gray-300 rounded-lg shadow-xl px-3 py-2 z-20 whitespace-nowrap"
          style={{
            left: `${person.opinion}%`,
            transform: "translateX(-50%)",
            top: `${verticalOffset - 60}px`,
          }}
        >
          <div className="font-semibold text-sm">{person.name}</div>
          {person.info && <div className="text-xs text-gray-600">{person.info}</div>}
        </div>
      )}
    </div>
  );
}

export default function OpinionSpectrumPrototype() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Opinion Spectrum Prototype</h1>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Legend */}
          <div className="mb-8 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-100 border-2 border-green-300"></div>
              <span>Insignificant risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-300"></div>
              <span>Low risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-100 border-2 border-yellow-300"></div>
              <span>Significant risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-100 border-2 border-orange-300"></div>
              <span>High risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-100 border-2 border-red-300"></div>
              <span>Overwhelming risk</span>
            </div>
          </div>

          {/* Scale labels */}
          <div className="flex justify-between text-sm font-semibold text-gray-700 mb-2">
            <span>Strongly Agree</span>
            <span className="text-gray-400">Neutral</span>
            <span>Strongly Disagree</span>
          </div>

          {/* Spectrum visualization */}
          <div className="relative h-96 border-b-2 border-gray-300">
            {/* Grid lines */}
            <div className="absolute inset-0 flex">
              {[0, 25, 50, 75, 100].map((pos) => (
                <div
                  key={pos}
                  className="flex-1 border-r border-gray-200 first:border-l"
                  style={{ width: "25%" }}
                />
              ))}
            </div>

            {/* Avatars - centered vertically with padding */}
            <div
              className="absolute inset-0 pt-40"
              onMouseLeave={() => setHoveredId(null)}
            >
              {SAMPLE_PEOPLE.map((person) => (
                <Avatar
                  key={person.id}
                  person={person}
                  allPeople={SAMPLE_PEOPLE}
                  onHover={() => setHoveredId(person.id)}
                  isHovered={hoveredId === person.id}
                />
              ))}
            </div>
          </div>

          {/* Scale markers */}
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="font-semibold text-blue-900 mb-2">How to use:</h2>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Hover over any avatar to see the person's name and info</li>
            <li>• Colors represent different risk assessment levels</li>
            <li>• Position on the scale represents their opinion (0 = strongly agree, 100 = strongly disagree)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
