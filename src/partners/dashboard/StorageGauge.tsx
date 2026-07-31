function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let val = bytes / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

export default function StorageGauge({
  usedBytes,
  capBytes,
  onUpgradeClick,
}: {
  usedBytes: number;
  capBytes: number;
  onUpgradeClick?: () => void;
}) {
  const pct = capBytes > 0 ? Math.min(100, (usedBytes / capBytes) * 100) : 0;
  const nearCap = pct >= 85;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">
          {formatBytes(usedBytes)} of {formatBytes(capBytes)} used
        </span>
        {nearCap && onUpgradeClick && (
          <button onClick={onUpgradeClick} className="text-blue-600 font-medium">
            Buy more storage
          </button>
        )}
      </div>
      <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: nearCap ? '#dc2626' : '#0A0A0A',
            transition: 'width .3s',
          }}
        />
      </div>
    </div>
  );
}
