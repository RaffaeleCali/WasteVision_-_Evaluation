import React, { useRef, useState } from 'react';
import DefaultImage from "../assets/upload-photo-here.png";
import UploadingAnimation from "../assets/uploading.gif";
import './ImageUpload.css';

const ImageUpload = ({ blocked, config }) => {
  const fileInputRef = useRef();
  const [previewUrl, setPreviewUrl] = useState(DefaultImage);
  const [response, setResponse] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [objectUrl, setObjectUrl] = useState(null);
  
  
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // release the old object if it exists
    if (objectUrl) URL.revokeObjectURL(objectUrl);

    const newUrl = URL.createObjectURL(file);
    setPreviewUrl(newUrl);
    setObjectUrl(newUrl);
    setSelectedFile(file);
    setResponse(null);
  };


  const handleUploadClick = () => {
  if (!blocked && fileInputRef.current) {
    fileInputRef.current.click();
  }
  };

  const handleSubmit = async () => {
    if (!selectedFile || blocked || !config) return;

    setPreviewUrl(UploadingAnimation);
    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.api_key}`
        },
        body: formData
      });

      if (!res.ok) throw new Error("Error in the request");
      const data = await res.json();
      setResponse(data);
      setPreviewUrl(URL.createObjectURL(selectedFile)); // reset original image
    } catch (err) {
      alert("Error while sending the image.");
      setPreviewUrl(DefaultImage);
    } finally {
      setLoading(false);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      const resetUrl = URL.createObjectURL(selectedFile);  // generate new object to force refresh
      setPreviewUrl(resetUrl);
      setObjectUrl(resetUrl);
    }
  };
    

  return (
  <div className="upload-box">
    <input
    type="file"
    accept="image/*"
    ref={fileInputRef}
    hidden
    onChange={handleFileSelect}
    />
    <div className="preview-container" onClick={handleUploadClick}>
    <img
      key={previewUrl}
      src={previewUrl}
      alt="Preview"
      className="upload-preview"
    />

    {blocked && <div className="upload-overlay">Configure first</div>}
    {!blocked && !selectedFile && (
      <div className="upload-overlay">Click to select an image</div>
    )}
    </div>

    <button
    className="upload-button"
    onClick={handleSubmit}
    disabled={blocked || !selectedFile || loading}
    >
    Submit Image
    </button>

    {response && (
    <div className="upload-response">
      <h4>Model Response:</h4>
      <div className="upload-response-content">
      {typeof response === 'string'
        ? response.replace(/^"|"$/g, '')
        : JSON.stringify(response, null, 2)}
      </div>
    </div>
    )}
  </div>
  );
};

export default ImageUpload;
