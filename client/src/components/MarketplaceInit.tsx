import React, { useState, useEffect } from 'react';
import { Button, message, Alert } from 'antd';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { AptosClient } from "aptos";
import { Loader2 } from "lucide-react";

const createClient = () => {
  const nodeUrl = process.env.REACT_APP_APTOS_NODE_URL;
  if (!nodeUrl) {
    throw new Error("REACT_APP_APTOS_NODE_URL is not defined");
  }
  return new AptosClient(nodeUrl);
};

const client = createClient();

interface MarketplaceInitializerProps {
  onInitialized?: () => void;
}

const MarketplaceInitializer: React.FC<MarketplaceInitializerProps> = ({ onInitialized }) => {
  const { connected, account } = useWallet();
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const checkInitialization = async () => {
    if (!connected) return;

    try {
      const marketplaceAddress = process.env.REACT_APP_MARKETPLACE_ADDRESS;
      const marketplaceContract = process.env.REACT_APP_MARKETPLACE_CONTRACT;
      
      if (!marketplaceAddress || !marketplaceContract) {
        throw new Error("Marketplace configuration is missing");
      }

      const response = await client.view({
        function: `${marketplaceAddress}::${marketplaceContract}::is_marketplace_initialized`,
        type_arguments: [],
        arguments: [marketplaceAddress]
      });
      
      const initialized = response[0] as boolean;
      setIsInitialized(initialized);
      if (initialized && onInitialized) {
        onInitialized();
      }
    } catch (error) {
      console.error("Error checking marketplace initialization:", error);
      setIsInitialized(false);
    }
  };

  useEffect(() => {
    checkInitialization();
  }, [connected]);

  const handleInitialize = async () => {
    if (!connected || !account) {
      message.warning("Please connect your wallet first!");
      return;
    }

    setLoading(true);
    try {
      const marketplaceAddress = process.env.REACT_APP_MARKETPLACE_ADDRESS;
      const marketplaceContract = process.env.REACT_APP_MARKETPLACE_CONTRACT;
      
      if (!marketplaceAddress || !marketplaceContract) {
        throw new Error("Marketplace configuration is missing");
      }

      const payload = {
        type: "entry_function_payload",
        function: `${marketplaceAddress}::${marketplaceContract}::initialize`,
        type_arguments: [],
        arguments: []
      };

      const transaction = {
        payload,
        options: {
          max_gas_amount: "5000"
        }
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(transaction);
      await client.waitForTransaction(response.hash);
      
      // Add delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 2000));
      await checkInitialization();
      
      message.success("Marketplace initialized successfully!");
    } catch (error) {
      console.error("Error initializing marketplace:", error);
      message.error("Failed to initialize marketplace. Please make sure you're using the account that deployed the contract.");
    } finally {
      setLoading(false);
    }
  };

  if (!connected || isInitialized) {
    return null;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '20px auto', padding: '0 16px' }}>
      <Alert
        message="Marketplace Initialization Required"
        description="The NFT marketplace needs to be initialized before it can be used."
        type="warning"
        action={
          <Button
            type="primary"
            onClick={handleInitialize}
            disabled={loading}
            icon={loading && <Loader2 style={{ animation: 'spin 1s linear infinite' }} />}
          >
            {loading ? 'Initializing...' : 'Initialize Marketplace'}
          </Button>
        }
        showIcon
      />
    </div>
  );
};

export default MarketplaceInitializer;