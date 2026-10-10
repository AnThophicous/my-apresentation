import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { contact } from '../content';
import { Magnetic } from './fx';

const spring = { type: 'spring', stiffness: 260, damping: 24 };

function BouncyTitle({ text }) {
  return (
    <h2 className="contact-title" aria-label={text}>
      {text.split(' ').map((word, wi, words) => {
        const offset = words.slice(0, wi).join(' ').length + (wi ? 1 : 0);
        return (
          <span className="ct-w" key={wi} aria-hidden>
            {word.split('').map((ch, i) => (
              <motion.span
                key={i}
                className="ct-l"
                initial={{ y: '100%', opacity: 0 }}
                whileInView={{ y: '0%', opacity: 1 }}
                viewport={{ once: true }}
                transition={{ ...spring, delay: (offset + i) * 0.03 }}
                whileHover={{ y: -18, transition: { type: 'spring', stiffness: 500, damping: 9 } }}
              >
                {ch}
              </motion.span>
            ))}
          </span>
        );
      })}
    </h2>
  );
}

function Typing() {
  return (
    <span className="typing" aria-label="digitando">
      <i />
      <i />
      <i />
    </span>
  );
}

export default function Contact() {
  const [msgs, setMsgs] = useState([{ from: 'me', text: contact.greeting }]);
  const [topic, setTopic] = useState(null);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const choose = (t) => {
    if (topic) return;
    setTopic(t);
    setMsgs((m) => [...m, { from: 'you', text: t.label }]);
    later(() => setTyping(true), 350);
    later(() => {
      setTyping(false);
      setMsgs((m) => [...m, { from: 'me', text: t.reply }]);
    }, 1500);
  };

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const subject = `${topic ? topic.label : 'Oi'}, via site${name ? ` (${name})` : ''}`;
    const body = `${text.trim()}\n\n- ${name || 'alguém que puxou a linha'}`;
    window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setMsgs((m) => [...m, { from: 'you', text: text.trim() }]);
    setText('');
    setSent(true);
    later(() => setTyping(true), 400);
    later(() => {
      setTyping(false);
      setMsgs((m) => [...m, { from: 'me', text: contact.thanks }]);
    }, 1700);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contact.email);
    } catch {
      setCopied(false);
    }
    setCopied(true);
    later(() => setCopied(false), 1800);
  };

  return (
    <div className="contact" id="converse">
      <span className="eyebrow">{contact.eyebrow}</span>
      <BouncyTitle text={contact.title} />
      <p className="contact-lede">{contact.lede}</p>

      <div className="chat">
        <div className="chat-head">
          <span className="chat-avatar">B</span>
          <div>
            <strong>Brenno</strong>
            <span className="chat-status">
              <i /> geralmente responde rápido
            </span>
          </div>
        </div>
        <div className="chat-body">
          <AnimatePresence initial={false}>
            {msgs.map((m, i) => (
              <motion.div
                key={i}
                className={`bubble bubble--${m.from}`}
                initial={{ opacity: 0, y: 16, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={spring}
                layout
              >
                {m.text}
              </motion.div>
            ))}
            {typing && (
              <motion.div
                key="typing"
                className="bubble bubble--me"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Typing />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!topic && (
          <div className="chips">
            {contact.topics.map((t, i) => (
              <motion.button
                key={t.label}
                className="chip"
                onClick={() => choose(t)}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring, delay: 0.3 + i * 0.07 }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.94 }}
                data-cursor="escolher"
              >
                {t.label}
              </motion.button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {topic && !typing && msgs.length >= 3 && (
            <motion.form
              className="composer"
              onSubmit={send}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
            >
              <input
                className="field field--name"
                placeholder="seu nome (opcional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Seu nome"
              />
              <div className="composer-row">
                <textarea
                  className="field"
                  rows={2}
                  placeholder={contact.placeholder}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  aria-label="Mensagem"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) send(e);
                  }}
                />
                <Magnetic as="button" type="submit" className="send" strength={0.4} data-cursor="enviar" disabled={!text.trim()}>
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                    <path d="M4 12h14M13 6l6 6-6 6" />
                  </svg>
                </Magnetic>
              </div>
              {sent && <p className="composer-note">Seu app de e-mail abriu com a mensagem pronta. É só enviar.</p>}
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <div className="mail">
        <a className="mail-link" href={`mailto:${contact.email}`} data-cursor="escrever">
          {contact.email}
        </a>
        <Magnetic as="button" className="pill" onClick={copy} data-cursor="copiar">
          <AnimatePresence mode="wait">
            <motion.span
              key={copied ? 'ok' : 'copy'}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
            >
              {copied ? 'copiado ✓' : 'copiar e-mail'}
            </motion.span>
          </AnimatePresence>
        </Magnetic>
      </div>
    </div>
  );
}
