'use client'

import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'

interface ChatMessage {
  id: string
  fromUid: string
  text: string
  createdAt: any
  filtered: boolean
}

// Bloquea teléfonos, emails, Instagram, WhatsApp, etc.
const CONTACT_PATTERN =
  /(\d[\s\-.]?){7,}|@[\w.]+|instagram|whatsapp|telegram|facebook|gmail|hotmail|yahoo|\.com/i

function filterMessage(text: string): string {
  return text.replace(CONTACT_PATTERN, '***')
}

interface ServiceChatProps {
  serviceId: string
  otherUserName: string
}

export function ServiceChat({ serviceId, otherUserName }: ServiceChatProps) {
  const user = useAuthStore((s) => s.user)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!serviceId) return
    const q = query(
      collection(db, 'chats', serviceId, 'messages'),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage))
    })
    return unsub
  }, [serviceId])

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  async function handleSend() {
    if (!text.trim() || !user) return
    setSending(true)
    try {
      const filtered = filterMessage(text.trim())
      await addDoc(collection(db, 'chats', serviceId, 'messages'), {
        fromUid: user.uid,
        text: filtered,
        filtered: filtered !== text.trim(),
        createdAt: serverTimestamp(),
      })
      setText('')
    } catch {
      // silencioso
    } finally {
      setSending(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const unread = messages.filter((m) => m.fromUid !== user?.uid).length

  return (
    <>
      {/* Botón flotante para abrir el chat */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="relative w-12 h-12 bg-primary rounded-full shadow-lg flex items-center justify-center text-white text-xl hover:bg-primary/90 transition-colors"
        >
          💬
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {unread}
            </span>
          )}
        </button>
      )}

      {/* Panel de chat */}
      {open && (
        <div className="w-full bg-background rounded-2xl border border-border shadow-xl flex flex-col overflow-hidden" style={{ maxHeight: 320 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
            <div>
              <p className="font-semibold text-sm">Chat con {otherUserName}</p>
              <p className="text-xs text-muted-foreground">Solo durante el servicio</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Podés escribirle a {otherUserName}
              </p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.fromUid === user?.uid
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3 py-1.5 rounded-2xl text-sm ${
                      isMe
                        ? 'bg-primary text-white rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}>
                      {msg.text}
                      {msg.filtered && (
                        <span className="block text-[10px] opacity-60 mt-0.5">
                          (dato de contacto ocultado)
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escribí un mensaje..."
              className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={300}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="shrink-0"
            >
              →
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
