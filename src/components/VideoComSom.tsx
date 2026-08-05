import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

/**
 * Player de vídeo com som fácil de ligar.
 *
 * Contexto: nenhum navegador deixa um vídeo começar tocando com som sozinho.
 * Chrome, Safari e Firefox bloqueiam — se tentarmos, o vídeo simplesmente não
 * toca. A regra só cede depois que a pessoa interage com a página.
 *
 * Então em vez de brigar com o navegador:
 *   1. o vídeo começa mudo (única forma de tocar sozinho);
 *   2. um botão grande e visível liga o som num toque — no lugar do ícone
 *      minúsculo dos controles nativos, que é o que dá trabalho no celular;
 *   3. depois do primeiro toque, os próximos vídeos da sessão já começam com
 *      som, porque a interação já aconteceu.
 */

// Vale para a sessão inteira: uma vez que a pessoa pediu som, todos os vídeos
// seguintes tentam começar com som.
let somLiberadoNaSessao = false

type Props = {
  src: string
  className?: string
  /** Repetir enquanto estiver mudo. Com som, repetir em loop incomoda. */
  loop?: boolean
  poster?: string
}

export function VideoComSom({ src, className = '', loop = true, poster }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const [mudo, setMudo] = useState(true)

  // Ao trocar de vídeo, tenta já começar com som se a pessoa já pediu antes.
  useEffect(() => {
    const v = ref.current
    if (!v) return

    setMudo(true)
    if (!somLiberadoNaSessao) return

    v.muted = false
    v.play()
      .then(() => setMudo(false))
      .catch(() => {
        // O navegador recusou mesmo assim: volta ao mudo para ao menos tocar.
        v.muted = true
        setMudo(true)
        v.play().catch(() => {})
      })
  }, [src])

  const ligarSom = () => {
    const v = ref.current
    if (!v) return
    v.muted = false
    v.volume = 1
    somLiberadoNaSessao = true
    setMudo(false)
    v.play().catch(() => {})
  }

  const desligarSom = () => {
    const v = ref.current
    if (!v) return
    v.muted = true
    setMudo(true)
  }

  return (
    <div className="relative inline-flex w-full h-full">
      <video
        ref={ref}
        src={src}
        poster={poster}
        autoPlay
        muted
        playsInline
        controls
        // Com som ligado, repetir sem parar atrapalha. Mudo, o loop ajuda a
        // ver o conteúdo sem precisar clicar.
        loop={loop && mudo}
        className={className}
        onVolumeChange={e => {
          // Mantém o botão em sincronia se a pessoa usar os controles nativos.
          const v = e.currentTarget
          setMudo(v.muted || v.volume === 0)
          if (!v.muted && v.volume > 0) somLiberadoNaSessao = true
        }}
      />

      {mudo ? (
        // Alvo grande: no celular o botão de som dos controles nativos é
        // pequeno demais para acertar.
        <button
          type="button"
          onClick={ligarSom}
          aria-label="Ativar som do vídeo"
          className="absolute top-3 left-3 z-20 inline-flex items-center gap-2 px-3.5 h-10 rounded-full
            bg-black/70 backdrop-blur-sm text-white text-[13px] font-semibold
            hover:bg-black/85 active:scale-95 transition-all shadow-lg"
        >
          <VolumeX className="w-[18px] h-[18px]" />
          Ativar som
        </button>
      ) : (
        <button
          type="button"
          onClick={desligarSom}
          aria-label="Silenciar vídeo"
          className="absolute top-3 left-3 z-20 inline-flex items-center justify-center w-10 h-10 rounded-full
            bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 active:scale-95 transition-all shadow-lg"
        >
          <Volume2 className="w-[18px] h-[18px]" />
        </button>
      )}
    </div>
  )
}
