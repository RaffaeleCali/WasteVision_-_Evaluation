import React, { useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import styles from './StartPage.module.css';
import cardStyles from '../components/Card.module.css';
import Card from '../components/Card'; 
import { Image, ImageUp, Brackets, ScanText, Terminal, PenLine, Waypoints, MonitorCog } from 'lucide-react';

const StartPage = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [detectionImage, setDetectionImage] = useState(null);
  const [taskType, setTaskType] = useState('');
  const [platform, setPlatform] = useState('');
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [config, setConfig] = useState(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [chatgptApiKey, setChatgptApiKey] = useState('');
  const fileInputRef = useRef(null);

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTaskTypeChange = (e) => {
    setTaskType(e.target.value);
  };

  const handlePlatformChange = (e) => {
    setPlatform(e.target.value);
  };

  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
  };

  const handleOutputChange = (e) => {
    setOutput(e.target.value);
  };

  const handleGeminiApiKeyChange = (e) => {
    setGeminiApiKey(e.target.value);
  };

  const handleChatgptApiKeyChange = (e) => {
    setChatgptApiKey(e.target.value);
  };

  const saveCurrentConfig = async () => {
    const configData = {
      taskType,
      platform,
      prompt,
      geminiApiKey,
      chatgptApiKey,
    };

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData),
      });

      if (response.ok) {
        setConfig(configData);
        toast.success('Configuration saved successfully!');
      } else {
        toast.error('Failed to save configuration.');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error saving configuration.');
    }
  };

  const loadLastConfig = async () => {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setTaskType(data.taskType || '');
          setPlatform(data.platform || '');
          setPrompt(data.prompt || '');
          setGeminiApiKey(data.geminiApiKey || '');
          setChatgptApiKey(data.chatgptApiKey || '');
          setPerplexityApiKey(data.perplexityApiKey || '');
          setConfig(data);
          toast.success('Configuration loaded successfully!');
        } else {
          toast.error('No saved configuration found.');
        }
      } else {
        toast.error('Failed to load configuration.');
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Error loading configuration.');
    }
  };

  const loadDefaultPrompt = () => {
    if (!taskType) {
      toast.error('Please select a task type first.');
      return;
    }

    const defaultPrompts = {
      captioning: "Describe the image in detail.",
      question_answering: "What questions can be answered from this image?",
      Rationalization: "Consider the photo of a plate after dinner or lunch {DLVK}. You want to calculate the amount of food wasted on the plate. The formula for calculating the percentage of waste corresponds to the area of objects (food) except utensils and rubbish. Waste is 100 per cent when the plate has the maximum amount of food on it. Rubbish is categorised as the type of food or objects that cannot be eaten. Calculate the percentage of waste on the plate and indicates which items are waste on the plate. Response only with the percentage of waste in the plate and the waste items.",
    };
    setPrompt(defaultPrompts[taskType] || '');
  };

  return (
    <div className={styles.frame}>
      <Toaster
        position="top-center"
        reverseOrder={false}
      />

      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Multimodal Food Waste Detection in Canteen Plates with Large Language Models</h1>
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
              <img 
                src={selectedImage} 
                alt="Image preview" 
                className={cardStyles.image}
              />
            ) : ('Upload an image')}
          </div>
        </Card>
        <Card title="Task Type" icon={<Brackets />}>
          <div className={cardStyles.radio}>
            <label className={cardStyles.radio_label}>
              <input 
                type="radio" 
                name="taskType" 
                value="captioning" 
                checked={taskType === 'captioning'}
                onChange={handleTaskTypeChange}
              />
              Captioning
            </label>
            <label className={cardStyles.radio_label}>
              <input 
                type="radio" 
                name="taskType" 
                value="question_answering" 
                checked={taskType === 'question_answering'}
                onChange={handleTaskTypeChange}
              />
              Question Answering
            </label>
            <label className={cardStyles.radio_label}>
              <input 
                type="radio" 
                name="taskType" 
                value="Rationalization" 
                checked={taskType === 'Rationalization'}
                onChange={handleTaskTypeChange}
              />
              Rationalization
            </label>
          </div>
        </Card>
        <Card title="Platform" icon={<ScanText />}>
          <div className={cardStyles.radio}>
            <label className={cardStyles.radio_label}>
              <input 
                type="radio" 
                name="platform" 
                value="gemini" 
                checked={platform === 'gemini'}
                onChange={handlePlatformChange}
              />
              Gemini
            </label>
            <label className={cardStyles.radio_label}>
              <input 
                type="radio" 
                name="platform" 
                value="chatgpt" 
                checked={platform === 'chatgpt'}
                onChange={handlePlatformChange}
              />
              ChatGPT
            </label>
            <label className={cardStyles.radio_label}>
              <input 
                type="radio" 
                name="platform" 
                value="Ollama" 
                checked={platform === 'Ollama'}
                onChange={handlePlatformChange}
              />
              Ollama
            </label>
          </div>
        </Card>
        <Card header={
          <div className={cardStyles.header}>
              <a className={cardStyles.title}>
                  <span className={cardStyles.icon}><Terminal /></span>
                  <span className={cardStyles.text}>Prompt</span>
              </a>
              <div className={cardStyles.select_container}>
                <button className={cardStyles.button} onClick={loadDefaultPrompt}>
                  Load default prompt
                </button>
              </div>
          </div>
        } className={cardStyles.card_prompt}>
            <textarea
              className={cardStyles.prompt}
              placeholder="Enter your prompt here..."
              rows="4"
              value={prompt}
              onChange={handlePromptChange}
            ></textarea>
        </Card>
      </div>

      <div className={styles.content}>
        <Card title="Detection Output" icon={<Image />}>
          <div className={cardStyles.row}>
            <div className={cardStyles.image}>
              {detectionImage ? (
                <img 
                  src={detectionImage} 
                  alt="Detected image" 
                  className={cardStyles.image}
                  />
                ) : ('Detection')}
            </div>
            <div className={cardStyles.image}>
              {detectionImage ? (
                <img 
                  src={detectionImage} 
                  alt="Detected image" 
                  className={cardStyles.image}
                />
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
            ></textarea>
        </Card>
        <Card title="Actions" icon={<Waypoints />}>
          <div className={cardStyles.actions}>
              <button className={cardStyles.button} onClick={() => console.log('TODO')}>
                Detect
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
        <Card header={
          <div className={cardStyles.header}>
              <a className={cardStyles.title}>
                  <span className={cardStyles.icon}><MonitorCog /></span>
                  <span className={cardStyles.text}>Config</span>
              </a>
          </div>
        } className={cardStyles.small_card}>
          <div className={cardStyles.row}>

            {/* Gemini */}
            <a className={cardStyles.config_title}>Gemini</a>
            <div className={cardStyles.config_row}>
              <label className={cardStyles.label}>
                <span>API Key:</span>
                <input 
                  type="password" 
                  className={cardStyles.input} 
                  placeholder="Enter API key"
                  value={geminiApiKey}
                  onChange={handleGeminiApiKeyChange}
                />
              </label>
            </div>

            {/* ChatGPT */}
            <a className={cardStyles.config_title}>ChatGPT</a>
            <div className={cardStyles.config_row}>
              <label className={cardStyles.label}>
                <span>API Key:</span>
                <input 
                  type="password" 
                  className={cardStyles.input} 
                  placeholder="Enter API key"
                  value={chatgptApiKey}
                  onChange={handleChatgptApiKeyChange}
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
