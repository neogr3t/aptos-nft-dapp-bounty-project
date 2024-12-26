import React, { useEffect, useState, useCallback, lazy } from "react";
import { Typography, Card, Row, Col, Pagination, message, Button, Input, Layout, Empty, Spin, Space } from "antd";
import { AptosClient } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import RarityTag from "../components/RarityTag";
import { ShoppingCartOutlined, SwapOutlined, TagOutlined } from '@ant-design/icons';

const Modal = lazy(() => import("antd/lib/modal/Modal"));

const { Title } = Typography;
const { Meta } = Card;
const { Content } = Layout;


const client = new AptosClient(process.env.REACT_APP_APTOS_NODE_URL!);

type NFT = {
  id: number;
  name: string;
  description: string;
  uri: string;
  rarity: number;
  price: number;
  for_sale: boolean;
};

const MyNFTs: React.FC = () => {
  const pageSize = 8;
  const [currentPage, setCurrentPage] = useState(1);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [totalNFTs, setTotalNFTs] = useState(0);
  const { account } = useWallet();
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState<string>("");
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [salePrice, setSalePrice] = useState<string>("");
  const [recipientAddr, setRecipientAddr] = useState<string>("");

  const fetchUserNFTs = useCallback(async () => {
    if (!account) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log("Fetching NFT IDs for owner:", account.address);

      const nftIdsResponse = await client.view({
        function: `${process.env.REACT_APP_MARKETPLACE_ADDRESS}::${process.env.REACT_APP_MARKETPLACE_CONTRACT}::get_all_nfts_for_owner`,
        arguments: [process.env.REACT_APP_MARKETPLACE_ADDRESS, account.address, "100", "0"],
        type_arguments: [],
      });

      const nftIds = Array.isArray(nftIdsResponse[0]) ? nftIdsResponse[0] : nftIdsResponse;
      setTotalNFTs(nftIds.length);

      if (nftIds.length === 0) {
        console.log("No NFTs found for the owner.");
        setNfts([]);
        return;
      }

      console.log("Fetching details for each NFT ID:", nftIds);

      const userNFTs = (await Promise.all(
        nftIds.map(async (id) => {
          try {
            const nftDetails = await client.view({
              function: `${process.env.REACT_APP_MARKETPLACE_ADDRESS}::${process.env.REACT_APP_MARKETPLACE_CONTRACT}::get_nft_details`,
              arguments: [process.env.REACT_APP_MARKETPLACE_ADDRESS, id],
              type_arguments: [],
            });

            const [nftId, , name, description, uri, price, forSale, rarity] = nftDetails as [
              number,
              string,
              string,
              string,
              string,
              number,
              boolean,
              number
            ];

            const hexToUint8Array = (hexString: string): Uint8Array => {
              const bytes = new Uint8Array(hexString.length / 2);
              for (let i = 0; i < hexString.length; i += 2) {
                bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
              }
              return bytes;
            };

            return {
              id: nftId,
              name: new TextDecoder().decode(hexToUint8Array(name.slice(2))),
              description: new TextDecoder().decode(hexToUint8Array(description.slice(2))),
              uri: new TextDecoder().decode(hexToUint8Array(uri.slice(2))),
              rarity,
              price: price / 100000000, // Convert octas to APT
              for_sale: forSale,
            };
          } catch (error) {
            console.error(`Error fetching details for NFT ID ${id}:`, error);
            return null;
          }
        })
      )).filter((nft): nft is NFT => nft !== null);

      console.log("User NFTs:", userNFTs);
      setNfts(userNFTs);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      message.error("Failed to fetch your NFTs.");
    } finally {
      setLoading(false);
    }
  }, [account]);

  const handleSellClick = (nft: NFT) => {
    setSelectedNft(nft);
    setIsModalVisible("sell");
  };

  const handleTransferClick = (nft: NFT) => {
    setSelectedNft(nft);
    setIsModalVisible("transfer");
  };

  const handleCancel = () => {
    setIsModalVisible("");
    setSelectedNft(null);
    setSalePrice("");
    setRecipientAddr("");
  };

  const handleConfirmListing = async () => {
    if (!selectedNft || !salePrice) return;
  
    try {
      const priceInOctas = parseFloat(salePrice) * 100000000;
  
      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${process.env.REACT_APP_MARKETPLACE_ADDRESS}::${process.env.REACT_APP_MARKETPLACE_CONTRACT}::list_for_sale`,
        type_arguments: [],
        arguments: [process.env.REACT_APP_MARKETPLACE_ADDRESS, selectedNft.id.toString(), priceInOctas.toFixed(0).toString()],
      };
  
      // Bypass type checking
      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);
  
      message.success("NFT listed for sale successfully!");
      setIsModalVisible("");
      setSalePrice("");
      fetchUserNFTs();
    } catch (error) {
      console.error("Error listing NFT for sale:", error);
      message.error("Failed to list NFT for sale.");
    }
  };

  const handleConfirmTransfer = async () => {
    if (!selectedNft || !recipientAddr) return;
  
    try {
      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${process.env.REACT_APP_MARKETPLACE_ADDRESS}::${process.env.REACT_APP_MARKETPLACE_CONTRACT}::transfer_ownership`,
        type_arguments: [],
        arguments: [process.env.REACT_APP_MARKETPLACE_ADDRESS, selectedNft.id.toString(), recipientAddr],
      };
  
      // Bypass type checking
      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);
  
      message.success("NFT transferred successfully!");
      setIsModalVisible("");
      setRecipientAddr("");
      fetchUserNFTs();
    } catch (error) {
      console.error("Error transferring NFT:", error);
      message.error("Failed to transfer NFT.");
    }
  };

  useEffect(() => {
    fetchUserNFTs();
  }, [fetchUserNFTs]);

  const paginatedNFTs = nfts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <Content className="site-layout-content" style={{ padding: '24px 50px', minHeight: 'calc(100vh - 64px)', background: '#f5f5f5' }}>
      <Title level={2} style={{ textAlign: 'center', marginBottom: '32px', marginTop: '64px', color: '#1a1a1a' }}>
        My NFT Collection
      </Title>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ 
          background: '#fff', 
          padding: '20px', 
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          textAlign: 'center'
        }}>
          <Space direction="vertical" size="small">
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
              {totalNFTs} NFTs in Your Collection
            </Title>
            <Typography.Text type="secondary">
              Manage your NFTs - List them for sale or transfer to other wallets
            </Typography.Text>
          </Space>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Spin size="large" />
          </div>
        ) : paginatedNFTs.length === 0 ? (
          <Empty
            style={{ 
              background: '#fff', 
              padding: '48px', 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            description={
              <span>
                {account ? "No NFTs in your collection" : "Connect your wallet to view your NFTs"}
              </span>
            }
          />
        ) : (
          <Row gutter={[24, 24]}>
            {paginatedNFTs.map((nft) => (
              <Col key={nft.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  className="nft-card"
                  style={{ 
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                  cover={
                    <div style={{ position: 'relative', height: 240 }}>
                      <img 
                        alt={nft.name} 
                        src={nft.uri} 
                        style={{ 
                          height: '100%', 
                          width: '100%', 
                          objectFit: 'cover'
                        }} 
                      />
                      <RarityTag 
                        nft={nft} 
                        style={{ 
                          position: 'absolute', 
                          top: '12px', 
                          right: '12px',
                          margin: 0
                        }} 
                      />
                      {nft.for_sale && (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          background: '#f50',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          Listed for Sale
                        </div>
                      )}
                    </div>
                  }
                  actions={[
                    <Button
                      type="text"
                      icon={<TagOutlined />}
                      onClick={() => handleSellClick(nft)}
                      disabled={nft.for_sale}
                    >
                      List for Sale
                    </Button>,
                    <Button
                      type="text"
                      icon={<SwapOutlined />}
                      onClick={() => handleTransferClick(nft)}
                      disabled={nft.for_sale}
                    >
                      Transfer
                    </Button>
                  ]}
                >
                  <Meta
                    title={nft.name}
                    description={
                      <div style={{ marginTop: '8px' }}>
                        {nft.for_sale ? (
                          <div style={{ 
                            fontSize: '1.1em', 
                            fontWeight: 'bold', 
                            color: '#f50',
                            marginBottom: '8px'
                          }}>
                            Listed: {nft.price} APT
                          </div>
                        ) : (
                          <div style={{ 
                            fontSize: '0.9em', 
                            color: '#666',
                            marginBottom: '8px'
                          }}>
                            Not Listed
                          </div>
                        )}
                        <Typography.Paragraph
                          ellipsis={{ rows: 2 }}
                          style={{ 
                            fontSize: '0.9em', 
                            color: '#666',
                            margin: 0
                          }}
                        >
                          {nft.description}
                        </Typography.Paragraph>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {totalNFTs > pageSize && (
          <div style={{ 
            textAlign: 'center', 
            marginTop: '32px',
            background: '#fff',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={totalNFTs}
              onChange={(page) => setCurrentPage(page)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>

      <Modal
        title={
          <Space align="center">
            <TagOutlined />
            List NFT for Sale
          </Space>
        }
        open={isModalVisible === "sell"}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmListing}>
            Confirm Listing
          </Button>,
        ]}
      >
        {selectedNft && (
          <div style={{ textAlign: 'center' }}>
            <img
              src={selectedNft.uri}
              alt={selectedNft.name}
              style={{ 
                width: '100%', 
                maxHeight: '200px', 
                objectFit: 'cover',
                borderRadius: '8px',
                marginBottom: '16px'
              }}
            />
            <Typography.Title level={4}>{selectedNft.name}</Typography.Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Typography.Text>ID: {selectedNft.id}</Typography.Text>
              <Typography.Text>{selectedNft.description}</Typography.Text>
              <RarityTag nft={selectedNft} />
              <Input
                type="number"
                placeholder="Enter sale price in APT"
                prefix="APT"
                min={0.001}
                max={100}
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                style={{ marginTop: 10 }}
              />
            </Space>
          </div>
        )}
      </Modal>

      <Modal
        title={
          <Space align="center">
            <SwapOutlined />
            Transfer NFT
          </Space>
        }
        open={isModalVisible === "transfer"}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmTransfer}>
            Confirm Transfer
          </Button>,
        ]}
      >
        {selectedNft && (
          <div style={{ textAlign: 'center' }}>
            <img
              src={selectedNft.uri}
              alt={selectedNft.name}
              style={{ 
                width: '100%', 
                maxHeight: '200px', 
                objectFit: 'cover',
                borderRadius: '8px',
                marginBottom: '16px'
              }}
            />
            <Typography.Title level={4}>{selectedNft.name}</Typography.Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Typography.Text>ID: {selectedNft.id}</Typography.Text>
              <Typography.Text>{selectedNft.description}</Typography.Text>
              <RarityTag nft={selectedNft} />
              <Input
                placeholder="Enter recipient address"
                value={recipientAddr}
                onChange={(e) => setRecipientAddr(e.target.value)}
                style={{ marginTop: 10 }}
              />
            </Space>
          </div>
        )}
      </Modal>
    </Content>
  );
};

export default MyNFTs;