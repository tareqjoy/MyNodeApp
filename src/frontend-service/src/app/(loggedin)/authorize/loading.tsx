import { Suspense } from "react";

export default function Loading() {
    return (
        <section>
        <Suspense fallback={<p>Loading...</p>}>
        </Suspense>
      </section>
    )
  }