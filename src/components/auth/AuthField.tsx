import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Campo das telas de autenticação, no tema claro.
 *
 * O `Input` global é dark (bg #182233) e serve o app por dentro. As telas de
 * login e cadastro são claras, então precisam do próprio campo. Este componente
 * existe para que Login e Cadastro não divirjam de novo — foi exatamente isso
 * que fez o cadastro ficar dark enquanto o login já era claro.
 */

type Props = {
  label: string
  icon: React.ReactNode
  /** Mensagem de erro exibida abaixo do campo. */
  error?: string
  /** Adiciona o botão de mostrar/ocultar e alterna o type entre password e text. */
  togglePassword?: boolean
  /** Conteúdo auxiliar abaixo do campo (barra de força, dica). */
  hint?: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>

export function AuthField({ label, icon, error, togglePassword, hint, id, ...props }: Props) {
  const [visible, setVisible] = useState(false)
  const fieldId = id ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`
  const errorId = `${fieldId}-erro`

  const type = togglePassword ? (visible ? 'text' : 'password') : props.type

  return (
    <div className="w-full">
      <label htmlFor={fieldId} className="block text-[12px] font-medium text-[#6b7280] mb-1.5">
        {label}
      </label>

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none">
          {icon}
        </div>

        <input
          {...props}
          id={fieldId}
          type={type}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`flex h-11 w-full rounded-xl border bg-[#f7f8fa] pl-10 text-[13px] text-[#0f0f0f]
            placeholder:text-[#a0a0a0] transition-colors focus:outline-none focus:ring-2
            ${togglePassword ? 'pr-11' : 'pr-3'}
            ${error
              ? 'border-[#ef4444] focus:ring-[#ef4444]/20 focus:border-[#ef4444]'
              : 'border-[#e3e3e3] focus:ring-[#29457a]/20 focus:border-[#29457a]/60'}`}
        />

        {togglePassword && (
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0] hover:text-[#29457a] transition-colors"
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {error && <p id={errorId} className="mt-1.5 text-[11.5px] text-[#ef4444]">{error}</p>}
      {!error && hint}
    </div>
  )
}
