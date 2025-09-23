// StartPage.jsx
import React, { useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import styles from './StartPage.module.css';
import cardStyles from '../components/Card.module.css';
import Card from '../components/Card';
import PaperPrompts from '../components/PaperPrompts';
import { Image, ImageUp, Brackets, ScanText, Terminal, PenLine, Waypoints, MonitorCog } from 'lucide-react';

// === Platform → Models mapping ===
const HOST_LABELS = {
  google: 'Google',
  openai: 'OpenAI',
  ollama: 'Ollama',
};

const MODELS_BY_HOST = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-5-2025-08-07'], // aggiorna a piacere
  google: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro'],
  ollama: ['llava:1.6', 'qwen2.5:7b', 'qwen3:8b-q8_0'],
};

const DEFAULT_HOST = 'google'; // di default Google 
const DEFAULT_MODEL = MODELS_BY_HOST[DEFAULT_HOST][0];

const StartPage = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [detectionImage, setDetectionImage] = useState(null);

  // === NEW: platform first, then models ===
  const [platform, setPlatform] = useState(DEFAULT_HOST); // 'google' | 'openai' | 'ollama'
  const [model, setModel] = useState(DEFAULT_MODEL);

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
    const nextDefault = MODELS_BY_HOST[nextHost]?.[0] ?? '';
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
      const availableModels = MODELS_BY_HOST[loadedHost] || [];
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

    setLoading(true);
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

      // compat: prova più campi possibili
      const text =
        data.output ??
        data.text ??
        data.answer ??
        data.result ??
        (typeof data === 'string' ? data : JSON.stringify(data, null, 2));

      const vis =
        data.detection_image ??
        data.segmented_image ??
        data.image ??
        null;

      setOutput(text || '');
      setDetectionImage(vis || null);
      toast.success('Prediction completed!');
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
          <div className={cardStyles.radio}>
            {MODELS_BY_HOST[platform]?.map(m => (
              <label key={m} className={cardStyles.radio_label}>
                <input
                  type="radio"
                  name="model"
                  value={m}
                  checked={model === m}
                  onChange={handleModelChange}
                />
                {m}
              </label>
            )) || <span>No models available.</span>}
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
              {detectionImage ? (
                <img src={detectionImage} alt="Detected image" className={cardStyles.image} />
              ) : ('Detection')}
            </div>
            <div className={cardStyles.image}>
              {detectionImage ? (
                <img src={detectionImage} alt="Detected image" className={cardStyles.image} />
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
            <button
              className={cardStyles.button}
              onClick={handleDetect}
              disabled={
                loading ||
                !selectedFile ||
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
