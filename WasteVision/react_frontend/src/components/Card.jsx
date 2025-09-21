import React from 'react';
import PropTypes from 'prop-types';
import styles from './Card.module.css';

const Card = (props) => {
    const cardClassName = props.className ? `${styles.card} ${props.className}` : styles.card;
    
    const renderHeader = () => {
        if (props.header) {
            return props.header;
        }
        
        return (
            <div className={styles.header}>
                <a className={styles.title}>
                    <span className={styles.icon}>{props.icon}</span>
                    <span className={styles.text}>{props.title}</span>
                </a>
            </div>
        );
    };
    
    return (
        <div className={cardClassName}>
            {renderHeader()}
            <div className={styles.content}>
                {props.children}
            </div>
        </div>
    );
}

Card.propTypes = {
    title: PropTypes.string,
    icon: PropTypes.node,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    header: PropTypes.node,
};

export default Card;