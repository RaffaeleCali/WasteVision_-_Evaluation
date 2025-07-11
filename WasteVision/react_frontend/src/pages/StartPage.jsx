import React, { useEffect, useState } from 'react';
import styles from './StartPage.module.css';
import cardStyles from '../components/Card.module.css';
import Card from '../components/Card'; 
import { ImageUp } from 'lucide-react';

const StartPage = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Card title="Upload Image" icon={<ImageUp />}>
        <div className={cardStyles.image}>
        </div>
      </Card>
    </div>
  );
};

export default StartPage;
