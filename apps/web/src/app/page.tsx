import Link from "next/link";
import { auth } from "@/infrastructure/auth/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  // Redirect logged-in users to their documents
  if (session?.user) {
    redirect("/my-documents");
  }

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Get AI-Powered Feedback on Your Writing
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Upload your article and get detailed feedback from specialized AI evaluators.
              Each evaluator provides unique insights to help improve your writing.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/signup"
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
              >
                Get Started
              </Link>
              <Link
                href="/docs"
                className="bg-gray-200 text-gray-800 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-300 transition"
              >
                Browse Examples
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Import Your Document</h3>
              <p className="text-gray-600">Paste a URL or upload your text</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
              <p className="text-gray-600">Our evaluators analyze your content</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Feedback</h3>
              <p className="text-gray-600">Review inline comments and suggestions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Flexible AI Agents */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Flexible AI Analysis</h2>
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg text-gray-600 mb-8">
              Our platform uses customizable AI evaluators that can be tailored to provide
              specific types of feedback on your writing. Each evaluator can be configured
              with unique instructions to focus on different aspects of your work.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="text-xl font-semibold mb-2">Focused Analysis</h3>
                <p className="text-gray-600">Evaluators provide targeted feedback based on their instructions</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-3xl mb-3">💬</div>
                <h3 className="text-xl font-semibold mb-2">Detailed Highlights</h3>
                <p className="text-gray-600">Get specific, actionable comments on your text</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-3xl mb-3">📊</div>
                <h3 className="text-xl font-semibold mb-2">Comprehensive Reports</h3>
                <p className="text-gray-600">Receive in-depth analysis and summaries</p>
              </div>
            </div>
            <Link
              href="/evaluators"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Browse available evaluators →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="mx-auto max-w-4xl text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-4">Ready to Improve Your Writing?</h2>
          <p className="text-xl mb-8 opacity-90">
            Get started with your first document analysis today.
          </p>
          <Link
            href="/signup"
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition inline-block"
          >
            Sign Up
          </Link>
        </div>
      </section>
    </div>
  );
}
