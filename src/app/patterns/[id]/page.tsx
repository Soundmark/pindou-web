"use client";

import { use, useState } from "react";
import { useDiagram } from "@/services/diagramService";
import { PatternCanvas } from "@/components/pattern/PatternCanvas";
import { ColorLegend } from "@/components/pattern/ColorLegend";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function PatternDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const { data, isLoading, error } = useDiagram(id);
  const [highlightedColor, setHighlightedColor] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState title="Pattern not found" description="This pattern may have been deleted." />
      </div>
    );
  }

  const diagram = data.data;

  // Convert pixels back to 2D array for rendering
  const pixels: number[][] = diagram.pixels || [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">{diagram.name}</h1>
        {diagram.description && (
          <p className="mt-1 text-text-secondary">{diagram.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
          <span>by {diagram.userName}</span>
          <span>·</span>
          <span>{diagram.width}x{diagram.height}</span>
          <span>·</span>
          <span>{diagram.colorCount} colors</span>
          <span>·</span>
          <span>{diagram.viewCount} views</span>
          <span>·</span>
          <span>{diagram.favoriteCount} favorites</span>
        </div>
        {diagram.tags?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {diagram.tags.map((tag: string) => (
              <Link
                key={tag}
                href={`/gallery?tag=${tag}`}
                className="rounded-full bg-primary/10 px-3 py-0.5 text-xs text-primary"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pattern */}
      {pixels.length > 0 ? (
        <div className="flex flex-col items-center gap-6">
          <PatternCanvas
            pixels={pixels}
            cellSize={12}
            highlightedColorId={highlightedColor}
          />
          <ColorLegend
            pixels={pixels}
            highlightedColorId={highlightedColor}
            onHighlightColor={setHighlightedColor}
          />
        </div>
      ) : (
        <div className="flex justify-center">
          <img
            src={diagram.imageUrl}
            alt={diagram.name}
            className="max-h-96 rounded-2xl object-contain shadow-card"
          />
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {session && (
          <Button
            variant="secondary"
            onClick={() => {
              fetch(`/api/diagrams/favorites/${id}`, { method: "POST" });
            }}
          >
            ♥ Favorite
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => {
            const a = document.createElement("a");
            a.href = `/api/diagrams/${id}/export/png`;
            a.download = `${diagram.name}.png`;
            a.click();
          }}
        >
          Download PNG
        </Button>
        <Link href={`/create?load=${id}`}>
          <Button variant="ghost">Edit in Creator</Button>
        </Link>
      </div>
    </div>
  );
}