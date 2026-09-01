import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "../contexts/ThemeContext";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: '448px',
  md: '560px',
  lg: '672px',
  xl: '896px',
};

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const surface    = isDark ? '#1a1d27' : '#ffffff';
  const border     = isDark ? '#2e3347' : '#f3f4f6';
  const textPri    = isDark ? '#f9fafb' : '#111827';
  const textMut    = isDark ? '#9ca3af' : '#6b7280';
  const hoverBg    = isDark ? '#252836' : '#f3f4f6';
  const shadow     = isDark
    ? '0 25px 60px rgba(0,0,0,0.6)'
    : '0 25px 60px rgba(0,0,0,0.2)';

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 100,
            }}
          />

          {/* Centering wrapper */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 101,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            pointerEvents: 'none',
            boxSizing: 'border-box',
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={e => e.stopPropagation()}
              style={{
                pointerEvents: 'auto',
                backgroundColor: surface,
                borderRadius: '16px',
                boxShadow: shadow,
                width: '100%',
                maxWidth: sizeMap[size],
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: `1px solid ${border}`,
                flexShrink: 0,
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: textPri }}>
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  style={{
                    padding: '6px', borderRadius: '8px', border: 'none',
                    background: 'transparent', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = hoverBg}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
                >
                  <X className="w-5 h-5" style={{ color: textMut }} />
                </button>
              </div>

              {/* Scrollable body */}
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: surface }}>
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
