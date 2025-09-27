// StartPage.jsx
import React, { useRef, useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import styles from './StartPage.module.css';
import cardStyles from '../components/Card.module.css';
import Card from '../components/Card';
import PaperPrompts from '../components/PaperPrompts';
import ConfigModal from '../components/ConfigModal';
import { Image, ImageUp, Brackets, ScanText, Terminal, PenLine, Waypoints, MonitorCog } from 'lucide-react';

// === Platform → Models mapping ===
const HOST_LABELS = {
  google: 'Google',
  openai: 'OpenAI',
  ollama: 'Ollama',
};

const DEFAULT_HOST = 'google'; // di default Google 

const StartPage = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [detectionImage, setDetectionImage] = useState(null);

  // === NEW: platform first, then models ===
  const [platform, setPlatform] = useState(DEFAULT_HOST); // 'google' | 'openai' | 'ollama'

  const [model, setModel] = useState("");

  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [config, setConfig] = useState(null);

  // API keys gestite separatamente e salvate in base alla piattaforma scelta
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');

  // IMG
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [objectUrl, setObjectUrl] = useState(null);
  // prompt selezionato da PaperPrompts
  const [selectedPromptName, setSelectedPromptName] = useState(null);


  // Nessun default: lasciamo vuoto. Sarà il backend a decidere i default reali.
  const [llmParams, setLlmParams] = useState({});
  // Conserveremo qui SOLO i campi toccati dall’utente (il “patch”)
  const [llmParamsPatch, setLlmParamsPatch] = useState({});

  const [dlvk, setDlvk] = useState(false);


  // === MODELS DYNAMIC ===
  const [modelsByHost, setModelsByHost] = useState({ openai: [], google: [], ollama: [] });
  const [modelWarnings, setModelWarnings] = useState({});
  const [modelsLoading, setModelsLoading] = useState(true);

  const fetchModels = async (force=false) => {
    try {
      setModelsLoading(true);
      const res = await fetch(`api/models${force ? '?force_refresh=true' : ''}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setModelsByHost(data.models_by_host || { openai: [], google: [], ollama: [] });
      setModelWarnings(data.warnings || {});
    } catch (e) {
      console.error(e);
      toast.error('Unable to load models list.');
    } finally {
      setModelsLoading(false);
    }
  };

  useEffect(() => { fetchModels(false); }, []);

    // se i modelli cambiano, fai rispettare un modello valido per la platform corrente
  useEffect(() => {
    const list = modelsByHost[platform] || [];
    if (!list.includes(model)) {
      setModel(list[0] || '');
    }
  }, [modelsByHost, platform]); 
  
  
  
  // seconda immagine (es. segmentazione/overlay) opzionale
  const [segmentationImage, setSegmentationImage] = useState(null);

// converte in qualcosa che <img> può usare
  const toDisplayableImage = (img) => {
    if (!img) return null;
    if (typeof img === 'string') {
      if (img.startsWith('data:') || img.startsWith('http')) return img;
      // se è base64 "nudo"
      return `data:image/png;base64,${img}`;
    }
    // forma { base64, mime? }
    if (img && typeof img === 'object' && img.base64) {
      const mime = img.mime || 'image/png';
      return `data:${mime};base64,${img.base64}`;
    }
    return null;
  };


  const fileInputRef = useRef(null);
  React.useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);


  const handleImageSelect = () => fileInputRef.current?.click();
  
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // libera l'eventuale object URL precedente
    if (objectUrl) URL.revokeObjectURL(objectUrl);

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setSelectedImage(url);     // preview
    setObjectUrl(url);
    setOutput('');
    setDetectionImage(null);
  };


  // quando cambia Platform, aggiorno la lista modelli e seleziono il primo disponibile
  const handlePlatformChange = (e) => {
    const nextHost = e.target.value;
    setPlatform(nextHost);
    const nextDefault = (modelsByHost[nextHost] && modelsByHost[nextHost][0]) || '';
    setModel(nextDefault);
  };


  const handleModelChange = (e) => setModel(e.target.value);

  const handlePromptChange = (e) => setPrompt(e.target.value);
  const handleOutputChange = (e) => setOutput(e.target.value);

  // === Salvataggio config coerente con Pydantic ModelConfig (host, model, api_key, prompt, dlvk) ===
  const saveCurrentConfig = async () => {
    // prendo l’API key in base alla piattaforma selezionata
    const apiKey =
      platform === 'google' ? googleApiKey :
      platform === 'openai' ? openaiApiKey :
      '';

    const body = {
      host: platform,      // 'google' | 'openai' | 'ollama'
      model,               // modello selezionato
      api_key: apiKey || null,
      prompt: prompt || null,
      dlvk: false,         // mantengo il campo previsto dal backend (se ti serve lo abiliti in UI)
    };

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        toast.error('Failed to save configuration.');
        return;
      }
      const saved = await res.json().catch(() => body);
      setConfig(saved);
      toast.success('Configuration saved successfully!');
    } catch (err) {
      console.error('Error saving config:', err);
      toast.error('Error saving configuration.');
    }
  };

  const loadLastConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) {
        toast.error('Failed to load configuration.');
        return;
      }
      const data = await res.json();

      if (!data) {
        toast.error('No saved configuration found.');
        return;
      }

      // mappo i vecchi campi eventuali (backward compat)
      const loadedHost = data.host ?? data.platform ?? DEFAULT_HOST;
      const availableModels = modelsByHost[loadedHost] || [];
      const loadedModel = availableModels.includes(data.model) ? data.model : (availableModels[0] || '');

      setPlatform(loadedHost);
      setModel(loadedModel);
      setPrompt(data.prompt || '');

      // carico l’api_key nel campo giusto se presente
      if (loadedHost === 'google') setGoogleApiKey(data.api_key || '');
      if (loadedHost === 'openai') setOpenaiApiKey(data.api_key || '');

      setConfig(data);
      toast.success('Configuration loaded successfully!');
    } catch (err) {
      console.error('Error loading config:', err);
      toast.error('Error loading configuration.');
    }
  };

  const loadDefaultPrompt = () => {
    // prompt generico sensato per task multimodale
    const generic = 'Analyze the uploaded image and provide a concise, structured explanation of the key elements you detect. If food waste is visible, estimate the percentage of waste and list items considered waste.';
    setPrompt(generic);
  };

  //img  upload
  const handleSelectPrompt = (p) => {
    setSelectedPromptName(p.label);
    setPrompt(p.text); // mostra il testo del prompt scelto nella textarea
  };


  const handleDetect = async () => {
    if (!selectedFile) {
      toast.error("Please upload an image first.");
      return;
    }

    // prendo la key coerente con la piattaforma selezionata (se serve)
    const apiKey =
      platform === 'google' ? googleApiKey :
      platform === 'openai' ? openaiApiKey :
      '';

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append("config_json", JSON.stringify({
      host: platform,
      model,
      api_key: apiKey || null,
      prompt: prompt || null,
      dlvk: dlvk || false,
      params: llmParamsPatch,   
    }));
    //setLoading(true);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || 'Prediction failed.');
      }

      const data = await res.json();
      console.log("PREDICT RESPONSE", data); // <-- utile per verificare

      // se result è un oggetto, lo uso; altrimenti null
      const resultObj =
        data && typeof data.result === "object" && data.result !== null
          ? data.result
          : null;

      // testo: prendo la prima stringa disponibile
      const textCandidates = [
        data.output,
        data.text,
        data.answer,
        resultObj?.output,
        resultObj?.text,
        resultObj?.answer,
        typeof data.result === "string" ? data.result : null,
      ];
      const firstString = textCandidates.find((v) => typeof v === "string" && v.trim().length > 0);
      const text = firstString ?? JSON.stringify(data, null, 2);

      // immagini: YOLO overlay e (opzionale) segmentazione
      const detRaw =
        resultObj?.detection_image ??
        resultObj?.image ??
        data.detection_image ??
        data.image ??
        null;
      const segRaw =
        resultObj?.segmented_image ??
        resultObj?.segmentation_image ??
        data.segmented_image ??
        data.segmentation_image ??
        null;

      const detUri = toDisplayableImage(detRaw);
      const segUri = toDisplayableImage(segRaw);

      setOutput(text || "");
      setDetectionImage(detUri || null);
      setSegmentationImage(segUri || null);
      setLlmParamsPatch({});
      toast.success("Prediction completed!");

    } catch (err) {
      console.error('Error during prediction:', err);
      toast.error(err.message || 'Error during prediction.');
    } finally {
      setLoading(false);
      // rigenera l’object URL per forzare refresh immagine se serve
      if (selectedFile) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        const url = URL.createObjectURL(selectedFile);
        setSelectedImage(url);
        setObjectUrl(url);
      }
    }
  };
   const handleParamsPatch = (patch) => {
    if (!patch || Object.keys(patch).length === 0) return;
    // Aggiorno la UI locale 
    setLlmParams(prev => ({ ...prev, ...patch }));
    // Salvo il SOLO diff da inviare al backend
    setLlmParamsPatch(patch);
  };

  return (
    <div className={styles.frame}>
      <Toaster position="top-center" reverseOrder={false} />

      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Multimodal Food Waste Detection in Canteen Plates with Large Language Models
          </h1>
        </div>
      </div>

      <div className={styles.content}>
        <Card title="Upload Image" icon={<ImageUp />}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          <div className={cardStyles.image} onClick={handleImageSelect}>
            {selectedImage ? (
              <img src={selectedImage} alt="Image preview" className={cardStyles.image} />
            ) : ('Upload an image')}
          </div>
        </Card>

        {/* === Platform FIRST === */}
        <Card title="Platform" icon={<ScanText />}>
          <div className={cardStyles.radio}>
            {(['google', 'openai', 'ollama']).map(h => (
              <label key={h} className={cardStyles.radio_label}>
                <input
                  type="radio"
                  name="platform"
                  value={h}
                  checked={platform === h}
                  onChange={handlePlatformChange}
                />
                {HOST_LABELS[h]}
              </label>
            ))}
          </div>
        </Card>

        {/* === Models (ex Task Type) SECOND === */}
        <Card title="Models" icon={<Brackets />}>
          <div className={cardStyles.scrollColumn}>
            {modelsLoading ? (
              <span className={cardStyles.modelsHint}>Loading models…</span>
            ) : (modelsByHost[platform]?.length ? (
              modelsByHost[platform].map((m) => (
                <label key={m} className={cardStyles.radio_label}>
                  <input
                    type="radio"
                    name="model"
                    value={m}
                    checked={model === m}
                    onChange={handleModelChange}
                  />
                  <span className={cardStyles.ellipsis}>{m}</span>
                </label>
              ))
            ) : (
              <span className={cardStyles.modelsHint}>No models available.</span>
            ))}
          </div>

          {modelWarnings[platform] && (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
              Warning {HOST_LABELS[platform]}: {modelWarnings[platform]}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <button className={cardStyles.button} onClick={() => fetchModels(true)}>
              Refresh models
            </button>
          </div>
        </Card>


        <Card
          header={
            <div className={cardStyles.header}>
              <a className={cardStyles.title}>
                <span className={cardStyles.icon}><Terminal /></span>
                <span className={cardStyles.text}>Prompt</span>
              </a>
              {/* Menu dinamic */}
              <PaperPrompts selectedLabel={selectedPromptName} onSelect={handleSelectPrompt} />
            </div>
          }
          className={cardStyles.card_prompt}
        >
          <textarea
            className={cardStyles.prompt}
            placeholder="Enter your prompt here..."
            rows="4"
            value={prompt}
            onChange={handlePromptChange}
          />
        </Card>

      </div>

      <div className={styles.content}>
        <Card title="Detection Output" icon={<Image />}>
          <div className={cardStyles.row}>
            <div className={cardStyles.image}>
              {segmentationImage ? (
                <img src={segmentationImage} alt="Segmentation" className={cardStyles.image} />
              ) : ('Segmentation')}
            </div>
          </div>
        </Card>

        <Card title="Output" className={cardStyles.card_prompt} icon={<PenLine />}>
          <textarea
            className={cardStyles.output}
            placeholder="The LLM output will appear here..."
            rows="4"
            value={output}
            onChange={handleOutputChange}
          />
        </Card>

        <Card title="Actions" icon={<Waypoints />}>
          <div className={cardStyles.actions}>
            {/* ✅ Toggle DLVK */}
            <label className={cardStyles.checkboxLabel}>
              <input
                type="checkbox"
                checked={dlvk}
                onChange={(e) => setDlvk(e.target.checked)}
                className={cardStyles.input}
              />
              Use DLVK
            </label>


            <button
              className={cardStyles.button}
              onClick={handleDetect}
              disabled={
                loading ||
                !selectedFile ||
                !model ||
                ((platform === 'google' || platform === 'openai') && !(
                  (platform === 'google' && googleApiKey) ||
                  (platform === 'openai' && openaiApiKey)
                ))
              }
            >
              {loading ? 'Detecting…' : 'Detect'}
            </button>

            <button className={cardStyles.button} onClick={saveCurrentConfig}>
              Save current config
            </button>
            <button className={cardStyles.button} onClick={loadLastConfig}>
              Load last config
            </button>
            <ConfigModal value={llmParams} onChange={handleParamsPatch}/>
          </div>
        </Card>
      </div>

      <div className={styles.content}>
        <Card
          header={
            <div className={cardStyles.header}>
              <a className={cardStyles.title}>
                <span className={cardStyles.icon}><MonitorCog /></span>
                <span className={cardStyles.text}>Config</span>
              </a>
            </div>
          }
          className={cardStyles.small_card}
        >
          <div className={cardStyles.row}>
            {/* Google */}
            <a className={cardStyles.config_title}>Google</a>
            <div className={cardStyles.config_row}>
              <label className={cardStyles.label}>
                <span>API Key:</span>
                <input
                  type="password"
                  className={cardStyles.input}
                  placeholder="Enter API key"
                  value={googleApiKey}
                  onChange={(e) => setGoogleApiKey(e.target.value)}
                />
              </label>
            </div>

            {/* OpenAI */}
            <a className={cardStyles.config_title}>OpenAI</a>
            <div className={cardStyles.config_row}>
              <label className={cardStyles.label}>
                <span>API Key:</span>
                <input
                  type="password"
                  className={cardStyles.input}
                  placeholder="Enter API key"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                />
              </label>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StartPage;
