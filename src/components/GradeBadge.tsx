const GRADES = [
  {
    threshold: 95,
    letter: "A+",
    label: "Excellent",
    lightTextColor: "#0d4f2c",
    lightBackground: "#A2F8C6",
    darkTextColor: "#ffffff",
    darkBackground: "#0DF233",
  },
  {
    threshold: 87,
    letter: "A",
    label: "Great",
    lightTextColor: "#1a5a35",
    lightBackground: "#A3F4B8",
    darkTextColor: "#ffffff",
    darkBackground: "#60F31E",
  },
  {
    threshold: 80,
    letter: "A-",
    label: "Good",
    lightTextColor: "#2a6642",
    lightBackground: "#A4F6A4",
    darkTextColor: "#ffffff",
    darkBackground: "#92EE0D",
  },
  {
    threshold: 77,
    letter: "B+",
    label: "Fair",
    lightTextColor: "#3a7050",
    lightBackground: "#B3F79A",
    darkTextColor: "#000000",
    darkBackground: "#BFF500",
  },
  {
    threshold: 73,
    letter: "B",
    label: "Fair",
    lightTextColor: "#4a7a5e",
    lightBackground: "#CBF995",
    darkTextColor: "#000000",
    darkBackground: "#D8F500",
  },
  {
    threshold: 70,
    letter: "B-",
    label: "Fair",
    lightTextColor: "#92400e",
    lightBackground: "#FCF58D",
    darkTextColor: "#000000",
    darkBackground: "#F0E500",
  },
  {
    threshold: 67,
    letter: "C+",
    label: "Fair",
    lightTextColor: "#92400e",
    lightBackground: "#FDEB8F",
    darkTextColor: "#000000",
    darkBackground: "#F9D305",
  },
  {
    threshold: 63,
    letter: "C",
    label: "Fair",
    lightTextColor: "#9a3412",
    lightBackground: "#FDDA95",
    darkTextColor: "#000000",
    darkBackground: "#FFC101",
  },
  {
    threshold: 60,
    letter: "C-",
    label: "Fair",
    lightTextColor: "#9a3412",
    lightBackground: "#FDD29F",
    darkTextColor: "#ffffff",
    darkBackground: "#FFA801",
  },
  {
    threshold: 50,
    letter: "D+",
    label: "Weak",
    lightTextColor: "#7c2d12",
    lightBackground: "#FDCCAA",
    darkTextColor: "#ffffff",
    darkBackground: "#FF8E02",
  },
  {
    threshold: 40,
    letter: "D",
    label: "Weak",
    lightTextColor: "#991b1b",
    lightBackground: "#FEC8B5",
    darkTextColor: "#ffffff",
    darkBackground: "#FF730D",
  },
  {
    threshold: 30,
    letter: "D-",
    label: "Poor",
    lightTextColor: "#991b1b",
    lightBackground: "#FEC8BF",
    darkTextColor: "#ffffff",
    darkBackground: "#FF5524",
  },
  {
    threshold: 10,
    letter: "F",
    label: "Poor",
    lightTextColor: "#991b1b",
    lightBackground: "#FFC2C2",
    darkTextColor: "#ffffff",
    darkBackground: "#FF1111",
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

function getGradeInfo(grade: number) {
  return (
    GRADES.find(({ threshold }) => grade >= threshold) ||
    GRADES[GRADES.length - 1]
  );
}

function getGradeColorDark(grade: number): {
  style: { backgroundColor: string; color: string };
  className: string;
} {
  const gradeInfo = getGradeInfo(grade);
  return {
    style: {
      backgroundColor: gradeInfo.darkBackground,
      color: gradeInfo.darkTextColor,
    },
    className: "",
  };
}

function getGradeColorLight(grade: number): {
  style: { backgroundColor: string; color: string };
  className: string;
} {
  const gradeInfo = getGradeInfo(grade);
  return {
    style: {
      backgroundColor: gradeInfo.lightBackground,
      color: gradeInfo.lightTextColor,
    },
    className: "",
  };
}

function getGradeColorGrayscale(grade: number): {
  style: { backgroundColor: string; color: string };
  className: string;
} {
  return {
    style: {
      backgroundColor: "#F3F4F6", // light gray (gray-100)
      color: "#374151", // dark gray (gray-700)
    },
    className: "",
  };
}

const SIZE_CLASSES = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-md",
} as const;

const PADDING_CLASSES = {
  xs: "px-1",
  sm: "px-2",
  md: "px-3",
} as const;

interface GradeBadgeProps {
  grade: number | null;
  variant?: "light" | "dark" | "grayscale";
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function GradeBadge({
  grade,
  variant = "light",
  size = "sm",
  className = "",
}: GradeBadgeProps) {
  // Don't render anything if grade is null
  if (grade === null) {
    return null;
  }

  const baseClasses = `rounded ${PADDING_CLASSES[size]} py-0.5 font-semibold ${SIZE_CLASSES[size]} ${className}`;
  const style =
    variant === "dark" ? getGradeColorDark(grade) : 
    variant === "grayscale" ? getGradeColorGrayscale(grade) :
    getGradeColorLight(grade);

  return (
    <span className={`${baseClasses} ${style.className}`} style={style.style}>
      {getLetterGrade(grade)}
    </span>
  );
}
