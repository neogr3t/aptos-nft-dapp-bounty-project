export const hexToString = (hexString: string): string => {
    if (typeof hexString !== 'string' || !hexString.startsWith('0x')) {
      return '';
    }
    const hexWithout0x = hexString.slice(2);
    const bytes = new Uint8Array(hexWithout0x.length / 2);
    for (let i = 0; i < hexWithout0x.length; i += 2) {
      bytes[i / 2] = parseInt(hexWithout0x.substr(i, 2), 16);
    }
    return new TextDecoder().decode(bytes);
  };

  export const truncateAddress = (address: string, start = 6, end = 4) => {
    return `${address.slice(0, start)}...${address.slice(-end)}`;
  };
  
  export const getRarityLabel = (rarity: number) => {
    switch (rarity) {
      case 1:
        return { label: 'Common', color: 'bg-gray-200 text-gray-700' };
      case 2:
        return { label: 'Uncommon', color: 'bg-green-200 text-green-700' };
      case 3:
        return { label: 'Rare', color: 'bg-blue-200 text-blue-700' };
      case 4:
        return { label: 'Epic', color: 'bg-purple-200 text-purple-700' };
      default:
        return { label: 'Unknown', color: 'bg-gray-200 text-gray-700' };
    }
  };