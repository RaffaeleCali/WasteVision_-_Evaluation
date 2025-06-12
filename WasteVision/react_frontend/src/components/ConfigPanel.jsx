import React, { useState, useEffect } from 'react';

import { Snackbar, Alert } from '@mui/material'; 

import { Select, MenuItem, FormControl, InputLabel, TextField, Button } from '@mui/material';
import './ConfigPanel.css';

const HOST_OPTIONS = ['openai', 'google', 'ollama'];
const MODELS = {
  openai: ['gpt-4o', 'gpt-3.5-turbo'],
  google: ['gemini-2.5-flash-preview-04-17', 'gemini-flash'],
  ollama: ['llava:v1.6','qwen3:8b-q8_0']
};

const ConfigPanel = ({ setConfig, setBlocked }) => {
  const [host, setHost] = useState('openai');
  const [model, setModel] = useState(MODELS['openai'][0]);
  const [api_key, setApiKey] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [prompt, setPrompt] = useState('');
  const loadConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data) {
        setHost(data.host || 'openai');
        setModel(data.model || MODELS[data.host || 'openai'][0]);
        setApiKey(data.api_key || '');
        setPrompt(data.prompt || '');
      }
    } catch (err) {
      console.error("Error loading configuration:", err);
    }
  };
  useEffect(() => {
    loadConfig();
  }, []);
    
  
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  const handleSave = async () => {
    const cfg = { host, model, api_key, prompt };
  
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cfg)
      });
  
      setSnackbar({ open: true, message: 'Configuration saved successfully', severity: 'success' });
  
      // 🔁 Reload the configuration just saved from the backend
      const res = await fetch('/api/config');
      const updatedConfig = await res.json();
  
      // 🔁 Use the object actually saved to update the parent (InfoPage)
      setConfig(updatedConfig);
      setBlocked(false);
  
      // 🔁 Also update local fields in the panel, in case the backend modified something
      setHost(updatedConfig.host || 'openai');
      setModel(updatedConfig.model || MODELS[updatedConfig.host || 'openai'][0]);
      setApiKey(updatedConfig.api_key || '');
      setPrompt(updatedConfig.prompt || '');
  
    } catch (error) {
      console.error('Error saving configuration:', error);
      setSnackbar({ open: true, message: 'Error saving configuration', severity: 'error' });
    }
  };
  
  const inputStyle = {
    color: 'var(--text-dark)'
  };

  return (
    <>
        <div className="config-panel-container">
        <h3 className="title">Model Configuration</h3>

        <FormControl fullWidth className="form-field">
            <InputLabel id="host-label" style={inputStyle}>Host</InputLabel>
            <Select
            labelId="host-label"
            value={host}
            label="Host"
            onChange={(e) => {
                const newHost = e.target.value;
                setHost(newHost);
                setModel(MODELS[newHost][0]);
            }}
            sx={{ color: 'var(--text-dark)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--text-dark)' } }}
            >
            {HOST_OPTIONS.map(h => (
                <MenuItem key={h} value={h}>{h}</MenuItem>
            ))}
            </Select>
        </FormControl>

        <FormControl fullWidth className="form-field">
            <InputLabel id="model-label" style={inputStyle}>Model</InputLabel>
            <Select
            labelId="model-label"
            value={model}
            label="Model"
            onChange={(e) => setModel(e.target.value)}
            sx={{ color: 'var(--text-dark)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--text-dark)' } }}
            >
            {MODELS[host].map(m => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
            ))}
            </Select>
        </FormControl>

        <TextField
            label="API Key"
            variant="outlined"
            value={api_key}
            onChange={(e) => setApiKey(e.target.value)}
            className="form-field"
            fullWidth
            slotProps={{
                input: {
                style: inputStyle
                },
                inputLabel: {
                style: inputStyle
                }
            }}
            sx={{ color: 'var(--text-dark)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--text-dark)' } }}
        />
        <TextField
            label="Custom Prompt"
            multiline
            minRows={3}
            maxRows={12}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="form-field"
            fullWidth
            placeholder="Enter an optional custom prompt..."
            slotProps={{
                input: {
                style: inputStyle
                },
                inputLabel: {
                style: inputStyle
                }
            }}
            sx={{
                color: 'var(--text-dark)',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--text-dark)' },
            }}
            />


        <Button variant="contained" onClick={handleSave} className="save-button">
            Save Configuration
        </Button>
        </div>
        <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
            <Alert severity={snackbar.severity} onClose={handleCloseSnackbar}>
                {snackbar.message}
            </Alert>
        </Snackbar>

    </>
  );
};

export default ConfigPanel;
