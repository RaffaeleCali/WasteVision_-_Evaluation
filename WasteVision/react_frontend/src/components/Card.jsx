import React from 'react';
import PropTypes from 'prop-types';
import styles from './Card.module.css';

const Card = (props) => {
    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <a className={styles.title}>
                    <span className={styles.icon}>{props.icon}</span>
                    <span className={styles.text}>{props.title}</span>
                </a>
            </div>
            <div className={styles.content}>
                {props.children}
            </div>
        </div>
    );
}

Card.propTypes = {
    title: PropTypes.string.isRequired,
    icon: PropTypes.node.isRequired,
    children: PropTypes.node.isRequired,
};

export default Card;