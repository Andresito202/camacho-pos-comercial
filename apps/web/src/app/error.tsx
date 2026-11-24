"use client";

import { useEffect } from "react";
import { Button } from "@camacho-pos/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-4 py-20 text-center">
      <h1 className="font-serif text-4xl">Algo salió mal</h1>
      <p className="mt-4 text-[var(--muted)]">
        Ocurrió un error al cargar esta vista. Puedes reintentar o volver más tarde.
      </p>
      <div className="mt-8 flex justify-center">
        <Button onClick={reset}>Reintentar</Button>
      </div>
    </div>
  );
}
