/**
 * 3D perspective grid floor behind the pages (the "2080" canvas).
 * Pure CSS: one tilted plane whose texture slides toward the viewer (compositor only, ~0 main thread).
 */
export function GridFloor() {
  return (
    <div aria-hidden className="grid-floor">
      <div className="grid-floor-plane">
        <div className="grid-floor-lines" />
      </div>
      <div className="grid-floor-fade" />
    </div>
  );
}
