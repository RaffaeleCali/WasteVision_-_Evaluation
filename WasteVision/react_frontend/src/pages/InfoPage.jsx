import React, { useEffect, useState } from 'react';
import Topbar from '../components/Topbar';
import ImageUpload from '../components/ImageUpload';
import ConfigPanel from '../components/ConfigPanel';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import './InfoPage.css';

const InfoPage = () => {
  const [config, setConfig] = useState(null);
  const [blocked, setBlocked] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [savedConfig, setSavedConfig] = useState(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data && data.host && data.api_key) {
            setSavedConfig(data);
            setShowDialog(true);
          } else {
            setBlocked(true);
          }
        } else {
          setBlocked(true);
        }
      } catch (err) {
        console.error('Errore caricamento config:', err);
        setBlocked(true);
      }
    }

    fetchConfig();
  }, []);

  const handleLoadOldConfig = () => {
    setConfig(savedConfig);
    setBlocked(false);
    setShowDialog(false);
  };

  const handleNewConfig = () => {
    setConfig(null);
    setShowDialog(false);
    setBlocked(true);
  };

  const configStatusStyle = {
    border: `3px solid ${config ? 'green' : 'red'}`,
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1rem',
    backgroundColor: '#f9f9f9'
  };

  return (
    <>
      <Topbar />
      <div className="info-container">

        <Dialog open={showDialog}>
          <DialogTitle>Configuration Found</DialogTitle>
          <DialogContent>
            Do you want to load the saved configuration or create a new one?
          </DialogContent>
          <DialogActions>
            <Button onClick={handleNewConfig}>New</Button>
            <Button onClick={handleLoadOldConfig} variant="contained">Load</Button>
          </DialogActions>
        </Dialog>

        <div className="main-section">
          <div className="left-pane">
            <ImageUpload blocked={blocked} config={config} />
          </div>
          <div className={`right-pane ${config ? 'config-ok' : 'config-missing'}`}>
            <h4>Current Configuration:</h4>
            {config ? (
              <pre className='config-status'>
                {JSON.stringify(config, null, 2)}
              </pre>
            ) : (
              <p style={{ color: 'red' }}>No configuration set</p>
            )}
            <ConfigPanel setConfig={setConfig} setBlocked={setBlocked} />
          </div>
        </div>
      </div>
    </>
  );
};

export default InfoPage;
