import React, { useEffect, useState } from "react";
import { Typography, Menu, Button, Dropdown, message, Avatar, Badge } from "antd";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { AptosClient } from "aptos";
import {
  DownOutlined,
  LogoutOutlined,
  UserOutlined,
  ShopOutlined,
  SolutionOutlined,
  PlusCircleOutlined,
  WalletOutlined,
  HeartOutlined
} from "@ant-design/icons";
import { Link, useLocation } from "react-router-dom";
import styles from './NavBar.module.css';

const { Text } = Typography;

const client = new AptosClient(process.env.REACT_APP_APTOS_URL!);

interface NavBarProps {
  onMintNFTClick: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ onMintNFTClick }) => {
  const { pathname } = useLocation();
  const defaultSelectedKeys = [pathname.split("/")[1] || "marketplace"];
  const { connected, account, network, disconnect } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [favoriteCount, setFavoriteCount] = useState<number>(0);

  useEffect(() => {
    const fetchBalance = async () => {
      if (account?.address) {
        try {
          const resources = await client.getAccountResources(account.address);
          const accountResource = resources.find(
            (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
          );
          if (accountResource) {
            const balanceValue = (accountResource.data as any).coin.value;
            setBalance(balanceValue ? parseInt(balanceValue) / 100000000 : 0);
          } else {
            setBalance(0);
          }
        } catch (error) {
          console.error("Error fetching balance:", error);
          setBalance(null);
        }
      }
    };

    const fetchFavoriteCount = async () => {
      if (!connected || !account) return;
      
      try {
        const favoriteIds = await client.view({
          function: `${process.env.REACT_APP_MARKETPLACE_ADDR}::NFTMarketplaceV3::get_user_favorites`,
          type_arguments: [],
          arguments: [account.address],
        });
        
        const ids = favoriteIds[0] as any[];
        setFavoriteCount(Array.isArray(ids) ? ids.length : 0);
      } catch (error) {
        console.error("Error fetching favorite count:", error);
        setFavoriteCount(0);
      }
    };

    if (connected) {
      fetchBalance();
      fetchFavoriteCount();
      const interval = setInterval(() => {
        fetchBalance();
        fetchFavoriteCount();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [account, connected]);

  const handleLogout = async () => {
    try {
      await disconnect();
      setBalance(null);
      setFavoriteCount(0);
      message.success("Disconnected from wallet");
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      message.error("Failed to disconnect from wallet");
    }
  };

  const menuItems = [
    {
      key: "marketplace",
      icon: <ShopOutlined />,
      label: <Link to="/">Marketplace</Link>,
    },
    {
      key: "my-nfts",
      icon: <SolutionOutlined />,
      label: <Link to="/my-nfts">My Collection</Link>,
    },
    {
      key: "mint-nft",
      icon: <PlusCircleOutlined />,
      label: <span onClick={onMintNFTClick}>Mint NFT</span>,
    },
    {
      key: "favorites",
      icon: connected ? (
        <Badge count={favoriteCount} size="small" offset={[5, 0]}>
          <HeartOutlined />
        </Badge>
      ) : (
        <HeartOutlined />
      ),
      label: <Link to="/favorites">Favorites</Link>,
    },
  ];

  const walletMenu = (
    <div className={styles.walletDropdown}>
      <div className={styles.walletInfo}>
        <div className={styles.walletSection}>
          <UserOutlined />
          <div>
            <Text strong>Account</Text>
            <Text copyable className={styles.walletAddress}>
              {account?.address}
            </Text>
          </div>
        </div>
        
        <div className={styles.walletSection}>
          <WalletOutlined />
          <div>
            <div className={styles.networkInfo}>
              <Text strong>Network:</Text>
              <Text>{network?.name || "Unknown"}</Text>
            </div>
            <div className={styles.balanceInfo}>
              <Text strong>Balance:</Text>
              <Text>{balance !== null ? `${balance.toFixed(4)} APT` : "Loading..."}</Text>
            </div>
          </div>
        </div>

        <Button
          onClick={handleLogout}
          icon={<LogoutOutlined />}
          danger
          className={styles.logoutButton}
        >
          Disconnect Wallet
        </Button>
      </div>
    </div>
  );

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.leftSection}>
          <Link to="/">
            <img 
              src="/Aptos_Primary_WHT.png" 
              alt="Aptos Logo" 
              className={styles.logo}
            />
          </Link>
          
          <Menu
            mode="horizontal"
            selectedKeys={defaultSelectedKeys}
            items={menuItems}
            className={styles.menu}
            theme="dark"
          />
        </div>

        <div className={styles.rightSection}>
          {connected && account ? (
            <Dropdown 
              overlay={walletMenu} 
              trigger={['click']} 
              placement="bottomRight"
            >
              <Button type="primary" className={styles.walletButton}>
                <Avatar size="small" icon={<UserOutlined />} />
                <span>{balance !== null ? `${balance.toFixed(2)} APT` : "Connected"}</span>
                <DownOutlined />
              </Button>
            </Dropdown>
          ) : (
            <WalletSelector />
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;