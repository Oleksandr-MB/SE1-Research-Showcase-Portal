export function LoadingSkeleton() {
  return (
    <div className="min-h-screen pt-16 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="space-y-6">
          <div className="h-8 w-64 bg-[#F3F3F3] rounded-lg animate-pulse"></div>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-48 bg-[#F3F3F3] rounded-2xl animate-pulse"></div>
              <div className="grid md:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 bg-[#F3F3F3] rounded-xl animate-pulse"></div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-32 bg-[#F3F3F3] rounded-xl animate-pulse"></div>
              <div className="h-40 bg-[#F3F3F3] rounded-xl animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}