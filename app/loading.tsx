export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <img
        src="/logo-leon.png"
        alt="logo-leon"
        className="w-40 h-40 animate-pulse"
      />
    </div>
  );
}