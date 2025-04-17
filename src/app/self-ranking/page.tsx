import React from "react";

interface Aspect {
  name: string;
  description: string;
  grade: string;
  details: string;
}

interface Section {
  title: string;
  description: string;
  aspects: Aspect[];
}

const sections: Section[] = [
  {
    title: "Core Features",
    description:
      "Essential functionality that defines the platform's main purpose",
    aspects: [
      {
        name: "Evaluation Agents",
        description:
          "How good are the agents at analyzing and evaluating content?",
        grade: "D+",
        details:
          "Basic agent functionality exists but has significant limitations in accuracy and reliability",
      },
      {
        name: "Markdown Display Functionality",
        description: "Quality and flexibility of markdown visualizer.",
        grade: "C",
        details:
          "Basic highlighting works but has issues with text matching and offset calculations. Only very basic markdown is supported.",
      },
      {
        name: "Document Import",
        description: "Ease and reliability of importing documents",
        grade: "D-",
        details:
          "Only supports basic markdown and limited HTML imports, many formats not supported",
      },
      {
        name: "Export Capabilities",
        description: "Quality and variety of export options",
        grade: "N/A",
        details: "Export functionality not yet implemented",
      },
    ],
  },
  {
    title: "Technical Infrastructure",
    description: "Backend systems and technical capabilities",
    aspects: [
      {
        name: "API",
        description: "Quality and documentation of the API",
        grade: "N/A",
        details: "No public API endpoints implemented",
      },
      {
        name: "Performance",
        description: "Speed and responsiveness of the application",
        grade: "B+",
        details:
          "Basic performance but struggles with large documents and complex operations",
      },
      {
        name: "Data Security",
        description: "Security measures for user data",
        grade: "N/A",
        details: "No user authentication or data security features implemented",
      },
      {
        name: "System Requirements",
        description: "Compatibility with different systems and browsers",
        grade: "C",
        details: "Basic browser compatibility but lacks mobile optimization",
      },
    ],
  },
  {
    title: "User Experience",
    description: "Features that impact how users interact with the platform",
    aspects: [
      {
        name: "User Interface",
        description: "Quality and intuitiveness of the user interface",
        grade: "B-",
        details: "Basic UI exists but lacks advanced features and polish",
      },
      {
        name: "Search Functionality",
        description: "Quality of search and filtering capabilities",
        grade: "C",
        details:
          "Basic text search only, no advanced filtering or search features",
      },
      {
        name: "Mobile Responsiveness",
        description: "Quality of experience on mobile devices",
        grade: "N/A",
        details: "Mobile interface not properly implemented",
      },
      {
        name: "Accessibility",
        description: "Compliance with accessibility standards",
        grade: "N/A",
        details: "Accessibility features not implemented",
      },
      {
        name: "Error Handling",
        description: "Quality of error messages and recovery",
        grade: "C-",
        details: "Basic error handling with limited user feedback",
      },
      {
        name: "User Documentation",
        description: "Quality and completeness of user guides",
        grade: "N/A",
        details: "No user documentation available",
      },
      {
        name: "Customization Options",
        description: "Ability to customize the interface and features",
        grade: "N/A",
        details: "No customization features implemented",
      },
    ],
  },
];

interface PlannedFeature {
  name: string;
  description: string;
}

const plannedFeatures: PlannedFeature[] = [
  {
    name: "Document Versioning",
    description: "Track and manage document versions over time",
  },
  {
    name: "PostgreSQL Database",
    description:
      "Migrate all data to a PostgreSQL database for better scalability and querying",
  },
  {
    name: "User Content Submission",
    description:
      "Allow users to submit content via Markdown or URL (with limited website support) and choose evaluation agents",
  },
  {
    name: "Meta-Agents",
    description:
      "Intelligent agents that recommend appropriate evaluation agents for each content item",
  },
  {
    name: "Meta-Evaluation Agents",
    description:
      "Agents that review and evaluate the performance of other evaluation agents",
  },
  {
    name: "GraphQL Support",
    description: "Implement GraphQL API or database export functionality",
  },
  {
    name: "Squiggle/Guesstimate Integration",
    description: "Support for Squiggle and Guesstimate models",
  },
  {
    name: "Alternative Formats",
    description:
      "Support for additional formats including comment threads, LaTeX, code blocks, diffs, etc.",
  },
  {
    name: "Expanded Agent Library",
    description: "More specialized agents for different types of content",
  },
  {
    name: "Web Search Agents",
    description: "Agents capable of performing comprehensive web searches",
  },
  {
    name: "Context-Aware Evaluation",
    description:
      "System for maintaining and utilizing post context, with search agents adding context and evaluation agents using it for better analysis",
  },
];

interface AspectTableProps {
  title: string;
  description: string;
  aspects: Aspect[];
}

function AspectTable({ title, description, aspects }: AspectTableProps) {
  return (
    <div className="mb-12">
      <h2 className="mb-2 text-2xl font-semibold">{title}</h2>
      <p className="mb-4 text-gray-600">{description}</p>
      <div className="overflow-x-auto">
        <table className="min-w-full rounded-lg border border-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Aspect
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Grade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {aspects.map((aspect: Aspect, index: number) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium whitespace-nowrap">
                  {aspect.name}
                </td>
                <td className="px-6 py-4">{aspect.description}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`rounded-full px-2 py-1 text-sm font-medium ${
                      aspect.grade === "N/A"
                        ? "bg-gray-100 text-gray-600"
                        : aspect.grade.includes("A")
                          ? "bg-green-100 text-green-800"
                          : aspect.grade.includes("B")
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {aspect.grade}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{aspect.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlannedFeaturesTable() {
  return (
    <div className="mb-12">
      <h2 className="mb-2 text-2xl font-semibold">Planned Features</h2>
      <p className="mb-4 text-gray-600">
        Features that are planned for future development but not yet
        implemented.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full rounded-lg border border-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Feature
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {plannedFeatures.map((feature: PlannedFeature, index: number) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium whitespace-nowrap">
                  {feature.name}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {feature.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SelfRankingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Open Annotate Self-Ranking</h1>
      <p className="mb-8 text-gray-600">
        This page provides a short assessment of various aspects of the Open
        Annotate platform, organized by category. Much of this was written by an
        LLM.
      </p>

      {sections.map((section: Section, index: number) => (
        <AspectTable
          key={index}
          title={section.title}
          description={section.description}
          aspects={section.aspects}
        />
      ))}

      <PlannedFeaturesTable />
    </div>
  );
}
