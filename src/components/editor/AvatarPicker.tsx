import { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (emoji: string) => void
  disabled?: boolean
}

const CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'Faces',
    icon: '😀',
    emojis: '😀😃😄😁😆😅😂🤣😊😇🙂🙃😉😌😍🥰😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🥸🤩🥳😏😒😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😤😠😡🤬🤯😳🥶🥵😱😨😰😥😓🤗🤔🫡🤭🤫🤥😶😐😑😬🙄😯😦😧😮😲🥱😴🤤😪😵🤐🥴🤢🤮🤧😷🤒🤕🤑🤠😈👿👹👺🤡💩👻💀☠️👽👾🤖🎃'.split(/(?<=\p{Emoji})/u).filter(Boolean),
  },
  {
    label: 'People',
    icon: '👶',
    emojis: '👶🧒👦👧🧑👱👨🧔👩🧓👴👵💆💇🚶🧍🧎🏃🤸⛹️🤺🤼🤾🏌️🏇🧘🛀🛌👫👬👭💏💑👨‍👩‍👦👨‍👩‍👧'.split(/(?<=\p{Emoji})/u).filter(Boolean),
  },
  {
    label: 'Animals',
    icon: '🐶',
    emojis: '🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🙈🙉🙊🐔🐧🐦🐤🦆🦅🦉🦇🐺🐗🐴🦄🐝🐛🦋🐌🐞🐜🦟🦗🕷🦂🐢🐍🦎🦖🦕🐙🦑🦐🦞🦀🐡🐟🐠🐬🐳🐋🦈🐊🐅🐆🦓🦍🦧🦣🐘🦛🦏🐪🐫🦒🦘🦬🐃🐂🐄🐎🐖🐏🐑🦙🐐🦌🐕🐩🦮🐈🐓🦃🦤🦚🦜🦢🦩🕊🐇🦝🦨🦡🦫🦦🦥🐁🐀🐿🦔'.split(/(?<=\p{Emoji})/u).filter(Boolean),
  },
  {
    label: 'Food',
    icon: '🍎',
    emojis: '🍎🍊🍋🍇🍓🫐🍈🍑🍒🍌🍍🥭🥥🥝🍅🥑🍆🥦🥬🥒🌽🌶🫑🧄🧅🥔🍠🥐🥖🍞🥨🧀🥚🍳🧆🥞🧇🥓🥩🍗🍖🦴🌭🍔🍟🍕🫓🥪🥙🌮🌯🫔🥗🍝🍜🍛🍣🍱🍤🦪🍙🍘🥫🧂🍿🍦🍧🍨🍰🎂🍮🧁🍭🍬🍫🍩🍪☕🍵🧋🍺🍻🥂🍷'.split(/(?<=\p{Emoji})/u).filter(Boolean),
  },
  {
    label: 'Sports',
    icon: '⚽',
    emojis: '⚽🏀🏈⚾🥎🎾🏐🏉🎱🏓🏸🏒🥍🏑🥏🪃🎿⛷🏂🪂🤸🏊🚴🏋️🤼🤺🎯🎳🎮🕹🎲♟🃏🎴🀄🎭🎨🖼🎪🎢🎡🎠🎟🎫'.split(/(?<=\p{Emoji})/u).filter(Boolean),
  },
  {
    label: 'Nature',
    icon: '🌸',
    emojis: '🌸🌺🌻🌹🌷🌼💐🍀🌿🌱🌲🌳🌴🪴🍄🐚🪸🌊🌋🏔⛰🗻🏕🌅🌄🌠💫⭐🌟✨🌙☀️🌈☁️⛅🌤🌥🌦🌧⛈🌩🌨❄️🌬💨💧💦🌊'.split(/(?<=\p{Emoji})/u).filter(Boolean),
  },
  {
    label: 'Objects',
    icon: '💎',
    emojis: '💎💍👑🏆🥇🎖🎗🎀🎁🎊🎉🪄🔮🪬🧿🔭🔬💡🕯🪔🧲🔑🗝⚔️🛡🪝🔧🔨⛏🪛🔩🪤🧰🪣🧴🧹🧺🧻📱💻🖥🖨⌨🖱🖲💾📡📷📸🎥🎬🎙🎚🎛🎤🎧📻📺🎷🎸🎹🎺🎻🪕🥁🪘'.split(/(?<=\p{Emoji})/u).filter(Boolean),
  },
]

export function AvatarPicker({ value, onChange, disabled = false }: Props) {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  function handleSelect(emoji: string) {
    onChange(emoji)
    setOpen(false)
  }

  function handleClear() {
    onChange('')
    setOpen(false)
  }

  const category = CATEGORIES[activeCategory]

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-label="Pick avatar emoji"
        aria-expanded={open}
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          lineHeight: 1,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {value || '🙂'}
      </button>

      {/* Popover */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 38,
            left: 0,
            zIndex: 500,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow)',
            width: 224,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Category tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border)',
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {CATEGORIES.map((cat, i) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => setActiveCategory(i)}
                title={cat.label}
                style={{
                  flex: '0 0 auto',
                  padding: '6px 8px',
                  border: 'none',
                  borderBottom: activeCategory === i ? '2px solid var(--accent)' : '2px solid transparent',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 16,
                  lineHeight: 1,
                  opacity: activeCategory === i ? 1 : 0.55,
                  transition: 'opacity 0.15s',
                }}
              >
                {cat.icon}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 2,
              padding: 6,
              maxHeight: 180,
              overflowY: 'auto',
            }}
          >
            {/* No avatar option */}
            <button
              type="button"
              onClick={handleClear}
              title="No avatar"
              style={{
                border: '1px solid var(--border)',
                borderRadius: 5,
                background: value === '' ? 'var(--accent)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                fontSize: 12,
                padding: '3px 0',
                color: value === '' ? '#fff' : 'var(--text-muted)',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>

            {category?.emojis.map((emoji, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(emoji)}
                title={emoji}
                style={{
                  border: '1px solid transparent',
                  borderRadius: 5,
                  background: value === emoji ? 'var(--accent)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: 18,
                  padding: '2px 0',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (value !== emoji) {
                    e.currentTarget.style.background = 'var(--bg-card)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== emoji) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
