import React, { useState, useEffect } from "react";
import { Typography, Card, Row, Col, Spin, Empty, Button, message, Layout, Space, Pagination } from "antd";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { AptosClient } from "aptos";
import RarityTag from "../components/RarityTag";
import { HeartFilled, ShoppingCartOutlined } from '@ant-design/icons';
import { hexToString } from "../utils/utils";

const { Title } = Typography;
const { Meta } = Card;
const { Content } = Layout;

const client = new AptosClient(process.env.REACT_APP_APTOS_NODE_URL!);

interface NFT {
  id: number;
  owner: string;
  name: string;
  description: string;
  uri: string;
  price: number;
  for_sale: boolean;
  rarity: number;
  date_listed: number;
  favorites: number;
}

const FavoritesView = () => {
  const pageSize = 8;
  const [currentPage, setCurrentPage] = useState(1);
  const { connected, account } = useWallet();
  const [loading, setLoading] = useState(true);
  const [favoriteNfts, setFavoriteNfts] = useState<NFT[]>([]);
  const [removingFavorites, setRemovingFavorites] = useState<{ [key: number]: boolean }>({});
  const [initialized, setInitialized] = useState(false);
  const [totalFavorites, setTotalFavorites] = useState(0);

  const truncateAddress = (address: string, start = 6, end = 4) => {
    return `${address.slice(0, start)}...${address.slice(-end)}`;
  };

  const checkInitialization = async () => {
    if (!connected || !account || initialized) return;
    
    try {
      await client.view({
        function: `${process.env.REACT_APP_MARKETPLACE_ADDRESS}::NFTMarketplaceV3::get_user_favorites`,
        type_arguments: [],
        arguments: [account.address]
      });
      setInitialized(true);
    } catch (error: any) {
      if (!initialized) {
        try {
          const initPayload = {
            type: "entry_function_payload",
            function: `${process.env.REACT_APP_MARKETPLACE_ADDRESS}::NFTMarketplaceV3::initialize_favorites`,
            type_arguments: [],
            arguments: []
          };

          const initResponse = await (window as any).aptos.signAndSubmitTransaction(initPayload);
          await client.waitForTransaction(initResponse.hash);
          setInitialized(true);
        } catch (error: any) {
          if (error.message?.includes("already exists")) {
            setInitialized(true);
          } else {
            console.error("Error initializing favorites:", error);
            message.error("Failed to initialize favorites");
          }
        }
      }
    }
  };

  const fetchFavoriteNfts = async () => {
    if (!connected || !account) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const favoriteIdsResponse = await client.view({
        function: `${process.env.REACT_APP_MARKETPLACE_ADDRESS}::NFTMarketplaceV3::get_user_favorites`,
        type_arguments: [],
        arguments: [account.address]
      });
      
      const favoriteIds = Array.isArray(favoriteIdsResponse[0]) 
        ? favoriteIdsResponse[0] 
        : [];

      setTotalFavorites(favoriteIds.length);

      if (favoriteIds.length === 0) {
        setFavoriteNfts([]);
        setLoading(false);
        return;
      }

      const nftsDetails = await Promise.all(
        favoriteIds.map(async (id) => {
          try {
            const nftDetailsResponse = await client.view({
              function: `${process.env.REACT_APP_MARKETPLACE_ADDRESS}::NFTMarketplaceV3::get_nft_details`,
              type_arguments: [],
              arguments: [process.env.REACT_APP_MARKETPLACE_ADDRESS, id.toString()]
            });

            if (!Array.isArray(nftDetailsResponse) || nftDetailsResponse.length < 9) {
              return null;
            }

            const [nftId, owner, name, description, uri, price, forSale, rarity, dateListed] = nftDetailsResponse;

            const favoriteCountResponse = await client.view({
              function: `${process.env.REACT_APP_MARKETPLACE_ADDRESS}::NFTMarketplaceV3::get_nft_favorite_count`,
              type_arguments: [],
              arguments: [process.env.REACT_APP_MARKETPLACE_ADDRESS]
            });

            return {
              id: Number(nftId),
              owner: String(owner),
              name: hexToString(String(name)),
              description: hexToString(String(description)),
              uri: hexToString(String(uri)),
              price: Number(price) / 100000000,
              for_sale: Boolean(forSale),
              rarity: Number(rarity),
              date_listed: Number(dateListed),
            };
          } catch (error) {
            console.error(`Error fetching details for NFT ID ${id}:`, error);
            return null;
          }
        })
      );

      const validNfts = nftsDetails.filter((nft): nft is NFT => nft !== null);
      setFavoriteNfts(validNfts);
    } catch (error) {
      console.error("Error fetching favorite NFTs:", error);
      message.error("Failed to fetch favorite NFTs");
    } finally {
      setLoading(false);
    }
  };

  const removeFromFavorites = async (nftId: number) => {
    if (!connected || !account) return;

    setRemovingFavorites(prev => ({ ...prev, [nftId]: true }));

    try {
      const payload = {
        type: "entry_function_payload",
        function: `${process.env.REACT_APP_MARKETPLACE_ADDRESS}::NFTMarketplaceV3::remove_from_favorites`,
        type_arguments: [],
        arguments: [process.env.REACT_APP_MARKETPLACE_ADDRESS, nftId.toString()]
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(payload);
      await client.waitForTransaction(response.hash);

      message.success("Removed from favorites");
      setFavoriteNfts(prev => prev.filter(nft => nft.id !== nftId));
      setTotalFavorites(prev => prev - 1);
    } catch (error) {
      console.error("Error removing from favorites:", error);
      message.error("Failed to remove from favorites");
    } finally {
      setRemovingFavorites(prev => ({ ...prev, [nftId]: false }));
    }
  };

  useEffect(() => {
    const init = async () => {
      if (connected && account && !initialized) {
        await checkInitialization();
      }
    };
    init();
  }, [connected, account]);

  useEffect(() => {
    if (initialized) {
      fetchFavoriteNfts();
    }
  }, [initialized, connected, account]);

  const paginatedNFTs = favoriteNfts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (!connected) {
    return (
      <Empty
        style={{ 
          margin: '48px 0',
          background: '#fff', 
          padding: '48px', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
        description="Please connect your wallet to view your favorites"
      />
    );
  }

  return (
    <Content className="site-layout-content" style={{ padding: '24px 50px', minHeight: 'calc(100vh - 64px)', background: '#f5f5f5' }}>
      <Title level={2} style={{ textAlign: 'center', marginBottom: '32px', marginTop: '64px', color: '#1a1a1a' }}>
        My Favorites
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
              {totalFavorites} Favorite NFTs
            </Title>
            <Typography.Text type="secondary">
              Manage your favorite NFTs collection
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
            description="No favorite NFTs found"
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
                          For Sale
                        </div>
                      )}
                    </div>
                  }
                  actions={[
                    <Button
                      type="text"
                      icon={<HeartFilled style={{ color: '#ff4d4f' }} />}
                      onClick={() => removeFromFavorites(nft.id)}
                      loading={removingFavorites[nft.id]}
                    >
                      {nft.favorites}
                    </Button>,
                    nft.for_sale && (
                      <Button
                        type="text"
                        icon={<ShoppingCartOutlined />}
                      >
                        {nft.price} APT
                      </Button>
                    )
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
                            Price: {nft.price} APT
                          </div>
                        ) : (
                          <div style={{ 
                            fontSize: '0.9em', 
                            color: '#666',
                            marginBottom: '8px'
                          }}>
                            Not for Sale
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
                          Owner: {truncateAddress(nft.owner)}
                        </Typography.Paragraph>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {totalFavorites > pageSize && (
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
              total={totalFavorites}
              onChange={(page) => setCurrentPage(page)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>
    </Content>
  );
};

export default FavoritesView;