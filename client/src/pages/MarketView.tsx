import React, { useState, useEffect, useMemo, useCallback, lazy } from "react";
import { Typography, message, Card, Row, Col, Pagination, Button, Select, Space, Layout, Spin, Empty, Badge } from "antd";
import { AptosClient } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import RarityTag from "../components/RarityTag";
import { ShoppingCartOutlined, FilterOutlined, SortAscendingOutlined, HeartOutlined, HeartFilled, TagsOutlined } from '@ant-design/icons';
import { hexToString } from "../utils/utils";

const Modal = lazy(() => import("antd/lib/modal/Modal"));

const { Title } = Typography;
const { Meta } = Card;
const { Content } = Layout;

const client = new AptosClient(process.env.REACT_APP_APTOS_URL!);

type NFT = {
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
};

const truncateAddress = (address: string, start = 6, end = 4) => {
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

const PRICE_RANGES = [
  { label: 'All Prices', value: 'all', range: [0.001, Infinity] }, 
  { label: 'Under 0.01 APT', value: 'under0.01', range: [0.001, 0.01] },
  { label: '0.01 - 0.05 APT', value: '0.01to0.05', range: [0.01, 0.05] },
  { label: '0.05 - 0.1 APT', value: '0.05to0.1', range: [0.05, 0.1] },
  { label: '0.1 - 0.5 APT', value: '0.1to0.5', range: [0.1, 0.5] },
  { label: '0.5 - 1 APT', value: '0.5to1', range: [0.5, 1] },
  { label: '1 - 5 APT', value: '1to5', range: [1, 5] },
  { label: '5 - 10 APT', value: '5to10', range: [5, 10] },
  { label: '10+ APT', value: 'over10', range: [10, Infinity] }, 
];


const MarketView: React.FC = () => {
  const { connected, account } = useWallet();
  const [loading, setLoading] = useState(true);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [rarity, setRarity] = useState<'all' | number>('all');
  const [sortOption, setSortOption] = useState<string>('date_listed:desc');
  const [priceRange, setPriceRange] = useState<number[]>([0.001, 100]);
  const [currentPage, setCurrentPage] = useState(1);
  const [userFavorites, setUserFavorites] = useState<number[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState<{ [key: number]: boolean }>({});
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const pageSize = 8;

  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  useEffect(() => {
    const filters: string[] = [];
    if (rarity !== 'all') filters.push('Rarity');
    if (selectedPriceRange !== 'all') filters.push('Price');
    if (sortOption !== 'date_listed:desc') filters.push('Sort');
    setActiveFilters(filters);
  }, [rarity, selectedPriceRange, sortOption]);

  const nftsToDisplay = useMemo(() => {
    const selectedRange = PRICE_RANGES.find(r => r.value === selectedPriceRange)?.range || [0.001, 100];
    let filtered = [...nfts].filter(nft => {
      if (nft.price < selectedRange[0] || nft.price > selectedRange[1]) return false;
      if (rarity && rarity !== 'all') return nft.rarity === rarity;
      return true;
    });
    
    switch (sortOption) {
      case 'date_listed:desc':
        return filtered.sort((a, b) => b.date_listed - a.date_listed);
      case 'id:desc':
        return filtered.sort((a, b) => b.id - a.id);
      case 'price:asc':
        return filtered.sort((a, b) => a.price - b.price);
      case 'price:desc':
        return filtered.sort((a, b) => b.price - a.price);
      case 'favorites:desc':
        return filtered.sort((a, b) => b.favorites - a.favorites);
      default:
        return filtered;
    }
  }, [rarity, nfts, sortOption, selectedPriceRange]);

  const fetchUserFavorites = useCallback(async () => {
    if (!connected) return;
    
    try {
      const response = await client.view({
        function: `${process.env.REACT_APP_MARKETPLACE_ADDR}::NFTMarketplaceV3::get_user_favorites`,
        type_arguments: [],
        arguments: [account?.address],
      });
      
      setUserFavorites(response[0] as number[]);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  }, [connected]);

  const toggleFavorite = async (nftId: number) => {
    if (!connected) {
      message.warning("Please connect your wallet first!");
      return;
    }

    setFavoritesLoading(prev => ({ ...prev, [nftId]: true }));

    try {
      const isFavorited = userFavorites.includes(nftId);
      const functionName = isFavorited ? 'remove_from_favorites' : 'add_to_favorites';
      
      const payload = {
        type: "entry_function_payload",
        function: `${process.env.REACT_APP_MARKETPLACE_ADDR}::NFTMarketplaceV3::${functionName}`,
        type_arguments: [],
        arguments: [process.env.REACT_APP_MARKETPLACE_ADDR, nftId.toString()],
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(payload);
      await client.waitForTransaction(response.hash);

      setUserFavorites(prev => 
        isFavorited 
          ? prev.filter(id => id !== nftId)
          : [...prev, nftId]
      );

      message.success(isFavorited ? "Removed from favorites" : "Added to favorites");
    } catch (error) {
      console.error("Error toggling favorite:", error);
      message.error("Failed to update favorites");
    } finally {
      setFavoritesLoading(prev => ({ ...prev, [nftId]: false }));
    }
  };

  const handleFetchNfts = useCallback(async () => {
    if (!connected) {
      setNfts([]);
      setLoading(false);
      return;
    }
  
    setLoading(true);
    try {
      const nftIdsResponse = await client.view({
        function: `${process.env.REACT_APP_MARKETPLACE_ADDR}::NFTMarketplaceV3::get_all_nfts_for_sale`,
        arguments: [process.env.REACT_APP_MARKETPLACE_ADDR, "100", "0"],
        type_arguments: [],
      });
  
      const nftIds = (Array.isArray(nftIdsResponse[0]) ? nftIdsResponse[0] : nftIdsResponse).map((item: any) => item.id);
  
      if (nftIds.length === 0) {
        setNfts([]);
        setLoading(false);
        return;
      }
  
      const nftsForSale = (await Promise.all(
        nftIds.map(async (id) => {
          try {
            const nftDetails = await client.view({
              function: `${process.env.REACT_APP_MARKETPLACE_ADDR}::NFTMarketplaceV3::get_nft_details`,
              arguments: [process.env.REACT_APP_MARKETPLACE_ADDR, id],
              type_arguments: [],
            });
  
            const [nftId, owner, name, description, uri, price, forSale, rarity, dateListed] = nftDetails as [
              number, string, string, string, string, number, boolean, number, number
            ];
  
            return {
              id: nftId,
              name: hexToString(name),
              description: hexToString(description),
              uri: hexToString(uri),
              rarity,
              price: price / 100000000,
              for_sale: forSale,
              owner,
              date_listed: dateListed,
              favorites: 0
            };
          } catch (error) {
            console.error(`Error fetching details for NFT ID ${id}:`, error);
            return null;
          }
        })
      )).filter((nft): nft is NFT => nft !== null);
  
      setNfts(nftsForSale);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      message.error("Failed to fetch NFTs.");
    } finally {
      setLoading(false);
    }
  }, [connected]);


  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([handleFetchNfts(), fetchUserFavorites()]);
      setLoading(false);
    };
    
    init();
  }, [handleFetchNfts, fetchUserFavorites]);

  const handleBuyClick = (nft: NFT) => {
    if (!connected) {
      message.warning("Please connect your wallet first!");
      return;
    }
    setSelectedNft(nft);
    setIsBuyModalVisible(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedNft || !connected) return;
    
    setPurchaseLoading(true);
    try {
      const priceInOctas = selectedNft.price * 100000000;
      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${process.env.REACT_APP_MARKETPLACE_ADDR}::NFTMarketplaceV3::purchase_nft`,
        type_arguments: [],
        arguments: [process.env.REACT_APP_MARKETPLACE_ADDR, selectedNft.id.toString(), priceInOctas.toString()],
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);

      message.success("NFT purchased successfully!");
      setIsBuyModalVisible(false);
      handleFetchNfts();
    } catch (error) {
      console.error("Error purchasing NFT:", error);
      message.error("Failed to purchase NFT.");
    } finally {
      setPurchaseLoading(false);
    }
  };

  const paginatedNfts = nftsToDisplay.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <Content className="site-layout-content" style={{ padding: '24px 50px', minHeight: 'calc(100vh - 64px)', background: '#f5f5f5' }}>
      <Title level={2} style={{ textAlign: 'center', marginBottom: '32px', marginTop: '64px', color: '#1a1a1a' }}>
        NFT Marketplace
      </Title>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ 
          background: '#fff', 
          padding: '20px', 
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <Space wrap style={{ width: '100%', justifyContent: 'center', gap: '16px' }}>
            <Select
              style={{ width: 160 }}
              suffixIcon={<FilterOutlined />}
              value={rarity}
              options={[
                { value: "all", label: 'All Rarities' },
                { value: 1, label: '🟢 Common' },
                { value: 2, label: '🔵 Uncommon' },
                { value: 3, label: '🟣 Rare' },
                { value: 4, label: '🟡 Super Rare' },
              ]}
              onChange={(value: "all" | number) => setRarity(value)}
            />

            <Select
              style={{ width: 160 }}
              suffixIcon={<TagsOutlined />}
              value={selectedPriceRange}
              options={PRICE_RANGES}
              onChange={setSelectedPriceRange}
            />

            <Select
              style={{ width: 225 }}
              suffixIcon={<SortAscendingOutlined />}
              value={sortOption}
              options={[
                { value: 'date_listed:desc', label: '⏰ Last Listed' },
                { value: 'price:asc', label: '💰 Price: Low to High' },
                { value: 'price:desc', label: '💰 Price: High to Low' },
                { value: 'favorites:desc', label: '❤️ Most Favorited' },
              ]}
              onChange={(value: string) => setSortOption(value)}
            />
          </Space>
          {activeFilters.length > 0 && (
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <Space size={[0, 8]} wrap>
                {activeFilters.map(filter => (
                  <Badge
                    key={filter}
                    count={filter}
                    style={{
                      backgroundColor: '#1890ff',
                      marginRight: '8px',
                      fontSize: '12px'
                    }}
                  />
                ))}
              </Space>
            </div>
          )}
        </div>
          {loading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Spin size="large" />
          </div>
        ) : nftsToDisplay.length === 0 ? (
          <Empty
            style={{ 
              background: '#fff', 
              padding: '48px', 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            description={
              <span>
                {connected ? "No NFTs available" : "Connect your wallet to view NFTs"}
              </span>
            }
          />
        ) : (
          <Row gutter={[24, 24]}>
          {paginatedNfts.map((nft) => (
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
                  </div>
                }
                actions={[
                  <Button
                    type="text"
                    icon={userFavorites.includes(nft.id) ? 
                      <HeartFilled style={{ color: '#ff4d4f' }} /> : 
                      <HeartOutlined />
                    }
                    onClick={() => toggleFavorite(nft.id)}
                    loading={favoritesLoading[nft.id]}
                    disabled={!connected}
                  />,
                  <Button
                    type="primary"
                    icon={<ShoppingCartOutlined />}
                    onClick={() => handleBuyClick(nft)}
                    disabled={!connected}
                  >
                    Buy
                  </Button>
                ]}
              >
                  <Meta
                    title={nft.name}
                    description={
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ 
                          fontSize: '1.1em', 
                          fontWeight: 'bold', 
                          color: '#1890ff',
                          marginBottom: '8px'
                        }}>
                          {nft.price} APT
                        </div>
                        <div style={{ 
                          fontSize: '0.9em', 
                          color: '#666',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            backgroundColor: '#52c41a',
                            display: 'inline-block'
                          }} />
                          {truncateAddress(nft.owner)}
                        </div>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}

{nftsToDisplay.length > pageSize && (
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
              total={nftsToDisplay.length}
              onChange={(page) => setCurrentPage(page)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>


      <Modal
        title="Confirm Purchase"
        open={isBuyModalVisible}
        onCancel={() => setIsBuyModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsBuyModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="submit"
            type="primary"
            loading={purchaseLoading}
            onClick={handleConfirmPurchase}
          >
            Confirm Purchase
          </Button>
        ]}
      >
        {selectedNft && (
          <div>
            <img
              src={selectedNft.uri}
              alt={selectedNft.name}
              style={{ width: '100%', marginBottom: 16, borderRadius: 8 }}
            />
            <p><strong>Name:</strong> {selectedNft.name}</p>
            <p><strong>Description:</strong> {selectedNft.description}</p>
            <p><strong>Price:</strong> {selectedNft.price} APT</p>
            <p><strong>Rarity:</strong> <RarityTag nft={selectedNft} /></p>
            <p><strong>Owner:</strong> {truncateAddress(selectedNft.owner)}</p>
            <p><strong>Favorites:</strong> {selectedNft.favorites}</p>
          </div>
        )}
      </Modal>
    </Content>
 );
};

export default MarketView;