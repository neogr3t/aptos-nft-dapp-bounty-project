import { lazy, useState, Suspense } from "react";
import { Layout, Form, Input, Select, Button, message, Spin } from "antd";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { AptosClient, Types } from "aptos";

// Components
import NavBar from "./components/NavBar";
import MarketplaceInitializer from "./components/MarketplaceInit";

// Pages
import MarketView from "./pages/MarketView";
import MyNFTs from "./pages/MyNFTs";
import FavoritesView from "./pages/FavoriteNFTs";

// Types
interface NFTFormValues {
  name: string;
  description: string;
  uri: string;
  rarity: number;
}

interface AptosWindow extends Window {
  aptos?: {
    signAndSubmitTransaction: (transaction: Types.TransactionPayload) => Promise<{ hash: string }>;
  }
}

declare const window: AptosWindow;

// Lazy loaded components
const Modal = lazy(() => import("antd/lib/modal/Modal"));

const createClient = () => {
  const nodeUrl = process.env.REACT_APP_APTOS_NODE_URL;
  if (!nodeUrl) throw new Error("REACT_APP_APTOS_NODE_URL is not defined");
  return new AptosClient(nodeUrl);
};

const client = createClient();

const App = () => {
  const { connected } = useWallet();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isMarketplaceReady, setIsMarketplaceReady] = useState(false);

  const handleMintNFTClick = () => {
    if (!connected) {
      message.warning("Please connect your wallet first!");
      return;
    }
    setIsModalVisible(true);
  };

  const handleMintNFT = async (values: NFTFormValues) => {
    if (!isMarketplaceReady) {
      message.error("Marketplace is not initialized!");
      return;
    }

    try {
      const marketplaceAddress = process.env.REACT_APP_MARKETPLACE_ADDRESS;
      if (!marketplaceAddress) throw new Error("Marketplace address not configured");

      const nameVector = Array.from(new TextEncoder().encode(values.name));
      const descriptionVector = Array.from(new TextEncoder().encode(values.description));
      const uriVector = Array.from(new TextEncoder().encode(values.uri));

      const payload: Types.TransactionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddress}::NFTMarketplaceV2::mint_nft`,
        type_arguments: [],
        arguments: [marketplaceAddress, nameVector, descriptionVector, uriVector, values.rarity],
      };

      if (!window.aptos) {
        throw new Error("Aptos wallet not found");
      }

      const response = await window.aptos.signAndSubmitTransaction(payload);
      await client.waitForTransaction(response.hash);

      message.success("NFT minted successfully!");
      setIsModalVisible(false);
    } catch (error: unknown) {
      console.error("Error minting NFT:", error);
      message.error(
        error instanceof Error ? error.message : "Failed to mint NFT. Please try again."
      );
    }
  };

  if (!isMarketplaceReady) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MarketplaceInitializer 
          onInitialized={() => setIsMarketplaceReady(true)} 
        />
      </div>
    );
  }

  return (
    <Router>
      <Layout className="min-h-screen">
        <NavBar onMintNFTClick={handleMintNFTClick} />
        
        <Layout.Content className="p-4">
          <Routes>
            <Route path="/" element={<MarketView />} />
            <Route path="/my-nfts" element={<MyNFTs />} />
            <Route path="/favorites" element={<FavoritesView />} />
          </Routes>

          <Suspense 
            fallback={
              <div className="flex justify-center items-center">
                <Spin size="large" />
              </div>
            }
          >
            <Modal
              title="Mint New NFT"
              open={isModalVisible}
              onCancel={() => setIsModalVisible(false)}
              footer={null}
            >
              <Form<NFTFormValues>
                layout="vertical" 
                onFinish={handleMintNFT}
                className="space-y-4"
              >
                <Form.Item
                  label="Name"
                  name="name"
                  rules={[{ required: true, message: "Please enter a name!" }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  label="Description"
                  name="description"
                  rules={[{ required: true, message: "Please enter a description!" }]}
                >
                  <Input.TextArea rows={4} />
                </Form.Item>

                <Form.Item
                  label="URI"
                  name="uri"
                  rules={[
                    { required: true, message: "Please enter a URI!" },
                    { type: "url", message: "Please enter a valid URI!" }
                  ]}
                >
                  <Input placeholder="https://" />
                </Form.Item>

                <Form.Item
                  label="Rarity"
                  name="rarity"
                  rules={[{ required: true, message: "Please select a rarity!" }]}
                >
                  <Select>
                    <Select.Option value={1}>Common</Select.Option>
                    <Select.Option value={2}>Uncommon</Select.Option>
                    <Select.Option value={3}>Rare</Select.Option>
                    <Select.Option value={4}>Epic</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit"
                    className="w-full"
                  >
                    Mint NFT
                  </Button>
                </Form.Item>
              </Form>
            </Modal>
          </Suspense>
        </Layout.Content>
      </Layout>
    </Router>
  );
};

export default App;