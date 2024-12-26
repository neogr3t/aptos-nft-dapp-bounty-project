import { Tag } from "antd"
import React from "react";

type NFT = {
  id: number;
  owner?: string;
  name: string;
  description: string;
  uri: string;
  price: number;
  for_sale: boolean;
  rarity: number;
  date_listed?: number;
};

interface RarityTagProps {
  nft: NFT;
  className?: string;
  style?: React.CSSProperties;
}

const rarityColors: { [key: number]: string } = {
  1: "green",
  2: "blue",
  3: "purple",
  4: "orange",
};

const rarityLabels: { [key: number]: string } = {
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Super Rare",
};

const rarityConfig = {
  1: {
    color: 'rgb(34, 197, 94)',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    label: 'Common',
    icon: '⚪',
  },
  2: {
    color: 'rgb(59, 130, 246)',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    label: 'Uncommon',
    icon: '🟢',
  },
  3: {
    color: 'rgb(168, 85, 247)',
    bgColor: 'rgba(168, 85, 247, 0.1)',
    label: 'Rare',
    icon: '🔵',
  },
  4: {
    color: 'rgb(249, 115, 22)',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    label: 'Super Rare',
    icon: '🟣',
  },
} as const;

const RarityTag: React.FC<RarityTagProps> = ({ nft, className = '', style }) => {
  const config = rarityConfig[nft.rarity as keyof typeof rarityConfig];
  
  return (
    <div
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${className}`}
      style={{
        color: config.color,
        backgroundColor: config.bgColor,
        ...style
      }}
    >
      <span>{config.icon}</span>
      {config.label}
    </div>
  );
};


export default RarityTag;