const config = {
    app_name: 'PunkScape Rarity',
    app_description: 'Cool Rarity is an open source package for easy rarity score calculation with ERC721 NFT metadata collection.',
    collection_file_name: 'punkscape_collection.json',
    collection_contract_address: '0x51ae5e2533854495f6c587865af64119db8f59b4',
    collection_name: 'PunkScape',
    collection_description: '10k little landscapes that punks can inhabit – on the Ethereum Blockchain.',
    collection_id_from: 1,
    ignore_traits: ['date'], 
    sqlite_file_name: 'database.sqlite',
    ga: 'G-BW69Z04YTP',
    main_og_image: 'https://punkscape.xyz/og.png',
    item_path_name: 'punkscape',
    page_item_num: 60,
    content_image_is_video: false,
    content_image_frame: 'rectangle' // circle, rectangle
};

module.exports = config;