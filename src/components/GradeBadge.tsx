interface GradeBadgeProps {
  grade: number;
  variant?: "weak" | "strong";
  className?: string;
}

// Grade definitions with thresholds, labels, and colors
const GRADES = [
  {
    threshold: 95,
    letter: "A+",
    label: "Excellent",
    lightTextColor: "#166534", // green-800
    lightBackground: "#bbf7d0", // green-200
    darkTextColor: "#ffffff",
    darkBackground: "#10b981", // emerald-500 - bright green
  },
  {
    threshold: 87,
    letter: "A",
    label: "Great",
    lightTextColor: "#166534", // green-800
    lightBackground: "#dcfce7", // green-100
    darkTextColor: "#ffffff",
    darkBackground: "#22c55e", // green-500 - medium green
  },
  {
    threshold: 80,
    letter: "A-",
    label: "Good",
    lightTextColor: "#14532d", // green-900
    lightBackground: "#ecfdf5", // green-50
    darkTextColor: "#ffffff",
    darkBackground: "#84cc16", // lime-500 - lime green
  },
  {
    threshold: 77,
    letter: "B+",
    label: "Fair",
    lightTextColor: "#365314", // lime-800
    lightBackground: "#d9f99d", // lime-200
    darkTextColor: "#000000",
    darkBackground: "#a3e635", // lime-400 - bright lime
  },
  {
    threshold: 73,
    letter: "B",
    label: "Fair",
    lightTextColor: "#365314", // lime-800
    lightBackground: "#ecfccb", // lime-100
    darkTextColor: "#000000",
    darkBackground: "#eab308", // yellow-500 - yellow
  },
  {
    threshold: 70,
    letter: "B-",
    label: "Fair",
    lightTextColor: "#1a2e05", // lime-900
    lightBackground: "#f7fee7", // lime-50
    darkTextColor: "#000000",
    darkBackground: "#fbbf24", // amber-400 - golden yellow
  },
  {
    threshold: 67,
    letter: "C+",
    label: "Fair",
    lightTextColor: "#92400e", // amber-800
    lightBackground: "#fef3c7", // amber-100
    darkTextColor: "#000000",
    darkBackground: "#f59e0b", // amber-500 - amber
  },
  {
    threshold: 63,
    letter: "C",
    label: "Fair",
    lightTextColor: "#9a3412", // orange-800
    lightBackground: "#fed7aa", // orange-200
    darkTextColor: "#ffffff",
    darkBackground: "#f97316", // orange-500 - orange
  },
  {
    threshold: 60,
    letter: "C-",
    label: "Fair",
    lightTextColor: "#9a3412", // orange-800
    lightBackground: "#ffedd5", // orange-100
    darkTextColor: "#ffffff",
    darkBackground: "#ea580c", // orange-600 - deep orange
  },
  {
    threshold: 50,
    letter: "E",
    label: "Weak",
    lightTextColor: "#7c2d12", // orange-900
    lightBackground: "#fff7ed", // orange-50
    darkTextColor: "#ffffff",
    darkBackground: "#dc2626", // red-600 - bright red
  },
  {
    threshold: 40,
    letter: "E-",
    label: "Weak",
    lightTextColor: "#991b1b", // red-800
    lightBackground: "#fecaca", // red-200
    darkTextColor: "#ffffff",
    darkBackground: "#b91c1c", // red-700 - strong red
  },
  {
    threshold: 30,
    letter: "F",
    label: "Poor",
    lightTextColor: "#991b1b", // red-800
    lightBackground: "#fee2e2", // red-100
    darkTextColor: "#ffffff",
    darkBackground: "#991b1b", // red-800 - deep red
  },
  {
    threshold: 20,
    letter: "F-",
    label: "Poor",
    lightTextColor: "#7f1d1d", // red-900
    lightBackground: "#fef2f2", // red-50
    darkTextColor: "#ffffff",
    darkBackground: "#7f1d1d", // red-900 - very deep red
  },
  {
    threshold: 10,
    letter: "F-",
    label: "Terrible",
    lightTextColor: "#7f1d1d", // red-900
    lightBackground: "#fef2f2", // red-50
    darkTextColor: "#ffffff",
    darkBackground: "#7f1d1d", // red-900 - very deep red
  },
  {
    threshold: 0,
    letter: "F--",
    label: "Terrible",
    lightTextColor: "#450a0a", // red-950
    lightBackground: "#fef2f2", // red-50
    darkTextColor: "#ffffff",
    darkBackground: "#450a0a", // red-950 - darkest red
  },
] as const;

export function getLetterGrade(grade: number): string {
  return GRADES.find(({ threshold }) => grade >= threshold)?.letter || "F--";
}

export function getGradeLabel(grade: number): string {
  const gradeInfo =
    GRADES.find(({ threshold }) => grade >= threshold) ||
    GRADES[GRADES.length - 1];
  return gradeInfo.label;
}

function getGradeColorStrong(grade: number): {
  style: { backgroundColor: string };
  className: string;
} {
  const gradeInfo =
    GRADES.find(({ threshold }) => grade >= threshold) ||
    GRADES[GRADES.length - 1];
  return {
    style: { backgroundColor: gradeInfo.darkBackground },
    className: "text-white",
  };
}

function getGradeColorWeak(grade: number): {
  backgroundColor: string;
  color: string;
} {
  const gradeInfo =
    GRADES.find(({ threshold }) => grade >= threshold) ||
    GRADES[GRADES.length - 1];
  return {
    backgroundColor: gradeInfo.lightBackground,
    color: gradeInfo.lightTextColor,
  };
}

export function GradeBadge({
  grade,
  variant = "weak",
  className = "",
}: GradeBadgeProps) {
  if (variant === "strong") {
    const strongStyle = getGradeColorStrong(grade);
    return (
      <span
        className={`rounded px-2 py-0.5 text-sm font-semibold ${strongStyle.className} ${className}`}
        style={strongStyle.style}
      >
        {getLetterGrade(grade)}
      </span>
    );
  }

  const weakStyle = getGradeColorWeak(grade);
  return (
    <span
      className={`rounded px-2 py-0.5 text-sm font-semibold ${className}`}
      style={weakStyle}
    >
      {getLetterGrade(grade)}
    </span>
  );
}
