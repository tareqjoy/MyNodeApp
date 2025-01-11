import React from 'react';
import styles from './Card.module.css';  // Optional CSS module for styling

// Define the type for props
interface CardProps {
    username: string;
    post: string;
    time: string;
}

const Card: React.FC<CardProps> = ({ username, post, time }) => {
    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <span className={styles.username}>{username}</span>
                <span className={styles.time}>{time}</span>
            </div>
            <div className={styles.content}>
                <p>{post}</p>
            </div>
        </div>
    );
};

export default Card;