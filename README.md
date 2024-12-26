# Aptos NFT Marketplace

A decentralized NFT marketplace built on the Aptos blockchain, enabling users to mint, buy, sell, and manage digital collectibles with advanced features like favoriting, filtering, and NFT transfers.

## Features

### Core Functionality

#### NFT Management
- **Mint NFTs**: Create unique digital assets with customizable properties
  - Set name, description, and image URI
  - Define rarity levels (Common, Uncommon, Rare, Epic)
  - Pay minting fee (waived for marketplace owner)

#### Trading
- **List NFTs**: Put your NFTs up for sale
  - Set custom pricing in APT
  - Automated marketplace fee handling (2%)
- **Purchase NFTs**: Buy listed NFTs directly
  - Instant ownership transfer
  - Automatic payment processing

### Additional Features

#### Transfer NFTs
- **Send NFTs to other addresses**:
  - Direct peer-to-peer transfers
  - No marketplace fees for transfers

#### Favorites System
- **Favorite NFTs**: Save NFTs to your personal favorites list
  - Add/remove favorites with one click
  - Track favorite count for each NFT
  - View all favorited NFTs in dedicated tab

#### Advanced Filtering & Sorting
- **Filter Options**:
  - By Rarity Level:
    - Common (🟢)
    - Uncommon (🔵)
    - Rare (🟣)
    - Epic (🟡)
  - By Price Range:
    - Multiple predefined ranges (0.01-10+ APT)
    - Easy-to-use dropdown selection

- **Sorting Options**:
  - Last Listed (newest first)
  - Price (low to high)
  - Price (high to low)
  - Most Favorited
 
  ## Video Demo:
https://github.com/user-attachments/assets/8bd681d7-b028-4bc1-8744-5a55b7e6cf6b

#### User Interface
- **Responsive Design**: Works seamlessly across devices
- **Visual Feedback**: Loading states and success/error messages
- **Active Filter Indicators**: Shows currently applied filters
- **Pagination**: Browse through NFTs efficiently

### Wallet Integration
- Connect with Aptos-compatible wallets
- View real-time APT balance
- Track owned NFTs in "My Collection"
- One-click wallet disconnect

## Project Structure

```
📦src
 ┣ 📂components
 ┃ ┣ 📜MarketplaceInit.tsx
 ┃ ┣ 📜NavBar.module.css
 ┃ ┣ 📜NavBar.tsx
 ┃ ┗ 📜RarityTag.tsx
 ┣ 📂pages
 ┃ ┣ 📜FavoriteNFTs.tsx
 ┃ ┣ 📜MarketView.tsx
 ┃ ┗ 📜MyNFTs.tsx
 ┣ 📂utils
 ┃ ┗ 📜utils.ts
 ┣ 📜App.css
 ┣ 📜App.test.tsx
 ┣ 📜App.tsx
 ┣ 📜index.css
 ┣ 📜index.tsx
 ┣ 📜react-app-env.d.ts
 ┣ 📜reportWebVitals.ts
 ┗ 📜setupTests.ts
```

## Technical Details

### Smart Contract Features
- Secure ownership management
- Automated fee distribution
- Favorites system implementation
- Transfer permission validation
- Price update protection

### Frontend Implementation
- React with TypeScript
- Ant Design component library
- Real-time blockchain data updates
- Optimized image loading
- Intuitive error handling

## Getting Started

### Prerequisites
* Node.js
* Aptos CLI

### Installation

1. Clone the repository
```bash
git clone https://github.com/neogr3t/aptos-nft-dapp-bounty-project.git
```

### Backend Setup
1. Navigate to backend/contracts directory
```bash
cd move contract/contracts
```

2. Initialize the Aptos Project
```bash
aptos init
```
   - Select the network to deploy (e.g., devnet, testnet)
   - Enter private key of your account

3. Compile the Smart Contract
```bash
aptos move compile
```

4. Publish the Smart Contract
```bash
aptos move publish
```

### Frontend Setup
1. Navigate to frontend directory
```bash
cd client
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env
```

4. Start the development server
```bash
npm start
```

## Security Features
- Ownership verification for transfers
- Price validation for listings
- Protected minting process
- Secure favorite system
- Transaction confirmation modals

## Support and Documentation

For detailed technical documentation and support:
- Visit the [Aptos Documentation](https://aptos.dev)
- Check out [Smart Contract Specifications](./contracts/README.md)
- Review [Frontend Documentation](./frontend/README.md)
