export function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  return (
    <div className={'lb' + (src ? ' on' : '')} onClick={onClose}>
      {src && <img src={src} alt="" />}
    </div>
  )
}
