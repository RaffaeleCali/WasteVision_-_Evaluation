import { useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import Styles from './ConfigModal.module.css'

import cardStyles from '../components/Card.module.css';
import Card from '../components/Card';
import { Cog, ImageUp } from 'lucide-react';

export default function ConfigModal() {
  const [open, setOpen] = useState(false)
  
  const [temperature, setTemperature] = useState(1.0)
  const [maxTokens, setMaxTokens] = useState(1024)
  const [presencePenalty, setPresencePenalty] = useState(0.0)
  const [frequencyPenalty, setFrequencyPenalty] = useState(0.0)

  const [topP, setTopP] = useState(1.0)
  const [topK, setTopK] = useState(50)  
  const [useDlvk, setUseDlvk] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className={Styles.openButton}
      >
        Settings
      </button>
      <Dialog open={open} onClose={setOpen} className="relative z-10">
        <DialogBackdrop
          transition
          className={Styles.dialogBackdrop}
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className={Styles.dialogPanel}
            >
              <Card title="Settings" className={cardStyles.card_full} icon={<Cog />}>
                <div className={cardStyles.form_group_row}>
                  <div className={cardStyles.form_group_column}>
                    <div className={cardStyles.form_group}>
                      <label htmlFor="temperature" className={cardStyles.form_label}>
                      Temperature (0.0 - 2.0)
                      </label>
                      <div className={cardStyles.slider_center}>
                        <input
                          id="temperature"
                          name="temperature"
                          type="range"
                          min={0.0}
                          max={2.0}
                          step={0.01}
                          value={temperature}
                          onChange={e => setTemperature(parseFloat(e.target.value))}
                          className={cardStyles.input}
                        />
                        <span>{temperature.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className={cardStyles.form_group}>
                      <label htmlFor="top_p" className={cardStyles.form_label}>
                      Top P (0.0 - 1.0)
                      </label>
                      <div className="mt-2">
                        <input
                          id="top_p"
                          name="top_p"
                          type="text"
                          value={topP} 
                          onChange={e => setTopP(e.target.value)} 
                          className={cardStyles.input}
                        />
                      </div>
                    </div>

                    <div className={cardStyles.form_group}>
                      <label htmlFor="top_k" className={cardStyles.form_label}>
                      Top K (1 - ∞)
                      </label>
                      <div className="mt-2">
                        <input
                          id="top_k"
                          name="top_k"
                          type="text"
                          value={topK} 
                          onChange={e => setTopK(e.target.value)} 
                          className={cardStyles.input}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={cardStyles.form_group_column}>
                    <div className={cardStyles.form_group}>
                      <label htmlFor="max_tokens" className={cardStyles.form_label}>
                      Max Tokens (1 - context limit)
                      </label>
                      <div className={cardStyles.slider_center}>
                      <input
                          id="max_tokens"
                          name="max_tokens"
                          type="range"
                          min={1}
                          max={8192}
                          step={1}
                          value={maxTokens}
                          onChange={e => setMaxTokens(parseInt(e.target.value))}
                          className={cardStyles.input}
                      />
                      <span>{maxTokens}</span>
                      </div>
                    </div>

                    <div className={cardStyles.form_group}>
                      <label htmlFor="presence_penalty" className={cardStyles.form_label}>
                      Presence Penalty (-2.0 - 2.0)
                      </label>
                      <div className={cardStyles.slider_center}>
                      <input
                          id="presence_penalty"
                          name="presence_penalty"
                          type="range"
                          min={-2.0}
                          max={2.0}
                          step={0.01}
                          value={presencePenalty}
                          onChange={e => setPresencePenalty(parseFloat(e.target.value))}
                          className={cardStyles.input}
                      />
                      <span>{presencePenalty.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className={cardStyles.form_group}>
                      <label htmlFor="frequency_penalty" className={cardStyles.form_label}>
                      Frequency Penalty (-2.0 - 2.0)
                      </label>
                      <div className={cardStyles.slider_center}>
                      <input
                          id="frequency_penalty"
                          name="frequency_penalty"
                          type="range"
                          min={-2.0}
                          max={2.0}
                          step={0.01}
                          value={frequencyPenalty}
                          onChange={e => setFrequencyPenalty(parseFloat(e.target.value))}
                          className={cardStyles.input}
                      />
                      <span>{frequencyPenalty.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className={cardStyles.form_group_row}>
                  <label htmlFor="dlvk" className={cardStyles.form_label}>
                    <input
                      id="dlvk"
                      name="dlvk"
                      type="checkbox"
                      checked={useDlvk}
                      onChange={e => setUseDlvk(e.target.checked)}
                      className={cardStyles.input}
                    />
                    Use DLVK 
                  </label>
                </div>

                <div className={cardStyles.form_group_row}>
                  <button className={cardStyles.button} onClick={() => setOpen(false)}>
                    Close
                  </button>
                </div>
              </Card>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </div>
  )
}