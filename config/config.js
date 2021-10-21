const config = {
    app_name: 'CryptoPochi Rarity',
    app_description: 'Cool Rarity is an open source package for easy rarity score calculation with ERC721 NFT metadata collection.',
    collection_file_name: 'crypto_pochi_collection.json',
    collection_contract_address: '0x11111111384122718f7a44d48290bb70a3a9f793',
    collection_name: 'CryptoPochi',
    collection_description: 'CryptoPochis are mysterious creatures that capture different emotions in your daily life. Their faces speak for themselves. They simply lie on the ground and play all day. We catch and wrap them as NFTs for you to play with.',
    coolection_id_from: 0,
    ignore_traits: ['date'], 
    sqlite_file_name: 'database.sqlite',
    ga: 'G-BW69Z04YTP',
    main_og_image: 'https://pochi.club/images/og.png',
    item_path_name: 'punk',
    page_item_num: 24,
    content_image_is_video: false,
    content_image_frame: 'rectangle', // circle, rectangle
    use_wallet: false
};

module.exports = config;