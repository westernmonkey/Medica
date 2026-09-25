import ThreeDViewer from "@/components/ui/ThreeModel";

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-10">
      <div className="mb-8 max-w-3xl text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#078859]">Medica Beta</p>
        <h1 className="text-4xl font-bold text-gray-900">Explore anatomy</h1>
        <p className="mt-3 text-gray-600">A public preview of the 3D anatomy viewer.</p>
      </div>
      <ThreeDViewer />
    </main>
  );
}
