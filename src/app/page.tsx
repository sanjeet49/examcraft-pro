import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="max-w-3xl text-center space-y-8">
        <h1 className="text-6xl font-extrabold tracking-tight text-gray-900 sm:text-7xl">
          Create Perfect A4 Exams with <span className="text-indigo-600">ExamCraft Pro</span>
        </h1>
        <p className="text-xl text-gray-600">
          The AI-native SaaS platform for teachers to generate, save, and export professionally formatted A4 exam papers instantly.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/login">
            <Button size="lg" className="text-lg px-8 h-14 rounded-full shadow-lg hover:shadow-xl transition-all">Start Creating</Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline" className="text-lg px-8 h-14 rounded-full bg-white hover:bg-gray-50">Sign Up</Button>
          </Link>
        </div>
      </div>

      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6 text-2xl">🤖</div>
          <h3 className="text-xl font-bold mb-3">AI Question Factory</h3>
          <p className="text-gray-500">Smart paste raw text and have our AI perfectly format MCQs, True/False, and more.</p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-cyan-100 text-cyan-600 rounded-xl flex items-center justify-center mb-6 text-2xl">📄</div>
          <h3 className="text-xl font-bold mb-3">Live A4 Preview</h3>
          <p className="text-gray-500">WYSIWYG print engine guarantees 1-inch margins and perfect scaling before export.</p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6 text-2xl">⚡</div>
          <h3 className="text-xl font-bold mb-3">1-Click Exports</h3>
          <p className="text-gray-500">Download beautiful PDFs or MS Word documents instantly for your classroom.</p>
        </div>
      </div>
    </main>
  );
}
