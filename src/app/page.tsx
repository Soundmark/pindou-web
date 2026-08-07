import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <div className="max-w-lg">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">
          Turn Photos into
          <span className="text-primary"> Bead Patterns</span>
        </h1>
        <p className="mt-4 text-lg text-text-secondary">
          Upload any image and convert it into a fusebead pattern. Perfect for
          Perler, Hama, and Artkal beads.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/create"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-8 text-sm font-medium text-white shadow-button transition-colors hover:bg-primary-dark"
          >
            Get Started
          </Link>
          <Link
            href="/gallery"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-gray-100 px-8 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-200"
          >
            Browse Gallery
          </Link>
        </div>
      </div>
    </div>
  );
}