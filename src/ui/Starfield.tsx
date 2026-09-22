/** Three drifting star planes behind everything. Purely decorative. */
export default function Starfield() {
  return (
    <div className="starfield" aria-hidden="true">
      <div className="star-plane far" />
      <div className="star-plane mid" />
      <div className="star-plane near" />
    </div>
  );
}
