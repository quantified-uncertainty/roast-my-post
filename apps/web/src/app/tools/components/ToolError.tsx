export function ToolError({ error }: { error: string }) {
  return (
    <div className="rounded-md bg-red-50 p-4" role="alert">
      <p className="text-sm text-red-800">{error}</p>
    </div>
  );
}