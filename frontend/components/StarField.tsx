/**
 * StarField — pure-CSS animated starfield background.
 * Three parallax layers of stars at different speeds plus soft nebula blobs.
 * Respects prefers-reduced-motion automatically via globals.css.
 */
export default function StarField() {
  return (
    <>
      {/* Stars */}
      <div className="starfield" aria-hidden="true">
        <div className="star-layer stars-sm" />
        <div className="star-layer stars-md" />
        <div className="star-layer stars-lg" />
      </div>

      {/* Nebula gradients */}
      <div className="nebula nebula-blue" aria-hidden="true" />
      <div className="nebula nebula-purple" aria-hidden="true" />
      <div className="nebula nebula-pink" aria-hidden="true" />
    </>
  )
}
