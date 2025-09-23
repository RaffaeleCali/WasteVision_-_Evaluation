// components/PaperPrompts.jsx
import React from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import styles from './PaperPrompts.module.css';

export default function PaperPrompts({ selectedLabel, onSelect }) {
  const [items, setItems] = React.useState([]);

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/prompts');
        if (!res.ok) throw new Error('Failed to load prompts');
        const data = await res.json();
        setItems(data?.prompts || []);
      } catch (e) {
        console.error('Error loading prompts:', e);
      }
    };
    load();
  }, []);

  return (
    <Menu as="div" className={styles.menuContainer}>
      <MenuButton className={styles.menuButton}>
        {selectedLabel || 'Prompts'}
        <ChevronDownIcon aria-hidden="true" className={styles.chevronIcon} />
      </MenuButton>

      <MenuItems transition className={styles.menuItems}>
        <div className={styles.menuItemSection}>
          {items.map((p) => (
            <MenuItem key={p.key}>
              {({ focus }) => (
                <a
                  href="#"
                  className={`${styles.menuItemLink} ${focus ? styles.menuItemLinkFocus : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelect?.(p);
                  }}
                >
                  {p.label}
                </a>
              )}
            </MenuItem>
          ))}
        </div>
      </MenuItems>
    </Menu>
  );
}
