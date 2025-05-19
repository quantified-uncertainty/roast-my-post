import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Evaluation Oracle
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            AI-powered document review and evaluation tools
          </p>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h2 className="mb-4 text-2xl font-bold text-gray-900">
                Featured Evaluation Agents
              </h2>

              <div className="text-center">
                <Link
                  href="/agents"
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  View All Agents
                </Link>
              </div>
            </div>

            <div className="mt-12">
              <h2 className="mb-6 text-2xl font-bold text-gray-900">
                Document Library
              </h2>
              <div className="overflow-hidden rounded-lg border border-gray-200 p-6">
                <p className="mb-4 text-lg text-gray-700">
                  Browse our collection of research documents with interactive
                  review comments and annotations.
                </p>
                <Link
                  href="/docs"
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Explore Documents
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
