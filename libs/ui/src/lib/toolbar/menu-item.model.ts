interface MenuItemBase {
  name: string;
  enabled: boolean;
}

export interface MenuItemIcon extends MenuItemBase {
  type: 'icon';
  active: () => boolean;
  command: () => void;
  icon: string;
}

export interface MenuItemColor extends MenuItemBase {
  type: 'color';
  command: (color: string) => void;
  color: () => {
    main: string;
    lighter: string;
  };
}

type MenuItemSelectOptions =
  | {
      type: 'text';
      name: string;
      value: string;
    }
  | {
      type: 'divider';
    }
  | {
      type: 'input';
    };

export interface MenuItemSelect extends MenuItemBase {
  type: 'select';
  active: (fontFamily: string) => boolean;
  command: (value: string) => void;
  options: MenuItemSelectOptions[];
}

export interface MenuItemDivider {
  type: 'divider';
}

export type MenuItem =
  | MenuItemIcon
  | MenuItemColor
  | MenuItemDivider
  | MenuItemSelect;
