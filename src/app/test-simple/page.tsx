"use client";

import { useState } from "react";

export default function TestSimplePage() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4">
      <h1 data-testid="title">Simple Test Page</h1>
      <div className="mt-4">
        <span data-testid="count">Count: {count}</span>
        <button
          data-testid="increment"
          onClick={() => setCount((c) => c + 1)}
          className="ml-4 rounded bg-blue-500 px-4 py-2 text-white"
        >
          Increment
        </button>
      </div>
    </div>
  );
}
