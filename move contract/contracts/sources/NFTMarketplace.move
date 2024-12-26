// TODO# 1: Define Module and Marketplace Address
address 0x9b6875a75e4f0aef8afed596e82d1917f00bbeeb9b7131a57373e436eab26a1b {

    module NFTMarketplaceV3 {
        use 0x1::signer;
        use 0x1::vector;
        use 0x1::coin;
        use 0x1::aptos_coin;
        use std::timestamp;

        // TODO# 2: Define NFT Structure
        struct NFT has store, key {
            id: u64,
            owner: address,
            name: vector<u8>,
            description: vector<u8>,
            uri: vector<u8>,
            price: u64,
            for_sale: bool,
            rarity: u8,  // 1 for common, 2 for rare, 3 for epic, etc.
            date_listed: u64
        }

        // TODO# 3: Define Marketplace Structure
        struct Marketplace has key {
            nfts: vector<NFT>
        }
        
        // TODO# 4: Define ListedNFT Structure
        struct ListedNFT has copy, drop {
            id: u64,
            price: u64,
            rarity: u8
        }

         // Structure to track user favorites
        struct UserFavorites has key {
            nft_ids: vector<u64>
        }

        // Structure to track NFT favorite counts
        struct NFTFavoriteCount has key {
            count: u64,
            users: vector<address>
        }

        // TODO# 5: Set Marketplace Fee
        const MARKETPLACE_FEE_PERCENT: u64 = 2; // 2% fee
        const MINTING_FEE: u64 = 20000;

        // TODO# 6: Initialize Marketplace        
        public entry fun initialize(account: &signer) {
            let marketplace = Marketplace {
                nfts: vector::empty<NFT>()
            };
            move_to(account, marketplace);
        }

        // TODO# 7: Check Marketplace Initialization
        #[view]
        public fun is_marketplace_initialized(marketplace_addr: address): bool {
            exists<Marketplace>(marketplace_addr)
        }

        // TODO# 8: Mint New NFT
        public entry fun mint_nft(account: &signer, marketplace_addr: address, name: vector<u8>, description: vector<u8>, uri: vector<u8>, rarity: u8) acquires Marketplace {
            assert!(is_marketplace_initialized(marketplace_addr), 1);

            // charge minting fee if user is not marketplace owner
            if (signer::address_of(account) != marketplace_addr) {
                coin::transfer<aptos_coin::AptosCoin>(account, marketplace_addr, MINTING_FEE);
            };

            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_id = vector::length(&marketplace.nfts);

            let new_nft = NFT {
                id: nft_id,
                owner: signer::address_of(account),
                name,
                description,
                uri,
                price: 0,
                for_sale: false,
                rarity,
                date_listed: 0
            };

            vector::push_back(&mut marketplace.nfts, new_nft);
        }

        // TODO# 9: View NFT Details
        #[view]
        public fun get_nft_details(marketplace_addr: address, nft_id: u64): (u64, address, vector<u8>, vector<u8>, vector<u8>, u64, bool, u8, u64) acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);

            (nft.id, nft.owner, nft.name, nft.description, nft.uri, nft.price, nft.for_sale, nft.rarity, nft.date_listed)
        }
        
        // TODO# 10: List NFT for Sale
        public entry fun list_for_sale(account: &signer, marketplace_addr: address, nft_id: u64, price: u64) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

            assert!(nft_ref.owner == signer::address_of(account), 100); // Caller is not the owner
            assert!(!nft_ref.for_sale, 101); // NFT is already listed
            assert!(price > 0, 102); // Invalid price

            nft_ref.for_sale = true;
            nft_ref.price = price;
            nft_ref.date_listed = timestamp::now_microseconds();
        }

        // TODO# 11: Update NFT Price
        public entry fun set_price(account: &signer, marketplace_addr: address, nft_id: u64, price: u64) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

            assert!(nft_ref.owner == signer::address_of(account), 200); // Caller is not the owner
            assert!(price > 0, 201); // Invalid price

            nft_ref.price = price;
        }

        // TODO# 12: Purchase NFT
        public entry fun purchase_nft(account: &signer, marketplace_addr: address, nft_id: u64, payment: u64) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

            assert!(nft_ref.for_sale, 400); // NFT is not for sale
            assert!(payment >= nft_ref.price, 401); // Insufficient payment

            // Calculate marketplace fee
            let fee = (nft_ref.price * MARKETPLACE_FEE_PERCENT) / 100;
            let seller_revenue = payment - fee;

            // Transfer payment to the seller and fee to the marketplace
            coin::transfer<aptos_coin::AptosCoin>(account, nft_ref.owner, seller_revenue);
            coin::transfer<aptos_coin::AptosCoin>(account, marketplace_addr, fee);

            // Transfer ownership
            nft_ref.owner = signer::address_of(account);
            nft_ref.for_sale = false;
            nft_ref.price = 0;
            nft_ref.date_listed = 0;
        }

        // TODO# 13: Check if NFT is for Sale
        #[view]
        public fun is_nft_for_sale(marketplace_addr: address, nft_id: u64): bool acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            nft.for_sale
        }

        // TODO# 14: Get NFT Price
        #[view]
        public fun get_nft_price(marketplace_addr: address, nft_id: u64): u64 acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            nft.price
        }

        // TODO# 15: Transfer Ownership
        public entry fun transfer_ownership(account: &signer, marketplace_addr: address, nft_id: u64, new_owner: address) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

            assert!(nft_ref.owner == signer::address_of(account), 300); // Caller is not the owner
            assert!(nft_ref.owner != new_owner, 301); // Prevent transfer to the same owner

            // Update NFT ownership and reset its for_sale status and price
            nft_ref.owner = new_owner;
            nft_ref.for_sale = false;
            nft_ref.price = 0;
            nft_ref.date_listed = 0;
        }

        // TODO# 16: Retrieve NFT Owner
        #[view]
        public fun get_owner(marketplace_addr: address, nft_id: u64): address acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            nft.owner
        }

        // TODO# 17: Retrieve NFTs for Sale
        #[view]
        public fun get_all_nfts_for_owner(marketplace_addr: address, owner_addr: address, limit: u64, offset: u64): vector<u64> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft_ids = vector::empty<u64>();

            let nfts_len = vector::length(&marketplace.nfts);
            let end = min(offset + limit, nfts_len);
            let mut_i = offset;
            while (mut_i < end) {
                let nft = vector::borrow(&marketplace.nfts, mut_i);
                if (nft.owner == owner_addr) {
                    vector::push_back(&mut nft_ids, nft.id);
                };
                mut_i = mut_i + 1;
            };

            nft_ids
        }

        // TODO# 18: Retrieve NFTs for Sale
        #[view]
        public fun get_all_nfts_for_sale(marketplace_addr: address, limit: u64, offset: u64): vector<ListedNFT> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nfts_for_sale = vector::empty<ListedNFT>();

            let nfts_len = vector::length(&marketplace.nfts);
            let end = min(offset + limit, nfts_len);
            let mut_i = offset;
            while (mut_i < end) {
                let nft = vector::borrow(&marketplace.nfts, mut_i);
                if (nft.for_sale) {
                    let listed_nft = ListedNFT { id: nft.id, price: nft.price, rarity: nft.rarity };
                    vector::push_back(&mut nfts_for_sale, listed_nft);
                };
                mut_i = mut_i + 1;
            };

            nfts_for_sale
        }

        // TODO# 19: Define Helper Function for Minimum Value
        // Helper function to find the minimum of two u64 numbers
        public fun min(a: u64, b: u64): u64 {
            if (a < b) { a } else { b }
        }

        #[view]
        public fun get_nfts_by_rarity(marketplace_addr: address, rarity: u8): vector<u64> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft_ids = vector::empty<u64>();

            let nfts_len = vector::length(&marketplace.nfts);
            let mut_i = 0;
            while (mut_i < nfts_len) {
                let nft = vector::borrow(&marketplace.nfts, mut_i);
                if (nft.rarity == rarity) {
                    vector::push_back(&mut nft_ids, nft.id);
                };
                mut_i = mut_i + 1;
            };

            nft_ids
        }

        // Initialize user favorites storage
        public entry fun initialize_favorites(account: &signer) {
            if (!exists<UserFavorites>(signer::address_of(account))) {
                move_to(account, UserFavorites {
                    nft_ids: vector::empty<u64>()
                });
            }
        }

        // Initialize NFT favorite count
        public entry fun initialize_nft_favorites(account: &signer, marketplace_addr: address, nft_id: u64) acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            assert!(nft_id < vector::length(&marketplace.nfts), 500); // Invalid NFT ID

            if (!exists<NFTFavoriteCount>(marketplace_addr)) {
                move_to(account, NFTFavoriteCount {
                    count: 0,
                    users: vector::empty<address>()
                });
            }
        }

        // Add NFT to favorites
        public entry fun add_to_favorites(
            account: &signer,
            marketplace_addr: address,
            nft_id: u64
        ) acquires UserFavorites, NFTFavoriteCount, Marketplace {
            let user_addr = signer::address_of(account);
            
            // Verify NFT exists
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            assert!(nft_id < vector::length(&marketplace.nfts), 500); // Invalid NFT ID

            // Initialize if not already done
            if (!exists<UserFavorites>(user_addr)) {
                initialize_favorites(account);
            };

            // Get user favorites
            let user_favorites = borrow_global_mut<UserFavorites>(user_addr);
            
            // Check if not already favorited
            assert!(!vector::contains(&user_favorites.nft_ids, &nft_id), 501); // Already favorited
            
            // Add to user favorites
            vector::push_back(&mut user_favorites.nft_ids, nft_id);

            // Update NFT favorite count
            if (exists<NFTFavoriteCount>(marketplace_addr)) {
                let nft_favorites = borrow_global_mut<NFTFavoriteCount>(marketplace_addr);
                nft_favorites.count = nft_favorites.count + 1;
                vector::push_back(&mut nft_favorites.users, user_addr);
            };
        }

        // Remove NFT from favorites
        public entry fun remove_from_favorites(
            account: &signer,
            marketplace_addr: address,
            nft_id: u64
        ) acquires UserFavorites, NFTFavoriteCount, Marketplace {
            let user_addr = signer::address_of(account);
            
            // Verify NFT exists
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            assert!(nft_id < vector::length(&marketplace.nfts), 500); // Invalid NFT ID

            assert!(exists<UserFavorites>(user_addr), 502); // No favorites initialized
            let user_favorites = borrow_global_mut<UserFavorites>(user_addr);
            
            // Find and remove the NFT ID
            let (is_found, index) = vector::index_of(&user_favorites.nft_ids, &nft_id);
            assert!(is_found, 503); // NFT not in favorites
            
            vector::remove(&mut user_favorites.nft_ids, index);

            // Update NFT favorite count
            if (exists<NFTFavoriteCount>(marketplace_addr)) {
                let nft_favorites = borrow_global_mut<NFTFavoriteCount>(marketplace_addr);
                nft_favorites.count = nft_favorites.count - 1;
                
                // Remove user from the users vector
                let (_, user_index) = vector::index_of(&nft_favorites.users, &user_addr);
                vector::remove(&mut nft_favorites.users, user_index);
            };
        }

        // Get user's favorites
        #[view]
        public fun get_user_favorites(user_addr: address): vector<u64> acquires UserFavorites {
            if (!exists<UserFavorites>(user_addr)) {
                return vector::empty()
            };
            
            *&borrow_global<UserFavorites>(user_addr).nft_ids
        }

        // Get NFT favorite count
        #[view]
        public fun get_nft_favorite_count(marketplace_addr: address): u64 acquires NFTFavoriteCount {
            if (!exists<NFTFavoriteCount>(marketplace_addr)) {
                return 0
            };
            
            borrow_global<NFTFavoriteCount>(marketplace_addr).count
        }

        // Check if user has favorited an NFT
        #[view]
        public fun is_nft_favorited(user_addr: address, nft_id: u64): bool acquires UserFavorites {
            if (!exists<UserFavorites>(user_addr)) {
                return false
            };
            
            let user_favorites = borrow_global<UserFavorites>(user_addr);
            vector::contains(&user_favorites.nft_ids, &nft_id)
        }
    }
}
