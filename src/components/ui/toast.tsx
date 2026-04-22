import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/utils/formatters'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = React.createContext<ToastContextValue>({ toast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const toast = React.useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={cn(
                'pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-sm min-w-[280px] max-w-[400px]',
                t.type === 'success' && 'bg-green-500/10 border-green-500/20 text-green-300',
                t.type === 'error' && 'bg-red-500/10 border-red-500/20 text-red-300',
                t.type === 'info' && 'bg-blue-500/10 border-blue-500/20 text-blue-300',
                t.type === 'warning' && 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
              )}
            >
              {t.type === 'success' && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
              {t.type === 'error' && <AlertCircle className="h-4 w-4 flex-shrink-0" />}
              {t.type === 'info' && <Info className="h-4 w-4 flex-shrink-0" />}
              {t.type === 'warning' && <AlertCircle className="h-4 w-4 flex-shrink-0" />}
              <span className="text-sm flex-1">{t.message}</span>
              <button onClick={() => remove(t.id)} className="opacity-70 hover:opacity-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return React.useContext(ToastContext)
}
