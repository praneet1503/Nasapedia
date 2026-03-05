export default function StarField() {
  return (
    <>
      <div className="starfield" aria-hidden="true">
        <div className="star-layer stars-sm" />
        <div className="star-layer stars-md" />
        <div className="star-layer stars-lg" />
      </div>

      <div className="nebula nebula-blue" aria-hidden="true" />
      <div className="nebula nebula-purple" aria-hidden="true" />
      <div className="nebula nebula-pink" aria-hidden="true" />
    </>
  )
}
