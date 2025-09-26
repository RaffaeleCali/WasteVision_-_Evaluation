import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import Styles from './ConfigModal.module.css'
import cardStyles from '../components/Card.module.css'
import Card from '../components/Card'
import { Cog } from 'lucide-react'

export default function ConfigModal({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [local, setLocal] = useState({})
  const initialRef = useRef(value || {})
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  useEffect(() => {
    if (open) {
      setLocal({})
      initialRef.current = value || {}
    }
  }, [open, value])

  const setField = (k, v) => setLocal(prev => ({ ...prev, [k]: v }))
  const view = (k) => (k in local) ? local[k] : initialRef.current?.[k]

  const handleSave = () => {
    const patch = { ...local }
    // Se un campo toccato è tornato uguale all’iniziale, non inviarlo
    for (const k of Object.keys(patch)) {
      if (Object.is(patch[k], initialRef.current[k])) delete patch[k]
    }
    onChange(patch)      // SOLO modificati
    setOpen(false)
  }

  return (
    <div>
      <button onClick={() => setOpen(true)} className={Styles.openButton}>
        Settings
      </button>
      <Dialog open={open} onClose={() => {}} className="relative z-10">
        <DialogBackdrop transition className={Styles.dialogBackdrop} />
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 sm:items-center sm:p-0">
            <DialogPanel className={Styles.dialogPanel}>
              <Card title="Settings" className={cardStyles.card_full} icon={<Cog />}>

                {/* Temperature */}
                <div className={cardStyles.form_group}>
                  <label className={cardStyles.form_label}>Temperature</label>
                  <input
                    type="range" min={0} max={2} step={0.01}
                    defaultValue={value?.temperature}
                    onChange={e => setField('temperature', parseFloat(e.target.value))}
                  />
                  <span>{view('temperature') !== undefined ? view('temperature').toFixed(2) : '—'}</span>
                </div>

                {/* Top P */}
                <div className={cardStyles.form_group}>
                  <label className={cardStyles.form_label}>Top P</label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    defaultValue={value?.top_p}
                    onChange={e => setField('top_p', parseFloat(e.target.value))}
                  />
                  <span>
                    {view('top_p') !== undefined ? Number(view('top_p')).toFixed(2) : '—'}
                  </span>
                </div>

                {/* Top K */}
                <div className={cardStyles.form_group}>
                  <label className={cardStyles.form_label}>Top K</label>
                  <input
                    type="number" min={1}
                    defaultValue={value?.top_k}
                    onChange={e => setField('top_k', parseInt(e.target.value))}
                  />
                </div>

                {/* Max tokens */}
                <div className={cardStyles.form_group}>
                  <label className={cardStyles.form_label}>Max Tokens</label>
                  <input
                    type="number"
                    min={1}
                  //  max={8192}         
                    step={1}
                    defaultValue={value?.max_tokens}
                    onChange={e => {
                      const raw = e.target.value;
                      const n = parseInt(raw, 10);
                      if (Number.isFinite(n)) {
                        // evita negativi/zero e limiti oltre max
                        setField('max_tokens', clamp(n, 1, 8192));
                      }
                      // se l’utente svuota il campo, NON settiamo nulla:
                      // così non inviamo un patch "vuoto" o NaN.
                    }}
                  />
                  <span>{view('max_tokens') ?? '—'}</span>
                </div>

                {/* Presence penalty */}
                <div className={cardStyles.form_group}>
                  <label className={cardStyles.form_label}>Presence Penalty</label>
                  <input
                    type="range" min={-2} max={2} step={0.01}
                    defaultValue={value?.presence_penalty}
                    onChange={e => setField('presence_penalty', parseFloat(e.target.value))}
                  />
                  <span>{view('presence_penalty') !== undefined ? view('presence_penalty').toFixed(2) : '—'}</span>
                </div>

                {/* Frequency penalty */}
                <div className={cardStyles.form_group}>
                  <label className={cardStyles.form_label}>Frequency Penalty</label>
                  <input
                    type="range" min={-2} max={2} step={0.01}
                    defaultValue={value?.frequency_penalty}
                    onChange={e => setField('frequency_penalty', parseFloat(e.target.value))}
                  />
                  <span>{view('frequency_penalty') !== undefined ? view('frequency_penalty').toFixed(2) : '—'}</span>
                </div>

                <div className={cardStyles.actions}>
                  <button className={cardStyles.button} onClick={() => setOpen(false)}>Close</button>
                  <button className={cardStyles.button} onClick={handleSave}>Save</button>
                </div>
              </Card>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
