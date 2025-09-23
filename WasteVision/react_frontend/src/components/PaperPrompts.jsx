import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import styles from './PaperPrompts.module.css';

export default function PaperPrompts() {
  return (
    <Menu as="div" className={styles.menuContainer}>
      <MenuButton className={styles.menuButton}>
        Prompts
        <ChevronDownIcon aria-hidden="true" className={styles.chevronIcon} />
      </MenuButton>

      <MenuItems
        transition
        className={styles.menuItems}
      >
        <div className={styles.menuItemSection}>
          <MenuItem>
            {({ focus }) => (
              <a href="#" className={`${styles.menuItemLink} ${focus ? styles.menuItemLinkFocus : ''}`}>
                Prompt 1
              </a>
            )}
          </MenuItem>
          <MenuItem>
            {({ focus }) => (
              <a href="#" className={`${styles.menuItemLink} ${focus ? styles.menuItemLinkFocus : ''}`}>
                Prompt 2
              </a>
            )}
          </MenuItem>
        </div>
        <div className={styles.menuItemSection}>
          <MenuItem>
            {({ focus }) => (
              <a href="#" className={`${styles.menuItemLink} ${focus ? styles.menuItemLinkFocus : ''}`}>
                Prompt 3
              </a>
            )}
          </MenuItem>
          <MenuItem>
            {({ focus }) => (
              <a href="#" className={`${styles.menuItemLink} ${focus ? styles.menuItemLinkFocus : ''}`}>
                Prompt 4 
              </a>
            )}
          </MenuItem>
        </div>
        <div className={styles.menuItemSection}>
          <MenuItem>
            {({ focus }) => (
              <a href="#" className={`${styles.menuItemLink} ${focus ? styles.menuItemLinkFocus : ''}`}>
                Prompt 5
              </a>
            )}
          </MenuItem>
          <MenuItem>
            {({ focus }) => (
              <a href="#" className={`${styles.menuItemLink} ${focus ? styles.menuItemLinkFocus : ''}`}>
                Prompt 6 
              </a>
            )}
          </MenuItem>
        </div>
      </MenuItems>
    </Menu>
  );
}
